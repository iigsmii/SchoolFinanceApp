import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';
import { Wallet, Search, Download } from 'lucide-react';

/**
 * صفحهٔ مستقل «شهریه‌های دریافتی»
 * دریافت‌های شهریه (kind === 'شهریه') را با فیلتر مدرسه/تاریخ/روش پرداخت نشان می‌دهد.
 * فقط می‌خواند؛ هیچ نوشتنی در شیت انجام نمی‌دهد.
 */
export const PaymentsReceivedScreen: React.FC = () => {
  const { transactions, schools, currentUser, accentColor } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(isSenior ? 0 : currentUser?.school_id || 0);
  const [searchQuery, setSearchQuery] = useState('');

  const payments = useMemo(() => {
    return transactions
      .filter((t) => t.kind === 'شهریه')
      .filter((t) => (isSenior ? true : t.school_id === currentUser?.school_id))
      .filter((t) => (selectedSchoolId === 0 ? true : t.school_id === selectedSchoolId))
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          (t.student_name || '').toLowerCase().includes(q) ||
          (t.tracking_code || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, isSenior, currentUser?.school_id, selectedSchoolId, searchQuery]);

  const totalAmount = payments.reduce((sum, t) => sum + (t.credit || t.amount || 0), 0);

  return (
    <div className="w-full max-w-full min-h-screen overflow-x-hidden bg-[#f8f5f9] pb-12">
      <Header title="شهریه‌های دریافتی" />

      <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-5 box-border">
        {/* KPI summary */}
        <div
          className="rounded-3xl p-5 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #2f0b38 100%)` }}
        >
          <div className="flex items-center gap-2 text-xs font-bold bg-white/20 px-3 py-1 rounded-full w-fit">
            <Wallet className="w-3.5 h-3.5 text-amber-300" />
            <span>مجموع دریافت‌های شهریه</span>
          </div>
          <div className="text-2xl font-black mt-2 font-mono">{formatRial(totalAmount)} ریال</div>
          <div className="text-xs text-white/80 mt-1">تعداد: {payments.length} فقره دریافت</div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs space-y-3 min-w-0">
          <div className="relative min-w-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجو بر اساس نام دانش‌آموز یا کد پیگیری..."
              className="w-full max-w-full pl-4 pr-11 py-3 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
          </div>

          {isSenior && (
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
              className="w-full py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold"
            >
              <option value={0}>همه مدارس</option>
              {schools.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* List */}
        <div className="space-y-3 min-w-0">
          {payments.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              دریافتی با این شرایط ثبت نشده است.
            </div>
          ) : (
            payments.map((t) => (
              <div
                key={t.id}
                className="w-full min-w-0 bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-[#341648] break-words">
                    {t.student_name || 'دانش‌آموز'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                    <span className="break-words">مدرسه: {t.school_name || '—'}</span>
                    <span>روش: {t.payment_method || '—'}</span>
                    {t.tracking_code && (
                      <span className="break-all">
                        پیگیری: <span className="font-mono">{t.tracking_code}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-base font-black font-mono text-teal-700 whitespace-nowrap shrink-0">
                  {formatRial(t.credit || t.amount)} ریال
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-400 justify-center">
          <Download className="w-3.5 h-3.5" />
          <span>برای خروجی رسمی، از بخش تنظیمات فایل پارسیان را بگیرید.</span>
        </div>
      </main>
    </div>
  );
};
