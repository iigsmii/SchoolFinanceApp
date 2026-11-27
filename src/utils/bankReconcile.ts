import type { BankAccount, BankTransaction, Cheque, School, Transaction } from '../types';
import { isUncollectedChequeTx } from './cheques';

/**
 * Pure bank-reconciliation logic (no React, no storage).
 *
 * Golden rule: a bank row is attached to a school ONLY through something the user registered —
 * a POS terminal number (school record or reconciliation rules) or a petty-cash card that carries a school.
 * There is NO default school; everything else stays "unassigned".
 * One terminal may be SHARED by several schools (e.g. morning and evening shifts): then the row belongs to
 * that group of schools until it is matched or registered for one of them.
 */

export interface PosTerminalRule { terminal: string; schoolId: number; schoolName?: string }
export interface PettyCardRule {
  card: string;
  managerName: string;
  managerId?: string | number;
  accountSuffix?: string;
  bankAccountId?: number;
  schoolId?: number;
  active?: boolean;
}

export type BankStream = 'pos' | 'petty' | 'fees' | 'other';

export const toLatinDigits = (val: unknown): string =>
  String(val ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export const normalizeCard = (val: unknown): string => toLatinDigits(val).replace(/\D/g, '');
export const normalizeTerminal = (val: unknown): string => toLatinDigits(val).replace(/\D/g, '').replace(/^0+/, '');

const splitTerminals = (val: unknown): string[] =>
  String(val ?? '')
    .split(/[,،;؛\n\s]+/)
    .map(normalizeTerminal)
    .filter(Boolean);

/* ------------------------------------------------------------------ terminals */

export interface TerminalRegistry {
  /** Every school a terminal was registered for (several = shared terminal). */
  schoolsOf: (terminal: unknown) => number[];
  /** The school of a terminal, or 0 when unregistered or shared by several schools. */
  schoolOf: (terminal: unknown) => number;
  isRegistered: (terminal: unknown) => boolean;
  /** Terminals registered for more than one school. */
  shared: Array<{ terminal: string; schoolIds: number[] }>;
}

export function buildTerminalRegistry(
  rules: PosTerminalRule[],
  schools: Pick<School, 'id' | 'pos_terminal_number'>[],
): TerminalRegistry {
  const map = new Map<string, Set<number>>();
  const add = (terminal: unknown, schoolId: unknown) => {
    const t = normalizeTerminal(terminal);
    const s = Number(schoolId || 0);
    if (!t || !s) return;
    if (!map.has(t)) map.set(t, new Set());
    map.get(t)!.add(s);
  };
  rules.forEach((r) => add(r.terminal, r.schoolId));
  schools.forEach((sc) => splitTerminals(sc.pos_terminal_number).forEach((t) => add(t, sc.id)));
  const schoolsOf = (terminal: unknown) => Array.from(map.get(normalizeTerminal(terminal)) || []);
  return {
    schoolsOf,
    schoolOf: (terminal) => {
      const list = schoolsOf(terminal);
      return list.length === 1 ? list[0] : 0;
    },
    isRegistered: (terminal) => schoolsOf(terminal).length > 0,
    shared: Array.from(map.entries())
      .filter(([, set]) => set.size > 1)
      .map(([terminal, set]) => ({ terminal, schoolIds: Array.from(set) })),
  };
}

/* ------------------------------------------------------------------ rows */

export function rowBelongsToAccount(row: BankTransaction, account: BankAccount | null): boolean {
  if (!account) return true;
  const rowAccount = String(row.bank_account || '').trim();
  const accountNumber = String(account.account_number || '').trim();
  if (rowAccount && (rowAccount === accountNumber || rowAccount === String(account.id) || rowAccount === String(account.name || ''))) return true;
  const suffix = accountNumber.replace(/\D/g, '').slice(-3);
  const rowSuffix = String(row.account_suffix || '').replace(/\D/g, '');
  return !!suffix && rowSuffix === suffix;
}

export function findPettyCard(row: BankTransaction, cards: PettyCardRule[], account: BankAccount | null): PettyCardRule | undefined {
  if (row.direction !== 'withdrawal') return undefined;
  const card = normalizeCard(row.source_card_number || row.card_number);
  if (!card) return undefined;
  return cards.find((c) =>
    c.active !== false &&
    normalizeCard(c.card) === card &&
    (!Number(c.bankAccountId) || !account || Number(c.bankAccountId) === Number(account.id)));
}

export function classifyStream(row: BankTransaction, registry: TerminalRegistry, cards: PettyCardRule[], account: BankAccount | null): BankStream {
  const desc = String(row.description || '').toLowerCase();
  const purpose = String(row.assigned_purpose || '');
  // A transfer description can mention a fee without the whole amount being a fee.
  const isTransfer = /(انتقال|کارت\s*به\s*کارت|واریز\s*به|برداشت\s*از|پایا|ساتنا)/i.test(desc);
  const isStandaloneFee = /(کارمزد|fee|commission|آبونمان|پیامک|service charge)/i.test(desc) && !isTransfer;
  const isFee = Number(row.fee_amount || 0) > 0 && row.direction !== 'pos_sale'
    ? true
    : isStandaloneFee || (purpose.includes('کارمزد') && !isTransfer);
  if (isFee && row.direction !== 'pos_sale') return 'fees';
  if (row.direction === 'pos_sale' || normalizeTerminal(row.terminal_number)) return 'pos';
  if (findPettyCard(row, cards, account)) return 'petty';
  return 'other';
}

export interface RowOwner {
  schoolId: number; // 0 = unassigned (or shared, see candidateSchoolIds)
  /** Schools that may own the row: the terminal's schools. Empty = unknown. */
  candidateSchoolIds: number[];
  managerName: string;
  managerId: string;
  cardNumber: string;
}

/** Who is responsible for a bank row. Never falls back to a default school. */
export function ownerOfRow(row: BankTransaction, registry: TerminalRegistry, cards: PettyCardRule[], account: BankAccount | null): RowOwner {
  const owner: RowOwner = { schoolId: 0, candidateSchoolIds: [], managerName: '', managerId: '', cardNumber: '' };
  const terminal = normalizeTerminal(row.terminal_number);
  if (terminal) {
    // A row with a terminal gets its school from the registered terminal only. A school stored on the row
    // by older app versions (default "school 1") is ignored.
    owner.candidateSchoolIds = registry.schoolsOf(terminal);
    owner.schoolId = owner.candidateSchoolIds.length === 1 ? owner.candidateSchoolIds[0] : 0;
    return owner;
  }
  const card = findPettyCard(row, cards, account);
  if (card) {
    owner.managerName = String(card.managerName || '').trim();
    owner.managerId = card.managerId === undefined || card.managerId === null ? '' : String(card.managerId);
    owner.cardNumber = normalizeCard(card.card);
    if (Number(card.schoolId) > 0) { owner.schoolId = Number(card.schoolId); owner.candidateSchoolIds = [owner.schoolId]; }
  }
  if (!owner.schoolId && Number(row.school_id) > 0 && (row.assigned_student_id || row.matched_transaction_id)) {
    owner.schoolId = Number(row.school_id);
    owner.candidateSchoolIds = [owner.schoolId];
  }
  return owner;
}

/* ------------------------------------------------------------------ matching */

export interface AutoMatch {
  bankId: number;
  txId: number;
  tier: 'reference' | 'petty_card' | 'pos_terminal';
  schoolId: number;
}

const MATCHABLE_KINDS = new Set(['شهریه', 'هزینه', 'دریافت متفرقه']);
const dayDiff = (a: string, b: string) => Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
const codeOf = (v: unknown) => toLatinDigits(v).trim();

const sameCode = (a: string, b: string) => {
  if (!a || !b) return false;
  if (a === b) return true;
  // Bank statements sometimes prefix/suffix the reference; only trust long codes for partial matches.
  return a.length >= 8 && b.length >= 8 && (a.endsWith(b) || b.endsWith(a));
};

export function autoMatchBankRows(
  bankRows: BankTransaction[],
  transactions: Transaction[],
  cheques: Cheque[],
  ctx: { registry: TerminalRegistry; cards: PettyCardRule[]; account: BankAccount | null },
): AutoMatch[] {
  const used = new Set<number>();
  transactions.forEach((t) => { if (t.reconciled) used.add(t.id); });

  const eligible = transactions.filter((t) =>
    !t.reconciled &&
    MATCHABLE_KINDS.has(t.kind) &&
    t.review_status !== 'rejected' &&
    t.review_status !== 'delete_pending' &&
    Number(t.amount) > 0 &&
    !isUncollectedChequeTx(t, cheques));

  const compatible = (b: BankTransaction, t: Transaction) =>
    b.direction === 'withdrawal' ? t.kind === 'هزینه' : t.kind !== 'هزینه';

  const out: AutoMatch[] = [];
  const open = bankRows.filter((b) => !b.reconciled && Number(b.amount) > 0);

  const take = (b: BankTransaction, t: Transaction, tier: AutoMatch['tier'], schoolId: number) => {
    used.add(t.id);
    out.push({ bankId: b.id, txId: t.id, tier, schoolId: schoolId || Number(t.school_id) || 0 });
  };
  const done = new Set<number>();

  // Tier 1 — the same reference/tracking code and the same amount.
  open.forEach((b) => {
    const codes = [b.tracking_code, b.reference_number, b.pos_reference_code].map(codeOf).filter((c) => c && c !== 'بانکی');
    if (!codes.length) return;
    const owner = ownerOfRow(b, ctx.registry, ctx.cards, ctx.account);
    const bankSchool = owner.schoolId;
    const hits = eligible.filter((t) =>
      !used.has(t.id) &&
      Number(t.amount) === Number(b.amount) &&
      compatible(b, t) &&
      (!owner.candidateSchoolIds.length || owner.candidateSchoolIds.includes(Number(t.school_id))) &&
      codes.some((c) => sameCode(c, codeOf(t.tracking_code))));
    if (hits.length === 1) { take(b, hits[0], 'reference', bankSchool); done.add(b.id); }
  });

  // Tier 2 — petty-cash withdrawal: registered card + same amount + expense paid by that card within 4 days.
  open.forEach((b) => {
    if (done.has(b.id)) return;
    const card = findPettyCard(b, ctx.cards, ctx.account);
    if (!card) return;
    const cardNo = normalizeCard(card.card);
    const hits = eligible.filter((t) => {
      if (used.has(t.id) || t.kind !== 'هزینه' || t.payment_source !== 'petty_cash') return false;
      if (Number(t.amount) !== Number(b.amount)) return false;
      const tCard = normalizeCard(t.petty_cash_card);
      if (!tCard || !(cardNo.endsWith(tCard.slice(-4)) || tCard.endsWith(cardNo.slice(-4)))) return false;
      if (Number(card.schoolId) > 0 && Number(t.school_id) !== Number(card.schoolId)) return false;
      return dayDiff(b.date, t.date) <= 4;
    });
    if (hits.length === 1) { take(b, hits[0], 'petty_card', Number(card.schoolId) || 0); done.add(b.id); }
  });

  // Tier 3 — POS settlement from a REGISTERED terminal: one of its schools, same amount, paid by card reader, ±3 days.
  open.forEach((b) => {
    if (done.has(b.id)) return;
    const terminal = normalizeTerminal(b.terminal_number);
    const schoolIds = terminal ? ctx.registry.schoolsOf(terminal) : [];
    if (!schoolIds.length) return;
    const hits = eligible.filter((t) => {
      if (used.has(t.id) || t.kind === 'هزینه' || !schoolIds.includes(Number(t.school_id))) return false;
      if (Number(t.amount) !== Number(b.amount)) return false;
      const viaPos = normalizeTerminal(t.pos_terminal_number) === terminal || /کارت\s*خوان|پوز|pos/i.test(String(t.payment_method || ''));
      return viaPos && dayDiff(b.date, t.date) <= 3;
    });
    if (hits.length === 1) { take(b, hits[0], 'pos_terminal', schoolIds.length === 1 ? schoolIds[0] : 0); done.add(b.id); }
  });

  return out;
}

/* ------------------------------------------------------------------ report */

export interface ResponsibleGroup {
  key: string;
  kind: 'petty' | 'school' | 'shared' | 'unassigned';
  title: string;
  schoolId: number;
  schoolIds: number[];
  managerName: string;
  rows: BankTransaction[];
  total: number;
}

export interface TerminalSummary { terminal: string; count: number; total: number; schoolIds: number[] }

export interface AccountReport {
  groups: ResponsibleGroup[];
  unregisteredCount: number;
  unregisteredTotal: number;
  unknownTerminals: TerminalSummary[];
  sharedTerminals: TerminalSummary[];
  feeRows: BankTransaction[];
}

export function buildAccountReport(
  rows: BankTransaction[],
  ctx: { registry: TerminalRegistry; cards: PettyCardRule[]; account: BankAccount | null; schools: Pick<School, 'id' | 'name'>[] },
): AccountReport {
  const groups = new Map<string, ResponsibleGroup>();
  const unknown = new Map<string, TerminalSummary>();
  const shared = new Map<string, TerminalSummary>();
  const feeRows: BankTransaction[] = [];
  let unregisteredCount = 0;
  let unregisteredTotal = 0;
  const schoolName = (id: number) => ctx.schools.find((s) => s.id === id)?.name || `مدرسه ${id}`;

  rows.forEach((row) => {
    const stream = classifyStream(row, ctx.registry, ctx.cards, ctx.account);
    if (stream === 'fees') { if (!row.reconciled) feeRows.push(row); return; }
    if (row.reconciled) return;
    const owner = ownerOfRow(row, ctx.registry, ctx.cards, ctx.account);
    const amount = Number(row.amount || 0);
    unregisteredCount++;
    unregisteredTotal += amount;

    let key: string;
    let kind: ResponsibleGroup['kind'];
    let title: string;
    if (owner.managerName || owner.cardNumber) {
      key = `petty|${owner.managerId || owner.managerName}|${owner.cardNumber}`;
      kind = 'petty';
      title = `کارت تن‌خواه ${owner.managerName || 'بدون نام'} (…${owner.cardNumber.slice(-4)})`;
    } else if (owner.schoolId) {
      key = `school|${owner.schoolId}`;
      kind = 'school';
      title = schoolName(owner.schoolId);
    } else if (owner.candidateSchoolIds.length > 1) {
      const ids = [...owner.candidateSchoolIds].sort((a, b) => a - b);
      key = `shared|${ids.join(',')}`;
      kind = 'shared';
      title = `پایانه مشترک: ${ids.map(schoolName).join(' / ')}`;
    } else {
      key = 'unassigned';
      kind = 'unassigned';
      title = 'بدون مدرسه / مدیر مشخص';
    }
    if (!groups.has(key)) groups.set(key, { key, kind, title, schoolId: owner.schoolId, schoolIds: owner.candidateSchoolIds, managerName: owner.managerName, rows: [], total: 0 });
    const g = groups.get(key)!;
    g.rows.push(row);
    g.total += amount;

    const terminal = normalizeTerminal(row.terminal_number);
    if (terminal && !owner.schoolId) {
      const target = ctx.registry.isRegistered(terminal) ? shared : unknown;
      const cur = target.get(terminal) || { terminal, count: 0, total: 0, schoolIds: ctx.registry.schoolsOf(terminal) };
      cur.count++;
      cur.total += amount;
      target.set(terminal, cur);
    }
  });

  const order = { petty: 0, school: 1, shared: 2, unassigned: 3 } as const;
  return {
    groups: Array.from(groups.values()).sort((a, b) => order[a.kind] - order[b.kind] || b.rows.length - a.rows.length),
    unregisteredCount,
    unregisteredTotal,
    unknownTerminals: Array.from(unknown.values()).sort((a, b) => b.count - a.count),
    sharedTerminals: Array.from(shared.values()),
    feeRows,
  };
}
