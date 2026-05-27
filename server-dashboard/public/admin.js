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
        sendError: "Lỗi gửi tin nhắn: "
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
        sendError: "Failed to send message: "
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
        sendError: "Ошибка отправки сообщения: "
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
        sendError: "发送消息失败: "
    }
};

let currentLang = localStorage.getItem('pastie_admin_lang') || 'vi';

// --- State Variables ---
let currentSessionId = null;
let currentProjectFilter = '';
let currentDetectedLang = 'en'; // default to english for translations
let sessionsList = [];
let pollInterval = null;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const mainDashboard = document.getElementById('main-dashboard');
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
            const dl = document.getElementById('detail-lang');
            if (dl && (!session.detected_language || session.detected_language === 'unknown')) {
                dl.textContent = dictObj.notDetected;
            }
        }
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

async function verifyAuthAndInit() {
    const token = getToken();
    if (!token) {
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/admin/chats?token=${encodeURIComponent(token)}`);
        if (response.status === 200) {
            hideLogin();
            initDashboard();
        } else {
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
}

function hideLogin() {
    loginModal.classList.add('hide');
    mainDashboard.classList.remove('hide');
}

async function handleLogin() {
    const password = passwordInput.value.trim();
    if (!password) return;

    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    loginBtn.disabled = true;
    loginBtn.innerHTML = dict.connecting || 'Đang kết nối...';
    loginErrorMsg.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/api/admin/chats?token=${encodeURIComponent(password)}`);
        if (response.status === 200) {
            localStorage.setItem('pastie_admin_token', password);
            hideLogin();
            initDashboard();
        } else {
            loginErrorMsg.style.display = 'block';
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
    fetchSessions();
    
    // Start polling sessions every 7 seconds
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(fetchSessions, 7000);
}

async function fetchSessions() {
    const token = getToken();
    try {
        const response = await fetch(`${API_BASE}/api/admin/chats?token=${encodeURIComponent(token)}`);
        if (response.status === 401) {
            showLogin();
            return;
        }

        const data = await response.json();
        sessionsList = data;
        
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
    filtered.forEach(session => {
        const card = document.createElement('div');
        card.className = `session-card ${session.id === currentSessionId ? 'active-selected' : ''}`;
        card.setAttribute('data-id', session.id);
        
        const locale = currentLang === 'vi' ? 'vi-VN' : currentLang === 'zh' ? 'zh-CN' : currentLang === 'ru' ? 'ru-RU' : 'en-US';
        const dateStr = new Date(session.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) 
            + ' ' + new Date(session.created_at).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

        const statusText = session.status === 'active' ? dict.statusActive : dict.statusClosed;
        const emailText = session.visitor_email || dict.noEmail;

        card.innerHTML = `
            <div class="session-card-header">
                <span class="session-name" title="${session.visitor_name}">${session.visitor_name}</span>
                <span class="session-status-badge ${session.status}">${statusText}</span>
            </div>
            <div class="session-email">${emailText}</div>
            <div class="session-meta-footer">
                <span class="session-project" title="${session.project_id}">${session.project_id}</span>
                <span>${dateStr}</span>
            </div>
        `;

        card.addEventListener('click', () => selectSession(session.id));
        sessionsListContainer.appendChild(card);
    });
}

// ----------------------------------------------------
// CHAT SESSION DETAILS & MESSAGES
// ----------------------------------------------------

async function selectSession(sessionId) {
    currentSessionId = sessionId;
    
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
    chatHeaderActions.classList.remove('hide');
    chatInputContainer.classList.remove('hide');
    detailsSidebar.classList.remove('hide');

    // Update details side panel
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    currentDetectedLang = session.detected_language || 'en';
    if (!session.detected_language || session.detected_language === 'unknown') {
        detailLang.textContent = dict.notDetected;
    } else {
        detailLang.textContent = currentDetectedLang.toUpperCase();
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

    // Load messages
    await loadMessages(sessionId);
}

async function loadMessages(sessionId) {
    const token = getToken();
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    try {
        const response = await fetch(`${API_BASE}/api/admin/chats/${sessionId}/messages?token=${encodeURIComponent(token)}`);
        const messages = await response.json();
        
        chatMessagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            chatMessagesContainer.innerHTML = `<div class="system"><div class="message-bubble">${dict.emptyChatHistory}</div></div>`;
            return;
        }

        messages.forEach(msg => {
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${msg.sender}`;
            
            const locale = currentLang === 'vi' ? 'vi-VN' : currentLang === 'zh' ? 'zh-CN' : currentLang === 'ru' ? 'ru-RU' : 'en-US';
            const timeStr = new Date(msg.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

            let innerHtml = `
                <div class="message-bubble">
                    <div class="original-text">${escapeHtml(msg.original_text)}</div>
            `;

            // If there's an AI translation, display it
            if (msg.translated_text && msg.translated_text !== msg.original_text) {
                innerHtml += `
                    <div class="translated-text-wrapper">
                        <div>${escapeHtml(msg.translated_text)}</div>
                    </div>
                `;
            }

            innerHtml += `
                </div>
                <div class="message-time">${timeStr}</div>
            `;

            wrapper.innerHTML = innerHtml;
            chatMessagesContainer.appendChild(wrapper);
        });

        // Scroll to bottom
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    } catch (e) {
        console.error('Error loading messages:', e);
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
    const tempWrapper = document.createElement('div');
    tempWrapper.className = 'message-wrapper agent';
    tempWrapper.innerHTML = `
        <div class="message-bubble">
            <div class="original-text">${escapeHtml(text)}</div>
            <div class="translated-text-wrapper" style="opacity: 0.6;">
                <div>${dict.translatingWithAI}</div>
            </div>
        </div>
        <div class="message-time">${dict.sentJustNow}</div>
    `;
    chatMessagesContainer.appendChild(tempWrapper);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

    try {
        const response = await fetch(`${API_BASE}/api/chats/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: currentSessionId,
                sender: 'agent',
                text,
                targetLang: currentDetectedLang // translate Vietnamese text into the visitor's language
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

function handleExport(format) {
    const token = getToken();
    const projectId = projectFilter.value;
    const url = `${API_BASE}/api/admin/export?format=${format}&projectId=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`;
    
    // Open in new window to trigger browser download dialog
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

// Initial translations load
applyTranslations(currentLang);

// Auto login verify on load
verifyAuthAndInit();
