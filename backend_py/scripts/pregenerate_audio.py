# -*- coding: utf-8 -*-
"""
Script tải trước toàn bộ âm thanh từ vựng (Batch Audio Pre-generation)
Lưu trực tiếp vào thư mục /cache_audio với cấu trúc hash khớp chuẩn của backend_js.
Giúp ứng dụng phát âm 0ms delay ngay lập tức khi học từ vựng.
"""

import os
import sys
import sqlite3
import hashlib
import asyncio
import argparse
import edge_tts

# Reconfigure stdout for utf-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE_DIR = os.path.join(ROOT_DIR, 'cache_audio')
DB_PATH = os.path.join(ROOT_DIR, 'database', 'english_learning.db')

VOICES = {
    'us': {
        'id': 'rachel',
        'voice': 'en-US-JennyNeural'
    },
    'uk': {
        'id': 'george',
        'voice': 'en-GB-RyanNeural'
    }
}

def get_hash(text: str) -> str:
    return hashlib.md5(text.strip().lower().encode('utf-8')).hexdigest()

def fetch_words_from_db(limit=None):
    if not os.path.exists(DB_PATH):
        print(f"❌ Không tìm thấy database tại: {DB_PATH}")
        return []
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    # Ưu tiên các từ có trong learning_progress trước, sau đó là toàn bộ từ vựng
    query = """
        SELECT DISTINCT v.id, TRIM(v.word) as word
        FROM vocabulary v
        LEFT JOIN learning_progress lp ON v.id = lp.word_id
        WHERE v.word IS NOT NULL AND TRIM(v.word) != ''
        ORDER BY CASE WHEN lp.id IS NOT NULL THEN 0 ELSE 1 END, v.id ASC
    """
    if limit:
        query += f" LIMIT {int(limit)}"
    
    cur.execute(query)
    rows = cur.fetchall()
    conn.close()
    return [r[1] for r in rows]

async def download_one_audio(sem, word, voice_key, voice_name, voice_id, counter, total):
    clean_word = word.strip()
    w_hash = get_hash(clean_word)
    file_name = f"edge_{voice_id}_{w_hash}.mp3"
    target_path = os.path.join(CACHE_DIR, file_name)

    # Đã có sẵn thì bỏ qua
    if os.path.exists(target_path) and os.path.getsize(target_path) > 500:
        counter['skipped'] += 1
        return

    temp_path = os.path.join(CACHE_DIR, f"tmp_{voice_id}_{w_hash}.mp3")

    async with sem:
        for attempt in range(3):
            try:
                communicate = edge_tts.Communicate(clean_word, voice_name)
                await communicate.save(temp_path)
                if os.path.exists(temp_path) and os.path.getsize(temp_path) > 500:
                    os.replace(temp_path, target_path)
                    counter['downloaded'] += 1
                    break
            except Exception as e:
                if attempt == 2:
                    counter['failed'] += 1
                    print(f"\n⚠️ Lỗi tải '{clean_word}' ({voice_key.upper()}): {e}")
                await asyncio.sleep(0.5 * (attempt + 1))
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass
        
        # Cập nhật tiến độ hiển thị
        done = counter['downloaded'] + counter['skipped'] + counter['failed']
        if done % 10 == 0 or done == total:
            pct = (done / total) * 100
            print(f"\r⚡ Tiến độ: [{done}/{total}] ({pct:.1f}%) | Đã tải mới: {counter['downloaded']} | Sẵn có: {counter['skipped']}", end='', flush=True)

async def run_batch(words, accents, concurrency=8):
    os.makedirs(CACHE_DIR, exist_ok=True)
    sem = asyncio.Semaphore(concurrency)
    
    tasks = []
    counter = {'downloaded': 0, 'skipped': 0, 'failed': 0}
    
    total_tasks = len(words) * len(accents)
    print(f"\n🎙️ Bắt đầu tải âm thanh cho {len(words)} từ vựng ({', '.join([a.upper() for a in accents])})...")
    print(f"📁 Thư mục lưu trữ: {CACHE_DIR}")
    print(f"🚀 Luồng tải song song: {concurrency}")
    print(f"Tổng số lượt tải: {total_tasks}\n")

    for word in words:
        for accent in accents:
            v_info = VOICES[accent]
            tasks.append(download_one_audio(
                sem, word, accent, v_info['voice'], v_info['id'], counter, total_tasks
            ))

    await asyncio.gather(*tasks)
    print(f"\n\n✅ Hoàn tất tải âm thanh!")
    print(f"   - Đã tải mới: {counter['downloaded']}")
    print(f"   - Đã có sẵn trước đó: {counter['skipped']}")
    print(f"   - Thất bại: {counter['failed']}")

def main():
    parser = argparse.ArgumentParser(description="Tải trước âm thanh từ vựng cho English Studio")
    parser.add_argument("--limit", type=int, default=None, help="Giới hạn số lượng từ cần tải (ví dụ: 100, 500, 1000)")
    parser.add_argument("--accent", type=str, choices=['us', 'uk', 'both'], default='both', help="Chọn giọng US, UK hoặc cả hai (mặc định: both)")
    parser.add_argument("--concurrency", type=int, default=8, help="Số luồng tải song song (mặc định: 8)")
    
    args = parser.parse_args()
    
    accents = ['us', 'uk'] if args.accent == 'both' else [args.accent]
    words = fetch_words_from_db(args.limit)
    
    if not words:
        print("❌ Không có từ vựng nào để tải.")
        return
        
    asyncio.run(run_batch(words, accents, args.concurrency))

if __name__ == '__main__':
    main()
