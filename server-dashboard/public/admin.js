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
        exportJsonl: "Xuất JSONL (Huấn luyện)",
        logoutTitle: "Đăng xuất",
        chatListTitle: "Hội thoại chat",
        refreshTitle: "Tải lại",
        loadingConversations: "Đang tải cuộc hội thoại...",
        noChatSelected: "Chưa chọn phòng chat",
        selectChatPrompt: "Vui lòng chọn cuộc hội thoại từ danh sách bên trái",
        closeChat: "Đóng cuộc chat",
        welcomePrompt: "Chọn một cuộc trò chuyện để bắt đầu tương tác & dịch thuật tự động.",
        aiTranslationPrompt: "Tin nhắn của bạn sẽ được tự động dịch sang ngôn ngữ của khách",
        chatInputPlaceholder: "Gõ câu trả lời tại đây...",
        detailsTitle: "Thông tin chi tiết",
        detectedLangLabel: "Ngôn ngữ phát hiện",
        notDetected: "Chưa phát hiện",
        intentTagsLabel: "Ý định cuộc trò chuyện",
        aiSummaryLabel: "Tóm tắt nội dung cuộc chat",
        closeChatToAnalyze: "Nhấn nút \"Đóng cuộc chat\" để phân tích và tóm tắt cuộc trò chuyện này.",
        projectLabel: "Dự án / Trang web",
        clientInfoLabel: "Trình duyệt & Thiết bị",
        
        // Dynamic labels & alerts
        statusActive: "đang chat",
        statusClosed: "đã đóng",
        noEmail: "Không có email",
        emptyConversations: "Không tìm thấy cuộc hội thoại nào.",
        emptyChatHistory: "Mạch hội thoại bắt đầu. Chưa có tin nhắn nào.",
        translatingWithAI: "Đang dịch thuật...",
        sentJustNow: "Gửi lúc này",
        closeConfirm: "Bạn có chắc chắn muốn đóng cuộc trò chuyện này? Hệ thống sẽ tự động phân tích và tóm tắt.",
        closingStatus: "Đang phân tích...",
        unclassified: "Chưa phân loại",
        connecting: "Đang kết nối...",
        connError: "Không thể kết nối tới server.",
        closeError: "Lỗi đóng phiên chat.",
        sendError: "Lỗi gửi tin nhắn: ",
        loadOlder: "Xem tin nhắn cũ hơn",
        loadingMore: "Đang tải...",
        labelOriginal: "BẢN GỐC:",
        labelAiTranslation: "BẢN DỊCH:",
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
        exportJsonl: "Export JSONL (Training)",
        logoutTitle: "Logout",
        chatListTitle: "Chat Conversations",
        refreshTitle: "Refresh",
        loadingConversations: "Loading conversations...",
        noChatSelected: "No chat selected",
        selectChatPrompt: "Please select a conversation from the list on the left",
        closeChat: "Close chat",
        welcomePrompt: "Select a conversation to start interaction & auto translation.",
        aiTranslationPrompt: "Your message will be automatically translated to the visitor's language",
        chatInputPlaceholder: "Type your reply here...",
        detailsTitle: "Details",
        detectedLangLabel: "Detected language",
        notDetected: "Not detected",
        intentTagsLabel: "Conversation intent",
        aiSummaryLabel: "Chat summary",
        closeChatToAnalyze: "Click \"Close chat\" to analyze and summarize this conversation.",
        projectLabel: "Project / Website",
        clientInfoLabel: "Browser & Device",

        // Dynamic labels & alerts
        statusActive: "active",
        statusClosed: "closed",
        noEmail: "No email",
        emptyConversations: "No conversations found.",
        emptyChatHistory: "Conversation started. No messages yet.",
        translatingWithAI: "Translating...",
        sentJustNow: "Sent just now",
        closeConfirm: "Are you sure you want to close this conversation? The system will automatically analyze and summarize.",
        closingStatus: "Analyzing...",
        unclassified: "Unclassified",
        connecting: "Connecting...",
        connError: "Unable to connect to server.",
        closeError: "Failed to close chat session.",
        sendError: "Failed to send message: ",
        loadOlder: "Load older messages",
        loadingMore: "Loading...",
        labelOriginal: "ORIGINAL:",
        labelAiTranslation: "TRANSLATION:",
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
        exportJsonl: "Экспорт JSONL (Обучение)",
        logoutTitle: "Выйти",
        chatListTitle: "Диалоги",
        refreshTitle: "Обновить",
        loadingConversations: "Загрузка диалогов...",
        noChatSelected: "Чат не выбран",
        selectChatPrompt: "Пожалуйста, выберите диалог из списка слева",
        closeChat: "Закрыть чат",
        welcomePrompt: "Выберите диалог для начала общения и автоперевода.",
        aiTranslationPrompt: "Ваше сообщение будет автоматически переведено на язык посетителя",
        chatInputPlaceholder: "Введите ваш ответ здесь...",
        detailsTitle: "Детали",
        detectedLangLabel: "Обнаруженный язык",
        notDetected: "Не определен",
        intentTagsLabel: "Намерение диалога",
        aiSummaryLabel: "Сводка диалога",
        closeChatToAnalyze: "Нажмите \"Закрыть чат\", чтобы проанализировать и сделать резюме диалога.",
        projectLabel: "Проект / Сайт",
        clientInfoLabel: "Браузер и устройство",

        // Dynamic labels & alerts
        statusActive: "активен",
        statusClosed: "закрыт",
        noEmail: "Нет email",
        emptyConversations: "Диалоги не найдены.",
        emptyChatHistory: "Диалог начат. Сообщений пока нет.",
        translatingWithAI: "Перевод...",
        sentJustNow: "Отправлено только что",
        closeConfirm: "Вы уверены, что хотите закрыть этот диалог? Система автоматически проанализирует и составит сводку.",
        closingStatus: "Анализ...",
        unclassified: "Не классифицировано",
        connecting: "Подключение...",
        connError: "Не удалось подключиться к серверу.",
        closeError: "Не удалось закрыть сессию чата.",
        sendError: "Ошибка отправки сообщения: ",
        loadOlder: "Загрузить старые сообщения",
        loadingMore: "Загрузка...",
        labelOriginal: "ОРИГИНАЛ:",
        labelAiTranslation: "ПЕРЕВОД:",
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
        exportJsonl: "导出 JSONL (训练数据)",
        logoutTitle: "注销登录",
        chatListTitle: "对话列表",
        refreshTitle: "刷新",
        loadingConversations: "正在加载会话...",
        noChatSelected: "未选择聊天",
        selectChatPrompt: "请从左侧列表选择一个会话",
        closeChat: "结束会话",
        welcomePrompt: "选择一个会话以开始互动与自动翻译。",
        aiTranslationPrompt: "您的消息将自动翻译成访问者的语言",
        chatInputPlaceholder: "在此输入您的回复...",
        detailsTitle: "详细信息",
        detectedLangLabel: "检测到的语言",
        notDetected: "未检测到",
        intentTagsLabel: "对话意图",
        aiSummaryLabel: "对话摘要",
        closeChatToAnalyze: "点击 \"结束会话\" 以分析并总结此次对话。",
        projectLabel: "项目 / 网站",
        clientInfoLabel: "浏览器与设备",

        // Dynamic labels & alerts
        statusActive: "对话中",
        statusClosed: "已关闭",
        noEmail: "无邮箱",
        emptyConversations: "未找到任何会话。",
        emptyChatHistory: "会话开始。暂无消息。",
        translatingWithAI: "正在翻译...",
        sentJustNow: "刚刚发送",
        closeConfirm: "您确定要结束此会话吗？系统将自动进行分析和总结。",
        closingStatus: "正在分析...",
        unclassified: "未分类",
        connecting: "正在连接...",
        connError: "无法连接到服务器。",
        closeError: "关闭聊天会话失败。",
        sendError: "发送消息失败: ",
        loadOlder: "加载历史消息",
        loadingMore: "正在加载...",
        labelOriginal: "原文:",
        labelAiTranslation: "翻译:",
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

// Unread tracking — seenMessageCount is synced from DB via sessions API
// -1 = never opened by this admin (show as unread if has messages)
const seenMessageCount = {};

// Admin lazy loading pagination state
let adminMessages = [];
let adminOffset = 0;
let adminLimit = 15;
let adminHasMore = true;
let adminIsLoadingMore = false;
let adminIsSending = false;

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
const dashboardBody = document.getElementById('dashboard-body');
// Responsive: nút quay lại (mobile) + nút xem chi tiết (tablet)
document.getElementById('mobile-back-btn')?.addEventListener('click', () => dashboardBody?.classList.remove('chat-open'));
document.getElementById('details-toggle-btn')?.addEventListener('click', () => dashboardBody?.classList.toggle('details-open'));
document.getElementById('details-close-btn')?.addEventListener('click', () => dashboardBody?.classList.remove('details-open'));
document.getElementById('details-backdrop')?.addEventListener('click', () => dashboardBody?.classList.remove('details-open'));
const detailLang = document.getElementById('detail-lang');
const detailTags = document.getElementById('detail-tags');
const detailSummary = document.getElementById('detail-summary');
const closeSessionBtn = document.getElementById('close-session-btn');
const deleteSessionBtn = document.getElementById('delete-session-btn');
const chatAssigneeSelect = document.getElementById('chat-assignee-select');
const assigneeSelectorContainer = document.getElementById('assignee-selector-container');
let cachedAssigneesList = [];
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

