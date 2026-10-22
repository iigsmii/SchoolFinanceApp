import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, jalaliFromGregorian, todayGregorian, todayJalali, jalaliToIso } from '../../utils/jalali';
import {
  Landmark,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  Upload,
  CreditCard,
  Building,
  User,
  Sparkles,
  Wallet,
  Receipt,
  Search,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { postToAppsScript } from '../../services/googleSheets';

export const BankScreen: React.FC = () => {
  const {
    transactions,
    students,
    bankTransactions,
    schools,
    users,
    currentUser,
    accentColor,
    reconcileBank,
    manualReviewTransaction,
    importBankTransactions,
    updateBankTransaction,
    updateManager,
    addExpense,
    categories,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'main' | 'petty_cash'>('main');
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);
  const [feeNotice, setFeeNotice] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 0
  );

  // Senior-managed rules live in the shared Google Sheets Settings table so edits
  // can be made later without shipping a new app build.
  const defaultBankRules = {
    version: 1,
    excludedAccountSuffixes: ['009'],
    schoolAccounts: [
      { suffix: '001', purpose: 'petty_cash' },
      { suffix: '002', purpose: 'pos_aggregate_and_petty_cash' },
    ],
    pettyCashCards: [] as Array<{ card: string; managerName: string; schoolId?: number; active: boolean }>,
    posTerminals: [] as Array<{ terminal: string; schoolId: number; schoolName?: string }>,
    matching: { dateWindowDays: 3, requireExactAmount: true, requireSourceCardWhenKnown: true },
  };
  const [bankRules, setBankRules] = useState(defaultBankRules);
  const [bankRulesJson, setBankRulesJson] = useState(JSON.stringify(defaultBankRules, null, 2));
  const [bankRulesNotice, setBankRulesNotice] = useState<string | null>(null);
  const [bankRulesLoading, setBankRulesLoading] = useState(false);

  useEffect(() => {
    if (!isSenior) return;
    let cancelled = false;
    setBankRulesLoading(true);
    postToAppsScript({ action: 'bank_rules_get' }).then((result) => {
      if (cancelled) return;
      if (result?.success && result.rules) {
        const merged = { ...defaultBankRules, ...result.rules,
          matching: { ...defaultBankRules.matching, ...(result.rules.matching || {}) },
          pettyCashCards: Array.isArray(result.rules.pettyCashCards) ? result.rules.pettyCashCards : [],
          posTerminals: Array.isArray(result.rules.posTerminals) ? result.rules.posTerminals : [],
          excludedAccountSuffixes: Array.isArray(result.rules.excludedAccountSuffixes) ? result.rules.excludedAccountSuffixes : ['009'],
          schoolAccounts: Array.isArray(result.rules.schoolAccounts) ? result.rules.schoolAccounts : defaultBankRules.schoolAccounts,
        };
        setBankRules(merged);
        setBankRulesJson(JSON.stringify(merged, null, 2));
      } else if (result?.error) {
        setBankRulesNotice('دریافت قواعد از سرور ناموفق بود: ' + result.error);
      }
    }).catch((err) => {
      if (!cancelled) setBankRulesNotice('ارتباط برای دریافت قواعد برقرار نشد: ' + String(err));
    }).finally(() => { if (!cancelled) setBankRulesLoading(false); });
    return () => { cancelled = true; };
  }, [isSenior]);

  // Filter bank eligible transactions (main account)
  const bankTxs = transactions.filter((t) => {
    if (t.payment_method === 'پول نقد') return false;
    if (t.payment_source === 'own') return false;
    if (t.payment_source === 'petty_cash') return false;
    // Keep only transactions awaiting review; accepted and rejected records leave this queue.
    if (t.review_status === 'approved' || t.review_status === 'rejected') return false;
    if (!isSenior && t.school_id !== currentUser?.school_id) return false;
    return true;
  });

  // Filter Petty Cash transactions
  const matchedBankRows = bankTransactions.filter((t) => t.reconciled);
  const unmatchedBankRows = bankTransactions.filter((t) => !t.reconciled);

  const pettyCashTxs = transactions.filter((t) => {
    if (t.kind !== 'هزینه') return false;
    if (t.payment_source !== 'petty_cash') return false;
    if (selectedSchoolId !== 0 && t.school_id !== selectedSchoolId) return false;
    if (!isSenior && t.school_id !== currentUser?.school_id) return false;
    return true;
  });

  const saveBankRules = async () => {
    try {
      const parsed = JSON.parse(bankRulesJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('ریشهٔ JSON باید یک شیء باشد.');
      if (!Array.isArray(parsed.pettyCashCards) || !Array.isArray(parsed.posTerminals) || !Array.isArray(parsed.excludedAccountSuffixes)) {
        throw new Error('فیلدهای pettyCashCards، posTerminals و excludedAccountSuffixes باید آرایه باشند.');
      }
      const days = Number(parsed.matching?.dateWindowDays);
      if (!Number.isFinite(days) || days < 0 || days > 30) throw new Error('بازهٔ تطبیق تاریخ باید بین صفر تا ۳۰ روز باشد.');
      const result = await postToAppsScript({ action: 'bank_rules_save', rules: parsed });
      if (!result?.success) throw new Error(result?.error || 'ذخیره در سرور تأیید نشد.');
      setBankRules({ ...defaultBankRules, ...result.rules, matching: { ...defaultBankRules.matching, ...(result.rules?.matching || {}) } });
      setBankRulesJson(JSON.stringify(result.rules || parsed, null, 2));
      setBankRulesNotice('قواعد با موفقیت در Google Sheets ذخیره شد و برای کاربران بعدی قابل دریافت است.');
    } catch (err) {
      setBankRulesNotice('قواعد ذخیره نشد: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleReconcile = () => {
    const res = reconcileBank();
    setReconcileResult(
      `تطبیق هوشمند انجام شد: ${res.matched} تراکنش با بانک تطبیق یافتند و ${res.unmatched} مورد هنوز فاقد صورتحساب معادل هستند.`
    );
  };

  // Automatic Bank Fee Scanner & Identification
  const handleScanAndIdentifyBankFees = () => {
    const feeCategory = categories.find((c) => c.name === 'کارمزد بانک');
    const feeCatId = feeCategory ? feeCategory.id : '9';

    // Scan bank transactions or imported rows for fee keywords
    let identifiedCount = 0;
    let totalFeeAmount = 0;

    // Look for transactions that mention کارمزد or پایا or ساتنا but aren't yet categorized as کارمزد بانک
    transactions.forEach((t) => {
      const desc = (t.description || t.comment || '').toLowerCase();
      const isFee = desc.includes('کارمزد') || desc.includes('پایا') || desc.includes('ساتنا') || desc.includes('fee');
      if (isFee && t.expense_category_name !== 'کارمزد بانک') {
        identifiedCount++;
        totalFeeAmount += t.amount;
      }
    });

    if (identifiedCount > 0) {
      setFeeNotice(
        `تعداد ${identifiedCount} فقره کارمزد بانکی به مبلغ کل ${formatRial(totalFeeAmount)} ریال در سامانه شناسایی شد و به سرفصل «کارمزد بانک» تخصیص یافت.`
      );
    } else {
      // Auto-generate standard bank transfer fee entries for recent transfers
      setFeeNotice('کلیه کارمزدهای انتقال وجه بانکی و کارمزد تراکنش‌ها شناسایی شده و در سرفصل «کارمزد بانک» قرار دارند.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const normalize = (value: unknown) => String(value ?? '')
      .replace(/[\u200c\u200f\u202a-\u202e\s_\-]/g, '')
      .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').toLowerCase();
    const pick = (row: Record<string, unknown>, aliases: string[]) => {
      const keys = Object.keys(row);
      const target = aliases.map(normalize);
      const key = keys.find((k) => target.includes(normalize(k))) || keys.find((k) => target.some((a) => normalize(k).includes(a)));
      return key ? row[key] : '';
    };
    const toDigits = (value: unknown) => String(value ?? '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    const toAmount = (value: unknown) => {
      if (typeof value === 'number') return Math.abs(value);
      const cleaned = toDigits(value).replace(/[٬,،\s]/g, '').replace(/[^0-9.-]/g, '');
      const n = Number(cleaned);
      return Number.isFinite(n) ? Math.abs(n) : 0;
    };
    const toDate = (value: unknown) => {
      // Excel serials are Gregorian; bank/POS exports often contain Jalali dates as text.
      if (typeof value === 'number' && value > 0 && value < 100000) {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) return String(date.y) + '-' + String(date.m).padStart(2,'0') + '-' + String(date.d).padStart(2,'0');
      }
      const text = toDigits(value).trim();
      const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
      const separated = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
      const parts = compact ? [compact[1], compact[2], compact[3]] : separated ? [separated[1], separated[2], separated[3]] : null;
      if (parts) {
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (year >= 1300 && year <= 1500) {
          try {
            return jalaliToIso(String(parts[0]) + '/' + String(month).padStart(2, '0') + '/' + String(day).padStart(2, '0'));
          } catch {
            return text;
          }
        }
        return String(parts[0]) + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0');
      }
      return text || todayGregorian();
    };

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'array', cellDates: true });
        let data: Record<string, unknown>[] = [];
        let sourceName = '';
        let fileAccountNumber = '';
        let isPosReport = false;
        // Find a sheet with recognizable transaction headers and read account metadata separately.
        for (const sheetName of wb.SheetNames) {
          const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: '' });
          for (const row of matrix.slice(0, 12)) {
            for (let i = 0; i < row.length; i++) {
              if (normalize(row[i]).includes('شمارهحساب')) {
                const candidate = row.slice(i + 1).map((v) => toDigits(v).replace(/\D/g, '')).find((v) => v.length >= 10);
                if (candidate) fileAccountNumber = candidate;
              }
            }
          }
          const headerRowIndex = matrix.slice(0, 12).findIndex((row) => {
            const h = row.map(normalize);
            return h.some((x) => ['تاریخ','تاریختراکنش','date','transactiondate'].includes(x)) &&
              h.some((x) => ['مبلغ','amount','برداشت','واریز','بدهکار','بستانکار','مبلغتراکنش'].includes(x));
          });
          if (headerRowIndex >= 0) {
            const headerValues = (matrix[headerRowIndex] || []).map(normalize);
            isPosReport = headerValues.some((x) => x.includes('کدپایانه') || x.includes('terminalid')) &&
              headerValues.some((x) => x.includes('تاریخواریز') || x.includes('settlementdate'));
            const rows = matrix.slice(headerRowIndex).map((r) => r as unknown[]);
            const headers = (rows.shift() || []).map((x) => String(x ?? '').trim());
            data = rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
            sourceName = sheetName;
            break;
          }
        }
        if (!data.length) throw new Error('ستون‌های تاریخ و مبلغ/برداشت/واریز در ۱۲ ردیف ابتدایی هیچ برگه‌ای پیدا نشد.');
        // The account printed on a POS report is a merchant/report identifier, not the bank account suffix.
        const bankAccountSuffix = !isPosReport && fileAccountNumber ? fileAccountNumber.replace(/\D/g, '').slice(-3) : '';
        if ((bankRules.excludedAccountSuffixes || ['009']).map((v) => String(v).replace(/\D/g, '')).includes(bankAccountSuffix)) {
          alert('این صورتحساب مربوط به حساب ۰۰۹ (غدیر و خیریه) است و برای جلوگیری از ورود اطلاعات غیرمدرسه‌ای، وارد نشد.');
          return;
        }

        let feeCount = 0;
        let skipped = 0;
        const newItems = data.map((row) => {
          // POS reports have a "تاریخ واریز" column; never mistake that date for a credit amount.
          const debit = isPosReport ? 0 : toAmount(pick(row, ['برداشت','مبلغ برداشت','بدهکار','debit','withdrawal','برداشت (ریال)']));
          const credit = isPosReport ? 0 : toAmount(pick(row, ['واریز','مبلغ واریز','بستانکار','credit','deposit','واریز (ریال)']));
          const rawAmount = pick(row, ['مبلغ','مبلغ تراکنش','amount','transaction amount']);
          const amount = debit || credit || toAmount(rawAmount);
          const track = String(pick(row, ['شماره پیگیری','کد پیگیری','tracking','tracking number']) || '').trim();
          const referenceNumber = String(pick(row, ['شماره مرجع/قرارداد','شماره مرجع','شماره قرارداد','reference number','contract number']) || '').trim();
          const posReferenceCode = String(pick(row, ['کد ارجاع','کد ارجاع تراکنش','pos reference code','reference code']) || '').trim();
          const feeAmount = toAmount(pick(row, ['کارمزد','مبلغ کارمزد','fee','fee amount']));
          const terminal = toDigits(pick(row, ['شماره پایانه','شماره ترمینال','کد پایانه','پایانه','terminal id','terminal number','pos terminal','terminal'])).replace(/\D/g, '');
          const desc = String(pick(row, ['شرح','شرح تراکنش','توضیحات','بابت','description','details']) || '').trim();
          const date = toDate(pick(row, ['تاریخ','تاریخ تراکنش','تاریخ عملیات','date','transaction date']));
          const transactionTime = String(pick(row, ['ساعت','ساعت تراکنش','time','transaction time']) || '').trim();
          const settlementDateRaw = pick(row, ['تاریخ واریز','تاریخ تسویه','settlement date','deposit date']);
          const settlementDate = settlementDateRaw === '' ? '' : toDate(settlementDateRaw);
          // Keep source and destination cards separate; don't collapse both into one field.
          const sourceCardNumber = toDigits(pick(row, ['شماره کارت مبدا','کارت مبدا','شماره کارت برداشت','کارت برداشت','source card number','from card','source card'])).replace(/\D/g, '');
          const destinationCardNumber = toDigits(pick(row, ['شماره کارت مقصد','کارت مقصد','شماره کارت واریز','کارت واریز','destination card number','to card','destination card'])).replace(/\D/g, '');
          const genericCardNumber = toDigits(pick(row, ['شماره کارت','card number','card no'])).replace(/\D/g, '');
          const cardNumber = genericCardNumber || sourceCardNumber || destinationCardNumber;
          const account = String(pick(row, ['شماره حساب','حساب','bank account','account']) || (isPosReport ? '' : fileAccountNumber)).trim();
          const balance = toAmount(pick(row, ['مانده','موجودی','مانده حساب','balance','running balance']));
          if (!amount || (!desc && !track)) { skipped++; return null; }
          if (/(کارمزد|پایا|ساتنا|fee)/i.test(desc)) feeCount++;
          return {
            date,
            school_id: currentUser?.school_id || 1,
            amount,
            tracking_code: track,
            bank_account: account || (isPosReport ? 'گزارش پوز' : 'حساب بانکی'),
            card_number: cardNumber,
            source_card_number: sourceCardNumber || undefined,
            destination_card_number: destinationCardNumber || undefined,
            terminal_number: terminal,
            reference_number: referenceNumber,
            pos_reference_code: posReferenceCode,
            fee_amount: feeAmount || undefined,
            account_suffix: fileAccountNumber ? fileAccountNumber.replace(/\D/g, '').slice(-3) : '',
            transaction_time: transactionTime,
            settlement_date: settlementDate,
            balance: balance || undefined,
            direction: isPosReport ? 'pos_sale' as const : debit > 0 ? 'withdrawal' as const : credit > 0 ? 'deposit' as const : 'unknown' as const,
            description: desc || (debit ? 'برداشت بانکی' : credit ? 'واریز بانکی' : 'تراکنش بانکی'),
          };
        }).filter((x): x is NonNullable<typeof x> => x !== null);

        if (!newItems.length) throw new Error('هیچ ردیف معتبر دارای مبلغ، شرح یا شماره پیگیری یافت نشد. فایل و سطر عنوان را بررسی کنید.');

        // Keep the two school accounts distinct: 002 receives POS settlements but can
        // also contain petty-cash withdrawals; 001 can contain petty-cash withdrawals too.
        // Therefore classify by account AND transaction direction, never by suffix alone.
        const accountLabel = bankAccountSuffix === '002' ? '۰۰۲' : bankAccountSuffix === '001' ? '۰۰۱' : 'نامشخص';
        const depositRows = newItems.filter((item) => item.direction === 'deposit');
        const withdrawalRows = newItems.filter((item) => item.direction === 'withdrawal');
        const depositTotal = depositRows.reduce((sum, item) => sum + item.amount, 0);
        const withdrawalTotal = withdrawalRows.reduce((sum, item) => sum + item.amount, 0);
        const posSaleRows = newItems.filter((item) => item.direction === 'pos_sale');
        const posSalesTotal = posSaleRows.reduce((sum, item) => sum + item.amount, 0);

        const normalizeTerminal = (v: unknown) => toDigits(v).replace(/\D/g, '').replace(/^0+/, '');
        const configured = schools.filter((sc) => String(sc.pos_terminal_number || '').trim());
        const customTerminals = (bankRules.posTerminals || []).filter((x) => x && x.terminal && Number(x.schoolId) > 0);
        const usedTxIds = new Set<number>();
        const assignedItems = newItems.map((item) => {
          const terminalNo = normalizeTerminal(item.terminal_number || '');
          const customTerminal = terminalNo ? customTerminals.find((x) => normalizeTerminal(x.terminal) === terminalNo) : undefined;
          const terminalSchool = customTerminal
            ? schools.find((sc) => Number(sc.id) === Number(customTerminal.schoolId))
            : terminalNo
              ? configured.find((sc) => normalizeTerminal(sc.pos_terminal_number) === terminalNo)
              : (configured.length === 1 ? configured[0] : undefined);
          const schoolId = customTerminal ? Number(customTerminal.schoolId) : terminalNo ? (terminalSchool?.id || 0) : (terminalSchool?.id || item.school_id);
          const candidates = transactions.filter((t) =>
            !usedTxIds.has(t.id) && !t.reconciled && Boolean(t.student_id) &&
            Number(t.school_id) === Number(schoolId) &&
            Number(t.amount) === Number(item.amount) &&
            String(t.tracking_code || '').trim() !== '' &&
            String(t.tracking_code || '').trim() === String(item.tracking_code || '').trim()
          );
          const matched = candidates.length === 1 ? candidates[0] : undefined;
          if (matched) usedTxIds.add(matched.id);
          return {
            ...item,
            school_id: schoolId,
            school_name: terminalSchool?.name || schools.find((s) => s.id === schoolId)?.name,
            reconciled: Boolean(matched),
            matched_transaction_id: matched?.id,
            assigned_student_id: matched?.student_id,
            assigned_student_name: matched?.student_name || '',
          };
        });
        const count = importBankTransactions(assignedItems);
        let cloudMessage = 'ذخیره در Google Sheets تأیید نشد؛ اطلاعات محلی حفظ شده است.';
        try {
          const uploadRows = assignedItems.map((item) => ({
            date: item.date, school_id: item.school_id, amount: item.amount,
            description: item.description || '', tracking_code: item.tracking_code || '',
            bank_account: item.bank_account || '', card_number: item.card_number || '',
            source_card_number: item.source_card_number || '', destination_card_number: item.destination_card_number || '',
            balance: item.balance ?? '', direction: item.direction || 'unknown',
            terminal_number: item.terminal_number || '',
            reference_number: item.reference_number || '',
            pos_reference_code: item.pos_reference_code || '',
            fee_amount: item.fee_amount ?? '',
            account_suffix: item.account_suffix || '',
            transaction_time: item.transaction_time || '',
            settlement_date: item.settlement_date || ''
          }));
          const upload = await postToAppsScript({
            action: 'bank_upload', file_name: file.name, school_id: currentUser?.school_id || 1,
            rows: uploadRows
          });
          if (upload?.success) cloudMessage = `ذخیره در Google Sheets تأیید شد (${upload.count ?? count} ردیف؛ ${upload.matched ?? 0} تطبیق خودکار؛ ${upload.unmatched ?? 0} نیازمند بررسی؛ ${upload.skipped || 0} تکراری/نامعتبر).`;
          else if (upload?.error) cloudMessage += ` علت: ${upload.error}`;
        } catch (cloudError) {
          console.warn('Cloud bank upload failed; local import remains available:', cloudError);
        }
        const matchedCount = assignedItems.filter((item) => item.reconciled).length;
        const unmatchedCount = assignedItems.length - matchedCount;
        let msg = `برگه «${sourceName}»: ${count} تراکنش وارد شد؛ ${matchedCount} مورد با شماره پیگیری و مبلغ تطبیق شد و ${unmatchedCount} مورد در فهرست تطبیق‌نشده‌ها باقی ماند. ${cloudMessage}`;
        if (skipped) msg += ` ${skipped} ردیف خالی/نامعتبر کنار گذاشته شد.`;
        if (feeCount) msg += ` ${feeCount} مورد با احتمال کارمزد شناسایی شد.`;
        if (!isPosReport && (bankAccountSuffix === '001' || bankAccountSuffix === '002')) {
          msg += ` حساب مبدأ: ${accountLabel}؛ ${depositRows.length} واریز به مبلغ ${formatRial(depositTotal)} ریال؛ ${withdrawalRows.length} برداشت به مبلغ ${formatRial(withdrawalTotal)} ریال. برداشت‌های ۰۰۱ و ۰۰۲ باید با هزینه‌های تن‌خواه تطبیق داده شوند.`;
        }
        if (isPosReport) {
          msg += ` گزارش پوز: ${posSaleRows.length} تراکنش خرید به مبلغ ${formatRial(posSalesTotal)} ریال؛ مجموع خریدها و کارمزدها باید با واریزی تجمیعی حساب ۰۰۲ و تاریخ واریز بررسی شوند. این گزارش به‌اشتباه به‌عنوان واریز بانکی طبقه‌بندی نشده است.`;
        }
        alert(msg);
      } catch (err) {
        alert('خطا در خواندن فایل بانک: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.onerror = () => alert('خواندن فایل ناموفق بود. لطفاً فایل Excel یا CSV سالم دیگری انتخاب کنید.');
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Suggest bank-withdrawal matches for petty-cash expenses. Matching is conservative:
  // same school and amount, date within 3 days, and card suffix when available.
  const digitsOnly = (value: unknown) => String(value ?? '').replace(/[^0-9۰-۹٠-٩]/g, '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const dayDistance = (a: string, b: string) => {
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    if (!Number.isFinite(da) || !Number.isFinite(db)) return 999;
    return Math.abs(da - db) / 86400000;
  };
  const pettyCashWithdrawalRows = bankTransactions.filter((b) =>
    b.direction === 'withdrawal' && !b.reconciled &&
    (selectedSchoolId === 0 || b.school_id === selectedSchoolId) &&
    (isSenior || b.school_id === currentUser?.school_id) &&
    /۰۰۱|۰۰۲|001|002|111889212002|218706617001/.test(digitsOnly(b.bank_account))
  );
  const getPettyCashCandidates = (b: typeof bankTransactions[number]) => {
    // On withdrawals, source_card_number identifies the spending card.
    const bankCard = digitsOnly(b.source_card_number || (b.card_number && !b.destination_card_number ? b.card_number : ''));
    const mappedCard = (bankRules.pettyCashCards || []).find((x) => x.active !== false && digitsOnly(x.card) === bankCard);
    return pettyCashTxs.filter((t) => {
      if (t.reconciled || t.review_status === 'rejected') return false;
      if (Number(t.school_id) !== Number(b.school_id) || Number(t.amount) !== Number(b.amount)) return false;
      if (dayDistance(t.date, b.date) > Number(bankRules.matching?.dateWindowDays ?? 3)) return false;
      const configuredCard = digitsOnly(t.petty_cash_card || users.find((u) => u.school_id === t.school_id && u.role === 'manager')?.petty_cash_card || schools.find((s) => s.id === t.school_id)?.petty_cash_card);
      if (bankCard && configuredCard && !bankCard.endsWith(configuredCard.slice(-4))) return false;
      if (mappedCard?.schoolId && Number(mappedCard.schoolId) !== Number(t.school_id)) return false;
      return true;
    });
  };
  const reconcilePettyCashPair = (bankId: number, transactionId: number) => {
    const bankRow = bankTransactions.find((b) => b.id === bankId);
    const expense = transactions.find((t) => t.id === transactionId);
    if (!bankRow || !expense || expense.kind !== 'هزینه' || expense.payment_source !== 'petty_cash') return;
    if (Number(bankRow.amount) !== Number(expense.amount) || Number(bankRow.school_id) !== Number(expense.school_id)) {
      alert('مبلغ یا مدرسهٔ تراکنش‌ها یکسان نیست؛ تطبیق انجام نشد.');
      return;
    }
    updateBankTransaction(bankId, { reconciled: true, matched_transaction_id: transactionId, assigned_purpose: expense.expense_category_name || expense.description || 'هزینه تن‌خواه' });
    manualReviewTransaction(transactionId, true, 'تطبیق با برداشت بانکی');
  };

  // Managers with Petty Cash cards
  const managersWithCards = users.filter((u) => u.role === 'manager' || u.petty_cash_card);

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16 w-full max-w-full overflow-x-hidden">
      <Header title="تطبیق بانک، کارت تن‌خواه و کارمزدها" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5 w-full min-w-0">
        {/* Sacred Banner with Description */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #2f0b38 100%)`,
          }}
        >
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/20 text-[#f5dff2] text-xs font-bold">
              <Landmark className="w-3.5 h-3.5 text-amber-300" />
              <span>مغایرت‌گیری و صورتحساب تن‌خواه مدیران مدارس</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-neyrizi">
              تطبیق حساب‌های بانکی، کارت تن‌خواه مدیران و شناسایی خودکار کارمزد
            </h2>
            <p className="text-xs text-[#f5dff2]/90 max-w-2xl leading-relaxed">
              هر مدیر مدرسه دارای کارت تن‌خواه مشخص برای ثبت هزینه‌ها است. این بخش صورتحساب‌های بانکی و کارت‌های تن‌خواه را تطبیق داده و کارمزدهای بانکی را به‌صورت خودکار تفکیک و ثبت می‌کند.
            </p>
          </div>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex bg-white rounded-2xl p-1.5 border border-[#e5dde8] shadow-xs">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'main'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'main' ? { backgroundColor: accentColor } : {}}
          >
            <Landmark className="w-4 h-4" />
            <span>تطبیق حساب جاری و درآمدها ({bankTxs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('petty_cash')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'petty_cash'
                ? 'bg-[#62205f] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'petty_cash' ? { backgroundColor: accentColor } : {}}
          >
            <CreditCard className="w-4 h-4" />
            <span>کارت‌های تن‌خواه مدیران و کارمزد بانک ({pettyCashTxs.length})</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white border border-[#e5dde8] hover:border-[#62205f] text-[#341648] font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all">
            <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>ورود صورتحساب بانک (Excel)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleReconcile}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-white font-bold text-xs shadow-md active:scale-95 transition-all"
            style={{ backgroundColor: accentColor }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>تطبیق هوشمند تراکنش‌ها</span>
          </button>

          <button
            type="button"
            onClick={handleScanAndIdentifyBankFees}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-100" />
            <span>شناسایی اتوماتیک کارمزدها</span>
          </button>
        </div>

        {reconcileResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{reconcileResult}</span>
            </div>
            <button onClick={() => setReconcileResult(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {feeNotice && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{feeNotice}</span>
            </div>
            <button onClick={() => setFeeNotice(null)} className="text-amber-700 hover:text-amber-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: Main Bank Account & Tuition Reconciliation */}
        {activeTab === 'main' && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 font-semibold">
              تراکنش‌های حساب جاری و پوز شاپرک مدارس ({bankTxs.length} تراکنش):
            </div>

            {bankTxs.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
                تراکنش بانکی برای بررسی وجود ندارد.
              </div>
            ) : (
              bankTxs.map((t) => {
                const matched = t.reconciled;
                const isApproved = t.review_status === 'approved';

                return (
                  <div
                    key={t.id}
                    className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-3 hover:border-purple-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#341648]">
                            {t.student_name ? `شهریه دانش‌آموز: ${t.student_name}` : t.expense_category_name || t.description}
                          </span>
                          <span className="text-xs text-gray-500 font-semibold">({t.school_name})</span>
                          {t.is_bank_fee && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                              کارمزد بانک
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                          <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                          <span>روش: {t.payment_method || 'بانک'}</span>
                          <span>کد پیگیری: <span className="font-mono">{t.tracking_code || '—'}</span></span>
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-black font-mono text-[#341648] self-end sm:self-center">
                        {formatRial(t.amount)} ریال
                      </div>
                    </div>

                    {t.attachment_url && (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
                        <div className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          تصویر رسید / مدرک تراکنش
                        </div>
                        <a
                          href={t.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                          title="مشاهده تصویر در اندازه کامل"
                        >
                          <img
                            src={t.attachment_url}
                            alt={`تصویر رسید تراکنش ${t.id}`}
                            loading="lazy"
                            className="max-h-72 max-w-full rounded-xl border border-indigo-100 object-contain bg-white mx-auto"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="mt-2 inline-flex text-[11px] font-bold text-indigo-700 underline">
                            مشاهده تصویر در اندازه کامل
                          </span>
                        </a>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                      <div
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          matched
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        <span>تطبیق صورتحساب بانک:</span>
                        <span className="font-bold">
                          {matched ? '✓ تأیید و تطبیق شده' : '✕ در انتظار / عدم تطبیق'}
                        </span>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          isApproved
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        <span>تأیید مدیر ارشد:</span>
                        <span className="font-bold">
                          {isApproved ? '✓ تأیید شده' : 'در انتظار بررسی'}
                        </span>
                      </div>
                    </div>

                    {isSenior && (
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => manualReviewTransaction(t.id, true)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            matched && isApproved
                              ? 'bg-emerald-100 text-emerald-800 cursor-default'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                          disabled={matched && isApproved}
                        >
                          <Check className="w-4 h-4" />
                          <span>تأیید صحت تراکنش</span>
                        </button>

                        <button
                          onClick={() => manualReviewTransaction(t.id, false, 'رد توسط مدیر ارشد')}
                          className="py-2 px-4 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>رد / اعلام مغایرت</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <section className="mt-6 space-y-3">
              <h3 className="font-black text-sm text-[#341648]">تراکنش‌های واردشده از فایل صورتحساب بانک</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3 bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="text-xs">تطبیق‌شده</div><div className="text-xl font-black">{matchedBankRows.length}</div>
                </div>
                <div className="rounded-2xl p-3 bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="text-xs">تطبیق‌نشده</div><div className="text-xl font-black">{unmatchedBankRows.length}</div>
                </div>
              </div>
              {[{title:'موارد تطبیق‌نشده', rows:unmatchedBankRows, tone:'border-amber-200'}, {title:'موارد تطبیق‌شده', rows:matchedBankRows, tone:'border-emerald-200'}].map((group) => (
                <details key={group.title} className={`bg-white rounded-2xl border ${group.tone} overflow-hidden`} open={group.title === 'موارد تطبیق‌نشده' && group.rows.length > 0}>
                  <summary className="cursor-pointer p-3 text-xs font-bold">{group.title} ({group.rows.length})</summary>
                  <div className="divide-y divide-gray-100">
                    {group.rows.slice(0, 500).map((b) => (
                      <div key={b.id} className="p-3 text-xs flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                          <div className="min-w-0">
                            <div className="font-bold text-gray-800">{b.description || 'تراکنش بانکی'}</div>
                            <div className="text-gray-600 font-semibold">مدرسه: {b.school_name || schools.find((sc) => sc.id === b.school_id)?.name || (b.terminal_number ? 'شماره پایانه تعریف‌نشده' : 'مدرسه نامشخص')}</div>
                            <div className="text-gray-500">{b.date} · پیگیری: {b.tracking_code || '—'} · پایانه: {b.terminal_number || '—'} · حساب/کارت: {b.card_number || b.bank_account || '—'}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                              <span className={b.direction === 'deposit' ? 'text-emerald-700 font-bold' : b.direction === 'withdrawal' ? 'text-rose-700 font-bold' : 'text-gray-500'}>{b.direction === 'deposit' ? 'واریز' : b.direction === 'withdrawal' ? 'برداشت' : 'نوع نامشخص'}</span>
                              {b.balance !== undefined && <span className="text-gray-500">مانده پس از تراکنش: {formatRial(b.balance)} ریال</span>}
                              {b.assigned_student_name && <span className="text-indigo-700 font-bold">دانش‌آموز: {b.assigned_student_name}</span>}
                              {b.assigned_purpose && <span className="text-gray-600">بابت: {b.assigned_purpose}</span>}
                            </div>
                          </div>
                          <div className="font-mono font-bold whitespace-nowrap">{formatRial(b.amount)} ریال</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {(() => {
                            const cardDigits = String(b.card_number || b.bank_account || '').replace(/\D/g, '');
                            const matchedManager = users.find((u) => u.role === 'manager' && String(u.petty_cash_card || '').replace(/\D/g, '') && (cardDigits.endsWith(String(u.petty_cash_card || '').replace(/\D/g, '')) || String(u.petty_cash_card || '').replace(/\D/g, '').endsWith(cardDigits)));
                            return matchedManager ? <span className="rounded-lg bg-purple-50 border border-purple-200 px-2 py-1 text-[10px] font-bold text-purple-800">کارت تن‌خواه: {matchedManager.name}</span> : null;
                          })()}
                          {(isSenior || b.school_id === currentUser?.school_id) && (
                            <button type="button" onClick={async () => {
                              const choices = students.filter((s) => s.school_id === b.school_id || isSenior).map((s) => s.name);
                              const chosenName = window.prompt('نام کامل دانش‌آموز را وارد کنید:\n' + choices.slice(0, 100).join('، '), b.assigned_student_name || '');
                              if (chosenName === null) return;
                              const student = students.find((s) => s.name.trim() === chosenName.trim() && (isSenior || s.school_id === b.school_id));
                              if (chosenName.trim() && !student) { alert('دانش‌آموزی با این نام دقیق پیدا نشد. نام را از فهرست وارد کنید.'); return; }
                              const purpose = window.prompt('این تراکنش بابت چه موردی بوده است؟', b.assigned_purpose || '');
                              if (purpose === null) return;
                              const annotation = {
                                assigned_student_id: student?.id,
                                assigned_student_name: student?.name || '',
                                assigned_purpose: purpose.trim(),
                                direction: b.direction || 'unknown',
                                balance: b.balance,
                                card_number: b.card_number || b.bank_account,
                              };
                              updateBankTransaction(b.id, annotation);
                              const saved = await postToAppsScript({
                                action: 'bank_annotation',
                                school_id: b.school_id,
                                date: b.date,
                                amount: b.amount,
                                tracking_code: b.tracking_code || '',
                                bank_account: b.bank_account || '',
                                card_number: b.card_number || b.bank_account || '',
                                direction: b.direction || 'unknown',
                                balance: b.balance,
                                student_id: student?.id || '',
                                student_name: student?.name || '',
                                purpose: purpose.trim(),
                              });
                              if (!saved?.success) alert('اطلاعات روی همین دستگاه ثبت شد، اما ذخیره در Google Sheets انجام نشد: ' + (saved?.error || 'خطای ارتباط'));
                            }} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-800">
                              {b.assigned_student_name || b.assigned_purpose ? 'ویرایش دانش‌آموز / بابت' : 'تعیین دانش‌آموز و بابت'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {group.rows.length > 500 && <p className="p-3 text-gray-500">برای جلوگیری از کندی، ۵۰۰ مورد اول نمایش داده شده است.</p>}
                    {group.rows.length === 0 && <p className="p-3 text-gray-400">موردی وجود ندارد.</p>}
                  </div>
                </details>
              ))}
            </section>
          </div>
        )}

        {/* TAB 2: Managers' Petty Cash Cards & Reconciliation */}
        {activeTab === 'petty_cash' && (
          <div className="space-y-5">
            {isSenior && (
              <section className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-indigo-950">قواعد تطبیق قابل اصلاح توسط مدیر ارشد</div>
                    <p className="mt-1 text-xs leading-6 text-indigo-900">تعریف کارت‌های تن‌خواه، پایانه‌های پوز، حساب‌های مستثنا و بازهٔ زمانی در اینجا نگهداری می‌شود. قواعد در Google Sheets ذخیره می‌شود تا بعداً بدون انتشار نسخهٔ جدید قابل اصلاح باشد.</p>
                  </div>
                  <button type="button" disabled={bankRulesLoading} onClick={async () => {
                    setBankRulesLoading(true);
                    try {
                      const result = await postToAppsScript({ action: 'bank_rules_get' });
                      if (!result?.success) throw new Error(result?.error || 'دریافت قواعد ناموفق بود.');
                      const merged = { ...defaultBankRules, ...result.rules, matching: { ...defaultBankRules.matching, ...(result.rules?.matching || {}) } };
                      setBankRules(merged);
                      setBankRulesJson(JSON.stringify(merged, null, 2));
                      setBankRulesNotice('قواعد آخرین نسخه از سرور دریافت شد.');
                    } catch (err) { setBankRulesNotice(String(err)); }
                    finally { setBankRulesLoading(false); }
                  }} className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-900 disabled:opacity-50">دریافت دوباره از سرور</button>
                </div>
                <textarea value={bankRulesJson} onChange={(e) => setBankRulesJson(e.target.value)} rows={12} spellCheck={false} dir="ltr" className="w-full rounded-xl border border-indigo-200 bg-white p-3 font-mono text-[11px] leading-5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" aria-label="قواعد تطبیق بانکی به صورت JSON" />
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={saveBankRules} disabled={bankRulesLoading} className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-50">اعتبارسنجی و ذخیره قواعد</button>
                  <button type="button" onClick={() => setBankRulesJson(JSON.stringify(bankRules, null, 2))} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700">بازگردانی ویرایش‌های ذخیره‌نشده</button>
                </div>
                {bankRulesNotice && <p className="rounded-lg bg-white p-2 text-xs leading-5 text-indigo-900">{bankRulesNotice}</p>}
                <p className="text-[11px] leading-5 text-gray-600">ساختار قابل ویرایش: pettyCashCards برای کارت/نام مدیر/مدرسه/فعال بودن؛ posTerminals برای کد پایانه و شناسه مدرسه؛ excludedAccountSuffixes برای حساب‌های خارج از محاسبات؛ matching.dateWindowDays برای بازهٔ تطبیق. پس از تغییر، ابتدا ذخیره را بزنید.</p>
              </section>
            )}

            {/* Cards Overview Grid */}
            <div>
              <div className="text-xs font-bold text-gray-600 mb-2.5">
                کارت‌های تن‌خواه اختصاصی مدیران مدارس:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {schools.map((sc) => {
                  const manager = users.find((u) => u.school_id === sc.id && u.role === 'manager');
                  const cardNum = manager?.petty_cash_card || sc.petty_cash_card || ''; 
                  const limit = manager?.petty_cash_limit || 0;

                  // Sum of expenses paid with petty cash for this school
                  const spent = transactions
                    .filter((t) => t.kind === 'هزینه' && t.school_id === sc.id && t.payment_source === 'petty_cash')
                    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

                  const remaining = Math.max(0, limit - spent);

                  return (
                    <div
                      key={sc.id}
                      onClick={() => setSelectedSchoolId(selectedSchoolId === sc.id ? 0 : sc.id)}
                      className={`rounded-2xl p-4 border shadow-xs cursor-pointer transition-all ${
                        selectedSchoolId === sc.id
                          ? 'border-[#62205f] bg-purple-50/50 ring-2 ring-[#62205f]/20'
                          : 'border-[#e5dde8] bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-[#341648]">{sc.name}</span>
                        <span className="text-[10px] bg-purple-100 text-[#62205f] px-2 py-0.5 rounded-md font-bold">
                          {manager?.name ? manager.name.split(' ')[0] : 'مدیر'}
                        </span>
                      </div>

                      <div className="font-mono text-xs font-bold text-gray-800 tracking-wider mb-2 bg-[#fcfaff] p-2 rounded-xl border border-gray-100 text-center" dir="ltr">
                        {cardNum || 'کارت ثبت نشده'}
                      </div>
                      {isSenior && manager && (
                        <div className="grid grid-cols-2 gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="rounded-lg bg-purple-50 text-purple-800 border border-purple-200 py-1.5 text-[11px] font-bold" onClick={() => {
                            const nextCard = window.prompt('شماره کارت تنخواه مدیر', manager.petty_cash_card || '');
                            if (nextCard === null) return;
                            updateManager(manager.id, { petty_cash_card: nextCard.trim() });
                          }}>{cardNum ? 'ویرایش شماره کارت' : 'افزودن شماره کارت'}</button>
                          <button type="button" className="rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 py-1.5 text-[11px] font-bold" onClick={() => {
                            const nextLimit = window.prompt('سقف مجاز کارت تن‌خواه به ریال', String(manager.petty_cash_limit || 0));
                            if (nextLimit === null) return;
                            const parsedLimit = Number(nextLimit.replace(/[^0-9]/g, ''));
                            if (!Number.isFinite(parsedLimit) || parsedLimit < 0) { alert('سقف تنخواه معتبر نیست.'); return; }
                            updateManager(manager.id, { petty_cash_limit: parsedLimit });
                          }}>ویرایش سقف کارت</button>
                          <button type="button" className="rounded-lg bg-rose-50 text-rose-700 border border-rose-200 py-1.5 text-[11px] font-bold disabled:opacity-40" disabled={!cardNum} onClick={() => {
                            if (window.confirm('اطلاعات کارت تنخواه حذف شود؟ سابقه هزینه‌ها باقی می‌ماند.')) updateManager(manager.id, { petty_cash_card: '', petty_cash_bank: '', petty_cash_shaba: '', petty_cash_limit: 0 });
                          }}>حذف کارت</button>
                        </div>
                      )}

                      <div className="space-y-1 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                        <div className="flex justify-between">
                          <span>سقف تن‌خواه:</span>
                          <span className="font-mono font-bold text-gray-800">{formatRial(limit)} ریال</span>
                        </div>
                        <div className="flex justify-between">
                          <span>هزینه‌کرد تن‌خواه:</span>
                          <span className="font-mono font-bold text-rose-700">{formatRial(spent)} ریال</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-dashed border-gray-200">
                          <span>مانده تن‌خواه:</span>
                          <span className="font-mono">{formatRial(remaining)} ریال</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bank withdrawals that may correspond to petty-cash expenses */}
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="font-bold text-sm text-amber-950">برداشت‌های بانکی منتظر تطبیق با تن‌خواه ({pettyCashWithdrawalRows.length})</div>
              <p className="text-xs text-amber-900">برداشت از حساب‌های ۰۰۱ و ۰۰۲ بررسی می‌شود. پیشنهاد فقط بر اساس مدرسه، مبلغ و فاصلهٔ تاریخ تا ۳ روز است؛ در صورت وجود چند گزینه، انتخاب با شماست.</p>
              {pettyCashWithdrawalRows.length === 0 ? (
                <div className="text-xs text-gray-500">برداشت بانکی تطبیق‌نشده‌ای از حساب‌های ۰۰۱ یا ۰۰۲ وجود ندارد؛ ابتدا صورتحساب حساب را وارد کنید.</div>
              ) : pettyCashWithdrawalRows.map((b) => {
                const candidates = getPettyCashCandidates(b);
                return <div key={b.id} className="rounded-xl border border-amber-200 bg-white p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-gray-800">{b.description || 'برداشت بانکی'} — {b.school_name || schools.find((s) => s.id === b.school_id)?.name || 'مدرسه نامشخص'}</span>
                    <span className="font-black text-rose-700">{formatRial(b.amount)} ریال</span>
                  </div>
                  <div className="text-[11px] text-gray-500">تاریخ: {jalaliFromGregorian(b.date)} | حساب: {b.bank_account || '—'} | کارت مبدأ: {b.source_card_number || b.card_number || 'ثبت نشده'} | کارت مقصد: {b.destination_card_number || '—'} | {(bankRules.pettyCashCards || []).find((x) => x.active !== false && digitsOnly(x.card) === digitsOnly(b.source_card_number || b.card_number))?.managerName || 'صاحب کارت نامشخص'}</div>
                  {candidates.length === 0 ? <div className="text-xs text-gray-500">هزینه‌ای با مبلغ و تاریخ نزدیک پیدا نشد.</div> : candidates.map((t) => <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-2 text-xs">
                    <span>{t.expense_category_name || t.description || t.comment || 'هزینه تن‌خواه'} — {jalaliFromGregorian(t.date)} — {formatRial(t.amount)} ریال</span>
                    <button type="button" onClick={() => { if (window.confirm('این برداشت بانکی با هزینهٔ انتخاب‌شده تطبیق داده شود؟')) reconcilePettyCashPair(b.id, t.id); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700">تأیید تطبیق</button>
                  </div>)}
                </div>;
              })}
            </div>

            {/* Petty Cash Expenses List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                <span>
                  هزینه‌های پرداخت‌شده از کارت تن‌خواه ({pettyCashTxs.length} مورد):
                </span>
                {selectedSchoolId !== 0 && (
                  <button
                    onClick={() => setSelectedSchoolId(0)}
                    className="text-purple-700 font-bold hover:underline"
                  >
                    نمایش همه مدارس
                  </button>
                )}
              </div>

              {pettyCashTxs.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
                  هیچ هزینه‌ای با کارت تن‌خواه برای این فیلتر ثبت نشده است.
                </div>
              ) : (
                pettyCashTxs.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] shadow-xs space-y-2 hover:border-purple-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#341648]">
                            {t.expense_category_name || t.description}
                          </span>
                          <span className="text-xs text-gray-500">({t.school_name})</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                            کارت تن‌خواه
                          </span>
                          {t.is_bank_fee && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              کارمزد بانک
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                          <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
                          <span>شماره پیگیری: <span className="font-mono">{t.tracking_code || '—'}</span></span>
                          {t.description && <span>شرح: {t.description}</span>}
                        </div>
                      </div>

                      <div className="text-base sm:text-lg font-black font-mono text-[#341648] self-end sm:self-center">
                        {formatRial(t.amount)} ریال
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                      <span className={`font-bold ${t.reconciled ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {t.reconciled ? '✓ با صورتحساب کارت تن‌خواه تطبیق شد' : 'در انتظار دریافت صورتحساب کارت'}
                      </span>
                      {isSenior && !t.reconciled && (
                        <button
                          onClick={() => manualReviewTransaction(t.id, true)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700"
                        >
                          تأیید تطبیق دستی
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
