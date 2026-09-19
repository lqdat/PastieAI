// DÒNG PHẦN TRĂM TRÊN HÓA ĐƠN LÀ VAT, VÀ TỔNG CỘNG PHẢI CỘNG NÓ.
//
// Hai lỗi bài này canh, cả hai đều có thật:
//
// 1. Bill in ra "Tổng tiền hàng 850.000 / VAT 10% 85.000 / TỔNG CỘNG 850.000"
//    — hiện một dòng thuế rồi không cộng vào. Phát hiện khi dựng thử một hóa
//    đơn không truyền sẵn totalAmount.
// 2. Câu "Giá sản phẩm đã bao gồm VAT" nằm lại dưới chân bill trong khi bill
//    vừa cộng VAT một lần nữa ở dòng trên — hai câu chọi nhau trên cùng tờ
//    giấy, và câu sai là câu khách đem đi khiếu nại.
//
// Đo trên SVG SINH RA THẬT, không đọc mã nguồn: đây là số tiền, thứ chỉ sai khi
// các con số cộng lại với nhau.
const path = require('path');
const inv = require(path.join(__dirname, 'invoice-helper.js'));

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

const HOA_DON = {
  invoiceNo: 'HD-000123', buyerName: 'Nguyễn Văn A', tableLabel: 'Bàn 12',
  items: [
    { name: 'Bò tơ hấp cuốn rau rừng', quantity: 2, unitPrice: 185000 },
    { name: 'Lẩu bò phô mai kéo sợi', quantity: 1, unitPrice: 480000 },
  ],
  serviceFeeRate: 10, paymentMethod: 'cash', isPaid: true,
};
const so = (svg, nhan) => {
  const m = svg.match(new RegExp(nhan + '</text>[\\s\\S]{0,240}?>([\\d.]+)'));
  return m ? Number(m[1].replace(/\./g, '')) : null;
};

// Sáu thứ tiếng, vì chữ VAT mỗi tiếng một khác (VAT / НДС / 增值税 / ҚҚС) và
// dòng ghi chú cũ cũng có đủ sáu bản — sót một bản là sót ở đúng nhóm khách đó.
const NHAN_VAT = { vi: 'VAT', en: 'VAT', ru: 'НДС', zh: '增值税', ko: 'VAT', kk: 'ҚҚС' };
for (const [lang, nhan] of Object.entries(NHAN_VAT)) {
  const svg = inv.createInvoiceSvg(HOA_DON, lang);
  check(`[${lang}] dòng phần trăm mang chữ VAT của thứ tiếng đó`,
    svg.includes(`${nhan} (10%)`), 'không thấy chuỗi "' + nhan + ' (10%)"');
  check(`[${lang}] KHÔNG còn chữ "phí dịch vụ"`,
    !/Phí dịch vụ|Service charge|Сервисный сбор|服务费|서비스 요금|Қызмет ақысы/.test(svg));
  check(`[${lang}] KHÔNG còn câu "giá đã bao gồm VAT"`,
    !/bao gồm VAT|include VAT|указаны с НДС|已含增值税|포함되어 있습니다|ҚҚС-ты қамтиды/.test(svg),
    'giá giờ CHƯA gồm VAT — giữ câu đó là nói thuế đã nằm trong giá trong khi bill vừa cộng thuế');
}

const svgVi = inv.createInvoiceSvg(HOA_DON, 'vi');
const tam = so(svgVi, 'Tổng tiền hàng');
const vat = so(svgVi, 'VAT \\(10%\\)');
const tong = so(svgVi, 'TỔNG CỘNG');
check('tiền hàng đúng 850.000', tam === 850000, String(tam));
check('VAT 10% đúng 85.000', vat === 85000, String(vat));
check('TỔNG CỘNG = tiền hàng + VAT', tong === tam + vat,
  `đang là ${tong}, phải là ${tam + vat} — hiện dòng thuế mà không cộng vào là lỗi đã gặp`);

// Nơi gọi tự tính tổng thì phải tôn trọng con số của nơi gọi, không tự cộng thêm.
const tuTruyen = inv.createInvoiceSvg({ ...HOA_DON, totalAmount: 999000 }, 'vi');
check('nơi gọi truyền sẵn totalAmount thì dùng đúng con số đó',
  so(tuTruyen, 'TỔNG CỘNG') === 999000,
  'giỏ hàng đã tính tổng của nó rồi — cộng thêm lần nữa ở đây là thu gấp đôi thuế');

// Không có VAT thì không được hiện dòng trống.
const khongVat = inv.createInvoiceSvg({ ...HOA_DON, serviceFeeRate: 0 }, 'vi');
check('quán để 0% thì KHÔNG hiện dòng VAT nào', !/VAT \(/.test(khongVat));
check('… và tổng cộng vẫn đúng bằng tiền hàng', so(khongVat, 'TỔNG CỘNG') === 850000);

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
