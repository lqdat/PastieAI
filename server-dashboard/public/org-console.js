// Màn tổ chức QR — dành riêng vai trò 'agent' của dự án qr_concierge.
//
// Quản lý Sale, nhóm tiếp nhận, mã QR và poster in ra. Cùng nhóm với
// menu-console.js: cả hai là phần QR Console tương lai.
//
// Phụ thuộc core.js. Xem chú thích thứ tự nạp ở đầu core.js.

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
            const eventValue = (value) => encodeURIComponent(value).replace(/'/g, '%27');
            return `<article class="qr-account-card">
                <img src="${imageUrl}" alt="QR chat của ${escapeHtml(account.owner_name)}" loading="lazy">
                <div class="qr-account-info"><strong>${escapeHtml(account.label)}</strong><span><i class="ri-user-3-line"></i> ${escapeHtml(account.owner_name)}</span><small>${escapeHtml(account.chat_url)}</small></div>
                <div class="qr-account-actions"><button type="button" onclick="window.copyQrChatLink('${eventValue(account.chat_url)}', true)"><i class="ri-file-copy-line"></i> Sao chép</button><button type="button" onclick="window.openQrPreview('${eventValue(imageUrl)}', '${eventValue(account.label)}', '${eventValue(account.owner_name)}', '${eventValue(account.chat_url)}')"><i class="ri-zoom-in-line"></i> Mở QR</button></div>
            </article>`;
        }).join('');
    } catch (error) {
        qrAccountList.innerHTML = `<div class="qr-empty qr-error">${escapeHtml(error.message)}</div>`;
    }
}


function loadPosterImage(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Không tải được tài nguyên poster.');
            return response.blob();
        })
        .then(blob => new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(blob);
            const image = new Image();
            image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
            image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Không đọc được ảnh.')); };
            image.src = objectUrl;
        }));
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


async function createBrandedQrPoster(imageUrl, businessName) {
    // Canvas phải chờ webfont hoàn tất; nếu vẽ sớm trình duyệt có thể dùng font
    // fallback thiếu glyph và làm lỗi dấu tiếng Việt trong ảnh PNG tải xuống.
    if (document.fonts?.load) {
        await Promise.allSettled([
            document.fonts.load('400 25px "Be Vietnam Pro"'),
            document.fonts.load('500 20px "Be Vietnam Pro"'),
            document.fonts.load('700 32px "Be Vietnam Pro"'),
            document.fonts.load('800 50px "Be Vietnam Pro"'),
            document.fonts.load('400 66px "Lobster"'),
        ]);
    }
    const [qrImage, logoImage] = await Promise.all([
        loadPosterImage(imageUrl),
        loadPosterImage('/pastie-logo@2x.png'),
    ]);
    const canvas = document.createElement('canvas');
    // Poster 4:5 nhỏ gọn để in bảng để bàn/giấy nhỏ, không dùng tỷ lệ A4.
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ tạo ảnh QR.');
    const posterFont = '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif';

    ctx.fillStyle = '#fffafd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const topGradient = ctx.createLinearGradient(0, 0, canvas.width, 350);
    topGradient.addColorStop(0, '#fff0f7');
    topGradient.addColorStop(.55, '#fff8ed');
    topGradient.addColorStop(1, '#f2edff');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, canvas.width, 390);
    const accent = ctx.createLinearGradient(0, 0, canvas.width, 0);
    accent.addColorStop(0, '#ef2d92');
    accent.addColorStop(.62, '#d81379');
    accent.addColorStop(1, '#f4a62a');
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, canvas.width, 22);

    // Header chỉ có đúng một logo thương hiệu. Không ghép thêm logo nhỏ, không
    // vẽ lại wordmark bằng font và không đặt slogan/câu chào gây trùng lặp.
    const logoWidth = 590;
    const logoHeight = logoWidth * (logoImage.naturalHeight / logoImage.naturalWidth);
    ctx.drawImage(logoImage, (canvas.width - logoWidth) / 2, 64, logoWidth, logoHeight);

    ctx.textAlign = 'center';
    const cardY = 280;
    const cardX = 190;
    const cardSize = 700;
    ctx.save();
    ctx.shadowColor = 'rgba(100, 48, 78, .16)';
    ctx.shadowBlur = 42;
    ctx.shadowOffsetY = 18;
    drawPosterRoundedRect(ctx, cardX, cardY, cardSize, cardSize, 56);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#f1cedf';
    ctx.lineWidth = 3;
    drawPosterRoundedRect(ctx, cardX, cardY, cardSize, cardSize, 56);
    ctx.stroke();

    const qrPadding = 70;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrImage, cardX + qrPadding, cardY + qrPadding, cardSize - qrPadding * 2, cardSize - qrPadding * 2);
    ctx.imageSmoothingEnabled = true;

    const copyY = cardY + cardSize + 50;
    ctx.fillStyle = '#30233a';
    ctx.font = `800 29px ${posterFont}`;
    ctx.fillText('QUÉT MÃ ĐỂ BẮT ĐẦU TRÒ CHUYỆN', canvas.width / 2, copyY);
    ctx.fillStyle = '#786b7b';
    ctx.font = `700 23px ${posterFont}`;
    ctx.fillText('SCAN TO START A CHAT', canvas.width / 2, copyY + 38);

    // Tên cơ sở vẫn có trên poster theo yêu cầu nhận diện ban đầu, nhưng chuyển
    // xuống phần nội dung; khu vực logo phía trên luôn sạch và chỉ có logo.
    ctx.fillStyle = '#30233a';
    ctx.font = `800 28px ${posterFont}`;
    drawPosterText(ctx, businessName || 'Hộ kinh doanh', canvas.width / 2, copyY + 82, 820, 34, 1);

    ctx.fillStyle = '#fff0f7';
    drawPosterRoundedRect(ctx, 205, copyY + 112, 670, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#b62b70';
    ctx.font = `700 17px ${posterFont}`;
    ctx.fillText('Mở Camera / Open Camera  •  Hướng vào QR / Point at QR', canvas.width / 2, copyY + 147);

    ctx.fillStyle = '#9a8b99';
    ctx.font = `500 16px ${posterFont}`;
    ctx.fillText('Vận hành bởi Pastie  •  Powered by Pastie', canvas.width / 2, 1325);

    return new Promise((resolve, reject) => canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Không thể xuất poster QR.')),
        'image/png',
    ));
}


