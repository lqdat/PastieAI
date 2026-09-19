#!/usr/bin/env node
/**
 * SCRIPT IMPORT THỰC ĐƠN BÒ TƠ 68 TỪ FILE PDF (106 MÓN ĐẦY ĐỦ)
 * File nguồn: "Menu Bò Tơ 68 _ TV  TA_Done..pdf"
 *
 * Yêu cầu nghiệp vụ:
 * 1. Lấy tên món ăn và giá từ file PDF.
 * 2. Tất cả Combo (và món Signature/phải thử trên trang 3) được thêm vào nhóm "Ưu đãi" (is_promo = TRUE).
 * 3. Các món còn lại tạo nhóm danh mục tương ứng theo menu.
 * 4. Không cần lấy hình ảnh (image_url = null).
 * 5. Tên tiếng Anh có sẵn trong PDF được tự động lưu vào bảng bản dịch (qr_menu_item_translations, lang='en').
 *
 * Cách dùng:
 *   node scripts/import-boto68-menu.js                                 # Chọn Agent từ danh sách hoặc nhập email
 *   node scripts/import-boto68-menu.js boto68@tempmail.id.vn          # Nhập email trực tiếp
 *   node scripts/import-boto68-menu.js --agent boto68@tempmail.id.vn  # Dùng cờ --agent
 *   node scripts/import-boto68-menu.js --agent 96                     # Dùng ID Agent
 *   node scripts/import-boto68-menu.js --agent <email> --clean        # Dọn sạch menu đã import
 *   node scripts/import-boto68-menu.js --agent <email> --giu-trung    # Giữ cả 2 dòng "Rau Muống Xào Tỏi" (món 38 và 60)
 */

const readline = require('readline');
const path = require('path');
const db = require(path.join(__dirname, '..', 'database.js'));
const gemini = require(path.join(__dirname, '..', 'gemini-helper.js'));
const NGON_NGU_QUOC_TE = ['en', 'zh', 'ko', 'ru', 'kk']; // Cùng với tiếng Việt (vi) là đủ 6 ngôn ngữ
const NGON_NGU_DICH_AI = ['zh', 'ko', 'ru', 'kk'];
const TEN_RIENG = ['Bò Tơ 68', 'Phú Quốc', 'Kiên Giang', 'Hàm Ninh', 'BBQ', 'Bò Úc'];

// Bản dịch danh mục cố định chuẩn cho 5 ngôn ngữ quốc tế (en, zh, ko, ru, kk)
const BAN_DICH_NHOM_SAN = {
  'Ưu đãi': { en: 'Special Offers & Combos', zh: '特惠与套餐', ko: '특별 혜택 & 콤보', ru: 'Спецпредложения и комбо', kk: 'Арнайы ұсыныстар мен комбо' },
  'Bò Tơ Nướng Than': { en: 'Charcoal-Grilled Veal', zh: '炭烤小牛肉', ko: '숯불 송아지 구이', ru: 'Телятина на углях', kk: 'Көмірдегі бұзау еті' },
  'Tái': { en: 'Rare / Cured Beef', zh: '凉拌牛肉', ko: '레어 / 큐어드 비프', ru: 'Тонко нарезанная говядина', kk: 'Жұқа туралған сиыр еті' },
  'Hấp': { en: 'Steamed Dishes', zh: '清蒸菜品', ko: '찜 요리', ru: 'Блюда на пару', kk: 'Буда пісірілген тағамдар' },
  'Xào': { en: 'Stir-Fried Dishes', zh: '小炒类', ko: '볶음 요리', ru: 'Блюда вок / жареные', kk: 'Қуырылған тағамдар' },
  'Nhúng': { en: 'Dipping Hotpot', zh: '涮牛肉', ko: '샤브샤브 비프', ru: 'Мясо для макания в бульон', kk: 'Сорпаға батырылатын ет' },
  'Lẩu': { en: 'Hotpot', zh: '火锅', ko: '전골 / 핫팟', ru: 'Горячий котел (Хот-пот)', kk: 'Ыстық қазан (Хот-пот)' },
  'Lai Rai': { en: 'Light Bites & Snacks', zh: '下酒小菜', ko: '안주 & 스낵', ru: 'Закуски к напиткам', kk: 'Сусындарға арналған жеңіл тағамдар' },
  'Cơm Chiên': { en: 'Fried Rice', zh: '炒饭', ko: '볶음밥', ru: 'Жареный рис', kk: 'Қуырылған күріш' },
  'Mì Xào': { en: 'Stir-Fried Noodles', zh: '炒面', ko: '볶음면', ru: 'Жареная лапша', kk: 'Қуырылған кеспе' },
  'Canh': { en: 'Traditional Soups', zh: '家常靓汤', ko: '전통 국 / 탕', ru: 'Супы', kk: 'Сорпалар' },
  'Món Mặn': { en: 'Main Savory Dishes', zh: '下饭荤菜', ko: '메인 반찬 요리', ru: 'Основные мясные блюда', kk: 'Негізгі ет тағамдары' },
  'Xào - Rau': { en: 'Stir-Fried Vegetables', zh: '时蔬炒菜', ko: '채소 볶음', ru: 'Овощи вок', kk: 'Қуырылған көкөністер' },
  'Vị Biển - Phú Quốc': { en: 'Phu Quoc Seafood Specialties', zh: '富国岛风味海鲜', ko: '푸꾸옥 해산물 특선', ru: 'Морепродукты Фукуока', kk: 'Фукуок теңіз өнімдері' },
  'Western Favorites': { en: 'Western Favorites', zh: '西式精选', ko: '서양식 인기 메뉴', ru: 'Европейская кухня', kk: 'Еуропалық тағамдар' },
  'Mì Ý (Pasta)': { en: 'Pasta', zh: '意面', ko: '파스타', ru: 'Паста', kk: 'Паста' },
  'Pizza': { en: 'Pizza', zh: '披萨', ko: '피자', ru: 'Пицца', kk: 'Пицца' },
};

