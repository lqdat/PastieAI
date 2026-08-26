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
    },
    ko: {
        loginTitle: "Pastie AI 관리자",
        loginSubtitle: "콘솔에 접속하려면 관리자 비밀번호를 입력하세요",
        passwordPlaceholder: "보안 비밀번호...",
        loginError: "비밀번호가 올바르지 않습니다. 다시 시도해 주세요.",
        loginBtn: "콘솔 접속",
        headerTitle: "Pastie AI 콘솔",
        allProjects: "모든 프로젝트",
        exportCsv: "CSV 내보내기 (세일즈 스크립트)",
        exportJsonl: "JSONL 내보내기 (학습 데이터)",
        logoutTitle: "로그아웃",
        chatListTitle: "대화 목록",
        refreshTitle: "새로고침",
        loadingConversations: "대화를 불러오는 중...",
        noChatSelected: "선택된 대화가 없습니다",
        selectChatPrompt: "왼쪽 목록에서 대화를 선택하세요",
        closeChat: "대화 종료",
        welcomePrompt: "대화를 선택하면 자동 번역과 함께 응대를 시작할 수 있습니다.",
        aiTranslationPrompt: "보내신 메시지는 고객의 언어로 자동 번역됩니다",
        chatInputPlaceholder: "여기에 답변을 입력하세요...",
        detailsTitle: "상세 정보",
        detectedLangLabel: "감지된 언어",
        notDetected: "감지되지 않음",
        intentTagsLabel: "의도 태그",
        aiSummaryLabel: "AI 요약",
        closeChatToAnalyze: "\"대화 종료\"를 눌러 이 대화를 분석하고 요약하세요.",
        projectLabel: "프로젝트",
        clientInfoLabel: "고객 정보",
        statusActive: "진행 중",
        statusClosed: "종료됨",
        noEmail: "이메일 없음",
        emptyConversations: "대화가 없습니다",
        emptyChatHistory: "아직 메시지가 없습니다",
        translatingWithAI: "AI가 번역 중...",
        sentJustNow: "방금 전",
        closeConfirm: "이 대화를 종료하시겠습니까? AI가 대화를 요약합니다.",
        closingStatus: "종료 중...",
        unclassified: "분류되지 않음",
        connecting: "연결 중...",
        connError: "서버에 연결할 수 없습니다.",
        closeError: "대화를 종료하지 못했습니다.",
        sendError: "메시지를 보내지 못했습니다: ",
        loadOlder: "이전 메시지 불러오기",
        loadingMore: "불러오는 중...",
        labelOriginal: "원문:",
        labelAiTranslation: "번역:",
        deleteChat: "대화 삭제",
        deleteConfirm: "이 대화와 모든 메시지를 영구히 삭제하시겠습니까? 되돌릴 수 없습니다.",
        deleteSuccess: "대화가 삭제되었습니다.",
        deleteError: "대화를 삭제하지 못했습니다."
    }
};

let currentLang = localStorage.getItem('pastie_admin_lang') || 'vi';

// --- State Variables ---
let currentSessionId = null;
// Guards async data from the prior account when the user signs in with a
// different admin without reloading the page.
let adminAuthGeneration = 0;
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
let adminIsSyncingMessages = false;
// Hóa đơn của cuộc chat đang mở — Agent cần nhìn thấy đúng hóa đơn đã gửi cho khách.
// Bộ lọc trạng thái hội thoại: 'all' | 'active' | 'closed'
let currentStatusFilter = localStorage.getItem('pastie_admin_status_filter') || 'all';
let adminOrder = null;
let adminOrderSignature = '';

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

function beginNewAdminSession(token) {
    adminAuthGeneration++;
    localStorage.setItem('pastie_admin_token', token);
    sessionsList = [];
    adminMessages = [];
    adminOffset = 0;
    adminHasMore = true;
    adminOrder = null;
    adminOrderSignature = '';
    CURRENT_ADMIN = null;
    resetActiveChatUI();
}

function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}), 'Authorization': `Bearer ${token}` };
    return fetch(url, { ...options, headers });
}

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
            beginNewAdminSession(data.token);
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

// Khởi tạo Google Sign-in button (tham khảo DealPhuQuoc)
async function initGoogleAuth() {
    try {
        const configRes = await fetch(`${API_BASE}/api/admin/auth/config`);
        const configData = await configRes.json().catch(() => ({}));
        const googleClientId = (configData.googleClientId || '').trim();

        const slot = document.getElementById('google-signin-btn-container');
        const customBtn = document.getElementById('google-auth-trigger-btn');

        const renderGoogleBtn = () => {
            if (googleClientId && window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: window.handleGoogleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                if (slot) {
                    slot.innerHTML = '';
                    try {
                        window.google.accounts.id.renderButton(slot, {
                            type: 'standard',
                            theme: 'outline',
                            size: 'large',
                            text: 'continue_with',
                            shape: 'pill',
                            logo_alignment: 'left',
                            width: 340
                        });
                    } catch(e) {}
                    if (customBtn && slot.childElementCount > 0) {
                        customBtn.classList.add('hide');
                    }
                }
            }
        };

        if (window.google?.accounts?.id) {
            renderGoogleBtn();
        } else {
            // Wait for script to load if needed
            let gsiScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
            if (gsiScript) {
                gsiScript.addEventListener('load', renderGoogleBtn, { once: true });
            }
        }
    } catch (e) {
        console.warn('Init Google auth error:', e);
    }
}

function handleGoogleAuthTrigger() {
    try {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
        } else {
            setLoginError('Đang tải mô-đun Google Sign-In, vui lòng thử lại sau giây lát hoặc sử dụng OTP Email.');
        }
    } catch(e) {
        setLoginError('Không thể mở đăng nhập Google: ' + e.message);
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
async function handleSendAdminOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
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
            
            const titleEl = document.getElementById('dpq-login-title');
            if (titleEl) titleEl.textContent = 'Nhập mã xác nhận';

            startOtpCountdown(300);
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
            sendBtn.innerHTML = '<span>Tiếp tục</span>';
        }
    }
}

