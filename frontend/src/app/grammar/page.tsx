'use client';

import { useState, useEffect } from 'react';
import { fetchGrammarQuestions, fetchAiGrammarExplanation, AiExplanationResult } from '@/lib/api';
import { GrammarQuestion } from '@/types';
import {
  BookOpen, CheckCircle, XCircle, RotateCcw, Award,
  ArrowRight, Sparkles, Star, Target, Filter, HelpCircle, Lightbulb, GraduationCap, Bot, Loader2,
  FileText, Check, ChevronRight, Layers, Bookmark, Languages
} from 'lucide-react';

interface TheoryTopic {
  id: string;
  title: string;
  badge: string;
  formula: string;
  rules: string[];
  signalWords: string[];
  examples: {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
    translation: string;
  }[];
}

const THEORY_TOPICS: TheoryTopic[] = [
  {
    id: 'verbs-tenses',
    title: '1. Động từ & Chia thì trong TOEIC (Verbs & Tenses)',
    badge: 'Động từ & Thì',
    formula: 'Subject + Verb (chia thì) + Object',
    rules: [
      'Hiện tại đơn: Diễn tả sự thật, lịch trình hoặc thói quen (Thường dùng với: always, usually, often, every day).',
      'Hiện tại hoàn thành: Diễn tả hành động bắt đầu trong quá khứ và kéo dài đến hiện tại (Thường dùng với: recently, already, since + mốc thời gian, for + khoảng thời gian).',
      'Quá khứ đơn: Diễn tả hành động đã chấm dứt hoàn toàn trong quá khứ (Thường dùng với: yesterday, last week, ago, in 2020).',
      'Tương lai đơn: Diễn tả hành động sắp xảy ra trong tương lai (Thường dùng với: next week, tomorrow, soon).'
    ],
    signalWords: ['recently', 'already', 'since', 'for', 'currently', 'yesterday', 'tomorrow', 'soon'],
    examples: [
      {
        question: 'The film crew _______ in Namibia earlier this week to prepare for the promotional tourism campaign.',
        options: ['A. to arrive', 'B. having arrived', 'C. arrived', 'D. arriving'],
        answer: 'C. arrived',
        explanation: 'Dấu hiệu "earlier this week" (vào đầu tuần này) chỉ thời gian quá khứ xác định. Mệnh đề cần Động từ chính chia ở thì Quá khứ đơn (arrived).',
        translation: 'Đoàn làm phim đã đến Namibia vào đầu tuần này để chuẩn bị cho chiến dịch quảng bá du lịch.'
      },
      {
        question: 'Orbin\'s Fish Company expanded to a total of 26 stores _______ its takeover of a rival chain.',
        options: ['A. whenever', 'B. toward', 'C. following', 'D. usually'],
        answer: 'C. following',
        explanation: '"following" đóng vai trò là Giới từ (mang nghĩa "sau khi"). Cụm "following its takeover" nghĩa là "sau khi tiếp quản".',
        translation: 'Orbin\'s Fish Company đã mở rộng đạt tổng cộng 26 cửa hàng sau khi tiếp quản một chuỗi đối thủ.'
      }
    ]
  },
  {
    id: 'nouns',
    title: '2. Danh từ & Vị trí Danh từ (Nouns)',
    badge: 'Danh từ',
    formula: 'Article (a/an/the) / Possessive + (Adjective) + NOUN',
    rules: [
      'Đuôi Danh từ phổ biến: -tion (action), -ment (management), -ance (assistance), -ence (confidence), -ity (capacity), -ness (business).',
      'Vị trí 1: Đứng sau Mạo từ (a, an, the) hoặc Tính từ sở hữu (my, your, his, her, its, our, their).',
      'Vị trí 2: Đứng sau Tính từ để tạo thành cụm danh từ (Noun Phrase).',
      'Vị trí 3: Đứng sau Giới từ (in, on, at, for, with, about...).'
    ],
    signalWords: ['a / an / the', 'my / his / her / their', 'excess', 'annual', 'extended'],
    examples: [
      {
        question: 'Maihama vehicles include an extended _______ to cover engine repairs.',
        options: ['A. record', 'B. operation', 'C. budget', 'D. warranty'],
        answer: 'D. warranty',
        explanation: 'Cụm từ cố định trong TOEIC: "extended warranty" (gói bảo hành mở rộng). Đứng sau tính từ "extended" cần một Danh từ.',
        translation: 'Các xe của Maihama bao gồm gói bảo hành mở rộng để chi trả cho các sửa chữa động cơ.'
      },
      {
        question: 'Once you have Mr. Garcia\'s _______ please post the job listing on Web sites.',
        options: ['A. approve', 'B. approves', 'C. approval', 'D. approving'],
        answer: 'C. approval',
        explanation: 'Sau sở hữu cách "Mr. Garcia\'s" bắt buộc phải là một Danh từ. Đuôi -al của "approval" là danh từ (sự chấp thuận).',
        translation: 'Khi bạn nhận được sự chấp thuận của ông Garcia, vui lòng đăng thông báo tuyển dụng lên website.'
      }
    ]
  },
  {
    id: 'adverbs-adjectives',
    title: '3. Tính từ & Trạng từ (Adjectives & Adverbs)',
    badge: 'Tính từ & Trạng từ',
    formula: 'Verb + (Object) + ADVERB (-ly)  |  ADJECTIVE + Noun',
    rules: [
      'Vị trí Trạng từ 1: Đứng ở cuối câu hoặc sau tân ngữ bổ nghĩa cho động từ chính: Verb + Object + Adverb (-ly).',
      'Vị trí Trạng từ 2: Đứng trước Tính từ bổ nghĩa cho tính từ: Adverb + Adjective (VD: highly recommended, extremely successful).',
      'Vị trí Tính từ: Đứng trước Danh từ hoặc sau Động từ to-be/Linking verbs (seem, remain, become, look).'
    ],
    signalWords: ['neatly', 'frequently', 'highly', 'deeply', 'recently', 'candidly', 'satisfied'],
    examples: [
      {
        question: 'Be sure to fold all the clothes _______ before placing them in bags for customers.',
        options: ['A. neatly', 'B. deeply', 'C. highly', 'D. surely'],
        answer: 'A. neatly',
        explanation: 'Cụm "fold clothes neatly" (gấp quần áo một cách gọn gàng) là sự kết hợp từ tự nhiên chỉ cách thức sắp xếp đồ đạc ngăn nắp.',
        translation: 'Hãy nhớ gấp tất cả quần áo một cách gọn gàng trước khi cho vào túi cho khách hàng.'
      },
      {
        question: 'The Sun-Tech ceiling fan has received more than 15,000 five-star reviews from _______ customers.',
        options: ['A. satisfied', 'B. checked', 'C. adjusted', 'D. allowed'],
        answer: 'A. satisfied',
        explanation: 'Cụm "satisfied customers" (những khách hàng hài lòng) dùng tính từ cảm xúc đuôi -ed bổ nghĩa cho danh từ chỉ người.',
        translation: 'Quạt trần Sun-Tech đã nhận được hơn 15.000 đánh giá 5 sao từ những khách hàng hài lòng.'
      }
    ]
  },
  {
    id: 'pronouns',
    title: '4. Đại từ & Đại từ phản xạ (Pronouns)',
    badge: 'Đại từ & Sở hữu',
    formula: 'Subject Pronoun (I/He/She/They) + Verb  |  Verb + Reflexive Pronoun (-self)',
    rules: [
      'Đại từ chủ ngữ (Subject Pronouns: I, He, She, They, We): Đứng đầu mệnh đề hoặc đứng sau liên từ (since, because, although) làm chủ ngữ.',
      'Đại từ tân ngữ (Object Pronouns: me, him, her, them, us): Đứng sau động từ hoặc giới từ.',
      'Đại từ phản xạ (Reflexive Pronouns: myself, himself, herself, themselves): Đứng sau động từ hoặc ở cuối câu nhấn mạnh chủ ngữ tự mình làm.'
    ],
    signalWords: ['he / she / they', 'him / her / them', 'himself / herself / themselves', 'since', 'because'],
    examples: [
      {
        question: 'Dr. Cho will visit the Teledarr Lab during the annual open house, since _______ may not have another chance to see it.',
        options: ['A. hers', 'B. she', 'C. her', 'D. herself'],
        answer: 'B. she',
        explanation: 'Sau liên từ "since" (vì) là một mệnh đề hoàn chỉnh. Chỗ trống đứng trực tiếp trước động từ "may not have" nên cần Đại từ chủ ngữ (she).',
        translation: 'Tiến sĩ Cho sẽ đến thăm Phòng thí nghiệm Teledarr trong ngày hội mở cửa hàng năm, vì cô ấy có thể không có cơ hội nào khác để xem nó.'
      },
      {
        question: 'Former Sendai Company CEO Ken Nakata spoke _______ about career experiences.',
        options: ['A. he', 'B. his', 'C. him', 'D. himself'],
        answer: 'D. himself',
        explanation: 'Chủ ngữ là người "Ken Nakata" + nội động từ "spoke". Ta dùng Đại từ phản xạ "himself" để nhấn mạnh chính ông Nakata tự mình phát biểu.',
        translation: 'Cựu Tổng giám đốc Công ty Sendai, ông Ken Nakata, đã tự mình phát biểu về những trải nghiệm nghề nghiệp.'
      }
    ]
  },
  {
    id: 'conjunctions',
    title: '5. Giới từ & Liên từ trong TOEIC (Prepositions & Conjunctions)',
    badge: 'Giới từ & Liên từ',
    formula: 'Conjunction + Clause (S + V)  |  Preposition + Noun / V-ing',
    rules: [
      'Liên từ chỉ sự đối lập: Although / Even though / Though + Mệnh đề (S + V).',
      'Giới từ chỉ sự đối lập: Despite / In spite of + Danh từ / V-ing.',
      'Liên từ chỉ nguyên nhân: Because / Since / As + Mệnh đề (S + V).',
      'Giới từ chỉ nguyên nhân: Because of / Due to / Owing to + Danh từ / V-ing.'
    ],
    signalWords: ['although', 'despite', 'because', 'because of', 'during', 'while', 'since', 'until'],
    examples: [
      {
        question: 'Overall _______, charitable donations rose last year; specific dollar amounts are not yet available.',
        options: ['A. although', 'B. neither', 'C. whenever', 'D. so'],
        answer: 'A. although',
        explanation: '"Although" (mặc dù) là liên từ nhượng bộ đứng đầu mệnh đề chỉ sự đối lập giữa việc quyên góp tăng và số tiền chưa có sẵn.',
        translation: 'Mặc dù về tổng thể các khoản quyên góp từ thiện đã tăng vào năm ngoái, nhưng số tiền cụ thể vẫn chưa có sẵn.'
      },
      {
        question: 'The fund-raising event for the library was successful, _______ the author\'s reading was canceled.',
        options: ['A. seldom', 'B. though', 'C. rarely', 'D. secondly'],
        answer: 'B. though',
        explanation: '"though" đóng vai trò là liên từ nhượng bộ (mang nghĩa "tuy nhiên / mặc dù") nối hai mệnh đề đối lập.',
        translation: 'Sự kiện gây quỹ cho thư viện đã thành công, tuy nhiên buổi đọc sách của tác giả đã bị hủy.'
      }
    ]
  }
];

