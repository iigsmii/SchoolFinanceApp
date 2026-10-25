import * as XLSX from 'xlsx';
import { Transaction, Student, School, ExpenseCategory, Cheque, ParsianJournalEntry, JournalEntryRow, ParsianCodingConfig } from '../types';
import { jalaliFromGregorian } from './jalali';

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

/**
 * Returns Moeen account number under Kol 67 (گردش حساب شهریه دانش آموزان)
 */
export function getSchoolMoeen(schoolId: number): number {
  switch (schoolId) {
    case 1: return 3;  // دبستان نور ۱ (Moeen 3)
    case 2: return 4;  // دبستان نور ۲ (Moeen 4)
    case 3: return 1;  // دبستان تبیان ۱ (Moeen 1)
    case 4: return 2;  // دبستان تبیان ۲ (Moeen 2)
    case 5: return 10; // مهد مرکزی صبح (Moeen 10)
    case 6: return 11; // مهد مرکزی عصر (Moeen 11)
    case 7: return 12; // مهد ابراهیم خلیل (Moeen 12)
    case 8: return 9;  // مهد منظریه (Moeen 9)
    case 9: return 14; // مهد سروستان (Moeen 14)
    case 10: return 2; // مهد تبیان ۲ (مشترک / Moeen 2)
    case 11: return 13;// مهد کوچه برهان (Moeen 13)
    default: return (schoolId % 14) || 1;
  }
}

/**
 * Returns exact Kol account number for a school's separate expenses (هزینه‌های تفکیک‌شده هر واحد آموزشی)
 */
export function getSchoolExpenseKol(schoolId: number): number {
  switch (schoolId) {
    case 1: return 68; // هزینه‌های دبستان نور ۱
    case 2: return 69; // هزینه‌های دبستان نور ۲
    case 3: return 70; // هزینه‌های دبستان تبیان ۱
    case 4: return 71; // هزینه‌های دبستان تبیان ۲
    case 5: return 73; // هزینه‌های پیش دبستانی نوبت صبح مدرسه القران
    case 6: return 75; // هزینه‌های پیش دبستانی نوبت عصر مدرسه القران
    case 7: return 76; // هزینه‌های پیش دبستانی ابراهیم خلیل
    case 8: return 74; // هزینه‌های پیش دبستانی منظریه
    case 9: return 78; // هزینه‌های پیش دبستانی سروستان
    case 10: return 81;// هزینه‌های مهدالرضا
    case 11: return 77;// هزینه‌های پیش دبستانی کوچه برهان
    default: return 50;// هزینه‌های عمومی کل مجموعه
  }
}

/**
 * Returns Moeen account number under Kol 40 (درآمدهای مردمی وخیرین)
 */
export function getSchoolIncomeMoeen(schoolId: number): number {
  switch (schoolId) {
    case 1: return 1;  // درآمد شهریه دبستان نور 1
    case 2: return 2;  // درآمد شهریه دبستان نور 2
    case 3: return 3;  // درآمد شهریه دبستان تبیان 1
    case 4: return 4;  // درآمد شهریه دبستان تبیان 2
    case 5: return 10; // درآمد شهریه پیش دبستانی صبح مدرسه القران
    case 6: return 8;  // درآمد شهریه پیش دبستانی نوبت عصر مدرسه القران
    case 7: return 5;  // درآمد شهریه پیش دبستانی ابراهیم خلیل
    case 8: return 9;  // درآمد شهریه پیش دبستانی منظریه
    case 9: return 7;  // درآمد شهریه پیش دبستانی سروستان
    case 10: return 4; // درآمد شعب تبیان
    case 11: return 6; // درآمد شهریه پیش دبستانی کوچه برهان
    default: return (schoolId % 14) || 1;
  }
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
  codingConfig: ParsianCodingConfig = DEFAULT_PARSIAN_CODING
): ParsianJournalEntry[] {
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

      // در پارسیان این مجموعه، هر مدرسه حساب کل هزینه اختصاصی دارد (کل ۶۸ تا ۸۱)
      const expenseKol = school?.expense_kol_code ? String(school.expense_kol_code) : String(getSchoolExpenseKol(t.school_id));
      const expenseKolName = `هزینه‌های ${schoolName}`;

      const creditKol = isPettyCash ? codingConfig.kol_petty_cash : codingConfig.kol_bank; // ۱۰ یا ۱۱
      const creditKolName = isPettyCash ? 'صندوق و تنخواه گردانها' : 'بانک ها';
      const creditMoeenCode = isPettyCash ? '2' : '1'; // ۲ = تنخواه گردانها در کل ۱۰
      const creditMoeenName = isPettyCash ? `تنخواه گردان - ${schoolName}` : `بانک اصلی - ${schoolName}`;

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
        tafsili_code: isPettyCash ? (t.petty_cash_card || tafsiliCode) : (t.tracking_code || tafsiliCode),
        tafsili_name: isPettyCash ? `کارت تنخواه (${t.petty_cash_card || schoolName})` : `حساب بانک ${schoolName} (تفصیلی: ${tafsiliCode})`,
        description: `پرداخت بابت ${catName} ${t.tracking_code ? `(پیگیری: ${t.tracking_code})` : ''}`.trim(),
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

  return entries;
}

