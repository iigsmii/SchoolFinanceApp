import React from 'react';
import { useApp } from '../../context/AppContext';
import { DashboardClock } from '../DashboardClock';
import {
  Users,
  CreditCard,
  FileCheck,
  Receipt,
  ArrowLeftRight,
  BookOpen,
  Wallet,
  BarChart3,
  ClipboardList,
  Settings,
  Building2,
  UserCog,
  FileSpreadsheet,
  Megaphone,
  Landmark,
  AlertTriangle,
} from 'lucide-react';
import { ScreenType } from '../../types';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';

export const DashboardScreen: React.FC = () => {
  const {
    currentUser,
    setCurrentScreen,
    accentColor,
    students,
    transactions,
    cheques,
    seniorMessages,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  // Filter students & transactions based on school if manager
  const userStudents = isSenior
    ? students
    : students.filter((s) => s.school_id === currentUser?.school_id);

  const activeStudentsCount = userStudents.filter((s) => s.active).length;

  // Calculate total outstanding debt
  const userStudentIds = new Set(userStudents.map((s) => s.id));
  const relevantTxs = isSenior
    ? transactions
    : transactions.filter((t) => t.student_id && userStudentIds.has(t.student_id));

  let totalDebt = 0;
  let totalPaid = 0;
  relevantTxs.forEach((t) => {
    if (t.kind === 'شهریه_بدهی') totalDebt += t.debit || 0;
    if (t.kind === 'شهریه') totalPaid += t.credit || 0;
  });
  const netOutstandingDebt = Math.max(0, totalDebt - totalPaid);

  // Cheque alerts (pending review or due soon)
  const pendingCheques = cheques.filter((c) => c.status === 'pending');
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 10);
  const dueSoonCheques = cheques.filter((c) => {
    if (c.status !== 'approved') return false;
    const dueDate = new Date(c.due_date);
    return dueDate >= now && dueDate <= nextWeek;
  });

  const menuItems = [
    { id: 'students', label: 'دانش‌آموزان', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'tuition', label: 'دریافت شهریه', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'cheque_list', label: 'لیست چک‌ها', icon: FileCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'expenses', label: 'هزینه‌ها', icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'transactions', label: 'تراکنش‌ها', icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'statement', label: 'ریز گردش حساب', icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'claim', label: 'طلب من از مدرسه', icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'report', label: 'گزارش مالی', icon: BarChart3, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'activity', label: 'گزارش فعالیت', icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'settings', label: 'تنظیمات', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
  ];

  const seniorExtraItems = [
    { id: 'cheques', label: 'چک صیادی (تأیید)', icon: FileCheck, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'bank', label: 'تطبیق بانک', icon: Landmark, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'managers', label: 'مدیران', icon: UserCog, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'schools', label: 'مدارس', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'export', label: 'خروجی پارسیان', icon: FileSpreadsheet, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'messages', label: 'پیام به مدیران', icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-6">
      {/* Welcome Banner matching Android TR_BL gradient */}
      <div
        className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, #341648 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#f5dff2] mb-1">
              {isSenior ? 'نمای کلی مجموعه مدارس مدرسة القرآن' : currentUser?.school_name || 'مدرسه شما، حساب‌های شما'}
            </div>
            <h2 className="text-2xl md:text-3xl font-black">
              خوش آمدید، {currentUser?.name || 'مدیر محترم'}
            </h2>
            <div className="text-xs text-[#f5dff2]/80 mt-1">
              نقش کاربری: {isSenior ? 'کاربر ارشد سامانه' : 'مدیر مدرسه'}
            </div>
          </div>
          <DashboardClock />
        </div>
      </div>

      {/* Financial Overview Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-sm">
        <div className="text-xs font-bold text-gray-500 mb-3">وضعیت مالی</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#fcfaff] p-4 rounded-2xl border border-[#ede5ef] flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">دانش‌آموزان فعال</div>
              <div className="text-2xl font-black text-[#341648] mt-1 font-mono">
                {activeStudentsCount} <span className="text-xs font-normal text-gray-500">نفر</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#62205f]/10 flex items-center justify-center text-[#62205f]" style={{ color: accentColor }}>
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#fcfaff] p-4 rounded-2xl border border-[#ede5ef] flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">مانده بدهی شهریه دانش‌آموزان</div>
              <div className="text-2xl font-black text-rose-700 mt-1 font-mono">
                {formatRial(netOutstandingDebt)} <span className="text-xs font-normal text-gray-500">ریال</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Messages Banner */}
      {(pendingCheques.length > 0 || dueSoonCheques.length > 0 || seniorMessages.length > 0) && (
        <div className="space-y-3">
          {isSenior && pendingCheques.length > 0 && (
            <div
              onClick={() => setCurrentScreen('cheques')}
              className="cursor-pointer bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-amber-900 hover:bg-amber-100/70 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-xs sm:text-sm font-bold">
                  تعداد {pendingCheques.length} فقره چک صیادی در انتظار بررسی و تأیید کاربر ارشد است.
                </span>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-200/60 px-3 py-1 rounded-xl">
                بررسی چک‌ها ←
              </span>
            </div>
          )}

          {seniorMessages.length > 0 && (
            <div className="bg-white border border-[#e5dde8] rounded-2xl p-4 shadow-xs">
              <div className="text-xs font-bold text-[#62205f] flex items-center gap-1.5 mb-2.5" style={{ color: accentColor }}>
                <Megaphone className="w-4 h-4" />
                <span>پیام‌های مدیریت ارشد به مدارس</span>
              </div>
              <div className="space-y-2">
                {seniorMessages.slice(0, 2).map((msg) => (
                  <div key={msg.id} className="bg-[#fcfaff] p-3 rounded-xl border border-[#f0e8f2] text-xs">
                    <p className="font-semibold text-[#302735] leading-relaxed">{msg.message}</p>
                    <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                      <span>{msg.author_name}</span>
                      <span>{jalaliFromGregorian(msg.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Access Grid matching Android 2-column cardBtn layout */}
      <div>
        <div className="text-sm font-bold text-[#341648] mb-3">دسترسی سریع</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentScreen(item.id as ScreenType)}
                className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white border border-[#e5dde8] hover:border-[#62205f] hover:shadow-md active:scale-95 transition-all text-center group min-h-[120px]"
              >
                <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#341648] leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Senior Only Section */}
      {isSenior && (
        <div className="pt-2">
          <div className="text-sm font-bold text-[#62205f] mb-3 flex items-center gap-2" style={{ color: accentColor }}>
            <span>بخش ویژه مدیریت ارشد مجموعه</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {seniorExtraItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentScreen(item.id as ScreenType)}
                  className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white border border-[#e5dde8] hover:border-[#62205f] hover:shadow-md active:scale-95 transition-all text-center group min-h-[110px]"
                >
                  <div className={`w-11 h-11 rounded-2xl ${item.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-[#341648] leading-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
