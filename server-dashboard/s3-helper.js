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

function buildAttachmentKey(projectId, sessionId, originalFileName) {
  const safeName = sanitizeFileName(originalFileName);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Folder structure requested: {project_id}/{session_id}/{unique}-{filename}
  return `${projectId}/${sessionId}/${unique}-${safeName}`;
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

async function deleteObject(key) {
  if (!isConfigured) return;
  const res = await client.fetch(objectUrl(key), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    const bodyText = await res.text().catch(() => '');
    console.error(`[S3] Xóa object thất bại (${res.status}) key=${key}:`, bodyText.slice(0, 300));
  }
}

// Deletes every object under {projectId}/{sessionId}/ — used when a QR
// Concierge session is deleted, so attachments don't pile up in the bucket.
async function deleteSessionAttachments(projectId, sessionId) {
  if (!isConfigured || !projectId || !sessionId) return;
  const prefix = `${projectId}/${sessionId}/`;
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
    console.error(`[S3] Lỗi khi xóa attachment của session ${sessionId}:`, err.message);
  }
}

module.exports = {
  isConfigured,
  buildAttachmentKey,
  sanitizeFileName,
  uploadBuffer,
  getPresignedUrl,
  deleteObject,
  deleteSessionAttachments,
};
