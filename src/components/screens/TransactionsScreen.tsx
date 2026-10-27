import React, { useState, useMemo, useDeferredValue } from 'react';
import { useApp } from '../../context/AppContext';
import { normalizeSearchText, matchTokens } from '../../utils/studentSearch';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';
import {
  Trash2,
  Search,
  Image as ImageIcon,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  AlertTriangle,
  Download,
  Filter,
} from 'lucide-react';
import { Transaction } from '../../types';
import { AttachmentImg } from '../AttachmentImg';
import { openAttachment } from '../../services/attachments';

export const TransactionsScreen: React.FC = () => {
  const {
    transactions,
    currentUser,
    deleteTransaction,
    approveTransaction,
    rejectTransaction,
    accentColor,
    schools,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [filterKind, setFilterKind] = useState<'all' | 'debt' | 'payment' | 'expense'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [filterAccount, setFilterAccount] = useState('all');
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; title: string } | null>(null);

  // Reject Modal state
  const [rejectModalTx, setRejectModalTx] = useState<Transaction | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const scopedTxs = useMemo(() => {
    return isSenior
      ? transactions
      : transactions.filter((t) => t.school_id === currentUser?.school_id);
  }, [transactions, isSenior, currentUser]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    scopedTxs.forEach((t) => {
      const st = t.review_status || 'approved';
      if (st === 'pending') pending++;
      else if (st === 'approved') approved++;
      else if (st === 'rejected') rejected++;
    });
    return { pending, approved, rejected, total: scopedTxs.length };
  }, [scopedTxs]);

  const linkedAccounts = useMemo(() => {
    return Array.from(
      new Set(scopedTxs.map((t) => t.linked_account_name).filter((x): x is string => !!x))
    ).sort();
  }, [scopedTxs]);

  const filtered = useMemo(() => {
    return scopedTxs.filter((t) => {
      if (filterAccount !== 'all' && t.linked_account_name !== filterAccount) return false;
      if (filterKind === 'debt' && t.kind !== 'شهریه_بدهی') return false;
      if (filterKind === 'payment' && t.kind !== 'شهریه') return false;
      if (filterKind === 'expense' && t.kind !== 'هزینه') return false;

      const st = t.review_status || 'approved';
      if (filterStatus !== 'all' && st !== filterStatus) return false;

      if (deferredQuery.trim()) {
        const combined = [
          t.description,
          t.comment,
          t.student_name,
          t.expense_category_name,
          t.tracking_code,
          t.linked_account_name,
          t.amount,
        ]
          .filter(Boolean)
          .join(' ');

        return matchTokens(combined, deferredQuery);
      }
      return true;
    });
  }, [scopedTxs, filterAccount, filterKind, filterStatus, deferredQuery]);

  const handleApprove = async (txId: number) => {
    setIsSubmittingReview(true);
    try {
      await approveTransaction(txId);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenReject = (tx: Transaction) => {
    setRejectModalTx(tx);
    setRejectionReasonInput(tx.rejection_reason || '');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalTx) return;
    setIsSubmittingReview(true);
    try {
      await rejectTransaction(rejectModalTx.id, rejectionReasonInput.trim() || 'عدم تأیید توسط مدیر ارشد');
      setRejectModalTx(null);
      setRejectionReasonInput('');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16 w-full max-w-full overflow-x-hidden">
      <Header title="دفتر کل و کاردکس تراکنش‌ها" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5 w-full min-w-0">
        {/* Status Filters Bar */}
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-xs font-bold text-[#341648] flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-purple-700" />
              وضعیت تأیید مدیریت ارشد:
            </span>
            {isSenior && counts.pending > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                {counts.pending} مورد در انتظار بررسی شما
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'all', label: 'همه تراکنش‌ها', count: counts.total, color: 'gray' },
              { id: 'pending', label: 'در انتظار تأیید', count: counts.pending, color: 'amber' },
              { id: 'approved', label: 'تأیید شده (سبز)', count: counts.approved, color: 'emerald' },
              { id: 'rejected', label: 'رد شده (قرمز)', count: counts.rejected, color: 'rose' },
            ].map((st) => {
              const active = filterStatus === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFilterStatus(st.id as typeof filterStatus)}
                  className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-1.5 transition-all ${
                    active
                      ? st.id === 'approved'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : st.id === 'rejected'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : st.id === 'pending'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-[#341648] text-white shadow-xs'
                      : 'bg-[#fcfaff] text-gray-700 border border-[#e5dde8] hover:bg-gray-50'
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative pt-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجو بر اساس شرح، نام دانش‌آموز، کد پیگیری..."
              className="w-full pl-10 pr-11 py-3 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
            />
            <Search className="w-5 h-5 text-gray-400 absolute right-3.5 top-4.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-4.5 text-gray-400 hover:text-gray-600 transition-colors"
                title="پاک کردن جستجو"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {linkedAccounts.length > 0 && (
            <label className="block text-xs font-bold text-gray-700">
              ریزگردش حساب
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e5dde8] bg-white p-3 text-sm"
              >
                <option value="all">همه حساب‌ها</option>
                {linkedAccounts.map((account) => (
                  <option key={account} value={account}>
                    {account}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Kind Filter Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { id: 'all', label: 'همه انواع' },
              { id: 'debt', label: 'بدهی شهریه' },
              { id: 'payment', label: 'دریافت شهریه' },
              { id: 'expense', label: 'هزینه‌ها' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterKind(f.id as typeof filterKind)}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all ${
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
            <span>نمایش: {filtered.length} تراکنش</span>
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
              const isOtherReceipt = t.kind === 'دریافت متفرقه';
              const status = t.review_status || 'approved';
              const isApproved = status === 'approved';
              const isRejected = status === 'rejected';
              const isPending = status === 'pending';

              // Visual styling matching user requirement:
              // تأیید شده -> رنگ سبز (Green)
              // رد شده -> رنگ قرمز (Red)
              // در انتظار بررسی -> کهربایی/زرد (Amber)
              const cardBorderClass = isApproved
                ? 'border-emerald-300 bg-emerald-50/15'
                : isRejected
                ? 'border-rose-300 bg-rose-50/25'
                : 'border-amber-300 bg-amber-50/20';

              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border-2 shadow-xs flex flex-col justify-between gap-3 overflow-hidden transition-all ${cardBorderClass}`}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Header Row: Kind Tag & Approval Status Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg ${
                            isDebt
                              ? 'bg-rose-100 text-rose-800'
                              : isExpense
                              ? 'bg-purple-100 text-purple-800'
                              : isOtherReceipt
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isDebt
                            ? 'بدهی شهریه'
                            : isExpense
                            ? 'هزینه جاری'
                            : isOtherReceipt
                            ? 'واریزی تن‌خواه'
                            : 'دریافت شهریه'}
                        </span>
                        <h4 className="font-bold text-sm text-[#341648] truncate">
                          {t.student_name || t.expense_category_name || t.description}
                        </h4>
                      </div>

                      {/* Approval Status Badge */}
                      <div>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            تأیید شده
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                            <XCircle className="w-3.5 h-3.5 text-rose-700" />
                            رد شده توسط ارشد
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            در انتظار بررسی مدیر ارشد
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                      <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                      <span>مدرسه: {t.school_name || 'مدرسه'}</span>
                      {t.payment_method && <span>روش پرداخت: {t.payment_method}</span>}
                      {t.tracking_code && (
                        <span>
                          پیگیری: <span className="font-mono font-bold text-gray-700">{t.tracking_code}</span>
                        </span>
                      )}
                    </div>

                    {t.linked_account_name && (
                      <div className="text-xs text-indigo-700 font-semibold">
                        حساب مرتبط: {t.linked_account_name}
                      </div>
                    )}
                    {t.petty_cash_card && (
                      <div className="text-xs text-gray-500">
                        کارت تن‌خواه: <span className="font-mono">{t.petty_cash_card}</span>
                      </div>
                    )}
                    {t.description && (
                      <div className="text-xs text-gray-700 bg-white/70 p-2 rounded-xl border border-gray-200/60 break-words">
                        شرح: {t.description}
                      </div>
                    )}

                    {/* Rejection Note */}
                    {isRejected && t.rejection_reason && (
                      <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs font-semibold text-rose-900 flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">علت رد تراکنش: </span>
                          <span>{t.rejection_reason}</span>
                        </div>
                      </div>
                    )}

                    {/* Attachment Photo Section */}
                    {t.attachment_url && (
                      <div className="mt-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <AttachmentImg
                            src={t.attachment_url}
                            alt="رسید تراکنش"
                            loading="lazy"
                            onClick={() =>
                              setSelectedAttachment({
                                url: t.attachment_url!,
                                title: `پیوست تراکنش شناسه ${t.id} - ${t.student_name || t.expense_category_name || ''}`,
                              })
                            }
                            className="w-14 h-14 object-cover rounded-xl border border-indigo-200 bg-white shadow-xs cursor-pointer hover:scale-105 transition-transform"
                          />
                          <div>
                            <div className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5 text-indigo-700" />
                              تصویر فاکتور / رسید پیوست
                            </div>
                            <span className="text-[11px] text-gray-500">برای بزرگ‌نمایی تصویر کلیک کنید</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAttachment({
                              url: t.attachment_url!,
                              title: `پیوست تراکنش شماره ${t.id}`,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-indigo-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مشاهده</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Amount and Action Buttons */}
                  <div className="flex items-center justify-between w-full pt-2 border-t border-gray-100 flex-wrap gap-2">
                    <div
                      className={`text-base font-black font-mono ${
                        isDebt || isExpense ? 'text-gray-900' : 'text-emerald-700'
                      }`}
                    >
                      {formatRial(t.amount)} ریال
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Senior Manager Quick Approval Buttons */}
                      {isSenior && (
                        <div className="flex items-center gap-1.5">
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleApprove(t.id)}
                              disabled={isSubmittingReview}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                              title="تأیید تراکنش توسط مدیر ارشد"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>تأیید</span>
                            </button>
                          )}

                          {!isRejected && (
                            <button
                              type="button"
                              onClick={() => handleOpenReject(t)}
                              disabled={isSubmittingReview}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                              title="رد تراکنش و ثبت علت"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>رد</span>
                            </button>
                          )}
                        </div>
                      )}

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
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Reject Reason Modal for Senior */}
      {rejectModalTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>رد تراکنش شناسه {rejectModalTx.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalTx(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              لطفاً علت رد این تراکنش را ثبت فرمایید تا در سامانه و برای مدیر شعبه نمایش داده شود:
            </p>

            <textarea
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="مثال: شماره پیگیری با گردش حساب همخوانی ندارد، عکس رسید ناخواناست و..."
              rows={3}
              className="w-full p-3 text-xs bg-[#fdfcfd] rounded-2xl border border-gray-300 focus:outline-hidden focus:border-rose-500"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReview}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
              >
                تأیید رد تراکنش (قرمز)
              </button>
              <button
                type="button"
                onClick={() => setRejectModalTx(null)}
                className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Fullscreen Modal */}
      {selectedAttachment && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setSelectedAttachment(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-[#341648] truncate">{selectedAttachment.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedAttachment(null)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-600"
                aria-label="بستن تصویر"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-5 overflow-auto flex items-center justify-center bg-gray-950/5 min-h-56">
              <AttachmentImg
                src={selectedAttachment.url}
                alt={selectedAttachment.title}
                className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-md border border-gray-200"
              />
            </div>
            <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 text-xs">
              <span className="text-gray-500">تصویر رسمی رسید بانکی و فاکتور</span>
              <button
                type="button"
                onClick={() => void openAttachment(selectedAttachment.url)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-1.5 shadow-2xs hover:bg-indigo-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود و باز کردن فایل اصلی</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
