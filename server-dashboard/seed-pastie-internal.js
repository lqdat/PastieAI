#!/usr/bin/env node
// TẠO BA TÀI KHOẢN NỘI BỘ PASTIE — chạy MỘT LẦN, bằng tay.
//
// Cố ý KHÔNG nhét vào migration khởi động: migration chạy mỗi lần deploy, nên
// một tài khoản vừa bị khóa hoặc vừa đổi vai sẽ bị dựng lại sau lần deploy kế
// tiếp — đúng loại việc không ai muốn tự xảy ra với tài khoản có quyền.
//
// Cách chạy (trong server-dashboard):
//   DATABASE_URL=... node seed-pastie-internal.js
// Đổi email thì truyền thêm:
//   AGENT_EMAIL=... SALE_EMAIL=... TECH_EMAIL=... node seed-pastie-internal.js
//
// Chạy lại nhiều lần không sao: tài khoản đã có thì chỉ cập nhật vai, quan hệ
// quản lý và cờ session, KHÔNG đổi mật khẩu đang dùng (muốn đặt lại thì thêm
// RESET_PASSWORDS=true).
const crypto = require('crypto');
const { Client } = require('pg');

// Cùng công thức băm với server.js (hashPassword): salt:hash, PBKDF2-SHA512.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Mã QR mà trang giới thiệu PastieChat trỏ tới. Đổi nhãn thì đổi ở đây, đổi mã
// thì phải dựng lại ảnh QR bên pastiechat-landing (scripts/make-qr.js).
const QR_CODE = process.env.QR_CODE || 'PASTIECARE';
const QR_LABEL = process.env.QR_LABEL || 'Chăm sóc khách hàng Pastie';

const ACCOUNTS = {
  agent: { email: process.env.AGENT_EMAIL || 'ai@pastie.vn', role: 'agent', name: 'Agent Pastie' },
  sale: { email: process.env.SALE_EMAIL || 'phuquoc@pastie.vn', role: 'sale', name: 'Sale Pastie' },
  tech: { email: process.env.TECH_EMAIL || 'techpastie@tempmail.id.vn', role: 'technical', name: 'Kỹ thuật Pastie' },
};

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const reset = String(process.env.RESET_PASSWORDS || '') === 'true';
  const created = [];

  const upsert = async ({ email, role, name }, managedBy) => {
    const plain = crypto.randomBytes(9).toString('base64url');
    const existing = (await db.query('SELECT id FROM admins WHERE username = $1', [email])).rows[0];
    if (existing) {
      await db.query(
        `UPDATE admins SET full_name = $1, role = $2, project_id = 'qr-concierge', is_active = TRUE,
                managed_by_admin_id = $3, session_never_expires = TRUE,
                password_hash = CASE WHEN $5 THEN $4 ELSE password_hash END
          WHERE id = $6`,
        [name, role, managedBy, hashPassword(plain), reset, existing.id]
      );
      created.push({ email, role, id: existing.id, password: reset ? plain : '(giữ nguyên)' });
      return existing.id;
    }
    const row = (await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active,
                           managed_by_admin_id, session_never_expires)
       VALUES ($1, $2, $3, $4, 'qr-concierge', TRUE, $5, TRUE) RETURNING id`,
      [email, hashPassword(plain), name, role, managedBy]
    )).rows[0];
    created.push({ email, role, id: row.id, password: plain });
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
  // trò chuyện mà Sale Pastie trực. Nhãn "Chăm sóc khách hàng Pastie" chính là
  // dòng khách nhìn thấy trong khung chat, nên nó phải là tên nghiệp vụ chứ
  // không phải tên bàn.
  //
  // Mã (code) cố định PASTIECARE để trang giới thiệu không phải dựng lại mỗi
  // lần chạy script; nhãn thì cập nhật được.
  const nhomRes = await db.query(
    `SELECT id FROM agent_groups WHERE agent_id = $1 AND project_id = 'qr-concierge' AND name = $2`,
    [agentId, QR_LABEL]);
  const nhomId = nhomRes.rows[0]?.id || (await db.query(
    `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1, 'qr-concierge', $2) RETURNING id`,
    [agentId, QR_LABEL])).rows[0].id;
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
    console.log(`  ${row.role.padEnd(10)} id=${String(row.id).padEnd(5)} ${row.email}`);
    console.log(`             mật khẩu: ${row.password}`);
  }
  console.log(`\nMã QR chăm sóc khách hàng: ${qr.code} — "${qr.label}" (Sale Pastie trực)`);
  console.log(`  Đường dẫn cho trang giới thiệu: https://chat.pastiechat.com/?code=${qr.code}`);

  console.log('\nCả ba đều bật session_never_expires = TRUE (phiên không tự hết hạn).');
  console.log('Vẫn bị đăng xuất khi: tự đăng xuất, bị khóa tài khoản, gỡ thiết bị, hoặc đăng nhập ở máy khác.');
  console.log('Mật khẩu in ở trên CHỈ hiện một lần — đăng nhập bằng OTP qua email vẫn dùng được bình thường.');
  await db.end();
})().catch((error) => { console.error('LỖI:', error.message); process.exit(1); });
