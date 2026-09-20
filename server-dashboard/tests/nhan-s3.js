// Kiểm tra bộ ảnh nhãn (badge) trước khi đẩy lên S3.
//
// Đẩy 300 tệp lên S3 là việc không hoàn tác được dễ dàng, nên mọi thứ kiểm tra
// được bằng cách đọc đĩa thì kiểm ở đây trước. Test đọc THẲNG danh-muc.json và
// thư mục ảnh thật, không dựng dữ liệu giả: dựng giả thì test xanh trong khi
// thư mục trên máy thiếu tệp.
const fs = require('fs');
const path = require('path');
const { chay, BADGE_DIR, DANH_MUC, S3_PREFIX, SO_ANH_DU } = require('../scripts/upload-badges-to-s3');

let dat = 0, truot = 0;
const kt = (ten, dung, chiTiet) => {
  if (dung) { dat++; console.log(`  ✓ ${ten}`); }
  else { truot++; console.log(`  ✗ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
};

console.log('=== KIỂM TRA BỘ ẢNH NHÃN ===');

if (!fs.existsSync(DANH_MUC)) {
  console.log(`  ✗ chưa có ${DANH_MUC} — giải nén badges.zip vào public/badges/ trước đã`);
  process.exit(1);
}

const { danhMuc, anhCoThat, thieu, thua } = chay();

// ─── 1. ĐỦ TỔ HỢP ────────────────────────────────────────────────────────────
kt('danh mục có đúng 300 ảnh', danhMuc.anh.length === SO_ANH_DU, `đang có ${danhMuc.anh.length}`);
kt('4 khung', danhMuc.khung.length === 4, danhMuc.khung.join(','));
kt('5 thứ tiếng, không có tiếng Việt', danhMuc.ngonNgu.length === 5 && !danhMuc.ngonNgu.includes('vi'),
   danhMuc.ngonNgu.join(','));
kt('15 mã nhãn', danhMuc.ma.length === 15, `${danhMuc.ma.length}: ${danhMuc.ma.join(',')}`);

// Discount phải là 4 mức rời, không còn nhãn gộp "10-40%"
const mucGiam = danhMuc.ma.filter((m) => m.startsWith('discount'));
kt('discount tách 4 mức 10/20/30/40',
   ['discount-10', 'discount-20', 'discount-30', 'discount-40'].every((m) => mucGiam.includes(m))
   && mucGiam.length === 4, mucGiam.join(','));

// Tích đề-các: mỗi (khung, mã, ngôn ngữ) phải có đúng một ảnh, không thiếu
// không trùng. Đếm tổng thôi thì thiếu một tổ hợp mà thừa một tổ hợp khác vẫn lọt.
const thieuToHop = [];
for (const k of danhMuc.khung)
  for (const m of danhMuc.ma)
    for (const n of danhMuc.ngonNgu)
      if (danhMuc.anh.filter((a) => a.khung === k && a.ma === m && a.ngonNgu === n).length !== 1)
        thieuToHop.push(`${k}/${m}/${n}`);
kt('mọi tổ hợp khung × mã × ngôn ngữ có đúng 1 ảnh', thieuToHop.length === 0,
   thieuToHop.slice(0, 3).join(', '));

// ─── 2. DANH MỤC KHỚP ĐĨA ────────────────────────────────────────────────────
kt('không thiếu tệp nào trên đĩa', thieu.length === 0, thieu.slice(0, 3).join(', '));
kt('không có tệp PNG lạc ngoài danh mục', thua.length === 0, thua.slice(0, 3).join(', '));

// ─── 3. TỆP DÙNG ĐƯỢC ────────────────────────────────────────────────────────
// Ảnh 0 byte hoặc không phải PNG thì trình duyệt hiện ô vỡ; bắt tại đây rẻ hơn
// nhiều so với phát hiện sau khi khách đã nhìn thấy.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const hong = [];
const nhe = [];
for (const tep of anhCoThat) {
  const p = path.join(BADGE_DIR, tep);
  const st = fs.statSync(p);
  const dau = Buffer.alloc(4);
  const fd = fs.openSync(p, 'r'); fs.readSync(fd, dau, 0, 4, 0); fs.closeSync(fd);
  if (!dau.equals(PNG)) hong.push(tep);
  if (st.size < 3000) nhe.push(tep);           // ảnh 320px kín chữ luôn > 15KB
}
kt('mọi tệp đều là PNG thật', hong.length === 0, hong.slice(0, 3).join(', '));
kt('không có ảnh rỗng / quá nhẹ', nhe.length === 0, nhe.slice(0, 3).join(', '));

// ─── 4. TÊN TỆP SUY RA ĐƯỢC TỪ KHOÁ ──────────────────────────────────────────
// Màn Superadmin dựng đường dẫn từ (khung, mã, ngôn ngữ) chứ không tra bảng,
// nên quy tắc đặt tên phải đúng tuyệt đối.
const saiTen = danhMuc.anh.filter((a) => a.tep !== `${a.khung}-${a.ma}-${a.ngonNgu}.png`);
kt('tên tệp = <khung>-<mã>-<ngôn ngữ>.png', saiTen.length === 0,
   saiTen.slice(0, 3).map((a) => a.tep).join(', '));

// ─── 5. NHÃN CHỮ ─────────────────────────────────────────────────────────────
const trong = danhMuc.anh.filter((a) => !a.nhan || !String(a.nhan).trim());
kt('không ảnh nào thiếu nhãn chữ', trong.length === 0, trong.slice(0, 3).map((a) => a.tep).join(', '));

// Cùng một mã, khác khung thì chữ phải y hệt nhau — lệch nghĩa là lúc xuất đã
// dùng hai bảng dịch khác nhau.
const lechChu = [];
for (const m of danhMuc.ma)
  for (const n of danhMuc.ngonNgu) {
    const chu = new Set(danhMuc.anh.filter((a) => a.ma === m && a.ngonNgu === n).map((a) => a.nhan));
    if (chu.size > 1) lechChu.push(`${m}/${n}: ${[...chu].join(' | ')}`);
  }
kt('cùng mã + ngôn ngữ thì chữ giống nhau trên mọi khung', lechChu.length === 0, lechChu.slice(0, 2).join(', '));

// ─── 6. TIỀN TỐ S3 ───────────────────────────────────────────────────────────
kt("tiền tố S3 là 'badge/'", S3_PREFIX === 'badge/', S3_PREFIX);

console.log(`\n${dat}/${dat + truot} đạt`);
process.exit(truot ? 1 : 0);
