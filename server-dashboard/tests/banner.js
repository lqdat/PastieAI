// BANNER ĐẦU THỰC ĐƠN: BẤM LƯU LÀ LƯU THẬT.
//
// Bản trước gom mọi thay đổi vào bộ nhớ tạm rồi chờ bấm một nút "Lưu banner"
// THỨ HAI ở góc trên bảng. Hai chỗ hỏng:
//   · Nút đó mặc định ẩn (class="hide"), chỉ hiện khi đã có thay đổi. Người
//     dùng thêm banner, thấy nó nằm trong danh sách, đóng bảng — mất sạch.
//     Đó chính là "thêm banner không được".
//   · Hộp thêm banner đã có nút lưu của nó. Hai nút lưu cho một việc thì nút
//     nào cũng có vẻ đã đủ.
const fs = require('fs');
const path = require('path');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

const tim = (...p) => p.find((x) => fs.existsSync(x)) || null;
const KHO = tim(path.join(__dirname, '..', 'pastie-dashboard', 'src'), path.join(__dirname, 'ag'));
const KHO_SV = tim(path.join(__dirname, '..', 'server-dashboard'), path.join(__dirname, 'sv'));
check('tìm thấy bảng điều khiển Agent', Boolean(KHO));
if (!KHO) { console.log('\nThiếu kho.'); process.exit(1); }
const js = fs.readFileSync(path.join(KHO, 'menu-console.js'), 'utf8');
const html = fs.readFileSync(path.join(KHO, 'admin.html'), 'utf8');

// ── 1. KHÔNG CÒN BẢN NHÁP ─────────────────────────────────────────────────
const maThuc = js.split('\n').filter((d) => !d.trim().startsWith('//')).join('\n');
for (const bien of ['PENDING_BANNER_FILES', 'DELETED_BANNER_IDS', 'BANNER_DIRTY']) {
  check(`không còn biến tạm ${bien}`, !new RegExp(bien).test(maThuc),
    'giữ bản nháp là giữ lại đúng trạng thái làm mất dữ liệu của người dùng');
}
check('không còn cờ _isNew/_dirty trên banner', !/_isNew|_dirty/.test(maThuc));
check('không còn hàm lưu hàng loạt', !/saveAllBanners/.test(maThuc));
check('không còn nút "Lưu banner" thứ hai', !/menu-banner-save-btn/.test(html + maThuc),
  'nút ẩn theo trạng thái là nút người dùng không biết mình phải bấm');
check('không còn câu dặn "Áp dụng vào danh sách" rồi lưu lần hai',
  !/Áp dụng vào danh sách|lưu tạm vào danh sách/.test(html));

// ── 2. HỘP THÊM BANNER LƯU THẲNG ──────────────────────────────────────────
const khoiLuu = js.slice(js.indexOf("$('menu-banner-modal-form')?.addEventListener('submit'"),
                         js.indexOf("$('menu-banner-add')?.addEventListener('click'"));
