import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { postToAppsScript } from '../services/googleSheets';
import packageJson from '../../package.json';

const CURRENT_VERSION = String(packageJson.version);
const LATEST_MANIFEST_URL = 'https://raw.githubusercontent.com/iigsmii/SchoolFinanceApp/main/latest-version.json';
type UpdateInfo = { version: string; apk_url: string; notes?: string; force_update?: boolean };
function newer(remote: string, local: string) {
  const a = remote.split('.').map(Number), b = local.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}
async function getLatestUpdate(webAppUrl: string): Promise<UpdateInfo | null> {
  // GitHub Actions updates this manifest after each successful signed APK release.
  try {
    const response = await fetch(LATEST_MANIFEST_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (response.ok) {
      const info = await response.json() as UpdateInfo;
      if (info.version && info.apk_url && /^https:\/\//i.test(info.apk_url)) return info;
    }
  } catch (_) {
    // Continue to the Apps Script configuration as a fallback.
  }
  const result = await postToAppsScript({ action: 'app_version' }, webAppUrl);
  if (!result.success) return null;
  const info = result as UpdateInfo;
  return info.version && info.apk_url && /^https:\/\//i.test(info.apk_url) ? info : null;
}
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
  if (!update || dismissed === update.version) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" dir="rtl">
      <section className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center"><Download className="w-6 h-6" /></div>
          <div className="flex-1"><h2 className="text-base font-black text-[#341648]">{update.force_update ? 'به‌روزرسانی ضروری برنامه' : 'نسخه جدید برنامه آماده است'}</h2><p className="text-sm text-gray-600 mt-1">نسخه فعلی {CURRENT_VERSION} · نسخه جدید {update.version}</p></div>
          {!update.force_update && <button onClick={() => setDismissed(update.version)} aria-label="بستن" className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>}
        </div>
        {update.notes && <div className="rounded-xl bg-gray-50 border p-3 text-sm text-gray-700 whitespace-pre-wrap">{update.notes}</div>}
        <p className="text-xs text-gray-600 leading-6">برای دریافت نسخه جدید دکمه زیر را بزنید. پس از دانلود، فایل برنامه را باز کنید و گزینه «نصب» را تأیید کنید. ممکن است اندروید یک اجازه امنیتی درخواست کند.</p>
        <a href={update.apk_url} target="_blank" rel="noreferrer" className="w-full rounded-xl bg-[#62205f] text-white py-3.5 font-bold text-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" /> دریافت نسخه جدید</a>
      </section>
    </div>
  );
};
