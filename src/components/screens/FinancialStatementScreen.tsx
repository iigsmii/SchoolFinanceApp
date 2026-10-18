import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial } from '../../utils/jalali';
import { Scale, Users, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * صفحهٔ مستقل «صورت وضعیت مالی»
 * خلاصهٔ درآمدها (شهریه)، هزینه‌ها و مانده به تفکیک مدرسه را نشان می‌دهد.
 * فقط می‌خواند.
 */
export const FinancialStatementScreen: React.FC = () => {
  const { transactions, schools, currentUser, accentColor } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(isSenior ? 0 : currentUser?.school_id || 0);

  const scoped = useMemo(
    () =>
      transactions.filter((t) =>
        selectedSchoolId === 0 ? true : t.school_id === selectedSchoolId
      ),
    [transactions, selectedSchoolId]
  );

  const totals = useMemo(() => {
    let tuitionBilled = 0; // بدهی‌های صادرشده (شهریه مصوب)
    let tuitionPaid = 0; // دریافتی‌ها
    let expenses = 0; // هزینه‌ها

    scoped.forEach((t) => {
      if (t.kind === 'شهریه_بدهی') tuitionBilled += t.debit || t.amount || 0;
      else if (t.kind === 'شهریه') tuitionPaid += t.credit || t.amount || 0;
      else if (t.kind === 'هزینه') expenses += t.debit || t.amount || 0;
    });

    return {
      tuitionBilled,
      tuitionPaid,
      expenses,
      outstanding: Math.max(0, tuitionBilled - tuitionPaid),
      net: tuitionPaid - expenses,
    };
  }, [scoped]);

  const perSchool = useMemo(() => {
    return schools
      .filter((sc) => (isSenior ? true : sc.id === currentUser?.school_id))
      .map((sc) => {
        const list = scoped.filter((t) => t.school_id === sc.id);
        let billed = 0;
        let paid = 0;
        let exp = 0;
        list.forEach((t) => {
          if (t.kind === 'شهریه_بدهی') billed += t.debit || t.amount || 0;
          else if (t.kind === 'شهریه') paid += t.credit || t.amount || 0;
          else if (t.kind === 'هزینه') exp += t.debit || t.amount || 0;
        });
        return { school: sc, billed, paid, exp, balance: paid - exp };
      })
      .filter((r) => r.billed || r.paid || r.exp);
  }, [schools, scoped, isSenior, currentUser?.school_id]);

  return (
    <div className="w-full max-w-full min-h-screen overflow-x-hidden bg-[#f8f5f9] pb-12">
      <Header title="صورت وضعیت مالی" />

      <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-5 box-border">
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-[#341648] mb-3">
            <Scale className="w-5 h-5" style={{ color: accentColor }} />
            <span>گزارش خلاصهٔ درآمد و هزینه</span>
          </div>

          {isSenior && (
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
              className="w-full py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold"
            >
              <option value={0}>همه مدارس مجموعه</option>
              {schools.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs">
            <div className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span>مجموع دریافتی شهریه</span>
            </div>
            <div className="text-xl font-black font-mono text-teal-700 mt-1">
              {formatRial(totals.tuitionPaid)} ریال
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs">
            <div className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>مجموع هزینه‌ها</span>
            </div>
            <div className="text-xl font-black font-mono text-rose-700 mt-1">
              {formatRial(totals.expenses)} ریال
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs">
            <div className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>شهریهٔ صادرشده (مصوب)</span>
            </div>
            <div className="text-xl font-black font-mono text-indigo-800 mt-1">
              {formatRial(totals.tuitionBilled)} ریال
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs">
            <div className="text-xs text-gray-500 font-bold">ماندهٔ وصول‌نشده و تراز عملیاتی</div>
            <div className="text-sm font-bold text-gray-700 mt-1">
              مطالبات: <span className="font-mono">{formatRial(totals.outstanding)}</span> ریال
            </div>
            <div
              className={`text-sm font-bold mt-0.5 ${
                totals.net >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              تراز (دریافتی − هزینه): <span className="font-mono">{formatRial(totals.net)}</span> ریال
            </div>
          </div>
        </div>

        {/* Per school table */}
        <div className="bg-white rounded-3xl border border-[#e5dde8] shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e5dde8] text-sm font-bold text-[#341648]">
            تفکیک به‌ازای هر مدرسه / مرکز
          </div>

          {perSchool.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">داده‌ای برای نمایش نیست.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="bg-[#fcfaff] text-gray-500">
                  <tr>
                    <th className="text-right px-4 py-2.5 font-bold">مدرسه</th>
                    <th className="text-right px-4 py-2.5 font-bold">مصوب</th>
                    <th className="text-right px-4 py-2.5 font-bold">دریافتی</th>
                    <th className="text-right px-4 py-2.5 font-bold">هزینه</th>
                    <th className="text-right px-4 py-2.5 font-bold">تراز</th>
                  </tr>
                </thead>
                <tbody>
                  {perSchool.map((r) => (
                    <tr key={r.school.id} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 font-bold text-[#341648]">{r.school.name}</td>
                      <td className="px-4 py-2.5 font-mono">{formatRial(r.billed)}</td>
                      <td className="px-4 py-2.5 font-mono text-teal-700">{formatRial(r.paid)}</td>
                      <td className="px-4 py-2.5 font-mono text-rose-700">{formatRial(r.exp)}</td>
                      <td
                        className={`px-4 py-2.5 font-mono font-bold ${
                          r.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatRial(r.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
