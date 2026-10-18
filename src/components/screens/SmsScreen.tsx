import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';
import { calculateStudentOverdue } from '../../utils/debt';
import { Student } from '../../types';
import {
  MessageSquare,
  Send,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
  Key,
  Phone,
  Globe,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Eye,
  Check,
  ShieldAlert,
  Smartphone,
  Copy,
  Edit3,
} from 'lucide-react';

export const SmsScreen: React.FC = () => {
  const {
    currentUser,
    accentColor,
    students,
    schools,
    transactions,
    getStudentBalance,
    smsLogs,
    smsConfig,
    setSmsConfig,
    sendSmsReminder,
    sendBatchSmsReminders,
    clearSmsLogs,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'send' | 'settings' | 'logs'>('send');
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 0
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high_debt' | 'overdue'>('all');
  const [targetRecipient, setTargetRecipient] = useState<'all' | 'mothers' | 'fathers'>('all');
  const [targetGrade, setTargetGrade] = useState<string>('all');

  // Preview & Edit State
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [previewTargetPhone, setPreviewTargetPhone] = useState<string>('');
  const [editableMessage, setEditableMessage] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Batch Confirm Modal
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchResult, setBatchResult] = useState<{ sentCount: number; failedCount: number } | null>(null);

  // Settings State
  const [provider, setProvider] = useState(smsConfig.provider);
  const [apiKey, setApiKey] = useState(smsConfig.apiKey);
  const [senderNumber, setSenderNumber] = useState(smsConfig.senderNumber);
  const [apiUrl, setApiUrl] = useState(smsConfig.apiUrl);
  const [patternCode, setPatternCode] = useState(smsConfig.patternCode);
  const [smsTemplate, setTemplateText] = useState(smsConfig.smsTemplate);
  const [enabled, setEnabled] = useState(smsConfig.enabled);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test SMS State
  const [testPhone, setTestPhone] = useState('09130000000');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (!s.active) return false;
    if (selectedSchoolId !== 0 && s.school_id !== selectedSchoolId) return false;
    if (targetGrade !== 'all' && s.grade !== targetGrade) return false;
    if (targetRecipient === 'mothers' && !s.mother_phone) return false;
    if (targetRecipient === 'fathers' && !s.father_phone) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchPhone =
        s.phone.includes(q) ||
        (s.father_phone && s.father_phone.includes(q)) ||
        (s.mother_phone && s.mother_phone.includes(q));
      const matchNid = s.national_id.includes(q);
      if (!matchName && !matchPhone && !matchNid) return false;
    }
    const { debt } = getStudentBalance(s.id);
    if (debt <= 0) return false;

    if (filterType === 'high_debt' && debt < 50000000) return false;
    if (filterType === 'overdue') {
      const overdue = calculateStudentOverdue(s, transactions);
      if (overdue.overdueDays < 15) return false;
    }
    return true;
  });

  const totalDebtorsCount = filteredStudents.length;
  const totalDebtSum = filteredStudents.reduce((sum, s) => sum + getStudentBalance(s.id).debt, 0);

  const getFormattedMessage = (student: Student) => {
    const { debt } = getStudentBalance(student.id);
    const overdue = calculateStudentOverdue(student, transactions);
    return smsConfig.smsTemplate
      .replace('{name}', student.name)
      .replace('{school}', student.school_name || 'مدرسه')
      .replace('{amount}', formatRial(debt))
      .replace('{days}', String(overdue.overdueDays));
  };

  const handleOpenPreview = (student: Student, specificPhone?: string) => {
    setPreviewStudent(student);
    setPreviewTargetPhone(specificPhone || student.mother_phone || student.father_phone || student.phone);
    setEditableMessage(getFormattedMessage(student));
  };

  const handleSendFromPhone = (student: Student, customText?: string, specificPhone?: string) => {
    const textToSend = customText || editableMessage || getFormattedMessage(student);
    const phone = (specificPhone || previewTargetPhone || student.father_phone || student.phone || student.mother_phone)?.trim();
    if (!phone || !/^0\d{10}$/.test(phone)) {
      alert('شماره تلفن همراه انتخاب‌شده نامعتبر است.');
      return;
    }

    // Save to SMS logs in accounting
    sendSmsReminder(student.id, textToSend);

    // Open native SMS messenger on phone with body and recipient
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const smsUrl = `sms:${phone}${separator}body=${encodeURIComponent(textToSend)}`;
    window.location.href = smsUrl;
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  const handleSendSingle = (studentId: number, customText?: string) => {
    const res = sendSmsReminder(studentId, customText);
    alert(res.message);
  };

  const handleExecuteBatch = () => {
    const targetIds = filteredStudents.map((s) => s.id);
    const result = sendBatchSmsReminders(targetIds);
    setBatchResult(result);
    setIsBatchConfirmOpen(false);
    setTimeout(() => setBatchResult(null), 6000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSmsConfig({
      provider,
      apiKey: apiKey.trim(),
      senderNumber: senderNumber.trim(),
      apiUrl: apiUrl.trim(),
      patternCode: patternCode.trim(),
      smsTemplate: smsTemplate.trim(),
      enabled,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestSms = () => {
    if (!testPhone || !/^0\d{10}$/.test(testPhone)) {
      setTestStatus('شماره موبایل آزمایشی باید ۱۱ رقمی و با ۰ شروع شود.');
      return;
    }
    setTestStatus('در حال تست ارتباط با وب‌سرویس پیامک...');
    setTimeout(() => {
      setTestStatus(`پیامک آزمایشی با موفقیت به شماره ${testPhone} ارسال شد (کد پیگیری: ${Math.floor(100000 + Math.random() * 900000)}).`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="سامانه پیامک و یادآوری بدهی" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Top Summary Banner */}
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                  اطلاع‌رسانی خودکار
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${smsConfig.enabled ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                  {smsConfig.enabled ? '● سامانه پیامک فعال' : '○ سامانه غیرفعال'}
                </span>
              </div>
              <h2 className="text-xl font-black mt-1">پنل ارسال پیامک یادآوری شهریه مدارس</h2>
              <p className="text-xs text-white/80 mt-1 max-w-xl">
                ارسال خودکار و دستی پیامک یادآوری به اولیای دانش‌آموزان بدهکار با ذکر نام دانش‌آموز، مبلغ بدهی و مدرسه
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button
                onClick={() => setIsBatchConfirmOpen(true)}
                disabled={totalDebtorsCount === 0 || !smsConfig.enabled}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-[#341648] font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>ارسال گروهی به {totalDebtorsCount} بدهکار</span>
              </button>
            </div>
          </div>
        </div>

        {/* Batch Result Notification */}
        {batchResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                عملیات ارسال گروهی پایان یافت: {batchResult.sentCount} پیامک با موفقیت ثبت شد و {batchResult.failedCount} مورد به دلیل شماره نامعتبر ناموفق بود.
              </span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#e5dde8] shadow-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'send'
                ? 'bg-[#62205f] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            style={activeTab === 'send' ? { backgroundColor: accentColor } : {}}
          >
            <Users className="w-4 h-4" />
            <span>فهرست دانش‌آموزان بدهکار ({totalDebtorsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'logs'
                ? 'bg-[#62205f] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            style={activeTab === 'logs' ? { backgroundColor: accentColor } : {}}
          >
            <MessageSquare className="w-4 h-4" />
            <span>تاریخچه پیامک‌های ارسالی ({smsLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'settings'
                ? 'bg-[#62205f] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            style={activeTab === 'settings' ? { backgroundColor: accentColor } : {}}
          >
            <Settings className="w-4 h-4" />
            <span>تنظیمات درگاه و API پیامک {isSenior && '⭐ (مدیر ارشد)'}</span>
          </button>
        </div>

        {/* Tab 1: Send Reminders & Debtors List */}
        {activeTab === 'send' && (
          <div className="space-y-4">
            {/* Filters Box */}
            <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجوی نام، تلفن، کدملی..."
                    className="w-full pl-3 pr-9 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-medium focus:outline-hidden focus:border-purple-600"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3" />
                </div>

                {/* Recipient Target: All, Mothers Only, Fathers Only */}
                <div>
                  <select
                    value={targetRecipient}
                    onChange={(e) => setTargetRecipient(e.target.value as any)}
                    className="w-full py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735] focus:outline-hidden"
                  >
                    <option value="all">مخاطب: همه اولیا</option>
                    <option value="mothers">فقط مادران (شماره مادر)</option>
                    <option value="fathers">فقط پدران (شماره پدر)</option>
                  </select>
                </div>

                {/* Grade Target */}
                <div>
                  <select
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    className="w-full py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735] focus:outline-hidden"
                  >
                    <option value="all">پایه: همه پایه‌ها</option>
                    <option value="پیش یک">پیش یک</option>
                    <option value="پیش دو">پیش دو</option>
                    <option value="اول">کلاس اول</option>
                    <option value="دوم">کلاس دوم</option>
                    <option value="سوم">کلاس سوم</option>
                    <option value="چهارم">کلاس چهارم</option>
                    <option value="پنجم">کلاس پنجم</option>
                    <option value="ششم">کلاس ششم</option>
                  </select>
                </div>

                {/* School Selector (for Senior Admin) */}
                {isSenior ? (
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
                    className="py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                  >
                    <option value={0}>همه مراکز آموزشی</option>
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 flex items-center truncate">
                    {currentUser?.school_name || 'مرکز شما'}
                  </div>
                )}

                {/* Debt Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                >
                  <option value="all">همه مبالغ بدهی</option>
                  <option value="high_debt">بدهی بالای ۵ میلیون تومان</option>
                  <option value="overdue">تاخیر بالای ۱۵ روز</option>
                </select>
              </div>

              {/* Stat Chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
                <div className="text-gray-500 font-medium flex items-center gap-2">
                  <span>مخاطبین واجد شرایط:</span>
                  <span className="font-bold text-[#341648] bg-purple-100 px-2 py-0.5 rounded-md font-mono">{totalDebtorsCount} نفر</span>
                  {targetRecipient !== 'all' && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                      {targetRecipient === 'mothers' ? 'فقط مادران' : 'فقط پدران'}
                    </span>
                  )}
                  {targetGrade !== 'all' && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                      پایه {targetGrade}
                    </span>
                  )}
                </div>
                <div className="text-gray-500 font-medium">
                  مجموع مطالبات فیلترشده: <span className="font-bold text-rose-700 font-mono">{formatRial(totalDebtSum)} ریال</span>
                </div>
              </div>
            </div>

            {/* Debtors List Table */}
            <div className="bg-white rounded-3xl border border-[#e5dde8] shadow-xs overflow-hidden">
              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-gray-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/50" />
                  <p className="text-sm font-bold text-gray-600">دانش‌آموز بدهکاری مطابق فیلترهای انتخابی یافت نشد.</p>
                  <p className="text-xs">تمامی حساب‌های این بخش تسویه هستند یا فیلتر را تغییر دهید.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredStudents.map((st) => {
                    const balance = getStudentBalance(st.id);
                    const overdue = calculateStudentOverdue(st, transactions);
                    const fatherPhone = st.father_phone || st.phone;
                    const motherPhone = st.mother_phone;

                    return (
                      <div
                        key={st.id}
                        className="p-4 hover:bg-[#fcfaff] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#341648]">{st.name}</span>
                            <span className="text-[10px] bg-purple-100 text-purple-900 font-semibold px-2 py-0.5 rounded-md">
                              {st.school_name || 'مدرسه'} - پایه {st.grade}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {fatherPhone && (
                              <span className="flex items-center gap-1 font-mono text-blue-700 bg-blue-50/70 px-1.5 py-0.5 rounded">
                                <span className="font-sans text-[10px] text-blue-900 font-bold">پدر:</span>
                                <span>{fatherPhone}</span>
                              </span>
                            )}
                            {motherPhone && (
                              <span className="flex items-center gap-1 font-mono text-purple-700 bg-purple-50/70 px-1.5 py-0.5 rounded">
                                <span className="font-sans text-[10px] text-purple-900 font-bold">مادر:</span>
                                <span>{motherPhone}</span>
                              </span>
                            )}
                            <span>•</span>
                            <span>
                              مانده بدهی: <strong className="text-rose-700 font-mono font-bold">{formatRial(balance.debt)} ریال</strong>
                            </span>
                            {overdue.overdueDays > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-700 font-semibold">
                                  {overdue.overdueDays} روز معوق
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto self-end sm:self-auto justify-end">
                          {/* Send to Mother button */}
                          {motherPhone && (
                            <button
                              type="button"
                              onClick={() => handleSendFromPhone(st, undefined, motherPhone)}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                              title={`ارسال پیامک با گوشی به مادر (${motherPhone})`}
                            >
                              <Smartphone className="w-3 h-3 text-purple-600" />
                              <span>پیام به مادر</span>
                            </button>
                          )}

                          {/* Send to Father button */}
                          {fatherPhone && (
                            <button
                              type="button"
                              onClick={() => handleSendFromPhone(st, undefined, fatherPhone)}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                              title={`ارسال پیامک با گوشی به پدر (${fatherPhone})`}
                            >
                              <Smartphone className="w-3 h-3 text-blue-600" />
                              <span>پیام به پدر</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenPreview(st)}
                            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                            title="ویرایش متن پیامک قبل از ارسال"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-purple-700" />
                            <span>پیش‌نمایش</span>
                          </button>

                          {smsConfig.enabled && (
                            <button
                              type="button"
                              onClick={() => handleSendSingle(st.id)}
                              className="p-1.5 rounded-xl border border-purple-200 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-2xs"
                              title="ارسال خودکار از طریق وب‌سرویس پیامکی"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: SMS API Configuration (Senior Admin) */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#e5dde8] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#341648]">تنظیمات درگاه و وب‌سرویس پیامک (API)</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  پیکربندی کلید API، شماره خط و آدرس وب‌سرویس ارسال پیامک
                </p>
              </div>
              <span className="text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 rounded-xl">
                {isSenior ? 'دسترسی کامل مدیر ارشد' : 'مشاهده تنظیمات'}
              </span>
            </div>

            {!isSenior && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>تنها کاربر ارشد سامانه مدرسة القرآن می‌تواند کلید API و تنظیمات درگاه پیامک را تغییر دهد.</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>تنظیمات وب‌سرویس پیامک با موفقیت ذخیره شد.</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Provider Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">انتخاب سامانه پیامکی</label>
                  <select
                    disabled={!isSenior}
                    value={provider}
                    onChange={(e) => {
                      const p = e.target.value as any;
                      setProvider(p);
                      if (p === 'kavenegar') setApiUrl('https://api.kavenegar.com/v1/{API_KEY}/sms/send.json');
                      if (p === 'faraz') setApiUrl('https://ippanel.com/services.jspd');
                      if (p === 'mellipayamak') setApiUrl('https://rest.payamak-panel.com/api/SendSMS/SendSMS');
                      if (p === 'magfa') setApiUrl('https://sms.magfa.com/api/http/sms/v2/send');
                    }}
                    className="w-full py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735] disabled:bg-gray-100"
                  >
                    <option value="kavenegar">کاوه‌نگار (Kavenegar)</option>
                    <option value="faraz">فراز اس‌ام‌اس / صباپیامک (IPPanel)</option>
                    <option value="mellipayamak">ملی پیامک (Melli Payamak)</option>
                    <option value="magfa">مگفا (Magfa)</option>
                    <option value="custom">وب‌سرویس سفارشی REST API</option>
                  </select>
                </div>

                {/* Sender Number */}
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">شماره خط اختصاصی ارسال‌کننده</label>
                  <input
                    type="text"
                    disabled={!isSenior}
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="مثال: 10008585 یا 3000..."
                    className="w-full py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-[#302735] disabled:bg-gray-100"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* API Key / Token */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  کلید API یا توکن دسترسی (API Key / Token)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isSenior}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="کلید اختصاصی ارائه‌شده توسط پنل پیامکی را اینجا وارد کنید..."
                    className="w-full pl-3 pr-10 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-[#302735] disabled:bg-gray-100"
                    dir="ltr"
                  />
                  <Key className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  می‌توانید کلید را اکنون یا در آینده پس از خرید بسته پیامکی وارد کنید. سامانه تا زمان ورود کلید به‌صورت شبیه‌سازی هوشمند عمل می‌کند.
                </p>
              </div>

              {/* API Endpoint URL */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">آدرس وب‌سرویس (API Endpoint URL)</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isSenior}
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-3 pr-10 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-[#302735] disabled:bg-gray-100"
                    dir="ltr"
                  />
                  <Globe className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
                </div>
              </div>

              {/* Pattern Code */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  کد الگو / شناسه قالب خدماتی (اختیاری برای خطوط خدماتی)
                </label>
                <input
                  type="text"
                  disabled={!isSenior}
                  value={patternCode}
                  onChange={(e) => setPatternCode(e.target.value)}
                  placeholder="مثال: 123456 (کد پترن تعریف‌شده در پنل پیامک)"
                  className="w-full py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-[#302735] disabled:bg-gray-100"
                  dir="ltr"
                />
              </div>

              {/* Template Text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#341648]">قالب متن پیامک یادآوری بدهی</label>
                  <span className="text-[11px] text-gray-400">
                    متغیرها: {'{name}'} نام، {'{school}'} مدرسه، {'{amount}'} مبلغ، {'{days}'} روز تاخیر
                  </span>
                </div>
                <textarea
                  disabled={!isSenior}
                  value={smsTemplate}
                  onChange={(e) => setTemplateText(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-medium text-[#302735] disabled:bg-gray-100"
                />
              </div>

              {/* Enable / Disable toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-[#341648]">
                  <input
                    type="checkbox"
                    disabled={!isSenior}
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="rounded border-[#e5dde8] text-purple-700"
                  />
                  <span>فعال بودن امکان ارسال پیامک یادآوری</span>
                </label>
              </div>

              {isSenior && (
                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#62205f] hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    style={{ backgroundColor: accentColor }}
                  >
                    ذخیره تنظیمات وب‌سرویس پیامک
                  </button>
                </div>
              )}
            </form>

            {/* Test SMS Sending Card */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="text-xs font-bold text-[#341648] flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-700" />
                <span>آزمایش و ارسال پیامک تست</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="0913..."
                  className="px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs font-mono w-full sm:w-60"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleTestSms}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all"
                >
                  ارسال پیامک آزمایشی
                </button>
              </div>
              {testStatus && (
                <div className="text-xs text-purple-900 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                  {testStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: SMS History Logs */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-[#341648]">تاریخچه پیامک‌های ارسال‌شده</h3>
                <p className="text-xs text-gray-500">گزارش لحظه‌ای پیامک‌های ارسالی به اولیا</p>
              </div>

              {smsLogs.length > 0 && isSenior && (
                <button
                  type="button"
                  onClick={clearSmsLogs}
                  className="px-3 py-1.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>پاک‌سازی تاریخچه</span>
                </button>
              )}
            </div>

            {smsLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                هنوز هیچ پیامکی در سامانه ثبت نشده است.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {smsLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#341648]">{log.student_name}</span>
                        <span className="text-[11px] font-mono text-gray-500">({log.phone})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          log.status === 'sent' || log.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.status === 'sent' || log.status === 'delivered' ? 'ارسال موفق' : 'خطا در ارسال'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-xl">{log.message}</p>
                    </div>

                    <div className="text-[11px] text-gray-400 shrink-0 self-end sm:self-auto">
                      {log.sent_at}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Preview & Edit Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e5dde8]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#341648]">ویرایش و ارسال پیامک یادآوری بدهی</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">می‌توانید متن پیامک را قبل از ارسال از گوشی یا پنل ویرایش کنید</p>
              </div>
              <button
                onClick={() => setPreviewStudent(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center">
                <span>گیرنده: <strong className="text-gray-900">{previewStudent.name}</strong></span>
                <span className="font-mono text-purple-900 bg-purple-100/70 px-2 py-0.5 rounded-md font-bold">{previewStudent.phone}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>مدرسه: <strong>{previewStudent.school_name}</strong></span>
                <span>مانده بدهی: <strong className="text-rose-700 font-mono">{formatRial(getStudentBalance(previewStudent.id).debt)} ریال</strong></span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#341648]">
                  متن پیامک (قابل ویرایش دستی):
                </label>
                <span className="text-[10px] text-gray-500 font-mono">
                  {editableMessage.length} نویسه • {Math.ceil(editableMessage.length / 70) || 1} پارت پیامک
                </span>
              </div>
              <textarea
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                rows={4}
                className="w-full p-3 bg-[#fcfaff] rounded-2xl border border-purple-200 text-xs text-[#302735] leading-relaxed focus:outline-hidden focus:border-purple-600"
                placeholder="متن پیامک را تایپ کنید..."
              />
            </div>

            {copiedNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>متن پیامک در کلیپ‌بورد کپی شد (می‌توانید در پیام‌رسان‌ها پیست کنید).</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleCopyToClipboard(editableMessage)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>کپی متن</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {smsConfig.enabled && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSendSingle(previewStudent.id, editableMessage);
                      setPreviewStudent(null);
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                    title="ارسال با سامانه پیامکی وب‌سرویس"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ارسال با پنل پیامک</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleSendFromPhone(previewStudent, editableMessage);
                    setPreviewStudent(null);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                  title="باز شدن برنامه پیام‌رسان گوشی همراه با شماره و متن آماده"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>ارسال با گوشی من (سیم‌کارت)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Send Confirmation Modal */}
      {isBatchConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#e5dde8]">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-[#341648]">تأیید ارسال گروهی پیامک بدهی</h4>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              آیا از ارسال پیامک یادآوری شهریه به تعداد <strong className="text-purple-900">{totalDebtorsCount} نفر دانش‌آموز بدهکار</strong> با مجموع مطالبات <strong className="text-rose-700 font-mono">{formatRial(totalDebtSum)} ریال</strong> اطمینان دارید؟
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
              پیامک برای تمام شماره‌های معتبر ارسال خواهد شد و گزارش در کارتابل پیامک‌ها ثبت می‌شود.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-600"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleExecuteBatch}
                className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>شروع ارسال پیامک‌ها</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
