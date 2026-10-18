import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial } from '../../utils/jalali';
import { fillSmsTemplate } from '../../utils/debt';
import { Send, Search, CheckSquare, Square, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * صفحهٔ «ارسال دسته‌جمعی پیامک با انتخاب»
 * - فهرست دانش‌آموزان بدهکار را نشان می‌دهد
 * - امکان تیک‌زدن تک‌تک (و انتخاب همه) برای ارسال انتخابی
 * - متن پیامک برای هر دانش‌آموز به‌صورت خودکار با نام/مبلغ/مدرسه/روز پر می‌شود
 *   (از fillSmsTemplate استفاده می‌کند، پس نگارش‌های فارسی و لاتین هر دو کار می‌کنند)
 */
export const SmsBatchScreen: React.FC = () => {
  const {
    students,
    schools,
    currentUser,
    accentColor,
    getStudentBalance,
    smsConfig,
    sendBatchSmsReminders,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(isSenior ? 0 : currentUser?.school_id || 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [onlyDebtors, setOnlyDebtors] = useState(true);
  const [result, setResult] = useState<{ sentCount: number; failedCount: number } | null>(null);

  const template = smsConfig.smsTemplate;

  const rows = useMemo(() => {
    return students
      .filter((s) => s.active)
      .filter((s) => (isSenior ? true : s.school_id === currentUser?.school_id))
      .filter((s) => (selectedSchoolId === 0 ? true : s.school_id === selectedSchoolId))
      .map((s) => {
        const { debt } = getStudentBalance(s.id);
        const phone = s.father_phone || s.phone || s.mother_phone || '';
        const preview = fillSmsTemplate(template, {
          name: s.name,
          school: s.school_name || 'مدرسه',
          amount: formatRial(debt),
          days: '—',
        });
        return { student: s, debt, phone, preview };
      })
      .filter((r) => (onlyDebtors ? r.debt > 0 : true))
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          r.student.name.toLowerCase().includes(q) ||
          r.student.national_id.includes(q) ||
          r.phone.includes(q)
        );
      })
      .sort((a, b) => b.debt - a.debt);
  }, [students, isSenior, currentUser?.school_id, selectedSchoolId, onlyDebtors, searchQuery, getStudentBalance, template]);

  const selectableIds = rows.filter((r) => r.phone || r.student.mother_phone).map((r) => r.student.id);
  const selectedIds = selectableIds.filter((id) => selected[id]);
  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length;

  const toggle = (id: number) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<number, boolean> = {};
      selectableIds.forEach((id) => (next[id] = true));
      setSelected(next);
    }
  };

  const handleSend = () => {
    if (selectedIds.length === 0) {
      alert('حداقل یک دانش‌آموز را برای ارسال انتخاب کنید.');
      return;
    }
    const res = sendBatchSmsReminders(selectedIds);
    setResult(res);
    setSelected({});
    setTimeout(() => setResult(null), 8000);
  };

  return (
    <div className="w-full max-w-full min-h-screen overflow-x-hidden bg-[#f8f5f9] pb-12">
      <Header title="ارسال گروهی پیامک" />

      <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-5 box-border">
        {/* Header card */}
        <div
          className="rounded-3xl p-5 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #2f0b38 100%)` }}
        >
          <div className="flex items-center gap-2 text-xs font-bold bg-white/20 px-3 py-1 rounded-full w-fit">
            <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
            <span>ارسال انتخابی با جای‌گذاری خودکار نام و مبلغ بدهی</span>
          </div>
          <div className="text-sm font-bold mt-2">
            {selectedIds.length} نفر انتخاب شده — از {selectableIds.length} دانش‌آموز قابل ارسال
          </div>
        </div>

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ارسال پایان یافت: {result.sentCount} موفق، {result.failedCount} ناموفق.
            </span>
          </div>
        )}

        {!template?.trim() && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            متنی برای پیامک تنظیم نشده است. از بخش «سامانه پیامک ← تنظیمات» متن را تعیین کنید.
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs space-y-3 min-w-0">
          <div className="relative min-w-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجو بر اساس نام، کد ملی یا شماره تماس..."
              className="w-full max-w-full pl-4 pr-11 py-3 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSenior && (
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
                className="py-2 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold"
              >
                <option value={0}>همه مدارس</option>
                {schools.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setOnlyDebtors((v) => !v)}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                onlyDebtors ? 'bg-[#62205f] text-white border-transparent' : 'bg-white text-gray-700 border-[#e5dde8]'
              }`}
              style={onlyDebtors ? { backgroundColor: accentColor } : {}}
            >
              فقط بدهکاران
            </button>

            <button
              type="button"
              onClick={toggleAll}
              className="py-2 px-3 rounded-xl text-xs font-bold bg-white text-gray-700 border border-[#e5dde8] hover:bg-gray-50 inline-flex items-center gap-1.5"
            >
              {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {allSelected ? 'لغو انتخاب همه' : 'انتخاب همه'}
            </button>
          </div>
        </div>

        {/* Student list with checkboxes */}
        <div className="space-y-2 min-w-0">
          {rows.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              دانش‌آموزی با این شرایط یافت نشد.
            </div>
          ) : (
            rows.map(({ student, debt, phone }) => {
              const disabled = !phone && !student.mother_phone;
              const checked = !!selected[student.id];
              return (
                <label
                  key={student.id}
                  className={`w-full min-w-0 bg-white rounded-3xl p-4 border shadow-xs flex items-start gap-3 cursor-pointer transition-all ${
                    checked ? 'border-[#62205f] ring-1 ring-[#62205f]/20' : 'border-[#e5dde8]'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(student.id)}
                    className="mt-1 w-4 h-4 shrink-0 accent-[#62205f]"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#341648] break-words">{student.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#f2eaf3] text-[#62205f] font-bold">
                        پایه {student.grade}
                      </span>
                      {debt > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                          بدهی: {formatRial(debt)} ریال
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500 mt-1">
                      {disabled ? (
                        <span className="text-rose-600 font-bold">شماره تماس ثبت نشده است</span>
                      ) : (
                        <span dir="ltr" className="font-mono">{phone || student.mother_phone}</span>
                      )}
                    </div>

                    {template?.trim() && (
                      <div className="mt-2 text-[11px] text-gray-600 bg-[#fcfaff] rounded-xl p-2 border border-[#ede5ef] leading-relaxed break-words">
                        {fillSmsTemplate(template, {
                          name: student.name,
                          school: student.school_name || 'مدرسه',
                          amount: formatRial(debt),
                          days: '—',
                        })}
                      </div>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Sticky send action */}
        <div className="sticky bottom-3 z-20">
          <button
            type="button"
            onClick={handleSend}
            disabled={selectedIds.length === 0}
            className="w-full py-4 rounded-2xl text-white font-black text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: accentColor }}
          >
            <Send className="w-4 h-4" />
            <span>ارسال پیامک به {selectedIds.length} دانش‌آموز انتخاب‌شده</span>
          </button>
        </div>
      </main>
    </div>
  );
};
