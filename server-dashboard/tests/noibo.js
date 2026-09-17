// CHAT NỘI BỘ CHƯA HỀ ĐƯỢC DỊCH.
//
// Hai lỗi người dùng chụp màn hình gửi về:
//   1. Sale đổi giao diện sang tiếng Trung: khung chat, tên vai trò, ô nhập đều
//      ra tiếng Trung — RIÊNG câu đồng nghiệp nhắn ("Xác nhận bill này") vẫn
//      nguyên tiếng Việt. Nhánh internal_ của GET messages trả thẳng msgs.rows,
//      không đi qua bộ dịch, trong khi nhánh chat khách ngay dưới thì có.
//   2. Tấm hoá đơn kẹp trong chat nội bộ vẫn tiếng Việt, kể cả khi chính hoá
//      đơn đó gửi cho khách đã là tiếng Trung — vì giao diện gọi
//      /details?lang=vi khoá cứng.
//
// Không có khoá AI trong môi trường đo, nên phép đo KHÔNG đòi bản dịch phải
// đúng nghĩa. Nó đòi hai thứ kiểm được chắc chắn:
//   · máy chủ có ĐI QUA đường dịch cho tin nội bộ (trường translated_text có
//     mặt, và bản dịch đã nạp sẵn trong cache thì phải được trả ra),
//   · hoá đơn nhận đúng tham số ngôn ngữ người xem, không phải 'vi' cố định.
const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');

