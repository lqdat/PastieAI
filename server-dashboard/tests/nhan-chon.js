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
kt('danh sách nhãn hiện ảnh thật khi nhãn có mã, chữ khi không có',
   /tag\.badge_code[\s\S]{0,120}tag-card-badge[\s\S]{0,320}menu-badge is-/.test(ojs));
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


console.log('\n=== ẢNH NẰM TRÊN S3, KHÔNG CÒN TRONG MÃ NGUỒN ===');
const up = boChuThich(doc('scripts/upload-badges-to-s3.js'));
const clean = boChuThich(doc('scripts/clean-local-badges.js'));

kt('script đẩy ghi baseUrl vào manifest', /baseUrl,/.test(up) && /const baseUrl = /.test(up));
kt('manifest có cờ dayDu dựa trên số tệp lỗi',
   /dayDu: hong\.length === 0 && xong === canTai\.length/.test(up));

// Bucket KHÔNG công khai (ảnh sản phẩm cũng phải ký URL mới xem được), nên
// trình duyệt không bao giờ được trỏ thẳng vào địa chỉ S3 — sẽ nhận 403.
kt('địa chỉ trình duyệt gọi luôn là /badges, không phải địa chỉ S3',
   /const DUONG_DAN_NHAN = '\/badges'/.test(sv)
   && /function gocAnhNhan\(\) \{ return DUONG_DAN_NHAN; \}/.test(sv));
