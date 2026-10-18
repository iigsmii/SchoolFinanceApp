import React, { useState, useEffect } from 'react';
import { todayJalali } from '../utils/jalali';
import { Clock } from 'lucide-react';

export const DashboardClock: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-[#ffd353] bg-black/20 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 text-[#ffd353]" />
      <span>{todayJalali()}</span>
      <span className="opacity-60">|</span>
      <span>{timeStr}</span>
    </div>
  );
};
