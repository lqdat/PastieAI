// --- Translation Dictionary ---
const TRANSLATIONS = {
    vi: {
        loginTitle: "Pastie AI Admin",
        loginSubtitle: "Nhập mật khẩu quản trị để kết nối console",
        passwordPlaceholder: "Mật khẩu bảo mật...",
        loginError: "Mật khẩu không hợp lệ, vui lòng thử lại.",
        loginBtn: "Kết Nối Console",
        headerTitle: "Pastie AI Console",
        allProjects: "Tất cả dự án",
        exportCsv: "Xuất CSV (Sales Script)",
        exportJsonl: "Xuất JSONL (AI Train)",
        logoutTitle: "Đăng xuất",
        chatListTitle: "Hội thoại chat",
        refreshTitle: "Tải lại",
        loadingConversations: "Đang tải cuộc hội thoại...",
        noChatSelected: "Chưa chọn phòng chat",
        selectChatPrompt: "Vui lòng chọn cuộc hội thoại từ danh sách bên trái",
        closeChat: "Đóng cuộc chat",
        welcomePrompt: "Chọn một cuộc trò chuyện để bắt đầu tương tác & dịch thuật tự động.",
        aiTranslationPrompt: "AI sẽ tự động dịch tin nhắn của bạn sang ngôn ngữ của khách",
        chatInputPlaceholder: "Gõ câu trả lời tại đây...",
        detailsTitle: "Thông tin chi tiết",
        detectedLangLabel: "Ngôn ngữ phát hiện",
        notDetected: "Chưa phát hiện",
        intentTagsLabel: "AI Phân tích ý định (Intent Tags)",
        aiSummaryLabel: "AI Tóm tắt nội dung cuộc chat",
        closeChatToAnalyze: "Nhấn nút \"Đóng cuộc chat\" để AI phân tích và tóm tắt cuộc trò chuyện này.",
        projectLabel: "Dự án / Trang web",
        clientInfoLabel: "Trình duyệt & Thiết bị",
        
        // Dynamic labels & alerts
        statusActive: "đang chat",
        statusClosed: "đã đóng",
        noEmail: "Không có email",
        emptyConversations: "Không tìm thấy cuộc hội thoại nào.",
        emptyChatHistory: "Mạch hội thoại bắt đầu. Chưa có tin nhắn nào.",
        translatingWithAI: "Đang dịch thuật bằng AI...",
        sentJustNow: "Gửi lúc này",
        closeConfirm: "Bạn có chắc chắn muốn đóng cuộc trò chuyện này? AI sẽ tự động phân tích và tóm tắt.",
        closingStatus: "Đang phân tích...",
        unclassified: "Chưa phân loại",
        connecting: "Đang kết nối...",
        connError: "Không thể kết nối tới server.",
        closeError: "Lỗi đóng phiên chat.",
        sendError: "Lỗi gửi tin nhắn: ",
        loadOlder: "Xem tin nhắn cũ hơn",
        loadingMore: "Đang tải...",
        labelOriginal: "BẢN GỐC:",
        labelAiTranslation: "AI DỊCH:",
        deleteChat: "Xóa cuộc chat",
        deleteConfirm: "Bạn có chắc chắn muốn XÓA VĨNH VIỄN cuộc trò chuyện này cùng toàn bộ tin nhắn lịch sử? Thao tác này không thể hoàn tác.",
        deleteSuccess: "Đã xóa cuộc trò chuyện thành công.",
        deleteError: "Lỗi khi xóa cuộc trò chuyện."
    },
    en: {
        loginTitle: "Pastie AI Admin",
        loginSubtitle: "Enter admin password to connect console",
        passwordPlaceholder: "Secure password...",
        loginError: "Invalid password, please try again.",
        loginBtn: "Connect Console",
        headerTitle: "Pastie AI Console",
        allProjects: "All Projects",
        exportCsv: "Export CSV (Sales Script)",
        exportJsonl: "Export JSONL (AI Train)",
        logoutTitle: "Logout",
        chatListTitle: "Chat Conversations",
        refreshTitle: "Refresh",
        loadingConversations: "Loading conversations...",
        noChatSelected: "No chat selected",
        selectChatPrompt: "Please select a conversation from the list on the left",
        closeChat: "Close chat",
        welcomePrompt: "Select a conversation to start interaction & auto translation.",
        aiTranslationPrompt: "AI will automatically translate your message to the visitor's language",
        chatInputPlaceholder: "Type your reply here...",
        detailsTitle: "Details",
        detectedLangLabel: "Detected language",
        notDetected: "Not detected",
        intentTagsLabel: "AI Intent Analysis (Intent Tags)",
        aiSummaryLabel: "AI Chat Summary",
        closeChatToAnalyze: "Click \"Close chat\" to analyze and summarize this conversation.",
        projectLabel: "Project / Website",
        clientInfoLabel: "Browser & Device",

        // Dynamic labels & alerts
        statusActive: "active",
        statusClosed: "closed",
        noEmail: "No email",
        emptyConversations: "No conversations found.",
        emptyChatHistory: "Conversation started. No messages yet.",
        translatingWithAI: "Translating with AI...",
        sentJustNow: "Sent just now",
        closeConfirm: "Are you sure you want to close this conversation? AI will automatically analyze and summarize.",
        closingStatus: "Analyzing...",
        unclassified: "Unclassified",
        connecting: "Connecting...",
        connError: "Unable to connect to server.",
        closeError: "Failed to close chat session.",
        sendError: "Failed to send message: ",
        loadOlder: "Load older messages",
        loadingMore: "Loading...",
        labelOriginal: "ORIGINAL:",
        labelAiTranslation: "AI TRANSLATION:",
        deleteChat: "Delete chat",
        deleteConfirm: "Are you sure you want to PERMANENTLY DELETE this conversation along with all messages? This action cannot be undone.",
        deleteSuccess: "Conversation deleted successfully.",
        deleteError: "Failed to delete conversation."
    },
    ru: {
        loginTitle: "Панель Pastie AI",
        loginSubtitle: "Введите пароль администратора для подключения",
        passwordPlaceholder: "Пароль...",
        loginError: "Неверный пароль, попробуйте еще раз.",
        loginBtn: "Войти в консоль",
        headerTitle: "Консоль Pastie AI",
        allProjects: "Все проекты",
        exportCsv: "Экспорт CSV (Скрипты продаж)",
        exportJsonl: "Экспорт JSONL (Обучение ИИ)",
        logoutTitle: "Выйти",
        chatListTitle: "Диалоги",
        refreshTitle: "Обновить",
        loadingConversations: "Загрузка диалогов...",
        noChatSelected: "Чат не выбран",
        selectChatPrompt: "Пожалуйста, выберите диалог из списка слева",
        closeChat: "Закрыть чат",
        welcomePrompt: "Выберите диалог для начала общения и автоперевода.",
        aiTranslationPrompt: "ИИ автоматически переведет ваше сообщение на язык посетителя",
        chatInputPlaceholder: "Введите ваш ответ здесь...",
        detailsTitle: "Детали",
        detectedLangLabel: "Обнаруженный язык",
        notDetected: "Не определен",
        intentTagsLabel: "Анализ намерений ИИ (Intent Tags)",
        aiSummaryLabel: "Сводка диалога от ИИ",
        closeChatToAnalyze: "Нажмите \"Закрыть чат\", чтобы ИИ проанализировал и сделал резюме диалога.",
        projectLabel: "Проект / Сайт",
        clientInfoLabel: "Браузер и устройство",

        // Dynamic labels & alerts
        statusActive: "активен",
        statusClosed: "закрыт",
        noEmail: "Нет email",
        emptyConversations: "Диалоги не найдены.",
        emptyChatHistory: "Диалог начат. Сообщений пока нет.",
        translatingWithAI: "Перевод с помощью ИИ...",
        sentJustNow: "Отправлено только что",
        closeConfirm: "Вы уверены, что хотите закрыть этот диалог? ИИ автоматически проанализирует и составит сводку.",
        closingStatus: "Анализ...",
        unclassified: "Не классифицировано",
        connecting: "Подключение...",
        connError: "Не удалось подключиться к серверу.",
        closeError: "Не удалось закрыть сессию чата.",
        sendError: "Ошибка отправки сообщения: ",
        loadOlder: "Загрузить старые сообщения",
        loadingMore: "Загрузка...",
        labelOriginal: "ОРИГИНАЛ:",
        labelAiTranslation: "ИИ-ПЕРЕВОД:",
        deleteChat: "Удалить чат",
        deleteConfirm: "Вы уверены, что хотите НАВСЕГДА УДАЛИТЬ этот диалог и всю историю сообщений? Это действие нельзя отменить.",
        deleteSuccess: "Диалог успешно удален.",
        deleteError: "Не удалось удалить диалог."
    },
    zh: {
        loginTitle: "Pastie AI 管理员",
        loginSubtitle: "输入管理员密码以连接控制台",
        passwordPlaceholder: "安全密码...",
        loginError: "密码无效，请重试。",
        loginBtn: "连接控制台",
        headerTitle: "Pastie AI 控制台",
        allProjects: "所有项目",
        exportCsv: "导出 CSV (销售话术)",
        exportJsonl: "导出 JSONL (AI 训练)",
        logoutTitle: "注销登录",
        chatListTitle: "对话列表",
        refreshTitle: "刷新",
        loadingConversations: "正在加载会话...",
        noChatSelected: "未选择聊天",
        selectChatPrompt: "请从左侧列表选择一个会话",
        closeChat: "结束会话",
        welcomePrompt: "选择一个会话以开始互动与自动翻译。",
        aiTranslationPrompt: "AI 将自动把您的消息翻译成访问者的语言",
        chatInputPlaceholder: "在此输入您的回复...",
        detailsTitle: "详细信息",
        detectedLangLabel: "检测到的语言",
        notDetected: "未检测到",
        intentTagsLabel: "AI 意图分析 (意图标签)",
        aiSummaryLabel: "AI 对话摘要",
        closeChatToAnalyze: "点击 \"结束会话\" 让 AI 分析并总结此次对话。",
        projectLabel: "项目 / 网站",
        clientInfoLabel: "浏览器与设备",

        // Dynamic labels & alerts
        statusActive: "对话中",
        statusClosed: "已关闭",
        noEmail: "无邮箱",
        emptyConversations: "未找到任何会话。",
        emptyChatHistory: "会话开始。暂无消息。",
        translatingWithAI: "正在通过 AI 翻译...",
        sentJustNow: "刚刚发送",
        closeConfirm: "您确定要结束此会话吗？AI 将自动进行分析和总结。",
        closingStatus: "正在分析...",
        unclassified: "未分类",
        connecting: "正在连接...",
        connError: "无法连接到服务器。",
        closeError: "关闭聊天会话失败。",
        sendError: "发送消息失败: ",
        loadOlder: "加载历史消息",
        loadingMore: "正在加载...",
        labelOriginal: "原文:",
        labelAiTranslation: "AI 翻译:",
        deleteChat: "删除会话",
        deleteConfirm: "您确定要永久删除此会话以及所有历史消息吗？此操作无法撤销。",
        deleteSuccess: "会话已成功删除。",
        deleteError: "删除会话失败。"
    }
};

