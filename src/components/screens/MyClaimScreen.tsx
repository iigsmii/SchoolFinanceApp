import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { useBackClose } from '../../hooks/useBackClose';
import { postToAppsScript } from '../../services/googleSheets';
import { useClaimSettlements } from '../../hooks/useClaimSettlements';
import { ClaimSettlement } from '../../types';
import { formatRial, jalaliFromGregorian, jalaliToIso, todayJalali, latinDigits } from '../../utils/jalali';
import { Wallet, CheckCircle, Clock, Users, ChevronDown, ChevronUp, X, Banknote, History } from 'lucide-react';

// شناسه‌ی هزینه در سرور = شناسه‌ی تراکنش سمت برنامه منهای ۱۰۰٬۰۰۰
const expenseServerId = (txId: number) => (txId >= 100000 && txId < 200000000 ? txId - 100000 : txId);

export const MyClaimScreen: React.FC = () => {
  const { transactions, currentUser, users, accentColor, syncWithGoogleSheets } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const { settlements, error: settlementsError, reload: loadSettlements } = useClaimSettlements();
  const [expandedManager, setExpandedManager] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [settleManagerId, setSettleManagerId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(todayJalali());
  const [payTracking, setPayTracking] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState('');

  useBackClose(settleManagerId !== null, () => {
    if (!paying) setSettleManagerId(null);
  });

  // هزینه‌هایی که مدیر از جیب خودش پرداخت کرده و هنوز تسویه نشده‌اند
  const claimTxs = useMemo(
    () =>
      transactions.filter((t) => {
        if (t.kind !== 'هزینه' || t.payment_source !== 'own') return false;
        if (!isSenior && String(t.registered_by) !== String(currentUser?.id)) return false;
        return true;
      }),
    [transactions, isSenior, currentUser?.id]
  );

  const isApproved = (t: { review_status?: string }) => t.review_status === 'approved';

  const managerName = (id: string | number | undefined) => {
    const u = users.find((x) => String(x.id) === String(id));
    return u?.name || (id !== undefined ? `مدیر ${id}` : 'نامشخص');
  };

  // گروه‌بندی بر اساس مدیر ثبت‌کننده
  const groups = useMemo(() => {
    const map = new Map<string, typeof claimTxs>();
    claimTxs.forEach((t) => {
      const key = String(t.registered_by ?? '');
      map.set(key, [...(map.get(key) || []), t]);
    });
    return Array.from(map.entries())
      .map(([managerId, items]) => ({
        managerId,
        name: managerName(managerId),
        items: items.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id),
        payable: items.filter(isApproved).reduce((s, t) => s + (t.amount || 0), 0),
        pending: items.filter((t) => !isApproved(t)).reduce((s, t) => s + (t.amount || 0), 0),
      }))
      .sort((a, b) => b.payable - a.payable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimTxs, users]);

  const totalPayable = groups.reduce((s, g) => s + g.payable, 0);
  const totalPending = groups.reduce((s, g) => s + g.pending, 0);

  const visibleSettlements = useMemo(
    () =>
      settlements.filter((s: ClaimSettlement) => isSenior || String(s.manager_id) === String(currentUser?.id)),
    [settlements, isSenior, currentUser?.id]
  );

  const openSettle = (managerId: string) => {
    const g = groups.find((x) => x.managerId === managerId);
    if (!g) return;
    setSelectedIds(g.items.filter(isApproved).map((t) => t.id));
    setPayDate(todayJalali());
    setPayTracking('');
    setPayNote('');
    setPayError('');
    setSettleManagerId(managerId);
  };

  const settleGroup = groups.find((g) => g.managerId === settleManagerId) || null;
  const selectedTotal = settleGroup
    ? settleGroup.items.filter((t) => selectedIds.includes(t.id)).reduce((s, t) => s + (t.amount || 0), 0)
    : 0;

  const toggleSelected = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleGroup || paying) return;
    setPayError('');
    if (selectedIds.length === 0) {
      setPayError('حداقل یک هزینه را برای تسویه انتخاب کنید.');
      return;
    }
    const tracking = latinDigits(payTracking).trim();
    if (!tracking) {
      setPayError('شماره پیگیری پرداخت به مدیر الزامی است.');
      return;
    }
    const expenseIds = settleGroup.items
      .filter((t) => selectedIds.includes(t.id))
      .map((t) => expenseServerId(t.id));
    if (expenseIds.some((id) => id >= 900000000)) {
      setPayError('برخی هزینه‌ها هنوز به سرور ارسال نشده‌اند. چند لحظه صبر کنید تا همگام‌سازی شود و دوباره تلاش کنید.');
      return;
    }
    if (!window.confirm(`پرداخت ${formatRial(selectedTotal)} ریال به ${settleGroup.name} تسویه شود؟`)) return;

    setPaying(true);
    try {
      const res = await postToAppsScript({
        action: 'claim_settle',
        manager_id: settleGroup.managerId,
        expense_ids: expenseIds,
        date: jalaliToIso(payDate),
        tracking_code: tracking,
        note: payNote.trim(),
      });
      if (!res.success) {
        setPayError(res.error || (res.network ? 'ارتباط با سرور برقرار نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.' : 'تسویه انجام نشد.'));
        return;
      }
      setSettleManagerId(null);
      setNotice(`تسویه ${settleGroup.name} به مبلغ ${formatRial(selectedTotal)} ریال ثبت شد.`);
      await Promise.all([syncWithGoogleSheets(), loadSettlements()]);
    } catch (err) {
      setPayError(String(err));
    } finally {
      setPaying(false);
    }
  };

  const renderItem = (t: (typeof claimTxs)[number]) => (
    <div
      key={t.id}
      className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-[#341648]">
            {t.expense_category_name || t.description || 'هزینه متفرقه'}
          </span>
          {isApproved(t) ? (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> در انتظار بازپرداخت
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-semibold">
              {t.review_status === 'rejected' ? 'ردشده' : 'در انتظار تأیید'}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
          <span>تاریخ: {jalaliFromGregorian(t.date)}</span>
          <span>مدرسه: {t.school_name}</span>
          <span>
            شماره پیگیری: <span className="font-mono">{t.tracking_code || '—'}</span>
          </span>
        </div>
        {t.description && <div className="text-xs text-gray-600 mt-1">شرح: {t.description}</div>}
      </div>
      <div className="text-base font-black font-mono text-rose-700 self-end sm:self-center shrink-0">
        {formatRial(t.amount)} ریال
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title={isSenior ? 'طلب مدیران از مدرسه' : 'طلب من از مدرسه'} />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {notice && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold p-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> {notice}
            </span>
            <button type="button" onClick={() => setNotice('')} aria-label="بستن" className="p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Total Claim Banner */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #341648 100%)` }}
        >
          <div>
            <div className="text-xs font-semibold text-[#f5dff2] mb-1">
              هزینه‌های تأییدشده‌ای که از حساب شخصی {isSenior ? 'مدیران' : 'شما'} پرداخت شده و تسویه نشده است
            </div>
            <h2 className="text-xl font-bold">{isSenior ? 'جمع کل بدهی مدرسه‌ها به مدیران:' : 'جمع کل طلب من از مدرسه:'}</h2>
            {totalPending > 0 && (
              <div className="text-[11px] text-[#f5dff2] mt-1">
                به‌علاوه {formatRial(totalPending)} ریال در انتظار تأیید
              </div>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#ffd353]">
            {formatRial(totalPayable)} <span className="text-sm font-normal text-white">ریال</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs text-xs text-gray-600 leading-relaxed">
          💡 هر هزینه‌ای که هنگام ثبت با منبع «از حساب خودم» انتخاب شود و به تأیید مدیر ارشد برسد، در این فهرست به‌عنوان طلب مدیر نمایش داده می‌شود.
          {isSenior
            ? ' با زدن «تسویه حساب» پرداخت به مدیر را با شماره پیگیری ثبت کنید؛ هزینه‌های تسویه‌شده از فهرست طلب خارج می‌شوند.'
            : ' پس از پرداخت توسط مدیر ارشد، هزینه‌ها از این فهرست خارج و در سابقه تسویه‌ها ثبت می‌شوند.'}
        </div>

        {/* Per-manager claims */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
            {isSenior ? <Users className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
            {isSenior ? `طلب هر مدیر (${groups.length} مدیر):` : `ریز اقلام (${claimTxs.length} مورد):`}
          </div>

          {groups.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              {isSenior ? 'هیچ مدیری طلب تسویه‌نشده‌ای ندارد.' : 'هنوز هزینه‌ای از حساب شخصی شما ثبت نشده یا همه تسویه شده‌اند.'}
            </div>
          ) : isSenior ? (
            groups.map((g) => {
              const open = expandedManager === g.managerId;
              return (
                <div key={g.managerId} className="bg-white rounded-3xl border border-[#e5dde8] shadow-xs overflow-hidden">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedManager(open ? null : g.managerId)}
                      className="flex items-center gap-2 text-right min-w-0"
                    >
                      {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#341648] truncate">{g.name}</div>
                        <div className="text-[11px] text-gray-500">
                          {g.items.length} هزینه
                          {g.pending > 0 ? ` — ${formatRial(g.pending)} ریال در انتظار تأیید` : ''}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <span className="font-black font-mono text-rose-700 text-base">{formatRial(g.payable)} ریال</span>
                      <button
                        type="button"
                        disabled={g.payable <= 0}
                        onClick={() => openSettle(g.managerId)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 inline-flex items-center gap-1.5"
                        style={{ backgroundColor: accentColor }}
                      >
                        <Banknote className="w-4 h-4" /> تسویه حساب
                      </button>
                    </div>
                  </div>
                  {open && <div className="border-t border-[#ede5ef] bg-[#fcfaff] p-3 space-y-2">{g.items.map((t) => renderItem(t))}</div>}
                </div>
              );
            })
          ) : (
            groups.flatMap((g) => g.items).map((t) => renderItem(t))
          )}
        </div>

        {/* Settlement history */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
            <History className="w-4 h-4" /> سابقه تسویه‌ها ({visibleSettlements.length}):
          </div>
          {settlementsError && (
            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2">{settlementsError}</div>
          )}
          {visibleSettlements.length === 0 && !settlementsError ? (
            <div className="bg-white rounded-3xl p-6 text-center text-gray-400 text-xs border border-[#e5dde8]">
              هنوز تسویه‌ای ثبت نشده است.
            </div>
          ) : (
            visibleSettlements.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl p-4 border border-emerald-200 flex flex-col sm:flex-row justify-between gap-2">
                <div className="text-xs text-gray-600 space-y-0.5">
                  <div className="font-bold text-sm text-[#341648] flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {s.manager_name || managerName(s.manager_id)}
                  </div>
                  <div>
                    تاریخ: {jalaliFromGregorian(s.date)} | پیگیری: <span className="font-mono">{s.tracking_code || '—'}</span> | {s.expense_ids.length} هزینه
                  </div>
                  {s.note && <div>توضیح: {s.note}</div>}
                </div>
                <div className="font-black font-mono text-emerald-700 self-end sm:self-center">{formatRial(s.amount)} ریال</div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Settle modal (senior only) */}
      {isSenior && settleGroup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <form
            onSubmit={handleSettle}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] supports-[height:100dvh]:max-h-[92dvh]"
          >
            <div className="p-4 border-b border-[#ede5ef] flex items-center justify-between shrink-0">
              <div className="font-bold text-[#341648]">تسویه حساب {settleGroup.name}</div>
              <button type="button" onClick={() => !paying && setSettleManagerId(null)} aria-label="بستن" className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              <div>
                <div className="text-xs font-bold text-[#341648] mb-2">هزینه‌های قابل تسویه:</div>
                <div className="space-y-2">
                  {settleGroup.items
                    .filter(isApproved)
                    .map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[#e5dde8] text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelected(t.id)}
                          className="w-4 h-4 shrink-0"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="font-bold text-[#341648] block truncate">
                            {t.expense_category_name || t.description || 'هزینه'}
                          </span>
                          <span className="text-gray-500">
                            {jalaliFromGregorian(t.date)} | {t.school_name}
                          </span>
                        </span>
                        <span className="font-mono font-bold text-rose-700 shrink-0">{formatRial(t.amount)}</span>
                      </label>
                    ))}
                </div>
              </div>

              <JalaliDatePicker label="تاریخ پرداخت به مدیر" value={payDate} onChange={setPayDate} required />

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  شماره پیگیری پرداخت <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={payTracking}
                  onChange={(e) => setPayTracking(e.target.value)}
                  dir="ltr"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">توضیح (اختیاری)</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm focus:outline-hidden"
                />
              </div>

              {payError && (
                <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{payError}</div>
              )}
            </div>

            <div className="p-4 border-t border-[#ede5ef] shrink-0 flex items-center justify-between gap-3">
              <div className="text-xs">
                <div className="text-gray-500">مبلغ تسویه</div>
                <div className="font-black font-mono text-[#341648]">{formatRial(selectedTotal)} ریال</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => setSettleManagerId(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#e5dde8] text-xs font-bold text-gray-600"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={paying || selectedIds.length === 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  {paying ? 'در حال ثبت...' : 'ثبت تسویه'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
