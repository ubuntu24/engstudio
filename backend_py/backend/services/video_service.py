import os
import sys
import re
import json
import sqlite3
import glob
import subprocess
import hashlib
import time
from urllib.parse import urlparse, parse_qs

import requests

DB_PATH = "english_learning.db"

def fast_fetch_video_info(url_or_id: str, video_id: str, platform: str):
    """
    Siêu tốc độ (0.1 - 0.5s): Lấy thông tin tiêu đề, kênh, độ dài video. Tự động thử lại 3 lần nếu gặp sự cố mạng.
    """
    title = f"Video {video_id}"
    channel = "TikTok / Social" if platform == 'html5' else "YouTube"
    duration = 0

    if 'tiktok.com' in url_or_id.lower():
        for attempt in range(3):
            try:
                res = requests.get("https://tikwm.com/api/", params={"url": url_or_id}, timeout=4).json()
                if res.get('code') == 0 and res.get('data'):
                    d = res['data']
                    title = d.get('title', title)
                    channel = d.get('author', {}).get('nickname', channel)
                    duration = d.get('duration', 0)
                    return title, channel, duration
            except Exception:
                pass

    if platform != 'html5':
        for attempt in range(3):
            try:
                yt_url = f"https://www.youtube.com/watch?v={video_id}" if len(video_id) == 11 else url_or_id
                res = requests.get(f"https://www.youtube.com/oembed?url={yt_url}&format=json", timeout=3.5).json()
                if res:
                    title = res.get('title', title)
                    channel = res.get('author_name', channel)
                    return title, channel, duration
            except Exception:
                pass

    return title, channel, duration

def extract_vid_helper(url_or_id: str) -> str:
    url_or_id = (url_or_id or '').strip()
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id
    parsed = urlparse(url_or_id)
    if parsed.hostname in ('youtu.be', 'www.youtu.be'):
        return parsed.path[1:]
    if parsed.hostname in ('youtube.com', 'www.youtube.com', 'm.youtube.com'):
        if parsed.path == '/watch':
            qs = parse_qs(parsed.query)
            return qs.get('v', [''])[0]
        if parsed.path.startswith('/embed/'):
            return parsed.path.split('/')[2]
        if parsed.path.startswith('/v/'):
            return parsed.path.split('/')[2]
    m = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', url_or_id)
    if m and not any(x in url_or_id.lower() for x in ['tiktok.com', 'facebook.com', 'fb.watch', 'instagram.com', 'vimeo.com', '.mp4']):
        return m.group(1)
    
    clean_url = url_or_id
    if 'tiktok.com' in clean_url.lower():
        clean_url = clean_url.split('?')[0]
        
    return hashlib.md5(clean_url.encode('utf-8')).hexdigest()[:11] if clean_url else ''


