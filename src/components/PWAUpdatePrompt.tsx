import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Sparkles, X, CheckCircle2 } from 'lucide-react';

export const PWAUpdatePrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates every 60 seconds
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  // Also check for updates when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
        });
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const closePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh && !offlineReady) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-[#2a0b33] to-[#51165a] text-white p-4 rounded-3xl shadow-2xl border-2 border-amber-400/60 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-[#2a0b33] flex items-center justify-center shrink-0 shadow-md">
              {needRefresh ? (
                <Sparkles className="w-5 h-5 text-amber-900 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-900" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300">
                {needRefresh ? 'به‌روزرسانی جدید سیستم مالی' : 'آماده کار آفلاین'}
              </div>
              <div className="text-xs text-purple-100 font-medium leading-relaxed mt-0.5">
                {needRefresh
                  ? 'نسخه جدید نرم‌افزار در دسترس است. جهت دریافت آخرین تغییرات و قابلیت‌ها بارگذاری مجدد فرمایید.'
                  : 'نرم‌افزار با موفقیت کش شد و بدون اینترنت نیز در دسترس می‌باشد.'}
              </div>
            </div>
          </div>
          <button
            onClick={closePrompt}
            className="p-1 rounded-full text-purple-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {needRefresh && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-950" />
              <span>به‌روزرسانی و بارگذاری مجدد فوری</span>
            </button>
            <button
              onClick={closePrompt}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs active:scale-95 transition-all"
            >
              بعداً
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
