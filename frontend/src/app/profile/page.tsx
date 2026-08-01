"use client";

import { useEffect, useState } from "react";
import { User, DashboardStats } from "@/types";
import { fetchCurrentUser, fetchDashboardStats } from "@/lib/api";
import {
  User as UserIcon,
  Trophy,
  Star,
  Target,
  Flame,
  BookOpen,
  Award,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [userData, statsData] = await Promise.all([
          fetchCurrentUser(),
          fetchDashboardStats(),
        ]);
        setUser(userData);
        setStats(statsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-6 bg-bg-card rounded-3xl border border-border-main space-y-6 shadow-xl mt-10">
        <UserIcon className="w-16 h-16 text-text-muted mx-auto" />
        <h2 className="text-3xl font-black text-text-main">Chưa đăng nhập</h2>
        <p className="text-text-muted">
          Bạn cần đăng nhập để xem hồ sơ cá nhân và theo dõi tiến độ.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-400 text-text-primary-fg font-black text-sm shadow-lg transition-all"
        >
          Đăng Nhập Ngay
        </Link>
      </div>
    );
  }

  const xp = user.xp || 0;
  const level = user.level || 1;
  const xpCurrentLevel = xp % 100;
  const progressPercent = Math.min(100, Math.max(0, xpCurrentLevel));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header Profile Card */}
      <div className="bg-bg-card border border-border-main p-8 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Background Decorative */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary-600 to-primary-400 p-1 shadow-xl shadow-primary-500/30">
              <div className="w-full h-full bg-bg-surface rounded-full flex items-center justify-center border-4 border-bg-card">
                <span className="text-5xl font-black text-primary-500">
                  {(user.display_name || user.username || "U").charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 bg-bg-card rounded-full p-1.5 shadow-lg">
              <div className="bg-amber-500 text-bg-surface rounded-full w-10 h-10 flex items-center justify-center font-black border-2 border-bg-card shadow-inner">
                {level}
              </div>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-4 w-full">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-text-main tracking-tight">
                {user.display_name || user.username}
              </h1>
              <p className="text-text-muted mt-1 font-medium text-lg">
                @{user.username}
              </p>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-2 max-w-md mx-auto sm:mx-0">
              <div className="flex justify-between items-end text-sm">
                <span className="font-bold text-primary-400 flex items-center gap-1.5">
                  <Star className="w-4 h-4" /> Tổng XP: {xp}
                </span>
                <span className="text-text-muted font-semibold text-xs">
                  {xpCurrentLevel} / 100 XP
                </span>
              </div>
              <div className="h-4 bg-bg-surface border border-border-hover rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-teal-400 transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-text-muted font-medium text-right">
                Cần thêm {100 - xpCurrentLevel} XP để lên cấp {level + 1}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border-main p-6 rounded-3xl shadow-lg flex flex-col items-center justify-center text-center space-y-2 hover:border-primary-500/50 transition-colors group">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Flame className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-text-main">
            {stats?.streak_days || 0}
          </div>
          <div className="text-sm font-semibold text-text-muted">
            Ngày Chuỗi Học
          </div>
        </div>

        <div className="bg-bg-card border border-border-main p-6 rounded-3xl shadow-lg flex flex-col items-center justify-center text-center space-y-2 hover:border-primary-500/50 transition-colors group">
          <div className="w-12 h-12 bg-teal-500/10 text-teal-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-text-main">
            {stats?.accuracy_rate || 0}%
          </div>
          <div className="text-sm font-semibold text-text-muted">
            Tỷ lệ Chính xác
          </div>
        </div>

        <div className="bg-bg-card border border-border-main p-6 rounded-3xl shadow-lg flex flex-col items-center justify-center text-center space-y-2 hover:border-primary-500/50 transition-colors group">
          <div className="w-12 h-12 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-text-main">
            {stats?.mastered_words || 0}
          </div>
          <div className="text-sm font-semibold text-text-muted">
            Từ đã thuộc (Mastered)
          </div>
        </div>

        <div className="bg-bg-card border border-border-main p-6 rounded-3xl shadow-lg flex flex-col items-center justify-center text-center space-y-2 hover:border-primary-500/50 transition-colors group">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Award className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-text-main">
            {level}
          </div>
          <div className="text-sm font-semibold text-text-muted">
            Cấp độ Hiện tại
          </div>
        </div>
      </div>
      
      {/* Rules / Information */}
      <div className="bg-bg-surface border border-border-main p-6 rounded-3xl space-y-4">
        <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          Cơ Chế Tính Điểm & Xếp Hạng
        </h3>
        <ul className="space-y-3 text-sm text-text-muted font-medium list-disc list-inside">
          <li><strong>Học Flashcard:</strong> Chọn "Dễ" (+12 XP), "Tốt" (+10 XP), "Khó" (+5 XP), "Quên" (+1 XP).</li>
          <li><strong>Chống Spam:</strong> Lật bài và chọn quá nhanh (dưới 1 giây) sẽ bị coi là spam và <strong className="text-rose-400">Không được cộng XP</strong>.</li>
          <li><strong>Làm Bài Kiểm Tra (Quiz):</strong> Trả lời đúng (+2 XP). Nếu trả lời sai, bạn sẽ bị phạt <strong className="text-rose-400">-5 XP</strong> vì trước đó đã báo là thuộc từ.</li>
          <li><strong>Lên Cấp (Level Up):</strong> Cứ tích đủ 100 XP, bạn sẽ được thăng 1 cấp. Cấp độ càng cao, tên của bạn càng nổi bật trên Bảng Xếp Hạng!</li>
        </ul>
      </div>
    </div>
  );
}
