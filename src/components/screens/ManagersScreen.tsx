import React, { useEffect, useState } from 'react';
import SchoolSelect from '../SchoolSelect';
import { useBackClose } from '../../hooks/useBackClose';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { User } from '../../types';
import { postToAppsScript } from '../../services/googleSheets';
import { UserPlus, UserCog, Edit2, Trash2, X, Check, School } from 'lucide-react';

export const ManagersScreen: React.FC = () => {
  const { users, schools, bankAccounts, addManager, updateManager, deleteManager, accentColor } = useApp();
  const [pettyCashCards, setPettyCashCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsSaving, setCardsSaving] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const normalizeManager = (value: unknown) => String(value || '')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[()（）ـ]/g, '')
    .replace(/[\s\u200c\u200f\-_.،,:;]+/g, '').trim().toLowerCase();
  const normalizeManagerBase = (value: unknown) =>
    normalizeManager(String(value || '').replace(/\([^)]*\)/g, ' ').replace(/（[^）]*）/g, ' ').replace(/^(آقای|خانم|جناب|سرکار|دکتر|مهندس|استاد)\s+/u, ''));
  const normalizeCard = (value: unknown) => String(value || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
  const managerCards = (manager: User) => pettyCashCards.filter((card) => {
    const idMatch = card.managerId !== undefined && card.managerId !== null && String(card.managerId) !== '' && String(card.managerId) === String(manager.id);
    if (idMatch) return true;
    const ownerFull = normalizeManager(card.managerName);
    const ownerBase = normalizeManagerBase(card.managerName);
    const nameFull = normalizeManager(manager.name);
    const nameBase = normalizeManagerBase(manager.name);
    const userNorm = normalizeManager(manager.username);
    return (
      (!!ownerFull && !!nameFull && ownerFull === nameFull) ||
      (!!ownerBase && !!nameBase && ownerBase === nameBase) ||
      (!!ownerBase && !!userNorm && ownerBase === userNorm)
    );
  });
  const reloadPettyCashCards = async () => {
    setCardsLoading(true);
    try {
      const res: any = await postToAppsScript({ action: 'bank_rules_get' });
      if (!res?.success || !Array.isArray(res.rules?.pettyCashCards)) throw new Error(res?.error || 'دریافت فهرست کارت‌ها ناموفق بود.');
      setPettyCashCards(res.rules.pettyCashCards);
      try { localStorage.setItem('school_finance_petty_cards', JSON.stringify(res.rules.pettyCashCards)); } catch {}
      setCardsError('');
    } catch (error: any) {
      setCardsError(error?.message || 'ارتباط با فهرست کارت‌های تن‌خواه برقرار نشد.');
    } finally { setCardsLoading(false); }
  };
  useEffect(() => { void reloadPettyCashCards(); }, []);
  const saveManagerCards = async (nextCards: any[]): Promise<boolean> => {
    if (cardsSaving) return false;
    setCardsSaving(true);
    setCardsError('');
    try {
      // Read the latest rules first so POS terminals and matching preferences are never overwritten.
      const latest: any = await postToAppsScript({ action: 'bank_rules_get' });
      if (!latest?.success || !latest.rules) throw new Error(latest?.error || 'خواندن تنظیمات بانکی ناموفق بود.');
      const normalizedCards = nextCards.map((card) => ({
        ...card,
        card: normalizeCard(card.card),
        managerId: card.managerId === undefined || card.managerId === null ? '' : String(card.managerId),
        managerName: String(card.managerName || ''),
        bankAccountId: Number(card.bankAccountId || 0),
        accountSuffix: String(card.accountSuffix || ''),
        active: card.active !== false,
      }));
      const saved: any = await postToAppsScript({
        action: 'bank_rules_save',
        rules: { ...latest.rules, pettyCashCards: normalizedCards },
      });
      if (!saved?.success) throw new Error(saved?.error || 'ذخیره کارت‌ها در Google Sheets ناموفق بود.');
      const persisted = Array.isArray(saved.rules?.pettyCashCards) ? saved.rules.pettyCashCards : normalizedCards;
      setPettyCashCards(persisted);
      try { localStorage.setItem('school_finance_petty_cards', JSON.stringify(persisted)); } catch {}
      return true;
    } catch (error: any) {
      setCardsError(error?.message || 'ذخیره کارت‌های تن‌خواه انجام نشد.');
      return false;
    } finally { setCardsSaving(false); }
  };
  // کارت تن‌خواه همیشه باید به یکی از حساب‌های بانکیِ از قبل تعریف‌شده وصل باشد.
  const [cardDialog, setCardDialog] = useState<{ manager: User; original: string; number: string; accountId: number } | null>(null);
  const [cardDialogError, setCardDialogError] = useState('');
  useBackClose(cardDialog !== null, () => { if (!cardsSaving) setCardDialog(null); });
  const openCardDialog = (manager: User, card?: any, legacyNumber?: string) => {
    setCardDialogError('');
    const number = card ? normalizeCard(card.card) : normalizeCard(legacyNumber || '');
    let accountId = Number(card?.bankAccountId || 0);
    if (card && !accountId) {
      const suffix = String(card.accountSuffix || '').replace(/\D/g, '');
      const bySuffix = suffix ? bankAccounts.filter((a) => normalizeCard(a.account_number).endsWith(suffix)) : [];
      if (bySuffix.length === 1) accountId = Number(bySuffix[0].id); // پیشنهاد؛ مدیر ارشد باید تأیید کند
    }
    setCardDialog({ manager, original: card ? normalizeCard(card.card) : '', number, accountId });
  };
  const saveCardDialog = async () => {
    if (!cardDialog) return;
    const number = normalizeCard(cardDialog.number);
    const account = bankAccounts.find((a) => Number(a.id) === Number(cardDialog.accountId));
    if (number.length !== 16) { setCardDialogError('شماره کارت باید دقیقاً ۱۶ رقم باشد.'); return; }
    if (!account) { setCardDialogError('حساب بانکی را از فهرست حساب‌های تعریف‌شده انتخاب کنید.'); return; }
    const m = cardDialog.manager;
    // کارتی که قبلاً در قوانین ثبت شده (مثلاً بدون اتصال به حساب) فقط به همین مدیر وصل می‌شود؛
    // فقط اگر صراحتاً برای مدیر دیگری ثبت شده باشد خطا می‌دهیم.
    const existing = pettyCashCards.find((item) => normalizeCard(item.card) === number && normalizeCard(item.card) !== cardDialog.original);
    if (existing && cardDialog.original) { setCardDialogError('این شماره کارت قبلاً ثبت شده است.'); return; }
    if (existing) {
      const ownerId = existing.managerId !== undefined && existing.managerId !== null ? String(existing.managerId) : '';
      if (ownerId && ownerId !== String(m.id) && !managerCards(m).includes(existing)) {
        setCardDialogError(`این شماره کارت قبلاً برای «${existing.managerName || 'مدیر دیگر'}» ثبت شده است؛ ابتدا از همان مدیر حذفش کنید.`);
        return;
      }
    }
    const original = cardDialog.original || (existing ? normalizeCard(existing.card) : '');
    const entry = {
      card: number, managerId: String(m.id), managerName: m.name,
      schoolId: Number(m.school_id || 0), bankAccountId: Number(account.id),
      accountSuffix: normalizeCard(account.account_number).slice(-3), active: true,
    };
    const next = original
      ? pettyCashCards.map((item) => (normalizeCard(item.card) === original ? { ...item, ...entry } : item))
      : [...pettyCashCards, entry];
    if (await saveManagerCards(next)) setCardDialog(null);
    else setCardDialogError('ذخیره انجام نشد؛ پیام خطا بالای صفحه نمایش داده شده است.');
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  useBackClose(isModalOpen, () => setIsModalOpen(false));
  const [editingManager, setEditingManager] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'male' | 'female'>('male');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSchoolIds, setFormSchoolIds] = useState<number[]>([schools[0]?.id || 1]);
  const [formPettyCashCard, setFormPettyCashCard] = useState('');
  const [formPettyCashBank, setFormPettyCashBank] = useState('');
  const [formPettyCashShaba, setFormPettyCashShaba] = useState('');
  const [formRole, setFormRole] = useState<'manager' | 'senior'>('manager');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingManager(null);
    setFormName('');
    setFormGender('male');
    setFormUsername('');
    setFormPassword('');
    setFormSchoolIds(schools[0]?.id ? [Number(schools[0].id)] : []);
    setFormPettyCashCard('');
    setFormPettyCashBank('');
    setFormPettyCashShaba('');
    setFormRole('manager');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (m: User) => {
    setEditingManager(m);
    setFormName(m.name);
    setFormGender(m.gender || 'male');
    setFormUsername(m.username);
    setFormPassword('');
    setFormSchoolIds((m.school_ids?.length ? m.school_ids : (m.school_id ? [m.school_id] : [])).map(Number).filter((id) => id > 0));
    setFormPettyCashCard(m.petty_cash_card || '');
    setFormPettyCashBank(m.petty_cash_bank || '');
    setFormPettyCashShaba(m.petty_cash_shaba || '');
    setFormRole(m.role === 'senior' ? 'senior' : 'manager');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('نام مدیر را وارد کنید.');
      return;
    }
    if (!formUsername.trim()) {
      setFormError('نام کاربری را وارد کنید.');
      return;
    }
    if (!editingManager && !formPassword.trim()) {
      setFormError('برای مدیر جدید رمز عبور تعیین کنید.');
      return;
    }
    if (formPassword.trim() && formPassword.trim().length < 8) {
      setFormError('رمز عبور باید حداقل ۸ نویسه باشد.');
      return;
    }

    if (formRole === 'manager' && formSchoolIds.length === 0) {
      setFormError('حداقل یک مدرسه را انتخاب کنید.');
      return;
    }

    const selectedSchoolIds = formRole === 'senior' ? [] : [...new Set(formSchoolIds.map(Number).filter((id) => id > 0))];
    if (editingManager) {
      updateManager(editingManager.id, {
        name: formName.trim(),
        gender: formGender,
        username: formUsername.trim().toLowerCase(),
        school_id: selectedSchoolIds[0],
        school_ids: selectedSchoolIds,
        role: formRole,
        petty_cash_card: formPettyCashCard.replace(/[^0-9۰-۹٠-٩]/g, ''),
        petty_cash_bank: formPettyCashBank.trim(),
        petty_cash_shaba: formPettyCashShaba.replace(/[^0-9۰-۹٠-٩]/g, ''),
        ...(formPassword.trim() ? { password: formPassword.trim() } : {}),
      });
    } else {
      addManager({
        name: formName.trim(),
        gender: formGender,
        username: formUsername.trim().toLowerCase(),
        school_id: selectedSchoolIds[0],
        school_ids: selectedSchoolIds,
        role: formRole,
        petty_cash_card: formPettyCashCard.replace(/[^0-9۰-۹٠-٩]/g, ''),
        petty_cash_bank: formPettyCashBank.trim(),
        petty_cash_shaba: formPettyCashShaba.replace(/[^0-9۰-۹٠-٩]/g, ''),
        active: true,
        password: formPassword.trim(),
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="مدیریت مدیران مدارس" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500 font-semibold">
            فهرست مدیران مراکز و مدارس مدرسة القرآن ({users.length} مدیر):
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 py-3 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
            style={{ backgroundColor: accentColor }}
          >
            <UserPlus className="w-4 h-4" />
            افزودن مدیر جدید
          </button>
        </div>

        {cardsError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{cardsError}</div>}
        <div className="space-y-3">
          {users.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#341648]">{m.name}</h3>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      m.role === 'senior' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'
                    }`}
                  >
                    {m.role === 'senior' ? 'مدیر ارشد' : 'مدیر مدرسه'}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      m.active ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {m.active ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                  <span>نام کاربری: <span className="font-mono font-bold text-gray-700">{m.username}</span></span>
                  <span>مدارس: {m.role === 'senior' ? 'همه مدارس (مرکزی)' : (m.school_name || 'بدون مدرسه')}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {managerCards(m).map((card) => {
                    const linkedAccount = bankAccounts.find((account) => Number(account.id) === Number(card.bankAccountId)) || bankAccounts.find((account) => {
                      const suffix = String(card.accountSuffix || '').replace(/\D/g, '');
                      return !Number(card.bankAccountId || 0) && suffix && String(account.account_number || '').replace(/\D/g, '').endsWith(suffix);
                    });
                    return <div key={card.card} className="flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 p-2 text-[11px] text-blue-900">
                      <span>کارت <b className="font-mono" dir="ltr">{card.card}</b></span>
                      <label className="flex items-center gap-1">
                        <span>حساب متصل:</span>
                        <select disabled={cardsSaving} value={Number(card.bankAccountId || 0)} onChange={(e) => {
                          const accountId = Number(e.target.value) || 0;
                          const account = bankAccounts.find((item) => Number(item.id) === accountId);
                          saveManagerCards(pettyCashCards.map((item) => normalizeCard(item.card) === normalizeCard(card.card) ? {
                            ...item, managerId: String(m.id), managerName: m.name, bankAccountId: accountId,
                            accountSuffix: account ? normalizeCard(account.account_number).slice(-3) : item.accountSuffix,
                          } : item));
                        }} className={`max-w-[190px] rounded-lg border bg-white px-2 py-1 text-[11px] ${Number(card.bankAccountId || 0) ? 'border-blue-200' : 'border-amber-400 ring-1 ring-amber-300'}`}>
                          {!Number(card.bankAccountId || 0) && <option value={0} disabled>— حساب بانکی را انتخاب کنید —</option>}
                          {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({String(account.account_number || '').slice(-4)})</option>)}
                        </select>
                      </label>
                      <button type="button" disabled={cardsSaving} onClick={() => openCardDialog(m, card)} className="rounded-lg bg-white border border-blue-200 px-2 py-1 font-bold">ویرایش</button>
                      <button type="button" disabled={cardsSaving} onClick={() => {
                        if (window.confirm('کارت ' + card.card + ' حذف شود؟')) saveManagerCards(pettyCashCards.filter((item) => normalizeCard(item.card) !== normalizeCard(card.card)));
                      }} className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1 font-bold">حذف</button>
                    </div>;
                  })}
                  <button type="button" disabled={cardsSaving} onClick={() => openCardDialog(m)} className="rounded-lg bg-blue-700 text-white px-3 py-2 text-[11px] font-bold disabled:opacity-50">+ افزودن کارت تن‌خواه</button>
                  {managerCards(m).length === 0 && m.petty_cash_card && (
                    <span className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1.5 text-[11px] text-amber-900">
                      کارت {m.petty_cash_card} · به حساب بانکی وصل نشده است
                      <button type="button" disabled={cardsSaving} onClick={() => openCardDialog(m, undefined, m.petty_cash_card)} className="rounded-md bg-amber-600 text-white px-2 py-0.5 font-bold">اتصال به حساب</button>
                    </span>
                  )}
                  {cardsLoading && <span className="text-[10px] text-gray-400">در حال دریافت کارت‌ها…</span>}
                  {cardsSaving && <span className="text-[10px] text-blue-700">در حال ذخیره…</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => openEditModal(m)}
                  className="p-2 text-[#62205f] hover:bg-purple-50 rounded-xl transition-colors"
                  title="ویرایش مشخصات"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {m.username !== 'admin' && (
                  <button
                    onClick={() => {
                      if (window.confirm('آیا از حذف این مدیر مطمئن هستید؟')) {
                        deleteManager(m.id);
                      }
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    title="حذف مدیر"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add / Edit Manager Modal */}
      {cardDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] supports-[height:100dvh]:max-h-[92dvh]">
            <div className="p-4 border-b border-[#ede5ef] flex items-center justify-between shrink-0">
              <div className="font-bold text-[#341648] text-sm">
                {cardDialog.original ? 'ویرایش کارت تن‌خواه' : 'افزودن کارت تن‌خواه'} — {cardDialog.manager.name}
              </div>
              <button type="button" aria-label="بستن" disabled={cardsSaving} onClick={() => setCardDialog(null)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">شماره کارت (۱۶ رقم)</label>
                <input type="tel" inputMode="numeric" autoComplete="off" dir="ltr" value={cardDialog.number}
                  onChange={(e) => setCardDialog({ ...cardDialog, number: normalizeCard(e.target.value).slice(0, 16) })}
                  placeholder="6037..." className="w-full px-4 py-2.5 rounded-xl border border-[#e5dde8] text-sm font-mono text-left" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">حساب بانکی متصل <span className="text-rose-500">*</span></label>
                {bankAccounts.length === 0 ? (
                  <div className="text-xs rounded-xl bg-amber-50 border border-amber-300 text-amber-900 p-3">
                    هنوز هیچ حساب بانکی تعریف نشده است. ابتدا از بخش «حساب‌های بانکی» حساب را تعریف کنید.
                  </div>
                ) : (
                  <select value={cardDialog.accountId} onChange={(e) => setCardDialog({ ...cardDialog, accountId: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e5dde8] text-sm bg-white">
                    <option value={0} disabled>— انتخاب از حساب‌های تعریف‌شده —</option>
                    {bankAccounts.filter((a) => a.is_active !== false || Number(a.id) === cardDialog.accountId).map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({String(a.account_number || '').slice(-4)})</option>
                    ))}
                  </select>
                )}
              </div>
              {cardDialogError && <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{cardDialogError}</div>}
            </div>
            <div className="p-4 border-t border-[#ede5ef] shrink-0 flex justify-end gap-2">
              <button type="button" disabled={cardsSaving} onClick={() => setCardDialog(null)} className="px-4 py-2.5 rounded-xl border border-[#e5dde8] text-xs font-bold text-gray-600">انصراف</button>
              <button type="button" disabled={cardsSaving || bankAccounts.length === 0} onClick={() => void saveCardDialog()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: accentColor }}>
                {cardsSaving ? 'در حال ذخیره…' : 'ذخیره'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#e5dde8] max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5dde8] mb-4">
              <h3 className="text-base font-bold text-[#341648]">
                {editingManager ? 'ویرایش اطلاعات مدیر' : 'افزودن مدیر جدید'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">جنسیت مدیر</label>
                <select value={formGender} onChange={(e) => setFormGender(e.target.value as 'male' | 'female')} className="w-full rounded-xl border border-gray-200 p-3 text-sm bg-white">
                  <option value="male">آقا</option>
                  <option value="female">خانم</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  نام و نام خانوادگی مدیر <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: آقای صادقی"
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  نام کاربری ورود <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="مثال: manager_noor1"
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  {editingManager ? 'تغییر رمز عبور (اختیاری)' : 'رمز عبور ورود'}
                  {!editingManager && <span className="text-rose-500"> *</span>}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingManager ? 'برای حفظ رمز فعلی خالی بگذارید' : 'حداقل ۸ نویسه'}
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                  dir="ltr"
                  minLength={8}
                  required={!editingManager}
                />
                {editingManager && <p className="mt-1 text-[11px] text-gray-500">در صورت وارد کردن رمز جدید، در Google Sheets به‌صورت هش‌شده ذخیره می‌شود.</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  نقش کاربری
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as 'manager' | 'senior')}
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                >
                  <option value="manager">مدیر مدرسه</option>
                  <option value="senior">مدیر ارشد مجموعه (دسترسی کامل)</option>
                </select>
              </div>

              {formRole === 'manager' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-[#341648]">مدارس تحت پوشش مدیر <span className="text-rose-500">*</span></label>
                    <span className="text-[11px] text-gray-500">{formSchoolIds.length} مدرسه انتخاب شده</span>
                  </div>
                  <div className="rounded-xl border border-[#e5dde8] bg-[#fdfcfd] p-2.5 max-h-52 overflow-y-auto space-y-1">
                    {schools.filter((school) => school.active !== false).map((school) => {
                      const schoolId = Number(school.id);
                      const checked = formSchoolIds.includes(schoolId);
                      return (
                        <label key={school.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-purple-50 cursor-pointer text-xs font-semibold text-[#302735]">
                          <input type="checkbox" checked={checked}
                            onChange={(e) => setFormSchoolIds((current) => e.target.checked
                              ? [...new Set([...current, schoolId])]
                              : current.filter((id) => id !== schoolId))}
                            className="h-4 w-4 accent-purple-700" />
                          <span>{school.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] leading-5 text-gray-500">مدیر با یک نام کاربری می‌تواند به تمام مدارس انتخاب‌شده دسترسی داشته باشد.</p>
                </div>
              )}

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 space-y-3">
                <h4 className="text-xs font-bold text-amber-900">اطلاعات کارت تن‌خواه مدیر</h4>
                <p className="text-[11px] leading-5 text-amber-900">
                  شماره کارت تن‌خواه را بعد از ذخیره‌ی مدیر، با دکمه‌ی «+ افزودن کارت تن‌خواه» در لیست مدیران ثبت کنید؛ هر کارت باید به یکی از حساب‌های بانکی تعریف‌شده وصل شود.
                </p>
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">شماره شبا (اختیاری)</label>
                  <input type="tel" inputMode="numeric" autoComplete="off" value={formPettyCashShaba}
                    onChange={(e) => setFormPettyCashShaba(e.target.value.replace(/[^a-zA-Z0-9۰-۹٠-٩]/g, ''))}
                    placeholder="IR..." className="w-full px-4 py-2.5 bg-white rounded-xl border border-[#e5dde8] text-sm font-mono text-left" dir="ltr" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check className="w-4 h-4" />
                  ذخیره اطلاعات
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
