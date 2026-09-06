// Giỏ hàng: đơn của khách theo từng cuộc trò chuyện.
//
// Sale thấy đơn của chat mình tiếp nhận; Agent thấy cả cơ sở. Chỉ Agent và
// Superadmin bấm được "Đã thanh toán" — đó là xác nhận ĐÃ CÓ TIỀN, không phải
// một bước thao tác của người phục vụ bàn; máy chủ quyết định bằng cờ
// canMarkPaid chứ không để giao diện tự suy ra từ vai trò.
(function () {
    let overlay = null;
    let canMarkPaid = false;

    const STATUS = {
        pending_confirm: { label: 'Chờ xác nhận', cls: 'is-pending' },
        awaiting_payment: { label: 'Chờ thanh toán', cls: 'is-awaiting' },
        paid: { label: 'Đã thanh toán', cls: 'is-paid' },
        superseded: { label: 'Đã thay bản mới', cls: 'is-muted' },
        rejected: { label: 'Đã từ chối', cls: 'is-muted' },
    };
    const PAYMENT = { cash: 'Tiền mặt', bank_qr: 'Chuyển khoản QR', card: 'Thẻ', room_charge: 'Cộng tiền phòng', defer: 'Thanh toán sau' };
    const money = (value) => Number(value || 0).toLocaleString('vi-VN') + ' ₫';
    const when = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

    function close() {
        overlay?.remove();
        overlay = null;
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
                const state = STATUS[order.status] || { label: order.status, cls: '' };
                // Đơn của phiên chat ĐÃ ĐÓNG vẫn hiện: đó thường là đơn cần đối
                // chiếu nhất, và ẩn đi thì Agent tưởng nó biến mất.
                const closed = order.session_status !== 'active' ? '<span class="cart-closed">Chat đã đóng</span>' : '';
                return `
                <article class="cart-row ${state.cls}">
                    <div class="cart-row-head">
                        <button type="button" class="cart-code" data-open="${escapeHtml(order.session_id)}"
                                title="Mở cuộc trò chuyện của đơn này">${escapeHtml(order.order_code || order.id)}</button>
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
