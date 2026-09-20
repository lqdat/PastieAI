// Màn tổ chức QR — dành riêng vai trò 'agent' của dự án qr_concierge.
//
// Quản lý Sale, nhóm tiếp nhận, mã QR và poster in ra. Cùng nhóm với
// menu-console.js: cả hai là phần QR Console tương lai.
//
// Phụ thuộc core.js. Xem chú thích thứ tự nạp ở đầu core.js.
window.ORG_SALES = window.ORG_SALES || [];
window.ORG_GROUPS = window.ORG_GROUPS || [];
window.CURRENT_QR_ACCOUNTS = window.CURRENT_QR_ACCOUNTS || [];

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
        const eligible = adminMgmtUsers.filter(u => u.project_id === projectId && ['agent', 'sale'].includes(u.role) && u.is_active);
        qrOwnerSelect.innerHTML = eligible.length
            ? eligible.map(u => `<option value="${u.id}">${escapeHtml(u.full_name || u.username)}</option>`).join('')
            : '<option value="">Chưa có tài khoản hoạt động</option>';
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
            const eventValue = (value) => encodeURIComponent(value || '').replace(/'/g, '%27');
            const agentName = account.agent_name || account.owner_name || '';
            const agentNameEn = account.agent_name_en || '';
            const agentLogoUrl = account.agent_avatar_url || '';
            return `<article class="qr-account-card">
                <img src="${imageUrl}" alt="QR chat của ${escapeHtml(account.owner_name)}" loading="lazy">
                <div class="qr-account-info"><strong>${escapeHtml(account.label)}</strong><span><i class="ri-user-3-line"></i> ${escapeHtml(account.owner_name)}</span><small>${escapeHtml(account.chat_url)}</small></div>
                <div class="qr-account-actions"><button type="button" onclick="window.copyQrChatLink('${eventValue(account.chat_url)}', true)"><i class="ri-file-copy-line"></i> Sao chép</button><button type="button" onclick="window.openQrPreview('${eventValue(imageUrl)}', '${eventValue(account.label)}', '${eventValue(account.owner_name)}', '${eventValue(account.chat_url)}', '${eventValue(agentName)}', '${eventValue(agentLogoUrl)}', { agentNameEn: '${eventValue(agentNameEn)}' })"><i class="ri-zoom-in-line"></i> Mở QR</button></div>
            </article>`;
        }).join('');
    } catch (error) {
        qrAccountList.innerHTML = `<div class="qr-empty qr-error">${escapeHtml(error.message)}</div>`;
    }
}


const posterImageCache = new Map();

function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith('gradient-') || trimmed.startsWith('default-')) return false;
    return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('data:image/');
}

function loadPosterImage(url) {
    if (!url) return Promise.reject(new Error('URL trống'));
    if (posterImageCache.has(url)) {
        const cached = posterImageCache.get(url);
        if (cached && cached.complete && cached.naturalWidth > 0) {
            return Promise.resolve(cached);
        }
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            posterImageCache.set(url, img);
            resolve(img);
        };
        img.onerror = () => {
            fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.blob();
                })
                .then(blob => {
                    const objectUrl = URL.createObjectURL(blob);
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        URL.revokeObjectURL(objectUrl);
                        posterImageCache.set(url, fallbackImg);
                        resolve(fallbackImg);
                    };
                    fallbackImg.onerror = () => {
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error('Không đọc được ảnh poster.'));
                    };
                    fallbackImg.src = objectUrl;
                })
                .catch(err => reject(err));
        };
        img.src = url;
    });
}

// Nạp trước logo Pastie vào bộ nhớ đệm ngay khi khởi tạo để mở Poster QR tức thì 0ms
try {
    loadPosterImage('/pastie-chat-biz-compact.png').catch(() => {});
} catch(e) {}


function drawPosterRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

// Vẽ đường viền khung Bong bóng thoại (Shape Speech Bubble chuẩn xác theo qrcode.io)
function drawSpeechBubblePath(ctx, x, y, w, mainH, tailW, tailH, r) {
    const cr = Math.min(r, w / 2, mainH / 2);
    ctx.beginPath();
    // Đỉnh nhọn góc dưới bên trái (x, y + mainH + tailH)
    ctx.moveTo(x, y + mainH + tailH);
    // Cạnh trái thẳng đứng từ mũi nhọn lên đỉnh
    ctx.lineTo(x, y + cr);
    // Bo góc trên bên trái
    ctx.arcTo(x, y, x + cr, y, cr);
    // Cạnh trên nằm ngang
    ctx.lineTo(x + w - cr, y);
    // Bo góc trên bên phải
    ctx.arcTo(x + w, y, x + w, y + cr, cr);
    // Cạnh phải thẳng đứng
    ctx.lineTo(x + w, y + mainH - cr);
    // Bo góc dưới bên phải
    ctx.arcTo(x + w, y + mainH, x + w - cr, y + mainH, cr);
    // Cạnh dưới nằm ngang nối tới chân đuôi thoại
    ctx.lineTo(x + tailW, y + mainH);
    // Cạnh chéo của đuôi thoại nối xuống đỉnh nhọn
    ctx.lineTo(x, y + mainH + tailH);
    ctx.closePath();
}

function drawCustomCellRoundRect(ctx, x, y, w, h, rTL, rTR, rBR, rBL) {
    ctx.beginPath();
    ctx.moveTo(x + rTL, y);
    ctx.lineTo(x + w - rTR, y);
    if (rTR) ctx.arcTo(x + w, y, x + w, y + rTR, rTR);
    else ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - rBR);
    if (rBR) ctx.arcTo(x + w, y + h, x + w - rBR, y + h, rBR);
    else ctx.lineTo(x + w, y);
    ctx.lineTo(x + rBL, y + h);
    if (rBL) ctx.arcTo(x, y + h, x, y + h - rBL, rBL);
    else ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + rTL);
    if (rTL) ctx.arcTo(x, y, x + rTL, y, rTL);
    else ctx.lineTo(x, y);
    ctx.closePath();
}

function extractQrText(url) {
    if (!url) return '';
    try {
        const u = new URL(url);
        return u.searchParams.get('text') || url;
    } catch {
        return url;
    }
}

