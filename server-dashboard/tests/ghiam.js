// GHI ÂM MÀ KHÔNG NÓI GÌ THÌ PHẢI RA "KHÔNG NGHE THẤY", KHÔNG RA MỘT CÂU LẠ.
//
// Bấm nút ghi âm rồi im lặng, khách thấy trong ô chat của mình dòng:
//
//     "Hãy subscribe cho kênh Ghiền Mì Gõ để không bỏ lỡ những video hấp dẫn"
//     "Cảm ơn các bạn đã theo dõi và hẹn gặp lại"
//
// Không phải lỗi ngẫu nhiên. Whisper được luyện trên phụ đề YouTube, nên khi
// không có tiếng nói nó rơi về câu xuất hiện dày đặc nhất trong dữ liệu luyện.
// Với tiếng Việt, đó là lời kêu gọi đăng ký kênh và câu chào cuối video.
//
// Bài này KHÔNG gọi Groq: gọi thật thì tốn lượt, cần khoá, và không dựng lại
// được đúng đoạn im lặng gây ra ảo giác. Thay vào đó đo thẳng bộ lọc — thứ
// quyết định câu nào tới được mắt khách.
//
// Hai vế phải đo cùng nhau, và vế thứ hai mới là vế khó: lọc quá tay thì khách
// nói "cảm ơn bạn nhé" cũng bị nuốt mất, mà im lặng thì khách còn biết là mình
// chưa nói, chứ nói xong bị mất chữ thì khách tưởng hệ thống hỏng.
const speech = require('../groq-speech');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

const loc = (t) => speech.sanitizeTranscribedText(t);

// ── 1. HAI CÂU KHÁCH ĐÃ GẶP THẬT ─────────────────────────────────────────
const DA_GAP = [
  'Hãy subscribe cho kênh Ghiền Mì Gõ để không bỏ lỡ những video hấp dẫn',
  'Cảm ơn các bạn đã theo dõi và hẹn gặp lại',
];
for (const cau of DA_GAP) {
  check(`chặn được câu khách đã gặp: "${cau.slice(0, 42)}…"`, loc(cau) === '', `lọt ra: "${loc(cau)}"`);
}

// Whisper trả về cùng một câu với dấu câu và cách viết hoa khác nhau tuỳ lần —
// chặn đúng một cách viết thì lần sau nó đổi dấu chấm là lọt.
const BIEN_THE = [
  'Hãy subscribe cho kênh Ghiền Mì Gõ để không bỏ lỡ những video hấp dẫn.',
  'hãy subscribe cho kênh ghiền mì gõ để không bỏ lỡ những video hấp dẫn!',
  'Cảm ơn các bạn đã theo dõi và hẹn gặp lại.',
  'Cảm ơn các bạn đã theo dõi và hẹn gặp lại!',
  '  Cảm ơn các bạn đã theo dõi và hẹn gặp lại   ',
];
for (const cau of BIEN_THE) {
  check(`chặn cả biến thể dấu câu / viết hoa: "${cau.trim().slice(0, 34)}…"`, loc(cau) === '', `lọt ra: "${loc(cau)}"`);
}

// ── 2. CÁC ẢO GIÁC CÙNG HỌ ───────────────────────────────────────────────
const RAC = [
  'Đăng ký kênh để không bỏ lỡ video mới nhé các bạn',
  'Nhớ bấm chuông thông báo nha',
  'Hẹn gặp lại các bạn trong video tiếp theo',
  'Chúc các bạn xem video vui vẻ',
  'Thanks for watching!',
  'Thank you for watching.',
  'Please subscribe to my channel',
  'Subtitles by the Amara.org community',
  'Подписывайтесь на канал',
  '请订阅我的频道',
  '구독과 좋아요 부탁드립니다',
  '[Applause]',
  '(tiếng nhạc)',
  '...',
  '。',
  'Âm nhạc',
  'you',
];
for (const cau of RAC) {
  check(`chặn ảo giác: "${cau.slice(0, 40)}"`, loc(cau) === '', `lọt ra: "${loc(cau)}"`);
}

// ── 3. VÀ ĐÂY LÀ VẾ QUAN TRỌNG HƠN: KHÔNG ĐƯỢC NUỐT CHỮ KHÁCH NÓI THẬT ───
//
// Bộ lọc chặn "cảm ơn các bạn đã theo dõi và hẹn gặp lại" phải TRÙNG CẢ CÂU.
// Nếu nó chỉ cần CHỨA chữ "cảm ơn" thì mỗi lời cảm ơn của khách đều biến mất.
const KHACH_NOI_THAT = [
  'Cảm ơn bạn nhé',
  'Cảm ơn, cho tôi thêm một ly cà phê',
  'Cảm ơn các bạn nhiều lắm',
  'Cho tôi xem thực đơn với',
  'Hẹn gặp lại quán lần sau nhé, hôm nay đồ ăn ngon lắm',
  'Bàn mình đặt thêm hai phần nữa được không',
  'Thank you, can I get the bill please',
  'Tôi muốn đăng ký làm thành viên của quán',
  'Рахмет, есеп-шотты бере аласыз ба',
  '谢谢，请给我菜单',
];
for (const cau of KHACH_NOI_THAT) {
  check(`GIỮ LẠI chữ khách nói thật: "${cau.slice(0, 44)}"`, loc(cau) === cau,
    `bị nuốt mất — trả về "${loc(cau)}"`);
}

// "Tôi muốn đăng ký làm thành viên" chứa "đăng ký" nhưng KHÔNG chứa "đăng ký
// kênh" — ranh giới này là cố ý, ghi rõ ra đây để lần sau không ai nới lỏng.
check('dấu hiệu rác đủ hẹp: "đăng ký" một mình không bị chặn',
  loc('Tôi muốn đăng ký nhận ưu đãi') !== '',
  'chặn theo "đăng ký" trống là nuốt cả câu khách nói thật');

// ── 4. CHUẨN HOÁ ─────────────────────────────────────────────────────────
check('chuẩn hoá bỏ dấu tiếng Việt để so được',
  speech.chuanHoaDeSo('Cảm ơn các bạn đã theo dõi!') === 'cam on cac ban da theo doi');
check('chuẩn hoá giữ chữ Kirin, Hán, Hangul (không bị bỏ sạch)',
  speech.chuanHoaDeSo('Спасибо') === 'спасибо' && speech.chuanHoaDeSo('谢谢') === '谢谢');

// ── 5. GỢI Ý NGÔN NGỮ CÓ ĐỦ 6 THỨ TIẾNG ──────────────────────────────────
//
// Đoán sai ngôn ngữ là nguồn sinh ảo giác lớn nhất. Thiếu một mã ở đây nghĩa là
// nhóm khách đó bị để cho mô hình tự đoán.
for (const ma of ['vi', 'en', 'ru', 'zh', 'ko', 'kk']) {
  check(`gợi ý ngôn ngữ nhận "${ma}"`, speech.normalizeLanguageHint(ma) === ma,
    `trả về ${JSON.stringify(speech.normalizeLanguageHint(ma))}`);
}
check('mã lạ thì không gợi ý gì, để mô hình tự đoán', speech.normalizeLanguageHint('xx') === null);

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
