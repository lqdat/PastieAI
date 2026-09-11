#!/usr/bin/env node
// KIỂM TRA BA TÀI KHOẢN NỘI BỘ PASTIE ĐÃ TẠO CHƯA — CHỈ ĐỌC, không sửa gì.
//
// Vì sao có script này: seed-pastie-internal.js là script TẠO, chạy nó để "xem
// thử" thì nó sẽ tạo luôn. Cái này chỉ SELECT, chạy bao nhiêu lần cũng không
// đụng vào dữ liệu.
//
// Cách chạy (trong thư mục server-dashboard):
//     node kiem-tra-3-tai-khoan.js
// Tự đọc DATABASE_URL trong .env cùng thư mục. Muốn soi cơ sở dữ liệu khác:
//     DATABASE_URL=... node kiem-tra-3-tai-khoan.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Đọc .env bằng tay, không dùng dotenv để script chạy được kể cả khi thiếu gói.
function docEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const duong = path.join(__dirname, '.env');
  if (!fs.existsSync(duong)) return null;
  for (const dong of fs.readFileSync(duong, 'utf8').split(/\r?\n/)) {
    const khop = dong.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (khop) return khop[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

const CAN_CO = [
  { email: process.env.AGENT_EMAIL || 'ai@pastie.vn', role: 'agent', ten: 'Agent Pastie' },
  { email: process.env.SALE_EMAIL || 'phuquoc@pastie.vn', role: 'sale', ten: 'Sale Pastie' },
  { email: process.env.TECH_EMAIL || 'techpastie@tempmail.id.vn', role: 'technical', ten: 'Kỹ thuật Pastie' },
];
const QR_CODE = process.env.QR_CODE || 'PASTIECARE';

(async () => {
  const url = docEnv();
  if (!url) { console.error('Không tìm thấy DATABASE_URL (trong .env hay biến môi trường).'); process.exit(1); }
  console.log('Cơ sở dữ liệu: ' + url.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@') + '\n');

  const db = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();

  const rows = (await db.query(
    `SELECT id, username, full_name, role, project_id, is_active,
            managed_by_admin_id, session_never_expires, sale_limit, password_hash
       FROM admins WHERE username = ANY($1::text[]) ORDER BY id`,
    [CAN_CO.map((x) => x.email)])).rows;

  let thieu = 0;
  let lech = 0;
  const theoEmail = new Map(rows.map((r) => [r.username, r]));
  const agent = theoEmail.get(CAN_CO[0].email);

  for (const can of CAN_CO) {
    const co = theoEmail.get(can.email);
    if (!co) { thieu++; console.log(`✗ CHƯA CÓ   ${can.ten.padEnd(16)} ${can.email}`); continue; }
    const ghiChu = [];
    // Đúng vai thì trang nào hiện ra mới đúng; sai vai là đăng nhập vào thấy nhầm màn hình.
    if (co.role !== can.role) ghiChu.push(`vai đang là "${co.role}", cần "${can.role}"`);
    if (co.project_id !== 'qr-concierge') ghiChu.push(`project_id "${co.project_id}"`);
    if (!co.is_active) ghiChu.push('ĐANG BỊ KHÓA');
    if (!co.session_never_expires) ghiChu.push('phiên vẫn tự hết hạn');
    // Ba tài khoản này chỉ đăng nhập bằng OTP/Google. verifyPassword từ chối mọi
    // chuỗi không có dấu hai chấm, nên CÓ dấu hai chấm nghĩa là vẫn còn một mật
    // khẩu dùng được — thêm một đường vào mà không ai định để lại.
    if (String(co.password_hash || '').includes(':')) ghiChu.push('VẪN CÒN mật khẩu đăng nhập được');
    // Sale và Kỹ thuật phải thuộc Agent, không thì Agent không thấy họ trong trang nhân viên.
    if (can.role !== 'agent' && agent && co.managed_by_admin_id !== agent.id) {
      ghiChu.push(`chưa thuộc Agent Pastie (managed_by=${co.managed_by_admin_id})`);
    }
    if (ghiChu.length) lech++;
    console.log(`${ghiChu.length ? '⚠ CÓ NHƯNG' : '✓ ĐÃ CÓ   '} ${can.ten.padEnd(16)} ${can.email}  id=${co.id}  vai=${co.role}`);
    for (const g of ghiChu) console.log(`             → ${g}`);
  }

  // Trần số Sale: đủ chỗ cho Sale Pastie thì Agent mới thêm được nhân viên.
  if (agent) {
    const n = Number((await db.query(
      `SELECT COUNT(*)::int n FROM admins WHERE role = 'sale' AND managed_by_admin_id = $1`, [agent.id])).rows[0].n);
    const tran = agent.sale_limit === null ? 'không giới hạn' : agent.sale_limit;
    const chat = agent.sale_limit !== null && Number(agent.sale_limit) < n;
    console.log(`\n${chat ? '⚠' : '✓'} Trần Sale của Agent: ${tran} — đang có ${n} Sale` +
      (chat ? '  → trần thấp hơn số thực tế, Agent sẽ thấy "đã đạt giới hạn"' : ''));
  }

  // Mã QR chăm sóc khách hàng: có mã mà không ai trực thì khách quét vào ngồi không.
  const qr = (await db.query(
    'SELECT id, code, label, owner_admin_id, group_id, is_active FROM qr_chat_accounts WHERE code = $1',
    [QR_CODE])).rows[0];
  if (!qr) {
    console.log(`\n✗ CHƯA CÓ mã QR "${QR_CODE}" — trang giới thiệu quét vào sẽ lỗi.`);
    thieu++;
  } else {
    console.log(`\n✓ Mã QR ${qr.code} — "${qr.label}"${qr.is_active ? '' : '  ⚠ ĐANG TẮT'}`);
    const truc = (await db.query(
      `SELECT a.username, a.full_name, s.is_active FROM agent_group_sales s
         JOIN admins a ON a.id = s.sale_id WHERE s.group_id = $1`, [qr.group_id])).rows;
    if (!truc.length) console.log('   ⚠ KHÔNG có Sale nào trực nhóm này — khách quét vào không ai nhận.');
    else for (const t of truc) console.log(`   trực: ${t.full_name} (${t.username})${t.is_active ? '' : ' — đang tắt'}`);
  }

  console.log('\n' + (thieu
    ? `KẾT LUẬN: còn ${thieu} thứ CHƯA tạo → chạy:  node seed-pastie-internal.js`
    : lech
      ? `KẾT LUẬN: cả ba đã có nhưng ${lech} tài khoản sai thiết lập → chạy lại seed-pastie-internal.js để sửa.`
      : 'KẾT LUẬN: cả ba tài khoản và mã QR đều đã có, thiết lập đúng, không tài khoản nào còn mật khẩu.'));
  await db.end();
})().catch((e) => { console.error('LỖI:', e.message); process.exit(1); });
