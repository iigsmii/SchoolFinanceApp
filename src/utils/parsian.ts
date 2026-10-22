import * as XLSX from 'xlsx';
import { Transaction, Student, School, ExpenseCategory, Cheque, ParsianJournalEntry, JournalEntryRow, ParsianCodingConfig } from '../types';
import { jalaliFromGregorian } from './jalali';

export const DEFAULT_PARSIAN_CODING: ParsianCodingConfig = {
  kol_receivable: '11', // حساب‌های دریافتنی (دانش‌آموزان)
  kol_bank: '10',       // موجودی نقد و بانک
  kol_cheques: '12',    // اسناد دریافتنی (چک‌های صیادی)
  kol_income: '70',     // درآمد شهریه و آموزش
  kol_discount: '71',   // تخفیفات و بورسیه شهریه
  kol_expense: '60',    // هزینه‌های اداری، جاری و آموزشی
  kol_petty_cash: '20', // تنخواه گردان مدیران
  kol_payable: '21',    // حساب‌های پرداختنی
};

export function getSchoolMoeen(schoolId: number): number {
  switch (schoolId) {
    case 1: return 3; // دبستان نور ۱
    case 2: return 4; // دبستان نور ۲
    case 3: return 1; // دبستان تبیان ۱
    case 4: return 2; // دبستان تبیان ۲
    case 5: return 10; // مهد مرکزی صبح
    case 6: return 11; // مهد مرکزی عصر
    case 7: return 12; // مهد ابراهیم خلیل
    case 8: return 14; // مهد منظریه
    case 9: return 9; // مهد سروستان
    case 10: return 13; // مرکز قرآنی
    default: return (schoolId % 20) || 1;
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
    generalCode: '11',
    moeenCode: String(moeen),
    tafsiliCode: cleanId || '—',
    fullCode: cleanId ? `${cleanId}-${moeen}-11` : '—',
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
      // بدهکار: حساب‌های دریافتنی (تفصیلی: دانش‌آموز)
      // بستانکار: درآمد شهریه (معین: مدرسه مربوطه)
      const amount = t.debit || t.amount || 0;
      if (amount <= 0) continue;

      const descItem = t.description || 'شهریه تحصیلی مصوب';

      // ردیف ۱: بدهکار (حساب‌های دریافتنی)
      rows.push({
        row_number: 1,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: codingConfig.kol_receivable,
        kol_name: 'حساب‌های دریافتنی',
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
        kol_name: 'درآمدهای آموزشی و شهریه',
        moeen_code: schoolMoeen,
        moeen_name: `درآمد شهریه ${schoolName}`,
        tafsili_code: String(t.school_id),
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
        : codingConfig.kol_bank;

      const debitKolName = isDiscount
        ? 'تخفیفات و بورسیه شهریه'
        : isCheque
        ? 'اسناد دریافتنی (چک‌های صیادی)'
        : isCash
        ? 'موجودی نقد و صندوق'
        : 'موجودی نقد و بانک';

      const debitMoeenName = isDiscount
        ? `تخفیف مصوب ${schoolName}`
        : isCash
        ? `صندوق مرکزی ${schoolName}`
        : `حساب بانکی ${schoolName} (کارتخوان/کارت)`;

      // ردیف ۱: بدهکار (بانک/صندوق/تخفیف)
      rows.push({
        row_number: 1,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: debitKol,
        kol_name: debitKolName,
        moeen_code: schoolMoeen,
        moeen_name: debitMoeenName,
        tafsili_code: t.pos_terminal_number || t.tracking_code || String(t.school_id),
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

      // ردیف ۲: بستانکار (حساب دریافتنی دانش‌آموز)
      rows.push({
        row_number: 2,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: codingConfig.kol_receivable,
        kol_name: 'حساب‌های دریافتنی',
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
        moeen_code: schoolMoeen,
        moeen_name: `تخفیفات ${schoolName}`,
        tafsili_code: String(t.school_id),
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

      // ردیف ۲: بستانکار (حساب دریافتنی دانش‌آموز)
      rows.push({
        row_number: 2,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: codingConfig.kol_receivable,
        kol_name: 'حساب‌های دریافتنی',
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
      const catMoeenCode = String(t.expense_category_id || '10');
      const isPettyCash = t.payment_source === 'petty_cash';

      const creditKol = isPettyCash ? codingConfig.kol_petty_cash : codingConfig.kol_bank;
      const creditKolName = isPettyCash ? 'حساب تنخواه گردان' : 'موجودی نقد و بانک';
      const creditMoeenName = isPettyCash ? `تنخواه مدیر ${schoolName}` : `بانک اصلی ${schoolName}`;

      // ردیف ۱: بدهکار (سرفصل هزینه)
      rows.push({
        row_number: 1,
        doc_number: docNumberCounter,
        date_jalali: jalaliDate,
        kol_code: codingConfig.kol_expense,
        kol_name: 'هزینه‌های اداری، آموزشی و عمومی',
        moeen_code: catMoeenCode,
        moeen_name: catName,
        tafsili_code: String(t.school_id),
        tafsili_name: schoolName,
        description: `${catName} - ${t.comment || t.description || 'هزینه جاری'}`,
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
        moeen_code: schoolMoeen,
        moeen_name: creditMoeenName,
        tafsili_code: t.petty_cash_card || t.tracking_code || String(t.school_id),
        tafsili_name: isPettyCash ? `کارت تنخواه (${t.petty_cash_card || schoolName})` : `حساب بانک ${schoolName}`,
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
        description: `ثبت سند هزینه: ${catName} (${amount.toLocaleString('fa-IR')} ریال)`,
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
