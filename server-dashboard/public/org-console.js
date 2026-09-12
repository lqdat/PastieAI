// Màn tổ chức QR — dành riêng vai trò 'agent' của dự án qr_concierge.
//
// Quản lý Sale, nhóm tiếp nhận, mã QR và poster in ra. Cùng nhóm với
// menu-console.js: cả hai là phần QR Console tương lai.
//
// Phụ thuộc core.js. Xem chú thích thứ tự nạp ở đầu core.js.
window.ORG_SALES = window.ORG_SALES || [];
window.ORG_GROUPS = window.ORG_GROUPS || [];
window.CURRENT_QR_ACCOUNTS = window.CURRENT_QR_ACCOUNTS || [];

async function refreshQrAccounts() {
    const projectId = getAdminMgmtProjectId();
    if (!qrConciergePanel || !projectId) return;
    const enabled = isQrConciergeProject(projectId);
    qrConciergePanel.classList.toggle('hide', !enabled);
    // Chế độ "Quản lý tài khoản" luôn ẩn panel QR, kể cả project có bật QR.
    if (adminMgmtFocus === 'account') qrConciergePanel.classList.add('hide');
    if (!enabled) return;

    const canCreate = ['superadmin', 'project_admin'].includes(CURRENT_ADMIN?.role);
    document.getElementById('qr-create-controls')?.classList.toggle('hide', !canCreate);
    if (canCreate && qrOwnerSelect) {
        const selectedOwner = qrOwnerSelect.value;
        const eligible = adminMgmtUsers.filter(u => u.project_id === projectId && ['agent', 'sale'].includes(u.role) && u.is_active);
        qrOwnerSelect.innerHTML = eligible.length
            ? eligible.map(u => `<option value="${u.id}">${escapeHtml(u.full_name || u.username)}</option>`).join('')
            : '<option value="">Chưa có tài khoản hoạt động</option>';
        if (selectedOwner && [...qrOwnerSelect.options].some(option => option.value === selectedOwner)) qrOwnerSelect.value = selectedOwner;
    }
    if (qrAccountList) qrAccountList.innerHTML = '<div class="qr-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải mã QR…</div>';
    try {
        const res = await authFetch(`${API_BASE}/api/admin/qr-accounts?projectId=${encodeURIComponent(projectId)}`);
        qrAccounts = await res.json();
        if (!res.ok) throw new Error(qrAccounts.error || 'Không tải được mã QR.');
        const selectedOwner = canCreate ? String(qrOwnerSelect?.value || '') : String(CURRENT_ADMIN?.id || '');
        const accounts = selectedOwner ? qrAccounts.filter(account => String(account.owner_admin_id) === selectedOwner) : qrAccounts;
        if (!accounts.length) {
            qrAccountList.innerHTML = '<div class="qr-empty"><i class="ri-qr-code-line"></i><span>Chưa có mã QR nào cho project này.</span></div>';
            return;
        }
        qrAccountList.innerHTML = accounts.map(account => {
            const imageUrl = `https://quickchart.io/qr?size=360&text=${encodeURIComponent(account.chat_url)}`;
            const eventValue = (value) => encodeURIComponent(value || '').replace(/'/g, '%27');
            const agentName = account.agent_name || account.owner_name || '';
            const agentLogoUrl = account.agent_avatar_url || '';
            return `<article class="qr-account-card">
                <img src="${imageUrl}" alt="QR chat của ${escapeHtml(account.owner_name)}" loading="lazy">
                <div class="qr-account-info"><strong>${escapeHtml(account.label)}</strong><span><i class="ri-user-3-line"></i> ${escapeHtml(account.owner_name)}</span><small>${escapeHtml(account.chat_url)}</small></div>
                <div class="qr-account-actions"><button type="button" onclick="window.copyQrChatLink('${eventValue(account.chat_url)}', true)"><i class="ri-file-copy-line"></i> Sao chép</button><button type="button" onclick="window.openQrPreview('${eventValue(imageUrl)}', '${eventValue(account.label)}', '${eventValue(account.owner_name)}', '${eventValue(account.chat_url)}', '${eventValue(agentName)}', '${eventValue(agentLogoUrl)}')"><i class="ri-zoom-in-line"></i> Mở QR</button></div>
            </article>`;
        }).join('');
    } catch (error) {
        qrAccountList.innerHTML = `<div class="qr-empty qr-error">${escapeHtml(error.message)}</div>`;
    }
}


const posterImageCache = new Map();

function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith('gradient-') || trimmed.startsWith('default-')) return false;
    return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('data:image/');
}

function loadPosterImage(url) {
    if (!url) return Promise.reject(new Error('URL trống'));
    if (posterImageCache.has(url)) {
        const cached = posterImageCache.get(url);
        if (cached && cached.complete && cached.naturalWidth > 0) {
            return Promise.resolve(cached);
        }
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            posterImageCache.set(url, img);
            resolve(img);
        };
        img.onerror = () => {
            fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.blob();
                })
                .then(blob => {
                    const objectUrl = URL.createObjectURL(blob);
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        URL.revokeObjectURL(objectUrl);
                        posterImageCache.set(url, fallbackImg);
                        resolve(fallbackImg);
                    };
                    fallbackImg.onerror = () => {
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error('Không đọc được ảnh poster.'));
                    };
                    fallbackImg.src = objectUrl;
                })
                .catch(err => reject(err));
        };
        img.src = url;
    });
}


function drawPosterRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}


function drawCameraCorners(ctx, x, y, width, height, len = 38, radius = 10, strokeWidth = 4.5, strokeColor = '#ef2b9d') {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Góc trên trái
    ctx.beginPath();
    ctx.moveTo(x, y + len);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.lineTo(x + len, y);
    ctx.stroke();

    // Góc trên phải
    ctx.beginPath();
    ctx.moveTo(x + width - len, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + len);
    ctx.stroke();

    // Góc dưới trái
    ctx.beginPath();
    ctx.moveTo(x, y + height - len);
    ctx.lineTo(x, y + height - radius);
    ctx.arcTo(x, y + height, x + radius, y + height, radius);
    ctx.lineTo(x + len, y + height);
    ctx.stroke();

    // Góc dưới phải
    ctx.beginPath();
    ctx.moveTo(x + width - len, y + height);
    ctx.lineTo(x + width - radius, y + height);
    ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
    ctx.lineTo(x + width, y + height - len);
    ctx.stroke();

    ctx.restore();
}


