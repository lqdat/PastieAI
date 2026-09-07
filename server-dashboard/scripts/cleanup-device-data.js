#!/usr/bin/env node

const assert = require('assert');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function parseArgs(args) {
  const index = args.indexOf('--admin');
  return {
    admin: index >= 0 ? String(args[index + 1] || '').trim() : '',
    apply: args.includes('--apply'),
    help: args.includes('--help') || args.includes('-h'),
    selfTest: args.includes('--self-test'),
  };
}

function usage() {
  console.log(`
Dọn dữ liệu cũ của một tài khoản QR Chat

  npm run cleanup:old-data -- --admin <email-hoặc-id>          # xem trước
  npm run cleanup:old-data -- --admin <email-hoặc-id> --apply  # thực sự xóa

Dữ liệu bị xóa: thiết bị, phiên đăng nhập, nhật ký truy cập, chat và đơn hàng
thuộc phạm vi tài khoản được chọn. Tài khoản, QR và menu không bị ảnh hưởng.
Sau khi xóa, người dùng phải đăng nhập lại. Mặc định chỉ xem trước.
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    assert.deepStrictEqual(parseArgs(['--admin', '7', '--apply']), {
      admin: '7', apply: true, help: false, selfTest: false,
    });
    console.log('Self-test passed.');
    return;
  }
  if (options.help || !options.admin) {
    usage();
    process.exitCode = options.help ? 0 : 1;
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL chưa được cấu hình trong server-dashboard/.env.');

  const pool = new Pool({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    const account = await pool.query(
      `SELECT id, username, full_name, role
         FROM admins
        WHERE id::text = $1 OR LOWER(username) = LOWER($1)
        LIMIT 1`,
      [options.admin]
    );
    if (!account.rows[0]) throw new Error(`Không tìm thấy tài khoản: ${options.admin}`);

    const admin = account.rows[0];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Phạm vi chat: QR/nhóm của Agent hoặc phiên đã giao/nhận bởi tài khoản.
      // Không dùng project_id đơn thuần vì một project có thể có nhiều Agent.
      await client.query(
        `CREATE TEMP TABLE cleanup_sessions ON COMMIT DROP AS
         SELECT DISTINCT s.id
           FROM sessions s
           LEFT JOIN qr_chat_accounts q ON q.id = s.qr_account_id
           LEFT JOIN agent_groups g ON g.id = s.group_id
          WHERE q.owner_admin_id = $1
             OR g.agent_id = $1
             OR s.assigned_admin_id = $1
             OR s.claimed_by_admin_id = $1`,
        [admin.id]
      );
      await client.query(
        `CREATE TEMP TABLE cleanup_orders ON COMMIT DROP AS
         SELECT o.id FROM chat_orders o
          WHERE o.session_id IN (SELECT id FROM cleanup_sessions)`
      );

      const counts = (await client.query(
        `SELECT
           (SELECT COUNT(*)::int FROM admin_devices WHERE admin_id = $1) AS devices,
           (SELECT COUNT(*)::int FROM admin_sessions WHERE admin_id = $1) AS login_sessions,
           (SELECT COUNT(*)::int FROM admin_access_log WHERE admin_id = $1) AS access_logs,
           (SELECT COUNT(*)::int FROM cleanup_sessions) AS chats,
           (SELECT COUNT(*)::int FROM messages WHERE session_id IN (SELECT id FROM cleanup_sessions)) AS messages,
           (SELECT COUNT(*)::int FROM cleanup_orders) AS orders,
           (SELECT COUNT(*)::int FROM chat_order_bills
             WHERE session_id IN (SELECT id FROM cleanup_sessions)
                OR order_id IN (SELECT id FROM cleanup_orders)) AS bills`,
        [admin.id]
      )).rows[0];

      console.log(`Tài khoản : ${admin.full_name || admin.username} (${admin.username}, id=${admin.id})`);
      console.log(`Thiết bị  : ${counts.devices}`);
      console.log(`Phiên     : ${counts.login_sessions}`);
      console.log(`Nhật ký   : ${counts.access_logs}`);
      console.log(`Chat      : ${counts.chats} (${counts.messages} tin nhắn)`);
      console.log(`Đơn hàng  : ${counts.orders} (${counts.bills} bill)`);

      if (!options.apply) {
        await client.query('ROLLBACK');
        console.log('\nChỉ xem trước, chưa xóa dữ liệu. Thêm --apply để thực hiện.');
        return;
      }

      // Các bảng lịch sử này cố ý không có foreign key để sống lâu hơn chat,
      // nên phải dọn trước; messages và chat_orders tự cascade theo sessions.
      await client.query('DELETE FROM pos_deliveries WHERE order_id IN (SELECT id FROM cleanup_orders)');
      await client.query(`DELETE FROM chat_order_bills
        WHERE session_id IN (SELECT id FROM cleanup_sessions)
           OR order_id IN (SELECT id FROM cleanup_orders)`);
      await client.query(`DELETE FROM chat_order_revisions
        WHERE session_id IN (SELECT id FROM cleanup_sessions)
           OR order_id IN (SELECT id FROM cleanup_orders)`);
      await client.query('DELETE FROM session_read_receipts WHERE session_id IN (SELECT id FROM cleanup_sessions)');
      await client.query('DELETE FROM sessions WHERE id IN (SELECT id FROM cleanup_sessions)');

      await client.query('DELETE FROM admin_sessions WHERE admin_id = $1', [admin.id]);
      await client.query('DELETE FROM admin_access_log WHERE admin_id = $1', [admin.id]);
      await client.query('DELETE FROM admin_devices WHERE admin_id = $1', [admin.id]);
      await client.query('UPDATE admins SET last_device_change_at = NULL WHERE id = $1', [admin.id]);
      await client.query('COMMIT');
      console.log('\nĐã xóa dữ liệu thiết bị, chat và đơn hàng cũ. Người dùng cần đăng nhập lại.');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Lỗi: ${error.message}`);
  process.exitCode = 1;
});
