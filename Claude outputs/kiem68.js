// KIỂM THỰC ĐƠN BÒ TƠ 68 SAU KHI SINH.
// Không tin vào dòng log của script sinh — đọc thẳng database, và đọc đúng
// những gì KHÁCH nhìn thấy: nhóm ưu đãi đứng đầu, thứ tự món, và tên tiếng Anh
// của quán phải nguyên vẹn chứ không bị máy dịch ghi đè.
const { Client } = require('pg');
const DB = process.env.DATABASE_URL;
let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

(async () => {
  const db = new Client({ connectionString: DB }); await db.connect();
  const agent = (await db.query("SELECT id FROM admins WHERE username='boto68@test.local'")).rows[0];
  check('tìm thấy Agent', Boolean(agent)); if (!agent) { await db.end(); process.exit(1); }

  const nhom = (await db.query(
    'SELECT id, name, sort_order, is_promo FROM qr_menu_categories WHERE agent_id=$1 ORDER BY sort_order, id', [agent.id])).rows;
  check('có đủ 13 nhóm', nhom.length === 13, `đang có ${nhom.length}`);
  check('nhóm đầu tiên là ƯU ĐÃI và tên đúng "Ưu đãi"',
    nhom[0] && nhom[0].is_promo && nhom[0].name === 'Ưu đãi', JSON.stringify(nhom[0]));
  check('chỉ có ĐÚNG MỘT nhóm ưu đãi',
    nhom.filter((n) => n.is_promo).length === 1);
  check('thứ tự nhóm khớp bố cục menu in',
    nhom.map((n) => n.name).join(' | ') ===
    'Ưu đãi | Bò Tơ Nướng Than | Tái | Hấp | Xào | Nhúng | Lẩu | Lai Rai | Cơm Chiên | Mì Xào | Canh | Món Mặn | Xào - Rau',
    nhom.map((n) => n.name).join(' | '));

  const mon = (await db.query(
    `SELECT i.id, i.name, i.price, i.sort_order, c.name AS nhom, c.is_promo
       FROM qr_menu_items i JOIN qr_menu_categories c ON c.id = i.category_id
      WHERE i.agent_id=$1 ORDER BY i.sort_order`, [agent.id])).rows;
  check('có 62 món (63 dòng menu, trừ 1 dòng trùng)', mon.length === 62, `đang có ${mon.length}`);
  check('7 combo / món phải thử nằm trong nhóm ưu đãi',
    mon.filter((m) => m.is_promo).length === 7);
  check('không còn hai món trùng cả tên lẫn giá',
    new Set(mon.map((m) => m.name + '|' + m.price)).size === mon.length,
    'trùng: ' + mon.map((m) => m.name + '|' + m.price).filter((v, i, a) => a.indexOf(v) !== i).join(', '));

  // Vài giá lấy thẳng từ menu in
  const gia = Object.fromEntries(mon.map((m) => [m.name, Number(m.price)]));
  const MUON = {
    'Combo Hải Sản Phú Quốc': 2268000, 'Ba Rọi Bò Nướng Than': 175000,
    'Bò Tơ Nhúng Mẻ': 350000, 'Lẩu Bò Tơ 68': 480000,
    'Cơm Chiên Tỏi': 60000, 'Cải Thảo Xào Nấm': 80000, 'Đậu Hủ Sốt Cà': 60000,
  };
  for (const [ten, g] of Object.entries(MUON)) {
    check(`giá "${ten}" đúng ${g.toLocaleString('vi-VN')}`, gia[ten] === g, `đang là ${gia[ten]}`);
  }

  // Tên tiếng Anh của quán phải KHOÁ, không bị bản máy dịch đè lên
  const en = (await db.query(
    `SELECT t.name, t.is_manual, i.name AS ten_viet
       FROM qr_menu_item_translations t JOIN qr_menu_items i ON i.id=t.item_id
      WHERE i.agent_id=$1 AND t.lang='en'`, [agent.id])).rows;
  check('mọi món đều có tên tiếng Anh', en.length === mon.length, `${en.length}/${mon.length}`);
  check('tên tiếng Anh đều được KHOÁ (is_manual = TRUE)',
    en.every((r) => r.is_manual === true),
    en.filter((r) => !r.is_manual).map((r) => r.ten_viet).slice(0, 5).join(', '));
  check('tên tiếng Anh là bản của quán, KHÔNG phải bản máy dịch',
    en.every((r) => !String(r.name).startsWith('«MAYDICH')),
    en.filter((r) => String(r.name).startsWith('«MAYDICH')).slice(0, 3).map((r) => r.ten_viet).join(', '));
  const mauEn = Object.fromEntries(en.map((r) => [r.ten_viet, r.name]));
  check('khớp đúng chữ trên menu in: "Phu Quoc Sea Flavor Set"',
    mauEn['Combo Hải Sản Phú Quốc'] === 'Phu Quoc Sea Flavor Set', mauEn['Combo Hải Sản Phú Quốc']);
  check('khớp đúng chữ trên menu in: "Bo To 68 Signature Hotpot"',
    mauEn['Lẩu Bò Tơ 68'] === 'Bo To 68 Signature Hotpot', mauEn['Lẩu Bò Tơ 68']);

  // zh/ko/ru thì NGƯỢC LẠI: phải là bản máy, và không khoá, để sửa tay còn đè được
  for (const l of ['zh', 'ko', 'ru']) {
    const r = (await db.query(
      `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE t.name LIKE '«MAYDICH→%')::int AS may,
              COUNT(*) FILTER (WHERE t.is_manual)::int AS khoa
         FROM qr_menu_item_translations t JOIN qr_menu_items i ON i.id=t.item_id
        WHERE i.agent_id=$1 AND t.lang=$2`, [agent.id, l])).rows[0];
    check(`[${l}] mọi món đi qua máy dịch và KHÔNG bị khoá`,
      r.n === mon.length && r.may === mon.length && r.khoa === 0, JSON.stringify(r));
  }

  await db.end();
  console.log('');
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
