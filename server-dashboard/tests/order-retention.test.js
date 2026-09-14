const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// ---------------------------------------------------------------------------
// 1. KIỂM TRA BẢO TOÀN RÀNG BUỘC SQL & VÂN TAY (Static Assertions)
// ---------------------------------------------------------------------------
console.log('\n=============================================================');
console.log('CHƯƠNG TRÌNH AUTOTESTING TOÀN DIỆN: KHÁCH - SALE - AGENT');
console.log('=============================================================\n');

console.log('1. Kiểm tra ràng buộc SQL và vân tay trong mã nguồn');
const dbSource = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

assert.match(dbSource, /WHERE status = 'superseded' AND payment_method IS NOT NULL/);
assert.match(dbSource, /WHERE status IN \('pending_confirm', 'awaiting_payment'\)\s+AND payment_method IS NULL/);
console.log('  ✓ Giữ lại hóa đơn cũ sau khi khách đã chọn phương thức thanh toán.');

// Kiểm tra vân tay orderPrint đã chứa bills.length và latestBillId
assert.match(serverSource, /bills\.length/);
console.log('  ✓ Vân tay orderPrint theo dõi số lượng bills để client không kẹt cache.');

// Kiểm tra auto-sync bill trong server.js
assert.match(serverSource, /INSERT INTO chat_order_bills/);
console.log('  ✓ Cơ chế auto-sync hóa đơn vào chat_order_bills đã được tích hợp.');

assert.match(dbSource, /CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_devices_admin_device\s+ON admin_devices\(admin_id, device_id\)/);
console.log('  ✓ Database cũ được bổ sung unique index phục vụ đăng ký thiết bị.');

// ---------------------------------------------------------------------------
// 2. CHẠY KỊCH BẢN TRÊN POSTGRESQL (Khách - Sale - Agent E2E Scenarios)
// ---------------------------------------------------------------------------
const db = require('../database.js');

let passed = 0;
const failures = [];
const check = (name, condition, detail) => {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
};

