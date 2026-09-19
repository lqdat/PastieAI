// TAG SẢN PHẨM (superadmin cấu hình) VÀ BANNER THỰC ĐƠN (agent tự đặt).
//
// Hai thứ mới trên thực đơn khách, và cả hai đều phải đi qua đúng luồng đã có:
//
//   · Tag là CHỮ KHÁCH ĐỌC, nên phải dịch — và dịch LÚC LƯU rồi cất vào DB,
//     không dịch live (mục 9.3 trong CODEBASE.md). Tag để nguyên tiếng Việt thì
//     khách Hàn thấy nhãn "Bán chạy" nằm trên một sản phẩm đã dịch hết.
//   · Banner KHÔNG có chữ do hệ thống sinh ra — chữ nằm trong chính tấm ảnh —
//     nên ở đó không có gì để dịch. Thứ duy nhất khách đọc là tên sản phẩm mà
//     banner trỏ tới, và tên đó đã dịch sẵn từ trước.
//
// Chạy trên MÁY CHỦ THẬT + POSTGRES THẬT bằng token đăng nhập thật: phân quyền
// nằm trong endpoint chứ không nằm ở giao diện, chỉ gọi thật mới đo được.
const http = require('http');
const { Client } = require('pg');

const GOC = 'http://localhost:4899';
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
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch { /* để raw */ }
        resolve({ status: res.statusCode, body: parsed, raw });
      });
    });
    req.on('error', reject);
    if (du) req.write(du);
    req.end();
  });
}

