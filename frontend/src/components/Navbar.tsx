"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sparkles, LogIn, LogOut, X, ChevronDown, Menu, User as UserIcon } from "lucide-react";
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
} from "@/lib/api";
import { User } from "@/types";
import { ThemeSwitcher } from "./ThemeSwitcher";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/learn", label: "Từ Vựng" },
  { href: "/grammar", label: "Ngữ Pháp" },
  { href: "/quiz", label: "Kiểm Tra" },
  { href: "/practice", label: "Đặt Câu" },
  { href: "/video", label: "Video" },
  { href: "/news", label: "Tin Tức" },
  { href: "/leaderboard", label: "Xếp Hạng" },
  { href: "/dashboard", label: "Thống Kê" },
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
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg-base/90 border-b border-border-main text-text-main shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shadow-md shadow-primary-500/20 border border-primary-500/20 group-hover:scale-105 transition-transform duration-200 ease-out">
              <Image
                src="/logo.png"
                alt="English Vault"
                fill
                sizes="(max-width: 768px) 36px, 40px"
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-text-main block leading-tight whitespace-nowrap">
                English Studio
              </span>
              <span className="block text-[8px] sm:text-[9px] font-bold tracking-widest text-primary-400 uppercase"></span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 xl:px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition duration-200 ${
                    isActive
                      ? "bg-bg-surface-hover text-primary-400 border border-border-hover font-bold shadow-inner"
                      : "text-text-muted hover:text-text-main hover:bg-bg-surface-hover"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Auth Section & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 bg-bg-surface border border-border-main px-2.5 sm:px-3 py-1.5 rounded-full hover:border-border-hover transition-colors cursor-pointer active:scale-95"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 text-xs font-bold">
                    {(currentUser.display_name || currentUser.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-text-main max-w-[80px] sm:max-w-[120px] truncate">
                    {currentUser.display_name || currentUser.username || "demo"}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-text-muted transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-border-main rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                      <Link
                        href="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-main hover:bg-bg-surface-hover transition-colors cursor-pointer border-b border-border-main active:scale-95"
                      >
                        <UserIcon className="w-4 h-4 text-primary-400" />
                        Hồ sơ cá nhân
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer active:scale-95"
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
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary-600 hover:bg-primary-500 text-text-primary-fg font-black text-xs shadow-md transition cursor-pointer active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                Đăng Nhập
              </Link>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              className="lg:hidden p-2 rounded-full bg-bg-surface border border-border-main text-text-muted hover:text-text-main active:scale-95"
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
        <div className="lg:hidden bg-bg-surface border-t border-border-main px-4 py-4 space-y-2 animate-fade-in shadow-xl">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? "bg-bg-surface-hover text-primary-400 border border-border-hover font-bold"
                    : "text-text-muted hover:text-text-main hover:bg-bg-surface-hover"
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
