# -*- coding: utf-8 -*-
"""
Script to seed Oxford & Cambridge Verb Patterns, Dependent Prepositions, and To + V-ing traps
into both SQLite (database/english_learning.db) and Supabase PostgreSQL.
"""
import os
import sys
import json
import sqlite3

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

QUESTIONS = [
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "After moving to Singapore, Ms. Lin quickly became accustomed to _______ public transportation daily.",
        "option_a": "use",
        "option_b": "using",
        "option_c": "used",
        "option_d": "to using",
        "correct_answer": "using",
        "formula": "become / get accustomed to + V-ing (Quen dần với việc gì)",
        "signal_words": "became accustomed to, daily",
        "explanation": "Cấu trúc 'become / get accustomed to + V-ing'. Chữ 'to' ở đây là GIỚI TỪ (Preposition), do đó động từ theo sau bắt buộc phải chia ở dạng V-ing (using).",
        "translation_vi": "Sau khi chuyển đến Singapore, cô Lin nhanh chóng quen dần với việc sử dụng phương tiện giao thông công cộng hàng ngày.",
        "ai_breakdown": {
            "why_correct": "Cụm cố định 'accustomed to' đóng vai trò là tính từ đi kèm giới từ 'to', theo sau bắt buộc là Danh từ hoặc Danh động từ (V-ing).",
            "options_breakdown": [
                {"letter": "A", "option": "use", "status": "Incorrect", "reason": "Sai vì to ở đây là giới từ, không đi với V nguyên thể."},
                {"letter": "B", "option": "using", "status": "Correct", "reason": "Chính xác, V-ing đứng sau giới từ to."},
                {"letter": "C", "option": "used", "status": "Incorrect", "reason": "Sai dạng quá khứ phân từ."},
                {"letter": "D", "option": "to using", "status": "Incorrect", "reason": "Thừa chữ 'to' vì đề bài đã có sẵn 'accustomed to'."}
            ],
            "toeic_tip": "Khi thấy 'accustomed to' hoặc 'used to' đứng sau to-be/get/become, 99% đáp án là V-ing!"
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "We are sincerely looking forward to _______ your company's delegation at the annual tech summit.",
        "option_a": "welcome",
        "option_b": "welcomed",
        "option_c": "welcoming",
        "option_d": "welcomes",
        "correct_answer": "welcoming",
        "formula": "look forward to + V-ing / Noun (Rất mong đợi điều gì)",
        "signal_words": "looking forward to, delegation",
        "explanation": "Cấu trúc thư tín thương mại kinh điển trong TOEIC: 'look forward to + V-ing'. 'To' là giới từ, nên động từ welcome phải thêm đuôi -ing (welcoming).",
        "translation_vi": "Chúng tôi rất chân thành mong đợi được chào đón phái đoàn của quý công ty tại hội nghị thượng đỉnh công nghệ thường niên.",
        "ai_breakdown": {
            "why_correct": "'look forward to' luôn đi với V-ing hoặc Danh từ (ví dụ: look forward to the meeting).",
            "options_breakdown": [
                {"letter": "A", "option": "welcome", "status": "Incorrect", "reason": "Bẫy V nguyên thể phổ biến nhất của thí sinh."},
                {"letter": "B", "option": "welcomed", "status": "Incorrect", "reason": "Sai thì quá khứ."},
                {"letter": "C", "option": "welcoming", "status": "Correct", "reason": "Chính xác theo cấu trúc look forward to + V-ing."},
                {"letter": "D", "option": "welcomes", "status": "Incorrect", "reason": "Sai dạng chia ngôi số ít."}
            ],
            "toeic_tip": "Gặp 'look forward to' trong đề thi TOEIC Part 5 hoặc Email Part 6/7, hãy chọn ngay V-ing!"
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "Several senior board members strongly objected to _______ the proposed restructuring plan.",
        "option_a": "implement",
        "option_b": "implementing",
        "option_c": "implemented",
        "option_d": "implementation",
        "correct_answer": "implementing",
        "formula": "object to + V-ing + Object (Phản đối việc thực hiện...)",
        "signal_words": "objected to, the proposed restructuring plan",
        "explanation": "Cấu trúc 'object to + V-ing / Noun'. Do phía sau có tân ngữ 'the proposed restructuring plan' nên cần một Danh động từ (implementing) để nhận tân ngữ đó.",
        "translation_vi": "Một số thành viên hội đồng quản trị cấp cao đã kịch liệt phản đối việc thực hiện kế hoạch tái cơ cấu được đề xuất.",
        "ai_breakdown": {
            "why_correct": "Sau 'object to' dùng V-ing. 'Implementation' là danh từ nhưng không thể đi trực tiếp với cụm danh từ tân ngữ phía sau mà không có giới từ 'of'.",
            "options_breakdown": [
                {"letter": "A", "option": "implement", "status": "Incorrect", "reason": "Sai vì 'to' trong 'object to' là giới từ."},
                {"letter": "B", "option": "implementing", "status": "Correct", "reason": "Đúng dạng V-ing mang tân ngữ phía sau."},
                {"letter": "C", "option": "implemented", "status": "Incorrect", "reason": "Sai dạng phân từ."},
                {"letter": "D", "option": "implementation", "status": "Incorrect", "reason": "Danh từ không nhận trực tiếp tân ngữ 'the plan' được."}
            ],
            "toeic_tip": "Object to + V-ing / Noun = Phản đối. Tránh nhầm với Objective (Mục tiêu)."
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "The CEO emphasized that our firm is fully committed to _______ high ethical standards in all transactions.",
        "option_a": "uphold",
        "option_b": "upholding",
        "option_c": "upheld",
        "option_d": "upholds",
        "correct_answer": "upholding",
        "formula": "be committed to + V-ing / Noun (Cam kết / Tận tâm với việc gì)",
        "signal_words": "committed to, high ethical standards",
        "explanation": "Cấu trúc 'be committed to + V-ing' (cam kết làm việc gì). 'To' ở đây là giới từ, nên ta chọn V-ing (upholding).",
        "translation_vi": "Tổng giám đốc nhấn mạnh rằng công ty chúng tôi hoàn toàn cam kết duy trì các tiêu chuẩn đạo đức cao trong mọi giao dịch.",
        "ai_breakdown": {
            "why_correct": "'committed to' đòi hỏi Danh động từ hoặc Danh từ phía sau.",
            "options_breakdown": [
                {"letter": "A", "option": "uphold", "status": "Incorrect", "reason": "Bẫy V nguyên thể."},
                {"letter": "B", "option": "upholding", "status": "Correct", "reason": "Chính xác, V-ing duy trì tiêu chuẩn."},
                {"letter": "C", "option": "upheld", "status": "Incorrect", "reason": "Dạng quá khứ sai."},
                {"letter": "D", "option": "upholds", "status": "Incorrect", "reason": "Sai dạng chia động từ."}
            ],
            "toeic_tip": "Bộ ba cam kết: be committed to = be dedicated to = be devoted to (+ V-ing)!"
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "Frequent physical exercise and a balanced diet contribute significantly to _______ chronic diseases.",
        "option_a": "prevent",
        "option_b": "preventing",
        "option_c": "prevented",
        "option_d": "prevention",
        "correct_answer": "preventing",
        "formula": "contribute to + V-ing + Object (Góp phần vào việc ngăn chặn...)",
        "signal_words": "contribute to, chronic diseases",
        "explanation": "Cấu trúc 'contribute to + V-ing / Noun' (đóng góp/góp phần vào). Do có tân ngữ 'chronic diseases' phía sau nên ta chọn V-ing (preventing).",
        "translation_vi": "Tập thể dục thường xuyên và chế độ ăn cân bằng góp phần đáng kể vào việc ngăn ngừa các bệnh mãn tính.",
        "ai_breakdown": {
            "why_correct": "'contribute to' có 'to' là giới từ. 'prevention' là danh từ nếu dùng phải có 'of' (prevention of diseases).",
            "options_breakdown": [
                {"letter": "A", "option": "prevent", "status": "Incorrect", "reason": "Sai vì to là giới từ."},
                {"letter": "B", "option": "preventing", "status": "Correct", "reason": "Chính xác V-ing."},
                {"letter": "C", "option": "prevented", "status": "Incorrect", "reason": "Sai thì."},
                {"letter": "D", "option": "prevention", "status": "Incorrect", "reason": "Thiếu 'of' trước danh từ tân ngữ."}
            ],
            "toeic_tip": "Lead to + V-ing / Contribute to + V-ing: 'to' luôn luôn là Giới từ!"
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "The suspect finally admitted to _______ confidential blueprints from the research lab.",
        "option_a": "steal",
        "option_b": "stealing",
        "option_c": "stole",
        "option_d": "stolen",
        "correct_answer": "stealing",
        "formula": "admit (to) + V-ing (Thú nhận đã làm việc gì)",
        "signal_words": "admitted to, blueprints",
        "explanation": "Cấu trúc 'admit to + V-ing' hoặc 'admit + V-ing' (thú nhận đã làm gì). Động từ theo sau luôn chia V-ing (stealing).",
        "translation_vi": "Nghi phạm cuối cùng đã thú nhận việc đánh cắp các bản thiết kế bí mật từ phòng thí nghiệm nghiên cứu.",
        "ai_breakdown": {
            "why_correct": "Sau 'admit (to)' luôn là V-ing.",
            "options_breakdown": [
                {"letter": "A", "option": "steal", "status": "Incorrect", "reason": "Sai V nguyên thể."},
                {"letter": "B", "option": "stealing", "status": "Correct", "reason": "Chính xác V-ing."},
                {"letter": "C", "option": "stole", "status": "Incorrect", "reason": "Sai dạng quá khứ."},
                {"letter": "D", "option": "stolen", "status": "Incorrect", "reason": "Sai dạng phân từ."}
            ],
            "toeic_tip": "Admit to / Confess to + V-ing: Thú nhận việc đã làm."
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "The project manager insisted on _______ the code review before deploying to production.",
        "option_a": "complete",
        "option_b": "completing",
        "option_c": "completed",
        "option_d": "completion",
        "correct_answer": "completing",
        "formula": "insist on + V-ing (Khăng khăng / Kiên quyết làm việc gì)",
        "signal_words": "insisted on, the code review",
        "explanation": "Quy tắc ngữ pháp chuẩn: 'on' là giới từ, động từ đứng sau giới từ luôn ở dạng V-ing (completing) để nhận tân ngữ 'the code review'.",
        "translation_vi": "Quản lý dự án đã kiên quyết hoàn thành việc rà soát mã nguồn trước khi triển khai lên môi trường chính thức.",
        "ai_breakdown": {
            "why_correct": "Mọi giới từ (on, in, at, for, from...) đều yêu cầu V-ing phía sau.",
            "options_breakdown": [
                {"letter": "A", "option": "complete", "status": "Incorrect", "reason": "Đứng sau giới từ on không thể dùng V-bare."},
                {"letter": "B", "option": "completing", "status": "Correct", "reason": "V-ing sau giới từ on."},
                {"letter": "C", "option": "completed", "status": "Incorrect", "reason": "Dạng phân từ sai."},
                {"letter": "D", "option": "completion", "status": "Incorrect", "reason": "Cần V-ing vì có tân ngữ 'the code review' trực tiếp."}
            ],
            "toeic_tip": "Insist on + V-ing là cụm xuất hiện liên tục trong Part 5 & 6 TOEIC."
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "The regional sales director apologized for _______ late to the quarterly business review.",
        "option_a": "arrive",
        "option_b": "arrived",
        "option_c": "arriving",
        "option_d": "arrival",
        "correct_answer": "arriving",
        "formula": "apologize (to sb) for + V-ing / Noun (Xin lỗi vì việc gì)",
        "signal_words": "apologized for, late",
        "explanation": "Cấu trúc 'apologize for + V-ing'. 'For' là giới từ chỉ nguyên nhân, theo sau là V-ing (arriving). 'Late' đóng vai trò trạng từ bổ nghĩa cho arriving.",
        "translation_vi": "Giám đốc kinh doanh khu vực đã xin lỗi vì đến muộn trong buổi đánh giá hoạt động kinh doanh hàng quý.",
        "ai_breakdown": {
            "why_correct": "Sau giới từ 'for' là V-ing.",
            "options_breakdown": [
                {"letter": "A", "option": "arrive", "status": "Incorrect", "reason": "Sau giới từ không dùng V nguyên thể."},
                {"letter": "B", "option": "arrived", "status": "Incorrect", "reason": "Sai thì."},
                {"letter": "C", "option": "arriving", "status": "Correct", "reason": "Chính xác V-ing đi với trạng từ late."},
                {"letter": "D", "option": "arrival", "status": "Incorrect", "reason": "Arrival là danh từ không đi trực tiếp với trạng từ 'late' theo cách này."}
            ],
            "toeic_tip": "Apologize for + V-ing = Xin lỗi vì đã làm gì."
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "New security protocols were designed to prevent unauthorized personnel from _______ sensitive files.",
        "option_a": "access",
        "option_b": "accessing",
        "option_c": "accessed",
        "option_d": "to access",
        "correct_answer": "accessing",
        "formula": "prevent / stop sb from + V-ing (Ngăn cản ai làm việc gì)",
        "signal_words": "prevent, from, sensitive files",
        "explanation": "Cấu trúc 'prevent someone from + V-ing' (ngăn cản ai làm gì). Sau giới từ 'from' là V-ing (accessing).",
        "translation_vi": "Các giao thức an ninh mới được thiết kế nhằm ngăn chặn nhân sự không có phận sự truy cập vào các tệp tin mật.",
        "ai_breakdown": {
            "why_correct": "Cặp động từ ngăn chặn: prevent/stop/discourage sb from + V-ing.",
            "options_breakdown": [
                {"letter": "A", "option": "access", "status": "Incorrect", "reason": "Sau giới từ from phải là V-ing."},
                {"letter": "B", "option": "accessing", "status": "Correct", "reason": "Chính xác V-ing."},
                {"letter": "C", "option": "accessed", "status": "Incorrect", "reason": "Dạng phân từ sai."},
                {"letter": "D", "option": "to access", "status": "Incorrect", "reason": "Thừa 'to' sau giới từ from."}
            ],
            "toeic_tip": "Prevent sb from + V-ing: Bẫy TOEIC kinh điển."
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "Through relentless innovation, the biotech startup succeeded in _______ a viable vaccine candidate.",
        "option_a": "develop",
        "option_b": "developing",
        "option_c": "developed",
        "option_d": "development",
        "correct_answer": "developing",
        "formula": "succeed in + V-ing + Object (Thành công trong việc làm gì)",
        "signal_words": "succeeded in, a viable vaccine candidate",
        "explanation": "Cấu trúc 'succeed in + V-ing' (thành công trong việc gì). Có tân ngữ phía sau nên chọn V-ing (developing).",
        "translation_vi": "Nhờ đổi mới sáng tạo không ngừng, công ty khởi nghiệp công nghệ sinh học đã thành công trong việc phát triển một ứng viên vắc-xin khả thi.",
        "ai_breakdown": {
            "why_correct": "Đứng sau giới từ 'in' là V-ing.",
            "options_breakdown": [
                {"letter": "A", "option": "develop", "status": "Incorrect", "reason": "V-bare sai sau in."},
                {"letter": "B", "option": "developing", "status": "Correct", "reason": "Chính xác V-ing."},
                {"letter": "C", "option": "developed", "status": "Incorrect", "reason": "Sai dạng quá khứ."},
                {"letter": "D", "option": "development", "status": "Incorrect", "reason": "Cần V-ing để nhận tân ngữ 'a viable vaccine candidate'."}
            ],
            "toeic_tip": "Succeed in + V-ing = Manage to + V-bare."
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "Before leaving the office for the long weekend, please remember _______ all computer monitors.",
        "option_a": "turn off",
        "option_b": "to turn off",
        "option_c": "turning off",
        "option_d": "turned off",
        "correct_answer": "to turn off",
        "formula": "remember to + V-bare (Nhớ phải làm gì trong tương lai)",
        "signal_words": "Before leaving, please remember",
        "explanation": "Phân biệt 'remember': 'remember to V' là nhớ phải làm một bổn phận/nhiệm vụ sắp tới. 'remember V-ing' là nhớ lại một việc đã từng làm trong quá khứ. Ở đây là lời nhắc nhở trước khi rời đi nên chọn 'to turn off'.",
        "translation_vi": "Trước khi rời văn phòng để nghỉ cuối tuần dài, xin vui lòng nhớ tắt toàn bộ màn hình máy tính.",
        "ai_breakdown": {
            "why_correct": "Lời dặn dò làm hành động trong tương lai: Remember + to V.",
            "options_breakdown": [
                {"letter": "A", "option": "turn off", "status": "Incorrect", "reason": "Thiếu 'to'."},
                {"letter": "B", "option": "to turn off", "status": "Correct", "reason": "Chính xác, nhớ phải làm gì."},
                {"letter": "C", "option": "turning off", "status": "Incorrect", "reason": "Turning off nghĩa là 'nhớ lại kỷ niệm đã từng tắt máy trong quá khứ', sai ngữ cảnh."},
                {"letter": "D", "option": "turned off", "status": "Incorrect", "reason": "Sai dạng phân từ."}
            ],
            "toeic_tip": "Remember to V = Nhiệm vụ tương lai; Remember V-ing = Kỷ niệm quá khứ."
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "During the intensive workshop, the keynote speaker stopped _______ a sip of water before continuing.",
        "option_a": "take",
        "option_b": "taking",
        "option_c": "to take",
        "option_d": "took",
        "correct_answer": "to take",
        "formula": "stop to + V-bare (Dừng lại để làm gì khác)",
        "signal_words": "stopped, before continuing",
        "explanation": "Phân biệt 'stop': 'stop to V' là tạm dừng hành động hiện tại để làm việc khác (dừng nói để uống ngụm nước). 'stop V-ing' là chấm dứt hoàn toàn hành động đó (stop taking: ngừng uống). Ở đây diễn giả dừng lại để uống nước rồi tiếp tục nói (before continuing), do đó chọn 'to take'.",
        "translation_vi": "Trong buổi hội thảo chuyên sâu, diễn giả chính đã dừng lại để uống một ngụm nước trước khi tiếp tục.",
        "ai_breakdown": {
            "why_correct": "'stop to V' chỉ mục đích dừng lại để làm việc gì khác.",
            "options_breakdown": [
                {"letter": "A", "option": "take", "status": "Incorrect", "reason": "Thiếu 'to'."},
                {"letter": "B", "option": "taking", "status": "Incorrect", "reason": "Stop taking nghĩa là ngừng hẳn việc uống nước, vô lý."},
                {"letter": "C", "option": "to take", "status": "Correct", "reason": "Chính xác: dừng lại để uống nước."},
                {"letter": "D", "option": "took", "status": "Incorrect", "reason": "Sai dạng quá khứ."}
            ],
            "toeic_tip": "Stop to V: Dừng ĐỂ LÀM việc khác. Stop V-ing: BỎ HẲN việc đang làm."
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "Due to budget constraints, the board of trustees decided _______ the planned facility expansion.",
        "option_a": "postpone",
        "option_b": "to postpone",
        "option_c": "postponing",
        "option_d": "postponement",
        "correct_answer": "to postpone",
        "formula": "decide + to V-bare (Quyết định làm gì)",
        "signal_words": "decided, budget constraints",
        "explanation": "'Decide' là động từ hướng tới tương lai/kế hoạch, bắt buộc đi với To-infinitive: 'decide to + V-bare' (to postpone).",
        "translation_vi": "Do hạn chế về ngân sách, ban quản trị đã quyết định hoãn việc mở rộng cơ sở vật chất theo kế hoạch.",
        "ai_breakdown": {
            "why_correct": "Động từ 'decide' luôn đi với To-infinitive.",
            "options_breakdown": [
                {"letter": "A", "option": "postpone", "status": "Incorrect", "reason": "Thiếu 'to'."},
                {"letter": "B", "option": "to postpone", "status": "Correct", "reason": "Chính xác decide to V."},
                {"letter": "C", "option": "postponing", "status": "Incorrect", "reason": "Decide không đi với V-ing."},
                {"letter": "D", "option": "postponement", "status": "Incorrect", "reason": "Không nhận trực tiếp cụm danh từ phía sau."}
            ],
            "toeic_tip": "Nhóm quyết định/kế hoạch: decide to V, plan to V, agree to V, refuse to V."
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "To maintain high productivity, analysts suggest _______ complex tasks into smaller milestones.",
        "option_a": "break",
        "option_b": "to break",
        "option_c": "breaking",
        "option_d": "broken",
        "correct_answer": "breaking",
        "formula": "suggest + V-ing (Đề xuất làm việc gì)",
        "signal_words": "suggest, into smaller milestones",
        "explanation": "'Suggest' không đi trực tiếp với 'to V' (suggest sb to do sth là SAI). Cấu trúc chuẩn: 'suggest + V-ing' (hoặc suggest that S + (should) + V-bare). Do đó chọn 'breaking'.",
        "translation_vi": "Để duy trì năng suất cao, các nhà phân tích đề xuất chia nhỏ các nhiệm vụ phức tạp thành các mốc nhỏ hơn.",
        "ai_breakdown": {
            "why_correct": "'suggest' đòi hỏi V-ing trực tiếp theo sau.",
            "options_breakdown": [
                {"letter": "A", "option": "break", "status": "Incorrect", "reason": "Thiếu V-ing."},
                {"letter": "B", "option": "to break", "status": "Incorrect", "reason": "Bẫy ngữ pháp: suggest KHÔNG BAO GIỜ đi với To-V."},
                {"letter": "C", "option": "breaking", "status": "Correct", "reason": "Chính xác suggest + V-ing."},
                {"letter": "D", "option": "broken", "status": "Incorrect", "reason": "Sai dạng phân từ."}
            ],
            "toeic_tip": "Tuyệt đối không dùng: suggest to do. Bắt buộc: suggest doing!"
        }
    },
    {
        "category": "Verb Patterns (To-V / V-ing)",
        "question": "Ten years ago, Mr. Henderson _______ five kilometers every single morning before his knee surgery.",
        "option_a": "used to run",
        "option_b": "was used to run",
        "option_c": "used to running",
        "option_d": "is used to running",
        "correct_answer": "used to run",
        "formula": "used to + V-bare (Đã từng làm gì trong quá khứ, nay không làm nữa)",
        "signal_words": "Ten years ago, before his knee surgery",
        "explanation": "Dấu hiệu 'Ten years ago' và 'before his knee surgery' chỉ một thói quen trong quá khứ đã chấm dứt hoàn toàn. Cấu trúc chuẩn là 'used to + V-bare' (used to run). Khác với 'be used to + V-ing' (đang quen với ở hiện tại).",
        "translation_vi": "Mười năm trước, ông Henderson từng chạy bộ 5 km mỗi sáng trước khi phẫu thuật đầu gối.",
        "ai_breakdown": {
            "why_correct": "'used to + V-bare' diễn tả thói quen hoặc trạng thái trong quá khứ nay không còn nữa.",
            "options_breakdown": [
                {"letter": "A", "option": "used to run", "status": "Correct", "reason": "Chính xác thói quen quá khứ đã chấm dứt."},
                {"letter": "B", "option": "was used to run", "status": "Incorrect", "reason": "Cấu trúc lai sai ngữ pháp."},
                {"letter": "C", "option": "used to running", "status": "Incorrect", "reason": "Thiếu to-be phía trước nếu muốn dùng nghĩa 'quen với'."},
                {"letter": "D", "option": "is used to running", "status": "Incorrect", "reason": "Thì hiện tại sai ngữ cảnh 'ten years ago'."}
            ],
            "toeic_tip": "Used to + V-bare (Quá khứ). Be/Get used to + V-ing (Hiện tại quen với)."
        }
    }
]

# Vocabulary words to ensure exist or enrich with Verb Pattern collocations
VOCAB_UPDATES = [
    {
        "word": "accustomed",
        "vietnamese_meaning": "Quen thuộc, quen với việc gì",
        "pos": "adjective",
        "cefr_level": "B2",
        "phon_uk": "/əˈkʌs.təmd/",
        "phon_us": "/əˈkʌs.təmd/",
        "definition": "Familiar with something and accepting it as normal or usual",
        "collocations": "become accustomed to + V-ing, be accustomed to + V-ing, grow accustomed to + V-ing",
        "synonyms": "used to, familiar with, habituated",
        "antonyms": "unaccustomed, unused to",
        "example_en": "She quickly became accustomed to living in the new city.",
        "example_vi": "Cô ấy nhanh chóng quen dần với việc sống ở thành phố mới."
    },
    {
        "word": "look forward",
        "vietnamese_meaning": "Rất mong đợi, trông ngóng",
        "pos": "phrasal verb",
        "cefr_level": "B1",
        "phon_uk": "/lʊk ˈfɔː.wəd tuː/",
        "phon_us": "/lʊk ˈfɔːr.wɚd tuː/",
        "definition": "To feel pleased and excited about something that is going to happen",
        "collocations": "look forward to + V-ing, look forward to hearing from you, eagerly look forward to",
        "synonyms": "anticipate, await, expect",
        "example_en": "I look forward to meeting you next week.",
        "example_vi": "Tôi rất mong đợi được gặp bạn vào tuần tới."
    },
    {
        "word": "object",
        "vietnamese_meaning": "Phản đối, không tán thành",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/əbˈdʒekt tuː/",
        "phon_us": "/əbˈdʒekt tuː/",
        "definition": "To feel or express opposition to or dislike of something or someone",
        "collocations": "object to + V-ing, strongly object to, have an objection to + V-ing",
        "synonyms": "oppose, protest, disagree",
        "antonyms": "approve, agree, accept",
        "example_en": "The committee objected to raising the admission fee.",
        "example_vi": "Ủy ban đã phản đối việc tăng phí vào cổng."
    },
    {
        "word": "insist (on)",
        "vietnamese_meaning": "Khăng khăng, kiên quyết đòi",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/ɪnˈsɪst ɒn/",
        "phon_us": "/ɪnˈsɪst ɑːn/",
        "definition": "To state or demand something emphatically, not accepting refusal",
        "collocations": "insist on + V-ing, insist on paying, firmly insist",
        "synonyms": "persist, demand, assert",
        "example_en": "He insisted on paying for the whole dinner.",
        "example_vi": "Anh ấy đã khăng khăng đòi trả tiền cho cả bữa tối."
    },
    {
        "word": "prevent",
        "vietnamese_meaning": "Ngăn chặn, ngăn ngừa",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/prɪˈvent/",
        "phon_us": "/prɪˈvent/",
        "definition": "To stop something from happening or someone from doing something",
        "collocations": "prevent sb from + V-ing, effectively prevent, take steps to prevent",
        "synonyms": "stop, avert, thwart, deter",
        "antonyms": "allow, encourage, facilitate",
        "example_en": "The security system prevents unauthorized users from accessing data.",
        "example_vi": "Hệ thống bảo mật ngăn chặn người dùng không phận sự truy cập dữ liệu."
    },
    {
        "word": "used to",
        "vietnamese_meaning": "Đã từng (quá khứ) / Quen với (hiện tại)",
        "pos": "modal verb",
        "cefr_level": "A2",
        "phon_uk": "/ˈjuːst tuː/",
        "phon_us": "/ˈjuːst tuː/",
        "definition": "Used to describe past habits or states (used to + V) or familiarity (be used to + V-ing)",
        "collocations": "used to + V-bare, be used to + V-ing, get used to + V-ing",
        "synonyms": "accustomed to, formerly",
        "example_en": "He used to live in Tokyo, but now he is used to living in Hanoi.",
        "example_vi": "Anh ấy từng sống ở Tokyo, nhưng giờ anh ấy đã quen sống ở Hà Nội."
    },
    {
        "word": "commit",
        "vietnamese_meaning": "Cam kết, tận tâm cống hiến",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/kəˈmɪt/",
        "phon_us": "/kəˈmɪt/",
        "definition": "To promise or dedicate oneself to a particular course of action",
        "collocations": "be committed to + V-ing, commit oneself to, fully committed to",
        "synonyms": "dedicate, devote, pledge",
        "example_en": "The firm is committed to protecting user privacy.",
        "example_vi": "Công ty cam kết bảo vệ quyền riêng tư của người dùng."
    },
    {
        "word": "contribute",
        "vietnamese_meaning": "Đóng góp, góp phần vào",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/kənˈtrɪb.juːt/",
        "phon_us": "/kənˈtrɪb.juːt/",
        "definition": "To give something in order to help achieve or provide something",
        "collocations": "contribute to + V-ing, significantly contribute to, contribute to society",
        "synonyms": "donate, assist, add to",
        "example_en": "Regular exercise contributes to improving mental health.",
        "example_vi": "Tập thể dục đều đặn góp phần cải thiện sức khỏe tinh thần."
    },
    {
        "word": "admit",
        "vietnamese_meaning": "Thú nhận, thừa nhận",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/ədˈmɪt/",
        "phon_us": "/ədˈmɪt/",
        "definition": "To agree that something is true, especially unwillingly",
        "collocations": "admit to + V-ing, freely admit, refuse to admit",
        "synonyms": "confess, acknowledge, concede",
        "antonyms": "deny, dispute",
        "example_en": "He admitted to making a major accounting mistake.",
        "example_vi": "Anh ấy đã thừa nhận việc phạm phải một sai lầm kế toán lớn."
    },
    {
        "word": "apologize",
        "vietnamese_meaning": "Xin lỗi",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/əˈpɒl.ə.dʒaɪz/",
        "phon_us": "/əˈpɑː.lə.dʒaɪz/",
        "definition": "To say that you are sorry for something that has caused inconvenience or unhappiness",
        "collocations": "apologize for + V-ing, apologize to sb, sincerely apologize",
        "synonyms": "say sorry, express regret",
        "example_en": "He apologized for arriving late to the conference.",
        "example_vi": "Anh ấy đã xin lỗi vì đến muộn tại hội nghị."
    },
    {
        "word": "succeed",
        "vietnamese_meaning": "Thành công",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/səkˈsiːd/",
        "phon_us": "/səkˈsiːd/",
        "definition": "To achieve something that you have been aiming for",
        "collocations": "succeed in + V-ing, succeed in life, finally succeed",
        "synonyms": "triumph, achieve, prosper",
        "antonyms": "fail, collapse",
        "example_en": "She succeeded in passing the challenging bar exam.",
        "example_vi": "Cô ấy đã thành công trong việc vượt qua kỳ thi luật sư đầy thử thách."
    },
    {
        "word": "avoid",
        "vietnamese_meaning": "Né tránh, tránh xa",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/əˈvɔɪd/",
        "phon_us": "/əˈvɔɪd/",
        "definition": "To stay away from someone or something, or prevent something from happening",
        "collocations": "avoid + V-ing, avoid rush hour, carefully avoid",
        "synonyms": "evade, steer clear of, shun",
        "antonyms": "confront, face",
        "example_en": "You should avoid traveling during heavy peak hours.",
        "example_vi": "Bạn nên tránh đi lại vào những giờ cao điểm đông đúc."
    },
    {
        "word": "remember",
        "vietnamese_meaning": "Nhớ, ghi nhớ",
        "pos": "verb",
        "cefr_level": "A1",
        "phon_uk": "/rɪˈmem.bər/",
        "phon_us": "/rɪˈmem.bɚ/",
        "definition": "To be able to bring to one's mind an awareness of someone or something from the past",
        "collocations": "remember to + V-bare (tương lai), remember + V-ing (quá khứ), vividly remember",
        "synonyms": "recall, recollect",
        "antonyms": "forget",
        "example_en": "Please remember to lock the door when leaving.",
        "example_vi": "Xin vui lòng nhớ khóa cửa khi rời khỏi."
    },
    {
        "word": "stop",
        "vietnamese_meaning": "Dừng lại, chấm dứt",
        "pos": "verb",
        "cefr_level": "A1",
        "phon_uk": "/stɒp/",
        "phon_us": "/stɑːp/",
        "definition": "To cease moving or operating, or to discontinue an action",
        "collocations": "stop to + V-bare (để làm việc khác), stop + V-ing (dừng hẳn hành động), abruptly stop",
        "synonyms": "halt, cease, quit",
        "antonyms": "continue, start",
        "example_en": "He stopped smoking five years ago.",
        "example_vi": "Anh ấy đã bỏ hút thuốc cách đây 5 năm."
    }
]

def seed_sqlite():
    db_paths = [
        os.path.join('database', 'english_learning.db'),
        os.path.join('backend_py', 'english_learning.db'),
        'english_learning.db'
    ]
    for db_path in db_paths:
        if not os.path.exists(db_path):
            continue

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Check if table exists
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='grammar_questions'")
        if not cur.fetchone():
            conn.close()
            continue

        inserted_q = 0
        for q in QUESTIONS:
            cur.execute("SELECT id FROM grammar_questions WHERE question = ?", (q['question'],))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO grammar_questions (
                        category, question, option_a, option_b, option_c, option_d,
                        correct_answer, explanation, formula, signal_words, translation_vi,
                        ai_breakdown_json, source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    q['category'], q['question'], q['option_a'], q['option_b'], q['option_c'], q['option_d'],
                    q['correct_answer'], q['explanation'], q['formula'], q['signal_words'], q['translation_vi'],
                    json.dumps(q['ai_breakdown'], ensure_ascii=False), 'Oxford & Cambridge Grammar'
                ))
                inserted_q += 1

        print(f"[SQLite: {db_path}] Inserted {inserted_q} new Verb Patterns grammar questions.")

        updated_v = 0
        for v in VOCAB_UPDATES:
            cur.execute("SELECT id FROM vocabulary WHERE word = ?", (v['word'],))
            row = cur.fetchone()
            topic_name = 'Cụm từ & Cấu trúc (Verb Patterns)'
            if row:
                cur.execute("""
                    UPDATE vocabulary 
                    SET collocations = ?, cefr_level = ?, pos = ?, definition = ?, example = ?, example_vi = ?, topic = ?
                    WHERE id = ?
                """, (v['collocations'], v['cefr_level'], v['pos'], v['definition'], v['example_en'], v['example_vi'], topic_name, row[0]))
                updated_v += 1
            else:
                cur.execute("""
                    INSERT INTO vocabulary (
                        word, vietnamese_meaning, pos, cefr_level, phon_uk, phon_us,
                        definition, collocations, synonyms, antonyms, example, example_vi, topic
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    v['word'], v['vietnamese_meaning'], v['pos'], v['cefr_level'], v['phon_uk'], v['phon_us'],
                    v['definition'], v['collocations'], v.get('synonyms', ''), v.get('antonyms', ''),
                    v['example_en'], v['example_vi'], topic_name
                ))
                updated_v += 1

        conn.commit()
        conn.close()
        print(f"[SQLite: {db_path}] Enriched/Inserted {updated_v} vocabulary items with Oxford Verb Patterns.")

def seed_postgres():
    supabase_url = 'postgresql://postgres.ltitthvwtiqwmddtxaxe:oHtqGtdkLPlzo1Ib@aws-1-ap-south-1.pooler.supabase.com:6543/postgres'

    try:
        import psycopg2
        import psycopg2.extras
        kwargs = {}
        if "supabase" in supabase_url.lower() and "sslmode" not in supabase_url.lower():
            kwargs['sslmode'] = 'require'
        conn = psycopg2.connect(supabase_url, **kwargs)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Sync sequence first
        try:
            cur.execute("SELECT setval(pg_get_serial_sequence('vocabulary', 'id'), COALESCE(max(id), 1) + 1) FROM vocabulary;")
            cur.execute("SELECT setval(pg_get_serial_sequence('grammar_questions', 'id'), COALESCE(max(id), 1) + 1) FROM grammar_questions;")
            conn.commit()
        except Exception:
            conn.rollback()

        inserted_q = 0
        for q in QUESTIONS:
            cur.execute("SELECT id FROM grammar_questions WHERE question = %s", (q['question'],))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO grammar_questions (
                        category, question, option_a, option_b, option_c, option_d,
                        correct_answer, explanation, formula, signal_words, translation_vi,
                        ai_breakdown_json, source
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    q['category'], q['question'], q['option_a'], q['option_b'], q['option_c'], q['option_d'],
                    q['correct_answer'], q['explanation'], q['formula'], q['signal_words'], q['translation_vi'],
                    json.dumps(q['ai_breakdown'], ensure_ascii=False), 'Oxford & Cambridge Grammar'
                ))
                inserted_q += 1

        print(f"[Postgres] Inserted {inserted_q} new Verb Patterns grammar questions.")

        updated_v = 0
        topic_name = 'Cụm từ & Cấu trúc (Verb Patterns)'
        for v in VOCAB_UPDATES:
            cur.execute("SELECT id FROM vocabulary WHERE word = %s", (v['word'],))
            row = cur.fetchone()
            if row:
                cur.execute("""
                    UPDATE vocabulary 
                    SET collocations = %s, cefr_level = %s, pos = %s, definition = %s, example = %s, example_vi = %s, topic = %s
                    WHERE id = %s
                """, (v['collocations'], v['cefr_level'], v['pos'], v['definition'], v['example_en'], v['example_vi'], topic_name, row['id']))
                updated_v += 1
            else:
                try:
                    cur.execute("""
                        INSERT INTO vocabulary (
                            word, vietnamese_meaning, pos, cefr_level, phon_uk, phon_us,
                            definition, collocations, synonyms, antonyms, example, example_vi, topic
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        v['word'], v['vietnamese_meaning'], v['pos'], v['cefr_level'], v['phon_uk'], v['phon_us'],
                        v['definition'], v['collocations'], v.get('synonyms', ''), v.get('antonyms', ''),
                        v['example_en'], v['example_vi'], topic_name
                    ))
                    updated_v += 1
                except Exception as ex:
                    print(f"[Postgres] Notice on insert {v['word']}: {ex}")
                    conn.rollback()

        conn.commit()
        conn.close()
        print(f"[Postgres] Enriched/Inserted {updated_v} vocabulary items in Supabase.")
    except Exception as e:
        print(f"[Postgres] Error: {e}")

if __name__ == '__main__':
    seed_sqlite()
    seed_postgres()
    print("[Done] All Verb Patterns data seeded successfully!")
