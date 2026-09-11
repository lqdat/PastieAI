#!/usr/bin/env node
// TẠO BA TÀI KHOẢN NỘI BỘ PASTIE — chạy MỘT LẦN, bằng tay.
//
// Cố ý KHÔNG nhét vào migration khởi động: migration chạy mỗi lần deploy, nên
// một tài khoản vừa bị khóa hoặc vừa đổi vai sẽ bị dựng lại sau lần deploy kế
// tiếp — đúng loại việc không ai muốn tự xảy ra với tài khoản có quyền.
//
// Cách chạy (trong server-dashboard):
//   node seed-pastie-internal.js
// Tự đọc DATABASE_URL trong .env cùng thư mục. Muốn trỏ cơ sở dữ liệu khác thì
// truyền đè: DATABASE_URL=... node seed-pastie-internal.js
// Đổi email thì truyền thêm:
//   AGENT_EMAIL=... SALE_EMAIL=... TECH_EMAIL=... node seed-pastie-internal.js
//
// Chạy lại nhiều lần không sao: tài khoản đã có thì chỉ cập nhật vai, quan hệ
// quản lý và cờ session.
//
// BA TÀI KHOẢN NÀY KHÔNG CÓ MẬT KHẨU. Đăng nhập bằng OTP qua email hoặc bằng
// Google, cả hai đường đều không đụng tới password_hash (xem
// resolveAdminUserAndLogin trong server.js). Không sinh mật khẩu thì không có
// chuỗi nào để lộ, để quên hay để dò.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Đọc .env bằng tay, không dùng dotenv để chạy được kể cả khi thiếu gói. Thiếu
// bước này thì pg nhận mật khẩu undefined và báo một lỗi khó hiểu:
// "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string".
function docDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const duong = path.join(__dirname, '.env');
  if (!fs.existsSync(duong)) return null;
  for (const dong of fs.readFileSync(duong, 'utf8').split(/\r?\n/)) {
    const khop = dong.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (khop) return khop[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

// KHÔNG CÓ MẬT KHẨU — nhưng cột password_hash là NOT NULL nên phải điền gì đó.
//
// Điền chuỗi này. verifyPassword trong server.js mở đầu bằng
//     if (!storedPassword || !storedPassword.includes(':')) return false;
// nên một chuỗi KHÔNG có dấu hai chấm thì mọi mật khẩu gõ vào đều bị từ chối —
// không có mật khẩu nào mở được, kể cả chuỗi này.
//
// Cố ý viết thành câu đọc được: ai mở bảng admins ra cũng hiểu ngay đây là tài
// khoản chỉ đăng nhập bằng OTP/Google, chứ không tưởng là băm hỏng.
const KHONG_CO_MAT_KHAU = 'khong-dung-mat-khau-dang-nhap-bang-otp-hoac-google';

// Mã QR mà trang giới thiệu PastieChat trỏ tới. Đổi nhãn thì đổi ở đây, đổi mã
// thì phải dựng lại ảnh QR bên pastiechat-landing (scripts/make-qr.js).
const QR_CODE = process.env.QR_CODE || 'PASTIECARE';
const QR_GROUP = process.env.QR_GROUP || 'Công Ty TNHH Pastie Việt Nam';
const QR_LABEL = process.env.QR_LABEL || 'Chăm Sóc Khách Hàng';

const ACCOUNTS = {
  agent: { email: process.env.AGENT_EMAIL || 'ai@pastie.vn', role: 'agent', name: 'Agent Pastie' },
  sale: { email: process.env.SALE_EMAIL || 'phuquoc@pastie.vn', role: 'sale', name: 'Sale Pastie' },
  tech: { email: process.env.TECH_EMAIL || 'techpastie@tempmail.id.vn', role: 'technical', name: 'Kỹ thuật Pastie' },
};

(async () => {
  const url = docDatabaseUrl();
  if (!url) {
    console.error('Không tìm thấy DATABASE_URL (trong .env cùng thư mục hay biến môi trường).');
    process.exit(1);
  }
  console.log('Cơ sở dữ liệu: ' + url.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@'));
  // Railway dùng chứng chỉ tự ký ở cổng proxy, không tắt kiểm chứng chỉ thì không nối được.
  const db = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const created = [];

  const upsert = async ({ email, role, name }, managedBy) => {
    const existing = (await db.query('SELECT id FROM admins WHERE username = $1', [email])).rows[0];
    if (existing) {
      // Ghi đè password_hash luôn, kể cả tài khoản đã có: chạy script này là để
      // ba tài khoản ở đúng trạng thái "không mật khẩu", nên mật khẩu cũ (nếu
      // từng đặt) phải bị xoá chứ không giữ lại.
      await db.query(
        `UPDATE admins SET full_name = $1, role = $2, project_id = 'qr-concierge', is_active = TRUE,
                managed_by_admin_id = $3, session_never_expires = TRUE, password_hash = $4
          WHERE id = $5`,
        [name, role, managedBy, KHONG_CO_MAT_KHAU, existing.id]
      );
      created.push({ email, role, id: existing.id, moi: false });
      return existing.id;
    }
    const row = (await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active,
                           managed_by_admin_id, session_never_expires)
       VALUES ($1, $2, $3, $4, 'qr-concierge', TRUE, $5, TRUE) RETURNING id`,
      [email, KHONG_CO_MAT_KHAU, name, role, managedBy]
    )).rows[0];
    created.push({ email, role, id: row.id, moi: true });
    return row.id;
  };

  const agentId = await upsert(ACCOUNTS.agent, null);
  // Sale và Kỹ thuật đều thuộc Agent Pastie qua managed_by_admin_id.
  const saleId = await upsert(ACCOUNTS.sale, agentId);
  await upsert(ACCOUNTS.tech, agentId);

  // Trần số Sale của Agent phải còn chỗ cho Sale Pastie, nếu không Agent mở
  // trang nhân viên ra là thấy "đã đạt giới hạn" dù Sale đã tồn tại.
  const agent = (await db.query('SELECT sale_limit FROM admins WHERE id = $1', [agentId])).rows[0];
  const saleCount = Number((await db.query(
    `SELECT COUNT(*)::int n FROM admins WHERE role = 'sale' AND managed_by_admin_id = $1`, [agentId])).rows[0].n);
  if (agent.sale_limit !== null && Number(agent.sale_limit) < saleCount) {
    await db.query('UPDATE admins SET sale_limit = $2 WHERE id = $1', [agentId, saleCount]);
    console.log(`• Đã nâng trần Sale của Agent Pastie lên ${saleCount} cho khớp số Sale thực tế.`);
  }

  // ── Mã QR chăm sóc khách hàng ────────────────────────────────────────────
  //
  // Mã trên trang giới thiệu PastieChat trỏ vào ĐÂY: khách quét là mở một cuộc
  // trò chuyện mà Sale Pastie trực. Nhóm là pháp nhân Pastie; nhãn QR là tên
  // nghiệp vụ khách nhìn thấy trong khung chat.
  //
  // Mã (code) cố định PASTIECARE để trang giới thiệu không phải dựng lại mỗi
  // lần chạy script; nhãn thì cập nhật được.
  const nhomRes = await db.query(
    `SELECT g.id
       FROM agent_groups g
       LEFT JOIN qr_chat_accounts q ON q.group_id = g.id AND q.code = $3
      WHERE g.agent_id = $1 AND g.project_id = 'qr-concierge' AND (g.name = $2 OR q.id IS NOT NULL)
      ORDER BY (g.name = $2) DESC
      LIMIT 1`,
    [agentId, QR_GROUP, QR_CODE]);
  const nhomId = nhomRes.rows[0]?.id || (await db.query(
    `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1, 'qr-concierge', $2) RETURNING id`,
    [agentId, QR_GROUP])).rows[0].id;
  await db.query('UPDATE agent_groups SET name = $2 WHERE id = $1', [nhomId, QR_GROUP]);
  // Sale Pastie trực nhóm này — không gắn thì khách quét vào mà không ai nhận.
  await db.query(
    `INSERT INTO agent_group_sales (group_id, sale_id, is_active) VALUES ($1, $2, TRUE)
     ON CONFLICT DO NOTHING`, [nhomId, saleId]);

  const qr = (await db.query(
    `INSERT INTO qr_chat_accounts (project_id, code, label, owner_admin_id, group_id, is_active)
     VALUES ('qr-concierge', $1, $2, $3, $4, TRUE)
     ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, owner_admin_id = EXCLUDED.owner_admin_id,
                                      group_id = EXCLUDED.group_id, is_active = TRUE
     RETURNING id, code, label`, [QR_CODE, QR_LABEL, agentId, nhomId])).rows[0];

  console.log('\nĐã tạo/cập nhật:');
  for (const row of created) {
    console.log(`  ${row.role.padEnd(10)} id=${String(row.id).padEnd(5)} ${row.email}` +
      (row.moi ? '   (tạo mới)' : '   (đã có, cập nhật lại)'));
  }
  console.log(`\nMã QR chăm sóc khách hàng: ${qr.code} — "${qr.label}" (Sale Pastie trực)`);
  console.log(`  Đường dẫn cho trang giới thiệu: https://chat.pastiechat.com/?code=${qr.code}`);

  console.log('\nCả ba KHÔNG CÓ MẬT KHẨU: chỉ đăng nhập bằng OTP gửi qua email, hoặc bằng Google.');
  console.log('Nghĩa là email phải vào được hộp thư thật — email hỏng là không còn đường đăng nhập nào.');
  console.log('\nCả ba đều bật session_never_expires = TRUE (phiên không tự hết hạn).');
  console.log('Vẫn bị đăng xuất khi: tự đăng xuất, bị khóa tài khoản, gỡ thiết bị, hoặc đăng nhập ở máy khác.');
  await db.end();
})().catch((error) => { console.error('LỖI:', error.message); process.exit(1); });
