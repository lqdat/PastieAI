// Cấu hình dự án và quản trị người dùng — vai trò 'superadmin' và 'project_admin'.
//
// Dự án, kênh kết nối, tri thức AI, từ khoá chuyển tiếp, tài khoản nhân viên,
// báo cáo. Agent và Sale không chạm tới file này.
//
// Phụ thuộc core.js. Xem chú thích thứ tự nạp ở đầu core.js.

async function loadProjects() {
    try {
        const r = await authFetch(`${API_BASE}/api/admin/projects`);
        if (!r.ok) return;
        PROJECTS = await r.json();
    } catch (e) { console.error('loadProjects error:', e); PROJECTS = []; }
    updateProjectFilterDropdown([]);
    fillAdminProjectSelect();
    renderProjectList();
    updateAgentHeaderUI();
}


function fillAdminProjectSelect() {
    const sel = document.getElementById('admin-form-project');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">— Tất cả dự án (toàn quyền) —</option>';
    (PROJECTS || []).forEach(p => {
        const o = document.createElement('option');
        o.value = p.id; o.textContent = `${p.name} (${p.id})`;
        sel.appendChild(o);
    });
    sel.value = cur;
}


function renderProjectList() {
    const box = document.getElementById('project-list');
    if (!box) return;
    if (!PROJECTS.length) { box.innerHTML = '<span style="font-size:12px;color:var(--text-secondary);">Chưa có dự án nào.</span>'; return; }
    box.innerHTML = PROJECTS.map(p => {
        const projectName = escapeHtml(p.name || p.id);
        const displayName = escapeHtml(p.display_name || p.name || p.id);
        const websiteUrl = escapeHtml(p.website_url || '');
        const projectId = escapeHtml(p.id);
        const aiChecked = p.ai_enabled !== false ? 'checked' : '';
        return `<article class="project-settings-card" data-project-id="${projectId}">
            <div class="project-settings-card-head"><div><span class="project-id-label">PROJECT ID · ${projectId}</span><h4>${projectName}</h4></div><button type="button" class="project-delete-btn" onclick="window.deleteProject('${p.id}')" title="Xóa project"><i class="ri-delete-bin-line"></i></button></div>
            <label>Tên dự án<input data-field="name" value="${projectName}" maxlength="255"></label>
            <label>Tên hiển thị trên header<input data-field="display_name" value="${displayName}" maxlength="255"></label>
            <label>Link website<input data-field="website_url" type="url" value="${websiteUrl}" placeholder="https://website.com"></label>
            <label class="project-ai-toggle"><input data-field="ai_enabled" type="checkbox" ${aiChecked}><span><i class="ri-sparkling-2-line"></i> Bật AI chatbot tự động</span><small>Khi tắt, hệ thống vẫn dịch tin nhắn nhưng không tự trả lời; áp dụng cho QR Concierge.</small></label>
            <div class="project-settings-card-foot"><a ${websiteUrl ? `href="${websiteUrl}" target="_blank" rel="noopener"` : ''} class="project-open-link ${websiteUrl ? '' : 'is-disabled'}"><i class="ri-external-link-line"></i> Mở website</a><button type="button" class="secondary-btn" onclick="window.saveProjectSettings('${p.id}')"><i class="ri-save-line"></i> Lưu thay đổi</button></div>
        </article>`;
    }).join('');
}


async function addProject() {
    const inp = document.getElementById('project-new-name');
    const linkInput = document.getElementById('project-new-link');
    const name = inp ? inp.value.trim() : '';
    if (!name) return;
    try {
        const r = await authFetch(`${API_BASE}/api/admin/projects`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, websiteUrl: linkInput?.value.trim() || '' })
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { if (inp) inp.value = ''; if (linkInput) linkInput.value = ''; await loadProjects(); }
        else toastError(d.error || 'Không tạo được dự án.');
    } catch (e) { toastError('Lỗi kết nối.'); }
}


