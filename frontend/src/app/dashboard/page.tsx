'use client';

import { useEffect, useState } from 'react';
import { fetchDashboardStats } from '@/lib/api';
import { DashboardStats } from '@/types';
import {
  Flame, Target, Trophy, Zap
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_words: 0,
    mastered_words: 0,
    learning_words: 0,
    review_due_count: 0,
    accuracy_rate: 0,
    streak_days: 0,
    chart_data: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats().then((data) => {
      if (data) {
        setStats(data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const unstartedCount = Math.max(0, stats.total_words - (stats.mastered_words + stats.learning_words));
  const masteryPercentage = stats.total_words > 0 ? Math.round((stats.mastered_words / stats.total_words) * 100) : 18;

  const chartData = stats.chart_data && stats.chart_data.length === 5 ? stats.chart_data : [
    { date: '', count: 0 }, { date: '', count: 0 }, { date: '', count: 0 }, { date: '', count: 0 }, { date: '', count: 0 }
  ];

  const maxCount = Math.max(10, ...chartData.map(d => d.count));
  const yAxisMax = Math.ceil(maxCount / 10) * 10;
  
  const getX = (index: number) => index * 125;
  const getY = (count: number) => 180 - (count / yAxisMax) * 160;

  let svgPath = `M ${getX(0)} ${getY(chartData[0].count)}`;
  for (let i = 1; i < chartData.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(chartData[i - 1].count);
    const currX = getX(i);
    const currY = getY(chartData[i].count);
    const cp1x = prevX + 62.5;
    const cp1y = prevY;
    const cp2x = currX - 62.5;
    const cp2y = currY;
    svgPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currX} ${currY}`;
  }
  const svgFillPath = `${svgPath} L 500 200 L 0 200 Z`;

  const yLabels = [yAxisMax, Math.round(yAxisMax*0.75), Math.round(yAxisMax*0.5), Math.round(yAxisMax*0.25), 0];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-slate-400 font-medium">
          Tổng quan tiến độ học tập & thống kê hiệu quả
        </p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Streak */}
        <div className="p-6 rounded-3xl bg-[#0f1712] border border-[#224430] shadow-xl space-y-4 hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Flame className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-[#06140c] px-2.5 py-1 rounded-full border border-emerald-500/30">
              Streak 🔥
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              {stats.streak_days} Ngày
            </div>
            <div className="text-xs text-slate-400 font-semibold mt-1">
              Chuỗi Học Tập
            </div>
          </div>
        </div>

        {/* Card 2: Tổng Số Từ Vựng */}
        <div className="p-6 rounded-3xl bg-[#0f1712] border border-[#192b1f] shadow-xl space-y-4 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Target className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              KHO TỪ VỰNG
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300">
              Tổng Số Từ Vựng
            </div>
            <div className="text-3xl font-black text-white tracking-tight mt-0.5">
              {stats.total_words} Từ
            </div>
          </div>
        </div>

        {/* Card 3: Từ Đã Thành Thục */}
        <div className="p-6 rounded-3xl bg-[#0f1712] border border-[#192b1f] shadow-xl space-y-4 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Trophy className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              ĐÃ THUỘC
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300">
              Từ Đã Thành Thục
            </div>
            <div className="text-3xl font-black text-white tracking-tight mt-0.5">
              {stats.mastered_words} Từ
            </div>
          </div>
        </div>

        {/* Card 4: Tỷ Lệ Chính Xác */}
        <div className="p-6 rounded-3xl bg-[#0f1712] border border-[#192b1f] shadow-xl space-y-4 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              ĐỘ CHÍNH XÁC
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300">
              Tỷ Lệ Chính Xác
            </div>
            <div className="text-3xl font-black text-white tracking-tight mt-0.5">
              {stats.accuracy_rate}%
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Progress Chart */}
      <div className="p-7 rounded-3xl bg-[#0f1712] border border-[#192b1f] shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Biểu Đồ Tiến Độ Học Tập
          </h2>
          <div className="flex items-center gap-6 text-xs font-bold">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-4 h-1 rounded-full bg-emerald-400" /> Ôn Tập
            </span>
          </div>
        </div>

        {/* SVG Curve Chart */}
        <div className="relative h-64 w-full">
          <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-500 font-mono pointer-events-none">
            {yLabels.map((label) => (
              <div key={label} className="flex items-center gap-4">
                <span className="w-8 text-right font-sans font-medium text-slate-300">{label}</span>
                <div className="flex-1 h-px bg-[#15241b]" />
              </div>
            ))}
          </div>

          <svg className="absolute inset-0 pl-12 pb-6 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 200">
            <defs>
              <linearGradient id="gradWhiteTextGreenish" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <path
              d={svgFillPath}
              fill="url(#gradWhiteTextGreenish)"
            />

            <path
              d={svgPath}
              fill="none"
              stroke="#4ade80"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute bottom-0 left-12 right-0 flex justify-between text-xs text-slate-300 font-medium">
            {chartData.map((d, i) => (
              <span key={i}>{d.date}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: SRS Mastery Progress */}
      <div className="p-7 rounded-3xl bg-[#0f1712] border border-[#192b1f] shadow-2xl space-y-6">
        <h2 className="text-lg font-bold text-white">
          Tiến Độ Thành Thục Từ Vựng (SRS)
        </h2>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">Tỷ lệ hoàn thành toàn bộ từ</span>
            <span className="text-white font-extrabold">{masteryPercentage}% Thành Thục</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#060a08] border border-[#172e21] overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${masteryPercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#060a08] border border-[#1b3b27] space-y-1">
            <div className="text-xs text-slate-400 font-bold">Từ Đã Thuộc</div>
            <div className="text-xl font-black text-white">
              {stats.mastered_words} từ
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#060a08] border border-[#16362d] space-y-1">
            <div className="text-xs text-slate-400 font-bold">Đang Học</div>
            <div className="text-xl font-black text-white">
              {stats.learning_words} từ
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#060a08] border border-[#2d3817] space-y-1">
            <div className="text-xs text-slate-400 font-bold">Cần Ôn Ngay</div>
            <div className="text-xl font-black text-white">
              {stats.review_due_count} từ
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#060a08] border border-[#1a251f] space-y-1">
            <div className="text-xs text-slate-500 font-bold">Chưa Bắt Đầu</div>
            <div className="text-xl font-black text-white">
              {unstartedCount} từ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
