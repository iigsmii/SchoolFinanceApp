import {
  Student,
  School,
  Transaction,
  Cheque,
  ExpenseCategory,
  User,
  BankTransaction,
  StaffMember,
} from '../types';
import { buildParsianCode } from '../utils/parsian';
import { jalaliFromGregorian, todayGregorian } from '../utils/jalali';
import * as XLSX from 'xlsx';

export const DEFAULT_SPREADSHEET_ID = '1bFTL1edC-btgjp2KvvkwIM5WaJnycVFylTmFQQFRixk';

export interface SheetLoadResult {
  success: boolean;
  students: Student[];
  schools: School[];
  transactions: Transaction[];
  cheques: Cheque[];
  categories: ExpenseCategory[];
  managers: User[];
  bankTransactions: BankTransaction[];
  stats: {
    studentsCount: number;
    transactionsCount: number;
    chequesCount: number;
    expensesCount: number;
  };
  error?: string;
}

const cleanHeader = (h: any) =>
  String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\u200c\u200f\u202a-\u202e\s_-]/g, '');

// Fetch values from Google Sheets API v4
export const fetchSheetRange = async (
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<any[][]> => {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || response.statusText;
    throw new Error(`خطا در خواندن شیت (${response.status}): ${message}`);
  }

  const data = await response.json();
  return data.values || [];
};