async function deleteProject(id) {
    if (!await pastieConfirm(`Xoá dự án "${id}" khỏi danh sách? Chat và cơ sở tri thức đã có vẫn được giữ lại.`, { title: 'Xoá dự án', confirmText: 'Xoá dự án', danger: true })) return;
    try {
        const r = await authFetch(`${API_BASE}/api/admin/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (r.ok) { await loadProjects(); toastSuccess('Đã xoá dự án.'); } else toastError('Lỗi xoá dự án.');
    } catch (e) { toastError('Lỗi kết nối.'); }
}


function handleExport(format) {
    const token = getToken();
    const projectId = projectFilter.value;
    const url = `${API_BASE}/api/admin/export?format=${format}&projectId=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
}


function getActiveKbProjectId() {
    if (CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin' && CURRENT_ADMIN.project_id) {
        return CURRENT_ADMIN.project_id;
    }
    return (kbProjectSelect && kbProjectSelect.value) ? kbProjectSelect.value : (currentProjectFilter || 'pastie-landingpage');
}


async function openKnowledgeModal() {
    if (!knowledgeModal) return;
    knowledgeModal.classList.remove('hide');

    const isProjectAdmin = CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin';

    // Populate project dropdown inside modal
    if (kbProjectSelect) {
        kbProjectSelect.innerHTML = '';
        if (isProjectAdmin) {
            const pid = CURRENT_ADMIN.project_id;
            const pObj = (PROJECTS || []).find(p => p.id === pid);
            const pName = pObj?.name || pid;
            const opt = document.createElement('option');
            opt.value = pid;
            opt.textContent = `${pName} (${pid})`;
            kbProjectSelect.appendChild(opt);
            kbProjectSelect.value = pid;
            kbProjectSelect.disabled = true;
            if (kbProjectHint) {
                kbProjectHint.innerHTML = `<i class="ri-shield-check-line" style="color:var(--success-color);"></i> Tài khoản quản trị dự án: <strong>${pName}</strong>`;
            }
        } else {
            // Superadmin: view and manage all projects
            const map = new Map();
            (PROJECTS || []).forEach(p => map.set(p.id, p.name || p.id));
            if (!map.has('pastie-landingpage')) map.set('pastie-landingpage', 'Pastie Landingpage');

            (sessionsList || []).forEach(s => {
                if (s.project_id && !map.has(s.project_id)) map.set(s.project_id, s.project_id);
            });

            map.forEach((name, id) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = `${name} (${id})`;
                kbProjectSelect.appendChild(opt);
            });

            if (currentProjectFilter && map.has(currentProjectFilter)) {
                kbProjectSelect.value = currentProjectFilter;
            } else {
                const firstId = map.keys().next().value;
                kbProjectSelect.value = firstId || 'pastie-landingpage';
            }
            kbProjectSelect.disabled = false;
            if (kbProjectHint) {
                kbProjectHint.innerHTML = `<i class="ri-user-star-line" style="color:var(--accent-color);"></i> Quyền Superadmin: Bạn có thể chọn và quản lý tri thức cho từng dự án.`;
            }
        }
    }

    const activeProjectId = getActiveKbProjectId();
    await loadKnowledgeForProject(activeProjectId);
}


async function loadKnowledgeForProject(projectId) {
    if (!projectId) return;
    kbSyncStatus.innerHTML = `<i class="ri-loader-4-line ri-spin" style="color: var(--accent-color);"></i> <span>Đang tải dữ liệu tri thức [${projectId}]...</span>`;
    kbTextArea.value = '';

    try {
        const kbResp = await authFetch(`${API_BASE}/api/admin/knowledge?projectId=${encodeURIComponent(projectId)}`);
        const data = await kbResp.json();
        const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US';

        if (data.source_url) {
            kbUrlInput.value = (data.source_url === 'manual' || data.source_url.startsWith('db://')) ? 'https://dealphuquoc.com' : data.source_url;
            kbTextArea.value = data.cleaned_content || '';
            const dateStr = new Date(data.updated_at).toLocaleString(locale);
            
            if (data.source_url.startsWith('db://')) {
                kbSyncStatus.innerHTML = `<i class="ri-checkbox-circle-line" style="color: var(--success-color);"></i> <span>[${projectId}] Nguồn: <strong>Cơ sở dữ liệu DealPhuQuoc</strong> (Cập nhật: ${dateStr})</span>`;
                if (kbDealDbStatus) {
                    kbDealDbStatus.innerHTML = `<i class="ri-checkbox-circle-fill" style="color: var(--success-color);"></i> <span>Đã đồng bộ từ Database lúc ${dateStr}</span>`;
                }
            } else {
                kbSyncStatus.innerHTML = `<i class="ri-checkbox-circle-line" style="color: var(--success-color);"></i> <span>[${projectId}] Đồng bộ từ <strong>${data.source_url}</strong> lúc ${dateStr}</span>`;
            }
        } else {
            kbUrlInput.value = 'https://dealphuquoc.com';
            kbSyncStatus.innerHTML = `<i class="ri-information-line" style="color: var(--accent-color);"></i> <span>[${projectId}] Chưa có cơ sở dữ liệu tri thức nào được cấu hình.</span>`;
            kbTextArea.value = '';
            if (kbDealDbStatus) {
                kbDealDbStatus.innerHTML = `<i class="ri-information-line" style="color: #a5b4fc;"></i> <span>Chưa đồng bộ dữ liệu DB.</span>`;
            }
        }
    } catch (e) {
        console.error('Error fetching knowledge settings:', e);
        kbSyncStatus.innerHTML = `<i class="ri-error-warning-line" style="color: var(--danger-color);"></i> <span>Lỗi tải dữ liệu: ${e.message}</span>`;
    }
}


function closeKnowledgeModal() {
    knowledgeModal.classList.add('hide');
}


async function syncKnowledgeFromDealDb() {
    const activeProjectId = getActiveKbProjectId();
    if (!kbSyncDealDbBtn) return;

    kbSyncDealDbBtn.disabled = true;
    kbSyncDealDbBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang trích xuất DB...`;
    if (kbDealDbStatus) {
        kbDealDbStatus.innerHTML = `<i class="ri-loader-4-line ri-spin" style="color: #818cf8;"></i> <span>Đang trích xuất Khách sạn, Tour & Voucher từ Database DealPhuQuoc...</span>`;
    }

    try {
        const response = await authFetch(`${API_BASE}/api/admin/knowledge/sync-deal-db`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: activeProjectId })
        });
        const data = await response.json();
        if (response.ok) {
            toastSuccess(data.message || 'Đồng bộ Database DealPhuQuoc thành công.');
            await loadKnowledgeForProject(activeProjectId);
        } else {
            toastError(data.error || 'Không thể đồng bộ database.');
            if (kbDealDbStatus) {
                kbDealDbStatus.innerHTML = `<i class="ri-error-warning-line" style="color: var(--danger-color);"></i> <span>Lỗi: ${data.error}</span>`;
            }
        }
    } catch (err) {
        toastError('Lỗi kết nối: ' + err.message);
        if (kbDealDbStatus) {
            kbDealDbStatus.innerHTML = `<i class="ri-error-warning-line" style="color: var(--danger-color);"></i> <span>Lỗi kết nối: ${err.message}</span>`;
        }
    } finally {
        kbSyncDealDbBtn.disabled = false;
        kbSyncDealDbBtn.innerHTML = `<i class="ri-refresh-line"></i> Đồng bộ từ DB DealPhuQuoc`;
    }
}


async function syncKnowledgeFromUrl() {
    const url = kbUrlInput.value.trim();
    if (!url) {
        toastError('Vui lòng nhập URL.');
        return;
    }

    const activeProjectId = getActiveKbProjectId();

    kbSyncBtn.disabled = true;
    kbSyncBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang đồng bộ...`;
    kbSyncStatus.innerHTML = `<i class="ri-loader-4-line ri-spin" style="color: var(--accent-color);"></i> <span>[${activeProjectId}] Đang kết nối & cào dữ liệu từ ${url}...</span>`;

    try {
        const response = await authFetch(`${API_BASE}/api/admin/knowledge/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, projectId: activeProjectId })
        });
        
        const data = await response.json();
        if (response.ok) {
            toastSuccess(data.message || 'Đồng bộ tri thức từ Landing Page thành công.');
            await loadKnowledgeForProject(activeProjectId);
        } else {
            toastError(data.error || 'Không thể đồng bộ.');
            kbSyncStatus.innerHTML = `<i class="ri-error-warning-line" style="color: var(--danger-color);"></i> <span>Đồng bộ thất bại: ${data.error || 'Lỗi HTTP'}</span>`;
        }
    } catch (err) {
        toastError('Lỗi kết nối mạng: ' + err.message);
        kbSyncStatus.innerHTML = `<i class="ri-error-warning-line" style="color: var(--danger-color);"></i> <span>Lỗi kết nối: ${err.message}</span>`;
    } finally {
        kbSyncBtn.disabled = false;
        kbSyncBtn.innerHTML = `<i class="ri-refresh-line"></i> Đồng bộ`;
    }
}


async function saveKnowledgeManual() {
    const text = kbTextArea.value.trim();
    if (!text) {
        toastError('Vui lòng điền nội dung tri thức.');
        return;
    }

    const activeProjectId = getActiveKbProjectId();

    kbSaveManualBtn.disabled = true;
    kbSaveManualBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang lưu...`;

    try {
        const response = await authFetch(`${API_BASE}/api/admin/knowledge/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cleanedContent: text, projectId: activeProjectId })
        });
        
        const data = await response.json();
        if (response.ok) {
            toastSuccess(data.message || 'Đã lưu tri thức.');
            await loadKnowledgeForProject(activeProjectId);
        } else {
            toastError(data.error || 'Không thể lưu.');
        }
    } catch (err) {
        toastError('Lỗi kết nối mạng: ' + err.message);
    } finally {
        kbSaveManualBtn.disabled = false;
        kbSaveManualBtn.innerHTML = `<i class="ri-save-line"></i> Lưu nội dung`;
    }
}


function renderKeywordTags(keywords) {
    currentKeywords = keywords;
    const container = document.getElementById('keyword-tags-container');
    if (!container) return;
    if (!keywords.length) {
        container.innerHTML = `<span class="keyword-tag-empty" style="color:var(--text-secondary);font-size:12px;font-style:italic;">Chưa có từ khóa nào...</span>`;
        return;
    }
    container.innerHTML = keywords.map((kw, i) => `
        <span class="keyword-tag">
            ${kw}
            <button onclick="removeKeyword(${i})" title="Xóa"><i class="ri-close-line"></i></button>
        </span>
    `).join('');
}


function addKeyword() {
    const val = keywordInput ? keywordInput.value.trim() : '';
    if (!val) return;
    if (currentKeywords.includes(val)) {
        if (keywordStatus) keywordStatus.innerHTML = `<i class="ri-error-warning-line" style="color:#fbbf24;"></i> Từ khóa đã tồn tại`;
        return;
    }
    currentKeywords.push(val);
    renderKeywordTags(currentKeywords);
    if (keywordInput) keywordInput.value = '';
    if (keywordStatus) keywordStatus.innerHTML = '';
}


async function openChannelModal() {
    closeSettingsDropdown();
    if (channelModal) channelModal.classList.remove('hide');
    const pid = currentProjectFilter || (CURRENT_ADMIN && CURRENT_ADMIN.project_id) || 'pastie-landingpage';
    try {
        const res = await authFetch(`${API_BASE}/api/admin/channels?projectId=${encodeURIComponent(pid)}`);
        const data = await res.json();
        if (data.success && data.config) {
            if (channelPhoneIdInput) channelPhoneIdInput.value = data.config.whatsapp_phone_number_id || '';
            if (channelWabaIdInput) channelWabaIdInput.value = data.config.whatsapp_waba_id || '';
            if (channelPhoneInput) channelPhoneInput.value = data.config.whatsapp_business_phone || '';
            if (channelTokenInput) channelTokenInput.value = data.config.whatsapp_access_token || '';
            if (channelWebhookUrlEl) channelWebhookUrlEl.textContent = data.config.webhook_url || '';
            if (channelVerifyTokenEl) channelVerifyTokenEl.textContent = data.config.meta_verify_token || 'pastie_verify_token_2026';
            
            const directLink = data.config.direct_link || (data.config.whatsapp_business_phone ? `https://wa.me/${data.config.whatsapp_business_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Xin chào! Tôi cần tư vấn thông tin dịch vụ.')}` : '');
            if (channelDirectLinkInput) channelDirectLinkInput.value = directLink;
            if (channelDirectLinkOpen) channelDirectLinkOpen.href = directLink || '#';
        }
    } catch (e) {
        console.error('Error loading channel config:', e);
    }
}


function getAdminMgmtProjectId() {
    return CURRENT_ADMIN?.role === 'superadmin'
        ? (adminMgmtProjectSelect?.value || '')
        : (CURRENT_ADMIN?.project_id || '');
}


function updateAdminFormRoleVisibility() {
    const projectId = adminFormProject ? adminFormProject.value : '';
    const proj = (PROJECTS || []).find(p => p.id === projectId);
    const isQrProject = proj?.project_type === 'qr_concierge' || projectId === 'qr-concierge';

    if (isQrProject) {
        if (adminFormRole) {
            adminFormRole.innerHTML = '<option value="agent">Agent (Tư vấn viên trực chat / Quản lý Sale)</option>';
            adminFormRole.value = 'agent';
        }
    } else if (CURRENT_ADMIN?.role === 'superadmin') {
        const prevRole = adminFormRole ? adminFormRole.value : 'agent';
        if (adminFormRole) {
            adminFormRole.innerHTML = `
                <option value="agent">Agent (Tư vấn viên trực chat / Quản lý Sale)</option>
                <option value="project_admin">Project Admin (Quản trị dự án)</option>
                <option value="superadmin">Quản trị viên tối cao (Super-Admin)</option>
            `;
            if (['agent', 'project_admin', 'superadmin'].includes(prevRole)) {
                adminFormRole.value = prevRole;
            }
        }
    }

    const currentRole = adminFormRole ? adminFormRole.value : 'agent';
    const isAgent = currentRole === 'agent';
    if (adminFormSaleLimitGroup) {
        adminFormSaleLimitGroup.style.display = isAgent ? 'block' : 'none';
    }
    const adminFormDeferredGroup = document.getElementById('admin-form-deferred-group');
    if (adminFormDeferredGroup) {
        adminFormDeferredGroup.style.display = isAgent ? 'block' : 'none';
    }
}


// Danh sách loại hình LẤY TỪ MÁY CHỦ, không chép tay.
//
// Chép tay thì người dùng chọn được một loại hình mà splitVenueName của máy chủ
// không nhận ra, và phần tên riêng sẽ bị máy dịch dịch mất.
// Viết hoa CHỮ CÁI ĐẦU của cả cụm, không phải đầu mỗi từ.
// "hộ kinh doanh" → "Hộ kinh doanh", đúng cách viết tiếng Việt.
//
// Không dùng /\b\p{L}/gu: `\b` trong JavaScript vẫn dựa trên
// \w = [A-Za-z0-9_] kể cả khi bật cờ u, nên mọi chữ cái có dấu đều bị coi là
// ranh giới từ — nó từng biến "nhà hàng" thành "NhÀ HÀNg".
//
// Viết tắt thì giữ nguyên chữ hoa: "công ty tnhh" → "Công ty TNHH".
const VENUE_ACRONYMS = new Set(['tnhh', 'mtv', 'cp', 'dv', 'tm']);
function titleCaseVi(text) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    return words.map((word, index) => {
        if (VENUE_ACRONYMS.has(word.toLowerCase())) return word.toUpperCase();
        return index === 0 ? word.charAt(0).toLocaleUpperCase('vi') + word.slice(1) : word;
    }).join(' ');
}

let VENUE_PREFIXES = [];

async function loadVenuePrefixes() {
    const list = document.getElementById('admin-venue-type-list');
    if (!list || VENUE_PREFIXES.length) return;
    try {
        const res = await authFetch(`${API_BASE}/api/admin/venue-prefixes`);
        const data = await res.json();
        VENUE_PREFIXES = Array.isArray(data.prefixes) ? data.prefixes : [];
    } catch { VENUE_PREFIXES = []; }
    // Gợi ý, không ép: người dùng gõ được loại hình ngoài danh sách.
    list.innerHTML = VENUE_PREFIXES.map((prefix) => `<option value="${escapeHtml(titleCaseVi(prefix))}"></option>`).join('');
}

// Tách một tên đầy đủ thành loại hình + tên riêng, dùng ĐÚNG danh sách của máy
// chủ. Loại hình dài khớp trước: "công ty tnhh" phải thắng "công ty".
function splitVenueName(fullName) {
    const raw = String(fullName || '').trim();
    const lower = raw.toLowerCase();
    for (const prefix of [...VENUE_PREFIXES].sort((a, b) => b.length - a.length)) {
        if (lower.startsWith(prefix + ' ')) {
            return { prefix: raw.slice(0, prefix.length), name: raw.slice(prefix.length).trim() };
        }
    }
    return { prefix: '', name: raw };
}

function removeVietnameseTones(text) {
    return String(text || '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .normalize('NFC');
}

function updateVenueNamePreview() {
    const type = document.getElementById('admin-form-venue-type')?.value || '';
    const name = (adminFormFullname?.value || '').trim();
    const preview = document.getElementById('admin-form-name-preview');
    if (!preview) return;
    preview.textContent = type && name
        ? `Tên đầy đủ: ${titleCaseVi(type)} ${name} — khách nước ngoài thấy loại hình đã dịch (Anh/Nga/Trung/Hàn), tên riêng "${removeVietnameseTones(name)}" bỏ dấu.`
        : '';
}
document.getElementById('admin-form-venue-type')?.addEventListener('input', updateVenueNamePreview);
document.getElementById('admin-form-fullname')?.addEventListener('input', updateVenueNamePreview);

// Ảnh đại diện: xem trước + tải lên. Thay hẳn bộ năm ô màu gradient.
//
// avatar_url của tài khoản cũ đang giữ một mã kiểu 'gradient-1'. Không xoá dữ
// liệu đó: chưa có ảnh thật thì vẫn vẽ gradient như trước, có ảnh thì vẽ ảnh.
// Phân biệt bằng việc chuỗi có bắt đầu bằng http hay không.
const AVATAR_GRADIENTS = {
    'gradient-1': 'linear-gradient(135deg,#a78bfa,#7c3aed)',
    'gradient-2': 'linear-gradient(135deg,#f472b6,#db2777)',
    'gradient-3': 'linear-gradient(135deg,#34d399,#059669)',
    'gradient-4': 'linear-gradient(135deg,#fbbf24,#d97706)',
    'gradient-5': 'linear-gradient(135deg,#60a5fa,#2563eb)',
};
// Nhận cả ảnh đã lưu trên máy chủ (http) LẪN ảnh vừa chọn từ máy (data:).
// Thiếu 'data:' là chọn ảnh xong ô xem trước vẫn hiện dấu "?" — người dùng
// tưởng chưa chọn được gì.
const isImageUrl = (value) => /^(https?:\/\/|data:image\/|\/)/i.test(String(value || ''));

// previewOnly: ảnh chỉ để NHÌN, chưa phải giá trị sẽ lưu. Ảnh vừa chọn từ máy
// là một chuỗi data: dài hàng trăm KB — nhét vào ô ẩn rồi gửi lên là hỏng cả
// bản ghi; đường dẫn thật chỉ có sau khi tải ảnh lên xong.
function renderAdminAvatarPreview(value, fallbackName, previewOnly = false) {
    const box = document.getElementById('admin-avatar-preview');
    if (!box) return;
    if (isImageUrl(value)) {
        box.style.background = 'none';
        box.innerHTML = `<img src="${escapeHtml(value)}" alt="">`;
    } else {
        box.style.background = AVATAR_GRADIENTS[value] || AVATAR_GRADIENTS['gradient-1'];
        box.innerHTML = `<span>${escapeHtml(String(fallbackName || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
    }
    if (adminFormAvatar && !previewOnly) adminFormAvatar.value = value || '';
}

// Tài khoản CHƯA LƯU thì chưa có id để gắn ảnh vào. Giữ tệp lại, tải lên ngay
// sau khi lưu xong — nếu không, người dùng chọn ảnh rồi bấm Lưu và ảnh im lặng
// biến mất.
let pendingAvatarFile = null;

async function uploadAdminAvatar(adminId, file) {
    const form = new FormData();
    form.append('file', file);
    const res = await authFetch(`${API_BASE}/api/superadmin/accounts/${adminId}/avatar`, {
        method: 'POST', body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Không tải được ảnh lên.');
    return data.avatarUrl;
}

document.getElementById('admin-avatar-pick')?.addEventListener('click', () => {
    document.getElementById('admin-avatar-file')?.click();
});
document.getElementById('admin-avatar-file')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Chỉ nhận tệp ảnh.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('Ảnh vượt quá 10MB.', 'error'); return; }
    pendingAvatarFile = file;
    // Xem trước ngay bằng chính tệp vừa chọn, không đợi tải lên xong: người dùng
    // cần biết mình chọn đúng ảnh trước khi bấm Lưu.
    const reader = new FileReader();
    reader.onload = () => renderAdminAvatarPreview(String(reader.result || ''), '', true);
    reader.readAsDataURL(file);
    event.target.value = '';
});


function applyAdminMgmtFocus() {
    const grid = document.querySelector('.admin-management-grid');
    const titleEl = document.querySelector('#admin-management-modal .brand-header h2');
    const subtitleEl = document.getElementById('admin-mgmt-subtitle');
    const selfPanel = document.getElementById('self-profile-panel');

    const showSelfProfile = adminMgmtFocus === 'account';
    selfPanel?.classList.toggle('hide', !showSelfProfile);
    if (showSelfProfile) {
        const input = document.getElementById('self-display-name-input');
        const meta = document.getElementById('self-account-meta');
        if (input) input.value = CURRENT_ADMIN?.full_name || CURRENT_ADMIN?.username || '';
        if (meta) {
            // Tên vai trò khác nhau giữa QR và các dự án còn lại: trong QR, 'agent'
            // là cấp QUẢN LÝ Sale nên gọi "Admin Agent"; ở dự án khác 'agent' vẫn là
            // người trực tiếp tư vấn nên giữ "Agent tư vấn".
            const isQr = isQrConciergeProject(CURRENT_ADMIN?.project_id);
            const roleNames = {
                agent: isQr ? 'Admin Agent' : 'Agent tư vấn',
                sale: 'Nhân viên Sale',
                project_admin: 'Quản trị dự án',
                superadmin: 'Superadmin',
            };
            const email = CURRENT_ADMIN?.username || '—';
            const role = roleNames[CURRENT_ADMIN?.role] || 'Tài khoản';
            // Không hiện mã dự án: người dùng trong QR chỉ thuộc đúng một dự án nên
            // dòng này không cho thêm thông tin gì, mà lại lộ mã kỹ thuật ra giao diện.
            meta.innerHTML = `
                <div class="self-account-meta-item"><i class="ri-mail-line"></i><span>Email đăng nhập</span><strong>${escapeHtml(email)}</strong></div>
                <div class="self-account-meta-item"><i class="ri-shield-user-line"></i><span>Vai trò</span><strong>${escapeHtml(role)}</strong></div>
                <div class="self-account-meta-item self-push-status" id="self-push-status"></div>`;
            // Vẽ lại theo trạng thái quyền hiện tại (dòng này được tạo mới mỗi lần
            // mở màn hình nên phải gọi lại, không thể dựa vào lần set trước đó).
            renderPushStatusRow(lastPushState);
            void loadMyDevices();
        }
        setSelfProfileStatus('');

        const isAgent = CURRENT_ADMIN?.role === 'agent';
        const isSale = CURRENT_ADMIN?.role === 'sale';
        const canEditName = !isAgent && !isSale;
        const saveBtn = document.getElementById('self-display-name-save');
        const hintEl = document.getElementById('self-display-name-hint');
        if (input) input.readOnly = !canEditName;
        if (saveBtn) saveBtn.classList.toggle('hide', !canEditName);
        selfPanel?.classList.toggle('is-readonly', !canEditName);
        if (hintEl) {
            hintEl.textContent = isAgent
                ? 'Tên Agent do Quản trị viên Superadmin quản lý.'
                : isSale
                ? 'Tên hiển thị của Sale do Quản lý (Agent) thiết lập.'
                : '';
        }

        // Render self avatar preview
        const avatarPreview = document.getElementById('self-avatar-preview');
        if (avatarPreview) {
            const avatarUrl = CURRENT_ADMIN?.avatar_url;
            const name = CURRENT_ADMIN?.full_name || CURRENT_ADMIN?.username || 'U';
            const initial = name.trim().charAt(0).toUpperCase();
            if (avatarUrl) {
                avatarPreview.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                avatarPreview.innerHTML = `<span style="color:var(--text-primary);font-weight:700;">${escapeHtml(initial)}</span>`;
            }
        }
    }

    if (adminMgmtFocus === 'account') {
        grid?.classList.toggle('hide', isRestrictedConsole());
        if (titleEl) titleEl.textContent = 'Quản lý tài khoản';
        const listHeading = document.getElementById('admin-list-heading');
        if (listHeading) listHeading.textContent = 'Tài khoản của bạn';
    } else {
        grid?.classList.remove('hide');
        if (titleEl) titleEl.textContent = 'Quản lý nhân viên';
        const listHeading = document.getElementById('admin-list-heading');
        if (listHeading) listHeading.textContent = 'Danh sách nhân viên';
    }
}


// Chuyen giua hai tab Du an / Nhan su.
function setStaffTab(name) {
    document.querySelectorAll('[data-staff-tab]').forEach((tab) => {
        tab.classList.toggle('is-active', tab.dataset.staffTab === name);
    });
    document.querySelectorAll('[data-staff-pane]').forEach((pane) => {
        pane.classList.toggle('hide', pane.dataset.staffPane !== name);
    });
}
window.setStaffTab = setStaffTab;

document.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-staff-tab]');
    if (tab) setStaffTab(tab.dataset.staffTab);
});

function openAdminMgmt() {
    if (adminMgmtModal) adminMgmtModal.classList.remove('hide');

    const isSuper = CURRENT_ADMIN && CURRENT_ADMIN.role === 'superadmin';
    const isProjectAdmin = CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin';
    const isAgent = isRestrictedConsole();

    const projectMgmtBox = document.querySelector('.admin-project-management');
    const projectFormGroup = document.getElementById('admin-form-project-group');
    const roleSelect = document.getElementById('admin-form-role');

    if (accountProjectContext) accountProjectContext.classList.toggle('hide', !isSuper);
    if (isSuper && adminMgmtProjectSelect) {
        adminMgmtProjectSelect.innerHTML = (PROJECTS || []).map(p =>
            `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name || p.id)} · ${escapeHtml(p.id)}</option>`
        ).join('');
        const currentTopProject = document.getElementById('project-filter')?.value;
        if (currentTopProject && [...adminMgmtProjectSelect.options].some(o => o.value === currentTopProject)) {
            adminMgmtProjectSelect.value = currentTopProject;
        }
    }

    if (isProjectAdmin || isAgent) {
        if (projectMgmtBox) projectMgmtBox.classList.add('hide');
        if (projectFormGroup) projectFormGroup.classList.add('hide');
        if (roleSelect) {
            roleSelect.innerHTML = '<option value="agent">Agent (Tư vấn viên trực chat / Quản lý Sale)</option>';
            roleSelect.value = 'agent';
            roleSelect.disabled = true;
        }
    } else {
        if (projectMgmtBox) projectMgmtBox.classList.remove('hide');
        if (projectFormGroup) projectFormGroup.classList.remove('hide');

        if (adminFormProject) {
            adminFormProject.innerHTML = '<option value="">— Tất cả dự án (toàn quyền) —</option>';
            (PROJECTS || []).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.name || p.id} (${p.id})`;
                adminFormProject.appendChild(opt);
            });
        }
    }

    // Tab Du an chi co nghia voi Superadmin. Voi cac vai tro khac chi con mot
    // tab, ma mot dai tab chi co mot nut thi chi to chiem cho.
    const tabs = document.getElementById('admin-mgmt-tabs');
    const projectTab = document.querySelector('[data-staff-tab="projects"]');
    projectTab?.classList.toggle('hide', !isSuper);
    tabs?.classList.toggle('hide', !isSuper);
    setStaffTab(isSuper ? 'projects' : 'people');

    // Nut "Them nhan vien" thay cho viec hien san ca cai form. Agent khong duoc
    // tao tai khoan nen giau luon nut, thay vi giau form roi de nut tro toi mot
    // cai hop khong bao gio mo.
    document.getElementById('admin-add-toggle')?.classList.toggle('hide', isAgent);
    window.toggleAddBox?.('staff', false);

    applyAdminMgmtFocus();
    loadAdminUsers();
    resetAdminForm();
}


