#!/usr/bin/env node
/**
 * SINH THỰC ĐƠN BÒ TƠ 68 — theo đúng bộ menu in.
 *
 *   node seed-boto68.js --agent <email>            # sinh thực đơn
 *   node seed-boto68.js --agent <email> --clean    # xoá sạch thực đơn đã sinh
 *   node seed-boto68.js --agent <email> --gia-in   # ghi đúng giá in, KHÔNG cộng VAT
 *   node seed-boto68.js --agent <email> --no-dich  # bỏ bước dịch AI
 *   node seed-boto68.js --agent <email> --giu-trung# giữ cả 2 dòng "Rau Muống Xào Tỏi"
 *   node seed-boto68.js --agent <email> --khong-anh # bỏ bước tải ảnh món
 *   node seed-boto68.js --agent <email> --anh <thư mục>   # đổi chỗ để ảnh
 *   node seed-boto68.js --agent <email> --anh-chung-lau   # dùng chung ảnh cho lẩu 32-37
 *
 * ── HAI ĐIỀU PHẢI ĐỌC TRƯỚC KHI CHẠY ────────────────────────────────────────
 *
 * 1. GIÁ VÀ VAT. Menu in ghi "Giá bán chưa bao gồm 8% Thuế VAT". Hệ thống này
 *    thì coi giá nhập vào LÀ GIÁ KHÁCH TRẢ (đã gồm VAT) — xem cột
 *    price_includes_vat và phần phí dịch vụ trong cấu hình Agent. Hai cách hiểu
 *    ngược nhau, nên script KHÔNG tự quyết:
 *      · mặc định : nhân 1,08 rồi LÀM TRÒN LÊN bội số 1.000đ. Khách trả 189.000
 *                   cho món in 175.000 — đúng nghĩa "giá in chưa gồm VAT", và
 *                   khớp với cách hệ thống hiểu giá đã lưu là giá khách trả.
 *                   Làm tròn LÊN chứ không làm tròn gần nhất: không bao giờ thu
 *                   thiếu, và quán không phải thối tiền lẻ dưới 1.000đ.
 *      · --gia-in  : ghi đúng số in trên menu. Hoá đơn hiện đúng số đó, nghĩa là
 *                   quán tự chịu phần 8%.
 *    Chọn sai là sai toàn bộ doanh thu, nên script in rõ cách đang dùng và giá
 *    mẫu của 3 món trước khi ghi.
 *
 * 2. TÊN TIẾNG ANH LÀ CỦA QUÁN, KHÔNG PHẢI CỦA MÁY. Menu in đã có sẵn tên tiếng
 *    Anh cho từng món, do người viết. Script ghi thẳng những tên đó vào bảng dịch
 *    với is_manual = TRUE — tức máy dịch KHÔNG BAO GIỜ được ghi đè. Tiếng Trung,
 *    Hàn, Nga thì để máy dịch, có giữ lại các tên riêng (Phú Quốc, Bò Tơ 68,
 *    Kiên Giang…) không cho dịch.
 */

const path = require('path');
const db = require(path.join(__dirname, 'database.js'));
const gemini = require(path.join(__dirname, 'gemini-helper.js'));
const s3 = require(path.join(__dirname, 's3-helper.js'));

const SEED_TAG = '[boto68]';
const NGON_NGU_DICH = ['zh', 'ko', 'ru'];

// Tên riêng không được dịch sang bất cứ thứ tiếng nào.
const TEN_RIENG = ['Bò Tơ 68', 'Phú Quốc', 'Kiên Giang', 'Phú Quốc', 'BBQ', 'Bò Úc'];

const args = process.argv.slice(2);
const co = (ten) => args.includes('--' + ten);
const giaTri = (ten, macDinh) => {
  const i = args.indexOf('--' + ten);
  return i >= 0 && args[i + 1] ? args[i + 1] : macDinh;
};

