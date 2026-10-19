import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';
import { ArrowLeftRight, Trash2, Search, Filter } from 'lucide-react';

export const TransactionsScreen: React.FC = () => {
  const { transactions, currentUser, deleteTransaction, accentColor } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [filterKind, setFilterKind] = useState<'all' | 'debt' | 'payment' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const scopedTxs = isSenior
    ? transactions
    : transactions.filter((t) => t.school_id === currentUser?.school_id);

  const filtered = scopedTxs.filter((t) => {
    if (filterKind === 'debt' && t.kind !== 'شهریه_بدهی') return false;
    if (filterKind === 'payment' && t.kind !== 'شهریه') return false;
    if (filterKind === 'expense' && t.kind !== 'هزینه') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchDesc = (t.description || t.comment || '').toLowerCase().includes(q);
      const matchStudent = (t.student_name || '').toLowerCase().includes(q);
      const matchCategory = (t.expense_category_name || '').toLowerCase().includes(q);
      const matchTrack = (t.tracking_code || '').toLowerCase().includes(q);
      return matchDesc || matchStudent || matchCategory || matchTrack;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16 w-full max-w-full overflow-x-hidden">
      <Header title="دفتر کل تراکنش‌ها" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5 w-full min-w-0">
        {/* Filter Controls */}
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجو بر اساس شرح، نام دانش‌آموز، کد پیگیری..."
              className="w-full pl-4 pr-11 py-3 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
            />
            <Search className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'همه تراکنش‌ها' },
              { id: 'debt', label: 'بدهی شهریه' },
              { id: 'payment', label: 'دریافت شهریه' },
              { id: 'expense', label: 'هزینه‌ها' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterKind(f.id as typeof filterKind)}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
                  filterKind === f.id
                    ? 'bg-[#62205f] text-white shadow-xs'
                    : 'bg-[#fcfaff] text-gray-700 border border-[#e5dde8] hover:bg-gray-50'
                }`}
                style={filterKind === f.id ? { backgroundColor: accentColor } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold flex items-center justify-between">
            <span>تعداد: {filtered.length} تراکنش</span>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              تراکنشی با این شرایط پیدا نشد.
            </div>
          ) : (
            filtered.map((t) => {
              const isDebt = t.kind === 'شهریه_بدهی';
              const isExpense = t.kind === 'هزینه';
              const isPayment = t.kind === 'شهریه';

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 overflow-hidden"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isDebt
                            ? 'bg-rose-100 text-rose-800'
                            : isExpense
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isDebt ? 'بدهی شهریه' : isExpense ? 'هزینه جاری' : 'دریافت شهریه'}
                      </span>
                      <h4 className="font-bold text-sm text-[#341648] truncate">
                        {t.student_name || t.expense_category_name || t.description}
                      </h4>
                    </div>

                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                      <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                      <span>مدرسه: {t.school_name}</span>
                      {t.tracking_code && (
                        <span>
                          پیگیری: <span className="font-mono">{t.tracking_code}</span>
                        </span>
                      )}
                    </div>

                    {t.description && (
                      <div className="text-xs text-gray-600 break-words line-clamp-2">
                        شرح: {t.description}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                    <div
                      className={`text-base font-black font-mono ${
                        isDebt || isExpense ? 'text-gray-900' : 'text-teal-700'
                      }`}
                    >
                      {formatRial(t.amount)} ریال
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('آیا از حذف این تراکنش مطمئن هستید؟')) {
                          deleteTransaction(t.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="حذف تراکنش"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
