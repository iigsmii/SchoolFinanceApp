import { Cheque, Transaction, User } from '../types';
import { chequeStage, isCollectibleCheque } from './cheques';

/** امروز به‌وقت محلی (toISOString در ساعت‌های اول صبح ایران روز قبل را می‌دهد). */
export const localTodayIso = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ───────── راهنمای مقصد صفحه (بنر داشبورد → صفحه‌ی مربوط با فیلتر آماده) ─────────
const HINT_KEY = 'school_finance_nav_hint';
export const setNavHint = (screen: string, value: string) => {
  try { sessionStorage.setItem(HINT_KEY, JSON.stringify({ screen, value })); } catch { /* ignore */ }
};
/** مقدار راهنما را یک‌بار می‌خواند و پاک می‌کند؛ فقط اگر برای همین صفحه باشد. */
export const takeNavHint = (screen: string): string | null => {
  try {
    const raw = sessionStorage.getItem(HINT_KEY);
    if (!raw) return null;
    const h = JSON.parse(raw);
    if (h?.screen !== screen) return null;
    sessionStorage.removeItem(HINT_KEY);
    return String(h.value);
  } catch {
    return null;
  }
};

// ───────── تراکنش‌های ردشده برای مدیر ثبت‌کننده ─────────
const mySchoolIds = (u: User | null | undefined): number[] => {
  if (!u) return [];
  const ids = (u.school_ids && u.school_ids.length ? u.school_ids : u.school_id ? [u.school_id] : []).map(Number);
  return ids.filter((n) => n > 0);
};

export function myRejectedTransactions(transactions: Transaction[], user: User | null | undefined): Transaction[] {
  if (!user) return [];
  const schools = new Set(mySchoolIds(user));
  return transactions.filter((t) => {
    if (t.review_status !== 'rejected') return false;
    if (t.registered_by != null && String(t.registered_by) !== '') return String(t.registered_by) === String(user.id);
    return schools.has(Number(t.school_id));
  });
}

const seenKey = (userId: number | string) => `school_finance_seen_rejected_${userId}`;
export const seenRejectedIds = (userId: number | string): Set<string> => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(seenKey(userId)) || '[]')); } catch { return new Set(); }
};
export const markRejectedSeen = (userId: number | string, ids: Array<number | string>) => {
  try {
    const set = seenRejectedIds(userId);
    ids.forEach((i) => set.add(String(i)));
    localStorage.setItem(seenKey(userId), JSON.stringify(Array.from(set).slice(-500)));
  } catch { /* ignore */ }
};

// ───────── چک‌ها برای مدیر ارشد ─────────
export interface ChequeAlerts {
  pendingReview: Cheque[]; // ثبت‌شده توسط مدیر و منتظر تأیید
  dueForCollection: Cheque[]; // سرحساب شده و سررسید رسیده؛ منتظر تأیید وصول/عدم وصول
  notOnAccount: Cheque[]; // تأییدشده ولی هنوز سرحساب نشده و سررسید رسیده
}

export function chequeAlerts(cheques: Cheque[], todayIso: string = localTodayIso()): ChequeAlerts {
  const out: ChequeAlerts = { pendingReview: [], dueForCollection: [], notOnAccount: [] };
  for (const c of cheques) {
    const stage = chequeStage(c);
    if (stage === 'awaiting_review') out.pendingReview.push(c);
    else if (!isCollectibleCheque(c)) continue;
    else if (stage === 'on_account' && c.due_date && c.due_date <= todayIso) out.dueForCollection.push(c);
    else if (stage === 'to_deposit' && c.due_date && c.due_date <= todayIso) out.notOnAccount.push(c);
  }
  return out;
}