kt('chỉ đi lấy từ S3 khi lần đẩy ĐỦ', /man\?\.dayDu === true && man\?\.s3Prefix/.test(sv));
kt('có route phục vụ ảnh nhãn khi tệp gốc đã xoá', /app\.get\('\/badges\/:tep'/.test(sv));
kt('tên tệp bị chặn chặt trước khi ghép vào khoá S3',
   /\^\[a-z0-9\]\[a-z0-9-\]\{0,80\}\\\.\(png\|json\)\$/.test(sv));
kt('ảnh nhãn cache vĩnh viễn ở trình duyệt', /max-age=31536000, immutable/.test(sv));
// Gắn cache cho cả 404 thì một ảnh tạm thời thiếu bị nhớ là "không có" suốt
// một năm, đẩy lại ảnh cũng không cứu được.
kt('404 KHÔNG mang theo cache một năm',
   /const traVe = \(buf\) => res\.set\('Cache-Control'/.test(sv));
kt('ảnh đã lấy thì giữ trong bộ nhớ, không gọi S3 lại',
   /KHO_ANH_NHAN\.set\(tep, buf\)/.test(sv) && /KHO_ANH_NHAN\.get\(tep\)/.test(sv));
kt('danh mục trả kèm duongDan', /duongDan: gocAnhNhan\(\)/.test(sv));
kt('cổng khách nhận sẵn badge_url, không tự nối chuỗi', /tag\.badge_url = tag\.badge_code/.test(sv));
kt('thứ tiếng không có trong bộ ảnh thì rơi về bản tiếng Anh',
   /coTieng\.has\(target\) \? target : 'en'/.test(sv));

kt('Superadmin lấy gốc ảnh từ danh mục', /BADGE_CATALOG\?\.duongDan \|\| '\/badges'/.test(ajs));
kt('Superadmin không còn chép cứng /badges/ trong chuỗi ảnh',
   !/src="\/badges\/|`\/badges\/\$\{/.test(ajs));
kt('danh sách nhãn cũng đi qua badgeImgUrl', /tag-card-badge[\s\S]{0,200}badgeImgUrl\(/.test(ojs));

kt('Agent lấy gốc ảnh từ danh mục', /BADGE_CATALOG\?\.duongDan \|\| '\/badges'/.test(mjs));
// Đây là chỗ dễ sai nhất: địa chỉ S3 đã tuyệt đối, ghép thêm API_BASE là hỏng.
kt('Agent chỉ ghép API_BASE cho đường dẫn tương đối',
   /\^https\?:[\s\S]{0,80}goc : `\$\{API_BASE\}\$\{goc\}`/.test(mjs));

kt('script xoá đòi manifest mới xoá', /Chưa có badge-s3-manifest\.json/.test(clean));
kt('script xoá từ chối khi lần đẩy chưa đủ', /man\.dayDu !== true/.test(clean));
kt('script xoá đối chiếu từng TÊN TỆP, không chỉ đếm số lượng',
   /chuaTai = tren_dia\.filter\(\(f\) => !daTai\.has\(f\)\)/.test(clean));
kt('script xoá giữ lại danh-muc.json', /GIU_LAI = new Set\(\['danh-muc\.json'\]\)/.test(clean));
kt('script xoá chỉ đụng tệp .png', /\.endsWith\('\.png'\)/.test(clean));
kt('có chế độ chạy thử', /--thu/.test(clean));


console.log('\n=== TAB DANH MỤC BADGE ===');
// Lỗi thật đã gặp: .org-tag-form là flex-wrap chứ không phải grid, nên
// grid-column:1/-1 không có tác dụng và lưới chọn bị bóp thành một cột hẹp.
kt('ô chọn kiểu text chiếm trọn hàng bằng flex-basis, không phải grid-column',
   acss.includes('.org-field-wide{flex:1 0 100%;align-self:stretch;}')
   && !/\.org-field-wide\{grid-column/.test(acss));

// KHÔNG tạo tab thứ bảy: đo ở khổ 375px, dải tab đã rộng 661px trong khung
// 311px và ẩn cả vạch cuộn, nên tab thứ bảy nằm ngoài màn hình mà không có dấu
// hiệu nào — đúng thứ đã làm người dùng tưởng tính năng chưa có.
kt('danh mục nằm trong tab Nhãn, không thêm tab thứ bảy',
   !ahtml.includes('data-org-tab="badges"') && !ahtml.includes('data-org-pane="badges"'));
kt('danh mục là khối gấp/mở trong pane Nhãn',
   /<details class="badge-catalog" id="org-badge-catalog">/.test(ahtml));
kt('đóng sẵn để không đẩy form nhãn xuống dưới màn hình',
   !/<details class="badge-catalog" id="org-badge-catalog" open/.test(ahtml));
kt('mở tab Nhãn thì nạp luôn danh mục', /loadBadgeCatalog\?\.\(\)[\s\S]{0,120}loadBadgeGallery\?\.\(\)/.test(ojs));
kt('không còn chọi lại luật !important của dải tab',
   !/\.org-tabs\{flex-wrap:wrap/.test(acss));
kt('gallery đổi được khung và ngôn ngữ',
   ahtml.includes('id="org-badge-gallery-frame"') && ahtml.includes('id="org-badge-gallery-lang"'));
kt('danh sách ngôn ngữ dựng từ danh mục, không chép cứng',
   /BADGE_CATALOG\.ngonNgu \|\| \[\]\)\.map/.test(ajs));
kt('tạo nhãn thẳng từ mẫu', /data-badge-make/.test(ajs) && /badgeCode: ma/.test(ajs));
kt('mẫu đã có nhãn thì không mời tạo lại',
   /daCo = new Set\(\(window\.ORG_TAGS \|\| \[\]\)\.map\(\(t\) => t\.badge_code\)/.test(ajs));
kt('gallery nói rõ ảnh đang lấy từ đâu', /Ảnh lấy từ: /.test(ajs));
kt('gallery trống thì hướng dẫn cách sửa', /Giải nén badges\.zip vào/.test(ajs));
for (const luat of ['.badge-gallery{', '.badge-card{', '.menu-badge-img{', '.badge-catalog{'])
  kt(`admin.css có ${luat}`, acss.includes(luat));

kt('ô xem trước đổi sang ẢNH khi đã chọn mẫu',
   ahtml.includes('id="org-tag-preview-img"')
   && /img\?\.classList\.toggle\('hide', !ma\)/.test(ajs));

kt('Agent nói rõ khi nhãn chưa gắn ảnh', /menu-tag-note[\s\S]{0,200}chưa gắn ảnh/.test(mjs));
// Ghi chú theo dòng chỉ hiện SAU khi tích, nên chưa đủ: chưa nhãn nào có ảnh
// thì phải nói ngay một câu ở đầu ô, đừng bắt tích thử từng nhãn mới biết.
kt('Agent báo ngay khi CHƯA nhãn nào có ảnh',
   /const chuaCoAnh = TAGS\.every\(\(tag\) => !tag\.badge_code\)/.test(mjs)
   && /box\.innerHTML = nhacChung \+ TAGS\.map/.test(mjs));
kt('menu-console.css có .menu-tag-note-top{', mcss.includes('.menu-tag-note-top{'));
kt('menu-console.css có .menu-tag-note{', mcss.includes('.menu-tag-note{'));

kt('admin.html đã nâng số phiên bản tệp tĩnh', /v=r1[6-9][0-9]/.test(ahtml) && !ahtml.includes('v=r163'));


console.log('\n=== KHỔ ĐIỆN THOẠI ===');
// Đo ở 375px: ô cuộn cao 268px chỉ hở hơn hai hàng trên năm, hàng bị cắt ngang
// trông như lỗi hiển thị; hai ô chọn 92px cố định không đủ cho "Khung cánh hoa".
const mob = acss.slice(acss.lastIndexOf('@media (max-width:720px)'));
kt('có khối media query cho điện thoại', acss.includes('@media (max-width:720px)'));
kt('lưới chọn cao theo màn hình thay vì 268px cố định', /\.badge-grid\{max-height:46vh/.test(mob));
kt('ô nhãn nhỏ lại ở khổ hẹp', /minmax\(76px/.test(mob));
kt('ô chọn khung chiếm nguyên hàng', /\.badge-frame\{flex:1 0 100%;\}/.test(mob));
kt('ô xem trước xếp dọc', /\.tag-preview-row\{flex-direction:column/.test(mob));
kt('hai ô chọn của danh mục chia đôi hàng', /\.org-field-narrow\{flex:1 1 calc\(50% - 6px\);\}/.test(mob));
kt('thẻ danh mục hai cột ở khổ hẹp', /\.badge-gallery\{grid-template-columns:repeat\(auto-fill,minmax\(112px/.test(mob));
kt('Agent: ô chọn khung xuống hàng riêng ở khổ hẹp',
   /@media \(max-width:720px\)\{[\s\S]{0,240}\.menu-tag-frame select\{flex:1 1 100%\}/.test(mcss));

console.log(`\n${dat}/${dat + truot} đạt`);
process.exit(truot ? 1 : 0);
