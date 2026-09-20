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
  for (const truong of ['titleVi', 'category', 'excerptVi', 'targetItemId', 'sortOrder', 'isActive']) {
    check(`máy chủ nhận "${truong}" lúc tạo banner`, new RegExp(truong).test(post),
      'gửi lên mà máy chủ không đọc thì banner tạo ra trống trơn');
  }
}

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