// ── BẢNG DỮ LIỆU ĐẦY ĐỦ 106 MÓN BÒ TƠ 68 TRÍCH XUẤT TỪ FILE PDF ───────────────
// Cấu trúc: [số món, tên tiếng Việt, tên tiếng Anh, giá menu (VNĐ), mô tả ngắn, ghi chú]
const DANH_MUC_MENU = [
  {
    ten: 'Ưu đãi',
    isPromo: true,
    mon: [
      [1, 'Combo Xiên Truyền Thống', 'Traditional Skewer Set', 568000, 'Dễ gọi, phù hợp 2-3 khách.'],
      [2, 'Combo Nướng Quốc Dân', 'BBQ Beef Popular Set', 668000, 'Đậm vị, bán chạy.'],
      [3, 'Combo Hải Sản Phú Quốc', 'Phu Quoc Sea Flavor Set', 2268000, 'Trọn vị Phú Quốc.'],
      [4, 'Bò Tơ Hấp Cuốn Rau Rừng', 'Steamed Young Beef Rolls with Wild Forest Herbs', 185000, 'Món phải thử, cuốn bánh tráng kèm rau rừng Tây Ninh.'],
      [5, 'Bò Tơ Xông Hơi', 'Signature Steamed Young Beef', 250000, 'Món đặc trưng của Bò Tơ 68.'],
      [6, 'Bò Hoả Diệm Sơn', 'Flame-Grilled Volcano Beef', 420000, 'Bò nướng núi lửa bùng vị thơm ngon.'],
      [7, 'Lẩu Bò Phô Mai Kéo Sợi', 'Stretchy Cheese Beef Hotpot', 480000, 'Lẩu bò phô mai béo ngậy đặc biệt.'],
      [64, 'Combo Vị Biển 01', 'Phu Quoc Sea Flavor Combo 01', 868000, 'Dễ gọi: 1 Ghẹ Xanh, 180gr Ốc Hương, 200gr Tôm, 200gr Mực.'],
      [65, 'Combo Vị Biển 02', 'Phu Quoc Sea Flavor Combo 02', 1268000, 'Đủ vị: 250gr Ốc Hương, 2 Ghẹ Xanh, 250gr Tôm, 250gr Mực.'],
      [66, 'Combo Vị Biển 03', 'Phu Quoc Sea Flavor Combo 03 (Đại Tiệc Tôm Hùm)', 2268000, 'Đại tiệc: 700gr Tôm Hùm, 250gr Ốc Hương, 2 Ghẹ Xanh, 250gr Tôm, 250gr Mực.'],
    ],
  },
  {
    ten: 'Bò Tơ Nướng Than',
    isPromo: false,
    mon: [
      [8, 'Ba Rọi Bò Nướng Than', 'Charcoal-Grilled Veal Belly', 175000, 'Ba rọi bò tơ mềm béo nướng than hoa.'],
      [9, 'Bắp Bò Lụi Sả Nướng', 'Charcoal-Grilled Beef Shank with Lemongrass', 185000, 'Bắp bò cuộn sả nướng dậy mùi thơm.'],
      [10, 'Sườn Bò Cọng Nướng', 'Charcoal-Grilled Beef Ribs', 245000, 'Sườn bò cọng ướp đậm đà nướng than.'],
      [11, 'Bò Cuộn Nấm Phô Mai', 'Charcoal-Grilled Beef Rolls with Mushroom & Cheese', 245000, 'Bò cuộn nấm kim châm và phô mai béo ngậy.'],
      [12, 'Bò Xiên Sốt BBQ Nướng Than', 'Charcoal-Grilled BBQ Beef Skewers', 195000, 'Xiên bò sốt BBQ nướng than hoa.'],
      [13, 'Bò Xiên Tứ Sắc Nướng Than', 'Four-Colour Beef Skewers', 195000, 'Xiên bò ngũ sắc rau củ nướng.'],
      [14, 'Bò Lá Lốt Nướng Than', 'Charcoal-Grilled Beef in Betel Leaves', 205000, 'Bò cuốn lá lốt truyền thống thơm nức.'],
      [15, 'Thăn Ngoại Bò Nướng', 'Charcoal-Grilled Beef Striploin', 210000, 'Thăn ngoại bò tơ nướng mọng nước.'],
      [16, 'Thăn Nội Bò Nướng Than', 'Charcoal-Grilled Beef Tenderloin', 250000, 'Thăn nội hảo hạng nướng than.'],
      [17, 'Lòng Bò Ướp Nướng Than', 'Marinated Grilled Beef Intestine', 195000, 'Lòng bò làm sạch ướp nướng than cay giòn.'],
      [18, 'Mực Xiên Nướng Than', 'Charcoal-Grilled Squid Skewers', 210000, 'Mực tươi Phú Quốc xiên que nướng muối ớt.'],
      [19, 'Tôm Xiên Nướng Than', 'Charcoal-Grilled Shrimp Skewers', 195000, 'Tôm sú tươi xiên que nướng than hoa.'],
    ],
  },
  {
    ten: 'Tái',
    isPromo: false,
    mon: [
      [20, 'Bò Tơ Tái Chanh', 'Rare Young Beef in Lime Dressing', 185000, 'Bò tơ tươi bóp chanh thanh mát, hành phi, đậu phộng.'],
      [21, 'Bò Tơ Bóp Thấu', 'Beef with Herbs & Vegetables Salad', 185000, 'Bò tơ trộn thấu rau củ quả ghém chua ngọt.'],
    ],
  },
  {
    ten: 'Hấp',
    isPromo: false,
    mon: [
      [22, 'Bò Tơ Hấp Hành Gừng', 'Steamed Veal with Ginger & Onion', 185000, 'Bò tơ ngọt thịt hấp hành lá và gừng tươi.'],
      [23, 'Bò Tơ Hấp Tía Tô', 'Steamed Young Beef with Perilla Leaves', 185000, 'Bò tơ hấp lá tía tô thơm ấm bụng.'],
      [24, 'Lòng Đen Bò Hấp Hành Gừng', 'Steamed Beef Intestine with Ginger & Onion', 165000, 'Lòng đen giòn sần sật hấp hành gừng.'],
      [25, 'Lòng Phèo Bò Hấp Hành Gừng', 'Steamed Beef Intestine with Ginger & Onion', 180000, 'Phèo non béo ngậy hấp hành gừng chấm mắm tôm/mắm nêm.'],
    ],
  },
  {
    ten: 'Xào',
    isPromo: false,
    mon: [
      [26, 'Lòng Bò Sốt Nước Mắm', 'Beef Offal in Fish Sauce Glaze', 195000, 'Lòng bò chiên sốt nước mắm Phú Quốc đậm đà.'],
      [27, 'Lòng Đen Bò Xào Khóm', 'Stir-Fried Beef Intestine with Pineapple', 195000, 'Lòng đen xào dứa chua ngọt giòn dai.'],
      [28, 'Bò Tơ Xào Mướp', 'Stir-Fried Young Beef with Sponge Gourd', 180000, 'Bò tơ xào mướp hương ngọt mát thanh đạm.'],
      [29, 'Bò Úc Xào Lúc Lắc', 'Shaking Beef with French Fries', 250000, 'Bò Úc thái quân cờ xào lúc lắc kèm khoai tây chiên.'],
    ],
  },
  {
    ten: 'Nhúng',
    isPromo: false,
    mon: [
      [30, 'Bò Tơ Nhúng Mẻ', 'Young Beef Hotpot with Fermented Rice', 350000, 'Chua dịu vị mẻ, bò tơ mềm ngọt, nước dùng đậm đà.'],
    ],
  },
  {
    ten: 'Lẩu',
    isPromo: false,
    mon: [
      [31, 'Lẩu Xí Quách Bò', 'Beef Bone Hotpot', 290000, 'Xương bò hầm nhừ ngọt tủy thơm phức.'],
      [32, 'Lẩu Bò Tơ 68', 'Bo To 68 Signature Hotpot', 480000, 'Nồi lẩu đặc sản của quán đủ loại thịt bò hảo hạng.'],
      [33, 'Lẩu Bò Thái 2 Vị', 'Dual-Flavor Thai Beef Hotpot', 480000, 'Lẩu bò phong cách Thái chua cay 2 ngăn.'],
      [34, 'Lẩu Bò Thập Cẩm', 'Mixed Beef Hotpot', 250000, 'Đầy đủ thịt thăn, nạm, lòng, bò viên.'],
      [35, 'Lẩu Thịt Bò Tươi', 'Fresh Beef Hotpot', 350000, 'Thịt bò tơ thái mỏng nhúng nước lẩu thanh ngọt.'],
      [36, 'Lẩu Sườn Bò Tươi', 'Fresh Beef Rib Hotpot', 350000, 'Sườn bò tươi sần sật nước lẩu đậm vị.'],
      [37, 'Lẩu Đuôi Bò', 'Oxtail Hotpot', 250000, 'Đuôi bò hầm thuốc bắc bùi béo bổ dưỡng.'],
    ],
  },
  {
    ten: 'Lai Rai',
    isPromo: false,
    mon: [
      [38, 'Rau Muống Xào Tỏi', 'Morning Glory Stir-Fried with Garlic', 70000, 'Rau muống xanh giòn xào tỏi thơm nức.'],
      [39, 'Đậu Hũ Chiên Sả', 'Crispy Tofu with Lemongrass', 60000, 'Đậu hũ non chiên giòn rắc sả ớt.'],
      [40, 'Khoai Tây Chiên', 'French Fries', 85000, 'Khoai tây chiên vàng giòn rụm.'],
      [41, 'Rau Luộc Thập Cẩm', 'Mixed Boiled Vegetables', 75000, 'Đĩa rau củ thập cẩm thanh mát luộc chấm kho quẹt/chao.'],
    ],
  },
  {
    ten: 'Cơm Chiên',
    isPromo: false,
    mon: [
      [42, 'Cơm Chiên Tỏi', 'Garlic Fried Rice', 60000, 'Cơm chiên hạt tơi vàng óng dậy mùi tỏi phi.'],
      [43, 'Cơm Chiên Trứng', 'Egg Fried Rice', 70000, 'Cơm chiên trứng vàng thơm dễ ăn.'],
      [44, 'Cơm Chiên Rau Củ', 'Vegetable Fried Rice', 80000, 'Cơm chiên các loại rau củ hạt sen, đậu, cà rốt.'],
      [45, 'Cơm Chiên Bò', 'Beef Fried Rice', 160000, 'Cơm chiên bò đậm đà thơm ngon.'],
      [46, 'Cơm Chiên Khóm Hải Sản', 'Pineapple Seafood Fried Rice', 230000, 'Cơm chiên hải sản tôm mực đựng trong trái thơm.'],
    ],
  },
  {
    ten: 'Mì Xào',
    isPromo: false,
    mon: [
      [47, 'Mì Xào Bò', 'Stir-Fried Noodles with Beef', 160000, 'Mì xào thịt bò tơ rau cải giòn ngon.'],
      [48, 'Mì Xào Hải Sản', 'Stir-Fried Noodles with Seafood', 180000, 'Mì trứng xào tôm, mực tươi Phú Quốc.'],
      [49, 'Mì Trứng Giòn Hải Sản', 'Crispy Seafood Egg Noodles', 230000, 'Mì chiên phồng giòn rụm tưới sốt hải sản sánh mịn.'],
    ],
  },
  {
    ten: 'Canh',
    isPromo: false,
    mon: [
      [50, 'Canh Cua Mùng Tơi Cà Pháo', 'Crab Soup with Malabar Spinach & Pickled Eggplant', 150000, 'Canh cua đồng mùng tơi thanh mát kèm cà pháo giòn.'],
      [51, 'Canh Nghêu Nấu Mẻ', 'Clam Soup with Fermented Rice Broth', 150000, 'Nghêu nấu nước mẻ chua dịu giải nhiệt.'],
      [52, 'Canh Chua Cá Bớp', 'Sweet & Sour Cobia Fish Soup', 250000, 'Cá bớp biển Phú Quốc nấu canh chua lá giang/bạc hà.'],
      [53, 'Canh Rau Dền Bò Bằm', 'Amaranth Soup with Minced Beef', 150000, 'Canh rau dền đỏ nấu thịt bò bằm ngọt lành.'],
    ],
  },
  {
    ten: 'Món Mặn',
    isPromo: false,
    mon: [
      [54, 'Cá Bóp Kho Tộ', 'Braised Cobia Fish in Clay Pot', 250000, 'Khúc cá bớp kho tộ đậm vị tiêu sọ cay ấm.'],
      [55, 'Tôm Rang Thịt Ba Chỉ', 'Caramelized Shrimp with Pork Belly', 220000, 'Tôm nõn rang ba rọi cháy cạnh mặn ngọt đưa cơm.'],
      [56, 'Thịt Kho Tàu', 'Braised Pork in Caramel Sauce', 170000, 'Thịt kho trứng vịt béo mềm thơm bùi.'],
      [57, 'Trứng Chiên Thịt Bằm', 'Fried Eggs with Minced Pork', 120000, 'Trứng vịt tráng thịt nạc bằm hành tây vàng ruộm.'],
      [58, 'Đậu Hủ Sốt Cà', 'Tofu with Tomato Sauce', 60000, 'Đậu hũ rán vàng sốt cà chua tươi mềm thơm.'],
      [59, 'Ba Chỉ Cháy Cạnh', 'Crispy-Edge Pork Belly', 150000, 'Thịt ba chỉ chiên cháy cạnh đậm đà mắm thơm.'],
      [109, 'Cơm Trắng (Miễn Phí)', 'Steamed White Rice (Complimentary)', 0, 'Dùng thoải mái khi dùng bữa tại quán.'],
    ],
  },
  {
    ten: 'Xào - Rau',
    isPromo: false,
    mon: [
      [60, 'Rau Muống Xào Tỏi', 'Stir-Fried Morning Glory with Garlic', 70000, 'Rau muống xào tỏi giòn tươi.', 'trung-voi-38'],
      [61, 'Hải Sản Xào Chua Ngọt', 'Sweet & Sour Seafood Stir-Fried', 220000, 'Tôm mực xào chua ngọt khóm hành ớt chuông.'],
      [62, 'Đậu Bắp Luộc', 'Boiled Okra', 60000, 'Đậu bắp non luộc chấm chao/nước tương.'],
      [63, 'Cải Thảo Xào Nấm', 'Stir-Fried Napa Cabbage with Mushrooms', 80000, 'Cải thảo non xào các loại nấm tươi ngọt.'],
    ],
  },
  {
    ten: 'Vị Biển - Phú Quốc',
    isPromo: false,
    mon: [
      [67, 'Tôm Hấp Nước Dừa', 'Steamed Prawn in Coconut Water', 195000, 'Tôm tươi sống hấp nước dừa xiêm ngọt lịm.'],
      [68, 'Tôm Nướng Muối Ớt', 'Grilled Prawn with Chili Salt', 195000, 'Tôm sú nướng muối ớt cay đậm đà.'],
      [69, 'Mực Sốt Nước Mắm', 'Squid with Fish Sauce', 195000, 'Mực ống chiên giòn áo sốt mắm tỏi ớt thơm lừng.'],
      [70, 'Mực Nướng Muối Ớt', 'Grilled Squid with Chili Salt', 195000, 'Mực nang/ống nướng muối ớt thơm nồng than hoa.'],
      [71, 'Cá Chim Hấp Xì Dầu', 'Steamed Pomfret Fish in Soy Sauce', 450000, 'Cá chim tươi hấp xì dầu hành gừng béo ngọt.'],
      [72, 'Cá Chim Nướng Muối Ớt', 'Grilled Pomfret with Chili Salt', 450000, 'Cá chim nướng than da giòn thịt ngọt chấm muối ớt chanh.'],
      [73, 'Lẩu Thái Hải Sản', 'Thai Seafood Hotpot', 480000, 'Nồi lẩu Thái chua cay đậm vị ngập tràn hải sản tươi.'],
      [74, 'Lẩu Cá Mú', 'Grouper Hotpot', 480000, 'Lẩu cá mú tươi ngọt thịt nấu măng chua/lá giang.'],
      [75, 'Gỏi Cá Trích Phú Quốc', 'Phu Quoc Herring Salad', 190000, 'Đặc sản đảo ngọc Phú Quốc cuốn bánh tráng rau rừng chấm sốt đặc trưng.'],
      [76, 'Lẩu Nấm Tràm Phú Quốc', 'Phu Quoc Tram Mushroom Hotpot', 550000, 'Đặc sản nấm tràm đảo ngọc thanh nhiệt bổ dưỡng.'],
      [77, 'Gà Hấp Lá Chanh (1/2 con)', 'Steamed Chicken with Lime Leaf (Half)', 315000, 'Nửa con gà ta thả vườn hấp lá chanh da giòn thịt ngọt.'],
      [78, 'Gà Hấp Lá Chanh (Nguyên con)', 'Steamed Chicken with Lime Leaf (Whole)', 550000, 'Nguyên con gà ta thả vườn hấp lá chanh thơm lừng.'],
      [79, 'Lẩu Gà Lá É (1/2 con)', 'Chicken Hotpot with É Leaves (Half)', 335000, 'Nửa con gà nấu lẩu lá é thơm cay nồng ấm bụng.'],
      [80, 'Lẩu Gà Lá É (Nguyên con)', 'Chicken Hotpot with É Leaves (Whole)', 580000, 'Nguyên con gà ta nấu lẩu lá é chuẩn vị Phú Yên.'],
      [81, 'Tôm Sú (500gr)', 'Tiger Shrimp (500gr)', 350000, '500gr Tôm sú tươi sống tự chọn sốt: Chanh dây sả / Mù tạt xanh / Sốt Bò Tơ 68.'],
      [82, 'Mực Ống (500gr)', 'Squid (500gr)', 350000, '500gr Mực ống tươi tự chọn sốt: Chanh dây sả / Mù tạt xanh / Sốt Bò Tơ 68.'],
      [83, 'Ốc Hương (500gr)', 'Babylon Snails (500gr)', 480000, '500gr Ốc hương giòn ngọt tự chọn sốt: Chanh dây sả / Mù tạt xanh / Sốt Bò Tơ 68.'],
      [84, 'Ghẹ Xanh (500gr)', 'Blue Swimmer Crab (500gr)', 480000, '500gr Ghẹ xanh Hàm Ninh tự chọn sốt: Chanh dây sả / Mù tạt xanh / Sốt Bò Tơ 68.'],
      [107, 'Mực Trứng (Theo thời giá)', 'Roe-Filled Squid (Seasonal)', 0, 'Mực ôm trứng hấp hoặc nướng (Theo thời giá).'],
      [108, 'Mực 1 Nắng (Theo thời giá)', 'One Sun Squid (Seasonal)', 0, 'Mực câu đêm một nắng nướng than hoa (Theo thời giá).'],
    ],
  },
  {
    ten: 'Western Favorites',
    isPromo: false,
    mon: [
      [85, 'Salad Caesar Gà', 'Chicken Caesar Salad', 145000, 'Xà lách Romaine tươi giòn, sốt Caesar, thịt ức gà và bánh mì nướng.'],
      [86, 'Chả Giò Hải Sản Giòn Rụm', 'Crispy Seafood Spring Rolls', 145000, 'Chả giò rế nhân hải sản tôm mực chiên giòn chấm sốt ngọt.'],
      [87, 'Súp Bí Đỏ Tôm Sú', 'Pumpkin Soup with Tiger Prawn', 175000, 'Súp kem bí đỏ mịn béo ngậy kèm tôm sú tươi nướng.'],
      [88, 'Súp Tom Yum Tôm', 'Tom Yum Goong', 180000, 'Súp Tom Yum chuẩn vị Thái cay nồng thơm mùi riềng sả.'],
      [89, 'Cá Hồng Phi Lê Sốt Chanh Dây', 'Snapper Fish Fillet with Passion Fruit Sauce', 235000, 'Cá hồng biển áp chảo da giòn quyện sốt chanh dây thanh mát.'],
      [90, 'Gà Quay Sốt Nấm Khoai Tây Nghiền', 'Roasted Chicken with Mushroom Sauce & Mashed Potato', 235000, 'Gà nướng thảo mộc đẫm sốt nấm hương kèm khoai tây nghiền mịn.'],
      [91, 'Sườn Heo Mỹ Sốt Sim Phú Quốc', 'American Pork Rib with Phu Quoc Sim Sauce', 380000, 'Dẻ sườn heo Mỹ nướng mềm tan hòa quyện sốt rượu sim đảo ngọc.'],
      [92, 'Bò Úc Sốt Tiêu Phú Quốc', 'Australian Beef with Phu Quoc Pepper Sauce', 420000, 'Bít tết bò Úc áp chảo mềm mọng phủ sốt tiêu sọ chín đảo ngọc.'],
      [93, 'Bánh Mì Kẹp Gà Kèm Khoai Tây Chiên', 'Chicken Club Sandwich with Fries', 215000, 'Sandwich 3 tầng kẹp thịt gà nướng, trứng, phô mai kèm khoai tây chiên.'],
      [94, 'Burger Bò Phô Mai Kèm Khoai Tây Chiên', 'Beef Cheeseburger with Fries', 235000, 'Burger bò Úc nướng mềm kẹp phô mai cheddar tan chảy.'],
      [95, 'Cá Hồng Nướng Nguyên Con Thảo Mộc', 'BBQ Whole Snapper with Lime & Herbs', 350000, 'Cá hồng biển nướng nguyên con gia vị thảo mộc lá chanh nồng nàn.'],
      [96, 'Cơm Chiên Khóm Hải Sản Kiểu Tây', 'Pineapple Seafood Fried Rice', 230000, 'Cơm chiên hải sản tôm mực béo ngậy trong quả dứa.'],
    ],
  },
  {
    ten: 'Mì Ý (Pasta)',
    isPromo: false,
    mon: [
      [97, 'Mì Ý Sốt Cà Chua Napolitana', 'Spaghetti Napolitana Sauce', 180000, 'Mì Spaghetti truyền thống sốt cà chua Ý và phô mai Parmesan.'],
      [98, 'Mì Ý Sốt Kem Trứng Carbonara', 'Spaghetti Carbonara', 210000, 'Mì Ý sốt kem trứng béo ngậy thịt xông khói áp chảo.'],
      [99, 'Mì Ý Sốt Bò Bằm Bolognese', 'Spaghetti Bolognese', 250000, 'Mì Spaghetti sốt thịt bò bằm đậm đà chuẩn vị Bologna.'],
      [100, 'Mì Ý Hải Sản', 'Seafood Spaghetti', 265000, 'Mì Ý xào tôm, mực tươi, nghêu và sốt hải sản thơm lừng.'],
    ],
  },
  {
    ten: 'Pizza',
    isPromo: false,
    mon: [
      [101, 'Pizza Margherita', 'Margherita Pizza', 210000, 'Pizza Ý cổ điển sốt cà chua, phô mai Mozzarella và lá húng tây Basil.'],
      [102, 'Pizza Rau Củ', 'Vegetable Pizza', 220000, 'Pizza chay rau củ tươi, ớt chuông, nấm, ô liu đen thơm ngon.'],
      [103, 'Pizza Nấm', 'Mushroom Pizza', 235000, 'Pizza phủ các loại nấm tươi và phô mai Mozzarella thơm bùi.'],
      [104, 'Pizza Hawaii', 'Hawaiian Pizza', 265000, 'Pizza sốt cà chua, phô mai, giăm bông thịt nguội và dứa ngọt mát.'],
      [105, 'Pizza Xúc Xích Cay Chorizo', 'Chorizo Pizza', 285000, 'Pizza xúc xích Tây Ban Nha cay thơm nồng nàn đậm vị.'],
      [106, 'Pizza Hải Sản', 'Seafood Pizza', 320000, 'Pizza ngập tràn hải sản tôm sú, mực tươi và phô mai nướng vàng xém.'],
    ],
  },
];