let currentLang = localStorage.getItem('pastie_admin_lang') || 'vi';

// --- State Variables ---
let currentSessionId = null;
let currentProjectFilter = '';
let currentDetectedLang = 'en'; // default to english for translations
let sessionsList = [];
let pollInterval = null;
let messagePollInterval = null;

// Unread message tracking — persisted in localStorage so refresh doesn't reset badges
const SEEN_KEY = 'pastie_seen_msgs';
function loadSeenCounts() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; }
}
function saveSeenCounts() {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seenMessageCount)); } catch {}
}
const seenMessageCount = loadSeenCounts();

// Admin lazy loading pagination state
let adminMessages = [];
let adminOffset = 0;
let adminLimit = 15;
let adminHasMore = true;
let adminIsLoadingMore = false;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const mainDashboard = document.getElementById('main-dashboard');
const usernameInput = document.getElementById('admin-username-input');
const passwordInput = document.getElementById('admin-password-input');
const loginBtn = document.getElementById('login-btn');
const loginErrorMsg = document.getElementById('login-error-msg');
const projectFilter = document.getElementById('project-filter');
const sessionsListContainer = document.getElementById('sessions-list-container');
const activeChatHeader = document.getElementById('active-chat-header');
const chatTitleName = document.getElementById('chat-title-name');
const chatTitleEmail = document.getElementById('chat-title-email');
const chatHeaderActions = document.getElementById('chat-header-actions');
const chatMessagesContainer = document.getElementById('chat-messages-container');
const chatInputContainer = document.getElementById('chat-input-container');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const detailsSidebar = document.getElementById('details-sidebar-container');
const detailLang = document.getElementById('detail-lang');
const detailTags = document.getElementById('detail-tags');
const detailSummary = document.getElementById('detail-summary');
const closeSessionBtn = document.getElementById('close-session-btn');
const deleteSessionBtn = document.getElementById('delete-session-btn');
const refreshSessionsBtn = document.getElementById('refresh-sessions-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportJsonlBtn = document.getElementById('export-jsonl-btn');
const logoutBtn = document.getElementById('logout-btn');

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
}

// Base URL helper
const API_BASE = window.location.origin;

