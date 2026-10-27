import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  BankAccount,
  ManagerFeedback,
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
  INITIAL_BANK_ACCOUNTS,
  INITIAL_FEEDBACKS,
} from '../data/initialData';
import { buildParsianCode } from '../utils/parsian';
import { jalaliFromGregorian, todayGregorian, todayJalali } from '../utils/jalali';
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
  postToAppsScript,
  buildStudentPayload,
  buildTuitionPayload,
  buildExpensePayload,
  buildChequePayload,
  buildPettyIncomePayload,
  buildReviewPayload,
  buildManagerPayload,
  buildSchoolPayload,
  buildStaffPayload,
  buildBankAccountPayload,
  buildWorkLogPayload,
  buildPayrollPayload,
} from '../services/googleSheets';
import {
  enqueue,
  loadOutbox,
  outboxSnapshot,
  subscribeOutbox,
  rewriteOutbox,
  dismissEntry,
  retryFailedEntries,
  drainOutbox,
  type OutboxEntry,
  type OutboxEntity,
  type DrainResult,
} from '../services/outbox';
import { primeAttachmentCache, stripInlineImages } from '../services/attachments';
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
  feedbacks: ManagerFeedback[];
  addFeedback: (fb: Omit<ManagerFeedback, 'id' | 'tracking_code' | 'created_at' | 'created_at_jalali' | 'status'>) => ManagerFeedback;
  updateFeedbackStatus: (id: string, status: ManagerFeedback['status'], reply?: string) => void;
  deleteFeedback: (id: string) => void;
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
  syncProgress: number;
  syncStageText: string;
  syncError: string | null;
  lastSyncTime: string | null;
  connectWithGoogle: () => Promise<boolean>;
  disconnectGoogle: () => Promise<void>;
  syncWithGoogleSheets: (targetSheetId?: string) => Promise<boolean>;
  pendingSyncCount: number;
  failedSyncItems: Array<{ key: string; action: string; label: string; error: string }>;
  retryFailedSync: () => void;
  dismissFailedSync: (key: string) => void;
  syncStats: { studentsCount: number; transactionsCount: number; chequesCount: number; expensesCount: number } | null;

  // Student ops
  addStudent: (data: Omit<Student, 'id' | 'parsian_code'>) => Student;
  updateStudent: (id: number, data: Partial<Student>) => void;
  deleteStudent: (id: number) => void;
  withdrawStudent: (id: number) => void;
  importStudents: (newStudents: Array<Omit<Student, 'id' | 'parsian_code'>>) => Promise<{ added: number; skipped: number; invalid: number }>;

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
  approveTransaction: (id: number) => Promise<boolean>;
  rejectTransaction: (id: number, reason?: string) => Promise<boolean>;

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

  // Bank accounts management
  bankAccounts: BankAccount[];
  addBankAccount: (acc: Omit<BankAccount, 'id'>) => BankAccount;
  updateBankAccount: (id: number, data: Partial<BankAccount>) => void;
  deleteBankAccount: (id: number) => void;

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
  login: (username: string, pass?: string, onProgress?: (percent: number, stage: string) => void) => Promise<boolean>;
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
    if (previous) {
      const current = item as any;
      const prior = previous as any;
      byId.set(key, {
        ...prior,
        ...current,
        name: current.name?.trim() ? current.name : prior.name,
        phone: current.phone?.trim() ? current.phone : prior.phone,
        father_phone: current.father_phone?.trim() ? current.father_phone : prior.father_phone,
        mother_phone: current.mother_phone?.trim() ? current.mother_phone : prior.mother_phone,
        attachment_url: current.attachment_url?.trim() ? current.attachment_url : prior.attachment_url,
        review_status: current.review_status || prior.review_status,
        rejection_reason: current.rejection_reason || prior.rejection_reason,
      } as T);
    } else {
      byId.set(key, item);
    }
  }
  return Array.from(byId.values());
}


