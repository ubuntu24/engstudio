"use client";

import { useEffect, useState } from "react";
import { fetchLearnSession, submitReviewSession, fetchTopics, getAiUsage } from "@/lib/api";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

export default function LearnPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [topics, setTopics] = useState<{ name: string; count: number }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("Tất cả");
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
    const list = await fetchTopics();
    if (list && list.length > 0) {
      setTopics(list);
    }
  };

  const loadSession = async (
    topic: string = selectedTopic,
    vidOnly: boolean = videoOnly,
  ) => {
    setLoading(true);
    setCompletedCount(0);
    setAiExample(null);
    try {
      const data = await fetchLearnSession(20, topic, vidOnly);
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
    loadSession("Tất cả", false);
  }, []);

  const handleSelectTopic = (topicName: string) => {
    setSelectedTopic(topicName);
    loadSession(topicName);
  };

  const currentWord = words[currentIndex];

  const playAudio = (text: string, rate: number = 1.0) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    }
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
        if (currentWord?.word) playAudio(currentWord.word, audioRate);
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

      {/* Topic Selection Bar */}
      <div className="bg-bg-card border border-border-main p-4 rounded-3xl space-y-3 shadow-xl">
        <div className="flex items-center justify-between text-xs font-bold text-text-muted">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary-400" />
            <span>Chọn Chủ Đề Học Tập:</span>
          </div>
          <button
            onClick={() => {
              const newVal = !videoOnly;
              setVideoOnly(newVal);
              loadSession(selectedTopic, newVal);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition duration-200 ease-out ${
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
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition duration-200 ease-out flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-primary-500 text-text-primary-fg shadow-lg shadow-primary-500/20 border border-primary-400 font-black"
                    : "bg-bg-surface text-text-muted hover:bg-bg-surface-hover hover:text-text-main border border-border-main"
                }`}
              >
                <span>{t.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${isSelected ? "bg-slate-950 text-primary-400" : "bg-bg-surface-hover text-text-muted"}`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
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

                  <div className="text-center space-y-3 py-8">
                    <h2 className="text-4xl sm:text-5xl font-black text-text-main tracking-tight">
                      {currentWord?.word}
                    </h2>
                    {currentWord?.pronunciation && (
                      <p className="text-lg text-primary-400 font-medium">
                        /{currentWord.pronunciation}/
                      </p>
                    )}
                    <div className="inline-flex items-center gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentWord?.word) playAudio(currentWord.word, audioRate);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 text-sm font-semibold transition-colors duration-200 ease-out border border-primary-500/30 active:scale-95"
                      >
                        <Volume2 className="w-4 h-4 text-primary-400" /> Nghe phát âm [A]
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAudioRate(prev => prev === 1.0 ? 0.8 : 1.0);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-bg-surface hover:bg-bg-surface-hover text-text-muted hover:text-primary-400 text-xs font-bold transition-colors duration-200 ease-out border border-border-main active:scale-95"
                        title="Tốc độ đọc"
                      >
                        {audioRate === 1.0 ? '1.0x' : '0.8x Chậm'}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-center text-text-muted">
                    Cấp độ:{" "}
                    <span className="text-text-main font-semibold">
                      {currentWord?.cefr_level || "A2-B1"}
                    </span>
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 w-full h-full rounded-3xl bg-bg-surface border border-border-hover p-8 flex flex-col justify-between shadow-2xl rotate-y-180 backface-hidden">
                  <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                    <span className="text-primary-400 font-bold">
                      Ý Nghĩa Tiếng Việt
                    </span>
                    <span className="text-primary-400 flex items-center gap-1 font-bold">
                      <RotateCw className="w-3.5 h-3.5" /> Quay lại mặt trước [Space]
                    </span>
                  </div>

                  <div className="space-y-4 py-4 text-center">
                    <h3 className="text-3xl font-bold text-primary-400">
                      {currentWord?.meaning_vi ||
                        currentWord?.vietnamese_meaning ||
                        "Chưa có nghĩa tiếng Việt"}
                    </h3>
                    {currentWord?.definition && (
                      <p className="text-sm text-text-muted italic max-w-lg mx-auto">
                        {currentWord.definition}
                      </p>
                    )}
                    
                    {/* Ví dụ tĩnh hoặc AI */}
                    <div className="space-y-3">
                      {(currentWord?.example_en ||
                        currentWord?.example ||
                        currentWord?.context) && (
                        <div className="bg-bg-surface p-4 rounded-2xl border border-border-main space-y-1.5 text-sm text-left max-w-xl mx-auto">
                          <p className="text-text-main font-medium">
                            {currentWord.example_en ||
                              currentWord.example ||
                              currentWord.context}
                          </p>
                          {currentWord.example_vi && (
                            <p className="text-text-muted italic text-xs">
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
                          <div className="text-[10px] font-bold text-primary-400 uppercase tracking-wider mb-1">✨ AI Generated Context</div>
                          <p className="text-primary-300 font-medium">{aiExample.english}</p>
                          <p className="text-text-muted italic text-xs">{aiExample.vietnamese}</p>
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

