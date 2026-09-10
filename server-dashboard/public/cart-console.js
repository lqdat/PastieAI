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
        if (detailOverlay) {
            detailOverlay.classList.add('is-closing');
            const target = detailOverlay;
            detailOverlay = null;
            setTimeout(() => target.remove(), 180);
            return;
        }
        if (overlay) {
            overlay.classList.add('is-closing');
            const target = overlay;
            overlay = null;
            setTimeout(() => target.remove(), 180);
        }
    }

    async function fetchOrderDetails(orderId, { invoice = false } = {}) {
        const query = new URLSearchParams({ lang: 'vi' });
        if (invoice) query.set('invoice', '1');
        const res = await authFetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}/details?${query.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Không tải được chi tiết đơn hàng.');
        return data.order;
    }

    async function openBill(orderId, trigger) {
        if (trigger) trigger.disabled = true;
        try {
            const order = await fetchOrderDetails(orderId, { invoice: true });
            const invoice = order.invoice || {};
            const previewUrl = invoice.svgDataUrl || invoice.imageUrl || invoice.imageDataUrl || invoice.pdfUrl || invoice.pdfDataUrl || '';
            const downloadUrl = invoice.pdfUrl || invoice.pdfDataUrl || previewUrl;
            if (!previewUrl) throw new Error('Đơn đang chờ xác nhận nên chưa có hóa đơn.');
            const type = (previewUrl.startsWith('data:image/') || previewUrl.match(/\.(png|jpe?g|webp|svg)($|\?)/i)) ? 'image' : 'document';
            if (typeof openMediaPreview === 'function') {
                openMediaPreview(previewUrl, type, `Hóa đơn ${order.order_code || ''}`.trim(), downloadUrl);
            } else {
                window.open(previewUrl, '_blank', 'noopener,noreferrer');
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

    function showOrderHistoryPopup(history, orderCode) {
        if (!Array.isArray(history) || history.length < 2) return;
        const editCount = Math.max(0, history.length - 1);
        const modal = document.createElement('div');
        modal.className = 'confirm-overlay order-history-overlay';
        modal.innerHTML = `
            <div class="confirm-card order-history-modal-card" role="dialog" aria-modal="true" style="max-width:480px;width:94%;max-height:88vh;display:flex;flex-direction:column;border-radius:20px;padding:16px 18px max(18px, env(safe-area-inset-bottom));text-align:left;background:#ffffff !important;box-shadow:0 24px 60px rgba(0,0,0,0.35);border:1px solid rgba(84,62,100,0.12);">
                <div class="sheet-drag-handle" style="margin-bottom:8px;"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(84,62,100,0.12);">
                    <div>
                        <h3 style="font-size:16px;font-weight:800;color:var(--text-primary);margin:0;display:flex;align-items:center;gap:6px;">
                            <i class="ri-history-line" style="color:var(--accent-color);"></i> Lịch sử chỉnh sửa
                        </h3>
                        <small style="color:var(--text-secondary);font-size:12px;">Mã đơn: <strong>${escapeHtml(orderCode || '')}</strong> • ${editCount} lần thay đổi</small>
                    </div>
                    <button type="button" class="icon-btn order-history-close" style="width:34px;height:34px;border-radius:10px;border:none;background:rgba(84,62,100,0.08);cursor:pointer;display:grid;place-items:center;" title="Đóng"><i class="ri-close-line" style="font-size:18px;"></i></button>
                </div>
                <div style="flex:1;overflow-y:auto;padding-right:2px;overscroll-behavior:contain;">
                    <div class="order-history-list" style="display:flex;flex-direction:column;gap:10px;margin:0;padding:2px 0;">
                        ${history.slice().reverse().map((step) => {
                            const dateObj = new Date(step.createdAt);
                            const timeStr = !isNaN(dateObj.getTime())
                                ? dateObj.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
                                : '';
                            const hasChanges = Array.isArray(step.changes) && step.changes.length > 0;
                            const role = step.editorRole || (step.version === 1 ? 'customer' : 'admin');
                            let badgeHtml = '';
                            if (role === 'customer') {
                                badgeHtml = `<span class="bill-hist-actor is-customer" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:7px;font-size:11.5px;font-weight:700;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;"><i class="ri-user-line"></i> Khách hàng</span>`;
                            } else if (role === 'sale') {
                                badgeHtml = `<span class="bill-hist-actor is-sale" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:7px;font-size:11.5px;font-weight:700;background:#faf5ff;color:#7e22ce;border:1px solid #e9d5ff;"><i class="ri-briefcase-line"></i> ${escapeHtml(step.editorName || 'Sale')}</span>`;
                            } else if (role === 'agent') {
                                badgeHtml = `<span class="bill-hist-actor is-agent" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:7px;font-size:11.5px;font-weight:700;background:#fffbeb;color:#b45309;border:1px solid #fde68a;"><i class="ri-store-2-line"></i> ${escapeHtml(step.editorName || 'Agent')}</span>`;
                            } else {
                                badgeHtml = `<span class="bill-hist-actor is-superadmin" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:7px;font-size:11.5px;font-weight:700;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;"><i class="ri-shield-user-line"></i> ${escapeHtml(step.editorName || 'Quản trị viên')}</span>`;
                            }
                            return `
                            <article class="order-history-card-item" style="background:#ffffff !important;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:8px;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                        <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;background:#f3e8ff;color:#7e22ce;font-weight:800;font-size:12px;">#v${step.version || 1}</span>
                                        ${badgeHtml}
                                    </div>
                                    <span style="font-size:11.5px;color:#64748b;white-space:nowrap;font-weight:500;">
                                        <i class="ri-time-line" style="vertical-align:middle;"></i> ${escapeHtml(timeStr)}
                                    </span>
                                </div>
                                <div style="display:flex;flex-direction:column;gap:6px;margin:2px 0;">
                                    ${hasChanges ? step.changes.map((line) => {
                                        let icon = 'ri-edit-line';
                                        let bg = '#fffbeb';
                                        let border = '#fde68a';
                                        let color = '#b45309';
                                        if (line.startsWith('+')) {
                                            icon = 'ri-add-line';
                                            bg = '#ecfdf5';
                                            border = '#a7f3d0';
                                            color = '#047857';
                                        } else if (line.startsWith('-')) {
                                            icon = 'ri-subtract-line';
                                            bg = '#fef2f2';
                                            border = '#fecaca';
                                            color = '#b91c1c';
                                        } else if (line.includes('Đã thanh toán')) {
                                            icon = 'ri-checkbox-circle-fill';
                                            bg = '#ecfdf5';
                                            border = '#a7f3d0';
                                            color = '#047857';
                                        }
                                        return `
                                        <div style="display:flex;align-items:flex-start;gap:7px;padding:7px 10px;border-radius:8px;font-size:12px;font-weight:500;line-height:1.4;background:${bg};border:1px solid ${border};color:${color};word-break:break-word;">
                                            <i class="${icon}" style="margin-top:2px;flex-shrink:0;font-size:13px;"></i>
                                            <span>${escapeHtml(line)}</span>
                                        </div>`;
                                    }).join('') : `
                                    <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;">
                                        <i class="ri-file-list-3-line"></i> Bản ban đầu (Khách đặt món)
                                    </div>`}
                                </div>
                                <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px dashed #e2e8f0;font-size:12.5px;margin-top:2px;">
                                    <span style="color:#64748b;font-weight:500;">Tổng hóa đơn bản này:</span>
                                    <strong style="font-size:14.5px;font-weight:800;color:var(--accent-color, #c90c6c);">${money(step.totalAmount)}</strong>
                                </div>
                            </article>`;
                        }).join('')}
                    </div>
                </div>
                <div style="margin-top:14px;padding-top:8px;border-top:1px solid rgba(84,62,100,0.08);">
                    <button type="button" class="order-history-close-btn primary-btn" style="width:100%;height:44px;border-radius:12px;font-weight:700;font-size:14px;background:var(--accent-color);color:#fff;border:none;box-shadow:0 4px 14px rgba(201,12,108,0.25);cursor:pointer;">Đóng</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        const close = () => {
            modal.classList.add('is-leaving');
            setTimeout(() => modal.remove(), 160);
        };
        modal.querySelector('.order-history-close').onclick = close;
        modal.querySelector('.order-history-close-btn').onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };
    }

    function editItemDialog(item) {
        return new Promise((resolve) => {
            const currentVat = item.vatRate != null ? Number(item.vatRate) : 10;
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-card" role="dialog" aria-modal="true" style="max-width:390px;width:92%;border-radius:20px;padding:20px 20px 18px;">
                    <div class="sheet-drag-handle"></div>
                    <h3 class="confirm-title" style="font-size:17px;font-weight:800;color:var(--text-primary);margin-bottom:2px;">Sửa giá &amp; số lượng</h3>
                    <p style="margin:2px 0 14px;font-size:13px;font-weight:700;color:var(--accent-color);">${escapeHtml(item.name || '')}</p>
                    <div style="display:grid;gap:12px;margin-bottom:18px;text-align:left;">
                        <label style="font-size:12.5px;font-weight:600;display:grid;gap:5px;color:var(--text-secondary);">
                            <span>Đơn giá (₫):</span>
                            <input type="number" id="edit-item-price" min="0" step="1000" style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(84,62,100,.2);font-size:15px;color:var(--text-primary);background:#fff;" value="${Number(item.unitPrice || 0)}">
                        </label>
                        <label style="font-size:12.5px;font-weight:600;display:grid;gap:5px;color:var(--text-secondary);">
                            <span>Số lượng:</span>
                            <input type="number" id="edit-item-qty" min="1" max="99" style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(84,62,100,.2);font-size:15px;color:var(--text-primary);background:#fff;" value="${Number(item.quantity || 1)}">
                        </label>
                        <label style="font-size:12.5px;font-weight:600;display:grid;gap:5px;color:var(--text-secondary);">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span>Thuế VAT (%):</span>
                                <div style="display:flex;gap:4px;">
                                    <button type="button" class="vat-quick-btn" data-v="0">0%</button>
                                    <button type="button" class="vat-quick-btn" data-v="5">5%</button>
                                    <button type="button" class="vat-quick-btn" data-v="8">8%</button>
                                    <button type="button" class="vat-quick-btn" data-v="10">10%</button>
                                </div>
                            </div>
                            <input type="number" id="edit-item-vat" min="0" max="100" step="1" style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(84,62,100,.2);font-size:15px;color:var(--text-primary);background:#fff;" value="${currentVat}">
                        </label>
                        <label style="font-size:12.5px;font-weight:600;display:grid;gap:5px;color:var(--text-secondary);">
                            <span>Ghi chú thêm:</span>
                            <input type="text" id="edit-item-note" placeholder="Ví dụ: Ít cay, không hành" style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(84,62,100,.2);font-size:15px;color:var(--text-primary);background:#fff;" value="${escapeHtml(String(item.note || '').replace(/^\(|\)$/g, ''))}">
                        </label>
                    </div>
                    <div class="confirm-actions" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <button type="button" class="confirm-cancel" style="height:42px;border-radius:11px;font-weight:600;font-size:13.5px;">Huỷ</button>
                        <button type="button" class="confirm-ok" style="height:42px;border-radius:11px;font-weight:700;font-size:13.5px;background:var(--accent-color);color:#fff;border:none;box-shadow:0 3px 10px rgba(239,43,157,.3);">Lưu thay đổi</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.querySelectorAll('.vat-quick-btn').forEach((btn) => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    overlay.querySelector('#edit-item-vat').value = btn.dataset.v;
                };
            });
            const close = (res) => { overlay.remove(); resolve(res); };
            overlay.onclick = (e) => { if (e.target === overlay) close(null); };
            overlay.querySelector('.confirm-cancel').onclick = () => close(null);
            overlay.querySelector('.confirm-ok').onclick = () => {
                const price = Number(overlay.querySelector('#edit-item-price').value);
                const qty = Number(overlay.querySelector('#edit-item-qty').value);
                const vat = Number(overlay.querySelector('#edit-item-vat').value);
                const note = overlay.querySelector('#edit-item-note').value.trim();
                if (isNaN(price) || price < 0) {
                    showToast('Vui lòng nhập đơn giá hợp lệ.', 'error');
                    return;
                }
                if (isNaN(qty) || qty <= 0) {
                    showToast('Số lượng phải từ 1 trở lên.', 'error');
                    return;
                }
                close({ price, quantity: qty, vatRate: isNaN(vat) ? 10 : Math.max(0, Math.min(100, vat)), note });
            };
        });
    }

    function addItemDialog() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-card" role="dialog" aria-modal="true" style="max-width:390px;width:92%;border-radius:20px;padding:20px 20px 18px;">
                    <div class="sheet-drag-handle"></div>
                    <h3 class="confirm-title" style="font-size:17px;font-weight:800;color:var(--text-primary);margin-bottom:14px;">Thêm món vào hóa đơn</h3>
                    <div style="display:grid;gap:12px;margin-bottom:18px;text-align:left;">
                        <label style="font-size:12.5px;font-weight:600;display:grid;gap:5px;color:var(--text-secondary);">
                            <span>Tên món <b style="color:#ef4444;">*</b>:</span>
                            <input type="text" id="add-item-name" required placeholder="Ví dụ: Cơm chiên hải sản" style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(84,62,100,.2);font-size:15px;color:var(--text-primary);background:#fff;">
                        </label>
                        <label style="font-size:12.5px;font-weight:600;display:grid;gap:5px;color:var(--text-secondary);">
                            <span>Đơn giá (₫) <b style="color:#ef4444;">*</b>:</span>
                            <input type="number" id="add-item-price" min="0" step="1000" placeholder="Ví dụ: 85000" style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(84,62,100,.2);font-size:15px;color:var(--text-primary);background:#fff;">
                        </label>
                        <label style="font-size:12.5px;font-weight:600;display:grid;gap:5px;color:var(--text-secondary);">
                            <span>Số lượng <b style="color:#ef4444;">*</b>:</span>
                            <input type="number" id="add-item-qty" min="1" max="99" value="1" style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(84,62,100,.2);font-size:15px;color:var(--text-primary);background:#fff;">
                        </label>
                        <label style="font-size:12.5px;font-weight:600;display:grid;gap:5px;color:var(--text-secondary);">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span>Thuế VAT (%):</span>
                                <div style="display:flex;gap:4px;">
                                    <button type="button" class="vat-quick-btn" data-v="0">0%</button>
                                    <button type="button" class="vat-quick-btn" data-v="5">5%</button>
                                    <button type="button" class="vat-quick-btn" data-v="8">8%</button>
                                    <button type="button" class="vat-quick-btn" data-v="10">10%</button>
                                </div>
                            </div>
                            <input type="number" id="add-item-vat" min="0" max="100" step="1" value="10" style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(84,62,100,.2);font-size:15px;color:var(--text-primary);background:#fff;">
                        </label>
                        <label style="font-size:12.5px;font-weight:600;display:grid;gap:5px;color:var(--text-secondary);">
                            <span>Ghi chú:</span>
                            <input type="text" id="add-item-note" placeholder="Ví dụ: Ít cay, không tiêu" style="width:100%;height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(84,62,100,.2);font-size:15px;color:var(--text-primary);background:#fff;">
                        </label>
                    </div>
                    <div class="confirm-actions" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <button type="button" class="confirm-cancel" style="height:42px;border-radius:11px;font-weight:600;font-size:13.5px;">Huỷ</button>
                        <button type="button" class="confirm-ok" style="height:42px;border-radius:11px;font-weight:700;font-size:13.5px;background:var(--accent-color);color:#fff;border:none;box-shadow:0 3px 10px rgba(239,43,157,.3);">Thêm món</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.querySelectorAll('.vat-quick-btn').forEach((btn) => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    overlay.querySelector('#add-item-vat').value = btn.dataset.v;
                };
            });
            const close = (res) => { overlay.remove(); resolve(res); };
            overlay.onclick = (e) => { if (e.target === overlay) close(null); };
            overlay.querySelector('.confirm-cancel').onclick = () => close(null);
            overlay.querySelector('.confirm-ok').onclick = () => {
                const name = overlay.querySelector('#add-item-name').value.trim();
                const price = Number(overlay.querySelector('#add-item-price').value);
                const qty = Number(overlay.querySelector('#add-item-qty').value);
                const vat = Number(overlay.querySelector('#add-item-vat').value);
                const note = overlay.querySelector('#add-item-note').value.trim();
                if (!name) {
                    showToast('Vui lòng nhập tên món.', 'error');
                    return;
                }
                if (isNaN(price) || price < 0) {
                    showToast('Vui lòng nhập đơn giá hợp lệ.', 'error');
                    return;
                }
                if (isNaN(qty) || qty <= 0) {
                    showToast('Số lượng phải từ 1 trở lên.', 'error');
                    return;
                }
                close({ name, unitPrice: price, quantity: qty || 1, vatRate: isNaN(vat) ? 10 : Math.max(0, Math.min(100, vat)), note });
            };
        });
    }

    async function showOrderDetails(orderId, trigger, prefilled = null) {
        if (trigger) trigger.disabled = true;

        // Mở ngay Bottom Sheet với hiệu ứng mượt mà và Skeleton loading (không chờ network)
        detailOverlay?.remove();
        detailOverlay = document.createElement('div');
        detailOverlay.className = 'cart-overlay order-detail-overlay';
        const initialCode = prefilled?.orderCode || orderId;
        detailOverlay.innerHTML = `
            <section class="cart-box order-detail-box" role="dialog" aria-modal="true" aria-label="Chi tiết đơn hàng">
                <div class="sheet-drag-handle"></div>
                <div class="admin-list-head">
                    <div class="order-detail-heading">
                        <small>CHI TIẾT ĐƠN HÀNG</small>
                        <h3 id="order-detail-title">${escapeHtml(initialCode)}</h3>
                    </div>
                    <button type="button" class="icon-btn cart-close detail-close" title="Đóng"><i class="ri-close-line"></i></button>
                </div>
                <div class="cart-body order-detail-body">
                    <div class="order-detail-skeleton">
                        <div class="skeleton-shimmer skeleton-meta"></div>
                        <div class="skeleton-shimmer skeleton-item"></div>
                        <div class="skeleton-shimmer skeleton-item"></div>
                        <div class="skeleton-shimmer skeleton-total"></div>
                    </div>
                </div>
            </section>`;
        document.body.appendChild(detailOverlay);

        const closeDetail = () => {
            detailOverlay?.classList.add('is-closing');
            const target = detailOverlay;
            detailOverlay = null;
            setTimeout(() => target?.remove(), 180);
        };
        detailOverlay.querySelector('.detail-close').onclick = closeDetail;
        detailOverlay.onclick = (e) => {
            if (e.target === detailOverlay) closeDetail();
        };

        try {
            const order = await fetchOrderDetails(orderId, { invoice: false });
            const titleEl = detailOverlay.querySelector('#order-detail-title');
            if (titleEl) titleEl.textContent = order.order_code || order.id;

            let draftItems = (Array.isArray(order.items) ? JSON.parse(JSON.stringify(order.items)) : []).map((it) => {
                const vatRate = it.vatRate != null ? Number(it.vatRate) : 10;
                const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
                const quantity = Number(it.quantity || 1);
                const discount = Number(it.discount || 0);
                const lineTotal = Number(it.lineTotal != null ? it.lineTotal : (unitPrice * quantity - discount));
                // Giá đã gồm VAT: bóc tách số tiền VAT trong thành tiền phục vụ kế toán
                const vatAmount = vatRate > 0 ? Math.round(lineTotal - lineTotal / (1 + vatRate / 100)) : 0;
                return { ...it, unitPrice, quantity, discount, lineTotal, vatRate, vatAmount };
            });
            const charges = order.charges || {};
            let isDirty = false;
            let isSaving = false;
            let isSending = false;

            const payment = order.payment_method ? PAYMENT[order.payment_method] || order.payment_method : 'Khách chưa chọn';
            const canEdit = (CURRENT_ADMIN?.role === 'agent' || CURRENT_ADMIN?.role === 'superadmin' || CURRENT_ADMIN?.role === 'admin' || CURRENT_ADMIN?.role === 'sale') && order.status !== 'paid';

            function recalculateCharges() {
                const subtotal = draftItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
                const vatAmount = draftItems.reduce((acc, it) => {
                    const line = it.lineTotal || 0;
                    const rate = it.vatRate != null ? Number(it.vatRate) : 0;
                    return acc + (rate > 0 ? Math.round(line - line / (1 + rate / 100)) : 0);
                }, 0);
                // Giá món đã bao gồm VAT nên tổng thanh toán bằng tổng tiền món
                const totalAmount = subtotal;
                return { subtotal, vatAmount, totalAmount };
            }

            function renderDraftItemsHtml() {
                if (!draftItems.length) {
                    return `
                        <div class="order-items-empty">
                            <i class="ri-shopping-basket-2-line"></i>
                            <p>Đơn chưa có món nào.</p>
                            <small>Bấm "Thêm món vào hóa đơn" bên dưới để bổ sung món</small>
                        </div>`;
                }
                return draftItems.map((item, index) => `
                    <div class="order-detail-item" data-item-idx="${index}">
                        <div class="order-item-left">
                            <div class="order-item-name-wrap">
                                <strong class="order-item-name">${escapeHtml(item.name || 'Món')}</strong>
                                ${item.note ? `<span class="order-item-note-badge" title="${escapeHtml(item.note)}"><i class="ri-sticky-note-line"></i> ${escapeHtml(String(item.note).replace(/^\(|\)$/g, ''))}</span>` : ''}
                            </div>
                            <div class="order-item-qty-row">
                                <span class="order-item-unit-price">${money(item.unitPrice || 0)}</span>
                                <span class="order-item-cross">×</span>
                                <span class="order-item-qty-tag">${Number(item.quantity || 0)}</span>
                                <span class="order-item-vat-tag" data-edit-item="${index}" title="Thuế VAT: ${Number(item.vatRate != null ? item.vatRate : 10)}% (Giá đã gồm VAT)">
                                    VAT ${Number(item.vatRate != null ? item.vatRate : 10)}%
                                </span>
                            </div>
                        </div>
                        <div class="order-item-right">
                            <b class="order-item-total">${money(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0))}</b>
                            ${canEdit ? `
                            <div class="order-item-actions">
                                <button type="button" class="order-action-btn edit-item-btn" data-edit-item="${index}" title="Sửa giá / SL / VAT">
                                    <i class="ri-pencil-line"></i>
                                </button>
                                <button type="button" class="order-action-btn del-item-btn is-danger" data-del-item="${index}" title="Xóa món">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>` : ''}
                        </div>
                    </div>`).join('');
            }

            function updateSummaryHtml() {
                const calc = recalculateCharges();
                const summaryEl = detailOverlay?.querySelector('.order-detail-summary');
                if (summaryEl) {
                    summaryEl.innerHTML = `
                        <div class="summary-line">
                            <span class="summary-line-label">Tổng tiền món</span>
                            <b class="summary-line-val">${money(calc.subtotal)}</b>
                        </div>
                        <div class="summary-line">
                            <span class="summary-line-label">Đã bao gồm VAT</span>
                            <b class="summary-line-val">${money(calc.vatAmount)}</b>
                        </div>
                        <div class="summary-line is-total">
                            <span class="summary-line-label">Tổng thanh toán</span>
                            <b class="summary-line-val">${money(calc.totalAmount)}</b>
                        </div>
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
                    saveBtn.style.display = isDirty ? 'inline-flex' : 'none';
                    saveBtn.style.background = isDirty ? 'var(--accent-color)' : '';
                    saveBtn.style.color = isDirty ? '#fff' : '';
                    saveBtn.innerHTML = isSaving
                        ? `<i class="ri-loader-4-line ri-spin"></i> Đang lưu…`
                        : `<i class="ri-save-line"></i> <strong>Lưu thay đổi</strong>`;
                }
            }

            function refreshDraftView() {
                const itemsContainer = detailOverlay?.querySelector('.order-detail-items');
                if (itemsContainer) {
                    itemsContainer.innerHTML = renderDraftItemsHtml();
                }
                updateSummaryHtml();
            }

            const bodyContainer = detailOverlay.querySelector('.order-detail-body');
            if (bodyContainer) {
                const isPaid = order.status === 'paid';
                const statusLabel = isPaid ? 'Đã thu tiền' : 'Chưa thu tiền';
                const statusSub = isPaid
                    ? (payment !== 'Khách chưa chọn' ? `(${payment})` : '(Đã thanh toán)')
                    : (order.payment_method ? `(Chờ thanh toán qua ${payment})` : '(Khách chưa chọn cách trả)');

                bodyContainer.innerHTML = `
                    <div class="order-detail-status-banner ${isPaid ? 'is-paid' : 'is-unpaid'}">
                        <i class="${isPaid ? 'ri-checkbox-circle-fill' : 'ri-time-line'}"></i>
                        <span>Trạng thái: <strong>${statusLabel}</strong> ${escapeHtml(statusSub)}</span>
                    </div>
                    <div class="order-detail-meta">
                        <span><i class="ri-map-pin-2-line"></i>${escapeHtml(order.qr_label || order.group_name || '—')}</span>
                        <span><i class="ri-bank-card-line"></i>${escapeHtml(payment)}</span>
                        <span><i class="ri-user-line"></i>${escapeHtml(order.visitor_name || order.visitor_email || 'Khách')}</span>
                        <span><i class="ri-user-star-line"></i>Sale: <strong>${escapeHtml(order.sale_name || 'Chưa tiếp nhận')}</strong></span>
                    </div>
                    <div class="order-detail-items">
                        ${renderDraftItemsHtml()}
                    </div>
                    ${canEdit ? `
                    <div class="order-add-toolbar">
                        <button type="button" class="order-add-btn" id="order-add-item-btn">
                            <i class="ri-add-line"></i>
                            <span>Thêm món vào hóa đơn</span>
                        </button>
                        <div id="order-save-status-wrap">
                            <span class="order-save-status is-saved"><i class="ri-checkbox-circle-line"></i> Đã lưu</span>
                        </div>
                    </div>` : ''}
                    <div class="order-detail-summary">
                        <div class="summary-line">
                            <span class="summary-line-label">Tổng tiền món</span>
                            <b class="summary-line-val">${money(charges.subtotal ?? order.total_amount)}</b>
                        </div>
                        <div class="summary-line">
                            <span class="summary-line-label">Đã bao gồm VAT</span>
                            <b class="summary-line-val">${money(charges.vatAmount || 0)}</b>
                        </div>
                        <div class="summary-line is-total">
                            <span class="summary-line-label">Tổng thanh toán</span>
                            <b class="summary-line-val">${money(order.total_amount)}</b>
                        </div>
                    </div>
                    <div class="order-detail-history-wrap" id="order-history-wrap" style="display:none;margin:10px 0;">
                        <button type="button" class="order-history-btn secondary-btn" id="order-open-history-btn" style="width:100%;height:38px;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:7px;">
                            <i class="ri-history-line"></i> Lịch sử chỉnh sửa (<span id="order-history-count">0</span> lần thay đổi)
                        </button>
                    </div>
                    <div class="order-detail-actions">
                        <div class="order-action-nav-row">
                            <button type="button" class="secondary-btn order-nav-btn" data-open="${escapeHtml(order.session_id)}"><i class="ri-chat-3-line"></i> Đến hội thoại</button>
                            <button type="button" class="secondary-btn order-nav-btn" data-bill="${escapeHtml(order.id)}"><i class="ri-file-list-3-line"></i> Xem hóa đơn</button>
                        </div>
                        ${canEdit ? `
                            <button type="button" class="primary-btn is-full-width order-save-btn" id="order-save-bill-btn" style="display:none;"><i class="ri-save-line"></i> Lưu thay đổi</button>
                            <button type="button" class="primary-btn is-full-width is-resend-bill" id="order-send-bill-btn" data-order-id="${escapeHtml(order.id)}"><i class="ri-send-plane-fill"></i> Gửi lại hóa đơn cho khách</button>
                        ` : ''}
                        ${canMarkPaid && order.status === 'awaiting_payment' ? `<button type="button" class="cart-paid-btn is-full-width" data-paid="${escapeHtml(order.id)}" data-method="${escapeHtml(order.payment_method || '')}"><i class="ri-check-double-line"></i> Xác nhận đã thu tiền</button>` : ''}
                    </div>
                `;
            }

            // Tải lịch sử đơn hàng nền (không cản trở giao diện chính)
            void loadOrderHistory(order).then((history) => {
                if (Array.isArray(history) && history.length >= 2) {
                    const wrap = detailOverlay?.querySelector('#order-history-wrap');
                    const countEl = detailOverlay?.querySelector('#order-history-count');
                    const btn = detailOverlay?.querySelector('#order-open-history-btn');
                    if (wrap && countEl && btn) {
                        countEl.textContent = String(history.length - 1);
                        wrap.style.display = 'block';
                        btn.onclick = () => showOrderHistoryPopup(history, order.order_code || order.id);
                    }
                }
            });

            detailOverlay.onclick = async (event) => {
                if (event.target === detailOverlay || event.target.closest('.detail-close')) {
                    if (isDirty) {
                        const leave = await pastieConfirm('Bạn có thay đổi chưa lưu trên hóa đơn. Bạn có chắc muốn đóng mà không lưu?', { title: 'Thay đổi chưa lưu', confirmText: 'Đóng không lưu', danger: true });
                        if (!leave) return;
                    }
                    closeDetail();
                    return;
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
                    const origHtml = bill.innerHTML;
                    bill.disabled = true;
                    bill.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang tải…`;
                    try {
                        await openBill(bill.dataset.bill, bill);
                    } finally {
                        bill.disabled = false;
                        bill.innerHTML = origHtml;
                    }
                    return;
                }

                const delBtn = event.target.closest('[data-del-item]');
                if (delBtn) {
                    const idx = Number(delBtn.dataset.delItem);
                    const it = draftItems[idx];
                    const ok = await pastieConfirm(`Xóa món "${it?.name || 'này'}" khỏi hóa đơn?`, { title: 'Xóa món khỏi hóa đơn', confirmText: 'Xóa', danger: true });
                    if (!ok) return;
                    draftItems = draftItems.filter((_, i) => i !== idx);
                    isDirty = true;
                    refreshDraftView();
                    showToast('Đã xóa món. Vui lòng bấm "Lưu thay đổi" để lưu vào hóa đơn.');
                    return;
                }

                const editBtn = event.target.closest('[data-edit-item]');
                if (editBtn) {
                    const idx = Number(editBtn.dataset.editItem);
                    const it = draftItems[idx];
                    const result = await editItemDialog(it);
                    if (!result) return;
                    const rate = result.vatRate != null ? Number(result.vatRate) : (it.vatRate != null ? Number(it.vatRate) : 10);
                    const lineTotal = result.price * result.quantity;
                    draftItems = draftItems.map((oldIt, i) => {
                        if (i !== idx) return oldIt;
                        return {
                            ...oldIt,
                            unitPrice: result.price,
                            quantity: result.quantity,
                            lineTotal,
                            vatRate: rate,
                            vatAmount: Math.round(lineTotal * rate / 100),
                            note: result.note || oldIt.note
                        };
                    });
                    isDirty = true;
                    refreshDraftView();
                    showToast('Đã sửa món. Vui lòng bấm "Lưu thay đổi" để lưu vào hóa đơn.');
                    return;
                }

                const addBtn = event.target.closest('#order-add-item-btn');
                if (addBtn) {
                    const result = await addItemDialog();
                    if (!result) return;
                    const rate = result.vatRate != null ? Number(result.vatRate) : 10;
                    const lineTotal = Number(result.unitPrice || 0) * Number(result.quantity || 1);
                    draftItems.push({
                        ...result,
                        vatRate: rate,
                        vatAmount: Math.round(lineTotal * rate / 100),
                        lineTotal
                    });
                    isDirty = true;
                    refreshDraftView();
                    showToast('Đã thêm món vào danh sách. Vui lòng bấm "Lưu thay đổi" để hoàn tất.');
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
                            body: JSON.stringify({ items: draftItems, sendBill: false })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Không thể lưu thay đổi.');
                        isDirty = false;
                        showToast('Đã lưu thay đổi vào hóa đơn!', 'success');
                        // Cập nhật lại lịch sử
                        void loadOrderHistory(order).then((history) => {
                            const wrap = detailOverlay?.querySelector('#order-history-wrap');
                            const countEl = detailOverlay?.querySelector('#order-history-count');
                            const btn = detailOverlay?.querySelector('#order-open-history-btn');
                            if (wrap && countEl && btn && Array.isArray(history) && history.length >= 2) {
                                countEl.textContent = String(history.length - 1);
                                wrap.style.display = 'block';
                                btn.onclick = () => showOrderHistoryPopup(history, order.order_code || order.id);
                            }
                        });
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
                            'Bạn có thay đổi chưa lưu trên hóa đơn. Bạn cần lưu thay đổi trước khi gửi lại cho khách.\n\nLưu thay đổi và gửi lại hóa đơn ngay?',
                            { title: 'Lưu và gửi lại hóa đơn', confirmText: 'Lưu & Gửi ngay', cancelText: 'Xem lại' }
                        );
                        if (!wantSaveAndSend) return;
                    }
                    if (isSending) return;
                    isSending = true;
                    sendBillBtn.disabled = true;
                    sendBillBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang gửi lại hóa đơn…`;
                    try {
                        const res = await authFetch(`${API_BASE}/api/admin/orders/${order.id}/agent-items`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ items: draftItems, sendBill: true })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Không thể gửi lại hóa đơn.');
                        isDirty = false;
                        showToast('Đã lưu và gửi lại hóa đơn mới nhất cho khách thành công!', 'success');
                        await showOrderDetails(order.id);
                    } catch (e) {
                        showToast(e.message, 'error');
                        sendBillBtn.disabled = false;
                        sendBillBtn.innerHTML = `<i class="ri-send-plane-fill"></i> Gửi lại hóa đơn cho khách`;
                    } finally {
                        isSending = false;
                    }
                    return;
                }

                const paidBtn = event.target.closest('[data-paid]');
                if (paidBtn) {
                    const currentMethod = paidBtn.dataset.method || order.payment_method || 'cash';
                    const codeLabel = order.order_code || order.id;
                    const ok = await pastieConfirm(`Xác nhận đã thu tiền cho hóa đơn #${escapeHtml(codeLabel)}?`, {
                        title: 'Xác nhận thu tiền',
                        confirmText: 'Đã thu tiền',
                        cancelText: 'Hủy'
                    });
                    if (!ok) return;
                    paidBtn.disabled = true;
                    try {
                        const res = await authFetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(paidBtn.dataset.paid)}/received-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paymentMethod: currentMethod })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.error || 'Không xác nhận được.');
                        showToast('Đã ghi nhận thanh toán.', 'success');
                        await showOrderDetails(order.id);
                        if (overlay) {
                            const listBody = overlay.querySelector('.cart-body');
                            if (listBody) await load(listBody);
                        }
                    } catch (error) {
                        showToast(error.message, 'error');
                        paidBtn.disabled = false;
                    }
                    return;
                }
            };
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
            if (!res.ok) throw new Error(data?.error || 'Không tải được danh sách hóa đơn.');
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
                const canEdit = (CURRENT_ADMIN?.role === 'agent' || CURRENT_ADMIN?.role === 'superadmin' || CURRENT_ADMIN?.role === 'admin' || CURRENT_ADMIN?.role === 'sale') && order.status !== 'paid';
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
                        <button type="button" class="cart-action-btn" data-bill="${escapeHtml(order.id)}"><i class="ri-file-list-3-line"></i> Xem hóa đơn</button>
                        <!-- HAI NÚT RIÊNG, KHÔNG PHẢI MỘT NÚT ĐỔI NHÃN.
                             Trước đây đơn chưa thu tiền thì nút này biến thành
                             "Sửa hóa đơn" và nút "Chi tiết" biến mất — người chỉ
                             muốn XEM lại đơn không còn đường nào, phải bấm vào
                             nút sửa. Nay xem và sửa là hai việc, hai nút. -->
                        <button type="button" class="cart-action-btn" data-details="${escapeHtml(order.id)}"><i class="ri-eye-line"></i> Chi tiết</button>
                        ${canEdit ? `<button type="button" class="cart-action-btn" data-details="${escapeHtml(order.id)}"><i class="ri-edit-line"></i> Sửa hóa đơn</button>` : ''}
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
                <div class="sheet-drag-handle"></div>
                <div class="admin-list-head">
                    <h3><i class="ri-bill-line"></i> Quản lý hóa đơn</h3>
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
                const origHtml = bill.innerHTML;
                bill.disabled = true;
                bill.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Hóa đơn…`;
                try {
                    await openBill(bill.dataset.bill, bill);
                } finally {
                    bill.disabled = false;
                    bill.innerHTML = origHtml;
                }
                return;
            }

            const details = event.target.closest('[data-details]');
            if (details) {
                const row = details.closest('.cart-row');
                const orderCode = row?.querySelector('.cart-code')?.textContent?.trim() || details.dataset.details;
                await showOrderDetails(details.dataset.details, details, { orderCode });
                return;
            }

            const paid = event.target.closest('[data-paid]');
            if (paid) {
                const row = paid.closest('.cart-row');
                const visibleCode = row?.querySelector('.cart-code')?.textContent?.trim() || paid.dataset.paid;
                const currentMethod = paid.dataset.method || 'cash';
                const ok = await pastieConfirm(`Xác nhận đã thu tiền cho hóa đơn #${visibleCode}?`, {
                    title: 'Xác nhận thu tiền',
                    confirmText: 'Đã thu tiền',
                    cancelText: 'Hủy'
                });
                if (!ok) return;
                paid.disabled = true;
                try {
                    const res = await authFetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(paid.dataset.paid)}/received-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paymentMethod: currentMethod })
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
