// Khởi động bảng điều khiển.
//
// Sau khi tách module, file này chỉ còn phần CHẠY LÚC NẠP: lấy tham chiếu DOM,
// hằng số, đăng ký sự kiện, và các lệnh khởi tạo. Toàn bộ khai báo hàm đã chuyển
// sang core.js, chat.js, org-console.js, project-admin.js và menu-console.js.
//
// Vì thế file này PHẢI nạp sau cùng — xem chú thích thứ tự nạp ở đầu core.js.

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
        languageLabel: "Ngôn ngữ",
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
        languageLabel: "Language",
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
        languageLabel: "Язык",
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
        languageLabel: "语言",
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
        languageLabel: "언어",
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

let currentDetectedLang = 'en';
 // default to english for translations
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


// Base URL helper
// Deploy kèm backend thì origin của trang chính là backend — đó là trường hợp
// mặc định và không cần cấu hình gì. Deploy riêng (Railway static) thì config.js
// sinh lúc build sẽ đặt window.PASTIE_API_BASE trỏ về backend thật.
const API_BASE = (window.PASTIE_API_BASE || window.location.origin).replace(/\/$/, '');


const TOAST_ICONS = {
    success: 'ri-checkbox-circle-fill',
    error: 'ri-error-warning-fill',
    info: 'ri-information-fill',
};


document.getElementById('session-revoked-relogin-btn')?.addEventListener('click', () => {
    document.getElementById('session-revoked-modal')?.classList.add('hide');
    showLogin();
});


// ----------------------------------------------------
// UNIFIED DIRECT AUTHENTICATION (GOOGLE & EMAIL OTP)
// ----------------------------------------------------

let adminOtpCountdownInterval = null;

let currentOtpTargetEmail = '';


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
            headers: deviceHeaders({ 'Content-Type': 'application/json' }),
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


// Expose handlers globally for inline HTML events
window.handleSendAdminOtp = handleSendAdminOtp;

window.handleVerifyAdminOtp = handleVerifyAdminOtp;

window.handleChangeOtpEmail = handleChangeOtpEmail;

window.handleGoogleAuthTrigger = handleGoogleAuthTrigger;


// ----------------------------------------------------
// BROWSER NOTIFICATIONS
// ----------------------------------------------------

const notifiedMsgCount = {};
 // track last notified count per session
let pushRegistration = null;


// Khi dashboard được NHÚNG trong iframe (cổng DealPhuQuoc), trình duyệt chặn
// Notification.requestPermission() và new Notification() ở iframe cross-origin.
// => Chuyển việc xin quyền + hiển thị thông báo lên TRANG CHA qua postMessage.
const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();

let parentNotifPermission = null;

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


// Nút thông báo trên header có đang bị ẩn vì đã bật hay không. updateAgentHeaderUI()
// đọc cờ này để không vô tình hiện lại nút.
let pushHeaderHidden = false;

let lastPushState = 'off';


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


// ----------------------------------------------------
// REALTIME SSE EVENT STREAM & DASHBOARD INITIALIZATION
// ----------------------------------------------------

let CURRENT_ADMIN = null;

let adminEventSource = null;

let adminEventReconnectTimer = null;

let realtimeRefreshTimer = null;


let isVisibilitySyncSetup = false;


// ===== Registry dự án (multi-project) =====
let PROJECTS = [];

const PROJECT_WEBSITES = {
    dealphuquoc: 'https://dealphuquoc.com',
    'pastie-landingpage': 'https://pastie-landingpage.vercel.app'
};


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
    } catch (error) { toastError(error.message); }
};


// Gắn sự kiện Bàn giao ca
const handoverSessionBtn = document.getElementById('handover-session-btn');