const AGENT = giaTri('agent', null);
const CHI_DON = co('clean');
// Cộng 8% VAT là MẶC ĐỊNH. --gia-in để ghi đúng số in trên menu.
const GIA_IN_NGUYEN = co('gia-in');
const CONG_VAT = !GIA_IN_NGUYEN;
const KHONG_DICH = co('no-dich');
const GIU_TRUNG = co('giu-trung');
const KHONG_ANH = co('khong-anh');
const ANH_CHUNG_LAU = co('anh-chung-lau');
const THU_MUC_ANH = path.resolve(giaTri('anh', path.join(__dirname, 'anh-mon')));

// ── THỰC ĐƠN ────────────────────────────────────────────────────────────────
// Mỗi món: [số trên menu, tên Việt, tên Anh (của quán), giá in, mô tả]
// Nhóm đầu tiên là nhóm ƯU ĐÃI (is_promo) — combo và món phải thử.
const NHOM = [
  {
    ten: 'Ưu đãi', uuDai: true,
    mon: [
      [1, 'Combo Xiên Truyền Thống', 'Traditional Skewer Set', 568000, 'Dễ gọi, phù hợp 2-3 khách.'],
      [2, 'Combo Nướng Quốc Dân', 'BBQ Beef Popular Set', 668000, 'Đậm vị, bán chạy.'],
      [3, 'Combo Hải Sản Phú Quốc', 'Phu Quoc Sea Flavor Set', 2268000, 'Trọn vị Phú Quốc.'],
      [4, 'Bò Tơ Hấp Cuốn Rau Rừng', 'Steamed Young Beef Rolls with Wild Forest Herbs', 185000, null],
      [5, 'Bò Tơ Xông Hơi', 'Signature Steamed Young Beef', 250000, null],
      [6, 'Bò Hoả Diệm Sơn', 'Flame-Grilled Volcano Beef', 420000, null],
      [7, 'Lẩu Bò Phô Mai Kéo Sợi', 'Stretchy Cheese Beef Hotpot', 480000, null],
    ],
  },
  {
    ten: 'Bò Tơ Nướng Than',
    mon: [
      [8, 'Ba Rọi Bò Nướng Than', 'Charcoal-Grilled Veal Belly', 175000, 'Bán chạy.'],
      [9, 'Bắp Bò Lụi Sả Nướng', 'Charcoal-Grilled Beef Shank with Lemongrass', 185000, null],
      [10, 'Sườn Bò Cọng Nướng', 'Charcoal-Grilled Beef Ribs', 245000, null],
      [11, 'Bò Cuộn Nấm Phô Mai', 'Charcoal-Grilled Beef Rolls with Mushroom & Cheese', 245000, 'Bán chạy.'],
      [12, 'Bò Xiên Sốt BBQ Nướng Than', 'Charcoal-Grilled BBQ Beef Skewers', 195000, 'Bán chạy.'],
      [13, 'Bò Xiên Tứ Sắc Nướng Than', 'Four-Colour Beef Skewers', 195000, 'Bán chạy.'],
      [14, 'Bò Lá Lốt Nướng Than', 'Charcoal-Grilled Beef in Betel Leaves', 205000, null],
      [15, 'Thăn Ngoại Bò Nướng', 'Charcoal-Grilled Beef Striploin', 210000, null],
      [16, 'Thăn Nội Bò Nướng Than', 'Charcoal-Grilled Beef Tenderloin', 250000, 'Bán chạy.'],
      [17, 'Lòng Bò Ướp Nướng Than', 'Marinated Grilled Beef Intestine', 195000, null],
      [18, 'Mực Xiên Nướng Than', 'Charcoal-Grilled Squid Skewers', 210000, 'Bán chạy.'],
      [19, 'Tôm Xiên Nướng Than', 'Charcoal-Grilled Shrimp Skewers', 195000, 'Bán chạy.'],
    ],
  },
  {
    ten: 'Tái',
    mon: [
      [20, 'Bò Tơ Tái Chanh', 'Rare Young Beef in Lime Dressing', 185000, null],
      [21, 'Bò Tơ Bóp Thấu', 'Beef with Herbs & Vegetables Salad', 185000, null],
    ],
  },
  {
    ten: 'Hấp',
    mon: [
      [22, 'Bò Tơ Hấp Hành Gừng', 'Steamed Veal with Ginger & Onion', 185000, null],
      [23, 'Bò Tơ Hấp Tía Tô', 'Steamed Young Beef with Perilla Leaves', 185000, null],
      [24, 'Lòng Đen Bò Hấp Hành Gừng', 'Steamed Beef Intestine with Ginger & Onion', 165000, null],
      [25, 'Lòng Phèo Bò Hấp Hành Gừng', 'Steamed Beef Intestine with Ginger & Onion', 180000, null],
    ],
  },
  {
    ten: 'Xào',
    mon: [
      [26, 'Lòng Bò Sốt Nước Mắm', 'Beef Offal in Fish Sauce Glaze', 195000, null],
      [27, 'Lòng Đen Bò Xào Khóm', 'Stir-Fried Beef Intestine with Pineapple', 195000, null],
      [28, 'Bò Tơ Xào Mướp', 'Stir-Fried Young Beef with Sponge Gourd', 180000, null],
      [29, 'Bò Úc Xào Lúc Lắc', 'Shaking Beef with French Fries', 250000, null],
    ],
  },
  {
    ten: 'Nhúng',
    mon: [
      [30, 'Bò Tơ Nhúng Mẻ', 'Young Beef Hotpot with Fermented Rice', 350000,
        'Chua dịu vị mẻ, bò tơ mềm ngọt, nước dùng đậm đà. Bán chạy.'],
    ],
  },
  {
    ten: 'Lẩu',
    mon: [
      [31, 'Lẩu Xí Quách Bò', 'Beef Bone Hotpot', 290000, null],
      [32, 'Lẩu Bò Tơ 68', 'Bo To 68 Signature Hotpot', 480000, 'Bán chạy.'],
      [33, 'Lẩu Bò Thái 2 Vị', 'Dual-Flavor Thai Beef Hotpot', 480000, null],
      [34, 'Lẩu Bò Thập Cẩm', 'Mixed Beef Hotpot', 250000, null],
      [35, 'Lẩu Thịt Bò Tươi', 'Fresh Beef Hotpot', 350000, 'Bán chạy.'],
      [36, 'Lẩu Sườn Bò Tươi', 'Fresh Beef Rib Hotpot', 350000, null],
      [37, 'Lẩu Đuôi Bò', 'Oxtail Hotpot', 250000, null],
    ],
  },
  {
    ten: 'Lai Rai',
    mon: [
      [38, 'Rau Muống Xào Tỏi', 'Morning Glory Stir-Fried with Garlic', 70000, null],
      [39, 'Đậu Hũ Chiên Sả', 'Crispy Tofu with Lemongrass', 60000, null],
      [40, 'Khoai Tây Chiên', 'French Fries', 85000, null],
      [41, 'Rau Luộc Thập Cẩm', 'Mixed Boiled Vegetables', 75000, null],
    ],
  },
  {
    ten: 'Cơm Chiên',
    mon: [
      [42, 'Cơm Chiên Tỏi', 'Garlic Fried Rice', 60000, null],
      [43, 'Cơm Chiên Trứng', 'Egg Fried Rice', 70000, null],
      [44, 'Cơm Chiên Rau Củ', 'Vegetable Fried Rice', 80000, null],
      [45, 'Cơm Chiên Bò', 'Beef Fried Rice', 160000, null],
      [46, 'Cơm Chiên Khóm Hải Sản', 'Pineapple Seafood Fried Rice', 230000, null],
    ],
  },
  {
    ten: 'Mì Xào',
    mon: [
      [47, 'Mì Xào Bò', 'Stir-Fried Noodles with Beef', 160000, null],
      [48, 'Mì Xào Hải Sản', 'Stir-Fried Noodles with Seafood', 180000, null],
      [49, 'Mì Trứng Giòn Hải Sản', 'Crispy Seafood Egg Noodles', 230000, null],
    ],
  },
  {
    ten: 'Canh',
    mon: [
      [50, 'Canh Cua Mùng Tơi Cà Pháo', 'Crab Soup with Malabar Spinach & Pickled Eggplant', 150000, null],
      [51, 'Canh Nghêu Nấu Mẻ', 'Clam Soup with Fermented Rice Broth', 150000, null],
      [52, 'Canh Chua Cá Bớp', 'Sweet & Sour Cobia Fish Soup', 250000, null],
      [53, 'Canh Rau Dền Bò Bằm', 'Amaranth Soup with Minced Beef', 150000, null],
    ],
  },
  {
    ten: 'Món Mặn',
    mon: [
      [54, 'Cá Bớp Kho Tộ', 'Braised Cobia Fish in Clay Pot', 250000, null],
      [55, 'Tôm Rang Thịt Ba Chỉ', 'Caramelized Shrimp with Pork Belly', 220000, null],
      [56, 'Thịt Kho Tàu', 'Braised Pork in Caramel Sauce', 170000, null],
      [57, 'Trứng Chiên Thịt Bằm', 'Fried Eggs with Minced Pork', 120000, null],
      [58, 'Đậu Hủ Sốt Cà', 'Tofu with Tomato Sauce', 60000, null],
      [59, 'Ba Chỉ Cháy Cạnh', 'Crispy-Edge Pork Belly', 150000, null],
    ],
  },
  {
    ten: 'Xào - Rau',
    mon: [
      // Món 60 trùng y hệt món 38 (cùng tên, cùng giá). Menu in để ở hai trang
      // khác nhau thì được, nhưng trong hệ thống gọi món hai dòng giống nhau là
      // khách thấy món lặp và tồn kho bị đếm tách làm đôi. Mặc định bỏ dòng này;
      // --giu-trung để giữ lại nếu quán thật sự muốn nó nằm ở cả hai nhóm.
      [60, 'Rau Muống Xào Tỏi', 'Stir-Fried Morning Glory with Garlic', 70000, null, 'trung-voi-38'],
      [61, 'Hải Sản Xào Chua Ngọt', 'Sweet & Sour Seafood Stir-Fried', 220000, null],
      [62, 'Đậu Bắp Luộc', 'Boiled Okra', 60000, null],
      [63, 'Cải Thảo Xào Nấm', 'Stir-Fried Napa Cabbage with Mushrooms', 80000, null],
    ],
  },
];

