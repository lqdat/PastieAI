// HẾT HẠN PHIÊN VÀ BỊ ĐĂNG NHẬP Ở MÁY KHÁC LÀ HAI CHUYỆN KHÁC NHAU.
//
// Khách ngồi lâu quá hạn, tải lại trang, và nhận được dòng:
//
//     "Tài khoản đã đăng nhập trên thiết bị khác.
//      Phiên trên thiết bị này đã kết thúc."
//
// Sai, và sai theo kiểu làm khách hoảng: họ tưởng có người lạ đang dùng tài
// khoản mình. Nguyên nhân: máy chủ trả CÙNG MỘT MÃ `DEVICE_REPLACED` cho cả hai
// nhánh của validateVisitorDeviceToken — nhánh token không khớp (đúng là máy
// khác) và nhánh token hết hạn / bị đăng xuất (chẳng liên quan gì máy khác).
const fs = require('fs');
const path = require('path');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

// ── 1. MÁY CHỦ TÁCH HAI MÃ ───────────────────────────────────────────────
const ham = src.slice(src.indexOf('async function validateVisitorDeviceToken'),
                      src.indexOf('async function touchQrIdentity'));
check('tìm thấy hàm kiểm thiết bị của khách', ham.length > 200);

const maTrongHam = [...ham.matchAll(/code: '([A-Z_]+)'/g)].map((m) => m[1]);
check('hai nhánh trả HAI mã khác nhau, không dùng chung',
  new Set(maTrongHam).size === maTrongHam.length && maTrongHam.length >= 2,
  'đang trả: ' + maTrongHam.join(', '));
check('nhánh token không khớp vẫn là DEVICE_REPLACED',
  maTrongHam[0] === 'DEVICE_REPLACED', maTrongHam.join(', '));
check('nhánh hết hạn / bị đăng xuất có mã riêng IDENTITY_EXPIRED',
  maTrongHam.includes('IDENTITY_EXPIRED'), maTrongHam.join(', '));

// Câu chữ máy chủ cũng phải khớp với nguyên nhân thật. Chỉ soi đúng chuỗi
// `error:` đi kèm mã đó — không soi cả đoạn, vì chú thích giải thích lỗi cũ
// cũng nhắc tới "thiết bị khác" và sẽ làm phép đo báo sai.
const cauHetHan = (ham.match(/error: '([^']*)',\s*\n\s*code: 'IDENTITY_EXPIRED'/) || [])[1] || '';
check('câu của nhánh hết hạn KHÔNG nhắc tới thiết bị khác',
  Boolean(cauHetHan) && !/thiết bị khác/.test(cauHetHan),
  `câu đang là: "${cauHetHan}"`);
check('… mà nói đúng chuyện hết hạn / đăng xuất',
  /hết hạn|đăng xuất/.test(cauHetHan), `câu đang là: "${cauHetHan}"`);

// ── 2. CỔNG KHÁCH HIỂU ĐƯỢC MÃ MỚI, VÀ DỊCH CÂU ĐÓ ──────────────────────
//
// Cổng khách nằm ở kho khác; chỉ đo khi tìm thấy để bài này chạy được ở cả hai
// nơi mà không phụ thuộc bố cục thư mục.
const duongCong = [
  path.join(__dirname, '..', '..', 'qr-chat-portal', 'app', 'page.tsx'),
  path.join(__dirname, '..', '..', 'kk', 'app', 'page.tsx'),
].find((p) => fs.existsSync(p));

if (!duongCong) {
  console.log('  · không thấy nguồn cổng khách ở máy này — bỏ qua phần 2');
} else {
  const tsx = fs.readFileSync(duongCong, 'utf8');

  check('cổng khách nhận ra mã IDENTITY_EXPIRED',
    /data\?\.code === "IDENTITY_EXPIRED"/.test(tsx));
  // Phải xét mã cụ thể TRƯỚC lượt bắt 409 chung, nếu không mọi thứ vẫn rơi vào
  // nhánh "thiết bị khác" như cũ.
  check('… và xét mã đó TRƯỚC lượt bắt 409 chung',
    tsx.indexOf('IDENTITY_EXPIRED') < tsx.indexOf('response.status === 409 || data?.code === "DEVICE_REPLACED"'),
    'xét sau thì 409 nuốt mất, mã mới không bao giờ tới lượt');

  check('vòng hỏi tin cũng đọc mã trong thân phản hồi, không chỉ nhìn mã HTTP',
    /than\?\.code === "IDENTITY_EXPIRED" \? sysCopy\.sessionExpired : sysCopy\.deviceReplaced/.test(tsx),
    'chỉ nhìn 409 thì khách hết hạn vẫn bị báo là đăng nhập ở máy khác');

  const soBan = (tsx.match(/sessionExpired:/g) || []).length;
  check('câu "phiên hết hạn" có đủ 6 tiếng (+ bản dự phòng)', soBan >= 7, `mới có ${soBan} bản`);

  // BẢN DỰ PHÒNG PHẢI CÓ ĐỦ KHOÁ.
  //
  // Bản dự phòng vốn thiếu hẳn `deviceReplaced`, nên khi khách CHƯA chọn ngôn
  // ngữ — đúng màn đăng nhập, đúng chỗ câu này hay hiện — sysCopy.deviceReplaced
  // ra undefined và khách không đọc được gì cả.
  const duPhong = tsx.slice(tsx.indexOf('} as Record<string, Record<string, string>>)[language] || {'));
  const doanDuPhong = duPhong.slice(0, duPhong.indexOf('};') + 2);
  for (const khoa of ['deviceReplaced', 'sessionExpired', 'ended']) {
    check(`bản dự phòng có khoá "${khoa}"`, doanDuPhong.includes(khoa + ':'),
      'thiếu khoá thì khách nhận undefined, không phải một câu');
  }

  const banSessionExpired = (tsx.match(/sessionExpired: "([^"]*)"/g) || []).join(' ');
  check('bản Kazakh viết bằng chữ riêng của tiếng Kazakh', /[әғқңөұүһі]/i.test(banSessionExpired));
  check('có bản Hangul', /[가-힣]/.test(banSessionExpired));
  check('có bản chữ Hán', /[一-鿿]/.test(banSessionExpired));
}

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
