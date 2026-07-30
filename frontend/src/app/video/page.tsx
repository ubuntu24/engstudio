'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchBilingualSubtitles } from '@/lib/api';
import { SubtitleItem } from '@/types';
import {
  Video,
  Search,
  Download,
  Play,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Languages,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';

export default function VideoPage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoId, setVideoId] = useState('');
  const [tiktokId, setTiktokId] = useState<string>('');
  const [platform, setPlatform] = useState('youtube');
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [activeSubIndex, setActiveSubIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const [showVideoCaption, setShowVideoCaption] = useState<boolean>(true);

  const subtitlesRef = useRef<SubtitleItem[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html5VideoRef = useRef<HTMLVideoElement>(null);

  const [selectedWord, setSelectedWord] = useState<{ word: string; meaning: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const sampleVideos = [
    { name: '🎵 Never Gonna Give You Up (YouTube)', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { name: '🎵 TikTok Video Mẫu', url: 'https://www.tiktok.com/@ehome.englishcenter/video/7535440039296109842' },
    { name: '🗣️ English Daily Conversation', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' }
  ];

  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (videoId && platform === 'youtube' && iframeRef.current) {
      interval = setInterval(() => {
        try {
          if (iframeRef.current?.contentWindow) {
            // SECURITY FIX: Use specific target origin instead of wildcard '*'
            iframeRef.current.contentWindow.postMessage('{"event":"listening","id":1}', 'https://www.youtube.com');
          }
        } catch (e) {}
      }, 500);
    }

    const handleWindowMessage = (event: MessageEvent) => {
      // SECURITY FIX: Validate origin before processing messages
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        let data = event.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        if (data && data.event === 'infoDelivery' && data.info && data.info.currentTime !== undefined) {
          const currentTime = data.info.currentTime;
          updateActiveSubtitle(currentTime);
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [videoId, platform]);

  const updateActiveSubtitle = (currentTime: number) => {
    const currentSubs = subtitlesRef.current;
    if (!currentSubs || currentSubs.length === 0) return;

    const foundIdx = currentSubs.findIndex((sub) => {
      const start = sub.start || 0;
      const duration = sub.duration || 3;
      return currentTime >= start && currentTime <= start + duration;
    });

    if (foundIdx !== -1) {
      setActiveSubIndex(foundIdx);
    }
  };

  const handleLoadSubtitles = async () => {
    if (!videoUrl.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    setSubtitles([]);
    setActiveSubIndex(0);
    setVideoReady(false);

    const result = await fetchBilingualSubtitles(videoUrl);
    setLoading(false);

    if (result.subtitles && result.subtitles.length > 0) {
      setVideoTitle(result.title || 'Video Phụ Đề Song Ngữ');
      setVideoId(result.video_id || '');
      setTiktokId((result as any).tiktok_id || '');
      setPlatform(result.platform || 'youtube');
      setStreamUrl(result.stream_url || '');
      setSubtitles(result.subtitles);
      setVideoReady(true);
    } else {
      setErrorMessage(result.error || 'Không thể lấy phụ đề song ngữ từ Video này.');
    }
  };

  const handleSeek = (seconds: number) => {
    if (platform === 'youtube' && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true],
        }),
        'https://www.youtube.com'  // SECURITY FIX: specific target origin
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: [],
        }),
        'https://www.youtube.com'  // SECURITY FIX: specific target origin
      );
    } else if (html5VideoRef.current) {
      html5VideoRef.current.currentTime = seconds;
      html5VideoRef.current.play();
    }
  };

  const activeSub = subtitles[activeSubIndex] || null;

  const handleDownloadSRT = () => {
    if (!subtitles.length) return;

    let srtContent = '';
    subtitles.forEach((sub, idx) => {
      const start = formatSRTTime(sub.start || 0);
      const end = formatSRTTime((sub.start || 0) + (sub.duration || 3));
      srtContent += `${idx + 1}\n${start} --> ${end}\n${sub.text}\n${sub.translation || ''}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoTitle.replace(/[^a-zA-Z0-9]/g, '_')}_subtitles.srt`;
    link.click();
  };

  const formatSRTTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const handleWordClick = (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (!cleanWord) return;

    setSelectedWord({
      word: cleanWord,
      meaning: `Từ vựng trong phụ đề video. Phát âm chuẩn bản ngữ.`
    });
    setIsSaved(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Top Header */}
      <div className="border-b border-border-main pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-main tracking-tight flex items-center gap-3">
          <Video className="w-9 h-9 text-primary-400" />
          Trình Phát Video Phụ Đề Song Ngữ (YouTube & TikTok)
        </h1>
        <p className="text-base text-text-muted mt-1 font-medium">
          Khung video cực to, rõ nét với chữ phụ đề lớn dễ nhìn, tự động khớp 100% thời gian thực
        </p>
      </div>

      {/* Input URL Bar */}
      <div className="p-6 rounded-3xl bg-bg-card border border-border-main space-y-5 shadow-xl">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-text-muted">
            Dán đường dẫn Video YouTube hoặc TikTok:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... hoặc https://www.tiktok.com/@..."
              className="flex-1 px-4 py-3.5 rounded-2xl bg-bg-surface border border-border-main text-text-main placeholder-slate-600 focus:outline-none focus:border-primary-500 text-sm font-medium"
            />
            <button
              onClick={() => handleLoadSubtitles()}
              disabled={loading}
              className="px-7 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-text-primary-fg font-black text-sm shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />} Tải Video & Phụ Đề
            </button>
          </div>
        </div>

        {/* Quick Sample Links */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-text-muted font-semibold shrink-0">Video Mẫu:</span>
          {sampleVideos.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setVideoUrl(sample.url);
                handleLoadSubtitles();
              }}
              className="px-3.5 py-2 rounded-xl bg-bg-surface border border-border-main hover:border-primary-500/50 text-text-muted hover:text-text-main transition-all whitespace-nowrap shrink-0 font-medium cursor-pointer"
            >
              {sample.name}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Main Player & Subtitles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Video Player (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-bg-surface border border-border-main shadow-2xl flex items-center justify-center">
            {videoReady && videoId && platform === 'youtube' ? (
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                title={videoTitle}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : videoReady && streamUrl ? (
              <video
                ref={html5VideoRef}
                src={streamUrl}
                controls
                autoPlay
                playsInline
                onTimeUpdate={(e) => updateActiveSubtitle(e.currentTarget.currentTime)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto text-primary-400">
                  <Play className="w-8 h-8 ml-1" />
                </div>
                <p className="text-sm font-semibold text-text-muted max-w-sm mx-auto">
                  Dán đường dẫn Video ở trên và bấm &quot;Tải Video & Phụ Đề&quot; để bắt đầu trải nghiệm xem video song ngữ.
                </p>
              </div>
            )}

            {/* Subtitle Overlay Bar on Player */}
            {videoReady && showVideoCaption && activeSub && (
              <div className="absolute bottom-2 inset-x-2 sm:bottom-6 sm:inset-x-6 z-20 pointer-events-none text-center">
                <div className="inline-block max-w-2xl px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl bg-bg-card/90 backdrop-blur-md border border-border-main shadow-2xl space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-lg font-bold tracking-wide text-primary-500">
                    {activeSub.text}
                  </p>
                  {activeSub.translation && (
                    <p className="text-[10px] sm:text-sm text-text-muted font-medium italic">
                      {activeSub.translation}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Video Title & Actions Bar */}
          {videoReady && (
            <div className="p-6 rounded-3xl bg-bg-card border border-border-main space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm sm:text-lg font-bold text-text-main leading-snug line-clamp-1 sm:line-clamp-2" title={videoTitle}>
                    {videoTitle}
                  </h2>
                  <p className="text-xs text-text-muted mt-1 font-medium">
                    Tổng số {subtitles.length} câu thoại song ngữ được đồng bộ
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowVideoCaption(!showVideoCaption)}
                    className="px-3.5 py-2 rounded-xl bg-bg-surface border border-border-main text-xs font-semibold text-text-muted hover:text-text-main transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {showVideoCaption ? <EyeOff className="w-4 h-4 text-primary-400" /> : <Eye className="w-4 h-4 text-text-muted" />}
                    {showVideoCaption ? 'Ẩn Phụ Đề Trên Video' : 'Hiện Phụ Đề Trên Video'}
                  </button>

                  <button
                    onClick={handleDownloadSRT}
                    className="px-3.5 py-2 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 border border-primary-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Tải File SRT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Subtitle Transcript Stream (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-3xl bg-bg-card border border-border-main space-y-4 shadow-xl flex flex-col h-[540px]">
            <div className="flex items-center justify-between border-b border-border-main pb-3">
              <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                <Languages className="w-4 h-4 text-primary-400" />
                Danh Sách Câu Thoại
              </h3>
              <span className="text-xs font-bold text-primary-400 bg-bg-surface-hover px-2.5 py-0.5 rounded-full border border-border-hover">
                {subtitles.length} câu
              </span>
            </div>

            {/* Search Filter Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm từ vựng trong phụ đề..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-surface border border-border-main text-xs text-text-main placeholder-slate-600 focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Subtitle Lines Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {subtitles.length > 0 ? (
                subtitles
                  .filter((s) => !searchQuery || s.text.toLowerCase().includes(searchQuery.toLowerCase()) || (s.translation && s.translation.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((sub, idx) => {
                    const isActive = idx === activeSubIndex;
                    return (
                      <div
                        id={`sub-item-${idx}`}
                        key={idx}
                        onClick={() => {
                          setActiveSubIndex(idx);
                          handleSeek(sub.start || 0);
                        }}
                        className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-bg-surface-hover border-border-hover text-text-main shadow-md'
                            : 'bg-bg-surface border-border-main text-text-muted hover:bg-bg-surface-hover hover:text-text-main'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-text-muted font-mono mb-1">
                          <span className={isActive ? 'text-primary-400 font-bold' : ''}>
                            {formatSRTTime(sub.start || 0).split(',')[0]}
                          </span>
                          {isActive && <span className="text-[10px] font-bold text-primary-400 uppercase">Đang phát</span>}
                        </div>
                        <p className="text-xs font-bold leading-relaxed">
                          {sub.text.split(' ').map((word, wIdx) => (
                            <span
                              key={wIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWordClick(word);
                              }}
                              className="hover:text-primary-400 hover:underline cursor-pointer"
                            >
                              {word}{' '}
                            </span>
                          ))}
                        </p>
                        {sub.translation && (
                          <p className="text-[11px] text-text-muted italic mt-1 font-medium">
                            {sub.translation}
                          </p>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="h-full flex items-center justify-center text-center p-6 text-xs text-slate-500 font-medium">
                  Chưa có danh sách phụ đề. Vui lòng tải video ở khung bên trái.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