// ── ẢNH MÓN ─────────────────────────────────────────────────────────────────
//
// Ảnh bóc thẳng từ 6 trang menu in, đặt tên theo SỐ MÓN trên menu: mon-01.jpg…
// Không phải món nào cũng có ảnh riêng — menu in chỉ chụp một phần. Món không
// có ảnh thì để trống, KHÔNG lấy ảnh món khác điền vào: khách gọi theo ảnh, đưa
// nhầm ảnh là đưa nhầm món.
const CO_ANH = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 38, 39, 40, 41, 46, 49, 50, 54, 55, 60]);

// Cả nhóm Lẩu (31–37) trên menu in dùng CHUNG một tấm ảnh nồi lẩu. Mặc định chỉ
// gán cho món 31; --anh-chung-lau thì gán cho cả 7 món. Bảy loại lẩu khác nhau
// mà chung một ảnh là hứa với khách một thứ rồi bưng ra thứ khác.
const LAU_DUNG_CHUNG = [32, 33, 34, 35, 36, 37];

function tepAnhCho(so) {
  if (KHONG_ANH) return null;
  if (CO_ANH.has(so)) return path.join(THU_MUC_ANH, 'mon-' + String(so).padStart(2, '0') + '.jpg');
  if (ANH_CHUNG_LAU && LAU_DUNG_CHUNG.includes(so)) return path.join(THU_MUC_ANH, 'mon-31.jpg');
  return null;
}