const changePasswordModal = document.getElementById('change-password-modal');
const changePasswordForm = document.getElementById('change-password-form');
const changePasswordError = document.getElementById('change-password-error');

function closeChangePasswordModal() {
    changePasswordModal?.classList.add('hide');
    changePasswordForm?.reset();
    if (changePasswordError) changePasswordError.style.display = 'none';
}

document.getElementById('change-password-btn')?.addEventListener('click', () => {
    document.getElementById('settings-dropdown-menu')?.classList.add('hide');
    changePasswordModal?.classList.remove('hide');
    document.getElementById('current-password-input')?.focus();
});
document.getElementById('change-password-cancel')?.addEventListener('click', closeChangePasswordModal);
changePasswordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const currentPassword = document.getElementById('current-password-input')?.value || '';
    const newPassword = document.getElementById('new-password-input')?.value || '';
    const confirmPassword = document.getElementById('confirm-password-input')?.value || '';
    if (newPassword !== confirmPassword) {
        if (changePasswordError) { changePasswordError.textContent = 'Mật khẩu xác nhận không khớp.'; changePasswordError.style.display = 'block'; }
        return;
    }
    const response = await authFetch(`${API_BASE}/api/admin/me/password`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
    const data = await response.json();
    if (!response.ok) {
        if (changePasswordError) { changePasswordError.textContent = data.error || 'Không thể đổi mật khẩu.'; changePasswordError.style.display = 'block'; }
        return;
    }
    closeChangePasswordModal();
    alert('Đã đổi mật khẩu thành công.');
});

// ----------------------------------------------------
// UNIFIED DIRECT AUTHENTICATION (GOOGLE & EMAIL OTP)
// ----------------------------------------------------

let adminOtpCountdownInterval = null;
let currentOtpTargetEmail = '';

function setLoginError(msg) {
    const errBox = document.getElementById('login-error-msg');
    const succBox = document.getElementById('login-success-msg');
    if (succBox) succBox.style.display = 'none';
    if (errBox) {
        if (msg) {
            errBox.textContent = msg;
            errBox.style.display = 'block';
        } else {
            errBox.style.display = 'none';
        }
    }
}

function setLoginSuccess(msg) {
    const errBox = document.getElementById('login-error-msg');
    const succBox = document.getElementById('login-success-msg');
    if (errBox) errBox.style.display = 'none';
    if (succBox) {
        if (msg) {
            succBox.textContent = msg;
            succBox.style.display = 'block';
        } else {
            succBox.style.display = 'none';
        }
    }
}

// Google Sign-In Callback
window.handleGoogleCredentialResponse = async function(response) {
    if (!response || !response.credential) {
        setLoginError('Không nhận được token xác thực từ Google.');
        return;
    }

    setLoginError('');
    setLoginSuccess('Đang xác thực tài khoản Google với hệ thống...');

    try {
        const res = await fetch(`${API_BASE}/api/admin/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('pastie_admin_token', data.token);
            setLoginSuccess('Đăng nhập thành công! Đang vào Console...');
            setTimeout(() => {
                hideLogin();
                initDashboard();
            }, 400);
        } else {
            setLoginError(data.error || 'Đăng nhập bằng Google thất bại.');
        }
    } catch (e) {
        console.error('Google sign-in error:', e);
        setLoginError('Lỗi kết nối khi xác thực Google: ' + e.message);
    }
};

// Khởi tạo Google Sign-in button
async function initGoogleAuth() {
    try {
        const configRes = await fetch(`${API_BASE}/api/admin/auth/config`);
        const configData = await configRes.json();
        const googleClientId = configData.googleClientId;

        const slot = document.getElementById('google-signin-btn-container');
        const customBtn = document.getElementById('google-auth-trigger-btn');

        if (googleClientId && window.google && window.google.accounts && window.google.accounts.id) {
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: window.handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true
            });
            if (slot) {
                window.google.accounts.id.renderButton(slot, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'left',
                    width: 320
                });
            }
            if (customBtn) customBtn.classList.add('hide');
        } else {
            // Hiển thị nút tùy chỉnh nếu chưa nhúng Google Client ID
            if (customBtn) {
                customBtn.classList.remove('hide');
                customBtn.onclick = () => {
                    if (!googleClientId) {
                        setLoginError('Chưa cấu hình GOOGLE_CLIENT_ID trên server. Vui lòng sử dụng tính năng Đăng nhập bằng OTP Email bên dưới!');
                    } else if (window.google?.accounts?.id) {
                        window.google.accounts.id.prompt();
                    }
                };
            }
        }
    } catch (e) {
        console.warn('Init Google auth error:', e);
    }
}

// Bắt đầu đếm ngược 5 phút OTP
function startOtpCountdown(seconds = 300) {
    if (adminOtpCountdownInterval) clearInterval(adminOtpCountdownInterval);
    let remaining = seconds;
    const countdownEl = document.getElementById('admin-otp-countdown');
    const resendBtn = document.getElementById('resend-admin-otp-btn');
    if (resendBtn) resendBtn.disabled = true;

    function update() {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        if (countdownEl) {
            countdownEl.textContent = `Mã có hiệu lực trong ${m}:${s < 10 ? '0' : ''}${s}`;
        }
        if (remaining <= 0) {
            clearInterval(adminOtpCountdownInterval);
            if (countdownEl) countdownEl.textContent = 'Mã OTP đã hết hạn.';
            if (resendBtn) resendBtn.disabled = false;
        }
        remaining--;
    }
    update();
    adminOtpCountdownInterval = setInterval(update, 1000);
}

// Xử lý gửi mã OTP Email
async function handleSendAdminOtp() {
    const emailInput = document.getElementById('admin-otp-email-input');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email || !email.includes('@')) {
        setLoginError('Vui lòng nhập địa chỉ email hợp lệ.');
        return;
    }

    const sendBtn = document.getElementById('send-admin-otp-btn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = 'Đang gửi mã... <i class="ri-loader-4-line ri-spin"></i>';
    }
    setLoginError('');
    setLoginSuccess('');

    try {
        const res = await fetch(`${API_BASE}/api/admin/auth/otp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            currentOtpTargetEmail = email;
            document.getElementById('otp-step-email')?.classList.add('hide');
            document.getElementById('otp-step-verify')?.classList.remove('hide');
            const targetDisplay = document.getElementById('otp-target-email-display');
            if (targetDisplay) targetDisplay.textContent = email;
            
            startOtpCountdown(300);
            setLoginSuccess(data.message || 'Mã OTP đã được gửi đến hộp thư của bạn!');
            const codeInput = document.getElementById('admin-otp-code-input');
            if (codeInput) {
                codeInput.value = '';
                codeInput.focus();
            }
        } else {
            setLoginError(data.error || 'Không thể gửi mã OTP.');
        }
    } catch (e) {
        setLoginError('Lỗi kết nối khi gửi OTP: ' + e.message);
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span>Gửi Mã Xác Thực OTP</span> <i class="ri-send-plane-fill"></i>';
        }
    }
}

