"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sparkles, LogIn, LogOut, X, ChevronDown, Menu } from "lucide-react";
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
} from "@/lib/api";
import { User } from "@/types";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/learn", label: "Học Từ Vựng" },
  { href: "/grammar", label: "Luyện Ngữ Pháp" },
  { href: "/quiz", label: "Bài Kiểm Tra" },
  { href: "/practice", label: "Luyện Đặt Câu" },
  { href: "/video", label: "Video Song Ngữ" },
  { href: "/dashboard", label: "Thống Kê Tiến Độ" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (user) setCurrentUser(user);
    });
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0f0c]/90 border-b border-[#15271c] text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shadow-md shadow-emerald-500/20 border border-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
              <Image
                src="/logo.png"
                alt="English Vault"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white block leading-tight">
                English Studio
              </span>
              <span className="block text-[8px] sm:text-[9px] font-bold tracking-widest text-emerald-400 uppercase"></span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#0e2116] text-[#4ade80] border border-[#1d462f] font-bold shadow-inner"
                      : "text-slate-300 hover:text-white hover:bg-[#0f1d14]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Auth Section & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 bg-[#0d1611] border border-[#162a1e] px-2.5 sm:px-3 py-1.5 rounded-full hover:border-[#224430] transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
                    {(currentUser.display_name || currentUser.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-200 max-w-[80px] sm:max-w-[120px] truncate">
                    {currentUser.display_name || currentUser.username || "demo"}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-[#0d1611] border border-[#183123] rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Đăng Nhập
              </Link>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              className="lg:hidden p-2 rounded-full bg-[#0d1611] border border-[#162a1e] text-slate-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#0d1611] border-t border-[#15271c] px-4 py-4 space-y-2 animate-fade-in shadow-xl">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#0e2116] text-[#4ade80] border border-[#1d462f] font-bold"
                    : "text-slate-300 hover:text-white hover:bg-[#122319]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
