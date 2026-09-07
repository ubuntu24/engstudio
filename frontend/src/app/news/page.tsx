"use client";

import {
  Newspaper, Sparkles, ArrowLeft, ExternalLink, BookOpen, Clock, Loader2,
  Quote, Layers, Volume2, Search, ChevronLeft, ChevronRight, Check, Headphones,
  Globe, Bookmark, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { playSmartAudio, prefetchTtsAudio } from "@/lib/tts";

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [readingMode, setReadingMode] = useState<"bilingual" | "en" | "vi">("bilingual");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const readerRef = useRef<HTMLDivElement>(null);

  // Pre-fetch article summary and top vocabulary in background
  useEffect(() => {
    const cur = articles.find((a) => a.id === activeArticleId);
    if (cur?.summary) {
      prefetchTtsAudio(cur.summary, "us");
      prefetchTtsAudio(cur.summary, "uk");
    }
    if (cur?.vocabList && Array.isArray(cur.vocabList)) {
      cur.vocabList.slice(0, 5).forEach((v: VocabItem) => {
        if (v?.word) {
          prefetchTtsAudio(v.word, "us");
          prefetchTtsAudio(v.word, "uk");
        }
      });
    }
  }, [activeArticleId, articles]);

  const playAudio = (text: string, accent: "us" | "uk" | "vi" = "us", id?: string) => {
    if (!text) return;
    if (id) setPlayingId(id);

    playSmartAudio(text, {
      accent,
      onPlaying: () => {
        if (id) setPlayingId(id);
      },
      onEnd: () => {
        setPlayingId(null);
      },
      onError: () => {
        setPlayingId(null);
      }
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  async function fetchLiveNews(forceRefresh = false) {
    setLoadingDb(true);
    try {
      const res = await fetch(`/api/news${forceRefresh ? "?refresh=true" : ""}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mappedArticles: ArticleItem[] = [];

          for (const item of json.data) {
            let rawSummary = (item.summary_en || "").trim();
            let rawVi = (item.summary_vi || "").trim();
            let parsedVocabs: VocabItem[] = [];

            // Fallback parser in case raw JSON string is still present
            const cleanJson = rawSummary.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/g, "").trim();
            if (cleanJson.startsWith("{") || cleanJson.startsWith("[")) {
              try {
                const p = JSON.parse(cleanJson);
                const subList = Array.isArray(p.article_summaries) ? p.article_summaries
                  : Array.isArray(p.articles) ? p.articles
                  : Array.isArray(p.news) ? p.news
                  : Array.isArray(p.summaries) ? p.summaries
                  : null;

                const rawVocab = Array.isArray(p.vocabulary) ? p.vocabulary
                  : Array.isArray(p.vocabularies) ? p.vocabularies
                  : Array.isArray(p.vocab_list) ? p.vocab_list
                  : [];

                const sharedVocabList: VocabItem[] = rawVocab.map((v: any) => ({
                  word: (v.word || v.term || "").trim(),
                  ipa: (v.ipa || v.phonetic || "").trim(),
                  meaning: (v.meaning_vi || v.meaning || v.definition_vi || v.definition || "").trim(),
                  original_paragraph: (v.example_en || v.original_paragraph || v.example || v.sentence || "").trim(),
                  paragraph_vi: (v.example_vi || v.paragraph_vi || v.translation_vi || v.translation || "").trim()
                }));

                if (subList && subList.length > 0) {
                  subList.forEach((subArt: any, subIdx: number) => {
                    mappedArticles.push({
                      id: `${item.id}_${subArt.id || subIdx + 1}`,
                      headline: subArt.title || subArt.headline || subArt.name || item.headline,
                      category: subArt.category || item.category || "Tin Tức Thế Giới - BBC News",
                      sourceName: item.source_name || "BBC News",
                      sourceUrl: subArt.link || subArt.url || subArt.source_url || item.source_url || "https://www.bbc.co.uk/news/world",
                      date: item.created_at ? new Date(item.created_at).toLocaleDateString("vi-VN") : "Hôm nay",
                      summary: subArt.summary_en || subArt.summary_english || subArt.summary || subArt.content_en || "",
                      summaryVi: subArt.summary_vi || subArt.summary_vietnamese || subArt.content_vi || "",
                      vocabList: sharedVocabList
                    });
                  });
                  continue;
                } else if (p && typeof p === "object") {
                  rawSummary = p.summary_en || p.summary_english || p.summary || rawSummary;
                  rawVi = p.summary_vi || p.summary_vietnamese || rawVi;
                  if (sharedVocabList.length > 0) {
                    parsedVocabs = sharedVocabList;
                  }
                }
              } catch (_) {
                rawSummary = cleanJson;
              }
            }

            // Extract vocabulary from vocab_json
            if (item.vocab_json && parsedVocabs.length === 0) {
              try {
                const vData = typeof item.vocab_json === "string" ? JSON.parse(item.vocab_json) : item.vocab_json;
                let candidateList = [];
                if (Array.isArray(vData)) {
                  candidateList = vData;
                } else if (vData && typeof vData === "object") {
                  if (vData.raw) {
                    const rawClean = vData.raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/g, "").trim();
                    const rawP = JSON.parse(rawClean);
                    candidateList = rawP.vocabulary || rawP.vocab_list || [];
                  } else {
                    candidateList = vData.vocabulary || vData.vocab_list || [];
                  }
                }

                parsedVocabs = candidateList
                  .filter((v: any) => v && typeof v === "object" && (v.word || v.term))
                  .map((v: any) => ({
                    word: (v.word || v.term || "").trim(),
                    ipa: (v.ipa || v.phonetic || "").trim(),
                    meaning: (v.meaning_vi || v.meaning || v.definition_vi || "").trim(),
                    original_paragraph: (v.example_en || v.original_paragraph || v.example || "").trim(),
                    paragraph_vi: (v.example_vi || v.paragraph_vi || v.translation_vi || "").trim()
                  }));
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
      console.error("Error loading news:", err);
    } finally {
      setLoadingDb(false);
    }
  }

  useEffect(() => {
    fetchLiveNews();
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase().trim();
    return articles.filter(
      (a) =>
        a.headline.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.summaryVi.toLowerCase().includes(q) ||
        a.vocabList.some((v) => v.word.toLowerCase().includes(q) || v.meaning.toLowerCase().includes(q))
    );
  }, [articles, searchQuery]);

  const selectedArticle = useMemo(() => {
    const found = filteredArticles.find((a) => a.id === activeArticleId);
    return found || filteredArticles[0] || null;
  }, [filteredArticles, activeArticleId]);

  const currentIndex = useMemo(() => {
    if (!selectedArticle) return 0;
    return filteredArticles.findIndex((a) => a.id === selectedArticle.id);
  }, [filteredArticles, selectedArticle]);

  const handleSelectArticle = (id: string) => {
    setActiveArticleId(id);
    readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePrevArticle = () => {
    if (currentIndex > 0) {
      handleSelectArticle(filteredArticles[currentIndex - 1].id);
    }
  };

  const handleNextArticle = () => {
    if (currentIndex < filteredArticles.length - 1) {
      handleSelectArticle(filteredArticles[currentIndex + 1].id);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-surface hover:bg-bg-surface-hover text-text-main text-xs font-bold border border-border-main transition cursor-pointer w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Trang Chủ</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
          <button
            onClick={() => fetchLiveNews(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface hover:bg-bg-surface-hover border border-border-main text-text-muted hover:text-text-main transition cursor-pointer"
            title="Tải lại dữ liệu mới nhất"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface border border-border-main text-text-main">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>BBC News Live Sync</span>
          </span>
        </div>
      </div>

      {/* Main Editorial Hero Banner */}
      <div className="rounded-3xl bg-bg-surface p-6 sm:p-8 border border-border-main shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-base border border-border-main text-text-muted text-xs font-semibold">
              <Globe className="w-3.5 h-3.5 text-primary-500" />
              <span>Bản Tin Thế Giới & Ngữ Cảnh Báo BBC Chuẩn 100%</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight">
              Học Tiếng Anh Qua Tin Tức BBC News
            </h1>
            <p className="text-xs sm:text-sm text-text-muted max-w-2xl font-normal leading-relaxed">
              Cập nhật tin tức quốc tế song ngữ Anh - Việt mỗi ngày, rèn luyện kỹ năng đọc báo và tích lũy 20 từ vựng học thuật B2-C2 với phát âm bản ngữ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto text-xs font-medium">
            <span className="px-3 py-1.5 rounded-xl bg-bg-base border border-border-main text-text-main">
              📰 {articles.length} Bản tin chọn lọc
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-bg-base border border-border-main text-text-muted">
              🔥 20 Từ vựng B2-C2
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-bg-base border border-border-main text-text-muted">
              🔊 Dual Audio US / UK
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative pt-2">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm bản tin theo tiêu đề, nội dung, hoặc từ vựng..."
            className="w-full bg-bg-base border border-border-main rounded-xl pl-11 pr-10 py-2.5 text-xs sm:text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main text-xs font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loadingDb ? (
        <div className="flex flex-col items-center justify-center p-16 bg-bg-surface rounded-3xl border border-border-main space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-xs font-semibold text-text-muted">Đang tải bản tin và từ vựng từ cơ sở dữ liệu...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="p-12 text-center bg-bg-surface rounded-3xl border border-border-main space-y-3 shadow-sm">
          <BookOpen className="w-10 h-10 text-text-muted mx-auto" />
          <p className="text-sm font-bold text-text-main">Không tìm thấy bản tin phù hợp</p>
          <p className="text-xs text-text-muted">Hãy thử từ khóa khác hoặc bấm nút bên dưới để xem lại tất cả bài báo.</p>
          <button
            onClick={() => setSearchQuery("")}
            className="px-4 py-2 rounded-xl bg-primary-500 text-text-primary-fg text-xs font-bold transition cursor-pointer"
          >
            Hiển thị tất cả bản tin
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Feed / List of News Articles (5 columns on desktop) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1 text-xs font-bold text-text-muted uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Danh sách bản tin ({filteredArticles.length})</span>
              </span>
              <span>Trang {currentIndex + 1}/{filteredArticles.length}</span>
            </div>

            <div className="space-y-2.5 max-h-[780px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredArticles.map((art, idx) => {
                const isSelected = selectedArticle?.id === art.id;
                return (
                  <button
                    key={art.id}
                    onClick={() => handleSelectArticle(art.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition duration-150 cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "bg-bg-surface border-primary-500 shadow-md ring-1 ring-primary-500"
                        : "bg-bg-surface hover:bg-bg-surface-hover border-border-main"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${
                          isSelected
                            ? "bg-primary-500 text-text-primary-fg"
                            : "bg-bg-base text-text-muted border border-border-main"
                        }`}
                      >
                        Bài #{idx + 1}
                      </span>
                      <span className="text-text-muted truncate max-w-[150px]">{art.date}</span>
                    </div>

                    <h3 className={`text-xs sm:text-sm font-bold leading-snug line-clamp-2 ${
                      isSelected ? "text-text-main" : "text-text-main"
                    }`}>
                      {art.headline}
                    </h3>

                    <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                      {art.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Article Reading + 20 Vocabulary (7 columns on desktop) */}
          <div ref={readerRef} className="lg:col-span-7 space-y-6">
            {selectedArticle && (
              <>
                {/* Article Reader Container */}
                <div className="rounded-3xl bg-bg-surface border border-border-main p-6 sm:p-8 space-y-5 shadow-sm">
                  {/* Article Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-bg-base border border-border-main text-text-muted">
                        {selectedArticle.category}
                      </span>
                      <span className="text-xs text-text-muted">{selectedArticle.date}</span>
                    </div>

                    {/* Reading Mode Switcher */}
                    <div className="flex items-center gap-1 bg-bg-base p-1 rounded-xl border border-border-main text-xs">
                      <button
                        onClick={() => setReadingMode("bilingual")}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                          readingMode === "bilingual"
                            ? "bg-primary-500 text-text-primary-fg font-bold"
                            : "text-text-muted hover:text-text-main"
                        }`}
                      >
                        Song ngữ
                      </button>
                      <button
                        onClick={() => setReadingMode("en")}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                          readingMode === "en"
                            ? "bg-primary-500 text-text-primary-fg font-bold"
                            : "text-text-muted hover:text-text-main"
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => setReadingMode("vi")}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                          readingMode === "vi"
                            ? "bg-primary-500 text-text-primary-fg font-bold"
                            : "text-text-muted hover:text-text-main"
                        }`}
                      >
                        Tiếng Việt
                      </button>
                    </div>
                  </div>

                  {/* Article Title */}
                  <h2 className="text-xl sm:text-2xl font-black text-text-main tracking-tight leading-snug">
                    {selectedArticle.headline}
                  </h2>

                  {/* Quick Action Tools: Audio + Real BBC link */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-y border-border-main py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted font-medium flex items-center gap-1">
                        <Headphones className="w-3.5 h-3.5" /> Nghe bản tin:
                      </span>
                      <button
                        onClick={() => playAudio(selectedArticle.summary, "uk", `${selectedArticle.id}-audio-uk`)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          playingId === `${selectedArticle.id}-audio-uk`
                            ? "bg-primary-500 text-text-primary-fg border-primary-500"
                            : "bg-bg-base hover:bg-bg-surface-hover text-text-main border-border-main"
                        }`}
                        title="Nghe phát âm chuẩn UK (Anh)"
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${playingId === `${selectedArticle.id}-audio-uk` ? "animate-pulse" : ""}`} />
                        <span>Giọng UK</span>
                      </button>
                      <button
                        onClick={() => playAudio(selectedArticle.summary, "us", `${selectedArticle.id}-audio-us`)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          playingId === `${selectedArticle.id}-audio-us`
                            ? "bg-primary-500 text-text-primary-fg border-primary-500"
                            : "bg-bg-base hover:bg-bg-surface-hover text-text-main border-border-main"
                        }`}
                        title="Nghe phát âm chuẩn US (Mỹ)"
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${playingId === `${selectedArticle.id}-audio-us` ? "animate-pulse" : ""}`} />
                        <span>Giọng US</span>
                      </button>
                      <button
                        onClick={() => playAudio(selectedArticle.summary, "vi", `${selectedArticle.id}-audio-vi`)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          playingId === `${selectedArticle.id}-audio-vi`
                            ? "bg-emerald-500 text-text-primary-fg border-emerald-500"
                            : "bg-bg-base hover:bg-bg-surface-hover text-text-main border-border-main"
                        }`}
                        title="Nghe phát âm tiếng Anh giọng người Việt (VI)"
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${playingId === `${selectedArticle.id}-audio-vi` ? "animate-pulse" : ""}`} />
                        <span>Giọng VI</span>
                      </button>
                    </div>

                    <a
                      href={selectedArticle.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-text-main hover:text-text-muted bg-bg-base hover:bg-bg-surface-hover px-3.5 py-1.5 rounded-xl border border-border-main transition"
                    >
                      <span>🔗 Đọc bài gốc BBC News</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Reading Content Panels */}
                  <div className="space-y-4">
                    {(readingMode === "bilingual" || readingMode === "en") && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-bg-base border border-border-main space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
                          <span>🇬🇧 Nội dung tóm tắt (English)</span>
                          <button
                            onClick={() => copyToClipboard(selectedArticle.summary, `summary-en-${selectedArticle.id}`)}
                            className="text-[10px] text-text-muted hover:text-text-main flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === `summary-en-${selectedArticle.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : null}
                            <span>{copiedId === `summary-en-${selectedArticle.id}` ? "Đã copy" : "Copy"}</span>
                          </button>
                        </div>
                        <p className="text-sm sm:text-base text-text-main font-medium leading-relaxed">
                          {selectedArticle.summary}
                        </p>
                      </div>
                    )}

                    {(readingMode === "bilingual" || readingMode === "vi") && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-bg-base border border-border-main space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
                          <span>🇻🇳 Bản dịch chuẩn tiếng Việt</span>
                          <button
                            onClick={() => copyToClipboard(selectedArticle.summaryVi, `summary-vi-${selectedArticle.id}`)}
                            className="text-[10px] text-text-muted hover:text-text-main flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === `summary-vi-${selectedArticle.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : null}
                            <span>{copiedId === `summary-vi-${selectedArticle.id}` ? "Đã copy" : "Copy"}</span>
                          </button>
                        </div>
                        <p className="text-sm sm:text-base text-text-muted font-normal leading-relaxed">
                          {selectedArticle.summaryVi}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Navigation footer between articles */}
                  <div className="flex items-center justify-between pt-3 border-t border-border-main">
                    <button
                      onClick={handlePrevArticle}
                      disabled={currentIndex === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-base hover:bg-bg-surface-hover border border-border-main text-xs font-semibold text-text-main disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Bài trước</span>
                    </button>

                    <span className="text-xs text-text-muted font-medium">
                      Bản tin {currentIndex + 1} / {filteredArticles.length}
                    </span>

                    <button
                      onClick={handleNextArticle}
                      disabled={currentIndex === filteredArticles.length - 1}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-base hover:bg-bg-surface-hover border border-border-main text-xs font-semibold text-text-main disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <span>Bài tiếp theo</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Vocabulary Section */}
                {selectedArticle.vocabList.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary-500" />
                        <h3 className="text-base sm:text-lg font-bold text-text-main tracking-tight">
                          20 Từ Vựng Cao Cấp (B2 - C2) Trích Xuất Từ Bản Tin
                        </h3>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-bg-base border border-border-main text-text-muted">
                        {selectedArticle.vocabList.length} Từ vựng
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5">
                      {selectedArticle.vocabList.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-bg-surface border border-border-main hover:border-border-hover transition space-y-3 shadow-xs"
                        >
                          {/* Word Header + IPA + Audio Buttons */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-base font-bold text-text-main">
                                  {item.word}
                                </span>
                                {item.ipa && (
                                  <span className="text-xs font-mono text-text-muted bg-bg-base px-2 py-0.5 rounded-md border border-border-main">
                                    {item.ipa}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-primary-500 mt-1">
                                👉 {item.meaning}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => playAudio(item.word, "us", `vocab-${idx}-us`)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                                  playingId === `vocab-${idx}-us`
                                    ? "bg-primary-500 text-text-primary-fg border-primary-500"
                                    : "bg-bg-base hover:bg-bg-surface-hover text-text-muted hover:text-text-main border-border-main"
                                }`}
                                title="Phát âm US"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>US</span>
                              </button>
                              <button
                                onClick={() => playAudio(item.word, "uk", `vocab-${idx}-uk`)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                                  playingId === `vocab-${idx}-uk`
                                    ? "bg-primary-500 text-text-primary-fg border-primary-500"
                                    : "bg-bg-base hover:bg-bg-surface-hover text-text-muted hover:text-text-main border-border-main"
                                }`}
                                title="Phát âm UK"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>UK</span>
                              </button>
                              <button
                                onClick={() => playAudio(item.word, "vi", `vocab-${idx}-vi`)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                                  playingId === `vocab-${idx}-vi`
                                    ? "bg-emerald-500 text-text-primary-fg border-emerald-500"
                                    : "bg-bg-base hover:bg-bg-surface-hover text-text-muted hover:text-emerald-400 border-border-main"
                                }`}
                                title="Phát âm tiếng Anh giọng người Việt"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>VI</span>
                              </button>
                            </div>
                          </div>

                          {/* Original BBC Context Snippet */}
                          {item.original_paragraph && (
                            <div className="p-3.5 rounded-xl bg-bg-base border border-border-main space-y-2 text-xs">
                              <div className="flex items-center justify-between text-text-muted">
                                <span className="font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                  <Quote className="w-3 h-3 text-text-muted" /> Đoạn văn gốc trong bài báo BBC
                                </span>
                                <button
                                  onClick={() => playAudio(item.original_paragraph, "uk", `quote-${idx}`)}
                                  className="text-text-muted hover:text-text-main cursor-pointer"
                                  title="Nghe câu ngữ cảnh"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-text-main italic leading-relaxed font-medium">
                                &ldquo;{item.original_paragraph}&rdquo;
                              </p>
                              {item.paragraph_vi && (
                                <p className="text-[11px] text-text-muted pt-1.5 border-t border-border-main leading-relaxed">
                                  ➔ {item.paragraph_vi}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
