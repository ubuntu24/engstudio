#!/usr/bin/env python3
import sys
import json
import sqlite3
import os

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No SQL provided"}))
        return

    sql = sys.argv[1]
    params = json.loads(sys.argv[2]) if len(sys.argv) > 2 else []

    env_db = os.environ.get("DB_PATH")
    
    candidates = [
        env_db,
        os.path.join(os.path.dirname(__file__), "..", "database", "english_learning.db"),
        "/home/MRS/english/english_learning.db",
        "/home/MRS/english/web_app/english_learning.db"
    ]
    db_path = candidates[2]
    for c in candidates:
        if c and os.path.exists(c) and os.path.getsize(c) > 50000:
            db_path = c
            break

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Database Performance Optimization Settings (WAL mode + Cache tuning)
    try:
        cur.execute("PRAGMA journal_mode = WAL;")
        cur.execute("PRAGMA synchronous = NORMAL;")
        cur.execute("PRAGMA cache_size = -64000;")
    except Exception:
        pass

    # Ensure topic column & performance indexes exist
    try:
        cur.execute("PRAGMA table_info(vocabulary)")
        cols = [r['name'] for r in cur.fetchall()]
        if 'topic' not in cols:
            cur.execute("ALTER TABLE vocabulary ADD COLUMN topic TEXT DEFAULT 'Giao tiếp hàng ngày'")
            conn.commit()

            topics = [
                'Giao tiếp hàng ngày',
                'Công việc & Công sở',
                'Du lịch & Giải trí',
                'Học thuật & IELTS',
                'Công nghệ & Kỹ thuật'
            ]
            cur.execute("SELECT id FROM vocabulary")
            rows = cur.fetchall()
            for r in rows:
                t = topics[r['id'] % len(topics)]
                cur.execute("UPDATE vocabulary SET topic = ? WHERE id = ?", (t, r['id']))
            conn.commit()

        # Create Optimization Indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_vocab_topic ON vocabulary(topic)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_vocab_pos ON vocabulary(pos)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_lp_user_due_status ON learning_progress(user_id, status, due_date)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_rl_user_word ON review_log(user_id, word_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_rs_user ON review_sessions(user_id, started_at)")
        conn.commit()
    except Exception:
        pass

    try:
        cur.execute(sql, params)
        if sql.strip().upper().startswith("SELECT") or "RETURNING" in sql.upper():
            rows = [dict(r) for r in cur.fetchall()]
            print(json.dumps({"rows": rows}, ensure_ascii=False))
        else:
            conn.commit()
            print(json.dumps({"lastID": cur.lastrowid, "changes": cur.rowcount}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
    finally:
        conn.close()

if __name__ == '__main__':
    main()
