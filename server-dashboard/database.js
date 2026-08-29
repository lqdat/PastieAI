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


// Gom dữ liệu QR chưa có chủ về một Agent: tạo "Nhóm mặc định" nếu chưa có, đưa
// mọi Sale chưa được Agent nào quản lý trong project vào nhóm, và gắn các QR còn
// lơ lửng vào nhóm đó. Chạy lại nhiều lần đều an toàn.
//
// Gọi ở hai nơi: cuối migration (khi project đã sẵn có Agent) và ngay sau khi
// superadmin tạo Agent đầu tiên cho project.
async function adoptOrphanQrDataForProject(projectId, agentId) {
  if (!projectId || !agentId) return null;
  let group = await query(
    `SELECT id FROM agent_groups WHERE project_id = $1 AND name = 'Nhóm mặc định' LIMIT 1`,
    [projectId]
  );
  if (group.rows.length === 0) {
    group = await query(
      `INSERT INTO agent_groups (project_id, agent_id, name, description)
       VALUES ($1, $2, 'Nhóm mặc định', 'Tạo tự động khi chuyển sang cấu trúc Agent - Sale')
       RETURNING id`,
      [projectId, agentId]
    );
  }
  const groupId = group.rows[0].id;

  // Sale chưa có Agent quản lý thì về tay Agent này.
  await query(
    `UPDATE admins SET managed_by_admin_id = $2
      WHERE project_id = $1 AND role = 'sale' AND managed_by_admin_id IS NULL`,
    [projectId, agentId]
  );
  await query(
    `INSERT INTO agent_group_sales (group_id, sale_id)
     SELECT $1, id FROM admins WHERE project_id = $2 AND role = 'sale'
     ON CONFLICT (group_id, sale_id) DO NOTHING`,
    [groupId, projectId]
  );
  await query(
    `UPDATE qr_chat_accounts SET group_id = $1 WHERE project_id = $2 AND group_id IS NULL`,
    [groupId, projectId]
  );
  return groupId;
}


