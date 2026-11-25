import type { BankTransaction, Cheque, ScreenType, School, Student, Transaction } from '../types';

export interface FailedItemInput {
  key: string;
  action: string;
  label: string;
  error: string;
  payload?: Record<string, any>;
  entity?: { type: string; id?: number | string; extra?: Record<string, any> };
}

export interface DescribedField { label: string; value: string; warn?: boolean }
export interface DescribedRecord { title: string; fields: DescribedField[] }
export interface DescribedItem {
  /** خط خلاصه‌ی کنار هر مورد در فهرست (مبلغ، تاریخ، نام...) */
  summary: string;
  records: DescribedRecord[];
  screen?: ScreenType;
  screenLabel?: string;
}

export interface DescribeData {
  students: Student[];
  schools: School[];
  transactions: Transaction[];
  bankTransactions: BankTransaction[];
  cheques: Cheque[];
}

const fmtAmount = (n: any) => `${Math.round(Number(n) || 0).toLocaleString('fa-IR')} ریال`;
const fa = (s: any) => String(s ?? '').replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const short = (s: any, n = 120) => { const t = String(s ?? '').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };

const SKIP_KEYS = new Set(['action', 'request_id', 'token', 'owner', 'image', 'image_base64', 'image_url', 'attachment', 'attachment_base64', 'file', 'file_base64', 'base64', 'password', 'rows', 'items']);
const KEY_LABELS: Record<string, string> = {
  date: 'تاریخ', due_date: 'تاریخ سررسید', issue_date: 'تاریخ صدور', amount: 'مبلغ', description: 'توضیحات', tracking_code: 'کد پیگیری',
  category: 'سرفصل', payment_method: 'روش پرداخت', payment_source: 'منبع پرداخت', type: 'نوع', kind: 'نوع سند', cheque_number: 'شماره چک',
  sayad_id: 'شناسه صیاد', bank_name: 'بانک', name: 'نام', title: 'عنوان', status: 'وضعیت', review_status: 'وضعیت تأیید', review_action: 'تصمیم',
  rejection_reason: 'دلیل رد', petty_cash_card: 'کارت تنخواه', linked_account_name: 'حساب مرتبط', phone: 'تلفن', role: 'نقش', username: 'نام کاربری',
  purpose: 'بابت', direction: 'جهت', card_number: 'شماره کارت', source_type: 'نوع منبع', collection_status: 'وضعیت وصول', reason: 'دلیل',
  hours: 'ساعت', month: 'ماه', year: 'سال', pos_terminal_number: 'شماره پایانه', balance: 'مانده',
};

const schoolName = (d: DescribeData, id: any) => d.schools.find((s) => String(s.id) === String(id))?.name || (id ? `مدرسه ${fa(id)}` : '');
const studentName = (d: DescribeData, id: any) => d.students.find((s) => String(s.id) === String(id))?.name || '';

function genericFields(payload: Record<string, any> | undefined, d: DescribeData): DescribedField[] {
  const out: DescribedField[] = [];
  if (!payload) return out;
  if (payload.student_id) { const n = studentName(d, payload.student_id) || payload.student_name; if (n) out.push({ label: 'دانش‌آموز', value: String(n) }); }
  if (payload.school_id) { const n = schoolName(d, payload.school_id); if (n) out.push({ label: 'مدرسه', value: n }); }
  for (const [k, v] of Object.entries(payload)) {
    if (SKIP_KEYS.has(k) || k === 'student_id' || k === 'school_id' || k === 'id' || k === 'student_name' || k === 'school_name') continue;
    if (v === '' || v == null || typeof v === 'object') continue;
    const label = KEY_LABELS[k];
    if (!label) continue;
    out.push({ label, value: k === 'amount' || k === 'balance' ? fmtAmount(v) : /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? fa(v) : short(v) });
  }
  return out;
}

function txRecord(t: Transaction, d: DescribeData): DescribedRecord {
  return {
    title: 'تراکنش نرم‌افزار',
    fields: [
      { label: 'تاریخ', value: fa(t.date) },
      { label: 'مبلغ', value: fmtAmount(t.amount) },
      ...(t.student_id ? [{ label: 'دانش‌آموز', value: studentName(d, t.student_id) || fa(t.student_id) }] : []),
      { label: 'مدرسه', value: schoolName(d, t.school_id) },
      ...(t.description ? [{ label: 'توضیحات', value: short(t.description) }] : []),
      ...(t.tracking_code ? [{ label: 'کد پیگیری', value: fa(t.tracking_code) }] : []),
    ],
  };
}

