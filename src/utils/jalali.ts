/**
 * Jalali (Shamsi / Persian) Calendar Utilities
 * Faithfully mirrors FinanceDate.java logic
 */

export function latinDigits(str: string = ''): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return result;
}

export function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  if (jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : 30)) {
    throw new Error('تاریخ شمسی معتبر نیست.');
  }

  const gdm = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const jdm = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  let days = 365 * (jy - 979) + Math.floor((jy - 979) / 33) * 8 + Math.floor((((jy - 979) % 33) + 3) / 4);
  for (let i = 1; i < jm; i++) days += jdm[i];
  days += jd - 1;

  let gday = days + 79;
  let gy = 1600 + 400 * Math.floor(gday / 146097);
  gday %= 146097;

  let leap = true;
  if (gday >= 36525) {
    gday--;
    gy += 100 * Math.floor(gday / 36524);
    gday %= 36524;
    if (gday >= 365) gday++;
  }

  gy += 4 * Math.floor(gday / 1461);
  gday %= 1461;

  if (gday >= 366) {
    leap = false;
    gday--;
    gy += Math.floor(gday / 365);
    gday %= 365;
  }

  let gm = 1;
  while (gday >= gdm[gm] + (gm === 2 && leap ? 1 : 0)) {
    gday -= gdm[gm] + (gm === 2 && leap ? 1 : 0);
    gm++;
  }

  const g: [number, number, number] = [gy, gm, gday + 1];
  const back = fromGregorian(g[0], g[1], g[2]);
  if (back[0] !== jy || back[1] !== jm || back[2] !== jd) {
    throw new Error('روز انتخاب‌شده در این ماه وجود ندارد.');
  }

  return g;
}

export function fromGregorian(gy: number, gm: number, gd: number): [number, number, number] {
  const gdm = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const gy2 = gy - 1600;
  const gm2 = gm - 1;
  const gd2 = gd - 1;

  let gday = 365 * gy2 + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400);
  for (let i = 0; i < gm2; i++) gday += gdm[i + 1];
  if (gm > 2 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) gday++;
  gday += gd2;

  const jday = gday - 79;
  let jy = 979 + 33 * Math.floor(jday / 12053);
  let rem = jday % 12053;
  jy += 4 * Math.floor(rem / 1461);
  rem %= 1461;

  if (rem >= 366) {
    jy += Math.floor((rem - 1) / 365);
    rem = (rem - 1) % 365;
  }

  let jm: number;
  let jd: number;
  if (rem < 186) {
    jm = 1 + Math.floor(rem / 31);
    jd = 1 + (rem % 31);
  } else {
    jm = 7 + Math.floor((rem - 186) / 30);
    jd = 1 + ((rem - 186) % 30);
  }

  return [jy, jm, jd];
}

export function daysInMonth(y: number, m: number): number {
  if (m <= 6) return 31;
  if (m < 12) return 30;
  try {
    toGregorian(y, 12, 30);
    return 30;
  } catch {
    return 29;
  }
}

export function jalaliToIso(jalaliStr: string): string {
  if (!jalaliStr) throw new Error('تاریخ الزامی است.');
  const s = latinDigits(jalaliStr).trim();
  if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
    throw new Error('تاریخ را به صورت سال/ماه/روز وارد کنید.');
  }
  const [jy, jm, jd] = s.split('/').map(Number);
  const [gy, gm, gd] = toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

export function jalaliFromGregorian(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const clean = isoStr.substring(0, 10);
    const [gy, gm, gd] = clean.split('-').map(Number);
    const [jy, jm, jd] = fromGregorian(gy, gm, gd);
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  } catch {
    return isoStr;
  }
}

export function todayJalali(): string {
  const now = new Date();
  const [jy, jm, jd] = fromGregorian(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

export function todayGregorian(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatRial(n: number | string): string {
  if (n === undefined || n === null || n === '') return '۰';
  const num = typeof n === 'string' ? Number(latinDigits(n).replace(/[,٬]/g, '').trim()) : n;
  if (isNaN(num)) return '۰';
  return num.toLocaleString('fa-IR');
}

export function formatNumberLatin(n: number | string): string {
  if (n === undefined || n === null || n === '') return '0';
  const num = typeof n === 'string' ? Number(latinDigits(n).replace(/[,٬]/g, '').trim()) : n;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

export const JALALI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];
