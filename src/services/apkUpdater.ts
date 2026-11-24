import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

/** پلاگین بومی اندروید (scripts/install-native-update.py هنگام بیلد آن را نصب می‌کند). */
interface ApkInstallerPlugin {
  canInstall(): Promise<{ allowed: boolean }>;
  openInstallSettings(): Promise<void>;
  install(options: { path: string }): Promise<void>;
}
const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');

export interface DownloadProgress { loaded: number; total: number }

/** دانلود و نصب داخل برنامه فقط روی اندروید و با پلاگین بومی ممکن است؛ در مرورگر/PWA فقط لینک باز می‌شود. */
export const canInstallInApp = (): boolean =>
  Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('ApkInstaller');

const MIN_APK_BYTES = 1024 * 1024;

/** APK را در حافظه‌ی موقت برنامه دانلود می‌کند و مسیر کامل فایل را برمی‌گرداند. */
export async function downloadApk(url: string, version: string, onProgress: (p: DownloadProgress) => void): Promise<string> {
  const safeVersion = version.replace(/[^0-9A-Za-z.+-]/g, '_');
  const path = `updates/SchoolFinanceApp-${safeVersion}.apk`;
  try { await Filesystem.deleteFile({ path, directory: Directory.Cache }); } catch { /* فایل قبلی وجود ندارد */ }

  const listener = await Filesystem.addListener('progress', (event: { url?: string; bytes?: number; contentLength?: number }) => {
    if (event.url && event.url !== url) return;
    onProgress({ loaded: Number(event.bytes) || 0, total: Number(event.contentLength) || 0 });
  });
  try {
    await Filesystem.downloadFile({ url, path, directory: Directory.Cache, recursive: true, progress: true });
  } finally {
    await listener.remove();
  }

  const stat = await Filesystem.stat({ path, directory: Directory.Cache });
  if (Number(stat.size) < MIN_APK_BYTES) {
    try { await Filesystem.deleteFile({ path, directory: Directory.Cache }); } catch { /* ignore */ }
    throw new Error('فایل دریافت‌شده کامل نیست؛ اینترنت را بررسی و دوباره تلاش کنید.');
  }
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

export type InstallResult = 'started' | 'needs_permission';

/** نصب APK دانلودشده؛ اگر اندروید اجازه‌ی «نصب از این منبع» را نداده باشد صفحه‌ی همان اجازه باز می‌شود. */
export async function installApk(path: string): Promise<InstallResult> {
  const { allowed } = await ApkInstaller.canInstall();
  if (!allowed) {
    await ApkInstaller.openInstallSettings();
    return 'needs_permission';
  }
  await ApkInstaller.install({ path });
  return 'started';
}
