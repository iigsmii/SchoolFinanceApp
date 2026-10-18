import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'banner' }> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'header') {
      return (
        <button
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          title="نصب سیستم مالی بر روی گوشی یا کامپیوتر"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">نصب نرم‌افزار (PWA)</span>
          <span className="sm:hidden">نصب</span>
        </button>
      );
    }

    return (
      <div className="bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-indigo-500/10 border border-amber-300 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-[#341648]">
              نصب مستقیم اپلیکیشن مدرسة القرآن (PWA)
            </div>
            <div className="text-[11px] text-gray-500">
              دسترسی سریع و آفلاین بدون نیاز به باز کردن مرورگر و بدون فیلترشکن
            </div>
          </div>
        </div>
        <button
          onClick={install}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>نصب فوری</span>
        </button>
      </div>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-xs font-bold transition-all"
        >
          <Smartphone className="w-3.5 h-3.5 text-purple-700" />
          <span>نصب روی آیفون</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 text-right space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-black text-gray-900">راهنمای نصب در آیفون / آیپد</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-gray-600 space-y-2 leading-relaxed">
                <div>۱. در پایین مرورگر سافاری روی دکمه <span className="font-bold text-blue-600">اشتراک‌گذاری (Share)</span> ضربه بزنید.</div>
                <div>۲. به پایین اسکرول کرده و گزینه <span className="font-bold text-[#62205f]">Add to Home Screen (افزودن به صفحه اصلی)</span> را انتخاب کنید.</div>
                <div>۳. در بالا روی <span className="font-bold text-emerald-600">Add</span> ضربه بزنید تا آیکون برنامه ذخیره شود.</div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-purple-700 text-white py-2 text-xs font-bold hover:bg-purple-800 transition-all"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