// ───────── Temporary ids for records that exist only on this device until the server confirms them ─────────
const TEMP_BASE = 900000000;
const nextTempId = (): number => {
  try {
    const n = (Number(localStorage.getItem('school_finance_temp_seq')) || 0) + 1;
    localStorage.setItem('school_finance_temp_seq', String(n));
    return TEMP_BASE + n;
  } catch {
    return TEMP_BASE + Math.floor(Math.random() * 90000000);
  }
};
const tempStringId = (): string => `tmp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const isTempId = (id: any): boolean => (typeof id === 'string' ? id.startsWith('tmp_') : Number(id) >= TEMP_BASE);
/** Transaction ids in the app are shifted per sheet: expenses +100000, ledger-only documents +200000000. */
const txServerId = (id: number): number => (id >= 200000000 && id < TEMP_BASE ? id - 200000000 : id >= 100000 && id < 200000000 ? id - 100000 : id);

const ACTION_LABELS: Record<string, string> = {
  student_add: 'ثبت دانش‌آموز', student_update: 'ویرایش دانش‌آموز', student_delete: 'حذف دانش‌آموز',
  tuition_add: 'ثبت شهریه/بدهی/تخفیف', tuition_bulk_debt: 'ثبت گروهی بدهی', tuition_update: 'ویرایش شهریه', tuition_delete: 'حذف شهریه',
  expense_add: 'ثبت هزینه', expense_update: 'ویرایش هزینه', expense_delete: 'حذف هزینه', transaction_update: 'ویرایش سند', transaction_delete: 'حذف سند',
  transaction_review: 'تأیید/رد تراکنش', finance_transaction: 'ثبت واریزی', cheque_add: 'ثبت چک', cheque_update: 'ویرایش چک', cheque_delete: 'حذف چک', cheque_review: 'بررسی چک',
  staff_add: 'ثبت پرسنل', staff_update: 'ویرایش پرسنل', staff_delete: 'حذف پرسنل', staff_worklog_add: 'ثبت کارکرد', staff_worklog_delete: 'حذف کارکرد',
  payroll_add: 'ثبت پرداخت حقوق', payroll_delete: 'حذف پرداخت حقوق', bank_account_add: 'تعریف حساب بانکی', bank_account_update: 'ویرایش حساب بانکی', bank_account_delete: 'حذف حساب بانکی',
  bank_upload: 'ورود صورتحساب بانک', bank_reconcile: 'تطبیق بانکی', bank_annotation: 'تخصیص تراکنش بانکی', bank_match: 'تطبیق دستی بانک',
  manager_add: 'ثبت مدیر', manager_update: 'ویرایش مدیر', manager_delete: 'حذف مدیر', school_add: 'ثبت مدرسه', school_update: 'ویرایش مدرسه', school_delete: 'حذف مدرسه',
  category_add: 'ثبت سرفصل هزینه', category_update: 'ویرایش سرفصل هزینه', message_add: 'ارسال پیام', message_delete: 'حذف پیام',
};

/**
 * Merges a server list into the local copy:
 *  - the server wins for ids it returns,
 *  - an item this device saw on the server earlier but that is gone now was deleted elsewhere → removed,
 *  - items never seen on the server (still waiting in the outbox) are kept.
 */
function reconcileEntity<T extends { id: string | number }>(name: string, remote: T[], local: T[]): T[] {
  const key = `synced_ids_${name}`;
  const seen = new Set<string>(loadFromStorage<string[]>(key, []));
  const remoteIds = new Set(remote.map((r) => String(r.id)));
  const keptLocal = (local || []).filter((l) => {
    const id = String(l.id);
    return remoteIds.has(id) || !seen.has(id) || isTempId(l.id);
  });
  const merged = mergeCloudAndLocal(remote, keptLocal);
  saveToStorage(key, Array.from(remoteIds));
  return merged;
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
    // If the local categories don't match the Google Sheet categories (e.g. old demo list), refresh to INITIAL_CATEGORIES
    if (loaded.some((c: ExpenseCategory) => c.name.includes('لوازم‌التحریر') || c.name.includes('تعمیرات، تأسیسات'))) {
      saveToStorage('categories', INITIAL_CATEGORIES);
      return INITIAL_CATEGORIES;
    }
    const hasBankFee = loaded.some((c: ExpenseCategory) => c.name === 'کارمزد بانک');
    if (!hasBankFee) {
      return [...loaded, { id: '10', name: 'کارمزد بانک', active: true }];
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
  const [feedbacks, setFeedbacks] = useState<ManagerFeedback[]>(() => loadFromStorage('manager_feedbacks', INITIAL_FEEDBACKS));
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>(() => loadFromStorage('sms_logs', INITIAL_SMS_LOGS));
  const [autoSmsEnabled, setAutoSmsEnabledState] = useState<boolean>(() => loadFromStorage('auto_sms_enabled', true));
  const [smsTemplate, setSmsTemplateState] = useState<string>(() => loadFromStorage('sms_template', DEFAULT_SMS_TEMPLATE));
  const [smsConfig, setSmsConfigState] = useState<SmsConfig>(() => loadFromStorage('sms_config', DEFAULT_SMS_CONFIG));

  // Staff, Teachers & Payroll State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => loadFromStorage('staff_members', INITIAL_STAFF));
  const [staffWorkLogs, setStaffWorkLogs] = useState<StaffWorkLog[]>(() => loadFromStorage('staff_work_logs', INITIAL_WORK_LOGS));
  const [payrollPayments, setPayrollPayments] = useState<PayrollPayment[]>(() => loadFromStorage('payroll_payments', INITIAL_PAYROLL));
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => loadFromStorage('bank_accounts', INITIAL_BANK_ACCOUNTS));

  // Google Sheets & Cloud Connection State - Hardcoded to official school cloud
  const [googleUser, setGoogleUser] = useState<any>({
    email: OWNER_EMAIL,
    displayName: 'سیدمهدی گلزاری (مدیریت ارشد مدرسة القرآن)',
  });
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>('active_cloud');
  const [spreadsheetId, setSpreadsheetIdState] = useState<string>(DEFAULT_SPREADSHEET_ID);
  const [webAppUrl, setWebAppUrlState] = useState<string>(DEFAULT_WEBAPP_URL);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStageText, setSyncStageText] = useState<string>('');
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
  useEffect(() => saveToStorage('transactions', stripInlineImages(transactions)), [transactions]);
  useEffect(() => saveToStorage('cheques', stripInlineImages(cheques)), [cheques]);
  useEffect(() => saveToStorage('bank_txs', bankTransactions), [bankTransactions]);
  useEffect(() => saveToStorage('senior_msgs', seniorMessages), [seniorMessages]);
  useEffect(() => saveToStorage('activity_logs', activityLogs), [activityLogs]);
  useEffect(() => saveToStorage('manager_feedbacks', stripInlineImages(feedbacks)), [feedbacks]);
  useEffect(() => saveToStorage('sms_logs', smsLogs), [smsLogs]);
  useEffect(() => saveToStorage('auto_sms_enabled', autoSmsEnabled), [autoSmsEnabled]);
  useEffect(() => saveToStorage('sms_template', smsTemplate), [smsTemplate]);
  useEffect(() => saveToStorage('sms_config', smsConfig), [smsConfig]);
  useEffect(() => saveToStorage('staff_members', staffMembers), [staffMembers]);
  useEffect(() => saveToStorage('staff_work_logs', staffWorkLogs), [staffWorkLogs]);
  useEffect(() => saveToStorage('payroll_payments', stripInlineImages(payrollPayments)), [payrollPayments]);

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

  // Safe Multi-Device Auto-Sync:
  // - Never runs while user is actively typing in an input/textarea (prevents keyboard clearing)
  // - Does not listen to window focus which triggers when opening virtual keyboard
  // - Syncs when tab becomes visible or periodically every 60s when idle
  useEffect(() => {
    if (!currentUser) return;

    const isUserTyping = () => {
      if (typeof document === 'undefined') return false;
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (!isUserTyping()) {
          void syncWithGoogleSheets(spreadsheetId);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (!isUserTyping()) {
          void syncWithGoogleSheets(spreadsheetId);
        }
      }
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(intervalId);
    };
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

  // ───────────────────────── Persistent send queue (outbox) ─────────────────────────
  // Every change is applied locally at once, written to a durable queue, then sent to Google
  // Sheets in order. Locally created records carry a temporary id that is replaced by the
  // server id once the write is confirmed.
  const [outboxInfo, setOutboxInfo] = useState<{ pending: number; failed: Array<{ key: string; action: string; label: string; error: string }> }>({ pending: 0, failed: [] });

  const refreshOutboxInfo = () => {
    const list = outboxSnapshot();
    setOutboxInfo({
      pending: list.filter((e) => !e.failed).length,
      failed: list.filter((e) => e.failed).map((e) => ({ key: e.key, action: e.action, label: ACTION_LABELS[e.action] || e.action, error: e.error || '' })),
    });
  };

  useEffect(() => {
    void loadOutbox().then(refreshOutboxInfo);
    return subscribeOutbox(refreshOutboxInfo);
  }, []);

  // One-time migration of the old retry list, then flush anything left from a previous session.
  useEffect(() => {
    void (async () => {
      const legacy = loadFromStorage<Student[]>('pending_student_uploads', []);
      if (legacy.length) {
        saveToStorage('pending_student_uploads', []);
        for (const st of legacy) {
          await enqueue({ action: 'student_add', payload: { ...buildStudentPayload(st, 'add'), id: undefined }, entity: { type: 'student', id: st.id } });
        }
      }
      if (currentUser) void syncWithGoogleSheets(spreadsheetId).catch(() => {});
    })();
  }, []);

  const replaceId = (setter: (fn: (prev: any[]) => any[]) => void, tmp: any, real: any, patch: Record<string, any> = {}) => {
    setter((prev) => {
      if (String(tmp) === String(real)) return prev.map((x) => (String(x.id) === String(tmp) ? { ...x, ...patch } : x));
      const hasReal = prev.some((x) => String(x.id) === String(real));
      if (hasReal) return prev.filter((x) => String(x.id) !== String(tmp));
      return prev.map((x) => (String(x.id) === String(tmp) ? { ...x, ...patch, id: real } : x));
    });
  };

  const rewriteRefs = (field: string, tmp: any, real: any) =>
    rewriteOutbox((e) => {
      const p = e.payload;
      if (String(p[field]) === String(tmp)) p[field] = real;
      if (field === 'student_id' && Array.isArray(p.student_ids)) p.student_ids = p.student_ids.map((x: any) => (String(x) === String(tmp) ? real : x));
    });

  const remapQueuedEdits = (kind: string, tmp: any, real: any) =>
    rewriteOutbox((e) => {
      const en = e.entity;
      if (!en || String(en.id) !== String(tmp) || !en.type.startsWith(kind + ':')) return;
      en.id = real;
      if (kind === 'tx') {
        if (en.type === 'tx:review') Object.assign(e.payload, buildReviewPayload(Number(real), e.payload.status, e.payload.rejection_reason));
        else e.payload.id = txServerId(Number(real));
      } else e.payload.id = real;
    });

  const remapTx = (tmp: number, real: number, patch: Record<string, any> = {}) => {
    replaceId(setTransactions as any, tmp, real, patch);
    remapQueuedEdits('tx', tmp, real);
    rewriteOutbox((e) => {
      if (e.entity?.type === 'bank:match' && String(e.entity.id) === String(tmp)) {
        e.entity.id = real;
        e.payload.source_id = txServerId(real);
      }
    });
  };

  const dropTempEntity = (ent: OutboxEntity) => {
    const id = ent.id;
    switch (ent.type) {
      case 'student': setStudents((p) => p.filter((x) => x.id !== id)); break;
      case 'tuition': case 'expense': case 'petty_income': setTransactions((p) => p.filter((x) => x.id !== id)); break;
      case 'bulk_debt': setTransactions((p) => p.filter((x) => !(ent.extra?.temp_ids || []).includes(x.id))); break;
      case 'cheque': setCheques((p) => p.filter((x) => x.id !== id)); if (ent.extra?.tx_temp_id) setTransactions((p) => p.filter((x) => x.id !== ent.extra?.tx_temp_id)); break;
      case 'worklog': setStaffWorkLogs((p) => p.filter((x) => x.id !== id)); break;
      case 'payroll': setPayrollPayments((p) => p.filter((x) => x.id !== id)); break;
      case 'bank_account': setBankAccounts((p) => p.filter((x) => x.id !== id)); break;
      case 'staff': setStaffMembers((p) => p.filter((x) => x.id !== id)); break;
      case 'school': setSchools((p) => p.filter((x) => x.id !== id)); break;
      case 'manager': setUsers((p) => p.filter((x) => x.id !== id)); break;
      case 'category': setCategories((p) => p.filter((x) => x.id !== id)); break;
      case 'message': setSeniorMessages((p) => p.filter((x) => x.id !== id)); break;
      case 'bank_upload': setBankTransactions((p) => p.filter((x) => !(ent.extra?.temp_ids || []).includes(x.id))); break;
      default: break;
    }
  };

  const onOutboxSuccess = async (entry: OutboxEntry, res: any) => {
    if (res?.image_url && entry.payload?.base64) {
      await primeAttachmentCache(res.image_url, `data:${entry.payload.mime_type || 'image/jpeg'};base64,${entry.payload.base64}`);
    }
    const ent = entry.entity;
    if (!ent) return;
    const tmp = ent.id as any;
    const image: Record<string, any> = res?.image_url ? { attachment_url: res.image_url } : {};
    const review: Record<string, any> = res?.review_status ? { review_status: res.review_status } : {};
    switch (ent.type) {
      case 'student': {
        const real = Number(res.id);
        replaceId(setStudents as any, tmp, real);
        setTransactions((p) => p.map((t) => (t.student_id === tmp ? { ...t, student_id: real } : t)));
        setCheques((p) => p.map((c) => (c.student_id === tmp ? { ...c, student_id: real } : c)));
        setBankTransactions((p) => p.map((b) => (b.assigned_student_id === tmp ? { ...b, assigned_student_id: real } : b)));
        await rewriteRefs('student_id', tmp, real);
        await remapQueuedEdits('student', tmp, real);
        break;
      }
      case 'tuition': remapTx(tmp, Number(res.id), { ...image, ...review }); break;
      case 'expense': remapTx(tmp, 100000 + Number(res.id), { ...image, ...review }); break;
      case 'petty_income': remapTx(tmp, 200000000 + Number(res.id), review); break;
      case 'bulk_debt': {
        const pairs: Array<{ student_id: any; tmp: number }> = ent.extra?.pairs || [];
        (Array.isArray(res.ids) ? res.ids : []).forEach((r: any) => {
          const pair = pairs.find((p) => String(p.student_id) === String(r.student_id));
          if (pair) remapTx(pair.tmp, Number(r.id), { review_status: 'approved' });
        });
        break;
      }
      case 'cheque': {
        replaceId(setCheques as any, tmp, Number(res.id), { ...image, ...(res.status ? { status: res.status } : {}) });
        await remapQueuedEdits('cheque', tmp, Number(res.id));
        if (ent.extra?.tx_temp_id && res.tuition_id) remapTx(ent.extra.tx_temp_id, Number(res.tuition_id), { review_status: 'approved', ...image });
        break;
      }
      case 'cheque:review': {
        if (ent.extra?.tx_temp_id) setTransactions((p) => p.filter((x) => x.id !== ent.extra?.tx_temp_id));
        if (res.status) setCheques((p) => p.map((c) => (c.id === ent.id ? { ...c, status: res.status, received_confirmed: res.received_confirmed ?? c.received_confirmed, in_favor_confirmed: res.in_favor_confirmed ?? c.in_favor_confirmed } : c)));
        break;
      }
      case 'worklog': replaceId(setStaffWorkLogs as any, tmp, Number(res.id)); break;
      case 'payroll': replaceId(setPayrollPayments as any, tmp, Number(res.id), image); break;
      case 'bank_account': replaceId(setBankAccounts as any, tmp, Number(res.id)); await remapQueuedEdits('bank_account', tmp, Number(res.id)); break;
      case 'staff': {
        replaceId(setStaffMembers as any, tmp, Number(res.id));
        await rewriteRefs('staff_id', tmp, Number(res.id));
        await remapQueuedEdits('staff', tmp, Number(res.id));
        break;
      }
      case 'school': {
        replaceId(setSchools as any, tmp, Number(res.id));
        await rewriteRefs('school_id', tmp, Number(res.id));
        await remapQueuedEdits('school', tmp, Number(res.id));
        break;
      }
      case 'manager': replaceId(setUsers as any, tmp, Number(res.id)); await remapQueuedEdits('manager', tmp, Number(res.id)); break;
      case 'category': replaceId(setCategories as any, tmp, String(res.id)); await remapQueuedEdits('category', tmp, String(res.id)); break;
      case 'message': replaceId(setSeniorMessages as any, tmp, String(res.id)); break;
      case 'bank_upload': setBankTransactions((p) => p.filter((b) => !(ent.extra?.temp_ids || []).includes(b.id))); break;
      default: break;
    }
  };

  /** Queue a write and start sending it right away (the sync pass drains the queue first). */
  const queue = (action: string, payload: Record<string, any>, entity?: OutboxEntity) => {
    void enqueue({ action, payload, entity }).then(() => { void syncWithGoogleSheets(spreadsheetId).catch(() => {}); });
  };

  /** If the record has not been sent yet, fold the change into the queued add instead of queueing an edit. */
  const patchQueuedAdd = async (type: string, tmpId: any, changes: Record<string, any>): Promise<boolean> => {
    const list = await loadOutbox();
    const hit = list.find((e) => e.entity?.type === type && String(e.entity.id) === String(tmpId));
    if (!hit) return false;
    await rewriteOutbox((e) => { if (e === hit) Object.assign(e.payload, changes); });
    return true;
  };

  /** Deleting something that was never sent just cancels it (and anything queued about it). */
  const cancelQueued = async (tmpId: any, baseTypes: string[], editPrefix: string): Promise<boolean> => {
    const list = await loadOutbox();
    const mine = list.filter((e) => e.entity && String(e.entity.id) === String(tmpId) && (baseTypes.includes(e.entity.type) || e.entity.type.startsWith(editPrefix + ':')));
    if (!mine.some((e) => baseTypes.includes(e.entity!.type))) return false;
    for (const e of mine) await dismissEntry(e.key);
    return true;
  };

  const retryFailedSync = () => {
    void retryFailedEntries().then(() => syncWithGoogleSheets(spreadsheetId)).catch(() => {});
  };

  const dismissFailedSync = (key: string) => {
    void (async () => {
      const entry = outboxSnapshot().find((e) => e.key === key);
      await dismissEntry(key);
      if (entry?.entity && isTempId(entry.entity.id)) dropTempEntity(entry.entity);
      void syncWithGoogleSheets(spreadsheetId).catch(() => {});
    })();
  };

  /** Applies a server snapshot: server wins on the same id; items deleted elsewhere disappear; unsent local items stay. */
  const applyRemoteData = (res: any) => {
    const put = <T extends { id: string | number }>(name: string, remote: T[] | undefined, setter: (v: T[]) => void, opts: { allowEmpty?: boolean } = {}) => {
      if (!Array.isArray(remote)) return;
      if (remote.length === 0 && !opts.allowEmpty) {
        // An empty answer never erases data this device still holds.
        return;
      }
      const existing = loadFromStorage<T[]>(name, []);
      const merged = reconcileEntity(name, remote, existing);
      // Compare complete records, not only IDs. Direct edits in Google Sheets keep the same
      // row IDs, so an ID-only check silently left stale names and other fields on the device.
      const isDiff = merged.length !== existing.length || merged.some((item, idx) =>
        JSON.stringify(item) !== JSON.stringify(existing[idx])
      );
      if (isDiff) {
        setter(merged);
      }
    };
    const remoteStudents = Array.isArray(res.students) ? res.students : [];
    const localStudents = loadFromStorage<Student[]>('students', []);
    if (remoteStudents.length === 0 && localStudents.length > 0) {
      console.warn('Cloud roster is empty; preserving local students rather than deleting them.');
    }
    put('students', remoteStudents, setStudents);
    put('schools', res.schools, setSchools);
    put('transactions', res.transactions, setTransactions);
    put('bank_txs', res.bankTransactions, setBankTransactions);
    put('cheques', res.cheques, setCheques);
    put('categories', res.categories, setCategories);
    put('users', res.managers, setUsers);
    put('staff_members', res.staff, setStaffMembers);
    put('senior_msgs', res.messages, setSeniorMessages);
    put('staff_work_logs', res.staffWorkLogs, setStaffWorkLogs);
    put('payroll_payments', res.payroll, setPayrollPayments);
    put('bank_accounts', res.bankAccounts, setBankAccounts);
    if (res.stats) {
      setSyncStats(res.stats);
      saveToStorage('sync_stats', res.stats);
    }
    const timeStr =
      jalaliFromGregorian(new Date().toISOString()) +
      ' ' +
      new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    setLastSyncTime(timeStr);
    saveToStorage('last_sync_time', timeStr);
    setSyncStatus('synced');
  };

  const syncLock = useRef<Promise<boolean> | null>(null);
  const syncAgain = useRef(false);

  /** One sync at a time; a request made while syncing triggers one more pass afterwards. */
  const syncWithGoogleSheets = (targetSheetId?: string): Promise<boolean> => {
    if (syncLock.current) {
      syncAgain.current = true;
      return syncLock.current;
    }
    const p = (async () => {
      try {
        let ok = await runSync(targetSheetId);
        let guard = 0;
        while (syncAgain.current && guard++ < 3) {
          syncAgain.current = false;
          ok = await runSync(targetSheetId);
        }
        return ok;
      } finally {
        syncLock.current = null;
      }
    })();
    syncLock.current = p;
    return p;
  };

  const runSync = async (targetSheetId?: string): Promise<boolean> => {
    const sId = extractSpreadsheetId(targetSheetId || spreadsheetId || DEFAULT_SPREADSHEET_ID);
    setSyncStatus('syncing');
    setSyncError(null);
    setSyncProgress(20);
    setSyncStageText('بررسی صف تغییرات محلی...');

    // 1) Send everything the user recorded while offline (in order) BEFORE reading, so a
    //    pull can never overwrite or duplicate a change that is still waiting to be sent.
    let drain: DrainResult | null = null;
    try {
      setSyncStageText('ارسال تغییرات ذخیره‌شده به سرور ابری...');
      drain = await drainOutbox(onOutboxSuccess);
      setSyncProgress(45);
    } catch (e) {
      console.warn('Outbox drain notice:', e);
    }

    // 2) Google Apps Script Web App (authoritative backend)
    try {
      setSyncStageText('دریافت آخرین اطلاعات از سرور Google Sheets...');
      setSyncProgress(65);
      const gasResult = await loadDataFromAppsScript(DEFAULT_WEBAPP_URL);
      if (gasResult && gasResult.success) {
        setSyncProgress(90);
        setSyncStageText('بروزرسانی داده‌ها و ثبت در حافظه...');
        applyRemoteData(gasResult);
        logActivity('همگام‌سازی ابری گوگل شیت', `دریافت ${gasResult.students.length} دانش‌آموز و ${gasResult.transactions.length} تراکنش`);
        if (drain && drain.sent > 0) refreshOutboxInfo();
        setSyncProgress(100);
        setSyncStageText('همگام‌سازی با موفقیت انجام شد');
        setTimeout(() => {
          setSyncProgress(0);
          setSyncStageText('');
        }, 1200);
        return true;
      }
    } catch (e: any) {
      console.warn('Apps Script sync attempt notice:', e);
    }

    // 3) Direct Google Sheet export / fallback (read-only snapshot)
    try {
      setSyncStageText('دریافت اطلاعات از نسخه پشتیبان شیت...');
      setSyncProgress(80);
      const result = await loadDataFromPublicGoogleSheet(sId);
      if (result.success) {
        setSyncProgress(95);
        setSyncStageText('تکمیل همگام‌سازی پشتیبان...');
        applyRemoteData(result);
        logActivity('همگام‌سازی اکسل گوگل شیت', `دریافت ${result.students.length} دانش‌آموز`);
        setSyncProgress(100);
        setSyncStageText('همگام‌سازی با موفقیت انجام شد');
        setTimeout(() => {
          setSyncProgress(0);
          setSyncStageText('');
        }, 1200);
        return true;
      }
    } catch (err: any) {
      console.warn('Public sheet sync attempt notice:', err);
    }
    setSyncProgress(0);
    setSyncStageText('');
    setSyncStatus('error');
    setSyncError(drain?.authExpired
      ? 'نشست شما منقضی شده است؛ دوباره وارد شوید تا تغییرات ذخیره‌شده ارسال شود.'
      : 'عدم امکان همگام‌سازی برخط با سرور ابری. لطفاً اتصال اینترنت خود را بررسی فرمایید.');
    return false;
  };

  const loadPublicSheet = async (id?: string) => {
    return await syncWithGoogleSheets(id);
  };

  const addStudent = (data: Omit<Student, 'id' | 'parsian_code'>): Student => {
    const newId = nextTempId();
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
    queue('student_add', { ...buildStudentPayload(newStudent, 'add'), id: undefined }, { type: 'student', id: newId });
    return newStudent;
  };

  const updateStudent = (id: number, data: Partial<Student>) => {
    const s = students.find((x) => x.id === id);
    if (!s) return;
    const updated: Student = {
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
    setStudents((prev) => prev.map((x) => (x.id === id ? updated : x)));
    const payload = buildStudentPayload(updated, 'update');
    void (async () => {
      // A student that was never sent: fold the edit into the queued add.
      if (isTempId(id) && await patchQueuedAdd('student', id, { ...payload, action: 'student_add', id: undefined })) return;
      queue('student_update', payload, { type: 'student:edit', id });
    })();
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
    void (async () => {
      if (isTempId(id) && await cancelQueued(id, ['student'], 'student')) return;
      queue('student_delete', buildStudentPayload({ id }, 'delete'), { type: 'student:edit', id });
    })();
    logActivity('حذف دانش‌آموز', `حذف دانش‌آموز ${student.name}`, 'student', id);
  };

  const withdrawStudent = (id: number) => {
    const student = students.find((s) => s.id === id);
    if (!student) return;
    const updated = { ...student, active: false };
    setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)));
    void (async () => {
      if (isTempId(id) && await patchQueuedAdd('student', id, { active: false })) return;
      queue('student_update', buildStudentPayload(updated, 'update'), { type: 'student:edit', id });
    })();
    logActivity('انصراف از مدرسه', `دانش‌آموز ${student.name} غیرفعال شد`, 'student', id);
  };

  const importStudents = async (newStudents: Array<Omit<Student, 'id' | 'parsian_code'>>) => {
    if (!newStudents.length) return { added: 0, skipped: 0, invalid: 0 };
    // One authenticated request for the whole import; Apps Script validates and batch-writes.
    const response: any = await postToAppsScript({
      action: 'students_import',
      school_id: String(newStudents[0]?.school_id || currentUser?.school_id || schools[0]?.id || 1),
      students: newStudents.map((st) => ({
        name: String(st.name || '').trim(),
        grade: st.grade || '',
        phone: st.phone || st.father_phone || st.mother_phone || '',
        father_phone: st.father_phone || '',
        mother_phone: st.mother_phone || '',
        national_id: String(st.national_id || ''),
        school_id: st.school_id || currentUser?.school_id || schools[0]?.id || 1,
        active: st.active !== false,
      })),
    });
    if (!response?.success) throw new Error(response?.error || 'ورود گروهی در سرور انجام نشد.');
    await syncWithGoogleSheets(spreadsheetId);
    const added = Number(response.added || 0);
    const skipped = Number(response.skipped || 0);
    const invalid = Number(response.invalid || 0);
    logActivity('ورود گروهی دانش‌آموزان', `افزودن ${added} دانش‌آموز، ${skipped} تکراری، ${invalid} نامعتبر`);
    return { added, skipped, invalid };
  };

  /** Shared by debt / discount / payment: builds the local transaction and queues the server write. */
  const commitTuitionTx = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
    queue('tuition_add', buildTuitionPayload(newTx), { type: 'tuition', id: newTx.id });
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
    const newId = nextTempId();
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

    commitTuitionTx(newTx);
    playTransactionSound();
    logActivity('ثبت بدهی شهریه', `ثبت ${data.amount.toLocaleString('fa-IR')} ریال برای ${student?.name}`, 'transaction', newId);
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
    const newId = nextTempId();
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

    commitTuitionTx(newTx);
    playTransactionSound();
    logActivity('ثبت تخفیف شهریه', `تخفیف ${data.amount.toLocaleString('fa-IR')} ریال برای ${student?.name} (${data.discount_reason})`, 'transaction', newId);
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
    const isSeniorUser = currentUser?.role === 'senior' || currentUser?.role === 'admin';

    if (data.payment_method === 'چک' && data.cheque_data) {
      const newChequeId = nextTempId();
      const cType = data.cheque_data.cheque_type || 'sayad';
      const typeLabel =
        cType === 'guarantee'
          ? 'چک ضمانتی'
          : cType === 'gharzolhasane'
          ? 'چک قرض‌الحسنه'
          : cType === 'non_sayad'
          ? 'چک غیر صیادی'
          : 'چک صیادی';

      // Same policy as the server: only a senior user can register a cheque that is already
      // confirmed; a school manager's cheque waits for senior confirmation.
      const confirmedNow = isSeniorUser && data.cheque_data.in_favor_school;
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
        received_confirmed: isSeniorUser,
        in_favor_confirmed: confirmedNow,
        status: confirmedNow ? 'approved' : 'pending',
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

      let txTempId: number | undefined;
      if (newCheque.status === 'approved') {
        txTempId = nextTempId();
        const newTx: Transaction = {
          id: txTempId,
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
          payment_method: 'چک',
          tracking_code: data.cheque_data.sayad_id,
          description: data.description || 'پرداخت با چک',
          reconciled: true,
          review_status: 'approved',
          attachment_url: data.attachment_url,
        };
        setTransactions((prev) => [newTx, ...prev]);
      }
      queue(
        'cheque_add',
        { ...buildChequePayload(newCheque), in_favor_school: data.cheque_data.in_favor_school },
        { type: 'cheque', id: newChequeId, extra: txTempId ? { tx_temp_id: txTempId } : undefined }
      );
      return;
    }

    const initReviewStatus: 'approved' | 'pending' = isSeniorUser ? 'approved' : 'pending';
    const newTxId = nextTempId();
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
      review_status: initReviewStatus,
      registered_by: currentUser?.id,
      attachment_url: data.attachment_url,
    };

    commitTuitionTx(newTx);
    playTransactionSound();
    logActivity(
      'ثبت دریافت شهریه',
      `دریافت ${data.amount.toLocaleString('fa-IR')} ریال از ${student?.name} (${isSeniorUser ? 'تأییدشده' : 'در انتظار تأیید ارشد'})`,
      'transaction',
      newTxId
    );
  };

  const addBulkDebt = (data: { student_ids: number[]; amount: number; date: string; description: string; school_id: number }): number => {
    const schoolObj = schools.find((s) => s.id === data.school_id);
    const newTxs: Transaction[] = [];
    const pairs: Array<{ student_id: number; tmp: number }> = [];

    data.student_ids.forEach((stId) => {
      const tmp = nextTempId();
      const student = students.find((s) => s.id === stId);
      pairs.push({ student_id: stId, tmp });
      newTxs.push({
        id: tmp,
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
    queue(
      'tuition_bulk_debt',
      { student_ids: data.student_ids, amount: data.amount, date: data.date, description: data.description || 'شهریه تحصیلی مصوب دوره', school_id: data.school_id },
      { type: 'bulk_debt', id: pairs[0]?.tmp, extra: { pairs, temp_ids: pairs.map((p) => p.tmp) } }
    );
    logActivity('ثبت گروهی بدهی شهریه', `ثبت ${data.amount.toLocaleString('fa-IR')} ریال برای ${data.student_ids.length} دانش‌آموز`);
    return newTxs.length;
  };

  /** Decides which sheet row a transaction id belongs to. */
  const txRoute = (id: number, kind?: string): { base: 'tuition' | 'expense' | 'ledger'; pending: boolean } => {
    const pending = isTempId(id);
    if (pending) return { base: kind === 'هزینه' ? 'expense' : kind === 'دریافت متفرقه' ? 'ledger' : 'tuition', pending };
    if (id >= 200000000) return { base: 'ledger', pending };
    if (id >= 100000) return { base: 'expense', pending };
    return { base: 'tuition', pending };
  };

  const deleteTransaction = (id: number) => {
    const tx = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    logActivity('حذف تراکنش', `حذف تراکنش مالی شناسه ${id}`, 'transaction', id);
    if (!tx) return;
    const route = txRoute(id, tx.kind);
    void (async () => {
      if (route.pending) {
        const baseType = route.base === 'expense' ? 'expense' : route.base === 'ledger' ? 'petty_income' : 'tuition';
        if (await cancelQueued(id, [baseType], 'tx')) return;
        return; // already being sent: the pending id is replaced and a later delete is not possible yet
      }
      const action = route.base === 'tuition' ? 'tuition_delete' : route.base === 'expense' ? 'expense_delete' : 'transaction_delete';
      queue(action, { id: txServerId(id) }, { type: 'tx:edit', id });
    })();
  };

  const updateTransaction = (id: number, data: Partial<Transaction>) => {
    const tx = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
    logActivity('ویرایش تراکنش', `ویرایش تراکنش شناسه ${id}`, 'transaction', id);
    if (!tx) return;
    const route = txRoute(id, tx.kind);
    const changes: Record<string, any> = {};
    if (data.amount !== undefined) changes.amount = data.amount;
    if (data.date !== undefined) changes.date = data.date;
    const desc = data.description !== undefined ? data.description : data.comment;
    if (desc !== undefined) changes.description = desc;
    if (data.tracking_code !== undefined) changes.tracking_code = data.tracking_code;
    if (route.base === 'tuition' && data.payment_method !== undefined) changes.payment_method = data.payment_method;
    if (route.base === 'expense') {
      if (data.payment_method !== undefined) changes.payment_source = data.payment_method;
      if (data.expense_category_name !== undefined) changes.category = data.expense_category_name;
      if (data.expense_category_id !== undefined) changes.category_id = String(data.expense_category_id);
    }
    if (Object.keys(changes).length === 0) return; // only local flags (reconciled, review...) changed
    void (async () => {
      if (route.pending) {
        const baseType = route.base === 'expense' ? 'expense' : route.base === 'ledger' ? 'petty_income' : 'tuition';
        const addChanges = route.base === 'ledger' ? { ...changes, ...(changes.description !== undefined ? { description: changes.description } : {}) } : changes;
        await patchQueuedAdd(baseType, id, addChanges);
        return;
      }
      const action = route.base === 'tuition' ? 'tuition_update' : route.base === 'expense' ? 'expense_update' : 'transaction_update';
      queue(action, { id: txServerId(id), ...changes }, { type: 'tx:edit', id });
    })();
  };

  const reviewTx = (id: number, status: 'approved' | 'rejected', reason?: string) => {
    if (!(currentUser?.role === 'senior' || currentUser?.role === 'admin')) return;
    queue('transaction_review', buildReviewPayload(id, status, reason), { type: 'tx:review', id });
  };

  const approveTransaction = async (id: number): Promise<boolean> => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, review_status: 'approved', rejection_reason: undefined } : t))
    );
    playSuccessSound();
    logActivity('تأیید تراکنش مالی', `تأیید تراکنش شناسه ${id} توسط مدیر ارشد`, 'transaction', id);
    reviewTx(id, 'approved');
    return true;
  };

  const rejectTransaction = async (id: number, reason?: string): Promise<boolean> => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, review_status: 'rejected', rejection_reason: reason || 'عدم تأیید توسط مدیریت ارشد' } : t
      )
    );
    playAlertSound();
    logActivity('رد تراکنش مالی', `رد تراکنش شناسه ${id} توسط مدیر ارشد: ${reason || 'عدم تأیید'}`, 'transaction', id);
    reviewTx(id, 'rejected', reason || 'عدم تأیید توسط مدیریت ارشد');
    return true;
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
    const isSeniorUser = currentUser?.role === 'senior' || currentUser?.role === 'admin';
    const initReviewStatus: 'approved' | 'pending' = isSeniorUser ? 'approved' : 'pending';

    const newId = nextTempId();
    const cat = categories.find((c) => c.id === data.category_id);
    const schoolId = data.school_id || currentUser?.school_id || 1;
    const schoolObj = schools.find((s) => s.id === schoolId);

    const newTx: Transaction = {
      id: newId,
      date: data.date,
      jalali_date: jalaliFromGregorian(data.date),
      school_id: schoolId,
      school_name: schoolObj?.name,
      tafsili_code: schoolObj?.tafsili_code || String(schoolId),
      kind: 'هزینه',
      amount: data.amount,
      debit: data.amount,
      credit: 0,
      expense_category_id: data.category_id,
      expense_category_name: cat?.name || 'هزینه‌های متفرقه',
      tracking_code: data.tracking_code,
      payment_method: data.payment_source,
      payment_source: data.payment_source,
      petty_cash_card: data.petty_cash_card,
      linked_account_name: data.linked_account_name,
      bank_transaction_id: data.bank_transaction_id,
      comment: data.comment,
      description: data.comment || `هزینه ${cat?.name || 'مدرسه'}`,
      reconciled: true,
      review_status: initReviewStatus,
      registered_by: currentUser?.id,
      attachment_url: data.attachment_url,
    };

    setTransactions((prev) => [newTx, ...prev]);
    playTransactionSound();
    logActivity(
      'ثبت هزینه',
      `ثبت هزینه ${cat?.name} به مبلغ ${data.amount.toLocaleString('fa-IR')} ریال (${isSeniorUser ? 'تأییدشده' : 'در انتظار تأیید ارشد'})`,
      'transaction',
      newId
    );
    queue('expense_add', buildExpensePayload(newTx), { type: 'expense', id: newId });
    return newTx;
  };

  const addPettyCashIncome = (data: { amount: number; date: string; tracking_code: string; comment: string; school_id: number; card: string; linked_account_name: string; bank_transaction_id: number }): Transaction => {
    const newId = nextTempId();
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
    queue('finance_transaction', buildPettyIncomePayload(newTx, currentUser?.name || 'مدیر تن‌خواه'), { type: 'petty_income', id: newId });
    return newTx;
  };

  const deleteExpense = (id: number) => {
    deleteTransaction(id);
  };

  const updateExpense = (id: number, data: Partial<Transaction>) => {
    updateTransaction(id, data);
  };

  const addCategory = (name: string) => {
    const newId = tempStringId();
    const newCat: ExpenseCategory = { id: newId, name, active: true };
    setCategories((prev) => [...prev, newCat]);
    logActivity('افزودن سرفصل هزینه', `ثبت سرفصل ${name}`);
    queue('category_add', { name }, { type: 'category', id: newId });
  };

  const toggleCategory = (id: string, active: boolean) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
    void (async () => {
      if (isTempId(id) && await patchQueuedAdd('category', id, { active })) return;
      queue('category_update', { id, active }, { type: 'category:edit', id });
    })();
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

    let txTempId: number | undefined;
    if (updatedStatus === 'approved' && cheque.status !== 'approved') {
      txTempId = nextTempId();
      const student = students.find((s) => s.id === cheque.student_id);
      const newTx: Transaction = {
        id: txTempId,
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
        payment_method: 'چک',
        tracking_code: cheque.sayad_id,
        description: `پرداخت با چک ${cheque.sayad_id || cheque.cheque_number || ''} (سررسید: ${jalaliFromGregorian(cheque.due_date)})`,
        reconciled: true,
        review_status: 'approved',
      };
      setTransactions((prev) => [newTx, ...prev]);
    }

    queue('cheque_review', { id, review_action: action }, { type: 'cheque:review', id, extra: txTempId ? { tx_temp_id: txTempId } : undefined });
    logActivity('بررسی چک', `تغییر وضعیت چک ${cheque.sayad_id || cheque.cheque_number || id} به ${updatedStatus}`, 'cheque', id);

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
    const newChequeId = nextTempId();
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
    queue('cheque_add', buildChequePayload(newCheque), { type: 'cheque', id: newChequeId });
    return newCheque;
  };

  const deleteCheque = (id: number) => {
    setCheques((prev) => prev.filter((c) => c.id !== id));
    logActivity('حذف چک', `حذف چک شناسه ${id}`, 'cheque', id);
    void (async () => {
      if (isTempId(id) && await cancelQueued(id, ['cheque'], 'cheque')) return;
      queue('cheque_delete', { id }, { type: 'cheque:edit', id });
    })();
  };

  const updateCheque = (id: number, data: Partial<Cheque>) => {
    setCheques((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    logActivity('ویرایش مشخصات چک', `ویرایش چک شناسه ${id}`, 'cheque', id);
    const changes: Record<string, any> = {};
    (['bank_name', 'cheque_number', 'issuer_name', 'cheque_purpose', 'cheque_type', 'due_date', 'issue_date', 'amount', 'sayad_id'] as const).forEach((k) => {
      if (data[k] !== undefined) changes[k] = data[k];
    });
    if (data.note !== undefined) changes.description = data.note;
    if (Object.keys(changes).length === 0) return;
    void (async () => {
      if (isTempId(id) && await patchQueuedAdd('cheque', id, { ...changes, ...(changes.issue_date ? { date: changes.issue_date } : {}) })) return;
      queue('cheque_update', { id, ...changes }, { type: 'cheque:edit', id });
    })();
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
    // The server applies the saved reconciliation rules to every row and its result is what
    // every device sees after the next sync.
    if (currentUser?.role === 'senior' || currentUser?.role === 'admin') queue('bank_reconcile', {});
    logActivity('تطبیق هوشمند تراکنش‌های بانک', `${matchedCount} مورد تطبیق موفق، ${unmatchedCount} مورد نیازمند بررسی`);
    return { matched: matchedCount, unmatched: unmatchedCount };
  };

  const manualReviewTransaction = (id: number, approve: boolean, note?: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, reconciled: approve, review_status: approve ? 'approved' : 'rejected', comment: note ? `${t.comment || ''} [${note}]` : t.comment } : t))
    );
    logActivity('بررسی دستی تطبیق تراکنش', `${approve ? 'تأیید' : 'رد'} تراکنش شناسه ${id}`, 'transaction', id);
    reviewTx(id, approve ? 'approved' : 'rejected', approve ? undefined : (note || 'رد توسط مدیر ارشد'));
  };

  // Local-only on purpose: removes the imported statement rows from THIS device. The rows stay in
  // the shared sheet, so nothing is lost for other devices or for accounting.
  const clearImportedBankTransactions = () => {
    setBankTransactions([]);
    saveToStorage('bank_txs', []);
    logActivity('پاک‌سازی صورتحساب بانکی', 'تمام ردیف‌های واردشدهٔ بانک و پوز از این دستگاه پاک شد؛ اسناد هزینه حذف نشدند.', 'bank', 0);
  };

  const importBankTransactions = (txs: Array<Omit<BankTransaction, 'id' | 'reconciled'> & { reconciled?: boolean }>) => {
    const newItems: BankTransaction[] = txs.map((t) => ({
      ...t,
      id: nextTempId(),
      reconciled: Boolean(t.reconciled),
    }));
    setBankTransactions((prev) => [...newItems, ...prev]);
    const matchedIds = new Set(newItems.filter((item) => item.reconciled && item.matched_transaction_id !== undefined).map((item) => Number(item.matched_transaction_id)));
    if (matchedIds.size) {
      setTransactions((prev) => prev.map((tx) => matchedIds.has(Number(tx.id)) ? { ...tx, reconciled: true } : tx));
    }
    if (newItems.length && (currentUser?.role === 'senior' || currentUser?.role === 'admin')) {
      queue(
        'bank_upload',
        {
          file_name: 'bank_statement',
          school_id: currentUser?.school_id || 1,
          rows: txs.map((t) => ({ ...t, date: t.date })),
        },
        { type: 'bank_upload', id: newItems[0].id, extra: { temp_ids: newItems.map((i) => i.id) } }
      );
    }
    logActivity('ورود فایل صورتحساب بانک', `افزودن ${newItems.length} تراکنش بانکی جدید`);
    return newItems.length;
  };

  const updateBankTransaction = (id: number, data: Partial<BankTransaction>) => {
    const existing = bankTransactions.find((item) => item.id === id);
    setBankTransactions((prev) => prev.map((item) => item.id === id ? { ...item, ...data } : item));
    logActivity('تخصیص تراکنش بانکی', `به‌روزرسانی توضیحات/تخصیص تراکنش بانکی شناسه ${id}`, 'bank_transaction', id);
    if (!existing) return;
    const merged = { ...existing, ...data };
    const touchesAssignment = ['assigned_student_id', 'assigned_student_name', 'assigned_purpose'].some((k) => k in data);
    if (touchesAssignment) {
      queue('bank_annotation', {
        school_id: merged.school_id,
        date: merged.date,
        amount: merged.amount,
        tracking_code: merged.tracking_code,
        bank_account: merged.bank_account,
        student_id: merged.assigned_student_id || '',
        student_name: merged.assigned_student_name || '',
        purpose: merged.assigned_purpose || '',
        direction: merged.direction || 'unknown',
        balance: merged.balance,
        card_number: merged.card_number || merged.source_card_number || merged.bank_account || '',
      }, { type: 'bank:edit', id });
    }
    if (data.matched_transaction_id !== undefined && data.reconciled && (currentUser?.role === 'senior' || currentUser?.role === 'admin')) {
      const matchedTx = transactions.find((t) => t.id === data.matched_transaction_id);
      const route = matchedTx ? txRoute(matchedTx.id, matchedTx.kind) : undefined;
      if (matchedTx && route && route.base !== 'ledger') {
        queue('bank_match', {
          ...(isTempId(id) ? {} : { id }),
          school_id: merged.school_id, date: merged.date, amount: merged.amount, tracking_code: merged.tracking_code,
          source_type: route.base === 'expense' ? 'expense' : 'tuition',
          source_id: txServerId(matchedTx.id),
        }, { type: 'bank:match', id: matchedTx.id });
      }
    }
  };

  const addManager = (m: Omit<User, 'id'>) => {
    const newId = nextTempId();
    const { password, ...safeManager } = m;
    const sc = schools.find((s) => s.id === safeManager.school_id);
    const newUser: User = {
      ...safeManager,
      id: newId,
      school_name: sc?.name,
    };
    setUsers((prev) => [...prev, newUser]);
    queue('manager_add', { ...buildManagerPayload({ ...newUser, ...(password ? { password } : {}) }, 'add'), id: undefined }, { type: 'manager', id: newId });
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
      const payload = buildManagerPayload({ ...existingManager, ...safeChanges, ...(password ? { password } : {}), id }, 'update');
      void (async () => {
        if (isTempId(id) && await patchQueuedAdd('manager', id, { ...payload, action: 'manager_add', id: undefined })) return;
        queue('manager_update', payload, { type: 'manager:edit', id });
      })();
    }
    logActivity('ویرایش مدیر', `ویرایش مشخصات مدیر شناسه ${id}`, 'manager', id);
  };

  const deleteManager = (id: number) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, active: false } : u));
    void (async () => {
      if (isTempId(id) && await cancelQueued(id, ['manager'], 'manager')) return;
      queue('manager_delete', buildManagerPayload({ id }, 'delete'), { type: 'manager:edit', id });
    })();
    logActivity('حذف مدیر', `حذف مدیر شناسه ${id}`, 'manager', id);
  };

  const addSchool = (s: Omit<School, 'id'>) => {
    const newId = nextTempId();
    const newSchool: School = { ...s, id: newId };
    setSchools((prev) => [...prev, newSchool]);
    queue('school_add', { ...buildSchoolPayload(newSchool, 'add'), id: undefined }, { type: 'school', id: newId });
    logActivity('افزودن مدرسه جدید', `ثبت مرکز/مدرسه ${s.name}`, 'school', newId);
  };

  const updateSchool = (id: number, s: Partial<School>) => {
    setSchools((prev) => prev.map((sc) => (sc.id === id ? { ...sc, ...s } : sc)));
    const payload = buildSchoolPayload({ ...schools.find((sc) => sc.id === id), ...s, id }, 'update');
    void (async () => {
      if (isTempId(id) && await patchQueuedAdd('school', id, { ...payload, action: 'school_add', id: undefined })) return;
      queue('school_update', payload, { type: 'school:edit', id });
    })();
    logActivity('ویرایش اطلاعات مدرسه', `ویرایش مرکز شناسه ${id}`, 'school', id);
  };

  const deleteSchool = (id: number) => {
    setSchools((prev) => prev.filter((sc) => sc.id !== id));
    void (async () => {
      if (isTempId(id) && await cancelQueued(id, ['school'], 'school')) return;
      queue('school_delete', buildSchoolPayload({ id }, 'delete'), { type: 'school:edit', id });
    })();
    logActivity('حذف مدرسه', `حذف مدرسه شناسه ${id}`, 'school', id);
  };

  const addBankAccount = (acc: Omit<BankAccount, 'id'>): BankAccount => {
    const newId = nextTempId();
    const schoolObj = schools.find((s) => s.id === acc.school_id);
    const newAcc: BankAccount = {
      ...acc,
      id: newId,
      school_name: schoolObj?.name || acc.school_name || 'مدرسه',
      created_at: new Date().toISOString(),
    };
    setBankAccounts((prev) => [newAcc, ...prev]);
    queue('bank_account_add', { ...buildBankAccountPayload(newAcc, 'add'), id: undefined }, { type: 'bank_account', id: newId });
    logActivity('تعریف حساب بانکی', `ثبت حساب ${newAcc.name} (${newAcc.bank_name})`, 'bank_account', newId);
    return newAcc;
  };

  const updateBankAccount = (id: number, data: Partial<BankAccount>) => {
    const current = bankAccounts.find((acc) => acc.id === id);
    setBankAccounts((prev) => prev.map((acc) => {
      if (acc.id !== id) return acc;
      const schoolObj = data.school_id ? schools.find((s) => s.id === data.school_id) : undefined;
      return { ...acc, ...data, school_name: schoolObj?.name || data.school_name || acc.school_name };
    }));
    if (current) {
      const payload = buildBankAccountPayload({ ...current, ...data, id }, 'update');
      void (async () => {
        if (isTempId(id) && await patchQueuedAdd('bank_account', id, { ...payload, action: 'bank_account_add', id: undefined })) return;
        queue('bank_account_update', payload, { type: 'bank_account:edit', id });
      })();
    }
    logActivity('ویرایش حساب بانکی', `ویرایش مشخصات حساب شناسه ${id}`, 'bank_account', id);
  };

  const deleteBankAccount = (id: number) => {
    const target = bankAccounts.find((b) => b.id === id);
    setBankAccounts((prev) => prev.filter((acc) => acc.id !== id));
    void (async () => {
      if (isTempId(id) && await cancelQueued(id, ['bank_account'], 'bank_account')) return;
      queue('bank_account_delete', { id }, { type: 'bank_account:edit', id });
    })();
    logActivity('حذف حساب بانکی', `حذف حساب ${target?.name || id}`, 'bank_account', id);
  };

  const addSeniorMessage = (message: string) => {
    const newMsg: SeniorMessage = {
      id: tempStringId(),
      message,
      created_at: new Date().toISOString(),
      author_name: currentUser?.name || 'مدیر ارشد',
    };
    setSeniorMessages((prev) => [newMsg, ...prev]);
    queue('message_add', { message }, { type: 'message', id: newMsg.id });
    logActivity('ارسال پیام عمومی به مدیران', message);
  };

  const deleteSeniorMessage = (id: string) => {
    setSeniorMessages((prev) => prev.filter((m) => m.id !== id));
    void (async () => {
      if (isTempId(id) && await cancelQueued(id, ['message'], 'message')) return;
      queue('message_delete', { id }, { type: 'message:edit', id });
    })();
  };

  const addFeedback = (fb: Omit<ManagerFeedback, 'id' | 'tracking_code' | 'created_at' | 'created_at_jalali' | 'status'>): ManagerFeedback => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const tracking_code = `MQ-${randomCode}`;
    const newFeedback: ManagerFeedback = {
      ...fb,
      id: `FB-${Date.now()}`,
      tracking_code,
      status: 'pending',
      created_at: new Date().toISOString(),
      created_at_jalali: todayJalali(),
    };
    setFeedbacks((prev) => [newFeedback, ...prev]);
    logActivity(
      'ارسال پیام به مدیر ارشد',
      `ثبت ${fb.type === 'bug' ? 'گزارش باگ' : fb.type === 'suggestion' ? 'پیشنهاد' : fb.type === 'criticism' ? 'انتقاد' : 'سوال'}: ${fb.title} با کد پیگیری ${tracking_code}`,
      'feedback',
      newFeedback.id
    );
    return newFeedback;
  };

  const updateFeedbackStatus = (id: string, status: ManagerFeedback['status'], reply?: string) => {
    setFeedbacks((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          return {
            ...f,
            status,
            ...(reply !== undefined ? { senior_reply: reply, senior_reply_at: todayJalali() } : {}),
          };
        }
        return f;
      })
    );
    logActivity('پاسخ و بررسی بازخورد', `بروزرسانی وضعیت بازخورد ${id} به ${status}`, 'feedback', id);
  };

  const deleteFeedback = (id: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    logActivity('حذف بازخورد', `حذف بازخورد ${id}`, 'feedback', id);
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
    const newId = nextTempId();
    const school = schools.find((sc) => sc.id === staffData.school_id);
    const newStaff: StaffMember = { ...staffData, id: newId, school_name: school?.name || staffData.school_name || 'مدرسه' };
    setStaffMembers((prev) => [newStaff, ...prev]);
    queue('staff_add', { ...buildStaffPayload(newStaff, 'add'), id: undefined }, { type: 'staff', id: newId });
    logActivity('ثبت پرسنل/معلم جدید', `ثبت ${newStaff.name} (${newStaff.role_title}) در ${newStaff.school_name}`);
    return newStaff;
  };

  const updateStaffMember = (id: number, data: Partial<StaffMember>) => {
    const existing = staffMembers.find((item) => item.id === id);
    setStaffMembers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const item = { ...s, ...data };
        if (data.school_id) {
          const sc = schools.find((x) => x.id === data.school_id);
          if (sc) item.school_name = sc.name;
        }
        return item;
      })
    );
    if (existing) {
      const payload = buildStaffPayload({ ...existing, ...data, id }, 'update');
      void (async () => {
        if (isTempId(id) && await patchQueuedAdd('staff', id, { ...payload, action: 'staff_add', id: undefined })) return;
        queue('staff_update', payload, { type: 'staff:edit', id });
      })();
    }
    logActivity('ویرایش اطلاعات پرسنل', `به‌روزرسانی پرسنل شناسه ${id}`);
  };

  const deleteStaffMember = (id: number) => {
    const found = staffMembers.find((s) => s.id === id);
    setStaffMembers((prev) => prev.filter((s) => s.id !== id));
    void (async () => {
      if (isTempId(id) && await cancelQueued(id, ['staff'], 'staff')) return;
      queue('staff_delete', buildStaffPayload({ id }, 'delete'), { type: 'staff:edit', id });
    })();
    logActivity('حذف پرسنل', `حذف پرسنل ${found?.name || id}`);
  };

  const addStaffWorkLog = (logData: Omit<StaffWorkLog, 'id'>): StaffWorkLog => {
    const newId = nextTempId();
    const staff = staffMembers.find((s) => s.id === logData.staff_id);
    const school = schools.find((sc) => sc.id === logData.school_id);
    const newLog: StaffWorkLog = {
      ...logData,
      id: newId,
      staff_name: staff?.name || logData.staff_name,
      school_name: school?.name || logData.school_name,
    };
    setStaffWorkLogs((prev) => [newLog, ...prev]);
    queue('staff_worklog_add', buildWorkLogPayload(newLog), { type: 'worklog', id: newId });
    logActivity('ثبت کارکرد پرسنل', `ثبت کارکرد ماه ${newLog.month_name} برای ${newLog.staff_name} (${newLog.work_hours} ساعت)`);
    return newLog;
  };

  const deleteStaffWorkLog = (id: number) => {
    setStaffWorkLogs((prev) => prev.filter((l) => l.id !== id));
    void (async () => {
      if (isTempId(id) && await cancelQueued(id, ['worklog'], 'worklog')) return;
      queue('staff_worklog_delete', { id }, { type: 'worklog:edit', id });
    })();
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
    const newId = nextTempId();
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
    queue('payroll_add', buildPayrollPayload(newPayment), { type: 'payroll', id: newId });

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
      tracking_code: newPayment.tracking_code || `PAY-${Date.now()}`,
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
    void (async () => {
      if (isTempId(id) && await cancelQueued(id, ['payroll'], 'payroll')) return;
      queue('payroll_delete', { id }, { type: 'payroll:edit', id });
    })();
  };

  const login = async (
    username: string,
    pass?: string,
    onProgress?: (percent: number, stage: string) => void
  ): Promise<boolean> => {
    if (!username.trim() || !pass) return false;
    onProgress?.(15, 'بررسی و اعتبارسنجی ورودی...');

    let currentPct = 15;
    const progressInterval = setInterval(() => {
      if (currentPct < 85) {
        currentPct += Math.floor(Math.random() * 8) + 4;
        if (currentPct > 85) currentPct = 85;
        const stageMsg = currentPct < 40
          ? 'برقراری ارتباط امن با سرور ابری...'
          : currentPct < 70
          ? 'بررسی مجوزهای دسترسی و اعتبارسنجی حساب...'
          : 'دریافت مشخصات مدیر و اطلاعات واحد آموزشی...';
        onProgress?.(currentPct, stageMsg);
      }
    }, 180);

    try {
      const result = await apiLogin(username.trim(), pass);
      clearInterval(progressInterval);

      if (!result.success || !result.user) {
        // Fallback: Check local cached users if offline or server timeout/network issue
        const cleanUser = username.trim().toLowerCase();
        const localMatch = users.find(
          (u) =>
            u.username?.toLowerCase() === cleanUser &&
            (u.password ? u.password === pass : true) &&
            u.active !== false
        );

        if (localMatch && (!result.success && (result.error?.includes('ارتباط') || result.error?.includes('پایان')))) {
          onProgress?.(95, 'ورود با حساب محلی ذخیره‌شده...');
          const matchedSchool = schools.find((school) => String(school.id) === String(localMatch.school_id));
          const authenticatedUser: User = {
            ...localMatch,
            active: true,
            role: localMatch.role === 'admin' ? 'senior' : localMatch.role,
            school_name: localMatch.school_name || matchedSchool?.name,
          };
          onProgress?.(100, 'ورود با موفقیت انجام شد! در حال انتقال...');
          setCurrentUser(authenticatedUser);
          setCurrentScreen('dashboard');
          logActivity('ورود به سیستم (آفلاین)', `ورود کاربر ${authenticatedUser.name}`);
          return true;
        }

        console.warn('Login rejected:', result.error || 'invalid credentials');
        return false;
      }

      onProgress?.(90, 'تکمیل مجوزهای کاربری و آماده‌سازی میز کار...');
      const backendUser = result.user as User;
      const matchedSchool = schools.find((school) => String(school.id) === String(backendUser.school_id));
      const authenticatedUser: User = {
        ...backendUser,
        active: true,
        role: backendUser.role === 'admin' ? 'senior' : backendUser.role,
        school_name: backendUser.school_name || matchedSchool?.name,
      };

      onProgress?.(100, 'ورود با موفقیت انجام شد! در حال انتقال...');
      setCurrentUser(authenticatedUser);
      setCurrentScreen('dashboard');
      logActivity('ورود به سیستم', `ورود کاربر ${authenticatedUser.name}`);
      // Do not block navigation on cloud sync; the dashboard opens immediately and sync continues in background.
      void syncWithGoogleSheets(spreadsheetId).catch((err) => console.warn('Post-login sync failed:', err));
      return true;
    } catch (err: any) {
      clearInterval(progressInterval);
      throw err;
    }
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
        feedbacks,
        addFeedback,
        updateFeedbackStatus,
        deleteFeedback,
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
        syncProgress,
        syncStageText,
        syncError,
        lastSyncTime,
        connectWithGoogle,
        disconnectGoogle,
        syncWithGoogleSheets,
        pendingSyncCount: outboxInfo.pending,
        failedSyncItems: outboxInfo.failed,
        retryFailedSync,
        dismissFailedSync,
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
        approveTransaction,
        rejectTransaction,
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
        bankAccounts,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
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