// Xử lý xác thực mã OTP
async function handleVerifyAdminOtp() {
    const codeInput = document.getElementById('admin-otp-code-input');
    const otpCode = codeInput ? codeInput.value.trim() : '';
    if (!otpCode || otpCode.length < 6) {
        setLoginError('Vui lòng nhập đủ 6 chữ số mã OTP.');
        return;
    }

    const verifyBtn = document.getElementById('verify-admin-otp-btn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = 'Đang xác thực... <i class="ri-loader-4-line ri-spin"></i>';
    }
    setLoginError('');

    try {
        const res = await fetch(`${API_BASE}/api/admin/auth/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentOtpTargetEmail, otpCode })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('pastie_admin_token', data.token);
            setLoginSuccess('Xác thực OTP thành công! Đang kết nối Console...');
            if (adminOtpCountdownInterval) clearInterval(adminOtpCountdownInterval);
            setTimeout(() => {
                hideLogin();
                initDashboard();
            }, 400);
        } else {
            setLoginError(data.error || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
            if (codeInput) codeInput.select();
        }
    } catch (e) {
        setLoginError('Lỗi kết nối khi xác thực OTP: ' + e.message);
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<span>Xác Nhận & Kết Nối</span> <i class="ri-check-double-line"></i>';
        }
    }
}

// Gắn sự kiện chuyển Tab và tương tác Form đăng nhập
function setupAuthEvents() {
    // Tab switching
    const tabDirect = document.getElementById('tab-direct-btn');
    const tabPwd = document.getElementById('tab-pwd-btn');
    const panelDirect = document.getElementById('auth-panel-direct');
    const panelPwd = document.getElementById('auth-panel-pwd');

    if (tabDirect && tabPwd) {
        tabDirect.addEventListener('click', () => {
            tabDirect.classList.add('active');
            tabPwd.classList.remove('active');
            panelDirect?.classList.add('active');
            panelDirect?.classList.remove('hide');
            panelPwd?.classList.remove('active');
            panelPwd?.classList.add('hide');
            setLoginError('');
            setLoginSuccess('');
        });
        tabPwd.addEventListener('click', () => {
            tabPwd.classList.add('active');
            tabDirect.classList.remove('active');
            panelPwd?.classList.add('active');
            panelPwd?.classList.remove('hide');
            panelDirect?.classList.remove('active');
            panelDirect?.classList.add('hide');
            setLoginError('');
            setLoginSuccess('');
            document.getElementById('admin-username-input')?.focus();
        });
    }

    // OTP buttons
    document.getElementById('send-admin-otp-btn')?.addEventListener('click', handleSendAdminOtp);
    document.getElementById('resend-admin-otp-btn')?.addEventListener('click', handleSendAdminOtp);
    document.getElementById('verify-admin-otp-btn')?.addEventListener('click', handleVerifyAdminOtp);

    document.getElementById('change-otp-email-btn')?.addEventListener('click', () => {
        if (adminOtpCountdownInterval) clearInterval(adminOtpCountdownInterval);
        document.getElementById('otp-step-verify')?.classList.add('hide');
        document.getElementById('otp-step-email')?.classList.remove('hide');
        setLoginError('');
        setLoginSuccess('');
        document.getElementById('admin-otp-email-input')?.focus();
    });

    // Enter key shortcuts
    document.getElementById('admin-otp-email-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSendAdminOtp(); }
    });
    document.getElementById('admin-otp-code-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleVerifyAdminOtp(); }
    });
    document.getElementById('admin-password-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
    });
}

// Đổi token SSO (?sso=) lấy phiên đăng nhập (Hỗ trợ tương thích ngược)
async function doSsoLogin() {
    const params = new URLSearchParams(window.location.search);
    let sso = params.get('sso') || params.get('token') || params.get('sso_token') || params.get('ssoToken');
    
    if (!sso && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^[#?]/, ''));
        sso = hashParams.get('sso') || hashParams.get('token') || hashParams.get('sso_token') || hashParams.get('ssoToken');
    }

    if (!sso) return false;
    try {
        const r = await fetch(`${API_BASE}/api/admin/sso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: sso })
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.token) {
            localStorage.setItem('pastie_admin_token', d.token);
            params.delete('sso');
            params.delete('token');
            params.delete('sso_token');
            params.delete('ssoToken');
            window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
            return true;
        }
        setLoginError(d.error || 'Đăng nhập SSO DealPhuQuoc thất bại.');
        return false;
    } catch (e) {
        console.error('SSO error:', e);
        setLoginError('Lỗi kết nối khi xác thực SSO: ' + e.message);
        return false;
    }
}

async function verifyAuthAndInit() {
    setupAuthEvents();
    initGoogleAuth();

    await doSsoLogin(); // tự động thử nếu URL có ?sso

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
    setLoginError('');
    setLoginSuccess('');
    initGoogleAuth();
}

function hideLogin() {
    loginModal.classList.add('hide');
    mainDashboard.classList.remove('hide');
    if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
}

async function handleLogin() {
    const username = usernameInput ? usernameInput.value.trim() : 'admin';
    const password = passwordInput.value.trim();
    if (!username || !password) {
        setLoginError('Vui lòng nhập tên đăng nhập và mật khẩu.');
        return;
    }

    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    loginBtn.disabled = true;
    loginBtn.innerHTML = dict.connecting || 'Đang kết nối...';
    setLoginError('');

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
            setLoginError(data.error || (dict.loginError || 'Tài khoản hoặc mật khẩu không hợp lệ.'));
            passwordInput.value = '';
        }
    } catch (e) {
        setLoginError(dict.connError || 'Không thể kết nối tới server.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `${dict.loginBtn || 'Kết Nối Console'} <i class="ri-arrow-right-line"></i>`;
    }
}

// ----------------------------------------------------
// BROWSER NOTIFICATIONS
// ----------------------------------------------------

const notifiedMsgCount = {}; // track last notified count per session
let pushRegistration = null;

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function subscriptionUsesVapidKey(subscription, publicKey) {
    const currentKey = subscription?.options?.applicationServerKey;
    if (!currentKey || !publicKey) return false;
    const expectedKey = urlBase64ToUint8Array(publicKey);
    const actualKey = new Uint8Array(currentKey);
    return actualKey.length === expectedKey.length && actualKey.every((value, index) => value === expectedKey[index]);
}