function drawPosterText(ctx, text, centerX, startY, maxWidth, lineHeight, maxLines = 2) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    words.forEach(word => {
        const candidate = current ? `${current} ${word}` : word;
        if (current && ctx.measureText(candidate).width > maxWidth) {
            lines.push(current);
            current = word;
        } else current = candidate;
    });
    if (current) lines.push(current);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) {
        let last = visible[visible.length - 1];
        while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
        visible[visible.length - 1] = `${last}…`;
    }
    visible.forEach((line, index) => ctx.fillText(line, centerX, startY + index * lineHeight));
    return visible.length;
}


async function createBrandedQrPoster(imageUrl, options = {}) {
    if (typeof options === 'string') {
        options = { businessName: options };
    }
    const {
        businessName = '',
        qrLabel = '',
        agentLogoUrl = '',
        style = 'cobranded',
    } = options;

    if (document.fonts?.load) {
        await Promise.allSettled([
            document.fonts.load('400 16px "Be Vietnam Pro"'),
            document.fonts.load('500 18px "Be Vietnam Pro"'),
            document.fonts.load('600 20px "Be Vietnam Pro"'),
            document.fonts.load('700 24px "Be Vietnam Pro"'),
            document.fonts.load('800 30px "Be Vietnam Pro"'),
        ]);
    }

    const hasLogoCandidate = (style === 'cobranded') && isValidImageUrl(agentLogoUrl);
    const [qrImage, logoImage, agentLogoImage] = await Promise.all([
        loadPosterImage(imageUrl),
        loadPosterImage('/pastie-chat-biz-compact.png'),
        hasLogoCandidate ? loadPosterImage(agentLogoUrl).catch(() => null) : Promise.resolve(null),
    ]);

    // Kiểu 1 có logo Agent khi và chỉ khi ảnh logo tải thành công
    const hasAgentLogo = Boolean(style === 'cobranded' && agentLogoImage);

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ tạo ảnh QR.');
    const posterFont = '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif';

    // 1. Nền canvas chuyển sắc nhẹ pastel
    ctx.fillStyle = '#fffafd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const topGradient = ctx.createLinearGradient(0, 0, canvas.width, 360);
    topGradient.addColorStop(0, '#fff0f7');
    topGradient.addColorStop(0.55, '#fff8ed');
    topGradient.addColorStop(1, '#f9f3fc');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, canvas.width, 380);

    // Dải màu gradient thương hiệu trên cùng
    const accent = ctx.createLinearGradient(0, 0, canvas.width, 0);
    accent.addColorStop(0, '#ef2b9d');
    accent.addColorStop(0.5, '#c90c6c');
    accent.addColorStop(1, '#f4a62a');
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, canvas.width, 16);

    // 2. Header thương hiệu
    if (hasAgentLogo) {
        // Kiểu 1 (Đồng thương hiệu): Logo Pastie Chat bên trái, Logo Agent bên phải
        const pHeight = 66;
        const pWidth = pHeight * (logoImage.naturalWidth / logoImage.naturalHeight);
        ctx.drawImage(logoImage, 76, 44, pWidth, pHeight);

        const badgeSize = 74;
        const badgeX = canvas.width - 76 - badgeSize;
        const badgeY = 40;

        ctx.save();
        ctx.shadowColor = 'rgba(201, 12, 108, 0.18)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 5;
        drawPosterRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#f6d3e6';
        ctx.lineWidth = 2;
        drawPosterRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 18);
        ctx.stroke();

        ctx.save();
        drawPosterRoundedRect(ctx, badgeX + 4, badgeY + 4, badgeSize - 8, badgeSize - 8, 14);
        ctx.clip();
        ctx.drawImage(agentLogoImage, badgeX + 4, badgeY + 4, badgeSize - 8, badgeSize - 8);
        ctx.restore();
    } else {
        // Kiểu 2 (Chuẩn Pastie) hoặc Agent không có logo: Logo Pastie Chat ở giữa
        const pHeight = 74;
        const pWidth = pHeight * (logoImage.naturalWidth / logoImage.naturalHeight);
        ctx.drawImage(logoImage, (canvas.width - pWidth) / 2, 44, pWidth, pHeight);
    }

    ctx.textAlign = 'center';

    // 3. Slogan nhận diện song ngữ Anh - Việt
    ctx.fillStyle = '#c90c6c';
    ctx.font = `800 25px ${posterFont}`;
    ctx.fillText('Không rào cản ngôn ngữ, thấu hiểu mọi khách hàng', canvas.width / 2, 154);

    ctx.fillStyle = '#755a68';
    ctx.font = `600 18px ${posterFont}`;
    ctx.fillText('No language barriers • Understand every customer', canvas.width / 2, 184);

    // 4. Tên Agent và Tên QR
    const nameText = businessName || 'Pastie Chat Partner';
    ctx.fillStyle = '#30233a';
    ctx.font = `800 32px ${posterFont}`;
    drawPosterText(ctx, nameText, canvas.width / 2, 226, 860, 38, 1);

    if (qrLabel && qrLabel.trim() && qrLabel.trim() !== nameText.trim()) {
        const labelText = String(qrLabel).trim();
        ctx.font = `700 19px ${posterFont}`;
        const textW = ctx.measureText(labelText).width;
        const pillW = Math.min(Math.max(textW + 48, 150), 520);
        const pillH = 38;
        const pillX = (canvas.width - pillW) / 2;
        const pillY = 248;

        ctx.fillStyle = '#fff0f7';
        drawPosterRoundedRect(ctx, pillX, pillY, pillW, pillH, 19);
        ctx.fill();

        ctx.strokeStyle = '#f6d3e6';
        ctx.lineWidth = 1.5;
        drawPosterRoundedRect(ctx, pillX, pillY, pillW, pillH, 19);
        ctx.stroke();

        ctx.fillStyle = '#c90c6c';
        ctx.fillText(labelText, canvas.width / 2, pillY + 25);
    }

    // 5. Khung thẻ QR (.vo-qr + .the-qr + 4 góc ngắm camera)
    const cardSize = 630;
    const cardX = (canvas.width - cardSize) / 2;
    const cardY = 302;

    // Lớp hào quang vo-qr ngoài
    const voPadding = 14;
    const voX = cardX - voPadding;
    const voY = cardY - voPadding;
    const voSize = cardSize + voPadding * 2;
    const voRadius = 36;

    ctx.save();
    ctx.shadowColor = 'rgba(201, 12, 108, 0.24)';
    ctx.shadowBlur = 46;
    ctx.shadowOffsetY = 20;
    const auraGrad = ctx.createLinearGradient(voX, voY, voX + voSize, voY + voSize);
    auraGrad.addColorStop(0, 'rgba(239, 43, 157, 0.35)');
    auraGrad.addColorStop(1, 'rgba(255, 190, 120, 0.35)');
    ctx.fillStyle = auraGrad;
    drawPosterRoundedRect(ctx, voX, voY, voSize, voSize, voRadius);
    ctx.fill();
    ctx.restore();

    // Thẻ the-qr trắng bên trong
    ctx.fillStyle = '#ffffff';
    drawPosterRoundedRect(ctx, cardX, cardY, cardSize, cardSize, 24);
    ctx.fill();
    ctx.strokeStyle = '#f6d3e6';
    ctx.lineWidth = 2;
    drawPosterRoundedRect(ctx, cardX, cardY, cardSize, cardSize, 24);
    ctx.stroke();

    // 4 góc ngắm camera (.goc)
    drawCameraCorners(ctx, cardX + 16, cardY + 16, cardSize - 32, cardSize - 32, 40, 10, 5, '#ef2b9d');

    // Vẽ mã QR
    const qrPadding = 48;
    const qrSize = cardSize - qrPadding * 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrImage, cardX + qrPadding, cardY + qrPadding, qrSize, qrSize);
    ctx.imageSmoothingEnabled = true;

    // Tâm khung QR: có logo Agent ở Kiểu 1, không có logo ở Kiểu 2 / khi không có logo
    if (hasAgentLogo) {
        const cX = canvas.width / 2;
        const cY = cardY + cardSize / 2;
        const badgeQrSize = 98;
        const bX = cX - badgeQrSize / 2;
        const bY = cY - badgeQrSize / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(61, 10, 38, 0.18)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        drawPosterRoundedRect(ctx, bX, bY, badgeQrSize, badgeQrSize, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        drawPosterRoundedRect(ctx, bX, bY, badgeQrSize, badgeQrSize, 18);
        ctx.stroke();

        ctx.save();
        drawPosterRoundedRect(ctx, bX + 6, bY + 6, badgeQrSize - 12, badgeQrSize - 12, 14);
        ctx.clip();
        ctx.drawImage(agentLogoImage, bX + 6, bY + 6, badgeQrSize - 12, badgeQrSize - 12);
        ctx.restore();
    }

    // 6. Khu vực chỉ dẫn quét mã song ngữ dưới khung QR
    ctx.fillStyle = '#30233a';
    ctx.font = `800 29px ${posterFont}`;
    ctx.fillText('QUÉT MÃ ĐỂ BẮT ĐẦU TRÒ CHUYỆN', canvas.width / 2, 984);

    ctx.fillStyle = '#786b7b';
    ctx.font = `700 21px ${posterFont}`;
    ctx.fillText('SCAN TO START A CHAT', canvas.width / 2, 1022);

    // Thanh hướng dẫn camera song ngữ
    const pillY = 1058;
    const pillH = 54;
    const pillW = 730;
    const pillX = (canvas.width - pillW) / 2;

    ctx.fillStyle = '#fff0f7';
    drawPosterRoundedRect(ctx, pillX, pillY, pillW, pillH, 27);
    ctx.fill();

    ctx.strokeStyle = '#f6d3e6';
    ctx.lineWidth = 1.5;
    drawPosterRoundedRect(ctx, pillX, pillY, pillW, pillH, 27);
    ctx.stroke();

    ctx.fillStyle = '#b62b70';
    ctx.font = `700 17px ${posterFont}`;
    ctx.fillText('Mở Camera / Open Camera  •  Hướng vào QR / Point at QR', canvas.width / 2, pillY + 34);

    // Tính năng nổi bật song ngữ
    ctx.fillStyle = '#8d7889';
    ctx.font = `600 16px ${posterFont}`;
    ctx.fillText('Dịch tự động đa ngôn ngữ  •  Real-time AI Translation', canvas.width / 2, 1146);

    // Chân trang song ngữ
    ctx.fillStyle = '#9a8b99';
    ctx.font = `500 16px ${posterFont}`;
    ctx.fillText('Vận hành bởi Pastie  •  Powered by Pastie', canvas.width / 2, 1316);

    return new Promise((resolve, reject) => canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Không thể xuất poster QR.')),
        'image/png',
    ));
}


