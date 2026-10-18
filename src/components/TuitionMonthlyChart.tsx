import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Transaction } from '../types';
import { fromGregorian, formatRial, JALALI_MONTH_NAMES } from '../utils/jalali';
import { BarChart3, TrendingUp } from 'lucide-react';

interface TuitionMonthlyChartProps {
  transactions: Transaction[];
  accentColor: string;
}

interface MonthData {
  monthName: string;
  yearMonth: string;
  amount: number;
  amountInMillions: number;
}

export const TuitionMonthlyChart: React.FC<TuitionMonthlyChartProps> = ({ transactions, accentColor }) => {
  const now = new Date();
  const [currentJYear, currentJMonth] = fromGregorian(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const last6Months: Array<{ year: number; month: number; label: string; key: string }> = [];
  for (let i = 5; i >= 0; i--) {
    let month = currentJMonth - i;
    let year = currentJYear;
    while (month <= 0) { month += 12; year -= 1; }
    last6Months.push({ year, month, label: JALALI_MONTH_NAMES[month - 1], key: `${year}/${String(month).padStart(2, '0')}` });
  }

  const monthlySums: Record<string, number> = Object.fromEntries(last6Months.map((item) => [item.key, 0]));
  transactions.forEach((t) => {
    if (t.kind !== 'شهریه') return;
    const [gy, gm, gd] = t.date.substring(0, 10).split('-').map(Number);
    if (!gy || !gm || !gd) return;
    try {
      const [jy, jm] = fromGregorian(gy, gm, gd);
      const key = `${jy}/${String(jm).padStart(2, '0')}`;
      if (monthlySums[key] !== undefined) monthlySums[key] += t.credit || t.amount || 0;
    } catch { /* Ignore malformed transaction dates. */ }
  });

  const chartData: MonthData[] = last6Months.map((item) => ({
    monthName: item.label,
    yearMonth: item.key,
    amount: monthlySums[item.key],
    amountInMillions: Math.round(monthlySums[item.key] / 1000000),
  }));
  const totalCollected6Months = chartData.reduce((sum, item) => sum + item.amount, 0);
  const hasRecordedPayments = totalCollected6Months > 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as MonthData;
    return <div className="bg-[#341648] text-white p-3 rounded-xl shadow-xl border border-white/20 text-xs">
      <div className="font-bold text-[#ffd353] mb-1">{data.monthName} ({data.yearMonth})</div>
      <div className="flex items-center gap-1.5"><span className="opacity-80">شهریه دریافتی:</span><span className="font-mono font-black">{formatRial(data.amount)} ریال</span></div>
      <div className="text-[10px] text-gray-300 mt-1">معادل {data.amountInMillions.toLocaleString('fa-IR')} میلیون ریال</div>
    </div>;
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between pb-2 border-b border-[#f2eaf3] gap-2">
        <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}><BarChart3 className="w-4 h-4" /></span><div><h3 className="text-sm font-bold text-[#341648]">روند شهریه‌های دریافتی (۶ ماه گذشته)</h3><p className="text-[10px] text-gray-400">مبالغ مبتنی بر تراکنش‌های ثبت‌شده</p></div></div>
        <div className="flex items-center gap-1.5 bg-[#fcfaff] px-2.5 py-1 rounded-lg border border-[#ede5ef]"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /><span className="text-[10px] text-gray-500">مجموع:</span><span className="text-[10px] font-black font-mono text-[#62205f]">{formatRial(totalCollected6Months)} ریال</span></div>
      </div>
      {hasRecordedPayments ? <>
        <div className="w-full h-56 pt-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -15, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e9f3" /><XAxis dataKey="monthName" tick={{ fill: '#625866', fontSize: 11, fontFamily: 'Vazirmatn, sans-serif' }} axisLine={{ stroke: '#e5dde8' }} tickLine={false} /><YAxis tick={{ fill: '#8f7f95', fontSize: 10, fontFamily: 'Vazirmatn, sans-serif' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value} م`} /><Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f4f9', radius: 10 }} /><Bar dataKey="amountInMillions" name="مبلغ شهریه" radius={[8, 8, 0, 0]} maxBarSize={44}>{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? accentColor : '#9b6b98'} />)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">مقادیر محور عمودی بر حسب میلیون ریال است.</div>
      </> : <div className="rounded-xl border border-dashed border-[#e5dde8] bg-[#fcfaff] p-8 text-center text-xs text-gray-500">در شش ماه گذشته تراکنش واقعی شهریه برای نمایش ثبت نشده است.</div>}
    </div>
  );
};
