import { Word, DashboardStats, PracticeCheckResponse, RealtimeCheckResponse, QuizQuestion, SubtitleItem, WritingCheckResponse, TopicSample, User, GrammarQuestion } from '../types';

function cleanText(text?: string): string {
  if (!text) return '';
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body.textContent || '';
  }
  // Fallback for SSR
  return text.replace(/<[^>]*>?/g, '').replace(/&[^;]+;/g, '').replace(/\s+/g, ' ').trim();
}

export async function fetchWords(): Promise<Word[]> {
  try {
    const res = await fetch('/api/words');
    if (!res.ok) throw new Error('Failed to fetch words');
    const data = await res.json();
    const rawWords = data.words || (Array.isArray(data) ? data : []);
    return rawWords.map((w: any) => ({
      ...w,
      word: cleanText(w.word),
      meaning_vi: cleanText(w.vietnamese_meaning || w.meaning_vi) || 'Chưa có nghĩa tiếng Việt',
      definition: cleanText(w.definition),
      example_en: cleanText(w.example || w.context || w.example_en),
      example_vi: cleanText(w.example_vi)
    }));
  } catch (err) {
    console.error('Error fetching words:', err);
    return [];
  }
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return await res.json();
  } catch (err) {
    console.error('Error fetching stats:', err);
    return {
      total_words: 0,
      mastered_words: 0,
      learning_words: 0,
      review_due_count: 0,
      accuracy_rate: 0,
      streak_days: 1
    };
  }
}

export async function fetchTopics(): Promise<{ name: string; count: number }[]> {
  try {
    const res = await fetch('/api/learn/topics');
    if (!res.ok) throw new Error('Failed to fetch topics');
    const data = await res.json();
    return data.topics || [];
  } catch (err) {
    console.error('Error fetching topics:', err);
    return [];
  }
}

export async function fetchLearnSession(count: number = 20, topic?: string, video_only: boolean = false): Promise<{ cards: Word[]; session_id: number; review_count: number; new_count: number }> {
  try {
    const res = await fetch('/api/learn/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, topic, video_only }),
    });
    if (!res.ok) throw new Error('Failed to fetch learn session');
    const data = await res.json();
    const rawWords = data.cards || [];
    const cards = rawWords.map((w: any) => ({
      ...w,
      word: cleanText(w.word),
      meaning_vi: cleanText(w.vietnamese_meaning || w.meaning_vi) || 'Chưa có nghĩa tiếng Việt',
      definition: cleanText(w.definition),
      example_en: cleanText(w.example || w.context || w.example_en),
      example_vi: cleanText(w.example_vi)
    }));
    return {
      cards,
      session_id: data.session_id || 0,
      review_count: data.review_count || 0,
      new_count: data.new_count || 0,
    };
  } catch (err) {
    console.error('Error fetching learn session:', err);
    return { cards: [], session_id: 0, review_count: 0, new_count: 0 };
  }
}

export async function submitReviewSession(wordId: number, rating: 'easy' | 'good' | 'hard' | 'again'): Promise<boolean> {
  try {
    const res = await fetch('/api/learn/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_id: wordId, rating }),
    });
    return res.ok;
  } catch (err) {
    console.error('Error submitting review:', err);
    return false;
  }
}

export async function generateQuiz(mode: 'new' | 'review' = 'review', topic: string = 'All'): Promise<QuizQuestion[]> {
  try {
    const res = await fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 10, mode, topic })
    });
    if (!res.ok) throw new Error('Failed to generate quiz');
    const data = await res.json();
    const raw = data.questions || [];

    // Map backend format { word, answer, options, correct_index, type:"mcq" }
    // to frontend QuizQuestion { id, type, question, options, correct_answer }
    return raw.map((q: any, idx: number) => ({
      id: q.id || idx + 1,
      type: 'multiple_choice' as const,
      question: `Nghĩa tiếng Việt của từ "${q.word}" là gì?`,
      options: q.options || [],
      correct_answer: q.answer || (q.options && q.options[q.correct_index]) || '',
      explanation: `Đáp án đúng: ${q.answer}`
    }));
  } catch (err) {
    console.error('Error generating quiz:', err);
    return [];
  }
}