function downloadPosterBlob(blob, label, style = 'poster') {
    const safeName = String(label || 'pastie-qr')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'pastie-qr';
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${safeName}-${style}.png`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}


function closeQrPreview() {
    qrPreviewModal?.classList.add('hide');
    if (typeof activeQrPreviewState !== 'undefined') activeQrPreviewState = null;
    if (qrPreviewImage) {
        qrPreviewImage.removeAttribute('src');
        qrPreviewImage.classList.add('is-hidden');
    }
    const loader = document.getElementById('qr-poster-loader');
    if (loader) loader.classList.remove('is-hidden');
    if (qrPreviewPosterUrl) {
        URL.revokeObjectURL(qrPreviewPosterUrl);
        qrPreviewPosterUrl = '';
    }
}


function setOrgStatus(message, kind) {
    const el = document.getElementById('org-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('hide', !message);
    el.classList.toggle('is-error', kind === 'error');
    if (kind === 'error' && message) {
        toastError(message);
    }
}


async function orgFetch(path, options) {
    const response = await authFetch(`${API_BASE}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Thao tác không thành công.');
    return data;
}


// Gom giờ bắt đầu/kết thúc thành mảng khung giờ mà API mong đợi.
function orgHourWindows(startId, endId) {
    const start = document.getElementById(startId)?.value;
    const end = document.getElementById(endId)?.value;
    if (!start || !end) return [];
    return [{ start_time: start, end_time: end }];
}


function formatHourWindows(windows) {
    if (!Array.isArray(windows) || windows.length === 0) return 'Cả ngày';
    return windows
        .map((w) => `${String(w.start_time).slice(0, 5)}–${String(w.end_time).slice(0, 5)}`)
        .join(', ');
}


function switchOrgTab(name) {
    window.closeAddBoxModal?.();
    document.querySelectorAll('[data-org-tab]').forEach((tab) => {
        tab.classList.toggle('is-active', tab.dataset.orgTab === name);
    });
    document.querySelectorAll('[data-org-pane]').forEach((pane) => {
        pane.classList.toggle('hide', pane.dataset.orgPane !== name);
    });
    setOrgStatus('');
    if (name === 'agents') void loadOrgAgents();
    if (name === 'sales') void loadOrgSales();
    if (name === 'groups') void loadOrgGroups();
    if (name === 'qr') void loadOrgQr();
    // Thực đơn nằm ở menu-console.js — mảnh đầu tiên của QR Console tách riêng.
    if (name === 'menu') {
        void window.MenuConsole?.load();
        void loadAgentMenuSettings();
    }
}