// Tải một tấm ảnh lên đúng đường mà nút "Chọn ảnh" trên dashboard đi: S3 giữ
// file, database giữ image_key + một URL ký sẵn có hạn. Không có S3 thì bỏ qua
// và NÓI RA, chứ không ghi đường dẫn máy cục bộ vào image_url — khách mở menu
// trên điện thoại thì đường dẫn đó vô nghĩa.
async function taiAnhLen(monId, duongTep, agent) {
  const fs = require('fs');
  if (!fs.existsSync(duongTep)) return { ok: false, vi: 'không thấy tệp' };
  const buf = fs.readFileSync(duongTep);
  const key = s3.buildMenuImageKey(agent.project_id, agent.id, path.basename(duongTep));
  await s3.uploadBuffer(key, buf, 'image/jpeg');
  const url = await s3.getMenuImageUrl(key);
  const hetHan = new Date(Date.now() + s3.MENU_IMAGE_URL_TTL_SECONDS * 1000);
  await db.query(
    'UPDATE qr_menu_items SET image_key = $2, image_url = $3, image_url_expires_at = $4, updated_at = NOW() WHERE id = $1',
    [monId, key, url, hetHan]
  );
  return { ok: true };
}

// ── Giá ─────────────────────────────────────────────────────────────────────
// Làm tròn lên bội số 1.000đ: quán không thối tiền lẻ dưới 1.000.
function tinhGia(giaIn) {
  if (!CONG_VAT) return giaIn;
  return Math.ceil((giaIn * 1.08) / 1000) * 1000;
}

