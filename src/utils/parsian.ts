import * as XLSX from 'xlsx';
import { splitSettlementBySchool } from './claims';
import { Transaction, Student, School, ExpenseCategory, Cheque, ParsianJournalEntry, JournalEntryRow, ParsianCodingConfig, ClaimSettlement } from '../types';
import { jalaliFromGregorian } from './jalali';
import { saveOrShareFile } from './fileDownload';

export const DEFAULT_PARSIAN_CODING: ParsianCodingConfig = {
  kol_receivable: '67', // گردش حساب شهریه دانش آموزان
  kol_bank: '11',       // بانک ها
  kol_cheques: '13',    // اسناد دریافتنی
  kol_income: '40',     // درآمدهای مردمی وخیرین (شهریه)
  kol_discount: '3',    // تخفیفات شهریه
  kol_expense: '68',    // هزینه‌های تفکیک‌شده مدارس (۶۸ تا ۸۱)
  kol_petty_cash: '10', // صندوق و تنخواه گردانها
  kol_payable: '22',    // اسناد پرداختنی
};

// حساب‌ها بر اساس «کد مدرسه» (NOOR1, MAHD1, ...) که از شیت همگام می‌شود تعیین می‌شوند، نه شماره‌ی مدرسه؛
// بنابراین تغییر/جابه‌جایی مدرسه در شیت یا گوشی روی حسابداری اثری نمی‌گذارد.
interface SchoolAccounts { tuition: number; expense: number; income: number }
export const SCHOOL_ACCOUNTS_BY_CODE: Record<string, SchoolAccounts> = {
  NOOR1: { tuition: 3, expense: 68, income: 1 },
  NOOR2: { tuition: 4, expense: 69, income: 2 },
  TEBYAN1: { tuition: 1, expense: 70, income: 3 },
  TEBYAN2: { tuition: 2, expense: 71, income: 4 },
  MAHD1: { tuition: 10, expense: 73, income: 10 }, // مرکزی صبح
  MAHD2: { tuition: 11, expense: 75, income: 8 },  // مرکزی عصر
  MAHD3: { tuition: 12, expense: 76, income: 5 },  // ابراهیم خلیل
  MAHD4: { tuition: 14, expense: 78, income: 7 },  // سروستان
  MAHD5: { tuition: 9, expense: 74, income: 9 },   // منظریه
  MAHD6: { tuition: 13, expense: 77, income: 6 },
};

let schoolRegistry = new Map<number, School>();
/** Called by AppContext whenever the synced school list changes. */
export function setSchoolRegistry(list: School[]) {
  schoolRegistry = new Map(list.map((s) => [Number(s.id), s]));
}
function schoolAccounts(schoolId: number): { school?: School; acc?: SchoolAccounts } {
  const school = schoolRegistry.get(Number(schoolId));
  const code = String(school?.code || '').trim().toUpperCase();
  return { school, acc: SCHOOL_ACCOUNTS_BY_CODE[code] };
}

/**
 * Returns Moeen account number under Kol 67 (گردش حساب شهریه دانش آموزان)
 */
export function getSchoolMoeen(schoolId: number): number {
  const { school, acc } = schoolAccounts(schoolId);
  if (acc) return acc.tuition;
  return Number(school?.moeen_code) || (schoolId % 14) || 1;
}

/**
 * Returns exact Kol account number for a school's separate expenses (هزینه‌های تفکیک‌شده هر واحد آموزشی)
 */
export function getSchoolExpenseKol(schoolId: number): number {
  const { school, acc } = schoolAccounts(schoolId);
  return Number(school?.expense_kol_code) || acc?.expense || 50; // 50 = هزینه‌های عمومی کل مجموعه
}

/**
 * Returns Moeen account number under Kol 40 (درآمدهای مردمی وخیرین).
 * ستون moeen_code شیت همین معین درآمد است و بر جدول پیش‌فرض اولویت دارد.
 */
export function getSchoolIncomeMoeen(schoolId: number): number {
  const { school, acc } = schoolAccounts(schoolId);
  return Number(school?.income_moeen_code) || Number(school?.moeen_code) || acc?.income || (schoolId % 14) || 1;
}