function openOrgModal() {
    window.closeAddBoxModal?.();
    initShiftSelects(); // dựng danh sách giờ 24h ở lần mở đầu tiên
    // Hai màn hình tách bạch, không chồng lấn:
    //   Superadmin -> chỉ thẻ Agent (tạo Agent + đặt trần số Sale).
    //   Agent quản lý -> Sale / Nhóm / QR, tự sắp xếp tổ chức của mình.
    // Superadmin cố tình KHÔNG thiết lập thay Agent; backend cũng trả 403.
    const isSuper = CURRENT_ADMIN?.role === 'superadmin';
    document.querySelector('[data-org-tab="agents"]')?.classList.toggle('hide', !isSuper);
    ['sales', 'groups', 'qr', 'menu'].forEach((name) => {
        document.querySelector(`[data-org-tab="${name}"]`)?.classList.toggle('hide', isSuper);
    });
    const title = document.getElementById('org-title');
    if (title) title.textContent = isSuper ? 'Quản lý Agent' : 'Quản lý Sale, nhóm, QR và thực đơn';
    const kicker = document.getElementById('org-kicker');
    if (kicker) kicker.textContent = 'PHÂN CẤP TỔ CHỨC';

    if (isSuper) {
        const select = document.getElementById('org-agent-project');
        if (select) {
            const qrProjects = (PROJECTS || []).filter((project) => project.project_type === 'qr_concierge');
            // Một dự án QR duy nhất là trường hợp thường gặp: chọn sẵn rồi ẩn ô đi,
            // đỡ một dòng vô nghĩa trong form (và một hàng nữa trên màn hình hẹp).
            document.getElementById('org-agent-project-field')?.classList.toggle('hide', qrProjects.length <= 1);
            select.innerHTML = qrProjects.length
                ? qrProjects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name || project.id)}</option>`).join('')
                : '<option value="">Chưa có dự án QR Concierge</option>';
        }
    }

    document.getElementById('org-modal')?.classList.remove('hide');
    switchOrgTab(isSuper ? 'agents' : 'sales');
    // Nhóm được tải sẵn vì hai form Sale và QR đều cần danh sách nhóm.
    if (!isSuper) void loadOrgGroups(true);
}


function closeOrgModal() {
    window.closeAddBoxModal?.();
    document.getElementById('org-modal')?.classList.add('hide');
}


// --- Agent -------------------------------------------------------------------

async function loadOrgAgents() {
    const box = document.getElementById('org-agent-list');
    const badge = document.getElementById('org-agent-count-badge');
    if (!box) return;
    box.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải danh sách Agent…</p>';
    try {
        const agents = await orgFetch('/api/superadmin/agents');
        if (badge) badge.textContent = `${agents.length} Agent`;
        box.innerHTML = agents.length ? agents.map((agent) => `
            <article class="org-item">
                <div class="org-item-main">
                    <strong>
                        ${escapeHtml(agent.full_name || agent.username)}
                        <span class="org-shift is-on">${escapeHtml(agent.project_id || 'QR Concierge')}</span>
                    </strong>
                    <small>${escapeHtml(agent.username)}</small>
                    <small><i class="ri-team-line"></i> Đã tạo: <strong>${agent.sale_count}${agent.sale_limit ? '/' + agent.sale_limit : ''} Sale</strong>
                        · <strong>${agent.group_count} nhóm</strong>${agent.sale_limit && agent.sale_count >= agent.sale_limit ? ' · <span style="color:#ef4444;font-weight:700;">Đã hết suất</span>' : ''}</small>
                </div>
                <div class="org-agent-actions">
                    <button type="button" class="org-device-btn" data-agent-devices="${agent.id}" data-agent-name="${escapeHtml(agent.full_name || agent.username)}">
                        <i class="ri-device-line"></i> Thiết bị
                    </button>
                    <label class="org-defer" style="display:flex; flex-direction:column; gap:2px;">
                        <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">Trả chậm (chỉ 1 trong 2)</span>
                        <select data-agent-defer="${agent.id}" title="Chỉ chọn 1 trong 2: Cộng vào tiền phòng hoặc Thanh toán sau">
                            <option value="none"${agent.deferred_payment_mode === 'none' || !agent.deferred_payment_mode ? ' selected' : ''}>Không có (Chỉ trả ngay)</option>
                            <option value="room_charge"${agent.deferred_payment_mode === 'room_charge' ? ' selected' : ''}>Cộng tiền phòng (Room charge)</option>
                            <option value="pay_later"${agent.deferred_payment_mode === 'pay_later' ? ' selected' : ''}>Thanh toán sau (Pay later)</option>
                        </select>
                    </label>
                    <button type="button" class="org-menu-toggle-btn ${agent.superadmin_menu_disabled ? 'is-menu-off' : 'is-menu-on'}" data-agent-menu-toggle="${agent.id}" data-menu-disabled="${agent.superadmin_menu_disabled}" title="Bật/Tắt tính năng thực đơn cho Agent này">
                        <i class="${agent.superadmin_menu_disabled ? 'ri-restaurant-line' : 'ri-restaurant-fill'}"></i> ${agent.superadmin_menu_disabled ? 'Menu: Tắt (SA)' : 'Menu: Bật'}
                    </button>
                    <button type="button" class="org-toggle" data-agent-toggle="${agent.id}" data-active="${agent.is_active}">
                        ${agent.is_active ? '✓ Đang hoạt động' : '✗ Đã khóa'}
                    </button>
                </div>
            </article>`).join('') : '<p class="org-empty">Chưa có Agent nào trong hệ thống.</p>';
    } catch (error) {
        if (badge) badge.textContent = '0 Agent';
        box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
    }
}


// --- Superadmin quản lý thiết bị Agent --------------------------------------
let managedDeviceAgentId = null;

function closeAgentDevicesModal() {
    document.getElementById('agent-devices-modal')?.classList.add('hide');
    managedDeviceAgentId = null;
}

function formatManagedDeviceTime(value) {
    if (!value) return 'Chưa có dữ liệu';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : date.toLocaleString('vi-VN');
}

async function loadAgentDevices(agentId, agentName = '') {
    const modal = document.getElementById('agent-devices-modal');
    const list = document.getElementById('agent-devices-list');
    if (!modal || !list) return;
    managedDeviceAgentId = Number(agentId);
    modal.classList.remove('hide');
    document.getElementById('agent-devices-account').textContent = agentName || `Agent #${agentId}`;
    list.innerHTML = '<p class="agent-devices-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải thiết bị…</p>';
    try {
        const data = await orgFetch(`/api/superadmin/accounts/${agentId}/devices`);
        const account = data.account || {};
        document.getElementById('agent-devices-account').textContent = `${account.full_name || agentName || account.username || `Agent #${agentId}`} · ${account.username || ''}`;
        document.getElementById('agent-device-limit').value = data.limit || 2;
        const activeCount = (data.devices || []).filter((device) => device.status === 'active').length;
        document.getElementById('agent-devices-help').textContent = `${activeCount}/${data.limit} thiết bị đang hoạt động. Hạn mức tính theo mã thiết bị do hệ thống cấp, không theo IP hoặc trình duyệt. Đổi Wi-Fi/4G/5G không tạo thiết bị mới. Lần đổi gần nhất: ${formatManagedDeviceTime(data.lastChangeAt)}.`;
        list.innerHTML = (data.devices || []).length ? data.devices.map((device) => `
            <article class="agent-device-row${device.status !== 'active' ? ' is-revoked' : ''}">
                <span class="agent-device-icon"><i class="${/iphone|android|ipad|mobile/i.test(device.label || '') ? 'ri-smartphone-line' : 'ri-computer-line'}"></i></span>
                <div class="agent-device-copy">
                    <strong>Thiết bị ${escapeHtml(String(device.device_id || device.id || '').slice(-12).toUpperCase())}</strong>
                    <small>Nhãn tham khảo: ${escapeHtml(device.label || 'Không xác định')}</small>
                    <small>Lần đầu: ${escapeHtml(formatManagedDeviceTime(device.first_seen))} · Lần cuối: ${escapeHtml(formatManagedDeviceTime(device.last_seen))}</small>
                    <small>IP truy cập gần nhất (chỉ nhật ký): ${escapeHtml(device.last_ip || 'Không ghi nhận')}</small>
                </div>
                <span class="agent-device-status">${device.status === 'active' ? 'HOẠT ĐỘNG' : 'ĐÃ THU HỒI'}</span>
                ${device.status === 'active' ? `<button type="button" class="agent-device-revoke" data-revoke-device="${device.id}" title="Thu hồi thiết bị"><i class="ri-logout-box-r-line"></i></button>` : ''}
            </article>`).join('') : '<p class="agent-devices-empty">Agent này chưa đăng ký thiết bị nào.</p>';
    } catch (error) {
        list.innerHTML = `<p class="agent-devices-empty">${escapeHtml(error.message)}</p>`;
    }
}

