"use client";

import { BookOpen, Sparkles, ArrowLeft, Clock, User, ChevronRight } from "lucide-react";
import Link from "next/link";

interface BlogPost {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  date: string;
  author: string;
}

export default function BlogPage() {
  const posts: BlogPost[] = [
    {
      id: "1",
      title: "Bí Quyết Nhớ 100 Từ Vựng Tiếng Anh Mỗi Ngày Không Bao Giờ Quên",
      description:
        "Áp dụng phương pháp lặp lại ngắt quãng (Spaced Repetition) kết hợp Flashcard tương tác 3D giúp não bộ khắc sâu từ vựng gấp 5 lần thông thường.",
      category: "Mẹo Học Tập",
      readTime: "5 phút đọc",
      date: "01/08/2026",
      author: "DeepSeek SEO Agent",
    },
    {
      id: "2",
      title: "Phân Biệt Cực Chuẩn Cách Dùng In, On, At Trong Tiếng Anh Giao Tiếp",
      description:
        "Hướng dẫn chi tiết quy tắc hình tam giác ngược để phân biệt giới từ chỉ thời gian và nơi chốn chuẩn xác 100% không lo nhầm lẫn.",
      category: "Ngữ Pháp",
      readTime: "7 phút đọc",
      date: "31/07/2026",
      author: "DeepSeek SEO Agent",
    },
    {
      id: "3",
      title: "Top 50 Cụm Động Từ (Phrasal Verbs) Thường Gặp Nhất Trong Đề Thi IELTS",
      description:
        "Tổng hợp bộ Phrasal Verbs ăn điểm Band 7.0+ kèm câu ví dụ thực tế và giải thích chi tiết ngữ cảnh sử dụng.",
      category: "Từ Vựng IELTS",
      readTime: "10 phút đọc",
      date: "30/07/2026",
      author: "DeepSeek SEO Agent",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-surface hover:bg-bg-surface-hover text-text-main text-sm font-bold border border-border-main transition duration-200 ease-out active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Trang Chủ
        </Link>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-bg-card p-8 border border-border-main shadow-xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-surface-hover text-primary-400 text-xs font-bold border border-border-hover">
          <Sparkles className="w-3.5 h-3.5" />
          DeepSeek SEO Content Publisher
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-text-main tracking-tight">
          ✍️ Blog Học Tiếng Anh Chuẩn SEO
        </h1>
        <p className="text-sm text-text-muted max-w-2xl font-medium leading-relaxed">
          Tổng hợp bài viết hướng dẫn phương pháp học từ vựng, mẹo phân biệt ngữ pháp và cụm từ IELTS do DeepSeek SEO Agent tự động sáng tạo.
        </p>
      </div>

      {/* Blog Articles Grid */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-400" />
          <h2 className="text-xl font-black text-text-main tracking-tight">
            Bài Viết Nổi Bật Mới Nhất
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="group p-6 sm:p-8 rounded-3xl bg-bg-card border border-border-main hover:border-border-hover transition duration-200 ease-out space-y-4 shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold px-3 py-1 rounded-lg bg-primary-900 text-primary-200 border border-primary-600/30">
                  {post.category}
                </span>
                <div className="flex items-center gap-4 text-xs font-bold text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-primary-400" />
                    {post.author}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-text-main group-hover:text-primary-400 transition duration-200">
                  {post.title}
                </h3>
                <p className="text-sm font-medium text-text-muted leading-relaxed">
                  {post.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border-main">
                <span className="text-xs font-semibold text-text-muted">{post.date}</span>
                <button className="inline-flex items-center gap-1 text-sm font-bold text-primary-400 group-hover:translate-x-1 transition duration-200">
                  <span>Đọc Chi Tiết</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