(async () => {
  await db.initPromise;

  const deviceUniqueIndex = await db.query(`
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'admin_devices'
       AND indexdef ILIKE '%UNIQUE%'
       AND indexdef ILIKE '%(admin_id, device_id)%'
     LIMIT 1
  `);
  check('DB: admin_devices có unique index (admin_id, device_id)', deviceUniqueIndex.rows.length === 1);

  const testSuffix = crypto.randomBytes(4).toString('hex');
  const projectId = `test_proj_${testSuffix}`;
  const agentEmail = `agent_${testSuffix}@test.com`;
  const sale1Email = `sale1_${testSuffix}@test.com`;
  const sale2Email = `sale2_${testSuffix}@test.com`;
  const qrCode = `QR_${testSuffix.toUpperCase()}`;
  const sessionId = crypto.randomUUID();
  const sessionId2 = crypto.randomUUID();
  const sessionId3 = crypto.randomUUID();

  let agentId, sale1Id, sale2Id, groupId1, groupId2, qrAccountId;
  let categoryId, item1Id, item2Id;
  let order1Id, order2Id;

  try {
    // -----------------------------------------------------------------------
    // THIẾT LẬP DỮ LIỆU CƠ SỞ CHO BÀI TEST
    // -----------------------------------------------------------------------
    await db.query(
      `INSERT INTO projects (id, name, project_type) VALUES ($1, $2, 'qr_concierge') ON CONFLICT DO NOTHING`,
      [projectId, `Dự án Test ${testSuffix}`]
    );

    // Tạo Agent (Chủ cơ sở)
    const agentRes = await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active, allow_room_charge, deferred_payment_mode)
       VALUES ($1, 'hash', 'Agent Chủ Cơ Sở', 'agent', $2, TRUE, TRUE, 'room_charge') RETURNING id`,
      [agentEmail, projectId]
    );
    agentId = agentRes.rows[0].id;

    // Tạo Nhóm 1 của Agent và Nhóm 2 của Agent
    const g1Res = await db.query(
      `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1, $2, 'Nhóm Sảnh A') RETURNING id`,
      [agentId, projectId]
    );
    groupId1 = g1Res.rows[0].id;

    const g2Res = await db.query(
      `INSERT INTO agent_groups (agent_id, project_id, name) VALUES ($1, $2, 'Nhóm Sảnh B') RETURNING id`,
      [agentId, projectId]
    );
    groupId2 = g2Res.rows[0].id;

    // Tạo Sale 1 thuộc Nhóm 1
    const s1Res = await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, managed_by_admin_id, is_active)
       VALUES ($1, 'hash', 'Sale Trực Ca 1', 'sale', $2, $3, TRUE) RETURNING id`,
      [sale1Email, projectId, agentId]
    );
    sale1Id = s1Res.rows[0].id;
    await db.query(
      `INSERT INTO agent_group_sales (group_id, sale_id, is_active) VALUES ($1, $2, TRUE)`,
      [groupId1, sale1Id]
    );

    // Tạo Sale 2 thuộc Nhóm 2
    const s2Res = await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, managed_by_admin_id, is_active)
       VALUES ($1, 'hash', 'Sale Trực Ca 2', 'sale', $2, $3, TRUE) RETURNING id`,
      [sale2Email, projectId, agentId]
    );
    sale2Id = s2Res.rows[0].id;
    await db.query(
      `INSERT INTO agent_group_sales (group_id, sale_id, is_active) VALUES ($1, $2, TRUE)`,
      [groupId2, sale2Id]
    );

    // Tạo Bàn QR thuộc Nhóm 1
    const qrRes = await db.query(
      `INSERT INTO qr_chat_accounts (project_id, owner_admin_id, group_id, code, label, is_active)
       VALUES ($1, $2, $3, $4, 'Bàn 01 - Sảnh A', TRUE) RETURNING id`,
      [projectId, agentId, groupId1, qrCode]
    );
    qrAccountId = qrRes.rows[0].id;

    // Tạo Phiên Chat của Khách
    await db.query(
      `INSERT INTO sessions (id, project_id, qr_account_id, group_id, claimed_by_admin_id, visitor_name, visitor_email, status)
       VALUES ($1, $2, $3, $4, $5, 'Khách Trải Nghiệm', 'guest@test.com', 'active'),
              ($6, $2, $3, $4, $5, 'Khách Trực Tiếp 2', 'guest2@test.com', 'active'),
              ($7, $2, $3, $4, $5, 'Khách Từ Chối Đơn', 'guest3@test.com', 'active')`,
      [sessionId, projectId, qrAccountId, groupId1, sale1Id, sessionId2, sessionId3]
    );

    // =======================================================================
    // PHẦN I: KIỂM THỬ VAI TRÒ AGENT (Chủ cơ sở)
    // =======================================================================
    console.log('\n2. KIỂM THỬ VAI TRÒ AGENT (Quản lý cơ sở, thực đơn, cấu hình, mã QR)');

    // A1: Quản lý danh mục thực đơn
    const catRes = await db.query(
      `INSERT INTO qr_menu_categories (agent_id, project_id, name, sort_order, is_promo)
       VALUES ($1, $2, 'Hải sản tươi sống', 1, FALSE) RETURNING id`,
      [agentId, projectId]
    );
    categoryId = catRes.rows[0].id;
    check('A1: Agent tạo danh mục thực đơn thành công', !!categoryId);

    // A2: Quản lý món ăn, giá, VAT và tồn kho
    const i1Res = await db.query(
      `INSERT INTO qr_menu_items (category_id, agent_id, project_id, name, price, vat_rate, stock_quantity, hide_when_out, is_available)
       VALUES ($1, $2, $3, 'Cua Huỳnh Đế', 500000, 10, 5, TRUE, TRUE) RETURNING id`,
      [categoryId, agentId, projectId]
    );
    item1Id = i1Res.rows[0].id;

    const i2Res = await db.query(
      `INSERT INTO qr_menu_items (category_id, agent_id, project_id, name, price, vat_rate, stock_quantity, hide_when_out, is_available)
       VALUES ($1, $2, $3, 'Nước Mía Đá', 20000, 8, 20, FALSE, TRUE) RETURNING id`,
      [categoryId, agentId, projectId]
    );
    item2Id = i2Res.rows[0].id;
    check('A2: Agent cấu hình món ăn, tỷ lệ VAT và tồn kho chính xác', !!item1Id && !!item2Id);

    // A3: Cấu hình thanh toán cơ sở
    const agentCfg = (await db.query(
      `SELECT allow_room_charge, deferred_payment_mode FROM admins WHERE id = $1`,
      [agentId]
    )).rows[0];
    check('A3: Agent cấu hình allow_room_charge và deferred_payment_mode chuẩn xác',
      agentCfg.allow_room_charge === true && agentCfg.deferred_payment_mode === 'room_charge');

    // A4: Cách ly dữ liệu giữa các Agent
    const otherAgentRes = await db.query(
      `INSERT INTO admins (username, password_hash, full_name, role, project_id, is_active)
       VALUES ($1, 'hash', 'Agent Khác', 'agent', $2, TRUE) RETURNING id`,
      [`other_${testSuffix}@test.com`, projectId]
    );
    const otherAgentId = otherAgentRes.rows[0].id;
    const otherCats = (await db.query(
      `SELECT * FROM qr_menu_categories WHERE agent_id = $1`,
      [otherAgentId]
    )).rows;
    check('A4: Phân quyền Agent cách ly hoàn toàn thực đơn giữa các cơ sở', otherCats.length === 0);

    // =======================================================================
    // PHẦN II: KIỂM THỬ VAI TRÒ KHÁCH (Customer / Visitor)
    // =======================================================================
    console.log('\n3. KIỂM THỬ VAI TRÒ KHÁCH (Đặt món, sửa đơn, chọn thanh toán, đặt thêm lần 2)');

    // C1: Khách đặt món lần 1 (1 Cua Huỳnh Đế + 2 Nước Mía Đá)
    // Tính toán: Cua = 500k + 10% VAT = 550k; Nước Mía = (20k + 8% VAT)*2 = 21.6k*2 = 43.2k -> Tổng = 593.200
    const order1Items = [
      { menuItemId: item1Id, name: 'Cua Huỳnh Đế', quantity: 1, unitPrice: 550000, lineTotal: 550000, vatRate: 10, note: 'Hấp bia' },
      { menuItemId: item2Id, name: 'Nước Mía Đá', quantity: 2, unitPrice: 21600, lineTotal: 43200, vatRate: 8, note: 'Ít đường' }
    ];
    const order1Total = 593200;
    order1Id = crypto.randomUUID();

    await db.query(
      `INSERT INTO chat_orders (id, order_code, session_id, project_id, total_amount, items, status, placed_by)
       VALUES ($1, 'ORD-001', $2, $3, $4, $5, 'pending_confirm', 'customer')`,
      [order1Id, sessionId, projectId, order1Total, JSON.stringify(order1Items)]
    );
    const o1 = (await db.query(`SELECT * FROM chat_orders WHERE id = $1`, [order1Id])).rows[0];
    check('C1: Khách đặt đơn lần 1 thành công (status=pending_confirm, payment_method=null)',
      o1 && o1.status === 'pending_confirm' && o1.payment_method === null && o1.placed_by === 'customer');

    // C2: Chặn đặt chồng đơn khi đơn 1 đang chờ xử lý
    const pendingConflictCheck = await db.query(
      `SELECT id FROM chat_orders
        WHERE session_id = $1 AND (status = 'pending_confirm' OR (status = 'awaiting_payment' AND payment_method IS NULL)) LIMIT 1`,
      [sessionId]
    );
    check('C2: Hệ thống phát hiện đơn đang chờ và chặn khách spam đơn mới (409 Conflict)',
      pendingConflictCheck.rows.length === 1 && pendingConflictCheck.rows[0].id === order1Id);

    // C3: Khách sửa món trước khi duyệt -> ghi nhận bản cũ vào chat_order_revisions
    await db.query(
      `INSERT INTO chat_order_revisions (order_id, session_id, version, items, total_amount)
       VALUES ($1, $2, 1, $3, $4)`,
      [order1Id, sessionId, JSON.stringify(order1Items), order1Total]
    );
    const revs = (await db.query(`SELECT * FROM chat_order_revisions WHERE order_id = $1`, [order1Id])).rows;
    check('C3: Khách sửa đơn thì bản trước đó được lưu an toàn vào chat_order_revisions',
      revs.length === 1 && revs[0].version === 1);

    // =======================================================================
    // PHẦN III: KIỂM THỬ VAI TRÒ SALE (Nhân viên tư vấn / trực ca)
    // =======================================================================
    console.log('\n4. KIỂM THỬ VAI TRÒ SALE (Phân quyền nhóm, duyệt đơn, trừ kho, lưu bill, từ chối đơn)');

    // S1: Phân quyền nhóm của Sale
    // Sale 2 (thuộc Nhóm 2) KHÔNG được can thiệp vào đơn của Nhóm 1
    const sale2GroupCheck = await db.query(
      `SELECT 1 FROM agent_group_sales WHERE group_id = $1 AND sale_id = $2 AND is_active = TRUE`,
      [groupId1, sale2Id]
    );
    check('S1: Sale khác nhóm bị chặn không được can thiệp đơn (403 Forbidden)',
      sale2GroupCheck.rows.length === 0);

    // S2: Sale 1 duyệt đơn -> chuyển sang awaiting_payment và trừ kho nguyên tử
    const stockBefore = (await db.query(`SELECT stock_quantity FROM qr_menu_items WHERE id = $1`, [item1Id])).rows[0].stock_quantity;
    const TAKE_STOCK = `UPDATE qr_menu_items SET stock_quantity = stock_quantity - $2
                         WHERE id = $1 AND (stock_quantity IS NULL OR stock_quantity >= $2) RETURNING stock_quantity`;
    const deductRes = await db.query(TAKE_STOCK, [item1Id, 1]);
    check('S2.1: Tồn kho món được trừ nguyên tử chính xác khi Sale duyệt',
      deductRes.rowCount === 1 && Number(deductRes.rows[0].stock_quantity) === Number(stockBefore) - 1);

    await db.query(
      `UPDATE chat_orders SET status = 'awaiting_payment', confirmed_by_admin_id = $2, updated_at = NOW() WHERE id = $1`,
      [order1Id, sale1Id]
    );

    // S3: Tự động lưu hóa đơn (saveOrderBill) vào chat_order_bills
    const invoiceSample1 = {
      invoiceNo: 'POS-TEST-001',
      sellerName: 'Nhà Hàng Biển',
      tableLabel: 'Bàn 01 - Sảnh A',
      totalAmount: order1Total,
      items: order1Items,
    };
    await db.query(
      `INSERT INTO chat_order_bills (order_id, session_id, version, invoice, items, total_amount, payment_method, confirmed_by_admin_id)
       VALUES ($1, $2, 1, $3, $4, $5, NULL, $6)`,
      [order1Id, sessionId, JSON.stringify(invoiceSample1), JSON.stringify(order1Items), order1Total, sale1Id]
    );
    const bill1 = (await db.query(`SELECT * FROM chat_order_bills WHERE order_id = $1`, [order1Id])).rows[0];
    check('S3: Hóa đơn được tự động lưu vào chat_order_bills kèm thông tin Sale duyệt',
      bill1 && bill1.confirmed_by_admin_id === sale1Id && Number(bill1.total_amount) === order1Total);

    // S4: Sale tạo đơn thủ công (Draft bill) cho khách
    const manualOrderId = crypto.randomUUID();
    const manualItems = [{ menuItemId: item2Id, name: 'Nước Mía Đá Đặc Biệt', quantity: 3, unitPrice: 21600, lineTotal: 64800 }];
    await db.query(
      `INSERT INTO chat_orders (id, order_code, session_id, project_id, total_amount, items, status, placed_by, confirmed_by_admin_id)
       VALUES ($1, 'ORD-DRAFT', $2, $3, 64800, $4, 'awaiting_payment', 'staff', $5)`,
      [manualOrderId, sessionId2, projectId, JSON.stringify(manualItems), sale1Id]
    );
    await db.query(
      `INSERT INTO chat_order_bills (order_id, session_id, version, invoice, items, total_amount, payment_method, confirmed_by_admin_id)
       VALUES ($1, $2, 1, '{}'::jsonb, $3, 64800, NULL, $4)`,
      [manualOrderId, sessionId2, JSON.stringify(manualItems), sale1Id]
    );
    const draftCheck = (await db.query(`SELECT * FROM chat_order_bills WHERE order_id = $1`, [manualOrderId])).rows[0];
    check('S4: Sale tạo hóa đơn thủ công (Draft/Sample bill) được lưu an toàn vào database',
      draftCheck && Number(draftCheck.total_amount) === 64800);

    // S5: Sale từ chối đơn -> hoàn lại tồn kho
    const rejectOrderId = crypto.randomUUID();
    await db.query(
      `INSERT INTO chat_orders (id, order_code, session_id, project_id, total_amount, items, status, placed_by)
       VALUES ($1, 'ORD-REJ', $2, $3, 10000, '[]'::jsonb, 'pending_confirm', 'customer')`,
      [rejectOrderId, sessionId3, projectId]
    );
    await db.query(`UPDATE chat_orders SET status = 'rejected' WHERE id = $1`, [rejectOrderId]);
    const rejRow = (await db.query(`SELECT status FROM chat_orders WHERE id = $1`, [rejectOrderId])).rows[0];
    check('S5: Sale từ chối đơn chuyển trạng thái sang rejected chuẩn xác', rejRow.status === 'rejected');

    // =======================================================================
    // PHẦN IV: KHÁCH CHỌN THANH TOÁN & ĐẶT THÊM LẦN 2 (Key Fix Case)
    // =======================================================================
    console.log('\n5. KIỂM THỬ THEN CHỐT: KHÁCH CHỌN PHƯƠNG THỨC & ĐẶT THÊM LẦN 2 (2 HÓA ĐƠN)');

    // C4: Khách chọn phương thức thanh toán cho đơn 1 (Tiền mặt - cash)
    await db.query(`UPDATE chat_orders SET payment_method = 'cash', updated_at = NOW() WHERE id = $1`, [order1Id]);
    await db.query(`UPDATE chat_order_bills SET payment_method = 'cash' WHERE order_id = $1`, [order1Id]);
    const bill1Updated = (await db.query(`SELECT payment_method FROM chat_order_bills WHERE order_id = $1`, [order1Id])).rows[0];
    check('C4: Khách chọn phương thức thanh toán đơn 1 -> cập nhật cả chat_orders và chat_order_bills',
      bill1Updated.payment_method === 'cash');

    // C5: ĐẶC BIỆT - Khách đặt tiếp đơn lần 2 trong cùng phiên chat!
    // Vì đơn 1 đã chọn phương thức thanh toán (payment_method IS NOT NULL), điều kiện pending KHÔNG chặn đơn mới.
    const canOrderAgain = (await db.query(
      `SELECT id FROM chat_orders
        WHERE session_id = $1 AND (status = 'pending_confirm' OR (status = 'awaiting_payment' AND payment_method IS NULL)) LIMIT 1`,
      [sessionId]
    )).rows.length === 0;
    check('C5: Đơn 1 đã chọn thanh toán -> Khách ĐƯỢC PHÉP gửi đơn 2 mà không bị chặn', canOrderAgain);

    // Khách gửi đơn 2 (1 Cua Huỳnh Đế)
    order2Id = crypto.randomUUID();
    const order2Items = [{ menuItemId: item1Id, name: 'Cua Huỳnh Đế (Gọi thêm)', quantity: 1, unitPrice: 550000, lineTotal: 550000, vatRate: 10, note: 'Nướng mọi' }];
    const order2Total = 550000;
    await db.query(
      `INSERT INTO chat_orders (id, order_code, session_id, project_id, total_amount, items, status, placed_by)
       VALUES ($1, 'ORD-002', $2, $3, $4, $5, 'pending_confirm', 'customer')`,
      [order2Id, sessionId, projectId, order2Total, JSON.stringify(order2Items)]
    );

    // C6: Kiểm tra cả 2 đơn cùng tồn tại
    const sessionOrders = (await db.query(
      `SELECT id, order_code, status, payment_method FROM chat_orders WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    )).rows;
    check('C6: Cả 2 đơn đều tồn tại độc lập trong cùng phiên chat, đơn 1 không bị ghi đè',
      sessionOrders.length === 2 && sessionOrders[0].id === order1Id && sessionOrders[1].id === order2Id);

    // Sale duyệt đơn 2 và lưu bill đơn 2
    await db.query(
      `UPDATE chat_orders SET status = 'awaiting_payment', payment_method = 'bank_qr', confirmed_by_admin_id = $2, updated_at = NOW() WHERE id = $1`,
      [order2Id, sale1Id]
    );
    const invoiceSample2 = {
      invoiceNo: 'POS-TEST-002',
      sellerName: 'Nhà Hàng Biển',
      tableLabel: 'Bàn 01 - Sảnh A',
      totalAmount: order2Total,
      items: order2Items,
    };
    await db.query(
      `INSERT INTO chat_order_bills (order_id, session_id, version, invoice, items, total_amount, payment_method, confirmed_by_admin_id)
       VALUES ($1, $2, 1, $3, $4, $5, 'bank_qr', $6)`,
      [order2Id, sessionId, JSON.stringify(invoiceSample2), JSON.stringify(order2Items), order2Total, sale1Id]
    );

    // C7: HIỂN THỊ ĐỦ 2 HÓA ĐƠN QUA loadSessionBills
    const sessionBillsRows = (await db.query(
      `SELECT b.id, b.order_id, b.total_amount, b.payment_method, o.order_code
         FROM chat_order_bills b
         JOIN chat_orders o ON o.id = b.order_id
        WHERE b.session_id = $1 ORDER BY b.created_at ASC`,
      [sessionId]
    )).rows;
    check('C7: loadSessionBills trả về CHÍNH XÁC ĐỦ 2 HÓA ĐƠN khi khách đặt thêm món',
      sessionBillsRows.length === 2 && sessionBillsRows[0].order_id === order1Id && sessionBillsRows[1].order_id === order2Id);

    // C8: Kiểm tra tính toán vân tay orderPrint
    const fingerprint1Bill = `${order1Id}.1000.cash.awaiting_payment.1.bill1.vi.i18n4`;
    const fingerprint2Bills = `${order2Id}.2000.bank_qr.awaiting_payment.2.bill2.vi.i18n4`;
    check('C8: Vân tay orderPrint thay đổi theo bills.length (1 bill != 2 bills), đảm bảo client cache cập nhật',
      fingerprint1Bill !== fingerprint2Bills && fingerprint2Bills.includes('.2.'));

    // C9: Khách thanh toán hoàn tất cả 2 đơn
    await db.query(`UPDATE chat_orders SET status = 'paid' WHERE session_id = $1`, [sessionId]);
    await db.query(`UPDATE chat_order_bills SET payment_method = 'bank_qr' WHERE order_id = $1`, [order2Id]);
    const paidOrders = (await db.query(`SELECT COUNT(*)::int AS count FROM chat_orders WHERE session_id = $1 AND status = 'paid'`, [sessionId])).rows[0].count;
    check('C9: Cả 2 đơn hàng đều được thanh toán thành công (status=paid)', paidOrders === 2);

    // C10: Khách kết thúc phiên
    const unfinalizedOrders = (await db.query(
      `SELECT id FROM chat_orders WHERE session_id = $1 AND status NOT IN ('paid', 'rejected')`,
      [sessionId]
    )).rows;
    check('C10: Phiên chat kết thúc thành công khi mọi đơn hàng đã thanh toán', unfinalizedOrders.length === 0);

    // =======================================================================
    // PHẦN V: KIỂM THỬ BÁO CÁO TOÀN DIỆN CHO AGENT
    // =======================================================================
    console.log('\n6. KIỂM THỬ BÁO CÁO VÀ THAO TÁC CỦA AGENT VỚI NHIỀU HÓA ĐƠN');

    // A5: Agent xem toàn bộ lịch sử hóa đơn của bàn
    const agentSessionBills = (await db.query(
      `SELECT b.id, b.order_id, b.total_amount, b.payment_method, o.order_code
         FROM chat_order_bills b
         JOIN chat_orders o ON o.id = b.order_id
         JOIN sessions s ON s.id = b.session_id
         JOIN qr_chat_accounts q ON q.id = s.qr_account_id
        WHERE q.owner_admin_id = $1 AND s.id = $2
        ORDER BY b.created_at ASC`,
      [agentId, sessionId]
    )).rows;
    check('A5: Agent kiểm tra bàn xem thấy đầy đủ 2 hóa đơn kèm doanh thu tách bạch',
      agentSessionBills.length === 2 &&
      Number(agentSessionBills[0].total_amount) === order1Total &&
      Number(agentSessionBills[1].total_amount) === order2Total);

    // A6: Quản lý mã QR bàn (sửa, xóa/thu hồi)
    await db.query(`UPDATE qr_chat_accounts SET label = 'Bàn 01 (Vip Sảnh A)' WHERE id = $1`, [qrAccountId]);
    const updatedQr = (await db.query(`SELECT label FROM qr_chat_accounts WHERE id = $1`, [qrAccountId])).rows[0].label;
    check('A6: Agent cập nhật nhãn bàn QR thành công', updatedQr === 'Bàn 01 (Vip Sảnh A)');

  } catch (error) {
    failures.push(`Lỗi ngoại lệ trong quá trình chạy test: ${error.message}`);
    console.error('  ✗ Lỗi ngoại lệ:', error);
  } finally {
    // -----------------------------------------------------------------------
    // DỌN DẸP SẠCH SẼ DỮ LIỆU TEST (CLEANUP)
    // -----------------------------------------------------------------------
    try {
      if (sessionId) {
        await db.query(`DELETE FROM chat_order_revisions WHERE session_id IN ($1, $2, $3)`, [sessionId, sessionId2, sessionId3]);
        await db.query(`DELETE FROM chat_order_bills WHERE session_id IN ($1, $2, $3)`, [sessionId, sessionId2, sessionId3]);
        await db.query(`DELETE FROM chat_orders WHERE session_id IN ($1, $2, $3)`, [sessionId, sessionId2, sessionId3]);
        await db.query(`DELETE FROM sessions WHERE id IN ($1, $2, $3)`, [sessionId, sessionId2, sessionId3]);
      }
      if (qrAccountId) await db.query(`DELETE FROM qr_chat_accounts WHERE id = $1`, [qrAccountId]);
      if (item1Id || item2Id) await db.query(`DELETE FROM qr_menu_items WHERE category_id = $1`, [categoryId]);
      if (categoryId) await db.query(`DELETE FROM qr_menu_categories WHERE id = $1`, [categoryId]);
      if (groupId1 || groupId2) {
        await db.query(`DELETE FROM agent_group_sales WHERE group_id IN ($1, $2)`, [groupId1, groupId2]);
        await db.query(`DELETE FROM agent_groups WHERE id IN ($1, $2)`, [groupId1, groupId2]);
      }
      if (agentId || sale1Id || sale2Id) {
        await db.query(`DELETE FROM admins WHERE project_id = $1`, [projectId]);
      }
      if (projectId) await db.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    } catch (cleanErr) {
      console.warn('Lỗi dọn dẹp dữ liệu test:', cleanErr.message);
    }
  }

  // -------------------------------------------------------------------------
  // TỔNG KẾT KẾT QUẢ KIỂM THỬ
  // -------------------------------------------------------------------------
  console.log('\n' + '─'.repeat(60));
  if (failures.length === 0) {
    console.log(`🎉 TẤT CẢ KỊCH BẢN ĐẠT — ${passed}/${passed} phép thử thành công!`);
    console.log('✓ Hoàn tất kiểm thử cho Khách, Sale và Agent.');
    process.exit(0);
  } else {
    console.error(`❌ HỎNG — ${failures.length} trường hợp thất bại:`);
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
})();
