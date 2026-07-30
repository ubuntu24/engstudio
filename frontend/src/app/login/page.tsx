"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/api";
import {
  Sparkles,
  LogIn,
  Lock,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await loginUser(username, password);
    if (res.ok) {
      window.location.href = "/dashboard";
    } else {
      setErrorMsg(res.error || "Tên đăng nhập hoặc mật khẩu không chính xác.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-bg-surface/90 border border-border-main p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="text-center space-y-3 relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-green-500 p-0.5 shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-bg-surface rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-400" />
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-black text-text-main tracking-tight">
            Đăng Nhập Tài Khoản
          </h1>
          <p className="text-sm text-text-muted">
            Chào mừng trở lại! Tiếp tục hành trình chinh phục tiếng Anh của bạn.
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2.5 animate-fade-in relative z-10">
            <span className="shrink-0 text-base">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
              Tên Đăng Nhập (Username)
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-4 top-4" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập của bạn"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-bg-surface border border-border-main text-text-main placeholder-slate-600 focus:outline-none focus:border-primary-500 text-sm font-medium transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                Mật Khẩu (Password)
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-bg-surface border border-border-main text-text-main placeholder-slate-600 focus:outline-none focus:border-primary-500 text-sm font-medium transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-text-primary-fg font-extrabold text-sm shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 group mt-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Đăng Nhập Ngay{" "}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer info & Link to Register */}
        <div className="pt-4 border-t border-border-main/80 text-center text-xs text-text-muted relative z-10 space-y-3">
          <p>
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-extrabold text-primary-400 hover:text-primary-400 hover:underline transition-all"
            >
              Đăng Ký Ngay
            </Link>
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
            <span>Bảo mật, an toàn tiêu chuẩn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
