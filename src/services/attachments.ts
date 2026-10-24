/**
 * Receipt / invoice images.
 *  - Upload: the app compresses a photo to a data URL; the outbox sends it as base64 and Apps
 *    Script stores it (privately) in Google Drive, writing the Drive URL into the sheet.
 *  - Download: Drive URLs are private and cannot be used in <img>. They are fetched through the
 *    authenticated `attachment_read` action (school/role access is checked on the server) and
 *    cached in IndexedDB, so every device can show the same image.
 */
import { idbGet, idbSet } from './idb';
import { DEFAULT_WEBAPP_URL, OWNER_EMAIL, attachmentUploadFields, isDataUrl } from './googleSheets';

export { attachmentUploadFields, isDataUrl };

export const isDriveUrl = (u?: string | null): boolean => !!u && /^https?:\/\/(drive|docs)\.google\.com\//i.test(u);

const memory = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

/**
 * Photos that are still waiting in the outbox are too large for localStorage. While persisting
 * app state, a data URL is swapped for a short marker; the real bytes live in IndexedDB.
 */
const markerByDataUrl = new Map<string, string>();
export const isPendingMarker = (u?: string | null): boolean => !!u && u.startsWith('pending-img:');
export const needsResolve = (u?: string | null): boolean => isDriveUrl(u) || isPendingMarker(u);

export function markerFor(dataUrl: string): string {
  let m = markerByDataUrl.get(dataUrl);
  if (!m) {
    m = 'pending-img:' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    markerByDataUrl.set(dataUrl, m);
    void idbSet('pimg:' + m, dataUrl);
  }
  return m;
}

/** Returns a copy of `items` safe for localStorage (no inline images). */
export function stripInlineImages<T extends { attachment_url?: string }>(items: T[]): T[] {
  return items.map((it) => (isDataUrl(it.attachment_url) ? { ...it, attachment_url: markerFor(String(it.attachment_url)) } : it));
}

export async function primeAttachmentCache(remoteUrl: string, dataUrl: string): Promise<void> {
  if (!remoteUrl || !isDataUrl(dataUrl)) return;
  memory.set(remoteUrl, dataUrl);
  await idbSet('att:' + remoteUrl, dataUrl);
}

async function download(url: string): Promise<string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('school_finance_auth_token') || '' : '';
  if (!token) return '';
  const res = await fetch(DEFAULT_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'attachment_read', url, token, owner: OWNER_EMAIL }),
    mode: 'cors',
  });
  const json: any = await res.json();
  if (!json?.success || !json.base64) return '';
  return `data:${json.mime_type || 'image/jpeg'};base64,${json.base64}`;
}

/** Returns something safe to put in <img src>: the same string for data/other URLs, a data URL for Drive files. */
export async function resolveAttachment(url: string): Promise<string> {
  if (!url) return '';
  if (isPendingMarker(url)) return (await idbGet<string>('pimg:' + url)) || '';
  if (!isDriveUrl(url)) return url;
  const cached = memory.get(url) || (await idbGet<string>('att:' + url));
  if (cached) {
    memory.set(url, cached);
    return cached;
  }
  let p = inflight.get(url);
  if (!p) {
    p = download(url)
      .then(async (dataUrl) => {
        if (dataUrl) await primeAttachmentCache(url, dataUrl);
        return dataUrl;
      })
      .finally(() => { inflight.delete(url); });
    inflight.set(url, p);
  }
  return p;
}

/** Opens an attachment (any kind) in a new tab. */
export async function openAttachment(url: string): Promise<void> {
  const resolved = await resolveAttachment(url);
  if (!resolved) {
    window.alert('بارگیری تصویر ممکن نشد؛ اتصال اینترنت و ورود به سامانه را بررسی کنید.');
    return;
  }
  if (isDataUrl(resolved)) {
    try {
      const blob = await (await fetch(resolved)).blob();
      window.open(URL.createObjectURL(blob), '_blank', 'noopener');
      return;
    } catch { /* fall through */ }
  }
  window.open(resolved, '_blank', 'noopener');
}
