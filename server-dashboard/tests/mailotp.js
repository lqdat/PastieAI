// MAIL OTP PHẢI ĐI RA BẰNG NGÔN NGỮ KHÁCH CHỌN.
//
// Đây là thứ ĐẦU TIÊN khách nhận được từ hệ thống — trước cả khung chat, trước
// cả lời chào. Khách chọn tiếng Hàn ở màn đăng nhập mà nhận một lá thư tiếng
// Việt thì không biết phải làm gì với sáu con số trong đó.
//
// Lỗi gốc: cổng khách VẪN LUÔN gửi kèm `language` trong lượt gọi /api/otp/send,
// nhưng máy chủ chỉ đọc { email, projectId } rồi gọi sendOTPEmail(email, code)
// — hàm đó không có tham số ngôn ngữ và viết cứng tiếng Việt cả tiêu đề lẫn
// thân mail.
//
// Bài này KHÔNG gửi mail thật: gửi thật cần khoá Resend, tốn tiền, và thư đã đi
// thì không đọc lại được. Thay vào đó đo đúng hai thứ quyết định nội dung —
// bảng chữ trong resend-helper, và việc máy chủ có truyền ngôn ngữ xuống không.
const fs = require('fs');
const path = require('path');
const resend = require('../resend-helper');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

const NGON_NGU = ['vi', 'en', 'ru', 'zh', 'ko', 'kk'];
const coTiengViet = (t) => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(String(t || ''));
const RIENG_KK = 'әғқңөұүһіӘҒҚҢӨҰҮҺІ';

