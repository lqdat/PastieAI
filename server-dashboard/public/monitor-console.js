// Trang theo dõi hệ thống của Superadmin.
//
// Hai tab: Sức khoẻ (máy chủ có đang đuối không) và Vận hành (chỗ nào đang tắc).
// Tự tải lại 5 giây một lần, nhưng CHỈ khi cửa sổ đang mở — đóng lại là dừng
// hẳn. Một trang theo dõi tự nó gây tải là trang theo dõi nói dối.
(function () {
    'use strict';

    let timer = null;
    let activeTab = 'health';
    let inFlightTab = null;
    let requestSeq = 0;

    const $ = (id) => document.getElementById(id);
    const num = (v) => Number(v || 0).toLocaleString('vi-VN');
    const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')} ₫`;

    function duration(seconds) {
        const s = Math.max(0, Math.round(Number(seconds) || 0));
        if (s < 60) return `${s} giây`;
        if (s < 3600) return `${Math.floor(s / 60)} phút`;
        if (s < 86400) return `${Math.floor(s / 3600)} giờ ${Math.floor((s % 3600) / 60)} phút`;
        return `${Math.floor(s / 86400)} ngày ${Math.floor((s % 86400) / 3600)} giờ`;
    }

    // Ba mức: bình thường / cần để ý / có vấn đề. Ngưỡng đặt theo những gì đã đo
    // được, không đặt theo cảm tính.
    function tone(value, warn, bad) {
        if (value >= bad) return 'is-bad';
        if (value >= warn) return 'is-warn';
        return 'is-ok';
    }

    // Dùng thuộc tính title của trình duyệt, không tự vẽ tooltip.
    //
    // Các ô nằm trong một khung có overflow-y: auto. Tooltip tự vẽ bằng CSS sẽ bị
    // khung đó CẮT MẤT khi ô nằm sát mép trên — đúng lúc cần đọc nhất. title thì
    // trình duyệt vẽ ở lớp trên cùng, không bao giờ bị cắt, và đọc được bằng trình
    // đọc màn hình.
    function tile(label, value, sub, cls, tip) {
        const t = tip ? ` title="${escapeHtml(tip)}"` : '';
        return `<div class="mon-tile ${cls || ''}${tip ? ' has-tip' : ''}"${t}>
            <span class="mon-tile-label">${label}</span>
            <strong class="mon-tile-value">${value}</strong>
            ${sub ? `<small class="mon-tile-sub">${sub}</small>` : ''}
        </div>`;
    }

    function renderHealth(d) {
        const t = d.traffic?.last60s || {};
        const t10 = d.traffic?.last10s || {};
        const p = d.process || {};
        const db = d.db || {};
        const c = d.counts || {};

        // waiting > 0 nghĩa là có request đang xếp hàng chờ kết nối database —
        // dấu hiệu rõ nhất của "CPU nhàn mà vẫn chậm".
        const poolTone = db.waiting > 0 ? 'is-bad' : (db.max && db.total >= db.max ? 'is-warn' : 'is-ok');

        $('monitor-health').innerHTML = `
            <div class="mon-grid">
                ${tile('Khách đang online', num(d.live?.customersOnline),
                    `có gọi máy chủ trong ${d.live?.windowSeconds || 60} giây qua`, 'is-hero',
                    'Số phiên chat có gọi tới máy chủ trong 60 giây qua — khách đang thật sự mở trang. Khác với \'Phiên đang mở\' bên dưới: một phiên có thể còn mở trong database dù khách đã rời đi từ hôm qua.')}
                ${tile('Request mỗi giây', t.perSecond ?? 0,
                    `${num(t.requests)} lượt trong 60 giây`, '',
                    'Số lượt gọi máy chủ trung bình mỗi giây trong 60 giây qua. Mỗi khách đang mở trang tạo ra khoảng 0,6 lượt/giây, nên con số này chia cho 0,6 xấp xỉ số khách đang xem.')}
                ${tile('Độ trễ p95', `${t.p95 ?? 0}ms`,
                    `p50 ${t.p50 ?? 0}ms · p99 ${t.p99 ?? 0}ms`, tone(t.p95 || 0, 500, 1500),
                    '95 trong 100 lượt gọi nhanh hơn con số này. Dùng p95 thay vì trung bình vì trung bình đẹp vẫn có thể che một nhóm khách đang chờ rất lâu. Dưới 500ms là tốt, trên 1,5 giây là khách cảm nhận được.')}
                ${tile('Tỉ lệ lỗi', `${((t.errorRate || 0) * 100).toFixed(1)}%`,
                    '4xx và 5xx trong 60 giây', tone((t.errorRate || 0) * 100, 2, 10),
                    'Phần trăm lượt gọi trả về mã 4xx hoặc 5xx trong 60 giây qua. Vài phần trăm là bình thường (khách mở lại phiên đã đóng). Tăng vọt thì xem log máy chủ ngay.')}
            </div>

            ${t.truncated ? `<p class="mon-note"><i class="ri-information-line"></i><span>
                Lưu lượng cao nên vùng đệm chỉ giữ được vài giây gần nhất — con số "60 giây" ở trên
                thực chất là ${num(t.requests)} lượt mới nhất.</span></p>` : ''}

            <h4 class="mon-heading">Máy chủ</h4>
            <div class="mon-grid">
                ${tile('Độ trễ vòng lặp', `${p.loopLagMs ?? 0}ms`,
                    'Node một luồng — số này dâng là có việc chặn tất cả', tone(p.loopLagMs || 0, 50, 200),
                    'Thời gian một việc nhỏ phải đợi tới lượt chạy. Node chạy một luồng, nên số này dâng nghĩa là có việc nặng đang chặn tất cả những người khác. Dưới 50ms là khoẻ, trên 200ms là có vấn đề.')}
                ${tile('Bộ nhớ', `${p.rssMb ?? 0} MB`, `heap ${p.heapUsedMb ?? 0}/${p.heapTotalMb ?? 0} MB`, '',
                    'RSS là toàn bộ bộ nhớ tiến trình đang giữ; heap là phần JavaScript thật sự dùng. Heap tăng đều mà không bao giờ tụt xuống là dấu hiệu rò rỉ bộ nhớ.')}
                ${tile('Đã chạy', duration(p.uptimeSeconds), `Node ${p.nodeVersion || '—'}`, '',
                    'Thời gian từ lần khởi động gần nhất. Con số này bất ngờ tụt về vài phút nghĩa là máy chủ vừa bị khởi động lại — có thể do deploy, hoặc do hết bộ nhớ mà bị hệ thống giết.')}
                ${tile('Pool database', `${num(db.total)}/${db.max ?? '?'}`,
                    `rảnh ${num(db.idle)} · đang chờ ${num(db.waiting)}`, poolTone,
                    'Số kết nối database đang mở trên tổng số tối đa. \'Đang chờ\' lớn hơn 0 kéo dài nghĩa là request đang xếp hàng chờ kết nối — đây là lý do phổ biến nhất của \'CPU vẫn nhàn mà trang vẫn chậm\'.')}
            </div>

            <h4 class="mon-heading">Dữ liệu</h4>
            <div class="mon-grid">
                ${tile('Phiên đang mở', num(c.sessions_active),
                    c.sessions_overdue > 0
                        ? `<b class="mon-flag">${num(c.sessions_overdue)} phiên đã quá hạn mà chưa đóng</b>`
                        : 'đều còn trong hạn', c.sessions_overdue > 0 ? 'is-warn' : '',
                    'Số phiên còn trạng thái đang hoạt động trong database, kể cả phiên khách đã bỏ đi mà chưa hết hạn. Nếu có phiên quá hạn mà chưa đóng, chỗ này sẽ báo đỏ.')}
                ${tile('Tin nhắn 5 phút qua', num(c.messages_5m), '', '',
                    'Tổng số tin nhắn mới của toàn hệ thống trong 5 phút gần nhất, tính cả tin của khách lẫn của nhân viên. Dùng để ước lượng mức bận thật sự.')}
                ${tile('Đơn đang mở', num(c.orders_open), 'chờ xác nhận hoặc chờ thanh toán', '',
                    'Đơn đang chờ Sale xác nhận hoặc đã ra bill mà khách chưa chọn cách trả. Con số này dâng lên rồi không tụt nghĩa là có đơn đang bị bỏ quên.')}
                ${tile('POS chưa gửi được', num(c.pos_pending), 'đã thử ít nhất một lần',
                    (c.pos_pending || 0) > 0 ? 'is-warn' : '',
                    'Sự kiện đã thử gửi sang phần mềm tính tiền nhưng chưa thành công. Lớn hơn 0 kéo dài nghĩa là URL webhook sai, hoặc máy bên kia đang tắt — đơn vẫn an toàn trong database và sẽ gửi lại.')}
            </div>

            <p class="mon-note"><i class="ri-lightbulb-line"></i><span>
                <b>Cách đọc khi thấy chậm:</b> độ trễ p95 cao mà độ trễ vòng lặp thấp và pool không ai chờ
                → nghẽn ở đường truyền, không phải ở máy chủ. Pool có người chờ → nâng
                <code>PG_POOL_MAX</code>. Độ trễ vòng lặp cao → có truy vấn hoặc tác vụ nặng đang chặn.</span></p>`;
    }

    function renderOps(d) {
        const agents = d.agents || [];
        const waiting = d.waiting || [];

        const totals = agents.reduce((acc, a) => ({
            open: acc.open + Number(a.chats_open || 0),
            unclaimed: acc.unclaimed + Number(a.chats_unclaimed || 0),
            orders: acc.orders + Number(a.orders_waiting || 0) + Number(a.orders_billed || 0),
            revenue: acc.revenue + Number(a.revenue_today || 0),
        }), { open: 0, unclaimed: 0, orders: 0, revenue: 0 });

        $('monitor-ops').innerHTML = `
            <div class="mon-grid">
                ${tile('Cuộc chat đang mở', num(totals.open), `${agents.length} Agent`, 'is-hero',
                    'Tổng số cuộc trò chuyện đang hoạt động của tất cả Agent. Bấm sang tab Sức khoẻ để xem bao nhiêu trong số đó là khách đang thật sự online.')}
                ${tile('Chưa ai nhận', num(totals.unclaimed),
                    totals.unclaimed > 0 ? 'khách đang ngồi đợi' : 'không ai bị bỏ quên',
                    totals.unclaimed > 0 ? 'is-bad' : 'is-ok',
                    'Khách đã nhắn nhưng chưa Sale nào nhận cuộc. Đây là con số đáng nhìn nhất của tab này — mọi số liệu khác đẹp mà chỗ này lớn hơn 0 thì vẫn đang có người ngồi đợi.')}
                ${tile('Đơn đang xử lý', num(totals.orders), 'chờ xác nhận + chờ thanh toán', '',
                    'Đơn chờ Sale xác nhận cộng đơn đã ra bill chưa chọn cách trả, của tất cả Agent.')}
                ${tile('Doanh thu hôm nay', money(totals.revenue), 'đơn đã thu tiền', '',
                    'Tổng tiền các đơn đã được nhân viên xác nhận là đã thu, tính từ 0 giờ hôm nay. Đơn mới ra bill chưa thu tiền thì chưa tính vào đây.')}
            </div>

            ${waiting.length ? `
                <h4 class="mon-heading">Khách đang chờ lâu nhất</h4>
                <div class="mon-waiting">
                    ${waiting.map((w) => `
                        <div class="mon-wait-row ${w.waiting_seconds > 300 ? 'is-bad' : w.waiting_seconds > 120 ? 'is-warn' : ''}">
                            <div class="mon-wait-main">
                                <strong>${escapeHtml(w.visitor_name || 'Khách')}</strong>
                                <small>${escapeHtml(w.place || '—')} · ${escapeHtml(w.agent_name || 'chưa gán Agent')}</small>
                            </div>
                            <span class="mon-wait-time">${duration(w.waiting_seconds)}</span>
                        </div>`).join('')}
                </div>` : '<p class="mon-note"><i class="ri-check-line"></i><span>Mọi cuộc trò chuyện đều đã có người nhận.</span></p>'}

            <h4 class="mon-heading">Theo từng Agent</h4>
            ${agents.length ? `
            <div class="mon-table-wrap">
                <table class="mon-table">
                    <thead><tr>
                        <th>Agent</th><th>Chat mở</th><th>Chưa nhận</th><th>Sale</th>
                        <th>Đơn chờ</th><th>Đã ra bill</th><th>Thu hôm nay</th>
                    </tr></thead>
                    <tbody>
                        ${agents.map((a) => `
                            <tr class="${a.chats_unclaimed > 0 ? 'is-flagged' : ''}">
                                <td>
                                    <strong>${escapeHtml(a.agent_name || '—')}</strong>
                                    <small>${escapeHtml(a.project_id || '')}</small>
                                </td>
                                <td>${num(a.chats_open)}</td>
                                <td class="${a.chats_unclaimed > 0 ? 'mon-flag' : ''}">${num(a.chats_unclaimed)}</td>
                                <td>${num(a.sales_active)}</td>
                                <td>${num(a.orders_waiting)}</td>
                                <td>${num(a.orders_billed)}</td>
                                <td>${money(a.revenue_today)}<small>${num(a.orders_paid_today)} đơn</small></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>` : '<p class="mon-note">Chưa có Agent nào.</p>'}`;
    }

    async function refresh() {
        // GHI NHỚ TAB NGAY LÚC GỬI, không đọc lại sau khi chờ xong.
        //
        // Lỗi đã mắc: đọc activeTab SAU await. Bấm sang tab kia trong lúc lượt hỏi
        // chưa về là số liệu của tab này bị đổ vào hàm vẽ của tab kia — bảng Vận
        // hành hiện toàn số 0 vì nó đang cầm dữ liệu Sức khoẻ. Không lỗi nào hiện
        // ra, chỉ là những con số sai trông rất bình thường.
        const tab = activeTab;
        // Chặn dồn lượt CHO CÙNG MỘT TAB thôi. Chặn tất cả thì bấm đổi tab lúc
        // đang tải sẽ không tải gì cả, phải đợi hết 5 giây mới thấy nội dung.
        if (inFlightTab === tab) return;
        const seq = ++requestSeq;
        inFlightTab = tab;
        const path = tab === 'health' ? 'health' : 'operations';
        const target = tab === 'health' ? $('monitor-health') : $('monitor-ops');
        try {
            const res = await authFetch(`${API_BASE}/api/superadmin/monitor/${path}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Không đọc được số liệu.');
            // Đã có lượt mới hơn hoặc người dùng đã sang tab khác: bỏ kết quả này.
            if (seq !== requestSeq || tab !== activeTab) return;
            if (tab === 'health') renderHealth(data); else renderOps(data);
            const stamp = $('monitor-stamp');
            if (stamp) stamp.textContent = `Cập nhật ${new Date().toLocaleTimeString('vi-VN')} · tự làm mới 5 giây/lần`;
        } catch (error) {
            if (seq !== requestSeq) return;
            // Giữ nguyên số liệu cũ trên màn hình, chỉ báo là đang không lấy được.
            // Xoá sạch mỗi lần mạng chớp thì màn hình nhấp nháy vô ích.
            const stamp = $('monitor-stamp');
            if (stamp) stamp.textContent = `Không lấy được số liệu: ${error.message}`;
            if (target && !target.innerHTML.trim()) {
                target.innerHTML = `<p class="mon-note mon-error">${escapeHtml(error.message)}</p>`;
            }
        } finally {
            if (inFlightTab === tab) inFlightTab = null;
        }
    }

    function setTab(name) {
        activeTab = name;
        document.querySelectorAll('[data-monitor-tab]').forEach((tab) => {
            tab.classList.toggle('is-active', tab.dataset.monitorTab === name);
        });
        document.querySelectorAll('[data-monitor-pane]').forEach((pane) => {
            pane.classList.toggle('hide', pane.dataset.monitorPane !== name);
        });
        void refresh();
    }

    function open() {
        $('monitor-modal')?.classList.remove('hide');
        setTab('health');
        stop();
        timer = setInterval(refresh, 5000);
    }

    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    function close() {
        stop();
        $('monitor-modal')?.classList.add('hide');
    }

    document.addEventListener('click', (event) => {
        if (event.target.closest('#monitor-btn')) return void open();
        if (event.target.closest('#monitor-close-btn, #monitor-close-top-btn')) return void close();
        const tab = event.target.closest('[data-monitor-tab]');
        if (tab) setTab(tab.dataset.monitorTab);
    });

    // Chuyển sang tab trình duyệt khác thì ngừng hỏi; quay lại thì hỏi ngay một
    // lượt để không phải nhìn số liệu cũ vài giây.
    document.addEventListener('visibilitychange', () => {
        if (!$('monitor-modal') || $('monitor-modal').classList.contains('hide')) return;
        if (document.hidden) stop();
        else { void refresh(); stop(); timer = setInterval(refresh, 5000); }
    });

    window.MonitorConsole = { open, close, refresh };
})();
