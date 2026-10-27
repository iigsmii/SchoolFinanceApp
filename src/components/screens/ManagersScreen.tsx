import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { User } from '../../types';
import { UserPlus, UserCog, Edit2, Trash2, X, Check, School } from 'lucide-react';

export const ManagersScreen: React.FC = () => {
  const { users, schools, addManager, updateManager, deleteManager, accentColor } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'male' | 'female'>('male');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSchoolId, setFormSchoolId] = useState<number>(schools[0]?.id || 1);
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
    setFormSchoolId(schools[0]?.id || 1);
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
    setFormSchoolId(m.school_id || schools[0]?.id || 1);
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

    if (editingManager) {
      updateManager(editingManager.id, {
        name: formName.trim(),
        gender: formGender,
        username: formUsername.trim().toLowerCase(),
        school_id: formRole === 'senior' ? undefined : formSchoolId,
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
        school_id: formRole === 'senior' ? undefined : formSchoolId,
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
                  <span>مدرسه: {m.school_name || 'همه مدارس (مرکزی)'}</span>
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
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    مدرسه مربوطه <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSchoolId}
                    onChange={(e) => setFormSchoolId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                  >
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 space-y-3">
                <h4 className="text-xs font-bold text-amber-900">اطلاعات کارت تن‌خواه مدیر</h4>
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">شماره کارت تن‌خواه</label>
                  <input type="tel" inputMode="numeric" autoComplete="off" value={formPettyCashCard}
                    onChange={(e) => setFormPettyCashCard(e.target.value.replace(/[^0-9۰-۹٠-٩]/g, ''))}
                    placeholder="شماره کارت ۱۶ رقمی" className="w-full px-4 py-2.5 bg-white rounded-xl border border-[#e5dde8] text-sm font-mono text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">بانک صادرکننده کارت</label>
                  <input type="text" value={formPettyCashBank} onChange={(e) => setFormPettyCashBank(e.target.value)}
                    placeholder="نام بانک" className="w-full px-4 py-2.5 bg-white rounded-xl border border-[#e5dde8] text-sm" />
                </div>
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
