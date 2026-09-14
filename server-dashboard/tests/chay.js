// CHẠY BỘ KIỂM THỬ LUỒNG BILL — dùng chung cho máy mình, cho CI, cho Windows.
//
// Viết bằng Node chứ không phải bash vì hai lý do: chạy được cả trên Windows
// (anh gõ `node tests/chay.js` là xong), và không dính chuyện xuống dòng CRLF
// làm shell script chết trên Linux.
//
// Thứ tự dưới đây KHÔNG tuỳ tiện — nó mô phỏng đúng một lần deploy thật:
//   0. DB có sẵn lược đồ (như production trước khi deploy).
//   1. Dữ liệu đời cũ nằm sẵn trong đó.
//   2. Máy chủ bản MỚI khởi động -> migration quét đống dữ liệu cũ đó.
//   3. Đo xem luồng bill còn đúng không.
// Dựng dữ liệu SAU khi máy chủ lên thì migration không đụng tới nó và bài đo sẽ
// xanh giả — đã dính đúng cái bẫy này một lần.
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const fs = require('fs');

const GOC_DA = path.resolve(__dirname, '..');   // thư mục server-dashboard
const PORT = process.env.PORT || '4899';
const EP_DUNG_DB_THAT = process.argv.includes('--dung-db-that');
const CHO_PHEP_TU_XA = process.argv.includes('--cho-phep-tu-xa');
// --don : xoá DB kiểm thử rồi thoát, không chạy bài đo nào.
const CHI_DON = process.argv.includes('--don');

// ── LẤY THÔNG TIN DB TỪ .env, NHƯNG SANG MỘT DB KHÁC ───────────────────────
//
// Mục đích: khỏi phải gõ lại host/user/mật khẩu mỗi lần chạy. Lấy đúng thông
// tin đăng nhập trong .env, chỉ ĐỔI TÊN DATABASE sang '<tên gốc>_citest'.
//
// KHÔNG chạy thẳng vào DB trong .env, vì bộ này:
//   - chạy migration lúc khởi động (ALTER TABLE, UPDATE hàng loạt),
//   - tạo rồi xoá tài khoản, phiên chat, đơn, bill của riêng nó,
//   - và quan trọng nhất: khối quy đổi giá đã-gồm-VAT sẽ NHÂN GIÁ THỰC ĐƠN
//     THÊM 10% với mọi món chưa được đánh dấu.
// Chạy nhầm vào DB thật là hỏng dữ liệu khách hàng, không phải hỏng bài test.
//
// Muốn ép chạy thẳng vào DB trong .env thì thêm cờ --dung-db-that. Cờ đó tồn
// tại để ai làm việc đó cũng biết mình đang làm gì.
function docEnv() {
  const tep = path.join(GOC_DA, '.env');
  if (!fs.existsSync(tep)) return {};
  const ra = {};
  for (const dong of fs.readFileSync(tep, 'utf8').split(/\r?\n/)) {
    const m = dong.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    ra[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return ra;
}

const CHE = (u) => String(u).replace(/:\/\/([^:]+):[^@]*@/, '://$1:***@');

function chonDb() {
  const env = docEnv();
  const goc = process.env.DATABASE_URL || env.DATABASE_URL;
  if (!goc) {
    console.error('  ✗ KHÔNG TÌM THẤY DATABASE_URL — không có trong biến môi trường, cũng không có trong .env');
    process.exit(1);
  }
  let u;
  try { u = new URL(goc); } catch {
    console.error('  ✗ DATABASE_URL không đọc được: ' + CHE(goc));
    process.exit(1);
  }

  const xa = !['localhost', '127.0.0.1', '::1'].includes(u.hostname);
  if (xa && !CHO_PHEP_TU_XA) {
    console.error(`  ✗ DATABASE_URL trỏ ra máy chủ NGOÀI: ${u.hostname}`);
    console.error('    Đây rất có thể là DB production. Bộ kiểm thử không tự chạy ra ngoài.');
    console.error('    Dựng một Postgres ở máy rồi trỏ DATABASE_URL vào đó, ví dụ:\n');
    console.error('      docker run -d --name pg-citest -e POSTGRES_PASSWORD=postgres \\');
    console.error('        -p 5433:5432 postgres:16');
    console.error('      $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres"');
    console.error('      node tests/chay.js\n');
    console.error('    (Biết chắc mình đang làm gì thì thêm cờ --cho-phep-tu-xa.)');
    process.exit(1);
  }

  if (EP_DUNG_DB_THAT) {
    console.log(`  ! CHẠY THẲNG VÀO DB TRONG .env: ${CHE(u.href)}`);
    console.log('    Bộ này chạy migration và quy đổi giá thực đơn. Dữ liệu ở đây sẽ bị sửa.');
    return { thuc: u.href, quanTri: null, ten: u.pathname.slice(1) };
  }

  const tenGoc = decodeURIComponent(u.pathname.slice(1)) || 'postgres';
  const tenTest = process.env.TEST_DB_NAME || `${tenGoc}_citest`;
  const quanTri = new URL(u.href); quanTri.pathname = '/postgres';
  const thuc = new URL(u.href); thuc.pathname = '/' + encodeURIComponent(tenTest);
  return { thuc: thuc.href, quanTri: quanTri.href, ten: tenTest, tenGoc };
}

const DB_DA_CHON = chonDb();

const MOI_TRUONG = {
  ...process.env,
  PORT,
  NODE_ENV: process.env.NODE_ENV || 'test',
  JWT_SECRET: process.env.JWT_SECRET || 'test-secret',
  DATABASE_URL: DB_DA_CHON.thuc,
  // Khoá chỉ dùng cho kiểm thử, sinh mới mỗi lượt chạy, không lưu ở đâu.
  MESSAGE_ENCRYPTION_KEY: process.env.MESSAGE_ENCRYPTION_KEY
    || crypto.randomBytes(32).toString('base64'),
  // Không gọi dịch vụ dịch thật: CI không có khoá API, và bài đo cần ổn định.
  TEST_FAKE_TRANSLATE: process.env.TEST_FAKE_TRANSLATE || '1',
  // Múi giờ Việt Nam. Cột thời gian là 'timestamp without time zone'; chạy ở
  // UTC thì NOW() của Postgres và new Date() của Node trùng nhau, che mất lỗi
  // lệch 7 tiếng.
  TZ: process.env.TZ || 'Asia/Ho_Chi_Minh',
};

const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

function chayNode(tepTin, doiSo = []) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [tepTin, ...doiSo], {
      cwd: GOC_DA, env: MOI_TRUONG, stdio: 'inherit',
    });
    p.on('exit', (ma) => resolve(ma === 0));
  });
}

