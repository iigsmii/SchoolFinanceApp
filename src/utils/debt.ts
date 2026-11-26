import { Student, Transaction } from '../types';
import { formatRial, jalaliFromGregorian, todayGregorian } from './jalali';

/** Only approved tuition ledger entries affect a student's tuition balance. */
const TUITION_LEDGER_KINDS = new Set(['شهریه_بدهی', 'شهریه', 'تخفیف_شهریه']);

export const toTuitionAmount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٬,،\s]/g, '')
    .replace(/[^0-9.-]/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

export function calculateStudentTuitionBalance(studentId: number, transactions: Transaction[]) {
  const ledgerTransactions = transactions.filter((t) => {
    if (Number(t.student_id) !== Number(studentId) || !TUITION_LEDGER_KINDS.has(String(t.kind || ''))) return false;
    const status = String(t.review_status || 'approved').toLowerCase();
    return status !== 'pending' && status !== 'rejected' && status !== 'delete_pending';
  });
  let totalDebit = 0;
  let totalCredit = 0;
  ledgerTransactions.forEach((t) => {
    const debit = t.debit == null
      ? (t.kind === 'شهریه_بدهی' ? toTuitionAmount(t.amount) : 0)
      : toTuitionAmount(t.debit);
    const credit = t.credit == null
      ? (t.kind === 'شهریه' || t.kind === 'تخفیف_شهریه' ? toTuitionAmount(t.amount) : 0)
      : toTuitionAmount(t.credit);
    totalDebit += debit;
    totalCredit += credit;
  });
  const balance = totalDebit - totalCredit;
  return {
    transactions: ledgerTransactions,
    totalDebit,
    totalCredit,
    balance,
    debt: Math.max(0, balance),
    credit: Math.max(0, -balance),
  };
}

export interface OverdueStudentInfo {
  student: Student;
  balance: number;
  overdueDays: number;
  oldestDebtDate: string; // ISO
  oldestDebtJalali: string;
  isOverdue30Days: boolean;
  formattedMessage: string;
}

export const DEFAULT_SMS_TEMPLATE =
  'اولیا محترم دانش‌آموز {نام_دانش‌آموز}، با سلام. مانده شهریه معوقه به مبلغ {مبلغ} ریال بیش از {تعداد_روز} روز است که از سررسید گذشته است. خواهشمند است جهت تسویه حساب به امور مالی {نام_مدرسه} مراجعه فرمایید.';

/**
 * Robust SMS template placeholder formatter supporting all Persian & English placeholder variations
 */
export const formatSmsTemplate = (
  template: string,
  student: Student,
  debt: number,
  overdueDays: number = 0
): string => {
  if (!template) return '';
  let msg = template;
  const name = (student.name || 'دانش‌آموز').trim();
  const school = (student.school_name || 'مدرسة القرآن').trim();
  const grade = (student.grade || '').trim();
  const nid = (student.national_id || '').trim();
  const formattedDebt = formatRial(debt);
  const formattedTomans = formatRial(Math.round(debt / 10));

  // Student name: {نام دانش آموز}, {نام دانش‌آموز}, {نام}, [نام دانش آموز], %نام%, etc.
  msg = msg.replace(
    /(\{|\[|%)(نام[\s_‌]*دانش[\s_‌]*آموز|دانش[\s_‌]*آموز|نام[\s_‌]*خانوادگی|نام|name)(\}|\]|%)/gi,
    name
  );

  // Amount in Rials: {مبلغ}, {بدهی}, {مانده بدهی}, {مبلغ بدهی}, [مبلغ], %مبلغ%, etc.
  msg = msg.replace(
    /(\{|\[|%)(مبلغ[\s_‌]*بدهی|مانده[\s_‌]*بدهی|بدهی|مبلغ[\s_‌]*شهریه|شهریه|مبلغ|amount|debt)(\}|\]|%)/gi,
    formattedDebt
  );

  // Amount in Tomans: {مبلغ تومان}, {تومان}, [تومان], etc.
  msg = msg.replace(
    /(\{|\[|%)(مبلغ[\s_‌]*به[\s_‌]*تومان|مبلغ[\s_‌]*تومان|تومان|tomans?)(\}|\]|%)/gi,
    formattedTomans
  );

  // School name: {نام مدرسه}, {مدرسه}, [مدرسه], etc.
  msg = msg.replace(
    /(\{|\[|%)(نام[\s_‌]*مدرسه|نام[\s_‌]*واحد|مدرسه|واحد|آموزشگاه|school)(\}|\]|%)/gi,
    school
  );

  // Overdue days: {تعداد روز}, {روز معوق}, {روز}, etc.
  msg = msg.replace(
    /(\{|\[|%)(تعداد[\s_‌]*روز|روزهای[\s_‌]*معوق|روز[\s_‌]*معوق|روز|days?)(\}|\]|%)/gi,
    overdueDays.toLocaleString('fa-IR')
  );

  // Grade: {پایه}, {کلاس}, etc.
  msg = msg.replace(/(\{|\[|%)(پایه[\s_‌]*تحصیلی|پایه|کلاس|grade)(\}|\]|%)/gi, grade);

  // National ID: {کد ملی}, {کدملی}, etc.
  msg = msg.replace(/(\{|\[|%)(کد[\s_‌]*ملی|کدملی|شناسه[\s_‌]*ملی|national[\s_‌]*id)(\}|\]|%)/gi, nid);

  // Date / Today
  msg = msg.replace(/(\{|\[|%)(تاریخ|امروز|date|today)(\}|\]|%)/gi, jalaliFromGregorian(todayGregorian()));

  return msg;
};

export function calculateStudentOverdue(
  student: Student,
  transactions: Transaction[],
  template?: string
): OverdueStudentInfo {
  const ledger = calculateStudentTuitionBalance(student.id, transactions);
  const studentTxs = ledger.transactions;
  const totalCredit = ledger.totalCredit;
  const balance = ledger.balance;

  if (balance <= 0) {
    return {
      student,
      balance: 0,
      overdueDays: 0,
      oldestDebtDate: todayGregorian(),
      oldestDebtJalali: jalaliFromGregorian(todayGregorian()),
      isOverdue30Days: false,
      formattedMessage: '',
    };
  }

  // Find tuition debts sorted by date ascending
  const debtTxs = studentTxs
    .filter((t) => t.kind === 'شهریه_بدهی' && (t.debit || 0) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Determine oldest unpaid debt
  let remainingCredit = totalCredit;
  let oldestUnpaidDate = debtTxs.length > 0 ? debtTxs[0].date : todayGregorian();

  for (const dt of debtTxs) {
    const debtAmount = dt.debit || dt.amount || 0;
    if (remainingCredit >= debtAmount) {
      remainingCredit -= debtAmount;
    } else {
      oldestUnpaidDate = dt.date;
      break;
    }
  }

  const now = new Date();
  const debtDateObj = new Date(oldestUnpaidDate);
  const diffTime = Math.max(0, now.getTime() - debtDateObj.getTime());
  const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue30Days = overdueDays >= 30;

  const tmpl = template || DEFAULT_SMS_TEMPLATE;
  const formattedMessage = formatSmsTemplate(tmpl, student, balance, overdueDays);

  return {
    student,
    balance,
    overdueDays,
    oldestDebtDate: oldestUnpaidDate,
    oldestDebtJalali: jalaliFromGregorian(oldestUnpaidDate),
    isOverdue30Days,
    formattedMessage,
  };
}
