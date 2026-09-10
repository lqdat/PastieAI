#!/usr/bin/env node

const assert = require('assert');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function parseArgs(args) {
  const getVal = (flag) => {
    const idx = args.indexOf(flag);
    if (idx < 0) return '';
    const val = args[idx + 1];
    return val && !val.startsWith('--') ? String(val).trim() : '';
  };

  return {
    admin: getVal('--admin') || getVal('-a'),
    project: getVal('--project') || getVal('-p'),
    apply: args.includes('--apply'),
    keepDevices: args.includes('--keep-devices'),
    help: args.includes('--help') || args.includes('-h'),
    selfTest: args.includes('--self-test'),
  };
}

function usage() {
  console.log(`
Pastie AI - Script Dọn & Xóa Dữ Liệu Chat, Đơn Hàng và Thiết Bị

CÁCH DÙNG:
  1. Xóa dữ liệu theo Dự án (nhập mã hoặc tên dự án):
     node scripts/cleanup-device-data.js --project <tên-hoặc-mã-dự-án>          # Xem trước
     node scripts/cleanup-device-data.js --project <tên-hoặc-mã-dự-án> --apply  # Thực sự xóa

  2. Xóa dữ liệu theo Tài khoản (Agent / Sale / Superadmin):
     node scripts/cleanup-device-data.js --admin <email-hoặc-id>          # Xem trước
     node scripts/cleanup-device-data.js --admin <email-hoặc-id> --apply  # Thực sự xóa

  (Hoặc chạy qua npm):
     npm run cleanup:old-data -- --project "QR Chat" --apply
     npm run cleanup:old-data -- --admin agenttest@tempmail.id.vn --apply

PHẠM VI XÓA:
  • Khi xóa theo Agent:
    - Xóa toàn bộ chat của khách gửi tới QR/nhóm của Agent đó
    - Xóa toàn bộ chat của các nhân viên Sale thuộc Agent đó
    - Xóa toàn bộ chat nội bộ (Agent ↔ Kỹ thuật, Agent ↔ Sale, Sale ↔ Kỹ thuật)
    - Xóa tin nhắn, đơn hàng, hóa đơn, vé hỗ trợ (tickets) liên quan
    - Reset thiết bị & phiên đăng nhập của Agent (và các Sale liên quan)

  • Khi xóa theo Dự án:
    - Xóa toàn bộ cuộc trò chuyện của dự án đó (mọi khách, mọi Agent, mọi Sale)
    - Xóa tin nhắn, đơn hàng, hóa đơn của dự án đó

  Mặc định chạy ở chế độ XEM TRƯỚC (dry-run). Thêm cờ --apply để xóa thật.
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.selfTest) {
    assert.deepStrictEqual(parseArgs(['--admin', '7', '--apply']), {
      admin: '7', project: '', apply: true, keepDevices: false, help: false, selfTest: false,
    });
    assert.deepStrictEqual(parseArgs(['--project', 'QR Chat', '--apply']), {
      admin: '', project: 'QR Chat', apply: true, keepDevices: false, help: false, selfTest: false,
    });
    console.log('Self-test passed.');
    return;
  }

  if (options.help || (!options.admin && !options.project)) {
    usage();
    process.exitCode = options.help ? 0 : 1;
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL chưa được cấu hình trong server-dashboard/.env.');

  const pool = new Pool({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 7000,
  });

  try {
    const client = await pool.connect();
    try {
      let targetDesc = '';
      let targetAdminIds = [];

      await client.query('BEGIN');

      // Tạo bảng tạm chứa danh sách session cần xóa
      await client.query(`
        CREATE TEMP TABLE cleanup_sessions (
          id VARCHAR PRIMARY KEY
        ) ON COMMIT DROP
      `);

      if (options.project) {
        // --- TÌM DỰ ÁN ---
        const projRes = await client.query(
          `SELECT id, name
             FROM projects
            WHERE id = $1
               OR LOWER(id) = LOWER($1)
               OR LOWER(name) = LOWER($1)
               OR LOWER(name) LIKE '%' || LOWER($1) || '%'
            LIMIT 1`,
          [options.project]
        );

        if (!projRes.rows[0]) {
          const allProjects = await client.query('SELECT id, name FROM projects ORDER BY id');
          console.error(`\n❌ Lỗi: Không tìm thấy dự án nào khớp với: "${options.project}"`);
          console.log('\nDanh sách các dự án hiện có trong hệ thống:');
          console.table(allProjects.rows);
          process.exitCode = 1;
          return;
        }

        const project = projRes.rows[0];
        targetDesc = `Dự án: "${project.name}" (mã: ${project.id})`;

        // Tìm tất cả sessions thuộc dự án hoặc thuộc QR accounts của dự án
        await client.query(
          `INSERT INTO cleanup_sessions (id)
           SELECT DISTINCT s.id
             FROM sessions s
             LEFT JOIN qr_chat_accounts q ON q.id = s.qr_account_id
            WHERE s.project_id = $1
               OR q.project_id = $1
           ON CONFLICT DO NOTHING`,
          [project.id]
        );

        // Gom các admin thuộc dự án này để reset thiết bị nếu cần
        const adminsInProj = await client.query(
          `SELECT id FROM admins WHERE project_id = $1`,
          [project.id]
        );
        targetAdminIds = adminsInProj.rows.map((r) => r.id);

      } else if (options.admin) {
        // --- TÌM TÀI KHOẢN ADMIN ---
        const accRes = await client.query(
          `SELECT id, username, full_name, role, project_id
             FROM admins
            WHERE id::text = $1
               OR LOWER(username) = LOWER($1)
               OR LOWER(full_name) = LOWER($1)
            LIMIT 1`,
          [options.admin]
        );

        if (!accRes.rows[0]) {
          const allAdmins = await client.query(
            'SELECT id, username, full_name, role, project_id FROM admins ORDER BY id'
          );
          console.error(`\n❌ Lỗi: Không tìm thấy tài khoản nào khớp với: "${options.admin}"`);
          console.log('\nDanh sách tài khoản quản trị hiện có trong hệ thống:');
          console.table(allAdmins.rows);
          process.exitCode = 1;
          return;
        }

        const admin = accRes.rows[0];
        targetDesc = `Tài khoản: ${admin.full_name || admin.username} (${admin.username}, id=${admin.id}, vai trò=${admin.role})`;
        targetAdminIds = [admin.id];

        if (admin.role === 'agent') {
          // 1. Nhóm của Agent
          const groupRes = await client.query(
            `SELECT id FROM agent_groups WHERE agent_id = $1`,
            [admin.id]
          );
          const groupIds = groupRes.rows.map((r) => r.id);

          // 2. Toàn bộ nhân viên Sale thuộc các nhóm của Agent này
          const saleRes = await client.query(
            `SELECT DISTINCT sale_id
               FROM agent_group_sales
              WHERE group_id = ANY($1::int[])`,
            [groupIds.length ? groupIds : [-1]]
          );
          const saleIds = saleRes.rows.map((r) => r.sale_id);
          targetAdminIds = [...new Set([...targetAdminIds, ...saleIds])];

          // 3. Toàn bộ mã QR của Agent
          const qrRes = await client.query(
            `SELECT id FROM qr_chat_accounts
              WHERE owner_admin_id = $1
                 OR created_by_admin_id = $1
                 OR group_id = ANY($2::int[])`,
            [admin.id, groupIds.length ? groupIds : [-1]]
          );
          const qrIds = qrRes.rows.map((r) => r.id);

          // 4. Các phiên chat khách hàng (gửi tới Agent hoặc các Sale của Agent)
          await client.query(
            `INSERT INTO cleanup_sessions (id)
             SELECT DISTINCT s.id
               FROM sessions s
              WHERE s.qr_account_id = ANY($1::int[])
                 OR s.group_id = ANY($2::int[])
                 OR s.assigned_admin_id = $3
                 OR s.claimed_by_admin_id = $3
                 OR s.assigned_admin_id = ANY($4::int[])
                 OR s.claimed_by_admin_id = ANY($4::int[])
             ON CONFLICT DO NOTHING`,
            [
              qrIds.length ? qrIds : [-1],
              groupIds.length ? groupIds : [-1],
              admin.id,
              saleIds.length ? saleIds : [-1],
            ]
          );

          // 5. Các phiên chat nội bộ liên quan Agent và các Sale của Agent
          // Gồm: internal_agent_{id}_*, internal_*_agent_{id}*, internal_sale_{id}_*
          await client.query(
            `INSERT INTO cleanup_sessions (id)
             SELECT id FROM sessions
              WHERE id LIKE 'internal_agent_' || $1 || '_%'
                 OR id LIKE '%_agent_' || $1 || '_%'
                 OR id LIKE '%_agent_' || $1
             ON CONFLICT DO NOTHING`,
            [admin.id]
          );

          for (const sId of saleIds) {
            await client.query(
              `INSERT INTO cleanup_sessions (id)
               SELECT id FROM sessions
                WHERE id LIKE 'internal_sale_' || $1 || '_%'
                   OR id LIKE '%_sale_' || $1 || '_%'
                   OR id LIKE '%_sale_' || $1
               ON CONFLICT DO NOTHING`,
              [sId]
            );
          }
        } else if (admin.role === 'sale') {
          // Khi chọn tài khoản Sale: xóa các phiên mà Sale đã tiếp nhận / được phân công
          await client.query(
            `INSERT INTO cleanup_sessions (id)
             SELECT id FROM sessions
              WHERE assigned_admin_id = $1
                 OR claimed_by_admin_id = $1
                 OR id LIKE 'internal_sale_' || $1 || '_%'
                 OR id LIKE '%_sale_' || $1 || '_%'
                 OR id LIKE '%_sale_' || $1
             ON CONFLICT DO NOTHING`,
            [admin.id]
          );
        } else {
          // Superadmin / vai trò khác
          await client.query(
            `INSERT INTO cleanup_sessions (id)
             SELECT id FROM sessions
              WHERE assigned_admin_id = $1
                 OR claimed_by_admin_id = $1
             ON CONFLICT DO NOTHING`,
            [admin.id]
          );
        }
      }

      // Tạo bảng tạm danh sách đơn hàng liên quan
      await client.query(`
        CREATE TEMP TABLE cleanup_orders ON COMMIT DROP AS
        SELECT o.id FROM chat_orders o
         WHERE o.session_id IN (SELECT id FROM cleanup_sessions)
      `);

      // Tạo bảng tạm danh sách tickets hỗ trợ liên quan
      await client.query(`
        CREATE TEMP TABLE cleanup_tickets ON COMMIT DROP AS
        SELECT t.id FROM support_tickets t
         WHERE t.session_id IN (SELECT id FROM cleanup_sessions)
            OR t.agent_id = ANY($1::int[])
      `, [targetAdminIds.length ? targetAdminIds : [-1]]);

      // Thống kê số lượng dữ liệu sẽ bị xóa
      const counts = (await client.query(`
        SELECT
          (SELECT COUNT(*)::int FROM cleanup_sessions) AS chats,
          (SELECT COUNT(*)::int FROM messages WHERE session_id IN (SELECT id FROM cleanup_sessions)) AS messages,
          (SELECT COUNT(*)::int FROM cleanup_orders) AS orders,
          (SELECT COUNT(*)::int FROM chat_order_bills
            WHERE session_id IN (SELECT id FROM cleanup_sessions)
               OR order_id IN (SELECT id FROM cleanup_orders)) AS bills,
          (SELECT COUNT(*)::int FROM cleanup_tickets) AS tickets,
          (SELECT COUNT(*)::int FROM admin_devices WHERE admin_id = ANY($1::int[])) AS devices,
          (SELECT COUNT(*)::int FROM admin_sessions WHERE admin_id = ANY($1::int[])) AS login_sessions,
          (SELECT COUNT(*)::int FROM admin_access_log WHERE admin_id = ANY($1::int[])) AS access_logs
      `, [targetAdminIds.length ? targetAdminIds : [-1]])).rows[0];

      console.log('================================================================');
      console.log(`MỤC TIÊU DỌN DẸP : ${targetDesc}`);
      console.log('----------------------------------------------------------------');
      console.log(`💬 Hội thoại chat: ${counts.chats} phiên`);
      console.log(`✉️  Tin nhắn      : ${counts.messages} tin (khách, sale, agent, AI)`);
      console.log(`🛒 Đơn hàng      : ${counts.orders} đơn`);
      console.log(`🧾 Hóa đơn/Bill  : ${counts.bills} bản ghi`);
      console.log(`🎫 Vé hỗ trợ     : ${counts.tickets} ticket`);
      if (!options.keepDevices && targetAdminIds.length > 0) {
        console.log(`📱 Thiết bị      : ${counts.devices} thiết bị (${targetAdminIds.length} tài khoản)`);
        console.log(`🔑 Phiên login   : ${counts.login_sessions} phiên`);
        console.log(`📝 Nhật ký log   : ${counts.access_logs} lượt`);
      }
      console.log('================================================================');

      if (!options.apply) {
        await client.query('ROLLBACK');
        console.log('\n💡 [CHẾ ĐỘ XEM TRƯỚC]: Chưa có dữ liệu nào bị thay đổi.');
        console.log('👉 Để THỰC SỰ XÓA, hãy thêm cờ --apply vào cuối lệnh.');
        console.log('Ví dụ:');
        if (options.project) {
          console.log(`   node scripts/cleanup-device-data.js --project "${options.project}" --apply`);
        } else {
          console.log(`   node scripts/cleanup-device-data.js --admin "${options.admin}" --apply`);
        }
        return;
      }

      // --- THỰC HIỆN XÓA THEO THỨ TỰ RÀNG BUỘC (CASCADE) ---
      // 1. Ticket hỗ trợ
      await client.query('DELETE FROM support_ticket_events WHERE ticket_id IN (SELECT id FROM cleanup_tickets)');
      await client.query('DELETE FROM support_tickets WHERE id IN (SELECT id FROM cleanup_tickets)');

      // 2. Đơn hàng, hóa đơn, bản sửa và giao nhận POS
      await client.query('DELETE FROM pos_deliveries WHERE order_id IN (SELECT id FROM cleanup_orders)');
      await client.query('DELETE FROM chat_order_events WHERE order_id IN (SELECT id FROM cleanup_orders)');
      await client.query(`
        DELETE FROM chat_order_bills
         WHERE session_id IN (SELECT id FROM cleanup_sessions)
            OR order_id IN (SELECT id FROM cleanup_orders)
      `);
      await client.query(`
        DELETE FROM chat_order_revisions
         WHERE session_id IN (SELECT id FROM cleanup_sessions)
            OR order_id IN (SELECT id FROM cleanup_orders)
      `);
      await client.query('DELETE FROM chat_orders WHERE id IN (SELECT id FROM cleanup_orders)');

      // 3. Đã xem & tin nhắn & bản dịch
      await client.query('DELETE FROM session_read_receipts WHERE session_id IN (SELECT id FROM cleanup_sessions)');
      await client.query(`
        DELETE FROM message_translations
         WHERE message_id IN (SELECT id FROM messages WHERE session_id IN (SELECT id FROM cleanup_sessions))
      `);
      await client.query('DELETE FROM messages WHERE session_id IN (SELECT id FROM cleanup_sessions)');

      // 4. Phiên chat
      await client.query('DELETE FROM sessions WHERE id IN (SELECT id FROM cleanup_sessions)');

      // 5. Dọn phiên đăng nhập và thiết bị của admin liên quan (trừ khi dùng --keep-devices)
      if (!options.keepDevices && targetAdminIds.length > 0) {
        await client.query('DELETE FROM admin_sessions WHERE admin_id = ANY($1::int[])', [targetAdminIds]);
        await client.query('DELETE FROM admin_access_log WHERE admin_id = ANY($1::int[])', [targetAdminIds]);
        await client.query('DELETE FROM admin_devices WHERE admin_id = ANY($1::int[])', [targetAdminIds]);
        await client.query('UPDATE admins SET last_device_change_at = NULL WHERE id = ANY($1::int[])', [targetAdminIds]);
      }

      await client.query('COMMIT');
      console.log('\n✅ ĐÃ XÓA THÀNH CÔNG TOÀN BỘ DỮ LIỆU ĐƯỢC CHỌN TRÊN CƠ SỞ DỮ LIỆU!');
      if (!options.keepDevices && targetAdminIds.length > 0) {
        console.log('🔒 Các tài khoản liên quan đã được reset phiên và sẽ cần đăng nhập lại.');
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`\n❌ Lỗi: ${error.message}`);
  process.exitCode = 1;
});
