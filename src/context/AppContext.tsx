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
import { calculateStudentOverdue, DEFAULT_SMS_TEMPLATE, formatSmsTemplate } from '../utils/debt';
import {
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_WEBAPP_URL,
  OWNER_EMAIL,
  loadDataFromAppsScript,
  loadDataFromExcelFile,
  loadDataFromPublicGoogleSheet,
  extractSpreadsheetId,
  apiLogin,
  apiSaveStudent,
  apiSaveTuition,
  apiSaveExpense,
  apiSaveCheque,
  apiSaveManager,
  apiSaveSchool,
  apiSaveStaffMember,
  postToAppsScript,
} from '../services/googleSheets';
import {
  playSuccessSound,
  playTransactionSound,
  playAlertSound,
  isSoundEnabled,
  setSoundEnabled as persistSoundEnabled,
} from '../utils/soundEffects';

interface AppContextType {
  // Official Signature
  managerSignature: string | null;
  setManagerSignature: (sig: string | null) => void;

  // Sound effects
  soundEnabled: boolean;
  setSoundEnabled: (en: boolean) => void;

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
  withdrawStudent: (id: number) => void;
  importStudents: (newStudents: Array<Omit<Student, 'id' | 'parsian_code'>>) => { added: number; skipped: number; invalid: number };

