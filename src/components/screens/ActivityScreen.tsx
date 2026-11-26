import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { setNavHint } from '../../utils/alerts';
import { Clock, Filter, Search, ChevronDown, Check, Users, UserRound } from 'lucide-react';

const formatActivityDate = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'تاریخ نامشخص';

  const raw = String(value).trim();
  const normalized = raw
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

  // Handle ISO timestamps and common backend date-time strings.
  const candidate = /^\d{4}-\d{2}-\d{2} \d{2}:/.test(normalized)
    ? normalized.replace(' ', 'T')
    : normalized;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return raw;

  const weekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long' }).format(date);
  const datePart = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${weekday}، ${datePart} — ساعت ${timePart}`;
};

export const ActivityScreen: React.FC = () => {
  const { activityLogs, currentUser, users, setCurrentScreen } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [selectedManager, setSelectedManager] = useState<string>(isSenior ? 'all' : 'mine');
  const [managerPickerOpen, setManagerPickerOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [activityPage, setActivityPage] = useState(0);
  const ACTIVITY_PAGE_SIZE = 50;

  useEffect(() => {
    setActivityPage(0);
  }, [selectedManager]);

  // Build the list from both the Managers sheet and the audit log itself.
  // This keeps inactive/older managers selectable and recovers managers whose
  // account row was omitted from the latest manager snapshot.
  const managerOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; schoolName?: string }>();

    (users || []).forEach((user) => {
      if (!user || user.id == null || user.role === 'senior' || user.role === 'admin') return;
      const id = String(user.id);
      byId.set(id, {
        id,
        name: String(user.name || user.username || `مدیر ${id}`).trim(),
        schoolName: user.school_name || undefined,
      });
    });

    (activityLogs || []).forEach((log) => {
      const id = Number(log.user_id);
      if (!Number.isFinite(id) || id <= 0) return;
      const key = String(id);
      const existing = byId.get(key);
      const logName = String(log.user_name || '').trim();
      if (!existing) {
        byId.set(key, { id: key, name: logName || `مدیر ${key}`, schoolName: log.school_name || undefined });
      } else if (!existing.schoolName && log.school_name) {
        existing.schoolName = log.school_name;
      }
    });

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [users, activityLogs]);

  const selectedManagerLabel = useMemo(() => {
    if (selectedManager === 'all') return 'فعالیت همه مدیران';
    if (selectedManager === 'mine') return 'فعالیت من';
    const manager = managerOptions.find((item) => item.id === selectedManager);
    return manager ? `${manager.name}${manager.schoolName ? ` — ${manager.schoolName}` : ''}` : 'انتخاب مدیر';
  }, [managerOptions, selectedManager]);

  const filteredManagerOptions = useMemo(() => {
    const query = managerSearch.trim().normalize('NFKC').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').toLowerCase();
    if (!query) return managerOptions;
    return managerOptions.filter((manager) =>
      `${manager.name} ${manager.schoolName || ''}`.normalize('NFKC').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').toLowerCase().includes(query)
    );
  }, [managerOptions, managerSearch]);

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

  const activityPageCount = Math.max(1, Math.ceil(displayedLogs.length / ACTIVITY_PAGE_SIZE));
  const visibleLogs = displayedLogs.slice(
    activityPage * ACTIVITY_PAGE_SIZE,
    (activityPage + 1) * ACTIVITY_PAGE_SIZE
  );

  const chooseManager = (value: string) => {
    setSelectedManager(value);
    setManagerPickerOpen(false);
    setManagerSearch('');
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="گزارش فعالیت و لاگ سیستم" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {isSenior && (
          <section className="rounded-2xl border border-[#e5dde8] bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#341648]">
              <Filter className="h-4 w-4" />
              فیلتر فعالیت مدیران
            </div>
            <button
              type="button"
              aria-expanded={managerPickerOpen}
              aria-controls="activity-manager-options"
              onClick={() => setManagerPickerOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#e5dde8] bg-[#fcfaff] px-3 py-3 text-right transition-colors hover:border-[#bda8c9] focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1eaf5] text-[#62205f]">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-gray-500">نمایش بر اساس</span>
                  <span className="block truncate text-sm font-bold text-gray-800">{selectedManagerLabel}</span>
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${managerPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {managerPickerOpen && (
              <div id="activity-manager-options" className="overflow-hidden rounded-xl border border-[#e5dde8] bg-white">
                <div className="border-b border-gray-100 p-2">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3">
                    <Search className="h-4 w-4 shrink-0 text-gray-400" />
                    <input
                      type="search"
                      value={managerSearch}
                      onChange={(event) => setManagerSearch(event.target.value)}
                      placeholder="جستجوی نام مدیر یا مدرسه..."
                      className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  <button
                    type="button"
                    onClick={() => chooseManager('all')}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-[#f8f3fa] ${selectedManager === 'all' ? 'bg-[#f3eaf6] font-bold text-[#62205f]' : 'text-gray-700'}`}
                  >
                    <span className="flex items-center gap-2"><Users className="h-4 w-4" /> فعالیت همه مدیران</span>
                    {selectedManager === 'all' && <Check className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseManager('mine')}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-[#f8f3fa] ${selectedManager === 'mine' ? 'bg-[#f3eaf6] font-bold text-[#62205f]' : 'text-gray-700'}`}
                  >
                    <span className="flex items-center gap-2"><UserRound className="h-4 w-4" /> فعالیت من</span>
                    {selectedManager === 'mine' && <Check className="h-4 w-4" />}
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  {filteredManagerOptions.length ? filteredManagerOptions.map((manager) => (
                    <button
                      type="button"
                      key={manager.id}
                      onClick={() => chooseManager(manager.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-right transition-colors hover:bg-[#f8f3fa] ${selectedManager === manager.id ? 'bg-[#f3eaf6] text-[#62205f]' : 'text-gray-700'}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{manager.name}</span>
                        {manager.schoolName && <span className="block truncate text-[11px] text-gray-400">{manager.schoolName}</span>}
                      </span>
                      {selectedManager === manager.id && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  )) : (
                    <p className="px-3 py-5 text-center text-xs text-gray-400">مدیری با این مشخصات پیدا نشد.</p>
                  )}
                </div>
                <div className="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-400">
                  {managerOptions.length.toLocaleString('fa-IR')} مدیر در فهرست
                </div>
              </div>
            )}
          </section>
        )}

        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-500">
            نمایش {displayedLogs.length === 0 ? 0 : activityPage * ACTIVITY_PAGE_SIZE + 1} تا {Math.min((activityPage + 1) * ACTIVITY_PAGE_SIZE, displayedLogs.length)} از {displayedLogs.length.toLocaleString('fa-IR')} رویداد:
          </div>

          {displayedLogs.length === 0 ? (
            <div className="rounded-3xl border border-[#e5dde8] bg-white p-8 text-center text-gray-400">
              هنوز فعالیتی ثبت نشده است.
            </div>
          ) : (
            visibleLogs.map((log) => {
              const entityType = String(log.entity_type || '').toLowerCase();
              const entityId = log.entity_id;
              const isTransactionLink = ['transaction', 'expense', 'tuition', 'tuition_payment', 'tuition_debt'].includes(entityType) && entityId != null;
              const isBankLink = ['bank_transaction', 'banktransaction', 'bank'].includes(entityType) && entityId != null;
              const isChequeLink = entityType === 'cheque' && entityId != null;
              const canOpenEntity = isTransactionLink || isBankLink || isChequeLink;
              const openEntity = () => {
                if (!canOpenEntity) return;
                if (isTransactionLink) {
                  setNavHint('transactions', `transaction:${entityId}`);
                  setCurrentScreen('transactions');
                } else if (isChequeLink) {
                  setNavHint('cheques', `list:cheque:${entityId}`);
                  setCurrentScreen('cheques');
                } else {
                  setCurrentScreen('bank');
                }
              };
              return (
              <button
                key={log.id}
                type="button"
                onClick={openEntity}
                disabled={!canOpenEntity}
                className={`w-full text-right space-y-1.5 rounded-2xl border border-[#e5dde8] bg-white p-4 text-xs shadow-sm ${canOpenEntity ? 'hover:border-purple-300 hover:bg-purple-50/30 cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-bold text-[#341648]">{log.action}</span>
                    {log.entity_type && (
                      <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                        {log.entity_type} #{log.entity_id || ''}
                      </span>
                    )}
                  </div>
                  <span className="flex max-w-[65%] shrink-0 items-center gap-1 text-left text-[11px] leading-5 text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {formatActivityDate(log.date)}
                  </span>
                </div>

                <p className="font-medium leading-relaxed text-gray-600">{log.description}</p>

                <div className="flex justify-between gap-3 border-t border-gray-100 pt-1 text-[11px] text-gray-400">
                  <span>ثبت توسط: {log.user_name}</span>
                  {(isSenior && log.user_id === currentUser?.id) ? (
                    <span>واحد: دفتر مرکزی مدرسة القرآن</span>
                  ) : log.school_name ? (
                    <span>مدرسه: {log.school_name}</span>
                  ) : null}
                </div>
                {canOpenEntity && <span className="block pt-1 text-[10px] font-black text-purple-700">مشاهده رکورد مرتبط ←</span>}
              </button>
              );
            })
          )}
          {displayedLogs.length > ACTIVITY_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#e5dde8] bg-white p-3">
              <button type="button" onClick={() => setActivityPage((page) => Math.max(0, page - 1))} disabled={activityPage === 0} className="rounded-xl border border-[#e5dde8] px-4 py-2 text-xs font-bold text-[#341648] disabled:cursor-not-allowed disabled:opacity-40">صفحه قبل</button>
              <span className="text-xs font-semibold text-gray-600">صفحه {(activityPage + 1).toLocaleString('fa-IR')} از {activityPageCount.toLocaleString('fa-IR')}</span>
              <button type="button" onClick={() => setActivityPage((page) => Math.min(activityPageCount - 1, page + 1))} disabled={activityPage >= activityPageCount - 1} className="rounded-xl border border-[#e5dde8] px-4 py-2 text-xs font-bold text-[#341648] disabled:cursor-not-allowed disabled:opacity-40">صفحه بعد</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
