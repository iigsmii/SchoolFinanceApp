import React, { useEffect, useState, useMemo, useDeferredValue } from 'react';
import SchoolSelect from '../SchoolSelect';
import { useBackClose } from '../../hooks/useBackClose';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian, todayGregorian, todayJalali, jalaliToIso } from '../../utils/jalali';
import { matchesStudentSearch, matchTokens } from '../../utils/studentSearch';
import { PersianSearchInput } from '../PersianSearchInput';
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
  ChevronUp,
  Eye,
  PlusCircle,
  Layers,
  Printer,
  GraduationCap,
  Banknote,
  FileText,
  Tag,
  Calendar,
  CalendarDays,
  CheckCheck,
  Clock,
  ArrowRightLeft,
  ShieldCheck,
  Zap,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { postToAppsScript } from '../../services/googleSheets';
import { BankAccount, BankTransaction, Transaction, Student } from '../../types';
import {
  autoMatchBankRows,
  buildAccountReport,
  buildTerminalRegistry,
  classifyStream,
  normalizeCard,
  normalizeTerminal,
  ownerOfRow,
  rowBelongsToAccount,
} from '../../utils/bankReconcile';
import { parseBankExcel, type BankExcelKind } from '../../utils/bankExcel';
import { BankTodoPanel } from '../bank/BankTodoPanel';
import { openAttachment } from '../../services/attachments';
import { isUncollectedChequeTx } from '../../utils/cheques';
import { setNavHint } from '../../utils/alerts';

// POS terminals must be explicitly registered by the senior manager.
// Never pre-assign terminals to schools: school IDs/order can differ between deployments.
export const DEFAULT_POS_TERMINALS: Array<{ terminal: string; schoolId: number; schoolName: string }> = [];

// Remove the obsolete hard-coded mappings shipped by older builds. These were
// sample assumptions, not verified terminal registrations.
const LEGACY_DEFAULT_POS_TERMINALS = new Set([
  '1:21435312',
  '2:91370748',
  '3:21435311',
  '4:21435313',
  '5:99213505',
  '6:91370739',
  '7:91370741',
]);
const removeLegacyDefaultTerminals = (items: any[]) =>
  items.filter((item) => !LEGACY_DEFAULT_POS_TERMINALS.has(
    `${Number(item.schoolId || 0)}:${normalizeDigits(String(item.terminal || '')).replace(/\D/g, '').replace(/^0+/, '')}`
  ));
const normalizeDigits = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
       .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

// Petty-cash cards must also be registered explicitly (shared list in Google Sheets). The old built-in sample list
// assigned cards to school 1 and wrongly tagged bank rows, so nothing is pre-filled any more.
export const DEFAULT_SADERAT_CARDS: Array<{ card: string; managerName: string; managerId?: string | number; schoolId: number; accountSuffix: string; bankAccountId: number; active: boolean }> = [];