check('hộp thêm banner gọi API ngay khi bấm Lưu',
  /await fetchMenu\('\/banners', \{[\s\S]{0,120}method: 'POST'/.test(khoiLuu));
check('sửa banner có sẵn thì gọi PUT, không tạo thêm bản ghi',
  /await fetchMenu\(`\/banners\/\$\{bannerId\}`, \{[\s\S]{0,120}method: 'PUT'/.test(khoiLuu));
check('tạo bản ghi TRƯỚC rồi mới tải ảnh',
  khoiLuu.indexOf("method: 'POST'") < khoiLuu.indexOf('/image'),
  'đường tải ảnh cần một id có thật — không đảo thứ tự được');
check('đọc đúng hình dạng máy chủ trả về',
  /tao\?\.banner\?\.id \|\| tao\?\.id/.test(khoiLuu),
  'đọc thiếu thì bước tải ảnh im lặng bị bỏ qua và banner mới hiện ra không có ảnh');
check('dừng lại khi máy chủ không trả id',
  /Máy chủ không trả về banner vừa tạo/.test(khoiLuu),
  'đi tiếp với id rỗng là gọi /banners/undefined/image rồi báo một lỗi không ai hiểu');
check('khoá nút Lưu trong lúc gọi mạng',
  /nut\.disabled = true/.test(khoiLuu),
  'lưu là vài lượt gọi nối nhau — bấm hai lần ra hai banner giống hệt');
check('mở khoá nút kể cả khi lỗi', /finally \{[\s\S]{0,140}nut\.disabled = false/.test(khoiLuu),
  'lỗi một lần rồi nút kẹt disabled là phải tải lại cả trang');
check('lưu xong thì nạp lại từ máy chủ', /await loadBanners\(\)/.test(khoiLuu),
  'giữ bản dựng ở máy là ảnh vẫn là blob tạm, tải lại trang một cái là trắng');

// ── 3. THAO TÁC TRÊN THẺ CŨNG LƯU NGAY ───────────────────────────────────
check('đổi sản phẩm đích / thứ tự lưu ngay', /async function luuMotBanner\(id, than\)/.test(js));
check('bật tắt banner lưu ngay', /luuMotBanner\(b\.id, \{ isActive: !b\.is_active \}\)/.test(js));
check('xoá banner gọi DELETE ngay',
  /await fetchMenu\(`\/banners\/\$\{xoa\.dataset\.bannerDelete\}`, \{ method: 'DELETE' \}\)/.test(js));
check('hỏi trước khi xoá, và nói rõ ảnh cũng mất',
  /Ảnh của nó cũng bị xoá luôn/.test(js),
  'xoá là xoá luôn vật thể trên S3, không có bước hoàn tác');

// ── 4. MÁY CHỦ CÓ NHẬN ĐỦ TRƯỜNG KHÔNG ───────────────────────────────────
if (KHO_SV) {
  const srv = fs.readFileSync(path.join(KHO_SV, 'server.js'), 'utf8');
  const post = srv.slice(srv.indexOf("app.post('/api/agent/menu/banners'"), srv.indexOf("app.post('/api/agent/menu/banners/:id/image'"));
  for (const truong of ['titleVi', 'titleEn', 'excerptVi', 'contentVi', 'sortOrder', 'isActive']) {
    check(`máy chủ nhận "${truong}" lúc tạo banner`, new RegExp(truong).test(post),
      'gửi lên mà máy chủ không đọc thì banner tạo ra trống trơn');
  }
  // Hai trường đã gỡ: cột vẫn nằm trong bảng cho dữ liệu cũ, nhưng endpoint
  // không được đọc nữa — đọc lại là mở đường cho luồng cũ quay về.
  for (const truong of ['category', 'targetItemId']) {
    check(`máy chủ KHÔNG còn đọc "${truong}" lúc tạo banner`, !new RegExp(truong).test(post));
  }
}

// ── 5. BANNER LÀ BÀI VIẾT, KHÔNG PHẢI LIÊN KẾT SẢN PHẨM ──────────────────
const KHO_PT = tim(path.join(__dirname, '..', 'qr-chat-portal', 'app'), path.join(__dirname, 'pt'));
if (KHO_PT) {
  const tsx = fs.readFileSync(path.join(KHO_PT, 'page.tsx'), 'utf8');
  // Chuẩn hoá MẠNH TAY: bỏ cả khoảng trắng quanh { } : ; ,
  //
  // Tệp này có chỗ viết sát (.menu-badge{...}) và chỗ viết thoáng
  // (.article-reader-back-btn { ... }). Chỉ bỏ xuống dòng thì luật viết thoáng
  // không khớp mẫu nào, và phép đo báo "không tìm thấy" trong khi luật vẫn nằm
  // đó — bài đo hỏng chứ không phải mã hỏng. Đã dính đúng vậy.
  const css = fs.readFileSync(path.join(KHO_PT, 'globals.css'), 'utf8')
    .replace(/\s*\n\s*/g, '')
    .replace(/\s*([{};:,])\s*/g, '$1');

  check('bấm banner MỞ BÀI VIẾT, không mở sản phẩm',
    /setActiveArticle\(\{/.test(tsx.slice(tsx.indexOf('const bannerBam'), tsx.indexOf('const renderMenuItem'))),
    'banner giờ là bài viết — mở sản phẩm là luồng cũ');
  check('banner trống trơn thì không mở gì',
    /!banner\.title && !banner\.content && !banner\.excerpt/.test(tsx),
    'một trang bài viết chỉ có mỗi tấm ảnh và không một chữ nào là ngõ cụt');
  check('vuốt xong KHÔNG bị tính là bấm',
    /Math\.abs\(bannerDragRef\.current\.lech\) > 8/.test(tsx));
  check('kiểu dữ liệu banner KHÔNG còn liên kết sản phẩm',
    !/target_item_id/.test(tsx), 'còn trường này là còn đường quay lại luồng cũ');
  check('banner KHÔNG còn danh mục',
    !/banner\.category|category: banner/.test(tsx));
  check('trình đọc chỉ vẽ nhãn danh mục khi THẬT SỰ có chữ',
    /activeArticle\.category \? <span className="article-reader-category">/.test(tsx),
    'rơi về "ƯU ĐÃI" là gán cho banner một danh mục nó không có');

  check('tiêu đề hiện DƯỚI tấm banner',
    /<figcaption className="menu-banner-title">\{banner\.title\}<\/figcaption>/.test(tsx),
    'đè lên ảnh thì chồng với chữ Agent đã in sẵn trong ảnh');
  check('tiêu đề cắt đúng hai dòng', /\.menu-banner-title\{[^}]*-webkit-line-clamp:2/.test(css));
  check('giữ chỗ đủ hai dòng kể cả tiêu đề ngắn',
    /\.menu-banner-title\{[^}]*min-height:2\.64em/.test(css),
    'không giữ thì tấm tiêu đề dài cao hơn tấm ngắn — đo được 184px so với 165px, dải giật mỗi lần vuốt');
  check('chấm chỉ vị trí xuống dưới phần chữ',
    /\.menu-banner-strip:has\(\.menu-banner-title\) \.menu-banner-dots\{position:static/.test(css),
    'giữ vị trí tuyệt đối cũ là chấm đè lên đúng dòng tiêu đề');
  check('chấm đổi màu cho thấy được trên nền sáng',
    /\.menu-banner-strip:has\(\.menu-banner-title\) \.menu-banner-dots i\{background:rgba\(80,45,69,\.24\)\}/.test(css),
    'chấm trắng trên nền sáng thì không nhìn thấy gì — trước đây nó nằm trên ảnh');
  check('tỉ lệ 16:6 và góc bo chuyển xuống riêng tấm ảnh',
    /\.menu-banner-strip:has\(\.menu-banner-title\) \.menu-banner-rail>figure>button\{aspect-ratio:16\/6;border-radius:18px/.test(css));

  // Hai lỗi đã thật sự gây ra khi thêm tiêu đề, và đã sửa:
  check('dải banner VẪN cắt các tấm chưa tới lượt',
    /\.menu-banner-strip:has\(\.menu-banner-title\)\{[^}]*overflow:hidden/.test(css),
    'bỏ overflow là tấm thứ hai, thứ ba tràn sang phải và kéo giãn cả hộp thực đơn — màn hình khách trượt ngang được');
  check('khoảng cách giữa hai tấm nằm ở LỀ TRONG, không phải gap',
    /\.menu-banner-strip:has\(\.menu-banner-title\) \.menu-banner-rail>figure\{box-sizing:border-box;padding:0 5px;?\}/.test(css),
    'hàng ngang dịch đúng `chỉ số × 100%` — thêm gap là mỗi tấm lệch dần, tới tấm thứ tư lệch nửa ảnh');
  check('bù lề trong để mép ảnh thẳng hàng với danh sách',
    /\.menu-banner-strip:has\(\.menu-banner-title\)\{[^}]*margin:0 -5px 18px/.test(css));
  check('vùng cuộn thực đơn KHÔNG BAO GIỜ trượt ngang',
    /\.menu-scroll\{overflow-x:hidden\}/.test(css),
    'chốt chặn cuối: nguyên nhân tràn ngang có thể nằm ở bất kỳ phần tử con nào');

  // ── Trình đọc bài viết: mở từ banner ra phải dùng được ───────────────
  //
  // Hai lỗi thật, đều lộ ra khi bấm banner mở bài viết:
  check('tấm bài viết đo theo khung ĐANG THẤY, không phải khung lớn',
    /\.article-reader-sheet\{[^}]*height:92dvh/.test(css),
    'vh đo theo khung lúc thanh địa chỉ đã thu — tấm neo đáy nên đỉnh bị đẩy lên sau thanh địa chỉ, và đỉnh chính là hàng nút Quay lại / Đóng');
  check('… và vẫn giữ đường lui vh cho trình duyệt cũ',
    /height:92vh;height:92dvh/.test(css));
  check('hàng nút tránh phần lẹm của máy có tai thỏ',
    /\.article-reader-topbar\{[^}]*padding:calc\(12px \+ env\(safe-area-inset-top\)\)/.test(css));
  check('nút "Quay lại" KHÔNG bị ép thành hình tròn 32px',
    /\.article-reader-back-btn\{[^}]*border-radius:999px/.test(css)
    && !/\.article-reader-back-btn,\.article-reader-close-btn\{/.test(css),
    'dùng chung luật với nút đóng là chữ "Quay lại" bị xén, còn lại một hình tròn trống và một mẩu chữ thò ra');
  check('nút đóng vẫn là hình tròn 32px',
    /\.article-reader-close-btn\{[^}]*max-width:32px/.test(css));
  check('nhãn danh mục co được, không đẩy nút đóng ra khỏi mép',
    /\.article-reader-category\{[^}]*text-overflow:ellipsis/.test(css));
}

// ── 6. MÁY CHỦ KHÔNG CÒN GHI HAI TRƯỜNG ĐÓ ───────────────────────────────
if (KHO_SV) {
  const srv = fs.readFileSync(path.join(KHO_SV, 'server.js'), 'utf8');
  const khach = srv.slice(srv.indexOf('const bannerRows = await db.query'), srv.indexOf('// ẢNH BÌA:'));
  check('dữ liệu cho khách không còn target_item_id', !/b\.target_item_id/.test(khach));
  check('dữ liệu cho khách không còn category',
    !/category: banner\.category/.test(khach));
  check('dữ liệu cho khách CÓ tiêu đề đã dịch', /title: displayTitle/.test(khach));
  const put = srv.slice(srv.indexOf("app.put('/api/agent/menu/banners/:id'"), srv.indexOf("app.delete('/api/agent/menu/banners/:id'"));
  check('API sửa banner không còn ghi target_item_id', !/SET target_item_id/.test(put));
}

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
