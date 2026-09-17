// ẢNH MÓN CÓ ĐƯỢC GẮN ĐÚNG VÀO DATABASE KHÔNG.
//
// Môi trường đo không có AWS thật, nhưng thứ cần chứng minh không phải là S3
// chạy được — mà là SCRIPT GỌI ĐÚNG và GHI ĐÚNG: đọc đúng tệp, đặt đúng khoá,
// ghi image_key + image_url vào đúng dòng món. Nên thay s3-helper bằng bản giả
// ghi lại mọi lượt gọi, rồi đối chiếu với database.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

let passed = 0; const failures = [];
const check = (n, c, d) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failures.push(n); console.log('  ✗ ' + n + (d ? '\n      ' + d : '')); } };

// ── Bản s3-helper GIẢ, cắm vào trước khi seed-boto68 require nó ────────────
const duongS3 = require.resolve('./s3-helper.js');
const daTai = [];
require.cache[duongS3] = {
  id: duongS3, filename: duongS3, loaded: true, exports: {
    isConfigured: true,
    MENU_IMAGE_URL_TTL_SECONDS: 3600,
    buildMenuImageKey: (projectId, agentId, ten) => `${projectId}/menu/${agentId}/gia-${ten}`,
    uploadBuffer: async (key, buf, contentType) => { daTai.push({ key, bytes: buf.length, contentType }); return key; },
    getMenuImageUrl: async (key) => `https://s3-gia.test/${key}?ky=abc`,
  },
};

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const agent = (await db.query("SELECT id FROM admins WHERE username='boto68@test.local'")).rows[0];
  check('tìm thấy Agent', Boolean(agent));
  if (!agent) { await db.end(); process.exit(1); }

  // Chạy chính script sinh menu, với s3 giả đã cắm sẵn.
  process.argv = [process.argv[0], 'seed-boto68.js', '--agent', 'boto68@test.local', '--no-dich'];
  await require('./seed-boto68.js');
  await new Promise((r) => setTimeout(r, 400));

  const thuMuc = path.join(__dirname, 'anh-mon');
  const soTep = fs.readdirSync(thuMuc).filter((f) => /^mon-\d+\.jpg$/.test(f)).length;
  check('thư mục ảnh có đủ 41 tệp bóc từ menu', soTep === 41, `đang có ${soTep}`);

  // 41 tệp nhưng món 60 bị bỏ vì trùng với món 38 → 40 lượt tải.
  check('tải đúng 40 ảnh (41 tệp trừ món 60 trùng)', daTai.length === 40, `đã tải ${daTai.length}`);
  check('mọi lượt tải đều là image/jpeg', daTai.every((t) => t.contentType === 'image/jpeg'));
  check('không lượt nào tải tệp rỗng', daTai.every((t) => t.bytes > 4000),
    daTai.filter((t) => t.bytes <= 4000).map((t) => t.key).join(', '));
  check('khoá S3 nằm đúng dưới project/menu/agent',
    daTai.every((t) => t.key.startsWith(`qr-concierge/menu/${agent.id}/`)), daTai[0] && daTai[0].key);

  const db2 = new Client({ connectionString: process.env.DATABASE_URL });
  await db2.connect();
  const mon = (await db2.query(
    `SELECT name, image_key, image_url, image_url_expires_at FROM qr_menu_items
      WHERE agent_id = $1 ORDER BY sort_order`, [agent.id])).rows;
  const coAnh = mon.filter((m) => m.image_key);
  check('database ghi nhận đúng 40 món có ảnh', coAnh.length === 40, `đang là ${coAnh.length}`);
  check('món có image_key thì cũng có image_url và hạn dùng',
    coAnh.every((m) => m.image_url && m.image_url_expires_at));
  check('image_url là URL http, không phải đường dẫn máy cục bộ',
    coAnh.every((m) => /^https?:\/\//.test(m.image_url)),
    coAnh.filter((m) => !/^https?:\/\//.test(m.image_url)).slice(0, 3).map((m) => m.image_url).join(', '));

  // Đúng món — đúng ảnh. Đây là chỗ sai thì khách gọi nhầm món.
  const theoTen = Object.fromEntries(mon.map((m) => [m.name, m.image_key]));
  const MUON = {
    'Combo Xiên Truyền Thống': 'mon-01', 'Combo Hải Sản Phú Quốc': 'mon-03',
    'Ba Rọi Bò Nướng Than': 'mon-08', 'Tôm Xiên Nướng Than': 'mon-19',
    'Bò Tơ Tái Chanh': 'mon-20', 'Bò Úc Xào Lúc Lắc': 'mon-29',
    'Bò Tơ Nhúng Mẻ': 'mon-30', 'Khoai Tây Chiên': 'mon-40',
    'Cơm Chiên Khóm Hải Sản': 'mon-46', 'Cá Bớp Kho Tộ': 'mon-54',
  };
  for (const [ten, tep] of Object.entries(MUON)) {
    check(`"${ten}" gắn đúng ${tep}.jpg`,
      String(theoTen[ten] || '').includes(tep + '.jpg'), String(theoTen[ten]));
  }
  check('món KHÔNG có ảnh trên menu in thì để trống, không mượn ảnh món khác',
    !theoTen['Lẩu Bò Thái 2 Vị'] && !theoTen['Canh Nghêu Nấu Mẻ'] && !theoTen['Cơm Chiên Tỏi'],
    `lẩu thái=${theoTen['Lẩu Bò Thái 2 Vị']} canh nghêu=${theoTen['Canh Nghêu Nấu Mẻ']}`);

  await db.end(); await db2.end();
  console.log('');
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
