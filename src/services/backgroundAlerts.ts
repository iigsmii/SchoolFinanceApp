import { Capacitor, registerPlugin } from '@capacitor/core';
import { postToAppsScript } from './googleSheets';

/** پلاگین بومی اندروید (scripts/install-native-alerts.py هنگام بیلد آن را نصب می‌کند). */
interface BackgroundAlertsPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  start(options: { url: string; token: string; userId: string }): Promise<void>;
  stop(): Promise<void>;
}
const Plugin = registerPlugin<BackgroundAlertsPlugin>('BackgroundAlerts');

const STORE_KEY = 'school_finance_alert_token';
const REFRESH_AFTER_MS = 20 * 24 * 3600 * 1000; // توکن سمت سرور ۴۵ روز اعتبار دارد

export const canUseBackgroundAlerts = (): boolean =>
  Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('BackgroundAlerts');

interface Stored { token: string; userId: string; at: number }
const readStored = (): Stored | null => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
};

/**
 * اعلان‌های پس‌زمینه (وقتی برنامه بسته است): یک توکن فقط‌خواندنی از سرور می‌گیرد و کار دوره‌ای
 * اندروید را (هر ~۱۵ دقیقه) برای بررسی تراکنش/چک‌های نیازمند اقدام برنامه‌ریزی می‌کند.
 */
export async function enableBackgroundAlerts(user: { id: number | string }, webAppUrl: string): Promise<void> {
  if (!canUseBackgroundAlerts()) return;
  try {
    const stored = readStored();
    let token: string | null = stored && stored.userId === String(user.id) && Date.now() - stored.at < REFRESH_AFTER_MS ? stored.token : null;
    if (!token) {
      const r: any = await postToAppsScript({ action: 'alerts_register' }, webAppUrl);
      if (!r?.success || !r.alert_token) return;
      token = String(r.alert_token);
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ token, userId: String(user.id), at: Date.now() })); } catch { /* ignore */ }
    }
    await Plugin.requestPermission().catch(() => undefined);
    await Plugin.start({ url: webAppUrl, token, userId: String(user.id) });
  } catch (e) {
    console.warn('Background alerts setup failed:', e);
  }
}

/** هنگام خروج از حساب: کار پس‌زمینه متوقف و توکن سمت سرور باطل می‌شود. */
export async function disableBackgroundAlerts(webAppUrl: string): Promise<void> {
  const stored = readStored();
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  if (!canUseBackgroundAlerts()) return;
  try { await Plugin.stop(); } catch { /* ignore */ }
  if (stored?.token) {
    try { await postToAppsScript({ action: 'alerts_unregister', alert_token: stored.token }, webAppUrl); } catch { /* ignore */ }
  }
}