document.getElementById('org-agent-list')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-agent-devices]');
    if (button) void loadAgentDevices(button.dataset.agentDevices, button.dataset.agentName);
});

document.getElementById('agent-devices-close')?.addEventListener('click', closeAgentDevicesModal);
document.getElementById('agent-devices-modal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeAgentDevicesModal();
});

document.getElementById('agent-device-limit-save')?.addEventListener('click', async () => {
    if (!managedDeviceAgentId) return;
    const deviceLimit = Number(document.getElementById('agent-device-limit')?.value);
    if (!Number.isInteger(deviceLimit) || deviceLimit < 1 || deviceLimit > 20) return showToast('Giới hạn phải từ 1 đến 20 thiết bị.', 'error');
    try {
        await orgFetch(`/api/superadmin/accounts/${managedDeviceAgentId}/device-limit`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceLimit }),
        });
        showToast('Đã lưu giới hạn thiết bị.', 'success');
        await loadAgentDevices(managedDeviceAgentId);
    } catch (error) { showToast(error.message, 'error'); }
});

document.getElementById('agent-devices-list')?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-revoke-device]');
    if (!button || !managedDeviceAgentId) return;
    const ok = await pastieConfirm('Thiết bị này sẽ bị đăng xuất ngay. Các thiết bị khác của Agent không bị ảnh hưởng.', { title: 'Thu hồi thiết bị?', confirmText: 'Thu hồi', danger: true });
    if (!ok) return;
    try {
        await orgFetch(`/api/superadmin/accounts/${managedDeviceAgentId}/devices/${button.dataset.revokeDevice}`, { method: 'DELETE' });
        showToast('Đã thu hồi thiết bị.', 'success');
        await loadAgentDevices(managedDeviceAgentId);
    } catch (error) { showToast(error.message, 'error'); }
});

document.getElementById('agent-devices-reset')?.addEventListener('click', async () => {
    if (!managedDeviceAgentId) return;
    const ok = await pastieConfirm('Tất cả thiết bị của Agent sẽ bị thu hồi và mọi phiên đăng nhập hiện tại bị kết thúc.', { title: 'Thu hồi tất cả thiết bị?', confirmText: 'Thu hồi tất cả', danger: true });
    if (!ok) return;
    try {
        await orgFetch(`/api/superadmin/accounts/${managedDeviceAgentId}/devices/reset`, { method: 'POST' });
        showToast('Đã thu hồi toàn bộ thiết bị của Agent.', 'success');
        await loadAgentDevices(managedDeviceAgentId);
    } catch (error) { showToast(error.message, 'error'); }
});


