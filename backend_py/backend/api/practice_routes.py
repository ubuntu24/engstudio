from flask import Blueprint, request, jsonify
import sys
import re
import json
import os
import requests
from backend.core.auth import optional_login
from backend.services.ai_manager import (
    correct_grammar, 
    translate_vi_en, 
    _ensure_grammar_model, 
    _ensure_translation_model
)

practice_bp = Blueprint('practice', __name__)

@practice_bp.route('/correct', methods=['POST'])
def correct():
    if not _ensure_grammar_model():
        return jsonify({
            'original': '',
            'corrected': '',
            'error': 'AI model chưa sẵn sàng. Cần cài: pip install transformers torch sentencepiece'
        }), 503

    data = request.get_json(silent=True) or {}
    original_sentence = data.get('sentence', '')
    if not original_sentence.strip():
        return jsonify({'original': '', 'corrected': '', 'error': 'Vui lòng nhập một câu.'})
    try:
        return jsonify({
            'original': original_sentence,
            'corrected': correct_grammar(original_sentence),
        })
    except Exception as e:
        return jsonify({'original': original_sentence, 'corrected': '', 'error': str(e)})

@practice_bp.route('/api/practice/check', methods=['POST'])
def practice_check():
    if not _ensure_grammar_model() or not _ensure_translation_model():
        return jsonify({'error': 'AI models chưa sẵn sàng.'}), 503

    data = request.get_json(silent=True) or {}
    vi_text = data.get('original', '')
    en_text = data.get('translation', '')

    if not vi_text.strip() or not en_text.strip():
        return jsonify({'error': 'Vui lòng nhập đầy đủ câu tiếng Việt và bản dịch của bạn.'}), 400

    try:
        # Check grammar of user's English text
        corrected_en = correct_grammar(en_text)
        
        # Get AI translation of Vietnamese text to compare meaning
        reference_en = translate_vi_en(vi_text)

        feedback = ""
        # Basic diff to determine if grammar was mostly correct
        if en_text.strip().lower() == corrected_en.strip().lower():
            feedback += "✅ Ngữ pháp của bạn rất tốt!\n"
        else:
            feedback += "⚠️ Có vẻ bạn mắc vài lỗi ngữ pháp (xem câu hoàn chỉnh gợi ý bên dưới).\n"

        feedback += f"\n💡 Tham khảo câu dịch chuẩn từ AI:\n- {reference_en}"

        return jsonify({
            'feedback': feedback,
            'corrected': corrected_en
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@practice_bp.route('/api/practice/realtime_check', methods=['POST'])
def practice_realtime_check():
    if not _ensure_translation_model():
        return jsonify({'error': 'AI model chưa sẵn sàng.'}), 503

    data = request.get_json(silent=True) or {}
    vi_text = data.get('original', '')
    en_text = data.get('translation', '')

    if not vi_text.strip() or not en_text.strip():
        return jsonify({'error_indices': [], 'suggestion': None})

    try:
        reference_en = translate_vi_en(vi_text)
        
        ref_words = [w for w in re.findall(r"\b[\w'-]+\b", reference_en.lower())]
        user_words = [w for w in re.findall(r"\b[\w'-]+\b", en_text.lower())]
        
        # Cải thiện bộ từ đồng nghĩa (Hardcoded) để xử lý các câu cơ bản
        synonyms = {
            'ok': ['okay', 'fine', 'good', 'well', 'alright'],
            'good': ['ok', 'okay', 'fine', 'well', 'alright'],
            'how': ['are', 'you', 'ok', 'good', 'doing'], # Cho phép dùng ok/good thay cho how are you
        }
        
        from collections import Counter
        ref_counts = Counter(ref_words)
        
        error_indices = []
        for i, u_w in enumerate(user_words):
            is_syn = False
            if ref_counts.get(u_w, 0) > 0:
                ref_counts[u_w] -= 1
                continue
                
            for syn_key, syn_list in synonyms.items():
                if u_w in syn_list and ref_counts.get(syn_key, 0) > 0:
                    ref_counts[syn_key] -= 1
                    is_syn = True
                    break
                if u_w == syn_key:
                    for r_w in syn_list:
                        if ref_counts.get(r_w, 0) > 0:
                            ref_counts[r_w] -= 1
                            is_syn = True
                            break
                    if is_syn:
                        break
                        
            if not is_syn:
                error_indices.append(i)
        
        suggestion = None
        if error_indices:
            for r_w in ref_words:
                if r_w not in user_words:
                    match = re.search(r"\b" + re.escape(r_w) + r"\b", reference_en, re.IGNORECASE)
                    if match:
                        suggestion = match.group(0)
                    else:
                        suggestion = r_w
                    break
                    
        return jsonify({
            'error_indices': error_indices,
            'suggestion': suggestion
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

PRACTICE_SAMPLE_TOPICS = [
    {
        "id": "topic-1",
        "category": "Giao tiếp cơ bản",
        "original_vi": "Cô ấy thích đọc sách trong thư viện vào mỗi buổi chiều.",
        "reference_en": "She loves reading books in the library every afternoon."
    },
    {
        "id": "topic-2",
        "category": "Giao tiếp cơ bản",
        "original_vi": "Xin chào, rất vui được gặp bạn ngày hôm nay.",
        "reference_en": "Hello, nice to meet you today."
    },
    {
        "id": "topic-3",
        "category": "Giao tiếp cơ bản",
        "original_vi": "Thời tiết hôm nay thật đẹp và dễ chịu.",
        "reference_en": "The weather today is really beautiful and pleasant."
    },
    {
        "id": "topic-4",
        "category": "Công sở & Email",
        "original_vi": "Tôi muốn gửi cho bạn báo cáo công việc tuần này.",
        "reference_en": "I would like to send you this week's work report."
    },
    {
        "id": "topic-5",
        "category": "Công sở & Email",
        "original_vi": "Hãy xác nhận thời gian họp vào ngày mai.",
        "reference_en": "Please confirm the meeting time for tomorrow."
    },
    {
        "id": "topic-6",
        "category": "Du lịch & Khách sạn",
        "original_vi": "Tôi muốn đặt một phòng đơn cho hai đêm.",
        "reference_en": "I would like to book a single room for two nights."
    },
    {
        "id": "topic-7",
        "category": "Du lịch & Khách sạn",
        "original_vi": "Cho tôi hỏi trạm xe buýt gần nhất ở đâu?",
        "reference_en": "Excuse me, where is the nearest bus station?"
    },
    {
        "id": "topic-8",
        "category": "Học tập & Cuộc sống",
        "original_vi": "Việc học một ngôn ngữ mới đòi hỏi sự kiên trì.",
        "reference_en": "Learning a new language requires patience."
    }
]

@practice_bp.route('/api/practice/topics', methods=['GET'])
@optional_login
def get_practice_topics():
    categories = sorted(list(set(t['category'] for t in PRACTICE_SAMPLE_TOPICS)))
    return jsonify({
        'categories': categories,
        'samples': PRACTICE_SAMPLE_TOPICS
    })

@practice_bp.route('/api/practice/advanced_check', methods=['POST'])
def practice_advanced_check():
    data = request.get_json(silent=True) or {}
    vi_text = data.get('original_vi', '').strip()
    en_text = data.get('translation_en', '').strip()

    if not vi_text or not en_text:
        return jsonify({
            'valid': False,
            'score': 0,
            'errors': [],
            'reference_en': '',
            'missing_words': [],
            'extra_words': []
        })

    # Obtain reference translation - Priority: Gemini AI → Google Translate → sample list → fallback
    reference_en = ''

    # 1. Try Gemini AI (best quality translation)
    gemini_api_key = os.environ.get('GEMINI_API_KEY', '')
    if gemini_api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"Translate this Vietnamese sentence to natural English. Return ONLY the English translation, no explanation:\n{vi_text}"
            resp = model.generate_content(prompt)
            reference_en = resp.text.strip().strip('"').strip("'")
        except Exception as e:
            print(f"[practice] Gemini translation failed: {e}", flush=True)

    # 2. Fallback: Google Translate via deep-translator
    if not reference_en:
        try:
            from deep_translator import GoogleTranslator
            reference_en = GoogleTranslator(source='vi', target='en').translate(vi_text)
        except Exception as e:
            print(f"[practice] Google Translate failed: {e}", flush=True)

    # 3. Fallback: match in PRACTICE_SAMPLE_TOPICS list
    if not reference_en:
        matched_sample = next((s for s in PRACTICE_SAMPLE_TOPICS if s['original_vi'] == vi_text), None)
        if matched_sample:
            reference_en = matched_sample['reference_en']

    # 4. Last resort: use vi_text itself
    if not reference_en:
        reference_en = vi_text

    # Try Primary Engine: GPT-4o AI Grammar Engine
    try:
        from g4f.client import Client
        ai_client = Client()
        prompt = f"""You are an expert English language teacher for Vietnamese learners.
Intended Vietnamese meaning: '{vi_text}'
User English writing: '{en_text}'

Analyze for ALL errors: capitalization, spelling, grammar, verb tenses/forms (e.g., likes read -> likes reading), prepositions, missing words, and translation accuracy.

Return ONLY a JSON object with this exact structure:
{{
  "valid": boolean,
  "score": integer_0_to_100,
  "corrected_sentence": "Corrected English sentence",
  "errors": [
    {{
      "id": "err-1",
      "type": "grammar" or "meaning" or "style",
      "start": character_start_index_in_user_writing,
      "end": character_end_index_in_user_writing,
      "matched_text": "erroneous_substring",
      "suggestion": "correct_substring",
      "hint": "Pedagogical Vietnamese hint WITHOUT spoiling the exact suggestion word directly",
      "message": "Short error explanation in Vietnamese"
    }}
  ],
  "missing_words": ["missing_word_1"]
}}"""

        resp = ai_client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[{'role': 'user', 'content': prompt}],
            timeout=3.5
        )
        ai_output = resp.choices[0].message.content.strip()
        if "```" in ai_output:
            ai_output = re.sub(r"^```(json)?\n?", "", ai_output)
            ai_output = re.sub(r"\n?```$", "", ai_output).strip()

        parsed_json = json.loads(ai_output)
        if isinstance(parsed_json, dict) and 'errors' in parsed_json:
            return jsonify({
                'valid': parsed_json.get('valid', len(parsed_json.get('errors', [])) == 0),
                'score': parsed_json.get('score', 100),
                'errors': parsed_json.get('errors', []),
                'reference_en': parsed_json.get('corrected_sentence', ''),
                'missing_words': parsed_json.get('missing_words', []),
                'extra_words': []
            })
    except Exception as gpt_err:
        pass

    # Secondary Fallback Engine: LanguageTool API + MarianMT
    errors = []
    try:
        import requests
        resp = requests.post(
            'https://api.languagetool.org/v2/check',
            data={'text': en_text, 'language': 'en-US'},
            timeout=2.5
        )
        if resp.status_code == 200:
            lt_data = resp.json()
            for i, match in enumerate(lt_data.get('matches', [])):
                offset = match.get('offset', 0)
                length = match.get('length', 0)
                matched_text = en_text[offset:offset+length]
                replacements = match.get('replacements', [])
                suggestion = replacements[0]['value'] if replacements else ''
                msg = match.get('message', 'Lỗi ngữ pháp/chính tả.')
                
                hint = "Cần kiểm tra lại cấu trúc ngữ pháp hoặc thì của động từ."
                if 'to-infinitive' in msg or 'to before' in msg or 'verb' in msg.lower():
                    hint = "Cần chú ý dạng của động từ theo sau (dạng V-ing hoặc to + V)."
                elif 'uppercase' in msg.lower() or 'casing' in match.get('rule', {}).get('category', {}).get('id', '').lower():
                    hint = "Chữ cái đầu tiên đứng ở đầu câu cần phải được viết hoa."
                elif 'spelling' in match.get('rule', {}).get('issueType', '').lower():
                    hint = "Hãy kiểm tra lại chính tả của từ này."

                errors.append({
                    'id': f'ai-err-{i}',
                    'type': 'grammar',
                    'start': offset,
                    'end': offset + length,
                    'matched_text': matched_text,
                    'suggestion': suggestion,
                    'hint': hint,
                    'message': f"Lỗi Ngữ pháp / Chính tả: Từ '{matched_text}' chưa đúng."
                })
    except Exception as e:
        pass

    def normalize_contractions(text):
        text = re.sub(r"\bI'd\b", "I would", text, flags=re.IGNORECASE)
        text = re.sub(r"\byou'd\b", "you would", text, flags=re.IGNORECASE)
        text = re.sub(r"\bhe'd\b", "he would", text, flags=re.IGNORECASE)
        text = re.sub(r"\bshe'd\b", "she would", text, flags=re.IGNORECASE)
        text = re.sub(r"\bwe'd\b", "we would", text, flags=re.IGNORECASE)
        text = re.sub(r"\they'd\b", "they would", text, flags=re.IGNORECASE)
        text = re.sub(r"\bcan't\b", "cannot", text, flags=re.IGNORECASE)
        text = re.sub(r"\bdon't\b", "do not", text, flags=re.IGNORECASE)
        text = re.sub(r"\bdoesn't\b", "does not", text, flags=re.IGNORECASE)
        text = re.sub(r"\bdidn't\b", "did not", text, flags=re.IGNORECASE)
        text = re.sub(r"\bi'm\b", "i am", text, flags=re.IGNORECASE)
        text = re.sub(r"'s\b", "", text, flags=re.IGNORECASE)
        return text

    normalized_ref_en = normalize_contractions(reference_en)

    from collections import Counter
    words_matches = list(re.finditer(r"\b[\w'-]+\b", en_text))
    user_words = [m.group(0) for m in words_matches]
    user_words_lower = [w.lower() for w in user_words]

    ref_words_matches = list(re.finditer(r"\b[\w'-]+\b", normalized_ref_en))
    ref_words = [m.group(0) for m in ref_words_matches]
    ref_words_lower = [w.lower() for w in ref_words]

    user_counts = Counter(user_words_lower)
    
    synonyms = {
        'ok': ['okay', 'fine', 'good', 'well', 'alright'],
        'good': ['ok', 'okay', 'fine', 'well', 'alright'],
        'likes': ['loves', 'enjoys', 'would like'],
        'loves': ['likes', 'enjoys'],
        'want': ['would like', 'wish'],
        'i': ["i'd"],
        'would': ["i'd"],
    }


    missing_words = []
    for r_w in ref_words_lower:
        if user_counts.get(r_w, 0) == 0:
            has_syn = any(syn in user_counts for syn in synonyms.get(r_w, []))
            if not has_syn:
                missing_words.append(r_w)

    # Fallback rule-based check
    if not errors and len(user_words) > 0:
        ref_counts = Counter(ref_words_lower)
        for i, match in enumerate(words_matches):
            w = match.group(0)
            w_lower = w.lower()
            start = match.start()
            end = match.end()

            if ref_counts.get(w_lower, 0) > 0:
                ref_counts[w_lower] -= 1
                continue

            from difflib import get_close_matches
            close_ref = get_close_matches(w_lower, ref_words_lower, n=1, cutoff=0.7)
            ing_variant = w_lower + 'ing'
            if not close_ref and ing_variant in ref_words_lower:
                close_ref = [ing_variant]

            if close_ref:
                suggested = close_ref[0]
                errors.append({
                    'id': f'err-{i}',
                    'type': 'grammar',
                    'start': start,
                    'end': end,
                    'matched_text': w,
                    'suggestion': suggested,
                    'hint': "Cần chú ý dạng của động từ (VD: V-ing / to + V).",
                    'message': f"Lỗi Ngữ pháp: Từ '{w}' chưa đúng dạng."
                })
            else:
                errors.append({
                    'id': f'err-{i}',
                    'type': 'meaning',
                    'start': start,
                    'end': end,
                    'matched_text': w,
                    'suggestion': '',
                    'hint': "Từ này chưa khớp với ý nghĩa của câu mẫu tiếng Việt.",
                    'message': f"Lỗi Ngữ nghĩa: Từ '{w}' chưa phù hợp."
                })

    total_tokens = max(len(ref_words), len(user_words), 1)
    error_count = len(errors)
    score = max(0, min(100, int(100 * (1 - (error_count / total_tokens)))))
    valid = (score == 100) and (len(missing_words) == 0) and (len(errors) == 0)

    return jsonify({
        'valid': valid,
        'score': score,
        'errors': errors,
        'reference_en': reference_en,
        'missing_words': missing_words,
        'extra_words': []
    })

@practice_bp.route('/translate', methods=['POST'])
def translate():
    if not _ensure_translation_model():
        return jsonify({
            'original': '',
            'translated': '',
            'error': 'AI model chưa sẵn sàng. Cần cài: pip install transformers torch sentencepiece'
        }), 503

    data = request.get_json(silent=True) or {}
    vietnamese_text = data.get('text', '')
    if not vietnamese_text.strip():
        return jsonify({'original': '', 'translated': '', 'error': 'Vui lòng nhập văn bản tiếng Việt.'})
    try:
        return jsonify({
            'original': vietnamese_text,
            'translated': translate_vi_en(vietnamese_text),
        })
    except Exception as e:
        return jsonify({'original': vietnamese_text, 'translated': '', 'error': str(e)})