async function timAgent(dinhDanh) {
  const r = await db.query(
    `SELECT id, username, full_name, project_id, role FROM admins
      WHERE LOWER(username) = LOWER($1) AND role IN ('agent','project_admin')`,
    [String(dinhDanh || '').trim()]
  );
  return r.rows[0] || null;
}

async function donThucDon(agent) {
  // Chỉ xoá đúng thứ script này sinh ra: món mang dấu SEED_TAG cuối mô tả, và
  // nhóm rỗng còn lại sau đó. Món Agent tự nhập KHÔNG bị đụng tới.
  const xoaMon = await db.query(
    `DELETE FROM qr_menu_items WHERE agent_id = $1 AND description LIKE $2 RETURNING id`,
    [agent.id, '%' + SEED_TAG]
  );
  const tenNhom = NHOM.map((n) => n.ten);
  const xoaNhom = await db.query(
    `DELETE FROM qr_menu_categories c
      WHERE c.agent_id = $1 AND c.name = ANY($2::text[])
        AND NOT EXISTS (SELECT 1 FROM qr_menu_items i WHERE i.category_id = c.id)
      RETURNING id`,
    [agent.id, tenNhom]
  );
  return { mon: xoaMon.rowCount, nhom: xoaNhom.rowCount };
}

// ── Dịch động sang zh / ko / ru ─────────────────────────────────────────────
// Tiếng Anh KHÔNG đi qua đây: menu in đã có tên tiếng Anh do người viết, script
// ghi thẳng bản đó với is_manual = TRUE nên máy không được phép ghi đè.
async function dichSangCacTiengConLai(monDaTao, nhomDaTao) {
  if (KHONG_DICH) {
    console.log('Bỏ bước dịch (--no-dich). Khách Trung/Hàn/Nga sẽ thấy tên tiếng Việt');
    console.log('cho tới khi máy chủ dịch bù được.');
    return;
  }
  console.log('');
  console.log('Đang dịch sang tiếng Trung, Hàn, Nga…');

  const oNho = [];
  for (const m of monDaTao) {
    oNho.push({ khoa: `mon:${m.id}:ten`, chu: m.ten });
    if (m.moTa) oNho.push({ khoa: `mon:${m.id}:mota`, chu: m.moTa });
  }
  for (const n of nhomDaTao) oNho.push({ khoa: `nhom:${n.id}:ten`, chu: n.ten });

  for (const lang of NGON_NGU_DICH) {
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
          // provider 'none' = cả hai đường dịch đều hỏng. KHÔNG ghi bản tiếng
          // Việt vào bảng dịch: làm vậy là hệ thống tưởng đã dịch xong và sẽ
          // không bao giờ thử lại.
          if (r && r.provider !== 'none' && r.translatedText) raKq.set(o.khoa, r.translatedText);
          else loi.add('nhà cung cấp dịch không trả về kết quả');
        });
      } catch (e) {
        loi.add(e.message);
      }
    }

    let okMon = 0; let okNhom = 0;
    for (const m of monDaTao) {
      const ten = raKq.get(`mon:${m.id}:ten`);
      if (!ten) continue;
      const moTa = m.moTa ? (raKq.get(`mon:${m.id}:mota`) || null) : null;
      await db.query(
        `INSERT INTO qr_menu_item_translations (item_id, lang, name, description, is_manual, updated_at)
         VALUES ($1,$2,$3,$4,FALSE,NOW())
         ON CONFLICT (item_id, lang) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW()
           WHERE qr_menu_item_translations.is_manual = FALSE`,
        [m.id, lang, ten, moTa]
      );
      okMon++;
    }
    for (const n of nhomDaTao) {
      const ten = raKq.get(`nhom:${n.id}:ten`);
      if (!ten) continue;
      await db.query(
        `INSERT INTO qr_menu_category_translations (category_id, lang, name, is_manual, updated_at)
         VALUES ($1,$2,$3,FALSE,NOW())
         ON CONFLICT (category_id, lang) DO UPDATE
           SET name = EXCLUDED.name, updated_at = NOW()
           WHERE qr_menu_category_translations.is_manual = FALSE`,
        [n.id, lang, ten]
      );
      okNhom++;
    }
    const nhan = { zh: 'Trung', ko: 'Hàn', ru: 'Nga' }[lang];
    const dong = `  ${nhan.padEnd(6)} ${String(okMon).padStart(3)}/${monDaTao.length} món, ${okNhom}/${nhomDaTao.length} nhóm`;
    console.log(loi.size ? `${dong}   ⚠ ${[...loi][0]}` : dong);
  }
}

