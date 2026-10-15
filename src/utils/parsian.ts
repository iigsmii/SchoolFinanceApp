import * as XLSX from 'xlsx';
import { Transaction, Student, School } from '../types';
import { jalaliFromGregorian } from './jalali';

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
  const cleanId = nationalId.trim();
  const moeen = getSchoolMoeen(schoolId);
  return {
    generalCode: '67',
    moeenCode: String(moeen),
    tafsiliCode: cleanId || '—',
    fullCode: cleanId ? `${cleanId}-${moeen}-67` : '—',
  };
}

export function exportParsianExcel(
  transactions: Transaction[],
  students: Student[],
  schools: School[],
  targetSchoolId?: number
) {
  const studentMap = new Map<number, Student>();
  students.forEach((s) => studentMap.set(s.id, s));

  const schoolMap = new Map<number, School>();
  schools.forEach((sc) => schoolMap.set(sc.id, sc));

  const filtered = targetSchoolId && targetSchoolId > 0
    ? transactions.filter((t) => t.school_id === targetSchoolId)
    : transactions;

  const rows = filtered.map((t, idx) => {
    const student = t.student_id ? studentMap.get(t.student_id) : undefined;
    const nationalId = student?.national_id || '';
    const moeen = getSchoolMoeen(t.school_id);
    const parsianAccCode = nationalId ? `${nationalId}-${moeen}-67` : `0-${moeen}-67`;
    const schoolObj = schoolMap.get(t.school_id);

    return {
      'ردیف': idx + 1,
      'شماره سند': t.id,
      'تاریخ شمسی': jalaliFromGregorian(t.date),
      'کد حساب پارسیان': parsianAccCode,
      'نام مدرسه': schoolObj?.name || t.school_name || 'مدرسه',
      'نام طرف حساب': student?.name || t.student_name || t.expense_category_name || 'متفرقه',
      'کد ملی تفصیلی': nationalId,
      'بدهکار (ریال)': t.debit,
      'بستانکار (ریال)': t.credit,
      'نوع سند': t.kind === 'شهریه_بدهی' ? 'بدهی شهریه' : t.kind === 'شهریه' ? 'دریافت شهریه' : 'هزینه جاری',
      'شرح سند': t.description || t.comment || '',
      'روش پرداخت / پیگیری': `${t.payment_method || ''} ${t.tracking_code ? `(کد: ${t.tracking_code})` : ''}`.trim(),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'اسناد پارسیان');

  // Trigger browser download
  const dateStr = jalaliFromGregorian(new Date().toISOString()).replace(/\//g, '-');
  const filename = `parsian_export_${targetSchoolId ? `school_${targetSchoolId}_` : 'all_'}${dateStr}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
