import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  School,
  Student,
  Transaction,
  Cheque,
  ExpenseCategory,
  BankTransaction,
  SeniorMessage,
  ActivityLog,
  ScreenType,
  SmsLog,
} from '../types';
import {
  INITIAL_SCHOOLS,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_STUDENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_CHEQUES,
  INITIAL_BANK_TRANSACTIONS,
  INITIAL_MESSAGES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_SMS_LOGS,
} from '../data/initialData';
import { buildParsianCode } from '../utils/parsian';
import { jalaliFromGregorian, todayGregorian } from '../utils/jalali';
import { calculateStudentOverdue, DEFAULT_SMS_TEMPLATE } from '../utils/debt';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  currentScreen: ScreenType;
  setCurrentScreen: (s: ScreenType) => void;
  themeIndex: number;
  setThemeIndex: (idx: number) => void;
  fontScale: number;
  setFontScale: (scale: number) => void;
  accentColor: string;

  schools: School[];
  users: User[];
  students: Student[];
  transactions: Transaction[];
  cheques: Cheque[];
  categories: ExpenseCategory[];
  bankTransactions: BankTransaction[];
  seniorMessages: SeniorMessage[];
  activityLogs: ActivityLog[];
  smsLogs: SmsLog[];
  autoSmsEnabled: boolean;
  setAutoSmsEnabled: (enabled: boolean) => void;
  smsTemplate: string;
  setSmsTemplate: (t: string) => void;
  sendSmsReminder: (studentId: number, customMessage?: string) => { success: boolean; message: string; log: SmsLog };
  sendBatchSmsReminders: (studentIds?: number[]) => { sentCount: number; failedCount: number };
  clearSmsLogs: () => void;

  // Student ops
  addStudent: (data: Omit<Student, 'id' | 'parsian_code'>) => Student;
  updateStudent: (id: number, data: Partial<Student>) => void;
  deleteStudent: (id: number) => void;
  importStudents: (newStudents: Array<Omit<Student, 'id' | 'parsian_code'>>) => { added: number; skipped: number; invalid: number };

  // Tuition & Transactions ops
  addTuitionDebt: (data: { student_id: number; amount: number; date: string; description: string; school_id?: number }) => Transaction;
  addTuitionPayment: (data: {
    student_id: number;
    amount: number;
    date: string;
    description: string;
    payment_method: string;
    tracking_code?: string;
    school_id?: number;
    cheque_data?: { sayad_id: string; due_date: string; in_favor_school: boolean };
    attachment_url?: string;
  }) => void;
  addBulkDebt: (data: { student_ids: number[]; amount: number; date: string; description: string; school_id: number }) => number;
  deleteTransaction: (id: number) => void;
  updateTransaction: (id: number, data: Partial<Transaction>) => void;

  // Expense ops
  addExpense: (data: {
    category_id: string;
    amount: number;
    date: string;
    tracking_code: string;
    payment_source: string;
    comment: string;
    school_id?: number;
    attachment_url?: string;
  }) => Transaction;
  deleteExpense: (id: number) => void;
  updateExpense: (id: number, data: Partial<Transaction>) => void;
  addCategory: (name: string) => void;
  toggleCategory: (id: string, active: boolean) => void;

  // Cheque ops
  reviewCheque: (id: number, action: 'receive' | 'favor' | 'reject') => { success: boolean; status: string; message: string };

  // Bank reconciliation ops
  reconcileBank: () => { matched: number; unmatched: number };
  manualReviewTransaction: (id: number, approve: boolean, note?: string) => void;
  importBankTransactions: (txs: Array<Omit<BankTransaction, 'id' | 'reconciled'>>) => number;

  // Managers & Schools ops
  addManager: (m: Omit<User, 'id'>) => void;
  updateManager: (id: number, m: Partial<User>) => void;
  deleteManager: (id: number) => void;
  addSchool: (s: Omit<School, 'id'>) => void;
  updateSchool: (id: number, s: Partial<School>) => void;
  deleteSchool: (id: number) => void;

  // Senior message ops
  addSeniorMessage: (msg: string) => void;
  deleteSeniorMessage: (id: string) => void;

  // Student balance calc
  getStudentBalance: (studentId: number) => { balance: number; debt: number; credit: number };
  
  // Quick Switch/Login
  login: (username: string, pass?: string) => boolean;
  logout: () => void;
}