async function taiToanBoAnh(monDaTao, agent) {
  const canTai = monDaTao.filter((m) => m.anh);
  if (KHONG_ANH) { console.log(''); console.log('Bỏ bước ảnh (--khong-anh).'); return; }
  if (canTai.length === 0) { console.log(''); console.log('Không có ảnh nào để tải.'); return; }
  console.log('');
  if (!s3.isConfigured) {
    console.log('⚠  S3 CHƯA CẤU HÌNH (thiếu biến môi trường AWS_*) — bỏ qua toàn bộ ảnh.');
    console.log(`   ${canTai.length} món đã sẵn ảnh trong ${THU_MUC_ANH}`);
    console.log('   Cấu hình AWS_* xong chạy lại script là ảnh được gắn vào, không cần sinh lại món.');
    return;
  }
  console.log(`Đang tải ${canTai.length} ảnh lên S3…`);
  let ok = 0; const hong = [];
  for (const m of canTai) {
    try {
      const r = await taiAnhLen(m.id, m.anh, agent);
      if (r.ok) ok++; else hong.push(`#${m.so} ${m.ten}: ${r.vi}`);
    } catch (e) {
      hong.push(`#${m.so} ${m.ten}: ${e.message}`);
    }
  }
  console.log(`  ${ok}/${canTai.length} ảnh đã lên.`);
  for (const h of hong.slice(0, 8)) console.log('  ⚠ ' + h);
  if (hong.length > 8) console.log(`  ⚠ … còn ${hong.length - 8} lỗi nữa`);
}