const GOC = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 4899}`;
const DB = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/e2e';

let passed = 0; const failures = [];
const check = (n, c, d) => {
  if (c) { passed++; console.log('  ✓ ' + n); }
  else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); }
};

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
        resolve({ status: res.statusCode, body: json, raw: than.slice(0, 400) });
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
const EMAILS = ['agent-nb@test.local', 'sale-nb@test.local'];

// Câu mà đồng nghiệp nhắn, và bản dịch tiếng Trung nạp sẵn vào cache.
const CAU_VIET = 'Xác nhận bill này';
const CAU_TRUNG = '确认这张账单';

(async () => {
  const db = new Client({ connectionString: DB });
  await db.connect();

  const don = async () => {
    const cu = (await db.query(
      "SELECT id FROM sessions WHERE id LIKE 'internal_agent_%' AND visitor_name = 'Nội bộ'")).rows.map((r) => r.id);
    for (const id of cu) {
      await db.query('DELETE FROM messages WHERE session_id = $1', [id]).catch(() => {});
      await db.query('DELETE FROM sessions WHERE id = $1', [id]).catch(() => {});
    }
    await db.query('DELETE FROM admins WHERE username = ANY($1::text[])', [EMAILS]).catch(() => {});
  };
  await don();

  const agent = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, agent_menu_enabled)
     VALUES ($1,$2,'Quán NB','agent','qr-concierge',TRUE,TRUE) RETURNING id`,
    [EMAILS[0], bam(MK)])).rows[0].id;
  const sale = (await db.query(
    `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, managed_by_admin_id)
     VALUES ($1,$2,'Sale NB','sale','qr-concierge',TRUE,$3) RETURNING id`,
    [EMAILS[1], bam(MK), agent])).rows[0].id;

  const phien = `internal_agent_${agent}_sale_${sale}`;
  // messages có khoá ngoại sang sessions, nên phiên nội bộ phải có dòng thật.
  await db.query(
    `INSERT INTO sessions (id, project_id, visitor_name, platform, status, expires_at, show_in_dashboard)
     VALUES ($1,'qr-concierge','Nội bộ','internal','active',NULL,FALSE)
     ON CONFLICT (id) DO NOTHING`, [phien]);

  // Tin nhắn CŨ: có từ trước, đúng như tin người dùng thấy còn tiếng Việt.
  const tin = (await db.query(
    `INSERT INTO messages (session_id, sender, sender_admin_id, original_text, created_at)
     VALUES ($1,'sale',$2,$3, NOW() - INTERVAL '2 hours') RETURNING id`,
    [phien, sale, CAU_VIET])).rows[0].id;

  // NẠP SẴN bản dịch vào cache, y như cách dich.js làm với tên món: phép đo
  // không phụ thuộc vào việc môi trường có khoá AI hay không. Nếu máy chủ có đi
  // qua đường dịch thì nó PHẢI lấy được dòng này ra.
  await db.query(
    `INSERT INTO message_translations (message_id, target_lang, translated_text)
     VALUES ($1,'zh',$2)
     ON CONFLICT (message_id, target_lang) DO UPDATE SET translated_text = EXCLUDED.translated_text`,
    [tin, CAU_TRUNG]).catch(async (e) => {
      // Bảng có thể dùng tên cột khác; in ra để biết ngay thay vì đo nhầm.
      console.log('  (không nạp được cache dịch: ' + e.message + ')');
    });

  const dn = async (u) => (await goi('/api/admin/login', { method: 'POST', body: { username: u, password: MK } })).body?.token;
  const tAgent = await dn(EMAILS[0]);
  check('đăng nhập được bằng vai Agent', Boolean(tAgent));
  if (!tAgent) { await db.end(); process.exit(1); }

  // ── Đọc chat nội bộ bằng tiếng Trung ──────────────────────────────────────
  const r = await goi(`/api/admin/chats/${phien}/messages?adminLang=zh`, { token: tAgent });
  check('đọc được chat nội bộ', r.status === 200 && Array.isArray(r.body), `status=${r.status} ${r.raw}`);
  const m = Array.isArray(r.body) ? r.body.find((x) => Number(x.id) === Number(tin)) : null;
  check('tìm thấy đúng tin nhắn cũ', Boolean(m), r.raw);

  if (m) {
    check('tin nội bộ ĐI QUA bộ dịch (có trường translated_text)',
      Object.prototype.hasOwnProperty.call(m, 'translated_text'),
      'chỉ có: ' + Object.keys(m).join(', '));
    check('tin nội bộ CŨ được trả về bằng tiếng người đang xem',
      m.translated_text === CAU_TRUNG,
      `translated_text = ${JSON.stringify(m.translated_text)} · original = ${JSON.stringify(m.original_text)}`);
    check('nguyên văn tiếng Việt KHÔNG bị mất',
      m.original_text === CAU_VIET, JSON.stringify(m.original_text));
  }

  // Đọc lại bằng tiếng Việt: phải ra đúng nguyên văn, không lẫn bản tiếng Trung.
  const rv = await goi(`/api/admin/chats/${phien}/messages?adminLang=vi`, { token: tAgent });
  const mv = Array.isArray(rv.body) ? rv.body.find((x) => Number(x.id) === Number(tin)) : null;
  check('xem bằng tiếng Việt thì vẫn là câu gốc, không lẫn bản dịch',
    Boolean(mv) && (mv.translated_text || mv.original_text) === CAU_VIET,
    JSON.stringify(mv && mv.translated_text));

  // ── Tin chuyển hoá đơn KHÔNG được dịch ────────────────────────────────────
  // Dấu [[bill:<id>]] là dấu MÁY ĐỌC. Dịch nó là phá dấu, giao diện hết nhận ra
  // hoá đơn và in thẳng chuỗi đó ra giữa khung chat.
  const dauBill = '[[bill:11111111-1111-1111-1111-111111111111]]';
  const tinBill = (await db.query(
    `INSERT INTO messages (session_id, sender, sender_admin_id, original_text, system_kind, created_at)
     VALUES ($1,'sale',$2,$3,'order_forward', NOW() - INTERVAL '1 hour') RETURNING id`,
    [phien, sale, dauBill])).rows[0].id;
  const r2 = await goi(`/api/admin/chats/${phien}/messages?adminLang=zh`, { token: tAgent });
  const mb = Array.isArray(r2.body) ? r2.body.find((x) => Number(x.id) === Number(tinBill)) : null;
  check('dấu [[bill:…]] giữ nguyên, không bị bộ dịch đụng vào',
    Boolean(mb) && mb.original_text === dauBill && !mb.translated_text,
    mb ? `original=${mb.original_text} translated=${mb.translated_text}` : 'không thấy tin');

  // ── Giao diện không được khoá cứng lang=vi cho hoá đơn ────────────────────
  const fs = require('fs');
  const chat = fs.readFileSync('/home/claude/g2ui/app/chat.js', 'utf8');
  check('hoá đơn trong chat nội bộ KHÔNG còn khoá cứng lang=vi',
    !/orders\/\$\{encodeURIComponent\(orderId\)\}\/details\?lang=vi/.test(chat),
    'vẫn còn ?lang=vi trong hydrateForwardedBills');
  check('hoá đơn trong chat nội bộ lấy theo ngôn ngữ người đang xem',
    /details\?lang=\$\{encodeURIComponent\(tieng\)\}/.test(chat));
  check('cache hoá đơn ghim theo CẢ ngôn ngữ, đổi tiếng không lấy lại ảnh cũ',
    /forwardedBillCache\.set\(khoaCache/.test(chat) && /\$\{orderId\}\|\$\{tieng\}/.test(chat));

  await don();
  await db.end();
  console.log('');
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