// Migration một chiều, chạy được nhiều lần mà không hỏng: đưa dữ liệu QR
// Concierge cũ sang cấu trúc Agent - Sale - Nhóm.
//
//  1. Mọi tài khoản role 'agent' thuộc project qr_concierge trở thành 'sale'.
//     Chỉ đổi những tài khoản CHƯA có Sale nào quản lý, để lần chạy sau không
//     đụng vào các Agent quản lý mới do superadmin tạo (những tài khoản này
//     luôn có managed_by_admin_id trỏ về superadmin).
//  2. Mỗi project qr_concierge được cấp một "Nhóm mặc định".
//  3. Sale cũ và QR cũ được đưa vào nhóm mặc định của project tương ứng.
//  4. Tài khoản chưa có khung giờ nào được cấp 00:00-23:59 để không bị khóa oan.
async function migrateQrAgentsToSales() {
  try {
    const qrProjects = await query(`SELECT id FROM projects WHERE project_type = 'qr_concierge'`);
    if (qrProjects.rows.length === 0) return;
    const projectIds = qrProjects.rows.map((row) => row.id);

    // 1. agent -> sale, CHỈ MỘT LẦN.
    //    Không thể phân biệt bằng managed_by_admin_id: cột đó là ON DELETE SET
    //    NULL, nên xóa superadmin đã tạo Agent là Agent đó thành mồ côi và lần
    //    khởi động sau sẽ bị hạ xuống sale. Dùng cờ trong schema_migrations mới
    //    chắc chắn.
    const flag = await query(
      `INSERT INTO schema_migrations (name) VALUES ('qr_agents_to_sales')
       ON CONFLICT (name) DO NOTHING RETURNING name`
    );
    if (flag.rows.length > 0) {
      const converted = await query(
        `UPDATE admins SET role = 'sale'
         WHERE role = 'agent' AND project_id = ANY($1::varchar[])
         RETURNING id, project_id`,
        [projectIds]
      );
      console.log(`[Migration] Chuyển ${converted.rows.length} tài khoản agent QR thành sale.`);
    }

    // 2-3. Nhóm mặc định: chỉ tạo được khi project đã có Agent quản lý, vì
    // agent_groups.agent_id là NOT NULL. Ngay sau khi đổi agent -> sale thì
    // thường CHƯA có Agent nào, nên bước này sẽ không làm gì. Việc bàn giao
    // (tạo nhóm mặc định, gom Sale và QR cũ vào) được thực hiện lúc superadmin
    // tạo Agent đầu tiên cho project — xem adoptOrphanQrData() trong server.js.
    // Đúng thứ tự bước 6-7 ở mục 19 của kế hoạch.
    for (const projectId of projectIds) {
      const owner = await query(
        `SELECT id FROM admins WHERE project_id = $1 AND role = 'agent' AND is_active = TRUE ORDER BY id LIMIT 1`,
        [projectId]
      );
      if (owner.rows.length === 0) continue;
      await adoptOrphanQrDataForProject(projectId, owner.rows[0].id);
    }

    // 4. Giờ mặc định cả ngày cho Sale chưa cấu hình, tránh khóa nhầm.
    //    CHỈ role 'sale' và CHỈ trong project QR Concierge:
    //      - Agent quản lý KHÔNG bị ràng buộc giờ đăng nhập.
    //      - DealPhuQuoc cũng cấp role 'agent' cho nhân viên của họ; cấp khung giờ
    //        cho những tài khoản đó là kéo luật ca kíp sang dự án không liên quan.
    await query(
      `INSERT INTO account_access_hours (admin_id, start_time, end_time)
       SELECT a.id, '00:00', '23:59' FROM admins a
       WHERE a.role = 'sale'
         AND a.project_id = ANY($1::varchar[])
         AND NOT EXISTS (SELECT 1 FROM account_access_hours h WHERE h.admin_id = a.id)`,
      [projectIds]
    );
  } catch (err) {
    console.error('[Migration] Chuyển agent QR sang sale thất bại:', err.message);
  }
}

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
        website_url VARCHAR(500),
        project_type VARCHAR(30) NOT NULL DEFAULT 'standard',
        -- NULL means use the safe default for the project type: enabled for
        -- normal projects, disabled for QR Concierge. A concrete true/false
        -- value is a setting explicitly chosen by Superadmin.
        ai_enabled BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(30) NOT NULL DEFAULT 'standard';`);
    await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);`);
    await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);`);
    await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN;`);
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
      INSERT INTO projects (id, name, project_type, ai_enabled) VALUES
        ('qr-concierge', 'QR Concierge', 'qr_concierge', FALSE)
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
    // Trước đây mỗi Agent chỉ được một QR, ràng buộc bằng unique index dưới đây.
    // Luật mới: QR thuộc về NHÓM, và một nhóm tạo được bao nhiêu QR cũng được
    // (Bàn 1, Bàn 2, Phòng 101...). Vì vậy phải GỠ index cũ, nếu không lệnh tạo
    // QR thứ hai sẽ vỡ vì trùng khóa.
    //
    // Việc dồn trùng (deactivate QR thừa) cũng bỏ luôn: giờ QR thừa là hợp lệ.
    await query(`DROP INDEX IF EXISTS idx_qr_chat_accounts_one_active_per_agent;`);
    // (Index thay thế được tạo bên dưới, sau khi cột group_id đã được thêm.)
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_qr_active ON sessions(qr_account_id, status);`);

    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        auth_provider VARCHAR(20) NOT NULL DEFAULT 'otp',
        last_qr_account_id INT REFERENCES qr_chat_accounts(id) ON DELETE SET NULL,
        first_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, email)
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_customers_project_last_login ON customers(project_id, last_login_at DESC);`);

    // Order/Bill workflow. External POS or invoice software can later populate
    // the invoice payload/URLs through the same API contract.
    await query(`
      CREATE TABLE IF NOT EXISTS chat_orders (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_by_admin_id INT REFERENCES admins(id) ON DELETE SET NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'awaiting_payment',
        currency VARCHAR(8) NOT NULL DEFAULT 'VND',
        total_amount NUMERIC(14,0) NOT NULL DEFAULT 0,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        invoice JSONB NOT NULL DEFAULT '{}'::jsonb,
        payment_method VARCHAR(30),
        payment_reference VARCHAR(255),
        paid_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_chat_orders_session_status ON chat_orders(session_id, status, created_at DESC);`);

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

    // Migration: File attachments (images/videos/documents) on chat messages.
    // attachment_key is the S3 object key (used to delete the file later);
    // attachment_url is a cached direct/presigned URL for convenience.
    await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_key TEXT;`);
    await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;`);
    await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);`);
    await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_mime VARCHAR(150);`);
    await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size INT;`);
    await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20);`); // 'image' | 'video' | 'document'

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

    // ------------------------------------------------------------------
    // Phân cấp Agent - Sale - Nhóm - QR (chỉ áp dụng cho project qr_concierge)
    //
    // Quyết định đã chốt:
    //  - Cấp mới chỉ dùng cho project_type = 'qr_concierge'. Các role cũ
    //    (subadmin, project_owner, project_admin) giữ nguyên cho DealPhuQuoc và
    //    Pastie Landing, không đụng tới.
    //  - 'agent' cũ trong QR Concierge đổi thành 'sale'; 'agent' mới là cấp
    //    quản lý Sale. Xem migrateQrAgentsToSales() bên dưới.
    //  - Nguồn sự thật cho "Sale nào đang xử lý chat" là sessions.claimed_by_admin_id
    //    (đã dùng sẵn khắp nơi, có claimed_at và operator_no đi kèm).
    //    sessions.assigned_admin_id GIỮ NGUYÊN cho flow cũ, không dùng cho QR.
    //  - Giờ lưu dạng TIME trần + cột timezone; so sánh thực hiện trong Node
    //    (xem workingHours() trong server.js) để không phụ thuộc tz database của
    //    Postgres, vốn chạy UTC trên Railway.
    // ------------------------------------------------------------------

    // Agent quản lý được gắn với người tạo ra mình (superadmin), Sale gắn với Agent.
    await query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS managed_by_admin_id INT REFERENCES admins(id) ON DELETE SET NULL;`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admins_managed_by ON admins(managed_by_admin_id);`);
    // Trần số Sale mà một Agent được phép tạo. Superadmin đặt lúc tạo Agent;
    // NULL = không giới hạn. Đây là đòn bẩy duy nhất superadmin giữ lại đối với
    // tổ chức bên trong của Agent — mọi thứ còn lại Agent tự sắp xếp.
    await query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS sale_limit INT;`);

    await query(`
      CREATE TABLE IF NOT EXISTS agent_groups (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(100) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        agent_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_agent_groups_agent ON agent_groups(agent_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_agent_groups_project ON agent_groups(project_id);`);

    // Một Sale có thể thuộc nhiều nhóm nên khóa chính là cặp (group, sale).
    await query(`
      CREATE TABLE IF NOT EXISTS agent_group_sales (
        group_id INT NOT NULL REFERENCES agent_groups(id) ON DELETE CASCADE,
        sale_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, sale_id)
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_group_sales_sale ON agent_group_sales(sale_id);`);

    // Giờ được phép ĐĂNG NHẬP. Nhiều dòng cho một tài khoản = nhiều khung giờ
    // trong ngày (ví dụ 08:00-12:00 và 13:30-18:00). Khung qua nửa đêm hợp lệ:
    // start_time > end_time nghĩa là ca vắt sang ngày hôm sau.
    await query(`
      CREATE TABLE IF NOT EXISTS account_access_hours (
        id SERIAL PRIMARY KEY,
        admin_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Bangkok',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_access_hours_admin ON account_access_hours(admin_id);`);

    // Giờ NHẬN CHAT của từng Sale trong từng nhóm. Đây là lớp kiểm tra thứ hai,
    // độc lập với giờ đăng nhập ở trên.
    await query(`
      CREATE TABLE IF NOT EXISTS group_sale_hours (
        id SERIAL PRIMARY KEY,
        group_id INT NOT NULL REFERENCES agent_groups(id) ON DELETE CASCADE,
        sale_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Bangkok',
        priority INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_group_sale_hours_lookup ON group_sale_hours(group_id, sale_id);`);

    // QR gắn vào đúng một nhóm. Một nhóm có thể có nhiều QR, phân biệt bằng tên
    // (Bàn 1, Bàn 2, Phòng 101...). KHÔNG có Sale ưu tiên: mọi chat từ QR đều về
    // hàng đợi chung của nhóm, ai đang trong ca thì nhận.
    await query(`ALTER TABLE qr_chat_accounts ADD COLUMN IF NOT EXISTS group_id INT REFERENCES agent_groups(id) ON DELETE SET NULL;`);
    await query(`ALTER TABLE qr_chat_accounts ADD COLUMN IF NOT EXISTS display_label VARCHAR(300);`);
    await query(`ALTER TABLE qr_chat_accounts ADD COLUMN IF NOT EXISTS created_by_admin_id INT REFERENCES admins(id) ON DELETE SET NULL;`);
    // Tên QR là duy nhất TRONG MỘT NHÓM. Giữa các nhóm khác nhau thì trùng tên
    // vô hại — "Bàn 1" của Lễ tân và "Bàn 1" của Nhà hàng là hai chỗ khác nhau.
    // Chỉ áp cho QR đã gắn nhóm; QR cũ chưa gắn nhóm không bị đụng tới.
    // Phải đặt SAU lệnh thêm cột group_id ở trên, nếu không index sẽ tham chiếu
    // một cột chưa tồn tại trên database mới tinh.
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_unique_label_per_group
        ON qr_chat_accounts(group_id, LOWER(label))
        WHERE is_active = TRUE AND group_id IS NOT NULL;
    `);

    // Định tuyến chat: waiting = chưa ai nhận, assigned = đã có Sale, closed = đã đóng.
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS group_id INT REFERENCES agent_groups(id) ON DELETE SET NULL;`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS routing_status VARCHAR(20);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_routing ON sessions(group_id, routing_status);`);

    // Bảng cờ cho các migration DỮ LIỆU chỉ được chạy đúng một lần. Khác với
    // CREATE TABLE IF NOT EXISTS (chạy lại vô hại), việc đổi role là thao tác
    // một chiều nên phải có cờ, nếu không mỗi lần khởi động lại sẽ hạ cấp luôn
    // các Agent quản lý mới do superadmin tạo.
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(120) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await migrateQrAgentsToSales();

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
  adoptOrphanQrDataForProject,
  initPromise
};
