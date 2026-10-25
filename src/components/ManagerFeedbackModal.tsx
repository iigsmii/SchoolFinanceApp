import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { FeedbackType, FeedbackPriority, ManagerFeedback } from '../types';
import { PersianVoiceTypingButton } from './PersianVoiceTypingButton';
import { compressReceiptImage } from '../utils/imageCompressor';
import { playSuccessSound, playClickSound } from '../utils/soundEffects';
import {
  X,
  Send,
  MessageSquare,
  Bug,
  Lightbulb,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  Copy,
  Clock,
  Check,
  AlertTriangle,
  Upload,
  Camera,
  Trash2,
  Shield,
  Smartphone,
  ChevronLeft,
} from 'lucide-react';

interface ManagerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'new' | 'history';
}

const CATEGORIES: {
  type: FeedbackType;
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  desc: string;
}[] = [
  {
    type: 'bug',
    label: 'گزارش باگ و خطا',
    icon: Bug,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: 'مشکل فنی، عملکرد نادرست یا خطای نرم‌افزاری',
  },
  {
    type: 'suggestion',
    label: 'پیشنهاد و ایده جدید',
    icon: Lightbulb,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: 'پیشنهاد قابلیت جدید یا بهبود بخش‌های فعلی',
  },
  {
    type: 'criticism',
    label: 'انتقاد و نظر سازنده',
    icon: MessageCircle,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    desc: 'انتقاد از روندها، فرم‌ها و تجربه کاربری',
  },
  {
    type: 'question',
    label: 'سوال و استعلام مالی',
    icon: HelpCircle,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    desc: 'پرسش درباره سرفصل‌ها یا قوانین حسابداری',
  },
];

const QUICK_TOPICS: Record<FeedbackType, string[]> = {
  bug: ['مشکل در ذخیره‌سازی اطلاعات', 'عدم انطباق شماره فیش بانکی', 'خطا در بارگذاری تصویر فاکتور', 'کندی در همگام‌سازی'],
  suggestion: ['افزودن خروجی اکسل به تفکیک پایه', 'پیشنهاد ارسال خودکار پیامک بدهی', 'امکان تعریف سرفصل جدید هزینه', 'پیشنهاد چاپ دو فاکتور در یک صفحه'],
  criticism: ['پیچیدگی مراحل تسویه چک', 'طولانی بودن فرم ثبت اولیه دانش‌آموز', 'نیاز به شفافیت بیشتر در گزارش‌ها'],
  question: ['نحوه ثبت برگشت چک صیادی', 'نحوه انتساب تراکنش‌های نامشخص پوز', 'نحوه انتقال مانده تن‌خواه'],
};

