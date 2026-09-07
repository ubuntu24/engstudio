/**
 * AI Voice and TTS Engine Helpers
 * Supports:
 * 1. ⚡ Instant Browser Voice (Web Speech API) - 0ms delay, offline-capable
 * 2. 🎙️ High-Quality AI Voice (Edge-TTS Neural / ElevenLabs) with background prefetching & audio caching
 */

export type SupportedAccent = 'us' | 'uk' | 'au' | 'vi';

export interface VoiceItem {
  id: string;
  name: string;
  accent: SupportedAccent;
  flag: string;
  gender: 'male' | 'female';
  tag: string;
  description: string;
  sample: string;
  edgeVoice: string;
}

export interface VoicesResponse {
  active_engine: 'elevenlabs' | 'edge-tts';
  has_elevenlabs_key: boolean;
  model: string;
  default_voices: {
    us: string;
    uk: string;
    au: string;
    vi: string;
  };
  voices: VoiceItem[];
}

export type TtsEngine = 'browser' | 'ai';

export function getTtsEngine(): TtsEngine {
  if (typeof window === 'undefined') return 'ai';
  const stored = localStorage.getItem('preferred_tts_engine');
  if (stored === 'browser' || stored === 'ai') return stored;
  return 'ai';
}

export function setTtsEngine(engine: TtsEngine): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('preferred_tts_engine', engine);
  window.dispatchEvent(new CustomEvent('tts-engine-changed', { detail: { engine } }));
}

export function getPreferredVoice(accent: SupportedAccent = 'us'): string {
  if (typeof window === 'undefined') {
    if (accent === 'vi') return 'giang';
    if (accent === 'uk') return 'george';
    if (accent === 'au') return 'natasha';
    return 'rachel';
  }
  const stored = localStorage.getItem(`preferred_voice_${accent}`);
  if (stored) return stored;
  if (accent === 'vi') return 'giang';
  if (accent === 'uk') return 'george';
  if (accent === 'au') return 'natasha';
  return 'rachel';
}

export function setPreferredVoice(accent: SupportedAccent, voiceId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`preferred_voice_${accent}`, voiceId);
  window.dispatchEvent(new CustomEvent('voice-preference-changed', { detail: { accent, voiceId } }));
}

export function getTtsUrl(text: string, accent: SupportedAccent = 'us'): string {
  const voice = getPreferredVoice(accent);
  return `/api/tts?text=${encodeURIComponent(text.trim())}&accent=${accent}&voice=${encodeURIComponent(voice)}`;
}

// ─── IN-MEMORY AUDIO POOL & PRE-FETCH CACHE ──────────────────────────────
const MAX_CACHE_SIZE = 50;
const audioCache = new Map<string, HTMLAudioElement>();

function getCacheKey(text: string, accent: string, voice: string): string {
  return `${accent}:${voice}:${text.trim().toLowerCase()}`;
}

/**
 * Pre-fetches an audio file in the background so it plays with 0ms delay when clicked
 */
export function prefetchTtsAudio(text: string, accent: SupportedAccent = 'us'): void {
  if (typeof window === 'undefined' || !text || text.length > 500) return;
  if (getTtsEngine() === 'browser') return; // Browser speech doesn't need prefetch

  const voice = getPreferredVoice(accent);
  const key = getCacheKey(text, accent, voice);

  if (audioCache.has(key)) return;

  try {
    const url = getTtsUrl(text, accent);
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;

    // Prune oldest if cache is full
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = audioCache.keys().next().value;
      if (firstKey) audioCache.delete(firstKey);
    }

    audioCache.set(key, audio);
    audio.load();
  } catch (_) {
    // Ignore prefetch errors silently
  }
}

/**
 * Native Browser Web Speech API (0ms instant playback)
 */
