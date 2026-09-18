// KAZAKH (kk) Ở PHÍA MÁY CHỦ.
//
// Đo ba thứ mà không đọc mã nguồn thì không chắc được:
//
//   1. normalizeLanguage() trong invoice-helper trả 'vi' cho MỌI mã lạ. Trước
//      đợt này, khách Kazakh mở hoá đơn ra là thấy tiếng Việt mà hệ thống
//      không hề báo lỗi — hỏng âm thầm. Phải đo bằng chính hàm đó.
//   2. Font. DejaVuSans có Cyrillic, nhưng Kazakh có 9 chữ riêng KHÔNG nằm
//      trong bảng chữ Nga (ә ғ қ ң ө ұ ү һ і). Chỉ mở cmap ra xem là chưa đủ —
//      phải dựng PDF thật rồi trích chữ ngược lại.
//   3. Các danh sách mã ngôn ngữ viết cứng rải rác (MENU_LANGS, validLanguages,
//      SUPPORTED_LANGS...). Thiếu một chỗ là thực đơn hoặc tin hệ thống lặng
//      lẽ rơi về tiếng Việt.
const fs = require('fs');
const path = require('path');
const inv = require('../invoice-helper');
const gemini = require('../gemini-helper');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

// 9 chữ riêng của Kazakh + chữ hoa của chúng
const RIENG_THUONG = 'әғқңөұүһі';
const RIENG_HOA = 'ӘҒҚҢӨҰҮҺІ';

