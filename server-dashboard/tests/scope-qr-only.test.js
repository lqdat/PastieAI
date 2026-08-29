// Test phạm vi: phân cấp Agent - Sale CHỈ được chạm vào project qr_concierge.
//
// Dựng ba dự án — QR Concierge, DealPhuQuoc, Pastie Landing — với role 'agent'
// ở cả ba (DealPhuQuoc thật sự cấp role này cho nhân viên của họ), rồi chạy
// migration và khẳng định chỉ tài khoản của dự án QR bị đổi role và được cấp
// khung giờ mặc định.
//
// Cách chạy (cần một Postgres trống):
//   PGCONN='postgresql://user@host:port/db' node data4.js
const { Pool } = require('pg');
const CONN = process.env.PGCONN || 'postgresql://postgres@localhost:5432/pastie_test';

(async () => {
  // Dựng schema "trước migration" bằng pg thuần, RỒI mới nạp database.js —
  // mô phỏng đúng tình huống production: dữ liệu cũ đã có sẵn khi deploy bản mới.
  const raw = new Pool({ connectionString: CONN });
  await raw.query(`CREATE TABLE admins (id SERIAL PRIMARY KEY, username VARCHAR(100) UNIQUE, password_hash VARCHAR(255), full_name VARCHAR(255), role VARCHAR(20), avatar_url VARCHAR(500), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW(), project_id VARCHAR(100))`);
  await raw.query(`CREATE TABLE projects (id VARCHAR(100) PRIMARY KEY, name VARCHAR(255), created_at TIMESTAMP DEFAULT NOW(), project_type VARCHAR(30) NOT NULL DEFAULT 'standard')`);
  await raw.query(`INSERT INTO projects (id,name,project_type) VALUES ('qr-concierge','QR','qr_concierge'),('dealphuquoc','Deal','standard'),('pastie-landingpage','Landing','standard')`);
  await raw.query(`INSERT INTO admins (username,password_hash,full_name,role,project_id) VALUES
     ('an@x.com','h','Sale An','agent','qr-concierge'),
     ('binh@x.com','h','Sale Bình','agent','qr-concierge'),
     ('deal1@x.com','h','NV Deal','agent','dealphuquoc'),
     ('deal2@x.com','h','Admin Deal','project_admin','dealphuquoc'),
     ('land1@x.com','h','NV Landing','agent','pastie-landingpage')`);
  await raw.query(`CREATE TABLE qr_chat_accounts (id SERIAL PRIMARY KEY, project_id VARCHAR(100) REFERENCES projects(id), owner_admin_id INT REFERENCES admins(id), code VARCHAR(80) UNIQUE, label VARCHAR(255), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())`);
  await raw.end();

  process.env.DATABASE_URL = CONN;
  const db = require('./database.js');
  await db.initPromise;
  await db.initializeDatabase(); // chạy lần hai để kiểm tra idempotent

  const roles = (await db.query(`SELECT username, role, project_id FROM admins ORDER BY id`)).rows;
  console.log('--- role sau migration ---');
  roles.forEach((r) => console.log(`  ${r.username.padEnd(14)} ${r.project_id.padEnd(20)} ${r.role}`));

  const hours = (await db.query(
    `SELECT a.username, a.project_id FROM account_access_hours h JOIN admins a ON a.id = h.admin_id ORDER BY a.id`
  )).rows;
  console.log('--- ai được cấp khung giờ mặc định ---');
  console.log(hours.length ? hours.map((h) => `  ${h.username} (${h.project_id})`).join('\n') : '  (không ai)');

  const leaked = hours.filter((h) => h.project_id !== 'qr-concierge');
  const wrongRole = roles.filter((r) => r.project_id !== 'qr-concierge' && r.role === 'sale');
  console.log('\nKẾT LUẬN:',
    leaked.length === 0 && wrongRole.length === 0
      ? 'ĐẠT — không có dự án nào ngoài QR bị chạm.'
      : `HỎNG — rò khung giờ: ${leaked.length}, đổi role sai: ${wrongRole.length}`);

  await db.pool.end();
  process.exit(leaked.length || wrongRole.length ? 1 : 0);
})().catch((error) => { console.error('FAIL:', error.message); process.exit(1); });
