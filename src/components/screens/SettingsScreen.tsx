import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { exportParsianExcel } from '../../utils/parsian';
import {
  Palette,
  Type,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  Check,
  Server,
  Cloud,
  ShieldCheck,
  AlertCircle,
  Database,
  Users,
  CreditCard,
  Receipt,
  Lock,
} from 'lucide-react';

const THEME_NAMES = [
  { name: 'بنفش سلطنتی (اصلی)', color: '#62205f' },
  { name: 'آبی کلاسیک', color: '#3f51b5' },
  { name: 'بنفش ارغوانی', color: '#7b3082' },
  { name: 'نارنجی کهربایی', color: '#a85213' },
  { name: 'سبز زمردی', color: '#2c6c4b' },
  { name: 'سبز فیروزه‌ای تیره', color: '#146a67' },
];

export const SettingsScreen: React.FC = () => {
  const {
    themeIndex,
    setThemeIndex,
    fontScale,
    setFontScale,
    logout,
    accentColor,
    transactions,
    students,
    schools,
    currentUser,
    googleUser,
    isConnectedToGoogleSheets,
    spreadsheetId,
    syncStatus,
    syncError,
    lastSyncTime,
    connectWithGoogle,
    disconnectGoogle,
    syncWithGoogleSheets,
    syncStats,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [exportSchoolId, setExportSchoolId] = useState<number>(0);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const handleExportParsian = () => {
    exportParsianExcel(transactions, students, schools, exportSchoolId);
  };

  const handleCheckUpdate = () => {
    setUpdateMsg('نسخه فعلی v2.16.0 آخرین نسخه پایدار سامانه مدرسة القرآن می‌باشد و نرم‌افزار به‌روز است.');
    setTimeout(() => setUpdateMsg(null), 5000);
  };

  const handleManualSync = async () => {
    await syncWithGoogleSheets();
  };

  return (
    <div className="w-full max-w-full min-h-screen overflow-x-hidden bg-[#f8f5f9] pb-12">
      <Header title="تنظیمات سامانه" />

      <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-5 box-border">
        {/* Check for updates banner matching Android */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="text-sm font-bold text-[#341648]">نسخه سامانه: v2.16.0 (پایگاه داده Google Sheets)</div>
            <div className="text-xs text-gray-400 mt-0.5">یکپارچه‌سازی شده با پایگاه داده گوگل شیت و درایو اختصاصی مدرسة القرآن</div>
          </div>
          <button
            onClick={handleCheckUpdate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e5dde8] hover:border-[#62205f] text-xs font-bold text-[#341648] hover:bg-gray-50 transition-all shadow-xs"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            بررسی به‌روزرسانی
          </button>
        </div>

        {updateMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{updateMsg}</span>
          </div>
        )}

        {/* Google Sheets Cloud Connection Section */}
        <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5dde8] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#341648]">اتصال به Google Sheets (پایگاه داده زنده)</h3>
                <p className="text-xs text-gray-500">ارتباط مستقیم و رایگان با فایل شیت اطلاعات دانش‌آموزان و تراکنش‌های مالی</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isConnectedToGoogleSheets
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnectedToGoogleSheets ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {isConnectedToGoogleSheets ? 'متصل به گوگل شیت' : 'در انتظار اتصال'}
              </span>
            </div>
          </div>

          {/* Account & OAuth Connection Card */}
          <div className="bg-[#fcfaff] rounded-2xl p-4 border border-[#ede5ef] space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="text-xs font-bold text-[#341648] flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-purple-600" />
                  <span>حساب کاربری Google متصل به شیت:</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {googleUser ? (
                    <span className="font-mono text-purple-900 font-bold">{googleUser.email || googleUser.displayName}</span>
                  ) : (
                    <span>هنوز به حساب گوگل متصل نشده‌اید. برای اتصال روی دکمه زیر کلیک کنید:</span>
                  )}
                </div>
              </div>

              {googleUser ? (
                <button
                  type="button"
                  onClick={disconnectGoogle}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
                >
                  قطع اتصال حساب گوگل
                </button>
              ) : (
                <button
                  type="button"
                  onClick={connectWithGoogle}
                  disabled={syncStatus === 'syncing'}
                  className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  {syncStatus === 'syncing' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>اتصال با حساب Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Fixed backend configuration (read-only, locked in code) */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700" />
              <span>تنظیمات اتصال قفل شده است و قابل تغییر توسط کاربر نیست</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              برای جلوگیری از خرابی و ناهمخوانی داده‌ها، شناسهٔ فایل گوگل شیت و نشانی سرویس Google Apps Script به‌صورت ثابت در کد برنامه تنظیم شده‌اند و از این صفحه قابل ویرایش نیستند.
            </p>
            <div className="text-[11px] text-gray-600 space-y-1 pt-1" dir="ltr">
              <div className="text-right">
                <span className="font-bold text-gray-700">Spreadsheet ID:</span>{' '}
                <span className="font-mono break-all">{spreadsheetId}</span>
              </div>
            </div>
          </div>

          {/* Sync action button & Stats */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-[#e5dde8] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="text-xs font-bold text-[#341648]">همگام‌سازی کامل داده‌ها:</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {lastSyncTime ? (
                    <span>آخرین همگام‌سازی موفق: {lastSyncTime}</span>
                  ) : (
                    <span>داده‌ها هنوز از شیت بارگذاری نشده‌اند.</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncStatus === 'syncing'}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#62205f] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor }}
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>همگام‌سازی و بارگذاری زنده از Google Sheets</span>
              </button>
            </div>

            {syncError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{syncError}</span>
              </div>
            )}

            {syncStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                  <div className="text-gray-400 text-[10px] flex items-center justify-center gap-1">
                    <Users className="w-3 h-3 text-indigo-500" />
                    <span>دانش‌آموزان شیت</span>
                  </div>
                  <div className="text-base font-black text-gray-800 mt-1">{syncStats.studentsCount}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                  <div className="text-gray-400 text-[10px] flex items-center justify-center gap-1">
                    <CreditCard className="w-3 h-3 text-emerald-500" />
                    <span>تراکنش‌ها و شهریه</span>
                  </div>
                  <div className="text-base font-black text-gray-800 mt-1">{syncStats.transactionsCount}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                  <div className="text-gray-400 text-[10px] flex items-center justify-center gap-1">
                    <Receipt className="w-3 h-3 text-amber-500" />
                    <span>چک‌های صیادی</span>
                  </div>
                  <div className="text-base font-black text-gray-800 mt-1">{syncStats.chequesCount}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                  <div className="text-gray-400 text-[10px] flex items-center justify-center gap-1">
                    <FileSpreadsheet className="w-3 h-3 text-rose-500" />
                    <span>هزینه‌های ثبت‌شده</span>
                  </div>
                  <div className="text-base font-black text-gray-800 mt-1">{syncStats.expensesCount}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Color Theme Selector matching Android themeIndex */}
        <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-4">
          <div className="text-sm font-bold text-[#341648] flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#62205f]" style={{ color: accentColor }} />
            <span>تم و رنگ‌بندی محیط کاربری</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEME_NAMES.map((t, idx) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setThemeIndex(idx)}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all text-right ${
                  themeIndex === idx
                    ? 'border-gray-900 shadow-md ring-2 ring-[#62205f]/20 bg-[#fcfaff]'
                    : 'border-[#e5dde8] hover:border-gray-400 bg-white'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full shadow-inner shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Scaler matching Android fontScale minus/plus A buttons */}
        <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#341648] flex items-center gap-2">
              <Type className="w-5 h-5 text-[#62205f]" style={{ color: accentColor }} />
              <span>اندازه قلم و نوشته‌ها</span>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-xl">
              اندازه فعلی: {Math.round(fontScale * 100)}٪
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <button
              onClick={() => setFontScale(fontScale - 0.05)}
              className="w-20 h-20 rounded-2xl border-2 border-[#e5dde8] hover:border-[#62205f] bg-white flex flex-col items-center justify-center active:scale-95 transition-all shadow-xs group"
              title="کوچک‌تر کردن نوشته‌ها"
            >
              <span className="text-xl font-black text-gray-600 group-hover:text-[#62205f]">➖</span>
              <span className="text-sm font-bold text-gray-500">A</span>
            </button>

            <button
              onClick={() => setFontScale(1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              پیش‌فرض (۱۰۰٪)
            </button>

            <button
              onClick={() => setFontScale(fontScale + 0.05)}
              className="w-20 h-20 rounded-2xl border-2 border-[#e5dde8] hover:border-[#62205f] bg-white flex flex-col items-center justify-center active:scale-95 transition-all shadow-xs group"
              title="بزرگ‌تر کردن نوشته‌ها"
            >
              <span className="text-xl font-black text-gray-600 group-hover:text-[#62205f]">➕</span>
              <span className="text-base font-black text-gray-800 group-hover:text-[#62205f]">A</span>
            </button>
          </div>
        </div>

        {/* Parsian Export Section */}
        {isSenior && (
          <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-xs space-y-4">
            <div className="text-sm font-bold text-[#341648] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>خروجی فایل Excel استاندارد نرم‌افزار حسابداری پارسیان</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              این ابزار تمام اسناد مالی، شهریه‌ها، هزینه‌ها و کدهای تفصیلی دانش‌آموزان را بر اساس الگوی رسمی پارسیان (کد کل ۶۷، معین مدرسه و تفصیلی کد ملی) استخراج و در قالب فایل Excel استاندارد آماده می‌کند.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <select
                value={exportSchoolId}
                onChange={(e) => setExportSchoolId(Number(e.target.value))}
                className="w-full sm:w-64 py-2.5 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
              >
                <option value={0}>همه مدارس مجموعه</option>
                {schools.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleExportParsian}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                دانلود فایل Excel پارسیان
              </button>
            </div>
          </div>
        )}

        {/* Cloud & Service Architecture Note */}
        <div className="bg-[#fcfaff] rounded-3xl p-5 border border-[#ede5ef] space-y-2 text-xs text-gray-600 leading-relaxed">
          <div className="font-bold text-[#341648] flex items-center gap-2">
            <Server className="w-4 h-4 text-[#62205f]" style={{ color: accentColor }} />
            <span>مشخصات فنی و زیرساخت ابری</span>
          </div>
          <div>پایگاه داده زنده: Google Sheets (شناسه ثابت و قفل‌شده در کد برنامه)</div>
          <div>احراز هویت و امنیت: Google Workspace OAuth 2.0 و رمزنگاری AES-GCM</div>
          <div>پیوست‌ها و اسناد: Google Drive Folder (SchoolFinanceApp_Attachments)</div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full py-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <LogOut className="w-5 h-5" />
          خروج از حساب کاربری
        </button>
      </main>
    </div>
  );
};