async function syncPushSubscription(config) {
    let subscription = await pushRegistration.pushManager.getSubscription();
    // Mỗi subscription được gắn với một VAPID public key. Khi thay key trên
    // Railway, huỷ subscription cũ và tạo lại để tránh push im lặng thất bại.
    if (subscription && !subscriptionUsesVapidKey(subscription, config.publicKey)) {
        await subscription.unsubscribe();
        subscription = null;
    }
    if (!subscription) {
        subscription = await pushRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        });
    }
    const saveResponse = await authFetch(`${API_BASE}/api/admin/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
    });
    if (!saveResponse.ok) throw new Error('Không thể lưu thiết bị nhận thông báo.');
    return subscription;
}

function setPushButtonState(state) {
    const label = document.getElementById('enable-push-label');
    const description = document.getElementById('enable-push-description');
    if (!label || !description) return;
    if (state === 'enabled') { label.textContent = 'Thông báo đã bật'; description.textContent = 'Thiết bị này sẽ nhận chat cần Agent'; }
    else if (state === 'blocked') { label.textContent = 'Thông báo đang bị chặn'; description.textContent = 'Mở quyền Thông báo trong cài đặt trình duyệt'; }
    else if (state === 'unavailable') { label.textContent = 'Push chưa được cấu hình'; description.textContent = 'Liên hệ quản trị hệ thống để bật VAPID'; }
    else { label.textContent = 'Bật thông báo'; description.textContent = 'Nhận chat mới ngay cả khi đã đóng app'; }
}

async function setupPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setPushButtonState('unavailable');
        pushPermissionModal?.classList.remove('hide');
        return false;
    }
    try {
        pushRegistration = await navigator.serviceWorker.register('/push-sw.js');
        const response = await authFetch(`${API_BASE}/api/admin/push/public-key`);
        const config = await response.json();
        if (!response.ok || !config.enabled) {
            setPushButtonState('unavailable');
            pushPermissionModal?.classList.remove('hide');
            return false;
        }
        let subscription = await pushRegistration.pushManager.getSubscription();
        if (Notification.permission === 'granted') {
            subscription = await syncPushSubscription(config);
        }
        setPushButtonState(Notification.permission === 'denied' ? 'blocked' : subscription ? 'enabled' : 'off');
        if (Notification.permission === 'granted' && subscription) return true;
        pushPermissionModal?.classList.remove('hide');
        return false;
    } catch (error) {
        console.warn('Không thể khởi tạo Web Push:', error);
        pushPermissionModal?.classList.remove('hide');
        return false;
    }
}

async function enablePushNotifications() {
    if (!pushRegistration) await setupPushNotifications();
    if (!pushRegistration) throw new Error('Trình duyệt chưa hỗ trợ thông báo đẩy.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { setPushButtonState('blocked'); throw new Error('Bạn cần cho phép thông báo để tiếp tục.'); }
    const configResponse = await authFetch(`${API_BASE}/api/admin/push/public-key`);
    const config = await configResponse.json();
    if (!configResponse.ok || !config.enabled || !config.publicKey) { setPushButtonState('unavailable'); throw new Error('Push chưa được cấu hình trên máy chủ.'); }
    await syncPushSubscription(config);
    setPushButtonState('enabled');
    return true;
}

function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    // Quyền phải được yêu cầu từ thao tác bấm nút, đặc biệt với iPhone/iPad.
}

function showNewMessageNotification(session, unread) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && session.id === currentSessionId) return;

    const name = session.visitor_name || 'Khách hàng';
    const preview = session.last_message_preview
        ? session.last_message_preview.substring(0, 80)
        : `${unread} tin nhắn mới`;

    const n = new Notification(`💬 ${name}`, {
        body: preview,
        icon: '/favicon.ico',
        tag: `pastie-chat-${session.id}`,
        renotify: true,
        silent: false,
    });

    n.onclick = () => {
        window.focus();
        selectSession(session.id);
        n.close();
    };

    // Play alert sound
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch {}
}

// ----------------------------------------------------
// DASHBOARD INITIALIZATION & POLLING
// ----------------------------------------------------

let CURRENT_ADMIN = null;
async function initDashboard() {
    await loadAdminProfile();   // biết role + project_id trước khi dựng filter
    await loadProjects();        // tải registry dự án
    requestNotificationPermission();
    setupPushNotifications();
    fetchSessions();
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(fetchSessions, 7000);
}

async function loadAdminProfile() {
    try {
        const res = await authFetch(`${API_BASE}/api/admin/me`);
        if (!res.ok) return;
        const data = await res.json();
        const admin = data.admin || data; // /me trả { admin: {...} }
        CURRENT_ADMIN = admin;
        const nameEl = document.getElementById('admin-profile-name');
        const badgeEl = document.getElementById('admin-profile-badge');
        const manageBtn = document.getElementById('manage-admins-btn');
        const changePasswordBtn = document.getElementById('change-password-btn');
        if (nameEl) nameEl.textContent = admin.full_name || admin.username;
        if (badgeEl) badgeEl.style.display = 'flex';
        const isSuperOrProjectAdmin = ['superadmin', 'project_admin'].includes(admin.role);
        if (manageBtn) manageBtn.classList.toggle('hide', !isSuperOrProjectAdmin);
        const knowledgeBtn = document.getElementById('knowledge-settings-btn');
        if (knowledgeBtn) knowledgeBtn.classList.toggle('hide', !isSuperOrProjectAdmin);
        if (changePasswordBtn && String(admin.username || '').startsWith('sso:')) changePasswordBtn.classList.add('hide');
        if (deleteSessionBtn) deleteSessionBtn.classList.toggle('hide', admin.role !== 'superadmin');
        if (projectFilter && admin.role !== 'superadmin' && admin.project_id) {
            projectFilter.title = `Dự án được phân quyền: ${admin.project_id}`;
        }
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

        // Sync seen counts from DB + trigger notifications for new messages
        data.forEach(s => {
            const dbSeen = parseInt(s.seen_message_count);
            if (dbSeen >= 0) seenMessageCount[s.id] = dbSeen;
            else if (!(s.id in seenMessageCount)) seenMessageCount[s.id] = -1;

            // Notify if new messages arrived since last notification check
            const totalMsgs = parseInt(s.message_count) || 0;
            const lastNotified = notifiedMsgCount[s.id] ?? totalMsgs; // init = current, no spam on first load
            if (totalMsgs > lastNotified && s.id !== currentSessionId) {
                const seen = seenMessageCount[s.id];
                const unread = (seen === -1 || seen === undefined) ? totalMsgs - 1 : Math.max(0, totalMsgs - seen);
                if (unread > 0) showNewMessageNotification(s, unread);
            }
            notifiedMsgCount[s.id] = totalMsgs;
        });

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

function updateProjectFilterDropdown(sessions) {
    const existingValue = projectFilter.value;
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];

    // Nguồn chính = registry dự án (PROJECTS). Kèm project_id lạ từ session (fallback).
    const map = new Map();
    (PROJECTS || []).forEach(p => map.set(p.id, p.name || p.id));
    (sessions || []).forEach(s => { if (s.project_id && !map.has(s.project_id)) map.set(s.project_id, s.project_id); });

    // Chỉ superadmin có tuỳ chọn "Tất cả dự án"; tài khoản scoped thì không.
    const isScoped = CURRENT_ADMIN && CURRENT_ADMIN.role !== 'superadmin' && CURRENT_ADMIN.project_id;
    projectFilter.innerHTML = isScoped ? '' : `<option value="">${dict.allProjects}</option>`;
    map.forEach((name, id) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        projectFilter.appendChild(opt);
    });

    // Tài khoản scoped: khoá filter về đúng project của mình
    if (isScoped) {
        projectFilter.value = CURRENT_ADMIN.project_id;
        projectFilter.disabled = true;
        currentProjectFilter = CURRENT_ADMIN.project_id;
        projectFilter.setAttribute('aria-label', `Dự án được phân quyền: ${map.get(CURRENT_ADMIN.project_id) || CURRENT_ADMIN.project_id}`);
    }
    else { projectFilter.value = existingValue; }
}

// ===== Registry dự án (multi-project) =====
let PROJECTS = [];
const PROJECT_WEBSITES = {
    dealphuquoc: 'https://dealphuquoc.com',
    'pastie-landingpage': 'https://pastie-landingpage.vercel.app'
};

function getProjectDetails(projectId) {
    const project = PROJECTS.find(p => p.id === projectId);
    return {
        name: project?.name || projectId || 'Chưa xác định',
        url: project?.website_url || PROJECT_WEBSITES[projectId] || ''
    };
}
async function loadProjects() {
    try {
        const r = await authFetch(`${API_BASE}/api/admin/projects`);
        if (!r.ok) return;
        PROJECTS = await r.json();
    } catch (e) { console.error('loadProjects error:', e); PROJECTS = []; }
    updateProjectFilterDropdown([]);
    fillAdminProjectSelect();
    renderProjectList();
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
    box.innerHTML = '';
    if (!PROJECTS.length) { box.innerHTML = '<span style="font-size:12px;color:var(--text-secondary);">Chưa có dự án nào.</span>'; return; }
    PROJECTS.forEach(p => {
        const chip = document.createElement('span');
        chip.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:20px;background:rgba(99,102,241,0.15);color:var(--accent-color);border:1px solid rgba(99,102,241,0.3);font-size:12px;';
        chip.innerHTML = `${p.name} <small style="opacity:.6">${p.id}</small>`;
        const del = document.createElement('button');
        del.textContent = '×'; del.title = 'Xoá khỏi danh sách';
        del.style.cssText = 'background:none;border:none;color:inherit;cursor:pointer;font-size:15px;line-height:1;';
        del.onclick = () => deleteProject(p.id);
        chip.appendChild(del);
        box.appendChild(chip);
    });
}

async function addProject() {
    const inp = document.getElementById('project-new-name');
    const name = inp ? inp.value.trim() : '';
    if (!name) return;
    try {
        const r = await authFetch(`${API_BASE}/api/admin/projects`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { if (inp) inp.value = ''; await loadProjects(); }
        else alert('Lỗi: ' + (d.error || 'Không tạo được dự án.'));
    } catch (e) { alert('Lỗi kết nối.'); }
}

async function deleteProject(id) {
    if (!confirm(`Xoá dự án "${id}" khỏi danh sách? (không xoá chat/KB đã có)`)) return;
    try {
        const r = await authFetch(`${API_BASE}/api/admin/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (r.ok) await loadProjects(); else alert('Lỗi xoá dự án.');
    } catch (e) { alert('Lỗi kết nối.'); }
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
        const seenForClass = seenMessageCount[session.id];
        const hasUnread = session.id !== currentSessionId && (seenForClass === undefined || seenForClass === -1 ? totalMsgsForClass > 1 : totalMsgsForClass > seenForClass);
        card.className = `session-card ${session.id === currentSessionId ? 'active-selected' : ''} ${hasUnread ? 'has-unread' : ''}`;
        card.setAttribute('data-id', session.id);
        
        const locale = currentLang === 'vi' ? 'vi-VN' : currentLang === 'zh' ? 'zh-CN' : currentLang === 'ru' ? 'ru-RU' : 'en-US';
        const msgTime = session.last_message_at || session.created_at;
        const dateStr = new Date(msgTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
            + ' ' + new Date(msgTime).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

        const statusText = session.status === 'active' ? dict.statusActive : dict.statusClosed;

        const totalMsgs = parseInt(session.message_count) || 0;
        const seen = seenMessageCount[session.id];
        const unread = session.id === currentSessionId ? 0
            : (seen === undefined || seen === -1) ? (totalMsgs > 1 ? totalMsgs - 1 : 0)
            : Math.max(0, totalMsgs - seen);
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

    // Mark session as read in DB (async, no need to await)
    authFetch(`${API_BASE}/api/admin/chats/${sessionId}/read`, { method: 'POST' })
        .then(r => r.json()).then(d => { if (d.seen_message_count !== undefined) seenMessageCount[sessionId] = d.seen_message_count; })
        .catch(() => {});
    // Optimistically clear badge in UI immediately
    const sess = sessionsList.find(s => s.id === sessionId);
    if (sess) seenMessageCount[sessionId] = parseInt(sess.message_count) || 0;

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
        if (session.project_id) {
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

    // Populate and sync assignee selector
    if (chatAssigneeSelect) {
        await loadAssigneesForChat(session.project_id);
        chatAssigneeSelect.value = session.assigned_admin_id ? String(session.assigned_admin_id) : '';
        const canReassign = CURRENT_ADMIN && ['superadmin', 'project_admin'].includes(CURRENT_ADMIN.role);
        chatAssigneeSelect.disabled = !canReassign;
        if (assigneeSelectorContainer) {
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
    // Manage input visibility and claim status
    const isSuper = CURRENT_ADMIN && CURRENT_ADMIN.role === 'superadmin';
    const isClaimedByMe = session.claimed_by_admin_id && Number(session.claimed_by_admin_id) === Number(CURRENT_ADMIN?.id);
    const isAssignedToMe = session.assigned_admin_id && Number(session.assigned_admin_id) === Number(CURRENT_ADMIN?.id);
    const isClaimedByOther = session.claimed_by_admin_id && Number(session.claimed_by_admin_id) !== Number(CURRENT_ADMIN?.id);

    const claimChatBtn = document.getElementById('claim-chat-btn');

    if (session.status === 'closed') {
        chatInputContainer.classList.add('hide');
        closeSessionBtn.classList.add('hide');
        if (claimChatBtn) claimChatBtn.classList.add('hide');
    } else {
        chatInputContainer.classList.remove('hide');
        closeSessionBtn.classList.remove('hide');

        // Check if user has permission to reply
        const canReply = isSuper || isClaimedByMe || isAssignedToMe;
        if (chatInput) {
            chatInput.disabled = !canReply;
            if (!canReply) {
                chatInput.value = '';
                chatInput.placeholder = isClaimedByOther
                    ? '🔒 Cuộc trò chuyện đã được nhân viên khác tiếp nhận.'
                    : '🔒 Vui lòng nhấn "Tiếp nhận" ở trên để bắt đầu trả lời tin nhắn...';
            } else {
                chatInput.placeholder = dict.replyPlaceholder || 'Nhập tin nhắn trả lời khách hàng...';
            }
        }
        const sendBtn = chatForm ? chatForm.querySelector('button[type="submit"]') : null;
        if (sendBtn) sendBtn.disabled = !canReply;

        // Update claim button UI
        if (claimChatBtn) {
            claimChatBtn.classList.remove('hide');
            if (isClaimedByMe) {
                claimChatBtn.disabled = true;
                claimChatBtn.style.opacity = '0.9';
                claimChatBtn.style.background = 'rgba(16, 185, 129, 0.25)';
                claimChatBtn.style.borderColor = 'rgba(16, 185, 129, 0.6)';
                claimChatBtn.innerHTML = '<i class="ri-checkbox-circle-fill"></i> <span>Đã tiếp nhận</span>';
            } else if (isClaimedByOther) {
                claimChatBtn.disabled = !isSuper;
                claimChatBtn.style.opacity = '0.6';
                claimChatBtn.style.background = 'rgba(255, 255, 255, 0.05)';
                claimChatBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                claimChatBtn.innerHTML = '<i class="ri-user-follow-line"></i> <span>Đã có người nhận</span>';
            } else {
                claimChatBtn.disabled = false;
                claimChatBtn.style.opacity = '1';
                claimChatBtn.style.background = 'rgba(16, 185, 129, 0.14)';
                claimChatBtn.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                claimChatBtn.innerHTML = '<i class="ri-hand-heart-line"></i> <span>Tiếp nhận</span>';
            }
        }
    }

    // Show premium loading spinner inside messages container
    chatMessagesContainer.innerHTML = `
        <div class="chat-loading-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 15px; color: var(--text-secondary);">
            <div class="spinner-glow" style="width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.05); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);"></div>
            <span style="font-size: 13.5px; font-weight: 500; letter-spacing: 0.3px; color: var(--text-muted);">${dict.translatingWithAI || 'Đang dịch thuật...'}</span>
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

        if (!Array.isArray(fetchedMessages)) {
            if (chatMessagesContainer.querySelector('.chat-loading-state')) {
                renderAdminMessages(false);
            }
            return;
        }

        if (isLoadMore) {
            if (fetchedMessages.length < adminLimit) {
                adminHasMore = false;
            }
            // Prepend older messages
            adminMessages = [...fetchedMessages, ...adminMessages];
            adminOffset += fetchedMessages.length;
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
                               return !o || o.id !== m.id || o.translated_text !== m.translated_text || o.original_text !== m.original_text;
                           });

            adminMessages = merged;

            // Keep local seen count in sync while admin is viewing
            if (currentSessionId) seenMessageCount[currentSessionId] = adminMessages.length;

            if (isDiff || hasLoadingState) {
                renderAdminMessages(false);
            }
        }
    } catch (e) {
        console.error('Error loading messages:', e);
        if (chatMessagesContainer.querySelector('.chat-loading-state')) {
            renderAdminMessages(false);
        }
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
    if (e) e.preventDefault();
    if (adminIsSending) return;
    const text = chatInput.value.trim();
    if (!text || !currentSessionId) return;

    adminIsSending = true;
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
            // Replace temp message smoothly with the confirmed message returned from server
            const idx = adminMessages.findIndex(m => m.id === newMsgObj.id);
            if (idx !== -1 && data.message) {
                adminMessages[idx] = data.message;
            }
            renderAdminMessages(false);
        } else {
            adminMessages = adminMessages.filter(m => m.id !== newMsgObj.id);
            renderAdminMessages(false);
            alert(dict.sendError + (data.error || ''));
        }
    } catch (e) {
        console.error('Send error:', e);
        adminMessages = adminMessages.filter(m => m.id !== newMsgObj.id);
        renderAdminMessages(false);
    } finally {
        adminIsSending = false;
    }
}

async function claimCurrentChat() {
    if (!currentSessionId) return;
    const response = await authFetch(`${API_BASE}/api/admin/chats/${currentSessionId}/claim`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) return alert(data.error || 'Không thể tiếp nhận chat.');
    await fetchSessions();
    await selectSession(currentSessionId);
}

document.getElementById('claim-chat-btn')?.addEventListener('click', claimCurrentChat);

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
        staffList.forEach(admin => {
            const opt = document.createElement('option');
            opt.value = admin.id;
            const roleLabel = admin.role === 'superadmin' ? 'Superadmin' : admin.role === 'project_admin' ? 'Admin' : 'Agent';
            opt.textContent = `${admin.full_name || admin.username} (${roleLabel})`;
            chatAssigneeSelect.appendChild(opt);
        });
    }
    if (currentVal) chatAssigneeSelect.value = currentVal;
}

if (chatAssigneeSelect) {
    chatAssigneeSelect.addEventListener('change', async (e) => {
        if (!currentSessionId) return;
        const newAdminId = e.target.value ? e.target.value : null;
        try {
            const response = await authFetch(`${API_BASE}/api/admin/chats/${currentSessionId}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedAdminId: newAdminId })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                const sess = sessionsList.find(s => s.id === currentSessionId);
                if (sess) sess.assigned_admin_id = newAdminId;
                await fetchSessions();
                await loadMessages(currentSessionId);
            } else {
                alert(data.error || 'Không thể phân công cuộc trò chuyện.');
            }
        } catch (err) {
            alert('Lỗi kết nối khi phân công: ' + err.message);
        }
    });
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
            resetActiveChatUI();
            await fetchSessions();
            alert(dict.deleteSuccess);
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
const pushPermissionModal = document.getElementById('push-permission-modal');
function closePushPermissionModal() { pushPermissionModal?.classList.add('hide'); }
document.getElementById('enable-push-btn')?.addEventListener('click', () => {
    document.getElementById('settings-dropdown-menu')?.classList.add('hide');
    if (!('Notification' in window)) return alert('Trình duyệt này chưa hỗ trợ thông báo.');
    if (Notification.permission === 'granted') return enablePushNotifications().then(closePushPermissionModal).catch(console.error);
    pushPermissionModal?.classList.remove('hide');
});
document.getElementById('push-modal-confirm')?.addEventListener('click', () => {
    const button = document.getElementById('push-modal-confirm');
    if (button) { button.disabled = true; button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang bật thông báo...'; }
    enablePushNotifications().then(() => {
        closePushPermissionModal();
    }).catch((error) => {
        console.error('Không thể bật Web Push:', error);
        alert(error.message || 'Không thể bật thông báo trên thiết bị này.');
    }).finally(() => {
        if (button) { button.disabled = false; button.innerHTML = '<i class="ri-notification-3-fill"></i> Bật thông báo ngay'; }
    });
});

// Quản lý dự án: nút thêm + Enter
const projectAddBtn = document.getElementById('project-add-btn');
if (projectAddBtn) projectAddBtn.addEventListener('click', addProject);
const projectNewName = document.getElementById('project-new-name');
if (projectNewName) projectNewName.addEventListener('keypress', (e) => { if (e.key === 'Enter') addProject(); });

// Đăng nhập từ form bằng tài khoản DealPhuQuoc. Cổng Deal sẽ xác thực rồi
// trả về URL này với token SSO ngắn hạn.
const ssoLoginBtn = document.getElementById('sso-login-btn');
const ssoLoginMenu = document.querySelector('.sso-login-menu');
const ssoLoginOptions = document.getElementById('sso-login-options');
if (ssoLoginBtn) {
    ssoLoginBtn.addEventListener('click', () => {
        ssoLoginOptions?.classList.toggle('hide');
        ssoLoginMenu?.classList.toggle('is-open', !ssoLoginOptions?.classList.contains('hide'));
    });
}
document.querySelectorAll('[data-sso-portal]').forEach((option) => {
    option.addEventListener('click', async () => {
        const portal = option.dataset.ssoPortal;
        ssoLoginBtn.disabled = true;
        const returnUrl = window.location.origin + '/admin';
        try {
            const response = await fetch(`${API_BASE}/api/admin/sso-login-url?portal=${encodeURIComponent(portal)}&return_to=${encodeURIComponent(returnUrl)}`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.url) throw new Error(data.error || 'Không thể mở đăng nhập DealPhuQuoc.');
            window.location.assign(data.url);
        } catch (error) {
            ssoLoginBtn.disabled = false;
            if (loginErrorMsg) { loginErrorMsg.textContent = error.message || 'Không thể mở đăng nhập DealPhuQuoc.'; loginErrorMsg.style.display = 'block'; }
        }
    });
});
document.addEventListener('click', (event) => {
    if (ssoLoginMenu && !ssoLoginMenu.contains(event.target)) {
        ssoLoginOptions?.classList.add('hide');
        ssoLoginMenu.classList.remove('is-open');
    }
});

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
const kbProjectSelect = document.getElementById('kb-project-select');
const kbProjectHint = document.getElementById('kb-project-hint');
const kbSyncBtn = document.getElementById('kb-sync-btn');
const kbSyncDealDbBtn = document.getElementById('kb-sync-deal-db-btn');
const kbDealDbStatus = document.getElementById('kb-deal-db-status');
const kbDealDbSyncCard = document.getElementById('kb-deal-db-sync-card');
const kbSaveManualBtn = document.getElementById('kb-save-manual-btn');
const kbCloseBtn = document.getElementById('kb-close-btn');
const kbUrlInput = document.getElementById('kb-url-input');
const kbTextArea = document.getElementById('kb-text-area');
const kbSyncStatus = document.getElementById('kb-sync-status');

function getActiveKbProjectId() {
    if (CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin' && CURRENT_ADMIN.project_id) {
        return CURRENT_ADMIN.project_id;
    }
    return (kbProjectSelect && kbProjectSelect.value) ? kbProjectSelect.value : (currentProjectFilter || 'pastie-landingpage');
}

if (knowledgeSettingsBtn) {
    knowledgeSettingsBtn.addEventListener('click', () => { closeSettingsDropdown(); openKnowledgeModal(); });
}
if (kbCloseBtn) {
    kbCloseBtn.addEventListener('click', closeKnowledgeModal);
}
if (kbProjectSelect) {
    kbProjectSelect.addEventListener('change', () => {
        loadKnowledgeForProject(kbProjectSelect.value);
    });
}
if (kbSyncBtn) {
    kbSyncBtn.addEventListener('click', syncKnowledgeFromUrl);
}
if (kbSyncDealDbBtn) {
    kbSyncDealDbBtn.addEventListener('click', syncKnowledgeFromDealDb);
}
if (kbSaveManualBtn) {
    kbSaveManualBtn.addEventListener('click', saveKnowledgeManual);
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
            alert(data.message || 'Đồng bộ Database DealPhuQuoc thành công!');
            await loadKnowledgeForProject(activeProjectId);
        } else {
            alert('Lỗi: ' + (data.error || 'Không thể đồng bộ database.'));
            if (kbDealDbStatus) {
                kbDealDbStatus.innerHTML = `<i class="ri-error-warning-line" style="color: var(--danger-color);"></i> <span>Lỗi: ${data.error}</span>`;
            }
        }
    } catch (err) {
        alert('Lỗi kết nối: ' + err.message);
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
        alert('Vui lòng nhập URL!');
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
            alert(data.message || 'Đồng bộ tri thức từ Landing Page thành công!');
            await loadKnowledgeForProject(activeProjectId);
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
            alert(data.message || 'Lưu tri thức thủ công thành công!');
            await loadKnowledgeForProject(activeProjectId);
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
                body: JSON.stringify({ keywords: currentKeywords, projectId: currentProjectFilter || 'pastie-landingpage' })
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
            keywordSaveBtn.innerHTML = `<i class="ri-save-line"></i> Lưu`;
        }
    });
}

