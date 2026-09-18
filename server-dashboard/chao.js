// LỜI CHÀO BỊ DỊCH VÒNG — tên quán biến thành một cái tên khác hẳn.
//
// Lỗi thật, khách chụp màn hình: đầu trang ghi "Hộ kinh doanh Phú Quốc", câu
// chào ngay bên dưới ghi "Cửa hàng gia dụng Phú Quốc".
//
// Đường đi của lỗi: câu chào được ghép MỘT LẦN theo ngôn ngữ lúc tạo phiên, và
// tên quán chèn vào đó là bản ĐÃ DỊCH sang ngôn ngữ đó. Khách đổi ngôn ngữ thì
// cả câu đi qua máy dịch như mọi tin nhắn khác -> tên quán bị dịch LẦN HAI,
// lần này từ bản dịch chứ không phải từ tên gốc.
//
// Bài này chạy máy chủ thật + Postgres thật, và CẮM MỘT MÁY DỊCH GIẢ có dấu
// nhận biết («MAYDICH→xx»). Nhờ vậy đo được thẳng điều cần biết: câu nào đi qua
// máy dịch, câu nào không. Không có dấu đó thì không phân biệt nổi "dịch đúng"
// với "không dịch".
const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');

const GOC = 'http://localhost:4899';
const DB = 'postgresql://postgres:postgres@localhost:5432/e2e';

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? ' — ' + d : '')); } };

function goi(duong, { method = 'GET', token, body } = {}) {
  return new Promise((resolve, reject) => {
    const du = body ? JSON.stringify(body) : null;
    const req = http.request(GOC + duong, {
      method,
      headers: {
        ...(du ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(du) } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    }, (res) => {
      let than = '';
      res.on('data', (c) => { than += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(than); } catch { /* để nguyên */ }
        resolve({ status: res.statusCode, body: json, raw: than.slice(0, 300) });
      });
    });
    req.on('error', reject);
    if (du) req.write(du);
    req.end();
  });
}

const bam = (mk) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.pbkdf2Sync(mk, salt, 1000, 64, 'sha512').toString('hex');
};
const MK = 'MatKhauKiemThu123';

// Đúng tên quán trong ảnh chụp màn hình của người dùng.
const TEN_QUAN = 'Hộ Kinh Doanh Phú Quốc';
const TEN_BAN = 'Bàn 97';
const MA_QR = 'CHAOTEST';
const EMAIL_KHACH = 'khach-chao@test.local';

