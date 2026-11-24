import React, { useEffect, useState } from 'react';
import { Download, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { postToAppsScript } from '../services/googleSheets';
import { useBackClose } from '../hooks/useBackClose';
import { canInstallInApp, downloadApk, installApk, DownloadProgress } from '../services/apkUpdater';
import { toPersianDigits } from '../utils/jalali';
import packageJson from '../../package.json';

export const CURRENT_VERSION = String(packageJson.version);
export type UpdateInfo = { version: string; apk_url: string; notes?: string; force_update?: boolean };
export function newer(remote: string, local: string) {
  const a = remote.split('.').map(Number), b = local.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}
async function getLatestUpdate(webAppUrl: string): Promise<UpdateInfo | null> {
  // Only the senior admin decides when an update is announced: the Apps Script settings are the
  // single source of truth. The GitHub manifest changes with every build and must never trigger this prompt.
  const result: any = await postToAppsScript({ action: 'app_version' }, webAppUrl);
  if (!result?.success) return null;
  const info = (result.data && typeof result.data === 'object' ? result.data : result) as Partial<UpdateInfo> & { release_enabled?: boolean };
  if (info.release_enabled !== true) return null;
  return info.version && info.apk_url && /^https:\/\//i.test(info.apk_url) ? (info as UpdateInfo) : null;
}
const formatMb = (bytes: number) => toPersianDigits((bytes / 1048576).toFixed(1));

/** کارت دانلود و نصب: نوار درصد، و بعد از دانلود دکمه‌ی نصب همان‌جا. */
export const UpdateCard: React.FC<{ update: UpdateInfo; onDismiss: () => void; onBusyChange?: (busy: boolean) => void }> = ({ update, onDismiss, onBusyChange }) => {
  type Phase = 'idle' | 'downloading' | 'ready' | 'error';
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<DownloadProgress>({ loaded: 0, total: 0 });
  const [filePath, setFilePath] = useState('');
  const [message, setMessage] = useState('');
  const native = canInstallInApp();
  const percent = progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;

  useEffect(() => { onBusyChange?.(phase === 'downloading'); }, [phase, onBusyChange]);

  const startDownload = async () => {
    setPhase('downloading');
    setMessage('');
    setProgress({ loaded: 0, total: 0 });
    try {
      const path = await downloadApk(update.apk_url, update.version, setProgress);
      setFilePath(path);
      setPhase('ready');
    } catch (error: any) {
      setPhase('error');
      setMessage(error?.message ? String(error.message) : 'دانلود انجام نشد؛ اینترنت را بررسی و دوباره تلاش کنید.');
    }
  };
  const startInstall = async () => {
    setMessage('');
    try {
      const result = await installApk(filePath);
      if (result === 'needs_permission') setMessage('برای نصب، اجازه‌ی «نصب برنامه از این منبع» را در صفحه‌ی بازشده فعال کنید، سپس به برنامه برگردید و دوباره «نصب» را بزنید.');
    } catch (error: any) {
      setMessage(error?.message ? String(error.message) : 'نصب شروع نشد؛ دوباره تلاش کنید.');
    }
  };

  return (
    <section className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 space-y-4" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center"><Download className="w-6 h-6" /></div>
        <div className="flex-1">
          <h2 className="text-base font-black text-[#341648]">{update.force_update ? 'به‌روزرسانی ضروری برنامه' : 'نسخه جدید برنامه آماده است'}</h2>
          <p className="text-sm text-gray-600 mt-1">نسخه فعلی {CURRENT_VERSION} · نسخه جدید {update.version}</p>
        </div>
        {!update.force_update && phase !== 'downloading' && <button onClick={onDismiss} aria-label="بستن" className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>}
      </div>
      {update.notes && <div className="rounded-xl bg-gray-50 border p-3 text-sm text-gray-700 whitespace-pre-wrap">{update.notes}</div>}
      {update.force_update && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 leading-6">مدیر ارشد این بروزرسانی را اجباری کرده است؛ تا نصب نسخه جدید امکان ادامه‌ی کار نیست.</p>}

      {native ? (
        <>
          {phase === 'idle' && (
            <>
              <p className="text-xs text-gray-600 leading-6">با زدن دکمه‌ی زیر نسخه جدید داخل همین برنامه دانلود می‌شود و بعد از آن می‌توانید همین‌جا نصب کنید.</p>
              <button onClick={() => void startDownload()} className="w-full rounded-xl bg-[#62205f] text-white py-3.5 font-bold text-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" /> دانلود نسخه جدید</button>
            </>
          )}
          {phase === 'downloading' && (
            <div className="space-y-2" aria-live="polite">
              <div className="flex items-center justify-between text-xs font-bold text-[#341648]">
                <span>در حال دانلود…</span>
                <span dir="ltr">{percent !== null ? `${toPersianDigits(percent)}٪` : `${formatMb(progress.loaded)} MB`}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined}>
                <div className={`h-full rounded-full bg-[#62205f] transition-[width] duration-200 ${percent === null ? 'animate-pulse w-1/3' : ''}`} style={percent !== null ? { width: `${percent}%` } : undefined} />
              </div>
              {progress.total > 0 && <div className="text-[11px] text-gray-500 text-left" dir="ltr">{formatMb(progress.loaded)} / {formatMb(progress.total)} MB</div>}
            </div>
          )}
          {phase === 'ready' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 className="w-5 h-5" /> دانلود کامل شد</div>
              <button onClick={() => void startInstall()} className="w-full rounded-xl bg-emerald-600 text-white py-3.5 font-bold text-sm flex items-center justify-center gap-2">نصب و بروزرسانی</button>
            </div>
          )}
          {phase === 'error' && (
            <button onClick={() => void startDownload()} className="w-full rounded-xl bg-[#62205f] text-white py-3.5 font-bold text-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" /> تلاش دوباره برای دانلود</button>
          )}
          {message && (
            <div className={`text-xs leading-6 rounded-xl border p-3 flex items-start gap-2 ${phase === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-1" /><span>{message}</span>
            </div>
          )}
          {!update.force_update && phase !== 'downloading' && <button onClick={onDismiss} className="w-full text-xs font-bold text-gray-500 py-1">بعداً</button>}
        </>
      ) : (
        <>
          <p className="text-xs text-gray-600 leading-6">برای دریافت نسخه جدید دکمه زیر را بزنید. پس از دانلود، فایل برنامه را باز کنید و گزینه «نصب» را تأیید کنید. ممکن است اندروید یک اجازه امنیتی درخواست کند.</p>
          <a href={update.apk_url} target="_blank" rel="noreferrer" className="w-full rounded-xl bg-[#62205f] text-white py-3.5 font-bold text-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" /> دریافت نسخه جدید</a>
        </>
      )}
    </section>
  );
};

/** قاب تمام‌صفحه‌ی کارت بروزرسانی (برای اعلان خودکار و برای دکمه‌ی «بررسی بروزرسانی» در تنظیمات). */
export const UpdateOverlay: React.FC<{ update: UpdateInfo; onDismiss: () => void }> = ({ update, onDismiss }) => {
  const [busy, setBusy] = useState(false);
  useBackClose(!update.force_update && !busy, onDismiss);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" dir="rtl">
      <UpdateCard update={update} onDismiss={onDismiss} onBusyChange={setBusy} />
    </div>
  );
};

export const AppUpdatePrompt: React.FC = () => {
  const { currentUser, webAppUrl } = useApp();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState('');
  useEffect(() => {
    if (!currentUser) { setUpdate(null); return; }
    let cancelled = false;
    const check = async () => {
      const info = await getLatestUpdate(webAppUrl);
      if (cancelled) return;
      if (info && newer(info.version || '0.0.0', CURRENT_VERSION)) setUpdate(info);
      else setUpdate(null);
    };
    void check();
    const timer = window.setInterval(() => void check(), 300000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [currentUser, webAppUrl]);
  // اگر مدیر ارشد بعداً «اجباری» را روشن کند، حتی بعد از «بعداً» دوباره نمایش داده می‌شود.
  if (!update || (dismissed === update.version && !update.force_update)) return null;
  return <UpdateOverlay update={update} onDismiss={() => setDismissed(update.version)} />;
};
