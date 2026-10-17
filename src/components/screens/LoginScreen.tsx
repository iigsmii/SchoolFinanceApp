import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, User, Eye, EyeOff, ShieldCheck, School, Sparkles, RefreshCw } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, users, accentColor, connectWithGoogle, syncStatus, syncError } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('نام کاربری را وارد کنید');
      return;
    }
    const success = login(username, password);
    if (!success) {
      setError('نام کاربری یا رمز عبور نامعتبر است');
    }
  };

  const handleQuickLogin = (uName: string) => {
    login(uName);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const ok = await connectWithGoogle();
      if (ok) {
        // Automatically log in as senior admin or first manager
        login('admin');
      } else {
        setError(syncError || 'اتصال به حساب گوگل و شیت با خطا مواجه شد.');
      }
    } catch (err: any) {
      setError(err?.message || 'خطا در ورود با گوگل');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white shadow-xl mb-4"
            style={{ backgroundColor: accentColor }}
          >
            <School className="w-9 h-9" />
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
            <p className="text-xs text-gray-500 mt-0.5">وارد حساب کاربری خود شوید یا با حساب Google به شیت متصل گردید.</p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Official Google Sign-In Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || syncStatus === 'syncing'}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-xs active:scale-98"
            >
              {isGoogleLoading || syncStatus === 'syncing' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-purple-700" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              )}
              <span>ورود با حساب گوگل و اتصال به Google Sheets</span>
            </button>
            <div className="flex items-center my-4">
              <div className="grow border-t border-[#e5dde8]"></div>
              <span className="shrink-0 px-3 text-[11px] text-gray-400">یا ورود با نام کاربری</span>
              <div className="grow border-t border-[#e5dde8]"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#341648] mb-1.5">نام کاربری</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: admin یا manager_noor1"
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

            <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-[#e5dde8] text-[#62205f] focus:ring-[#62205f]"
                />
                <span>ذخیره نام کاربری و رمز</span>
              </label>
            </div>

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

        {/* Quick Demo Logins Box */}
        <div className="bg-white/70 backdrop-blur-xs rounded-2xl p-4 border border-[#e5dde8] shadow-xs">
          <div className="text-xs font-bold text-gray-500 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>ورود سریع آزمایشی (بدون نیاز به تایپ):</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickLogin(u.username)}
                className="w-full text-right p-2.5 rounded-xl border border-[#e5dde8] hover:border-[#62205f] hover:bg-white text-xs flex items-center justify-between transition-all"
              >
                <div>
                  <span className="font-bold text-[#341648]">{u.name}</span>
                  <span className="text-[10px] text-gray-500 mr-2">({u.role === 'senior' ? 'مدیر ارشد' : u.school_name})</span>
                </div>
                <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                  {u.username}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
