import { takeNavHint } from '../../utils/alerts';
import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { useBackClose } from '../../hooks/useBackClose';
import { useApp } from '../../context/AppContext';
import { normalizeSearchText, matchTokens } from '../../utils/studentSearch';
import { Header } from '../Header';
import { PersianSearchInput } from '../PersianSearchInput';
import { formatRial, jalaliFromGregorian, jalaliToIso, latinDigits, todayJalali } from '../../utils/jalali';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { QuickAmountPad } from '../QuickAmountPad';
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
  Pencil,
  Lock,
  Info,
} from 'lucide-react';
import { Transaction } from '../../types';
import { AttachmentImg } from '../AttachmentImg';
import { openAttachment } from '../../services/attachments';

export const TransactionsScreen: React.FC = () => {
  const {
    transactions,
    currentUser,
    deleteTransaction,
    updateTransaction,
    cheques,
    approveTransaction,
    rejectTransaction,
    accentColor,
    schools,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  // The hint is consumed once; reading it again (re-render / initializer) would return null.
  const [initialTransactionHint] = useState<string | null>(() => takeNavHint('transactions'));
  const initialTransactionId = initialTransactionHint?.startsWith('transaction:') ? Number(initialTransactionHint.slice('transaction:'.length)) : null;
  const [focusTransactionId, setFocusTransactionId] = useState<number | null>(initialTransactionId && Number.isFinite(initialTransactionId) ? initialTransactionId : null);

  const [filterKind, setFilterKind] = useState<'all' | 'debt' | 'payment' | 'expense'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'delete_pending'>(() => (initialTransactionHint === 'rejected' ? 'rejected' : 'all'));
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [filterAccount, setFilterAccount] = useState('all');
  const [transactionPage, setTransactionPage] = useState(0);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  useBackClose(!!editingTx, () => setEditingTx(null));
  const [editAmount, setEditAmount] = useState('');
  const [editDateJalali, setEditDateJalali] = useState(todayJalali());
  const [editTracking, setEditTracking] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const TRANSACTION_PAGE_SIZE = 50;

  useEffect(() => {
    setTransactionPage(0);
  }, [filterAccount, filterKind, filterStatus, deferredQuery]);
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; title: string } | null>(null);
  useBackClose(!!selectedAttachment, () => setSelectedAttachment(null));

  // Reject Modal state
  const [rejectModalTx, setRejectModalTx] = useState<Transaction | null>(null);
  useBackClose(!!rejectModalTx, () => setRejectModalTx(null));
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
    let deletePending = 0;
    scopedTxs.forEach((t) => {
      const st = t.review_status || 'approved';
      if (st === 'pending') pending++;
      else if (st === 'approved') approved++;
      else if (st === 'rejected') rejected++;
      else if (st === 'delete_pending') deletePending++;
    });
    return { pending, approved, rejected, deletePending, total: scopedTxs.length };
  }, [scopedTxs]);

  const linkedAccounts = useMemo(() => {
    return Array.from(
      new Set(scopedTxs.map((t) => t.linked_account_name).filter((x): x is string => !!x))
    ).sort();
  }, [scopedTxs]);

  const filtered = useMemo(() => {
    return scopedTxs.filter((t) => {
      if (focusTransactionId && Number(t.id) === Number(focusTransactionId)) return true;
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
    }).sort((a, b) => {
      if (focusTransactionId) {
        if (Number(a.id) === Number(focusTransactionId)) return -1;
        if (Number(b.id) === Number(focusTransactionId)) return 1;
      }
      // Newest first: by transaction date, then by id (ids grow with creation time) as the tie-breaker.
      const byDate = String(b.date || '').localeCompare(String(a.date || ''));
      return byDate !== 0 ? byDate : Number(b.id) - Number(a.id);
    });
  }, [scopedTxs, filterAccount, filterKind, filterStatus, deferredQuery, focusTransactionId]);

  useEffect(() => {
    if (!focusTransactionId) return;
    setTransactionPage(0);
    const timer = window.setTimeout(() => {
      document.getElementById(`transaction-card-${focusTransactionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusTransactionId, filtered.length]);

  const transactionPageCount = Math.max(1, Math.ceil(filtered.length / TRANSACTION_PAGE_SIZE));
  const visibleTransactions = filtered.slice(
    transactionPage * TRANSACTION_PAGE_SIZE,
    (transactionPage + 1) * TRANSACTION_PAGE_SIZE
  );

  const handleApprove = async (txId: number) => {
    setIsSubmittingReview(true);
    try {
      await approveTransaction(txId);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  /** آیا این سند از این صفحه قابل ویرایش است؟ در غیر این صورت دلیلش را برمی‌گرداند. */
  const editability = (t: Transaction): { ok: boolean; reason?: string } => {
    if (!['شهریه', 'هزینه', 'دریافت متفرقه'].includes(String(t.kind))) return { ok: false };
    const mine = isSenior || String(t.registered_by ?? '') === String(currentUser?.id ?? '');
    if (!mine) return { ok: false };
    if ((t.review_status || 'approved') === 'delete_pending') return { ok: false, reason: 'درخواست حذف این سند در انتظار تصمیم مدیر ارشد است.' };
    if (t.reconciled) return { ok: false, reason: 'با صورتحساب بانک تطبیق شده؛ برای ویرایش ابتدا تطبیق بانکی را لغو کنید.' };
    if (t.kind === 'شهریه' && cheques.some((c) => Number(c.tuition_id) === Number(t.id) && c.status !== 'returned' && c.status !== 'bounced'))
      return { ok: false, reason: 'این پرداخت از روی چک ثبت شده؛ آن را از صفحه‌ی چک‌ها ویرایش کنید.' };
    return { ok: true };
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    const amt = Number(tx.amount || 0);
    setEditAmount(amt ? amt.toLocaleString('en-US') : '');
    setEditDateJalali(tx.date ? jalaliFromGregorian(String(tx.date).slice(0, 10)) : todayJalali());
    setEditTracking(latinDigits(String(tx.tracking_code || '')));
    setEditDescription(String(tx.description || tx.comment || ''));
    setEditError('');
  };

  const handleSaveTx = () => {
    if (!editingTx) return;
    const amount = Number(latinDigits(editAmount).replace(/\D/g, '')) || 0;
    const iso = jalaliToIso(editDateJalali);
    if (amount <= 0) { setEditError('مبلغ را به ریال و درست وارد کنید.'); return; }
    if (!iso) { setEditError('تاریخ را انتخاب کنید.'); return; }
    // updateTransaction already sends the record back to the senior's approval queue (locally and on the server).
    updateTransaction(editingTx.id, {
      amount,
      date: iso,
      tracking_code: latinDigits(editTracking).trim(),
      description: editDescription.trim(),
      comment: editDescription.trim(),
    });
    setEditingTx(null);
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
            {isSenior && counts.pending + counts.deletePending > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                {counts.pending + counts.deletePending} مورد در انتظار بررسی شما
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'all', label: 'همه تراکنش‌ها', count: counts.total, color: 'gray' },
              { id: 'pending', label: 'در انتظار تأیید', count: counts.pending, color: 'amber' },
              { id: 'approved', label: 'تأیید شده (سبز)', count: counts.approved, color: 'emerald' },
              { id: 'rejected', label: 'رد شده (قرمز)', count: counts.rejected, color: 'rose' },
              ...(counts.deletePending > 0 ? [{ id: 'delete_pending', label: 'درخواست حذف', count: counts.deletePending, color: 'orange' }] : []),
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
                        : st.id === 'delete_pending'
                        ? 'bg-orange-600 text-white shadow-xs'
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

          {/* Search Box with dedicated button */}
          <div className="pt-1">
            <PersianSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="جست‌وجو بر اساس شرح، نام دانش‌آموز، کد پیگیری..."
              buttonLabel="جستجو"
            />
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
            <span>نمایش {filtered.length === 0 ? 0 : transactionPage * TRANSACTION_PAGE_SIZE + 1} تا {Math.min((transactionPage + 1) * TRANSACTION_PAGE_SIZE, filtered.length)} از {filtered.length.toLocaleString('fa-IR')} تراکنش</span>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              تراکنشی با این شرایط پیدا نشد.
            </div>
          ) : (
            visibleTransactions.map((t) => {
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
                  id={`transaction-card-${t.id}`}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border-2 shadow-xs flex flex-col justify-between gap-3 overflow-hidden transition-all ${cardBorderClass} ${focusTransactionId === Number(t.id) ? 'ring-4 ring-purple-400 ring-offset-2' : ''}`}
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
                        {status === 'delete_pending' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-300">درخواست حذف در انتظار تأیید ارشد</span>}
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
                      {(() => {
                        const ed = editability(t);
                        if (ed.ok) {
                          return (
                            <button type="button" onClick={() => handleEditTx(t)}
                              className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 active:scale-95 transition-all"
                              title="ویرایش و ارسال دوباره برای تأیید">
                              <Pencil className="w-3.5 h-3.5" />
                              <span>ویرایش</span>
                            </button>
                          );
                        }
                        return ed.reason ? (
                          <button type="button" onClick={() => window.alert(ed.reason)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50" title={ed.reason}>
                            <Lock className="w-4 h-4" />
                          </button>
                        ) : null;
                      })()}
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
                              <span>{status === 'delete_pending' ? 'تأیید حذف' : 'تأیید'}</span>
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

                      {status !== 'delete_pending' && (
                        <button
                          onClick={() => {
                            const needsRequest = isApproved && !isSenior;
                            const msg = needsRequest
                              ? 'این سند تأیید شده است. درخواست حذف برای بررسی مدیر ارشد ارسال شود؟'
                              : 'آیا از حذف این تراکنش مطمئن هستید؟';
                            if (window.confirm(msg)) deleteTransaction(t.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title={isApproved && !isSenior ? 'درخواست حذف' : 'حذف تراکنش'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {filtered.length > TRANSACTION_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#e5dde8] bg-white p-3">
              <button type="button" onClick={() => setTransactionPage((page) => Math.max(0, page - 1))} disabled={transactionPage === 0} className="rounded-xl border border-[#e5dde8] px-4 py-2 text-xs font-bold text-[#341648] disabled:cursor-not-allowed disabled:opacity-40">صفحه قبل</button>
              <span className="text-xs font-semibold text-gray-600">صفحه { (transactionPage + 1).toLocaleString('fa-IR') } از {transactionPageCount.toLocaleString('fa-IR')}</span>
              <button type="button" onClick={() => setTransactionPage((page) => Math.min(transactionPageCount - 1, page + 1))} disabled={transactionPage >= transactionPageCount - 1} className="rounded-xl border border-[#e5dde8] px-4 py-2 text-xs font-bold text-[#341648] disabled:cursor-not-allowed disabled:opacity-40">صفحه بعد</button>
            </div>
          )}
        </div>
      </main>

      {editingTx && (() => {
        const st = editingTx.review_status || 'approved';
        const title = editingTx.kind === 'هزینه' ? 'ویرایش هزینه' : editingTx.kind === 'شهریه' ? 'ویرایش پرداخت شهریه' : 'ویرایش سند';
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditingTx(null)}>
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#e5dde8] max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#efe8f1]" style={{ background: `linear-gradient(135deg, ${accentColor}14, transparent)` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: accentColor }}>
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-[#341648] text-sm">{title}</h3>
                    <p className="text-[11px] text-gray-500 truncate">
                      سند #{editingTx.id}{editingTx.student_name ? ` · ${editingTx.student_name}` : editingTx.expense_category_name ? ` · ${editingTx.expense_category_name}` : ''}
                    </p>
                  </div>
                </div>
                <button type="button" aria-label="بستن" onClick={() => setEditingTx(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-4">
                <div className={`rounded-2xl border p-3 text-[11px] leading-6 flex items-start gap-2 ${st === 'rejected' ? 'bg-rose-50 border-rose-200 text-rose-900' : st === 'approved' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-sky-50 border-sky-200 text-sky-900'}`}>
                  <Info className="w-4 h-4 shrink-0 mt-1" />
                  <div>
                    {st === 'rejected' && editingTx.rejection_reason && <div className="font-bold">دلیل رد: {editingTx.rejection_reason}</div>}
                    {st === 'approved'
                      ? 'این سند تأیید شده است. با ذخیره‌ی ویرایش، دوباره به صف تأیید مدیر ارشد می‌رود و تا تأیید مجدد، نهایی حساب نمی‌شود.'
                      : st === 'rejected'
                      ? 'پس از اصلاح و ذخیره، سند دوباره برای تأیید مدیر ارشد ارسال می‌شود.'
                      : 'سند هنوز در انتظار تأیید است؛ تغییرات ذخیره می‌شود و بررسی ادامه دارد.'}
                  </div>
                </div>

                {editError && <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3">{editError}</div>}

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">مبلغ (ریال)</label>
                  <input type="tel" inputMode="numeric" autoComplete="off" value={editAmount}
                    onChange={(e) => { const raw = latinDigits(e.target.value).replace(/\D/g, ''); setEditAmount(raw ? Number(raw).toLocaleString('en-US') : ''); }}
                    className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-base font-black font-mono text-left" dir="ltr" />
                  <QuickAmountPad value={editAmount} onChange={setEditAmount} accentColor={accentColor} />
                </div>

                <JalaliDatePicker label="تاریخ" value={editDateJalali} onChange={setEditDateJalali} required />

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">شماره پیگیری</label>
                  <input type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={editTracking}
                    onChange={(e) => setEditTracking(latinDigits(e.target.value))}
                    className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left" dir="ltr" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">شرح</label>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3}
                    className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm" />
                </div>
              </div>

              <div className="flex items-center gap-3 px-5 py-4 border-t border-[#efe8f1] bg-white">
                <button type="button" onClick={handleSaveTx} className="flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: accentColor }}>
                  <Check className="w-4 h-4" />
                  <span>ذخیره و ارسال برای تأیید</span>
                </button>
                <button type="button" onClick={() => setEditingTx(null)} className="py-3 px-5 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 text-sm font-semibold">انصراف</button>
              </div>
            </div>
          </div>
        );
      })()}

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
