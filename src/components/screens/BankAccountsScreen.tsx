import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { BankAccount, Transaction, BankTransaction } from '../../types';
import { formatRial, jalaliFromGregorian, todayJalali, latinDigits } from '../../utils/jalali';
import {
  Landmark,
  PlusCircle,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Printer,
  Search,
  Filter,
  Layers,
  X,
  Check,
  Building2,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const IRAN_BANKS = [
  'بانک ملی ایران',
  'بانک ملت',
  'بانک سپه',
  'بانک صادرات ایران',
  'بانک تجارت',
  'بانک قرض‌الحسنه رسالت',
  'بانک قرض‌الحسنه مهر ایران',
  'بانک پاسارگاد',
  'بانک سامان',
  'بانک کشاورزی',
  'بانک مسکن',
  'بانک رفاه کارگران',
  'بانک پارسیان',
  'بانک شهر',
  'بانک آینده',
  'سایر بانک‌ها و مؤسسات',
];

export const BankAccountsScreen: React.FC = () => {
  const {
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    transactions,
    bankTransactions,
    schools,
    currentUser,
    accentColor,
    setCurrentScreen,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  // Selected Bank Account for Ledger View (null = all accounts)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(() => {
    return bankAccounts.length > 0 ? bankAccounts[0].id : null;
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [activeTab, setActiveTab] = useState<'ledger' | 'accounts_list'>('ledger');

  // Modal State for Add / Edit Account
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formBankName, setFormBankName] = useState(IRAN_BANKS[0]);
  const [formBranch, setFormBranch] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formCardNumber, setFormCardNumber] = useState('');
  const [formSheba, setFormSheba] = useState('');
  const [formSchoolId, setFormSchoolId] = useState<number>(
    isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1
  );
  const [formPosTerminal, setFormPosTerminal] = useState('');
  const [formKolCode, setFormKolCode] = useState('10');
  const [formMoeenCode, setFormMoeenCode] = useState('01');
  const [formTafsiliCode, setFormTafsiliCode] = useState('');
  const [formInitialBalance, setFormInitialBalance] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Scoped bank accounts based on user role
  const scopedAccounts = useMemo(() => {
    if (isSenior) return bankAccounts;
    return bankAccounts.filter((b) => b.school_id === currentUser?.school_id);
  }, [bankAccounts, isSenior, currentUser]);

  const activeAccount = useMemo(() => {
    return scopedAccounts.find((b) => b.id === selectedAccountId) || scopedAccounts[0] || null;
  }, [scopedAccounts, selectedAccountId]);

  // Compute reconciled transactions for selected account or all accounts
  // A transaction belongs to this bank account if:
  // 1. It is marked as reconciled: true
  // 2. Its school matches the account's school OR matches account number/pos terminal
  const reconciledLedger = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      jalali_date: string;
      direction: 'deposit' | 'withdrawal';
      title: string;
      party_name: string;
      tracking_code: string;
      pos_terminal?: string;
      amount: number;
      school_id: number;
      school_name: string;
      bank_account_name: string;
      source_kind: string;
      matched_id?: number;
    }> = [];

    // Source 1: Transactions in system that are reconciled with bank
    transactions.forEach((tx) => {
      if (!tx.reconciled) return;

      // Filter by school if account is selected
      if (activeAccount && tx.school_id !== activeAccount.school_id) return;
      if (!isSenior && tx.school_id !== currentUser?.school_id) return;

      const isDeposit = tx.kind === 'شهریه' || tx.kind === 'دریافت متفرقه';
      const isWithdrawal = tx.kind === 'هزینه';

      if (!isDeposit && !isWithdrawal) return;

      const matchedAccount = bankAccounts.find((b) => b.school_id === tx.school_id) || activeAccount;

      list.push({
        id: `tx_${tx.id}`,
        date: tx.date,
        jalali_date: tx.jalali_date || jalaliFromGregorian(tx.date),
        direction: isDeposit ? 'deposit' : 'withdrawal',
        title: tx.description || tx.comment || (isDeposit ? 'دریافت شهریه' : 'پرداخت هزینه'),
        party_name: tx.student_name || tx.expense_category_name || 'طرف‌حساب',
        tracking_code: tx.tracking_code || '',
        pos_terminal: tx.pos_terminal_number || matchedAccount?.pos_terminal_number,
        amount: isDeposit ? (tx.credit || tx.amount) : (tx.debit || tx.amount),
        school_id: tx.school_id,
        school_name: tx.school_name || 'مدرسه',
        bank_account_name: matchedAccount?.name || 'حساب بانکی',
        source_kind: isDeposit ? 'واریز شهریه' : 'هزینه جاری',
        matched_id: tx.bank_transaction_id,
      });
    });

    // Source 2: Bank transactions uploaded that have reconciled: true
    bankTransactions.forEach((bt) => {
      if (!bt.reconciled) return;

      if (activeAccount && bt.school_id !== activeAccount.school_id) return;
      if (!isSenior && bt.school_id !== currentUser?.school_id) return;

      // Avoid duplicates if already linked to a transaction
      const alreadyIncluded = list.some((item) => item.matched_id === bt.id || item.id === `tx_${bt.matched_transaction_id}`);
      if (alreadyIncluded) return;

      const isDeposit = bt.direction === 'deposit' || bt.direction === 'pos_sale' || (bt.amount > 0 && bt.direction !== 'withdrawal');
      const matchedAccount = bankAccounts.find((b) => b.school_id === bt.school_id || b.account_number === bt.bank_account) || activeAccount;

      list.push({
        id: `bt_${bt.id}`,
        date: bt.date,
        jalali_date: jalaliFromGregorian(bt.date),
        direction: isDeposit ? 'deposit' : 'withdrawal',
        title: bt.description || (isDeposit ? 'واریز تطبیق‌یافته بانکی' : 'برداشت بانکی'),
        party_name: bt.assigned_student_name || 'تراکنش تطبیق‌یافته',
        tracking_code: bt.tracking_code || bt.pos_reference_code || '',
        pos_terminal: bt.terminal_number || matchedAccount?.pos_terminal_number,
        amount: Math.abs(bt.amount),
        school_id: bt.school_id,
        school_name: bt.school_name || 'مدرسه',
        bank_account_name: matchedAccount?.name || 'حساب بانکی',
        source_kind: isDeposit ? 'واریز مستقیم بانک' : 'برداشت مستقیم بانک',
        matched_id: bt.matched_transaction_id,
      });
    });

    // Sort chronologically
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, bankTransactions, activeAccount, isSenior, currentUser, bankAccounts]);

  // Apply Search & Direction Filters
  const filteredLedger = useMemo(() => {
    return reconciledLedger.filter((item) => {
      if (filterDirection === 'deposit' && item.direction !== 'deposit') return false;
      if (filterDirection === 'withdrawal' && item.direction !== 'withdrawal') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mTitle = item.title.toLowerCase().includes(q);
        const mParty = item.party_name.toLowerCase().includes(q);
        const mTrack = item.tracking_code.toLowerCase().includes(q);
        const mTerminal = (item.pos_terminal || '').includes(q);
        return mTitle || mParty || mTrack || mTerminal;
      }
      return true;
    });
  }, [reconciledLedger, filterDirection, searchQuery]);

  // Totals for Active Account
  const ledgerMetrics = useMemo(() => {
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    reconciledLedger.forEach((item) => {
      if (item.direction === 'deposit') totalDeposits += item.amount;
      else totalWithdrawals += item.amount;
    });

    const initial = activeAccount?.initial_balance || 0;
    const currentBalance = initial + totalDeposits - totalWithdrawals;

    return {
      totalDeposits,
      totalWithdrawals,
      currentBalance,
      reconciledCount: reconciledLedger.length,
    };
  }, [reconciledLedger, activeAccount]);

  // Open modal to add new account
  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setFormName('');
    setFormBankName(IRAN_BANKS[0]);
    setFormBranch('');
    setFormAccountNumber('');
    setFormCardNumber('');
    setFormSheba('');
    const defaultSc = isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1;
    setFormSchoolId(defaultSc);
    setFormPosTerminal('');
    setFormKolCode('10');
    setFormMoeenCode(String(defaultSc).padStart(2, '0'));
    setFormTafsiliCode('');
    setFormInitialBalance('');
    setFormNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal to edit existing account
  const handleOpenEditModal = (acc: BankAccount) => {
    setEditingAccount(acc);
    setFormName(acc.name);
    setFormBankName(acc.bank_name);
    setFormBranch(acc.branch_name || '');
    setFormAccountNumber(acc.account_number);
    setFormCardNumber(acc.card_number || '');
    setFormSheba(acc.sheba_number || '');
    setFormSchoolId(acc.school_id);
    setFormPosTerminal(acc.pos_terminal_number || '');
    setFormKolCode(acc.kol_code || '10');
    setFormMoeenCode(acc.moeen_code || '01');
    setFormTafsiliCode(acc.tafsili_code || '');
    setFormInitialBalance(acc.initial_balance ? String(acc.initial_balance) : '');
    setFormNotes(acc.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formName.trim();
    const cleanAccountNo = formAccountNumber.trim();
    const cleanKol = formKolCode.trim() || '10';
    const cleanMoeen = formMoeenCode.trim() || '01';

    if (!cleanName) {
      setFormError('عنوان حساب بانکی را وارد فرمایید.');
      return;
    }
    if (!cleanAccountNo) {
      setFormError('شماره حساب بانکی الزامی است.');
      return;
    }

    const initAmt = Number(formInitialBalance.replace(/\D/g, '')) || 0;
    const sc = schools.find((s) => s.id === formSchoolId);

    if (editingAccount) {
      updateBankAccount(editingAccount.id, {
        name: cleanName,
        bank_name: formBankName,
        branch_name: formBranch.trim() || undefined,
        account_number: cleanAccountNo,
        card_number: formCardNumber.trim() || undefined,
        sheba_number: formSheba.trim() || undefined,
        school_id: formSchoolId,
        school_name: sc?.name,
        pos_terminal_number: formPosTerminal.trim() || undefined,
        kol_code: cleanKol,
        moeen_code: cleanMoeen,
        tafsili_code: formTafsiliCode.trim() || undefined,
        initial_balance: initAmt,
        notes: formNotes.trim() || undefined,
      });
    } else {
      const created = addBankAccount({
        name: cleanName,
        bank_name: formBankName,
        branch_name: formBranch.trim() || undefined,
        account_number: cleanAccountNo,
        card_number: formCardNumber.trim() || undefined,
        sheba_number: formSheba.trim() || undefined,
        school_id: formSchoolId,
        school_name: sc?.name,
        pos_terminal_number: formPosTerminal.trim() || undefined,
        kol_code: cleanKol,
        moeen_code: cleanMoeen,
        tafsili_code: formTafsiliCode.trim() || undefined,
        initial_balance: initAmt,
        is_active: true,
        notes: formNotes.trim() || undefined,
      });
      setSelectedAccountId(created.id);
    }

    setIsModalOpen(false);
  };

  const handleDeleteAccount = (acc: BankAccount) => {
    if (window.confirm(`آیا از حذف حساب بانکی «${acc.name}» اطمینان دارید؟`)) {
      deleteBankAccount(acc.id);
      if (selectedAccountId === acc.id) {
        const remaining = bankAccounts.filter((b) => b.id !== acc.id);
        setSelectedAccountId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  // Export Reconciled Ledger to Excel
  const handleExportExcel = () => {
    const rows = filteredLedger.map((item, idx) => ({
      'ردیف': idx + 1,
      'تاریخ شمسی': item.jalali_date,
      'نوع گردش': item.direction === 'deposit' ? 'واریز (بستانکار)' : 'برداشت (بدهکار)',
      'سرفصل / شرح': item.title,
      'طرف حساب': item.party_name,
      'شماره پیگیری': item.tracking_code,
      'پایانه پوز': item.pos_terminal || '—',
      'واریز به بانک (ریال)': item.direction === 'deposit' ? item.amount : 0,
      'برداشت از بانک (ریال)': item.direction === 'withdrawal' ? item.amount : 0,
      'واحد آموزشی': item.school_name,
      'کد کل حسابداری': activeAccount?.kol_code || '10',
      'کد معین حسابداری': activeAccount?.moeen_code || '—',
      'وضعیت': 'تطبیق‌یافته قطعی',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },  // ردیف
      { wch: 12 }, // تاریخ
      { wch: 15 }, // نوع
      { wch: 30 }, // شرح
      { wch: 22 }, // طرف‌حساب
      { wch: 16 }, // پیگیری
      { wch: 14 }, // پایانه
      { wch: 18 }, // واریز
      { wch: 18 }, // برداشت
      { wch: 22 }, // مدرسه
      { wch: 10 }, // کل
      { wch: 10 }, // معین
      { wch: 16 }, // وضعیت
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'دفتر تطبیق بانک');
    const accTitle = (activeAccount?.name || 'bank_ledger').replace(/\s+/g, '_');
    const dateStr = todayJalali().replace(/\//g, '-');
    XLSX.writeFile(wb, `Bank_Reconciled_Ledger_${accTitle}_${dateStr}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isSenior) {
    return (
      <div className="min-h-screen bg-[#f8f5f9] flex flex-col">
        <Header title="مدیریت بانک‌ها و دفاتر بانکی" />
        <div className="max-w-md mx-auto my-auto p-6 bg-white rounded-3xl border border-[#e5dde8] shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Landmark className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-[#341648]">دسترسی محدود به مدیریت ارشد</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            بخش حساب‌های بانکی و کارتخوان‌ها منحصراً در اختیار مدیریت ارشد مجموعه (جناب آقای گلزاری) می‌باشد.
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
    <div className="min-h-screen bg-[#f8f5f9] pb-16 print:bg-white print:p-0">
      <div className="print:hidden">
        <Header title="مدیریت بانک‌ها و دفاتر بانکی" />
      </div>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
        {/* Print-Only Header */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-black">دفتر گردش و تراکنش‌های تطبیق‌یافته حساب بانکی</h1>
          <p className="text-sm text-gray-600 mt-1">
            حساب: {activeAccount?.name} | بانک: {activeAccount?.bank_name} | شماره حساب: {activeAccount?.account_number}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">تاریخ گزارش: {todayJalali()}</p>
        </div>

        {/* Top Control Banner */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
                <Landmark className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#341648]">حساب‌های بانکی و دفاتر تطبیق</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  کد کل و معین حسابداری، مدیریت کارتخوان‌ها و مشاهده تراکنش‌های تطبیق‌یافته بانک
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isSenior && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#62205f] hover:bg-[#4d194b] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>تعریف حساب بانکی جدید</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCurrentScreen('bank')}
                className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
                title="رفتن به صفحه تطبیق مغایرت بانک"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>صفحه تطبیق بانک</span>
              </button>
            </div>
          </div>

          {/* Account Metric Summary */}
          {activeAccount && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
              <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
                <div className="text-[11px] text-gray-500 font-medium">مانده کل حساب بانک</div>
                <div className="text-sm font-black font-mono text-[#341648] mt-1">
                  {formatRial(ledgerMetrics.currentBalance)} <span className="text-[10px] font-normal text-gray-500">ریال</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/60">
                <div className="text-[11px] text-emerald-800 font-medium flex items-center justify-between">
                  <span>واریزی‌های تطبیق‌یافته</span>
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-sm font-black font-mono text-emerald-900 mt-1">
                  {formatRial(ledgerMetrics.totalDeposits)} <span className="text-[10px] font-normal text-gray-500">ریال</span>
                </div>
              </div>

              <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200/60">
                <div className="text-[11px] text-rose-800 font-medium flex items-center justify-between">
                  <span>برداشت‌ها / هزینه‌ها</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-sm font-black font-mono text-rose-900 mt-1">
                  {formatRial(ledgerMetrics.totalWithdrawals)} <span className="text-[10px] font-normal text-gray-500">ریال</span>
                </div>
              </div>

              <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
                <div className="text-[11px] text-gray-500 font-medium flex items-center justify-between">
                  <span>کد کل / معین پارسیان</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-sm font-black font-mono text-purple-900 mt-1">
                  کل: {activeAccount.kol_code} | معین: {activeAccount.moeen_code}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bank Account Selector Tabs / Cards */}
        <div className="space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">انتخاب حساب بانکی جهت مشاهده دفتر و کارتکس:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'ledger'
                    ? 'bg-[#62205f] text-white shadow-2xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
                style={activeTab === 'ledger' ? { backgroundColor: accentColor } : {}}
              >
                ریز تراکنش‌های تطبیق‌یافته
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('accounts_list')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'accounts_list'
                    ? 'bg-[#62205f] text-white shadow-2xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
                style={activeTab === 'accounts_list' ? { backgroundColor: accentColor } : {}}
              >
                مدیریت حساب‌ها ({scopedAccounts.length})
              </button>
            </div>
          </div>

          {/* Quick Bank Account Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {scopedAccounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-white border-[#62205f] text-[#62205f] shadow-sm ring-2 ring-purple-100'
                      : 'bg-white/80 border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  <Landmark className={`w-3.5 h-3.5 ${isSelected ? 'text-[#62205f]' : 'text-gray-400'}`} />
                  <span>{acc.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {acc.account_number.slice(-4)}...
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: Reconciled Transactions Ledger */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جست‌وجوی شماره پیگیری، نام طرف حساب، شرح واریز یا پایانه..."
                  className="w-full pl-3 pr-9 py-2 bg-white rounded-xl border border-gray-300 text-xs text-[#302735]"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
                  {[
                    { id: 'all', label: 'همه' },
                    { id: 'deposit', label: 'فقط واریزی‌ها' },
                    { id: 'withdrawal', label: 'فقط برداشت‌ها' },
                  ].map((dir) => (
                    <button
                      key={dir.id}
                      type="button"
                      onClick={() => setFilterDirection(dir.id as typeof filterDirection)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        filterDirection === dir.id ? 'bg-white text-[#341648] shadow-2xs' : 'text-gray-600'
                      }`}
                    >
                      {dir.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                  title="دانلود فایل اکسل گردش حساب"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">اکسل</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs"
                  title="چاپ دفتر حساب"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>تراکنش‌های قطعی و تطبیق‌یافته: {activeAccount?.name || 'کل حساب‌ها'}</span>
                </div>
                <span className="text-gray-500 font-mono text-[11px]">
                  تعداد: {filteredLedger.length} تراکنش تطبیق‌یافته
                </span>
              </div>

              {filteredLedger.length === 0 ? (
                <div className="p-10 text-center text-gray-400 space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-gray-300" />
                  <div className="text-xs font-bold">هنوز تراکنش تطبیق‌یافته‌ای برای این حساب ثبت نشده است.</div>
                  <p className="text-[11px] text-gray-400">
                    برای وارد کردن فایل اکسل صورتحساب بانک و تطبیق آن با دریافتی‌های مدیران، به بخش تطبیق بانک مراجعه کنید.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('bank')}
                    className="mt-2 px-4 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold"
                  >
                    ورود به صفحه تطبیق بانک ⬅️
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 font-bold bg-[#fcfaff]">
                        <th className="py-2.5 px-3">ردیف</th>
                        <th className="py-2.5 px-3">تاریخ شمسی</th>
                        <th className="py-2.5 px-3">سرفصل / شرح تراکنش</th>
                        <th className="py-2.5 px-3">طرف حساب</th>
                        <th className="py-2.5 px-3">شماره پیگیری</th>
                        <th className="py-2.5 px-3">پایانه پوز</th>
                        <th className="py-2.5 px-3 text-left">واریز (ریال)</th>
                        <th className="py-2.5 px-3 text-left">برداشت (ریال)</th>
                        <th className="py-2.5 px-3 text-center">وضعیت تطبیق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {filteredLedger.map((item, idx) => {
                        const isDeposit = item.direction === 'deposit';
                        return (
                          <tr key={item.id} className="hover:bg-purple-50/30">
                            <td className="py-2.5 px-3 text-gray-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-gray-700">{item.jalali_date}</td>
                            <td className="py-2.5 px-3 font-bold text-[#341648]">
                              <div>{item.title}</div>
                              <div className="text-[10px] text-gray-400">{item.source_kind} | {item.school_name}</div>
                            </td>
                            <td className="py-2.5 px-3 text-gray-800 font-bold">{item.party_name}</td>
                            <td className="py-2.5 px-3 font-mono text-gray-600 text-[11px]">{item.tracking_code || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-gray-600 text-[11px]">{item.pos_terminal || '—'}</td>
                            <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700">
                              {isDeposit ? formatRial(item.amount) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-700">
                              {!isDeposit ? formatRial(item.amount) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>تطبیق‌یافته</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 font-black bg-purple-50/50 text-xs">
                        <td colSpan={6} className="py-3 px-3 text-[#341648]">جمع گردش‌های تطبیق‌یافته:</td>
                        <td className="py-3 px-3 text-left font-mono text-emerald-800">{formatRial(ledgerMetrics.totalDeposits)}</td>
                        <td className="py-3 px-3 text-left font-mono text-rose-800">{formatRial(ledgerMetrics.totalWithdrawals)}</td>
                        <td className="py-3 px-3 text-center text-emerald-700 font-bold">✓ دفاتر تراز</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Accounts Management (کارت‌های حساب‌ها و تنظیم کد کل و معین) */}
        {activeTab === 'accounts_list' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scopedAccounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;

                return (
                  <div
                    key={acc.id}
                    className={`bg-white rounded-3xl p-5 border transition-all space-y-4 shadow-xs ${
                      isSelected ? 'border-[#62205f] ring-2 ring-purple-100' : 'border-[#e5dde8] hover:border-purple-300'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-900 text-white flex items-center justify-center font-bold shadow-xs">
                          <Landmark className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-[#341648]">{acc.name}</h3>
                          <div className="text-xs text-gray-500">{acc.bank_name} {acc.branch_name ? `(${acc.branch_name})` : ''}</div>
                        </div>
                      </div>

                      {isSenior && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(acc)}
                            className="p-1.5 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors"
                            title="ویرایش حساب و کدینگ"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="حذف حساب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Account Details & Numbers */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#fcfaff] p-2.5 rounded-xl border border-purple-100/60">
                        <div className="text-[10px] text-gray-500">شماره حساب:</div>
                        <div className="font-mono font-bold text-gray-800 mt-0.5">{acc.account_number}</div>
                      </div>

                      {acc.card_number && (
                        <div className="bg-[#fcfaff] p-2.5 rounded-xl border border-purple-100/60">
                          <div className="text-[10px] text-gray-500">شماره کارت:</div>
                          <div className="font-mono font-bold text-gray-800 mt-0.5">{acc.card_number}</div>
                        </div>
                      )}

                      {acc.sheba_number && (
                        <div className="col-span-2 bg-[#fcfaff] p-2.5 rounded-xl border border-purple-100/60">
                          <div className="text-[10px] text-gray-500">شماره شبا (IBAN):</div>
                          <div className="font-mono font-bold text-gray-800 mt-0.5 text-left" dir="ltr">{acc.sheba_number}</div>
                        </div>
                      )}

                      {acc.pos_terminal_number && (
                        <div className="bg-[#fcfaff] p-2.5 rounded-xl border border-purple-100/60">
                          <div className="text-[10px] text-gray-500">پایانه پوز کارتخوان:</div>
                          <div className="font-mono font-bold text-gray-800 mt-0.5">{acc.pos_terminal_number}</div>
                        </div>
                      )}

                      <div className="bg-[#fcfaff] p-2.5 rounded-xl border border-purple-100/60">
                        <div className="text-[10px] text-gray-500">واحد آموزشی:</div>
                        <div className="font-bold text-gray-800 mt-0.5 truncate">{acc.school_name || 'مرکزی'}</div>
                      </div>
                    </div>

                    {/* Accounting Coding Badge Box */}
                    <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-purple-900">کدینگ حسابداری پارسیان:</span>
                        <div className="text-[11px] text-purple-700 mt-0.5">
                          کد کل: <span className="font-mono font-bold">{acc.kol_code}</span> | کد معین: <span className="font-mono font-bold">{acc.moeen_code}</span>
                          {acc.tafsili_code ? ` | تفصیلی: ${acc.tafsili_code}` : ''}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setActiveTab('ledger');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#62205f] hover:bg-[#4d194b] text-white text-[11px] font-bold shadow-2xs transition-all"
                        style={{ backgroundColor: accentColor }}
                      >
                        مشاهده دفتر ⬅️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal: Add / Edit Bank Account */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-4">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-[#341648]">
                    {editingAccount ? 'ویرایش مشخصات و کدینگ حساب بانکی' : 'تعریف حساب بانکی جدید'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  ⚠️ {formError}
                </div>
              )}

              <form onSubmit={handleSaveAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    عنوان نمایشی حساب <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: حساب اصلی شهریه - بانک ملی"
                    className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#341648] mb-1.5">
                      نام بانک <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648]"
                    >
                      {IRAN_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#341648] mb-1.5">نام یا کد شعبه</label>
                    <input
                      type="text"
                      value={formBranch}
                      onChange={(e) => setFormBranch(e.target.value)}
                      placeholder="مثال: شعبه مرکزی شهرضا"
                      className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#341648] mb-1.5">
                      شماره حساب بانکی <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formAccountNumber}
                      onChange={(e) => setFormAccountNumber(e.target.value)}
                      placeholder="مثال: 0105829147003"
                      className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#341648] mb-1.5">شماره ۱۶ رقمی کارت</label>
                    <input
                      type="text"
                      value={formCardNumber}
                      onChange={(e) => setFormCardNumber(e.target.value)}
                      placeholder="۶۰۳۷-۹۹۷۵-۱۱۲۲-۳۳۴۴"
                      className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">شماره شبای بانکی (IBAN)</label>
                  <input
                    type="text"
                    value={formSheba}
                    onChange={(e) => setFormSheba(e.target.value)}
                    placeholder="IR890170000000109283746501"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {isSenior && (
                    <div>
                      <label className="block text-xs font-bold text-[#341648] mb-1.5">واحد آموزشی متصل</label>
                      <select
                        value={formSchoolId}
                        onChange={(e) => setFormSchoolId(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-white rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648]"
                      >
                        {schools.map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            {sc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#341648] mb-1.5">شماره پایانه کارتخوان (ترمینال پوز)</label>
                    <input
                      type="text"
                      value={formPosTerminal}
                      onChange={(e) => setFormPosTerminal(e.target.value)}
                      placeholder="مثال: 89412031"
                      className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Accounting Coding Box (کد کل و کد معین حسابداری) */}
                <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                    <span>کدینگ حسابداری پارسیان جهت صدور اسناد اتوماتیک</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        کد کل <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formKolCode}
                        onChange={(e) => setFormKolCode(e.target.value)}
                        placeholder="10"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-purple-200 text-sm font-mono text-center font-bold"
                        dir="ltr"
                      />
                      <span className="text-[10px] text-gray-500 mt-0.5 block">پیش‌فرض: 10 (بانک‌ها)</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        کد معین <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formMoeenCode}
                        onChange={(e) => setFormMoeenCode(e.target.value)}
                        placeholder="01"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-purple-200 text-sm font-mono text-center font-bold"
                        dir="ltr"
                      />
                      <span className="text-[10px] text-gray-500 mt-0.5 block">کد معین بانک در پارسیان</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">کد تفصیلی (اختیاری)</label>
                      <input
                        type="text"
                        value={formTafsiliCode}
                        onChange={(e) => setFormTafsiliCode(e.target.value)}
                        placeholder="1001"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-purple-200 text-sm font-mono text-center"
                        dir="ltr"
                      />
                      <span className="text-[10px] text-gray-500 mt-0.5 block">تفصیلی این حساب</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">مانده آغازین حساب (ریال)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formInitialBalance}
                    onChange={(e) => {
                      const raw = latinDigits(e.target.value).replace(/\D/g, '');
                      setFormInitialBalance(raw ? Number(raw).toLocaleString('en-US') : '');
                    }}
                    placeholder="مثال: ۱۲۰,۰۰۰,۰۰۰"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingAccount ? 'ذخیره تغییرات حساب' : 'ثبت قطعی حساب بانکی'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
