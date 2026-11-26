import { Cheque, Transaction } from '../types';

/** چکی که باید سرحساب و وصول شود (چک ضمانتی و ضمانت پرسنل وصول نمی‌شود). */
export const isCollectibleCheque = (c: Pick<Cheque, 'cheque_type' | 'cheque_purpose'>) =>
  c.cheque_type !== 'guarantee' && c.cheque_purpose !== 'guarantee' && c.cheque_purpose !== 'staff_guarantee';

/** مرحله‌ی فعلی چک در چرخه‌ی وصول (برای نمایش و فیلتر). */
export type ChequeStage = 'returned' | 'awaiting_review' | 'to_deposit' | 'on_account' | 'cleared' | 'reconciled' | 'not_cleared' | 'rejected' | 'guarantee';

export function chequeStage(c: Cheque): ChequeStage {
  if (c.status === 'returned' || c.collection_status === 'returned') return 'returned';
  if (c.status === 'rejected') return 'rejected';
  if (c.status === 'pending') return 'awaiting_review';
  if (!isCollectibleCheque(c)) return 'guarantee';
  if (c.collection_status === 'not_cleared' || c.status === 'bounced') return 'not_cleared';
  if (c.collection_status === 'cleared' || c.status === 'paid') return c.bank_reconciled ? 'reconciled' : 'cleared';
  if (c.collection_status === 'on_account') return 'on_account';
  return 'to_deposit';
}

export const CHEQUE_STAGE_LABEL: Record<ChequeStage, string> = {
  returned: 'عودت داده شد',
  awaiting_review: 'در انتظار تأیید',
  to_deposit: 'تأییدشده · سرحساب نشده',
  on_account: 'سرحساب شده · در انتظار وصول',
  cleared: 'وصول شد · منتظر تطبیق بانک',
  reconciled: 'وصول و تطبیق‌شده',
  not_cleared: 'وصول نشد (برگشتی)',
  rejected: 'ردشده',
  guarantee: 'ضمانتی',
};

/** ویرایش مجاز است (تأییدشده هم) تا قبل از وصول؛ هر ویرایش چک را به صف تأیید برمی‌گرداند. */
export const canEditCheque = (c: Cheque): boolean => {
  const st = chequeStage(c);
  return !['cleared', 'reconciled', 'not_cleared', 'returned'].includes(st) && !c.bank_reconciled;
};

/** عودت به صاحب چک: هر چکی که هنوز وصول و به بانک واریز نشده (حتی ردشده/برگشتی/ضمانتی). */
export const canReturnCheque = (c: Cheque): boolean => {
  const st = chequeStage(c);
  return !['cleared', 'reconciled', 'returned'].includes(st) && !c.bank_reconciled;
};

/** چکی که این تراکنش دفتری از آن ساخته شده است (شناسه‌ی تراکنش پرداخت = شناسه‌ی شهریه‌ی چک). */
export function chequeForTransaction(tx: Pick<Transaction, 'id' | 'payment_method' | 'tracking_code' | 'school_id' | 'amount'>, cheques: Cheque[]): Cheque | undefined {
  const byId = cheques.find((c) => c.tuition_id && c.tuition_id === tx.id);
  if (byId) return byId;
  if (tx.payment_method !== 'چک') return undefined;
  const code = String(tx.tracking_code || '').trim();
  if (!code) return undefined;
  return cheques.find((c) => c.sayad_id === code && c.school_id === tx.school_id && Number(c.amount) === Number(tx.amount));
}

/** تراکنش چکیِ هنوز وصل‌نشده نباید با صورتحساب بانک تطبیق داده شود. */
export function isUncollectedChequeTx(tx: Pick<Transaction, 'id' | 'payment_method' | 'tracking_code' | 'school_id' | 'amount'>, cheques: Cheque[]): boolean {
  const c = chequeForTransaction(tx, cheques);
  if (!c) return false;
  return chequeStage(c) !== 'cleared';
}

/** تعداد روز تا سررسید (منفی = گذشته). */
export function daysToDue(dueIso: string, todayIso: string): number {
  const a = new Date(`${todayIso}T00:00:00`).getTime();
  const b = new Date(`${dueIso}T00:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}
