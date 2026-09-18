// TIN HỆ THỐNG CÓ CẤU TRÚC — máy chủ có ghi đủ mảnh rời để dựng lại câu không.
//
// Tài liệu AGENT_SALE_I18N_AUDIT §7.3: tin hệ thống không được là một câu tiếng
// Việt ghép sẵn, vì như vậy Sale/Agent dùng ngôn ngữ khác không có cách nào đọc
// bằng tiếng của họ. Máy chủ phải gửi kèm system_kind + system_params.
//
// Bài này đi ĐÚNG luồng đặt món thật qua API, rồi soi vào bảng messages xem
// từng bước có ghi đủ mảnh rời chưa, và endpoint đọc tin nhắn có trả chúng ra
// cho giao diện không.
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
const PHIEN = 'sess-tht-1';
const EMAILS = ['agent-tht@test.local', 'sale-tht@test.local'];

(async () => {
  const db = new Client({ connectionString: DB });
  await db.connect();
  // Một kết nối THÔ, không qua lớp giải mã của database.js — để nhìn thấy đúng
  // thứ đang thật sự nằm trong database.
  const dbTho = new Client({ connectionString: DB });
  await dbTho.connect();

  const don = async () => {
    for (const b of ['chat_order_events', 'chat_order_bills', 'chat_order_revisions', 'chat_orders', 'messages']) {
      await db.query(`DELETE FROM ${b} WHERE session_id = $1`, [PHIEN]).catch(() => {});
    }
    await db.query('DELETE FROM sessions WHERE id = $1', [PHIEN]).catch(() => {});
    await db.query(`DELETE FROM qr_menu_items WHERE name LIKE '[THT]%'`).catch(() => {});
    await db.query(`DELETE FROM qr_chat_accounts WHERE code = 'THT-1'`).catch(() => {});
    await db.query(`DELETE FROM agent_group_sales WHERE sale_id IN (SELECT id FROM admins WHERE username = ANY($1::text[]))`, [EMAILS]).catch(() => {});
    await db.query(`DELETE FROM agent_groups WHERE name = 'Nhóm THT'`).catch(() => {});
    await db.query('DELETE FROM admins WHERE username = ANY($1::text[])', [EMAILS]).catch(() => {});
  };
  await don();

  const agent = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, agent_menu_enabled)
     VALUES ($1,$2,'Quán THT','agent','qr-concierge',TRUE,TRUE) RETURNING id`,
    [EMAILS[0], bam(MK)])).rows[0].id;
  const sale = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, managed_by_admin_id)
     VALUES ($1,$2,'Sale THT','sale','qr-concierge',TRUE,$3) RETURNING id`,
    [EMAILS[1], bam(MK), agent])).rows[0].id;
  const nhom = (await db.query(
    `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1,'qr-concierge','Nhóm THT') RETURNING id`,
    [agent])).rows[0].id;
  await db.query(
    `INSERT INTO agent_group_sales (group_id, sale_id, is_active) VALUES ($1,$2,TRUE)
     ON CONFLICT (group_id, sale_id) DO UPDATE SET is_active = TRUE`, [nhom, sale]);
  const maQr = (await db.query(
    `INSERT INTO qr_chat_accounts (project_id, owner_admin_id, code, label, group_id, is_active)
     VALUES ('qr-concierge',$1,'THT-1','Bàn THT',$2,TRUE) RETURNING id`, [agent, nhom])).rows[0].id;
  await db.query(
    `INSERT INTO sessions (id, project_id, visitor_name, platform, status, group_id, claimed_by_admin_id,
                           qr_account_id, expires_at, show_in_dashboard)
     VALUES ($1,'qr-concierge','Khách THT','qr','active',$2,$3,$4,NULL,TRUE)`, [PHIEN, nhom, sale, maQr]);

  const mon = [];
  for (const [ten, gia] of [['[THT] Phở', 65000], ['[THT] Cà phê', 25000]]) {
    mon.push((await db.query(
      `INSERT INTO qr_menu_items (agent_id, project_id, name, price, is_available, stock_quantity)
       VALUES ($1,'qr-concierge',$2,$3,TRUE,100) RETURNING id`, [agent, ten, gia])).rows[0].id);
  }

  const dn = async (u) => (await goi('/api/admin/login', { method: 'POST', body: { username: u, password: MK } })).body?.token;
  const tSale = await dn(EMAILS[1]);
  const tAgent = await dn(EMAILS[0]);
  check('đăng nhập được hai vai', Boolean(tSale && tAgent));
  if (!tSale) { await db.end(); process.exit(1); }

  // Cột system_params phải tồn tại — migration lúc khởi động phải tạo được.
  const cot = await db.query(
    `SELECT data_type FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'system_params'`);
  check('migration đã thêm cột messages.system_params kiểu text (để mã hoá được)',
    cot.rowCount === 1 && cot.rows[0].data_type === 'text',
    JSON.stringify(cot.rows));

  // ĐỌC QUA API, không đọc thẳng DB.
  //
  // original_text và system_params đều được MÃ HOÁ khi nằm trong database; đọc
  // thẳng bằng pg chỉ ra chuỗi "pcv1:...". Lớp giải mã nằm trong database.js của
  // máy chủ, nên muốn nhìn thấy nội dung thật thì phải đi đúng đường mà giao
  // diện đi. Đây cũng chính là thứ giao diện nhận được, nên đo ở đây là đo đúng.
  const layTin = async (kind) => {
    const r = await goi(`/api/admin/chats/${PHIEN}/messages?limit=100`, { token: tSale });
    const tin = (r.body || []).filter((m) => m.system_kind === kind).pop() || null;
    if (!tin) return null;
    let p = tin.system_params;
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } }
    return { system_kind: tin.system_kind, system_params: p, original_text: tin.original_text };
  };

  // ── B1: khách đặt món ─────────────────────────────────────────────────────
  const b1 = await goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'POST', body: { items: [{ itemId: mon[0], quantity: 1 }], language: 'vi' },
  });
  check('khách đặt được món', b1.status < 300, `HTTP ${b1.status} ${b1.raw}`);
  const tDat = await layTin('order_placed');
  const tDatTho = (await dbTho.query(
    "SELECT system_params FROM messages WHERE session_id = $1 AND system_kind = 'order_placed' ORDER BY created_at DESC LIMIT 1",
    [PHIEN])).rows[0] || null;
  check('tin "khách vừa đặt" có system_kind = order_placed', Boolean(tDat));
  check('… và mang đủ tham số summary + total',
    Boolean(tDat?.system_params?.summary) && Number(tDat?.system_params?.total) === 65000,
    JSON.stringify(tDat?.system_params));
  check('… total là SỐ, không phải chuỗi đã định dạng sẵn',
    typeof tDat?.system_params?.total === 'number',
    `đang là ${typeof tDat?.system_params?.total}: ${JSON.stringify(tDat?.system_params?.total)} `
    + '— ghép sẵn "65.000 ₫" là khoá cứng dấu chấm kiểu Việt Nam vào mọi ngôn ngữ');
  const tDatGoc = (await dbTho.query(
    "SELECT original_text FROM messages WHERE session_id = $1 AND system_kind = 'order_placed' ORDER BY created_at DESC LIMIT 1",
    [PHIEN])).rows[0] || null;
  check('… câu gốc được MÃ HOÁ khi nằm trong database',
    String(tDatGoc?.original_text || '').startsWith('pcv1:'), String(tDatGoc?.original_text || '').slice(0, 30));
  check('… nhưng đọc qua API thì ra lại nguyên câu tiếng Việt làm đường lui',
    /Khách vừa đặt/.test(String(tDat?.original_text || '')), String(tDat?.original_text || '').slice(0, 80));
  check('… và system_params CŨNG được mã hoá, không nằm plaintext cạnh nó',
    String(tDatTho?.system_params || '').startsWith('pcv1:'),
    String(tDatTho?.system_params || '').slice(0, 60)
    + ' — tham số có tên món và ghi chú của khách; để plaintext là mở lại đúng cánh cửa vừa đóng');

  const donId = (await db.query(
    'SELECT id, order_code FROM chat_orders WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1', [PHIEN])).rows[0];

  // ── B4': khách sửa đơn ────────────────────────────────────────────────────
  //
  // Khách chỉ sửa được SAU KHI Sale xác nhận và bill đã ra (xem
  // docs/VONG-DOI-BILL.md). Đang chờ xác nhận thì máy chủ trả 409, nên phải
  // cho Sale xác nhận trước — bài này đo việc MÃ HOÁ tin nhắn, không đo luật
  // sửa đơn, nên chỉ cần đưa đơn về đúng trạng thái sửa được.
  const xnTruocKhiSua = await goi(`/api/admin/orders/${donId.id}/confirm`, { method: 'POST', token: tSale });
  check('Sale xác nhận để bill ra, mở quyền sửa cho khách',
    xnTruocKhiSua.status === 200, `HTTP ${xnTruocKhiSua.status} ${xnTruocKhiSua.raw}`);

  const b4 = await goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'PUT', body: { items: [{ itemId: mon[0], quantity: 1 }, { itemId: mon[1], quantity: 2 }], language: 'vi' },
  });
  check('khách sửa được đơn', b4.status < 300, `HTTP ${b4.status} ${b4.raw}`);
  const tSua = await layTin('order_updated');
  check('tin "khách đã cập nhật đơn" có system_kind = order_updated', Boolean(tSua));
  check('… và mang tham số summary', Boolean(tSua?.system_params?.summary),
    JSON.stringify(tSua?.system_params));

  // ── B5: khách chọn cách trả ───────────────────────────────────────────────
  await goi(`/api/admin/orders/${donId.id}/confirm`, { method: 'POST', token: tSale });
  const b5 = await goi(`/api/chats/${PHIEN}/order/payment-method`, {
    method: 'POST', body: { method: 'cash' },
  });
  check('khách chọn được cách trả', b5.status < 300, `HTTP ${b5.status} ${b5.raw}`);
  const tTra = await layTin('payment_method_selected');
  check('tin "khách chọn cách trả" có system_kind = payment_method_selected', Boolean(tTra));
  check('… mang MÃ cách trả (cash), không phải nhãn đã dịch ("Tiền mặt")',
    tTra?.system_params?.method === 'cash',
    JSON.stringify(tTra?.system_params)
    + ' — gửi nhãn tiếng Việt sang là giao diện tiếng Hàn lại phải dịch ngược một câu chữ');
  check('… và mang mã đơn để Sale đối chiếu đúng tờ bill',
    tTra?.system_params?.orderCode === donId.order_code,
    JSON.stringify({ co: tTra?.system_params?.orderCode, can: donId.order_code }));

  // ── B7: Agent xác nhận đã thu tiền ────────────────────────────────────────
  const b7 = await goi(`/api/admin/orders/${donId.id}/received-payment`, {
    method: 'POST', token: tAgent, body: { method: 'cash' },
  });
  check('Agent xác nhận được đã thu tiền', b7.status < 300, `HTTP ${b7.status} ${b7.raw}`);
  const tThu = await layTin('order_paid');
  check('tin "đã thu đủ tiền" có system_kind = order_paid', Boolean(tThu));
  check('… mang mã cách trả và mã đơn',
    tThu?.system_params?.method === 'cash' && tThu?.system_params?.orderCode === donId.order_code,
    JSON.stringify(tThu?.system_params));

  // ── Endpoint đọc tin nhắn có trả system_params ra cho giao diện không ─────
  const ds = await goi(`/api/admin/chats/${PHIEN}/messages?limit=100`, { token: tSale });
  check('Sale đọc được danh sách tin nhắn', ds.status === 200, `HTTP ${ds.status} ${ds.raw}`);
  const tinCoCauTruc = (ds.body || []).filter((m) => {
    if (!m.system_kind || !m.system_params) return false;
    // Giải mã xong, system_params là CHUỖI JSON (cột text). Giao diện tự parse.
    try { return typeof JSON.parse(m.system_params) === 'object'; } catch (e) { return false; }
  });
  console.log(`     (API trả ${(ds.body || []).length} tin, ${tinCoCauTruc.length} tin có cấu trúc: `
    + tinCoCauTruc.map((m) => m.system_kind).join(', ') + ')');
  check('API trả system_params ra cho giao diện — thiếu là giao diện không dựng lại được câu',
    tinCoCauTruc.length >= 3, `mới có ${tinCoCauTruc.length} tin`);
  check('mỗi tin có cấu trúc VẪN kèm câu gốc làm đường lui',
    tinCoCauTruc.every((m) => String(m.original_text || '').length > 0));

  // ── Tin CŨ không có system_params thì không được hỏng ─────────────────────
  await db.query(
    `INSERT INTO messages (session_id, sender, original_text, translated_text, language, visible_to, system_kind)
     VALUES ($1,'system','[Đặt món] Tin đời cũ không có tham số.','[Đặt món] Tin đời cũ không có tham số.','vi','staff','order_placed')`,
    [PHIEN]);
  const ds2 = await goi(`/api/admin/chats/${PHIEN}/messages?limit=100`, { token: tSale });
  const tinCu = (ds2.body || []).find((m) => String(m.original_text || '').includes('Tin đời cũ'));
  check('tin đời cũ (có kind, KHÔNG có params) vẫn đọc được, params để trống',
    Boolean(tinCu) && (tinCu.system_params === null || tinCu.system_params === undefined),
    JSON.stringify({ co: Boolean(tinCu), params: tinCu?.system_params }));

  console.log('');
  await don();
  await db.end();
  await dbTho.end();
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