// ----------------------------------------------------
// AUTHENTICATION LOGIC
// ----------------------------------------------------

function getToken() {
    return localStorage.getItem('pastie_admin_token') || '';
}

function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}), 'Authorization': `Bearer ${token}` };
    return fetch(url, { ...options, headers });
}

async function verifyAuthAndInit() {
    const token = getToken();
    if (!token) {
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/admin/chats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 200) {
            hideLogin();
            initDashboard();
        } else {
            localStorage.removeItem('pastie_admin_token');
            showLogin();
        }
    } catch (e) {
        console.error('Connection error verifying authentication:', e);
        showLogin();
    }
}

function showLogin() {
    loginModal.classList.remove('hide');
    mainDashboard.classList.add('hide');
    if (pollInterval) clearInterval(pollInterval);
    if (messagePollInterval) clearInterval(messagePollInterval);
}

function hideLogin() {
    loginModal.classList.add('hide');
    mainDashboard.classList.remove('hide');
}

async function handleLogin() {
    const username = usernameInput ? usernameInput.value.trim() : 'admin';
    const password = passwordInput.value.trim();
    if (!username || !password) return;

    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    loginBtn.disabled = true;
    loginBtn.innerHTML = dict.connecting || 'Đang kết nối...';
    loginErrorMsg.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok && data.token) {
            localStorage.setItem('pastie_admin_token', data.token);
            hideLogin();
            initDashboard();
        } else {
            loginErrorMsg.style.display = 'block';
            loginErrorMsg.textContent = data.error || (dict.loginError || 'Tài khoản hoặc mật khẩu không hợp lệ.');
            passwordInput.value = '';
        }
    } catch (e) {
        alert(dict.connError || 'Không thể kết nối tới server.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `${dict.loginBtn || 'Kết Nối Console'} <i class="ri-arrow-right-line"></i>`;
    }
}

// ----------------------------------------------------
// DASHBOARD INITIALIZATION & POLLING
// ----------------------------------------------------

function initDashboard() {
    loadAdminProfile();
    fetchSessions();
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(fetchSessions, 7000);
}

async function loadAdminProfile() {
    try {
        const res = await authFetch(`${API_BASE}/api/admin/me`);
        if (!res.ok) return;
        const data = await res.json();
        const nameEl = document.getElementById('admin-profile-name');
        const badgeEl = document.getElementById('admin-profile-badge');
        const manageBtn = document.getElementById('manage-admins-btn');
        if (nameEl) nameEl.textContent = data.full_name || data.username;
        if (badgeEl) badgeEl.style.display = 'flex';
        if (manageBtn && data.role === 'superadmin') manageBtn.classList.remove('hide');
    } catch (e) {
        console.error('Failed to load admin profile:', e);
    }
}

async function fetchSessions() {
    try {
        const response = await authFetch(`${API_BASE}/api/admin/chats?_=${Date.now()}`);
        if (response.status === 401) {
            showLogin();
            return;
        }

        const data = await response.json();
        sessionsList = data;
        
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
    } catch (e) {
        console.error('Error fetching sessions:', e);
    }
}

function updateProjectFilterDropdown(sessions) {
    const existingValue = projectFilter.value;
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    
    // Extract unique project IDs
    const projects = [...new Set(sessions.map(s => s.project_id))].filter(Boolean);
    
    // Rebuild options keeping "Tất cả"
    projectFilter.innerHTML = `<option value="" data-i18n="allProjects">${dict.allProjects}</option>`;
    projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        projectFilter.appendChild(opt);
    });

    projectFilter.value = existingValue;
}

function getBrowserIcon(browser) {
    const b = (browser || '').toLowerCase();
    if (b.includes('chrome')) return 'ri-chrome-fill';
    if (b.includes('safari')) return 'ri-safari-fill';
    if (b.includes('firefox')) return 'ri-firefox-fill';
    if (b.includes('edge')) return 'ri-edge-fill';
    if (b.includes('opera')) return 'ri-opera-fill';
    return 'ri-global-line';
}

function getDeviceIcon(device) {
    const d = (device || '').toLowerCase();
    if (d.includes('iphone') || d.includes('android')) return 'ri-smartphone-line';
    if (d.includes('ipad') || d.includes('tablet')) return 'ri-tablet-line';
    if (d.includes('windows') || d.includes('macos') || d.includes('linux') || d.includes('desktop')) return 'ri-computer-line';
    return 'ri-question-line';
}

