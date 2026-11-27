import * as XLSX from 'xlsx';
import type { BankAccount, BankTransaction } from '../types';
import { jalaliToIso } from './jalali';
import { normalizeCard, normalizeTerminal, toLatinDigits } from './bankReconcile';

/** Which Excel the user is importing. They are different files from the bank and are imported separately. */
export type BankExcelKind = 'pos' | 'statement';

/**
 * Known layouts. Every bank/PSP exports a different layout, so each one gets its own exact column mapping:
 *  - pos_shaparak:      POS (card reader) transaction report of the PSP — one row per card payment.
 *  - saderat_statement: Bank Saderat account statement ("صورت حساب").
 *  - generic:           best-effort header based reading for layouts we have not seen yet.
 */
export type BankExcelFormat = 'pos_shaparak' | 'saderat_statement' | 'generic';

export type ParsedBankRow = Omit<BankTransaction, 'id' | 'reconciled'> & { reconciled?: boolean };

export interface ParsedBankExcel {
  rows: ParsedBankRow[];
  format: BankExcelFormat;
  /** Account number written in the file header ('' when the file has none). */
  fileAccount: string;
  feeRows: number;
  skippedNoAmount: number;
  skippedOld: number;
  skippedReversal: number;
  firstDate: string;
  lastDate: string;
}

export interface ParseOptions {
  /** ISO date: older rows are skipped (so a whole year of statement does not flood the managers). */
  fromDate?: string;
}