// --- KEYWORD MODAL (standalone) ---
const keywordModal = document.getElementById('keyword-modal');
const keywordSettingsBtn = document.getElementById('keyword-settings-btn');
const keywordModalCloseBtn = document.getElementById('keyword-modal-close-btn');

if (keywordSettingsBtn) {
    keywordSettingsBtn.addEventListener('click', async () => {
        closeSettingsDropdown();
        if (keywordModal) keywordModal.classList.remove('hide');
        const pid = currentProjectFilter || 'pastie-landingpage';
        try {
            const res = await authFetch(`${API_BASE}/api/admin/keywords?projectId=${encodeURIComponent(pid)}`);
            const data = await res.json();
            renderKeywordTags(data.keywords || []);
        } catch(e) { console.error('Error loading keywords:', e); }
    });
}
if (keywordModalCloseBtn) {
    keywordModalCloseBtn.addEventListener('click', () => keywordModal && keywordModal.classList.add('hide'));
}

// --- WHATSAPP CHANNEL SETTINGS MODAL ---
const channelModal = document.getElementById('channel-modal');
const channelSettingsBtn = document.getElementById('channel-settings-btn');
const channelCloseBtn = document.getElementById('channel-close-btn');
const channelForm = document.getElementById('channel-config-form');
const channelPhoneInput = document.getElementById('channel-whatsapp-phone');
const channelPhoneIdInput = document.getElementById('channel-whatsapp-phone-id');
const channelWabaIdInput = document.getElementById('channel-whatsapp-waba-id');
const channelTokenInput = document.getElementById('channel-whatsapp-token');
const channelWebhookUrlEl = document.getElementById('channel-webhook-url');
const channelVerifyTokenEl = document.getElementById('channel-verify-token');
const channelStatusMsg = document.getElementById('channel-status-msg');
const channelDirectLinkInput = document.getElementById('channel-direct-link-input');
const channelDirectLinkOpen = document.getElementById('channel-direct-link-open');
const channelDirectLinkCopyBtn = document.getElementById('channel-direct-link-copy-btn');

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

