const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const CONFIRMATION = 'DELETE_MESSAGES_AND_SESSIONS';

if (process.env.CONFIRM_DELETE_CHAT_DATA !== CONFIRMATION) {
  console.error('Dừng thao tác: script này xóa vĩnh viễn toàn bộ messages và sessions.');
  console.error(`Chạy lại với: $env:CONFIRM_DELETE_CHAT_DATA='${CONFIRMATION}'; node clear-chat-data.js`);
  process.exitCode = 1;
  return;
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL chưa được cấu hình.');
  process.exitCode = 1;
  return;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false }
});

async function clearChatData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const [{ count: messageCount }] = (await client.query('SELECT COUNT(*) FROM messages')).rows;
    const [{ count: sessionCount }] = (await client.query('SELECT COUNT(*) FROM sessions')).rows;

    // Remove read metadata first because this table does not have a foreign key.
    await client.query('DELETE FROM session_read_receipts');
    // message_translations is removed automatically by its ON DELETE CASCADE relation.
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM sessions');

    await client.query('COMMIT');
    console.log(`Đã xóa ${messageCount} messages và ${sessionCount} sessions.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Xóa dữ liệu chat thất bại:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

clearChatData();
