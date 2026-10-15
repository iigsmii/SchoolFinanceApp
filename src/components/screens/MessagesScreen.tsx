import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { jalaliFromGregorian } from '../../utils/jalali';
import { Megaphone, Send, Trash2 } from 'lucide-react';

export const MessagesScreen: React.FC = () => {
  const { seniorMessages, addSeniorMessage, deleteSeniorMessage, currentUser, accentColor } = useApp();
  const [text, setText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addSeniorMessage(text.trim());
    setText('');
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="پیام به مدیران مدارس" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Send message form */}
        <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#341648]">
            <Megaphone className="w-5 h-5 text-[#62205f]" style={{ color: accentColor }} />
            <span>ارسال اطلاعیه عمومی برای همه مدیران مدارس:</span>
          </div>

          <form onSubmit={handleSend} className="space-y-3">
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="متن پیام، بخشنامه یا یادآوری مالی را اینجا بنویسید..."
              className="w-full p-4 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f] resize-none"
            />

            <button
              type="submit"
              className="py-3 px-6 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              <Send className="w-4 h-4" />
              ارسال و نمایش در داشبورد همه مدیران
            </button>
          </form>
        </div>

        {/* Existing Messages */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold">
            اطلاعیه‌های فعال ({seniorMessages.length} پیام):
          </div>

          {seniorMessages.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              پیامی ثبت نشده است.
            </div>
          ) : (
            seniorMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs flex justify-between items-start gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-[#302735] leading-relaxed">
                    📢 {msg.message}
                  </p>
                  <div className="text-xs text-gray-400 mt-2 flex gap-4">
                    <span>فرستنده: {msg.author_name}</span>
                    <span>تاریخ: {jalaliFromGregorian(msg.created_at)}</span>
                  </div>
                </div>

                <button
                  onClick={() => deleteSeniorMessage(msg.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                  title="حذف و غیرفعال‌سازی پیام"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
