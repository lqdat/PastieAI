// SEED MENU PHẢI DỊCH ĐỘNG, KHÔNG TRA BẢNG CỐ ĐỊNH.
//
// Trước đây seed menu chỉ lấy bản dịch từ scripts/seed-translations-data.js —
// một bảng chữ viết sẵn trong mã nguồn. Sửa tên một món mẫu, hay thêm món mới,
// là món đó KHÔNG CÒN bản dịch nào: khách Nga/Trung/Hàn mở thực đơn và bill ra
// thấy nguyên tiếng Việt, mà không có lấy một dòng cảnh báo.
//
// Bài đo dựng đúng hai tình huống:
//   A. Có bộ dịch (TEST_FAKE_TRANSLATE=1, mỗi bản dịch mang dấu «MAYDICH→xx»):
//      bản ghi trong qr_menu_item_translations phải mang dấu đó — tức là đã ĐI
//      QUA máy dịch, không phải chép từ bảng.
//   B. Bộ dịch chết: vẫn phải có bản dịch cho những món bảng cố định có sẵn —
//      lưới đỡ còn nguyên, không vì sửa mà làm hỏng đường cũ.
const { Client } = require('pg');
const crypto = require('crypto');

const DB = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/e2e';
let passed = 0; const failures = [];
const check = (n, c, d) => {
  if (c) { passed++; console.log('  ✓ ' + n); }
  else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); }
};
const bam = (mk) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.pbkdf2Sync(mk, salt, 1000, 64, 'sha512').toString('hex');
};
const EMAIL = 'agent-seed@test.local';

(async () => {
  const db = new Client({ connectionString: DB });
  await db.connect();
  const don = async () => {
    const a = (await db.query('SELECT id FROM admins WHERE username = $1', [EMAIL])).rows[0];
    if (a) {
      await db.query('DELETE FROM qr_menu_items WHERE agent_id = $1', [a.id]).catch(() => {});
      await db.query('DELETE FROM qr_menu_categories WHERE agent_id = $1', [a.id]).catch(() => {});
      await db.query('DELETE FROM admins WHERE id = $1', [a.id]).catch(() => {});
    }
  };
  await don();
  const agentId = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, agent_menu_enabled)
     VALUES ($1,$2,'Quán Seed','agent','qr-concierge',TRUE,TRUE) RETURNING id`,
    [EMAIL, bam('x')])).rows[0].id;

  const { seedMenuForAgent } = require('/home/claude/pdfsrv/menu-seed-service.js');
  const ra = await seedMenuForAgent({ agentIdentifier: EMAIL });
  check('sinh được thực đơn mẫu', ra.itemCount > 0, JSON.stringify(ra.message));

  const dem = await db.query(
    `SELECT t.lang, COUNT(*)::int AS n,
            COUNT(*) FILTER (WHERE t.name LIKE '«MAYDICH→%')::int AS qua_may
       FROM qr_menu_items i JOIN qr_menu_item_translations t ON t.item_id = i.id
      WHERE i.agent_id = $1 GROUP BY t.lang ORDER BY t.lang`, [agentId]);
  const tong = (await db.query('SELECT COUNT(*)::int AS n FROM qr_menu_items WHERE agent_id = $1', [agentId])).rows[0].n;

  const bang = Object.fromEntries(dem.rows.map((r) => [r.lang, r]));
  for (const l of ['en', 'ru', 'zh', 'ko']) {
    check(`[${l}] mọi món đều có bản dịch`,
      bang[l] && bang[l].n === tong, `${bang[l] ? bang[l].n : 0}/${tong} món`);
  }

  const giaLap = process.env.TEST_FAKE_TRANSLATE === '1';
  if (giaLap) {
    for (const l of ['en', 'ru', 'zh', 'ko']) {
      check(`[${l}] bản dịch ĐI QUA máy dịch, không chép từ bảng cố định`,
        bang[l] && bang[l].qua_may === tong,
        `chỉ ${bang[l] ? bang[l].qua_may : 0}/${tong} món mang dấu máy dịch`);
    }
    const cat = await db.query(
      `SELECT COUNT(*) FILTER (WHERE t.name LIKE '«MAYDICH→%')::int AS qua_may, COUNT(*)::int AS n
         FROM qr_menu_categories c JOIN qr_menu_category_translations t ON t.category_id = c.id
        WHERE c.agent_id = $1`, [agentId]);
    check('tên danh mục cũng đi qua máy dịch',
      cat.rows[0].n > 0 && cat.rows[0].qua_may === cat.rows[0].n,
      `${cat.rows[0].qua_may}/${cat.rows[0].n}`);
  } else {
    check('bộ dịch chết thì LƯỚI ĐỠ vẫn cho bản dịch (bảng cố định)',
      bang.en && bang.en.n > 0, 'không có dòng dịch nào');
  }

  await don();
  await db.end();
  console.log('');
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
