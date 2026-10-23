/**
 * Jalali (Shamsi / Persian) Calendar Utilities
 * Faithfully mirrors FinanceDate.java logic
 */

export function latinDigits(str: string = ''): string {
  if (!str) return '';
  return str.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    return String(code >= 0x06f0 && code <= 0x06f9 ? code - 0x06f0 : code - 0x0660);
  });
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
  const s = latinDigits(String(jalaliStr)).trim().replace(/\s+\d{1,2}:\d{1,2}(:\d{1,2})?.*$/, '').trim();
  // 8-digit compact Jalali format: 14030715
  if (/^(13\d{2}|14\d{2})(\d{2})(\d{2})$/.test(s)) {
    const jy = Number(s.substring(0, 4));
    const jm = Number(s.substring(4, 6));
    const jd = Number(s.substring(6, 8));
    const [gy, gm, gd] = toGregorian(jy, jm, jd);
    return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
  }
  const match = s.match(/^(\d{4})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})$/);
  if (!match) {
    throw new Error('تاریخ را به صورت سال/ماه/روز وارد کنید.');
  }
  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);
  const [gy, gm, gd] = toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

export function jalaliFromGregorian(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const trimmed = latinDigits(String(isoStr)).trim();
    // If it's already a Jalali date string like 1403/07/15 or 1403-07-15
    const jalaliMatch = trimmed.match(/^(13\d{2}|14\d{2})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})/);
    if (jalaliMatch) {
      const jy = jalaliMatch[1];
      const jm = jalaliMatch[2].padStart(2, '0');
      const jd = jalaliMatch[3].padStart(2, '0');
      return `${jy}/${jm}/${jd}`;
    }

    const clean = trimmed.substring(0, 10);
    const parts = clean.split(/[\/\-]/).map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return isoStr;
    }
    const [gy, gm, gd] = parts;
    // If year is within Jalali range (1300-1500)
    if (gy >= 1300 && gy <= 1500) {
      return `${gy}/${String(gm).padStart(2, '0')}/${String(gd).padStart(2, '0')}`;
    }
    const [jy, jm, jd] = fromGregorian(gy, gm, gd);
    if (isNaN(jy) || isNaN(jm) || isNaN(jd)) {
      return isoStr;
    }
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