export function playSpeechSynthesis(
  text: string,
  rate: number = 1.0,
  accent: SupportedAccent = 'us',
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return () => {};
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = accent === 'vi' ? 'vi-VN' : (accent === 'uk' ? 'en-GB' : (accent === 'au' ? 'en-AU' : 'en-US'));
    utterance.rate = Math.max(0.7, Math.min(rate, 1.5));

    const voices = window.speechSynthesis.getVoices();
    const targetLang = utterance.lang.toLowerCase();
    const isVi = accent === 'vi';
    
    // Pick the most natural voice available on OS (Google, Microsoft Neural, Apple)
    const bestVoice = voices.find(v => 
      v.lang.toLowerCase().replace('_', '-') === targetLang && 
      (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('Neural') || v.name.includes('HoaiMy') || v.name.includes('NamMinh') || v.name.includes('Vietnamese'))
    ) || voices.find(v => v.lang.toLowerCase().startsWith(isVi ? 'vi' : 'en') && (v.name.includes('Natural') || v.name.includes('Google')))
      || voices.find(v => v.lang.toLowerCase().replace('_', '-') === targetLang);

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      onEnd?.();
    };
  } catch (_) {
    onEnd?.();
    return () => {};
  }
}

export interface PlaySmartAudioOptions {
  accent?: SupportedAccent;
  rate?: number;
  onLoading?: () => void;
  onPlaying?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

let activeAudioInstance: HTMLAudioElement | null = null;
let activeStopFn: (() => void) | null = null;

/**
 * Smart Audio Playback:
 * - Checks engine setting: if 'browser', speaks with 0ms delay via Web Speech.
 * - If 'ai': uses preloaded Audio instance or creates one, with automatic fallback to Web Speech on network error.
 */
export function playSmartAudio(
  text: string,
  options: PlaySmartAudioOptions = {}
): () => void {
  if (!text || typeof window === 'undefined') return () => {};

  // Stop any currently playing audio
  if (activeStopFn) {
    activeStopFn();
    activeStopFn = null;
  }
  if (activeAudioInstance) {
    activeAudioInstance.pause();
    activeAudioInstance.currentTime = 0;
    activeAudioInstance = null;
  }

  const {
    accent = 'us',
    rate = 1.0,
    onLoading,
    onPlaying,
    onEnd,
    onError
  } = options;

  const engine = getTtsEngine();

  // 1. FAST PATH: Browser Web Speech API (0ms delay)
  if (engine === 'browser') {
    onPlaying?.();
    const stopFn = playSpeechSynthesis(text, rate, accent, onEnd);
    activeStopFn = stopFn;
    return stopFn;
  }

  // 2. AI VOICE PATH (Preloaded Cache or Fresh Fetch)
  const voice = getPreferredVoice(accent);
  const cacheKey = getCacheKey(text, accent, voice);

  let audio = audioCache.get(cacheKey);
  const wasCached = Boolean(audio && audio.readyState >= 2);

  if (!audio) {
    const url = getTtsUrl(text, accent);
    audio = new Audio(url);
    audioCache.set(cacheKey, audio);
  }

  activeAudioInstance = audio;
  audio.playbackRate = rate;

  let hasStartedPlaying = false;
  if (!wasCached) {
    onLoading?.();
  }

  const handlePlaying = () => {
    hasStartedPlaying = true;
    onPlaying?.();
  };

  const handleEnded = () => {
    activeAudioInstance = null;
    onEnd?.();
  };

  const handleFallback = () => {
    activeAudioInstance = null;
    playSpeechSynthesis(text, rate, accent, onEnd);
    onError?.();
  };

  audio.onplaying = handlePlaying;
  audio.onended = handleEnded;
  audio.onerror = handleFallback;

  // Safety fallback if AI audio hangs for more than 4 seconds
  const timeoutId = setTimeout(() => {
    if (!hasStartedPlaying && activeAudioInstance === audio) {
      console.warn('[TTS] Audio load timeout, falling back to browser speech synthesis');
      handleFallback();
    }
  }, 4000);

  audio.play().then(() => {
    if (!hasStartedPlaying) {
      handlePlaying();
    }
  }).catch(() => {
    clearTimeout(timeoutId);
    handleFallback();
  });

  const stop = () => {
    clearTimeout(timeoutId);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (activeAudioInstance === audio) {
      activeAudioInstance = null;
    }
    onEnd?.();
  };

  activeStopFn = stop;
  return stop;
}
