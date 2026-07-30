import os
import sqlite3
import psycopg2
from psycopg2.extras import DictCursor

def get_supabase_conn():
    with open('.env', 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('SUPABASE_URL='):
                url = line.split('=', 1)[1].strip()
                return psycopg2.connect(url)
    return None

def migrate():
    print("Connecting to Supabase...")
    pg_conn = get_supabase_conn()
    if not pg_conn:
        print("SUPABASE_URL not found in .env")
        return
    pg_cur = pg_conn.cursor()
    
    print("Connecting to local SQLite...")
    sqlite_conn = sqlite3.connect('../english_learning.db')
    sqlite_conn.row_factory = sqlite3.Row
    sl_cur = sqlite_conn.cursor()
    
    # Check grammar_questions
    sl_cur.execute("SELECT * FROM grammar_questions")
    grammar_rows = sl_cur.fetchall()
    print(f"Found {len(grammar_rows)} grammar questions in SQLite.")
    
    if len(grammar_rows) > 0:
        print("Migrating grammar_questions...")
        pg_cur.execute("CREATE TABLE IF NOT EXISTS grammar_questions (id SERIAL PRIMARY KEY, category TEXT, question TEXT, option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT, correct_answer TEXT, explanation TEXT, formula TEXT, signal_words TEXT, translation_vi TEXT, ai_breakdown_json TEXT)")
        
        # Clear existing
        pg_cur.execute("TRUNCATE TABLE grammar_questions RESTART IDENTITY")
        
        for row in grammar_rows:
            cols = list(row.keys())
            vals = [row[c] for c in cols]
            placeholders = ','.join(['%s'] * len(vals))
            col_names = ','.join(cols)
            # Keeping id to match
            pg_cur.execute(f"INSERT INTO grammar_questions ({col_names}) VALUES ({placeholders})", vals)
            
        pg_conn.commit()
        print("grammar_questions migrated!")

    # Check vocabulary
    sl_cur.execute("SELECT * FROM vocabulary")
    vocab_rows = sl_cur.fetchall()
    print(f"Found {len(vocab_rows)} vocabulary words in SQLite.")
    
    if len(vocab_rows) > 0:
        print("Migrating vocabulary...")
        pg_cur.execute("CREATE TABLE IF NOT EXISTS vocabulary (id SERIAL PRIMARY KEY, word TEXT NOT NULL, vietnamese_meaning TEXT DEFAULT '', pronunciation TEXT DEFAULT '', video_id TEXT DEFAULT '', timestamp_sec REAL DEFAULT 0, context TEXT DEFAULT '', video_title TEXT DEFAULT '', channel TEXT DEFAULT '')")
        
        pg_cur.execute("TRUNCATE TABLE vocabulary RESTART IDENTITY")
        
        for row in vocab_rows:
            cols = list(row.keys())
            vals = [row[c] for c in cols]
            placeholders = ','.join(['%s'] * len(vals))
            col_names = ','.join(cols)
            pg_cur.execute(f"INSERT INTO vocabulary ({col_names}) VALUES ({placeholders})", vals)
            
        pg_conn.commit()
        print("vocabulary migrated!")
        
    pg_conn.close()
    sqlite_conn.close()
    print("Migration complete!")

if __name__ == '__main__':
    migrate()