function closeAdminMgmt() {
    if (adminMgmtModal) adminMgmtModal.classList.add('hide');
}


async function loadAdminUsers() {
    if (!adminListContainer) return;
    adminListContainer.innerHTML = '<p style="color:var(--text-secondary);font-size:12.5px;text-align:center;padding:20px 0;"><i class="ri-loader-4-line ri-spin"></i> Đang tải danh sách nhân viên...</p>';
    try {
        const res = await authFetch(`${API_BASE}/api/admin/users`);
        const users = await res.json();
        if (!Array.isArray(users)) {
            adminListContainer.innerHTML = '<p style="color:#f87171;font-size:12px;text-align:center;">Lỗi tải danh sách nhân viên.</p>';
            return;
        }
        adminMgmtUsers = users;
        const projectId = getAdminMgmtProjectId();
        const visibleUsers = CURRENT_ADMIN?.role === 'superadmin' && projectId
            ? users.filter(u => u.project_id === projectId)
            : users;

        const countBadge = document.getElementById('admin-user-count-badge');
        if (countBadge) countBadge.textContent = `${visibleUsers.length} nhân viên`;

        if (visibleUsers.length === 0) {
            adminListContainer.innerHTML = '<p style="color:var(--text-secondary);font-size:12px;text-align:center;padding:24px 0;">Chưa có tài khoản nhân viên nào.</p>';
            return;
        }

        const avatarGradients = {
            'gradient-1': 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            'gradient-2': 'linear-gradient(135deg,#ec4899,#f43f5e)',
            'gradient-3': 'linear-gradient(135deg,#10b981,#14b8a6)',
            'gradient-4': 'linear-gradient(135deg,#f59e0b,#f97316)',
            'gradient-5': 'linear-gradient(135deg,#0ea5e9,#2563eb)'
        };

        // XEP THANH CAY, khong phai danh sach phang.
        //
        // Truoc day moi tai khoan la mot dong ngang hang, Sale chi duoc thut vao
        // 12px bang style noi dong. Nhin vao khong biet Sale nao thuoc Agent nao
        // - ma do la thu quan trong nhat cua man hinh nay: han muc Sale, quyen
        // doc hoi thoai, phan cong deu chay theo duong cha-con ay.
        //
        // managed_by_admin_id la duong day that; manager_name chi la nhan hien
        // ra. Gom theo id, khong gom theo ten - hai Agent trung ten la lap tuc
        // sai, ma ten thi doi duoc bat cu luc nao.
        const byId = new Map(visibleUsers.map((u) => [Number(u.id), u]));
        const childrenOf = new Map();
        const roots = [];
        for (const u of visibleUsers) {
            const parentId = Number(u.managed_by_admin_id);
            if (u.role === 'sale' && parentId && byId.has(parentId)) {
                if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
                childrenOf.get(parentId).push(u);
            } else {
                // Sale mo coi (Agent quan ly khong nam trong pham vi dang xem)
                // van phai hien - giau di thi khong ai sua duoc no nua.
                roots.push(u);
            }
        }
        const ordered = [];
        for (const root of roots) {
            ordered.push({ user: root, depth: 0 });
            for (const child of childrenOf.get(Number(root.id)) || []) {
                ordered.push({ user: child, depth: 1 });
            }
        }

        adminListContainer.innerHTML = ordered.map(({ user: u, depth }) => {
            const isSelf = CURRENT_ADMIN && Number(CURRENT_ADMIN.id) === Number(u.id);
            const isCreatedByMe = CURRENT_ADMIN && u.created_by_admin_id && Number(u.created_by_admin_id) === Number(CURRENT_ADMIN.id);
            const bgGradient = avatarGradients[u.avatar_url] || avatarGradients['gradient-1'];
            const initial = (u.full_name || u.username || 'A').trim().charAt(0).toUpperCase();

            let roleLabel = 'Sale';
            let roleClass = 'sale';
            let extraBadges = '';

            if (u.role === 'agent') {
                roleLabel = 'Admin Agent';
                roleClass = 'agent';
                const limitStr = u.sale_limit ? `${u.used_sales_count || 0}/${u.sale_limit} Sale` : `${u.used_sales_count || 0} Sale (Không giới hạn)`;
                extraBadges = `<span class="admin-user-meta-badge is-license"><i class="ri-team-line"></i> Cấp phép: <strong>${limitStr}</strong></span>`;
            } else if (u.role === 'sale') {
                roleLabel = 'Sale';
                roleClass = 'sale';
                const managerText = u.manager_name || u.manager_username || 'Chưa gán';
                extraBadges = `<span class="admin-user-meta-badge is-manager"><i class="ri-user-star-line"></i> Thuộc Agent: <strong>${escapeHtml(managerText)}</strong></span>`;
            } else if (u.role === 'superadmin') {
                roleLabel = 'Superadmin';
                roleClass = 'superadmin';
            } else if (u.role === 'project_admin') {
                roleLabel = 'Project Admin';
                roleClass = 'project_admin';
            }

            const canDelete = !isSelf && (CURRENT_ADMIN.role === 'superadmin' || isCreatedByMe);
            // Thiet bi la chuyen giay phep: chi Superadmin xem va thu hoi duoc,
            // dung theo dung quyen ma endpoint /api/superadmin/... doi hoi.
            const canManageDevices = CURRENT_ADMIN.role === 'superadmin';

            return `
                <div class="admin-user-card ${isSelf ? 'is-self' : ''} ${depth ? 'is-child' : ''}" data-admin-row="${u.id}">
                    ${depth ? '<span class="admin-user-branch" aria-hidden="true"></span>' : ''}
                    <div class="admin-user-info">
                        <div class="admin-user-avatar"${isImageUrl(u.avatar_url) ? ` style="background:none;padding:0;overflow:hidden;"` : ` style="background: ${bgGradient};"`}>
                            ${isImageUrl(u.avatar_url) ? `<img src="${escapeHtml(u.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : ''}
                            ${initial}
                            <span class="online-dot ${u.is_active ? 'active' : 'inactive'}"></span>
                        </div>
                        <div class="admin-user-details">
                            <h4>
                                ${escapeHtml(u.full_name || u.username)}
                                ${isSelf ? '<span class="admin-user-you">Bạn</span>' : ''}
                            </h4>
                            <p>
                                <span>${escapeHtml(u.username)}</span>
                                ${u.project_id ? `<span class="admin-user-project">${escapeHtml(u.project_id)}</span>` : ''}
                            </p>
                            <div class="admin-user-badges">
                                <span class="admin-user-role-badge ${roleClass}">
                                    ${roleLabel}
                                </span>
                                ${u.is_active ? '<span class="admin-user-state is-active"><i class="ri-checkbox-circle-fill"></i> Hoạt động</span>' : '<span class="admin-user-state is-locked"><i class="ri-close-circle-fill"></i> Đã khóa</span>'}
                                ${isCreatedByMe && !isSelf ? '<span class="admin-user-meta-badge is-created">Do bạn tạo</span>' : ''}
                                ${extraBadges}
                            </div>
                        </div>
                    </div>
                    <div class="admin-user-actions">
                        <button onclick="editAdminUser(${u.id})" class="admin-user-action is-edit" title="Chỉnh sửa" aria-label="Chỉnh sửa ${escapeHtml(u.full_name || u.username)}"><i class="ri-edit-line"></i></button>
                        ${canManageDevices ? `<button onclick="openAccountDevices(${u.id})" class="admin-user-action is-device" title="Thiết bị đã đăng ký" aria-label="Quản lý thiết bị của ${escapeHtml(u.full_name || u.username)}"><i class="ri-computer-line"></i></button>` : ''}
                        ${canDelete ? `<button onclick="deleteAdminUser(${u.id})" class="admin-user-action is-delete" title="Xóa tài khoản" aria-label="Xóa ${escapeHtml(u.full_name || u.username)}"><i class="ri-delete-bin-line"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        await refreshQrAccounts();
    } catch(e) {
        adminListContainer.innerHTML = '<p style="color:#f87171;font-size:12px;text-align:center;">Lỗi kết nối máy chủ.</p>';
    }
}


// Dong "Thuoc Agent" trong form sua. Chi de doc: doi cha con phai lam o console
// cua Agent, noi con biet han muc Sale con lai bao nhieu.
function renderAdminFormManager(user) {
    const roleGroup = document.getElementById('admin-form-role-group');
    if (!roleGroup) return;
    let row = document.getElementById('admin-form-manager-row');
    if (!user || user.role !== 'sale') { row?.remove(); return; }
    if (!row) {
        row = document.createElement('div');
        row.id = 'admin-form-manager-row';
        row.className = 'form-group admin-form-manager';
        roleGroup.insertAdjacentElement('afterend', row);
    }
    const manager = user.manager_name || user.manager_username || 'Chưa gán';
    row.innerHTML = `
        <label>Thuộc Agent</label>
        <p class="admin-form-manager-value"><i class="ri-user-star-line"></i> ${escapeHtml(manager)}</p>
        <small>Đổi Agent quản lý phải làm trong console của Agent, nơi còn thấy hạn mức Sale.</small>`;
}

function resetAdminForm() {
    if (!adminUserForm) return;
    adminUserForm.reset();
    renderAdminFormManager(null);
    if (adminFormRole) adminFormRole.disabled = false;
    if (adminFormId) adminFormId.value = '';
    if (adminFormEmail) {
        adminFormEmail.readOnly = false;
        adminFormEmail.style.opacity = '1';
        adminFormEmail.title = '';
    }
    if (adminFormTitle) adminFormTitle.innerHTML = '<i class="ri-user-add-line" style="color:var(--accent-color);"></i> Thêm nhân viên mới';
    if (adminFormSubmitBtn) adminFormSubmitBtn.innerHTML = '<i class="ri-user-add-line"></i> Lưu nhân viên';
    if (adminFormCancelBtn) adminFormCancelBtn.style.display = 'none';
    if (adminFormStatusGroup) adminFormStatusGroup.style.display = 'none';
    
    if (CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin') {
        if (adminFormRole) { adminFormRole.value = 'agent'; adminFormRole.disabled = true; }
        if (adminFormProject) { adminFormProject.value = CURRENT_ADMIN.project_id || ''; }
    } else {
        if (adminFormRole) { adminFormRole.value = 'agent'; adminFormRole.disabled = false; }
    }

    setDeferredMode('none');
    const adminFormDeferredGroup = document.getElementById('admin-form-deferred-group');
    if (adminFormDeferredGroup) adminFormDeferredGroup.style.display = 'block';

    const venueType = document.getElementById('admin-form-venue-type');
    if (venueType) venueType.value = '';
    updateVenueNamePreview();
    pendingAvatarFile = null;
    renderAdminAvatarPreview('gradient-1');
    void loadVenuePrefixes();
}

// Hai mục trả chậm LOẠI TRỪ NHAU: chọn mục này thì mục kia tự bỏ chọn. Dùng
// checkbox thay radio vì phải bỏ chọn được cả hai (nghĩa là "không có").
function setDeferredMode(mode) {
    const room = document.getElementById('admin-form-pay-room');
    const later = document.getElementById('admin-form-pay-later');
    const hidden = document.getElementById('admin-form-deferred');
    if (room) room.checked = mode === 'room_charge';
    if (later) later.checked = mode === 'pay_later';
    if (hidden) hidden.value = mode || 'none';
}
document.getElementById('admin-form-pay-room')?.addEventListener('change', (event) => {
    setDeferredMode(event.target.checked ? 'room_charge' : 'none');
});
document.getElementById('admin-form-pay-later')?.addEventListener('change', (event) => {
    setDeferredMode(event.target.checked ? 'pay_later' : 'none');
});


async function editAdminUser(id) {
    // Form gap lai theo mac dinh, nen bam Sua ma khong mo ra thi khong thay gi.
    window.toggleAddBox?.('staff', true);
    try {
        const res = await authFetch(`${API_BASE}/api/admin/users`);
        const users = await res.json();
        const u = users.find(x => x.id === id);
        if (!u) return;
        if (adminFormId) adminFormId.value = u.id;
        if (adminFormFullname) adminFormFullname.value = u.full_name || '';
        if (adminFormEmail) {
            adminFormEmail.value = u.username || '';
            adminFormEmail.readOnly = true;
            adminFormEmail.style.opacity = '0.75';
            adminFormEmail.title = 'Email là định danh cố định không thể sửa';
        }
        if (adminFormRole) {
            adminFormRole.value = u.role;
            // Sale: khoa o vai tro lai.
            //
            // Duong day Sale -> Agent nam o managed_by_admin_id, ma endpoint sua
            // tai khoan khong nhan truong do. Neu de doi vai tro tu do, mot Sale
            // co the thanh Agent trong khi van con tro toi Agent cu - han muc va
            // quyen doc hoi thoai tu do lech nhau, khong ai nhin ra.
            //
            // Sua ten, khoa/mo, doi avatar thi van lam duoc binh thuong.
            adminFormRole.disabled = u.role === 'sale' || CURRENT_ADMIN?.role === 'project_admin';
        }
        // Ai la Agent quan ly - chi de doc, vi day chinh la thu man hinh cu
        // khong noi ra duoc.
        renderAdminFormManager(u);
        if (adminFormSaleLimitGroup) adminFormSaleLimitGroup.style.display = u.role === 'agent' ? 'block' : 'none';
        {
            setDeferredMode(u.deferred_payment_mode || (u.allow_room_charge ? 'room_charge' : 'none'));
        }
        const adminFormDeferredGroup = document.getElementById('admin-form-deferred-group');
        if (adminFormDeferredGroup) {
            adminFormDeferredGroup.style.display = u.role === 'agent' ? 'block' : 'none';
        }
        if (adminFormProject) adminFormProject.value = u.project_id || '';
        // Đổ lại hạn mức Sale đang có. Bỏ bước này thì ô luôn trống, và lần bấm
        // "Cập nhật" kế tiếp sẽ âm thầm xoá hạn mức thành "không giới hạn".
        // Chú ý: 0 là giá trị hợp lệ (không được tạo Sale nào) nên không dùng
        // `u.sale_limit || ''` — số 0 sẽ bị nuốt mất.
        if (adminFormSaleLimit) {
            adminFormSaleLimit.value = (u.sale_limit === null || u.sale_limit === undefined) ? '' : String(u.sale_limit);
        }
        if (adminFormActive) adminFormActive.checked = u.is_active;
        // Tách tên đầy đủ đang lưu thành loại hình + tên riêng để hai ô hiện đúng.
        await loadVenuePrefixes();
        const parts = splitVenueName(u.full_name || '');
        const venueType = document.getElementById('admin-form-venue-type');
        if (venueType) venueType.value = parts.prefix.toLowerCase();
        if (adminFormFullname) adminFormFullname.value = parts.name;
        updateVenueNamePreview();
        pendingAvatarFile = null;
        renderAdminAvatarPreview(u.avatar_url || 'gradient-1', parts.name || u.username);
        if (adminFormStatusGroup) adminFormStatusGroup.style.display = 'flex';
        // Tên cơ sở đầy đủ dài hơn hẳn "Sửa nhân viên": bọc riêng để cắt được
        // sau 2 hàng, nếu không nó đẩy vỡ cả hàng tiêu đề trên màn hẹp.
        if (adminFormTitle) adminFormTitle.innerHTML = `<i class="ri-edit-line" style="color:#ec4899;"></i>`
            + `<span class="admin-form-title-text">Sửa nhân viên: `
            + `<b class="admin-form-title-name">${escapeHtml(u.full_name || u.username)}</b></span>`;
        if (adminFormSubmitBtn) adminFormSubmitBtn.innerHTML = '<i class="ri-save-line"></i> Cập nhật';
        if (adminFormCancelBtn) adminFormCancelBtn.style.display = 'inline-flex';
    } catch(e) { console.error('Error in editAdminUser:', e); }
}


async function deleteAdminUser(id) {
    if (!await pastieConfirm('Bạn có chắc chắn muốn xóa tài khoản nhân viên này?')) return;
    try {
        const res = await authFetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) { 
            await loadAdminUsers(); 
        } else { 
            toastError(data.error || 'Không thể xóa.'); 
        }
    } catch(e) { toastError('Lỗi kết nối máy chủ.'); }
}


async function handleAdminUserSubmit(e) {
    e.preventDefault();
    const id = adminFormId ? adminFormId.value : '';
    
    const isProjectAdmin = CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin';
    const effectiveRole = isProjectAdmin ? 'agent' : (adminFormRole?.value || 'agent');
    const effectiveProject = isProjectAdmin ? CURRENT_ADMIN.project_id : (adminFormProject?.value.trim() || null);

    const payload = {
        email: adminFormEmail?.value.trim(),
        full_name: adminFormFullname?.value.trim(),
        role: effectiveRole,
        avatar_url: adminFormAvatar?.value || 'gradient-1',
        project_id: effectiveProject,
        is_active: adminFormActive ? adminFormActive.checked : true
    };

    // Hạn mức Sale chỉ có nghĩa với role 'agent'. Backend đã nhận trường sale_limit
    // từ trước nhưng form này chưa bao giờ gửi lên, nên ô nhập trông như lưu được
    // mà thực ra giá trị bị bỏ rơi ngay tại trình duyệt.
    //
    // Ô để trống -> gửi chuỗi rỗng, backend hiểu là KHÔNG giới hạn (NULL).
    // Nhập 0     -> Agent không được tạo Sale nào. Hai ý nghĩa này khác nhau nên
    //               không được gộp thành cùng một giá trị.
    if (effectiveRole === 'agent') {
        payload.sale_limit = (adminFormSaleLimit?.value ?? '').trim();
        const adminFormDeferred = document.getElementById('admin-form-deferred');
        payload.deferred_payment_mode = adminFormDeferred?.value || 'none';
    }

    // Ghép LOẠI HÌNH + TÊN RIÊNG thành full_name. Máy chủ vẫn lưu một chuỗi như
    // trước và splitVenueName tách lại đúng chỗ mình vừa ghép — không phải đoán.
    {
        const type = (document.getElementById('admin-form-venue-type')?.value || '').trim();
        const bare = (adminFormFullname?.value || '').trim();
        if (type && bare) {
            payload.full_name = `${titleCaseVi(type)} ${bare}`;
        }
    }
    try {
        const url = id ? `${API_BASE}/api/admin/users/${id}` : `${API_BASE}/api/admin/users`;
        const method = id ? 'PUT' : 'POST';
        const res = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            // Tải ảnh SAU khi lưu: tài khoản mới tới đây mới có id để gắn ảnh vào.
            // Ảnh hỏng thì tài khoản vẫn đã lưu — báo riêng, đừng nuốt im lặng.
            const savedId = id || data?.user?.id || data?.id;
            if (pendingAvatarFile && savedId) {
                try {
                    await uploadAdminAvatar(savedId, pendingAvatarFile);
                } catch (error) {
                    showToast(`Đã lưu nhân viên nhưng chưa tải được ảnh: ${error.message}`, 'error');
                }
                pendingAvatarFile = null;
            }
            resetAdminForm();
            await loadAdminUsers(); 
            if (!id && data.qr?.chat_url) {
                // Link QR cần đọc và sao chép được nên dùng hộp thoại có nút, không
                // dùng toast tự tắt sau vài giây.
                const copy = await pastieConfirm(
                    `Khách quét mã này sẽ được chuyển tới Agent vừa tạo.\n\n${data.qr.chat_url}`,
                    { title: 'Đã tạo Agent và mã QR', confirmText: 'Sao chép link', cancelText: 'Để sau' }
                );
                if (copy) {
                    try { await navigator.clipboard.writeText(data.qr.chat_url); toastSuccess('Đã sao chép link QR.'); }
                    catch { toastError('Trình duyệt không cho sao chép. Hãy chọn và copy thủ công.'); }
                }
            } else {
                toastSuccess(id ? 'Đã cập nhật tài khoản.' : 'Đã tạo tài khoản nhân viên.');
            }
        } else { 
            toastError(data.error || 'Không thể lưu.'); 
        }
    } catch(e) { toastError('Lỗi kết nối máy chủ: ' + e.message); }
}


function openReportModal() {
    if (!reportModal) return;
    reportModal.classList.remove('hide');
    loadReportSalesDropdown();
    loadReportData();
}


function closeReportModal() {
    if (reportModal) reportModal.classList.add('hide');
}


async function loadReportSalesDropdown() {
    if (!reportSaleFilter) return;
    try {
        const isAgent = CURRENT_ADMIN?.role === 'agent';
        const url = isAgent ? `${API_BASE}/api/agent/sales` : `${API_BASE}/api/admin/users`;
        const res = await authFetch(url);
        const data = await res.json();
        const sales = Array.isArray(data) ? data.filter(u => isAgent || u.role === 'sale') : [];
        reportSaleFilter.innerHTML = '<option value="">— Tất cả nhân viên Sale —</option>' +
            sales.map(s => `<option value="${s.id}">${escapeHtml(s.full_name || s.fullName || s.username || s.email)}</option>`).join('');
    } catch(e) {
        console.error('Error loading sales for report filter:', e);
    }
}


async function loadReportData() {
    const totalSessionsEl = document.getElementById('metric-total-sessions');
    const totalVisitorsEl = document.getElementById('metric-total-visitors');
    const totalMessagesEl = document.getElementById('metric-total-messages');
    const staffMessagesEl = document.getElementById('metric-staff-messages');
    const salesTbody = document.getElementById('report-sales-tbody');
    const sessionsTbody = document.getElementById('report-sessions-tbody');

    // Ba trạng thái phải trông khác nhau: đang tải / chưa có dữ liệu / hỏng.
    const loadingRow = (colspan) => tableStateRow(colspan, {
        icon: 'ri-loader-4-line ri-spin', title: 'Đang tải dữ liệu…', message: 'Chờ một chút.',
    });
    if (salesTbody) salesTbody.innerHTML = loadingRow(4);
    if (sessionsTbody) sessionsTbody.innerHTML = loadingRow(5);

    try {
        const preset = reportDatePreset ? reportDatePreset.value : '7days';
        const saleId = reportSaleFilter ? reportSaleFilter.value : '';
        const status = reportStatusFilter ? reportStatusFilter.value : '';
        const currentTopProject = document.getElementById('project-filter')?.value || '';

        const params = new URLSearchParams();
        if (preset) params.append('datePreset', preset);
        if (saleId) params.append('saleId', saleId);
        if (status) params.append('status', status);
        if (currentTopProject) params.append('projectId', currentTopProject);

        const res = await authFetch(`${API_BASE}/api/admin/reports/data?${params.toString()}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Lỗi khi tải báo cáo.');

        const { summary, sales_breakdown, sessions } = data;

        if (totalSessionsEl) totalSessionsEl.textContent = Number(summary.total_sessions || 0).toLocaleString();
        if (totalVisitorsEl) totalVisitorsEl.textContent = Number(summary.total_visitors || 0).toLocaleString();
        if (totalMessagesEl) totalMessagesEl.textContent = Number(summary.total_messages || 0).toLocaleString();
        if (staffMessagesEl) staffMessagesEl.textContent = Number(summary.staff_messages || 0).toLocaleString();

        // Render Sales Table
        if (salesTbody) {
            if (!sales_breakdown || sales_breakdown.length === 0) {
                salesTbody.innerHTML = tableStateRow(4, {
                    icon: 'ri-user-search-line',
                    title: 'Chưa có Sale nào tư vấn',
                    message: 'Trong khoảng thời gian đang chọn chưa có Sale nào tiếp nhận hội thoại. Thử mở rộng khoảng thời gian hoặc bỏ bớt bộ lọc.',
                });
            } else {
                // data-label để trên điện thoại mỗi hàng gập thành một thẻ có
                // nhãn cột — bảng bốn cột trong khung 360px thì cột nào cũng bé
                // như hạt gạo.
                salesTbody.innerHTML = sales_breakdown.map(s => `
                    <tr>
                        <td data-label="Nhân viên Sale" style="font-weight: 700;">${escapeHtml(s.sale_name)}</td>
                        <td data-label="Email" style="color: var(--text-secondary);">${escapeHtml(s.sale_email)}</td>
                        <td data-label="Phiên tiếp nhận" class="is-num"><span class="report-num-a">${s.sessions_count}</span></td>
                        <td data-label="Tin đã gửi" class="is-num"><span class="report-num-b">${s.staff_messages_count}</span></td>
                    </tr>
                `).join('');
            }
        }

        // Render Sessions Log Table
        if (sessionsTbody) {
            if (!sessions || sessions.length === 0) {
                sessionsTbody.innerHTML = tableStateRow(5, {
                    icon: 'ri-chat-off-line',
                    title: 'Chưa có hội thoại nào',
                    message: 'Khi khách quét mã QR và bắt đầu nhắn tin, hội thoại sẽ xuất hiện ở đây.',
                });
            } else {
                sessionsTbody.innerHTML = sessions.map(s => `
                    <tr>
                        <td data-label="Thời gian" style="color: var(--text-secondary); white-space: nowrap;">${new Date(s.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td data-label="Khách hàng" style="font-weight: 700;">${escapeHtml(s.visitor_name || 'Khách')}</td>
                        <td data-label="Sale phụ trách"><span class="report-num-a">${escapeHtml(s.sale_name || 'Chưa nhận')}</span></td>
                        <td data-label="Tin nhắn" class="is-num">${s.total_messages || 0}</td>
                        <td data-label="Trạng thái"><span class="report-pill${s.status === 'active' ? ' is-open' : ''}">${s.status === 'active' ? 'Đang chat' : 'Đã đóng'}</span></td>
                    </tr>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Error loading report:', e);
        const errorRow = (colspan) => tableStateRow(colspan, {
            kind: 'error', retry: true,
            icon: 'ri-error-warning-line',
            title: 'Không tải được báo cáo',
            message: e.message || 'Máy chủ không phản hồi. Kiểm tra kết nối rồi thử lại.',
        });
        if (salesTbody) salesTbody.innerHTML = errorRow(4);
        if (sessionsTbody) sessionsTbody.innerHTML = errorRow(5);
        // Số liệu phía trên cũng phải xoá, không để lại con số của lần tải trước.
        [totalSessionsEl, totalVisitorsEl, totalMessagesEl, staffMessagesEl].forEach((el) => { if (el) el.textContent = '—'; });
    }
}


async function exportReportCSV() {
    try {
        const preset = reportDatePreset ? reportDatePreset.value : '7days';
        const saleId = reportSaleFilter ? reportSaleFilter.value : '';
        const status = reportStatusFilter ? reportStatusFilter.value : '';
        const currentTopProject = document.getElementById('project-filter')?.value || '';

        const params = new URLSearchParams();
        params.append('format', 'csv');
        if (preset) params.append('datePreset', preset);
        if (saleId) params.append('saleId', saleId);
        if (status) params.append('status', status);
        if (currentTopProject) params.append('projectId', currentTopProject);

        if (reportExportCsvBtn) {
            reportExportCsvBtn.disabled = true;
            reportExportCsvBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang xuất...';
        }

        const res = await authFetch(`${API_BASE}/api/admin/reports/data?${params.toString()}`);
        if (!res.ok) throw new Error('Không thể xuất file CSV.');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_cao_tu_van_Pastie_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(e) {
        toastError('Lỗi xuất file: ' + e.message);
    } finally {
        if (reportExportCsvBtn) {
            reportExportCsvBtn.disabled = false;
            reportExportCsvBtn.innerHTML = '<i class="ri-file-excel-2-line"></i> Xuất Excel (CSV)';
        }
    }
}


// ── Thiết bị đã đăng ký của một tài khoản ────────────────────────────────────
//
// Mở từ chính dòng nhân viên, không phải từ một tab riêng: khi cần thu hồi máy
// cho ai đó thì mình đang nhìn đúng dòng của người đó, đi tìm lại tên trong một
// danh sách thứ hai chỉ tổ bấm nhầm sang tài khoản bên cạnh.
//
// Ba việc backend đã có sẵn: xem danh sách, thu hồi một máy, và reset sạch kèm
// xoá thời gian chờ đổi máy.
function deviceTimeLabel(value) {
    if (!value) return '—';
    const time = new Date(value);
    if (Number.isNaN(time.getTime())) return '—';
    return time.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function openAccountDevices(adminId) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay device-overlay';
    overlay.innerHTML = `
        <div class="confirm-card device-card" role="dialog" aria-modal="true" aria-label="Thiết bị đã đăng ký">
            <div class="device-head">
                <h3><i class="ri-computer-line"></i> Thiết bị đã đăng ký</h3>
                <button type="button" class="icon-btn device-close" title="Đóng"><i class="ri-close-line"></i></button>
            </div>
            <div class="device-body"><p class="device-loading"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p></div>
        </div>`;
    document.body.appendChild(overlay);

    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    overlay.querySelector('.device-close').addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    const body = overlay.querySelector('.device-body');

    async function load() {
        body.innerHTML = '<p class="device-loading"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
        try {
            const res = await authFetch(`${API_BASE}/api/superadmin/accounts/${adminId}/devices`);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Không tải được danh sách thiết bị.');

            // Máy đã thu hồi vẫn còn trong bảng. Trộn chung với máy đang dùng thì
            // con số "3/2 máy" hiện ra vô nghĩa — tách hẳn hai nhóm.
            const all = Array.isArray(data.devices) ? data.devices : [];
            const active = all.filter((d) => d.status !== 'revoked');
            const revoked = all.filter((d) => d.status === 'revoked');
            const limit = data.limit == null ? '∞' : data.limit;

            const row = (device, isActive) => {
                const shortDeviceId = String(device.device_id || '').slice(-12).toUpperCase();
                return `
                <div class="device-row${isActive ? '' : ' is-revoked'}">
                    <div class="device-row-main">
                        <strong>Thiết bị ${escapeHtml(shortDeviceId || String(device.id || ''))}</strong>
                        <small>Nhãn tham khảo: ${escapeHtml(device.label || 'Không xác định')}</small>
                        <small>Lần cuối: ${escapeHtml(deviceTimeLabel(device.last_seen))} · Đăng ký: ${escapeHtml(deviceTimeLabel(device.first_seen))}</small>
                        <small>IP truy cập gần nhất (chỉ nhật ký): ${escapeHtml(device.last_ip || 'Không ghi nhận')}</small>
                    </div>
                    ${isActive
                        ? `<span class="device-row-actions">
                             <button type="button" class="device-revoke" data-remove="${device.id}"><i class="ri-delete-bin-line"></i> Gỡ</button>
                             <button type="button" class="device-block" data-block="${device.id}"><i class="ri-forbid-line"></i> Chặn</button>
                           </span>`
                        : `<span class="device-row-actions">
                             <span class="device-revoked-tag">Đã chặn</span>
                             <button type="button" class="device-allow" data-allow="${device.id}"><i class="ri-check-line"></i> Bỏ chặn</button>
                           </span>`}
                </div>`;
            };

            body.innerHTML = `
                <div class="device-summary">
                    <span><strong>${escapeHtml(data.account?.full_name || data.account?.username || '')}</strong></span>
                    <span class="device-count">${active.length}/${limit} máy đang dùng</span>
                </div>
                <p class="device-cooldown">
                    Đổi máy phải cách nhau ${Number(data.cooldownDays || 0)} ngày.
                    Lần đổi gần nhất: ${escapeHtml(deviceTimeLabel(data.lastChangeAt))}
                </p>
                <p class="device-hint">
                    Hạn mức được tính theo <strong>mã thiết bị do hệ thống cấp</strong>, không tính theo IP hoặc trình duyệt.
                    Đổi Wi-Fi, 4G/5G hay địa điểm không tạo thêm thiết bị. IP chỉ được lưu trong nhật ký truy cập.
                </p>
                ${active.length ? active.map((d) => row(d, true)).join('') : '<p class="device-empty">Chưa có máy nào đang đăng ký.</p>'}
                ${revoked.length ? `<p class="device-group-label">Đã chặn (${revoked.length})</p>${revoked.map((d) => row(d, false)).join('')}` : ''}
                <p class="device-hint">
                    <strong>Gỡ</strong> xoá máy khỏi danh sách và trả lại một suất — máy đó đăng nhập lại được bình thường.
                    <strong>Chặn</strong> cấm hẳn máy đó, dùng khi máy bị mất; bỏ chặn được bất cứ lúc nào.
                </p>
                <button type="button" class="device-reset"><i class="ri-refresh-line"></i> Xoá sạch danh sách &amp; thời gian chờ</button>`;
        } catch (error) {
            body.innerHTML = `<p class="device-error">${escapeHtml(error.message)}</p>`;
        }
    }

    // Ba việc khác nhau, ba lời xác nhận khác nhau — trước đây gộp làm một nên
    // người bấm không biết mình vừa dọn chỗ hay vừa cấm vĩnh viễn một cái máy.
    const act = async (url, method, confirmText, doneText, failText) => {
        if (confirmText && !(await pastieConfirm(confirmText))) return;
        try {
            const res = await authFetch(url, { method });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || failText);
            showToast(doneText, 'success');
            await load();
        } catch (error) { showToast(error.message, 'error'); }
    };

    body.addEventListener('click', async (event) => {
        const base = `${API_BASE}/api/superadmin/accounts/${adminId}/devices`;

        const removeBtn = event.target.closest('[data-remove]');
        if (removeBtn) {
            await act(`${base}/${removeBtn.dataset.remove}`, 'DELETE',
                'Gỡ thiết bị này khỏi tài khoản? Phiên trên máy đó đóng ngay, nhưng máy vẫn đăng nhập lại được và suất trong hạn mức được trả lại.',
                'Đã gỡ thiết bị.', 'Không gỡ được thiết bị.');
            return;
        }
        const blockBtn = event.target.closest('[data-block]');
        if (blockBtn) {
            await act(`${base}/${blockBtn.dataset.block}/block`, 'POST',
                'CHẶN thiết bị này? Máy đó sẽ không đăng nhập được nữa cho tới khi anh bỏ chặn. Chỉ dùng khi máy bị mất.',
                'Đã chặn thiết bị.', 'Không chặn được thiết bị.');
            return;
        }
        const allowBtn = event.target.closest('[data-allow]');
        if (allowBtn) {
            await act(`${base}/${allowBtn.dataset.allow}/allow`, 'POST',
                'Bỏ chặn thiết bị này? Máy đó đăng nhập lại được ngay.',
                'Đã bỏ chặn thiết bị.', 'Không bỏ chặn được thiết bị.');
            return;
        }
        if (event.target.closest('.device-reset')) {
            // Reset là cửa sau lách hạn mức nếu dùng bừa — hỏi cho rõ trước.
            const ok = await pastieConfirm('Xoá SẠCH danh sách thiết bị của tài khoản này và xoá thời gian chờ đổi máy? Người dùng đăng nhập lại là máy được ghi nhận lại từ đầu.');
            if (!ok) return;
            try {
                const res = await authFetch(`${API_BASE}/api/superadmin/accounts/${adminId}/devices/reset`, { method: 'POST' });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Không reset được thiết bị.');
                showToast('Đã xoá sạch danh sách thiết bị.', 'success');
                await load();
            } catch (error) { showToast(error.message, 'error'); }
        }
    });

    await load();
}
window.openAccountDevices = openAccountDevices;

// Xử lý upload avatar tài khoản cá nhân (Sale, Agent, Admin)
document.getElementById('self-avatar-pick-btn')?.addEventListener('click', () => {
    document.getElementById('self-avatar-file-input')?.click();
});

document.getElementById('self-avatar-file-input')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const pickBtn = document.getElementById('self-avatar-pick-btn');
    const origHtml = pickBtn ? pickBtn.innerHTML : '';
    if (pickBtn) { pickBtn.disabled = true; pickBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang tải lên...'; }
    setSelfProfileStatus('Đang tải ảnh đại diện lên...', '');

    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await authFetch(`${API_BASE}/api/admin/me/avatar`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Không tải được ảnh lên.');

        if (CURRENT_ADMIN) CURRENT_ADMIN.avatar_url = data.avatarUrl;
        const preview = document.getElementById('self-avatar-preview');
        if (preview && data.avatarUrl) {
            preview.innerHTML = `<img src="${escapeHtml(data.avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
        }
        updateAgentHeaderUI();
        setSelfProfileStatus('Đã cập nhật ảnh đại diện.', 'ok');
    } catch (err) {
        setSelfProfileStatus(err.message, 'error');
    } finally {
        if (pickBtn) { pickBtn.disabled = false; pickBtn.innerHTML = origHtml; }
    }
});
