import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, accentColor } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(() => { try { return localStorage.getItem('schoolfinance_remember_login') === '1'; } catch { return false; } });
  const [error, setError] = useState('');

  React.useEffect(() => {
    try {
      if (localStorage.getItem('schoolfinance_remember_login') === '1') {
        setUsername(localStorage.getItem('schoolfinance_saved_username') || '');
        setPassword(localStorage.getItem('schoolfinance_saved_password') || '');
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('نام کاربری و رمز عبور را وارد کنید');
      return;
    }
    try {
      const success = await login(username.trim(), password);
      if (!success) setError('نام کاربری یا رمز عبور نامعتبر است یا حساب غیرفعال شده است');
      else {
        try {
          localStorage.setItem('schoolfinance_remember_login', remember ? '1' : '0');
          if (remember) { localStorage.setItem('schoolfinance_saved_username', username.trim()); localStorage.setItem('schoolfinance_saved_password', password); }
          else { localStorage.removeItem('schoolfinance_saved_username'); localStorage.removeItem('schoolfinance_saved_password'); }
        } catch {}
      }
    } catch (err: any) {
      setError(err?.message || 'ارتباط با سرور ورود برقرار نشد. اینترنت و آدرس وب‌اپ را بررسی کنید.');
    }
  };


  return (
    <div className="min-h-screen bg-[#f8f5f9] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/app-logo.jpg" alt="لوگوی سامانه" className="w-20 h-20 rounded-2xl object-contain shadow-xl bg-white" />
          </div>
          <div className="text-xs font-bold text-[#62205f] tracking-wide mb-1" style={{ color: accentColor }}>
            مجموعه مدرسة القرآن الکریم شهرضا
          </div>
          <h1 className="text-2xl font-black text-[#341648]">سامانه یکپارچه حسابداری مدارس</h1>
          <p className="text-xs text-gray-500 mt-1">متصل به پایگاه داده Google Sheets</p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#e5dde8] mb-6">
          <div className="mb-6 pb-4 border-b border-[#e5dde8]">
            <h2 className="text-lg font-bold text-[#341648]">ورود به سامانه</h2>
            <p className="text-xs text-gray-500 mt-0.5">برای ورود، نام کاربری و رمز عبور اختصاصی خود را وارد کنید.</p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#341648] mb-1.5">نام کاربری</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="نام کاربری اختصاصی شما"
                  className="w-full pl-4 pr-11 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-medium text-[#302735] focus:outline-hidden focus:border-[#62205f] focus:ring-2 focus:ring-[#62205f]/20 transition-all"
                  dir="ltr"
                />
                <User className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#341648] mb-1.5">رمز عبور</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-medium text-[#302735] focus:outline-hidden focus:border-[#62205f] focus:ring-2 focus:ring-[#62205f]/20 transition-all font-mono"
                  dir="ltr"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-purple-800" />
              ذخیره نام کاربری و رمز عبور در این دستگاه
            </label>
            <p className="text-[10px] text-amber-700">این گزینه را فقط روی دستگاه شخصی و محافظت‌شده فعال کنید.</p>
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-[#62205f] hover:opacity-95 active:scale-98 transition-all shadow-md mt-2 flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              <ShieldCheck className="w-5 h-5" />
              ورود به سامانه
            </button>
          </form>
        </div>

        <p className="mx-auto max-w-sm px-3 text-center text-[10px] leading-5 text-gray-400/90">
          این نرم‌افزار با تلاش واحد مالی و حسابداری مدرسة القرآن الکریم شهرضا طراحی و توسعه یافته است؛ با هدف سامان‌دهی و تسهیل فرایندهای مالی مجموعه.
        </p>
      </div>
    </div>
  );
};
