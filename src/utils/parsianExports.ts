import * as XLSX from 'xlsx';
import {
  BankAccount,
  Cheque,
  ParsianCodingConfig,
  ParsianJournalEntry,
  School,
  StaffMember,
  Student,
  Transaction,
} from '../types';
import { jalaliFromGregorian, latinDigits } from './jalali';
import { saveOrShareFile } from './fileDownload';
import { DEFAULT_PARSIAN_CODING, getSchoolExpenseKol, getSchoolMoeen } from './parsian';

/**
 * Parsian's "import from Excel" dialogs require: .xls extension, sheet named "sheet1",
 * and the first row holding the column names. Every export here follows that.
 */

export type Cell = string | number | null;

export interface ParsianExportFile {
  key: 'payable_cheques' | 'receivable_cheques' | 'detail_accounts' | 'documents';
  /** file name prefix without date/extension */
  baseName: string;
  headers: string[];
  rows: Cell[][];
  /** human readable remarks shown to the user (skipped rows, fallbacks...) */
  notes: string[];
}

export const PAYABLE_CHEQUE_HEADERS = [
  'chk_Num', 'Acc_Num', 'RecDate', 'Money',
  'ACC_K', 'ACC_M', 'ACC_T',
  'Bank_K', 'Bank_M', 'Bank_T',
  'Comment', 'Taraf_K', 'Taraf_M', 'Taraf_T',
];

export const RECEIVABLE_CHEQUE_HEADERS = [
  'Row', 'Chk_Num', 'AccNum', 'RecDate', 'Money',
  'Acc_K', 'Acc_M', 'Acc_T',
  'Bank', 'Comment', 'Taraf_K', 'Taraf_M', 'Taraf_T',
];

export const DETAIL_ACCOUNT_HEADERS = [
  'تفصیلی', 'معین', 'کل', 'نام حساب', 'تلفن', 'موبایل', 'آدرس',
  'کد اقتصادی', 'کد ملی', 'کد پستی', 'پیش شماره', 'کد استان', 'کد شهر',
];

export const DOCUMENT_HEADERS = ['کل', 'معین', 'تفصیلی', 'نام حساب', 'بدهکار', 'بستانکار', 'شرح آرتیکل'];

const digitsOnly = (v: unknown): string => latinDigits(String(v ?? '')).replace(/\D/g, '');

/** Account codes are numeric in Parsian. Returns null when the value is not a usable code. */
function toCode(v: unknown): number | null {
  const d = digitsOnly(v);
  if (!d || d.length > 15) return null;
  return Number(d);
}

/** Numbers up to 15 digits stay numeric (Excel precision limit); longer ids (Sayad) stay text. */
function numericOrText(v: unknown): Cell {
  const raw = latinDigits(String(v ?? '')).trim();
  if (!raw) return null;
  return /^\d{1,15}$/.test(raw) ? Number(raw) : raw;
}

function jalaliDate(v?: string): string {
  return v ? jalaliFromGregorian(v) : '';
}

export const isChequeTransaction = (t: Transaction): boolean => !!t.payment_method && t.payment_method.includes('چک');

function inRange(date: string, from: string, to: string): boolean {
  const d = latinDigits(date || '');
  if (from && d && d < latinDigits(from)) return false;
  if (to && d && d > latinDigits(to)) return false;
  return true;
}

export interface ExportFilters {
  schoolId: number; // 0 = all schools
  startDate: string; // Jalali yyyy/mm/dd or empty
  endDate: string;
}

