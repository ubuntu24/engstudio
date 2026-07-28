import sqlite3
import psycopg2
import psycopg2.extras
import os
import sys

def migrate():
    sqlite_path = os.path.join(os.path.dirname(__file__), "..", "database", "english_learning.db")
    supabase_url = os.environ.get("SUPABASE_URL")
    
    if not supabase_url:
        print("Lỗi: Chưa cung cấp biến môi trường SUPABASE_URL.")
        print("Vui lòng chạy lệnh: export SUPABASE_URL='postgresql://...' && python3 scripts/migrate_to_supabase.py")
        sys.exit(1)
        
    if not os.path.exists(sqlite_path):
        print(f"Lỗi: Không tìm thấy file SQLite tại {sqlite_path}")
        sys.exit(1)
        
    print(f"Bắt đầu chuyển dữ liệu từ {sqlite_path} sang Supabase...")
    
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()
    
    pg_conn = psycopg2.connect(supabase_url)
    pg_cur = pg_conn.cursor()
    
    # Tạo schema (bảng) trên Supabase nếu chưa có
    print("Đang khởi tạo các bảng trên Supabase...")
    pg_cur.execute("""
        DROP TABLE IF EXISTS transcript_cache;
        DROP TABLE IF EXISTS bilingual_video_cache;
        DROP TABLE IF EXISTS grammar_questions;
        DROP TABLE IF EXISTS review_log;
        DROP TABLE IF EXISTS review_sessions;
        DROP TABLE IF EXISTS learning_progress;
        DROP TABLE IF EXISTS vocabulary;
        DROP TABLE IF EXISTS users;
        
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT DEFAULT '',
            display_name TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vocabulary (
            id SERIAL PRIMARY KEY,
            word TEXT NOT NULL,
            vietnamese_meaning TEXT DEFAULT '',
            pronunciation TEXT DEFAULT '',
            video_id TEXT DEFAULT '',
            timestamp_sec REAL DEFAULT 0,
            context TEXT DEFAULT '',
            video_title TEXT DEFAULT '',
            channel TEXT DEFAULT '',
            view_count INTEGER DEFAULT 0,
            embed_url TEXT DEFAULT '',
            definition TEXT DEFAULT '',
            example TEXT DEFAULT '',
            image_path TEXT DEFAULT '',
            audio_path TEXT DEFAULT '',
            pos TEXT DEFAULT '',
            example_vi TEXT DEFAULT '',
            topic TEXT DEFAULT 'Giao tiếp hàng ngày',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS learning_progress (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL DEFAULT 1,
            word_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'new',
            ease_factor REAL NOT NULL DEFAULT 2.5,
            interval_days REAL NOT NULL DEFAULT 0,
            consecutive_correct INTEGER NOT NULL DEFAULT 0,
            due_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_reviewed TIMESTAMP,
            total_reviews INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, word_id)
        );

        CREATE TABLE IF NOT EXISTS review_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL DEFAULT 1,
            session_type TEXT NOT NULL DEFAULT 'learn',
            cards_seen INTEGER NOT NULL DEFAULT 0,
            cards_correct INTEGER NOT NULL DEFAULT 0,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS review_log (
            id SERIAL PRIMARY KEY,
            session_id INTEGER,
            user_id INTEGER NOT NULL DEFAULT 1,
            word_id INTEGER NOT NULL,
            rating TEXT NOT NULL,
            response_time_ms INTEGER DEFAULT 0,
            reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS grammar_questions (
            id SERIAL PRIMARY KEY,
            category TEXT NOT NULL,
            question TEXT NOT NULL,
            option_a TEXT NOT NULL,
            option_b TEXT NOT NULL,
            option_c TEXT NOT NULL,
            option_d TEXT NOT NULL,
            correct_answer TEXT NOT NULL,
            explanation TEXT,
            source TEXT DEFAULT 'ETS 2024',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            formula TEXT DEFAULT '',
            signal_words TEXT DEFAULT '',
            translation_vi TEXT DEFAULT '',
            ai_breakdown_json TEXT DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS bilingual_video_cache (
            video_id TEXT PRIMARY KEY,
            title TEXT,
            channel TEXT,
            duration REAL,
            lines_json TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transcript_cache (
            video_id TEXT PRIMARY KEY,
            data TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    pg_conn.commit()
    print("Khởi tạo bảng thành công!")
    
    tables_to_migrate = [
        "users",
        "vocabulary",
        "learning_progress",
        "review_sessions",
        "review_log",
        "grammar_questions",
        "bilingual_video_cache",
        "transcript_cache"
    ]
    
    for table in tables_to_migrate:
        # Check if table exists in SQLite
        sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
        if not sqlite_cur.fetchone():
            print(f"Bỏ qua bảng {table} vì không tồn tại trong SQLite.")
            continue
            
        print(f"Đang migrate bảng {table}...")
        
        sqlite_cur.execute(f"SELECT * FROM {table}")
        rows = sqlite_cur.fetchall()
        
        if not rows:
            print(f"  - Bảng {table} trống.")
            continue
            
        columns = rows[0].keys()
        cols_str = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))
        
        print(f"  - Tìm thấy {len(rows)} dòng. Đang xử lý...")
        
        insert_query = f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
        
        # Sử dụng execute_batch để tăng tốc độ insert gấp hàng chục lần thay vì insert từng dòng
        batch_size = 500
        data_to_insert = [tuple(row[col] for col in columns) for row in rows]
        
        total_inserted = 0
        for i in range(0, len(data_to_insert), batch_size):
            batch = data_to_insert[i:i + batch_size]
            psycopg2.extras.execute_batch(pg_cur, insert_query, batch, page_size=batch_size)
            pg_conn.commit()
            total_inserted += len(batch)
            if i > 0 and i % 1000 == 0:
                print(f"    ...đã chèn {total_inserted}/{len(rows)} dòng...")
            
        print(f"  - Đã chèn thành công {total_inserted} dòng vào bảng {table}.")

    # Reset sequences for SERIAL primary keys
    for table in tables_to_migrate:
        try:
            pg_cur.execute(f"SELECT setval('{table}_id_seq', COALESCE((SELECT MAX(id)+1 FROM {table}), 1), false);")
            pg_conn.commit()
        except Exception:
            pg_conn.rollback()
            
    print("Migrate dữ liệu hoàn tất thành công!")
    
if __name__ == "__main__":
    migrate()