function songChua() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/api/app-version`, (res) => {
      res.resume(); resolve(res.statusCode > 0);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

let nhatKy = '';
async function batMayChu() {
  nhatKy = '';
  const srv = spawn(process.execPath, ['server.js'], { cwd: GOC_DA, env: MOI_TRUONG });
  srv.stdout.on('data', (d) => { nhatKy += d; });
  srv.stderr.on('data', (d) => { nhatKy += d; });
  let chet = false;
  srv.on('exit', () => { chet = true; });
  for (let i = 0; i < 90; i += 1) {
    if (await songChua()) return srv;
    if (chet) {
      console.error('MÁY CHỦ CHẾT LÚC KHỞI ĐỘNG:\n' + nhatKy.slice(-4000));
      return null;
    }
    await ngu(1000);
  }
  srv.kill();
  console.error('MÁY CHỦ KHÔNG LÊN SAU 90 GIÂY:\n' + nhatKy.slice(-4000));
  return null;
}

function tatMayChu(srv) {
  return new Promise((resolve) => {
    if (!srv || srv.exitCode !== null) return resolve();
    srv.on('exit', resolve);
    srv.kill();
    setTimeout(() => { srv.kill('SIGKILL'); resolve(); }, 5000);
  });
}

// Lược đồ có lỗ thì mọi bài đo phía sau đều hỏng theo, và thông báo lỗi sẽ chỉ
// vào bài đo chứ không chỉ vào nguyên nhân. Kiểm ngay sau lượt dựng bảng.
const BANG_BAT_BUOC = ['admins', 'sessions', 'messages', 'agent_groups', 'qr_chat_accounts',
  'qr_menu_items', 'chat_orders', 'chat_order_bills', 'chat_order_events', 'support_tickets'];

async function soatLuocDo() {
  const { Client } = nap('pg');
  const db = new Client({ connectionString: MOI_TRUONG.DATABASE_URL });
  await db.connect();
  const co = (await db.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  )).rows.map((r) => r.table_name);
  await db.end();
  const thieu = BANG_BAT_BUOC.filter((b) => !co.includes(b));
  if (thieu.length) {
    console.error(`  ✗ LƯỢC ĐỒ THIẾU BẢNG: ${thieu.join(', ')}`);
    console.error('    Máy chủ vẫn lên được nhưng lược đồ dựng dở — xem lại thứ tự '
      + 'CREATE TABLE / ALTER TABLE trong database.js.');
    return false;
  }
  console.log(`  ✓ lược đồ đủ ${BANG_BAT_BUOC.length} bảng cốt lõi`);
  return true;
}

// Nối thử vào DB TRƯỚC khi bật máy chủ, và tạo DB kiểm thử nếu chưa có.
//
// Không có bước này thì sai mật khẩu Postgres biểu hiện thành "máy chủ không lên
// sau 90 giây" — máy chủ vẫn chạy, chỉ là không nối được DB, và người đọc phải
// bới trong đống log mới thấy nguyên nhân thật.
function nap(ten) { return require(path.join(GOC_DA, 'node_modules', ten)); }

async function taoDbNeuThieu() {
  if (!DB_DA_CHON.quanTri) return true;   // chế độ --dung-db-that: không tạo gì
  const { Client } = nap('pg');
  const qt = new Client({ connectionString: DB_DA_CHON.quanTri });
  try {
    await qt.connect();
  } catch (e) {
    console.error(`  ✗ KHÔNG NỐI ĐƯỢC POSTGRES: ${CHE(DB_DA_CHON.quanTri)}\n    ${e.message}`);
    await qt.end().catch(() => {});
    return false;
  }
  const co = await qt.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_DA_CHON.ten]);
  if (!co.rowCount) {
    // Tên DB không nhét được vào tham số $1, phải nối chuỗi — nên bọc trong dấu
    // nháy kép và nhân đôi mọi dấu nháy kép bên trong.
    const an = '"' + String(DB_DA_CHON.ten).replace(/"/g, '""') + '"';
    await qt.query(`CREATE DATABASE ${an}`);
    console.log(`  ✓ đã tạo DB kiểm thử: ${DB_DA_CHON.ten}`);
  }
  await qt.end();
  return true;
}

async function soatKetNoi() {
  const { Client } = nap('pg');
  const db = new Client({ connectionString: DB_DA_CHON.thuc });
  try {
    await db.connect();
    await db.end();
    console.log(`  ✓ nối được DB: ${CHE(DB_DA_CHON.thuc)}`);
    if (EP_DUNG_DB_THAT) {
      // Đếm cho người chạy nhìn thấy mình đang đứng ở đâu. Một dòng này đủ để
      // phân biệt DB staging trống trơn với DB có dữ liệu khách hàng thật.
      const dem = async (bang) => {
        const r = await db2.query(`SELECT COUNT(*)::int n FROM ${bang}`).catch(() => null);
        return r ? r.rows[0].n : '?';
      };
      const db2 = new Client({ connectionString: DB_DA_CHON.thuc });
      await db2.connect();
      // Chạy tuần tự: một Client của pg không nhận hai câu truy vấn cùng lúc.
      const don = await dem('chat_orders');
      const hd = await dem('chat_order_bills');
      const phien = await dem('sessions');
      await db2.end();
      console.log(`    DB NÀY ĐANG CÓ: ${don} đơn · ${hd} hoá đơn · ${phien} phiên chat.`);
      console.log('    Bộ kiểm thử sẽ chạy migration trên đó. Sai DB thì dừng ngay bây giờ.');
    }
    if (DB_DA_CHON.tenGoc) {
      console.log(`    (lấy host/tài khoản từ .env, chỉ đổi tên DB: `
        + `${DB_DA_CHON.tenGoc} -> ${DB_DA_CHON.ten}. DB thật không bị đụng tới.)`);
    }
    return true;
  } catch (e) {
    console.error(`  ✗ KHÔNG NỐI ĐƯỢC DB: ${CHE(DB_DA_CHON.thuc)}\n    ${e.message}`);
    await db.end().catch(() => {});
    return false;
  }
}

// Xoá DB kiểm thử. Chỉ xoá đúng cái do bộ này tạo ra (<tên gốc>_citest) —
// không bao giờ đụng tới DB trong .env.
async function donDb() {
  if (!DB_DA_CHON.quanTri) {
    console.error('  ✗ Chế độ --dung-db-that không có DB riêng để xoá.');
    return false;
  }
  const { Client } = nap('pg');
  const qt = new Client({ connectionString: DB_DA_CHON.quanTri });
  try {
    await qt.connect();
  } catch (e) {
    console.error(`  ✗ KHÔNG NỐI ĐƯỢC POSTGRES: ${CHE(DB_DA_CHON.quanTri)}\n    ${e.message}`);
    await qt.end().catch(() => {});
    return false;
  }
  const co = await qt.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_DA_CHON.ten]);
  if (!co.rowCount) {
    console.log(`  · không có DB ${DB_DA_CHON.ten} — không có gì để xoá.`);
    await qt.end();
    return true;
  }
  const an = '"' + String(DB_DA_CHON.ten).replace(/"/g, '""') + '"';
  // Đá hết kết nối còn sót, nếu không Postgres từ chối xoá.
  await qt.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [DB_DA_CHON.ten]).catch(() => {});
  await qt.query(`DROP DATABASE ${an}`);
  await qt.end();
  console.log(`  ✓ đã xoá DB kiểm thử: ${DB_DA_CHON.ten}`);
  console.log(`    (DB thật ${DB_DA_CHON.tenGoc} không bị đụng tới. Chạy lại chay.js là nó tự tạo lại.)`);
  return true;
}

(async () => {
  let hong = false;

  if (CHI_DON) process.exit(await donDb() ? 0 : 1);

  if (!await taoDbNeuThieu()) process.exit(1);
  if (!await soatKetNoi()) process.exit(1);

  // ── 0. Dựng bảng ───────────────────────────────────────────────────────────
  // Trên CI, DB bắt đầu rỗng trơn. Bật máy chủ một lượt cho nó tạo bảng rồi tắt
  // đi — coi như đây là DB production TRƯỚC khi deploy.
  //
  // Nói cho sòng phẳng: bảng ở đây do code HIỆN TẠI tạo, không phải lược đồ đời
  // cũ. Bài này đo những DÒNG DỮ LIỆU đời cũ nằm lại, không đo cấu trúc bảng
  // đời cũ. Muốn đo cả cấu trúc thì phải nạp một bản backup production thật.
  console.log('═══ Dựng bảng (DB rỗng -> có lược đồ) ═══');
  let srv = await batMayChu();
  if (!srv) process.exit(1);
  await tatMayChu(srv);
  if (!await soatLuocDo()) process.exit(1);

  // ── 1. Luồng bill trên DỮ LIỆU CŨ ──────────────────────────────────────────
  console.log('\n═══ Luồng bill trên dữ liệu cũ ═══');
  if (!await chayNode(path.join(__dirname, 'billcu.js'), ['--seed'])) process.exit(1);
  srv = await batMayChu();
  if (!srv) process.exit(1);
  if (!await chayNode(path.join(__dirname, 'billcu.js'), ['--do'])) hong = true;
  await tatMayChu(srv);

  // ── 2. Vòng đời bill B1->B9 trên dữ liệu sạch ──────────────────────────────
  console.log('\n═══ Vòng đời bill B1->B9 ═══');
  srv = await batMayChu();
  if (!srv) process.exit(1);
  if (!await chayNode(path.join(__dirname, 'vongdoibill.js'))) hong = true;
  await tatMayChu(srv);

  process.exit(hong ? 1 : 0);
})().catch((e) => { console.error(e.stack); process.exit(1); });