// Append a single row to a sheet in Google Sheets
export const appendSheetRow = async (
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowValues: any[]
): Promise<boolean> => {
  const encodedRange = encodeURIComponent(`${sheetName}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `خطا در ذخیره در شیت (${response.status})`);
  }
  return true;
};

// Load and parse all school accounting data from the user's Google Sheet
export const loadAccountingDataFromGoogleSheets = async (
  accessToken: string,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<SheetLoadResult> => {
  try {
    // 1. Fetch Students
    let rawStudents: any[][] = [];
    try {
      rawStudents = await fetchSheetRange(accessToken, spreadsheetId, 'Students!A1:K');
    } catch (e) {
      console.warn('Could not load Students sheet:', e);
    }

    // 2. Fetch Schools
    let rawSchools: any[][] = [];
    try {
      rawSchools = await fetchSheetRange(accessToken, spreadsheetId, 'Schools!A1:E');
    } catch (e) {
      console.warn('Could not load Schools sheet:', e);
    }

    // 3. Fetch Tuition
    let rawTuition: any[][] = [];
    try {
      rawTuition = await fetchSheetRange(accessToken, spreadsheetId, 'Tuition!A1:N');
    } catch (e) {
      console.warn('Could not load Tuition sheet:', e);
    }

    // 4. Fetch Expenses
    let rawExpenses: any[][] = [];
    try {
      rawExpenses = await fetchSheetRange(accessToken, spreadsheetId, 'Expenses!A1:N');
    } catch (e) {
      console.warn('Could not load Expenses sheet:', e);
    }

    // 5. Fetch Cheques
    let rawCheques: any[][] = [];
    try {
      rawCheques = await fetchSheetRange(accessToken, spreadsheetId, 'Cheques!A1:T');
    } catch (e) {
      console.warn('Could not load Cheques sheet:', e);
    }

    // 6. Fetch Categories
    let rawCategories: any[][] = [];
    try {
      rawCategories = await fetchSheetRange(accessToken, spreadsheetId, 'ExpenseCategories!A1:D');
    } catch (e) {
      console.warn('Could not load ExpenseCategories sheet:', e);
    }

    // 7. Fetch Managers
    let rawManagers: any[][] = [];
    try {
      rawManagers = await fetchSheetRange(accessToken, spreadsheetId, 'Managers!A1:H');
    } catch (e) {
      console.warn('Could not load Managers sheet:', e);
    }

    // Parse Schools
    const schools: School[] = [];
    if (rawSchools.length > 1) {
      const headers = rawSchools[0].map(cleanHeader);
      const idIdx = headers.indexOf('id');
      const nameIdx = headers.indexOf('name');
      const codeIdx = headers.indexOf('code');
      const activeIdx = headers.indexOf('active');

      for (let i = 1; i < rawSchools.length; i++) {
        const row = rawSchools[i];
        if (!row || !row[nameIdx >= 0 ? nameIdx : 1]) continue;
        const id = Number(row[idIdx >= 0 ? idIdx : 0]) || i;
        const name = String(row[nameIdx >= 0 ? nameIdx : 1] || '');
        const code = String(row[codeIdx >= 0 ? codeIdx : 2] || '');
        const active = row[activeIdx >= 0 ? activeIdx : 3] !== false && String(row[activeIdx >= 0 ? activeIdx : 3]) !== 'false';
        schools.push({ id, name, code, active });
      }
    }

    // Helper map for school names
    const schoolMap = new Map<number, string>();
    schools.forEach((s) => schoolMap.set(s.id, s.name));

    // Parse Students
    const students: Student[] = [];
    if (rawStudents.length > 1) {
      const headers = rawStudents[0].map(cleanHeader);
      const idIdx = headers.indexOf('id');
      const nameIdx = headers.indexOf('name');
      const gradeIdx = headers.indexOf('grade');
      const phoneIdx = headers.indexOf('phone');
      const nidIdx = headers.indexOf('nationalid');
      const schoolIdx = headers.indexOf('schoolid');
      const activeIdx = headers.indexOf('active');

      for (let i = 1; i < rawStudents.length; i++) {
        const row = rawStudents[i];
        if (!row || !row[nameIdx >= 0 ? nameIdx : 1]) continue;
        const id = Number(row[idIdx >= 0 ? idIdx : 0]) || i;
        const name = String(row[nameIdx >= 0 ? nameIdx : 1] || '').trim();
        const grade = String(row[gradeIdx >= 0 ? gradeIdx : 2] || '').trim();
        let phone = String(row[phoneIdx >= 0 ? phoneIdx : 3] || '').trim();
        if (/^9\d{9}$/.test(phone)) phone = '0' + phone;
        let national_id = String(row[nidIdx >= 0 ? nidIdx : 4] || '').trim();
        if (national_id.length < 10 && national_id.length > 0) {
          national_id = national_id.padStart(10, '0');
        }
        const school_id = Number(row[schoolIdx >= 0 ? schoolIdx : 5]) || 1;
        const active = row[activeIdx >= 0 ? activeIdx : 9] !== false && String(row[activeIdx >= 0 ? activeIdx : 9]) !== 'false';
        const parsian = buildParsianCode(national_id, school_id);

        students.push({
          id,
          name,
          grade,
          phone,
          national_id,
          school_id,
          school_name: schoolMap.get(school_id) || 'مدرسه',
          active,
          needs_fix: !/^\d{10}$/.test(national_id) || !grade,
          parsian_code: parsian.fullCode,
        });
      }
    }

    // Parse Categories
    const categories: ExpenseCategory[] = [];
    if (rawCategories.length > 1) {
      for (let i = 1; i < rawCategories.length; i++) {
        const row = rawCategories[i];
        if (!row || !row[1]) continue;
        categories.push({
          id: String(row[0] || i),
          name: String(row[1]),
          active: String(row[2]) !== 'false',
        });
      }
    }

    // Parse Managers
    const managers: User[] = [];
    if (rawManagers.length > 1) {
      for (let i = 1; i < rawManagers.length; i++) {
        const row = rawManagers[i];
        if (!row || !row[2]) continue;
        const id = Number(row[0]) || i;
        const name = String(row[1] || '');
        const username = String(row[2] || '');
        const school_id = row[4] ? Number(row[4]) : undefined;
        const role = String(row[5] || 'manager').toLowerCase() === 'senior' ? 'senior' : 'manager';
        const active = String(row[6]) !== 'false';
        const password = String(row[3] || '').trim();
        managers.push({
          id,
          name,
          username,
          password,
          school_id,
          school_name: school_id ? schoolMap.get(school_id) : undefined,
          role,
          active,
        });
      }
    }

    // Parse Tuition into Transactions
    const transactions: Transaction[] = [];
    let txCounter = 1;

    if (rawTuition.length > 1) {
      const headers = rawTuition[0].map(cleanHeader);
      const idIdx = headers.indexOf('id');
      const dateIdx = headers.indexOf('date');
      const studentIdx = headers.indexOf('studentid');
      const schoolIdx = headers.indexOf('schoolid');
      const typeIdx = headers.indexOf('type');
      const amountIdx = headers.indexOf('amount');
      const descIdx = headers.indexOf('description');
      const trackIdx = headers.indexOf('trackingcode');
      const paySrcIdx = headers.indexOf('paymentsource');

      for (let i = 1; i < rawTuition.length; i++) {
        const row = rawTuition[i];
        if (!row || !row[amountIdx >= 0 ? amountIdx : 5]) continue;
        const amountNum = Math.abs(Number(String(row[amountIdx >= 0 ? amountIdx : 5]).replace(/[^\d.-]/g, '')) || 0);
        const type = String(row[typeIdx >= 0 ? typeIdx : 4] || 'payment');
        const isDebt = type === 'debt' || type === 'بدهی';
        const stId = Number(row[studentIdx >= 0 ? studentIdx : 2]) || undefined;
        const scId = Number(row[schoolIdx >= 0 ? schoolIdx : 3]) || 1;
        const studentObj = students.find((s) => s.id === stId);
        const dateStr = String(row[dateIdx >= 0 ? dateIdx : 1] || '');

        transactions.push({
          id: Number(row[idIdx >= 0 ? idIdx : 0]) || txCounter++,
          date: dateStr,
          jalali_date: dateStr ? jalaliFromGregorian(dateStr) : '',
          description: String(row[descIdx >= 0 ? descIdx : 6] || (isDebt ? 'شهریه تحصیلی' : 'پرداخت شهریه')),
          kind: isDebt ? 'شهریه_بدهی' : 'شهریه',
          amount: amountNum,
          debit: isDebt ? amountNum : 0,
          credit: !isDebt ? amountNum : 0,
          student_id: stId,
          student_name: studentObj?.name,
          student_grade: studentObj?.grade,
          school_id: scId,
          school_name: schoolMap.get(scId),
          tracking_code: String(row[trackIdx >= 0 ? trackIdx : 7] || ''),
          payment_method: String(row[paySrcIdx >= 0 ? paySrcIdx : 13] || 'پول نقد'),
          reconciled: true,
          review_status: 'approved',
        });
      }
    }

    // Parse Expenses into Transactions
    if (rawExpenses.length > 1) {
      const headers = rawExpenses[0].map(cleanHeader);
      const idIdx = headers.indexOf('id');
      const dateIdx = headers.indexOf('date');
      const schoolIdx = headers.indexOf('schoolid');
      const catIdx = headers.indexOf('category');
      const amountIdx = headers.indexOf('amount');
      const descIdx = headers.indexOf('description');
      const trackIdx = headers.indexOf('trackingcode');
      const paySrcIdx = headers.indexOf('paymentsource');

      for (let i = 1; i < rawExpenses.length; i++) {
        const row = rawExpenses[i];
        if (!row || !row[amountIdx >= 0 ? amountIdx : 4]) continue;
        const amountNum = Math.abs(Number(String(row[amountIdx >= 0 ? amountIdx : 4]).replace(/[^\d.-]/g, '')) || 0);
        const scId = Number(row[schoolIdx >= 0 ? schoolIdx : 2]) || 1;
        const dateStr = String(row[dateIdx >= 0 ? dateIdx : 1] || '');

        transactions.push({
          id: 100000 + (Number(row[idIdx >= 0 ? idIdx : 0]) || i),
          date: dateStr,
          jalali_date: dateStr ? jalaliFromGregorian(dateStr) : '',
          description: String(row[descIdx >= 0 ? descIdx : 5] || 'هزینه مدرسه'),
          kind: 'هزینه',
          amount: amountNum,
          debit: amountNum,
          credit: 0,
          expense_category_name: String(row[catIdx >= 0 ? catIdx : 3] || 'هزینه‌های متفرقه'),
          school_id: scId,
          school_name: schoolMap.get(scId),
          tracking_code: String(row[trackIdx >= 0 ? trackIdx : 6] || ''),
          payment_method: String(row[paySrcIdx >= 0 ? paySrcIdx : 13] || 'حساب مدرسه'),
          reconciled: true,
          review_status: 'approved',
        });
      }
    }

    // Parse Cheques
    const cheques: Cheque[] = [];
    if (rawCheques.length > 1) {
      const headers = rawCheques[0].map(cleanHeader);
      const idIdx = headers.indexOf('id');
      const dateIdx = headers.indexOf('date');
      const stIdx = headers.indexOf('studentid');
      const scIdx = headers.indexOf('schoolid');
      const amountIdx = headers.indexOf('amount');
      const sayadIdx = headers.indexOf('sayadid');
      const dueIdx = headers.indexOf('duedate');
      const descIdx = headers.indexOf('description');
      const statusIdx = headers.indexOf('status');

      for (let i = 1; i < rawCheques.length; i++) {
        const row = rawCheques[i];
        if (!row || !row[amountIdx >= 0 ? amountIdx : 4]) continue;
        const stId = Number(row[stIdx >= 0 ? stIdx : 2]) || 0;
        const scId = Number(row[scIdx >= 0 ? scIdx : 3]) || 1;
        const stObj = students.find((s) => s.id === stId);
        const statusVal = String(row[statusIdx >= 0 ? statusIdx : 13] || 'pending').toLowerCase();
        const normalizedStatus: Cheque['status'] =
          statusVal === 'approved' || statusVal === 'تایید'
            ? 'approved'
            : statusVal === 'rejected' || statusVal === 'رد'
            ? 'rejected'
            : statusVal === 'paid' || statusVal === 'پاس شده'
            ? 'paid'
            : statusVal === 'bounced' || statusVal === 'برگشتی'
            ? 'bounced'
            : 'pending';

        cheques.push({
          id: Number(row[idIdx >= 0 ? idIdx : 0]) || i,
          student_id: stId,
          student_name: stObj?.name || 'دانش‌آموز',
          school_id: scId,
          school_name: schoolMap.get(scId) || 'مدرسه',
          amount: Number(String(row[amountIdx >= 0 ? amountIdx : 4]).replace(/[^\d.-]/g, '')) || 0,
          sayad_id: String(row[sayadIdx >= 0 ? sayadIdx : 5] || ''),
          due_date: String(row[dueIdx >= 0 ? dueIdx : 6] || ''),
          issue_date: String(row[dateIdx >= 0 ? dateIdx : 1] || ''),
          note: String(row[descIdx >= 0 ? descIdx : 7] || ''),
          status: normalizedStatus,
          received_confirmed: true,
          in_favor_confirmed: true,
        });
      }
    }

    return {
      success: true,
      students,
      schools,
      transactions,
      cheques,
      categories,
      managers,
      bankTransactions: [],
      stats: {
        studentsCount: students.length,
        transactionsCount: transactions.length,
        chequesCount: cheques.length,
        expensesCount: transactions.filter((t) => t.kind === 'هزینه').length,
      },
    };
  } catch (err: any) {
    console.error('Failed to load Google Sheets accounting data:', err);
    return {
      success: false,
      students: [],
      schools: [],
      transactions: [],
      cheques: [],
      categories: [],
      managers: [],
      bankTransactions: [],
      stats: { studentsCount: 0, transactionsCount: 0, chequesCount: 0, expensesCount: 0 },
      error: err.message || 'خطا در ارتباط با گوگل شیت',
    };
  }
};

// Apps Script Web App Endpoint Support (alternative direct method)
export const loadDataFromAppsScript = async (webAppUrl: string): Promise<SheetLoadResult> => {
  const cleanUrl = webAppUrl.trim().replace(/\/+$/, '');
  const [studentsRes, schoolsRes, tuitionRes, expensesRes, chequesRes] = await Promise.all([
    fetch(`${cleanUrl}?action=students`).then((r) => r.json()).catch(() => ({ data: [] })),
    fetch(`${cleanUrl}?action=schools`).then((r) => r.json()).catch(() => ({ data: [] })),
    fetch(`${cleanUrl}?action=tuition`).then((r) => r.json()).catch(() => ({ data: [] })),
    fetch(`${cleanUrl}?action=expenses`).then((r) => r.json()).catch(() => ({ data: [] })),
    fetch(`${cleanUrl}?action=cheques`).then((r) => r.json()).catch(() => ({ data: [] })),
  ]);

  const students: Student[] = (studentsRes.data || []).map((s: any) => ({
    id: Number(s.id),
    name: s.name,
    grade: s.grade,
    phone: s.phone || '',
    national_id: s.national_id || '',
    school_id: Number(s.school_id),
    school_name: s.school_name,
    active: s.active !== false && String(s.active) !== 'false',
    needs_fix: !!s.needs_fix,
    parsian_code: s.kol_code && s.moeen_code && s.tafsili_code ? `${s.tafsili_code}-${s.moeen_code}-${s.kol_code}` : '',
  }));

  const schools: School[] = (schoolsRes.data || []).map((sc: any) => ({
    id: Number(sc.id),
    name: sc.name,
    code: sc.code,
    active: sc.active !== false && String(sc.active) !== 'false',
  }));

  const transactions: Transaction[] = [];
  (tuitionRes.data || []).forEach((t: any) => {
    const isDebt = t.type === 'debt';
    const amountNum = Number(t.amount) || 0;
    transactions.push({
      id: Number(t.id),
      date: t.date,
      jalali_date: t.date ? jalaliFromGregorian(t.date) : '',
      description: t.description || (isDebt ? 'شهریه تحصیلی' : 'پرداخت شهریه'),
      kind: isDebt ? 'شهریه_بدهی' : 'شهریه',
      amount: amountNum,
      debit: isDebt ? amountNum : 0,
      credit: !isDebt ? amountNum : 0,
      student_id: Number(t.student_id),
      school_id: Number(t.school_id),
      tracking_code: t.tracking_code,
      payment_method: t.payment_source || 'پول نقد',
      reconciled: true,
      review_status: 'approved',
    });
  });

  (expensesRes.data || []).forEach((e: any) => {
    const amountNum = Number(e.amount) || 0;
    transactions.push({
      id: 100000 + Number(e.id),
      date: e.date,
      jalali_date: e.date ? jalaliFromGregorian(e.date) : '',
      description: e.description || 'هزینه مدرسه',
      kind: 'هزینه',
      amount: amountNum,
      debit: amountNum,
      credit: 0,
      expense_category_name: e.category,
      school_id: Number(e.school_id),
      tracking_code: e.tracking_code,
      payment_method: e.payment_source || 'حساب مدرسه',
      reconciled: true,
      review_status: 'approved',
    });
  });

  const cheques: Cheque[] = (chequesRes.data || []).map((c: any) => ({
    id: Number(c.id),
    student_id: Number(c.student_id),
    school_id: Number(c.school_id),
    amount: Number(c.amount),
    sayad_id: c.sayad_id,
    due_date: c.due_date,
    issue_date: c.date,
    description: c.description || '',
    status: c.status || 'pending',
    in_favor_confirmed: true,
    received_confirmed: true,
  }));

  return {
    success: true,
    students,
    schools,
    transactions,
    cheques,
    categories: [],
    managers: [],
    bankTransactions: [],
    stats: {
      studentsCount: students.length,
      transactionsCount: transactions.length,
      chequesCount: cheques.length,
      expensesCount: expensesRes.data?.length || 0,
    },
  };
};

/**
 * Parses any Excel workbook (.xlsx / .xls) exported from Google Sheets or created locally.
 * Extracts Students, Schools, Staff, Tuition/Transactions, Cheques, Expenses, Categories.
 */
export const parseExcelWorkbook = (
  wb: XLSX.WorkBook
): SheetLoadResult & { staff: StaffMember[] } => {
  const getSheetRows = (sheetNameMatches: string[]): any[][] => {
    for (const name of wb.SheetNames) {
      const clean = cleanHeader(name);
      if (sheetNameMatches.some((m) => clean.includes(cleanHeader(m)))) {
        const ws = wb.Sheets[name];
        if (ws) {
          return XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        }
      }
    }
    return [];
  };

  const rawStudents = getSheetRows(['Students', 'دانش آموزان', 'دانش‌آموزان']);
  const rawSchools = getSheetRows(['Schools', 'مدارس', 'مدرسه']);
  const rawTuition = getSheetRows(['Tuition', 'شهریه', 'شهریه‌ها']);
  const rawExpenses = getSheetRows(['Expenses', 'هزینه', 'هزینه‌ها']);
  const rawCheques = getSheetRows(['Cheques', 'چک', 'چک‌ها']);
  const rawCategories = getSheetRows(['ExpenseCategories', 'سرفصل', 'دسته‌بندی']);
  const rawManagers = getSheetRows(['Managers', 'مدیران']);
  const rawStaff = getSheetRows(['Staff', 'Teachers', 'پرسنل', 'معلمان', 'کارکنان', 'مربیان']);

  // Parse Schools
  const schools: School[] = [];
  if (rawSchools.length > 1) {
    const headers = rawSchools[0].map(cleanHeader);
    const idIdx = headers.indexOf('id');
    const nameIdx = headers.indexOf('name') >= 0 ? headers.indexOf('name') : headers.indexOf('نام');
    const codeIdx = headers.indexOf('code') >= 0 ? headers.indexOf('code') : headers.indexOf('کد');

    for (let i = 1; i < rawSchools.length; i++) {
      const row = rawSchools[i];
      if (!row || !row[nameIdx >= 0 ? nameIdx : 1]) continue;
      const id = Number(row[idIdx >= 0 ? idIdx : 0]) || i;
      let name = String(row[nameIdx >= 0 ? nameIdx : 1] || '');
      if (id === 10 || name.includes('مرکز قرآنی') || name.includes('مهد مرکزی قرآنی')) {
        name = 'مهد برهان';
      }
      const code = String(row[codeIdx >= 0 ? codeIdx : 2] || '');
      schools.push({ id, name, code, active: true });
    }
  }

  const schoolMap = new Map<number, string>();
  schools.forEach((s) => schoolMap.set(s.id, s.name));

  // Parse Students
  const students: Student[] = [];
  if (rawStudents.length > 1) {
    const headers = rawStudents[0].map(cleanHeader);
    const idIdx = headers.indexOf('id');
    const nameIdx = headers.indexOf('name') >= 0 ? headers.indexOf('name') : headers.indexOf('نام');
    const gradeIdx = headers.indexOf('grade') >= 0 ? headers.indexOf('grade') : headers.indexOf('پایه');
    const phoneIdx = headers.indexOf('phone') >= 0 ? headers.indexOf('phone') : headers.indexOf('تلفن');
    const nidIdx = headers.indexOf('nationalid') >= 0 ? headers.indexOf('nationalid') : headers.indexOf('کدملی');
    const schoolIdx = headers.indexOf('schoolid') >= 0 ? headers.indexOf('schoolid') : headers.indexOf('مدرسه');

    for (let i = 1; i < rawStudents.length; i++) {
      const row = rawStudents[i];
      if (!row || !row[nameIdx >= 0 ? nameIdx : 1]) continue;
      const id = Number(row[idIdx >= 0 ? idIdx : 0]) || i;
      const name = String(row[nameIdx >= 0 ? nameIdx : 1] || '').trim();
      const grade = String(row[gradeIdx >= 0 ? gradeIdx : 2] || '').trim();
      let phone = String(row[phoneIdx >= 0 ? phoneIdx : 3] || '').trim();
      if (/^9\d{9}$/.test(phone)) phone = '0' + phone;
      let national_id = String(row[nidIdx >= 0 ? nidIdx : 4] || '').trim();
      if (national_id.length < 10 && national_id.length > 0) {
        national_id = national_id.padStart(10, '0');
      }
      const school_id = Number(row[schoolIdx >= 0 ? schoolIdx : 5]) || 1;
      const parsian = buildParsianCode(national_id, school_id);

      students.push({
        id,
        name,
        grade,
        phone,
        national_id,
        school_id,
        school_name: schoolMap.get(school_id) || 'مدرسه',
        active: true,
        needs_fix: !/^\d{10}$/.test(national_id) || !grade,
        parsian_code: parsian.fullCode,
      });
    }
  }

  // Parse Staff
  const staff: StaffMember[] = [];
  if (rawStaff.length > 1) {
    const headers = rawStaff[0].map(cleanHeader);
    const nameIdx = headers.findIndex((h: string) => h.includes('نام') || h.includes('name'));
    const nidIdx = headers.findIndex((h: string) => h.includes('ملی') || h.includes('nid'));
    const phoneIdx = headers.findIndex((h: string) => h.includes('تلفن') || h.includes('همراه') || h.includes('phone'));
    const roleIdx = headers.findIndex((h: string) => h.includes('سمت') || h.includes('نقش') || h.includes('role'));
    const rateIdx = headers.findIndex((h: string) => h.includes('ساعتی') || h.includes('rate'));
    const baseIdx = headers.findIndex((h: string) => h.includes('پایه') || h.includes('salary'));
    const insEmpIdx = headers.findIndex((h: string) => h.includes('کارفرما'));
    const insEmplyIdx = headers.findIndex((h: string) => h.includes('کارمند') || h.includes('پرسنل'));
    const schoolIdx = headers.findIndex((h: string) => h.includes('مدرسه') || h.includes('school'));

    for (let i = 1; i < rawStaff.length; i++) {
      const row = rawStaff[i];
      if (!row || !row[nameIdx >= 0 ? nameIdx : 1]) continue;
      const id = i;
      const name = String(row[nameIdx >= 0 ? nameIdx : 1] || '').trim();
      let national_id = String(row[nidIdx >= 0 ? nidIdx : 2] || '').trim();
      if (national_id.length < 10 && national_id.length > 0) national_id = national_id.padStart(10, '0');
      let phone = String(row[phoneIdx >= 0 ? phoneIdx : 3] || '').trim();
      if (/^9\d{9}$/.test(phone)) phone = '0' + phone;
      const role = String(row[roleIdx >= 0 ? roleIdx : 4] || 'آموزگار').trim();
      const school_id = Number(row[schoolIdx >= 0 ? schoolIdx : 5]) || 1;
      const hourly_rate = Number(String(row[rateIdx >= 0 ? rateIdx : 6] || 0).replace(/\D/g, '')) || 0;
      const base_salary = Number(String(row[baseIdx >= 0 ? baseIdx : 7] || 0).replace(/\D/g, '')) || 0;
      const insurance_employer = Number(String(row[insEmpIdx >= 0 ? insEmpIdx : 8] || 0).replace(/\D/g, '')) || 0;
      const insurance_employee = Number(String(row[insEmplyIdx >= 0 ? insEmplyIdx : 9] || 0).replace(/\D/g, '')) || 0;

      staff.push({
        id,
        name,
        national_id,
        phone,
        role_title: role,
        school_id,
        school_name: schoolMap.get(school_id) || 'مدرسه',
        contract_type: hourly_rate > 0 ? 'hourly' : 'monthly',
        hourly_rate,
        base_salary,
        insurance_employer_share: insurance_employer,
        insurance_employee_share: insurance_employee,
        active: true,
      });
    }
  }

  // Parse Transactions (Tuition + Expenses)
  const transactions: Transaction[] = [];
  if (rawTuition.length > 1) {
    for (let i = 1; i < rawTuition.length; i++) {
      const row = rawTuition[i];
      if (!row || !row[5]) continue;
      const isDebt = String(row[4] || '').toLowerCase() === 'debt' || String(row[4] || '').includes('بدهی');
      const amount = Number(row[5]) || 0;
      const studentId = Number(row[2]) || 1;
      const studentObj = students.find((s) => s.id === studentId);
      const schoolId = Number(row[3]) || studentObj?.school_id || 1;

      transactions.push({
        id: Number(row[0]) || 200 + i,
        date: String(row[1] || todayGregorian()),
        jalali_date: row[1] ? jalaliFromGregorian(String(row[1])) : '',
        school_id: schoolId,
        school_name: schoolMap.get(schoolId) || studentObj?.school_name,
        student_id: studentId,
        student_name: studentObj?.name,
        student_grade: studentObj?.grade,
        kind: isDebt ? 'شهریه_بدهی' : 'شهریه',
        amount,
        debit: isDebt ? amount : 0,
        credit: !isDebt ? amount : 0,
        description: String(row[6] || (isDebt ? 'شهریه مصوب' : 'پرداخت شهریه')),
        payment_method: String(row[7] || 'کارت به کارت'),
        tracking_code: String(row[8] || ''),
        reconciled: true,
        review_status: 'approved',
      });
    }
  }

  if (rawExpenses.length > 1) {
    for (let i = 1; i < rawExpenses.length; i++) {
      const row = rawExpenses[i];
      if (!row || !row[4]) continue;
      const amount = Number(row[4]) || 0;
      const schoolId = Number(row[2]) || 1;
      const desc = String(row[5] || row[3] || 'هزینه مدرسه');
      const isFee = desc.includes('کارمزد') || desc.includes('پایا') || desc.includes('ساتنا');

      transactions.push({
        id: 100000 + (Number(row[0]) || i),
        date: String(row[1] || todayGregorian()),
        jalali_date: row[1] ? jalaliFromGregorian(String(row[1])) : '',
        school_id: schoolId,
        school_name: schoolMap.get(schoolId),
        kind: 'هزینه',
        amount,
        debit: amount,
        credit: 0,
        expense_category_name: isFee ? 'کارمزد بانک' : String(row[3] || 'هزینه‌های متفرقه اداری'),
        is_bank_fee: isFee,
        payment_source: String(row[7] || 'petty_cash'),
        tracking_code: String(row[6] || ''),
        description: desc,
        reconciled: true,
        review_status: 'approved',
      });
    }
  }

  // Parse Cheques
  const cheques: Cheque[] = [];
  if (rawCheques.length > 1) {
    for (let i = 1; i < rawCheques.length; i++) {
      const row = rawCheques[i];
      if (!row || !row[4]) continue;
      const studentId = Number(row[2]) || 1;
      const studentObj = students.find((s) => s.id === studentId);
      const schoolId = Number(row[3]) || studentObj?.school_id || 1;

      cheques.push({
        id: Number(row[0]) || i,
        issue_date: String(row[1] || todayGregorian()),
        student_id: studentId,
        student_name: studentObj?.name || 'دانش‌آموز',
        school_id: schoolId,
        school_name: schoolMap.get(schoolId) || 'مدرسه',
        amount: Number(row[4]) || 0,
        sayad_id: String(row[5] || ''),
        due_date: String(row[6] || todayGregorian()),
        note: String(row[7] || ''),
        bank_name: String(row[10] || 'بانک ملی'),
        cheque_type: String(row[5]).length === 16 ? 'sayad' : 'non_sayad',
        status: String(row[13] || 'pending') as any,
        received_confirmed: true,
        in_favor_confirmed: true,
      });
    }
  }

  return {
    success: true,
    students,
    schools,
    transactions,
    cheques,
    categories: [],
    managers: [],
    bankTransactions: [],
    staff,
    stats: {
      studentsCount: students.length,
      transactionsCount: transactions.length,
      chequesCount: cheques.length,
      expensesCount: transactions.filter((t) => t.kind === 'هزینه').length,
    },
  };
};

/**
 * Loads an entire school accounting dataset from an uploaded Excel (.xlsx, .xls) file
 */
export const loadDataFromExcelFile = async (
  file: File | Blob
): Promise<SheetLoadResult & { staff: StaffMember[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const result = parseExcelWorkbook(wb);
        resolve(result);
      } catch (err: any) {
        reject(new Error(`خطا در پردازش فایل اکسل: ${err.message || String(err)}`));
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل از حافظه'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Fetches public Google Sheets using Google Docs CSV export (Zero OAuth required).
 * Works reliably in Android APK, Capacitor WebView, and any browser.
 */
export const loadDataFromPublicGoogleSheet = async (
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<SheetLoadResult & { staff: StaffMember[] }> => {
  try {
    // Attempt to download the entire spreadsheet as XLSX directly from Google Docs export URL
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    const response = await fetch(exportUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      return parseExcelWorkbook(wb);
    }
  } catch (e) {
    console.warn('Direct XLSX export fetch failed, attempting public gviz CSV fallback:', e);
  }

  // Fallback: fetch individual sheet CSVs
  const sheetNames = ['Students', 'Schools', 'Tuition', 'Expenses', 'Cheques', 'Staff'];
  const wb = XLSX.utils.book_new();

  for (const name of sheetNames) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
      const res = await fetch(csvUrl);
      if (res.ok) {
        const csvText = await res.text();
        const ws = XLSX.read(csvText, { type: 'string' }).Sheets['Sheet1'];
        if (ws) {
          XLSX.utils.book_append_sheet(wb, ws, name);
        }
      }
    } catch (err) {
      console.warn(`Could not fetch sheet ${name}:`, err);
    }
  }

  if (wb.SheetNames.length === 0) {
    throw new Error('عدم امکان اتصال به گوگل شیت عمومی. لطفاً اشتراک‌گذاری شیت را روی «هرکس پیوند را دارد می‌تواند مشاهده کند» بگذارید، یا فایل اکسل شیت را مستقیماً بارگذاری فرمایید.');
  }

  return parseExcelWorkbook(wb);
};