function renderSessionsList(sessions) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    // Filter sessions by selected project
    const filtered = currentProjectFilter 
        ? sessions.filter(s => s.project_id === currentProjectFilter)
        : sessions;

    if (filtered.length === 0) {
        sessionsListContainer.innerHTML = `<div class="empty-state" data-i18n="emptyConversations">${dict.emptyConversations}</div>`;
        return;
    }

    sessionsListContainer.innerHTML = '';

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
        const totalMsgsForClass = parseInt(session.message_count) || 0;
        const seenForClass = seenMessageCount[session.id] || 0;
        const hasUnread = session.id !== currentSessionId && totalMsgsForClass > seenForClass;
        card.className = `session-card ${session.id === currentSessionId ? 'active-selected' : ''} ${hasUnread ? 'has-unread' : ''}`;
        card.setAttribute('data-id', session.id);
        
        const locale = currentLang === 'vi' ? 'vi-VN' : currentLang === 'zh' ? 'zh-CN' : currentLang === 'ru' ? 'ru-RU' : 'en-US';
        const msgTime = session.last_message_at || session.created_at;
        const dateStr = new Date(msgTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
            + ' ' + new Date(msgTime).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

        const statusText = session.status === 'active' ? dict.statusActive : dict.statusClosed;

        const totalMsgs = parseInt(session.message_count) || 0;
        const seen = seenMessageCount[session.id] || 0;
        const unread = session.id === currentSessionId ? 0 : Math.max(0, totalMsgs - seen);
        const unreadBadge = unread > 0 ? `<span class="session-unread-badge">${unread > 99 ? '99+' : unread}</span>` : '';

        const preview = session.last_message_preview
            ? session.last_message_preview.substring(0, 45) + (session.last_message_preview.length > 45 ? '…' : '')
            : '';

        const isMC = session.platform && session.platform !== 'widget';

        const avatarHtml = session.visitor_avatar
            ? `<img src="${session.visitor_avatar}" class="visitor-avatar-img" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
              + `<div class="visitor-avatar-initials" style="display:none">${(session.visitor_name || '?')[0].toUpperCase()}</div>`
            : `<div class="visitor-avatar-initials">${(session.visitor_name || '?')[0].toUpperCase()}</div>`;

        const platformMeta = {
            messenger: { icon: 'ri-messenger-fill',  label: 'Messenger', color: '#4267B2' },
            instagram: { icon: 'ri-instagram-fill',  label: 'Instagram', color: '#C13584' },
            whatsapp:  { icon: 'ri-whatsapp-fill',   label: 'WhatsApp',  color: '#25D366' },
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
                        <span class="session-name" title="${session.visitor_name || ''}">${session.visitor_name || 'Khách hàng'}</span>
                        <span class="session-card-time">${dateStr}</span>
                    </div>
                    <div class="session-card-bottom-row">
                        <span class="session-status-badge ${session.status}">${statusText}</span>
                        ${unreadBadge}
                    </div>
                </div>
            </div>
            ${preview ? `<div class="session-card-preview">${escapeHtml(preview)}</div>` : ''}
            <div class="session-meta-footer">
                <span class="session-project" title="${session.project_id}">${session.project_id}</span>
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
                <span class="group-email" title="${group.email}">${group.email}</span>
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

async function selectSession(sessionId) {
    currentSessionId = sessionId;

    // Mark session as seen (clear unread badge) and persist
    const sess = sessionsList.find(s => s.id === sessionId);
    if (sess) { seenMessageCount[sessionId] = parseInt(sess.message_count) || 0; saveSeenCounts(); }

    // Reset pagination states for the newly selected session
    adminMessages = [];
    adminOffset = 0;
    adminHasMore = true;
    adminIsLoadingMore = false;
    
    // Highlight in list
    document.querySelectorAll('.session-card').forEach(c => {
        c.classList.remove('active-selected');
        if (c.getAttribute('data-id') === sessionId) {
            c.classList.add('active-selected');
        }
    });

    const session = sessionsList.find(s => s.id === sessionId);
    if (!session) return;

    // Show header details
    chatTitleName.textContent = session.visitor_name;
    chatTitleEmail.textContent = session.visitor_email;

    // Show visitor avatar in chat header
    const chatHeaderAvatar = document.getElementById('chat-header-avatar');
    if (chatHeaderAvatar) {
        if (session.visitor_avatar) {
            chatHeaderAvatar.style.display = 'block';
            chatHeaderAvatar.innerHTML = `<img src="${session.visitor_avatar}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(99,102,241,0.4);" alt="" onerror="this.parentElement.style.display='none'">`;
        } else {
            const initials = (session.visitor_name || '?')[0].toUpperCase();
            const isSocial = session.platform === 'messenger' || session.platform === 'instagram' || session.platform === 'whatsapp';
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
        if (session.project_id) {
            chatHeaderProjectId.textContent = session.project_id;
            chatHeaderProjectBadge.classList.remove('hide');
        } else {
            chatHeaderProjectBadge.classList.add('hide');
        }
    }

    // Set project ID in details sidebar
    const detailProjectId = document.getElementById('detail-project-id');
    if (detailProjectId) {
        detailProjectId.textContent = session.project_id || '-';
    }

    // Set browser and device details in details sidebar
    const detailBrowserName = document.getElementById('detail-browser-name');
    const detailBrowserIcon = document.getElementById('detail-browser-icon');
    const detailDeviceName = document.getElementById('detail-device-name');
    const detailDeviceIcon = document.getElementById('detail-device-icon');

    const browserVal = session.browser || 'Chrome';
    const deviceVal = session.device || 'Desktop';

    if (detailBrowserName) detailBrowserName.textContent = browserVal;
    if (detailDeviceName) detailDeviceName.textContent = deviceVal;

    if (detailBrowserIcon) {
        detailBrowserIcon.className = getBrowserIcon(browserVal);
    }
    if (detailDeviceIcon) {
        detailDeviceIcon.className = getDeviceIcon(deviceVal);
    }

    chatHeaderActions.classList.remove('hide');
    chatInputContainer.classList.remove('hide');
    detailsSidebar.classList.remove('hide');

    // Update details side panel
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    currentDetectedLang = session.detected_language || 'unknown';
    const detailLangSelect = document.getElementById('detail-lang-select');
    if (detailLangSelect) {
        detailLangSelect.value = currentDetectedLang;
    }
    
    renderTags(session.intent_tags);
    detailSummary.textContent = session.ai_summary || dict.closeChatToAnalyze;

    // Manage input visibility based on status
    if (session.status === 'closed') {
        chatInputContainer.classList.add('hide');
        closeSessionBtn.classList.add('hide');
    } else {
        chatInputContainer.classList.remove('hide');
        closeSessionBtn.classList.remove('hide');
    }

    // Show premium loading spinner inside messages container
    chatMessagesContainer.innerHTML = `
        <div class="chat-loading-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 15px; color: var(--text-secondary);">
            <div class="spinner-glow" style="width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.05); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);"></div>
            <span style="font-size: 13.5px; font-weight: 500; letter-spacing: 0.3px; color: var(--text-muted);">${dict.translatingWithAI || 'Đang dịch thuật bằng AI...'}</span>
        </div>
    `;

    // Load messages
    await loadMessages(sessionId);

    // Setup real-time message polling
    if (messagePollInterval) clearInterval(messagePollInterval);
    if (session.status === 'active') {
        messagePollInterval = setInterval(async () => {
            if (currentSessionId === sessionId) {
                await loadMessages(sessionId);
            }
        }, 3000);
    }
}

async function loadMessages(sessionId, isLoadMore = false) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    let fetchLimit = adminLimit;
    let fetchOffset = adminOffset;

    if (!isLoadMore) {
        // Fetch all currently loaded messages to keep polling sync complete
        fetchLimit = Math.max(adminMessages.length, adminLimit);
        fetchOffset = 0;
    }

    try {
        const response = await authFetch(`${API_BASE}/api/admin/chats/${sessionId}/messages?adminLang=${currentLang}&limit=${fetchLimit}&offset=${fetchOffset}&_=${Date.now()}`);
        const fetchedMessages = await response.json();

        if (!Array.isArray(fetchedMessages)) return;

        if (isLoadMore) {
            if (fetchedMessages.length < adminLimit) {
                adminHasMore = false;
            }
            // Prepend older messages
            adminMessages = [...fetchedMessages, ...adminMessages];
            adminOffset += fetchedMessages.length;
        } else {
            // Filter out temp client-side messages
            const currentMsgs = adminMessages.filter(m => m.id && !m.id.toString().startsWith('temp_'));

            if (currentMsgs.length === 0) {
                adminMessages = fetchedMessages;
                if (fetchedMessages.length < adminLimit) {
                    adminHasMore = false;
                }
            } else {
                // Update current messages and append new ones
                const merged = [...currentMsgs];
                fetchedMessages.forEach(newMsg => {
                    const idx = merged.findIndex(m => m.id === newMsg.id);
                    if (idx !== -1) {
                        merged[idx] = newMsg;
                    } else {
                        merged.push(newMsg);
                    }
                });

                // Sort ascending by created_at
                merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                adminMessages = merged;
            }
        }

        // Update seen count for current session so unread badge stays cleared
        if (currentSessionId) { seenMessageCount[currentSessionId] = adminMessages.length; saveSeenCounts(); }

        renderAdminMessages(isLoadMore);
    } catch (e) {
        console.error('Error loading messages:', e);
    }
}

function renderAdminMessages(isLoadMore = false) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    const previousScrollHeight = chatMessagesContainer.scrollHeight;
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

        loadMoreBtn.onmouseover = () => { loadMoreBtn.style.background = 'rgba(255, 255, 255, 0.1)'; loadMoreBtn.style.color = 'var(--text-primary)'; };
        loadMoreBtn.onmouseout = () => { loadMoreBtn.style.background = 'rgba(255, 255, 255, 0.05)'; loadMoreBtn.style.color = 'var(--text-secondary)'; };

        loadMoreBtn.onclick = async () => {
            if (adminIsLoadingMore) return;
            adminIsLoadingMore = true;
            loadMoreBtn.textContent = dict.loadingMore;
            await loadMessages(currentSessionId, true);
            adminIsLoadingMore = false;
        };

        loadMoreDiv.appendChild(loadMoreBtn);
        chatMessagesContainer.appendChild(loadMoreDiv);
    }

    if (adminMessages.length === 0) {
        chatMessagesContainer.innerHTML = `<div class="system"><div class="message-bubble">${dict.emptyChatHistory}</div></div>`;
        return;
    }

    adminMessages.forEach(msg => {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${msg.sender}`;

        const locale = currentLang === 'vi' ? 'vi-VN' : currentLang === 'zh' ? 'zh-CN' : currentLang === 'ru' ? 'ru-RU' : 'en-US';
        const timeStr = new Date(msg.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

        let innerHtml = '';
        if (msg.sender === 'visitor') {
            const hasTranslation = msg.translated_text && msg.translated_text !== msg.original_text;
            const primaryText = hasTranslation ? msg.translated_text : msg.original_text;
            innerHtml = `
                <div class="message-bubble">
                    <div class="original-text">${escapeHtml(primaryText)}</div>
                    ${hasTranslation ? `<div class="translated-text-wrapper" data-label="${dict.labelOriginal} ">${escapeHtml(msg.original_text)}</div>` : ''}
                </div>
                <div class="message-time">${timeStr}</div>
            `;
        } else if (msg.sender === 'agent' || msg.sender === 'ai') {
            const hasTranslation = msg.translated_text && msg.translated_text !== msg.original_text;
            innerHtml = `
                <div class="message-bubble">
                    <div class="original-text">${escapeHtml(msg.original_text)}</div>
                    ${hasTranslation ? `<div class="translated-text-wrapper" data-label="${dict.labelAiTranslation} ">${escapeHtml(msg.translated_text)}</div>` : ''}
                </div>
                <div class="message-time">${timeStr}</div>
            `;
        } else {
            // System message
            innerHtml = `
                <div class="message-bubble">
                    <div class="original-text">${escapeHtml(msg.original_text)}</div>
                </div>
            `;
        }

        wrapper.innerHTML = innerHtml;
        chatMessagesContainer.appendChild(wrapper);
    });

    if (isLoadMore) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight - previousScrollHeight;
    } else {
        if (isFirstLoad || isNearBottom) {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
    }
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
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !currentSessionId) return;

    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    chatInput.value = '';
    
    // Add temp bubble immediately
    const newMsgObj = {
        id: 'temp_' + Date.now(),
        sender: 'agent',
        original_text: text,
        created_at: new Date()
    };
    adminMessages.push(newMsgObj);
    renderAdminMessages(false);

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
            // Reload message history to overwrite temp bubble
            await loadMessages(currentSessionId);
        } else {
            alert(dict.sendError + data.error);
        }
    } catch (e) {
        console.error('Send error:', e);
    }
}

