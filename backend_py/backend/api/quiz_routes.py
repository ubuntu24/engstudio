from flask import Blueprint, request, jsonify
import random
import json
from backend.core.db import get_db_connection, get_current_user_id
from backend.core.auth import login_required

quiz_bp = Blueprint('quiz', __name__)

@quiz_bp.route('/api/quiz/info', methods=['GET'])
def quiz_info():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        user_id = get_current_user_id(conn)
        
        cur.execute("SELECT COUNT(*) as c FROM vocabulary")
        total_vocab = cur.fetchone()['c'] or 0
        
        total_learned = 0
        learned_map = {}
        if user_id:
            cur.execute("SELECT COUNT(*) as c FROM learning_progress WHERE user_id = ?", (user_id,))
            total_learned = cur.fetchone()['c'] or 0
            
            cur.execute(
                """
                SELECT v.topic, COUNT(DISTINCT lp.word_id) as c
                FROM learning_progress lp
                JOIN vocabulary v ON v.id = lp.word_id
                WHERE lp.user_id = ? AND v.topic IS NOT NULL AND v.topic != ''
                GROUP BY v.topic
                """,
                (user_id,)
            )
            for r in cur.fetchall():
                learned_map[r['topic']] = r['c'] or 0
                
        cur.execute("SELECT topic, COUNT(*) as c FROM vocabulary WHERE topic IS NOT NULL AND topic != '' GROUP BY topic ORDER BY c DESC")
        topic_rows = cur.fetchall()
        
        topics = [
            {'name': 'All', 'display_name': 'Tất cả chủ đề', 'count': total_vocab, 'learned': total_learned}
        ] + [
            {'name': r['topic'], 'display_name': r['topic'], 'count': r['count'], 'learned': learned_map.get(r['topic'], 0)}
            for r in topic_rows
        ]
        
        return jsonify({
            'total_vocabulary': total_vocab,
            'total_learned': total_learned,
            'topics': topics,
            'is_guest': not bool(user_id)
        })
    finally:
        conn.close()

@quiz_bp.route('/api/quiz/generate', methods=['POST'])
@login_required
def quiz_generate():
    data = request.get_json(silent=True) or {}
    count = int(data.get('count', 10))
    count = max(1, min(count, 50))
    mode = data.get('mode', 'review')  # Default to 'review' (learned words)
    topic = data.get('topic', 'All')

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        user_id = get_current_user_id(conn)
        
        topic_filter = ""
        params = []
        if topic and topic != 'All' and topic != 'Tất cả':
            topic_filter = " AND v.topic = ?"
            params.append(topic)

        if mode == 'review':
            # CHỈ LẤY CÁC TỪ MÀ USER NÀY ĐÃ HỌC TRONG TIẾN TRÌNH (learning_progress)
            cur.execute(
                f"""
                SELECT v.* FROM vocabulary v
                JOIN learning_progress lp ON lp.word_id = v.id
                WHERE lp.user_id = ? AND v.vietnamese_meaning IS NOT NULL AND TRIM(v.vietnamese_meaning) != ''
                {topic_filter}
                ORDER BY RANDOM()
                LIMIT ?
                """,
                [user_id] + params + [count],
            )
            words = cur.fetchall()

            if not words:
                topic_msg = f' trong chủ đề "{topic}"' if (topic and topic != 'All' and topic != 'Tất cả') else ''
                return jsonify({
                    'questions': [],
                    'total_learned': 0,
                    'error': f'Bạn chưa có từ vựng nào đã học{topic_msg} để ôn tập. Hãy học từ mới ở phần Flashcard trước nhé!'
                }), 200
        else:
            # Từ mới ngẫu nhiên trong kho
            cur.execute(
                f"""
                SELECT v.* FROM vocabulary v
                WHERE v.vietnamese_meaning IS NOT NULL AND TRIM(v.vietnamese_meaning) != ''
                {topic_filter}
                ORDER BY RANDOM()
                LIMIT ?
                """,
                params + [count],
            )
            words = cur.fetchall()

        if not words:
            return jsonify({'questions': [], 'error': 'Không có từ nào trong danh sách.'}), 200

        # Pool for distractors
        cur.execute(
            """
            SELECT vietnamese_meaning FROM vocabulary
            WHERE vietnamese_meaning IS NOT NULL AND TRIM(vietnamese_meaning) != ''
            """
        )
        all_meanings = [r['vietnamese_meaning'] for r in cur.fetchall()]

        questions = []
        for w in words:
            correct = w['vietnamese_meaning']
            distractors = [m for m in all_meanings if m != correct]
            random.shuffle(distractors)
            options = distractors[:3] + [correct]
            random.shuffle(options)

            questions.append({
                'id': w['id'],
                'type': 'mcq',
                'word': w['word'],
                'options': options,
                # Removed 'answer' and 'correct_index' to prevent leakage
            })

        return jsonify({'questions': questions})
    finally:
        conn.close()

@quiz_bp.route('/api/quiz/submit', methods=['POST'])
@login_required
def quiz_submit():
    data = request.get_json(silent=True) or {}
    question_type = data.get('type')
    question_id = data.get('id')
    user_answer = data.get('answer')
    
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        if question_type == 'mcq':
            cur.execute("SELECT vietnamese_meaning FROM vocabulary WHERE id = ?", (question_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Word not found'}), 404
            
            correct_answer = row['vietnamese_meaning']
            is_correct = user_answer == correct_answer
            return jsonify({
                'correct': is_correct,
                'correct_answer': correct_answer
            })
        elif question_type == 'grammar':
            cur.execute("SELECT correct_answer, explanation, formula, translation_vi, ai_breakdown_json FROM grammar_questions WHERE id = ?", (question_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Question not found'}), 404
                
            correct_answer = row['correct_answer']
            is_correct = user_answer == correct_answer
            
            ai_data = None
            if row['ai_breakdown_json']:
                try:
                    ai_data = json.loads(row['ai_breakdown_json'])
                except Exception:
                    pass
                    
            return jsonify({
                'correct': is_correct,
                'correct_answer': correct_answer,
                'explanation': row['explanation'] or f"Đáp án đúng là {correct_answer}.",
                'formula': row['formula'] or '',
                'translation_vi': row['translation_vi'] or '',
                'ai_analysis': ai_data
            })
            
        return jsonify({'error': 'Invalid question type'}), 400
    finally:
        conn.close()

@quiz_bp.route('/api/quiz/<int:word_id>')
@login_required
def get_quiz_data(word_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM vocabulary WHERE id=?", (word_id,))
        correct_word = cur.fetchone()
        if not correct_word:
            return jsonify({'error': 'Word not found'}), 404

        cur.execute(
            """
            SELECT * FROM vocabulary
            WHERE id != ?
            ORDER BY RANDOM()
            LIMIT 3
            """,
            (word_id,),
        )
        wrong_words = cur.fetchall()
        options = [dict(w) for w in wrong_words]
        options.append(dict(correct_word))
        random.shuffle(options)

        return jsonify({
            'question': correct_word['vietnamese_meaning'],
            'options': [{'word': opt['word'], 'id': opt['id']} for opt in options],
            'correct_id': correct_word['id'],
        })
    finally:
        conn.close()