(async () => {
  const pg = new Client({ connectionString: DB });
  await pg.connect();

  // ── DỌN & DỰNG DỮ LIỆU ────────────────────────────────────────────────
  await pg.query("DELETE FROM qr_menu_tags WHERE code LIKE 'thu-%'");

  const sa = await pg.query("SELECT id, project_id FROM admins WHERE role = 'superadmin' LIMIT 1");
  // Chọn Agent ĐÃ CÓ sản phẩm và phiên chat, không lấy bừa dòng đầu: lấy bừa
  // thì hai mục quan trọng nhất (tag trên thực đơn khách) bị bỏ qua mà bài vẫn
  // báo ĐẠT — một bài đo tự bỏ qua phần khó thì không đo được gì.
  const ag = await pg.query(
    `SELECT a.id, a.project_id
       FROM admins a
      WHERE a.role = 'agent'
        AND EXISTS (SELECT 1 FROM qr_menu_items i WHERE i.agent_id = a.id)
        AND EXISTS (SELECT 1 FROM sessions s
                      LEFT JOIN qr_chat_accounts q ON q.id = s.qr_account_id
                      LEFT JOIN agent_groups g ON g.id = q.group_id
                     WHERE COALESCE(g.agent_id, q.owner_admin_id) = a.id)
      LIMIT 1`);
  check('có tài khoản superadmin để thử', Boolean(sa.rows[0]));
  check('có tài khoản agent (kèm sản phẩm và phiên chat) để thử', Boolean(ag.rows[0]),
    'không có agent nào đủ dữ liệu — hai mục quan trọng nhất sẽ bị bỏ qua');
  if (!sa.rows[0] || !ag.rows[0]) { console.log('\nThiếu dữ liệu nền — bỏ qua.'); process.exit(1); }

  const tokenCua = async (adminId) => {
    const token = 'test-' + Math.random().toString(36).slice(2);
    await pg.query(
      `INSERT INTO admin_sessions (token, admin_id, expires_at, last_seen_at)
       VALUES ($1, $2, NOW() + interval '1 hour', NOW())`, [token, adminId]);
    return token;
  };
  const tokenSa = await tokenCua(sa.rows[0].id);
  const tokenAg = await tokenCua(ag.rows[0].id);

  // ── 1. CHỈ SUPERADMIN ĐƯỢC CẤU HÌNH TAG ──────────────────────────────
  const agTaoTag = await goi('/api/superadmin/menu-tags', {
    method: 'POST', token: tokenAg, body: { label: 'Thử agent', code: 'thu-agent' } });
  check('Agent KHÔNG cấu hình được danh mục tag', agTaoTag.status === 403,
    `HTTP ${agTaoTag.status} ${agTaoTag.raw.slice(0, 120)}`);

  const taoTag = await goi('/api/superadmin/menu-tags', {
    method: 'POST', token: tokenSa, body: { label: 'Bán chạy', code: 'thu-ban-chay', colorBg: '#e51a82' } });
  check('Superadmin tạo được tag', taoTag.status === 200 && taoTag.body?.tag?.id,
    `HTTP ${taoTag.status} ${taoTag.raw.slice(0, 160)}`);
  const tagId = taoTag.body?.tag?.id;
  if (!tagId) { console.log('\nHỎNG: không tạo được tag'); process.exit(1); }

  check('mã tag được bỏ dấu và chuẩn hoá', taoTag.body.tag.code === 'thu-ban-chay', taoTag.body.tag.code);
  check('màu nền được nhận', taoTag.body.tag.color_bg === '#e51a82', taoTag.body.tag.color_bg);

  const trung = await goi('/api/superadmin/menu-tags', {
    method: 'POST', token: tokenSa, body: { label: 'Khác', code: 'thu-ban-chay' } });
  check('trùng mã tag bị chặn', trung.status === 409, `HTTP ${trung.status}`);

  // ── 2. TAG ĐƯỢC DỊCH LÚC LƯU, CẤT VÀO DB ─────────────────────────────
  //
  // Đây là điểm cốt lõi: nhãn phải có mặt trong qr_menu_tag_translations NGAY
  // sau khi lưu, không phải đợi khách mở thực đơn mới dịch.
  const ban = await pg.query('SELECT lang, label FROM qr_menu_tag_translations WHERE tag_id = $1', [tagId]);
  const tiengCoBan = new Set(ban.rows.map((r) => r.lang));
  for (const ma of ['en', 'ru', 'zh', 'ko', 'kk']) {
    check(`tag có bản dịch "${ma}" ngay sau khi lưu`, tiengCoBan.has(ma),
      'đã có: ' + [...tiengCoBan].join(', ') + ' — dịch lúc lưu chứ không dịch live');
  }
  check('bản dịch tag KHÔNG rỗng',
    ban.rows.length > 0 && ban.rows.every((r) => String(r.label || '').trim()),
    JSON.stringify(ban.rows.slice(0, 3)));

  // Sửa tay một bản dịch thì máy dịch không được ghi đè.
  const suaTay = await goi(`/api/superadmin/menu-tags/${tagId}/translations/ko`, {
    method: 'PUT', token: tokenSa, body: { label: '인기 메뉴' } });
  check('sửa tay được một bản dịch', suaTay.status === 200, `HTTP ${suaTay.status}`);
  await goi(`/api/superadmin/menu-tags/${tagId}`, {
    method: 'PUT', token: tokenSa, body: { label: 'Rất bán chạy' } });
  const sauSua = await pg.query("SELECT label, is_manual FROM qr_menu_tag_translations WHERE tag_id = $1 AND lang = 'ko'", [tagId]);
  check('bản dịch sửa tay KHÔNG bị máy dịch ghi đè',
    sauSua.rows[0]?.label === '인기 메뉴' && sauSua.rows[0]?.is_manual === true,
    JSON.stringify(sauSua.rows[0]));

  // ── 3. AGENT GẮN TAG CHO SẢN PHẨM ────────────────────────────────────
  const mon = await pg.query('SELECT id FROM qr_menu_items WHERE agent_id = $1 LIMIT 1', [ag.rows[0].id]);
  if (!mon.rows[0]) {
    console.log('  · agent chưa có sản phẩm nào — bỏ qua phần gắn tag');
  } else {
    const monId = mon.rows[0].id;
    const dsTag = await goi('/api/agent/menu-tags', { token: tokenAg });
    check('Agent xem được danh mục tag', dsTag.status === 200 && Array.isArray(dsTag.body?.tags),
      `HTTP ${dsTag.status}`);

    const gan = await goi(`/api/agent/menu/items/${monId}/tags`, {
      method: 'PUT', token: tokenAg, body: { tagIds: [tagId, 999999] } });
    check('Agent gắn được tag cho sản phẩm của mình', gan.status === 200, `HTTP ${gan.status} ${gan.raw.slice(0, 140)}`);
    check('id tag không có thật bị loại, không làm hỏng cả lượt lưu',
      Array.isArray(gan.body?.tagIds) && gan.body.tagIds.length === 1 && gan.body.tagIds[0] === tagId,
      JSON.stringify(gan.body?.tagIds));

    // Màn sửa sản phẩm PHẢI trả kèm tag_ids, nếu không Agent bấm Lưu là xoá sạch
    // tag đã chọn — đúng lớp lỗi đã xảy ra với tên riêng / tên gọi.
    const ds = await goi('/api/agent/menu/items', { token: tokenAg });
    const monTrongDs = (ds.body || []).find((x) => x.id === monId);
    check('danh sách sản phẩm của Agent trả kèm tag_ids',
      Array.isArray(monTrongDs?.tag_ids) && monTrongDs.tag_ids.includes(tagId),
      JSON.stringify(monTrongDs?.tag_ids));
  }

  // ── 4. BANNER: AGENT TỰ ĐẶT, TỐI ĐA 8 ────────────────────────────────
  await pg.query('DELETE FROM qr_menu_banners WHERE agent_id = $1', [ag.rows[0].id]);
  const taoBanner = await goi('/api/agent/menu/banners', { method: 'POST', token: tokenAg });
  check('Agent tạo được banner', taoBanner.status === 200 && taoBanner.body?.banner?.id,
    `HTTP ${taoBanner.status} ${taoBanner.raw.slice(0, 160)}`);
  const bannerId = taoBanner.body?.banner?.id;

  const saTaoBanner = await goi('/api/agent/menu/banners', { method: 'POST', token: tokenSa });
  check('Superadmin KHÔNG tạo banner thay Agent được', saTaoBanner.status === 403,
    `HTTP ${saTaoBanner.status}`);

  if (bannerId && mon.rows[0]) {
    // Banner chỉ được trỏ tới sản phẩm CỦA CHÍNH Agent đó.
    const monLa = await pg.query('SELECT id FROM qr_menu_items WHERE agent_id <> $1 LIMIT 1', [ag.rows[0].id]);
    if (monLa.rows[0]) {
      const traiPhep = await goi(`/api/agent/menu/banners/${bannerId}`, {
        method: 'PUT', token: tokenAg, body: { targetItemId: monLa.rows[0].id } });
      check('banner KHÔNG trỏ được tới sản phẩm của quán khác', traiPhep.status === 400,
        `HTTP ${traiPhep.status}`);
    }
    const hopLe = await goi(`/api/agent/menu/banners/${bannerId}`, {
      method: 'PUT', token: tokenAg, body: { targetItemId: mon.rows[0].id } });
    check('banner trỏ được tới sản phẩm của chính mình', hopLe.status === 200, `HTTP ${hopLe.status}`);
  }

  // Trần 8 banner.
  for (let i = 0; i < 9; i += 1) {
    await goi('/api/agent/menu/banners', { method: 'POST', token: tokenAg });
  }
  const dem = await pg.query('SELECT COUNT(*)::int AS n FROM qr_menu_banners WHERE agent_id = $1', [ag.rows[0].id]);
  check('không tạo quá 8 banner', dem.rows[0].n === 8, `đang có ${dem.rows[0].n}`);

  // ── 5. THỰC ĐƠN KHÁCH TRẢ TAG ĐÃ DỊCH, VÀ CHỈ TRẢ BANNER CÓ ẢNH ──────
  const phien = await pg.query(
    `SELECT s.id FROM sessions s
      LEFT JOIN qr_chat_accounts q ON q.id = s.qr_account_id
      LEFT JOIN agent_groups g ON g.id = q.group_id
     WHERE COALESCE(g.agent_id, q.owner_admin_id) = $1 LIMIT 1`, [ag.rows[0].id]);
  if (!phien.rows[0] || !mon.rows[0]) {
    console.log('  · chưa có phiên chat của agent này — bỏ qua phần thực đơn khách');
  } else {
    const thucDon = await goi(`/api/chats/${phien.rows[0].id}/menu?lang=ko`);
    check('lấy được thực đơn khách', thucDon.status === 200, `HTTP ${thucDon.status}`);
    const monKhach = (thucDon.body?.items || []).find((x) => x.id === mon.rows[0].id);
    check('sản phẩm trong thực đơn khách có trường tags', Array.isArray(monKhach?.tags),
      JSON.stringify(monKhach && Object.keys(monKhach)));
    const tagKhach = (monKhach?.tags || [])[0];
    check('nhãn tag trả về ĐÃ DỊCH theo ngôn ngữ khách, không còn tiếng Việt',
      tagKhach?.label === '인기 메뉴', JSON.stringify(tagKhach));
    check('tag kèm màu để cổng khách vẽ đúng', Boolean(tagKhach?.color_bg && tagKhach?.color_text),
      JSON.stringify(tagKhach));

    check('thực đơn khách có danh sách banner', Array.isArray(thucDon.body?.banners),
      JSON.stringify(Object.keys(thucDon.body || {})));
    // 8 banner vừa tạo đều CHƯA có ảnh — không được lọt ra cổng khách, nếu không
    // khách thấy 8 ô trống chạy qua trên đầu thực đơn.
    check('banner chưa có ảnh KHÔNG lọt ra cổng khách',
      (thucDon.body?.banners || []).length === 0,
      `đang trả ${(thucDon.body?.banners || []).length} banner`);
  }

  // ── 6. ẢNH BÌA: ẢNH AGENT TẢI LÊN, KHÔNG CÓ THÌ RƠI VỀ ẢNH SẢN PHẨM ──
  //
  // Hai nhánh, và nhánh rơi về mới là nhánh dễ quên: thực đơn vừa lập xong mà
  // Agent chưa kịp làm ảnh bìa thì khách quét QR không được thấy một mảng màu
  // trống trên nửa màn hình đầu tiên.
  if (phien.rows[0] && mon.rows[0]) {
    const phienId = phien.rows[0].id;
    const layHero = async () => {
      const r = await goi(`/api/chats/${phienId}/menu?lang=vi`);
      return r.body?.heroImage || null;
    };

    // Trạng thái gốc: Agent CHƯA có ảnh bìa.
    await pg.query('UPDATE admins SET hero_image_key = NULL, hero_image_url = NULL WHERE id = $1', [ag.rows[0].id]);
    // Dựng một sản phẩm CÓ ảnh để nhánh rơi về có cái mà rơi.
    await pg.query(
      "UPDATE qr_menu_items SET image_url = 'https://vi-du/anh-san-pham.jpg' WHERE id = $1",
      [mon.rows[0].id]);

    const roiVe = await layHero();
    check('chưa có ảnh bìa thì RƠI VỀ ảnh sản phẩm đầu tiên',
      roiVe === 'https://vi-du/anh-san-pham.jpg', String(roiVe));

    // Agent đã tải ảnh bìa: phải ưu tiên ảnh đó.
    await pg.query(
      `UPDATE admins SET hero_image_key = 'menu/x/hero.jpg', hero_image_url = 'https://vi-du/anh-bia.jpg',
                        hero_image_url_expires_at = NOW() + interval '6 days' WHERE id = $1`,
      [ag.rows[0].id]);
    const cuaAgent = await layHero();
    check('có ảnh bìa riêng thì dùng ảnh đó, không dùng ảnh sản phẩm',
      cuaAgent === 'https://vi-du/anh-bia.jpg', String(cuaAgent));

    // Màn cấu hình phải cho Agent biết mình ĐÃ TẢI hay chưa — KHÔNG rơi về ảnh
    // sản phẩm ở đó, nếu không Agent tưởng mình đã có ảnh bìa rồi.
    const caiDat = await goi('/api/agent/menu-settings', { token: tokenAg });
    check('màn cấu hình trả về ảnh bìa Agent đã tải',
      caiDat.body?.hero_image_url === 'https://vi-du/anh-bia.jpg', JSON.stringify(caiDat.body?.hero_image_url));

    await pg.query('UPDATE admins SET hero_image_key = NULL, hero_image_url = NULL WHERE id = $1', [ag.rows[0].id]);
    const caiDatTrong = await goi('/api/agent/menu-settings', { token: tokenAg });
    check('… và KHÔNG rơi về ảnh sản phẩm ở màn cấu hình',
      caiDatTrong.body?.hero_image_url === null,
      `đang là ${JSON.stringify(caiDatTrong.body?.hero_image_url)} — Agent sẽ tưởng mình đã có ảnh bìa`);

    await pg.query('UPDATE qr_menu_items SET image_url = NULL WHERE id = $1', [mon.rows[0].id]);
  }

  // ── DỌN ───────────────────────────────────────────────────────────────
  await pg.query('DELETE FROM qr_menu_banners WHERE agent_id = $1', [ag.rows[0].id]);
  await pg.query("DELETE FROM qr_menu_tags WHERE code LIKE 'thu-%'");
  await pg.query('DELETE FROM admin_sessions WHERE token LIKE $1', ['test-%']);
  await pg.end();

  console.log('');
  console.log(failures.length ? `HỎNG ${failures.length}:\n  - ` + failures.join('\n  - ') : `ĐẠT ${passed}/${passed}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('LỖI: ' + e.stack); process.exit(1); });
