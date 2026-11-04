import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface SaveFileOptions {
  /** ASCII-safe file name including extension, e.g. Parsian_Cheques_1405-08-13.xls */
  fileName: string;
  /** File content encoded as base64 (no data: prefix) */
  base64: string;
  mimeType?: string;
  dialogTitle?: string;
}

/**
 * Delivers a generated file to the user.
 * - Android/iOS (Capacitor): the WebView ignores <a download> and XLSX.writeFile, so the file is
 *   written to the app cache and the native share/save sheet is opened.
 * - Browser/PWA: regular blob download.
 * Throws on real failures so callers can show an error; a cancelled share sheet is not an error.
 */
export async function saveOrShareFile({ fileName, base64, mimeType, dialogTitle }: SaveFileOptions): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const path = `exports/${fileName}`;
    await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    try {
      await Share.share({ title: fileName, url: uri, dialogTitle: dialogTitle || 'ذخیره یا ارسال فایل' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/cancel/i.test(message)) return;
      throw error;
    }
    return;
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