(async () => {
  // ── 1. BẢNG CHỮ CÓ ĐỦ 6 NGÔN NGỮ, KHÔNG THIẾU KHOÁ NÀO ───────────────────
  const bang = resend.NOI_DUNG_OTP;
  check('bảng chữ mail OTP được xuất ra để đo được', Boolean(bang), 'thiếu NOI_DUNG_OTP');
  if (!bang) { console.log('\nHỎNG 1'); process.exit(1); }

  for (const ma of NGON_NGU) {
    check(`mail OTP có bản "${ma}"`, Boolean(bang[ma]), Object.keys(bang).join(', '));
  }

  const khoaVi = Object.keys(bang.vi);
  for (const ma of NGON_NGU) {
    const thieu = khoaVi.filter((k) => !bang[ma] || !String(bang[ma][k] || '').trim());
    check(`bản "${ma}" không bỏ trống phần nào của lá thư`,
      thieu.length === 0, 'thiếu: ' + thieu.join(', '));
  }

  // ── 2. MỖI BẢN THẬT SỰ LÀ NGÔN NGỮ ĐÓ, KHÔNG PHẢI TIẾNG VIỆT CHÉP LẠI ────
  for (const ma of NGON_NGU.filter((x) => x !== 'vi')) {
    const chu = Object.values(bang[ma] || {}).join(' ');
    check(`bản "${ma}" không còn sót tiếng Việt`,
      !coTiengViet(chu), Object.values(bang[ma] || {}).find((v) => coTiengViet(v)) || '');
  }
  check('bản Kazakh viết bằng chữ Kazakh thật, không phải tiếng Nga chép lại',
    [...RIENG_KK].some((c) => Object.values(bang.kk).join(' ').includes(c)),
    JSON.stringify(bang.kk).slice(0, 120));
  check('bản Hàn dùng chữ Hangul', /[가-힣]/.test(Object.values(bang.ko).join(' ')));
  check('bản Trung dùng chữ Hán', /[一-鿿]/.test(Object.values(bang.zh).join(' ')));
  check('bản Nga dùng chữ Kirin', /[Ѐ-ӿ]/.test(Object.values(bang.ru).join(' ')));

  // ── 3. HÀM CHỌN CHỮ TRẢ ĐÚNG BẢN, VÀ RƠI VỀ vi KHI MÃ LẠ ────────────────
  for (const ma of NGON_NGU) {
    check(`chuOtp("${ma}") trả đúng bản "${ma}"`,
      resend.chuOtp(ma).tieuDe === bang[ma].tieuDe, resend.chuOtp(ma).tieuDe);
  }
  check('chuOtp("kk-KZ") vẫn ra bản Kazakh', resend.chuOtp('kk-KZ').tieuDe === bang.kk.tieuDe);
  check('mã lạ thì rơi về tiếng Việt, không vỡ', resend.chuOtp('xx').tieuDe === bang.vi.tieuDe);
  check('không truyền gì thì rơi về tiếng Việt', resend.chuOtp().tieuDe === bang.vi.tieuDe);

  // ── 4. MÁY CHỦ CÓ THẬT SỰ TRUYỀN NGÔN NGỮ XUỐNG KHÔNG ───────────────────
  //
  // Đây là vế thứ hai, và là vế đã hỏng: bảng chữ có đủ 6 thứ tiếng mà máy chủ
  // không truyền mã ngôn ngữ xuống thì mail vẫn đi ra tiếng Việt như cũ.
  const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const loiGoi = [...src.matchAll(/resend\.sendOTPEmail\(([^)]*)\)/g)].map((m) => m[1].trim());
  check('tìm thấy các lời gọi gửi mail OTP', loiGoi.length >= 2, `${loiGoi.length} lời gọi`);

  // Bỏ qua đường thử nghiệm nội bộ (gửi mã cố định 123456 để kiểm cấu hình).
  const loiGoiThat = loiGoi.filter((x) => !x.includes("'123456'"));
  const thieuTieng = loiGoiThat.filter((x) => x.split(',').length < 3);
  check('MỌI lời gọi gửi mail OTP đều truyền kèm ngôn ngữ',
    thieuTieng.length === 0,
    thieuTieng.map((x) => `sendOTPEmail(${x})`).join(' | ')
    + ' — thiếu tham số thứ ba thì hàm rơi về tiếng Việt');

  check('đường /api/otp/send đọc language từ lượt gọi của khách',
    /const ngonNgu = ngonNguKhachHopLe\(req\.body\?\.language\)/.test(src),
    'cổng khách vẫn gửi language, máy chủ chỉ cần đọc nó');

  // Hàm gửi phải NHẬN tham số thứ ba, không chỉ nơi gọi truyền cho có.
  const helper = fs.readFileSync(path.join(__dirname, '..', 'resend-helper.js'), 'utf8');
  check('sendOTPEmail nhận tham số ngôn ngữ',
    /async function sendOTPEmail\(toEmail, otpCode, lang\)/.test(helper));
  check('tiêu đề thư cũng đổi theo ngôn ngữ, không riêng thân thư',
    /subject: `\[OTP\] \$\{otpCode\} - \$\{chu\.tieuDe\}`/.test(helper),
    'tiêu đề là dòng khách nhìn thấy trong hộp thư trước khi mở');


  // ── 5. KHUNG HTML CỦA LÁ THƯ ────────────────────────────────────────────
  //
  // Khung thư từng bị thay bằng một mẫu chung chung (Arial, khung 600px, tiêu
  // đề tím #4f46e5) — không phải màu của Pastie. Đây là thứ ĐẦU TIÊN khách nhận
  // được, và một lá thư không mang màu của quán trông như thư giả mạo, đúng lúc
  // khách đang phải tin tưởng để gõ mã vào.
  //
  // Dựng thư thật qua khungThuOtp chứ không đọc mã nguồn: thiếu một biến thì
  // chỗ đó ra chữ "undefined" trong thư khách, mà đọc mã nguồn không thấy được.
  check('khung thư được tách riêng để dựng thử mà không phải gửi thật',
    typeof resend.khungThuOtp === 'function');

  if (typeof resend.khungThuOtp === 'function') {
    for (const ma of NGON_NGU) {
      const thu = resend.khungThuOtp('482913', resend.chuOtp(ma), 'https://agent.pastiechat.com/pastie-chat-biz-compact.png', ma);
      const chu = resend.chuOtp(ma);

      check(`thư "${ma}" là HTML, không phải chữ trơn`, /^<!doctype html>/i.test(thu));
      check(`thư "${ma}" không sót chỗ nào ra "undefined"`, !thu.includes('undefined'),
        thu.slice(Math.max(0, thu.indexOf('undefined') - 60), thu.indexOf('undefined') + 20));
      check(`thư "${ma}" có mã OTP`, thu.includes('482913'));
      // Đủ CẢ NĂM chuỗi trong bảng chữ — thiếu một chuỗi là mất một đoạn thư.
      for (const khoa of ['h1', 'khongPhanHoi', 'chao', 'moDau', 'nhanOtp', 'hieuLuc', 'hoTro', 'tranTrong', 'banQuyen']) {
        check(`thư "${ma}" có đoạn "${khoa}"`, thu.includes(chu[khoa]),
          `thiếu: ${chu[khoa]}`);
      }
    }

    // Nhận diện Pastie: hồng #ec4899, khung 540px, font hệ thống — cùng bộ với
    // mail OTP nhân viên (sendAdminOTPEmail), đừng để hai lá thư lệch nhau.
    const mau = resend.khungThuOtp('000000', resend.chuOtp('vi'), 'https://x/logo.png', 'vi');
    check('giữ đúng dải màu thương hiệu #F438A1 → #C90C6C',
      mau.includes('#F438A1') && mau.includes('#C90C6C'));
    check('giữ logo Pastie Chat', mau.includes('alt="Pastie Chat"'));
    check('giữ khung thẻ 600px', mau.includes('max-width:600px'));
    check('giữ chân thư: hotline, email, website',
      mau.includes('0984 448 834') && mau.includes('ai@pastie.vn') && mau.includes('pastiechat.com'));
    check('giữ bố cục bảng cho hộp thư cũ (Outlook không dựng được flex/grid)',
      (mau.match(/<table/g) || []).length >= 2 && mau.includes('role="presentation"'));

    // Thẻ <html lang> phải đổi theo tiếng: bộ lọc thư và trình đọc màn hình
    // đều dựa vào nó, để cứng "vi" thì thư tiếng Hàn vẫn khai là tiếng Việt.
    for (const ma of NGON_NGU) {
      const thu = resend.khungThuOtp('1', resend.chuOtp(ma), 'https://x/l.png', ma);
      check(`thẻ <html lang> của thư "${ma}" khai đúng tiếng`,
        thu.includes(`<html lang="${ma}">`));
    }
  }


  // ── 6. CÁC HÀM GỬI MAIL KHÁC KHÔNG ĐƯỢC BIẾN MẤT ───────────────────────
  //
  // Một lượt sửa trước đây đã làm rơi mất sendAccountActivationEmail khỏi tệp
  // này, trong khi server.js gọi nó ở ba chỗ. Gọi một hàm không tồn tại thì
  // lượt tạo tài khoản đổ ngay tại đó — mà không ai thấy cho tới khi có người
  // tạo tài khoản mới.
  //
  // Đo bằng cách đối chiếu THẲNG với các lời gọi trong server.js, nên thêm một
  // hàm gửi mail mới mà quên xuất ra cũng bị bắt.
  {
    const nguon = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    const duocGoi = [...new Set([...nguon.matchAll(/resend\.([a-zA-Z]+)\s*\(/g)].map((m) => m[1]))];
    check('server.js có gọi hàm gửi mail nào đó', duocGoi.length > 0);
    for (const ten of duocGoi) {
      check(`resend-helper xuất ra "${ten}" như server.js đang gọi`,
        typeof resend[ten] === 'function',
        `server.js gọi resend.${ten}(...) mà tệp này không xuất ra — gọi là đổ ngay tại chỗ`);
    }
  }

  // Chữ ký hàm phải khớp với cách server.js gọi.
  check('sendAdminOTPEmail vẫn nhận tham số thứ tư (options: loginUrl, role)',
    /async function sendAdminOTPEmail\(toEmail, otpCode, recipientName = '[^']*', options = \{\}\)/.test(helper),
    'mất options thì nút đăng nhập trong thư nhân viên luôn trỏ về agent, kể cả với Sale');

  console.log('');
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
