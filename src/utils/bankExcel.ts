import * as XLSX from 'xlsx';
import type { BankAccount, BankTransaction } from '../types';
import { jalaliToIso } from './jalali';
import { normalizeCard, normalizeTerminal, toLatinDigits } from './bankReconcile';

/** Which Excel the user is importing. They are different files from the bank and are imported separately. */
export type BankExcelKind = 'pos' | 'statement';

export type ParsedBankRow = Omit<BankTransaction, 'id' | 'reconciled'> & { reconciled?: boolean };

export interface ParsedBankExcel {
  rows: ParsedBankRow[];
  feeRows: number;
  skippedNoAmount: number;
}

const normalizeHeader = (val: unknown) =>
  String(val ?? '')
    .replace(/[‌‏‪-‮\s_\-]/g, '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .toLowerCase();

const toAmount = (val: unknown): number => {
  if (typeof val === 'number') return Math.abs(val);
  const cleaned = toLatinDigits(val).replace(/[٬,،\s]/g, '').replace(/[^0-9.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : 0;
};

const pad2 = (n: number | string) => String(n).padStart(2, '0');

/** Returns an ISO date, or '' when the cell holds no usable date (the caller skips such a row). */
const toDate = (val: unknown): string => {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${pad2(val.getMonth() + 1)}-${pad2(val.getDate())}`;
  }
  if (typeof val === 'number' && val > 20000 && val < 90000) {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`;
  }
  const text = toLatinDigits(val).trim().replace(/\s+\d{1,2}:\d{1,2}(:\d{1,2})?.*$/, '').trim();
  const jalali = text.match(/^(13\d{2}|14\d{2})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})$/);
  if (jalali) {
    try { return jalaliToIso(`${jalali[1]}/${jalali[2]}/${jalali[3]}`); } catch { /* fall through */ }
  }
  const greg = text.match(/^(\d{4})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})$/);
  if (greg) return `${greg[1]}-${pad2(greg[2])}-${pad2(greg[3])}`;
  return '';
};

/**
 * Parses one bank Excel. `kind` decides how the rows are read — it is chosen by the user's button,
 * not guessed from the file. Rows never get a school here: that is decided later, only from registered
 * POS terminals and petty-cash cards.
 */
export function parseBankExcel(data: ArrayBuffer, kind: BankExcelKind, account: BankAccount): ParsedBankExcel {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  let rawRows: Record<string, unknown>[] = [];

  for (const sheetName of wb.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: '' });
    const headerIdx = matrix.slice(0, 20).findIndex((row) => {
      const h = row.map(normalizeHeader);
      return h.some((x) => x.includes('تاریخ') || x.includes('date')) &&
        h.some((x) => x.includes('مبلغ') || x.includes('amount') || x.includes('بدهکار') || x.includes('بستانکار'));
    });
    if (headerIdx < 0) continue;
    const headers = matrix[headerIdx].map((h) => String(h || '').trim());
    rawRows = matrix.slice(headerIdx + 1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r as unknown[])[i] ?? ''])));
    break;
  }
  if (!rawRows.length) throw new Error('ستون‌های تاریخ و مبلغ در این فایل اکسل پیدا نشد.');

  const isPos = kind === 'pos';
  const accountNumber = String(account.account_number || '');
  const accountSuffix = accountNumber.replace(/\D/g, '').slice(-3);
  const rows: ParsedBankRow[] = [];
  let feeRows = 0;
  let skippedNoAmount = 0;

  rawRows.forEach((row) => {
    const norm = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeHeader(k), v]));
    const find = (keywords: string[]) => {
      for (const kw of keywords) {
        const hit = Object.keys(norm).find((k) => k.includes(kw));
        if (hit && norm[hit] !== undefined && norm[hit] !== '') return norm[hit];
      }
      return '';
    };

    const debit = toAmount(find(['برداشت', 'بدهکار', 'debit', 'withdrawal']));
    const credit = toAmount(find(['واریز', 'بستانکار', 'credit', 'deposit']));
    const plain = toAmount(find(['مبلغ', 'amount']));
    const amount = isPos ? plain || credit : debit || credit || plain;
    if (!amount) { skippedNoAmount++; return; }

    const date = toDate(find(['تاریختراکنش', 'تاریخعملیات', 'تاریخ', 'date']));
    if (!date) { skippedNoAmount++; return; }

    const tracking = String(find(['شمارهپیگیری', 'کدپیگیری', 'پیگیری', 'سند', 'tracking', 'trace']) || '').trim();
    const ref = String(find(['شمارهارجاع', 'کدارجاع', 'شمارهمرجع', 'rrn', 'ref']) || '').trim();
    const terminal = normalizeTerminal(find(['پایانه', 'ترمینال', 'terminal']));
    const sourceCard = normalizeCard(find(['شمارهکارتبرداشت', 'کارتبرداشت', 'کارت مبدا', 'کارت مبدأ', 'sourcecard', 'شمارهکارت', 'کارت']));
    const card = sourceCard || normalizeCard(find(['کارتخرید', 'card']));
    const desc = String(find(['شرح', 'توضیحات', 'بابت', 'desc']) || '').trim();
    const feeAmount = toAmount(find(['کارمزد', 'fee']));

    const direction: 'deposit' | 'withdrawal' | 'pos_sale' = isPos ? 'pos_sale' : debit > 0 ? 'withdrawal' : 'deposit';
    if (!isPos && (/(کارمزد|پایا|ساتنا|fee|آبونمان|پیامک)/i.test(desc) || feeAmount > 0)) feeRows++;

    rows.push({
      date,
      amount,
      school_id: 0, // never guessed — see utils/bankReconcile.ownerOfRow
      tracking_code: tracking || ref || 'بانکی',
      reference_number: ref,
      terminal_number: terminal,
      card_number: card,
      source_card_number: direction === 'withdrawal' ? (sourceCard || card) : undefined,
      account_suffix: accountSuffix,
      bank_account: accountNumber || account.name,
      description: desc || (isPos ? `واریز پایانه پوز ${terminal}` : direction === 'withdrawal' ? 'برداشت بانکی' : 'واریزی بانکی'),
      direction,
      fee_amount: feeAmount || undefined,
      reconciled: false,
    });
  });

  return { rows, feeRows, skippedNoAmount };
}
