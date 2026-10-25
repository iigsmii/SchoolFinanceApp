import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, User, Eye, EyeOff, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { toPersianDigits } from '../../utils/jalali';
import { playSuccessSound } from '../../utils/soundEffects';

export const LoginScreen: React.FC = () => {
  const { login, accentColor } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(() => { try { return localStorage.getItem('schoolfinance_remember_login') === '1'; } catch { return false; } });
  const [error, setError] = useState('');

  // Live percentage progress & stage feedback
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [loginStage, setLoginStage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

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
    if (isLoggingIn) return;
    setError('');

    if (!username.trim() || !password) {
      setError('نام کاربری و رمز عبور را وارد کنید');
      return;
    }

    setIsLoggingIn(true);
    setLoginProgress(15);
    setLoginStage('بررسی و اعتبارسنجی ورودی...');

    try {
      const success = await login(
        username.trim(),
        password,
        (pct, stage) => {
          setLoginProgress(pct);
          setLoginStage(stage);
        }
      );

      if (!success) {
        setIsLoggingIn(false);
        setLoginProgress(0);
        setLoginStage('');
        setError('نام کاربری یا رمز عبور نامعتبر است یا حساب غیرفعال شده است');
      } else {
        setIsSuccess(true);
        setLoginProgress(100);
        setLoginStage('ورود با موفقیت انجام شد! خوش آمدید...');
        playSuccessSound();

        try {
          localStorage.setItem('schoolfinance_remember_login', remember ? '1' : '0');
          if (remember) {
            localStorage.setItem('schoolfinance_saved_username', username.trim());
            localStorage.setItem('schoolfinance_saved_password', password);
          } else {
            localStorage.removeItem('schoolfinance_saved_username');
            localStorage.removeItem('schoolfinance_saved_password');
          }
        } catch {}

        // Graceful exit transition before dashboard mounts
        setTimeout(() => {
          setIsExiting(true);
        }, 350);
      }
    } catch (err: any) {
      setIsLoggingIn(false);
      setLoginProgress(0);
      setLoginStage('');
      setError(err?.message || 'ارتباط با سرور ورود برقرار نشد. اینترنت و آدرس وب‌اپ را بررسی کنید.');
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#f8f5f9] flex flex-col justify-center items-center p-4 transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-95 -translate-y-2 blur-[1px]' : 'opacity-100 scale-100 translate-y-0'
      }`}
    >
      <div className="max-w-md w-full">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-105">
            <img src="/app-logo.jpg" alt="لوگوی سامانه" className="w-20 h-20 rounded-2xl object-contain shadow-xl bg-white border border-[#e5dde8]" />
          </div>
          <div className="text-xs font-bold text-[#62205f] tracking-wide mb-1" style={{ color: accentColor }}>
            مجموعه مدرسة القرآن الکریم شهرضا
          </div>
          <h1 className="text-2xl font-black text-[#341648]">سامانه یکپارچه حسابداری مدارس</h1>
          <p className="text-xs text-gray-500 mt-1">متصل به پایگاه داده زنده Google Sheets</p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#e5dde8] mb-6">
          <div className="mb-6 pb-4 border-b border-[#e5dde8] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#341648]">ورود به سامانه</h2>
              <p className="text-xs text-gray-500 mt-0.5">برای ورود، نام کاربری و رمز عبور اختصاصی خود را وارد کنید.</p>
            </div>
            {isLoggingIn && (
              <span className="font-mono tabular-nums text-xs font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-[#62205f] border border-purple-200">
                {toPersianDigits(loginProgress)}٪
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <span className="shrink-0">⚠️</span>
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
                  disabled={isLoggingIn}
                  placeholder="نام کاربری اختصاصی شما"
                  className="w-full pl-4 pr-11 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-medium text-[#302735] focus:outline-hidden focus:border-[#62205f] focus:ring-2 focus:ring-[#62205f]/20 transition-all disabled:opacity-60"
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
                  disabled={isLoggingIn}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-medium text-[#302735] focus:outline-hidden focus:border-[#62205f] focus:ring-2 focus:ring-[#62205f]/20 transition-all font-mono disabled:opacity-60"
                  dir="ltr"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  disabled={isLoggingIn}
                  className="absolute left-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLoggingIn}
                className="accent-purple-800"
              />
              ذخیره نام کاربری و رمز عبور در این دستگاه
            </label>
            <p className="text-[10px] text-amber-700">این گزینه را فقط روی دستگاه شخصی و محافظت‌شده فعال کنید.</p>

            {/* Live Progress Bar with Exact Percentage & Persian Stage Description */}
            {isLoggingIn && (
              <div className="p-3 rounded-2xl bg-[#fdfafc] border border-purple-200/90 shadow-2xs space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#341648] font-bold">
                    {isSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-[#62205f] shrink-0" style={{ color: accentColor }} />
                    )}
                    <span className="truncate">{loginStage}</span>
                  </div>
                  <span className="font-mono tabular-nums font-black text-xs text-[#341648]">
                    {toPersianDigits(loginProgress)}٪
                  </span>
                </div>

                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      isSuccess
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                        : 'bg-gradient-to-r from-[#62205f] via-purple-600 to-indigo-600'
                    }`}
                    style={{
                      width: `${Math.max(8, loginProgress)}%`,
                      ...(isSuccess ? {} : { backgroundColor: accentColor }),
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm transition-all shadow-md mt-2 flex items-center justify-center gap-2 ${
                isLoggingIn ? 'opacity-90 cursor-wait' : 'hover:opacity-95 active:scale-98'
              }`}
              style={{ backgroundColor: isSuccess ? '#059669' : accentColor }}
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>ورود موفق! در حال انتقال به میز کار...</span>
                </>
              ) : isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>در حال ورود ({toPersianDigits(loginProgress)}٪)...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>ورود به سامانه</span>
                </>
              )}
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
