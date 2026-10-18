import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowRight,
  UserCircle,
  Settings,
  Cloud,
  RefreshCw,
  CheckCircle2,
  LayoutGrid,
  Wallet,
  Scale,
  UserMinus,
  FileText,
  MessageSquare,
  X,
} from 'lucide-react';
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
  } = useApp();

  const [showFinanceMenu, setShowFinanceMenu] = useState(false);

  const handleSyncClick = async () => {
    if (isConnectedToGoogleSheets) {
      await syncWithGoogleSheets();
    } else {
      await connectWithGoogle();
    }
  };

  // Dedicated financial pages, reachable from every screen (same pattern as the
  // students/managers sections on the dashboard).
  const financeItems: Array<{ id: ScreenType; label: string; icon: React.ElementType }> = [
    { id: 'payments_received', label: 'شهریه‌های دریافتی', icon: Wallet },
    { id: 'statement', label: 'صورت وضعیت مالی', icon: Scale },
    { id: 'debtors', label: 'لیست بدهکاران', icon: UserMinus },
    { id: 'quick_invoice', label: 'صدور فاکتور سریع', icon: FileText },
    { id: 'sms_batch', label: 'ارسال گروهی پیامک', icon: MessageSquare },
  ];

  const openFinancePage = (screen: ScreenType) => {
    setShowFinanceMenu(false);
    setCurrentScreen(screen);
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
            src="/src/assets/images/quran_school_finance_logo_1792312844966.jpg"
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
          {/* Financial shortcuts menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFinanceMenu((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#e5dde8] bg-white hover:bg-gray-50 text-xs font-bold text-[#341648] shadow-xs transition-all"
              title="بخش‌های مالی"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#62205f]" style={{ color: accentColor }} />
              <span className="hidden md:inline">بخش‌های مالی</span>
            </button>

            {showFinanceMenu && (
              <>
                {/* Click-away layer */}
                <button
                  type="button"
                  aria-label="بستن منو"
                  onClick={() => setShowFinanceMenu(false)}
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                />
                <div className="absolute left-0 mt-2 w-60 z-50 bg-white rounded-2xl border border-[#e5dde8] shadow-2xl p-2 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[11px] font-bold text-gray-500">صفحه‌های مالی مستقل</span>
                    <button
                      type="button"
                      onClick={() => setShowFinanceMenu(false)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {financeItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openFinancePage(item.id)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-[#341648] hover:bg-[#fcfaff] active:scale-[0.98] transition-all text-right"
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: accentColor }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

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
    </header>
  );
};
