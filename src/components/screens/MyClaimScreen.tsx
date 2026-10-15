import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';
import { Wallet, CheckCircle, Clock } from 'lucide-react';

export const MyClaimScreen: React.FC = () => {
  const { transactions, currentUser, accentColor } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  // Filter expenses paid from manager's personal pocket
  const claimTxs = transactions.filter((t) => {
    if (t.kind !== 'هزینه') return false;
    if (t.payment_source !== 'own') return false;
    if (!isSenior && t.school_id !== currentUser?.school_id) return false;
    return true;
  });

  const totalClaim = claimTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="طلب من از مدرسه" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Total Claim Banner */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #341648 100%)`,
          }}
        >
          <div>
            <div className="text-xs font-semibold text-[#f5dff2] mb-1">
              هزینه‌های پرداخت‌شده از حساب شخصی مدیر
            </div>
            <h2 className="text-xl font-bold">جمع کل طلب من از مدرسه:</h2>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#ffd353]">
            {formatRial(totalClaim)} <span className="text-sm font-normal text-white">ریال</span>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs text-xs text-gray-600 leading-relaxed">
          💡 هر هزینه‌ای که هنگام ثبت با عنوان منبع «از حساب خودم» انتخاب شود، به‌صورت خودکار در این فهرست قرار می‌گیرد تا جهت تسویه و صدور چک/حواله تنخواه در اختیار امور مالی مرکزی قرار گیرد.
        </div>

        {/* Claim Items List */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold">
            ریز اقلام تنخواه شخصی ({claimTxs.length} مورد):
          </div>

          {claimTxs.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              هنوز هزینه‌ای از حساب شخصی شما ثبت نشده است.
            </div>
          ) : (
            claimTxs.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#341648]">
                      {t.expense_category_name || t.description || 'هزینه متفرقه'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
                      در انتظار بازپرداخت
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                    <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                    <span>مدرسه: {t.school_name}</span>
                    <span>شماره پیگیری: <span className="font-mono">{t.tracking_code || '—'}</span></span>
                  </div>

                  {t.description && (
                    <div className="text-xs text-gray-600 mt-1">
                      شرح: {t.description}
                    </div>
                  )}
                </div>

                <div className="text-base font-black font-mono text-rose-700 self-end sm:self-center">
                  {formatRial(t.amount)} ریال
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
