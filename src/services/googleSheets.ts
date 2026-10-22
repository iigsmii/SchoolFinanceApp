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

// Permanent configuration as requested by user
export const DEFAULT_SPREADSHEET_ID = '1bFTL1edC-btgjp2KvvkwIM5WaJnycVFylTmFQQFRixk';
export const DEFAULT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbznVf-LPQDWAbZyoenKD8B6UYLjmrjRIqWZPlVJnzwwF2yBpqbqR6HZeGsd-WcQWKJoWA/exec';
export const OWNER_EMAIL = 's.mehdi.golzari@gmail.com';

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

export const extractSpreadsheetId = (input: string): string => {
  if (!input) return DEFAULT_SPREADSHEET_ID;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

export const dateFromExcelSerial = (serial: any): string => {
  if (!serial) return '';
  if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) return serial.trim();
  const num = Number(serial);
  if (isNaN(num) || num <= 0) return String(serial).trim();
  // Excel base date (1900-01-01) with leap year bug adjustment (25569 days to 1970-01-01)
  const utcDays = Math.floor(num - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  if (isNaN(dateInfo.getTime())) return String(serial).trim();
  return dateInfo.toISOString().split('T')[0];
};

const cleanHeader = (h: any) =>
  String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\u200c\u200f\u202a-\u202e\s_-]/g, '');

/**
 * Sends a mutation to the Google Apps Script Web App
 */