// Xử lý xác thực mã OTP
async function handleVerifyAdminOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const codeInput = document.getElementById('admin-otp-code-input');
    const otpCode = codeInput ? codeInput.value.trim() : '';
    if (!otpCode || otpCode.length < 6) {
        setLoginError('Vui lòng nhập đủ 6 chữ số mã OTP.');
        return;
    }

    const verifyBtn = document.getElementById('verify-admin-otp-btn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = 'Đang kiểm tra... <i class="ri-loader-4-line ri-spin"></i>';
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
            beginNewAdminSession(data.token);
            setLoginSuccess('Xác thực thành công! Đang vào hệ thống...');
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
            verifyBtn.innerHTML = '<span>Xác nhận</span>';
        }
    }
}

function handleChangeOtpEmail() {
    if (adminOtpCountdownInterval) clearInterval(adminOtpCountdownInterval);
    document.getElementById('otp-step-verify')?.classList.add('hide');
    document.getElementById('otp-step-email')?.classList.remove('hide');
    const titleEl = document.getElementById('dpq-login-title');
    if (titleEl) titleEl.textContent = 'Pastie AI Console';
    setLoginError('');
    setLoginSuccess('');
    document.getElementById('admin-otp-email-input')?.focus();
}

// Expose handlers globally for inline HTML events
window.handleSendAdminOtp = handleSendAdminOtp;
window.handleVerifyAdminOtp = handleVerifyAdminOtp;
window.handleChangeOtpEmail = handleChangeOtpEmail;
window.handleGoogleAuthTrigger = handleGoogleAuthTrigger;

// Gắn sự kiện tương tác Form đăng nhập OTP & Google
function setupAuthEvents() {
    document.getElementById('change-otp-email-btn')?.addEventListener('click', handleChangeOtpEmail);
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
            beginNewAdminSession(d.token);
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

// ----------------------------------------------------
// BROWSER NOTIFICATIONS
// ----------------------------------------------------

const notifiedMsgCount = {}; // track last notified count per session
let pushRegistration = null;

function withPushTimeout(promise, step, timeoutMs = 15000) {
    let timer = null;
    const timeout = new Promise((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(`${step} mất quá lâu. Vui lòng tải lại trang và thử lại.`)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => { if (timer) window.clearTimeout(timer); });
}

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

// Khi dashboard được NHÚNG trong iframe (cổng DealPhuQuoc), trình duyệt chặn
// Notification.requestPermission() và new Notification() ở iframe cross-origin.
// => Chuyển việc xin quyền + hiển thị thông báo lên TRANG CHA qua postMessage.
const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
let parentNotifPermission = null;
function postToParent(payload) { try { window.parent?.postMessage(payload, '*'); } catch {} }
if (inIframe) {
    window.addEventListener('message', (e) => {
        const d = e.data || {};
        if (d && d.type === 'dpq-notif-state') {
            parentNotifPermission = d.permission;
            setPushButtonState(d.permission === 'granted' ? 'enabled' : d.permission === 'denied' ? 'blocked' : 'off');
            if (d.permission === 'granted') closePushPermissionModal();
        }
    });
    postToParent({ type: 'pastie-request-state' });
    // Nhúng trong iframe: ẩn hẳn popup + nút "Bật thông báo" trong dashboard.
    // Quyền chỉ xin ở TRANG CHA (banner DealPhuQuoc).
    const hidePushUI = () => {
        document.getElementById('push-permission-modal')?.classList.add('hide');
        document.getElementById('enable-push-btn')?.classList.add('hide');
        document.getElementById('agent-push-btn')?.classList.add('hide');
    };
    hidePushUI();
    document.addEventListener('DOMContentLoaded', hidePushUI);
    // Trang cha có thể mất vài giây mới xong; ẩn lại lần nữa cho chắc.
    setTimeout(hidePushUI, 1500);
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
        headerBtn.classList.remove('is-enabled', 'is-blocked');
        if (cfg.cls) headerBtn.classList.add(cfg.cls);
    }

    const label = document.getElementById('enable-push-label');
    const description = document.getElementById('enable-push-description');
    if (!label || !description) return;
    if (state === 'enabled') { label.textContent = 'Thông báo đã bật'; description.textContent = 'Thiết bị này sẽ nhận chat cần Agent'; }
    else if (state === 'blocked') { label.textContent = 'Thông báo đang bị chặn'; description.textContent = 'Mở quyền Thông báo trong cài đặt trình duyệt'; }
    else if (state === 'unavailable') { label.textContent = 'Push chưa được cấu hình'; description.textContent = 'Liên hệ quản trị hệ thống để bật VAPID'; }
    else { label.textContent = 'Bật thông báo'; description.textContent = 'Nhận chat mới ngay cả khi đã đóng app'; }
}

const isAppleMobile = /iPad|iPhone|iPod/i.test(`${navigator.userAgent} ${navigator.platform || ''}`)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    // Some current iOS Safari builds reduce the user-agent. Apple vendor + touch
    // capability reliably identifies those devices while excluding macOS Safari.
    || (navigator.vendor === 'Apple Computer, Inc.' && navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) <= 1180);
const isStandaloneWebApp = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const canOpenMobileShareSheet = typeof navigator.share === 'function'
    && (navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches);

// ── Hướng dẫn bật thông báo trên iPhone/iPad ────────────────────────────────
// iOS chỉ cho phép Web Push khi trang được mở từ shortcut ngoài Màn hình chính,
// và KHÔNG có API nào để web tự thêm shortcut (Apple không mở). Nên ở đây chỉ
// hiển thị các bước để khách tự làm — không nút bấm nào thay thế được bước này.
// Lưu ý: shortcut phải tạo TỪ SAFARI; Chrome/Edge/Firefox trên iOS tạo shortcut
// nhưng shortcut đó không nhận được Web Push.
const isIosNonSafariBrowser = isAppleMobile && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);

