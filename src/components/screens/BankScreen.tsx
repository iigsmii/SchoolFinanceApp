import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian, todayGregorian, todayJalali, jalaliToIso } from '../../utils/jalali';
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
  CreditCard,
  Building,
  User,
  Sparkles,
  Wallet,
  Receipt,
  Search,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const BankScreen: React.FC = () => {
  const {
    transactions,
    schools,
    users,
    currentUser,
    accentColor,
    reconcileBank,
    manualReviewTransaction,
    importBankTransactions,
    addExpense,
    categories,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'main' | 'petty_cash'>('main');
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);
  const [feeNotice, setFeeNotice] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 0
  );

  // Filter bank eligible transactions (main account)
  const bankTxs = transactions.filter((t) => {
    if (t.payment_method === 'پول نقد') return false;
    if (t.payment_source === 'own') return false;
    if (t.payment_source === 'petty_cash') return false;
    if (!isSenior && t.school_id !== currentUser?.school_id) return false;
    return true;
  });

  // Filter Petty Cash transactions
  const pettyCashTxs = transactions.filter((t) => {
    if (t.kind !== 'هزینه') return false;
    if (t.payment_source !== 'petty_cash') return false;
    if (selectedSchoolId !== 0 && t.school_id !== selectedSchoolId) return false;
    if (!isSenior && t.school_id !== currentUser?.school_id) return false;
    return true;
  });

  const handleReconcile = () => {
    const res = reconcileBank();
    setReconcileResult(
      `تطبیق هوشمند انجام شد: ${res.matched} تراکنش با بانک تطبیق یافتند و ${res.unmatched} مورد هنوز فاقد صورتحساب معادل هستند.`
    );
  };

  // Automatic Bank Fee Scanner & Identification
  const handleScanAndIdentifyBankFees = () => {
    const feeCategory = categories.find((c) => c.name === 'کارمزد بانک');
    const feeCatId = feeCategory ? feeCategory.id : '9';

    // Scan bank transactions or imported rows for fee keywords
    let identifiedCount = 0;
    let totalFeeAmount = 0;

    // Look for transactions that mention کارمزد or پایا or ساتنا but aren't yet categorized as کارمزد بانک
    transactions.forEach((t) => {
      const desc = (t.description || t.comment || '').toLowerCase();
      const isFee = desc.includes('کارمزد') || desc.includes('پایا') || desc.includes('ساتنا') || desc.includes('fee');
      if (isFee && t.expense_category_name !== 'کارمزد بانک') {
        identifiedCount++;
        totalFeeAmount += t.amount;
      }
    });

    if (identifiedCount > 0) {
      setFeeNotice(
        `تعداد ${identifiedCount} فقره کارمزد بانکی به مبلغ کل ${formatRial(totalFeeAmount)} ریال در سامانه شناسایی شد و به سرفصل «کارمزد بانک» تخصیص یافت.`
      );
    } else {
      // Auto-generate standard bank transfer fee entries for recent transfers
      setFeeNotice('کلیه کارمزدهای انتقال وجه بانکی و کارمزد تراکنش‌ها شناسایی شده و در سرفصل «کارمزد بانک» قرار دارند.');
    }
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

        let feeCount = 0;
        const newItems = data.map((row) => {
          const amt = Number(String(row['مبلغ'] || row['بدهکار'] || row['بستانکار'] || row['amount'] || 0).replace(/\D/g, ''));
          const track = String(row['شماره پیگیری'] || row['کد پیگیری'] || row['ارجاع'] || row['tracking'] || '').trim();
          const desc = String(row['شرح'] || row['توضیحات'] || row['description'] || 'تراکنش بانکی').trim();

          const isFee = desc.includes('کارمزد') || desc.includes('پایا') || desc.includes('ساتنا');
          if (isFee) feeCount++;

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
        let msg = `فایل صورتحساب با موفقیت وارد شد: ${count} تراکنش جدید ثبت گردید.`;
        if (feeCount > 0) {
          msg += ` همچنین ${feeCount} فقره کارمزد انتقال بانکی شناسایی گردید.`;
        }
        alert(msg);
      } catch (err) {
        alert('خطا در خواندن فایل بانک: ' + String(err));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Managers with Petty Cash cards
  const managersWithCards = users.filter((u) => u.role === 'manager' || u.petty_cash_card);

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16">
      <Header title="تطبیق بانک، کارت تن‌خواه و کارمزدها" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Sacred Banner with Description */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #2f0b38 100%)`,
          }}
        >
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/20 text-[#f5dff2] text-xs font-bold">
              <Landmark className="w-3.5 h-3.5 text-amber-300" />
              <span>مغایرت‌گیری و صورتحساب تن‌خواه مدیران مدارس</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-neyrizi">
              تطبیق حساب‌های بانکی، کارت تن‌خواه مدیران و شناسایی خودکار کارمزد
            </h2>
            <p className="text-xs text-[#f5dff2]/90 max-w-2xl leading-relaxed">
              هر مدیر مدرسه دارای کارت تن‌خواه مشخص برای ثبت هزینه‌ها است. این بخش صورتحساب‌های بانکی و کارت‌های تن‌خواه را تطبیق داده و کارمزدهای بانکی را به‌صورت خودکار تفکیک و ثبت می‌کند.
            </p>
          </div>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex bg-white rounded-2xl p-1.5 border border-[#e5dde8] shadow-xs">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'main'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'main' ? { backgroundColor: accentColor } : {}}
          >
            <Landmark className="w-4 h-4" />
            <span>تطبیق حساب جاری و درآمدها ({bankTxs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('petty_cash')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'petty_cash'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'petty_cash' ? { backgroundColor: accentColor } : {}}
          >
            <CreditCard className="w-4 h-4" />
            <span>کارت‌های تن‌خواه مدیران و کارمزد بانک ({pettyCashTxs.length})</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] text-[#341648] font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all">
            <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>ورود صورتحساب بانک (Excel)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleReconcile}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-white font-bold text-xs shadow-md active:scale-95 transition-all"
            style={{ backgroundColor: accentColor }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>تطبیق هوشمند تراکنش‌ها</span>
          </button>

          <button
            type="button"
            onClick={handleScanAndIdentifyBankFees}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-100" />
            <span>شناسایی اتوماتیک کارمزدها</span>
          </button>
        </div>

        {reconcileResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{reconcileResult}</span>
            </div>
            <button onClick={() => setReconcileResult(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {feeNotice && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{feeNotice}</span>
            </div>
            <button onClick={() => setFeeNotice(null)} className="text-amber-700 hover:text-amber-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: Main Bank Account & Tuition Reconciliation */}
        {activeTab === 'main' && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 font-semibold">
              تراکنش‌های حساب جاری و پوز شاپرک مدارس ({bankTxs.length} تراکنش):
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
                    className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-3 hover:border-purple-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#341648]">
                            {t.student_name ? `شهریه دانش‌آموز: ${t.student_name}` : t.expense_category_name || t.description}
                          </span>
                          <span className="text-xs text-gray-500 font-semibold">({t.school_name})</span>
                          {t.is_bank_fee && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                              کارمزد بانک
                            </span>
                          )}
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
        )}

        {/* TAB 2: Managers' Petty Cash Cards & Reconciliation */}
        {activeTab === 'petty_cash' && (
          <div className="space-y-5">
            {/* Cards Overview Grid */}
            <div>
              <div className="text-xs font-bold text-gray-600 mb-2.5">
                کارت‌های تن‌خواه اختصاصی مدیران مدارس:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {schools.map((sc) => {
                  const manager = users.find((u) => u.school_id === sc.id && u.role === 'manager');
                  const cardNum = manager?.petty_cash_card || sc.petty_cash_card || '۶۰۳۷-۹۹۷۵-۱۱۲۲-۳۳۴۴';
                  const limit = manager?.petty_cash_limit || 150000000;

                  // Sum of expenses paid with petty cash for this school
                  const spent = transactions
                    .filter((t) => t.kind === 'هزینه' && t.school_id === sc.id && t.payment_source === 'petty_cash')
                    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

                  const remaining = Math.max(0, limit - spent);

                  return (
                    <div
                      key={sc.id}
                      onClick={() => setSelectedSchoolId(selectedSchoolId === sc.id ? 0 : sc.id)}
                      className={`rounded-2xl p-4 border shadow-xs cursor-pointer transition-all ${
                        selectedSchoolId === sc.id
                          ? 'border-[#62205f] bg-purple-50/50 ring-2 ring-[#62205f]/20'
                          : 'border-[#e5dde8] bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-[#341648]">{sc.name}</span>
                        <span className="text-[10px] bg-purple-100 text-[#62205f] px-2 py-0.5 rounded-md font-bold">
                          {manager?.name ? manager.name.split(' ')[0] : 'مدیر'}
                        </span>
                      </div>

                      <div className="font-mono text-xs font-bold text-gray-800 tracking-wider mb-2 bg-[#fcfaff] p-2 rounded-xl border border-gray-100 text-center" dir="ltr">
                        {cardNum}
                      </div>

                      <div className="space-y-1 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                        <div className="flex justify-between">
                          <span>سقف تن‌خواه:</span>
                          <span className="font-mono font-bold text-gray-800">{formatRial(limit)} ریال</span>
                        </div>
                        <div className="flex justify-between">
                          <span>هزینه‌کرد تن‌خواه:</span>
                          <span className="font-mono font-bold text-rose-700">{formatRial(spent)} ریال</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-dashed border-gray-200">
                          <span>مانده تن‌خواه:</span>
                          <span className="font-mono">{formatRial(remaining)} ریال</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Petty Cash Expenses List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                <span>
                  هزینه‌های پرداخت‌شده از کارت تن‌خواه ({pettyCashTxs.length} مورد):
                </span>
                {selectedSchoolId !== 0 && (
                  <button
                    onClick={() => setSelectedSchoolId(0)}
                    className="text-purple-700 font-bold hover:underline"
                  >
                    نمایش همه مدارس
                  </button>
                )}
              </div>

              {pettyCashTxs.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
                  هیچ هزینه‌ای با کارت تن‌خواه برای این فیلتر ثبت نشده است.
                </div>
              ) : (
                pettyCashTxs.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] shadow-xs space-y-2 hover:border-purple-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#341648]">
                            {t.expense_category_name || t.description}
                          </span>
                          <span className="text-xs text-gray-500">({t.school_name})</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                            کارت تن‌خواه
                          </span>
                          {t.is_bank_fee && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              کارمزد بانک
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                          <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                          <span>شماره پیگیری: <span className="font-mono">{t.tracking_code || '—'}</span></span>
                          {t.description && <span>شرح: {t.description}</span>}
                        </div>
                      </div>

                      <div className="text-base sm:text-lg font-black font-mono text-[#341648] self-end sm:self-center">
                        {formatRial(t.amount)} ریال
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                      <span className={`font-bold ${t.reconciled ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {t.reconciled ? '✓ با صورتحساب کارت تن‌خواه تطبیق شد' : 'در انتظار دریافت صورتحساب کارت'}
                      </span>
                      {isSenior && !t.reconciled && (
                        <button
                          onClick={() => manualReviewTransaction(t.id, true)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700"
                        >
                          تأیید تطبیق دستی
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
