// Kiểm tra tầng dữ liệu của thực đơn trên Postgres THẬT.
//
// Chỉ kiểm những khẳng định thực sự có thể sai và tốn kém nếu sai:
//   - migration chạy lại nhiều lần không hỏng
//   - mỗi Agent đúng một nhóm Ưu đãi
//   - tồn kho không xuống âm được
//   - HAI đơn cùng lúc không cùng lấy được phần cuối cùng  ← quan trọng nhất
//   - thực đơn khách không bao giờ lộ số tồn, và lọc/sắp đúng
const { Pool } = require('pg');
const path = require('path');

const CONN = process.env.PGCONN || 'postgresql://postgres:pastie@localhost:5432/menutest';
const DB_FILE = require('path').join(__dirname, '..', 'database.js');

let passed = 0;
const failures = [];
const check = (name, cond, detail) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failures.push(name); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
};

(async () => {
  process.env.DATABASE_URL = CONN;
  const db = require(DB_FILE);
  await db.initPromise;

  console.log('\n1. Migration chạy lại nhiều lần');
  let idempotent = true;
  for (let i = 0; i < 2; i++) {
    try { await db.initializeDatabase(); } catch (e) { idempotent = false; console.log('    lỗi lần ' + (i + 2) + ': ' + e.message); }
  }
  check('chạy 3 lần không lỗi', idempotent);

  const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'qr_menu_items'`);
  const names = cols.rows.map((r) => r.column_name);
  check('qr_menu_items có stock_quantity', names.includes('stock_quantity'));
  check('qr_menu_items có hide_when_out', names.includes('hide_when_out'));
  const catCols = (await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'qr_menu_categories'`)).rows.map((r) => r.column_name);
  check('qr_menu_categories có is_promo', catCols.includes('is_promo'));
  const adminCols = (await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'admins'`)).rows.map((r) => r.column_name);
  check('admins có allow_room_charge', adminCols.includes('allow_room_charge'));
  const orderCols = (await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'chat_orders'`)).rows.map((r) => r.column_name);
  check('chat_orders có payment_selected_at', orderCols.includes('payment_selected_at'));
  check('chat_orders có notes_updated_by_admin_id', orderCols.includes('notes_updated_by_admin_id'));

  // --- Dựng dữ liệu mẫu ------------------------------------------------------
  await db.query(`INSERT INTO projects (id, name, project_type) VALUES ('qr1','QR Test','qr_concierge') ON CONFLICT (id) DO NOTHING`);
  const agent = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id)
     VALUES ('agent-test@x.com','h','Agent Test','agent','qr1')
     ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`
  )).rows[0];

  console.log('\n2. Nhóm Ưu đãi — đúng một cho mỗi Agent');
  await db.query(`INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order, is_promo)
                  VALUES ($1,'qr1','Ưu đãi',-1,TRUE) ON CONFLICT DO NOTHING`, [agent.id]);
  let secondPromoRejected = false;
  try {
    await db.query(`INSERT INTO qr_menu_categories (agent_id, project_id, name, is_promo)
                    VALUES ($1,'qr1','Ưu đãi 2',TRUE)`, [agent.id]);
  } catch (e) { secondPromoRejected = /duplicate key|unique/i.test(e.message); }
  check('nhóm ưu đãi thứ hai bị chặn ở tầng database', secondPromoRejected);
  const normalOk = await db.query(`INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order)
                                   VALUES ($1,'qr1','Hải sản',1) RETURNING id`, [agent.id]);
  check('nhóm thường vẫn thêm được bình thường', !!normalOk.rows[0]);

  const promoId = (await db.query(`SELECT id FROM qr_menu_categories WHERE agent_id=$1 AND is_promo`, [agent.id])).rows[0].id;
  const seafoodId = normalOk.rows[0].id;

  console.log('\n3. Tồn kho không xuống âm');
  const limited = (await db.query(
    `INSERT INTO qr_menu_items (category_id, agent_id, project_id, name, price, stock_quantity)
     VALUES ($1,$2,'qr1','Ghẹ hấp',350000,3) RETURNING id`, [seafoodId, agent.id])).rows[0];
  let negativeRejected = false;
  try { await db.query(`UPDATE qr_menu_items SET stock_quantity = -1 WHERE id = $1`, [limited.id]); }
  catch (e) { negativeRejected = /constraint|check/i.test(e.message); }
  check('không đặt được tồn kho âm', negativeRejected);

  console.log('\n4. Hai đơn cùng lúc tranh phần cuối cùng');
  // Còn 3 phần. Hai giao dịch song song, mỗi bên xin 2 phần. Đúng một bên được.
  await db.query(`UPDATE qr_menu_items SET stock_quantity = 3 WHERE id = $1`, [limited.id]);
  const a = await db.pool.connect();
  const b = await db.pool.connect();
  const TAKE = `UPDATE qr_menu_items SET stock_quantity = stock_quantity - $2
                 WHERE id = $1 AND (stock_quantity IS NULL OR stock_quantity >= $2) RETURNING stock_quantity`;
  await a.query('BEGIN'); await b.query('BEGIN');
  const ra = await a.query(TAKE, [limited.id, 2]);
  // b sẽ bị KHOÁ tại đây cho tới khi a xong — đó chính là điều ta muốn.
  const pendingB = b.query(TAKE, [limited.id, 2]);
  await a.query('COMMIT');
  const rb = await pendingB;
  await b.query('COMMIT');
  a.release(); b.release();
  check('đơn thứ nhất lấy được hàng', ra.rowCount === 1, `rowCount=${ra.rowCount}`);
  check('đơn thứ hai KHÔNG lấy được (chỉ còn 1 phần)', rb.rowCount === 0, `rowCount=${rb.rowCount}`);
  const left = (await db.query(`SELECT stock_quantity FROM qr_menu_items WHERE id=$1`, [limited.id])).rows[0];
  check('tồn còn đúng 1, không bị trừ hai lần', Number(left.stock_quantity) === 1, `còn ${left.stock_quantity}`);

  console.log('\n5. Món không giới hạn thì trừ mãi vẫn không giới hạn');
  const unlimited = (await db.query(
    `INSERT INTO qr_menu_items (category_id, agent_id, project_id, name, price, stock_quantity)
     VALUES ($1,$2,'qr1','Trà đá',5000,NULL) RETURNING id`, [seafoodId, agent.id])).rows[0];
  const r1 = await db.query(TAKE, [unlimited.id, 99]);
  const after = (await db.query(`SELECT stock_quantity FROM qr_menu_items WHERE id=$1`, [unlimited.id])).rows[0];
  check('vẫn lấy được hàng', r1.rowCount === 1);
  check('tồn vẫn là NULL (không giới hạn)', after.stock_quantity === null, String(after.stock_quantity));

  console.log('\n6. Thực đơn khách — lọc, sắp xếp, và giấu số tồn');
  const promoItem = (await db.query(
    `INSERT INTO qr_menu_items (category_id, agent_id, project_id, name, price, sort_order)
     VALUES ($1,$2,'qr1','Combo ưu đãi',99000,0) RETURNING id`, [promoId, agent.id])).rows[0];
  const hidden = (await db.query(
    `INSERT INTO qr_menu_items (category_id, agent_id, project_id, name, price, stock_quantity, hide_when_out)
     VALUES ($1,$2,'qr1','Món hết ẩn',10000,0,TRUE) RETURNING id`, [seafoodId, agent.id])).rows[0];
  const shownOut = (await db.query(
    `INSERT INTO qr_menu_items (category_id, agent_id, project_id, name, price, stock_quantity, hide_when_out)
     VALUES ($1,$2,'qr1','Món hết vẫn hiện',10000,0,FALSE) RETURNING id`, [seafoodId, agent.id])).rows[0];
  await db.query(`INSERT INTO qr_menu_items (category_id, agent_id, project_id, name, price, is_available)
                  VALUES ($1,$2,'qr1','Món Agent tắt',10000,FALSE)`, [seafoodId, agent.id]);

  // Đúng câu truy vấn mà endpoint dùng.
  const menu = await db.query(
    `SELECT i.id, i.category_id, i.price,
            (i.stock_quantity IS NOT NULL AND i.stock_quantity <= 0) AS sold_out,
            COALESCE(c.is_promo, FALSE) AS is_promo,
            COALESCE(NULLIF(t.name, ''), i.name) AS name
       FROM qr_menu_items i
       LEFT JOIN qr_menu_categories c ON c.id = i.category_id
       LEFT JOIN qr_menu_item_translations t ON t.item_id = i.id AND t.lang = $2
      WHERE i.agent_id = $1
        AND i.is_available = TRUE
        AND NOT (i.stock_quantity IS NOT NULL AND i.stock_quantity <= 0 AND i.hide_when_out)
      ORDER BY COALESCE(c.is_promo, FALSE) DESC, c.sort_order NULLS LAST, i.sort_order, i.id`,
    [agent.id, 'en']
  );
  const shown = menu.rows.map((r) => r.name);
  check('món Agent tự tắt không hiện', !shown.includes('Món Agent tắt'));
  check('món hết + hide_when_out không hiện', !shown.includes('Món hết ẩn'));
  check('món hết + vẫn hiện thì có mặt', shown.includes('Món hết vẫn hiện'));
  check('món hết đó được gắn cờ sold_out',
    menu.rows.find((r) => r.name === 'Món hết vẫn hiện')?.sold_out === true);
  check('món ưu đãi đứng đầu danh sách', shown[0] === 'Combo ưu đãi', shown.join(' | '));
  check('KHÔNG có trường nào lộ số tồn',
    !menu.rows.some((r) => Object.keys(r).some((k) => /stock/i.test(k))), Object.keys(menu.rows[0] || {}).join(','));

  console.log('\n7. Cờ cộng vào tiền phòng');
  const off = (await db.query(`SELECT allow_room_charge FROM admins WHERE id=$1`, [agent.id])).rows[0];
  check('mặc định TẮT — nhà hàng lẻ không cộng tiền phòng được', off.allow_room_charge === false);
  await db.query(`UPDATE admins SET allow_room_charge = TRUE WHERE id=$1`, [agent.id]);
  const on = (await db.query(`SELECT allow_room_charge FROM admins WHERE id=$1`, [agent.id])).rows[0];
  check('superadmin bật được', on.allow_room_charge === true);

  console.log('\n' + '─'.repeat(58));
  console.log(failures.length === 0
    ? `ĐẠT — ${passed}/${passed} phép thử trên Postgres thật.`
    : `HỎNG — ${passed} đạt, ${failures.length} trượt:\n  - ${failures.join('\n  - ')}`);
  await db.pool.end();
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI:', e); process.exit(1); });
