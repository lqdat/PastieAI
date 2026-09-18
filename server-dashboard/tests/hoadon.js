// BỐ CỤC PHẦN CHÂN HOÁ ĐƠN: DÒNG VAT KHÔNG ĐƯỢC ĐÈ LÊN LỜI CẢM ƠN.
//
// Hai lỗi nhìn thấy trên hoá đơn khách nhận:
//
//   · "Giá sản phẩm đã bao gồm VAT." căn PHẢI và chỉ cách dòng "Cảm ơn quý
//     khách!" 12px. Dòng cảm ơn căn GIỮA, cỡ 13px — hai chuỗi chồng lên nhau ở
//     giữa trang. Hoá đơn là thứ khách giữ lại và có khi đưa cho kế toán.
//   · Gạch phân cách phía trên "TỔNG CỘNG" nằm quá sát, nhìn ra thành một dấu
//     gạch đè lên chính dòng tổng cộng.
//
// Bài này dựng hoá đơn thật rồi ĐO TOẠ ĐỘ trong SVG sinh ra, chứ không đọc mã
// nguồn: bố cục là thứ chỉ sai khi các con số cộng lại với nhau.
const helper = require('../invoice-helper');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

const HOA_DON = {
  code: 'BILL-TEST-01', currency: 'VND',
  items: [
    { name: 'Cơm ghẹ Phú Quốc', quantity: 2, unitPrice: 189000, note: 'Ít cay' },
    { name: 'Cà phê dừa', quantity: 3, unitPrice: 65000 },
  ],
  subtotal: 573000, totalDiscount: 0, serviceFeeRate: 5, totalAmount: 601650,
};

// Đọc một dòng chữ trong SVG theo nội dung, trả về toạ độ và cách căn lề.
function docDong(svg, chua) {
  const the = [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)]
    .find((m) => m[2].includes(chua));
  if (!the) return null;
  const lay = (ten) => (the[1].match(new RegExp(ten + '="([^"]*)"')) || [])[1];
  return { x: Number(lay('x')), y: Number(lay('y')), size: Number(lay('font-size')), anchor: lay('text-anchor'), chu: the[2] };
}

// Bề rộng khung hoá đơn, đọc từ chính SVG thay vì chép cứng.
function beRong(svg) {
  return Number((svg.match(/viewBox="0 0 (\d+)/) || [])[1]);
}

const NGON_NGU = { vi: ['TỔNG CỘNG', 'bao gồm VAT', 'Cảm ơn'], en: ['TOTAL', 'include VAT', 'Thank you'] };

for (const [ma, [tuTong, tuVat, tuCamOn]] of Object.entries(NGON_NGU)) {
  console.log(`\n── bản "${ma}" ──`);
  const svg = helper.createInvoiceSvg(HOA_DON, ma);
  const W = beRong(svg);
  const tong = docDong(svg, tuTong);
  const vat = docDong(svg, tuVat);
  const camOn = docDong(svg, tuCamOn);

  check('có đủ ba dòng: tổng cộng, VAT, cảm ơn', Boolean(tong && vat && camOn),
    `tổng=${!!tong} vat=${!!vat} camOn=${!!camOn}`);
  if (!tong || !vat || !camOn) continue;

  // 1. Thứ tự dọc: VAT nằm GIỮA tổng cộng và lời cảm ơn.
  check('dòng VAT nằm giữa dòng tổng cộng và lời cảm ơn',
    tong.y < vat.y && vat.y < camOn.y,
    `tổng=${tong.y} vat=${vat.y} camOn=${camOn.y}`);

  // 2. Căn giữa, không nép bên phải nữa.
  check('dòng VAT căn giữa trang', vat.anchor === 'middle' && Math.abs(vat.x - W / 2) < 1,
    `anchor=${vat.anchor} x=${vat.x}, giữa trang là ${W / 2}`);

  // 3. KHÔNG ĐÈ NHAU. Hai dòng chữ cần cách nhau ít nhất bằng chiều cao của
  //    dòng dưới — sát hơn thế là chân chữ trên chạm đầu chữ dưới.
  check('dòng VAT không đè lên lời cảm ơn',
    camOn.y - vat.y >= camOn.size + 4,
    `mới cách ${camOn.y - vat.y}px, cần ít nhất ${camOn.size + 4}px`);
  check('dòng VAT không dính vào dòng tổng cộng',
    vat.y - tong.y >= vat.size + 4,
    `mới cách ${vat.y - tong.y}px`);

  // 4. Gạch phân cách phía trên dòng tổng cộng phải cách chữ ra.
  //    Chữ đậm cỡ N cao khoảng 0,72·N tính từ chân chữ lên.
  const gachTren = [...svg.matchAll(/<line[^>]*y1="([\d.]+)"[^>]*\/>/g)]
    .map((m) => Number(m[1]))
    .filter((y) => y < tong.y)
    .sort((a, b) => b - a)[0];
  check('có gạch phân cách phía trên dòng tổng cộng', Number.isFinite(gachTren));
  if (Number.isFinite(gachTren)) {
    const dinhChu = tong.y - tong.size * 0.72;
    check('gạch KHÔNG chạm vào chữ "tổng cộng"', dinhChu - gachTren >= 5,
      `gạch ở ${gachTren}, đỉnh chữ ở ${dinhChu.toFixed(1)} — cách ${(dinhChu - gachTren).toFixed(1)}px`);
  }

  // 5. Không có nét nào màu đỏ thuần trong phần chân: bảng màu hoá đơn là hồng
  //    sẫm #b20c69 và hồng nhạt #e6cede.
  const netDo = [...svg.matchAll(/stroke="(#[0-9a-f]{6})"/gi)]
    .map((m) => m[1].toLowerCase())
    .filter((c) => /^#[c-f][0-9a-f]0{2}0{2}$/.test(c));
  check('không có nét đỏ thuần nào trong hoá đơn', netDo.length === 0, netDo.join(', '));
}

// Hoá đơn có chiết khấu thì thêm một dòng nữa — bố cục vẫn phải giữ.
console.log('\n── có chiết khấu ──');
{
  const svg = helper.createInvoiceSvg({ ...HOA_DON, totalDiscount: 50000, totalAmount: 551650 }, 'vi');
  const vat = docDong(svg, 'bao gồm VAT');
  const camOn = docDong(svg, 'Cảm ơn');
  check('thêm dòng chiết khấu thì VAT vẫn không đè lời cảm ơn',
    camOn.y - vat.y >= camOn.size + 4, `cách ${camOn.y - vat.y}px`);
}

console.log('');
console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
process.exit(failures.length ? 1 : 0);
