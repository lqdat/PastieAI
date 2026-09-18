// ĐƠN QUÁ HẠN XÁC NHẬN — TỰ HUỶ SAU 5 PHÚT.
//
// Spec: docs/VONG-DOI-BILL.md, mục "Nhánh rẽ ở B2 — quá 5 phút không ai xác
// nhận" và mục "Khách gửi đơn xong là chốt". Bài này dịch hai mục đó thành
// phép đo, chạy trên máy chủ thật + Postgres thật.
//
// KHÔNG rút ngắn cửa sổ 5 phút bằng biến môi trường. Thêm một công tắc chỉ
// dùng cho kiểm thử vào mã chạy thật nghĩa là bài đo không còn đo đúng cái
// đang chạy ngoài production. Thay vào đó lùi created_at của đơn trong
// database — hằng số 5 phút vẫn là hằng số thật.
const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');
// Tin nhắn nằm trong database ở dạng ĐÃ MÃ HOÁ. Đọc thẳng cột ra là được một
// chuỗi "pcv1:..." chứ không phải câu chữ, nên phải giải mã đúng như máy chủ
// vẫn làm trước khi đem ra so.
const { decryptText } = require('../crypto-helper');

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
const PHIEN = 'sess-quahan-1';
const nghi = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const db = new Client({ connectionString: DB });
  await db.connect();

  const EMAILS = ['agent-qh@test.local', 'sale-qh@test.local'];
  for (const b of ['chat_order_events', 'chat_order_bills', 'chat_order_revisions', 'chat_orders', 'messages']) {
    await db.query(`DELETE FROM ${b} WHERE session_id = $1`, [PHIEN]).catch(() => {});
  }
  await db.query('DELETE FROM sessions WHERE id = $1', [PHIEN]);
  await db.query('DELETE FROM qr_menu_items WHERE name LIKE $1', ['[QH]%']);
  await db.query('DELETE FROM agent_groups WHERE name = $1', ['Nhóm QH']);
  await db.query('DELETE FROM admins WHERE username = ANY($1::text[])', [EMAILS]);

  const agent = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, agent_menu_enabled)
     VALUES ($1,$2,'Quán QH','agent','qr-concierge',TRUE,TRUE) RETURNING id`,
    [EMAILS[0], bam(MK)])).rows[0].id;
  const sale = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, managed_by_admin_id)
     VALUES ($1,$2,'Sale QH','sale','qr-concierge',TRUE,$3) RETURNING id`,
    [EMAILS[1], bam(MK), agent])).rows[0].id;
  const nhom = (await db.query(
    `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1,'qr-concierge','Nhóm QH') RETURNING id`,
    [agent])).rows[0].id;
  await db.query(
    `INSERT INTO sessions (id, project_id, visitor_name, platform, status, group_id, claimed_by_admin_id,
                           expires_at, show_in_dashboard)
     VALUES ($1,'qr-concierge','Khách QH','qr','active',$2,$3,NULL,TRUE)`, [PHIEN, nhom, sale]);

  const mon = (await db.query(
    `INSERT INTO qr_menu_items (agent_id, project_id, name, price, is_available, stock_quantity)
     VALUES ($1,'qr-concierge','[QH] Phở',60000,TRUE,100) RETURNING id`, [agent])).rows[0].id;

  const dn = async (u) => (await goi('/api/admin/login', { method: 'POST', body: { username: u, password: MK } })).body?.token;
  const tSale = await dn(EMAILS[1]);
  check('dựng được Sale để thao tác', Boolean(tSale));
  if (!tSale) { await db.end(); process.exit(1); }

  const datMon = () => goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'POST', body: { items: [{ itemId: mon, quantity: 1 }], language: 'vi' },
  });
  const docDon = async () => (await goi(`/api/chats/${PHIEN}/order`)).body || {};
  const trangThai = async (id) =>
    (await db.query('SELECT status, expired_at FROM chat_orders WHERE id = $1', [id])).rows[0];
  // Lùi thời điểm đơn vào bước chờ xác nhận = giả lập đã chờ đủ lâu, mà không
  // phải ngồi đợi thật 5 phút.
  //
  // Phải lùi pending_since — đó mới là mốc đồng hồ đếm. Lùi created_at thôi thì
  // không có tác dụng gì; lùi cả hai để dữ liệu thử nghiệm không tự mâu thuẫn
  // (đơn "được tạo" sau lúc nó vào bước chờ xác nhận).
  const luiDon = (id, phut) =>
    db.query(`UPDATE chat_orders
                 SET pending_since = NOW() - ($2 * INTERVAL '1 minute'),
                     created_at = NOW() - ($2 * INTERVAL '1 minute')
               WHERE id = $1`, [id, phut]);

  // ════ 1. Đơn mới: có hạn chót, và hạn đó phải là 5 phút ═══════════════════
  await datMon();
  let du = await docDon();
  const don1 = du.order;
  check('đơn mới ở trạng thái chờ xác nhận', don1?.status === 'pending_confirm', `đang là ${don1?.status}`);
  check('máy chủ gửi kèm hạn chót xác nhận', Boolean(du.confirmDueAt), JSON.stringify(du.confirmDueAt));
  check('cửa sổ xác nhận đúng 5 phút', du.confirmSeconds === 300, `đang là ${du.confirmSeconds} giây`);
  const conLai = (new Date(du.confirmDueAt).getTime() - Date.now()) / 1000;
  check('hạn chót cách hiện tại khoảng 5 phút', conLai > 290 && conLai <= 300, `còn ${Math.round(conLai)} giây`);

  // ════ 2. Chưa tới hạn thì KHÔNG được huỷ oan ═════════════════════════════
  await luiDon(don1.id, 4);          // mới chờ 4 phút
  await docDon();                     // chạm vào đường đọc đơn -> kích kiểm tra lười
  check('đơn mới chờ 4 phút thì KHÔNG bị huỷ',
    (await trangThai(don1.id)).status === 'pending_confirm',
    `đang là ${(await trangThai(don1.id)).status} — huỷ sớm là cướp đơn của quán`);

  // ════ 3. Quá hạn: đường đọc đơn tự huỷ ═══════════════════════════════════
  await luiDon(don1.id, 6);
  du = await docDon();
  const tt1 = await trangThai(don1.id);
  check('quá 5 phút thì đơn tự huỷ, trạng thái "expired"', tt1.status === 'expired', `đang là ${tt1.status}`);
  check('KHÔNG dùng lại trạng thái "rejected"', tt1.status !== 'rejected',
    'gộp với đơn Sale chủ động từ chối thì báo cáo không tách được trách nhiệm');
  check('có ghi mốc expired_at', Boolean(tt1.expired_at), String(tt1.expired_at));
  check('đơn đã huỷ thì không còn hạn chót nữa', du.confirmDueAt === null, String(du.confirmDueAt));

  // ════ 4. Hai câu thông báo, hai người đọc khác nhau ══════════════════════
  const tinKhach = (await db.query(
    `SELECT original_text FROM messages
      WHERE session_id = $1 AND visible_to <> 'staff' AND system_kind = 'guest_only'
      ORDER BY created_at DESC LIMIT 1`, [PHIEN])).rows[0]?.original_text || '';
  const cauKhach = decryptText(tinKhach) || tinKhach;
  check('khách được báo đơn đã hết hạn',
    cauKhach.includes('hết hạn'), `câu đang gửi: "${cauKhach}"`);
  check('câu cho khách nói rõ phải ĐẶT ĐƠN MỚI',
    cauKhach.includes('đặt đơn mới'),
    `"${cauKhach}" — báo hết hạn mà không nói làm gì tiếp thì khách ngồi chờ tiếp`);

  const tinNv = (await db.query(
    `SELECT original_text, system_kind FROM messages
      WHERE session_id = $1 AND visible_to = 'staff' AND system_kind = 'order_expired'
      ORDER BY created_at DESC LIMIT 1`, [PHIEN])).rows[0];
  const cauNv = decryptText(tinNv?.original_text || '') || (tinNv?.original_text || '');
  check('Sale/Agent được báo đơn đã quá hạn xác nhận',
    cauNv.includes('quá hạn xác nhận'), `câu đang gửi: "${cauNv}"`);
  check('câu cho nhân viên có kèm mã đơn để đối chiếu',
    cauNv.includes(don1.order_code || 'KHONG_CO_MA'),
    `"${cauNv}" · mã đơn ${don1.order_code}`);

  // Câu viết cho nhân viên KHÔNG được lọt sang mắt khách.
  const tinKhachDocDuoc = (await goi(`/api/chats/${PHIEN}/messages`)).body;
  const chuoiKhach = JSON.stringify(tinKhachDocDuoc || []);
  check('câu viết cho nhân viên không lọt sang mắt khách',
    !chuoiKhach.includes('quá hạn xác nhận'),
    'khách đọc phải câu nội bộ kèm mã đơn là lộ thông tin vận hành');
  check('câu viết cho khách thì khách đọc được',
    chuoiKhach.includes('hết hạn'), chuoiKhach.slice(0, 200));

  // ════ 5. LUẬT 5 — vào lịch sử ════════════════════════════════════════════
  const sk = (await db.query(
    `SELECT event_type, actor_role, changes FROM chat_order_events WHERE order_id = $1`, [don1.id])).rows;
  const loai = sk.map((x) => x.event_type);
  check('LUẬT 5 — lần tự huỷ có trong lịch sử đơn', loai.includes('order_expired'), loai.join(', '));
  const mucHuy = sk.find((x) => x.event_type === 'order_expired');
  check('mục lịch sử ghi rõ do HỆ THỐNG huỷ, không đổ cho người',
    mucHuy?.actor_role === 'system', `actor_role=${mucHuy?.actor_role}`);
  check('mục lịch sử nói rõ huỷ vì lý do gì',
    JSON.stringify(mucHuy?.changes || []).includes('5 phút'), JSON.stringify(mucHuy?.changes));

  // ════ 6. Đơn đã huỷ thì ba đường thao tác đều phải đóng ══════════════════
  const xn = await goi(`/api/admin/orders/${don1.id}/confirm`, { method: 'POST', token: tSale });
  check('Sale KHÔNG xác nhận được đơn đã quá hạn', xn.status === 409, `HTTP ${xn.status} ${xn.raw}`);
  check('lời từ chối nói đúng "Đơn đã quá hạn xác nhận"',
    xn.body?.code === 'order_expired' && String(xn.body?.error || '').includes('quá hạn xác nhận'),
    JSON.stringify(xn.body));
  const tc = await goi(`/api/admin/orders/${don1.id}/reject`, { method: 'POST', token: tSale, body: { reason: 'x' } });
  check('Sale KHÔNG từ chối lại được đơn đã quá hạn', tc.status === 409, `HTTP ${tc.status}`);
  check('trạng thái expired KHÔNG bị ghi đè thành rejected',
    (await trangThai(don1.id)).status === 'expired',
    'ghi đè là xoá mất dấu vết ai/cái gì đã đóng đơn');
  const gc = await goi(`/api/admin/orders/${don1.id}/notes`, { method: 'PUT', token: tSale, body: { notes: { 0: 'ít cay' } } });
  check('Sale KHÔNG ghi chú được vào đơn đã quá hạn', gc.status === 409, `HTTP ${gc.status}`);

  // ════ 6b. SALE BẤM XÁC NHẬN GIỮA HAI LƯỢT QUÉT ═══════════════════════════
  //
  // Khác hẳn mục 6: ở trên, đơn ĐÃ bị huỷ từ trước nên máy chủ chỉ cần đọc
  // trạng thái trong database là chặn được. Ở đây đơn vẫn đang là
  // 'pending_confirm' trong database — quá hạn rồi nhưng chưa ai chạm vào, và
  // vòng quét thì chưa tới lượt. Đó đúng là cái Sale nhìn thấy trên màn hình:
  // một đơn quá 5 phút mà nút Xác nhận vẫn bấm được.
  //
  // Bỏ lời gọi maybeExpirePendingOrder() ở đầu đường confirm thì chỉ phép đo
  // này bắt được, mục 6 vẫn xanh.
  await db.query(`UPDATE chat_orders SET status = 'paid' WHERE id = $1`, [don1.id]);
  const datXen = await datMon();
  check('dựng được đơn để thử tình huống bấm xen giữa hai lượt quét',
    datXen.status === 200 || datXen.status === 201, `HTTP ${datXen.status}`);
  const donXen = (await docDon()).order;
  // Lùi quá hạn rồi KHÔNG gọi đường nào chạm tới đơn nữa: giữ nguyên
  // 'pending_confirm' trong database cho tới lúc Sale bấm.
  await luiDon(donXen.id, 6);
  check('đơn vẫn đang là pending_confirm trong database (chưa ai huỷ)',
    (await trangThai(donXen.id)).status === 'pending_confirm',
    'phép đo dựng sai tình huống nếu đơn đã bị huỷ trước khi Sale bấm');
  const xnXen = await goi(`/api/admin/orders/${donXen.id}/confirm`, { method: 'POST', token: tSale });
  check('Sale bấm xác nhận đơn quá hạn giữa hai lượt quét thì BỊ CHẶN',
    xnXen.status === 409 && xnXen.body?.code === 'order_expired',
    `HTTP ${xnXen.status} ${xnXen.raw} — bấm được là bếp làm một đơn mà khách đã được báo hết hạn`);
  check('và chính lần bấm đó huỷ luôn đơn, không để nó treo tiếp',
    (await trangThai(donXen.id)).status === 'expired',
    `đang là ${(await trangThai(donXen.id)).status}`);

  // ════ 7. Khách đặt lại được NGAY ═════════════════════════════════════════
  const datLai = await datMon();
  check('khách đặt được đơn mới ngay sau khi đơn cũ hết hạn',
    datLai.status === 200 || datLai.status === 201,
    `HTTP ${datLai.status} ${datLai.raw} — báo "vui lòng đặt đơn mới" rồi lại chặn là hai câu đá nhau`);
  const don2 = (await docDon()).order;
  check('đơn mới là một đơn khác, không phải đơn cũ sống lại', don2 && don2.id !== don1.id);

  // ════ 8. Đơn ĐÃ xác nhận thì không bị đồng hồ này đụng tới ═══════════════
  const xn2 = await goi(`/api/admin/orders/${don2.id}/confirm`, { method: 'POST', token: tSale });
  check('Sale xác nhận được đơn còn hạn', xn2.status === 200, `HTTP ${xn2.status} ${xn2.raw}`);
  await luiDon(don2.id, 30);          // lùi hẳn 30 phút
  await docDon();
  check('đơn đã xác nhận KHÔNG bị huỷ dù đặt từ rất lâu',
    (await trangThai(don2.id)).status !== 'expired',
    'đồng hồ 5 phút chỉ áp cho bước chờ xác nhận, huỷ đơn đã phát hành bill là mất tiền của quán');

  // ════ 8b. KHÁCH SỬA ĐƠN THÌ ĐỒNG HỒ ĐẾM LẠI TỪ ĐẦU ══════════════════════
  //
  // Đây là cái bẫy của việc đếm theo created_at: khách sửa đơn trên bill thì
  // đơn quay lại chờ xác nhận, nhưng created_at vẫn là mốc cũ. Nếu đồng hồ đếm
  // theo cột đó thì một đơn đặt từ 10 phút trước, vừa được khách sửa xong, sẽ
  // quá hạn ngay lập tức — có khi bị huỷ trước cả khi Sale kịp nhìn thấy nó.
  //
  // Nên đồng hồ đếm theo pending_since, và cột đó được đặt lại ở mỗi lần đơn
  // quay về bước chờ xác nhận.
  await db.query(`UPDATE chat_orders SET status = 'paid' WHERE session_id = $1 AND status <> 'expired'`, [PHIEN]);
  const datSua = await datMon();
  check('dựng được đơn để thử việc khách sửa', datSua.status === 200 || datSua.status === 201, `HTTP ${datSua.status}`);
  const donSua = (await docDon()).order;
  const xnSua = await goi(`/api/admin/orders/${donSua.id}/confirm`, { method: 'POST', token: tSale });
  check('Sale xác nhận để bill ra, mở quyền sửa cho khách', xnSua.status === 200, `HTTP ${xnSua.status} ${xnSua.raw}`);

  // Đơn "già" 10 phút rồi mới sửa.
  //
  // Phải lùi CẢ pending_since, không chỉ created_at: chính pending_since là cái
  // phải được đặt lại lúc khách sửa. Để nó còn mới thì phép đo bên dưới vẫn
  // xanh kể cả khi mã nguồn quên đặt lại — tức là không đo được gì.
  await db.query(`UPDATE chat_orders
                     SET created_at = NOW() - INTERVAL '10 minutes',
                         pending_since = NOW() - INTERVAL '10 minutes'
                   WHERE id = $1`, [donSua.id]);
  const suaDon = await goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'PUT', body: { items: [{ itemId: mon, quantity: 2 }], language: 'vi' },
  });
  check('khách sửa được đơn khi bill đã ra', suaDon.status === 200, `HTTP ${suaDon.status} ${suaDon.raw}`);
  check('sửa xong đơn KHÔNG bị huỷ ngay dù đặt từ 10 phút trước',
    (await trangThai(donSua.id)).status === 'pending_confirm',
    `đang là ${(await trangThai(donSua.id)).status} — đếm theo created_at là rơi đúng vào bẫy này`);

  // Đọc mốc thẳng từ database thay vì qua endpoint /order: endpoint đó trả về
  // đơn MỚI NHẤT của phiên theo created_at, mà created_at của đơn này vừa bị
  // lùi 10 phút để dựng cái bẫy — nên nó không còn là đơn mới nhất nữa.
  const mocSua = (await db.query(
    `SELECT pending_since, created_at,
            EXTRACT(EPOCH FROM (NOW() - pending_since)) AS tuoi_giay
       FROM chat_orders WHERE id = $1`, [donSua.id])).rows[0];
  check('mốc đồng hồ (pending_since) được ĐẶT LẠI lúc khách sửa',
    Number(mocSua.tuoi_giay) < 30,
    `pending_since đã ${Math.round(Number(mocSua.tuoi_giay))} giây tuổi — lẽ ra vừa mới đặt`);
  check('và pending_since tách hẳn khỏi created_at cũ',
    new Date(mocSua.pending_since).getTime() - new Date(mocSua.created_at).getTime() > 8 * 60 * 1000,
    'hai cột bằng nhau nghĩa là pending_since không được đặt lại');

  // Đang chờ xác nhận thì khoá lại, không sửa tiếp được.
  const suaTiep = await goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'PUT', body: { items: [{ itemId: mon, quantity: 4 }], language: 'vi' },
  });
  check('đang chờ Sale xác nhận thì KHÔNG sửa tiếp được',
    suaTiep.status === 409 && suaTiep.body?.code === 'order_pending_confirm',
    `HTTP ${suaTiep.status} ${suaTiep.raw}`);

  // ════ 9. VÒNG QUÉT ĐỊNH KỲ — không cần ai gọi API ════════════════════════
  //
  // Đây là phép đo quan trọng nhất của bài: khách đóng trình duyệt rồi đi mất
  // thì không còn request nào kích kiểm tra lười. Không có vòng quét thì đơn
  // treo vĩnh viễn và chính bàn đó bị chặn không đặt được đơn mới.
  await db.query(`UPDATE chat_orders SET status = 'paid' WHERE session_id = $1 AND status NOT IN ('expired','paid')`, [PHIEN]);
  const dat3 = await datMon();
  check('dựng được đơn thứ ba để thử vòng quét', dat3.status === 200 || dat3.status === 201, `HTTP ${dat3.status}`);
  const don3 = (await docDon()).order;
  await luiDon(don3.id, 6);
  console.log('     (chờ vòng quét 30 giây chạy — KHÔNG gọi API nào trong lúc này)');
  let tt3 = null;
  for (let i = 0; i < 40; i++) {      // tối đa 40 giây
    await nghi(1000);
    tt3 = await trangThai(don3.id);   // đọc thẳng database, không qua máy chủ
    if (tt3.status === 'expired') break;
  }
  check('vòng quét định kỳ tự huỷ đơn mà KHÔNG cần request nào',
    tt3?.status === 'expired',
    `sau 40 giây vẫn là ${tt3?.status} — khách đóng trình duyệt là đơn treo vĩnh viễn`);

  // ════ 10. Không nhân đôi thông báo ═══════════════════════════════════════
  //
  // Vòng quét và request của khách có thể vào đúng cùng lúc. Nếu kiểm tra
  // trước rồi mới ghi thì cả hai cùng thấy "chưa huỷ" và cùng gửi tin.
  const soTinHuy = (await db.query(
    `SELECT COUNT(*)::int n FROM messages
      WHERE session_id = $1 AND system_kind = 'order_expired'`, [PHIEN])).rows[0].n;
  check('mỗi đơn quá hạn chỉ sinh ĐÚNG MỘT tin cho nhân viên', soTinHuy === 3,
    `${soTinHuy} tin cho 3 đơn đã huỷ — thừa nghĩa là có chỗ gửi hai lần`);
  const soSkHuy = (await db.query(
    `SELECT COUNT(*)::int n FROM chat_order_events WHERE order_id = $1 AND event_type = 'order_expired'`,
    [don3.id])).rows[0].n;
  check('mỗi đơn chỉ ghi ĐÚNG MỘT mục lịch sử tự huỷ', soSkHuy === 1, `${soSkHuy} mục`);

  await db.end();
  console.log('');
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
