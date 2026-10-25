import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian, todayGregorian, todayJalali, jalaliToIso } from '../../utils/jalali';
import { matchesStudentSearch } from '../../utils/studentSearch';
import {
  Landmark,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  Upload,
  CreditCard,
  Building,
  User,
  Sparkles,
  Wallet,
  Receipt,
  Search,
  Filter,
  Download,
  Link2,
  Unlink,
  HelpCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  PlusCircle,
  Layers,
  Printer,
  GraduationCap,
  Banknote,
  FileText,
  Tag,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { postToAppsScript } from '../../services/googleSheets';
import { BankTransaction, Transaction, Student } from '../../types';
import { openAttachment } from '../../services/attachments';

export const BankScreen: React.FC = () => {
  const {
    transactions,
    students,
    bankTransactions,
    schools,
    users,
    currentUser,
    accentColor,
    reconcileBank,
    manualReviewTransaction,
    importBankTransactions,
    clearImportedBankTransactions,
    updateBankTransaction,
    updateTransaction,
    updateManager,
    addExpense,
    addPettyCashIncome,
    addTuitionPayment,
    categories,
    setCurrentScreen,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'main' | 'petty_cash' | 'statement'>('main');
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);
  const [feeNotice, setFeeNotice] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 0
  );

  // Search & Filters for transaction lists
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unmatched' | 'matched' | 'fees'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  // Performance Pagination / Visible Count state
  const [visibleBankCount, setVisibleBankCount] = useState(50);
  const [visibleLedgerCount, setVisibleLedgerCount] = useState(40);

  // Reset pagination when filter criteria change
  useEffect(() => {
    setVisibleBankCount(50);
    setVisibleLedgerCount(40);
  }, [searchQuery, statusFilter, directionFilter, selectedSchoolId, activeTab]);

  // Dedicated Record Expense Modal State
  const [expenseModalRow, setExpenseModalRow] = useState<BankTransaction | null>(null);
  const [expenseCategory, setExpenseCategory] = useState<string>(categories.find((c) => c.active)?.id || '1');
  const [expenseSchoolId, setExpenseSchoolId] = useState<number>(currentUser?.school_id || schools[0]?.id || 1);
  const [expenseComment, setExpenseComment] = useState('');
  const [expensePaymentSource, setExpensePaymentSource] = useState<'bank' | 'petty_cash'>('bank');
  const [expenseError, setExpenseError] = useState('');

  // Manual Matching Modal State
  const [manualMatchBankRow, setManualMatchBankRow] = useState<BankTransaction | null>(null);
  const [manualMatchSearch, setManualMatchSearch] = useState('');

  // Instant Register Bank Row to Books Modal
  const [instantRegisterRow, setInstantRegisterRow] = useState<BankTransaction | null>(null);
  const [instantType, setInstantType] = useState<'tuition' | 'misc_income' | 'expense' | 'bank_fee'>('tuition');
  const [instantStudentId, setInstantStudentId] = useState<number | ''>('');
  const [instantStudentSearch, setInstantStudentSearch] = useState('');
  const [instantCategoryId, setInstantCategoryId] = useState<string>(categories.find((c) => c.active)?.id || '1');
  const [instantSchoolId, setInstantSchoolId] = useState<number>(currentUser?.school_id || schools[0]?.id || 1);
  const [instantDesc, setInstantDesc] = useState('');
  const [instantError, setInstantError] = useState('');

  // Dedicated Assign Student to Bank Row Modal
  const [assignStudentBankRow, setAssignStudentBankRow] = useState<BankTransaction | null>(null);
  const [assignStudentSearch, setAssignStudentSearch] = useState('');
  const [assignStudentSchoolFilter, setAssignStudentSchoolFilter] = useState<number>(0);
  const [assignStudentSelected, setAssignStudentSelected] = useState<Student | null>(null);
  const [assignStudentPurpose, setAssignStudentPurpose] = useState('');
  const [assignStudentCreateLedger, setAssignStudentCreateLedger] = useState(false);

  // Registration Row Modal for Petty Cash (preserved from original)
  const [registrationRow, setRegistrationRow] = useState<BankTransaction | null>(null);
  const [registrationKind, setRegistrationKind] = useState<'expense' | 'income'>('expense');
  const [registrationCategory, setRegistrationCategory] = useState<string>(categories.find((x) => x.active)?.id || '1');
  const [registrationSchool, setRegistrationSchool] = useState<number>(currentUser?.school_id || schools[0]?.id || 1);
  const [registrationAccount, setRegistrationAccount] = useState('');
  const [registrationTracking, setRegistrationTracking] = useState('');
  const [registrationComment, setRegistrationComment] = useState('');
  const [registrationError, setRegistrationError] = useState('');

  // Rules management
  const defaultBankRules = {
    version: 1,
    excludedAccountSuffixes: ['009'],
    schoolAccounts: [
      { suffix: '001', purpose: 'petty_cash' },
      { suffix: '002', purpose: 'pos_aggregate_and_petty_cash' },
    ],
    pettyCashCards: [{"card":"6037691263357071","managerName":"علی هاشمیان","accountSuffix":"002","active":true},{"card":"6037691263260770","managerName":"محمدرضا آقاسی","accountSuffix":"002","active":true},{"card":"6037691263260788","managerName":"محمد عربی","accountSuffix":"002","active":true},{"card":"6037691263260796","managerName":"آرزو میرزایی","accountSuffix":"002","active":true},{"card":"6037691263260804","managerName":"فریبا سبزواری","accountSuffix":"002","active":true},{"card":"6037691990633877","managerName":"نامشخص - کارت متصل به حساب ۰۰۲","accountSuffix":"002","active":true},{"card":"6037691261822589","managerName":"مجید آقابزرگی","accountSuffix":"001","active":true},{"card":"6037691263357089","managerName":"سید محمدرضا گلزاری","accountSuffix":"001","active":true},{"card":"6037691263357097","managerName":"مجید آقابزرگی","accountSuffix":"001","active":true},{"card":"6037697090013308","managerName":"نامشخص - کارت متصل به حساب ۰۰۱","accountSuffix":"001","active":true}] as Array<{ card: string; managerName: string; accountSuffix?: string; schoolId?: number; active: boolean }>,
    // Registered POS terminals; schoolId=0 means not assigned yet.
    posTerminals: [
      { terminal: '21435312', schoolId: 0 },
      { terminal: '91370748', schoolId: 0 },
      { terminal: '21435311', schoolId: 0 },
      { terminal: '21435313', schoolId: 0 },
      { terminal: '99213505', schoolId: 0 },
      { terminal: '91370739', schoolId: 0 },
      { terminal: '91370741', schoolId: 0 },
    ] as Array<{ terminal: string; schoolId: number; schoolName?: string }>,
    matching: { dateWindowDays: 3, requireExactAmount: true, requireSourceCardWhenKnown: true },
  };
  const [bankRules, setBankRules] = useState(defaultBankRules);
  const [bankRulesJson, setBankRulesJson] = useState(JSON.stringify(defaultBankRules, null, 2));
  const [bankRulesNotice, setBankRulesNotice] = useState<string | null>(null);
  const [bankRulesLoading, setBankRulesLoading] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    if (!isSenior) return;
    let cancelled = false;
    setBankRulesLoading(true);
    postToAppsScript({ action: 'bank_rules_get' }).then((result) => {
      if (cancelled) return;
      if (result?.success && result.rules) {
        const merged = {
          ...defaultBankRules,
          ...result.rules,
          matching: { ...defaultBankRules.matching, ...(result.rules.matching || {}) },
          pettyCashCards: Array.isArray(result.rules.pettyCashCards) ? result.rules.pettyCashCards : [],
          posTerminals: (() => {
            const saved = Array.isArray(result.rules.posTerminals) ? result.rules.posTerminals : [];
            const known = new Set(saved.map((x: { terminal?: string }) => String(x?.terminal || '').replace(/\\D/g, '').replace(/^0+/, '')));
            return [...saved, ...defaultBankRules.posTerminals.filter((x) => !known.has(x.terminal))];
          })(),
          excludedAccountSuffixes: Array.isArray(result.rules.excludedAccountSuffixes) ? result.rules.excludedAccountSuffixes : ['009'],
          schoolAccounts: Array.isArray(result.rules.schoolAccounts) ? result.rules.schoolAccounts : defaultBankRules.schoolAccounts,
        };
        setBankRules(merged);
        setBankRulesJson(JSON.stringify(merged, null, 2));
      } else if (result?.error) {
        setBankRulesNotice('دریافت قواعد از سرور ناموفق بود: ' + result.error);
      }
    }).catch((err) => {
      if (!cancelled) setBankRulesNotice('ارتباط برای دریافت قواعد برقرار نشد: ' + String(err));
    }).finally(() => { if (!cancelled) setBankRulesLoading(false); });
    return () => { cancelled = true; };
  }, [isSenior]);

  const normalizeCardNumber = (value: unknown) => String(value || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '');

  const normalizeManagerIdentity = (value: unknown) => String(value || '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const knownManagerCardRoster = [
    { card: '6037691263360788', managerName: 'محمد عربی' },
    { card: '6037691263360796', managerName: 'آرزو میرزایی' },
    { card: '6037691263360804', managerName: 'فریبا سبزواری' },
    { card: '6037691263360812', managerName: 'علی هاشمیان' },
    { card: '6037691263360770', managerName: 'محمدرضا آقاسی' },
    { card: '6037691261822597', managerName: 'سید محمدرضا گلزاری' },
    { card: '6037691263357097', managerName: 'سید محمدرضا گلزاری' },
    { card: '6037691263357071', managerName: 'علی هاشمیان' },
  ];

  const managerIdentity = normalizeManagerIdentity(currentUser?.name);
  const managerCards = Array.from(new Set([
    normalizeCardNumber(currentUser?.petty_cash_card),
    ...bankRules.pettyCashCards.filter((x) => x.active !== false && normalizeManagerIdentity(x.managerName) === managerIdentity).map((x) => normalizeCardNumber(x.card)),
    ...knownManagerCardRoster.filter((x) => normalizeManagerIdentity(x.managerName) === managerIdentity).map((x) => normalizeCardNumber(x.card)),
  ].filter((x) => x.length === 16)));

  const registrationRequiredRows = bankTransactions.filter((row) => {
    if (row.direction !== 'deposit' && row.direction !== 'withdrawal') return false;
    if (transactions.some((tx) => tx.bank_transaction_id === row.id)) return false;
    if (isSenior) return false;
    if (!managerCards.length) return false;
    const card = normalizeCardNumber(row.direction === 'withdrawal' ? (row.source_card_number || row.card_number) : (row.destination_card_number || row.card_number));
    return !!card && managerCards.includes(card);
  });

  const openRegistration = (row: BankTransaction) => {
    setRegistrationRow(row);
    setRegistrationKind(row.direction === 'withdrawal' ? 'expense' : 'income');
    setRegistrationCategory(categories.find((x) => x.active)?.id || '1');
    setRegistrationSchool(currentUser?.school_id || row.school_id || schools[0]?.id || 1);
    const card = normalizeCardNumber(row.direction === 'withdrawal' ? (row.source_card_number || row.card_number) : (row.destination_card_number || row.card_number));
    setRegistrationAccount(card ? 'کارت تن‌خواه ' + card : (row.bank_account || 'حساب بانکی'));
    setRegistrationTracking(row.tracking_code || row.reference_number || '');
    setRegistrationComment(row.description || (row.direction === 'withdrawal' ? 'هزینه کارت تن‌خواه' : 'واریزی به کارت تن‌خواه'));
    setRegistrationError('');
  };

  const saveRegistration = () => {
    if (!registrationRow) return;
    if (!registrationAccount.trim()) { setRegistrationError('حساب مقصد/مبدأ را انتخاب یا وارد کنید.'); return; }
    if (!registrationComment.trim()) { setRegistrationError('شرح تراکنش الزامی است.'); return; }
    if (!registrationTracking.trim()) { setRegistrationError('شماره پیگیری یا رسید الزامی است.'); return; }
    const tracking = registrationTracking.trim();
    const card = normalizeCardNumber(registrationKind === 'expense' ? (registrationRow.source_card_number || registrationRow.card_number) : (registrationRow.destination_card_number || registrationRow.card_number));
    try {
      if (registrationKind === 'expense') {
        addExpense({
          category_id: registrationCategory,
          amount: Number(registrationRow.amount || 0),
          date: registrationRow.date,
          tracking_code: tracking,
          payment_source: 'petty_cash',
          comment: registrationComment.trim(),
          school_id: registrationSchool,
          petty_cash_card: card,
          linked_account_name: registrationAccount.trim(),
          bank_transaction_id: registrationRow.id,
        });
      } else {
        addPettyCashIncome({
          amount: Number(registrationRow.amount || 0),
          date: registrationRow.date,
          tracking_code: tracking,
          comment: registrationComment.trim(),
          school_id: registrationSchool,
          card,
          linked_account_name: registrationAccount.trim(),
          bank_transaction_id: registrationRow.id,
        });
      }
      updateBankTransaction(registrationRow.id, {
        reconciled: true,
        assigned_purpose: registrationKind === 'expense' ? 'هزینه ثبت‌شده' : 'واریزی ثبت‌شده',
        matched_manager_id: currentUser?.id,
        school_id: registrationSchool,
        school_name: schools.find((s) => s.id === registrationSchool)?.name,
      });
      setRegistrationRow(null);
      setRegistrationError('');
    } catch (err) {
      setRegistrationError('ثبت انجام نشد: ' + String(err));
    }
  };

  const dayDistance = (a: string, b: string) => {
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    if (!Number.isFinite(da) || !Number.isFinite(db)) return 999;
    return Math.abs(da - db) / 86400000;
  };

  const digitsOnly = (value: unknown) => String(value ?? '').replace(/[^0-9۰-۹٠-٩]/g, '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧۸۹'.indexOf(d)));

  // Filter book transactions (all except cash)
  const bookTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (t.payment_method === 'پول نقد') return false;
      if (t.payment_source === 'own') return false;
      if (selectedSchoolId !== 0 && t.school_id !== selectedSchoolId) return false;
      if (!isSenior && t.school_id !== currentUser?.school_id) return false;
      return true;
    });
  }, [transactions, selectedSchoolId, isSenior, currentUser]);

  // Book transactions awaiting review or bank match
  const bankTxs = useMemo(() => {
    return bookTxs.filter((t) => {
      if (t.payment_source === 'petty_cash') return false;
      if (t.review_status === 'rejected') return false;
      return true;
    });
  }, [bookTxs]);

  // Petty cash transactions
  const pettyCashTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (t.kind !== 'هزینه') return false;
      if (t.payment_source !== 'petty_cash') return false;
      if (selectedSchoolId !== 0 && t.school_id !== selectedSchoolId) return false;
      if (!isSenior && t.school_id !== currentUser?.school_id) return false;
      return true;
    });
  }, [transactions, selectedSchoolId, isSenior, currentUser]);

  // Filtered Bank Transactions for current view
  const currentBankRows = useMemo(() => {
    return bankTransactions.filter((b) => {
      if (selectedSchoolId !== 0 && b.school_id && b.school_id !== selectedSchoolId) return false;
      if (!isSenior && b.school_id && b.school_id !== currentUser?.school_id) return false;
      return true;
    });
  }, [bankTransactions, selectedSchoolId, isSenior, currentUser]);

  const matchedBankRows = useMemo(() => currentBankRows.filter((t) => t.reconciled), [currentBankRows]);
  const unmatchedBankRows = useMemo(() => currentBankRows.filter((t) => !t.reconciled), [currentBankRows]);

  // HIGH-PERFORMANCE RECONCILIATION STATEMENT COMPUTATION (Single-Pass Loop)
  const reconciliationStatement = useMemo(() => {
    let bookDebits = 0;
    let bookCredits = 0;
    const bookUnmatchedDeposits: Transaction[] = [];
    const bookUnmatchedWithdrawals: Transaction[] = [];
    let totalBookUnmatchedDeposits = 0;
    let totalBookUnmatchedWithdrawals = 0;

    for (let i = 0; i < bookTxs.length; i++) {
      const t = bookTxs[i];
      const amt = Number(t.amount || 0);
      if (t.kind === 'شهریه' || t.kind === 'دریافت متفرقه') {
        bookDebits += amt;
        if (!t.reconciled) {
          bookUnmatchedDeposits.push(t);
          totalBookUnmatchedDeposits += amt;
        }
      } else if (t.kind === 'هزینه') {
        bookCredits += amt;
        if (!t.reconciled) {
          bookUnmatchedWithdrawals.push(t);
          totalBookUnmatchedWithdrawals += amt;
        }
      }
    }

    const bookBalance = bookDebits - bookCredits;

    let totalBankDeposits = 0;
    let totalBankWithdrawals = 0;
    const bankUnmatchedDeposits: BankTransaction[] = [];
    const bankUnmatchedWithdrawals: BankTransaction[] = [];
    let totalBankUnmatchedDeposits = 0;
    let totalBankUnmatchedWithdrawals = 0;

    for (let i = 0; i < currentBankRows.length; i++) {
      const b = currentBankRows[i];
      const amt = Number(b.amount || 0);
      if (b.direction === 'deposit' || b.direction === 'pos_sale') {
        totalBankDeposits += amt;
        if (!b.reconciled) {
          bankUnmatchedDeposits.push(b);
          totalBankUnmatchedDeposits += amt;
        }
      } else if (b.direction === 'withdrawal') {
        totalBankWithdrawals += amt;
        if (!b.reconciled) {
          bankUnmatchedWithdrawals.push(b);
          totalBankUnmatchedWithdrawals += amt;
        }
      }
    }

    const bankCalculatedBalance = totalBankDeposits - totalBankWithdrawals;
    const adjustedBookBalance = bookBalance + totalBankUnmatchedDeposits - totalBankUnmatchedWithdrawals;
    const adjustedBankBalance = bankCalculatedBalance + totalBookUnmatchedDeposits - totalBookUnmatchedWithdrawals;
    const discrepancy = Math.abs(adjustedBookBalance - adjustedBankBalance);

    return {
      bookBalance,
      totalBankDeposits,
      totalBankWithdrawals,
      bankCalculatedBalance,
      bookUnmatchedDeposits,
      totalBookUnmatchedDeposits,
      bookUnmatchedWithdrawals,
      totalBookUnmatchedWithdrawals,
      bankUnmatchedDeposits,
      totalBankUnmatchedDeposits,
      bankUnmatchedWithdrawals,
      totalBankUnmatchedWithdrawals,
      adjustedBookBalance,
      adjustedBankBalance,
      discrepancy,
      isBalanced: discrepancy === 0,
    };
  }, [bookTxs, currentBankRows]);

  // ROBUST STUDENT LIST FOR INSTANT REGISTER
  const availableStudentsForInstant = useMemo(() => {
    return students.filter((s) => {
      if (s.active === false) return false;
      if (!isSenior && currentUser?.school_id && Number(s.school_id) !== Number(currentUser.school_id)) return false;
      if (instantSchoolId > 0 && isSenior && Number(s.school_id) !== Number(instantSchoolId)) return false;
      return true;
    });
  }, [students, isSenior, currentUser, instantSchoolId]);

  const filteredStudentsForInstant = useMemo(() => {
    const q = instantStudentSearch.trim().toLowerCase();
    if (!q) return availableStudentsForInstant.slice(0, 40);

    return availableStudentsForInstant.filter((st) => {
      if (matchesStudentSearch(st, q)) return true;
      const name = (st.name || '').toLowerCase();
      const nid = (st.national_id || '').toLowerCase();
      const phone = (st.phone || st.father_phone || st.mother_phone || '').toLowerCase();
      const grade = (st.grade || '').toLowerCase();
      return name.includes(q) || nid.includes(q) || phone.includes(q) || grade.includes(q);
    }).slice(0, 40);
  }, [availableStudentsForInstant, instantStudentSearch]);

  const selectedInstantStudentObj = useMemo(() => {
    if (!instantStudentId) return null;
    return students.find((s) => s.id === Number(instantStudentId)) || null;
  }, [students, instantStudentId]);

  // ROBUST STUDENT LIST FOR DEDICATED ASSIGN MODAL
  const availableStudentsForAssign = useMemo(() => {
    return students.filter((s) => {
      if (s.active === false) return false;
      if (!isSenior && currentUser?.school_id && Number(s.school_id) !== Number(currentUser.school_id)) return false;
      if (assignStudentSchoolFilter > 0 && Number(s.school_id) !== Number(assignStudentSchoolFilter)) return false;
      return true;
    });
  }, [students, isSenior, currentUser, assignStudentSchoolFilter]);

  const filteredStudentsForAssign = useMemo(() => {
    const q = assignStudentSearch.trim().toLowerCase();
    if (!q) return availableStudentsForAssign.slice(0, 40);

    return availableStudentsForAssign.filter((st) => {
      if (matchesStudentSearch(st, q)) return true;
      const name = (st.name || '').toLowerCase();
      const nid = (st.national_id || '').toLowerCase();
      const phone = (st.phone || st.father_phone || st.mother_phone || '').toLowerCase();
      const grade = (st.grade || '').toLowerCase();
      return name.includes(q) || nid.includes(q) || phone.includes(q) || grade.includes(q);
    }).slice(0, 40);
  }, [availableStudentsForAssign, assignStudentSearch]);

  const openAssignStudent = (b: BankTransaction) => {
    setAssignStudentBankRow(b);
    setAssignStudentSearch('');
    // Default to bank row's school if known, or 0 (all schools)
    setAssignStudentSchoolFilter(b.school_id || (isSenior ? 0 : currentUser?.school_id || 0));
    const existing = students.find((s) => s.id === b.assigned_student_id || (b.assigned_student_name && s.name.trim() === b.assigned_student_name.trim()));
    setAssignStudentSelected(existing || null);
    setAssignStudentPurpose(b.assigned_purpose || (existing ? `شهریه ${existing.name}` : 'شهریه دانش‌آموز'));
    setAssignStudentCreateLedger(false);
  };

  const handleSaveStudentAssignment = () => {
    if (!assignStudentBankRow) return;
    const b = assignStudentBankRow;
    const student = assignStudentSelected;
    const purpose = assignStudentPurpose.trim() || (student ? `شهریه ${student.name}` : 'شهریه');

    if (assignStudentCreateLedger && student && !b.reconciled) {
      try {
        addTuitionPayment({
          student_id: student.id,
          amount: Number(b.amount || 0),
          date: b.date,
          description: purpose,
          payment_method: 'کارت خوان',
          tracking_code: b.tracking_code || b.reference_number || 'بانکی',
          school_id: student.school_id,
        });
      } catch (err) {
        console.warn('Failed to add tuition payment:', err);
      }
    }

    updateBankTransaction(b.id, {
      assigned_student_id: student?.id,
      assigned_student_name: student?.name || '',
      assigned_purpose: purpose,
      school_id: student?.school_id || b.school_id,
      school_name: student?.school_name || b.school_name,
      reconciled: assignStudentCreateLedger ? true : b.reconciled,
    });

    setAssignStudentBankRow(null);
  };

  // OPEN DEDICATED EXPENSE MODAL
  const openRecordExpense = (b: BankTransaction) => {
    setExpenseModalRow(b);
    setExpenseSchoolId(b.school_id || currentUser?.school_id || schools[0]?.id || 1);
    setExpenseComment(b.description || 'هزینه بانکی');
    setExpensePaymentSource(b.bank_account?.includes('۰۰۱') || b.bank_account?.includes('تن') ? 'petty_cash' : 'bank');

    // Auto select fee category if keywords detected
    const isFee = /(کارمزد|پایا|ساتنا|fee|آبونمان)/i.test(b.description || '');
    const feeCat = categories.find((c) => c.active && (c.name.includes('کارمزد') || c.name.includes('بانک')));
    if (isFee && feeCat) {
      setExpenseCategory(feeCat.id);
    } else {
      setExpenseCategory(categories.find((c) => c.active)?.id || '1');
    }
    setExpenseError('');
  };

  // SAVE EXPENSE
  const handleSaveExpense = () => {
    if (!expenseModalRow) return;
    const b = expenseModalRow;
    if (!expenseComment.trim()) {
      setExpenseError('لطفاً شرح یا بابت هزینه را وارد کنید.');
      return;
    }

    try {
      const tracking = b.tracking_code || b.reference_number || 'بانکی';
      const amount = Number(b.amount || 0);
      const date = b.date;

      const newTx = addExpense({
        category_id: expenseCategory,
        amount,
        date,
        tracking_code: tracking,
        payment_source: expensePaymentSource,
        comment: expenseComment.trim(),
        school_id: expenseSchoolId,
        bank_transaction_id: b.id,
      });

      const categoryObj = categories.find((c) => c.id === expenseCategory);

      updateBankTransaction(b.id, {
        reconciled: true,
        matched_transaction_id: newTx.id,
        assigned_purpose: categoryObj?.name || expenseComment.trim(),
        school_id: expenseSchoolId,
        school_name: schools.find((s) => s.id === expenseSchoolId)?.name,
      });

      setExpenseModalRow(null);
      setExpenseError('');
      setReconcileResult(`هزینه به مبلغ ${formatRial(amount)} ریال در دفاتر ثبت شد و با ردیف بانک تطبیق یافت.`);
    } catch (err) {
      setExpenseError('خطا در ثبت هزینه: ' + String(err));
    }
  };

  // Advanced Multi-Tier Auto Reconcile Engine
  const handleAdvancedReconcile = () => {
    let exactCount = 0;
    let cardConfidenceCount = 0;
    let fuzzyCount = 0;

    const updatedBank = [...bankTransactions];
    const updatedTxs = [...transactions];
    const usedTxIds = new Set<number>();

    updatedTxs.forEach((t) => { if (t.reconciled) usedTxIds.add(t.id); });

    // TIER 1: Exact Match (Amount + Exact Tracking Code)
    updatedBank.forEach((bt) => {
      if (bt.reconciled) return;
      const bTrack = String(bt.tracking_code || bt.reference_number || '').trim();
      if (!bTrack) return;

      const match = updatedTxs.find((t) =>
        !usedTxIds.has(t.id) && !t.reconciled &&
        Number(t.amount) === Number(bt.amount) &&
        String(t.tracking_code || '').trim() === bTrack &&
        (!bt.school_id || Number(t.school_id) === Number(bt.school_id))
      );

      if (match) {
        bt.reconciled = true;
        bt.matched_transaction_id = match.id;
        bt.assigned_student_id = match.student_id;
        bt.assigned_student_name = match.student_name;
        match.reconciled = true;
        match.bank_transaction_id = bt.id;
        usedTxIds.add(match.id);
        exactCount++;
      }
    });

    // TIER 2: Source / Destination Card Match + Exact Amount + Date within Window
    updatedBank.forEach((bt) => {
      if (bt.reconciled) return;
      const cardDigits = digitsOnly(bt.source_card_number || bt.destination_card_number || bt.card_number || '');
      if (cardDigits.length < 4) return;

      const match = updatedTxs.find((t) => {
        if (usedTxIds.has(t.id) || t.reconciled) return false;
        if (Number(t.amount) !== Number(bt.amount)) return false;
        if (dayDistance(t.date, bt.date) > Number(bankRules.matching?.dateWindowDays || 3)) return false;
        if (bt.school_id && Number(t.school_id) !== Number(bt.school_id)) return false;

        const tCard = digitsOnly(t.petty_cash_card || '');
        if (tCard && (cardDigits.endsWith(tCard.slice(-4)) || tCard.endsWith(cardDigits.slice(-4)))) return true;
        return false;
      });

      if (match) {
        bt.reconciled = true;
        bt.matched_transaction_id = match.id;
        match.reconciled = true;
        match.bank_transaction_id = bt.id;
        usedTxIds.add(match.id);
        cardConfidenceCount++;
      }
    });

    // TIER 3: Exact Amount + Date within 2 days + Same School
    updatedBank.forEach((bt) => {
      if (bt.reconciled) return;
      if (!bt.school_id && !isSenior) return;

      const candidates = updatedTxs.filter((t) => {
        if (usedTxIds.has(t.id) || t.reconciled) return false;
        if (Number(t.amount) !== Number(bt.amount)) return false;
        if (bt.school_id && Number(t.school_id) !== Number(bt.school_id)) return false;
        if (dayDistance(t.date, bt.date) > 2) return false;
        if (bt.direction === 'deposit' && t.kind === 'هزینه') return false;
        if (bt.direction === 'withdrawal' && t.kind !== 'هزینه') return false;
        return true;
      });

      if (candidates.length === 1) {
        const match = candidates[0];
        bt.reconciled = true;
        bt.matched_transaction_id = match.id;
        bt.assigned_student_id = match.student_id;
        bt.assigned_student_name = match.student_name;
        match.reconciled = true;
        match.bank_transaction_id = bt.id;
        usedTxIds.add(match.id);
        fuzzyCount++;
      }
    });

    // Persist changes
    updatedBank.forEach((b) => {
      const orig = bankTransactions.find((x) => x.id === b.id);
      if (orig && orig.reconciled !== b.reconciled) {
        updateBankTransaction(b.id, {
          reconciled: b.reconciled,
          matched_transaction_id: b.matched_transaction_id,
          assigned_student_id: b.assigned_student_id,
          assigned_student_name: b.assigned_student_name,
        });
      }
    });

    updatedTxs.forEach((t) => {
      const orig = transactions.find((x) => x.id === t.id);
      if (orig && orig.reconciled !== t.reconciled) {
        updateTransaction(t.id, {
          reconciled: t.reconciled,
          bank_transaction_id: t.bank_transaction_id,
        });
      }
    });

    const totalNewMatches = exactCount + cardConfidenceCount + fuzzyCount;
    const remainingUnmatched = updatedBank.filter((b) => !b.reconciled).length;

    setReconcileResult(
      `تطبیق هوشمند پیشرفته با موفقیت انجام شد: ${totalNewMatches} تراکنش تطبیق یافتند (${exactCount} قطعی بر اساس کد پیگیری، ${cardConfidenceCount} بر اساس شماره کارت، و ${fuzzyCount} بر اساس مبلغ و تاریخ). هم‌اکنون ${remainingUnmatched} ردیف در انتظار بررسی باقی است.`
    );
  };

  // Automatic Bank Fee Scanner
  const handleScanAndIdentifyBankFees = () => {
    const pattern = /(کارمزد|هزینه خدمات|هزینه انتقال|پایا|ساتنا|fee|commission|service charge|transfer charge|آبونمان|پیامک)/i;
    const candidates = bankTransactions.filter(
      (t) => t.direction !== 'pos_sale' && pattern.test(String(t.description || '')) && !String(t.assigned_purpose || '').includes('کارمزد بانک')
    );
    let total = 0;
    candidates.forEach((t) => {
      total += Number(t.fee_amount || t.amount || 0);
      updateBankTransaction(t.id, {
        assigned_purpose: 'کارمزد بانک',
      });
    });
    setFeeNotice(
      candidates.length
        ? `تعداد ${candidates.length} ردیف کارمزد بانکی به مجموع ${formatRial(total)} ریال شناسایی و نشانه‌گذاری شد.`
        : 'هیچ ردیف کارمزد جدیدی با کلیدواژه‌های پایا، ساتنا، کارمزد و آبونمان در صورتحساب‌ها یافت نشد.'
    );
  };

  // File Upload Handler with specialized POS & Bank Account differentiation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const normalize = (value: unknown) => String(value ?? '')
      .replace(/[\u200c\u200f\u202a-\u202e\s_\-]/g, '')
      .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').toLowerCase();

    const toDigits = (value: unknown) => String(value ?? '')
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧۸۹'.indexOf(d)));

    const toAmount = (value: unknown) => {
      if (typeof value === 'number') return Math.abs(value);
      const cleaned = toDigits(value).replace(/[٬,،\s]/g, '').replace(/[^0-9.-]/g, '');
      const n = Number(cleaned);
      return Number.isFinite(n) ? Math.abs(n) : 0;
    };

    // Safe, categorized column picker preventing cross-field contamination
    const pickField = (
      row: Record<string, unknown>,
      preferredAliases: string[],
      disallowedKeywords: string[] = []
    ): unknown => {
      const keys = Object.keys(row);
      const normalizedKeys = keys.map((k) => ({ original: k, norm: normalize(k) }));
      const targetAliases = preferredAliases.map(normalize);
      const disallow = disallowedKeywords.map(normalize);

      // 1. Exact match priority
      for (const target of targetAliases) {
        const found = normalizedKeys.find((k) => k.norm === target);
        if (found && row[found.original] !== undefined && row[found.original] !== '') {
          return row[found.original];
        }
      }

      // 2. Substring match only if no disallowed keyword is present
      for (const target of targetAliases) {
        const found = normalizedKeys.find((k) => {
          if (!k.norm.includes(target)) return false;
          if (disallow.some((bad) => k.norm.includes(bad))) return false;
          return true;
        });
        if (found && row[found.original] !== undefined && row[found.original] !== '') {
          return row[found.original];
        }
      }

      return '';
    };

    // Universal Date Parser (handles Date objects, Excel serials, 8-digit Jalali, and Jalali with time)
    const toDate = (value: unknown): string => {
      if (value === undefined || value === null || value === '') return todayGregorian();

      // 1. Date object from XLSX
      if (value instanceof Date) {
        if (!isNaN(value.getTime())) {
          return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
        }
      }

      // 2. Numeric Excel serial date code or numeric compact date
      if (typeof value === 'number') {
        if (value >= 13000101 && value <= 15001230) {
          try {
            return jalaliToIso(String(value));
          } catch {
            // fallback
          }
        }
        if (value >= 19900101 && value <= 20501230) {
          const s = String(value);
          return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
        }
        if (value > 20000 && value < 90000) {
          const date = XLSX.SSF.parse_date_code(value);
          if (date) {
            return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          }
        }
      }

      // 3. String date
      let text = toDigits(value).trim();
      // Remove trailing time part (e.g. 14:22:05 or 14:22)
      text = text.replace(/\s+\d{1,2}:\d{1,2}(:\d{1,2})?.*$/, '').trim();

      // Check for compact 8-digit Jalali (14030715)
      if (/^(13\d{2}|14\d{2})(\d{2})(\d{2})$/.test(text)) {
        try {
          return jalaliToIso(text);
        } catch {
          // fallback
        }
      }

      // Check for standard Jalali with delimiters (1403/07/15, 1403-07-15, 1403.07.15)
      const jalaliMatch = text.match(/^(13\d{2}|14\d{2})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})$/);
      if (jalaliMatch) {
        try {
          return jalaliToIso(`${jalaliMatch[1]}/${jalaliMatch[2]}/${jalaliMatch[3]}`);
        } catch {
          // fallback
        }
      }

      // Check for reversed Jalali (15/07/1403)
      const revJalali = text.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](13\d{2}|14\d{2})$/);
      if (revJalali) {
        try {
          return jalaliToIso(`${revJalali[3]}/${revJalali[2]}/${revJalali[1]}`);
        } catch {
          // fallback
        }
      }

      // Check for Gregorian YYYY-MM-DD
      const gregMatch = text.match(/^(\d{4})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})$/);
      if (gregMatch) {
        const y = Number(gregMatch[1]);
        const m = Number(gregMatch[2]);
        const d = Number(gregMatch[3]);
        if (y >= 1300 && y <= 1500) {
          try {
            return jalaliToIso(`${y}/${m}/${d}`);
          } catch {
            // fallback
          }
        }
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }

      return text || todayGregorian();
    };

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'array', cellDates: true });
        let data: Record<string, unknown>[] = [];
        let sourceName = '';
        let fileAccountNumber = '';
        let isPosReport = false;

        for (const sheetName of wb.SheetNames) {
          const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: '' });

          // Search first 20 rows for account number if any
          for (const row of matrix.slice(0, 20)) {
            for (let i = 0; i < row.length; i++) {
              if (normalize(row[i]).includes('شمارهحساب')) {
                const candidate = row.slice(i + 1).map((v) => toDigits(v).replace(/\D/g, '')).find((v) => v.length >= 10);
                if (candidate) fileAccountNumber = candidate;
              }
            }
          }

          // Search for header row in top 20 rows
          const headerRowIndex = matrix.slice(0, 20).findIndex((row) => {
            const h = row.map(normalize);
            const hasDate = h.some((x) => ['تاریخ', 'تاریختراکنش', 'تاريخ', 'تاريخ تراكنش', 'date', 'transactiondate'].some((k) => x.includes(k)));
            const hasAmount = h.some((x) => ['مبلغ', 'مبلغتراکنش', 'مبلغکل', 'amount', 'برداشت', 'واریز', 'بدهکار', 'بستانکار'].some((k) => x.includes(k)));
            const hasPosMeta = h.some((x) => ['پایانه', 'ترمینال', 'terminal', 'پذیرنده', 'merchant', 'کدارجاع', 'شمارهارجاع', 'rrn'].some((k) => x.includes(k)));
            return (hasDate && hasAmount) || (hasPosMeta && (hasDate || hasAmount));
          });

          if (headerRowIndex >= 0) {
            const headerValues = (matrix[headerRowIndex] || []).map(normalize);

            // Accurate POS report detection based on terminal/RRN/merchant headers or absence of dual debit/credit ledger
            const hasTerminal = headerValues.some((x) => x.includes('پایانه') || x.includes('ترمینال') || x.includes('terminal'));
            const hasMerchant = headerValues.some((x) => x.includes('پذیرنده') || x.includes('merchant'));
            const hasRrn = headerValues.some((x) => x.includes('کدارجاع') || x.includes('شمارهارجاع') || x.includes('rrn'));
            const hasDualDebitCredit = headerValues.some((x) => x.includes('برداشت') || x.includes('بدهکار') || x.includes('debit')) &&
                                       headerValues.some((x) => x.includes('واریز') || x.includes('بستانکار') || x.includes('credit'));
            const fileNameNorm = normalize(file.name);
            const sheetNameNorm = normalize(sheetName);

            isPosReport = (!hasDualDebitCredit && (hasTerminal || hasMerchant || hasRrn)) ||
                          fileNameNorm.includes('pos') || fileNameNorm.includes('پوز') || fileNameNorm.includes('کارتخوان') ||
                          sheetNameNorm.includes('pos') || sheetNameNorm.includes('پوز');

            const rows = matrix.slice(headerRowIndex).map((r) => r as unknown[]);
            const headers = (rows.shift() || []).map((x) => String(x ?? '').trim());
            data = rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
            sourceName = sheetName;
            break;
          }
        }

        if (!data.length) throw new Error('ستون‌های تاریخ و مبلغ در ردیف‌های ابتدایی هیچ برگه‌ای پیدا نشد.');

        const bankAccountSuffix = !isPosReport && fileAccountNumber ? fileAccountNumber.replace(/\D/g, '').slice(-3) : '';
        if ((bankRules.excludedAccountSuffixes || ['009']).map((v) => String(v).replace(/\D/g, '')).includes(bankAccountSuffix)) {
          alert('این صورتحساب مربوط به حساب ۰۰۹ (غدیر و خیریه) است و برای جلوگیری از ورود اطلاعات غیرمدرسه‌ای، وارد نشد.');
          return;
        }

        let feeCount = 0;
        let skipped = 0;
        let failedPosSkipped = 0;

        const newItems = data.map((row) => {
          // Status check: Skip failed POS swipes (e.g. invalid PIN, card decline)
          const statusStr = String(pickField(row, ['وضعیت', 'وضعیت تراکنش', 'نتیجه', 'status', 'نتیجه تراکنش']) || '').trim();
          if (isPosReport && /(ناموفق|خطا|fail|reject|انصراف|برگشت)/i.test(statusStr)) {
            failedPosSkipped++;
            return null;
          }

          let debit = 0;
          let credit = 0;
          let amount = 0;

          if (isPosReport) {
            // POS terminal transactions are strictly incoming card receipts!
            // Crucial: Disallow 'تاریخ' / 'date' to ensure 'تاریخ واریز' is NEVER parsed as amount!
            const posAmountRaw = pickField(row,
              ['مبلغ تراکنش', 'مبلغ کل', 'مبلغ', 'مبلغ (ریال)', 'مبلغ خرید', 'مبلغ خالص', 'amount', 'transaction amount'],
              ['تاریخ', 'date', 'زمان', 'ساعت', 'time', 'کارمزد', 'fee', 'کارت', 'حساب', 'وضعیت', 'شماره', 'کد']
            );
            amount = toAmount(posAmountRaw);
            credit = amount;
            debit = 0;
          } else {
            // Bank statement dual ledger
            debit = toAmount(pickField(row,
              ['برداشت', 'مبلغ برداشت', 'بدهکار', 'گردش بدهکار', 'debit', 'withdrawal', 'برداشت (ریال)'],
              ['تاریخ', 'date', 'زمان', 'ساعت', 'time', 'کارت', 'حساب', 'وضعیت', 'کد', 'شماره']
            ));
            credit = toAmount(pickField(row,
              ['واریز', 'مبلغ واریز', 'بستانکار', 'گردش بستانکار', 'credit', 'deposit', 'واریز (ریال)'],
              ['تاریخ', 'date', 'زمان', 'ساعت', 'time', 'کارت', 'حساب', 'وضعیت', 'کد', 'شماره']
            ));
            const rawAmount = pickField(row,
              ['مبلغ', 'مبلغ تراکنش', 'amount', 'transaction amount'],
              ['تاریخ', 'date', 'زمان', 'ساعت', 'time', 'کارت', 'حساب', 'وضعیت', 'کد', 'شماره']
            );
            amount = debit || credit || toAmount(rawAmount);
          }

          const track = String(pickField(row,
            ['شماره پیگیری', 'کد پیگیری', 'شماره پیگیری تراکنش', 'شماره سند', 'پیگیری', 'tracking', 'trace', 'tracking number', 'trace no']
          ) || '').trim();

          const referenceNumber = String(pickField(row,
            ['شماره مرجع', 'کد ارجاع', 'شماره ارجاع', 'شماره مرجع/قرارداد', 'شماره قرارداد', 'rrn', 'reference number', 'contract number', 'ref no']
          ) || '').trim();

          const posReferenceCode = String(pickField(row,
            ['کد ارجاع', 'کد ارجاع تراکنش', 'شماره ارجاع', 'pos reference code', 'reference code', 'rrn']
          ) || '').trim();

          const feeAmount = toAmount(pickField(row,
            ['کارمزد', 'مبلغ کارمزد', 'کارمزد شاپرک', 'fee', 'fee amount']
          ));

          const terminal = toDigits(pickField(row,
            ['شماره پایانه', 'کد پایانه', 'پایانه', 'شماره ترمینال', 'ترمینال', 'terminal id', 'terminal number', 'pos terminal', 'terminal']
          )).replace(/\D/g, '');

          const desc = String(pickField(row,
            ['شرح', 'شرح تراکنش', 'توضیحات', 'بابت', 'description', 'details']
          ) || '').trim();

          // Date extraction: prioritize transaction date and avoid settlement/deposit date
          const dateRaw = isPosReport
            ? (pickField(row,
                ['تاریخ تراکنش', 'تاریخ انجام تراکنش', 'تاریخ عملیات', 'تاريخ تراكنش', 'تاریخ', 'تاريخ', 'transaction date', 'date'],
                ['واریز', 'تسویه', 'settlement', 'مبلغ', 'amount', 'کارمزد', 'ساعت', 'زمان', 'وضعیت']
              ) || pickField(row, ['تاریخ', 'تاريخ', 'date'], ['مبلغ', 'amount']))
            : pickField(row,
                ['تاریخ تراکنش', 'تاریخ موثر', 'تاریخ عملیات', 'تاریخ سند', 'تاریخ', 'تاريخ', 'date', 'transaction date'],
                ['مبلغ', 'amount', 'مانده', 'ساعت', 'زمان']
              );

          const date = toDate(dateRaw);

          const transactionTime = String(pickField(row,
            ['زمان تراکنش', 'زمان', 'ساعت تراکنش', 'ساعت', 'time', 'transaction time']
          ) || '').trim();

          const settlementDateRaw = pickField(row,
            ['تاریخ واریز', 'تاریخ تسویه', 'تاریخ انتقال', 'settlement date', 'deposit date'],
            ['مبلغ', 'amount']
          );
          const settlementDate = settlementDateRaw === '' ? '' : toDate(settlementDateRaw);

          const sourceCardNumber = toDigits(pickField(row,
            ['شماره کارت مبدا', 'کارت مبدا', 'شماره کارت برداشت', 'کارت برداشت', 'source card number', 'from card', 'source card']
          )).replace(/\D/g, '');

          const destinationCardNumber = toDigits(pickField(row,
            ['شماره کارت مقصد', 'کارت مقصد', 'شماره کارت واریز', 'کارت واریز', 'destination card number', 'to card', 'destination card']
          )).replace(/\D/g, '');

          const genericCardNumber = toDigits(pickField(row,
            ['شماره کارت', 'کارت', 'ماسک کارت', 'شماره کارت شتابی', 'card number', 'card no', 'pan']
          )).replace(/\D/g, '');

          const cardNumber = genericCardNumber || sourceCardNumber || destinationCardNumber;
          const account = String(pickField(row, ['شماره حساب', 'حساب', 'bank account', 'account']) || (isPosReport ? '' : fileAccountNumber)).trim();
          const balance = toAmount(pickField(row, ['مانده', 'موجودی', 'مانده حساب', 'balance', 'running balance']));

          if (!amount || (!desc && !track && !referenceNumber && !terminal)) {
            skipped++;
            return null;
          }
          if (/(کارمزد|پایا|ساتنا|fee)/i.test(desc)) feeCount++;

          return {
            date,
            school_id: currentUser?.school_id || 1,
            amount,
            tracking_code: track || referenceNumber,
            bank_account: account || (isPosReport ? (terminal ? `پوز ${terminal}` : 'گزارش پوز شاپرک') : 'حساب بانکی'),
            card_number: cardNumber,
            source_card_number: sourceCardNumber || undefined,
            destination_card_number: destinationCardNumber || undefined,
            terminal_number: terminal,
            reference_number: referenceNumber,
            pos_reference_code: posReferenceCode,
            fee_amount: feeAmount || undefined,
            account_suffix: fileAccountNumber ? fileAccountNumber.replace(/\D/g, '').slice(-3) : '',
            transaction_time: transactionTime,
            settlement_date: settlementDate,
            balance: balance || undefined,
            direction: isPosReport ? ('pos_sale' as const) : debit > 0 ? ('withdrawal' as const) : credit > 0 ? ('deposit' as const) : ('unknown' as const),
            description: desc || (isPosReport ? (terminal ? `تراکنش کارتخوان پوز ${terminal}` : 'واریز کارتخوان پوز شاپرک') : debit > 0 ? 'برداشت بانکی' : 'واریز بانکی'),
          };
        }).filter((x): x is NonNullable<typeof x> => x !== null);

        if (!newItems.length) throw new Error('هیچ ردیف معتبر دارای مبلغ، شرح یا شماره پیگیری یافت نشد.');

        const configured = schools.filter((sc) => String(sc.pos_terminal_number || '').trim());
        const customTerminals = (bankRules.posTerminals || []).filter((x) => x && x.terminal && Number(x.schoolId) > 0);
        const usedTxIds = new Set<number>();

        const assignedItems = newItems.map((item) => {
          const terminalNo = toDigits(item.terminal_number || '').replace(/\D/g, '').replace(/^0+/, '');
          const customTerminal = terminalNo ? customTerminals.find((x) => toDigits(x.terminal).replace(/\D/g, '').replace(/^0+/, '') === terminalNo) : undefined;
          const terminalSchool = customTerminal
            ? schools.find((sc) => Number(sc.id) === Number(customTerminal.schoolId))
            : terminalNo
              ? configured.find((sc) => toDigits(sc.pos_terminal_number).replace(/\D/g, '').replace(/^0+/, '') === terminalNo)
              : (configured.length === 1 ? configured[0] : undefined);
          const schoolId = customTerminal ? Number(customTerminal.schoolId) : terminalNo ? (terminalSchool?.id || 0) : (terminalSchool?.id || item.school_id);

          // Matching supports both tracking_code and reference_number / RRN
          const itemTrack = String(item.tracking_code || '').trim();
          const itemRef = String(item.reference_number || item.pos_reference_code || '').trim();

          const candidates = transactions.filter((t) => {
            if (usedTxIds.has(t.id) || t.reconciled) return false;
            if (Number(t.amount) !== Number(item.amount)) return false;
            if (schoolId && Number(t.school_id) !== Number(schoolId)) return false;

            const tTrack = String(t.tracking_code || '').trim();
            if (!tTrack) return false;

            // Direct match on tracking code
            if (itemTrack && tTrack === itemTrack) return true;
            // Match on reference code / RRN
            if (itemRef && (tTrack === itemRef || tTrack.endsWith(itemRef) || itemRef.endsWith(tTrack))) return true;

            return false;
          });

          const matched = candidates.length === 1 ? candidates[0] : undefined;
          if (matched) usedTxIds.add(matched.id);

          return {
            ...item,
            school_id: schoolId,
            school_name: terminalSchool?.name || schools.find((s) => s.id === schoolId)?.name,
            reconciled: Boolean(matched),
            matched_transaction_id: matched?.id,
            assigned_student_id: matched?.student_id,
            assigned_student_name: matched?.student_name || '',
          };
        });

        const count = importBankTransactions(assignedItems);
        const matchedCount = assignedItems.filter((item) => item.reconciled).length;
        const unmatchedCount = assignedItems.length - matchedCount;

        let reportMsg = `فایل «${sourceName}» (${isPosReport ? 'گزارش پایانه پوز شاپرک' : 'صورتحساب بانکی'}) با موفقیت خوانده شد: ${count} تراکنش بارگذاری گردید (${matchedCount} مورد تطبیق خودکار و ${unmatchedCount} مورد در صف بررسی).`;
        if (failedPosSkipped > 0) {
          reportMsg += `\n(تعداد ${failedPosSkipped} تراکنش ناموفق/خطای پوز نادیده گرفته شد)`;
        }
        alert(reportMsg);
      } catch (err) {
        alert('خطا در خواندن فایل اکسل: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.onerror = () => alert('خواندن فایل ناموفق بود.');
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Manual Link Action
  const handleManualPair = (bankRow: BankTransaction, tx: Transaction) => {
    updateBankTransaction(bankRow.id, {
      reconciled: true,
      matched_transaction_id: tx.id,
      school_id: tx.school_id,
      school_name: tx.school_name,
      assigned_student_id: tx.student_id,
      assigned_student_name: tx.student_name,
      assigned_purpose: tx.student_name ? `شهریه ${tx.student_name}` : tx.expense_category_name || tx.description || 'ثبت دفتری',
    });
    updateTransaction(tx.id, {
      reconciled: true,
      bank_transaction_id: bankRow.id,
    });
    setManualMatchBankRow(null);
  };

  // Unlink / Detach Action
  const handleUnpair = (bankRow: BankTransaction) => {
    if (!window.confirm('آیا از لغو تطبیق این ردیف با دفاتر حسابداری اطمینان دارید؟')) return;
    if (bankRow.matched_transaction_id) {
      updateTransaction(bankRow.matched_transaction_id, {
        reconciled: false,
        bank_transaction_id: undefined,
      });
    }
    updateBankTransaction(bankRow.id, {
      reconciled: false,
      matched_transaction_id: undefined,
      assigned_student_id: undefined,
      assigned_student_name: undefined,
      assigned_purpose: undefined,
    });
  };

  // Instant Register Bank Row to Books
  const handleInstantRegister = () => {
    if (!instantRegisterRow) return;
    setInstantError('');

    try {
      const amount = Number(instantRegisterRow.amount || 0);
      const date = instantRegisterRow.date;
      const tracking = instantRegisterRow.tracking_code || instantRegisterRow.reference_number || 'بانکی';
      const comment = instantDesc.trim() || instantRegisterRow.description || 'تراکنش بانکی ثبت‌شده مستقیم';

      if (instantType === 'tuition') {
        if (!instantStudentId) {
          setInstantError('لطفاً ابتدا دانش‌آموز را جستجو و انتخاب کنید.');
          return;
        }
        const student = students.find((s) => s.id === Number(instantStudentId));
        addTuitionPayment({
          student_id: Number(instantStudentId),
          amount,
          date,
          description: comment,
          payment_method: 'کارت خوان',
          tracking_code: tracking,
          school_id: student?.school_id || instantSchoolId,
        });

        updateBankTransaction(instantRegisterRow.id, {
          reconciled: true,
          assigned_student_id: Number(instantStudentId),
          assigned_student_name: student?.name,
          assigned_purpose: `شهریه ${student?.name || ''}`,
          school_id: student?.school_id || instantSchoolId,
        });
      } else if (instantType === 'bank_fee') {
        const feeCategory = categories.find((c) => c.name.includes('کارمزد') || c.name.includes('بانک'))?.id || instantCategoryId;
        const newExpense = addExpense({
          category_id: feeCategory,
          amount,
          date,
          tracking_code: tracking,
          payment_source: 'bank',
          comment: comment || 'کارمزد خدمات بانکی',
          school_id: instantSchoolId,
          bank_transaction_id: instantRegisterRow.id,
        });
        updateBankTransaction(instantRegisterRow.id, {
          reconciled: true,
          matched_transaction_id: newExpense.id,
          assigned_purpose: 'کارمزد بانک',
          school_id: instantSchoolId,
        });
      } else if (instantType === 'expense') {
        const newExpense = addExpense({
          category_id: instantCategoryId,
          amount,
          date,
          tracking_code: tracking,
          payment_source: 'bank',
          comment,
          school_id: instantSchoolId,
          bank_transaction_id: instantRegisterRow.id,
        });
        updateBankTransaction(instantRegisterRow.id, {
          reconciled: true,
          matched_transaction_id: newExpense.id,
          assigned_purpose: comment,
          school_id: instantSchoolId,
        });
      } else {
        addPettyCashIncome({
          amount,
          date,
          tracking_code: tracking,
          comment,
          school_id: instantSchoolId,
          card: instantRegisterRow.card_number || '',
          linked_account_name: instantRegisterRow.bank_account || 'حساب جاری مدرسه',
          bank_transaction_id: instantRegisterRow.id,
        });
        updateBankTransaction(instantRegisterRow.id, {
          reconciled: true,
          assigned_purpose: comment,
          school_id: instantSchoolId,
        });
      }

      setInstantRegisterRow(null);
      setInstantDesc('');
      setInstantStudentId('');
      setInstantStudentSearch('');
    } catch (err) {
      setInstantError('خطا در ثبت: ' + String(err));
    }
  };

  // Export Bank Reconciliation Statement to XLSX
  const exportReconciliationToExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['صورت مغایرت بانکی مدرسه', 'تاریخ گزارش:', todayJalali()],
      ['مدرسه:', selectedSchoolId === 0 ? 'کلیه مدارس' : schools.find((s) => s.id === selectedSchoolId)?.name || ''],
      [],
      ['شرح ردیف', 'مبلغ (ریال)', 'توضیحات و اقلام'],
      ['۱. مانده پایان دوره طبق دفاتر حسابداری', reconciliationStatement.bookBalance, 'مجموع شهریه و دریافت‌ها منهای هزینه‌های ثبت‌شده'],
      ['۲. اضافه می‌شود: اقلام باز بستانکار صورتحساب بانک', reconciliationStatement.totalBankUnmatchedDeposits, 'واریزی‌های بانکی ثبت‌نشده در دفاتر (واریز مستقیم/پوز)'],
      ['۳. کسر می‌شود: اقلام باز بدهکار صورتحساب بانک', reconciliationStatement.totalBankUnmatchedWithdrawals, 'برداشت‌ها و کارمزدهای ثبت‌نشده در دفاتر'],
      ['۴. مانده تعدیل‌شده دفاتر', reconciliationStatement.adjustedBookBalance, 'مانده واقعی نهایی دفاتر'],
      [],
      ['۵. مانده پایان دوره طبق صورتحساب بانک', reconciliationStatement.bankCalculatedBalance, 'مانده بر اساس گردش صورتحساب بارگذاری‌شده'],
      ['۶. اضافه می‌شود: اقلام باز بدهکار دفاتر (سپرده‌های در راه)', reconciliationStatement.totalBookUnmatchedDeposits, 'دریافت‌های دفتری که هنوز در بانک ننشسته‌اند'],
      ['۷. کسر می‌شود: اقلام باز بستانکار دفاتر (چک‌ها/پرداخت‌های معوق)', reconciliationStatement.totalBookUnmatchedWithdrawals, 'پرداخت‌های دفتری که هنوز از بانک برداشت نشده‌اند'],
      ['۸. مانده تعدیل‌شده صورتحساب بانک', reconciliationStatement.adjustedBankBalance, 'مانده واقعی نهایی صورتحساب'],
      [],
      ['اختلاف مغایرت نهایی (تراز)', reconciliationStatement.discrepancy, reconciliationStatement.isBalanced ? 'کاملاً تراز و بدون مغایرت (تأیید شده)' : 'دارای اختلاف نیاز به بررسی'],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'خلاصه صورت مغایرت');

    const unmatchedBankData = [
      ['تاریخ', 'نوع', 'مبلغ (ریال)', 'کد پیگیری', 'پایانه', 'کارت', 'شرح بانکی'],
      ...currentBankRows.filter((b) => !b.reconciled).map((b) => [
        jalaliFromGregorian(b.date),
        b.direction === 'deposit' ? 'واریز' : b.direction === 'withdrawal' ? 'برداشت' : 'سایر',
        b.amount,
        b.tracking_code || b.reference_number || '',
        b.terminal_number || '',
        b.card_number || '',
        b.description || '',
      ]),
    ];
    const wsBank = XLSX.utils.aoa_to_sheet(unmatchedBankData);
    XLSX.utils.book_append_sheet(wb, wsBank, 'اقلام باز بانک');

    XLSX.writeFile(wb, `صورت_مغایرت_بانکی_${todayJalali().replace(/\//g, '-')}.xlsx`);
  };

  // Filtered lists for Tab 1 (Main account)
  const filteredBankTxs = useMemo(() => {
    return bankTxs.filter((t) => {
      if (statusFilter === 'matched' && !t.reconciled) return false;
      if (statusFilter === 'unmatched' && t.reconciled) return false;
      if (statusFilter === 'fees' && !t.is_bank_fee) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const stName = (t.student_name || '').toLowerCase();
      const track = (t.tracking_code || '').toLowerCase();
      const desc = (t.description || t.comment || t.expense_category_name || '').toLowerCase();
      const amountStr = String(t.amount || '');
      return stName.includes(q) || track.includes(q) || desc.includes(q) || amountStr.includes(q);
    });
  }, [bankTxs, statusFilter, searchQuery]);

  // Paginated visible ledger transactions for ultra-fast rendering
  const displayedBankTxs = useMemo(() => {
    return filteredBankTxs.slice(0, visibleLedgerCount);
  }, [filteredBankTxs, visibleLedgerCount]);

  const filteredStatementRows = useMemo(() => {
    return currentBankRows.filter((b) => {
      if (statusFilter === 'matched' && !b.reconciled) return false;
      if (statusFilter === 'unmatched' && b.reconciled) return false;
      if (statusFilter === 'fees' && !String(b.assigned_purpose || '').includes('کارمزد') && !/کارمزد|پایا|ساتنا/i.test(b.description || '')) return false;

      if (directionFilter === 'deposit' && b.direction !== 'deposit' && b.direction !== 'pos_sale') return false;
      if (directionFilter === 'withdrawal' && b.direction !== 'withdrawal') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const desc = (b.description || '').toLowerCase();
      const track = (b.tracking_code || b.reference_number || '').toLowerCase();
      const card = (b.card_number || b.bank_account || '').toLowerCase();
      const amountStr = String(b.amount || '');
      const student = (b.assigned_student_name || '').toLowerCase();
      return desc.includes(q) || track.includes(q) || card.includes(q) || amountStr.includes(q) || student.includes(q);
    });
  }, [currentBankRows, statusFilter, directionFilter, searchQuery]);

  // Paginated visible bank transactions for ultra-fast 60 FPS rendering
  const displayedStatementRows = useMemo(() => {
    return filteredStatementRows.slice(0, visibleBankCount);
  }, [filteredStatementRows, visibleBankCount]);

  // Candidates for manual match modal
  const manualMatchCandidates = useMemo(() => {
    if (!manualMatchBankRow) return [];
    const b = manualMatchBankRow;
    const bAmt = Number(b.amount || 0);

    return transactions
      .filter((t) => {
        if (t.review_status === 'rejected') return false;
        if (t.payment_method === 'پول نقد') return false;
        if (selectedSchoolId !== 0 && t.school_id !== selectedSchoolId) return false;

        if (manualMatchSearch.trim()) {
          const q = manualMatchSearch.toLowerCase().trim();
          const sName = (t.student_name || '').toLowerCase();
          const desc = (t.description || t.expense_category_name || '').toLowerCase();
          const track = (t.tracking_code || '').toLowerCase();
          const amtStr = String(t.amount || '');
          if (!sName.includes(q) && !desc.includes(q) && !track.includes(q) && !amtStr.includes(q)) return false;
        }
        return true;
      })
      .map((t) => {
        let score = 0;
        let matchReason = '';

        if (Number(t.amount) === bAmt) {
          score += 50;
          matchReason = 'مبلغ دقیقاً یکسان';
        } else if (Math.abs(Number(t.amount) - bAmt) < 50000) {
          score += 20;
          matchReason = 'مبلغ نزدیک';
        }

        const bTrack = String(b.tracking_code || b.reference_number || '').trim();
        const tTrack = String(t.tracking_code || '').trim();
        if (bTrack && tTrack && (bTrack === tTrack || bTrack.includes(tTrack) || tTrack.includes(bTrack))) {
          score += 40;
          matchReason += ' + کد پیگیری منطبق';
        }

        const diffDays = dayDistance(t.date, b.date);
        if (diffDays <= 1) score += 20;
        else if (diffDays <= 3) score += 10;

        return { transaction: t, score, matchReason };
      })
      .sort((a, b) => b.score - a.score);
  }, [manualMatchBankRow, transactions, selectedSchoolId, manualMatchSearch]);

  // Petty cash withdrawal matching rows
  const pettyCashWithdrawalRows = useMemo(() => {
    return bankTransactions.filter((b) =>
      b.direction === 'withdrawal' && !b.reconciled &&
      (selectedSchoolId === 0 || b.school_id === selectedSchoolId) &&
      (isSenior || b.school_id === currentUser?.school_id) &&
      /۰۰۱|۰۰۲|001|002|111889212002|218706617001/.test(digitsOnly(b.bank_account))
    );
  }, [bankTransactions, selectedSchoolId, isSenior, currentUser]);

  const getPettyCashCandidates = (b: BankTransaction) => {
    const bankCard = digitsOnly(b.source_card_number || (b.card_number && !b.destination_card_number ? b.card_number : ''));
    const mappedCard = (bankRules.pettyCashCards || []).find((x) => x.active !== false && digitsOnly(x.card) === bankCard);
    return pettyCashTxs.filter((t) => {
      if (t.reconciled || t.review_status === 'rejected') return false;
      const sharedCard = Boolean(mappedCard && !mappedCard.schoolId);
      if ((!sharedCard && Number(t.school_id) !== Number(b.school_id)) || Number(t.amount) !== Number(b.amount)) return false;
      if (dayDistance(t.date, b.date) > Number(bankRules.matching?.dateWindowDays ?? 3)) return false;
      const configuredCard = digitsOnly(t.petty_cash_card || users.find((u) => u.school_id === t.school_id && u.role === 'manager')?.petty_cash_card || schools.find((s) => s.id === t.school_id)?.petty_cash_card);
      if (bankCard && mappedCard && !configuredCard) return false;
      if (bankCard && configuredCard && !bankCard.endsWith(configuredCard.slice(-4))) return false;
      if (mappedCard?.schoolId && Number(mappedCard.schoolId) !== Number(t.school_id)) return false;
      return true;
    });
  };

  const reconcilePettyCashPair = (bankId: number, transactionId: number) => {
    const bankRow = bankTransactions.find((b) => b.id === bankId);
    const expense = transactions.find((t) => t.id === transactionId);
    if (!bankRow || !expense || expense.kind !== 'هزینه' || expense.payment_source !== 'petty_cash') return;
    const sourceCard = digitsOnly(bankRow.source_card_number || bankRow.card_number || '');
    const mappedCard = (bankRules.pettyCashCards || []).find((x) => x.active !== false && digitsOnly(x.card) === sourceCard);
    const sharedCard = Boolean(mappedCard && !mappedCard.schoolId);
    if (Number(bankRow.amount) !== Number(expense.amount) || (!sharedCard && Number(bankRow.school_id) !== Number(expense.school_id))) {
      alert('مبلغ یا مدرسهٔ تراکنش‌ها یکسان نیست؛ تطبیق انجام نشد.');
      return;
    }
    updateBankTransaction(bankId, {
      reconciled: true,
      school_id: expense.school_id,
      school_name: schools.find((s) => Number(s.id) === Number(expense.school_id))?.name,
      matched_transaction_id: transactionId,
      assigned_purpose: expense.expense_category_name || expense.description || 'هزینه تن‌خواه',
    });
    manualReviewTransaction(transactionId, true, 'تطبیق با برداشت بانکی');
  };

  if (!isSenior) {
    return (
      <div className="min-h-screen bg-[#f8f5f9] flex flex-col">
        <Header title="تطبیق و مغایرت‌گیری بانکی" />
        <div className="max-w-md mx-auto my-auto p-6 bg-white rounded-3xl border border-[#e5dde8] shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Landmark className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-[#341648]">دسترسی محدود به مدیریت ارشد</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            بخش امور بانکی، تطبیق صورتحساب‌ها و گزارش‌های پوز منحصراً در اختیار مدیریت ارشد مجموعه (جناب آقای گلزاری) می‌باشد.
          </p>
          <button
            onClick={() => setCurrentScreen('dashboard')}
            className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-sm active:scale-95"
          >
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-20 w-full max-w-full overflow-x-hidden">
      <Header title="سیستم پیشرفته تطبیق و مغایرت‌گیری بانکی" />

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-6 w-full min-w-0">

        {/* Manager Mandatory Card Action Notice */}
        {!isSenior && registrationRequiredRows.length > 0 && (
          <section className="rounded-3xl border-2 border-rose-300 bg-rose-50 p-4 sm:p-5 space-y-3 shadow-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-extrabold text-rose-950 text-base">ثبت تراکنش‌های کارت تن‌خواه الزامی است</h3>
                <p className="mt-1 text-xs leading-6 text-rose-800">
                  برای کارت شما {registrationRequiredRows.length} تراکنش ثبت‌نشده در صورتحساب پیدا شد. لطفاً هر برداشت را به عنوان هزینه و هر واریزی را به عنوان شارژ تن‌خواه ثبت کنید.
                </p>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              {registrationRequiredRows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-rose-200 bg-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-900">
                      {row.direction === 'withdrawal' ? 'برداشت — ثبت هزینه' : 'واریز — ثبت شارژ تن‌خواه'} · <span className="font-mono text-rose-700">{formatRial(row.amount)} ریال</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {jalaliFromGregorian(row.date)} · {row.description || 'بدون شرح'} · پیگیری: <span className="font-mono">{row.tracking_code || row.reference_number || '—'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRegistration(row)}
                    className="shrink-0 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-4 py-2.5 transition-all shadow-xs"
                  >
                    ثبت این تراکنش در دفاتر
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Hero Banner with Modern Styling & Quick Stats */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #2f0b38 100%)`,
          }}
        >
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-[#f5dff2] text-xs font-bold backdrop-blur-xs">
                <Landmark className="w-3.5 h-3.5 text-amber-300" />
                <span>سامانه مغایرت‌گیری و تطبیق حساب‌های بانکی مدارس</span>
              </div>
              <div className="text-xs text-white/80 font-bold">
                تاریخ امروز: {todayJalali()}
              </div>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black font-neyrizi leading-tight">
                تطبیق هوشمند صورتحساب، تراز دفاتر و ردیابی کارمزدها
              </h2>
              <p className="text-xs text-[#f5dff2]/90 max-w-3xl leading-relaxed mt-1.5">
                تطبیق چندمرحله‌ای شهریه و واریزی‌های پوز شاپرک با اسناد دفاتر، ثبت مستقیم هزینه‌ها و کارمزدهای بانکی به همراه صدور صورت مغایرت بانکی رسمی.
              </p>
            </div>

            {/* Quick KPI Stat Bar inside Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3 border border-white/15">
                <div className="text-[11px] text-white/80">تراکنش‌های بانکی</div>
                <div className="text-lg font-black font-mono mt-0.5">{currentBankRows.length}</div>
                <div className="text-[10px] text-white/70 mt-0.5">در صورتحساب‌های فعال</div>
              </div>

              <div className="rounded-2xl bg-emerald-500/20 backdrop-blur-md p-3 border border-emerald-300/30">
                <div className="text-[11px] text-emerald-200">تطبیق‌یافته و متناظر</div>
                <div className="text-lg font-black font-mono text-emerald-100 mt-0.5">{matchedBankRows.length}</div>
                <div className="text-[10px] text-emerald-200/80 mt-0.5">
                  {currentBankRows.length ? Math.round((matchedBankRows.length / currentBankRows.length) * 100) : 0}٪ درصد تراز
                </div>
              </div>

              <div className="rounded-2xl bg-amber-500/20 backdrop-blur-md p-3 border border-amber-300/30">
                <div className="text-[11px] text-amber-200">در انتظار تطبیق (اقلام باز)</div>
                <div className="text-lg font-black font-mono text-amber-100 mt-0.5">{unmatchedBankRows.length}</div>
                <div className="text-[10px] text-amber-200/80 mt-0.5">نیازمند اقدام یا پیوند</div>
              </div>

              <div className={`rounded-2xl backdrop-blur-md p-3 border ${reconciliationStatement.isBalanced ? 'bg-teal-500/20 border-teal-300/30' : 'bg-rose-500/20 border-rose-300/30'}`}>
                <div className="text-[11px] text-white/80">مغایرت نهایی دفاتر و بانک</div>
                <div className="text-lg font-black font-mono mt-0.5">
                  {reconciliationStatement.isBalanced ? 'تراز (۰)' : formatRial(reconciliationStatement.discrepancy)}
                </div>
                <div className="text-[10px] text-white/80 mt-0.5">
                  {reconciliationStatement.isBalanced ? '✓ بدون عدم انطباق' : 'دارای اختلاف تراز'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Toolbar & Main Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <label className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] text-[#341648] font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all text-center">
            <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>ورود فایل اکسل بانک</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleAdvancedReconcile}
            className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl text-white font-bold text-xs shadow-md active:scale-95 transition-all text-center"
            style={{ backgroundColor: accentColor }}
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>تطبیق هوشمند پیشرفته</span>
          </button>

          <button
            type="button"
            onClick={handleScanAndIdentifyBankFees}
            className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all text-center"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>شناسایی خودکار کارمزدها</span>
          </button>

          <button
            type="button"
            onClick={exportReconciliationToExcel}
            className="flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md active:scale-95 transition-all text-center"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>خروجی اکسل صورت مغایرت</span>
          </button>
        </div>

        {/* Link to Bank Accounts Ledger Screen */}
        <div className="bg-white rounded-2xl p-3 border border-emerald-200/80 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#341648]">
            <Landmark className="w-4 h-4 text-emerald-600" />
            <span>مدیریت حساب‌های بانکی، تعریف کد کل و معین و مشاهده کارتکس تراکنش‌های تطبیق‌یافته</span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentScreen('bank_accounts')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all shrink-0"
          >
            <span>ورود به بخش بانک‌ها ⬅️</span>
          </button>
        </div>

        {/* Notifications and Alerts */}
        {reconcileResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{reconcileResult}</span>
            </div>
            <button onClick={() => setReconcileResult(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {feeNotice && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{feeNotice}</span>
            </div>
            <button onClick={() => setFeeNotice(null)} className="text-amber-700 hover:text-amber-900 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-white rounded-2xl p-1.5 border border-[#e5dde8] shadow-xs">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'main'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'main' ? { backgroundColor: accentColor } : {}}
          >
            <Landmark className="w-4 h-4 shrink-0" />
            <span>حساب جاری و پوز شاپرک ({bankTxs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('petty_cash')}
            className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'petty_cash'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'petty_cash' ? { backgroundColor: accentColor } : {}}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>تن‌خواه مدیران و کارمزدها ({bankTransactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('statement')}
            className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'statement'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'statement' ? { backgroundColor: accentColor } : {}}
          >
            <Calculator className="w-4 h-4 shrink-0" />
            <span>صورت مغایرت رسمی و تراز</span>
          </button>
        </div>

        {/* Universal Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#e5dde8] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی سریع بر اساس کد پیگیری، نام دانش‌آموز، مبلغ یا شماره کارت..."
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* School Filter Dropdown */}
            {isSenior && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600 shrink-0">مدرسه:</span>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
                  className="rounded-xl border border-gray-200 py-2.5 px-3 text-xs font-bold text-gray-800 bg-gray-50 focus:outline-none focus:border-purple-600"
                >
                  <option value={0}>همه مدارس ({schools.length})</option>
                  {schools.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-gray-500 font-bold ml-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> وضعیت:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-[#341648] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                همه ({activeTab === 'main' ? bankTxs.length : currentBankRows.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unmatched')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  statusFilter === 'unmatched'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                اقلام باز / تطبیق‌نشده ({unmatchedBankRows.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('matched')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  statusFilter === 'matched'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                تطبیق‌شده ({matchedBankRows.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('fees')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  statusFilter === 'fees'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                کارمزدهای بانک
              </button>
            </div>

            {/* Extra Controls */}
            {isSenior && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('تمام ردیف‌های واردشدهٔ صورتحساب بانک و پوز از این دستگاه پاک شوند؟ اسناد دفاتر و هزینه‌ها حذف نمی‌شوند.')) {
                    clearImportedBankTransactions();
                  }
                }}
                className="text-rose-700 hover:text-rose-900 font-bold text-xs flex items-center gap-1 p-1 hover:bg-rose-50 rounded-lg transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>پاکسازی ردیف‌های اکسل</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Main Bank Account & Tuition Matching */}
        {activeTab === 'main' && (
          <div className="space-y-6">

            {/* Bank Statement Imported Rows Section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#341648] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                  <span>تراکنش‌های صورتحساب بانک و پوز شاپرک ({filteredStatementRows.length} ردیف)</span>
                </h3>
                <div className="text-xs text-gray-500 font-semibold">
                  مجموع: {formatRial(filteredStatementRows.reduce((s, b) => s + Number(b.amount || 0), 0))} ریال
                </div>
              </div>

              {filteredStatementRows.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8] space-y-2">
                  <FileSpreadsheet className="w-8 h-8 mx-auto text-gray-300" />
                  <p>تراکنشی متناسب با فیلترهای انتخابی در صورتحساب بانک یافت نشد.</p>
                  <label className="inline-block mt-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl font-bold text-xs cursor-pointer">
                    آپلود فایل اکسل صورتحساب بانک
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedStatementRows.map((b) => (
                    <div
                      key={b.id}
                      className={`rounded-2xl p-4 border transition-all shadow-xs ${
                        b.reconciled
                          ? 'bg-white border-emerald-200 hover:border-emerald-400'
                          : 'bg-white border-amber-200 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2.5 border-b border-gray-100">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{b.description || 'تراکنش بانکی'}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              b.direction === 'deposit'
                                ? 'bg-emerald-100 text-emerald-900'
                                : b.direction === 'withdrawal'
                                ? 'bg-rose-100 text-rose-900'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {b.direction === 'deposit' ? 'واریزی' : b.direction === 'withdrawal' ? 'برداشت' : 'گزارش پوز'}
                            </span>
                            {b.reconciled ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> تطبیق‌شده با دفاتر
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300">
                                در انتظار تطبیق
                              </span>
                            )}
                            {b.assigned_purpose && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                                {b.assigned_purpose}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-gray-500 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                            <span>تاریخ: <b className="text-gray-700">{jalaliFromGregorian(b.date)}</b></span>
                            <span>پیگیری: <span className="font-mono text-gray-700">{b.tracking_code || b.reference_number || '—'}</span></span>
                            <span>پایانه: <span className="font-mono">{b.terminal_number || '—'}</span></span>
                            <span>کارت/حساب: <span className="font-mono" dir="ltr">{b.card_number || b.bank_account || '—'}</span></span>
                            {b.school_name && <span>مدرسه: <b className="text-gray-700">{b.school_name}</b></span>}
                            {b.assigned_student_name && (
                              <span className="text-indigo-700 font-extrabold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                <GraduationCap className="w-3 h-3 text-indigo-700" />
                                <span>دانش‌آموز: {b.assigned_student_name}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-base sm:text-lg font-black font-mono whitespace-nowrap self-end sm:self-start text-[#341648]">
                          {formatRial(b.amount)} ریال
                        </div>
                      </div>

                      {/* Action buttons on bank item */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 text-xs">
                        <div className="text-[11px] text-gray-500">
                          {b.balance !== undefined && <span>مانده پس از تراکنش: <b className="font-mono">{formatRial(b.balance)}</b> ریال</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Searchable Assign Student Button */}
                          <button
                            type="button"
                            onClick={() => openAssignStudent(b)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 font-bold transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            <User className="w-3.5 h-3.5 text-indigo-700" />
                            <span>{b.assigned_student_name ? `دانش‌آموز: ${b.assigned_student_name}` : 'جستجو و انتخاب دانش‌آموز'}</span>
                          </button>

                          {/* Dedicated Record Expense Button */}
                          <button
                            type="button"
                            onClick={() => openRecordExpense(b)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-bold transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            <Receipt className="w-3.5 h-3.5 text-rose-600" />
                            <span>ثبت به عنوان هزینه</span>
                          </button>

                          {!b.reconciled ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setManualMatchBankRow(b);
                                  setManualMatchSearch('');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-purple-50 text-[#62205f] border border-purple-200 hover:bg-purple-100 font-bold transition-all flex items-center gap-1.5 shadow-xs"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                                <span>تطبیق دستی با دفاتر</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setInstantRegisterRow(b);
                                  setInstantType(b.direction === 'withdrawal' ? 'expense' : 'tuition');
                                  setInstantDesc(b.description || '');
                                  setInstantSchoolId(b.school_id || currentUser?.school_id || schools[0]?.id || 1);
                                  setInstantStudentId(b.assigned_student_id || '');
                                  setInstantStudentSearch('');
                                  setInstantError('');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold transition-all flex items-center gap-1.5 shadow-xs"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>ثبت مستقیم سند</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnpair(b)}
                              className="px-3 py-1.5 rounded-xl bg-gray-50 text-rose-700 border border-gray-200 hover:bg-rose-50 font-bold transition-all flex items-center gap-1.5"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                              <span>لغو تطبیق</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load More Pagination Button */}
                  {filteredStatementRows.length > visibleBankCount && (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <div className="text-xs text-gray-500 font-semibold">
                        نمایش {displayedStatementRows.length} از {filteredStatementRows.length} ردیف صورتحساب بانک
                      </div>
                      <button
                        type="button"
                        onClick={() => setVisibleBankCount((prev) => prev + 50)}
                        className="px-5 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#62205f] font-bold text-xs shadow-xs transition-all flex items-center gap-2 active:scale-95"
                      >
                        <ChevronDown className="w-4 h-4" />
                        <span>نمایش ۵۰ ردیف بعدی</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* School Ledger Transactions Section */}
            <section className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#341648] flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-700" />
                  <span>اسناد ثبت‌شده در دفاتر مدرسه ({filteredBankTxs.length} سند)</span>
                </h3>
                <div className="text-xs text-gray-500 font-semibold">
                  مجموع: {formatRial(filteredBankTxs.reduce((s, t) => s + (t.amount || 0), 0))} ریال
                </div>
              </div>

              {filteredBankTxs.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
                  تراکنش دفتری متناسب با فیلترها وجود ندارد.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedBankTxs.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs space-y-3 hover:border-purple-300 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-gray-100 gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#341648]">
                              {t.student_name ? `شهریه دانش‌آموز: ${t.student_name}` : t.expense_category_name || t.description}
                            </span>
                            <span className="text-xs text-gray-500 font-semibold">({t.school_name})</span>
                            {t.is_bank_fee && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                کارمزد بانک
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                            <span>تاریخ: <b className="text-gray-700">{jalaliFromGregorian(t.date)}</b></span>
                            <span>روش: {t.payment_method || 'بانک'}</span>
                            <span>کد پیگیری: <span className="font-mono text-gray-700">{t.tracking_code || '—'}</span></span>
                          </div>
                        </div>

                        <div className="text-base sm:text-lg font-black font-mono text-[#341648] self-end sm:self-center">
                          {formatRial(t.amount)} ریال
                        </div>
                      </div>

                      {t.attachment_url && (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 flex items-center justify-between text-xs">
                          <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-indigo-700" /> مدرک پیوست دارد
                          </span>
                          <button
                            type="button"
                            onClick={() => void openAttachment(t.attachment_url!)}
                            className="text-indigo-700 font-bold underline"
                          >
                            مشاهده تصویر فیش
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div
                          className={`p-2 rounded-xl border flex items-center justify-between ${
                            t.reconciled
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}
                        >
                          <span>تطبیق با صورتحساب بانک:</span>
                          <span className="font-bold">
                            {t.reconciled ? '✓ تطبیق داده شده' : '✕ در انتظار تطبیق'}
                          </span>
                        </div>

                        <div
                          className={`p-2 rounded-xl border flex items-center justify-between ${
                            t.review_status === 'approved'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          <span>وضعیت بررسی مدیر ارشد:</span>
                          <span className="font-bold">
                            {t.review_status === 'approved' ? '✓ تأیید شده' : 'در انتظار بررسی'}
                          </span>
                        </div>
                      </div>

                      {isSenior && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => manualReviewTransaction(t.id, true)}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                          >
                            <Check className="w-4 h-4" />
                            <span>تأیید صحت سند</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => manualReviewTransaction(t.id, false, 'رد توسط مدیر ارشد')}
                            className="py-2 px-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5"
                          >
                            <X className="w-4 h-4" />
                            <span>رد / مغایرت</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Load More Ledger Pagination */}
                  {filteredBankTxs.length > visibleLedgerCount && (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <div className="text-xs text-gray-500 font-semibold">
                        نمایش {displayedBankTxs.length} از {filteredBankTxs.length} سند دفتری
                      </div>
                      <button
                        type="button"
                        onClick={() => setVisibleLedgerCount((prev) => prev + 40)}
                        className="px-5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-xs shadow-xs transition-all flex items-center gap-2 active:scale-95"
                      >
                        <ChevronDown className="w-4 h-4" />
                        <span>نمایش ۴۰ سند بعدی</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: Managers' Petty Cash Cards & Reconciliation */}
        {activeTab === 'petty_cash' && (
          <div className="space-y-6">

            {/* Petty Cash Cards Overview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-700" />
                  <span>کارت‌های تن‌خواه اختصاصی مدیران مدارس:</span>
                </span>
                {isSenior && (
                  <button
                    type="button"
                    onClick={() => setShowRulesModal(true)}
                    className="text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>تنظیم قواعد نگاشت و پایانه‌ها</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {schools.map((sc) => {
                  const manager = users.find((u) => u.school_id === sc.id && u.role === 'manager');
                  const managerKnownCards = manager ? knownManagerCardRoster.filter((item) => normalizeManagerIdentity(item.managerName) === normalizeManagerIdentity(manager.name)).map((item) => item.card) : [];
                  const savedCard = String(manager?.petty_cash_card || sc.petty_cash_card || '').replace(/\D/g, '');
                  const schoolCards = Array.from(new Set([...(savedCard ? [savedCard] : []), ...managerKnownCards]));
                  const cardNum = schoolCards.join('، ');
                  const limit = manager?.petty_cash_limit || 0;

                  const spent = transactions
                    .filter((t) => t.kind === 'هزینه' && t.school_id === sc.id && t.payment_source === 'petty_cash')
                    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

                  const remaining = Math.max(0, limit - spent);
                  const usagePercent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

                  return (
                    <div
                      key={sc.id}
                      onClick={() => setSelectedSchoolId(selectedSchoolId === sc.id ? 0 : sc.id)}
                      className={`rounded-2xl p-4 border shadow-xs cursor-pointer transition-all ${
                        selectedSchoolId === sc.id
                          ? 'border-[#62205f] bg-purple-50/50 ring-2 ring-[#62205f]/20'
                          : 'border-[#e5dde8] bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-[#341648]">{sc.name}</span>
                        <span className="text-[10px] bg-purple-100 text-[#62205f] px-2 py-0.5 rounded-md font-bold">
                          {manager?.name ? manager.name.split(' ')[0] : 'مدیر'}
                        </span>
                      </div>

                      <div className="font-mono text-xs font-bold text-gray-800 tracking-wider mb-2 bg-[#fcfaff] p-2 rounded-xl border border-gray-100 text-center" dir="ltr">
                        {cardNum || 'کارت ثبت نشده'}
                      </div>

                      {/* Usage Progress Bar */}
                      {limit > 0 && (
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-[10px] text-gray-500">
                            <span>مصرف سقف تن‌خواه:</span>
                            <span className="font-bold">{usagePercent}٪</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-purple-600'}`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {isSenior && manager && (
                        <div className="grid grid-cols-2 gap-1.5 mb-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="rounded-lg bg-purple-50 text-purple-800 border border-purple-200 py-1 text-[11px] font-bold hover:bg-purple-100"
                            onClick={() => {
                              const nextCard = window.prompt('شماره کارت تنخواه مدیر', manager.petty_cash_card || '');
                              if (nextCard === null) return;
                              updateManager(manager.id, { petty_cash_card: nextCard.trim() });
                            }}
                          >
                            {cardNum ? 'ویرایش کارت' : 'افزودن کارت'}
                          </button>

                          <button
                            type="button"
                            className="rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 py-1 text-[11px] font-bold hover:bg-indigo-100"
                            onClick={() => {
                              const nextLimit = window.prompt('سقف مجاز کارت تن‌خواه به ریال', String(manager.petty_cash_limit || 0));
                              if (nextLimit === null) return;
                              const parsedLimit = Number(nextLimit.replace(/[^0-9]/g, ''));
                              if (!Number.isFinite(parsedLimit) || parsedLimit < 0) { alert('سقف تنخواه معتبر نیست.'); return; }
                              updateManager(manager.id, { petty_cash_limit: parsedLimit });
                            }}
                          >
                            ویرایش سقف
                          </button>
                        </div>
                      )}

                      <div className="space-y-1 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                        <div className="flex justify-between">
                          <span>سقف تن‌خواه:</span>
                          <span className="font-mono font-bold text-gray-800">{formatRial(limit)} ریال</span>
                        </div>
                        <div className="flex justify-between">
                          <span>هزینه‌کرد تن‌خواه:</span>
                          <span className="font-mono font-bold text-rose-700">{formatRial(spent)} ریال</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-dashed border-gray-200">
                          <span>مانده مجاز تن‌خواه:</span>
                          <span className="font-mono">{formatRial(remaining)} ریال</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bank withdrawals awaiting petty cash match */}
            <section className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-700" />
                    <span>برداشت‌های بانکی منتظر تطبیق با تن‌خواه ({pettyCashWithdrawalRows.length})</span>
                  </h3>
                  <p className="text-xs text-amber-900 mt-0.5">
                    برداشت از حساب‌های ۰۰۱ و ۰۰۲ با هزینه‌های تن‌خواه مدیران تطبیق داده می‌شود.
                  </p>
                </div>
              </div>

              {pettyCashWithdrawalRows.length === 0 ? (
                <div className="rounded-2xl bg-white p-4 text-center text-xs text-gray-500 border border-amber-100">
                  هیچ برداشت بانکی تطبیق‌نشده‌ای از حساب‌های ۰۰۱ یا ۰۰۲ در صورتحساب فعلی وجود ندارد.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pettyCashWithdrawalRows.map((b) => {
                    const candidates = getPettyCashCandidates(b);
                    return (
                      <div key={b.id} className="rounded-2xl border border-amber-200 bg-white p-3.5 space-y-2 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-gray-800">
                            {b.description || 'برداشت بانکی'} — {b.school_name || schools.find((s) => s.id === b.school_id)?.name || 'مدرسه نامشخص'}
                          </span>
                          <span className="font-black text-rose-700 font-mono">{formatRial(b.amount)} ریال</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          تاریخ: {jalaliFromGregorian(b.date)} | حساب: {b.bank_account || '—'} | کارت: {b.source_card_number || b.card_number || 'ثبت نشده'}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => openRecordExpense(b)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>ثبت مستقیم هزینه تن‌خواه</span>
                          </button>
                        </div>

                        {candidates.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-gray-100">
                            <span className="text-[11px] font-bold text-gray-700">هزینه‌های پیشنهادی نزدیک:</span>
                            {candidates.map((t) => (
                              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-purple-50/60 border border-purple-100 p-2.5 text-xs">
                                <span>{t.expense_category_name || t.description || t.comment || 'هزینه تن‌خواه'} — {jalaliFromGregorian(t.date)} — <b className="font-mono">{formatRial(t.amount)} ریال</b></span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm('این برداشت بانکی با هزینه تن‌خواه تطبیق داده شود؟')) {
                                      reconcilePettyCashPair(b.id, t.id);
                                    }
                                  }}
                                  className="rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 shadow-xs"
                                >
                                  تأیید تطبیق
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Petty Cash Expenses Recorded in Books */}
            <section className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-600 font-semibold">
                <span className="font-bold">
                  هزینه‌های ثبت‌شده با کارت تن‌خواه در دفاتر ({pettyCashTxs.length} سند):
                </span>
                {selectedSchoolId !== 0 && (
                  <button
                    onClick={() => setSelectedSchoolId(0)}
                    className="text-purple-700 font-bold hover:underline"
                  >
                    نمایش همه مدارس
                  </button>
                )}
              </div>

              {pettyCashTxs.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
                  هیچ هزینه‌ای با کارت تن‌خواه برای این فیلتر ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pettyCashTxs.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs space-y-2 hover:border-purple-300 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#341648]">
                              {t.expense_category_name || t.description}
                            </span>
                            <span className="text-xs text-gray-500">({t.school_name})</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                              کارت تن‌خواه
                            </span>
                            {t.is_bank_fee && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                کارمزد بانک
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                            <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                            <span>شماره پیگیری: <span className="font-mono">{t.tracking_code || '—'}</span></span>
                            {t.comment && <span>توضیحات: {t.comment}</span>}
                          </div>
                        </div>

                        <div className="text-base sm:text-lg font-black font-mono text-rose-700 self-end sm:self-center">
                          {formatRial(t.amount)} ریال
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                        <span className={`font-bold ${t.reconciled ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {t.reconciled ? '✓ با صورتحساب کارت تن‌خواه تطبیق شد' : 'در انتظار دریافت صورتحساب کارت'}
                        </span>
                        {isSenior && !t.reconciled && (
                          <button
                            type="button"
                            onClick={() => manualReviewTransaction(t.id, true)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 shadow-xs"
                          >
                            تأیید تطبیق دستی
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: Official Bank Reconciliation Statement & Discrepancy Balance */}
        {activeTab === 'statement' && (
          <div className="space-y-6">

            {/* Reconciliation Statement Header Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-black text-lg text-[#341648]">صورت مغایرت بانکی رسمی (Bank Reconciliation Statement)</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    بررسی تطابق مانده پایان دوره دفاتر با مانده صورتحساب بانک و فهرست اقلام باز
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={exportReconciliationToExcel}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>خروجی Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>چاپ گزارش</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                reconciliationStatement.isBalanced
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center gap-3">
                  {reconciliationStatement.isBalanced ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-extrabold text-sm">
                      {reconciliationStatement.isBalanced
                        ? 'حساب‌ها کاملاً تراز هستند (مغایرت صفر است)'
                        : `مغایرت محاسبه‌شده: ${formatRial(reconciliationStatement.discrepancy)} ریال`}
                    </div>
                    <div className="text-xs mt-0.5">
                      {reconciliationStatement.isBalanced
                        ? 'تمام اقلام باز دفاتر و صورتحساب بانک به درستی شناسایی و کنترل شده‌اند.'
                        : 'برای تراز شدن حساب‌ها، اقلام باز بانکی و دفتری زیر را بررسی و ثبت یا تطبیق فرمایید.'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    reconciliationStatement.isBalanced ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {reconciliationStatement.isBalanced ? 'تراز شده' : 'نیازمند اقدام'}
                  </span>
                </div>
              </div>

              {/* Two-Column Official Reconciliation Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">

                {/* Column 1: Book Balance Reconciliation */}
                <div className="rounded-2xl border border-purple-200 bg-[#fdfcff] p-4 space-y-3">
                  <div className="font-extrabold text-sm text-[#341648] pb-2 border-b border-purple-100 flex items-center justify-between">
                    <span>۱. بخش تطبیق دفاتر مدرسه</span>
                    <span className="text-xs text-purple-700 font-bold">گردش نرم‌افزار</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-700">مانده طبق دفاتر مدرسه:</span>
                      <span className="font-mono font-bold text-gray-900">{formatRial(reconciliationStatement.bookBalance)} ریال</span>
                    </div>

                    <div className="space-y-1 py-1">
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>+ اضافه می‌شود: واریزی‌های بانکی ثبت‌نشده در دفاتر:</span>
                        <span className="font-mono">{formatRial(reconciliationStatement.totalBankUnmatchedDeposits)} ریال</span>
                      </div>
                      <div className="text-[11px] text-gray-500 pr-2">
                        {reconciliationStatement.bankUnmatchedDeposits.length} واریز مستقیم یا پوز که هنوز سند دفتری برایشان ثبت نشده
                      </div>
                    </div>

                    <div className="space-y-1 py-1">
                      <div className="flex justify-between text-rose-700 font-bold">
                        <span>- کسر می‌شود: برداشت‌ها و کارمزدهای ثبت‌نشده در دفاتر:</span>
                        <span className="font-mono">{formatRial(reconciliationStatement.totalBankUnmatchedWithdrawals)} ریال</span>
                      </div>
                      <div className="text-[11px] text-gray-500 pr-2">
                        {reconciliationStatement.bankUnmatchedWithdrawals.length} برداشت یا کارمزد بانکی که در دفاتر ثبت نشده
                      </div>
                    </div>

                    <div className="flex justify-between py-2 border-t-2 border-purple-200 bg-purple-50/50 p-2 rounded-xl font-black text-sm text-[#341648]">
                      <span>مانده تعدیل‌شده دفاتر:</span>
                      <span className="font-mono">{formatRial(reconciliationStatement.adjustedBookBalance)} ریال</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Bank Statement Reconciliation */}
                <div className="rounded-2xl border border-indigo-200 bg-[#fcfdff] p-4 space-y-3">
                  <div className="font-extrabold text-sm text-indigo-950 pb-2 border-b border-indigo-100 flex items-center justify-between">
                    <span>۲. بخش تطبیق صورتحساب بانک</span>
                    <span className="text-xs text-indigo-700 font-bold">گردش بانک</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-700">مانده طبق صورتحساب بانک:</span>
                      <span className="font-mono font-bold text-gray-900">{formatRial(reconciliationStatement.bankCalculatedBalance)} ریال</span>
                    </div>

                    <div className="space-y-1 py-1">
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>+ اضافه می‌شود: سپرده‌های در راه دفاتر:</span>
                        <span className="font-mono">{formatRial(reconciliationStatement.totalBookUnmatchedDeposits)} ریال</span>
                      </div>
                      <div className="text-[11px] text-gray-500 pr-2">
                        {reconciliationStatement.bookUnmatchedDeposits.length} دریافت شهریه ثبت‌شده در دفاتر که در صورتحساب نیست
                      </div>
                    </div>

                    <div className="space-y-1 py-1">
                      <div className="flex justify-between text-rose-700 font-bold">
                        <span>- کسر می‌شود: چک‌های معوق یا پرداخت‌های در راه:</span>
                        <span className="font-mono">{formatRial(reconciliationStatement.totalBookUnmatchedWithdrawals)} ریال</span>
                      </div>
                      <div className="text-[11px] text-gray-500 pr-2">
                        {reconciliationStatement.bookUnmatchedWithdrawals.length} پرداخت/هزینه ثبت‌شده در دفاتر که هنوز از بانک برداشت نشده
                      </div>
                    </div>

                    <div className="flex justify-between py-2 border-t-2 border-indigo-200 bg-indigo-50/50 p-2 rounded-xl font-black text-sm text-indigo-950">
                      <span>مانده تعدیل‌شده بانک:</span>
                      <span className="font-mono">{formatRial(reconciliationStatement.adjustedBankBalance)} ریال</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Discrepancy Breakdown List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Outstanding bank deposits */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <span>اقلام باز واریزی بانک ({reconciliationStatement.bankUnmatchedDeposits.length})</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {formatRial(reconciliationStatement.totalBankUnmatchedDeposits)} ریال
                  </span>
                </div>
                {reconciliationStatement.bankUnmatchedDeposits.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">هیچ واریزی بلاتکلیفی در بانک وجود ندارد.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {reconciliationStatement.bankUnmatchedDeposits.slice(0, 50).map((b) => (
                      <div key={b.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs flex justify-between items-center">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-800 truncate">{b.description || 'واریز بانکی'}</div>
                          <div className="text-[11px] text-gray-500">{jalaliFromGregorian(b.date)} · پیگیری: {b.tracking_code || '—'}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-emerald-800">{formatRial(b.amount)}</div>
                          <button
                            type="button"
                            onClick={() => {
                              setInstantRegisterRow(b);
                              setInstantType('tuition');
                              setInstantDesc(b.description || '');
                              setInstantStudentId(b.assigned_student_id || '');
                              setInstantStudentSearch('');
                            }}
                            className="text-[10px] text-purple-700 font-bold hover:underline"
                          >
                            ثبت در دفاتر
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outstanding bank withdrawals */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <span>اقلام باز برداشت/کارمزد بانک ({reconciliationStatement.bankUnmatchedWithdrawals.length})</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-700">
                    {formatRial(reconciliationStatement.totalBankUnmatchedWithdrawals)} ریال
                  </span>
                </div>
                {reconciliationStatement.bankUnmatchedWithdrawals.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">هیچ برداشت بلاتکلیفی در بانک وجود ندارد.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {reconciliationStatement.bankUnmatchedWithdrawals.slice(0, 50).map((b) => (
                      <div key={b.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs flex justify-between items-center">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-800 truncate">{b.description || 'برداشت بانکی'}</div>
                          <div className="text-[11px] text-gray-500">{jalaliFromGregorian(b.date)} · {b.assigned_purpose || 'کارمزد/برداشت'}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-rose-700">{formatRial(b.amount)}</div>
                          <button
                            type="button"
                            onClick={() => openRecordExpense(b)}
                            className="text-[10px] text-rose-700 font-bold hover:underline"
                          >
                            ثبت به عنوان هزینه
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: DEDICATED RECORD EXPENSE MODAL */}
      {expenseModalRow && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base text-rose-950 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-rose-700" />
                  <span>ثبت هزینه بانکی در دفاتر</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  مبلغ: <b className="font-mono text-rose-800">{formatRial(expenseModalRow.amount)} ریال</b> · تاریخ: {jalaliFromGregorian(expenseModalRow.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpenseModalRow(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target row details banner */}
            <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">شرح در صورتحساب بانک:</span>
                <span className="font-bold text-gray-900">{expenseModalRow.description || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">شماره پیگیری:</span>
                <span className="font-mono text-gray-900">{expenseModalRow.tracking_code || expenseModalRow.reference_number || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">حساب / کارت:</span>
                <span className="font-mono text-gray-900" dir="ltr">{expenseModalRow.card_number || expenseModalRow.bank_account || '—'}</span>
              </div>
            </div>

            {/* School selection */}
            {isSenior && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">مدرسه مربوطه:</label>
                <select
                  value={expenseSchoolId}
                  onChange={(e) => setExpenseSchoolId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-bold text-gray-800 bg-white"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Expense Category selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">سرفصل هزینه:</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-bold text-gray-800 bg-white"
              >
                {categories.filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Payment Source */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">منبع پرداخت:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setExpensePaymentSource('bank')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                    expensePaymentSource === 'bank'
                      ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  حساب جاری بانک
                </button>
                <button
                  type="button"
                  onClick={() => setExpensePaymentSource('petty_cash')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                    expensePaymentSource === 'petty_cash'
                      ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  کارت تن‌خواه
                </button>
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">شرح و توضیحات هزینه:</label>
              <textarea
                value={expenseComment}
                onChange={(e) => setExpenseComment(e.target.value)}
                rows={2}
                placeholder="توضیحاتی در مورد بابت این هزینه..."
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:outline-none focus:border-rose-600"
              />
            </div>

            {expenseError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 p-2.5 text-xs">
                {expenseError}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSaveExpense}
                className="flex-1 py-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-md transition-all"
              >
                ثبت قطعی هزینه و تطبیق سند
              </button>
              <button
                type="button"
                onClick={() => setExpenseModalRow(null)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Interactive Manual Link / Match with Ledger */}
      {manualMatchBankRow && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base text-[#341648]">تطبیق دستی ردیف بانکی با اسناد دفاتر</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ردیف بانکی را با سند مالی ثبت‌شده در نرم‌افزار پیوند داده و تطبیق دهید.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualMatchBankRow(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Bank Row Info Card */}
            <div className="rounded-2xl bg-purple-50/70 border border-purple-200 p-3.5 space-y-2">
              <div className="text-xs font-bold text-purple-950 flex items-center justify-between">
                <span>تراکنش بانکی انتخاب‌شده:</span>
                <span className="font-mono text-sm font-black text-purple-900">{formatRial(manualMatchBankRow.amount)} ریال</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div>تاریخ: <b>{jalaliFromGregorian(manualMatchBankRow.date)}</b></div>
                <div>نوع: <b>{manualMatchBankRow.direction === 'deposit' ? 'واریزی' : 'برداشت'}</b></div>
                <div>پیگیری: <span className="font-mono">{manualMatchBankRow.tracking_code || manualMatchBankRow.reference_number || '—'}</span></div>
                <div>کارت: <span className="font-mono" dir="ltr">{manualMatchBankRow.card_number || '—'}</span></div>
              </div>
              <div className="text-xs text-gray-600 pt-1 border-t border-purple-100">
                شرح: {manualMatchBankRow.description || '—'}
              </div>
            </div>

            {/* Search Input for Candidates */}
            <div>
              <input
                type="text"
                value={manualMatchSearch}
                onChange={(e) => setManualMatchSearch(e.target.value)}
                placeholder="جستجو بر اساس نام دانش‌آموز، کد پیگیری یا شرح سند..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:border-purple-600"
              />
            </div>

            {/* Candidate Matches List */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {manualMatchCandidates.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">
                  هیچ سند ثبت‌شده‌ای یافت نشد. می‌توانید این ردیف را به عنوان سند جدید ثبت کنید.
                </div>
              ) : (
                manualMatchCandidates.map(({ transaction: t, score, matchReason }) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl border border-gray-200 hover:border-purple-300 bg-white hover:bg-purple-50/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">
                          {t.student_name ? `شهریه ${t.student_name}` : t.expense_category_name || t.description}
                        </span>
                        {score >= 70 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                            پیشنهاد برتر ({score}٪)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-x-3">
                        <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                        <span>پیگیری: <span className="font-mono">{t.tracking_code || '—'}</span></span>
                        <span>مدرسه: {t.school_name}</span>
                      </div>
                      {matchReason && (
                        <div className="text-[10px] text-purple-700 font-bold mt-1">
                          دلایل انطباق: {matchReason}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <span className="font-mono font-bold text-xs sm:text-sm text-gray-900">
                        {formatRial(t.amount)} ریال
                      </span>
                      <button
                        type="button"
                        onClick={() => handleManualPair(manualMatchBankRow, t)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>تأیید و پیوند</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const b = manualMatchBankRow;
                  setManualMatchBankRow(null);
                  if (b.direction === 'withdrawal') {
                    openRecordExpense(b);
                  } else {
                    setInstantRegisterRow(b);
                    setInstantType('tuition');
                    setInstantDesc(b.description || '');
                    setInstantStudentId(b.assigned_student_id || '');
                    setInstantStudentSearch('');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs transition-all"
              >
                ثبت به عنوان سند جدید در دفاتر
              </button>
              <button
                type="button"
                onClick={() => setManualMatchBankRow(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Instant Register Bank Row in Books with Searchable Student Picker */}
      {instantRegisterRow && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base text-[#341648]">ثبت مستقیم تراکنش بانکی در دفاتر</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  مبلغ {formatRial(instantRegisterRow.amount)} ریال · {jalaliFromGregorian(instantRegisterRow.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInstantRegisterRow(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setInstantType('tuition')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  instantType === 'tuition'
                    ? 'bg-[#62205f] text-white border-[#62205f]'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                شهریه دانش‌آموز
              </button>
              <button
                type="button"
                onClick={() => setInstantType('bank_fee')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  instantType === 'bank_fee'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                کارمزد بانک
              </button>
              <button
                type="button"
                onClick={() => setInstantType('expense')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  instantType === 'expense'
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                سایر هزینه‌ها
              </button>
              <button
                type="button"
                onClick={() => setInstantType('misc_income')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  instantType === 'misc_income'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                درآمد متفرقه
              </button>
            </div>

            {/* SEARCHABLE STUDENT PICKER FOR TUITION */}
            {instantType === 'tuition' && (
              <div className="space-y-2 rounded-2xl bg-purple-50/50 p-3.5 border border-purple-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[#341648] flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-purple-700" />
                    <span>جستجو و انتخاب دانش‌آموز:</span>
                  </label>
                  {selectedInstantStudentObj && (
                    <button
                      type="button"
                      onClick={() => {
                        setInstantStudentId('');
                        setInstantStudentSearch('');
                      }}
                      className="text-[11px] font-bold text-purple-700 hover:underline"
                    >
                      تغییر انتخاب
                    </button>
                  )}
                </div>

                {selectedInstantStudentObj ? (
                  <div className="p-3 rounded-2xl bg-white border-2 border-purple-300 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-[#341648] flex items-center gap-2">
                          <span>{selectedInstantStudentObj.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                            {selectedInstantStudentObj.grade || 'پایه ثبت نشده'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                          <span>مدرسه: {selectedInstantStudentObj.school_name}</span>
                          {selectedInstantStudentObj.national_id && <span>کدملی: <span className="font-mono">{selectedInstantStudentObj.national_id}</span></span>}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setInstantStudentId('');
                        setInstantStudentSearch('');
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      title="تغییر دانش‌آموز"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={instantStudentSearch}
                        onChange={(e) => setInstantStudentSearch(e.target.value)}
                        placeholder="نام، نام خانوادگی، کدملی، پایه یا تلفن را تایپ کنید..."
                        className="w-full pl-8 pr-9 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:border-purple-600 bg-white"
                        autoFocus
                      />
                      {instantStudentSearch && (
                        <button
                          type="button"
                          onClick={() => setInstantStudentSearch('')}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Search Student Results */}
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-xs">
                      {filteredStudentsForInstant.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                          دانش‌آموزی با مشخصات واردشده پیدا نشد.
                        </div>
                      ) : (
                        filteredStudentsForInstant.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              setInstantStudentId(st.id);
                              setInstantSchoolId(st.school_id);
                              setInstantStudentSearch('');
                            }}
                            className="w-full text-right p-2.5 hover:bg-purple-50 transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                <span>{st.name}</span>
                                <span className="text-[10px] text-gray-500 font-normal">({st.grade || '—'})</span>
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                                {st.school_name} {st.national_id ? `· کدملی: ${st.national_id}` : ''}
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-purple-700 shrink-0 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-600 hover:text-white transition-all">
                              انتخاب
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(instantType === 'expense' || instantType === 'bank_fee') && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">سرفصل هزینه:</label>
                <select
                  value={instantCategoryId}
                  onChange={(e) => setInstantCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-bold text-gray-800 bg-white"
                >
                  {categories.filter((c) => c.active).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {isSenior && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">مدرسه:</label>
                <select
                  value={instantSchoolId}
                  onChange={(e) => setInstantSchoolId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs font-bold text-gray-800 bg-white"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">شرح و بابت سند:</label>
              <textarea
                value={instantDesc}
                onChange={(e) => setInstantDesc(e.target.value)}
                rows={2}
                placeholder="توضیحات مربوط به این تراکنش..."
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>

            {instantError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 p-2.5 text-xs">
                {instantError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleInstantRegister}
                className="flex-1 py-3 rounded-xl bg-[#62205f] hover:bg-[#4a1848] text-white font-bold text-xs shadow-md transition-all"
              >
                ثبت سند و تطبیق خودکار
              </button>
              <button
                type="button"
                onClick={() => setInstantRegisterRow(null)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2.5: DEDICATED SEARCHABLE STUDENT ASSIGNMENT MODAL */}
      {assignStudentBankRow && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base text-[#341648] flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-700" />
                  <span>جستجو و تخصیص دانش‌آموز به ردیف بانکی</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  مبلغ {formatRial(assignStudentBankRow.amount)} ریال · {jalaliFromGregorian(assignStudentBankRow.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignStudentBankRow(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target row summary */}
            <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200 p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">شرح در صورتحساب:</span>
                <span className="font-bold text-gray-800">{assignStudentBankRow.description || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">کد پیگیری:</span>
                <span className="font-mono text-gray-800">{assignStudentBankRow.tracking_code || assignStudentBankRow.reference_number || '—'}</span>
              </div>
            </div>

            {/* School Filter Selector inside Assign Modal */}
            {isSenior && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">فیلتر بر اساس مدرسه:</label>
                <select
                  value={assignStudentSchoolFilter}
                  onChange={(e) => setAssignStudentSchoolFilter(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 p-2 text-xs font-bold text-gray-800 bg-gray-50"
                >
                  <option value={0}>همه مدارس ({schools.length})</option>
                  {schools.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Selected Student Card or Search Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">
                  انتخاب دانش‌آموز ({filteredStudentsForAssign.length} از {availableStudentsForAssign.length}):
                </label>
                {assignStudentSelected && (
                  <button
                    type="button"
                    onClick={() => {
                      setAssignStudentSelected(null);
                      setAssignStudentSearch('');
                    }}
                    className="text-[11px] font-bold text-indigo-700 hover:underline"
                  >
                    تغییر انتخاب
                  </button>
                )}
              </div>

              {assignStudentSelected ? (
                <div className="p-3.5 rounded-2xl bg-white border-2 border-indigo-300 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-indigo-950 flex items-center gap-2">
                        <span>{assignStudentSelected.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
                          {assignStudentSelected.grade || 'پایه ثبت نشده'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                        <span>مدرسه: {assignStudentSelected.school_name}</span>
                        {assignStudentSelected.national_id && <span>کدملی: <span className="font-mono">{assignStudentSelected.national_id}</span></span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignStudentSelected(null);
                      setAssignStudentSearch('');
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    title="حذف و جستجوی مجدد"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={assignStudentSearch}
                      onChange={(e) => setAssignStudentSearch(e.target.value)}
                      placeholder="نام، کدملی، پایه یا تلفن دانش‌آموز را جستجو کنید..."
                      className="w-full pl-8 pr-9 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:border-indigo-600 bg-gray-50 focus:bg-white"
                      autoFocus
                    />
                    {assignStudentSearch && (
                      <button
                        type="button"
                        onClick={() => setAssignStudentSearch('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-xs">
                    {filteredStudentsForAssign.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        دانش‌آموزی با این مشخصات یافت نشد. می‌توانید فیلتر مدرسه را تغییر دهید.
                      </div>
                    ) : (
                      filteredStudentsForAssign.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setAssignStudentSelected(st);
                            setAssignStudentPurpose(`شهریه ${st.name}`);
                            setAssignStudentSearch('');
                          }}
                          className="w-full text-right p-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                              <span>{st.name}</span>
                              <span className="text-[10px] text-gray-500 font-normal">({st.grade || '—'})</span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                              {st.school_name} {st.national_id ? `· کدملی: ${st.national_id}` : ''}
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-indigo-700 shrink-0 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all">
                            انتخاب
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Purpose input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">بابت / توضیحات:</label>
              <input
                type="text"
                value={assignStudentPurpose}
                onChange={(e) => setAssignStudentPurpose(e.target.value)}
                placeholder="مثلاً: شهریه قسط اول / پیش‌ثبت‌نام"
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* Option to also create ledger transaction */}
            {!assignStudentBankRow.reconciled && (
              <label className="flex items-center gap-2 p-3 rounded-xl bg-purple-50/60 border border-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignStudentCreateLedger}
                  onChange={(e) => setAssignStudentCreateLedger(e.target.checked)}
                  className="w-4 h-4 text-purple-700 rounded-md focus:ring-purple-600"
                />
                <span className="text-xs font-bold text-[#341648]">
                  هم‌زمان سند دریافت شهریه در دفاتر مالی نیز ثبت و تطبیق شود
                </span>
              </label>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSaveStudentAssignment}
                className="flex-1 py-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-md transition-all"
              >
                تأیید و ذخیره مشخصات
              </button>
              <button
                type="button"
                onClick={() => setAssignStudentBankRow(null)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Petty Cash Mandatory Registration (preserved from original) */}
      {registrationRow && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-lg text-[#341648]">
                  {registrationKind === 'expense' ? 'ثبت اجباری هزینه کارت تن‌خواه' : 'ثبت اجباری واریزی کارت تن‌خواه'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">مبلغ {formatRial(registrationRow.amount)} ریال · {jalaliFromGregorian(registrationRow.date)}</p>
              </div>
              {!registrationRequiredRows.some((row) => row.id === registrationRow.id) && (
                <button type="button" onClick={() => setRegistrationRow(null)} aria-label="بستن"><X className="w-5 h-5" /></button>
              )}
            </div>

            <div className="rounded-xl bg-gray-50 p-3 text-sm space-y-1">
              <div><b>شرح فایل بانک:</b> {registrationRow.description || '—'}</div>
              <div><b>کارت:</b> <span className="font-mono">{normalizeCardNumber(registrationKind === 'expense' ? (registrationRow.source_card_number || registrationRow.card_number) : (registrationRow.destination_card_number || registrationRow.card_number)) || 'نامشخص'}</span></div>
              <div><b>شماره پیگیری:</b> {registrationRow.tracking_code || registrationRow.reference_number || 'در فایل موجود نیست'}</div>
            </div>

            {isSenior && (
              <label className="block text-xs font-bold">مدرسه
                <select value={registrationSchool} onChange={(e) => setRegistrationSchool(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-3 text-sm">
                  {schools.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            )}

            <label className="block text-xs font-bold">شماره پیگیری / رسید
              <input value={registrationTracking} onChange={(e) => setRegistrationTracking(e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm" required />
            </label>

            <label className="block text-xs font-bold">حسابی که باید در ریزگردش آن ثبت شود
              <input value={registrationAccount} onChange={(e) => setRegistrationAccount(e.target.value)} placeholder="مثلاً حساب تن‌خواه / حساب مدرسه" className="mt-1 w-full rounded-xl border p-3 text-sm" required />
            </label>

            {registrationKind === 'expense' && (
              <label className="block text-xs font-bold">سرفصل هزینه
                <select value={registrationCategory} onChange={(e) => setRegistrationCategory(e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm">
                  {categories.filter((cat) => cat.active).map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </label>
            )}

            <label className="block text-xs font-bold">شرح / بابت
              <textarea value={registrationComment} onChange={(e) => setRegistrationComment(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border p-3 text-sm" required />
            </label>

            {registrationError && <div className="rounded-xl bg-rose-50 text-rose-800 p-3 text-sm">{registrationError}</div>}

            <div className="flex gap-2">
              <button type="button" onClick={saveRegistration} className="flex-1 rounded-xl bg-[#62205f] text-white font-bold p-3">ثبت در دفتر حساب</button>
              {!registrationRequiredRows.some((row) => row.id === registrationRow.id) && (
                <button type="button" onClick={() => setRegistrationRow(null)} className="rounded-xl border px-4 py-3">انصراف</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Senior Rules Management Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base text-[#341648]">تنظیم قواعد نگاشت کارت‌ها، پایانه‌ها و استثنائات</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  این قواعد در برگه Settings گوگل‌شیتس ذخیره شده و روی تمام کاربران اعمال می‌شود.
                </p>
              </div>
              <button type="button" onClick={() => setShowRulesModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const card = window.prompt('شماره ۱۶ رقمی کارت تن‌خواه:');
                    if (!card || card.length < 16) return;
                    const managerName = (window.prompt('نام صاحب کارت:') || '').trim();
                    if (!managerName) return;
                    try {
                      const parsed = JSON.parse(bankRulesJson);
                      parsed.pettyCashCards = [...(parsed.pettyCashCards || []), { card, managerName, active: true }];
                      setBankRulesJson(JSON.stringify(parsed, null, 2));
                    } catch {}
                  }}
                  className="px-3 py-1.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl font-bold"
                >
                  + افزودن نگاشت کارت تن‌خواه
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const terminal = window.prompt('کد پایانه پوز:');
                    if (!terminal) return;
                    const scId = Number(window.prompt('شناسه مدرسه:') || '0');
                    if (!scId) return;
                    try {
                      const parsed = JSON.parse(bankRulesJson);
                      parsed.posTerminals = [...(parsed.posTerminals || []), { terminal, schoolId: scId }];
                      setBankRulesJson(JSON.stringify(parsed, null, 2));
                    } catch {}
                  }}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl font-bold"
                >
                  + افزودن پایانه پوز مدرسه
                </button>
              </div>

              <textarea
                value={bankRulesJson}
                onChange={(e) => setBankRulesJson(e.target.value)}
                rows={12}
                dir="ltr"
                className="w-full font-mono text-xs p-3 rounded-2xl border border-gray-300 bg-gray-50 focus:bg-white"
              />

              {bankRulesNotice && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs">
                  {bankRulesNotice}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const parsed = JSON.parse(bankRulesJson);
                    const res = await postToAppsScript({ action: 'bank_rules_save', rules: parsed });
                    if (res?.success) {
                      setBankRules(parsed);
                      setBankRulesNotice('قواعد با موفقیت ذخیره شد.');
                    } else {
                      setBankRulesNotice('خطا در ذخیره: ' + (res?.error || 'ارتباط برقرار نشد'));
                    }
                  } catch (e) {
                    setBankRulesNotice('خطای فرمت JSON: ' + String(e));
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#62205f] text-white font-bold text-xs"
              >
                اعتبارسنجی و ذخیره قواعد در گوگل‌شیتس
              </button>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
