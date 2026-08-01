import os
import sys
import json
from openai import OpenAI

API_KEY = os.environ.get("XKIRO_API_KEY") or os.environ.get("GEMINI_API_KEY")
BASE_URL = "https://api.xkiro.com/v1"
MODEL_NAME = "mistralai/ministral-14b"

client = None
if API_KEY:
    try:
        client = OpenAI(
            api_key=API_KEY,
            base_url=BASE_URL,
        )
    except Exception as e:
        print(f"⚠️ Không thể khởi tạo OpenAI client cho xKiro: {e}", file=sys.stderr)
else:
    print("⚠️ XKIRO_API_KEY không được tìm thấy trong môi trường. AI context generator sẽ không hoạt động.", file=sys.stderr)

def generate_contextual_example(word, meaning, topic=None):
    """
    Sinh ra một câu ví dụ ngữ cảnh cho từ vựng tiếng Anh sử dụng xKiro API.
    """
    if not client:
        return {
            "english": f"We don't have enough context to show an example for '{word}'.",
            "vietnamese": f"Chúng tôi không có đủ ngữ cảnh để hiển thị ví dụ cho '{word}'."
        }
        
    try:
        prompt = f"""
Bạn là một giáo viên tiếng Anh chuyên nghiệp. 
Hãy tạo một câu ví dụ tiếng Anh ngắn gọn, tự nhiên, và thực tế có chứa từ vựng sau:
- Từ vựng: "{word}"
- Nghĩa tiếng Việt: "{meaning}"
"""
        if topic and topic.strip():
            prompt += f"- Ngữ cảnh/Sở thích: '{topic}'\n"
            
        prompt += """
Trả về kết quả ở định dạng JSON chính xác như sau, không kèm theo markdown (chỉ trả về chuỗi JSON):
{
    "english": "[câu ví dụ tiếng Anh]",
    "vietnamese": "[bản dịch tiếng Việt của câu ví dụ]"
}
"""
        
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.choices[0].message.content.strip()
        
        # Xóa các markdown blocks nếu LLM sinh ra
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        text = text.strip()
        
        result = json.loads(text)
        return result
    except Exception as e:
        print(f"❌ Lỗi khi sinh ví dụ AI cho từ '{word}': {e}", file=sys.stderr)
        return {
            "english": f"Example generation failed for '{word}'.",
            "vietnamese": f"Tạo ví dụ thất bại cho từ '{word}'."
        }

def translate_vi_en_with_gemini(vietnamese_text):
    if not client:
        return None
    try:
        prompt = f"""
Bạn là một phiên dịch viên chuyên nghiệp. 
Hãy dịch đoạn văn bản tiếng Việt sau sang tiếng Anh một cách tự nhiên và chính xác nhất.
Lưu ý: Chỉ trả về bản dịch tiếng Anh, tuyệt đối không kèm theo bất kỳ giải thích, dấu ngoặc kép, hay ký tự nào khác.

Văn bản cần dịch:
{vietnamese_text}
"""
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.choices[0].message.content.strip()
        return text
    except Exception as e:
        print(f"❌ Lỗi khi dịch bằng xKiro AI: {e}", file=sys.stderr)
        return None
