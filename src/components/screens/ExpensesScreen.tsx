import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Transaction } from '../../types';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { QuickAmountPad } from '../QuickAmountPad';
import { PersianVoiceTypingButton } from '../PersianVoiceTypingButton';
import { jalaliToIso, jalaliFromGregorian, todayJalali, formatRial, latinDigits } from '../../utils/jalali';
import { getSchoolMoeen } from '../../utils/parsian';
import {
  Receipt,
  PlusCircle,
  Settings2,
  Trash2,
  Edit2,
  X,
  Check,
  Image as ImageIcon,
  Landmark,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Download,
  Filter,
  Building2,
  BarChart3,
  Layers,
} from 'lucide-react';
import { ReceiptImageUploader } from '../ReceiptImageUploader';
import { AttachmentImg } from '../AttachmentImg';
import { openAttachment } from '../../services/attachments';

const amountInTomanWords = (rawAmount: string): string => {
  const amount = Number(latinDigits(rawAmount).replace(/[^0-9]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return '';
  const toman = Math.floor(amount / 10);
  if (toman <= 0) return 'کمتر از یک تومان';
  const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];
  const underThousand = (n: number): string => {
    const parts: string[] = [];
    if (n >= 100) parts.push(hundreds[Math.floor(n / 100)]);
    n %= 100;
    if (n >= 10 && n < 20) parts.push(teens[n - 10]);
    else {
      if (n >= 20) parts.push(tens[Math.floor(n / 10)]);
      if (n % 10) parts.push(ones[n % 10]);
    }
    return parts.join(' و ');
  };
  const parts: string[] = [];
  let n = toman;
  let group = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(underThousand(chunk) + (scales[group] ? ' ' + scales[group] : ''));
    n = Math.floor(n / 1000);
    group++;
  }
  return parts.join(' و ') + ' تومان';
};