// Vẽ mã QR vector cao cấp định hình Bong bóng thoại (Speech Bubble) chuẩn qrcode.io
// ĐẢM BẢO KHÔNG BỊ MẤT MÃ, CÁC HẠT NẰM AN TOÀN TRONG Ô VÀ QUÉT ĐƯỢC 100%
function drawStyledVectorQrCode(ctx, text, frameX, frameY, frameW, frameH, options = {}) {
    if (typeof frameH === 'object' && frameH !== null) {
        options = frameH;
        frameH = frameW;
    }
    const size = frameW || 380;
    const w = size;

    if (!window.QRCode || !text) {
        if (options.fallbackImage) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(options.fallbackImage, frameX + 16, frameY + 16, w - 32, w - 32);
            ctx.imageSmoothingEnabled = true;
        }
        return;
    }

    let qr;
    try {
        // Luôn sử dụng Error Correction Level 'H' (High 30%) để máy ảnh nhận diện siêu nhạy
        qr = window.QRCode.create(text, { errorCorrectionLevel: 'H' });
    } catch (e) {
        console.warn('QRCode.create failed, fallback to image:', e);
        if (options.fallbackImage) {
            ctx.drawImage(options.fallbackImage, frameX + 16, frameY + 16, w - 32, w - 32);
        }
        return;
    }

    const n = qr.modules.size;

    // Tỉ lệ hình học Speech Bubble chuẩn theo ảnh qrcode.io:
    // Thân chính của bong bóng thoại là HÌNH VUÔNG (SQUARE) để ma trận mã QR lấp đầy trọn vẹn 100%,
    // không còn khoảng trắng thừa hai bên như khi dùng thân chữ nhật.
    const bodySize = w;
    const tailH = Math.round(bodySize * 0.15); // Đuôi thoại nhô xuống dưới ~15%
    const tailW = Math.round(bodySize * 0.32); // Độ rộng chân đuôi thoại ~32%
    const totalH = bodySize + tailH;
    const radius = Math.round(bodySize * 0.085); // Bán kính bo góc
    const strokeW = Math.max(5, Math.round(bodySize * 0.034)); // Độ dày viền khung

    // Gradient thương hiệu Pastie (#ef2b9d -> #c90c6c -> #8b0aa5)
    const qrGrad = ctx.createLinearGradient(frameX, frameY, frameX + bodySize, frameY + totalH);
    qrGrad.addColorStop(0, '#ef2b9d');
    qrGrad.addColorStop(0.5, '#c90c6c');
    qrGrad.addColorStop(1, '#8b0aa5');

    // Tọa độ inset chuẩn cho khung viền
    const halfStroke = strokeW / 2;
    const px0 = frameX + halfStroke;
    const py0 = frameY + halfStroke;
    const pw = bodySize - strokeW;
    const pMainH = bodySize - strokeW; // THÂN VUÔNG ĐỒNG ĐỀU
    const pTailH = tailH;
    const pTailW = tailW;
    const pr = Math.max(4, radius - halfStroke);

    // 1. VẼ NỀN TRẮNG VÀ KHUNG VIỀN NGOÀI BONG BÓNG THOẠI (Frame Stroke theo qrcode.io)
    ctx.save();
    drawSpeechBubblePath(ctx, px0, py0, pw, pMainH, pTailW, pTailH, pr);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = qrGrad;
    ctx.stroke();
    ctx.restore();

    // 2. LẤP ĐẦY TRỌN VẸN MÃ QR VÀO THÂN BONG BÓNG THOẠI (~90% DIỆN TÍCH THÂN)
    // Khoảng đệm đều 4 phía (trên, dưới, trái, phải) ~5.2%, giúp mã QR lấp đầy ô,
    // các mắt finder đặt sát góc đẹp mắt như qrcode.io mà vẫn quét nhạy 100%.
    const margin = Math.round(bodySize * 0.052);
    const qw = bodySize - margin * 2;
    const cell = qw / n;
    const qx = px0 + (pw - qw) / 2;
    const qy = py0 + (pMainH - qw) / 2;

    // Vùng 3 góc Finder (7x7 module)
    function isFinder(r, c) {
        if (r < 7 && c < 7) return true;
        if (r < 7 && c >= n - 7) return true;
        if (r >= n - 7 && c < 7) return true;
        return false;
    }

    // Vùng viền trắng phân cách xung quanh Finder (Separator 1 cell)
    function isFinderSeparator(r, c) {
        if (r <= 7 && c <= 7 && (r === 7 || c === 7)) return true;
        if (r <= 7 && c >= n - 8 && (r === 7 || c === n - 8)) return true;
        if (r >= n - 8 && c <= 7 && (r === n - 8 || c === 7)) return true;
        return false;
    }

    // Vùng Logo trung tâm
    const hasCenterLogo = Boolean(options.centerLogoImage);
    const centerR = hasCenterLogo ? 4.5 : 0;
    const centerRow = (n - 1) / 2;
    const centerCol = (n - 1) / 2;

    function isCenterLogo(r, c) {
        if (!hasCenterLogo) return false;
        const dr = r - centerRow;
        const dc = c - centerCol;
        return (dr * dr + dc * dc) <= (centerR * centerR);
    }

    // 3. VẼ CÁC MODULE DỮ LIỆU CHÍNH (Classy-rounded) - BATCH PATH VẼ TỨC THÌ (<3ms)
    ctx.save();
    ctx.fillStyle = qrGrad;
    ctx.beginPath();

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (isFinder(r, c) || isFinderSeparator(r, c) || isCenterLogo(r, c)) continue;
            if (!qr.modules.get(r, c)) continue;

            const top = (r > 0) && !isFinder(r - 1, c) && !isFinderSeparator(r - 1, c) && !isCenterLogo(r - 1, c) && qr.modules.get(r - 1, c);
            const right = (c < n - 1) && !isFinder(r, c + 1) && !isFinderSeparator(r, c + 1) && !isCenterLogo(r, c + 1) && qr.modules.get(r, c + 1);
            const bottom = (r < n - 1) && !isFinder(r + 1, c) && !isFinderSeparator(r + 1, c) && !isCenterLogo(r + 1, c) && qr.modules.get(r + 1, c);
            const left = (c > 0) && !isFinder(r, c - 1) && !isFinderSeparator(r, c - 1) && !isCenterLogo(r, c - 1) && qr.modules.get(r, c - 1);

            const px = qx + c * cell;
            const py = qy + r * cell;
            const maxR = cell * 0.40;

            const rTL = (!top && !left) ? maxR : 0;
            const rTR = (!top && !right) ? maxR : 0;
            const rBR = (!bottom && !right) ? maxR : 0;
            const rBL = (!bottom && !left) ? maxR : 0;

            if (ctx.roundRect) {
                ctx.roundRect(px, py, cell, cell, [rTL, rTR, rBR, rBL]);
            } else {
                drawCustomCellRoundRect(ctx, px, py, cell, cell, rTL, rTR, rBR, rBL);
            }
        }
    }
    ctx.fill();

    // 4. VẼ 3 GÓC FINDER CHUẨN QUỐC TẾ (Circle Ring + Circle Dot, tỉ lệ 1:1:3:1:1)
    // Giữ tuyệt đối khả năng quét tức thì cho mọi camera smartphone
    const finders = [
        { cx: qx + 3.5 * cell, cy: qy + 3.5 * cell },
        { cx: qx + (n - 3.5) * cell, cy: qy + 3.5 * cell },
        { cx: qx + 3.5 * cell, cy: qy + (n - 3.5) * cell },
    ];

    // Vẽ 3 vòng ngoài cùng một mảng vẽ (single stroke call)
    ctx.beginPath();
    ctx.strokeStyle = qrGrad;
    ctx.lineWidth = cell;
    finders.forEach(({ cx, cy }) => {
        ctx.moveTo(cx + 3 * cell, cy);
        ctx.arc(cx, cy, 3 * cell, 0, Math.PI * 2);
    });
    ctx.stroke();

    // Vẽ 3 tâm tròn cùng một mảng vẽ (single fill call)
    ctx.beginPath();
    ctx.fillStyle = qrGrad;
    finders.forEach(({ cx, cy }) => {
        ctx.moveTo(cx + 1.5 * cell, cy);
        ctx.arc(cx, cy, 1.5 * cell, 0, Math.PI * 2);
    });
    ctx.fill();

    // 5. VẼ CÁC HẠT ĐIỀN VÀO PHẦN ĐUÔI THOẠI (Shape: Speech Bubble Filler) - BATCH PATH
    // Đặt hạt ở phần đuôi thoại bên dưới mã QR, có khoảng cách đệm (Quiet Zone) an toàn
    // dưới góc finder để không gây nhiễu góc đọc của máy quét
    const tailStartY = qy + qw + cell * 1.5; // Cách đáy mã QR ít nhất 1.5 cell an toàn
    const tailTipY = py0 + pMainH + pTailH - halfStroke;
    const tailRowStart = Math.ceil((tailStartY - qy) / cell);
    const tailRowEnd = Math.floor((tailTipY - qy) / cell);

    ctx.beginPath();
    for (let r = tailRowStart; r <= tailRowEnd; r++) {
        const py = qy + r * cell;
        if (py + cell * 0.4 >= tailTipY) continue;

        const progress = Math.min(1, Math.max(0, (py - (py0 + pMainH)) / pTailH));
        const maxDiagX = px0 + pTailW * (1 - progress);

        for (let c = 0; qx + c * cell < maxDiagX - 4; c++) {
            const px = qx + c * cell;
            if (px + cell * 0.5 > maxDiagX - 4) continue;

            const isDark = ((c * 7 + r * 13 + n) % 9) < 6 || ((c + r) % 2 === 0);
            if (!isDark) continue;

            const maxR = cell * 0.40;
            if (ctx.roundRect) {
                ctx.roundRect(px, py, cell, cell, maxR);
            } else {
                drawCustomCellRoundRect(ctx, px, py, cell, cell, maxR, maxR, maxR, maxR);
            }
        }
    }
    ctx.fill();
    ctx.restore();

    // 6. VẼ LOGO TRUNG TÂM (Badge tròn bảo vệ logo khách)
    if (hasCenterLogo) {
        const logoImg = options.centerLogoImage;
        const logoCenterX = qx + qw / 2;
        const logoCenterY = qy + qw / 2;
        const badgeRadius = (centerR + 0.5) * cell;

        // Badge nền trắng tròn
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCenterX, logoCenterY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(201, 12, 108, 0.16)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        // Viền badge hồng tinh tế
        ctx.beginPath();
        ctx.arc(logoCenterX, logoCenterY, badgeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#f3c4db';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Vẽ logo bên trong badge tròn
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCenterX, logoCenterY, badgeRadius - 2, 0, Math.PI * 2);
        ctx.clip();

        const imgW = logoImg.naturalWidth || 100;
        const imgH = logoImg.naturalHeight || 100;
        const imgRatio = imgW / imgH;
        const maxDraw = (badgeRadius - 4) * 2;

        let drawW, drawH;
        if (imgRatio >= 1) {
            drawW = maxDraw;
            drawH = maxDraw / imgRatio;
        } else {
            drawH = maxDraw;
            drawW = maxDraw * imgRatio;
        }
        ctx.drawImage(logoImg, logoCenterX - drawW / 2, logoCenterY - drawH / 2, drawW, drawH);
        ctx.restore();
    }
}


function drawCameraCorners(ctx, x, y, width, height, len = 38, radius = 10, strokeWidth = 4.5, strokeColor = '#ef2b9d') {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Góc trên trái
    ctx.beginPath();
    ctx.moveTo(x, y + len);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.lineTo(x + len, y);
    ctx.stroke();

    // Góc trên phải
    ctx.beginPath();
    ctx.moveTo(x + width - len, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + len);
    ctx.stroke();

    // Góc dưới trái
    ctx.beginPath();
    ctx.moveTo(x, y + height - len);
    ctx.lineTo(x, y + height - radius);
    ctx.arcTo(x, y + height, x + radius, y + height, radius);
    ctx.lineTo(x + len, y + height);
    ctx.stroke();

    // Góc dưới phải
    ctx.beginPath();
    ctx.moveTo(x + width - len, y + height);
    ctx.lineTo(x + width - radius, y + height);
    ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
    ctx.lineTo(x + width, y + height - len);
    ctx.stroke();

    ctx.restore();
}


function drawPosterText(ctx, text, centerX, startY, maxWidth, lineHeight, maxLines = 2) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    words.forEach(word => {
        const candidate = current ? `${current} ${word}` : word;
        if (current && ctx.measureText(candidate).width > maxWidth) {
            lines.push(current);
            current = word;
        } else current = candidate;
    });
    if (current) lines.push(current);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) {
        let last = visible[visible.length - 1];
        while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
        visible[visible.length - 1] = `${last}…`;
    }
    visible.forEach((line, index) => ctx.fillText(line, centerX, startY + index * lineHeight));
    return visible.length;
}


function trimQrWhitespace(img) {
    try {
        const memCanvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width || 360;
        const h = img.naturalHeight || img.height || 360;
        memCanvas.width = w;
        memCanvas.height = h;
        const mCtx = memCanvas.getContext('2d');
        if (!mCtx) return img;
        mCtx.drawImage(img, 0, 0, w, h);
        const imgData = mCtx.getImageData(0, 0, w, h);
        const d = imgData.data;
        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const r = d[idx], g = d[idx + 1], b = d[idx + 2], a = d[idx + 3];
                // Điểm tối (module đen của QR code: r,g,b < 210 và a > 100)
                if (a > 100 && (r < 210 || g < 210 || b < 210)) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX > minX && maxY > minY) {
            const cropW = maxX - minX + 1;
            const cropH = maxY - minY + 1;
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropW;
            croppedCanvas.height = cropH;
            const cCtx = croppedCanvas.getContext('2d');
            cCtx.drawImage(memCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
            return croppedCanvas;
        }
    } catch (e) {
        console.warn('Không thể cắt viền trắng QR:', e);
    }
    return img;
}


function add300DpiToPngBlob(blob) {
    return blob.arrayBuffer().then((buffer) => {
        const bytes = new Uint8Array(buffer);
        if (bytes[0] !== 0x89 || bytes[1] !== 0x50) return blob;
        const insertPos = 33;
        // pHYs chunk: length (9), 'pHYs', x (11811 dpm), y (11811 dpm), unit (1: meter), CRC32
        const physChunk = new Uint8Array([
            0x00, 0x00, 0x00, 0x09,
            0x70, 0x48, 0x59, 0x73,
            0x00, 0x00, 0x2E, 0x23,
            0x00, 0x00, 0x2E, 0x23,
            0x01,
            0x78, 0xA5, 0x3F, 0x76
        ]);
        const newBytes = new Uint8Array(bytes.length + physChunk.length);
        newBytes.set(bytes.subarray(0, insertPos), 0);
        newBytes.set(physChunk, insertPos);
        newBytes.set(bytes.subarray(insertPos), insertPos + physChunk.length);
        return new Blob([newBytes], { type: 'image/png' });
    }).catch(() => blob);
}


