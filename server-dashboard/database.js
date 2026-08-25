const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not defined in environment variables. Please check your .env file.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')
    ? { rejectUnauthorized: false }
    : false
});

// Prevent unhandled errors from crashing the Node process on idle client drops
pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client:', err.message || err);
});

// SQL query runner helper
const query = (text, params) => pool.query(text, params);

// Initialize DB schema automatically
async function initializeDatabase() {
  try {
    console.log('Connecting to PostgreSQL database and initializing tables...');
    
    // Create admins table
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'subadmin',
        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Phân quyền theo project: subadmin gắn 1 project chỉ xem chat của project đó.
    // NULL = xem tất cả project (dùng cho superadmin hoặc subadmin toàn quyền).
    await query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS project_id VARCHAR(100);`);
    await query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_by_admin_id INT REFERENCES admins(id) ON DELETE SET NULL;`);

    // Registry dự án (multi-project): mỗi dự án 1 dòng; KB + tài khoản gắn theo project_id này.
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        project_type VARCHAR(30) NOT NULL DEFAULT 'standard',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(30) NOT NULL DEFAULT 'standard';`);
    await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);`);
    // Seed các dự án mặc định (idempotent)
    await query(`
      INSERT INTO projects (id, name) VALUES
        ('pastie-landingpage', 'Pastie Landing'),
        ('dealphuquoc', 'DealPhuQuoc'),
        ('unknown', 'Không rõ nguồn (WhatsApp trực tiếp)')
      ON CONFLICT (id) DO NOTHING;
    `);
    // QR Concierge: a dedicated project type where each QR belongs to one agent.
    await query(`
      INSERT INTO projects (id, name, project_type) VALUES
        ('qr-concierge', 'QR Concierge', 'qr_concierge')
      ON CONFLICT (id) DO UPDATE SET project_type = 'qr_concierge';
    `);

    // Create admin_sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token TEXT PRIMARY KEY,
        admin_id INT REFERENCES admins(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id VARCHAR(100) NOT NULL,
        visitor_name VARCHAR(255),
        visitor_email VARCHAR(255),
        detected_language VARCHAR(10),
        ai_summary TEXT,
        intent_tags TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        browser VARCHAR(50),
        device VARCHAR(50),
        client_ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Add browser and device columns if they do not exist
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS browser VARCHAR(50);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device VARCHAR(50);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS admin_language VARCHAR(10);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'widget';`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS platform_sender_id VARCHAR(100);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS assigned_admin_id INT REFERENCES admins(id) ON DELETE SET NULL;`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS visitor_avatar VARCHAR(500);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mc_verify_state VARCHAR(20);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS show_in_dashboard BOOLEAN DEFAULT TRUE;`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS requested_agent BOOLEAN DEFAULT FALSE;`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS claimed_by_admin_id INT REFERENCES admins(id) ON DELETE SET NULL;`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS visitor_phone VARCHAR(30);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS operator_no INT;`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS qr_account_id INT;`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;`);

    await query(`
      CREATE TABLE IF NOT EXISTS qr_chat_accounts (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        owner_admin_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        code VARCHAR(80) UNIQUE NOT NULL,
        label VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_qr_chat_accounts_project_owner ON qr_chat_accounts(project_id, owner_admin_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_qr_active ON sessions(qr_account_id, status);`);

    await query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        admin_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_admin ON push_subscriptions(admin_id);`);

    // Create knowledge_base table
    await query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(100) DEFAULT 'pastie-landingpage',
        source_url TEXT NOT NULL,
        raw_html TEXT,
        cleaned_content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed KB mặc định cho dự án DealPhuQuoc (chỉ tạo nếu project này chưa có KB nào)
    await query(`
      INSERT INTO knowledge_base (project_id, source_url, raw_html, cleaned_content)
      SELECT 'dealphuquoc', 'manual', '', $kb$DealPhuQuoc là nền tảng đặt chỗ nghỉ tại Phú Quốc: villa, homestay, căn hộ, khách sạn.
- Đặt phòng online, thanh toán VietQR, xác nhận tức thì qua email.
- Tìm kiếm thông minh: khách gõ nhu cầu tự nhiên (vd "villa có hồ bơi riêng gần biển") sẽ ra đúng chỗ phù hợp.
- Mỗi đơn có thể kèm voucher địa phương: tour 4 đảo, thuê xe máy, ưu đãi ăn uống từ đối tác bản địa.
- Giá đã gồm VAT; ngày lễ/cuối tuần có thể áp giá cao hơn.
- Khách chọn giờ nhận phòng và voucher khi đặt.
- Chính sách hỗ trợ: nếu cần gặp người thật, khách bấm "Gặp CSKH" trong khung chat.
Phong cách trả lời: thân thiện, ngắn gọn, đúng trọng tâm, bằng tiếng Việt; nếu khách hỏi ngoài phạm vi thì mời để lại thông tin để CSKH liên hệ.$kb$
      WHERE NOT EXISTS (SELECT 1 FROM knowledge_base WHERE project_id = 'dealphuquoc');
    `);

    // Create channel_configs table
    await query(`
      CREATE TABLE IF NOT EXISTS channel_configs (
        project_id VARCHAR(100) PRIMARY KEY,
        platform VARCHAR(20) DEFAULT 'whatsapp',
        fb_page_id VARCHAR(100),
        messenger_page_id VARCHAR(100),
        messenger_page_access_token TEXT,
        ig_page_id VARCHAR(100),
        instagram_page_id VARCHAR(100),
        instagram_access_token TEXT,
        whatsapp_phone_number_id VARCHAR(100),
        whatsapp_access_token TEXT,
        meta_verify_token VARCHAR(255) DEFAULT 'pastie_verify_token',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Add columns to channel_configs if they do not exist
    await query(`ALTER TABLE channel_configs ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'whatsapp';`);
    await query(`ALTER TABLE channel_configs ADD COLUMN IF NOT EXISTS messenger_page_id VARCHAR(100);`);
    await query(`ALTER TABLE channel_configs ADD COLUMN IF NOT EXISTS instagram_page_id VARCHAR(100);`);
    await query(`ALTER TABLE channel_configs ADD COLUMN IF NOT EXISTS whatsapp_waba_id VARCHAR(100);`);
    await query(`ALTER TABLE channel_configs ADD COLUMN IF NOT EXISTS whatsapp_business_phone VARCHAR(50);`);


    // Create messages table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
        sender VARCHAR(20) NOT NULL, -- 'visitor', 'agent', 'system'
        original_text TEXT NOT NULL,
        translated_text TEXT,
        language VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Add sender_admin_id column to messages if it does not exist
    await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_admin_id INT REFERENCES admins(id) ON DELETE SET NULL;`);

    // Create message_translations table for caching
    await query(`
      CREATE TABLE IF NOT EXISTS message_translations (
        message_id INT REFERENCES messages(id) ON DELETE CASCADE,
        target_lang VARCHAR(10) NOT NULL,
        translated_text TEXT NOT NULL,
        PRIMARY KEY (message_id, target_lang)
      );
    `);

    // Create otps table
    await query(`
      CREATE TABLE IF NOT EXISTS otps (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    // Create admin_otps table for staff & admin login
    await query(`
      CREATE TABLE IF NOT EXISTS admin_otps (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables verified/created successfully.');
  } catch (err) {
    console.error('Failed to initialize database tables:', err.message);
  }
}

// Automatically trigger initialization when this module is loaded
const initPromise = initializeDatabase();

module.exports = {
  query,
  pool,
  initializeDatabase,
  initPromise
};