// Superadmin chọn nút thanh toán chậm nào hiện cho khách của một Agent.
//
// Chỉ MỘT trong hai nút được hiện, không bao giờ cả hai: khách sạn dùng "cộng
// tiền phòng", cơ sở lẻ dùng "thanh toán sau". Hiện cả hai thì khách phải hiểu
// sự khác nhau giữa hai thứ vốn là chuyện nội bộ của cơ sở.
//
// Đây cũng là phương thức được TỰ CHỌN nếu khách không bấm gì trong 2 phút sau
// khi nhận bill — nên chọn "Không có" nghĩa là không bao giờ tự chọn thay khách.
async function setAgentDeferredPayment(agentId, mode) {
    try {
        const result = await orgFetch(`/api/admin/agents/${agentId}/deferred-payment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode }),
        });
        const label = { none: 'không có nút trả chậm', room_charge: 'cộng vào tiền phòng', pay_later: 'thanh toán sau' }[mode];
        showToast(`${result.agent?.full_name || 'Agent'}: ${label}.`, 'success');
    } catch (error) {
        showToast(error.message, 'error');
        void loadOrgAgents(true);   // trả ô chọn về đúng giá trị đang lưu
    }
}

// --- Sale --------------------------------------------------------------------

function resetOrgSaleForm() {
    const form = document.getElementById('org-sale-form');
    if (!form) return;
    form.reset();
    const idEl = document.getElementById('org-sale-id');
    if (idEl) idEl.value = '';
    const emailEl = document.getElementById('org-sale-email');
    if (emailEl) {
        emailEl.readOnly = false;
        emailEl.style.opacity = '1';
        emailEl.title = '';
        // Xoá mốc email cũ: bỏ sót thì form thêm Sale mới sẽ so với email của Sale
        // vừa sửa và hỏi nhầm "bạn có muốn đổi email không".
        delete emailEl.dataset.emailGoc;
    }
    const fileEl = document.getElementById('org-sale-avatar-file');
    if (fileEl) fileEl.value = '';
    const nameEl = document.getElementById('org-sale-avatar-filename');
    if (nameEl) nameEl.textContent = 'Chưa chọn ảnh';
    const clearBtn = document.getElementById('org-sale-avatar-clear-btn');
    if (clearBtn) clearBtn.classList.add('hide');
    const previewEl = document.getElementById('org-sale-avatar-preview');
    if (previewEl) previewEl.innerHTML = '<span id="org-sale-avatar-char">S</span>';

    const submitBtn = document.getElementById('org-sale-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="ri-user-add-line"></i> Thêm Sale';
    // Giữ nút Hủy luôn hiện diện để người dùng có thể thoát ra bất cứ lúc nào
    document.getElementById('org-sale-cancel-btn')?.classList.remove('hide');
}


async function loadOrgSales() {
    const box = document.getElementById('org-sale-list');
    const badge = document.getElementById('org-sale-count-badge');
    const quotaCount = document.getElementById('org-quota-count');
    if (!box) return;
    box.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
    try {
        // Cập nhật lại thông tin CURRENT_ADMIN để lấy sale_limit mới nhất từ server
        try {
            const meRes = await authFetch(`${API_BASE}/api/admin/me`);
            const meData = await meRes.json();
            if (meData?.admin) {
                CURRENT_ADMIN = { ...CURRENT_ADMIN, ...meData.admin };
            }
        } catch (e) {}

        window.ORG_SALES = await orgFetch('/api/agent/sales');
        const count = window.ORG_SALES.length;
        if (badge) badge.textContent = `${count} Sale`;
        if (quotaCount) {
            // Trước đây khi không có trần thì hiện "Hạn mức: 2 (Không giới hạn)" —
            // đọc như thể trần là 2, trong khi 2 là SỐ ĐÃ TẠO. Luôn nói rõ con số
            // nào là gì.
            const limit = CURRENT_ADMIN?.sale_limit;
            const hasLimit = limit !== null && limit !== undefined && limit !== '' && Number.isFinite(Number(limit));
            if (hasLimit) {
                const left = Math.max(0, Number(limit) - count);
                quotaCount.textContent = left > 0
                    ? `Đã tạo ${count}/${limit} Sale · còn ${left} suất`
                    : `Đã tạo ${count}/${limit} Sale · đã hết suất`;
                quotaCount.classList.toggle('is-full', left <= 0);
            } else {
                quotaCount.textContent = `Đã tạo ${count} Sale · không giới hạn`;
                quotaCount.classList.remove('is-full');
            }
        }

        // Cập nhật select Sale trong Form Tạo Nhóm
        renderSalePicker(window.ORG_SALES);

        box.innerHTML = window.ORG_SALES.length ? window.ORG_SALES.map((sale) => `
            <article class="org-item sale-card">
                <div class="sale-card-profile">
                    ${sale.avatar_url 
                        ? `<div class="sale-avatar"><img src="${escapeHtml(sale.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;"></div>`
                        : `<div class="sale-avatar sale-avatar-fallback">${escapeHtml((sale.full_name || 'S').trim().charAt(0).toUpperCase())}</div>`
                    }
                    <div class="sale-info">
                        <div class="sale-name-row">
                            <strong class="sale-name">${escapeHtml(sale.full_name || sale.username)}</strong>
                            <span class="org-shift ${sale.on_shift ? 'is-on' : ''}">${sale.on_shift ? 'Trong ca' : 'Ngoài ca'}</span>
                        </div>
                        <span class="sale-email">${escapeHtml(sale.username)}</span>
                    </div>
                </div>
                <div class="sale-tags">
                    <span class="sale-tag"><i class="ri-time-line"></i> ${escapeHtml(formatHourWindows(sale.access_hours))}</span>
                    <span class="sale-tag"><i class="ri-team-line"></i> ${(sale.groups || []).map((g) => escapeHtml(g.name)).join(', ') || 'Chưa gán nhóm'}</span>
                </div>
                <div class="sale-actions">
                    <button type="button" class="sale-btn-edit" data-sale-edit="${sale.id}" title="Sửa thông tin Sale">
                        <i class="ri-edit-line"></i> Sửa
                    </button>
                    <button type="button" class="org-toggle sale-btn-toggle ${sale.is_active ? 'is-active' : 'is-locked'}" data-sale-toggle="${sale.id}" data-active="${sale.is_active}">
                        <i class="${sale.is_active ? 'ri-checkbox-circle-line' : 'ri-lock-line'}"></i>
                        <span>${sale.is_active ? 'Hoạt động' : 'Đã khóa'}</span>
                    </button>
                    <button type="button" class="org-remove sale-btn-delete" data-sale-delete="${sale.id}" title="Xóa tài khoản Sale">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </article>`).join('') : '<p class="org-empty">Chưa có tài khoản Sale nào.</p>';
    } catch (error) {
        if (badge) badge.textContent = '0 Sale';
        box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
    }
}


// --- Nhóm --------------------------------------------------------------------

async function loadOrgGroups(quiet) {
    const box = document.getElementById('org-group-list');
    const badge = document.getElementById('org-group-count-badge');
    if (!quiet && box) box.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
    try {
        if ((window.ORG_SALES || []).length === 0) {
            try { window.ORG_SALES = await orgFetch('/api/agent/sales'); } catch(e) {}
        }
        window.ORG_GROUPS = await orgFetch('/api/agent/groups');
        if (badge) badge.textContent = `${window.ORG_GROUPS.length} Nhóm`;

        // Cập nhật select Sale trong Form Tạo Nhóm
        renderSalePicker(window.ORG_SALES || []);

        if (box && !quiet) {
            box.innerHTML = window.ORG_GROUPS.length ? window.ORG_GROUPS.map((group) => {
                const groupSales = group.sales || [];
                const groupSaleIds = new Set(groupSales.map(s => Number(s.sale_id)));
                const notInGroupSales = (window.ORG_SALES || []).filter(s => !groupSaleIds.has(Number(s.id)));

                const chipsHtml = groupSales.length ? groupSales.map(s => `
                    <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;color:var(--text-primary);">
                        <span>${escapeHtml(s.full_name || 'Sale')}</span>
                        <button type="button" data-remove-sale-group="${group.id}" data-sale-id="${s.sale_id}" style="border:none;background:none;cursor:pointer;color:#ef4444;font-size:13px;padding:0 2px;display:flex;align-items:center;" title="Xóa Sale khỏi nhóm">&times;</button>
                    </span>
                `).join('') : '<span style="font-size:11.5px;color:var(--text-secondary);font-style:italic;">Chưa có Sale trong nhóm này</span>';

                const addSaleOptions = notInGroupSales.map(s => `<option value="${s.id}">+ ${escapeHtml(s.full_name || s.username)}</option>`).join('');

                return `
                <article class="org-item" style="flex-direction:column;align-items:stretch;gap:8px;padding:12px 14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <strong style="font-size:13.5px;"><i class="ri-team-line" style="color:var(--accent-color);margin-right:4px;"></i>${escapeHtml(group.name)}</strong>
                            <small style="margin-left:8px;color:var(--text-secondary);">${group.waiting_count} chờ / ${group.active_count} đang chat</small>
                            ${group.description ? `<p style="margin:2px 0 0 0;font-size:11.5px;color:var(--text-secondary);">${escapeHtml(group.description)}</p>` : ''}
                        </div>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <button type="button" class="org-btn-edit" data-group-edit="${group.id}" title="Sửa tên nhóm" style="background:rgba(99,102,241,0.1);color:#6366f1;border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:4px 8px;font-size:11.5px;cursor:pointer;font-weight:600;"><i class="ri-edit-line"></i> Sửa</button>
                            <button type="button" class="org-remove" data-group-delete="${group.id}" title="Xóa nhóm"><i class="ri-delete-bin-line"></i></button>
                        </div>
                    </div>

                    <!-- Quản lý thành viên Sale trong nhóm -->
                    <div style="background:rgba(0,0,0,0.025);border:1px solid var(--panel-border);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                            <span style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;">Thành viên (${groupSales.length})</span>
                            ${notInGroupSales.length ? `
                                <select class="org-add-sale-to-group-select" data-group-id="${group.id}" style="font-size:11px;padding:2px 6px;border-radius:5px;background:var(--panel-bg);border:1px solid var(--panel-border);color:var(--text-primary);cursor:pointer;">
                                    <option value="">+ Thêm Sale vào nhóm...</option>
                                    ${addSaleOptions}
                                </select>
                            ` : '<span style="font-size:10.5px;color:var(--text-secondary);">(Đã đủ tất cả Sale)</span>'}
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${chipsHtml}
                        </div>
                    </div>
                </article>`;
            }).join('') : '<p class="org-empty">Chưa có nhóm nào.</p>';
        }

        const groupOptions = (window.ORG_GROUPS || []).map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join('');
        const saleGroupSelect = document.getElementById('org-sale-group');
        if (saleGroupSelect) {
            saleGroupSelect.innerHTML = '<option value="">— Chưa gán nhóm —</option>' + groupOptions;
        }
        const qrGroupSelect = document.getElementById('org-qr-group');
        if (qrGroupSelect) {
            qrGroupSelect.innerHTML = groupOptions || '<option value="">Chưa có nhóm nào</option>';
        }
        const qrFilterSelect = document.getElementById('org-qr-group-filter');
        if (qrFilterSelect) {
            const currentFilter = qrFilterSelect.value;
            qrFilterSelect.innerHTML = '<option value="">— Tất cả nhóm —</option>' + groupOptions;
            if (currentFilter && [...qrFilterSelect.options].some(o => o.value === currentFilter)) {
                qrFilterSelect.value = currentFilter;
            }
        }
    } catch (error) {
        if (badge) badge.textContent = '0 Nhóm';
        if (box && !quiet) box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
    }
}


async function loadOrgQr() {
    const box = document.getElementById('org-qr-list');
    const badge = document.getElementById('org-qr-count-badge');
    if (!box) return;
    box.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
    try {
        if ((window.ORG_SALES || []).length === 0) await loadOrgSales();
        window.CURRENT_QR_ACCOUNTS = await orgFetch('/api/agent/qr-accounts');
        renderOrgQrList();
    } catch (error) {
        if (badge) badge.textContent = '0 QR';
        box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
    }
}


function renderOrgQrList() {
    const box = document.getElementById('org-qr-list');
    const badge = document.getElementById('org-qr-count-badge');
    const filterSelect = document.getElementById('org-qr-group-filter');
    if (!box) return;

    const selectedGroupId = filterSelect ? filterSelect.value : '';
    const allQr = window.CURRENT_QR_ACCOUNTS || [];
    const filtered = selectedGroupId
        ? allQr.filter(a => Number(a.group_id) === Number(selectedGroupId))
        : allQr;

    if (badge) badge.textContent = `${filtered.length} QR`;
    const eventValue = (value) => encodeURIComponent(value ?? '').replace(/'/g, '%27');
    box.innerHTML = filtered.length ? filtered.map((account) => {
        const qrThumb = `https://quickchart.io/qr?size=160&text=${encodeURIComponent(account.chat_url)}`;
        return `
        <article class="qr-card">
            <div class="qr-card-top">
                <div class="qr-thumb-box" data-qr-poster="${account.id}" title="Bấm để xem và tải mã QR">
                    <img src="${qrThumb}" alt="QR" class="qr-thumb-img" loading="lazy">
                </div>
                <div class="qr-card-main">
                    <div class="qr-card-title-row">
                        <strong class="qr-card-title">${escapeHtml(account.label)}</strong>
                        <span class="qr-card-group"><i class="ri-team-line"></i> ${escapeHtml(account.group_name || 'Chưa gán nhóm')}</span>
                    </div>
                    <small class="qr-card-link-preview">${escapeHtml(account.chat_url)}</small>
                </div>
            </div>
            <div class="qr-card-actions">
                <button type="button" class="qr-btn-view" data-qr-poster="${account.id}" title="Xem và tải ảnh mã QR">
                    <i class="ri-qr-code-line"></i> <span>Xem mã</span>
                </button>
                <button type="button" class="qr-btn-edit" data-qr-edit="${account.id}" title="Sửa thông tin mã QR">
                    <i class="ri-edit-line"></i> <span>Sửa</span>
                </button>
                <button type="button" class="qr-btn-delete" data-qr-revoke="${account.id}" title="Xóa mã QR này">
                    <i class="ri-delete-bin-line"></i> <span>Xóa</span>
                </button>
            </div>
        </article>`;
    }).join('') : tableEmptyBlock(selectedGroupId);
}