function getBilingualQrLabel(label, explicitEn = '') {
    if (explicitEn && explicitEn.trim()) return { vi: label, en: explicitEn.trim() };
    if (!label) return { vi: '', en: '' };
    const raw = String(label).trim();
    if (!raw) return { vi: '', en: '' };

    if (raw.includes('•') || raw.includes('/') || raw.includes(' - ')) {
        return { vi: raw, en: '' };
    }

    const patterns = [
        { regex: /^(?:bàn|ban)\s*([0-9a-zA-Z\-_]+)$/i, en: (m) => `Table ${m[1]}` },
        { regex: /^(?:phòng|phong)\s*([0-9a-zA-Z\-_]+)$/i, en: (m) => `Room ${m[1]}` },
        { regex: /^(?:phòng|phong)\s*vip$/i, en: () => 'VIP Room' },
        { regex: /^(?:phòng|phong)\s*họp$/i, en: () => 'Meeting Room' },
        { regex: /^(?:lầu|tầng|tang|lau)\s*([0-9a-zA-Z\-_]+)$/i, en: (m) => `Floor ${m[1]}` },
        { regex: /^(?:khu|khu\s*vực)\s*([0-9a-zA-Z\-_]+)$/i, en: (m) => `Area ${m[1]}` },
        { regex: /^khu\s*vip$/i, en: () => 'VIP Area' },
        { regex: /^(?:ghế|ghe)\s*([0-9a-zA-Z\-_]+)$/i, en: (m) => `Seat ${m[1]}` },
        { regex: /^(?:ô|o|chòi|choi)\s*([0-9a-zA-Z\-_]+)$/i, en: (m) => `Booth ${m[1]}` },
        { regex: /^(?:quầy\s*)?lễ\s*tân$/i, en: () => 'Reception Desk' },
        { regex: /^nhà\s*hàng$/i, en: () => 'Restaurant' },
        { regex: /^(?:quán\s*)?bar$/i, en: () => 'Bar' },
        { regex: /^(?:quầy\s*)?pha\s*chế$/i, en: () => 'Bar Counter' },
        { regex: /^(?:quầy\s*)?thu\s*ngân$/i, en: () => 'Cashier Counter' },
        { regex: /^hồ\s*bơi$/i, en: () => 'Swimming Pool' },
        { regex: /^bãi\s*biển$/i, en: () => 'Beach' },
        { regex: /^sân\s*thượng$/i, en: () => 'Rooftop' },
        { regex: /^sân\s*vườn$/i, en: () => 'Garden' },
        { regex: /^ban\s*công$/i, en: () => 'Balcony' },
        { regex: /^sảnh(?:\s*chính)?$/i, en: () => 'Main Lobby' },
        { regex: /^(?:lối\s*vào|cổng\s*chính|cửa\s*vào)$/i, en: () => 'Main Entrance' },
        { regex: /^(?:thực\s*đơn|menu)$/i, en: () => 'Menu' },
        { regex: /^mang\s*về$/i, en: () => 'Takeaway' },
        { regex: /^giao\s*hàng$/i, en: () => 'Delivery' },
    ];

    for (const p of patterns) {
        const m = raw.match(p.regex);
        if (m) {
            return { vi: raw, en: p.en(m) };
        }
    }

    return { vi: raw, en: '' };
}

function getBilingualAgentName(name, explicitEn = '') {
    if (explicitEn && explicitEn.trim()) return { vi: name, en: explicitEn.trim() };
    const raw = String(name || '').trim();
    if (!raw) return { vi: 'Pastie Chat Partner', en: 'Pastie Chat Partner' };

    const removeTone = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

    const businessTypes = [
        { regex: /^(?:hộ\s*kinh\s*doanh|hkd)\s+(.+)$/i, suffix: 'Business' },
        { regex: /^nhà\s*hàng\s+(.+)$/i, suffix: 'Restaurant' },
        { regex: /^khách\s*sạn\s+(.+)$/i, suffix: 'Hotel' },
        { regex: /^khu\s*nghỉ\s*dưỡng\s+(.+)$/i, suffix: 'Resort' },
        { regex: /^(?:quán\s*cà\s*phê|cà\s*phê|cafe|coffee)\s+(.+)$/i, suffix: 'Coffee' },
        { regex: /^tiệm\s*bánh\s+(.+)$/i, suffix: 'Bakery' },
        { regex: /^tiệm\s*kem\s+(.+)$/i, suffix: 'Ice Cream' },
        { regex: /^quán\s*ăn\s+(.+)$/i, suffix: 'Eatery' },
        { regex: /^quán\s*bar\s+(.+)$/i, suffix: 'Bar & Lounge' },
        { regex: /^spa\s+(.+)$/i, suffix: 'Spa' },
        { regex: /^(?:cửa\s*hàng|tiệm)\s+(.+)$/i, suffix: 'Store' },
        { regex: /^công\s*ty\s+(.+)$/i, suffix: 'Company' },
        { regex: /^siêu\s*thị\s+(.+)$/i, suffix: 'Supermarket' },
    ];

    for (const bt of businessTypes) {
        const m = raw.match(bt.regex);
        if (m) {
            const properName = removeTone(m[1].trim());
            return { vi: raw, en: `${properName} ${bt.suffix}` };
        }
    }

    const hasDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(raw);
    if (hasDiacritics) {
        return { vi: raw, en: removeTone(raw) };
    }

    return { vi: raw, en: raw };
}

async function createBrandedQrPoster(imageUrl, options = {}) {
    if (typeof options === 'string') {
        options = { businessName: options };
    }
    const {
        businessName = '',
        businessNameEn = '',
        qrLabel = '',
        qrLabelEn = '',
        agentLogoUrl = '',
        style = 'cobranded',
        chatUrl = '',
    } = options;
    const qrText = chatUrl || extractQrText(imageUrl);

    if (document.fonts?.load) {
        // Giới hạn thời gian đợi font tối đa 60ms để vẽ poster tức thì mà không bị đơ trình duyệt
        await Promise.race([
            Promise.allSettled([
                document.fonts.load('700 18px "Be Vietnam Pro"'),
                document.fonts.load('600 18px "Be Vietnam Pro"'),
                document.fonts.load('italic 600 18px "Nunito"'),
            ]),
            new Promise(resolve => setTimeout(resolve, 60))
        ]);
    }

    const hasLogoCandidate = (style === 'cobranded') && isValidImageUrl(agentLogoUrl);
    // Khi đã có window.QRCode (được bundle sẵn cục bộ), thuật toán vector vẽ trực tiếp trong bộ nhớ CPU (<3ms),
    // không phải gửi HTTP request qua QuickChart trên internet (tiết kiệm 1-2 giây độ trễ mạng)
    const qrImagePromise = window.QRCode ? Promise.resolve(null) : loadPosterImage(imageUrl).catch(() => null);

    const [qrImage, logoImage, agentLogoImage] = await Promise.all([
        qrImagePromise,
        loadPosterImage('/pastie-chat-biz-compact.png').catch(() => null),
        hasLogoCandidate ? loadPosterImage(agentLogoUrl).catch(() => null) : Promise.resolve(null),
    ]);

    const hasAgentLogo = Boolean(style === 'cobranded' && agentLogoImage);
    const trimmedQr = qrImage ? trimQrWhitespace(qrImage) : null;

    // Xuất ảnh độ nét cao 2160x2160 (scale 2x) chuẩn in ấn 300 DPI
    const scale = 2;
    const baseW = 1080;
    const baseH = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = baseW * scale;
    canvas.height = baseH * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ tạo ảnh QR.');
    ctx.scale(scale, scale);
    const posterFont = '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
    const sloganFont = '"Nunito", "Be Vietnam Pro", "Segoe UI", sans-serif';

    // 1. Nền canvas tổng & Khung viền poster
    ctx.fillStyle = '#f6f2f7';
    ctx.fillRect(0, 0, baseW, baseH);

    const frameMargin = 32;
    const frameX = frameMargin;
    const frameY = frameMargin;
    const frameW = baseW - frameMargin * 2;   // 1016px
    const frameH = baseH - frameMargin * 2;  // 1016px
    const frameR = 26;

    // Đổ bóng mềm tạo độ sâu không gian
    ctx.save();
    ctx.shadowColor = 'rgba(201, 12, 108, 0.08)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    drawPosterRoundedRect(ctx, frameX, frameY, frameW, frameH, frameR);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Nền trắng và gradient chuyển sắc tinh tế
    ctx.save();
    drawPosterRoundedRect(ctx, frameX, frameY, frameW, frameH, frameR);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const topGradient = ctx.createLinearGradient(frameX, frameY, frameX, frameY + 300);
    topGradient.addColorStop(0, '#fff3f8');
    topGradient.addColorStop(0.6, '#fffcf7');
    topGradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = topGradient;
    ctx.fillRect(frameX, frameY, frameW, 300);

    // Dải viền chuyển màu accent trên đỉnh
    const accent = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY);
    accent.addColorStop(0, '#ef2b9d');
    accent.addColorStop(0.5, '#c90c6c');
    accent.addColorStop(1, '#f59e0b');
    ctx.fillStyle = accent;
    ctx.fillRect(frameX, frameY, frameW, 8);
    ctx.restore();

    // Viền khung poster
    ctx.strokeStyle = '#f0d9e7';
    ctx.lineWidth = 1.5;
    drawPosterRoundedRect(ctx, frameX, frameY, frameW, frameH, frameR);
    ctx.stroke();

    // 2. Header thương hiệu (Co-branded: Logo khách chuyển vô giữa; Standard: Logo Pastie Chat ở giữa)
    const logoY = frameY + 28;
    const logoH = 96;
    const logoBottom = logoY + logoH;

    if (style === 'cobranded') {
        // Logo khách chuyển vô giữa (Agent / Khách hàng là thương hiệu chính ở đỉnh)
        if (hasAgentLogo) {
            const aNaturalW = agentLogoImage.naturalWidth || 100;
            const aNaturalH = agentLogoImage.naturalHeight || 100;
            const aRatio = aNaturalW / aNaturalH;
            const aHeight = 92;
            const aWidth = aHeight * aRatio;
            const maxAWidth = 520;
            const finalAWidth = Math.min(aWidth, maxAWidth);
            const finalAHeight = finalAWidth / aRatio;
            const aX = (baseW - finalAWidth) / 2; // Căn giữa tuyệt đối
            const aY = logoY + (logoH - finalAHeight) / 2;

            ctx.drawImage(agentLogoImage, aX, aY, finalAWidth, finalAHeight);
        } else {
            // Khi khách chưa có logo: hiển thị chữ LOGO căn giữa
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#b62b70';
            ctx.font = `800 74px ${posterFont}`;
            ctx.fillText('LOGO', baseW / 2, logoY + logoH / 2);
            ctx.restore();
        }
    } else {
        const pHeight = 96;
        const pWidth = pHeight * (logoImage.naturalWidth / logoImage.naturalHeight);
        ctx.drawImage(logoImage, (baseW - pWidth) / 2, frameY + 24, pWidth, pHeight);
    }

    // 3. Quy chuẩn 3 size chữ:
    // 3. Quy chuẩn nội dung và bố cục:
    // - Tên Agent: Chỉ sử dụng Tiếng Anh theo yêu cầu ("Tên agent chỉ cần tiếng anh bỏ tiếng việt đi")
    const agentNameEnOnly = (businessNameEn && businessNameEn.trim()) ? businessNameEn.trim() : (businessName || '').trim();
    const qrBilingual = getBilingualQrLabel(qrLabel, qrLabelEn);
    const hasCustomLabel = Boolean(qrLabel && qrLabel.trim() && qrLabel.trim() !== businessName.trim());

    // Chân trang bản quyền (Size 3: 13px)
    const footerY = frameY + frameH - 24;

    // Khối 5: Thanh hướng dẫn camera đặt xuống dưới gần license theo yêu cầu ("phần hướng dẫn cho xuông dưới gần lisence hơn")
    const pillH2 = 42;
    const pillW2 = 680;
    const pillX2 = (baseW - pillW2) / 2;
    const pillY2 = footerY - 58;

    // Chiều cao từng khối:
    // Khối 1: Tên Agent & Tên QR cùng nằm trong khối nền hồng theo yêu cầu ("tên Agent và phần tên Qr cho vào khôi nền hông luôn")
    const h1 = hasCustomLabel ? 110 : 64;

    // Khối 2: Slogan song ngữ (2 dòng 18px)
    const h2 = 48;

    // Khối 3: Mã QR Speech Bubble (Giảm size QR lại từ 380 xuống 310 theo yêu cầu)
    const qrSize = 310;
    const h3 = qrSize;

    // Khối 4: Lời kêu gọi quét mã song ngữ (Tăng size bằng size Agent: 36px / 26px)
    const h4 = 84;

    // Phân bổ đều khoảng cách trong không gian từ logo đến thanh hướng dẫn
    const contentTop = logoBottom;
    const contentBottom = pillY2 - 24;
    const availableSpace = contentBottom - contentTop;
    const totalContentH = h1 + h2 + h3 + h4;
    const equalGap = Math.max(16, (availableSpace - totalContentH) / 5);

    const y1 = contentTop + equalGap;
    const y2 = y1 + h1 + equalGap;
    const y3 = y2 + h2 + equalGap;
    const y4 = y3 + h3 + equalGap;

    ctx.textAlign = 'center';

    // Khối 1: KHỐI NỀN HỒNG CHỨA CẢ TÊN AGENT VÀ TÊN QR
    const qrDisplayText = hasCustomLabel
        ? (qrBilingual.en ? `${qrBilingual.vi} • ${qrBilingual.en}` : qrBilingual.vi)
        : '';

    ctx.font = `800 32px ${posterFont}`;
    const textW1 = ctx.measureText(agentNameEnOnly).width;
    ctx.font = `800 28px ${posterFont}`;
    const textW2 = hasCustomLabel ? ctx.measureText(qrDisplayText).width : 0;

    const boxW = Math.min(Math.max(textW1, textW2) + 72, 860);
    const boxH = h1;
    const boxX = (baseW - boxW) / 2;
    const boxY = y1;
    const boxR = hasCustomLabel ? 26 : 32;

    // Nền hồng phấn cao cấp
    ctx.fillStyle = '#fff2f7';
    drawPosterRoundedRect(ctx, boxX, boxY, boxW, boxH, boxR);
    ctx.fill();

    // Viền hồng tinh tế
    ctx.strokeStyle = '#f3c4db';
    ctx.lineWidth = 1.5;
    drawPosterRoundedRect(ctx, boxX, boxY, boxW, boxH, boxR);
    ctx.stroke();

    if (hasCustomLabel) {
        // Dòng 1: Tên Agent (32px)
        ctx.fillStyle = '#201424';
        ctx.font = `800 32px ${posterFont}`;
        drawPosterText(ctx, agentNameEnOnly, baseW / 2, boxY + 44, boxW - 32, 38, 1);

        // Dòng 2: Tên QR (28px - hồng thương hiệu đậm)
        ctx.fillStyle = '#c90c6c';
        ctx.font = `800 28px ${posterFont}`;
        drawPosterText(ctx, qrDisplayText, baseW / 2, boxY + 86, boxW - 32, 34, 1);
    } else {
        // Chỉ có Tên Agent căn giữa khối hồng
        ctx.fillStyle = '#201424';
        ctx.font = `800 34px ${posterFont}`;
        drawPosterText(ctx, agentNameEnOnly, baseW / 2, boxY + 43, boxW - 32, 40, 1);
    }

    // 4. Khối 2: Slogan nhận diện song ngữ (18px / 18px - FONT NUNITO ITALIC)
    ctx.fillStyle = '#000000';
    ctx.font = `italic 700 18px ${sloganFont}`;
    ctx.fillText('Không rào cản ngôn ngữ, thấu hiểu mọi khách hàng', baseW / 2, y2 + 16);

    ctx.fillStyle = '#000000';
    ctx.font = `italic 600 18px ${sloganFont}`;
    ctx.fillText('No language barriers • Understand every customer', baseW / 2, y2 + 42);

    // 5. Khối 3: Mã QR Bong bóng thoại Speech Bubble trực tiếp (ĐÃ BỎ VIỀN THẺ XUNG QUANH & BỎ LOGO Ở GIỮA)
    const qrX = (baseW - qrSize) / 2;
    const qrY = y3;
    drawStyledVectorQrCode(ctx, qrText, qrX, qrY, qrSize, qrSize, {
        centerLogoImage: null, // Bỏ logo ở giữa theo yêu cầu ("bỏ logo ở giữa")
        fallbackImage: trimmedQr
    });

    // 6. Khối 4: Lời kêu gọi quét mã song ngữ (SIZE BẰNG SIZE AGENT: 36px / 26px)
    ctx.fillStyle = '#201424';
    ctx.font = `800 36px ${posterFont}`;
    ctx.fillText('Quét mã để bắt đầu trò chuyện', baseW / 2, y4 + 32);

    ctx.fillStyle = '#5a4658';
    ctx.font = `700 26px ${posterFont}`;
    ctx.fillText('Scan to start a chat', baseW / 2, y4 + 72);

    // 7. Khối 5: Thanh hướng dẫn thao tác camera song ngữ (Đặt sát gần license phía dưới)
    // Gradient nền cho pill hướng dẫn
    const pillGrad = ctx.createLinearGradient(pillX2, pillY2, pillX2 + pillW2, pillY2);
    pillGrad.addColorStop(0, '#fff2f8');
    pillGrad.addColorStop(1, '#fff7fc');
    ctx.fillStyle = pillGrad;
    drawPosterRoundedRect(ctx, pillX2, pillY2, pillW2, pillH2, 21);
    ctx.fill();

    ctx.strokeStyle = '#f2cadf';
    ctx.lineWidth = 1.5;
    drawPosterRoundedRect(ctx, pillX2, pillY2, pillW2, pillH2, 21);
    ctx.stroke();

    ctx.fillStyle = '#b62b70';
    ctx.font = `700 18px ${posterFont}`;
    ctx.fillText('Mở Camera / Open Camera  •  Hướng vào QR / Point at QR', baseW / 2, pillY2 + 27);

    // 8. Khối 6: Chân trang bản quyền (Size 3: 13px)
    // Với Co-branded: Logo Pastie Chat nhỏ bằng size chỗ license (~16px), nằm cạnh license
    const licenseText = 'Vận hành bởi Pastie  •  Powered by Pastie';
    ctx.font = `500 13px ${posterFont}`;
    ctx.fillStyle = '#8f7d91';

    if (style === 'cobranded' && logoImage) {
        const pFooterH = 16;
        const pRatio = (logoImage.naturalWidth || 1280) / (logoImage.naturalHeight || 286);
        const pFooterW = pFooterH * pRatio;
        const textW = ctx.measureText(licenseText).width;
        const gap = 10;
        const totalFooterW = pFooterW + gap + textW;
        const startX = (baseW - totalFooterW) / 2;
        const logoY = footerY - pFooterH / 2;

        ctx.drawImage(logoImage, startX, logoY, pFooterW, pFooterH);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(licenseText, startX + pFooterW + gap, footerY);
    } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(licenseText, baseW / 2, footerY);
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
            if (!blob) return reject(new Error('Không thể xuất poster QR.'));
            try {
                const highDpiBlob = await add300DpiToPngBlob(blob);
                resolve(highDpiBlob);
            } catch {
                resolve(blob);
            }
        }, 'image/png', 1.0);
    });
}


