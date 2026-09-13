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

            // Món nào đã có đủ bản dịch cả 4 ngôn ngữ (en, ru, zh, ko) thì thôi chờ.
            for (const item of ITEMS) {
                if (pendingTranslation.has(item.id) && translatedCount(item) >= 4) {
                    pendingTranslation.delete(item.id);
                }
            }
            render();
            scheduleTranslationPoll();
            // TẠM TẮT phần kết nối phần mềm tính tiền (khối HTML cũng đã chú
            // thích lại trong admin.html). Không gọi nữa để khỏi mất một lượt
            // gọi mạng cho thứ đang không hiển thị. Bật lại: bỏ dấu chú thích ở
            // cả hai chỗ.
            // void loadPos();
            void loadMenuSettings();

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

    // --- Cấu hình thực đơn của quán: nhãn nút, bật/tắt, và PHÍ DỊCH VỤ --------
    //
    // Thẻ cấu hình này vốn nằm sẵn trong admin.html nhưng KHÔNG có mã nào nối
    // vào: bấm Lưu không xảy ra chuyện gì. Nay nối lại, đồng thời thêm ô phí
    // dịch vụ — khoản duy nhất còn được cộng thêm trên hóa đơn sau khi bỏ VAT
    // theo món (giá nhập vào đã là giá khách trả).
    // --- Cấu hình thực đơn của quán: nhãn nút, bật/tắt, PHÍ DỊCH VỤ & CHẾ ĐỘ BANNER --------
    let AGENT_POSTS = [];

    function updateShowcaseModeUi() {
        const selectedMode = document.querySelector('input[name="showcase_mode"]:checked')?.value || 'menu';
        const isBanner = selectedMode === 'banner';
        const bannerCard = $('agent-banner-settings-card');
        const menuFields = $('menu-mode-fields');
        const menuItemsSection = $('agent-menu-items-section');
        if (bannerCard) bannerCard.classList.toggle('hide', !isBanner);
        if (menuFields) menuFields.classList.toggle('hide', isBanner);
        if (menuItemsSection) menuItemsSection.classList.toggle('hide', isBanner);
        if (isBanner) {
            loadAgentPosts();
        }
    }

    async function loadMenuSettings() {
        const nutLuu = $('agent-menu-save-btn');
        if (!nutLuu) return;
        try {
            const data = await orgFetch('/api/agent/menu-settings');
            const bat = $('agent-menu-toggle-checkbox');
            if (bat) bat.checked = data.agent_menu_enabled !== false;
            const nhan = $('agent-menu-label-input');
            if (nhan) nhan.value = data.menu_custom_label || '';
            const phi = $('agent-service-fee-input');
            if (phi) phi.value = Number(data.service_fee_rate || 0) || '';

            const mode = data.showcase_mode || 'menu';
            if (mode === 'banner') {
                const rBanner = $('showcase-mode-banner');
                if (rBanner) rBanner.checked = true;
            } else {
                const rMenu = $('showcase-mode-menu');
                if (rMenu) rMenu.checked = true;
            }
            updateShowcaseModeUi();

            // Superadmin tắt tính năng thì nói rõ lý do, đừng để người dùng bấm
            // Lưu rồi nhận lỗi mà không hiểu vì sao.
            $('agent-menu-superadmin-warning')?.classList.toggle('hide', data.superadmin_menu_disabled !== true);
        } catch (error) {
            console.error('[Thực đơn] Không tải được cấu hình:', error.message);
        }

        // Lắng nghe đổi chế độ radio
        document.querySelectorAll('input[name="showcase_mode"]').forEach(r => {
            if (r.dataset.wired !== '1') {
                r.dataset.wired = '1';
                r.addEventListener('change', updateShowcaseModeUi);
            }
        });

        if (nutLuu.dataset.wired === '1') return;
        nutLuu.dataset.wired = '1';
        nutLuu.addEventListener('click', saveMenuSettings);
    }

    async function saveMenuSettings() {
        const nutLuu = $('agent-menu-save-btn');
        const rawPhi = ($('agent-service-fee-input')?.value || '').trim();
        const phi = rawPhi === '' ? 0 : Number(rawPhi);
        if (!Number.isFinite(phi) || phi < 0 || phi > 100) {
            return showToast('Phí dịch vụ phải là số từ 0 đến 100.', 'error');
        }
        const selectedMode = document.querySelector('input[name="showcase_mode"]:checked')?.value || 'menu';

        nutLuu.disabled = true;
        try {
            const data = await orgFetch('/api/agent/menu-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentMenuEnabled: $('agent-menu-toggle-checkbox')?.checked !== false,
                    menuCustomLabel: $('agent-menu-label-input')?.value.trim() || '',
                    serviceFeeRate: phi,
                    showcaseMode: selectedMode
                }),
            });
            showToast(selectedMode === 'banner'
                ? 'Đã lưu cấu hình. Quán đang hiển thị chế độ Banner & Bài viết.'
                : 'Đã lưu cấu hình. Quán đang hiển thị chế độ Thực đơn đặt món.', 'success');
            updateShowcaseModeUi();
        } catch (error) {
            showToast(error.message || 'Không lưu được cấu hình thực đơn.', 'error');
        } finally {
            nutLuu.disabled = false;
        }
    }

    // --- Quản lý Bài viết & Banner quảng bá (Slide kiểu Grab) -------------------

    async function loadAgentPosts() {
        const container = $('agent-posts-container');
        if (!container) return;
        try {
            const res = await orgFetch('/api/agent/posts');
            AGENT_POSTS = res.posts || [];
            renderAgentPosts();
        } catch (e) {
            console.error('[Banner] Không tải được bài viết:', e.message);
            container.innerHTML = `<div style="grid-column:1/-1;color:#ef4444;font-size:13px;">Không thể tải bài viết: ${escapeHtml(e.message)}</div>`;
        }
    }

    function renderAgentPosts() {
        const container = $('agent-posts-container');
        if (!container) return;
        if (AGENT_POSTS.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--text-muted);font-size:13px;border:1px dashed var(--panel-border);border-radius:8px;">
                    <i class="ri-slideshow-line" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.6;"></i>
                    Chưa có bài viết hoặc banner nào. Bấm <b>"Thêm bài viết mới"</b> để tạo slide quảng bá cho quán!
                </div>
            `;
            return;
        }

        container.innerHTML = AGENT_POSTS.map(p => {
            const cover = p.cover_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80';
            const statusBadge = p.is_active
                ? `<span style="background:rgba(16,185,129,0.15);color:#10b981;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">Đang hiện</span>`
                : `<span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">Đang ẩn</span>`;
            const featuredBadge = p.is_featured
                ? `<span style="background:rgba(245,158,11,0.2);color:#f59e0b;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">⭐ Nổi bật</span>`
                : '';
            return `
                <div class="glass-panel" style="border-radius:10px;overflow:hidden;border:1px solid var(--panel-border);background:rgba(255,255,255,0.02);display:flex;flex-direction:column;">
                    <div style="position:relative;height:120px;background:#000;">
                        <img src="${escapeHtml(cover)}" alt="" style="width:100%;height:100%;object-fit:cover;">
                        <span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.5px;">
                            ${escapeHtml(p.category || 'ƯU ĐÃI')}
                        </span>
                        <div style="position:absolute;top:8px;right:8px;display:flex;gap:4px;">${featuredBadge}${statusBadge}</div>
                    </div>
                    <div style="padding:12px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                        <div>
                            <h5 style="margin:0 0 6px;font-size:13.5px;font-weight:700;color:var(--text-primary);line-height:1.4;">${escapeHtml(p.title_vi)}</h5>
                            ${p.title_en ? `<div style="font-size:11.5px;color:var(--text-muted);margin-bottom:6px;">EN: ${escapeHtml(p.title_en)}</div>` : ''}
                            <p style="margin:0;font-size:12px;color:var(--text-secondary);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                                ${escapeHtml(p.excerpt_vi || p.content_vi || 'Chưa có tóm tắt...')}
                            </p>
                        </div>
                        <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--panel-border);padding-top:8px;">
                            <span style="font-size:11px;color:var(--text-muted);">Thứ tự: ${p.sort_order || 0}</span>
                            <div style="display:flex;gap:6px;">
                                <button type="button" class="icon-btn" data-post-edit="${p.id}" style="padding:4px 8px;border-radius:4px;border:1px solid var(--panel-border);background:transparent;cursor:pointer;color:var(--text-primary);" title="Sửa bài viết">
                                    <i class="ri-edit-line"></i> Sửa
                                </button>
                                <button type="button" class="icon-btn" data-post-delete="${p.id}" style="padding:4px 8px;border-radius:4px;border:1px solid rgba(239,68,68,0.25);background:transparent;cursor:pointer;color:#ef4444;" title="Xóa bài viết">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function uploadPostMediaFile(file) {
        if (!file) throw new Error('Chưa chọn tệp.');
        const mime = String(file.type || '').toLowerCase();
        const isImage = mime.startsWith('image/');
        const isVideo = mime.startsWith('video/');
        if (!isImage && !isVideo) {
            throw new Error('Chỉ hỗ trợ tệp hình ảnh (JPG, PNG, WebP) hoặc video (MP4, WebM).');
        }
        if (isImage && file.size > 10 * 1024 * 1024) {
            throw new Error('Ảnh quá lớn (tối đa 10MB). Vui lòng nén hoặc chọn ảnh khác.');
        }
        if (isVideo && file.size > 30 * 1024 * 1024) {
            throw new Error('Video quá lớn (tối đa 30MB). Vui lòng chọn video ngắn hơn.');
        }

        const formData = new FormData();
        formData.append('file', file);
        const data = await orgFetch('/api/agent/posts/upload-media', {
            method: 'POST',
            body: formData
        });
        return data; // { success: true, url, type, originalName }
    }

    function insertTextAtCursor(textarea, before, after = '') {
        if (!textarea) return;
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;
        const currentText = textarea.value;
        const selectedText = currentText.substring(start, end);
        const replacement = before + (selectedText || '') + after;
        textarea.value = currentText.substring(0, start) + replacement + currentText.substring(end);
        const newCursor = selectedText ? start + replacement.length : start + before.length;
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
    }

    function formatArticlePreviewHtml(raw) {
        if (!raw || !raw.trim()) {
            return '<p style="color:#94a3b8; font-style:italic;">Chưa có nội dung để xem trước...</p>';
        }
        if (/<(p|h[1-6]|img|video|blockquote|ul|ol|div|span|strong|em|br)\b[^>]*>/i.test(raw)) {
            return raw;
        }
        let html = raw.replace(/\[(?:ảnh|photo|image|anh)\s*:\s*([^\]]+)\]/gi, (match, url) => {
            const cleanUrl = url.trim();
            return `<figure class="article-embed-media" style="margin: 14px 0; text-align: center;"><img src="${escapeHtml(cleanUrl)}" alt="Hình ảnh bài viết" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" loading="lazy" /><figcaption style="font-size: 11.5px; color: #64748b; margin-top: 4px;">Hình ảnh đính kèm</figcaption></figure>`;
        });
        html = html.replace(/\[(?:video|clip|phim)\s*:\s*([^\]]+)\]/gi, (match, url) => {
            const cleanUrl = url.trim();
            return `<figure class="article-embed-media" style="margin: 14px 0; text-align: center;"><video src="${escapeHtml(cleanUrl)}" controls playsinline preload="metadata" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"></video><figcaption style="font-size: 11.5px; color: #64748b; margin-top: 4px;">Video đính kèm</figcaption></figure>`;
        });
        html = html.replace(/^###\s*(.+)$/gm, '<h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 16px 0 8px;">$1</h3>');
        html = html.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left: 3px solid #ef2b9d; padding: 6px 12px; margin: 10px 0; background: #fdf2f8; color: #831843; border-radius: 0 6px 6px 0;">$1</blockquote>');
        html = html.replace(/^[*-]\s*(.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        const paragraphs = html.split(/\n\s*\n/);
        return paragraphs.map(p => {
            const trimmed = p.trim();
            if (!trimmed) return '';
            if (/^(<h3|<blockquote|<ul|<figure)/.test(trimmed)) return trimmed;
            return `<p style="margin: 8px 0;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
        }).join('');
    }

    function updatePostCoverPreview(url) {
        if ($('post-form-cover-url')) $('post-form-cover-url').value = url || '';
        const previewBox = $('post-cover-preview-box');
        const uploadBox = $('post-cover-upload-box');
        const img = $('post-cover-preview-img');
        if (url) {
            if (img) img.src = url;
            previewBox?.classList.remove('hide');
            uploadBox?.classList.add('hide');
        } else {
            if (img) img.src = '';
            previewBox?.classList.add('hide');
            uploadBox?.classList.remove('hide');
        }
    }

    function switchPostContentTab(tab) {
        const editBtn = $('post-tab-edit-btn');
        const prevBtn = $('post-tab-preview-btn');
        const toolbar = $('post-editor-toolbar');
        const textarea = $('post-form-content-vi');
        const previewContainer = $('post-content-preview-container');
        const previewBody = $('post-content-preview-body');

        if (tab === 'preview') {
            if (editBtn) {
                editBtn.style.background = 'transparent';
                editBtn.style.color = '#64748b';
                editBtn.style.boxShadow = 'none';
            }
            if (prevBtn) {
                prevBtn.style.background = '#ffffff';
                prevBtn.style.color = '#0f172a';
                prevBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
            }
            if (toolbar) toolbar.style.display = 'none';
            if (textarea) textarea.style.display = 'none';
            if (previewContainer) previewContainer.classList.remove('hide');
            if (previewBody && textarea) {
                previewBody.innerHTML = formatArticlePreviewHtml(textarea.value);
            }
        } else {
            if (editBtn) {
                editBtn.style.background = '#ffffff';
                editBtn.style.color = '#0f172a';
                editBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
            }
            if (prevBtn) {
                prevBtn.style.background = 'transparent';
                prevBtn.style.color = '#64748b';
                prevBtn.style.boxShadow = 'none';
            }
            if (toolbar) toolbar.style.display = 'flex';
            if (textarea) {
                textarea.style.display = 'block';
                textarea.focus();
            }
            if (previewContainer) previewContainer.classList.add('hide');
        }
    }

    function setupPostModalEvents() {
        $('post-cover-upload-box')?.addEventListener('click', () => {
            $('post-cover-file-input')?.click();
        });
        $('post-cover-file-input')?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const statusEl = $('post-cover-upload-status');
            if (statusEl) statusEl.style.display = 'block';
            try {
                const data = await uploadPostMediaFile(file);
                updatePostCoverPreview(data.url);
                showToast('Đã tải ảnh bìa thành công!', 'success');
            } catch (err) {
                showToast(err.message || 'Không thể tải ảnh bìa.', 'error');
            } finally {
                if (statusEl) statusEl.style.display = 'none';
                e.target.value = '';
            }
        });
        $('post-cover-remove-btn')?.addEventListener('click', () => {
            updatePostCoverPreview('');
        });

        document.querySelectorAll('.post-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                const textarea = $('post-form-content-vi');
                if (tool === 'bold') insertTextAtCursor(textarea, '**', '**');
                else if (tool === 'italic') insertTextAtCursor(textarea, '*', '*');
                else if (tool === 'h3') insertTextAtCursor(textarea, '\n### Tiêu đề đoạn\n');
                else if (tool === 'list') insertTextAtCursor(textarea, '\n- Mục danh sách 1\n- Mục danh sách 2\n');
                else if (tool === 'quote') insertTextAtCursor(textarea, '\n> Hộp ghi chú / lưu ý nổi bật...\n');
            });
        });

        $('post-tool-upload-image')?.addEventListener('click', () => {
            $('post-content-image-input')?.click();
        });
        $('post-content-image-input')?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const statusEl = $('post-content-upload-status');
            if (statusEl) {
                statusEl.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang tải ảnh...';
                statusEl.style.display = 'inline-flex';
            }
            try {
                const data = await uploadPostMediaFile(file);
                const textarea = $('post-form-content-vi');
                insertTextAtCursor(textarea, `\n[ảnh: ${data.url}]\n`);
                showToast('Đã chèn ảnh vào bài viết!', 'success');
            } catch (err) {
                showToast(err.message || 'Không thể tải ảnh lên.', 'error');
            } finally {
                if (statusEl) statusEl.style.display = 'none';
                e.target.value = '';
            }
        });

        $('post-tool-upload-video')?.addEventListener('click', () => {
            $('post-content-video-input')?.click();
        });
        $('post-content-video-input')?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const statusEl = $('post-content-upload-status');
            if (statusEl) {
                statusEl.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang tải video...';
                statusEl.style.display = 'inline-flex';
            }
            try {
                const data = await uploadPostMediaFile(file);
                const textarea = $('post-form-content-vi');
                insertTextAtCursor(textarea, `\n[video: ${data.url}]\n`);
                showToast('Đã chèn video vào bài viết!', 'success');
            } catch (err) {
                showToast(err.message || 'Không thể tải video lên.', 'error');
            } finally {
                if (statusEl) statusEl.style.display = 'none';
                e.target.value = '';
            }
        });

        $('post-tab-edit-btn')?.addEventListener('click', () => switchPostContentTab('edit'));
        $('post-tab-preview-btn')?.addEventListener('click', () => switchPostContentTab('preview'));
    }

    function openPostModal(post = null) {
        const modal = $('agent-post-modal');
        if (!modal) return;
        const titleEl = $('agent-post-modal-title');
        $('post-form-id').value = post ? post.id : '';
        $('post-form-title-vi').value = post ? (post.title_vi || '') : '';
        $('post-form-title-en').value = post ? (post.title_en || '') : '';
        $('post-form-category').value = post ? (post.category || 'ƯU ĐÃI') : 'ƯU ĐÃI';
        $('post-form-sort-order').value = post ? (post.sort_order || 0) : 0;
        $('post-form-excerpt-vi').value = post ? (post.excerpt_vi || '') : '';
        $('post-form-content-vi').value = post ? (post.content_vi || '') : '';
        $('post-form-is-featured').checked = post ? Boolean(post.is_featured) : false;
        $('post-form-is-active').checked = post ? (post.is_active !== false) : true;

        updatePostCoverPreview(post ? (post.cover_url || '') : '');
        switchPostContentTab('edit');

        if (titleEl) {
            titleEl.innerHTML = `<i class="ri-article-line" style="color:#f59e0b;"></i> <span>${post ? 'Chỉnh sửa bài viết' : 'Thêm bài viết & Banner mới'}</span>`;
        }
        modal.classList.remove('hide');
    }

    function closePostModal() {
        $('agent-post-modal')?.classList.add('hide');
    }

    async function handlePostFormSubmit(e) {
        e.preventDefault();
        const id = $('post-form-id').value;
        const payload = {
            titleVi: $('post-form-title-vi').value.trim(),
            titleEn: $('post-form-title-en').value.trim() || null,
            category: $('post-form-category').value.trim() || 'ƯU ĐÃI',
            sortOrder: Number($('post-form-sort-order').value) || 0,
            coverUrl: $('post-form-cover-url').value.trim(),
            excerptVi: $('post-form-excerpt-vi').value.trim() || null,
            contentVi: $('post-form-content-vi').value.trim() || null,
            isFeatured: $('post-form-is-featured').checked,
            isActive: $('post-form-is-active').checked
        };

        if (!payload.titleVi) return showToast('Vui lòng nhập tiêu đề tiếng Việt.', 'error');
        if (!payload.coverUrl) return showToast('Vui lòng tải ảnh bìa banner cho bài viết.', 'error');

        const btn = $('agent-post-modal-save-btn');
        if (btn) btn.disabled = true;

        try {
            if (id) {
                await orgFetch(`/api/agent/posts/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                showToast('Đã cập nhật bài viết thành công!', 'success');
            } else {
                await orgFetch('/api/agent/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                showToast('Đã thêm bài viết mới thành công!', 'success');
            }
            closePostModal();
            loadAgentPosts();
        } catch (err) {
            showToast(err.message || 'Lỗi khi lưu bài viết.', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function deleteAgentPost(postId) {
        if (!confirm('Bạn có chắc chắn muốn xóa bài viết/banner này?')) return;
        try {
            await orgFetch(`/api/agent/posts/${postId}`, { method: 'DELETE' });
            showToast('Đã xóa bài viết.', 'success');
            loadAgentPosts();
        } catch (e) {
            showToast(e.message || 'Không thể xóa bài viết.', 'error');
        }
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

        $('agent-post-add-btn')?.addEventListener('click', () => openPostModal(null));
        $('agent-post-modal-close-btn')?.addEventListener('click', closePostModal);
        $('agent-post-modal-cancel-btn')?.addEventListener('click', closePostModal);
        $('agent-post-form')?.addEventListener('submit', handlePostFormSubmit);
        setupPostModalEvents();

        $('agent-posts-container')?.addEventListener('click', (event) => {
            const edit = event.target.closest('[data-post-edit]');
            if (edit) {
                const p = AGENT_POSTS.find(x => x.id === Number(edit.dataset.postEdit));
                if (p) openPostModal(p);
                return;
            }
            const del = event.target.closest('[data-post-delete]');
            if (del) {
                deleteAgentPost(del.dataset.postDelete);
                return;
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();

    // admin.js gọi vào đây khi người dùng mở thẻ "Thực đơn".
    window.MenuConsole = { load, reset: () => { CATEGORIES = []; ITEMS = []; pendingTranslation.clear(); } };
})();
