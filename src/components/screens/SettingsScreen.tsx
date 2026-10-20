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
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Database,
  Users,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { DEFAULT_SPREADSHEET_ID } from '../../services/googleSheets';

const THEME_NAMES = [
  { name: 'بنفش سلطنتی (اصلی)', color: '#62205f' },
  { name: 'آبی کلاسیک', color: '#3f51b5' },
  { name: 'بنفش ارغوانی', color: '#7b3082' },
  { name: 'نارنجی کهربایی', color: '#a85213' },
  { name: 'سبز زمردی', color: '#2c6c4b' },
  { name: 'سبز فیروزه‌ای تیره', color: '#146a67' },
];

export const SettingsScreen: React.FC<{ googleOnly?: boolean }> = ({ googleOnly = false }) => {
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
    googleAccessToken,
    isConnectedToGoogleSheets,
    spreadsheetId,
    setSpreadsheetId,
    webAppUrl,
    setWebAppUrl,
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
  const [inputSheetId, setInputSheetId] = useState(spreadsheetId);
  const [inputWebAppUrl, setInputWebAppUrl] = useState(webAppUrl);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const handleExportParsian = () => {
    exportParsianExcel(transactions, students, schools, exportSchoolId);
  };

  const handleCheckUpdate = () => {
    setUpdateMsg('نسخه فعلی v2.15.0 آخرین نسخه پایدار سامانه مدرسة القرآن می‌باشد و نرم‌افزار به‌روز است.');
    setTimeout(() => setUpdateMsg(null), 5000);
  };

  const handleSaveSheetId = () => {
    const clean = inputSheetId.trim();
    if (!clean) return;
    setSpreadsheetId(clean);
    setSaveFeedback('شناسه گوگل شیت با موفقیت ذخیره شد.');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleSaveWebAppUrl = () => {
    const clean = inputWebAppUrl.trim();
    setWebAppUrl(clean);
    setSaveFeedback('نشانی وب‌اپ گوگل ذخیره شد.');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleResetDefaultSheet = () => {
    setInputSheetId(DEFAULT_SPREADSHEET_ID);
    setSpreadsheetId(DEFAULT_SPREADSHEET_ID);
    setSaveFeedback('شناسه شیت به شناسه اصلی سامانه مدرسة القرآن بازگردانده شد.');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleManualSync = async () => {
    await syncWithGoogleSheets(inputSheetId);
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title={googleOnly ? "تنظیمات اتصال گوگل" : "تنظیمات سامانه"} />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {!googleOnly && <>
        {/* Check for updates banner matching Android */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="text-sm font-bold text-[#341648]">نسخه سامانه: v2.15.0 (پایگاه داده Google Sheets)</div>
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

        </>}
        {googleOnly && isSenior && <>
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

          {/* Spreadsheet ID configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#341648]">شناسه فایل Google Sheet (Spreadsheet ID):</label>
              <button
                type="button"
                onClick={handleResetDefaultSheet}
                className="text-[11px] text-purple-700 hover:underline font-medium"
              >
                بازنشانی به شناسه پیش‌فرض مدرسة القرآن
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputSheetId}
                onChange={(e) => setInputSheetId(e.target.value)}
                placeholder="مثال: 1bFTL1edC-btgjp2KvvkwIM5WaJnycVFylTmFQQFRixk"
                className="grow px-3.5 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-[#302735] focus:outline-hidden focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleSaveSheetId}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl border border-gray-300 transition-all shrink-0"
              >
                ذخیره شناسه
              </button>
              <a
                href={`https://docs.google.com/spreadsheets/d/${inputSheetId.trim()}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-all shrink-0 flex items-center justify-center gap-1.5"
                title="مشاهده شیت در گوگل شیتس"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>باز کردن شیت</span>
              </a>
            </div>

            {saveFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{saveFeedback}</span>
              </div>
            )}
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

          {/* Apps Script Web App Endpoint Alternative */}
          <div className="pt-2 border-t border-gray-100">
            <details className="text-xs text-gray-600 group">
              <summary className="font-bold text-[#341648] cursor-pointer hover:text-purple-700 flex items-center gap-2 select-none">
                <span>➕ تنظیمات پیشرفته نشانی Google Apps Script Web App (اختیاری)</span>
              </summary>
              <div className="mt-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  اگر اسکریپت <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">SchoolFinanceApp_GoogleAppsScript_FINAL.gs</code> را در Extensions &gt; Apps Script منتشر کرده‌اید، می‌توانید آدرس /exec را در زیر وارد کنید:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={inputWebAppUrl}
                    onChange={(e) => setInputWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="grow px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleSaveWebAppUrl}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold"
                  >
                    ذخیره نشانی
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>

        </>}
        {!googleOnly && <>
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

        {/* Cloud & Service Architecture Note */}
        <div className="bg-[#fcfaff] rounded-3xl p-5 border border-[#ede5ef] space-y-2 text-xs text-gray-600 leading-relaxed">
          <div className="font-bold text-[#341648] flex items-center gap-2">
            <Server className="w-4 h-4 text-[#62205f]" style={{ color: accentColor }} />
            <span>مشخصات فنی و زیرساخت ابری</span>
          </div>
          <div>پایگاه داده زنده: Google Sheets (شناسه: {spreadsheetId})</div>
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
        </>}
        {googleOnly && !isSenior && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">
            این صفحه فقط برای مدیر ارشد قابل دسترسی است.
          </div>
        )}
      </main>
    </div>
  );
};