async function main() {
  // database.js chạy migration ngay lúc require, KHÔNG đợi ai. Không chờ nó
  // xong thì script đua với chính migration: ghi vào bảng chưa có cột, hoặc
  // đóng pool giữa chừng và nhận "Cannot use a pool after calling end".
  if (db.initPromise) await db.initPromise.catch(() => {});

  if (!AGENT) {
    console.error('Thiếu --agent <email>. Ví dụ:');
    console.error('  node seed-boto68.js --agent chunhahang@botto68.vn');
    process.exit(1);
  }
  const agent = await timAgent(AGENT);
  if (!agent) {
    console.error(`Không tìm thấy tài khoản Agent "${AGENT}".`);
    console.error('Tài khoản phải có sẵn và vai trò là agent hoặc project_admin.');
    process.exit(1);
  }
  console.log(`Agent    : ${agent.full_name || agent.username} (${agent.username})`);
  console.log(`Project  : ${agent.project_id}`);

  if (CHI_DON) {
    const ra = await donThucDon(agent);
    console.log(`Đã xoá   : ${ra.mon} món, ${ra.nhom} nhóm.`);
    await db.pool.end();
    return;
  }

  // Nói rõ cách tính giá TRƯỚC khi ghi, kèm ví dụ thật.
  console.log('');
  console.log(CONG_VAT
    ? 'Giá      : giá in trên menu + 8% VAT, làm tròn lên 1.000đ'
    : 'Giá      : ĐÚNG số in trên menu, KHÔNG cộng VAT (--gia-in)');
  for (const [, ten, , giaIn] of [NHOM[1].mon[0], NHOM[6].mon[1], NHOM[8].mon[0]]) {
    console.log(`           ${ten.padEnd(34)} ${String(giaIn).padStart(9)}  →  ${String(tinhGia(giaIn)).padStart(9)}`);
  }

  await donThucDon(agent);

  const monDaTao = [];
  const nhomDaTao = [];
  let thuTu = 0;
  let boQua = 0;

  for (const [chiSo, nhom] of NHOM.entries()) {
    let nhomId;
    if (nhom.uuDai) {
      // Mỗi Agent có ĐÚNG MỘT nhóm ưu đãi — database ép bằng chỉ mục một phần
      // idx_menu_one_promo_per_agent. Dùng lại nhóm sẵn có nếu đã có.
      const daCo = await db.query(
        'SELECT id, name FROM qr_menu_categories WHERE agent_id = $1 AND is_promo LIMIT 1', [agent.id]
      );
      if (daCo.rows[0]) {
        nhomId = daCo.rows[0].id;
        await db.query('UPDATE qr_menu_categories SET name = $2, sort_order = -1 WHERE id = $1',
          [nhomId, nhom.ten]);
      } else {
        // sort_order = -1 để nhóm ưu đãi luôn đứng trước mọi nhóm khác.
        nhomId = (await db.query(
          `INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order, is_promo)
           VALUES ($1,$2,$3,-1,TRUE) RETURNING id`,
          [agent.id, agent.project_id, nhom.ten]
        )).rows[0].id;
      }
    } else {
      const daCo = await db.query(
        'SELECT id FROM qr_menu_categories WHERE agent_id = $1 AND name = $2 LIMIT 1',
        [agent.id, nhom.ten]
      );
      nhomId = daCo.rows[0] ? daCo.rows[0].id : (await db.query(
        `INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [agent.id, agent.project_id, nhom.ten, chiSo]
      )).rows[0].id;
      if (daCo.rows[0]) {
        await db.query('UPDATE qr_menu_categories SET sort_order = $2 WHERE id = $1', [nhomId, chiSo]);
      }
    }
    nhomDaTao.push({ id: nhomId, ten: nhom.ten });

    let demMon = 0;
    for (const [so, tenViet, tenAnh, giaIn, moTa, ghiChu] of nhom.mon) {
      if (ghiChu === 'trung-voi-38' && !GIU_TRUNG) { boQua++; continue; }

      // Dấu nằm CUỐI mô tả: đọc trên giao diện vẫn thấy câu mô tả thật trước,
      // mà lúc dọn vẫn tìm ra bằng LIKE.
      const moTaGhi = `${moTa ? moTa + ' ' : ''}${SEED_TAG}`;
      const moiTao = await db.query(
        `INSERT INTO qr_menu_items
           (category_id, agent_id, project_id, name, description, price,
            stock_quantity, hide_when_out, is_available, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,NULL,TRUE,TRUE,$7) RETURNING id`,
        [nhomId, agent.id, agent.project_id, tenViet, moTaGhi, tinhGia(giaIn), thuTu++]
      );
      const monId = moiTao.rows[0].id;

      // Tên tiếng Anh của QUÁN, khoá lại để máy dịch không ghi đè.
      await db.query(
        `INSERT INTO qr_menu_item_translations (item_id, lang, name, description, is_manual, updated_at)
         VALUES ($1,'en',$2,NULL,TRUE,NOW())
         ON CONFLICT (item_id, lang) DO UPDATE
           SET name = EXCLUDED.name, is_manual = TRUE, updated_at = NOW()`,
        [monId, tenAnh]
      );

      // Mô tả gửi đi dịch là mô tả THẬT, không kèm SEED_TAG: dịch cả cái dấu
      // sang tiếng Hàn thì lúc dọn tìm bằng LIKE sẽ không ra.
      monDaTao.push({ id: monId, so, ten: tenViet, moTa: moTa || null, anh: tepAnhCho(so) });
      demMon++;
    }
    const nhan = nhom.uuDai ? `${nhom.ten} (ưu đãi)` : nhom.ten;
    console.log(`  ${nhan.padEnd(24)} ${String(demMon).padStart(2)} món`);
  }

  await taiToanBoAnh(monDaTao, agent);
  await dichSangCacTiengConLai(monDaTao, nhomDaTao);

  // ── Đối chiếu bằng chính database, không tin vào biến đếm ở trên ──────────
  const khachThay = (await db.query(
    `SELECT COUNT(*)::int AS n FROM qr_menu_items
      WHERE agent_id = $1 AND is_available
        AND NOT (stock_quantity IS NOT NULL AND stock_quantity <= 0 AND hide_when_out)`,
    [agent.id]
  )).rows[0].n;
  const thieuDich = await db.query(
    `SELECT l.lang, COUNT(*)::int AS n
       FROM qr_menu_items i
       CROSS JOIN (SELECT unnest($2::text[]) AS lang) l
       LEFT JOIN qr_menu_item_translations t ON t.item_id = i.id AND t.lang = l.lang
      WHERE i.id = ANY($1::int[]) AND t.item_id IS NULL
      GROUP BY l.lang ORDER BY l.lang`,
    [monDaTao.map((m) => m.id), ['en', ...NGON_NGU_DICH]]
  );

  console.log('');
  console.log(`Đã tạo   : ${monDaTao.length} món / ${nhomDaTao.length} nhóm`);
  if (boQua) {
    console.log(`Bỏ qua   : ${boQua} món trùng tên và giá với món đã có (--giu-trung để giữ lại)`);
  }
  const coAnhDb = (await db.query(
    'SELECT COUNT(*)::int AS n FROM qr_menu_items WHERE id = ANY($1::int[]) AND image_key IS NOT NULL',
    [monDaTao.map((m) => m.id)]
  )).rows[0].n;
  console.log(`Khách thấy: ${khachThay} món`);
  console.log(`Có ảnh   : ${coAnhDb}/${monDaTao.length} món` +
    (coAnhDb < monDaTao.length ? '  (menu in không chụp hết mọi món)' : ''));
  if (thieuDich.rows.length === 0) {
    console.log('Bản dịch : đủ cả 4 ngôn ngữ (en, zh, ko, ru).');
  } else {
    console.log('');
    console.log('  CHÚ Ý — còn món CHƯA có bản dịch:');
    for (const r of thieuDich.rows) console.log(`    ${r.lang}: ${r.n} món`);
    console.log('  Khách chọn ngôn ngữ đó sẽ thấy tên tiếng Việt trên thực đơn và trên bill.');
    console.log('  Thường là do GEMINI_API_KEY / GOOGLE_TRANSLATE_API_KEY chưa cấu hình hoặc hết quota.');
    console.log('  Sửa xong chạy lại script này để dịch bù.');
  }
  console.log('');
  console.log(`Dọn sạch : node seed-boto68.js --agent ${agent.username} --clean`);

  await db.pool.end();
}

// Chạy thẳng từ dòng lệnh thì tự thực thi. Được require vào (bài đo cắm
// s3-helper giả) thì trả về promise để bên gọi await, không tự gọi process.exit.
if (require.main === module) {
  main().catch((e) => {
    console.error('LỖI:', e.message);
    process.exit(1);
  });
} else {
  module.exports = main();
}
