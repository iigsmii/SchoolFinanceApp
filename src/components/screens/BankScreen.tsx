import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian, todayGregorian } from '../../utils/jalali';
import {
  Landmark,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const BankScreen: React.FC = () => {
  const {
    transactions,
    schools,
    currentUser,
    accentColor,
    reconcileBank,
    manualReviewTransaction,
    importBankTransactions,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);

  // Filter bank eligible transactions
  const bankTxs = transactions.filter((t) => {
    if (t.payment_method === 'پول نقد') return false;
    if (t.payment_source === 'own') return false;
    if (!isSenior && t.school_id !== currentUser?.school_id) return false;
    return true;
  });

  const handleReconcile = () => {
    const res = reconcileBank();
    setReconcileResult(`تطبیق هوشمند انجام شد: ${res.matched} تراکنش با بانک تطبیق یافتند و ${res.unmatched} مورد هنوز فاقد صورتحساب معادل هستند.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const newItems = data.map((row) => {
          const amt = Number(String(row['مبلغ'] || row['بدهکار'] || row['بستانکار'] || row['amount'] || 0).replace(/\D/g, ''));
          const track = String(row['شماره پیگیری'] || row['کد پیگیری'] || row['ارجاع'] || row['tracking'] || '').trim();
          const desc = String(row['شرح'] || row['توضیحات'] || row['description'] || 'تراکنش بانکی').trim();

          return {
            date: todayGregorian(),
            school_id: currentUser?.school_id || 1,
            amount: amt || 50000000,
            tracking_code: track || String(Math.floor(10000000 + Math.random() * 90000000)),
            bank_account: 'بانک صادرات ۰۱۹۲۸۳۷۴۶۵',
            description: desc,
          };
        });

        const count = importBankTransactions(newItems);
        alert(`فایل بانک با موفقیت وارد شد: ${count} تراکنش جدید بانکی ثبت شد.`);
      } catch (err) {
        alert('خطا در خواندن فایل بانک: ' + String(err));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="تطبیق بانک و مغایرت‌گیری" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Intro Banner matching Android strings */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs text-xs text-gray-700 leading-relaxed">
          <p className="font-bold text-[#341648] text-sm mb-1">راهنمای تطبیق با بانک:</p>
          تمام تراکنش‌های ثبت‌شده توسط مدیران در این بخش نمایش داده می‌شود. تیک سبز یعنی با بانک تطبیق شده و علامت اخطار یعنی مغایرت یا عدم تطبیق در سامانه بانکی.
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] text-[#341648] font-bold text-sm shadow-xs cursor-pointer active:scale-95 transition-all">
            <Upload className="w-5 h-5 text-emerald-600" />
            <span>انتخاب و ورود فایل صورتحساب بانک (Excel/CSV)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleReconcile}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-md active:scale-95 transition-all"
            style={{ backgroundColor: accentColor }}
          >
            <RefreshCw className="w-5 h-5" />
            شروع تطبیق هوشمند تراکنش‌ها
          </button>
        </div>

        {reconcileResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <span>{reconcileResult}</span>
            <button onClick={() => setReconcileResult(null)} className="text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bank Reconciliation Review Cards */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold">
            فهرست تراکنش‌های بانکی ({bankTxs.length} تراکنش):
          </div>

          {bankTxs.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              تراکنش بانکی برای بررسی وجود ندارد.
            </div>
          ) : (
            bankTxs.map((t) => {
              const matched = t.reconciled;
              const isApproved = t.review_status === 'approved';

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-3 hover:border-[#62205f]/40 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#341648]">
                          {t.student_name ? `شهریه دانش‌آموز: ${t.student_name}` : t.expense_category_name || t.description}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">({t.school_name})</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                        <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                        <span>روش: {t.payment_method || 'بانک'}</span>
                        <span>کد پیگیری: <span className="font-mono">{t.tracking_code || '—'}</span></span>
                      </div>
                    </div>
                    <div className="text-base sm:text-lg font-black font-mono text-[#341648] self-end sm:self-center">
                      {formatRial(t.amount)} ریال
                    </div>
                  </div>

                  {/* Reconciliation & Review Indicators */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        matched
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <span>تطبیق صورتحساب بانک:</span>
                      <span className="font-bold">
                        {matched ? '✓ تأیید و تطبیق شده' : '✕ در انتظار / عدم تطبیق'}
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        isApproved
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <span>تأیید مدیر ارشد:</span>
                      <span className="font-bold">
                        {isApproved ? '✓ تأیید شده' : 'در انتظار بررسی'}
                      </span>
                    </div>
                  </div>

                  {/* Senior Review Actions */}
                  {isSenior && (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => manualReviewTransaction(t.id, true)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          matched && isApproved
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                        disabled={matched && isApproved}
                      >
                        <Check className="w-4 h-4" />
                        <span>تأیید صحت تراکنش</span>
                      </button>

                      <button
                        onClick={() => manualReviewTransaction(t.id, false, 'رد توسط مدیر ارشد')}
                        className="py-2 px-4 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        <span>رد / اعلام مغایرت</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