function downloadPosterBlob(blob, label, style = 'poster') {
    const safeName = String(label || 'pastie-qr')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'pastie-qr';
    const filename = `${safeName}-${style}.png`;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = !!navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if ((isIOS || isStandalone || isMobile) && typeof navigator.share === 'function') {
        try {
            const file = new File([blob], filename, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: filename }).catch(() => {});
                return;
            }
        } catch (e) {}
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}


function closeQrPreview() {
    qrPreviewModal?.classList.add('hide');
    if (typeof activeQrPreviewState !== 'undefined') activeQrPreviewState = null;
    if (qrPreviewImage) {
        qrPreviewImage.removeAttribute('src');
        qrPreviewImage.classList.add('is-hidden');
    }
    const loader = document.getElementById('qr-poster-loader');
    if (loader) loader.classList.remove('is-hidden');
    if (qrPreviewPosterUrl) {
        URL.revokeObjectURL(qrPreviewPosterUrl);
        qrPreviewPosterUrl = '';
    }
}


function setOrgStatus(message, kind) {
    const el = document.getElementById('org-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('hide', !message);
    el.classList.toggle('is-error', kind === 'error');
    if (kind === 'error' && message) {
        toastError(message);
    }
}


async function orgFetch(path, options) {
    const response = await authFetch(`${API_BASE}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Thao tác không thành công.');
    return data;
}


// Gom giờ bắt đầu/kết thúc thành mảng khung giờ mà API mong đợi.
function orgHourWindows(startId, endId) {
    const start = document.getElementById(startId)?.value;
    const end = document.getElementById(endId)?.value;
    if (!start || !end) return [];
    return [{ start_time: start, end_time: end }];
}


function formatHourWindows(windows) {
    if (!Array.isArray(windows) || windows.length === 0) return 'Cả ngày';
    return windows
        .map((w) => `${String(w.start_time).slice(0, 5)}–${String(w.end_time).slice(0, 5)}`)
        .join(', ');
}


window._ORG_TAB_LOADED = window._ORG_TAB_LOADED || {};
window._ORG_CACHE_TIMESTAMP = window._ORG_CACHE_TIMESTAMP || {};
const ORG_TAB_CACHE_TTL = 45000; // 45 giây cache đệm cho các tab quản trị

function isOrgTabFresh(name) {
    const ts = window._ORG_CACHE_TIMESTAMP[name];
    return Boolean(ts && (Date.now() - ts < ORG_TAB_CACHE_TTL));
}

function invalidateOrgTabCache(name) {
    if (name) {
        delete window._ORG_CACHE_TIMESTAMP[name];
    } else {
        window._ORG_CACHE_TIMESTAMP = {};
    }
}
window.invalidateOrgTabCache = invalidateOrgTabCache;

// ─── DANH MỤC NHÃN SẢN PHẨM (chỉ Superadmin) ───────────────────────────────
//
// Hiện đủ CÁC BẢN DỊCH của từng nhãn, không chỉ nhãn tiếng Việt: nhãn được dịch
// máy lúc lưu, nên người cấu hình phải nhìn thấy máy dịch ra cái gì. Không nhìn
// được thì một bản dịch sai nằm trên góc ảnh sản phẩm suốt nhiều tháng.
window.ORG_TAGS = [];

async function loadOrgTags(silent = false) {
    const box = document.getElementById('org-tag-list');
    const badge = document.getElementById('org-tag-count-badge');
    if (!box) return;
    if (!silent && !box.children.length) box.innerHTML = '<p class="org-empty">Đang tải…</p>';
    // Nạp danh mục ảnh trước khi vẽ: lưới chọn kiểu text nằm trong form ngay
    try { await loadBadgeCatalog?.(); veLuoiBadge?.(); veKhungBadge?.(); await loadBadgeGallery?.(); } catch (_) {}
    try {
        const data = await orgFetch('/api/superadmin/menu-tags');
        window.ORG_TAGS = data.tags || [];
        try { await loadBadgeGallery?.(); } catch (_) {}
        if (badge) badge.textContent = String(window.ORG_TAGS.length);
        box.innerHTML = window.ORG_TAGS.length ? window.ORG_TAGS.map((tag) => {
            const dich = (tag.translations || []).filter((t) => t && t.lang && t.label);
            return `
            <article class="org-item tag-card${tag.is_active ? '' : ' is-off'}">
                <div class="tag-card-head">
                    <!-- Vẽ ĐÚNG badge khách sẽ thấy, không phải một viên chip chung
                         chung: danh mục này quyết định hình dáng trên góc ảnh sản
                         phẩm, nên danh sách phải cho nhìn ra ngay nhãn nào hình gì. -->
                    ${tag.badge_code
                        ? `<img class="tag-card-badge" loading="lazy"
                             src="${escapeHtml(badgeImgUrl(tag.badge_style || 'vuong', tag.badge_code))}"
                             alt="${escapeHtml(tag.label)}">`
                        : `<span class="menu-badge is-${escapeHtml(tag.badge_style || 'vuong')}" style="--badge-bg:${escapeHtml(tag.color_bg)};--badge-text:${escapeHtml(tag.color_text)}"><span>${escapeHtml(tag.label)}</span></span>`}
                    <span class="tag-code">${escapeHtml(tag.code)}</span>
                    <span class="tag-usage">${Number(tag.item_count) || 0} sản phẩm</span>
                </div>
                <div class="tag-langs">
                    ${dich.length
                        ? dich.map((t) => `<span class="tag-lang${t.is_manual ? ' is-manual' : ''}" title="${t.is_manual ? 'Đã sửa tay — máy dịch không ghi đè' : 'Máy dịch'}"><b>${escapeHtml(t.lang)}</b> ${escapeHtml(t.label)}</span>`).join('')
                        : '<span class="tag-lang is-missing">Chưa có bản dịch nào</span>'}
                </div>
                <div class="tag-actions">
                    <button type="button" class="sale-btn-edit" data-tag-edit="${tag.id}"><i class="ri-edit-line"></i> Sửa</button>
                    <button type="button" class="org-toggle ${tag.is_active ? 'is-active' : 'is-locked'}" data-tag-toggle="${tag.id}" data-active="${tag.is_active}">
                        <i class="${tag.is_active ? 'ri-eye-line' : 'ri-eye-off-line'}"></i>
                        <span>${tag.is_active ? 'Đang dùng' : 'Đã tắt'}</span>
                    </button>
                    <button type="button" class="org-remove" data-tag-delete="${tag.id}" title="Xoá nhãn"><i class="ri-delete-bin-line"></i></button>
                </div>
            </article>`;
        }).join('') : '<p class="org-empty">Chưa có nhãn nào. Tạo nhãn đầu tiên ở form phía trên.</p>';
        try { await loadBadgeGallery?.(); } catch (_) {}
    } catch (error) {
        box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
    }
}

function switchOrgTab(name) {
    window.closeAddBoxModal?.();
    document.querySelectorAll('[data-org-tab]').forEach((tab) => {
        tab.classList.toggle('is-active', tab.dataset.orgTab === name);
    });
    document.querySelectorAll('[data-org-pane]').forEach((pane) => {
        pane.classList.toggle('hide', pane.dataset.orgPane !== name);
    });
    setOrgStatus('');

    const isFresh = isOrgTabFresh(name);
    const hasLoadedBefore = Boolean(window._ORG_TAB_LOADED[name]);
    window._ORG_TAB_LOADED[name] = true;

    // Chuyển tab tức thì 0ms, không bắn request mạng lặp lại nếu dữ liệu còn hạn cache
    if (isFresh && hasLoadedBefore) return;

    // Nếu dữ liệu đã nạp nhưng quá hạn, chạy ngầm revalidate mà không hiện spinner
    const isSilent = hasLoadedBefore;

    if (name === 'agents') void loadOrgAgents(isSilent);
    if (name === 'sales') void loadOrgSales(isSilent);
    if (name === 'groups') void loadOrgGroups(false, isSilent);
    if (name === 'qr') void loadOrgQr(isSilent);
    if (name === 'tags') void loadOrgTags(isSilent);
    // Sản phẩm nằm ở menu-console.js — mảnh đầu tiên của QR Console tách riêng.
    if (name === 'menu') {
        void window.MenuConsole?.load(isSilent);
        void loadAgentMenuSettings();
    }
}


function openOrgModal(targetTab) {
    window.closeAddBoxModal?.();
    initShiftSelects(); // dựng danh sách giờ 24h ở lần mở đầu tiên
    // Hai màn hình tách bạch, không chồng lấn:
    //   Superadmin -> chỉ thẻ Agent (tạo Agent + đặt trần số Sale).
    //   Agent quản lý -> Sale / Nhóm / QR, tự sắp xếp tổ chức của mình.
    // Superadmin cố tình KHÔNG thiết lập thay Agent; backend cũng trả 403.
    const isSuper = CURRENT_ADMIN?.role === 'superadmin';
    if (targetTab === 'tags') {
        // Khi mở Danh mục Badge/Nhãn: ẩn hẳn tab Agent, chỉ hiện Nhãn sản phẩm
        document.querySelector('[data-org-tab="agents"]')?.classList.add('hide');
        document.querySelector('[data-org-tab="tags"]')?.classList.remove('hide');
    } else {
        document.querySelector('[data-org-tab="agents"]')?.classList.toggle('hide', !isSuper);
        document.querySelector('[data-org-tab="tags"]')?.classList.add('hide');
    }
    ['sales', 'groups', 'qr', 'menu'].forEach((name) => {
        document.querySelector(`[data-org-tab="${name}"]`)?.classList.toggle('hide', isSuper);
    });
    const title = document.getElementById('org-title');
    if (title) {
        if (targetTab === 'tags') {
            title.textContent = 'Danh mục Nhãn & Badge sản phẩm';
        } else {
            title.textContent = isSuper ? 'Quản lý Agent' : 'Quản lý Sale, nhóm, QR và sản phẩm';
        }
    }
    const kicker = document.getElementById('org-kicker');
    if (kicker) kicker.textContent = targetTab === 'tags' ? 'DANH MỤC HỆ THỐNG' : 'PHÂN CẤP TỔ CHỨC';

    if (isSuper) {
        const select = document.getElementById('org-agent-project');
        if (select) {
            const qrProjects = (PROJECTS || []).filter((project) => project.project_type === 'qr_concierge');
            // Một dự án QR duy nhất là trường hợp thường gặp: chọn sẵn rồi ẩn ô đi,
            // đỡ một dòng vô nghĩa trong form (và một hàng nữa trên màn hình hẹp).
            document.getElementById('org-agent-project-field')?.classList.toggle('hide', qrProjects.length <= 1);
            select.innerHTML = qrProjects.length
                ? qrProjects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name || project.id)}</option>`).join('')
                : '<option value="">Chưa có dự án QR Concierge</option>';
        }
    }

    document.getElementById('org-modal')?.classList.remove('hide');
    const defaultTab = targetTab || (isSuper ? 'agents' : 'sales');
    switchOrgTab(defaultTab);

    // PREFETCH TOÀN BỘ CÁC TAB CÒN LẠI TRONG NỀN (ZERO-LATENCY COLD SWITCH)
    // Tải song song ngầm để khi người dùng click sang Nhóm, Mã QR hay Sản phẩm thì dữ liệu đã có sẵn 0ms
    if (!isSuper) {
        if (!isOrgTabFresh('groups')) {
            void loadOrgGroups(false, true).catch(() => {});
        }
        if (!isOrgTabFresh('qr')) {
            void loadOrgQr(true).catch(() => {});
        }
        if (!isOrgTabFresh('menu')) {
            void window.MenuConsole?.load(true).catch(() => {});
            void loadAgentMenuSettings().catch(() => {});
        }
    }
}