if (channelSettingsBtn) {
    channelSettingsBtn.addEventListener('click', openChannelModal);
}
if (channelCloseBtn) {
    channelCloseBtn.addEventListener('click', () => channelModal && channelModal.classList.add('hide'));
}
if (channelDirectLinkCopyBtn) {
    channelDirectLinkCopyBtn.addEventListener('click', () => {
        const val = channelDirectLinkInput?.value;
        if (!val) return;
        navigator.clipboard.writeText(val);
        alert('Đã sao chép Direct Link WhatsApp!');
    });
}
if (channelForm) {
    channelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pid = currentProjectFilter || (CURRENT_ADMIN && CURRENT_ADMIN.project_id) || 'pastie-landingpage';
        const saveBtn = document.getElementById('channel-save-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang lưu...';
        }
        try {
            const res = await authFetch(`${API_BASE}/api/admin/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: pid,
                    whatsappPhoneNumberId: channelPhoneIdInput?.value,
                    whatsappWabaId: channelWabaIdInput?.value,
                    whatsappBusinessPhone: channelPhoneInput?.value,
                    whatsappAccessToken: channelTokenInput?.value,
                    metaVerifyToken: channelVerifyTokenEl?.textContent
                })
            });
            const data = await res.json();
            if (res.ok) {
                if (channelStatusMsg) {
                    channelStatusMsg.style.display = 'block';
                    channelStatusMsg.style.background = 'rgba(16, 185, 129, 0.15)';
                    channelStatusMsg.style.color = '#34d399';
                    channelStatusMsg.innerHTML = '<i class="ri-checkbox-circle-fill"></i> Đã lưu cấu hình WhatsApp thành công!';
                }
                const cleanPhone = (channelPhoneInput?.value || '').replace(/[^0-9]/g, '');
                const directLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Xin chào! Tôi cần tư vấn thông tin dịch vụ.')}` : '';
                if (channelDirectLinkInput) channelDirectLinkInput.value = directLink;
                if (channelDirectLinkOpen) channelDirectLinkOpen.href = directLink || '#';
            } else {
                if (channelStatusMsg) {
                    channelStatusMsg.style.display = 'block';
                    channelStatusMsg.style.background = 'rgba(239, 68, 68, 0.15)';
                    channelStatusMsg.style.color = '#f87171';
                    channelStatusMsg.innerHTML = `<i class="ri-error-warning-fill"></i> ${data.error || 'Lỗi lưu cấu hình'}`;
                }
            }
        } catch (err) {
            if (channelStatusMsg) {
                channelStatusMsg.style.display = 'block';
                channelStatusMsg.style.background = 'rgba(239, 68, 68, 0.15)';
                channelStatusMsg.style.color = '#f87171';
                channelStatusMsg.innerHTML = '<i class="ri-error-warning-fill"></i> Lỗi kết nối mạng.';
            }
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="ri-save-line"></i> Lưu cấu hình WhatsApp';
            }
        }
    });
}

