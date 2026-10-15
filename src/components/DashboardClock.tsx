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
    <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-[#ffd353] bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10 w-fit">
      <Clock className="w-4 h-4 text-[#ffd353]" />
      <span>تاریخ امروز: {todayJalali()}</span>
      <span className="opacity-60">|</span>
      <span>ساعت: {timeStr}</span>
    </div>
  );
};
