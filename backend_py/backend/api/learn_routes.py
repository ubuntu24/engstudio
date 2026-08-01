from flask import Blueprint, request, jsonify
from markupsafe import escape
import datetime
import random
from backend.core.db import get_db_connection, get_current_user_id
from backend.core.auth import login_required, optional_login
from backend.services.ai_manager import AI_AVAILABLE

learn_bp = Blueprint('learn', __name__)

def row_to_word(w):
    return {
        'id': w['id'],
        'word': w['word'],
        'vietnamese_meaning': w['vietnamese_meaning'],
        'pronunciation': w['pronunciation'],
        'video_id': w['video_id'],
        'timestamp_sec': w['timestamp_sec'],
        'context': w['context'],
        'video_title': w['video_title'],
        'channel': w['channel'],
        'view_count': w['view_count'],
        'embed_url': w['embed_url'],
        'definition': w['definition'],
        'example': w['example'],
        'image_path': w['image_path'],
        'audio_path': w['audio_path'],
    }

@learn_bp.route('/api/ai/usage', methods=['GET'])
@optional_login
def get_ai_usage():
    from backend.core.db import get_ai_usage_info
    conn = get_db_connection()
    try:
        user_id = get_current_user_id(conn)
        usage_count, limit = get_ai_usage_info(conn, request, user_id)
        remaining = max(0, limit - usage_count)
        return jsonify({
            'used': usage_count,
            'limit': limit,
            'remaining': remaining
        })
    finally:
        conn.close()

def srs_update(rating, ease, interval, consecutive):
    """Simple SM-2 style update. Returns (status, ease, interval_days, consecutive)."""
    correct = rating in ('good', 'easy', 'hard')
    if rating == 'again':
        return 'learning', max(1.3, ease - 0.2), 0, 0

    if rating == 'hard':
        ease = max(1.3, ease - 0.15)
        consecutive = consecutive + 1
        interval = 1 if interval < 1 else interval * 1.2
        status = 'learning' if consecutive < 2 else 'reviewing'
    elif rating == 'good':
        ease = ease
        consecutive = consecutive + 1
        if interval < 1:
            interval = 1
        elif interval < 6:
            interval = 6
        else:
            interval = interval * ease
        status = 'reviewing' if consecutive < 4 else 'known'
    else:  # easy
        ease = ease + 0.15
        consecutive = consecutive + 1
        if interval < 1:
            interval = 2
        else:
            interval = interval * ease * 1.3
        status = 'known' if consecutive >= 3 else 'reviewing'

    return status, ease, float(interval), consecutive


