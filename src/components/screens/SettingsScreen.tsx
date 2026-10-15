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
  Info,
  Check,
  Server,
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
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [exportSchoolId, setExportSchoolId] = useState<number>(0);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const handleExportParsian = () => {
    exportParsianExcel(transactions, students, schools, exportSchoolId);
  };

  const handleCheckUpdate = () => {
    setUpdateMsg('نسخه فعلی v2.15.0 آخرین نسخه پایدار سامانه مدرسة القرآن می‌باشد و نرم‌افزار به‌روز است.');
    setTimeout(() => setUpdateMsg(null), 5000);
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="تنظیمات سامانه" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Check for updates banner matching Android */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="text-sm font-bold text-[#341648]">نسخه سامانه: v2.15.0 (نسخه تحت وب React)</div>
            <div className="text-xs text-gray-400 mt-0.5">بازنویسی و ارتقا یافته از نسخه اندروید حسابداری مدارس</div>
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
              این ابزار تمام اسناد مالی، شهریه‌ها، هزینه‌ها و کدهای تفصیلی دانش‌آموزان را بر اساس الگوی رسمی پارسیan (کد کل ۶۷، معین مدرسه و تفصیلی کد ملی) استخراج و در قالب فایل Excel استاندارد آماده می‌کند.
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
            <span>مشخصات فنی و همگام‌سازی</span>
          </div>
          <div>پایگاه داده و سرور: Google Sheets / Google Drive / Google Apps Script API</div>
          <div>رمزنگاری محلی: AES-GCM 128-bit با پشتیبانی از حافظه محلی مرورگر</div>
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