// Vẫn giữ sự kiện của Android để dùng sau; hiện tại không gắn vào nút nào.
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
});

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
        pushPermissionModal?.classList.remove('hide');
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

function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    // Quyền phải được yêu cầu từ thao tác bấm nút, đặc biệt với iPhone/iPad.
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

    playAlertSound();
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
    const url = (localStorage.getItem('notify_sound_url') || '/sounds/notify.mp3');
    try {
        const a = new Audio(url);
        a.volume = 0.6;
        a.play().catch(() => beepFallback());
    } catch { beepFallback(); }
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
        if (nameEl) nameEl.textContent = admin.full_name || admin.username;
        if (badgeEl) badgeEl.style.display = 'flex';
        const isSuperOrProjectAdmin = ['superadmin', 'project_admin'].includes(admin.role);
        const isAccountRole = ['superadmin', 'project_admin', 'agent'].includes(admin.role);
        if (manageBtn) manageBtn.classList.toggle('hide', !isAccountRole);
        const knowledgeBtn = document.getElementById('knowledge-settings-btn');
        if (knowledgeBtn) knowledgeBtn.classList.toggle('hide', admin.role !== 'superadmin');
        // Project Admin and Agent can only open the account/QR workspace; all
        // channel, knowledge and data-export settings stay Superadmin-only.
        ['keyword-settings-btn', 'channel-settings-btn', 'export-csv-btn', 'export-jsonl-btn'].forEach(id => {
            document.getElementById(id)?.classList.toggle('hide', admin.role !== 'superadmin');
        });
        if (deleteSessionBtn) deleteSessionBtn.classList.toggle('hide', admin.role !== 'superadmin');
        if (projectFilter && admin.role !== 'superadmin' && admin.project_id) {
            projectFilter.title = `Dự án được phân quyền: ${admin.project_id}`;
        }

        updateAgentHeaderUI();
    } catch (e) {
        console.error('Failed to load admin profile:', e);
    }
}

