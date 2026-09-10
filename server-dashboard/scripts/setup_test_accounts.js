const db = require('../database.js');
const crypto = require('crypto');

(async () => {
  try {
    await db.initPromise;
    console.log('DB connected.');

    const projId = 'dealphuquoc';
    await db.query(`INSERT INTO projects (id, name, project_type) VALUES ('dealphuquoc', 'Deal Phú Quốc', 'qr_concierge') ON CONFLICT (id) DO NOTHING`);

    // 1. Agent: agenttest@tempmail.id.vn
    let agentRes = await db.query(`SELECT id FROM admins WHERE LOWER(username) = 'agenttest@tempmail.id.vn'`);
    let agentId;
    if (agentRes.rows.length === 0) {
      const ins = await db.query(`INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, allow_room_charge, deferred_payment_mode) VALUES ('agenttest@tempmail.id.vn', 'hash123', 'Agent Quản Trị Cơ Sở', 'agent', $1, TRUE, TRUE, 'room_charge') RETURNING id`, [projId]);
      agentId = ins.rows[0].id;
    } else {
      agentId = agentRes.rows[0].id;
      await db.query(`UPDATE admins SET role = 'agent', is_active = TRUE, project_id = $1, allow_room_charge = TRUE WHERE id = $2`, [projId, agentId]);
    }

    // 2. Agent Group
    let gRes = await db.query(`SELECT id FROM agent_groups WHERE agent_id = $1 LIMIT 1`, [agentId]);
    let groupId;
    if (gRes.rows.length === 0) {
      const gins = await db.query(`INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1, $2, 'Khu Vực Bàn Sảnh') RETURNING id`, [agentId, projId]);
      groupId = gins.rows[0].id;
    } else {
      groupId = gRes.rows[0].id;
    }

    // 3. Sale: sale@tempmail.id.vn
    let saleRes = await db.query(`SELECT id FROM admins WHERE LOWER(username) = 'sale@tempmail.id.vn'`);
    let saleId;
    if (saleRes.rows.length === 0) {
      const sins = await db.query(`INSERT INTO admins (username, password_hash, full_name, role, project_id, managed_by_admin_id, is_active) VALUES ('sale@tempmail.id.vn', 'hash123', 'Sale Trực Ca', 'sale', $1, $2, TRUE) RETURNING id`, [projId, agentId]);
      saleId = sins.rows[0].id;
    } else {
      saleId = saleRes.rows[0].id;
      await db.query(`UPDATE admins SET role = 'sale', is_active = TRUE, project_id = $1, managed_by_admin_id = $2 WHERE id = $3`, [projId, agentId, saleId]);
    }
    await db.query(`INSERT INTO agent_group_members (group_id, admin_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [groupId, saleId]);

    // 4. QR Code Table for Customer: user@tempmail.id.vn
    const qrCode = 'BAN-01';
    let qrRes = await db.query(`SELECT id FROM qr_accounts WHERE code = $1`, [qrCode]);
    let qrId;
    if (qrRes.rows.length === 0) {
      const qins = await db.query(`INSERT INTO qr_accounts (project_id, agent_id, group_id, code, label, is_active) VALUES ($1, $2, $3, $4, 'Bàn 01 (Sảnh A)', TRUE) RETURNING id`, [projId, agentId, groupId, qrCode]);
      qrId = qins.rows[0].id;
    } else {
      qrId = qrRes.rows[0].id;
      await db.query(`UPDATE qr_accounts SET agent_id = $1, group_id = $2, project_id = $3 WHERE id = $4`, [agentId, groupId, projId, qrId]);
    }

    // 5. Store OTP 123456 in admin_otps for both emails
    await db.query(`DELETE FROM admin_otps WHERE email IN ('agenttest@tempmail.id.vn', 'sale@tempmail.id.vn')`);
    await db.query(`INSERT INTO admin_otps (email, code, attempts, expires_at) VALUES ('agenttest@tempmail.id.vn', '123456', 0, NOW() + interval '48 hours')`);
    await db.query(`INSERT INTO admin_otps (email, code, attempts, expires_at) VALUES ('sale@tempmail.id.vn', '123456', 0, NOW() + interval '48 hours')`);

    // 6. User OTP for qr chat
    await db.query(`DELETE FROM otps WHERE email = 'user@tempmail.id.vn'`).catch(() => {});
    await db.query(`INSERT INTO otps (email, code, attempts, expires_at) VALUES ('user@tempmail.id.vn', '123456', 0, NOW() + interval '48 hours')`).catch(() => {});

    // 7. Menu items
    const catRes = await db.query(`SELECT id FROM menu_categories WHERE project_id = $1 LIMIT 1`, [projId]);
    let catId = catRes.rows[0]?.id;
    if (!catId) {
      const cIns = await db.query(`INSERT INTO menu_categories (project_id, name, display_order) VALUES ($1, 'Đồ Uống & Tráng Miệng', 1) RETURNING id`, [projId]);
      catId = cIns.rows[0].id;
    }

    const items = [
      { name: 'Cà Phê Muối Đặc Biệt', price: 35000, desc: 'Cà phê pha phin truyền thống béo ngậy vị muối biển' },
      { name: 'Trà Đào Cam Sả Tươi', price: 45000, desc: 'Trà thanh nhiệt với đào miếng giòn ngọt mát' },
      { name: 'Bánh Tiramisu Ý', price: 55000, desc: 'Bánh mềm mịn thơm hương cà phê và cacao cao cấp' }
    ];

    for (const item of items) {
      const itemCheck = await db.query(`SELECT id FROM menu_items WHERE project_id = $1 AND name = $2`, [projId, item.name]);
      if (itemCheck.rows.length === 0) {
        await db.query(`INSERT INTO menu_items (project_id, category_id, name, price, description, status, stock_quantity, vat_rate) VALUES ($1, $2, $3, $4, $5, 'available', 99, 8)`, [projId, catId, item.name, item.price, item.desc]);
      }
    }

    console.log('SETUP HOÀN TẤT:');
    console.log('1. AGENT: agenttest@tempmail.id.vn (Mã OTP: 123456)');
    console.log('2. SALE:  sale@tempmail.id.vn (Mã OTP: 123456)');
    console.log('3. KHÁCH: user@tempmail.id.vn (Mã OTP: 123456) tại Bàn 01 (Mã: BAN-01)');
    process.exit(0);
  } catch (err) {
    console.error('Setup error:', err);
    process.exit(1);
  }
})();
