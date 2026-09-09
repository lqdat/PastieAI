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

    function editItemDialog(item) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-card" role="dialog" aria-modal="true" style="max-width:380px;">
                    <h3 class="confirm-title">Sửa giá &amp; số lượng món</h3>
                    <p style="margin:4px 0 12px;font-size:13px;font-weight:600;color:var(--accent-color);">${escapeHtml(item.name || '')}</p>
                    <div style="display:grid;gap:10px;margin-bottom:14px;text-align:left;">
                        <label style="font-size:12px;display:grid;gap:4px;">
                            <span>Đơn giá (₫):</span>
                            <input type="number" id="edit-item-price" min="0" step="1000" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(84,62,100,.2);" value="${Number(item.unitPrice || 0)}">
                        </label>
                        <label style="font-size:12px;display:grid;gap:4px;">
                            <span>Số lượng:</span>
                            <input type="number" id="edit-item-qty" min="1" max="99" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(84,62,100,.2);" value="${Number(item.quantity || 1)}">
                        </label>
                        <label style="font-size:12px;display:grid;gap:4px;">
                            <span>Ghi chú thêm:</span>
                            <input type="text" id="edit-item-note" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(84,62,100,.2);" value="${escapeHtml(String(item.note || '').replace(/^\(|\)$/g, ''))}">
                        </label>
                    </div>
                    <div class="confirm-actions">
                        <button type="button" class="confirm-cancel">Huỷ</button>
                        <button type="button" class="confirm-ok" style="background:var(--accent-color);color:#fff;border:none;">Lưu</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            const close = (res) => { overlay.remove(); resolve(res); };
            overlay.querySelector('.confirm-cancel').onclick = () => close(null);
            overlay.querySelector('.confirm-ok').onclick = () => {
                const price = Number(overlay.querySelector('#edit-item-price').value);
                const qty = Number(overlay.querySelector('#edit-item-qty').value);
                const note = overlay.querySelector('#edit-item-note').value.trim();
                close({ price, quantity: qty, note });
            };
        });
    }

    function addItemDialog() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-card" role="dialog" aria-modal="true" style="max-width:380px;">
                    <h3 class="confirm-title">Thêm món vào bill</h3>
                    <div style="display:grid;gap:10px;margin:12px 0 14px;text-align:left;">
                        <label style="font-size:12px;display:grid;gap:4px;">
                            <span>Tên món *:</span>
                            <input type="text" id="add-item-name" required placeholder="Ví dụ: Cơm chiên hải sản" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(84,62,100,.2);">
                        </label>
                        <label style="font-size:12px;display:grid;gap:4px;">
                            <span>Đơn giá (₫) *:</span>
                            <input type="number" id="add-item-price" min="0" step="1000" placeholder="Ví dụ: 85000" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(84,62,100,.2);">
                        </label>
                        <label style="font-size:12px;display:grid;gap:4px;">
                            <span>Số lượng *:</span>
                            <input type="number" id="add-item-qty" min="1" max="99" value="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(84,62,100,.2);">
                        </label>
                        <label style="font-size:12px;display:grid;gap:4px;">
                            <span>Ghi chú:</span>
                            <input type="text" id="add-item-note" placeholder="Ví dụ: Ít cay, thêm đá" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid rgba(84,62,100,.2);">
                        </label>
                    </div>
                    <div class="confirm-actions">
                        <button type="button" class="confirm-cancel">Huỷ</button>
                        <button type="button" class="confirm-ok" style="background:var(--accent-color);color:#fff;border:none;">Thêm món</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            const close = (res) => { overlay.remove(); resolve(res); };
            overlay.querySelector('.confirm-cancel').onclick = () => close(null);
            overlay.querySelector('.confirm-ok').onclick = () => {
                const name = overlay.querySelector('#add-item-name').value.trim();
                const price = Number(overlay.querySelector('#add-item-price').value);
                const qty = Number(overlay.querySelector('#add-item-qty').value);
                const note = overlay.querySelector('#add-item-note').value.trim();
                if (!name) { alert('Vui lòng nhập tên món.'); return; }
                if (isNaN(price) || price < 0) { alert('Vui lòng nhập đơn giá hợp lệ.'); return; }
                close({ name, unitPrice: price, quantity: qty || 1, note });
            };
        });
    }

    function choosePaymentMethodDialog(currentMethod) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-card" role="dialog" aria-modal="true" style="max-width:360px;">
                    <h3 class="confirm-title">Xác nhận thu tiền</h3>
                    <p style="margin:6px 0 12px;font-size:13px;color:var(--text-secondary);">Vui lòng chọn hình thức thanh toán:</p>
                    <div style="display:grid;gap:8px;margin-bottom:16px;">
                        <label style="display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid rgba(84,62,100,.15);border-radius:10px;cursor:pointer;">
                            <input type="radio" name="pay-method" value="cash" ${!currentMethod || currentMethod === 'cash' ? 'checked' : ''}>
                            <span>💵 Tiền mặt</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid rgba(84,62,100,.15);border-radius:10px;cursor:pointer;">
                            <input type="radio" name="pay-method" value="bank_transfer" ${currentMethod === 'bank_transfer' ? 'checked' : ''}>
                            <span>🏦 Chuyển khoản</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid rgba(84,62,100,.15);border-radius:10px;cursor:pointer;">
                            <input type="radio" name="pay-method" value="credit_card" ${currentMethod === 'credit_card' ? 'checked' : ''}>
                            <span>💳 Quẹt thẻ</span>
                        </label>
                    </div>
                    <div class="confirm-actions">
                        <button type="button" class="confirm-cancel">Huỷ</button>
                        <button type="button" class="confirm-ok" style="background:#059669;color:#fff;border:none;">Xác nhận đã thu</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            const close = (val) => { overlay.remove(); resolve(val); };
            overlay.querySelector('.confirm-cancel').onclick = () => close(null);
            overlay.querySelector('.confirm-ok').onclick = () => {
                const selected = overlay.querySelector('input[name="pay-method"]:checked')?.value || 'cash';
                close(selected);
            };
        });
    }

    async function showOrderDetails(orderId, trigger) {
        if (trigger) trigger.disabled = true;
        try {
            const order = await fetchOrderDetails(orderId);
            let draftItems = Array.isArray(order.items) ? JSON.parse(JSON.stringify(order.items)) : [];
            const charges = order.charges || {};
            let draftVatRate = charges.vatRate != null ? Number(charges.vatRate) : 10;
            let isDirty = false;
            let isSaving = false;
            let isSending = false;

            const payment = order.payment_method ? PAYMENT[order.payment_method] || order.payment_method : 'Khách chưa chọn';
            const canEdit = (CURRENT_ADMIN?.role === 'agent' || CURRENT_ADMIN?.role === 'superadmin' || CURRENT_ADMIN?.role === 'admin') && order.status !== 'paid';

            function recalculateCharges() {
                const subtotal = draftItems.reduce((acc, it) => acc + (Number(it.lineTotal != null ? it.lineTotal : Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
                const vatAmount = Math.round(subtotal * draftVatRate / 100);
                const totalAmount = subtotal + vatAmount;
                return { subtotal, vatRate: draftVatRate, vatAmount, totalAmount };
            }

            function renderDraftItemsHtml() {
                if (!draftItems.length) {
                    return '<p class="cart-empty" style="padding:16px;text-align:center;">Đơn chưa có món.</p>';
                }
                return draftItems.map((item, index) => `
                    <div class="order-detail-item" data-item-idx="${index}">
                        <div class="order-item-info">
                            <strong>${escapeHtml(item.name || 'Món')}</strong>
                            ${item.note ? `<small class="item-note" style="font-style:italic;color:#7a6880;"><em>(${escapeHtml(String(item.note).replace(/^\(|\)$/g, ''))})</em></small>` : ''}
                        </div>
                        <span class="order-item-qty">×${Number(item.quantity || 0)}</span>
                        <b class="order-item-total">${money(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0))}</b>
                        ${canEdit ? `
                        <div class="order-item-actions">
                            <button type="button" class="icon-btn edit-item-btn" data-edit-item="${index}" title="Sửa giá / SL" style="width:28px;height:28px;font-size:13px;padding:0;"><i class="ri-edit-line"></i></button>
                            <button type="button" class="icon-btn del-item-btn" data-del-item="${index}" title="Xóa món" style="width:28px;height:28px;font-size:13px;padding:0;color:#ef4444;"><i class="ri-delete-bin-line"></i></button>
                        </div>` : ''}
                    </div>`).join('');
            }

            function updateSummaryHtml() {
                const calc = recalculateCharges();
                const summaryEl = detailOverlay?.querySelector('.order-detail-summary');
                if (summaryEl) {
                    summaryEl.innerHTML = `
                        <span>Tạm tính <b>${money(calc.subtotal)}</b></span>
                        <span>VAT (${Number(calc.vatRate)}%)
                            ${canEdit ? `<button type="button" class="icon-btn" id="order-edit-vat-btn" title="Đổi % VAT" style="width:20px;height:20px;font-size:11px;padding:0;margin-left:4px;"><i class="ri-edit-line"></i></button>` : ''}
                            <b>${money(calc.vatAmount)}</b>
                        </span>
                        <span class="is-total">Tổng cộng <b>${money(calc.totalAmount)}</b></span>
                    `;
                }
                const saveStatusEl = detailOverlay?.querySelector('#order-save-status-wrap');
                if (saveStatusEl) {
                    saveStatusEl.innerHTML = isDirty
                        ? `<span class="order-save-status"><i class="ri-alert-line"></i> Có thay đổi chưa lưu</span>`
                        : `<span class="order-save-status is-saved"><i class="ri-checkbox-circle-line"></i> Đã lưu</span>`;
                }
                const saveBtn = detailOverlay?.querySelector('#order-save-bill-btn');
                if (saveBtn) {
                    saveBtn.classList.toggle('primary-btn', isDirty);
                    saveBtn.classList.toggle('secondary-btn', !isDirty);
                    saveBtn.style.background = isDirty ? 'var(--accent-color)' : '';
                    saveBtn.style.color = isDirty ? '#fff' : '';
                    saveBtn.innerHTML = isSaving
                        ? `<i class="ri-loader-4-line ri-spin"></i> Đang lưu…`
                        : (isDirty ? `<i class="ri-save-line"></i> <strong>Lưu thay đổi</strong>` : `<i class="ri-check-line"></i> Đã lưu`);
                }
            }

            function refreshDraftView() {
                const itemsContainer = detailOverlay?.querySelector('.order-detail-items');
                if (itemsContainer) {
                    itemsContainer.innerHTML = renderDraftItemsHtml();
                }
                updateSummaryHtml();
            }

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
                            <span><i class="ri-user-star-line"></i>Sale tiếp nhận: <strong>${escapeHtml(order.sale_name || 'Chưa tiếp nhận')}</strong></span>
                        </div>
                        <div class="order-detail-items">
                            ${renderDraftItemsHtml()}
                        </div>
                        ${canEdit ? `
                        <div style="padding:6px 0;display:flex;gap:8px;align-items:center;">
                            <button type="button" class="secondary-btn" id="order-add-item-btn" style="flex:1;padding:8px;font-size:12.5px;"><i class="ri-add-line"></i> Thêm món vào bill</button>
                            <div id="order-save-status-wrap">
                                <span class="order-save-status is-saved"><i class="ri-checkbox-circle-line"></i> Đã lưu</span>
                            </div>
                        </div>` : ''}
                        <div class="order-detail-summary">
                            <span>Tạm tính <b>${money(charges.subtotal ?? order.total_amount)}</b></span>
                            <span>VAT (${Number(charges.vatRate || 0)}%)
                                ${canEdit ? `<button type="button" class="icon-btn" id="order-edit-vat-btn" title="Đổi % VAT" style="width:20px;height:20px;font-size:11px;padding:0;margin-left:4px;"><i class="ri-edit-line"></i></button>` : ''}
                                <b>${money(charges.vatAmount || 0)}</b>
                            </span>
                            <span class="is-total">Tổng cộng <b>${money(order.total_amount)}</b></span>
                        </div>
                        <div class="order-detail-history"></div>
                        <div class="order-detail-actions">
                            <button type="button" class="secondary-btn" data-open="${escapeHtml(order.session_id)}"><i class="ri-chat-3-line"></i> Đến hội thoại</button>
                            <button type="button" class="secondary-btn" data-bill="${escapeHtml(order.id)}"><i class="ri-file-list-3-line"></i> Xem bill</button>
                            ${canEdit ? `
                                <button type="button" class="secondary-btn is-full-width" id="order-save-bill-btn"><i class="ri-save-line"></i> Lưu thay đổi</button>
                                <button type="button" class="primary-btn is-full-width is-resend-bill" id="order-send-bill-btn" data-order-id="${escapeHtml(order.id)}" style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;"><i class="ri-send-plane-fill"></i> Gửi lại bill cho khách</button>
                            ` : ''}
                            ${canMarkPaid && order.status === 'awaiting_payment' ? `<button type="button" class="cart-paid-btn is-full-width" data-paid="${escapeHtml(order.id)}" data-method="${escapeHtml(order.payment_method || '')}"><i class="ri-check-double-line"></i> Xác nhận đã thu tiền</button>` : ''}
                        </div>
                    </div>
                </section>`;
            document.body.appendChild(detailOverlay);
            // Tải lịch sử đơn hàng
            void loadOrderHistory(order).then((history) => {
                const host = detailOverlay?.querySelector('.order-detail-history');
                if (host) host.innerHTML = orderHistoryHtml(history);
            });
            detailOverlay.addEventListener('click', async (event) => {
                if (event.target === detailOverlay || event.target.closest('.detail-close')) {
                    if (isDirty) {
                        const leave = await pastieConfirm('Bạn có thay đổi chưa lưu trên bill. Bạn có chắc muốn đóng mà không lưu?', { title: 'Thay đổi chưa lưu', confirmText: 'Đóng không lưu', danger: true });
                        if (!leave) return;
                    }
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
                if (bill) {
                    await openBill(bill.dataset.bill, bill);
                    return;
                }

                const delBtn = event.target.closest('[data-del-item]');
                if (delBtn) {
                    const idx = Number(delBtn.dataset.delItem);
                    const it = draftItems[idx];
                    const ok = await pastieConfirm(`Xóa món "${it?.name || 'này'}" khỏi bill?`, { title: 'Xóa món khỏi bill', confirmText: 'Xóa', danger: true });
                    if (!ok) return;
                    draftItems = draftItems.filter((_, i) => i !== idx);
                    isDirty = true;
                    refreshDraftView();
                    showToast('Đã xóa món. Vui lòng bấm "Lưu thay đổi" để lưu vào bill.');
                    return;
                }

                const editBtn = event.target.closest('[data-edit-item]');
                if (editBtn) {
                    const idx = Number(editBtn.dataset.editItem);
                    const it = draftItems[idx];
                    const result = await editItemDialog(it);
                    if (!result) return;
                    draftItems = draftItems.map((oldIt, i) => {
                        if (i !== idx) return oldIt;
                        return {
                            ...oldIt,
                            unitPrice: result.price,
                            quantity: result.quantity,
                            lineTotal: result.price * result.quantity,
                            note: result.note || oldIt.note
                        };
                    });
                    isDirty = true;
                    refreshDraftView();
                    showToast('Đã sửa món. Vui lòng bấm "Lưu thay đổi" để lưu vào bill.');
                    return;
                }

                const addBtn = event.target.closest('#order-add-item-btn');
                if (addBtn) {
                    const result = await addItemDialog();
                    if (!result) return;
                    draftItems.push({
                        ...result,
                        lineTotal: Number(result.unitPrice || 0) * Number(result.quantity || 1)
                    });
                    isDirty = true;
                    refreshDraftView();
                    showToast('Đã thêm món vào danh sách. Vui lòng bấm "Lưu thay đổi" để hoàn tất.');
                    return;
                }

                const editVatBtn = event.target.closest('#order-edit-vat-btn');
                if (editVatBtn) {
                    const input = prompt('Nhập thuế VAT mới (%) (0 - 100):', String(draftVatRate));
                    if (input === null) return;
                    const newVat = Number(input);
                    if (isNaN(newVat) || newVat < 0 || newVat > 100) {
                        alert('Thuế VAT không hợp lệ.');
                        return;
                    }
                    draftVatRate = newVat;
                    isDirty = true;
                    refreshDraftView();
                    showToast('Đã đổi mức VAT. Vui lòng bấm "Lưu thay đổi" để hoàn tất.');
                    return;
                }

                const saveBillBtn = event.target.closest('#order-save-bill-btn');
                if (saveBillBtn) {
                    if (isSaving) return;
                    isSaving = true;
                    updateSummaryHtml();
                    try {
                        const res = await authFetch(`${API_BASE}/api/admin/orders/${order.id}/agent-items`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ items: draftItems, vatRate: draftVatRate, sendBill: false })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Không thể lưu thay đổi.');
                        isDirty = false;
                        showToast('Đã lưu thay đổi vào bill! Bạn có thể bấm "Gửi lại bill cho khách".', 'success');
                    } catch (e) {
                        showToast(e.message, 'error');
                    } finally {
                        isSaving = false;
                        updateSummaryHtml();
                    }
                    return;
                }

                const sendBillBtn = event.target.closest('#order-send-bill-btn');
                if (sendBillBtn) {
                    if (isDirty) {
                        const wantSaveAndSend = await pastieConfirm(
                            'Bạn có thay đổi chưa lưu trên bill. Bạn cần lưu thay đổi trước khi gửi lại cho khách.\n\nLưu thay đổi và gửi lại bill ngay?',
                            { title: 'Lưu và gửi lại bill', confirmText: 'Lưu & Gửi ngay', cancelText: 'Xem lại' }
                        );
                        if (!wantSaveAndSend) return;
                    }
                    if (isSending) return;
                    isSending = true;
                    sendBillBtn.disabled = true;
                    sendBillBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang gửi lại bill…`;
                    try {
                        const res = await authFetch(`${API_BASE}/api/admin/orders/${order.id}/agent-items`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ items: draftItems, vatRate: draftVatRate, sendBill: true })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Không thể gửi lại bill.');
                        isDirty = false;
                        showToast('Đã lưu và gửi lại bill mới nhất cho khách thành công!', 'success');
                        await showOrderDetails(order.id);
                    } catch (e) {
                        showToast(e.message, 'error');
                        sendBillBtn.disabled = false;
                        sendBillBtn.innerHTML = `<i class="ri-send-plane-fill"></i> Gửi lại bill cho khách`;
                    } finally {
                        isSending = false;
                    }
                    return;
                }
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
                const canEdit = (CURRENT_ADMIN?.role === 'agent' || CURRENT_ADMIN?.role === 'superadmin' || CURRENT_ADMIN?.role === 'admin') && order.status !== 'paid';
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
                        <button type="button" class="cart-action-btn" data-details="${escapeHtml(order.id)}"><i class="${canEdit ? 'ri-edit-line' : 'ri-eye-line'}"></i> ${canEdit ? 'Sửa bill' : 'Chi tiết'}</button>
                        <button type="button" class="cart-action-btn is-primary" data-open="${escapeHtml(order.session_id)}"><i class="ri-chat-3-line"></i> Hội thoại</button>
                    </div>
                    ${order.status === 'paid'
                        ? `<div class="cart-paid-status" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#059669;margin-top:6px;"><i class="ri-checkbox-circle-fill"></i> Đã thanh toán (${escapeHtml(methodLabel || 'Tiền mặt')})</div>`
                        : (canMarkPaid && order.status === 'awaiting_payment'
                            ? `<button type="button" class="cart-paid-btn" data-paid="${escapeHtml(order.id)}" data-method="${escapeHtml(order.payment_method || '')}"><i class="ri-check-double-line"></i> Xác nhận đã thu tiền</button>`
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
                const currentMethod = paid.dataset.method || '';
                const selectedMethod = await choosePaymentMethodDialog(currentMethod);
                if (!selectedMethod) return;
                paid.disabled = true;
                try {
                    const res = await authFetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(paid.dataset.paid)}/received-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paymentMethod: selectedMethod })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || 'Không xác nhận được.');
                    showToast('Đã ghi nhận thanh toán.', 'success');
                    if (detailOverlay) { detailOverlay.remove(); detailOverlay = null; }
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
    let menuState = { items: [], promoItems: [], categories: new Map(), active: 'all', search: '' };

    function renderStaffCard(item, isPromoRail = false) {
        const out = item.sold_out || !item.is_available;
        return `
            <article class="${isPromoRail ? 'staff-promo-card' : 'staff-menu-card'}${out ? ' is-out' : ''}">
                <div class="${isPromoRail ? 'staff-promo-thumb' : 'staff-menu-thumb'}">
                    ${item.image_url
                        ? `<img src="${escapeHtml(item.image_url)}" alt="" loading="lazy">`
                        : '<span aria-hidden="true">🍜</span>'}
                    ${item.is_promo ? '<em class="staff-promo-pill">✦ Ưu đãi</em>' : ''}
                </div>
                <div class="${isPromoRail ? 'staff-promo-copy' : 'staff-menu-copy'}">
                    <strong>${escapeHtml(item.name)}</strong>
                    ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ''}
                    <b>${money(item.price)}</b>
                </div>
                ${!item.is_available ? '<span class="staff-menu-tag">Đang tắt</span>'
                  : item.sold_out ? '<span class="staff-menu-tag">Tạm hết</span>' : ''}
            </article>`;
    }

    function menuViewCards() {
        const term = menuState.search.trim().toLowerCase();
        const matchesTerm = (item) => {
            if (!term) return true;
            return `${item.name} ${item.description || ''}`.toLowerCase().includes(term);
        };

        let html = '';

        // 1. Dải ưu đãi nổi bật ở trên cùng (khi ở tab "Tất cả" hoặc tab "Ưu đãi")
        const filteredPromos = menuState.promoItems.filter(matchesTerm);
        if (filteredPromos.length > 0 && (menuState.active === 'all' || menuState.active === 'promo')) {
            html += `
                <section class="staff-promo-strip">
                    <div class="staff-menu-group-header promo-heading">
                        <h4><i class="ri-fire-fill" style="color:#ef2b9d;"></i> Ưu đãi nổi bật</h4>
                        <span>${filteredPromos.length} món</span>
                    </div>
                    <div class="staff-promo-rail">
                        ${filteredPromos.map((item) => renderStaffCard(item, true)).join('')}
                    </div>
                </section>`;
        }

        // 2. Nếu đang chọn tab "Ưu đãi"
        if (menuState.active === 'promo') {
            if (filteredPromos.length === 0) {
                return '<p class="cart-empty">Không có món ưu đãi nào khớp.</p>';
            }
            return html;
        }

        // 3. Nếu đang chọn tab cụ thể một Category
        if (menuState.active !== 'all') {
            const catName = menuState.categories.get(menuState.active) || 'Nhóm món';
            const list = menuState.items.filter((item) => String(item.category_id) === menuState.active && matchesTerm(item));
            if (list.length === 0) {
                return '<p class="cart-empty">Không có món nào trong nhóm này.</p>';
            }
            return `
                <section class="staff-menu-group">
                    <div class="staff-menu-group-header">
                        <h4>${escapeHtml(catName)}</h4>
                        <span>${list.length} món</span>
                    </div>
                    <div class="staff-menu-grid">
                        ${list.map((item) => renderStaffCard(item)).join('')}
                    </div>
                </section>`;
        }

        // 4. Tab "Tất cả": Gom theo từng Category (group nhóm giống như menu khách)
        let totalRendered = 0;
        for (const [catId, catName] of menuState.categories) {
            const catItems = menuState.items.filter((item) => String(item.category_id) === String(catId) && matchesTerm(item));
            if (catItems.length > 0) {
                totalRendered += catItems.length;
                html += `
                    <section class="staff-menu-group">
                        <div class="staff-menu-group-header">
                            <h4>${escapeHtml(catName)}</h4>
                            <span>${catItems.length} món</span>
                        </div>
                        <div class="staff-menu-grid">
                            ${catItems.map((item) => renderStaffCard(item)).join('')}
                        </div>
                    </section>`;
            }
        }

        // Món không thuộc nhóm nào
        const uncategorized = menuState.items.filter((item) => !item.category_id && matchesTerm(item));
        if (uncategorized.length > 0) {
            totalRendered += uncategorized.length;
            html += `
                <section class="staff-menu-group">
                    <div class="staff-menu-group-header">
                        <h4>Món khác</h4>
                        <span>${uncategorized.length} món</span>
                    </div>
                    <div class="staff-menu-grid">
                        ${uncategorized.map((item) => renderStaffCard(item)).join('')}
                    </div>
                </section>`;
        }

        if (totalRendered === 0 && filteredPromos.length === 0) {
            return '<p class="cart-empty">Không có món nào khớp.</p>';
        }

        return html;
    }

    function menuViewTabs() {
        const tabs = [['all', 'Tất cả']];
        if (menuState.promoItems.length > 0) {
            tabs.push(['promo', '✦ Ưu đãi']);
        }
        for (const [id, name] of menuState.categories) {
            tabs.push([String(id), name]);
        }
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
        menuState = { items: [], promoItems: [], categories: new Map(), active: 'all', search: '' };
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
            const customName = data.menuCustomLabel || '';
            if (customName) {
                const titleEl = menuOverlay?.querySelector('.staff-menu-title h3');
                if (titleEl) titleEl.textContent = customName;
                const saleBtn = document.querySelector('#sale-menu-btn span');
                if (saleBtn) saleBtn.textContent = customName;
            }
            menuState.items = Array.isArray(data.items) ? data.items : [];
            menuState.promoItems = Array.isArray(data.promoItems)
                ? data.promoItems
                : menuState.items.filter((item) => item.is_promo);
            // Chỉ liệt kê nhóm CÓ MÓN: một hàng thẻ lọc bấm vào ra danh sách
            // rỗng thì thà đừng có thẻ đó.
            const used = new Set(menuState.items.map((item) => String(item.category_id)));
            for (const category of (data.categories || [])) {
                if (used.has(String(category.id))) menuState.categories.set(category.id, category.name);
            }
            if (menuState.items.length === 0) {
                list.innerHTML = `<p class="cart-empty">Cơ sở chưa có món nào trong ${customName ? customName.toLowerCase() : 'thực đơn'}.</p>`;
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
