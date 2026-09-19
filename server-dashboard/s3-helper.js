// S3-compatible object storage for chat attachments (images/videos/documents).
//
// Uses aws4fetch instead of the official @aws-sdk/client-s3 — the official SDK's
// dependency tree (credential providers, SSO, checksums, etc.) was too large to
// install reliably in this environment; aws4fetch is a ~10KB, zero-dependency
// SigV4 signer built on the native `fetch`, and does everything we need here
// (PUT, GET presign, DELETE, ListObjectsV2) against any S3-compatible endpoint.
//
// Env vars expected (already connected/linked by the user on the deploy platform):
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION,
//   AWS_ENDPOINT_URL, AWS_S3_BUCKET_NAME

const { AwsClient } = require('aws4fetch');

const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const REGION = process.env.AWS_DEFAULT_REGION || 'auto';
const ENDPOINT_URL = (process.env.AWS_ENDPOINT_URL || '').replace(/\/+$/, '');
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

const isConfigured = !!(ACCESS_KEY_ID && SECRET_ACCESS_KEY && ENDPOINT_URL && BUCKET_NAME);

if (!isConfigured) {
  console.warn('[S3] Thiếu biến môi trường AWS_* — tính năng đính kèm file sẽ bị vô hiệu hóa.');
}

const client = isConfigured
  ? new AwsClient({
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      region: REGION,
      service: 's3',
    })
  : null;