async function closeActiveSession() {
    if (!currentSessionId) return;
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    if (!confirm(dict.closeConfirm)) return;

    closeSessionBtn.disabled = true;
    closeSessionBtn.innerHTML = `<i class="ri-loader-4-line"></i> ${dict.closingStatus}`;

    try {
        const response = await fetch(`${API_BASE}/api/chats/session/close`, {
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
        alert(dict.closeError);
    } finally {
        closeSessionBtn.disabled = false;
        closeSessionBtn.innerHTML = `<i class="ri-close-circle-line"></i> ${dict.closeChat}`;
    }
}

function resetActiveChatUI() {
    currentSessionId = null;
    if (messagePollInterval) clearInterval(messagePollInterval);
    
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
    if (!confirm(dict.deleteConfirm)) return;

    deleteSessionBtn.disabled = true;
    deleteSessionBtn.innerHTML = `<i class="ri-loader-4-line"></i> ...`;

    try {
        const response = await authFetch(`${API_BASE}/api/admin/chats/${currentSessionId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            alert(dict.deleteSuccess);
            resetActiveChatUI();
            await fetchSessions();
        } else {
            alert(dict.deleteError + (data.error ? ': ' + data.error : ''));
        }
    } catch (e) {
        console.error('Delete chat error:', e);
        alert(dict.deleteError);
    } finally {
        deleteSessionBtn.disabled = false;
        deleteSessionBtn.innerHTML = `<i class="ri-delete-bin-line"></i> ${dict.deleteChat}`;
    }
}

function handleExport(format) {
    const token = getToken();
    const projectId = projectFilter.value;
    const url = `${API_BASE}/api/admin/export?format=${format}&projectId=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
}

// ----------------------------------------------------
// EVENT LISTENERS & UTILS
// ----------------------------------------------------

// Escaping helper
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Event Bindings
loginBtn.addEventListener('click', handleLogin);
passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

projectFilter.addEventListener('change', (e) => {
    currentProjectFilter = e.target.value;
    renderSessionsList(sessionsList);
});

refreshSessionsBtn.addEventListener('click', fetchSessions);
closeSessionBtn.addEventListener('click', closeActiveSession);
deleteSessionBtn.addEventListener('click', deleteActiveSession);
chatForm.addEventListener('submit', sendMessage);

exportCsvBtn.addEventListener('click', () => handleExport('csv'));
exportJsonlBtn.addEventListener('click', () => handleExport('jsonl'));

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('pastie_admin_token');
    showLogin();
});

// Bind language selection dropdown
const adminLangSelect = document.getElementById('admin-lang-select');
if (adminLangSelect) {
    adminLangSelect.addEventListener('change', (e) => {
        applyTranslations(e.target.value);
    });
}

// Bind visitor detail language select dropdown
const detailLangSelect = document.getElementById('detail-lang-select');
if (detailLangSelect) {
    detailLangSelect.addEventListener('change', async (e) => {
        if (!currentSessionId) return;
        const newLang = e.target.value;
        try {
            const res = await fetch(`${API_BASE}/api/chats/session/language`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    language: newLang
                })
            });
            if (res.ok) {
                currentDetectedLang = newLang;
                const s = sessionsList.find(x => x.id === currentSessionId);
                if (s) {
                    s.detected_language = newLang;
                }
                // Reload messages to update bubble translation rendering instantly based on target language choice
                await loadMessages(currentSessionId);
            }
        } catch(err) {
            console.error('Failed to update session language:', err);
        }
    });
}