// ---------------------------------------------------------------------------
// 1) Payable cheques (چک‌های پرداختنی)
// ---------------------------------------------------------------------------
export function buildPayableChequesFile(
  transactions: Transaction[],
  schools: School[],
  bankAccounts: BankAccount[],
  config: ParsianCodingConfig,
  filters: ExportFilters
): ParsianExportFile {
  const notes: string[] = [];
  const rows: Cell[][] = [];
  const schoolMap = new Map(schools.map((s) => [s.id, s]));
  let missingDue = 0;
  let noBankAccount = 0;

  transactions.forEach((t) => {
    if (t.kind !== 'هزینه' || !isChequeTransaction(t)) return;
    if (t.review_status === 'rejected') return;
    if (filters.schoolId > 0 && t.school_id !== filters.schoolId) return;
    const amount = t.debit || t.amount || 0;
    if (amount <= 0) return;

    // Paid cheques are stored as one text line: "پرداخت چک به: X | شرح | بانک: Y | سررسید: Z"
    const parts = (t.description || '').split('|').map((p) => p.trim());
    const payee = (parts[0] || '').replace(/^پرداخت چک به:\s*/, '').trim();
    const memo = parts[1] || '';
    const dueRaw = (t.description || '').match(/سررسید:\s*([0-9۰-۹\/\-.]+)/)?.[1];
    if (!dueRaw) missingDue += 1;
    const dueJalali = jalaliDate(dueRaw || t.date);
    if (!inRange(dueJalali, filters.startDate, filters.endDate)) return;

    const school = schoolMap.get(t.school_id);
    const bankAcc = bankAccounts.find((b) => b.school_id === t.school_id && b.is_active);
    if (!bankAcc) noBankAccount += 1;

    const payeeKol = school?.expense_kol_code ?? getSchoolExpenseKol(t.school_id);
    const comment = ['پرداخت چک', payee && `به ${payee}`, memo].filter(Boolean).join(' - ');

    rows.push([
      numericOrText(t.tracking_code),
      numericOrText(bankAcc?.account_number),
      dueJalali,
      amount,
      payeeKol,
      2,
      toCode(school?.tafsili_code ?? t.school_id) ?? 0,
      toCode(bankAcc?.kol_code) ?? toCode(config.kol_bank) ?? 11,
      toCode(bankAcc?.moeen_code) ?? 1,
      toCode(bankAcc?.tafsili_code) ?? 0,
      comment,
      toCode(config.kol_payable ?? DEFAULT_PARSIAN_CODING.kol_payable) ?? 22,
      1,
      0,
    ]);
  });

  if (missingDue) notes.push(`${missingDue} چک تاریخ سررسید نداشت؛ تاریخ ثبت جایگزین شد.`);
  if (noBankAccount) notes.push(`${noBankAccount} چک مدرسه‌ای بدون حساب بانکی فعال دارد؛ کد بانک از تنظیمات کدینگ (معین ۱، تفصیلی ۰) پر شد.`);
  notes.push('شماره چک = شناسه صیادی ثبت‌شده؛ طرف حساب = سرفصل هزینه مدرسه (معین ۲) چون طرف حساب در برنامه کد پارسیان ندارد.');

  return { key: 'payable_cheques', baseName: 'Parsian_Payable_Cheques', headers: PAYABLE_CHEQUE_HEADERS, rows, notes };
}

// ---------------------------------------------------------------------------
// 2) Receivable cheques (چک‌های دریافتنی)
// ---------------------------------------------------------------------------
export function buildReceivableChequesFile(
  cheques: Cheque[],
  students: Student[],
  schools: School[],
  config: ParsianCodingConfig,
  filters: ExportFilters
): ParsianExportFile {
  const notes: string[] = [];
  const rows: Cell[][] = [];
  const studentMap = new Map(students.map((s) => [s.id, s]));
  let skippedGuarantee = 0;
  let noStudent = 0;
  let rowNo = 1;

  cheques.forEach((c) => {
    if (c.status === 'rejected') return;
    if (filters.schoolId > 0 && c.school_id !== filters.schoolId) return;
    if (c.cheque_type === 'guarantee' || c.cheque_purpose === 'guarantee' || c.cheque_purpose === 'staff_guarantee') {
      skippedGuarantee += 1;
      return;
    }
    if (!(c.amount > 0)) return;
    const due = jalaliDate(c.due_date);
    if (!inRange(due, filters.startDate, filters.endDate)) return;

    const student = c.student_id ? studentMap.get(c.student_id) : undefined;
    const tafsili = toCode(student?.national_id);
    if (tafsili === null) noStudent += 1;

    const owner = c.student_name || student?.name || c.issuer_name || '';
    const comment = ['چک شهریه', owner, c.note].filter(Boolean).join(' - ');

    rows.push([
      rowNo,
      numericOrText(c.cheque_number || c.sayad_id),
      null,
      due,
      c.amount,
      toCode(config.kol_receivable) ?? 67,
      getSchoolMoeen(c.school_id),
      tafsili ?? 0,
      c.bank_name || null,
      comment,
      toCode(config.kol_cheques) ?? 13,
      1,
      0,
    ]);
    rowNo += 1;
  });

  if (skippedGuarantee) notes.push(`${skippedGuarantee} چک ضمانتی در این فایل نیامد (اسناد دریافتنی عادی نیستند).`);
  if (noStudent) notes.push(`${noStudent} چک دانش‌آموز/کد ملی معتبر نداشت؛ تفصیلی ۰ گذاشته شد.`);
  notes.push('صاحب چک = حساب شهریه دانش‌آموز (کل ۶۷، معین مدرسه، تفصیلی کد ملی)؛ طرف بدهکار = اسناد دریافتنی.');

  return { key: 'receivable_cheques', baseName: 'Parsian_Receivable_Cheques', headers: RECEIVABLE_CHEQUE_HEADERS, rows, notes };
}

// ---------------------------------------------------------------------------
// 3) Detail accounts (حساب‌های تفصیلی)
// ---------------------------------------------------------------------------
function mobileOf(...candidates: Array<string | undefined>): number | null {
  for (const c of candidates) {
    const d = digitsOnly(c).replace(/^98/, '0');
    if (/^09\d{9}$/.test(d)) return Number(d.slice(1));
  }
  return null;
}

