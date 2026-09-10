/* ==========================================================================
   TICKET HỖ TRỢ — giao diện cho Agent, Kỹ thuật và Superadmin.

   Đặt trong MỘT tệp riêng, không chen vào chat.js: phần chat đã 169KB và là
   đường sống của cả sản phẩm; thêm một tính năng mới vào giữa nó là mỗi lần
   sửa ticket lại phải kiểm lại toàn bộ khung chat. Ở đây chỉ có hai móc nối
   ra ngoài — window.TicketConsole.onInternalChat() và .onMessagesRendered() —
   nên gỡ tệp này ra là dashboard chạy y như cũ.

   Ba vai, ba đường vào:
     • Kỹ thuật và Agent — thanh ticket nằm ngay trong đoạn chat giữa hai người,
       vì ticket chỉ được tạo từ trong đó (máy chủ cũng chặn đúng như vậy).
     • Superadmin — nút nổi "Ticket hệ thống", chỉ xem, không xử lý.
   ========================================================================== */
(function () {
    'use strict';

    const NHAN_TRANG_THAI = {
        moi: 'Mới', dang_xu_ly: 'Đang xử lý', cho_agent: 'Chờ Agent',
        da_giai_quyet: 'Đã giải quyết', da_dong: 'Đã đóng',
    };
    const NHAN_UU_TIEN = { thap: 'Thấp', thuong: 'Thường', cao: 'Cao', khan: 'Khẩn' };
    const NHAN_LOAI = { loi: 'Lỗi', yeu_cau: 'Yêu cầu', huong_dan: 'Hướng dẫn', thanh_toan: 'Thanh toán', khac: 'Khác' };
    const NHAN_VIEC = {
        tao: 'tạo ticket', nhan_viec: 'nhận xử lý',
        doi_trang_thai: 'đổi trạng thái', cap_nhat: 'cập nhật',
    };

    let doanChatHienTai = null;   // { sessionId, peerRole, peerName }
    let dsTicket = [];
    let locTrangThai = '';
    let tuKhoa = '';
    let maDangMo = '';
    let tinNguon = null;          // id tin nhắn đang được biến thành ticket

    const api = () => (typeof API_BASE !== 'undefined' && API_BASE) || window.PASTIE_API_BASE || '';
    const toi = () => (typeof CURRENT_ADMIN !== 'undefined' && CURRENT_ADMIN) || null;
    const vaiToi = () => toi()?.role || '';
    const laSuper = () => ['superadmin'].includes(vaiToi());
    const thoat = (s) => (typeof escapeHtml === 'function' ? escapeHtml(String(s ?? '')) : String(s ?? ''));
    const baoLoi = (m) => (typeof toastError === 'function' ? toastError(m) : console.error(m));
    const baoOk = (m) => (typeof toastSuccess === 'function' ? toastSuccess(m) : console.log(m));

    async function goi(duong, tuyChon) {
        const res = await authFetch(`${api()}${duong}`, tuyChon);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Lỗi ${res.status}`);
        return data;
    }

    /* ── Khung giao diện ─────────────────────────────────────────────────── */
    function dungKhung() {
        if (document.getElementById('ticket-panel')) return;

        const style = document.createElement('style');
        style.id = 'ticket-console-style';
        style.textContent = `
        .ticket-bar{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--border-color,rgba(148,163,184,.18));background:rgba(99,102,241,.06);flex-wrap:wrap}
        .ticket-bar.hide{display:none}
        .ticket-bar-label{font-size:12px;font-weight:700;color:#818cf8;display:inline-flex;align-items:center;gap:5px}
        .ticket-btn{min-height:34px;padding:0 12px;border-radius:999px;border:1px solid rgba(99,102,241,.35);background:rgba(99,102,241,.1);color:#818cf8;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
        .ticket-btn:hover{background:rgba(99,102,241,.2)}
        .ticket-btn.primary{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border-color:transparent}
        .ticket-btn[disabled]{opacity:.5;cursor:not-allowed}
        .ticket-float{position:fixed;right:22px;bottom:22px;z-index:900;box-shadow:0 12px 28px rgba(99,102,241,.35)}
        .ticket-float.hide{display:none}
        .ticket-panel{position:fixed;inset:0;z-index:1200;display:none}
        .ticket-panel.is-open{display:block}
        .ticket-panel-mask{position:absolute;inset:0;background:rgba(2,6,23,.55)}
        .ticket-panel-body{position:absolute;top:0;right:0;height:100%;width:min(460px,100%);background:var(--bg-card,#0f172a);border-left:1px solid var(--border-color,rgba(148,163,184,.18));display:flex;flex-direction:column;box-shadow:-18px 0 40px rgba(2,6,23,.4)}
        .ticket-panel-head{padding:14px 16px;border-bottom:1px solid var(--border-color,rgba(148,163,184,.18));display:flex;align-items:center;justify-content:space-between;gap:10px}
        .ticket-panel-head h3{margin:0;font-size:15px;font-weight:700}
        .ticket-close{width:34px;height:34px;border-radius:10px;border:none;background:rgba(148,163,184,.14);color:inherit;cursor:pointer;font-size:16px}
        .ticket-filters{display:flex;gap:6px;padding:10px 16px;flex-wrap:wrap;border-bottom:1px solid var(--border-color,rgba(148,163,184,.14))}
        .ticket-chip{min-height:32px;padding:0 12px;border-radius:999px;border:1px solid rgba(148,163,184,.28);background:transparent;color:inherit;font-size:12px;font-weight:600;cursor:pointer}
        .ticket-chip.is-active{background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.5);color:#a5b4fc}
        .ticket-search{margin:10px 16px 0;display:flex;gap:8px}
        .ticket-search input{flex:1;min-height:38px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color,rgba(148,163,184,.25));background:rgba(148,163,184,.08);color:inherit;font-size:13px}
        .ticket-list{flex:1;overflow-y:auto;padding:12px 16px 18px;display:flex;flex-direction:column;gap:10px}
        .ticket-card{padding:12px;border-radius:14px;border:1px solid var(--border-color,rgba(148,163,184,.2));background:rgba(148,163,184,.06);cursor:pointer}
        .ticket-card:hover{border-color:rgba(99,102,241,.5)}
        .ticket-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
        .ticket-code{font-family:ui-monospace,Menlo,monospace;font-size:12px;font-weight:700;color:#a5b4fc}
        .ticket-status{font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px;white-space:nowrap}
        .ticket-status.moi{background:rgba(239,68,68,.16);color:#fca5a5}
        .ticket-status.dang_xu_ly{background:rgba(59,130,246,.16);color:#93c5fd}
        .ticket-status.cho_agent{background:rgba(245,158,11,.16);color:#fcd34d}
        .ticket-status.da_giai_quyet{background:rgba(34,197,94,.16);color:#86efac}
        .ticket-status.da_dong{background:rgba(148,163,184,.16);color:#cbd5e1}
        .ticket-subject{font-size:13.5px;font-weight:600;line-height:1.4}
        .ticket-meta{margin-top:6px;font-size:11.5px;color:var(--text-muted,#94a3b8);display:flex;gap:10px;flex-wrap:wrap}
        .ticket-form{padding:14px 16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto}
        .ticket-form label{font-size:12px;font-weight:600;color:var(--text-muted,#94a3b8)}
        .ticket-form input,.ticket-form textarea,.ticket-form select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border-color,rgba(148,163,184,.25));background:rgba(148,163,184,.08);color:inherit;font-size:13px;font-family:inherit}
        .ticket-form textarea{min-height:96px;resize:vertical}
        .ticket-form-row{display:flex;gap:10px}
        .ticket-form-row>div{flex:1}
        .ticket-detail{padding:14px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
        .ticket-detail-actions{display:flex;gap:8px;flex-wrap:wrap}
        .ticket-history{display:flex;flex-direction:column;gap:8px}
        .ticket-history-row{font-size:12px;padding:9px 11px;border-radius:10px;background:rgba(148,163,184,.07);border-left:2px solid rgba(99,102,241,.5)}
        .ticket-history-row .who{font-weight:700}
        .ticket-history-row .when{color:var(--text-muted,#94a3b8);font-size:11px}
        .ticket-empty{padding:26px 10px;text-align:center;color:var(--text-muted,#94a3b8);font-size:13px}
        .ticket-msg-btn{border:none;background:transparent;color:#818cf8;cursor:pointer;font-size:12px;padding:2px 6px;border-radius:8px;display:inline-flex;align-items:center;gap:4px}
        .ticket-msg-btn:hover{background:rgba(99,102,241,.14)}
        .ticket-note{font-size:12px;color:var(--text-muted,#94a3b8);line-height:1.5}
        @media (max-width:520px){.ticket-panel-body{width:100%}}
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.className = 'ticket-panel';
        panel.id = 'ticket-panel';
        panel.innerHTML = `
            <div class="ticket-panel-mask" data-dong></div>
            <div class="ticket-panel-body" role="dialog" aria-modal="true" aria-label="Ticket hỗ trợ">
                <div class="ticket-panel-head">
                    <h3 id="ticket-panel-title">Ticket hỗ trợ</h3>
                    <button type="button" class="ticket-close" data-dong aria-label="Đóng">✕</button>
                </div>
                <div id="ticket-panel-content"></div>
            </div>`;
        document.body.appendChild(panel);
        panel.querySelectorAll('[data-dong]').forEach((el) => el.addEventListener('click', dong));
        // Bấm Esc để đóng: người dùng bàn phím không phải rê chuột đi tìm nút ✕.
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dong(); });

        // Nút nổi cho Superadmin — vai này không có đoạn chat nội bộ nào để mà
        // mở thanh ticket, nhưng vẫn cần nhìn thấy toàn hệ thống.
        const nut = document.createElement('button');
        nut.type = 'button';
        nut.id = 'ticket-float-btn';
        nut.className = 'ticket-btn primary ticket-float hide';
        nut.innerHTML = '<i class="ri-coupon-3-line"></i> Ticket hệ thống';
        nut.addEventListener('click', () => moPanel({ tieuDe: 'Ticket toàn hệ thống' }));
        document.body.appendChild(nut);
        if (laSuper()) nut.classList.remove('hide');
    }

    /* ── Thanh ticket trong đoạn chat ────────────────────────────────────── */
    function laDoanKyThuat(chat) {
        return !!chat && /^internal_agent_\d+_technical_\d+$/.test(String(chat.sessionId || ''));
    }

    function dungThanh() {
        let bar = document.getElementById('ticket-bar');
        if (bar) return bar;
        bar = document.createElement('div');
        bar.id = 'ticket-bar';
        bar.className = 'ticket-bar hide';
        bar.innerHTML = `
            <span class="ticket-bar-label"><i class="ri-coupon-3-line"></i> Ticket hỗ trợ</span>
            <button type="button" class="ticket-btn" id="ticket-open-list">Đang mở: <b id="ticket-open-count">0</b></button>
            <button type="button" class="ticket-btn primary" id="ticket-create-btn"><i class="ri-add-line"></i> Tạo ticket</button>`;
        // Đặt ngay dưới header chat, trên khung tin nhắn: đúng chỗ mắt đi qua khi
        // vừa đọc xong tin của đối phương và muốn biến nó thành việc.
        const khung = document.getElementById('chat-messages-container');
        khung?.parentNode?.insertBefore(bar, khung);
        bar.querySelector('#ticket-open-list').addEventListener('click', () => moPanel({}));
        bar.querySelector('#ticket-create-btn').addEventListener('click', () => { tinNguon = null; moPanel({ taoMoi: true }); });
        return bar;
    }

    async function onInternalChat(chat) {
        dungKhung();
        const bar = dungThanh();
        doanChatHienTai = laDoanKyThuat(chat) ? chat : null;

        if (!doanChatHienTai) { bar.classList.add('hide'); return; }
        bar.classList.remove('hide');
        // Đếm ticket CHƯA đóng của đúng đoạn chat này. Con số kèm nút là thứ
        // khiến người ta nhớ là mình còn việc treo.
        try {
            const data = await goi(`/api/admin/tickets?sessionId=${encodeURIComponent(chat.sessionId)}`);
            dsTicket = data.tickets || [];
            const dangMo = dsTicket.filter((t) => !['da_dong', 'da_giai_quyet'].includes(t.status)).length;
            const dem = document.getElementById('ticket-open-count');
            if (dem) dem.textContent = String(dangMo);
        } catch (e) { /* không có ticket cũng không sao, thanh vẫn dùng được */ }
    }

    // Gắn nút "biến tin nhắn này thành ticket" vào từng tin trong đoạn chat
    // Agent ↔ Kỹ thuật. Gọi lại sau mỗi lần khung tin nhắn vẽ lại.
    function onMessagesRendered() {
        if (!doanChatHienTai) return;
        document.querySelectorAll('#chat-messages-container .message-wrapper').forEach((el) => {
            if (el.querySelector('.ticket-msg-btn')) return;
            const id = el.getAttribute('data-message-id') || el.dataset.messageId;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ticket-msg-btn';
            btn.innerHTML = '<i class="ri-coupon-3-line"></i> Tạo ticket từ tin này';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                tinNguon = id ? Number(id) : null;
                const chu = el.querySelector('.original-text')?.textContent || '';
                moPanel({ taoMoi: true, moTa: chu.slice(0, 400) });
            });
            el.querySelector('.msg-body-wrap')?.appendChild(btn) || el.appendChild(btn);
        });
    }

    /* ── Panel ───────────────────────────────────────────────────────────── */
    function dong() {
        document.getElementById('ticket-panel')?.classList.remove('is-open');
        maDangMo = '';
    }

    function moPanel({ taoMoi = false, moTa = '', tieuDe = 'Ticket hỗ trợ' } = {}) {
        dungKhung();
        const panel = document.getElementById('ticket-panel');
        panel.classList.add('is-open');
        document.getElementById('ticket-panel-title').textContent = tieuDe;
        if (taoMoi) veFormTao(moTa); else veDanhSach();
    }

    function veFormTao(moTaSan) {
        const o = document.getElementById('ticket-panel-content');
        document.getElementById('ticket-panel-title').textContent = 'Tạo ticket mới';
        o.innerHTML = `
            <div class="ticket-form">
                ${tinNguon ? '<p class="ticket-note"><i class="ri-links-line"></i> Ticket này sẽ gắn với tin nhắn bạn vừa chọn, để sau còn lần lại được.</p>' : ''}
                <div><label for="tk-subject">Tiêu đề</label>
                <input id="tk-subject" maxlength="255" placeholder="Ví dụ: Máy in hóa đơn không nhận lệnh"></div>
                <div><label for="tk-desc">Mô tả</label>
                <textarea id="tk-desc" maxlength="5000" placeholder="Mô tả rõ hiện tượng, thời điểm bắt đầu, đã thử cách nào.">${thoat(moTaSan)}</textarea></div>
                <div class="ticket-form-row">
                    <div><label for="tk-cat">Loại</label>
                    <select id="tk-cat">${Object.entries(NHAN_LOAI).map(([k, v]) => `<option value="${k}"${k === 'loi' ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
                    <div><label for="tk-pri">Ưu tiên</label>
                    <select id="tk-pri">${Object.entries(NHAN_UU_TIEN).map(([k, v]) => `<option value="${k}"${k === 'thuong' ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
                </div>
                <div class="ticket-detail-actions">
                    <button type="button" class="ticket-btn primary" id="tk-submit"><i class="ri-send-plane-line"></i> Tạo ticket</button>
                    <button type="button" class="ticket-btn" id="tk-cancel">Quay lại danh sách</button>
                </div>
            </div>`;
        o.querySelector('#tk-cancel').addEventListener('click', veDanhSach);
        o.querySelector('#tk-submit').addEventListener('click', taoTicket);
        setTimeout(() => o.querySelector('#tk-subject')?.focus(), 60);
    }

    async function taoTicket() {
        const nut = document.getElementById('tk-submit');
        const subject = document.getElementById('tk-subject').value.trim();
        if (!subject) { baoLoi('Chưa có tiêu đề ticket.'); return; }
        if (!doanChatHienTai) { baoLoi('Ticket chỉ tạo được từ trong đoạn chat với Kỹ thuật.'); return; }
        // Khoá nút ngay: mạng chậm mà bấm hai lần là ra hai ticket giống hệt nhau.
        nut.disabled = true;
        try {
            const data = await goi('/api/admin/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: doanChatHienTai.sessionId,
                    subject,
                    description: document.getElementById('tk-desc').value.trim(),
                    category: document.getElementById('tk-cat').value,
                    priority: document.getElementById('tk-pri').value,
                    sourceMessageId: tinNguon || undefined,
                }),
            });
            baoOk(`Đã tạo ${data.ticket.ticket_code}`);
            tinNguon = null;
            await onInternalChat(doanChatHienTai);
            veChiTiet(data.ticket.ticket_code);
        } catch (e) {
            baoLoi(e.message);
        } finally { nut.disabled = false; }
    }

    async function veDanhSach() {
        const o = document.getElementById('ticket-panel-content');
        document.getElementById('ticket-panel-title').textContent = laSuper() ? 'Ticket toàn hệ thống' : 'Ticket hỗ trợ';
        o.innerHTML = `
            <div class="ticket-filters">
                ${[['', 'Tất cả'], ['moi', 'Mới'], ['dang_xu_ly', 'Đang xử lý'], ['cho_agent', 'Chờ Agent'], ['da_dong', 'Đã đóng']]
                .map(([k, v]) => `<button type="button" class="ticket-chip${locTrangThai === k ? ' is-active' : ''}" data-loc="${k}">${v}</button>`).join('')}
            </div>
            <div class="ticket-search">
                <input id="tk-search" placeholder="Tìm theo mã ticket, ví dụ PT-260910-000001" value="${thoat(tuKhoa)}">
                <button type="button" class="ticket-btn" id="tk-search-btn"><i class="ri-search-line"></i></button>
            </div>
            ${doanChatHienTai ? '<div class="ticket-search"><button type="button" class="ticket-btn primary" id="tk-new" style="flex:1"><i class="ri-add-line"></i> Tạo ticket mới</button></div>' : ''}
            <div class="ticket-list" id="tk-list"><div class="ticket-empty">Đang tải…</div></div>`;

        o.querySelectorAll('[data-loc]').forEach((b) => b.addEventListener('click', () => {
            locTrangThai = b.getAttribute('data-loc'); veDanhSach();
        }));
        const oTim = o.querySelector('#tk-search');
        const chayTim = () => { tuKhoa = oTim.value.trim(); napDanhSach(); };
        o.querySelector('#tk-search-btn').addEventListener('click', chayTim);
        oTim.addEventListener('keydown', (e) => { if (e.key === 'Enter') chayTim(); });
        o.querySelector('#tk-new')?.addEventListener('click', () => { tinNguon = null; veFormTao(''); });
        napDanhSach();
    }

    async function napDanhSach() {
        const khung = document.getElementById('tk-list');
        if (!khung) return;
        const tham = [];
        if (locTrangThai) tham.push(`status=${locTrangThai}`);
        if (tuKhoa) tham.push(`q=${encodeURIComponent(tuKhoa)}`);
        try {
            const data = await goi(`/api/admin/tickets${tham.length ? '?' + tham.join('&') : ''}`);
            dsTicket = data.tickets || [];
            if (!dsTicket.length) {
                khung.innerHTML = `<div class="ticket-empty">${tuKhoa || locTrangThai ? 'Không có ticket nào khớp.' : 'Chưa có ticket nào.'}</div>`;
                return;
            }
            khung.innerHTML = dsTicket.map(theTicket).join('');
            khung.querySelectorAll('[data-ma]').forEach((el) => el.addEventListener('click',
                () => veChiTiet(el.getAttribute('data-ma'))));
        } catch (e) {
            khung.innerHTML = `<div class="ticket-empty">${thoat(e.message)}</div>`;
        }
    }

    function theTicket(t) {
        const gio = t.updated_at ? new Date(t.updated_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        return `
        <div class="ticket-card" data-ma="${thoat(t.ticket_code)}">
            <div class="ticket-card-top">
                <span class="ticket-code">${thoat(t.ticket_code)}</span>
                <span class="ticket-status ${t.status}">${thoat(NHAN_TRANG_THAI[t.status] || t.status)}</span>
            </div>
            <div class="ticket-subject">${thoat(t.subject)}</div>
            <div class="ticket-meta">
                <span><i class="ri-price-tag-3-line"></i> ${thoat(NHAN_LOAI[t.category] || t.category)}</span>
                <span><i class="ri-flag-line"></i> ${thoat(NHAN_UU_TIEN[t.priority] || t.priority)}</span>
                ${t.agent_name ? `<span><i class="ri-store-2-line"></i> ${thoat(t.agent_name)}</span>` : ''}
                ${gio ? `<span><i class="ri-time-line"></i> ${gio}</span>` : ''}
            </div>
        </div>`;
    }

    async function veChiTiet(ma) {
        maDangMo = ma;
        const o = document.getElementById('ticket-panel-content');
        o.innerHTML = '<div class="ticket-empty">Đang tải…</div>';
        let data;
        try { data = await goi(`/api/admin/tickets/${encodeURIComponent(ma)}`); }
        catch (e) { o.innerHTML = `<div class="ticket-empty">${thoat(e.message)}</div>`; return; }

        const t = data.ticket;
        const quyen = data.quyen || {};
        document.getElementById('ticket-panel-title').textContent = t.ticket_code;

        // Nút nào hiện ra là do MÁY CHỦ trả về quyền, không phải do vai đoán ở
        // client: ẩn nút không phải là chặn, nhưng hiện một nút chắc chắn bấm
        // vào sẽ báo lỗi thì còn tệ hơn.
        const nutTrangThai = [];
        if (quyen.sua) {
            if (vaiToi() === 'technical' && !t.assigned_to_admin_id) nutTrangThai.push(['claim', 'Nhận xử lý', 'primary']);
            if (t.status !== 'dang_xu_ly') nutTrangThai.push(['dang_xu_ly', 'Đang xử lý', '']);
            if (t.status !== 'cho_agent') nutTrangThai.push(['cho_agent', 'Chờ Agent', '']);
            if (quyen.dong && t.status !== 'da_giai_quyet') nutTrangThai.push(['da_giai_quyet', 'Đã giải quyết', '']);
            if (quyen.dong && t.status !== 'da_dong') nutTrangThai.push(['da_dong', 'Đóng ticket', '']);
        }

        o.innerHTML = `
        <div class="ticket-detail">
            <div>
                <div class="ticket-card-top">
                    <span class="ticket-code">${thoat(t.ticket_code)}</span>
                    <span class="ticket-status ${t.status}">${thoat(NHAN_TRANG_THAI[t.status] || t.status)}</span>
                </div>
                <div class="ticket-subject" style="font-size:15px;margin-top:4px">${thoat(t.subject)}</div>
                <div class="ticket-meta">
                    <span><i class="ri-price-tag-3-line"></i> ${thoat(NHAN_LOAI[t.category] || t.category)}</span>
                    <span><i class="ri-flag-line"></i> ${thoat(NHAN_UU_TIEN[t.priority] || t.priority)}</span>
                    <span><i class="ri-store-2-line"></i> ${thoat(t.agent_name || '')}</span>
                    <span><i class="ri-tools-line"></i> ${thoat(t.technical_name || 'Chưa có kỹ thuật')}</span>
                </div>
            </div>
            ${t.description ? `<div class="ticket-note" style="white-space:pre-wrap">${thoat(t.description)}</div>` : ''}
            ${quyen.chiXem ? '<p class="ticket-note"><i class="ri-eye-line"></i> Bạn đang xem với quyền theo dõi. Việc xử lý thuộc về Kỹ thuật và Agent.</p>' : ''}
            ${nutTrangThai.length ? `
              <div><label class="ticket-note" for="tk-note">Ghi chú kèm theo (không bắt buộc)</label>
              <input id="tk-note" class="ticket-form" style="width:100%;padding:9px 11px;border-radius:10px;border:1px solid rgba(148,163,184,.25);background:rgba(148,163,184,.08);color:inherit;font-size:13px" placeholder="Ví dụ: đã thay driver máy in"></div>
              <div class="ticket-detail-actions">
                ${nutTrangThai.map(([k, nhan, kieu]) => `<button type="button" class="ticket-btn ${kieu}" data-hanh-dong="${k}">${nhan}</button>`).join('')}
              </div>` : ''}
            ${!quyen.dong && quyen.sua ? '<p class="ticket-note"><i class="ri-information-line"></i> Ticket đã được Kỹ thuật tiếp nhận nên chỉ Kỹ thuật mới đóng được. Bạn vẫn phản hồi thêm trong đoạn chat.</p>' : ''}
            <div>
                <label class="ticket-note" style="display:block;margin-bottom:6px"><i class="ri-history-line"></i> Lịch sử xử lý</label>
                <div class="ticket-history">${(data.history || []).map(dongLichSu).join('') || '<div class="ticket-empty">Chưa có gì.</div>'}</div>
            </div>
            <div class="ticket-detail-actions">
                <button type="button" class="ticket-btn" id="tk-back">← Danh sách ticket</button>
            </div>
        </div>`;

        o.querySelector('#tk-back').addEventListener('click', veDanhSach);
        o.querySelectorAll('[data-hanh-dong]').forEach((b) => b.addEventListener('click', () => doiTrangThai(t.ticket_code, b)));
    }

    function dongLichSu(h) {
        const gio = h.created_at ? new Date(h.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        const doi = h.fromLabel && h.toLabel && h.fromLabel !== h.toLabel ? ` (${thoat(h.fromLabel)} → ${thoat(h.toLabel)})` : '';
        return `<div class="ticket-history-row">
            <span class="who">${thoat(h.actor_name || 'Ai đó')}</span> ${thoat(NHAN_VIEC[h.event_type] || h.event_type)}${doi}
            ${h.note ? `<div>${thoat(h.note)}</div>` : ''}
            <div class="when">${gio}</div>
        </div>`;
    }

    async function doiTrangThai(ma, nut) {
        const hanh = nut.getAttribute('data-hanh-dong');
        const ghiChu = document.getElementById('tk-note')?.value.trim() || '';
        nut.disabled = true;
        try {
            await goi(`/api/admin/tickets/${encodeURIComponent(ma)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(hanh === 'claim'
                    ? { claim: true, status: 'dang_xu_ly', note: ghiChu }
                    : { status: hanh, note: ghiChu }),
            });
            baoOk('Đã cập nhật ticket.');
            if (doanChatHienTai) onInternalChat(doanChatHienTai);
            veChiTiet(ma);
        } catch (e) {
            baoLoi(e.message);
            nut.disabled = false;
        }
    }

    // Ticket đổi trạng thái ở máy khác thì màn hình này phải theo kịp — dùng
    // chính kênh SSE sẵn có, không thêm vòng hỏi định kỳ nào.
    function onTicketUpdate(payload) {
        if (doanChatHienTai && payload?.sessionId === doanChatHienTai.sessionId) onInternalChat(doanChatHienTai);
        const dangMoPanel = document.getElementById('ticket-panel')?.classList.contains('is-open');
        if (dangMoPanel && maDangMo && payload?.ticketCode === maDangMo) veChiTiet(maDangMo);
    }

    window.TicketConsole = { onInternalChat, onMessagesRendered, onTicketUpdate, moPanel, dong };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dungKhung);
    else dungKhung();
})();
