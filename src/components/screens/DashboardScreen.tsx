import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { matchesStudentSearch } from '../../utils/studentSearch';
import { DashboardClock } from '../DashboardClock';
import { TuitionMonthlyChart } from '../TuitionMonthlyChart';
import { ManagerFeedbackModal } from '../ManagerFeedbackModal';
import {
  Users,
  CreditCard,
  MessageSquarePlus,
  FileCheck,
  Receipt,
  ArrowLeftRight,
  BookOpen,
  Wallet,
  BarChart3,
  ClipboardList,
  Settings,
  Building2,
  UserCog,
  FileSpreadsheet,
  Megaphone,
  Landmark,
  ChevronLeft,
  AlertCircle,
  PhoneCall,
  FileText,
  Sparkles,
  Cloud,
  Database,
  RefreshCw,
  CheckCircle2,
  MessageSquare,
  GraduationCap,
  Upload,
  X,
  Search,
  ArrowUpDown,
  TrendingUp,
  PieChart as PieChartIcon,
  Send,
  Phone,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { ScreenType, Student } from '../../types';
import { formatRial, latinDigits, toPersianDigits } from '../../utils/jalali';
import { playClickSound } from '../../utils/soundEffects';

const CHART_COLORS = ['#62205f', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

export const DashboardScreen: React.FC<{ overviewOnly?: boolean }> = ({ overviewOnly = false }) => {
  const {
    currentUser,
    setCurrentScreen,
    accentColor,
    schools,
    students,
    transactions,
    cheques,
    categories,
    getStudentBalance,
    isConnectedToGoogleSheets,
    spreadsheetId,
    syncStatus,
    syncProgress,
    syncStageText,
    syncError,
    lastSyncTime,
    syncWithGoogleSheets,
    connectWithGoogle,
    loadOfflineExcel,
    feedbacks,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  // State for offline excel feedback
  const [offlineSuccessNotice, setOfflineSuccessNotice] = useState<string | null>(null);

  // Manager Feedback modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackModalDefaultTab, setFeedbackModalDefaultTab] = useState<'new' | 'history'>('new');

  // Feedback calculations
  const userRepliedFeedbacksCount = useMemo(() => {
    return feedbacks.filter((f) => f.user_id === currentUser?.id && f.senior_reply).length;
  }, [feedbacks, currentUser]);

  const myFeedbacksCount = useMemo(() => {
    return feedbacks.filter((f) => isSenior || f.user_id === currentUser?.id).length;
  }, [feedbacks, currentUser, isSenior]);

  const pendingFeedbackCount = useMemo(() => {
    return feedbacks.filter((f) => f.status === 'pending').length;
  }, [feedbacks]);

  // Financial Status Box School Filter
  // Senior can select 0 (all schools) or any specific school. Manager is restricted to their own school.
  const [selectedFinancialSchoolId, setSelectedFinancialSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 1
  );

  // Debtors sorting & filtering state
  const [debtorSearchQuery, setDebtorSearchQuery] = useState('');
  const [debtorSortBy, setDebtorSortBy] = useState<'debt_desc' | 'debt_asc' | 'name' | 'grade' | 'school'>('debt_desc');
  const [showAllDebtors, setShowAllDebtors] = useState(false);

  // Pending items for Senior Manager review
  const pendingReviewCount = useMemo(() => {
    return transactions.filter((t) => t.review_status === 'pending' && t.kind !== 'شهریه_بدهی').length;
  }, [transactions]);

  const handleOfflineExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await loadOfflineExcel(file);
    if (ok) {
      setOfflineSuccessNotice('اطلاعات شیت با موفقیت از فایل اکسل در نرم‌افزار بارگذاری شد.');
    }
    e.target.value = '';
  };

  // Base scope for student data
  const baseStudents = useMemo(() => {
    if (isSenior) return students;
    return students.filter((s) => s.school_id === currentUser?.school_id);
  }, [students, isSenior, currentUser]);

  // Financial Box scoped data based on selectedFinancialSchoolId
  const financialStudents = useMemo(() => {
    if (selectedFinancialSchoolId === 0) return baseStudents;
    return baseStudents.filter((s) => s.school_id === selectedFinancialSchoolId);
  }, [baseStudents, selectedFinancialSchoolId]);

  const financialStudentIds = useMemo(() => new Set(financialStudents.map((s) => s.id)), [financialStudents]);

  const financialTxs = useMemo(() => {
    if (selectedFinancialSchoolId === 0) {
      return isSenior
        ? transactions
        : transactions.filter((t) => t.school_id === currentUser?.school_id || (t.student_id && financialStudentIds.has(t.student_id)));
    }
    return transactions.filter(
      (t) => t.school_id === selectedFinancialSchoolId || (t.student_id && financialStudentIds.has(t.student_id))
    );
  }, [transactions, selectedFinancialSchoolId, isSenior, currentUser, financialStudentIds]);

  // Aggregate metrics for Financial Status Box
  const financialMetrics = useMemo(() => {
    let totalTuitionAssigned = 0;
    let totalTuitionCollected = 0;
    let totalExpenses = 0;
    const expenseByCategory: Record<string, number> = {};

    financialTxs.forEach((t) => {
      if (t.kind === 'شهریه_بدهی') {
        totalTuitionAssigned += t.debit || 0;
      } else if (t.kind === 'شهریه') {
        totalTuitionCollected += t.credit || 0;
      } else if (t.kind === 'هزینه') {
        const amt = t.debit || t.amount || 0;
        totalExpenses += amt;
        const catName = t.expense_category_name || 'سایر هزینه‌ها';
        expenseByCategory[catName] = (expenseByCategory[catName] || 0) + amt;
      }
    });

    const totalOutstandingDebt = Math.max(0, totalTuitionAssigned - totalTuitionCollected);
    const collectionRate = totalTuitionAssigned > 0
      ? Math.min(100, Math.round((totalTuitionCollected / totalTuitionAssigned) * 100))
      : 100;

    const expenseCategoryData = Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value,
      formatted: formatRial(value),
    }));

    // Bar comparison data
    const comparisonData = [
      { name: 'شهریه مصوب', amount: Math.round(totalTuitionAssigned / 1000000), color: '#3b82f6' },
      { name: 'وصولی', amount: Math.round(totalTuitionCollected / 1000000), color: '#10b981' },
      { name: 'مانده بدهی', amount: Math.round(totalOutstandingDebt / 1000000), color: '#f43f5e' },
      { name: 'کل هزینه‌ها', amount: Math.round(totalExpenses / 1000000), color: '#f59e0b' },
    ];

    return {
      totalTuitionAssigned,
      totalTuitionCollected,
      totalOutstandingDebt,
      totalExpenses,
      collectionRate,
      expenseCategoryData,
      comparisonData,
    };
  }, [financialTxs]);

  // Full Debtors calculation
  const debtorsList = useMemo(() => {
    const list = baseStudents
      .map((student) => {
        const balanceInfo = getStudentBalance(student.id);
        return {
          student,
          debt: balanceInfo.balance,
          paid: balanceInfo.credit,
          totalAssigned: balanceInfo.debt,
        };
      })
      .filter((item) => item.debt > 0);

    // Apply search
    const filtered = list.filter((item) =>
      matchesStudentSearch(item.student, debtorSearchQuery)
    );

    // Apply sort
    filtered.sort((a, b) => {
      switch (debtorSortBy) {
        case 'debt_desc':
          return b.debt - a.debt;
        case 'debt_asc':
          return a.debt - b.debt;
        case 'name':
          return a.student.name.localeCompare(b.student.name, 'fa');
        case 'grade':
          return a.student.grade.localeCompare(b.student.grade, 'fa');
        case 'school':
          return (a.student.school_name || '').localeCompare(b.student.school_name || '', 'fa');
        default:
          return b.debt - a.debt;
      }
    });

    return filtered;
  }, [baseStudents, getStudentBalance, debtorSearchQuery, debtorSortBy]);

  const displayedDebtors = showAllDebtors ? debtorsList : debtorsList.slice(0, 5);

  const menuItems = [
    { id: 'students', label: 'دانش‌آموزان', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'tuition', label: 'دریافت شهریه', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'finance_overview', label: 'گزارش مالی و بدهکاران', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'staff', label: 'معلمان و پرسنل', icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'sms_reminders', label: 'سامانه پیامک', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'cheque_list', label: 'لیست چک‌ها', icon: FileCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'expenses', label: 'هزینه‌ها', icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'transactions', label: 'تراکنش‌ها', icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'statement', label: 'گردش حساب', icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'claim', label: 'طلب تن‌خواه', icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'activity', label: 'فعالیت‌ها', icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'feedback_modal', label: 'انتقادات و پیشنهادات', icon: MessageSquarePlus, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'settings', label: 'تنظیمات', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
  ];

  const seniorExtraItems = [
    { id: 'feedback', label: 'صندوق پیشنهادات', icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'staff', label: 'حقوق و بیمه', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'cheques', label: 'تأیید چک صیادی', icon: FileCheck, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'bank', label: 'تطبیق بانک', icon: Landmark, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'bank_accounts', label: 'حساب‌های بانکی', icon: Landmark, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { id: 'managers', label: 'مدیران مدارس', icon: UserCog, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'schools', label: 'واحدهای آموزشی', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'google_settings', label: 'تنظیمات گوگل', icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'export', label: 'خروجی پارسیان', icon: FileSpreadsheet, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'messages', label: 'ارسال بخشنامه', icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3.5 sm:space-y-4">
      {overviewOnly && (
        <div className="bg-white rounded-2xl border border-[#e5dde8] p-3 flex items-center justify-between gap-3">
          <div><h2 className="font-black text-[#341648] text-base">گزارش مالی و بدهکاران</h2><p className="text-xs text-gray-500 mt-1">صورت وضعیت مالی، عملکرد و فهرست بدهکاران شهریه</p></div>
          <button onClick={() => setCurrentScreen('dashboard')} className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-[#62205f] text-xs font-bold">بازگشت</button>
        </div>
      )}
      {!overviewOnly && (
      <>
      {/* 1. Header Banner: Exactly on ONE single line */}
      <div
        className="rounded-2xl px-4 py-3 text-white shadow-md relative overflow-hidden border border-amber-400/30 flex items-center justify-between gap-3"
        style={{
          background: 'linear-gradient(135deg, #2a0b33 0%, #4a1550 50%, #200827 100%)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/app-logo.jpg"
            alt="لوگو"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover border border-amber-300/40 shrink-0 shadow-xs"
          />
          <h1 className="text-sm sm:text-base md:text-lg font-black font-neyrizi text-amber-100 tracking-wide truncate">
            مدرسة القرآن الکریم شهرضا
          </h1>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-bold">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>سیستم مالی</span>
        </div>
      </div>

      {/* 2. Compact Single-Line Greeting & Clock Bar */}
      <div
        className="rounded-2xl px-3.5 py-2 text-white shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs"
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, #341648 100%)`,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold">
            خوش آمدید، {currentUser?.gender === 'female' ? 'سرکار خانم' : currentUser?.gender === 'male' ? 'جناب آقای' : ''}{currentUser?.gender ? ' ' : ''}{currentUser?.name || 'مدیر محترم'}
          </span>
          <span className="opacity-60 text-[10px]">|</span>
          <span className="text-[11px] text-purple-200">
            {currentUser?.school_name || (isSenior ? 'مدیریت ارشد مجموعه' : 'مدیر مرکز')}
          </span>
        </div>
        <DashboardClock />
      </div>

      {/* 3. Compact Google Sheets & Excel Connection Bar */}
      <div className={`rounded-2xl px-3.5 py-2.5 border shadow-2xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 ${
        isConnectedToGoogleSheets
          ? 'bg-emerald-500/10 border-emerald-300/50'
          : 'bg-purple-500/5 border-purple-200/80'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isConnectedToGoogleSheets ? 'bg-emerald-600 text-white' : 'bg-purple-700 text-white'
          }`}>
            <Database className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#341648]">
              <span className="truncate">
                {'همگام‌سازی داده'}
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                isConnectedToGoogleSheets ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isConnectedToGoogleSheets ? 'متصل' : 'آفلاین'}
              </span>
            </div>
            {lastSyncTime && (
              <div className="text-[10px] text-gray-500">آخرین همگام‌سازی: {lastSyncTime}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          {/* Upload Excel Button */}
          <label className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-50 text-[#341648] border border-purple-200 text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all">
            <Upload className="w-3 h-3 text-emerald-600" />
            <span>بارگذاری اکسل</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleOfflineExcelUpload}
              className="hidden"
            />
          </label>

          {isConnectedToGoogleSheets ? (
            <button
              type="button"
              onClick={() => syncWithGoogleSheets()}
              disabled={syncStatus === 'syncing'}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'syncing' ? `همگام‌سازی (${toPersianDigits(syncProgress)}٪)` : 'همگام‌سازی'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => connectWithGoogle()}
              disabled={syncStatus === 'syncing'}
              className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
            >
              <Cloud className="w-3 h-3" />
              <span>اتصال ابری</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setCurrentScreen('settings')}
            className="p-1 rounded-lg bg-white/80 hover:bg-white text-gray-700 text-xs border border-gray-200"
            title="تنظیمات"
          >
            <Settings className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Progress Bar inside Dashboard Sync Card when actively syncing */}
      {syncStatus === 'syncing' && (
        <div className="rounded-xl p-2.5 bg-amber-50/90 border border-amber-200/90 space-y-1.5 text-xs animate-in fade-in duration-200" dir="rtl">
          <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-600 shrink-0" />
              <span>{syncStageText || 'در حال همگام‌سازی داده‌های ابری...'}</span>
            </div>
            <span className="font-mono tabular-nums text-xs font-black">{toPersianDigits(syncProgress)}٪</span>
          </div>
          <div className="w-full h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-purple-600 to-emerald-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${Math.max(6, syncProgress)}%` }}
            />
          </div>
        </div>
      )}

      {offlineSuccessNotice && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{offlineSuccessNotice}</span>
          </div>
          <button onClick={() => setOfflineSuccessNotice(null)} className="text-emerald-700 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Senior Review Pending Notification Banner */}
      {isSenior && pendingReviewCount > 0 && (
        <div className="p-3 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-400 rounded-2xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black flex items-center gap-1.5 text-amber-950">
                <span>{pendingReviewCount.toLocaleString('fa-IR')} تراکنش و هزینه جدید در انتظار تأیید شماست</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white animate-pulse">
                  نیاز به اقدام
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                توسط مدیران مدارس ثبت شده و برای اعمال قطعی و نمایش با رنگ سبز نیاز به تأیید مدیریت ارشد دارد.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentScreen('transactions')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>مشاهده و بررسی ({pendingReviewCount.toLocaleString('fa-IR')})</span>
          </button>
        </div>
      )}

      {/* Pending Manager Feedbacks for Senior Manager */}
      {isSenior && pendingFeedbackCount > 0 && (
        <div className="p-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border-2 border-purple-300 rounded-2xl text-purple-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black flex items-center gap-1.5 text-purple-950">
                <span>{pendingFeedbackCount.toLocaleString('fa-IR')} باگ و پیشنهاد جدید از مدیران مدارس</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-700 text-white">
                  صندوق نظرات
                </span>
              </div>
              <p className="text-[11px] text-purple-800 mt-0.5">
                همکاران مدارس گزارش‌ها، انتقادات یا پیشنهادات جدیدی ارسال کرده‌اند که نیاز به بررسی و پاسخ دارد.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              setCurrentScreen('feedback');
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            <span>مشاهده صندوق بازخوردها</span>
          </button>
        </div>
      )}

      {/* 4. Compact Quick Access Menu Grid (Less Scrolling) */}
      <div>
        <div className="text-xs font-bold text-[#341648] mb-2 flex items-center justify-between">
          <span>دسترسی سریع</span>
          <span className="text-[11px] text-gray-400 font-normal">بخش‌های پرکاربرد</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  playClickSound();
                  if (item.id === 'feedback_modal') {
                    setFeedbackModalDefaultTab('new');
                    setIsFeedbackModalOpen(true);
                  } else {
                    setCurrentScreen(item.id as ScreenType);
                  }
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] hover:shadow-xs active:scale-95 transition-all text-center min-h-[78px] group"
              >
                <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center mb-1 group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <span className="text-[11px] font-bold text-[#341648] leading-tight line-clamp-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      </>
      )}

      {overviewOnly && (
      <>
      {/* 5. Dedicated Comprehensive School Financial Status Box */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f2eaf3] gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-[#62205f]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#341648]">
                صورت وضعیت مالی و عملکرد {isSenior && selectedFinancialSchoolId === 0 ? 'کل مجموعه مدارس' : ''}
              </h3>
              <p className="text-[11px] text-gray-400">
                گزارش تفکیکی درآمدها، وصولی‌ها، بدهی‌ها و هزینه‌های عملیاتی
              </p>
            </div>
          </div>

          {/* Senior School Selector / Filter */}
          {isSenior ? (
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-xs text-gray-500 font-bold shrink-0">مرکز:</span>
              <select
                value={selectedFinancialSchoolId}
                onChange={(e) => setSelectedFinancialSchoolId(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-[#fcfaff] text-xs font-bold text-[#341648] focus:border-[#62205f] outline-hidden"
              >
                <option value={0}>همه مراکز و مهدها (کل مجموعه)</option>
                {schools.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs px-2.5 py-1 bg-purple-50 text-[#62205f] rounded-lg font-bold border border-purple-200">
              {currentUser?.school_name}
            </div>
          )}
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
            <div className="text-[11px] text-gray-500 font-medium">شهریه مصوب</div>
            <div className="text-sm sm:text-base font-black text-[#341648] mt-0.5 font-mono">
              {formatRial(financialMetrics.totalTuitionAssigned)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">ریال</div>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/60">
            <div className="text-[11px] text-emerald-800 font-medium">وصولی کل شهریه</div>
            <div className="text-sm sm:text-base font-black text-emerald-700 mt-0.5 font-mono">
              {formatRial(financialMetrics.totalTuitionCollected)}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">
              {financialMetrics.collectionRate}٪ وصول شده
            </div>
          </div>

          <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200/60">
            <div className="text-[11px] text-rose-800 font-medium">مانده بدهی معوقه</div>
            <div className="text-sm sm:text-base font-black text-rose-700 mt-0.5 font-mono">
              {formatRial(financialMetrics.totalOutstandingDebt)}
            </div>
            <div className="text-[10px] text-rose-600 mt-0.5">مطالبات از اولیا</div>
          </div>

          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/60">
            <div className="text-[11px] text-amber-900 font-medium">جمع کل هزینه‌ها</div>
            <div className="text-sm sm:text-base font-black text-amber-800 mt-0.5 font-mono">
              {formatRial(financialMetrics.totalExpenses)}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">عملیاتی و تن‌خواه</div>
          </div>
        </div>

        {/* Collection Rate Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600 font-medium">
            <span>درصد وصول شهریه‌های مصوب:</span>
            <span className="font-mono font-bold text-emerald-700">{financialMetrics.collectionRate}٪</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${financialMetrics.collectionRate}%` }}
            />
          </div>
        </div>

        {/* Charts & Expense Breakdown Sub-grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Comparison Bar Chart */}
          <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef] space-y-2">
            <div className="text-xs font-bold text-[#341648] flex items-center justify-between">
              <span>مقایسه وضعیت مالی (میلیون ریال)</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialMetrics.comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any) => [`${formatRial(Number(val) * 1000000)} ریال`, 'مبلغ']}
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', textAlign: 'right', direction: 'rtl' }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {financialMetrics.comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Categories Breakdown */}
          <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef] space-y-2 flex flex-col justify-between">
            <div className="text-xs font-bold text-[#341648] flex items-center justify-between">
              <span>تفکیک هزینه‌ها به سرفصل‌ها</span>
              <span className="text-[11px] text-gray-400 font-normal">
                {financialMetrics.expenseCategoryData.length} سرفصل هزینه
              </span>
            </div>

            {financialMetrics.expenseCategoryData.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                هزینه‌ای برای این مرکز ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {financialMetrics.expenseCategoryData.map((cat, idx) => {
                  const percent = financialMetrics.totalExpenses > 0
                    ? Math.round((cat.value / financialMetrics.totalExpenses) * 100)
                    : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-gray-100 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span className="truncate text-gray-800 font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="text-gray-500 text-[10px]">({percent}٪)</span>
                        <span className="font-bold text-amber-900">{cat.formatted}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      </>
      )}

      {overviewOnly && (
      <>
      {/* Tuition collection trend belongs with financial reports and debtors */}
      <TuitionMonthlyChart transactions={financialTxs} accentColor={accentColor} />

      {/* 6. Sortable Full Debtors List Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#f2eaf3] gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-[#341648]">لیست بدهکاران شهریه</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                  {debtorsList.length} دانش‌آموز بدهکار
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                پیگیری مطالبات اولیا و ثبت پرداخت شهریه
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-[#fcfaff] px-2 py-1 rounded-xl border border-gray-200 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={debtorSortBy}
                onChange={(e) => setDebtorSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-[#341648] outline-hidden cursor-pointer"
              >
                <option value="debt_desc">بیشترین بدهی (پیش‌فرض)</option>
                <option value="debt_asc">کمترین بدهی</option>
                <option value="name">نام دانش‌آموز (الفبا)</option>
                <option value="grade">پایه تحصیلی</option>
                <option value="school">نام مدرسه</option>
              </select>
            </div>

            <button
              onClick={() => setShowAllDebtors(!showAllDebtors)}
              className="text-xs font-bold text-[#62205f] hover:underline px-2 py-1"
              style={{ color: accentColor }}
            >
              {showAllDebtors ? 'نمایش خلاصه (۵ نفر)' : `مشاهده همه (${debtorsList.length} نفر)`}
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={debtorSearchQuery}
            onChange={(e) => setDebtorSearchQuery(e.target.value)}
            placeholder="جستجوی نام دانش‌آموز، کد ملی، نام مدرسه یا شماره تماس اولیا..."
            className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-[#fdfcfd] focus:border-[#62205f] outline-hidden"
          />
        </div>

        {displayedDebtors.length === 0 ? (
          <div className="p-5 text-center text-xs text-gray-400 bg-[#fcfaff] rounded-2xl border border-[#ede5ef]">
            هیچ دانش‌آموزی با شرایط انتخابی دارای بدهی معوقه نیست.
          </div>
        ) : (
          <div className="space-y-2">
            {displayedDebtors.map((item, idx) => (
              <div
                key={item.student.id}
                className="p-3 rounded-2xl border border-[#ede5ef] bg-[#fcfaff] hover:border-[#62205f]/40 hover:bg-white transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#341648] text-xs sm:text-sm">{item.student.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f2eaf3] text-[#62205f] font-semibold">
                        پایه {item.student.grade}
                      </span>
                      {isSenior && item.student.school_name && (
                        <span className="text-[10px] text-gray-400">({item.student.school_name})</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {item.student.father_phone && (
                        <span className="inline-flex items-center gap-1">
                          <span>پدر:</span>
                          <a href={`tel:${item.student.father_phone}`} className="font-mono text-blue-600 hover:underline">
                            {item.student.father_phone}
                          </a>
                        </span>
                      )}
                      {item.student.mother_phone && (
                        <span className="inline-flex items-center gap-1">
                          <span>مادر:</span>
                          <a href={`tel:${item.student.mother_phone}`} className="font-mono text-purple-600 hover:underline">
                            {item.student.mother_phone}
                          </a>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="text-right sm:text-left">
                    <div className="text-[10px] text-gray-400">مانده بدهی:</div>
                    <div className="font-mono font-black text-rose-700 text-xs sm:text-sm">
                      {formatRial(item.debt)} ریال
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setCurrentScreen('sms_reminders');
                      }}
                      className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-2xs active:scale-95 transition-all"
                      title="ارسال پیامک یادآوری بدهی"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </>
      )}

      {!overviewOnly && (
      <>
      {/* Quick invoice is now the first item in the Quick Access grid. */}

            {/* 8. Senior Only Section: Tuition Trend Chart + Management tools */}
      {isSenior && (
        <div className="pt-2 space-y-3">
          <div className="text-xs font-bold text-[#62205f] flex items-center gap-1.5" style={{ color: accentColor }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>بخش ویژه مدیریت ارشد مجموعه (سیدمهدی گلزاری)</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {seniorExtraItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    playClickSound();
                    setCurrentScreen(item.id as ScreenType);
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] hover:shadow-xs active:scale-95 transition-all text-center min-h-[75px] group"
                >
                  <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center mb-1 group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#341648] leading-tight line-clamp-1">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      </>
      )}

      {/* Direct Communication Modal with Senior Manager */}
      <ManagerFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        defaultTab={feedbackModalDefaultTab}
      />
    </div>
  );
};
