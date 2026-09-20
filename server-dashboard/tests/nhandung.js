// BADGE NHÃN: SUPERADMIN ĐẶT KIỂU, KHÁCH THẤY ĐÚNG KIỂU ĐÓ.
//
// Hình dáng badge được vẽ ở HAI nơi: khung xem trước trong console Superadmin,
// và thẻ sản phẩm ở cổng khách. Sửa một bên mà quên bên kia thì người cấu hình
// chọn "ngôi sao", xem trước ra ngôi sao, còn khách nhìn thấy một hình khác —
// và không ai phát hiện, vì hai màn hình không bao giờ mở cạnh nhau.
//
// Bài này so từng kiểu ở hai tệp, và so cả đa giác của ngôi sao.
const fs = require('fs');
const path = require('path');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

const tim = (...p) => p.find((x) => fs.existsSync(x)) || null;
const KHO_SA = tim(path.join(__dirname, '..', 'server-dashboard', 'public'),
                   path.join(__dirname, 'sa'));
const KHO_PT = tim(path.join(__dirname, '..', 'qr-chat-portal', 'app'),
                   path.join(__dirname, 'pt'));
const KHO_SV = tim(path.join(__dirname, '..', 'server-dashboard'),
                   path.join(__dirname, 'sv'));
check('tìm thấy console Superadmin', Boolean(KHO_SA));
check('tìm thấy cổng khách', Boolean(KHO_PT));
check('tìm thấy máy chủ', Boolean(KHO_SV));
if (!KHO_SA || !KHO_PT || !KHO_SV) { console.log('\nThiếu kho để đối chiếu.'); process.exit(1); }

