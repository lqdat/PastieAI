// Kiểm phần CHỌN NHÃN: khung ảnh, danh mục, và đường đi của lựa chọn khung
// từ Agent xuống cổng khách.
//
// Test đọc THẲNG mã nguồn thật (server.js, database.js, hai bảng điều khiển)
// rồi soi, không dựng bản sao: dựng bản sao thì test xanh trong khi tệp thật
// đã bị sửa khác đi. Dòng chú thích bị loại trước khi soi — đã hai lần test
// bắt trúng câu văn trong chú thích rồi báo đạt oan.
const fs = require('fs');
const path = require('path');

const G = path.join(__dirname, '..');
const doc = (p) => fs.readFileSync(path.join(G, p), 'utf8');
// Bỏ chú thích theo DÒNG, giữ nguyên số dòng để báo lỗi còn lần được.
//
// Không dùng biểu thức bắt cặp /* */ trên cả tệp: mã nguồn có sẵn những biểu
// thức chính quy chứa dấu sao, và một cặp bắt nhầm sẽ nuốt luôn hàng trăm dòng
// mã thật — đúng như lần chạy đầu, ba phép kiểm báo trượt trong khi mã vẫn
// đúng. Chú thích trong mã nguồn này đều chiếm trọn dòng nên cắt theo dòng là đủ.
const boChuThich = (s) => s.split('\n')
  .map((d) => (/^\s*(\/\/|\/\*|\*)/.test(d) ? '' : d)).join('\n');
// CSS chuẩn hoá: bỏ khoảng trắng quanh dấu, để '.a { b: c }' và '.a{b:c}' khớp nhau.
const gonCss = (s) => s.replace(/\s*([{};:,])\s*/g, '$1').replace(/\s+/g, ' ');

