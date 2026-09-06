// Giỏ hàng: đơn của khách theo từng cuộc trò chuyện.
//
// Sale thấy đơn của chat mình tiếp nhận; Agent thấy cả cơ sở. Chỉ Agent và
// Superadmin bấm được "Đã thanh toán" — đó là xác nhận ĐÃ CÓ TIỀN, không phải
// một bước thao tác của người phục vụ bàn; máy chủ quyết định bằng cờ
// canMarkPaid chứ không để giao diện tự suy ra từ vai trò.
(function () {
    let overlay = null;
    let detailOverlay = null;
    let canMarkPaid = false;

    const STATUS = {
        pending_confirm: { label: 'Chờ xác nhận', cls: 'is-pending' },
        awaiting_payment: { label: 'Chờ thanh toán', cls: 'is-awaiting' },
        paid: { label: 'Đã thanh toán', cls: 'is-paid' },
        superseded: { label: 'Đã thay bản mới', cls: 'is-muted' },
        rejected: { label: 'Đã từ chối', cls: 'is-muted' },
    };
    const PAYMENT = { cash: 'Tiền mặt', bank_qr: 'Chuyển khoản QR', card: 'Thẻ', room_charge: 'Cộng tiền phòng', pay_later: 'Thanh toán sau', defer: 'Thanh toán sau' };
    const money = (value) => Number(value || 0).toLocaleString('vi-VN') + ' ₫';
    const when = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

    function close() {
        detailOverlay?.remove();
        detailOverlay = null;
        overlay?.remove();
        overlay = null;
    }

    async function fetchOrderDetails(orderId) {
        const res = await authFetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}/details?lang=vi`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Không tải được chi tiết đơn hàng.');
        return data.order;
    }

    async function openBill(orderId, trigger) {
        if (trigger) trigger.disabled = true;
        try {
            const order = await fetchOrderDetails(orderId);
            const invoice = order.invoice || {};
            const url = invoice.pdfUrl || invoice.pdfDataUrl || invoice.svgDataUrl || '';
            if (!url) throw new Error('Đơn đang chờ xác nhận nên chưa có bill.');
            if (typeof openMediaPreview === 'function') {
                openMediaPreview(url, 'document', `Bill ${order.order_code || ''}`.trim());
            } else {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            if (trigger) trigger.disabled = false;
        }
    }

    // Lịch sử chỉnh sửa của một đơn.
    //
    // Chỉ hiện Ở ĐÂY, không hiện trong khung chat: giữa dòng hội thoại thì nó
    // chỉ làm rối, còn khi Sale mở đơn ra đối chiếu thì đây đúng là thứ họ cần
    // — "món này thêm vào lúc nào, ai sửa, tổng đổi từ bao nhiêu sang bao nhiêu".
    async function loadOrderHistory(order) {
        if (!order?.session_id) return [];
        try {
            const res = await fetch(`${API_BASE}/api/chats/${order.session_id}/bills`);
            if (!res.ok) return [];
            const bills = (await res.json()).bills || [];
            const mine = bills.find((bill) => String(bill.orderId) === String(order.id))
                || bills.find((bill) => (bill.history || []).some((step) => String(step.orderId) === String(order.id)));
            return Array.isArray(mine?.history) ? mine.history : [];
        } catch { return []; }
    }

    function orderHistoryHtml(history) {
        if (!Array.isArray(history) || history.length < 2) return '';
        return `
            <details class="bill-history" open>
                <summary><i class="ri-history-line"></i> Đã chỉnh sửa ${history.length - 1} lần</summary>
                <ol class="bill-history-list">
                    ${history.slice().reverse().map((step) => `
                        <li>
                            <span class="bill-hist-when">${escapeHtml(new Date(step.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }))}</span>
                            <span class="bill-hist-what">${step.changes?.length
                                ? step.changes.map((line) => escapeHtml(line)).join(', ')
                                : 'Bản đầu tiên'}</span>
                            <span class="bill-hist-total">${money(step.totalAmount)}</span>
                        </li>`).join('')}
                </ol>
            </details>`;
    }

    async function showOrderDetails(orderId, trigger) {
        if (trigger) trigger.disabled = true;
        try {
            const order = await fetchOrderDetails(orderId);
            const items = Array.isArray(order.items) ? order.items : [];
            const charges = order.charges || {};
            const payment = order.payment_method ? PAYMENT[order.payment_method] || order.payment_method : 'Khách chưa chọn';
            detailOverlay?.remove();
            detailOverlay = document.createElement('div');
            detailOverlay.className = 'cart-overlay order-detail-overlay';
            detailOverlay.innerHTML = `
                <section class="cart-box order-detail-box" role="dialog" aria-modal="true" aria-label="Chi tiết đơn hàng">
                    <div class="admin-list-head">
                        <div class="order-detail-heading">
                            <small>CHI TIẾT ĐƠN HÀNG</small>
                            <h3>${escapeHtml(order.order_code || order.id)}</h3>
                        </div>
                        <button type="button" class="icon-btn cart-close detail-close" title="Đóng"><i class="ri-close-line"></i></button>
                    </div>
                    <div class="cart-body order-detail-body">
                        <div class="order-detail-meta">
                            <span><i class="ri-map-pin-line"></i>${escapeHtml(order.qr_label || order.group_name || '—')}</span>
                            <span><i class="ri-user-line"></i>${escapeHtml(order.visitor_name || order.visitor_email || 'Khách')}</span>
                            <span><i class="ri-bank-card-line"></i>${escapeHtml(payment)}</span>
                        </div>
                        <div class="order-detail-items">
                            ${items.map((item) => `
                                <div class="order-detail-item">
                                    <div><strong>${escapeHtml(item.name || 'Món')}</strong>${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}</div>
                                    <span>×${Number(item.quantity || 0)}</span>
                                    <b>${money(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0))}</b>
                                </div>`).join('') || '<p class="cart-empty">Đơn chưa có món.</p>'}
                        </div>
                        <div class="order-detail-summary">
                            <span>Tạm tính <b>${money(charges.subtotal ?? order.total_amount)}</b></span>
                            ${Number(charges.vatAmount || 0) > 0 ? `<span>VAT (${Number(charges.vatRate || 0)}%) <b>${money(charges.vatAmount)}</b></span>` : ''}
                            <span class="is-total">Tổng cộng <b>${money(order.total_amount)}</b></span>
                        </div>
                        <div class="order-detail-history"></div>
                        <div class="order-detail-actions">
                            <button type="button" class="secondary-btn" data-open="${escapeHtml(order.session_id)}"><i class="ri-chat-3-line"></i> Đến hội thoại</button>
                            <button type="button" class="primary-btn" data-bill="${escapeHtml(order.id)}"><i class="ri-file-list-3-line"></i> Xem bill</button>
                        </div>
                    </div>
                </section>`;
            document.body.appendChild(detailOverlay);
            // Tải sau khi đã vẽ: lịch sử là thông tin phụ, không nên bắt Sale
            // chờ thêm một lượt gọi mạng mới thấy được chi tiết đơn.
            void loadOrderHistory(order).then((history) => {
                const host = detailOverlay?.querySelector('.order-detail-history');
                if (host) host.innerHTML = orderHistoryHtml(history);
            });
            detailOverlay.addEventListener('click', async (event) => {
                if (event.target === detailOverlay || event.target.closest('.detail-close')) {
                    detailOverlay.remove(); detailOverlay = null; return;
                }
                const direct = event.target.closest('[data-open]');
                if (direct) {
                    const sessionId = direct.dataset.open;
                    close();
                    if (typeof selectSession === 'function') selectSession(sessionId);
                    return;
                }
                const bill = event.target.closest('[data-bill]');
                if (bill) await openBill(bill.dataset.bill, bill);
            });
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            if (trigger) trigger.disabled = false;
        }
    }

    async function load(body) {
        body.innerHTML = '<p class="cart-loading"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
        try {
            const res = await authFetch(`${API_BASE}/api/admin/orders/cart`);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Không tải được giỏ hàng.');
            canMarkPaid = !!data.canMarkPaid;
            const orders = Array.isArray(data.orders) ? data.orders : [];
            if (orders.length === 0) {
                body.innerHTML = '<p class="cart-empty">Chưa có đơn hàng nào.</p>';
                return;
            }
            body.innerHTML = orders.map((order) => {
                const methodLabel = order.payment_method ? PAYMENT[order.payment_method] || order.payment_method : '';
                const state = order.status === 'awaiting_payment' && methodLabel
                    ? { label: `Đã chọn ${methodLabel}`, cls: 'is-selected' }
                    : (STATUS[order.status] || { label: order.status, cls: '' });
                // Đơn của phiên chat ĐÃ ĐÓNG vẫn hiện: đó thường là đơn cần đối
                // chiếu nhất, và ẩn đi thì Agent tưởng nó biến mất.
                const closed = order.session_status !== 'active' ? '<span class="cart-closed">Chat đã đóng</span>' : '';
                return `
                <article class="cart-row ${state.cls}">
                    <div class="cart-row-head">
                        <strong class="cart-code">${escapeHtml(order.order_code || order.id)}</strong>
                        <span class="cart-status ${state.cls}">${state.label}</span>
                    </div>
                    <div class="cart-row-meta">
                        <span>${escapeHtml(order.qr_label || order.group_name || '—')}</span>
                        <span>${escapeHtml(order.visitor_name || order.visitor_email || 'Khách')}</span>
                        ${order.sale_name ? `<span>NV: ${escapeHtml(order.sale_name)}</span>` : ''}
                        ${closed}
                    </div>
                    <div class="cart-row-foot">
                        <span class="cart-pay">${order.payment_method ? escapeHtml(PAYMENT[order.payment_method] || order.payment_method) : 'Khách chưa chọn'}</span>
                        <strong class="cart-total">${money(order.total_amount)}</strong>
                    </div>
                    <div class="cart-row-time">Cập nhật: ${when(order.updated_at)}</div>
                    <div class="cart-row-actions">
                        <button type="button" class="cart-action-btn" data-bill="${escapeHtml(order.id)}"><i class="ri-file-list-3-line"></i> Xem bill</button>
                        <button type="button" class="cart-action-btn" data-details="${escapeHtml(order.id)}"><i class="ri-eye-line"></i> Chi tiết</button>
                        <button type="button" class="cart-action-btn is-primary" data-open="${escapeHtml(order.session_id)}"><i class="ri-chat-3-line"></i> Hội thoại</button>
                    </div>
                    ${canMarkPaid && order.status === 'awaiting_payment'
                        ? `<button type="button" class="cart-paid-btn" data-paid="${escapeHtml(order.id)}"><i class="ri-check-double-line"></i> Đã thanh toán</button>`
                        : ''}
                </article>`;
            }).join('');
        } catch (error) {
            body.innerHTML = `<p class="cart-error">${escapeHtml(error.message)}</p>`;
        }
    }

    async function openCart() {
        close();
        overlay = document.createElement('div');
        overlay.className = 'cart-overlay';
        overlay.innerHTML = `
            <div class="admin-management-box cart-box">
                <div class="admin-list-head">
                    <h3><i class="ri-shopping-basket-2-line"></i> Giỏ hàng</h3>
                    <button type="button" class="icon-btn cart-close" title="Đóng"><i class="ri-close-line"></i></button>
                </div>
                <div class="cart-body"></div>
            </div>`;
        document.body.appendChild(overlay);
        const body = overlay.querySelector('.cart-body');
        overlay.addEventListener('click', async (event) => {
            if (event.target === overlay || event.target.closest('.cart-close')) return close();

            const open = event.target.closest('[data-open]');
            if (open) {
                close();
                // Mở thẳng cuộc trò chuyện của đơn: từ giỏ hàng nhìn thấy mã đơn
                // rồi phải tự đi tìm chat là bước thừa trong lúc đang đông khách.
                // selectSession khai báo ở cấp cao nhất của chat.js. Các file
                // này nạp bằng thẻ <script> thường nên dùng chung phạm vi từ
                // vựng, NHƯNG hàm khai báo kiểu đó không gắn vào window —
                // window.selectSession là undefined.
                if (typeof selectSession === 'function') selectSession(open.dataset.open);
                return;
            }

            const bill = event.target.closest('[data-bill]');
            if (bill) {
                await openBill(bill.dataset.bill, bill);
                return;
            }

            const details = event.target.closest('[data-details]');
            if (details) {
                await showOrderDetails(details.dataset.details, details);
                return;
            }

            const paid = event.target.closest('[data-paid]');
            if (paid) {
                const row = paid.closest('.cart-row');
                const visibleCode = row?.querySelector('.cart-code')?.textContent?.trim() || paid.dataset.paid;
                const ok = await pastieConfirm(`Xác nhận đã nhận tiền của đơn ${visibleCode}? Khách và nhân viên trực sẽ thấy thông báo trong cuộc trò chuyện.`);
                if (!ok) return;
                paid.disabled = true;
                try {
                    const res = await authFetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(paid.dataset.paid)}/received-payment`, { method: 'POST' });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || 'Không xác nhận được.');
                    showToast('Đã ghi nhận thanh toán.', 'success');
                    await load(body);
                } catch (error) {
                    showToast(error.message, 'error');
                    paid.disabled = false;
                }
            }
        });
        await load(body);
    }

    // ── Thực đơn CHỈ XEM cho Sale ─────────────────────────────────────────
    //
    // Màn quản lý thực đơn của Agent nằm trong hộp "Sale & Nhóm" mà Sale không
    // được vào, và nó có nút thêm/sửa/xoá. Đây là bản đọc: Sale tra giá và tra
    // món còn hay hết để tư vấn, không đặt hộ khách được.
    let menuOverlay = null;
    const closeMenu = () => { menuOverlay?.remove(); menuOverlay = null; };

    async function openMenuViewer() {
        closeMenu();
        menuOverlay = document.createElement('div');
        menuOverlay.className = 'cart-overlay';
        menuOverlay.innerHTML = `
            <div class="admin-management-box cart-box">
                <div class="admin-list-head">
                    <h3><i class="ri-restaurant-line"></i> Thực đơn <small>(chỉ xem)</small></h3>
                    <button type="button" class="icon-btn cart-close" title="Đóng"><i class="ri-close-line"></i></button>
                </div>
                <div class="cart-body"><p class="cart-loading"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p></div>
            </div>`;
        document.body.appendChild(menuOverlay);
        menuOverlay.addEventListener('click', (event) => {
            if (event.target === menuOverlay || event.target.closest('.cart-close')) closeMenu();
        });
        const body = menuOverlay.querySelector('.cart-body');
        try {
            const res = await authFetch(`${API_BASE}/api/admin/menu/view`);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Không tải được thực đơn.');
            const items = Array.isArray(data.items) ? data.items : [];
            if (items.length === 0) {
                body.innerHTML = '<p class="cart-empty">Cơ sở chưa có món nào trong thực đơn.</p>';
                return;
            }
            const byCategory = new Map((data.categories || []).map((c) => [c.id, c.name]));
            body.innerHTML = `<div class="menu-view-list">${items.map((item) => `
                <div class="menu-view-row${item.sold_out || !item.is_available ? ' is-out' : ''}">
                    <div class="menu-view-main">
                        <strong>${escapeHtml(item.name)}</strong>
                        <small>${escapeHtml(byCategory.get(item.category_id) || 'Chưa phân nhóm')}</small>
                        ${item.description ? `<small class="menu-view-desc">${escapeHtml(item.description)}</small>` : ''}
                    </div>
                    <div class="menu-view-side">
                        <b>${money(item.price)}</b>
                        ${!item.is_available ? '<span class="menu-view-tag">Đang tắt</span>'
                          : item.sold_out ? '<span class="menu-view-tag">Tạm hết</span>' : ''}
                    </div>
                </div>`).join('')}</div>`;
        } catch (error) {
            body.innerHTML = `<p class="cart-error">${escapeHtml(error.message)}</p>`;
        }
    }

    window.OrderCart = { open: openCart, close };
    window.StaffMenuView = { open: openMenuViewer, close: closeMenu };
})();