export const BankAccountPage: React.FC<{ account: BankAccount; onBack: () => void }> = ({ account, onBack }) => {
  const {
    transactions,
    cheques,
    students,
    bankTransactions,
    bankAccounts,
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
    addExpense,
    addPettyCashIncome,
    addTuitionPayment,
    categories,
    setCurrentScreen,
    refreshBankData,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  // Pull the bank lists on open so they never need a manual full sync.
  useEffect(() => {
    if (isSenior) void refreshBankData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSenior]);

  // Navigation Tabs: Unmatched (Inbox) | Daily Feed (روز به روز) | Bank Fees | Matched | Statement | Settings
  const [activeTab, setActiveTab] = useState<'todo' | 'unmatched' | 'daily' | 'fees' | 'matched' | 'statement' | 'terminals_cards'>('todo');

  // Filter States
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 0
  );
  // The page always works on exactly one bank account (chosen on the account list).
  const selectedBankAccount: BankAccount | null = account;
  const selectedBankAccountId = account.id;
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [streamFilter, setStreamFilter] = useState<'all' | 'pos' | 'petty' | 'fees' | 'other'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unmatched' | 'matched'>('all');

  // Daily Accordion Collapse state (dates mapped to boolean true = expanded)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Notices & Alerts
  const [bannerNotice, setBannerNotice] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Pagination for heavy lists
  const [visibleCount, setVisibleCount] = useState(60);

  // Resolution Modal State (Unified for Student Tuition / Expense / Manual Match)
  const [resolveRow, setResolveRow] = useState<BankTransaction | null>(null);
  useBackClose(!!resolveRow, () => setResolveRow(null));
  const [resolveMode, setResolveMode] = useState<'tuition' | 'expense' | 'link'>('tuition');
  const [resolveSchoolId, setResolveSchoolId] = useState<number>(0);
  const [resolveStudentSearch, setResolveStudentSearch] = useState('');
  const [resolveSelectedStudent, setResolveSelectedStudent] = useState<Student | null>(null);
  const [resolveCategoryId, setResolveCategoryId] = useState<string>(categories[0]?.id || '1');
  const [resolveComment, setResolveComment] = useState('');
  const [resolvePaymentSource, setResolvePaymentSource] = useState<'bank' | 'petty_cash'>('bank');
  const [resolveModalError, setResolveModalError] = useState('');
  const [resolveErrorTargetTxId, setResolveErrorTargetTxId] = useState<number | null>(null);

  // Rules state
  const [posTerminals, setPosTerminals] = useState(DEFAULT_POS_TERMINALS);
  const [pettyCashCards, setPettyCashCards] = useState(DEFAULT_SADERAT_CARDS);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Google Sheets is the shared source of truth; local storage is an offline fallback.
  useEffect(() => {
    let cancelled = false;
    try {
      const savedTerminals = localStorage.getItem('school_finance_pos_terminals');
      if (savedTerminals) setPosTerminals(removeLegacyDefaultTerminals(JSON.parse(savedTerminals)));
      const savedCards = localStorage.getItem('school_finance_petty_cards');
      if (savedCards) setPettyCashCards(JSON.parse(savedCards));
    } catch { /* use defaults if local cache is invalid */ }
    if (isSenior) {
      void postToAppsScript({ action: 'bank_rules_get' }).then((res) => {
        if (cancelled || !res?.success || !res.rules) return;
        const rules = res.rules;
        const localTerminals = (() => { try { const v = localStorage.getItem('school_finance_pos_terminals'); return v ? removeLegacyDefaultTerminals(JSON.parse(v)) : null; } catch { return null; } })();
        const localCards = (() => { try { const v = localStorage.getItem('school_finance_petty_cards'); return v ? JSON.parse(v) : null; } catch { return null; } })();
        const serverTerminals = Array.isArray(rules.posTerminals) ? rules.posTerminals.map((p: any) => ({
          ...p,
          terminal: String(p.terminal || ''),
          schoolId: Number(p.schoolId || 0),
          schoolName: p.schoolName || schools.find((sc) => sc.id === Number(p.schoolId || 0))?.name || ''
        })) : null;
        const cleanedServerTerminals = serverTerminals ? removeLegacyDefaultTerminals(serverTerminals) : null;
        const serverCards = Array.isArray(rules.pettyCashCards) ? rules.pettyCashCards.map((c: any) => ({
          ...c,
          card: String(c.card || ''),
          managerName: String(c.managerName || ''),
          accountSuffix: String(c.accountSuffix || ''),
          bankAccountId: Number(c.bankAccountId || 0),
          schoolId: Number(c.schoolId || 0),
          active: c.active !== false
        })) : null;
        if (res.configured === false) {
          // First-time migration: preserve explicitly saved device configuration; never invent POS assignments.
          const initialTerminals = localTerminals || [];
          const initialCards = localCards || DEFAULT_SADERAT_CARDS;
          void postToAppsScript({ action: 'bank_rules_save', rules: { version: 1, posTerminals: initialTerminals, pettyCashCards: initialCards } }).then((saved) => {
            if (cancelled || !saved?.success) return;
            const migratedTerminals = Array.isArray(saved.rules?.posTerminals) ? saved.rules.posTerminals.map((p: any) => ({ ...p, schoolName: p.schoolName || schools.find((sc) => sc.id === Number(p.schoolId || 0))?.name || '' })) : initialTerminals;
            const migratedCards = Array.isArray(saved.rules?.pettyCashCards) ? saved.rules.pettyCashCards : initialCards;
            setPosTerminals(migratedTerminals);
            setPettyCashCards(migratedCards);
            localStorage.setItem('school_finance_pos_terminals', JSON.stringify(migratedTerminals));
            localStorage.setItem('school_finance_petty_cards', JSON.stringify(migratedCards));
            setBannerNotice({ text: 'فهرست پایانه‌ها و کارت‌های تن‌خواه در Google Sheets ثبت شد و بین دستگاه‌ها همگام می‌شود.', type: 'success' });
          }).catch(() => {});
        } else if (cleanedServerTerminals && serverCards) {
          setPosTerminals(cleanedServerTerminals);
          setPettyCashCards(serverCards);
          localStorage.setItem('school_finance_pos_terminals', JSON.stringify(cleanedServerTerminals));
          localStorage.setItem('school_finance_petty_cards', JSON.stringify(serverCards));
          // Persist removal of the obsolete built-in sample assignments to the shared source.
          if (cleanedServerTerminals.length !== serverTerminals.length) {
            void postToAppsScript({ action: 'bank_rules_save', rules: { version: 1, posTerminals: cleanedServerTerminals, pettyCashCards: serverCards } }).catch(() => {});
          }
        }
      }).catch(() => { /* retain local offline cache */ });
    }
    return () => { cancelled = true; };
  }, [isSenior, schools]);

  const saveTerminalsAndCards = (newTerminals: typeof posTerminals, newCards: typeof pettyCashCards) => {
    setPosTerminals(newTerminals);
    setPettyCashCards(newCards);
    localStorage.setItem('school_finance_pos_terminals', JSON.stringify(newTerminals));
    localStorage.setItem('school_finance_petty_cards', JSON.stringify(newCards));
    setBannerNotice({ text: 'در حال ذخیره و همگام‌سازی با Google Sheets…', type: 'info' });
    void postToAppsScript({
      action: 'bank_rules_save',
      rules: {
        version: 1,
        posTerminals: newTerminals.map((p) => ({ terminal: normalizeTerminal(p.terminal), schoolId: Number(p.schoolId || 0), schoolName: p.schoolName || schools.find((sc) => sc.id === Number(p.schoolId || 0))?.name || '' })),
        pettyCashCards: newCards.map((c) => ({ card: normalizeCard(c.card), managerName: c.managerName, accountSuffix: String(c.accountSuffix || ''), bankAccountId: Number(c.bankAccountId || 0), schoolId: Number(c.schoolId || 0), active: c.active !== false })),
      }
    }).then((res) => {
      if (res?.success) {
        const savedTerminals = Array.isArray(res.rules?.posTerminals) ? res.rules.posTerminals.map((p: any) => ({ ...p, schoolName: p.schoolName || schools.find((sc) => sc.id === Number(p.schoolId || 0))?.name || '' })) : newTerminals;
        const savedCards = Array.isArray(res.rules?.pettyCashCards) ? res.rules.pettyCashCards : newCards;
        setPosTerminals(savedTerminals);
        setPettyCashCards(savedCards);
        localStorage.setItem('school_finance_pos_terminals', JSON.stringify(savedTerminals));
        localStorage.setItem('school_finance_petty_cards', JSON.stringify(savedCards));
        setBannerNotice({ text: 'پایانه‌ها و کارت‌های تن‌خواه در Google Sheets ذخیره و همگام شد.', type: 'success' });
      } else {
        setBannerNotice({ text: 'تغییرات فقط روی این دستگاه ذخیره شد؛ همگام‌سازی ناموفق بود: ' + (res?.error || 'خطای سرور'), type: 'error' });
      }
    }).catch(() => setBannerNotice({ text: 'تغییرات فقط روی این دستگاه ذخیره شد؛ اتصال به Google Sheets برقرار نشد.', type: 'error' }));
  };

  // Group multiple bank cards under the same manager while retaining each card as an individual match key.
  const groupedPettyCashCards = useMemo(() => {
    const groups = new Map<string, { managerName: string; cards: typeof pettyCashCards }>();
    pettyCashCards.forEach((card) => {
      const managerName = String(card.managerName || 'مدیر بدون نام').trim() || 'مدیر بدون نام';
      if (!groups.has(managerName)) groups.set(managerName, { managerName, cards: [] });
      groups.get(managerName)!.cards.push(card);
    });
    return Array.from(groups.values());
  }, [pettyCashCards]);

  // Terminal list for the settings tab: rules + the POS number typed on each school's record.
  // One terminal may be shared by several schools (morning/evening shifts), so schools are merged per terminal.
  const effectivePosTerminals = useMemo(() => {
    const byTerminal = new Map<string, { terminal: string; schoolIds: number[] }>();
    const add = (terminal: unknown, schoolId: number) => {
      const t = normalizeTerminal(terminal);
      if (!t) return;
      const cur = byTerminal.get(t) || { terminal: t, schoolIds: [] };
      if (schoolId && !cur.schoolIds.includes(schoolId)) cur.schoolIds.push(schoolId);
      byTerminal.set(t, cur);
    };
    posTerminals.forEach((p) => add(p.terminal, Number(p.schoolId || 0)));
    schools.forEach((school) => {
      String(school.pos_terminal_number || '')
        .split(/[,،;؛\n\s]+/)
        .forEach((value) => add(value, Number(school.id)));
    });
    return Array.from(byTerminal.values()).map((x) => ({
      terminal: x.terminal,
      schoolId: x.schoolIds[0] || 0,
      schoolIds: x.schoolIds,
      schoolName: x.schoolIds.map((id) => schools.find((sc) => sc.id === id)?.name).filter(Boolean).join(' / '),
    }));
  }, [posTerminals, schools]);

  // Terminals the user explicitly registered (school record, rules). Nothing is guessed; a terminal may belong to several schools.
  const terminalRegistry = useMemo(
    () => buildTerminalRegistry(posTerminals, schools),
    [posTerminals, schools],
  );

  // Stream of a bank row: pos / petty / fees / other
  const getTransactionStream = (row: BankTransaction) => classifyStream(row, terminalRegistry, pettyCashCards, selectedBankAccount);

  // Stream and responsible school/manager for every bank row. A row without a registered terminal or card
  // stays unassigned (school 0) — there is no default school.
  const enrichedBankRows = useMemo(() => {
    return bankTransactions.map((row) => {
      const owner = ownerOfRow(row, terminalRegistry, pettyCashCards, selectedBankAccount);
      return {
        ...row,
        stream: classifyStream(row, terminalRegistry, pettyCashCards, selectedBankAccount),
        matchedSchoolId: owner.schoolId,
        matchedSchoolName: owner.schoolId ? (schools.find((s) => s.id === owner.schoolId)?.name || '') : '',
        matchedManagerName: owner.managerName,
      };
    });
  }, [bankTransactions, terminalRegistry, pettyCashCards, schools, selectedBankAccount]);

  // Role-based visibility filter
  const visibleBankRows = useMemo(() => {
    return enrichedBankRows.filter((b) => {
      // School role constraint: non-seniors only see their own school's records or their own cards
      if (!isSenior && currentUser?.school_id) {
        const userCard = normalizeCard(currentUser.petty_cash_card);
        const rowCard = normalizeCard(b.source_card_number || b.card_number || b.destination_card_number);
        const matchesSchool = b.matchedSchoolId === currentUser.school_id;
        const matchesCard = Boolean(userCard && rowCard && userCard === rowCard);
        if (!matchesSchool && !matchesCard) return false;
      }

      // Bank-account scope: each account has an independent reconciliation view.
      if (!rowBelongsToAccount(b, selectedBankAccount)) return false;

      // School filter dropdown
      if (selectedSchoolId !== 0 && b.matchedSchoolId !== selectedSchoolId) return false;

      // Stream filter
      if (streamFilter !== 'all' && b.stream !== streamFilter) return false;

      // Status filter
      if (statusFilter === 'matched' && !b.reconciled) return false;
      if (statusFilter === 'unmatched' && b.reconciled) return false;

      // Date quick filter
      if (dateFilter !== 'all') {
        const jDate = jalaliFromGregorian(b.date);
        const todayJ = todayJalali();
        if (dateFilter === 'today' && jDate !== todayJ) return false;
        // Approximation for yesterday, week, month
        if (dateFilter === 'yesterday') {
          // compare gregorian date difference
          const diffDays = (new Date().getTime() - new Date(b.date).getTime()) / (1000 * 3600 * 24);
          if (diffDays < 0.8 || diffDays > 2.2) return false;
        }
        if (dateFilter === 'week') {
          const diffDays = (new Date().getTime() - new Date(b.date).getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7.5 || diffDays < -0.5) return false;
        }
        if (dateFilter === 'month') {
          const curMonth = todayJ.split('/')[1];
          if (jDate.split('/')[1] !== curMonth) return false;
        }
      }

      // Search query (supports Persian/English digits, names, tracking, cards, terminals)
      if (deferredSearchQuery.trim()) {
        const combined = [
          b.tracking_code,
          b.reference_number,
          b.description,
          b.terminal_number,
          b.card_number,
          b.source_card_number,
          b.assigned_student_name,
          b.amount,
        ]
          .filter(Boolean)
          .join(' ');

        if (!matchTokens(combined, deferredSearchQuery)) return false;
      }

      return true;
    });
  }, [enrichedBankRows, isSenior, currentUser, selectedSchoolId, selectedBankAccount, streamFilter, statusFilter, dateFilter, deferredSearchQuery]);

  // Subsets
  const unmatchedRows = useMemo(() => visibleBankRows.filter((r) => !r.reconciled), [visibleBankRows]);
  const matchedRows = useMemo(() => visibleBankRows.filter((r) => r.reconciled), [visibleBankRows]);
  const feeRows = useMemo(() => visibleBankRows.filter((r) => r.stream === 'fees'), [visibleBankRows]);

  // Day-by-Day (روز به روز) Grouping
  const dailyGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        jalaliDate: string;
        gregorianDate: string;
        rows: typeof visibleBankRows;
        totalDeposit: number;
        totalWithdrawal: number;
        matchedCount: number;
        unmatchedCount: number;
      }
    > = {};

    visibleBankRows.forEach((row) => {
      const jDate = jalaliFromGregorian(row.date);
      if (!groups[jDate]) {
        groups[jDate] = {
          jalaliDate: jDate,
          gregorianDate: row.date,
          rows: [],
          totalDeposit: 0,
          totalWithdrawal: 0,
          matchedCount: 0,
          unmatchedCount: 0,
        };
      }
      groups[jDate].rows.push(row);
      const amt = Number(row.amount || 0);
      if (row.direction === 'deposit' || row.direction === 'pos_sale') {
        groups[jDate].totalDeposit += amt;
      } else if (row.direction === 'withdrawal') {
        groups[jDate].totalWithdrawal += amt;
      }
      if (row.reconciled) groups[jDate].matchedCount++;
      else groups[jDate].unmatchedCount++;
    });

    // Sort descending by gregorian date
    return Object.values(groups).sort((a, b) => b.gregorianDate.localeCompare(a.gregorianDate));
  }, [visibleBankRows]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalFees = 0;
    let unmatchedCount = 0;
    let matchedCount = 0;

    visibleBankRows.forEach((r) => {
      const amt = Number(r.amount || 0);
      if (r.direction === 'deposit' || r.direction === 'pos_sale') totalIn += amt;
      else if (r.direction === 'withdrawal') totalOut += amt;
      if (r.stream === 'fees') totalFees += Number(r.fee_amount || amt);
      if (r.reconciled) matchedCount++;
      else unmatchedCount++;
    });

    return {
      totalCount: visibleBankRows.length,
      unmatchedCount,
      matchedCount,
      totalIn,
      totalOut,
      totalFees,
    };
  }, [visibleBankRows]);

  // Toggle Day Accordion
  const toggleDateAccordion = (jDate: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [jDate]: prev[jDate] === undefined ? false : !prev[jDate],
    }));
  };

  // Expand all / Collapse all days
  const expandAllDays = () => {
    const next: Record<string, boolean> = {};
    dailyGroups.forEach((g) => { next[g.jalaliDate] = true; });
    setExpandedDates(next);
  };

  const collapseAllDays = () => {
    const next: Record<string, boolean> = {};
    dailyGroups.forEach((g) => { next[g.jalaliDate] = false; });
    setExpandedDates(next);
  };

  // AUTOMATIC BANK FEE INGESTION DIRECTLY INTO EXPENSES
  // Automatically detects all fee transactions and creates an Expense record under "کارمزد بانک" (Category 10)
  const autoRegisterAllBankFees = () => {
    const feeCategory = categories.find((c) => c.id === '10' || c.name.includes('کارمزد'))?.id || '10';
    const unregisteredFees = bankTransactions.filter((b) => {
      if (!rowBelongsToAccount(b, selectedBankAccount)) return false;
      const stream = getTransactionStream(b);
      if (stream !== 'fees') return false;
      // Not already matched with an expense
      if (b.matched_transaction_id && transactions.some((t) => t.id === b.matched_transaction_id)) return false;
      return true;
    });

    if (!unregisteredFees.length) {
      setBannerNotice({
        text: 'تمامی کارمزدهای بانکی از پیش در بخش هزینه‌ها ثبت و تطبیق داده شده‌اند.',
        type: 'info',
      });
      return;
    }

    let registeredCount = 0;
    let registeredTotal = 0;
    let skippedNoSchool = 0;

    unregisteredFees.forEach((b) => {
      try {
        const amt = Number(b.fee_amount || b.amount || 0);
        // The school of a fee comes from the account's own school; never from a default.
        const schoolId = ownerOfRow(b, terminalRegistry, pettyCashCards, selectedBankAccount).schoolId || Number(selectedBankAccount?.school_id || 0);
        if (!schoolId) { skippedNoSchool++; return; }
        const newExpense = addExpense({
          category_id: feeCategory,
          amount: amt,
          date: b.date,
          tracking_code: b.tracking_code || b.reference_number || 'کارمزد بانکی',
          payment_source: 'bank',
          comment: `کارمزد و خدمات بانکی خودکار - ${b.description || 'بانک صادرات'}`,
          school_id: schoolId,
          bank_transaction_id: b.id,
        });

        updateBankTransaction(b.id, {
          reconciled: true,
          matched_transaction_id: newExpense.id,
          assigned_purpose: 'کارمزد بانک (ثبت خودکار در هزینه‌ها)',
          school_id: schoolId,
        });

        registeredCount++;
        registeredTotal += amt;
      } catch (err) {
        console.warn('Error auto-registering fee:', err);
      }
    });

    setBannerNotice({
      text: `تعداد ${registeredCount} ردیف کارمزد بانکی به مجموع ${formatRial(registeredTotal)} ریال به صورت خودکار در بخش هزینه‌ها ثبت شد و تطبیق یافت.${skippedNoSchool ? ` (${skippedNoSchool} ردیف چون مدرسه‌اش معلوم نبود ثبت نشد)` : ''}`,
      type: 'success',
    });
  };

  // AUTOMATIC MATCHING of this account's bank rows with the registered transactions.
  // Rules live in utils/bankReconcile.ts: same code + amount, registered petty card, or registered POS terminal;
  // an ambiguous row is never matched.
  const runAutoMatch = (): number => {
    const accountRows = bankTransactions.filter((b) => rowBelongsToAccount(b, selectedBankAccount));
    const matches = autoMatchBankRows(accountRows, transactions, cheques, {
      registry: terminalRegistry,
      cards: pettyCashCards,
      account: selectedBankAccount,
    });
    matches.forEach((m) => {
      const hit = transactions.find((t) => t.id === m.txId);
      const row = accountRows.find((b) => b.id === m.bankId);
      updateBankTransaction(m.bankId, {
        reconciled: true,
        matched_transaction_id: m.txId,
        assigned_student_id: hit?.student_id,
        assigned_student_name: hit?.student_name,
        assigned_purpose: hit?.description || hit?.expense_category_name || 'تطبیق خودکار',
        school_id: m.schoolId || row?.school_id || 0,
      });
      updateTransaction(m.txId, { reconciled: true, bank_transaction_id: m.bankId });
    });
    return matches.length;
  };

  const handleSmartReconcile = () => {
    const count = runAutoMatch();
    setBannerNotice({
      text: count > 0
        ? `تطبیق خودکار انجام شد: ${count} تراکنش بانکی با اسناد ثبت‌شده تطبیق یافت.`
        : 'مورد جدیدی برای تطبیق خودکار پیدا نشد. ردیف‌های باقی‌مانده در «اقدام لازم» هستند.',
      type: count > 0 ? 'success' : 'info',
    });
  };

  // OPEN UNIFIED RESOLVE MODAL
  const openResolveModal = (row: BankTransaction) => {
    setResolveRow(row);
    setResolveModalError('');
    setResolveErrorTargetTxId(null);
    setResolveSelectedStudent(null);
    setResolveStudentSearch('');

    const stream = getTransactionStream(row);
    // Only a registered terminal / petty card decides the school. Otherwise the user must choose it.
    const scId = ownerOfRow(row, terminalRegistry, pettyCashCards, selectedBankAccount).schoolId || Number(row.assigned_student_id ? row.school_id : 0) || 0;
    setResolveSchoolId(scId);

    // Pick initial mode: deposit or POS -> tuition, withdrawal -> expense
    if (row.direction === 'deposit' || row.direction === 'pos_sale') {
      setResolveMode('tuition');
    } else {
      setResolveMode('expense');
    }

    setResolveComment(row.description || (row.direction === 'deposit' ? 'واریزی بانکی' : 'هزینه بانکی'));
    setResolvePaymentSource(stream === 'petty' ? 'petty_cash' : 'bank');

    // Auto select bank fee category if stream is fees
    if (stream === 'fees') {
      const feeCat = categories.find((c) => c.id === '10' || c.name.includes('کارمزد'));
      if (feeCat) setResolveCategoryId(feeCat.id);
    } else {
      setResolveCategoryId(categories[0]?.id || '1');
    }
  };

  // SUBMIT UNIFIED RESOLVE ACTION
  const handleResolveSubmit = () => {
    if (!resolveRow) return;
    setResolveModalError('');

    try {
      const amt = Number(resolveRow.amount || 0);
      const date = resolveRow.date;
      const tracking = resolveRow.tracking_code || resolveRow.reference_number || 'بانکی';
      const comment = resolveComment.trim() || resolveRow.description || 'تراکنش بانکی ثبت‌شده';
      if (resolveMode === 'expense' && !resolveSchoolId) {
        setResolveModalError('مدرسه‌ی این هزینه را انتخاب کنید.');
        return;
      }

      if (resolveMode === 'tuition') {
        if (!resolveSelectedStudent) {
          setResolveModalError('لطفاً دانش‌آموز مربوط به این واریزی را انتخاب کنید.');
          return;
        }

        addTuitionPayment({
          student_id: resolveSelectedStudent.id,
          amount: amt,
          date,
          description: comment,
          payment_method: resolveRow.direction === 'pos_sale' ? 'کارت خوان' : 'کارت به کارت',
          tracking_code: tracking,
          school_id: resolveSchoolId || resolveSelectedStudent.school_id,
        });

        updateBankTransaction(resolveRow.id, {
          reconciled: true,
          assigned_student_id: resolveSelectedStudent.id,
          assigned_student_name: resolveSelectedStudent.name,
          assigned_purpose: `شهریه دانش‌آموز: ${resolveSelectedStudent.name}`,
          school_id: resolveSchoolId || resolveSelectedStudent.school_id,
          school_name: schools.find((s) => s.id === (resolveSchoolId || resolveSelectedStudent.school_id))?.name,
        });

        setBannerNotice({
          text: `شهریه به مبلغ ${formatRial(amt)} ریال برای «${resolveSelectedStudent.name}» در دفاتر ثبت شد و با ردیف بانک تطبیق یافت.`,
          type: 'success',
        });
      } else if (resolveMode === 'expense') {
        const catObj = categories.find((c) => c.id === resolveCategoryId);
        const card = normalizeCard(resolveRow.source_card_number || resolveRow.card_number);

        const newExpense = addExpense({
          category_id: resolveCategoryId,
          amount: amt,
          date,
          tracking_code: tracking,
          payment_source: resolvePaymentSource,
          comment,
          school_id: resolveSchoolId,
          petty_cash_card: card || undefined,
          bank_transaction_id: resolveRow.id,
        });

        updateBankTransaction(resolveRow.id, {
          reconciled: true,
          matched_transaction_id: newExpense.id,
          assigned_purpose: catObj?.name || comment,
          school_id: resolveSchoolId,
          school_name: schools.find((s) => s.id === resolveSchoolId)?.name,
        });

        setBannerNotice({
          text: `هزینه «${catObj?.name || 'مدرسه'}» به مبلغ ${formatRial(amt)} ریال در دفاتر ثبت شد و با ردیف بانک تطبیق یافت.`,
          type: 'success',
        });
      }

      setResolveRow(null);
    } catch (err) {
      setResolveModalError('خطا در ثبت: ' + String(err));
    }
  };

  // MANUAL LINK RESOLUTION (Link existing book tx to this bank row)
  const handleLinkExistingTx = (tx: Transaction) => {
    if (!resolveRow) return;
    if (resolveSchoolId && Number(tx.school_id) !== Number(resolveSchoolId)) {
      setResolveErrorTargetTxId(tx.id);
      setResolveModalError('تراکنش بانکی و تراکنش نرم‌افزار باید متعلق به یک مدرسه باشند. برای بررسی سند مرتبط، روی این خطا بزنید.');
      return;
    }
    setResolveErrorTargetTxId(null);
    updateBankTransaction(resolveRow.id, {
      reconciled: true,
      matched_transaction_id: tx.id,
      assigned_student_id: tx.student_id,
      assigned_student_name: tx.student_name,
      assigned_purpose: tx.student_name ? `شهریه ${tx.student_name}` : tx.expense_category_name || tx.description || 'ثبت دفتری',
      school_id: tx.school_id,
      school_name: tx.school_name,
    });
    updateTransaction(tx.id, {
      reconciled: true,
      bank_transaction_id: resolveRow.id,
    });
    setResolveRow(null);
    setBannerNotice({
      text: 'پیوند دستی با سند دفتری با موفقیت ثبت شد.',
      type: 'success',
    });
  };

  // UNLINK / DETACH
  const handleUnlink = (b: BankTransaction) => {
    if (!confirm('آیا از لغو تطبیق این ردیف با دفاتر اطمینان دارید؟')) return;
    if (b.matched_transaction_id) {
      updateTransaction(b.matched_transaction_id, {
        reconciled: false,
        bank_transaction_id: undefined,
      });
    }
    updateBankTransaction(b.id, {
      reconciled: false,
      matched_transaction_id: undefined,
      assigned_student_id: undefined,
      assigned_student_name: undefined,
      assigned_purpose: undefined,
    });
    setBannerNotice({ text: 'تطبیق ردیف لغو شد و به صف در انتظار اقدام بازگشت.', type: 'info' });
  };

  // EXCEL IMPORT — the POS file and the account statement are two different files, imported separately.
  const [importBusy, setImportBusy] = useState<BankExcelKind | null>(null);
  const [pendingAutoMatch, setPendingAutoMatch] = useState(false);

  const importFile = (kind: BankExcelKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setImportBusy(kind);
    const reader = new FileReader();
    reader.onerror = () => { setImportBusy(null); setBannerNotice({ text: 'خواندن فایل ناموفق بود.', type: 'error' }); };
    reader.onload = (evt) => {
      try {
        const parsed = parseBankExcel(evt.target?.result as ArrayBuffer, kind, account);
        const keyOf = (b: { date: string; amount: number; tracking_code?: string; reference_number?: string; terminal_number?: string; direction?: string; source_card_number?: string }) =>
          [b.date, b.amount, b.tracking_code || b.reference_number || '', normalizeTerminal(b.terminal_number), b.direction || '', normalizeCard(b.source_card_number)].join('|');
        const existing = new Set(bankTransactions.filter((b) => rowBelongsToAccount(b, account)).map(keyOf));
        const fresh = parsed.rows.filter((r) => !existing.has(keyOf(r)));
        const duplicates = parsed.rows.length - fresh.length;
        const label = kind === 'pos' ? 'پوز' : 'صورتحساب';
        if (!fresh.length) {
          setBannerNotice({ text: `از فایل ${label} ردیف جدیدی نبود${duplicates ? ` (${duplicates} ردیف قبلاً وارد شده بود)` : ''}.`, type: 'info' });
          return;
        }
        const count = importBankTransactions(fresh);
        setBannerNotice({
          text: `${count} ردیف جدید از اکسل ${label} وارد شد${duplicates ? ` و ${duplicates} ردیف تکراری نادیده گرفته شد` : ''}${parsed.skippedNoAmount ? `؛ ${parsed.skippedNoAmount} ردیف بدون مبلغ/تاریخ رد شد` : ''}. تطبیق خودکار در حال اجراست و مدیران مربوط به‌زودی خبردار می‌شوند.`,
          type: 'success',
        });
        setActiveTab('todo');
        setPendingAutoMatch(true);
      } catch (err) {
        setBannerNotice({ text: 'خطا در خواندن فایل اکسل: ' + (err instanceof Error ? err.message : String(err)), type: 'error' });
      } finally {
        setImportBusy(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Run the automatic matching once the freshly imported rows are in state.
  useEffect(() => {
    if (!pendingAutoMatch) return;
    setPendingAutoMatch(false);
    const count = runAutoMatch();
    if (count > 0) setBannerNotice((prev) => ({ text: `${prev?.text || ''} ${count} ردیف خودکار تطبیق خورد.`.trim(), type: 'success' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoMatch, bankTransactions]);

  // EXPORT 4-PART RECONCILIATION STATEMENT TO EXCEL
  const exportStatementToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sum calculations
    let bookDebits = 0;
    let bookCredits = 0;
    transactions.forEach((t) => {
      if (selectedSchoolId !== 0 && t.school_id !== selectedSchoolId) return;
      if (t.kind === 'شهریه' || t.kind === 'دریافت متفرقه') bookDebits += Number(t.amount || 0);
      else if (t.kind === 'هزینه') bookCredits += Number(t.amount || 0);
    });
    const bookBalance = bookDebits - bookCredits;

    let bankIn = 0;
    let bankOut = 0;
    let bankUnmatchedIn = 0;
    let bankUnmatchedOut = 0;
    visibleBankRows.forEach((b) => {
      const amt = Number(b.amount || 0);
      if (b.direction === 'deposit' || b.direction === 'pos_sale') {
        bankIn += amt;
        if (!b.reconciled) bankUnmatchedIn += amt;
      } else {
        bankOut += amt;
        if (!b.reconciled) bankUnmatchedOut += amt;
      }
    });
    const bankBalance = bankIn - bankOut;

    const data = [
      ['صورت مغایرت بانکی مدرسة القرآن', 'تاریخ گزارش:', todayJalali()],
      ['واحد / مدرسه:', selectedSchoolId === 0 ? 'کلیه مدارس و مراکز' : schools.find((s) => s.id === selectedSchoolId)?.name || ''],
      [],
      ['ردیف', 'شرح حسابداری', 'مبلغ (ریال)'],
      ['۱', 'مانده طبق دفاتر حسابداری', bookBalance],
      ['۲', '(+) اقلام باز بستانکار صورتحساب بانک (واریزی‌های ثبت‌نشده در دفاتر)', bankUnmatchedIn],
      ['۳', '(-) اقلام باز بدهکار صورتحساب بانک (برداشت‌ها و کارمزدهای ثبت‌نشده)', bankUnmatchedOut],
      ['۴', 'مانده تعدیل‌شده دفاتر', bookBalance + bankUnmatchedIn - bankUnmatchedOut],
      [],
      ['۵', 'مانده طبق صورتحساب بانک', bankBalance],
      ['۶', 'تراز و اختلاف نهایی', Math.abs((bookBalance + bankUnmatchedIn - bankUnmatchedOut) - bankBalance)],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'صورت مغایرت');
    XLSX.writeFile(wb, `صورت_مغایرت_بانکی_${todayJalali().replace(/\//g, '-')}.xlsx`);
  };

  // Filtered candidate students for resolution modal
  const candidateStudents = useMemo(() => {
    if (!resolveRow) return [];
    const pool = students.filter((s) => s.active && (!resolveSchoolId || s.school_id === resolveSchoolId));
    if (!resolveStudentSearch.trim()) return pool.slice(0, 15);
    return pool.filter((s) => matchesStudentSearch(s, resolveStudentSearch)).slice(0, 15);
  }, [students, resolveRow, resolveSchoolId, resolveStudentSearch]);

  // Candidate book transactions for manual link
  const candidateBookTxs = useMemo(() => {
    if (!resolveRow) return [];
    return transactions.filter((t) => {
      if (t.reconciled) return false;
      // چک تا وقتی مدیر ارشد «وصول» را تأیید نکرده با بانک تطبیق داده نمی‌شود.
      if (isUncollectedChequeTx(t, cheques)) return false;
      if (resolveSchoolId && t.school_id !== resolveSchoolId) return false;
      // Proximity or amount
      if (Number(t.amount) === Number(resolveRow.amount)) return true;
      return false;
    }).slice(0, 10);
  }, [transactions, cheques, resolveRow, resolveSchoolId]);

  // Same-amount records from another school are shown as blocked, not silently hidden.
  const crossSchoolCandidateTxs = useMemo(() => {
    if (!resolveRow || !resolveSchoolId) return [];
    return transactions.filter((t) => {
      if (t.reconciled || Number(t.school_id) === Number(resolveSchoolId)) return false;
      if (isUncollectedChequeTx(t, cheques)) return false;
      return Number(t.amount) === Number(resolveRow.amount);
    }).slice(0, 10);
  }, [transactions, cheques, resolveRow, resolveSchoolId]);

  const openRelatedBookTransaction = (transactionId: number) => {
    setNavHint('transactions', `transaction:${transactionId}`);
    setCurrentScreen('transactions');
    setResolveRow(null);
  };

  // "Action needed" report: bank rows nobody registered yet, grouped by the responsible manager / school.
  const accountReport = useMemo(
    () => buildAccountReport(
      enrichedBankRows.filter((r) => rowBelongsToAccount(r, selectedBankAccount)),
      { registry: terminalRegistry, cards: pettyCashCards, account: selectedBankAccount, schools },
    ),
    [enrichedBankRows, terminalRegistry, pettyCashCards, selectedBankAccount, schools],
  );

  const [todoBusy, setTodoBusy] = useState(false);

  const notifyManagers = async () => {
    setTodoBusy(true);
    try {
      const res = await postToAppsScript({ action: 'bank_notify' });
      if (!res?.success) throw new Error(res?.error || 'خطای سرور');
      const extra = [
        res.no_manager ? `${res.no_manager} ردیف مدیر مشخصی نداشت (کارت یا مدرسه‌اش مدیر ندارد)` : '',
        res.unassigned ? `${res.unassigned} ردیف هنوز مدرسه ندارد؛ ابتدا پایانه‌اش را ثبت کنید` : '',
      ].filter(Boolean).join('؛ ');
      setBannerNotice({
        text: res.messages
          ? `برای ${res.rows} ردیف ثبت‌نشده، ${res.messages} پیام به مدیران مربوط ارسال شد.${extra ? ' ' + extra + '.' : ''}`
          : `پیام تازه‌ای لازم نبود؛ مدیران قبلاً خبردار شده‌اند.${extra ? ' ' + extra + '.' : ''}`,
        type: res.messages ? 'success' : 'info',
      });
    } catch (err) {
      setBannerNotice({ text: 'ارسال اطلاع‌رسانی ناموفق بود: ' + (err instanceof Error ? err.message : String(err)), type: 'error' });
    } finally {
      setTodoBusy(false);
    }
  };

  // Registers a terminal for one or more schools (a terminal can be shared by several shifts/schools).
  const registerTerminalForSchool = (terminal: string, schoolIds: number[]) => {
    const t = normalizeTerminal(terminal);
    const ids = Array.from(new Set(schoolIds.filter(Boolean)));
    if (!t || !ids.length) return;
    saveTerminalsAndCards(
      [
        ...posTerminals.filter((p) => normalizeTerminal(p.terminal) !== t),
        ...ids.map((id) => ({ terminal: t, schoolId: id, schoolName: schools.find((sc) => sc.id === id)?.name || '' })),
      ],
      pettyCashCards,
    );
  };

  // Removes school tags that no registered terminal/card justifies (e.g. the old "everything is school 1").
  const cleanWrongTags = async () => {
    setTodoBusy(true);
    try {
      const dry = await postToAppsScript({ action: 'bank_untag', dry_run: true });
      if (!dry?.success) throw new Error(dry?.error || 'خطای سرور');
      if (!dry.cleared) { setBannerNotice({ text: 'برچسب اشتباهی پیدا نشد؛ همه‌ی برچسب‌ها با پایانه/کارت ثبت‌شده می‌خوانند.', type: 'success' }); return; }
      const detail = Object.entries(dry.by_terminal || {}).map(([t, n]) => `پایانه ${t}: ${n}`).join('، ');
      if (!window.confirm(`${dry.cleared} ردیف بانکی برچسب مدرسه‌ای دارند که هیچ پایانه یا کارت ثبت‌شده‌ای آن را تأیید نمی‌کند (${detail}).\nبرچسب این ردیف‌ها برداشته شود؟ خود ردیف‌های بانک حذف نمی‌شوند.`)) return;
      const res = await postToAppsScript({ action: 'bank_untag' });
      if (!res?.success) throw new Error(res?.error || 'خطای سرور');
      await refreshBankData({ force: true });
      setBannerNotice({ text: `برچسب اشتباه ${res.cleared} ردیف برداشته شد.`, type: 'success' });
    } catch (err) {
      setBannerNotice({ text: 'پاک‌سازی ناموفق بود: ' + (err instanceof Error ? err.message : String(err)), type: 'error' });
    } finally {
      setTodoBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfafd] pb-24 text-gray-800">
      <Header title={`تطبیق حساب: ${account.name}`} />

      <main className="max-w-6xl mx-auto px-3 sm:px-5 py-6 space-y-6">

        {/* TOP HERO BANNER & STATS */}
        <section className="bg-gradient-to-l from-[#4e164e] via-[#62205f] to-[#782874] rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 text-xs font-bold transition-all">
                <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                <span>همه‌ی حساب‌های بانکی</span>
              </button>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Landmark className="w-6 h-6 text-amber-300" />
                {account.name}
              </h1>
              <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
                {account.bank_name} · حساب {account.account_number}. اکسل پوز و اکسل صورتحساب را جداگانه وارد کنید؛ تطبیق خودکار انجام می‌شود و باقی‌مانده به مدیر مربوط اطلاع داده می‌شود.
              </p>
            </div>

            {/* Quick Action Buttons Group */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isSenior && (
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#62205f] font-black text-xs shadow-md hover:bg-purple-50 active:scale-95 transition-all ${importBusy ? 'opacity-60 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4 text-purple-700" />
                  <span>{importBusy === 'pos' ? 'در حال خواندن…' : 'ورود اکسل پوز'}</span>
                  <input type="file" accept=".xlsx,.xls" onChange={importFile('pos')} className="hidden" />
                </label>
              )}
              {isSenior && (
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#62205f] font-black text-xs shadow-md hover:bg-purple-50 active:scale-95 transition-all ${importBusy ? 'opacity-60 pointer-events-none' : ''}`}>
                  <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                  <span>{importBusy === 'statement' ? 'در حال خواندن…' : 'ورود اکسل صورتحساب'}</span>
                  <input type="file" accept=".xlsx,.xls" onChange={importFile('statement')} className="hidden" />
                </label>
              )}

              {isSenior && (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm('تمام ردیف‌های واردشده از اکسل بانک و پوز فقط از این دستگاه پاک شوند؟ اسناد حسابداری و اطلاعات Google Sheets حذف نمی‌شوند.')) return;
                    clearImportedBankTransactions();
                    setBannerNotice({ text: 'اطلاعات واردشده از اکسل بانک و پوز از این دستگاه پاک شد. اسناد حسابداری و اطلاعات مشترک دست‌نخورده ماندند.', type: 'success' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-100 hover:bg-rose-200 border border-rose-200 text-rose-800 font-black text-xs shadow-sm active:scale-95 transition-all"
                  title="پاک‌سازی ردیف‌های واردشده از اکسل در همین دستگاه"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>صفر کردن اطلاعات اکسل</span>
                </button>
              )}

              {isSenior && (
                <button
                  type="button"
                  onClick={handleSmartReconcile}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-900/60 hover:bg-purple-900 border border-purple-300/30 text-white font-bold text-xs shadow-sm active:scale-95 transition-all backdrop-blur-md"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>اجرای دوباره‌ی تطبیق خودکار</span>
                </button>
              )}

              {isSenior && (
                <button
                  type="button"
                  onClick={autoRegisterAllBankFees}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs shadow-md active:scale-95 transition-all"
                  title="شناسایی کارمزدهای پایا، ساتنا، آبونمان و ثبت فوری در هزینه‌ها"
                >
                  <Zap className="w-4 h-4" />
                  <span>ثبت خودکار کارمزدها در هزینه‌ها</span>
                </button>
              )}
            </div>
          </div>

          {/* KPI Stat Cards Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10">
            <div
              onClick={() => setActiveTab('unmatched')}
              className={`p-3 rounded-2xl cursor-pointer transition-all ${
                activeTab === 'unmatched' ? 'bg-white/20 ring-2 ring-amber-400' : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span>در انتظار اقدام مدیر</span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg sm:text-2xl font-black mt-1 text-white">
                {stats.unmatchedCount.toLocaleString('fa-IR')} <span className="text-xs font-normal">ردیف</span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('daily')}
              className={`p-3 rounded-2xl cursor-pointer transition-all ${
                activeTab === 'daily' ? 'bg-white/20 ring-2 ring-emerald-400' : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span>واریزی و ورودی پوز</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base sm:text-xl font-black mt-1 text-emerald-300">
                {formatRial(stats.totalIn)} <span className="text-xs font-normal">ریال</span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('daily')}
              className={`p-3 rounded-2xl cursor-pointer transition-all ${
                activeTab === 'daily' ? 'bg-white/20 ring-2 ring-rose-400' : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span>برداشت و تن‌خواه</span>
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-base sm:text-xl font-black mt-1 text-rose-300">
                {formatRial(stats.totalOut)} <span className="text-xs font-normal">ریال</span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('fees')}
              className={`p-3 rounded-2xl cursor-pointer transition-all ${
                activeTab === 'fees' ? 'bg-white/20 ring-2 ring-blue-400' : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span>کارمزدهای بانکی</span>
                <Building className="w-4 h-4 text-blue-300" />
              </div>
              <div className="text-base sm:text-xl font-black mt-1 text-blue-200">
                {formatRial(stats.totalFees)} <span className="text-xs font-normal">ریال</span>
              </div>
            </div>
          </div>
        </section>

        {/* USER NOTICE BANNER */}
        {bannerNotice && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-sm transition-all ${
              bannerNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : bannerNotice.type === 'error'
                ? 'bg-rose-50 text-rose-900 border border-rose-200'
                : 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{bannerNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerNotice(null)}
              className="p-1 rounded-lg hover:bg-black/5 active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* WORKFLOW NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('todo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              activeTab === 'todo'
                ? 'bg-[#62205f] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>اقدام لازم (ثبت‌نشده‌ها)</span>
            {accountReport.unregisteredCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-amber-400 text-amber-950">
                {accountReport.unregisteredCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unmatched')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              activeTab === 'unmatched'
                ? 'bg-[#62205f] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>در انتظار اقدام مدیر</span>
            {stats.unmatchedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-amber-400 text-amber-950">
                {stats.unmatchedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              activeTab === 'daily'
                ? 'bg-[#62205f] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-purple-300" />
            <span>گردش روز به روز صورتحساب</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-purple-100 text-purple-900">
              {dailyGroups.length} روز
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              activeTab === 'fees'
                ? 'bg-[#62205f] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>کارمزدهای بانکی خودکار</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-100 text-amber-900">
              {feeRows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matched')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              activeTab === 'matched'
                ? 'bg-[#62205f] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            <CheckCheck className="w-4 h-4 text-emerald-500" />
            <span>تطبیق‌یافته و ثبت‌شده</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-100 text-emerald-900">
              {stats.matchedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              activeTab === 'statement'
                ? 'bg-[#62205f] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            <Calculator className="w-4 h-4 text-blue-500" />
            <span>صورت مغایرت و تراز</span>
          </button>

          {isSenior && (
            <button
              type="button"
              onClick={() => setActiveTab('terminals_cards')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
                activeTab === 'terminals_cards'
                  ? 'bg-[#62205f] text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
              }`}
            >
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span>پایانه‌ها و کارت‌های تن‌خواه</span>
            </button>
          )}
        </div>

        {/* TOOLBAR: FILTERS, SEARCH, SCHOOL SELECTOR */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <PersianSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="جستجو با کد پیگیری، شماره کارت، مبلغ..."
              className="min-w-[220px] flex-1 max-w-md"
              buttonLabel="جستجو"
            />

            {/* School Selector (for Senior) */}
            {isSenior && (
              <SchoolSelect schools={schools} value={selectedSchoolId} onChange={(value) => setSelectedSchoolId(Number(value))} className="text-xs py-2 px-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 font-bold" includeAll allValue={0} allLabel={`🏢 تمام مدارس و مراکز (همه)`} />
            )}

            {/* Stream Selector */}
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value as any)}
              className="text-xs py-2 px-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="all">دسته تراکنش: همه جریان‌ها</option>
              <option value="pos">🏷️ فقط پایانه‌های پوز مدارس</option>
              <option value="petty">💳 فقط کارت‌های تن‌خواه مدیران</option>
              <option value="fees">🏦 فقط کارمزدهای بانکی</option>
              <option value="other">🔁 واریزی‌ها و سایر انتقال‌ها</option>
            </select>

            {/* Date Quick Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="text-xs py-2 px-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="all">تاریخ: کل دوره</option>
              <option value="today">امروز</option>
              <option value="yesterday">دیروز</option>
              <option value="week">۷ روز اخیر</option>
              <option value="month">ماه جاری</option>
            </select>
          </div>

          {/* Right helper buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportStatementToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>خروجی اکسل مغایرت</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: UNMATCHED INBOX (صندوق در انتظار اقدام مدیر)                       */}
        {/* ========================================================================= */}
        {activeTab === 'todo' && (
          <BankTodoPanel
            report={accountReport}
            schools={schools}
            busy={todoBusy}
            isSenior={isSenior}
            onResolve={openResolveModal}
            onNotify={notifyManagers}
            onRegisterTerminal={registerTerminalForSchool}
            onCleanTags={cleanWrongTags}
          />
        )}

        {activeTab === 'unmatched' && (
          <section className="space-y-4">
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-amber-950 text-sm sm:text-base">
                    صندوق تراکنش‌های در انتظار اقدام مدیر ({unmatchedRows.length} ردیف)
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                    این وقایع در صورتحساب یا گزارش پوز ثبت شده‌اند اما هنوز در دفاتر نرم‌افزار به نام دانش‌آموز یا سرفصل هزینه ثبت نشده‌اند.
                    با کلیک بر روی «تعیین تکلیف»، در چند ثانیه آن را در دفاتر ثبت نمایید.
                  </p>
                </div>
              </div>

              {isSenior && unmatchedRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleSmartReconcile}
                  className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                >
                  تطبیق خودکار مجدد
                </button>
              )}
            </div>

            {unmatchedRows.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCheck className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-gray-800">وضعیت فوق‌العاده! هیچ تراکنش بلاتکلیفی وجود ندارد</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                  تمامی تراکنش‌های بارگذاری‌شده بانکی، مبالغ پوز و تن‌خواه‌ها در دفاتر حسابداری ثبت و متناظر شده‌اند.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {unmatchedRows.slice(0, visibleCount).map((row) => (
                  <div
                    key={row.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200/80 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left Meta & Identification */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Stream Badge */}
                        {row.stream === 'pos' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 text-xs font-bold">
                            <Tag className="w-3.5 h-3.5" />
                            <span>پایانه پوز شهریه</span>
                          </span>
                        )}
                        {row.stream === 'petty' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-100 text-blue-900 text-xs font-bold">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>کارت تن‌خواه مدیر</span>
                          </span>
                        )}
                        {row.stream === 'fees' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 text-rose-900 text-xs font-bold">
                            <Zap className="w-3.5 h-3.5" />
                            <span>کارمزد بانکی</span>
                          </span>
                        )}
                        {row.stream === 'other' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 text-xs font-bold">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>انتقال بانکی</span>
                          </span>
                        )}

                        {/* School Badge */}
                        <span className="px-2.5 py-1 rounded-xl bg-amber-100/70 text-amber-950 text-xs font-bold">
                          {row.matchedSchoolName}
                        </span>

                        {/* Manager Badge if petty cash */}
                        {row.matchedManagerName && (
                          <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs">
                            مدیر تن‌خواه: {row.matchedManagerName}
                          </span>
                        )}
                      </div>

                      {/* Description & Tracking */}
                      <div className="text-xs sm:text-sm text-gray-800 font-semibold leading-relaxed">
                        {row.description || 'تراکنش بانکی'}
                      </div>

                      {/* Technical Details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-mono">
                        <span className="font-sans">📅 {jalaliFromGregorian(row.date)}</span>
                        {row.transaction_time && <span>⏰ {row.transaction_time}</span>}
                        {row.tracking_code && <span>پیگیری: {row.tracking_code}</span>}
                        {row.reference_number && <span>مرجع RRN: {row.reference_number}</span>}
                        {row.terminal_number && <span>پایانه: {row.terminal_number}</span>}
                        {row.card_number && <span>کارت: {row.card_number}</span>}
                      </div>
                    </div>

                    {/* Right Amount & 1-Click Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-base sm:text-lg font-black font-mono ${
                            row.direction === 'withdrawal' ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {row.direction === 'withdrawal' ? '-' : '+'}
                          {formatRial(row.amount)} <span className="text-xs font-sans font-bold">ریال</span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {row.direction === 'withdrawal' ? 'برداشت از حساب' : 'واریز به حساب'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openResolveModal(row)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#62205f] hover:bg-[#782874] text-white font-black text-xs shadow-md active:scale-95 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>تعیین تکلیف و ثبت در دفاتر</span>
                      </button>
                    </div>
                  </div>
                ))}

                {unmatchedRows.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((p) => p + 50)}
                    className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50"
                  >
                    نمایش ۵۰ مورد بیشتر...
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DAILY FEED (روز به روز)                                            */}
        {/* ========================================================================= */}
        {activeTab === 'daily' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-gray-100 shadow-xs">
              <div className="text-xs text-gray-600 font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>نمایش تراکنش‌ها تفکیک‌شده روز به روز (تعداد {dailyGroups.length} روز دارای گردش)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={expandAllDays}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold"
                >
                  باز کردن همه روزها
                </button>
                <button
                  type="button"
                  onClick={collapseAllDays}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                >
                  بستن همه
                </button>
              </div>
            </div>

            {dailyGroups.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 text-gray-500 text-xs">
                هیچ صورتحسابی در این بازه تاریخی یافت نشد.
              </div>
            ) : (
              <div className="space-y-3">
                {dailyGroups.map((group) => {
                  const isExpanded = expandedDates[group.jalaliDate] !== false; // default open
                  return (
                    <div
                      key={group.jalaliDate}
                      className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden transition-all"
                    >
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleDateAccordion(group.jalaliDate)}
                        className="p-4 sm:p-5 bg-gradient-to-l from-gray-50/70 to-white hover:bg-purple-50/30 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 font-black text-xs flex flex-col items-center justify-center font-mono">
                            <span>{group.jalaliDate.split('/')[2]}</span>
                            <span className="text-[9px] font-sans font-normal">{group.jalaliDate.split('/')[1]}</span>
                          </div>
                          <div>
                            <div className="font-black text-sm text-gray-900">
                              تاریخ: {group.jalaliDate}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {group.rows.length} تراکنش بانکی ثبت‌شده
                            </div>
                          </div>
                        </div>

                        {/* Middle totals */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
                          <div className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl">
                            واریز: +{formatRial(group.totalDeposit)}
                          </div>
                          <div className="text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-xl">
                            برداشت: -{formatRial(group.totalWithdrawal)}
                          </div>
                          {group.unmatchedCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-sans font-black">
                              ⚠️ {group.unmatchedCount} ردیف باز
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-sans font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              تطبیق کامل
                            </span>
                          )}

                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Day's Transactions List */}
                      {isExpanded && (
                        <div className="divide-y divide-gray-100">
                          {group.rows.map((row) => (
                            <div
                              key={row.id}
                              className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                                row.reconciled ? 'bg-white hover:bg-gray-50/50' : 'bg-amber-50/30 hover:bg-amber-50/60'
                              }`}
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  {row.reconciled ? (
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-[11px] inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      تطبیق یافته
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-lg bg-amber-200 text-amber-950 font-black text-[11px] inline-flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      در انتظار اقدام
                                    </span>
                                  )}

                                  <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 font-bold text-[11px]">
                                    {row.matchedSchoolName}
                                  </span>

                                  {row.stream === 'pos' && (
                                    <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 font-bold text-[11px]">
                                      پوز: {row.terminal_number}
                                    </span>
                                  )}
                                  {row.stream === 'petty' && (
                                    <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 font-bold text-[11px]">
                                      تن‌خواه: {row.matchedManagerName || row.card_number}
                                    </span>
                                  )}
                                  {row.stream === 'fees' && (
                                    <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 font-bold text-[11px]">
                                      کارمزد بانک
                                    </span>
                                  )}
                                </div>

                                <div className="font-semibold text-gray-900">
                                  {row.description || 'گردش حساب'}
                                </div>

                                <div className="text-gray-400 font-mono text-[11px] flex flex-wrap gap-2">
                                  {row.transaction_time && <span>زمان: {row.transaction_time}</span>}
                                  {row.tracking_code && <span>پیگیری: {row.tracking_code}</span>}
                                  {row.assigned_purpose && (
                                    <span className="font-sans text-purple-700 font-bold">
                                      بابت: {row.assigned_purpose}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                <div className="text-left font-mono">
                                  <div
                                    className={`font-black text-sm ${
                                      row.direction === 'withdrawal' ? 'text-rose-600' : 'text-emerald-600'
                                    }`}
                                  >
                                    {row.direction === 'withdrawal' ? '-' : '+'}
                                    {formatRial(row.amount)} <span className="text-[10px] font-sans font-bold">ریال</span>
                                  </div>
                                </div>

                                {!row.reconciled ? (
                                  <button
                                    type="button"
                                    onClick={() => openResolveModal(row)}
                                    className="px-3 py-1.5 rounded-xl bg-[#62205f] hover:bg-[#782874] text-white font-bold text-[11px] shadow-xs active:scale-95"
                                  >
                                    تعیین تکلیف
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUnlink(row)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="لغو تطبیق"
                                  >
                                    <Unlink className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
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
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BANK FEES (کارمزدهای بانکی خودکار)                                 */}
        {/* ========================================================================= */}
        {activeTab === 'fees' && (
          <section className="space-y-4">
            <div className="bg-gradient-to-l from-blue-900 to-indigo-900 rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>سیستم تشخیص هوشمند کارمزد و خدمات بانکی</span>
                </div>
                <h3 className="text-lg font-black text-white">ثبت مستقیم کارمزدها در سرفصل هزینه‌های بانکی</h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  تراکنش‌های کارمزد پایا، ساتنا، آبونمان حساب و پیامک شاپرک به صورت اتوماتیک تشخیص داده می‌شوند و با یک کلیک مستقیماً به عنوان سند هزینه در سرفصل «کارمزد بانک» ثبت می‌گردند.
                </p>
              </div>

              {isSenior && (
                <button
                  type="button"
                  onClick={autoRegisterAllBankFees}
                  className="shrink-0 px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>ثبت خودکار همه کارمزدها در هزینه‌ها</span>
                </button>
              )}
            </div>

            {feeRows.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 text-gray-500 text-xs">
                هیچ ردیف کارمزد بانکی شناسایی نشد.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
                {feeRows.map((row) => (
                  <div key={row.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {row.reconciled ? (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-[11px] flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            ثبت‌شده در هزینه‌ها
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 font-black text-[11px]">
                            در انتظار ثبت در هزینه
                          </span>
                        )}
                        <span className="text-gray-400 font-mono">📅 {jalaliFromGregorian(row.date)}</span>
                        {row.tracking_code && <span className="text-gray-400 font-mono">پیگیری: {row.tracking_code}</span>}
                      </div>
                      <div className="font-bold text-gray-800">{row.description}</div>
                      {row.assigned_purpose && (
                        <div className="text-purple-700 font-medium">{row.assigned_purpose}</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right font-mono font-black text-sm text-rose-700">
                        {formatRial(row.fee_amount || row.amount)} <span className="text-xs font-sans font-bold">ریال</span>
                      </div>

                      {!row.reconciled ? (
                        <button
                          type="button"
                          onClick={() => openResolveModal(row)}
                          className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
                        >
                          ثبت سند هزینه
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-xs">سند متناظر شد</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MATCHED & RECONCILED (تطبیق‌یافته و متناظر)                        */}
        {/* ========================================================================= */}
        {activeTab === 'matched' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold px-1">
              <span>تعداد {matchedRows.length} تراکنش متناظر با اسناد دفتری</span>
            </div>

            {matchedRows.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 text-gray-500 text-xs">
                هنوز تراکنشی با دفاتر تطبیق نیافته است.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
                {matchedRows.slice(0, visibleCount).map((row) => (
                  <div key={row.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-black text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          متناظر با دفاتر
                        </span>
                        <span className="font-bold text-gray-700">{row.matchedSchoolName}</span>
                        <span className="text-gray-400 font-mono">📅 {jalaliFromGregorian(row.date)}</span>
                      </div>
                      <div className="font-bold text-gray-900">{row.description}</div>
                      {row.assigned_purpose && (
                        <div className="text-purple-700 font-bold">بابت: {row.assigned_purpose}</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 font-mono">
                      <div
                        className={`font-black text-sm ${
                          row.direction === 'withdrawal' ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {row.direction === 'withdrawal' ? '-' : '+'}
                        {formatRial(row.amount)} <span className="text-xs font-sans font-bold">ریال</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUnlink(row)}
                        className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="لغو تطبیق با دفاتر"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {matchedRows.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((p) => p + 50)}
                    className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs"
                  >
                    نمایش ۵۰ مورد بیشتر...
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: STATEMENT & 4-PART BALANCE (صورت مغایرت و تراز)                    */}
        {/* ========================================================================= */}
        {activeTab === 'statement' && (
          <section className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900">صورت مغایرت ۴بخشی رسمی بانکی</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    انطباق دفاتر مالی با گردش صورتحساب بانک صادرات و محاسبه تراز تعدیل‌شده
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportStatementToExcel}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود فایل اکسل صورت مغایرت</span>
                </button>
              </div>

              {/* 4-Part Reconciliation Accounting Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section A: Books Adjustment */}
                <div className="rounded-3xl border border-purple-200 bg-purple-50/40 p-5 space-y-4">
                  <div className="font-extrabold text-[#62205f] text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>بخش اول: تعدیل مانده دفاتر حسابداری</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-gray-700">
                      <span>۱. مانده دوره طبق دفاتر مالی:</span>
                      <span className="font-mono font-black">{formatRial(stats.totalIn - stats.totalOut)} ریال</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700">
                      <span>۲. (+) واریزی‌های باز بانک (ثبت‌نشده در دفاتر):</span>
                      <span className="font-mono font-bold">
                        +{formatRial(unmatchedRows.filter((r) => r.direction === 'deposit' || r.direction === 'pos_sale').reduce((s, r) => s + Number(r.amount || 0), 0))} ریال
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-rose-700">
                      <span>۳. (-) برداشت‌ها و کارمزدهای ثبت‌نشده در دفاتر:</span>
                      <span className="font-mono font-bold">
                        -{formatRial(unmatchedRows.filter((r) => r.direction === 'withdrawal').reduce((s, r) => s + Number(r.amount || 0), 0))} ریال
                      </span>
                    </div>
                    <div className="pt-2 border-t border-purple-200 flex justify-between items-center font-extrabold text-sm text-[#62205f]">
                      <span>مانده تعدیل‌شده دفاتر:</span>
                      <span className="font-mono">{formatRial(stats.totalIn - stats.totalOut)} ریال</span>
                    </div>
                  </div>
                </div>

                {/* Section B: Bank Statement Adjustment */}
                <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
                  <div className="font-extrabold text-blue-900 text-sm flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    <span>بخش دوم: تعدیل مانده صورتحساب بانک</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-gray-700">
                      <span>۴. مانده طبق صورتحساب بانک:</span>
                      <span className="font-mono font-black">{formatRial(stats.totalIn - stats.totalOut)} ریال</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700">
                      <span>۵. (+) سپرده‌های در راه (ثبت دفتری بدون نشست بانکی):</span>
                      <span className="font-mono font-bold">۰ ریال</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-700">
                      <span>۶. (-) چک‌ها و پرداخت‌های معوق:</span>
                      <span className="font-mono font-bold">۰ ریال</span>
                    </div>
                    <div className="pt-2 border-t border-blue-200 flex justify-between items-center font-extrabold text-sm text-blue-950">
                      <span>مانده تعدیل‌شده بانک:</span>
                      <span className="font-mono">{formatRial(stats.totalIn - stats.totalOut)} ریال</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discrepancy Status */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs sm:text-sm font-bold">
                <span className="text-gray-700">وضعیت مغایرت و تراز نهایی دوره:</span>
                {unmatchedRows.length === 0 ? (
                  <span className="text-emerald-700 flex items-center gap-1.5 font-black">
                    <ShieldCheck className="w-4 h-4" />
                    تراز کامل بدون مغایرت (تأیید رسمی)
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center gap-1.5 font-black">
                    <AlertCircle className="w-4 h-4" />
                    تعداد {unmatchedRows.length} ردیف در انتظار اقدام باقی مانده است
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: TERMINALS & PETTY CARDS ROSTER (پایانه‌ها و کارت‌های تن‌خواه)        */}
        {/* ========================================================================= */}
        {activeTab === 'terminals_cards' && isSenior && (
          <section className="space-y-6">
            {/* POS Terminals Grid */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-700" />
                  <h3 className="font-black text-gray-900 text-base">پایانه‌های کارتخوان پوز مدارس ({effectivePosTerminals.length})</h3>
                </div>
                <button type="button" onClick={() => { const v = window.prompt('شماره پایانه پوز جدید:'); if (v === null) return; const terminal = normalizeTerminal(v); if (!terminal) { setBannerNotice({text:'شماره پایانه معتبر نیست.',type:'error'}); return; } if (effectivePosTerminals.some((x) => normalizeTerminal(x.terminal) === terminal)) { setBannerNotice({text:'این شماره پایانه قبلاً ثبت شده است.',type:'error'}); return; } saveTerminalsAndCards([...posTerminals, {terminal, schoolId:0, schoolName:''}], pettyCashCards); }} className="px-3 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold">+ افزودن پایانه</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {effectivePosTerminals.map((pos) => (
                  <div key={pos.terminal} className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                    <div className="flex items-center justify-between"><span className="font-mono font-black text-purple-900 text-sm">{pos.terminal}</span><span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">پوز شاپرک</span></div>
                    <div className="font-bold text-xs text-gray-800">{pos.schoolName ? (pos.schoolIds.length > 1 ? `مشترک: ${pos.schoolName}` : pos.schoolName) : 'بدون انتساب به مدرسه'}</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { const v = window.prompt('شماره پایانه:', pos.terminal); if (v === null) return; const terminal = normalizeTerminal(v); if (!terminal) { setBannerNotice({text:'شماره پایانه معتبر نیست.',type:'error'}); return; } if (effectivePosTerminals.some((x) => normalizeTerminal(x.terminal) === terminal && normalizeTerminal(x.terminal) !== normalizeTerminal(pos.terminal))) { setBannerNotice({text:'شماره پایانه تکراری است.',type:'error'}); return; } saveTerminalsAndCards(posTerminals.map((x) => normalizeTerminal(x.terminal) === normalizeTerminal(pos.terminal) ? {...x, terminal} : x), pettyCashCards); }} className="flex-1 px-3 py-2 rounded-lg bg-purple-100 text-purple-800 text-xs font-bold">ویرایش شماره</button>
                      <button type="button" onClick={() => { if (window.confirm('پایانه ' + pos.terminal + ' حذف شود؟')) saveTerminalsAndCards(posTerminals.filter((x) => normalizeTerminal(x.terminal) !== normalizeTerminal(pos.terminal)), pettyCashCards); }} className="px-3 py-2 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Saderat Petty Cash Cards Grid */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-700" />
                  <h3 className="font-black text-gray-900 text-base">کارت‌های تن‌خواه مدیران ({pettyCashCards.length} کارت)</h3>
                </div>
                <button type="button" onClick={() => { const v = window.prompt('شماره کارت تن‌خواه جدید (۱۶ رقم):'); if (v === null) return; const card = normalizeCard(v); if (card.length !== 16) { setBannerNotice({text:'شماره کارت باید ۱۶ رقم باشد.',type:'error'}); return; } if (pettyCashCards.some((x) => normalizeCard(x.card) === card)) { setBannerNotice({text:'این شماره کارت قبلاً ثبت شده است.',type:'error'}); return; } const managerName = window.prompt('نام مدیر / دارنده کارت:'); if (managerName === null || !managerName.trim()) return; const accountSuffix = window.prompt('سه رقم انتهایی حساب (۰۰۱ یا ۰۰۲):','002'); if (accountSuffix === null) return; saveTerminalsAndCards(posTerminals, [...pettyCashCards, {card, managerName:managerName.trim(), schoolId:0, accountSuffix:accountSuffix.trim(), bankAccountId:0, active:true}]); }} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold">+ افزودن کارت</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupedPettyCashCards.map((group) => (
                  <div key={group.managerName} className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-black text-sm text-gray-900">{group.managerName}</div>
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">{group.cards.length} کارت</span>
                    </div>
                    <button type="button" onClick={() => {
                      const newName = window.prompt('نام یکپارچه مدیر / دارنده این کارت‌ها:', group.managerName);
                      if (newName === null || !newName.trim()) return;
                      saveTerminalsAndCards(posTerminals, pettyCashCards.map((item) => group.cards.some((c) => c.card === item.card) ? { ...item, managerName: newName.trim() } : item));
                    }} className="w-full px-3 py-2 rounded-lg bg-white border border-blue-200 text-blue-800 text-xs font-bold">یکپارچه‌سازی / ویرایش نام مدیر</button>
                    <button type="button" onClick={() => {
                      const v = window.prompt('شماره کارت جدید برای «' + group.managerName + '» (۱۶ رقم):');
                      if (v === null) return;
                      const card = normalizeCard(v);
                      if (card.length !== 16) { setBannerNotice({text:'شماره کارت باید ۱۶ رقم باشد.',type:'error'}); return; }
                      if (pettyCashCards.some((x) => normalizeCard(x.card) === card)) { setBannerNotice({text:'این شماره کارت قبلاً ثبت شده است.',type:'error'}); return; }
                      const first = group.cards[0];
                      const accountSuffix = window.prompt('سه رقم انتهایی حساب متصل به این کارت (۰۰۱ یا ۰۰۲):', String(first?.accountSuffix || '002'));
                      if (accountSuffix === null) return;
                      if (!['001', '002', '۰۰۱', '۰۰۲'].includes(accountSuffix.trim())) { setBannerNotice({text:'حساب باید ۰۰۱ یا ۰۰۲ باشد.',type:'error'}); return; }
                      const normalizedSuffix = accountSuffix.trim().replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
                      saveTerminalsAndCards(posTerminals, [...pettyCashCards, { card, managerName: group.managerName, schoolId: first?.schoolId || 0, accountSuffix: normalizedSuffix, bankAccountId: Number(first?.bankAccountId || 0), active: true }]);
                    }} className="w-full px-3 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold">+ افزودن کارت برای این مدیر</button>
                    <div className="space-y-2">
                      {group.cards.map((card) => (
                        <div key={card.card} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-black text-blue-900 text-xs tracking-wider" dir="ltr">{card.card.replace(/(\d{4})/g, '$1-').slice(0, 19)}</span>
                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">حساب {card.accountSuffix}</span>
                          </div>
                          <label className="block space-y-1 text-[11px] font-bold text-gray-600">
                            <span>حساب بانکی متصل به این کارت</span>
                            <select value={Number(card.bankAccountId || 0)} onChange={(e) => {
                              const accountId = Number(e.target.value) || 0;
                              const account = bankAccounts.find((item) => Number(item.id) === accountId);
                              saveTerminalsAndCards(posTerminals, pettyCashCards.map((item) => item.card === card.card ? { ...item, bankAccountId: accountId, accountSuffix: account ? String(account.account_number || '').replace(/\D/g, '').slice(-3) : item.accountSuffix } : item));
                            }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
                              <option value={0}>بدون اتصال به حساب</option>
                              {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.bank_name} ({String(account.account_number || '').slice(-4)})</option>)}
                            </select>
                          </label>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => {
                              const v = window.prompt('شماره کارت ۱۶ رقمی:', card.card);
                              if (v === null) return;
                              const number = normalizeCard(v);
                              if (number.length !== 16) { setBannerNotice({text:'شماره کارت باید ۱۶ رقم باشد.',type:'error'}); return; }
                              if (pettyCashCards.some((x) => normalizeCard(x.card) === number && x.card !== card.card)) { setBannerNotice({text:'شماره کارت تکراری است.',type:'error'}); return; }
                              saveTerminalsAndCards(posTerminals, pettyCashCards.map((x) => x.card === card.card ? {...x, card:number} : x));
                            }} className="flex-1 px-3 py-2 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold">ویرایش شماره</button>
                            <button type="button" onClick={() => {
                              if (window.confirm('کارت ' + card.card + ' حذف شود؟')) saveTerminalsAndCards(posTerminals, pettyCashCards.filter((x) => x.card !== card.card));
                            }} className="px-3 py-2 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold">حذف کارت</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      {/* ========================================================================= */}
      {/* UNIFIED RESOLUTION MODAL (تعیین تکلیف و ثبت در دفاتر)                     */}
      {/* ========================================================================= */}
      {resolveRow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-gray-100 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-l from-[#4e164e] to-[#62205f] text-white flex items-center justify-between">
              <div>
                <div className="text-xs text-purple-200">تعیین تکلیف و ثبت مستقیم در دفاتر</div>
                <div className="text-lg font-black font-mono mt-0.5">
                  {resolveRow.direction === 'withdrawal' ? 'برداشت / هزینه: ' : 'واریز / شهریه: '}
                  {formatRial(resolveRow.amount)} ریال
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolveRow(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Row Context */}
              <div className="p-3 rounded-2xl bg-purple-50 text-xs text-purple-950 space-y-1">
                <div>📅 تاریخ: <span className="font-mono font-bold">{jalaliFromGregorian(resolveRow.date)}</span></div>
                <div>پیگیری / ارجاع: <span className="font-mono font-bold">{resolveRow.tracking_code || resolveRow.reference_number || '—'}</span></div>
                <div>شرح صورتحساب: <span>{resolveRow.description || '—'}</span></div>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-gray-100 text-xs font-bold text-center">
                <button
                  type="button"
                  onClick={() => setResolveMode('tuition')}
                  className={`py-2 rounded-xl transition-all ${
                    resolveMode === 'tuition' ? 'bg-white text-purple-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎓 دریافت شهریه
                </button>
                <button
                  type="button"
                  onClick={() => setResolveMode('expense')}
                  className={`py-2 rounded-xl transition-all ${
                    resolveMode === 'expense' ? 'bg-white text-purple-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🧾 هزینه / تن‌خواه
                </button>
                <button
                  type="button"
                  onClick={() => setResolveMode('link')}
                  className={`py-2 rounded-xl transition-all ${
                    resolveMode === 'link' ? 'bg-white text-purple-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔗 پیوند با سند موجود
                </button>
              </div>

              {resolveModalError && (
                <div className="rounded-xl bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 overflow-hidden">
                  {resolveErrorTargetTxId ? (
                    <button type="button" onClick={() => openRelatedBookTransaction(resolveErrorTargetTxId)} className="w-full p-3 text-right hover:bg-rose-100 transition-colors underline decoration-dotted underline-offset-4">
                      {resolveModalError}
                      <span className="block mt-1 text-[10px] font-black">مشاهده تراکنش مرتبط ←</span>
                    </button>
                  ) : <div className="p-3">{resolveModalError}</div>}
                </div>
              )}

              {/* MODE 1: TUITION */}
              {resolveMode === 'tuition' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">مدرسه مربوطه</label>
                    <SchoolSelect schools={schools} value={resolveSchoolId} onChange={(value) => {
                        setResolveSchoolId(Number(value));
                        setResolveSelectedStudent(null);
                      }} className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">جستجوی نام یا کد ملی دانش‌آموز</label>
                    <input
                      type="text"
                      placeholder="نام دانش‌آموز را تایپ کنید..."
                      value={resolveStudentSearch}
                      onChange={(e) => setResolveStudentSearch(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  {/* Student list */}
                  <div className="max-h-40 overflow-y-auto space-y-1.5 border border-gray-100 rounded-2xl p-2 bg-gray-50/50">
                    {candidateStudents.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => setResolveSelectedStudent(st)}
                        className={`p-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-between transition-all ${
                          resolveSelectedStudent?.id === st.id
                            ? 'bg-purple-700 text-white font-bold'
                            : 'bg-white hover:bg-purple-50 text-gray-800'
                        }`}
                      >
                        <div>
                          <div>{st.name}</div>
                          <div className={`text-[10px] ${resolveSelectedStudent?.id === st.id ? 'text-purple-200' : 'text-gray-400'}`}>
                            پایه: {st.grade} · کدملی: {st.national_id}
                          </div>
                        </div>
                        {resolveSelectedStudent?.id === st.id && <Check className="w-4 h-4 text-amber-300" />}
                      </div>
                    ))}
                    {candidateStudents.length === 0 && (
                      <div className="text-center text-xs text-gray-400 py-3">دانش‌آموزی با این مشخصات یافت نشد.</div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">شرح یا توضیحات دریافت</label>
                    <input
                      type="text"
                      value={resolveComment}
                      onChange={(e) => setResolveComment(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>
              )}

              {/* MODE 2: EXPENSE */}
              {resolveMode === 'expense' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">مدرسه</label>
                      <SchoolSelect schools={schools} value={resolveSchoolId} onChange={(value) => setResolveSchoolId(Number(value))} className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50" />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">سرفصل هزینه</label>
                      <select
                        value={resolveCategoryId}
                        onChange={(e) => setResolveCategoryId(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">محل پرداخت</label>
                    <select
                      value={resolvePaymentSource}
                      onChange={(e) => setResolvePaymentSource(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50"
                    >
                      <option value="bank">حساب جاری بانک (مستقیم)</option>
                      <option value="petty_cash">کارت تن‌خواه مدیر مدرسه</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">شرح هزینه / بابت</label>
                    <input
                      type="text"
                      value={resolveComment}
                      onChange={(e) => setResolveComment(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>
              )}

              {/* MODE 3: LINK EXISTING */}
              {resolveMode === 'link' && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-600">
                    اسناد دفتری ثبت‌شده با مبلغ مشابه ({formatRial(resolveRow.amount)} ریال) که هنوز تطبیق نخورده‌اند:
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 border border-gray-100 rounded-2xl p-2 bg-gray-50/50">
                    {candidateBookTxs.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => handleLinkExistingTx(tx)}
                        className="p-3 rounded-xl bg-white hover:bg-purple-50 border border-gray-200 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-gray-800">
                            سند #{tx.id} · {tx.kind} {tx.student_name ? `(${tx.student_name})` : ''}
                          </div>
                          <div className="text-gray-400 text-[10px]">
                            تاریخ: {jalaliFromGregorian(tx.date)} · پیگیری: {tx.tracking_code || '—'}
                          </div>
                        </div>
                        <div className="text-purple-700 font-bold flex items-center gap-1">
                          <span>پیوند با این سند</span>
                          <Link2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}
                    {candidateBookTxs.length === 0 && (
                      <div className="text-center text-xs text-gray-400 py-4">
                        هیچ سند ثبت‌شده با این مبلغ دقیق در دفاتر یافت نشد. می‌توانید از گزینه‌های ثبت شهریه یا ثبت هزینه استفاده کنید.
                      </div>
                    )}
                    {crossSchoolCandidateTxs.length > 0 && (
                      <div className="mt-3 border-t border-rose-200 pt-2 space-y-1.5">
                        <div className="px-1 text-[11px] font-black text-rose-700">اسناد هم‌مبلغ از مدرسه‌های دیگر (قابل پیوند نیستند):</div>
                        {crossSchoolCandidateTxs.map((tx) => (
                          <button key={tx.id} type="button" onClick={() => {
                            setResolveErrorTargetTxId(tx.id);
                            setResolveModalError('تراکنش بانکی و تراکنش نرم‌افزار باید متعلق به یک مدرسه باشند. برای مشاهده سند، روی این پیام خطا بزنید.');
                          }} className="w-full rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-right text-xs hover:bg-rose-100">
                            <span className="block font-bold text-rose-800">سند #{tx.id} · {tx.school_name || schools.find((s) => Number(s.id) === Number(tx.school_id))?.name || `مدرسه ${tx.school_id}`}</span>
                            <span className="block mt-1 text-[10px] text-rose-600">برای نمایش جزئیات و علت عدم تطبیق، انتخاب کنید</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            {resolveMode !== 'link' && (
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolveRow(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleResolveSubmit}
                  className="px-5 py-2.5 rounded-xl bg-[#62205f] hover:bg-[#782874] text-white font-black text-xs shadow-md active:scale-95"
                >
                  ثبت در دفاتر و تطبیق فوری
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Entry of the reconciliation section: every defined bank account first. Choosing one opens its own page
 * (separate POS / statement imports, automatic matching, unregistered rows, notifications).
 */
export const BankScreen: React.FC = () => {
  const { bankAccounts, bankTransactions, currentUser, setCurrentScreen, refreshBankData } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [accountId, setAccountId] = useState<number | null>(null);

  useEffect(() => {
    if (isSenior) void refreshBankData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSenior]);

  const account = accountId === null ? null : bankAccounts.find((a) => Number(a.id) === accountId) || null;
  useBackClose(!!account, () => setAccountId(null));
  if (account) return <BankAccountPage key={account.id} account={account} onBack={() => setAccountId(null)} />;

  const active = bankAccounts.filter((a) => a.is_active !== false);
  return (
    <div className="min-h-screen bg-[#fcfafd] pb-24 text-gray-800">
      <Header title="تطبیق بانکی — انتخاب حساب" />
      <main className="max-w-3xl mx-auto px-3 sm:px-5 py-6 space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          هر حساب بانکی تطبیق مستقل خودش را دارد. حساب را انتخاب کنید تا اکسل پوز و اکسل صورتحساب‌اش را وارد کنید و ثبت‌نشده‌ها را ببینید.
        </p>
        {active.length === 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-8 text-center space-y-3">
            <Landmark className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-600">هنوز حساب بانکی تعریف نشده است.</p>
            <button type="button" onClick={() => setCurrentScreen('bank_accounts')} className="px-4 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold">تعریف حساب بانکی</button>
          </div>
        )}
        {active.map((a) => {
          const rows = bankTransactions.filter((b) => rowBelongsToAccount(b, a));
          const open = rows.filter((b) => !b.reconciled).length;
          const last = rows.reduce((m, b) => (b.date > m ? b.date : m), '');
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccountId(Number(a.id))}
              className="w-full text-right bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 active:scale-[0.99] transition-all p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Landmark className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="font-black text-gray-900 truncate">{a.name}</div>
                  <div className="text-xs text-gray-500 truncate">{a.bank_name}{a.branch_name ? ` · ${a.branch_name}` : ''}</div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5" dir="ltr">{a.account_number}</div>
                </div>
              </div>
              <div className="text-left shrink-0 space-y-1">
                <div className={`text-xs font-black px-2.5 py-1 rounded-full ${open ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                  {open ? `${open.toLocaleString('fa-IR')} ردیف باز` : rows.length ? 'همه تطبیق‌یافته' : 'بدون ردیف'}
                </div>
                <div className="text-[11px] text-gray-400">{last ? `آخرین ردیف: ${jalaliFromGregorian(last)}` : 'اکسلی وارد نشده'}</div>
              </div>
            </button>
          );
        })}
      </main>
    </div>
  );
};
