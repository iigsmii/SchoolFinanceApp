import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial } from '../../utils/jalali';
import { BarChart3, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { TuitionTrendsScreen } from './TuitionTrendsScreen';

export const ReportScreen: React.FC = () => {
  const { transactions, schools, currentUser, accentColor } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [selectedSchool, setSelectedSchool] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 1
  );

  const scopedTxs = transactions.filter((t) => {
    if (!isSenior) return t.school_id === currentUser?.school_id;
    if (selectedSchool > 0) return t.school_id === selectedSchool;
    return true;
  });

  let totalDebt = 0;
  let totalPaid = 0;
  const costsByCategory: Record<string, number> = {};

  scopedTxs.forEach((t) => {
    if (t.kind === 'شهریه_بدهی') totalDebt += t.debit || 0;
    else if (t.kind === 'شهریه') totalPaid += t.credit || 0;
    else if (t.kind === 'هزینه') {
      const key = t.expense_category_name || 'هزینه‌های متفرقه';
      costsByCategory[key] = (costsByCategory[key] || 0) + (t.amount || 0);
    }
  });

  const remainingTuitionDebt = Math.max(0, totalDebt - totalPaid);
  const totalExpenses = Object.values(costsByCategory).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="گزارشات جامع مالی" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* School Filter for Senior */}
        {isSenior && (
          <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">فیلتر گزارش بر اساس مدرسه:</span>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(Number(e.target.value))}
              className="py-2 px-3 rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648] bg-[#fcfaff]"
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

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
              <span>جمع بدهی باقی‌مانده شهریه</span>
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
            <div className="text-2xl font-black font-mono text-rose-700">
              {formatRial(remainingTuitionDebt)} <span className="text-xs font-normal text-gray-500">ریال</span>
            </div>
            <div className="text-xs text-gray-400 mt-2 flex justify-between border-t border-gray-100 pt-2">
              <span>کل بدهی ثبت‌شده: {formatRial(totalDebt)}</span>
              <span>دریافتی: {formatRial(totalPaid)}</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
              <span>کل هزینه‌های ثبت‌شده</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-black font-mono text-purple-900">
              {formatRial(totalExpenses)} <span className="text-xs font-normal text-gray-500">ریال</span>
            </div>
            <div className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">
              تعداد سرفصل‌های فعال: {Object.keys(costsByCategory).length} گروه هزینه
            </div>
          </div>
        </div>

        {/* Expenses by Category Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#341648] flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#62205f]" style={{ color: accentColor }} />
            <span>تفکیک هزینه‌ها بر اساس سرفصل (ماده هزینه):</span>
          </h3>

          {Object.keys(costsByCategory).length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">هزینه‌ای برای نمایش ثبت نشده است.</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(costsByCategory).map(([catName, amt]) => {
                const percent = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
                return (
                  <div key={catName} className="p-4 rounded-2xl bg-[#fcfaff] border border-[#ede5ef] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#341648]">{catName}</span>
                      <span className="font-mono font-bold text-gray-800">{formatRial(amt)} ریال ({percent}٪)</span>
                    </div>
                    {/* Visual Progress Bar */}
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

        {/* Tuition collection trend integrated into the financial report */}
        <section className="space-y-3">
          <h2 className="text-base font-black text-[#341648] px-1">روند شهریه‌های دریافتی</h2>
          <TuitionTrendsScreen embedded />
        </section>
      </main>
    </div>
  );
};
