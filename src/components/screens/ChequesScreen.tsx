import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Cheque } from '../../types';
import { formatRial, jalaliFromGregorian, todayJalali, jalaliToIso, latinDigits } from '../../utils/jalali';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { ReceiptImageUploader } from '../ReceiptImageUploader';
import {
  FileCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building,
  User,
  PlusCircle,
  Landmark,
  Eye,
  Trash2,
  X,
  Check,
  Tag,
  Shield,
  CreditCard,
  FileText,
} from 'lucide-react';
import { AttachmentImg } from '../AttachmentImg';

const IRANIAN_BANKS = [
  'بانک ملی ایران',
  'بانک صادرات ایران',
  'بانک ملت',
  'بانک تجارت',
  'بانک سپه',
  'قرض‌الحسنه رسالت',
  'قرض‌الحسنه مهر ایران',
  'بانک مسکن',
  'بانک کشاورزی',
  'بانک رفاه کارگران',
  'بانک پاسارگاد',
  'بانک پارسیان',
  'بانک سامان',
  'بانک شهر',
  'بانک سینا',
  'بانک آینده',
  'پست بانک ایران',
  'بانک توسعه تعاون',
  'سایر بانک‌ها / مؤسسات',
];

export const ChequesScreen: React.FC<{ initialMode?: 'review' | 'list' }> = ({
  initialMode = 'list',
}) => {
  const {
    cheques,
    reviewCheque,
    addDirectCheque,
    deleteCheque,
    currentUser,
    accentColor,
    schools,
    students,
  } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'review' | 'list'>(
    isSenior && initialMode === 'review' ? 'review' : 'list'
  );
  const [filterType, setFilterType] = useState<string>('all');

  // Cheque Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chequeType, setChequeType] = useState<'sayad' | 'non_sayad' | 'gharzolhasane' | 'guarantee'>('sayad');
  const [bankName, setBankName] = useState(IRANIAN_BANKS[0]);
  const [chequePurpose, setChequePurpose] = useState<'tuition' | 'guarantee' | 'staff_guarantee' | 'general'>('tuition');
  const [sayadId, setSayadId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDateJalali, setDueDateJalali] = useState(todayJalali());
  const [issueDateJalali, setIssueDateJalali] = useState(todayJalali());
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1
  );
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined);
  const [note, setNote] = useState('');
  const [attachment, setAttachment] = useState('');
  const [formError, setFormError] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);

  const pendingCheques = cheques.filter((c) => c.status === 'pending');
  const userCheques = isSenior
    ? cheques
    : cheques.filter((c) => c.school_id === currentUser?.school_id);

  const filteredCheques = userCheques.filter((c) => {
    if (filterType === 'all') return true;
    if (filterType === 'sayad') return !c.cheque_type || c.cheque_type === 'sayad';
    if (filterType === 'non_sayad') return c.cheque_type === 'non_sayad';
    if (filterType === 'gharzolhasane') return c.cheque_type === 'gharzolhasane';
    if (filterType === 'guarantee') return c.cheque_type === 'guarantee' || c.cheque_purpose === 'guarantee';
    return true;
  });

  // Due date warnings (cheques maturing within 10 days)
  const now = new Date();
  const in10Days = new Date();
  in10Days.setDate(now.getDate() + 10);

  const alerts = userCheques.filter((c) => {
    if (c.status !== 'approved' && c.status !== 'pending') return false;
    const d = new Date(c.due_date);
    return d <= in10Days;
  });

  const handleReviewAction = (id: number, action: 'receive' | 'favor' | 'reject') => {
    const res = reviewCheque(id, action);
    alert(res.message);
  };

  const handleOpenAddModal = () => {
    setChequeType('sayad');
    setBankName(IRANIAN_BANKS[0]);
    setChequePurpose('tuition');
    setSayadId('');
    setChequeNumber('');
    setIssuerName('');
    setAmountStr('');
    setDueDateJalali(todayJalali());
    setIssueDateJalali(todayJalali());
    setSelectedSchoolId(isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1);
    setSelectedStudentId(undefined);
    setNote('');
    setAttachment('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveCheque = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const amt = Number(latinDigits(amountStr).replace(/\D/g, '')) || 0;
    if (amt <= 0) {
      setFormError('مبلغ چک را به ریال به درستی وارد کنید.');
      return;
    }

    if (chequeType === 'sayad') {
      const cleanSayad = sayadId.replace(/\D/g, '').trim();
      if (cleanSayad.length !== 16) {
        setFormError('شناسه صیاد چک باید دقیقاً ۱۶ رقم باشد.');
        return;
      }
    }

    if (!issuerName.trim() && !selectedStudentId) {
      setFormError('نام صادرکننده یا دانش‌آموز مربوطه را مشخص کنید.');
      return;
    }

    if (!attachment.trim()) {
      setFormError('ارسال عکس برگه چک الزامی است. لطفاً تصویر چک را الصاق فرمایید.');
      return;
    }

    const schoolObj = schools.find((s) => s.id === selectedSchoolId);
    const studentObj = students.find((s) => s.id === selectedStudentId);

    const displayName = studentObj ? studentObj.name : issuerName.trim();

    addDirectCheque({
      student_id: selectedStudentId || 0,
      student_name: displayName,
      school_id: selectedSchoolId,
      school_name: schoolObj?.name || 'مدرسه',
      amount: amt,
      sayad_id: chequeType === 'sayad' ? sayadId.trim() : undefined,
      cheque_number: chequeNumber.trim() || undefined,
      bank_name: bankName,
      cheque_type: chequeType,
      cheque_purpose: chequePurpose,
      issuer_name: issuerName.trim() || displayName,
      due_date: jalaliToIso(dueDateJalali),
      issue_date: jalaliToIso(issueDateJalali),
      received_confirmed: true,
      in_favor_confirmed: true,
      status: 'approved',
      note: note.trim(),
      attachment_url: attachment,
    });

    setIsModalOpen(false);
  };

  const getTypeBadge = (c: Cheque) => {
    if (c.cheque_type === 'guarantee' || c.cheque_purpose === 'guarantee') {
      return { label: 'چک ضمانتی', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
    }
    if (c.cheque_type === 'gharzolhasane') {
      return { label: 'چک قرض‌الحسنه', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    }
    if (c.cheque_type === 'non_sayad') {
      return { label: 'چک غیر صیادی', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
    }
    return { label: 'چک صیادی', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16">
      <Header title="مدیریت چک‌ها، اسناد صیادی و ضمانتی" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Top Sacred Banner with Actions */}
        <div
          className="rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #2f0d36 100%)`,
          }}
        >
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/20 text-xs font-bold text-[#f5dff2] mb-1.5">
                <span>سامانه ثبت و نظارت اسناد تجاری و تعهدات</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-neyrizi">
                اسناد صیادی، چک‌های غیر صیادی و چک‌های ضمانت
              </h2>
              <p className="text-xs text-[#f5dff2]/90 mt-1 max-w-xl">
                امکان ثبت نام بانک صادرکننده، چک‌های قرض‌الحسنه بدون صیاد و دریافت چک‌های تضمین شهریه
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#341648] font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ثبت چک جدید</span>
            </button>
          </div>
        </div>

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
              <span>لیست کلی چک‌ها ({userCheques.length})</span>
            </button>
          </div>
        )}

        {/* Filter Pills for Cheque Type */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-2xl border border-[#e5dde8] shadow-2xs">
          <span className="text-xs font-bold text-gray-500 mr-1">دسته‌بندی چک‌ها:</span>
          {[
            { id: 'all', label: 'همه چک‌ها' },
            { id: 'sayad', label: 'چک صیادی' },
            { id: 'non_sayad', label: 'غیر صیادی' },
            { id: 'gharzolhasane', label: 'قرض‌الحسنه' },
            { id: 'guarantee', label: 'چک‌های ضمانتی' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                filterType === tab.id
                  ? 'bg-[#341648] text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Maturing Alerts */}
        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xs">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>هشدار سررسید نزدیک چک‌ها ({alerts.length} فقره طی ۱۰ روز آینده)</span>
            </div>
            <div className="space-y-2">
              {alerts.map((c) => (
                <div
                  key={c.id}
                  className="bg-white/90 rounded-xl p-3 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-950">{c.student_name}</span>
                    <span className="text-gray-500">| {c.bank_name || 'بانک'}</span>
                    <span className="text-gray-500">| مبلغ: {formatRial(c.amount)} ریال</span>
                    <span className="text-gray-500">| سررسید: {jalaliFromGregorian(c.due_date)}</span>
                  </div>
                  <span className="font-mono text-xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md self-start sm:self-center">
                    {c.sayad_id ? `صیاد: ${c.sayad_id}` : `سریال: ${c.cheque_number || 'فاقد سریال'}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List of Cheques */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold flex items-center justify-between">
            <span>فهرست چک‌ها ({filteredCheques.length} فقره):</span>
          </div>

          {filteredCheques.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-gray-400 border border-[#e5dde8]">
              هیچ چکی در این دسته‌بندی یافت نشد.
            </div>
          ) : (
            filteredCheques.map((c) => {
              const badge = getTypeBadge(c);
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
                  className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-3 hover:border-purple-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-[#341648]">{c.student_name}</span>
                        <span className="text-xs text-gray-500 font-semibold">({c.school_name})</span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1 font-bold text-purple-900">
                          <Landmark className="w-3.5 h-3.5 text-purple-700" />
                          <span>{c.bank_name || 'بانک نامشخص'}</span>
                        </span>
                        <span>سررسید: <b>{jalaliFromGregorian(c.due_date)}</b></span>
                        <span>صدور: {jalaliFromGregorian(c.issue_date)}</span>
                        {c.sayad_id ? (
                          <span className="font-mono text-gray-700">
                            شناسه صیادی: <b>{c.sayad_id}</b>
                          </span>
                        ) : c.cheque_number ? (
                          <span className="font-mono text-gray-700">
                            شماره چک: <b>{c.cheque_number}</b>
                          </span>
                        ) : null}
                      </div>

                      {c.note && (
                        <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded-xl">
                          یادداشت: {c.note}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <div className="text-lg font-black font-mono text-[#341648]">
                        {formatRial(c.amount)} ریال
                      </div>
                      {c.attachment_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(c.attachment_url || null)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مشاهده تصویر چک</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions for Senior */}
                  {isSenior && activeTab === 'review' && c.status === 'pending' && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => handleReviewAction(c.id, 'receive')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          c.received_confirmed
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                        disabled={c.received_confirmed}
                      >
                        <Check className="w-4 h-4" />
                        <span>{c.received_confirmed ? 'دریافت تأیید شد ✓' : 'تأیید دریافت فیزیکی'}</span>
                      </button>

                      <button
                        onClick={() => handleReviewAction(c.id, 'favor')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          c.in_favor_confirmed
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-[#62205f] text-white hover:opacity-90'
                        }`}
                        style={!c.in_favor_confirmed ? { backgroundColor: accentColor } : {}}
                        disabled={c.in_favor_confirmed}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{c.in_favor_confirmed ? 'در وجه مدرسه تأیید شد ✓' : 'تأیید ثبت در وجه'}</span>
                      </button>

                      <button
                        onClick={() => handleReviewAction(c.id, 'reject')}
                        className="py-2 px-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>رد چک</span>
                      </button>
                    </div>
                  )}

                  {/* Delete Option for Senior or Creator */}
                  {isSenior && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('آیا از حذف این چک اطمینان دارید؟')) {
                            deleteCheque(c.id);
                          }
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف چک</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Add New Cheque Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5dde8] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#62205f] flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#341648]">
                  ثبت چک جدید (صیادی / غیر صیادی / قرض‌الحسنه / ضمانتی)
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCheque} className="overflow-y-auto space-y-4 flex-1 p-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Cheque Type Selection */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  نوع چک <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sayad', label: 'چک صیادی بنفش' },
                    { id: 'non_sayad', label: 'چک غیر صیادی' },
                    { id: 'gharzolhasane', label: 'چک قرض‌الحسنه' },
                    { id: 'guarantee', label: 'چک ضمانتی' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setChequeType(t.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        chequeType === t.id
                          ? 'border-[#62205f] bg-purple-50 text-[#62205f] shadow-xs'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Selection */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  نام بانک صادرکننده چک <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648]"
                >
                  {IRANIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sayad ID or Cheque Serial Number */}
              {chequeType === 'sayad' ? (
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    شناسه صیاد (۱۶ رقم) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={sayadId}
                    onChange={(e) => setSayadId(e.target.value.replace(/\D/g, ''))}
                    placeholder="مثال: 1234567890123456"
                    className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    شماره سریال برگه چک / شماره حساب قرض‌الحسنه
                  </label>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="مثال: ۸۹۰/۴۴۲ یا بدون شماره صیادی"
                    className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    این نوع چک فاقد شماره صیادی است و نیازی به ثبت ۱۶ رقمی ندارد.
                  </span>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  مبلغ چک (ریال) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountStr}
                  onChange={(e) => {
                    const raw = latinDigits(e.target.value).replace(/\D/g, '');
                    setAmountStr(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۷۵,۰۰۰,۰۰۰"
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                  dir="ltr"
                />
              </div>

              {/* Dates: Issue & Due */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <JalaliDatePicker
                  label="تاریخ صدور چک"
                  value={issueDateJalali}
                  onChange={setIssueDateJalali}
                  required
                />
                <JalaliDatePicker
                  label="تاریخ سررسید چک"
                  value={dueDateJalali}
                  onChange={setDueDateJalali}
                  required
                />
              </div>

              {/* School and Student / Issuer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    مدرسه مربوطه <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648]"
                  >
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    صادرکننده / ولی دانش‌آموز <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                    placeholder="نام صاحب حساب یا صادرکننده"
                    className="w-full px-3 py-2 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648]"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">بابت / موضوع چک</label>
                <select
                  value={chequePurpose}
                  onChange={(e) => setChequePurpose(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648]"
                >
                  <option value="tuition">شهریه تحصیلی دانش‌آموز</option>
                  <option value="guarantee">چک ضمانت شهریه</option>
                  <option value="staff_guarantee">چک ضمانت حسن انجام کار معلمان و پرسنل</option>
                  <option value="general">سایر اسناد و تعهدات مالی</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">توضیحات و شرح چک</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: بابت شهریه سه ماهه اول یا ضمانت قرارداد"
                  className="w-full px-3 py-2 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs"
                />
              </div>

              {/* Mandatory Cheque Photo Upload */}
              <ReceiptImageUploader
                value={attachment}
                onChange={setAttachment}
                required={true}
                label="تصویر برگه چک (صیادی / غیر صیادی / ضمانت)"
                helperText="ارسال عکس برگه چک الزامی است؛ عکس به صورت خودکار بدون افت کیفیت برای بارگذاری سریع فشرده می‌شود."
              />

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check className="w-4 h-4" />
                  <span>ثبت قطعی چک در سامانه</span>
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

      {/* Image Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 shadow-2xl border border-gray-300 relative space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-xs font-bold text-[#341648]">تصویر برگه چک ثبت‌شده</span>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-gray-50 flex items-center justify-center p-2">
              <AttachmentImg
                src={previewAttachment}
                alt="Cheque attachment"
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
