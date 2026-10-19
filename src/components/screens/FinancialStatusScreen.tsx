import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial } from '../../utils/jalali';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Building,
  School as SchoolIcon,
  PieChart as PieIcon,
  CheckCircle,
  AlertCircle,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

const CATEGORY_COLORS = [
  '#62205f',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
];

export const FinancialStatusScreen: React.FC = () => {
  const { transactions, schools, students, currentUser, accentColor } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 0
  );

  const scopedTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedSchoolId !== 0 && t.school_id !== selectedSchoolId) return false;
      if (!isSenior && t.school_id !== currentUser?.school_id) return false;
      return true;
    });
  }, [transactions, selectedSchoolId, isSenior, currentUser]);

  const summary = useMemo(() => {
    let totalAssigned = 0;
    let totalCollected = 0;
    let totalExpenses = 0;
    let pettyCashExpenses = 0;
    let bankExpenses = 0;
    const expenseByCategory: Record<string, number> = {};

    scopedTxs.forEach((t) => {
      const amt = t.amount || 0;
      if (t.kind === 'شهریه_بدهی') {
        totalAssigned += t.debit || amt;
      } else if (t.kind === 'شهریه') {
        totalCollected += t.credit || amt;
      } else if (t.kind === 'هزینه') {
        totalExpenses += amt;
        if (t.payment_source === 'petty_cash') {
          pettyCashExpenses += amt;
        } else {
          bankExpenses += amt;
        }
        const cat = t.expense_category_name || 'سایر هزینه‌ها';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
      }
    });

    const remainingDebt = Math.max(0, totalAssigned - totalCollected);
    const collectionRate = totalAssigned > 0 ? Math.round((totalCollected / totalAssigned) * 100) : 100;
    const netBalance = totalCollected - totalExpenses;

    const catData = Object.entries(expenseByCategory).map(([name, value], idx) => ({
      name,
      value,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      formatted: formatRial(value),
    }));

    return {
      totalAssigned,
      totalCollected,
      remainingDebt,
      collectionRate,
      totalExpenses,
      pettyCashExpenses,
      bankExpenses,
      netBalance,
      catData,
    };
  }, [scopedTxs]);

  // School-by-school comparison
  const schoolComparison = useMemo(() => {
    const list = selectedSchoolId !== 0 ? schools.filter((s) => s.id === selectedSchoolId) : schools;

    return list.map((sc) => {
      let assigned = 0;
      let collected = 0;
      let expenses = 0;

      transactions
        .filter((t) => t.school_id === sc.id)
        .forEach((t) => {
          const amt = t.amount || 0;
          if (t.kind === 'شهریه_بدهی') assigned += t.debit || amt;
          else if (t.kind === 'شهریه') collected += t.credit || amt;
          else if (t.kind === 'هزینه') expenses += amt;
        });

      const debt = Math.max(0, assigned - collected);
      const rate = assigned > 0 ? Math.round((collected / assigned) * 100) : 100;

      return {
        school: sc,
        assigned,
        collected,
        expenses,
        debt,
        rate,
      };
    });
  }, [schools, transactions, selectedSchoolId]);

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16 w-full max-w-full overflow-x-hidden">
      <Header title="صورت وضعیت مالی" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5 w-full min-w-0">
        {/* Banner */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #2f0b38 100%)`,
          }}
        >
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>بیلان و صورت وضعیت جامع مالی</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-neyrizi">
              تراز مالی، گردش درآمدها و هزینه‌های مجموعه
            </h2>
            <p className="text-xs text-[#f5dff2]/90 max-w-2xl leading-relaxed">
              گزارش تفصیلی وضعیت بدهی‌ها، وصولی شهریه‌ها، هزینه‌های جاری و تراز خالص مالی به تفکیک سرفصل‌ها و واحدهای آموزشی.
            </p>
          </div>
        </div>

        {/* School Selector */}
        {isSenior && (
          <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SchoolIcon className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-[#341648]">واحد آموزشی:</span>
            </div>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
              className="py-2 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648] focus:outline-hidden"
            >
              <option value={0}>همه واحدهای آموزشی (تراز کل مجموعه)</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 4 Core Financial KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs">
            <div className="text-[11px] text-blue-700 font-bold flex items-center justify-between">
              <span>شهریه مصوب</span>
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-[#341648] mt-2">
              {formatRial(summary.totalAssigned)} <span className="text-[10px] font-normal text-gray-400">ریال</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs">
            <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-between">
              <span>کل وصولی</span>
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-emerald-800 mt-2">
              {formatRial(summary.totalCollected)} <span className="text-[10px] font-normal text-gray-400">ریال</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1">
              نرخ وصولی: {summary.collectionRate}٪
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs">
            <div className="text-[11px] text-rose-700 font-bold flex items-center justify-between">
              <span>مانده طلب (بدهی)</span>
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-rose-700 mt-2">
              {formatRial(summary.remainingDebt)} <span className="text-[10px] font-normal text-gray-400">ریال</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs">
            <div className="text-[11px] text-amber-700 font-bold flex items-center justify-between">
              <span>کل هزینه‌ها</span>
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-amber-900 mt-2">
              {formatRial(summary.totalExpenses)} <span className="text-[10px] font-normal text-gray-400">ریال</span>
            </div>
          </div>
        </div>

        {/* Net Cash Flow Banner */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              summary.netBalance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-semibold">تراز نقدی مجموعه (وصولی منهای هزینه‌ها)</div>
              <div className={`text-xl font-black font-mono ${
                summary.netBalance >= 0 ? 'text-emerald-800' : 'text-rose-700'
              }`}>
                {formatRial(summary.netBalance)} ریال
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-gray-600 bg-[#fcfaff] p-3 rounded-2xl border border-gray-100 w-full sm:w-auto">
            <div>
              <span className="text-gray-400 block text-[10px]">هزینه از کارت تن‌خواه:</span>
              <span className="font-mono font-bold text-gray-800">{formatRial(summary.pettyCashExpenses)} ریال</span>
            </div>
            <div className="border-r border-gray-200 pr-4">
              <span className="text-gray-400 block text-[10px]">هزینه مستقیم حساب بانک:</span>
              <span className="font-mono font-bold text-gray-800">{formatRial(summary.bankExpenses)} ریال</span>
            </div>
          </div>
        </div>

        {/* Expenses by Category Card */}
        {summary.catData.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-[#62205f]" style={{ color: accentColor }} />
                <h3 className="font-bold text-sm text-[#341648]">تفکیک هزینه‌ها بر اساس سرفصل</h3>
              </div>
              <span className="text-xs text-gray-400 font-mono">{summary.catData.length} سرفصل</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.catData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {summary.catData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${formatRial(Number(val))} ریال`, 'مبلغ']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {summary.catData.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-gray-50/70 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-bold text-gray-800">{cat.name}</span>
                    </div>
                    <span className="font-mono font-bold text-gray-900">{cat.formatted} ریال</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* School Comparison Table */}
        <div className="bg-white rounded-3xl border border-[#e5dde8] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h4 className="font-bold text-sm text-[#341648]">جدول عملکرد مالی به تفکیک مدارس</h4>
            <span className="text-xs text-gray-400">تعداد واحدها: {schoolComparison.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#fcfaff] text-gray-600 font-bold border-b border-gray-100">
                <tr>
                  <th className="p-3">مدرسه / مرکز</th>
                  <th className="p-3">شهریه مصوب</th>
                  <th className="p-3">وصولی</th>
                  <th className="p-3">مانده طلب</th>
                  <th className="p-3">کل هزینه‌ها</th>
                  <th className="p-3">درصد وصولی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {schoolComparison.map((sc) => (
                  <tr key={sc.school.id} className="hover:bg-[#fcfaff] transition-colors">
                    <td className="p-3 font-sans font-bold text-[#341648]">{sc.school.name}</td>
                    <td className="p-3 text-gray-800">{formatRial(sc.assigned)}</td>
                    <td className="p-3 text-emerald-700 font-bold">{formatRial(sc.collected)}</td>
                    <td className="p-3 text-rose-700 font-bold">{formatRial(sc.debt)}</td>
                    <td className="p-3 text-amber-800">{formatRial(sc.expenses)}</td>
                    <td className="p-3 font-sans">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        sc.rate >= 80 ? 'bg-emerald-100 text-emerald-800' : sc.rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {sc.rate}٪
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
