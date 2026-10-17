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
  SmsConfig,
  StaffMember,
  StaffWorkLog,
  PayrollPayment,
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
  INITIAL_STAFF,
  INITIAL_WORK_LOGS,
  INITIAL_PAYROLL,
} from '../data/initialData';
import { buildParsianCode } from '../utils/parsian';
import { jalaliFromGregorian, todayGregorian } from '../utils/jalali';
import { calculateStudentOverdue, DEFAULT_SMS_TEMPLATE } from '../utils/debt';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
} from '../services/firebaseAuth';
import {
  DEFAULT_SPREADSHEET_ID,
  loadAccountingDataFromGoogleSheets,
  loadDataFromAppsScript,
  appendSheetRow,
  loadDataFromExcelFile,
  loadDataFromPublicGoogleSheet,
} from '../services/googleSheets';

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
  smsConfig: SmsConfig;
  setSmsConfig: (cfg: Partial<SmsConfig>) => void;
  autoSmsEnabled: boolean;
  setAutoSmsEnabled: (enabled: boolean) => void;
  smsTemplate: string;
  setSmsTemplate: (t: string) => void;
  sendSmsReminder: (studentId: number, customMessage?: string) => { success: boolean; message: string; log: SmsLog };
  sendBatchSmsReminders: (studentIds?: number[]) => { sentCount: number; failedCount: number };
  clearSmsLogs: () => void;

  // Google Sheets & Cloud Connection
  googleUser: any;
  googleAccessToken: string | null;
  isConnectedToGoogleSheets: boolean;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  webAppUrl: string;
  setWebAppUrl: (url: string) => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  lastSyncTime: string | null;
  connectWithGoogle: () => Promise<boolean>;
  disconnectGoogle: () => Promise<void>;
  syncWithGoogleSheets: (targetSheetId?: string) => Promise<boolean>;
  syncStats: { studentsCount: number; transactionsCount: number; chequesCount: number; expensesCount: number } | null;

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
    cheque_data?: {
      sayad_id?: string;
      due_date: string;
      in_favor_school: boolean;
      bank_name?: string;
      cheque_type?: 'sayad' | 'non_sayad' | 'gharzolhasane' | 'guarantee';
      cheque_number?: string;
      issuer_name?: string;
    };
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
  addDirectCheque: (cheque: Omit<Cheque, 'id'>) => Cheque;
  deleteCheque: (id: number) => void;
  updateCheque: (id: number, data: Partial<Cheque>) => void;

  // Offline & Public Sheet import
  loadOfflineExcel: (file: File) => Promise<boolean>;
  loadPublicSheet: (spreadsheetId?: string) => Promise<boolean>;

  // Navigation & Hardware Back History
  screenHistory: ScreenType[];
  goBack: () => void;
  showExitModal: boolean;
  setShowExitModal: (show: boolean) => void;

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

  // Staff & Teachers & Payroll ops
  staffMembers: StaffMember[];
  staffWorkLogs: StaffWorkLog[];
  payrollPayments: PayrollPayment[];
  addStaffMember: (staff: Omit<StaffMember, 'id'>) => StaffMember;
  updateStaffMember: (id: number, staff: Partial<StaffMember>) => void;
  deleteStaffMember: (id: number) => void;
  addStaffWorkLog: (log: Omit<StaffWorkLog, 'id'>) => StaffWorkLog;
  deleteStaffWorkLog: (id: number) => void;
  addPayrollPayment: (payment: Omit<PayrollPayment, 'id' | 'created_at'>) => PayrollPayment;
  deletePayrollPayment: (id: number) => void;
  calculateStaffPayroll: (staffId: number, monthName: string) => {
    workHours: number;
    overtimeHours: number;
    sessionsCount: number;
    hourlyRate: number;
    baseSalary: number;
    grossAmount: number;
    insuranceEmployer: number;
    insuranceEmployee: number;
    netPayable: number;
  };

  // Auth
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

