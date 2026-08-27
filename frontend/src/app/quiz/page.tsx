'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { generateQuiz, submitReviewSession, fetchQuizInfo, QuizTopicInfo } from '@/lib/api';
import { QuizQuestion } from '@/types';
import {
  Brain, CheckCircle, XCircle, RotateCcw, Award,
  ArrowRight, BookOpen, Sparkles, Star, Target,
  GraduationCap, AlertCircle, PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type QuizMode = 'review' | 'new';

export default function QuizPage() {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [topicList, setTopicList] = useState<QuizTopicInfo[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [totalLearned, setTotalLearned] = useState<number>(0);
  const [floatingXps, setFloatingXps] = useState<{ id: number, text: string, color: string }[]>([]);

  const showFloatingXp = (amount: number, text: string, color: string) => {
    const id = Date.now();
    setFloatingXps(prev => [...prev, { id, text, color }]);
    setTimeout(() => {
      setFloatingXps(prev => prev.filter(x => x.id !== id));
    }, 2000);
  };

  const loadQuizInfo = async () => {
    try {
      const data = await fetchQuizInfo();
      if (data) {
        setTotalLearned(data.total_learned || 0);
        setTopicList(data.topics || []);
      }
    } catch (err) {
      console.error('Failed to fetch quiz info:', err);
    }
  };

  useEffect(() => {
    loadQuizInfo();
  }, []);

  const currentTopicObj = topicList.find(t => t.name === selectedTopic) || {
    name: selectedTopic,
    display_name: selectedTopic === 'All' ? 'Tất cả chủ đề' : selectedTopic,
    count: 0,
    learned: totalLearned
  };

  const currentTopicLearned = selectedTopic === 'All' ? totalLearned : (currentTopicObj?.learned || 0);
  const currentTopicTotal = currentTopicObj?.count || 0;

  const startQuiz = async (selectedMode: QuizMode) => {
    setMode(selectedMode);
    setLoading(true);
    setErrorMsg(null);
    setCurrentIndex(0);
    setScore(0);
    setIsComplete(false);
    setSelectedOption(null);
    setIsAnswered(false);

    try {
      const res = await generateQuiz(selectedMode, selectedTopic);
      if (res.error) {
        setQuestions([]);
        setErrorMsg(res.error);
      } else if (res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
      } else {
        setQuestions([]);
        setErrorMsg('Không tìm thấy từ vựng nào phù hợp để làm quiz.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tải bài kiểm tra');
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[currentIndex];

  const handleSelectOption = async (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    // Call backend to score the quiz and get the correct answer
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mcq', id: currentQ.id, answer: option })
      });
      const data = await res.json();
      
      const isCorrect = data.correct;
      // We store the correct answer dynamically received from backend for UI rendering
      currentQ.correct_answer = data.correct_answer;
      
      // Trigger re-render so correct_answer is displayed even if answer is wrong
      setQuestions([...questions]);
      
      if (isCorrect) {
        setScore((prev) => prev + 1);
        showFloatingXp(2, "+2 XP", "text-teal-400");
      } else {
        showFloatingXp(-5, "-5 XP", "text-rose-500");
      }

      if (currentQ?.id) {
        submitReviewSession(currentQ.id, isCorrect ? 'good' : 'again');
      }
    } catch (e) {
      console.error("Error submitting answer", e);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsComplete(true);
    }
  };

  // MODE SELECTION SCREEN
  if (mode === null) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-12">
        <div className="border-b border-border-main pb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight flex items-center gap-3">
            <Brain className="w-9 h-9 text-primary-400" />
            Bài Kiểm Tra Từ Vựng
          </h1>
          <p className="text-base text-text-muted mt-1">
            Kiểm tra và củng cố trí nhớ với các từ vựng bạn đã học hoặc khám phá từ mới
          </p>
        </div>

        {/* Real-time Learning Progress Banner */}
        <div className="bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-bg-card border border-primary-500/30 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
              <GraduationCap className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-primary-400 uppercase tracking-wider">Tiến trình học tập</div>
              <div className="text-xl font-black text-text-main">
                Bạn đã học: <span className="text-primary-400">{totalLearned}</span> từ vựng
              </div>
            </div>
          </div>
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 text-xs font-bold border border-primary-500/40 transition duration-200 ease-out active:scale-95"
          >
            <BookOpen className="w-4 h-4" /> Học thêm Flashcard
          </Link>
        </div>

        {/* Topic Selector */}
        <div className="bg-bg-card p-6 rounded-3xl border border-border-main shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-text-muted block uppercase tracking-wide">
              Chọn Chủ Đề Kiểm Tra:
            </label>
            <span className="text-xs font-semibold text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
              {selectedTopic === 'All'
                ? `Tổng ${totalLearned} từ đã học`
                : `Đã học ${currentTopicLearned} / ${currentTopicTotal} từ`}
            </span>
          </div>

          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full bg-bg-surface border border-border-hover rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary-500 transition-colors duration-200 ease-out font-medium appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2334d399'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
          >
            {topicList.length > 0 ? (
              topicList.map(t => (
                <option key={t.name} value={t.name}>
                  {t.display_name} {t.name === 'All' ? `(${t.learned} từ đã học)` : `(${t.learned}/${t.count} từ đã học)`}
                </option>
              ))
            ) : (
              <option value="All">Tất cả chủ đề</option>
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Mode 1: Ôn lại từ đã học */}
          <div
            onClick={() => {
              if (currentTopicLearned > 0) {
                startQuiz('review');
              }
            }}
            className={`group p-8 rounded-3xl bg-bg-card border text-left space-y-4 transition duration-200 ease-out shadow-xl relative ${
              currentTopicLearned > 0
                ? "hover:border-primary-500/50 hover:scale-[1.02] cursor-pointer border-border-main active:scale-95"
                : "border-border-main opacity-85"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition duration-200 ease-out border border-primary-500/30">
                <BookOpen className="w-7 h-7 text-primary-400" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                currentTopicLearned > 0
                  ? "bg-primary-500/20 text-primary-400 border-primary-500/40"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}>
                {currentTopicLearned > 0 ? `${currentTopicLearned} từ đã học` : "Chưa có từ"}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-text-main mb-1">Ôn Lại Từ Đã Học</h2>
              <p className="text-sm text-text-muted leading-relaxed font-medium">
                Kiểm tra đúng những từ bạn đã lưu và học trong tiến trình. Củng cố trí nhớ dài hạn.
              </p>
            </div>

            {currentTopicLearned > 0 ? (
              <div className="flex items-center gap-2 text-primary-400 text-sm font-bold pt-2">
                <CheckCircle className="w-4 h-4" />
                <span>Sẵn sàng kiểm tra ({Math.min(10, currentTopicLearned)} câu)</span>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Bạn chưa học từ nào trong chủ đề này</span>
                </div>
                <Link
                  href="/learn"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 text-text-primary-fg font-black text-xs shadow-md shadow-primary-500/20 hover:bg-primary-400 transition"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Học từ mới ngay
                </Link>
              </div>
            )}
          </div>

          {/* Mode 2: Kiểm tra từ mới */}
          <button
            onClick={() => startQuiz('new')}
            className="group p-8 rounded-3xl bg-bg-card border border-border-main hover:border-amber-500/50 text-left space-y-4 transition duration-200 ease-out shadow-xl hover:scale-[1.02] cursor-pointer active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition duration-200 ease-out border border-amber-500/30">
                <Sparkles className="w-7 h-7 text-amber-400" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Kho từ mới
              </span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-text-main mb-1">Kiểm Tra Từ Mới</h2>
              <p className="text-sm text-text-muted leading-relaxed font-medium">
                Thử thách bản thân với các từ vựng mới trong kho dữ liệu để mở rộng vốn từ. (10 câu)
              </p>
            </div>

            <div className="flex items-center gap-2 text-amber-400 text-sm font-bold pt-2">
              <Target className="w-4 h-4" />
              <span>Khám phá từ vựng mới</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        <p className="text-text-muted font-semibold">Đang tạo bài kiểm tra...</p>
      </div>
    );
  }

  // ERROR STATE
  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <XCircle className="w-16 h-16 text-rose-500 mb-2" />
        <h2 className="text-2xl font-bold text-text-main">Oops!</h2>
        <p className="text-text-muted font-medium">{errorMsg}</p>
        <button
          onClick={() => { setMode(null); setErrorMsg(null); }}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-400 text-text-primary-fg font-black text-sm shadow-lg shadow-primary-500/20 transition duration-200 ease-out cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-4 h-4" /> Chọn chủ đề khác
        </button>
      </div>
    );
  }

  // RESULTS SCREEN
  if (isComplete) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-xl mx-auto text-center py-12 px-6 bg-bg-card rounded-3xl border border-border-main space-y-6 shadow-2xl">
        <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto border border-primary-500/30">
          <Award className="w-10 h-10 text-amber-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-text-main">Kết Quả Bài Kiểm Tra</h2>
          <p className="text-text-muted text-sm">
            Bạn đã hoàn thành bài kiểm tra ({mode === 'review' ? 'Ôn tập' : 'Từ mới'})
          </p>
        </div>
        <div className="text-5xl font-black text-primary-400 tracking-tight">{pct}%</div>
        <p className="text-sm text-text-muted font-bold">
          Trả lời đúng {score} / {questions.length} câu hỏi
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <button
            onClick={() => { if (mode) startQuiz(mode); }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-400 text-text-primary-fg font-black text-sm shadow-lg shadow-primary-500/20 transition duration-200 ease-out cursor-pointer active:scale-95"
          >
            <Brain className="w-4 h-4" /> Học tiếp
          </button>
          <button
            onClick={() => setMode(null)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-transparent border border-primary-500/30 hover:border-primary-500 text-primary-400 font-bold text-sm transition duration-200 ease-out cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> Trở lại
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE QUESTION SCREEN
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

      {/* Header Info */}
      <div className="flex items-center justify-between bg-bg-card p-4 rounded-2xl border border-border-main shadow-lg">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
            mode === 'review'
              ? 'bg-primary-500/20 text-primary-400 border-primary-500/40'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
          }`}>
            {mode === 'review' ? '🎯 Ôn tập từ đã học' : '✨ Kiểm tra từ mới'}
          </span>
          <span className="text-xs font-extrabold text-primary-400 uppercase tracking-wider">
            Câu {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-primary-400">
          <Star className="w-4 h-4 fill-primary-400 text-primary-400" />
          <span>Điểm: {score}</span>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-bg-card p-8 rounded-3xl border border-border-main space-y-6 shadow-2xl">
        <h2 className="text-2xl font-black text-text-main leading-snug">
          {currentQ?.question}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {currentQ?.options?.map((option) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === currentQ.correct_answer;

            let btnStyle = 'bg-bg-surface border-border-main text-text-muted hover:bg-bg-surface-hover hover:border-border-hover';
            if (isAnswered) {
              if (isCorrect) {
                btnStyle = 'bg-primary-500/20 border-primary-500/50 text-primary-400 font-bold';
              } else if (isSelected && !isCorrect) {
                btnStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-400 font-bold animate-[shake_0.4s_ease-in-out]';
              }
            }

            return (
              <button
                key={option}
                onClick={() => handleSelectOption(option)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-2xl border text-left font-bold text-sm transition duration-200 ease-out flex items-center justify-between ${btnStyle} cursor-pointer`}
              >
                <span>{option}</span>
                {isAnswered && isCorrect && <CheckCircle className="w-5 h-5 text-primary-400" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
              </button>
            );
          })}
        </div>

        {/* Explanation box */}
        {isAnswered && (
          <div className="p-4 rounded-2xl bg-bg-surface-hover border border-border-hover space-y-1 animate-in fade-in zoom-in-[0.98] duration-300 ease-out">
            <p className="text-xs font-bold text-primary-400">Giải thích:</p>
            <p className="text-sm text-text-main font-medium">{currentQ?.explanation || 'Không có giải thích.'}</p>
          </div>
        )}

        {/* Next Question Button */}
        {isAnswered && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleNextQuestion}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-400 text-text-primary-fg font-black text-sm shadow-lg shadow-primary-500/20 transition duration-200 ease-out cursor-pointer active:scale-95"
            >
              <span>{currentIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
