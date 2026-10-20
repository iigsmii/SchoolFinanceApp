import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Student, Transaction } from '../../types';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { jalaliToIso, jalaliFromGregorian, todayJalali, formatRial, latinDigits } from '../../utils/jalali';
import {
  Search,
  PlusCircle,
  CreditCard,
  Users,
  Trash2,
  X,
  Check,
  AlertCircle,
  FileCheck2,
  Banknote,
  Camera,
  Image,
} from 'lucide-react';
import { ReceiptImageUploader } from '../ReceiptImageUploader';
import { matchesStudentSearch } from '../../utils/studentSearch';

const PAYMENT_METHODS = ['پول نقد', 'کارت به کارت', 'کارت خوان', 'چک'];

export const TuitionScreen: React.FC = () => {
  const {
    students,
    schools,
    transactions,
    currentUser,
    accentColor,
    getStudentBalance,
    addTuitionDebt,
    addTuitionPayment,
    addBulkDebt,
    deleteTransaction,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  // Selected student state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modals state
  const [modalType, setModalType] = useState<'debt' | 'payment' | 'bulk_debt' | null>(null);

  // Single Debt / Payment Form state
  const [formAmount, setFormAmount] = useState('');
  const [formJalaliDate, setFormJalaliDate] = useState(todayJalali());
  const [formDesc, setFormDesc] = useState('');
  const [formMethod, setFormMethod] = useState('کارت خوان');
  const [formTracking, setFormTracking] = useState('');
  const [formAttachment, setFormAttachment] = useState<string>('');
  const [formError, setFormError] = useState('');

  // Sayad Cheque state for Payment modal
  const [sayadId, setSayadId] = useState('');
  const [chequeType, setChequeType] = useState<'sayad' | 'non_sayad' | 'gharzolhasane' | 'guarantee'>('sayad');
  const [chequeBankName, setChequeBankName] = useState('بانک ملی ایران');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState(todayJalali());
  const [inFavorSchool, setInFavorSchool] = useState(false);

  // Bulk Debt Form state
  const [bulkSchoolId, setBulkSchoolId] = useState<number>(
    isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1
  );
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkJalaliDate, setBulkJalaliDate] = useState(todayJalali());
  const [bulkDesc, setBulkDesc] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());
  const [bulkFilterQuery, setBulkFilterQuery] = useState('');

  // Handle student search results
  const availableStudents = students.filter((s) => {
    if (!s.active) return false;
    if (!isSenior && s.school_id !== currentUser?.school_id) return false;
    return matchesStudentSearch(s, searchQuery);
  });
  const visibleStudents = availableStudents.slice(0, 50);

  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setSearchQuery('');
  };

  const studentBalance = selectedStudent ? getStudentBalance(selectedStudent.id) : null;

  const studentTxs = selectedStudent
    ? transactions.filter((t) => t.student_id === selectedStudent.id && (t.kind === 'شهریه' || t.kind === 'شهریه_بدهی'))
    : [];

  const handleOpenDebt = () => {
    if (!selectedStudent) {
      alert('ابتدا یک دانش‌آموز را انتخاب کنید.');
      return;
    }
    setFormAmount('');
    setFormJalaliDate(todayJalali());
    setFormDesc('شهریه مصوب');
    setFormAttachment('');
    setFormError('');
    setModalType('debt');
  };

  const handleOpenPayment = () => {
    if (!selectedStudent) {
      alert('ابتدا یک دانش‌آموز را انتخاب کنید.');
      return;
    }
    setFormAmount('');
    setFormJalaliDate(todayJalali());
    setFormDesc('پرداخت قسط شهریه');
    setFormMethod('کارت خوان');
    setFormTracking('');
    setSayadId('');
    setChequeDueDate(todayJalali());
    setInFavorSchool(false);
    setFormAttachment('');
    setFormError('');
    setModalType('payment');
  };

  const handleOpenBulk = () => {
    const targetSid = isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1;
    setBulkSchoolId(targetSid);
    const targetStudents = students.filter((s) => s.school_id === targetSid && s.active);
    setBulkSelectedIds(new Set(targetStudents.map((s) => s.id)));
    setBulkAmount('');
    setBulkJalaliDate(todayJalali());
    setBulkDesc('ثبت شهریه مصوب سال تحصیلی');
    setBulkFilterQuery('');
    setFormError('');
    setModalType('bulk_debt');
  };

  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amt = Number(latinDigits(formAmount).replace(/[,٬]/g, '').trim());
    if (isNaN(amt) || amt <= 0) {
      setFormError('مبلغ بدهی را به درستی به ریال وارد کنید.');
      return;
    }
    if (!formDesc.trim()) {
      setFormError('عنوان یا شرح بدهی را وارد کنید.');
      return;
    }
    try {
      const isoDate = jalaliToIso(formJalaliDate);
      addTuitionDebt({
        student_id: selectedStudent!.id,
        amount: amt,
        date: isoDate,
        description: formDesc.trim(),
        school_id: selectedStudent!.school_id,
      });
      setModalType(null);
    } catch (err) {
      setFormError(String(err));
    }
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amt = Number(latinDigits(formAmount).replace(/[,٬]/g, '').trim());
    if (isNaN(amt) || amt <= 0) {
      setFormError('مبلغ پرداخت را به درستی به ریال وارد کنید.');
      return;
    }

    if (!formAttachment || !formAttachment.trim()) {
      setFormError('ارسال عکس رسید یا فاکتور پرداخت الزامی است. لطفاً با دوربین یا گالری تصویر رسید را الصاق کنید.');
      return;
    }

    if (formMethod === 'چک') {
      const cleanSayad = sayadId.replace(/\D/g, '').trim();
      if (chequeType === 'sayad') {
        if (!/^\d{16}$/.test(cleanSayad)) {
          setFormError('شناسه صیاد چک صیادی باید دقیقاً ۱۶ رقمی باشد.');
          return;
        }
        if (!inFavorSchool) {
          setFormError('برای ثبت چک صیادی، باید تیک «ثبت چک در وجه مدرسه القرآن» را فعال کنید.');
          return;
        }
      }
      try {
        const isoIssue = jalaliToIso(formJalaliDate);
        const isoDue = jalaliToIso(chequeDueDate);
        const typeTitle =
          chequeType === 'guarantee'
            ? 'چک ضمانتی'
            : chequeType === 'gharzolhasane'
            ? 'چک قرض‌الحسنه'
            : chequeType === 'non_sayad'
            ? 'چک غیر صیادی'
            : 'چک صیادی';

        addTuitionPayment({
          student_id: selectedStudent!.id,
          amount: amt,
          date: isoIssue,
          description: formDesc.trim() || `ثبت ${typeTitle} (${chequeBankName})`,
          payment_method: 'چک',
          school_id: selectedStudent!.school_id,
          cheque_data: {
            sayad_id: chequeType === 'sayad' ? cleanSayad : undefined,
            due_date: isoDue,
            in_favor_school: inFavorSchool,
            bank_name: chequeBankName,
            cheque_type: chequeType,
            cheque_number: chequeNumber.trim() || undefined,
            issuer_name: selectedStudent!.name,
          },
          attachment_url: formAttachment,
        });
        setModalType(null);
      } catch (err) {
        setFormError(String(err));
      }
      return;
    }

    if (formMethod !== 'پول نقد' && !formTracking.trim()) {
      setFormError('شماره پیگیری واریز الزامی است.');
      return;
    }

    try {
      const isoDate = jalaliToIso(formJalaliDate);
      addTuitionPayment({
        student_id: selectedStudent!.id,
        amount: amt,
        date: isoDate,
        description: formDesc.trim(),
        payment_method: formMethod,
        tracking_code: formTracking.trim(),
        school_id: selectedStudent!.school_id,
        attachment_url: formAttachment,
      });
      setModalType(null);
    } catch (err) {
      setFormError(String(err));
    }
  };

  const handleSaveBulk = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amt = Number(latinDigits(bulkAmount).replace(/[,٬]/g, '').trim());
    if (isNaN(amt) || amt <= 0) {
      setFormError('مبلغ بدهی را به ریال وارد کنید.');
      return;
    }
    if (!bulkDesc.trim()) {
      setFormError('عنوان بدهی الزامی است.');
      return;
    }
    if (bulkSelectedIds.size === 0) {
      setFormError('حداقل یک دانش‌آموز را انتخاب کنید.');
      return;
    }

    try {
      const isoDate = jalaliToIso(bulkJalaliDate);
      const count = addBulkDebt({
        student_ids: Array.from(bulkSelectedIds),
        amount: amt,
        date: isoDate,
        description: bulkDesc.trim(),
        school_id: bulkSchoolId,
      });
      alert(`بدهی برای ${count} دانش‌آموز با موفقیت ثبت شد.`);
      setModalType(null);
    } catch (err) {
      setFormError(String(err));
    }
  };

  const handleMockAttachment = () => {
    // Generate simple data URL receipt preview
    const sample = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60';
    setFormAttachment(sample);
  };

  // Bulk dialog school filtered students
  const bulkSchoolStudents = students.filter((s) => s.school_id === bulkSchoolId && s.active);
  const displayedBulkStudents = bulkSchoolStudents.filter((st) =>
    matchesStudentSearch(st, bulkFilterQuery)
  );
  const visibleBulkStudents = displayedBulkStudents.slice(0, 100);

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="دریافت و ثبت شهریه" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search Student Section */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs">
          <label className="block text-xs font-bold text-[#341648] mb-2">
            جست‌وجوی دانش‌آموز جهت ثبت یا مشاهده سوابق شهریه:
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="نام، پایه یا کد ملی دانش‌آموز را وارد کنید..."
              className="w-full pl-4 pr-11 py-3 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
            />
            <Search className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
          </div>

          {searchQuery.trim() && (
            <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-[#e5dde8] divide-y divide-gray-100 bg-white">
              {availableStudents.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500">دانش‌آموزی پیدا نشد</div>
              ) : (
                visibleStudents.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStudent(st)}
                    className="w-full text-right p-3 hover:bg-[#fcf8fd] flex items-center justify-between transition-colors text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#341648]">{st.name}</span>
                      <span className="text-gray-400 mr-2">| پایه {st.grade}</span>
                      <span className="text-gray-400 mr-2">| {st.school_name}</span>
                    </div>
                    <span className="font-mono text-gray-500">{st.national_id}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Student Banner & Balance Card */}
        {selectedStudent ? (
          <div className="bg-white rounded-3xl p-6 border-2 border-[#62205f]/20 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#e5dde8] gap-3">
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">دانش‌آموز انتخاب‌شده:</div>
                <h2 className="text-xl font-black text-[#341648] flex items-center gap-2">
                  <span>{selectedStudent.name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[#f2eaf3] text-[#62205f] font-bold">
                    پایه {selectedStudent.grade}
                  </span>
                </h2>
                <div className="text-xs text-gray-500 mt-1 font-mono">
                  کد ملی: {selectedStudent.national_id} | {selectedStudent.school_name}
                </div>
              </div>

              {/* Balance Badge */}
              <div
                className={`p-4 rounded-2xl border text-center min-w-[200px] ${
                  studentBalance && studentBalance.balance > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : studentBalance && studentBalance.balance < 0
                    ? 'bg-teal-50 border-teal-200 text-teal-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="text-xs font-semibold opacity-80">
                  {studentBalance && studentBalance.balance > 0
                    ? 'مانده بدهی شهریه:'
                    : studentBalance && studentBalance.balance < 0
                    ? 'مانده بستانکاری:'
                    : 'وضعیت حساب:'}
                </div>
                <div className="text-lg font-black font-mono mt-0.5">
                  {studentBalance && studentBalance.balance > 0
                    ? `${formatRial(studentBalance.balance)} ریال`
                    : studentBalance && studentBalance.balance < 0
                    ? `${formatRial(Math.abs(studentBalance.balance))} ریال`
                    : 'تسویه کامل'}
                </div>
              </div>
            </div>

            {/* Action Buttons for this student */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5">
              <button
                onClick={handleOpenDebt}
                className="py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700"
              >
                <PlusCircle className="w-5 h-5" />
                ثبت بدهی شهریه برای این دانش‌آموز
              </button>

              <button
                onClick={handleOpenPayment}
                className="py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor }}
              >
                <CreditCard className="w-5 h-5" />
                ثبت پرداخت شهریه / فیش واریز
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 text-center text-gray-500 border border-[#e5dde8]">
            <p className="text-sm font-semibold">دانش‌آموزی انتخاب نشده است.</p>
            <p className="text-xs text-gray-400 mt-1">از کادر جست‌وجوی بالا برای انتخاب دانش‌آموز استفاده کنید.</p>
          </div>
        )}

        {/* Bulk Debt Button Always Accessible */}
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] flex items-center justify-between shadow-xs">
          <div>
            <div className="text-sm font-bold text-[#341648]">ثبت گروهی بدهی شهریه</div>
            <div className="text-xs text-gray-500">برای کل مدرسه یا یک پایه تحصیلی به صورت یکجا</div>
          </div>
          <button
            onClick={handleOpenBulk}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5dde8] hover:border-[#62205f] font-bold text-xs text-[#341648] hover:bg-gray-50 transition-all shadow-xs"
          >
            <Users className="w-4 h-4 text-[#62205f]" />
            ثبت گروهی
          </button>
        </div>

        {/* Selected Student History Ledger */}
        {selectedStudent && (
          <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs">
            <h3 className="text-sm font-bold text-[#341648] mb-4">سوابق شهریه دانش‌آموز ({studentTxs.length} تراکنش)</h3>

            {studentTxs.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">هنوز تراکنشی برای این دانش‌آموز ثبت نشده است.</div>
            ) : (
              <div className="space-y-3">
                {studentTxs.map((tx) => {
                  const isDebt = tx.kind === 'شهریه_بدهی';
                  return (
                    <div
                      key={tx.id}
                      className="p-4 rounded-2xl border border-[#ede5ef] bg-[#fcfaff] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              isDebt ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isDebt ? 'بدهی شهریه' : 'پرداخت شهریه'}
                          </span>
                          <span className="font-bold text-sm font-mono text-[#341648]">
                            {formatRial(tx.amount)} ریال
                          </span>
                        </div>
                        <div className="text-gray-500 mt-1">
                          تاریخ: {jalaliFromGregorian(tx.date)} | {tx.description || tx.comment || 'بدون شرح'}
                        </div>
                        {tx.payment_method && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            روش پرداخت: {tx.payment_method} {tx.tracking_code ? `| کد پیگیری: ${tx.tracking_code}` : ''}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (window.confirm('آیا از حذف این تراکنش اطمینان دارید؟')) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                        title="حذف تراکنش"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Debt Modal */}
      {modalType === 'debt' && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e5dde8]">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-4">
              <h3 className="text-base font-bold text-[#341648]">ثبت بدهی شهریه: {selectedStudent.name}</h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSaveDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  مبلغ بدهی (به ریال) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFormAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۱۸۰,۰۰۰,۰۰۰"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] font-mono text-left focus:outline-hidden focus:border-[#62205f]"
                  dir="ltr"
                />
              </div>

              <JalaliDatePicker
                label="تاریخ ثبت بدهی"
                value={formJalaliDate}
                onChange={setFormJalaliDate}
                required
              />

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  عنوان یا شرح بدهی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="مثال: شهریه مصوب، هزینه سرویس، کتب درسی"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  ثبت قطعی بدهی
                </button>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {modalType === 'payment' && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-4">
              <h3 className="text-base font-bold text-[#341648]">ثبت پرداخت شهریه: {selectedStudent.name}</h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  روش پرداخت <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormMethod(m)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        formMethod === m
                          ? 'bg-[#62205f] text-white border-[#62205f]'
                          : 'bg-[#fcfaff] text-gray-700 border-[#e5dde8] hover:bg-gray-50'
                      }`}
                      style={formMethod === m ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  مبلغ پرداختی (به ریال) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFormAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۵۰,۰۰۰,۰۰۰"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] font-mono text-left focus:outline-hidden focus:border-[#62205f]"
                  dir="ltr"
                />
              </div>

              <JalaliDatePicker
                label="تاریخ پرداخت"
                value={formJalaliDate}
                onChange={setFormJalaliDate}
                required
              />

              {/* Cheque specific fields */}
              {formMethod === 'چک' ? (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-amber-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-amber-600" />
                      <span>مشخصات چک دریافتی</span>
                    </div>
                    <span className="text-[11px] text-amber-800">
                      پشتیبانی از صیادی، غیر صیادی، قرض‌الحسنه و ضمانتی
                    </span>
                  </div>

                  {/* Cheque Type Selection */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'sayad', label: 'چک صیادی' },
                      { id: 'non_sayad', label: 'غیر صیادی' },
                      { id: 'gharzolhasane', label: 'قرض‌الحسنه' },
                      { id: 'guarantee', label: 'چک ضمانت' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setChequeType(t.id as any)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all text-center border ${
                          chequeType === t.id
                            ? 'bg-[#341648] text-white border-[#341648] shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Bank Issuer */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      بانک صادرکننده چک <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={chequeBankName}
                      onChange={(e) => setChequeBankName(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold text-[#341648]"
                    >
                      <option value="بانک ملی ایران">بانک ملی ایران</option>
                      <option value="بانک صادرات ایران">بانک صادرات ایران</option>
                      <option value="بانک ملت">بانک ملت</option>
                      <option value="بانک تجارت">بانک تجارت</option>
                      <option value="بانک سپه">بانک سپه</option>
                      <option value="قرض‌الحسنه رسالت">قرض‌الحسنه رسالت</option>
                      <option value="قرض‌الحسنه مهر ایران">قرض‌الحسنه مهر ایران</option>
                      <option value="بانک مسکن">بانک مسکن</option>
                      <option value="بانک کشاورزی">بانک کشاورزی</option>
                      <option value="بانک رفاه کارگران">بانک رفاه کارگران</option>
                      <option value="بانک پاسارگاد">بانک پاسارگاد</option>
                      <option value="بانک پارسیان">بانک پارسیان</option>
                      <option value="بانک سامان">بانک سامان</option>
                      <option value="بانک شهر">بانک شهر</option>
                      <option value="بانک سینا">بانک سینا</option>
                      <option value="بانک آینده">بانک آینده</option>
                      <option value="سایر بانک‌ها و صندوق‌ها">سایر بانک‌ها و صندوق‌ها</option>
                    </select>
                  </div>

                  {chequeType === 'sayad' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        شناسه ۱۶ رقمی صیاد <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={sayadId}
                        onChange={(e) => setSayadId(e.target.value.replace(/\D/g, ''))}
                        placeholder="دقیقاً ۱۶ رقم صیادی"
                        className="w-full px-4 py-2 bg-white rounded-xl border border-amber-200 text-sm font-mono text-left focus:outline-hidden"
                        dir="ltr"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        شماره سریال برگه چک / شماره حساب قرض‌الحسنه
                      </label>
                      <input
                        type="text"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="مثال: ۸۹۰/۴۴۲ یا شماره چک عادی"
                        className="w-full px-4 py-2 bg-white rounded-xl border border-amber-200 text-sm font-mono text-left focus:outline-hidden"
                        dir="ltr"
                      />
                      <span className="text-[11px] text-gray-500 mt-1 block">
                        چک‌های غیر صیادی و قرض‌الحسنه نیاز به ثبت شماره ۱۶ رقمی صیادی ندارند.
                      </span>
                    </div>
                  )}

                  <JalaliDatePicker
                    label="تاریخ سررسید چک"
                    value={chequeDueDate}
                    onChange={setChequeDueDate}
                    required
                  />

                  {chequeType === 'sayad' && (
                    <label className="flex items-start gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={inFavorSchool}
                        onChange={(e) => setInFavorSchool(e.target.checked)}
                        className="mt-1 rounded text-[#62205f] focus:ring-[#62205f]"
                      />
                      <span className="text-xs font-bold text-gray-800">
                        ثبت چک در وجه مدرسه القرآن الکریم در سامانه صیاد انجام شده است. <span className="text-rose-500">*</span>
                      </span>
                    </label>
                  )}
                </div>
              ) : (
                formMethod !== 'پول نقد' && (
                  <div>
                    <label className="block text-xs font-bold text-[#341648] mb-1.5">
                      شماره پیگیری واریز <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTracking}
                      onChange={(e) => setFormTracking(e.target.value)}
                      placeholder="مثال: 98452104"
                      className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] font-mono text-left focus:outline-hidden focus:border-[#62205f]"
                      dir="ltr"
                    />
                  </div>
                )
              )}

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">توضیحات</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="مثال: قسط اول، واریز فیش دستی..."
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                />
              </div>

              {/* Receipt Attachment section */}
              <ReceiptImageUploader
                value={formAttachment}
                onChange={setFormAttachment}
                required={true}
                label={formMethod === 'چک' ? 'تصویر برگه چک صیادی' : 'تصویر رسید پرداخت / فیش بانکی'}
                helperText="ارسال عکس رسید الزامی است؛ عکس‌ها به صورت فشرده با کیفیت بالا و حجم بسیار کم ذخیره می‌شوند."
              />

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check className="w-4 h-4" />
                  {formMethod === 'چک' ? 'ثبت چک جهت تأیید مدیر ارشد' : 'ثبت قطعی پرداخت'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Debt Modal */}
      {modalType === 'bulk_debt' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-4">
              <h3 className="text-base font-bold text-[#341648]">
                ثبت گروهی بدهی شهریه ({bulkSelectedIds.size} نفر انتخاب شده)
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSaveBulk} className="flex-1 flex flex-col overflow-hidden space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    مبلغ برای هر دانش‌آموز (ریال) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bulkAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setBulkAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                    }}
                    placeholder="مثال: ۱۸۰,۰۰۰,۰۰۰"
                    className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>

                <JalaliDatePicker
                  label="تاریخ ثبت بدهی"
                  value={bulkJalaliDate}
                  onChange={setBulkJalaliDate}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  عنوان بدهی (مثلاً شهریه سالانه یا اردوی علمی) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={bulkDesc}
                  onChange={(e) => setBulkDesc(e.target.value)}
                  placeholder="عنوان بدهی..."
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden"
                />
              </div>

              {isSenior && (
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">مدرسه مربوطه</label>
                  <select
                    value={bulkSchoolId}
                    onChange={(e) => {
                      const sid = Number(e.target.value);
                      setBulkSchoolId(sid);
                      const targetSt = students.filter((s) => s.school_id === sid && s.active);
                      setBulkSelectedIds(new Set(targetSt.map((s) => s.id)));
                    }}
                    className="w-full px-4 py-2 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                  >
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Student Multi-Select List */}
              <div className="flex-1 flex flex-col min-h-[180px] border border-[#e5dde8] rounded-2xl p-3 bg-[#fcfaff] overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-[#e5dde8] mb-2 text-xs">
                  <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={bulkSelectedIds.size === bulkSchoolStudents.length && bulkSchoolStudents.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkSelectedIds(new Set(bulkSchoolStudents.map((s) => s.id)));
                        } else {
                          setBulkSelectedIds(new Set());
                        }
                      }}
                      className="rounded text-[#62205f]"
                    />
                    <span>انتخاب همه ({bulkSchoolStudents.length} دانش‌آموز)</span>
                  </label>
                  <span className="font-semibold text-gray-500">انتخاب: {bulkSelectedIds.size} نفر</span>
                </div>

                <div className="mb-2">
                  <input
                    type="text"
                    value={bulkFilterQuery}
                    onChange={(e) => setBulkFilterQuery(e.target.value)}
                    placeholder="فیلتر دانش‌آموزان در این لیست..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#e5dde8] bg-white"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5">
                  {visibleBulkStudents.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#e5dde8] text-xs cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={bulkSelectedIds.has(st.id)}
                          onChange={(e) => {
                            const next = new Set(bulkSelectedIds);
                            if (e.target.checked) next.add(st.id);
                            else next.delete(st.id);
                            setBulkSelectedIds(next);
                          }}
                          className="rounded text-[#62205f]"
                        />
                        <span className="font-bold text-[#341648]">{st.name}</span>
                        <span className="text-gray-400">| پایه {st.grade}</span>
                      </div>
                      <span className="font-mono text-gray-400">{st.national_id}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  ثبت بدهی برای {bulkSelectedIds.size} دانش‌آموز
                </button>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