// =====================================================================
// Ô chọn giờ và ô chọn Sale
//
// Giờ: <input type="time"> để trình duyệt tự quyết 12h hay 24h theo locale của
// MÁY người dùng, nên máy đặt tiếng Anh sẽ hiện AM/PM dù giao diện là tiếng Việt.
// Không có thuộc tính HTML nào ép được 24 giờ. Vì vậy dùng <select> tự dựng:
// giá trị luôn là "HH:MM" 24 giờ, nhãn kèm buổi cho dễ đọc.
//
// Sale: <select multiple> bắt giữ Ctrl/Cmd để chọn nhiều, trên điện thoại gần như
// không dùng được. Thay bằng danh sách bấm-để-chọn.
// =====================================================================

// 00:00-10:59 sáng · 11:00-12:59 trưa · 13:00-17:59 chiều · 18:00-23:59 tối
function periodOfDay(hour) {
    if (hour < 11) return 'sáng';
    if (hour < 13) return 'trưa';
    if (hour < 18) return 'chiều';
    return 'tối';
}


function setTimeSelect(select, value) {
    if (!select || !value) return;
    const clean = String(value).slice(0, 5);
    if (![...select.options].some((option) => option.value === clean)) {
        const option = document.createElement('option');
        option.value = clean;
        option.textContent = `${clean} · ${periodOfDay(Number(clean.slice(0, 2)))}`;
        select.appendChild(option);
        // Giữ danh sách đúng thứ tự thời gian sau khi chèn thêm.
        const sorted = [...select.options].sort((a, b) => a.value.localeCompare(b.value));
        select.append(...sorted);
    }
    select.value = clean;
}


