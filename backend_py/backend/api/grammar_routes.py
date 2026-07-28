from flask import Blueprint, request, jsonify
import json
import logging
from backend.core.db import get_db_connection
from backend.core.auth import optional_login
import flask

grammar_bp = Blueprint('grammar', __name__)

@grammar_bp.route('/api/grammar/questions', methods=['GET'])
@optional_login
def get_grammar_questions():
    category = request.args.get('category', 'All')
    limit = request.args.get('limit', 500, type=int)

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        
        # Check if table exists
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='grammar_questions'")
        if not cur.fetchone():
            return jsonify({'questions': [], 'total_in_db': 0})

        if category and category != 'All':
            cur.execute(
                "SELECT id, category, question, option_a, option_b, option_c, option_d, correct_answer, explanation, formula, signal_words, translation_vi, ai_breakdown_json FROM grammar_questions WHERE category = ? ORDER BY RANDOM() LIMIT ?",
                (category, limit)
            )
        else:
            cur.execute(
                "SELECT id, category, question, option_a, option_b, option_c, option_d, correct_answer, explanation, formula, signal_words, translation_vi, ai_breakdown_json FROM grammar_questions ORDER BY RANDOM() LIMIT ?",
                (limit,)
            )

        rows = cur.fetchall()
        
        # Get total in DB
        cur.execute("SELECT COUNT(*) FROM grammar_questions")
        total_in_db = cur.fetchone()[0]

        questions = []
        for r in rows:
            ai_data = None
            if r['ai_breakdown_json']:
                try:
                    ai_data = json.loads(r['ai_breakdown_json'])
                except Exception:
                    ai_data = None

            questions.append({
                'id': r['id'],
                'category': r['category'],
                'question': r['question'],
                'options': [r['option_a'], r['option_b'], r['option_c'], r['option_d']],
                # Removed 'correct_answer', 'explanation', 'formula', 'translation_vi'
                'ai_analysis': None # Only provide in submit step
            })

        return jsonify({'questions': questions, 'total_in_db': total_in_db})
    except Exception as e:
        flask.current_app.logger.error(f"Error fetching grammar questions: {e}")
        return jsonify({'questions': [], 'total_in_db': 0, 'error': str(e)}), 500
    finally:
        conn.close()

@grammar_bp.route('/api/grammar/ai_explain', methods=['POST'])
def ai_explain_grammar():
    data = request.json or {}
    q_id = data.get('question_id')
    q_text = data.get('question', '')
    options = data.get('options', [])
    selected = data.get('selected_option', '')
    correct = data.get('correct_answer', '')
    category = data.get('category', 'Ngữ pháp TOEIC')

    # Serve precomputed AI analysis directly from DB
    if q_id:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT ai_breakdown_json FROM grammar_questions WHERE id = ?", (q_id,))
            row = cur.fetchone()
            if row and row['ai_breakdown_json']:
                ai_dict = json.loads(row['ai_breakdown_json'])
                return jsonify({'success': True, 'analysis': ai_dict})
        except Exception as e:
            flask.current_app.logger.error(f"Error reading DB AI breakdown: {e}")
        finally:
            conn.close()

    opts_analysis = []
    letters = ['A', 'B', 'C', 'D']
    for idx, opt in enumerate(options):
        is_correct = (opt.strip().lower() == correct.strip().lower())
        status = "✅ (ĐÚNG)" if is_correct else "❌ (SAI)"
        reason = f"Đúng cấu trúc & ngữ cảnh ({category}). Đáp án '{opt}' làm cho câu hoàn chỉnh ý nghĩa." if is_correct else f"'{opt}' không phù hợp ngữ pháp hoặc nghĩa vị trí này."
        letter = letters[idx] if idx < len(letters) else str(idx + 1)
        opts_analysis.append({'letter': letter, 'option': opt, 'status': status, 'reason': reason})

    why_correct = f"Trong câu: '{q_text}', vị trí '_______' cần điền từ loại/thì phù hợp với dạng bài [{category}]. Phương án '{correct}' là lựa chọn duy nhất đáp ứng chuẩn cấu trúc ngữ pháp TOEIC."
    toeic_tip = f"💡 Mẹo thi TOEIC ({category}): Hãy nhìn 1-2 từ ngay trước & sau chỗ trống để loại trừ nhanh 3 phương án sai trong 5 giây!"

    return jsonify({
        'success': True,
        'analysis': {
            'why_correct': why_correct,
            'options_breakdown': opts_analysis,
            'toeic_tip': toeic_tip
        }
    })
