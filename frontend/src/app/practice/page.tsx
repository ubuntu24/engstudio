"use client";

import { useState, useEffect } from "react";
import { checkAdvancedPractice, fetchPracticeTopics, getAiUsage } from "@/lib/api";
import { WritingCheckResponse, WritingError, TopicSample } from "@/types";
import {
  Sparkles,
  AlertCircle,
  RefreshCw,
  Wand2,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Info,
  Zap,
  Sliders,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  Trash2,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function PracticePage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [allSamples, setAllSamples] = useState<TopicSample[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [currentSampleIndex, setCurrentSampleIndex] = useState<number>(0);

  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customViInput, setCustomViInput] = useState<string>("");

  const [targetVi, setTargetVi] = useState<string>(
    "Cô ấy thích đọc sách trong thư viện vào mỗi buổi chiều.",
  );
  const [userInput, setUserInput] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkMode, setCheckMode] = useState<"normal" | "ai">("normal");
  const [checkResult, setCheckResult] = useState<WritingCheckResponse | null>(
    null,
  );
  const [revealedErrors, setRevealedErrors] = useState<Record<string, boolean>>(
    {},
  );
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [aiUsage, setAiUsage] = useState<{used: number, limit: number, remaining: number} | null>(null);

  useEffect(() => {
    getAiUsage().then(setAiUsage);
  }, []);

  useEffect(() => {
    fetchPracticeTopics().then((res) => {
      if (res.samples && res.samples.length > 0) {
        setCategories(res.categories || []);
        setAllSamples(res.samples);
        setTargetVi(res.samples[0].original_vi);
      }
    });
  }, []);

  const filteredSamples =
    selectedCategory === "All"
      ? allSamples
      : allSamples.filter((s) => s.category === selectedCategory);

  const currentSample = filteredSamples[currentSampleIndex] || null;

  useEffect(() => {
    if (!isCustomMode && currentSample) {
      setTargetVi(currentSample.original_vi);
      setUserInput("");
      setCheckResult(null);
      setRevealedErrors({});
      setShowAnswer(false);
    }
  }, [currentSampleIndex, selectedCategory, isCustomMode, allSamples]);

  useEffect(() => {
    if (!userInput.trim() || !targetVi.trim()) {
      setCheckResult(null);
      setRevealedErrors({});
      return;
    }

    setIsChecking(true);
    const timer = setTimeout(() => {
      checkAdvancedPractice(targetVi, userInput, checkMode).then((res) => {
        setCheckResult(res);
        setIsChecking(false);
        if (checkMode === "ai") {
          getAiUsage().then(setAiUsage);
        }
        if (res && res.valid) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#10b981', '#f59e0b']
          });
        }
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [userInput, targetVi, checkMode]);

  const handleToggleReveal = (errorId: string) => {
    setRevealedErrors((prev) => ({
      ...prev,
      [errorId]: true,
    }));
  };

  const handleApplyFix = (error: WritingError) => {
    if (error.suggestion) {
      const before = userInput.substring(0, error.start);
      const after = userInput.substring(error.end);
      setUserInput(before + error.suggestion + after);
    }
  };

  const handleDeleteWord = (error: WritingError) => {
    const before = userInput.substring(0, error.start);
    let after = userInput.substring(error.end);
    if (after.startsWith(" ")) {
      after = after.substring(1);
    }
    setUserInput((before + after).replace(/\s+/g, " "));
  };

  const renderHighlightedText = () => {
    if (
      !checkResult ||
      !checkResult.errors ||
      checkResult.errors.length === 0
    ) {
      return <span>{userInput}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    const sortedErrors = [...checkResult.errors].sort(
      (a, b) => a.start - b.start,
    );

    sortedErrors.forEach((err, idx) => {
      if (err.start > lastIndex) {
        elements.push(
          <span key={`plain-${lastIndex}`}>
            {userInput.substring(lastIndex, err.start)}
          </span>,
        );
      }

      const errText = userInput.substring(err.start, err.end);
      let underlineClass =
        "underline decoration-wavy decoration-rose-500 underline-offset-4 decoration-2 text-text-main";
      if (err.type === "meaning") {
        underlineClass =
          "underline decoration-wavy decoration-amber-500 underline-offset-4 decoration-2 text-text-main";
      } else if (err.type === "style") {
        underlineClass =
          "underline decoration-dashed decoration-amber-400 underline-offset-4 decoration-2 text-text-main";
      }

      elements.push(
        <span key={`err-${idx}`} className={underlineClass}>
          {errText}
        </span>,
      );

      lastIndex = err.end;
    });

    if (lastIndex < userInput.length) {
      elements.push(
        <span key={`plain-${lastIndex}`}>
          {userInput.substring(lastIndex)}
        </span>,
      );
    }

    return elements;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Header */}
      <div className="border-b border-border-main pb-6">
        <h1 className="text-3xl font-extrabold text-text-main tracking-tight flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary-400" />
          Luyện Đặt Câu Dịch Tiếng Anh Real-Time
        </h1>
        <p className="text-sm text-text-muted mt-1 font-medium">
          Đọc câu tiếng Việt ➔ Đặt câu dịch tiếng Anh tương ứng với sự trợ giúp
          phân tích từ AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-bg-card border border-border-main space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border-main pb-4">
              <h2 className="text-base font-bold text-text-main flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-400" />
                Nguồn Câu Tiếng Việt
              </h2>

              <button
                onClick={() => {
                  setIsCustomMode(!isCustomMode);
                  setUserInput("");
                  setCheckResult(null);
                  setRevealedErrors({});
                  setShowAnswer(false);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-bg-surface-hover text-primary-400 border border-border-hover hover:bg-primary-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                {isCustomMode ? "Xem Câu Theo Chủ Đề" : "Tự Nhập Câu"}
              </button>
            </div>

            {!isCustomMode ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Chọn Chủ Đề Luyện Tập:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedCategory("All");
                        setCurrentSampleIndex(0);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        selectedCategory === "All"
                          ? "bg-primary-500 border-primary-500 text-text-primary-fg shadow-sm"
                          : "bg-bg-surface border-border-main text-text-muted hover:border-primary-400 hover:text-text-main"
                      }`}
                    >
                      Tất Cả
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCurrentSampleIndex(0);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          selectedCategory === cat
                            ? "bg-primary-500 border-primary-500 text-text-primary-fg shadow-sm"
                            : "bg-bg-surface border-border-main text-text-muted hover:border-primary-400 hover:text-text-main"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-bg-surface border border-border-main space-y-4 relative overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between text-xs text-primary-400 font-bold">
                    <span className="bg-bg-surface-hover px-2.5 py-1 rounded-md border border-border-hover">
                      {currentSample?.category || "Mẫu"}
                    </span>
                    <span>
                      Câu {currentSampleIndex + 1} / {filteredSamples.length}
                    </span>
                  </div>

                  <p className="text-lg font-bold text-text-main leading-relaxed">
                    {targetVi}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-border-main">
                    <button
                      disabled={currentSampleIndex === 0}
                      onClick={() =>
                        setCurrentSampleIndex((prev) => Math.max(0, prev - 1))
                      }
                      className="px-3 py-1.5 rounded-xl bg-bg-surface-hover text-text-muted hover:bg-bg-surface-hover text-xs font-semibold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Câu Trước
                    </button>

                    <button
                      disabled={
                        currentSampleIndex >= filteredSamples.length - 1
                      }
                      onClick={() =>
                        setCurrentSampleIndex((prev) =>
                          Math.min(filteredSamples.length - 1, prev + 1),
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-text-primary-fg text-xs font-black disabled:opacity-40 flex items-center gap-1 shadow-md cursor-pointer"
                    >
                      Câu Tiếp <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-muted">
                    Nhập câu tiếng Việt của bạn:
                  </label>
                  <textarea
                    value={customViInput}
                    onChange={(e) => {
                      setCustomViInput(e.target.value);
                      setTargetVi(e.target.value);
                    }}
                    placeholder="Gõ hoặc dán câu tiếng Việt cần luyện dịch vào đây..."
                    className="w-full min-h-[120px] p-3.5 rounded-2xl bg-bg-surface border border-border-main text-text-main text-sm focus:outline-none focus:border-primary-500 font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-5 rounded-3xl bg-bg-card border border-border-main space-y-3 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400" />
              Hướng Dẫn Luyện Tập Thông Minh
            </h3>
            <div className="grid grid-cols-1 gap-2 text-xs font-medium text-text-muted">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-[10px]">
                  1
                </span>
                <span>
                  <strong>Khi nhập sai:</strong> Báo loại lỗi (Ngữ pháp/Dịch
                  nghĩa) & Lời khuyên chia thì.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                  2
                </span>
                <span>
                  <strong>Nút bấm:</strong> Nếu vẫn không nghĩ ra ➔ Bấm nút để
                  hiện từ đúng & nút Sửa Ngay.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 p-1.5 bg-bg-surface border border-border-main rounded-2xl w-max shadow-sm mx-auto lg:mx-0">
            <button
              onClick={() => setCheckMode("normal")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                checkMode === "normal"
                  ? "bg-primary-500 text-text-primary-fg shadow-md"
                  : "text-text-muted hover:text-text-main hover:bg-bg-surface-hover"
              }`}
            >
              Dịch Thông Thường
            </button>
            <button
              onClick={() => setCheckMode("ai")}
              disabled={aiUsage?.remaining === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                aiUsage?.remaining === 0 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700" 
                  : checkMode === "ai"
                    ? "bg-amber-500 text-white shadow-md"
                    : "text-text-muted hover:text-text-main hover:bg-bg-surface-hover"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Dịch bằng AI {aiUsage ? `(Còn ${aiUsage.remaining} lượt)` : ''}
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-bg-card border border-border-main space-y-4 shadow-xl relative">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-text-main flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary-400" />
                Nhập câu tiếng Anh tương ứng:
              </label>
              {isChecking && (
                <span className="text-xs text-primary-400 font-semibold flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang kiểm tra AI...
                </span>
              )}
            </div>

            <div
              id="enInputPractice"
              className="relative min-h-[160px] rounded-2xl bg-bg-surface border border-border-main focus-within:border-primary-500 shadow-inner overflow-hidden"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 p-4 pointer-events-none text-base leading-relaxed font-sans whitespace-pre-wrap break-words text-transparent"
                style={{ wordBreak: "break-word" }}
              >
                {renderHighlightedText()}
              </div>

              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Gõ câu tiếng Anh của bạn tại đây..."
                className="w-full h-full min-h-[160px] p-4 bg-transparent text-text-main placeholder-slate-600 resize-y focus:outline-none text-base leading-relaxed relative z-10 font-sans"
                style={{ caretColor: "white" }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-text-muted">
              <button
                onClick={() => {
                  setUserInput("");
                  setCheckResult(null);
                  setRevealedErrors({});
                  setShowAnswer(false);
                }}
                className="flex items-center gap-1 text-text-muted hover:text-text-main transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Xóa gõ lại
              </button>
              <span>{userInput.length} ký tự</span>
            </div>
          </div>

          <div
            id="suggest-box"
            className="p-6 rounded-3xl bg-bg-card border border-border-main space-y-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border-main pb-4">
              <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-400" />
                Kết Quả Phân Tích{" "}
              </h3>

              {checkResult && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-muted">
                    Độ chính xác:
                  </span>
                  <span
                    className={`text-sm font-extrabold px-3 py-1 rounded-full border ${
                      checkResult.score >= 80
                        ? "bg-primary-500/10 text-primary-400 border-primary-500/20"
                        : checkResult.score >= 50
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {checkResult.score}%
                  </span>
                </div>
              )}
            </div>

            {checkResult ? (
              <div className="space-y-4">
                {checkResult.valid ? (
                  <div className="p-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm font-bold flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary-400 shrink-0" />
                    <div>
                      <p className="text-base">
                        Tuyệt vời! Bạn đã hoàn thành chính xác câu này 🎉
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      Phát hiện {checkResult.errors.length} từ cần chỉnh sửa:
                    </p>

                    <div className="space-y-3">
                      {checkResult.errors.map((err) => {
                        const isRevealed = revealedErrors[err.id] || false;

                        return (
                          <div
                            key={err.id}
                            className="p-4 rounded-2xl bg-bg-surface border border-border-main space-y-3 transition-all"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                    err.type === "grammar"
                                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                      : err.type === "meaning"
                                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                        : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                  }`}
                                >
                                  {err.type === "grammar"
                                    ? "🔴 Lỗi Ngữ pháp / Chia từ"
                                    : err.type === "meaning"
                                      ? "🟠 Lỗi Dịch nghĩa"
                                      : "🟡 Văn phong"}
                                </span>
                                <span className="text-text-main text-sm">
                                  Từ{" "}
                                  <strong className="text-rose-400 font-mono underline decoration-wavy decoration-rose-500">
                                    &quot;{err.matched_text}&quot;
                                  </strong>{" "}
                                  chưa đúng.
                                </span>
                              </div>

                              {!isRevealed && (
                                <button
                                  onClick={() => handleToggleReveal(err.id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" /> Xem Từ
                                  Đúng & Sửa
                                </button>
                              )}
                            </div>

                            <div className="p-3.5 rounded-xl bg-primary-500/10 border border-primary-500/20 text-xs space-y-1">
                              <span className="font-bold flex items-center gap-1.5 text-primary-400">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />{" "}
                                Hướng dẫn gợi ý:
                              </span>
                              <p className="text-primary-200 leading-relaxed font-medium">
                                {err.hint || err.message}
                              </p>
                            </div>

                            {isRevealed && (
                              <div className="p-3.5 rounded-xl bg-primary-500/10 border border-primary-500/20 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
                                <div>
                                  <span className="text-text-muted font-semibold">
                                    Từ chính xác nên dùng:{" "}
                                  </span>
                                  <strong className="text-primary-400 text-sm font-bold ml-1 font-mono">
                                    {err.suggestion || "(Từ này bị dư thừa)"}
                                  </strong>
                                </div>

                                {err.suggestion ? (
                                  <button
                                    onClick={() => handleApplyFix(err)}
                                    className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-text-primary-fg font-bold text-xs shadow-lg shadow-primary-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Sửa Ngay
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteWord(err)}
                                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Xóa Từ
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {checkResult.missing_words &&
                  checkResult.missing_words.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Câu của bạn có vẻ đang thiếu từ. Hãy bổ sung thêm ý.
                      </span>
                    </div>
                  )}

                {checkResult.reference_en && (
                  <div className="pt-2 border-t border-border-main">
                    <button
                      onClick={() => setShowAnswer(!showAnswer)}
                      className="text-xs font-bold text-primary-400 hover:text-primary-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface-hover border border-border-hover transition-all cursor-pointer"
                    >
                      {showAnswer ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      {showAnswer
                        ? "Ẩn toàn bộ câu đúng mẫu"
                        : "Xem toàn bộ câu đúng mẫu (Chỉ khi không nghĩ ra)"}
                    </button>

                    {showAnswer && (
                      <div className="mt-3 p-4 rounded-2xl bg-bg-surface border border-border-main space-y-1 animate-in fade-in duration-150">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                          Toàn Bộ Câu Tiếng Anh Chuẩn AI:
                        </span>
                        <p className="text-sm font-semibold text-primary-400">
                          {checkResult.reference_en}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <p className="text-sm font-semibold text-text-muted">
                  Bắt đầu gõ câu tiếng Anh ở khung trên để kích hoạt bộ phân
                  tích gợi ý AI.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
