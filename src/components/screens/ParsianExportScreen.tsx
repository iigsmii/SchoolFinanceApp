import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import {
  generateParsianJournalEntries,
  exportParsianStandardExcel,
  exportParsianDisketteTxt,
  calculateTrialBalance,
  DEFAULT_PARSIAN_CODING,
} from '../../utils/parsian';
import { formatRial, jalaliFromGregorian, todayJalali } from '../../utils/jalali';
import { ParsianCodingConfig, ParsianJournalEntry } from '../../types';
import {
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Search,
  Settings2,
  Layers,
  Building2,
  Calendar,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

export const ParsianExportScreen: React.FC = () => {
  const {
    transactions,
    students,
    schools,
    categories,
    cheques,
    currentUser,
    accentColor,
    setCurrentScreen,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  // Coding configuration state (persisted in localStorage)
  const [codingConfig, setCodingConfig] = useState<ParsianCodingConfig>(() => {
    try {
      const saved = localStorage.getItem('parsian_coding_config');
      return saved ? JSON.parse(saved) : DEFAULT_PARSIAN_CODING;
    } catch {
      return DEFAULT_PARSIAN_CODING;
    }
  });

  const [activeTab, setActiveTab] = useState<'vouchers' | 'trial_balance' | 'coding_settings'>('vouchers');

  // Filter States
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 1
  );
  const [filterSource, setFilterSource] = useState<'all' | 'tuition_debt' | 'tuition_payment' | 'expense' | 'discount'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);

  // Success Feedback
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Generate double-entry journal vouchers
  const allEntries = useMemo(() => {
    return generateParsianJournalEntries(
      transactions,
      students,
      schools,
      categories,
      cheques,
      codingConfig
    );
  }, [transactions, students, schools, categories, cheques, codingConfig]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      // School filter
      if (selectedSchoolId > 0 && entry.school_id !== selectedSchoolId) {
        return false;
      }

      // Source filter
      if (filterSource !== 'all' && entry.source_type !== filterSource) {
        return false;
      }

      // Date range filter
      if (startDate && entry.date_jalali < startDate) {
        return false;
      }
      if (endDate && entry.date_jalali > endDate) {
        return false;
      }

      // Search query (matches description, tafsili, student, tracking)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSummary = entry.description.toLowerCase().includes(q);
        const matchesRows = entry.rows.some((r) =>
          r.description.toLowerCase().includes(q) ||
          r.tafsili_name.toLowerCase().includes(q) ||
          r.tafsili_code.includes(q) ||
          (r.tracking_code && r.tracking_code.toLowerCase().includes(q))
        );
        if (!matchesSummary && !matchesRows) return false;
      }

      return true;
    });
  }, [allEntries, selectedSchoolId, filterSource, startDate, endDate, searchQuery]);

  // Totals & Balancing metrics
  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    let balancedCount = 0;
    let unbalancedCount = 0;

    filteredEntries.forEach((e) => {
      debit += e.total_debit;
      credit += e.total_credit;
      if (e.is_balanced) balancedCount++;
      else unbalancedCount++;
    });

    const diff = Math.abs(debit - credit);

    return {
      debit,
      credit,
      diff,
      isBalanced: diff === 0,
      totalVouchers: filteredEntries.length,
      balancedCount,
      unbalancedCount,
    };
  }, [filteredEntries]);

  // Trial balance calculation
  const trialBalanceRows = useMemo(() => {
    return calculateTrialBalance(filteredEntries);
  }, [filteredEntries]);

  const handleExportExcel = () => {
    const schoolObj = schools.find((s) => s.id === selectedSchoolId);
    exportParsianStandardExcel(filteredEntries, {
      schoolName: schoolObj?.name || (selectedSchoolId === 0 ? 'کلیه مدارس مدرسة القرآن' : 'مدرسه'),
    });
  };

  const handleExportTxt = () => {
    exportParsianDisketteTxt(filteredEntries);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveCoding = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('parsian_coding_config', JSON.stringify(codingConfig));
    setSaveSuccessMsg('کدینگ استاندارد حسابداری پارسیان با موفقیت ذخیره شد.');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleResetCoding = () => {
    setCodingConfig(DEFAULT_PARSIAN_CODING);
    localStorage.removeItem('parsian_coding_config');
    setSaveSuccessMsg('کدینگ به مقادیر پیش‌فرض استاندارد بازگردانده شد.');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16 print:bg-white print:p-0">
      <div className="print:hidden">
        <Header title="خروجی اسناد حسابداری پارسیان" />
      </div>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
        {/* Print-Only Header */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-black">دفتر روزنامه و اسناد دوبل حسابداری (پارسیان)</h1>
          <p className="text-sm text-gray-600 mt-1">مدرسة القرآن الکریم - تاریخ گزارش: {todayJalali()}</p>
        </div>

        {/* Top Control & Action Bar */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#341648]">موتور اسناد دوبل و خروجی پارسیان</h2>
                  <p className="text-xs text-gray-500 mt-0.5">تبدیل خودکار تراکنش‌ها، شهریه‌ها، هزینه‌ها و چک‌ها به سند تراز پارسیان</p>
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>دانلود اکسل پارسیان (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleExportTxt}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-[#341648] border border-gray-300 text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                title="فایل متنی تب‌دار سازگار با دیسکت ورود اسناد پارسیان"
              >
                <FileText className="w-4 h-4 text-purple-700" />
                <span>فایل دیسکت (.txt)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span>چاپ اسناد</span>
              </button>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
            <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
              <div className="text-[11px] text-gray-500 font-medium">تعداد اسناد حسابداری</div>
              <div className="text-base font-black text-[#341648] mt-1 font-mono">
                {totals.totalVouchers.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-gray-500">سند</span>
              </div>
            </div>

            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/60">
              <div className="text-[11px] text-emerald-800 font-medium flex items-center justify-between">
                <span>وضعیت تراز سندها</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-sm font-black text-emerald-900 mt-1 flex items-center gap-1">
                <span>{totals.isBalanced ? 'کاملاً تراز (بدون مغایرت)' : 'دارای ناترازی'}</span>
              </div>
            </div>

            <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
              <div className="text-[11px] text-gray-500 font-medium">جمع کل بدهکار</div>
              <div className="text-sm font-black text-rose-700 mt-1 font-mono">
                {formatRial(totals.debit)} <span className="text-[10px] font-normal text-gray-500">ریال</span>
              </div>
            </div>

            <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
              <div className="text-[11px] text-gray-500 font-medium">جمع کل بستانکار</div>
              <div className="text-sm font-black text-emerald-700 mt-1 font-mono">
                {formatRial(totals.credit)} <span className="text-[10px] font-normal text-gray-500">ریال</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#e5dde8] pb-1 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('vouchers')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'vouchers'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:bg-white'
            }`}
            style={activeTab === 'vouchers' ? { backgroundColor: accentColor } : {}}
          >
            <BookOpen className="w-4 h-4" />
            <span>اسناد حسابداری دوبل ({filteredEntries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trial_balance')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'trial_balance'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:bg-white'
            }`}
            style={activeTab === 'trial_balance' ? { backgroundColor: accentColor } : {}}
          >
            <Layers className="w-4 h-4" />
            <span>تراز آزمایشی کل و معین ({trialBalanceRows.length} سرفصل)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coding_settings')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'coding_settings'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:bg-white'
            }`}
            style={activeTab === 'coding_settings' ? { backgroundColor: accentColor } : {}}
          >
            <Settings2 className="w-4 h-4" />
            <span>تنظیمات کدینگ پارسیان</span>
          </button>
        </div>

        {/* TAB 1: Vouchers List with Filters */}
        {activeTab === 'vouchers' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs space-y-3 print:hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* School Selector */}
                {isSenior && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">واحد آموزشی / مدرسه:</label>
                    <select
                      value={selectedSchoolId}
                      onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
                      className="w-full py-2 px-3 rounded-xl border border-gray-300 text-xs font-bold text-[#341648] bg-white"
                    >
                      <option value={0}>همه مدارس مجموعه ({schools.length} مرکز)</option>
                      {schools.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Source Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">نوع رویداد مالی:</label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
                    className="w-full py-2 px-3 rounded-xl border border-gray-300 text-xs font-bold text-[#341648] bg-white"
                  >
                    <option value="all">همه رویدادها</option>
                    <option value="tuition_debt">فقط بدهی‌های مصوب شهریه</option>
                    <option value="tuition_payment">فقط دریافتی‌های شهریه (کارتخوان/کارت/نقد)</option>
                    <option value="expense">فقط هزینه‌های جاری و تنخواه</option>
                    <option value="discount">فقط تخفیفات و بورسیه</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">جست‌وجوی سریع:</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="نام دانش‌آموز، کد ملی، پیگیری..."
                      className="w-full pl-3 pr-8 py-2 bg-white rounded-xl border border-gray-300 text-xs text-[#302735]"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Vouchers Table / Cards */}
            <div className="space-y-3">
              {filteredEntries.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center text-gray-400 border border-[#e5dde8]">
                  هیچ سند حسابداری با شرایط فیلتر انتخاب‌شده یافت نشد.
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const isExpanded = expandedDoc === entry.doc_number;

                  return (
                    <div
                      key={entry.doc_number}
                      className="bg-white rounded-2xl border border-[#e5dde8] shadow-2xs overflow-hidden transition-all hover:border-purple-300"
                    >
                      {/* Document Header Bar */}
                      <div
                        onClick={() => setExpandedDoc(isExpanded ? null : entry.doc_number)}
                        className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer bg-[#fcfaff] hover:bg-purple-50/40 select-none border-b border-gray-100"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2.5 py-1 rounded-lg bg-[#62205f] text-white text-xs font-mono font-black shadow-2xs">
                            سند #{entry.doc_number}
                          </span>
                          <span className="text-xs font-bold text-gray-600 font-mono">
                            {entry.date_jalali}
                          </span>
                          <span className="text-xs font-bold text-[#341648] truncate">
                            {entry.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-black text-gray-800">
                            مبلغ: {formatRial(entry.total_debit)} ریال
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>تراز</span>
                          </span>
                          <span className="text-[11px] font-bold text-purple-700">
                            {isExpanded ? 'بستن آرتیکل‌ها ▴' : 'مشاهده آرتیکل‌ها ▾'}
                          </span>
                        </div>
                      </div>

                      {/* Double-Entry Voucher Rows */}
                      <div className={`p-3 sm:p-4 overflow-x-auto ${isExpanded ? 'block' : 'hidden sm:block'}`}>
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-500 font-bold bg-gray-50/80">
                              <th className="py-2 px-2.5 w-10">ردیف</th>
                              <th className="py-2 px-2.5">کد کل / معین</th>
                              <th className="py-2 px-2.5">عنوان سرفصل حسابداری</th>
                              <th className="py-2 px-2.5">کد و نام تفصیلی (طرف‌حساب)</th>
                              <th className="py-2 px-2.5">شرح ردیف سند</th>
                              <th className="py-2 px-2.5 text-left">بدهکار (ریال)</th>
                              <th className="py-2 px-2.5 text-left">بستانکار (ریال)</th>
                              <th className="py-2 px-2.5">پیگیری</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {entry.rows.map((row) => {
                              const isDebit = row.debit > 0;
                              return (
                                <tr key={row.row_number} className="hover:bg-gray-50/60">
                                  <td className="py-2 px-2.5 text-gray-400 font-mono">{row.row_number}</td>
                                  <td className="py-2 px-2.5 font-mono text-purple-900 font-bold">
                                    {row.kol_code}-{row.moeen_code}
                                  </td>
                                  <td className="py-2 px-2.5 font-bold text-[#341648]">
                                    <div className="text-[11px] text-gray-400">{row.kol_name}</div>
                                    <div>{row.moeen_name}</div>
                                  </td>
                                  <td className="py-2 px-2.5">
                                    <div className="font-bold text-gray-800">{row.tafsili_name}</div>
                                    <div className="font-mono text-[10px] text-gray-400">{row.tafsili_code}</div>
                                  </td>
                                  <td className="py-2 px-2.5 text-gray-600 max-w-xs truncate" title={row.description}>
                                    {row.description}
                                  </td>
                                  <td className="py-2 px-2.5 text-left font-mono font-bold text-rose-700">
                                    {row.debit > 0 ? formatRial(row.debit) : '—'}
                                  </td>
                                  <td className="py-2 px-2.5 text-left font-mono font-bold text-emerald-700">
                                    {row.credit > 0 ? formatRial(row.credit) : '—'}
                                  </td>
                                  <td className="py-2 px-2.5 font-mono text-gray-500 text-[11px]">
                                    {row.tracking_code || '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-300 font-black bg-purple-50/50">
                              <td colSpan={5} className="py-2 px-2.5 text-[#341648]">جمع سند #{entry.doc_number}:</td>
                              <td className="py-2 px-2.5 text-left font-mono text-rose-800 font-black">{formatRial(entry.total_debit)}</td>
                              <td className="py-2 px-2.5 text-left font-mono text-emerald-800 font-black">{formatRial(entry.total_credit)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Trial Balance (تراز آزمایشی) */}
        {activeTab === 'trial_balance' && (
          <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#341648]">تراز آزمایشی حساب‌های کل و معین (۴ ستونی)</h3>
                <p className="text-xs text-gray-500 mt-0.5">گردش بدهکار/بستانکار و مانده نهایی سرفصل‌های فعال</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-bold bg-[#fcfaff]">
                    <th className="py-2.5 px-3">کد کل</th>
                    <th className="py-2.5 px-3">کد معین</th>
                    <th className="py-2.5 px-3">نام سرفصل حسابداری</th>
                    <th className="py-2.5 px-3 text-left">گردش بدهکار (ریال)</th>
                    <th className="py-2.5 px-3 text-left">گردش بستانکار (ریال)</th>
                    <th className="py-2.5 px-3 text-left">مانده بدهکار (ریال)</th>
                    <th className="py-2.5 px-3 text-left">مانده بستانکار (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {trialBalanceRows.map((row) => (
                    <tr key={`${row.kol_code}-${row.moeen_code}`} className="hover:bg-purple-50/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-purple-900">{row.kol_code}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-700">{row.moeen_code}</td>
                      <td className="py-2.5 px-3 font-bold text-[#341648]">
                        <span className="text-gray-400 text-[10px] ml-1">({row.kol_name})</span>
                        {row.moeen_name}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono text-rose-700">{formatRial(row.total_debit)}</td>
                      <td className="py-2.5 px-3 text-left font-mono text-emerald-700">{formatRial(row.total_credit)}</td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-900">
                        {row.balance_debit > 0 ? formatRial(row.balance_debit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-900">
                        {row.balance_credit > 0 ? formatRial(row.balance_credit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-black bg-purple-50/60 text-xs">
                    <td colSpan={3} className="py-3 px-3 text-[#341648]">جمع کل تراز آزمایشی:</td>
                    <td className="py-3 px-3 text-left font-mono text-rose-800">{formatRial(totals.debit)}</td>
                    <td className="py-3 px-3 text-left font-mono text-emerald-800">{formatRial(totals.credit)}</td>
                    <td colSpan={2} className="py-3 px-3 text-center text-emerald-700 font-bold">
                      {totals.isBalanced ? '✓ تراز متوازن' : '⚠ عدم توازن'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Chart of Accounts Configuration */}
        {activeTab === 'coding_settings' && (
          <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-black text-[#341648]">کدینگ استاندارد حساب‌های کل در نرم‌افزار پارسیان</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                می‌توانید کدهای کل حسابداری را مطابق با درخت حساب‌های تعریف‌شده در نرم‌افزار پارسیان مدرسه خود تغییر دهید.
                سرفصل‌های هزینه‌ها و مدارس به صورت خودکار به عنوان کدهای معین و تفصیلی زیرمجموعه این کدهای کل قرار می‌گیرند.
              </p>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCoding} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل حساب‌های دریافتنی (دانش‌آموزان)
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_receivable}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_receivable: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان: 11 (بدهکاران تجاری / حساب‌های دریافتنی)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل موجودی نقد و بانک / صندوق
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_bank}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_bank: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان: 10 (موجودی نقد و بانک)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل درآمد شهریه و آموزش
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_income}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_income: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان: 70 (درآمدهای عملیاتی و شهریه)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل هزینه‌های اداری، عمومی و آموزشی
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_expense}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_expense: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان: 60 (هزینه‌های عمومی و اداری)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل اسناد دریافتنی (چک‌های صیادی نزد صندوق)
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_cheques}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_cheques: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان: 12 (اسناد دریافتنی تجاری)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل تنخواه‌گردان مدیران مدارس
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_petty_cash}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_petty_cash: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان: 20 (تنخواه‌گردان‌ها / سایر دریافتنی‌ها)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل تخفیفات و بورسیه شهریه
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_discount}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_discount: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان: 71 (برگشت از درآمد و تخفیفات)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
                >
                  ذخیره تنظیمات کدینگ
                </button>
                <button
                  type="button"
                  onClick={handleResetCoding}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all"
                >
                  بازنشانی به پیش‌فرض
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step-by-Step Parsian Import Help Guide */}
        <div className="bg-[#fcfaff] rounded-3xl p-5 border border-[#ede5ef] space-y-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-black text-[#341648]">
            <HelpCircle className="w-4 h-4 text-purple-700" />
            <span>راهنمای فراخوانی مستقیم فایل اکسل در نرم‌افزار حسابداری پارسیان:</span>
          </div>
          <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside leading-relaxed pr-1">
            <li>روی دکمه سبز رنگ <strong>«دانلود اکسل پارسیان (.xlsx)»</strong> در بالای همین صفحه کلیک کنید.</li>
            <li>در نرم‌افزار پارسیان، وارد منوی <strong>«عملیات حسابداری» ⬅️ «ورود اسناد از فایل اکسل یا دیسکت»</strong> شوید.</li>
            <li>فایل دانلودشده را انتخاب نموده و تطبیق ستون‌ها را بر اساس ردیف اول تأیید فرمایید؛ تمامی اسناد به صورت دوبل، تراز و با تفصیلی کد ملی دانش‌آموزان ثبت خواهند شد.</li>
          </ol>
        </div>
      </main>
    </div>
  );
};
