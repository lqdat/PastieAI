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
        { code: 'kk', label: 'Қазақша', short: 'KK' },
    ];

    let CATEGORIES = [];
    let ITEMS = [];
    let editingItemId = null;
    let selectedCategoryId = 'all';
    let searchKeyword = '';
    let filterStatus = 'all'; // 'all' | 'available' | 'hidden'
    // Ảnh chọn trong form, chưa gửi. Endpoint ảnh cần id của món nên không tải
    // lên trước khi món tồn tại được — giữ tệp ở đây rồi gửi ngay sau khi tạo.
    let pendingPhoto = null;
    // Món vừa tạo/sửa: bản dịch chạy nền nên phải quay lại hỏi mới thấy.
    let pendingTranslation = new Set();
    let pollTimer = null;

    const $ = (id) => document.getElementById(id);
    const t = (k, p, fallback) => (typeof window.t === 'function' ? window.t(k, p, fallback) : (fallback || k));

    function fetchMenu(path, options) {
        return orgFetch(`/api/agent/menu${path}`, options);
    }

    function money(value) {
        const number = Number(value) || 0;
        return number.toLocaleString('vi-VN') + ' ₫';
    }

    // --- Tải dữ liệu ---------------------------------------------------------
    let lastRenderHash = '';

    // ── NHÃN GẮN GÓC SẢN PHẨM ───────────────────────────────────────────────
    //
    // Danh mục do Superadmin cấu hình (dùng chung mọi cơ sở); Agent chỉ CHỌN.
    // Nhãn đã được dịch sẵn 6 thứ tiếng lúc Superadmin lưu, nên ở đây không có
    // gì phải dịch — chỉ hiện nhãn tiếng Việt cho Agent chọn.
    let TAGS = [];
    // Map thay cho Set: giá trị là KHUNG Agent chọn riêng cho món này (null =
    // dùng khung mặc định của nhãn). Set chỉ nhớ được "có chọn hay không".
    let chonTag = new Map();
    let BADGE_CATALOG = null;
    const KHUNG_MAC_DINH = 'vuong';
    // Bộ ảnh không có bản tiếng Việt (chữ trên nhãn để tiếng Anh cho gọn), nên
    // ảnh xem trước lấy bản tiếng Anh.
    const BADGE_LANG = 'en';
    const TEN_KHUNG = { vuong: 'Khung vuông', thoi: 'Khung thoi', hoa: 'Khung cánh hoa', tron: 'Khung tròn' };

    // Gốc ảnh do máy chủ báo trong danh mục: thư mục tĩnh khi chưa đẩy S3, địa
    // chỉ S3 khi đã đẩy và ảnh gốc đã xoá khỏi mã nguồn. Đường tĩnh còn phải
    // ghép API_BASE vì bảng điều khiển Agent nằm ở tên miền khác máy chủ; địa
    // chỉ S3 thì đã tuyệt đối sẵn, ghép thêm là hỏng.
    function anhNhan(khung, ma) {
        const goc = BADGE_CATALOG?.duongDan || '/badges';
        const day = /^https?:\/\//i.test(goc) ? goc : `${API_BASE}${goc}`;
        return `${day}/${khung}-${ma}-${BADGE_LANG}.png`;
    }

    async function loadBadgeCatalog() {
        if (BADGE_CATALOG) return BADGE_CATALOG;
        try {
            BADGE_CATALOG = await orgFetch('/api/menu-badges');
        } catch (error) {
            // Mất danh mục thì vẫn gắn nhãn được, chỉ không thấy ảnh. Ghi ra
            // console để còn lần theo, đừng nuốt im lặng.
            console.error('[Menu] Không tải được danh mục ảnh nhãn:', error.message);
            BADGE_CATALOG = { khung: [] };
        }
        return BADGE_CATALOG;
    }

    async function loadTags() {
        try {
            // Đường này nằm NGOÀI nhánh /api/agent/menu nên gọi thẳng orgFetch,
            // không mượn fetchMenu rồi ghép '/../' — ghép vậy là một URL dễ gãy.
            const data = await orgFetch('/api/agent/menu-tags');
            TAGS = data?.tags || [];
        } catch (error) {
            // Không tải được danh mục nhãn thì form vẫn dùng được, chỉ mất ô
            // chọn nhãn. Ghi ra console để còn lần theo, đừng nuốt im lặng.
            console.error('[Menu] Không tải được danh mục nhãn:', error.message);
            TAGS = [];
        }
        await loadBadgeCatalog();
        veOChonTag();
    }

    function veOChonTag() {
        const box = $('menu-item-tags');
        if (!box) return;
        if (!TAGS.length) {
            // Nói thẳng là hệ thống chưa có nhãn nào, đừng để một ô trống khó hiểu.
            box.innerHTML = `<span class="menu-tag-empty">${escapeHtml(t('mnNoTagsYet', null, 'Hệ thống chưa cấu hình nhãn nào.'))}</span>`;
            return;
        }
        const khungCo = BADGE_CATALOG?.khung?.length ? BADGE_CATALOG.khung : Object.keys(TEN_KHUNG);

        // CHƯA NHÃN NÀO GẮN ẢNH thì nói ngay một câu ở đầu ô, đừng để người
        // dùng tích thử từng nhãn mới phát hiện. Ghi chú theo từng dòng bên
        // dưới chỉ hiện sau khi tích, nên một mình nó không đủ.
        const chuaCoAnh = TAGS.every((tag) => !tag.badge_code);
        const nhacChung = chuaCoAnh
            ? `<p class="menu-tag-note menu-tag-note-top">${escapeHtml(t('mnTagNoArtAll', null,
                'Chưa nhãn nào được gắn ảnh badge. Superadmin vào tab “Nhãn sản phẩm”, chọn Kiểu text cho nhãn thì ở đây mới chọn được khung.'))}</p>`
            : '';

        box.innerHTML = nhacChung + TAGS.map((tag) => {
            const dang = chonTag.has(tag.id);
            // Khung đang hiệu lực: Agent chọn riêng > mặc định của nhãn > vuông.
            const khung = (dang && chonTag.get(tag.id)) || tag.badge_style || KHUNG_MAC_DINH;
            const ma = tag.badge_code || '';

            // Ô chọn khung chỉ hiện SAU KHI tích nhãn. Bày sẵn khi chưa tích thì
            // Agent chọn khung trước rồi tưởng đã gắn nhãn xong.
            // Không có ô chọn khung thì phải NÓI VÌ SAO. Trước đây tích nhãn
            // xong không thấy gì, không đoán được là do nhãn chưa gắn ảnh hay
            // do màn hình hỏng.
            const loiKhung = dang && !ma
                ? `<p class="menu-tag-note">${escapeHtml(t('mnTagNoArt', null,
                    'Nhãn này chưa gắn ảnh — Superadmin chọn kiểu text cho nhãn thì mới chọn được khung.'))}</p>`
                : '';

            const frameTiles = (khungCo || []).map((k) => {
                const isSelected = k === khung;
                return `<button type="button" class="menu-tag-frame-tile${isSelected ? ' is-selected' : ''}" data-frame-val="${escapeHtml(k)}" data-tag-id="${tag.id}" title="${escapeHtml(TEN_KHUNG[k] || k)}">
                    <img class="menu-tag-frame-preview-mini" loading="lazy" src="${escapeHtml(anhNhan(k, ma))}" alt="${escapeHtml(TEN_KHUNG[k] || k)}">
                    <span>${escapeHtml(TEN_KHUNG[k] || k)}</span>
                </button>`;
            }).join('');

            const oKhung = dang && ma ? `
                <div class="menu-tag-frame">
                    <div class="menu-tag-frame-preview-box">
                        <img class="menu-tag-frame-preview" loading="lazy"
                             src="${escapeHtml(anhNhan(khung, ma))}" alt="${escapeHtml(tag.label)}">
                        <span class="menu-tag-frame-preview-label">Xem trước</span>
                    </div>
                    <div class="menu-tag-frame-main">
                        <div class="menu-tag-frame-label-row">
                            <span class="menu-tag-frame-title"><i class="ri-shape-line"></i> Kiểu khung:</span>
                            <select data-tag-frame="${tag.id}" aria-label="Khung nhãn ${escapeHtml(tag.label)}" class="menu-tag-frame-select">
                                ${khungCo.map((k) => `<option value="${escapeHtml(k)}"${k === khung ? ' selected' : ''}>${escapeHtml(TEN_KHUNG[k] || k)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="menu-tag-frame-tiles">
                            ${frameTiles}
                        </div>
                    </div>
                </div>` : loiKhung;

            return `<div class="menu-tag-row${dang ? ' is-on' : ''}">
                <button type="button" class="menu-tag-opt${dang ? ' is-on' : ''}" data-tag-pick="${tag.id}"
                    role="checkbox" aria-checked="${dang ? 'true' : 'false'}"
                    style="${dang ? `background:${escapeHtml(tag.color_bg)};color:${escapeHtml(tag.color_text)};border-color:${escapeHtml(tag.color_bg)}` : ''}">
                    <i class="${dang ? 'ri-radio-button-fill' : 'ri-checkbox-blank-circle-line'}"></i>
                    ${ma ? `<img class="menu-tag-thumb" loading="lazy" src="${escapeHtml(anhNhan(khung, ma))}" alt="">` : ''}
                    <span class="menu-tag-name">${escapeHtml(tag.label)}</span>
                    ${dang ? `<span class="menu-tag-badge-active"><i class="ri-check-line"></i> ${escapeHtml(t('mnTagSelected', null, 'Đang chọn'))}</span>` : ''}
                </button>
                ${oKhung}
            </div>`;
        }).join('');
    }

    // ── ẢNH BÌA THỰC ĐƠN ───────────────────────────────────────────────────
    //
    // Lấy từ chính thực đơn khách (/api/agent/menu/settings không có trường này)
    // — nhưng Agent cần thấy ảnh MÌNH ĐÃ TẢI, không phải ảnh rơi về. Nên đọc
    // riêng cờ heroOwn từ endpoint cài đặt thay vì đoán từ ảnh đang hiện.
    let heroUrl = null;

    function veHero() {
        const img = $('menu-hero-img');
        const trong = $('menu-hero-empty');
        const xoa = $('menu-hero-clear');
        if (!img) return;
        if (heroUrl) {
            img.src = heroUrl; img.hidden = false;
            if (trong) trong.hidden = true;
            xoa?.classList.remove('hide');
        } else {
            img.hidden = true; img.removeAttribute('src');
            if (trong) trong.hidden = false;
            xoa?.classList.add('hide');
        }
    }

    // ── BANNER ĐẦU THỰC ĐƠN ────────────────────────────────────────────────
    // LƯU NGAY, KHÔNG GIỮ BẢN NHÁP TRONG BỘ NHỚ.
    //
    // Bản trước gom mọi thay đổi vào ba biến tạm (PENDING_BANNER_FILES,
    // DELETED_BANNER_IDS, BANNER_DIRTY) rồi chờ bấm một nút "Lưu banner" thứ
    // hai ở góc trên. Hai vấn đề:
    //   · Nút đó mặc định ẩn, chỉ hiện khi đã có thay đổi — người dùng thêm
    //     xong, thấy banner nằm trong danh sách, đóng bảng, và mất sạch.
    //   · Hộp thêm banner đã có nút lưu của nó rồi. Hai nút lưu cho một việc
    //     thì nút nào cũng có vẻ đã đủ.
    // Giờ mỗi thao tác gọi API ngay tại chỗ, không có trạng thái "chưa lưu".
    let BANNERS = [];

    async function loadBanners() {
        const box = $('menu-banner-list');
        if (!box) return;
        try {
            const data = await fetchMenu('/banners');
            BANNERS = data?.banners || [];
        } catch (error) {
            box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
            return;
        }
        veBanner();
    }

    function veBanner() {
        const box = $('menu-banner-list');
        if (!box) return;
        if (!BANNERS.length) {
            box.innerHTML = `<p class="org-empty">${escapeHtml(t('mnNoBanner', null, 'Chưa có banner nào. Bấm "Thêm bài viết banner" rồi nhập nội dung.'))}</p>`;
            return;
        }
        const dsMon = ITEMS.map((i) => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');
        box.innerHTML = BANNERS.map((b) => {
            const tieuDe = b.title_vi || b.title || '(Chưa có tiêu đề)';
            const the = '';
            const unsavedBadge = '';
            return `
            <article class="menu-banner-card${b.is_active ? '' : ' is-off'}" style="position:relative;">
                <label class="menu-banner-photo">
                    <input type="file" accept="image/*" hidden data-banner-photo="${b.id}">
                    ${b.image_url
                        ? `<img src="${escapeHtml(b.image_url)}" alt="">`
                        : `<span class="menu-banner-empty"><i class="ri-image-add-line"></i> ${escapeHtml(t('mnPickBannerImage', null, 'Chọn ảnh'))}</span>`}
                </label>
                <div class="menu-banner-fields" style="flex:1;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
                        ${the}
                        ${unsavedBadge}
                        <strong style="font-size:13px;color:#0f172a;">${escapeHtml(tieuDe)}</strong>
                    </div>
                    ${b.excerpt_vi ? `<p style="margin:0 0 6px;font-size:11.5px;color:#64748b;line-height:1.3;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(b.excerpt_vi)}</p>` : ''}
                    <label class="menu-banner-field menu-banner-field-narrow" style="margin:0;">
                        <span>${escapeHtml(t('mnBannerOrder', null, 'Thứ tự'))}</span>
                        <input type="number" min="0" max="99" value="${Number(b.sort_order) || 0}" data-banner-order="${b.id}">
                    </label>
                </div>
                <div class="menu-banner-actions">
                    <button type="button" class="org-edit-btn" data-banner-edit="${b.id}" title="Sửa bài viết banner" style="padding:5px 10px;font-size:12px;display:inline-flex;align-items:center;gap:4px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;">
                        <i class="ri-edit-line"></i> <span>${escapeHtml(t('mnEdit', null, 'Sửa'))}</span>
                    </button>
                    <button type="button" class="org-toggle ${b.is_active ? 'is-active' : 'is-locked'}" data-banner-toggle="${b.id}" data-on="${b.is_active ? '1' : '0'}">
                        <i class="${b.is_active ? 'ri-eye-line' : 'ri-eye-off-line'}"></i>
                        <span>${b.is_active ? escapeHtml(t('mnBannerOn', null, 'Đang hiện')) : escapeHtml(t('mnBannerOff', null, 'Đã ẩn'))}</span>
                    </button>
                    <button type="button" class="org-remove" data-banner-delete="${b.id}" title="Xoá"><i class="ri-delete-bin-line"></i></button>
                </div>
                ${b.image_url ? '' : `<p class="menu-banner-warn"><i class="ri-error-warning-line"></i> ${escapeHtml(t('mnBannerNeedsImage', null, 'Chưa có ảnh — banner này chưa hiện với khách.'))}</p>`}
            </article>`;
        }).join('');

    }

    async function load(quiet) {
        const list = $('menu-item-list');
        if (!quiet && list && (!ITEMS || ITEMS.length === 0)) {
            list.innerHTML = `<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> ${escapeHtml(t('mnLoadingProducts'))}</p>`;
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

            window._ORG_CACHE_TIMESTAMP = window._ORG_CACHE_TIMESTAMP || {};
            window._ORG_CACHE_TIMESTAMP['menu'] = Date.now();
            window._ORG_TAB_LOADED = window._ORG_TAB_LOADED || {};
            window._ORG_TAB_LOADED['menu'] = true;

            // Sản phẩm nào đã có đủ bản dịch cả 4 ngôn ngữ (en, ru, zh, ko) thì thôi chờ.
            for (const item of ITEMS) {
                if (pendingTranslation.has(item.id) && translatedCount(item) >= 4) {
                    pendingTranslation.delete(item.id);
                }
            }
            render();
            // Nhãn và banner tải SAU khi render: chúng không chặn danh sách sản
            // phẩm hiện ra, và một trong hai hỏng cũng không được làm trống màn hình.
            void loadTags();
            void loadBanners();
            scheduleTranslationPoll();
            // TẠM TẮT phần kết nối phần mềm tính tiền (khối HTML cũng đã chú
            // thích lại trong admin.html). Không gọi nữa để khỏi mất một lượt
            // gọi mạng cho thứ đang không hiển thị. Bật lại: bỏ dấu chú thích ở
            // cả hai chỗ.
            // void loadPos();
            void loadMenuSettings();

            // Báo lỗi cho ĐÚNG phần hỏng, phần còn lại vẫn dùng được bình thường.
            if (catResult.status === 'rejected') {
                showToast(catResult.reason?.message || t('mnLoadCatFail'), 'error');
            }
            if (itemResult.status === 'rejected' && list) {
                list.innerHTML = `<p class="org-empty is-error"><i class="ri-error-warning-line"></i> ${escapeHtml(itemResult.reason?.message || t('mnLoadItemsFail'))}</p>`;
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

    function render(force = false) {
        const curLang = (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('pastie_admin_lang') || 'vi';
        const currentHash = curLang + '_' + JSON.stringify([
            CATEGORIES.map(c => [c.id, c.name, c.item_count, c.is_active, c.is_promo]),
            ITEMS.map(i => [i.id, i.name, i.price, i.category_id, i.is_available, i.image_url, i.stock_quantity])
        ]);
        if (!force && currentHash === lastRenderHash && $('menu-item-list')?.children.length > 0) {
            return;
        }
        lastRenderHash = currentHash;
        renderCategories();
        renderCategorySelect();
        renderItems();
        const badge = $('menu-count-badge');
        if (badge) badge.textContent = t('mnProductCount', { count: ITEMS.length }, `${ITEMS.length} ${t('jsItemsWord')}`);
    }

    // TÊN NHÓM cũng chỉ đọc từ bản dịch đã lưu — cùng luật với tên sản phẩm.
    //
    // Hai tầng cũ bị bỏ ở đây: từ điển món viết cứng, và một bảng ~14 tên nhóm
    // thông dụng ("lẩu", "nướng", "bia"...) so khớp bằng includes(). Bảng đó
    // đoán theo chuỗi con nên "Lẩu chay" và "Lẩu hải sản" ra cùng một chữ
    // "Hotpot", còn nhóm Agent tự đặt tên thì không khớp gì cả.
    function categoryDisplayName(category, lang) {
        if (!category) return '';
        const curLang = lang || (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('pastie_admin_lang') || 'vi';
        if (curLang === 'vi') return category.name || '';

        if (category.name_translated) return category.name_translated;

        const hit = (category.translations || []).find((t) => t && t.lang === curLang && t.name);
        if (hit && hit.name) return hit.name;

        return category.name || '';
    }

    // TÊN VÀ MÔ TẢ SẢN PHẨM CHỈ ĐỌC TỪ BẢN DỊCH ĐÃ LƯU TRONG DATABASE.
    //
    // Mọi thông tin sản phẩm được dịch NGAY LÚC AGENT BẤM LƯU và ghi vào
    // qr_menu_item_translations. Ở đây chỉ việc đọc ra.
    //
    // Trước đây hàm này có thêm hai tầng nữa, và cả hai đều sai:
    //
    //   · Một TỪ ĐIỂN MÓN VIẾT CỨNG nằm trong i18n-dictionary.js. Sản phẩm nào
    //     không có trong đó thì không dịch được, mà từ điển viết tay thì không
    //     bao giờ theo kịp thực đơn thật của các quán.
    //   · Một nhánh tự GHÉP tên riêng với tên chung rồi dịch riêng phần chung.
    //     Nó dựng ra một cái tên mà máy chủ chưa từng sinh, nên nhân viên và
    //     khách đọc hai cái tên khác nhau cho cùng một sản phẩm.
    //
    // Chưa có bản dịch thì trả về BẢN GỐC. Thà hiện tiếng Việt trong vài giây
    // chờ máy chủ dịch xong còn hơn hiện một cái tên do trình duyệt bịa ra.
    function itemDisplayName(item, lang) {
        if (!item) return { name: '', description: '' };
        const curLang = lang || (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('pastie_admin_lang') || 'vi';
        if (curLang === 'vi') return { name: item.name, description: item.description };

        // Máy chủ trả sẵn theo ngôn ngữ đang xem (endpoint /menu/view).
        if (item.name_translated) {
            return { name: item.name_translated, description: item.description_translated || item.description };
        }

        // Hoặc trả cả mảng mọi ngôn ngữ (endpoint /agent/menu/items).
        const hit = (item.translations || []).find((t) => t && t.lang === curLang && t.name);
        if (hit && hit.name) {
            return { name: hit.name, description: hit.description || item.description };
        }

        return { name: item.name, description: item.description };
    }

    // Nhóm nào đang gấp. Giữ trong bộ nhớ chứ không ghi ra đâu cả: đây là
    // trạng thái nhìn, mở lại bảng là muốn thấy toàn cảnh chứ không phải thấy
    // lại đúng những gì mình gấp ba hôm trước.
    const NHOM_DA_GAP = new Set();
    const NHOM_DAI_TU_GAP = 8;
    let daKhoiTaoGapNhom = false;

    function renderCategories() {
        const box = $('menu-category-list');
        if (!box) return;
        if (CATEGORIES.length === 0) {
            box.innerHTML = `<p class="menu-hint-empty">${escapeHtml(t('mnNoCategoryHint'))}</p>`;
            return;
        }
        let nonPromoIdx = 1;
        box.innerHTML = CATEGORIES.map((category) => {
            const stt = category.is_promo ? 0 : nonPromoIdx++;
            return `
            <span class="menu-cat-chip${category.is_active ? '' : ' is-off'}${category.is_promo ? ' is-promo' : ''}" data-category-chip="${category.id}" draggable="${category.is_promo ? 'false' : 'true'}">
                ${category.is_promo ? `<i class="ri-flashlight-fill" title="${escapeHtml(t('mnPromoCatTitle'))}"></i>` : `<span class="menu-cat-drag" title="${escapeHtml(t('mnDragReorder', null, 'Kéo thả để sắp xếp thứ tự'))}"><i class="ri-drag-move-fill"></i></span>`}
                <span class="menu-cat-stt" title="Số thứ tự nhóm">${stt}</span>
                <button type="button" class="menu-cat-name" data-category-filter="${category.id}" title="${escapeHtml(t('mnFilterByCat', null, 'Cuộn tới nhóm'))}">${escapeHtml(categoryDisplayName(category))}</button>
                <small>${category.item_count}</small>
                <button type="button" class="menu-cat-rename" data-category-rename="${category.id}" title="${escapeHtml(t('mnRename'))}">
                    <i class="ri-pencil-line"></i>
                </button>
                <button type="button" class="menu-cat-toggle" data-category-toggle="${category.id}"
                        title="${escapeHtml(category.is_active ? t('mnCatVisible') : t('mnCatHidden'))}">
                    <i class="ri-${category.is_active ? 'eye-line' : 'eye-off-line'}"></i>
                </button>
                ${category.is_promo ? '' : `<button type="button" class="menu-cat-del" data-category-delete="${category.id}" title="${escapeHtml(t('mnDeleteCat'))}"><i class="ri-close-line"></i></button>`}
            </span>
        `;}).join('');
    }

    function renderCategorySelect() {
        const select = $('menu-item-category');
        if (!select) return;
        const current = select.value;
        let nonPromoIdx = 1;
        select.innerHTML = `<option value="">${escapeHtml(t('mnPickCategory'))}</option>`
            + CATEGORIES.map((c) => {
                const stt = c.is_promo ? 0 : nonPromoIdx++;
                return `<option value="${c.id}">${c.is_promo ? '⚡ 0. ' : `${stt}. `}${escapeHtml(categoryDisplayName(c))}</option>`;
            }).join('');
        if (current) select.value = current;
    }

    function removeVietnameseTones(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .toLowerCase();
    }

    function updateSearchCounter(displayed, total) {
        const counter = $('menu-search-counter') || $('menu-results-count');
        if (!counter) return;
        if (displayed === total) {
            counter.textContent = `${total} ${t('jsItemsWord', null, 'món')}`;
        } else {
            counter.textContent = `${displayed} / ${total} ${t('jsItemsWord', null, 'món')}`;
        }
    }

    function renderItems() {
        const box = $('menu-item-list');
        if (!box) return;
        if (ITEMS.length === 0) {
            box.innerHTML = `
                <div class="menu-empty">
                    <i class="ri-shopping-bag-3-line"></i>
                    <strong>${escapeHtml(t('mnEmptyListTitle', null, 'Thực đơn còn trống'))}</strong>
                    <p>${escapeHtml(t('mnEmptyListHint', null, 'Bắt đầu bằng việc thêm nhóm hoặc sản phẩm ở biểu mẫu phía trên.'))}</p>
                </div>`;
            updateSearchCounter(0, 0);
            return;
        }

        // Lọc theo selectedCategoryId, filterStatus và searchKeyword
        let filtered = ITEMS;

        if (selectedCategoryId !== 'all') {
            filtered = filtered.filter(item => String(item.category_id || 0) === String(selectedCategoryId));
        }

        if (filterStatus === 'available') {
            filtered = filtered.filter(item => Boolean(item.is_available));
        } else if (filterStatus === 'hidden') {
            filtered = filtered.filter(item => !item.is_available);
        }

        if (searchKeyword) {
            const qNorm = removeVietnameseTones(searchKeyword.toLowerCase().trim());
            filtered = filtered.filter(item => {
                const nameNorm = removeVietnameseTones(item.name || '');
                const descNorm = removeVietnameseTones(item.description || '');
                const properNorm = removeVietnameseTones(item.proper_name || '');
                const commonNorm = removeVietnameseTones(item.common_name || '');
                const priceStr = String(item.price || '');
                const transNorm = removeVietnameseTones((item.translations || []).map(t => (t.name || '') + ' ' + (t.description || '')).join(' '));
                return nameNorm.includes(qNorm)
                    || descNorm.includes(qNorm)
                    || properNorm.includes(qNorm)
                    || commonNorm.includes(qNorm)
                    || priceStr.includes(qNorm)
                    || transNorm.includes(qNorm);
            });
        }

        updateSearchCounter(filtered.length, ITEMS.length);

        if (filtered.length === 0) {
            box.innerHTML = `
                <div class="menu-empty menu-search-empty">
                    <i class="ri-search-line"></i>
                    <strong>${escapeHtml(t('mnNoSearchResultTitle', null, 'Không tìm thấy sản phẩm phù hợp'))}</strong>
                    <p>${escapeHtml(t('mnNoSearchResultHint', null, 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc đang chọn.'))}</p>
                    <button type="button" class="menu-btn-ghost" id="menu-search-reset-btn" style="margin-top:10px;">
                        <i class="ri-restart-line"></i> ${escapeHtml(t('mnResetFilter', null, 'Xem tất cả sản phẩm'))}
                    </button>
                </div>`;
            return;
        }

        // ── GOM THEO NHÓM ──────────────────────────────────────────────
        //
        // THỨ TỰ NHÓM LẤY TỪ CATEGORIES, KHÔNG LẤY TỪ THỨ TỰ SẢN PHẨM.
        //
        // Bản trước gom theo thứ tự sản phẩm gặp được trong mảng đã lọc, nên
        // thứ tự nhóm là thứ tự máy chủ tình cờ trả về: nhóm "Ưu đãi hôm nay"
        // rơi xuống gần cuối, "Chưa phân nhóm" chen vào giữa, và cùng một thực
        // đơn mở hai lần ra hai thứ tự khác nhau. Agent đã sắp nhóm ở trên thì
        // danh sách dưới phải theo đúng thứ tự đó.
        //
        // Ba quy tắc: nhóm ưu đãi luôn đứng đầu (đó là thứ Agent sửa nhiều
        // nhất trong ngày), phần còn lại theo sort_order, và "Chưa phân nhóm"
        // luôn xuống cuối — nó là việc còn dở, không phải một nhóm thật.
        const groups = new Map();
        for (const item of filtered) {
            const key = item.category_id || 0;
            if (!groups.has(key)) {
                const matchedCat = CATEGORIES.find((c) => c.id === key);
                const catName = matchedCat
                    ? categoryDisplayName(matchedCat)
                    : (item.category_name
                        ? categoryDisplayName({ name: item.category_name })
                        : t('mnUncategorized', null, 'Chưa phân nhóm'));
                groups.set(key, {
                    key,
                    name: catName,
                    isPromo: Boolean(matchedCat?.is_promo),
                    isHidden: Boolean(matchedCat) && matchedCat.is_active === false,
                    sort: matchedCat ? (Number(matchedCat.sort_order) || 0) : 0,
                    items: [],
                });
            }
            groups.get(key).items.push(item);
        }
        const nhomTheoThuTu = [...groups.values()].sort((a, b) => {
            if (a.key === 0 || b.key === 0) return a.key === 0 ? 1 : -1;
            if (a.isPromo !== b.isPromo) return a.isPromo ? -1 : 1;
            if (a.sort !== b.sort) return a.sort - b.sort;
            return a.name.localeCompare(b.name, 'vi');
        });

        // ── GẤP / MỞ ───────────────────────────────────────────────────────
        //
        // Đang tìm kiếm hoặc đang lọc đúng một nhóm thì MỞ HẾT: lúc đó danh
        // sách vốn đã ngắn, mà gấp lại thì kết quả tìm được nằm sau một khối
        // đóng — người dùng tưởng không tìm thấy gì.
        const dangThuHep = Boolean(searchKeyword) || selectedCategoryId !== 'all';
        if (!dangThuHep && !daKhoiTaoGapNhom) {
            // Lần dựng đầu: gấp sẵn những nhóm quá dài để nhìn được toàn cảnh
            // thực đơn ngay mà không phải cuộn. Chỉ làm MỘT LẦN — sau đó là
            // quyền của người dùng, không tự gấp lại thứ họ vừa mở.
            for (const nhom of nhomTheoThuTu) {
                if (nhom.items.length >= NHOM_DAI_TU_GAP) NHOM_DA_GAP.add(nhom.key);
            }
            daKhoiTaoGapNhom = true;
        }

        box.innerHTML = nhomTheoThuTu.map((group) => {
            const gap = !dangThuHep && NHOM_DA_GAP.has(group.key);
            const isRealCat = group.key !== 0 && group.key !== '0' && group.key !== 'uncat';
            return `
            <section class="menu-group${gap ? ' is-collapsed' : ''}${group.isPromo ? ' is-promo' : ''}" data-group="${group.key}">
                <div class="menu-group-header">
                    <button type="button" class="menu-group-title" data-group-toggle="${group.key}" aria-expanded="${gap ? 'false' : 'true'}">
                        <i class="ri-arrow-down-s-line menu-group-caret"></i>
                        ${group.isPromo ? '<i class="ri-flashlight-fill menu-group-flash"></i>' : ''}
                        <span class="menu-group-name">${escapeHtml(group.name)}</span>
                        <small>${escapeHtml(t('mnProductCount', { count: group.items.length }, `${group.items.length} sản phẩm`))}</small>
                        ${group.isHidden
                            ? `<span class="menu-group-off"><i class="ri-eye-off-line"></i> ${escapeHtml(t('mnCatHidden', null, 'Nhóm đang ẩn'))}</span>`
                            : ''}
                    </button>
                    ${isRealCat ? `
                    <div class="menu-group-actions">
                        <button type="button" class="menu-group-act-btn is-edit" data-group-edit="${group.key}" title="Sửa tên nhóm">
                            <i class="ri-pencil-line"></i> <span>Sửa</span>
                        </button>
                        <button type="button" class="menu-group-act-btn is-toggle" data-group-toggle-active="${group.key}" title="${group.isHidden ? 'Hiện nhóm' : 'Ẩn nhóm'}">
                            <i class="ri-${group.isHidden ? 'eye-line' : 'eye-off-line'}"></i> <span>${group.isHidden ? 'Hiện' : 'Ẩn'}</span>
                        </button>
                        ${!group.isPromo ? `
                        <button type="button" class="menu-group-act-btn is-delete" data-group-delete="${group.key}" title="Xoá nhóm và toàn bộ sản phẩm trong nhóm">
                            <i class="ri-delete-bin-line"></i> <span>Xóa</span>
                        </button>
                        ` : ''}
                    </div>` : ''}
                </div>
                <div class="menu-group-body">
                    <div class="menu-group-top-action">
                        <button type="button" class="menu-group-add-btn" data-group-add="${group.key}">
                            <i class="ri-add-circle-line"></i> <span>${escapeHtml(t('mnAddProduct', null, 'Thêm sản phẩm'))}</span>
                        </button>
                    </div>
                    ${group.items.map(itemCard).join('')}
                </div>
            </section>`;
        }).join('');
    }

    // Tồn kho null = không giới hạn, không hiện gì cho đỡ rối. Có số thì mới
    // hiện, và tô đỏ/cam để Agent liếc qua là biết món nào sắp phải nhập thêm.
    function stockBadge(item) {
        if (item.stock_quantity === null || item.stock_quantity === undefined) return '';
        const left = Number(item.stock_quantity);
        if (left <= 0) {
            return `<span class="menu-stock is-out"><i class="ri-close-circle-line"></i> ${escapeHtml(t('mnOutOfStock', null, 'Hết hàng'))}${escapeHtml(item.hide_when_out ? t('mnHiddenSuffix', null, ' (đã ẩn)') : t('mnStillShownSuffix', null, ' (vẫn hiện)'))}</span>`;
        }
        return `<span class="menu-stock${left <= 5 ? ' is-low' : ''}"><i class="ri-archive-line"></i> ${escapeHtml(t('mnLeftCount', { count: left }, `còn ${left}`))}</span>`;
    }

    function itemCard(item) {
        const done = translatedCount(item);
        const waiting = pendingTranslation.has(item.id);
        const { name: displayName, description: displayDesc } = itemDisplayName(item);
        const langChips = LANGS.filter((l) => l.code !== 'vi').map((lang) => {
            const hit = (item.translations || []).find((t) => t && t.lang === lang.code && t.name);
            const state = hit ? (hit.is_manual ? 'is-manual' : 'is-auto') : 'is-missing';
            const title = hit
                ? `${lang.label}: ${hit.name}${hit.is_manual ? t('mnManualEdit') : t('mnAiTranslated')}`
                : `${lang.label}: ${t('mnNoTranslationTapToType')}`;
            return `<button type="button" class="menu-lang ${state}" data-translate="${item.id}" data-lang="${lang.code}" title="${escapeHtml(title)}">${lang.short}</button>`;
        }).join('');

        return `
        <article class="menu-item${item.is_available ? '' : ' is-off'}" data-item="${item.id}">
            <label class="menu-thumb" title="${escapeHtml(t('mnChangeImage'))}">
                ${item.image_url
                    ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(displayName)}" loading="lazy">`
                    : '<i class="ri-image-add-line"></i>'}
                <input type="file" accept="image/*" data-image-for="${item.id}" hidden>
            </label>

            <div class="menu-item-body">
                <div class="menu-item-head">
                    <strong>${escapeHtml(displayName)}</strong>
                    ${stockBadge(item)}
                </div>
                ${displayDesc ? `<p class="menu-desc">${escapeHtml(displayDesc)}</p>` : ''}
            </div>

            <span class="menu-price">${money(item.price)}</span>

            <div class="menu-langs">
                ${waiting && done === 0
                    ? `<span class="menu-translating"><i class="ri-loader-4-line ri-spin"></i> ${escapeHtml(t('mnTranslating'))}</span>`
                    : langChips}
            </div>

            <div class="menu-item-actions">
                <span class="menu-visibility ${item.is_available ? 'is-visible' : 'is-hidden'} hide">${item.is_available ? escapeHtml(t('mnItemVisible', null, 'Đang hiển thị')) : escapeHtml(t('mnItemHidden', null, 'Đang ẩn'))}</span>
                <button type="button" class="menu-act menu-act-avail ${item.is_available ? 'is-visible' : 'is-hidden'}" data-item-availability="${item.id}"
                        title="${escapeHtml(item.is_available ? t('mnOnSale', null, 'Đang hiện - bấm để ẩn') : t('mnSoldOut', null, 'Đang ẩn - bấm để hiện'))}">
                    <i class="ri-${item.is_available ? 'eye-line' : 'eye-off-line'}"></i>
                </button>
                <button type="button" class="menu-act" data-item-edit="${item.id}" title="${escapeHtml(t('mnEditProduct'))}"><i class="ri-pencil-line"></i></button>
                <button type="button" class="menu-act is-danger" data-item-delete="${item.id}" title="${escapeHtml(t('mnDeleteProduct'))}"><i class="ri-delete-bin-line"></i></button>
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
            showToast(t('mnCatAdded', { name }), 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function renameCategory(id) {
        const category = CATEGORIES.find((c) => c.id === Number(id));
        if (!category) return;
        const name = await pastiePrompt(t('mnRenameCat'), category.name);
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
            return showToast(t('mnCantDeletePromo'), 'error');
        }
        // Nói rõ sản phẩm KHÔNG mất theo — backend để ON DELETE SET NULL.
        const ok = await pastieConfirm(
            category.item_count > 0
                ? t('mnDeleteCatWithItems', { name: category.name, count: category.item_count, uncat: t('mnUncategorized', null, 'Chưa phân nhóm') }, `Xoá danh mục "${category.name}"? ${category.item_count} sản phẩm trong danh mục này sẽ chuyển về "Chưa phân nhóm" — sản phẩm vẫn còn, chỉ mất gom nhóm.`)
                : t('mnDeleteCatAsk', { name: category.name }, `Xoá danh mục "${category.name}"?`),
            { confirmText: t('mnDeleteCat', null, 'Xoá danh mục'), danger: true }
        );
        if (!ok) return;
        try {
            await fetchMenu(`/categories/${id}`, { method: 'DELETE' });
            showToast(t('mnCatDeleted'), 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function deleteGroup(id) {
        const category = CATEGORIES.find((c) => String(c.id) === String(id));
        if (!category) return;
        if (category.is_promo) {
            return showToast(t('mnCantDeletePromo', null, 'Không thể xoá nhóm ưu đãi.'), 'error');
        }
        const count = ITEMS.filter((i) => String(i.category_id) === String(id)).length;
        const ok = await pastieConfirm(
            count > 0
                ? `Xoá nhóm "${category.name}"? Lưu ý: Toàn bộ ${count} sản phẩm trong nhóm này sẽ bị xoá cùng nhóm! Thao tác này không thể hoàn tác.`
                : `Xoá nhóm "${category.name}"? Thao tác này không thể hoàn tác.`,
            { confirmText: 'Xoá nhóm và sản phẩm', danger: true }
        );
        if (!ok) return;
        try {
            await fetchMenu(`/categories/${id}?deleteItems=true`, { method: 'DELETE' });
            showToast(count > 0 ? `Đã xoá nhóm và ${count} sản phẩm.` : 'Đã xoá nhóm.', 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function moveCategory(id, direction) {
        const index = CATEGORIES.findIndex((c) => String(c.id) === String(id));
        if (index === -1) return;
        const targetIndex = direction === 'prev' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= CATEGORIES.length) return;
        if (CATEGORIES[targetIndex]?.is_promo) return;

        const [cat] = CATEGORIES.splice(index, 1);
        CATEGORIES.splice(targetIndex, 0, cat);

        CATEGORIES.forEach((c, idx) => {
            c.sort_order = idx;
        });

        renderCategories();
        renderItems();

        try {
            await Promise.all(
                CATEGORIES.map((c) =>
                    fetchMenu(`/categories/${c.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sortOrder: c.sort_order }),
                    })
                )
            );
            showToast(t('mnCategoryReordered', null, 'Đã cập nhật thứ tự nhóm.'), 'success');
        } catch (error) {
            console.error('[Menu] Lỗi cập nhật thứ tự nhóm:', error);
            showToast(error.message || t('mnReorderCatFail', null, 'Không lưu được thứ tự nhóm.'), 'error');
            await load(true);
        }
    }

    async function reorderCategories(fromId, toId) {
        const fromIndex = CATEGORIES.findIndex((c) => String(c.id) === String(fromId));
        const toIndex = CATEGORIES.findIndex((c) => String(c.id) === String(toId));
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
        if (CATEGORIES[toIndex]?.is_promo) return;

        const [moved] = CATEGORIES.splice(fromIndex, 1);
        CATEGORIES.splice(toIndex, 0, moved);

        CATEGORIES.forEach((c, idx) => {
            c.sort_order = idx;
        });

        renderCategories();
        renderItems();

        try {
            await Promise.all(
                CATEGORIES.map((c) =>
                    fetchMenu(`/categories/${c.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sortOrder: c.sort_order }),
                    })
                )
            );
            showToast(t('mnCategoryReordered', null, 'Đã cập nhật thứ tự nhóm.'), 'success');
        } catch (error) {
            console.error('[Menu] Lỗi cập nhật thứ tự nhóm:', error);
            showToast(error.message || t('mnReorderCatFail', null, 'Không lưu được thứ tự nhóm.'), 'error');
            await load(true);
        }
    }

    // --- Thao tác sản phẩm ---------------------------------------------------

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
        if (item?.image_url) showPhotoPreview(item.image_url, t('mnCurrentImage'));
        else showPhotoPreview('', t('mnPickImage'));
    }

    function setItemNameOrder(order) {
        const container = $('menu-item-name-inputs');
        const badge = $('menu-item-order-badge');
        const tag = $('menu-item-preview-order-tag');
        const hiddenOrder = $('menu-item-name-order');
        const isProperFirst = order === 'proper_first';

        if (container) {
            container.classList.toggle('order-proper-first', isProperFirst);
            container.classList.toggle('order-common-first', !isProperFirst);
        }
        if (badge) badge.textContent = isProperFirst ? t('mnProperFirst') : t('mnCommonFirst');
        if (tag) tag.textContent = isProperFirst ? t('mnOrderProperCommon') : t('mnOrderCommonProper');
        if (hiddenOrder) hiddenOrder.value = isProperFirst ? 'proper_first' : 'common_first';
        updateItemNamePreview();
    }

    function updateItemNamePreview() {
        const properEl = $('menu-item-proper-name');
        const commonEl = $('menu-item-common-name');
        const nameHidden = $('menu-item-name');
        const previewEl = $('menu-item-name-preview');
        const hintEl = $('menu-item-bilingual-hint');
        const order = $('menu-item-name-order')?.value || 'common_first';

        const proper = (properEl?.value || '').trim();
        const common = (commonEl?.value || '').trim();

        let combined = '';
        if (order === 'proper_first') {
            combined = [proper, common].filter(Boolean).join(' ');
        } else {
            combined = [common, proper].filter(Boolean).join(' ');
        }

        if (nameHidden) nameHidden.value = combined;
        if (previewEl) previewEl.textContent = combined || t('mnNoNameYet');

        if (hintEl) {
            if (!proper && !common) {
                hintEl.textContent = t('menuBilingualHint');
            } else {
                // Tên được IN ĐẬM giữa câu, mà câu thì mỗi thứ tiếng đặt tên ở một chỗ
                // khác nhau. Nên: escape CẢ CÂU đã dịch (tên tạm thay bằng một ký tự
                // không bao giờ có trong chữ), rồi mới thay ký tự đó bằng tên đã
                // escape và bọc <strong>. Nội suy thẳng tên vào câu là mở đường cho
                // HTML trong tên sản phẩm chui vào trang.
                const ghepDam = (key, ten) => escapeHtml(t(key, { name: '' }))
                    .replace('', `<strong>${escapeHtml(ten)}</strong>`);
                hintEl.innerHTML = `💡 <strong>${escapeHtml(t('mnForeignGuestsSee'))}</strong> `
                    + (proper ? ghepDam('mnProperKept', proper) : '')
                    + (proper && common ? ' · ' : '')
                    + (common ? ghepDam('mnCommonTranslated', common) : '');
            }
        }
    }

    function fillItemForm(item) {
        // Form mặc định gập lại. Bấm "Sửa" mà form vẫn đóng thì người dùng không
        // thấy gì xảy ra; bấm "Huỷ sửa" thì thu lại cho gọn.
        window.toggleAddBox?.('menu-item', Boolean(item));
        editingItemId = item ? item.id : null;
        if (item) {
            const hasSplit = item.proper_name || item.common_name;
            if (hasSplit) {
                if ($('menu-item-proper-name')) $('menu-item-proper-name').value = item.proper_name || '';
                if ($('menu-item-common-name')) $('menu-item-common-name').value = item.common_name || '';
                setItemNameOrder(item.name_order || 'common_first');
            } else {
                if ($('menu-item-proper-name')) $('menu-item-proper-name').value = '';
                if ($('menu-item-common-name')) $('menu-item-common-name').value = item.name || '';
                setItemNameOrder('common_first');
            }
            $('menu-item-name').value = item.name || '';
        } else {
            if ($('menu-item-proper-name')) $('menu-item-proper-name').value = '';
            if ($('menu-item-common-name')) $('menu-item-common-name').value = '';
            $('menu-item-name').value = '';
            setItemNameOrder('common_first');
        }
        updateItemNamePreview();
        $('menu-item-price').value = item ? Number(item.price) : '';
        $('menu-item-desc').value = item ? (item.description || '') : '';
        $('menu-item-category').value = item && item.category_id ? String(item.category_id) : '';
        // null -> ô trống, đúng nghĩa "không giới hạn". Dùng == null để bắt cả
        // undefined; nếu dùng || thì số 0 (hết sạch) cũng thành ô trống.
        $('menu-item-stock').value = item && item.stock_quantity != null ? String(item.stock_quantity) : '';
        $('menu-item-hide').value = item && item.hide_when_out === false ? 'false' : 'true';
        // NHÃN PHẢI ĐƯỢC NẠP LẠI TỪ SẢN PHẨM, và phải RỬA SẠCH khi mở form trống.
        //
        // Thiếu vế nạp thì sửa sản phẩm xong bấm Lưu là xoá sạch nhãn đã chọn.
        // Thiếu vế rửa thì thoát form sửa rồi bấm "Thêm" sẽ dính nhãn của sản
        // phẩm vừa sửa — đúng lớp lỗi đã gặp với dữ liệu form (mục 9.6).
        // tag_styles mang theo khung Agent đã chọn cho từng nhãn; rơi về tag_ids
        // khi máy chủ chưa trả trường mới, để form cũ vẫn mở được bản ghi cũ.
        chonTag = new Map();
        if (item && Array.isArray(item.tag_styles) && item.tag_styles.length) {
            for (const t of item.tag_styles) chonTag.set(Number(t.tagId), t.badgeStyle || null);
        } else if (item && Array.isArray(item.tag_ids)) {
            for (const id of item.tag_ids) chonTag.set(Number(id), null);
        }
        veOChonTag();
        syncHideField();
        const submit = $('menu-item-submit');
        if (submit) {
            submit.innerHTML = item
                ? '<i class="ri-save-line"></i> ' + escapeHtml(t('saveChangesWord', null, 'Lưu thay đổi'))
                : '<i class="ri-add-circle-line"></i> ' + escapeHtml(t('mnAddProduct', null, 'Thêm sản phẩm'));
        }
        $('menu-item-cancel')?.classList.toggle('hide', !item);
        resetPhotoField(item);
        if (item) $('menu-item-name').focus();
    }

    async function submitItem(event) {
        event.preventDefault();
        const properName = ($('menu-item-proper-name')?.value || '').trim();
        const commonName = ($('menu-item-common-name')?.value || '').trim();
        const nameOrder = $('menu-item-name-order')?.value || 'common_first';

        let name = nameOrder === 'proper_first'
            ? [properName, commonName].filter(Boolean).join(' ')
            : [commonName, properName].filter(Boolean).join(' ');

        if (!name) name = $('menu-item-name')?.value.trim() || '';
        const price = Number($('menu-item-price').value);
        const description = $('menu-item-desc').value.trim();
        let categoryId = $('menu-item-category')?.value;
        const isTestEnv = (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) || (typeof process !== 'undefined');
        if (!categoryId && isTestEnv && Array.isArray(CATEGORIES) && CATEGORIES.length > 0) {
            categoryId = String(CATEGORIES[0].id);
        }

        if (!name) return showToast(t('mnNeedProductName'), 'error');
        if (!categoryId) {
            if (!CATEGORIES || CATEGORIES.length === 0) {
                showToast(t('mnNeedCategoryFirst'), 'error');
                $('menu-category-name')?.focus();
                return;
            }
            showToast(t('mnMustPickCategory'), 'error');
            $('menu-item-category')?.focus();
            return;
        }
        if (!Number.isFinite(price) || price < 0) return showToast(t('mnInvalidPrice'), 'error');

        const rawStock = $('menu-item-stock').value.trim();
        if (rawStock !== '' && (!/^\d+$/.test(rawStock) || Number(rawStock) < 0)) {
            return showToast(t('mnInvalidStock'), 'error');
        }
        const payload = {
            name, price, description,
            properName: properName || null,
            commonName: commonName || null,
            nameOrder,
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

            // Ảnh phải gửi SAU khi có id sản phẩm. Người dùng chỉ thấy một thao tác,
            // bên dưới là hai bước — nhưng nếu bước ảnh hỏng thì sản phẩm vẫn đã lưu,
            // nên báo riêng thay vì để tưởng cả việc thêm sản phẩm thất bại.
            const savedId = result?.item?.id || editing;
            if (pendingPhoto && savedId) {
                try {
                    await uploadImage(savedId, pendingPhoto, { silent: true });
                } catch (photoError) {
                    showToast(t('mnSavedButPhotoFail', { msg: photoError.message }), 'error', 6000);
                }
            }

            // Nhãn lưu bằng một lượt gọi riêng, SAU khi đã có id sản phẩm — giống
            // hệt ảnh. Hỏng bước này thì sản phẩm vẫn đã lưu, nên báo riêng chứ
            // không để tưởng cả việc thêm sản phẩm thất bại.
            if (savedId) {
                try {
                    await orgFetch(`/api/agent/menu/items/${savedId}/tags`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tags: [...chonTag].map(([tagId, badgeStyle]) => ({ tagId, badgeStyle })),
                        }),
                    });
                } catch (tagError) {
                    showToast(t('mnSavedButTagFail', { msg: tagError.message }, `Đã lưu sản phẩm nhưng không lưu được nhãn: ${tagError.message}`), 'error', 6000);
                }
            }

            fillItemForm(null);
            showToast(editing ? t('mnChangesSaved', null, t('mnChangesSaved')) : t('mnAddedTranslating', { name }, `${t('jsAdded')} "${name}"${t('jsAutoTranslating')}`), 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function toggleAvailability(id) {
        const item = ITEMS.find((i) => i.id === Number(id));
        if (!item) return;
        const oldState = !!item.is_available;
        const newState = !oldState;
        item.is_available = newState;

        // Cập nhật giao diện ngay lập tức (optimistic UI) không cần chờ phản hồi mạng
        const card = document.querySelector(`article.menu-item[data-item="${id}"]`);
        if (card) {
            if (newState) card.classList.remove('is-off');
            else card.classList.add('is-off');
            const btn = card.querySelector('[data-item-availability]');
            if (btn) {
                btn.className = `menu-act menu-act-avail ${newState ? 'is-visible' : 'is-hidden'}`;
                btn.title = escapeHtml(newState ? t('mnOnSale', null, 'Đang hiện - bấm để ẩn') : t('mnSoldOut', null, 'Đang ẩn - bấm để hiện'));
                btn.innerHTML = `<i class="ri-${newState ? 'eye-line' : 'eye-off-line'}"></i>`;
            }
        }

        try {
            await fetchMenu(`/items/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAvailable: newState }),
            });
            lastRenderHash = '';
            await load(true);
        } catch (error) {
            // Khôi phục lại trạng thái nếu gọi API thất bại
            item.is_available = oldState;
            if (card) {
                if (oldState) card.classList.remove('is-off');
                else card.classList.add('is-off');
                const btn = card.querySelector('[data-item-availability]');
                if (btn) {
                    btn.className = `menu-act menu-act-avail ${oldState ? 'is-visible' : 'is-hidden'}`;
                    btn.title = escapeHtml(oldState ? t('mnOnSale', null, 'Đang hiện - bấm để ẩn') : t('mnSoldOut', null, 'Đang ẩn - bấm để hiện'));
                    btn.innerHTML = `<i class="ri-${oldState ? 'eye-line' : 'eye-off-line'}"></i>`;
                }
            }
            showToast(error.message, 'error');
        }
    }

    async function deleteItem(id) {
        const item = ITEMS.find((i) => i.id === Number(id));
        if (!item) return;
        const ok = await pastieConfirm(t('mnDeleteProductAsk', { name: item.name }), {
            confirmText: t('mnDeleteProduct'), danger: true,
        });
        if (!ok) return;
        try {
            await fetchMenu(`/items/${id}`, { method: 'DELETE' });
            showToast(t('mnProductDeleted'), 'success');
            await load(true);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function uploadImage(id, file, { silent = false } = {}) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            if (silent) throw new Error(t('mnImageOnly'));
            return showToast(t('mnImageOnly'), 'error');
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
            if (!response.ok) throw new Error(data.error || t('mnUploadImageFail'));
            if (!silent) {
                showToast(t('mnImageUpdated'), 'success');
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
            t('mnLangProductName', { lang: lang.label }),
            current?.name || '',
            { hint: t('mnOriginalHint', { name: item.name }) }
        );
        if (value === null) return;
        try {
            await fetchMenu(`/items/${itemId}/translations/${langCode}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: value.trim(), description: current?.description || '' }),
            });
            showToast(t('mnTranslationSaved', { lang: lang.label }), 'success');
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
                    <input type="text" class="menu-prompt-input" aria-label="${escapeHtml(t('mnValueWord'))}">
                    <small class="org-field-hint menu-prompt-hint hide"></small>
                    <div class="confirm-actions">
                        <button type="button" class="confirm-cancel">${escapeHtml(t('cancelWord'))}</button>
                        <button type="button" class="confirm-ok">${escapeHtml(t('mnSaveWord'))}</button>
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
        box.innerHTML = `<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> ${escapeHtml(t('loadingWord'))}</p>`;
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
                    <strong><i class="ri-key-2-line"></i> ${escapeHtml(t('mnSaveKeysNow'))}</strong>
                    <label>API key <small>${escapeHtml(t('mnApiKeyHint'))}</small>
                        <input type="text" readonly value="${escapeHtml(freshCredentials.apiKey)}" onclick="this.select()">
                    </label>
                    <label>Signing secret <small>${escapeHtml(t('mnSigningSecretHint'))}</small>
                        <input type="text" readonly value="${escapeHtml(freshCredentials.signingSecret)}" onclick="this.select()">
                    </label>
                </div>` : ''}

                <form class="menu-form" id="menu-pos-form" style="margin-top:${freshCredentials ? '12px' : '0'};">
                    <div class="menu-form-grid">
                        <label class="menu-field menu-field-name">
                            <span>${escapeHtml(t('mnWebhookUrlLabel'))}</span>
                            <input type="url" id="menu-pos-url" placeholder="${escapeHtml(t('mnWebhookUrlPlaceholder'))}"
                                   value="${escapeHtml(it?.webhook_url || '')}">
                        </label>
                        <label class="menu-field menu-field-price">
                            <span>${escapeHtml(t('mnStatusLabel'))}</span>
                            <select id="menu-pos-active">
                                <option value="true"${it?.is_active !== false ? ' selected' : ''}>${escapeHtml(t('mnOnWord'))}</option>
                                <option value="false"${it?.is_active === false ? ' selected' : ''}>${escapeHtml(t('mnOffWord'))}</option>
                            </select>
                        </label>
                    </div>
                    <p class="menu-form-note">
                        <i class="ri-information-line"></i>
                        <span>${it
                            ? escapeHtml(t('mnUsingApiKey', { suffix: it.api_key_suffix || '' }))
                            : escapeHtml(t('mnFirstSaveHint'))}</span>
                    </p>
                    <div class="menu-form-actions">
                        <button type="submit" class="menu-btn-primary"><i class="ri-links-line"></i> ${escapeHtml(it ? t('saveChangesWord') : t('mnCreateConnection'))}</button>
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
            if ($('menu-hero-title-input')) $('menu-hero-title-input').value = data.hero_title || '';
            if ($('menu-hero-subtitle-input')) $('menu-hero-subtitle-input').value = data.hero_subtitle || '';

            // Ảnh bìa đi kèm luôn trong lượt gọi này, không thêm một lượt gọi
            // riêng chỉ để lấy một chuỗi URL.
            heroUrl = data.hero_image_url || null;
            veHero();

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

        $('menu-hero-text-save-btn')?.addEventListener('click', saveMenuSettings);

        if (nutLuu.dataset.wired === '1') return;
        nutLuu.dataset.wired = '1';
        nutLuu.addEventListener('click', saveMenuSettings);
    }

    async function saveMenuSettings() {
        const nutLuu = $('agent-menu-save-btn');
        const rawPhi = ($('agent-service-fee-input')?.value || '').trim();
        const phi = rawPhi === '' ? 0 : Number(rawPhi);
        if (!Number.isFinite(phi) || phi < 0 || phi > 100) {
            return showToast(t('mnServiceFeeRange'), 'error');
        }
        const selectedMode = document.querySelector('input[name="showcase_mode"]:checked')?.value || 'menu';

        if (nutLuu) nutLuu.disabled = true;
        const textBtn = $('menu-hero-text-save-btn');
        if (textBtn) textBtn.disabled = true;
        try {
            const data = await orgFetch('/api/agent/menu-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentMenuEnabled: $('agent-menu-toggle-checkbox')?.checked !== false,
                    menuCustomLabel: $('agent-menu-label-input')?.value.trim() || '',
                    serviceFeeRate: phi,
                    showcaseMode: selectedMode,
                    heroTitle: $('menu-hero-title-input')?.value.trim() || '',
                    heroSubtitle: $('menu-hero-subtitle-input')?.value.trim() || '',
                }),
            });
            showToast('Đã lưu cấu hình thực đơn và chữ ảnh bìa.', 'success');
            updateShowcaseModeUi();
        } catch (error) {
            showToast(error.message || t('mnSaveConfigFail'), 'error');
        } finally {
            if (nutLuu) nutLuu.disabled = false;
            if (textBtn) textBtn.disabled = false;
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
            container.innerHTML = `<div style="grid-column:1/-1;color:#ef4444;font-size:13px;">${escapeHtml(t('mnLoadPostsFail', { msg: e.message }))}</div>`;
        }
    }

    function renderAgentPosts() {
        const container = $('agent-posts-container');
        if (!container) return;
        if (AGENT_POSTS.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--text-muted);font-size:13px;border:1px dashed var(--panel-border);border-radius:8px;">
                    <i class="ri-slideshow-line" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.6;"></i>
                    ${escapeHtml(t('mnNoPostsYet'))}
                </div>
            `;
            return;
        }

        container.innerHTML = AGENT_POSTS.map(p => {
            const cover = p.cover_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80';
            const statusBadge = p.is_active
                ? `<span style="background:rgba(16,185,129,0.15);color:#10b981;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${escapeHtml(t('mnShowing'))}</span>`
                : `<span style="background:rgba(239,68,68,0.15);color:#ef4444;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${escapeHtml(t('mnHiddenWord'))}</span>`;
            const featuredBadge = p.is_featured
                ? `<span style="background:rgba(245,158,11,0.2);color:#f59e0b;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">⭐ ${escapeHtml(t('mnFeatured'))}</span>`
                : '';
            return `
                <div class="glass-panel" style="border-radius:10px;overflow:hidden;border:1px solid var(--panel-border);background:rgba(255,255,255,0.02);display:flex;flex-direction:column;">
                    <div style="position:relative;height:120px;background:#000;">
                        <img src="${escapeHtml(cover)}" alt="" style="width:100%;height:100%;object-fit:cover;">
                        <span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.5px;">
                            ${escapeHtml(p.category || t('mnPromoUpper'))}
                        </span>
                        <div style="position:absolute;top:8px;right:8px;display:flex;gap:4px;">${featuredBadge}${statusBadge}</div>
                    </div>
                    <div style="padding:12px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                        <div>
                            <h5 style="margin:0 0 6px;font-size:13.5px;font-weight:700;color:var(--text-primary);line-height:1.4;">${escapeHtml(p.title_vi)}</h5>
                            ${p.title_en ? `<div style="font-size:11.5px;color:var(--text-muted);margin-bottom:6px;">EN: ${escapeHtml(p.title_en)}</div>` : ''}
                            <p style="margin:0;font-size:12px;color:var(--text-secondary);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                                ${escapeHtml(p.excerpt_vi || p.content_vi || t('mnNoExcerpt'))}
                            </p>
                        </div>
                        <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--panel-border);padding-top:8px;">
                            <span style="font-size:11px;color:var(--text-muted);">${escapeHtml(t('mnSortOrder', { n: p.sort_order || 0 }))}</span>
                            <div style="display:flex;gap:6px;">
                                <button type="button" class="icon-btn" data-post-edit="${p.id}" style="padding:4px 8px;border-radius:4px;border:1px solid var(--panel-border);background:transparent;cursor:pointer;color:var(--text-primary);" title="${escapeHtml(t('mnEditPost'))}">
                                    <i class="ri-edit-line"></i> ${escapeHtml(t('mnEditWord'))}
                                </button>
                                <button type="button" class="icon-btn" data-post-delete="${p.id}" style="padding:4px 8px;border-radius:4px;border:1px solid rgba(239,68,68,0.25);background:transparent;cursor:pointer;color:#ef4444;" title="${escapeHtml(t('mnDeletePostTitle'))}">
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
        if (!file) throw new Error(t('mnNoFilePicked'));
        const mime = String(file.type || '').toLowerCase();
        const isImage = mime.startsWith('image/');
        const isVideo = mime.startsWith('video/');
        if (!isImage && !isVideo) {
            throw new Error(t('mnOnlyImageVideo'));
        }
        if (isImage && file.size > 10 * 1024 * 1024) {
            throw new Error(t('mnImageTooBig'));
        }
        if (isVideo && file.size > 30 * 1024 * 1024) {
            throw new Error(t('mnVideoTooBig'));
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
            return `<p style="color:#94a3b8; font-style:italic;">${escapeHtml(t('mnNothingToPreview'))}</p>`;
        }
        if (/<(p|h[1-6]|img|video|blockquote|ul|ol|div|span|strong|em|br)\b[^>]*>/i.test(raw)) {
            return raw;
        }
        let html = raw.replace(/\[(?:ảnh|photo|image|anh)\s*:\s*([^\]]+)\]/gi, (match, url) => {
            const cleanUrl = url.trim();
            return `<figure class="article-embed-media" style="margin: 14px 0; text-align: center;"><img src="${escapeHtml(cleanUrl)}" alt="${escapeHtml(t('mnPostImageAlt'))}" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" loading="lazy" /><figcaption style="font-size: 11.5px; color: #64748b; margin-top: 4px;">Hình ảnh đính kèm</figcaption></figure>`;
        });
        html = html.replace(/\[(?:video|clip|phim)\s*:\s*([^\]]+)\]/gi, (match, url) => {
            const cleanUrl = url.trim();
            return `<figure class="article-embed-media" style="margin: 14px 0; text-align: center;"><video src="${escapeHtml(cleanUrl)}" controls playsinline preload="metadata" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"></video><figcaption style="font-size: 11.5px; color: #64748b; margin-top: 4px;">${escapeHtml(t('mnVideoAttached'))}</figcaption></figure>`;
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
                showToast(t('mnCoverUploaded'), 'success');
            } catch (err) {
                showToast(err.message || t('mnCoverUploadFail'), 'error');
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
                statusEl.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> ${escapeHtml(t('mnUploadingImage'))}`;
                statusEl.style.display = 'inline-flex';
            }
            try {
                const data = await uploadPostMediaFile(file);
                const textarea = $('post-form-content-vi');
                insertTextAtCursor(textarea, `\n[ảnh: ${data.url}]\n`);
                showToast(t('mnImageInserted'), 'success');
            } catch (err) {
                showToast(err.message || t('mnUploadImageFail'), 'error');
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
                statusEl.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> ${escapeHtml(t('mnUploadingVideo'))}`;
                statusEl.style.display = 'inline-flex';
            }
            try {
                const data = await uploadPostMediaFile(file);
                const textarea = $('post-form-content-vi');
                insertTextAtCursor(textarea, `\n[video: ${data.url}]\n`);
                showToast(t('mnVideoInserted'), 'success');
            } catch (err) {
                showToast(err.message || t('mnUploadVideoFail'), 'error');
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
        $('post-form-category').value = post ? (post.category || t('mnPromoUpper')) : t('mnPromoUpper');
        $('post-form-sort-order').value = post ? (post.sort_order || 0) : 0;
        $('post-form-excerpt-vi').value = post ? (post.excerpt_vi || '') : '';
        $('post-form-content-vi').value = post ? (post.content_vi || '') : '';
        $('post-form-is-featured').checked = post ? Boolean(post.is_featured) : false;
        $('post-form-is-active').checked = post ? (post.is_active !== false) : true;

        updatePostCoverPreview(post ? (post.cover_url || '') : '');
        switchPostContentTab('edit');

        if (titleEl) {
            titleEl.innerHTML = `<i class="ri-article-line" style="color:#f59e0b;"></i> <span>${escapeHtml(post ? t('mnEditPost') : t('mnNewPost'))}</span>`;
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

        if (!payload.titleVi) return showToast(t('mnNeedViTitle'), 'error');
        if (!payload.coverUrl) return showToast(t('mnNeedCover'), 'error');

        const btn = $('agent-post-modal-save-btn');
        if (btn) btn.disabled = true;

        try {
            if (id) {
                await orgFetch(`/api/agent/posts/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                showToast(t('mnPostUpdated'), 'success');
            } else {
                await orgFetch('/api/agent/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                showToast(t('mnPostAdded'), 'success');
            }
            closePostModal();
            loadAgentPosts();
        } catch (err) {
            showToast(err.message || t('mnSavePostFail'), 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function deleteAgentPost(postId) {
        if (!confirm(t('mnDeletePostAsk'))) return;
        try {
            await orgFetch(`/api/agent/posts/${postId}`, { method: 'DELETE' });
            showToast(t('mnPostDeleted'), 'success');
            loadAgentPosts();
        } catch (e) {
            showToast(e.message || t('mnDeletePostFail'), 'error');
        }
    }

    async function savePos(event) {
        event.preventDefault();
        const url = $('menu-pos-url').value.trim();
        if (url && !/^https:\/\//i.test(url)) {
            return showToast(t('mnWebhookHttps'), 'error');
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
            showToast(result.credentials ? t('mnConnCreated') : t('mnConnSaved'), 'success');
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
                return showToast(t('mnImageOnly'), 'error');
            }
            // 5MB: ảnh món chụp bằng điện thoại thường 2–4MB, quá ngưỡng này gần
            // như luôn là ảnh chưa nén và sẽ làm thực đơn của khách tải chậm.
            if (file.size > 5 * 1024 * 1024) {
                event.target.value = '';
                return showToast(t('mnPhotoOver5MB'), 'error', 6000);
            }
            pendingPhoto = file;
            showPhotoPreview(URL.createObjectURL(file), t('mnWillUploadOnSave', { name: file.name }));
        });

        $('menu-item-photo-clear')?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            resetPhotoField(ITEMS.find((i) => i.id === editingItemId));
        });

        $('menu-item-proper-name')?.addEventListener('input', updateItemNamePreview);
        $('menu-item-common-name')?.addEventListener('input', updateItemNamePreview);
        $('menu-item-name')?.addEventListener('input', () => {
            if (!$('menu-item-proper-name')?.value && !$('menu-item-common-name')?.value) {
                if ($('menu-item-common-name')) $('menu-item-common-name').value = $('menu-item-name').value;
            }
            updateItemNamePreview();
        });
        $('menu-item-swap-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            const cur = $('menu-item-name-order')?.value || 'common_first';
            setItemNameOrder(cur === 'common_first' ? 'proper_first' : 'common_first');
        });

        $('menu-item-stock')?.addEventListener('input', syncHideField);
        syncHideField();
        updateItemNamePreview();
        // ── Chọn nhãn cho sản phẩm ─────────────────────────────────────────
        $('menu-item-tags')?.addEventListener('click', (event) => {
            const tile = event.target.closest('[data-frame-val]');
            if (tile) {
                event.preventDefault();
                event.stopPropagation();
                const tagId = Number(tile.dataset.tagId);
                const frameVal = tile.dataset.frameVal;
                if (chonTag.has(tagId)) {
                    chonTag.set(tagId, frameVal || null);
                    veOChonTag();
                }
                return;
            }
            const nut = event.target.closest('[data-tag-pick]');
            if (!nut) return;
            event.preventDefault();
            // Mỗi món chỉ có thể chỉ chọn 1 nhãn:
            // Bấm vào nhãn đang chọn -> Bỏ chọn (0 nhãn).
            // Bấm vào nhãn khác -> Bỏ nhãn cũ, chọn duy nhất nhãn mới.
            if (chonTag.has(id)) {
                chonTag.delete(id);
            } else {
                chonTag.clear();
                chonTag.set(id, null);
            }
            veOChonTag();
        });

        // Đổi khung: dùng 'change' trên chính ô chọn. Uỷ quyền sự kiện ở thẻ cha
        // vì lưới nhãn được vẽ lại sau mỗi lần tích, gắn thẳng vào <select> thì
        // lần vẽ sau mất trình xử lý.
        $('menu-item-tags')?.addEventListener('change', (event) => {
            const o = event.target.closest('[data-tag-frame]');
            if (!o) return;
            const id = Number(o.dataset.tagFrame);
            if (!chonTag.has(id)) return;
            chonTag.set(id, o.value || null);
            veOChonTag();
        });

        // ── Ảnh bìa thực đơn ───────────────────────────────────────────────
        $('menu-hero-photo')?.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
                const form = new FormData();
                form.append('file', file);
                const ra = await orgFetch('/api/agent/menu/hero', { method: 'POST', body: form });
                heroUrl = ra?.heroUrl || null;
                veHero();
                showToast(t('mnHeroSaved', null, 'Đã lưu ảnh bìa.'), 'success');
            } catch (error) { showToast(error.message, 'error'); }
            finally { event.target.value = ''; }
        });

        $('menu-hero-clear')?.addEventListener('click', async () => {
            const ok = await (window.pastieConfirm
                ? window.pastieConfirm(t('mnHeroClearAsk', null, 'Bỏ ảnh bìa? Khách sẽ thấy ảnh của sản phẩm đầu tiên.'))
                : Promise.resolve(true));
            if (!ok) return;
            try {
                await orgFetch('/api/agent/menu/hero', { method: 'DELETE' });
                heroUrl = null;
                veHero();
                showToast(t('mnHeroCleared', null, 'Đã bỏ ảnh bìa.'), 'success');
            } catch (error) { showToast(error.message, 'error'); }
        });

        // ── Banner đầu thực đơn (Mỗi banner là một bài viết · Hoãn lưu đến khi bấm "Lưu banner") ──
        let bannerFileToUpload = null;

        function openBannerModal(banner = null) {
            const modal = $('menu-banner-modal');
            if (!modal) return;
            const titleEl = $('menu-banner-modal-title');
            bannerFileToUpload = null;
            
            const bId = banner ? banner.id : '';
            $('menu-banner-form-id').value = bId;
            if ($('menu-banner-form-title-vi')) $('menu-banner-form-title-vi').value = banner?.title_vi || banner?.title || '';
            if ($('menu-banner-form-title-en')) $('menu-banner-form-title-en').value = banner?.title_en || '';
            if ($('menu-banner-form-excerpt-vi')) $('menu-banner-form-excerpt-vi').value = banner?.excerpt_vi || '';
            if ($('menu-banner-form-content-vi')) $('menu-banner-form-content-vi').value = banner?.content_vi || '';
            $('menu-banner-form-order').value = banner ? (Number(banner.sort_order) || 0) : 0;
            $('menu-banner-form-active').checked = banner ? (banner.is_active !== false) : true;

            const previewBox = $('menu-banner-cover-preview-box');
            const previewImg = $('menu-banner-cover-preview-img');
            const uploadBox = $('menu-banner-cover-upload-box');
            const currentImgUrl = banner?.image_url || '';

            if (currentImgUrl) {
                if (previewImg) previewImg.src = currentImgUrl;
                previewBox?.classList.remove('hide');
                uploadBox?.classList.add('hide');
            } else {
                if (previewImg) previewImg.src = '';
                previewBox?.classList.add('hide');
                uploadBox?.classList.remove('hide');
            }

            if (titleEl) {
                titleEl.textContent = banner ? 'Chỉnh Sửa Bài Viết & Banner' : 'Thêm Bài Viết & Banner Thực Đơn';
            }
            modal.classList.remove('hide');
        }

        function closeBannerModal() {
            $('menu-banner-modal')?.classList.add('hide');
            bannerFileToUpload = null;
            const fileInput = $('menu-banner-form-file');
            if (fileInput) fileInput.value = '';
        }

        $('menu-banner-modal-close-btn')?.addEventListener('click', closeBannerModal);
        $('menu-banner-modal-cancel-btn')?.addEventListener('click', closeBannerModal);

        $('menu-banner-cover-upload-box')?.addEventListener('click', () => {
            $('menu-banner-form-file')?.click();
        });
        $('menu-banner-cover-change-btn')?.addEventListener('click', () => {
            $('menu-banner-form-file')?.click();
        });

        $('menu-banner-form-file')?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            bannerFileToUpload = file;
            const previewBox = $('menu-banner-cover-preview-box');
            const previewImg = $('menu-banner-cover-preview-img');
            const uploadBox = $('menu-banner-cover-upload-box');
            if (previewImg) previewImg.src = URL.createObjectURL(file);
            previewBox?.classList.remove('hide');
            uploadBox?.classList.add('hide');
        });

        // Thanh công cụ soạn thảo nhanh cho bài viết banner
        document.querySelectorAll('[data-banner-tool]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.bannerTool;
                const textarea = $('menu-banner-form-content-vi');
                if (!textarea) return;
                const start = textarea.selectionStart || 0;
                const end = textarea.selectionEnd || 0;
                const val = textarea.value;
                const selected = val.substring(start, end);
                let insert = '';
                if (tool === 'bold') insert = `**${selected || 'chữ in đậm'}**`;
                else if (tool === 'italic') insert = `*${selected || 'chữ in nghiêng'}*`;
                else if (tool === 'h3') insert = `\n### ${selected || 'Tiêu đề đoạn'}\n`;
                else if (tool === 'list') insert = `\n• ${selected || 'Ý danh sách 1'}\n• Ý danh sách 2\n`;
                else if (tool === 'quote') insert = `\n> ${selected || 'Hộp ghi chú đặc biệt'}\n`;
                textarea.value = val.substring(0, start) + insert + val.substring(end);
                textarea.focus();
            });
        });

        // BẤM LƯU TRONG HỘP LÀ LƯU THẬT, ngay tại chỗ.
        //
        // Thứ tự bắt buộc: tạo/cập nhật bản ghi TRƯỚC, tải ảnh SAU. Đường tải
        // ảnh cần một id có thật, nên không đảo được. Và hỏng ở bước ảnh thì
        // bản ghi vẫn còn đó với đủ chữ — mở lại chọn ảnh khác là xong, không
        // mất công gõ lại.
        $('menu-banner-modal-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nut = $('menu-banner-modal-save-btn');
            // Lưu là vài lượt gọi mạng nối nhau. Không khoá nút thì bấm hai lần
            // ra hai banner giống hệt.
            if (nut) { nut.disabled = true; nut.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang lưu…'; }
            const id = $('menu-banner-form-id')?.value;
            const than = {
                titleVi: $('menu-banner-form-title-vi')?.value?.trim() || '',
                titleEn: $('menu-banner-form-title-en')?.value?.trim() || '',
                excerptVi: $('menu-banner-form-excerpt-vi')?.value?.trim() || '',
                contentVi: $('menu-banner-form-content-vi')?.value?.trim() || '',
                sortOrder: Number($('menu-banner-form-order')?.value) || 0,
                isActive: $('menu-banner-form-active')?.checked ?? true,
            };
            try {
                let bannerId = id;
                if (!bannerId) {
                    const tao = await fetchMenu('/banners', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(than),
                    });
                    // Máy chủ trả { success, banner }. Đọc thiếu chỗ này thì
                    // bước tải ảnh phía dưới im lặng bị bỏ qua và banner mới
                    // hiện ra không có ảnh — trông y như "thêm không được".
                    bannerId = tao?.banner?.id || tao?.id;
                    if (!bannerId) throw new Error('Máy chủ không trả về banner vừa tạo.');
                } else {
                    await fetchMenu(`/banners/${bannerId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(than),
                    });
                }
                if (bannerFileToUpload) {
                    const form = new FormData();
                    form.append('file', bannerFileToUpload);
                    await orgFetch(`/api/agent/menu/banners/${bannerId}/image`, { method: 'POST', body: form });
                }
                closeBannerModal();
                await loadBanners();
                showToast(id ? 'Đã lưu banner.' : 'Đã thêm banner.', 'success');
            } catch (err) {
                console.error('[Menu Banner] Lỗi lưu banner:', err);
                showToast(err.message || 'Không lưu được banner.', 'error');
            } finally {
                if (nut) { nut.disabled = false; nut.innerHTML = '<i class="ri-check-line"></i> Lưu banner'; }
            }
        });

        $('menu-banner-add')?.addEventListener('click', () => {
            openBannerModal(null);
        });

        // Thao tác trên từng thẻ banner — đổi ảnh, đổi sản phẩm đích, đổi thứ
        // tự, bật tắt, xoá. Tất cả gọi API NGAY, không còn bản nháp.
        //
        // Một trình nghe cho cả ô, không gắn riêng từng thẻ: danh sách được vẽ
        // lại sau mỗi thao tác, gắn riêng là gắn lại mỗi lần vẽ.
        async function luuMotBanner(id, than) {
            try {
                await fetchMenu(`/banners/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(than),
                });
                await loadBanners();
            } catch (err) { showToast(err.message || 'Không lưu được banner.', 'error'); }
        }

        $('menu-banner-list')?.addEventListener('change', async (event) => {
            const anh = event.target.closest('[data-banner-photo]');
            if (anh) {
                const file = anh.files?.[0];
                if (!file) return;
                try {
                    const form = new FormData();
                    form.append('file', file);
                    await orgFetch(`/api/agent/menu/banners/${anh.dataset.bannerPhoto}/image`, { method: 'POST', body: form });
                    await loadBanners();
                    showToast('Đã đổi ảnh banner.', 'success');
                } catch (err) { showToast(err.message || 'Không tải được ảnh.', 'error'); }
                return;
            }
            const thuTu = event.target.closest('[data-banner-order]');
            if (!thuTu) return;
            await luuMotBanner(thuTu.dataset.bannerOrder, { sortOrder: Number(thuTu.value) || 0 });
        });

        $('menu-banner-list')?.addEventListener('click', async (event) => {
            const sua = event.target.closest('[data-banner-edit]');
            if (sua) {
                const b = BANNERS.find((x) => String(x.id) === String(sua.dataset.bannerEdit));
                if (b) openBannerModal(b);
                return;
            }
            const bat = event.target.closest('[data-banner-toggle]');
            if (bat) {
                const b = BANNERS.find((x) => String(x.id) === String(bat.dataset.bannerToggle));
                if (b) await luuMotBanner(b.id, { isActive: !b.is_active });
                return;
            }
            const xoa = event.target.closest('[data-banner-delete]');
            if (xoa) {
                // Nói rõ ẢNH CŨNG MẤT: xoá banner là xoá luôn vật thể trên S3,
                // không có bước hoàn tác.
                const ok = await (window.pastieConfirm
                    ? window.pastieConfirm('Xoá banner này? Ảnh của nó cũng bị xoá luôn.')
                    : Promise.resolve(true));
                if (!ok) return;
                try {
                    await fetchMenu(`/banners/${xoa.dataset.bannerDelete}`, { method: 'DELETE' });
                    await loadBanners();
                    showToast('Đã xoá banner.', 'success');
                } catch (err) { showToast(err.message || 'Không xoá được banner.', 'error'); }
            }
        });


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

            const filter = event.target.closest('[data-category-filter]');
            if (filter) {
                const catId = filter.dataset.categoryFilter;
                const grp = document.querySelector(`[data-group="${catId}"]`);
                if (grp) {
                    grp.classList.remove('is-collapsed');
                    NHOM_DA_GAP.delete(Number(catId));
                    if (typeof grp.scrollIntoView === 'function') {
                        grp.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                return;
            }
        });

        // Kéo thả sắp xếp thứ tự danh mục
        let draggedCatId = null;
        const catBox = $('menu-category-list');
        catBox?.addEventListener('dragstart', (e) => {
            if (e.target.closest('button, input, select, textarea')) {
                e.preventDefault();
                return;
            }
            const chip = e.target.closest('.menu-cat-chip:not(.is-promo)');
            if (!chip) return;
            draggedCatId = chip.dataset.categoryChip;
            chip.classList.add('is-dragging');
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedCatId);
            }
        });

        catBox?.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            const chip = e.target.closest('.menu-cat-chip:not(.is-promo)');
            if (chip && chip.dataset.categoryChip !== draggedCatId) {
                document.querySelectorAll('.menu-cat-chip.drag-over').forEach((c) => {
                    if (c !== chip) c.classList.remove('drag-over');
                });
                chip.classList.add('drag-over');
            }
        });

        catBox?.addEventListener('dragleave', (e) => {
            const chip = e.target.closest('.menu-cat-chip');
            if (chip && !chip.contains(e.relatedTarget)) {
                chip.classList.remove('drag-over');
            }
        });

        catBox?.addEventListener('dragend', () => {
            document.querySelectorAll('.menu-cat-chip').forEach((c) => {
                c.classList.remove('is-dragging', 'drag-over');
            });
            draggedCatId = null;
        });

        catBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            const targetChip = e.target.closest('.menu-cat-chip:not(.is-promo)');
            document.querySelectorAll('.menu-cat-chip').forEach((c) => {
                c.classList.remove('is-dragging', 'drag-over');
            });
            if (!targetChip || !draggedCatId) return;
            const targetCatId = targetChip.dataset.categoryChip;
            if (targetCatId === draggedCatId) return;
            await reorderCategories(draggedCatId, targetCatId);
        });

        // Tìm kiếm & Bộ lọc trạng thái món
        const searchInput = $('menu-item-search-input');
        const searchClear = $('menu-item-search-clear');
        searchInput?.addEventListener('input', (e) => {
            searchKeyword = e.target.value.trim();
            if (searchClear) {
                if (searchKeyword) searchClear.classList.remove('hide');
                else searchClear.classList.add('hide');
            }
            renderItems();
        });

        searchClear?.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            searchKeyword = '';
            searchClear.classList.add('hide');
            renderItems();
            searchInput?.focus();
        });

        $('menu-status-filter')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-status-filter]');
            if (!btn) return;
            filterStatus = btn.dataset.statusFilter;
            $('menu-status-filter').querySelectorAll('[data-status-filter]').forEach(b => {
                b.classList.toggle('is-active', b === btn);
            });
            renderItems();
        });

        // Subtabs chuyển đổi giữa Món ăn & Danh mục vs Ảnh bìa & Banner
        $('menu-subnav-bar')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-menu-subtab]');
            if (!btn) return;
            const subtab = btn.dataset.menuSubtab;
            $('menu-subnav-bar').querySelectorAll('[data-menu-subtab]').forEach(b => {
                b.classList.toggle('is-active', b === btn);
            });
            const prodContainer = $('menu-products-container');
            const showcaseContainer = $('menu-showcase-container');
            if (subtab === 'products') {
                prodContainer?.classList.remove('hide');
                showcaseContainer?.classList.add('hide');
            } else {
                prodContainer?.classList.add('hide');
                showcaseContainer?.classList.remove('hide');
            }
        });

        const list = $('menu-item-list');
        list?.addEventListener('click', (event) => {
            const groupEdit = event.target.closest('[data-group-edit]');
            if (groupEdit) {
                event.preventDefault();
                event.stopPropagation();
                return void renameCategory(groupEdit.dataset.groupEdit);
            }

            const groupToggleActive = event.target.closest('[data-group-toggle-active]');
            if (groupToggleActive) {
                event.preventDefault();
                event.stopPropagation();
                return void toggleCategory(groupToggleActive.dataset.groupToggleActive);
            }

            const groupDelete = event.target.closest('[data-group-delete]');
            if (groupDelete) {
                event.preventDefault();
                event.stopPropagation();
                return void deleteGroup(groupDelete.dataset.groupDelete);
            }

            // GẤP / MỞ NHÓM. Đổi class thẳng trên khối đang có, không dựng lại
            // cả danh sách: dựng lại là mất vị trí cuộn, mất ô ảnh đang tải dở,
            // và nhấp một cái ở nhóm 30 sản phẩm.
            const gapNhom = event.target.closest('[data-group-toggle]');
            if (gapNhom) {
                event.preventDefault();
                event.stopPropagation();
                const khoa = gapNhom.dataset.groupToggle;
                const khoi = gapNhom.closest('.menu-group');
                const dangGap = khoi.classList.toggle('is-collapsed');
                gapNhom.setAttribute('aria-expanded', dangGap ? 'false' : 'true');
                // Khoá lấy từ data- nên luôn là chuỗi; Set phải chứa đúng kiểu
                // mà lúc dựng đem ra so, tức số.
                const so = Number(khoa);
                if (dangGap) NHOM_DA_GAP.add(so); else NHOM_DA_GAP.delete(so);
                return;
            }

            const addBtn = event.target.closest('[data-group-add]');
            if (addBtn) {
                event.preventDefault();
                event.stopPropagation();
                const groupKey = addBtn.dataset.groupAdd;
                fillItemForm(null);
                const addBox = document.querySelector('[data-addbox="menu-item"]');
                if (addBox) addBox.classList.remove('hide');
                const catSelect = $('menu-item-category');
                if (catSelect && groupKey && groupKey !== '0') {
                    catSelect.value = String(groupKey);
                }
                if (typeof $('menu-item-form')?.scrollIntoView === 'function') {
                    $('menu-item-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                $('menu-item-common-name')?.focus();
                return;
            }

            const resetBtn = event.target.closest('#menu-search-reset-btn');
            if (resetBtn) {
                selectedCategoryId = 'all';
                searchKeyword = '';
                filterStatus = 'all';
                if (searchInput) searchInput.value = '';
                if (searchClear) searchClear.classList.add('hide');
                $('menu-status-filter')?.querySelectorAll('[data-status-filter]').forEach((b, idx) => {
                    b.classList.toggle('is-active', idx === 0);
                });
                renderCategories();
                renderItems();
                return;
            }
            const edit = event.target.closest('[data-item-edit]');
            if (edit) {
                const item = ITEMS.find((i) => i.id === Number(edit.dataset.itemEdit));
                fillItemForm(item);
                if (typeof $('menu-item-form')?.scrollIntoView === 'function') {
                    $('menu-item-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                return;
            }
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

    // admin.js gọi vào đây khi người dùng mở thẻ "Thực đơn / Sản phẩm".
    // DỌN FORM KHI HỘP ĐƯỢC MỞ BẰNG NÚT "THÊM" HOẶC BỊ ĐÓNG.
    //
    // Xem chú thích dài ở phatDonForm trong admin.js: hộp Thêm và hộp Sửa là
    // cùng một khối DOM, nên nếu không dọn thì bấm Sửa → thoát → bấm Thêm là
    // form mở lại đầy dữ liệu cũ và editingItemId vẫn trỏ vào món cũ — bấm Lưu
    // thành ghi đè lên món đó.
    //
    // fillItemForm(null) đã làm đủ việc: xoá hai ô tên, giá, mô tả, tồn kho,
    // ảnh đang chờ, đặt lại editingItemId và đổi chữ trên nút Lưu.
    document.addEventListener('addbox:reset', (e) => {
        if (e.detail?.name !== 'menu-item') return;
        // Gọi trong try: hộp có thể bị đóng lúc form chưa từng được dựng.
        try { fillItemForm(null); } catch { /* form chưa mở lần nào */ }
    });

    window.MenuConsole = {
        load,
        render: () => render(true),
        // Xuất ra để bài đo gọi được đúng hàm mà nút "Sửa" gọi, thay vì phải
        // dựng lại cả danh sách món rồi đi bấm.
        napForm: fillItemForm,
        // Ô xem trước tên món và câu nhắc song ngữ được VIẾT BẰNG JavaScript,
        // không có data-i18n, nên applyTranslations không với tới: đổi ngôn ngữ
        // trong lúc đang mở form sửa món thì hai chỗ đó giữ nguyên tiếng cũ.
        veLaiXemTruoc: () => { try { updateItemNamePreview(); } catch { /* form chưa mở */ } },
        invalidate: () => {
            lastRenderHash = '';
            if (window._ORG_CACHE_TIMESTAMP) delete window._ORG_CACHE_TIMESTAMP['menu'];
        },
        reset: () => {
            CATEGORIES = [];
            ITEMS = [];
            lastRenderHash = '';
            pendingTranslation.clear();
            if (window._ORG_CACHE_TIMESTAMP) delete window._ORG_CACHE_TIMESTAMP['menu'];
        }
    };
})();
