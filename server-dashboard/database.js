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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Add browser and device columns if they do not exist
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS browser VARCHAR(50);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device VARCHAR(50);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS admin_language VARCHAR(10);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'widget';`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS platform_sender_id VARCHAR(100);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS assigned_admin_id INT REFERENCES admins(id) ON DELETE SET NULL;`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS visitor_avatar VARCHAR(500);`);
    await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mc_verify_state VARCHAR(20);`);

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

    console.log('Database tables verified/created successfully.');
  } catch (err) {
    console.error('Failed to initialize database tables:', err.message);
  }
}

// Automatically trigger initialization when this module is loaded
initializeDatabase();

module.exports = {
  query,
  pool
};