export function buildDetailAccountsFile(
  students: Student[],
  staff: StaffMember[],
  config: ParsianCodingConfig,
  filters: ExportFilters
): ParsianExportFile {
  const notes: string[] = [];
  const rows: Cell[][] = [];
  const seen = new Set<string>();
  let badStudents = 0;
  let uncodedStaff = 0;

  students.forEach((s) => {
    if (!s.active) return;
    if (filters.schoolId > 0 && s.school_id !== filters.schoolId) return;
    const nid = digitsOnly(s.national_id);
    if (nid.length !== 10 || s.needs_fix) {
      badStudents += 1;
      return;
    }
    const key = `${toCode(config.kol_receivable) ?? 67}-${getSchoolMoeen(s.school_id)}-${nid}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push([
      Number(nid),
      getSchoolMoeen(s.school_id),
      toCode(config.kol_receivable) ?? 67,
      s.name,
      null,
      mobileOf(s.phone, s.father_phone, s.mother_phone),
      null,
      null,
      Number(nid),
      null,
      null,
      null,
      null,
    ]);
  });

  staff.forEach((m) => {
    if (!m.active) return;
    if (filters.schoolId > 0 && m.school_id !== filters.schoolId) return;
    const kol = toCode(m.kol_code);
    const moeen = toCode(m.moeen_code);
    const tafsili = toCode(m.tafsili_code);
    if (kol === null || moeen === null || tafsili === null) {
      uncodedStaff += 1;
      return;
    }
    const key = `${kol}-${moeen}-${tafsili}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push([
      tafsili,
      moeen,
      kol,
      m.name,
      null,
      mobileOf(m.phone),
      null,
      null,
      toCode(m.national_id),
      null,
      null,
      null,
      null,
    ]);
  });

  if (badStudents) notes.push(`${badStudents} دانش‌آموز به‌خاطر کد ملی نامعتبر یا نیاز به اصلاح در فایل نیامد.`);
  if (uncodedStaff) notes.push(`${uncodedStaff} نفر از پرسنل کد کل/معین/تفصیلی کامل نداشت و در فایل نیامد.`);
  notes.push('کد ملی با صفر ابتدایی به‌صورت عدد ذخیره می‌شود (صفر ابتدایی حذف می‌شود)؛ پیش از ورود نهایی با یک رکورد آزمایشی چک شود.');

  return { key: 'detail_accounts', baseName: 'Parsian_Detail_Accounts', headers: DETAIL_ACCOUNT_HEADERS, rows, notes };
}

// ---------------------------------------------------------------------------
// 4) Accounting documents (اسناد حسابداری)
// ---------------------------------------------------------------------------
export function buildDocumentsFile(entries: ParsianJournalEntry[]): ParsianExportFile {
  const notes: string[] = [];
  const rows: Cell[][] = [];
  let badTafsili = 0;
  let debit = 0;
  let credit = 0;

  entries.forEach((e) => {
    e.rows.forEach((r) => {
      let tafsili = toCode(r.tafsili_code);
      if (tafsili === null) {
        badTafsili += 1;
        tafsili = 0;
      }
      debit += r.debit || 0;
      credit += r.credit || 0;
      rows.push([
        toCode(r.kol_code) ?? 0,
        toCode(r.moeen_code) ?? 0,
        tafsili,
        (r.tafsili_name || r.moeen_name || '').replace(/\s*\(کد تفصیلی:[^)]*\)/, ''),
        r.debit || 0,
        r.credit || 0,
        `${r.date_jalali} - ${r.description}`,
      ]);
    });
  });

  if (badTafsili) notes.push(`${badTafsili} ردیف کد تفصیلی عددی نداشت (مثلاً کد پیگیری) و ۰ شد؛ قبل از ورود در پارسیان بررسی شود.`);
  if (debit !== credit) notes.push('جمع بدهکار و بستانکار برابر نیست؛ پارسیان این فایل را نمی‌پذیرد.');
  notes.push('کل ردیف‌ها طبق گزینه‌ی پارسیان در «آخرین سند» ثبت می‌شود. تراکنش‌های چکی در این فایل نیستند، چون با فایل‌های چک وارد می‌شوند.');

  return { key: 'documents', baseName: 'Parsian_Documents', headers: DOCUMENT_HEADERS, rows, notes };
}

// ---------------------------------------------------------------------------
// Writer: .xls (BIFF8) with sheet name "sheet1" — what Parsian's importer expects
// ---------------------------------------------------------------------------
export function buildXlsBase64(headers: string[], rows: Cell[][]): string {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'sheet1');
  return XLSX.write(wb, { bookType: 'biff8', type: 'base64' });
}

export async function exportParsianFile(file: ParsianExportFile): Promise<string> {
  const dateStr = jalaliFromGregorian(new Date().toISOString()).replace(/\//g, '-');
  const fileName = `${file.baseName}_${dateStr}.xls`;
  await saveOrShareFile({
    fileName,
    base64: buildXlsBase64(file.headers, file.rows),
    mimeType: 'application/vnd.ms-excel',
    dialogTitle: 'ذخیره یا ارسال فایل پارسیان',
  });
  return fileName;
}
