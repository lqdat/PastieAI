// Script tải toàn bộ ảnh & video hướng dẫn Agent lên S3 / Cloudflare R2
// Sử dụng: node scripts/upload-guide-to-s3.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const s3 = require('../s3-helper');

const GUIDE_DIR = path.join(__dirname, '../public/agent_guide');

async function main() {
  console.log('=== TIẾN TRÌNH ĐẨY ẢNH & VIDEO HƯỚNG DẪN AGENT LÊN S3 ===');
  
  if (!fs.existsSync(GUIDE_DIR)) {
    console.error('[S3] Không tìm thấy thư mục:', GUIDE_DIR);
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
    console.warn('- Để đẩy trực tiếp lên Cloudflare R2 / AWS S3 thật, vui lòng cập nhật giá trị thật vào .env.');
    console.warn('- HỆ THỐNG ĐÃ SẴN SÀNG: Toàn bộ ảnh và video hiện đã được đồng bộ vào thư mục public/agent_guide/ để web app phục vụ trực tiếp tại /agent_guide/...\n');
    return;
  }

  const files = fs.readdirSync(GUIDE_DIR);
  console.log(`Tìm thấy ${files.length} tệp phương tiện (ảnh & video) trong thư mục guide.`);

  const mimeMap = {
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.mp4': 'video/mp4'
  };

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const contentType = mimeMap[ext] || 'application/octet-stream';
    const filePath = path.join(GUIDE_DIR, file);
    const buffer = fs.readFileSync(filePath);
    const s3Key = `guide/agent/${file}`;

    try {
      await s3.uploadBuffer(s3Key, buffer, contentType);
      console.log(`✅ Đã tải lên S3: ${s3Key} (${(buffer.length / 1024).toFixed(1)} KB)`);

      // TỰ ĐỘNG XÓA FILE NGUỒN TRONG SRC / LOCAL SAU KHI ĐẨY THÀNH CÔNG LÊN S3
      fs.unlinkSync(filePath);
      console.log(`🗑️ Đã xóa file trong public/agent_guide: ${file}`);

      // Đồng thời dọn dẹp trong docs/assets nếu tồn tại
      const docsPath = path.join(__dirname, '../../docs/assets/agent_guide', file);
      if (fs.existsSync(docsPath)) {
        try { fs.unlinkSync(docsPath); console.log(`🗑️ Đã xóa file trong docs/assets/agent_guide: ${file}`); } catch (_) {}
      }
    } catch (err) {
      console.error(`❌ Lỗi tải lên S3 (${file}):`, err.message);
    }
  }

  // Ghi nhận file manifest các tệp đã lưu trên S3
  const manifestPath = path.join(__dirname, '../guide-s3-manifest.json');
  try {
    fs.writeFileSync(manifestPath, JSON.stringify({
      uploadedAt: new Date().toISOString(),
      s3Prefix: 'guide/agent/',
      files: files
    }, null, 2));
    console.log('📝 Đã lưu bảng ánh xạ S3 vào guide-s3-manifest.json');
  } catch (_) {}

  console.log('\n🎉 Hoàn tất quá trình tải lên S3 và tự động dọn dẹp sạch mã nguồn local!');
}

main().catch(console.error);
