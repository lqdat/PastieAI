// Đơn đặt món trong khung chat — phần việc của Sale.
//
// Tách khỏi chat.js cùng lý do với menu-console.js: đây là mảnh của QR Console
// tương lai. File này chỉ mượn helper chung (authFetch, showToast, escapeHtml,
// pastieConfirm) và không đụng vào state của chat.js.
//
// Ranh giới quan trọng nhất: Sale CHỈ được ghi chú cho từng món. Không sửa giá,
// không sửa số lượng, không thêm bớt món. Khách muốn đổi thì tự sửa trong menu
// rồi gửi lại. Giữ ranh giới này thì giá luôn là giá trong database, không ai gõ
// tay vào được — kể cả nhân viên.
(function () {
    'use strict';

    // "mã đơn::mã món" -> ghi chú đang gõ, chưa lưu.
    //
    // Khoá phải có MÃ ĐƠN. Chỉ dùng mã món thì ghi chú chưa lưu của đơn này sẽ
    // hiện sang đơn khác có cùng món — Sale nhảy qua lại giữa hai cuộc chat là
    // thấy "ít cay" mọc ở bàn không ai gõ.
    let noteDraft = new Map();
    const draftKey = (orderId, itemKey) => `${orderId}::${itemKey}`;
    let busyOrderId = null;
    let editingOrderId = null;   // thẻ nào đang mở ô ghi chú

    const money = (value) => `${(Number(value) || 0).toLocaleString('vi-VN')} ₫`;

    function orderFetch(path, options) {
        return orgFetch(`/api/admin/orders/${path}`, options);
    }

    // Chỉ vẽ khi đơn đang CHỜ XÁC NHẬN. Đơn đã xác nhận thì chat.js vẽ hoá đơn,
    // hai thứ không chồng lên nhau.
    function renderPending(order, container) {
        if (!order || order.status !== 'pending_confirm' || !container) return;

        const items = Array.isArray(order.items) ? order.items : [];
        const placedByCustomer = order.placed_by === 'customer';

        const wrapper = document.createElement('div');
        wrapper.className = 'order-card';
        wrapper.dataset.orderCard = order.id;
        wrapper.innerHTML = `
            <div class="order-card-head">
                <span class="order-kicker">
                    <i class="ri-restaurant-2-line"></i>
                    ${placedByCustomer ? 'Khách vừa đặt món' : 'Đơn nhân viên tạo'}
                </span>
                <span class="order-badge">Chờ xác nhận</span>
            </div>

            <div class="order-lines">
                ${items.map((line, index) => {
                    const key = line.menuItemId != null ? String(line.menuItemId) : String(index);
                    const draft = draftKey(order.id, key);
                    const note = noteDraft.has(draft) ? noteDraft.get(draft) : (line.note || '');
                    return `
                    <div class="order-line" data-line="${escapeHtml(key)}">
                        <div class="order-line-main">
                            <strong>${escapeHtml(line.name || '')}</strong>
                            <span class="order-qty">×${Number(line.quantity || 0)}</span>
                            <span class="order-line-total">${money(line.lineTotal)}</span>
                        </div>
                        ${note ? `<p class="order-line-note"><i class="ri-sticky-note-line"></i> ${escapeHtml(note)}</p>` : ''}
                        <input type="text" class="order-note" data-note-for="${escapeHtml(key)}"
                               maxlength="300" value="${escapeHtml(note)}"
                               placeholder="Ghi chú cho bếp: không hành, ít cay…">
                    </div>`;
                }).join('')}
            </div>

            <div class="order-total">
                <span>Tạm tính</span>
                <strong>${money(order.total_amount)}</strong>
            </div>

            <p class="order-hint">
                <i class="ri-information-line"></i>
                <span>Chỉ ghi chú được cho từng món. Khách muốn đổi món hay số lượng thì
                mời khách sửa lại trong thực đơn rồi gửi đơn mới.</span>
            </p>

            <div class="order-actions">
                <button type="button" class="order-btn is-note" data-order-edit="${order.id}">
                    <i class="ri-edit-2-line"></i> <span data-edit-label>Chỉnh sửa</span>
                </button>
                <button type="button" class="order-btn is-confirm" data-order-confirm="${order.id}">
                    <i class="ri-check-line"></i> Xác nhận
                </button>
            </div>`;

        // Danh sách tin nhắn được vẽ lại vài giây một lần. Không nhớ thẻ nào đang
        // mở thì ô ghi chú tự đóng lại ngay giữa lúc Sale đang gõ.
        if (editingOrderId === order.id) {
            wrapper.classList.add('is-editing');
            setEditLabel(wrapper, 'Xong');
        }

        // Thẻ đơn thuộc về thời điểm khách bấm đặt, không phải cuối khung chat.
        // Dùng created_at chứ không phải updated_at: Sale lưu ghi chú cũng làm
        // updated_at nhảy, mà thẻ thì không nên tự trôi xuống dưới vì chuyện đó.
        if (typeof window.insertIntoChatFlow === 'function') {
            window.insertIntoChatFlow(wrapper, order.created_at, container);
        } else {
            container.appendChild(wrapper);
        }
    }

    function collectNotes(orderId) {
        const card = document.querySelector(`[data-order-card="${orderId}"]`);
        if (!card) return {};
        const notes = {};
        card.querySelectorAll('[data-note-for]').forEach((input) => {
            notes[input.dataset.noteFor] = input.value.trim();
        });
        return notes;
    }

    function setBusy(orderId, busy) {
        busyOrderId = busy ? orderId : null;
        const card = document.querySelector(`[data-order-card="${orderId}"]`);
        card?.classList.toggle('is-busy', busy);
        card?.querySelectorAll('button').forEach((button) => { button.disabled = busy; });
    }

    async function saveNotes(orderId, { quiet } = {}) {
        const notes = collectNotes(orderId);
        await orderFetch(`${orderId}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
        });
        // Chỉ xoá bản nháp của ĐƠN NÀY. Xoá sạch cả Map thì ghi chú Sale đang gõ
        // dở ở cuộc chat khác cũng bay theo.
        for (const key of [...noteDraft.keys()]) {
            if (key.startsWith(`${orderId}::`)) noteDraft.delete(key);
        }
        if (!quiet) showToast('Đã lưu ghi chú.', 'success');
    }

    async function confirmOrder(orderId) {
        if (busyOrderId) return;
        setBusy(orderId, true);
        try {
            // Lưu ghi chú TRƯỚC khi xác nhận. Xác nhận là lúc bếp nhận đơn — ghi
            // chú đến sau thì món đã lên chảo rồi.
            await saveNotes(orderId, { quiet: true });
            await orderFetch(`${orderId}/confirm`, { method: 'POST' });
            showToast('Đã xác nhận. Bếp đã nhận đơn và bill tạm tính đã gửi khách.', 'success');
        } catch (error) {
            // Thiếu hàng là trường hợp thường gặp nhất, và backend trả về đúng tên
            // món thiếu — hiện nguyên văn thay vì một câu chung chung.
            showToast(error.message, 'error', 7000);
        } finally {
            setBusy(orderId, false);
        }
    }

    async function rejectOrder(orderId) {
        if (busyOrderId) return;
        const reason = await pastiePrompt(
            'Từ chối đơn — lý do gửi cho khách',
            '',
            { hint: 'Để trống cũng được, khách sẽ nhận thông báo chung. Có lý do thì khách đỡ phải hỏi lại.' }
        );
        if (reason === null) return;
        setBusy(orderId, true);
        try {
            await orderFetch(`${orderId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason.trim() }),
            });
            showToast('Đã từ chối đơn và báo cho khách.', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setBusy(orderId, false);
        }
    }

    // Hộp nhập một dòng, dùng lại khung .confirm-overlay của pastieConfirm để
    // không sinh thêm một phong cách modal thứ hai.
    function pastiePrompt(title, initial = '', options = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-card menu-prompt-card" role="dialog" aria-modal="true">
                    <h3 class="confirm-title"></h3>
                    <input type="text" class="menu-prompt-input" aria-label="Lý do">
                    <small class="org-field-hint menu-prompt-hint hide"></small>
                    <div class="confirm-actions">
                        <button type="button" class="confirm-cancel">Huỷ</button>
                        <button type="button" class="confirm-ok">Gửi</button>
                    </div>
                </div>`;
            overlay.querySelector('.confirm-title').textContent = title;
            const input = overlay.querySelector('.menu-prompt-input');
            input.value = initial;
            if (options.hint) {
                const hint = overlay.querySelector('.menu-prompt-hint');
                hint.textContent = options.hint;
                hint.classList.remove('hide');
            }
            document.body.appendChild(overlay);

            const close = (value) => {
                document.removeEventListener('keydown', onKey);
                overlay.classList.add('is-leaving');
                setTimeout(() => overlay.remove(), 180);
                resolve(value);
            };
            const onKey = (event) => {
                if (event.key === 'Escape') close(null);
                if (event.key === 'Enter' && document.activeElement === input) close(input.value);
            };
            overlay.querySelector('.confirm-ok').addEventListener('click', () => close(input.value));
            overlay.querySelector('.confirm-cancel').addEventListener('click', () => close(null));
            overlay.addEventListener('click', (event) => { if (event.target === overlay) close(null); });
            document.addEventListener('keydown', onKey);
            setTimeout(() => { input.focus(); input.select(); }, 30);
        });
    }

    // Sự kiện gắn ở document: thẻ đơn được dựng lại mỗi lần tải tin nhắn, nên gắn
    // trực tiếp lên thẻ sẽ mất listener sau mỗi lần vẽ.
    document.addEventListener('click', (event) => {
        const confirmBtn = event.target.closest('[data-order-confirm]');
        if (confirmBtn) return void confirmOrder(confirmBtn.dataset.orderConfirm);
        const editBtn = event.target.closest('[data-order-edit]');
        if (editBtn) return void toggleEdit(editBtn.dataset.orderEdit);
    });

    // "Chỉnh sửa" mở ô ghi chú của từng món; bấm lần nữa ("Xong") thì lưu rồi
    // đóng lại. Xác nhận vẫn tự lưu ghi chú trước, nên không ai mất chữ vì quên
    // bấm Xong.
    function toggleEdit(orderId) {
        const card = document.querySelector(`[data-order-card="${orderId}"]`);
        if (!card) return;
        const opening = !card.classList.contains('is-editing');
        if (opening) {
            editingOrderId = orderId;
            card.classList.add('is-editing');
            setEditLabel(card, 'Xong');
            card.querySelector('.order-note')?.focus();
            return;
        }
        editingOrderId = null;
        card.classList.remove('is-editing');
        setEditLabel(card, 'Chỉnh sửa');
        void saveNotes(orderId).catch((error) => showToast(error.message, 'error'));
    }

    function setEditLabel(card, text) {
        const label = card.querySelector('[data-edit-label]');
        if (label) label.textContent = text;
    }

    // Giữ chữ Sale đang gõ khi danh sách tin nhắn được vẽ lại giữa chừng — không
    // giữ thì mỗi lần có tin mới đến là mất hết ghi chú chưa lưu.
    document.addEventListener('input', (event) => {
        const note = event.target.closest('[data-note-for]');
        if (!note) return;
        const orderId = note.closest('[data-order-card]')?.dataset.orderCard;
        if (orderId) noteDraft.set(draftKey(orderId, note.dataset.noteFor), note.value);
    });

    // Thẻ đơn chỉ còn hai nút theo yêu cầu: Chỉnh sửa và Xác nhận. Từ chối đơn
    // KHÔNG còn lối vào trên giao diện, nhưng hàm và endpoint vẫn còn nguyên và
    // xuất ra đây, để lúc cần gắn lại (menu phụ, phím tắt) là có sẵn.
    window.OrderConsole = { renderPending, reject: rejectOrder };
})();