let dat = 0, truot = 0;
const kt = (ten, dung, chiTiet) => {
  if (dung) { dat++; console.log(`  ✓ ${ten}`); }
  else { truot++; console.log(`  ✗ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
};

const sv = boChuThich(doc('server.js'));
const dbjs = boChuThich(doc('database.js'));
const ajs = boChuThich(doc('public/admin.js'));
const ahtml = doc('public/admin.html');
const acss = gonCss(doc('public/admin.css'));
const ojs = boChuThich(doc('public/org-console.js'));

console.log('=== KHUNG NHÃN & DANH MỤC (máy chủ) ===');

// ── 1. Danh sách khung ĐÓNG và đã đổi sang bộ khung ảnh ─────────────────────
const dsKhung = sv.match(/const KIEU_BADGE = (\[[^\]]*\])/);
kt('KIEU_BADGE là 4 khung ảnh mới',
   dsKhung && ['vuong', 'thoi', 'hoa', 'tron'].every((k) => dsKhung[1].includes(`'${k}'`))
   && !dsKhung[1].includes("'star'"), dsKhung ? dsKhung[1] : 'không tìm thấy');

// Giá trị cũ vẫn phải nhận được: một tab trình duyệt chưa tải lại còn gửi kiểu cũ.
kt('có bảng ánh xạ 4 kiểu CSS cũ sang khung mới',
   /KHUNG_CU\s*=\s*\{[^}]*star:[^}]*seal:[^}]*pill:[^}]*ribbon:/.test(sv));
kt('kieuBadgeHopLe dùng bảng ánh xạ cũ', /kieuBadgeHopLe[\s\S]{0,320}KHUNG_CU\[kieu\]/.test(sv));

// ── 2. Danh mục đọc từ tệp, không chép cứng ─────────────────────────────────
kt('danh mục đọc từ public/badges/danh-muc.json', sv.includes("'public/badges/danh-muc.json'"));
kt('không chép cứng danh sách 15 mã trong server.js',
   !/'best-seller'[\s\S]{0,200}'discount-20'/.test(sv));
kt('có endpoint GET /api/menu-badges', /app\.get\('\/api\/menu-badges'/.test(sv));
kt('endpoint danh mục có kiểm đăng nhập',
   /app\.get\('\/api\/menu-badges',\s*checkAdminAuth/.test(sv));

// ── 3. Mã nhãn được kiểm theo danh mục ──────────────────────────────────────
kt('maNhanHopLe đối chiếu với danh mục', /function maNhanHopLe[\s\S]{0,400}danhMucNhan\(\)\.ma\.includes/.test(sv));
kt('badgeCode đi vào cả INSERT lẫn UPDATE',
   /INSERT INTO qr_menu_tags[\s\S]{0,400}badge_code/.test(sv)
   && /UPDATE qr_menu_tags[\s\S]{0,300}badge_code = \$8/.test(sv));

// ── 4. Khung riêng từng món ─────────────────────────────────────────────────
kt('cột badge_style trên bảng nối item-tag',
   /ALTER TABLE qr_menu_item_tags ADD COLUMN IF NOT EXISTS badge_style/.test(dbjs));
kt('bản ghi khung cũ được chuyển sang khung mới khi migrate',
   /UPDATE qr_menu_tags SET badge_style = CASE badge_style[\s\S]{0,260}'star' THEN 'hoa'/.test(dbjs));
kt('INSERT liên kết có ghi khung riêng',
   /INSERT INTO qr_menu_item_tags \(item_id, tag_id, badge_style\)/.test(sv));

// Đây là phép kiểm quan trọng nhất: nếu COALESCE đảo thứ tự thì khung Agent
// chọn không bao giờ có tác dụng, mà giao diện vẫn trông như đang hoạt động.
kt('khung của MÓN đè khung mặc định của NHÃN (đúng thứ tự COALESCE)',
   /COALESCE\(NULLIF\(it\.badge_style, ''\), g\.badge_style\) AS badge_style/.test(sv));

kt('máy chủ trả tag_styles để form sửa khôi phục được lựa chọn',
   /'tagId', it\.tag_id, 'badgeStyle', it\.badge_style[\s\S]{0,200}AS tag_styles/.test(sv));
kt('vẫn nhận thân yêu cầu dạng cũ tagIds',
   /Array\.isArray\(req\.body\?\.tags\)[\s\S]{0,220}req\.body\?\.tagIds/.test(sv));

console.log('\n=== MÀN SUPERADMIN ===');
kt('có lưới chọn kiểu text', ahtml.includes('id="org-tag-badge-grid"'));
kt('ô chọn khung ẩn sẵn, chỉ mở khi đã chọn kiểu text',
   /id="org-tag-frame-row"[^>]*class="[^"]*hide|class="[^"]*hide[^"]*"[^>]*id="org-tag-frame-row"/.test(ahtml)
   || /class="org-field badge-frame hide" id="org-tag-frame-row"/.test(ahtml));
kt('4 lựa chọn khung mới trong ô chọn',
   ['vuong', 'thoi', 'hoa', 'tron'].every((k) => ahtml.includes(`<option value="${k}"`))
   && !ahtml.includes('<option value="star"'));
kt('bỏ hẳn 4 lựa chọn kiểu CSS cũ', !/orgTagBadgeStar|orgTagBadgeRibbon/.test(ahtml));
kt('lưới vẽ lại khi ĐỔI KHUNG', /getElementById\('org-tag-badge'\)\?\.addEventListener\('change'[\s\S]{0,300}veLuoiBadge\(\)/.test(ajs));
kt('gửi kèm badgeCode và badgeStyle khi lưu',
   /badgeCode: document\.getElementById\('org-tag-badge-code'\)/.test(ajs)
   && /badgeStyle: document\.getElementById\('org-tag-badge'\)/.test(ajs));
kt('mở nhãn ra sửa thì nạp lại cả mã lẫn khung',
   /tag\.badge_style \|\| BADGE_FRAME_DEFAULT[\s\S]{0,260}tag\.badge_code/.test(ajs));
kt('reset form xoá luôn mã nhãn đã chọn',
   /function resetTagForm[\s\S]{0,700}org-tag-badge-code/.test(ajs));
kt('danh sách nhãn hiện ảnh thật khi nhãn có mã', /tag-card-badge[\s\S]{0,200}\/badges\//.test(ojs));
for (const luat of ['.badge-grid{', '.badge-cell{', '.badge-cell.is-on{', '.badge-frame-preview{', '.tag-card-badge{'])
  kt(`admin.css có ${luat}`, acss.includes(luat));

console.log('\n=== MÀN AGENT ===');
const mjs = boChuThich(doc('../pastie-dashboard/src/menu-console.js'));
const mcss = gonCss(doc('../pastie-dashboard/src/menu-console.css'));
kt('chonTag là Map để nhớ được khung, không phải Set', /let chonTag = new Map\(\)/.test(mjs));
kt('không còn chỗ nào dùng chonTag.add', !/chonTag\.add\(/.test(mjs));
kt('tích chọn xong mới hiện ô chọn khung', /const oKhung = dang && ma \?/.test(mjs));
kt('ô chọn khung có ảnh xem trước', /menu-tag-frame-preview[\s\S]{0,120}anhNhan\(khung, ma\)/.test(mjs));
kt('khung ưu tiên: Agent chọn > mặc định của nhãn > vuông',
   /chonTag\.get\(tag\.id\)\) \|\| tag\.badge_style \|\| KHUNG_MAC_DINH/.test(mjs));
kt('gửi lên dạng tags:[{tagId,badgeStyle}]', /tags: \[\.\.\.chonTag\]\.map\(\(\[tagId, badgeStyle\]\)/.test(mjs));
kt('mở form sửa thì khôi phục khung từ tag_styles', /item\.tag_styles[\s\S]{0,260}chonTag\.set/.test(mjs));
kt('vẫn mở được bản ghi cũ chỉ có tag_ids', /else if \(item && Array\.isArray\(item\.tag_ids\)\)/.test(mjs));
kt('đổi khung bắt bằng change uỷ quyền ở thẻ cha',
   /addEventListener\('change'[\s\S]{0,200}data-tag-frame/.test(mjs));
kt('ảnh nhãn trỏ tuyệt đối theo API_BASE', /\$\{API_BASE\}\/badges\//.test(mjs));
kt('khung chứa đổi sang xếp dọc', mcss.includes('.menu-tag-picker{flex-direction:column;'));
for (const luat of ['.menu-tag-row{', '.menu-tag-frame{', '.menu-tag-thumb{'])
  kt(`menu-console.css có ${luat}`, mcss.includes(luat));

console.log('\n=== SCRIPT NẠP NHÃN ===');
const imp = boChuThich(doc('scripts/import-badge-tags.js'));
kt('chữ nhãn lấy từ danh-muc.json, không chép cứng danh sách mã',
   imp.includes('danh-muc.json') && !/ma: \['smart-choice'/.test(imp));
kt('cờ --clean chỉ xoá nhãn dựng sẵn, không đụng nhãn tự tạo',
   /DELETE FROM qr_menu_tags WHERE badge_code = ANY/.test(imp));
kt('nhãn đã có thì chỉ vá phần thiếu, không ghi đè chữ và màu',
   /SET badge_code = COALESCE\(badge_code/.test(imp) && !/SET label = /.test(imp));
kt('dừng khi thiếu nhãn tiếng Việt cho một mã', /Chưa khai nhãn tiếng Việt cho/.test(imp));
kt('chờ initPromise chứ không tự chạy lại migration',
   /await db\.initPromise/.test(imp) && !/db\.initDatabase\(\)/.test(imp));

console.log(`\n${dat}/${dat + truot} đạt`);
process.exit(truot ? 1 : 0);