def init_bilingual_cache():
    from backend.core.db import get_db_connection
    conn = get_db_connection()
    try:
        if conn.__class__.__name__ == 'PostgresConnectionWrapper':
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS bilingual_video_cache (
                    video_id TEXT PRIMARY KEY,
                    title TEXT,
                    channel TEXT,
                    duration REAL,
                    lines_json TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        else:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS bilingual_video_cache (
                    video_id TEXT PRIMARY KEY,
                    title TEXT,
                    channel TEXT,
                    duration REAL,
                    lines_json TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        conn.commit()
    except Exception as e:
        print("Error init bilingual cache:", e)
    finally:
        conn.close()


def get_from_transcript_cache_helper(video_id: str):
    try:
        from backend.core.db import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT data FROM transcript_cache WHERE video_id = ?", (video_id,))
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return json.loads(row[0])
    except Exception:
        pass
    return None


def extract_subtitles_via_ytdlp(video_id, target_url):
    try:
        temp_base = os.path.join("/tmp", f"app_sub_{video_id}")
        for f in glob.glob(temp_base + "*"):
            try:
                os.remove(f)
            except Exception:
                pass
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--write-sub", "--write-auto-sub", "--sub-lang", "en,eng-US,eng,en-US,.*",
            "--sub-format", "json3/vtt/best", "--skip-download",
            "-o", temp_base + ".%(ext)s",
            target_url
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=25)
        json3_files = glob.glob(temp_base + "*.json3")
        if json3_files:
            with open(json3_files[0], "r", encoding="utf-8", errors="ignore") as f:
                data = json.load(f)
            events = data.get("events", [])
            lines = []
            for e in events:
                if "segs" in e:
                    text = "".join(s.get("utf8", "") for s in e["segs"]).strip()
                    text = re.sub(r"\s+", " ", text.replace("\n", " ")).strip()
                    if text and not text.startswith("["):
                        start = float(e.get("tStartMs", 0)) / 1000.0
                        dur = float(e.get("dDurationMs", 2000)) / 1000.0
                        lines.append({"start": start, "duration": max(0.5, dur), "text": text})
            if lines:
                return lines
        vtt_files = glob.glob(temp_base + "*.vtt")
        if vtt_files:
            with open(vtt_files[0], "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            blocks = re.split(r"\n\s*\n", content)
            raw_segments = []
            time_pattern = re.compile(r"(\d{2}:\d{2}:\d{2}[\.\,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[\.\,]\d{3})")
            def parse_time(ts_str):
                ts_str = ts_str.replace(",", ".")
                parts = ts_str.split(":")
                return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            for block in blocks:
                lines_b = [l.strip() for l in block.split("\n") if l.strip()]
                if not lines_b: continue
                time_match = None
                text_lines = []
                for line in lines_b:
                    if not time_match:
                        m = time_pattern.search(line)
                        if m: time_match = m; continue
                    if time_match and not line.startswith("WEBVTT") and not line.startswith("Kind:") and not line.startswith("Language:"):
                        clean_l = re.sub(r"<[^>]+>", "", line).strip()
                        if clean_l: text_lines.append(clean_l)
                if time_match and text_lines:
                    start_s = parse_time(time_match.group(1))
                    end_s = parse_time(time_match.group(2))
                    dur = end_s - start_s
                    if dur >= 0.15:
                        full_text = re.sub(r"\s+", " ", " ".join(text_lines)).strip()
                        raw_segments.append({"start": start_s, "duration": dur, "text": full_text})
            cleaned = []
            for seg in raw_segments:
                text = seg["text"]
                if cleaned:
                    prev = cleaned[-1]
                    if text.startswith(prev["text"]) and len(text) > len(prev["text"]):
                        cleaned[-1] = seg
                        continue
                    elif prev["text"].startswith(text) or text == prev["text"]:
                        continue
                cleaned.append(seg)
            return cleaned
    except Exception as e:
        print("ytdlp fallback error in app.py:", e)
    return []


def auto_transcribe_audio_helper(video_id, url):
    """Tự động bóc băng âm thanh TikTok/Facebook bằng Whisper AI nếu video chưa có file phụ đề gốc."""
    os.makedirs("web_app/static/cache_audio", exist_ok=True)
    audio_tmpl = f"web_app/static/cache_audio/{video_id}.%(ext)s"
    audio_path = None

    def _write_prog(vid, p):
        try:
            with open(f"/tmp/dl_progress_{vid}.json", "w") as fp:
                json.dump(p, fp)
        except:
            pass

    _write_prog(video_id, {"status": "starting", "percent": "0%", "speed": "0MiB/s"})

    if 'tiktok.com' in url.lower():
        try:
            res = requests.get("https://tikwm.com/api/", params={"url": url}, timeout=10).json()
            if res.get('code') == 0 and res.get('data'):
                dl_url = res['data'].get('music') or res['data'].get('play')
                if dl_url:
                    r = requests.get(dl_url, stream=True)
                    audio_path = audio_tmpl % {'ext': 'mp4'}
                    total_len = r.headers.get('content-length')
                    dl = 0
                    start_t = time.time()
                    last_update = 0
                    with open(audio_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            if chunk:
                                dl += len(chunk)
                                f.write(chunk)
                                now = time.time()
                                if total_len and (now - last_update > 0.5):
                                    speed = dl / (now - start_t) / 1024 / 1024
                                    pct = (dl / int(total_len)) * 100
                                    _write_prog(video_id, {
                                        "status": "downloading",
                                        "percent": f"{pct:.1f}%",
                                        "speed": f"{speed:.2f}MiB/s"
                                    })
                                    last_update = now
        except Exception as e:
            print("tikwm download error:", e)

    if not audio_path or not os.path.exists(audio_path):
        import yt_dlp
        
        def yt_hook(d):
            if d['status'] == 'downloading':
                pct = d.get('_percent_str', '0%').strip()
                pct = re.sub(r'\x1b\[[0-9;]*m', '', pct)
                spd = d.get('_speed_str', '0MiB/s').strip()
                spd = re.sub(r'\x1b\[[0-9;]*m', '', spd)
                _write_prog(video_id, {
                    "status": "downloading",
                    "percent": pct,
                    "speed": spd
                })

        ydl_opts = {
            'quiet': True,
            'format': 'bestaudio/best',
            'outtmpl': audio_tmpl,
            'overwrite': True,
            'progress_hooks': [yt_hook]
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                audio_path = ydl.prepare_filename(info)
        except Exception as e:
            print("ytdlp audio dl error:", e)

    if not audio_path or not os.path.exists(audio_path):
        for f in os.listdir("web_app/static/cache_audio"):
            if f.startswith(video_id + "."):
                audio_path = os.path.join("web_app/static/cache_audio", f)
                break

    if not audio_path or not os.path.exists(audio_path):
        return []

    _write_prog(video_id, {"status": "transcribing", "percent": "100%", "speed": "-"})

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel('base', device='cpu', compute_type='int8')
        segments, _ = model.transcribe(audio_path, language='en', word_timestamps=True)
        raw_lines = []
        for s in segments:
            text = s.text.strip()
            if text:
                raw_lines.append({
                    'start': s.start,
                    'duration': max(0.5, s.end - s.start),
                    'text': text,
                    'en': text
                })
        try:
            os.remove(audio_path)
        except Exception:
            pass
        return raw_lines
    except Exception as e:
        print("whisper error:", e)
        try:
            if audio_path and os.path.exists(audio_path):
                os.remove(audio_path)
        except Exception:
            pass
    return []
