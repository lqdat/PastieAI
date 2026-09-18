// NGÔN NGỮ KHÁCH CHỌN PHẢI ĐI HẾT CHẶNG, KHÔNG ÂM THẦM VỀ TIẾNG VIỆT.
//
// Bài này sinh ra từ một lỗi thật: khách chọn tiếng Kazakh rồi đăng nhập bằng
// Google thì được chào bằng tiếng Việt. Nguyên nhân không nằm ở câu chào —
// đường /api/qr-chat/google viết cứng 'vi' vào cột detected_language của phiên
// mới, mà cột đó là ngôn ngữ MỌI tin nhắn sau đó được dịch sang và là ngôn ngữ
// in trên hoá đơn. Câu chào chỉ là chỗ đầu tiên nhìn thấy được.
//
// Nên bài đo không dừng ở câu chào: nó đi theo mã ngôn ngữ từ lúc tạo phiên,
// qua lời chào, tới tin hệ thống, và tới hoá đơn.
const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');
const { decryptText } = require('../crypto-helper');

const GOC = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 4899}`;
const DB = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/e2e';

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

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
        resolve({ status: res.statusCode, body: json, raw: than.slice(0, 240) });
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
const PHIEN = 'sess-tiengkhach-1';

// 9 chữ riêng của tiếng Kazakh, không có trong bảng chữ Nga. Dùng để phân biệt
// "đã dịch sang Kazakh thật" với "trả về tiếng Nga cho xong".
const RIENG_KK = 'әғқңөұүһіӘҒҚҢӨҰҮҺІ';
const coKazakh = (t) => [...RIENG_KK].some((c) => String(t || '').includes(c));
const coTiengViet = (t) => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(String(t || ''));

(async () => {
  const db = new Client({ connectionString: DB });
  await db.connect();

  const EMAIL_AGENT = 'agent-tk@test.local';
  for (const b of ['chat_order_events', 'chat_order_bills', 'chat_order_revisions', 'chat_orders', 'messages']) {
    await db.query(`DELETE FROM ${b} WHERE session_id = $1`, [PHIEN]).catch(() => {});
  }
  await db.query('DELETE FROM sessions WHERE id = $1', [PHIEN]);
  await db.query('DELETE FROM qr_menu_items WHERE name LIKE $1', ['[TK]%']);
  await db.query('DELETE FROM qr_chat_accounts WHERE label = $1', ['Bàn TK']).catch(() => {});
  await db.query('DELETE FROM admins WHERE username = $1', [EMAIL_AGENT]);

  const agent = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, agent_menu_enabled)
     VALUES ($1,$2,'Quán TK','agent','qr-concierge',TRUE,TRUE) RETURNING id`,
    [EMAIL_AGENT, bam(MK)])).rows[0].id;
  const mon = (await db.query(
    `INSERT INTO qr_menu_items (agent_id, project_id, name, price, is_available, stock_quantity)
     VALUES ($1,'qr-concierge','[TK] Phở',60000,TRUE,100) RETURNING id`, [agent])).rows[0].id;

  // ── 1. KHÔNG CÒN CHỖ NÀO VIẾT CỨNG 'vi' KHI TẠO PHIÊN ────────────────────
  //
  // Đo thẳng trên mã nguồn, vì đây là lỗi im lặng: nó không ném lỗi, không ghi
  // log, chỉ lặng lẽ đổi ngôn ngữ của cả cuộc trò chuyện. Chờ nó hiện ra trên
  // màn hình rồi mới bắt thì đã muộn.
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  const insertPhien = [...src.matchAll(/INSERT INTO sessions[\s\S]{0,700}?VALUES\s*\(([^`]*?)\)`/g)];
  const insertCungVi = insertPhien.filter((m) => /'vi'/.test(m[1]));
  check('không câu INSERT INTO sessions nào viết cứng ngôn ngữ',
    insertCungVi.length === 0,
    insertCungVi.map((m) => m[0].slice(0, 130)).join('\n      ')
    + '\n      — cột detected_language là ngôn ngữ của CẢ phiên, viết cứng là đổi ngôn ngữ của khách mà không báo');

  const goiChao = [...src.matchAll(/sendQrWelcome\(\{[\s\S]{0,320}?\}\)/g)];
  const chaoCungVi = goiChao.filter((m) => /lang:\s*'vi'/.test(m[0]));
  check('không lời gọi sendQrWelcome nào viết cứng lang: \'vi\'',
    chaoCungVi.length === 0, chaoCungVi.map((m) => m[0].slice(0, 160)).join('\n      '));
  check('cả ba lối vào đều có gọi lời chào', goiChao.length >= 3, `${goiChao.length} lời gọi`);

  // Danh sách ngôn ngữ KHÁCH CHỌN chỉ được khai MỘT chỗ.
  //
  // MENU_LANGS được trừ ra có chủ ý: đó là danh sách ngôn ngữ mà tên món được
  // DỊCH SẴN và lưu vào database, không phải danh sách ngôn ngữ khách được
  // chọn. Hai tập hiện đang trùng giá trị, nhưng chúng trả lời hai câu hỏi
  // khác nhau và hoàn toàn có thể tách nhau về sau (thêm một thứ tiếng cho
  // khách chọn mà chưa muốn dịch sẵn cả thực đơn sang tiếng đó).
  const banChep = src.split('\n')
    .filter((d) => /\['vi',\s*'en',\s*'ru',\s*'zh',\s*'ko',\s*'kk'\]/.test(d))
    .filter((d) => !/MENU_LANGS/.test(d));
  check('danh sách ngôn ngữ khách chỉ khai một chỗ, không chép rải rác',
    banChep.length <= 1,
    `đang có ${banChep.length} bản:\n      ` + banChep.map((d) => d.trim().slice(0, 90)).join('\n      ')
    + '\n      — chép nhiều bản thì thêm ngôn ngữ mới sẽ quên mất một chỗ');

  // ── 2. LỜI CHÀO THEO ĐÚNG TIẾNG KHÁCH CHỌN ───────────────────────────────
  //
  // Gọi thẳng đường OTP (đường Google cần token thật của Google nên không dựng
  // lại được ở đây) — nhưng phép đo mã nguồn ở trên đã canh chính chỗ hỏng của
  // đường Google.
  const qr = (await db.query(
    `INSERT INTO qr_chat_accounts (project_id, code, label, owner_admin_id, is_active)
     VALUES ('qr-concierge', $1, 'Bàn TK', $2, TRUE)
     ON CONFLICT (code) DO UPDATE SET is_active = TRUE RETURNING id, code`,
    ['tk-' + Date.now().toString(36), agent])).rows[0];

  for (const [ma, ten] of [['kk', 'Kazakh'], ['ko', 'Hàn'], ['ru', 'Nga']]) {
    const sid = `${PHIEN}-${ma}`;
    await db.query('DELETE FROM messages WHERE session_id = $1', [sid]).catch(() => {});
    await db.query('DELETE FROM sessions WHERE id = $1', [sid]).catch(() => {});
    await db.query(
      `INSERT INTO sessions (id, project_id, visitor_name, detected_language, status, qr_account_id,
                             assigned_admin_id, expires_at, show_in_dashboard)
       VALUES ($1,'qr-concierge','Khách TK',$2,'active',$3,$4,NULL,TRUE)`,
      [sid, ma, qr.id, agent]);

    // Lời chào được dựng qua chính hàm của máy chủ, gọi bằng đường resume.
    const ra = await goi(`/api/qr-chat/${qr.code}/resume`, {
      method: 'POST', body: { identityToken: 'khong-co', language: ma },
    });
    // resume không có định danh thì trả authenticated:false — không sao, phần
    // cần đo là hàm dựng câu chào, đo trực tiếp ở dưới.
    void ra;
  }

  // Đo thẳng bảng câu chào trong mã nguồn: nó là literal, không gọi ra được từ
  // ngoài, mà lại chính là chỗ khách nhìn thấy đầu tiên.
  const khoiChao = src.slice(src.indexOf('function buildQrGreeting'), src.indexOf('async function sendQrWelcome'));
  for (const ma of ['vi', 'en', 'ru', 'zh', 'ko', 'kk']) {
    check(`câu chào có nhánh "${ma}"`, new RegExp(`\\n\\s{4}${ma}: \\{`).test(khoiChao));
  }
  const nhanhKk = /\n\s{4}kk: \{[\s\S]*?\n\s{4}\},/.exec(khoiChao)?.[0] || '';
  check('câu chào Kazakh viết bằng chữ Kazakh thật, không phải tiếng Nga chép lại',
    coKazakh(nhanhKk), nhanhKk.slice(0, 160));
  check('câu chào Kazakh không lẫn tiếng Việt', !coTiengViet(nhanhKk.replace(/\/\/[^\n]*/g, '')),
    nhanhKk.slice(0, 200));

  // ── 3. TIN ĐƠN QUÁ HẠN ĐẾN TAY KHÁCH BẰNG TIẾNG CỦA KHÁCH ────────────────
  //
  // Đây là phần đo chạy thật: dựng một phiên Kazakh, đặt đơn, cho quá hạn, rồi
  // đọc đúng câu khách nhận được.
  const nhom = (await db.query(
    `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1,'qr-concierge','Nhóm TK')
     ON CONFLICT DO NOTHING RETURNING id`, [agent])).rows[0]?.id
    || (await db.query(`SELECT id FROM agent_groups WHERE agent_id=$1 AND name='Nhóm TK'`, [agent])).rows[0].id;
  await db.query(
    `INSERT INTO sessions (id, project_id, visitor_name, detected_language, status, group_id,
                           qr_account_id, assigned_admin_id, expires_at, show_in_dashboard)
     VALUES ($1,'qr-concierge','Khách TK','kk','active',$2,$3,$4,NULL,TRUE)`,
    [PHIEN, nhom, qr.id, agent]);

  const dat = await goi(`/api/chats/${PHIEN}/menu/order`, {
    method: 'POST', body: { items: [{ itemId: mon, quantity: 1 }], language: 'kk' },
  });
  check('khách nói tiếng Kazakh đặt được món', dat.status === 200 || dat.status === 201, `HTTP ${dat.status} ${dat.raw}`);

  const don = (await db.query(
    `SELECT id FROM chat_orders WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`, [PHIEN])).rows[0];
  await db.query(
    `UPDATE chat_orders SET pending_since = NOW() - INTERVAL '6 minutes',
                            created_at = NOW() - INTERVAL '6 minutes' WHERE id = $1`, [don.id]);
  await goi(`/api/chats/${PHIEN}/order`);   // kích kiểm tra lười -> đơn tự huỷ

  const tinKhach = (await db.query(
    `SELECT original_text, language FROM messages
      WHERE session_id = $1 AND system_kind = 'guest_only'
      ORDER BY created_at DESC LIMIT 1`, [PHIEN])).rows[0];
  const cau = decryptText(tinKhach?.original_text || '') || (tinKhach?.original_text || '');

  check('tin báo đơn hết hạn đến tay khách bằng TIẾNG KAZAKH',
    coKazakh(cau), `câu đang gửi: "${cau}"`);
  check('… và không còn là tiếng Việt', !coTiengViet(cau), `"${cau}"`);
  check('… và cột language ghi đúng "kk", không phải "vi"',
    tinKhach?.language === 'kk',
    `language=${tinKhach?.language} — ghi 'vi' thì máy dịch sẽ đem câu đã đúng tiếng đi dịch lại lần nữa`);

  // Câu cho nhân viên thì NGƯỢC LẠI: vẫn tiếng Việt. Nhân viên là người Việt,
  // và câu đó đi qua đường dịch riêng theo ngôn ngữ nhân viên đang chọn.
  const tinNv = (await db.query(
    `SELECT original_text FROM messages
      WHERE session_id = $1 AND system_kind = 'order_expired' ORDER BY created_at DESC LIMIT 1`, [PHIEN])).rows[0];
  const cauNv = decryptText(tinNv?.original_text || '') || (tinNv?.original_text || '');
  check('câu cho nhân viên vẫn giữ tiếng Việt làm bản gốc',
    coTiengViet(cauNv), `"${cauNv}"`);

  // ── 4. HOÁ ĐƠN CŨNG THEO TIẾNG KHÁCH ─────────────────────────────────────
  const hoaDon = await goi(`/api/chats/${PHIEN}/order`);
  check('ngôn ngữ trả về cho khách Kazakh là "kk", không âm thầm về "vi"',
    hoaDon.body?.language === 'kk', `language=${hoaDon.body?.language}`);

  await db.end();
  console.log('');
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
