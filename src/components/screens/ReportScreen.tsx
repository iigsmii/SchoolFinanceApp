import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, todayJalali } from '../../utils/jalali';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Layers,
  FileText,
  Printer,
  Scale,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { TuitionTrendsScreen } from './TuitionTrendsScreen';
import { calculateTrialBalance, generateParsianJournalEntries } from '../../utils/parsian';

export const ReportScreen: React.FC = () => {
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

  const [selectedSchool, setSelectedSchool] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 1
  );
  const [activeTab, setActiveTab] = useState<'income_statement' | 'trial_balance' | 'overview'>('income_statement');

  const scopedTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (!isSenior) return t.school_id === currentUser?.school_id;
      if (selectedSchool > 0) return t.school_id === selectedSchool;
      return true;
    });
  }, [transactions, isSenior, selectedSchool, currentUser]);

  // Income Statement metrics
  const financialSummary = useMemo(() => {
    let grossTuition = 0;
    let tuitionDiscounts = 0;
    let collectedTuition = 0;
    let otherIncome = 0;
    let totalExpenses = 0;
    const costsByCategory: Record<string, number> = {};

    scopedTxs.forEach((t) => {
      if (t.kind === 'شهریه_بدهی') {
        grossTuition += t.debit || t.amount || 0;
      } else if (t.kind === 'تخفیف_شهریه' || t.payment_method?.includes('تخفیف')) {
        tuitionDiscounts += t.credit || t.amount || 0;
      } else if (t.kind === 'شهریه') {
        collectedTuition += t.credit || t.amount || 0;
      } else if (t.kind === 'دریافت متفرقه') {
        otherIncome += t.credit || t.amount || 0;
      } else if (t.kind === 'هزینه') {
        const amt = t.debit || t.amount || 0;
        totalExpenses += amt;
        const key = t.expense_category_name || 'سایر هزینه‌ها';
        costsByCategory[key] = (costsByCategory[key] || 0) + amt;
      }
    });

    const netTuitionIncome = Math.max(0, grossTuition - tuitionDiscounts);
    const totalRevenues = netTuitionIncome + otherIncome;
    const netSurplusOrDeficit = totalRevenues - totalExpenses; // مازاد یا کسری مالی دوره
    const uncollectedDebt = Math.max(0, netTuitionIncome - collectedTuition);

    return {
      grossTuition,
      tuitionDiscounts,
      netTuitionIncome,
      collectedTuition,
      otherIncome,
      totalRevenues,
      totalExpenses,
      netSurplusOrDeficit,
      uncollectedDebt,
      costsByCategory,
    };
  }, [scopedTxs]);

  // Trial balance from journal entries
  const trialBalanceRows = useMemo(() => {
    const entries = generateParsianJournalEntries(
      scopedTxs,
      students,
      schools,
      categories,
      cheques
    );
    return calculateTrialBalance(entries);
  }, [scopedTxs, students, schools, categories, cheques]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16 print:bg-white print:p-0">
      <div className="print:hidden">
        <Header title="گزارشات جامع و صورت‌های مالی" />
      </div>

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-5">
        {/* Printable Header */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-black">صورت وضعیت و صورت‌های مالی مدرسة القرآن</h1>
          <p className="text-sm text-gray-600 mt-1">تاریخ گزارش: {todayJalali()}</p>
        </div>

        {/* Filter & Tab Selection */}
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('income_statement')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'income_statement'
                  ? 'bg-[#62205f] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={activeTab === 'income_statement' ? { backgroundColor: accentColor } : {}}
            >
              صورت درآمد و هزینه (سود/زیان)
            </button>

            <button
              onClick={() => setActiveTab('trial_balance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'trial_balance'
                  ? 'bg-[#62205f] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={activeTab === 'trial_balance' ? { backgroundColor: accentColor } : {}}
            >
              تراز آزمایشی حساب‌ها
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#62205f] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={activeTab === 'overview' ? { backgroundColor: accentColor } : {}}
            >
              روند و نمودارها
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isSenior && (
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(Number(e.target.value))}
                className="py-2 px-3 rounded-xl border border-gray-300 text-xs font-bold text-[#341648] bg-white grow sm:grow-0"
              >
                <option value={0}>همه مدارس مجموعه ({schools.length} مرکز)</option>
                {schools.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs"
              title="چاپ صورت مالی"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: Income Statement (صورت سود و زیان / درآمد و هزینه) */}
        {activeTab === 'income_statement' && (
          <div className="space-y-4">
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs">
                <div className="text-xs font-bold text-gray-500 flex items-center justify-between">
                  <span>کل درآمدهای دوره</span>
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-black font-mono text-emerald-700 mt-2">
                  {formatRial(financialSummary.totalRevenues)} <span className="text-xs font-normal text-gray-500">ریال</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">شهریه خالص + متفرقه</div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs">
                <div className="text-xs font-bold text-gray-500 flex items-center justify-between">
                  <span>کل هزینه‌های دوره</span>
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-xl font-black font-mono text-rose-700 mt-2">
                  {formatRial(financialSummary.totalExpenses)} <span className="text-xs font-normal text-gray-500">ریال</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">{Object.keys(financialSummary.costsByCategory).length} سرفصل هزینه فعال</div>
              </div>

              <div className={`rounded-3xl p-5 border shadow-xs ${
                financialSummary.netSurplusOrDeficit >= 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>{financialSummary.netSurplusOrDeficit >= 0 ? 'مازاد عملیاتی (تراز مثبت)' : 'کسری مالی دوره'}</span>
                  <Scale className="w-4 h-4 text-purple-700" />
                </div>
                <div className={`text-xl font-black font-mono mt-2 ${
                  financialSummary.netSurplusOrDeficit >= 0 ? 'text-emerald-900' : 'text-rose-900'
                }`}>
                  {formatRial(Math.abs(financialSummary.netSurplusOrDeficit))} <span className="text-xs font-normal text-gray-500">ریال</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">تفاوت کل درآمد با کل هزینه</div>
              </div>
            </div>

            {/* Income Statement Table */}
            <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#341648] flex items-center gap-2 border-b pb-3">
                <FileText className="w-4 h-4 text-purple-700" />
                <span>صورت درآمد و هزینه دوره مالی (Income Statement)</span>
              </h3>

              <div className="divide-y divide-gray-100 text-xs">
                {/* Section A: Revenues */}
                <div className="py-2.5">
                  <div className="font-black text-[#341648] mb-1.5 text-sm">الف) درآمدهای آموزشی و عملیاتی:</div>
                  <div className="flex justify-between py-1 text-gray-600 pr-3">
                    <span>۱. درآمد ناخالص شهریه مصوب:</span>
                    <span className="font-mono font-bold text-gray-800">{formatRial(financialSummary.grossTuition)} ریال</span>
                  </div>
                  <div className="flex justify-between py-1 text-rose-600 pr-3">
                    <span>۲. کسر می‌شود: تخفیفات و بورسیه‌های مصوب:</span>
                    <span className="font-mono font-bold">({formatRial(financialSummary.tuitionDiscounts)}) ریال</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-emerald-800 bg-emerald-50/60 px-3 rounded-lg mt-1">
                    <span>خالص درآمد حاصل از شهریه:</span>
                    <span className="font-mono">{formatRial(financialSummary.netTuitionIncome)} ریال</span>
                  </div>
                  {financialSummary.otherIncome > 0 && (
                    <div className="flex justify-between py-1 text-gray-600 pr-3 mt-1">
                      <span>۳. درآمدهای متفرقه و کمک‌های مردمی:</span>
                      <span className="font-mono font-bold text-gray-800">{formatRial(financialSummary.otherIncome)} ریال</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 font-black text-[#341648] border-t border-gray-200 mt-2 px-1">
                    <span>جمع کل درآمدهای دوره:</span>
                    <span className="font-mono text-emerald-800 text-sm">{formatRial(financialSummary.totalRevenues)} ریال</span>
                  </div>
                </div>

                {/* Section B: Expenses */}
                <div className="py-3">
                  <div className="font-black text-[#341648] mb-1.5 text-sm">ب) هزینه‌های جاری، اداری و آموزشی:</div>
                  <div className="space-y-1 pr-3">
                    {Object.entries(financialSummary.costsByCategory).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between py-1 text-gray-600">
                        <span>• {cat}:</span>
                        <span className="font-mono font-bold text-gray-800">{formatRial(amt)} ریال</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between py-2 font-black text-[#341648] border-t border-gray-200 mt-2 px-1">
                    <span>جمع کل هزینه‌های دوره:</span>
                    <span className="font-mono text-rose-800 text-sm">{formatRial(financialSummary.totalExpenses)} ریال</span>
                  </div>
                </div>

                {/* Section C: Final Balance */}
                <div className="pt-3">
                  <div className={`p-4 rounded-2xl flex items-center justify-between font-black text-sm ${
                    financialSummary.netSurplusOrDeficit >= 0
                      ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100/70 text-rose-900 border border-rose-300'
                  }`}>
                    <span>مازاد (کسری) درآمد نسبت به هزینه دوره:</span>
                    <span className="font-mono text-base">
                      {formatRial(financialSummary.netSurplusOrDeficit)} ریال
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Trial Balance */}
        {activeTab === 'trial_balance' && (
          <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#341648]">تراز آزمایشی حساب‌های کل و معین</h3>
                <p className="text-xs text-gray-500 mt-0.5">بررسی توازن و مانده‌های حسابداری برای این واحد آموزشی</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentScreen('export')}
                className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-[#62205f] border border-purple-200 text-xs font-bold"
              >
                مشاهده در خروجی پارسیان ⬅️
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-bold bg-[#fcfaff]">
                    <th className="py-2.5 px-3">کد کل</th>
                    <th className="py-2.5 px-3">کد معین</th>
                    <th className="py-2.5 px-3">سرفصل حساب</th>
                    <th className="py-2.5 px-3 text-left">گردش بدهکار</th>
                    <th className="py-2.5 px-3 text-left">گردش بستانکار</th>
                    <th className="py-2.5 px-3 text-left">مانده نهایی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {trialBalanceRows.map((r) => {
                    const isDebitBal = r.balance_debit > 0;
                    return (
                      <tr key={`${r.kol_code}-${r.moeen_code}`} className="hover:bg-purple-50/30">
                        <td className="py-2 px-3 font-mono text-purple-900 font-bold">{r.kol_code}</td>
                        <td className="py-2 px-3 font-mono">{r.moeen_code}</td>
                        <td className="py-2 px-3 font-bold text-[#341648]">{r.moeen_name}</td>
                        <td className="py-2 px-3 text-left font-mono text-rose-700">{formatRial(r.total_debit)}</td>
                        <td className="py-2 px-3 text-left font-mono text-emerald-700">{formatRial(r.total_credit)}</td>
                        <td className={`py-2 px-3 text-left font-mono font-bold ${isDebitBal ? 'text-rose-800' : 'text-emerald-800'}`}>
                          {isDebitBal ? `${formatRial(r.balance_debit)} (بد)` : `${formatRial(r.balance_credit)} (بس)`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Visual Trends & Category Breakdown */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Expenses by Category Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#341648] flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#62205f]" style={{ color: accentColor }} />
                <span>تفکیک هزینه‌ها بر اساس سرفصل (ماده هزینه):</span>
              </h3>

              {Object.keys(financialSummary.costsByCategory).length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">هزینه‌ای برای نمایش ثبت نشده است.</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(financialSummary.costsByCategory).map(([catName, amt]) => {
                    const percent = financialSummary.totalExpenses > 0 ? Math.round((amt / financialSummary.totalExpenses) * 100) : 0;
                    return (
                      <div key={catName} className="p-4 rounded-2xl bg-[#fcfaff] border border-[#ede5ef] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#341648]">{catName}</span>
                          <span className="font-mono font-bold text-gray-800">{formatRial(amt)} ریال ({percent}٪)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: accentColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tuition collection trend */}
            <section className="space-y-3">
              <h2 className="text-base font-black text-[#341648] px-1">روند شهریه‌های دریافتی</h2>
              <TuitionTrendsScreen embedded />
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
