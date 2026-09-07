"use client";

import { useEffect, useState } from "react";
import { fetchLearnSession, submitReviewSession, fetchLearnMetadata, getAiUsage } from "@/lib/api";
import { Word } from "@/types";
import {
  Volume2,
  RotateCw,
  CheckCircle2,
  BookOpen,
  Video,
  RefreshCw,
  Trophy,
  Filter,
  Medal,
  Layers,
  GraduationCap,
  Sparkles,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { playSmartAudio, prefetchTtsAudio } from "@/lib/tts";

export default function LearnPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [topics, setTopics] = useState<{ name: string; count: number }[]>([]);
  const [levels, setLevels] = useState<{ name: string; count: number }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("Tất cả");
  const [selectedCefr, setSelectedCefr] = useState<string>("Tất cả");
  const [videoOnly, setVideoOnly] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [cardShownAt, setCardShownAt] = useState<number>(0);
  const [floatingXps, setFloatingXps] = useState<{ id: number, text: string, color: string }[]>([]);
  const [aiExampleLoading, setAiExampleLoading] = useState(false);
  const [aiExample, setAiExample] = useState<{english: string; vietnamese: string} | null>(null);
  const [aiUsage, setAiUsage] = useState<{used: number, limit: number, remaining: number} | null>(null);
  const [audioRate, setAudioRate] = useState<number>(1.0);

  const getCefrBadge = (level?: string) => {
    const l = (level || "").toUpperCase();
    if (l === "A1") return { text: "Oxford A1 • Beginner", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    if (l === "A2") return { text: "Oxford A2 • Elementary", color: "bg-teal-500/10 text-teal-400 border-teal-500/30" };
    if (l === "B1") return { text: "Oxford B1 • Intermediate", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
    if (l === "B2") return { text: "Oxford B2 • Upper-Int", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" };
    if (l === "C1" || l === "C2") return { text: "Oxford C1 • Advanced", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
    return { text: "Oxford Core", color: "bg-primary-500/10 text-primary-400 border-primary-500/30" };
  };

  useEffect(() => {
    getAiUsage().then(setAiUsage);
  }, []);

  const showFloatingXp = (amount: number, text: string, color: string) => {
    const id = Date.now();
    setFloatingXps(prev => [...prev, { id, text, color }]);
    setTimeout(() => {
      setFloatingXps(prev => prev.filter(x => x.id !== id));
    }, 2000);
  };

  const loadTopicsList = async () => {
    const meta = await fetchLearnMetadata();
    if (meta.topics && meta.topics.length > 0) {
      setTopics(meta.topics);
    }
    if (meta.levels && meta.levels.length > 0) {
      setLevels(meta.levels);
    }
  };

  const loadSession = async (
    topic: string = selectedTopic,
    vidOnly: boolean = videoOnly,
    cefr: string = selectedCefr
  ) => {
    setLoading(true);
    setCompletedCount(0);
    setAiExample(null);
    try {
      const data = await fetchLearnSession(20, topic, vidOnly, cefr);
      setWords(data.cards);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error('Failed to load session:', err);
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopicsList();
    loadSession("Tất cả", false, "Tất cả");
  }, []);

  const handleSelectTopic = (topicName: string) => {
    setSelectedTopic(topicName);
    loadSession(topicName, videoOnly, selectedCefr);
  };

  const handleSelectCefr = (cefrName: string) => {
    setSelectedCefr(cefrName);
    loadSession(selectedTopic, videoOnly, cefrName);
  };

  const currentWord = words[currentIndex];

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioAccent, setAudioAccent] = useState<'us' | 'uk' | 'vi'>('us');

  // Background Pre-fetching for 0ms Instant Playback
  useEffect(() => {
    if (currentWord?.word) {
      prefetchTtsAudio(currentWord.word, 'us');
      prefetchTtsAudio(currentWord.word, 'uk');

      // Prefetch Vietnamese meaning with Vietnamese voice
      const viMeaning = currentWord.meaning_vi || currentWord.vietnamese_meaning;
      if (viMeaning) {
        prefetchTtsAudio(viMeaning, 'vi');
      }

      // Prefetch example sentence if present
      if (currentWord.example) {
        prefetchTtsAudio(currentWord.example, audioAccent === 'vi' ? 'us' : audioAccent);
      }

      // Prefetch next word in queue
      const nextWord = words[currentIndex + 1];
      if (nextWord?.word) {
        prefetchTtsAudio(nextWord.word, 'us');
        prefetchTtsAudio(nextWord.word, 'uk');
      }
    }
  }, [currentWord?.id, currentIndex, words, audioAccent]);

  const playAudio = (text: string, rate: number = 1.0, accent: 'us' | 'uk' | 'vi' = 'us') => {
    if (!text) return;
    setAudioAccent(accent);

    playSmartAudio(text, {
      accent,
      rate,
      onLoading: () => {
        setIsAudioLoading(true);
        setIsPlayingAudio(true);
      },
      onPlaying: () => {
        setIsAudioLoading(false);
        setIsPlayingAudio(true);
      },
      onEnd: () => {
        setIsAudioLoading(false);
        setIsPlayingAudio(false);
      },
      onError: () => {
        setIsAudioLoading(false);
        setIsPlayingAudio(false);
      }
    });
  };

  const handleReview = async (rating: "easy" | "good" | "hard" | "again") => {
    if (!currentWord) return;

    const timeSpentMs = cardShownAt > 0 ? Date.now() - cardShownAt : 0;
    const response = await submitReviewSession(currentWord.id, rating, timeSpentMs);
    
    if (response?.limit_reached) {
      showFloatingXp(0, "+0 XP (Đạt giới hạn ngày)", "text-rose-400");
    } else if (response?.xp_added && response.xp_added > 0) {
      showFloatingXp(response.xp_added, `+${response.xp_added} XP`, "text-teal-400");
    }

    if (response?.earned_badges && response.earned_badges.length > 0) {
      response.earned_badges.forEach((b: any, index: number) => {
        setTimeout(() => {
          showFloatingXp(0, `🏅 ${b.name}`, "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]");
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }, index * 2500);
      });
    }

    setIsFlipped(false);
    setCardShownAt(0);
    setAiExample(null);

    if (rating === "again") {
      const remainingWords = words.filter((_, i) => i !== currentIndex);
      setWords([...remainingWords, currentWord]);
    } else {
      setWords(words.filter((_, i) => i !== currentIndex));
      setCompletedCount((prev) => prev + 1);
    }
    setCurrentIndex(0);
  };

  // Keyboard Shortcuts (Space to Flip, 1-4 to Rate, A to Pronounce)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isFlipped) setCardShownAt(Date.now());
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'a' || e.key === 'A') {
        if (currentWord?.word) playAudio(currentWord.word, audioRate, 'us');
      } else if (e.key === 'u' || e.key === 'U') {
        if (currentWord?.word) playAudio(currentWord.word, audioRate, 'uk');
      } else if (e.key === 'v' || e.key === 'V') {
        if (currentWord?.word) playAudio(currentWord.word, audioRate, 'vi');
      } else if (isFlipped) {
        if (e.key === '1') handleReview('again');
        else if (e.key === '2') handleReview('hard');
        else if (e.key === '3') handleReview('good');
        else if (e.key === '4') handleReview('easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentWord, words, currentIndex, audioRate]);

  if (loading && !topics.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  const generateAiExample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentWord || aiExampleLoading) return;
    setAiExampleLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/ai/generate-example`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ 
          word: currentWord.word, 
          meaning: currentWord.meaning_vi || currentWord.vietnamese_meaning,
          topic: selectedTopic 
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 429) {
          alert(errorData.error || "Bạn đã đạt giới hạn dùng AI hôm nay. Hãy thử lại vào ngày mai!");
        }
        throw new Error(errorData.error || "Failed to fetch AI example");
      }
      const data = await res.json();
      if (data && data.english) {
        setAiExample(data);
        getAiUsage().then(setAiUsage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiExampleLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative">
      {/* Floating XP Animations */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
        <AnimatePresence>
          {floatingXps.map((fxp) => (
            <motion.div
              key={fxp.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -100, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`absolute text-4xl font-black drop-shadow-xl whitespace-nowrap ${fxp.color}`}
            >
              {fxp.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-text-main tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-primary-400" />
            Học Từ Vựng Flashcard
          </h1>
          <p className="text-sm text-text-muted mt-1 font-medium">
            Phân loại theo Chủ đề
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-bg-surface-hover text-primary-400 border border-border-hover text-xs font-semibold">
            Còn lại:{" "}
            <span className="text-primary-400 font-bold">{words.length}</span> thẻ
          </div>
        </div>
      </div>

      {/* Oxford CEFR & Topic Selection Bar */}
      <div className="bg-bg-card border border-border-main p-4 rounded-3xl space-y-3.5 shadow-xl">
        {/* Row 1: Oxford CEFR Level Filters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-text-muted">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary-400" />
              <span>Cấp Độ Chuẩn Oxford (CEFR):</span>
            </div>
            <span className="text-[11px] text-primary-400 font-semibold">
              {selectedCefr === "Tất cả" ? "Toàn bộ cấp độ" : `Đang lọc: ${selectedCefr}`}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {(levels.length > 0 ? levels : [
              { name: "Tất cả", count: 3312 },
              { name: "A1", count: 738 },
              { name: "A2", count: 738 },
              { name: "B1", count: 925 },
              { name: "B2", count: 794 },
              { name: "C1", count: 117 }
            ]).map((lvl) => {
              const isSelected = selectedCefr === lvl.name;
              return (
                <button
                  key={lvl.name}
                  onClick={() => handleSelectCefr(lvl.name)}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition duration-200 ease-out flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    isSelected
                      ? "bg-primary-500 text-text-primary-fg shadow-lg shadow-primary-500/20 border border-primary-400 font-black"
                      : "bg-bg-surface text-text-muted hover:bg-bg-surface-hover hover:text-text-main border border-border-main"
                  }`}
                >
                  <span>{lvl.name === "Tất cả" ? "Tất cả Cấp độ" : `Oxford ${lvl.name}`}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      isSelected ? "bg-slate-950 text-primary-400" : "bg-bg-surface-hover text-text-muted"
                    }`}
                  >
                    {lvl.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-main/60" />

        {/* Row 2: Topic Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-text-muted">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary-400" />
              <span>Chủ Đề:</span>
            </div>
            <button
              onClick={() => {
                const newVal = !videoOnly;
                setVideoOnly(newVal);
                loadSession(selectedTopic, newVal, selectedCefr);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition duration-200 ease-out text-xs ${
                videoOnly
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                  : "bg-bg-surface border-border-main text-text-muted hover:text-text-main"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              {videoOnly ? "Đang Lọc Video" : "Chỉ Lọc Video"}
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {topics.map((t) => {
              const isSelected = selectedTopic === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => handleSelectTopic(t.name)}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition duration-200 ease-out flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    isSelected
                      ? "bg-primary-500/20 text-primary-300 border border-primary-500/40 font-black"
                      : "bg-bg-surface text-text-muted hover:bg-bg-surface-hover hover:text-text-main border border-border-main"
                  }`}
                >
                  <span>{t.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      isSelected ? "bg-primary-500/30 text-primary-200" : "bg-bg-surface-hover text-text-muted"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty Queue State */}
      {!loading && !words.length ? (
        <div className="max-w-2xl mx-auto text-center py-16 px-6 bg-bg-card rounded-3xl border border-border-main space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center mx-auto border border-primary-500/30">
            <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-text-main">
              {videoOnly
                ? `Không có Video nào trong "${selectedTopic}"`
                : `Hoàn Thành Chuỗi Từ Chủ Đề "${selectedTopic}"!`}
            </h2>
            <p className="text-text-muted text-sm max-w-md mx-auto font-medium">
              {videoOnly
                ? "Chưa có từ vựng nào trong chủ đề này được gắn kèm video YouTube. Bạn hãy thử chọn chủ đề khác nhé!"
                : "Tuyệt vời! Bạn đã học hết tất cả các từ vựng thuộc chủ đề này trong lượt hiện tại."}
            </p>
          </div>
          {completedCount > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Đã ôn thành công{" "}
              {completedCount} thẻ
            </div>
          )}
          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => loadSession(selectedTopic, videoOnly)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-400 text-text-primary-fg font-black text-sm shadow-lg shadow-primary-500/20 transition duration-200 ease-out cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" /> Kiểm tra lượt học tiếp theo
            </button>
          </div>
        </div>
      ) : (
        /* 3D Flashcard Container */
        <>
          {loading ? (
            <div className="flex items-center justify-center min-h-[360px]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
            </div>
          ) : (
            <div className="perspective-1000 min-h-[360px]">
              <motion.div
                onClick={() => {
                  if (!isFlipped) {
                    setCardShownAt(Date.now());
                  }
                  setIsFlipped(!isFlipped);
                }}
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.7, type: "spring", stiffness: 120, damping: 16 }}
                className="relative w-full min-h-[360px] rounded-3xl cursor-pointer transform-style-3d active:scale-95"
              >
                {/* Front Side */}
                <div className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-b from-bg-surface to-bg-base border border-border-hover p-8 flex flex-col justify-between shadow-2xl backface-hidden">
                  <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                    <span className="px-3 py-1 rounded-full bg-bg-surface text-primary-400 border border-border-main">
                      Chủ đề:{" "}
                      <span className="text-text-main font-bold">
                        {currentWord?.topic || selectedTopic}
                      </span>
                    </span>
                    {Boolean(
                      currentWord?.video_id || currentWord?.embed_url,
                    ) && (
                      <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1">
                        <Video className="w-3 h-3" /> Có Video
                      </span>
                    )}
                    <span className="text-primary-400 flex items-center gap-1 font-bold">
                      <RotateCw className="w-3.5 h-3.5" /> Chạm để xem nghĩa
                    </span>
                  </div>

                  <div className="text-center space-y-3 py-6">
                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                      <h2 className="text-4xl sm:text-5xl font-black text-text-main tracking-tight">
                        {currentWord?.word}
                      </h2>
                      {currentWord?.pos && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary-500/10 text-primary-300 border border-primary-500/30">
                          {currentWord.pos}
                        </span>
                      )}
                    </div>

                    {(currentWord?.phon_uk || currentWord?.phon_us || currentWord?.pronunciation) && (
                      <div className="flex items-center justify-center gap-3 text-sm font-medium text-primary-400">
                        {currentWord.phon_uk && <span>UK: {currentWord.phon_uk}</span>}
                        {currentWord.phon_us && <span>US: {currentWord.phon_us}</span>}
                        {!currentWord.phon_uk && !currentWord.phon_us && currentWord.pronunciation && (
                          <span>/{currentWord.pronunciation}/</span>
                        )}
                      </div>
                    )}

                    <div className="inline-flex items-center gap-2 pt-2 flex-wrap justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentWord?.word) playAudio(currentWord.word, audioRate, 'us');
                        }}
                        disabled={isPlayingAudio && audioAccent === 'us'}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 ease-out border active:scale-95 cursor-pointer ${
                          audioAccent === 'us' && isPlayingAudio
                            ? "bg-primary-500 text-text-primary-fg border-primary-400 animate-pulse"
                            : "bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border-primary-500/30"
                        }`}
                        title="Nghe phát âm chuẩn Anh - Mỹ (Phím A)"
                      >
                        {isAudioLoading && audioAccent === 'us' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-primary-400" />
                        )}
                        <span>🇺🇸 US [A]</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentWord?.word) playAudio(currentWord.word, audioRate, 'uk');
                        }}
                        disabled={isPlayingAudio && audioAccent === 'uk'}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 ease-out border active:scale-95 cursor-pointer ${
                          audioAccent === 'uk' && isPlayingAudio
                            ? "bg-sky-500 text-text-primary-fg border-sky-400 animate-pulse"
                            : "bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/30"
                        }`}
                        title="Nghe phát âm chuẩn Anh - Anh (Phím U)"
                      >
                        {isAudioLoading && audioAccent === 'uk' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-sky-400" />
                        )}
                        <span>🇬🇧 UK [U]</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentWord?.word) playAudio(currentWord.word, audioRate, 'vi');
                        }}
                        disabled={isPlayingAudio && audioAccent === 'vi'}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 ease-out border active:scale-95 cursor-pointer ${
                          audioAccent === 'vi' && isPlayingAudio
                            ? "bg-emerald-500 text-text-primary-fg border-emerald-400 animate-pulse"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        }`}
                        title="Nghe phát âm tiếng Anh giọng người Việt (Phím V)"
                      >
                        {isAudioLoading && audioAccent === 'vi' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                        )}
                        <span>🇻🇳 VI [V]</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAudioRate(prev => prev === 1.0 ? 0.8 : 1.0);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-bg-surface hover:bg-bg-surface-hover text-text-muted hover:text-primary-400 text-xs font-bold transition-colors duration-200 ease-out border border-border-main active:scale-95 cursor-pointer"
                        title="Tốc độ đọc"
                      >
                        {audioRate === 1.0 ? '1.0x' : '0.8x Chậm'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs">
                    {(() => {
                      const badge = getCefrBadge(currentWord?.cefr_level);
                      return (
                        <span className={`px-3 py-1 rounded-full border font-bold ${badge.color}`}>
                          {badge.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 w-full h-full rounded-3xl bg-bg-surface border border-border-hover p-8 flex flex-col justify-between shadow-2xl rotate-y-180 backface-hidden overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                    <span className="text-primary-400 font-bold">
                      Ý Nghĩa Tiếng Việt
                    </span>
                    <span className="text-primary-400 flex items-center gap-1 font-bold">
                      <RotateCw className="w-3.5 h-3.5" /> Quay lại mặt trước [Space]
                    </span>
                  </div>

                  <div className="space-y-4 py-3 text-center">
                    {/* Word reminder + quick audio on back side */}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-xl font-black text-text-main">{currentWord?.word}</span>
                      {currentWord?.pos && (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-primary-500/10 text-primary-300 border border-primary-500/30">
                          {currentWord.pos}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentWord?.word) playAudio(currentWord.word, audioRate, 'us');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/30 active:scale-95 transition-colors cursor-pointer"
                        title="Nghe phát âm US (Phím A)"
                      >
                        {isAudioLoading && audioAccent === 'us' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>🇺🇸 US</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentWord?.word) playAudio(currentWord.word, audioRate, 'uk');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 active:scale-95 transition-colors cursor-pointer"
                        title="Nghe phát âm UK (Phím U)"
                      >
                        {isAudioLoading && audioAccent === 'uk' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>🇬🇧 UK</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentWord?.word) playAudio(currentWord.word, audioRate, 'vi');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 active:scale-95 transition-colors cursor-pointer"
                        title="Nghe phát âm tiếng Anh giọng người Việt (Phím V)"
                      >
                        {isAudioLoading && audioAccent === 'vi' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>🇻🇳 VI</span>
                      </button>
                    </div>

                    <h3 className="text-3xl font-bold text-primary-400">
                      {currentWord?.meaning_vi ||
                        currentWord?.vietnamese_meaning ||
                        "Chưa có nghĩa tiếng Việt"}
                    </h3>
                    {currentWord?.definition && (
                      <p className="text-sm text-text-muted italic max-w-lg mx-auto leading-relaxed">
                        {currentWord.definition}
                      </p>
                    )}

                    {/* Oxford Collocations Section */}
                    {Boolean(currentWord?.collocations) && (
                      <div className="bg-teal-500/10 p-3.5 rounded-2xl border border-teal-500/20 text-left space-y-2 max-w-xl mx-auto">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Oxford Collocations & Cấu trúc ngữ pháp</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {currentWord!.collocations!.split(',').map((col, idx) => {
                            const trimmed = col.trim();
                            if (!trimmed) return null;
                            const isPattern = trimmed.includes('+ V-ing') || trimmed.includes('+ to V') || trimmed.includes('+ V-bare') || trimmed.includes('+ V');
                            return (
                              <span
                                key={idx}
                                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                                  isPattern
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                                    : "bg-teal-500/15 text-teal-300 border-teal-500/30"
                                }`}
                              >
                                {isPattern && "⚡ "}
                                {trimmed}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Synonyms & Antonyms */}
                    {Boolean(currentWord?.synonyms || currentWord?.antonyms) && (
                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs max-w-xl mx-auto">
                        {Boolean(currentWord?.synonyms) && (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                            <span className="font-bold text-[10px] uppercase text-emerald-400">Đồng nghĩa:</span>
                            <span className="font-medium">{currentWord?.synonyms}</span>
                          </div>
                        )}
                        {Boolean(currentWord?.antonyms) && (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                            <span className="font-bold text-[10px] uppercase text-rose-400">Trái nghĩa:</span>
                            <span className="font-medium">{currentWord?.antonyms}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Ví dụ tĩnh hoặc AI */}
                    <div className="space-y-3">
                      {(currentWord?.example_en ||
                        currentWord?.example ||
                        currentWord?.context) && (
                        <div className="bg-bg-surface p-4 rounded-2xl border border-border-main space-y-1.5 text-sm text-left max-w-xl mx-auto">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-text-main font-medium leading-relaxed">
                              {currentWord.example_en ||
                                currentWord.example ||
                                currentWord.context}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const sent = currentWord.example_en || currentWord.example || currentWord.context;
                                if (sent) playAudio(sent, 1.0, audioAccent);
                              }}
                              className="p-1.5 rounded-lg bg-bg-card hover:bg-primary-500/20 text-text-muted hover:text-primary-400 border border-border-main transition-colors shrink-0 cursor-pointer"
                              title="Nghe phát âm câu ví dụ"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          {currentWord.example_vi && (
                            <p className="text-text-muted italic text-xs pt-1 border-t border-border-main/50">
                              {currentWord.example_vi}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {aiExample && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-primary-500/10 p-4 rounded-2xl border border-primary-500/30 space-y-1.5 text-sm text-left max-w-xl mx-auto"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">✨ AI Generated Context</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (aiExample?.english) playAudio(aiExample.english, 1.0, audioAccent);
                              }}
                              className="p-1 rounded-lg hover:bg-primary-500/20 text-primary-400 transition-colors shrink-0 cursor-pointer"
                              title="Nghe phát âm câu ví dụ AI"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-primary-300 font-medium leading-relaxed">{aiExample.english}</p>
                          <p className="text-text-muted italic text-xs pt-1 border-t border-primary-500/20">{aiExample.vietnamese}</p>
                        </motion.div>
                      )}

                      {!aiExample && (
                        <button
                          onClick={generateAiExample}
                          disabled={aiExampleLoading || aiUsage?.remaining === 0}
                          className={`mx-auto flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors duration-200 ease-out ${
                            aiUsage?.remaining === 0 
                            ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed" 
                            : "border-primary-500/30 bg-bg-surface text-primary-400 hover:bg-primary-500/10 disabled:opacity-50"
                          }`}
                        >
                          {aiExampleLoading ? (
                            <div className="animate-spin w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full" />
                          ) : (
                            <span className="text-base leading-none">✨</span>
                          )}
                          Sinh ví dụ ngữ cảnh với AI {aiUsage ? `(Còn ${aiUsage.remaining} lượt)` : ''}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 text-center">
                    Chọn mức độ nhớ bên dưới (hoặc bấm phím 1 - 4)
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Embedded Video Context Player */}
          {isFlipped && (currentWord?.embed_url || currentWord?.video_id) && (
            <div className="p-6 rounded-3xl bg-bg-card border border-border-main space-y-4 shadow-xl animate-in fade-in zoom-in-[0.98] duration-300 ease-out">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-text-main">
                  <Video className="w-5 h-5 text-rose-400" />
                  <span>Video Ngữ Cảnh Thực Tế</span>
                </div>
                {currentWord.channel && (
                  <span className="text-xs text-text-muted bg-bg-surface px-3 py-1 rounded-full font-medium border border-border-main">
                    {currentWord.channel}
                  </span>
                )}
              </div>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border-main shadow-inner">
                <iframe
                  src={
                    (
                      currentWord.embed_url ||
                      `https://www.youtube.com/embed/${currentWord.video_id}?start=${Math.floor(currentWord.timestamp_sec || 0)}`
                    ).replace("autoplay=1", "autoplay=0") +
                    (currentWord.embed_url?.includes("autoplay")
                      ? ""
                      : "&autoplay=0")
                  }
                  title={currentWord.word}
                  className="w-full h-full border-0"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Review Action Buttons with Keyboard Shortcuts Badges */}
          {isFlipped && (
            <div className="space-y-3 animate-in fade-in zoom-in-[0.98] duration-300 ease-out">
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => handleReview("again")}
                  className="py-3 px-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs text-center transition duration-200 ease-out cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20">[1]</span>
                  <span>Quên (Again)</span>
                </button>
                <button
                  onClick={() => handleReview("hard")}
                  className="py-3 px-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold text-xs text-center transition duration-200 ease-out cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20">[2]</span>
                  <span>Khó (Hard)</span>
                </button>
                <button
                  onClick={() => handleReview("good")}
                  className="py-3 px-2 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold text-xs text-center transition duration-200 ease-out cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20">[3]</span>
                  <span>Biết (Good)</span>
                </button>
                <button
                  onClick={() => handleReview("easy")}
                  className="py-3 px-2 rounded-2xl bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 border border-primary-500/40 font-bold text-xs text-center transition duration-200 ease-out cursor-pointer shadow-lg shadow-primary-500/10 active:scale-95 flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-500/30">[4]</span>
                  <span>Rất rõ (Easy)</span>
                </button>
              </div>

              {/* Quick Navigation Help Footer */}
              <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-text-muted pt-2 border-t border-border-main/50">
                <span>💡 Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-main font-mono text-[10px]">Space</kbd> Lật thẻ</span>
                <span>• <kbd className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-main font-mono text-[10px]">1-4</kbd> Đánh giá</span>
                <span>• <kbd className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-main font-mono text-[10px]">A</kbd> Nghe</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

