import { ClaimSettlement, Transaction } from '../types';

/** هزینه‌ای که مدیر از جیب خودش پرداخت کرده (چه تسویه‌نشده، چه تسویه‌شده) — پولش مستقیم از بانک مدرسه خارج نشده است. */
export const isOwnPocketSource = (source?: string) => source === 'own' || source === 'own_settled';

/** هزینه‌هایی که از حساب بانکِ اصلی مدرسه کم نمی‌شوند: کارت تن‌خواه (حساب جدا) و طلب مدیر (تا زمان تسویه). */
export const isOutsideMainBank = (source?: string) => source === 'petty_cash' || isOwnPocketSource(source);

/**
 * مبلغ هر تسویه را به تفکیک مدرسه برمی‌گرداند (بر اساس هزینه‌های انتخاب‌شده در تسویه).
 * شناسه‌ی تراکنش هزینه در برنامه = ۱۰۰٬۰۰۰ + شناسه در سرور.
 */
export function splitSettlementBySchool(st: ClaimSettlement, transactions: Transaction[]): Map<number, number> {
  const byServerId = new Map<string, Transaction>();
  transactions.forEach((t) => {
    if (t.kind === 'هزینه' && t.id >= 100000 && t.id < 200000000) byServerId.set(String(t.id - 100000), t);
  });
  const perSchool = new Map<number, number>();
  let known = 0;
  st.expense_ids.forEach((eid) => {
    const tx = byServerId.get(String(eid));
    if (!tx) return;
    const amt = tx.debit || tx.amount || 0;
    perSchool.set(tx.school_id, (perSchool.get(tx.school_id) || 0) + amt);
    known += amt;
  });
  const rest = (Number(st.amount) || 0) - known;
  if (perSchool.size === 0 && rest > 0 && st.school_id !== undefined && st.school_id !== '') {
    perSchool.set(Number(st.school_id), rest);
  }
  return perSchool;
}
