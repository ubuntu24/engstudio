from flask import Blueprint, request, jsonify, Response
import os
import re
import json
import sqlite3
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
from backend.core.db import DB_PATH
from backend.utils.validators import is_allowed_video_url
from backend.services.video_service import (
    fast_fetch_video_info,
    extract_vid_helper as _extract_vid_helper,
    init_bilingual_cache as _init_bilingual_cache,
    get_from_transcript_cache_helper as _get_from_transcript_cache_helper,
    extract_subtitles_via_ytdlp as _extract_subtitles_via_ytdlp,
    auto_transcribe_audio_helper
)
from backend.services.translation_service import smart_format_and_translate_lines
from backend.services.ai_manager import VIDEO_TOOLS_AVAILABLE

video_bp = Blueprint('video', __name__)

@video_bp.route('/api/video/stream')
def stream_video():
    url = request.args.get('url', '').strip()
    if not url or not is_allowed_video_url(url):
        return "", 404

    stream_url = None
    if 'tiktok.com' in url.lower():
        import requests
        try:
            res = requests.get("https://tikwm.com/api/", params={"url": url}, timeout=10).json()
            if res.get('code') == 0 and res.get('data', {}).get('play'):
                stream_url = res['data']['play']
        except Exception as e:
            print("tikwm stream error:", e)

    if not stream_url:
        ydl_opts = {'quiet': True, 'format': 'best[ext=mp4]/best'}
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                stream_url = info.get('url')
                if not stream_url and info.get('entries'):
                    stream_url = info['entries'][0].get('url')
        except Exception as e:
            return f"Stream error: {e}", 500

    if not stream_url:
        return "Could not extract video stream", 404

    import requests
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/' if 'tiktok' in url.lower() else ''
    }
    
    range_header = request.headers.get('Range')
    if range_header:
        headers['Range'] = range_header

    try:
        r = requests.get(stream_url, headers=headers, stream=True, timeout=15)
        
        def generate():
            for chunk in r.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk

        resp = Response(generate(), status=r.status_code, content_type=r.headers.get('content-type', 'video/mp4'))
        
        for h in ['Content-Range', 'Accept-Ranges', 'Content-Length']:
            if h in r.headers:
                resp.headers[h] = r.headers[h]
        return resp
    except Exception as e:
        return f"Proxy error: {e}", 500

@video_bp.route('/api/video/progress')
def get_video_progress():
    url_or_id = request.args.get('url', '').strip()
    if not url_or_id or not is_allowed_video_url(url_or_id):
        return jsonify({'status': 'unknown', 'percent': '0%', 'speed': '0MiB/s'})
    
    video_id = _extract_vid_helper(url_or_id)
    if not video_id:
        return jsonify({'status': 'unknown', 'percent': '0%', 'speed': '0MiB/s'})
        
    path = f"/tmp/dl_progress_{video_id}.json"
    if os.path.exists(path):
        try:
            with open(path, 'r') as f:
                data = json.load(f)
                return jsonify(data)
        except:
            pass
    return jsonify({'status': 'unknown', 'percent': '0%', 'speed': '0MiB/s'})

