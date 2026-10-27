import React, { useState, useMemo, useDeferredValue } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { matchTokens } from '../../utils/studentSearch';
import {
  generateParsianJournalEntries,
  exportParsianStandardExcel,
  exportParsianDisketteTxt,
  calculateTrialBalance,
  exportParsianTreeExcel,
  DEFAULT_PARSIAN_CODING,
} from '../../utils/parsian';
import {
  PARSIAN_ACCOUNTS_TREE,
  SCHOOL_PARSIAN_MAPPINGS,
  ParsianKolAccount,
} from '../../data/parsianTreeData';
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
  FolderTree,
  ChevronDown,
  ChevronLeft,
  Users,
  GraduationCap,
  Sparkles,
  School as SchoolIcon,
  X,
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

  const [activeTab, setActiveTab] = useState<'vouchers' | 'tree_explorer' | 'trial_balance' | 'coding_settings'>('vouchers');

  // Tree Explorer State
  const [treeSearch, setTreeSearch] = useState('');
  const [selectedTreeCategory, setSelectedTreeCategory] = useState<string>('all');
  const [expandedKols, setExpandedKols] = useState<Set<string>>(() => new Set(['67', '40', '68', '10', '11']));
  const [treeSubTab, setTreeSubTab] = useState<'tree' | 'mapping'>('tree');

  // Filter States
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 1
  );
  const [filterSource, setFilterSource] = useState<'all' | 'tuition_debt' | 'tuition_payment' | 'expense' | 'discount'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
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

      // Search query (supports Persian/English digits, tafsili, student, tracking)
      if (deferredQuery.trim()) {
        const rowsText = entry.rows.map((r) => `${r.description} ${r.tafsili_name} ${r.tafsili_code} ${r.tracking_code || ''}`).join(' ');
        const combined = `${entry.description} ${rowsText}`;
        if (!matchTokens(combined, deferredQuery)) return false;
      }

      return true;
    });
  }, [allEntries, selectedSchoolId, filterSource, startDate, endDate, deferredQuery]);

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

  // Tree Explorer Handlers and Memos
  const toggleKol = (code: string) => {
    setExpandedKols((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAllKols = () => {
    setExpandedKols(new Set(PARSIAN_ACCOUNTS_TREE.map((a) => a.code)));
  };

  const collapseAllKols = () => {
    setExpandedKols(new Set());
  };

  const handleExportTree = () => {
    exportParsianTreeExcel(PARSIAN_ACCOUNTS_TREE, SCHOOL_PARSIAN_MAPPINGS);
  };

  const treeCategories = useMemo(() => {
    const set = new Set<string>();
    PARSIAN_ACCOUNTS_TREE.forEach((a) => set.add(a.category));
    return Array.from(set);
  }, []);

  const filteredTreeAccounts = useMemo(() => {
    let list = PARSIAN_ACCOUNTS_TREE;
    if (selectedTreeCategory !== 'all') {
      list = list.filter((a) => a.category === selectedTreeCategory);
    }
    if (treeSearch.trim()) {
      const q = treeSearch.toLowerCase().trim();
      list = list.filter((a) => {
        const matchKol = a.name.toLowerCase().includes(q) || a.code.includes(q) || a.category.toLowerCase().includes(q);
        const matchMoeens = a.moeens.some((m) =>
          m.name.toLowerCase().includes(q) ||
          m.code.includes(q) ||
          (m.sample_tafsilis && m.sample_tafsilis.some((s) => s.toLowerCase().includes(q)))
        );
        return matchKol || matchMoeens;
      });
    }
    return list;
  }, [selectedTreeCategory, treeSearch]);

  const totalTreeTafsilis = useMemo(() => {
    return PARSIAN_ACCOUNTS_TREE.reduce((acc, a) => acc + (a.total_tafsilis || 0), 0);
  }, []);

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
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e5dde8] pb-1 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('vouchers')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
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
            onClick={() => setActiveTab('tree_explorer')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'tree_explorer'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:bg-white'
            }`}
            style={activeTab === 'tree_explorer' ? { backgroundColor: accentColor } : {}}
          >
            <FolderTree className="w-4 h-4" />
            <span>درخت‌واره کدینگ پارسیان (۴۳ کل / ۱٬۲۷۱ تفصیلی)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trial_balance')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
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
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
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

        {/* TAB 2: Parsian Accounting Tree Explorer (درخت‌واره کدینگ پارسیان) */}
        {activeTab === 'tree_explorer' && (
          <div className="space-y-4">
            {/* Top Overview & Action Banner */}
            <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shadow-2xs">
                      <FolderTree className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#341648]">درخت‌واره کدینگ حسابداری پارسیان مجموعه</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span>۴۳ حساب کل</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{totalTreeTafsilis.toLocaleString('fa-IR')} حساب تفصیلی فعال</span>
                        <span aria-hidden="true">·</span>
                        <span>۱۱ واحد آموزشی و پیش‌دبستانی متصل</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportTree}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود اکسل درخت‌واره (.xlsx)</span>
                  </button>

                  <div className="flex items-center p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTreeSubTab('tree')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        treeSubTab === 'tree'
                          ? 'bg-white text-[#341648] shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      نمای درختی حساب‌ها
                    </button>
                    <button
                      type="button"
                      onClick={() => setTreeSubTab('mapping')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        treeSubTab === 'mapping'
                          ? 'bg-white text-[#341648] shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      نقشه تطبیق مدارس ۱۱ گانه
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-gray-100">
                <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
                  <div className="text-[11px] text-gray-500 font-medium">گردش شهریه (کل ۶۷)</div>
                  <div className="text-base font-black text-purple-900 mt-1 font-mono">
                    ۱٬۱۳۸ <span className="text-[10px] font-normal text-gray-500">دانش‌آموز تفصیلی</span>
                  </div>
                </div>

                <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
                  <div className="text-[11px] text-gray-500 font-medium">هزینه‌های تفکیک‌شده (۶۸ تا ۸۱)</div>
                  <div className="text-base font-black text-purple-900 mt-1 font-mono">
                    ۱۳۳ <span className="text-[10px] font-normal text-gray-500">پرسنل و معلم تفصیلی</span>
                  </div>
                </div>

                <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
                  <div className="text-[11px] text-gray-500 font-medium">درآمدهای شهریه و خیرین (کل ۴۰)</div>
                  <div className="text-base font-black text-purple-900 mt-1 font-mono">
                    ۱۴ <span className="text-[10px] font-normal text-gray-500">معین درآمد تفکیکی</span>
                  </div>
                </div>

                <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef]">
                  <div className="text-[11px] text-gray-500 font-medium">حساب‌های بانکی و صندوق</div>
                  <div className="text-base font-black text-purple-900 mt-1 font-mono">
                    ۷ <span className="text-[10px] font-normal text-gray-500">معین بانک و تنخواه</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SUB-TAB 1: TREE VIEW */}
            {treeSubTab === 'tree' && (
              <div className="space-y-4">
                {/* Search & Filters */}
                <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs space-y-3">
                  <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={treeSearch}
                        onChange={(e) => setTreeSearch(e.target.value)}
                        placeholder="جستجو در کد کل، نام حساب، معین، یا اسامی تفصیلی دانش‌آموزان و معلمان..."
                        className="w-full pr-10 pl-9 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden transition-all bg-gray-50/50 focus:bg-white"
                      />
                      {treeSearch && (
                        <button
                          type="button"
                          onClick={() => setTreeSearch('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                      <button
                        type="button"
                        onClick={expandAllKols}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        باز کردن همه
                      </button>
                      <button
                        type="button"
                        onClick={collapseAllKols}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        بستن همه
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-gray-100 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedTreeCategory('all')}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
                        selectedTreeCategory === 'all'
                          ? 'bg-[#62205f] text-white font-bold'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={selectedTreeCategory === 'all' ? { backgroundColor: accentColor } : {}}
                    >
                      همه سرفصل‌ها ({PARSIAN_ACCOUNTS_TREE.length})
                    </button>
                    {treeCategories.map((cat) => {
                      const count = PARSIAN_ACCOUNTS_TREE.filter((a) => a.category === cat).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedTreeCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
                            selectedTreeCategory === cat
                              ? 'bg-[#62205f] text-white font-bold'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          style={selectedTreeCategory === cat ? { backgroundColor: accentColor } : {}}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tree Nodes List */}
                <div className="space-y-3">
                  {filteredTreeAccounts.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-[#e5dde8]">
                      <FolderTree className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <div className="text-sm font-bold text-gray-700">هیچ سرفصلی با این مشخصات یافت نشد</div>
                      <p className="text-xs text-gray-400 mt-1">عبارت جستجو یا فیلتر دسته‌بندی را تغییر دهید.</p>
                    </div>
                  ) : (
                    filteredTreeAccounts.map((kol) => {
                      const isExpanded = expandedKols.has(kol.code);
                      const hasTafsilis = kol.total_tafsilis > 0;
                      return (
                        <div
                          key={kol.code}
                          className="bg-white rounded-2xl border border-[#e5dde8] shadow-xs overflow-hidden transition-all hover:border-purple-300"
                        >
                          {/* Kol Header */}
                          <button
                            type="button"
                            onClick={() => toggleKol(kol.code)}
                            className="w-full text-right p-4 flex items-center justify-between gap-3 bg-white hover:bg-gray-50/70 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-10 h-10 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 flex items-center justify-center font-mono font-black text-sm shrink-0">
                                {kol.code}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-black text-[#341648] truncate">{kol.name}</h4>
                                  <span className="text-[11px] text-gray-400 font-normal">· {kol.category}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <span>{kol.moeens.length} حساب معین</span>
                                  {hasTafsilis && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-mono text-purple-700 font-bold">{kol.total_tafsilis.toLocaleString('fa-IR')} حساب تفصیلی</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-gray-400 hidden sm:inline">
                                {isExpanded ? 'بستن' : 'مشاهده معین‌ها'}
                              </span>
                              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                              </div>
                            </div>
                          </button>

                          {/* Moeens & Tafsilis Expanded Content */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 bg-[#fdfcff] p-4 divide-y divide-gray-100">
                              {kol.moeens.map((moeen) => {
                                // Check if this Moeen corresponds to a specific school
                                const matchedSchool = SCHOOL_PARSIAN_MAPPINGS.find(
                                  (m) =>
                                    (kol.code === m.tuition_kol && moeen.code === m.tuition_moeen) ||
                                    (kol.code === m.income_kol && moeen.code === m.income_moeen) ||
                                    (kol.code === m.expense_kol)
                                );

                                return (
                                  <div key={moeen.code} className="py-3 first:pt-0 last:pb-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex items-start gap-2.5">
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-xs font-bold mt-0.5 shrink-0">
                                          {kol.code}-{moeen.code}
                                        </span>
                                        <div>
                                          <div className="text-xs font-bold text-[#341648] flex items-center gap-2 flex-wrap">
                                            <span>{moeen.name}</span>
                                            {matchedSchool && (
                                              <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                                متصل به {matchedSchool.school_name}
                                              </span>
                                            )}
                                          </div>
                                          {moeen.tafsilis_count > 0 && (
                                            <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                                              شامل {moeen.tafsilis_count.toLocaleString('fa-IR')} حساب تفصیلی فعال
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {moeen.tafsilis_count > 0 && (
                                        <div className="shrink-0 text-left">
                                          <span className="text-[10px] font-mono text-purple-900 bg-purple-100/60 px-2 py-1 rounded-lg">
                                            {moeen.tafsilis_count} تفصیلی
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Sample Tafsilis Preview */}
                                    {moeen.sample_tafsilis && moeen.sample_tafsilis.length > 0 && (
                                      <div className="mt-2 mr-9 p-2.5 rounded-xl bg-white border border-gray-100">
                                        <div className="text-[10px] text-gray-400 font-medium mb-1.5">
                                          نمونه حساب‌های تفصیلی ثبت‌شده در پارسیان:
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {moeen.sample_tafsilis.map((sample, idx) => (
                                            <span
                                              key={idx}
                                              className="text-[11px] px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-gray-700 font-medium"
                                            >
                                              {sample}
                                            </span>
                                          ))}
                                          {moeen.tafsilis_count > moeen.sample_tafsilis.length && (
                                            <span className="text-[10px] text-gray-400 self-center">
                                              و {(moeen.tafsilis_count - moeen.sample_tafsilis.length).toLocaleString('fa-IR')} مورد دیگر...
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: SCHOOL MAPPING MATRIX */}
            {treeSubTab === 'mapping' && (
              <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-4">
                <div>
                  <h4 className="text-sm font-black text-[#341648]">نقشه انطباق واحدهای آموزشی ۱۱ گانه با درخت‌واره پارسیان</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    در نرم‌افزار حسابداری پارسیان این مجموعه، برای هر واحد آموزشی حساب‌های معین و کل تفکیک‌شده تعریف شده است.
                    جدول زیر نگاشت رسمی هر یک از شعب را نمایش می‌دهد:
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 font-bold bg-[#fcfaff]">
                        <th className="py-3 px-3">کد مرکز</th>
                        <th className="py-3 px-3">نام واحد آموزشی</th>
                        <th className="py-3 px-3">کد تفصیلی در سیستم</th>
                        <th className="py-3 px-3">معین شهریه (کل ۶۷)</th>
                        <th className="py-3 px-3">معین درآمد (کل ۴۰)</th>
                        <th className="py-3 px-3">حساب کل هزینه اختصاصی</th>
                        <th className="py-3 px-3">کارت تنخواه مدیر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {SCHOOL_PARSIAN_MAPPINGS.map((m) => {
                        const sc = schools.find((s) => s.id === m.school_id);
                        return (
                          <tr key={m.school_id} className="hover:bg-purple-50/30">
                            <td className="py-3 px-3 font-mono font-bold text-gray-500">{m.school_id}</td>
                            <td className="py-3 px-3 font-bold text-[#341648]">
                              <div className="flex items-center gap-1.5">
                                <SchoolIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span>{m.school_name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                {m.tafsili_code}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <span className="font-bold text-purple-800">67-{m.tuition_moeen}</span>
                              <div className="text-[10px] text-gray-500 font-sans truncate max-w-[180px]">{m.tuition_moeen_name}</div>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <span className="font-bold text-emerald-800">40-{m.income_moeen}</span>
                              <div className="text-[10px] text-gray-500 font-sans truncate max-w-[180px]">{m.income_moeen_name}</div>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <span className="font-black text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                کل {m.expense_kol}
                              </span>
                              <div className="text-[10px] text-gray-500 font-sans truncate max-w-[180px]">{m.expense_kol_name}</div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-gray-600">
                              {sc?.petty_cash_card || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Trial Balance (تراز آزمایشی) */}
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
                    کد کل گردش حساب شهریه دانش‌آموزان
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_receivable}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_receivable: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان مجموعه: 67 (گردش حساب شهریه دانش‌آموزان)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل موجودی بانک‌ها
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_bank}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_bank: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان مجموعه: 11 (بانک صادرات، ملی، سپه، رفاه)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل درآمدهای مردمی و شهریه
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_income}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_income: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان مجموعه: 40 (درآمدهای مردمی و خیرین)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل پایه هزینه‌های تفکیک‌شده مدارس
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_expense}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_expense: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان مجموعه: هزینه‌های تفکیک‌شده مدارس (کل ۶۸ تا ۸۱)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل اسناد دریافتنی (چک‌های صیادی)
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_cheques}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_cheques: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان مجموعه: 13 (اسناد دریافتنی)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد کل صندوق و تنخواه‌گردان‌ها
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_petty_cash}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_petty_cash: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان مجموعه: 10 معین 2 (تنخواه‌گردان‌ها)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    کد تخفیفات و بورسیه شهریه
                  </label>
                  <input
                    type="text"
                    value={codingConfig.kol_discount}
                    onChange={(e) => setCodingConfig({ ...codingConfig, kol_discount: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-[#341648]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">پیش‌فرض پارسیان مجموعه: معین 3 (هزینه تخفیفات مدارس)</p>
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
