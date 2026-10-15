import React, { useState } from 'react';
import { Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { todayJalali, daysInMonth, JALALI_MONTH_NAMES } from '../utils/jalali';
import { useApp } from '../context/AppContext';

interface JalaliDatePickerProps {
  value: string; // e.g. "1405/07/23"
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
}) => {
  const { accentColor } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const initialVal = value || todayJalali();
  const parts = initialVal.split('/').map(Number);
  const [selectedYear, setSelectedYear] = useState<number>(parts[0] || 1405);
  const [selectedMonth, setSelectedMonth] = useState<number>(parts[1] || 7);
  const [selectedDay, setSelectedDay] = useState<number>(parts[2] || 1);

  const totalDays = daysInMonth(selectedYear, selectedMonth);

  const handleOpen = () => {
    const curParts = (value || todayJalali()).split('/').map(Number);
    setSelectedYear(curParts[0] || 1405);
    setSelectedMonth(curParts[1] || 7);
    setSelectedDay(Math.min(curParts[2] || 1, daysInMonth(curParts[0] || 1405, curParts[1] || 7)));
    setIsOpen(true);
  };

  const handleConfirm = () => {
    const safeDay = Math.min(selectedDay, daysInMonth(selectedYear, selectedMonth));
    const formatted = `${selectedYear}/${String(selectedMonth).padStart(2, '0')}/${String(safeDay).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-[#341648] mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-[#e5dde8] text-[#302735] hover:border-[#62205f] focus:outline-hidden focus:ring-2 focus:ring-[#62205f]/30 transition-all font-semibold shadow-xs"
      >
        <span className="font-mono text-base">{value || todayJalali()}</span>
        <CalendarIcon className="w-5 h-5 text-[#62205f]" style={{ color: accentColor }} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#e5dde8]">
            <h3 className="text-base font-bold text-[#341648] mb-4 text-center">انتخاب تاریخ شمسی</h3>

            <div className="grid grid-cols-3 gap-2 mb-6">
              {/* Day */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">روز</label>
                <select
                  value={Math.min(selectedDay, totalDays)}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#e5dde8] bg-[#fdfcfd] text-center font-bold text-sm focus:outline-hidden focus:border-[#62205f]"
                >
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">ماه</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setSelectedMonth(m);
                    const newMax = daysInMonth(selectedYear, m);
                    if (selectedDay > newMax) setSelectedDay(newMax);
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#e5dde8] bg-[#fdfcfd] text-center font-bold text-sm focus:outline-hidden focus:border-[#62205f]"
                >
                  {JALALI_MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>
                      {name} ({i + 1})
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">سال</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#e5dde8] bg-[#fdfcfd] text-center font-bold text-sm focus:outline-hidden focus:border-[#62205f]"
                >
                  {Array.from({ length: 16 }, (_, i) => 1400 + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-bold text-sm bg-[#62205f] hover:opacity-95 active:scale-95 transition-all shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                <Check className="w-4 h-4" />
                تأیید تاریخ
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1 py-2.5 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
              >
                <X className="w-4 h-4" />
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