const THEME_ACCENTS = [
  '#62205f', // 0: Plum / Original
  '#3f51b5', // 1: Indigo / Blue
  '#7b3082', // 2: Violet / Purple
  '#a85213', // 3: Amber / Saffron
  '#2c6c4b', // 4: Emerald / Green
  '#146a67', // 5: Teal / Dark Green
];

const AppContext = createContext<AppContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(`school_finance_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(`school_finance_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage`, e);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeIndex, setThemeIndexState] = useState<number>(() => loadFromStorage('theme_index', 0));
  const [fontScale, setFontScaleState] = useState<number>(() => loadFromStorage('font_scale', 1));
  const [currentUser, setCurrentUserState] = useState<User | null>(() => loadFromStorage('current_user', INITIAL_USERS[0]));
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');

  const [schools, setSchools] = useState<School[]>(() => loadFromStorage('schools', INITIAL_SCHOOLS));
  const [users, setUsers] = useState<User[]>(() => loadFromStorage('users', INITIAL_USERS));
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => loadFromStorage('categories', INITIAL_CATEGORIES));
  const [students, setStudents] = useState<Student[]>(() => loadFromStorage('students', INITIAL_STUDENTS));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage('transactions', INITIAL_TRANSACTIONS));
  const [cheques, setCheques] = useState<Cheque[]>(() => loadFromStorage('cheques', INITIAL_CHEQUES));
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => loadFromStorage('bank_txs', INITIAL_BANK_TRANSACTIONS));
  const [seniorMessages, setSeniorMessages] = useState<SeniorMessage[]>(() => loadFromStorage('senior_msgs', INITIAL_MESSAGES));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => loadFromStorage('activity_logs', INITIAL_ACTIVITY_LOGS));

  useEffect(() => saveToStorage('theme_index', themeIndex), [themeIndex]);
  useEffect(() => saveToStorage('font_scale', fontScale), [fontScale]);
  useEffect(() => saveToStorage('current_user', currentUser), [currentUser]);
  useEffect(() => saveToStorage('schools', schools), [schools]);
  useEffect(() => saveToStorage('users', users), [users]);
  useEffect(() => saveToStorage('categories', categories), [categories]);
  useEffect(() => saveToStorage('students', students), [students]);
  useEffect(() => saveToStorage('transactions', transactions), [transactions]);
  useEffect(() => saveToStorage('cheques', cheques), [cheques]);
  useEffect(() => saveToStorage('bank_txs', bankTransactions), [bankTransactions]);
  useEffect(() => saveToStorage('senior_msgs', seniorMessages), [seniorMessages]);
  useEffect(() => saveToStorage('activity_logs', activityLogs), [activityLogs]);

  const setThemeIndex = (idx: number) => setThemeIndexState(Math.max(0, Math.min(idx, THEME_ACCENTS.length - 1)));
  const setFontScale = (scale: number) => setFontScaleState(Math.max(0.85, Math.min(scale, 1.3)));
  const setCurrentUser = (u: User | null) => setCurrentUserState(u);

  const accentColor = THEME_ACCENTS[themeIndex] || THEME_ACCENTS[0];

  const logActivity = (action: string, description: string, entity_type?: string, entity_id?: string | number) => {
    if (!currentUser) return;
    const newLog: ActivityLog = {
      id: 'act_' + Date.now() + Math.random().toString(36).substring(2, 5),
      user_id: currentUser.id,
      user_name: currentUser.name,
      school_id: currentUser.school_id,
      school_name: currentUser.school_name,
      action,
      description,
      entity_type,
      entity_id,
      date: jalaliFromGregorian(new Date().toISOString()) + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  const addStudent = (data: Omit<Student, 'id' | 'parsian_code'>): Student => {
    const newId = students.length > 0 ? Math.max(...students.map((s) => s.id)) + 1 : 1;
    const schoolObj = schools.find((s) => s.id === data.school_id);
    const parsian = buildParsianCode(data.national_id, data.school_id);

    const newStudent: Student = {
      ...data,
      id: newId,
      school_name: schoolObj?.name || 'مدرسه',
      parsian_code: parsian.fullCode,
      active: true,
      created_at: new Date().toISOString(),
    };

    setStudents((prev) => [newStudent, ...prev]);
    logActivity('افزودن دانش‌آموز', `ثبت دانش‌آموز ${newStudent.name} در ${newStudent.school_name}`, 'student', newId);
    return newStudent;
  };

  const updateStudent = (id: number, data: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...data };
        if (data.national_id || data.school_id) {
          const sid = data.school_id ?? s.school_id;
          const nid = data.national_id ?? s.national_id;
          updated.parsian_code = buildParsianCode(nid, sid).fullCode;
          const sc = schools.find((x) => x.id === sid);
          if (sc) updated.school_name = sc.name;
        }
        return updated;
      })
    );
    logActivity('ویرایش دانش‌آموز', `ویرایش اطلاعات دانش‌آموز شناسه ${id}`, 'student', id);
  };

  const deleteStudent = (id: number) => {
    const student = students.find((s) => s.id === id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    logActivity('حذف دانش‌آموز', `حذف دانش‌آموز ${student?.name || id}`, 'student', id);
  };

  const importStudents = (newStudents: Array<Omit<Student, 'id' | 'parsian_code'>>) => {
    let added = 0;
    let skipped = 0;
    let invalid = 0;
    let currentMaxId = students.length > 0 ? Math.max(...students.map((s) => s.id)) : 0;
    const existingNids = new Set(students.map((s) => s.national_id.trim()));

    const toAdd: Student[] = [];
    newStudents.forEach((st) => {
      const nid = st.national_id.trim();
      if (existingNids.has(nid)) {
        skipped++;
        return;
      }
      currentMaxId++;
      const isInvalid = !/^\d{10}$/.test(nid);
      if (isInvalid) invalid++;
      existingNids.add(nid);

      const sc = schools.find((s) => s.id === st.school_id);
      const parsian = buildParsianCode(nid, st.school_id);
      toAdd.push({
        ...st,
        id: currentMaxId,
        school_name: sc?.name || 'مدرسه',
        parsian_code: parsian.fullCode,
        needs_fix: isInvalid || st.needs_fix,
        active: true,
      });
      added++;
    });

    if (toAdd.length > 0) {
      setStudents((prev) => [...toAdd, ...prev]);
      logActivity('ورود گروهی دانش‌آموزان از اکسل', `افزودن ${added} دانش‌آموز، ${skipped} تکراری، ${invalid} نیازمند اصلاح`);
    }

    return { added, skipped, invalid };
  };

  const addTuitionDebt = (data: { student_id: number; amount: number; date: string; description: string; school_id?: number }) => {
    const student = students.find((s) => s.id === data.student_id);
    const sid = data.school_id || student?.school_id || currentUser?.school_id || 1;
    const sc = schools.find((s) => s.id === sid);
    const newId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 101;

    const newTx: Transaction = {
      id: newId,
      date: data.date,
      jalali_date: jalaliFromGregorian(data.date),
      school_id: sid,
      school_name: sc?.name || student?.school_name || 'مدرسه',
      student_id: data.student_id,
      student_name: student?.name || 'دانش‌آموز',
      student_grade: student?.grade,
      kind: 'شهریه_بدهی',
      amount: data.amount,
      debit: data.amount,
      credit: 0,
      description: data.description,
      reconciled: true,
      review_status: 'approved',
    };

    setTransactions((prev) => [newTx, ...prev]);
    logActivity('ثبت بدهی شهریه', `ثبت بدهی ${data.amount.toLocaleString()} ریال برای ${student?.name}`, 'tuition', newId);
    return newTx;
  };

  const addTuitionPayment = (data: {
    student_id: number;
    amount: number;
    date: string;
    description: string;
    payment_method: string;
    tracking_code?: string;
    school_id?: number;
    cheque_data?: { sayad_id: string; due_date: string; in_favor_school: boolean };
    attachment_url?: string;
  }) => {
    const student = students.find((s) => s.id === data.student_id);
    const sid = data.school_id || student?.school_id || currentUser?.school_id || 1;
    const sc = schools.find((s) => s.id === sid);
    const newId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 101;

    if (data.payment_method === 'چک' && data.cheque_data) {
      const newChequeId = cheques.length > 0 ? Math.max(...cheques.map((c) => c.id)) + 1 : 1;
      const newCheque: Cheque = {
        id: newChequeId,
        sayad_id: data.cheque_data.sayad_id,
        student_id: data.student_id,
        student_name: student?.name || 'دانش‌آموز',
        school_id: sid,
        school_name: sc?.name || 'مدرسه',
        amount: data.amount,
        due_date: data.cheque_data.due_date,
        issue_date: data.date,
        received_confirmed: false,
        in_favor_confirmed: data.cheque_data.in_favor_school,
        status: 'pending',
        attachment_url: data.attachment_url,
        note: data.description,
      };
      setCheques((prev) => [newCheque, ...prev]);
      logActivity('ثبت چک صیادی', `ثبت چک صیادی ${data.cheque_data.sayad_id} به مبلغ ${data.amount.toLocaleString()} ریال برای ${student?.name}`, 'cheque', newChequeId);
      return;
    }

    const newTx: Transaction = {
      id: newId,
      date: data.date,
      jalali_date: jalaliFromGregorian(data.date),
      school_id: sid,
      school_name: sc?.name || student?.school_name || 'مدرسه',
      student_id: data.student_id,
      student_name: student?.name || 'دانش‌آموز',
      student_grade: student?.grade,
      kind: 'شهریه',
      amount: data.amount,
      debit: 0,
      credit: data.amount,
      payment_method: data.payment_method,
      tracking_code: data.tracking_code,
      description: data.description,
      attachment_url: data.attachment_url,
      reconciled: data.payment_method === 'پول نقد',
      review_status: 'approved',
    };

    setTransactions((prev) => [newTx, ...prev]);
    logActivity('ثبت دریافت شهریه', `دریافت ${data.amount.toLocaleString()} ریال (${data.payment_method}) از ${student?.name}`, 'tuition', newId);
  };

  const addBulkDebt = (data: { student_ids: number[]; amount: number; date: string; description: string; school_id: number }) => {
    let currentId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) : 100;
    const sc = schools.find((s) => s.id === data.school_id);
    const newTxs: Transaction[] = [];

    data.student_ids.forEach((stId) => {
      const student = students.find((s) => s.id === stId);
      currentId++;
      newTxs.push({
        id: currentId,
        date: data.date,
        jalali_date: jalaliFromGregorian(data.date),
        school_id: data.school_id,
        school_name: sc?.name || 'مدرسه',
        student_id: stId,
        student_name: student?.name || 'دانش‌آموز',
        student_grade: student?.grade,
        kind: 'شهریه_بدهی',
        amount: data.amount,
        debit: data.amount,
        credit: 0,
        description: data.description,
        reconciled: true,
        review_status: 'approved',
      });
    });

    setTransactions((prev) => [...newTxs, ...prev]);
    logActivity('ثبت گروهی بدهی شهریه', `ثبت بدهی برای ${newTxs.length} دانش‌آموز به مبلغ هر کدام ${data.amount.toLocaleString()} ریال`);
    return newTxs.length;
  };

  const deleteTransaction = (id: number) => {
    const tx = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    logActivity('حذف تراکنش', `حذف تراکنش شناسه ${id} (${tx?.kind})`, 'transaction', id);
  };

  const updateTransaction = (id: number, data: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...data };
        if (data.amount !== undefined) {
          if (t.kind === 'شهریه_بدهی' || t.kind === 'هزینه') {
            updated.debit = data.amount;
          } else {
            updated.credit = data.amount;
          }
        }
        if (data.date) {
          updated.jalali_date = jalaliFromGregorian(data.date);
        }
        return updated;
      })
    );
    logActivity('ویرایش تراکنش', `ویرایش تراکنش شناسه ${id}`, 'transaction', id);
  };

  const addExpense = (data: {
    category_id: string;
    amount: number;
    date: string;
    tracking_code: string;
    payment_source: string;
    comment: string;
    school_id?: number;
    attachment_url?: string;
  }) => {
    const cat = categories.find((c) => c.id === data.category_id);
    const sid = data.school_id || currentUser?.school_id || 1;
    const sc = schools.find((s) => s.id === sid);
    const newId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 101;

    const newTx: Transaction = {
      id: newId,
      date: data.date,
      jalali_date: jalaliFromGregorian(data.date),
      school_id: sid,
      school_name: sc?.name || 'مدرسه',
      kind: 'هزینه',
      amount: data.amount,
      debit: data.amount,
      credit: 0,
      expense_category_id: data.category_id,
      expense_category_name: cat?.name || 'هزینه‌های متفرقه',
      payment_source: data.payment_source,
      tracking_code: data.tracking_code,
      description: data.comment,
      comment: data.comment,
      attachment_url: data.attachment_url,
      reconciled: data.payment_source !== 'bank',
      review_status: 'approved',
    };

    setTransactions((prev) => [newTx, ...prev]);
    logActivity('ثبت هزینه', `ثبت هزینه ${data.amount.toLocaleString()} ریال بابت ${cat?.name || 'متفرقه'} (${data.payment_source === 'own' ? 'حساب شخصی مدیر' : 'حساب بانک'})`, 'expense', newId);
    return newTx;
  };

  const deleteExpense = (id: number) => deleteTransaction(id);
  const updateExpense = (id: number, data: Partial<Transaction>) => updateTransaction(id, data);

  const addCategory = (name: string) => {
    const newCat: ExpenseCategory = {
      id: String(Date.now()),
      name,
      active: true,
    };
    setCategories((prev) => [...prev, newCat]);
    logActivity('افزودن دسته‌بندی هزینه', `افزودن سرفصل ${name}`, 'category', newCat.id);
  };

  const toggleCategory = (id: string, active: boolean) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
  };

  const reviewCheque = (id: number, action: 'receive' | 'favor' | 'reject') => {
    const cheque = cheques.find((c) => c.id === id);
    if (!cheque) return { success: false, status: 'error', message: 'چک پیدا نشد' };

    let updatedStatus = cheque.status;
    let rec = cheque.received_confirmed;
    let fav = cheque.in_favor_confirmed;

    if (action === 'receive') {
      rec = true;
    } else if (action === 'favor') {
      fav = true;
    } else if (action === 'reject') {
      updatedStatus = 'rejected';
    }

    if (rec && fav && updatedStatus !== 'rejected') {
      updatedStatus = 'approved';
    }

    setCheques((prev) =>
      prev.map((c) => (c.id === id ? { ...c, received_confirmed: rec, in_favor_confirmed: fav, status: updatedStatus } : c))
    );

    // If fully approved, post credit transaction to student statement
    if (updatedStatus === 'approved' && cheque.status !== 'approved') {
      const newTxId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 101;
      const student = students.find((s) => s.id === cheque.student_id);
      const newTx: Transaction = {
        id: newTxId,
        date: cheque.issue_date || todayGregorian(),
        jalali_date: jalaliFromGregorian(cheque.issue_date || todayGregorian()),
        school_id: cheque.school_id,
        school_name: cheque.school_name,
        student_id: cheque.student_id,
        student_name: cheque.student_name,
        student_grade: student?.grade,
        kind: 'شهریه',
        amount: cheque.amount,
        debit: 0,
        credit: cheque.amount,
        payment_method: 'چک صیادی',
        tracking_code: cheque.sayad_id,
        description: `وصول چک صیادی شناسه ${cheque.sayad_id} (سررسید: ${jalaliFromGregorian(cheque.due_date)})`,
        reconciled: true,
        review_status: 'approved',
      };
      setTransactions((prev) => [newTx, ...prev]);
    }

    logActivity('بررسی چک صیادی', `تغییر وضعیت چک ${cheque.sayad_id} به ${updatedStatus}`, 'cheque', id);

    return {
      success: true,
      status: updatedStatus,
      message:
        updatedStatus === 'approved'
          ? 'چک با موفقیت تأیید شد و پرداخت در ریز گردش ثبت گردید.'
          : updatedStatus === 'rejected'
          ? 'چک رد شد و از فهرست انتظار خارج گردید.'
          : 'تأیید ثبت شد؛ برای تأیید نهایی باید هر دو شرط تأیید دریافت و در وجه مدرسه احراز شوند.',
    };
  };

  const reconcileBank = () => {
    let matchedCount = 0;
    const updatedBank = [...bankTransactions];
    const updatedTxs = [...transactions];

    updatedBank.forEach((bt) => {
      if (bt.reconciled) return;
      const matchIndex = updatedTxs.findIndex(
        (t) =>
          !t.reconciled &&
          (t.amount === bt.amount || (t.debit === bt.amount && t.credit === 0)) &&
          (t.tracking_code && bt.tracking_code && t.tracking_code.trim() === bt.tracking_code.trim())
      );
      if (matchIndex !== -1) {
        bt.reconciled = true;
        bt.matched_transaction_id = updatedTxs[matchIndex].id;
        updatedTxs[matchIndex].reconciled = true;
        matchedCount++;
      }
    });

    setBankTransactions(updatedBank);
    setTransactions(updatedTxs);
    const unmatchedCount = updatedBank.filter((b) => !b.reconciled).length;
    logActivity('تطبیق هوشمند تراکنش‌های بانک', `${matchedCount} مورد تطبیق موفق، ${unmatchedCount} مورد نیازمند بررسی`);
    return { matched: matchedCount, unmatched: unmatchedCount };
  };

  const manualReviewTransaction = (id: number, approve: boolean, note?: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, reconciled: approve, review_status: approve ? 'approved' : 'rejected', comment: note ? `${t.comment || ''} [${note}]` : t.comment } : t))
    );
    logActivity('بررسی دستی تطبیق تراکنش', `${approve ? 'تأیید' : 'رد'} تراکنش شناسه ${id}`, 'transaction', id);
  };

  const importBankTransactions = (txs: Array<Omit<BankTransaction, 'id' | 'reconciled'>>) => {
    let maxId = bankTransactions.length > 0 ? Math.max(...bankTransactions.map((b) => b.id)) : 0;
    const newItems: BankTransaction[] = txs.map((t) => {
      maxId++;
      return {
        ...t,
        id: maxId,
        reconciled: false,
      };
    });
    setBankTransactions((prev) => [...newItems, ...prev]);
    logActivity('ورود فایل صورتحساب بانک', `افزودن ${newItems.length} تراکنش بانکی جدید`);
    return newItems.length;
  };

  const addManager = (m: Omit<User, 'id'>) => {
    const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const sc = schools.find((s) => s.id === m.school_id);
    const newUser: User = {
      ...m,
      id: newId,
      school_name: sc?.name,
    };
    setUsers((prev) => [...prev, newUser]);
    logActivity('افزودن مدیر جدید', `ثبت مدیر ${m.name} برای ${sc?.name || 'مدرسه'}`, 'manager', newId);
  };

  const updateManager = (id: number, m: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated = { ...u, ...m };
        if (m.school_id) {
          const sc = schools.find((s) => s.id === m.school_id);
          updated.school_name = sc?.name;
        }
        return updated;
      })
    );
    logActivity('ویرایش مدیر', `ویرایش مشخصات مدیر شناسه ${id}`, 'manager', id);
  };

  const deleteManager = (id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    logActivity('حذف مدیر', `حذف مدیر شناسه ${id}`, 'manager', id);
  };

  const addSchool = (s: Omit<School, 'id'>) => {
    const newId = schools.length > 0 ? Math.max(...schools.map((sc) => sc.id)) + 1 : 1;
    const newSchool: School = { ...s, id: newId };
    setSchools((prev) => [...prev, newSchool]);
    logActivity('افزودن مدرسه جدید', `ثبت مرکز/مدرسه ${s.name}`, 'school', newId);
  };

  const updateSchool = (id: number, s: Partial<School>) => {
    setSchools((prev) => prev.map((sc) => (sc.id === id ? { ...sc, ...s } : sc)));
    logActivity('ویرایش اطلاعات مدرسه', `ویرایش مرکز شناسه ${id}`, 'school', id);
  };

  const deleteSchool = (id: number) => {
    setSchools((prev) => prev.filter((sc) => sc.id !== id));
    logActivity('حذف مدرسه', `حذف مدرسه شناسه ${id}`, 'school', id);
  };

  const addSeniorMessage = (message: string) => {
    const newMsg: SeniorMessage = {
      id: 'm_' + Date.now(),
      message,
      created_at: new Date().toISOString(),
      author_name: currentUser?.name || 'مدیر ارشد',
    };
    setSeniorMessages((prev) => [newMsg, ...prev]);
    logActivity('ارسال پیام عمومی به مدیران', message);
  };

  const deleteSeniorMessage = (id: string) => {
    setSeniorMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const getStudentBalance = (studentId: number) => {
    const studentTxs = transactions.filter((t) => t.student_id === studentId);
    let totalDebit = 0;
    let totalCredit = 0;
    studentTxs.forEach((t) => {
      totalDebit += t.debit || 0;
      totalCredit += t.credit || 0;
    });
    const balance = totalDebit - totalCredit;
    return {
      balance,
      debt: Math.max(0, balance),
      credit: Math.max(0, -balance),
    };
  };

  const login = (username: string) => {
    const found = users.find((u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.active);
    if (found) {
      setCurrentUser(found);
      setCurrentScreen('dashboard');
      logActivity('ورود به سیستم', `ورود کاربر ${found.name}`);
      return true;
    }
    // Fallback: if username is 'admin', log in as senior admin
    if (username === 'admin') {
      setCurrentUser(users[0]);
      setCurrentScreen('dashboard');
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentScreen('dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentScreen,
        setCurrentScreen,
        themeIndex,
        setThemeIndex,
        fontScale,
        setFontScale,
        accentColor,
        schools,
        users,
        students,
        transactions,
        cheques,
        categories,
        bankTransactions,
        seniorMessages,
        activityLogs,
        addStudent,
        updateStudent,
        deleteStudent,
        importStudents,
        addTuitionDebt,
        addTuitionPayment,
        addBulkDebt,
        deleteTransaction,
        updateTransaction,
        addExpense,
        deleteExpense,
        updateExpense,
        addCategory,
        toggleCategory,
        reviewCheque,
        reconcileBank,
        manualReviewTransaction,
        importBankTransactions,
        addManager,
        updateManager,
        deleteManager,
        addSchool,
        updateSchool,
        deleteSchool,
        addSeniorMessage,
        deleteSeniorMessage,
        getStudentBalance,
        login,
        logout,
      }}
    >
      <div style={{ fontSize: `${fontScale}rem` }}>
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
