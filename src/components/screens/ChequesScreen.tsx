import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Cheque } from '../../types';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';
import {
  FileCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building,
  User,
} from 'lucide-react';

export const ChequesScreen: React.FC<{ initialMode?: 'review' | 'list' }> = ({ initialMode = 'list' }) => {
  const { cheques, reviewCheque, currentUser, accentColor } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'review' | 'list'>(
    isSenior && initialMode === 'review' ? 'review' : 'list'
  );

  const pendingCheques = cheques.filter((c) => c.status === 'pending');
  const allCheques = isSenior
    ? cheques
    : cheques.filter((c) => c.school_id === currentUser?.school_id);

  // Due date warnings (cheques maturing within 10 days)
  const now = new Date();
  const in10Days = new Date();
  in10Days.setDate(now.getDate() + 10);

  const alerts = allCheques.filter((c) => {
    if (c.status !== 'approved' && c.status !== 'pending') return false;
    const d = new Date(c.due_date);
    return d <= in10Days;
  });

  const handleReviewAction = (id: number, action: 'receive' | 'favor' | 'reject') => {
    const res = reviewCheque(id, action);
    alert(res.message);
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="مدیریت و لیست چک‌های صیادی" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Tab switchers if senior */}
        {isSenior && (
          <div className="flex bg-white rounded-2xl p-1.5 border border-[#e5dde8] shadow-xs">
            <button
              onClick={() => setActiveTab('review')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'review'
                  ? 'bg-[#62205f] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={activeTab === 'review' ? { backgroundColor: accentColor } : {}}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>چک‌های در انتظار تأیید ({pendingCheques.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'list'
                  ? 'bg-[#62205f] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={activeTab === 'list' ? { backgroundColor: accentColor } : {}}
            >
              <FileCheck className="w-4 h-4" />
              <span>لیست و سوابق کلی چک‌ها ({allCheques.length})</span>
            </button>
          </div>
        )}

        {/* Maturing Alerts */}
        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xs">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>هشدار سررسید نزدیک چک‌های صیادی ({alerts.length} فقره)</span>
            </div>
            <div className="space-y-2">
              {alerts.map((c) => (
                <div
                  key={c.id}
                  className="bg-white/80 rounded-xl p-3 border border-amber-200 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-amber-950">{c.student_name}</span>
                    <span className="text-gray-500 mr-2">| مبلغ: {formatRial(c.amount)} ریال</span>
                    <span className="text-gray-500 mr-2">| سررسید: {jalaliFromGregorian(c.due_date)}</span>
                  </div>
                  <span className="font-mono text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    صیاد: {c.sayad_id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Mode (Senior) */}
        {activeTab === 'review' && isSenior && (
          <div className="space-y-4">
            <div className="text-xs text-gray-500 font-semibold">
              چک‌های ثبت‌شده توسط مدیران مدارس که منتظر تأیید و احراز دریافت توسط مدیریت ارشد هستند:
            </div>

            {pendingCheques.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
                هیچ چکی در صف انتظار بررسی وجود ندارد.
              </div>
            ) : (
              pendingCheques.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#341648]">{c.student_name}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[#f2eaf3] text-[#62205f] font-bold">
                          {c.school_name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        شناسه صیاد: <span className="font-bold text-gray-800">{c.sayad_id}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-lg font-black font-mono text-[#62205f]">
                        {formatRial(c.amount)} ریال
                      </div>
                      <div className="text-xs text-gray-400">
                        سررسید: {jalaliFromGregorian(c.due_date)}
                      </div>
                    </div>
                  </div>

                  {/* Verification Status Pills */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        c.received_confirmed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <span>دریافت فیزیکی چک:</span>
                      <span className="font-bold">
                        {c.received_confirmed ? '✓ تأیید شده' : 'در انتظار دریافت'}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        c.in_favor_confirmed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <span>در وجه مدرسة القرآن:</span>
                      <span className="font-bold">
                        {c.in_favor_confirmed ? '✓ تأیید شده' : 'در انتظار'}
                      </span>
                    </div>
                  </div>

                  {c.note && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                      توضیحات مدیر مدرسه: {c.note}
                    </div>
                  )}

                  {/* 3 Action Buttons matching Android reviewCheque */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <button
                      onClick={() => handleReviewAction(c.id, 'receive')}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        c.received_confirmed
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                      disabled={c.received_confirmed}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{c.received_confirmed ? 'دریافت تأیید شد ✓' : 'تأیید دریافت چک'}</span>
                    </button>

                    <button
                      onClick={() => handleReviewAction(c.id, 'favor')}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        c.in_favor_confirmed
                          ? 'bg-emerald-100 text-emerald-800 cursor-default'
                          : 'bg-[#62205f] text-white hover:opacity-90 shadow-xs'
                      }`}
                      style={!c.in_favor_confirmed ? { backgroundColor: accentColor } : {}}
                      disabled={c.in_favor_confirmed}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{c.in_favor_confirmed ? 'در وجه تأیید شد ✓' : 'تأیید در وجه مدرسه'}</span>
                    </button>

                    <button
                      onClick={() => handleReviewAction(c.id, 'reject')}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>رد چک صیادی</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* List Mode */}
        {(activeTab === 'list' || !isSenior) && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 font-semibold">
              سوابق چک‌های صیادی همراه با وضعیت وصول و تاریخ سررسید:
            </div>

            {allCheques.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
                هیچ چکی در سامانه ثبت نشده است.
              </div>
            ) : (
              allCheques.map((c) => {
                const statusBadge =
                  c.status === 'approved'
                    ? { label: 'تأیید شده / وصول', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
                    : c.status === 'pending'
                    ? { label: 'در انتظار تأیید', bg: 'bg-amber-100 text-amber-800 border-amber-200' }
                    : c.status === 'rejected'
                    ? { label: 'رد شده', bg: 'bg-rose-100 text-rose-800 border-rose-200' }
                    : { label: 'برگشتی', bg: 'bg-red-100 text-red-900 border-red-200' };

                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#341648] text-sm">{c.student_name}</span>
                        <span className="text-xs text-gray-500">({c.school_name})</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        شناسه صیاد: <span className="font-bold text-gray-700">{c.sayad_id}</span> | سررسید: {jalaliFromGregorian(c.due_date)}
                      </div>
                    </div>

                    <div className="text-left sm:text-right self-end sm:self-center">
                      <div className="text-base font-black font-mono text-[#341648]">
                        {formatRial(c.amount)} ریال
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};
