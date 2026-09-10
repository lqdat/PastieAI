#!/usr/bin/env node
/**
 * Script di chuyển / đồng bộ từ điển dịch thuật cho thực đơn hiện có trong database.
 * Bổ sung đầy đủ 4 thứ tiếng (en, ru, zh, ko) cho tất cả các món và nhóm danh mục.
 *
 *   node scripts/migrate-seed-translations.js
 */
const path = require('path');
const db = require(path.join(__dirname, '..', 'database.js'));
const { CATEGORY_TRANSLATIONS, ITEM_TRANSLATIONS } = require('./seed-translations-data');

const SEED_TAG = '[seed-menu]';

async function main() {
  await db.initPromise;
  console.log('=== BẮT ĐẦU ĐỒNG BỘ BẢN DỊCH CHO THỰC ĐƠN ===\n');

  // 1. Đồng bộ bản dịch danh mục
  const catRes = await db.query(`SELECT id, name FROM qr_menu_categories`);
  let updatedCats = 0;
  for (const cat of catRes.rows) {
    const cleanName = cat.name.replace(SEED_TAG, '').trim();
    const trans = CATEGORY_TRANSLATIONS[cleanName];
    if (trans) {
      for (const lang of ['en', 'ru', 'zh', 'ko']) {
        if (trans[lang]) {
          await db.query(
            `INSERT INTO qr_menu_category_translations (category_id, lang, name, is_manual, updated_at)
             VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
             ON CONFLICT (category_id, lang) DO UPDATE
             SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
             WHERE qr_menu_category_translations.is_manual = FALSE`,
            [cat.id, lang, trans[lang]]
          );
        }
      }
      updatedCats++;
    }
  }
  console.log(`Đã đồng bộ bản dịch cho ${updatedCats}/${catRes.rowCount} danh mục.`);

  // 2. Đồng bộ bản dịch món
  const itemRes = await db.query(`SELECT id, name, description FROM qr_menu_items`);
  let updatedItems = 0;
  for (const item of itemRes.rows) {
    const cleanName = item.name.trim();
    const trans = ITEM_TRANSLATIONS[cleanName];
    if (trans) {
      for (const lang of ['en', 'ru', 'zh', 'ko']) {
        const t = trans[lang];
        if (t) {
          await db.query(
            `INSERT INTO qr_menu_item_translations (item_id, lang, name, description, is_manual, updated_at)
             VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
             ON CONFLICT (item_id, lang) DO UPDATE
             SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
             WHERE qr_menu_item_translations.is_manual = FALSE`,
            [item.id, lang, t.name, t.desc || null]
          );
        }
      }
      updatedItems++;
    }
  }
  console.log(`Đã đồng bộ bản dịch cho ${updatedItems}/${itemRes.rowCount} món ăn.`);

  // 3. Thống kê số lượng bản dịch trong DB theo từng ngôn ngữ
  const statsRes = await db.query(`
    SELECT lang, COUNT(*)::int AS count
    FROM qr_menu_item_translations
    GROUP BY lang
    ORDER BY lang
  `);
  console.log('\nThống kê số lượng món có bản dịch theo ngôn ngữ:');
  for (const row of statsRes.rows) {
    console.log(`  - [${row.lang}]: ${row.count} món`);
  }

  const catStatsRes = await db.query(`
    SELECT lang, COUNT(*)::int AS count
    FROM qr_menu_category_translations
    GROUP BY lang
    ORDER BY lang
  `);
  console.log('\nThống kê số lượng danh mục có bản dịch:');
  for (const row of catStatsRes.rows) {
    console.log(`  - [${row.lang}]: ${row.count} danh mục`);
  }

  console.log('\n=== HOÀN TẤT ĐỒNG BỘ BẢN DỊCH ===');
  await db.pool.end();
}

main().catch((err) => {
  console.error('LỖI ĐỒNG BỘ:', err);
  process.exit(1);
});
