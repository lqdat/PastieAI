const db = require('../database.js');

(async () => {
  try {
    const projectId = 'qr-concierge';

    // 1. Agent: agenttest@tempmail.id.vn
    let aRes = await db.query("SELECT id FROM admins WHERE LOWER(username) = 'agenttest@tempmail.id.vn'");
    let agentId;
    if (aRes.rows.length === 0) {
      const ins = await db.query(
        "INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, allow_room_charge) VALUES ('agenttest@tempmail.id.vn', 'hash', 'Agent Quản Trị Cơ Sở', 'agent', $1, TRUE, TRUE) RETURNING id",
        [projectId]
      );
      agentId = ins.rows[0].id;
    } else {
      agentId = aRes.rows[0].id;
      await db.query(
        "UPDATE admins SET role = 'agent', project_id = $1, is_active = TRUE, allow_room_charge = TRUE WHERE id = $2",
        [projectId, agentId]
      );
    }

    // 2. Group
    let gRes = await db.query("SELECT id FROM agent_groups WHERE agent_id = $1 LIMIT 1", [agentId]);
    let groupId;
    if (gRes.rows.length === 0) {
      const gins = await db.query(
        "INSERT INTO agent_groups (project_id, agent_id, name) VALUES ($1, $2, 'Khu Vực Bàn Sảnh A') RETURNING id",
        [projectId, agentId]
      );
      groupId = gins.rows[0].id;
    } else {
      groupId = gRes.rows[0].id;
    }

    // 3. Sale: sale@tempmail.id.vn
    let sRes = await db.query("SELECT id FROM admins WHERE LOWER(username) = 'sale@tempmail.id.vn'");
    let saleId;
    if (sRes.rows.length === 0) {
      const sins = await db.query(
        "INSERT INTO admins (username, password_hash, full_name, role, project_id, managed_by_admin_id, is_active) VALUES ('sale@tempmail.id.vn', 'hash', 'Sale Trực Ca', 'sale', $1, $2, TRUE) RETURNING id",
        [projectId, agentId]
      );
      saleId = sins.rows[0].id;
    } else {
      saleId = sRes.rows[0].id;
      await db.query(
        "UPDATE admins SET role = 'sale', project_id = $1, managed_by_admin_id = $2, is_active = TRUE WHERE id = $3",
        [projectId, agentId, saleId]
      );
    }
    await db.query(
      "INSERT INTO agent_group_sales (group_id, sale_id, is_active) VALUES ($1, $2, TRUE) ON CONFLICT (group_id, sale_id) DO NOTHING",
      [groupId, saleId]
    );

    // 4. QR Code: BAN-01 in qr_chat_accounts
    await db.query("DELETE FROM qr_chat_accounts WHERE code = 'BAN-01'");
    const qIns = await db.query(
      "INSERT INTO qr_chat_accounts (project_id, owner_admin_id, group_id, code, label, is_active) VALUES ($1, $2, $3, 'BAN-01', 'Bàn 01 (Sảnh A)', TRUE) RETURNING id",
      [projectId, agentId, groupId]
    );

    // 5. Sample menu items in qr_menu_categories and qr_menu_items
    let catCheck = await db.query("SELECT id FROM qr_menu_categories WHERE agent_id = $1 LIMIT 1", [agentId]);
    let catId = catCheck.rows[0]?.id;
    if (!catId) {
      const c = await db.query(
        "INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order) VALUES ($1, $2, 'Đặc Sản Pastie', 1) RETURNING id",
        [agentId, projectId]
      );
      catId = c.rows[0].id;
    }

    const demoItems = [
      { name: 'Cà Phê Muối Đặc Biệt', price: 35000, desc: 'Cà phê pha phin truyền thống béo ngậy vị muối biển' },
      { name: 'Trà Đào Cam Sả Tươi', price: 45000, desc: 'Trà thanh nhiệt với đào miếng giòn ngọt mát' },
      { name: 'Bánh Tiramisu Ý', price: 55000, desc: 'Bánh mềm mịn thơm hương cà phê và cacao' }
    ];
    for (const item of demoItems) {
      const exist = await db.query("SELECT id FROM qr_menu_items WHERE agent_id = $1 AND name = $2", [agentId, item.name]);
      if (exist.rows.length === 0) {
        await db.query(
          "INSERT INTO qr_menu_items (category_id, agent_id, project_id, name, price, description, is_available) VALUES ($1, $2, $3, $4, $5, $6, TRUE)",
          [catId, agentId, projectId, item.name, item.price, item.desc]
        );
      }
    }

    console.log('LINK SUCCESS:');
    console.log('- AGENT: agenttest@tempmail.id.vn (id:', agentId, ')');
    console.log('- SALE:  sale@tempmail.id.vn (id:', saleId, ')');
    console.log('- GROUP: Khu Vực Bàn Sảnh A (id:', groupId, ')');
    console.log('- QR BAN-01 (id:', qIns.rows[0].id, ') -> Customer URL: http://localhost:3000/customer-chat/BAN-01 hoặc /qr/BAN-01');
    process.exit(0);
  } catch (err) {
    console.error('Error linking:', err.message);
    process.exit(1);
  }
})();