const normalizeHeader = (val: unknown) =>
  String(val ?? '')
    .replace(/[‌‏‪-‮\s_:：]/g, '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .toLowerCase();

const clean = (val: unknown) => String(val ?? '').replace(/[‌‏]/g, '').replace(/\s+/g, ' ').trim();

const toAmount = (val: unknown): number => {
  if (typeof val === 'number') return Math.abs(val);
  const cleaned = toLatinDigits(val).replace(/[٬,،\s]/g, '').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : 0;
};

const pad2 = (n: number | string) => String(n).padStart(2, '0');

/** ISO date from a Jalali ("1405/07/28", "14050728"), Gregorian, Date or Excel serial. '' when unusable. */
export const toIsoDate = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${pad2(val.getMonth() + 1)}-${pad2(val.getDate())}`;
  }
  if (typeof val === 'number' && val > 20000 && val < 90000) {
    const d = XLSX.SSF.parse_date_code(val);
    return d ? `${d.y}-${pad2(d.m)}-${pad2(d.d)}` : '';
  }
  const text = toLatinDigits(val).trim().replace(/\s+\d{1,2}:\d{1,2}(:\d{1,2})?.*$/, '').trim();
  if (/^(13|14)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(text) || /^(13|14)\d{2}[\/\-. ]\d{1,2}[\/\-. ]\d{1,2}$/.test(text)) {
    const m = text.match(/^(\d{4})[\/\-. ]?(\d{1,2})[\/\-. ]?(\d{1,2})$/);
    if (m) {
      try { return jalaliToIso(`${m[1]}/${m[2]}/${m[3]}`); } catch { return ''; }
    }
  }
  const greg = text.match(/^(\d{4})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})$/);
  if (greg) return `${greg[1]}-${pad2(greg[2])}-${pad2(greg[3])}`;
  return '';
};

/** "94457" -> "09:44:57", "81852" -> "08:18:52", "09:22:00" stays. */
const toTime = (val: unknown): string => {
  const text = toLatinDigits(val).trim();
  if (!text) return '';
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) return text.length <= 5 ? `${text}:00` : text;
  if (/^\d{3,6}$/.test(text)) {
    const p = text.padStart(6, '0');
    return `${p.slice(0, 2)}:${p.slice(2, 4)}:${p.slice(4, 6)}`;
  }
  return '';
};

const codeText = (val: unknown) => toLatinDigits(val).replace(/\s+/g, ' ').trim();

/** Header cells and the account number printed above the table. */
function locateTable(matrix: unknown[][]): { headerIdx: number; headers: string[]; fileAccount: string } | null {
  const headerIdx = matrix.slice(0, 30).findIndex((row) => {
    const h = row.map(normalizeHeader);
    return h.some((x) => x.includes('تاریخ') || x.includes('date')) &&
      h.some((x) => x.includes('مبلغ') || x.includes('amount') || x.includes('بدهکار') || x.includes('بستانکار') || x === 'برداشت' || x === 'واریز');
  });
  if (headerIdx < 0) return null;
  let fileAccount = '';
  for (const row of matrix.slice(0, headerIdx)) {
    row.forEach((cell, i) => {
      if (fileAccount || !/شماره\s*حساب/.test(String(cell ?? ''))) return;
      const next = row.slice(i + 1).find((c) => /^\d{8,}$/.test(toLatinDigits(c).trim()));
      const prev = row.slice(0, i).reverse().find((c) => /^\d{8,}$/.test(toLatinDigits(c).trim()));
      const found = next ?? prev;
      if (found !== undefined) fileAccount = toLatinDigits(found).trim();
    });
  }
  return { headerIdx, headers: matrix[headerIdx].map((h) => String(h ?? '').trim()), fileAccount };
}

export function detectFormat(headers: string[]): BankExcelFormat {
  const h = new Set(headers.map(normalizeHeader));
  if (h.has('کدپایانه') && h.has('کدارجاع') && h.has('مبلغ') && h.has('شمارهپیگیری')) return 'pos_shaparak';
  if (h.has('شرحتراکنش') && h.has('برداشت') && h.has('واریز')) return 'saderat_statement';
  return 'generic';
}

export const sameAccountNumber = (a: string, b: string) => {
  const x = normalizeCard(a).replace(/^0+/, '');
  const y = normalizeCard(b).replace(/^0+/, '');
  return !!x && !!y && (x === y || x.endsWith(y) || y.endsWith(x));
};

/**
 * Parses one bank Excel. `kind` is chosen by the user's button; a file whose layout is clearly the other kind is
 * rejected with a clear message instead of being imported wrongly. Rows never get a school here — that is decided
 * later, only from registered POS terminals and petty-cash cards.
 */
export function parseBankExcel(data: ArrayBuffer, kind: BankExcelKind, account: BankAccount, options: ParseOptions = {}): ParsedBankExcel {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  let table: ReturnType<typeof locateTable> = null;
  let matrix: unknown[][] = [];
  for (const sheetName of wb.SheetNames) {
    matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: '' });
    table = locateTable(matrix);
    if (table) break;
  }
  if (!table) throw new Error('ستون‌های تاریخ و مبلغ در این فایل اکسل پیدا نشد.');

  const format = detectFormat(table.headers);
  if (format === 'pos_shaparak' && kind === 'statement') throw new Error('این فایل «گزارش تراکنش‌های پوز» است؛ آن را با دکمه‌ی «ورود اکسل پوز» وارد کنید.');
  if (format === 'saderat_statement' && kind === 'pos') throw new Error('این فایل «صورت‌حساب بانکی» است؛ آن را با دکمه‌ی «ورود اکسل صورتحساب» وارد کنید.');

  const accountNumber = String(account.account_number || '');
  const accountSuffix = accountNumber.replace(/\D/g, '').slice(-3);
  const result: ParsedBankExcel = {
    rows: [], format, fileAccount: table.fileAccount, feeRows: 0, skippedNoAmount: 0, skippedOld: 0, skippedReversal: 0, firstDate: '', lastDate: '',
  };

  const push = (row: ParsedBankRow) => {
    if (options.fromDate && row.date < options.fromDate) { result.skippedOld++; return; }
    if (!result.firstDate || row.date < result.firstDate) result.firstDate = row.date;
    if (!result.lastDate || row.date > result.lastDate) result.lastDate = row.date;
    result.rows.push(row);
  };

  const body = matrix.slice(table.headerIdx + 1);
  const headerKeys = table.headers.map(normalizeHeader);
  const exact = (cells: unknown[]) => {
    const get = (name: string) => {
      const i = headerKeys.indexOf(normalizeHeader(name));
      return i >= 0 ? cells[i] : '';
    };
    return get;
  };

  body.forEach((cells) => {
    if (!cells.some((c) => c !== '' && c !== null && c !== undefined)) return;
    const get = exact(cells);

    /* ------------------------------------------------- POS report of the PSP */
    if (format === 'pos_shaparak') {
      if (!/^\d+$/.test(toLatinDigits(get('ردیف')).trim())) return; // footer / blank lines
      if (/(برگشت|ابطال|مرجوع|reversal|void)/i.test(clean(get('نوع تراکنش')))) { result.skippedReversal++; return; }
      const amount = toAmount(get('مبلغ'));
      const date = toIsoDate(get('تاریخ تراکنش'));
      if (!amount || !date) { result.skippedNoAmount++; return; }
      const terminal = normalizeTerminal(get('کد پایانه'));
      const fee = toAmount(get('کارمزد'));
      push({
        date,
        amount,
        school_id: 0, // never guessed — see utils/bankReconcile.ownerOfRow
        tracking_code: codeText(get('شماره پیگیری')),
        reference_number: codeText(get('کد ارجاع')),
        terminal_number: terminal,
        account_suffix: accountSuffix,
        bank_account: accountNumber || account.name,
        description: `واریز پایانه پوز ${terminal}`,
        direction: 'pos_sale',
        fee_amount: fee || undefined,
        transaction_time: toTime(get('ساعت تراکنش')),
        settlement_date: toIsoDate(get('تاریخ واریز')),
        reconciled: false,
      });
      return;
    }

    /* ------------------------------------------------- Bank Saderat statement */
    if (format === 'saderat_statement') {
      if (!/^\d+$/.test(toLatinDigits(get('ردیف')).trim())) return; // footer / blank lines
      const withdrawal = toAmount(get('برداشت'));
      const deposit = toAmount(get('واریز'));
      const amount = withdrawal || deposit;
      const date = toIsoDate(get('تاریخ'));
      if (!amount || !date) { result.skippedNoAmount++; return; }
      const title = clean(get('شرح تراکنش'));
      const psp = clean(get('PSP'));
      const channel = clean(get('کد کاربری'));
      const direction: 'deposit' | 'withdrawal' = withdrawal > 0 ? 'withdrawal' : 'deposit';
      // A stand-alone bank fee (e.g. balance-inquiry fee). "transfer + fee" rows are real transfers.
      const standaloneFee = direction === 'withdrawal' && /^کارمزد/.test(title);
      if (standaloneFee) result.feeRows++;
      const balance = toAmount(get('مانده'));
      push({
        date,
        amount,
        school_id: 0,
        tracking_code: codeText(get('شماره پیگیری')),
        reference_number: codeText(get('شماره مرجع/قرارداد')),
        pos_reference_code: codeText(get('فیش / حواله')),
        // The "serial" column of a purchase is the SHOP's terminal, so it is deliberately not a terminal_number.
        source_card_number: normalizeCard(get('شماره کارت مبدا')) || undefined,
        destination_card_number: normalizeCard(get('شماره کارت مقصد')) || undefined,
        card_number: normalizeCard(get('شماره کارت مبدا')) || normalizeCard(get('شماره کارت مقصد')) || undefined,
        account_suffix: accountSuffix,
        bank_account: accountNumber || account.name,
        description: [title, psp && psp !== title ? psp : '', channel && !/^\d+$/.test(channel) ? `(${channel})` : ''].filter(Boolean).join(' · ') || (direction === 'withdrawal' ? 'برداشت بانکی' : 'واریزی بانکی'),
        direction,
        fee_amount: standaloneFee ? amount : undefined,
        balance: balance || undefined,
        transaction_time: toTime(get('ساعت')),
        reconciled: false,
      });
      return;
    }

    /* ------------------------------------------------- unknown layout: header based, best effort */
    const norm = Object.fromEntries(Object.entries(Object.fromEntries(table!.headers.map((h, i) => [h, cells[i] ?? '']))).map(([k, v]) => [normalizeHeader(k), v]));
    const find = (keywords: string[]) => {
      for (const kw of keywords) {
        const hit = Object.keys(norm).find((k) => k.includes(normalizeHeader(kw)));
        if (hit && norm[hit] !== undefined && norm[hit] !== '') return norm[hit];
      }
      return '';
    };
    const debit = toAmount(find(['برداشت', 'بدهکار', 'debit', 'withdrawal']));
    const credit = toAmount(find(['واریز', 'بستانکار', 'credit', 'deposit']));
    const plain = toAmount(find(['مبلغ', 'amount']));
    const isPos = kind === 'pos';
    const amount = isPos ? plain || credit : debit || credit || plain;
    const date = toIsoDate(find(['تاریخ تراکنش', 'تاریخ عملیات', 'تاریخ', 'date']));
    if (!amount || !date) { result.skippedNoAmount++; return; }
    const terminal = normalizeTerminal(find(['پایانه', 'ترمینال', 'terminal']));
    const sourceCard = normalizeCard(find(['کارت مبدا', 'کارت مبدأ', 'کارت برداشت', 'sourcecard']));
    const direction: 'deposit' | 'withdrawal' | 'pos_sale' = isPos ? 'pos_sale' : debit > 0 ? 'withdrawal' : 'deposit';
    const desc = clean(find(['شرح', 'توضیحات', 'بابت', 'desc']));
    push({
      date,
      amount,
      school_id: 0,
      tracking_code: codeText(find(['شماره پیگیری', 'کد پیگیری', 'پیگیری', 'tracking', 'trace'])),
      reference_number: codeText(find(['شماره ارجاع', 'کد ارجاع', 'شماره مرجع', 'rrn'])),
      terminal_number: terminal,
      source_card_number: sourceCard || undefined,
      account_suffix: accountSuffix,
      bank_account: accountNumber || account.name,
      description: desc || (isPos ? `واریز پایانه پوز ${terminal}` : direction === 'withdrawal' ? 'برداشت بانکی' : 'واریزی بانکی'),
      direction,
      reconciled: false,
    });
  });

  return result;
}
