import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Transaction } from '../../types';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { jalaliToIso, jalaliFromGregorian, todayJalali, formatRial, latinDigits } from '../../utils/jalali';
import {
  Receipt,
  PlusCircle,
  Settings2,
  Trash2,
  Edit2,
  X,
  Check,
  Camera,
  Image as ImageIcon,
  Building,
  User,
} from 'lucide-react';
import { ReceiptImageUploader } from '../ReceiptImageUploader';

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
    addCategory,
    toggleCategory,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);

  // Form State
  const [formCategoryId, setFormCategoryId] = useState<string>(categories[0]?.id || '1');
  const [formAmount, setFormAmount] = useState('');
  const [formJalaliDate, setFormJalaliDate] = useState(todayJalali());
  const [formTracking, setFormTracking] = useState('');
  const [formSource, setFormSource] = useState<'bank' | 'own'>('own');
  const [formComment, setFormComment] = useState('');
  const [formSchoolId, setFormSchoolId] = useState<number>(
    isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1
  );
  const [formAttachment, setFormAttachment] = useState<string>('');
  const [formError, setFormError] = useState('');

  // New Category State
  const [newCatName, setNewCatName] = useState('');

  const schoolExpenses = transactions.filter((t) => {
    if (t.kind !== 'هزینه') return false;
    if (!isSenior && t.school_id !== currentUser?.school_id) return false;
    return true;
  });

  const openAddModal = () => {
    setEditingExpense(null);
    setFormCategoryId(categories[0]?.id || '1');
    setFormAmount('');
    setFormJalaliDate(todayJalali());
    setFormTracking('');
    setFormSource('own');
    setFormComment('');
    setFormAttachment('');
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
    setFormSource((t.payment_source as 'bank' | 'own') || 'own');
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

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName('');
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="هزینه‌های مدرسه" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={openAddModal}
            className="flex-1 py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: accentColor }}
          >
            <PlusCircle className="w-5 h-5" />
            ثبت هزینه جدید
          </button>

          {isSenior && (
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="py-3.5 px-5 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] text-[#341648] font-bold text-sm shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Settings2 className="w-5 h-5 text-gray-500" />
              مدیریت لیست هزینه‌ها
            </button>
          )}
        </div>

        {/* Expenses List */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold">
            فهرست هزینه‌های ثبت‌شده ({schoolExpenses.length} مورد):
          </div>

          {schoolExpenses.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              هنوز هزینه‌ای در سامانه ثبت نشده است.
            </div>
          ) : (
            schoolExpenses.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#62205f]/40 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
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
                  </div>

                  <div className="text-xs text-gray-500 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                    <span>مدرسه: {t.school_name || 'مدرسه'}</span>
                    <span>شماره پیگیری: <span className="font-mono">{t.tracking_code || '—'}</span></span>
                  </div>

                  {t.description && (
                    <div className="text-xs text-gray-600 mt-1.5 bg-[#fcfaff] p-2 rounded-xl border border-[#ede5ef]">
                      شرح: {t.description}
                    </div>
                  )}

                  {t.attachment_url && (
                    <div className="text-[11px] text-[#62205f] font-semibold mt-1 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>دارای پیوست رسید/فاکتور</span>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-3">
                  <div className="text-base sm:text-lg font-black font-mono text-purple-900">
                    {formatRial(t.amount)} ریال
                  </div>
                  <div className="flex items-center gap-2">
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
            ))
          )}
        </div>
      </main>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-4">
              <h3 className="text-base font-bold text-[#341648]">
                {editingExpense ? 'ویرایش هزینه' : 'ثبت هزینه جدید'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {formError}
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
                  type="text"
                  value={formAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFormAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۱۴,۵۰۰,۰۰۰"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                  dir="ltr"
                />
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
                    پرداخت از منبع <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value as 'bank' | 'own')}
                    className="w-full px-3 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                  >
                    <option value="bank">حساب بانکی مدرسه</option>
                    <option value="own">از حساب خودم (طلب من از مدرسه)</option>
                  </select>
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

              {isSenior && (
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">مدرسه مربوطه</label>
                  <select
                    value={formSchoolId}
                    onChange={(e) => setFormSchoolId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                  >
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">شرح و توضیحات هزینه</label>
                <input
                  type="text"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="مثال: خرید ماژیک وایت‌برد و اقلام مصرفی"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden"
                />
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
                className="flex-1 px-3 py-2 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-white text-xs font-bold"
                style={{ backgroundColor: accentColor }}
              >
                افزودن
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-[#e5dde8] bg-[#fcfaff] flex items-center justify-between text-xs"
                >
                  <span className={c.active ? 'font-bold text-gray-800' : 'line-through text-gray-400'}>
                    {c.name}
                  </span>
                  <button
                    onClick={() => toggleCategory(c.id, !c.active)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {c.active ? 'فعال' : 'غیرفعال'}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#e5dde8] mt-3">
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
