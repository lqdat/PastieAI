// Mặt chat và realtime.
//
// Danh sách phiên, tin nhắn, SSE, ghi âm giọng nói, tệp đính kèm, dịch hiển thị,
// thông báo đẩy, hoá đơn trong luồng chat. Đây là phần lớn nhất và mọi vai trò
// đều dùng — kể cả Sale vốn chỉ có mỗi màn này.
//
// Phụ thuộc core.js (authFetch, showToast, escapeHtml...). Xem chú thích thứ tự
// nạp ở đầu core.js.

// =====================================================================
// KÊNH CHAT NỘI BỘ (AGENT - SUPERADMIN, AGENT - SALE)
// =====================================================================
let internalChats = [];
let currentCategoryTab = 'customers'; // 'customers' | 'internal'
let currentInternalChat = null;

async function fetchInternalChats() {
    try {
        const token = getToken();
        if (!token) return;
        const res = await authFetch(`${API_BASE}/api/admin/internal-chats?_=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.chats)) {
            internalChats = data.chats;
            renderInternalBadge();
            if (currentCategoryTab === 'internal') {
                renderInternalSessionsList();
            }
            if (CURRENT_ADMIN && CURRENT_ADMIN.role === 'sale') {
                if (typeof renderSessionsList === 'function' && Array.isArray(sessionsList)) {
                    renderSessionsList(sessionsList);
                }
            }
        }
    } catch (e) {
        console.error('Lỗi tải danh sách chat nội bộ:', e);
    }
}

function renderInternalBadge() {
    const badge = document.getElementById('internal-unread-badge');
    if (!badge) return;
    const totalUnread = internalChats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    if (totalUnread > 0) {
        badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
        badge.classList.remove('hide');
    } else {
        badge.classList.add('hide');
    }
}

function createInternalSessionCard(chat, isPinned = false) {
    const card = document.createElement('div');
    const isSelected = currentSessionId === chat.sessionId;
    const hasUnread = (chat.unreadCount || 0) > 0;
    card.className = `session-card ${isPinned ? 'is-pinned-agent' : ''} ${isSelected ? 'active-selected' : ''} ${hasUnread ? 'has-unread' : ''}`;
    card.setAttribute('data-id', chat.sessionId);

    const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US';
    let dateStr = '';
    if (chat.lastMessageTime) {
        const msgTime = new Date(chat.lastMessageTime);
        dateStr = msgTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) + ' ' + msgTime.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    }

    const unreadBadge = hasUnread ? `<span class="session-unread-badge">${chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>` : '';

    let roleBadgeClass = 'internal-badge-sale';
    let roleBadgeText = chat.badgeLabel || 'Nội bộ';
    if (chat.peerRole === 'superadmin') {
        roleBadgeClass = 'internal-badge-superadmin';
        roleBadgeText = 'superadmin';
    } else if (chat.peerRole === 'agent') {
        roleBadgeClass = 'internal-badge-agent';
        roleBadgeText = isPinned ? '📌 Agent Quản Lý' : 'Agent';
    }

    const peerInitial = (chat.peerName || '?')[0].toUpperCase();
    const avatarHtml = chat.peerAvatar
        ? `<img src="${escapeHtml(chat.peerAvatar)}" class="visitor-avatar-img internal-avatar-img" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          + `<div class="visitor-avatar-initials internal-avatar-initials" style="display:none;">${escapeHtml(peerInitial)}</div>`
        : `<div class="visitor-avatar-initials internal-avatar-initials">${escapeHtml(peerInitial)}</div>`;

    const preview = chat.lastMessage ? chat.lastMessage : 'Chưa có tin nhắn...';

    card.innerHTML = `
        <div class="session-card-header">
            <div class="visitor-avatar-wrap">${avatarHtml}</div>
            <div class="session-card-info">
                <div class="session-card-top-row">
                    <span class="session-name" title="${escapeHtml(chat.peerName || '')}">${escapeHtml(chat.peerName || 'Nội bộ')}</span>
                    <span class="session-card-time">${dateStr}</span>
                </div>
                <div class="session-card-bottom-row">
                    <span class="internal-role-badge ${roleBadgeClass}">${roleBadgeText}</span>
                    ${unreadBadge}
                </div>
            </div>
        </div>
        <div class="session-card-preview${chat.lastMessage ? '' : ' is-empty'}">${escapeHtml(preview)}</div>
        <div class="session-meta-footer">
            <span class="session-group-tag" style="background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.25);font-size:10px;padding:1px 6px;border-radius:10px;font-weight:600;display:inline-flex;align-items:center;gap:3px;"><i class="ri-team-line"></i> Hội thoại nội bộ</span>
        </div>
    `;

    card.addEventListener('click', () => selectInternalSession(chat));
    return card;
}

function renderInternalSessionsList() {
    const container = document.getElementById('internal-sessions-list-container');
    if (!container) return;

    if (!internalChats || internalChats.length === 0) {
        container.innerHTML = `<div class="empty-state">Chưa có hội thoại nội bộ nào.</div>`;
        return;
    }

    container.innerHTML = '';
    internalChats.forEach(chat => {
        const card = createInternalSessionCard(chat, false);
        container.appendChild(card);
    });
}

function initSessionCategoryTabs() {
    const tabsContainer = document.getElementById('session-category-tabs');
    const tabCustomers = document.getElementById('tab-cat-customers');
    const tabInternal = document.getElementById('tab-cat-internal');
    const statusFilter = document.getElementById('session-status-filter');
    const customerList = document.getElementById('sessions-list-container');
    const internalList = document.getElementById('internal-sessions-list-container');

    if (!tabsContainer || !tabCustomers || !tabInternal) return;

    const isAgent = CURRENT_ADMIN && CURRENT_ADMIN.role === 'agent';
    const isSuper = CURRENT_ADMIN && ['superadmin', 'project_admin'].includes(CURRENT_ADMIN.role);
    const isSaleWithAgent = CURRENT_ADMIN && CURRENT_ADMIN.role === 'sale';

    if (isAgent || isSuper || isSaleWithAgent) {
        tabsContainer.classList.remove('hide');
    } else {
        tabsContainer.classList.add('hide');
    }

    tabCustomers.onclick = () => {
        currentCategoryTab = 'customers';
        tabCustomers.classList.add('is-active');
        tabInternal.classList.remove('is-active');
        statusFilter?.classList.remove('hide');
        customerList?.classList.remove('hide');
        internalList?.classList.add('hide');
    };

    tabInternal.onclick = () => {
        currentCategoryTab = 'internal';
        tabInternal.classList.add('is-active');
        tabCustomers.classList.remove('is-active');
        statusFilter?.classList.add('hide');
        customerList?.classList.add('hide');
        internalList?.classList.remove('hide');
        fetchInternalChats();
        renderInternalSessionsList();
    };
}

async function selectInternalSession(chat) {
    if (!chat) return;
    currentSessionId = chat.sessionId;
    currentInternalChat = chat;

    dashboardBody?.classList.add('chat-open');
    bindAgentChatInputEvents();

    // Highlight card & clear unread badge in DOM
    document.querySelectorAll('.session-card').forEach(c => {
        c.classList.remove('active-selected');
        if (c.getAttribute('data-id') === chat.sessionId) {
            c.classList.add('active-selected');
            c.classList.remove('has-unread');
            c.querySelector('.session-unread-badge')?.remove();
        }
    });

    // Reset pagination & message state
    adminMessages = [];
    adminOffset = 0;
    adminHasMore = false;
    adminOrder = null;
    adminBills = [];
    adminOrderRevisions = [];

    // Header updates
    const peerDisplay = chat.peerName || (chat.peerRole === 'superadmin' ? 'superadmin' : 'Nội bộ');
    if (chatTitleName) chatTitleName.textContent = peerDisplay;
    if (chatTitleEmail) chatTitleEmail.textContent = chat.peerRole === 'superadmin' ? 'superadmin' : (chat.peerRole === 'agent' ? 'Agent quản lý' : 'Nhân viên Sale');
    document.getElementById('chat-header-group-badge')?.classList.add('hide');
    document.getElementById('chat-header-project-badge')?.classList.add('hide');
    document.getElementById('chat-header-qr-info')?.classList.add('hide');

    const chatHeaderAvatar = document.getElementById('chat-header-avatar');
    if (chatHeaderAvatar) {
        chatHeaderAvatar.style.display = 'block';
        if (chat.peerAvatar) {
            chatHeaderAvatar.innerHTML = `<img src="${escapeHtml(chat.peerAvatar)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(99,102,241,0.4);" alt="">`;
        } else {
            const initial = (peerDisplay || '?')[0].toUpperCase();
            chatHeaderAvatar.innerHTML = `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg, #6366f1, #a855f7);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;border:2px solid rgba(255,255,255,0.2);">${initial}</div>`;
        }
    }

    // Permission & input controls
    const supervisorBar = document.getElementById('chat-supervisor-bar');
    if (supervisorBar) supervisorBar.style.display = 'none';

    document.getElementById('claim-chat-btn')?.classList.add('hide');
    document.getElementById('close-session-btn')?.classList.add('hide');
    document.getElementById('handover-session-btn')?.classList.add('hide');
    document.getElementById('assignee-selector-container')?.classList.add('hide');
    document.getElementById('shift-draining-banner')?.classList.add('hide');
    document.getElementById('delete-session-btn')?.classList.add('hide');

    chatHeaderActions?.classList.remove('hide');
    chatInputContainer?.classList.remove('hide');
    chatForm?.classList.remove('hide');
    detailsSidebar?.classList.add('hide');

    if (chatInput) {
        chatInput.disabled = false;
        chatInput.classList.remove('is-supervisor-mode');
        chatInput.placeholder = 'Nhập tin nhắn nội bộ...';
        setTimeout(() => chatInput?.focus(), 150);
    }
    const sendBtn = chatForm?.querySelector('button[type="submit"]');
    if (sendBtn) sendBtn.disabled = false;

    // Loading placeholder in messages container
    if (chatMessagesContainer) {
        chatMessagesContainer.innerHTML = '<div class="chat-loading-state" style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-muted);"><i class="ri-loader-4-line rotating" style="font-size:24px;margin-right:8px;"></i> Đang tải tin nhắn...</div>';
    }

    // Load messages
    await loadMessages(chat.sessionId);

    // Mark read
    authFetch(`${API_BASE}/api/admin/chats/${chat.sessionId}/read`, { method: 'POST' }).catch(() => {});
    chat.unreadCount = 0;
    renderInternalBadge();
    if (currentCategoryTab === 'internal') {
        renderInternalSessionsList();
    } else if (CURRENT_ADMIN && CURRENT_ADMIN.role === 'sale') {
        renderSessionsList(sessionsList);
    }
}

async function sendInternalMessage(text) {
    if (adminIsSending) return;
    adminIsSending = true;
    stopAgentTyping();

    chatInput.value = '';
    resizeAgentChatInput();

    const tempId = 'temp_' + Date.now();
    const newMsgObj = {
        id: tempId,
        session_id: currentSessionId,
        sender: CURRENT_ADMIN?.role || 'agent',
        sender_admin_id: CURRENT_ADMIN?.id,
        sender_admin_name: CURRENT_ADMIN?.full_name || CURRENT_ADMIN?.username,
        sender_admin_avatar: CURRENT_ADMIN?.avatar_url,
        original_text: text,
        created_at: new Date(),
        is_internal: true
    };
    adminMessages.push(newMsgObj);
    renderAdminMessages(false, true);

    try {
        const response = await authFetch(`${API_BASE}/api/admin/internal-chats/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: currentSessionId,
                text
            })
        });
        const data = await response.json();
        if (data.success && data.message) {
            const idx = adminMessages.findIndex(m => m.id === tempId);
            if (idx !== -1) {
                adminMessages[idx] = data.message;
            }
            renderAdminMessages(false, true);
            const ch = internalChats.find(c => c.sessionId === currentSessionId);
            if (ch) {
                ch.lastMessage = text;
                ch.lastMessageTime = new Date().toISOString();
                if (currentCategoryTab === 'internal') renderInternalSessionsList();
                else if (CURRENT_ADMIN && CURRENT_ADMIN.role === 'sale') renderSessionsList(sessionsList);
            }
        } else {
            adminMessages = adminMessages.filter(m => m.id !== tempId);
            renderAdminMessages(false);
            toastError('Không thể gửi tin nhắn nội bộ: ' + (data.error || ''));
        }
    } catch (e) {
        console.error('Lỗi gửi tin nhắn nội bộ:', e);
        adminMessages = adminMessages.filter(m => m.id !== tempId);
        renderAdminMessages(false);
    } finally {
        adminIsSending = false;
    }
}

// Translation Function
function applyTranslations(lang) {
    currentLang = lang;
    localStorage.setItem('pastie_admin_lang', lang);

    const dict = TRANSLATIONS[lang] || TRANSLATIONS['vi'];

    // 1. Translate elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });

    // 2. Translate elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) {
            el.setAttribute('placeholder', dict[key]);
        }
    });

    // 3. Translate titles with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (dict[key]) {
            el.setAttribute('title', dict[key]);
        }
    });

    // 4. Update the language select dropdown value
    const select = document.getElementById('admin-lang-select');
    if (select) {
        select.value = lang;
    }

    // Refresh dynamic states if visible
    const dictObj = TRANSLATIONS[lang] || TRANSLATIONS['vi'];
    if (!currentSessionId) {
        const titleName = document.getElementById('chat-title-name');
        const titleEmail = document.getElementById('chat-title-email');
        if (titleName) titleName.textContent = dictObj.noChatSelected;
        if (titleEmail) titleEmail.textContent = dictObj.selectChatPrompt;
        
        const chatHeaderProjectBadge = document.getElementById('chat-header-project-badge');
        if (chatHeaderProjectBadge) {
            chatHeaderProjectBadge.classList.add('hide');
        }
        
        const messagesCont = document.getElementById('chat-messages-container');
        if (messagesCont && messagesCont.querySelector('.chat-welcome-state')) {
            messagesCont.innerHTML = `
                <div class="chat-welcome-state">
                    <i class="ri-message-3-line"></i>
                    <p>${dictObj.welcomePrompt}</p>
                </div>
            `;
        }
    } else {
        const session = sessionsList.find(s => s.id === currentSessionId);
        if (session) {
            applyDetailsPanelMode(session);
            const summaryText = document.getElementById('detail-summary');
            if (summaryText && (!session.ai_summary)) {
                summaryText.textContent = dictObj.closeChatToAnalyze;
            }
            const dl = document.getElementById('detail-lang-select');
            if (dl && (!session.detected_language || session.detected_language === 'unknown')) {
                dl.value = 'unknown';
            }
        }
        // Reload messages to update bubble language displays instantly on administrative language change
        loadMessages(currentSessionId);
    }

    // Re-render sessions list to apply selected administrative language instantly to sidebar cards and groups
    if (sessionsList && sessionsList.length > 0) {
        renderSessionsList(sessionsList);
    }

    // data-i18n dùng textContent nên có thể ghi đè wordmark trong header.
    // Dựng lại logo thương hiệu sau mỗi lần đổi ngôn ngữ.
    updateConsoleBrand();
}


function beginNewAdminSession(token) {
    adminAuthGeneration++;
    localStorage.setItem('pastie_admin_token', token);
    sessionsList = [];
    adminMessages = [];
    adminOffset = 0;
    adminHasMore = true;
    adminOrder = null;
    adminBills = [];
    adminOrderSignature = '';
    CURRENT_ADMIN = null;
    resetActiveChatUI();
}


function handleSessionRevoked(reason = 'new_login') {
    if (adminEventSource) {
        adminEventSource.close();
        adminEventSource = null;
    }
    clearTimeout(adminEventReconnectTimer);
    localStorage.removeItem('pastie_admin_token');

    const modal = document.getElementById('session-revoked-modal');
    if (modal) {
        modal.classList.remove('hide');
    } else {
        alert('Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác. Phiên làm việc trên thiết bị này đã kết thúc.');
        showLogin();
    }
}


function withPushTimeout(promise, step, timeoutMs = 15000) {
    let timer = null;
    const timeout = new Promise((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(`${step} mất quá lâu. Vui lòng tải lại trang và thử lại.`)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => { if (timer) window.clearTimeout(timer); });
}


function subscriptionUsesVapidKey(subscription, publicKey) {
    const currentKey = subscription?.options?.applicationServerKey;
    if (!currentKey || !publicKey) return false;
    const expectedKey = urlBase64ToUint8Array(publicKey);
    const actualKey = new Uint8Array(currentKey);
    return actualKey.length === expectedKey.length && actualKey.every((value, index) => value === expectedKey[index]);
}


async function syncPushSubscription(config) {
    let subscription = await withPushTimeout(pushRegistration.pushManager.getSubscription(), 'Không thể đọc trạng thái Push');
    // Mỗi subscription được gắn với một VAPID public key. Khi thay key trên
    // Railway, huỷ subscription cũ và tạo lại để tránh push im lặng thất bại.
    if (subscription && !subscriptionUsesVapidKey(subscription, config.publicKey)) {
        await withPushTimeout(subscription.unsubscribe(), 'Không thể làm mới đăng ký Push');
        subscription = null;
    }
    if (!subscription) {
        subscription = await withPushTimeout(pushRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        }), 'Trình duyệt không hoàn tất đăng ký Push');
    }
    const saveResponse = await withPushTimeout(authFetch(`${API_BASE}/api/admin/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
    }), 'Không thể lưu thiết bị nhận thông báo');
    if (!saveResponse.ok) throw new Error('Không thể lưu thiết bị nhận thông báo.');
    return subscription;
}


// Trạng thái thông báo hiển thị trong màn hình "Quản lý tài khoản", cạnh Email và
// Vai trò — nơi người dùng tìm khi muốn kiểm tra, thay vì một cái chuông mơ hồ.
function renderPushStatusRow(state) {
    lastPushState = state || 'off';
    const row = document.getElementById('self-push-status');
    if (!row) return;
    const map = {
        enabled:     { icon: 'ri-notification-3-fill', text: 'Đang bật', cls: 'is-on' },
        blocked:     { icon: 'ri-notification-off-line', text: 'Bị chặn trong cài đặt trình duyệt', cls: 'is-off' },
        unavailable: { icon: 'ri-notification-off-line', text: 'Máy chủ chưa cấu hình', cls: 'is-off' },
    };
    const cfg = map[lastPushState] || { icon: 'ri-notification-3-line', text: 'Chưa bật', cls: 'is-off' };
    row.className = `self-account-meta-item self-push-status ${cfg.cls}`;
    row.innerHTML = `<i class="${cfg.icon}"></i><span>Thông báo</span><strong>${escapeHtml(cfg.text)}</strong>`;
}


function setPushButtonState(state) {
    // Nút riêng trên header (Agent) — trạng thái luôn khớp với mục trong menu Cài đặt.
    const headerLabel = document.getElementById('agent-push-label');
    const headerIcon = document.getElementById('agent-push-icon');
    const headerBtn = document.getElementById('agent-push-btn');
    if (headerLabel && headerIcon && headerBtn) {
        const headerStates = {
            enabled:     { text: 'Thông báo đã bật',   icon: 'ri-notification-3-fill', title: 'Thiết bị này sẽ nhận chat cần Agent', cls: 'is-enabled' },
            blocked:     { text: 'Thông báo bị chặn',  icon: 'ri-notification-off-line', title: 'Mở quyền Thông báo trong cài đặt trình duyệt', cls: 'is-blocked' },
            unavailable: { text: 'Push chưa cấu hình', icon: 'ri-notification-off-line', title: 'Liên hệ quản trị hệ thống để bật VAPID', cls: 'is-blocked' },
        };
        const cfg = headerStates[state] || { text: 'Bật thông báo', icon: 'ri-notification-3-line', title: 'Nhận chat mới ngay cả khi đã đóng app', cls: '' };
        headerLabel.textContent = cfg.text;
        headerIcon.className = cfg.icon;
        headerBtn.title = cfg.title;
        headerBtn.setAttribute('aria-label', cfg.text);
        headerBtn.classList.remove('is-enabled', 'is-blocked', 'is-icon-only');
        if (cfg.cls) headerBtn.classList.add(cfg.cls);

        // Đã bật rồi thì ẨN HẲN nút khỏi header.
        //
        // Một cái chuông đứng một mình trên thanh tiêu đề đọc như "danh sách thông
        // báo" — người dùng bấm vào mong thấy các thông báo đã nhận, nhưng nó chỉ
        // là nút bật/tắt. Khi quyền đã được cấp thì cũng chẳng còn việc gì để làm.
        // Nút chỉ xuất hiện khi THẬT SỰ cần thao tác: chưa bật, bị chặn, hoặc máy
        // chủ chưa cấu hình. Trạng thái "đang bật" chuyển vào màn hình Quản lý
        // tài khoản — xem renderPushStatusRow().
        pushHeaderHidden = state === 'enabled';
        headerBtn.classList.toggle('hide', pushHeaderHidden);
        renderPushStatusRow(state);
    }

    const label = document.getElementById('enable-push-label');
    const description = document.getElementById('enable-push-description');
    if (!label || !description) return;
    if (state === 'enabled') { label.textContent = 'Thông báo đã bật'; description.textContent = 'Thiết bị này sẽ nhận chat cần Agent'; }
    else if (state === 'blocked') { label.textContent = 'Thông báo đang bị chặn'; description.textContent = 'Mở quyền Thông báo trong cài đặt trình duyệt'; }
    else if (state === 'unavailable') { label.textContent = 'Push chưa được cấu hình'; description.textContent = 'Liên hệ quản trị hệ thống để bật VAPID'; }
    else { label.textContent = 'Bật thông báo'; description.textContent = 'Nhận chat mới ngay cả khi đã đóng app'; }
}


function renderPushSteps(issue) {
    const list = document.getElementById('push-modal-steps');
    if (!list) return;

    const shareStep = 'Nhấn nút <b>Chia sẻ</b> ở thanh công cụ Safari (ô vuông có mũi tên hướng lên).';
    let steps = null;

    if (issue === 'ios-home-screen') {
        steps = [
            ...(isIosNonSafariBrowser
                ? ['Mở lại trang này bằng <b>Safari</b> — thông báo trên iPhone/iPad chỉ hoạt động qua Safari.']
                : []),
            shareStep,
            'Kéo xuống chọn <b>Thêm vào Màn hình chính</b>, rồi nhấn <b>Thêm</b>.',
            'Mở Pastie Console từ <b>biểu tượng vừa tạo</b> trên Màn hình chính.',
            'Bấm <b>Bật thông báo ngay</b> và chọn <b>Cho phép</b>.',
        ];
    } else if (issue !== 'unsupported' && typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        steps = [
            'Nhấn vào <b>biểu tượng khóa</b> cạnh thanh địa chỉ của trình duyệt.',
            'Mở <b>Cài đặt trang web</b> (Site settings / Quyền).',
            'Đổi mục <b>Thông báo</b> sang <b>Cho phép</b>.',
            'Tải lại trang rồi bấm <b>Bật thông báo ngay</b>.',
        ];
    }

    if (!steps) { list.classList.add('hide'); list.innerHTML = ''; return; }
    list.innerHTML = steps.map((step) => `<li>${step}</li>`).join('');
    list.classList.remove('hide');
}


function getPushSupportIssue() {
    // Do not rely solely on the iOS user-agent: recent Safari builds can reduce
    // it. If a touch device has the native share sheet, offer the install flow.
    if (!('Notification' in window)) return canOpenMobileShareSheet ? 'ios-home-screen' : 'unsupported';
    // iOS/iPadOS only enables Web Push after the web app is added to Home Screen.
    if (isAppleMobile && !isStandaloneWebApp) return 'ios-home-screen';
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return canOpenMobileShareSheet ? 'ios-home-screen' : 'unsupported';
    return null;
}


function setPushModalMode(issue = null) {
    const description = document.getElementById('push-modal-description');
    const button = document.getElementById('push-modal-confirm');
    // Nút chính LUÔN là "Bật thông báo". Việc tạo shortcut đã tách thành nút riêng
    // bên dưới, nên không đổi nút này thành "Mở menu Chia sẻ" nữa.
    if (issue === 'ios-home-screen') {
        if (description) description.textContent = 'Trên iPhone/iPad, thông báo chỉ hoạt động khi mở Pastie Console từ Màn hình chính. Làm theo các bước sau:';
        // Vô hiệu hóa nút thay vì để bấm mà không có gì xảy ra: ở trạng thái này
        // trình duyệt chắc chắn không cho xin quyền, nên nút phải nhìn ra là không bấm được.
        if (button) { button.disabled = true; button.innerHTML = '<i class="ri-smartphone-line"></i> Cần thêm vào Màn hình chính'; }
        renderPushSteps(issue);
        return;
    }
    if (issue === 'unsupported') {
        if (description) description.textContent = 'Phiên bản trình duyệt này chưa hỗ trợ thông báo đẩy. Hãy cập nhật Safari hoặc dùng Chrome/Edge phiên bản mới.';
        if (button) { button.disabled = true; button.innerHTML = '<i class="ri-notification-off-line"></i> Trình duyệt chưa hỗ trợ'; }
        renderPushSteps(issue);
        return;
    }
    if (description) description.textContent = Notification.permission === 'denied'
        ? 'Thông báo đã bị chặn. Hãy mở phần Cài đặt trang web / quyền riêng tư của trình duyệt (biểu tượng khóa cạnh thanh địa chỉ) và chọn Cho phép thông báo.'
        : 'Bật thông báo để nhận tin ngay khi hệ thống chuyển cuộc trò chuyện cần Agent hỗ trợ.';
    if (button) { button.disabled = false; button.innerHTML = '<i class="ri-notification-3-fill"></i> Bật thông báo ngay'; }
    renderPushSteps(issue);
}


async function setupPushNotifications() {
    // Nhúng trong iframe: quyền do trang cha quản lý, chỉ hỏi trạng thái.
    if (inIframe) { postToParent({ type: 'pastie-request-state' }); return false; }
    const supportIssue = getPushSupportIssue();
    if (supportIssue) {
        setPushButtonState('unavailable');
        setPushModalMode(supportIssue);
        pushPermissionModal?.classList.remove('hide');
        return false;
    }
    try {
        pushRegistration = await withPushTimeout(navigator.serviceWorker.register('/push-sw.js'), 'Service Worker không khởi động');
        const response = await withPushTimeout(authFetch(`${API_BASE}/api/admin/push/public-key`), 'Không thể lấy cấu hình Push');
        const config = await withPushTimeout(response.json(), 'Không thể đọc cấu hình Push');
        if (!response.ok || !config.enabled) {
            setPushButtonState('unavailable');
            pushPermissionModal?.classList.remove('hide');
            return false;
        }
        let subscription = await withPushTimeout(pushRegistration.pushManager.getSubscription(), 'Không thể đọc trạng thái Push');
        if (Notification.permission === 'granted') {
            subscription = await syncPushSubscription(config);
        }
        setPushButtonState(Notification.permission === 'denied' ? 'blocked' : subscription ? 'enabled' : 'off');
        setPushModalMode();
        if (Notification.permission === 'granted' && subscription) return true;
        if (!willAutoRequestPermission()) pushPermissionModal?.classList.remove('hide');
        return false;
    } catch (error) {
        console.warn('Không thể khởi tạo Web Push:', error);
        pushPermissionModal?.classList.remove('hide');
        return false;
    }
}


async function enablePushNotifications() {
    // Nhúng trong iframe: nhờ trang cha xin quyền (đúng origin của quyền).
    if (inIframe) { postToParent({ type: 'pastie-enable-notifications' }); return true; }
    const supportIssue = getPushSupportIssue();
    if (supportIssue === 'ios-home-screen') {
        setPushModalMode(supportIssue);
        pushPermissionModal?.classList.remove('hide');
        throw new Error('Trên iPhone/iPad cần thêm Pastie Console vào Màn hình chính trước khi bật được thông báo.');
    }
    if (supportIssue) throw new Error('Phiên bản trình duyệt này chưa hỗ trợ thông báo đẩy.');
    // Phải xin quyền trước bất kỳ await nào: mobile chỉ cho phép trong hành động chạm trực tiếp.
    let permission = Notification.permission;
    if (permission === 'default') permission = await withPushTimeout(Notification.requestPermission(), 'Trình duyệt chưa hiển thị hộp thoại cấp quyền', 12000);
    if (permission !== 'granted') {
        setPushButtonState(permission === 'denied' ? 'blocked' : 'off');
        throw new Error(permission === 'denied'
            ? 'Thông báo đang bị chặn. Hãy mở cài đặt trang web trên trình duyệt và chọn Cho phép.'
            : 'Bạn chưa cho phép thông báo. Có thể bật lại bất kỳ lúc nào trong Cài đặt.');
    }
    if (!pushRegistration) await setupPushNotifications();
    if (!pushRegistration) throw new Error('Không thể khởi tạo thông báo đẩy trên thiết bị này.');
    const configResponse = await withPushTimeout(authFetch(`${API_BASE}/api/admin/push/public-key`), 'Không thể lấy cấu hình Push');
    const config = await withPushTimeout(configResponse.json(), 'Không thể đọc cấu hình Push');
    if (!configResponse.ok || !config.enabled || !config.publicKey) { setPushButtonState('unavailable'); throw new Error('Push chưa được cấu hình trên máy chủ.'); }
    await syncPushSubscription(config);
    setPushButtonState('enabled');
    return true;
}


// Xin quyền thông báo ngay khi mở dashboard, không bắt người dùng đi tìm nút.
//
// Ràng buộc của trình duyệt: Chrome/Edge/Firefox trên máy tính cho gọi
// Notification.requestPermission() không cần thao tác chạm; Safari (macOS và iOS)
// thì BẮT BUỘC phải có cử chỉ người dùng và sẽ từ chối lời gọi tự động.
// Vì vậy: thử tự động trước, thất bại thì rơi về hộp thoại có nút — bấm nút
// chính là cử chỉ mà Safari đòi hỏi. Không có đường nào bỏ hẳn được nút đó.
async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (inIframe) return;                       // trong iframe thì trang cha xin quyền
    if (Notification.permission !== 'default') return;  // đã cho phép hoặc đã chặn
    if (getPushSupportIssue()) return;           // iOS chưa thêm vào Màn hình chính…

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            // Bị từ chối hoặc bỏ qua: cập nhật nút, đừng làm phiền thêm.
            setPushButtonState(permission === 'denied' ? 'blocked' : 'off');
            return;
        }
        await enablePushNotifications();
        closePushPermissionModal();
    } catch (error) {
        // Safari ném lỗi khi gọi mà không có cử chỉ người dùng — đây là đường đi
        // bình thường trên iPhone, không phải sự cố, nên chỉ ghi log.
        console.info('Không xin được quyền thông báo tự động, chờ người dùng bấm nút:', error?.message || error);
    }
}


