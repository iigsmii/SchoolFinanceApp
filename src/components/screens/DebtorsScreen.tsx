import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial } from '../../utils/jalali';
import { UserMinus, Search, Phone, MessageSquare } from 'lucide-react';

/**
 * صفحهٔ مستقل «لیست بدهکاران»
 * دانش‌آموزان با مانده بدهی، مرتب‌شده بر اساس مبلغ، همراه با مجموع مطالبات.
 * فقط می‌خواند.
 */
export const DebtorsScreen: React.FC = () => {
  const { students, currentUser, accentColor, getStudentBalance, setCurrentScreen } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');

  const debtors = useMemo(() => {
    return students
      .filter((s) => s.active)
      .filter((s) => (isSenior ? true : s.school_id === currentUser?.school_id))
      .map((s) => ({ student: s, ...getStudentBalance(s.id) }))
      .filter((r) => r.debt > 0)
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          r.student.name.toLowerCase().includes(q) ||
          (r.student.father_phone || r.student.phone || '').includes(q) ||
          (r.student.mother_phone || '').includes(q) ||
          (r.student.national_id || '').includes(q)
        );
      })
      .sort((a, b) => b.debt - a.debt);
  }, [students, isSenior, currentUser?.school_id, getStudentBalance, searchQuery]);

  const totalDebt = debtors.reduce((sum, r) => sum + r.debt, 0);

  return (
    <div className="w-full max-w-full min-h-screen overflow-x-hidden bg-[#f8f5f9] pb-12">
      <Header title="لیست بدهکاران" />

      <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-5 box-border">
        {/* Summary */}
        <div
          className="rounded-3xl p-5 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #2f0b38 100%)` }}
        >
          <div className="flex items-center gap-2 text-xs font-bold bg-white/20 px-3 py-1 rounded-full w-fit">
            <UserMinus className="w-3.5 h-3.5 text-amber-300" />
            <span>مجموع مطالبات معوق</span>
          </div>
          <div className="text-2xl font-black mt-2 font-mono">{formatRial(totalDebt)} ریال</div>
          <div className="text-xs text-white/80 mt-1">تعداد بدهکاران: {debtors.length} نفر</div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs">
          <div className="relative min-w-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جست‌وجو بر اساس نام، شماره تماس یا کد ملی..."
              className="w-full max-w-full pl-4 pr-11 py-3 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
          </div>
        </div>

        {/* List */}
        <div className="space-y-3 min-w-0">
          {debtors.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              بدهکاری با این شرایط یافت نشد.
            </div>
          ) : (
            debtors.map(({ student, debt }) => {
              const phone = student.father_phone || student.phone || student.mother_phone || '';
              return (
                <div
                  key={student.id}
                  className="w-full min-w-0 bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-[#341648] break-words">{student.name}</div>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>پایه: {student.grade || '—'}</span>
                      <span className="break-words">مدرسه: {student.school_name || '—'}</span>
                      {phone && (
                        <span className="inline-flex items-center gap-1" dir="ltr">
                          <Phone className="w-3 h-3" />
                          <span className="font-mono">{phone}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
                    <div className="text-base font-black font-mono text-rose-700 whitespace-nowrap">
                      {formatRial(debt)} ریال
                    </div>
                    <button
                      onClick={() => setCurrentScreen('sms_reminders')}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white whitespace-nowrap"
                      style={{ backgroundColor: accentColor }}
                    >
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        پیامک یادآوری
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