const doc = (kho, ten) => { const p = path.join(kho, ten); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
const gon = (x) => x.replace(/\s*\n\s*/g, '');
const saHtml = doc(KHO_SA, 'admin.html');
const saJs = doc(KHO_SA, 'admin.js');
const saOrg = doc(KHO_SA, 'org-console.js');
const saCss = gon(doc(KHO_SA, 'admin.css'));
const ptCss = gon(doc(KHO_PT, 'globals.css'));
const ptTsx = doc(KHO_PT, 'page.tsx');
const srv = doc(KHO_SV, 'server.js');
const db = doc(KHO_SV, 'database.js');

const KIEU = ['star', 'seal', 'pill', 'ribbon'];

// ── 1. CSDL VÀ API ────────────────────────────────────────────────────────
check('CSDL có cột badge_style', /badge_style VARCHAR\(20\) NOT NULL DEFAULT 'star'/.test(db));
check('có bước nâng cấp cho bảng đã tồn tại',
  /ALTER TABLE qr_menu_tags ADD COLUMN IF NOT EXISTS badge_style/.test(db),
  'CREATE TABLE IF NOT EXISTS bỏ qua cột mới với bảng cũ — máy đang chạy sẽ thiếu cột');
check('máy chủ kiểm kiểu trong danh sách ĐÓNG',
  /const KIEU_BADGE = \['star', 'seal', 'pill', 'ribbon'\]/.test(srv)
  && /KIEU_BADGE\.includes\(kieu\) \? kieu : macDinh/.test(srv),
  'giá trị này đi thẳng vào tên class CSS bên cổng khách');
check('API tạo nhãn nhận badgeStyle', /kieuBadgeHopLe\(req\.body\?\.badgeStyle, 'star'\)/.test(srv));
check('API sửa nhãn giữ kiểu cũ khi không gửi',
  /kieuBadgeHopLe\(req\.body\?\.badgeStyle, found\.rows\[0\]\.badge_style \|\| 'star'\)/.test(srv),
  'rơi về star thay vì giữ nguyên là đổi thầm kiểu của nhãn mỗi lần sửa màu');
check('API cho Agent trả kèm badge_style',
  /SELECT id, code, label, color_bg, color_text, badge_style, sort_order FROM qr_menu_tags/.test(srv));
check('dữ liệu cho cổng khách trả kèm badge_style',
  /g\.color_text, g\.badge_style, g\.sort_order/.test(srv));

// ── 2. MÀN CẤU HÌNH CỦA SUPERADMIN ────────────────────────────────────────
check('có ô chọn kiểu badge', saHtml.includes('id="org-tag-badge"'));
for (const k of KIEU) check(`ô chọn có kiểu "${k}"`, new RegExp(`value="${k}"`).test(saHtml));
check('có khung xem trước trên ảnh sản phẩm giả',
  saHtml.includes('id="org-tag-preview-badge"') && /\.tag-preview-shot\{/.test(saCss),
  'mô tả bằng chữ không nói lên được nó trông ra sao trên ảnh thật');
check('xem trước vẽ lại NGAY khi gõ, không chờ bấm Lưu',
  /\['org-tag-label', 'org-tag-badge', 'org-tag-color-bg', 'org-tag-color-text'\][\s\S]{0,140}addEventListener\('input', veXemTruocTag\)/.test(saJs),
  'bấm Lưu là dịch 6 thứ tiếng mất vài giây — đổi một màu rồi chờ từng đó thì không ai thử');
check('gửi kèm badgeStyle khi lưu', /badgeStyle: document\.getElementById\('org-tag-badge'\)\.value/.test(saJs));
check('mở form SỬA thì nạp đúng kiểu đang lưu',
  /org-tag-badge'\)\.value = tag\.badge_style \|\| 'star'/.test(saJs),
  'bỏ trống thì select giữ kiểu của nhãn sửa trước đó, bấm Lưu là đổi thầm kiểu nhãn này');
check('reset form đưa ô chọn về star',
  /org-tag-badge'\)\.value = 'star'/.test(saJs),
  'form.reset() trả select về option đánh dấu selected, ở đây không có cái nào');
check('danh sách nhãn vẽ ĐÚNG badge, không phải chip chung chung',
  /class="menu-badge is-\$\{escapeHtml\(tag\.badge_style \|\| 'star'\)\}"/.test(saOrg));

// Số phiên bản tệp tĩnh: cơ chế DUY NHẤT bắt trình duyệt tải lại admin.js và
// admin.css. Thêm mã mới mà quên đổi số là người dùng mở lên thấy HTML mới nằm
// trên CSS và JS cũ — ô chọn kiểu badge hiện ra nhưng không có hình dáng nào và
// không có phần xem trước. Đã xảy ra đúng vậy.
const ver = [...new Set((saHtml.match(/\?v=r\d+/g) || []))];
check('mọi tệp tĩnh dùng CÙNG một số phiên bản', ver.length === 1,
  'đang có ' + ver.join(' ') + ' — lẫn lộn là có tệp được tải lại, có tệp không');
check('số phiên bản đã nâng sau khi thêm badge', !ver.includes('?v=r152') && !ver.includes('?v=r160'),
  'giữ số cũ là trình duyệt vẫn dùng admin.js/admin.css trong bộ nhớ đệm');

// ── 3. CỔNG KHÁCH ─────────────────────────────────────────────────────────
check('badge lấy hình dáng từ cấu hình Superadmin',
  /className=\{`menu-badge is-\$\{item\.tags\[0\]\.badge_style \|\| "star"\}`\}/.test(ptTsx));
check('thiếu kiểu thì rơi về star', /badge_style \|\| "star"/.test(ptTsx),
  'nhãn tạo trước khi có cột badge_style vẫn phải ra một badge tử tế');
check('thẻ KHÔNG cắt badge lấn ra ngoài',
  /\.menu-item\{position:relative;overflow:visible\}/.test(ptCss),
  'overflow:hidden là badge bị xén đúng ở mép thẻ');
// Badge neo theo Ô ẢNH, mà ô ảnh đã lùi vào 11px lề của thẻ. Muốn badge vượt
// hẳn mép thẻ thì độ lệch âm phải LỚN HƠN 11px — đó là ý nghĩa của -22px.
const lech = (ptCss.match(/\.menu-badge\{[^}]*left:-(\d+)px/) || [])[1];
check('badge lấn HẲN ra ngoài thẻ, không chỉ tròi khỏi ảnh',
  Number(lech) > 11, `đang lệch -${lech}px, phải hơn 11px (lề thẻ) mới vượt mép thẻ`);
check('badge nằm trên thẻ liền kề phía trên',
  /\.menu-badge\{[^}]*z-index:6/.test(ptCss),
  'phần lấn lên chạm đáy thẻ trên — thiếu z-index là bị thẻ đó che mất');
check('riêng ruy băng thì ô ảnh mới cắt gọn hai đầu',
  /\.menu-item-media:has\(\.menu-badge\.is-ribbon\)\{overflow:hidden/.test(ptCss));
check('KHÔNG còn ruy băng cũ sót lại', !/menu-ribbon/.test(ptCss + ptTsx),
  'để sót hai cách cùng lúc là hai nhãn chồng nhau trên một thẻ');

// ── 4. HAI BỘ CSS PHẢI GIỐNG NHAU ─────────────────────────────────────────
for (const k of KIEU) {
  const re = new RegExp(`\\.menu-badge\\.is-${k}\\{`);
  check(`console Superadmin có luật vẽ "${k}"`, re.test(saCss));
  check(`cổng khách có luật vẽ "${k}"`, re.test(ptCss), 'thiếu một bên là xem trước một đằng, khách thấy một nẻo');
}
const clip = (css) => (css.match(/\.menu-badge\.is-star\{[^}]*clip-path:polygon\(([^)]*)\)/) || [])[1];
check('ngôi sao ở hai bên dùng CÙNG một đa giác', Boolean(clip(saCss)) && clip(saCss) === clip(ptCss),
  'hai đa giác gần giống nhau thì không ai phát hiện, nhưng số răng cưa lại khác');
check('cả hai bên lấy màu qua biến --badge-bg',
  /background:var\(--badge-bg,#e51a82\)/.test(saCss) && /background:var\(--badge-bg,#e51a82\)/.test(ptCss));

// Bẫy đã dính: đặt position:relative lên .menu-badge.is-seal thì bộ chọn hai
// lớp đè position:absolute của lớp gốc, badge rơi vào luồng và đẩy ảnh tụt
// xuống. Dựng ra mới nhìn thấy.
check('con dấu KHÔNG tự đặt position riêng',
  !/\.menu-badge\.is-seal\{[^}]*position:/.test(saCss) && !/\.menu-badge\.is-seal\{[^}]*position:/.test(ptCss),
  'bộ chọn hai lớp đè absolute của lớp gốc — badge rơi vào luồng, đẩy ảnh sản phẩm tụt xuống');
check('position:relative nằm ở lớp gốc để ::before của con dấu bám vào',
  /\.menu-badge\{[^}]*position:relative/.test(saCss) && /\.menu-badge\{[^}]*position:relative/.test(ptCss));
check('vòng đứt nét vẽ bằng ::before, không phải border của badge',
  /\.menu-badge\.is-seal::before\{[^}]*border:1\.5px dashed/.test(ptCss),
  'border cộng vào kích thước và làm lệch hình tròn');
check('tôn trọng lựa chọn tắt chuyển động',
  /\.menu-badge,\.menu-badge::before,\.menu-badge::after\{transition:none !important/.test(ptCss),
  'bộ chọn * KHÔNG khớp phần tử giả');

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