export const postToAppsScript = async (
  payload: Record<string, any>,
  webAppUrl: string = DEFAULT_WEBAPP_URL
): Promise<{ success: boolean; error?: string; data?: any; id?: number; count?: number; skipped?: number; message?: string; matched?: number; unmatched?: number; rules?: any; configured?: boolean }> => {
  try {
    const url = webAppUrl.trim();
    if (!url) return { success: false, error: 'آدرس وب‌اپ تعریف نشده است.' };

    const action = String(payload.action || payload.endpoint || '').replace(/^\/+/, '').toLowerCase();
    const idempotentActions = ['tuition_add', 'tuition_bulk_debt', 'expense_add', 'finance_transaction', 'cheque_review'];
    // Send a client-generated operation ID so the server can replay a stored result
    // when the same operation is retried with the same payload/request_id.
    const requestId = payload.request_id || (idempotentActions.includes(action)
      ? ((typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : `req-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      : undefined);
    const bodyData = JSON.stringify({
      ...payload,
      ...(requestId ? { request_id: requestId } : {}),
      token: (typeof localStorage !== 'undefined' && localStorage.getItem('school_finance_auth_token')) || 'sync_direct',
      owner: OWNER_EMAIL,
    });

    // Retry once with the exact same body/request_id. If the first response was
    // lost after the server committed the write, Apps Script can return its stored result.
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: bodyData,
          mode: 'cors',
        });
        if (!res.ok) return { success: false, error: `خطای سرور (${res.status})` };
        return await res.json();
      } catch (err: any) {
        lastError = err;
        if (attempt === 0) continue;
      }
    }
    console.warn('Apps Script mutation failed after retry:', lastError);
    return { success: false, error: lastError?.message || 'ارتباط با سرور برقرار نشد.' };
  } catch (err: any) {
    console.warn('Apps Script mutation failed:', err);
    return { success: false, error: err?.message || 'ارتباط با سرور برقرار نشد.' };
  }
};

/** Authenticate against the Apps Script Managers table. Password hashes never leave the server. */
export const apiLogin = async (username: string, password: string): Promise<{ success: boolean; token?: string; user?: User; error?: string }> => {
  try {
    const res = await fetch(DEFAULT_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', username: username.trim(), password }),
      mode: 'cors',
    });
    const result = await res.json();
    if (!res.ok || !result?.success || !result?.token || !result?.user) {
      return { success: false, error: result?.error || 'نام کاربری یا رمز عبور نامعتبر است.' };
    }
    if (typeof localStorage !== 'undefined') localStorage.setItem('school_finance_auth_token', result.token);
    return { success: true, token: result.token, user: result.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'ارتباط با سرور ورود برقرار نشد.' };
  }
};

/**
 * Save / Add / Update / Delete Student on Google Sheet via Apps Script
 */
export const apiSaveStudent = async (
  student: Partial<Student> & { id: number },
  action: 'add' | 'update' | 'delete' = 'add'
) => {
  return postToAppsScript({
    action: action === 'delete' ? 'student_delete' : action === 'update' ? 'student_update' : 'student_add',
    id: student.id,
    name: student.name,
    grade: student.grade,
    phone: student.phone,
    father_phone: student.father_phone,
    mother_phone: student.mother_phone,
    national_id: student.national_id,
    school_id: student.school_id,
    active: action === 'delete' ? false : student.active !== false,
  });
};


export const apiSaveManager = async (manager: Partial<User> & { id?: number }, action: 'add' | 'update' | 'delete' = 'update') => {
  const payload: Record<string, any> = {
    action: action === 'add' ? 'manager_add' : action === 'delete' ? 'manager_delete' : 'manager_update',
    id: manager.id, name: manager.name, username: manager.username, password: manager.password,
    school_id: manager.school_id, role: manager.role, active: manager.active,
    petty_cash_card: manager.petty_cash_card, petty_cash_bank: manager.petty_cash_bank,
    petty_cash_shaba: manager.petty_cash_shaba, petty_cash_limit: manager.petty_cash_limit,
    petty_cash_balance: manager.petty_cash_balance,
  };
  return postToAppsScript(payload);
};

export const apiSaveSchool = async (school: Partial<School> & { id?: number }, action: 'add' | 'update' | 'delete' = 'update') =>
  postToAppsScript({
    action: action === 'add' ? 'school_add' : action === 'delete' ? 'school_delete' : 'school_update',
    id: school.id, name: school.name, code: school.code, type: school.type,
    moeen_code: school.moeen_code, petty_cash_card: school.petty_cash_card, pos_terminal_number: school.pos_terminal_number, active: school.active,
  });

export const apiSaveStaffMember = async (staff: Partial<StaffMember> & { id?: number }, action: 'add' | 'update' | 'delete' = 'update') =>
  postToAppsScript({
    action: action === 'add' ? 'staff_add' : action === 'delete' ? 'staff_delete' : 'staff_update',
    id: staff.id, school_id: staff.school_id, school_name: staff.school_name,
    name: staff.name, national_id: staff.national_id, phone: staff.phone,
    role_title: staff.role_title, contract_type: staff.contract_type,
    hourly_rate: staff.hourly_rate, base_salary: staff.base_salary,
    insurance_employer_share: staff.insurance_employer_share,
    insurance_employee_share: staff.insurance_employee_share,
    bank_card_or_sheba: staff.bank_card_or_sheba, kol_code: staff.kol_code,
    moeen_code: staff.moeen_code, tafsili_code: staff.tafsili_code, active: staff.active,
  });


/**
 * Save Tuition (Payment or Debt) on Google Sheet via Apps Script
 */
export const apiSaveTuition = async (
  tx: Partial<Transaction> & { amount: number; student_id?: number }
) => {
  const isDebt = tx.kind === 'شهریه_بدهی';
  return postToAppsScript({
    action: 'tuition_add',
    id: tx.id,
    date: tx.date || todayGregorian(),
    student_id: tx.student_id,
    school_id: tx.school_id,
    type: isDebt ? 'debt' : 'payment',
    amount: tx.amount,
    description: tx.description,
    payment_source: tx.payment_method || 'بانک',
    tracking_code: tx.tracking_code || '',
  });
};

/**
 * Save Expense on Google Sheet via Apps Script
 */
export const apiSaveExpense = async (
  exp: Partial<Transaction> & { amount: number; category_name?: string }
) => {
  return postToAppsScript({
    action: 'expense_add',
    id: exp.id,
    date: exp.date || todayGregorian(),
    school_id: exp.school_id || 1,
    category: exp.expense_category_name || exp.category_name || 'هزینه‌های متفرقه',
    amount: exp.amount,
    description: exp.description || '',
    payment_source: exp.payment_source || 'حساب مدرسه',
    tracking_code: exp.tracking_code || '',
  });
};

/**
 * Update Cheque Status on Google Sheet via Apps Script
 */
export const apiSaveCheque = async (
  cheque: Partial<Cheque> & { id: number }
) => {
  return postToAppsScript({
    action: 'cheque_review',
    id: cheque.id,
    status: cheque.status,
    sayad_id: cheque.sayad_id,
    amount: cheque.amount,
    student_id: cheque.student_id,
    school_id: cheque.school_id,
  });
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
  const rawTransactions = getSheetRows(['Transactions', 'تراکنش', 'تراکنش‌ها']);
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
      let name = String(row[nameIdx >= 0 ? nameIdx : 1] || '').trim();
      if (id === 10 || name.includes('مرکز قرآنی') || name.includes('مهد مرکزی قرآنی')) {
        name = 'مهد برهان';
      }
      const code = String(row[codeIdx >= 0 ? codeIdx : 2] || '').trim();
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
    const fatherPhoneIdx = headers.indexOf('fatherphone');
    const motherPhoneIdx = headers.indexOf('motherphone');
    const nidIdx = headers.indexOf('nationalid') >= 0 ? headers.indexOf('nationalid') : headers.indexOf('کدملی');
    const schoolIdx = headers.indexOf('schoolid') >= 0 ? headers.indexOf('schoolid') : headers.indexOf('مدرسه');
    const kolIdx = headers.indexOf('kolcode') >= 0 ? headers.indexOf('kolcode') : headers.indexOf('کدکل');
    const moeenIdx = headers.indexOf('moeencode') >= 0 ? headers.indexOf('moeencode') : headers.indexOf('کدمعین');
    const tafsiliIdx = headers.indexOf('tafsilicode') >= 0 ? headers.indexOf('tafsilicode') : headers.indexOf('کدتفصیل');

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
        father_phone: String(row[fatherPhoneIdx >= 0 ? fatherPhoneIdx : -1] || phone).trim() || phone,
        mother_phone: String(row[motherPhoneIdx >= 0 ? motherPhoneIdx : -1] || '').trim(),
        national_id,
        school_id,
        school_name: schoolMap.get(school_id) || 'مدرسه',
        active: true,
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
        name: String(row[1]).trim(),
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
      let name = String(row[1] || '').trim();
      if (name.includes('گلزاری')) name = 'سیدمهدی گلزاری';
      const username = String(row[2] || '').trim();
      const school_id = row[4] ? Number(row[4]) : undefined;
      const role = String(row[5] || 'manager').toLowerCase() === 'senior' || String(row[5] || '').toLowerCase() === 'admin' ? 'senior' : 'manager';
      managers.push({
        id,
        name,
        username,
        school_id,
        school_name: school_id ? schoolMap.get(school_id) : undefined,
        role,
        active: String(row[6]) !== 'false',
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
      const amount = Number(String(row[5] || 0).replace(/[^\d.-]/g, '')) || 0;
      const studentId = Number(row[2]) || 1;
      const studentObj = students.find((s) => s.id === studentId);
      const schoolId = Number(row[3]) || studentObj?.school_id || 1;
      const dateVal = dateFromExcelSerial(row[1]) || todayGregorian();

      transactions.push({
        id: Number(row[0]) || 200 + i,
        date: dateVal,
        jalali_date: dateVal ? jalaliFromGregorian(dateVal) : '',
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
        payment_method: String(row[13] || row[7] || 'کارت به کارت'),
        tracking_code: String(row[7] || row[8] || ''),
        reconciled: true,
        review_status: 'approved',
      });
    }
  }

  if (rawExpenses.length > 1) {
    for (let i = 1; i < rawExpenses.length; i++) {
      const row = rawExpenses[i];
      if (!row || !row[4]) continue;
      const amount = Number(String(row[4] || 0).replace(/[^\d.-]/g, '')) || 0;
      const schoolId = Number(row[2]) || 1;
      const desc = String(row[5] || row[3] || 'هزینه مدرسه');
      const isFee = desc.includes('کارمزد') || desc.includes('پایا') || desc.includes('ساتنا');
      const dateVal = dateFromExcelSerial(row[1]) || todayGregorian();

      transactions.push({
        id: 100000 + (Number(row[0]) || i),
        date: dateVal,
        jalali_date: dateVal ? jalaliFromGregorian(dateVal) : '',
        school_id: schoolId,
        school_name: schoolMap.get(schoolId),
        kind: 'هزینه',
        amount,
        debit: amount,
        credit: 0,
        expense_category_name: isFee ? 'کارمزد بانک' : String(row[3] || 'هزینه‌های متفرقه اداری'),
        is_bank_fee: isFee,
        payment_source: String(row[12] || row[7] || 'petty_cash'),
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
      const issueDate = dateFromExcelSerial(row[1]) || todayGregorian();
      const dueDate = dateFromExcelSerial(row[6]) || todayGregorian();
      const statusVal = String(row[13] || 'pending').toLowerCase();

      cheques.push({
        id: Number(row[0]) || i,
        issue_date: issueDate,
        student_id: studentId,
        student_name: studentObj?.name || 'دانش‌آموز',
        school_id: schoolId,
        school_name: schoolMap.get(schoolId) || 'مدرسه',
        amount: Number(String(row[4] || 0).replace(/[^\d.-]/g, '')) || 0,
        sayad_id: String(row[5] || ''),
        due_date: dueDate,
        note: String(row[7] || ''),
        bank_name: String(row[10] || 'بانک ملی'),
        cheque_type: String(row[5]).length === 16 ? 'sayad' : 'non_sayad',
        status: (statusVal === 'approved' || statusVal === 'paid' || statusVal === 'bounced' ? statusVal : 'pending') as any,
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
 * Apps Script Web App Endpoint loader
 * Syncs all data in one atomic, reliable request with zero session error
 */
export const loadDataFromAppsScript = async (
  webAppUrl: string = DEFAULT_WEBAPP_URL
): Promise<SheetLoadResult & { staff: StaffMember[] }> => {
  const cleanUrl = webAppUrl.trim().replace(/\/+$/, '');

  let rawData: any = null;
  const authToken = typeof localStorage !== 'undefined' ? (localStorage.getItem('school_finance_auth_token') || '') : '';
  if (!authToken) {
    return { success: false, students: [], schools: [], transactions: [], cheques: [], categories: [], managers: [], bankTransactions: [], staff: [], stats: { studentsCount: 0, transactionsCount: 0, chequesCount: 0, expensesCount: 0 }, error: 'ابتدا وارد سامانه شوید.' };
  }

  // 1. Try POST action: 'sync' with the authenticated session token.
  try {
    const postRes = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'sync',
        token: authToken,
        owner: OWNER_EMAIL,
      }),
      mode: 'cors',
    });
    if (postRes.ok) {
      const json = await postRes.json();
      if (json && (json.success || Array.isArray(json.students) || Array.isArray(json.data))) {
        rawData = json;
      }
    }
  } catch (err) {
    console.warn('Apps Script POST sync notice, trying GET:', err);
  }

  // 2. Fallback to GET action: 'sync'
  if (!rawData) {
    try {
      const getRes = await fetch(`${cleanUrl}?action=sync&token=${encodeURIComponent(authToken)}&owner=${encodeURIComponent(OWNER_EMAIL)}`);
      if (getRes.ok) {
        const json = await getRes.json();
        if (json && (json.success || Array.isArray(json.students))) {
          rawData = json;
        }
      }
    } catch (err) {
      console.warn('Apps Script GET sync notice:', err);
    }
  }

  // 3. Fallback to separate endpoints if unified sync wasn't deployed yet
  if (!rawData || (!Array.isArray(rawData.students) && !Array.isArray(rawData.tuition))) {
    const [studentsRes, schoolsRes, tuitionRes, expensesRes, chequesRes] = await Promise.all([
      fetch(`${cleanUrl}?action=students&token=${encodeURIComponent(authToken)}`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${cleanUrl}?action=schools&token=${encodeURIComponent(authToken)}`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${cleanUrl}?action=tuition&token=${encodeURIComponent(authToken)}`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${cleanUrl}?action=expenses&token=${encodeURIComponent(authToken)}`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${cleanUrl}?action=cheques&token=${encodeURIComponent(authToken)}`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]);

    rawData = {
      success: true,
      students: studentsRes.data || [],
      schools: schoolsRes.data || [],
      tuition: tuitionRes.data || [],
      expenses: expensesRes.data || [],
      cheques: chequesRes.data || [],
    };
  }

  const rawStudents = rawData.students || [];
  const rawSchools = rawData.schools || [];
  const rawTuition = rawData.tuition || [];
  const rawExpenses = rawData.expenses || [];
  const rawCheques = rawData.cheques || [];
  const rawManagers = rawData.managers || [];
  const rawBank = rawData.bank || rawData.bankTransactions || [];
  const rawStaff = Array.isArray(rawData.staff) ? rawData.staff : [];

  const schools: School[] = rawSchools.map((sc: any) => ({
    id: Number(sc.id),
    name: sc.name,
    code: sc.code || '',
    active: sc.active !== false && String(sc.active) !== 'false',
    petty_cash_card: sc.petty_cash_card || '',
    type: sc.type || '',
    moeen_code: sc.moeen_code || '',
  }));

  const schoolMap = new Map<number, string>();
  schools.forEach((s) => schoolMap.set(s.id, s.name));

  const students: Student[] = rawStudents.map((s: any) => {
    const sid = Number(s.school_id) || 1;
    const name = String(s.name || '').trim();
    let phone = String(s.phone || '').trim();
    let nid = String(s.national_id || '').trim();
    if (nid.length < 10 && nid.length > 0) nid = nid.padStart(10, '0');

    return {
      id: Number(s.id),
      name,
      grade: String(s.grade || 'اول').trim(),
      phone,
      father_phone: String(s.father_phone || phone).trim(),
      mother_phone: String(s.mother_phone || '').trim(),
      national_id: nid,
      school_id: sid,
      school_name: s.school_name || schoolMap.get(sid) || 'مدرسه',
      active: s.active !== false && String(s.active) !== 'false',
      needs_fix: !!s.needs_fix,
      parsian_code: s.kol_code && s.moeen_code && s.tafsili_code ? `${s.tafsili_code}-${s.moeen_code}-${s.kol_code}` : '',
    };
  });

  const transactions: Transaction[] = [];

  rawTuition.forEach((t: any, idx: number) => {
    const isDebt = t.type === 'debt' || String(t.type || '').includes('بدهی');
    const amountNum = Number(String(t.amount || 0).replace(/[^\d.-]/g, '')) || 0;
    const dateStr = dateFromExcelSerial(t.date) || todayGregorian();
    const stId = Number(t.student_id);
    const stObj = students.find((s) => s.id === stId);
    const scId = Number(t.school_id) || stObj?.school_id || 1;

    transactions.push({
      id: Number(t.id) || 200 + idx,
      date: dateStr,
      jalali_date: dateStr ? jalaliFromGregorian(dateStr) : '',
      description: t.description || (isDebt ? 'شهریه تحصیلی' : 'پرداخت شهریه'),
      kind: isDebt ? 'شهریه_بدهی' : 'شهریه',
      amount: amountNum,
      debit: isDebt ? amountNum : 0,
      credit: !isDebt ? amountNum : 0,
      student_id: stId,
      student_name: stObj?.name,
      student_grade: stObj?.grade,
      school_id: scId,
      school_name: schoolMap.get(scId) || stObj?.school_name,
      tracking_code: t.tracking_code || '',
      payment_method: t.payment_source || 'کارت به کارت',
      reconciled: true,
      review_status: 'approved',
    });
  });

  rawExpenses.forEach((e: any, idx: number) => {
    const amountNum = Number(String(e.amount || 0).replace(/[^\d.-]/g, '')) || 0;
    const dateStr = dateFromExcelSerial(e.date) || todayGregorian();
    const scId = Number(e.school_id) || 1;
    const desc = e.description || 'هزینه مدرسه';
    const isFee = desc.includes('کارمزد') || desc.includes('پایا') || desc.includes('ساتنا');

    transactions.push({
      id: 100000 + (Number(e.id) || idx),
      date: dateStr,
      jalali_date: dateStr ? jalaliFromGregorian(dateStr) : '',
      description: desc,
      kind: 'هزینه',
      amount: amountNum,
      debit: amountNum,
      credit: 0,
      expense_category_name: isFee ? 'کارمزد بانک' : (e.category || 'هزینه‌های متفرقه اداری'),
      is_bank_fee: isFee,
      school_id: scId,
      school_name: schoolMap.get(scId),
      tracking_code: e.tracking_code || '',
      payment_method: e.payment_source || 'حساب مدرسه',
      reconciled: true,
      review_status: 'approved',
    });
  });

  const cheques: Cheque[] = rawCheques.map((c: any, idx: number) => {
    const stId = Number(c.student_id);
    const stObj = students.find((s) => s.id === stId);
    const scId = Number(c.school_id) || stObj?.school_id || 1;

    return {
      id: Number(c.id) || idx + 1,
      student_id: stId,
      student_name: stObj?.name || 'دانش‌آموز',
      school_id: scId,
      school_name: schoolMap.get(scId) || 'مدرسه',
      amount: Number(String(c.amount || 0).replace(/[^\d.-]/g, '')) || 0,
      sayad_id: c.sayad_id || '',
      due_date: dateFromExcelSerial(c.due_date) || todayGregorian(),
      issue_date: dateFromExcelSerial(c.date) || todayGregorian(),
      note: c.description || '',
      status: c.status || 'pending',
      bank_name: c.bank_name || 'بانک ملی',
      cheque_type: String(c.sayad_id || '').length === 16 ? 'sayad' : 'non_sayad',
      in_favor_confirmed: true,
      received_confirmed: true,
    };
  });

  const managers: User[] = rawManagers.map((m: any, idx: number) => ({
    id: Number(m.id) || idx + 1,
    name: m.name || 'مدیر',
    username: m.username || `user_${idx + 1}`,
    role: String(m.role || '').toLowerCase() === 'senior' || String(m.role || '').toLowerCase() === 'admin' ? 'senior' : 'manager',
    school_id: m.school_id ? Number(m.school_id) : undefined,
    school_name: m.school_id ? schoolMap.get(Number(m.school_id)) : undefined,
    active: m.active !== false && String(m.active) !== 'false',
    petty_cash_card: String(m.petty_cash_card || ''),
    petty_cash_bank: String(m.petty_cash_bank || ''),
    petty_cash_shaba: String(m.petty_cash_shaba || ''),
    petty_cash_limit: Number(m.petty_cash_limit || 0),
    petty_cash_balance: Number(m.petty_cash_balance || 0),
  }));

  return {
    success: true,
    students,
    schools,
    transactions,
    cheques,
    categories: Array.isArray(rawData.categories) ? rawData.categories.map((x: any) => ({ id: String(x.id), name: String(x.name || ''), active: x.active !== false && String(x.active) !== 'false' })).filter((x: ExpenseCategory) => x.name) : [],
    managers,
    bankTransactions: rawBank.map((b: any, idx: number) => ({
      id: Number(b.id) || idx + 1, date: dateFromExcelSerial(b.date) || todayGregorian(),
      school_id: Number(b.school_id) || 1, school_name: schoolMap.get(Number(b.school_id) || 1),
      amount: Number(String(b.amount || 0).replace(/[^\d.-]/g, '')) || 0,
      tracking_code: String(b.tracking_code || ''), bank_account: String(b.bank_account || ''),
      description: String(b.description || ''), reconciled: b.matched === true || String(b.matched) === 'true',
      matched_transaction_id: b.matched_transaction_id ? Number(b.matched_transaction_id) : undefined,
    })),
    staff: rawStaff.map((st: any, idx: number) => ({
      id: Number(st.id) || idx + 1,
      school_id: Number(st.school_id) || 1,
      school_name: st.school_name || schoolMap.get(Number(st.school_id) || 1) || 'مدرسه',
      name: String(st.name || '').trim(),
      national_id: String(st.national_id || ''),
      phone: String(st.phone || ''),
      role_title: String(st.role_title || 'آموزگار'),
      contract_type: (['hourly', 'monthly', 'session'].includes(String(st.contract_type)) ? String(st.contract_type) : 'hourly') as StaffMember['contract_type'],
      hourly_rate: Number(st.hourly_rate || 0),
      base_salary: Number(st.base_salary || 0),
      insurance_employer_share: Number(st.insurance_employer_share || 0),
      insurance_employee_share: Number(st.insurance_employee_share || 0),
      bank_card_or_sheba: String(st.bank_card_or_sheba || ''),
      kol_code: String(st.kol_code || ''),
      moeen_code: String(st.moeen_code || ''),
      tafsili_code: String(st.tafsili_code || ''),
      active: st.active !== false && String(st.active) !== 'false',
      created_at: String(st.created_at || ''),
    })).filter((st: StaffMember) => st.name && st.active),
    stats: {
      studentsCount: students.length,
      transactionsCount: transactions.length,
      chequesCount: cheques.length,
      expensesCount: rawExpenses.length,
    },
  };
};

/**
 * Universal direct Google Sheet sync (Zero OAuth, zero Firebase, 100% automatic)
 * Tries:
 * 1. Google Apps Script Web App (Connected directly to s.mehdi.golzari@gmail.com sheet)
 * 2. Direct XLSX download from Google Docs export URL
 * 3. Local Vite / server proxy (/api/sync-sheet)
 * 4. Google Sheets GViz CSV queries
 */
export const loadDataFromPublicGoogleSheet = async (
  spreadsheetInput: string = DEFAULT_SPREADSHEET_ID
): Promise<SheetLoadResult & { staff: StaffMember[] }> => {
  // Strategy 1: Primary - Google Apps Script Web App (Live authoritative data for s.mehdi.golzari@gmail.com)
  try {
    const gasResult = await loadDataFromAppsScript(DEFAULT_WEBAPP_URL);
    if (gasResult && gasResult.success) {
      return gasResult;
    }
  } catch (e) {
    console.warn('Strategy 1 (Apps Script live backend) notice:', e);
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetInput);

  // Strategy 2: Direct XLSX export from Google Docs
  try {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    const response = await fetch(exportUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const parsed = parseExcelWorkbook(wb);
      return parsed;
    }
  } catch (e) {
    console.warn('Strategy 2 (Direct XLSX export) notice:', e);
  }

  // Strategy 3: Local Vite / server proxy (/api/sync-sheet)
  try {
    const proxyUrl = `/api/sync-sheet?id=${encodeURIComponent(spreadsheetId)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      return parseExcelWorkbook(wb);
    }
  } catch (e) {
    console.warn('Strategy 3 (Proxy) notice:', e);
  }

  // Strategy 4: Fallback individual GViz CSVs
  const sheetNames = ['Students', 'Schools', 'Tuition', 'Expenses', 'Cheques', 'Staff', 'Managers', 'ExpenseCategories'];
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

  if (wb.SheetNames.length > 0) {
    return parseExcelWorkbook(wb);
  }

  throw new Error('عدم امکان برقراری ارتباط با شیت گوگل. لطفاً اتصال اینترنت خود را بررسی فرمایید.');
};
