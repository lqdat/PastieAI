#!/usr/bin/env node
/**
 * Sinh dữ liệu thực đơn mẫu cho một Agent.
 *
 *   node scripts/seed-menu.js                          # agenttest@tempmail.id.vn
 *   node scripts/seed-menu.js --agent someone@x.vn     # Agent khác
 *   node scripts/seed-menu.js --clean                  # chỉ xoá dữ liệu mẫu
 *   node scripts/seed-menu.js --keep                   # thêm mà không xoá bản cũ
 *
 * BA ĐIỀU KHIẾN SCRIPT NÀY AN TOÀN:
 *
 * 1. Chỉ đụng vào dữ liệu do chính nó tạo. Mỗi món và mỗi danh mục sinh ra đều
 *    mang dấu SEED_TAG trong phần mô tả / tên; lúc dọn chỉ xoá đúng những dòng
 *    mang dấu ấy. Món Agent tự nhập bằng tay không bao giờ bị chạm tới.
 *
 * 2. Chạy lại nhiều lần cho ra cùng một kết quả — dọn trước rồi mới sinh, nên
 *    không bao giờ nhân đôi thành 80, 120 món.
 *
 * 3. Không tự tạo nhóm "Ưu đãi" thứ hai. Database chỉ cho mỗi Agent đúng một
 *    nhóm ưu đãi (idx_menu_one_promo_per_agent); script dùng lại nhóm sẵn có.
 *
 * Dữ liệu cố tình phủ những trường hợp mà giao diện hay vỡ:
 *   - tên món rất dài, có dấu tiếng Việt đầy đủ
 *   - giá từ 5.000 tới 2.500.000 (kiểm cách xuống dòng của cột tiền)
 *   - món không giới hạn tồn (NULL), món sắp hết, món hết sạch
 *   - món hết + ẩn đi, và món hết + vẫn hiện kèm nhãn "Tạm hết"
 *   - món Agent tự tắt (is_available = FALSE)
 *   - món không mô tả, món mô tả dài
 */
const path = require('path');
const db = require(path.join(__dirname, '..', 'database.js'));

const SEED_TAG = '[seed-menu]';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const AGENT_USERNAME = value('agent', 'agenttest@tempmail.id.vn');
const CLEAN_ONLY = flag('clean');
const KEEP_OLD = flag('keep');