@learn_bp.route('/api/topics', methods=['GET'])
def get_topics():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT topic, COUNT(*) as count 
            FROM vocabulary 
            GROUP BY topic 
            ORDER BY topic ASC
        """)
        rows = cur.fetchall()
        topics = [{'name': r['topic'], 'count': r['count']} for r in rows if r['topic']]
        return jsonify({'topics': topics})
    except Exception as e:
        print("API /topics error:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@learn_bp.route('/api/words')
def get_words():
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(200, max(1, int(request.args.get('per_page', 50))))
    search = request.args.get('search', '').strip()
    sort = request.args.get('sort', 'az')
    filter_type = request.args.get('filter', 'all')

    conn = get_db_connection()
    try:
        cur = conn.cursor()

        # Build WHERE clause
        conditions = []
        params = []
        if search:
            conditions.append("(LOWER(word) LIKE ? OR LOWER(vietnamese_meaning) LIKE ?)")
            like = f"%{search.lower()}%"
            params.extend([like, like])
        if filter_type == 'video':
            conditions.append("video_id IS NOT NULL AND video_id != ''")
        elif filter_type == 'audio':
            conditions.append("audio_path IS NOT NULL AND audio_path != ''")

        where = "WHERE " + " AND ".join(conditions) if conditions else ""

        # Count total
        cur.execute(f"SELECT COUNT(*) as total FROM vocabulary {where}", params)
        total = cur.fetchone()['total']

        # Sort
        order = "ORDER BY word ASC"
        if sort == 'za':
            order = "ORDER BY word DESC"
        elif sort == 'video':
            order = "ORDER BY (CASE WHEN video_id IS NOT NULL AND video_id != '' THEN 0 ELSE 1 END), word ASC"

        # Paginate
        offset = (page - 1) * per_page
        cur.execute(
            f"SELECT * FROM vocabulary {where} {order} LIMIT ? OFFSET ?",
            params + [per_page, offset]
        )
        words = cur.fetchall()

        total_pages = max(1, (total + per_page - 1) // per_page)

        return jsonify({
            'words': [row_to_word(w) for w in words],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
        })
    finally:
        conn.close()


@learn_bp.route('/api/stats')
@login_required
def get_stats():
    """Expanded stats: includes comprehensive learning metrics & quality counts."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        user_id = get_current_user_id(conn)
        now = datetime.datetime.now().isoformat(sep=' ', timespec='seconds')

        cur.execute("SELECT COUNT(*) as total FROM vocabulary")
        total = cur.fetchone()['total'] or 0

        cur.execute("SELECT COUNT(*) as c FROM vocabulary WHERE video_id IS NOT NULL AND video_id != ''")
        has_video = cur.fetchone()['c'] or 0

        cur.execute("SELECT COUNT(*) as c FROM vocabulary WHERE definition IS NOT NULL AND TRIM(definition) != ''")
        has_def = cur.fetchone()['c'] or 0

        cur.execute("SELECT COUNT(*) as c FROM vocabulary WHERE example IS NOT NULL AND TRIM(example) != ''")
        has_ex = cur.fetchone()['c'] or 0

        cur.execute("SELECT COUNT(*) as c FROM vocabulary WHERE audio_path IS NOT NULL AND TRIM(audio_path) != ''")
        has_audio = cur.fetchone()['c'] or 0

        # Learning progress stats
        cur.execute("SELECT COUNT(*) as c FROM learning_progress WHERE user_id = ? AND status = 'known'", (user_id,))
        mastered = cur.fetchone()['c'] or 0

        cur.execute("SELECT COUNT(*) as c FROM learning_progress WHERE user_id = ? AND status IN ('learning', 'reviewing')", (user_id,))
        learning = cur.fetchone()['c'] or 0

        cur.execute(
            """
            SELECT COUNT(*) as due_today FROM learning_progress
            WHERE user_id = ? AND due_date <= ? AND status != 'new'
            """,
            (user_id, now),
        )
        due_today = cur.fetchone()['due_today'] or 0

        # Accuracy rate from review_log
        try:
            cur.execute("SELECT COUNT(*) as total, SUM(CASE WHEN rating IN ('good', 'easy') THEN 1 ELSE 0 END) as correct FROM review_log WHERE user_id = ?", (user_id,))
            rev_row = cur.fetchone()
            tot_rev = rev_row['total'] or 0
            cor_rev = rev_row['correct'] or 0
            accuracy = round((cor_rev / tot_rev * 100)) if tot_rev > 0 else 85
        except Exception:
            accuracy = 85

        return jsonify({
            'total': total,
            'total_words': total,
            'mastered_words': mastered,
            'learning_words': learning,
            'review_due_count': due_today,
            'accuracy_rate': accuracy,
            'streak_days': 1,
            'has_video': has_video,
            'has_definition': has_def,
            'has_example': has_ex,
            'has_audio': has_audio,
            'words_with_video': has_video,
            'ai_available': AI_AVAILABLE,
            'learning': {
                'due_today': due_today,
                'mastered': mastered,
                'learning': learning
            },
        })
    finally:
        conn.close()


@learn_bp.route('/api/learn/progress')
def learn_progress():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        user_id = get_current_user_id(conn)
        now = datetime.datetime.now().isoformat(sep=' ', timespec='seconds')

        def count_status(status):
            cur.execute(
                "SELECT COUNT(*) as c FROM learning_progress WHERE user_id = ? AND status = ?",
                (user_id, status),
            )
            return cur.fetchone()['c'] or 0

        learning = count_status('learning')
        reviewing = count_status('reviewing')
        known = count_status('known')

        cur.execute(
            """
            SELECT COUNT(*) as c FROM learning_progress
            WHERE user_id = ? AND due_date <= ? AND status IN ('learning', 'reviewing', 'known')
            """,
            (user_id, now),
        )
        due_now = cur.fetchone()['c'] or 0

        total_learned = learning + reviewing + known

        return jsonify({
            'learning': learning,
            'reviewing': reviewing,
            'known': known,
            'due_now': due_now,
            'total_learned': total_learned,
        })
    finally:
        conn.close()