function showNewMessageNotification(session, unread) {
    if (document.visibilityState === 'visible' && session.id === currentSessionId) return;

    const name = session.visitor_name || 'Khách hàng';
    const preview = session.last_message_preview
        ? session.last_message_preview.substring(0, 80)
        : `${unread} tin nhắn mới`;

    // Nhúng trong iframe: nhờ trang cha hiển thị thông báo (iframe không được new Notification).
    if (inIframe) {
        postToParent({ type: 'pastie-notify', title: `💬 ${name}`, body: preview, tag: `pastie-chat-${session.id}` });
        playAlertSound();
        return;
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const n = new Notification(`💬 ${name}`, {
        body: preview,
        icon: '/icon-192.png',
        tag: `pastie-chat-${session.id}`,
        renotify: true,
        silent: false,
    });

    n.onclick = () => {
        window.focus();
        selectSession(session.id);
        n.close();
    };

    playAlertSound();
}


function updateAppBadge(totalUnread) {
    const nav = window.navigator || navigator;
    if (nav && 'setAppBadge' in nav) {
        if (typeof totalUnread === 'number' && totalUnread > 0) {
            nav.setAppBadge(totalUnread).catch(() => {});
        } else if ('clearAppBadge' in nav) {
            nav.clearAppBadge().catch(() => {});
        }
    }
}


function recalculateAppBadge() {
    if (!Array.isArray(sessionsList) || sessionsList.length === 0) {
        updateAppBadge(0);
        return;
    }
    const unreadCount = sessionsList.filter(s => {
        const seen = seenMessageCount[s.id];
        const total = parseInt(s.message_count) || 0;
        const unread = (seen === -1 || seen === undefined) ? Math.max(0, total - 1) : Math.max(0, total - seen);
        return unread > 0;
    }).length;
    updateAppBadge(unreadCount);
}


// Âm thanh báo tin mới. Ưu tiên file tuỳ chỉnh public/sounds/notify.(mp3|wav);
// nếu không có/không phát được thì fallback về beep tổng hợp. Có thể đổi qua localStorage 'notify_sound_url'.
function beepFallback() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch {}
}

function playAlertSound() {
    // Chống phát âm chồng chéo khi nhiều tin nhắn đến liên tiếp (debounce 800ms)
    if (playAlertSound._last && Date.now() - playAlertSound._last < 800) return;
    playAlertSound._last = Date.now();

    const url = localStorage.getItem('notify_sound_url') || '/sounds/notify.wav';
    try {
        const a = new Audio(url);
        a.volume = 0.6;
        a.play().catch(() => {
            // Fallback: thử mp3 nếu wav thất bại
            if (url.endsWith('.wav')) {
                const mp3 = new Audio(url.replace('.wav', '.mp3'));
                mp3.volume = 0.6;
                mp3.play().catch(() => beepFallback());
            } else {
                beepFallback();
            }
        });
    } catch { beepFallback(); }
}


function handleAdminRealtimeEvent(data) {
    if (!data || !data.type) return;

    // Khách đổi ngôn ngữ: cập nhật ngay ngôn ngữ dùng cho phản hồi của Sale,
    // không chờ fetchSessions hoàn tất hoặc đợi tới tin nhắn tiếp theo.
    if (data.type === 'session_update' && data.detectedLanguage && data.sessionId) {
        const changedSession = sessionsList.find(session => String(session.id) === String(data.sessionId));
        if (changedSession) changedSession.detected_language = data.detectedLanguage;
        if (currentSessionId && String(data.sessionId) === String(currentSessionId)) {
            currentDetectedLang = data.detectedLanguage;
            const detailLangSelect = document.getElementById('detail-lang-select');
            if (detailLangSelect) detailLangSelect.value = data.detectedLanguage;
        }
    }

    // 1. Cập nhật danh sách phiên chat ở sidebar khi có tin nhắn mới / cập nhật
    if (['new_message', 'session_update', 'order_update', 'reload_sessions'].includes(data.type)) {
        // Debounce 1,5 giây, KHÔNG phải 150ms.
        //
        // fetchSessions() gọi /api/admin/chats — truy vấn nặng nhất hệ thống
        // (6 subquery tương quan lên bảng messages cho mỗi phiên). Server phát
        // sự kiện này cho MỌI admin cùng dự án, nên với 50 agent online thì một
        // tin nhắn của khách = 50 lần chạy truy vấn đó. Ở 150ms, các sự kiện
        // liên tiếp gần như không gộp được với nhau.
        //
        // 1,5 giây vẫn cảm giác tức thì với người dùng (âm thanh và huy hiệu
        // chưa đọc đã được xử lý riêng ngay bên dưới, không đợi fetch).
        clearTimeout(realtimeRefreshTimer);
        realtimeRefreshTimer = setTimeout(() => {
            fetchSessions();
        }, 1500);
    }

    // 1b. Phát âm thanh NGAY khi nhận tin từ khách — không chờ fetchSessions trả về.
    // fetchSessions vẫn gọi showNewMessageNotification (hiện browser Notification + âm thanh)
    // nhưng phải đợi API: trên mạng chậm có thể mất vài giây. Phát âm ngay ở đây
    // đảm bảo Sale/Agent nghe thấy tín hiệu tức thì.
    if (data.type === 'new_message' && data.sender === 'visitor') {
        // Chỉ phát âm khi: (a) cuộc chat khác đang mở, hoặc (b) tab đang ẩn
        const isViewingThisChat = document.visibilityState === 'visible' && String(data.sessionId) === String(currentSessionId);
        if (!isViewingThisChat) {
            playAlertSound();
        }
    }

    // 1c. Phát âm thanh khi có đơn mới hoặc đơn cập nhật chờ xác nhận
    if (data.type === 'order_update' && data.status === 'pending_confirm') {
        const isViewingThisChat = document.visibilityState === 'visible' && String(data.sessionId) === String(currentSessionId);
        if (!isViewingThisChat) {
            playAlertSound();
        }
    }

    // 2. Cập nhật nội dung phiên chat đang mở (nếu trùng sessionId)
    if (currentSessionId && String(data.sessionId) === String(currentSessionId)) {
        if (data.type === 'new_message' || data.type === 'session_update') {
            loadMessages(currentSessionId);
            // Đang mở xem phiên chat thì tự động báo đã đọc tin mới từ khách
            if (data.sender === 'visitor' && document.visibilityState === 'visible') {
                authFetch(`${API_BASE}/api/admin/chats/${currentSessionId}/read`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lastSeenMessageId: data.messageId })
                }).catch(() => {});
            }
            if (data.summary && detailSummary) {
                detailSummary.textContent = data.summary;
                detailSummary.style.color = 'var(--text-primary)';
                detailSummary.style.fontStyle = 'normal';
            }
            if (data.tags) {
                renderTags(data.tags);
            }
        }
        if (data.type === 'message_status_update') {
            handleMessageStatusUpdate(data);
        }
        if (data.type === 'messages_seen') {
            handleMessagesSeen(data);
        }
        if (data.type === 'typing_status' || data.type === 'visitor_typing') {
            handleVisitorTypingRealtime(data);
        }
        if (data.type === 'order_update') {
            adminOrderSignature = '';
            loadBillsForAdmin(currentSessionId);
            loadMessages(currentSessionId);
        }
    }

    // 3. Tin nhắn nội bộ real-time
    if (data.type === 'internal_message') {
        const { sessionId, message } = data;
        if (sessionId && message) {
            let chat = internalChats.find(c => c.sessionId === sessionId);
            if (chat) {
                chat.lastMessage = message.original_text;
                chat.lastMessageTime = message.created_at;
            }

            if (currentSessionId === sessionId) {
                const exists = adminMessages.some(m => m.id === message.id || (m.id && String(m.id).startsWith('temp_') && m.original_text === message.original_text));
                if (!exists) {
                    adminMessages.push(message);
                    renderAdminMessages(false, true);
                }
                authFetch(`${API_BASE}/api/admin/chats/${sessionId}/read`, { method: 'POST' }).catch(() => {});
            } else {
                if (chat && Number(message.sender_admin_id) !== Number(CURRENT_ADMIN?.id)) {
                    chat.unreadCount = (chat.unreadCount || 0) + 1;
                    playAlertSound();
                }
            }

            renderInternalBadge();
            if (currentCategoryTab === 'internal') {
                renderInternalSessionsList();
            } else if (CURRENT_ADMIN && CURRENT_ADMIN.role === 'sale') {
                renderSessionsList(sessionsList);
            }
        }
        return;
    }
}

