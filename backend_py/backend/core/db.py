import os
import sqlite3
from flask import request, session as flask_session

DB_PATH = os.environ.get("SUPABASE_URL", os.environ.get("DB_PATH", "english_learning.db"))
if DB_PATH and ':6543/' in DB_PATH:
    DB_PATH = DB_PATH.replace(':6543/', ':5432/')
IS_POSTGRES = DB_PATH.startswith("postgres")

if IS_POSTGRES:
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("WARNING: psycopg2 not available, falling back to SQLite", flush=True)
        IS_POSTGRES = False

class PostgresCursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor
        self.lastrowid = None
        self.rowcount = 0

    def execute(self, sql, params=None):
        sql = sql.replace('sqlite_master', 'information_schema.tables')
        if 'INSERT OR IGNORE' in sql:
            sql = sql.replace('INSERT OR IGNORE', 'INSERT')
            if 'ON CONFLICT' not in sql:
                sql += ' ON CONFLICT DO NOTHING'

        is_insert = sql.strip().upper().startswith('INSERT')
        if is_insert and 'RETURNING id' not in sql:
            sql += ' RETURNING id'
            
        if '?' in sql:
            sql = sql.replace('?', '%s')
            
        self.cursor.execute(sql, params)
        self.rowcount = self.cursor.rowcount
        
        if is_insert:
            try:
                row = self.cursor.fetchone()
                if row and 'id' in row:
                    self.lastrowid = row['id']
            except Exception:
                pass
        return self

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def executescript(self, sql):
        self.cursor.execute(sql)

class PostgresConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn

    def cursor(self):
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        return PostgresCursorWrapper(cur)

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()

    def execute(self, sql, params=None):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def executescript(self, sql):
        cur = self.cursor()
        cur.executescript(sql)
        return cur

def get_db_connection():
    if IS_POSTGRES:
        conn = psycopg2.connect(DB_PATH)
        return PostgresConnectionWrapper(conn)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

def get_default_user(conn):
    cur = conn.cursor()
    cur.execute("SELECT id FROM users LIMIT 1")
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO users (username) VALUES (?)", ("default",))
    conn.commit()
    return cur.lastrowid

def get_current_user_id(conn):
    user_id_header = request.headers.get('X-User-Id')
    if user_id_header and user_id_header.isdigit():
        user_id = int(user_id_header)
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        if row:
            return row[0]
            
    user_id = flask_session.get('user_id')
    if user_id:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        if row:
            return row[0]
    return None

def init_db():
    conn = get_db_connection()
    if IS_POSTGRES:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
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
                status TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'learning', 'reviewing', 'known')),
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
            CREATE INDEX IF NOT EXISTS idx_lp_due ON learning_progress(user_id, due_date);
            CREATE INDEX IF NOT EXISTS idx_lp_status ON learning_progress(user_id, status);
            CREATE TABLE IF NOT EXISTS review_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL DEFAULT 1,
                session_type TEXT NOT NULL DEFAULT 'learn'
                    CHECK (session_type IN ('learn', 'review', 'quiz')),
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
                rating TEXT NOT NULL
                    CHECK (rating IN ('again', 'hard', 'good', 'easy')),
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
        """)
    else:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT DEFAULT '',
                display_name TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS vocabulary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                word_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'learning', 'reviewing', 'known')),
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
            CREATE INDEX IF NOT EXISTS idx_lp_due ON learning_progress(user_id, due_date);
            CREATE INDEX IF NOT EXISTS idx_lp_status ON learning_progress(user_id, status);
            CREATE TABLE IF NOT EXISTS review_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1,
                session_type TEXT NOT NULL DEFAULT 'learn'
                    CHECK (session_type IN ('learn', 'review', 'quiz')),
                cards_seen INTEGER NOT NULL DEFAULT 0,
                cards_correct INTEGER NOT NULL DEFAULT 0,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS review_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                user_id INTEGER NOT NULL DEFAULT 1,
                word_id INTEGER NOT NULL,
                rating TEXT NOT NULL
                    CHECK (rating IN ('again', 'hard', 'good', 'easy')),
                response_time_ms INTEGER DEFAULT 0,
                reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS grammar_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        """)
        
    try:
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass

    conn.commit()
    conn.close()
