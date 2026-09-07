"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Volume2, Square, Sparkles, Check, Mic, Zap, Cpu } from "lucide-react";
import {
  VoiceItem,
  VoicesResponse,
  TtsEngine,
  getTtsEngine,
  setTtsEngine,
  getPreferredVoice,
  setPreferredVoice,
  playSpeechSynthesis
} from "@/lib/tts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceSettingsModal({ isOpen, onClose }: Props) {
  const [engine, setEngineState] = useState<TtsEngine>('ai');
  const [voicesData, setVoicesData] = useState<VoicesResponse | null>(null);
  const [filter, setFilter] = useState<'all' | 'us' | 'uk' | 'au' | 'vi'>('all');
  const [loading, setLoading] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);

  const [usVoice, setUsVoice] = useState<string>('rachel');
  const [ukVoice, setUkVoice] = useState<string>('george');
  const [auVoice, setAuVoice] = useState<string>('natasha');
  const [viVoice, setViVoice] = useState<string>('giang');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEngineState(getTtsEngine());
      setUsVoice(getPreferredVoice('us'));
      setUkVoice(getPreferredVoice('uk'));
      setAuVoice(getPreferredVoice('au'));
      setViVoice(getPreferredVoice('vi'));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (stopSpeechRef.current) {
        stopSpeechRef.current();
        stopSpeechRef.current = null;
      }
      setCurrentPlayingId(null);
      return;
    }

    setLoading(true);
    fetch('/api/tts/voices')
      .then((res) => res.json())
      .then((data: VoicesResponse) => {
        setVoicesData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load voices:', err);
        setLoading(false);
      });
  }, [isOpen]);

  const handleSwitchEngine = (newEngine: TtsEngine) => {
    setEngineState(newEngine);
    setTtsEngine(newEngine);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (stopSpeechRef.current) {
      stopSpeechRef.current();
      stopSpeechRef.current = null;
    }
    setCurrentPlayingId(null);
  };

  const handlePlaySample = (voice: VoiceItem) => {
    if (currentPlayingId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (stopSpeechRef.current) {
        stopSpeechRef.current();
        stopSpeechRef.current = null;
      }
      setCurrentPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (stopSpeechRef.current) {
      stopSpeechRef.current();
      stopSpeechRef.current = null;
    }

    setCurrentPlayingId(voice.id);

    if (engine === 'browser') {
      const stopFn = playSpeechSynthesis(voice.sample, 1.0, voice.accent, () => {
        setCurrentPlayingId(null);
      });
      stopSpeechRef.current = stopFn;
      return;
    }

    const audioUrl = `/api/tts?text=${encodeURIComponent(voice.sample)}&accent=${voice.accent}&voice=${voice.id}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.play().catch((e) => {
      console.error('Audio sample playback error:', e);
      // Fallback
      playSpeechSynthesis(voice.sample, 1.0, voice.accent, () => {
        setCurrentPlayingId(null);
      });
    });

    audio.onended = () => {
      setCurrentPlayingId(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setCurrentPlayingId(null);
      audioRef.current = null;
    };
  };

  const handleSelectVoice = (voice: VoiceItem) => {
    setPreferredVoice(voice.accent, voice.id);
    if (voice.accent === 'uk') {
      setUkVoice(voice.id);
    } else if (voice.accent === 'au') {
      setAuVoice(voice.id);
    } else if (voice.accent === 'vi') {
      setViVoice(voice.id);
    } else {
      setUsVoice(voice.id);
    }
  };

  if (!isOpen) return null;

  const filteredVoices = (voicesData?.voices || []).filter((v) => {
    if (filter === 'all') return true;
    return v.accent === filter;
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-bg-surface border border-border-main rounded-3xl shadow-2xl overflow-hidden text-text-main"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border-main bg-bg-base/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 shadow-sm">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Cài Đặt Giọng Đọc & Tốc Độ
              </h2>
              <p className="text-xs text-text-muted">
                Tối ưu hóa độ trễ âm thanh và tùy chỉnh chất giọng phát âm
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-bg-surface-hover transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Switcher (⚡ Instant 0ms vs 🎙️ AI Voice) */}
        <div className="p-4 sm:p-5 bg-bg-base/40 border-b border-border-main">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
            Chế độ phát âm thanh:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Browser Instant */}
            <button
              onClick={() => handleSwitchEngine('browser')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                engine === 'browser'
                  ? 'bg-amber-500/10 border-amber-500 text-text-main shadow-md ring-1 ring-amber-500/50'
                  : 'bg-bg-surface border-border-main hover:border-border-hover text-text-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-sm flex items-center gap-1.5 text-amber-500">
                  <Zap className="w-4 h-4 fill-amber-500" />
                  ⚡ Siêu Tốc (0ms Delay)
                </span>
                {engine === 'browser' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <p className="text-xs leading-relaxed">
                Dùng giọng đọc gốc của thiết bị (Chrome / Edge / Windows). Phản hồi <strong>ngay lập tức khi bấm</strong>, không tốn dung lượng mạng.
              </p>
            </button>

            {/* Option 2: AI Neural Voice */}
            <button
              onClick={() => handleSwitchEngine('ai')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                engine === 'ai'
                  ? 'bg-primary-500/10 border-primary-500 text-text-main shadow-md ring-1 ring-primary-500/50'
                  : 'bg-bg-surface border-border-main hover:border-border-hover text-text-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-sm flex items-center gap-1.5 text-primary-500">
                  <Sparkles className="w-4 h-4" />
                  🎙️ Giọng AI Tự Nhiên (Edge / ElevenLabs)
                </span>
                {engine === 'ai' && (
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                )}
              </div>
              <p className="text-xs leading-relaxed">
                Giọng người đọc bản xứ giàu cảm xúc. Hệ thống <strong>tự động tải trước (pre-fetch)</strong> trong nền để bấm là phát ngay.
              </p>
            </button>
          </div>
        </div>

        {/* Engine Banner & Filter Bar */}
        <div className="px-5 sm:px-6 py-3 bg-bg-base/30 border-b border-border-main flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-medium">Trạng thái:</span>
            {engine === 'browser' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                <Zap className="w-3.5 h-3.5" />
                Web Speech API (Phát tức thì)
              </span>
            ) : voicesData?.has_elevenlabs_key ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ElevenLabs Studio AI (Bản Quyền)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20">
                <Cpu className="w-3.5 h-3.5" />
                Microsoft Neural Studio (Kèm Pre-fetch Tự Động)
              </span>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-surface border border-border-main">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter('us')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                filter === 'us'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              🇺🇸 Mỹ (US)
            </button>
            <button
              onClick={() => setFilter('uk')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                filter === 'uk'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              🇬🇧 Anh (UK)
            </button>
            <button
              onClick={() => setFilter('au')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                filter === 'au'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              🇦🇺 Úc (AU)
            </button>
            <button
              onClick={() => setFilter('vi')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                filter === 'vi'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              🇻🇳 Việt (VI)
            </button>
          </div>
        </div>

        {/* Current Active Voices Summary */}
        <div className="px-5 sm:px-6 py-2.5 bg-primary-500/5 border-b border-border-main flex items-center justify-between text-xs font-semibold flex-wrap gap-2">
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">US 🇺🇸:</span>
              <span className="font-bold text-primary-500 uppercase">{usVoice}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">UK 🇬🇧:</span>
              <span className="font-bold text-primary-500 uppercase">{ukVoice}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">VI 🇻🇳:</span>
              <span className="font-bold text-emerald-500 uppercase">{viVoice}</span>
            </div>
          </div>
          <span className="text-[11px] text-text-muted hidden sm:inline">
            Tự động lưu vào trình duyệt của bạn
          </span>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-text-muted">
              <div className="w-8 h-8 mx-auto border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
              Đang tải danh sách giọng đọc...
            </div>
          ) : (
            filteredVoices.map((voice) => {
              const isSelected =
                (voice.accent === 'uk' && ukVoice === voice.id) ||
                (voice.accent === 'au' && auVoice === voice.id) ||
                (voice.accent === 'vi' && viVoice === voice.id) ||
                (voice.accent === 'us' && usVoice === voice.id);
              const isPlaying = currentPlayingId === voice.id;

              return (
                <div
                  key={voice.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-primary-500/5 border-primary-500/40 shadow-sm'
                      : 'bg-bg-base/40 border-border-main hover:border-border-hover'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-lg">{voice.flag}</span>
                      <span className="font-black text-sm tracking-tight text-text-main">
                        {voice.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-bg-surface border border-border-main text-text-muted">
                        {voice.gender === 'female' ? 'Nữ' : 'Nam'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-500 border border-primary-500/20">
                        {voice.tag}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đang dùng
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted line-clamp-1 mb-1.5">
                      {voice.description}
                    </p>
                    <p className="text-[11px] text-text-muted/80 italic line-clamp-1">
                      &quot;{voice.sample}&quot;
                    </p>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Play Sample */}
                    <button
                      onClick={() => handlePlaySample(voice)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-colors cursor-pointer active:scale-95 ${
                        isPlaying
                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : 'bg-bg-surface border-border-main text-text-main hover:border-primary-500 hover:text-primary-500'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Dừng
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          Nghe thử
                        </>
                      )}
                    </button>

                    {/* Select button */}
                    <button
                      onClick={() => handleSelectVoice(voice)}
                      disabled={isSelected}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500 cursor-default'
                          : 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600 shadow-sm'
                      }`}
                    >
                      {isSelected ? 'Đã chọn' : `Chọn cho ${voice.accent.toUpperCase()}`}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-border-main bg-bg-base/60 flex items-center justify-between text-xs text-text-muted">
          <span>Khuyên dùng: Chọn <strong>⚡ Siêu Tốc</strong> nếu bạn muốn phát tức thì không độ trễ.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-bg-surface border border-border-main hover:border-border-hover text-text-main transition-colors cursor-pointer"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