(async () => {
  // ── 1. Hoá đơn nhận đúng mã kk ────────────────────────────────────────────
  check('normalizeLanguage("kk") trả về "kk" chứ không rơi về "vi"',
    inv.normalizeLanguage('kk') === 'kk', 'ra "' + inv.normalizeLanguage('kk') + '"');
  check('normalizeLanguage("kk-KZ") cũng ra "kk"',
    inv.normalizeLanguage('kk-KZ') === 'kk', 'ra "' + inv.normalizeLanguage('kk-KZ') + '"');
  check('mã lạ vẫn rơi về "vi" như cũ',
    inv.normalizeLanguage('xx') === 'vi');

  const dEn = inv.dictionary('en');
  const dKk = inv.dictionary('kk');
  const thieu = Object.keys(dEn).filter((k) => !(k in dKk));
  check('từ điển hoá đơn kk có đủ mọi nhãn như bản tiếng Anh',
    thieu.length === 0, 'thiếu: ' + thieu.join(', '));
  check('nhãn hoá đơn kk không bỏ trống chỗ nào',
    Object.values(dKk).every((v) => String(v).trim().length > 0));
  check('từ điển hoá đơn kk là tiếng Kazakh thật, không phải tiếng Nga chép lại',
    [...RIENG_THUONG + RIENG_HOA].filter((c) => Object.values(dKk).join(' ').includes(c)).length >= 5,
    JSON.stringify(dKk).slice(0, 140));

  for (const pt of ['cash', 'bank_qr', 'card', 'room_charge', 'pay_later']) {
    const nhan = inv.paymentMethodLabel(pt, 'kk');
    check('nhãn thanh toán "' + pt + '" có bản Kazakh, không lộ mã kỹ thuật',
      nhan !== pt && nhan.trim().length > 0, 'ra "' + nhan + '"');
  }

  // ── 2. Tiền vẫn là VND, ngày giờ theo kk-KZ ───────────────────────────────
  check('tiền giữ kiểu VND 189.000 ₫ dù giao diện là Kazakh',
    inv.formatMoney(189000, 'VND', 'kk') === '189.000 ₫',
    'ra "' + inv.formatMoney(189000, 'VND', 'kk') + '"');

  // ── 3. PDF thật, rồi trích chữ ngược ra ───────────────────────────────────
  const url = await inv.createInvoicePdfDataUrl({
    invoiceNumber: 'BILL-KK-1', issuedAt: '2026-09-17T07:30:00Z', currency: 'VND',
    customerName: 'Айгүл Жұмабекова', tableName: 'Үстел 7', saleName: 'Нұрлан',
    items: [{ name: 'Бұқтырылған сиыр еті', quantity: 2, unitPrice: 189000, lineTotal: 378000 }],
    subtotal: 378000, totalAmount: 408240, vatAmount: 30240, paymentMethod: 'bank_qr',
  }, 'kk');
  const buf = Buffer.from(url.split(',')[1], 'base64');
  check('dựng được hoá đơn PDF tiếng Kazakh', buf.length > 5000, buf.length + ' byte');

  const tepTam = path.join(require('os').tmpdir(), 'kk-bill-test.pdf');
  fs.writeFileSync(tepTam, buf);
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: false }).promise;
  const tc = await (await doc.getPage(1)).getTextContent();
  const chu = tc.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ');
  fs.unlinkSync(tepTam);

  check('không có ô vuông / ký tự thay thế trong PDF Kazakh',
    !/�|□/.test(chu), chu.slice(0, 160));
  const thayDuoc = [...RIENG_THUONG + RIENG_HOA].filter((c) => chu.includes(c));
  check('chữ riêng của Kazakh in ra được, không bị nuốt',
    thayDuoc.length >= 5, 'chỉ thấy: ' + thayDuoc.join('') );
  check('tiêu đề hoá đơn in bằng tiếng Kazakh',
    chu.includes(dKk.title), chu.slice(0, 100));
  check('tổng cộng in bằng tiếng Kazakh',
    chu.includes(dKk.grandTotal), chu.slice(0, 160));
  check('số tiền trong PDF vẫn là kiểu VND',
    chu.includes('189.000 ₫'), chu.slice(0, 200));

  // ── 4. Các danh sách mã ngôn ngữ viết cứng ────────────────────────────────
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const CHO_PHAI_CO_KK = [
    ['MENU_LANGS (thực đơn dịch sẵn)', /const MENU_LANGS = \[[^\]]*'kk'[^\]]*\]/],
    // validLanguages và validLangs cũng đã gộp về danh sách chung — canh việc
    // chúng DÙNG danh sách đó, không canh việc chúng tự khai lại một bản.
    ['đường đổi ngôn ngữ dùng danh sách chung', /if \(!NGON_NGU_KHACH\.has\(language\)\)/],
    ['đường nhận diện ngôn ngữ dùng danh sách chung', /const updateLang = ngonNguKhachHopLe\(/],
    // resumeLang không còn khai mảng riêng: nó lấy từ danh sách chung
    // NGON_NGU_KHACH. Canh theo danh sách chung thay vì theo hình dạng cũ —
    // canh hình dạng cũ thì việc gộp ba bản chép lại thành một bị báo là hỏng.
    ['NGON_NGU_KHACH (danh sách ngôn ngữ khách chọn)', /const NGON_NGU_KHACH = new Set\(\[[^\]]*'kk'[^\]]*\]\)/],
    ['resumeLang (khôi phục phiên cũ) lấy từ danh sách chung', /const resumeLang = ngonNguKhachHopLe\(/],
  ];
  for (const [ten, re] of CHO_PHAI_CO_KK) {
    check('server.js — ' + ten + ' có "kk"', re.test(server));
  }

  // ── 4b. QUÉT CẤU TRÚC: bảng ngôn ngữ nào có "ko" thì phải có "kk" ─────────
  //
  // Bốn danh sách ở trên là bốn chỗ ĐÃ BIẾT. Vấn đề là những chỗ CHƯA biết:
  // câu chào khách, lời chào của chatbot, tin báo chuyển cho nhân viên, tin
  // báo tổng đài viên tiếp nhận — bốn bảng viết tay nằm rải rác, không theo
  // khuôn mẫu nào, nên lần thêm tiếng Kazakh đầu tiên bỏ sót cả bốn. Khách
  // chọn tiếng Kazakh vẫn bị chào bằng tiếng Việt.
  //
  // Nên phép đo này không liệt kê chỗ nào cả: nó tìm MỌI khoá "ko:" trong
  // server.js rồi đòi trong vòng vài dòng quanh đó phải có "kk:". Thêm một
  // bảng ngôn ngữ mới sau này mà quên Kazakh thì chính phép đo này bắt được,
  // không cần ai nhớ ra để bổ sung.
  const dongServer = server.split('\n');
  const bangThieuKk = [];
  dongServer.forEach((dong, i) => {
    if (!/(^|[^.\w])ko:\s/.test(dong)) return;
    // Bảng ngôn ngữ viết theo lối mỗi mã một dòng, nên 8 dòng quanh đó là đủ
    // rộng để chứa cả bảng dài nhất mà không trùm sang bảng kế bên.
    const quanh = dongServer.slice(Math.max(0, i - 8), i + 9).join('\n');
    if (!/(^|[^.\w])kk:\s/m.test(quanh)) {
      bangThieuKk.push(`dòng ${i + 1}: ${dong.trim().slice(0, 70)}`);
    }
  });
  check('server.js — mọi bảng ngôn ngữ có "ko" đều có "kk"',
    bangThieuKk.length === 0,
    bangThieuKk.join('\n      ') + '\n      (bảng nào chào/báo cho khách mà thiếu kk thì khách Kazakh đọc phải tiếng Việt)');

  // Riêng câu chào khách quét mã QR: đây là câu ĐẦU TIÊN khách đọc, nên canh
  // thẳng bằng tên hàm chứ không chỉ dựa vào phép quét chung ở trên.
  const khoiChao = server.slice(server.indexOf('function buildQrGreeting'),
                                server.indexOf('async function sendQrWelcome'));
  check('câu chào khách quét mã QR có bản Kazakh',
    /kk: \{/.test(khoiChao), 'thiếu nhánh kk trong buildQrGreeting');
  check('câu chào Kazakh viết bằng chữ Kirin, không phải chép tiếng Anh',
    /[\u0400-\u04FF]/.test((/kk: \{[\s\S]*?\n {4}\},/.exec(khoiChao) || [''])[0]),
    khoiChao.slice(khoiChao.indexOf('kk: {'), khoiChao.indexOf('kk: {') + 120));

  const helper = fs.readFileSync(path.join(__dirname, '..', 'gemini-helper.js'), 'utf8');
  check('gemini-helper — SUPPORTED_LANGS có "kk"',
    /const SUPPORTED_LANGS = \[[^\]]*'kk'[^\]]*\]/.test(helper));
  check('gemini-helper — SUPPORTED_LANGS cũng có "ko" (lỗi cũ: tiếng Hàn bị nhận thành "en")',
    /const SUPPORTED_LANGS = \[[^\]]*'ko'[^\]]*\]/.test(helper));
  check('gemini-helper — tên ngôn ngữ kk nói rõ là chữ Kirin',
    /kk: 'Kazakh \(Cyrillic script\)'/.test(helper),
    'không nói rõ thì máy dịch dễ trả về Kazakh viết bằng chữ Latin');
  check('gemini-helper — lời nhắc nhận diện có nhắc "kk"',
    /"kk" for Kazakh/.test(helper));

  const seedDichVu = fs.readFileSync(path.join(__dirname, '..', 'menu-seed-service.js'), 'utf8');
  check('menu-seed-service — danh sách dịch có "kk"',
    /const NGON_NGU_DICH = \[[^\]]*'kk'[^\]]*\]/.test(seedDichVu));

  console.log('');
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
