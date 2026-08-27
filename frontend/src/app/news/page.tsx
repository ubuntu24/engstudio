"use client";

import { Newspaper, Sparkles, ArrowLeft, ExternalLink, BookOpen, Clock, Loader2, Quote, Layers } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface VocabItem {
  word: string;
  ipa: string;
  meaning: string;
  original_paragraph: string;
  paragraph_vi: string;
}

interface ArticleItem {
  id: string;
  headline: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  date: string;
  summary: string;
  summaryVi: string;
  vocabList: VocabItem[];
}

export default function NewsPage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [activeArticleId, setActiveArticleId] = useState<string>("");
  const [loadingDb, setLoadingDb] = useState<boolean>(true);

  useEffect(() => {
    async function fetchLiveNews() {
      try {
        const res = await fetch("/api/news");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const mappedArticles: ArticleItem[] = [];

            for (const item of json.data) {
              let rawSummary = (item.summary_en || "").trim();
              let rawVi = (item.summary_vi || "").trim();
              let parsedVocabs: VocabItem[] = [];

              // Check if rawSummary contains raw JSON string from n8n / AI
              const cleanJson = rawSummary.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/g, "").trim();
              if (cleanJson.startsWith("{") || cleanJson.startsWith("[")) {
                try {
                  const p = JSON.parse(cleanJson);
                  if (p && Array.isArray(p.articles) && p.articles.length > 0) {
                    const sharedVocabList = Array.isArray(p.vocabulary)
                      ? p.vocabulary.map((v: any) => ({
                          word: v.word || "",
                          ipa: v.ipa || "",
                          meaning: v.meaning || "",
                          original_paragraph: v.original_paragraph || v.example || v.example_en || "",
                          paragraph_vi: v.paragraph_vi || v.translation || v.example_vi || ""
                        }))
                      : [];

                    p.articles.forEach((subArt: any, subIdx: number) => {
                      mappedArticles.push({
                        id: `${item.id}_${subIdx + 1}`,
                        headline: subArt.title || subArt.headline || item.headline,
                        category: item.category || "Tin Tức Thế Giới - BBC News",
                        sourceName: item.source_name || "BBC News",
                        sourceUrl: subArt.url || item.source_url || "https://www.bbc.co.uk/news/world",
                        date: item.created_at ? new Date(item.created_at).toLocaleDateString("vi-VN") : "Hôm nay",
                        summary: subArt.summary_en || subArt.summary_english || subArt.summary || "",
                        summaryVi: subArt.summary_vi || subArt.summary_vietnamese || "",
                        vocabList: sharedVocabList
                      });
                    });
                    continue;
                  } else if (p && typeof p === "object") {
                    rawSummary = p.summary_en || p.summary_english || p.summary || rawSummary;
                    rawVi = p.summary_vi || p.summary_vietnamese || rawVi;
                  }
                } catch (_) {
                  rawSummary = cleanJson;
                }
              }

              if (item.vocab_json) {
                try {
                  const vData = typeof item.vocab_json === "string" ? JSON.parse(item.vocab_json) : item.vocab_json;
                  if (Array.isArray(vData)) {
                    parsedVocabs = vData
                      .filter((v: any) => v && typeof v === "object" && typeof v.word === "string" && !v.word.includes('{') && !v.word.includes('articles'))
                      .map((v: any) => ({
                        word: v.word || "",
                        ipa: v.ipa || "",
                        meaning: v.meaning || "",
                        original_paragraph: v.original_paragraph || v.example || v.example_en || "",
                        paragraph_vi: v.paragraph_vi || v.translation || v.example_vi || ""
                      }));
                  }
                } catch (_) {}
              }

              mappedArticles.push({
                id: `${item.id}`,
                headline: item.headline || "BBC World News Summary & Vocabularies",
                category: item.category || "Tin Tức Thế Giới - BBC News",
                sourceName: item.source_name || "BBC News",
                sourceUrl: item.source_url || "https://www.bbc.co.uk/news/world",
                date: item.created_at ? new Date(item.created_at).toLocaleDateString("vi-VN") : "Hôm nay",
                summary: rawSummary,
                summaryVi: rawVi,
                vocabList: parsedVocabs
              });
            }

            if (mappedArticles.length > 0) {
              setArticles(mappedArticles);
              setActiveArticleId(mappedArticles[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading news from Supabase API:", err);
      } finally {
        setLoadingDb(false);
      }
    }
    fetchLiveNews();
  }, []);

  const selectedArticle = articles.find((a) => a.id === activeArticleId) || articles[0];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-bg-surface hover:bg-bg-surface-hover text-text-main text-sm font-bold border border-border-main transition duration-200 ease-out active:scale-95 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-text-main" />
          Trang Chủ
        </Link>

        <div className="flex items-center gap-2 text-xs font-bold text-text-muted bg-bg-surface px-3.5 py-1.5 rounded-2xl border border-border-main shadow-xs">
          <Clock className="w-3.5 h-3.5 text-text-main" />
          <span>⚡ Live Supabase Database Connected</span>
        </div>
      </div>

      {/* Header Banner - Clean Monochrome Black & White */}
      <div className="rounded-3xl bg-bg-card p-8 border border-border-main shadow-sm space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-surface-hover text-text-main text-xs font-bold border border-border-main">
          <Sparkles className="w-3.5 h-3.5 text-text-main" />
          Dữ Liệu Chuẩn Song Ngữ & Ngữ Cảnh Báo BBC Thật 100%
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-black text-text-main tracking-tight leading-tight">
          📰 Học Từ Vựng Qua Đoạn Văn Gốc BBC News
        </h1>
        <p className="text-sm text-text-muted max-w-2xl font-medium leading-relaxed">
          Mỗi từ vựng được trích xuất nguyên đoạn văn ngữ cảnh thực tế từ báo BBC kèm phiên âm IPA chuẩn, dịch tiếng Việt chi tiết giúp ghi nhớ sâu sắc.
        </p>
      </div>

      {/* Loading state or Articles Selector Tabs */}
      {loadingDb ? (
        <div className="flex items-center justify-center p-12 bg-bg-card rounded-3xl border border-border-main shadow-xs">
          <div className="flex items-center gap-3 text-text-main font-bold">
            <Loader2 className="w-6 h-6 animate-spin text-text-main" />
            <span>Đang nạp dữ liệu trực tiếp từ Supabase Database...</span>
          </div>
        </div>
      ) : articles.length > 0 ? (
        <>
          {/* Article Tabs Selector Bar */}
          <div className="space-y-3 p-6 rounded-3xl bg-bg-card border border-border-main shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-text-main uppercase tracking-wider">
                <Layers className="w-4 h-4 text-text-main" />
                <span>DANH SÁCH {articles.length} BÀI BÁO TỪ SUPABASE (Bấm để đổi bài):</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {articles.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setActiveArticleId(item.id)}
                  className={`px-4 py-3 rounded-2xl font-bold text-xs transition duration-200 ease-out active:scale-95 border flex items-center gap-2.5 ${
                    activeArticleId === item.id
                      ? "bg-text-main text-bg-surface border-text-main shadow-md"
                      : "bg-bg-surface text-text-main border-border-main hover:bg-bg-surface-hover hover:border-border-hover"
                  }`}
                >
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                    activeArticleId === item.id ? "bg-bg-surface/20 text-bg-surface" : "bg-bg-surface-hover text-text-muted border border-border-main"
                  }`}>
                    Bài #{idx + 1}
                  </span>
                  <span className="max-w-[200px] truncate">{item.headline}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Article Detail Card */}
          {selectedArticle && (
            <div className="p-6 sm:p-8 rounded-3xl bg-bg-card border border-border-main space-y-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-bg-surface-hover text-text-main border border-border-main">
                  {selectedArticle.category} • {selectedArticle.date}
                </span>

                <a
                  href={selectedArticle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-text-main hover:text-text-muted bg-bg-surface hover:bg-bg-surface-hover px-4 py-2.5 rounded-2xl border border-border-main shadow-xs transition duration-200 active:scale-95"
                >
                  <span>🔗 Mở Link Gốc Bài Báo Thật (BBC News)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-text-main pt-1 leading-snug">
                {selectedArticle.headline}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-bg-surface border border-border-main">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-text-main uppercase tracking-wider">Tổng Quan Bản Tin (Tiếng Anh)</span>
                  <div className="text-base text-text-main font-semibold leading-relaxed">
                    {selectedArticle.summary}
                  </div>
                </div>
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-border-main pt-4 md:pt-0 md:pl-6">
                  <span className="text-xs font-bold text-text-main uppercase tracking-wider">Tóm Tắt Tổng Quan (Tiếng Việt)</span>
                  <div className="text-base text-text-muted font-medium leading-relaxed">
                    {selectedArticle.summaryVi}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vocab Section for Selected Article */}
          {selectedArticle && selectedArticle.vocabList.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-text-main" />
                  <h3 className="text-xl font-black text-text-main tracking-tight">
                    🔥 Đủ {selectedArticle.vocabList.length} Từ Vựng B2-C2 Kèm Đoạn Văn Gốc BBC
                  </h3>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-bg-surface-hover text-text-main border border-border-main">
                  {selectedArticle.vocabList.length} Từ Vựng
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {selectedArticle.vocabList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-3xl bg-bg-card border border-border-main hover:border-border-hover transition duration-200 ease-out space-y-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black text-text-main">
                            {item.word}
                          </span>
                          {item.ipa && (
                            <span className="text-xs font-bold text-text-main font-mono bg-bg-surface-hover px-2.5 py-1 rounded-lg border border-border-main">
                              {item.ipa}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-text-main">{item.meaning}</p>
                      </div>
                      <span className="text-xs font-black text-text-muted bg-bg-surface px-3 py-1.5 rounded-xl border border-border-main">
                        Từ #{idx + 1}
                      </span>
                    </div>

                    {/* Original BBC Context Paragraph Card */}
                    {item.original_paragraph && (
                      <div className="p-4 rounded-2xl bg-bg-surface border-l-4 border-text-main border-y border-r border-border-main space-y-2.5 relative">
                        <div className="flex items-center gap-2 text-xs font-bold text-text-main uppercase tracking-wider">
                          <Quote className="w-3.5 h-3.5 text-text-main" />
                          <span>Đoạn Văn Gốc Trong Bài Báo BBC</span>
                        </div>
                        <p className="text-sm font-semibold text-text-main leading-relaxed italic">
                          "{item.original_paragraph}"
                        </p>
                        {item.paragraph_vi && (
                          <p className="text-xs font-medium text-text-muted pt-1 border-t border-border-main">
                            👉 <span className="font-bold text-text-main">Dịch ngữ cảnh:</span> {item.paragraph_vi}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center bg-bg-card rounded-3xl border border-border-main shadow-xs">
          <p className="text-sm font-medium text-text-muted">Chưa có bài báo nào trong Supabase Database.</p>
        </div>
      )}
    </div>
  );
}