export default function GrammarPage() {
  const [activeTab, setActiveTab] = useState<'theory' | 'quiz'>('theory');
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AiExplanationResult | null>(null);

  const loadQuestions = async (cat: string) => {
    setLoading(true);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setAiAnalysis(null);
    const data = await fetchGrammarQuestions('All');
    setQuestions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadQuestions('All');
  }, []);

  const handleSelectOption = async (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    // Call backend to score the quiz and get the correct answer and ai analysis
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'grammar', id: currentQ.id, answer: option })
      });
      const data = await res.json();
      
      // Update UI with data from backend
      currentQ.correct_answer = data.correct_answer;
      currentQ.explanation = data.explanation;
      currentQ.formula = data.formula;
      currentQ.translation_vi = data.translation_vi;
      
      // Trigger a re-render so the new properties are displayed
      setQuestions([...questions]);
      if (data.ai_analysis) {
          setAiAnalysis(data.ai_analysis);
      }
    } catch (e) {
      console.error("Error submitting answer", e);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setAiAnalysis(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-bg-base text-text-main p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-surface p-6 rounded-3xl border border-border-main shadow-2xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-400 text-xs font-bold mb-2">
              <GraduationCap className="w-4 h-4" /> TOEIC Part 5 Master Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight">
              Lý Thuyết & Ví Dụ Ngữ Pháp TOEIC
            </h1>
            <p className="text-xs md:text-sm text-text-muted font-medium mt-1">
              Hệ thống hóa toàn bộ công thức cốt lõi, dấu hiệu nhận biết và câu hỏi ví dụ tự học.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-bg-base p-1.5 rounded-2xl border border-border-main">
            <button
              onClick={() => setActiveTab('theory')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'theory'
                  ? 'bg-primary-500 text-text-primary-fg font-extrabold shadow-lg shadow-primary-500/20'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <BookOpen className="w-4 h-4" /> 📚 Lý Thuyết & Ví Dụ
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-primary-500 text-text-primary-fg font-extrabold shadow-lg shadow-primary-500/20'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Target className="w-4 h-4" /> ✍️ Tự Làm Bài Tập
            </button>
          </div>
        </div>

        {/* TAB 1: THEORY LESSONS WITH EXAMPLES */}
        {activeTab === 'theory' && (
          <div className="space-y-8 animate-fade-in">
            {THEORY_TOPICS.map((topic) => (
              <div
                key={topic.id}
                className="bg-bg-surface rounded-3xl border border-border-main p-6 md:p-8 space-y-6 shadow-xl"
              >
                {/* Topic Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border-main pb-4">
                  <h2 className="text-lg md:text-xl font-black text-primary-400 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-400" />
                    {topic.title}
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-primary-950/60 border border-primary-500/30 text-primary-400 text-xs font-bold self-start md:self-auto">
                    {topic.badge}
                  </span>
                </div>

                {/* Core Formula Box */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Công thức ngữ pháp cốt lõi:
                  </span>
                  <div className="bg-bg-base p-4 rounded-2xl border border-border-main font-mono text-sm font-bold text-primary-400">
                    {topic.formula}
                  </div>
                </div>

                {/* Rules List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-primary-400" /> Quy tắc & Định lý cần nhớ:
                  </span>
                  <div className="bg-bg-base p-4 rounded-2xl border border-border-main space-y-2.5">
                    {topic.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-text-main font-medium leading-relaxed">
                        <Check className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signal Words */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Từ khóa dấu hiệu nhận biết nhanh:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {topic.signalWords.map((sw, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-primary-950/40 border border-primary-500/20 text-primary-400 font-mono text-xs font-semibold"
                      >
                        {sw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Examples Section */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-primary-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" /> Câu hỏi ví dụ tự luyện mẫu:
                  </span>

                  <div className="grid grid-cols-1 gap-4">
                    {topic.examples.map((ex, exIdx) => (
                      <div key={exIdx} className="bg-bg-base p-5 rounded-2xl border border-border-main space-y-3 text-xs">
                        <p className="font-bold text-text-main leading-relaxed text-sm">
                          <span className="text-primary-400 font-mono">Ví dụ {exIdx + 1}:</span> &quot;{ex.question}&quot;
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono font-semibold">
                          {ex.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border text-center ${
                                opt === ex.answer
                                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-400 font-bold'
                                  : 'bg-bg-surface border-border-main text-text-muted'
                              }`}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>

                        <div className="bg-bg-surface p-3.5 rounded-xl border border-border-main space-y-2">
                          <div className="flex items-center gap-1.5 text-primary-400 font-bold">
                            <CheckCircle className="w-4 h-4 text-primary-400" />
                            <span>Đáp án đúng: {ex.answer}</span>
                          </div>
                          <p className="text-text-muted leading-relaxed font-medium">{ex.explanation}</p>
                          
                          {/* Vietnamese Translation Box */}
                          <div className="pt-2 border-t border-border-main flex items-start gap-2 text-primary-400">
                            <Languages className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                            <p className="italic font-medium leading-relaxed">
                              Dịch nghĩa: &quot;{ex.translation}&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: INTERACTIVE PRACTICE QUIZ */}
        {activeTab === 'quiz' && (
          <div className="space-y-6 animate-fade-in">
            {loading ? (
              <div className="p-12 text-center text-primary-400 font-bold animate-pulse bg-bg-surface rounded-3xl border border-border-main">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" /> Đang tải bài tập tự làm...
              </div>
            ) : currentQ ? (
              <div className="bg-bg-surface rounded-3xl border border-border-main p-6 md:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-text-muted border-b border-border-main pb-4">
                  <span className="px-3 py-1 rounded-full bg-primary-950/60 border border-primary-500/30 text-primary-400">
                    Chủ đề: {currentQ.category}
                  </span>
                  <span>Câu {currentIndex + 1} / {questions.length}</span>
                </div>

                <div className="space-y-3 bg-bg-base p-6 rounded-2xl border border-border-main">
                  <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest block">
                    TOEIC PART 5 FILL-IN-THE-BLANK:
                  </span>
                  <p className="text-base md:text-lg font-bold text-text-main leading-relaxed">
                    {currentQ.question}
                  </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentQ.options.map((option, idx) => {
                    const label = String.fromCharCode(65 + idx);
                    const isSelected = selectedOption === option;
                    const isCorrect = option === currentQ.correct_answer;

                    let btnStyle = 'bg-bg-base border-border-main hover:border-primary-500/50 text-text-main';
                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle = 'bg-primary-500/20 border-primary-500/60 text-text-main font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-300 font-bold animate-[shake_0.4s_ease-in-out]';
                      }
                    }

                    return (
                      <button
                        key={option}
                        onClick={() => handleSelectOption(option)}
                        disabled={isAnswered}
                        className={`p-4 rounded-2xl border text-left text-sm font-bold transition-all flex items-center justify-between ${btnStyle} cursor-pointer`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-bg-surface border border-border-main text-primary-400 text-xs font-black flex items-center justify-center">
                            {label}
                          </span>
                          <span className="text-text-main">{option}</span>
                        </div>
                        {isAnswered && isCorrect && <CheckCircle className="w-5 h-5 text-primary-400" />}
                        {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Answer Explanation & Vietnamese Translation Box */}
                {isAnswered && (
                  <div className="p-6 rounded-2xl bg-bg-surface border border-border-main space-y-4 animate-fade-in shadow-xl">
                    <div className="flex items-center justify-between border-b border-border-main pb-3">
                      <span className="text-sm font-bold text-primary-400 flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary-400" /> Giải Thích Chi Tiết
                      </span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${selectedOption === currentQ.correct_answer ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                        {selectedOption === currentQ.correct_answer ? 'Chính xác! (+10 điểm)' : 'Chưa đúng'}
                      </span>
                    </div>

                    {/* Prominent Vietnamese Sentence Translation */}
                    {currentQ.translation_vi && (
                      <div className="bg-bg-base p-4 rounded-xl border border-primary-500/40 space-y-1">
                        <span className="text-[11px] font-bold text-primary-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <Languages className="w-4 h-4 text-primary-400" /> Dịch nghĩa câu hoàn chỉnh:
                        </span>
                        <p className="text-sm font-semibold text-text-main italic leading-relaxed">
                          &quot;{currentQ.translation_vi}&quot;
                        </p>
                      </div>
                    )}

                    {aiAnalysis ? (
                      <>
                        <div className="text-xs text-text-main leading-relaxed font-medium bg-bg-base p-3.5 rounded-xl border border-border-main">
                          {aiAnalysis.why_correct}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {aiAnalysis.options_breakdown.map((item, i) => (
                            <div key={i} className="bg-bg-base p-3 rounded-xl border border-border-main space-y-1">
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-text-main">{item.letter}. {item.option}</span>
                                <span className={item.status.includes('ĐÚNG') ? 'text-primary-400 font-bold' : 'text-rose-400 font-bold'}>
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-muted leading-normal">{item.reason}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      currentQ.explanation && (
                        <div className="text-sm text-text-main leading-relaxed font-medium bg-bg-base p-4 rounded-xl border border-border-main whitespace-pre-wrap font-sans">
                          {currentQ.explanation}
                        </div>
                      )
                    )}

                    {/* Next Question Button */}
                    <div className="pt-3 border-t border-border-main flex justify-end">
                      <button
                        onClick={handleNextQuestion}
                        className="px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-text-primary-fg font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-primary-500/20"
                      >
                        Câu tiếp theo <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-text-muted font-bold bg-bg-surface rounded-3xl border border-border-main">
                <HelpCircle className="w-8 h-8 mx-auto mb-3 text-slate-500 opacity-50" /> Không có câu hỏi nào.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
