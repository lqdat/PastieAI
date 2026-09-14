#!/usr/bin/env node
// DỰNG DỮ LIỆU THẬT CHO "agenttest" — QUA CHÍNH API ĐANG CHẠY.
//
// Chạy trong server-dashboard, KHI MÁY CHỦ ĐANG BẬT (npm start / node server.js):
//
//   node seed-agenttest.js            # dựng dữ liệu rồi đo luôn — DỮ LIỆU Ở LẠI
//   node seed-agenttest.js --do       # chỉ ĐO lại, không đụng dữ liệu
//   node seed-agenttest.js --xoa      # xoá sạch — chỉ chạy khi tự gõ lệnh này
//
// Dựng xong là dữ liệu NẰM LẠI trong cơ sở dữ liệu để đăng nhập vào kiểm. Chỉ
// có hai lúc dữ liệu bị xoá: khi gõ --xoa, và ở ĐẦU mỗi lần chạy lệnh dựng (dọn
// bản cũ để dựng lại từ đầu, tránh trộn hai lần chạy vào nhau).
//
// Tự đọc DATABASE_URL và PORT trong .env cùng thư mục. Đổi được từ ngoài:
//   GOC=http://localhost:3000 AGENT_EMAIL=... SO_DON=130 node seed-agenttest.js
//
// SO_DON mặc định là 10 cho nhanh. Muốn thấy lỗi TRẦN 100 ĐƠN thì phải đặt
// SO_DON lớn hơn 100 — dưới ngưỡng đó thì API trả đủ, không có gì để thấy.
//
// ─── VÌ SAO GỌI API THẬT ────────────────────────────────────────────────────
// Đơn hàng và hoá đơn KHÔNG được nhét thẳng vào bảng. Toàn bộ vòng đời đi qua
// đúng những endpoint mà khách và nhân viên đang dùng:
//
//   khách đặt món      POST /api/chats/:phien/menu/order
//   khách chọn cách trả POST /api/chats/:phien/order/payment-method
//   Sale xác nhận       POST /api/admin/orders/:id/confirm
//   Agent thu tiền      POST /api/admin/orders/:id/paid
//
// Nhét thẳng vào bảng thì dựng ra một trạng thái mà mã nguồn không bao giờ tạo
// được, và lỗi đo ra sau đó là lỗi của dữ liệu giả chứ không phải của sản phẩm.
// Chỉ có tài khoản, nhóm, mã QR, thực đơn và PHIÊN CHAT là ghi thẳng — ba thứ
// đầu vốn do người dùng tạo bằng tay, còn phiên chat thì cần OTP gửi qua email
// thật nên không tự động hoá được.
//
// ─── AN TOÀN ────────────────────────────────────────────────────────────────
// Mọi dòng script này tạo ra đều mang dấu riêng, và --xoa chỉ xoá đúng chúng:
//   nhóm       = "[AGENTTEST] ..."          ·  mã QR = bắt đầu "AGTEST"
//   món        = bắt đầu "[AGENTTEST]"      ·  phiên chat = id bắt đầu "agenttest-"
//
// TÀI KHOẢN THÌ KHÔNG BAO GIỜ BỊ XOÁ. Có sẵn thì dùng lại (không đụng mật khẩu),
// chưa có thì tạo mới. Hai email này có thể do chính người dùng tạo tay, nên xoá
// rồi dựng lại ở mỗi lần chạy là làm mất tài khoản của người ta.
// Không câu lệnh nào chạm dữ liệu ngoài phạm vi đó — chạy được trên cơ sở dữ
// liệu đang có khách thật.
//
// ─── TÀI KHOẢN KHÔNG CÓ MẬT KHẨU ────────────────────────────────────────────
// Đăng nhập dashboard bằng OTP gửi về email, hoặc bằng Google. Script tự cấp
// cho mình một phiên làm việc trong admin_sessions để gọi API — đúng cơ chế mà
// lần đăng nhập thật cấp ra, và phiên đó tự hết hạn sau 2 tiếng.
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { Client } = require('pg');