function fillTimeSelect(select, selected, stepMinutes = 30) {
    if (!select) return;
    const options = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        options.push(`<option value="${value}">${value} · ${periodOfDay(hour)}</option>`);
    }
    // 23:59 là mốc hay dùng cho ca "cả ngày", mà bước 30 phút không chạm tới.
    options.push('<option value="23:59">23:59 · tối</option>');
    select.innerHTML = options.join('');
    select.value = selected;
    if (!select.value) select.value = options.length ? '00:00' : '';
}


// Ca qua nửa đêm là hợp lệ, nhưng người dùng cần được nói rõ chứ không phải đoán.
function describeShift(startId, endId, hintId) {
    const start = document.getElementById(startId)?.value;
    const end = document.getElementById(endId)?.value;
    const hint = document.getElementById(hintId);
    if (!hint || !start || !end) return;
    const toMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
    if (start === end) {
        hint.textContent = 'Giờ bắt đầu trùng giờ kết thúc — được hiểu là làm cả ngày.';
    } else if (toMinutes(start) > toMinutes(end)) {
        hint.textContent = `Ca qua đêm: từ ${start} hôm nay đến ${end} sáng hôm sau.`;
    } else {
        const hours = Math.round((toMinutes(end) - toMinutes(start)) / 6) / 10;
        hint.textContent = `Ca trong ngày, dài khoảng ${hours} giờ.`;
    }
}


function initShiftSelects() {
    const start = document.getElementById('org-sale-start');
    const end = document.getElementById('org-sale-end');
    if (!start || start.options.length) return;
    fillTimeSelect(start, '08:00');
    fillTimeSelect(end, '17:00');
    const update = () => describeShift('org-sale-start', 'org-sale-end', 'org-sale-shift-hint');
    start.addEventListener('change', update);
    end.addEventListener('change', update);
    update();
}


// --- Ô chọn Sale -------------------------------------------------------------

function renderSalePicker(sales) {
    const host = document.getElementById('org-group-sales-select');
    if (!host) return;
    const chosen = new Set(salePickerValue());
    if (!sales.length) {
        host.innerHTML = '<p class="sale-picker-empty">Chưa có Sale nào. Hãy tạo Sale ở thẻ “Sale” trước.</p>';
        return;
    }
    host.innerHTML = sales.map((sale) => `
        <button type="button" class="sale-chip${chosen.has(Number(sale.id)) ? ' is-on' : ''}" data-sale-id="${sale.id}">
            <span class="sale-chip-tick"><i class="ri-check-line"></i></span>
            <span class="sale-chip-text">
                <strong>${escapeHtml(sale.full_name || sale.username)}</strong>
                <small>${escapeHtml(sale.username)}</small>
            </span>
        </button>`).join('');
}


function salePickerValue() {
    const host = document.getElementById('org-group-sales-select');
    if (!host) return [];
    return [...host.querySelectorAll('.sale-chip.is-on')].map((chip) => Number(chip.dataset.saleId)).filter(Boolean);
}


function clearSalePicker() {
    document.getElementById('org-group-sales-select')
        ?.querySelectorAll('.sale-chip.is-on')
        .forEach((chip) => chip.classList.remove('is-on'));
}

// --- Menu Configuration for Agent -------------------------------------------

async function loadAgentMenuSettings() {
    const card = document.getElementById('agent-menu-settings-card');
    if (!card) return;
    try {
        const res = await authFetch(`${API_BASE}/api/agent/menu-settings`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Không tải được cài đặt menu.');

        const checkbox = document.getElementById('agent-menu-toggle-checkbox');
        const labelInput = document.getElementById('agent-menu-label-input');
        const warning = document.getElementById('agent-menu-superadmin-warning');

        if (checkbox) {
            checkbox.checked = data.agent_menu_enabled && !data.superadmin_menu_disabled;
            checkbox.disabled = data.superadmin_menu_disabled;
        }
        if (labelInput) {
            labelInput.value = data.menu_custom_label || '';
            labelInput.disabled = data.superadmin_menu_disabled;
        }
        if (warning) {
            warning.classList.toggle('hide', !data.superadmin_menu_disabled);
        }

        const customName = data.menu_custom_label || '';
        const tabSpan = document.querySelector('[data-org-tab="menu"] span');
        if (tabSpan) tabSpan.textContent = customName || 'Thực đơn';
        const paneHeader = document.querySelector('[data-org-pane="menu"] .org-list-header h4');
        if (paneHeader) paneHeader.textContent = customName ? `Các món trong ${customName.toLowerCase()}` : 'Các món trong thực đơn';
        const saleBtnText = document.querySelector('#sale-menu-btn span');
        if (saleBtnText) saleBtnText.textContent = customName || 'Thực đơn';
    } catch (err) {
        console.error('loadAgentMenuSettings error:', err.message);
    }
}

async function saveAgentMenuSettings() {
    const saveBtn = document.getElementById('agent-menu-save-btn');
    const checkbox = document.getElementById('agent-menu-toggle-checkbox');
    const labelInput = document.getElementById('agent-menu-label-input');
    if (!saveBtn || !checkbox) return;

    const orig = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i>';

    try {
        const res = await authFetch(`${API_BASE}/api/agent/menu-settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentMenuEnabled: checkbox.checked,
                menuCustomLabel: (labelInput?.value || '').trim()
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data?.error || 'Không thể lưu cài đặt.');
        showToast('Đã lưu cấu hình thực đơn.', 'success');
        await loadAgentMenuSettings();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = orig;
    }
}

document.getElementById('agent-menu-save-btn')?.addEventListener('click', saveAgentMenuSettings);

