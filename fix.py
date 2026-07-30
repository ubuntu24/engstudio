import os
import re

def fix_transcript_cache(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace transcript_cache saving block 1
    pattern = r'''\s*try:\s*TRANSCRIPT_DB_PATH = os\.environ\.get\(\"TRANSCRIPT_DB_PATH\",\s*os\.path\.join\(os\.path\.dirname\(DB_PATH\) if not DB_PATH\.startswith\(\"postgres\"\) else \"/app/database\",\s*\"transcript_cache\.db\"\)\)\s*conn_tc = sqlite3\.connect\(TRANSCRIPT_DB_PATH\)\s*conn_tc\.execute\(\s*\"INSERT OR REPLACE INTO transcript_cache \(video_id, data, updated_at\) VALUES \(\?, \?, CURRENT_TIMESTAMP\)\",\s*\(video_id, json\.dumps\(raw_lines, ensure_ascii=False\)\)\s*\)\s*conn_tc\.commit\(\)\s*conn_tc\.close\(\)\s*except Exception:\s*pass'''
    
    replacement = '''
                    try:
                        from backend.core.db import get_db_connection
                        conn_tc = get_db_connection()
                        cur_tc = conn_tc.cursor()
                        cur_tc.execute("SELECT video_id FROM transcript_cache WHERE video_id = ?", (video_id,))
                        if cur_tc.fetchone():
                            cur_tc.execute("UPDATE transcript_cache SET data=?, updated_at=CURRENT_TIMESTAMP WHERE video_id=?", (json.dumps(raw_lines, ensure_ascii=False), video_id))
                        else:
                            cur_tc.execute("INSERT INTO transcript_cache (video_id, data) VALUES (?, ?)", (video_id, json.dumps(raw_lines, ensure_ascii=False)))
                        conn_tc.commit()
                        conn_tc.close()
                    except Exception as e:
                        print("Transcript cache save error:", e)'''
    
    content = re.sub(pattern, replacement, content)

    # Replace transcript_cache saving block 2 (multiple times)
    pattern2 = r'''\s*try:\s*TRANSCRIPT_DB_PATH = os\.path\.join\(os\.path\.dirname\(DB_PATH\), \"transcript_cache\.db\"\)\s*conn = sqlite3\.connect\(TRANSCRIPT_DB_PATH\)\s*conn\.execute\(\s*\"INSERT OR REPLACE INTO transcript_cache \(video_id, data\) VALUES \(\?, \?\)\",\s*\(video_id, json\.dumps\(\[\{'start': l\['start'\], 'duration': l\['duration'\], 'text': l\['en'\]\} for l in lines\], ensure_ascii=False\)\)\s*\)\s*conn\.commit\(\)\s*conn\.close\(\)\s*except Exception:\s*pass'''
    
    replacement2 = '''
    try:
        from backend.core.db import get_db_connection
        conn_tc = get_db_connection()
        cur_tc = conn_tc.cursor()
        t_data = json.dumps([{'start': l['start'], 'duration': l['duration'], 'text': l['en']} for l in lines], ensure_ascii=False)
        cur_tc.execute("SELECT video_id FROM transcript_cache WHERE video_id = ?", (video_id,))
        if cur_tc.fetchone():
            cur_tc.execute("UPDATE transcript_cache SET data=?, updated_at=CURRENT_TIMESTAMP WHERE video_id=?", (t_data, video_id))
        else:
            cur_tc.execute("INSERT INTO transcript_cache (video_id, data) VALUES (?, ?)", (video_id, t_data))
        conn_tc.commit()
        conn_tc.close()
    except Exception as e:
        print("Transcript cache save error:", e)'''
    
    content = re.sub(pattern2, replacement2, content)
    
    # Replace the bilingual cache block in /api/video/bilingual_custom
    pattern3 = r'''\s*conn = sqlite3\.connect\(DB_PATH\)\s*conn\.execute\(\s*\"INSERT OR REPLACE INTO bilingual_video_cache \(video_id, title, channel, duration, lines_json, updated_at\) VALUES \(\?, \?, \?, \?, \?, CURRENT_TIMESTAMP\)\",\s*\(cache_key, title, channel, 0, json\.dumps\(lines, ensure_ascii=False\)\)\s*\)\s*conn\.commit\(\)\s*conn\.close\(\)'''
    
    replacement3 = '''
    try:
        from backend.core.db import get_db_connection
        conn_b = get_db_connection()
        cur_b = conn_b.cursor()
        l_data = json.dumps(lines, ensure_ascii=False)
        cur_b.execute("SELECT video_id FROM bilingual_video_cache WHERE video_id = ?", (cache_key,))
        if cur_b.fetchone():
            cur_b.execute("UPDATE bilingual_video_cache SET title=?, channel=?, duration=?, lines_json=?, updated_at=CURRENT_TIMESTAMP WHERE video_id=?", (title, channel, 0, l_data, cache_key))
        else:
            cur_b.execute("INSERT INTO bilingual_video_cache (video_id, title, channel, duration, lines_json) VALUES (?, ?, ?, ?, ?)", (cache_key, title, channel, 0, l_data))
        conn_b.commit()
        conn_b.close()
    except Exception as e:
        print("Bilingual cache save error:", e)'''
    
    content = re.sub(pattern3, replacement3, content)

    # Replace the auto_transcribe helper transcript_cache save block
    pattern4 = r'''\s*try:\s*TRANSCRIPT_DB_PATH = os\.path\.join\(os\.path\.dirname\(DB_PATH\), \"transcript_cache\.db\"\)\s*conn_tc = sqlite3\.connect\(TRANSCRIPT_DB_PATH\)\s*conn_tc\.execute\(\s*\"INSERT OR REPLACE INTO transcript_cache \(video_id, data, updated_at\) VALUES \(\?, \?, CURRENT_TIMESTAMP\)\",\s*\(video_id, json\.dumps\(raw_lines, ensure_ascii=False\)\)\s*\)\s*conn_tc\.commit\(\)\s*conn_tc\.close\(\)\s*except Exception:\s*pass'''
    
    content = re.sub(pattern4, replacement, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_transcript_cache('backend_py/backend/api/video_routes.py')
print('Fixed video_routes.py')