function handleMessageStatusUpdate(data) {
    if (!data || String(data.sessionId) !== String(currentSessionId)) return;
    const { status, messageIds } = data;
    if (!messageIds || !Array.isArray(messageIds)) return;
    const idSet = new Set(messageIds.map(Number));
    for (const msg of adminMessages) {
        if (idSet.has(Number(msg.id))) {
            msg.status = status;
            if (status === 'delivered') msg.delivered_at = data.deliveredAt || new Date().toISOString();
            if (status === 'seen') msg.seen_at = data.seenAt || new Date().toISOString();
        }
    }
function getMsgStatusInfo(status, seenTime) {
    const dict = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[typeof currentLang !== 'undefined' ? currentLang : 'vi']) || (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS.vi) || {};
    if (status === 'seen') {
        const label = dict.msgStatusSeen || 'Đã xem';
        const title = seenTime ? (dict.msgStatusSeenAt ? dict.msgStatusSeenAt.replace('{t}', seenTime) : `Đã xem lúc ${seenTime}`) : label;
        return { label, title, icon: 'ri-check-double-line' };
    }
    if (status === 'delivered') {
        const label = dict.msgStatusDelivered || 'Đã nhận';
        return { label, title: label, icon: 'ri-check-double-line' };
    }
    const label = dict.msgStatusSent || 'Đã gửi';
    return { label, title: label, icon: 'ri-check-line' };
}

    messageIds.forEach(id => {
        const el = chatMessagesContainer.querySelector(`.msg-status[data-msg-id="${id}"]`);
        if (el) {
            el.className = `msg-status is-${status}`;
            const seenTime = (status === 'seen' && data.seenAt) ? new Date(data.seenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const info = getMsgStatusInfo(status, seenTime);
            el.title = info.title;
            el.innerHTML = `<i class="${info.icon}"></i> <small class="status-label">${escapeHtml(info.label)}</small>`;
        }
    });
}

function handleMessagesSeen(data) {
    if (!data || String(data.sessionId) !== String(currentSessionId)) return;
    const lastId = Number(data.lastSeenMessageId) || 0;
    const seenAt = data.seenAt || new Date().toISOString();
    const seenTime = new Date(seenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const info = getMsgStatusInfo('seen', seenTime);
    for (const msg of adminMessages) {
        if ((msg.sender === 'agent' || msg.sender === 'ai') && (lastId === 0 || Number(msg.id) <= lastId)) {
            msg.status = 'seen';
            msg.seen_at = seenAt;
        }
    }
    chatMessagesContainer.querySelectorAll('.msg-status').forEach(el => {
        const rawId = el.getAttribute('data-msg-id');
        const id = Number(rawId);
        if (!isNaN(id) && (lastId === 0 || id <= lastId)) {
            el.className = 'msg-status is-seen';
            el.title = info.title;
            el.innerHTML = `<i class="${info.icon}"></i> <small class="status-label">${escapeHtml(info.label)}</small>`;
        }
    });
}

function renderMsgStatusHtml(msg) {
    if (!msg || (msg.sender !== 'agent' && msg.sender !== 'ai')) return '';
    const status = msg.status || 'sent';
    const seenTimeStr = msg.seen_at ? new Date(msg.seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const info = getMsgStatusInfo(status, seenTimeStr);
    return `<span class="msg-status is-${status}" title="${escapeHtml(info.title)}" data-msg-id="${msg.id}"><i class="${info.icon}"></i> <small class="status-label">${escapeHtml(info.label)}</small></span>`;
}

// ── Typing Indicator (Real-time Agent & Visitor Typing) ─────────────────
let visitorTypingHideTimer = null;

function handleVisitorTypingRealtime(data) {
    if (!data || !currentSessionId || String(data.sessionId) !== String(currentSessionId)) return;
    if (data.sender !== 'visitor') return;
    renderVisitorTypingIndicator(!!data.isTyping);
}

function renderVisitorTypingIndicator(/* isTyping */) {
    // Typing indicators disabled per design decision.
    const bar = document.getElementById('visitor-typing-indicator-bar');
    const legacy = document.getElementById('visitor-typing-bubble');
    if (bar) bar.classList.add('hide');
    if (legacy) legacy.remove();
    if (visitorTypingHideTimer) {
        clearTimeout(visitorTypingHideTimer);
        visitorTypingHideTimer = null;
    }
}

let agentTypingPingTimer = null;
let agentTypingSilenceTimer = null;
let isAgentCurrentlyTyping = false;

function sendAgentTypingPing(isTyping) {
    if (!currentSessionId) return;
    const token = getToken();
    if (!token) return;
    authFetch(`${API_BASE}/api/admin/chats/${currentSessionId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping })
    }).catch(() => {});
}

function handleAgentChatInputTyping() {
    if (!currentSessionId) return;
    const text = chatInput?.value?.trim() || '';
    if (!text) {
        if (isAgentCurrentlyTyping) {
            isAgentCurrentlyTyping = false;
            sendAgentTypingPing(false);
        }
        if (agentTypingPingTimer) {
            clearInterval(agentTypingPingTimer);
            agentTypingPingTimer = null;
        }
        if (agentTypingSilenceTimer) {
            clearTimeout(agentTypingSilenceTimer);
            agentTypingSilenceTimer = null;
        }
        return;
    }

    if (!isAgentCurrentlyTyping) {
        isAgentCurrentlyTyping = true;
        sendAgentTypingPing(true);
        if (!agentTypingPingTimer) {
            agentTypingPingTimer = setInterval(() => {
                if (isAgentCurrentlyTyping && currentSessionId && chatInput?.value?.trim()) {
                    sendAgentTypingPing(true);
                } else {
                    clearInterval(agentTypingPingTimer);
                    agentTypingPingTimer = null;
                }
            }, 1500);
        }
    }

    if (agentTypingSilenceTimer) clearTimeout(agentTypingSilenceTimer);
    agentTypingSilenceTimer = setTimeout(() => {
        if (isAgentCurrentlyTyping) {
            isAgentCurrentlyTyping = false;
            sendAgentTypingPing(false);
            if (agentTypingPingTimer) {
                clearInterval(agentTypingPingTimer);
                agentTypingPingTimer = null;
            }
        }
    }, 1800);
}

function stopAgentTyping() {
    if (isAgentCurrentlyTyping) {
        isAgentCurrentlyTyping = false;
        sendAgentTypingPing(false);
    }
    if (agentTypingPingTimer) {
        clearInterval(agentTypingPingTimer);
        agentTypingPingTimer = null;
    }
    if (agentTypingSilenceTimer) {
        clearTimeout(agentTypingSilenceTimer);
        agentTypingSilenceTimer = null;
    }
}
window.handleAgentChatInputTyping = handleAgentChatInputTyping;
window.stopAgentTyping = stopAgentTyping;

let adminVisitorTypingPollTimer = null;
function pollVisitorTyping(sessionId) {
    if (!sessionId || sessionId !== currentSessionId) return;
    authFetch(`${API_BASE}/api/admin/chats/${sessionId}/typing`)
        .then(r => r.json())
        .then(data => {
            if (sessionId === currentSessionId && data && data.typing) {
                renderVisitorTypingIndicator(!!data.typing.isTyping);
            }
        })
        .catch(() => {});
}

function bindAgentChatInputEvents() {
    const input = document.getElementById('chat-input');
    if (!input || input.dataset.typingBound === 'true') return;
    input.dataset.typingBound = 'true';
    input.addEventListener('input', () => {
        if (typeof resizeAgentChatInput === 'function') resizeAgentChatInput();
        handleAgentChatInputTyping();
    });
    input.addEventListener('blur', stopAgentTyping);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('chat-form')?.requestSubmit();
        }
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAgentChatInputEvents);
} else {
    bindAgentChatInputEvents();
}
window.bindAgentChatInputEvents = bindAgentChatInputEvents;


function connectAdminEvents() {
    if (adminEventSource) {
        adminEventSource.close();
        adminEventSource = null;
    }
    clearTimeout(adminEventReconnectTimer);

    const token = getToken();
    if (!token) return;

    try {
        adminEventSource = new EventSource(`${API_BASE}/api/admin/events?token=${encodeURIComponent(token)}`);
        
        adminEventSource.onopen = () => {
            console.log('[Realtime] SSE stream connected.');
        };

        adminEventSource.onmessage = (event) => {
            try {
                if (!event.data) return;
                const data = JSON.parse(event.data);
                handleAdminRealtimeEvent(data);
            } catch (e) {}
        };

        adminEventSource.addEventListener('session_revoked', (event) => {
            try {
                const data = JSON.parse(event.data || '{}');
                if (!data.adminId || (CURRENT_ADMIN && Number(data.adminId) === Number(CURRENT_ADMIN.id))) {
                    handleSessionRevoked('new_login');
                }
            } catch (e) {
                handleSessionRevoked('new_login');
            }
        });

        adminEventSource.addEventListener('new_message', (event) => {
            try {
                const data = JSON.parse(event.data || '{}');
                handleAdminRealtimeEvent({ type: 'new_message', ...data });
            } catch (e) {}
        });

        adminEventSource.addEventListener('internal_message', (event) => {
            try {
                const data = JSON.parse(event.data || '{}');
                handleAdminRealtimeEvent({ type: 'internal_message', ...data });
            } catch (e) {}
        });

        adminEventSource.addEventListener('message_status_update', (event) => {
            try {
                const data = JSON.parse(event.data || '{}');
                handleAdminRealtimeEvent({ type: 'message_status_update', ...data });
            } catch (e) {}
        });

        adminEventSource.addEventListener('messages_seen', (event) => {
            try {
                const data = JSON.parse(event.data || '{}');
                handleAdminRealtimeEvent({ type: 'messages_seen', ...data });
            } catch (e) {}
        });

        adminEventSource.addEventListener('session_update', (event) => {
            try {
                const data = JSON.parse(event.data || '{}');
                handleAdminRealtimeEvent({ type: 'session_update', ...data });
            } catch (e) {}
        });

        adminEventSource.addEventListener('order_update', (event) => {
            try {
                const data = JSON.parse(event.data || '{}');
                handleAdminRealtimeEvent({ type: 'order_update', ...data });
            } catch (e) {}
        });

        adminEventSource.addEventListener('typing_status', (event) => {
            try {
                const data = JSON.parse(event.data || '{}');
                handleAdminRealtimeEvent({ type: 'typing_status', ...data });
            } catch (e) {}
        });

        adminEventSource.onerror = () => {
            if (adminEventSource) {
                adminEventSource.close();
                adminEventSource = null;
            }
            clearTimeout(adminEventReconnectTimer);
            adminEventReconnectTimer = setTimeout(() => {
                if (getToken()) connectAdminEvents();
            }, 5000);
        };
    } catch (err) {
        console.warn('[Realtime] Cannot connect SSE:', err);
    }
}


async function fetchSessions() {
    const requestGeneration = adminAuthGeneration;
    initSessionCategoryTabs();
    fetchInternalChats().catch(() => {});
    try {
        const response = await authFetch(`${API_BASE}/api/admin/chats?_=${Date.now()}`);
        if (requestGeneration !== adminAuthGeneration) return;
        if (response.status === 401) {
            showLogin();
            return;
        }

        const data = await response.json();
        if (requestGeneration !== adminAuthGeneration) return;
        sessionsList = data;

        // A previous account/project may have had this chat selected. If it is
        // not visible to the current account, clear every part of the panel.
        if (currentSessionId && !String(currentSessionId).startsWith('internal_') && !data.some(s => s.id === currentSessionId)) {
            resetActiveChatUI();
        }

        // Sync seen counts from DB + trigger notifications for new messages
        let totalUnreadSessions = 0;
        data.forEach(s => {
            const dbSeen = parseInt(s.seen_message_count);
            if (dbSeen >= 0) seenMessageCount[s.id] = dbSeen;
            else if (!(s.id in seenMessageCount)) seenMessageCount[s.id] = -1;

            const totalMsgs = parseInt(s.message_count) || 0;
            const seen = seenMessageCount[s.id];
            const unread = (seen === -1 || seen === undefined) ? totalMsgs - 1 : Math.max(0, totalMsgs - seen);
            if (unread > 0) totalUnreadSessions++;

            // Notify if new messages arrived since last notification check
            const lastNotified = notifiedMsgCount[s.id] ?? totalMsgs; // init = current, no spam on first load
            // CHỈ thông báo khi tin mới nhất là của KHÁCH (visitor) — bỏ qua tin AI/hệ thống/nhân viên.
            // Cho phép thông báo cả khi đang xem cuộc chat đó nhưng tab bị ẩn (minimize/chuyển tab):
            // showNewMessageNotification đã kiểm tra visibilityState + currentSessionId.
            if (totalMsgs > lastNotified && s.last_message_sender === 'visitor') {
                if (unread > 0) showNewMessageNotification(s, unread);
            }
            notifiedMsgCount[s.id] = totalMsgs;
        });
        updateAppBadge(totalUnreadSessions);

        // Real-time synchronization of the visitor's selected language in the dropdown
        if (currentSessionId) {
            const currentActiveSession = data.find(s => s.id === currentSessionId);
            if (currentActiveSession) {
                currentDetectedLang = currentActiveSession.detected_language || 'unknown';
                const detailLangSelect = document.getElementById('detail-lang-select');
                if (detailLangSelect && detailLangSelect.value !== currentDetectedLang) {
                    detailLangSelect.value = currentDetectedLang;
                }
            }
        }

        updateProjectFilterDropdown(data);
        renderSessionsList(data);
        const notificationSessionId = new URLSearchParams(window.location.search).get('session');
        if (notificationSessionId && data.some(s => s.id === notificationSessionId) && notificationSessionId !== currentSessionId) {
            window.history.replaceState({}, '', window.location.pathname);
            selectSession(notificationSessionId);
        }
    } catch (e) {
        console.error('Error fetching sessions:', e);
    }
}


function renderSessionsList(sessions) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    // Filter sessions by selected project
    const byProject = currentProjectFilter
        ? sessions.filter(s => s.project_id === currentProjectFilter)
        : sessions;

    // Số đếm tính trên phạm vi dự án đang chọn, để con số khớp với thứ đang thấy.
    const activeCount = byProject.filter(s => s.status !== 'closed').length;
    const closedCount = byProject.length - activeCount;
    const setCount = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setCount('ssf-count-all', byProject.length);
    setCount('ssf-count-active', activeCount);
    setCount('ssf-count-closed', closedCount);

    const filtered = currentStatusFilter === 'active'
        ? byProject.filter(s => s.status !== 'closed')
        : currentStatusFilter === 'closed'
        ? byProject.filter(s => s.status === 'closed')
        : byProject;

    sessionsListContainer.innerHTML = '';

    if (filtered.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.setAttribute('data-i18n', 'emptyConversations');
        emptyDiv.textContent = dict.emptyConversations;
        sessionsListContainer.appendChild(emptyDiv);
        return;
    }

    // Grouping logic by visitor_email
    const emailGroups = new Map(); // key: email (lowercase) -> { email, name, sessions: [] }
    const orderedGroupKeys = [];
    const anonymousSessions = [];

    filtered.forEach(session => {
        const email = session.visitor_email?.trim();
        if (email) {
            const key = email.toLowerCase();
            if (!emailGroups.has(key)) {
                emailGroups.set(key, {
                    email: session.visitor_email,
                    name: session.visitor_name || 'Khách hàng',
                    sessions: []
                });
                orderedGroupKeys.push(key);
            }
            emailGroups.get(key).sessions.push(session);
        } else {
            anonymousSessions.push(session);
        }
    });

    // Helper to generate a clean session card
    function createSessionCard(session) {
        const card = document.createElement('div');
        // Chưa đọc = số tin ĐẾN TỪ KHÁCH (visitor) chưa xem, KHÔNG tính tin AI/nhân viên/hệ thống.
        const unreadVisitor = session.id === currentSessionId ? 0 : (parseInt(session.unread_visitor) || 0);
        const hasUnread = unreadVisitor > 0;
        card.className = `session-card ${session.id === currentSessionId ? 'active-selected' : ''} ${hasUnread ? 'has-unread' : ''}`;
        card.setAttribute('data-id', session.id);
        
        const locale = currentLang === 'vi' ? 'vi-VN' : currentLang === 'zh' ? 'zh-CN' : currentLang === 'ru' ? 'ru-RU' : 'en-US';
        const msgTime = session.last_message_at || session.created_at;
        const dateStr = new Date(msgTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
            + ' ' + new Date(msgTime).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

        const statusText = session.status === 'active' ? dict.statusActive : dict.statusClosed;

        const unread = unreadVisitor;
        const unreadBadge = unread > 0 ? `<span class="session-unread-badge">${unread > 99 ? '99+' : unread}</span>` : '';

        const rawPreview = session.last_message_preview && session.latest_order_id && session.latest_order_code
            ? session.last_message_preview.split(session.latest_order_id).join(session.latest_order_code)
            : session.last_message_preview;
        // Phiên mà khách chưa nói gì: máy chủ không trả tin cuối nào (câu chào
        // không tính). Để trống là Sale tưởng danh sách lỗi — nói thẳng ra là
        // khách chưa nhắn, vì đó chính là việc cần biết để chủ động hỏi trước.
        const preview = rawPreview
            ? rawPreview.substring(0, 45) + (rawPreview.length > 45 ? '…' : '')
            : 'Khách chưa nhắn gì';

        const isMC = session.platform && session.platform !== 'widget';

        const avatarHtml = session.visitor_avatar
            ? `<img src="${escapeHtml(session.visitor_avatar)}" class="visitor-avatar-img" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
              + `<div class="visitor-avatar-initials" style="display:none">${escapeHtml((session.visitor_name || '?')[0].toUpperCase())}</div>`
            : `<div class="visitor-avatar-initials">${escapeHtml((session.visitor_name || '?')[0].toUpperCase())}</div>`;

        const platformMeta = {
            messenger:            { icon: 'ri-messenger-fill',  label: 'Messenger', color: '#4267B2' },
            instagram:            { icon: 'ri-instagram-fill',  label: 'Instagram', color: '#C13584' },
            whatsapp:             { icon: 'ri-whatsapp-fill',   label: 'WhatsApp',  color: '#25D366' },
            'manychat-facebook':  { icon: 'ri-messenger-fill',  label: 'Messenger', color: '#4267B2' },
            'manychat-instagram': { icon: 'ri-instagram-fill',  label: 'Instagram', color: '#C13584' },
            'manychat-whatsapp':  { icon: 'ri-whatsapp-fill',   label: 'WhatsApp',  color: '#25D366' },
            // Pancake platforms
            facebook:             { icon: 'ri-messenger-fill',  label: 'Facebook',  color: '#4267B2' },
            zalo:                 { icon: 'ri-chat-3-fill',     label: 'Zalo',      color: '#0068FF' },
            tiktok:               { icon: 'ri-tiktok-fill',     label: 'TikTok',    color: '#010101' },
            pancake:              { icon: 'ri-chat-smile-2-fill', label: 'Pancake', color: '#FF6B35' },
        };
        const pm = platformMeta[session.platform] || null;

        const avatarBadge = pm
            ? `<i class="${pm.icon} visitor-platform-badge" style="color:${pm.color}"></i>`
            : '';

        let metaFooterRight = '';
        if (isMC && pm) {
            metaFooterRight = `<span class="session-platform-tag" style="color:${pm.color};background:${pm.color}22;border:1px solid ${pm.color}44;">
                <i class="${pm.icon}"></i> ${pm.label}
            </span>`;
        } else {
            const browserVal = session.browser || 'Chrome';
            const deviceVal  = session.device  || 'Desktop';
            metaFooterRight = `<span class="session-client-meta">
                <i class="${getBrowserIcon(browserVal)}" title="Trình duyệt: ${browserVal}"></i>
                <i class="${getDeviceIcon(deviceVal)}" title="Thiết bị: ${deviceVal}"></i>
            </span>`;
        }

        card.innerHTML = `
            <div class="session-card-header">
                <div class="visitor-avatar-wrap">${avatarHtml}${avatarBadge}</div>
                <div class="session-card-info">
                    <div class="session-card-top-row">
                        <span class="session-name" title="${escapeHtml(session.visitor_name || '')}">${escapeHtml(session.visitor_name || 'Khách hàng')}</span>
                        <span class="session-card-time">${dateStr}</span>
                    </div>
                    <div class="session-card-bottom-row">
                        <span class="session-status-badge ${session.status}">${statusText}</span>
                        ${unreadBadge}
                    </div>
                </div>
            </div>
            <div class="session-card-preview${rawPreview ? '' : ' is-empty'}">${escapeHtml(preview)}</div>
            <div class="session-meta-footer">
                ${
                    (session.group_name || session.qr_label)
                        ? `<span class="session-group-tag" style="background:rgba(236,72,153,0.12);color:#ec4899;border:1px solid rgba(236,72,153,0.25);font-size:10.5px;padding:2px 7px;border-radius:10px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ri-team-line"></i> ${escapeHtml(session.group_name && session.qr_label ? `${session.group_name} · ${session.qr_label}` : (session.group_name || session.qr_label))}</span>`
                        : ''
                }
                ${
                    // Agent/Sale của dự án QR chỉ làm việc trong đúng một dự án, nên
                    // in mã dự án lên từng thẻ hội thoại là thừa — mà lại là mã kỹ
                    // thuật ("qr-concierge") chứ không phải tên người dùng hiểu.
                    // Superadmin và các dự án khác vẫn cần vì họ xem nhiều dự án.
                    isRestrictedConsole() && isQrConciergeProject(session.project_id)
                        ? ''
                        : `<span class="session-project" title="${escapeHtml(session.project_id)}">${escapeHtml(session.project_id)}</span>`
                }
                ${metaFooterRight}
            </div>
        `;

        card.addEventListener('click', () => selectSession(session.id));
        return card;
    }

    // Blend anonymous and email groups chronologically based on their newest session's created_at
    const renderBlocks = [];

    orderedGroupKeys.forEach(key => {
        const group = emailGroups.get(key);
        const newestSession = group.sessions[0];
        renderBlocks.push({
            type: 'group',
            timestamp: new Date(newestSession.created_at).getTime(),
            data: group
        });
    });

    anonymousSessions.forEach(session => {
        renderBlocks.push({
            type: 'anonymous',
            timestamp: new Date(session.created_at).getTime(),
            data: session
        });
    });

    // Sort blocks (newest first)
    renderBlocks.sort((a, b) => b.timestamp - a.timestamp);

    // Append to container
    renderBlocks.forEach(block => {
        if (block.type === 'anonymous') {
            const card = createSessionCard(block.data);
            sessionsListContainer.appendChild(card);
        } else {
            const group = block.data;

            const groupContainer = document.createElement('div');
            groupContainer.className = 'session-group';

            const groupHeader = document.createElement('div');
            groupHeader.className = 'session-group-header';

            const countText = currentLang === 'vi' ? 'thiết bị' : currentLang === 'zh' ? '设备' : currentLang === 'ru' ? 'устройств' : 'devices';

            groupHeader.innerHTML = `
                <i class="ri-user-line"></i>
                <span class="group-email" title="${escapeHtml(group.email || '')}">${escapeHtml(group.email || '')}</span>
                <span class="group-count-badge">${group.sessions.length} ${countText}</span>
            `;

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'session-group-items';

            group.sessions.forEach(session => {
                const card = createSessionCard(session);
                itemsContainer.appendChild(card);
            });

            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(itemsContainer);
            sessionsListContainer.appendChild(groupContainer);
        }
    });
}


// ----------------------------------------------------
// CHAT SESSION DETAILS & MESSAGES
// ----------------------------------------------------

// =====================================================================
// GIAO DIỆN THEO QUYỀN của cuộc trò chuyện: ô nhập, nút gửi, nút "Tiếp nhận",
// ô phân công. Tách riêng để "Tiếp nhận" / "Phân công" cập nhật được ngay
// mà KHÔNG phải gọi selectSession() — vốn xoá trắng khung chat rồi tải lại
// toàn bộ tin nhắn, làm mất vị trí cuộn và nội dung đang soạn dở.
// =====================================================================
function isQrChatOwnedByCurrentAgent(session) {
    return isRestrictedConsole() && isQrConciergeProject(session?.project_id);
}


function applyDetailsPanelMode(session) {
    const isQrAgentChat = isQrChatOwnedByCurrentAgent(session);
    document.getElementById('detail-channel-card')?.classList.toggle('hide', isQrAgentChat);
    document.getElementById('detail-project-card')?.classList.toggle('hide', isQrAgentChat);

    const languageLabel = document.getElementById('detail-language-label');
    if (languageLabel) {
        const translationKey = isQrAgentChat ? 'languageLabel' : 'detectedLangLabel';
        languageLabel.dataset.i18n = translationKey;
        languageLabel.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.vi)[translationKey];
    }
}


function applyChatPermissionUI(session) {
    if (!session) return;
    if (session.platform === 'internal' || (session.id && String(session.id).startsWith('internal_'))) {
        const supervisorBar = document.getElementById('chat-supervisor-bar');
        if (supervisorBar) supervisorBar.style.display = 'none';
        document.getElementById('claim-chat-btn')?.classList.add('hide');
        document.getElementById('close-session-btn')?.classList.add('hide');
        document.getElementById('handover-session-btn')?.classList.add('hide');
        document.getElementById('assignee-selector-container')?.classList.add('hide');
        document.getElementById('shift-draining-banner')?.classList.add('hide');
        document.getElementById('delete-session-btn')?.classList.add('hide');

        chatInputContainer?.classList.remove('hide');
        chatForm?.classList.remove('hide');
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.disabled = false;
            chatInput.classList.remove('is-supervisor-mode');
            chatInput.placeholder = 'Nhập tin nhắn nội bộ...';
        }
        const sendBtn = chatForm?.querySelector('button[type="submit"]');
        if (sendBtn) sendBtn.disabled = false;
        return;
    }
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    const isSuper = CURRENT_ADMIN && CURRENT_ADMIN.role === 'superadmin';
    const isAgent = CURRENT_ADMIN && CURRENT_ADMIN.role === 'agent';
    const isSale = CURRENT_ADMIN && CURRENT_ADMIN.role === 'sale';
    const isClosed = session.status === 'closed';
    const isClaimedByMe = session.claimed_by_admin_id && CURRENT_ADMIN && Number(session.claimed_by_admin_id) === Number(CURRENT_ADMIN.id);

    const claimChatBtn = document.getElementById('claim-chat-btn');
    const closeBtn = document.getElementById('close-session-btn');
    const handoverBtn = document.getElementById('handover-session-btn');
    const drainingBanner = document.getElementById('shift-draining-banner');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.querySelector('#chat-form button[type="submit"]');
    const attachBtn = document.getElementById('chat-attach-btn');
    const micBtn = document.getElementById('chat-mic-btn');

    // Chế độ giám sát cho Agent quản lý
    let supervisorBar = document.getElementById('chat-supervisor-bar');
    if (isAgent && !isSuper) {
        if (!supervisorBar) {
            supervisorBar = document.createElement('div');
            supervisorBar.id = 'chat-supervisor-bar';
            supervisorBar.className = 'chat-supervisor-bar';
            supervisorBar.innerHTML = '<i class="ri-eye-line"></i> <span><strong>Chế độ Giám sát:</strong> Bạn đang theo dõi cuộc trò chuyện của Sale (Chỉ xem, không gửi tin nhắn).</span>';
            chatInputContainer?.insertBefore(supervisorBar, chatForm);
        } else {
            supervisorBar.style.display = 'flex';
        }
    } else if (supervisorBar) {
        supervisorBar.style.display = 'none';
    }

    const isQrProject = isRestrictedConsole() || isQrConciergeProject(session?.project_id);

    // 1. Nút "Tiếp nhận": Bỏ hoàn toàn ở Sale, Agent và toàn bộ dự án QR Chat
    if (claimChatBtn) {
        if (isSale || isAgent || isQrProject || isClosed) {
            claimChatBtn.classList.add('hide');
        } else if (isSuper) {
            claimChatBtn.classList.remove('hide');
            if (isClaimedByMe) {
                claimChatBtn.disabled = true;
                claimChatBtn.innerHTML = '<i class="ri-checkbox-circle-fill"></i> <span>Đã tiếp nhận</span>';
            } else {
                claimChatBtn.disabled = false;
                claimChatBtn.innerHTML = '<i class="ri-hand-heart-line"></i> <span>Tiếp nhận</span>';
            }
        } else {
            claimChatBtn.classList.add('hide');
        }
    }

    // 2. Nút "Đóng cuộc chat": Bỏ hoàn toàn ở Sale và Agent
    if (closeBtn) {
        if (isSale || isAgent || isClosed) {
            closeBtn.classList.add('hide');
        } else if (isSuper) {
            closeBtn.classList.remove('hide');
        } else {
            closeBtn.classList.add('hide');
        }
    }

    // 3. Nút Bàn giao ca: chỉ hiện khi cuộc chat đang active và là Sale hoặc Superadmin
    if (handoverBtn) {
        handoverBtn.classList.toggle('hide', isClosed || isAgent || (!isClaimedByMe && !isSuper && !isSale));
    }

    // 4. Banner Draining Grace Mode: hiện khi phiên chat đang active và tài khoản ở chế độ gia hạn hoàn tất ca
    if (drainingBanner) {
        const showDraining = !isClosed && isClaimedByMe && (window.CURRENT_SHIFT_DRAINING === true);
        drainingBanner.classList.toggle('hide', !showDraining);
    }

    // 5. Trạng thái ô nhập và các nút gửi tin
    if (isClosed) {
        chatInputContainer?.classList.add('hide');
        if (chatInput) {
            chatInput.disabled = true;
            chatInput.placeholder = 'Cuộc trò chuyện đã kết thúc';
        }
        if (sendBtn) sendBtn.disabled = true;
        if (attachBtn) attachBtn.disabled = true;
        if (micBtn) micBtn.disabled = true;
    } else {
        chatInputContainer?.classList.remove('hide');
        // Banner giám sát nằm cùng container với form. Chỉ ẩn form soạn tin để
        // Agent không thấy lặp lại cùng thông báo trong placeholder; banner vẫn hiện.
        chatForm?.classList.toggle('hide', isAgent && !isSuper);
        if (isAgent && !isSuper) {
            if (chatInput) {
                chatInput.disabled = true;
                chatInput.classList.add('is-supervisor-mode');
                chatInput.value = '';
                chatInput.placeholder = '';
            }
            if (sendBtn) sendBtn.disabled = true;
            if (attachBtn) attachBtn.disabled = true;
            if (micBtn) micBtn.disabled = true;
        } else {
            // Sale và Superadmin: chat trực tiếp mượt mà
            if (chatInput) {
                chatInput.disabled = false;
                chatInput.classList.remove('is-supervisor-mode');
                chatInput.placeholder = dict.replyPlaceholder || 'Nhập tin nhắn trả lời khách hàng...';
            }
            if (sendBtn) sendBtn.disabled = false;
            if (attachBtn) attachBtn.disabled = false;
            if (micBtn) micBtn.disabled = false;
        }
    }
}