// name, price, stock (null = không giới hạn), hideWhenOut, available, description
const GROUPS = [
  {
    name: 'Ưu đãi', promo: true, items: [
      ['Combo hải sản nướng cho hai người ăn thả ga', 590000, 8, true, true, 'Ghẹ, tôm sú, mực một nắng nướng than hoa, kèm rau rừng và bánh tráng.'],
      ['Combo gia đình 4 người — cơm, canh, ba món mặn', 850000, 5, true, true, 'Đủ cơm trắng, canh chua cá, tôm rang, thịt kho và rau luộc.'],
      ['Set ăn sáng Phú Quốc', 120000, null, true, true, 'Bánh canh chả cá hoặc bún quậy, kèm cà phê hoặc trà.'],
      ['Ưu đãi giờ vàng 14h–17h: giảm 30% đồ uống', 0, null, true, true, 'Áp dụng cho toàn bộ nhóm Đồ uống, trừ rượu vang.'],
    ],
  },
  {
    name: 'Hải sản tươi sống', items: [
      ['Ghẹ hấp bia', 350000, 12, true, true, 'Ghẹ xanh size 3 con/kg, hấp bia lá sả.'],
      ['Tôm sú nướng muối ớt', 420000, 6, true, true, null],
      ['Mực một nắng nướng', 380000, 3, true, true, 'Mực câu đêm, phơi một nắng đúng kiểu Phú Quốc.'],
      ['Sò huyết rang me', 260000, 0, false, true, 'Hết trong hôm nay, mai có lại.'],
      ['Cá bớp nướng nguyên con (từ 1,5kg)', 890000, 2, true, true, 'Đặt trước 45 phút.'],
      ['Nhum biển nướng mỡ hành', 320000, 0, true, true, 'Theo mùa.'],
      ['Ốc hương rang muối', 450000, null, true, true, null],
      ['Hàu Thái Bình Dương nướng phô mai (6 con)', 180000, 20, true, true, null],
      ['Cua huỳnh đế hấp — theo giá thị trường trong ngày', 2500000, 1, true, true, 'Cân tại bàn trước khi chế biến.'],
      ['Tôm tít hấp', 520000, null, true, false, 'Tạm ngừng phục vụ.'],
    ],
  },
  {
    name: 'Gỏi & khai vị', items: [
      ['Gỏi cá trích', 100000, null, true, true, 'Đặc sản Phú Quốc, cuốn bánh tráng với dừa nạo và rau rừng.'],
      ['Gỏi xoài khô cá đuối', 95000, 15, true, true, null],
      ['Nộm sứa hoa chuối', 85000, 10, true, true, null],
      ['Chả giò hải sản (6 cuốn)', 90000, null, true, true, null],
      ['Đậu bắp nướng mỡ hành', 55000, null, true, true, null],
      ['Salad rau rừng trộn dầu giấm', 70000, 8, true, true, null],
    ],
  },
  {
    name: 'Món chính', items: [
      ['Cơm chiên hải sản', 130000, null, true, true, null],
      ['Bún quậy Kiên Giang', 65000, null, true, true, 'Tự pha nước chấm tại bàn theo kiểu người địa phương.'],
      ['Bánh canh chả cá', 60000, null, true, true, null],
      ['Lẩu cá bớp măng chua (nồi cho 3–4 người)', 450000, 4, true, true, null],
      ['Canh chua cá lóc', 150000, null, true, true, null],
      ['Thịt kho hột vịt', 120000, null, true, true, null],
      ['Rau muống xào tỏi', 50000, null, true, true, null],
      ['Cơm trắng', 15000, null, true, true, null],
      ['Mì xào giòn hải sản', 140000, 0, false, true, null],
    ],
  },
  {
    name: 'Đồ uống', items: [
      ['Trà đá', 5000, null, true, true, null],
      ['Nước suối Lavie 500ml', 15000, null, true, true, null],
      ['Cà phê sữa đá', 35000, null, true, true, null],
      ['Nước dừa tươi', 40000, 30, true, true, null],
      ['Sinh tố bơ', 55000, 12, true, true, null],
      ['Bia Sài Gòn lon', 25000, null, true, true, null],
      ['Bia Tiger lon', 28000, null, true, true, null],
      ['Rượu sim Phú Quốc (ly)', 60000, 18, true, true, 'Đặc sản địa phương, nồng độ nhẹ.'],
      ['Vang đỏ Đà Lạt (chai)', 320000, 2, true, true, null],
    ],
  },
  {
    name: 'Tráng miệng', items: [
      ['Chè hạt sen long nhãn', 45000, 10, true, true, null],
      ['Kem dừa', 50000, null, true, true, null],
      ['Trái cây theo mùa', 60000, null, true, true, null],
      ['Bánh flan', 30000, 6, true, true, null],
    ],
  },
];

