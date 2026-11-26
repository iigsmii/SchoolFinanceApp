import React, { useState } from 'react';
import SchoolSelect from '../SchoolSelect';
import { useBackClose } from '../../hooks/useBackClose';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Cheque } from '../../types';
import { takeNavHint } from '../../utils/alerts';
import { formatRial, jalaliFromGregorian, todayJalali, jalaliToIso, latinDigits, todayGregorian } from '../../utils/jalali';
import { chequeStage, CHEQUE_STAGE_LABEL, isCollectibleCheque, daysToDue, ChequeStage, canEditCheque, canReturnCheque } from '../../utils/cheques';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { QuickAmountPad } from '../QuickAmountPad';
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
  Pencil,
  RotateCcw,
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
    chequeCollection,
    bankAccounts,
    addDirectCheque,
    updateCheque,
    deleteCheque,
    returnCheque,
    currentUser,
    accentColor,
    schools,
    students,
  } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [initialChequeHint] = useState<string | null>(() => takeNavHint('cheques'));
  const initialChequeMatch = initialChequeHint?.match(/^(review|collect|list):cheque:(\d+)$/);
  const initialChequeId = initialChequeMatch ? Number(initialChequeMatch[2]) : null;
  const [focusChequeId, setFocusChequeId] = useState<number | null>(initialChequeId && Number.isFinite(initialChequeId) ? initialChequeId : null);
  const [activeTab, setActiveTab] = useState<'review' | 'list' | 'collect'>(() => {
    if (initialChequeMatch) return (isSenior ? initialChequeMatch[1] : 'list') as 'review' | 'collect' | 'list';
    if (isSenior && (initialChequeHint === 'collect' || initialChequeHint === 'review')) return initialChequeHint;
    return isSenior && initialMode === 'review' ? 'review' : 'list';
  });
  const [filterType, setFilterType] = useState<string>('all');

  React.useEffect(() => {
    if (!focusChequeId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`cheque-card-${focusChequeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusChequeId, activeTab]);

  // Cheque Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  useBackClose(isModalOpen, () => setIsModalOpen(false));
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
  const [returnDialog, setReturnDialog] = useState<{ cheque: Cheque; dateJalali: string; reason: string } | null>(null);
  const [returnBusy, setReturnBusy] = useState(false);
  useBackClose(returnDialog !== null, () => { if (!returnBusy) setReturnDialog(null); });
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);
  useBackClose(!!previewAttachment, () => setPreviewAttachment(null));

  const pendingCheques = cheques.filter((c) => c.status === 'pending');
  const userCheques = isSenior
    ? cheques
    : cheques.filter((c) => c.school_id === currentUser?.school_id);

  // ---- چرخه‌ی سرحساب و وصول (فقط مدیر ارشد) ----
  const today = todayGregorian();
  type CollectFilter = 'todo' | 'on_account' | 'cleared' | 'done';
  const [collectFilter, setCollectFilter] = useState<CollectFilter>('todo');
  const [collectDialog, setCollectDialog] = useState<{ cheque: Cheque; accountId: number; dateJalali: string } | null>(null);
  const [collectBusy, setCollectBusy] = useState(false);
  useBackClose(collectDialog !== null, () => { if (!collectBusy) setCollectDialog(null); });
  const [collectNotice, setCollectNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const activeBankAccounts = bankAccounts.filter((a) => a.is_active !== false);
  const collectStages: Record<CollectFilter, ChequeStage[]> = {
    todo: ['to_deposit', 'on_account'],
    on_account: ['on_account'],
    cleared: ['cleared'],
    done: ['reconciled', 'not_cleared', 'returned'],
  };
  const stageOf = (c: Cheque) => chequeStage(c);
  const stageCounts = userCheques.reduce<Record<string, number>>((acc, c) => {
    const st = stageOf(c);
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});
  const dueActionCount = userCheques.filter((c) => stageOf(c) === 'on_account' && daysToDue(c.due_date, today) <= 0).length;

  const runCollection = async (c: Cheque, step: 'on_account' | 'undo_on_account' | 'cleared' | 'not_cleared', opts: { bank_account_id?: number; date?: string } = {}) => {
    if (collectBusy) return;
    setCollectBusy(true);
    try {
      const res = await chequeCollection(c.id, step, opts);
      setCollectNotice({ text: res.message, ok: res.success });
      if (res.success) setCollectDialog(null);
    } finally {
      setCollectBusy(false);
    }
  };
  const confirmCollection = (c: Cheque, step: 'cleared' | 'not_cleared') => {
    const name = c.student_name || c.issuer_name || 'چک';
    const msg = step === 'cleared'
      ? `وصول چک «${name}» به مبلغ ${formatRial(c.amount)} ریال تأیید شود و به حساب بانک واریز گردد؟`
      : `عدم وصول چک «${name}» ثبت شود؟ پرداخت شهریه‌ی این چک از دفتر دانش‌آموز برگشت می‌خورد.`;
    if (window.confirm(msg)) void runCollection(c, step);
  };
  const saveCollectDialog = () => {
    if (!collectDialog) return;
    const iso = jalaliToIso(collectDialog.dateJalali);
    if (!collectDialog.accountId) { setCollectNotice({ text: 'حساب بانکی را انتخاب کنید.', ok: false }); return; }
    void runCollection(collectDialog.cheque, 'on_account', { bank_account_id: collectDialog.accountId, date: iso || undefined });
  };

  const filteredCheques = userCheques.filter((c) => {
    if (activeTab === 'collect' && !collectStages[collectFilter].includes(stageOf(c))) return false;
    if (filterType === 'all') return true;
    if (filterType === 'sayad') return !c.cheque_type || c.cheque_type === 'sayad';
    if (filterType === 'non_sayad') return c.cheque_type === 'non_sayad';
    if (filterType === 'gharzolhasane') return c.cheque_type === 'gharzolhasane';
    if (filterType === 'guarantee') return c.cheque_type === 'guarantee' || c.cheque_purpose === 'guarantee';
    return true;
  }).sort((a, b) => (activeTab === 'collect' ? String(a.due_date).localeCompare(String(b.due_date)) : 0));

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

  const canEditOwn = (c: Cheque) => isSenior || String(c.created_by || '') === String(currentUser?.id || '');

  const handleOpenAddModal = () => {
    setEditingCheque(null);
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

  const handleOpenEditModal = (c: Cheque) => {
    setEditingCheque(c);
    setChequeType((c.cheque_type || 'sayad') as any);
    setBankName(c.bank_name || IRANIAN_BANKS[0]);
    setChequePurpose((c.cheque_purpose || 'tuition') as any);
    setSayadId(latinDigits(String(c.sayad_id || '')).replace(/\D/g, ''));
    setChequeNumber(latinDigits(String(c.cheque_number || '')));
    setIssuerName(c.issuer_name || c.student_name || '');
    setAmountStr(Number(c.amount || 0) ? Number(c.amount).toLocaleString('en-US') : '');
    setDueDateJalali(c.due_date ? jalaliFromGregorian(c.due_date) : todayJalali());
    setIssueDateJalali(c.issue_date ? jalaliFromGregorian(c.issue_date) : todayJalali());
    setSelectedSchoolId(c.school_id);
    setSelectedStudentId(c.student_id || undefined);
    setNote(c.note || '');
    setAttachment(c.attachment_url || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const submitReturn = async () => {
    if (!returnDialog || returnBusy) return;
    const iso = jalaliToIso(returnDialog.dateJalali);
    if (!iso) { setCollectNotice({ text: 'تاریخ عودت را درست وارد کنید.', ok: false }); return; }
    setReturnBusy(true);
    try {
      const res = await returnCheque(returnDialog.cheque.id, { date: iso, reason: returnDialog.reason.trim() });
      setCollectNotice({ text: res.message, ok: res.success });
      if (res.success) setReturnDialog(null);
    } finally {
      setReturnBusy(false);
    }
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
      const cleanSayad = latinDigits(sayadId).replace(/\D/g, '').trim();
      if (cleanSayad.length !== 16) {
        setFormError('شناسه صیاد چک باید دقیقاً ۱۶ رقم باشد.');
        return;
      }
    }

    if (!issuerName.trim() && !selectedStudentId) {
      setFormError('نام صادرکننده یا دانش‌آموز مربوطه را مشخص کنید.');
      return;
    }

    if (!editingCheque && !attachment.trim()) {
      setFormError('ارسال عکس برگه چک الزامی است. لطفاً تصویر چک را الصاق فرمایید.');
      return;
    }

    if (editingCheque) {
      const c0 = editingCheque;
      const next: Partial<Cheque> = {
        amount: amt,
        sayad_id: chequeType === 'sayad' ? latinDigits(sayadId).replace(/\D/g, '') : '',
        cheque_number: latinDigits(chequeNumber).trim(),
        bank_name: bankName,
        cheque_type: chequeType,
        cheque_purpose: chequePurpose,
        issuer_name: issuerName.trim() || c0.student_name,
        due_date: jalaliToIso(dueDateJalali),
        issue_date: jalaliToIso(issueDateJalali),
        note: note.trim(),
      };
      const changed: Partial<Cheque> = {};
      (Object.keys(next) as Array<keyof Cheque>).forEach((k) => {
        const a = (next as any)[k] ?? '';
        const b = (c0 as any)[k] ?? '';
        if (String(a) !== String(b)) (changed as any)[k] = (next as any)[k];
      });
      if (attachment && attachment !== c0.attachment_url) changed.attachment_url = attachment;
      if (Object.keys(changed).length === 0) {
        setIsModalOpen(false);
        setEditingCheque(null);
        return;
      }
      updateCheque(c0.id, changed);
      setCollectNotice({ text: 'چک ویرایش شد و برای تأیید دوباره به صف تأیید رفت.', ok: true });
      setIsModalOpen(false);
      setEditingCheque(null);
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
      sayad_id: chequeType === 'sayad' ? latinDigits(sayadId).replace(/\D/g, '') : undefined,
      cheque_number: latinDigits(chequeNumber).trim() || undefined,
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
    setEditingCheque(null);
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
            <button
              onClick={() => setActiveTab('collect')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'collect'
                  ? 'bg-[#62205f] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={activeTab === 'collect' ? { backgroundColor: accentColor } : {}}
            >
              <Landmark className="w-4 h-4" />
              <span>سرحساب و وصول{dueActionCount > 0 ? ` (${dueActionCount} سررسید)` : ''}</span>
            </button>
          </div>
        )}

        {collectNotice && (
          <div className={`rounded-2xl border p-3 text-xs font-bold flex items-start justify-between gap-2 ${collectNotice.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            <span>{collectNotice.text}</span>
            <button type="button" aria-label="بستن" onClick={() => setCollectNotice(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {isSenior && activeTab === 'collect' && (
          <div className="bg-white p-3 rounded-2xl border border-[#e5dde8] shadow-2xs space-y-2">
            <div className="text-[11px] leading-5 text-gray-600">
              مراحل هر چک: تأیید ← <b>سرحساب</b> (انتخاب حساب بانکی) ← در سررسید <b>وصول / عدم وصول</b> ← واریز به حساب بانک ← <b>تطبیق</b> در صفحه‌ی تطبیق بانک.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {([
                { id: 'todo', label: `نیازمند اقدام (${(stageCounts.to_deposit || 0) + (stageCounts.on_account || 0)})` },
                { id: 'on_account', label: `سرحساب‌شده (${stageCounts.on_account || 0})` },
                { id: 'cleared', label: `وصول‌شده، منتظر تطبیق (${stageCounts.cleared || 0})` },
                { id: 'done', label: `تطبیق‌شده / برگشتی / عودتی (${(stageCounts.reconciled || 0) + (stageCounts.not_cleared || 0) + (stageCounts.returned || 0)})` },
              ] as Array<{ id: CollectFilter; label: string }>).map((t) => (
                <button key={t.id} type="button" onClick={() => setCollectFilter(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${collectFilter === t.id ? 'bg-[#341648] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
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
              const stage = stageOf(c);
              const stageBg: Record<ChequeStage, string> = {
                awaiting_review: 'bg-amber-100 text-amber-800 border-amber-200',
                to_deposit: 'bg-sky-100 text-sky-800 border-sky-200',
                on_account: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                cleared: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                reconciled: 'bg-emerald-200 text-emerald-900 border-emerald-300',
                not_cleared: 'bg-red-100 text-red-900 border-red-200',
                rejected: 'bg-rose-100 text-rose-800 border-rose-200',
                guarantee: 'bg-gray-100 text-gray-700 border-gray-200',
                returned: 'bg-orange-100 text-orange-900 border-orange-200',
              };
              const dueDays = daysToDue(c.due_date, today);
              const depositAccount = bankAccounts.find((a) => a.id === c.deposit_bank_account_id);
              const statusBadge =
                c.status === 'approved' || c.status === 'paid' || c.status === 'bounced' || c.status === 'returned'
                  ? { label: CHEQUE_STAGE_LABEL[stage], bg: stageBg[stage] }
                  : c.status === 'pending'
                  ? { label: 'در انتظار تأیید', bg: 'bg-amber-100 text-amber-800 border-amber-200' }
                  : c.status === 'rejected'
                  ? { label: 'رد شده', bg: 'bg-rose-100 text-rose-800 border-rose-200' }
                  : { label: 'برگشتی', bg: 'bg-red-100 text-red-900 border-red-200' };

              return (
                <div
                  key={c.id}
                  id={`cheque-card-${c.id}`}
                  className={`bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-3 hover:border-purple-300 transition-all ${focusChequeId === Number(c.id) ? 'ring-4 ring-sky-400 ring-offset-2' : ''}`}
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

                  {/* سرحساب و وصول (مدیر ارشد) */}
                  {isSenior && (stage === 'to_deposit' || stage === 'on_account' || stage === 'cleared' || stage === 'reconciled' || stage === 'not_cleared') && (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
                      {depositAccount && stage !== 'to_deposit' && (
                        <div className="text-[11px] text-indigo-900 font-bold flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>حساب: {depositAccount.name} ({String(depositAccount.account_number || '').slice(-4)})</span>
                          {c.on_account_date && <span>تاریخ سرحساب: {jalaliFromGregorian(c.on_account_date)}</span>}
                          {c.cleared_date && stage !== 'on_account' && <span>تاریخ نتیجه: {jalaliFromGregorian(c.cleared_date)}</span>}
                        </div>
                      )}
                      {stage === 'to_deposit' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" disabled={collectBusy}
                            onClick={() => setCollectDialog({ cheque: c, accountId: activeBankAccounts.find((a) => a.school_id === c.school_id)?.id || (activeBankAccounts.length === 1 ? activeBankAccounts[0].id : 0), dateJalali: todayJalali() })}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: accentColor }}>
                            سرحساب کردن چک
                          </button>
                          <span className="text-[11px] text-gray-500">سررسید: {dueDays > 0 ? `${dueDays} روز دیگر` : dueDays === 0 ? 'امروز' : `${Math.abs(dueDays)} روز گذشته`}</span>
                        </div>
                      )}
                      {stage === 'on_account' && (
                        dueDays > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-indigo-900">سررسید {dueDays} روز دیگر است؛ بعد از سررسید می‌توانید وصول یا عدم وصول را تأیید کنید.</span>
                            <button type="button" disabled={collectBusy} onClick={() => { if (window.confirm('سرحساب این چک لغو شود؟')) void runCollection(c, 'undo_on_account'); }}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-gray-300 text-gray-700 bg-white">لغو سرحساب</button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" disabled={collectBusy} onClick={() => confirmCollection(c, 'cleared')}
                              className="flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">✓ تأیید وصول</button>
                            <button type="button" disabled={collectBusy} onClick={() => confirmCollection(c, 'not_cleared')}
                              className="flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50">✗ عدم وصول</button>
                          </div>
                        )
                      )}
                      {stage === 'cleared' && (
                        <div className="text-[11px] font-bold text-emerald-800">مبلغ به حساب بانک واریز شد؛ در صفحه‌ی «تطبیق بانک» با ردیف صورتحساب تطبیق دهید.</div>
                      )}
                      {stage === 'reconciled' && <div className="text-[11px] font-bold text-emerald-800">با صورتحساب بانک تطبیق خورده است ✓</div>}
                      {stage === 'not_cleared' && <div className="text-[11px] font-bold text-rose-800">وصول نشد؛ پرداخت شهریه‌ی این چک از دفتر برگشت خورد.</div>}
                    </div>
                  )}

                  {stage === 'returned' && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-[11px] font-bold text-orange-900 space-y-1">
                      <div>این چک به صاحبش عودت داده شد{c.return_date ? ` (تاریخ عودت: ${jalaliFromGregorian(c.return_date)})` : ''}.</div>
                      {c.return_reason && <div>دلیل: {c.return_reason}</div>}
                      {c.return_reversed && <div>پرداخت شهریه‌ی این چک و سند حسابداری آن برگشت خورد.</div>}
                    </div>
                  )}

                  {((canEditCheque(c) && canEditOwn(c)) || (isSenior && canReturnCheque(c))) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {canEditCheque(c) && canEditOwn(c) && (
                        <button
                          type="button"
                          onClick={() => {
                            const warn = c.status === 'approved'
                              ? 'این چک قبلاً تأیید شده است. با ویرایش، پرداخت ثبت‌شده‌ی آن از دفتر برداشته می‌شود و چک باید دوباره تأیید شود. ادامه می‌دهید؟'
                              : 'با ذخیره‌ی ویرایش، چک دوباره به صف تأیید می‌رود. ادامه می‌دهید؟';
                            if (window.confirm(warn)) handleOpenEditModal(c);
                          }}
                          className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 py-1.5 px-3 rounded-lg bg-indigo-50 border border-indigo-200"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>ویرایش چک</span>
                        </button>
                      )}
                      {isSenior && canReturnCheque(c) && (
                        <button
                          type="button"
                          onClick={() => setReturnDialog({ cheque: c, dateJalali: todayJalali(), reason: '' })}
                          className="text-[11px] font-bold text-orange-800 hover:text-orange-900 flex items-center gap-1 py-1.5 px-3 rounded-lg bg-orange-50 border border-orange-200"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>عودت چک به صاحبش</span>
                        </button>
                      )}
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

      {collectDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] supports-[height:100dvh]:max-h-[92dvh]">
            <div className="p-4 border-b border-[#ede5ef] flex items-center justify-between shrink-0">
              <div className="font-bold text-[#341648] text-sm">سرحساب کردن چک — {collectDialog.cheque.student_name || collectDialog.cheque.issuer_name}</div>
              <button type="button" aria-label="بستن" disabled={collectBusy} onClick={() => setCollectDialog(null)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              <div className="text-xs text-gray-600">مبلغ: <b>{formatRial(collectDialog.cheque.amount)} ریال</b> · سررسید: <b>{jalaliFromGregorian(collectDialog.cheque.due_date)}</b></div>
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">حساب بانکیِ سرحساب <span className="text-rose-500">*</span></label>
                {activeBankAccounts.length === 0 ? (
                  <div className="text-xs rounded-xl bg-amber-50 border border-amber-300 text-amber-900 p-3">هنوز حساب بانکی تعریف نشده است؛ ابتدا از بخش «حساب‌های بانکی» حساب را تعریف کنید.</div>
                ) : (
                  <select value={collectDialog.accountId} onChange={(e) => setCollectDialog({ ...collectDialog, accountId: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e5dde8] text-sm bg-white">
                    <option value={0} disabled>— انتخاب از حساب‌های تعریف‌شده —</option>
                    {activeBankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({String(a.account_number || '').slice(-4)})</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">تاریخ سرحساب</label>
                <JalaliDatePicker label="تاریخ سرحساب" value={collectDialog.dateJalali} onChange={(v) => setCollectDialog({ ...collectDialog, dateJalali: v })} />
              </div>
            </div>
            <div className="p-4 border-t border-[#ede5ef] shrink-0 flex justify-end gap-2">
              <button type="button" disabled={collectBusy} onClick={() => setCollectDialog(null)} className="px-4 py-2.5 rounded-xl border border-[#e5dde8] text-xs font-bold text-gray-600">انصراف</button>
              <button type="button" disabled={collectBusy || activeBankAccounts.length === 0} onClick={saveCollectDialog}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: accentColor }}>
                {collectBusy ? 'در حال ثبت…' : 'ثبت سرحساب'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {editingCheque ? 'ویرایش چک (پس از ذخیره دوباره به صف تأیید می‌رود)' : 'ثبت چک جدید (صیادی / غیر صیادی / قرض‌الحسنه / ضمانتی)'}
                </h3>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setEditingCheque(null); }}
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
                  {(IRANIAN_BANKS.includes(bankName) ? IRANIAN_BANKS : [bankName, ...IRANIAN_BANKS]).map((b) => (
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
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={16}
                    value={sayadId}
                    onChange={(e) => setSayadId(latinDigits(e.target.value).replace(/\D/g, ''))}
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
                    onChange={(e) => setChequeNumber(latinDigits(e.target.value))}
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
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  value={amountStr}
                  onChange={(e) => {
                    const raw = latinDigits(e.target.value).replace(/\D/g, '');
                    setAmountStr(raw ? Number(raw).toLocaleString('en-US') : '');
                  }}
                  placeholder="مثال: ۷۵,۰۰۰,۰۰۰"
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                  dir="ltr"
                />
                <QuickAmountPad
                  value={amountStr}
                  onChange={setAmountStr}
                  accentColor={accentColor}
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
                  <div className={editingCheque ? 'pointer-events-none opacity-60' : ''}><SchoolSelect schools={schools} value={selectedSchoolId} onChange={(value) => setSelectedSchoolId(Number(value))} className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648]" /></div>
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
                required={!editingCheque}
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
                  <span>{editingCheque ? 'ذخیره‌ی ویرایش و ارسال برای تأیید' : 'ثبت قطعی چک در سامانه'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingCheque(null); }}
                  className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return cheque dialog */}
      {returnDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-[#e5dde8] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#341648]">عودت چک به صاحبش</h3>
              <button type="button" aria-label="بستن" disabled={returnBusy} onClick={() => setReturnDialog(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="text-xs text-gray-700 leading-6 bg-gray-50 rounded-xl p-3">
              چک «{returnDialog.cheque.student_name}» به مبلغ <b>{formatRial(returnDialog.cheque.amount)}</b> ریال
              {returnDialog.cheque.status === 'approved'
                ? ' تأیید شده است؛ با عودت، پرداخت شهریه‌ی آن از دفتر برداشته می‌شود و سند برگشت اسناد دریافتنی صادر می‌گردد.'
                : ' بدون ثبت سند برگشت، به صاحبش عودت داده می‌شود.'}
            </div>
            <JalaliDatePicker label="تاریخ عودت" value={returnDialog.dateJalali} onChange={(v) => setReturnDialog({ ...returnDialog, dateJalali: v })} required />
            <div>
              <label className="block text-xs font-bold text-[#341648] mb-1.5">دلیل عودت (اختیاری)</label>
              <input type="text" maxLength={300} value={returnDialog.reason} onChange={(e) => setReturnDialog({ ...returnDialog, reason: e.target.value })}
                placeholder="مثال: تسویه‌ی نقدی شهریه" className="w-full px-3 py-2 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="button" disabled={returnBusy} onClick={() => void submitReturn()}
                className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold disabled:opacity-50" style={{ backgroundColor: accentColor }}>
                {returnBusy ? 'در حال ثبت…' : 'تأیید عودت چک'}
              </button>
              <button type="button" disabled={returnBusy} onClick={() => setReturnDialog(null)}
                className="py-2.5 px-4 rounded-xl text-gray-700 bg-gray-100 text-xs font-semibold">انصراف</button>
            </div>
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
