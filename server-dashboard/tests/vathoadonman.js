// VAT TRÊN MÀN QUẢN LÝ HÓA ĐƠN PHẢI RA ĐÚNG SỐ MÁY CHỦ GHI.
//
// Đây là tiền, nên bài đo không tự chép lại công thức: nó TRÍCH hàm tính của
// màn hình ra khỏi cart-console.js, TRÍCH hàm tính của máy chủ ra khỏi
// server.js, rồi cho hai bên cùng chạy trên một bộ dữ liệu và bắt chúng khớp
// từng đồng. Chép công thức vào bài đo là bài đo tự khẳng định chính nó.
//
// Vì sao phải khớp: khi Agent bấm lưu, máy chủ VỨT BỎ vatRate/vatAmount của
// từng món rồi tính lại bằng một thuế suất của quán trên tổng tiền hàng. Số
// Agent nhìn thấy lúc sửa mà khác số máy chủ ghi thì khách nhận một hóa đơn
// khác với thứ Agent vừa duyệt.
const fs = require('fs');
const MAN = '__dirname + "/../pastie-dashboard/src/cart-console.js"';
const MAY_CHU = '__dirname + "/../server.js"';

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

const src = fs.readFileSync(MAN, 'utf8');
const srvSrc = fs.readFileSync(MAY_CHU, 'utf8');

// Trích hàm của MÁY CHỦ.
const dauSrv = srvSrc.indexOf('const calculateQrMenuCharges =');
const thanSrv = srvSrc.slice(dauSrv, srvSrc.indexOf('\n};', dauSrv) + 3);
const tinhMayChu = new Function(thanSrv + '\n return calculateQrMenuCharges;')();

// Trích hàm của MÀN HÌNH. Nó đọc `charges` và `draftItems` từ phạm vi bao
// ngoài, nên bơm vào qua tham số.
const dauMan = src.indexOf('function thueSuatQuan()');
const thanMan = src.slice(dauMan, src.indexOf('\n            }', src.indexOf('function recalculateCharges()')) + 14);
const tinhMan = new Function('draftItems', 'charges', thanMan + '\n return recalculateCharges();');

const BO_DU_LIEU = [
  { ten: 'một món, 10%', mon: [{ lineTotal: 1000000 }], rate: 10 },
  { ten: 'ba món, 10%', mon: [{ lineTotal: 1000000 }, { lineTotal: 500000 }, { lineTotal: 300000 }], rate: 10 },
  { ten: 'thuế suất lẻ 8,5%', mon: [{ lineTotal: 333333 }, { lineTotal: 777777 }], rate: 8.5 },
  { ten: 'quán không xuất VAT', mon: [{ lineTotal: 1234567 }], rate: 0 },
  { ten: 'số lẻ dễ lệch khi làm tròn', mon: [{ lineTotal: 33333 }, { lineTotal: 33333 }, { lineTotal: 33333 }], rate: 10 },
  { ten: 'hóa đơn rỗng', mon: [], rate: 10 },
];

for (const bo of BO_DU_LIEU) {
  const subtotal = bo.mon.reduce((a, it) => a + it.lineTotal, 0);
  const man = tinhMan(bo.mon, { serviceFeeRate: bo.rate });
  const may = tinhMayChu(subtotal, bo.rate);
  check(`[${bo.ten}] tiền hàng khớp`, man.subtotal === may.subtotal, `màn ${man.subtotal} / máy chủ ${may.subtotal}`);
  check(`[${bo.ten}] tiền VAT khớp từng đồng`, man.vatAmount === may.serviceFeeAmount,
    `màn ${man.vatAmount} / máy chủ ${may.serviceFeeAmount}`);
  check(`[${bo.ten}] tổng thanh toán khớp từng đồng`, man.totalAmount === may.grandTotal,
    `màn ${man.totalAmount} / máy chủ ${may.grandTotal}`);
}

// Làm tròn MỘT LẦN trên tổng, không làm tròn từng dòng rồi cộng: với 3 dòng
// 33.333 ở 10% thì cộng-từng-dòng ra 9.999 còn làm-tròn-một-lần ra 10.000.
{
  const mon = [{ lineTotal: 33333 }, { lineTotal: 33333 }, { lineTotal: 33333 }];
  const congTungDong = mon.reduce((a, it) => a + Math.round(it.lineTotal * 10 / 100), 0);
  const man = tinhMan(mon, { serviceFeeRate: 10 });
  check('làm tròn một lần trên tổng, không cộng từng dòng đã làm tròn',
    man.vatAmount !== congTungDong && man.vatAmount === 10000,
    `màn ${man.vatAmount}, cộng-từng-dòng ${congTungDong} — máy chủ làm tròn một lần`);
}

// Thuế suất phải ĐỌC TỪ HÓA ĐƠN, không viết cứng 10.
check('thuế suất đọc từ chính hóa đơn, không viết cứng',
  /charges\.serviceFeeRate \?\? charges\.vatRate \?\? 0/.test(src),
  'viết cứng 10% là sai ngay với quán để 8% hoặc 0%');
check('chặn thuế suất trong khoảng 0–100 như máy chủ',
  /Math\.max\(0, Math\.min\(100, r\)\)/.test(src));

// Công thức cũ và ô nhập VAT theo món đều phải biến mất.
const maThuc = src.split('\n').filter((d) => !d.trim().startsWith('//') && !d.trim().startsWith('Máy chủ')).join('\n');
check('KHÔNG còn phép chia ngược line / (1 + r)',
  !/lineTotal \/ \(1 \+/.test(maThuc) && !/line \/ \(1 \+/.test(maThuc),
  'đó là luật cũ hồi giá còn gồm VAT');
check('KHÔNG còn ô nhập VAT theo từng món', !/id="(?:add|edit)-item-vat"/.test(src),
  'máy chủ vứt bỏ thuế suất của món — để ô đó lại là mời người ta gõ vào chỗ không ai đọc');
check('KHÔNG còn gửi vatRate lên máy chủ', !/vatRate: (?:rate|isNaN)/.test(maThuc));
check('nhãn dòng VAT lấy từ bảng dịch', /t\('vatIncludedLabel'\)/.test(src));
check('nhãn dòng VAT có kèm thuế suất của đơn', /\$\{calc\.rate\}%/.test(src),
  'không ghi % thì Agent không biết hóa đơn này đang áp thuế suất nào');
check('màn xem hóa đơn đọc được tên trường cũ của máy chủ',
  /charges\.vatAmount \?\? charges\.serviceFeeAmount \?\? 0/.test(src));
check('KHÔNG còn chuỗi "Đã bao gồm VAT" viết cứng', !/Đã bao gồm VAT/.test(src));

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
