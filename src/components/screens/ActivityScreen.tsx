import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { ClipboardList, Clock, User, Filter } from 'lucide-react';

export const ActivityScreen: React.FC = () => {
  const { activityLogs, currentUser, accentColor } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [filterMode, setFilterMode] = useState<'mine' | 'all'>('mine');

  const displayedLogs = activityLogs.filter((log) => {
    if (filterMode === 'mine') return log.user_id === currentUser?.id;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="گزارش فعالیت و لاگ سیستم" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Filter Toggle */}
        {isSenior && (
          <div className="flex bg-white rounded-2xl p-1.5 border border-[#e5dde8] shadow-xs">
            <button
              onClick={() => setFilterMode('mine')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                filterMode === 'mine' ? 'bg-[#62205f] text-white' : 'text-gray-600'
              }`}
              style={filterMode === 'mine' ? { backgroundColor: accentColor } : {}}
            >
              <User className="w-4 h-4" />
              <span>فعالیت من</span>
            </button>

            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                filterMode === 'all' ? 'bg-[#62205f] text-white' : 'text-gray-600'
              }`}
              style={filterMode === 'all' ? { backgroundColor: accentColor } : {}}
            >
              <ClipboardList className="w-4 h-4" />
              <span>فعالیت تمام مدیران مجموعه</span>
            </button>
          </div>
        )}

        {/* Logs List */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold">
            ثبت رویدادها و تراکنش‌ها ({displayedLogs.length} مورد):
          </div>

          {displayedLogs.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              هنوز فعالیتی ثبت نشده است.
            </div>
          ) : (
            displayedLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#341648] text-sm">{log.action}</span>
                    {log.entity_type && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono">
                        {log.entity_type} #{log.entity_id || ''}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {log.date}
                  </span>
                </div>

                <p className="text-gray-600 font-medium leading-relaxed">{log.description}</p>

                <div className="text-[11px] text-gray-400 pt-1 border-t border-gray-100 flex justify-between">
                  <span>ثبت توسط: {log.user_name}</span>
                  {log.school_name && <span>مدرسه: {log.school_name}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