function bankRecord(b: BankTransaction, d: DescribeData): DescribedRecord {
  return {
    title: 'تراکنش بانکی',
    fields: [
      { label: 'تاریخ', value: fa(b.date) },
      { label: 'مبلغ', value: fmtAmount(b.amount) },
      { label: 'مدرسه', value: schoolName(d, b.school_id) },
      ...(b.description ? [{ label: 'شرح بانک', value: short(b.description) }] : []),
      ...(b.tracking_code ? [{ label: 'کد پیگیری', value: fa(b.tracking_code) }] : []),
      ...(b.bank_account ? [{ label: 'حساب', value: fa(b.bank_account) }] : []),
    ],
  };
}

const SCREEN_BY_PREFIX: Array<[RegExp, ScreenType, string]> = [
  [/^bank_/, 'bank', 'تطبیق بانک'],
  [/^cheque_/, 'cheque_list', 'فهرست چک‌ها'],
  [/^(tuition|expense|transaction|finance)_/, 'transactions', 'تراکنش‌ها'],
  [/^student_/, 'students', 'دانش‌آموزان'],
];

/** توضیح انسان‌خوان یک مورد ارسال‌نشده: چه رکوردی، با چه مشخصاتی، و کجا می‌شود دیدش. */
export function describeFailedItem(item: FailedItemInput, d: DescribeData): DescribedItem {
  const p = item.payload || {};
  const records: DescribedRecord[] = [];
  let summary = '';

  if (item.action === 'bank_match') {
    const bank = d.bankTransactions.find((b) => String(b.id) === String(p.id)) ||
      d.bankTransactions.find((b) => String(b.tracking_code) === String(p.tracking_code) && Number(b.amount) === Number(p.amount) && String(b.date) === String(p.date));
    const tx = item.entity?.id != null ? d.transactions.find((t) => String(t.id) === String(item.entity!.id)) : undefined;
    if (bank) records.push(bankRecord(bank, d));
    if (tx) records.push(txRecord(tx, d));
    if (bank && tx && String(bank.school_id) !== String(tx.school_id)) {
      const mismatch = `مدرسهٔ تراکنش بانکی (${schoolName(d, bank.school_id)}) با مدرسهٔ تراکنش نرم‌افزار (${schoolName(d, tx.school_id)}) یکی نیست.`;
      records.push({ title: 'علت احتمالی', fields: [{ label: 'ناهماهنگی', value: mismatch, warn: true }] });
    }
    summary = `${fmtAmount(p.amount ?? bank?.amount)} · ${fa(p.date ?? bank?.date ?? '')}${tx?.student_id ? ` · ${studentName(d, tx.student_id)}` : ''}`;
  } else {
    const fields = genericFields(p, d);
    // رکورد محلی مرتبط (اگر هنوز وجود دارد)
    const id = item.entity?.id;
    const t = id != null ? d.transactions.find((x) => String(x.id) === String(id)) : undefined;
    if (t && /^(tx|tuition|expense|petty_income)/.test(item.entity?.type || '')) records.push(txRecord(t, d));
    const c = id != null && /^cheque/.test(item.entity?.type || '') ? d.cheques.find((x) => String(x.id) === String(id)) : undefined;
    if (c) records.push({ title: 'چک', fields: [
      { label: 'شماره/صیاد', value: fa(c.sayad_id || c.cheque_number || c.id) },
      { label: 'مبلغ', value: fmtAmount(c.amount) },
      { label: 'سررسید', value: fa(c.due_date) },
      ...(c.student_id ? [{ label: 'دانش‌آموز', value: studentName(d, c.student_id) || fa(c.student_id) }] : []),
      { label: 'مدرسه', value: schoolName(d, c.school_id) },
    ] });
    if (fields.length) records.push({ title: 'اطلاعات ارسال‌شده', fields });
    const get = (l: string) => fields.find((f) => f.label === l)?.value;
    summary = [get('مبلغ'), get('تاریخ'), get('دانش‌آموز') || get('نام') || get('عنوان') || get('شماره چک'), get('مدرسه')].filter(Boolean).join(' · ');
  }

  const nav = SCREEN_BY_PREFIX.find(([re]) => re.test(item.action));
  return { summary, records, screen: nav?.[1], screenLabel: nav?.[2] };
}
