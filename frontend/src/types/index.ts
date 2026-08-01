export interface UserBadge {
  badge_id: string;
  earned_at: string;
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  xp?: number;
  level?: number;
  badges?: UserBadge[];
}

export interface Word {
  id: number;
  word: string;
  pronunciation?: string;
  pos?: string;
  meaning_vi?: string;
  vietnamese_meaning?: string;
  example_en?: string;
  example_vi?: string;
  example?: string;
  context?: string;
  definition?: string;
  cefr_level?: string;
  video_id?: string;
  embed_url?: string;
  timestamp_sec?: number;
  video_title?: string;
  channel?: string;
  topic?: string;
  review_status?: string;
  next_review_date?: string;
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
}

export interface PracticeCheckRequest {
  user_input: string;
  target_text: string;
}

export interface PracticeCheckResponse {
  is_match: boolean;
  score: number;
  matched_count: number;
  target_count: number;
  missing_words: string[];
  extra_words: string[];
  suggested_corrections?: string[];
  feedback?: string;
}

export interface RealtimeCheckResponse {
  valid: boolean;
  user_tokens: { text: string; status: 'ok' | 'extra' | 'missing' | 'error' }[];
  target_words: string[];
  missing_count: number;
  extra_count: number;
}

export interface QuizQuestion {
  id: number;
  type: 'multiple_choice' | 'fill_in_blank' | 'spelling';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
  word_id?: number;
}

export interface DashboardStats {
  total_words: number;
  mastered_words: number;
  learning_words: number;
  review_due_count: number;
  accuracy_rate: number;
  streak_days: number;
  chart_data?: { date: string; count: number }[];
  has_video?: number;
  has_definition?: number;
  has_example?: number;
  has_audio?: number;
}

export interface SubtitleItem {
  id?: number;
  start: number;
  end: number;
  duration?: number;
  text: string;
  translation?: string;
}

export interface WritingError {
  id: string;
  type: 'grammar' | 'meaning' | 'style';
  start: number;
  end: number;
  matched_text: string;
  suggestion: string;
  hint?: string;
  message: string;
}

export interface WritingCheckResponse {
  valid: boolean;
  score: number;
  errors: WritingError[];
  reference_en: string;
  missing_words: string[];
  extra_words: string[];
}

export interface TopicSample {
  id: string;
  category: string;
  original_vi: string;
  reference_en: string;
}

export interface GrammarQuestion {
  id: number;
  category: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  formula?: string;
  signal_words?: string;
  translation_vi?: string;
  ai_analysis?: {
    why_correct: string;
    options_breakdown: { letter?: string; option: string; status: string; reason: string }[];
    toeic_tip: string;
    translation_vi?: string;
  };
}

