import re
import time
from concurrent.futures import ThreadPoolExecutor
from deep_translator import GoogleTranslator

def smart_format_and_translate_lines(raw_lines, is_vip=False):
    """
    Tự động chuẩn hoá dòng phụ đề, gom nhóm câu ngắn và dịch song ngữ Anh - Việt.
    Nêu is_vip=True, sử dụng LLM AI (G4F / GPT-4o-mini) với ngữ cảnh tự nhiên.
    """
    if not raw_lines:
        return []

    # Step 1: Clean and reflow subtitle lines
    clean = []
    for l in raw_lines:
        t = re.sub(r'\s+', ' ', l.get('en', '') if isinstance(l, dict) else getattr(l, 'text', '')).strip()
        s = float(l.get('start', 0.0) if isinstance(l, dict) else getattr(l, 'start', 0.0))
        d = float(l.get('duration', 2.0) if isinstance(l, dict) else getattr(l, 'duration', 2.0))
        if t and not t.startswith('['):
            clean.append({'start': s, 'duration': d, 'en': t})
    clean.sort(key=lambda x: x['start'])

    for i in range(len(clean) - 1):
        if clean[i]['start'] + clean[i]['duration'] > clean[i+1]['start']:
            clean[i]['duration'] = max(0.2, round(clean[i+1]['start'] - clean[i]['start'], 3))

    reflowed = []
    i = 0
    while i < len(clean):
        curr = dict(clean[i])
        while i + 1 < len(clean):
            nxt = clean[i + 1]
            gap = nxt['start'] - (curr['start'] + curr['duration'])
            words_curr = curr['en'].split()
            words_nxt = nxt['en'].split()
            total_dur = (nxt['start'] + nxt['duration']) - curr['start']
            
            curr_text = curr['en'].strip()
            ends_with_punctuation = curr_text.endswith('.') or curr_text.endswith('?') or curr_text.endswith('!')
            
            should_join = (not ends_with_punctuation) and (total_dur <= 12.0)
            if len(curr_text.split()) <= 3 and total_dur <= 7.0:
                should_join = True
                
            if should_join:
                curr['duration'] = round((nxt['start'] + nxt['duration']) - curr['start'], 3)
                curr['en'] = curr['en'] + ' ' + nxt['en']
                i += 1
            else:
                break
        reflowed.append(curr)
        i += 1

    translator = GoogleTranslator(source='en', target='vi')
    
    # Step 2: Smart LLM Batch translation for natural context
    llm_success = False
    result = []
    if is_vip:
        try:
            from g4f.client import Client
            client = Client()
            
            chunk_size = 15
            chunks = [reflowed[i:i + chunk_size] for i in range(0, len(reflowed), chunk_size)]
            
            def sanitize_vi(vi, en):
                vi = re.sub(r'[\*\`\#]', '', vi).strip()
                if not en.startswith('"') and vi.startswith('"') and vi.endswith('"'):
                    vi = vi[1:-1].strip()
                if vi and en and en[0].isupper() and not vi[0].isupper():
                    vi = vi[0].upper() + vi[1:]
                return vi

            def trans_chunk(chunk):
                en_texts = [it['en'] for it in chunk]
                separator = " ||| "
                batch_text = separator.join(en_texts)
                prompt = (
                    f"You are an expert subtitle translator for video content. Translate English subtitles into smooth, natural, spoken Vietnamese (văn nói thuần Việt, mượt mà như lồng tiếng phim).\n\n"
                    f"Guidelines:\n"
                    f"1. Spoken Vietnamese Phrasing: Omit redundant pronouns when context makes it obvious (e.g. 'say good night to me' -> 'Nhớ chúc ngủ ngon nhé' or 'Chúc ngủ ngon đi nào', NOT 'chúc mình ngủ ngon').\n"
                    f"2. Contextual Translation: Translate idioms and phrases into natural spoken equivalents (e.g. 'I go first' before bed = 'Thôi, ngủ trước đây' / 'Ngủ trước nhé', 'hit the sack' = 'lên giường ngủ thôi', 'drop your phone down' = 'cất điện thoại đi').\n"
                    f"3. Structure: The lines are separated by '{separator}'. Return EXACTLY {len(en_texts)} lines separated by '{separator}'. If a sentence is split across lines, translate each part so they flow naturally when read sequentially in Vietnamese.\n"
                    f"4. Output ONLY the translated text separated by '{separator}'."
                    f"\n\nText:\n{batch_text}"
                )
                
                res = None
                for model_name in ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']:
                    try:
                        res = client.chat.completions.create(
                            model=model_name,
                            messages=[{'role': 'user', 'content': prompt}],
                        )
                        if res and res.choices and res.choices[0].message.content:
                            break
                    except Exception:
                        pass

                if not res or not res.choices or not res.choices[0].message.content:
                    raise ValueError("All LLM providers failed for chunk")

                llm_out = res.choices[0].message.content
                vi_texts = [x.strip() for x in llm_out.split(separator)]
                
                if len(vi_texts) != len(en_texts):
                    lines_split = [x.strip() for x in llm_out.split('\n') if x.strip() and not x.strip().startswith('Text:')]
                    if len(lines_split) == len(en_texts):
                        vi_texts = lines_split

                res_chunk = []
                for i, it in enumerate(chunk):
                    vi = vi_texts[i] if i < len(vi_texts) and vi_texts[i] else None
                    if not vi:
                        try:
                            vi = translator.translate(it['en'])
                        except Exception:
                            vi = it['en']
                    vi = sanitize_vi(vi, it['en'])
                    res_chunk.append({'start': it['start'], 'duration': max(0.3, it['duration']), 'en': it['en'], 'vi': vi})
                return res_chunk

            with ThreadPoolExecutor(max_workers=6) as pool:
                results_nested = list(pool.map(trans_chunk, chunks))
                for rc in results_nested:
                    result.extend(rc)
                    
            if result:
                llm_success = True
        except Exception as e:
            print("G4F translation fallback triggered due to:", e)
            result = []
        
    if not llm_success:
        def trans_line(it):
            en = it['en']
            start = it['start']
            dur = it['duration']
            try:
                vi = None
                for _ in range(3):
                    try:
                        vi = translator.translate(en)
                        if vi: break
                    except Exception:
                        time.sleep(0.5)
                vi = vi or en
                vi = re.sub(r'\s+', ' ', vi).strip()
                if vi and en and en[0].isupper() and not vi[0].isupper():
                    vi = vi[0].upper() + vi[1:]
            except Exception:
                vi = en
            return {'start': start, 'duration': max(0.3, dur), 'en': en, 'vi': vi}

        with ThreadPoolExecutor(max_workers=4) as pool:
            result = list(pool.map(trans_line, reflowed))

    result.sort(key=lambda x: x['start'])
    for i in range(len(result) - 1):
        if result[i]['start'] + result[i]['duration'] > result[i+1]['start']:
            result[i]['duration'] = max(0.2, round(result[i+1]['start'] - result[i]['start'], 3))

    return result
