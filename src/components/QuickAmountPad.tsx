import React from 'react';
import { latinDigits } from '../utils/jalali';

interface QuickAmountPadProps {
  value: string;
  onChange: (formattedValue: string) => void;
  accentColor?: string;
  showPresetMillions?: boolean;
}

export const QuickAmountPad: React.FC<QuickAmountPadProps> = ({
  value,
  onChange,
  accentColor = '#62205f',
  showPresetMillions = true,
}) => {
  const currentNum = Number(latinDigits(value).replace(/\D/g, '')) || 0;

  const handleAppendZeros = (count: number) => {
    const raw = String(currentNum || '');
    if (!raw || raw === '0') return;
    const newNum = Number(raw + '0'.repeat(count));
    if (!isNaN(newNum) && newNum < 1000000000000) {
      onChange(newNum.toLocaleString('en-US'));
    }
  };

  const handleAddAmount = (addRial: number) => {
    const newNum = currentNum + addRial;
    if (!isNaN(newNum) && newNum < 1000000000000) {
      onChange(newNum.toLocaleString('en-US'));
    }
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 select-none">
      <span className="text-[11px] font-semibold text-gray-500 ml-1">دکمه‌های سریع:</span>

      <button
        type="button"
        onClick={() => handleAppendZeros(3)}
        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 transition-colors border border-gray-200/80 shadow-2xs font-mono"
        title="افزودن ۳ صفر (هزار)"
      >
        +۰۰۰
      </button>

      <button
        type="button"
        onClick={() => handleAppendZeros(6)}
        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-[#62205f] transition-colors border border-purple-200 shadow-2xs font-mono"
        title="افزودن ۶ صفر (میلیون)"
      >
        +۰۰۰,۰۰۰
      </button>

      {showPresetMillions && (
        <>
          <button
            type="button"
            onClick={() => handleAddAmount(10000000)}
            className="px-2 py-1 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 transition-colors border border-blue-200 shadow-2xs"
            title="افزودن ۱۰ میلیون ریال (۱ میلیون تومان)"
          >
            +۱۰ م ریال
          </button>

          <button
            type="button"
            onClick={() => handleAddAmount(50000000)}
            className="px-2 py-1 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 transition-colors border border-blue-200 shadow-2xs"
            title="افزودن ۵۰ میلیون ریال (۵ میلیون تومان)"
          >
            +۵۰ م ریال
          </button>
        </>
      )}

      {currentNum > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors border border-rose-200 mr-auto"
        >
          پاک کردن
        </button>
      )}
    </div>
  );
};