if (handoverSessionBtn) {
    handoverSessionBtn.addEventListener('click', async () => {
        if (!currentSessionId) return;
        const confirmed = await pastieConfirm('Bạn có chắc chắn muốn bàn giao cuộc trò chuyện này cho nhân viên ca tiếp theo tiếp nhận không?', {
            title: 'Bàn giao ca',
            confirmText: 'Bàn giao',
            cancelText: 'Hủy',
            danger: false
        });
        if (!confirmed) return;

        try {
            handoverSessionBtn.disabled = true;
            const res = await authFetch(`${API_BASE}/api/admin/chats/${currentSessionId}/handover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Không thể bàn giao ca.');
            toastSuccess('Đã bàn giao ca thành công.');
            await fetchSessions();
            if (currentSessionId) await selectSession(currentSessionId);
        } catch (err) {
            toastError(err.message || 'Lỗi khi bàn giao ca.');
        } finally {
            handoverSessionBtn.disabled = false;
        }
    });
}


let adminIsUploadingAttachment = false;


// ── Đọc để nhập chữ ─────────────────────────────────────────────────────────
// Giao diện theo kiểu Zalo: bấm micro mở bảng trượt lên, nút micro tròn lớn ở
// --- Đọc để nhập chữ --------------------------------------------------------
// Hai lớp chồng nhau, giống hệt portal khách:
//   1. Web Speech API của trình duyệt cho chữ chạy realtime ngay trong lúc nói.
//   2. MediaRecorder + Whisper trên Groq chạy nền, khi dừng thì thay bằng bản
//      chính xác hơn — và là đường duy nhất trên trình duyệt không có Web Speech
//      (Firefox, một phần iOS).
// Không có lựa chọn "gửi bản ghi âm": bản ghi chỉ tồn tại trong bộ nhớ tới lúc
// nhận được chữ rồi bỏ. Chữ đổ vào ô nhập, người dùng sửa rồi tự bấm gửi.
const VOICE_MAX_SECONDS = 60;

let voiceRecorder = null;

let voiceStream = null;

let voiceChunks = [];

let voiceTimerId = null;

let voiceStartedAt = 0;

let voiceCancelled = false;

let voiceBusy = false;

let voiceRecognition = null;

let voiceFinalText = '';

let voiceLiveText = '';

let voiceDraftBefore = '';

let voiceSkipBatch = false;

let voiceSendPending = false;


const voiceSupported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

const VOICE_RECOGNITION_LOCALES = { vi: 'vi-VN', en: 'en-US', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR' };


document.getElementById('chat-mic-btn')?.addEventListener('click', () => {
    if (!voiceSupported) return toastError('Trình duyệt này chưa hỗ trợ ghi âm.');
    if (!currentSessionId) return;
    if (voiceBusy) return;
    if (voiceRecorder?.state === 'recording') stopVoiceRecording();
    else {
        const panel = document.getElementById('voice-live-panel');
        setVoiceUi(panel?.classList.contains('is-ready') ? 'idle' : 'ready');
        chatInput?.blur();
    }
});

document.getElementById('voice-start-btn')?.addEventListener('click', () => { void startVoiceRecording(); });

document.getElementById('voice-delete-btn')?.addEventListener('click', cancelVoiceRecording);

document.getElementById('voice-edit-btn')?.addEventListener('click', editVoiceRecording);

document.getElementById('voice-send-btn')?.addEventListener('click', sendVoiceDraft);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.getElementById('voice-live-panel')?.classList.contains('hide')) cancelVoiceRecording();
});

chatInput?.addEventListener('input', () => { resizeAgentChatInput(); updateVoiceSendState(); });

resizeAgentChatInput();


document.getElementById('chat-attach-btn')?.addEventListener('click', () => {
    document.getElementById('chat-attachment-input')?.click();
});

document.getElementById('chat-attachment-input')?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) sendAttachment(file);
    e.target.value = '';
});


document.getElementById('claim-chat-btn')?.addEventListener('click', claimCurrentChat);


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
                toastError(data.error || 'Không thể phân công cuộc trò chuyện.');
            }
        } catch (err) {
            toastError('Lỗi kết nối khi phân công: ' + err.message);
        }
    });
}


// Renders the media/document card for a message that carries a file attachment.
// Returns '' when the message has no attachment.
// Server lưu một dòng mô tả ("📷 [Hình ảnh]") làm original_text của tin đính kèm.
// Dòng đó CẦN cho notification đẩy và cho các kênh không hiển thị được file
// (Messenger, WhatsApp…), nhưng trong khung chat thì thừa: ảnh đã hiện ra rồi.
// Vì vậy giữ nguyên ở database, chỉ bỏ khi vẽ bong bóng chat.
const ATTACHMENT_PLACEHOLDERS = new Set(['📷 [Hình ảnh]', '🎥 [Video]', '📎 [Tài liệu]']);


const mediaPreviewModal = document.getElementById('media-preview-modal');

const mediaPreviewTitle = document.getElementById('media-preview-title');

const mediaPreviewImage = document.getElementById('media-preview-image');

const mediaPreviewVideo = document.getElementById('media-preview-video');

const mediaPreviewFrame = document.getElementById('media-preview-frame');


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
        toastError(error.message || 'Không thể bật thông báo trên thiết bị này.');
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


// --- TRANSFER KEYWORDS ---
let currentKeywords = [];


window.removeKeyword = function(index) {
    currentKeywords.splice(index, 1);
    renderKeywordTags(currentKeywords);
};


const keywordInput = document.getElementById('keyword-input');

const keywordAddBtn = document.getElementById('keyword-add-btn');

const keywordSaveBtn = document.getElementById('keyword-save-btn');

const keywordStatus = document.getElementById('keyword-status');


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
        toastSuccess('Đã sao chép Direct Link WhatsApp.');
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


window.copyQrChatLink = async (url, isEncoded = false) => {
    const link = isEncoded ? decodeURIComponent(url) : url;
    try { await navigator.clipboard.writeText(link); toastSuccess('Đã sao chép link QR.'); }
    catch { window.prompt('Sao chép link QR:', link); }
};


let qrPreviewPosterUrl = '';


window.openQrPreview = async (encodedImageUrl, encodedLabel, encodedOwner, encodedChatUrl) => {
    const imageUrl = decodeURIComponent(encodedImageUrl);
    const label = decodeURIComponent(encodedLabel);
    const owner = decodeURIComponent(encodedOwner);
    const chatUrl = decodeURIComponent(encodedChatUrl);
    if (!qrPreviewModal) return;
    qrPreviewTitle.textContent = 'Poster QR dành cho khách hàng';
    qrPreviewAgent.textContent = label || owner || '';
    qrPreviewImage.src = imageUrl;
    qrPreviewLink.textContent = chatUrl;
    qrPreviewDownloadBtn.disabled = true;
    qrPreviewDownloadBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Đang tạo poster…';
    qrPreviewCopyBtn.onclick = () => window.copyQrChatLink(chatUrl);
    qrPreviewModal.classList.remove('hide');
    try {
        const posterBlob = await createBrandedQrPoster(imageUrl, label || owner);
        if (qrPreviewPosterUrl) URL.revokeObjectURL(qrPreviewPosterUrl);
        qrPreviewPosterUrl = URL.createObjectURL(posterBlob);
        qrPreviewImage.src = qrPreviewPosterUrl;
        qrPreviewDownloadBtn.disabled = false;
        qrPreviewDownloadBtn.innerHTML = '<i class="ri-download-2-line"></i> Tải poster QR';
        qrPreviewDownloadBtn.onclick = () => downloadPosterBlob(posterBlob, label || owner || 'pastie-qr');
    } catch (error) {
        console.error('QR poster error:', error);
        qrPreviewDownloadBtn.disabled = false;
        qrPreviewDownloadBtn.innerHTML = '<i class="ri-refresh-line"></i> Thử tạo lại';
        qrPreviewDownloadBtn.onclick = () => window.openQrPreview(encodedImageUrl, encodedLabel, encodedOwner, encodedChatUrl);
    }
};


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


// Superadmin: Nút Quản lý đội ngũ trên Header
document.getElementById('superadmin-team-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    window.openAdminManagement();
});


if (manageAdminsBtn) manageAdminsBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    window.openAdminManagement();
});


// Agent: Nút tài khoản trên header
document.getElementById('agent-account-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    window.openAdminManagement('account');
});

if (adminMgmtCloseTopBtn) adminMgmtCloseTopBtn.addEventListener('click', closeAdminMgmt);

if (adminMgmtCloseBtn) adminMgmtCloseBtn.addEventListener('click', closeAdminMgmt);

if (adminUserForm) adminUserForm.addEventListener('submit', handleAdminUserSubmit);


const adminFormId = document.getElementById('admin-form-id');

const adminFormFullname = document.getElementById('admin-form-fullname');

const adminFormEmail = document.getElementById('admin-form-email');

const adminFormRole = document.getElementById('admin-form-role');

const adminFormProject = document.getElementById('admin-form-project');

const adminFormSaleLimit = document.getElementById('admin-form-sale-limit');

const adminFormSaleLimitGroup = document.getElementById('admin-form-sale-limit-group');

const adminFormActive = document.getElementById('admin-form-active');

const adminFormAvatar = document.getElementById('admin-form-avatar');

const adminAvatarPicker = document.getElementById('admin-avatar-picker');

const adminFormStatusGroup = document.getElementById('admin-form-status-group');

const adminFormTitle = document.getElementById('admin-form-title');

const adminFormSubmitBtn = document.getElementById('admin-form-submit-btn');

const adminFormCancelBtn = document.getElementById('admin-form-cancel-btn');

if (adminFormCancelBtn) adminFormCancelBtn.addEventListener('click', resetAdminForm);

adminFormProject?.addEventListener('change', updateAdminFormRoleVisibility);

adminFormRole?.addEventListener('change', updateAdminFormRoleVisibility);


const ADMIN_AVATARS = [
    { id: 'gradient-1', label: 'Tím', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { id: 'gradient-2', label: 'Hồng', background: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
    { id: 'gradient-3', label: 'Xanh lá', background: 'linear-gradient(135deg,#10b981,#14b8a6)' },
    { id: 'gradient-4', label: 'Cam', background: 'linear-gradient(135deg,#f59e0b,#f97316)' },
    { id: 'gradient-5', label: 'Xanh dương', background: 'linear-gradient(135deg,#0ea5e9,#2563eb)' }
];


// 'account' | 'qr' | null.
let adminMgmtFocus = null;

document.getElementById('self-profile-form')?.addEventListener('submit', handleSelfDisplayNameSubmit);

window.openAdminManagement = (focus = null) => {
    closeSettingsDropdown();
    adminMgmtFocus = focus;
    openAdminMgmt();
};


verifyAuthAndInit();


// =====================================================================
// Quản lý tổ chức: Agent / Sale / Nhóm / QR
//
// Superadmin thấy cả 4 thẻ; Agent quản lý thấy 3 thẻ (Sale, Nhóm, QR).
// Backend kiểm tra quyền lại ở mọi endpoint — phần ẩn/hiện dưới đây chỉ để
// giao diện gọn, không phải lớp bảo mật.
// =====================================================================
let ORG_SALES = [];

let ORG_GROUPS = [];


// --- QR ----------------------------------------------------------------------

let CURRENT_QR_ACCOUNTS = [];


document.getElementById('org-qr-group-filter')?.addEventListener('change', renderOrgQrList);


// Nút "Xem poster". Trước đây khối này gọi openQrPreviewModal(id) — một hàm KHÔNG
// tồn tại, nên bấm vào chỉ ném ReferenceError trong console và không mở gì cả.
// Hàm thật là window.openQrPreview(imageUrl, label, owner, chatUrl), dùng chung với
// màn hình QR cũ; ảnh QR sinh từ quickchart.io đúng như bên đó.
document.getElementById('org-qr-list')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-qr-poster]');
    if (!button) return;
    const account = CURRENT_QR_ACCOUNTS.find((item) => String(item.id) === button.dataset.qrPoster);
    if (!account) return;
    const imageUrl = `https://quickchart.io/qr?size=360&text=${encodeURIComponent(account.chat_url)}`;
    const enc = (value) => encodeURIComponent(value ?? '').replace(/'/g, '%27');
    window.openQrPreview(enc(imageUrl), enc(account.label), enc(account.group_name || account.label), enc(account.chat_url));
});


// --- Sự kiện -----------------------------------------------------------------

document.getElementById('org-manage-btn')?.addEventListener('click', openOrgModal);

document.getElementById('org-close-btn')?.addEventListener('click', closeOrgModal);

document.getElementById('org-sale-cancel-btn')?.addEventListener('click', resetOrgSaleForm);

document.getElementById('org-modal')?.addEventListener('click', (event) => {
    if (event.target === document.getElementById('org-modal')) closeOrgModal();
});

document.getElementById('org-tabs')?.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-org-tab]');
    if (tab) switchOrgTab(tab.dataset.orgTab);
});


document.getElementById('org-agent-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
        await orgFetch('/api/superadmin/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: document.getElementById('org-agent-name').value.trim(),
                email: document.getElementById('org-agent-email').value.trim(),
                projectId: document.getElementById('org-agent-project').value,
                saleLimit: document.getElementById('org-agent-sale-limit').value,
            }),
        });
        event.target.reset();
        setOrgStatus('Đã tạo Agent thành công.');
        await loadOrgAgents();
    } catch (error) { setOrgStatus(error.message, 'error'); }
});