function closeOrgModal() {
    window.closeAddBoxModal?.();
    document.getElementById('org-modal')?.classList.add('hide');
}
window.openOrgModal = openOrgModal;
window.closeOrgModal = closeOrgModal;


// --- Agent -------------------------------------------------------------------

async function loadOrgAgents(isSilent = false) {
    const box = document.getElementById('org-agent-list');
    const badge = document.getElementById('org-agent-count-badge');
    if (!box) return;
    if (!isSilent && (!window.ORG_AGENTS_CACHE || window.ORG_AGENTS_CACHE.length === 0)) {
        box.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải danh sách Agent…</p>';
    }
    try {
        const agents = await orgFetch('/api/superadmin/agents');
        window.ORG_AGENTS_CACHE = agents;
        window._ORG_CACHE_TIMESTAMP['agents'] = Date.now();
        window._ORG_TAB_LOADED['agents'] = true;
        if (badge) badge.textContent = `${agents.length} Agent`;

        // Render Guard: tránh vẽ lại DOM nếu danh sách Agent không đổi
        const agentsHash = JSON.stringify(agents.map(a => [a.id, a.full_name, a.sale_count, a.sale_limit, a.group_count, a.deferred_payment_mode, a.superadmin_menu_disabled, a.is_active]));
        if (box.dataset.renderedHash === agentsHash && box.children.length > 0) {
            return;
        }
        box.dataset.renderedHash = agentsHash;

        box.innerHTML = agents.length ? agents.map((agent) => `
            <article class="org-item">
                <div class="org-item-main">
                    <strong>
                        ${escapeHtml(agent.full_name || agent.username)}
                        <span class="org-shift is-on">${escapeHtml(agent.project_id || 'QR Concierge')}</span>
                    </strong>
                    <small>${escapeHtml(agent.username)}</small>
                    <small><i class="ri-team-line"></i> Đã tạo: <strong>${agent.sale_count}${agent.sale_limit ? '/' + agent.sale_limit : ''} Sale</strong>
                        · <strong>${agent.group_count} nhóm</strong>${agent.sale_limit && agent.sale_count >= agent.sale_limit ? ' · <span style="color:#ef4444;font-weight:700;">Đã hết suất</span>' : ''}</small>
                </div>
                <div class="org-agent-actions">
                    <button type="button" class="org-device-btn" data-agent-devices="${agent.id}" data-agent-name="${escapeHtml(agent.full_name || agent.username)}">
                        <i class="ri-device-line"></i> Thiết bị
                    </button>
                    <label class="org-defer" style="display:flex; flex-direction:column; gap:2px;">
                        <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">Trả chậm (chỉ 1 trong 2)</span>
                        <select data-agent-defer="${agent.id}" title="Chỉ chọn 1 trong 2: Cộng vào tiền phòng hoặc Thanh toán sau">
                            <option value="none"${agent.deferred_payment_mode === 'none' || !agent.deferred_payment_mode ? ' selected' : ''}>Không có (Chỉ trả ngay)</option>
                            <option value="room_charge"${agent.deferred_payment_mode === 'room_charge' ? ' selected' : ''}>Cộng tiền phòng (Room charge)</option>
                            <option value="pay_later"${agent.deferred_payment_mode === 'pay_later' ? ' selected' : ''}>Thanh toán sau (Pay later)</option>
                        </select>
                    </label>
                    <button type="button" class="org-menu-toggle-btn ${agent.superadmin_menu_disabled ? 'is-menu-off' : 'is-menu-on'}" data-agent-menu-toggle="${agent.id}" data-menu-disabled="${agent.superadmin_menu_disabled}" title="Bật/Tắt tính năng thực đơn cho Agent này">
                        <i class="${agent.superadmin_menu_disabled ? 'ri-restaurant-line' : 'ri-restaurant-fill'}"></i> ${agent.superadmin_menu_disabled ? 'Menu: Tắt (SA)' : 'Menu: Bật'}
                    </button>
                    <button type="button" class="org-toggle" data-agent-toggle="${agent.id}" data-active="${agent.is_active}">
                        ${agent.is_active ? '✓ Đang hoạt động' : '✗ Đã khóa'}
                    </button>
                </div>
            </article>`).join('') : '<p class="org-empty">Chưa có Agent nào trong hệ thống.</p>';
    } catch (error) {
        if (badge) badge.textContent = '0 Agent';
        box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
    }
}


