const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DEALPHUQUOC_DB_URL = process.env.DEALPHUQUOC_DATABASE_URL;

function getDealPool() {
  if (!DEALPHUQUOC_DB_URL) {
    throw new Error('Biến môi trường DEALPHUQUOC_DATABASE_URL chưa được thiết lập trong .env');
  }
  return new Pool({
    connectionString: DEALPHUQUOC_DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    max: 2
  });
}

/**
 * Trích xuất toàn bộ dữ liệu cơ sở kinh doanh, phòng, tour, voucher từ DB DealPhuQuoc
 */
async function extractDealDatabaseData() {
  const pool = getDealPool();
  try {
    // 1. Danh sách Vendor (Khách sạn / Resort / Đối tác)
    const vendorQuery = `
      SELECT v.id, v.name, v.description, v.address, v.phone, 
             a.name as area_name, a.region as area_region
      FROM "Vendor" v
      LEFT JOIN "Area" a ON v."areaId" = a.id
      WHERE v.active = true
      ORDER BY v.name ASC
    `;
    const vendorRes = await pool.query(vendorQuery).catch(err => {
      console.warn('[DealSync] Vendor query with active flag failed, falling back:', err.message);
      return pool.query(`
        SELECT v.id, v.name, v.description, v.address, v.phone, a.name as area_name
        FROM "Vendor" v
        LEFT JOIN "Area" a ON v."areaId" = a.id
        ORDER BY v.name ASC
      `);
    });

    // 2. Danh sách Sản phẩm (Phòng khách sạn / Tour / Thuê xe / Vé)
    const productQuery = `
      SELECT p.id, p.name, p.description, p."basePrice", p."weekendPrice", p."holidayPrice",
             p."maxGuests", p.bedrooms, p.bathrooms, p."productType", p."propertyType",
             p."ratingAvg", p."ratingCount",
             v.name as vendor_name, v.address as vendor_address, v.phone as vendor_phone,
             a.name as area_name
      FROM "Product" p
      LEFT JOIN "Vendor" v ON p."vendorId" = v.id
      LEFT JOIN "Area" a ON p."areaId" = a.id
      WHERE p.active = true
      ORDER BY v.name ASC, p."basePrice" ASC
    `;
    const productRes = await pool.query(productQuery).catch(err => {
      console.warn('[DealSync] Product query fallback:', err.message);
      return pool.query(`
        SELECT p.id, p.name, p.description, p."basePrice", p."maxGuests",
               v.name as vendor_name, a.name as area_name
        FROM "Product" p
        LEFT JOIN "Vendor" v ON p."vendorId" = v.id
        LEFT JOIN "Area" a ON p."areaId" = a.id
        ORDER BY p."basePrice" ASC
      `);
    });

    // 3. Danh sách Voucher / Khuyến mãi
    const voucherQuery = `
      SELECT id, name, description, "serviceType", "partnerName", "discountType", "discountValue", "maxDiscount", "minOrder", "expiresAt"
      FROM "Voucher"
      WHERE active = true
      ORDER BY "discountValue" DESC
    `;
    const voucherRes = await pool.query(voucherQuery).catch(() => ({ rows: [] }));

    return {
      vendors: vendorRes.rows,
      products: productRes.rows,
      vouchers: voucherRes.rows
    };
  } finally {
    await pool.end();
  }
}

/**
 * Định dạng dữ liệu trích xuất thành văn bản Knowledge Base thông minh
 */
