import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { formatRial, fromGregorian, JALALI_MONTH_NAMES, todayGregorian } from '../../utils/jalali';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  School as SchoolIcon,
  CreditCard,
  DollarSign,
  ArrowUpRight,
  Filter,
  CheckCircle,
} from 'lucide-react';

export const TuitionTrendsScreen: React.FC = () => {
  const { transactions, schools, currentUser, accentColor } = useApp();
  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 0
  );
  const [monthsCount, setMonthsCount] = useState<6 | 12>(6);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Filter transactions
  const tuitionTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (t.kind !== 'شهریه') return false;
      if (selectedSchoolId !== 0 && t.school_id !== selectedSchoolId) return false;
      if (!isSenior && t.school_id !== currentUser?.school_id) return false;
      return true;
    });
  }, [transactions, selectedSchoolId, isSenior, currentUser]);

  // Generate Jalali months array
  const monthsData = useMemo(() => {
    const now = new Date();
    const [currentJYear, currentJMonth] = fromGregorian(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );

    const list: Array<{ year: number; month: number; label: string; key: string }> = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      let m = currentJMonth - i;
      let y = currentJYear;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      const monthName = JALALI_MONTH_NAMES[m - 1];
      const key = `${y}/${String(m).padStart(2, '0')}`;
      list.push({ year: y, month: m, label: monthName, key });
    }

    const monthlySums: Record<string, number> = Object.fromEntries(list.map((item) => [item.key, 0]));
    const countSums: Record<string, number> = Object.fromEntries(list.map((item) => [item.key, 0]));

    tuitionTxs.forEach((t) => {
      const cleanDate = (t.date || todayGregorian()).substring(0, 10);
      const [gy, gm, gd] = cleanDate.split('-').map(Number);
      if (!gy || !gm || !gd) return;
      try {
        const [jy, jm] = fromGregorian(gy, gm, gd);
        const key = `${jy}/${String(jm).padStart(2, '0')}`;
        if (monthlySums[key] !== undefined) {
          monthlySums[key] += t.credit || t.amount || 0;
          countSums[key] += 1;
        }
      } catch {}
    });

    return list.map((item) => ({
      monthName: item.label,
      yearMonth: item.key,
      amount: monthlySums[item.key] || 0,
      amountInMillions: Math.round((monthlySums[item.key] || 0) / 1000000),
      count: countSums[item.key] || 0,
    }));
  }, [monthsCount, tuitionTxs]);

  const totalCollected = useMemo(() => {
    return monthsData.reduce((sum, item) => sum + item.amount, 0);
  }, [monthsData]);

  const avgPerMonth = useMemo(() => {
    return monthsCount > 0 ? Math.round(totalCollected / monthsCount) : 0;
  }, [totalCollected, monthsCount]);

  const peakMonth = useMemo(() => {
    if (monthsData.length === 0) return null;
    return [...monthsData].sort((a, b) => b.amount - a.amount)[0];
  }, [monthsData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-[#341648] text-white p-3 rounded-2xl shadow-xl border border-white/20 text-xs">
        <div className="font-bold text-amber-300 mb-1">
          {data.monthName} ({data.yearMonth})
        </div>
        <div className="flex items-center justify-between gap-3 text-gray-200">
          <span>شهریه دریافتی:</span>
          <span className="font-mono font-bold text-white">{formatRial(data.amount)} ریال</span>
        </div>
        <div className="text-[10px] text-gray-300 mt-1">
          معادل {data.amountInMillions.toLocaleString('fa-IR')} میلیون ریال ({data.count} واریزی)
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16 w-full max-w-full overflow-x-hidden">
      <Header title="روند شهریه‌های دریافتی" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5 w-full min-w-0">
        {/* Banner */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #2f0b38 100%)`,
          }}
        >
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
              <span>تحلیل روند وصـول شهریه مدارس</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-neyrizi">
              نمودار تحلیلی و گزارش آماری شهریه‌های دریافتی
            </h2>
            <p className="text-xs text-[#f5dff2]/90 max-w-2xl leading-relaxed">
              بررسی مقایسه‌ای مبالغ وصول‌شده در ماه‌های مختلف سال تحصیلی و سنجش نرخ پیشرفت درآمدی به تفکیک مدارس.
            </p>
          </div>
        </div>

        {/* Filter & Controls Bar */}
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs flex flex-wrap items-center justify-between gap-3">
          {isSenior && (
            <div className="flex items-center gap-2 min-w-0">
              <SchoolIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
                className="py-2 px-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648] focus:outline-hidden"
              >
                <option value={0}>همه واحدهای آموزشی (کل مجموعه)</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 mr-auto">
            <div className="flex bg-[#f2eaf3] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMonthsCount(6)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  monthsCount === 6 ? 'bg-white text-[#62205f] shadow-xs' : 'text-gray-600'
                }`}
              >
                ۶ ماه اخیر
              </button>
              <button
                type="button"
                onClick={() => setMonthsCount(12)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  monthsCount === 12 ? 'bg-white text-[#62205f] shadow-xs' : 'text-gray-600'
                }`}
              >
                ۱۲ ماه اخیر
              </button>
            </div>

            <div className="flex bg-[#f2eaf3] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chartType === 'bar' ? 'bg-white text-[#62205f] shadow-xs' : 'text-gray-600'
                }`}
                title="نمودار ستونی"
              >
                ستونی
              </button>
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chartType === 'area' ? 'bg-white text-[#62205f] shadow-xs' : 'text-gray-600'
                }`}
                title="نمودار سطحی"
              >
                موجی
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs">
            <div className="text-gray-500 text-xs font-semibold flex items-center justify-between">
              <span>مجموع دریافتی ({monthsCount} ماه):</span>
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-black font-mono text-[#341648] mt-2">
              {formatRial(totalCollected)} <span className="text-xs font-normal text-gray-500">ریال</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs">
            <div className="text-gray-500 text-xs font-semibold flex items-center justify-between">
              <span>میانگین وصولی ماهانه:</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-black font-mono text-[#341648] mt-2">
              {formatRial(avgPerMonth)} <span className="text-xs font-normal text-gray-500">ریال</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#e5dde8] shadow-xs">
            <div className="text-gray-500 text-xs font-semibold flex items-center justify-between">
              <span>بیشترین ماه وصولی:</span>
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg font-black text-[#341648] mt-2 flex items-center gap-2">
              <span>{peakMonth?.monthName || '—'}</span>
              <span className="text-xs font-mono font-bold text-gray-500">({peakMonth?.amountInMillions || 0} م)</span>
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#62205f]" style={{ color: accentColor }} />
              <h3 className="font-bold text-sm text-[#341648]">روند ماهانه مبالغ شهریه وصول‌شده</h3>
            </div>
            <span className="text-xs text-gray-400">واحد محور: میلیون ریال</span>
          </div>

          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={monthsData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e9f3" />
                  <XAxis
                    dataKey="monthName"
                    tick={{ fill: '#625866', fontSize: 11, fontFamily: 'Vazirmatn, sans-serif' }}
                    axisLine={{ stroke: '#e5dde8' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8f7f95', fontSize: 10, fontFamily: 'Vazirmatn, sans-serif' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v} م`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f4f9', radius: 10 }} />
                  <Bar dataKey="amountInMillions" name="شهریه" radius={[8, 8, 0, 0]} maxBarSize={44}>
                    {monthsData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === monthsData.length - 1 ? accentColor : '#9b6b98'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={monthsData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="tuitionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accentColor} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e9f3" />
                  <XAxis
                    dataKey="monthName"
                    tick={{ fill: '#625866', fontSize: 11, fontFamily: 'Vazirmatn, sans-serif' }}
                    axisLine={{ stroke: '#e5dde8' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8f7f95', fontSize: 10, fontFamily: 'Vazirmatn, sans-serif' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v} م`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amountInMillions"
                    stroke={accentColor}
                    fillOpacity={1}
                    fill="url(#tuitionGrad)"
                    strokeWidth={3}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="bg-white rounded-3xl border border-[#e5dde8] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h4 className="font-bold text-sm text-[#341648]">جدول تفکیکی وصولی به ازای هر ماه</h4>
            <span className="text-xs text-gray-400">تعداد ماه‌ها: {monthsData.length}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {monthsData.map((m) => (
              <div key={m.yearMonth} className="p-3.5 hover:bg-[#fcfaff] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                  <span className="font-bold text-[#341648]">{m.monthName}</span>
                  <span className="text-gray-400 font-mono">({m.yearMonth})</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{m.count} تراکنش واریزی</span>
                  <span className="font-mono font-black text-gray-900 text-sm">
                    {formatRial(m.amount)} ریال
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