// --- Superadmin quản lý thiết bị Agent --------------------------------------
let managedDeviceAgentId = null;

function closeAgentDevicesModal() {
    document.getElementById('agent-devices-modal')?.classList.add('hide');
    managedDeviceAgentId = null;
}

function formatManagedDeviceTime(value) {
    if (!value) return 'Chưa có dữ liệu';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : date.toLocaleString('vi-VN');
}

async function loadAgentDevices(agentId, agentName = '') {
    const modal = document.getElementById('agent-devices-modal');
    const list = document.getElementById('agent-devices-list');
    if (!modal || !list) return;
    managedDeviceAgentId = Number(agentId);
    modal.classList.remove('hide');
    document.getElementById('agent-devices-account').textContent = agentName || `Agent #${agentId}`;
    list.innerHTML = '<p class="agent-devices-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải thiết bị…</p>';
    try {
        const data = await orgFetch(`/api/superadmin/accounts/${agentId}/devices`);
        const account = data.account || {};
        document.getElementById('agent-devices-account').textContent = `${account.full_name || agentName || account.username || `Agent #${agentId}`} · ${account.username || ''}`;
        document.getElementById('agent-device-limit').value = data.limit || 2;
        const activeCount = (data.devices || []).filter((device) => device.status === 'active').length;
        document.getElementById('agent-devices-help').textContent = `${activeCount}/${data.limit} thiết bị đang hoạt động. Hạn mức tính theo mã thiết bị do hệ thống cấp, không theo IP hoặc trình duyệt. Đổi Wi-Fi/4G/5G không tạo thiết bị mới. Lần đổi gần nhất: ${formatManagedDeviceTime(data.lastChangeAt)}.`;
        list.innerHTML = (data.devices || []).length ? data.devices.map((device) => `
            <article class="agent-device-row${device.status !== 'active' ? ' is-revoked' : ''}">
                <span class="agent-device-icon"><i class="${/iphone|android|ipad|mobile/i.test(device.label || '') ? 'ri-smartphone-line' : 'ri-computer-line'}"></i></span>
                <div class="agent-device-copy">
                    <strong>Thiết bị ${escapeHtml(String(device.device_id || device.id || '').slice(-12).toUpperCase())}</strong>
                    <small>Nhãn tham khảo: ${escapeHtml(device.label || 'Không xác định')}</small>
                    <small>Lần đầu: ${escapeHtml(formatManagedDeviceTime(device.first_seen))} · Lần cuối: ${escapeHtml(formatManagedDeviceTime(device.last_seen))}</small>
                    <small>IP truy cập gần nhất (chỉ nhật ký): ${escapeHtml(device.last_ip || 'Không ghi nhận')}</small>
                </div>
                <span class="agent-device-status">${device.status === 'active' ? 'HOẠT ĐỘNG' : 'ĐÃ THU HỒI'}</span>
                ${device.status === 'active' ? `<button type="button" class="agent-device-revoke" data-revoke-device="${device.id}" title="Thu hồi thiết bị"><i class="ri-logout-box-r-line"></i></button>` : ''}
            </article>`).join('') : '<p class="agent-devices-empty">Agent này chưa đăng ký thiết bị nào.</p>';
    } catch (error) {
        list.innerHTML = `<p class="agent-devices-empty">${escapeHtml(error.message)}</p>`;
    }
}

document.getElementById('org-agent-list')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-agent-devices]');
    if (button) void loadAgentDevices(button.dataset.agentDevices, button.dataset.agentName);
});

document.getElementById('agent-devices-close')?.addEventListener('click', closeAgentDevicesModal);
document.getElementById('agent-devices-modal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeAgentDevicesModal();
});

document.getElementById('agent-device-limit-save')?.addEventListener('click', async () => {
    if (!managedDeviceAgentId) return;
    const deviceLimit = Number(document.getElementById('agent-device-limit')?.value);
    if (!Number.isInteger(deviceLimit) || deviceLimit < 1 || deviceLimit > 20) return showToast('Giới hạn phải từ 1 đến 20 thiết bị.', 'error');
    try {
        await orgFetch(`/api/superadmin/accounts/${managedDeviceAgentId}/device-limit`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceLimit }),
        });
        showToast('Đã lưu giới hạn thiết bị.', 'success');
        await loadAgentDevices(managedDeviceAgentId);
    } catch (error) { showToast(error.message, 'error'); }
});

document.getElementById('agent-devices-list')?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-revoke-device]');
    if (!button || !managedDeviceAgentId) return;
    const ok = await pastieConfirm('Thiết bị này sẽ bị đăng xuất ngay. Các thiết bị khác của Agent không bị ảnh hưởng.', { title: 'Thu hồi thiết bị?', confirmText: 'Thu hồi', danger: true });
    if (!ok) return;
    try {
        await orgFetch(`/api/superadmin/accounts/${managedDeviceAgentId}/devices/${button.dataset.revokeDevice}`, { method: 'DELETE' });
        showToast('Đã thu hồi thiết bị.', 'success');
        await loadAgentDevices(managedDeviceAgentId);
    } catch (error) { showToast(error.message, 'error'); }
});

document.getElementById('agent-devices-reset')?.addEventListener('click', async () => {
    if (!managedDeviceAgentId) return;
    const ok = await pastieConfirm('Tất cả thiết bị của Agent sẽ bị thu hồi và mọi phiên đăng nhập hiện tại bị kết thúc.', { title: 'Thu hồi tất cả thiết bị?', confirmText: 'Thu hồi tất cả', danger: true });
    if (!ok) return;
    try {
        await orgFetch(`/api/superadmin/accounts/${managedDeviceAgentId}/devices/reset`, { method: 'POST' });
        showToast('Đã thu hồi toàn bộ thiết bị của Agent.', 'success');
        await loadAgentDevices(managedDeviceAgentId);
    } catch (error) { showToast(error.message, 'error'); }
});