export async function checkPracticeRealtime(userInput: string, targetText: string): Promise<RealtimeCheckResponse> {
  try {
    const res = await fetch('/api/practice/realtime_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_input: userInput, target_text: targetText }),
    });
    if (!res.ok) throw new Error('Failed realtime check');
    return await res.json();
  } catch (err) {
    console.error('Error in realtime practice check:', err);
    return {
      valid: false,
      user_tokens: userInput.split(' ').map(w => ({ text: w, status: 'ok' })),
      target_words: targetText.split(' '),
      missing_count: 0,
      extra_count: 0
    };
  }
}

export async function checkAdvancedPractice(originalVi: string, translationEn: string): Promise<WritingCheckResponse> {
  try {
    const res = await fetch('/api/practice/advanced_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original_vi: originalVi, translation_en: translationEn }),
    });
    if (!res.ok) throw new Error('Failed advanced check');
    return await res.json();
  } catch (err) {
    console.error('Error in advanced practice check:', err);
    return {
      valid: false,
      score: 0,
      errors: [],
      reference_en: '',
      missing_words: [],
      extra_words: []
    };
  }
}

export async function fetchPracticeTopics(): Promise<{ categories: string[]; samples: TopicSample[] }> {
  try {
    const res = await fetch('/api/practice/topics');
    if (!res.ok) throw new Error('Failed to fetch topics');
    return await res.json();
  } catch (err) {
    console.error('Error fetching practice topics:', err);
    return { categories: [], samples: [] };
  }
}

export async function checkGrammar(text: string): Promise<{ original: string; corrected: string; changes?: string[] }> {
  try {
    const res = await fetch('/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Grammar correction failed');
    return await res.json();
  } catch (err) {
    console.error('Error correcting grammar:', err);
    return { original: text, corrected: text };
  }
}

export async function fetchBilingualSubtitles(videoUrl: string): Promise<{
  title?: string;
  subtitles: SubtitleItem[];
  video_id?: string;
  platform?: string;
  stream_url?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/video/bilingual?url=${encodeURIComponent(videoUrl)}`);
    const data = await res.json();
    if (!res.ok) {
      return { subtitles: [], error: data.error || 'Không thể tải phụ đề video.' };
    }
    const rawLines = data.lines || data.subtitles || [];
    const subtitles: SubtitleItem[] = rawLines.map((line: any) => ({
      start: line.start || 0,
      end: (line.start || 0) + (line.duration || 3),
      text: line.en || line.text || '',
      translation: line.vi || line.translation || ''
    }));

    return {
      title: data.title,
      subtitles,
      video_id: data.video_id,
      platform: data.platform,
      stream_url: data.stream_url || ''
    };
  } catch (err: any) {
    console.error('Error fetching subtitles:', err);
    return { subtitles: [], error: 'Lỗi kết nối máy chủ.' };
  }
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch (err) {
    return null;
  }
}

export async function loginUser(username: string, password: string): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Đăng nhập thất bại' };
    return { ok: true, user: data.user };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi kết nối máy chủ.' };
  }
}

export async function registerUser(username: string, password: string, display_name?: string): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, display_name })
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Đăng ký thất bại' };
    return { ok: true, user: data.user };
  } catch (err: any) {
    return { ok: false, error: 'Lỗi kết nối máy chủ.' };
  }
}

export async function logoutUser(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchGrammarQuestions(category: string = 'All'): Promise<GrammarQuestion[]> {
  try {
    const res = await fetch(`/api/grammar/questions?category=${encodeURIComponent(category)}&limit=500`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.questions && data.questions.length > 0) {
        return data.questions;
      }
    }
  } catch (e) {}

  return [];
}

export interface AiExplanationResult {
  why_correct: string;
  options_breakdown: { letter?: string; option: string; status: string; reason: string }[];
  toeic_tip: string;
  translation_vi?: string;
}

export async function fetchAiGrammarExplanation(
  question: string,
  options: string[],
  selectedOption: string,
  correctAnswer: string,
  category: string,
  questionId?: number
): Promise<AiExplanationResult | null> {
  try {
    const res = await fetch('/api/grammar/ai_explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: questionId,
        question,
        options,
        selected_option: selectedOption,
        correct_answer: correctAnswer,
        category,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.analysis || null;
    }
  } catch (e) {
    console.error('Error fetching AI explanation:', e);
  }
  return null;
}




