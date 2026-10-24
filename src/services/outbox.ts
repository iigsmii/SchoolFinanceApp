/**
 * Persistent outbox: every change the user makes is written here FIRST and then sent to
 * Google Sheets (through Apps Script) in order. Nothing is lost when the phone is offline,
 * the app is closed, or the server is temporarily unreachable.
 *
 * Idempotency: each entry owns a stable `request_id` that is re-sent on every retry, so the
 * Apps Script `Requests` sheet can replay the stored result instead of writing twice.
 */
import { idbGet, idbSet } from './idb';
import { postToAppsScript } from './googleSheets';

export interface OutboxEntity {
  type: string; // student | tuition | expense | cheque | petty_income | worklog | payroll | bank_account | message | category | staff | school | manager | bank_upload | ...
  id?: number | string; // local id at enqueue time
  extra?: Record<string, any>;
}

export interface OutboxEntry {
  key: string;
  action: string;
  payload: Record<string, any>;
  entity?: OutboxEntity;
  created_at: number;
  attempts: number;
  failed?: boolean;
  error?: string;
}

const KEY = 'outbox_v1';
let cache: OutboxEntry[] | null = null;
let draining = false;
const listeners = new Set<() => void>();

const uuid = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export const newRequestId = uuid;

export async function loadOutbox(): Promise<OutboxEntry[]> {
  if (!cache) cache = ((await idbGet<OutboxEntry[]>(KEY)) || []).slice();
  return cache;
}

async function persist(): Promise<void> {
  await idbSet(KEY, cache || []);
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore listener errors */ }
  });
}

export function subscribeOutbox(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function outboxSnapshot(): OutboxEntry[] {
  return (cache || []).slice();
}

export async function enqueue(entry: { action: string; payload: Record<string, any>; entity?: OutboxEntity }): Promise<OutboxEntry> {
  const list = await loadOutbox();
  const e: OutboxEntry = {
    key: uuid(),
    action: entry.action,
    payload: { ...entry.payload, action: entry.action, request_id: entry.payload.request_id || uuid() },
    entity: entry.entity,
    created_at: Date.now(),
    attempts: 0,
  };
  list.push(e);
  await persist();
  return e;
}

/** Rewrite queued payloads (used when a temporary local id is replaced by the server id). */
export async function rewriteOutbox(mutator: (e: OutboxEntry) => void): Promise<void> {
  const list = await loadOutbox();
  list.forEach(mutator);
  await persist();
}

export async function retryFailedEntries(): Promise<void> {
  const list = await loadOutbox();
  list.forEach((e) => {
    if (e.failed) {
      e.failed = false;
      e.attempts = 0;
      e.error = undefined;
      // The previous request_id may be parked as "needs review" on the server: use a new one.
      e.payload = { ...e.payload, request_id: uuid() };
    }
  });
  await persist();
}

export async function dismissEntry(key: string): Promise<void> {
  const list = await loadOutbox();
  const i = list.findIndex((e) => e.key === key);
  if (i >= 0) list.splice(i, 1);
  await persist();
}

export interface DrainResult {
  sent: number;
  failed: number;
  pending: number;
  offline: boolean;
  authExpired: boolean;
}

const isAuthError = (msg?: string) => /نشست|وارد سامانه|ورود/.test(String(msg || ''));

/**
 * Sends queued entries in order. Stops at the first network/auth problem so ordering
 * (student before its payments) is preserved. Server-side rejections never block the queue.
 */
export async function drainOutbox(onSuccess: (entry: OutboxEntry, result: any) => void | Promise<void>): Promise<DrainResult> {
  const out: DrainResult = { sent: 0, failed: 0, pending: 0, offline: false, authExpired: false };
  if (draining) return out;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('school_finance_auth_token') : '';
  if (!token) {
    out.authExpired = true;
    out.pending = (await loadOutbox()).filter((e) => !e.failed).length;
    return out;
  }
  draining = true;
  try {
    const list = await loadOutbox();
    for (let i = 0; i < list.length; ) {
      const entry = list[i];
      if (entry.failed) { i++; continue; }
      const res: any = await postToAppsScript(entry.payload);
      if (res?.success) {
        list.splice(i, 1);
        await persist();
        try { await onSuccess(entry, res); } catch (err) { console.warn('outbox onSuccess handler failed', err); }
        out.sent++;
        continue;
      }
      if (res?.network) { out.offline = true; break; }
      if (isAuthError(res?.error || res?.message)) { out.authExpired = true; break; }
      if (res?.needs_review) {
        // The server may or may not have written the row: never replay automatically.
        entry.failed = true;
        entry.error = res?.error || res?.message || 'نتیجه ثبت نیازمند بررسی است.';
        await persist();
        out.failed++;
        i++;
        continue;
      }
      entry.attempts += 1;
      entry.error = res?.message || res?.error || 'خطای نامشخص سرور';
      if (entry.attempts >= 3) {
        entry.failed = true;
        out.failed++;
      }
      await persist();
      i++;
    }
    out.pending = list.filter((e) => !e.failed).length;
    out.failed = list.filter((e) => e.failed).length;
    return out;
  } finally {
    draining = false;
  }
}
