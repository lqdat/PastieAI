/**
 * Test thực tế luồng Messenger webhook
 * Chạy: node test_messenger.js
 * Yêu cầu: server đang chạy (local hoặc production)
 */

const crypto = require('crypto');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// --- CẤU HÌNH ---
const BASE_URL = process.env.TEST_SERVER_URL || 'https://dashboard.pastie.vn'; // Đổi thành http://localhost:3000 để test local
const APP_SECRET = process.env.META_APP_SECRET;

// Dữ liệu giả lập Messenger (thay bằng Page ID thật nếu muốn test project mapping)
const FAKE_PSID       = 'test_visitor_psid_' + Date.now();    // ID người gửi (visitor)
const FAKE_PAGE_ID    = '1216771101509661';                     // Page ID (targetId) — dùng đúng ID fanpage đã cấu hình
const FAKE_MESSAGE    = 'Xin chào, tôi muốn hỏi về dịch vụ';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- Helper: tạo HMAC signature ---
function signPayload(body) {
  return 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
}

// --- Helper: log màu ---
const ok  = (msg) => console.log('\x1b[32m✓\x1b[0m', msg);
const err = (msg) => console.log('\x1b[31m✗\x1b[0m', msg);
const log = (msg) => console.log('\x1b[36mℹ\x1b[0m', msg);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('\n===== TEST LUỒNG MESSENGER WEBHOOK =====\n');
  log(`Server: ${BASE_URL}`);
  log(`Page ID: ${FAKE_PAGE_ID}`);
  log(`Fake PSID: ${FAKE_PSID}`);
  log(`Tin nhắn: "${FAKE_MESSAGE}"\n`);

  // -------------------------------------------------------
  // BƯỚC 1: Verify webhook handshake
  // -------------------------------------------------------
  console.log('--- BƯỚC 1: Verify handshake ---');
  const verifyToken = process.env.META_VERIFY_TOKEN || 'pastie_verify_token_2026';
  const verifyUrl = `${BASE_URL}/api/multichannel/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=test_challenge_abc`;
  const verifyRes = await fetch(verifyUrl);
  const verifyBody = await verifyRes.text();
  if (verifyRes.status === 200 && verifyBody === 'test_challenge_abc') {
    ok(`Handshake passed (200, challenge returned)`);
  } else {
    err(`Handshake failed: ${verifyRes.status} — ${verifyBody}`);
    process.exit(1);
  }

  // -------------------------------------------------------
  // BƯỚC 2: Gửi tin nhắn Messenger giả lập
  // -------------------------------------------------------
  console.log('\n--- BƯỚC 2: Gửi Messenger message payload ---');
  const payload = {
    object: 'page',
    entry: [{
      id: FAKE_PAGE_ID,
      time: Math.floor(Date.now() / 1000),
      messaging: [{
        sender:    { id: FAKE_PSID },
        recipient: { id: FAKE_PAGE_ID },
        timestamp: Math.floor(Date.now() / 1000),
        message: {
          mid: 'mid.test.' + Date.now(),
          text: FAKE_MESSAGE
        }
      }]
    }]
  };

  const payloadStr = JSON.stringify(payload);
  const signature  = signPayload(payloadStr);
  log(`Signature: ${signature.substring(0, 30)}...`);

  const postRes = await fetch(`${BASE_URL}/api/multichannel/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': signature
    },
    body: payloadStr
  });

  if (postRes.status === 200) {
    ok(`Webhook nhận payload: 200 OK`);
  } else {
    err(`Webhook failed: ${postRes.status}`);
    process.exit(1);
  }

  // -------------------------------------------------------
  // BƯỚC 3: Chờ server xử lý (AI reply mất 2-3 giây)
  // -------------------------------------------------------
  console.log('\n--- BƯỚC 3: Chờ server xử lý AI reply (3s)... ---');
  await sleep(3000);

  // -------------------------------------------------------
  // BƯỚC 4: Kiểm tra DB — session và messages
  // -------------------------------------------------------
  console.log('\n--- BƯỚC 4: Kiểm tra DB ---');

  const sessionRes = await pool.query(
    `SELECT * FROM sessions WHERE platform = 'messenger' AND platform_sender_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [FAKE_PSID]
  );

  if (sessionRes.rows.length === 0) {
    err('Không tìm thấy session trong DB!');
  } else {
    const session = sessionRes.rows[0];
    ok(`Session tạo thành công: ${session.id}`);
    log(`  project_id : ${session.project_id}`);
    log(`  platform   : ${session.platform}`);
    log(`  visitor    : ${session.visitor_name}`);
    log(`  status     : ${session.status}`);

    const msgRes = await pool.query(
      `SELECT sender, original_text FROM messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [session.id]
    );

    if (msgRes.rows.length === 0) {
      err('Không có message nào trong DB!');
    } else {
      ok(`Tổng ${msgRes.rows.length} message(s):`);
      msgRes.rows.forEach((m, i) => {
        const label = m.sender === 'visitor' ? '👤 Visitor' : m.sender === 'system' ? '🤖 AI' : '👨 Agent';
        console.log(`  [${i+1}] ${label}: ${m.original_text?.substring(0, 80)}`);
      });

      const aiMsg = msgRes.rows.find(m => m.sender === 'system');
      if (aiMsg) {
        ok('AI đã reply thành công!');
      } else {
        err('Chưa có AI reply — kiểm tra Gemini API key hoặc knowledge base');
      }
    }

    // Cleanup
    console.log('\n--- Dọn dẹp test data ---');
    await pool.query('DELETE FROM messages WHERE session_id = $1', [session.id]);
    await pool.query('DELETE FROM sessions WHERE id = $1', [session.id]);
    ok('Đã xóa session và messages test');
  }

  console.log('\n===== HOÀN THÀNH =====\n');
  await pool.end();
}

run().catch(async (e) => {
  err('Lỗi không mong đợi: ' + e.message);
  await pool.end();
  process.exit(1);
});
