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
    ['validLanguages (ngôn ngữ phiên)', /const validLanguages = new Set\(\[[^\]]*'kk'[^\]]*\]\)/],
    ['validLangs (nhận diện ngôn ngữ)', /const validLangs = \[[^\]]*'kk'[^\]]*\]/],
    ['resumeLang (khôi phục phiên cũ)', /const resumeLang = \[[^\]]*'kk'[^\]]*\]/],
  ];
  for (const [ten, re] of CHO_PHAI_CO_KK) {
    check('server.js — ' + ten + ' có "kk"', re.test(server));
  }

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
