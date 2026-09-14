// LUỒNG BILL TRÊN DỮ LIỆU CŨ — bài đo cho câu hỏi "lên production với dữ liệu
// khác thì còn chạy đúng không".
//
// Bài vongdoibill.js đo vòng đời B1->B9 trên DB SẠCH: mọi dòng đều do code hiện
// tại sinh ra. Production thì không như vậy. Dữ liệu ở đó do NHIỀU ĐỜI CODE
// khác nhau đẻ ra và nằm lại: đơn phát hành bill từ trước khi có bảng
// chat_order_bills, đơn chỉ có invoice mà không có bill_sent_at, bill mồ côi
// không còn đơn, phiên đã đóng từ lâu...
//
// Bài này DỰNG THẲNG những hình dạng đó bằng SQL (không qua API, vì API hiện
// tại không còn tạo ra chúng nữa), rồi đọc bill qua API thật và canh 5 luật.
const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');

const GOC = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 4899}`;
const DB = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/e2e';

let passed = 0; const failures = [];
const check = (n, c, d) => {
  if (c) { passed++; console.log('  ✓ ' + n); }
  else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); }
};

function goi(duong, { method = 'GET', token, body } = {}) {
  return new Promise((resolve, reject) => {
    const du = body ? JSON.stringify(body) : null;
    const req = http.request(GOC + duong, {
      method,
      headers: {
        ...(du ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(du) } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    }, (res) => {
      let than = '';
      res.on('data', (c) => { than += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(than); } catch { /* để nguyên */ }
        resolve({ status: res.statusCode, body: json, raw: than.slice(0, 300) });
      });
    });
    req.on('error', reject);
    if (du) req.write(du);
    req.end();
  });
}

const bam = (mk) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.pbkdf2Sync(mk, salt, 1000, 64, 'sha512').toString('hex');
};
const MK = 'MatKhauKiemThu123';
const PHIEN = 'sess-billcu-1';
const PHIEN_DONG = 'sess-billcu-2';
const EMAILS = ['agent-bc@test.local', 'sale-bc@test.local'];

// Mốc thời gian trong QUÁ KHỨ. Dữ liệu production là dữ liệu cũ; nếu bill nào
// mang dấu thời gian "vừa nãy" thì đó là code tự đẻ mốc mới — đúng cái lỗi
// "bill nhảy xuống cuối đoạn chat" đã gặp.
const GIO = 3600 * 1000;
const T = (soGioTruoc) => new Date(Date.now() - soGioTruoc * GIO);

(async () => {
  const db = new Client({ connectionString: DB });
  await db.connect();
  // HAI CHẾ ĐỘ, vì migration chỉ chạy lúc máy chủ KHỞI ĐỘNG.
  //   --seed : dựng dữ liệu cũ, chạy TRƯỚC khi bật máy chủ.
  //   --do   : đo, chạy SAU khi máy chủ đã lên (và đã migration xong).
  // Chạy hai chế độ trong một lượt thì migration không đụng tới dữ liệu vừa
  // dựng — đúng cái bẫy làm bài đo xanh giả.
  const CHEDO = process.argv[2] || '--tatca';

  const don = async () => {
    for (const p of [PHIEN, PHIEN_DONG]) {
      for (const b of ['chat_order_events', 'chat_order_bills', 'chat_order_revisions', 'chat_orders', 'messages']) {
        await db.query(`DELETE FROM ${b} WHERE session_id = $1`, [p]).catch(() => {});
      }
      await db.query('DELETE FROM sessions WHERE id = $1', [p]).catch(() => {});
    }
    await db.query(`DELETE FROM chat_order_bills WHERE order_id LIKE 'ord-bc-%'`).catch(() => {});
    await db.query(`DELETE FROM qr_chat_accounts WHERE code = 'BC-CODE-1'`).catch(() => {});
    await db.query('DELETE FROM agent_groups WHERE name = $1', ['Nhóm BC']).catch(() => {});
    await db.query('DELETE FROM admins WHERE username = ANY($1::text[])', [EMAILS]).catch(() => {});
  };
  if (CHEDO !== '--do') {
  await don();

  const agent = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, agent_menu_enabled)
     VALUES ($1,$2,'Quán BC','agent','qr-concierge',TRUE,TRUE) RETURNING id`,
    [EMAILS[0], bam(MK)])).rows[0].id;
  const sale = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, managed_by_admin_id)
     VALUES ($1,$2,'Sale BC','sale','qr-concierge',TRUE,$3) RETURNING id`,
    [EMAILS[1], bam(MK), agent])).rows[0].id;
  const nhom = (await db.query(
    `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1,'qr-concierge','Nhóm BC') RETURNING id`,
    [agent])).rows[0].id;
  // Phiên QR thật LUÔN có qr_account_id — cả ba lối tạo phiên trong server.js
  // đều điền cột này. Migration lời chào dựa vào đúng dấu hiệu đó, nên fixture
  // phải dựng cho giống, không thì bài đo báo hỏng oan.
  const maQr = (await db.query(
    `INSERT INTO qr_chat_accounts (project_id, owner_admin_id, code, label, group_id, is_active, created_at)
     VALUES ('qr-concierge',$1,'BC-CODE-1','Bàn 1',$2,TRUE,$3) RETURNING id`,
    [agent, nhom, T(30)])).rows[0].id;
  for (const p of [PHIEN, PHIEN_DONG]) {
    await db.query(
      `INSERT INTO sessions (id, project_id, visitor_name, platform, status, group_id, claimed_by_admin_id,
                             qr_account_id, expires_at, show_in_dashboard, created_at)
       VALUES ($1,'qr-concierge','Khách cũ','qr',$2,$3,$4,$5,NULL,TRUE,$6)`,
      [p, p === PHIEN_DONG ? 'closed' : 'active', nhom, sale, maQr, T(30)]);
  }

  // ── DỰNG DỮ LIỆU CŨ ────────────────────────────────────────────────────────
  // Mỗi đơn dưới đây là MỘT hình dạng có thật trên production mà code hiện tại
  // không còn sinh ra nữa.
  const monCu = (ten, gia, sl) => JSON.stringify([{ name: ten, price: gia, quantity: sl }]);
  const hoaDon = (tong) => JSON.stringify({
    sellerName: 'Quán BC', tableLabel: 'Bàn 1', items: [], totalAmount: tong, currency: 'VND',
  });

  const themDon = async (id, o) => {
    await db.query(
      `INSERT INTO chat_orders (id, session_id, project_id, status, total_amount, items, invoice,
                                payment_method, paid_at, created_at, updated_at, confirmed_at,
                                confirmed_by_admin_id, version, bill_sent_at, placed_by, order_code)
       VALUES ($1,$2,'qr-concierge',$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,'customer',$15)`,
      [id, o.phien || PHIEN, o.status, o.tong, o.items, o.invoice, o.pttt || null, o.paidAt || null,
       o.taoLuc, o.taoLuc, o.confirmedAt || null, o.boi || null, o.version || 1, o.billSentAt || null,
       'BILL-CU-' + id.slice(-4)]);
  };

  // L1 — đơn phát hành bill từ ĐỜI CODE CHƯA CÓ BẢNG chat_order_bills.
  //      Chỉ có bill_sent_at trên đơn, không có dòng bill nào.
  await themDon('ord-bc-1', {
    status: 'awaiting_payment', tong: 120000, items: monCu('Phở', 60000, 2), invoice: hoaDon(120000),
    taoLuc: T(9), confirmedAt: T(8), billSentAt: T(8), boi: sale, version: 1, pttt: 'cash',
  });

  // L2 — đơn KHÁCH CHƯA ĐẶT XONG: invoice rỗng, chưa phát hành.
  //      status mặc định 'awaiting_payment' từng làm code đẻ ra một tờ bill RỖNG.
  await themDon('ord-bc-2', {
    status: 'awaiting_payment', tong: 0, items: '[]', invoice: '{}',
    taoLuc: T(7), version: 1,
  });

  // L3 — đời code chỉ ghi invoice, không ghi bill_sent_at.
  await themDon('ord-bc-3', {
    status: 'awaiting_payment', tong: 50000, items: monCu('Cà phê', 25000, 2), invoice: hoaDon(50000),
    taoLuc: T(7), confirmedAt: T(6), boi: sale, version: 1, pttt: 'bank',
  });

  // L4 — đơn đã có SẴN hai bản bill trong bảng (khách sửa rồi Sale xác nhận lại).
  await themDon('ord-bc-4', {
    status: 'awaiting_payment', tong: 90000, items: monCu('Bánh mì', 30000, 3), invoice: hoaDon(90000),
    taoLuc: T(6), confirmedAt: T(5), billSentAt: T(5), boi: sale, version: 2, pttt: 'cash',
  });
  for (const [v, tong, luc] of [[1, 30000, T(5.5)], [2, 90000, T(5)]]) {
    await db.query(
      `INSERT INTO chat_order_bills (order_id, session_id, version, invoice, items, total_amount,
                                     payment_method, confirmed_by_admin_id, created_at)
       VALUES ('ord-bc-4',$1,$2,$3::jsonb,$4::jsonb,$5,NULL,$6,$7)`,
      [PHIEN, v, hoaDon(tong), monCu('Bánh mì', 30000, tong / 30000), tong, sale, luc]);
  }

  // L5 — đơn ĐÃ THU TIỀN xong từ lâu.
  await themDon('ord-bc-5', {
    status: 'paid', tong: 45000, items: monCu('Trà đá', 15000, 3), invoice: hoaDon(45000),
    taoLuc: T(5), confirmedAt: T(4), billSentAt: T(4), paidAt: T(4), pttt: 'cash', boi: agent, version: 1,
  });

  // L6 — BILL MỒ CÔI: đơn đã bị xoá khỏi chat_orders, dòng bill còn lại.
  //      LEFT JOIN cho order_status = NULL — chỗ này từng đủ sức làm vỡ cả danh sách.
  await db.query(
    `INSERT INTO chat_order_bills (order_id, session_id, version, invoice, items, total_amount,
                                   payment_method, confirmed_by_admin_id, created_at)
     VALUES ('ord-bc-mocoi',$1,1,$2::jsonb,$3::jsonb,20000,'cash',NULL,$4)`,
    [PHIEN, hoaDon(20000), monCu('Nước suối', 20000, 1), T(3)]);

  // L7 — phiên ĐÃ ĐÓNG mà vẫn phải xem được hoá đơn (LUẬT 4).
  await themDon('ord-bc-7', {
    phien: PHIEN_DONG, status: 'paid', tong: 200000, items: monCu('Lẩu', 200000, 1),
    invoice: hoaDon(200000), taoLuc: T(20), confirmedAt: T(19), billSentAt: T(19),
    paidAt: T(19), pttt: 'bank', boi: sale, version: 1,
  });

  // L8 — lời chào đời cũ còn mang system_kind = 'guest_only'.
  await db.query(
    `INSERT INTO messages (session_id, sender, original_text, translated_text, language, visible_to, system_kind, created_at)
     VALUES ($1,'system','Chào bạn','Chào bạn','vi','visitor','guest_only',$2)`,
    [PHIEN, T(29)]);

  console.log('\n  Đã dựng 7 hình dạng dữ liệu cũ + 1 lời chào đời cũ.\n');
  if (CHEDO === '--seed') { await db.end(); process.exit(0); }
  }

  // ── ĐO ─────────────────────────────────────────────────────────────────────
  const dn = async (u) => (await goi('/api/admin/login', { method: 'POST', body: { username: u, password: MK } })).body?.token;
  const tAgent = await dn(EMAILS[0]);
  check('đăng nhập được để đọc bằng vai Agent', Boolean(tAgent));

  const docBill = async (phien = PHIEN, lang = 'vi') => {
    const r = await goi(`/api/chats/${phien}/bills?lang=${lang}`);
    if (r.status !== 200) return { loi: `HTTP ${r.status} ${r.raw}`, bills: [] };
    return { bills: r.body?.bills || [] };
  };

  const lan1 = await docBill();
  check('đọc được danh sách hoá đơn trên dữ liệu cũ, không vỡ',
    !lan1.loi, lan1.loi || '');
  const b1 = lan1.bills;
  console.log(`     (trả về ${b1.length} tờ: ${b1.map((b) => b.orderId).join(', ')})`);

  // LUẬT 1 — đủ bill, không mất.
  const coDon = (id) => b1.filter((b) => String(b.orderId) === id);
  check('L1 — đơn phát hành bill từ đời code cũ VẪN hiện ra',
    coDon('ord-bc-1').length === 1,
    `đang có ${coDon('ord-bc-1').length} tờ — đơn cũ có bill_sent_at mà không ra bill là mất hoá đơn của khách`);
  check('L3 — đơn chỉ có invoice, không có bill_sent_at, vẫn hiện ra',
    coDon('ord-bc-3').length === 1, `${coDon('ord-bc-3').length} tờ`);
  check('L5 — đơn đã thu tiền vẫn hiện ra', coDon('ord-bc-5').length === 1,
    `${coDon('ord-bc-5').length} tờ`);
  check('L6 — bill mồ côi (đơn đã mất) vẫn đọc được, không làm vỡ danh sách',
    b1.filter((b) => String(b.orderId) === 'ord-bc-mocoi').length === 1);

  // Không đẻ bill rỗng.
  check('L2 — đơn chưa phát hành KHÔNG đẻ ra hoá đơn rỗng',
    coDon('ord-bc-2').length === 0,
    'vừa vô đoạn chat đã thấy một tờ bill trắng của đơn chưa ai duyệt');
  check('không có tờ hoá đơn nào rỗng món và rỗng tiền',
    b1.every((b) => (b.items || []).length > 0 || Number(b.totalAmount) > 0),
    JSON.stringify(b1.filter((b) => !(b.items || []).length && !Number(b.totalAmount))
      .map((b) => b.orderId)));

  // LUẬT 2 — một đơn một tờ.
  check('L4 — đơn có sẵn 2 bản bill chỉ hiện MỘT tờ, không chồng bill',
    coDon('ord-bc-4').length === 1,
    `đang hiện ${coDon('ord-bc-4').length} tờ (bản ${coDon('ord-bc-4').map((b) => b.version).join(', ')})`);
  check('L4 — tờ hiện ra là BẢN MỚI NHẤT',
    coDon('ord-bc-4')[0]?.version === 2 && Number(coDon('ord-bc-4')[0]?.totalAmount) === 90000,
    JSON.stringify({ version: coDon('ord-bc-4')[0]?.version, tien: coDon('ord-bc-4')[0]?.totalAmount }));
  const conTrongBang = (await db.query(
    `SELECT COUNT(*)::int n FROM chat_order_bills WHERE order_id = 'ord-bc-4'`)).rows[0].n;
  check('L4 — LUẬT 1: bản bill cũ vẫn nằm nguyên trong bảng, chỉ không vẽ ra',
    conTrongBang === 2, `bảng còn ${conTrongBang} dòng`);

  // LUẬT 3 — mốc thời gian là lúc PHÁT HÀNH, dữ liệu cũ thì mốc phải cũ.
  // Mỗi tờ phải mang ĐÚNG mốc phát hành của nó (bill_sent_at, hoặc confirmed_at
  // với đời code chỉ ghi invoice). So từng tờ chứ không so với "bây giờ": lệch
  // múi giờ có thể đẩy "bây giờ" ra xa 7 tiếng và che mất lỗi.
  const MOC_DUNG = { 'ord-bc-1': 8, 'ord-bc-3': 6, 'ord-bc-4': 5, 'ord-bc-5': 4, 'ord-bc-mocoi': 3 };
  const lechMoc = b1.map((b) => {
    const gioTruoc = (Date.now() - new Date(b.createdAt).getTime()) / GIO;
    const can = MOC_DUNG[String(b.orderId)];
    return { don: b.orderId, can, thucTe: Number(gioTruoc.toFixed(2)) };
  }).filter((x) => x.can === undefined || Math.abs(x.thucTe - x.can) > 0.5);
  check('LUẬT 3 — mỗi tờ hoá đơn cũ mang đúng mốc phát hành của nó',
    lechMoc.length === 0,
    JSON.stringify(lechMoc)
    + ' — mốc sai thì hoá đơn nhảy sai chỗ trong đoạn chat, mỗi người mở ra thấy một kiểu');
  const tg = b1.map((b) => new Date(b.createdAt).getTime());
  check('LUẬT 3 — trả về đúng thứ tự thời gian tăng dần',
    tg.every((t, i) => i === 0 || t >= tg[i - 1]),
    JSON.stringify(b1.map((b) => ({ don: b.orderId, luc: new Date(b.createdAt).toISOString() }))));
  const b1Moc = coDon('ord-bc-1')[0];
  check('L1 — mốc của tờ bill lấy từ bill_sent_at của đơn (khoảng 8 tiếng trước)',
    Math.abs((Date.now() - new Date(b1Moc?.createdAt).getTime()) / GIO - 8) < 0.5,
    `lệch ${((Date.now() - new Date(b1Moc?.createdAt).getTime()) / GIO).toFixed(2)} tiếng`);

  // ĐỌC LẠI LẦN HAI — đọc không được làm thay đổi dữ liệu.
  const lan2 = await docBill();
  check('đọc lần hai ra đúng ngần ấy tờ (thao tác đọc không đẻ thêm bill)',
    lan2.bills.length === b1.length,
    `lần 1: ${b1.length} tờ, lần 2: ${lan2.bills.length} tờ`);
  const tongDongBill = (await db.query(
    `SELECT COUNT(*)::int n FROM chat_order_bills WHERE session_id = $1`, [PHIEN])).rows[0].n;
  const lan3 = await docBill();
  const tongDongBill3 = (await db.query(
    `SELECT COUNT(*)::int n FROM chat_order_bills WHERE session_id = $1`, [PHIEN])).rows[0].n;
  check('đọc nhiều lần KHÔNG làm phình bảng bill',
    tongDongBill === tongDongBill3 && lan3.bills.length === b1.length,
    `bảng ${tongDongBill} -> ${tongDongBill3} dòng`);

  // LUẬT 4 — phiên đã đóng.
  const dong = await docBill(PHIEN_DONG);
  check('LUẬT 4 — phiên đã đóng từ lâu vẫn đọc được hoá đơn',
    !dong.loi && dong.bills.length === 1, dong.loi || `${dong.bills.length} tờ`);
  check('LUẬT 4 — hoá đơn của phiên đóng vẫn đủ món và đủ tiền',
    dong.bills.every((b) => (b.items || []).length > 0 && Number(b.totalAmount) > 0),
    JSON.stringify(dong.bills.map((b) => ({ mon: (b.items || []).length, tien: b.totalAmount }))));

  // LUẬT 5 — lịch sử. Dữ liệu cũ không có chat_order_events, nên lịch sử phải
  // được dựng lại từ chính các bản bill, không được rỗng.
  const ls4 = coDon('ord-bc-4')[0]?.history || [];
  check('LUẬT 5 — đơn cũ không có bảng sự kiện vẫn dựng được lịch sử từ các bản bill',
    ls4.length >= 2, `${ls4.length} mục`);
  check('LUẬT 5 — mỗi mục lịch sử nói rõ ai sửa và sửa gì',
    ls4.every((h) => h.editorName && Array.isArray(h.changes) && h.changes.length > 0),
    JSON.stringify(ls4.slice(0, 2)));

  // Đọc bằng ngôn ngữ khác — dữ liệu cũ có món tên tiếng Việt, không có bản dịch.
  const en = await docBill(PHIEN, 'en');
  check('đọc bằng tiếng Anh trên dữ liệu cũ không vỡ và không mất tờ nào',
    !en.loi && en.bills.length === b1.length, en.loi || `vi ${b1.length} / en ${en.bills.length}`);

  // Migration lời chào đời cũ.
  const chaoCu = (await db.query(
    `SELECT system_kind FROM messages WHERE session_id = $1 AND sender = 'system'`, [PHIEN])).rows;
  check('lời chào đời cũ đã được migration đánh dấu lại thành guest_welcome',
    chaoCu.length === 1 && chaoCu.every((m) => m.system_kind === 'guest_welcome'),
    JSON.stringify(chaoCu.map((m) => m.system_kind))
    + ' — tin cũ không được đánh dấu lại thì lời chào trong lịch sử vẫn hiện tên quán sai');

  // Danh sách giỏ hàng của Agent cũng phải đọc được dữ liệu cũ.
  const gio = await goi('/api/admin/orders/cart?limit=50', { token: tAgent });
  check('màn Quản lý bill của Agent đọc được dữ liệu cũ, không vỡ',
    gio.status === 200, `HTTP ${gio.status} ${gio.raw}`);
  const donCu = (gio.body?.orders || []).filter((o) => String(o.id || '').startsWith('ord-bc-'));
  check('màn Quản lý bill thấy đủ các đơn cũ của phiên này',
    donCu.length >= 4, `thấy ${donCu.length} đơn: ${donCu.map((o) => o.id).join(', ')}`);

  console.log('');
  await don();
  await db.end();
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
