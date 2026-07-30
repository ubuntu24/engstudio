'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/lib/api';
import { Sparkles, UserPlus, Lock, User as UserIcon, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await registerUser(username, password, displayName);
    if (res.ok) {
      setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển hướng sang Dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } else {
      setErrorMsg(res.error || 'Đăng ký thất bại. Vui lòng thử tên đăng nhập khác.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-bg-surface/90 border border-border-main p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="text-center space-y-3 relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-green-500 p-0.5 shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-bg-surface rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-400" />
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Tạo Tài Khoản Mới</h1>
          <p className="text-sm text-text-muted">
            Tạo tài khoản cá nhân để lưu giữ toàn bộ tiến trình học và từ vựng của bạn.
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2.5 animate-fade-in relative z-10">
            <span className="shrink-0 text-base">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 text-primary-400 text-xs font-semibold flex items-center gap-2.5 animate-fade-in relative z-10">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-primary-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
              Tên Hiển Thị (Display Name)
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-4 top-4" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Alex Nguyen"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-bg-surface border border-border-main text-text-main placeholder-slate-600 focus:outline-none focus:border-primary-500 text-sm font-medium transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
              Tên Đăng Nhập (Username) *
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-4 top-4" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập (ít nhất 3 ký tự)"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-bg-surface border border-border-main text-text-main placeholder-slate-600 focus:outline-none focus:border-primary-500 text-sm font-medium transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
              Mật Khẩu (Password) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
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
                <UserPlus className="w-4 h-4" /> Hoàn Tất Đăng Ký <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer info & Link to Login */}
        <div className="pt-4 border-t border-border-main/80 text-center text-xs text-text-muted relative z-10 space-y-3">
          <p>
            Đã có tài khoản từ trước?{' '}
            <Link href="/login" className="font-extrabold text-primary-400 hover:text-primary-400 hover:underline transition-all">
              Đăng Nhập Ngay 🔑
            </Link>
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
            <span>Đã mã hóa mật khẩu PBKDF2/SHA256 chuẩn bảo mật</span>
          </div>
        </div>
      </div>
    </div>
  );
}