export const ManagerFeedbackModal: React.FC<ManagerFeedbackModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'new',
}) => {
  const { currentUser, accentColor, addFeedback, feedbacks } = useApp();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>(defaultTab);

  // Form State
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('normal');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Thank-you modal state
  const [submittedFeedback, setSubmittedFeedback] = useState<ManagerFeedback | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter feedback for current user (senior sees all, manager sees their own)
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const myFeedbacks = feedbacks.filter((f) => isSenior || f.user_id === currentUser?.id);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressing(true);
      const compressed = await compressReceiptImage(file);
      setAttachmentUrl(compressed.dataUrl);
    } catch (err) {
      console.error('Image compression failed', err);
      alert('خطا در بارگذاری تصویر. لطفاً تصویر دیگری انتخاب کنید.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('لطفاً عنوان یا موضوع پیام را وارد کنید.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('لطفاً شرح و توضیحات پیام خود را وارد نمایید.');
      return;
    }

    const deviceInfo = typeof navigator !== 'undefined'
      ? `${navigator.userAgent.includes('Android') ? 'نسخه اندروید' : 'نسخه وب'} · v2.16.0`
      : 'نسخه ۲.۱۶.۰';

    const created = addFeedback({
      type,
      title: title.trim(),
      description: description.trim(),
      priority,
      user_id: currentUser?.id || 0,
      user_name: currentUser?.name || 'مدیر مدرسه',
      school_id: currentUser?.school_id || 1,
      school_name: currentUser?.school_name || 'مرکز آموزشی مدرسة القرآن',
      attachment_url: attachmentUrl || undefined,
      device_info: deviceInfo,
    });

    playSuccessSound();
    setSubmittedFeedback(created);
    // Reset form
    setTitle('');
    setDescription('');
    setAttachmentUrl('');
    setPriority('normal');
  };

  const handleCopyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const getPriorityBadge = (p: FeedbackPriority) => {
    switch (p) {
      case 'urgent':
        return <span className="text-xs font-bold text-rose-700">فوری و بحرانی</span>;
      case 'important':
        return <span className="text-xs font-semibold text-amber-700">مهم</span>;
      default:
        return <span className="text-xs text-gray-500">عادی</span>;
    }
  };

  const getStatusBadge = (s: ManagerFeedback['status']) => {
    switch (s) {
      case 'resolved':
        return <span className="text-xs font-bold text-emerald-700">✅ انجام و بررسی شد</span>;
      case 'in_progress':
        return <span className="text-xs font-bold text-blue-700">🛠️ در حال رسیدگی</span>;
      case 'acknowledged':
        return <span className="text-xs font-semibold text-purple-700">👁️ مشاهده توسط مدیریت</span>;
      default:
        return <span className="text-xs text-amber-700">⏳ در انتظار بررسی</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#e5dde8] max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#e5dde8] flex items-center justify-between bg-gradient-to-l from-purple-50/50 to-white">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#341648]">ارسال انتقادات و پیشنهادات</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                ارسال باگ‌ها، پیشنهادات و انتقادات به مدیریت مجموعه جهت ارتقای عملکرد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#e5dde8] px-5 pt-2 bg-gray-50/60">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('new');
            }}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'new'
                ? 'border-[#62205f] text-[#62205f]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>ثبت پیام جدید</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('history');
            }}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#62205f] text-[#62205f]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>پیام‌های ارسالی من</span>
            {myFeedbacks.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full font-mono">
                {myFeedbacks.length}
              </span>
            )}
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Submission Success Notice (Thank-You Acknowledgment) */}
          {submittedFeedback && (
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/90 text-emerald-950 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="text-sm font-black text-emerald-900">
                    همکار گرامی جناب {submittedFeedback.user_name}؛ با تشکر از همراهی شما!
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800">
                    پیام شما در قالب <b>{CATEGORIES.find((c) => c.type === submittedFeedback.type)?.label}</b> با موفقیت دریافت و در کارتابل بررسی مدیریت مجموعه قرار گرفت. از دقت نظر، مسئولیت‌پذیری و پیشنهادات سازنده شما در پیشرفت سیستم و بهبود امور صمیمانه سپاسگزاریم.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-700">کد پیگیری اختصاصی:</span>
                  <span className="font-mono font-black text-emerald-950 px-2 py-1 bg-white rounded-lg border border-emerald-200">
                    {submittedFeedback.tracking_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyTrackingCode(submittedFeedback.tracking_code)}
                    className="p-1 text-emerald-700 hover:text-emerald-900"
                    title="کپی کد پیگیری"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedFeedback(null);
                      setActiveTab('history');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs"
                  >
                    مشاهده سوابق و پاسخ‌ها
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmittedFeedback(null)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-semibold text-xs hover:bg-emerald-100 transition-colors"
                  >
                    ثبت پیام دیگر
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'new' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Category Selection */}
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-2">
                  نوع پیام را انتخاب کنید: <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = type === cat.type;
                    return (
                      <button
                        key={cat.type}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setType(cat.type);
                        }}
                        className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col justify-between min-h-[76px] ${
                          isSelected
                            ? `${cat.bg} ${cat.border} ring-2 ring-[#62205f]/20 shadow-2xs`
                            : 'bg-white border-[#e5dde8] hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Icon className={`w-4 h-4 ${cat.color}`} />
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#62205f]" />}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isSelected ? 'text-[#341648]' : 'text-gray-700'}`}>
                            {cat.label}
                          </div>
                          <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{cat.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Topic Chips */}
              <div>
                <span className="text-[11px] text-gray-500 font-semibold mb-1.5 block">موضوعات پیشنهادی سریع:</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TOPICS[type].map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        setTitle(topic);
                        if (!description) {
                          setDescription(`در خصوص «${topic}»: `);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-50 hover:text-purple-900 border border-gray-200/80 text-[11px] text-gray-700 transition-colors"
                    >
                      + {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Title & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    موضوع یا عنوان خلاصه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: مشکل در تفکیک ارقام یا ایده چاپ صورتحساب"
                    className="w-full px-3.5 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs sm:text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">سطح فوریت</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as FeedbackPriority)}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-semibold text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                  >
                    <option value="normal">عادی (Normal)</option>
                    <option value="important">مهم (Important)</option>
                    <option value="urgent">فوری و بحرانی (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* 3. Description with Voice Typing */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#341648]">
                    شرح کامل پیام، باگ یا پیشنهاد <span className="text-rose-500">*</span>
                  </label>
                  <PersianVoiceTypingButton
                    onTranscript={(voiceText) =>
                      setDescription((prev) => (prev ? `${prev} ${voiceText}` : voiceText))
                    }
                  />
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="جزئیات دقیق باگ، پیام خطا یا ایده و پیشنهادتان را با دقت بنویسید (یا از دکمه تایپ صوتی بالا استفاده کنید)..."
                  className="w-full p-3.5 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-xs sm:text-sm text-[#302735] leading-relaxed focus:outline-hidden focus:border-[#62205f] resize-none"
                />
              </div>

              {/* 4. Optional Screenshot Upload */}
              <div className="p-3 bg-purple-50/40 rounded-2xl border border-purple-100/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-700" />
                    <span>پیوست تصویر یا اسکرین‌شات از صفحه خطا (اختیاری):</span>
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="feedback-image-input"
                  />
                  <label
                    htmlFor="feedback-image-input"
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-[#62205f] border border-purple-200 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{attachmentUrl ? 'تغییر تصویر' : 'انتخاب تصویر'}</span>
                  </label>
                </div>

                {isCompressing && (
                  <div className="text-[11px] text-purple-700 font-semibold animate-pulse">
                    در حال پردازش و فشرده‌سازی تصویر...
                  </div>
                )}

                {attachmentUrl && (
                  <div className="relative inline-block mt-2">
                    <img
                      src={attachmentUrl}
                      alt="پیوست بازخورد"
                      className="w-28 h-20 object-cover rounded-xl border border-purple-200 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl('')}
                      className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
                      title="حذف تصویر"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* 5. Sender & System Info Badge */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-500 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-gray-400" />
                  <span>فرستنده: <b>{currentUser?.name || 'مدیر'}</b></span>
                  <span>·</span>
                  <span>واحد: <b>{currentUser?.school_name || 'مدرسه'}</b></span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-gray-400">
                  <Smartphone className="w-3 h-3" />
                  <span>نسخه v2.16.0</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: accentColor }}
                >
                  <Send className="w-4 h-4" />
                  <span>ارسال قطعی پیام</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-xs font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {myFeedbacks.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-2">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
                  <div className="text-xs font-bold text-gray-600">هنوز پیامی ارسال نکرده‌اید</div>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    می‌توانید با استفاده از زبانه «ثبت پیام جدید»، باگ‌ها یا ایده‌های خود را برای مدیریت ارسال فرمایید.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs transition-colors"
                  >
                    ثبت اولین پیام
                  </button>
                </div>
              ) : (
                myFeedbacks.map((item) => {
                  const cat = CATEGORIES.find((c) => c.type === item.type);
                  const Icon = cat?.icon || MessageSquare;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white border border-[#e5dde8] hover:border-purple-300 transition-all space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${cat?.bg || 'bg-gray-100'}`}>
                            <Icon className={`w-3.5 h-3.5 ${cat?.color || 'text-gray-600'}`} />
                          </div>
                          <span className="text-xs font-bold text-[#341648]">{item.title}</span>
                          <span className="text-[10px] text-gray-400 font-mono">({item.tracking_code})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(item.priority)}
                          <span>·</span>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {item.description}
                      </p>

                      {item.attachment_url && (
                        <div className="pt-1">
                          <img
                            src={item.attachment_url}
                            alt="پیوست"
                            className="w-24 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                        <span>تاریخ ارسال: {item.created_at_jalali}</span>
                        <span>{item.school_name}</span>
                      </div>

                      {/* Management Reply Box */}
                      {item.senior_reply && (
                        <div className="mt-2 p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-xs space-y-1">
                          <div className="font-bold text-purple-950 flex items-center justify-between">
                            <span>✍️ پاسخ مدیریت مجموعه:</span>
                            {item.senior_reply_at && (
                              <span className="text-[10px] font-normal text-purple-700">{item.senior_reply_at}</span>
                            )}
                          </div>
                          <p className="text-purple-900 leading-relaxed whitespace-pre-wrap font-medium">
                            {item.senior_reply}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