async function fetchSessions() {
    const requestGeneration = adminAuthGeneration;
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
        if (currentSessionId && !data.some(s => s.id === currentSessionId)) {
            resetActiveChatUI();
        }

        // Sync seen counts from DB + trigger notifications for new messages
        data.forEach(s => {
            const dbSeen = parseInt(s.seen_message_count);
            if (dbSeen >= 0) seenMessageCount[s.id] = dbSeen;
            else if (!(s.id in seenMessageCount)) seenMessageCount[s.id] = -1;

            // Notify if new messages arrived since last notification check
            const totalMsgs = parseInt(s.message_count) || 0;
            const lastNotified = notifiedMsgCount[s.id] ?? totalMsgs; // init = current, no spam on first load
            // CHỈ thông báo khi tin mới nhất là của KHÁCH (visitor) — bỏ qua tin AI/hệ thống/nhân viên.
            if (totalMsgs > lastNotified && s.id !== currentSessionId && s.last_message_sender === 'visitor') {
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
    updateAgentHeaderUI();
}

function updateConsoleBrand() {
    const el = document.getElementById('console-brand-name');
    if (!el) return;

    // Agent: giữ nguyên tên thương hiệu "Pastie Chat" (không thay bằng tên dự án).
    if (CURRENT_ADMIN?.role === 'agent') {
        el.textContent = 'Pastie Chat';
        return;
    }

    if (!CURRENT_ADMIN?.project_id) return;
    const project = (PROJECTS || []).find(p => p.id === CURRENT_ADMIN.project_id);
    el.textContent = project?.display_name || project?.name || CURRENT_ADMIN.project_id;
}

// Header dành riêng cho Agent: thương hiệu "Pastie Chat" + tên Agent hiển thị to,
// ẩn dropdown dự án, và tách "Quản lý tài khoản" / "Mã QR" ra 2 nút riêng
// (không nằm trong menu Cài đặt nữa).
// Gọi ở cả loadAdminProfile và loadProjects vì nút QR phụ thuộc PROJECTS đã tải.
function updateAgentHeaderUI() {
    const isAgentRole = CURRENT_ADMIN?.role === 'agent';

    updateConsoleBrand();

    const identityEl = document.getElementById('agent-identity');
    const nameEl = document.getElementById('agent-display-name');
    const agentName = isAgentRole ? (CURRENT_ADMIN.full_name || CURRENT_ADMIN.username || '') : '';
    if (nameEl) nameEl.textContent = agentName;
    if (identityEl) identityEl.classList.toggle('hide', !agentName);

    // Tên đã hiện to ở header trái rồi thì badge tên bên phải là thừa.
    // (loadAdminProfile đặt display:flex bằng inline style nên phải ghi đè ở đây.)
    const profileBadge = document.getElementById('admin-profile-badge');
    if (profileBadge) profileBadge.style.display = agentName ? 'none' : 'flex';

    document.getElementById('project-selector-wrap')?.classList.toggle('hide', isAgentRole);

    // Agent chỉ được XEM ngôn ngữ của cuộc trò chuyện, không được đổi.
    const detailLangEl = document.getElementById('detail-lang-select');
    if (detailLangEl) {
        detailLangEl.disabled = isAgentRole;
        detailLangEl.title = isAgentRole ? 'Chỉ quản trị viên mới đổi được ngôn ngữ' : '';
    }
    document.getElementById('agent-account-btn')?.classList.toggle('hide', !isAgentRole);

    // Chỉ hiện nút "Mã QR" khi dự án của Agent thực sự là QR Concierge.
    const hasQr = isAgentRole && isQrConciergeProject(CURRENT_ADMIN.project_id);
    document.getElementById('agent-qr-btn')?.classList.toggle('hide', !hasQr);

    // Agent không còn mục nào trong menu Cài đặt (mọi thứ đã tách ra nút riêng),
    // nên bỏ hẳn menu và đưa nút thông báo ra ngoài header.
    // Trong iframe thì quyền thông báo do trang cha xin, hidePushUI() sẽ ẩn nút này.
    document.getElementById('settings-dropdown-wrapper')?.classList.toggle('hide', isAgentRole);
    document.getElementById('agent-push-btn')?.classList.toggle('hide', !isAgentRole || inIframe);

    if (isAgentRole) document.getElementById('manage-admins-btn')?.classList.add('hide');
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

window.saveProjectSettings = async (projectId) => {
    const card = document.querySelector(`.project-settings-card[data-project-id="${projectId}"]`);
    if (!card) return;
    const name = card.querySelector('[data-field="name"]')?.value.trim();
    const displayName = card.querySelector('[data-field="display_name"]')?.value.trim();
    const websiteUrl = card.querySelector('[data-field="website_url"]')?.value.trim();
    const aiEnabled = Boolean(card.querySelector('[data-field="ai_enabled"]')?.checked);
    try {
        const r = await authFetch(`${API_BASE}/api/admin/projects/${encodeURIComponent(projectId)}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, displayName, websiteUrl, aiEnabled }) });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Không thể lưu project.');
        await loadProjects();
    } catch (error) { alert(error.message); }
};

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

// =====================================================================
// GIAO DIỆN THEO QUYỀN của cuộc trò chuyện: ô nhập, nút gửi, nút "Tiếp nhận",
// ô phân công. Tách riêng để "Tiếp nhận" / "Phân công" cập nhật được ngay
// mà KHÔNG phải gọi selectSession() — vốn xoá trắng khung chat rồi tải lại
// toàn bộ tin nhắn, làm mất vị trí cuộn và nội dung đang soạn dở.
// =====================================================================
function isQrChatOwnedByCurrentAgent(session) {
    return CURRENT_ADMIN?.role === 'agent' && isQrConciergeProject(session?.project_id);
}

function applyChatPermissionUI(session) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['vi'];
    // Manage input visibility and claim status
    const isSuper = CURRENT_ADMIN && CURRENT_ADMIN.role === 'superadmin';
    const isQrOwnedAgentChat = isQrChatOwnedByCurrentAgent(session);
    const isClaimedByMe = session.claimed_by_admin_id && Number(session.claimed_by_admin_id) === Number(CURRENT_ADMIN?.id);
    const isAssignedToMe = session.assigned_admin_id && Number(session.assigned_admin_id) === Number(CURRENT_ADMIN?.id);
    const isClaimedByOther = session.claimed_by_admin_id && Number(session.claimed_by_admin_id) !== Number(CURRENT_ADMIN?.id);

    const claimChatBtn = document.getElementById('claim-chat-btn');

    // QR Concierge is one QR → one owner agent. There is nothing to claim,
    // reassign or manually close; expiry is managed automatically by the QR
    // session itself. Keep the reply composer available to its owner.
    if (claimChatBtn) claimChatBtn.classList.toggle('hide', isQrOwnedAgentChat);
    if (assigneeSelectorContainer) assigneeSelectorContainer.classList.toggle('hide', isQrOwnedAgentChat);
    if (isQrOwnedAgentChat) closeSessionBtn.classList.add('hide');

    if (session.status === 'closed') {
        chatInputContainer.classList.add('hide');
        closeSessionBtn.classList.add('hide');
        if (claimChatBtn) claimChatBtn.classList.add('hide');
    } else {
        chatInputContainer.classList.remove('hide');
        if (!isQrOwnedAgentChat) closeSessionBtn.classList.remove('hide');

        // Check if user has permission to reply
        const canReply = isQrOwnedAgentChat || isSuper || isClaimedByMe || isAssignedToMe;
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
        if (claimChatBtn && !isQrOwnedAgentChat) {
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

}

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
    // Hóa đơn thuộc về từng cuộc chat — không để sót hóa đơn của chat trước.
    adminOrder = null;
    adminOrderSignature = '';
    
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
    applyChatPermissionUI(session);

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
        }, 2000);
    }
}

// Hóa đơn dùng chung endpoint công khai với khách. Chỉ báo "có thay đổi" khi
// trạng thái đơn thật sự khác, vì backend vẽ lại PDF mỗi lần gọi nên chuỗi
// pdfDataUrl luôn khác — so sánh cả chuỗi đó sẽ khiến khung chat render lại liên tục.
async function loadOrderForAdmin(sessionId) {
    try {
        const response = await fetch(`${API_BASE}/api/chats/${sessionId}/order?lang=${currentLang}&_=${Date.now()}`);
        if (!response.ok) {
            const had = !!adminOrder;
            adminOrder = null;
            adminOrderSignature = '';
            return had;
        }
        const data = await response.json();
        const order = data.order || null;
        const signature = order
            ? [order.id, order.status, order.payment_method, order.total_amount, currentLang].join('|')
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
    if (adminIsSyncingMessages) return;
    adminIsSyncingMessages = true;
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

            const orderChanged = await loadOrderForAdmin(sessionId);

            if (isDiff || hasLoadingState || orderChanged) {
                renderAdminMessages(false);
            }
        }
    } catch (e) {
        console.error('Error loading messages:', e);
        if (chatMessagesContainer.querySelector('.chat-loading-state')) {
            renderAdminMessages(false);
        }
    } finally {
        adminIsSyncingMessages = false;
    }
}

function renderAdminMessages(isLoadMore = false, forceScrollToLatest = false) {
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
            const attachmentHtml = renderAttachmentHtml(msg);
            innerHtml = `
                <div class="message-bubble${attachmentHtml ? ' has-attachment' : ''}">
                    ${attachmentHtml}
                    ${!attachmentHtml || msg.original_text ? `<div class="original-text">${escapeHtml(primaryText)}</div>` : ''}
                    ${hasTranslation ? `<div class="translated-text-wrapper" data-label="${dict.labelOriginal} ">${escapeHtml(msg.original_text)}</div>` : ''}
                </div>
                <div class="message-time">${timeStr}</div>
            `;
        } else if (msg.sender === 'agent' || msg.sender === 'ai') {
            const hasTranslation = msg.translated_text && msg.translated_text !== msg.original_text;
            const attachmentHtml = renderAttachmentHtml(msg);
            innerHtml = `
                <div class="message-bubble${attachmentHtml ? ' has-attachment' : ''}">
                    ${attachmentHtml}
                    ${!attachmentHtml || msg.original_text ? `<div class="original-text">${escapeHtml(msg.original_text)}</div>` : ''}
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

    renderAdminInvoice();

    if (isLoadMore) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight - previousScrollHeight;
    } else {
        if (forceScrollToLatest || isFirstLoad || isNearBottom) {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
    }
}

// Hiển thị hóa đơn ở cuối luồng chat của Agent: xem trước co theo bề ngang,
// bấm vào mở PDF ở tab mới. Agent cần thấy đúng thứ khách đang nhìn.
function renderAdminInvoice() {
    if (!adminOrder) return;
    const invoice = adminOrder.invoice || {};
    const preview = invoice.svgDataUrl || '';
    const pdf = invoice.pdfUrl || invoice.pdfDataUrl || '';
    if (!preview && !pdf) return;

    const statusLabels = {
        awaiting_payment: 'Chờ thanh toán',
        paid: 'Đã thanh toán',
    };
    const methodLabels = { cash: 'Tiền mặt', bank_qr: 'Chuyển khoản QR', card: 'Thẻ' };
    const statusText = statusLabels[adminOrder.status] || adminOrder.status || '';
    const methodText = adminOrder.payment_method ? methodLabels[adminOrder.payment_method] || adminOrder.payment_method : '';
    const totalText = new Intl.NumberFormat('vi-VN').format(Number(adminOrder.total_amount || 0));

    const wrapper = document.createElement('div');
    wrapper.className = 'admin-invoice-block';
    wrapper.innerHTML = `
        <div class="admin-invoice-head">
            <span class="admin-invoice-kicker"><i class="ri-receipt-line"></i> Hóa đơn đã gửi khách</span>
            <span class="admin-invoice-status ${adminOrder.status === 'paid' ? 'is-paid' : 'is-waiting'}">${escapeHtml(statusText)}</span>
        </div>
        ${preview ? `<button type="button" class="admin-invoice-preview attachment-preview-trigger" data-preview-url="${escapeHtml(pdf || preview)}" data-preview-type="document" data-preview-title="Hóa đơn"><img src="${escapeHtml(preview)}" alt="Hóa đơn"></button>` : ''}
        <div class="admin-invoice-meta">
            <span><strong>${escapeHtml(totalText)} ₫</strong></span>
            ${methodText ? `<span><i class="ri-bank-card-line"></i> ${escapeHtml(methodText)}</span>` : ''}
            ${pdf ? `<button type="button" class="attachment-preview-trigger admin-invoice-open" data-preview-url="${escapeHtml(pdf)}" data-preview-type="document" data-preview-title="Hóa đơn"><i class="ri-file-pdf-2-line"></i> Mở PDF</button>` : ''}
        </div>
    `;
    chatMessagesContainer.appendChild(wrapper);
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

let adminIsUploadingAttachment = false;

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
            alert(dict.sendError ? dict.sendError + (data.error || '') : (data.error || 'Không thể gửi file.'));
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

document.getElementById('chat-attach-btn')?.addEventListener('click', () => {
    document.getElementById('chat-attachment-input')?.click();
});
document.getElementById('chat-attachment-input')?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) sendAttachment(file);
    e.target.value = '';
});

async function claimCurrentChat() {
    if (!currentSessionId) return;
    const response = await authFetch(`${API_BASE}/api/admin/chats/${currentSessionId}/claim`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) return alert(data.error || 'Không thể tiếp nhận chat.');

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
        const allowedRoles = CURRENT_ADMIN?.role === 'project_admin'
            ? new Set(['agent'])
            : new Set(['project_admin', 'agent']);
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
                // Cập nhật tại chỗ — không loadMessages() để khung chat đứng yên
                const sess = sessionsList.find(s => s.id === currentSessionId);
                if (sess) {
                    sess.assigned_admin_id = newAdminId;
                    applyChatPermissionUI(sess);
                }
                fetchSessions().catch(() => {});
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
        alert(dict.closeError);
    } finally {
        closeSessionBtn.disabled = false;
        closeSessionBtn.innerHTML = `<i class="ri-close-circle-line"></i> ${dict.closeChat}`;
    }
}

function resetActiveChatUI() {
    adminOrder = null;
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
            alert(dict.deleteSuccess);
        } else {
            alert(dict.deleteError + (data.error ? ': ' + data.error : ''));
        }
    } catch (e) {
        console.error('Delete chat error:', e);
        alert(dict.deleteError);
    } finally {
        deleteSessionBtn.disabled = false;
        deleteSessionBtn.innerHTML = `<i class="ri-delete-bin-line"></i>`;
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

function formatAttachmentSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Renders the media/document card for a message that carries a file attachment.
// Returns '' when the message has no attachment.
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
        return `<div class="attachment-card attachment-video">
            <video src="${url}" controls preload="metadata"></video>
        </div>`;
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

const mediaPreviewModal = document.getElementById('media-preview-modal');
const mediaPreviewTitle = document.getElementById('media-preview-title');
const mediaPreviewImage = document.getElementById('media-preview-image');
const mediaPreviewVideo = document.getElementById('media-preview-video');
const mediaPreviewFrame = document.getElementById('media-preview-frame');

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

chatMessagesContainer?.addEventListener('click', (event) => {
    const trigger = event.target.closest('.attachment-preview-trigger');
    if (!trigger) return;
    event.preventDefault();
    openMediaPreview(trigger.dataset.previewUrl, trigger.dataset.previewType, trigger.dataset.previewTitle);
});
document.getElementById('media-preview-close-btn')?.addEventListener('click', closeMediaPreview);
mediaPreviewModal?.addEventListener('click', (event) => { if (event.target === mediaPreviewModal) closeMediaPreview(); });

// Event Bindings
const pushPermissionModal = document.getElementById('push-permission-modal');
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
document.getElementById('enable-push-btn')?.addEventListener('click', handleEnablePushClick);
document.getElementById('agent-push-btn')?.addEventListener('click', handleEnablePushClick);
document.getElementById('push-modal-confirm')?.addEventListener('click', () => {
    const button = document.getElementById('push-modal-confirm');
    const supportIssue = getPushSupportIssue();
    // iOS chưa thêm vào Màn hình chính / trình duyệt không hỗ trợ: chỉ hiện các
    // bước hướng dẫn (nút cũng đã bị disable nên thực tế không bấm tới đây được).
    if (supportIssue) { setPushModalMode(supportIssue); return; }
    if (button) { button.disabled = true; button.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang bật thông báo...'; }
    enablePushNotifications().then(() => {
        closePushPermissionModal();
    }).catch((error) => {
        console.error('Không thể bật Web Push:', error);
        setPushButtonState('off');
        alert(error.message || 'Không thể bật thông báo trên thiết bị này.');
    }).finally(() => {
        if (button) { button.disabled = false; button.innerHTML = '<i class="ri-notification-3-fill"></i> Bật thông báo ngay'; }
    });
});
document.getElementById('push-modal-skip')?.addEventListener('click', () => {
    closePushPermissionModal();
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

document.getElementById('session-status-filter')?.addEventListener('click', (event) => {
    const button = event.target.closest('.ssf-btn');
    if (!button) return;
    currentStatusFilter = button.dataset.status || 'all';
    localStorage.setItem('pastie_admin_status_filter', currentStatusFilter);
    document.querySelectorAll('#session-status-filter .ssf-btn').forEach((element) => {
        element.classList.toggle('is-active', element.dataset.status === currentStatusFilter);
    });
    renderSessionsList(sessionsList);
});

// Khôi phục lựa chọn đã lưu (script nằm cuối body nên DOM đã sẵn sàng).
document.querySelectorAll('#session-status-filter .ssf-btn').forEach((element) => {
    element.classList.toggle('is-active', element.dataset.status === currentStatusFilter);
});

projectFilter?.addEventListener('change', (e) => {
    currentProjectFilter = e.target.value;
    renderSessionsList(sessionsList);
});

refreshSessionsBtn?.addEventListener('click', fetchSessions);
closeSessionBtn?.addEventListener('click', closeActiveSession);
deleteSessionBtn?.addEventListener('click', deleteActiveSession);
chatForm?.addEventListener('submit', sendMessage);

exportCsvBtn?.addEventListener('click', () => handleExport('csv'));
exportJsonlBtn?.addEventListener('click', () => handleExport('jsonl'));

logoutBtn?.addEventListener('click', () => {
    adminAuthGeneration++;
    localStorage.removeItem('pastie_admin_token');
    sessionsList = [];
    adminMessages = [];
    CURRENT_ADMIN = null;
    resetActiveChatUI();
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
const accountProjectContext = document.getElementById('account-project-context');
const adminMgmtProjectSelect = document.getElementById('admin-mgmt-project-select');
const qrConciergePanel = document.getElementById('qr-concierge-panel');
const qrOwnerSelect = document.getElementById('qr-owner-select');
const qrCreateBtn = document.getElementById('qr-create-btn');
const qrAccountList = document.getElementById('qr-account-list');
const qrPreviewModal = document.getElementById('qr-preview-modal');
const qrPreviewCloseBtn = document.getElementById('qr-preview-close-btn');
const qrPreviewImage = document.getElementById('qr-preview-image');
const qrPreviewTitle = document.getElementById('qr-preview-title');
const qrPreviewAgent = document.getElementById('qr-preview-agent');
const qrPreviewLink = document.getElementById('qr-preview-link');
const qrPreviewCopyBtn = document.getElementById('qr-preview-copy-btn');
const qrPreviewDownloadBtn = document.getElementById('qr-preview-download-btn');
let adminMgmtUsers = [];
let qrAccounts = [];

function getAdminMgmtProjectId() {
    return CURRENT_ADMIN?.role === 'superadmin'
        ? (adminMgmtProjectSelect?.value || '')
        : (CURRENT_ADMIN?.project_id || '');
}

function isQrConciergeProject(projectId) {
    return (PROJECTS || []).some(p => p.id === projectId && p.project_type === 'qr_concierge');
}

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
        const eligible = adminMgmtUsers.filter(u => u.project_id === projectId && u.role === 'agent' && u.is_active);
        qrOwnerSelect.innerHTML = eligible.length
            ? eligible.map(u => `<option value="${u.id}">${escapeHtml(u.full_name || u.username)}</option>`).join('')
            : '<option value="">Chưa có Agent hoạt động</option>';
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

window.copyQrChatLink = async (url, isEncoded = false) => {
    const link = isEncoded ? decodeURIComponent(url) : url;
    try { await navigator.clipboard.writeText(link); alert('Đã sao chép link QR.'); }
    catch { window.prompt('Sao chép link QR:', link); }
};

window.openQrPreview = (encodedImageUrl, encodedLabel, encodedOwner, encodedChatUrl) => {
    const imageUrl = decodeURIComponent(encodedImageUrl);
    const label = decodeURIComponent(encodedLabel);
    const owner = decodeURIComponent(encodedOwner);
    const chatUrl = decodeURIComponent(encodedChatUrl);
    if (!qrPreviewModal) return;
    qrPreviewTitle.textContent = label || 'Mã QR tiếp nhận chat';
    qrPreviewAgent.textContent = owner ? `Agent phụ trách: ${owner}` : '';
    qrPreviewImage.src = imageUrl;
    qrPreviewLink.textContent = chatUrl;
    qrPreviewDownloadBtn.href = imageUrl;
    qrPreviewCopyBtn.onclick = () => window.copyQrChatLink(chatUrl);
    qrPreviewModal.classList.remove('hide');
};

function closeQrPreview() {
    qrPreviewModal?.classList.add('hide');
    if (qrPreviewImage) qrPreviewImage.removeAttribute('src');
}

qrPreviewCloseBtn?.addEventListener('click', closeQrPreview);
qrPreviewModal?.addEventListener('click', (event) => {
    if (event.target === qrPreviewModal) closeQrPreview();
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !qrPreviewModal?.classList.contains('hide')) closeQrPreview();
});

adminMgmtProjectSelect?.addEventListener('change', () => {
    loadAdminUsers();
});
qrOwnerSelect?.addEventListener('change', refreshQrAccounts);
qrCreateBtn?.addEventListener('click', async () => {
    const projectId = getAdminMgmtProjectId();
    const ownerAdminId = Number(qrOwnerSelect?.value || 0);
    if (!projectId || !ownerAdminId) return alert('Hãy chọn Agent trước khi tạo QR.');
    qrCreateBtn.disabled = true;
    try {
        const res = await authFetch(`${API_BASE}/api/admin/qr-accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, ownerAdminId, label: `QR chat · ${qrOwnerSelect.options[qrOwnerSelect.selectedIndex].text}` }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể lấy QR.');
        await refreshQrAccounts();
        if (data.reused) alert('Agent này đã có một mã QR đang hoạt động. Đang hiển thị lại mã hiện có.');
    } catch (error) { alert(error.message); }
    finally { qrCreateBtn.disabled = false; }
});

if (manageAdminsBtn) manageAdminsBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    window.openAdminManagement();
});

// Agent: 2 nút riêng trên header thay cho mục trong menu Cài đặt.
document.getElementById('agent-account-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    window.openAdminManagement('account');
});
document.getElementById('agent-qr-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    window.openAdminManagement('qr');
});
if (adminMgmtCloseTopBtn) adminMgmtCloseTopBtn.addEventListener('click', closeAdminMgmt);
if (adminMgmtCloseBtn) adminMgmtCloseBtn.addEventListener('click', closeAdminMgmt);
if (adminUserForm) adminUserForm.addEventListener('submit', handleAdminUserSubmit);

const adminFormId = document.getElementById('admin-form-id');
const adminFormFullname = document.getElementById('admin-form-fullname');
const adminFormEmail = document.getElementById('admin-form-email');
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

// 'account' | 'qr' | null. Agent mở modal từ 2 nút riêng nên chỉ xem đúng
// phần mình bấm; các role khác vẫn thấy đầy đủ như cũ.
let adminMgmtFocus = null;

function applyAdminMgmtFocus() {
    const grid = document.querySelector('.admin-management-grid');
    const titleEl = document.querySelector('#admin-management-modal .brand-header h2');
    const subtitleEl = document.getElementById('admin-mgmt-subtitle');
    const selfPanel = document.getElementById('self-profile-panel');

    // Ô đổi tên hiển thị chỉ xuất hiện ở chế độ "Quản lý tài khoản".
    const showSelfProfile = adminMgmtFocus === 'account';
    selfPanel?.classList.toggle('hide', !showSelfProfile);
    if (showSelfProfile) {
        const input = document.getElementById('self-display-name-input');
        if (input) input.value = CURRENT_ADMIN?.full_name || CURRENT_ADMIN?.username || '';
        setSelfProfileStatus('');

        // Agent chỉ được xem tên hiển thị của mình; việc đổi tên do quản trị viên làm.
        const isAgentRole = CURRENT_ADMIN?.role === 'agent';
        const saveBtn = document.getElementById('self-display-name-save');
        if (input) input.readOnly = isAgentRole;
        if (saveBtn) saveBtn.classList.toggle('hide', isAgentRole);
        selfPanel?.classList.toggle('is-readonly', isAgentRole);
        const hint = selfPanel?.querySelector('.self-profile-heading p');
        if (hint) {
            hint.textContent = isAgentRole
                ? 'Tên này hiện trên thanh tiêu đề và là tên khách nhìn thấy. Liên hệ quản trị viên nếu cần đổi.'
                : 'Tên này hiện trên thanh tiêu đề và là tên khách nhìn thấy khi bạn trả lời chat.';
        }
    }

    if (adminMgmtFocus === 'qr') {
        grid?.classList.add('hide');
        // qrConciergePanel do refreshQrAccounts điều khiển theo loại project — không ép hiện ở đây.
        if (titleEl) titleEl.textContent = 'Mã QR tiếp nhận chat';
        if (subtitleEl) subtitleEl.textContent = 'Quét mã QR này để khách bắt đầu cuộc trò chuyện với bạn.';
    } else if (adminMgmtFocus === 'account') {
        grid?.classList.remove('hide');
        qrConciergePanel?.classList.add('hide');
        if (titleEl) titleEl.textContent = 'Quản lý tài khoản';
        if (subtitleEl) subtitleEl.textContent = 'Thông tin và tên hiển thị của tài khoản bạn.';
        const listHeading = document.getElementById('admin-list-heading');
        if (listHeading) listHeading.textContent = 'Tài khoản của bạn';
    } else {
        grid?.classList.remove('hide');
        if (titleEl) titleEl.textContent = 'Quản lý nhân viên & Phân quyền';
        const listHeading = document.getElementById('admin-list-heading');
        if (listHeading) listHeading.textContent = 'Danh sách nhân viên';
    }
}

function setSelfProfileStatus(message, kind = '') {
    const el = document.getElementById('self-profile-status');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('is-ok', 'is-error');
    if (kind) el.classList.add(kind === 'ok' ? 'is-ok' : 'is-error');
}

async function handleSelfDisplayNameSubmit(event) {
    event.preventDefault();
    if (CURRENT_ADMIN?.role === 'agent') {
        setSelfProfileStatus('Bạn không có quyền đổi tên hiển thị.', 'error');
        return;
    }
    const input = document.getElementById('self-display-name-input');
    const saveBtn = document.getElementById('self-display-name-save');
    const fullName = (input?.value || '').trim();

    if (!fullName) {
        setSelfProfileStatus('Tên hiển thị không được để trống.', 'error');
        return;
    }

    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang lưu...'; }
    setSelfProfileStatus('');

    try {
        const res = await authFetch(`${API_BASE}/api/admin/me/display-name`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: fullName })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Không thể cập nhật tên hiển thị.');

        // Cập nhật ngay mọi chỗ đang hiển thị tên: header, badge, danh sách.
        if (CURRENT_ADMIN) CURRENT_ADMIN.full_name = data.admin?.full_name || fullName;
        const profileNameEl = document.getElementById('admin-profile-name');
        if (profileNameEl) profileNameEl.textContent = CURRENT_ADMIN.full_name;
        updateAgentHeaderUI();
        loadAdminUsers();
        setSelfProfileStatus('Đã cập nhật tên hiển thị.', 'ok');
    } catch (error) {
        setSelfProfileStatus(error.message, 'error');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
    }
}
document.getElementById('self-profile-form')?.addEventListener('submit', handleSelfDisplayNameSubmit);

function openAdminMgmt() {
    if (adminMgmtModal) adminMgmtModal.classList.remove('hide');

    const isSuper = CURRENT_ADMIN && CURRENT_ADMIN.role === 'superadmin';
    const isProjectAdmin = CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin';
    const isAgent = CURRENT_ADMIN && CURRENT_ADMIN.role === 'agent';

    const projectMgmtBox = document.querySelector('.admin-project-management');
    const projectFormGroup = document.getElementById('admin-form-project-group');
    const roleSelect = document.getElementById('admin-form-role');
    const subtitleEl = document.getElementById('admin-mgmt-subtitle');

    // Only Superadmin can switch the project context. Other roles are always
    // locked to the project assigned to their account.
    if (accountProjectContext) accountProjectContext.classList.toggle('hide', !isSuper);
    if (isSuper && adminMgmtProjectSelect) {
        adminMgmtProjectSelect.innerHTML = (PROJECTS || []).map(p =>
            `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name || p.id)} · ${escapeHtml(p.id)}</option>`
        ).join('');
    }

    if (isProjectAdmin || isAgent) {
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
        if (isAgent) {
            if (adminUserForm) adminUserForm.closest('.admin-user-form-panel')?.classList.add('hide');
            if (subtitleEl) subtitleEl.textContent = `Tài khoản và mã QR của bạn [${CURRENT_ADMIN.project_id || 'Dự án'}].`;
        } else {
            adminUserForm?.closest('.admin-user-form-panel')?.classList.remove('hide');
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
        adminUserForm?.closest('.admin-user-form-panel')?.classList.remove('hide');

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

    applyAdminMgmtFocus();
    loadAdminUsers();
    resetAdminForm();
}
window.openAdminManagement = (focus = null) => {
    closeSettingsDropdown();
    adminMgmtFocus = focus;
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
        adminMgmtUsers = users;
        const projectId = getAdminMgmtProjectId();
        const visibleUsers = CURRENT_ADMIN?.role === 'superadmin' && projectId
            ? users.filter(u => u.project_id === projectId)
            : users;

        const countBadge = document.getElementById('admin-user-count-badge');
        if (countBadge) countBadge.textContent = `${visibleUsers.length} nhân viên`;

        if (visibleUsers.length === 0) {
            adminListContainer.innerHTML = '<p style="color:var(--text-secondary);font-size:12px;text-align:center;padding:24px 0;">Chưa có tài khoản nhân viên nào.</p>';
            await refreshQrAccounts();
            return;
        }

        const avatarGradients = {
            'gradient-1': 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            'gradient-2': 'linear-gradient(135deg,#ec4899,#f43f5e)',
            'gradient-3': 'linear-gradient(135deg,#10b981,#14b8a6)',
            'gradient-4': 'linear-gradient(135deg,#f59e0b,#f97316)',
            'gradient-5': 'linear-gradient(135deg,#0ea5e9,#2563eb)'
        };

        adminListContainer.innerHTML = visibleUsers.map(u => {
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
        await refreshQrAccounts();
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
    
    if (CURRENT_ADMIN && CURRENT_ADMIN.role === 'project_admin') {
        if (adminFormRole) { adminFormRole.value = 'agent'; adminFormRole.disabled = true; }
        if (adminFormProject) { adminFormProject.value = CURRENT_ADMIN.project_id || ''; }
    } else {
        if (adminFormRole) { adminFormRole.value = 'agent'; adminFormRole.disabled = false; }
    }

    renderAdminAvatarPicker();
}

async function editAdminUser(id) {
    try {
        const res = await authFetch(`${API_BASE}/api/admin/users`);
        const users = await res.json();
        const u = users.find(x => x.id === id);
        if (!u) return;
        if (adminFormId) adminFormId.value = u.id;
        if (adminFormFullname) adminFormFullname.value = u.full_name || '';
        if (adminFormEmail) adminFormEmail.value = u.username || '';
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
        email: adminFormEmail?.value.trim(),
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
            if (!id && data.qr?.chat_url) {
                alert(`Đã tạo Agent và QR chat.\n\nLink để tạo/in QR:\n${data.qr.chat_url}\n\nKhách quét QR này sẽ được chuyển đến Agent vừa tạo.`);
            } else {
                alert(id ? 'Cập nhật tài khoản thành công!' : 'Tạo tài khoản nhân viên thành công!');
            }
        } else { 
            alert('Lỗi: ' + (data.error || 'Không thể lưu.')); 
        }
    } catch(e) { alert('Lỗi kết nối máy chủ: ' + e.message); }
}

verifyAuthAndInit();
