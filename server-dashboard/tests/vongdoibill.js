// VÒNG ĐỜI HOÁ ĐƠN B1 -> B9, ĐO THEO ĐÚNG SPEC.
//
// Spec: docs/VONG-DOI-BILL.md. Bài này là bản dịch spec đó thành phép đo, chạy
// trên máy chủ thật + Postgres thật, với ba vai thật (khách, Sale, Agent).
//
// Năm luật bất biến được canh ở đây:
//   1. Không xoá, không ẩn bill — ở MỌI bước.
//   2. Chỉ bước xác nhận thanh toán được ghi đè. Không bước nào khác.
//   3. Hoá đơn xếp theo thời điểm PHÁT HÀNH, thứ tự rõ ràng.
//   4. Phiên chat đóng rồi vẫn xem được hoá đơn.
//   5. Mọi chỉnh sửa của khách / Sale / Agent đều vào lịch sử bill.
const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');

const GOC = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 4899}`;
const DB = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/e2e';

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? ' — ' + d : '')); } };

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
        resolve({ status: res.statusCode, body: json, raw: than.slice(0, 240) });
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
const PHIEN = 'sess-vongdoi-1';

(async () => {
  const db = new Client({ connectionString: DB });
  await db.connect();

  const EMAILS = ['agent-vd@test.local', 'sale-vd@test.local'];
  const don = async () => {
    for (const b of ['chat_order_events', 'chat_order_bills', 'chat_order_revisions', 'chat_orders', 'messages']) {
      await db.query(`DELETE FROM ${b} WHERE session_id = $1`, [PHIEN]).catch(() => {});
    }
    await db.query('DELETE FROM sessions WHERE id = $1', [PHIEN]);
    await db.query('DELETE FROM qr_menu_items WHERE name LIKE $1', ['[VD]%']);
    await db.query('DELETE FROM agent_groups WHERE name = $1', ['Nhóm VD']);
    await db.query('DELETE FROM admins WHERE username = ANY($1::text[])', [EMAILS]);
  };
  await don();

  const agent = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, agent_menu_enabled)
     VALUES ($1,$2,'Quán VD','agent','qr-concierge',TRUE,TRUE) RETURNING id`,
    [EMAILS[0], bam(MK)])).rows[0].id;
  const sale = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, managed_by_admin_id)
     VALUES ($1,$2,'Sale VD','sale','qr-concierge',TRUE,$3) RETURNING id`,
    [EMAILS[1], bam(MK), agent])).rows[0].id;
  const nhom = (await db.query(
    `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1,'qr-concierge','Nhóm VD') RETURNING id`,
    [agent])).rows[0].id;
  await db.query(
    `INSERT INTO sessions (id, project_id, visitor_name, platform, status, group_id, claimed_by_admin_id,
                           expires_at, show_in_dashboard)
     VALUES ($1,'qr-concierge','Khách VD','qr','active',$2,$3,NULL,TRUE)`, [PHIEN, nhom, sale]);

  const mon = [];
  for (const [ten, gia] of [['[VD] Phở', 60000], ['[VD] Cà phê', 25000], ['[VD] Bánh mì', 30000]]) {
    mon.push((await db.query(
      `INSERT INTO qr_menu_items (agent_id, project_id, name, price, is_available, stock_quantity)
       VALUES ($1,'qr-concierge',$2,$3,TRUE,100) RETURNING id`, [agent, ten, gia])).rows[0].id);
  }

  const dn = async (u) => (await goi('/api/admin/login', { method: 'POST', body: { username: u, password: MK } })).body?.token;
  const tAgent = await dn(EMAILS[0]);
  const tSale = await dn(EMAILS[1]);
  check('dựng được ba vai: khách, Sale, Agent', Boolean(tAgent && tSale));
  if (!tAgent || !tSale) { await db.end(); process.exit(1); }

  const docBill = async () => (await goi(`/api/chats/${PHIEN}/bills?lang=vi`)).body?.bills || [];
  const layDon = async () => (await goi(`/api/chats/${PHIEN}/order`)).body?.order || null;
  const moc = [];
  const ghiMoc = async (nhan) => {
    const b = await docBill();
    moc.push({ nhan, so: b.length, bills: b });
    console.log(`  · ${nhan}: ${b.length} hoá đơn`);
    return b;
  };

  // ════ B1: khách đặt món ══════════════════════════════════════════════════
  const b1 = await goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'POST', body: { items: [{ itemId: mon[0], quantity: 2 }], language: 'vi' },
  });
  check('B1 — khách đặt được món', b1.status === 200 || b1.status === 201, `HTTP ${b1.status} ${b1.raw}`);
  const don1 = await layDon();
  check('B1 — đơn ở trạng thái chờ xác nhận', don1?.status === 'pending_confirm', `đang là ${don1?.status}`);
  await ghiMoc('B1 khách đặt');
  check('B1 — CHƯA xác nhận thì CHƯA có hoá đơn nào',
    moc[moc.length - 1].so === 0,
    'hiện bill trước khi Sale xác nhận là sai vòng đời — khách thấy hoá đơn của đơn chưa ai duyệt');

  // ════ B2: form đơn hiện ở Sale/Agent ═════════════════════════════════════
  const tinNhanVien = (await db.query(
    `SELECT COUNT(*)::int n FROM messages WHERE session_id = $1 AND visible_to = 'staff'`, [PHIEN])).rows[0].n;
  check('B2 — có tin báo đơn mới cho nhân viên', tinNhanVien >= 1, `${tinNhanVien} tin`);

  // ════ B3 + B4: Sale xác nhận -> phát hành bill ═══════════════════════════
  const b3 = await goi(`/api/admin/orders/${don1.id}/confirm`, { method: 'POST', token: tSale });
  check('B3 — Sale xác nhận được đơn', b3.status === 200, `HTTP ${b3.status} ${b3.raw}`);
  const sauB4 = await ghiMoc('B3+B4 Sale xác nhận, phát hành bill');
  check('B4 — hoá đơn được phát hành, đúng MỘT tờ', sauB4.length === 1, `${sauB4.length} tờ`);
  check('B4 — tờ bill có đủ món và đủ tiền',
    (sauB4[0]?.items || []).length > 0 && Number(sauB4[0]?.totalAmount) > 0,
    JSON.stringify({ mon: (sauB4[0]?.items || []).length, tien: sauB4[0]?.totalAmount }));

  // ════ B4' : KHÁCH SỬA ĐƠN TRÊN BILL — CHỈ KHI BILL ĐÃ RA ═════════════════
  //
  // Luật: đang chờ Sale xác nhận thì KHOÁ; Sale xác nhận và bill đã ra thì MỞ.
  // Xem docs/VONG-DOI-BILL.md, bảng "Khách chỉ sửa được đơn sau khi Sale đã xác
  // nhận và bill đã ra".
  //
  // Lúc này đơn đang ở awaiting_payment (vừa xác nhận ở B3) nên phải sửa được.
  const b4p = await goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'PUT', body: { items: [{ itemId: mon[0], quantity: 1 }, { itemId: mon[1], quantity: 2 }], language: 'vi' },
  });
  check("B4' — bill đã ra thì khách sửa được đơn", b4p.status === 200, `HTTP ${b4p.status} ${b4p.raw}`);
  const sauSua = await layDon();
  check("B4' — sửa xong đơn quay lại bước chờ xác nhận", sauSua?.status === 'pending_confirm', `đang là ${sauSua?.status}`);

  // VÀ NGAY LÚC NÀY THÌ KHOÁ LẠI. Đây là vế thứ hai của luật, không tách rời vế
  // thứ nhất: nếu sửa xong mà vẫn sửa tiếp được thì Sale lại rơi vào đúng cảnh
  // xác nhận một đằng bếp làm một nẻo.
  const suaTiep = await goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'PUT', body: { items: [{ itemId: mon[2], quantity: 5 }], language: 'vi' },
  });
  check("B4' — đang chờ Sale xác nhận thì KHÔNG sửa tiếp được", suaTiep.status === 409,
    `HTTP ${suaTiep.status} ${suaTiep.raw}`);
  check("B4' — lời từ chối nói rõ là đang chờ xác nhận, không phải lỗi chung",
    suaTiep.body?.code === 'order_pending_confirm', JSON.stringify(suaTiep.body));
  const sauChan = await layDon();
  check("B4' — bị chặn xong đơn vẫn nguyên 2 món của lần sửa hợp lệ",
    (sauChan?.items || []).length === 2, `${(sauChan?.items || []).length} món`);

  const billSauSua = await ghiMoc("B4' khách sửa đơn");
  check("B4' — LUẬT 1: bill đã phát hành KHÔNG bị xoá", billSauSua.length >= 1,
    `còn ${billSauSua.length} tờ — bill cũ đã bị xoá mất`);

  const banDonCu = (await goi(`/api/chats/${PHIEN}/order?lang=vi`)).body?.revisions || [];
  check("B4' — Sale/Agent thấy bản đơn cũ để biết khách đổi gì", banDonCu.length >= 1,
    `${banDonCu.length} bản`);

  // Sale xác nhận lại -> bill bản mới.
  const b3b = await goi(`/api/admin/orders/${don1.id}/confirm`, { method: 'POST', token: tSale });
  check("B4' — Sale xác nhận lại được", b3b.status === 200, `HTTP ${b3b.status} ${b3b.raw}`);
  const sauXacNhanLai = await ghiMoc("B4' Sale xác nhận lại");

  // ĐÂY LÀ CHỖ SPEC NÓI "KHÔNG HIỂN THỊ CHỒNG BILL".
  const billCuaDon1 = sauXacNhanLai.filter((b) => String(b.orderId) === String(don1.id));
  console.log(`     (đơn này đang có ${billCuaDon1.length} tờ bill: bản ${billCuaDon1.map((b) => b.version).join(', ')})`);
  check("B4' — MỘT đơn chỉ hiện MỘT tờ hoá đơn, không chồng bill",
    billCuaDon1.length === 1,
    `đang hiện ${billCuaDon1.length} tờ cho cùng một đơn (bản ${billCuaDon1.map((b) => b.version).join(', ')}) `
    + '— khách và nhân viên nhìn thấy hai hoá đơn nằm đè lên nhau cho cùng một lần gọi món');

  // LUẬT 1 + 2: chỉ ĐỔI CÁCH HIỂN THỊ, tuyệt đối không xoá dữ liệu.
  const soTrongBang = (await db.query(
    'SELECT COUNT(*)::int n FROM chat_order_bills WHERE order_id = $1', [don1.id])).rows[0].n;
  check("B4' — LUẬT 1: bản bill cũ VẪN NẰM NGUYÊN trong bảng, chỉ không vẽ ra",
    soTrongBang === 2,
    `bảng đang có ${soTrongBang} dòng — ẩn bớt trên màn hình thì được, xoá dữ liệu thì không`);
  const lsSauSua = billCuaDon1[0]?.history || [];
  check("B4' — và lần sửa đó đọc lại được qua lịch sử của tờ bill",
    lsSauSua.some((h) => h.eventType === 'customer_edited'),
    `lịch sử có: ${lsSauSua.map((h) => h.eventType).join(', ')}`);

  // ════ B5: khách chọn phương thức thanh toán ══════════════════════════════
  const b5 = await goi(`/api/chats/${PHIEN}/order/payment-method`, { method: 'POST', body: { method: 'cash' } });
  check('B5 — khách chọn được phương thức', b5.status === 200, `HTTP ${b5.status} ${b5.raw}`);
  const sauB6 = await ghiMoc('B5+B6 khách chọn cách trả');

  // ════ B6: bill hiện kèm phương thức ══════════════════════════════════════
  const billMoiNhat = sauB6.filter((b) => String(b.orderId) === String(don1.id)).pop();
  check('B6 — tờ bill mang đúng phương thức khách vừa chọn',
    billMoiNhat?.paymentMethod === 'cash', `paymentMethod=${billMoiNhat?.paymentMethod}`);
  check('B5/B6 — LUẬT 2: chọn cách trả KHÔNG đẻ thêm tờ bill nào',
    sauB6.length === sauXacNhanLai.length,
    `từ ${sauXacNhanLai.length} thành ${sauB6.length} tờ`);

  // ════ B7 + B8: Agent xác nhận thu tiền -> ghi đè, in dấu đã thanh toán ═══
  const truocThu = (await docBill()).length;
  const b7 = await goi(`/api/admin/orders/${don1.id}/received-payment`, {
    method: 'POST', token: tAgent, body: { method: 'cash' },
  });
  check('B7 — Agent xác nhận được đã thu tiền', b7.status === 200, `HTTP ${b7.status} ${b7.raw}`);
  const sauB8 = await ghiMoc('B7+B8 Agent thu tiền');
  check('B8 — LUẬT 2: thu tiền GHI ĐÈ bill cũ, KHÔNG đẻ tờ mới',
    sauB8.length === truocThu, `từ ${truocThu} thành ${sauB8.length} tờ`);
  const billDaTra = sauB8.filter((b) => String(b.orderId) === String(don1.id)).pop();
  check('B8 — tờ bill được in dấu "đã thanh toán"',
    billDaTra?.orderStatus === 'paid' || billDaTra?.invoice?.isPaid === true,
    JSON.stringify({ orderStatus: billDaTra?.orderStatus, isPaid: billDaTra?.invoice?.isPaid }));

  // ════ B9: khách đặt đơn mới -> quay lại B1 ═══════════════════════════════
  const b9 = await goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'POST', body: { items: [{ itemId: mon[2], quantity: 1 }], language: 'vi' },
  });
  check('B9 — khách đặt được đơn mới', b9.status === 200 || b9.status === 201, `HTTP ${b9.status} ${b9.raw}`);
  const sauB9 = await ghiMoc('B9 khách đặt đơn mới');
  check('B9 — LUẬT 1: hoá đơn của vòng đời trước còn nguyên',
    sauB9.length >= sauB8.length, `từ ${sauB8.length} tụt còn ${sauB9.length} tờ`);

  // ════ LUẬT 1 xuyên suốt: số bill không được tụt ở bất kỳ mốc nào ═════════
  let tut = null;
  for (let i = 1; i < moc.length; i += 1) {
    if (moc[i].so < moc[i - 1].so) { tut = `${moc[i - 1].nhan} (${moc[i - 1].so}) -> ${moc[i].nhan} (${moc[i].so})`; break; }
  }
  check('LUẬT 1 — số hoá đơn không tụt ở bất kỳ bước nào', !tut, tut || '');

  // ════ LUẬT 3: xếp theo thời điểm phát hành ══════════════════════════════
  const cuoi = await docBill();
  const thoiGian = cuoi.map((b) => new Date(b.createdAt).getTime());
  const tangDan = thoiGian.every((t, i) => i === 0 || t >= thoiGian[i - 1]);
  check('LUẬT 3 — hoá đơn trả về theo đúng thứ tự thời gian', tangDan,
    JSON.stringify(cuoi.map((b) => new Date(b.createdAt).toLocaleTimeString('vi-VN'))));
  const nayGio = Date.now();
  const ganNhuVuaTao = thoiGian.filter((t) => Math.abs(t - nayGio) < 5000).length;
  check('LUẬT 3 — mốc thời gian là lúc PHÁT HÀNH, không phải lúc mở chat',
    ganNhuVuaTao <= 2,
    `${ganNhuVuaTao}/${thoiGian.length} tờ mang dấu thời gian của đúng lượt đọc vừa rồi`);

  // ════ LUẬT 5: mọi chỉnh sửa vào lịch sử bill ════════════════════════════
  const lichSu = (cuoi.find((b) => String(b.orderId) === String(don1.id))?.history) || [];
  const vaiDaGhi = new Set(lichSu.map((h) => h.editorRole));
  const loaiDaGhi = new Set(lichSu.map((h) => h.eventType));
  console.log(`     (lịch sử bill: ${lichSu.length} mục · vai ${[...vaiDaGhi].join(', ')} · loại ${[...loaiDaGhi].join(', ')})`);
  check('LUẬT 5 — tờ bill có kèm lịch sử chỉnh sửa', lichSu.length > 0, `${lichSu.length} mục`);
  check('LUẬT 5 — lần KHÁCH sửa đơn có trong lịch sử',
    loaiDaGhi.has('customer_edited'), [...loaiDaGhi].join(', '));
  check('LUẬT 5 — vai khách có mặt trong lịch sử bill',
    vaiDaGhi.has('customer'), [...vaiDaGhi].join(', '));
  check('LUẬT 5 — lần SALE phát hành hoá đơn có trong lịch sử',
    loaiDaGhi.has('bill_sent') || loaiDaGhi.has('bill_resent'), [...loaiDaGhi].join(', '));
  check('LUẬT 5 — lần AGENT xác nhận thu tiền có trong lịch sử',
    loaiDaGhi.has('payment_received'), [...loaiDaGhi].join(', '));
  check('LUẬT 5 — mỗi mục ghi rõ AI sửa và SỬA GÌ',
    lichSu.every((h) => h.editorName && Array.isArray(h.changes) && h.changes.length > 0),
    JSON.stringify(lichSu.slice(0, 2).map((h) => ({ ai: h.editorName, gi: h.changes }))));

  // ════ LUẬT 4: đóng phiên rồi vẫn xem được ═══════════════════════════════
  await db.query(`UPDATE sessions SET status = 'closed' WHERE id = $1`, [PHIEN]);
  const sauDong = await docBill();
  check('LUẬT 4 — đóng đoạn chat rồi vẫn đọc được đủ hoá đơn',
    sauDong.length === cuoi.length && sauDong.length > 0,
    `trước ${cuoi.length} tờ, sau khi đóng còn ${sauDong.length}`);
  check('LUẬT 4 — hoá đơn sau khi đóng vẫn đủ món và tiền',
    sauDong.every((b) => (b.items || []).length > 0 && Number(b.totalAmount) > 0),
    JSON.stringify(sauDong.map((b) => ({ mon: (b.items || []).length, tien: b.totalAmount }))));

  console.log('\n  Bảng đo từng bước:');
  for (const m of moc) console.log(`    ${String(m.nhan).padEnd(34)} ${m.so} hoá đơn`);

  await don();
  await db.end();
  console.log('\n' + (failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`));
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