async function main() {
  await db.initPromise;

  const agentRes = await db.query(
    `SELECT id, username, full_name, role, project_id FROM admins WHERE LOWER(username) = LOWER($1)`,
    [AGENT_USERNAME]
  );
  const agent = agentRes.rows[0];
  if (!agent) {
    console.error(`Không tìm thấy tài khoản "${AGENT_USERNAME}".`);
    console.error('Dùng --agent <email> để chỉ định tài khoản khác.');
    process.exit(1);
  }
  if (agent.role !== 'agent') {
    console.error(`Tài khoản "${agent.username}" có vai trò "${agent.role}", không phải agent.`);
    console.error('Thực đơn gắn theo Agent; chọn đúng tài khoản Agent rồi chạy lại.');
    process.exit(1);
  }
  if (!agent.project_id) {
    console.error(`Tài khoản "${agent.username}" chưa thuộc project nào.`);
    process.exit(1);
  }

  console.log(`Agent : ${agent.full_name || agent.username} (id=${agent.id})`);
  console.log(`Project: ${agent.project_id}`);

  // --- Dọn dữ liệu mẫu cũ ---------------------------------------------------
  // Chỉ xoá đúng những dòng mang dấu, không đụng món Agent tự nhập.
  const removedItems = await db.query(
    `DELETE FROM qr_menu_items WHERE agent_id = $1 AND description LIKE $2 RETURNING id`,
    [agent.id, `%${SEED_TAG}`]
  );
  const removedCats = await db.query(
    `DELETE FROM qr_menu_categories
      WHERE agent_id = $1 AND NOT is_promo AND name LIKE $2
        AND NOT EXISTS (SELECT 1 FROM qr_menu_items i WHERE i.category_id = qr_menu_categories.id)
      RETURNING id`,
    [agent.id, `%${SEED_TAG}`]
  );
  if (removedItems.rowCount || removedCats.rowCount) {
    console.log(`Đã dọn: ${removedItems.rowCount} món, ${removedCats.rowCount} danh mục (dữ liệu mẫu cũ).`);
  }
  if (CLEAN_ONLY) {
    console.log('Xong — chỉ dọn, không sinh thêm.');
    await db.pool.end();
    return;
  }
  if (KEEP_OLD && (removedItems.rowCount || removedCats.rowCount)) {
    console.log('(--keep chỉ giữ món Agent tự nhập; dữ liệu mẫu cũ vẫn được thay mới để không nhân đôi.)');
  }

  let itemCount = 0;
  let sortOrder = 0;

  for (const [groupIndex, group] of GROUPS.entries()) {
    let categoryId;

    if (group.promo) {
      // Nhóm ưu đãi là DUY NHẤT cho mỗi Agent, database ép như vậy. Dùng lại
      // nhóm sẵn có; chỉ tạo khi thật sự chưa có.
      const existing = await db.query(
        `SELECT id FROM qr_menu_categories WHERE agent_id = $1 AND is_promo LIMIT 1`,
        [agent.id]
      );
      if (existing.rows[0]) {
        categoryId = existing.rows[0].id;
      } else {
        const created = await db.query(
          `INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order, is_promo)
           VALUES ($1, $2, $3, -1, TRUE) RETURNING id`,
          [agent.id, agent.project_id, group.name]
        );
        categoryId = created.rows[0].id;
      }
    } else {
      const created = await db.query(
        `INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [agent.id, agent.project_id, `${group.name} ${SEED_TAG}`, groupIndex]
      );
      categoryId = created.rows[0].id;
    }

    for (const [name, price, stock, hideWhenOut, available, description] of group.items) {
      // Dấu nằm CUỐI mô tả: đọc trên giao diện vẫn thấy câu mô tả thật trước,
      // mà lúc dọn vẫn tìm ra bằng LIKE.
      const desc = `${description ? description + ' ' : ''}${SEED_TAG}`;
      await db.query(
        `INSERT INTO qr_menu_items
           (category_id, agent_id, project_id, name, description, price, stock_quantity, hide_when_out, is_available, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [categoryId, agent.id, agent.project_id, name, desc, price, stock, hideWhenOut, available, sortOrder++]
      );
      itemCount++;
    }
    console.log(`  ${group.name.padEnd(22)} ${String(group.items.length).padStart(2)} món`);
  }

  // --- Đối chiếu: khách nhìn thấy bao nhiêu món? ------------------------------
  // Đây mới là con số đáng tin, vì nó chạy đúng bộ lọc của cổng khách.
  const visible = await db.query(
    `SELECT COUNT(*)::int AS n FROM qr_menu_items i
      WHERE i.agent_id = $1 AND i.is_available = TRUE
        AND NOT (i.stock_quantity IS NOT NULL AND i.stock_quantity <= 0 AND i.hide_when_out)`,
    [agent.id]
  );
  const soldOutShown = await db.query(
    `SELECT COUNT(*)::int AS n FROM qr_menu_items i
      WHERE i.agent_id = $1 AND i.is_available = TRUE
        AND i.stock_quantity IS NOT NULL AND i.stock_quantity <= 0 AND NOT i.hide_when_out`,
    [agent.id]
  );

  console.log('');
  console.log(`Đã tạo   : ${itemCount} món / ${GROUPS.length} nhóm`);
  console.log(`Khách thấy: ${visible.rows[0].n} món (trong đó ${soldOutShown.rows[0].n} món gắn nhãn "Tạm hết")`);
  console.log(`Bị ẩn     : ${itemCount - visible.rows[0].n} món (Agent tắt, hoặc hết hàng + đặt ẩn)`);
  console.log('');
  console.log(`Dọn sạch : node scripts/seed-menu.js --clean --agent ${agent.username}`);

  await db.pool.end();
}

main().catch((error) => {
  console.error('LỖI:', error.message);
  process.exit(1);
});
