"use client";

import { useEffect, useState } from "react";
import { fetchLearnSession, submitReviewSession, fetchTopics } from "@/lib/api";
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
} from "lucide-react";

export default function LearnPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [topics, setTopics] = useState<{ name: string; count: number }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("Tất cả");
  const [videoOnly, setVideoOnly] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);

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
    const data = await fetchLearnSession(20, topic, vidOnly);
    setWords(data.cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setLoading(false);
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

  const playAudio = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleReview = async (rating: "easy" | "good" | "hard" | "again") => {
    if (!currentWord) return;

    await submitReviewSession(currentWord.id, rating);
    setIsFlipped(false);

    if (rating === "again") {
      const remainingWords = words.filter((_, i) => i !== currentIndex);
      setWords([...remainingWords, currentWord]);
    } else {
      setWords(words.filter((_, i) => i !== currentIndex));
      setCompletedCount((prev) => prev + 1);
    }
    setCurrentIndex(0);
  };

  if (loading && !topics.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-emerald-400" />
            Học Từ Vựng Flashcard
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Phân loại theo Chủ đề
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-[#0e2116] text-[#4ade80] border border-[#1d462f] text-xs font-semibold">
            Còn lại:{" "}
            <span className="text-[#4ade80] font-bold">{words.length}</span> thẻ
          </div>
        </div>
      </div>

      {/* Topic Selection Bar */}
      <div className="bg-[#0f1712] border border-[#192b1f] p-4 rounded-3xl space-y-3 shadow-xl">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span>Chọn Chủ Đề Học Tập:</span>
          </div>
          <button
            onClick={() => {
              const newVal = !videoOnly;
              setVideoOnly(newVal);
              loadSession(selectedTopic, newVal);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
              videoOnly
                ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                : "bg-[#060a08] border-[#172b1f] text-slate-400 hover:text-white"
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
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 border border-emerald-400 font-black"
                    : "bg-[#060a08] text-slate-300 hover:bg-[#0e1d14] hover:text-white border border-[#172b1f]"
                }`}
              >
                <span>{t.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${isSelected ? "bg-slate-950 text-emerald-400" : "bg-[#0b140f] text-slate-400"}`}
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
        <div className="max-w-2xl mx-auto text-center py-16 px-6 bg-[#0f1712] rounded-3xl border border-[#192b1f] space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-white">
              {videoOnly
                ? `Không có Video nào trong "${selectedTopic}"`
                : `Hoàn Thành Chuỗi Từ Chủ Đề "${selectedTopic}"!`}
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto font-medium">
              {videoOnly
                ? "Chưa có từ vựng nào trong chủ đề này được gắn kèm video YouTube. Bạn hãy thử chọn chủ đề khác nhé!"
                : "Tuyệt vời! Bạn đã học hết tất cả các từ vựng thuộc chủ đề này trong lượt hiện tại."}
            </p>
          </div>
          {completedCount > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Đã ôn thành công{" "}
              {completedCount} thẻ
            </div>
          )}
          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => loadSession(selectedTopic, videoOnly)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
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
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <div className="perspective-1000 min-h-[360px]">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`relative w-full min-h-[360px] rounded-3xl cursor-pointer transition-transform duration-700 transform-style-3d ${
                  isFlipped ? "rotate-y-180" : ""
                }`}
              >
                {/* Front Side */}
                <div className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-b from-[#0f1a14] to-[#070d0a] border border-[#1d3d2a] p-8 flex flex-col justify-between shadow-2xl backface-hidden">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span className="px-3 py-1 rounded-full bg-[#08140d] text-emerald-300 border border-[#173824]">
                      Chủ đề:{" "}
                      <span className="text-white font-bold">
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
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <RotateCw className="w-3.5 h-3.5" /> Chạm để xem nghĩa
                    </span>
                  </div>

                  <div className="text-center space-y-3 py-8">
                    <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      {currentWord?.word}
                    </h2>
                    {currentWord?.pronunciation && (
                      <p className="text-lg text-emerald-400 font-medium">
                        /{currentWord.pronunciation}/
                      </p>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentWord?.word) playAudio(currentWord.word);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-sm font-semibold transition-colors border border-emerald-500/30 mt-2"
                    >
                      <Volume2 className="w-4 h-4 text-emerald-400" /> Nghe phát
                      âm
                    </button>
                  </div>

                  <div className="text-xs text-center text-slate-400">
                    Cấp độ:{" "}
                    <span className="text-white font-semibold">
                      {currentWord?.cefr_level || "A2-B1"}
                    </span>
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 w-full h-full rounded-3xl bg-[#0a120e] border border-[#1d3d2a] p-8 flex flex-col justify-between shadow-2xl rotate-y-180 backface-hidden">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span className="text-[#4ade80] font-bold">
                      Ý Nghĩa Tiếng Việt
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <RotateCw className="w-3.5 h-3.5" /> Quay lại mặt trước
                    </span>
                  </div>

                  <div className="space-y-4 py-4 text-center">
                    <h3 className="text-3xl font-bold text-[#4ade80]">
                      {currentWord?.meaning_vi ||
                        currentWord?.vietnamese_meaning ||
                        "Chưa có nghĩa tiếng Việt"}
                    </h3>
                    {currentWord?.definition && (
                      <p className="text-sm text-slate-300 italic max-w-lg mx-auto">
                        {currentWord.definition}
                      </p>
                    )}
                    {(currentWord?.example_en ||
                      currentWord?.example ||
                      currentWord?.context) && (
                      <div className="bg-[#060a08] p-4 rounded-2xl border border-[#172b1f] space-y-1.5 text-sm text-left max-w-xl mx-auto">
                        <p className="text-slate-200 font-medium">
                          {currentWord.example_en ||
                            currentWord.example ||
                            currentWord.context}
                        </p>
                        {currentWord.example_vi && (
                          <p className="text-slate-400 italic text-xs">
                            {currentWord.example_vi}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 text-center">
                    Chọn mức độ nhớ
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Embedded Video Context Player */}
          {isFlipped && (currentWord?.embed_url || currentWord?.video_id) && (
            <div className="p-6 rounded-3xl bg-[#0f1712] border border-[#192b1f] space-y-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Video className="w-5 h-5 text-rose-400" />
                  <span>Video Ngữ Cảnh Thực Tế</span>
                </div>
                {currentWord.channel && (
                  <span className="text-xs text-slate-400 bg-[#060a08] px-3 py-1 rounded-full font-medium border border-[#172b1f]">
                    {currentWord.channel}
                  </span>
                )}
              </div>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#172b1f] shadow-inner">
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

          {/* Review Action Buttons */}
          {isFlipped && (
            <div className="grid grid-cols-4 gap-3 animate-fade-in">
              <button
                onClick={() => handleReview("again")}
                className="py-3 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs text-center transition-all cursor-pointer"
              >
                Quên (Again)
              </button>
              <button
                onClick={() => handleReview("hard")}
                className="py-3 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold text-xs text-center transition-all cursor-pointer"
              >
                Khó (Hard)
              </button>
              <button
                onClick={() => handleReview("good")}
                className="py-3 px-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold text-xs text-center transition-all cursor-pointer"
              >
                Biết (Good)
              </button>
              <button
                onClick={() => handleReview("easy")}
                className="py-3 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs text-center transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                Rất rõ (Easy)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