// --- CHAT HISTORY SYNTHESIS ---
const synthesisRunBtn = document.getElementById('synthesis-run-btn');
const synthesisStatus = document.getElementById('synthesis-status');

if (synthesisRunBtn) {
    synthesisRunBtn.addEventListener('click', async () => {
        const activeProjectId = getActiveKbProjectId();
        synthesisRunBtn.disabled = true;
        synthesisRunBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang tổng hợp...`;
        if (synthesisStatus) synthesisStatus.textContent = `Đang phân tích lịch sử chat của [${activeProjectId}]...`;
        try {
            const res = await authFetch(`${API_BASE}/api/admin/kb/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: activeProjectId })
            });
            const data = await res.json();
            if (synthesisStatus) synthesisStatus.textContent = data.success
                ? `✅ Đang tổng hợp tri thức cho ${activeProjectId}...`
                : `❌ ${data.error || 'Thất bại'}`;
        } catch (e) {
            if (synthesisStatus) synthesisStatus.textContent = '❌ Lỗi kết nối máy chủ';
        } finally {
            synthesisRunBtn.disabled = false;
            synthesisRunBtn.innerHTML = `<i class="ri-brain-line"></i> Tổng hợp ngay`;
        }
    });
}

// --- WHATSAPP CHANNEL SETTINGS DIALOG ---
const channelModal = document.getElementById('channel-modal');
const channelSettingsBtn = document.getElementById('channel-settings-btn');
const channelCloseBtn = document.getElementById('channel-close-btn');
const channelConfigForm = document.getElementById('channel-config-form');

if (channelSettingsBtn) {
    channelSettingsBtn.addEventListener('click', () => { closeSettingsDropdown(); openChannelModal(); });
}
if (channelCloseBtn) {
    channelCloseBtn.addEventListener('click', closeChannelModal);
}
if (channelConfigForm) {
    channelConfigForm.addEventListener('submit', saveChannelConfig);
}

async function openChannelModal() {
    channelModal.classList.remove('hide');
    const statusEl = document.getElementById('channel-status-msg');
    if (statusEl) statusEl.style.display = 'none';
    const activeProject = (CURRENT_ADMIN && CURRENT_ADMIN.project_id) ? CURRENT_ADMIN.project_id : (currentProjectFilter || 'pastie-landingpage');
    try {
        const response = await authFetch(`${API_BASE}/api/admin/channels?projectId=${encodeURIComponent(activeProject)}`);
        const data = await response.json();
        if (data.config) {
            const phoneIdEl = document.getElementById('channel-whatsapp-phone-id');
            const wabaIdEl = document.getElementById('channel-whatsapp-waba-id');
            const phoneEl = document.getElementById('channel-whatsapp-phone');
            const tokenEl = document.getElementById('channel-whatsapp-token');
            const webhookUrlEl = document.getElementById('channel-webhook-url');
            const verifyTokenEl = document.getElementById('channel-verify-token');

            if (phoneIdEl) phoneIdEl.value = data.config.whatsapp_phone_number_id || '';
            if (wabaIdEl) wabaIdEl.value = data.config.whatsapp_waba_id || '';
            if (phoneEl) phoneEl.value = data.config.whatsapp_business_phone || '';
            if (tokenEl) tokenEl.value = data.config.whatsapp_access_token || '';
            if (webhookUrlEl && data.config.webhook_url) webhookUrlEl.textContent = data.config.webhook_url;
            if (verifyTokenEl && data.config.meta_verify_token) verifyTokenEl.textContent = data.config.meta_verify_token;
        }
    } catch (e) {
        console.error('Error fetching channel settings:', e);
    }
}

function closeChannelModal() {
    channelModal.classList.add('hide');
}

function showChannelStatus(msg, isError = false) {
    const el = document.getElementById('channel-status-msg');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = isError ? 'rgba(239,68,68,0.15)' : 'rgba(37,211,102,0.15)';
    el.style.color = isError ? '#f87171' : '#25D366';
    el.style.border = isError ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(37,211,102,0.3)';
}