@learn_bp.route('/api/learn/session', methods=['GET', 'POST'])
@optional_login
def learn_session():
    """Tạo phiên học: trộn từ đến hạn + từ mới (Anki SRS queue)."""
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
    else:
        data = request.args
        
    topic = data.get('topic')

    count = int(data.get('count', 20))
    count = max(1, min(count, 50))

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        user_id = get_current_user_id(conn)
        now = datetime.datetime.now().isoformat(sep=' ', timespec='seconds')

        video_only = data.get('video_only', False)
        
        extra_cond = " AND v.video_id IS NOT NULL AND v.video_id != ''" if video_only else ""
        
        params_due = [user_id, now]
        params_new = [user_id]
        
        if topic and topic != 'Tất cả':
            extra_cond += " AND v.topic = ?"
            params_due.append(topic)
            params_new.append(topic)
            
        params_due.append(count)
        
        if not user_id:
            # Guest mode: just return random words
            params_guest = []
            if topic and topic != 'Tất cả':
                params_guest.append(topic)
            params_guest.append(count)
            
            cur.execute(
                f"""
                SELECT v.* FROM vocabulary v
                WHERE 1=1
                {extra_cond}
                ORDER BY RANDOM()
                LIMIT ?
                """,
                params_guest,
            )
            guest_rows = cur.fetchall()
            cards = [row_to_word(r) for r in guest_rows]
            return jsonify({
                'session_id': 0,
                'cards': cards,
                'new_count': len(cards),
                'review_count': 0,
            })

        # Due cards first (lp.due_date <= now)
        cur.execute(
            f"""
            SELECT v.* FROM vocabulary v
            JOIN learning_progress lp ON lp.word_id = v.id
            WHERE lp.user_id = ? AND lp.due_date <= ? AND lp.status IN ('learning', 'reviewing', 'known')
            {extra_cond}
            ORDER BY lp.due_date ASC
            LIMIT ?
            """,
            params_due,
        )
        due_rows = cur.fetchall()

        remaining = count - len(due_rows)
        new_rows = []
        if remaining > 0:
            params_new.append(remaining)
            # Words not yet in progress for this user
            cur.execute(
                f"""
                SELECT v.* FROM vocabulary v
                WHERE v.id NOT IN (
                    SELECT word_id FROM learning_progress WHERE user_id = ?
                )
                {extra_cond}
                ORDER BY RANDOM()
                LIMIT ?
                """,
                params_new,
            )
            new_rows = cur.fetchall()

        cards = [row_to_word(r) for r in due_rows] + [row_to_word(r) for r in new_rows]
        random.shuffle(cards)

        # Create session
        cur.execute(
            "INSERT INTO review_sessions (user_id, session_type, cards_seen, cards_correct) VALUES (?, 'learn', 0, 0)",
            (user_id,),
        )
        session_id = cur.lastrowid
        conn.commit()

        return jsonify({
            'session_id': session_id,
            'cards': cards,
            'new_count': len(new_rows),
            'review_count': len(due_rows),
        })
    finally:
        conn.close()