// --- AI KNOWLEDGE BASE SETTINGS DIALOG ---
const knowledgeModal = document.getElementById('knowledge-modal');
// --- SETTINGS DROPDOWN TOGGLE ---
const settingsTriggerBtn = document.getElementById('settings-trigger-btn');
const settingsDropdownMenu = document.getElementById('settings-dropdown-menu');
if (settingsTriggerBtn) {
    settingsTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !settingsDropdownMenu.classList.contains('hide');
        if (isOpen) {
            settingsDropdownMenu.classList.add('hide');
            settingsTriggerBtn.classList.remove('open');
        } else {
            settingsDropdownMenu.classList.remove('hide');
            settingsTriggerBtn.classList.add('open');
        }
    });
}
document.addEventListener('click', (e) => {
    if (settingsDropdownMenu && !settingsDropdownMenu.classList.contains('hide')) {
        if (!document.getElementById('settings-dropdown-wrapper').contains(e.target)) {
            settingsDropdownMenu.classList.add('hide');
            settingsTriggerBtn && settingsTriggerBtn.classList.remove('open');
        }
    }
});
function closeSettingsDropdown() {
    settingsDropdownMenu && settingsDropdownMenu.classList.add('hide');
    settingsTriggerBtn && settingsTriggerBtn.classList.remove('open');
}

// --- AI KNOWLEDGE BASE ---
const knowledgeSettingsBtn = document.getElementById('knowledge-settings-btn');
const kbSyncBtn = document.getElementById('kb-sync-btn');
const kbSaveManualBtn = document.getElementById('kb-save-manual-btn');
const kbCloseBtn = document.getElementById('kb-close-btn');
const kbUrlInput = document.getElementById('kb-url-input');
const kbTextArea = document.getElementById('kb-text-area');
const kbSyncStatus = document.getElementById('kb-sync-status');

if (knowledgeSettingsBtn) {
    knowledgeSettingsBtn.addEventListener('click', () => { closeSettingsDropdown(); openKnowledgeModal(); });
}
if (kbCloseBtn) {
    kbCloseBtn.addEventListener('click', closeKnowledgeModal);
}
if (kbSyncBtn) {
    kbSyncBtn.addEventListener('click', syncKnowledgeFromUrl);
}
if (kbSaveManualBtn) {
    kbSaveManualBtn.addEventListener('click', saveKnowledgeManual);
}

async function openKnowledgeModal() {
    knowledgeModal.classList.remove('hide');
    const projectId = 'pastie-landingpage';
    try {
        const [kbResp, kwResp] = await Promise.all([
            authFetch(`${API_BASE}/api/admin/knowledge?projectId=${projectId}`),
            authFetch(`${API_BASE}/api/admin/keywords?projectId=${projectId}`)
        ]);
        const data = await kbResp.json();
        if (data.source_url) {
            kbUrlInput.value = data.source_url === 'manual' ? 'https://pastie-landingpage.vercel.app' : data.source_url;
            kbTextArea.value = data.cleaned_content || '';
            const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US';
            const dateStr = new Date(data.updated_at).toLocaleString(locale);
            kbSyncStatus.innerHTML = `<i class="ri-checkbox-circle-line" style="color: var(--success-color);"></i> <span>Đồng bộ từ <strong>${data.source_url}</strong> lúc ${dateStr}</span>`;
        } else {
            kbSyncStatus.innerHTML = `<i class="ri-information-line" style="color: var(--accent-color);"></i> <span>Chưa có cơ sở dữ liệu tri thức nào được cấu hình.</span>`;
            kbTextArea.value = '';
        }
        // Load keywords
        const kwData = await kwResp.json();
        renderKeywordTags(kwData.keywords || []);
    } catch (e) {
        console.error('Error fetching knowledge settings:', e);
    }
}

function closeKnowledgeModal() {
    knowledgeModal.classList.add('hide');
}

async function syncKnowledgeFromUrl() {
    const url = kbUrlInput.value.trim();
    if (!url) {
        alert('Vui lòng nhập URL!');
        return;
    }

    kbSyncBtn.disabled = true;
    kbSyncBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang đồng bộ...`;
    kbSyncStatus.innerHTML = `<i class="ri-loader-4-line ri-spin" style="color: var(--accent-color);"></i> <span>Đang kết nối & cào dữ liệu từ ${url}...</span>`;

    try {
        const response = await authFetch(`${API_BASE}/api/admin/knowledge/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, projectId: 'pastie-landingpage' })
        });
        
        const data = await response.json();
        if (response.ok) {
            alert(data.message || 'Đồng bộ tri thức từ Landing Page thành công!');
            await openKnowledgeModal(); // Refresh modal info
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể đồng bộ.'));
            kbSyncStatus.innerHTML = `<i class="ri-error-warning-line" style="color: var(--danger-color);"></i> <span>Đồng bộ thất bại: ${data.error || 'Lỗi HTTP'}</span>`;
        }
    } catch (err) {
        alert('Lỗi kết nối mạng: ' + err.message);
        kbSyncStatus.innerHTML = `<i class="ri-error-warning-line" style="color: var(--danger-color);"></i> <span>Lỗi kết nối: ${err.message}</span>`;
    } finally {
        kbSyncBtn.disabled = false;
        kbSyncBtn.innerHTML = `<i class="ri-refresh-line"></i> Đồng bộ`;
    }
}

async function saveKnowledgeManual() {
    const text = kbTextArea.value.trim();
    if (!text) {
        alert('Vui lòng điền nội dung tri thức!');
        return;
    }

    kbSaveManualBtn.disabled = true;
    kbSaveManualBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang lưu...`;

    try {
        const response = await authFetch(`${API_BASE}/api/admin/knowledge/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cleanedContent: text, projectId: 'pastie-landingpage' })
        });
        
        const data = await response.json();
        if (response.ok) {
            alert(data.message || 'Lưu tri thức thủ công thành công!');
            await openKnowledgeModal(); // Refresh modal info
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể lưu.'));
        }
    } catch (err) {
        alert('Lỗi kết nối mạng: ' + err.message);
    } finally {
        kbSaveManualBtn.disabled = false;
        kbSaveManualBtn.innerHTML = `<i class="ri-save-line"></i> Lưu nội dung`;
    }
}