// Superadmin chọn nút thanh toán chậm nào hiện cho khách của một Agent.
//
// Chỉ MỘT trong hai nút được hiện, không bao giờ cả hai: khách sạn dùng "cộng
// tiền phòng", cơ sở lẻ dùng "thanh toán sau". Hiện cả hai thì khách phải hiểu
// sự khác nhau giữa hai thứ vốn là chuyện nội bộ của cơ sở.
//
// Đây cũng là phương thức được TỰ CHỌN nếu khách không bấm gì trong 2 phút sau
// khi nhận bill — nên chọn "Không có" nghĩa là không bao giờ tự chọn thay khách.
async function setAgentDeferredPayment(agentId, mode) {
    try {
        const result = await orgFetch(`/api/admin/agents/${agentId}/deferred-payment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode }),
        });
        const label = { none: 'không có nút trả chậm', room_charge: 'cộng vào tiền phòng', pay_later: 'thanh toán sau' }[mode];
        showToast(`${result.agent?.full_name || 'Agent'}: ${label}.`, 'success');
    } catch (error) {
        showToast(error.message, 'error');
        void loadOrgAgents(true);   // trả ô chọn về đúng giá trị đang lưu
    }
}

// --- Sale --------------------------------------------------------------------

function resetOrgSaleForm() {
    const form = document.getElementById('org-sale-form');
    if (!form) return;
    form.reset();
    const idEl = document.getElementById('org-sale-id');
    if (idEl) idEl.value = '';
    const emailEl = document.getElementById('org-sale-email');
    if (emailEl) {
        emailEl.readOnly = false;
        emailEl.style.opacity = '1';
        emailEl.title = '';
        // Xoá mốc email cũ: bỏ sót thì form thêm Sale mới sẽ so với email của Sale
        // vừa sửa và hỏi nhầm "bạn có muốn đổi email không".
        delete emailEl.dataset.emailGoc;
    }
    const fileEl = document.getElementById('org-sale-avatar-file');
    if (fileEl) fileEl.value = '';
    const nameEl = document.getElementById('org-sale-avatar-filename');
    if (nameEl) nameEl.textContent = 'Chưa chọn ảnh';
    const clearBtn = document.getElementById('org-sale-avatar-clear-btn');
    if (clearBtn) clearBtn.classList.add('hide');
    const previewEl = document.getElementById('org-sale-avatar-preview');
    if (previewEl) previewEl.innerHTML = '<span id="org-sale-avatar-char">S</span>';

    const submitBtn = document.getElementById('org-sale-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="ri-user-add-line"></i> Thêm Sale';
    // Giữ nút Hủy luôn hiện diện để người dùng có thể thoát ra bất cứ lúc nào
    document.getElementById('org-sale-cancel-btn')?.classList.remove('hide');
}


async function loadOrgSales(isSilent = false) {
    const box = document.getElementById('org-sale-list');
    const badge = document.getElementById('org-sale-count-badge');
    const quotaCount = document.getElementById('org-quota-count');
    if (!box) return;
    if (!isSilent && (!window.ORG_SALES || window.ORG_SALES.length === 0)) {
        box.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
    }
    try {
        // Cập nhật lại thông tin CURRENT_ADMIN để lấy sale_limit mới nhất từ server
        try {
            const meRes = await authFetch(`${API_BASE}/api/admin/me`);
            const meData = await meRes.json();
            if (meData?.admin) {
                CURRENT_ADMIN = { ...CURRENT_ADMIN, ...meData.admin };
            }
        } catch (e) {}

        window.ORG_SALES = await orgFetch('/api/agent/sales');
        window._ORG_CACHE_TIMESTAMP['sales'] = Date.now();
        window._ORG_TAB_LOADED['sales'] = true;

        const currentAdminLang = (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('pastie_admin_lang') || 'vi';
        const dict = (window.TRANSLATIONS && window.TRANSLATIONS[currentAdminLang]) || {};

        const count = window.ORG_SALES.length;
        const saleUnit = dict.orgTabSales || 'Sale';
        if (badge) badge.textContent = `${count} ${saleUnit}`;
        if (quotaCount) {
            // Trước đây khi không có trần thì hiện "Hạn mức: 2 (Không giới hạn)" —
            // đọc như thể trần là 2, trong khi 2 là SỐ ĐÃ TẠO. Luôn nói rõ con số
            // nào là gì.
            const limit = CURRENT_ADMIN?.sale_limit;
            const hasLimit = limit !== null && limit !== undefined && limit !== '' && Number.isFinite(Number(limit));
            const usedLabel = dict.orgQuotaUsed || 'Đã tạo';
            const remLabel = dict.orgQuotaRemaining || 'còn';
            const fullLabel = dict.orgQuotaFull || 'đã hết suất';
            const unlimitedLabel = dict.orgQuotaUnlimited || 'không giới hạn';

            if (hasLimit) {
                const left = Math.max(0, Number(limit) - count);
                quotaCount.textContent = left > 0
                    ? `${usedLabel} ${count}/${limit} ${saleUnit} · ${remLabel} ${left}`
                    : `${usedLabel} ${count}/${limit} ${saleUnit} · ${fullLabel}`;
                quotaCount.classList.toggle('is-full', left <= 0);
            } else {
                quotaCount.textContent = `${usedLabel} ${count} ${saleUnit} · ${unlimitedLabel}`;
                quotaCount.classList.remove('is-full');
            }
        }

        // Cập nhật select Sale trong Form Tạo Nhóm
        renderSalePicker(window.ORG_SALES);

        // Render Guard: tránh hủy và dựng lại toàn bộ DOM thẻ Sale nếu dữ liệu không đổi
        const salesHash = `${currentAdminLang}_${JSON.stringify(window.ORG_SALES.map(s => [s.id, s.full_name, s.username, s.avatar_url, s.group_id, s.on_shift, s.work_shift, s.is_active]))}`;
        if (box.dataset.renderedHash === salesHash && box.children.length > 0) {
            return;
        }
        box.dataset.renderedHash = salesHash;

        box.innerHTML = window.ORG_SALES.length ? window.ORG_SALES.map((sale) => `
            <article class="org-item sale-card">
                <div class="sale-card-profile">
                    ${sale.avatar_url 
                        ? `<div class="sale-avatar"><img src="${escapeHtml(sale.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;"></div>`
                        : `<div class="sale-avatar sale-avatar-fallback">${escapeHtml((sale.full_name || 'S').trim().charAt(0).toUpperCase())}</div>`
                    }
                    <div class="sale-info">
                        <div class="sale-name-row">
                            <strong class="sale-name">${escapeHtml(sale.full_name || sale.username)}</strong>
                            <span class="org-shift ${sale.on_shift ? 'is-on' : ''}">${sale.on_shift ? (dict.orgOnShift || 'Trong ca') : (dict.orgOffShift || 'Ngoài ca')}</span>
                        </div>
                        <span class="sale-email">${escapeHtml(sale.username)}</span>
                    </div>
                </div>
                <div class="sale-tags">
                    <span class="sale-tag"><i class="ri-time-line"></i> ${escapeHtml(formatHourWindows(sale.access_hours))}</span>
                    <span class="sale-tag"><i class="ri-team-line"></i> ${(sale.groups || []).map((g) => escapeHtml(g.name)).join(', ') || (dict.orgUnassignedGroup || 'Chưa gán nhóm')}</span>
                </div>
                <div class="sale-actions">
                    <button type="button" class="sale-btn-edit" data-sale-edit="${sale.id}" title="${dict.editBtn || 'Sửa'}">
                        <i class="ri-edit-line"></i> ${dict.editBtn || 'Sửa'}
                    </button>
                    <button type="button" class="org-toggle sale-btn-toggle ${sale.is_active ? 'is-active' : 'is-locked'}" data-sale-toggle="${sale.id}" data-active="${sale.is_active}">
                        <i class="${sale.is_active ? 'ri-checkbox-circle-line' : 'ri-lock-line'}"></i>
                        <span>${sale.is_active ? (dict.orgActive || 'Hoạt động') : (dict.orgLocked || 'Đã khóa')}</span>
                    </button>
                    <button type="button" class="org-remove sale-btn-delete" data-sale-delete="${sale.id}" title="${dict.orgDeleteSale || 'Xóa tài khoản Sale'}">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </article>`).join('') : `<p class="org-empty">${dict.orgNoSales || 'Chưa có tài khoản Sale nào.'}</p>`;
    } catch (error) {
        const currentAdminLang = (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('pastie_admin_lang') || 'vi';
        const dict = (window.TRANSLATIONS && window.TRANSLATIONS[currentAdminLang]) || {};
        if (badge) badge.textContent = `0 ${dict.orgTabSales || 'Sale'}`;
        box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
    }
}


// --- Nhóm --------------------------------------------------------------------

async function loadOrgGroups(quiet, isSilent = false) {
    const box = document.getElementById('org-group-list');
    const badge = document.getElementById('org-group-count-badge');
    const currentAdminLang = (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('pastie_admin_lang') || 'vi';
    const dict = (window.TRANSLATIONS && window.TRANSLATIONS[currentAdminLang]) || {};

    if (!quiet && !isSilent && box && (!window.ORG_GROUPS || window.ORG_GROUPS.length === 0)) {
        box.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
    }
    try {
        if ((window.ORG_SALES || []).length === 0) {
            try { window.ORG_SALES = await orgFetch('/api/agent/sales'); } catch(e) {}
        }
        window.ORG_GROUPS = await orgFetch('/api/agent/groups');
        window._ORG_CACHE_TIMESTAMP['groups'] = Date.now();
        window._ORG_TAB_LOADED['groups'] = true;
        if (badge) badge.textContent = `${window.ORG_GROUPS.length} ${dict.orgGroupCount || 'Nhóm'}`;

        // Cập nhật select Sale trong Form Tạo Nhóm
        renderSalePicker(window.ORG_SALES || []);

        if (box && !quiet) {
            // Render Guard: tránh dựng lại DOM nhóm nếu dữ liệu không đổi
            const groupsHash = `${currentAdminLang}_${JSON.stringify(window.ORG_GROUPS.map(g => [g.id, g.name, g.description, (g.sales || []).map(s => s.sale_id)]))}`;
            if (box.dataset.renderedHash === groupsHash && box.children.length > 0) {
                // Giữ nguyên DOM
            } else {
                box.dataset.renderedHash = groupsHash;
                box.innerHTML = window.ORG_GROUPS.length ? window.ORG_GROUPS.map((group) => {
                    const groupSales = group.sales || [];
                    const groupSaleIds = new Set(groupSales.map(s => Number(s.sale_id)));
                    const notInGroupSales = (window.ORG_SALES || []).filter(s => !groupSaleIds.has(Number(s.id)));

                    const chipsHtml = groupSales.length ? groupSales.map(s => `
                        <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;color:var(--text-primary);">
                            <i class="ri-user-line" style="color:#6366f1;"></i> ${escapeHtml(s.sale_name || s.sale_username)}
                            <button type="button" data-remove-sale="${s.sale_id}" data-from-group="${group.id}" title="Gỡ Sale khỏi nhóm" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:0;display:flex;align-items:center;font-size:13px;line-height:1;"><i class="ri-close-circle-fill"></i></button>
                        </span>
                    `).join('') : `<span style="font-size:11px;color:var(--text-secondary);font-style:italic;">${dict.orgNoSalesInGroup || 'Chưa có Sale nào trong nhóm'}</span>`;

                    const addSaleOptions = notInGroupSales.map(s => `<option value="${s.id}">${escapeHtml(s.full_name || s.username)}</option>`).join('');

                    return `
                    <article class="org-item" style="flex-direction:column;align-items:stretch;gap:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                            <div>
                                <strong style="font-size:13.5px;"><i class="ri-team-line" style="color:var(--accent-color);margin-right:4px;"></i>${escapeHtml(group.name)}</strong>
                                <small style="margin-left:8px;color:var(--text-secondary);">${group.waiting_count} ${dict.orgWaiting || 'chờ'} / ${group.active_count} ${dict.orgChatting || 'đang chat'}</small>
                                ${group.description ? `<p style="margin:2px 0 0 0;font-size:11.5px;color:var(--text-secondary);">${escapeHtml(group.description)}</p>` : ''}
                            </div>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button type="button" class="org-btn-edit" data-group-edit="${group.id}" title="${dict.editBtn || 'Sửa'}" style="background:rgba(99,102,241,0.1);color:#6366f1;border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:4px 8px;font-size:11.5px;cursor:pointer;font-weight:600;"><i class="ri-edit-line"></i> ${dict.editBtn || 'Sửa'}</button>
                                <button type="button" class="org-remove" data-group-delete="${group.id}" title="${dict.deleteBtn || 'Xóa'}"><i class="ri-delete-bin-line"></i></button>
                            </div>
                        </div>

                        <!-- Quản lý thành viên Sale trong nhóm -->
                        <div style="background:rgba(0,0,0,0.025);border:1px solid var(--panel-border);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                                <span style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;">${dict.orgMembers || 'Thành viên'} (${groupSales.length})</span>
                                ${notInGroupSales.length ? `
                                    <select class="org-add-sale-to-group-select" data-group-id="${group.id}" style="font-size:11px;padding:2px 6px;border-radius:5px;background:var(--panel-bg);border:1px solid var(--panel-border);color:var(--text-primary);cursor:pointer;">
                                        <option value="">+ ${dict.orgAddSaleToGroup || 'Thêm Sale vào nhóm...'}</option>
                                        ${addSaleOptions}
                                    </select>
                                ` : `<span style="font-size:10.5px;color:var(--text-secondary);">${dict.orgAllSalesAdded || '(Đã đủ tất cả Sale)'}</span>`}
                            </div>
                            <div style="display:flex;flex-wrap:wrap;gap:6px;">
                                ${chipsHtml}
                            </div>
                        </div>
                    </article>`;
                }).join('') : `<p class="org-empty">${dict.orgNoGroups || 'Chưa có nhóm nào.'}</p>`;
            }
        }

        const groupOptions = (window.ORG_GROUPS || []).map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join('');
        const saleGroupSelect = document.getElementById('org-sale-group');
        if (saleGroupSelect) {
            saleGroupSelect.innerHTML = '<option value="">— Chưa gán nhóm —</option>' + groupOptions;
        }
        const qrGroupSelect = document.getElementById('org-qr-group');
        if (qrGroupSelect) {
            qrGroupSelect.innerHTML = groupOptions || '<option value="">Chưa có nhóm nào</option>';
        }
        const qrFilterSelect = document.getElementById('org-qr-group-filter');
        if (qrFilterSelect) {
            const currentFilter = qrFilterSelect.value;
            qrFilterSelect.innerHTML = '<option value="">— Tất cả nhóm —</option>' + groupOptions;
            if (currentFilter && [...qrFilterSelect.options].some(o => o.value === currentFilter)) {
                qrFilterSelect.value = currentFilter;
            }
        }
    } catch (error) {
        if (badge) badge.textContent = '0 Nhóm';
        if (box && !quiet) box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
    }
}


async function loadOrgQr(isSilent = false) {
    const box = document.getElementById('org-qr-list');
    const badge = document.getElementById('org-qr-count-badge');
    if (!box) return;
    if (!isSilent && (!window.CURRENT_QR_ACCOUNTS || window.CURRENT_QR_ACCOUNTS.length === 0)) {
        box.innerHTML = '<p class="org-empty"><i class="ri-loader-4-line ri-spin"></i> Đang tải…</p>';
    }
    try {
        if ((window.ORG_SALES || []).length === 0) await loadOrgSales(true);
        window.CURRENT_QR_ACCOUNTS = await orgFetch('/api/agent/qr-accounts');
        window._ORG_CACHE_TIMESTAMP['qr'] = Date.now();
        window._ORG_TAB_LOADED['qr'] = true;
        renderOrgQrList();
    } catch (error) {
        if (badge) badge.textContent = '0 QR';
        box.innerHTML = `<p class="org-empty">${escapeHtml(error.message)}</p>`;
    }
}


function renderOrgQrList() {
    const box = document.getElementById('org-qr-list');
    const badge = document.getElementById('org-qr-count-badge');
    const filterSelect = document.getElementById('org-qr-group-filter');
    if (!box) return;

    const currentAdminLang = (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('pastie_admin_lang') || 'vi';
    const dict = (window.TRANSLATIONS && window.TRANSLATIONS[currentAdminLang]) || {};

    const selectedGroupId = filterSelect ? filterSelect.value : '';
    const allQr = window.CURRENT_QR_ACCOUNTS || [];
    const filtered = selectedGroupId
        ? allQr.filter(a => Number(a.group_id) === Number(selectedGroupId))
        : allQr;

    if (badge) badge.textContent = `${filtered.length} QR`;

    // Render Guard: tránh tải lại hàng loạt ảnh QR quickchart nếu dữ liệu không đổi
    const qrHash = `${currentAdminLang}_${selectedGroupId}_${JSON.stringify(filtered.map(a => [a.id, a.label, a.group_id, a.chat_url]))}`;
    if (box.dataset.renderedHash === qrHash && box.children.length > 0) {
        return;
    }
    box.dataset.renderedHash = qrHash;

    const eventValue = (value) => encodeURIComponent(value ?? '').replace(/'/g, '%27');
    box.innerHTML = filtered.length ? filtered.map((account) => {
        const qrThumb = `https://quickchart.io/qr?size=160&text=${encodeURIComponent(account.chat_url)}`;
        return `
        <article class="qr-card">
            <div class="qr-card-top">
                <div class="qr-thumb-box" data-qr-poster="${account.id}" title="${dict.orgViewQr || 'Xem mã'}">
                    <img src="${qrThumb}" alt="QR" class="qr-thumb-img" loading="lazy">
                </div>
                <div class="qr-card-main">
                    <div class="qr-card-title-row">
                        <strong class="qr-card-title">${escapeHtml(account.label)}</strong>
                        <span class="qr-card-group"><i class="ri-team-line"></i> ${escapeHtml(account.group_name || (dict.orgUnassignedGroup || 'Chưa gán nhóm'))}</span>
                    </div>
                    <small class="qr-card-link-preview">${escapeHtml(account.chat_url)}</small>
                </div>
            </div>
            <div class="qr-card-actions">
                <button type="button" class="qr-btn-view" data-qr-poster="${account.id}" title="${dict.orgViewQr || 'Xem mã'}">
                    <i class="ri-qr-code-line"></i> <span>${dict.orgViewQr || 'Xem mã'}</span>
                </button>
                <button type="button" class="qr-btn-edit" data-qr-edit="${account.id}" title="${dict.editBtn || 'Sửa'}">
                    <i class="ri-edit-line"></i> <span>${dict.editBtn || 'Sửa'}</span>
                </button>
                <button type="button" class="qr-btn-delete" data-qr-revoke="${account.id}" title="${dict.deleteBtn || 'Xóa'}">
                    <i class="ri-delete-bin-line"></i> <span>${dict.deleteBtn || 'Xóa'}</span>
                </button>
            </div>
        </article>`;
    }).join('') : tableEmptyBlock(selectedGroupId);
}