function docEnv(khoa) {
  if (process.env[khoa]) return process.env[khoa];
  const duong = path.join(__dirname, '.env');
  if (!fs.existsSync(duong)) return null;
  for (const dong of fs.readFileSync(duong, 'utf8').split(/\r?\n/)) {
    const khop = dong.match(new RegExp(`^\\s*${khoa}\\s*=\\s*(.*)$`));
    if (khop) return khop[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

// Cột password_hash là NOT NULL nhưng tài khoản này không dùng mật khẩu.
// verifyPassword() từ chối mọi chuỗi không có dấu hai chấm, nên không mật khẩu
// nào mở được — kể cả chính chuỗi này.
const KHONG_CO_MAT_KHAU = 'khong-dung-mat-khau-dang-nhap-bang-otp-hoac-google';

const DA = 'qr-concierge';
const GOC = process.env.GOC || `http://localhost:${docEnv('PORT') || 3000}`;
const AGENT_EMAIL = process.env.AGENT_EMAIL || 'agenttest@tempmail.id.vn';
const SALE_EMAIL = process.env.SALE_EMAIL || 'sale@tempmail.id.vn';
const KHACH_EMAIL = process.env.KHACH_EMAIL || 'user@tempmail.id.vn';
const AGENT_TEN = process.env.AGENT_TEN || 'agenttest';
const NHOM_TEN = '[AGENTTEST] Tầng trệt';
const TIEN_TO_QR = 'AGTEST';
const TIEN_TO_MON = '[AGENTTEST]';
const TIEN_TO_PHIEN = 'agenttest-';
const SO_DON_BAN2 = Number(process.env.SO_DON || 10);

const MON_AN = [
  ['Phở bò tái', 65000], ['Bún chả Hà Nội', 70000], ['Cà phê sữa đá', 30000],
  ['Nước cam vắt', 35000], ['Gỏi cuốn tôm thịt', 45000], ['Chè khúc bạch', 30000],
];

function goi(duong, { method = 'GET', token, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(GOC + duong);
    const bo = u.protocol === 'https:' ? https : http;
    const du = body ? JSON.stringify(body) : null;
    const req = bo.request(u, {
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
        resolve({ status: res.statusCode, body: json, raw: than.slice(0, 220) });
      });
    });
    req.on('error', reject);
    if (du) req.write(du);
    req.end();
  });
}