async function selectSession(sessionId) {
    if (sessionId && String(sessionId).startsWith('internal_')) {
        let chat = internalChats.find(c => c.sessionId === sessionId);
        if (!chat) {
            await fetchInternalChats();
            chat = internalChats.find(c => c.sessionId === sessionId);
        }
        if (chat) {
            return selectInternalSession(chat);
        }
    }
    currentSessionId = sessionId;
    renderVisitorTypingIndicator(false);
    bindAgentChatInputEvents();
    if (adminVisitorTypingPollTimer) clearInterval(adminVisitorTypingPollTimer);
    adminVisitorTypingPollTimer = setInterval(() => {
        if (currentSessionId) pollVisitorTyping(currentSessionId);
    }, 2500);
    pollVisitorTyping(sessionId);

    // Mark session as read in DB (async, no need to await)
    authFetch(`${API_BASE}/api/admin/chats/${sessionId}/read`, { method: 'POST' })
        .then(r => r.json()).then(d => { if (d.seen_message_count !== undefined) seenMessageCount[sessionId] = d.seen_message_count; })
        .catch(() => {});
    // Optimistically clear badge in UI immediately
    const sess = sessionsList.find(s => s.id === sessionId);
    if (sess) {
        sess.unread_visitor = 0;
        sess.unread_count = 0;
        seenMessageCount[sessionId] = parseInt(sess.message_count) || 0;
        const remainingUnread = sessionsList.filter(s => {
            const seen = seenMessageCount[s.id];
            const total = parseInt(s.message_count) || 0;
            const unread = (seen === -1 || seen === undefined) ? total - 1 : Math.max(0, total - seen);
            return unread > 0;
        }).length;
        updateAppBadge(remainingUnread);
    }
    const targetCard = document.querySelector(`.session-card[data-id="${sessionId}"]`);
    if (targetCard) {
        targetCard.classList.remove('has-unread');
        targetCard.querySelector('.session-unread-badge')?.remove();
    }

    // Reset pagination states for the newly selected session
    adminMessages = [];
    adminOffset = 0;
    adminHasMore = true;
    adminIsLoadingMore = false;
    // Hóa đơn thuộc về từng cuộc chat — không để sót hóa đơn của chat trước.
    adminOrder = null;
    adminBills = [];
    adminOrderSignature = '';
    
    // Highlight in list
    document.querySelectorAll('.session-card').forEach(c => {
        c.classList.remove('active-selected');
        if (c.getAttribute('data-id') === sessionId) {
            c.classList.add('active-selected');
        }
    });

    const session = sessionsList.find(s => s.id === sessionId);
    if (!session) {
        // Bấm vào một đoạn vừa rơi khỏi danh sách (danh sách vừa được nạp lại,
        // hoặc bộ lọc vừa đổi): thoát ở đây là ĐÚNG, nhưng không được để lại
        // spinner của lượt chọn trước đó quay mãi trên màn hình.
        clearChatLoadingState();
        return;
    }
    applyDetailsPanelMode(session);

    // Show header details
    chatTitleName.textContent = session.visitor_name || 'Khách hàng';
    chatTitleEmail.textContent = session.visitor_email || 'Chưa có email';

    // Show Group Name + QR Name in header
    const groupBadge = document.getElementById('chat-header-group-badge');
    const groupNameEl = document.getElementById('chat-header-group-name');
    const qrInfoEl = document.getElementById('chat-header-qr-info');
    const groupName = session.group_name || '';
    const qrLabel = session.qr_label || '';
    const groupQrText = groupName && qrLabel ? `${groupName} · ${qrLabel}` : (groupName || qrLabel || '');

    if (groupBadge && groupNameEl) {
        if (groupQrText) {
            groupNameEl.textContent = groupQrText;
            groupBadge.classList.remove('hide');
        } else {
            groupBadge.classList.add('hide');
        }
    }
    if (qrInfoEl) {
        qrInfoEl.textContent = '';
        qrInfoEl.classList.add('hide');
    }

    // Show visitor avatar in chat header
    const chatHeaderAvatar = document.getElementById('chat-header-avatar');
    if (chatHeaderAvatar) {
        if (session.visitor_avatar) {
            chatHeaderAvatar.style.display = 'block';
            chatHeaderAvatar.innerHTML = `<img src="${escapeHtml(session.visitor_avatar)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(99,102,241,0.4);" alt="" onerror="this.parentElement.style.display='none'">`;
        } else {
            const initials = escapeHtml((session.visitor_name || '?')[0].toUpperCase());
            const isSocial = ['messenger','instagram','whatsapp','facebook','zalo','tiktok','pancake'].includes(session.platform) || (session.platform || '').startsWith('manychat');
            if (isSocial) {
                chatHeaderAvatar.style.display = 'block';
                chatHeaderAvatar.innerHTML = `<div style="width:44px;height:44px;border-radius:50%;background:rgba(99,102,241,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--accent-color);border:2px solid rgba(99,102,241,0.4);">${initials}</div>`;
            } else {
                chatHeaderAvatar.style.display = 'none';
                chatHeaderAvatar.innerHTML = '';
            }
        }
    }

    // Set project ID badge in active header
    const chatHeaderProjectBadge = document.getElementById('chat-header-project-badge');
    const chatHeaderProjectId = document.getElementById('chat-header-project-id');
    if (chatHeaderProjectBadge && chatHeaderProjectId) {
        // Cùng lý do như thẻ hội thoại: Agent/Sale QR chỉ có một dự án, không cần
        // nhắc mã dự án ở thanh tiêu đề cuộc chat.
        const hideProject = isRestrictedConsole() && isQrConciergeProject(session.project_id);
        if (session.project_id && !hideProject) {
            chatHeaderProjectId.textContent = session.project_id;
            chatHeaderProjectBadge.classList.remove('hide');
        } else {
            chatHeaderProjectBadge.classList.add('hide');
        }
    }

    // Set project ID in details sidebar
    const detailProjectId = document.getElementById('detail-project-id');
    const detailProjectUrl = document.getElementById('detail-project-url');
    const projectDetails = getProjectDetails(session.project_id);
    if (detailProjectId) detailProjectId.textContent = projectDetails.name;
    if (detailProjectUrl) {
        detailProjectUrl.textContent = projectDetails.url ? projectDetails.url.replace(/^https?:\/\//, '') : 'Chưa có link website';
        detailProjectUrl.href = projectDetails.url || '#';
        detailProjectUrl.style.pointerEvents = projectDetails.url ? 'auto' : 'none';
    }

    const visitorName = session.visitor_name || 'Khách hàng';
    const detailUserName = document.getElementById('detail-user-name');
    const detailUserEmail = document.getElementById('detail-user-email');
    const detailUserAvatar = document.getElementById('detail-user-avatar');
    const detailUserPlatformChip = document.getElementById('detail-user-platform-chip');
    const detailUserPhoneWrap = document.getElementById('detail-user-phone-wrap');
    const detailUserPhoneText = document.getElementById('detail-user-phone-text');
    const detailUserPhoneLink = document.getElementById('detail-user-phone-link');
    const detailUserVerifiedBadge = document.getElementById('detail-user-verified-badge');

    // Channel metadata elements
    const detailChannelName = document.getElementById('detail-channel-name');
    const detailChannelSenderId = document.getElementById('detail-channel-sender-id');
    const detailChannelSenderRow = document.getElementById('detail-channel-sender-row');
    const detailChannelHotline = document.getElementById('detail-channel-hotline');
    const detailChannelHotlineRow = document.getElementById('detail-channel-hotline-row');
    const detailChannelTime = document.getElementById('detail-channel-time');

    if (detailUserName) detailUserName.textContent = visitorName;
    if (detailUserAvatar) {
        detailUserAvatar.textContent = visitorName.trim().charAt(0).toUpperCase() || 'K';
        if (session.platform === 'whatsapp') {
            detailUserAvatar.style.background = 'linear-gradient(145deg, #25D366, #128C7E)';
            detailUserAvatar.style.boxShadow = '0 5px 12px rgba(37,211,102,0.3)';
        } else {
            detailUserAvatar.style.background = 'linear-gradient(145deg, #f438a1, #c90c6c)';
            detailUserAvatar.style.boxShadow = '0 5px 12px rgba(201,12,108,.22)';
        }
    }

    // Platform chip
    if (detailUserPlatformChip) {
        if (session.platform === 'whatsapp') {
            detailUserPlatformChip.className = 'platform-chip';
            detailUserPlatformChip.style.background = 'rgba(37,211,102,0.15)';
            detailUserPlatformChip.style.color = '#25D366';
            detailUserPlatformChip.style.border = '1px solid rgba(37,211,102,0.3)';
            detailUserPlatformChip.innerHTML = '<i class="ri-whatsapp-fill"></i> WhatsApp';
            detailUserPlatformChip.classList.remove('hide');
        } else if (session.platform === 'messenger') {
            detailUserPlatformChip.className = 'platform-chip';
            detailUserPlatformChip.style.background = 'rgba(0,132,255,0.15)';
            detailUserPlatformChip.style.color = '#0084FF';
            detailUserPlatformChip.style.border = '1px solid rgba(0,132,255,0.3)';
            detailUserPlatformChip.innerHTML = '<i class="ri-messenger-fill"></i> Messenger';
            detailUserPlatformChip.classList.remove('hide');
        } else if (session.platform === 'instagram') {
            detailUserPlatformChip.className = 'platform-chip';
            detailUserPlatformChip.style.background = 'rgba(225,48,108,0.15)';
            detailUserPlatformChip.style.color = '#E1306C';
            detailUserPlatformChip.style.border = '1px solid rgba(225,48,108,0.3)';
            detailUserPlatformChip.innerHTML = '<i class="ri-instagram-fill"></i> Instagram';
            detailUserPlatformChip.classList.remove('hide');
        } else {
            detailUserPlatformChip.className = 'platform-chip';
            detailUserPlatformChip.style.background = 'rgba(99,102,241,0.15)';
            detailUserPlatformChip.style.color = '#818cf8';
            detailUserPlatformChip.style.border = '1px solid rgba(99,102,241,0.3)';
            detailUserPlatformChip.innerHTML = '<i class="ri-global-line"></i> Web Widget';
            detailUserPlatformChip.classList.remove('hide');
        }
    }

    // Phone / WhatsApp contact number
    const phoneVal = session.visitor_phone || (session.platform === 'whatsapp' ? session.platform_sender_id : '');
    if (detailUserPhoneWrap) {
        if (phoneVal) {
            detailUserPhoneWrap.classList.remove('hide');
            const cleanPhone = String(phoneVal).replace(/[^0-9+]/g, '');
            const displayPhone = cleanPhone.startsWith('84') ? `+84 ${cleanPhone.slice(2, 5)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8)}` : cleanPhone;
            if (detailUserPhoneText) detailUserPhoneText.textContent = displayPhone;
            if (detailUserPhoneLink) {
                detailUserPhoneLink.href = `https://wa.me/${cleanPhone.replace('+', '')}`;
            }
        } else {
            detailUserPhoneWrap.classList.add('hide');
        }
    }

    // Email
    if (detailUserEmail) {
        detailUserEmail.textContent = session.visitor_email || (session.platform === 'whatsapp' ? 'Tài khoản WhatsApp (Đã xác minh số ĐT)' : 'Chưa có email');
    }

    // Verified badge
    if (detailUserVerifiedBadge) {
        const isVerified = session.is_verified || session.platform === 'whatsapp';
        detailUserVerifiedBadge.style.display = isVerified ? 'flex' : 'none';
        detailUserVerifiedBadge.innerHTML = `<i class="ri-checkbox-circle-fill"></i> <span>${session.platform === 'whatsapp' ? 'Đã xác minh số điện thoại WhatsApp' : 'Đã xác minh'}</span>`;
    }

    // Channel metadata card
    if (detailChannelName) {
        if (session.platform === 'whatsapp') {
            detailChannelName.innerHTML = `<i class="ri-whatsapp-fill" style="color:#25D366;"></i> WhatsApp Cloud API`;
            detailChannelName.style.color = '#25D366';
        } else if (session.platform === 'messenger') {
            detailChannelName.innerHTML = `<i class="ri-messenger-fill" style="color:#0084FF;"></i> Facebook Messenger`;
            detailChannelName.style.color = '#0084FF';
        } else if (session.platform === 'instagram') {
            detailChannelName.innerHTML = `<i class="ri-instagram-fill" style="color:#E1306C;"></i> Instagram Direct`;
            detailChannelName.style.color = '#E1306C';
        } else {
            detailChannelName.innerHTML = `<i class="ri-chat-voice-line" style="color:#818cf8;"></i> Live Chat Widget`;
            detailChannelName.style.color = 'var(--text-primary)';
        }
    }

    if (detailChannelSenderId) {
        const sid = session.platform_sender_id || session.visitor_phone || session.id;
        detailChannelSenderId.textContent = sid;
    }

    const detailChannelGroupRow = document.getElementById('detail-channel-group-row');
    const detailChannelGroupName = document.getElementById('detail-channel-group-name');
    const detailChannelQrRow = document.getElementById('detail-channel-qr-row');
    const detailChannelQrLabel = document.getElementById('detail-channel-qr-label');

    if (detailChannelGroupRow && detailChannelGroupName) {
        if (session.group_name) {
            detailChannelGroupName.innerHTML = `<i class="ri-team-line"></i> ${escapeHtml(session.group_name)}`;
            detailChannelGroupRow.style.display = 'flex';
        } else {
            detailChannelGroupRow.style.display = 'none';
        }
    }
    if (detailChannelQrRow && detailChannelQrLabel) {
        if (session.qr_label) {
            detailChannelQrLabel.textContent = session.qr_label;
            detailChannelQrRow.style.display = 'flex';
        } else {
            detailChannelQrRow.style.display = 'none';
        }
    }

    if (detailChannelHotlineRow) {
        detailChannelHotlineRow.style.display = (session.platform === 'whatsapp') ? 'flex' : 'none';
    }

    if (detailChannelTime) {
        const dt = new Date(session.created_at || Date.now());
        detailChannelTime.textContent = dt.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // Browser and Device details
    const detailBrowserName = document.getElementById('detail-browser-name');
    const detailBrowserIcon = document.getElementById('detail-browser-icon');
    const detailDeviceName = document.getElementById('detail-device-name');
    const detailDeviceIcon = document.getElementById('detail-device-icon');

    if (session.platform === 'whatsapp') {
        if (detailBrowserName) detailBrowserName.textContent = 'WhatsApp App';
        if (detailBrowserIcon) detailBrowserIcon.className = 'ri-whatsapp-fill';
        if (detailDeviceName) detailDeviceName.textContent = 'WhatsApp Mobile / Web';
        if (detailDeviceIcon) detailDeviceIcon.className = 'ri-smartphone-line';
    } else {
        const browserVal = session.browser || 'Chrome';
        const deviceVal = session.device || 'Desktop';
        if (detailBrowserName) detailBrowserName.textContent = browserVal;
        if (detailDeviceName) detailDeviceName.textContent = deviceVal;
        if (detailBrowserIcon) detailBrowserIcon.className = getBrowserIcon(browserVal);
        if (detailDeviceIcon) detailDeviceIcon.className = getDeviceIcon(deviceVal);
    }

    chatHeaderActions.classList.remove('hide');
    chatInputContainer.classList.remove('hide');
    detailsSidebar.classList.remove('hide');
    dashboardBody?.classList.add('chat-open'); // mobile: chuyển sang khung chat

    // Update delete button visibility: strictly only superadmin can see and delete!
    if (deleteSessionBtn) {
        const isSuperAdmin = CURRENT_ADMIN && CURRENT_ADMIN.role === 'superadmin';
        deleteSessionBtn.classList.toggle('hide', !isSuperAdmin);
    }

    // QR agent sessions are permanently assigned by their QR account. No
    // claim/reassign action is shown or requested for them.
    const isQrOwnedAgentChat = isQrChatOwnedByCurrentAgent(session);

    // Populate and sync assignee selector
    if (chatAssigneeSelect) {
        if (!isQrOwnedAgentChat) {
            await loadAssigneesForChat(session.project_id);
            chatAssigneeSelect.value = session.assigned_admin_id ? String(session.assigned_admin_id) : '';
        }
        const canReassign = !isQrOwnedAgentChat && CURRENT_ADMIN && ['superadmin', 'project_owner', 'project_admin'].includes(CURRENT_ADMIN.role);
        chatAssigneeSelect.disabled = !canReassign;
        if (assigneeSelectorContainer) {
            assigneeSelectorContainer.classList.toggle('hide', isQrOwnedAgentChat);
            assigneeSelectorContainer.title = canReassign ? 'Phân công cuộc trò chuyện cho nhân viên' : 'Nhân viên phụ trách cuộc trò chuyện';
        }
    }

    // Update details side panel
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    currentDetectedLang = session.detected_language || 'unknown';
    const detailLangSelect = document.getElementById('detail-lang-select');
    if (detailLangSelect) {
        detailLangSelect.value = currentDetectedLang;
    }
    
    renderTags(session.intent_tags);
    if (detailSummary) {
        if (session.ai_summary && session.ai_summary.trim() && session.ai_summary !== 'Không có dữ liệu phân tích.') {
            detailSummary.textContent = session.ai_summary;
            detailSummary.style.color = 'var(--text-primary)';
            detailSummary.style.fontStyle = 'normal';
        } else if (session.status === 'closed') {
            detailSummary.textContent = 'Đang phân tích và tóm tắt cuộc trò chuyện...';
            detailSummary.style.color = 'var(--text-muted)';
            detailSummary.style.fontStyle = 'italic';
        } else {
            detailSummary.textContent = 'Cuộc trò chuyện đang diễn ra. Khi kết thúc, AI sẽ tự động phân tích và tóm tắt.';
            detailSummary.style.color = 'var(--text-secondary)';
            detailSummary.style.fontStyle = 'italic';
        }
    }
    applyChatPermissionUI(session);

    // Show premium loading spinner inside messages container
    chatMessagesContainer.innerHTML = `
        <div class="chat-loading-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 15px; color: var(--text-secondary);">
            <div class="spinner-glow" style="width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.05); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);"></div>
            <span style="font-size: 13.5px; font-weight: 500; letter-spacing: 0.3px; color: var(--text-muted);">${dict.translatingWithAI || 'Đang dịch thuật...'}</span>
        </div>
    `;

    // ĐỒNG HỒ CANH SPINNER.
    //
    // Mọi nhánh bên dưới đều đã được bọc, nhưng cái đứng hình mà khách báo là
    // thứ không được phép xảy ra thêm một lần nào nữa: nếu sau 12 giây spinner
    // vẫn còn, tự thử lại một lượt; hết lượt thử thì hiện nút "Thử lại" để còn
    // bấm được, thay vì bắt người ta nhìn vòng xoay không hồi kết.
    armChatLoadingWatchdog(sessionId);

    try {
        // Đơn và hoá đơn phải có TRƯỚC khi vẽ tin nhắn: loadMessages() chính là
        // nơi vẽ chúng vào dòng hội thoại. Tải sau thì lượt vẽ đầu tiên không
        // có gì để vẽ, và đoạn chat đã đóng thì không còn lượt vẽ nào nữa —
        // đúng lỗi "mở đoạn chat cũ không thấy hoá đơn đâu".
        if (!String(sessionId).startsWith('internal_')) {
            await Promise.all([loadOrderForAdmin(sessionId), loadBillsForAdmin(sessionId)]);
        }
        await loadMessages(sessionId);
    } catch (error) {
        console.error('Mở cuộc trò chuyện lỗi:', error);
    } finally {
        // Chốt chặn cuối: vẽ bằng dữ liệu đang có — kể cả rỗng — vẫn hơn đứng hình.
        if (sessionId === currentSessionId && chatMessagesContainer.querySelector('.chat-loading-state')) {
            try { renderAdminMessages(false); }
            catch (error) { console.error('Vẽ tin nhắn lỗi:', error); showChatLoadFailed(sessionId); }
        }
        if (sessionId === currentSessionId) disarmChatLoadingWatchdog();
    }

    // Không còn cần polling 2s/lần: tin nhắn mới được server đẩy tức thì qua SSE Event Stream
    if (messagePollInterval) clearInterval(messagePollInterval);
    messagePollInterval = null;
}


// Hóa đơn dùng chung endpoint công khai với khách. Chỉ báo "có thay đổi" khi
// trạng thái đơn thật sự khác, vì backend vẽ lại PDF mỗi lần gọi nên chuỗi
// pdfDataUrl luôn khác — so sánh cả chuỗi đó sẽ khiến khung chat render lại liên tục.
// Hoá đơn ĐÃ LƯU của phiên. Khác với /order ở chỗ route này đọc bảng
// chat_order_bills nên vẫn trả về khi phiên đã đóng — /order chỉ tìm đơn của
// phiên đang 'active', nên mở lại một đoạn chat cũ thì Sale và Agent không thấy
// hoá đơn nào cả, dù bill vẫn nằm nguyên trong database.
// --- CANH SPINNER "ĐANG DỊCH THUẬT..." --------------------------------------
//
// Khung chat chỉ có MỘT nơi vẽ spinner (lúc mở cuộc trò chuyện) và nhiều nơi có
// thể vẽ đè lên nó. Chỉ cần một nhánh nào đó thoát sớm mà quên vẽ là spinner ở
// lại vĩnh viễn — không có polling nào cứu nữa vì tin mới đi bằng SSE. Ba hàm
// dưới đây là lưới an toàn cuối cùng, KHÔNG thay cho việc sửa đúng nguyên nhân.
let chatLoadingWatchdog = null;
let chatLoadingRetries = 0;

function clearChatLoadingState() {
    chatMessagesContainer?.querySelectorAll('.chat-loading-state').forEach((node) => node.remove());
}

function disarmChatLoadingWatchdog() {
    if (chatLoadingWatchdog) clearTimeout(chatLoadingWatchdog);
    chatLoadingWatchdog = null;
    chatLoadingRetries = 0;
}

function armChatLoadingWatchdog(sessionId) {
    if (chatLoadingWatchdog) clearTimeout(chatLoadingWatchdog);
    chatLoadingWatchdog = setTimeout(() => {
        chatLoadingWatchdog = null;
        // Đã chuyển sang đoạn khác, hoặc đã vẽ xong: không còn gì để canh.
        if (sessionId !== currentSessionId) return;
        if (!chatMessagesContainer?.querySelector('.chat-loading-state')) return;
        if (chatLoadingRetries >= 1) return showChatLoadFailed(sessionId);
        chatLoadingRetries += 1;
        // Thử lại một lượt: phần lớn trường hợp là một yêu cầu mạng treo giữa
        // chừng trên 4G, gọi lại là xong.
        adminIsSyncingMessages = false;
        adminPendingMessageLoad = null;
        armChatLoadingWatchdog(sessionId);
        loadMessages(sessionId).catch(() => showChatLoadFailed(sessionId));
    }, 12000);
}

function showChatLoadFailed(sessionId) {
    if (sessionId !== currentSessionId || !chatMessagesContainer) return;
    disarmChatLoadingWatchdog();
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    clearChatLoadingState();
    const box = document.createElement('div');
    box.className = 'chat-load-failed';
    box.innerHTML = `
        <i class="ri-wifi-off-line"></i>
        <p>${escapeHtml(dict.chatLoadFailed || 'Không tải được tin nhắn. Kiểm tra kết nối rồi thử lại.')}</p>
        <button type="button">${escapeHtml(dict.chatLoadRetry || 'Thử lại')}</button>
    `;
    box.querySelector('button').onclick = () => {
        adminIsSyncingMessages = false;
        adminPendingMessageLoad = null;
        selectSession(sessionId);
    };
    chatMessagesContainer.appendChild(box);
}

// Các bản đơn khách đã gửi trước bản hiện tại (khách bấm sửa rồi gửi lại).
let adminOrderRevisions = [];
let adminBills = [];
async function loadBillsForAdmin(sessionId) {
    if (String(sessionId).startsWith('internal_')) return;
    try {
        const response = await fetchWithTimeout(`${API_BASE}/api/chats/${sessionId}/bills?lang=${currentLang}`);
        adminBills = response.ok ? ((await response.json()).bills || []) : [];
    } catch { adminBills = []; }
    // Vẽ lại ngay khi bill về, không phụ thuộc vào việc ai chạy trước ai.
    //
    // Trước đây hoá đơn chỉ được vẽ trong loadMessages(): tuỳ luồng mở chat của
    // từng vai trò mà bill về trước hay sau lượt vẽ, nên có tài khoản thấy có
    // tài khoản không. Hàm vẽ đã tự dọn bản cũ nên gọi thêm một lần vô hại.
    // BỌC LẠI: hàm vẽ này nằm NGOÀI try ở trên. Nó ném một cái là lời hứa của
    // loadBillsForAdmin vỡ, Promise.all trong openChat vỡ theo, và openChat
    // dừng ngay tại đó — spinner "Đang dịch thuật..." ở lại vĩnh viễn vì lượt
    // vẽ tin nhắn không bao giờ chạy. Một tờ hoá đơn dị dạng không được phép
    // khoá cả cuộc trò chuyện.
    if (sessionId === currentSessionId) {
        try { renderAdminSavedBills(); renderAdminOrderRevisions(); }
        catch (error) { console.error('Không vẽ được hoá đơn đã lưu:', error); }
    }
}


// Vẽ các bill đã lưu vào đúng chỗ của chúng trong dòng thời gian.
// BỎ QUA bản mới nhất của đơn đang hiển thị: renderAdminInvoice() đã vẽ đúng
// bản đó rồi, vẽ thêm là hiện hai lần cùng một tờ hoá đơn.
// Bản đơn cũ của khách, vẽ vào đúng chỗ của nó trong dòng hội thoại — cùng luật
// với hoá đơn: mỗi lần khách bấm gửi là một sự kiện đã xảy ra, không bị bản sau
// xoá đi.
function renderAdminOrderRevisions() {
    chatMessagesContainer?.querySelectorAll('.admin-order-revision').forEach((node) => node.remove());
    if (!Array.isArray(adminOrderRevisions) || adminOrderRevisions.length === 0) return;
    for (const revision of adminOrderRevisions) {
      try {
        const rows = (revision.items || []).map((item) => `
            <div class="admin-order-rev-row">
                <span>${escapeHtml(item.name || '')} <b>×${Number(item.quantity || 0)}</b>
                    ${item.note ? `<small>${escapeHtml(String(item.note))}</small>` : ''}</span>
                <span>${new Intl.NumberFormat('vi-VN').format(Number(item.lineTotal || 0))} ₫</span>
            </div>`).join('');
        const wrapper = document.createElement('div');
        wrapper.className = 'admin-invoice-block admin-order-revision';
        wrapper.innerHTML = `
            <div class="admin-invoice-head">
                <span class="admin-invoice-kicker"><i class="ri-file-list-3-line"></i> Đơn khách đã gửi (bản ${Number(revision.version || 1)})</span>
                <span class="admin-invoice-status is-waiting">Khách đã sửa lại</span>
            </div>
            <div class="admin-order-rev-body">${rows}</div>
            <div class="admin-invoice-meta">
                <span><strong>${new Intl.NumberFormat('vi-VN').format(Number(revision.total_amount || 0))} ₫</strong></span>
            </div>`;
        insertIntoChatFlow(wrapper, revision.created_at);
      } catch (error) { console.error('Bỏ qua một bản đơn không vẽ được:', error); }
    }
}

function renderAdminSavedBills() {
    // Dọn bản vẽ trước: hàm này có thể được gọi nhiều lần cho cùng một phiên
    // (một lần sau khi vẽ tin nhắn, một lần khi bill về). Không dọn là mỗi lượt
    // gọi thêm một tờ hoá đơn nữa vào khung chat.
    chatMessagesContainer?.querySelectorAll('.admin-invoice-block.is-archived').forEach((node) => node.remove());
    if (!Array.isArray(adminBills) || adminBills.length === 0) return;
    // Hiện ĐỦ các bản bill theo thứ tự khách nhận được, cùng mã, khác món và
    // tiền. Chỉ bỏ đúng BẢN MỚI NHẤT của đơn đang mở, vì renderAdminInvoice()
    // đã vẽ chính bản đó rồi — bỏ cả đơn thì mất luôn các bản trước.
    const liveId = adminOrder && adminOrder.status !== 'pending_confirm'
        && (adminOrder.invoice?.svgDataUrl || adminOrder.invoice?.pdfUrl || adminOrder.invoice?.pdfDataUrl)
        ? String(adminOrder.id) : '';
    const newestOfOrder = new Map();
    for (const bill of adminBills) {
        const key = String(bill.orderId);
        const seen = newestOfOrder.get(key);
        if (seen === undefined || Number(bill.version || 0) > Number(seen)) {
            newestOfOrder.set(key, Number(bill.version || 0));
        }
    }
    const methodLabels = { cash: 'Tiền mặt', bank_qr: 'Chuyển khoản QR', card: 'Thẻ', room_charge: 'Cộng vào tiền phòng', pay_later: 'Thanh toán sau' };

    for (const bill of adminBills) {
      // Từng tờ một: dữ liệu hỏng ở tờ thứ hai không được xoá luôn tờ thứ nhất
      // đã vẽ xong.
      try {
        if (liveId && String(bill.orderId) === liveId
            && Number(bill.version || 0) === newestOfOrder.get(String(bill.orderId))) continue;
        const preview = bill.invoice?.svgDataUrl || '';
        const pdf = bill.invoice?.pdfUrl || bill.invoice?.pdfDataUrl || '';
        if (!preview && !pdf) continue;
        const methodText = bill.paymentMethod ? (methodLabels[bill.paymentMethod] || bill.paymentMethod) : '';
        const totalText = new Intl.NumberFormat('vi-VN').format(Number(bill.totalAmount || 0));
        const label = bill.invoice?.invoiceNo || bill.orderCode || '';
        const wrapper = document.createElement('div');
        wrapper.className = 'admin-invoice-block is-archived';
        wrapper.innerHTML = `
            <div class="admin-invoice-head">
                <span class="admin-invoice-kicker"><i class="ri-receipt-line"></i> Hóa đơn đã gửi khách${label ? ` · ${escapeHtml(label)}` : ''}</span>
                <span class="admin-invoice-status ${bill.orderStatus === 'paid' ? 'is-paid' : 'is-waiting'}">${escapeHtml(
                    bill.orderStatus === 'paid' ? 'Đã thanh toán'
                    : ['superseded', 'rejected', 'cancelled'].includes(String(bill.orderStatus || '')) ? 'Bản trước khi sửa'
                    : 'Đã lưu')}</span>
            </div>
            ${preview ? `<button type="button" class="admin-invoice-preview attachment-preview-trigger" data-preview-url="${escapeHtml(pdf || preview)}" data-preview-type="document" data-preview-title="Hóa đơn"><img src="${escapeHtml(preview)}" alt="Hóa đơn"></button>` : ''}
            <div class="admin-invoice-meta">
                <span><strong>${escapeHtml(totalText)} ₫</strong></span>
                ${methodText ? `<span><i class="ri-bank-card-line"></i> ${escapeHtml(methodText)}</span>` : ''}
                ${pdf ? `<button type="button" class="attachment-preview-trigger admin-invoice-open" data-preview-url="${escapeHtml(pdf)}" data-preview-type="document" data-preview-title="Hóa đơn"><i class="ri-file-pdf-2-line"></i> Mở PDF</button>` : ''}
            </div>
        `;
        insertIntoChatFlow(wrapper, bill.createdAt);
      } catch (error) { console.error('Bỏ qua một hoá đơn không vẽ được:', error); }
    }
}


async function loadOrderForAdmin(sessionId) {
    try {
        // Endpoint này DÙNG CHUNG với cổng khách, và nó là chỗ đã treo thật:
        // một lỗi SQL trong nhánh tự chọn thanh toán làm route không trả về gì,
        // nên lượt await này chờ mãi và khung chat đứng ở spinner.
        const response = await fetchWithTimeout(`${API_BASE}/api/chats/${sessionId}/order?lang=${currentLang}&_=${Date.now()}`);
        if (!response.ok) {
            const had = !!adminOrder;
            adminOrder = null;
            adminOrderSignature = '';
            return had;
        }
        const data = await response.json();
        const order = data.order || null;
        // Các bản đơn khách đã gửi rồi sửa lại. Nhân viên phải thấy ĐÚNG những
        // gì khách thấy: khách nhớ mình từng gửi đơn khác, mà bảng của Sale chỉ
        // có bản cuối thì hai bên nói chuyện lệch nhau.
        adminOrderRevisions = Array.isArray(data.revisions) ? data.revisions : [];
        const signature = order
            ? [order.id, order.status, order.payment_method, order.total_amount,
               adminOrderRevisions.length, currentLang].join('|')
            : '';
        if (signature === adminOrderSignature) return false;
        adminOrder = order;
        adminOrderSignature = signature;
        return true;
    } catch (e) {
        return false;
    }
}


async function loadMessages(sessionId, isLoadMore = false) {
    // Do not allow a slow request to finish after a newer poll and redraw stale content.
    //
    // Nhưng BỎ HẲN lượt gọi này thì màn hình đứng mãi ở spinner "Đang dịch
    // thuật...": mở đoạn A (lượt gọi A đang bay) rồi bấm sang đoạn B — openChat
    // vẽ spinner, loadMessages(B) bị chặn ở đây và biến mất, còn lượt A khi về
    // thấy sessionId đã đổi nên cũng không vẽ gì. Không còn ai vẽ nữa, vì tin
    // mới nay đến bằng SSE chứ không còn polling 2 giây một lần để cứu.
    //
    // Vậy nên: nhớ lại lượt bị chặn và chạy nó ngay khi lượt đang bay xong.
    if (adminIsSyncingMessages) {
        adminPendingMessageLoad = { sessionId, isLoadMore };
        return;
    }
    adminIsSyncingMessages = true;
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    let fetchLimit = adminLimit;
    const currentPersistedCount = adminMessages.filter(m => m.id && !String(m.id).startsWith('temp_')).length;
    let fetchOffset = isLoadMore ? currentPersistedCount : 0;

    if (!isLoadMore) {
        // Fetch all currently loaded messages to keep polling sync complete
        fetchLimit = Math.max(currentPersistedCount, adminLimit);
        fetchOffset = 0;
    }

    try {
        // HẠN 20 GIÂY.
        //
        // fetch() không tự bỏ cuộc: một yêu cầu treo trên 4G chập chờn sẽ chờ
        // mãi mãi, và vì lượt vẽ nằm sau nó nên spinner cũng đứng mãi mãi. Có
        // hạn thì nó rơi vào nhánh catch, và đồng hồ canh ở trên xử lý tiếp.
        const stopSlow = new AbortController();
        const slowTimer = setTimeout(() => stopSlow.abort(), 20000);
        let response;
        try {
            response = await authFetch(`${API_BASE}/api/admin/chats/${sessionId}/messages?adminLang=${currentLang}&limit=${fetchLimit}&offset=${fetchOffset}&_=${Date.now()}`, { signal: stopSlow.signal });
        } finally {
            clearTimeout(slowTimer);
        }
        let fetchedMessages = await response.json();

        // Normalize: internal chats may return { messages: [...] } instead of a flat array
        if (!Array.isArray(fetchedMessages) && fetchedMessages && Array.isArray(fetchedMessages.messages)) {
            fetchedMessages = fetchedMessages.messages;
        }

        // Prevent a late response from the previous chat/account from being
        // rendered after the user has changed account or selected another chat.
        if (sessionId !== currentSessionId) return;

        if (!Array.isArray(fetchedMessages)) {
            if (chatMessagesContainer.querySelector('.chat-loading-state')) {
                renderAdminMessages(false);
            }
            return;
        }

        if (isLoadMore) {
            const existingIds = new Set(adminMessages.map(m => m.id));
            const newOlderMessages = fetchedMessages.filter(m => !existingIds.has(m.id));

            if (fetchedMessages.length < adminLimit || newOlderMessages.length === 0) {
                adminHasMore = false;
            }

            if (newOlderMessages.length > 0) {
                adminMessages = [...newOlderMessages, ...adminMessages];
                adminOffset = adminMessages.filter(m => m.id && !String(m.id).startsWith('temp_')).length;
            }
            renderAdminMessages(true);
        } else {
            // Keep unresolved in-flight temp messages
            const tempMsgs = adminMessages.filter(m => m.id && m.id.toString().startsWith('temp_'));
            const unresolvedTempMsgs = tempMsgs.filter(tempMsg => {
                return !fetchedMessages.some(fm => fm.sender === tempMsg.sender && fm.original_text === tempMsg.original_text);
            });

            const currentMsgs = adminMessages.filter(m => m.id && !m.id.toString().startsWith('temp_'));
            const map = new Map();
            fetchedMessages.forEach(m => map.set(m.id, m));
            currentMsgs.forEach(m => {
                if (!map.has(m.id)) map.set(m.id, m);
            });
            const merged = Array.from(map.values());
            merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            unresolvedTempMsgs.forEach(tm => merged.push(tm));

            if (fetchedMessages.length < adminLimit && currentMsgs.length === 0) {
                adminHasMore = false;
            }

            const hasLoadingState = !!chatMessagesContainer.querySelector('.chat-loading-state');

            // Only re-render if there are actual message changes (prevents 3s periodic jitter)
            const isDiff = adminMessages.length !== merged.length ||
                           adminMessages.some((m, idx) => {
                               const o = merged[idx];
                               return !o || o.id !== m.id || o.translated_text !== m.translated_text || o.original_text !== m.original_text || o.status !== m.status || o.seen_at !== m.seen_at || o.delivered_at !== m.delivered_at;
                           });

            adminMessages = merged;
            adminOffset = adminMessages.filter(m => m.id && !String(m.id).startsWith('temp_')).length;

            // Keep local seen count in sync while admin is viewing
            if (currentSessionId) {
                seenMessageCount[currentSessionId] = adminMessages.length;
                const activeSess = sessionsList.find(s => s.id === currentSessionId);
                if (activeSess) {
                    activeSess.unread_visitor = 0;
                    activeSess.unread_count = 0;
                }
                recalculateAppBadge();
            }

            const orderChanged = String(sessionId).startsWith('internal_') ? false : await loadOrderForAdmin(sessionId);

            if (isDiff || hasLoadingState || orderChanged) {
                renderAdminMessages(false);
            }
        }
    } catch (e) {
        console.error('Error loading messages:', e);
        if (chatMessagesContainer.querySelector('.chat-loading-state')) {
            // Chưa có gì để vẽ mà lại vừa lỗi: nói thẳng là hỏng và cho cái nút
            // bấm, đừng vẽ một khung trống rồi để người ta đoán.
            if (adminMessages.length === 0) showChatLoadFailed(sessionId);
            else renderAdminMessages(false);
        }
    } finally {
        adminIsSyncingMessages = false;
        const pending = adminPendingMessageLoad;
        adminPendingMessageLoad = null;
        // Chỉ chạy tiếp nếu người dùng vẫn đang ở đúng đoạn chat đó — bấm lướt
        // qua năm đoạn thì chỉ đoạn cuối cùng đáng được vẽ.
        if (pending && pending.sessionId === currentSessionId) {
            setTimeout(() => loadMessages(pending.sessionId, pending.isLoadMore), 0);
        }
    }
}


function renderMsgAvatarHtml(msg) {
    if (msg.sender === 'visitor') {
        const curSession = (typeof sessionsList !== 'undefined' && Array.isArray(sessionsList))
            ? sessionsList.find(s => String(s.id) === String(currentSessionId))
            : null;
        const email = (msg.visitor_email || curSession?.visitor_email || '').trim();
        const name = (msg.visitor_name || curSession?.visitor_name || '').trim();
        if (email) {
            const initial = (name ? name.charAt(0) : email.charAt(0)).toUpperCase();
            return `<div class="msg-avatar visitor-avatar" data-type="email" title="${escapeHtml(name ? `${name} (${email})` : email)}">
                <span class="msg-avatar-initial">${escapeHtml(initial)}</span>
            </div>`;
        }
        return `<div class="msg-avatar visitor-avatar is-anonymous" title="${escapeHtml(name || 'Khách hàng')}">
            <span class="msg-avatar-initial">${escapeHtml(name ? name.charAt(0).toUpperCase() : 'K')}</span>
        </div>`;
    }

    if (msg.sender === 'agent') {
        const isMe = CURRENT_ADMIN && (Number(msg.sender_admin_id) === Number(CURRENT_ADMIN.id) || !msg.sender_admin_id);
        const avatarUrl = msg.sender_admin_avatar || (isMe ? CURRENT_ADMIN.avatar_url : '');
        const name = msg.sender_admin_name || (isMe ? (CURRENT_ADMIN.full_name || CURRENT_ADMIN.username) : 'Tư vấn viên');
        const initial = (name ? name.trim().charAt(0) : 'S').toUpperCase();

        if (avatarUrl && /^https?:\/\//i.test(avatarUrl)) {
            return `<div class="msg-avatar agent-avatar" title="${escapeHtml(name)}">
                <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" class="msg-avatar-img" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='inline-block';">
                <span class="msg-avatar-initial" style="display:none;">${escapeHtml(initial)}</span>
            </div>`;
        }
        return `<div class="msg-avatar agent-avatar" title="${escapeHtml(name)}">
            <span class="msg-avatar-initial">${escapeHtml(initial)}</span>
        </div>`;
    }

    if (msg.sender === 'ai') {
        return `<div class="msg-avatar ai-avatar" title="Trợ lý AI Pat">
            <i class="ri-sparkling-fill"></i>
        </div>`;
    }

    return '';
}

function renderAdminMessages(isLoadMore = false, forceScrollToLatest = false) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    const previousScrollHeight = chatMessagesContainer.scrollHeight;
    const previousScrollTop = chatMessagesContainer.scrollTop;
    const isNearBottom = (chatMessagesContainer.scrollHeight - chatMessagesContainer.scrollTop - chatMessagesContainer.clientHeight) < 100;
    const isFirstLoad = chatMessagesContainer.children.length === 0 || chatMessagesContainer.querySelector('.chat-loading-state') || chatMessagesContainer.querySelector('.chat-welcome-state');

    chatMessagesContainer.innerHTML = '';

    // Load More Button
    if (adminHasMore) {
        const loadMoreDiv = document.createElement('div');
        loadMoreDiv.className = 'admin-chat-loadmore-btn-container';
        loadMoreDiv.style.textAlign = 'center';
        loadMoreDiv.style.padding = '15px 8px';

        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'admin-chat-loadmore-btn';
        loadMoreBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        loadMoreBtn.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        loadMoreBtn.style.color = 'var(--text-secondary)';
        loadMoreBtn.style.fontFamily = 'Outfit, sans-serif';
        loadMoreBtn.style.fontSize = '12px';
        loadMoreBtn.style.fontWeight = '500';
        loadMoreBtn.style.borderRadius = '8px';
        loadMoreBtn.style.padding = '6px 18px';
        loadMoreBtn.style.cursor = 'pointer';
        loadMoreBtn.style.transition = 'all 0.2s';
        loadMoreBtn.textContent = adminIsLoadingMore ? dict.loadingMore : dict.loadOlder;
        if (adminIsLoadingMore) loadMoreBtn.disabled = true;

        loadMoreBtn.onmouseover = () => { loadMoreBtn.style.background = 'rgba(255, 255, 255, 0.1)'; loadMoreBtn.style.color = 'var(--text-primary)'; };
        loadMoreBtn.onmouseout = () => { loadMoreBtn.style.background = 'rgba(255, 255, 255, 0.05)'; loadMoreBtn.style.color = 'var(--text-secondary)'; };

        loadMoreBtn.onclick = async () => {
            if (adminIsLoadingMore) return;
            adminIsLoadingMore = true;
            loadMoreBtn.textContent = dict.loadingMore;
            loadMoreBtn.disabled = true;
            try {
                await loadMessages(currentSessionId, true);
            } catch (err) {
                console.error('Lỗi khi tải tin nhắn cũ:', err);
            } finally {
                adminIsLoadingMore = false;
                const currentBtn = chatMessagesContainer.querySelector('.admin-chat-loadmore-btn');
                if (currentBtn) {
                    currentBtn.textContent = dict.loadOlder;
                    currentBtn.disabled = false;
                }
            }
        };

        loadMoreDiv.appendChild(loadMoreBtn);
        chatMessagesContainer.appendChild(loadMoreDiv);
    }

    if (adminMessages.length === 0) {
        chatMessagesContainer.innerHTML = `<div class="system"><div class="message-bubble">${dict.emptyChatHistory}</div></div>`;
        return;
    }

    const isInternal = currentSessionId && String(currentSessionId).startsWith('internal_');

    adminMessages.forEach(msg => {
        const wrapper = document.createElement('div');
        const staffOnly = msg.visible_to === 'staff';
        wrapper.className = `message-wrapper ${msg.sender}${staffOnly ? ' staff-only-notice' : ''}`;
        // Mốc thời gian đi kèm ngay trong DOM: thẻ đơn và hoá đơn dựa vào đây để
        // chen vào đúng chỗ của mình trong dòng hội thoại.
        stampChatTime(wrapper, msg.created_at);

        const locale = currentLang === 'vi' ? 'vi-VN' : currentLang === 'zh' ? 'zh-CN' : currentLang === 'ru' ? 'ru-RU' : 'en-US';
        const timeStr = new Date(msg.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

        if (isInternal) {
            const isMe = msg.sender_admin_id
                ? (Number(msg.sender_admin_id) === Number(CURRENT_ADMIN?.id))
                : (msg.sender === CURRENT_ADMIN?.role);

            if (isMe) {
                wrapper.className = 'message-wrapper agent';
                wrapper.innerHTML = `
                    <div class="msg-body-wrap">
                        <div class="message-bubble">
                            <div class="original-text">${escapeHtml(msg.original_text)}</div>
                        </div>
                        <div class="message-time"><span>${timeStr}</span></div>
                    </div>
                `;
            } else {
                wrapper.className = 'message-wrapper visitor internal-peer';
                const peerName = msg.sender_admin_name || currentInternalChat?.peerName || 'Nội bộ';
                const peerInitial = (peerName ? peerName.trim().charAt(0) : 'N').toUpperCase();
                const peerAvatar = msg.sender_admin_avatar || currentInternalChat?.peerAvatar;
                const peerAvatarHtml = peerAvatar
                    ? `<div class="msg-avatar visitor-avatar" title="${escapeHtml(peerName)}"><img src="${escapeHtml(peerAvatar)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"></div>`
                    : `<div class="msg-avatar visitor-avatar" style="background:linear-gradient(135deg, #6366f1, #a855f7);color:#fff;font-weight:700;" title="${escapeHtml(peerName)}">${escapeHtml(peerInitial)}</div>`;
                wrapper.innerHTML = `
                    ${peerAvatarHtml}
                    <div class="msg-body-wrap">
                        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:3px;font-weight:600;">${escapeHtml(peerName)}</div>
                        <div class="message-bubble">
                            <div class="original-text">${escapeHtml(msg.original_text)}</div>
                        </div>
                        <div class="message-time">${timeStr}</div>
                    </div>
                `;
            }
            chatMessagesContainer.appendChild(wrapper);
            return;
        }

        const readableOrderText = (value) => {
            const text = String(value || '');
            return adminOrder?.order_code && adminOrder?.id
                ? text.split(adminOrder.id).join(adminOrder.order_code)
                : text;
        };
        let innerHtml = '';
        if (msg.sender === 'visitor') {
            const hasTranslation = msg.translated_text && msg.translated_text !== msg.original_text;
            const primaryText = readableOrderText(hasTranslation ? msg.translated_text : msg.original_text);
            const attachmentHtml = renderAttachmentHtml(msg);
            innerHtml = `
                ${renderMsgAvatarHtml(msg)}
                <div class="msg-body-wrap">
                    <div class="message-bubble${attachmentHtml ? ' has-attachment' : ''}">
                        ${attachmentHtml}
                        ${attachmentHtml && isAttachmentPlaceholder(msg.original_text) ? '' : `<div class="original-text">${escapeHtml(primaryText)}</div>`}
                        ${hasTranslation && !isAttachmentPlaceholder(msg.original_text) ? `<div class="translated-text-wrapper" data-label="${dict.labelOriginal} ">${escapeHtml(readableOrderText(msg.original_text))}</div>` : ''}
                    </div>
                    <div class="message-time">${timeStr}</div>
                </div>
            `;
        } else if (msg.sender === 'agent' || msg.sender === 'ai') {
            const hasTranslation = msg.translated_text && msg.translated_text !== msg.original_text;
            const attachmentHtml = renderAttachmentHtml(msg);
            innerHtml = `
                <div class="msg-body-wrap">
                    <div class="message-bubble${attachmentHtml ? ' has-attachment' : ''}">
                        ${attachmentHtml}
                        ${attachmentHtml && isAttachmentPlaceholder(msg.original_text) ? '' : `<div class="original-text">${escapeHtml(readableOrderText(msg.original_text))}</div>`}
                        ${hasTranslation && !isAttachmentPlaceholder(msg.original_text) ? `<div class="translated-text-wrapper" data-label="${dict.labelAiTranslation} ">${escapeHtml(readableOrderText(msg.translated_text))}</div>` : ''}
                    </div>
                    <div class="message-time"><span>${timeStr}</span>${renderMsgStatusHtml(msg)}</div>
                </div>
            `;
        } else {
            // System message
            innerHtml = `
                <div class="message-bubble">
                    ${staffOnly ? '<span class="staff-only-label" title="Khách không nhìn thấy tin này"><i class="ri-lock-2-line"></i></span>' : ''}
                    <div class="original-text">${escapeHtml(readableOrderText(msg.original_text))}</div>
                </div>
            `;
        }

        wrapper.innerHTML = innerHtml;
        chatMessagesContainer.appendChild(wrapper);
    });

    if (!isInternal) {
        renderAdminInvoice();
        renderAdminSavedBills();
        renderAdminOrderRevisions();
        // Đơn CHỜ XÁC NHẬN do order-console.js vẽ; đơn đã xác nhận thì hàm trên vẽ
        // hoá đơn. Hai trạng thái loại trừ nhau nên không chồng lên nhau.
        window.OrderConsole?.renderPending(adminOrder, chatMessagesContainer);
    }

    if (isLoadMore) {
        const heightDiff = chatMessagesContainer.scrollHeight - previousScrollHeight;
        chatMessagesContainer.scrollTop = heightDiff > 0 ? heightDiff : previousScrollTop;
    } else {
        if (forceScrollToLatest || isFirstLoad || isNearBottom) {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
    }
}


// ── Chen thẻ đơn / hoá đơn vào ĐÚNG CHỖ theo thời gian ──────────────────────
//
// Trước đây thẻ đơn và hoá đơn luôn được appendChild sau khi vẽ xong tin nhắn,
// nên chúng vĩnh viễn nằm cuối khung chat. Hệ quả: mọi tin nhắn gửi SAU khi đặt
// món lại hiện TRƯỚC thẻ đơn — nhìn vào tưởng khách đặt món sau cùng, trong khi
// thực tế đơn có trước cả đoạn trao đổi bên dưới. Với Sale thì đây không phải
// chuyện thẩm mỹ: đọc sai thứ tự là xác nhận nhầm đơn.
//
// Nay mỗi phần tử mang theo mốc thời gian của chính nó, và thẻ đơn tự tìm chỗ
// của mình giữa các tin nhắn.
function stampChatTime(node, when) {
    const stamp = new Date(when || 0).getTime();
    if (Number.isFinite(stamp) && stamp > 0) node.dataset.ts = String(stamp);
    return node;
}

function insertIntoChatFlow(node, when, container) {
    const host = container || chatMessagesContainer;
    if (!host) return;
    const stamp = new Date(when || 0).getTime();
    // Không có mốc thời gian đáng tin thì giữ nguyên hành vi cũ — đặt cuối còn
    // hơn đặt bừa lên đầu.
    if (!Number.isFinite(stamp) || stamp <= 0) return void host.appendChild(node);
    node.dataset.ts = String(stamp);
    const after = Array.from(host.children).find((el) => {
        const ts = Number(el.dataset?.ts);
        return Number.isFinite(ts) && ts > stamp;
    });
    if (after) host.insertBefore(node, after);
    else host.appendChild(node);
}
window.insertIntoChatFlow = insertIntoChatFlow;

// Hiển thị hóa đơn trong luồng chat của Agent: xem trước co theo bề ngang,
// bấm vào mở PDF ở tab mới. Agent cần thấy đúng thứ khách đang nhìn.
function renderAdminInvoice() {
    if (!adminOrder) return;
    // Đơn CHƯA XÁC NHẬN thì chưa có hoá đơn nào cả. Trước đây khối này vẫn hiện
    // với dòng chữ "HÓA ĐƠN ĐÃ GỬI KHÁCH" kèm nhãn trạng thái thô
    // "pending_confirm" — nói sai với Sale hai lần trong một khung: bill chưa
    // gửi, và khách chưa nhận được gì.
    if (adminOrder.status === 'pending_confirm') return;
    // Đơn đã bị thay bằng bản mới (hoặc bị từ chối) không phải tờ đang có hiệu
    // lực: nó là một BẢN CŨ và đã được vẽ trong danh sách bill đã lưu. Vẽ lại ở
    // đây là hiện một tờ hoá đơn mang nhãn "Đã thay bằng đơn mới" như thể nó
    // vẫn còn giá trị.
    if (['superseded', 'rejected', 'cancelled'].includes(String(adminOrder.status || ''))) return;
    const invoice = adminOrder.invoice || {};
    const preview = invoice.svgDataUrl || '';
    const pdf = invoice.pdfUrl || invoice.pdfDataUrl || '';
    if (!preview && !pdf) return;

    const dict = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[currentLang]) || {};
    const statusLabels = {
        pending_confirm: dict.invoiceStatusPending || 'Chờ xác nhận',
        awaiting_payment: dict.invoiceStatusAwaiting || 'Chờ thanh toán',
        paid: dict.invoiceStatusPaid || 'Đã thanh toán',
        rejected: dict.invoiceStatusRejected || 'Đã từ chối',
        superseded: dict.invoiceStatusSuperseded || 'Đã thay bằng đơn mới',
    };
    const methodLabels = {
        cash: dict.payMethodCash || 'Tiền mặt',
        bank_qr: dict.payMethodBankQr || 'Chuyển khoản QR',
        card: dict.payMethodCard || 'Thẻ',
        room_charge: dict.payMethodRoomCharge || 'Cộng vào tiền phòng',
        pay_later: dict.payMethodPayLater || 'Thanh toán sau',
    };
    const methodText = adminOrder.payment_method ? methodLabels[adminOrder.payment_method] || adminOrder.payment_method : '';
    const paymentSelected = adminOrder.status === 'awaiting_payment' && !!methodText;
    const chosenLabel = dict.invoiceChosen || 'Đã chọn';
    const statusText = paymentSelected
        ? `${chosenLabel} ${methodText}`
        : (statusLabels[adminOrder.status] || adminOrder.status || '');
    const statusClass = adminOrder.status === 'paid' ? 'is-paid' : (paymentSelected ? 'is-selected' : 'is-waiting');
    const totalText = new Intl.NumberFormat('vi-VN').format(Number(adminOrder.total_amount || 0));
    const kickerText = dict.invoiceSentToCustomer || 'Hóa đơn đã gửi khách';
    const openPdfText = dict.invoiceOpenPdf || 'Mở PDF';

    const wrapper = document.createElement('div');
    wrapper.className = 'admin-invoice-block';
    wrapper.innerHTML = `
        <div class="admin-invoice-head">
            <span class="admin-invoice-kicker"><i class="ri-receipt-line"></i> ${escapeHtml(kickerText)}</span>
            <span class="admin-invoice-status ${statusClass}">${escapeHtml(statusText)}</span>
        </div>
        ${preview ? `<button type="button" class="admin-invoice-preview attachment-preview-trigger" data-preview-url="${escapeHtml(pdf || preview)}" data-preview-type="document" data-preview-title="${escapeHtml(kickerText)}"><img src="${escapeHtml(preview)}" alt="${escapeHtml(kickerText)}"></button>` : ''}
        <div class="admin-invoice-meta">
            <span><strong>${escapeHtml(totalText)} ₫</strong></span>
            ${methodText ? `<span><i class="ri-bank-card-line"></i> ${escapeHtml(methodText)}</span>` : ''}
            ${pdf ? `<button type="button" class="attachment-preview-trigger admin-invoice-open" data-preview-url="${escapeHtml(pdf)}" data-preview-type="document" data-preview-title="${escapeHtml(kickerText)}"><i class="ri-file-pdf-2-line"></i> ${escapeHtml(openPdfText)}</button>` : ''}
        </div>
    `;
    // Mốc của hoá đơn là lúc GỬI BILL cho khách, không phải lúc tạo đơn: giữa
    // hai mốc đó thường có cả một đoạn khách hỏi thêm món.
    insertIntoChatFlow(
        wrapper,
        adminOrder.bill_sent_at || adminOrder.confirmed_at || adminOrder.updated_at || adminOrder.created_at
    );
}


function renderTags(tagsString) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    detailTags.innerHTML = '';
    if (!tagsString) {
        detailTags.innerHTML = `<span class="text-muted">${dict.unclassified}</span>`;
        return;
    }

    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    tags.forEach(tag => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.textContent = tag;
        detailTags.appendChild(badge);
    });
}