/**
 * Standard Parsian Excel (.xlsx) file generator
 */
export function exportParsianStandardExcel(
  journalEntries: ParsianJournalEntry[],
  options?: {
    schoolName?: string;
    dateRangeLabel?: string;
  }
) {
  const flatRows: any[] = [];
  let rowCounter = 1;

  journalEntries.forEach((entry) => {
    entry.rows.forEach((r) => {
      flatRows.push({
        'ردیف': rowCounter++,
        'شماره سند': entry.doc_number,
        'تاریخ سند': entry.date_jalali,
        'کد کل': r.kol_code,
        'نام حساب کل': r.kol_name,
        'کد معین': r.moeen_code,
        'نام حساب معین': r.moeen_name,
        'کد تفصیلی': r.tafsili_code,
        'نام طرف حساب / تفصیلی': r.tafsili_name,
        'شرح آرتیکل سند': r.description,
        'بدهکار (ریال)': r.debit,
        'بستانکار (ریال)': r.credit,
        'شماره پیگیری / عطف': r.tracking_code || '',
        'کد مرکز هزینه': r.school_id,
        'مرکز هزینه / واحد آموزشی': r.school_name,
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(flatRows);

  // Set RTL and column widths
  worksheet['!cols'] = [
    { wch: 6 },  // ردیف
    { wch: 10 }, // شماره سند
    { wch: 12 }, // تاریخ
    { wch: 8 },  // کد کل
    { wch: 22 }, // نام کل
    { wch: 8 },  // کد معین
    { wch: 25 }, // نام معین
    { wch: 14 }, // کد تفصیلی
    { wch: 24 }, // نام تفصیلی
    { wch: 38 }, // شرح سند
    { wch: 15 }, // بدهکار
    { wch: 15 }, // بستانکار
    { wch: 16 }, // پیگیری
    { wch: 12 }, // کد مرکز هزینه
    { wch: 22 }, // مرکز هزینه
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'اسناد دوبل پارسیان');

  // Trigger download
  const dateStr = jalaliFromGregorian(new Date().toISOString()).replace(/\//g, '-');
  const targetLabel = options?.schoolName ? options.schoolName.replace(/\s+/g, '_') : 'all_schools';
  const filename = `Parsian_Journal_Vouchers_${targetLabel}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Parsian Text / CSV format (.txt / .csv) for legacy or direct diskette imports
 */
export function exportParsianDisketteTxt(journalEntries: ParsianJournalEntry[]) {
  const lines: string[] = [];
  // Standard header: DocNo, Date, Kol, Moeen, Tafsili, Description, Debit, Credit, RefNo
  lines.push(['شماره سند', 'تاریخ', 'کد کل', 'کد معین', 'کد تفصیلی', 'شرح سند', 'بدهکار', 'بستانکار', 'کد پیگیری'].join('\t'));

  journalEntries.forEach((entry) => {
    entry.rows.forEach((r) => {
      const cleanDesc = (r.description || '').replace(/[\t\r\n]/g, ' ');
      lines.push([
        entry.doc_number,
        entry.date_jalali,
        r.kol_code,
        r.moeen_code,
        r.tafsili_code,
        cleanDesc,
        r.debit,
        r.credit,
        r.tracking_code || '',
      ].join('\t'));
    });
  });

  const content = '\uFEFF' + lines.join('\r\n'); // UTF-8 BOM for Windows Notepad/Parsian
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = jalaliFromGregorian(new Date().toISOString()).replace(/\//g, '-');
  a.download = `Parsian_Diskette_Import_${dateStr}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
export function exportParsianTreeExcel(
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
  XLSX.writeFile(workbook, `Parsian_Chart_Of_Accounts_${dateStr}.xlsx`);
}

