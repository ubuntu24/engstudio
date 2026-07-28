'use client';

import { useState, useEffect } from 'react';
import { generateQuiz, submitReviewSession } from '@/lib/api';
import { QuizQuestion } from '@/types';
import {
  Brain, CheckCircle, XCircle, RotateCcw, Award,
  ArrowRight, BookOpen, Sparkles, Star, Target
} from 'lucide-react';

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
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('All');

  useEffect(() => {
    fetch('/api/learn/topics')
      .then(res => res.json())
      .then(data => {
        const topicList = data.topics ? data.topics.map((t: any) => t.name) : [];
        setTopics(['All', ...topicList]);
      })
      .catch(err => console.error('Failed to fetch topics:', err));
  }, []);

  const startQuiz = (selectedMode: QuizMode) => {
    setMode(selectedMode);
    setLoading(true);
    setErrorMsg(null);
    setCurrentIndex(0);
    setScore(0);
    setIsComplete(false);
    setSelectedOption(null);
    setIsAnswered(false);

    generateQuiz(selectedMode, selectedTopic).then((data) => {
      if (data && data.length > 0) {
        setQuestions(data);
      } else {
        setQuestions([]);
        setErrorMsg('Không tìm thấy từ vựng nào trong chủ đề này để làm quiz.');
      }
      setLoading(false);
    });
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
        <div className="border-b border-[#16271c] pb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Brain className="w-9 h-9 text-emerald-400" />
            Bài Kiểm Tra Từ Vựng
          </h1>
          <p className="text-base text-slate-400 mt-1">
            Chọn chủ đề và chế độ kiểm tra phù hợp với mục tiêu học tập của bạn
          </p>
        </div>

        <div className="bg-[#0f1712] p-6 rounded-3xl border border-[#192b1f] shadow-xl space-y-4">
          <label className="text-sm font-bold text-slate-300 block uppercase tracking-wide">
            Chọn Chủ Đề:
          </label>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full bg-[#060a08] border border-[#1d462f] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-medium appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2334d399'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path সংশ%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
          >
            {topics.map(t => (
              <option key={t} value={t}>{t === 'All' ? 'Tất cả chủ đề' : t}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Mode 1: Ôn lại từ đã học */}
          <button
            onClick={() => startQuiz('review')}
            className="group p-8 rounded-3xl bg-[#0f1712] border border-[#192b1f] hover:border-emerald-500/50 text-left space-y-4 transition-all shadow-xl hover:scale-[1.02] cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-all border border-emerald-500/30">
              <BookOpen className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white mb-1">Ôn Lại Từ Đã Học</h2>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Kiểm tra lại những từ vựng bạn đã lưu. Củng cố trí nhớ dài hạn. (10 thẻ)
              </p>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>Phù hợp để ôn tập hàng ngày</span>
            </div>
          </button>

          {/* Mode 2: Kiểm tra từ mới */}
          <button
            onClick={() => startQuiz('new')}
            className="group p-8 rounded-3xl bg-[#0f1712] border border-[#192b1f] hover:border-amber-500/50 text-left space-y-4 transition-all shadow-xl hover:scale-[1.02] cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-all border border-amber-500/30">
              <Sparkles className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white mb-1">Kiểm Tra Từ Mới</h2>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Thử thách bản thân với các từ vựng mới để mở rộng vốn từ. (10 thẻ)
              </p>
            </div>
            <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
              <Target className="w-4 h-4" />
              <span>Khám phá mức độ từ vựng</span>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        <p className="text-slate-400 font-semibold">Đang tạo bài kiểm tra...</p>
      </div>
    );
  }

  // ERROR STATE
  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <XCircle className="w-16 h-16 text-rose-500 mb-2" />
        <h2 className="text-2xl font-bold text-white">Oops!</h2>
        <p className="text-slate-300 font-medium">{errorMsg}</p>
        <button
          onClick={() => { setMode(null); setErrorMsg(null); }}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
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
      <div className="max-w-xl mx-auto text-center py-12 px-6 bg-[#0f1712] rounded-3xl border border-[#192b1f] space-y-6 shadow-2xl">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
          <Award className="w-10 h-10 text-amber-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-white">Kết Quả Bài Kiểm Tra</h2>
          <p className="text-slate-400 text-sm">
            Bạn đã hoàn thành bài kiểm tra ({mode === 'review' ? 'Ôn tập' : 'Từ mới'})
          </p>
        </div>
        <div className="text-5xl font-black text-[#4ade80] tracking-tight">{pct}%</div>
        <p className="text-sm text-slate-300 font-bold">
          Trả lời đúng {score} / {questions.length} câu hỏi
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <button
            onClick={() => { if (mode) startQuiz(mode); }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Brain className="w-4 h-4" /> Học tiếp
          </button>
          <button
            onClick={() => setMode(null)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-transparent border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 font-bold text-sm transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Trở lại
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE QUESTION SCREEN
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-[#0f1712] p-4 rounded-2xl border border-[#192b1f] shadow-lg">
        <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
          Câu {currentIndex + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-2 text-xs font-bold text-[#4ade80]">
          <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
          <span>Điểm số: {score}</span>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-[#0f1712] p-8 rounded-3xl border border-[#192b1f] space-y-6 shadow-2xl">
        <h2 className="text-2xl font-black text-white leading-snug">
          {currentQ?.question}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {currentQ?.options?.map((option) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === currentQ.correct_answer;

            let btnStyle = 'bg-[#060a08] border-[#172b1f] text-slate-300 hover:bg-[#0e2116] hover:border-[#1d462f]';
            if (isAnswered) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-500/20 border-emerald-500/50 text-[#4ade80] font-bold';
              } else if (isSelected && !isCorrect) {
                btnStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-400 font-bold animate-[shake_0.4s_ease-in-out]';
              }
            }

            return (
              <button
                key={option}
                onClick={() => handleSelectOption(option)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-2xl border text-left font-bold text-sm transition-all flex items-center justify-between ${btnStyle} cursor-pointer`}
              >
                <span>{option}</span>
                {isAnswered && isCorrect && <CheckCircle className="w-5 h-5 text-[#4ade80]" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
              </button>
            );
          })}
        </div>

        {/* Explanation box */}
        {isAnswered && (
          <div className="p-4 rounded-2xl bg-[#0e2116] border border-[#1d462f] space-y-1 animate-fade-in">
            <p className="text-xs font-bold text-emerald-400">Giải thích:</p>
            <p className="text-sm text-slate-200 font-medium">{currentQ?.explanation || 'Không có giải thích.'}</p>
          </div>
        )}

        {/* Next Question Button */}
        {isAnswered && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleNextQuestion}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
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