// ── XỬ LÝ ĐỐI SỐ DÒNG LỆNH ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`) || args.includes(`-${name}`);
const value = (name) => {
  const i = args.findIndex(a => a === `--${name}` || a === `-${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('-') ? args[i + 1] : null;
};

let agentInput = value('agent') || args.find(a => !a.startsWith('-')) || null;
const isClean = flag('clean');
const giuTrung = flag('giu-trung');

function tinhGia(giaIn) {
  return giaIn || 0;
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function timAgent(dinhDanh) {
  if (!dinhDanh) return null;
  const str = String(dinhDanh).trim();
  const isId = /^\d+$/.test(str);
  if (isId) {
    const res = await db.query(
      `SELECT id, username, full_name, project_id, role FROM admins WHERE id = $1`,
      [parseInt(str, 10)]
    );
    return res.rows[0] || null;
  }
  const res = await db.query(
    `SELECT id, username, full_name, project_id, role FROM admins
      WHERE LOWER(username) = LOWER($1) AND role IN ('agent','project_admin')`,
    [str]
  );
  return res.rows[0] || null;
}

async function danhSachAgent() {
  const res = await db.query(
    `SELECT id, username, full_name, project_id FROM admins WHERE role IN ('agent','project_admin') ORDER BY id ASC`
  );
  return res.rows;
}

async function donThucDonBoto68(agentId, xoaTatCa = false) {
  let xoaMon;
  if (xoaTatCa) {
    // Xóa TOÀN BỘ món ăn của Agent này (bao gồm cả món tự nhập tay)
    xoaMon = await db.query(
      `DELETE FROM qr_menu_items WHERE agent_id = $1 RETURNING id`,
      [agentId]
    );
  } else {
    // Xóa các món Bò Tơ 68 theo danh sách tên món chính xác từ menu hoặc có tag [boto68]
    const tenMonList = DANH_MUC_MENU.flatMap(g => g.mon.map(m => m[1]));
    xoaMon = await db.query(
      `DELETE FROM qr_menu_items 
        WHERE agent_id = $1 AND (name = ANY($2::text[]) OR description LIKE '%[boto68%')
        RETURNING id`,
      [agentId, tenMonList]
    );
  }

  // Xóa các danh mục không phải nhóm ưu đãi mà rỗng món
  let xoaNhom;
  if (xoaTatCa) {
    xoaNhom = await db.query(
      `DELETE FROM qr_menu_categories c
        WHERE c.agent_id = $1 AND NOT c.is_promo
          AND NOT EXISTS (SELECT 1 FROM qr_menu_items i WHERE i.category_id = c.id)
        RETURNING id`,
      [agentId]
    );
  } else {
    const tenNhomList = DANH_MUC_MENU.map(n => n.ten);
    xoaNhom = await db.query(
      `DELETE FROM qr_menu_categories c
        WHERE c.agent_id = $1 AND NOT c.is_promo AND c.name = ANY($2::text[])
          AND NOT EXISTS (SELECT 1 FROM qr_menu_items i WHERE i.category_id = c.id)
        RETURNING id`,
      [agentId, tenNhomList]
    );
  }

  return { mon: xoaMon.rowCount || 0, nhom: xoaNhom.rowCount || 0 };
}

async function dichSangCacTiengConLai(monDaTao) {
  if (flag('no-dich')) {
    console.log('\n[Dịch tự động] Đã bỏ qua dịch AI (--no-dich).');
    return;
  }
  console.log('\n--- BẮT ĐẦU DỊCH MÓN ĂN SANG 4 NGÔN NGỮ (Trung, Hàn, Nga, Kazakh)... ---');

  const oNho = [];
  for (const m of monDaTao) {
    oNho.push({ khoa: `mon:${m.id}:ten`, chu: m.ten });
    if (m.moTa) oNho.push({ khoa: `mon:${m.id}:mota`, chu: m.moTa });
  }

  for (const lang of NGON_NGU_DICH_AI) {
    const raKq = new Map();
    const loi = new Set();
    const KICH_LO = 32;
    for (let i = 0; i < oNho.length; i += KICH_LO) {
      const lo = oNho.slice(i, i + KICH_LO);
      try {
        const kq = await gemini.translateTexts(lo.map((o) => o.chu), lang, {
          sourceLang: 'vi', protect: TEN_RIENG,
        });
        lo.forEach((o, idx) => {
          const r = kq[idx];
          if (r && r.provider !== 'none' && r.translatedText) raKq.set(o.khoa, r.translatedText);
          else loi.add('dịch không trả kết quả');
        });
      } catch (e) {
        loi.add(e.message);
      }
    }

    let okMon = 0;
    for (const m of monDaTao) {
      const ten = raKq.get(`mon:${m.id}:ten`);
      if (!ten) continue;
      const moTa = m.moTa ? (raKq.get(`mon:${m.id}:mota`) || null) : null;
      await db.query(
        `INSERT INTO qr_menu_item_translations (item_id, lang, name, description, is_manual, updated_at)
         VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
         ON CONFLICT (item_id, lang) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP
           WHERE qr_menu_item_translations.is_manual = FALSE`,
        [m.id, lang, ten, moTa]
      ).catch(() => {});
      okMon++;
    }

    const nhan = { zh: 'Tiếng Trung (zh)', ko: 'Tiếng Hàn (ko)', ru: 'Tiếng Nga (ru)', kk: 'Tiếng Kazakh (kk)' }[lang] || lang;
    const dong = `  ✓ ${nhan.padEnd(20)}: ${String(okMon).padStart(3)}/${monDaTao.length} món`;
    console.log(loi.size ? `${dong}  (Chú ý: ${[...loi][0]})` : dong);
  }
}

async function main() {
  await db.initPromise;

  if (!agentInput) {
    const agents = await danhSachAgent();
    console.log('================================================================');
    console.log('    CÔNG CỤ IMPORT THỰC ĐƠN BÒ TƠ 68 TỪ FILE PDF (106 MÓN)     ');
    console.log('================================================================');
    if (agents.length > 0) {
      console.log('Danh sách Agent hiện có trong hệ thống:');
      agents.forEach(a => {
        console.log(`  [${String(a.id).padStart(2, ' ')}] ${a.username.padEnd(30)} | ${a.full_name || 'Chưa đặt tên'} (Dự án: ${a.project_id})`);
      });
      console.log('----------------------------------------------------------------');
    }

    const defaultAgent = agents.find(a => a.username.includes('boto68')) || agents[0];
    const defaultVal = defaultAgent ? defaultAgent.username : '';
    const answer = await askQuestion(`Nhập email hoặc ID của Agent cần import [Mặc định: ${defaultVal}]: `);
    agentInput = answer || defaultVal;
  }

  const agent = await timAgent(agentInput);
  if (!agent) {
    throw new Error(`Không tìm thấy tài khoản Agent "${agentInput}".`);
  }

  console.log(`\nAgent được chọn: ${agent.full_name || agent.username} (ID: ${agent.id}, Project: ${agent.project_id})`);

  if (isClean) {
    console.log(`Đang dọn sạch toàn bộ thực đơn của Agent ${agent.full_name || agent.username} (bao gồm cả món tự nhập)...`);
    const cleanRes = await donThucDonBoto68(agent.id, true);
    console.log(`✓ Đã xóa sạch ${cleanRes.mon} món (bao gồm cả món tự nhập) và ${cleanRes.nhom} nhóm.`);
    await db.pool.end();
    return;
  }

  // Dọn dẹp trước để import mới không bị trùng
  console.log('Đang dọn dẹp các món Bò Tơ 68 cũ nếu có...');
  await donThucDonBoto68(agent.id);

  console.log('\n--- BẮT ĐẦU IMPORT THỰC ĐƠN BÒ TƠ 68 ---');
  console.log('Quy tắc giá : Đúng 100% theo giá in trên menu PDF (KHÔNG CỘNG VAT).');
  console.log('Hình ảnh    : KHÔNG lấy hình ảnh (image_url = null) theo yêu cầu.');
  console.log('Bản dịch    : Đầy đủ 6 ngôn ngữ (vi, en, zh, ko, ru, kk).');

  let tongMon = 0;
  let tongNhom = 0;
  let monBoQua = 0;
  let sortItem = 0;
  const monDaTao = [];

  for (const [idxNhom, nhom] of DANH_MUC_MENU.entries()) {
    let categoryId;

    if (nhom.isPromo) {
      // 1. Nhóm ƯU ĐÃI: kiểm tra nếu đã có nhóm is_promo của Agent thì dùng lại, nếu chưa thì tạo mới
      const daCoPromo = await db.query(
        `SELECT id, name FROM qr_menu_categories WHERE agent_id = $1 AND is_promo LIMIT 1`,
        [agent.id]
      );
      if (daCoPromo.rows[0]) {
        categoryId = daCoPromo.rows[0].id;
        await db.query(
          `UPDATE qr_menu_categories SET name = $2, sort_order = -1 WHERE id = $1`,
          [categoryId, nhom.ten]
        );
      } else {
        const created = await db.query(
          `INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order, is_promo)
           VALUES ($1, $2, $3, -1, TRUE) RETURNING id`,
          [agent.id, agent.project_id, nhom.ten]
        );
        categoryId = created.rows[0].id;
      }
    } else {
      // 2. Nhóm thông thường: tìm lại nhóm trùng tên hoặc tạo mới
      const daCoCat = await db.query(
        `SELECT id FROM qr_menu_categories WHERE agent_id = $1 AND name = $2 LIMIT 1`,
        [agent.id, nhom.ten]
      );
      if (daCoCat.rows[0]) {
        categoryId = daCoCat.rows[0].id;
        await db.query(
          `UPDATE qr_menu_categories SET sort_order = $2 WHERE id = $1`,
          [categoryId, idxNhom]
        );
      } else {
        const created = await db.query(
          `INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order, is_promo)
           VALUES ($1, $2, $3, $4, FALSE) RETURNING id`,
          [agent.id, agent.project_id, nhom.ten, idxNhom]
        );
        categoryId = created.rows[0].id;
      }
    }
    tongNhom++;

    // Lưu bản dịch danh mục cho đủ 5 ngôn ngữ quốc tế (en, zh, ko, ru, kk)
    const catTranslations = BAN_DICH_NHOM_SAN[nhom.ten] || {};
    for (const lang of NGON_NGU_QUOC_TE) {
      const tenDich = catTranslations[lang] || nhom.ten;
      await db.query(
        `INSERT INTO qr_menu_category_translations (category_id, lang, name, is_manual, updated_at)
         VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
         ON CONFLICT (category_id, lang) DO UPDATE
         SET name = EXCLUDED.name, is_manual = TRUE, updated_at = CURRENT_TIMESTAMP`,
        [categoryId, lang, tenDich]
      ).catch(() => {});
    }
    // Và tiếng Việt
    await db.query(
      `INSERT INTO qr_menu_category_translations (category_id, lang, name, is_manual, updated_at)
       VALUES ($1, 'vi', $2, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (category_id, lang) DO UPDATE
       SET name = EXCLUDED.name, is_manual = TRUE, updated_at = CURRENT_TIMESTAMP`,
      [categoryId, nhom.ten]
    ).catch(() => {});

    let countMonNhom = 0;
    for (const [soMon, tenViet, tenAnh, giaIn, moTa, ghiChu] of nhom.mon) {
      if (ghiChu === 'trung-voi-38' && !giuTrung) {
        monBoQua++;
        continue;
      }

      const finalPrice = tinhGia(giaIn);
      const moTaLuu = moTa || null;

      // Insert món ăn KHÔNG CÓ HÌNH ẢNH (image_url = null, image_key = null)
      const resItem = await db.query(
        `INSERT INTO qr_menu_items
           (category_id, agent_id, project_id, name, description, price,
            stock_quantity, hide_when_out, is_available, sort_order,
            image_url, image_key)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, TRUE, TRUE, $7, NULL, NULL)
         RETURNING id`,
        [categoryId, agent.id, agent.project_id, tenViet, moTaLuu, finalPrice, sortItem++]
      );
      const itemId = resItem.rows[0].id;
      tongMon++;
      countMonNhom++;

      // 1. Lưu bản dịch tiếng Việt vào qr_menu_item_translations
      await db.query(
        `INSERT INTO qr_menu_item_translations (item_id, lang, name, description, is_manual, updated_at)
         VALUES ($1, 'vi', $2, $3, TRUE, CURRENT_TIMESTAMP)
         ON CONFLICT (item_id, lang) DO UPDATE
         SET name = EXCLUDED.name, description = EXCLUDED.description, is_manual = TRUE, updated_at = CURRENT_TIMESTAMP`,
        [itemId, tenViet, moTaLuu]
      ).catch(() => {});

      // 2. Lưu bản dịch tiếng Anh từ menu gốc (is_manual = TRUE)
      if (tenAnh) {
        await db.query(
          `INSERT INTO qr_menu_item_translations (item_id, lang, name, description, is_manual, updated_at)
           VALUES ($1, 'en', $2, $3, TRUE, CURRENT_TIMESTAMP)
           ON CONFLICT (item_id, lang) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description, is_manual = TRUE, updated_at = CURRENT_TIMESTAMP`,
          [itemId, tenAnh, moTaLuu]
        ).catch(() => {});
      }

      monDaTao.push({ id: itemId, so: soMon, ten: tenViet, moTa: moTaLuu });
    }

    const nhanTag = nhom.isPromo ? '[NHÓM ƯU ĐÃI]' : '[DANH MỤC]';
    console.log(`  ✓ ${nhanTag.padEnd(16)} ${nhom.ten.padEnd(24)}: ${countMonNhom} món`);
  }

  // Dịch sang 4 ngôn ngữ quốc tế còn lại (Trung, Hàn, Nga, Kazakh)
  await dichSangCacTiengConLai(monDaTao);

  console.log('\n================================================================');
  console.log(`✓ IMPORT THÀNH CÔNG CHO AGENT: ${agent.full_name || agent.username}`);
  console.log(`✓ Tổng danh mục  : ${tongNhom} nhóm`);
  console.log(`✓ Tổng món ăn    : ${tongMon} món đã import`);
  if (monBoQua > 0) {
    console.log(`✓ Món trùng lược : ${monBoQua} (Món 60 trùng món 38; dùng --giu-trung để import cả hai)`);
  }
  console.log(`✓ Hình ảnh       : Không sử dụng (image_url = NULL)`);
  console.log(`✓ Nhóm Ưu đãi    : Có ${DANH_MUC_MENU[0].mon.length} món combo & đặc trưng (is_promo = true)`);
  console.log('================================================================\n');

  await db.pool.end();
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error('\n❌ LỖI TRONG QUÁ TRÌNH IMPORT:', error.message);
    try { await db.pool.end(); } catch (_) {}
    process.exit(1);
  });
} else {
  module.exports = { DANH_MUC_MENU, main };
}