(async () => {
  const conn = docEnv('DATABASE_URL');
  if (!conn) { console.error('Không tìm thấy DATABASE_URL (biến môi trường hoặc .env cùng thư mục).'); process.exit(1); }
  const db = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await db.connect();

  const cheDo = process.argv.includes('--xoa') ? 'xoa' : process.argv.includes('--do') ? 'do' : 'dung';

  // ── XOÁ ───────────────────────────────────────────────────────────────────
  const xoa = async () => {
    const phien = (await db.query('SELECT id FROM sessions WHERE id LIKE $1', [TIEN_TO_PHIEN + '%'])).rows.map((r) => r.id);
    if (phien.length) {
      for (const bang of ['chat_order_events', 'chat_order_bills', 'chat_order_revisions', 'chat_orders', 'messages']) {
        await db.query(`DELETE FROM ${bang} WHERE session_id = ANY($1::text[])`, [phien]).catch(() => {});
      }
      await db.query('DELETE FROM sessions WHERE id = ANY($1::text[])', [phien]);
    }
    await db.query('DELETE FROM qr_chat_accounts WHERE code LIKE $1', [TIEN_TO_QR + '%']);
    await db.query('DELETE FROM qr_menu_items WHERE name LIKE $1', [TIEN_TO_MON + '%']);
    const nhom = (await db.query('SELECT id FROM agent_groups WHERE name = $1', [NHOM_TEN])).rows.map((r) => r.id);
    if (nhom.length) await db.query('DELETE FROM agent_group_sales WHERE group_id = ANY($1::int[])', [nhom]).catch(() => {});
    await db.query('DELETE FROM agent_groups WHERE name = $1', [NHOM_TEN]);
    // CỐ Ý KHÔNG XOÁ TÀI KHOẢN.
    //
    // Hai tài khoản này có thể do chính người dùng tạo bằng tay từ trước. Xoá
    // rồi tạo lại ở mỗi lần chạy là làm mất tài khoản của người ta — mà lại
    // không có cách nào biết cái nào do script tạo, cái nào không. Tài khoản
    // thừa thì vô hại; tài khoản bị xoá mất thì không.
    //
    // Chỉ thu lại phiên tạm mà script tự cấp cho mình.
    await db.query(`DELETE FROM admin_sessions WHERE token LIKE 'agtseed_%'`).catch(() => {});
    console.log(`Đã xoá dữ liệu agenttest (${phien.length} phiên). Hai tài khoản được GIỮ LẠI.`);
  };

  // ── ĐO — đọc bằng CHÍNH API mà màn hình nhân viên dùng ────────────────────
  const doDac = async (tokenAgent, tokenSale) => {
    const agent = (await db.query('SELECT id FROM admins WHERE username = $1', [AGENT_EMAIL])).rows[0];
    if (!agent) { console.log('Chưa có tài khoản agenttest — bỏ cờ --do để dựng trước.'); return; }
    const nhom = (await db.query('SELECT id FROM agent_groups WHERE name = $1', [NHOM_TEN])).rows[0];

    const trongDb = (await db.query(
      `SELECT COUNT(*)::int n FROM chat_orders o JOIN sessions s ON s.id = o.session_id
        WHERE s.group_id = $1 AND o.status NOT IN ('rejected','superseded')`, [nhom.id])).rows[0].n;

    const gioAgent = await goi('/api/admin/orders/cart', { token: tokenAgent });
    const gioSale = await goi('/api/admin/orders/cart', { token: tokenSale });
    const soAgent = (gioAgent.body?.orders || []).length;
    const soSale = (gioSale.body?.orders || []).length;

    const banMot = (await db.query(
      `SELECT s.id, s.status, s.created_at FROM sessions s
        WHERE s.id LIKE $1 ORDER BY s.created_at ASC`, [TIEN_TO_PHIEN + 'ban1%'])).rows;
    const billTungPhien = [];
    for (const p of banMot) {
      const r = await goi(`/api/chats/${p.id}/bills?lang=vi`);
      billTungPhien.push({ id: p.id, status: p.status, bill: (r.body?.bills || []).length });
    }
    const tongBanMot = billTungPhien.reduce((s, x) => s + x.bill, 0);
    const phienDangMo = billTungPhien[billTungPhien.length - 1];

    console.log('\n═══ ĐO QUA API THẬT (' + GOC + ') ═══\n');
    console.log('① MÀN "QUẢN LÝ BILL"   (GET /api/admin/orders/cart)');
    console.log(`   Trong database        : ${trongDb} đơn`);
    console.log(`   API trả cho Agent     : ${soAgent} đơn`);
    console.log(`   API trả cho Sale      : ${soSale} đơn`);
    if (soAgent < trongDb) {
      console.log(`   ⚠  THIẾU ${trongDb - soAgent} ĐƠN. Câu truy vấn có "LIMIT 100" cứng, không phân trang,`);
      console.log('      không trả total/hasMore — giao diện không có cách nào biết mình đang bị cắt,');
      console.log('      và người dùng không có nút nào để xem tiếp.  (server.js, /api/admin/orders/cart)');
    } else if (trongDb <= 100) {
      // Nói thẳng là phép đo này CHƯA CHẠM tới giới hạn, thay vì để dấu ✓ làm
      // người đọc tưởng chỗ đó đã được kiểm và không có lỗi.
      console.log(`   ✓  Đủ đơn — nhưng mới có ${trongDb} đơn nên CHƯA chạm trần.`);
      console.log('      Trần cứng nằm ở 100. Muốn thấy lỗi đó thì dựng lại với số đơn lớn hơn:');
      console.log('          SO_DON=130 node seed-agenttest.js');
    } else {
      console.log('   ✓  Không thiếu đơn nào.');
    }

    console.log('\n② KHUNG CHAT CỦA BÀN 1  (GET /api/chats/:phien/bills)');
    console.log('   Một bữa ăn kéo dài, phiên QR sống 1 tiếng nên khách quét lại mã 2 lần:');
    for (const p of billTungPhien) {
      console.log(`     ${p.id.padEnd(22)} [${p.status.padEnd(6)}]  ${p.bill} hoá đơn`);
    }
    console.log(`   Cả bữa                : ${tongBanMot} hoá đơn`);
    console.log(`   Mở bàn ra thấy        : ${phienDangMo?.bill} hoá đơn (chỉ của phiên đang mở)`);
    if ((phienDangMo?.bill || 0) < tongBanMot) {
      console.log(`   ⚠  ${tongBanMot - (phienDangMo?.bill || 0)} HOÁ ĐƠN KHÔNG MỞ RA ĐƯỢC. Dữ liệu còn nguyên trong bảng,`);
      console.log('      nhưng cả ba đường đọc hoá đơn đều tra theo session_id, và không có đường nào');
      console.log('      cho nhân viên xem lại hoá đơn của một cái BÀN qua các phiên.');
      console.log('      (Khách thì tra lại được 30 ngày — QR_HISTORY_DAYS. Nhân viên thì không.)');
    } else {
      console.log('   ✓  Mở bàn ra thấy đủ cả bữa.');
    }

    console.log('\n③ KIỂM BẰNG TAY TRÊN GIAO DIỆN');
    console.log(`   1. Đăng nhập dashboard bằng ${AGENT_EMAIL} (OTP gửi về email đó).`);
    console.log(`   2. Mở "Quản lý bill" → đếm số đơn. Phải ra ${trongDb}, thực tế sẽ ra ${soAgent}.`
      + (trongDb <= 100 ? '  (chưa chạm trần — xem mục ① ở trên)' : ''));
    console.log(`   3. Mở chat bàn "${TIEN_TO_QR}-B1" → đếm hoá đơn. Cả bữa là ${tongBanMot}, sẽ chỉ thấy ${phienDangMo?.bill}.`);
    console.log(`   4. Đăng nhập lại bằng ${SALE_EMAIL}, làm lại bước 2–3 — hai vai phải ra cùng con số.`);
  };

  // ── Cấp cho script một phiên làm việc để gọi API ──────────────────────────
  //
  // Đúng cơ chế mà lần đăng nhập thật cấp ra (checkAdminAuth tra thẳng
  // admin_sessions.token). Hết hạn sau 2 tiếng, và --xoa dọn luôn.
  const capToken = async (adminId) => {
    const token = 'agtseed_' + crypto.randomBytes(24).toString('hex');
    // HẠN DÙNG PHẢI DO NODE TÍNH, KHÔNG DÙNG NOW() CỦA POSTGRES.
    //
    // Cột expires_at là "timestamp without time zone". NOW() của Postgres ghi
    // vào đó giờ UTC, còn checkAdminAuth đọc ra bằng new Date(...) — mà Node
    // hiểu một timestamp không múi giờ là GIỜ MÁY. Máy chạy ở UTC+7 thì cái mốc
    // vừa ghi lập tức lùi 7 tiếng so với hiện tại, và phiên chết ngay khi sinh
    // ra: HTTP 401 SESSION_EXPIRED.
    //
    // Truyền thẳng một Date của Node thì lúc ghi và lúc đọc dùng chung một quy
    // ước, chạy đúng ở mọi múi giờ. Đây cũng là cách đường đăng nhập thật làm.
    await db.query(
      `INSERT INTO admin_sessions (token, admin_id, expires_at, user_agent)
       VALUES ($1, $2, $3, 'seed-agenttest.js')`,
      [token, adminId, new Date(Date.now() + 2 * 60 * 60 * 1000)]);
    return token;
  };

  // Phiên tạm của script: trả lại ngay khi xong việc, không để nằm lại trong
  // admin_sessions như một chìa khoá bỏ quên.
  const traToken = async () => {
    await db.query(`DELETE FROM admin_sessions WHERE token LIKE 'agtseed_%'`).catch(() => {});
  };

  if (cheDo === 'xoa') { await xoa(); await db.end(); return; }

  if (cheDo === 'do') {
    const a = (await db.query('SELECT id FROM admins WHERE username = $1', [AGENT_EMAIL])).rows[0];
    const s = (await db.query('SELECT id FROM admins WHERE username = $1', [SALE_EMAIL])).rows[0];
    if (!a || !s) { console.log('Chưa có tài khoản agenttest — bỏ cờ --do để dựng trước.'); await db.end(); return; }
    await doDac(await capToken(a.id), await capToken(s.id));
    await traToken();
    await db.end(); return;
  }

  // ── DỰNG ──────────────────────────────────────────────────────────────────
  const song = await goi('/api/app-version').catch(() => null);
  if (!song || song.status >= 500) {
    console.error(`Không gọi được máy chủ ở ${GOC}. Bật server.js lên rồi chạy lại, hoặc truyền GOC=...`);
    await db.end(); process.exit(1);
  }
  console.log(`Máy chủ ở ${GOC} đang chạy. Bắt đầu dựng.\n`);

  await xoa();

  // TÀI KHOẢN: CÓ RỒI THÌ DÙNG LẠI, CHƯA CÓ THÌ TẠO.
  //
  // Không đụng tới mật khẩu của tài khoản đã tồn tại. Chỉ chỉnh đúng những thứ
  // kịch bản cần: vai, dự án, quan hệ quản lý, và cờ mở khoá.
  const dungTaiKhoan = async ({ email, vai, ten, quanLyBoi = null }) => {
    const co = (await db.query('SELECT id, full_name FROM admins WHERE LOWER(username) = LOWER($1)', [email])).rows[0];
    if (co) {
      await db.query(
        // Ép kiểu $1::text. Không ép thì Postgres phải suy kiểu của $1 từ hai chỗ
        // dùng khác nhau (cột role và phép so sánh trong CASE) và bỏ cuộc:
        // "inconsistent types deduced for parameter $1".
        `UPDATE admins SET role = $1::text, project_id = $2::text, is_active = TRUE,
                managed_by_admin_id = COALESCE($3::int, managed_by_admin_id),
                session_never_expires = TRUE,
                agent_menu_enabled = CASE WHEN $1::text = 'agent' THEN TRUE ELSE agent_menu_enabled END
          WHERE id = $4::int`,
        [vai, DA, quanLyBoi, co.id]);
      console.log(`  Tài khoản ${email} đã có sẵn (id ${co.id}, tên "${co.full_name}") — dùng lại, không đụng mật khẩu.`);
      return { id: co.id, moi: false };
    }
    const id = (await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active,
                           managed_by_admin_id, created_by_admin_id, agent_menu_enabled, session_never_expires)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6,$6,TRUE,TRUE) RETURNING id`,
      [email, KHONG_CO_MAT_KHAU, ten, vai, DA, quanLyBoi])).rows[0].id;
    console.log(`  Tài khoản ${email} chưa có — vừa tạo mới (id ${id}).`);
    return { id, moi: true };
  };

  const agent = await dungTaiKhoan({ email: AGENT_EMAIL, vai: 'agent', ten: AGENT_TEN });
  const agentId = agent.id;
  const sale = await dungTaiKhoan({ email: SALE_EMAIL, vai: 'sale', ten: 'Sale của agenttest', quanLyBoi: agentId });
  const saleId = sale.id;

  const nhomId = (await db.query(
    `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1,$2,$3) RETURNING id`,
    [agentId, DA, NHOM_TEN])).rows[0].id;

  await db.query(
    `INSERT INTO agent_group_sales (group_id, sale_id, is_active) VALUES ($1,$2,TRUE)
     ON CONFLICT DO NOTHING`, [nhomId, saleId]).catch(() => {});

  const qr = {};
  for (const [hau, nhan] of [['B1', 'Bàn 1'], ['B2', 'Bàn 2'], ['B3', 'Bàn 3']]) {
    qr[hau] = (await db.query(
      `INSERT INTO qr_chat_accounts (project_id, code, owner_admin_id, label, group_id, is_active)
       VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id`,
      [DA, `${TIEN_TO_QR}-${hau}`, agentId, `[AGENTTEST] ${nhan}`, nhomId])).rows[0].id;
  }

  const mon = [];
  for (const [ten, gia] of MON_AN) {
    mon.push((await db.query(
      `INSERT INTO qr_menu_items (agent_id, project_id, name, price, is_available, stock_quantity)
       VALUES ($1,$2,$3,$4,TRUE,9999) RETURNING id`,
      [agentId, DA, `${TIEN_TO_MON} ${ten}`, gia])).rows[0].id);
  }

  const tokenSale = await capToken(saleId);
  const tokenAgent = await capToken(agentId);

  // Phiên chat: ghi thẳng, vì tạo qua API cần OTP gửi về email thật.
  const taoPhien = async (id, qrId, luc, trangThai) => db.query(
    `INSERT INTO sessions (id, project_id, visitor_name, visitor_email, detected_language, is_verified,
                           status, platform, group_id, qr_account_id, claimed_by_admin_id,
                           expires_at, show_in_dashboard, created_at)
     VALUES ($1,$2,$3,$4,'vi',TRUE,$5,'qr',$6,$7,$8,$9,TRUE,$10)`,
    [id, DA, 'Khách agenttest', KHACH_EMAIL, trangThai, nhomId, qrId, saleId,
     new Date(luc.getTime() + 60 * 60 * 1000), luc]);

  // MỘT ĐƠN, ĐI TRỌN VÒNG ĐỜI QUA API THẬT.
  //
  // Mỗi bước đều đọc lại TRẠNG THÁI THẬT trong bảng trước khi đi tiếp, thay vì
  // tin rằng bước trước đã đưa đơn tới đúng chỗ. Vòng đời này có nhiều thứ tự
  // động chen vào (đồng hồ chọn cách trả, xác nhận tự động ở vài cấu hình), nên
  // một đơn có thể đã vượt qua bước kế tiếp trước khi script kịp gọi.
  const trangThaiDon = async (donId) =>
    (await db.query('SELECT status FROM chat_orders WHERE id = $1', [donId])).rows[0]?.status || '(không thấy)';

  const motDonTronVen = async (phien, cacMon) => {
    const dat = await goi(`/api/chats/${phien}/menu/order`, {
      method: 'POST', body: { items: cacMon.map(([i, sl]) => ({ itemId: mon[i], quantity: sl })), language: 'vi' },
    });
    if (dat.status >= 400) throw new Error(`đặt món hỏng: HTTP ${dat.status} ${dat.raw}`);

    // Lấy mã đơn từ CHÍNH phản hồi của lượt đặt. Đọc lại bằng endpoint của khách
    // thì có nguy cơ nhận về một đơn khác của cùng phiên, hoặc nhận về mã đơn đã
    // được thay cho id nội bộ.
    let donId = dat.body?.order?.id;
    if (!donId) {
      const xem = await goi(`/api/chats/${phien}/order?lang=vi`);
      donId = xem.body?.order?.id;
    }
    if (!donId) {
      donId = (await db.query(
        'SELECT id FROM chat_orders WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1', [phien])).rows[0]?.id;
    }
    if (!donId) throw new Error(`không tìm được đơn vừa đặt trong phiên ${phien}`);

    // BƯỚC XÁC NHẬN — bỏ qua nếu đơn đã tự vượt qua bước này.
    if (await trangThaiDon(donId) === 'pending_confirm') {
      const xn = await goi(`/api/admin/orders/${donId}/confirm`, { method: 'POST', token: tokenSale });
      if (xn.status >= 400) {
        const tt = await trangThaiDon(donId);
        // 409 nghĩa là đơn không còn ở bước chờ xác nhận. Nếu nó đã ở bước SAU
        // thì mục tiêu vẫn đạt, đi tiếp. Chỉ dừng khi nó nằm ở một chỗ lạ.
        if (!(xn.status === 409 && ['awaiting_payment', 'paid'].includes(tt))) {
          throw new Error(`Sale xác nhận hỏng: HTTP ${xn.status} ${xn.raw} (đơn đang ở trạng thái "${tt}")`);
        }
      }
    }

    // BƯỚC CHỌN CÁCH TRẢ.
    if (await trangThaiDon(donId) === 'awaiting_payment') {
      await goi(`/api/chats/${phien}/order/payment-method`, { method: 'POST', body: { method: 'cash' } });
    }

    // BƯỚC THU TIỀN — đường đúng là 'received-payment', không phải '/paid'.
    // Gọi nhầm tên thì máy chủ trả 404 và đơn nằm mãi ở 'awaiting_payment',
    // trong khi script vẫn chạy tiếp như không có gì.
    if (await trangThaiDon(donId) !== 'paid') {
      const thu = await goi(`/api/admin/orders/${donId}/received-payment`, {
        method: 'POST', token: tokenAgent, body: { method: 'cash' },
      });
      const tt = await trangThaiDon(donId);
      if (thu.status >= 400 && tt !== 'paid') {
        throw new Error(`thu tiền hỏng: HTTP ${thu.status} ${thu.raw} (đơn đang ở trạng thái "${tt}")`);
      }
    }
    return donId;
  };

  // ── BÀN 1: một bữa ăn dài, ba phiên nối nhau ──────────────────────────────
  //
  // Khách ngồi từ 18h tới 21h. Phiên QR sống 1 tiếng (QR_CHAT_SESSION_MS) nên
  // khách phải quét lại mã hai lần — mỗi lần là một phiên MỚI. Bữa ăn là MỘT,
  // hoá đơn nằm rải ở BA phiên.
  const homNay = new Date(); homNay.setHours(18, 0, 0, 0);
  const banMot = [];
  for (let i = 0; i < 3; i += 1) {
    const luc = new Date(homNay.getTime() + i * 60 * 60 * 1000);
    const idPhien = `${TIEN_TO_PHIEN}ban1-${i + 1}`;
    // Phiên phải đang mở thì API đặt món mới nhận; đóng lại sau khi đặt xong.
    await taoPhien(idPhien, qr.B1, luc, 'active');
    await motDonTronVen(idPhien, [[i, 2], [(i + 2) % 6, 1]]);
    if (i === 0) await motDonTronVen(idPhien, [[5, 3]]);
    if (i < 2) await db.query(`UPDATE sessions SET status = 'closed' WHERE id = $1`, [idPhien]);
    banMot.push(idPhien);
    console.log(`  Bàn 1 — phiên ${i + 1}/3 xong`);
  }

  // ── BÀN 2: quán bán thật, 30 ngày ─────────────────────────────────────────
  //
  // Mỗi lượt khách một phiên. Rải đều theo thời gian để thứ tự "mới nhất trước"
  // của màn Quản lý bill có nghĩa.
  const batDau = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const buoc = (30 * 24 * 60 * 60 * 1000) / SO_DON_BAN2;
  for (let i = 0; i < SO_DON_BAN2; i += 1) {
    const luc = new Date(batDau + i * buoc);
    const idPhien = `${TIEN_TO_PHIEN}ban2-${String(i).padStart(4, '0')}`;
    await taoPhien(idPhien, qr.B2, luc, 'active');
    await motDonTronVen(idPhien, [[i % 6, 1 + (i % 3)], [(i + 3) % 6, 1]]);
    // Lùi ngày về đúng mốc: API luôn ghi NOW(), mà ta cần lịch sử 30 ngày.
    await db.query(
      `UPDATE chat_orders SET created_at = $2, updated_at = $2, confirmed_at = $2, paid_at = $2,
              bill_sent_at = $2 WHERE session_id = $1`, [idPhien, luc]);
    await db.query('UPDATE chat_order_bills SET created_at = $2 WHERE session_id = $1', [idPhien, luc]).catch(() => {});
    await db.query(`UPDATE sessions SET status = 'closed' WHERE id = $1`, [idPhien]);
    if ((i + 1) % 25 === 0) console.log(`  Bàn 2 — ${i + 1}/${SO_DON_BAN2} đơn`);
  }

  console.log('\n═══ ĐÃ DỰNG XONG ═══');
  console.log(`Agent : ${AGENT_EMAIL}   (tên hiển thị "${AGENT_TEN}", id ${agentId})`);
  console.log(`Sale  : ${SALE_EMAIL}   (id ${saleId})`);
  console.log(`Khách : ${KHACH_EMAIL}`);
  console.log('Cả ba KHÔNG có mật khẩu — đăng nhập bằng OTP gửi về chính email đó.');
  console.log(`Mã QR : ${TIEN_TO_QR}-B1 (bữa ăn ba phiên) · ${TIEN_TO_QR}-B2 (${SO_DON_BAN2} đơn) · ${TIEN_TO_QR}-B3 (trống)`);
  console.log(`Nhóm  : ${NHOM_TEN}`);

  await doDac(tokenAgent, tokenSale);
  // Phiên tạm mà SCRIPT tự cấp cho mình để gọi API — trả lại ngay. Không liên
  // quan gì tới lần đăng nhập của người dùng, và KHÔNG đụng tới dữ liệu.
  await traToken();
  console.log('\n═══ DỮ LIỆU ĐƯỢC GIỮ NGUYÊN ═══');
  console.log('Script không xoá gì khi chạy xong. Cứ đăng nhập vào kiểm thoải mái.');
  console.log('Đo lại bất cứ lúc nào :  node seed-agenttest.js --do');
  console.log('Chỉ khi nào muốn dọn  :  node seed-agenttest.js --xoa   (phải tự gõ, không tự chạy)');
  console.log('--xoa dọn phiên/đơn/hoá đơn/mã QR/thực đơn, nhưng GIỮ LẠI hai tài khoản trên');
  console.log('— chúng có thể do chính anh tạo tay, script không tự ý xoá.');
  console.log('Lưu ý: chạy lại lệnh dựng sẽ XOÁ dữ liệu cũ rồi dựng lại từ đầu.');
  await db.end();
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
