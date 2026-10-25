import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { ClipboardList, Clock, User, Filter } from 'lucide-react';

export const ActivityScreen: React.FC = () => {
  const { activityLogs, currentUser, accentColor, users } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  // Senior managers can inspect one manager at a time, their own activity, or everyone.
  const [selectedManager, setSelectedManager] = useState<string>('mine');

  const displayedLogs = useMemo(() => activityLogs.filter((log) => {
    const searchableSyncText = `${log.action || ''} ${log.description || ''} ${log.entity_type || ''}`
      .normalize('NFKC')
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .toLowerCase();
    // Hide noisy periodic Google Sheets/cloud sync events, but keep actual user activity.
    if (
      /google\s*sheets|گوگل\s*شیت|همگام\s*سازی\s*(ابری|گوگل|با\s*گوگل)|همگام\s*سازی\s*با\s*شیت|cloud\s*sync|sync\s*(started|completed|success|status)|وضعیت\s*همگام\s*سازی/.test(searchableSyncText)
    ) return false;

    if (!isSenior) return log.user_id === currentUser?.id;
    if (selectedManager === 'all') return true;
    if (selectedManager === 'mine') return log.user_id === currentUser?.id;
    return log.user_id === Number(selectedManager);
  }), [activityLogs, currentUser?.id, isSenior, selectedManager]);

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="گزارش فعالیت و لاگ سیستم" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Manager activity filter */}
        {isSenior && (
          <div className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs space-y-2">
            <label htmlFor="activity-manager-filter" className="text-xs font-bold text-gray-600 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              مشاهده فعالیت‌ها بر اساس مدیر
            </label>
            <select
              id="activity-manager-filter"
              value={selectedManager}
              onChange={(event) => setSelectedManager(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="mine">فعالیت من</option>
              <option value="all">فعالیت همه مدیران</option>
              {[...users]
                .filter((user) => user.active && user.role === 'manager')
                .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
                .map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.name}{user.school_name ? ` — ${user.school_name}` : ''}
                  </option>
                ))}
            </select>
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
