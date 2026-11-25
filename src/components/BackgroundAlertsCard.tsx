import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_WEBAPP_URL } from '../services/googleSheets';
import {
  AlertsPermissionState,
  canUseBackgroundAlerts,
  getAlertsPermissionState,
  openAutoStartSettings,
  setupBackgroundAlertsInteractive,
} from '../services/backgroundAlerts';

const VENDORS_WITH_AUTOSTART = ['xiaomi', 'redmi', 'poco', 'huawei', 'honor', 'oppo', 'realme', 'oneplus', 'vivo'];

/** وضعیت اعلان‌های پس‌زمینه (فقط اپ اندروید) و دکمه‌ی فعال‌سازی که مجوزها را داخل خود برنامه می‌پرسد. */
export const BackgroundAlertsCard: React.FC = () => {
  const { currentUser } = useApp();
  const [state, setState] = useState<AlertsPermissionState | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => setState(await getAlertsPermissionState()), []);
  useEffect(() => { void refresh(); }, [refresh]);

  if (!canUseBackgroundAlerts() || !currentUser) return null;

  const allOk = !!state && state.notifications && state.batteryIgnoring;
  const vendor = (state?.manufacturer || '').toLowerCase();
  const showAutoStart = VENDORS_WITH_AUTOSTART.some((v) => vendor.includes(v));

  const run = async () => {
    setBusy(true);
    try {
      const st = await setupBackgroundAlertsInteractive(currentUser, DEFAULT_WEBAPP_URL);
      if (st) setState(st);
    } finally {
      setBusy(false);
      setTimeout(() => { void refresh(); }, 1500);
    }
  };

  const Row = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-xs font-bold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      <span>{label}</span>
    </div>
  );

  return (
    <section className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-3">
      <div className="flex items-center gap-2 text-sm font-black text-[#341648]">
        <BellRing className="w-4 h-4" />
        <span>اعلان‌های پس‌زمینه (وقتی برنامه بسته است)</span>
      </div>
      <Row ok={!!state?.notifications} label={state?.notifications ? 'اجازهٔ نمایش اعلان داده شده است' : 'اجازهٔ نمایش اعلان داده نشده است'} />
      <Row ok={!!state?.batteryIgnoring} label={state?.batteryIgnoring ? 'کار در پس‌زمینه مجاز است' : 'کار در پس‌زمینه هنوز مجاز نشده است'} />
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="w-full px-4 py-3 rounded-xl text-white text-sm font-black bg-[#62205f] hover:opacity-90 disabled:opacity-60"
      >
        {busy ? 'در حال فعال‌سازی...' : allOk ? 'بررسی دوبارهٔ اعلان‌ها' : 'فعال‌سازی اعلان‌ها'}
      </button>
      {showAutoStart && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-600 leading-5">
            در برخی گوشی‌ها (مثل شیائومی، هواوی، اوپو) اندروید راهی برای دادن «شروع خودکار» به برنامه نمی‌دهد؛ این دکمه فقط همان صفحه را باز می‌کند تا یک‌بار روشنش کنید.
          </p>
          <button
            type="button"
            onClick={() => { void openAutoStartSettings(); }}
            className="w-full px-4 py-2.5 rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648] hover:bg-gray-50"
          >
            باز کردن تنظیم «شروع خودکار»
          </button>
        </div>
      )}
    </section>
  );
};
