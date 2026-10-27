import React, { useState, useMemo, useDeferredValue } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { FeedbackType, FeedbackStatus, ManagerFeedback } from '../../types';
import { playClickSound, playSuccessSound } from '../../utils/soundEffects';
import { matchTokens } from '../../utils/studentSearch';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  MessageCircle,
  HelpCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Reply,
  Check,
  Send,
  AlertTriangle,
  Building,
  User,
  Smartphone,
  Eye,
  ExternalLink,
} from 'lucide-react';

export const FeedbackScreen: React.FC = () => {
  const { feedbacks, updateFeedbackStatus, deleteFeedback, accentColor, currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [selectedType, setSelectedType] = useState<FeedbackType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus | 'all'>('all');

  // Replying state
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (deferredQuery.trim()) {
        const combined = [
          item.title,
          item.description,
          item.user_name,
          item.school_name,
          item.tracking_code,
        ]
          .filter(Boolean)
          .join(' ');
        return matchTokens(combined, deferredQuery);
      }
      return true;
    });
  }, [feedbacks, selectedType, selectedStatus, deferredQuery]);

  const pendingCount = useMemo(() => {
    return feedbacks.filter((f) => f.status === 'pending').length;
  }, [feedbacks]);

  const handleSendReply = (id: string) => {
    if (!replyText.trim()) return;
    updateFeedbackStatus(id, 'resolved', replyText.trim());
    playSuccessSound();
    setReplyingId(null);
    setReplyText('');
  };

  const getTypeInfo = (type: FeedbackType) => {
    switch (type) {
      case 'bug':
        return { label: 'گزارش باگ', icon: Bug, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' };
      case 'suggestion':
        return { label: 'پیشنهاد', icon: Lightbulb, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
      case 'criticism':
        return { label: 'انتقاد', icon: MessageCircle, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' };
      default:
        return { label: 'سوال', icon: HelpCircle, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' };
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16">
      <Header title="صندوق بازخورد و باگ‌های مدیران" />

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Top Summary Banner */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#341648]">صندوق پیشنهادات و گزارش باگ مدیران مدارس</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                نظرات، باگ‌ها و پیام‌های ارسالی همکاران برای مدیریت مجموعه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-900">
              کل پیام‌ها: <span className="font-mono">{feedbacks.length}</span>
            </div>
            {pendingCount > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
                در انتظار بررسی: <span className="font-mono">{pendingCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#e5dde8] shadow-2xs space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس عنوان، متن پیام، نام مدیر، نام مدرسه یا کد پیگیری..."
              className="w-full pl-4 pr-10 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs sm:text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 text-xs">
            <span className="text-gray-500 font-semibold ml-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>فیلتر نوع:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedType === 'all'
                  ? 'bg-[#62205f] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              همه انواع
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('bug')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedType === 'bug'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              باگ‌ها
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('suggestion')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedType === 'suggestion'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              پیشنهادات
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('criticism')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedType === 'criticism'
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              انتقادات
            </button>

            <span className="text-gray-300 mx-1">|</span>

            <span className="text-gray-500 font-semibold ml-1">وضعیت:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-2 py-1 bg-[#fdfcfd] rounded-lg border border-[#e5dde8] text-xs font-semibold text-[#302735]"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="pending">در انتظار بررسی</option>
              <option value="in_progress">در حال رسیدگی</option>
              <option value="resolved">بررسی و حل‌شده</option>
            </select>
          </div>
        </div>

        {/* Feedbacks List */}
        <div className="space-y-3">
          {filteredFeedbacks.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#e5dde8] space-y-2">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
              <div className="text-sm font-bold text-gray-600">پیامی با این فیلترها یافت نشد</div>
              <p className="text-xs text-gray-400">
                پیام‌های جدید مدیران مدارس پس از ارسال مستقیماً در این بخش قرار می‌گیرند.
              </p>
            </div>
          ) : (
            filteredFeedbacks.map((item) => {
              const typeInfo = getTypeInfo(item.type);
              const TypeIcon = typeInfo.icon;
              const isReplying = replyingId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] hover:border-purple-300 transition-all shadow-xs space-y-3"
                >
                  {/* Row 1: Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${typeInfo.bg}`}>
                        <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#341648] flex items-center gap-2">
                          <span>{item.title}</span>
                          <span className="font-mono text-xs text-gray-400 font-normal">
                            ({item.tracking_code})
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                          <span>ارسال از: <b>{item.user_name}</b></span>
                          <span>·</span>
                          <span>{item.school_name}</span>
                          <span>·</span>
                          <span>تاریخ: {item.created_at_jalali}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">
                          فوری
                        </span>
                      )}
                      {item.priority === 'important' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                          مهم
                        </span>
                      )}

                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          item.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {item.status === 'resolved'
                          ? '✅ انجام شد'
                          : item.status === 'in_progress'
                          ? '🛠️ در حال رسیدگی'
                          : '⏳ در انتظار بررسی'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Description */}
                  <p className="text-xs sm:text-sm text-[#302735] leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>

                  {/* Attachment if present */}
                  {item.attachment_url && (
                    <div className="pt-1">
                      <a
                        href={item.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block relative group"
                      >
                        <img
                          src={item.attachment_url}
                          alt="پیوست پیام"
                          className="w-36 h-24 object-cover rounded-xl border border-gray-200 shadow-2xs group-hover:opacity-90 transition-opacity"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>بزرگنمایی</span>
                        </span>
                      </a>
                    </div>
                  )}

                  {/* Device Info */}
                  {item.device_info && (
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      <span>دستگاه فرستنده: {item.device_info}</span>
                    </div>
                  )}

                  {/* Senior Reply if exists */}
                  {item.senior_reply && !isReplying && (
                    <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs space-y-1">
                      <div className="font-bold text-purple-950 flex items-center justify-between">
                        <span>✍️ پاسخ مکتوب مدیریت مجموعه:</span>
                        {item.senior_reply_at && (
                          <span className="text-[10px] text-purple-700 font-normal">{item.senior_reply_at}</span>
                        )}
                      </div>
                      <p className="text-purple-900 leading-relaxed font-medium whitespace-pre-wrap">
                        {item.senior_reply}
                      </p>
                    </div>
                  )}

                  {/* Reply Form */}
                  {isReplying && (
                    <div className="p-3.5 bg-gray-50 border border-purple-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                      <label className="block text-xs font-bold text-[#341648]">
                        پاسخ به مدیر ({item.user_name} - {item.school_name}):
                      </label>
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="متن پاسخ و دستور پیگیری شما برای این مدیر..."
                        className="w-full p-3 bg-white rounded-xl border border-gray-300 text-xs text-[#302735] focus:outline-hidden focus:border-[#62205f] resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendReply(item.id)}
                          className="py-2 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>ثبت پاسخ و تغییر وضعیت به حل‌شده</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingId(null);
                            setReplyText('');
                          }}
                          className="py-2 px-3 rounded-xl bg-gray-200 text-gray-700 text-xs font-semibold"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!isReplying && (
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setReplyingId(item.id);
                            setReplyText(item.senior_reply || '');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          <span>{item.senior_reply ? 'ویرایش پاسخ' : 'پاسخ به مدیر'}</span>
                        </button>
                      )}

                      {item.status !== 'in_progress' && item.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => updateFeedbackStatus(item.id, 'in_progress')}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition-colors"
                        >
                          علامت‌گذاری در حال رسیدگی
                        </button>
                      )}

                      {item.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => updateFeedbackStatus(item.id, 'resolved')}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>تایید و رفع شد</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('آیا این بازخورد حذف شود؟')) {
                          deleteFeedback(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="حذف بازخورد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