export const ExpensesScreen: React.FC = () => {
  const {
    transactions,
    categories,
    schools,
    currentUser,
    accentColor,
    addExpense,
    updateExpense,
    deleteExpense,
    approveTransaction,
    rejectTransaction,
    addCategory,
    toggleCategory,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);

  // Status Filter
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Preview & Rejection Modals
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; title: string } | null>(null);
  const [rejectModalTx, setRejectModalTx] = useState<Transaction | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Form State
  const [formCategoryId, setFormCategoryId] = useState<string>(categories[0]?.id || '1');
  const [formAmount, setFormAmount] = useState('');
  const [formJalaliDate, setFormJalaliDate] = useState(todayJalali());
  const [formTracking, setFormTracking] = useState('');
  const [formSource, setFormSource] = useState<'petty_cash' | 'bank' | 'own'>('petty_cash');
  const [formComment, setFormComment] = useState('');
  const [formSchoolId, setFormSchoolId] = useState<number>(
    isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1
  );
  const [formAttachment, setFormAttachment] = useState<string>('');
  const [formError, setFormError] = useState('');

  // New Category State
  const [newCatName, setNewCatName] = useState('');

  // View Mode: 'vouchers' (فهرست اسناد) | 'school_breakdown' (محاسبه به تفکیک مدارس و کد تفصیلی)
  const [activeView, setActiveView] = useState<'vouchers' | 'school_breakdown'>('vouchers');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<number | 'all'>('all');

  const schoolExpenses = useMemo(() => {
    return transactions.filter((t) => {
      if (t.kind !== 'هزینه') return false;
      if (!isSenior && t.school_id !== currentUser?.school_id) return false;
      return true;
    });
  }, [transactions, isSenior, currentUser]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    schoolExpenses.forEach((t) => {
      const st = t.review_status || 'approved';
      if (st === 'pending') pending++;
      else if (st === 'approved') approved++;
      else if (st === 'rejected') rejected++;
    });
    return { pending, approved, rejected, total: schoolExpenses.length };
  }, [schoolExpenses]);

  // Separate expenses calculation per school (Standard Categories calculated independently for each school)
  const schoolBreakdowns = useMemo(() => {
    const targetSchools = isSenior
      ? schools
      : schools.filter((s) => s.id === currentUser?.school_id);

    return targetSchools.map((sc) => {
      const scTxs = schoolExpenses.filter((t) => t.school_id === sc.id);
      const activeTxs = scTxs.filter((t) => t.review_status !== 'rejected');
      const totalAmount = activeTxs.reduce((sum, t) => sum + (t.amount || t.debit || 0), 0);
      const approvedAmount = activeTxs
        .filter((t) => (t.review_status || 'approved') === 'approved')
        .reduce((sum, t) => sum + (t.amount || t.debit || 0), 0);
      const pendingAmount = activeTxs
        .filter((t) => t.review_status === 'pending')
        .reduce((sum, t) => sum + (t.amount || t.debit || 0), 0);

      // Separate breakdown of uniform categories for this specific school
      const categoryRows = categories
        .map((cat) => {
          const catTxs = activeTxs.filter(
            (t) => String(t.expense_category_id) === String(cat.id) || t.expense_category_name === cat.name
          );
          const catSum = catTxs.reduce((sum, t) => sum + (t.amount || t.debit || 0), 0);
          const percent = totalAmount > 0 ? Math.round((catSum / totalAmount) * 100) : 0;
          return {
            category: cat,
            amount: catSum,
            count: catTxs.length,
            percent,
          };
        })
        .filter((r) => r.amount > 0 || r.category.active);

      return {
        school: sc,
        tafsili_code: sc.tafsili_code || String(sc.id),
        moeen_code: getSchoolMoeen(sc.id),
        totalAmount,
        approvedAmount,
        pendingAmount,
        txCount: activeTxs.length,
        categoryRows,
      };
    });
  }, [schools, schoolExpenses, categories, isSenior, currentUser]);

  const totalAllSchoolsExpense = useMemo(() => {
    return schoolBreakdowns.reduce((sum, b) => sum + b.totalAmount, 0);
  }, [schoolBreakdowns]);

  const filteredExpenses = useMemo(() => {
    return schoolExpenses.filter((t) => {
      const st = t.review_status || 'approved';
      if (filterStatus !== 'all' && st !== filterStatus) return false;
      if (selectedSchoolFilter !== 'all' && t.school_id !== selectedSchoolFilter) return false;
      return true;
    });
  }, [schoolExpenses, filterStatus, selectedSchoolFilter]);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormCategoryId(categories[0]?.id || '1');
    setFormAmount('');
    setFormJalaliDate(todayJalali());
    setFormTracking('');
    setFormSource('petty_cash');
    setFormComment('');
    setFormAttachment('');
    setFormSchoolId(isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleQuickBankFee = () => {
    setEditingExpense(null);
    const bankFeeCat = categories.find((c) => c.name === 'کارمزد بانک');
    if (bankFeeCat) setFormCategoryId(bankFeeCat.id);
    setFormAmount('7,200');
    setFormJalaliDate(todayJalali());
    setFormTracking('FEE-' + Math.floor(100000 + Math.random() * 900000));
    setFormSource('petty_cash');
    setFormComment('کارمزد انتقال وجه بانکی (پایا)');
    setFormAttachment('bank_fee_auto_receipt');
    setFormSchoolId(isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingExpense(t);
    setFormCategoryId(String(t.expense_category_id || '1'));
    setFormAmount(Number(t.amount).toLocaleString('en-US'));
    setFormJalaliDate(jalaliFromGregorian(t.date));
    setFormTracking(t.tracking_code || '');
    setFormSource((t.payment_source as any) || 'petty_cash');
    setFormComment(t.description || t.comment || '');
    setFormAttachment(t.attachment_url || '');
    setFormSchoolId(t.school_id);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const amt = Number(latinDigits(formAmount).replace(/[,٬]/g, '').trim());
    if (isNaN(amt) || amt <= 0) {
      setFormError('مبلغ هزینه را به ریال وارد کنید.');
      return;
    }
    if (!formTracking.trim()) {
      setFormError('شماره پیگیری فاکتور یا واریز الزامی است.');
      return;
    }

    if (!formAttachment || !formAttachment.trim()) {
      setFormError('ارسال عکس فاکتور یا رسید هزینه الزامی است. لطفاً با دوربین یا گالری تصویر فاکتور را الصاق فرمایید.');
      return;
    }

    try {
      const isoDate = jalaliToIso(formJalaliDate);
      const targetSchoolObj = schools.find((s) => s.id === formSchoolId);
      const schoolTafsili = targetSchoolObj?.tafsili_code || String(formSchoolId);

      if (editingExpense) {
        const cat = categories.find((c) => c.id === formCategoryId);
        updateExpense(editingExpense.id, {
          amount: amt,
          debit: amt,
          date: isoDate,
          expense_category_id: formCategoryId,
          expense_category_name: cat?.name || 'هزینه',
          tracking_code: formTracking.trim(),
          payment_source: formSource,
          description: formComment.trim(),
          comment: formComment.trim(),
          school_id: formSchoolId,
          tafsili_code: schoolTafsili,
          attachment_url: formAttachment,
        });
      } else {
        addExpense({
          category_id: formCategoryId,
          amount: amt,
          date: isoDate,
          tracking_code: formTracking.trim(),
          payment_source: formSource,
          comment: formComment.trim(),
          school_id: formSchoolId,
          attachment_url: formAttachment,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(String(err));
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('آیا از حذف این هزینه اطمینان دارید؟')) {
      deleteExpense(id);
      setIsModalOpen(false);
    }
  };

  const handleApprove = async (id: number) => {
    setIsSubmittingReview(true);
    try {
      await approveTransaction(id);
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
      await rejectTransaction(rejectModalTx.id, rejectionReasonInput.trim() || 'عدم تأیید هزینه توسط مدیر ارشد');
      setRejectModalTx(null);
      setRejectionReasonInput('');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName('');
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16">
      <Header title="هزینه‌های مدرسه" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={openAddModal}
            className="flex-1 py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: accentColor }}
          >
            <PlusCircle className="w-5 h-5" />
            ثبت هزینه جدید
          </button>

          <button
            onClick={handleQuickBankFee}
            className="py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Landmark className="w-5 h-5" />
            <span>ثبت سریع کارمزد بانک</span>
          </button>

          {isSenior && (
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="py-3.5 px-5 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] text-[#341648] font-bold text-sm shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Settings2 className="w-5 h-5 text-gray-500" />
              سرفصل‌های هزینه‌
            </button>
          )}
        </div>

        {/* View Switcher: Vouchers List vs School Breakdown */}
        <div className="bg-white rounded-3xl p-1.5 border border-[#e5dde8] shadow-xs flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveView('vouchers')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeView === 'vouchers'
                ? 'bg-[#341648] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>فهرست اسناد هزینه ({filteredExpenses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('school_breakdown')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeView === 'school_breakdown'
                ? 'bg-[#62205f] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>محاسبه به تفکیک مدارس (کد تفصیلی)</span>
          </button>
        </div>

        {/* School Filter Selector (Available for Senior) */}
        {isSenior && (
          <div className="bg-white rounded-2xl p-3 border border-[#e5dde8] shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#341648] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-purple-700" />
              <span>فیلتر مدرسه / واحد آموزشی:</span>
            </span>
            <select
              value={selectedSchoolFilter}
              onChange={(e) => setSelectedSchoolFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-1.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735] focus:outline-hidden"
            >
              <option value="all">همه واحدهای آموزشی ({schools.length} مرکز)</option>
              {schools.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} (کد تفصیلی: {sc.tafsili_code || sc.id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* VIEW 1: SEPARATE SCHOOL EXPENSES BREAKDOWN */}
        {activeView === 'school_breakdown' && (
          <div className="space-y-4">
            {/* Top Aggregate Summary Banner */}
            <div className="bg-gradient-to-l from-purple-900 via-[#4a1550] to-[#2a0b33] text-white rounded-3xl p-4 sm:p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs text-purple-200 font-semibold block">مجموع هزینه‌های کل شعب و مدارس</span>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1">
                  {formatRial(totalAllSchoolsExpense)} ریال
                </div>
                <div className="text-xs text-purple-200 mt-1">
                  محاسبه جداگانه هر مدرسه با سرفصل‌های مشترک و کد تفصیلی حسابداری
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-xs font-bold text-amber-100 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  <span>تفکیک دقیق حسابداری پارسیان</span>
                </span>
              </div>
            </div>

            {/* Individual School Cards */}
            <div className="space-y-4">
              {schoolBreakdowns
                .filter((b) => selectedSchoolFilter === 'all' || b.school.id === selectedSchoolFilter)
                .map((b) => (
                  <div
                    key={b.school.id}
                    className="bg-white rounded-3xl p-5 border-2 border-[#e5dde8] hover:border-purple-300 transition-all shadow-xs space-y-4"
                  >
                    {/* School Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base text-[#341648]">{b.school.name}</h3>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 font-mono">
                            کد تفصیلی: {b.tafsili_code}
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-md">
                            کد معین: {b.moeen_code}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          نوع مرکز: {b.school.type || 'آموزشی'} | کد سیستم: <span className="font-mono font-bold">{b.school.code}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-xs text-gray-500">کل هزینه این مدرسه:</div>
                        <div className="text-lg font-black font-mono text-purple-950 mt-0.5">
                          {formatRial(b.totalAmount)} ریال
                        </div>
                      </div>
                    </div>

                    {/* Breakdown by standard uniform categories for this specific school */}
                    <div>
                      <div className="text-xs font-bold text-[#341648] mb-2 flex items-center justify-between">
                        <span>محاسبه هزینه‌ها به تفکیک سرفصل ({b.categoryRows.length} سرفصل هزینه):</span>
                        <span className="text-[11px] text-gray-400 font-normal">کل اسناد: {b.txCount} مورد</span>
                      </div>

                      {b.categoryRows.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-gray-50 text-center text-xs text-gray-400 border border-dashed border-gray-200">
                          هنوز سندی برای این مرکز ثبت نشده است.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-[#fcfaff] text-gray-600 border-b border-gray-100">
                              <tr>
                                <th className="p-2.5 font-bold">سرفصل هزینه</th>
                                <th className="p-2.5 font-bold">مبلغ (ریال)</th>
                                <th className="p-2.5 font-bold text-center">سهم از کل هزینه مدرسه</th>
                                <th className="p-2.5 font-bold text-center">تعداد اسناد</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {b.categoryRows.map((catRow) => (
                                <tr key={catRow.category.id} className="hover:bg-purple-50/30 transition-colors">
                                  <td className="p-2.5 font-bold text-[#341648] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                                    <span>{catRow.category.name}</span>
                                  </td>
                                  <td className="p-2.5 font-mono font-bold text-gray-800">
                                    {formatRial(catRow.amount)}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <div className="w-14 bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                          className="bg-purple-600 h-2 rounded-full"
                                          style={{ width: `${Math.min(100, catRow.percent)}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-[10px] text-gray-500">%{catRow.percent}</span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-gray-600">
                                    {catRow.count}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          تأییدشده: {formatRial(b.approvedAmount)}
                        </span>
                        {b.pendingAmount > 0 && (
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                            در انتظار تأیید: {formatRial(b.pendingAmount)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSchoolFilter(b.school.id);
                          setActiveView('vouchers');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#62205f] font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>مشاهده اسناد این مرکز</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* VIEW 2: VOUCHERS LIST */}
        {activeView === 'vouchers' && (
          <div className="space-y-4">
            {/* Approval Status Tabs */}
            <div className="bg-white rounded-3xl p-3.5 border border-[#e5dde8] shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                <span className="text-xs font-bold text-[#341648] flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-purple-700" />
                  وضعیت تأیید هزینه‌ها:
                </span>
                {isSenior && counts.pending > 0 && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                    {counts.pending} هزینه جدید در انتظار بررسی شما
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'all', label: 'همه هزینه‌ها', count: counts.total },
                  { id: 'pending', label: 'در انتظار تأیید', count: counts.pending },
                  { id: 'approved', label: 'تأیید شده (سبز)', count: counts.approved },
                  { id: 'rejected', label: 'رد شده (قرمز)', count: counts.rejected },
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
            </div>

            {/* Expenses List */}
            <div className="space-y-3">
              <div className="text-xs text-gray-500 font-semibold flex items-center justify-between">
                <span>فهرست هزینه‌های ثبت‌شده ({filteredExpenses.length} مورد):</span>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
                  هزینه‌ای با این وضعیت پیدا نشد.
                </div>
              ) : (
                filteredExpenses.map((t) => {
                  const status = t.review_status || 'approved';
                  const isApproved = status === 'approved';
                  const isRejected = status === 'rejected';
                  const isPending = status === 'pending';

                  const cardBorderClass = isApproved
                    ? 'border-emerald-300 bg-emerald-50/15'
                    : isRejected
                    ? 'border-rose-300 bg-rose-50/25'
                    : 'border-amber-300 bg-amber-50/20';

                  const schoolObj = schools.find((s) => s.id === t.school_id);
                  const tafsiliCode = t.tafsili_code || schoolObj?.tafsili_code || '—';

                  return (
                    <div
                      key={t.id}
                      className={`bg-white rounded-3xl p-5 border-2 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${cardBorderClass}`}
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-[#341648]">
                            {t.expense_category_name || t.description || 'هزینه جاری'}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              t.payment_source === 'own'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {t.payment_source === 'own' ? 'از حساب شخصی مدیر' : 'حساب بانکی مدرسه'}
                          </span>

                          {/* Approval Status Badge */}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              تأیید شده
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="w-3.5 h-3.5 text-rose-700" />
                              رد شده توسط ارشد
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              در انتظار تأیید مدیر ارشد
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                          <span>مدرسه: <b>{t.school_name || 'مدرسه'}</b></span>
                          <span className="font-mono text-purple-900 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            کد تفصیلی: {tafsiliCode}
                          </span>
                          <span>
                            شماره پیگیری: <span className="font-mono font-bold text-gray-700">{t.tracking_code || '—'}</span>
                          </span>
                        </div>

                        {t.description && (
                          <div className="text-xs text-gray-600 bg-white/70 p-2 rounded-xl border border-[#ede5ef]">
                            شرح: {t.description}
                          </div>
                        )}

                        {isRejected && t.rejection_reason && (
                          <div className="p-2 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-start gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">علت رد هزینه: </span>
                              <span>{t.rejection_reason}</span>
                            </div>
                          </div>
                        )}

                        {/* Receipt Attachment Thumbnail */}
                        {t.attachment_url && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAttachment({
                                  url: t.attachment_url!,
                                  title: `فاکتور هزینه: ${t.expense_category_name || t.description || ''}`,
                                })
                              }
                              className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#62205f] text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>مشاهده عکس فاکتور / رسید</span>
                              <Eye className="w-3 h-3 text-purple-700" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <div className="text-base sm:text-lg font-black font-mono text-purple-900">
                          {formatRial(t.amount)} ریال
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Senior Approval Actions */}
                          {isSenior && (
                            <div className="flex items-center gap-1">
                              {!isApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(t.id)}
                                  disabled={isSubmittingReview}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                                  title="تأیید هزینه توسط مدیر ارشد"
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
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                                  title="رد هزینه و ثبت علت"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>رد</span>
                                </button>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => openEditModal(t)}
                            className="p-2 text-[#62205f] hover:bg-purple-50 rounded-xl transition-colors"
                            title="ویرایش هزینه"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            title="حذف هزینه"
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
          </div>
        )}
      </main>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-4">
              <h3 className="text-base font-bold text-[#341648]">
                {editingExpense ? 'ویرایش هزینه' : 'ثبت هزینه جدید'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  نوع هزینه (سرفصل) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-semibold text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                >
                  {categories
                    .filter((c) => c.active || c.id === formCategoryId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  مبلغ هزینه (ریال) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={formAmount}
                  onChange={(e) => {
                    const latin = latinDigits(e.target.value);
                    const raw = latin.replace(/\D/g, '');
                    setFormAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۱۴,۵۰۰,۰۰۰"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                  dir="ltr"
                />
                <QuickAmountPad
                  value={formAmount}
                  onChange={setFormAmount}
                  accentColor={accentColor}
                />
                {formAmount && (
                  <div
                    className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
                    aria-live="polite"
                  >
                    معادل به حروف (تومان): {amountInTomanWords(formAmount)}
                  </div>
                )}
              </div>

              <JalaliDatePicker
                label="تاریخ انجام هزینه"
                value={formJalaliDate}
                onChange={setFormJalaliDate}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    منبع پرداخت هزینه <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value as any)}
                    className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-bold text-[#302735] focus:outline-hidden"
                  >
                    <option value="petty_cash">کارت تن‌خواه مدیر (تن‌خواه گردان)</option>
                    <option value="bank">از حساب بانکی مدرسه</option>
                    <option value="own">از حساب خودم (طلب من از مدرسه)</option>
                  </select>

                  {formSource === 'petty_cash' && (
                    <div className="mt-1.5 p-2 bg-purple-50 rounded-lg border border-purple-200 text-[11px] font-bold text-[#62205f] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      <span>
                        کارت تن‌خواه:{' '}
                        <span className="font-mono">
                          {currentUser?.petty_cash_card ||
                            schools.find((s) => s.id === formSchoolId)?.petty_cash_card ||
                            '۶۰۳۷-۹۹۷۵-۱۱۲۲-۳۳۴۴'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    شماره پیگیری فاکتور <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTracking}
                    onChange={(e) => setFormTracking(e.target.value)}
                    placeholder="مثال: BNK-44812"
                    className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">مدرسه و واحد آموزشی</label>
                {isSenior ? (
                  <select
                    value={formSchoolId}
                    onChange={(e) => setFormSchoolId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                  >
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name} (کد تفصیلی: {sc.tafsili_code || sc.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs font-bold text-gray-700 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200">
                    {schools.find((s) => s.id === formSchoolId)?.name || currentUser?.school_name}
                  </div>
                )}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#62205f] bg-purple-50/70 px-3 py-1.5 rounded-xl border border-purple-200 font-semibold">
                  <span>کد تفصیلی حسابداری در پارسیان:</span>
                  <span className="font-mono font-black text-purple-900 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                    {schools.find((s) => s.id === formSchoolId)?.tafsili_code || 'تعریف‌نشده'}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#341648]">
                    شرح و توضیحات هزینه
                  </label>
                  <PersianVoiceTypingButton
                    onTranscript={(text) => {
                      const val = formComment ? `${formComment} ${text}` : text;
                      setFormComment(val);
                      if (val.includes('کارمزد') || val.includes('پایا') || val.includes('ساتنا')) {
                        const feeCat = categories.find((c) => c.name === 'کارمزد بانک');
                        if (feeCat) setFormCategoryId(feeCat.id);
                      }
                    }}
                  />
                </div>
                <input
                  type="text"
                  value={formComment}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormComment(val);
                    if (val.includes('کارمزد') || val.includes('پایا') || val.includes('ساتنا')) {
                      const feeCat = categories.find((c) => c.name === 'کارمزد بانک');
                      if (feeCat) setFormCategoryId(feeCat.id);
                    }
                  }}
                  placeholder="مثال: خرید ماژیک وایت‌برد یا کارمزد انتقال بانکی"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  💡 با نوشتن کلمه «کارمزد» یا «پایا»، سرفصل «کارمزد بانک» به‌صورت خودکار انتخاب می‌شود.
                </span>
              </div>

              {/* Photo Upload Section */}
              <ReceiptImageUploader
                value={formAttachment}
                onChange={setFormAttachment}
                required={true}
                label="تصویر فاکتور / رسید خرید"
                helperText="ارسال عکس فاکتور الزامی است؛ حجم عکس‌ها به صورت خودکار بدون افت کیفیت فشرده می‌شود."
              />

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check className="w-4 h-4" />
                  {editingExpense ? 'ذخیره ویرایش' : 'ثبت قطعی هزینه'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal for Senior */}
      {rejectModalTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>رد هزینه شناسه {rejectModalTx.id}</span>
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
              علت رد این هزینه را وارد نمایید تا برای مدیر شعبه نمایش داده شود:
            </p>

            <textarea
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="مثال: فاکتور مخدوش است، پیوست ندارد یا خارج از سرفصل تن‌خواه می‌باشد..."
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
                تأیید رد هزینه (قرمز)
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
              <span className="text-gray-500">تصویر رسمی رسید و فاکتور هزینه</span>
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

      {/* Expense Categories Management Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5dde8] mb-4">
              <h3 className="text-base font-bold text-[#341648]">مدیریت سرفصل هزینه‌ها</h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="عنوان هزینه جدید..."
                className="flex-1 px-3 py-2 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-semibold text-[#302735]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1"
                style={{ backgroundColor: accentColor }}
              >
                <PlusCircle className="w-4 h-4" />
                افزودن
              </button>
            </form>

            <div className="overflow-y-auto flex-1 space-y-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#fcfaff] border border-[#e5dde8]"
                >
                  <span className="text-xs font-bold text-[#341648]">{c.name}</span>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.active}
                      onChange={(e) => toggleCategory(c.id, e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        c.active ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                          c.active ? 'right-4.5' : 'right-0.5'
                        }`}
                      />
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
