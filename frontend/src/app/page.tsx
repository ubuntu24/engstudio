"use client";

import Link from "next/link";
import {
  BookOpen,
  Brain,
  CheckSquare,
  LayoutDashboard,
  Video,
  ArrowRight,
  Sparkles,
  Flame,
  Target,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDashboardStats } from "@/lib/api";
import { DashboardStats } from "@/types";

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    total_words: 3312,
    mastered_words: 0,
    learning_words: 0,
    review_due_count: 0,
    accuracy_rate: 0,
    streak_days: 0,
  });

  useEffect(() => {
    fetchDashboardStats().then((data) => {
      if (data && data.total_words > 0) setStats(data);
    });
  }, []);

  const features = [
    {
      href: "/learn",
      title: "Học Từ Vựng 3D",
      desc: "Thẻ từ vựng tương tác 3D, âm thanh chuẩn IPA, ví dụ thực tế.",
      icon: BookOpen,
      tag: "Từ vựng",
    },
    {
      href: "/practice",
      title: "Luyện Đặt Câu Realtime",
      desc: "Phản hồi từng từ thời gian thực, phát hiện dư/thiếu từ chuẩn thuật toán đếm Counter & chỉnh lỗi ngữ pháp.",
      icon: CheckSquare,
      tag: "Ngữ pháp",
    },
    {
      href: "/quiz",
      title: "Bài Kiểm Tra Tương Tác",
      desc: "Thử thách trắc nghiệm ôn tập từ vựng đã học và khám phá từ vựng mới.",
      icon: Brain,
      tag: "Kiểm tra",
    },
    {
      href: "/video",
      title: "Xem Video Phụ Đề Song Ngữ",
      desc: "Học tiếng Anh qua YouTube/Tiktok với phụ đề kép Anh - Việt, tự động bóc tách và tra từ.",
      icon: Video,
      tag: "Phụ đề",
    },
    {
      href: "/dashboard",
      title: "Thống Kê Tiến Độ",
      desc: "Theo dõi tổng số từ đã thuộc, tỷ lệ chính xác, chuỗi ngày học liên tục và biểu đồ tăng trưởng.",
      icon: LayoutDashboard,
      tag: "Phân tích",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0f1712] p-8 md:p-12 border border-[#192b1f] shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0e2116] border border-[#1d462f] text-[#4ade80] text-xs font-bold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Hệ Thống Học Tiếng Anh Thông Minh Studio
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Nâng Tầm Tiếng Anh Với <br />
            <span className="text-white">Flashcard 3D</span>
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-2xl font-medium">
            Tối ưu ghi nhớ từ vựng bằng Flashcard, phát hiện chính xác lỗi gõ
            thừa/lặp từ và luyện phát âm ngữ cảnh qua video.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all"
            >
              <span>Bắt Đầu Học Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#060a08] hover:bg-[#0c1610] text-slate-200 font-bold text-sm border border-[#172b1f] transition-all"
            >
              <span>Xem Thống Kê Tiến Độ</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Overview Stats Bar with Pure White Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0f1712] border border-[#192b1f] space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Flame className="w-4 h-4 text-emerald-400" />
            Chuỗi Ngày Học
          </div>
          <div className="text-2xl font-black text-white">
            {stats.streak_days} Ngày
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f1712] border border-[#192b1f] space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Target className="w-4 h-4 text-emerald-400" />
            Tổng Kho Từ Vựng
          </div>
          <div className="text-2xl font-black text-white">
            {stats.total_words || 3312} Từ
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f1712] border border-[#192b1f] space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Trophy className="w-4 h-4 text-[#4ade80]" />
            Từ Đã Thành Thục
          </div>
          <div className="text-2xl font-black text-white">
            {stats.mastered_words} Từ
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f1712] border border-[#192b1f] space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Sparkles className="w-4 h-4 text-teal-400" />
            Độ Chính Xác
          </div>
          <div className="text-2xl font-black text-white">
            {stats.accuracy_rate}%
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Các Tính Năng Học Tập Chính
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.href}
                href={feat.href}
                className="group p-6 rounded-3xl bg-[#0f1712] border border-[#192b1f] hover:border-emerald-500/40 transition-all duration-300 shadow-xl hover:scale-[1.02] flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#060a08] px-2.5 py-1 rounded-full border border-[#172b1f]">
                      {feat.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
                      {feat.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-6 flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <span>Trải nghiệm ngay</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