document.getElementById('org-sale-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saleId = document.getElementById('org-sale-id')?.value;
    const groupId = document.getElementById('org-sale-group').value;
    const fullName = document.getElementById('org-sale-name').value.trim();
    const email = document.getElementById('org-sale-email').value.trim();
    const accessHours = orgHourWindows('org-sale-start', 'org-sale-end');
    const groupIds = groupId ? [Number(groupId)] : [];

    try {
        if (saleId) {
            await orgFetch(`/api/agent/sales/${saleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, accessHours, groupIds }),
            });
            setOrgStatus('Đã cập nhật thông tin Sale thành công.');
        } else {
            await orgFetch('/api/agent/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, accessHours, groupIds }),
            });
            setOrgStatus('Đã tạo Sale mới thành công.');
        }
        resetOrgSaleForm();
        await loadOrgSales();
        await loadOrgGroups(true);
    } catch (error) { setOrgStatus(error.message, 'error'); }
});


document.getElementById('org-group-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saleIds = salePickerValue();
    try {
        await orgFetch('/api/agent/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('org-group-name').value.trim(),
                description: document.getElementById('org-group-desc').value.trim(),
                saleIds,
            }),
        });
        event.target.reset();
        clearSalePicker(); // form.reset() không đụng tới ô chọn Sale vì nó không phải input
        setOrgStatus('Đã tạo nhóm tiếp nhận thành công.');
        await loadOrgGroups();
        await loadOrgSales();
    } catch (error) { setOrgStatus(error.message, 'error'); }
});


document.getElementById('org-qr-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
        await orgFetch('/api/agent/qr-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                label: document.getElementById('org-qr-label').value.trim(),
                groupId: Number(document.getElementById('org-qr-group').value),
            }),
        });
        document.getElementById('org-qr-label').value = '';
        setOrgStatus('Đã tạo mã QR mới thành công.');
        await loadOrgQr();
    } catch (error) { setOrgStatus(error.message, 'error'); }
});


// Các nút trong danh sách được gắn bằng ủy quyền sự kiện
// Ô chọn cần sự kiện 'change', không phải 'click' — bàn phím đổi lựa chọn không
// sinh ra click, mà đó là cách người dùng bàn phím thao tác với select.
document.getElementById('org-modal')?.addEventListener('change', (event) => {
    const defer = event.target.closest('[data-agent-defer]');
    if (defer) void setAgentDeferredPayment(defer.dataset.agentDefer, defer.value);
});

document.getElementById('org-modal')?.addEventListener('click', async (event) => {
    const saleEdit = event.target.closest('[data-sale-edit]');
    if (saleEdit) {
        const id = Number(saleEdit.dataset.saleEdit);
        const sale = ORG_SALES.find((s) => s.id === id);
        if (!sale) return;
        const idEl = document.getElementById('org-sale-id');
        const nameEl = document.getElementById('org-sale-name');
        const emailEl = document.getElementById('org-sale-email');
        const groupEl = document.getElementById('org-sale-group');
        const startEl = document.getElementById('org-sale-start');
        const endEl = document.getElementById('org-sale-end');
        const submitBtn = document.getElementById('org-sale-submit-btn');

        if (idEl) idEl.value = sale.id;
        if (nameEl) nameEl.value = sale.full_name || '';
        if (emailEl) {
            emailEl.value = sale.username || '';
            emailEl.readOnly = true;
            emailEl.style.opacity = '0.75';
            emailEl.title = 'Email đăng nhập là duy nhất không thể sửa';
        }
        // API trả về mỗi nhóm dưới dạng { group_id, name } — KHÔNG phải { id }.
        // Đọc nhầm .id nên giá trị luôn undefined và ô nhóm luôn hiện "Chưa gán".
        if (groupEl) groupEl.value = sale.groups?.[0]?.group_id ?? '';
        if (sale.access_hours?.[0]) {
            setTimeSelect(startEl, sale.access_hours[0].start_time);
            setTimeSelect(endEl, sale.access_hours[0].end_time);
        }
        describeShift('org-sale-start', 'org-sale-end', 'org-sale-shift-hint');
        if (submitBtn) submitBtn.innerHTML = '<i class="ri-save-line"></i> Lưu thay đổi Sale';
        document.getElementById('org-sale-cancel-btn')?.classList.remove('hide');
        switchOrgTab('sales');
        document.getElementById('org-sale-form')?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const saleDelete = event.target.closest('[data-sale-delete]');
    if (saleDelete) {
        if (!await pastieConfirm('Tài khoản này sẽ bị xoá khỏi mọi nhóm. Lịch sử chat đã xử lý vẫn được giữ lại.', { title: 'Xoá tài khoản Sale?', confirmText: 'Xoá Sale', danger: true })) return;
        try {
            await orgFetch(`/api/agent/sales/${saleDelete.dataset.saleDelete}`, { method: 'DELETE' });
            setOrgStatus('Đã xóa tài khoản Sale thành công.');
            await loadOrgSales();
            await loadOrgGroups(true);
        } catch (error) { setOrgStatus(error.message, 'error'); }
        return;
    }

    const saleToggle = event.target.closest('[data-sale-toggle]');
    if (saleToggle) {
        const isActive = saleToggle.dataset.active === 'true';
        try {
            await orgFetch(`/api/agent/sales/${saleToggle.dataset.saleToggle}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !isActive }),
            });
            setOrgStatus(isActive ? 'Đã khóa tài khoản Sale.' : 'Đã mở lại tài khoản Sale.');
            await loadOrgSales();
        } catch (error) { setOrgStatus(error.message, 'error'); }
        return;
    }

    const agentToggle = event.target.closest('[data-agent-toggle]');
    if (agentToggle) {
        const isActive = agentToggle.dataset.active === 'true';
        try {
            await orgFetch(`/api/superadmin/agents/${agentToggle.dataset.agentToggle}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !isActive }),
            });
            setOrgStatus(isActive ? 'Đã khóa tài khoản Agent.' : 'Đã mở lại tài khoản Agent.');
            await loadOrgAgents();
        } catch (error) { setOrgStatus(error.message, 'error'); }
        return;
    }

    const removeSaleGroup = event.target.closest('[data-remove-sale-group]');
    if (removeSaleGroup) {
        const groupId = removeSaleGroup.dataset.removeSaleGroup;
        const saleId = removeSaleGroup.dataset.saleId;
        try {
            await orgFetch(`/api/agent/groups/${groupId}/sales/${saleId}`, { method: 'DELETE' });
            setOrgStatus('Đã xóa Sale khỏi nhóm.');
            await loadOrgGroups();
            await loadOrgSales();
        } catch (error) { setOrgStatus(error.message, 'error'); }
        return;
    }

    const groupDelete = event.target.closest('[data-group-delete]');
    if (groupDelete) {
        if (!await pastieConfirm('Sale trong nhóm vẫn giữ tài khoản, chỉ mất phân công nhóm.', { title: 'Xoá nhóm này?', confirmText: 'Xoá nhóm', danger: true })) return;
        try {
            await orgFetch(`/api/agent/groups/${groupDelete.dataset.groupDelete}`, { method: 'DELETE' });
            setOrgStatus('Đã xóa nhóm thành công.');
            await loadOrgGroups();
            await loadOrgSales();
        } catch (error) { setOrgStatus(error.message, 'error'); }
        return;
    }

    const qrRevoke = event.target.closest('[data-qr-revoke]');
    if (qrRevoke) {
        if (!await pastieConfirm('Khách quét mã cũ sẽ không vào được nữa. Mã đã in cần thay lại.', { title: 'Thu hồi mã QR?', confirmText: 'Thu hồi', danger: true })) return;
        try {
            await orgFetch(`/api/agent/qr-accounts/${qrRevoke.dataset.qrRevoke}/revoke`, { method: 'POST' });
            setOrgStatus('Đã thu hồi QR thành công.');
            await loadOrgQr();
        } catch (error) { setOrgStatus(error.message, 'error'); }
    }
});


// Bắt sự kiện chọn thêm Sale vào nhóm từ dropdown inline trên mỗi thẻ nhóm
document.getElementById('org-modal')?.addEventListener('change', async (event) => {
    const addSelect = event.target.closest('.org-add-sale-to-group-select');
    if (addSelect && addSelect.value) {
        const groupId = addSelect.dataset.groupId;
        const saleId = addSelect.value;
        try {
            await orgFetch(`/api/agent/groups/${groupId}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ saleId }),
            });
            setOrgStatus('Đã thêm Sale vào nhóm thành công.');
            await loadOrgGroups();
            await loadOrgSales();
        } catch (error) { setOrgStatus(error.message, 'error'); }
    }
});


