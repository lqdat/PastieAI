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

    loginBtn.disabled = true;
    loginBtn.innerHTML = 'Đang kết nối...';
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
        alert('Không thể kết nối tới server.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Kết Nối Console <i class="ri-arrow-right-line"></i>';
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
    
    // Extract unique project IDs
    const projects = [...new Set(sessions.map(s => s.project_id))].filter(Boolean);
    
    // Rebuild options keeping "Tất cả"
    projectFilter.innerHTML = '<option value="">Tất cả dự án</option>';
    projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        projectFilter.appendChild(opt);
    });

    projectFilter.value = existingValue;
}

function renderSessionsList(sessions) {
    // Filter sessions by selected project
    const filtered = currentProjectFilter 
        ? sessions.filter(s => s.project_id === currentProjectFilter)
        : sessions;

    if (filtered.length === 0) {
        sessionsListContainer.innerHTML = '<div class="empty-state">Không tìm thấy cuộc hội thoại nào.</div>';
        return;
    }

    sessionsListContainer.innerHTML = '';
    filtered.forEach(session => {
        const card = document.createElement('div');
        card.className = `session-card ${session.id === currentSessionId ? 'active-selected' : ''}`;
        card.setAttribute('data-id', session.id);
        
        const dateStr = new Date(session.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) 
            + ' ' + new Date(session.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

        card.innerHTML = `
            <div class="session-card-header">
                <span class="session-name" title="${session.visitor_name}">${session.visitor_name}</span>
                <span class="session-status-badge ${session.status}">${session.status === 'active' ? 'đang chat' : 'đã đóng'}</span>
            </div>
            <div class="session-email">${session.visitor_email || 'Không có email'}</div>
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
    currentDetectedLang = session.detected_language || 'en';
    detailLang.textContent = currentDetectedLang.toUpperCase();
    
    renderTags(session.intent_tags);
    detailSummary.textContent = session.ai_summary || 'Nhấn nút "Đóng cuộc chat" để AI phân tích và tóm tắt cuộc trò chuyện này.';

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
    try {
        const response = await fetch(`${API_BASE}/api/admin/chats/${sessionId}/messages?token=${encodeURIComponent(token)}`);
        const messages = await response.json();
        
        chatMessagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            chatMessagesContainer.innerHTML = '<div class="system"><div class="message-bubble">Mạch hội thoại bắt đầu. Chưa có tin nhắn nào.</div></div>';
            return;
        }

        messages.forEach(msg => {
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${msg.sender}`;
            
            const timeStr = new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

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
    detailTags.innerHTML = '';
    if (!tagsString) {
        detailTags.innerHTML = '<span class="text-muted">Chưa phân loại</span>';
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

    chatInput.value = '';
    
    // Add temp bubble immediately
    const tempWrapper = document.createElement('div');
    tempWrapper.className = 'message-wrapper agent';
    tempWrapper.innerHTML = `
        <div class="message-bubble">
            <div class="original-text">${escapeHtml(text)}</div>
            <div class="translated-text-wrapper" style="opacity: 0.6;">
                <div>Đang dịch thuật bằng AI...</div>
            </div>
        </div>
        <div class="message-time">Gửi lúc này</div>
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
            alert('Lỗi gửi tin nhắn: ' + data.error);
        }
    } catch (e) {
        console.error('Send error:', e);
    }
}

async function closeActiveSession() {
    if (!currentSessionId) return;
    if (!confirm('Bạn có chắc chắn muốn đóng cuộc trò chuyện này? AI sẽ tự động phân tích và tóm tắt.')) return;

    closeSessionBtn.disabled = true;
    closeSessionBtn.innerHTML = '<i class="ri-loader-4-line"></i> Đang phân tích...';

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
        alert('Lỗi đóng phiên chat.');
    } finally {
        closeSessionBtn.disabled = false;
        closeSessionBtn.innerHTML = '<i class="ri-close-circle-line"></i> Đóng cuộc chat';
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

// Auto login verify on load
verifyAuthAndInit();
