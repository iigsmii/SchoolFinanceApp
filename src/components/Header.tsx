import React from 'react';
import appLogo from '../assets/images/quran_school_finance_logo_1792312844966.jpg';
import { useApp } from '../context/AppContext';
import { ArrowRight, UserCircle, Settings, Cloud, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { ScreenType } from '../types';

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = true }) => {
  const {
    currentUser,
    setCurrentScreen,
    accentColor,
    isConnectedToGoogleSheets,
    syncStatus,
    syncWithGoogleSheets,
    connectWithGoogle,
    goBack,
    pendingSyncCount,
    failedSyncItems,
    retryFailedSync,
    dismissFailedSync,
  } = useApp();

  const handleSyncClick = async () => {
    if (isConnectedToGoogleSheets) {
      await syncWithGoogleSheets();
    } else {
      await connectWithGoogle();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#f8f5f9]/95 backdrop-blur-md border-b border-[#e5dde8] px-4 py-3 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={goBack}
              className="p-2 rounded-xl text-[#341648] hover:bg-white/80 active:scale-95 transition-all shadow-sm border border-[#e5dde8]"
              title="بازگشت به صفحه قبل"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <img
            src={appLogo}
            alt="لوگوی سیستم مالی مدرسة القرآن"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover shadow-2xs border border-amber-300/60 shrink-0"
          />
          <div>
            <div className="text-xs font-semibold text-[#62205f] flex items-center gap-1.5" style={{ color: accentColor }}>
              <span>مدرسة القرآن الکریم شهرضا</span>
              <span className="text-[#a98ea0]">/</span>
              <span>سیستم مالی</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#341648] leading-tight">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton variant="header" />

          {/* Cloud Sync Status Badge */}
          <button
            onClick={handleSyncClick}
            disabled={syncStatus === 'syncing'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
              syncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                : isConnectedToGoogleSheets
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
            }`}
            title={
              isConnectedToGoogleSheets
                ? 'متصل به Google Sheets - کلیک برای همگام‌سازی لحظه‌ای'
                : 'اتصال به Google Sheets'
            }
          >
            {syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span className="hidden sm:inline">در حال همگام‌سازی...</span>
              </>
            ) : isConnectedToGoogleSheets ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">متصل به شیت</span>
                <RefreshCw className="w-3 h-3 text-emerald-700 opacity-60 hover:opacity-100" />
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">اتصال به شیت</span>
              </>
            )}
          </button>

          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#e5dde8] shadow-xs text-xs font-medium text-[#302735]">
              <UserCircle className="w-4 h-4 text-[#62205f]" style={{ color: accentColor }} />
              <span className="truncate max-w-[150px]">{currentUser.name}</span>
              {currentUser.school_name && (
                <span className="text-[10px] bg-[#f2eaf3] text-[#62205f] px-2 py-0.5 rounded-md font-bold">
                  {currentUser.school_name}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => setCurrentScreen('settings' as ScreenType)}
            className="p-2.5 rounded-xl text-[#341648] hover:bg-white/80 active:scale-95 transition-all shadow-sm border border-[#e5dde8]"
            title="تنظیمات سامانه"
          >
            <Settings className="w-5 h-5 text-[#341648]" />
          </button>
        </div>
      </div>
      {(pendingSyncCount > 0 || failedSyncItems.length > 0) && (
        <div className="max-w-4xl mx-auto mt-2 text-xs" dir="rtl">
          {pendingSyncCount > 0 && failedSyncItems.length === 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5">
              {pendingSyncCount.toLocaleString('fa-IR')} تغییر روی این دستگاه ذخیره شده و پس از اتصال به اینترنت به گوگل‌شیت ارسال می‌شود.
            </div>
          )}
          {failedSyncItems.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-3 py-2 space-y-1.5">
              <div className="font-bold">{failedSyncItems.length.toLocaleString('fa-IR')} مورد در گوگل‌شیت ثبت نشد:</div>
              {failedSyncItems.slice(0, 5).map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2">
                  <span>{item.label}{item.error ? ` — ${item.error}` : ''}</span>
                  <button type="button" onClick={() => dismissFailedSync(item.key)} className="px-2 py-0.5 rounded-lg bg-white border border-red-200 font-bold">حذف</button>
                </div>
              ))}
              <button type="button" onClick={retryFailedSync} className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold">تلاش مجدد برای همه</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