export const DEFAULT_SMS_CONFIG: SmsConfig = {
  provider: 'kavenegar',
  apiKey: '',
  senderNumber: '10008585',
  apiUrl: 'https://api.kavenegar.com/v1/{API_KEY}/sms/send.json',
  patternCode: '',
  enabled: true,
  autoSendOnDebt: false,
  smsTemplate: DEFAULT_SMS_TEMPLATE,
};

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
  const [currentScreen, setCurrentScreenState] = useState<ScreenType>('dashboard');
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>([]);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  const setCurrentScreen = (newScreen: ScreenType) => {
    setCurrentScreenState((prev) => {
      if (prev !== newScreen) {
        setScreenHistory((h) => [...h, prev]);
        try {
          window.history.pushState({ screen: newScreen }, '', '');
        } catch {}
      }
      return newScreen;
    });
  };

  const goBack = () => {
    if (screenHistory.length > 0) {
      const prevScreen = screenHistory[screenHistory.length - 1];
      setScreenHistory((prev) => prev.slice(0, -1));
      setCurrentScreenState(prevScreen);
    } else if (currentScreen !== 'dashboard') {
      setCurrentScreenState('dashboard');
    } else {
      setShowExitModal(true);
    }
  };

  const [schools, setSchools] = useState<School[]>(() => {
    const loaded = loadFromStorage('schools', INITIAL_SCHOOLS);
    return loaded.map((s: School) => {
      if (s.id === 10 || s.name.includes('مرکز قرآنی') || s.name.includes('مهد مرکزی قرآنی')) {
        return { ...s, name: 'مهد برهان', code: 'BORHAN', type: 'مهد و پیش‌دبستانی قرآنی' };
      }
      return s;
    });
  });
  const [users, setUsers] = useState<User[]>(() => loadFromStorage('users', INITIAL_USERS));
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    const loaded = loadFromStorage('categories', INITIAL_CATEGORIES);
    const hasBankFee = loaded.some((c: ExpenseCategory) => c.name === 'کارمزد بانک');
    if (!hasBankFee) {
      return [...loaded, { id: '9', name: 'کارمزد بانک', active: true }, { id: '10', name: 'هزینه‌های تن‌خواه مدیر', active: true }];
    }
    return loaded;
  });
  const [students, setStudents] = useState<Student[]>(() => loadFromStorage('students', INITIAL_STUDENTS));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage('transactions', INITIAL_TRANSACTIONS));
  const [cheques, setCheques] = useState<Cheque[]>(() => loadFromStorage('cheques', INITIAL_CHEQUES));
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => loadFromStorage('bank_txs', INITIAL_BANK_TRANSACTIONS));
  const [seniorMessages, setSeniorMessages] = useState<SeniorMessage[]>(() => loadFromStorage('senior_msgs', INITIAL_MESSAGES));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => loadFromStorage('activity_logs', INITIAL_ACTIVITY_LOGS));
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>(() => loadFromStorage('sms_logs', INITIAL_SMS_LOGS));
  const [autoSmsEnabled, setAutoSmsEnabledState] = useState<boolean>(() => loadFromStorage('auto_sms_enabled', true));
  const [smsTemplate, setSmsTemplateState] = useState<string>(() => loadFromStorage('sms_template', DEFAULT_SMS_TEMPLATE));
  const [smsConfig, setSmsConfigState] = useState<SmsConfig>(() => loadFromStorage('sms_config', DEFAULT_SMS_CONFIG));

  // Staff, Teachers & Payroll State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => loadFromStorage('staff_members', INITIAL_STAFF));
  const [staffWorkLogs, setStaffWorkLogs] = useState<StaffWorkLog[]>(() => loadFromStorage('staff_work_logs', INITIAL_WORK_LOGS));
  const [payrollPayments, setPayrollPayments] = useState<PayrollPayment[]>(() => loadFromStorage('payroll_payments', INITIAL_PAYROLL));

  // Google Sheets & Cloud Connection State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetIdState] = useState<string>(() =>
    loadFromStorage('spreadsheet_id', DEFAULT_SPREADSHEET_ID)
  );
  const [webAppUrl, setWebAppUrlState] = useState<string>(() =>
    loadFromStorage('webapp_url', '')
  );
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() =>
    loadFromStorage('last_sync_time', null)
  );
  const [syncStats, setSyncStats] = useState<{
    studentsCount: number;
    transactionsCount: number;
    chequesCount: number;
    expensesCount: number;
  } | null>(() => loadFromStorage('sync_stats', null));

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
  useEffect(() => saveToStorage('sms_logs', smsLogs), [smsLogs]);
  useEffect(() => saveToStorage('auto_sms_enabled', autoSmsEnabled), [autoSmsEnabled]);
  useEffect(() => saveToStorage('sms_template', smsTemplate), [smsTemplate]);
  useEffect(() => saveToStorage('sms_config', smsConfig), [smsConfig]);
  useEffect(() => saveToStorage('staff_members', staffMembers), [staffMembers]);
  useEffect(() => saveToStorage('staff_work_logs', staffWorkLogs), [staffWorkLogs]);
  useEffect(() => saveToStorage('payroll_payments', payrollPayments), [payrollPayments]);

  const setThemeIndex = (idx: number) => setThemeIndexState(Math.max(0, Math.min(idx, THEME_ACCENTS.length - 1)));
  const setFontScale = (scale: number) => setFontScaleState(Math.max(0.85, Math.min(scale, 1.3)));
  const setCurrentUser = (u: User | null) => setCurrentUserState(u);
  const setAutoSmsEnabled = (val: boolean) => setAutoSmsEnabledState(val);
  const setSmsTemplate = (tmpl: string) => setSmsTemplateState(tmpl);
  const setSmsConfig = (cfg: Partial<SmsConfig>) => {
    setSmsConfigState((prev) => ({ ...prev, ...cfg }));
  };

  const setSpreadsheetId = (id: string) => {
    setSpreadsheetIdState(id);
    saveToStorage('spreadsheet_id', id);
  };

  const setWebAppUrl = (url: string) => {
    setWebAppUrlState(url);
    saveToStorage('webapp_url', url);
  };

  const isConnectedToGoogleSheets = !!(googleAccessToken || (webAppUrl && syncStats));
  const accentColor = THEME_ACCENTS[themeIndex] || THEME_ACCENTS[0];

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        if (token) {
          setGoogleAccessToken(token);
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

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

  const loadOfflineExcel = async (file: File): Promise<boolean> => {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const result = await loadDataFromExcelFile(file);
      if (result.success) {
        if (result.students.length > 0) setStudents(result.students);
        if (result.schools.length > 0) setSchools(result.schools);
        if (result.transactions.length > 0) setTransactions(result.transactions);
        if (result.cheques.length > 0) setCheques(result.cheques);
        if (result.staff && result.staff.length > 0) setStaffMembers(result.staff);
        setSyncStats(result.stats);
        saveToStorage('sync_stats', result.stats);
        const timeStr =
          jalaliFromGregorian(new Date().toISOString()) +
          ' ' +
          new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeStr);
        saveToStorage('last_sync_time', timeStr);
        setSyncStatus('synced');
        logActivity(
          'ورود فایل اکسل شیت آفلاین',
          `بارگذاری کامل ${result.students.length} دانش‌آموز، ${result.transactions.length} تراکنش و معلمان`
        );
        return true;
      }
      return false;
    } catch (e: any) {
      setSyncStatus('error');
      setSyncError(e.message || 'خطا در بارگذاری فایل اکسل');
      return false;
    }
  };

  const loadPublicSheet = async (targetId?: string): Promise<boolean> => {
    const sId = targetId || spreadsheetId;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const result = await loadDataFromPublicGoogleSheet(sId);
      if (result.success) {
        if (result.students.length > 0) setStudents(result.students);
        if (result.schools.length > 0) setSchools(result.schools);
        if (result.transactions.length > 0) setTransactions(result.transactions);
        if (result.cheques.length > 0) setCheques(result.cheques);
        if (result.staff && result.staff.length > 0) setStaffMembers(result.staff);
        setSyncStats(result.stats);
        saveToStorage('sync_stats', result.stats);
        const timeStr =
          jalaliFromGregorian(new Date().toISOString()) +
          ' ' +
          new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeStr);
        saveToStorage('last_sync_time', timeStr);
        setSyncStatus('synced');
        logActivity('همگام‌سازی گوگل شیت برخط', `دریافت ${result.students.length} دانش‌آموز از شیت عمومی`);
        return true;
      }
      return false;
    } catch (e: any) {
      setSyncStatus('error');
      setSyncError(e.message || 'خطا در اتصال به گوگل شیت');
      return false;
    }
  };

  const connectWithGoogle = async (): Promise<boolean> => {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const res = await googleSignIn();
      setGoogleUser(res.user);
      setGoogleAccessToken(res.accessToken);

      // Load data from Google Sheets immediately
      const syncResult = await loadAccountingDataFromGoogleSheets(res.accessToken, spreadsheetId);
      if (syncResult.success) {
        if (syncResult.students.length > 0) setStudents(syncResult.students);
        if (syncResult.schools.length > 0) setSchools(syncResult.schools);
        if (syncResult.transactions.length > 0) setTransactions(syncResult.transactions);
        if (syncResult.cheques.length > 0) setCheques(syncResult.cheques);
        if (syncResult.categories.length > 0) setCategories(syncResult.categories);
        if (syncResult.managers.length > 0) setUsers(syncResult.managers);
        setSyncStats(syncResult.stats);
        saveToStorage('sync_stats', syncResult.stats);

        const timeStr = jalaliFromGregorian(new Date().toISOString()) + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeStr);
        saveToStorage('last_sync_time', timeStr);
        setSyncStatus('synced');
        logActivity('اتصال به Google Sheets', `همگام‌سازی موفق اطلاعات با شناسه شیت ${spreadsheetId}`);
        return true;
      } else {
        setSyncStatus('error');
        setSyncError(syncResult.error || 'خطا در بارگذاری داده‌های شیت');
        return false;
      }
    } catch (e: any) {
      console.warn('Google popup error, trying public sheet fallback:', e);
      try {
        const fallbackRes = await loadPublicSheet(spreadsheetId);
        if (fallbackRes) {
          return true;
        }
      } catch (err) {
        console.warn('Public sheet fallback failed:', err);
      }
      setSyncStatus('error');
      setSyncError('ورود با حساب گوگل در اپلیکیشن مسدود شده است. لطفاً از دکمه «بارگذاری فایل اکسل شیت» یا اتصال به لینک عمومی استفاده کنید.');
      return false;
    }
  };

  const disconnectGoogle = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setGoogleAccessToken(null);
    setSyncStatus('idle');
  };

  const syncWithGoogleSheets = async (targetSheetId?: string): Promise<boolean> => {
    const sId = targetSheetId || spreadsheetId;
    setSyncStatus('syncing');
    setSyncError(null);

    // If webAppUrl is provided and no google token, sync via webAppUrl
    if (webAppUrl && !googleAccessToken) {
      try {
        const result = await loadDataFromAppsScript(webAppUrl);
        if (result.success) {
          if (result.students.length > 0) setStudents(result.students);
          if (result.schools.length > 0) setSchools(result.schools);
          if (result.transactions.length > 0) setTransactions(result.transactions);
          if (result.cheques.length > 0) setCheques(result.cheques);
          setSyncStats(result.stats);
          saveToStorage('sync_stats', result.stats);
          const timeStr = jalaliFromGregorian(new Date().toISOString()) + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
          setLastSyncTime(timeStr);
          saveToStorage('last_sync_time', timeStr);
          setSyncStatus('synced');
          logActivity('همگام‌سازی با وب‌اپ Apps Script', `دریافت ${result.students.length} دانش‌آموز`);
          return true;
        }
      } catch (e: any) {
        console.warn('Apps script sync error:', e);
      }
    }

    let token = googleAccessToken;
    if (!token) {
      token = await getAccessToken();
    }
    if (!token) {
      // Trigger sign-in popup
      return await connectWithGoogle();
    }

    try {
      const syncResult = await loadAccountingDataFromGoogleSheets(token, sId);
      if (syncResult.success) {
        if (syncResult.students.length > 0) setStudents(syncResult.students);
        if (syncResult.schools.length > 0) setSchools(syncResult.schools);
        if (syncResult.transactions.length > 0) setTransactions(syncResult.transactions);
        if (syncResult.cheques.length > 0) setCheques(syncResult.cheques);
        if (syncResult.categories.length > 0) setCategories(syncResult.categories);
        if (syncResult.managers.length > 0) setUsers(syncResult.managers);
        setSyncStats(syncResult.stats);
        saveToStorage('sync_stats', syncResult.stats);

        const timeStr = jalaliFromGregorian(new Date().toISOString()) + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeStr);
        saveToStorage('last_sync_time', timeStr);
        setSyncStatus('synced');
        logActivity('همگام‌سازی با گوگل شیت', `دریافت ${syncResult.students.length} دانش‌آموز و ${syncResult.transactions.length} تراکنش`);
        return true;
      } else {
        setSyncStatus('error');
        setSyncError(syncResult.error || 'خطا در بارگذاری داده‌ها');
        return false;
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncError(e.message || 'خطا در ارتباط با گوگل شیت');
      return false;
    }
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

    // If connected to Google Sheets, append row directly to cloud sheet
    if (googleAccessToken) {
      appendSheetRow(googleAccessToken, spreadsheetId, 'Students', [
        newStudent.id,
        newStudent.name,
        newStudent.grade,
        newStudent.phone,
        newStudent.national_id,
        newStudent.school_id,
        '67',
        schoolObj?.moeen_code || '1',
        newStudent.national_id,
        true,
        new Date().toISOString(),
      ]).catch((err) => console.warn('Cloud sheet append student failed:', err));
    }

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
    let maxId = students.length > 0 ? Math.max(...students.map((s) => s.id)) : 0;
    let added = 0;
    let skipped = 0;
    let invalid = 0;
    const addedList: Student[] = [];

    newStudents.forEach((st) => {
      if (!st.name) {
        invalid++;
        return;
      }
      const isDuplicate = students.some((x) => x.national_id === st.national_id && st.national_id !== '');
      if (isDuplicate) {
        skipped++;
        return;
      }
      maxId++;
      const schoolObj = schools.find((s) => s.id === st.school_id);
      const parsian = buildParsianCode(st.national_id, st.school_id);
      const newSt: Student = {
        ...st,
        id: maxId,
        school_name: schoolObj?.name || 'مدرسه',
        parsian_code: parsian.fullCode,
        active: true,
        created_at: new Date().toISOString(),
      };
      addedList.push(newSt);
      added++;
    });

    setStudents((prev) => [...addedList, ...prev]);
    logActivity('ورود گروهی دانش‌آموزان', `افزودن ${added} دانش‌آموز، ${skipped} تکراری، ${invalid} نامعتبر`);
    return { added, skipped, invalid };
  };

  const addTuitionDebt = (data: { student_id: number; amount: number; date: string; description: string; school_id?: number }): Transaction => {
    const newId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 101;
    const student = students.find((s) => s.id === data.student_id);
    const schoolId = data.school_id || student?.school_id || currentUser?.school_id || 1;
    const schoolObj = schools.find((s) => s.id === schoolId);

    const newTx: Transaction = {
      id: newId,
      date: data.date,
      jalali_date: jalaliFromGregorian(data.date),
      school_id: schoolId,
      school_name: schoolObj?.name || student?.school_name,
      student_id: data.student_id,
      student_name: student?.name,
      student_grade: student?.grade,
      kind: 'شهریه_بدهی',
      amount: data.amount,
      debit: data.amount,
      credit: 0,
      description: data.description || 'شهریه تحصیلی مصوب',
      reconciled: true,
      review_status: 'approved',
    };

    setTransactions((prev) => [newTx, ...prev]);
    logActivity('ثبت بدهی شهریه', `ثبت ${data.amount.toLocaleString('fa-IR')} ریال برای ${student?.name}`, 'transaction', newId);

    if (googleAccessToken) {
      appendSheetRow(googleAccessToken, spreadsheetId, 'Tuition', [
        newTx.id,
        newTx.date,
        newTx.student_id,
        newTx.school_id,
        'debt',
        newTx.amount,
        newTx.description,
        '',
        '',
        currentUser?.username || 'admin',
        new Date().toISOString(),
        true,
        true,
        '',
      ]).catch((e) => console.warn('Cloud sheet sync debt failed:', e));
    }

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
    cheque_data?: {
      sayad_id?: string;
      due_date: string;
      in_favor_school: boolean;
      bank_name?: string;
      cheque_type?: 'sayad' | 'non_sayad' | 'gharzolhasane' | 'guarantee';
      cheque_number?: string;
      issuer_name?: string;
    };
    attachment_url?: string;
  }) => {
    const student = students.find((s) => s.id === data.student_id);
    const schoolId = data.school_id || student?.school_id || currentUser?.school_id || 1;
    const schoolObj = schools.find((s) => s.id === schoolId);

    if (data.payment_method === 'چک' && data.cheque_data) {
      const newChequeId = cheques.length > 0 ? Math.max(...cheques.map((c) => c.id)) + 1 : 1;
      const cType = data.cheque_data.cheque_type || 'sayad';
      const typeLabel =
        cType === 'guarantee'
          ? 'چک ضمانتی'
          : cType === 'gharzolhasane'
          ? 'چک قرض‌الحسنه'
          : cType === 'non_sayad'
          ? 'چک غیر صیادی'
          : 'چک صیادی';

      const newCheque: Cheque = {
        id: newChequeId,
        sayad_id: data.cheque_data.sayad_id,
        cheque_number: data.cheque_data.cheque_number,
        bank_name: data.cheque_data.bank_name,
        cheque_type: cType,
        cheque_purpose: cType === 'guarantee' ? 'guarantee' : 'tuition',
        issuer_name: data.cheque_data.issuer_name || student?.name,
        student_id: data.student_id,
        student_name: student?.name || 'دانش‌آموز',
        school_id: schoolId,
        school_name: schoolObj?.name || 'مدرسه',
        amount: data.amount,
        due_date: data.cheque_data.due_date,
        issue_date: data.date,
        received_confirmed: true,
        in_favor_confirmed: data.cheque_data.in_favor_school,
        status: data.cheque_data.in_favor_school ? 'approved' : 'pending',
        note: data.description,
        attachment_url: data.attachment_url,
      };

      setCheques((prev) => [newCheque, ...prev]);
      logActivity(
        `ثبت دریافت ${typeLabel}`,
        `ثبت ${typeLabel} به مبلغ ${data.amount.toLocaleString('fa-IR')} ریال (${data.cheque_data.bank_name || 'بدون نام بانک'})`,
        'cheque',
        newChequeId
      );

      if (googleAccessToken) {
        appendSheetRow(googleAccessToken, spreadsheetId, 'Cheques', [
          newCheque.id,
          newCheque.issue_date,
          newCheque.student_id,
          newCheque.school_id,
          newCheque.amount,
          newCheque.sayad_id,
          newCheque.due_date,
          newCheque.note || '',
          currentUser?.username || 'admin',
          new Date().toISOString(),
          'چک',
          true,
          newCheque.in_favor_confirmed,
          newCheque.status,
        ]).catch((e) => console.warn('Cloud sheet sync cheque failed:', e));
      }

      if (newCheque.status === 'approved') {
        const newTxId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 101;
        const newTx: Transaction = {
          id: newTxId,
          date: data.date,
          jalali_date: jalaliFromGregorian(data.date),
          school_id: schoolId,
          school_name: schoolObj?.name || student?.school_name,
          student_id: data.student_id,
          student_name: student?.name,
          student_grade: student?.grade,
          kind: 'شهریه',
          amount: data.amount,
          debit: 0,
          credit: data.amount,
          payment_method: 'چک صیادی',
          tracking_code: data.cheque_data.sayad_id,
          description: data.description || 'پرداخت با چک صیادی',
          reconciled: true,
          review_status: 'approved',
          attachment_url: data.attachment_url,
        };
        setTransactions((prev) => [newTx, ...prev]);
      }
      return;
    }

    const newTxId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 101;
    const newTx: Transaction = {
      id: newTxId,
      date: data.date,
      jalali_date: jalaliFromGregorian(data.date),
      school_id: schoolId,
      school_name: schoolObj?.name || student?.school_name,
      student_id: data.student_id,
      student_name: student?.name,
      student_grade: student?.grade,
      kind: 'شهریه',
      amount: data.amount,
      debit: 0,
      credit: data.amount,
      payment_method: data.payment_method,
      tracking_code: data.tracking_code,
      description: data.description || `پرداخت شهریه (${data.payment_method})`,
      reconciled: data.payment_method === 'پول نقد',
      review_status: 'approved',
      attachment_url: data.attachment_url,
    };

    setTransactions((prev) => [newTx, ...prev]);
    logActivity('ثبت دریافت شهریه', `دریافت ${data.amount.toLocaleString('fa-IR')} ریال از ${student?.name}`, 'transaction', newTxId);

    if (googleAccessToken) {
      appendSheetRow(googleAccessToken, spreadsheetId, 'Tuition', [
        newTx.id,
        newTx.date,
        newTx.student_id,
        newTx.school_id,
        'payment',
        newTx.amount,
        newTx.description,
        newTx.tracking_code || '',
        newTx.attachment_url || '',
        currentUser?.username || 'admin',
        new Date().toISOString(),
        true,
        true,
        newTx.payment_method || '',
      ]).catch((e) => console.warn('Cloud sheet sync tuition payment failed:', e));
    }
  };

  const addBulkDebt = (data: { student_ids: number[]; amount: number; date: string; description: string; school_id: number }): number => {
    let currentId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) : 100;
    const schoolObj = schools.find((s) => s.id === data.school_id);
    const newTxs: Transaction[] = [];

    data.student_ids.forEach((stId) => {
      currentId++;
      const student = students.find((s) => s.id === stId);
      newTxs.push({
        id: currentId,
        date: data.date,
        jalali_date: jalaliFromGregorian(data.date),
        school_id: data.school_id,
        school_name: schoolObj?.name || student?.school_name,
        student_id: stId,
        student_name: student?.name,
        student_grade: student?.grade,
        kind: 'شهریه_بدهی',
        amount: data.amount,
        debit: data.amount,
        credit: 0,
        description: data.description || 'شهریه تحصیلی مصوب دوره',
        reconciled: true,
        review_status: 'approved',
      });
    });

    setTransactions((prev) => [...newTxs, ...prev]);
    logActivity('ثبت گروهی بدهی شهریه', `ثبت ${data.amount.toLocaleString('fa-IR')} ریال برای ${data.student_ids.length} دانش‌آموز`);
    return newTxs.length;
  };

  const deleteTransaction = (id: number) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    logActivity('حذف تراکنش', `حذف تراکنش مالی شناسه ${id}`, 'transaction', id);
  };

  const updateTransaction = (id: number, data: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
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
  }): Transaction => {
    const newId = 100000 + (transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 101);
    const cat = categories.find((c) => c.id === data.category_id);
    const schoolId = data.school_id || currentUser?.school_id || 1;
    const schoolObj = schools.find((s) => s.id === schoolId);

    const newTx: Transaction = {
      id: newId,
      date: data.date,
      jalali_date: jalaliFromGregorian(data.date),
      school_id: schoolId,
      school_name: schoolObj?.name,
      kind: 'هزینه',
      amount: data.amount,
      debit: data.amount,
      credit: 0,
      expense_category_id: data.category_id,
      expense_category_name: cat?.name || 'هزینه‌های متفرقه',
      tracking_code: data.tracking_code,
      payment_method: data.payment_source,
      comment: data.comment,
      description: data.comment || `هزینه ${cat?.name || 'مدرسه'}`,
      reconciled: true,
      review_status: 'approved',
      attachment_url: data.attachment_url,
    };

    setTransactions((prev) => [newTx, ...prev]);
    logActivity('ثبت هزینه', `ثبت هزینه ${cat?.name} به مبلغ ${data.amount.toLocaleString('fa-IR')} ریال`, 'transaction', newId);

    if (googleAccessToken) {
      appendSheetRow(googleAccessToken, spreadsheetId, 'Expenses', [
        newTx.id,
        newTx.date,
        newTx.school_id,
        newTx.expense_category_name || '',
        newTx.amount,
        newTx.description,
        newTx.tracking_code || '',
        newTx.attachment_url || '',
        currentUser?.username || 'admin',
        new Date().toISOString(),
        true,
        true,
        newTx.payment_method || '',
      ]).catch((e) => console.warn('Cloud sheet sync expense failed:', e));
    }

    return newTx;
  };

  const deleteExpense = (id: number) => {
    deleteTransaction(id);
  };

  const updateExpense = (id: number, data: Partial<Transaction>) => {
    updateTransaction(id, data);
  };

  const addCategory = (name: string) => {
    const newId = String(categories.length + 1);
    const newCat: ExpenseCategory = { id: newId, name, active: true };
    setCategories((prev) => [...prev, newCat]);
    logActivity('افزودن سرفصل هزینه', `ثبت سرفصل ${name}`);
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

  const addDirectCheque = (chequeData: Omit<Cheque, 'id'>): Cheque => {
    const newChequeId = cheques.length > 0 ? Math.max(...cheques.map((c) => c.id)) + 1 : 1;
    const newCheque: Cheque = {
      ...chequeData,
      id: newChequeId,
    };
    setCheques((prev) => [newCheque, ...prev]);
    const typeLabel =
      newCheque.cheque_type === 'guarantee'
        ? 'چک ضمانتی'
        : newCheque.cheque_type === 'gharzolhasane'
        ? 'چک قرض‌الحسنه'
        : newCheque.cheque_type === 'non_sayad'
        ? 'چک غیر صیادی'
        : 'چک صیادی';
    logActivity('ثبت چک', `ثبت ${typeLabel} به مبلغ ${newCheque.amount.toLocaleString('fa-IR')} ریال`, 'cheque', newChequeId);
    return newCheque;
  };

  const deleteCheque = (id: number) => {
    setCheques((prev) => prev.filter((c) => c.id !== id));
    logActivity('حذف چک', `حذف چک شناسه ${id}`, 'cheque', id);
  };

  const updateCheque = (id: number, data: Partial<Cheque>) => {
    setCheques((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    logActivity('ویرایش مشخصات چک', `ویرایش چک شناسه ${id}`, 'cheque', id);
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

  const sendSmsReminder = (studentId: number, customMessage?: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      return {
        success: false,
        message: 'دانش‌آموز یافت نشد',
        log: {
          id: 'err_' + Date.now(),
          student_id: studentId,
          student_name: 'نامشخص',
          phone: '',
          amount: 0,
          overdue_days: 0,
          message: '',
          sent_at: new Date().toISOString(),
          status: 'failed' as const,
        },
      };
    }

    const { debt } = getStudentBalance(studentId);
    const overdue = calculateStudentOverdue(student, transactions);
    const finalMsg =
      customMessage ||
      smsTemplate
        .replace('{name}', student.name)
        .replace('{school}', student.school_name || 'مدرسه')
        .replace('{amount}', debt.toLocaleString('fa-IR'))
        .replace('{days}', String(overdue.overdueDays));

    const newLog: SmsLog = {
      id: 'sms_' + Date.now() + Math.random().toString(36).substring(2, 5),
      student_id: student.id,
      student_name: student.name,
      school_name: student.school_name,
      phone: student.phone,
      amount: debt,
      overdue_days: overdue.overdueDays,
      message: finalMsg,
      sent_at: jalaliFromGregorian(new Date().toISOString()) + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      status: student.phone && /^0\d{10}$/.test(student.phone) ? 'sent' : 'failed',
    };

    setSmsLogs((prev) => [newLog, ...prev]);
    logActivity('ارسال پیامک یادآوری بدهی', `ارسال به ${student.name} (${student.phone})`, 'student', student.id);

    return {
      success: newLog.status === 'sent',
      message: newLog.status === 'sent' ? `پیامک یادآوری با موفقیت برای شماره ${student.phone} ارسال شد.` : 'شماره تماس دانش‌آموز نامعتبر است.',
      log: newLog,
    };
  };

  const sendBatchSmsReminders = (studentIds?: number[]) => {
    const targetIds = studentIds || students.filter((s) => getStudentBalance(s.id).debt > 0).map((s) => s.id);
    let sentCount = 0;
    let failedCount = 0;
    targetIds.forEach((id) => {
      const res = sendSmsReminder(id);
      if (res.success) sentCount++;
      else failedCount++;
    });
    return { sentCount, failedCount };
  };

  const clearSmsLogs = () => {
    setSmsLogs([]);
  };

  // Staff & Teachers operations
  const addStaffMember = (staffData: Omit<StaffMember, 'id'>): StaffMember => {
    const newId = staffMembers.length > 0 ? Math.max(...staffMembers.map((s) => s.id)) + 1 : 1;
    const school = schools.find((sc) => sc.id === staffData.school_id);
    const newStaff: StaffMember = {
      ...staffData,
      id: newId,
      school_name: school?.name || staffData.school_name || 'مدرسه',
    };
    setStaffMembers((prev) => [newStaff, ...prev]);
    logActivity('ثبت پرسنل/معلم جدید', `ثبت ${newStaff.name} (${newStaff.role_title}) در ${newStaff.school_name}`);
    return newStaff;
  };

  const updateStaffMember = (id: number, data: Partial<StaffMember>) => {
    setStaffMembers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...data };
        if (data.school_id) {
          const sc = schools.find((x) => x.id === data.school_id);
          if (sc) updated.school_name = sc.name;
        }
        return updated;
      })
    );
    logActivity('ویرایش اطلاعات پرسنل', `به‌روزرسانی پرسنل شناسه ${id}`);
  };

  const deleteStaffMember = (id: number) => {
    const found = staffMembers.find((s) => s.id === id);
    setStaffMembers((prev) => prev.filter((s) => s.id !== id));
    logActivity('حذف پرسنل', `حذف پرسنل ${found?.name || id}`);
  };

  const addStaffWorkLog = (logData: Omit<StaffWorkLog, 'id'>): StaffWorkLog => {
    const newId = staffWorkLogs.length > 0 ? Math.max(...staffWorkLogs.map((l) => l.id)) + 1 : 1;
    const staff = staffMembers.find((s) => s.id === logData.staff_id);
    const school = schools.find((sc) => sc.id === logData.school_id);
    const newLog: StaffWorkLog = {
      ...logData,
      id: newId,
      staff_name: staff?.name || logData.staff_name,
      school_name: school?.name || logData.school_name,
    };
    setStaffWorkLogs((prev) => [newLog, ...prev]);
    logActivity('ثبت کارکرد پرسنل', `ثبت کارکرد ماه ${newLog.month_name} برای ${newLog.staff_name} (${newLog.work_hours} ساعت)`);
    return newLog;
  };

  const deleteStaffWorkLog = (id: number) => {
    setStaffWorkLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const calculateStaffPayroll = (staffId: number, monthName: string) => {
    const staff = staffMembers.find((s) => s.id === staffId);
    if (!staff) {
      return {
        workHours: 0,
        overtimeHours: 0,
        sessionsCount: 0,
        hourlyRate: 0,
        baseSalary: 0,
        grossAmount: 0,
        insuranceEmployer: 0,
        insuranceEmployee: 0,
        netPayable: 0,
      };
    }

    const logs = staffWorkLogs.filter((l) => l.staff_id === staffId && l.month_name === monthName);
    const totalHours = logs.reduce((sum, l) => sum + (l.work_hours || 0), 0);
    const totalOvertime = logs.reduce((sum, l) => sum + (l.overtime_hours || 0), 0);
    const totalSessions = logs.reduce((sum, l) => sum + (l.sessions_count || 0), 0);

    const hourlyRate = staff.hourly_rate || 0;
    const baseSalary = staff.base_salary || 0;

    let gross = baseSalary;
    if (staff.contract_type === 'hourly') {
      gross += (totalHours * hourlyRate) + (totalOvertime * hourlyRate * 1.4);
    } else if (staff.contract_type === 'session') {
      gross += (totalSessions * hourlyRate) + (totalHours * hourlyRate);
    } else {
      // monthly
      gross += (totalOvertime * (hourlyRate || Math.round(baseSalary / 160)) * 1.4);
    }

    const insuranceEmployer = staff.insurance_employer_share || 0;
    const insuranceEmployee = staff.insurance_employee_share || 0;
    const netPayable = Math.max(0, gross - insuranceEmployee);

    return {
      workHours: totalHours,
      overtimeHours: totalOvertime,
      sessionsCount: totalSessions,
      hourlyRate,
      baseSalary,
      grossAmount: gross,
      insuranceEmployer,
      insuranceEmployee,
      netPayable,
    };
  };

  const addPayrollPayment = (paymentData: Omit<PayrollPayment, 'id' | 'created_at'>): PayrollPayment => {
    const newId = payrollPayments.length > 0 ? Math.max(...payrollPayments.map((p) => p.id)) + 1 : 1;
    const staff = staffMembers.find((s) => s.id === paymentData.staff_id);
    const school = schools.find((sc) => sc.id === paymentData.school_id);
    const newPayment: PayrollPayment = {
      ...paymentData,
      id: newId,
      staff_name: staff?.name || paymentData.staff_name,
      school_name: school?.name || paymentData.school_name,
      created_at: new Date().toISOString(),
    };
    setPayrollPayments((prev) => [newPayment, ...prev]);

    // Also record automatically as an Expense in school accounting
    const expenseTitle = paymentData.payment_type === 'salary'
      ? `پرداخت حقوق ${newPayment.month_name} - ${newPayment.staff_name}`
      : paymentData.payment_type === 'insurance'
      ? `پرداخت حق بیمه تامین اجتماعی ${newPayment.month_name} - ${newPayment.staff_name}`
      : `پرداخت مزایا/پاداش ${newPayment.month_name} - ${newPayment.staff_name}`;

    addExpense({
      category_id: '4',
      amount: newPayment.net_paid_amount,
      date: newPayment.payment_date,
      tracking_code: newPayment.tracking_code || `PAY-${newId}`,
      payment_source: newPayment.source,
      comment: `${expenseTitle} (پیگیری: ${newPayment.tracking_code})`,
      school_id: newPayment.school_id,
      attachment_url: newPayment.attachment_url,
    });

    logActivity(
      paymentData.payment_type === 'salary' ? 'پرداخت حقوق معلم/پرسنل' : 'پرداخت بیمه پرسنل',
      `واریز مبلغ ${newPayment.net_paid_amount.toLocaleString('fa-IR')} ریال برای ${newPayment.staff_name} (${newPayment.school_name})`
    );

    return newPayment;
  };

  const deletePayrollPayment = (id: number) => {
    setPayrollPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const login = (username: string, pass?: string) => {
    const cleanUser = username.toLowerCase().trim();
    const found = users.find((u) => u.username.toLowerCase() === cleanUser && u.active);

    if (found) {
      // If user has a password defined in Google Sheets
      if (found.password && found.password.trim() !== '') {
        if (!pass || pass.trim() === '') {
          return false;
        }
        const entered = pass.trim();
        const stored = found.password.trim();
        const match = stored === entered || stored.toLowerCase() === entered.toLowerCase();
        if (!match) {
          return false;
        }
      }
      setCurrentUser(found);
      setCurrentScreen('dashboard');
      logActivity('ورود به سیستم', `ورود کاربر ${found.name}`);
      return true;
    }

    // Fallback: if username is 'admin', log in as senior admin
    if (cleanUser === 'admin') {
      const senior = users[0];
      if (senior?.password && senior.password.trim() !== '') {
        if (!pass || pass.trim() !== senior.password.trim()) {
          return false;
        }
      }
      setCurrentUser(senior);
      setCurrentScreen('dashboard');
      logActivity('ورود به سیستم', `ورود کاربر ارشد سامانه`);
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
        smsLogs,
        smsConfig,
        setSmsConfig,
        autoSmsEnabled,
        setAutoSmsEnabled,
        smsTemplate,
        setSmsTemplate,
        sendSmsReminder,
        sendBatchSmsReminders,
        clearSmsLogs,
        googleUser,
        googleAccessToken,
        isConnectedToGoogleSheets,
        spreadsheetId,
        setSpreadsheetId,
        webAppUrl,
        setWebAppUrl,
        syncStatus,
        syncError,
        lastSyncTime,
        connectWithGoogle,
        disconnectGoogle,
        syncWithGoogleSheets,
        syncStats,
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
        addDirectCheque,
        deleteCheque,
        updateCheque,
        loadOfflineExcel,
        loadPublicSheet,
        screenHistory,
        goBack,
        showExitModal,
        setShowExitModal,
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
        staffMembers,
        staffWorkLogs,
        payrollPayments,
        addStaffMember,
        updateStaffMember,
        deleteStaffMember,
        addStaffWorkLog,
        deleteStaffWorkLog,
        addPayrollPayment,
        deletePayrollPayment,
        calculateStaffPayroll,
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