// --- TRANSFER KEYWORDS ---
let currentKeywords = [];

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

window.removeKeyword = function(index) {
    currentKeywords.splice(index, 1);
    renderKeywordTags(currentKeywords);
};

const keywordInput = document.getElementById('keyword-input');
const keywordAddBtn = document.getElementById('keyword-add-btn');
const keywordSaveBtn = document.getElementById('keyword-save-btn');
const keywordStatus = document.getElementById('keyword-status');

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

if (keywordAddBtn) keywordAddBtn.addEventListener('click', addKeyword);
if (keywordInput) keywordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } });

if (keywordSaveBtn) {
    keywordSaveBtn.addEventListener('click', async () => {
        keywordSaveBtn.disabled = true;
        keywordSaveBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang lưu...`;
        try {
            const res = await authFetch(`${API_BASE}/api/admin/keywords`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: currentKeywords, projectId: 'pastie-landingpage' })
            });
            const data = await res.json();
            if (res.ok) {
                if (keywordStatus) keywordStatus.innerHTML = `<i class="ri-checkbox-circle-line" style="color:#34d399;"></i> Đã lưu ${currentKeywords.length} từ khóa`;
            } else {
                if (keywordStatus) keywordStatus.innerHTML = `<i class="ri-error-warning-line" style="color:#f87171;"></i> ${data.error || 'Lỗi lưu'}`;
            }
        } catch (e) {
            if (keywordStatus) keywordStatus.innerHTML = `<i class="ri-error-warning-line" style="color:#f87171;"></i> Lỗi kết nối`;
        } finally {
            keywordSaveBtn.disabled = false;
            keywordSaveBtn.innerHTML = `<i class="ri-save-line"></i> Lưu từ khóa`;
        }
    });
}

// --- CHAT HISTORY SYNTHESIS ---
const synthesisRunBtn = document.getElementById('synthesis-run-btn');
const synthesisStatus = document.getElementById('synthesis-status');

if (synthesisRunBtn) {
    synthesisRunBtn.addEventListener('click', async () => {
        synthesisRunBtn.disabled = true;
        synthesisRunBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang tổng hợp...`;
        if (synthesisStatus) synthesisStatus.textContent = 'Đang phân tích lịch sử chat...';
        try {
            const res = await authFetch(`${API_BASE}/api/admin/kb/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProjectFilter || undefined })
            });
            const data = await res.json();
            if (synthesisStatus) synthesisStatus.textContent = data.success
                ? `✅ ${data.message}`
                : `❌ ${data.error}`;
        } catch (e) {
            if (synthesisStatus) synthesisStatus.textContent = '❌ Lỗi kết nối máy chủ';
        } finally {
            synthesisRunBtn.disabled = false;
            synthesisRunBtn.innerHTML = `<i class="ri-brain-line"></i> Tổng hợp ngay`;
        }
    });
}

// --- META CHANNEL SETTINGS DIALOG ---
const channelModal = document.getElementById('channel-modal');
const channelSettingsBtn = document.getElementById('channel-settings-btn');
const channelCloseBtn = document.getElementById('channel-close-btn');
const channelConfigForm = document.getElementById('channel-config-form');
const channelPlatformSelect = document.getElementById('channel-platform');

if (channelSettingsBtn) {
    channelSettingsBtn.addEventListener('click', () => { closeSettingsDropdown(); openChannelModal(); });
}
if (channelCloseBtn) {
    channelCloseBtn.addEventListener('click', closeChannelModal);
}
if (channelConfigForm) {
    channelConfigForm.addEventListener('submit', saveChannelConfig);
}
if (channelPlatformSelect) {
    channelPlatformSelect.addEventListener('change', (e) => {
        const platform = e.target.value;
        document.getElementById('whatsapp-fields').classList.add('hide');
        document.getElementById('messenger-fields').classList.add('hide');
        document.getElementById('instagram-fields').classList.add('hide');
        
        if (platform === 'whatsapp') {
            document.getElementById('whatsapp-fields').classList.remove('hide');
        } else if (platform === 'messenger') {
            document.getElementById('messenger-fields').classList.remove('hide');
        } else if (platform === 'instagram') {
            document.getElementById('instagram-fields').classList.remove('hide');
        }
    });
}

async function openChannelModal() {
    channelModal.classList.remove('hide');
    const projectId = 'pastie-landingpage';
    try {
        const response = await authFetch(`${API_BASE}/api/admin/channels?projectId=${projectId}`);
        const data = await response.json();
        if (data.config) {
            const config = data.config;
            document.getElementById('channel-platform').value = config.platform || 'whatsapp';
            document.getElementById('channel-meta-verify-token').value = config.meta_verify_token || 'pastie_verify_token_2026';
            document.getElementById('channel-whatsapp-phone-id').value = config.whatsapp_phone_number_id || '';
            document.getElementById('channel-whatsapp-token').value = config.whatsapp_access_token || '';
            document.getElementById('channel-messenger-page-id').value = config.messenger_page_id || '';
            document.getElementById('channel-messenger-token').value = config.messenger_page_access_token || '';
            document.getElementById('channel-instagram-page-id').value = config.instagram_page_id || '';
            document.getElementById('channel-instagram-token').value = config.instagram_access_token || '';
            
            // Trigger change event to show the correct fields group
            channelPlatformSelect.dispatchEvent(new Event('change'));
        }
    } catch (e) {
        console.error('Error fetching channel settings:', e);
    }
}

function closeChannelModal() {
    channelModal.classList.add('hide');
}

async function saveChannelConfig(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('channel-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang lưu...`;
    
    const payload = {
        projectId: 'pastie-landingpage',
        platform: document.getElementById('channel-platform').value,
        metaVerifyToken: document.getElementById('channel-meta-verify-token').value,
        whatsappPhoneNumberId: document.getElementById('channel-whatsapp-phone-id').value,
        whatsappAccessToken: document.getElementById('channel-whatsapp-token').value,
        messengerPageId: document.getElementById('channel-messenger-page-id').value,
        messengerPageAccessToken: document.getElementById('channel-messenger-token').value,
        instagramPageId: document.getElementById('channel-instagram-page-id').value,
        instagramAccessToken: document.getElementById('channel-instagram-token').value
    };
    
    try {
        const response = await authFetch(`${API_BASE}/api/admin/channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok && data.success) {
            alert('Lưu cấu hình kênh tích hợp Meta thành công!');
            closeChannelModal();
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể lưu cấu hình.'));
        }
    } catch (err) {
        alert('Lỗi kết nối: ' + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="ri-save-line"></i> Lưu cấu hình`;
    }
}

// Initial translations load
applyTranslations(currentLang);

// Auto login verify on load
// --- ADMIN USER MANAGEMENT ---
const adminMgmtModal = document.getElementById('admin-management-modal');
const manageAdminsBtn = document.getElementById('manage-admins-btn');
const adminMgmtCloseTopBtn = document.getElementById('admin-mgmt-close-top-btn');
const adminMgmtCloseBtn = document.getElementById('admin-mgmt-close-btn');
const adminUserForm = document.getElementById('admin-user-form');
const adminListContainer = document.getElementById('admin-list-container');

if (manageAdminsBtn) manageAdminsBtn.addEventListener('click', () => { closeSettingsDropdown(); openAdminMgmt(); });
if (adminMgmtCloseTopBtn) adminMgmtCloseTopBtn.addEventListener('click', closeAdminMgmt);
if (adminMgmtCloseBtn) adminMgmtCloseBtn.addEventListener('click', closeAdminMgmt);
if (adminUserForm) adminUserForm.addEventListener('submit', handleAdminUserSubmit);

const adminFormId = document.getElementById('admin-form-id');
const adminFormFullname = document.getElementById('admin-form-fullname');
const adminFormUsername = document.getElementById('admin-form-username');
const adminFormPassword = document.getElementById('admin-form-password');
const adminFormRole = document.getElementById('admin-form-role');
const adminFormActive = document.getElementById('admin-form-active');
const adminFormStatusGroup = document.getElementById('admin-form-status-group');
const adminFormTitle = document.getElementById('admin-form-title');
const adminFormSubmitBtn = document.getElementById('admin-form-submit-btn');
const adminFormCancelBtn = document.getElementById('admin-form-cancel-btn');
if (adminFormCancelBtn) adminFormCancelBtn.addEventListener('click', resetAdminForm);

function openAdminMgmt() {
    if (adminMgmtModal) adminMgmtModal.classList.remove('hide');
    loadAdminUsers();
    resetAdminForm();
}

function closeAdminMgmt() {
    if (adminMgmtModal) adminMgmtModal.classList.add('hide');
}

async function loadAdminUsers() {
    if (!adminListContainer) return;
    adminListContainer.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;">Đang tải...</p>';
    try {
        const res = await authFetch(`${API_BASE}/api/admin/users`);
        const users = await res.json();
        if (!Array.isArray(users)) { adminListContainer.innerHTML = '<p style="color:red;font-size:12px;">Lỗi tải danh sách.</p>'; return; }
        adminListContainer.innerHTML = users.map(u => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.07);">
                <div>
                    <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${escapeHtml(u.full_name)} <span style="font-size:11px;color:var(--text-secondary);">(${escapeHtml(u.username)})</span></div>
                    <div style="font-size:11px;color:${u.role==='superadmin'?'var(--warning-color)':'var(--accent-color)'};">${u.role} · ${u.is_active ? '✓ Hoạt động' : '✗ Vô hiệu'}</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="editAdminUser(${u.id})" style="padding:4px 10px;border-radius:6px;background:rgba(99,102,241,0.15);color:var(--accent-color);border:1px solid rgba(99,102,241,0.3);cursor:pointer;font-size:12px;">Sửa</button>
                    <button onclick="deleteAdminUser(${u.id})" style="padding:4px 10px;border-radius:6px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);cursor:pointer;font-size:12px;">Xóa</button>
                </div>
            </div>
        `).join('');
    } catch(e) {
        adminListContainer.innerHTML = '<p style="color:red;font-size:12px;">Lỗi kết nối.</p>';
    }
}

function resetAdminForm() {
    if (!adminUserForm) return;
    adminUserForm.reset();
    if (adminFormId) adminFormId.value = '';
    if (adminFormTitle) adminFormTitle.textContent = 'Thêm nhân viên mới';
    if (adminFormSubmitBtn) adminFormSubmitBtn.innerHTML = '<i class="ri-user-add-line"></i> Lưu nhân viên';
    if (adminFormCancelBtn) adminFormCancelBtn.style.display = 'none';
    if (adminFormStatusGroup) adminFormStatusGroup.style.display = 'none';
    const pwLabel = document.getElementById('admin-form-password-label');
    if (pwLabel) pwLabel.textContent = 'Mật khẩu';
}

async function editAdminUser(id) {
    try {
        const res = await authFetch(`${API_BASE}/api/admin/users`);
        const users = await res.json();
        const u = users.find(x => x.id === id);
        if (!u) return;
        if (adminFormId) adminFormId.value = u.id;
        if (adminFormFullname) adminFormFullname.value = u.full_name;
        if (adminFormUsername) adminFormUsername.value = u.username;
        if (adminFormPassword) adminFormPassword.value = '';
        if (adminFormRole) adminFormRole.value = u.role;
        if (adminFormActive) adminFormActive.checked = u.is_active;
        if (adminFormStatusGroup) adminFormStatusGroup.style.display = 'flex';
        if (adminFormTitle) adminFormTitle.textContent = 'Chỉnh sửa nhân viên';
        if (adminFormSubmitBtn) adminFormSubmitBtn.innerHTML = '<i class="ri-save-line"></i> Cập nhật';
        if (adminFormCancelBtn) adminFormCancelBtn.style.display = 'inline-flex';
        const pwLabel = document.getElementById('admin-form-password-label');
        if (pwLabel) pwLabel.textContent = 'Mật khẩu mới (để trống nếu không đổi)';
    } catch(e) { console.error(e); }
}

async function deleteAdminUser(id) {
    if (!confirm('Xác nhận xóa tài khoản này?')) return;
    try {
        const res = await authFetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) { loadAdminUsers(); }
        else { alert('Lỗi: ' + (data.error || 'Không thể xóa.')); }
    } catch(e) { alert('Lỗi kết nối.'); }
}

async function handleAdminUserSubmit(e) {
    e.preventDefault();
    const id = adminFormId ? adminFormId.value : '';
    const payload = {
        username: adminFormUsername?.value.trim(),
        password: adminFormPassword?.value.trim(),
        full_name: adminFormFullname?.value.trim(),
        role: adminFormRole?.value,
        is_active: adminFormActive?.checked ?? true
    };
    try {
        const url = id ? `${API_BASE}/api/admin/users/${id}` : `${API_BASE}/api/admin/users`;
        const method = id ? 'PUT' : 'POST';
        const res = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) { resetAdminForm(); loadAdminUsers(); }
        else { alert('Lỗi: ' + (data.error || 'Không thể lưu.')); }
    } catch(e) { alert('Lỗi kết nối.'); }
}

verifyAuthAndInit();
