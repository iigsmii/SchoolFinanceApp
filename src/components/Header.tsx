import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, UserCircle, Settings } from 'lucide-react';
import { ScreenType } from '../types';

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = true }) => {
  const { currentUser, setCurrentScreen, accentColor } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-[#f8f5f9]/95 backdrop-blur-md border-b border-[#e5dde8] px-4 py-3 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="p-2 rounded-xl text-[#341648] hover:bg-white/80 active:scale-95 transition-all shadow-sm border border-[#e5dde8]"
              title="بازگشت به داشبورد"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="text-xs font-semibold text-[#62205f] flex items-center gap-1.5" style={{ color: accentColor }}>
              <span>مدرسة القرآن الکریم شهرضا</span>
              <span className="text-[#a98ea0]">/</span>
              <span>امور مالی</span>
            </div>
            <h1 className="text-xl font-black text-[#341648] leading-tight">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#e5dde8] shadow-xs text-xs font-medium text-[#302735]">
              <UserCircle className="w-4 h-4 text-[#62205f]" style={{ color: accentColor }} />
              <span className="truncate max-w-[150px]">{currentUser.name}</span>
              {currentUser.school_name && (
                <span className="text-[10px] bg-[#f2eaf3] text-[#62205f] px-2 py-0.5 rounded-md font-bold">
                  {currentUser.school_name}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => setCurrentScreen('settings' as ScreenType)}
            className="p-2.5 rounded-xl text-[#341648] hover:bg-white/80 active:scale-95 transition-all shadow-sm border border-[#e5dde8]"
            title="تنظیمات سامانه"
          >
            <Settings className="w-5 h-5 text-[#341648]" />
          </button>
        </div>
      </div>
    </header>
  );
};
