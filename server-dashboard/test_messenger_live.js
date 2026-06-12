/**
 * Test thực tế Messenger → Dashboard
 * Gửi tin nhắn giả lập vào webhook với Page ID thật
 * Data KHÔNG bị xóa → xuất hiện trên dashboard ngay
 *
 * Chạy: node test_messenger_live.js
 */

const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const BASE_URL   = 'https://dashboard.pastie.vn';
const APP_SECRET = process.env.META_APP_SECRET;
const PAGE_ID    = '1216771101509661'; // Fanpage ID thật đã cấu hình

// Tên & PSID giả lập — đổi để phân biệt các lần test
const FAKE_PSID = 'live_test_psid_' + Date.now();
const FAKE_NAME = 'Test Visitor (Live)';
const MESSAGE   = process.argv[2] || 'Xin chào! Tôi muốn hỏi về dịch vụ của Pastie.';

function sign(body) {
  return 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
}

const ok  = (m) => console.log('\x1b[32m✓\x1b[0m', m);
const err = (m) => console.log('\x1b[31m✗\x1b[0m', m);
const log = (m) => console.log('\x1b[36mℹ\x1b[0m', m);

async function run() {
  console.log('\n===== TEST MESSENGER → DASHBOARD (LIVE) =====\n');
  log(`Webhook: ${BASE_URL}/api/multichannel/webhook`);
  log(`Page ID: ${PAGE_ID}`);
  log(`PSID:    ${FAKE_PSID}`);
  log(`Tin nhắn: "${MESSAGE}"`);
  log('(Truyền tin nhắn khác: node test_messenger_live.js "nội dung bạn muốn")\n');

  const payload = {
    object: 'page',
    entry: [{
      id: PAGE_ID,
      time: Math.floor(Date.now() / 1000),
      messaging: [{
        sender:    { id: FAKE_PSID },
        recipient: { id: PAGE_ID },
        timestamp: Math.floor(Date.now() / 1000),
        message: {
          mid: 'mid.live.' + Date.now(),
          text: MESSAGE
        }
      }]
    }]
  };

  const body = JSON.stringify(payload);
  const sig  = sign(body);

  const res = await fetch(`${BASE_URL}/api/multichannel/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': sig
    },
    body
  });

  if (res.status === 200) {
    ok('Webhook nhận thành công (200 OK)');
    console.log('\n⏳ Đợi Gemini AI xử lý ~3 giây...\n');
    await new Promise(r => setTimeout(r, 3500));
    ok('Xong! Kiểm tra dashboard:');
    console.log(`\n   👉  ${BASE_URL}/admin\n`);
    console.log('   Tìm session có tên "Facebook User" trong danh sách chat bên trái.\n');
    console.log('   Tin nhắn và AI reply sẽ hiển thị trong cuộc trò chuyện đó.\n');
  } else {
    const body = await res.text();
    err(`Webhook thất bại: ${res.status} — ${body}`);
  }
}

run().catch(e => {
  err('Lỗi: ' + e.message);
  process.exit(1);
});
