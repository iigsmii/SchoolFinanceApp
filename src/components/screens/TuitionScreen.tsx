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
  Sparkles,
  Tag,
  Layers,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { ReceiptImageUploader } from '../ReceiptImageUploader';
import { InvoicePrintModal } from '../InvoicePrintModal';
import { matchesStudentSearch } from '../../utils/studentSearch';

const PAYMENT_METHODS = ['پول نقد', 'کارت به کارت', 'کارت خوان', 'چک'];

const amountInTomanWords = (rawAmount: string): string => {
  const amount = Number(latinDigits(rawAmount).replace(/[^0-9]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return '';
  const toman = Math.floor(amount / 10);
  if (toman <= 0) return 'کمتر از یک تومان';
  const ones = ['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه'];
  const teens = ['ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده'];
  const tens = ['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود'];
  const hundreds = ['','یکصد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد'];
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
  while (n > 0 && group < scales.length) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(underThousand(chunk) + (scales[group] ? ' ' + scales[group] : ''));
    n = Math.floor(n / 1000);
    group++;
  }
  return parts.join(' و ') + ' تومان';
};

export const TuitionScreen: React.FC = () => {
  const {
    students,
    schools,
    transactions,
    currentUser,
    accentColor,
    getStudentBalance,
    addTuitionDebt,
    addTuitionDiscount,
    addTuitionPayment,
    addBulkDebt,
    deleteTransaction,
    approveTransaction,
    rejectTransaction,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [invoiceStudent, setInvoiceStudent] = useState<Student | null>(null);

  // Selected student state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modals state
  const [modalType, setModalType] = useState<'debt' | 'payment' | 'bulk_debt' | 'discount' | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{ url: string; title: string } | null>(null);
  const [rejectModalTx, setRejectModalTx] = useState<Transaction | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Debt Item Type & Installment state
  const [debtItemType, setDebtItemType] = useState<Transaction['debt_item_type']>('tuition');
  const [enableInstallments, setEnableInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<number>(3);

  // Discount state
  const [discountReason, setDiscountReason] = useState('فرزند فرهنگی و همکار');

  // Single Debt / Payment Form state
  const [formAmount, setFormAmount] = useState('');
  const [formJalaliDate, setFormJalaliDate] = useState(todayJalali());
  const [formDesc, setFormDesc] = useState('');
  const [formMethod, setFormMethod] = useState('کارت خوان');
  const [formTracking, setFormTracking] = useState('');
  const [formPosTerminal, setFormPosTerminal] = useState('');
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
    if (s.active === false) return false;
    if (!isSenior && Number(s.school_id) !== Number(currentUser?.school_id)) return false;
    return matchesStudentSearch(s, searchQuery);
  });
  const visibleStudents = availableStudents.slice(0, 50);

  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setSearchQuery('');
  };

  const studentBalance = selectedStudent ? getStudentBalance(selectedStudent.id) : null;

  const studentTxs = selectedStudent
    ? transactions.filter((t) => t.student_id === selectedStudent.id && (t.kind === 'شهریه' || t.kind === 'شهریه_بدهی' || t.kind === 'تخفیف_شهریه'))
    : [];

  const handleOpenDebt = () => {
    if (!selectedStudent) {
      alert('ابتدا یک دانش‌آموز را انتخاب کنید.');
      return;
    }
    setFormAmount('');
    setFormJalaliDate(todayJalali());
    setDebtItemType('tuition');
    setFormDesc('شهریه مصوب آموزشی');
    setEnableInstallments(false);
    setInstallmentCount(3);
    setFormAttachment('');
    setFormError('');
    setModalType('debt');
  };

  const handleOpenDiscount = () => {
    if (!selectedStudent) {
      alert('ابتدا یک دانش‌آموز را انتخاب کنید.');
      return;
    }
    setFormAmount('');
    setFormJalaliDate(todayJalali());
    setDiscountReason('فرزند فرهنگی و همکار');
    setFormDesc('تخفیف مصوب فرزند همکار');
    setFormError('');
    setModalType('discount');
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
    setFormPosTerminal('');
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
    const targetStudents = students.filter((s) => Number(s.school_id) === Number(targetSid) && s.active !== false);
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
      const baseIsoDate = jalaliToIso(formJalaliDate);
      const baseDateObj = new Date(baseIsoDate);

      if (enableInstallments && installmentCount > 1) {
        // Multi-installment distribution
        const perInstallment = Math.floor(amt / installmentCount);
        const remainder = amt - (perInstallment * installmentCount);

        for (let i = 0; i < installmentCount; i++) {
          const installmentDate = new Date(baseDateObj);
          installmentDate.setDate(installmentDate.getDate() + (i * 30));
          const instIso = installmentDate.toISOString().slice(0, 10);
          const instAmount = i === installmentCount - 1 ? perInstallment + remainder : perInstallment;

          addTuitionDebt({
            student_id: selectedStudent!.id,
            amount: instAmount,
            date: instIso,
            description: `قسط ${i + 1} از ${installmentCount}: ${formDesc.trim()}`,
            school_id: selectedStudent!.school_id,
            debt_item_type: debtItemType,
            installment_index: i + 1,
            total_installments: installmentCount,
          });
        }
      } else {
        addTuitionDebt({
          student_id: selectedStudent!.id,
          amount: amt,
          date: baseIsoDate,
          description: formDesc.trim(),
          school_id: selectedStudent!.school_id,
          debt_item_type: debtItemType,
        });
      }

      setModalType(null);
    } catch (err) {
      setFormError(String(err));
    }
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amt = Number(latinDigits(formAmount).replace(/[,٬]/g, '').trim());
    if (isNaN(amt) || amt <= 0) {
      setFormError('مبلغ تخفیف را به ریال وارد کنید.');
      return;
    }
    try {
      const isoDate = jalaliToIso(formJalaliDate);
      addTuitionDiscount({
        student_id: selectedStudent!.id,
        amount: amt,
        date: isoDate,
        description: formDesc.trim() || `تخفیف شهریه (${discountReason})`,
        discount_reason: discountReason,
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
        setInvoiceStudent(selectedStudent!);
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
        pos_terminal_number: formPosTerminal.trim() || undefined,
        school_id: selectedStudent!.school_id,
        attachment_url: formAttachment,
      });
      setModalType(null);
      setInvoiceStudent(selectedStudent!);
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
  const bulkSchoolStudents = students.filter((s) => Number(s.school_id) === Number(bulkSchoolId) && s.active !== false);
  const displayedBulkStudents = bulkSchoolStudents.filter((st) =>
    matchesStudentSearch(st, bulkFilterQuery)
  );

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5">
              <button
                onClick={handleOpenDebt}
                className="py-3 px-3 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>ثبت بدهی جدید</span>
              </button>

              <button
                onClick={handleOpenPayment}
                className="py-3 px-3 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                style={{ backgroundColor: accentColor }}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>ثبت پرداخت / فیش</span>
              </button>

              <button
                onClick={handleOpenDiscount}
                className="py-3 px-3 rounded-xl text-[#341648] bg-amber-100 hover:bg-amber-200 border border-amber-300 font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>ثبت تخفیف و بورسیه</span>
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
                  const isDiscount = tx.kind === 'تخفیف_شهریه' || tx.payment_method?.includes('تخفیف');
                  const status = tx.review_status || 'approved';
                  const isApproved = status === 'approved';
                  const isRejected = status === 'rejected';
                  const isPending = status === 'pending';

                  const cardClass = isApproved
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : isRejected
                    ? 'border-rose-200 bg-rose-50/25'
                    : 'border-amber-200 bg-amber-50/20';

                  return (
                    <div
                      key={tx.id}
                      className={`p-4 rounded-2xl border ${cardClass} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              isDebt
                                ? 'bg-rose-100 text-rose-700'
                                : isDiscount
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isDebt ? 'بدهی ثبت‌شده' : isDiscount ? 'تخفیف و بورسیه' : 'پرداخت شهریه'}
                          </span>
                          <span className="font-bold text-sm font-mono text-[#341648]">
                            {formatRial(tx.amount)} ریال
                          </span>

                          {/* Approval Status Badge */}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              تأیید شده
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="w-3 h-3 text-rose-700" />
                              رد شده
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700" />
                              در انتظار بررسی ارشد
                            </span>
                          )}
                        </div>

                        <div className="text-gray-500">
                          تاریخ: {jalaliFromGregorian(tx.date)} | {tx.description || tx.comment || 'بدون شرح'}
                        </div>
                        {tx.payment_method && (
                          <div className="text-[11px] text-gray-400">
                            روش پرداخت: {tx.payment_method}{' '}
                            {tx.tracking_code ? `| کد پیگیری: ${tx.tracking_code}` : ''}
                          </div>
                        )}

                        {isRejected && tx.rejection_reason && (
                          <div className="text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                            علت رد: {tx.rejection_reason}
                          </div>
                        )}

                        {tx.attachment_url && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAttachment({
                                  url: tx.attachment_url!,
                                  title: `رسید پرداخت شهریه ${selectedStudent.name}`,
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold flex items-center gap-1 border border-indigo-200"
                            >
                              <Eye className="w-3 h-3" />
                              <span>مشاهده عکس رسید بانکی</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        {/* Senior Quick Review Actions */}
                        {isSenior && !isDebt && (
                          <div className="flex items-center gap-1">
                            {!isApproved && (
                              <button
                                type="button"
                                onClick={() => approveTransaction(tx.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                                title="تأیید تراکنش شهریه"
                              >
                                <Check className="w-3 h-3" />
                                <span>تأیید</span>
                              </button>
                            )}
                            {!isRejected && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalTx(tx);
                                  setRejectionReasonInput(tx.rejection_reason || '');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                                title="رد تراکنش شهریه"
                              >
                                <X className="w-3 h-3" />
                                <span>رد</span>
                              </button>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm('آیا از حذف این تراکنش اطمینان دارید؟')) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                          title="حذف تراکنش"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-4">
              <h3 className="text-base font-bold text-[#341648]">ثبت بدهی جدید: {selectedStudent.name}</h3>
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
              {/* Itemized Category Pills */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  سرفصل و آیتم بدهی:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'tuition', label: 'شهریه مصوب', desc: 'شهریه مصوب آموزشی' },
                    { id: 'service', label: 'سرویس رفت‌وآمد', desc: 'هزینه سرویس ایاب و ذهاب' },
                    { id: 'food', label: 'تغذیه و میان‌وعده', desc: 'هزینه تغذیه و صبحانه' },
                    { id: 'uniform', label: 'لباس و پوشاک', desc: 'هزینه لباس فرم دانش‌آموز' },
                    { id: 'activity', label: 'کلاس فوق‌برنامه', desc: 'هزینه کلاس‌های فوق‌برنامه' },
                    { id: 'books', label: 'کتب و آزمون‌ها', desc: 'هزینه کتب و آزمون‌های سنجش' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setDebtItemType(item.id as typeof debtItemType);
                        setFormDesc(item.desc);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all text-center ${
                        debtItemType === item.id
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : 'bg-[#fcfaff] text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  مبلغ کل بدهی (به ریال) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formAmount}
                  onChange={(e) => {
                    const raw = latinDigits(e.target.value).replace(/\D/g, '');
                    setFormAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۱۸۰,۰۰۰,۰۰۰"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] font-mono text-left focus:outline-hidden focus:border-[#62205f]"
                  dir="ltr"
                />
                {formAmount && <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" aria-live="polite">معادل به حروف (تومان): {amountInTomanWords(formAmount)}</div>}
              </div>

              {/* Installment Plan Option */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableInstallments}
                    onChange={(e) => setEnableInstallments(e.target.checked)}
                    className="rounded text-[#62205f] focus:ring-[#62205f]"
                  />
                  <span className="text-xs font-bold text-[#341648]">تقسیط خودکار این مبلغ به اقساط ماهانه</span>
                </label>

                {enableInstallments && (
                  <div className="pt-2 border-t border-purple-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">تعداد اقساط:</span>
                      <div className="flex items-center gap-1">
                        {[2, 3, 4, 5, 6].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setInstallmentCount(cnt)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                              installmentCount === cnt
                                ? 'bg-[#62205f] text-white shadow-2xs'
                                : 'bg-white border border-gray-300 text-gray-700'
                            }`}
                          >
                            {cnt} قسط
                          </button>
                        ))}
                      </div>
                    </div>

                    {formAmount && (
                      <div className="text-[11px] text-purple-900 bg-white/80 p-2 rounded-lg border border-purple-200 font-medium">
                        هر قسط: حدوداً{' '}
                        <span className="font-bold font-mono">
                          {formatRial(Math.floor(Number(formAmount.replace(/\D/g, '')) / installmentCount))}
                        </span>{' '}
                        ریال (با فاصله ۳۰ روزه از تاریخ انتخابی)
                      </div>
                    )}
                  </div>
                )}
              </div>

              <JalaliDatePicker
                label="تاریخ ثبت (یا شروع اقساط)"
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
                  <span>{enableInstallments ? `ثبت ${installmentCount} قسط بدهی` : 'ثبت قطعی بدهی'}</span>
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
                  inputMode="numeric"
                  value={formAmount}
                  onChange={(e) => {
                    const raw = latinDigits(e.target.value).replace(/\D/g, '');
                    setFormAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۵۰,۰۰۰,۰۰۰"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] font-mono text-left focus:outline-hidden focus:border-[#62205f]"
                  dir="ltr"
                />
                {formAmount && <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" aria-live="polite">معادل به حروف (تومان): {amountInTomanWords(formAmount)}</div>}
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
                  <div className="space-y-3">
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

                    {formMethod === 'کارت خوان' && (
                      <div>
                        <label className="block text-xs font-bold text-[#341648] mb-1.5">
                          شماره پایانه کارتخوان (ترمینال پوز - اختیاری جهت تطبیق هوشمند بانک)
                        </label>
                        <input
                          type="text"
                          value={formPosTerminal}
                          onChange={(e) => setFormPosTerminal(e.target.value)}
                          placeholder="مثال: 89451230"
                          className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] font-mono text-left focus:outline-hidden focus:border-[#62205f]"
                          dir="ltr"
                        />
                      </div>
                    )}
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

      {/* Discount Modal */}
      {modalType === 'discount' && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-[#341648]">ثبت تخفیف و بورسیه: {selectedStudent.name}</h3>
              </div>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSaveDiscount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  علت و نوع تخفیف:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    'فرزند فرهنگی و همکار',
                    'چندفرزندی (فرزند دوم یا سوم)',
                    'حافظ یا قاری قرآن',
                    'ایثارگران و خانواده شهدا',
                    'بورسیه خیریه و هیئت امنا',
                    'سایر تخفیفات مصوب',
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        setDiscountReason(reason);
                        setFormDesc(`تخفیف مصوب ${reason}`);
                      }}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all text-center ${
                        discountReason === reason
                          ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-2xs ring-1 ring-amber-400'
                          : 'bg-[#fcfaff] text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  مبلغ تخفیف (به ریال) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formAmount}
                  onChange={(e) => {
                    const raw = latinDigits(e.target.value).replace(/\D/g, '');
                    setFormAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۳۰,۰۰۰,۰۰۰"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] font-mono text-left focus:outline-hidden focus:border-[#62205f]"
                  dir="ltr"
                />
                {formAmount && (
                  <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" aria-live="polite">
                    معادل به حروف (تومان): {amountInTomanWords(formAmount)}
                  </div>
                )}
              </div>

              <JalaliDatePicker
                label="تاریخ اعمال تخفیف"
                value={formJalaliDate}
                onChange={setFormJalaliDate}
                required
              />

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">توضیحات و مصوبه تخفیف</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="مثال: تخفیف مصوبه هیئت امنا"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>ثبت قطعی تخفیف و کسر از بدهی</span>
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
                    inputMode="numeric"
                    value={bulkAmount}
                    onChange={(e) => {
                      const raw = latinDigits(e.target.value).replace(/\D/g, '');
                      setBulkAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                    }}
                    placeholder="مثال: ۱۸۰,۰۰۰,۰۰۰"
                    className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                  {bulkAmount && <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" aria-live="polite">معادل به حروف (تومان): {amountInTomanWords(bulkAmount)}</div>}
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
                  {displayedBulkStudents.map((st) => (
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

      {invoiceStudent && (
        <InvoicePrintModal
          student={invoiceStudent}
          transactions={transactions}
          balance={getStudentBalance(invoiceStudent.id).balance}
          onClose={() => setInvoiceStudent(null)}
        />
      )}

      {/* Reject Modal for Senior */}
      {rejectModalTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>رد تراکنش شهریه شناسه {rejectModalTx.id}</span>
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
              علت رد این پرداخت را بنویسید تا در پرونده مالی دانش‌آموز ثبت گردد:
            </p>

            <textarea
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="مثال: فیش بانکی ناخواناست، مبلغ با پیگیری مطابقت ندارد و..."
              rows={3}
              className="w-full p-3 text-xs bg-[#fdfcfd] rounded-2xl border border-gray-300 focus:outline-hidden focus:border-rose-500"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (rejectModalTx) {
                    await rejectTransaction(rejectModalTx.id, rejectionReasonInput.trim() || 'عدم تأیید توسط مدیر ارشد');
                    setRejectModalTx(null);
                    setRejectionReasonInput('');
                  }
                }}
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
              <img
                src={selectedAttachment.url}
                alt={selectedAttachment.title}
                className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-md border border-gray-200"
              />
            </div>
            <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 text-xs">
              <span className="text-gray-500">رسید بانکی پرداخت شهریه</span>
              <a
                href={selectedAttachment.url}
                target="_blank"
                rel="noopener noreferrer"
                download="receipt.jpg"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-1.5 shadow-2xs hover:bg-indigo-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود و باز کردن فایل اصلی</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
