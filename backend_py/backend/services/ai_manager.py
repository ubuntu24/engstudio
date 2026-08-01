import sys
import threading

AI_AVAILABLE = False
try:
    from transformers import T5ForConditionalGeneration, T5Tokenizer, MarianMTModel, MarianTokenizer
    AI_AVAILABLE = True
except ImportError:
    print("⚠️  transformers chưa cài. Chức năng Grammar/Translate sẽ bị tắt.", file=sys.stderr)
    print("   Cài bằng: pip install transformers torch sentencepiece", file=sys.stderr)

GRAMMAR_MODEL_NAME = 'vennify/t5-base-grammar-correction'
TRANSLATION_MODEL_NAME = 'Helsinki-NLP/opus-mt-vi-en'

_model_lock = threading.Lock()
_grammar_model = None
_grammar_tokenizer = None
_translation_model = None
_translation_tokenizer = None

def _ensure_grammar_model():
    """Load grammar model lazily on first use."""
    global _grammar_model, _grammar_tokenizer
    if _grammar_model is not None:
        return True
    if not AI_AVAILABLE:
        return False
    with _model_lock:
        if _grammar_model is not None:
            return True
        try:
            print("Đang tải model sửa lỗi ngữ pháp...", file=sys.stderr)
            _grammar_tokenizer = T5Tokenizer.from_pretrained(GRAMMAR_MODEL_NAME)
            _grammar_model = T5ForConditionalGeneration.from_pretrained(GRAMMAR_MODEL_NAME)
            print("Model sửa lỗi ngữ pháp đã được tải thành công!", file=sys.stderr)
            return True
        except Exception as e:
            print(f"❌ Không tải được model grammar: {e}", file=sys.stderr)
            return False

def _ensure_translation_model():
    """Load translation model lazily on first use."""
    global _translation_model, _translation_tokenizer
    if _translation_model is not None:
        return True
    if not AI_AVAILABLE:
        return False
    with _model_lock:
        if _translation_model is not None:
            return True
        try:
            print("Đang tải model dịch Việt -> Anh...", file=sys.stderr)
            _translation_tokenizer = MarianTokenizer.from_pretrained(TRANSLATION_MODEL_NAME)
            _translation_model = MarianMTModel.from_pretrained(TRANSLATION_MODEL_NAME)
            print("Model dịch Việt -> Anh đã được tải thành công!", file=sys.stderr)
            return True
        except Exception as e:
            print(f"❌ Không tải được model dịch: {e}", file=sys.stderr)
            return False

def correct_grammar(input_text):
    if not _ensure_grammar_model():
        return input_text
    text_with_prefix = "grammar: " + input_text
    input_ids = _grammar_tokenizer.encode(
        text_with_prefix, return_tensors='pt', max_length=256, truncation=True
    )
    outputs = _grammar_model.generate(
        input_ids, max_length=256, num_beams=4, early_stopping=True
    )
    return _grammar_tokenizer.decode(outputs[0], skip_special_tokens=True)

VIDEO_TOOLS_AVAILABLE = False
try:
    from deep_translator import GoogleTranslator
    VIDEO_TOOLS_AVAILABLE = True
except ImportError:
    pass

def translate_vi_en(vietnamese_text):
    # Ưu tiên sử dụng Gemini API
    try:
        from backend.services.llm_service import translate_vi_en_with_gemini
        translated_gemini = translate_vi_en_with_gemini(vietnamese_text)
        if translated_gemini:
            return translated_gemini
    except Exception as e:
        print(f"Lỗi khi dịch bằng Gemini API: {e}", file=sys.stderr)

    # Nếu Gemini thất bại, sử dụng API Google Translate
    if VIDEO_TOOLS_AVAILABLE:
        try:
            translated = GoogleTranslator(source='vi', target='en').translate(vietnamese_text)
            if translated:
                return translated
        except Exception as e:
            print(f"Lỗi khi dịch bằng GoogleTranslator API, chuyển sang local model: {e}", file=sys.stderr)
            
    # Fallback về Local Model (Helsinki-NLP)
    if _ensure_translation_model():
        try:
            batch = _translation_tokenizer([vietnamese_text], return_tensors="pt")
            generated_ids = _translation_model.generate(**batch)
            return _translation_tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        except Exception as e:
            print(f"Lỗi khi dịch bằng local model: {e}", file=sys.stderr)

    return ""
