import os
import re

def fix_transcript_cache_service(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'''\s*conn = sqlite3\.connect\(\"transcript_cache\.db\"\)\s*cur = conn\.cursor\(\)\s*cur\.execute\(\"SELECT data FROM transcript_cache WHERE video_id = \?\", \(video_id,\)\)\s*row = cur\.fetchone\(\)\s*if row and row\[0\]:\s*raw_lines = json\.loads\(row\[0\]\)\s*conn\.close\(\)'''
    
    replacement = '''
        from backend.core.db import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT data FROM transcript_cache WHERE video_id = ?", (video_id,))
        row = cur.fetchone()
        if row and row[0]:
            raw_lines = json.loads(row[0])
        conn.close()'''
    
    content = re.sub(pattern, replacement, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_transcript_cache_service('backend_py/backend/services/video_service.py')
print('Fixed video_service.py')
