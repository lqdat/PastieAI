// Chạy ĐÚNG các câu truy vấn mà endpoint thực đơn dùng, trên Postgres thật.
//
// Vì sao cần bài này: lỗi "Không tải được danh sách món" là một câu SQL sai —
// ORDER BY c.sort_order trong khi GROUP BY thiếu cột đó. Postgres từ chối cả câu
// lệnh, kể cả khi bảng chưa có dòng nào. Bộ kiểm tra cũ chỉ chạy truy vấn của
// THỰC ĐƠN KHÁCH, không chạy truy vấn của MÀN AGENT, nên lỗi lọt qua.
//
// Bài này lấy câu lệnh thẳng từ server.js, không chép tay — chép tay thì bản
// kiểm tra và bản chạy thật sẽ trôi khỏi nhau.
const fs = require('fs');
const { Pool } = require('pg');

const CONN = process.env.PGCONN || 'postgresql://postgres:pastie@localhost:5432/merged';
const SERVER = process.env.SERVER_JS || require('path').join(__dirname, '..', 'server.js');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? ' — ' + d : '')); } };

// Rút câu SQL nằm giữa hai dấu backtick sau một mốc nhận dạng.
function sqlAfter(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  const start = src.indexOf('`', at);
  const end = src.indexOf('`', start + 1);
  return src.slice(start + 1, end);
}

(async () => {
  const src = fs.readFileSync(SERVER, 'utf8');
  const pool = new Pool({ connectionString: CONN });

  const cases = [
    ["app.get('/api/agent/menu/items'", 'danh sách món của Agent', [1]],
    ["app.get('/api/agent/menu/categories'", 'danh mục của Agent', [1]],
  ];

  for (const [marker, label, params] of cases) {
    const sql = sqlAfter(src, marker);
    if (!sql) { check(label + ' — tìm được câu lệnh trong server.js', false); continue; }
    try {
      await pool.query(sql, params);
      check(label + ' — Postgres chấp nhận câu lệnh', true);
    } catch (error) {
      check(label + ' — Postgres chấp nhận câu lệnh', false, error.message.split('\n')[0]);
    }
  }

  // Thực đơn trống cũng phải chạy được: lỗi vừa rồi xuất hiện ngay từ 0 món.
  const itemsSql = sqlAfter(src, "app.get('/api/agent/menu/items'");
  if (itemsSql) {
    try {
      const r = await pool.query(itemsSql, [999999]);   // agent không có món nào
      check('thực đơn TRỐNG vẫn trả về được (0 dòng)', r.rows.length === 0);
    } catch (error) {
      check('thực đơn TRỐNG vẫn trả về được', false, error.message.split('\n')[0]);
    }
  }

  console.log('\n' + '─'.repeat(56));
  console.log(failures.length ? `HỎNG — ${failures.length} trượt` : `ĐẠT — ${passed}/${passed} phép thử.`);
  await pool.end();
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI:', e.message); process.exit(1); });
