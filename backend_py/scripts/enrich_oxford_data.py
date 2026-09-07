import os
import sys
import json
import csv
import io
import re
import urllib.request
import sqlite3
from dotenv import load_dotenv

# Reconfigure stdout for utf-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

def clean_html(text):
    if not text:
        return ''
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>')
    text = re.sub(r'<[^>]+>', '', text)
    return re.sub(r'\s+', ' ', text).strip()

def fetch_oxford_5000():
    print("[1/4] Đang tải Oxford 5000 (CEFR, POS, IPA, Definition, Examples)...", flush=True)
    url = 'https://raw.githubusercontent.com/winterdl/oxford-5000-vocabulary-audio-definition/master/data/oxford_5000.json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    
    oxford_map = {}
    for item in data.values():
        w = item.get('word', '').strip().lower()
        if w and w not in oxford_map:
            oxford_map[w] = {
                'cefr': (item.get('cefr') or '').upper(),
                'pos': item.get('type') or '',
                'phon_uk': item.get('phon_br') or '',
                'phon_us': item.get('phon_n_am') or '',
                'definition': clean_html(item.get('definition') or ''),
                'example': clean_html(item.get('example') or '')
            }
    print(f" -> Đã nạp {len(oxford_map)} từ từ Oxford 5000.", flush=True)
    return oxford_map

def fetch_oxford_collocations():
    print("[2/4] Đang tải Oxford 3000 Collocations, Synonyms & Antonyms...", flush=True)
    url = 'https://raw.githubusercontent.com/ciwga/Oxford3000_Vocab/main/oxford3000_vocabulary_with_collocations_and_definitions_datasets.csv'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read().decode('utf-8', errors='ignore')
    
    reader = csv.DictReader(io.StringIO(content))
    colloc_map = {}
    for row in reader:
        w = (row.get('Word') or '').strip().lower()
        if w and w not in colloc_map:
            syn = row.get('Synonyms') or ''
            ant = row.get('Antonyms') or ''
            if syn.lower() in ('none', 'n/a'): syn = ''
            if ant.lower() in ('none', 'n/a'): ant = ''
            
            colloc_map[w] = {
                'pos': row.get('Part of Speech') or '',
                'definition': clean_html(row.get('Definition') or ''),
                'example': clean_html(row.get('Example Sentence') or ''),
                'collocations': clean_html(row.get('Collocations') or ''),
                'synonyms': clean_html(syn),
                'antonyms': clean_html(ant)
            }
    print(f" -> Đã nạp {len(colloc_map)} cụm từ Collocations từ Oxford 3000.", flush=True)
    return colloc_map

def resolve_cefr(w, o5k_map):
    if w in o5k_map and o5k_map[w].get('cefr'):
        return o5k_map[w]['cefr']
    if w in ('a bit', 'a few', 'a little', 'a couple', 'a lot'):
        return 'A1'
    candidates = []
    if w.endswith('ly'):
        candidates.extend([w[:-2], w[:-3]])
    elif w.endswith('ed'):
        candidates.extend([w[:-2], w[:-1]])
    elif w.endswith('ing'):
        candidates.extend([w[:-3], w[:-3] + 'e'])
    elif w.endswith('s') or w.endswith('es'):
        candidates.extend([w[:-1], w[:-2]])
    elif w.endswith('tion') or w.endswith('sion'):
        candidates.extend([w[:-4] + 'te', w[:-4] + 't', w[:-4]])
    
    for c in candidates:
        if c in o5k_map and o5k_map[c].get('cefr'):
            return o5k_map[c]['cefr']
    return 'B1'