// =====================================================================
// BÁO CÁO THỐNG KÊ & XUẤT EXCEL / CSV
// =====================================================================
const reportModal = document.getElementById('report-modal');

const reportModalBtn = document.getElementById('report-modal-btn');

const reportDatePreset = document.getElementById('report-date-preset');

const reportSaleFilter = document.getElementById('report-sale-filter');

const reportStatusFilter = document.getElementById('report-status-filter');

const reportRefreshBtn = document.getElementById('report-refresh-btn');

const reportExportCsvBtn = document.getElementById('report-export-csv-btn');

const reportModalCloseTop = document.getElementById('report-modal-close-top');

const reportModalCloseBtn = document.getElementById('report-modal-close-btn');


reportModalBtn?.addEventListener('click', openReportModal);

reportModalCloseTop?.addEventListener('click', closeReportModal);

reportModalCloseBtn?.addEventListener('click', closeReportModal);

reportRefreshBtn?.addEventListener('click', loadReportData);

reportDatePreset?.addEventListener('change', loadReportData);

reportSaleFilter?.addEventListener('change', loadReportData);

reportStatusFilter?.addEventListener('change', loadReportData);

reportExportCsvBtn?.addEventListener('click', exportReportCSV);


document.addEventListener('click', (event) => {
    const chip = event.target.closest('#org-group-sales-select .sale-chip');
    if (chip) chip.classList.toggle('is-on');
});


document.getElementById('self-devices-list')?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-device-remove]');
    if (!button) return;
    const ok = await pastieConfirm(
        'Thiết bị này sẽ phải đăng ký lại từ đầu nếu bạn muốn dùng nó về sau.',
        { title: 'Gỡ thiết bị này?', confirmText: 'Gỡ thiết bị', danger: true }
    );
    if (!ok) return;
    try {
        const res = await authFetch(`${API_BASE}/api/admin/me/devices/${button.dataset.deviceRemove}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không gỡ được thiết bị.');
        toastSuccess('Đã gỡ thiết bị.');
        await loadMyDevices();
    } catch (error) {
        toastError(error.message);
    }
});
