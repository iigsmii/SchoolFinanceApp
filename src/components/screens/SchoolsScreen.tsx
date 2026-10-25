import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { School } from '../../types';
import { getSchoolMoeen } from '../../utils/parsian';
import { Building2, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

export const SchoolsScreen: React.FC = () => {
  const { schools, addSchool, updateSchool, deleteSchool, accentColor } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState('دبستان پسرانه');
  const [formActive, setFormActive] = useState(true);
  const [formPosTerminal, setFormPosTerminal] = useState('');
  const [formTafsiliCode, setFormTafsiliCode] = useState('');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingSchool(null);
    setFormName('');
    setFormCode('');
    setFormType('دبستان پسرانه');
    setFormActive(true);
    setFormPosTerminal('');
    setFormTafsiliCode('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sc: School) => {
    setEditingSchool(sc);
    setFormName(sc.name);
    setFormCode(sc.code);
    setFormType(sc.type || 'دبستان');
    setFormActive(sc.active);
    setFormPosTerminal(sc.pos_terminal_number || '');
    setFormTafsiliCode(sc.tafsili_code || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('نام مدرسه را وارد کنید.');
      return;
    }
    if (!formCode.trim()) {
      setFormError('کد مدرسه را وارد کنید.');
      return;
    }

    if (editingSchool) {
      updateSchool(editingSchool.id, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        type: formType,
        active: formActive,
        pos_terminal_number: formPosTerminal.trim(),
        tafsili_code: formTafsiliCode.trim(),
      });
    } else {
      addSchool({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        type: formType,
        active: formActive,
        pos_terminal_number: formPosTerminal.trim(),
        tafsili_code: formTafsiliCode.trim(),
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="مدیریت مدارس و شعب" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500 font-semibold">
            شعب و مراکز آموزشی زیرمجموعه ({schools.length} مرکز):
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 py-3 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="w-4 h-4" />
            افزودن مدرسه / مرکز
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {schools.map((sc) => {
            const moeen = getSchoolMoeen(sc.id);
            return (
              <div
                key={sc.id}
                className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-[#341648]">{sc.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        sc.active ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {sc.active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    نوع مرکز: {sc.type || 'آموزشی'} | کد سیستم: <span className="font-mono font-bold text-gray-700">{sc.code}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#62205f] font-semibold mt-2 bg-[#fcfaff] p-2.5 rounded-xl border border-[#ede5ef] flex flex-wrap items-center justify-between gap-1.5">
                    <span>کد معین پارسیان: <b>{moeen}</b> | کل: 67</span>
                    <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md font-bold">
                      کد تفصیلی: <b className="font-mono">{sc.tafsili_code || 'تعریف‌نشده'}</b>
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">شماره پایانه پوز: <span className="font-mono font-bold">{sc.pos_terminal_number || 'ثبت نشده'}</span></div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => openEditModal(sc)}
                    className="p-2 text-[#62205f] hover:bg-purple-50 rounded-xl transition-colors"
                    title="ویرایش مدرسه"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('آیا از حذف این مرکز اطمینان دارید؟')) {
                        deleteSchool(sc.id);
                      }
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    title="حذف مدرسه"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Add / Edit School Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5dde8] mb-4">
              <h3 className="text-base font-bold text-[#341648]">
                {editingSchool ? 'ویرایش اطلاعات مدرسه' : 'افزودن مرکز جدید'}
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
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  نام مدرسه یا مرکز <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: دبستان نور ۳"
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    کد یکتای سیستم <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="مثال: NOOR3"
                    className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    کد تفصیلی حسابداری (پارسیان)
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={formTafsiliCode}
                    onChange={(e) => setFormTafsiliCode(e.target.value.replace(/[^0-9۰-۹٠-٩]/g, ''))}
                    placeholder="مثال: 101"
                    className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  شماره پایانه دستگاه پوز
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={formPosTerminal}
                  onChange={(e) => setFormPosTerminal(e.target.value.replace(/[^0-9۰-۹٠-٩]/g, ''))}
                  placeholder="شماره پایانه روی رسید/صورتحساب پوز"
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left"
                  dir="ltr"
                />
                <p className="text-[11px] text-gray-500 mt-1">برای انتساب خودکار تراکنش‌های پوز به این مدرسه استفاده می‌شود.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  نوع مرکز
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                >
                  <option value="دبستان پسرانه">دبستان پسرانه</option>
                  <option value="دبستان دخترانه">دبستان دخترانه</option>
                  <option value="مهد و پیش‌دبستانی">مهد و پیش‌دبستانی</option>
                  <option value="مرکز فرهنگی و قرآنی">مرکز فرهنگی و قرآنی</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded text-[#62205f]"
                />
                <span className="text-xs font-bold text-gray-700">مرکز فعال است</span>
              </label>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check className="w-4 h-4" />
                  ذخیره مدرسه
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
