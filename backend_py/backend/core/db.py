import sqlite3
import os
from flask import request, session as flask_session

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "..", "database", "english_learning.db"))
if not os.path.exists(DB_PATH):
    # Fallback for old setups
    DB_PATH = "/home/MRS/english/english_learning.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def get_default_user(conn):
    """Đảm bảo luôn có user mặc định, trả về user_id. KHÔNG đóng connection."""
    cur = conn.cursor()
    cur.execute("SELECT id FROM users LIMIT 1")
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO users (username) VALUES (?)", ("default",))
    conn.commit()
    return cur.lastrowid

def get_current_user_id(conn):
    """Lấy user_id hiện tại từ header (proxied từ Node.js) hoặc session."""
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
    """Nâng cấp schema - thêm bảng users, learning_progress, sessions nếu chưa có"""
    conn = get_db_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT DEFAULT '',
            display_name TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            UNIQUE(user_id, word_id),
            FOREIGN KEY (word_id) REFERENCES vocabulary(id)
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
            reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (word_id) REFERENCES vocabulary(id)
        );
    """)

    # Migration: add password_hash if table existed before
    try:
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass

    conn.commit()
    conn.close()