// ----------------------------------------------------
// ACTIONS
// ----------------------------------------------------

async function sendMessage(e) {
    if (e) e.preventDefault();
    if (adminIsSending) return;
    const text = chatInput.value.trim();
    if (!text || !currentSessionId) return;

    if (String(currentSessionId).startsWith('internal_')) {
        return sendInternalMessage(text);
    }

    if (voiceRecorder?.state === 'recording') {
        voiceSkipBatch = true;
        stopVoiceRecording();
    }

    adminIsSending = true;
    stopAgentTyping();
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    chatInput.value = '';
    resizeAgentChatInput();
    
    // Add temp bubble immediately
    const newMsgObj = {
        id: 'temp_' + Date.now(),
        sender: 'agent',
        original_text: text,
        created_at: new Date()
    };
    adminMessages.push(newMsgObj);
    // Luôn đưa agent đến tin mình vừa gửi, kể cả lúc đang xem lịch sử cũ.
    renderAdminMessages(false, true);

    try {
        const response = await authFetch(`${API_BASE}/api/chats/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: currentSessionId,
                sender: 'agent',
                text,
                targetLang: currentDetectedLang,
                adminLang: currentLang
            })
        });

        const data = await response.json();
        if (data.success) {
            // Replace temp message smoothly with the confirmed message returned from server
            const idx = adminMessages.findIndex(m => m.id === newMsgObj.id);
            if (idx !== -1 && data.message) {
                adminMessages[idx] = data.message;
            }
            renderAdminMessages(false, true);
        } else {
            adminMessages = adminMessages.filter(m => m.id !== newMsgObj.id);
            renderAdminMessages(false);
            toastError(dict.sendError + (data.error || ''));
        }
    } catch (e) {
        console.error('Send error:', e);
        adminMessages = adminMessages.filter(m => m.id !== newMsgObj.id);
        renderAdminMessages(false);
    } finally {
        adminIsSending = false;
    }
}


async function sendAttachment(file) {
    if (!file || !currentSessionId || adminIsUploadingAttachment) return;
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    adminIsUploadingAttachment = true;
    const tempId = 'temp_' + Date.now();
    const tempObjectUrl = URL.createObjectURL(file);
    const tempType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
    const newMsgObj = {
        id: tempId,
        sender: 'agent',
        original_text: tempType === 'image' ? '📷 [Hình ảnh]' : tempType === 'video' ? '🎥 [Video]' : '📎 [Tài liệu]',
        created_at: new Date(),
        attachment_key: 'pending',
        attachment_url: tempObjectUrl,
        attachment_type: tempType,
        attachment_name: file.name,
        attachment_size: file.size,
    };
    adminMessages.push(newMsgObj);
    renderAdminMessages(false, true);

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sender', 'agent');

        const response = await authFetch(`${API_BASE}/api/chats/${currentSessionId}/attachments`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        const idx = adminMessages.findIndex(m => m.id === tempId);
        if (data.success && data.message) {
            if (idx !== -1) adminMessages[idx] = data.message;
        } else {
            if (idx !== -1) adminMessages.splice(idx, 1);
            toastError(dict.sendError ? dict.sendError + (data.error || '') : (data.error || 'Không thể gửi file.'));
        }
        renderAdminMessages(false, true);
    } catch (e) {
        console.error('Attachment upload error:', e);
        adminMessages = adminMessages.filter(m => m.id !== tempId);
        renderAdminMessages(false);
    } finally {
        URL.revokeObjectURL(tempObjectUrl);
        adminIsUploadingAttachment = false;
    }
}


function resizeAgentChatInput() {
    if (!chatInput) return;
    chatInput.style.height = '0px';
    const lineHeight = Number.parseFloat(getComputedStyle(chatInput).lineHeight) || 21;
    const maxHeight = lineHeight * 5 + 24;
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, maxHeight)}px`;
    chatInput.style.overflowY = chatInput.scrollHeight > maxHeight ? 'auto' : 'hidden';

    const hasText = !!chatInput.value.trim();
    document.getElementById('chat-attach-btn')?.classList.toggle('hide', hasText);
    document.getElementById('chat-mic-btn')?.classList.toggle('hide', hasText || !voiceSupported);
    const sendBtn = chatForm?.querySelector('.send-btn');
    sendBtn?.classList.toggle('hide', !hasText);
}


function setVoiceUi(state) {
    const panel = document.getElementById('voice-live-panel');
    const label = document.getElementById('voice-live-label');
    const micBtn = document.getElementById('chat-mic-btn');
    const readyStage = document.getElementById('voice-ready-stage');
    const title = panel?.querySelector('.voice-live-title');
    const wave = panel?.querySelector('.voice-wave');

    panel?.classList.toggle('hide', state === 'idle');
    panel?.classList.toggle('is-ready', state === 'ready');
    panel?.classList.toggle('is-working', state === 'working');
    chatInputContainer?.classList.toggle('voice-active', state !== 'idle');
    micBtn?.classList.toggle('is-active', state === 'ready');
    micBtn?.classList.toggle('is-recording', state === 'recording' || state === 'working');
    if (label) label.textContent = state === 'working' ? 'Đang nhận diện…' : 'Đang lắng nghe…';

    readyStage?.classList.toggle('hide', state !== 'ready');
    title?.classList.toggle('hide', state === 'ready');
    wave?.classList.toggle('hide', state === 'ready');

    // Khi đang nhận diện nền thì chỉ còn dòng trạng thái, ba thao tác mất nghĩa.
    const hasActions = state === 'recording';
    document.getElementById('voice-live-send')?.classList.toggle('hide', !hasActions);
    panel?.querySelector('.voice-live-actions')?.classList.toggle('hide', !hasActions);
    updateVoiceSendState();
    resizeAgentChatInput();
}


// Chưa có chữ nào thì không cho bấm Gửi — tránh gửi tin rỗng.
function updateVoiceSendState() {
    const pulse = document.getElementById('voice-live-send');
    const sendAction = document.getElementById('voice-send-btn');
    const disabled = voiceBusy || (!voiceRecorder || voiceRecorder.state !== 'recording') && !chatInput?.value.trim();
    if (pulse) pulse.disabled = disabled;
    if (sendAction) sendAction.disabled = disabled;
}


function stopVoiceTracks() {
    voiceStream?.getTracks().forEach((track) => track.stop());
    voiceStream = null;
}


function renderVoiceTimer(seconds) {
    const timer = document.getElementById('voice-live-timer');
    if (timer) timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}


function tickVoiceTimer() {
    const seconds = Math.floor((Date.now() - voiceStartedAt) / 1000);
    renderVoiceTimer(seconds);
    if (seconds >= VOICE_MAX_SECONDS) stopVoiceRecording();
}


function applyVoiceDraft(text) {
    if (!chatInput) return;
    chatInput.value = [voiceDraftBefore.trim(), String(text || '').trim()].filter(Boolean).join(' ');
    resizeAgentChatInput();
    updateVoiceSendState();
}


function startRealtimeRecognition() {
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = VOICE_RECOGNITION_LOCALES[currentLang] || currentLang || 'vi-VN';
    recognition.onresult = (event) => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index];
            const text = result[0]?.transcript?.trim() || '';
            if (!text || /^[.\s,。!?…·\-_:;'"“”‘’`~]+$/.test(text)) continue;
            if (result.isFinal) voiceFinalText = [voiceFinalText, text].filter(Boolean).join(' ');
            else interim = [interim, text].filter(Boolean).join(' ');
        }
        const spoken = [voiceFinalText, interim].filter(Boolean).join(' ').trim();
        voiceLiveText = /^[.\s,。!?…·\-_:;'"“”‘’`~]+$/.test(spoken) ? '' : spoken;
        applyVoiceDraft(voiceLiveText);
    };
    // Web Speech lỗi hay không hỗ trợ thì im lặng — Groq vẫn là đường dự phòng.
    recognition.onerror = () => {};
    recognition.onend = () => {
        if (voiceRecorder?.state === 'recording' && !voiceCancelled) {
            setTimeout(() => { try { recognition.start(); } catch { /* thử lại ở lần ghi sau */ } }, 120);
        }
    };
    voiceRecognition = recognition;
    try { recognition.start(); } catch { voiceRecognition = null; }
}


function stopRealtimeRecognition(abort) {
    const recognition = voiceRecognition;
    voiceRecognition = null;
    if (!recognition) return;
    recognition.onend = null;
    try { abort ? recognition.abort() : recognition.stop(); } catch { /* đã dừng */ }
}


async function startVoiceRecording() {
    if (!currentSessionId || voiceBusy || !voiceSupported) return;
    // Đóng bàn phím mobile trước khi mở panel ghi âm ở chính vùng composer.
    chatInput?.blur();
    voiceCancelled = false;
    voiceSkipBatch = false;
    voiceChunks = [];
    voiceFinalText = '';
    voiceLiveText = '';
    voiceDraftBefore = chatInput?.value || '';
    try {
        voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
        const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
        toastError(denied
            ? 'Trình duyệt đang chặn micro. Bấm biểu tượng khóa cạnh thanh địa chỉ và cho phép Micro, rồi thử lại.'
            : 'Không truy cập được micro trên thiết bị này.');
        return;
    }

    // Để trình duyệt tự chọn định dạng: Chrome ra WebM, iPhone ra MP4 — Whisper
    // trên Groq nhận cả hai nên không cần ép codec.
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType = preferred.find((type) => window.MediaRecorder.isTypeSupported?.(type));
    voiceRecorder = new MediaRecorder(voiceStream, mimeType ? { mimeType } : undefined);
    voiceRecorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size) voiceChunks.push(event.data);
    });
    voiceRecorder.addEventListener('stop', () => { void finishVoiceRecording(); });

    voiceRecorder.start();
    voiceStartedAt = Date.now();
    setVoiceUi('recording');
    renderVoiceTimer(0);
    voiceTimerId = setInterval(tickVoiceTimer, 250);
    startRealtimeRecognition();
}