@learn_bp.route('/api/learn/review', methods=['POST'])
@login_required
def learn_review():
    data = request.get_json(silent=True) or {}
    word_id = data.get('word_id')
    rating = data.get('rating', 'good')
    session_id = data.get('session_id')
    response_time_ms = int(data.get('response_time_ms') or 0)

    if not word_id or rating not in ('again', 'hard', 'good', 'easy'):
        return jsonify({'error': 'Invalid payload'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        user_id = get_current_user_id(conn)
        now = datetime.datetime.now()
        now_str = now.isoformat(sep=' ', timespec='seconds')

        cur.execute(
            "SELECT * FROM learning_progress WHERE user_id = ? AND word_id = ?",
            (user_id, word_id),
        )
        row = cur.fetchone()

        if row:
            ease = float(row['ease_factor'] or 2.5)
            interval = float(row['interval_days'] or 0)
            consecutive = int(row['consecutive_correct'] or 0)
            total_reviews = int(row['total_reviews'] or 0) + 1
        else:
            ease, interval, consecutive, total_reviews = 2.5, 0.0, 0, 1

        status, ease, interval, consecutive = srs_update(rating, ease, interval, consecutive)
        due = now + datetime.timedelta(days=interval)

        if row:
            cur.execute(
                """
                UPDATE learning_progress
                SET status = ?, ease_factor = ?, interval_days = ?, consecutive_correct = ?,
                    due_date = ?, last_reviewed = ?, total_reviews = ?, updated_at = ?
                WHERE user_id = ? AND word_id = ?
                """,
                (
                    status, ease, interval, consecutive,
                    due.isoformat(sep=' ', timespec='seconds'), now_str, total_reviews, now_str,
                    user_id, word_id,
                ),
            )
        else:
            cur.execute(
                """
                INSERT INTO learning_progress
                (user_id, word_id, status, ease_factor, interval_days, consecutive_correct,
                 due_date, last_reviewed, total_reviews, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id, word_id, status, ease, interval, consecutive,
                    due.isoformat(sep=' ', timespec='seconds'), now_str, total_reviews, now_str, now_str,
                ),
            )

        cur.execute(
            """
            INSERT INTO review_log (session_id, user_id, word_id, rating, response_time_ms, reviewed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (session_id, user_id, word_id, rating, response_time_ms, now_str),
        )

        if session_id:
            correct_inc = 1 if rating in ('good', 'easy') else 0
            cur.execute(
                """
                UPDATE review_sessions
                SET cards_seen = cards_seen + 1,
                    cards_correct = cards_correct + ?
                WHERE id = ?
                """,
                (correct_inc, session_id),
            )

        conn.commit()
        return jsonify({
            'ok': True,
            'correct': rating in ('good', 'easy'),
            'status': status,
            'interval_days': interval,
            'due_date': due.isoformat(sep=' ', timespec='seconds'),
        })
    finally:
        conn.close()

@learn_bp.route('/api/words/save', methods=['POST'])
def save_word_custom():
    """Lưu từ/câu từ video vào kho từ vựng và tự động thêm vào SRS."""
    data = request.get_json(silent=True) or {}
    word = (data.get('word') or '').strip()
    vietnamese = (data.get('vietnamese') or '').strip()
    video_id = (data.get('video_id') or '').strip()
    timestamp = float(data.get('timestamp') or 0.0)
    video_title = (data.get('video_title') or '').strip()

    if not word:
        return jsonify({'error': 'Vui lòng cung cấp từ hoặc câu.'}), 400

    embed_url = f"https://www.youtube.com/embed/{video_id}?start={int(timestamp)}&autoplay=1" if video_id else ""

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO vocabulary (word, vietnamese_meaning, video_id, timestamp_sec, video_title, embed_url, context)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(word) DO UPDATE SET
                vietnamese_meaning = CASE WHEN excluded.vietnamese_meaning != '' THEN excluded.vietnamese_meaning ELSE vocabulary.vietnamese_meaning END,
                video_id = CASE WHEN excluded.video_id != '' THEN excluded.video_id ELSE vocabulary.video_id END,
                timestamp_sec = CASE WHEN excluded.video_id != '' THEN excluded.timestamp_sec ELSE vocabulary.timestamp_sec END,
                embed_url = CASE WHEN excluded.embed_url != '' THEN excluded.embed_url ELSE vocabulary.embed_url END
        """, (word, vietnamese, video_id, timestamp, video_title, embed_url, f"{word} ({vietnamese})"))
        
        # Get word ID and ensure SRS card
        cur.execute("SELECT id FROM vocabulary WHERE word = ?", (word,))
        row = cur.fetchone()
        if row:
            word_id = row['id']
            user_id = get_current_user_id(conn)
            cur.execute("INSERT OR IGNORE INTO learning_progress (user_id, word_id, status) VALUES (?, ?, 'new')", (user_id, word_id))
        conn.commit()
        return jsonify({'ok': True, 'word': word})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@learn_bp.route('/api/ai/generate-example', methods=['POST'])
def generate_ai_example():
    """Sinh ra ví dụ ngữ cảnh bằng AI."""
    data = request.get_json(silent=True) or {}
    word = data.get('word')
    meaning = data.get('meaning')
    topic = data.get('topic')
    
    if not word or not meaning:
        return jsonify({'error': 'Missing word or meaning'}), 400
        
    conn = get_db_connection()
    try:
        from backend.core.db import get_current_user_id, check_and_increment_ai_usage
        user_id = get_current_user_id(conn)
        allowed, limit = check_and_increment_ai_usage(conn, request, user_id)
        if not allowed:
            return jsonify({'error': f'Bạn đã đạt giới hạn dùng AI hôm nay ({limit} lần). Hãy thử lại vào ngày mai!'}), 429
            
        from backend.services.llm_service import generate_contextual_example
        result = generate_contextual_example(word, meaning, topic)
        return jsonify(result)
    except Exception as e:
        print("API /api/ai/generate-example error:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


