import { Student, Transaction } from '../types';
import { formatRial, jalaliFromGregorian, todayGregorian } from './jalali';

export interface OverdueStudentInfo {
  student: Student;
  balance: number;
  overdueDays: number;
  oldestDebtDate: string; // ISO
  oldestDebtJalali: string;
  isOverdue30Days: boolean;
  formattedMessage: string;
}

// NOTE: placeholders here MUST stay in sync with the renderer used by
// AppContext.sendSmsReminder() and SmsScreen.getFormattedMessage(), which
// replace the tokens {name} {school} {amount} {days}.
export const DEFAULT_SMS_TEMPLATE =
  'اولیا محترم دانش‌آموز {name}، با سلام. مانده شهریه معوقه به مبلغ {amount} ریال بیش از {days} روز است که از سررسید گذشته است. خواهشمند است جهت تسویه حساب به امور مالی {school} مراجعه فرمایید.';

export function calculateStudentOverdue(
  student: Student,
  transactions: Transaction[],
  template?: string
): OverdueStudentInfo {
  const studentTxs = transactions.filter((t) => t.student_id === student.id);
  let totalDebit = 0;
  let totalCredit = 0;
  studentTxs.forEach((t) => {
    totalDebit += t.debit || 0;
    totalCredit += t.credit || 0;
  });
  const balance = totalDebit - totalCredit;

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
  const formattedMessage = tmpl
    .replace(/{name}/g, student.name)
    .replace(/{amount}/g, formatRial(balance))
    .replace(/{days}/g, overdueDays.toLocaleString('fa-IR'))
    .replace(/{school}/g, student.school_name || 'مدرسه');

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