function stopVoiceRecording() {
    if (voiceTimerId) { clearInterval(voiceTimerId); voiceTimerId = null; }
    stopRealtimeRecognition();
    if (voiceRecorder && voiceRecorder.state !== 'inactive') voiceRecorder.stop();
    else { stopVoiceTracks(); setVoiceUi('idle'); }
}


// Xóa: bỏ cả phần chữ có sẵn trước khi ghi lẫn transcript vừa nhận, như portal.
function cancelVoiceRecording() {
    voiceCancelled = true;
    voiceSendPending = false;
    stopRealtimeRecognition(true);
    voiceDraftBefore = '';
    voiceFinalText = '';
    voiceLiveText = '';
    if (chatInput) chatInput.value = '';
    setVoiceUi('idle');
    stopVoiceRecording();
}


// Chỉnh sửa: đóng panel, đưa con trỏ về ô nhập, giữ nguyên chữ đã nhận.
function editVoiceRecording() {
    voiceSkipBatch = false;
    stopVoiceRecording();
    setVoiceUi('idle');
    chatInput?.focus();
    chatInput?.setSelectionRange?.(chatInput.value.length, chatInput.value.length);
}


async function finishVoiceRecording() {
    stopVoiceTracks();
    const chunks = voiceChunks;
    voiceChunks = [];
    const type = voiceRecorder?.mimeType || 'audio/webm';
    voiceRecorder = null;

    if (voiceCancelled || !chunks.length || voiceSkipBatch) {
        voiceSkipBatch = false;
        voiceSendPending = false;
        setVoiceUi('idle');
        return;
    }

    const liveText = voiceLiveText.trim();
    const draftAtStop = [voiceDraftBefore.trim(), liveText].filter(Boolean).join(' ');
    let returnToReady = false;

    // Đã có transcript realtime thì trả giao diện về ngay; Groq vẫn chạy nền để
    // sửa lại kết quả cuối, miễn là người dùng chưa tự gõ đè trong lúc chờ.
    setVoiceUi(liveText ? 'idle' : 'working');
    voiceBusy = !liveText;
    try {
        const blob = new Blob(chunks, { type });
        const extension = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
        const form = new FormData();
        form.append('audio', blob, `voice.${extension}`);
        form.append('language', currentLang || 'vi');

        const response = await authFetch(`${API_BASE}/api/chats/${currentSessionId}/transcribe`, {
            method: 'POST',
            body: form,
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Không nhận diện được giọng nói.');

        const rawText = String(data.text || '').trim();
        const cleanText = /^[.\s,。!?…·\-_:;'"“”‘’`~]+$/.test(rawText) ? '' : rawText;
        if (!cleanText) throw new Error('Không nghe thấy giọng nói để chuyển thành văn bản.');

        const refined = [voiceDraftBefore.trim(), cleanText].filter(Boolean).join(' ');
        if (!refined.trim()) throw new Error('Không nghe thấy giọng nói để chuyển thành văn bản.');
        if (chatInput && (!liveText || chatInput.value.trim() === draftAtStop.trim())) {
            chatInput.value = refined;
            chatInput.focus();
            chatInput.setSelectionRange?.(chatInput.value.length, chatInput.value.length);
        }
        if (voiceSendPending && chatInput?.value.trim()) {
            voiceSendPending = false;
            setVoiceUi('idle');
            await sendMessage();
            returnToReady = true;
        }
    } catch (error) {
        // Có transcript realtime rồi thì lỗi bước hiệu chỉnh nền không được che
        // mất chữ hoặc làm gián đoạn người dùng.
        voiceSendPending = false;
        if (!liveText) {
            toastError(error.message || 'Không nghe thấy giọng nói để chuyển thành văn bản.');
            returnToReady = true;
        }
    } finally {
        voiceBusy = false;
        setVoiceUi(returnToReady ? 'ready' : 'idle');
        resizeAgentChatInput();
    }
}


// Gửi: dừng ghi, bỏ luôn bước hiệu chỉnh nền rồi gửi ngay chữ đang có.
function sendVoiceDraft() {
    if (voiceBusy) return;
    const hasRealtimeText = !!chatInput?.value.trim();
    if (hasRealtimeText) {
        voiceSkipBatch = true;
        voiceSendPending = false;
        stopVoiceRecording();
        setVoiceUi('working');
        void sendMessage().finally(() => setVoiceUi('ready'));
        return;
    }
    // Giống Zalo: người dùng được bấm Gửi ngay cả khi STT chưa kịp trả chữ.
    // Dừng thu, nhận diện file ngắn vừa ghi rồi tự gửi ngay khi có kết quả.
    voiceSkipBatch = false;
    voiceSendPending = true;
    stopVoiceRecording();
    setVoiceUi('working');
}


async function claimCurrentChat() {
    if (!currentSessionId) return;
    const response = await authFetch(`${API_BASE}/api/admin/chats/${currentSessionId}/claim`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) return toastError(data.error || 'Không thể tiếp nhận chat.');

    // Chỉ cập nhật quyền tại chỗ. Trước đây gọi selectSession() nên khung chat
    // bị xoá trắng, tải lại toàn bộ tin nhắn, mất vị trí cuộn và nội dung đang soạn.
    const sess = sessionsList.find(s => s.id === currentSessionId);
    if (sess) {
        sess.claimed_by_admin_id = data.claimedByAdminId ?? CURRENT_ADMIN?.id ?? sess.claimed_by_admin_id;
        if (data.operatorNo) sess.operator_no = data.operatorNo;
        applyChatPermissionUI(sess);
        chatInput?.focus();
    }
    // Tin hệ thống "Tổng đài viên số XXX đã tiếp nhận" sẽ tự hiện ở lần
    // poll tin nhắn kế tiếp (2 giây), không cần vẽ lại khung chat.
    // Danh sách bên trái cập nhật ngầm, không đụng vào khung chat
    fetchSessions().catch(() => {});
}


// --- ASSIGNEE SELECTOR LOGIC ---
async function loadAssigneesForChat(projectId) {
    if (!chatAssigneeSelect) return;
    try {
        const url = `${API_BASE}/api/admin/assignees?projectId=${encodeURIComponent(projectId || '')}&_=${Date.now()}`;
        const res = await authFetch(url);
        if (res.ok) {
            cachedAssigneesList = await res.json();
            populateAssigneeSelect(cachedAssigneesList);
        }
    } catch (e) {
        console.error('Error loading assignees:', e);
    }
}


function populateAssigneeSelect(staffList) {
    if (!chatAssigneeSelect) return;
    const currentVal = chatAssigneeSelect.value;
    chatAssigneeSelect.innerHTML = '<option value="">-- Chưa chỉ định --</option>';
    
    if (Array.isArray(staffList)) {
        const allowedRoles = CURRENT_ADMIN?.role === 'project_admin'
            ? new Set(['agent', 'sale'])
            : new Set(['project_admin', 'agent', 'sale']);
        staffList.filter(admin => allowedRoles.has(admin.role)).forEach(admin => {
            const opt = document.createElement('option');
            opt.value = admin.id;
            const roleLabel = admin.role === 'project_admin' ? 'Admin' : 'Agent';
            opt.textContent = `${admin.full_name || admin.username} (${roleLabel})`;
            chatAssigneeSelect.appendChild(opt);
        });
    }
    if (currentVal) chatAssigneeSelect.value = currentVal;
}


async function closeActiveSession() {
    if (!currentSessionId) return;
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    if (!await pastieConfirm(dict.closeConfirm, { title: 'Đóng cuộc trò chuyện', confirmText: 'Đóng' })) return;

    closeSessionBtn.disabled = true;
    closeSessionBtn.innerHTML = `<i class="ri-loader-4-line"></i> ${dict.closingStatus}`;

    try {
        const response = await authFetch(`${API_BASE}/api/chats/session/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: currentSessionId })
        });
        const data = await response.json();

        if (data.success) {
            // Refresh sessions list
            await fetchSessions();
            // Re-select session to display AI summary and tags
            await selectSession(currentSessionId);
        }
    } catch (e) {
        toastError(dict.closeError);
    } finally {
        closeSessionBtn.disabled = false;
        closeSessionBtn.innerHTML = `<i class="ri-close-circle-line"></i> ${dict.closeChat}`;
    }
}


function resetActiveChatUI() {
    if (adminVisitorTypingPollTimer) {
        clearInterval(adminVisitorTypingPollTimer);
        adminVisitorTypingPollTimer = null;
    }
    stopAgentTyping();
    renderVisitorTypingIndicator(false);
    adminOrder = null;
    adminBills = [];
    adminOrderSignature = '';
    currentSessionId = null;
    if (messagePollInterval) clearInterval(messagePollInterval);
    messagePollInterval = null;
    dashboardBody?.classList.remove('chat-open', 'details-open');
    
    chatHeaderActions.classList.add('hide');
    chatInputContainer.classList.add('hide');
    detailsSidebar.classList.add('hide');
    
    const dictObj = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    chatTitleName.textContent = dictObj.noChatSelected;
    chatTitleEmail.textContent = dictObj.selectChatPrompt;
    
    const chatHeaderProjectBadge = document.getElementById('chat-header-project-badge');
    if (chatHeaderProjectBadge) {
        chatHeaderProjectBadge.classList.add('hide');
    }
    const groupBadge = document.getElementById('chat-header-group-badge');
    if (groupBadge) groupBadge.classList.add('hide');
    const qrInfoEl = document.getElementById('chat-header-qr-info');
    if (qrInfoEl) qrInfoEl.classList.add('hide');
    
    chatMessagesContainer.innerHTML = `
        <div class="chat-welcome-state">
            <i class="ri-message-3-line"></i>
            <p>${dictObj.welcomePrompt}</p>
        </div>
    `;
    
    // De-select all cards
    document.querySelectorAll('.session-card').forEach(c => {
        c.classList.remove('active-selected');
    });
}


async function deleteActiveSession() {
    if (!currentSessionId) return;
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    if (!await pastieConfirm(dict.deleteConfirm, { title: 'Xoá cuộc trò chuyện', confirmText: 'Xoá', danger: true })) return;

    // Nút này bị khóa cứng 32x30px (icon-only theo thiết kế) — nhét thêm chữ vào
    // sẽ tràn ra ngoài đè lên nút bên cạnh, nên luôn chỉ đổi icon, không thêm text.
    deleteSessionBtn.disabled = true;
    deleteSessionBtn.title = dict.deleteChat;
    deleteSessionBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i>`;

    try {
        const response = await authFetch(`${API_BASE}/api/admin/chats/${currentSessionId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            resetActiveChatUI();
            await fetchSessions();
            toastSuccess(dict.deleteSuccess);
        } else {
            toastError(dict.deleteError + (data.error ? ': ' + data.error : ''));
        }
    } catch (e) {
        console.error('Delete chat error:', e);
        toastError(dict.deleteError);
    } finally {
        deleteSessionBtn.disabled = false;
        deleteSessionBtn.innerHTML = `<i class="ri-delete-bin-line"></i>`;
    }
}


function formatAttachmentSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isAttachmentPlaceholder = (text) => ATTACHMENT_PLACEHOLDERS.has(String(text || '').trim());


function renderAttachmentHtml(msg) {
    if (!msg.attachment_key || !msg.attachment_url) return '';
    const url = escapeHtml(msg.attachment_url);
    const name = escapeHtml(msg.attachment_name || 'file');
    const sizeStr = formatAttachmentSize(msg.attachment_size);

    if (msg.attachment_type === 'image') {
        return `<button type="button" class="attachment-card attachment-image attachment-preview-trigger" data-preview-url="${url}" data-preview-type="image" data-preview-title="${name}">
            <img src="${url}" alt="${name}" loading="lazy" />
        </button>`;
    }
    if (msg.attachment_type === 'video') {
        // Không dùng thanh điều khiển mặc định trong bong bóng chat: mỗi trình
        // duyệt vẽ một kiểu và chiếm mất phần đáng kể của khung hình nhỏ. Chỉ hiện
        // khung hình đầu tiên kèm nút play trong suốt; bấm vào mở trình xem lớn.
        return `<button type="button" class="attachment-card attachment-video attachment-preview-trigger" data-preview-url="${url}" data-preview-type="video" data-preview-title="${name}">
            <video src="${url}" preload="metadata" muted playsinline></video>
            <span class="attachment-play"><i class="ri-play-fill"></i></span>
        </button>`;
    }
    return `<button type="button" class="attachment-card attachment-document attachment-preview-trigger" data-preview-url="${url}" data-preview-type="document" data-preview-title="${name}">
        <i class="ri-file-text-line"></i>
        <div class="attachment-doc-info">
            <span class="attachment-doc-name">${name}</span>
            ${sizeStr ? `<span class="attachment-doc-size">${sizeStr}</span>` : ''}
        </div>
        <i class="ri-eye-line attachment-doc-download"></i>
    </button>`;
}


function closeMediaPreview() {
    mediaPreviewModal?.classList.add('hide');
    if (mediaPreviewImage) mediaPreviewImage.removeAttribute('src');
    if (mediaPreviewVideo) { mediaPreviewVideo.pause(); mediaPreviewVideo.removeAttribute('src'); }
    if (mediaPreviewFrame) mediaPreviewFrame.removeAttribute('src');
}


function openMediaPreview(url, type = 'document', title = 'Tệp đính kèm') {
    if (!url || !mediaPreviewModal) return;
    if (mediaPreviewTitle) mediaPreviewTitle.textContent = title;
    mediaPreviewImage?.classList.toggle('hide', type !== 'image');
    mediaPreviewVideo?.classList.toggle('hide', type !== 'video');
    mediaPreviewFrame?.classList.toggle('hide', type === 'image' || type === 'video');
    if (type === 'image' && mediaPreviewImage) mediaPreviewImage.src = url;
    else if (type === 'video' && mediaPreviewVideo) mediaPreviewVideo.src = url;
    else if (mediaPreviewFrame) mediaPreviewFrame.src = url;
    mediaPreviewModal.classList.remove('hide');
}

function closePushPermissionModal() { pushPermissionModal?.classList.add('hide'); }

// Dùng chung cho mục "Bật thông báo" trong menu Cài đặt và nút thông báo riêng
// trên header (Agent không có menu Cài đặt nên cần nút ngoài).
function handleEnablePushClick() {
    document.getElementById('settings-dropdown-menu')?.classList.add('hide');
    // Nhúng trong iframe: KHÔNG mở popup của iframe (bị trình duyệt chặn), chỉ nhờ trang cha xin quyền.
    if (inIframe) { postToParent({ type: 'pastie-enable-notifications' }); return; }
    const supportIssue = getPushSupportIssue();
    if (supportIssue) { setPushModalMode(supportIssue); pushPermissionModal?.classList.remove('hide'); return; }
    if (Notification.permission === 'granted') return enablePushNotifications().then(closePushPermissionModal).catch(console.error);
    pushPermissionModal?.classList.remove('hide');
}