(async () => {
  const db = new Client({ connectionString: DB });
  await db.connect();

  // ── Dọn và dựng dữ liệu ──────────────────────────────────────────────────
  const don = async () => {
    await db.query(`DELETE FROM messages WHERE session_id IN
      (SELECT id FROM sessions WHERE LOWER(visitor_email) = LOWER($1))`, [EMAIL_KHACH]);
    await db.query('DELETE FROM sessions WHERE LOWER(visitor_email) = LOWER($1)', [EMAIL_KHACH]);
    await db.query('DELETE FROM qr_chat_accounts WHERE code = $1', [MA_QR]);
    await db.query('DELETE FROM agent_groups WHERE name = $1', ['Nhóm Chào']);
    await db.query('DELETE FROM admins WHERE username = $1', ['agent-chao@test.local']);
  };
  await don();

  const agent = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active)
     VALUES ($1,$2,$3,'agent','qr-concierge',TRUE) RETURNING id`,
    ['agent-chao@test.local', bam(MK), TEN_QUAN])).rows[0].id;

  const nhom = (await db.query(
    `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1,'qr-concierge',$2) RETURNING id`,
    [agent, 'Nhóm Chào'])).rows[0].id;

  const qr = (await db.query(
    `INSERT INTO qr_chat_accounts (project_id, code, owner_admin_id, label, group_id, is_active)
     VALUES ('qr-concierge',$1,$2,$3,$4,TRUE) RETURNING id`,
    [MA_QR, agent, TEN_BAN, nhom])).rows[0].id;

  check('dựng được quán, nhóm và mã QR', Boolean(agent && nhom && qr));

  // ── Khách vào bằng TIẾNG ANH ─────────────────────────────────────────────
  //
  // Đây là điều kiện sinh ra lỗi: câu chào được lưu bằng tiếng Anh, mang tên
  // quán ĐÃ dịch sang tiếng Anh.
  await goi('/api/otp/send', { method: 'POST', body: { email: EMAIL_KHACH, projectId: 'qr-concierge', qrCode: MA_QR, language: 'en' } });
  const otpRow = (await db.query('SELECT code FROM otps WHERE email = $1 LIMIT 1', [EMAIL_KHACH])).rows[0];
  check('lấy được mã OTP để vào phiên', Boolean(otpRow?.code), JSON.stringify(otpRow));
  if (!otpRow?.code) { await db.end(); process.exit(1); }

  const vao = await goi('/api/otp/verify', {
    method: 'POST',
    body: { email: EMAIL_KHACH, code: otpRow.code, projectId: 'qr-concierge', qrCode: MA_QR, language: 'en' },
  });
  const phien = vao.body?.sessionId;
  const dinhDanh = vao.body?.identityToken || vao.body?.identity?.token || null;
  const dd = dinhDanh ? '&identityToken=' + encodeURIComponent(dinhDanh) : '';
  check('khách vào được phiên bằng tiếng Anh', Boolean(phien), `HTTP ${vao.status} ${vao.raw}`);
  if (!phien) { await db.end(); process.exit(1); }

  const luu = (await db.query(
    `SELECT original_text, language, system_kind FROM messages
      WHERE session_id = $1 ORDER BY id LIMIT 1`, [phien])).rows[0];
  console.log(`     (đã lưu [${luu?.system_kind}/${luu?.language}]: "${luu?.original_text}")`);
  check('phiên có lời chào', Boolean(luu?.original_text));
  check('lời chào được đánh dấu riêng là guest_welcome, không lẫn với lời cảm ơn',
    luu?.system_kind === 'guest_welcome', `system_kind=${luu?.system_kind}`);

  // ── ĐÂY LÀ ĐIỀU PHẢI ĐO: khách đổi sang tiếng Việt ───────────────────────
  const doc = await goi(`/api/chats/${phien}/messages?visitorLang=vi${dd}`);
  const tin = (doc.body?.messages || doc.body || []);
  const chao = (Array.isArray(tin) ? tin : []).find((m) => m.sender === 'system');
  const chu = String(chao?.translated_text || '');
  console.log(`     (khách đọc bằng vi: "${chu}")`);

  check('khách đọc được lời chào sau khi đổi ngôn ngữ', Boolean(chu), `HTTP ${doc.status} ${doc.raw}`);

  // 1. Không được đi qua máy dịch. Máy dịch giả để lại dấu; còn dấu là còn lỗi.
  check('lời chào KHÔNG đi qua máy dịch',
    Boolean(chu) && !chu.includes('MAYDICH'),
    'câu chào vẫn bị đem đi dịch — tên quán trong đó là bản đã dịch, dịch lần nữa là méo tên');

  // 2. Tên quán phải đúng NGUYÊN VĂN như đầu trang.
  check('tên quán trong lời chào đúng nguyên văn "Hộ Kinh Doanh Phú Quốc"',
    chu.includes(TEN_QUAN),
    `câu chào đang ghi: "${chu}"`);

  // 3. Và phải là câu tiếng Việt thật, không phải bản dịch máy của câu tiếng Anh.
  check('lời chào là bản tiếng Việt gốc trong mã nguồn',
    chu.includes('rất vui được đón bạn') && chu.includes('Chat ngay nhé! 😊'),
    `câu chào đang ghi: "${chu}"`);

  // 3b. Mặt cười gõ bằng dấu câu ":)))" đã được thay bằng icon.
  //
  // Đo ở MÃ NGUỒN chứ không riêng câu vừa lấy về: bảng chào có sáu thứ tiếng,
  // lượt gọi này chỉ chạm hai bản. Sót một bản là một nhóm khách vẫn thấy dấu cũ.
  {
    const nguon = require('fs').readFileSync(require('path').join(__dirname, 'server.js'), 'utf8');
    const bang = nguon.slice(nguon.indexOf('function buildQrGreeting'), nguon.indexOf('async function sendQrWelcome'));
    check('không còn ":)))" trong bất kỳ bản chào nào', !bang.includes(':)))'),
      bang.split('\n').filter((d) => d.includes(':)))')).join('\n      '));
    check('lời chào kết bằng icon', (bang.match(/😊/g) || []).length >= 6,
      `mới có ${(bang.match(/😊/g) || []).length}/6 bản dùng icon`);
  }

  // 4. Tên bàn cũng phải đúng.
  check('tên bàn hiện đúng "Bàn 97"', chu.includes(TEN_BAN), `câu chào đang ghi: "${chu}"`);

  // ── Vẫn phải chào đúng khi khách đọc bằng tiếng Anh ───────────────────────
  const docEn = await goi(`/api/chats/${phien}/messages?visitorLang=en${dd}`);
  const tinEn = (docEn.body?.messages || docEn.body || []);
  const chaoEn = String((Array.isArray(tinEn) ? tinEn : []).find((m) => m.sender === 'system')?.translated_text || '');
  console.log(`     (khách đọc bằng en: "${chaoEn}")`);
  check('đọc bằng tiếng Anh vẫn ra câu tiếng Anh, không phải tiếng Việt',
    chaoEn.includes('Welcome to') && chaoEn.includes('Chat with us right here! 😊'),
    `câu chào đang ghi: "${chaoEn}"`);
  // Tên quán ĐƯỢC dịch một chặng (vi -> en) — đó là thiết kế đúng, nên dấu máy
  // dịch xuất hiện ở đây là bình thường. Điều phải cấm là dịch CHỒNG: hai dấu
  // dính liền nhau nghĩa là một bản dịch lại bị đem đi dịch tiếp, đúng cái đã
  // làm "Hộ kinh doanh" thành "Cửa hàng gia dụng".
  check('tên quán chỉ đi qua máy dịch ĐÚNG MỘT chặng, không dịch chồng',
    !/«MAYDICH→[a-z]+»\s*«MAYDICH/.test(chaoEn),
    `câu chào đang ghi: "${chaoEn}"`);
  check('câu chào tiếng Anh không bị dịch NGUYÊN CÂU',
    chaoEn.trimStart().startsWith('Hi ') || chaoEn.trimStart().startsWith('Hello'),
    `câu mở đầu sai: "${chaoEn.slice(0, 40)}"`);

  // ── Tin nhắn THƯỜNG thì vẫn phải được dịch ───────────────────────────────
  //
  // Chốt chặn quan trọng nhất của bài này: rất dễ "sửa" bằng cách tắt dịch cho
  // cả khung chat, và mọi phép đo ở trên vẫn xanh trong khi sản phẩm thì hỏng.
  const guiTin = await goi('/api/chats/message', {
    method: 'POST',
    body: { sessionId: phien, sender: 'visitor', text: 'Cho tôi xin thực đơn',
            targetLang: 'en', visitorLang: 'vi', identityToken: dinhDanh },
  });
  check('khách gửi được một tin nhắn thường', guiTin.status === 200, `HTTP ${guiTin.status} ${guiTin.raw}`);
  const docEn2 = await goi(`/api/chats/${phien}/messages?visitorLang=en${dd}`);
  const tinEn2 = (docEn2.body?.messages || docEn2.body || []);
  const cuaKhach = (Array.isArray(tinEn2) ? tinEn2 : []).find((m) => m.sender === 'visitor');
  check('tin nhắn thường VẪN được dịch như cũ',
    String(cuaKhach?.translated_text || '').includes('MAYDICH'),
    `tin của khách trả về: "${cuaKhach?.translated_text}" — nếu không có dấu máy dịch thì bản vá đã tắt nhầm cả dịch tin nhắn`);

  // ── Sale/Agent không được thấy lời chào ──────────────────────────────────
  const dn = await goi('/api/admin/login', { method: 'POST', body: { username: 'agent-chao@test.local', password: MK } });
  const tAgent = dn.body?.token;
  check('đăng nhập được Agent', Boolean(tAgent), `HTTP ${dn.status} ${dn.raw}`);
  if (tAgent) {
    const khungSale = await goi(`/api/admin/chats/${phien}/messages`, { token: tAgent });
    const dsSale = khungSale.body?.messages || khungSale.body || [];
    const loSale = (Array.isArray(dsSale) ? dsSale : []).some((m) => m.system_kind === 'guest_welcome');
    check('lời chào KHÔNG lọt vào khung chat của Agent/Sale', !loSale,
      'đổi tên system_kind mà quên sửa bộ lọc thì lời chào hiện lại ở màn nhân viên');
  }

  await don();
  await db.end();
  console.log('\n' + (failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`));
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
