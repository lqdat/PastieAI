// Quản lý bill: đơn của khách theo từng cuộc trò chuyện, gom theo cơ sở.
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
            if (!res.ok) throw new Error(data?.error || 'Không tải được danh sách bill.');
            canMarkPaid = !!data.canMarkPaid;
            const orders = Array.isArray(data.orders) ? data.orders : [];
            if (orders.length === 0) {
                body.innerHTML = '<p class="cart-empty">Chưa có đơn hàng nào.</p>';
                return;
            }
            // Gom nhóm theo NGƯỜI ĐANG NHÌN, không theo một quy tắc cố định:
            //   Superadmin — theo CƠ SỞ, vì họ nhìn đơn của nhiều quán cùng lúc.
            //   Agent, Sale — theo ĐOẠN HỘI THOẠI, vì cả màn hình vốn chỉ có một
            //                 cơ sở; thứ họ cần tách là "bàn nào, khách nào".
            const byVenue = CURRENT_ADMIN?.role === 'superadmin';
            const groups = new Map();
            for (const order of orders) {
                const key = byVenue
                    ? (order.agent_name || 'Chưa xác định cơ sở')
                    : [order.qr_label || order.group_name || 'Chưa rõ chỗ ngồi',
                       order.visitor_name || order.visitor_email || 'Khách'].join(' · ');
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(order);
            }
            const renderOrder = (order) => {
                // MỘT trạng thái duy nhất, và một dòng "cách trả" riêng.
                //
                // Trước đây có hai nhãn cùng lúc: "Chờ thanh toán" (theo cột
                // status) và "Chưa thu tiền" (suy ra từ chính cột đó). Hai nhãn
                // nói đúng một chuyện, dán cạnh nhau chỉ làm người đọc phân vân
                // là chúng khác nhau ở đâu.
                //
                // Cách trả KHÔNG phải trạng thái: đó là dữ kiện khách đã chọn,
                // nên nó ở dòng riêng bên dưới chứ không đứng thành nhãn thứ hai.
                const methodLabel = order.payment_method ? PAYMENT[order.payment_method] || order.payment_method : '';
                const state = order.status === 'paid'
                    ? { label: 'Đã thu tiền', cls: 'is-paid' }
                    : order.status === 'awaiting_payment'
                        ? (methodLabel
                            ? { label: 'Chưa thu tiền', cls: 'is-awaiting' }
                            : { label: 'Khách chưa chọn cách trả', cls: 'is-awaiting' })
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
                        ${byVenue ? `<span>${escapeHtml(order.qr_label || order.group_name || '—')}</span>
                        <span>${escapeHtml(order.visitor_name || order.visitor_email || 'Khách')}</span>` : ''}
                        ${order.sale_name ? `<span>NV: ${escapeHtml(order.sale_name)}</span>` : ''}
                        ${closed}
                    </div>
                    <div class="cart-row-pay">
                        <span class="cart-pay-line"><i class="ri-bank-card-line"></i> Cách trả: <b>${methodLabel ? escapeHtml(methodLabel) : 'Khách chưa chọn'}</b></span>
                    </div>
                    <div class="cart-row-foot">
                        <span class="cart-pay">Tổng cộng</span>
                        <strong class="cart-total">${money(order.total_amount)}</strong>
                    </div>
                    <div class="cart-row-time">Cập nhật: ${when(order.updated_at)}</div>
                    <div class="cart-row-actions">
                        <button type="button" class="cart-action-btn" data-bill="${escapeHtml(order.id)}"><i class="ri-file-list-3-line"></i> Xem bill</button>
                        <button type="button" class="cart-action-btn" data-details="${escapeHtml(order.id)}"><i class="ri-eye-line"></i> Chi tiết</button>
                        <button type="button" class="cart-action-btn is-primary" data-open="${escapeHtml(order.session_id)}"><i class="ri-chat-3-line"></i> Hội thoại</button>
                    </div>
                    ${canMarkPaid && order.status === 'awaiting_payment' && order.payment_method
                        ? `<button type="button" class="cart-paid-btn" data-paid="${escapeHtml(order.id)}"><i class="ri-check-double-line"></i> Đã thanh toán</button>`
                        : (canMarkPaid && order.status === 'awaiting_payment'
                            ? '<p class="cart-paid-hint">Chờ khách chọn cách trả rồi mới xác nhận được đã thu tiền.</p>'
                            : '')}
                </article>`;
            };
            body.innerHTML = [...groups].map(([venue, list]) => {
                const total = list.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
                return `
                <section class="cart-group">
                    <header class="cart-group-head">
                        <h4>${escapeHtml(venue)}</h4>
                        <span>${list.length} đơn · ${money(total)}</span>
                    </header>
                    ${list.map(renderOrder).join('')}
                </section>`;
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
                    <h3><i class="ri-bill-line"></i> Quản lý bill</h3>
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

    // Dựng theo ĐÚNG khuôn thực đơn của khách: ảnh món, nhóm món thành hàng
    // thẻ lọc, mô tả và giá y hệt. Sale tư vấn cho khách đang nhìn màn hình kia,
    // hai bên thấy hai bố cục khác nhau là chỗ dễ chỉ nhầm món nhất.
    //
    // Khác duy nhất: không có nút "+" và không có thanh giỏ hàng — Sale tra
    // thông tin, không đặt hộ khách.
    let menuState = { items: [], categories: new Map(), active: 'all', search: '' };

    function menuViewCards() {
        const term = menuState.search.trim().toLowerCase();
        const list = menuState.items.filter((item) => {
            if (menuState.active !== 'all' && String(item.category_id) !== menuState.active) return false;
            if (!term) return true;
            return `${item.name} ${item.description || ''}`.toLowerCase().includes(term);
        });
        if (list.length === 0) return '<p class="cart-empty">Không có món nào khớp.</p>';
        return `<div class="staff-menu-grid">${list.map((item) => `
            <article class="staff-menu-card${item.sold_out || !item.is_available ? ' is-out' : ''}">
                <div class="staff-menu-thumb">
                    ${item.image_url
                        ? `<img src="${escapeHtml(item.image_url)}" alt="" loading="lazy">`
                        : '<span aria-hidden="true">🍜</span>'}
                </div>
                <div class="staff-menu-copy">
                    <strong>${escapeHtml(item.name)}</strong>
                    ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ''}
                    <b>${money(item.price)}</b>
                </div>
                ${!item.is_available ? '<span class="staff-menu-tag">Đang tắt</span>'
                  : item.sold_out ? '<span class="staff-menu-tag">Tạm hết</span>' : ''}
            </article>`).join('')}</div>`;
    }

    function menuViewTabs() {
        const tabs = [['all', 'Tất cả'], ...[...menuState.categories].map(([id, name]) => [String(id), name])];
        return tabs.map(([key, label]) => `
            <button type="button" class="staff-menu-tab${menuState.active === key ? ' is-active' : ''}"
                    data-menu-cat="${escapeHtml(key)}">${escapeHtml(label)}</button>`).join('');
    }

    function paintMenuView() {
        const tabs = menuOverlay?.querySelector('.staff-menu-tabs');
        const list = menuOverlay?.querySelector('.staff-menu-list');
        if (tabs) tabs.innerHTML = menuViewTabs();
        if (list) list.innerHTML = menuViewCards();
    }

    async function openMenuViewer() {
        closeMenu();
        menuState = { items: [], categories: new Map(), active: 'all', search: '' };
        menuOverlay = document.createElement('div');
        menuOverlay.className = 'cart-overlay staff-menu-overlay';
        menuOverlay.innerHTML = `
            <div class="staff-menu-sheet">
                <header class="staff-menu-hero">
                    <div class="staff-menu-mark"><i class="ri-restaurant-2-line"></i></div>
                    <div class="staff-menu-title">
                        <h3>Thực đơn</h3>
                        <span>Chỉ xem — dùng để tư vấn khách</span>
                    </div>
                    <button type="button" class="icon-btn cart-close" title="Đóng"><i class="ri-close-line"></i></button>
                </header>
                <div class="staff-menu-search">
                    <i class="ri-search-line"></i>
                    <input type="search" placeholder="Tìm món…" aria-label="Tìm món">
                </div>
                <nav class="staff-menu-tabs"></nav>
                <div class="staff-menu-list"><p class="cart-loading"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p></div>
            </div>`;
        document.body.appendChild(menuOverlay);
        menuOverlay.addEventListener('click', (event) => {
            if (event.target === menuOverlay || event.target.closest('.cart-close')) return void closeMenu();
            const tab = event.target.closest('[data-menu-cat]');
            if (tab) { menuState.active = tab.dataset.menuCat; paintMenuView(); }
        });
        menuOverlay.querySelector('input[type="search"]')?.addEventListener('input', (event) => {
            menuState.search = event.target.value || '';
            const list = menuOverlay?.querySelector('.staff-menu-list');
            if (list) list.innerHTML = menuViewCards();
        });

        const list = menuOverlay.querySelector('.staff-menu-list');
        try {
            const res = await authFetch(`${API_BASE}/api/admin/menu/view`);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Không tải được thực đơn.');
            menuState.items = Array.isArray(data.items) ? data.items : [];
            // Chỉ liệt kê nhóm CÓ MÓN: một hàng thẻ lọc bấm vào ra danh sách
            // rỗng thì thà đừng có thẻ đó.
            const used = new Set(menuState.items.map((item) => String(item.category_id)));
            for (const category of (data.categories || [])) {
                if (used.has(String(category.id))) menuState.categories.set(category.id, category.name);
            }
            if (menuState.items.length === 0) {
                list.innerHTML = '<p class="cart-empty">Cơ sở chưa có món nào trong thực đơn.</p>';
                return;
            }
            paintMenuView();
        } catch (error) {
            list.innerHTML = `<p class="cart-error">${escapeHtml(error.message)}</p>`;
        }
    }

    window.OrderCart = { open: openCart, close };
    window.StaffMenuView = { open: openMenuViewer, close: closeMenu };
})();