export function buildParsianCode(nationalId: string, schoolId: number): {
  generalCode: string;
  moeenCode: string;
  tafsiliCode: string;
  fullCode: string;
} {
  const cleanId = (nationalId || '').trim();
  const moeen = getSchoolMoeen(schoolId);
  return {
    generalCode: '67',
    moeenCode: String(moeen),
    tafsiliCode: cleanId || '—',
    fullCode: cleanId ? `${cleanId}-${moeen}-67` : '—',
  };
}

/**
 * Transforms system transactions and approved cheques into balanced double-entry accounting vouchers (اسناد حسابداری دوبل)
 */
export function generateParsianJournalEntries(
  transactions: Transaction[],
  students: Student[],
  schools: School[],
  categories: ExpenseCategory[],
  cheques: Cheque[] = [],
  codingConfig: ParsianCodingConfig = DEFAULT_PARSIAN_CODING,
  managers: Array<{ id: number | string; name: string }> = [],
  settlements: ClaimSettlement[] = []
): ParsianJournalEntry[] {
  const managerName = (id: unknown) => managers.find((m) => String(m.id) === String(id))?.name || `مدیر ${id ?? ''}`.trim();
  const studentMap = new Map<number, Student>();
  students.forEach((s) => studentMap.set(s.id, s));

  const schoolMap = new Map<number, School>();
  schools.forEach((sc) => schoolMap.set(sc.id, sc));

  const categoryMap = new Map<string, ExpenseCategory>();
  categories.forEach((c) => categoryMap.set(String(c.id), c));

  // Sort transactions chronologically
  const sortedTxs = [...transactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  let docNumberCounter = 1;
  const entries: ParsianJournalEntry[] = [];

  for (const t of sortedTxs) {
    const student = t.student_id ? studentMap.get(t.student_id) : undefined;
    const school = schoolMap.get(t.school_id);
    const schoolName = school?.name || t.school_name || 'مرکز آموزشی';
    const schoolMoeen = String(getSchoolMoeen(t.school_id));
    const jalaliDate = t.jalali_date || jalaliFromGregorian(t.date);
    const studentNid = student?.national_id || '';
    const studentName = student?.name || t.student_name || 'دانش‌آموز';

    const rows: JournalEntryRow[] = [];

    if (t.kind === 'شهریه_بدهی') {
      // بدهی شهریه:
      // بدهکار: گردش حساب شهریه دانش‌آموزان (کل ۶۷، معین مدرسه مربوطه، تفصیلی: کدملی/دانش‌آموز)
      // بستانکار: درآمدهای مردمی و شهریه (کل ۴۰، معین درآمد مدرسه مربوطه)
      const amount = t.debit || t.amount || 0;
      if (amount <= 0) continue;

      const descItem = t.description || 'شهریه تحصیلی مصوب';
      const incomeMoeen = String(school?.income_moeen_code || getSchoolIncomeMoeen(t.school_id));

      // ردیف ۱: بدهکار (گردش حساب شهریه دانش آموزان)
      rows.push({
        row_number: 1,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: codingConfig.kol_receivable,
        kol_name: 'گردش حساب شهریه دانش آموزان',
        moeen_code: schoolMoeen,
        moeen_name: `شهریه دانش‌آموزان ${schoolName}`,
        tafsili_code: studentNid || String(student?.id || t.student_id || '0'),
        tafsili_name: studentName,
        description: `بدهی ${descItem} - ${studentName}`,
        debit: amount,
        credit: 0,
        tracking_code: t.tracking_code,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: 'tuition_debt',
        source_id: t.id,
      });

      // ردیف ۲: بستانکار (درآمد شهریه)
      rows.push({
        row_number: 2,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: codingConfig.kol_income,
        kol_name: 'درآمدهای مردمی وخیرین',
        moeen_code: incomeMoeen,
        moeen_name: `درآمد شهریه ${schoolName}`,
        tafsili_code: school?.tafsili_code || String(t.school_id),
        tafsili_name: schoolName,
        description: `شناسایی درآمد ${descItem} - ${studentName}`,
        debit: 0,
        credit: amount,
        tracking_code: t.tracking_code,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: 'tuition_debt',
        source_id: t.id,
      });

      entries.push({
        doc_number: docNumberCounter++,
        date_jalali: jalaliDate,
        date_iso: t.date,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: 'tuition_debt',
        source_id: t.id,
        description: `شناسایی بدهی شهریه: ${studentName}`,
        rows,
        total_debit: amount,
        total_credit: amount,
        is_balanced: true,
      });
    } else if (t.kind === 'شهریه' || t.kind === 'دریافت متفرقه') {
      const amount = t.credit || t.amount || 0;
      if (amount <= 0) continue;

      const isDiscount = t.payment_method?.includes('تخفیف') || t.description?.includes('تخفیف');
      const isBank = t.payment_method === 'کارت خوان' || t.payment_method === 'کارت به کارت';
      const isCash = t.payment_method === 'پول نقد';
      const isCheque = t.payment_method?.includes('چک');

      const debitKol = isDiscount
        ? codingConfig.kol_discount
        : isCheque
        ? codingConfig.kol_cheques
        : isCash
        ? codingConfig.kol_petty_cash
        : codingConfig.kol_bank;

      const debitKolName = isDiscount
        ? 'تخفیفات و بورسیه شهریه'
        : isCheque
        ? 'اسناد دریافتنی'
        : isCash
        ? 'صندوق و تنخواه گردانها'
        : 'بانک ها';

      const debitMoeenCode = isCash ? '1' : isCheque ? '1' : isBank ? '1' : '1';
      const debitMoeenName = isDiscount
        ? `تخفیف مصوب ${schoolName}`
        : isCash
        ? `صندوق مرکزی ${schoolName}`
        : isCheque
        ? `اسناد دریافتنی چک‌های شهریه ${schoolName}`
        : `بانک اصلی ${schoolName} (کارتخوان/کارت)`;

      // ردیف ۱: بدهکار (بانک/صندوق/اسناد دریافتنی)
      rows.push({
        row_number: 1,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: debitKol,
        kol_name: debitKolName,
        moeen_code: debitMoeenCode,
        moeen_name: debitMoeenName,
        tafsili_code: t.pos_terminal_number || t.tracking_code || school?.tafsili_code || String(t.school_id),
        tafsili_name: isCash ? `صندوق ${schoolName}` : `بانک ${schoolName}`,
        description: `${t.payment_method || 'دریافت شهریه'} بابت ${studentName} ${t.tracking_code ? `(پیگیری: ${t.tracking_code})` : ''}`.trim(),
        debit: amount,
        credit: 0,
        tracking_code: t.tracking_code,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: isDiscount ? 'discount' : 'tuition_payment',
        source_id: t.id,
      });

      // ردیف ۲: بستانکار (گردش حساب شهریه دانش آموزان)
      rows.push({
        row_number: 2,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: codingConfig.kol_receivable,
        kol_name: 'گردش حساب شهریه دانش آموزان',
        moeen_code: schoolMoeen,
        moeen_name: `شهریه دانش‌آموزان ${schoolName}`,
        tafsili_code: studentNid || String(student?.id || t.student_id || '0'),
        tafsili_name: studentName,
        description: `تسویه حساب شهریه توسط ${studentName} (${t.payment_method || 'واریز'})`,
        debit: 0,
        credit: amount,
        tracking_code: t.tracking_code,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: isDiscount ? 'discount' : 'tuition_payment',
        source_id: t.id,
      });

      entries.push({
        doc_number: docNumberCounter++,
        date_jalali: jalaliDate,
        date_iso: t.date,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: isDiscount ? 'discount' : 'tuition_payment',
        source_id: t.id,
        description: isDiscount ? `ثبت تخفیف شهریه: ${studentName}` : `دریافت وجه شهریه: ${studentName}`,
        rows,
        total_debit: amount,
        total_credit: amount,
        is_balanced: true,
      });
    } else if (t.kind === 'تخفیف_شهریه') {
      const amount = t.credit || t.amount || 0;
      if (amount <= 0) continue;

      // ردیف ۱: بدهکار (تخفیفات)
      rows.push({
        row_number: 1,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: codingConfig.kol_discount,
        kol_name: 'تخفیفات و بورسیه شهریه',
        moeen_code: '3',
        moeen_name: `تخفیفات ${schoolName}`,
        tafsili_code: school?.tafsili_code || String(t.school_id),
        tafsili_name: schoolName,
        description: `تخفیف شهریه ${studentName} - ${t.discount_reason || t.description || 'مصوب هیئت امنا'}`,
        debit: amount,
        credit: 0,
        tracking_code: t.tracking_code,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: 'discount',
        source_id: t.id,
      });

      // ردیف ۲: بستانکار (گردش حساب شهریه دانش آموزان)
      rows.push({
        row_number: 2,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: codingConfig.kol_receivable,
        kol_name: 'گردش حساب شهریه دانش آموزان',
        moeen_code: schoolMoeen,
        moeen_name: `شهریه دانش‌آموزان ${schoolName}`,
        tafsili_code: studentNid || String(student?.id || t.student_id || '0'),
        tafsili_name: studentName,
        description: `کاهش بدهی بابت تخفیف - ${studentName}`,
        debit: 0,
        credit: amount,
        tracking_code: t.tracking_code,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: 'discount',
        source_id: t.id,
      });

      entries.push({
        doc_number: docNumberCounter++,
        date_jalali: jalaliDate,
        date_iso: t.date,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: 'discount',
        source_id: t.id,
        description: `ثبت سند تخفیف شهریه: ${studentName}`,
        rows,
        total_debit: amount,
        total_credit: amount,
        is_balanced: true,
      });
    } else if (t.kind === 'هزینه') {
      const amount = t.debit || t.amount || 0;
      if (amount <= 0) continue;

      const catName = t.expense_category_name || (t.expense_category_id ? categoryMap.get(String(t.expense_category_id))?.name : undefined) || 'هزینه‌های جاری و عمومی';
      const catMoeenCode = String(t.expense_category_id || '2'); // ۲ = متفرقه در کدینگ پارسیان مدارس
      const isPettyCash = t.payment_source === 'petty_cash';
      // هزینه‌ای که مدیر از جیب خودش داده، بدهی مدرسه به مدیر است (نه خروج از بانک)
      const isOwnPocket = t.payment_source === 'own' || t.payment_source === 'own_settled';

      // در پارسیان این مجموعه، هر مدرسه حساب کل هزینه اختصاصی دارد (کل ۶۸ تا ۸۱)
      const expenseKol = school?.expense_kol_code ? String(school.expense_kol_code) : String(getSchoolExpenseKol(t.school_id));
      const expenseKolName = `هزینه‌های ${schoolName}`;

      // کارت‌های تن‌خواه به همان حساب بانک وصل‌اند؛ پس هزینه‌ی کارت هم بستانکار بانک است (نه تنخواه گردانها)
      const creditKol = isOwnPocket ? codingConfig.kol_payable : codingConfig.kol_bank; // ۲۲ یا ۱۱
      const creditKolName = isOwnPocket ? 'طلب مدیران (هزینه از حساب شخصی)' : 'بانک ها';
      const creditMoeenCode = '1';
      const creditMoeenName = isOwnPocket ? 'طلب مدیران از مدرسه' : `بانک اصلی - ${schoolName}`;

      const tafsiliCode = school?.tafsili_code || t.tafsili_code || String(t.school_id);

      // ردیف ۱: بدهکار (سرفصل هزینه اختصاصی مدرسه در حساب کل مربوطه)
      rows.push({
        row_number: 1,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: expenseKol,
        kol_name: expenseKolName,
        moeen_code: catMoeenCode,
        moeen_name: catName,
        tafsili_code: tafsiliCode,
        tafsili_name: `${schoolName} (کد تفصیلی: ${tafsiliCode})`,
        description: `${catName} - ${t.comment || t.description || 'هزینه جاری'} - ${schoolName}`,
        debit: amount,
        credit: 0,
        tracking_code: t.tracking_code,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: 'expense',
        source_id: t.id,
      });

      // ردیف ۲: بستانکار (بانک یا تنخواه)
      rows.push({
        row_number: 2,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: creditKol,
        kol_name: creditKolName,
        moeen_code: creditMoeenCode,
        moeen_name: creditMoeenName,
        tafsili_code: isOwnPocket ? String(t.registered_by ?? tafsiliCode) : (t.tracking_code || tafsiliCode),
        tafsili_name: isOwnPocket ? managerName(t.registered_by) : `حساب بانک ${schoolName} (تفصیلی: ${tafsiliCode})`,
        description: `پرداخت بابت ${catName} ${isPettyCash && t.petty_cash_card ? `(کارت تن‌خواه ${t.petty_cash_card}) ` : ''}${t.tracking_code ? `(پیگیری: ${t.tracking_code})` : ''}`.trim(),
        debit: 0,
        credit: amount,
        tracking_code: t.tracking_code,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: 'expense',
        source_id: t.id,
      });

      entries.push({
        doc_number: docNumberCounter++,
        date_jalali: jalaliDate,
        date_iso: t.date,
        school_id: t.school_id,
        school_name: schoolName,
        source_type: 'expense',
        source_id: t.id,
        description: `ثبت سند هزینه ${schoolName}: ${catName} (${amount.toLocaleString('fa-IR')} ریال)`,
        rows,
        total_debit: amount,
        total_credit: amount,
        is_balanced: true,
      });
    }
  }

  // اسناد تسویه‌ی طلب مدیران: بدهکار «طلب مدیر»، بستانکار بانک — به تفکیک مدرسه
  [...settlements]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((st) => {
      const perSchool = splitSettlementBySchool(st, transactions);
      const jalaliDate = jalaliFromGregorian(st.date);
      const mName = st.manager_name || managerName(st.manager_id);
      perSchool.forEach((amount, schoolId) => {
        if (amount <= 0) return;
        const school = schoolMap.get(schoolId);
        const schoolName = school?.name || 'مرکز آموزشی';
        const tafsiliCode = school?.tafsili_code || String(schoolId);
        const common = { doc_number: docNumberCounter, date_jalali: jalaliDate, tracking_code: st.tracking_code, school_id: schoolId, school_name: schoolName, source_type: 'claim_settlement' as const, source_id: Number(st.id) || 0 };
        const rows: JournalEntryRow[] = [
          { ...common, row_number: 1, kol_code: codingConfig.kol_payable, kol_name: 'طلب مدیران (هزینه از حساب شخصی)', moeen_code: '1', moeen_name: 'طلب مدیران از مدرسه', tafsili_code: String(st.manager_id), tafsili_name: mName, description: `تسویه طلب ${mName} - ${schoolName}${st.tracking_code ? ` (پیگیری: ${st.tracking_code})` : ''}`, debit: amount, credit: 0 },
          { ...common, row_number: 2, kol_code: codingConfig.kol_bank, kol_name: 'بانک ها', moeen_code: '1', moeen_name: `بانک اصلی - ${schoolName}`, tafsili_code: st.tracking_code || tafsiliCode, tafsili_name: `حساب بانک ${schoolName} (تفصیلی: ${tafsiliCode})`, description: `پرداخت به ${mName} بابت تسویه طلب`, debit: 0, credit: amount },
        ];
        entries.push({
          doc_number: docNumberCounter++,
          date_jalali: jalaliDate,
          date_iso: st.date,
          school_id: schoolId,
          school_name: schoolName,
          source_type: 'claim_settlement',
          source_id: Number(st.id) || 0,
          description: `تسویه طلب ${mName} (${amount.toLocaleString('fa-IR')} ریال) - ${schoolName}`,
          rows,
          total_debit: amount,
          total_credit: amount,
          is_balanced: true,
        });
      });
    });

  return entries;
}

/**
 * Generates standard Trial Balance (تراز آزمایشی ۲ و ۴ ستونی)
 */
export function calculateTrialBalance(journalEntries: ParsianJournalEntry[]): Array<{
  kol_code: string;
  kol_name: string;
  moeen_code: string;
  moeen_name: string;
  total_debit: number;
  total_credit: number;
  balance_debit: number;
  balance_credit: number;
}> {
  const map = new Map<string, {
    kol_code: string;
    kol_name: string;
    moeen_code: string;
    moeen_name: string;
    total_debit: number;
    total_credit: number;
  }>();

  journalEntries.forEach((entry) => {
    entry.rows.forEach((r) => {
      const key = `${r.kol_code}-${r.moeen_code}`;
      const curr = map.get(key) || {
        kol_code: r.kol_code,
        kol_name: r.kol_name,
        moeen_code: r.moeen_code,
        moeen_name: r.moeen_name,
        total_debit: 0,
        total_credit: 0,
      };
      curr.total_debit += r.debit;
      curr.total_credit += r.credit;
      map.set(key, curr);
    });
  });

  return Array.from(map.values())
    .sort((a, b) => a.kol_code.localeCompare(b.kol_code) || a.moeen_code.localeCompare(b.moeen_code))
    .map((item) => {
      const diff = item.total_debit - item.total_credit;
      return {
        ...item,
        balance_debit: diff > 0 ? diff : 0,
        balance_credit: diff < 0 ? Math.abs(diff) : 0,
      };
    });
}

/**
 * Export complete Parsian Chart of Accounts and School Mappings to Excel
 */
export async function exportParsianTreeExcel(
  accounts: Array<{
    code: string;
    name: string;
    category: string;
    total_tafsilis: number;
    moeens: Array<{
      code: string;
      name: string;
      tafsilis_count: number;
      sample_tafsilis: string[];
    }>;
  }>,
  mappings: Array<{
    school_id: number;
    school_name: string;
    tuition_kol: string;
    tuition_moeen: string;
    tuition_moeen_name: string;
    income_kol: string;
    income_moeen: string;
    income_moeen_name: string;
    expense_kol: string;
    expense_kol_name: string;
    tafsili_code: string;
  }>
) {
  const rows: any[] = [];
  let rowIdx = 1;

  accounts.forEach((k) => {
    k.moeens.forEach((m) => {
      rows.push({
        'ردیف': rowIdx++,
        'طبقه سرفصل': k.category,
        'کد کل': k.code,
        'نام حساب کل': k.name,
        'کد معین': m.code,
        'نام حساب معین': m.name,
        'تعداد حساب تفصیلی': m.tafsilis_count || 0,
        'نمونه حساب‌های تفصیلی': (m.sample_tafsilis || []).join('، '),
      });
    });
  });

  const wsAccounts = XLSX.utils.json_to_sheet(rows);
  wsAccounts['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 10 },
    { wch: 32 },
    { wch: 10 },
    { wch: 38 },
    { wch: 18 },
    { wch: 48 },
  ];

  const mapRows = mappings.map((m, idx) => ({
    'ردیف': idx + 1,
    'کد مرکز': m.school_id,
    'نام واحد آموزشی / مدرسه': m.school_name,
    'کد تفصیلی در سیستم': m.tafsili_code,
    'کد کل شهریه': m.tuition_kol,
    'کد معین شهریه (کل ۶۷)': m.tuition_moeen,
    'عنوان حساب شهریه': m.tuition_moeen_name,
    'کد کل درآمد': m.income_kol,
    'کد معین درآمد (کل ۴۰)': m.income_moeen,
    'عنوان معین درآمد': m.income_moeen_name,
    'کد کل هزینه اختصاصی': m.expense_kol,
    'سرفصل هزینه واحد': m.expense_kol_name,
  }));

  const wsMappings = XLSX.utils.json_to_sheet(mapRows);
  wsMappings['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 32 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 36 },
    { wch: 12 },
    { wch: 16 },
    { wch: 36 },
    { wch: 16 },
    { wch: 36 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsAccounts, 'درخت‌واره حساب‌های پارسیان');
  XLSX.utils.book_append_sheet(workbook, wsMappings, 'نگاشت مدارس مجموعه');

  const dateStr = jalaliFromGregorian(new Date().toISOString()).replace(/\//g, '-');
  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  await saveOrShareFile({
    fileName: `Parsian_Chart_Of_Accounts_${dateStr}.xlsx`,
    base64,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

