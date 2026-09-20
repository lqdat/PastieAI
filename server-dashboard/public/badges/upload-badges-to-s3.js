// Script tải toàn bộ ảnh nhãn (badge) lên S3 / Cloudflare R2
// Sử dụng: node scripts/upload-badges-to-s3.js
//
// Ảnh gốc nằm ở public/badges/ và ĐƯỢC GIỮ LẠI sau khi tải lên, giống cách
// upload-guide-to-s3.js làm: khi S3 chưa cấu hình thì web app vẫn phục vụ được
// trực tiếp tại /badges/... chứ không vỡ ảnh.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const s3 = require('../s3-helper');

const BADGE_DIR = path.join(__dirname, '../public/badges');
const S3_PREFIX = 'badge/';

async function main() {
  console.log('=== TIẾN TRÌNH ĐẨY ẢNH NHÃN (BADGE) LÊN S3 ===');

  if (!fs.existsSync(BADGE_DIR)) {
    console.error('[S3] Không tìm thấy thư mục:', BADGE_DIR);
    process.exit(1);
  }

  const accessKey = process.env.AWS_ACCESS_KEY_ID || '';
  const endpoint = process.env.AWS_ENDPOINT_URL || '';
  const bucket = process.env.AWS_S3_BUCKET_NAME || '';
  const isPlaceholder = accessKey.includes('${{') || endpoint.includes('${{') || bucket.includes('${{');

  if (!s3.isConfigured || isPlaceholder) {
    console.warn('\n⚠️ [S3 CẢNH BÁO]:');
    console.warn('- Thông tin AWS S3 / Cloudflare R2 trong .env hiện là placeholder deployment:');
    console.warn('  ENDPOINT:', endpoint);
    console.warn('  BUCKET:', bucket);
    console.warn('- Ảnh nhãn vẫn dùng được ngay tại /badges/... do web app phục vụ trực tiếp.\n');
    return;
  }

  const files = fs.readdirSync(BADGE_DIR).filter((f) => f.toLowerCase().endsWith('.png'));
  console.log(`Tìm thấy ${files.length} ảnh nhãn.`);

  let xong = 0;
  const hong = [];
  for (const file of files) {
    const buffer = fs.readFileSync(path.join(BADGE_DIR, file));
    try {
      await s3.uploadBuffer(`${S3_PREFIX}${file}`, buffer, 'image/png');
      xong++;
      // 300 tệp nên chỉ in mốc 25 tệp một lần, in từng tệp thì log ngập màn hình
      if (xong % 25 === 0) console.log(`✅ Đã tải ${xong}/${files.length} ảnh`);
    } catch (err) {
      hong.push(file);
      console.error(`❌ Lỗi tải lên S3 (${file}):`, err.message);
    }
  }

  // Manifest ghi lại DANH MỤC đầy đủ, không chỉ danh sách tên tệp: màn
  // Superadmin đọc thẳng file này để dựng lưới chọn nhãn, khỏi phải suy tên tệp.
  const danhMuc = JSON.parse(fs.readFileSync(path.join(BADGE_DIR, 'danh-muc.json'), 'utf8'));
  fs.writeFileSync(path.join(__dirname, '../badge-s3-manifest.json'), JSON.stringify({
    uploadedAt: new Date().toISOString(),
    s3Prefix: S3_PREFIX,
    co: danhMuc.co,
    khung: danhMuc.khung,
    ngonNgu: danhMuc.ngonNgu,
    ma: danhMuc.ma,
    files,
    hong,
  }, null, 2));
  console.log('📝 Đã lưu bảng ánh xạ S3 vào badge-s3-manifest.json');
  console.log(`\n🎉 Hoàn tất: ${xong}/${files.length} ảnh${hong.length ? `, ${hong.length} tệp lỗi` : ''}.`);
}

main().catch(console.error);
