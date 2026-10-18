import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DashboardClock } from '../DashboardClock';
import { TuitionMonthlyChart } from '../TuitionMonthlyChart';
import { QuickInvoiceModal } from '../QuickInvoiceModal';
import { InvoicePrintModal } from '../InvoicePrintModal';
import {
  Users, CreditCard, Receipt, ArrowLeftRight, BookOpen, Wallet, BarChart3,
  ClipboardList, Settings, Building2, UserCog, FileSpreadsheet, Megaphone,
  Landmark, AlertTriangle, ChevronLeft, AlertCircle, PhoneCall, FileText,
  Sparkles, Cloud, Database, RefreshCw, CheckCircle2, MessageSquare,
  GraduationCap, Upload, X, ArrowUpDown,
} from 'lucide-react';
import { ScreenType, Student } from '../../types';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';

export const DashboardScreen: React.FC = () => {
  const {
    currentUser, setCurrentScreen, accentColor, students, transactions, cheques,
    schools, seniorMessages, getStudentBalance, isConnectedToGoogleSheets,
    spreadsheetId, syncStatus, syncError, lastSyncTime, syncWithGoogleSheets,
    connectWithGoogle, loadOfflineExcel,
  } = useApp();
  const [offlineSuccessNotice, setOfflineSuccessNotice] = useState<string | null>(null);
  const [isQuickInvoiceOpen, setIsQuickInvoiceOpen] = useState(false);
  const [invoiceStudent, setInvoiceStudent] = useState<Student | null>(null);
  const [debtorSort, setDebtorSort] = useState<'debt' | 'name'>('debt');

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const userStudents = isSenior ? students : students.filter((s) => s.school_id === currentUser?.school_id);
  const relevantTxs = isSenior
    ? transactions
    : transactions.filter((t) => t.school_id === currentUser?.school_id);
  const activeStudentsCount = userStudents.filter((s) => s.active).length;
  const totalDebt = relevantTxs.filter((t) => t.kind === 'شهریه_بدهی').reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalPaid = relevantTxs.filter((t) => t.kind === 'شهریه').reduce((sum, t) => sum + (t.credit || 0), 0);
  const netOutstandingDebt = Math.max(0, totalDebt - totalPaid);
  const expenseTransactions = relevantTxs.filter((t) => t.kind === 'هزینه');
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  const debtors = userStudents
    .map((student) => ({ student, debt: getStudentBalance(student.id).balance }))
    .filter((item) => item.debt > 0)
    .sort((a, b) => debtorSort === 'name'
      ? a.student.name.localeCompare(b.student.name, 'fa')
      : b.debt - a.debt);

  const schoolFinancialSummaries = isSenior ? schools.map((school) => {
    const schoolTxs = transactions.filter((t) => t.school_id === school.id);
    const billed = schoolTxs.filter((t) => t.kind === 'شهریه_بدهی').reduce((sum, t) => sum + (t.debit || 0), 0);
    const paid = schoolTxs.filter((t) => t.kind === 'شهریه').reduce((sum, t) => sum + (t.credit || 0), 0);
    const expenses = schoolTxs.filter((t) => t.kind === 'هزینه').reduce((sum, t) => sum + (t.amount || 0), 0);
    return { school, debt: Math.max(0, billed - paid), expenses, hasData: billed > 0 || paid > 0 || expenses > 0 };
  }).filter((item) => item.hasData) : [];

  const pendingCheques = cheques.filter((c) => c.status === 'pending');
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 10);
  const dueSoonCheques = cheques.filter((c) => {
    if (c.status !== 'approved') return false;
    const dueDate = new Date(c.due_date);
    return dueDate >= now && dueDate <= nextWeek;
  });

  const handleOfflineExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await loadOfflineExcel(file);
    if (ok) setOfflineSuccessNotice('اطلاعات با موفقیت از فایل اکسل بارگذاری شد.');
    e.target.value = '';
  };

  const menuItems = [
    { id: 'students', label: 'دانش‌آموزان', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'tuition', label: 'دریافت شهریه', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'staff', label: 'معلمان و پرسنل', icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'sms_reminders', label: 'سامانه پیامک', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'cheque_list', label: 'لیست چک‌ها', icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'expenses', label: 'هزینه‌ها', icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'transactions', label: 'تراکنش‌ها', icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'statement', label: 'ریز گردش حساب', icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'claim', label: 'طلب من از مدرسه', icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'report', label: 'گزارش مالی', icon: BarChart3, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'activity', label: 'گزارش فعالیت', icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'settings', label: 'تنظیمات', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
  ];
  const seniorExtraItems = [
    { id: 'staff', label: 'حقوق و بیمه معلمان', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'cheques', label: 'چک صیادی (تأیید)', icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'bank', label: 'تطبیق بانک', icon: Landmark, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'managers', label: 'مدیران', icon: UserCog, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'schools', label: 'مدارس', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'export', label: 'خروجی پارسیان', icon: FileSpreadsheet, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'messages', label: 'پیام به مدیران', icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <section className="rounded-2xl px-4 py-3 text-white shadow-md border border-amber-400/30" style={{ background: 'linear-gradient(135deg, #2a0b33 0%, #4a1550 55%, #200827 100%)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
            <h1 className="text-sm sm:text-base font-black text-amber-100 whitespace-nowrap">مدرسة القرآن الکریم شهرضا</h1>
            <span className="hidden sm:inline text-xs text-purple-200">| سیستم مالی</span>
          </div>
          <button type="button" onClick={() => setCurrentScreen('settings')} className="shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20" title="تنظیمات">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </section>

      <section className="rounded-2xl px-4 py-3 text-white shadow-md" style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #341648 100%)` }}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap min-w-0">
            <h2 className="text-base sm:text-lg font-black">خوش آمدید، {currentUser?.name || 'مدیر محترم'}</h2>
            {!isSenior && currentUser?.school_name && <span className="text-[11px] text-purple-100">{currentUser.school_name}</span>}
            <span className="text-[10px] text-purple-100/80">{isSenior ? 'کاربر ارشد' : 'مدیر مدرسه'}</span>
          </div>
          <DashboardClock />
        </div>
      </section>

      <section className={`rounded-2xl px-3 py-2.5 border shadow-xs ${isConnectedToGoogleSheets ? 'bg-emerald-50/70 border-emerald-200' : 'bg-purple-50/70 border-purple-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${isConnectedToGoogleSheets ? 'bg-emerald-600' : 'bg-purple-700'}`}>
              {isConnectedToGoogleSheets ? <CheckCircle2 className="w-4 h-4" /> : <Database className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#341648] truncate">{isConnectedToGoogleSheets ? 'متصل به Google Sheets' : 'اتصال به Google Sheets'}</div>
              <div className="text-[10px] text-gray-500 truncate">
                {isConnectedToGoogleSheets
                  ? `شیت ${spreadsheetId.substring(0, 10)}…${lastSyncTime ? ` | آخرین همگام‌سازی ${lastSyncTime}` : ''}`
                  : 'وضعیت اتصال و ورود داده'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="px-2.5 py-2 rounded-lg bg-white text-[#341648] border border-purple-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-purple-50">
              <Upload className="w-3.5 h-3.5 text-emerald-600" /> بارگذاری Excel
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleOfflineExcelUpload} className="hidden" />
            </label>
            <button type="button" onClick={() => isConnectedToGoogleSheets ? syncWithGoogleSheets() : connectWithGoogle()} disabled={syncStatus === 'syncing'} className="px-2.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-60">
              {syncStatus === 'syncing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isConnectedToGoogleSheets ? <RefreshCw className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
              {syncStatus === 'syncing' ? 'در حال اتصال' : isConnectedToGoogleSheets ? 'همگام‌سازی' : 'اتصال گوگل'}
            </button>
          </div>
        </div>
        {syncError && <div className="mt-2 px-2.5 py-2 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[11px] flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{syncError}</div>}
        {offlineSuccessNotice && <div className="mt-2 px-2.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] flex items-center justify-between gap-2"><span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{offlineSuccessNotice}</span><button onClick={() => setOfflineSuccessNotice(null)} aria-label="بستن"><X className="w-4 h-4" /></button></div>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-bold text-[#341648]">دسترسی سریع</h3><span className="text-[11px] text-gray-400">بخش‌های پرکاربرد</span></div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => setCurrentScreen(item.id as ScreenType)} className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] hover:shadow-sm active:scale-95 transition-all text-center group min-h-[82px]">
              <span className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center mb-1.5`}><Icon className={`w-5 h-5 ${item.color}`} /></span>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#341648] leading-tight">{item.label}</span>
            </button>;
          })}
        </div>
      </section>

      {isSenior && <section>
        <h3 className="text-sm font-bold text-[#62205f] mb-2" style={{ color: accentColor }}>بخش ویژه مدیریت ارشد مجموعه</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {seniorExtraItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => setCurrentScreen(item.id as ScreenType)} className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] hover:shadow-sm active:scale-95 transition-all text-center min-h-[76px]">
              <span className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center mb-1`}><Icon className={`w-4 h-4 ${item.color}`} /></span>
              <span className="text-[10px] font-bold text-[#341648] leading-tight">{item.label}</span>
            </button>;
          })}
        </div>
      </section>}

      <section className="bg-white rounded-2xl p-3 sm:p-4 border border-[#e5dde8] shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-bold text-gray-600">وضعیت مالی</h3>
          <button onClick={() => setCurrentScreen('report')} className="text-[11px] font-bold text-[#62205f] hover:underline" style={{ color: accentColor }}>مشاهده گزارش مالی</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-[#fcfaff] p-3 rounded-xl border border-[#ede5ef] flex items-center justify-between"><div><div className="text-[11px] text-gray-500">دانش‌آموزان فعال</div><div className="text-lg font-black text-[#341648] mt-0.5">{activeStudentsCount} <span className="text-[10px] font-normal text-gray-500">نفر</span></div></div><Users className="w-5 h-5 text-[#62205f]" style={{ color: accentColor }} /></div>
          <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100 flex items-center justify-between"><div><div className="text-[11px] text-gray-500">بدهی باقی‌مانده شهریه</div><div className="text-base font-black text-rose-700 mt-0.5">{formatRial(netOutstandingDebt)} <span className="text-[10px] font-normal">ریال</span></div></div><CreditCard className="w-5 h-5 text-rose-600" /></div>
          <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 flex items-center justify-between"><div><div className="text-[11px] text-gray-500">جمع هزینه‌های ثبت‌شده</div><div className="text-base font-black text-purple-900 mt-0.5">{formatRial(totalExpenses)} <span className="text-[10px] font-normal">ریال</span></div></div><Receipt className="w-5 h-5 text-purple-600" /></div>
        </div>
      </section>

      {isSenior && schoolFinancialSummaries.length > 0 && <section className="bg-white rounded-2xl p-3 sm:p-4 border border-[#e5dde8] shadow-xs">
        <h3 className="text-xs font-bold text-[#341648] mb-3">صورت‌وضعیت مدارس، به تفکیک</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {schoolFinancialSummaries.map(({ school, debt, expenses }) => <button key={school.id} onClick={() => setCurrentScreen('report')} className="text-right p-3 rounded-xl bg-[#fcfaff] border border-[#ede5ef] hover:border-purple-300">
            <span className="block text-xs font-bold text-[#341648] truncate">{school.name}</span>
            <span className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-gray-500"><span>بدهی: <b className="text-rose-700">{formatRial(debt)} ریال</b></span><span>هزینه: <b className="text-purple-800">{formatRial(expenses)} ریال</b></span></span>
          </button>)}
        </div>
      </section>}

      <section className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-300/50 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}><Sparkles className="w-5 h-5 text-amber-300" /></span><div><h3 className="text-sm font-black text-[#341648]">صدور سریع فاکتور شهریه</h3><p className="text-[10px] text-gray-500">انتخاب دانش‌آموز و چاپ فاکتور</p></div></div>
        <button onClick={() => setIsQuickInvoiceOpen(true)} className="w-full sm:w-auto px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2" style={{ backgroundColor: accentColor }}><FileText className="w-4 h-4" />صدور فاکتور</button>
      </section>

      {isSenior && <TuitionMonthlyChart transactions={relevantTxs} accentColor={accentColor} />}

      <section className="bg-white rounded-2xl p-3 sm:p-4 border border-[#e5dde8] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-[#f2eaf3]">
          <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-rose-600" /><div><h3 className="text-sm font-bold text-[#341648]">فهرست بدهکاران ({debtors.length})</h3><p className="text-[10px] text-gray-400">مرتب‌سازی و پیگیری بدهی شهریه</p></div></div>
          <label className="flex items-center gap-1.5 text-[10px] text-gray-500"><ArrowUpDown className="w-3.5 h-3.5" />مرتب‌سازی<select value={debtorSort} onChange={(e) => setDebtorSort(e.target.value as 'debt' | 'name')} className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-[#341648]"><option value="debt">بیشترین بدهی</option><option value="name">نام دانش‌آموز</option></select></label>
        </div>
        {debtors.length === 0 ? <div className="p-5 text-center text-xs text-gray-400 bg-[#fcfaff] rounded-xl">دانش‌آموز بدهکار ثبت نشده است.</div> : <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
          {debtors.map((item, idx) => <div key={item.student.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0"><span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2"><span className="text-xs font-bold text-[#341648]">{item.student.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f2eaf3] text-[#62205f]">پایه {item.student.grade}</span>{isSenior && <span className="text-[10px] text-gray-400">{item.student.school_name}</span>}</div><div className="text-[10px] text-gray-400 flex flex-wrap gap-x-3 mt-0.5"><span>کد ملی: {item.student.national_id}</span><a href={`tel:${item.student.phone}`} className="text-blue-600 flex items-center gap-1" dir="ltr"><PhoneCall className="w-3 h-3" />{item.student.phone}</a></div></div></div>
            <div className="flex items-center gap-2"><span className="text-[11px] font-black text-rose-700">{formatRial(item.debt)} ریال</span><button onClick={() => setInvoiceStudent(item.student)} className="px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 text-[10px] font-bold text-[#62205f]">فاکتور</button><button onClick={() => setCurrentScreen('tuition')} className="px-2 py-1 rounded-lg border border-[#e5dde8] bg-white text-[10px] font-bold text-[#62205f]">ثبت واریز</button></div>
          </div>)}
        </div>}
      </section>

      {(isSenior && pendingCheques.length > 0 || dueSoonCheques.length > 0 || seniorMessages.length > 0) && <section className="space-y-2">
        {isSenior && pendingCheques.length > 0 && <button onClick={() => setCurrentScreen('cheques')} className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-amber-900 text-xs font-bold"><span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />{pendingCheques.length} چک در انتظار بررسی</span><ChevronLeft className="w-4 h-4" /></button>}
        {dueSoonCheques.length > 0 && <button onClick={() => setCurrentScreen('cheque_list')} className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-blue-900 text-xs font-bold"><span>{dueSoonCheques.length} چک تأییدشده در ۱۰ روز آینده سررسید می‌شود</span><ChevronLeft className="w-4 h-4" /></button>}
        {seniorMessages.length > 0 && <div className="bg-white border border-[#e5dde8] rounded-xl p-3"><div className="text-xs font-bold text-[#62205f] flex items-center gap-1.5 mb-2" style={{ color: accentColor }}><Megaphone className="w-4 h-4" />پیام‌های مدیریت ارشد</div><div className="space-y-2">{seniorMessages.slice(0, 2).map((msg) => <div key={msg.id} className="bg-[#fcfaff] p-2.5 rounded-lg border border-[#f0e8f2] text-[11px]"><p className="font-semibold text-[#302735] leading-relaxed">{msg.message}</p><div className="text-[10px] text-gray-400 mt-1 flex justify-between"><span>{msg.author_name}</span><span>{jalaliFromGregorian(msg.created_at)}</span></div></div>)}</div></div>}
      </section>}

      <QuickInvoiceModal isOpen={isQuickInvoiceOpen} onClose={() => setIsQuickInvoiceOpen(false)} onIssueInvoice={(st) => setInvoiceStudent(st)} />
      {invoiceStudent && <InvoicePrintModal student={invoiceStudent} transactions={transactions} balance={getStudentBalance(invoiceStudent.id).balance} onClose={() => setInvoiceStudent(null)} />}
    </div>
  );
};