function downloadPosterBlob(blob, label) {
    const safeName = String(label || 'pastie-qr')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'pastie-qr';
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${safeName}-poster.png`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}


function closeQrPreview() {
    qrPreviewModal?.classList.add('hide');
    if (qrPreviewImage) qrPreviewImage.removeAttribute('src');
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
    if (name === 'menu') void window.MenuConsole?.load();
}


function openOrgModal() {
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
        document.getElementById('agent-devices-help').textContent = `${activeCount}/${data.limit} thiết bị đang hoạt động. Lần đổi gần nhất: ${formatManagedDeviceTime(data.lastChangeAt)}. Thiết bị bị thu hồi sẽ đăng xuất ngay và phải đăng ký lại khi đăng nhập.`;
        list.innerHTML = (data.devices || []).length ? data.devices.map((device) => `
            <article class="agent-device-row${device.status !== 'active' ? ' is-revoked' : ''}">
                <span class="agent-device-icon"><i class="${/iphone|android|ipad|mobile/i.test(device.label || '') ? 'ri-smartphone-line' : 'ri-computer-line'}"></i></span>
                <div class="agent-device-copy">
                    <strong>${escapeHtml(device.label || 'Thiết bị')}</strong>
                    <small>Lần đầu: ${escapeHtml(formatManagedDeviceTime(device.first_seen))} · Lần cuối: ${escapeHtml(formatManagedDeviceTime(device.last_seen))}</small>
                    <small>IP gần nhất: ${escapeHtml(device.last_ip || 'Không ghi nhận')} · ID: ${escapeHtml(String(device.device_id || '').slice(-12))}</small>
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
    }
    const submitBtn = document.getElementById('org-sale-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="ri-user-add-line"></i> Thêm Sale';
    document.getElementById('org-sale-cancel-btn')?.classList.add('hide');
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

        ORG_SALES = await orgFetch('/api/agent/sales');
        const count = ORG_SALES.length;
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
        renderSalePicker(ORG_SALES);

        box.innerHTML = ORG_SALES.length ? ORG_SALES.map((sale) => `
            <article class="org-item sale-card">
                <div class="org-item-main">
                    <strong class="sale-card-name">${escapeHtml(sale.full_name || sale.username)}
                        <span class="org-shift ${sale.on_shift ? 'is-on' : ''}">${sale.on_shift ? 'Trong ca' : 'Ngoài ca'}</span>
                    </strong>
                    <span class="sale-card-mail">${escapeHtml(sale.username)}</span>
                    <span class="sale-card-facts">
                        <span class="sale-fact"><i class="ri-time-line"></i> ${escapeHtml(formatHourWindows(sale.access_hours))}</span>
                        <span class="sale-fact"><i class="ri-team-line"></i> ${(sale.groups || []).map((g) => escapeHtml(g.name)).join(', ') || 'Chưa gán nhóm'}</span>
                    </span>
                </div>
                <div class="org-item-actions" style="display:flex;gap:5px;align-items:center;">
                    <button type="button" class="org-btn-edit" data-sale-edit="${sale.id}" title="Sửa" style="background:rgba(99,102,241,0.1);color:#6366f1;border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:4px 8px;font-size:11.5px;cursor:pointer;font-weight:600;"><i class="ri-edit-line"></i> Sửa</button>
                    <button type="button" class="org-toggle" data-sale-toggle="${sale.id}" data-active="${sale.is_active}">
                        ${sale.is_active ? '✓ Hoạt động' : '✗ Khóa'}
                    </button>
                    <button type="button" class="org-remove" data-sale-delete="${sale.id}" title="Xóa"><i class="ri-delete-bin-line"></i></button>
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
        if (ORG_SALES.length === 0) {
            try { ORG_SALES = await orgFetch('/api/agent/sales'); } catch(e) {}
        }
        ORG_GROUPS = await orgFetch('/api/agent/groups');
        if (badge) badge.textContent = `${ORG_GROUPS.length} Nhóm`;

        // Cập nhật select Sale trong Form Tạo Nhóm
        renderSalePicker(ORG_SALES);

        if (box && !quiet) {
            box.innerHTML = ORG_GROUPS.length ? ORG_GROUPS.map((group) => {
                const groupSales = group.sales || [];
                const groupSaleIds = new Set(groupSales.map(s => Number(s.sale_id)));
                const notInGroupSales = ORG_SALES.filter(s => !groupSaleIds.has(Number(s.id)));

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
                        <button type="button" class="org-remove" data-group-delete="${group.id}" title="Xóa nhóm"><i class="ri-delete-bin-line"></i></button>
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

        const groupOptions = ORG_GROUPS.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join('');
        const saleGroup = document.getElementById('org-sale-group');
        if (saleGroup) saleGroup.innerHTML = '<option value="">— Chưa gán nhóm —</option>' + groupOptions;
        const qrGroup = document.getElementById('org-qr-group');
        if (qrGroup) qrGroup.innerHTML = groupOptions || '<option value="">Chưa có nhóm</option>';
        const qrGroupFilter = document.getElementById('org-qr-group-filter');
        if (qrGroupFilter) {
            const currentFilterVal = qrGroupFilter.value;
            qrGroupFilter.innerHTML = '<option value="">— Tất cả nhóm —</option>' + groupOptions;
            if (currentFilterVal) qrGroupFilter.value = currentFilterVal;
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
        if (ORG_SALES.length === 0) await loadOrgSales();
        CURRENT_QR_ACCOUNTS = await orgFetch('/api/agent/qr-accounts');
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
    const filtered = selectedGroupId
        ? CURRENT_QR_ACCOUNTS.filter(a => Number(a.group_id) === Number(selectedGroupId))
        : CURRENT_QR_ACCOUNTS;

    if (badge) badge.textContent = `${filtered.length} QR`;
    // Bỏ liên kết "Mở Chat": đó là link dành cho KHÁCH, Agent bấm vào sẽ tự mở một
    // phiên chat khách và làm bẩn dữ liệu. Muốn kiểm tra thì quét mã trong poster.
    box.innerHTML = filtered.length ? filtered.map((account) => `
        <article class="qr-card">
            <span class="qr-card-icon"><i class="ri-qr-code-line"></i></span>
            <div class="qr-card-main">
                <strong class="qr-card-title">${escapeHtml(account.label)}</strong>
                <span class="qr-card-group"><i class="ri-team-line"></i> ${escapeHtml(account.group_name || 'Chưa gán nhóm')}</span>
            </div>
            <div class="qr-card-actions">
                <button type="button" class="qr-card-poster" data-qr-poster="${account.id}">
                    <i class="ri-image-line"></i> Xem poster
                </button>
                <button type="button" class="org-remove" data-qr-revoke="${account.id}" title="Thu hồi mã QR" aria-label="Thu hồi mã QR">
                    <i class="ri-forbid-line"></i>
                </button>
            </div>
        </article>`).join('') : tableEmptyBlock(selectedGroupId);
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