async function saveChannelConfig(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('channel-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Đang lưu...`;

    const activeProject = (CURRENT_ADMIN && CURRENT_ADMIN.project_id) ? CURRENT_ADMIN.project_id : (currentProjectFilter || 'pastie-landingpage');

    const payload = {
        projectId: activeProject,
        whatsappPhoneNumberId: document.getElementById('channel-whatsapp-phone-id')?.value.trim() || '',
        whatsappWabaId: document.getElementById('channel-whatsapp-waba-id')?.value.trim() || '',
        whatsappBusinessPhone: document.getElementById('channel-whatsapp-phone')?.value.trim() || '',
        whatsappAccessToken: document.getElementById('channel-whatsapp-token')?.value.trim() || '',
        metaVerifyToken: document.getElementById('channel-verify-token')?.textContent.trim() || 'pastie_verify_token_2026'
    };

    try {
        const response = await authFetch(`${API_BASE}/api/admin/channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showChannelStatus('✅ Đã lưu cấu hình WhatsApp thành công! Hệ thống sẵn sàng nhận & gửi tin nhắn.');
        } else {
            showChannelStatus('❌ ' + (data.error || 'Không thể lưu cấu hình.'), true);
        }
    } catch (err) {
        showChannelStatus('❌ Lỗi kết nối: ' + err.message, true);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="ri-save-line"></i> Lưu cấu hình WhatsApp`;
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

if (manageAdminsBtn) manageAdminsBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    window.openAdminManagement();
});
if (adminMgmtCloseTopBtn) adminMgmtCloseTopBtn.addEventListener('click', closeAdminMgmt);
if (adminMgmtCloseBtn) adminMgmtCloseBtn.addEventListener('click', closeAdminMgmt);
if (adminUserForm) adminUserForm.addEventListener('submit', handleAdminUserSubmit);

const adminFormId = document.getElementById('admin-form-id');
const adminFormFullname = document.getElementById('admin-form-fullname');
const adminFormUsername = document.getElementById('admin-form-username');
const adminFormPassword = document.getElementById('admin-form-password');
const adminFormRole = document.getElementById('admin-form-role');
const adminFormProject = document.getElementById('admin-form-project');
const adminFormActive = document.getElementById('admin-form-active');
const adminFormAvatar = document.getElementById('admin-form-avatar');
const adminAvatarPicker = document.getElementById('admin-avatar-picker');
const adminFormStatusGroup = document.getElementById('admin-form-status-group');
const adminFormTitle = document.getElementById('admin-form-title');
const adminFormSubmitBtn = document.getElementById('admin-form-submit-btn');
const adminFormCancelBtn = document.getElementById('admin-form-cancel-btn');
if (adminFormCancelBtn) adminFormCancelBtn.addEventListener('click', resetAdminForm);

const ADMIN_AVATARS = [
    { id: 'gradient-1', label: 'Tím', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { id: 'gradient-2', label: 'Hồng', background: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
    { id: 'gradient-3', label: 'Xanh lá', background: 'linear-gradient(135deg,#10b981,#14b8a6)' },
    { id: 'gradient-4', label: 'Cam', background: 'linear-gradient(135deg,#f59e0b,#f97316)' },
    { id: 'gradient-5', label: 'Xanh dương', background: 'linear-gradient(135deg,#0ea5e9,#2563eb)' }
];

function renderAdminAvatarPicker(selectedId = 'gradient-1') {
    if (!adminAvatarPicker) return;
    adminAvatarPicker.innerHTML = '';
    ADMIN_AVATARS.forEach(avatar => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = `avatar-picker-option${avatar.id === selectedId ? ' selected' : ''}`;
        option.style.background = avatar.background;
        option.title = `Avatar ${avatar.label}`;
        option.setAttribute('aria-label', `Chọn avatar ${avatar.label}`);
        option.addEventListener('click', () => renderAdminAvatarPicker(avatar.id));
        adminAvatarPicker.appendChild(option);
    });
    if (adminFormAvatar) adminFormAvatar.value = selectedId;
}

function openAdminMgmt() {
    if (adminMgmtModal) adminMgmtModal.classList.remove('hide');
    
    const isSuper = CURRENT_ADMIN && CURRENT_ADMIN.role === 'superadmin';
    const isProjectAdmin = CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin';

    const projectMgmtBox = document.querySelector('.admin-project-management');
    const projectFormGroup = document.getElementById('admin-form-project-group');
    const roleSelect = document.getElementById('admin-form-role');
    const subtitleEl = document.getElementById('admin-mgmt-subtitle');

    if (isProjectAdmin) {
        if (projectMgmtBox) projectMgmtBox.classList.add('hide');
        if (projectFormGroup) projectFormGroup.classList.add('hide');
        if (roleSelect) {
            roleSelect.innerHTML = '<option value="agent">Agent (Tư vấn viên trực chat)</option>';
            roleSelect.value = 'agent';
            roleSelect.disabled = true;
        }
        if (subtitleEl) {
            subtitleEl.textContent = `Quản lý danh sách Agent tư vấn của bạn [${CURRENT_ADMIN.project_id || 'Dự án'}].`;
        }
    } else {
        if (projectMgmtBox) projectMgmtBox.classList.remove('hide');
        if (projectFormGroup) projectFormGroup.classList.remove('hide');
        if (roleSelect) {
            roleSelect.innerHTML = `
                <option value="agent">Agent (Tư vấn viên trực chat)</option>
                <option value="project_admin">Project Admin (Quản trị dự án)</option>
                <option value="superadmin">Quản trị viên tối cao (Super-Admin)</option>
            `;
            roleSelect.value = 'agent';
            roleSelect.disabled = false;
        }
        if (subtitleEl) {
            subtitleEl.textContent = 'Quản lý tài khoản, phân quyền và trạng thái hoạt động của nhân viên toàn hệ thống.';
        }

        // Populate projects in form dropdown
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

    loadAdminUsers();
    resetAdminForm();
}
window.openAdminManagement = () => {
    closeSettingsDropdown();
    openAdminMgmt();
};

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

        const countBadge = document.getElementById('admin-user-count-badge');
        if (countBadge) countBadge.textContent = `${users.length} nhân viên`;

        if (users.length === 0) {
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

        adminListContainer.innerHTML = users.map(u => {
            const isSelf = CURRENT_ADMIN && Number(CURRENT_ADMIN.id) === Number(u.id);
            const isCreatedByMe = CURRENT_ADMIN && u.created_by_admin_id && Number(u.created_by_admin_id) === Number(CURRENT_ADMIN.id);
            const bgGradient = avatarGradients[u.avatar_url] || avatarGradients['gradient-1'];
            const initial = (u.full_name || u.username || 'A').trim().charAt(0).toUpperCase();

            let roleLabel = 'Agent';
            let roleClass = 'agent';
            if (u.role === 'superadmin') {
                roleLabel = 'Superadmin';
                roleClass = 'superadmin';
            } else if (u.role === 'project_admin') {
                roleLabel = 'Project Admin';
                roleClass = 'project_admin';
            }

            const canDelete = !isSelf && (CURRENT_ADMIN.role === 'superadmin' || isCreatedByMe);

            return `
                <div class="admin-user-card ${isSelf ? 'is-self' : ''}">
                    <div class="admin-user-info">
                        <div class="admin-user-avatar" style="background: ${bgGradient};">
                            ${initial}
                            <span class="online-dot ${u.is_active ? 'active' : 'inactive'}"></span>
                        </div>
                        <div class="admin-user-details">
                            <h4>
                                ${escapeHtml(u.full_name || u.username)}
                                ${isSelf ? '<span style="font-size:10.5px; color:#ec4899; font-weight:700;">(Bạn)</span>' : ''}
                            </h4>
                            <p>
                                <span>${escapeHtml(u.username)}</span>
                                ${u.project_id ? ` · <span style="color:#818cf8; font-weight:500;">${escapeHtml(u.project_id)}</span>` : ''}
                            </p>
                            <div style="margin-top: 2px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                                <span class="admin-user-role-badge ${roleClass}">
                                    ${roleLabel}
                                </span>
                                ${u.is_active ? '<span style="font-size:10.5px; color:#34d399; font-weight:600;">✓ Hoạt động</span>' : '<span style="font-size:10.5px; color:#f87171; font-weight:600;">✗ Đã khóa</span>'}
                                ${isCreatedByMe && !isSelf ? '<span style="font-size:9.5px; color:#ec4899; background:rgba(236,72,153,0.12); border:1px solid rgba(236,72,153,0.25); padding:1px 5px; border-radius:4px; font-weight:600;">Do bạn tạo</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="admin-user-actions">
                        <button onclick="editAdminUser(${u.id})" class="icon-btn" title="Chỉnh sửa" style="width:28px; height:28px; font-size:13px; background:rgba(99,102,241,0.12); color:#818cf8; border:1px solid rgba(99,102,241,0.25); border-radius:6px; cursor:pointer;"><i class="ri-edit-line"></i></button>
                        ${canDelete ? `<button onclick="deleteAdminUser(${u.id})" class="icon-btn" title="Xóa tài khoản" style="width:28px; height:28px; font-size:13px; background:rgba(239,68,68,0.1); color:#f87171; border:1px solid rgba(239,68,68,0.25); border-radius:6px; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) {
        adminListContainer.innerHTML = '<p style="color:#f87171;font-size:12px;text-align:center;">Lỗi kết nối máy chủ.</p>';
    }
}

function resetAdminForm() {
    if (!adminUserForm) return;
    adminUserForm.reset();
    if (adminFormId) adminFormId.value = '';
    if (adminFormTitle) adminFormTitle.innerHTML = '<i class="ri-user-add-line" style="color:var(--accent-color);"></i> Thêm nhân viên mới';
    if (adminFormSubmitBtn) adminFormSubmitBtn.innerHTML = '<i class="ri-user-add-line"></i> Lưu nhân viên';
    if (adminFormCancelBtn) adminFormCancelBtn.style.display = 'none';
    if (adminFormStatusGroup) adminFormStatusGroup.style.display = 'none';
    if (adminFormPassword) adminFormPassword.required = true;
    
    if (CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin') {
        if (adminFormRole) { adminFormRole.value = 'agent'; adminFormRole.disabled = true; }
        if (adminFormProject) { adminFormProject.value = CURRENT_ADMIN.project_id || ''; }
    } else {
        if (adminFormRole) { adminFormRole.value = 'agent'; adminFormRole.disabled = false; }
    }

    renderAdminAvatarPicker();
    const pwLabel = document.getElementById('admin-form-password-label');
    if (pwLabel) pwLabel.textContent = 'Mật khẩu *';
}

async function editAdminUser(id) {
    try {
        const res = await authFetch(`${API_BASE}/api/admin/users`);
        const users = await res.json();
        const u = users.find(x => x.id === id);
        if (!u) return;
        if (adminFormId) adminFormId.value = u.id;
        if (adminFormFullname) adminFormFullname.value = u.full_name || '';
        if (adminFormUsername) adminFormUsername.value = u.username || '';
        if (adminFormPassword) {
            adminFormPassword.value = '';
            adminFormPassword.required = false;
        }
        if (adminFormRole) {
            adminFormRole.value = u.role;
            if (CURRENT_ADMIN?.role === 'project_admin') adminFormRole.disabled = true;
        }
        if (adminFormProject) adminFormProject.value = u.project_id || '';
        if (adminFormActive) adminFormActive.checked = u.is_active;
        renderAdminAvatarPicker(u.avatar_url || 'gradient-1');
        if (adminFormStatusGroup) adminFormStatusGroup.style.display = 'flex';
        if (adminFormTitle) adminFormTitle.innerHTML = `<i class="ri-edit-line" style="color:#ec4899;"></i> Sửa nhân viên: ${escapeHtml(u.full_name || u.username)}`;
        if (adminFormSubmitBtn) adminFormSubmitBtn.innerHTML = '<i class="ri-save-line"></i> Cập nhật';
        if (adminFormCancelBtn) adminFormCancelBtn.style.display = 'inline-flex';
        const pwLabel = document.getElementById('admin-form-password-label');
        if (pwLabel) pwLabel.textContent = 'Mật khẩu mới (để trống nếu giữ nguyên)';
    } catch(e) { console.error('Error in editAdminUser:', e); }
}

async function deleteAdminUser(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản nhân viên này?')) return;
    try {
        const res = await authFetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) { 
            await loadAdminUsers(); 
        } else { 
            alert('Lỗi: ' + (data.error || 'Không thể xóa.')); 
        }
    } catch(e) { alert('Lỗi kết nối máy chủ.'); }
}

async function handleAdminUserSubmit(e) {
    e.preventDefault();
    const id = adminFormId ? adminFormId.value : '';
    
    const isProjectAdmin = CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin';
    const effectiveRole = isProjectAdmin ? 'agent' : (adminFormRole?.value || 'agent');
    const effectiveProject = isProjectAdmin ? CURRENT_ADMIN.project_id : (adminFormProject?.value.trim() || null);

    const payload = {
        username: adminFormUsername?.value.trim(),
        password: adminFormPassword?.value.trim(),
        full_name: adminFormFullname?.value.trim(),
        role: effectiveRole,
        avatar_url: adminFormAvatar?.value || 'gradient-1',
        project_id: effectiveProject,
        is_active: adminFormActive ? adminFormActive.checked : true
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
        if (res.ok) { 
            resetAdminForm(); 
            await loadAdminUsers(); 
            alert(id ? 'Cập nhật tài khoản thành công!' : 'Tạo tài khoản nhân viên thành công!');
        } else { 
            alert('Lỗi: ' + (data.error || 'Không thể lưu.')); 
        }
    } catch(e) { alert('Lỗi kết nối máy chủ: ' + e.message); }
}

verifyAuthAndInit();