  // Tuition & Transactions ops
  addTuitionDebt: (data: { student_id: number; amount: number; date: string; description: string; school_id?: number; debt_item_type?: Transaction['debt_item_type']; installment_index?: number; total_installments?: number }) => Transaction;
  addTuitionDiscount: (data: { student_id: number; amount: number; date: string; description: string; discount_reason: string; school_id?: number }) => Transaction;
  addTuitionPayment: (data: {
    student_id: number;
    amount: number;
    date: string;
    description: string;
    payment_method: string;
    tracking_code?: string;
    pos_terminal_number?: string;
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
    petty_cash_card?: string;
    linked_account_name?: string;
    bank_transaction_id?: number;
  }) => Transaction;
  addPettyCashIncome: (data: { amount: number; date: string; tracking_code: string; comment: string; school_id: number; card: string; linked_account_name: string; bank_transaction_id: number }) => Transaction;
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
  importBankTransactions: (txs: Array<Omit<BankTransaction, 'id' | 'reconciled'> & { reconciled?: boolean }>) => number;
  clearImportedBankTransactions: () => void;
  updateBankTransaction: (id: number, data: Partial<BankTransaction>) => void;

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
  login: (username: string, pass?: string) => Promise<boolean>;
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

// Cloud records win on duplicate IDs, but missing cloud fields must not erase
// locally captured student details while a legacy Apps Script deployment catches up.
function mergeCloudAndLocal<T extends { id: string | number }>(remote: T[], local: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of local || []) byId.set(String(item.id), item);
  for (const item of remote || []) {
    const key = String(item.id);
    const previous = byId.get(key);
    if (previous && ('name' in item || 'phone' in item || 'father_phone' in item || 'mother_phone' in item)) {
      const current = item as T & { name?: string; phone?: string; father_phone?: string; mother_phone?: string };
      const prior = previous as T & { name?: string; phone?: string; father_phone?: string; mother_phone?: string };
      byId.set(key, {
        ...prior,
        ...current,
        name: current.name?.trim() ? current.name : prior.name,
        phone: current.phone?.trim() ? current.phone : prior.phone,
        father_phone: current.father_phone?.trim() ? current.father_phone : prior.father_phone,
        mother_phone: current.mother_phone?.trim() ? current.mother_phone : prior.mother_phone,
      } as T);
    } else {
      byId.set(key, item);
    }
  }
  return Array.from(byId.values());
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeIndex, setThemeIndexState] = useState<number>(() => loadFromStorage('theme_index', 0));
  const [fontScale, setFontScaleState] = useState<number>(() => loadFromStorage('font_scale', 1));

  // Signature state
  const [managerSignature, setManagerSignatureState] = useState<string | null>(() =>
    loadFromStorage('signature', null)
  );
  const setManagerSignature = (sig: string | null) => {
    setManagerSignatureState(sig);
    saveToStorage('signature', sig);
  };

  // Sound effects state
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => isSoundEnabled());
  const setSoundEnabled = (en: boolean) => {
    setSoundEnabledState(en);
    persistSoundEnabled(en);
  };

  const normalizeSchoolName = (name: string): string => {
    if (!name) return name;
    let s = name;
    if (s.includes('دبستان') && !s.includes('غیر دولتی')) {
      s = s.replace(/دبستان\s*/g, 'دبستان غیر دولتی ');
    }
    if (s.startsWith('مهد ') && !s.includes('مهدالرضا')) {
      s = s.replace(/مهد\s*/g, 'مهدالرضا(علیه‌السلام) شعبه‌ی ');
    }
    return s.trim();
  };

  const normalizeUserName = (name: string): string => {
    if (!name) return name;
    return name.replace(/حاج‌آقا\s*مهدی\s*گلزاری|حاجاقامهدی\s*گلزاری/g, 'سیدمهدی گلزاری');
  };

  // Require explicit login on every fresh app session; never trust a previously cached role alone.
  const [currentUser, setCurrentUserState] = useState<User | null>(null);

  const [currentScreen, setCurrentScreenState] = useState<ScreenType>('dashboard');
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>([]);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  // AppContext owns the in-app screen stack. Browser history is handled only
  // by App.tsx as a back-event guard, avoiding duplicate history stacks.
  const setCurrentScreen = (newScreen: ScreenType) => {
    setCurrentScreenState((prev) => {
      if (prev !== newScreen) setScreenHistory((h) => [...h, prev]);
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
    return loaded.map((s: School) => ({
      ...s,
      name: normalizeSchoolName(s.name),
    }));
  });

  const [users, setUsers] = useState<User[]>(() => {
    const loaded = loadFromStorage('users', INITIAL_USERS);
    return loaded.map((u: User) => ({
      ...u,
      name: normalizeUserName(u.name),
      school_name: u.school_name ? normalizeSchoolName(u.school_name) : undefined,
    }));
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    const loaded = loadFromStorage('categories', INITIAL_CATEGORIES);
    const hasBankFee = loaded.some((c: ExpenseCategory) => c.name === 'کارمزد بانک');
    if (!hasBankFee) {
      return [...loaded, { id: '9', name: 'کارمزد بانک', active: true }, { id: '10', name: 'هزینه‌های تن‌خواه مدیر', active: true }];
    }
    return loaded;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const loaded = loadFromStorage('students', INITIAL_STUDENTS);
    return loaded.map((st: Student) => ({
      ...st,
      school_name: st.school_name ? normalizeSchoolName(st.school_name) : undefined,
      grade: st.grade === 'مهد' ? 'پیش یک' : st.grade,
      father_phone: st.father_phone || st.phone,
      mother_phone: st.mother_phone || '',
    }));
  });
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

  // Google Sheets & Cloud Connection State - Hardcoded to official school cloud
  const [googleUser, setGoogleUser] = useState<any>({
    email: OWNER_EMAIL,
    displayName: 'سیدمهدی گلزاری (مدیریت ارشد مدرسة القرآن)',
  });
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>('active_cloud');
  const [spreadsheetId, setSpreadsheetIdState] = useState<string>(DEFAULT_SPREADSHEET_ID);
  const [webAppUrl, setWebAppUrlState] = useState<string>(DEFAULT_WEBAPP_URL);
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
  useEffect(() => {
    saveToStorage('font_scale', fontScale);
    const previous = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = `${16 * fontScale}px`;
    return () => { document.documentElement.style.fontSize = previous; };
  }, [fontScale]);
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

  const isConnectedToGoogleSheets = !!(spreadsheetId && (lastSyncTime || syncStats));
  const accentColor = THEME_ACCENTS[themeIndex] || THEME_ACCENTS[0];

  // Retry synchronization when connectivity returns; never replace local data with an empty sheet response.
  useEffect(() => {
    const onOnline = () => {
      if (currentUser) void syncWithGoogleSheets(spreadsheetId);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [currentUser, spreadsheetId]);

  // Cloud synchronization starts only after an authenticated login.

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
        setStudents(result.students);
        if (result.schools && result.schools.length > 0) setSchools(result.schools);
        setTransactions(result.transactions);
        setCheques(result.cheques);
        if (result.categories && result.categories.length > 0) setCategories(result.categories);
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
          `بارگذاری کامل ${result.students.length} دانش‌آموز، ${result.transactions.length} تراکنش`
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

  const connectWithGoogle = async (): Promise<boolean> => {
    return await syncWithGoogleSheets(spreadsheetId);
  };

  const disconnectGoogle = async () => {
    setSyncStatus('idle');
    setLastSyncTime(null);
    saveToStorage('last_sync_time', null);
  };

  const syncWithGoogleSheets = async (targetSheetId?: string): Promise<boolean> => {
    const sId = extractSpreadsheetId(targetSheetId || spreadsheetId || DEFAULT_SPREADSHEET_ID);
    setSyncStatus('syncing');
    setSyncError(null);

    // Strategy 1: Google Apps Script Web App (Live authoritative backend for s.mehdi.golzari@gmail.com)
    try {
      const gasResult = await loadDataFromAppsScript(DEFAULT_WEBAPP_URL);
      if (gasResult && gasResult.success) {
        const remoteStudents = Array.isArray(gasResult.students) ? gasResult.students : [];
        const localStudents = loadFromStorage<Student[]>('students', []);
        // An empty remote response is not permission to erase a non-empty local roster.
        const studentsToKeep = mergeCloudAndLocal(remoteStudents, localStudents);
        setStudents(studentsToKeep);
        saveToStorage('students', studentsToKeep);
        if (remoteStudents.length === 0 && localStudents.length > 0) {
          console.warn('Cloud roster is empty; preserving local students rather than deleting them.');
        }
        // Retry only records explicitly marked as locally-created pending uploads; never upload demo/seed data.
        const pendingStudents = loadFromStorage<Student[]>('pending_student_uploads', []);
        for (const pendingStudent of pendingStudents) {
          const saveResult = await apiSaveStudent(pendingStudent, 'add');
          if (saveResult?.success) {
            saveToStorage('pending_student_uploads', loadFromStorage<Student[]>('pending_student_uploads', []).filter((item) => String(item.id) !== String(pendingStudent.id)));
          }
        }

        if (gasResult.schools && gasResult.schools.length > 0) {
          const mergedSchools = mergeCloudAndLocal(gasResult.schools, loadFromStorage<School[]>('schools', []));
          setSchools(mergedSchools); saveToStorage('schools', mergedSchools);
        }

        const remoteTransactions = Array.isArray(gasResult.transactions) ? gasResult.transactions : [];
        const localTransactions = loadFromStorage<Transaction[]>('transactions', []);
        const transactionsToKeep = mergeCloudAndLocal(remoteTransactions, localTransactions);
        setTransactions(transactionsToKeep);
        saveToStorage('transactions', transactionsToKeep);

        const remoteBank = Array.isArray(gasResult.bankTransactions) ? gasResult.bankTransactions : [];
        const localBank = loadFromStorage<BankTransaction[]>('bank_txs', []);
        const bankToKeep = mergeCloudAndLocal(remoteBank, localBank);
        setBankTransactions(bankToKeep);
        saveToStorage('bank_txs', bankToKeep);

        const remoteCheques = Array.isArray(gasResult.cheques) ? gasResult.cheques : [];
        const localCheques = loadFromStorage<Cheque[]>('cheques', []);
        const chequesToKeep = mergeCloudAndLocal(remoteCheques, localCheques);
        setCheques(chequesToKeep);
        saveToStorage('cheques', chequesToKeep);

        if (gasResult.categories && gasResult.categories.length > 0) {
          const mergedCategories = mergeCloudAndLocal(gasResult.categories, loadFromStorage<ExpenseCategory[]>('categories', []));
          setCategories(mergedCategories); saveToStorage('categories', mergedCategories);
        }

        if (gasResult.managers && gasResult.managers.length > 0) {
          const mergedManagers = mergeCloudAndLocal(gasResult.managers, loadFromStorage<User[]>('users', []));
          setUsers(mergedManagers); saveToStorage('users', mergedManagers);
        }

        if (Array.isArray(gasResult.staff) && gasResult.staff.length > 0) {
          const mergedStaff = mergeCloudAndLocal(gasResult.staff, loadFromStorage<StaffMember[]>('staff_members', []));
          setStaffMembers(mergedStaff);
          saveToStorage('staff_members', mergedStaff);
        }

        setSyncStats(gasResult.stats);
        saveToStorage('sync_stats', gasResult.stats);

        const timeStr =
          jalaliFromGregorian(new Date().toISOString()) +
          ' ' +
          new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeStr);
        saveToStorage('last_sync_time', timeStr);
        setSyncStatus('synced');
        logActivity('همگام‌سازی ابری گوگل شیت', `دریافت ${gasResult.students.length} دانش‌آموز و ${gasResult.transactions.length} تراکنش`);
        return true;
      }
    } catch (e: any) {
      console.warn('Apps Script sync attempt notice:', e);
    }

    // Strategy 2: Direct Google Sheet export / fallback
    try {
      const result = await loadDataFromPublicGoogleSheet(sId);
      if (result.success) {
        const remoteStudents = Array.isArray(result.students) ? result.students : [];
        const localStudents = loadFromStorage<Student[]>('students', []);
        const studentsToKeep = mergeCloudAndLocal(remoteStudents, localStudents);
        setStudents(studentsToKeep);
        saveToStorage('students', studentsToKeep);

        if (result.schools && result.schools.length > 0) {
          const mergedSchools = mergeCloudAndLocal(result.schools, loadFromStorage<School[]>('schools', []));
          setSchools(mergedSchools); saveToStorage('schools', mergedSchools);
        }

        const remoteTransactions = Array.isArray(result.transactions) ? result.transactions : [];
        const localTransactions = loadFromStorage<Transaction[]>('transactions', []);
        const transactionsToKeep = mergeCloudAndLocal(remoteTransactions, localTransactions);
        setTransactions(transactionsToKeep);
        saveToStorage('transactions', transactionsToKeep);

        const remoteBank = Array.isArray(result.bankTransactions) ? result.bankTransactions : [];
        const localBank = loadFromStorage<BankTransaction[]>('bank_txs', []);
        const bankToKeep = mergeCloudAndLocal(remoteBank, localBank);
        setBankTransactions(bankToKeep);
        saveToStorage('bank_txs', bankToKeep);

        const remoteCheques = Array.isArray(result.cheques) ? result.cheques : [];
        const localCheques = loadFromStorage<Cheque[]>('cheques', []);
        const chequesToKeep = mergeCloudAndLocal(remoteCheques, localCheques);
        setCheques(chequesToKeep);
        saveToStorage('cheques', chequesToKeep);

        if (result.categories && result.categories.length > 0) {
          const mergedCategories = mergeCloudAndLocal(result.categories, loadFromStorage<ExpenseCategory[]>('categories', []));
          setCategories(mergedCategories); saveToStorage('categories', mergedCategories);
        }

        if (result.managers && result.managers.length > 0) {
          const mergedManagers = mergeCloudAndLocal(result.managers, loadFromStorage<User[]>('users', []));
          setUsers(mergedManagers); saveToStorage('users', mergedManagers);
        }

        if (result.staff && result.staff.length > 0) {
          setStaffMembers(result.staff);
          saveToStorage('staff_members', result.staff);
        }

        setSyncStats(result.stats);
        saveToStorage('sync_stats', result.stats);

        const timeStr =
          jalaliFromGregorian(new Date().toISOString()) +
          ' ' +
          new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        setLastSyncTime(timeStr);
        saveToStorage('last_sync_time', timeStr);
        setSyncStatus('synced');
        logActivity('همگام‌سازی اکسل گوگل شیت', `دریافت ${result.students.length} دانش‌آموز`);
        return true;
      }
    } catch (err: any) {
      console.warn('Public sheet sync attempt notice:', err);
    }

    setSyncStatus('error');
    setSyncError('عدم امکان همگام‌سازی برخط با سرور ابری. لطفاً اتصال اینترنت خود را بررسی فرمایید.');
    return false;
  };

  const loadPublicSheet = async (id?: string) => {
    return await syncWithGoogleSheets(id);
  };

  const addStudent = (data: Omit<Student, 'id' | 'parsian_code'>): Student => {
    const newId = students.length > 0 ? Math.max(...students.map((s) => s.id)) + 1 : 1;
    const schoolObj = schools.find((s) => s.id === data.school_id);
    const parsian = buildParsianCode(data.national_id, data.school_id);
    const cleanFullName = String(data.name ?? '').normalize('NFC').trim();

    const newStudent: Student = {
      ...data,
      name: cleanFullName,
      id: newId,
      school_name: schoolObj?.name || 'مدرسه',
      parsian_code: parsian.fullCode,
      active: true,
      created_at: new Date().toISOString(),
    };

    setStudents((prev) => [newStudent, ...prev]);
    logActivity('افزودن دانش‌آموز', `ثبت دانش‌آموز ${newStudent.name} در ${newStudent.school_name}`, 'student', newId);

    // Persist a retry queue before network I/O so failed writes can be retried safely.
    const pending = loadFromStorage<Student[]>('pending_student_uploads', []);
    saveToStorage('pending_student_uploads', [...pending.filter((item) => String(item.id) !== String(newStudent.id)), newStudent]);
    apiSaveStudent(newStudent, 'add').then((result) => {
      if (result?.success) {
        saveToStorage('pending_student_uploads', loadFromStorage<Student[]>('pending_student_uploads', []).filter((item) => String(item.id) !== String(newStudent.id)));
      } else {
        console.error('ذخیره دانش‌آموز در گوگل‌شیت انجام نشد:', result?.error || 'خطای نامشخص');
      }
    }).catch((err) => console.warn('Cloud sync student notice:', err));

    return newStudent;
  };

  const updateStudent = (id: number, data: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = {
          ...s,
          ...data,
          name: data.name !== undefined ? String(data.name).normalize('NFC').trim() : s.name,
        };
        if (data.national_id || data.school_id) {
          const sid = data.school_id ?? s.school_id;
          const nid = data.national_id ?? s.national_id;
          updated.parsian_code = buildParsianCode(nid, sid).fullCode;
          const sc = schools.find((x) => x.id === sid);
          if (sc) updated.school_name = sc.name;
        }
        apiSaveStudent(updated, 'update').catch((err) => console.warn('Cloud update student notice:', err));
        return updated;
      })
    );
    logActivity('ویرایش دانش‌آموز', `ویرایش اطلاعات دانش‌آموز شناسه ${id}`, 'student', id);
  };

  const deleteStudent = (id: number) => {
    const student = students.find((s) => s.id === id);
    if (!student) return;
    const hasTransactions = transactions.some((t) => Number(t.student_id) === Number(id));
    if (hasTransactions) {
      console.warn(`دانش‌آموز ${id} دارای گردش مالی است و حذف فیزیکی مجاز نیست.`);
      return;
    }
    setStudents((prev) => prev.filter((s) => s.id !== id));
    apiSaveStudent({ id }, 'delete').then((r) => { if (!r?.success) console.warn('حذف دانش‌آموز در سرور ثبت نشد:', r?.error); }).catch((err) => console.warn('Cloud delete student notice:', err));
    logActivity('حذف دانش‌آموز', `حذف دانش‌آموز ${student.name}`, 'student', id);
  };

  const withdrawStudent = (id: number) => {
    const student = students.find((s) => s.id === id);
    if (!student) return;
    const updated = { ...student, active: false };
    setStudents((prev) => prev.map((s) => s.id === id ? updated : s));
    apiSaveStudent(updated, 'update').then((r) => { if (!r?.success) console.warn('انصراف دانش‌آموز در سرور ثبت نشد:', r?.error); }).catch((err) => console.warn('Cloud withdrawal notice:', err));
    logActivity('انصراف از مدرسه', `دانش‌آموز ${student.name} غیرفعال شد`, 'student', id);
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
        name: String(st.name).trim(),
        id: maxId,
        school_name: schoolObj?.name || 'مدرسه',
        parsian_code: parsian.fullCode,
        active: true,
        created_at: new Date().toISOString(),
      };
      addedList.push(newSt);
      added++;
      const pending = loadFromStorage<Student[]>('pending_student_uploads', []);
      saveToStorage('pending_student_uploads', [...pending.filter((item) => String(item.id) !== String(newSt.id)), newSt]);
      apiSaveStudent(newSt, 'add').then((result) => {
        if (result?.success) saveToStorage('pending_student_uploads', loadFromStorage<Student[]>('pending_student_uploads', []).filter((item) => String(item.id) !== String(newSt.id)));
        else console.error('ذخیره دانش‌آموز واردشده از اکسل ناموفق بود:', result?.error || 'خطای نامشخص');
      }).catch((err) => console.warn('Cloud import student notice:', err));
    });

    setStudents((prev) => [...addedList, ...prev]);
    logActivity('ورود گروهی دانش‌آموزان', `افزودن ${added} دانش‌آموز، ${skipped} تکراری، ${invalid} نامعتبر`);
    return { added, skipped, invalid };
  };

  const addTuitionDebt = (data: {
    student_id: number;
    amount: number;
    date: string;
    description: string;
    school_id?: number;
    debt_item_type?: Transaction['debt_item_type'];
    installment_index?: number;
    total_installments?: number;
  }): Transaction => {
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
      debt_item_type: data.debt_item_type || 'tuition',
      installment_index: data.installment_index,
      total_installments: data.total_installments,
      reconciled: true,
      review_status: 'approved',
    };

    setTransactions((prev) => [newTx, ...prev]);
    playTransactionSound();
    logActivity('ثبت بدهی شهریه', `ثبت ${data.amount.toLocaleString('fa-IR')} ریال برای ${student?.name}`, 'transaction', newId);

    apiSaveTuition(newTx).catch((e) => console.warn('Cloud sync tuition debt notice:', e));
    return newTx;
  };

  const addTuitionDiscount = (data: {
    student_id: number;
    amount: number;
    date: string;
    description: string;
    discount_reason: string;
    school_id?: number;
  }): Transaction => {
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
      kind: 'تخفیف_شهریه',
      amount: data.amount,
      debit: 0,
      credit: data.amount,
      payment_method: 'تخفیف / بورسیه',
      description: data.description || `تخفیف شهریه (${data.discount_reason})`,
      discount_reason: data.discount_reason,
      reconciled: true,
      review_status: 'approved',
    };

    setTransactions((prev) => [newTx, ...prev]);
    playTransactionSound();
    logActivity('ثبت تخفیف شهریه', `تخفیف ${data.amount.toLocaleString('fa-IR')} ریال برای ${student?.name} (${data.discount_reason})`, 'transaction', newId);

    apiSaveTuition(newTx).catch((e) => console.warn('Cloud sync tuition discount notice:', e));
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

      apiSaveCheque(newCheque).catch((e: any) => console.warn('Cloud sheet sync cheque failed:', e));

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
    playTransactionSound();
    logActivity('ثبت دریافت شهریه', `دریافت ${data.amount.toLocaleString('fa-IR')} ریال از ${student?.name}`, 'transaction', newTxId);

    apiSaveTuition(newTx).catch((e) => console.warn('Cloud sync tuition payment notice:', e));
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
    petty_cash_card?: string;
    linked_account_name?: string;
    bank_transaction_id?: number;
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
    playTransactionSound();
    logActivity('ثبت هزینه', `ثبت هزینه ${cat?.name} به مبلغ ${data.amount.toLocaleString('fa-IR')} ریال`, 'transaction', newId);

    apiSaveExpense(newTx).catch((e) => console.warn('Cloud sync expense notice:', e));

    return newTx;
  };

  const addPettyCashIncome = (data: { amount: number; date: string; tracking_code: string; comment: string; school_id: number; card: string; linked_account_name: string; bank_transaction_id: number }): Transaction => {
    const newId = 100000 + (transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 101);
    const schoolObj = schools.find((s) => s.id === data.school_id);
    const newTx: Transaction = {
      id: newId, date: data.date, jalali_date: jalaliFromGregorian(data.date),
      school_id: data.school_id, school_name: schoolObj?.name,
      kind: 'دریافت متفرقه', amount: data.amount, debit: 0, credit: data.amount,
      payment_method: 'کارت تن‌خواه', payment_source: 'petty_cash', petty_cash_card: data.card,
      tracking_code: data.tracking_code, comment: data.comment,
      description: data.comment || 'واریزی به کارت تن‌خواه',
      reconciled: true, review_status: 'approved',
      bank_transaction_id: data.bank_transaction_id, linked_account_name: data.linked_account_name,
    };
    setTransactions((prev) => [newTx, ...prev]);
    logActivity('ثبت واریزی کارت تن‌خواه', `ثبت واریزی ${data.amount.toLocaleString('fa-IR')} ریال برای ${schoolObj?.name || 'مدرسه'}`, 'transaction', newId);
    postToAppsScript({ action: 'finance_transaction', kind: 'cash_receipt', amount: data.amount, date: data.date, school_id: data.school_id, person: currentUser?.name || 'مدیر تن‌خواه', description: data.comment + ' | کارت: ' + data.card + ' | حساب: ' + data.linked_account_name + ' | شناسه ردیف بانک: ' + data.bank_transaction_id, tracking_code: data.tracking_code }).catch((e) => console.warn('Cloud sync petty cash receipt notice:', e));
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
      const bankCard = String(bt.card_number || bt.bank_account || '').replace(/\D/g, '');
      const cardManager = bankCard.length >= 4
        ? users.find((u) => {
            const managerCard = String(u.petty_cash_card || '').replace(/\D/g, '');
            return u.role === 'manager' && managerCard.length >= 4 &&
              (bankCard.endsWith(managerCard) || managerCard.endsWith(bankCard));
          })
        : undefined;
      const matchIndex = updatedTxs.findIndex((t) => {
        if (t.reconciled || Number(t.amount) !== Number(bt.amount)) return false;
        const sameReference = Boolean(t.tracking_code && bt.tracking_code &&
          t.tracking_code.trim() === bt.tracking_code.trim());
        if (sameReference) return true;
        // A card-number match is strong enough for petty-cash matching only when
        // school, manager card, transaction type and amount also agree.
        if (!cardManager || t.payment_source !== 'petty_cash' ||
            Number(t.school_id) !== Number(cardManager.school_id) ||
            (bt.school_id && Number(t.school_id) !== Number(bt.school_id))) return false;
        if (bt.direction === 'withdrawal' && t.kind !== 'هزینه') return false;
        if (bt.direction === 'deposit' && t.kind === 'هزینه') return false;
        return true;
      });
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

  const clearImportedBankTransactions = () => {
    setBankTransactions([]);
    saveToStorage('bank_txs', []);
    logActivity('پاک‌سازی صورتحساب بانکی', 'تمام ردیف‌های واردشدهٔ بانک و پوز از این دستگاه پاک شد؛ اسناد هزینه حذف نشدند.', 'bank', 0);
  };

  const importBankTransactions = (txs: Array<Omit<BankTransaction, 'id' | 'reconciled'> & { reconciled?: boolean }>) => {
    let maxId = bankTransactions.length > 0 ? Math.max(...bankTransactions.map((b) => b.id)) : 0;
    const newItems: BankTransaction[] = txs.map((t) => {
      maxId++;
      return {
        ...t,
        id: maxId,
        reconciled: Boolean(t.reconciled),
      };
    });
    setBankTransactions((prev) => [...newItems, ...prev]);
    const matchedIds = new Set(newItems.filter((item) => item.reconciled && item.matched_transaction_id !== undefined).map((item) => Number(item.matched_transaction_id)));
    if (matchedIds.size) {
      setTransactions((prev) => prev.map((tx) => matchedIds.has(Number(tx.id)) ? { ...tx, reconciled: true } : tx));
    }
    logActivity('ورود فایل صورتحساب بانک', `افزودن ${newItems.length} تراکنش بانکی جدید`);
    return newItems.length;
  };

  const updateBankTransaction = (id: number, data: Partial<BankTransaction>) => {
    setBankTransactions((prev) => prev.map((item) => item.id === id ? { ...item, ...data } : item));
    logActivity('تخصیص تراکنش بانکی', `به‌روزرسانی توضیحات/تخصیص تراکنش بانکی شناسه ${id}`, 'bank_transaction', id);
  };

  const addManager = (m: Omit<User, 'id'>) => {
    const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const { password, ...safeManager } = m;
    const sc = schools.find((s) => s.id === safeManager.school_id);
    const newUser: User = {
      ...safeManager,
      id: newId,
      school_name: sc?.name,
    };
    setUsers((prev) => [...prev, newUser]);
    apiSaveManager({ ...newUser, ...(password ? { password } : {}) }, 'add').then((r) => { if (!r?.success) console.warn('ثبت مدیر در شیت ناموفق بود:', r?.error); }).catch((e) => console.warn('Manager cloud add failed:', e));
    logActivity('افزودن مدیر جدید', `ثبت مدیر ${m.name} برای ${sc?.name || 'مدرسه'}`, 'manager', newId);
  };

  const updateManager = (id: number, m: Partial<User>) => {
    // Passwords are sent only to the authenticated server and never persisted in local state.
    const { password, ...safeChanges } = m;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated = { ...u, ...safeChanges };
        if (safeChanges.school_id) {
          const sc = schools.find((s) => s.id === safeChanges.school_id);
          updated.school_name = sc?.name;
        }
        return updated;
      })
    );
    const existingManager = users.find((u) => u.id === id);
    if (existingManager) {
      apiSaveManager({ ...existingManager, ...safeChanges, ...(password ? { password } : {}), id }, 'update')
        .then((r) => { if (!r?.success) console.warn('ویرایش مدیر در شیت ناموفق بود:', r?.error); })
        .catch((e) => console.warn('Manager cloud update failed:', e));
    }
    logActivity('ویرایش مدیر', `ویرایش مشخصات مدیر شناسه ${id}`, 'manager', id);
  };

  const deleteManager = (id: number) => {
    apiSaveManager({ id }, 'delete').then((r) => { if (!r?.success) console.warn('غیرفعال‌سازی مدیر در شیت ناموفق بود:', r?.error); }).catch((e) => console.warn('Manager cloud delete failed:', e));
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, active: false } : u));
    logActivity('حذف مدیر', `حذف مدیر شناسه ${id}`, 'manager', id);
  };

  const addSchool = (s: Omit<School, 'id'>) => {
    const newId = schools.length > 0 ? Math.max(...schools.map((sc) => sc.id)) + 1 : 1;
    const newSchool: School = { ...s, id: newId };
    setSchools((prev) => [...prev, newSchool]);
    saveToStorage('schools', [...schools, newSchool]);
    apiSaveSchool(newSchool, 'add').then((result) => {
      if (result?.success && result.id && Number(result.id) !== newId) {
        setSchools((prev) => prev.map((sc) => sc.id === newId ? { ...sc, id: Number(result.id) } : sc));
      } else if (!result?.success) {
        console.warn('ثبت مدرسه در Google Sheets ناموفق بود:', result?.error);
      }
    }).catch((error) => console.warn('School cloud add failed:', error));
    logActivity('افزودن مدرسه جدید', `ثبت مرکز/مدرسه ${s.name}`, 'school', newId);
  };

  const updateSchool = (id: number, s: Partial<School>) => {
    setSchools((prev) => {
      const updated = prev.map((sc) => (sc.id === id ? { ...sc, ...s } : sc));
      saveToStorage('schools', updated);
      return updated;
    });
    apiSaveSchool({ ...schools.find((sc) => sc.id === id), ...s, id }, 'update')
      .then((result) => { if (!result?.success) console.warn('ویرایش مدرسه در Google Sheets ناموفق بود:', result?.error); })
      .catch((error) => console.warn('School cloud update failed:', error));
    logActivity('ویرایش اطلاعات مدرسه', `ویرایش مرکز شناسه ${id}`, 'school', id);
  };

  const deleteSchool = (id: number) => {
    apiSaveSchool({ id }, 'delete').then((result) => {
      if (!result?.success) console.warn('حذف مدرسه از Google Sheets ناموفق بود:', result?.error);
    }).catch((error) => console.warn('School cloud delete failed:', error));
    setSchools((prev) => {
      const updated = prev.filter((sc) => sc.id !== id);
      saveToStorage('schools', updated);
      return updated;
    });
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
      formatSmsTemplate(smsConfig.smsTemplate || smsTemplate, student, debt, overdue.overdueDays);

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
    const newStaff: StaffMember = { ...staffData, id: newId, school_name: school?.name || staffData.school_name || 'مدرسه' };
    setStaffMembers((prev) => {
      const updated = [newStaff, ...prev];
      saveToStorage('staff_members', updated);
      return updated;
    });
    apiSaveStaffMember(newStaff, 'add').then((result) => {
      if (result?.success && result.id && Number(result.id) !== newId) {
        setStaffMembers((prev) => {
          const updated = prev.map((item) => item.id === newId ? { ...item, id: Number(result.id) } : item);
          saveToStorage('staff_members', updated);
          return updated;
        });
      } else if (!result?.success) {
        console.warn('ثبت معلم/پرسنل در Google Sheets ناموفق بود:', result?.error);
      }
    }).catch((error) => console.warn('Staff cloud add failed:', error));
    logActivity('ثبت پرسنل/معلم جدید', `ثبت ${newStaff.name} (${newStaff.role_title}) در ${newStaff.school_name}`);
    return newStaff;
  };

  const updateStaffMember = (id: number, data: Partial<StaffMember>) => {
    const existing = staffMembers.find((item) => item.id === id);
    setStaffMembers((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;
        const item = { ...s, ...data };
        if (data.school_id) {
          const sc = schools.find((x) => x.id === data.school_id);
          if (sc) item.school_name = sc.name;
        }
        return item;
      });
      saveToStorage('staff_members', updated);
      return updated;
    });
    if (existing) apiSaveStaffMember({ ...existing, ...data, id }, 'update').then((result) => {
      if (!result?.success) console.warn('ویرایش معلم/پرسنل در Google Sheets ناموفق بود:', result?.error);
    }).catch((error) => console.warn('Staff cloud update failed:', error));
    logActivity('ویرایش اطلاعات پرسنل', `به‌روزرسانی پرسنل شناسه ${id}`);
  };

  const deleteStaffMember = (id: number) => {
    const found = staffMembers.find((s) => s.id === id);
    apiSaveStaffMember({ id }, 'delete').then((result) => {
      if (!result?.success) console.warn('حذف معلم/پرسنل از Google Sheets ناموفق بود:', result?.error);
    }).catch((error) => console.warn('Staff cloud delete failed:', error));
    setStaffMembers((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveToStorage('staff_members', updated);
      return updated;
    });
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

  const login = async (username: string, pass?: string): Promise<boolean> => {
    if (!username.trim() || !pass) return false;
    const result = await apiLogin(username.trim(), pass);
    if (!result.success || !result.user) {
      console.warn('Login rejected:', result.error || 'invalid credentials');
      return false;
    }
    const backendUser = result.user as User;
    const matchedSchool = schools.find((school) => String(school.id) === String(backendUser.school_id));
    const authenticatedUser: User = {
      ...backendUser,
      active: true,
      role: backendUser.role === 'admin' ? 'senior' : backendUser.role,
      school_name: backendUser.school_name || matchedSchool?.name,
    };
    setCurrentUser(authenticatedUser);
    setCurrentScreen('dashboard');
    logActivity('ورود به سیستم', `ورود کاربر ${authenticatedUser.name}`);
    // Do not block navigation on cloud sync; the dashboard opens immediately and sync continues in background.
    void syncWithGoogleSheets(spreadsheetId).catch((err) => console.warn('Post-login sync failed:', err));
    return true;
  };

  const logout = () => {
    try { localStorage.removeItem('school_finance_auth_token'); } catch {}
    saveToStorage('current_user', null);
    setCurrentUser(null);
    setCurrentScreen('dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        managerSignature,
        setManagerSignature,
        soundEnabled,
        setSoundEnabled,
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
        withdrawStudent,
        importStudents,
        addTuitionDebt,
        addTuitionDiscount,
        addTuitionPayment,
        addBulkDebt,
        deleteTransaction,
        updateTransaction,
        addExpense,
        addPettyCashIncome,
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
        clearImportedBankTransactions,
        updateBankTransaction,
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
