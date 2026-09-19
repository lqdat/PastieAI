// MỘT ĐƠN, BA CHỖ TÍNH TIỀN — PHẢI RA CÙNG MỘT SỐ.
//
// Màn quản lý hóa đơn (Agent nhìn) → máy chủ (ghi vào CSDL) → PDF (khách cầm).
// Lệch bất kỳ hai chỗ nào là Agent duyệt một số, khách nhận một số khác.
const fs = require('fs');
let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

const src = fs.readFileSync('__dirname + "/../pastie-dashboard/src/cart-console.js"', 'utf8');
const srvSrc = fs.readFileSync('__dirname + "/../server.js"', 'utf8');
const inv = require('__dirname + "/../invoice-helper.js"');

const dauSrv = srvSrc.indexOf('const calculateQrMenuCharges =');
const tinhMayChu = new Function(srvSrc.slice(dauSrv, srvSrc.indexOf('\n};', dauSrv) + 3) + '\n return calculateQrMenuCharges;')();
const dauMan = src.indexOf('function thueSuatQuan()');
const thanMan = src.slice(dauMan, src.indexOf('\n            }', src.indexOf('function recalculateCharges()')) + 14);
const tinhMan = new Function('draftItems', 'charges', thanMan + '\n return recalculateCharges();');

const MON = [
  { name: 'Bò tơ hấp cuốn rau rừng', quantity: 2, unitPrice: 185000, lineTotal: 370000 },
  { name: 'Lẩu bò phô mai kéo sợi', quantity: 1, unitPrice: 480000, lineTotal: 480000 },
  { name: 'Nước dừa tươi', quantity: 3, unitPrice: 35000, lineTotal: 105000 },
];
for (const rate of [0, 5, 8, 8.5, 10]) {
  const subtotal = MON.reduce((a, m) => a + m.lineTotal, 0);
  const man = tinhMan(MON, { serviceFeeRate: rate });
  const may = tinhMayChu(subtotal, rate);
  const svg = inv.createInvoiceSvg({
    invoiceNo: 'HD-1', items: MON, serviceFeeRate: may.serviceFeeRate,
    serviceFeeAmount: may.serviceFeeAmount, totalAmount: may.grandTotal,
  }, 'vi');
  const doc = (nhan) => {
    const m = svg.match(new RegExp(nhan + '</text>[\\s\\S]{0,240}?>([\\d.]+)'));
    return m ? Number(m[1].replace(/\./g, '')) : null;
  };
  const pdfTong = doc('TỔNG CỘNG');
  const pdfVat = rate > 0 ? doc('VAT \\(' + String(rate).replace('.', '\\.') + '%\\)') : 0;
  check(`[${rate}%] màn hóa đơn = máy chủ`,
    man.vatAmount === may.serviceFeeAmount && man.totalAmount === may.grandTotal,
    `màn ${man.vatAmount}/${man.totalAmount} · máy chủ ${may.serviceFeeAmount}/${may.grandTotal}`);
  check(`[${rate}%] máy chủ = PDF khách cầm`,
    pdfVat === may.serviceFeeAmount && pdfTong === may.grandTotal,
    `PDF ${pdfVat}/${pdfTong} · máy chủ ${may.serviceFeeAmount}/${may.grandTotal}`);
}

// VAT là của ĐƠN, không phải của MÓN: đổi cơ cấu món mà giữ nguyên tổng tiền
// hàng thì tiền thuế không được đổi.
{
  const a = tinhMan([{ lineTotal: 955000 }], { serviceFeeRate: 10 });
  const b = tinhMan([{ lineTotal: 500000 }, { lineTotal: 455000 }], { serviceFeeRate: 10 });
  check('VAT là của ĐƠN: tách một món thành hai không làm đổi tiền thuế',
    a.vatAmount === b.vatAmount && a.totalAmount === b.totalAmount,
    `một món ${a.vatAmount} · hai món ${b.vatAmount}`);
}
// Và không có đường nào để đặt thuế suất riêng cho một món.
check('không còn đường nào đặt thuế suất riêng cho một món',
  !/id="(?:add|edit)-item-vat"/.test(src) && !/vat-quick-btn/.test(src));

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