function buildKnowledgeMarkdown(data) {
  const { vendors, products, vouchers } = data;

  let doc = `# CẨM NANG DỊCH VỤ & BẢNG GIÁ DU LỊCH DEALPHUQUOC (ĐỒNG BỘ TỪ HỆ THỐNG)\n\n`;
  doc += `> DealPhuQuoc (https://dealphuquoc.com) là nền tảng đặt phòng khách sạn, resort nghỉ dưỡng, tour du lịch khám phá đảo và voucher ưu đãi hàng đầu tại Phú Quốc.\n\n`;

  // 1. Voucher & Ưu đãi
  if (vouchers && vouchers.length > 0) {
    doc += `## 1. CÁC MÃ GIẢM GIÁ & CHƯƠNG TRÌNH KHUYẾN MÃI ĐANG HOẠT ĐỘNG\n`;
    vouchers.forEach((v, idx) => {
      const discount = v.discountType === 'PERCENT' ? `${v.discountValue}%` : `${Number(v.discountValue || 0).toLocaleString('vi-VN')} VNĐ`;
      const minOrderStr = v.minOrder ? ` (Áp dụng đơn từ ${Number(v.minOrder).toLocaleString('vi-VN')} đ)` : '';
      const expStr = v.expiresAt ? ` - Hạn dùng: ${new Date(v.expiresAt).toLocaleDateString('vi-VN')}` : '';
      doc += `- **${v.name || 'Voucher Ưu Đãi'}**: Giảm **${discount}**${minOrderStr}${expStr}. ${v.description || ''}\n`;
    });
    doc += `\n`;
  }

  // 2. Danh sách Khách sạn, Resort và các Hạng phòng
  doc += `## 2. DANH SÁCH KHÁCH SẠN, RESORT & CÁC HẠNG PHÒNG / DỊCH VỤ\n`;
  
  if (vendors.length === 0 && products.length > 0) {
    // Nếu chỉ có danh sách sản phẩm
    products.forEach((p, idx) => {
      const priceStr = p.basePrice ? `${Number(p.basePrice).toLocaleString('vi-VN')} VNĐ/đêm` : 'Liên hệ báo giá';
      doc += `### ${idx + 1}. ${p.name}\n`;
      if (p.vendor_name) doc += `- **Cơ sở:** ${p.vendor_name}\n`;
      if (p.area_name) doc += `- **Khu vực:** ${p.area_name}\n`;
      doc += `- **Giá tiêu chuẩn:** **${priceStr}**\n`;
      if (p.maxGuests) doc += `- **Sức chứa tối đa:** ${p.maxGuests} khách\n`;
      if (p.description) doc += `- **Mô tả:** ${p.description.replace(/\n+/g, ' ').substring(0, 300)}...\n`;
      doc += `\n`;
    });
  } else {
    vendors.forEach((v, idx) => {
      doc += `### ${idx + 1}. ${v.name}\n`;
      doc += `- **Khu vực:** ${v.area_name || 'Phú Quốc'}\n`;
      if (v.address) doc += `- **Địa chỉ:** ${v.address}\n`;
      if (v.phone) doc += `- **Hotline:** ${v.phone}\n`;
      if (v.description) doc += `- **Giới thiệu:** ${v.description.replace(/\n+/g, ' ').substring(0, 350)}...\n`;

      // Danh sách sản phẩm của vendor này
      const vendorProducts = products.filter(p => p.vendor_name === v.name || p.vendorId === v.id);
      if (vendorProducts.length > 0) {
        doc += `- **Các loại phòng / Tour / Gói dịch vụ:**\n`;
        vendorProducts.forEach(p => {
          const price = p.basePrice ? `${Number(p.basePrice).toLocaleString('vi-VN')} VNĐ/đêm` : 'Báo giá theo mùa';
          const guests = p.maxGuests ? ` (Tối đa ${p.maxGuests} người)` : '';
          const weekend = p.weekendPrice ? ` [Cuối tuần: ${Number(p.weekendPrice).toLocaleString('vi-VN')} đ]` : '';
          doc += `  + **${p.name}**: Giá từ **${price}**${guests}${weekend}\n`;
          if (p.description && p.description.length < 150) {
            doc += `    * ${p.description.replace(/\n+/g, ' ')}\n`;
          }
        });
      }
      doc += `\n`;
    });

    // Các sản phẩm không gắn với Vendor (hoặc tour độc lập)
    const standaloneProducts = products.filter(p => !p.vendor_name);
    if (standaloneProducts.length > 0) {
      doc += `### DỊCH VỤ & TOUR THAM QUAN BỔ SUNG\n`;
      standaloneProducts.forEach(p => {
        const price = p.basePrice ? `${Number(p.basePrice).toLocaleString('vi-VN')} VNĐ` : 'Liên hệ';
        doc += `- **${p.name}** (${p.area_name || 'Phú Quốc'}): Giá từ **${price}**\n`;
      });
      doc += `\n`;
    }
  }

  // 3. Quy trình & Quy định
  doc += `## 3. QUY TRÌNH ĐẶT DỊCH VỤ & HƯỚNG DẪN TƯ VẤN
- **Tư vấn & Báo giá:** Trả lời nhiệt tình, gợi ý khách sạn phù hợp với ngân sách và khu vực (Dương Đông: gần trung tâm ăn uống chợ đêm; Nam Đảo: gần Sunset Town, Cáp treo Hòn Thơm; Bắc Đảo: gần Grand World, VinWonders).
- **Đặt chỗ & Thanh toán:** Khách hàng có thể đặt trực tiếp tại website https://dealphuquoc.com hoặc để lại Số điện thoại để nhân viên hỗ trợ giữ phòng và áp dụng voucher giảm giá.
- **Hỗ trợ 24/7:** Nếu khách cần đặt phòng gấp hoặc yêu cầu đặc biệt, nhân viên CSKH DealPhuQuoc sẽ liên hệ trực tiếp hỗ trợ ngay.\n`;

  return doc;
}

/**
 * Tổng hợp tri thức từ DB DealPhuQuoc và nạp vào bảng knowledge_base
 */
async function syncDealDatabaseToKnowledgeBase(db, projectId = 'dealphuquoc') {
  console.log(`[DealSync] Starting database sync for project ${projectId}...`);
  const rawData = await extractDealDatabaseData();
  const markdownDoc = buildKnowledgeMarkdown(rawData);

  // Lưu vào database knowledge_base
  const metaJson = JSON.stringify({
    vendors_count: rawData.vendors.length,
    products_count: rawData.products.length,
    vouchers_count: rawData.vouchers.length,
    synced_at: new Date().toISOString()
  });

  const check = await db.query(
    'SELECT id FROM knowledge_base WHERE project_id = $1 AND source_url = $2',
    [projectId, 'db://dealphuquoc']
  );
  if (check.rows.length > 0) {
    await db.query(
      'UPDATE knowledge_base SET raw_html = $1, cleaned_content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [metaJson, markdownDoc, check.rows[0].id]
    );
  } else {
    await db.query(
      'INSERT INTO knowledge_base (project_id, source_url, raw_html, cleaned_content, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
      [projectId, 'db://dealphuquoc', metaJson, markdownDoc]
    );
  }

  console.log(`[DealSync] Successfully synced ${rawData.vendors.length} vendors, ${rawData.products.length} products, ${rawData.vouchers.length} vouchers to Knowledge Base.`);

  return {
    success: true,
    stats: {
      vendors: rawData.vendors.length,
      products: rawData.products.length,
      vouchers: rawData.vouchers.length
    },
    contentLength: markdownDoc.length,
    sample: markdownDoc.substring(0, 400) + '...'
  };
}

module.exports = {
  getDealPool,
  extractDealDatabaseData,
  buildKnowledgeMarkdown,
  syncDealDatabaseToKnowledgeBase
};
