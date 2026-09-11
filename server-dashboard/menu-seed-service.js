// Service sinh dữ liệu thực đơn mẫu (seed menu) cho Agent.
// Dùng chung cho cả script CLI (scripts/seed-menu.js) và API trên Dashboard.

const path = require('path');
const db = require(path.join(__dirname, 'database.js'));
const { CATEGORY_TRANSLATIONS, ITEM_TRANSLATIONS } = require(path.join(__dirname, 'scripts', 'seed-translations-data.js'));

const SEED_TAG = '[seed-menu]';

// Cấu trúc món: [tên món, giá, tồn kho, ẩn khi hết, có sẵn, mô tả, link ảnh]
const SEED_GROUPS = [
  {
    name: 'Ưu đãi', promo: true, items: [
      ['Combo hải sản nướng cho hai người ăn thả ga', 590000, 8, true, true, 'Ghẹ, tôm sú, mực một nắng nướng than hoa, kèm rau rừng và bánh tráng.', 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'],
      ['Combo gia đình 4 người — cơm, canh, ba món mặn', 850000, 5, true, true, 'Đủ cơm trắng, canh chua cá, tôm rang, thịt kho và rau luộc.', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'],
      ['Set ăn sáng Phú Quốc', 120000, null, true, true, 'Bánh canh chả cá hoặc bún quậy, kèm cà phê hoặc trà.', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80'],
      ['Ưu đãi giờ vàng 14h–17h: giảm 30% đồ uống', 0, null, true, true, 'Áp dụng cho toàn bộ nhóm Đồ uống, trừ rượu vang.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80'],
    ],
  },
  {
    name: 'Hải sản tươi sống', items: [
      ['Ghẹ hấp bia', 350000, 12, true, true, 'Ghẹ xanh size 3 con/kg, hấp bia lá sả.', 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80'],
      ['Tôm sú nướng muối ớt', 420000, 6, true, true, 'Tôm sú tươi sống nướng muối ớt cay nồng đậm vị.', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80'],
      ['Mực một nắng nướng', 380000, 3, true, true, 'Mực câu đêm, phơi một nắng đúng kiểu Phú Quốc.', 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=800&q=80'],
      ['Sò huyết rang me', 260000, 0, false, true, 'Hết trong hôm nay, mai có lại.', 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=800&q=80'],
      ['Cá bớp nướng nguyên con (từ 1,5kg)', 890000, 2, true, true, 'Đặt trước 45 phút.', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'],
      ['Nhum biển nướng mỡ hành', 320000, 0, true, true, 'Theo mùa, thơm béo bùi.', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80'],
      ['Ốc hương rang muối', 450000, null, true, true, 'Ốc hương tươi giòn ngọt chấm muối tiêu chanh.', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'],
      ['Hàu Thái Bình Dương nướng phô mai (6 con)', 180000, 20, true, true, 'Hàu sữa béo ngậy nướng phô mai Pháp tan chảy.', 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=800&q=80'],
      ['Cua huỳnh đế hấp — theo giá thị trường trong ngày', 2500000, 1, true, true, 'Cân tại bàn trước khi chế biến.', 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'],
      ['Tôm tít hấp', 520000, null, true, false, 'Tạm ngừng phục vụ.', 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80'],
    ],
  },
  {
    name: 'Gỏi & khai vị', items: [
      ['Gỏi cá trích', 100000, null, true, true, 'Đặc sản Phú Quốc, cuốn bánh tráng với dừa nạo và rau rừng.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'],
      ['Gỏi xoài khô cá đuối', 95000, 15, true, true, 'Khô cá đuối nướng xé sợi trộn xoài chua giòn.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'],
      ['Nộm sứa hoa chuối', 85000, 10, true, true, 'Sứa biển giòn sần sật trộn hoa chuối thơm ngon.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'],
      ['Chả giò hải sản (6 cuốn)', 90000, null, true, true, 'Vỏ giòn rụm, nhân tôm cua đầy đặn.', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'],
      ['Đậu bắp nướng mỡ hành', 55000, null, true, true, 'Đậu bắp tươi nướng kèm mỡ hành béo ngậy.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'],
      ['Salad rau rừng trộn dầu giấm', 70000, 8, true, true, 'Rau rừng đảo ngọc trộn sốt dầu giấm thanh mát.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'],
    ],
  },
  {
    name: 'Món chính', items: [
      ['Cơm chiên hải sản', 130000, null, true, true, 'Hạt cơm vàng óng kèm tôm mực tươi ngon.', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'],
      ['Bún quậy Kiên Giang', 65000, null, true, true, 'Tự pha nước chấm tại bàn theo kiểu người địa phương.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80'],
      ['Bánh canh chả cá', 60000, null, true, true, 'Nước dùng hầm xương ngọt thanh, chả cá dai ngon.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80'],
      ['Lẩu cá bớp măng chua (nồi cho 3–4 người)', 450000, 4, true, true, 'Cá bớp tươi ngọt nước lẩu chua cay vừa miệng.', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'],
      ['Canh chua cá lóc', 150000, null, true, true, 'Hương vị miền Tây đậm đà chua cay ngọt.', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'],
      ['Thịt kho hột vịt', 120000, null, true, true, 'Thịt ba rọi kho nước dừa mềm tan, trứng béo bùi.', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'],
      ['Rau muống xào tỏi', 50000, null, true, true, 'Rau muống non giòn xanh mướt dậy mùi tỏi phi.', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'],
      ['Cơm trắng', 15000, null, true, true, 'Gạo thơm ST25 dẻo ngọt.', 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=800&q=80'],
      ['Mì xào giòn hải sản', 140000, 0, false, true, 'Mì giòn rụm quyện nước sốt hải sản sánh mịn.', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80'],
    ],
  },
  {
    name: 'Đồ uống', items: [
      ['Trà đá', 5000, null, true, true, 'Trà xanh lài ướp lạnh giải nhiệt.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80'],
      ['Nước suối Lavie 500ml', 15000, null, true, true, 'Khoáng thiên nhiên đóng chai mát lạnh.', 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=800&q=80'],
      ['Cà phê sữa đá', 35000, null, true, true, 'Cà phê Robusta pha phin truyền thống thơm nồng.', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80'],
      ['Nước dừa tươi', 40000, 30, true, true, 'Dừa xiên ngọt mát nguyên trái.', 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=800&q=80'],
      ['Sinh tố bơ', 55000, 12, true, true, 'Bơ sáp Đắk Lắk xay nhuyễn béo ngậy.', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80'],
      ['Bia Sài Gòn lon', 25000, null, true, true, 'Bia Sài Gòn Special ướp lạnh.', 'https://images.unsplash.com/photo-1608270119332-9b09a47a16f2?auto=format&fit=crop&w=800&q=80'],
      ['Bia Tiger lon', 28000, null, true, true, 'Bia Tiger bạc sảng khoái.', 'https://images.unsplash.com/photo-1608270119332-9b09a47a16f2?auto=format&fit=crop&w=800&q=80'],
      ['Rượu sim Phú Quốc (ly)', 60000, 18, true, true, 'Đặc sản địa phương, nồng độ nhẹ.', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'],
      ['Vang đỏ Đà Lạt (chai)', 320000, 2, true, true, 'Vang nho thơm nồng chát nhẹ.', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'],
    ],
  },
  {
    name: 'Tráng miệng', items: [
      ['Chè hạt sen long nhãn', 45000, 10, true, true, 'Hạt sen bùi bùi, long nhãn giòn ngọt thanh tao.', 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=800&q=80'],
      ['Kem dừa', 50000, null, true, true, 'Kem dừa béo mịn rắc đậu phộng rang giòn.', 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80'],
      ['Trái cây theo mùa', 60000, null, true, true, 'Đĩa trái cây tươi bốn mùa: dưa hấu, ổi, xoài, mận.', 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80'],
      ['Bánh flan', 30000, 6, true, true, 'Bánh mềm mịn thơm trứng sữa kèm cà phê đen.', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80'],
    ],
  },
];

const SEED_CATEGORY_NAMES = SEED_GROUPS.map((g) => g.name);

/**
 * Tìm kiếm Agent theo email hoặc ID
 */
async function findAgentAccount(identifier) {
  await db.initPromise;
  let querySql = `SELECT id, username, full_name, role, project_id FROM admins WHERE LOWER(username) = LOWER($1)`;
  let params = [String(identifier || '').trim()];

  if (/^\d+$/.test(String(identifier || '').trim())) {
    querySql = `SELECT id, username, full_name, role, project_id FROM admins WHERE id = $1`;
    params = [Number(identifier)];
  }

  const res = await db.query(querySql, params);
  return res.rows[0] || null;
}

/**
 * Lấy danh sách các tài khoản Agent hiện có
 */
async function listAvailableAgents() {
  await db.initPromise;
  const res = await db.query(
    `SELECT id, username, full_name, project_id FROM admins WHERE role = 'agent' ORDER BY id ASC`
  );
  return res.rows;
}

/**
 * Dọn sạch dữ liệu menu mẫu cũ của Agent
 */
async function cleanSeedMenuForAgent(agentId) {
  await db.initPromise;
  // 1. Xoá các món seed
  const seedItemNames = SEED_GROUPS.flatMap(g => g.items.map(i => i[0]));
  const removedItems = await db.query(
    `DELETE FROM qr_menu_items 
     WHERE agent_id = $1 AND (description LIKE '%[seed-menu]%' OR name = ANY($2))
     RETURNING id`,
    [agentId, seedItemNames]
  );

  // 2. Xoá các danh mục seed cũ (cả danh mục có chữ [seed-menu] lẫn danh mục mẫu không còn món nào)
  const removedCats = await db.query(
    `DELETE FROM qr_menu_categories
     WHERE agent_id = $1 AND NOT is_promo 
       AND (name LIKE '%[seed-menu]%' OR (name = ANY($2) AND NOT EXISTS (SELECT 1 FROM qr_menu_items i WHERE i.category_id = qr_menu_categories.id)))
     RETURNING id`,
    [agentId, SEED_CATEGORY_NAMES]
  );

  return {
    removedItemsCount: removedItems.rowCount || 0,
    removedCatsCount: removedCats.rowCount || 0,
  };
}

/**
 * Sinh thực đơn mẫu cho Agent:
 * - Có hình ảnh phù hợp cho từng món
 * - Bỏ chữ seed trong tên danh mục
 * - Đầy đủ 4 thứ tiếng (Anh, Nga, Trung, Hàn)
 */
async function seedMenuForAgent({ agentIdentifier, cleanOnly = false, keepOld = false }) {
  await db.initPromise;

  const agent = await findAgentAccount(agentIdentifier);
  if (!agent) {
    const available = await listAvailableAgents();
    const listStr = available.map(a => `  - ID ${a.id}: ${a.username} (${a.full_name || 'Không tên'}) - Project: ${a.project_id}`).join('\n');
    throw new Error(`Không tìm thấy tài khoản Agent "${agentIdentifier}".\nCác tài khoản Agent hiện có:\n${listStr || '  (Chưa có Agent nào trong hệ thống)'}`);
  }

  if (agent.role !== 'agent') {
    throw new Error(`Tài khoản "${agent.username}" có vai trò "${agent.role}", không phải "agent". Thực đơn gắn theo Agent.`);
  }
  if (!agent.project_id) {
    throw new Error(`Tài khoản "${agent.username}" chưa được gán vào dự án nào.`);
  }

  // Dọn dữ liệu mẫu cũ trước để không bị trùng lặp
  const cleanResult = await cleanSeedMenuForAgent(agent.id);

  if (cleanOnly) {
    return {
      agent,
      cleaned: cleanResult,
      itemCount: 0,
      categoryCount: 0,
      message: `Đã dọn sạch ${cleanResult.removedItemsCount} món và ${cleanResult.removedCatsCount} danh mục mẫu cũ của Agent ${agent.username}.`
    };
  }

  let itemCount = 0;
  let sortOrder = 0;

  for (const [groupIndex, group] of SEED_GROUPS.entries()) {
    let categoryId;

    if (group.promo) {
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
          [agent.id, agent.project_id, group.name] // Tên sạch, không có [seed-menu]
        );
        categoryId = created.rows[0].id;
      }
    } else {
      // TÌM LẠI DANH MỤC TRÙNG TÊN NẾU CÓ, HOẶC TẠO MỚI SẠCH HOÀN TOÀN
      const existingCat = await db.query(
        `SELECT id FROM qr_menu_categories WHERE agent_id = $1 AND name = $2 LIMIT 1`,
        [agent.id, group.name]
      );
      if (existingCat.rows[0]) {
        categoryId = existingCat.rows[0].id;
      } else {
        const created = await db.query(
          `INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [agent.id, agent.project_id, group.name, groupIndex] // BỎ CHỮ SEED: Lưu trực tiếp group.name
        );
        categoryId = created.rows[0].id;
      }
    }

    // Ghi bản dịch danh mục (en, ru, zh, ko)
    const catTrans = CATEGORY_TRANSLATIONS[group.name];
    if (catTrans) {
      for (const lang of ['en', 'ru', 'zh', 'ko']) {
        if (catTrans[lang]) {
          await db.query(
            `INSERT INTO qr_menu_category_translations (category_id, lang, name, is_manual, updated_at)
             VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
             ON CONFLICT (category_id, lang) DO UPDATE
             SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
             WHERE qr_menu_category_translations.is_manual = FALSE`,
            [categoryId, lang, catTrans[lang]]
          );
        }
      }
    }

    // Insert từng món ăn kèm image_url
    for (const [name, price, stock, hideWhenOut, available, description, imageUrl] of group.items) {
      const desc = description || null;
      const itemRes = await db.query(
        `INSERT INTO qr_menu_items
           (category_id, agent_id, project_id, name, description, price, stock_quantity, hide_when_out, is_available, sort_order, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [categoryId, agent.id, agent.project_id, name, desc, price, stock, hideWhenOut, available, sortOrder++, imageUrl || null]
      );
      const itemId = itemRes.rows[0].id;
      itemCount++;

      // Ghi bản dịch món vào qr_menu_item_translations (en, ru, zh, ko)
      const itemTrans = ITEM_TRANSLATIONS[name];
      if (itemTrans) {
        for (const lang of ['en', 'ru', 'zh', 'ko']) {
          const t = itemTrans[lang];
          if (t) {
            await db.query(
              `INSERT INTO qr_menu_item_translations (item_id, lang, name, description, is_manual, updated_at)
               VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
               ON CONFLICT (item_id, lang) DO UPDATE
               SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
               WHERE qr_menu_item_translations.is_manual = FALSE`,
              [itemId, lang, t.name, t.desc || null]
            );
          }
        }
      }
    }
  }

  return {
    agent,
    cleaned: cleanResult,
    itemCount,
    categoryCount: SEED_GROUPS.length,
    message: `Đã sinh thành công ${itemCount} món cho ${SEED_GROUPS.length} danh mục (kèm hình ảnh món ăn & 4 ngôn ngữ) cho Agent "${agent.full_name || agent.username}".`
  };
}

module.exports = {
  SEED_TAG,
  SEED_GROUPS,
  SEED_CATEGORY_NAMES,
  findAgentAccount,
  listAvailableAgents,
  cleanSeedMenuForAgent,
  seedMenuForAgent,
};