// =====================================================================
// Ô chọn giờ và ô chọn Sale
//
// Giờ: <input type="time"> để trình duyệt tự quyết 12h hay 24h theo locale của
// MÁY người dùng, nên máy đặt tiếng Anh sẽ hiện AM/PM dù giao diện là tiếng Việt.
// Không có thuộc tính HTML nào ép được 24 giờ. Vì vậy dùng <select> tự dựng:
// giá trị luôn là "HH:MM" 24 giờ, nhãn kèm buổi cho dễ đọc.
//
// Sale: <select multiple> bắt giữ Ctrl/Cmd để chọn nhiều, trên điện thoại gần như
// không dùng được. Thay bằng danh sách bấm-để-chọn.
// =====================================================================

// 00:00-10:59 sáng · 11:00-12:59 trưa · 13:00-17:59 chiều · 18:00-23:59 tối
function periodOfDay(hour) {
    if (hour < 11) return 'sáng';
    if (hour < 13) return 'trưa';
    if (hour < 18) return 'chiều';
    return 'tối';
}


function setTimeSelect(select, value) {
    if (!select || !value) return;
    const clean = String(value).slice(0, 5);
    if (![...select.options].some((option) => option.value === clean)) {
        const option = document.createElement('option');
        option.value = clean;
        option.textContent = `${clean} · ${periodOfDay(Number(clean.slice(0, 2)))}`;
        select.appendChild(option);
        // Giữ danh sách đúng thứ tự thời gian sau khi chèn thêm.
        const sorted = [...select.options].sort((a, b) => a.value.localeCompare(b.value));
        select.append(...sorted);
    }
    select.value = clean;
}


function fillTimeSelect(select, selected, stepMinutes = 30) {
    if (!select) return;
    const options = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        options.push(`<option value="${value}">${value} · ${periodOfDay(hour)}</option>`);
    }
    // 23:59 là mốc hay dùng cho ca "cả ngày", mà bước 30 phút không chạm tới.
    options.push('<option value="23:59">23:59 · tối</option>');
    select.innerHTML = options.join('');
    select.value = selected;
    if (!select.value) select.value = options.length ? '00:00' : '';
}


// Ca qua nửa đêm là hợp lệ, nhưng người dùng cần được nói rõ chứ không phải đoán.
function describeShift(startId, endId, hintId) {
    const start = document.getElementById(startId)?.value;
    const end = document.getElementById(endId)?.value;
    const hint = document.getElementById(hintId);
    if (!hint || !start || !end) return;
    const toMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
    if (start === end) {
        hint.textContent = 'Giờ bắt đầu trùng giờ kết thúc — được hiểu là làm cả ngày.';
    } else if (toMinutes(start) > toMinutes(end)) {
        hint.textContent = `Ca qua đêm: từ ${start} hôm nay đến ${end} sáng hôm sau.`;
    } else {
        const hours = Math.round((toMinutes(end) - toMinutes(start)) / 6) / 10;
        hint.textContent = `Ca trong ngày, dài khoảng ${hours} giờ.`;
    }
}


function initShiftSelects() {
    const start = document.getElementById('org-sale-start');
    const end = document.getElementById('org-sale-end');
    if (!start || start.options.length) return;
    fillTimeSelect(start, '08:00');
    fillTimeSelect(end, '17:00');
    const update = () => describeShift('org-sale-start', 'org-sale-end', 'org-sale-shift-hint');
    start.addEventListener('change', update);
    end.addEventListener('change', update);
    update();
}


// --- Ô chọn Sale -------------------------------------------------------------

function renderSalePicker(sales) {
    const host = document.getElementById('org-group-sales-select');
    if (!host) return;
    const chosen = new Set(salePickerValue());
    if (!sales.length) {
        host.innerHTML = '<p class="sale-picker-empty">Chưa có Sale nào. Hãy tạo Sale ở thẻ “Sale” trước.</p>';
        return;
    }
    host.innerHTML = sales.map((sale) => `
        <button type="button" class="sale-chip${chosen.has(Number(sale.id)) ? ' is-on' : ''}" data-sale-id="${sale.id}">
            <span class="sale-chip-tick"><i class="ri-check-line"></i></span>
            <span class="sale-chip-text">
                <strong>${escapeHtml(sale.full_name || sale.username)}</strong>
                <small>${escapeHtml(sale.username)}</small>
            </span>
        </button>`).join('');
}


function salePickerValue() {
    const host = document.getElementById('org-group-sales-select');
    if (!host) return [];
    return [...host.querySelectorAll('.sale-chip.is-on')].map((chip) => Number(chip.dataset.saleId)).filter(Boolean);
}


function clearSalePicker() {
    document.getElementById('org-group-sales-select')
        ?.querySelectorAll('.sale-chip.is-on')
        .forEach((chip) => chip.classList.remove('is-on'));
}

// --- Menu Configuration for Agent -------------------------------------------

async function loadAgentMenuSettings() {
    const card = document.getElementById('agent-menu-settings-card');
    if (!card) return;
    if (isOrgTabFresh('menu_settings')) return;
    try {
        const res = await authFetch(`${API_BASE}/api/agent/menu-settings`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Không tải được cài đặt menu.');
        window._ORG_CACHE_TIMESTAMP['menu_settings'] = Date.now();

        const checkbox = document.getElementById('agent-menu-toggle-checkbox');
        const labelInput = document.getElementById('agent-menu-label-input');
        const warning = document.getElementById('agent-menu-superadmin-warning');

        if (checkbox) {
            checkbox.checked = data.agent_menu_enabled && !data.superadmin_menu_disabled;
            checkbox.disabled = data.superadmin_menu_disabled;
        }
        if (labelInput) {
            labelInput.value = data.menu_custom_label || '';
            labelInput.disabled = data.superadmin_menu_disabled;
        }
        if (warning) {
            warning.classList.toggle('hide', !data.superadmin_menu_disabled);
        }

        const customName = data.menu_custom_label || '';
        const tabSpan = document.querySelector('[data-org-tab="menu"] span');
        if (tabSpan) tabSpan.textContent = customName || 'Sản phẩm';
        const paneHeader = document.querySelector('[data-org-pane="menu"] .org-list-header h4');
        if (paneHeader) paneHeader.textContent = customName ? `Các sản phẩm trong ${customName.toLowerCase()}` : 'Danh sách sản phẩm';
        const saleBtnText = document.querySelector('#sale-menu-btn span');
        if (saleBtnText) saleBtnText.textContent = customName || 'Sản phẩm';
    } catch (err) {
        console.error('loadAgentMenuSettings error:', err.message);
    }
}

async function saveAgentMenuSettings() {
    const saveBtn = document.getElementById('agent-menu-save-btn');
    const checkbox = document.getElementById('agent-menu-toggle-checkbox');
    const labelInput = document.getElementById('agent-menu-label-input');
    if (!saveBtn || !checkbox) return;

    const orig = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i>';

    try {
        const res = await authFetch(`${API_BASE}/api/agent/menu-settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentMenuEnabled: checkbox.checked,
                menuCustomLabel: (labelInput?.value || '').trim()
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data?.error || 'Không thể lưu cài đặt.');
        showToast('Đã lưu cấu hình sản phẩm.', 'success');
        delete window._ORG_CACHE_TIMESTAMP?.['menu_settings'];
        await loadAgentMenuSettings();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = orig;
    }
}

document.getElementById('agent-menu-save-btn')?.addEventListener('click', saveAgentMenuSettings);

window.addEventListener('pastie:lang-changed', () => {
    const modal = document.getElementById('org-modal');
    if (modal && !modal.classList.contains('hide')) {
        const saleBox = document.getElementById('org-sale-list');
        if (saleBox) saleBox.dataset.renderedHash = '';
        const groupBox = document.getElementById('org-group-list');
        if (groupBox) groupBox.dataset.renderedHash = '';
        const qrBox = document.getElementById('org-qr-list');
        if (qrBox) qrBox.dataset.renderedHash = '';
        if (window.ORG_SALES) loadOrgSales(true);
        if (window.ORG_GROUPS) loadOrgGroups(false, true);
        if (window.CURRENT_QR_ACCOUNTS) renderOrgQrList();
    }
});