def enrich_sqlite(db_path, o5k_map, colloc_map):
    if not os.path.exists(db_path):
        print(f"[SQLite] Không tìm thấy DB tại {db_path}, bỏ qua.", flush=True)
        return
    print(f"\n[3/4] Bắt đầu enrich SQLite DB: {db_path}...", flush=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Ensure columns exist
    cols = ["cefr_level", "collocations", "synonyms", "antonyms", "phon_uk", "phon_us"]
    for col in cols:
        try:
            cur.execute(f"ALTER TABLE vocabulary ADD COLUMN {col} TEXT DEFAULT ''")
        except Exception:
            pass
    conn.commit()
    
    cur.execute("SELECT id, word, definition, example, pos, pronunciation FROM vocabulary")
    rows = cur.fetchall()
    print(f" -> Tổng số từ trong DB: {len(rows)}", flush=True)
    
    updated_count = 0
    cefr_count = 0
    colloc_count = 0
    pos_count = 0
    
    for r in rows:
        wid = r['id']
        w = r['word'].strip().lower()
        
        o5k = o5k_map.get(w, {})
        col = colloc_map.get(w, {})
        
        cefr = resolve_cefr(w, o5k_map)
        pos = o5k.get('pos') or col.get('pos') or r['pos'] or ''
        phon_uk = o5k.get('phon_uk') or ''
        phon_us = o5k.get('phon_us') or ''
        pron = r['pronunciation'] or phon_us or phon_uk
        
        collocations = col.get('collocations') or ''
        synonyms = col.get('synonyms') or ''
        antonyms = col.get('antonyms') or ''
        
        # Clean or enhance definition
        existing_def = clean_html(r['definition'] or '')
        new_def = o5k.get('definition') or col.get('definition') or existing_def
        
        # Clean or enhance example
        existing_ex = clean_html(r['example'] or '')
        new_ex = o5k.get('example') or col.get('example') or existing_ex
        
        if cefr: cefr_count += 1
        if collocations: colloc_count += 1
        if pos: pos_count += 1
        
        cur.execute("""
            UPDATE vocabulary SET
                cefr_level = ?,
                pos = ?,
                collocations = ?,
                synonyms = ?,
                antonyms = ?,
                phon_uk = ?,
                phon_us = ?,
                pronunciation = ?,
                definition = ?,
                example = ?
            WHERE id = ?
        """, (cefr, pos, collocations, synonyms, antonyms, phon_uk, phon_us, pron, new_def, new_ex, wid))
        updated_count += 1
        
    conn.commit()
    conn.close()
    print(f" -> Hoàn tất cập nhật SQLite {db_path}:")
    print(f"    + Cập nhật tổng: {updated_count} từ")
    print(f"    + Có cấp độ CEFR: {cefr_count} từ")
    print(f"    + Có Oxford Collocations: {colloc_count} từ")
    print(f"    + Có Part of Speech: {pos_count} từ", flush=True)

def enrich_postgres(supabase_url, o5k_map, colloc_map):
    if not supabase_url:
        print("\n[PostgreSQL] Không có SUPABASE_URL, bỏ qua.", flush=True)
        return
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("\n[PostgreSQL] psycopg2 chưa được cài đặt, bỏ qua Postgres.", flush=True)
        return
        
    print(f"\n[4/4] Bắt đầu enrich Supabase PostgreSQL...", flush=True)
    try:
        kwargs = {}
        if "supabase" in supabase_url.lower() and "sslmode" not in supabase_url.lower():
            kwargs['sslmode'] = 'require'
        conn = psycopg2.connect(supabase_url, **kwargs)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Ensure columns exist
        cols = ["cefr_level", "collocations", "synonyms", "antonyms", "phon_uk", "phon_us"]
        for col in cols:
            cur.execute(f"ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS {col} TEXT DEFAULT '';")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_vocab_cefr ON vocabulary(cefr_level);")
        conn.commit()
        
        cur.execute("SELECT id, word, definition, example, pos, pronunciation FROM vocabulary")
        rows = cur.fetchall()
        print(f" -> Tổng số từ trong Supabase: {len(rows)}", flush=True)
        
        update_data = []
        cefr_count = 0
        colloc_count = 0
        pos_count = 0
        
        for r in rows:
            wid = r['id']
            w = r['word'].strip().lower()
            
            o5k = o5k_map.get(w, {})
            col = colloc_map.get(w, {})
            
            cefr = resolve_cefr(w, o5k_map)
            pos = o5k.get('pos') or col.get('pos') or r['pos'] or ''
            phon_uk = o5k.get('phon_uk') or ''
            phon_us = o5k.get('phon_us') or ''
            pron = r['pronunciation'] or phon_us or phon_uk
            
            collocations = col.get('collocations') or ''
            synonyms = col.get('synonyms') or ''
            antonyms = col.get('antonyms') or ''
            
            existing_def = clean_html(r['definition'] or '')
            new_def = o5k.get('definition') or col.get('definition') or existing_def
            
            existing_ex = clean_html(r['example'] or '')
            new_ex = o5k.get('example') or col.get('example') or existing_ex
            
            if cefr: cefr_count += 1
            if collocations: colloc_count += 1
            if pos: pos_count += 1
            
            update_data.append((cefr, pos, collocations, synonyms, antonyms, phon_uk, phon_us, pron, new_def, new_ex, wid))
            
        psycopg2.extras.execute_batch(cur, """
            UPDATE vocabulary SET
                cefr_level = %s,
                pos = %s,
                collocations = %s,
                synonyms = %s,
                antonyms = %s,
                phon_uk = %s,
                phon_us = %s,
                pronunciation = %s,
                definition = %s,
                example = %s
            WHERE id = %s
        """, update_data, page_size=200)
        
        conn.commit()
        conn.close()
        print(f" -> Hoàn tất cập nhật Supabase PostgreSQL:")
        print(f"    + Cập nhật tổng: {len(update_data)} từ")
        print(f"    + Có cấp độ CEFR: {cefr_count} từ")
        print(f"    + Có Oxford Collocations: {colloc_count} từ")
        print(f"    + Có Part of Speech: {pos_count} từ", flush=True)
    except Exception as e:
        print(f"❌ Lỗi khi cập nhật Supabase PostgreSQL: {e}", flush=True)

if __name__ == '__main__':
    o5k_map = fetch_oxford_5000()
    colloc_map = fetch_oxford_collocations()
    
    # 1. SQLite in database/
    db_main = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../database/english_learning.db'))
    enrich_sqlite(db_main, o5k_map, colloc_map)
    
    # 2. SQLite in backend_py/ (if exists)
    db_py = os.path.abspath(os.path.join(os.path.dirname(__file__), '../english_learning.db'))
    if os.path.exists(db_py):
        enrich_sqlite(db_py, o5k_map, colloc_map)
        
    # 3. Supabase PostgreSQL
    supabase_url = os.environ.get('SUPABASE_URL')
    enrich_postgres(supabase_url, o5k_map, colloc_map)
    print("\n✅ HOÀN TẤT ĐỒNG BỘ NGUỒN OXFORD 3000 / 5000 & COLLOCATIONS!", flush=True)