// Path-style addressing (bucket in the path, not the hostname) — the safe
// default for third-party S3-compatible providers behind a custom endpoint.
function objectUrl(key) {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${ENDPOINT_URL}/${BUCKET_NAME}/${encodedKey}`;
}

// Chat/project ids come from our own database (UUIDs / slugs), but filenames
// come from the visitor's/agent's OS — sanitize before it becomes part of an
// S3 key or a URL path segment.
function sanitizeFileName(name) {
  const base = (name || 'file').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-150) || 'file';
}

// ─── ĐẶT TÊN ĐỐI TƯỢNG TRONG BUCKET ───────────────────────────────────────
//
// Ba loại ảnh, ba tiền tố riêng ở gốc bucket:
//
//   avatar/{id tài khoản}/{id tài khoản}.{đuôi}
//   menu/{id tài khoản}/{id ảnh}.{đuôi}
//   chat/{id đoạn chat}/{id ảnh}.{đuôi}
//
// Trước đây avatar ĐI NHỜ hàm đặt tên của menu, nên ảnh đại diện nằm lẫn trong
// thư mục menu/ của chính Agent đó — mở bucket ra không phân biệt nổi đâu là
// ảnh sản phẩm, đâu là ảnh người.
//
// BỎ project_id khỏi khoá có an toàn không: có. `admins.id` và `qr_menu_items.id`
// là SERIAL, `sessions.id` là TEXT PRIMARY KEY — cả ba duy nhất trên toàn hệ
// thống, không có chuyện hai project trùng id rồi đè ảnh của nhau.

// Giữ ĐUÔI THẬT của tệp, không ép cứng .png.
//
// Ảnh sản phẩm có thể là gif (ảnh động), avatar khách tải lên thường là jpg,
// còn đính kèm trong chat còn có cả video và tài liệu. Ép hết thành .png thì
// trình duyệt vẫn mở được nhưng tải về là một tệp sai đuôi, mở bằng phần mềm
// khác sẽ báo hỏng.
const DUOI_THEO_MIME = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/avif': 'avif', 'image/svg+xml': 'svg', 'image/heic': 'heic',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg',
  'application/pdf': 'pdf',
};

function duoiTep(originalFileName, mimeType) {
  // Ưu tiên MIME do trình duyệt khai: tên tệp người dùng đặt có thể không có
  // đuôi, hoặc có đuôi sai (đổi tên .heic thành .jpg là chuyện thường gặp).
  const theoMime = DUOI_THEO_MIME[String(mimeType || '').toLowerCase().split(';')[0].trim()];
  if (theoMime) return theoMime;
  const theoTen = String(originalFileName || '').match(/\.([a-zA-Z0-9]{1,8})$/);
  if (theoTen) return theoTen[1].toLowerCase();
  return 'bin';
}

// Id cho một ảnh chưa có dòng nào trong CSDL.
//
// Đính kèm trong chat được tải lên TRƯỚC khi dòng tin nhắn được tạo, nên lúc
// cần đặt tên thì chưa có messages.id để dùng. Sinh id riêng ở đây thay vì đảo
// thứ tự "tạo dòng tin rồi mới tải ảnh" — đảo thứ tự là đụng vào luồng gửi tin
// đang chạy, mà tải ảnh hỏng giữa chừng thì để lại một dòng tin rỗng.
function idAnhMoi() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// chat/{id đoạn chat}/{id ảnh}.{đuôi}
function buildChatFileKey(sessionId, imageId, originalFileName, mimeType) {
  return `chat/${sessionId}/${imageId || idAnhMoi()}.${duoiTep(originalFileName, mimeType)}`;
}

// avatar/{id tài khoản}/{id tài khoản}.{đuôi}
//
// Tên cố định theo id tài khoản: mỗi người đúng một ảnh, tải ảnh mới là đè lên
// ảnh cũ, không để lại rác trong bucket.
function buildAvatarKey(accountId, originalFileName, mimeType) {
  return `avatar/${accountId}/${accountId}.${duoiTep(originalFileName, mimeType)}`;
}

async function uploadBuffer(key, buffer, contentType) {
  if (!isConfigured) throw new Error('S3 chưa được cấu hình (thiếu biến môi trường AWS_*).');
  const res = await client.fetch(objectUrl(key), {
    method: 'PUT',
    body: buffer,
    headers: { 'Content-Type': contentType || 'application/octet-stream' },
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`S3 upload thất bại (${res.status}): ${bodyText.slice(0, 300)}`);
  }
  return key;
}

// Presigned GET URL (query-string auth) so the browser can load the file
// directly from the bucket without our server proxying the bytes.
async function getPresignedUrl(key, expiresInSeconds = 3600) {
  if (!isConfigured) return null;
  const url = new URL(objectUrl(key));
  url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
  const signedRequest = await client.sign(url.toString(), {
    method: 'GET',
    aws: { signQuery: true },
  });
  return signedRequest.url;
}

// menu/{id tài khoản}/{id ảnh}.{đuôi}
//
// Tách hẳn khỏi đính kèm của chat: ảnh sản phẩm thuộc về một Agent (hộ kinh
// doanh) chứ không thuộc phiên chat nào, và sống lâu hơn nhiều.
function buildMenuImageKey(accountId, imageId, originalFileName, mimeType) {
  return `menu/${accountId}/${imageId || idAnhMoi()}.${duoiTep(originalFileName, mimeType)}`;
}

// URL ký dài hạn cho ảnh menu.
//
// Vì sao không dùng chung getPresignedUrl 6 giờ như file đính kèm: ảnh đính kèm
// chỉ được xem vài lần ngay sau khi gửi, còn ảnh menu hiển thị cho mọi khách quét
// QR, liên tục, trong nhiều tháng. Ký 6 giờ nghĩa là cứ 6 giờ lại phải ký lại
// toàn bộ menu — vừa tốn, vừa dễ để lọt ảnh hỏng ra giao diện khách.
//
// SigV4 giới hạn tối đa 7 ngày, nên đây là mốc dài nhất có thể; phía server tự
// gia hạn khi còn dưới 1 ngày (xem refreshMenuImageUrl trong server.js).
const MENU_IMAGE_URL_TTL_SECONDS = 7 * 24 * 3600;

async function getMenuImageUrl(key) {
  return getPresignedUrl(key, MENU_IMAGE_URL_TTL_SECONDS);
}

async function deleteObject(key) {
  if (!isConfigured) return;
  const res = await client.fetch(objectUrl(key), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    const bodyText = await res.text().catch(() => '');
    console.error(`[S3] Xóa object thất bại (${res.status}) key=${key}:`, bodyText.slice(0, 300));
  }
}

// Xoá sạch đính kèm của một phiên chat khi phiên bị xoá.
//
// PHẢI QUÉT CẢ HAI DẠNG KHOÁ. Ảnh tải lên từ khi đổi cách đặt tên nằm ở
// `chat/{sessionId}/`, còn ảnh cũ vẫn nằm ở `{projectId}/{sessionId}/`. Quét
// mỗi dạng mới thì mọi ảnh cũ ở lại trong bucket vĩnh viễn — không ai nhìn
// thấy, nhưng vẫn tính tiền lưu trữ và vẫn là dữ liệu của khách còn sót lại
// sau khi họ đã yêu cầu xoá.
async function deleteSessionAttachments(projectId, sessionId) {
  if (!isConfigured || !sessionId) return;
  const prefixes = [`chat/${sessionId}/`];
  if (projectId) prefixes.push(`${projectId}/${sessionId}/`);
  for (const prefix of prefixes) {
    await xoaTheoTienTo(prefix);
  }
}

async function xoaTheoTienTo(prefix) {
  try {
    let continuationToken = null;
    do {
      const listUrl = new URL(`${ENDPOINT_URL}/${BUCKET_NAME}`);
      listUrl.searchParams.set('list-type', '2');
      listUrl.searchParams.set('prefix', prefix);
      if (continuationToken) listUrl.searchParams.set('continuation-token', continuationToken);

      const res = await client.fetch(listUrl.toString(), { method: 'GET' });
      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        console.error(`[S3] Liệt kê object thất bại (${res.status}) prefix=${prefix}:`, bodyText.slice(0, 300));
        return;
      }
      const xml = await res.text();
      const keys = [...xml.matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) =>
        m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      );
      await Promise.all(keys.map((key) => deleteObject(key)));

      const isTruncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
      const tokenMatch = xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/);
      continuationToken = isTruncated && tokenMatch ? tokenMatch[1] : null;
    } while (continuationToken);
  } catch (err) {
    console.error(`[S3] Lỗi khi xoá object theo tiền tố ${prefix}:`, err.message);
  }
}

module.exports = {
  isConfigured,
  buildChatFileKey,
  buildAvatarKey,
  buildMenuImageKey,
  duoiTep,
  idAnhMoi,
  getMenuImageUrl,
  MENU_IMAGE_URL_TTL_SECONDS,
  sanitizeFileName,
  uploadBuffer,
  getPresignedUrl,
  deleteObject,
  deleteSessionAttachments,
};
