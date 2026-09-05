// Thực đơn QR — màn hình Agent nhập món.
//
// Tách khỏi admin.js có chủ đích: admin.js đã 6.300 dòng, và theo kế hoạch tách
// hệ thống thì đây là mảnh đầu tiên của QR Console. File này chỉ dùng các helper
// chung của admin.js (authFetch, showToast, escapeHtml, pastieConfirm) và không
// đụng vào state của nó.
//
// Chỉ Agent quản lý của dự án qr_concierge thấy thẻ này; backend cũng chặn bằng
// requireAgentManager nên ẩn ở đây thuần là chuyện giao diện.
(function () {
    'use strict';

    const LANGS = [
        { code: 'vi', label: 'Tiếng Việt', short: 'VI' },
        { code: 'en', label: 'English', short: 'EN' },
        { code: 'ru', label: 'Русский', short: 'RU' },
        { code: 'zh', label: '中文', short: 'ZH' },
        { code: 'ko', label: '한국어', short: 'KO' },
    ];

    let CATEGORIES = [];
    let ITEMS = [];
    let editingItemId = null;
    // Ảnh chọn trong form, chưa gửi. Endpoint ảnh cần id của món nên không tải
    // lên trước khi món tồn tại được — giữ tệp ở đây rồi gửi ngay sau khi tạo.
    let pendingPhoto = null;
    // Món vừa tạo/sửa: bản dịch chạy nền nên phải quay lại hỏi mới thấy.
    let pendingTranslation = new Set();
    let pollTimer = null;

    const $ = (id) => document.getElementById(id);

    function fetchMenu(path, options) {
        return orgFetch(`/api/agent/menu${path}`, options);
    }

    function money(value) {
        const number = Number(value) || 0;
        return number.toLocaleString('vi-VN') + ' ₫';
    }

    // --- Tải dữ liệu ---------------------------------------------------------

    async function load(quiet) {
        const list = $('menu-item-list');
        if (!quiet && list) {
            list.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải thực đơn…</p>';
        }
        // Hai nguồn dữ liệu ĐỘC LẬP nhau. Dùng Promise.all thì một bên hỏng là
        // cả hai cùng không hiện — thêm danh mục thành công mà màn hình trống
        // trơn, người dùng tưởng thêm không được. Đó chính là lỗi đã gặp.
        const [catResult, itemResult] = await Promise.allSettled([
            fetchMenu('/categories'),
            fetchMenu('/items'),
        ]);
        try {
            CATEGORIES = catResult.status === 'fulfilled' && Array.isArray(catResult.value) ? catResult.value : [];
            ITEMS = itemResult.status === 'fulfilled' && Array.isArray(itemResult.value) ? itemResult.value : [];

            // Món nào đã có đủ bản dịch thì thôi chờ.
            for (const item of ITEMS) {
                if (pendingTranslation.has(item.id) && translatedCount(item) > 0) {
                    pendingTranslation.delete(item.id);
                }
            }
            render();
            scheduleTranslationPoll();
            void loadPos();
            void loadDeferredPayment();

            // Báo lỗi cho ĐÚNG phần hỏng, phần còn lại vẫn dùng được bình thường.
            if (catResult.status === 'rejected') {
                showToast(catResult.reason?.message || 'Không tải được danh mục.', 'error');
            }
            if (itemResult.status === 'rejected' && list) {
                list.innerHTML = `<p class="org-empty is-error"><i class="ri-error-warning-line"></i> ${escapeHtml(itemResult.reason?.message || 'Không tải được danh sách món.')}</p>`;
            }
        } catch (error) {
            // Tải hỏng thì VẪN dựng lại ô chọn danh mục. Bỏ qua bước này thì ô
            // chọn rỗng trơn, và danh sách xổ xuống thành một vệt đen không có
            // mục nào — trông như lỗi giao diện chứ không như lỗi tải dữ liệu.
            renderCategorySelect();
            if (list) {
                list.innerHTML = `<p class="org-empty is-error"><i class="ri-error-warning-line"></i> ${escapeHtml(error.message)}</p>`;
            }
        }
    }

    // Bản dịch do AI chạy nền sau khi lưu. Thay vì bắt Agent tự bấm tải lại,
    // hỏi lại vài lần rồi dừng — không để một vòng lặp chạy mãi.
    function scheduleTranslationPoll() {
        clearTimeout(pollTimer);
        if (pendingTranslation.size === 0) return;
        pollTimer = setTimeout(() => {
            const before = pendingTranslation.size;
            void load(true).then(() => {
                if (pendingTranslation.size === before) {
                    // Không tiến triển sau một vòng: nhiều khả năng dịch lỗi.
                    // Dừng hỏi, để trạng thái "chưa dịch" hiển thị nguyên vậy.
                    pendingTranslation.clear();
                }
            });
        }, 4000);
    }

    function translatedCount(item) {
        const list = Array.isArray(item.translations) ? item.translations : [];
        return list.filter((t) => t && t.lang && t.lang !== 'vi' && t.name).length;
    }

    // --- Dựng giao diện ------------------------------------------------------

    function render() {
        renderCategories();
        renderCategorySelect();
        renderItems();
        const badge = $('menu-count-badge');
        if (badge) badge.textContent = `${ITEMS.length} món`;
    }

    function renderCategories() {
        const box = $('menu-category-list');
        if (!box) return;
        if (CATEGORIES.length === 0) {
            box.innerHTML = '<p class="menu-hint-empty">Chưa có danh mục nào. Món không thuộc danh mục vẫn hiện với khách, nhưng chia nhóm sẽ dễ xem hơn.</p>';
            return;
        }
        box.innerHTML = CATEGORIES.map((category) => `
            <span class="menu-cat-chip${category.is_active ? '' : ' is-off'}${category.is_promo ? ' is-promo' : ''}" data-category-chip="${category.id}">
                ${category.is_promo ? '<i class="ri-flashlight-fill" title="Nhóm ưu đãi — món trong đây chạy lên đầu thực đơn của khách"></i>' : ''}
                <button type="button" class="menu-cat-name" data-category-rename="${category.id}" title="Đổi tên">${escapeHtml(category.name)}</button>
                <small>${category.item_count}</small>
                <button type="button" class="menu-cat-toggle" data-category-toggle="${category.id}"
                        title="${category.is_active ? 'Đang hiện với khách — bấm để ẩn' : 'Đang ẩn — bấm để hiện'}">
                    <i class="ri-${category.is_active ? 'eye-line' : 'eye-off-line'}"></i>
                </button>
                ${category.is_promo ? '' : `<button type="button" class="menu-cat-del" data-category-delete="${category.id}" title="Xoá danh mục"><i class="ri-close-line"></i></button>`}
            </span>
        `).join('');
    }

    function renderCategorySelect() {
        const select = $('menu-item-category');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">— Không thuộc danh mục —</option>'
            + CATEGORIES.map((c) => `<option value="${c.id}">${c.is_promo ? '⚡ ' : ''}${escapeHtml(c.name)}</option>`).join('');
        if (current) select.value = current;
    }

    function renderItems() {
        const box = $('menu-item-list');
        if (!box) return;
        if (ITEMS.length === 0) {
            box.innerHTML = `
                <div class="menu-empty">
                    <i class="ri-restaurant-2-line"></i>
                    <strong>Thực đơn còn trống</strong>
                    <p>Thêm món đầu tiên ở form bên trên. Tên và mô tả sẽ được dịch tự động sang tiếng Anh, Nga, Trung và Hàn ngay khi lưu.</p>
                </div>`;
            return;
        }

        // Gom theo danh mục, giữ đúng thứ tự backend đã sắp.
        const groups = new Map();
        for (const item of ITEMS) {
            const key = item.category_id || 0;
            if (!groups.has(key)) groups.set(key, { name: item.category_name || 'Chưa phân loại', items: [] });
            groups.get(key).items.push(item);
        }

        box.innerHTML = [...groups.values()].map((group) => `
            <div class="menu-group">
                <h5 class="menu-group-title">${escapeHtml(group.name)} <small>${group.items.length} món</small></h5>
                ${group.items.map(itemCard).join('')}
            </div>
        `).join('');
    }

    // Tồn kho null = không giới hạn, không hiện gì cho đỡ rối. Có số thì mới
    // hiện, và tô đỏ/cam để Agent liếc qua là biết món nào sắp phải nhập thêm.
    function stockBadge(item) {
        if (item.stock_quantity === null || item.stock_quantity === undefined) return '';
        const left = Number(item.stock_quantity);
        if (left <= 0) {
            return `<span class="menu-stock is-out"><i class="ri-close-circle-line"></i> Hết hàng${item.hide_when_out ? ' · đã ẩn' : ' · vẫn hiện'}</span>`;
        }
        return `<span class="menu-stock${left <= 5 ? ' is-low' : ''}"><i class="ri-archive-line"></i> Còn ${left}</span>`;
    }

    function itemCard(item) {
        const done = translatedCount(item);
        const waiting = pendingTranslation.has(item.id);
        const langChips = LANGS.filter((l) => l.code !== 'vi').map((lang) => {
            const hit = (item.translations || []).find((t) => t && t.lang === lang.code && t.name);
            const state = hit ? (hit.is_manual ? 'is-manual' : 'is-auto') : 'is-missing';
            const title = hit
                ? `${lang.label}: ${hit.name}${hit.is_manual ? ' (tự sửa)' : ' (AI dịch)'}`
                : `${lang.label}: chưa có bản dịch — bấm để nhập tay`;
            return `<button type="button" class="menu-lang ${state}" data-translate="${item.id}" data-lang="${lang.code}" title="${escapeHtml(title)}">${lang.short}</button>`;
        }).join('');

        return `
        <article class="menu-item${item.is_available ? '' : ' is-off'}" data-item="${item.id}">
            <label class="menu-thumb" title="Đổi ảnh món">
                ${item.image_url
                    ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" loading="lazy">`
                    : '<i class="ri-image-add-line"></i>'}
                <input type="file" accept="image/*" data-image-for="${item.id}" hidden>
            </label>

            <div class="menu-item-body">
                <div class="menu-item-head">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span class="menu-price">${money(item.price)}</span>
                </div>
                ${stockBadge(item)}
                ${item.description ? `<p class="menu-desc">${escapeHtml(item.description)}</p>` : ''}
                <div class="menu-langs">
                    ${waiting && done === 0
                        ? '<span class="menu-translating"><i class="ri-loader-4-line ri-spin"></i> đang dịch…</span>'
                        : langChips}
                </div>
            </div>

            <div class="menu-item-actions">
                <button type="button" class="menu-act" data-item-availability="${item.id}"
                        title="${item.is_available ? 'Còn bán — bấm để tạm hết' : 'Đang tạm hết — bấm để bán lại'}">
                    <i class="ri-${item.is_available ? 'checkbox-circle-line' : 'indeterminate-circle-line'}"></i>
                </button>
                <button type="button" class="menu-act" data-item-edit="${item.id}" title="Sửa món"><i class="ri-pencil-line"></i></button>
                <button type="button" class="menu-act is-danger" data-item-delete="${item.id}" title="Xoá món"><i class="ri-delete-bin-line"></i></button>
            </div>
        </article>`;
    }

    // --- Thao tác danh mục ---------------------------------------------------

    async function addCategory(event) {
        event.preventDefault();
        const input = $('menu-category-name');
        const name = (input?.value || '').trim();
        if (!name) return;
        try {
            await fetchMenu('/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (input) input.value = '';
            showToast(`Đã thêm danh mục "${name}".`, 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function renameCategory(id) {
        const category = CATEGORIES.find((c) => c.id === Number(id));
        if (!category) return;
        const name = await pastiePrompt('Đổi tên danh mục', category.name);
        if (name === null) return;
        const clean = name.trim();
        if (!clean || clean === category.name) return;
        try {
            await fetchMenu(`/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: clean }),
            });
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function toggleCategory(id) {
        const category = CATEGORIES.find((c) => c.id === Number(id));
        if (!category) return;
        try {
            await fetchMenu(`/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !category.is_active }),
            });
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function deleteCategory(id) {
        const category = CATEGORIES.find((c) => c.id === Number(id));
        if (!category) return;
        if (category.is_promo) {
            return showToast('Không xoá được nhóm Ưu đãi. Bạn có thể ẩn nhóm này nếu chưa dùng tới.', 'error');
        }
        // Nói rõ món KHÔNG mất theo — backend để ON DELETE SET NULL.
        const ok = await pastieConfirm(
            category.item_count > 0
                ? `Xoá danh mục "${category.name}"? ${category.item_count} món trong đó vẫn còn, chỉ chuyển sang "Chưa phân loại".`
                : `Xoá danh mục "${category.name}"?`,
            { confirmText: 'Xoá danh mục', danger: true }
        );
        if (!ok) return;
        try {
            await fetchMenu(`/categories/${id}`, { method: 'DELETE' });
            showToast('Đã xoá danh mục.', 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // --- Thao tác món --------------------------------------------------------

    // Hiện ảnh đã chọn, hoặc ảnh hiện có của món đang sửa, hoặc trạng thái trống.
    function showPhotoPreview(url, caption) {
        const thumb = $('menu-item-photo-thumb');
        const text = $('menu-item-photo-text');
        const clear = $('menu-item-photo-clear');
        if (!thumb || !text) return;
        thumb.innerHTML = url
            ? `<img src="${escapeHtml(url)}" alt="">`
            : '<i class="ri-image-add-line"></i>';
        text.textContent = caption;
        clear?.classList.toggle('hide', !url);
    }

    function resetPhotoField(item) {
        pendingPhoto = null;
        const input = $('menu-item-photo');
        if (input) input.value = '';
        if (item?.image_url) showPhotoPreview(item.image_url, 'Ảnh hiện tại — bấm để đổi');
        else showPhotoPreview('', 'Chọn ảnh món — bấm để tải lên');
    }

    function fillItemForm(item) {
        // Form mặc định gập lại. Bấm "Sửa" mà form vẫn đóng thì người dùng không
        // thấy gì xảy ra; bấm "Huỷ sửa" thì thu lại cho gọn.
        window.toggleAddBox?.('menu-item', Boolean(item));
        editingItemId = item ? item.id : null;
        $('menu-item-name').value = item ? item.name : '';
        $('menu-item-price').value = item ? Number(item.price) : '';
        $('menu-item-desc').value = item ? (item.description || '') : '';
        $('menu-item-category').value = item && item.category_id ? String(item.category_id) : '';
        // null -> ô trống, đúng nghĩa "không giới hạn". Dùng == null để bắt cả
        // undefined; nếu dùng || thì số 0 (hết sạch) cũng thành ô trống.
        $('menu-item-stock').value = item && item.stock_quantity != null ? String(item.stock_quantity) : '';
        $('menu-item-hide').value = item && item.hide_when_out === false ? 'false' : 'true';
        syncHideField();
        const submit = $('menu-item-submit');
        if (submit) {
            submit.innerHTML = item
                ? '<i class="ri-save-line"></i> Lưu thay đổi'
                : '<i class="ri-add-circle-line"></i> Thêm món';
        }
        $('menu-item-cancel')?.classList.toggle('hide', !item);
        resetPhotoField(item);
        if (item) $('menu-item-name').focus();
    }

    async function submitItem(event) {
        event.preventDefault();
        const name = $('menu-item-name').value.trim();
        const price = Number($('menu-item-price').value);
        const description = $('menu-item-desc').value.trim();
        const categoryId = $('menu-item-category').value;

        if (!name) return showToast('Cần tên món.', 'error');
        if (!Number.isFinite(price) || price < 0) return showToast('Giá không hợp lệ.', 'error');

        const rawStock = $('menu-item-stock').value.trim();
        if (rawStock !== '' && (!/^\d+$/.test(rawStock) || Number(rawStock) < 0)) {
            return showToast('Số lượng tồn phải là số nguyên không âm, hoặc để trống nếu không giới hạn.', 'error');
        }
        const payload = {
            name, price, description,
            categoryId: categoryId ? Number(categoryId) : null,
            // Chuỗi rỗng gửi lên nguyên vẹn: backend hiểu đó là "bỏ trống" tức
            // không giới hạn, khác hẳn với việc không gửi trường này.
            stockQuantity: rawStock === '' ? '' : Number(rawStock),
            hideWhenOut: $('menu-item-hide').value !== 'false',
        };
        const editing = editingItemId;
        try {
            const result = editing
                ? await fetchMenu(`/items/${editing}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                : await fetchMenu('/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

            // Backend dịch nền sau khi trả lời; đánh dấu để hỏi lại.
            if (result?.item?.id) pendingTranslation.add(result.item.id);
            else if (editing) pendingTranslation.add(editing);

            // Ảnh phải gửi SAU khi có id món. Người dùng chỉ thấy một thao tác,
            // bên dưới là hai bước — nhưng nếu bước ảnh hỏng thì món vẫn đã lưu,
            // nên báo riêng thay vì để tưởng cả việc thêm món thất bại.
            const savedId = result?.item?.id || editing;
            if (pendingPhoto && savedId) {
                try {
                    await uploadImage(savedId, pendingPhoto, { silent: true });
                } catch (photoError) {
                    showToast(`Đã lưu món, nhưng chưa tải được ảnh: ${photoError.message}`, 'error', 6000);
                }
            }

            fillItemForm(null);
            showToast(editing ? 'Đã lưu thay đổi.' : `Đã thêm "${name}". Đang dịch sang 4 ngôn ngữ…`, 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function toggleAvailability(id) {
        const item = ITEMS.find((i) => i.id === Number(id));
        if (!item) return;
        try {
            await fetchMenu(`/items/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAvailable: !item.is_available }),
            });
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function deleteItem(id) {
        const item = ITEMS.find((i) => i.id === Number(id));
        if (!item) return;
        const ok = await pastieConfirm(`Xoá món "${item.name}" khỏi thực đơn?`, {
            confirmText: 'Xoá món', danger: true,
        });
        if (!ok) return;
        try {
            await fetchMenu(`/items/${id}`, { method: 'DELETE' });
            showToast('Đã xoá món.', 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function uploadImage(id, file, { silent = false } = {}) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            if (silent) throw new Error('Chỉ nhận tệp ảnh.');
            return showToast('Chỉ nhận tệp ảnh.', 'error');
        }
        const card = document.querySelector(`[data-item="${id}"] .menu-thumb`);
        card?.classList.add('is-loading');
        try {
            const form = new FormData();
            form.append('file', file);
            // Không đặt Content-Type: để trình duyệt tự sinh boundary của multipart.
            const response = await authFetch(`${API_BASE}/api/agent/menu/items/${id}/image`, {
                method: 'POST', body: form,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Không tải được ảnh lên.');
            if (!silent) {
                showToast('Đã cập nhật ảnh món.', 'success');
                await load(true);
            }
        } catch (error) {
            card?.classList.remove('is-loading');
            if (silent) throw error;      // nơi gọi tự quyết định báo thế nào
            showToast(error.message, 'error');
        }
    }

    // --- Sửa bản dịch bằng tay ----------------------------------------------

    async function editTranslation(itemId, langCode) {
        const item = ITEMS.find((i) => i.id === Number(itemId));
        const lang = LANGS.find((l) => l.code === langCode);
        if (!item || !lang) return;
        const current = (item.translations || []).find((t) => t && t.lang === langCode);

        const value = await pastiePrompt(
            `${lang.label} — tên món`,
            current?.name || '',
            { hint: `Bản gốc: ${item.name}. Để trống rồi lưu sẽ xoá bản dịch tay và giữ bản AI.` }
        );
        if (value === null) return;
        try {
            await fetchMenu(`/items/${itemId}/translations/${langCode}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: value.trim(), description: current?.description || '' }),
            });
            showToast(`Đã lưu bản dịch ${lang.label}.`, 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // Hộp nhập một dòng. Dùng lại chính khung .confirm-overlay/.confirm-card của
    // pastieConfirm để không sinh thêm một phong cách modal thứ hai — dự án đã bỏ
    // hết prompt()/alert() gốc của trình duyệt.
    function pastiePrompt(title, initial = '', options = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-card menu-prompt-card" role="dialog" aria-modal="true">
                    <h3 class="confirm-title"></h3>
                    <input type="text" class="menu-prompt-input" aria-label="Giá trị">
                    <small class="org-field-hint menu-prompt-hint hide"></small>
                    <div class="confirm-actions">
                        <button type="button" class="confirm-cancel">Huỷ</button>
                        <button type="button" class="confirm-ok">Lưu</button>
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
            // Enter trong ô nhập là "lưu"; Enter ở chỗ khác không làm gì, tránh
            // lưu nhầm khi người dùng vừa bấm Tab sang nút Huỷ.
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

    // --- Kết nối phần mềm tính tiền ------------------------------------------
    //
    // Agent tự khai địa chỉ nhận dữ liệu của phần mềm tính tiền bên họ. Hai khoá
    // chỉ hiện ĐÚNG MỘT LẦN ngay sau khi tạo — về sau chỉ còn 6 ký tự cuối để đối
    // chiếu. Không lưu lại được thì phải tạo mới, và bản cũ ngừng hoạt động.

    let posState = null;

    // Tài liệu tích hợp do BACKEND phục vụ, mà console giờ nằm ở host riêng
    // (app.pastiechat.com) — nên đường dẫn phải tuyệt đối theo API_BASE. Để
    // href="/integrations/pos" thì trình duyệt hiểu là host của console và mở ra
    // chính trang đăng nhập, đúng lỗi đã gặp.
    //
    // Đặt ngay khi nạp file, không đợi API trả lời: liên kết phải dùng được kể
    // cả khi phần cấu hình POS lỗi.
    function setDocsLink(pathFromApi) {
        const link = $('menu-docs-link');
        if (link) link.href = `${API_BASE}${pathFromApi || '/integrations/pos'}`;
    }

    async function loadPos() {
        const box = $('menu-pos-box');
        if (!box) return;
        box.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
        try {
            posState = await orgFetch('/api/agent/pos-integration');
            setDocsLink(posState?.docsUrl);
            renderPos();
        } catch (error) {
            box.innerHTML = `<p class="org-empty is-error">${escapeHtml(error.message)}</p>`;
        }
    }

    function renderPos(freshCredentials) {
        const box = $('menu-pos-box');
        if (!box) return;
        const it = posState?.integration || null;

        box.innerHTML = `
            <div class="menu-pos">
                ${freshCredentials ? `
                <div class="menu-pos-keys">
                    <strong><i class="ri-key-2-line"></i> Lưu hai khoá này ngay — hệ thống sẽ không hiển thị lại</strong>
                    <label>API key <small>(gọi API đọc đơn về)</small>
                        <input type="text" readonly value="${escapeHtml(freshCredentials.apiKey)}" onclick="this.select()">
                    </label>
                    <label>Signing secret <small>(xác minh chữ ký webhook — không gửi cho ai)</small>
                        <input type="text" readonly value="${escapeHtml(freshCredentials.signingSecret)}" onclick="this.select()">
                    </label>
                </div>` : ''}

                <form class="menu-form" id="menu-pos-form" style="margin-top:${freshCredentials ? '12px' : '0'};">
                    <div class="menu-form-grid">
                        <label class="menu-field menu-field-name">
                            <span>Địa chỉ nhận dữ liệu (webhook URL)</span>
                            <input type="url" id="menu-pos-url" placeholder="https://pos-cua-ban.com/pastie/webhook"
                                   value="${escapeHtml(it?.webhook_url || '')}">
                        </label>
                        <label class="menu-field menu-field-price">
                            <span>Trạng thái</span>
                            <select id="menu-pos-active">
                                <option value="true"${it?.is_active !== false ? ' selected' : ''}>Đang bật</option>
                                <option value="false"${it?.is_active === false ? ' selected' : ''}>Tạm tắt</option>
                            </select>
                        </label>
                    </div>
                    <p class="menu-form-note">
                        <i class="ri-information-line"></i>
                        <span>${it
                            ? `Đang dùng API key <code>…${escapeHtml(it.api_key_suffix || '')}</code>.
                               Để trống địa chỉ webhook thì hệ thống vẫn ghi đủ mọi đơn, bên kia chủ động gọi API đọc về.`
                            : 'Lưu lần đầu sẽ sinh ra API key và signing secret. Gửi <b>đường dẫn tài liệu</b> ở trên cho bên viết phần mềm tính tiền.'}</span>
                    </p>
                    <div class="menu-form-actions">
                        <button type="submit" class="menu-btn-primary"><i class="ri-links-line"></i> ${it ? 'Lưu thay đổi' : 'Tạo kết nối'}</button>
                    </div>
                </form>
            </div>`;

        $('menu-pos-form')?.addEventListener('submit', savePos);
    }

    async function savePos(event) {
        event.preventDefault();
        const url = $('menu-pos-url').value.trim();
        if (url && !/^https:\/\//i.test(url)) {
            return showToast('Địa chỉ webhook phải bắt đầu bằng https:// — dữ liệu đơn hàng không gửi qua kênh không mã hoá.', 'error');
        }
        try {
            const result = await orgFetch('/api/agent/pos-integration', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ webhookUrl: url || null, isActive: $('menu-pos-active').value === 'true' }),
            });
            posState = await orgFetch('/api/agent/pos-integration');
            // credentials chỉ có mặt ở lần tạo đầu tiên.
            renderPos(result.credentials);
            showToast(result.credentials ? 'Đã tạo kết nối. Hãy lưu hai khoá ngay.' : 'Đã lưu kết nối.', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // --- Nối sự kiện ---------------------------------------------------------

    // "Khi hết hàng" chỉ có nghĩa khi đã điền số tồn. Làm mờ thay vì ẩn: ẩn thì
    // các ô khác nhảy chỗ mỗi lần gõ, mà người dùng cũng không biết là có nó.
    function syncHideField() {
        const idle = $('menu-item-stock')?.value.trim() === '';
        $('menu-item-hide-field')?.classList.toggle('is-idle', idle);
    }

    function bind() {
        setDocsLink();

        $('menu-item-photo')?.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                event.target.value = '';
                return showToast('Chỉ nhận tệp ảnh.', 'error');
            }
            // 5MB: ảnh món chụp bằng điện thoại thường 2–4MB, quá ngưỡng này gần
            // như luôn là ảnh chưa nén và sẽ làm thực đơn của khách tải chậm.
            if (file.size > 5 * 1024 * 1024) {
                event.target.value = '';
                return showToast('Ảnh quá 5MB. Chụp lại hoặc nén bớt giúp thực đơn của khách tải nhanh hơn.', 'error', 6000);
            }
            pendingPhoto = file;
            showPhotoPreview(URL.createObjectURL(file), `${file.name} — sẽ tải lên khi lưu`);
        });

        $('menu-item-photo-clear')?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            resetPhotoField(ITEMS.find((i) => i.id === editingItemId));
        });

        $('menu-item-stock')?.addEventListener('input', syncHideField);
        syncHideField();
        $('menu-category-form')?.addEventListener('submit', addCategory);
        $('menu-item-form')?.addEventListener('submit', submitItem);
        $('menu-item-cancel')?.addEventListener('click', () => fillItemForm(null));

        $('menu-category-list')?.addEventListener('click', (event) => {
            const rename = event.target.closest('[data-category-rename]');
            if (rename) return void renameCategory(rename.dataset.categoryRename);
            const toggle = event.target.closest('[data-category-toggle]');
            if (toggle) return void toggleCategory(toggle.dataset.categoryToggle);
            const remove = event.target.closest('[data-category-delete]');
            if (remove) return void deleteCategory(remove.dataset.categoryDelete);
        });

        const list = $('menu-item-list');
        list?.addEventListener('click', (event) => {
            const edit = event.target.closest('[data-item-edit]');
            if (edit) return fillItemForm(ITEMS.find((i) => i.id === Number(edit.dataset.itemEdit)));
            const remove = event.target.closest('[data-item-delete]');
            if (remove) return void deleteItem(remove.dataset.itemDelete);
            const avail = event.target.closest('[data-item-availability]');
            if (avail) return void toggleAvailability(avail.dataset.itemAvailability);
            const translate = event.target.closest('[data-translate]');
            if (translate) return void editTranslation(translate.dataset.translate, translate.dataset.lang);
        });
        list?.addEventListener('change', (event) => {
            const picker = event.target.closest('[data-image-for]');
            if (picker) void uploadImage(picker.dataset.imageFor, picker.files?.[0]);
        });

        $('menu-deferred-payment-save-btn')?.addEventListener('click', () => void saveDeferredPayment());
        $('menu-deferred-payment-select')?.addEventListener('change', () => void saveDeferredPayment());
    }

    async function loadDeferredPayment() {
        const select = $('menu-deferred-payment-select');
        if (!select) return;
        try {
            const data = await orgFetch('/api/agent/deferred-payment');
            if (data && data.mode) {
                select.value = data.mode;
            }
        } catch (e) {
            console.warn('Load deferred payment error:', e);
        }
    }

    async function saveDeferredPayment() {
        const select = $('menu-deferred-payment-select');
        const btn = $('menu-deferred-payment-save-btn');
        if (!select) return;
        const mode = select.value || 'none';
        if (btn) btn.disabled = true;
        try {
            await orgFetch('/api/agent/deferred-payment', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode }),
            });
            const labelMap = {
                none: 'Chỉ trả ngay (Tiền mặt, QR, Thẻ)',
                room_charge: 'Cộng vào tiền phòng (Room charge)',
                pay_later: 'Thanh toán sau (Pay later)',
            };
            showToast(`Đã lưu phương thức thanh toán: ${labelMap[mode] || mode}`, 'success');
        } catch (error) {
            showToast(error.message || 'Không lưu được thiết lập thanh toán.', 'error');
            void loadDeferredPayment();
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();

    // admin.js gọi vào đây khi người dùng mở thẻ "Thực đơn".
    window.MenuConsole = { load, reset: () => { CATEGORIES = []; ITEMS = []; pendingTranslation.clear(); } };
})();