@video_bp.route('/api/video/bilingual')
def get_video_bilingual():
    if not VIDEO_TOOLS_AVAILABLE:
        return jsonify({'error': 'Thư viện yt-dlp, youtube-transcript-api, deep-translator chưa sẵn sàng.'}), 503

    url_or_id = request.args.get('url', '').strip()
    if not is_allowed_video_url(url_or_id):
        return jsonify({'error': 'Vì lý do bảo mật, hệ thống chỉ hỗ trợ xử lý link từ chính chủ YouTube và TikTok.'}), 400

    video_id = _extract_vid_helper(url_or_id)
    if not video_id or len(video_id) != 11:
        return jsonify({'error': 'URL hoặc ID video không hợp lệ.'}), 400

    platform = 'youtube'
    if any(x in url_or_id.lower() for x in ['tiktok.com', '.mp4']) or not (re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id) or any(x in url_or_id.lower() for x in ['youtube.com', 'youtu.be'])):
        platform = 'html5'

    is_vip = request.args.get('vip') == '1'
    cache_key = f"{video_id}_vip" if is_vip else video_id

    stream_url = ''
    if platform == 'html5' or any(x in url_or_id.lower() for x in ['tiktok.com', '.mp4']):
        import urllib.parse
        stream_url = f"/api/video/stream?url={urllib.parse.quote(url_or_id)}"

    _init_bilingual_cache()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT title, channel, duration, lines_json FROM bilingual_video_cache WHERE video_id = ?", (cache_key,))
    row = cur.fetchone()
    if row:
        conn.close()
        return jsonify({
            'video_id': video_id,
            'original_url': url_or_id,
            'platform': platform,
            'stream_url': stream_url,
            'title': row[0],
            'channel': row[1],
            'duration': row[2],
            'lines': json.loads(row[3]),
            'cached': True
        })
    conn.close()

    title, channel, duration = fast_fetch_video_info(url_or_id, video_id, platform)

    if platform == 'html5':
        raw_lines = _get_from_transcript_cache_helper(video_id)
        if not raw_lines:
            try:
                with open(f"/tmp/dl_progress_{video_id}.json", "w") as fp:
                    json.dump({"status": "finding_subs", "percent": "-", "speed": "-"}, fp)
            except: pass
            
            raw_lines = _extract_subtitles_via_ytdlp(video_id, url_or_id)
            if not raw_lines:
                raw_lines = auto_transcribe_audio_helper(video_id, url_or_id)
                if raw_lines:
                    try:
                        TRANSCRIPT_DB_PATH = os.path.join(os.path.dirname(DB_PATH), "transcript_cache.db")
                        conn_tc = sqlite3.connect(TRANSCRIPT_DB_PATH)
                        conn_tc.execute(
                            "INSERT OR REPLACE INTO transcript_cache (video_id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                            (video_id, json.dumps(raw_lines, ensure_ascii=False))
                        )
                        conn_tc.commit()
                        conn_tc.close()
                    except Exception:
                        pass
            if not raw_lines:
                return jsonify({
                    'error': f'Video từ {channel} ({title}) không tìm thấy phụ đề hoặc giọng nói tiếng Anh.',
                    'platform': 'html5',
                    'video_id': video_id,
                    'original_url': url_or_id,
                    'title': title,
                    'channel': channel,
                    'lines': [],
                    'cached': False
                }), 404

    if platform != 'html5':
        raw_lines = _get_from_transcript_cache_helper(video_id)
    if not raw_lines and platform == 'youtube':
        api_kwargs = {}
        if os.path.exists("cookies.txt"):
            api_kwargs["cookies"] = "cookies.txt"
        api = YouTubeTranscriptApi(**api_kwargs)
        try:
            transcript = api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
            raw_lines = [{'start': getattr(i, 'start', 0.0) if not isinstance(i, dict) else i.get('start', 0.0),
                          'duration': getattr(i, 'duration', 0.0) if not isinstance(i, dict) else i.get('duration', 0.0),
                          'text': getattr(i, 'text', '') if not isinstance(i, dict) else i.get('text', '')} for i in transcript]
        except Exception as e:
            try:
                t_list = api.list(video_id)
                t = next(iter(t_list._manually_created_transcripts.values()), None) or \
                    next(iter(t_list._generated_transcripts.values()), None)
                if not t:
                    return jsonify({'error': 'Video này không có phụ đề trên YouTube.', 'video_id': video_id, 'title': title, 'platform': platform, 'original_url': url_or_id}), 404
                transcript = t.translate('en').fetch()
                raw_lines = [{'start': getattr(i, 'start', 0.0) if not isinstance(i, dict) else i.get('start', 0.0),
                              'duration': getattr(i, 'duration', 0.0) if not isinstance(i, dict) else i.get('duration', 0.0),
                              'text': getattr(i, 'text', '') if not isinstance(i, dict) else i.get('text', '')} for i in transcript]
            except Exception as e2:
                raw_lines = _extract_subtitles_via_ytdlp(video_id, f"https://www.youtube.com/watch?v={video_id}")
                if not raw_lines:
                    err_str = str(e2)
                    if any(x in err_str for x in ['blocking', 'IpBlocked', 'RequestBlocked', '429', 'Could not retrieve a transcript']):
                        return jsonify({
                            'error': f'YouTube đang chặn tải phụ đề từ IP máy chủ (HTTP 429 / Blocked). Hãy chọn nút "⚡ Nhận Diện Âm Thanh AI & Dịch Song Ngữ Ngay" bên dưới hoặc Dán phụ đề.',
                            'ip_blocked': True,
                            'video_id': video_id,
                            'original_url': url_or_id,
                            'platform': platform,
                            'title': title,
                            'channel': channel
                        }), 429
                    return jsonify({'error': f'Không thể lấy phụ đề từ YouTube: {err_str}', 'video_id': video_id, 'title': title, 'platform': platform, 'original_url': url_or_id}), 404

    lines = []
    if raw_lines:
        for item in raw_lines:
            text = item.get('text', '') or item.get('en', '')
            start = float(item.get('start', 0.0))
            dur = float(item.get('duration', 0.0))
            text = re.sub(r'\s+', ' ', text).strip()
            if text and not text.startswith('['):
                lines.append({'start': start, 'duration': dur, 'en': text})

    if not lines:
        return jsonify({'error': 'Phụ đề video rỗng.', 'video_id': video_id, 'title': title, 'platform': platform, 'original_url': url_or_id}), 404

    lines = smart_format_and_translate_lines(lines, is_vip=is_vip)

    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT OR REPLACE INTO bilingual_video_cache (video_id, title, channel, duration, lines_json, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
        (cache_key, title, channel, duration, json.dumps(lines, ensure_ascii=False))
    )
    conn.commit()
    conn.close()

    try:
        TRANSCRIPT_DB_PATH = os.path.join(os.path.dirname(DB_PATH), "transcript_cache.db")
        conn = sqlite3.connect(TRANSCRIPT_DB_PATH)
        conn.execute(
            "INSERT OR REPLACE INTO transcript_cache (video_id, data) VALUES (?, ?)",
            (video_id, json.dumps([{'start': l['start'], 'duration': l['duration'], 'text': l['en']} for l in lines], ensure_ascii=False))
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    return jsonify({
        'video_id': video_id,
        'original_url': url_or_id,
        'platform': platform,
        'stream_url': stream_url,
        'title': title,
        'channel': channel,
        'duration': duration,
        'lines': lines,
        'cached': False
    })

@video_bp.route('/api/video/bilingual_custom', methods=['POST'])
def post_video_bilingual_custom():
    data = request.get_json(silent=True) or {}
    video_id = _extract_vid_helper(data.get('video_id', ''))
    raw_text = (data.get('subtitles') or '').strip()
    title = (data.get('title') or f"Video {video_id}").strip()
    channel = (data.get('channel') or "YouTube").strip()

    if not video_id or len(video_id) != 11:
        return jsonify({'error': 'ID video không hợp lệ.'}), 400
    if not raw_text:
        return jsonify({'error': 'Vui lòng nhập hoặc dán nội dung phụ đề.'}), 400

    lines = []
    srt_blocks = re.split(r'\n\s*\n', raw_text)
    for block in srt_blocks:
        b_lines = [l.strip() for l in block.split('\n') if l.strip()]
        if len(b_lines) >= 2:
            ts_m = re.search(r'(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})', block)
            if ts_m:
                def parse_ts(t_str):
                    parts = re.split(r'[:,\.]', t_str)
                    return int(parts[0])*3600 + int(parts[1])*60 + int(parts[2]) + int(parts[3])/1000.0
                start = parse_ts(ts_m.group(1))
                end = parse_ts(ts_m.group(2))
                text_lines = [l for l in b_lines if not re.match(r'^\d+$', l) and '-->' not in l]
                text = " ".join(text_lines).strip()
                if text:
                    lines.append({'start': start, 'duration': max(0.5, end - start), 'en': text})

    if not lines:
        raw_lines = [l.strip() for l in raw_text.split('\n') if l.strip() and not l.strip().startswith('[')]
        t_sec = 0.0
        for l in raw_lines:
            lines.append({'start': t_sec, 'duration': 4.0, 'en': l})
            t_sec += 4.0

    if not lines:
        return jsonify({'error': 'Không thể phân tích văn bản phụ đề.'}), 400

    lines = smart_format_and_translate_lines(lines, is_vip=request.json.get('vip', False))
    cache_key = f"{video_id}_vip" if request.json.get('vip', False) else video_id
    
    _init_bilingual_cache()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT OR REPLACE INTO bilingual_video_cache (video_id, title, channel, duration, lines_json, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
        (cache_key, title, channel, 0, json.dumps(lines, ensure_ascii=False))
    )
    conn.commit()
    conn.close()

    try:
        TRANSCRIPT_DB_PATH = os.path.join(os.path.dirname(DB_PATH), "transcript_cache.db")
        conn = sqlite3.connect(TRANSCRIPT_DB_PATH)
        conn.execute(
            "INSERT OR REPLACE INTO transcript_cache (video_id, data) VALUES (?, ?)",
            (video_id, json.dumps([{'start': l['start'], 'duration': l['duration'], 'text': l['en']} for l in lines], ensure_ascii=False))
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    return jsonify({
        'video_id': video_id,
        'title': title,
        'channel': channel,
        'duration': 0,
        'lines': lines,
        'cached': False
    })

@video_bp.route('/api/video/auto_transcribe', methods=['POST'])
def post_video_auto_transcribe():
    data = request.get_json(silent=True) or {}
    url = (data.get('url') or '').strip()
    if not url:
        return jsonify({'error': 'Vui lòng cung cấp link video.'}), 400

    video_id = _extract_vid_helper(url)
    os.makedirs("web_app/static/cache_audio", exist_ok=True)
    audio_tmpl = f"web_app/static/cache_audio/{video_id}.%(ext)s"

    title = f"Video {video_id}"
    channel = "Social Video"
    duration = 0
    audio_path = None
    
    if 'tiktok.com' in url.lower():
        import requests
        try:
            res = requests.get("https://tikwm.com/api/", params={"url": url}, timeout=15).json()
            if res.get('code') == 0 and res.get('data'):
                d = res['data']
                title = d.get('title', title)
                channel = d.get('author', {}).get('nickname', channel)
                duration = d.get('duration', 0)
                dl_url = d.get('music') or d.get('play')
                if dl_url:
                    r = requests.get(dl_url, stream=True)
                    audio_path = audio_tmpl % {'ext': 'mp4'}
                    with open(audio_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
        except Exception as e:
            print("tikwm download error:", e)
            audio_path = None

    if not audio_path or not os.path.exists(audio_path):
        ydl_opts = {
            'quiet': True,
            'format': 'bestaudio/best',
            'outtmpl': audio_tmpl,
            'overwrite': True
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', title)
                channel = info.get('uploader') or info.get('channel') or channel
                duration = info.get('duration', 0)
                audio_path = ydl.prepare_filename(info)
        except Exception as e:
            return jsonify({'error': f'Lỗi tải âm thanh từ URL: {e}'}), 500

    if not os.path.exists(audio_path):
        for f in os.listdir("web_app/static/cache_audio"):
            if f.startswith(video_id + "."):
                audio_path = os.path.join("web_app/static/cache_audio", f)
                break

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel('base', device='cpu', compute_type='int8')
        segments, _ = model.transcribe(audio_path, language='en', word_timestamps=True)
        raw_lines = []
        for s in segments:
            text = s.text.strip()
            if text:
                words_info = []
                if hasattr(s, 'words') and s.words:
                    for w in s.words:
                        if w.word.strip():
                            words_info.append({'w': w.word.strip(), 's': w.start, 'e': w.end})
                raw_lines.append({
                    'start': s.start,
                    'duration': max(0.5, s.end - s.start),
                    'en': text,
                    'words': words_info
                })
        try:
            if audio_path and os.path.exists(audio_path):
                os.remove(audio_path)
        except Exception:
            pass
    except Exception as e:
        try:
            if audio_path and os.path.exists(audio_path):
                os.remove(audio_path)
        except Exception:
            pass
        return jsonify({'error': f'Lỗi nhận diện âm thanh AI (Whisper): {e}'}), 500

    if not raw_lines:
        return jsonify({'error': 'Không nhận diện được giọng nói tiếng Anh nào trong video.'}), 404

    is_vip = request.json.get('vip', False)
    lines = smart_format_and_translate_lines(raw_lines, is_vip=is_vip)
    cache_key = f"{video_id}_vip" if is_vip else video_id

    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT OR REPLACE INTO bilingual_video_cache (video_id, title, channel, duration, lines_json, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
        (cache_key, title, channel, duration, json.dumps(lines, ensure_ascii=False))
    )
    conn.commit()
    conn.close()

    try:
        TRANSCRIPT_DB_PATH = os.path.join(os.path.dirname(DB_PATH), "transcript_cache.db")
        conn = sqlite3.connect(TRANSCRIPT_DB_PATH)
        conn.execute(
            "INSERT OR REPLACE INTO transcript_cache (video_id, data) VALUES (?, ?)",
            (video_id, json.dumps([{'start': l['start'], 'duration': l['duration'], 'text': l['en']} for l in lines], ensure_ascii=False))
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    return jsonify({
        'video_id': video_id,
        'original_url': url,
        'platform': 'html5',
        'title': title,
        'channel': channel,
        'duration': duration,
        'lines': lines,
        'cached': False
    })

@video_bp.route('/api/video/download_srt')
def download_video_srt():
    url_or_id = request.args.get('url', '').strip()
    video_id = _extract_vid_helper(url_or_id)
    if not video_id or len(video_id) != 11:
        return "Invalid video ID", 400

    is_vip = request.args.get('vip') == '1'
    cache_key = f"{video_id}_vip" if is_vip else video_id

    _init_bilingual_cache()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT lines_json FROM bilingual_video_cache WHERE video_id = ?", (cache_key,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return "Vui lòng bấm 'Tải video & dịch' trên giao diện trước khi tải file SRT.", 404

    lines = json.loads(row[0])
    def fmt_time(sec):
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = int(sec % 60)
        ms = int(round((sec - int(sec)) * 1000))
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    srt_out = []
    for idx, item in enumerate(lines, start=1):
        st = fmt_time(item['start'])
        ed = fmt_time(item['start'] + item['duration'])
        en = item['en']
        vi = item.get('vi', '')
        srt_out.append(f"{idx}\n{st} --> {ed}\n{en}\n" + (f"<i>{vi}</i>\n\n" if vi and vi.lower() != en.lower() else "\n"))

    content = "".join(srt_out)
    return Response(
        content,
        mimetype="application/x-subrip",
        headers={"Content-Disposition": f'attachment; filename="{video_id}_bilingual.srt"'}
    )
