"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Award, Crown, Loader2, Sparkles } from "lucide-react";
import { fetchLeaderboard } from "@/lib/api";

type LeaderboardUser = {
  id: number;
  username: string;
  display_name: string;
  xp: number;
  level: number;
};

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await fetchLeaderboard();
        if (res && res.users) {
          // Type cast since User from api might not have xp/level in the interface yet
          setUsers(res.users as unknown as LeaderboardUser[]);
        } else {
          setError("Không tải được dữ liệu.");
        }
      } catch (err: any) {
        setError(err.message || "Đã xảy ra lỗi.");
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <p className="text-text-muted font-medium">Đang tải bảng xếp hạng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl text-center max-w-md">
          <p className="font-bold text-lg mb-2">Lỗi tải dữ liệu</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/30 mb-2 shadow-lg shadow-yellow-500/20">
          <Crown className="w-8 h-8 text-yellow-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-text-main">
          Bảng Vàng <span className="text-yellow-500">Xếp Hạng</span>
        </h1>
        <p className="text-lg text-text-muted max-w-xl mx-auto">
          Cạnh tranh cùng những học viên xuất sắc nhất. Chăm chỉ học tập, trả lời đúng flashcard để nhận thật nhiều XP!
        </p>
      </div>

      {/* Top 3 Podium */}
      {users.length >= 3 && (
        <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 pt-8">
          {/* Top 2 - Bạc */}
          <div className="order-2 md:order-1 flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gray-400/20 border-4 border-gray-400 flex items-center justify-center shadow-lg shadow-gray-400/20 z-10 relative">
                <span className="text-2xl font-black text-gray-400">
                  {users[1].display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center border-2 border-bg-base z-20">
                <span className="text-bg-base font-black text-sm">2</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center">
              <span className="font-bold text-text-main text-lg">{users[1].display_name}</span>
              <span className="text-sm font-semibold text-gray-400 px-3 py-1 rounded-full bg-gray-400/10 mt-1">
                Lv.{users[1].level}
              </span>
              <span className="font-black text-xl text-text-main mt-2">{users[1].xp.toLocaleString()} <span className="text-xs text-text-muted">XP</span></span>
            </div>
            <div className="w-28 h-32 bg-gradient-to-t from-gray-400/20 to-gray-400/5 mt-4 rounded-t-2xl border-t-2 border-x-2 border-gray-400/20"></div>
          </div>

          {/* Top 1 - Vàng */}
          <div className="order-1 md:order-2 flex flex-col items-center animate-fade-in-up z-10" style={{ animationDelay: '0ms' }}>
            <div className="relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400/20" />
              </div>
              <div className="w-24 h-24 rounded-full bg-yellow-400/20 border-4 border-yellow-400 flex items-center justify-center shadow-2xl shadow-yellow-400/40 z-10 relative">
                <span className="text-3xl font-black text-yellow-400">
                  {users[0].display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-bg-base z-20 shadow-lg">
                <span className="text-bg-base font-black text-lg">1</span>
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center">
              <span className="font-black text-text-main text-xl">{users[0].display_name}</span>
              <span className="text-sm font-bold text-yellow-400 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Lv.{users[0].level}
              </span>
              <span className="font-black text-3xl text-yellow-400 mt-2 tracking-tight">{users[0].xp.toLocaleString()} <span className="text-sm text-yellow-400/70">XP</span></span>
            </div>
            <div className="w-32 h-40 bg-gradient-to-t from-yellow-400/30 to-yellow-400/5 mt-4 rounded-t-3xl border-t-4 border-x-2 border-yellow-400/30"></div>
          </div>

          {/* Top 3 - Đồng */}
          <div className="order-3 flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-amber-600/20 border-4 border-amber-600 flex items-center justify-center shadow-lg shadow-amber-600/20 z-10 relative">
                <span className="text-2xl font-black text-amber-600">
                  {users[2].display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center border-2 border-bg-base z-20">
                <span className="text-bg-base font-black text-sm">3</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center">
              <span className="font-bold text-text-main text-lg">{users[2].display_name}</span>
              <span className="text-sm font-semibold text-amber-600 px-3 py-1 rounded-full bg-amber-600/10 mt-1">
                Lv.{users[2].level}
              </span>
              <span className="font-black text-xl text-text-main mt-2">{users[2].xp.toLocaleString()} <span className="text-xs text-text-muted">XP</span></span>
            </div>
            <div className="w-28 h-24 bg-gradient-to-t from-amber-600/20 to-amber-600/5 mt-4 rounded-t-2xl border-t-2 border-x-2 border-amber-600/20"></div>
          </div>
        </div>
      )}

      {/* Rest of the List */}
      <div className="bg-bg-surface border border-border-main rounded-3xl p-2 sm:p-6 shadow-xl max-w-3xl mx-auto">
        <div className="space-y-2">
          {users.slice(3).map((user, index) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-bg-surface-hover transition-colors group border border-transparent hover:border-border-main"
            >
              <div className="w-8 text-center">
                <span className="text-lg font-bold text-text-muted group-hover:text-text-main transition-colors">
                  {index + 4}
                </span>
              </div>
              
              <div className="w-10 h-10 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center font-bold text-primary-500">
                {user.display_name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-text-main text-base">{user.display_name}</h3>
                <span className="text-xs font-semibold text-primary-400 bg-primary-400/10 px-2 py-0.5 rounded-full inline-block mt-1">
                  Level {user.level}
                </span>
              </div>

              <div className="text-right">
                <span className="font-black text-lg text-text-main block">{user.xp.toLocaleString()}</span>
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">XP</span>
              </div>
            </div>
          ))}
          
          {users.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-border-hover mx-auto mb-4" />
              <p className="text-text-muted font-medium">Chưa có ai trên bảng xếp hạng.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
