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
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ffd353] bg-black/25 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-white/10 shrink-0">
      <Clock className="w-3 h-3 text-[#ffd353]" />
      <span>{todayJalali()}</span>
      <span className="opacity-40">|</span>
      <span className="font-mono">{timeStr}</span>
    </div>
  );
};
