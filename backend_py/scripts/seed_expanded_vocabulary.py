# -*- coding: utf-8 -*-
"""
Seed 65+ Oxford & Cambridge Verb Patterns and Collocations into vocabulary table
across both SQLite and Supabase PostgreSQL.
"""
import os
import sys
import json
import sqlite3

sys.stdout.reconfigure(encoding='utf-8')

VOCABULARY_DATA = [
    # --- Group 1: To + V-ing Traps & Commitments ---
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
        "example_en": "I sincerely look forward to welcoming your delegation next week.",
        "example_vi": "Tôi rất chân thành mong đợi được chào đón phái đoàn của quý vị vào tuần tới."
    },
    {
        "word": "accustomed",
        "vietnamese_meaning": "Quen thuộc, quen dần với việc gì",
        "pos": "adjective",
        "cefr_level": "B2",
        "phon_uk": "/əˈkʌs.təmd/",
        "phon_us": "/əˈkʌs.təmd/",
        "definition": "Familiar with something and accepting it as normal or usual",
        "collocations": "become accustomed to + V-ing, be accustomed to + V-ing, grow accustomed to + V-ing",
        "synonyms": "used to, familiar with, inured to",
        "antonyms": "unaccustomed, unfamiliar",
        "example_en": "She quickly became accustomed to living alone in the big city.",
        "example_vi": "Cô ấy đã nhanh chóng quen dần với việc sống một mình ở thành phố lớn."
    },
    {
        "word": "used to",
        "vietnamese_meaning": "Đã từng (quá khứ) / Đang quen với (hiện tại)",
        "pos": "modal verb",
        "cefr_level": "A2",
        "phon_uk": "/ˈjuːst tuː/",
        "phon_us": "/ˈjuːst tuː/",
        "definition": "Used to express past habits (used to + V) or familiarity (be used to + V-ing)",
        "collocations": "used to + V-bare, be used to + V-ing, get used to + V-ing",
        "synonyms": "formerly, accustomed to",
        "example_en": "He used to live in Tokyo, but now he is used to living in Hanoi.",
        "example_vi": "Anh ấy từng sống ở Tokyo, nhưng giờ anh ấy đã quen sống ở Hà Nội."
    },
    {
        "word": "object",
        "vietnamese_meaning": "Phản đối, không tán thành",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/əbˈdʒekt/",
        "phon_us": "/əbˈdʒekt/",
        "definition": "To feel or express opposition to or dislike of something or someone",
        "collocations": "object to + V-ing, have an objection to + V-ing, strongly object to",
        "synonyms": "oppose, protest, disagree",
        "antonyms": "approve, support",
        "example_en": "Local residents strongly objected to building the new commercial complex.",
        "example_vi": "Cư dân địa phương đã kịch liệt phản đối việc xây dựng khu phức hợp thương mại mới."
    },
    {
        "word": "commit",
        "vietnamese_meaning": "Cam kết, tận tâm dốc lòng",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/kəˈmɪt/",
        "phon_us": "/kəˈmɪt/",
        "definition": "To promise or dedicate oneself to a particular course of action",
        "collocations": "be committed to + V-ing, commit oneself to + V-ing, firmly commit to",
        "synonyms": "dedicate, devote, pledge",
        "example_en": "Our corporation is fully committed to reducing carbon emissions by 2030.",
        "example_vi": "Tập đoàn chúng tôi hoàn toàn cam kết cắt giảm lượng khí thải carbon trước năm 2030."
    },
    {
        "word": "dedicate",
        "vietnamese_meaning": "Cống hiến, dành trọn tâm huyết",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/ˈded.ɪ.keɪt/",
        "phon_us": "/ˈded.ə.keɪt/",
        "definition": "To give all of your energy, time, etc. to something you believe in",
        "collocations": "be dedicated to + V-ing, dedicate oneself to + V-ing, dedicate time to + V-ing",
        "synonyms": "devote, commit, surrender",
        "example_en": "The organization is dedicated to helping underprivileged children get education.",
        "example_vi": "Tổ chức này tận tâm giúp đỡ trẻ em có hoàn cảnh khó khăn được tiếp cận giáo dục."
    },
    {
        "word": "devote",
        "vietnamese_meaning": "Tận tụy, hiến dâng vì việc gì",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/dɪˈvəʊt/",
        "phon_us": "/dɪˈvoʊt/",
        "definition": "To give an amount of time, attention, etc. to something",
        "collocations": "be devoted to + V-ing, devote time/energy to + V-ing, deeply devoted",
        "synonyms": "dedicate, consecrate",
        "example_en": "She has been devoted to researching renewable green energy for over a decade.",
        "example_vi": "Cô ấy đã tận tụy nghiên cứu năng lượng xanh tái tạo trong hơn một thập kỷ."
    },
    {
        "word": "admit",
        "vietnamese_meaning": "Thừa nhận, thú nhận",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/ədˈmɪt/",
        "phon_us": "/ədˈmɪt/",
        "definition": "To agree that something is true, especially unwillingly",
        "collocations": "admit to + V-ing, admit + V-ing, freely admit, refuse to admit",
        "synonyms": "confess, acknowledge, concede",
        "antonyms": "deny, refute",
        "example_en": "The suspect finally admitted to taking the confidential documents.",
        "example_vi": "Nghi phạm cuối cùng đã thú nhận việc lấy các tài liệu mật."
    },
    {
        "word": "confess",
        "vietnamese_meaning": "Thú tội, tự thú",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/kənˈfes/",
        "phon_us": "/kənˈfes/",
        "definition": "To admit that you have done something wrong or illegal",
        "collocations": "confess to + V-ing, openly confess, confess a crime",
        "synonyms": "admit, own up",
        "example_en": "He confessed to breaking the company's financial regulations.",
        "example_vi": "Anh ta đã thú nhận việc vi phạm các quy định tài chính của công ty."
    },
    {
        "word": "contribute",
        "vietnamese_meaning": "Đóng góp, góp phần vào",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/kənˈtrɪb.juːt/",
        "phon_us": "/kənˈtrɪb.juːt/",
        "definition": "To help to cause an event or situation to happen",
        "collocations": "contribute to + V-ing, significantly contribute to, contribute to society",
        "synonyms": "lead to, add to, promote",
        "example_en": "Continuous professional training contributes to enhancing employee productivity.",
        "example_vi": "Đào tạo nghiệp vụ liên tục góp phần nâng cao năng suất của nhân viên."
    },
    {
        "word": "resort",
        "vietnamese_meaning": "Viện đến, phải dùng đến cách gì",
        "pos": "verb",
        "cefr_level": "C1",
        "phon_uk": "/rɪˈzɔːt/",
        "phon_us": "/rɪˈzɔːrt/",
        "definition": "To do something that you do not want to do because you cannot find any other way of achieving something",
        "collocations": "resort to + V-ing, resort to desperate measures, avoid resorting to",
        "synonyms": "turn to, fall back on",
        "example_en": "They had to resort to cutting operational costs to avoid bankruptcy.",
        "example_vi": "Họ đã phải viện đến việc cắt giảm chi phí vận hành để tránh phá sản."
    },
    {
        "word": "adapt",
        "vietnamese_meaning": "Thích nghi, biến đổi cho phù hợp",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/əˈdæpt/",
        "phon_us": "/əˈdæpt/",
        "definition": "To change your behaviour in order to deal more successfully with a new situation",
        "collocations": "adapt to + V-ing, adapt quickly to, adapt to new circumstances",
        "synonyms": "adjust, conform, accommodate",
        "example_en": "Species must adapt to living in rapidly changing climate conditions.",
        "example_vi": "Các loài phải thích nghi với việc sống trong những điều kiện khí hậu thay đổi nhanh chóng."
    },
    {
        "word": "adjust",
        "vietnamese_meaning": "Điều chỉnh, làm quen dần",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/əˈdʒʌst/",
        "phon_us": "/əˈdʒʌst/",
        "definition": "To get used to a new situation by changing the way you behave or think",
        "collocations": "adjust to + V-ing, gradually adjust to, adjust settings",
        "synonyms": "adapt, acclimate, modify",
        "example_en": "Remote workers have gradually adjusted to collaborating via video conferences.",
        "example_vi": "Những nhân viên làm việc từ xa đã dần dần thích nghi với việc cộng tác qua các cuộc họp video."
    },
    {
        "word": "oppose",
        "vietnamese_meaning": "Phản đối, chống lại",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/əˈpəʊz/",
        "phon_us": "/əˈpoʊz/",
        "definition": "To disagree with something such as a plan or idea and try to prevent it from happening",
        "collocations": "be opposed to + V-ing, strongly opposed to, fiercely oppose",
        "synonyms": "object to, resist, fight against",
        "antonyms": "support, endorse",
        "example_en": "Environmentalists are strongly opposed to constructing the dam near the reserve.",
        "example_vi": "Các nhà bảo vệ môi trường kịch liệt phản đối việc xây dựng đập nước gần khu bảo tồn."
    },

    # --- Group 2: Special Idioms & Expressions + V-ing ---
    {
        "word": "worth",
        "vietnamese_meaning": "Đáng giá, rất đáng để làm gì",
        "pos": "adjective",
        "cefr_level": "B1",
        "phon_uk": "/wɜːθ/",
        "phon_us": "/wɝːθ/",
        "definition": "Having a value in money or rewarding enough to justify the effort",
        "collocations": "be worth + V-ing, well worth visiting, not worth bothering",
        "synonyms": "rewarding, justifiable",
        "example_en": "That museum is definitely worth visiting if you have a spare afternoon.",
        "example_vi": "Bảo tàng đó chắc chắn rất đáng để ghé thăm nếu bạn có một buổi chiều rảnh rỗi."
    },
    {
        "word": "busy",
        "vietnamese_meaning": "Bận rộn làm việc gì",
        "pos": "adjective",
        "cefr_level": "A2",
        "phon_uk": "/ˈbɪz.i/",
        "phon_us": "/ˈbɪz.i/",
        "definition": "Having a lot of things to do, or giving all your attention to a particular activity",
        "collocations": "be busy + V-ing, currently busy preparing, keep oneself busy",
        "synonyms": "occupied, engaged",
        "example_en": "The team is currently busy preparing the product launch presentation.",
        "example_vi": "Cả đội hiện đang bận rộn chuẩn bị bài thuyết trình ra mắt sản phẩm."
    },
    {
        "word": "difficulty",
        "vietnamese_meaning": "Sự khó khăn, trở ngại",
        "pos": "noun",
        "cefr_level": "B1",
        "phon_uk": "/ˈdɪf.ɪ.kəl.ti/",
        "phon_us": "/ˈdɪf.ə.kəl.t̬i/",
        "definition": "The fact of not being easy to do or understand",
        "collocations": "have difficulty (in) + V-ing, experience difficulty, overcome difficulty",
        "synonyms": "trouble, hardship, struggle",
        "example_en": "International tourists often have difficulty understanding local dialects.",
        "example_vi": "Khách du lịch quốc tế thường gặp khó khăn khi hiểu các tiếng địa phương."
    },
    {
        "word": "trouble",
        "vietnamese_meaning": "Rắc rối, phiền toái",
        "pos": "noun",
        "cefr_level": "B1",
        "phon_uk": "/ˈtrʌb.əl/",
        "phon_us": "/ˈtrʌb.əl/",
        "definition": "Problems or difficulties",
        "collocations": "have trouble (in) + V-ing, cause trouble, stay out of trouble",
        "synonyms": "difficulty, obstacle, hassle",
        "example_en": "We had significant trouble finding a parking spot near the hall.",
        "example_vi": "Chúng tôi đã gặp khá nhiều rắc rối khi tìm chỗ đỗ xe gần hội trường."
    },
    {
        "word": "spend",
        "vietnamese_meaning": "Dành thời gian hoặc tiền bạc",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/spend/",
        "phon_us": "/spend/",
        "definition": "To use time or money doing something",
        "collocations": "spend time/money + V-ing, spend hours reading, wisely spend",
        "synonyms": "invest, expend, devote",
        "example_en": "He spends two hours every evening reading academic papers.",
        "example_vi": "Anh ấy dành 2 tiếng mỗi tối để đọc các bài báo học thuật."
    },
    {
        "word": "waste",
        "vietnamese_meaning": "Lãng phí thời gian hoặc tiền bạc",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/weɪst/",
        "phon_us": "/weɪst/",
        "definition": "To use more of something than is necessary, or to use it in a way that is not effective",
        "collocations": "waste time/money + V-ing, waste precious energy, complete waste",
        "synonyms": "squander, misuse",
        "antonyms": "save, conserve",
        "example_en": "Don't waste valuable time arguing over minor administrative details.",
        "example_vi": "Đừng lãng phí thời gian quý báu để tranh cãi về những tiểu tiết hành chính nhỏ nhặt."
    },

    # --- Group 3: Meaning Changes (To-V vs V-ing) ---
    {
        "word": "remember",
        "vietnamese_meaning": "Nhớ, ghi nhớ",
        "pos": "verb",
        "cefr_level": "A1",
        "phon_uk": "/rɪˈmem.bər/",
        "phon_us": "/rɪˈmem.bɚ/",
        "definition": "To have in your mind or to bring into your mind knowledge from the past or a task for the future",
        "collocations": "remember to + V-bare (tương lai), remember + V-ing (quá khứ), vividly remember",
        "synonyms": "recall, recollect",
        "antonyms": "forget",
        "example_en": "Please remember to lock the front door when leaving.",
        "example_vi": "Xin vui lòng nhớ khóa cửa trước khi rời khỏi."
    },
    {
        "word": "forget",
        "vietnamese_meaning": "Quên",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/fəˈɡet/",
        "phon_us": "/fɚˈɡet/",
        "definition": "To be unable to remember a fact, something that happened, or how to do something",
        "collocations": "forget to + V-bare (quên nhiệm vụ), forget + V-ing (quên ký ức), never forget",
        "synonyms": "fail to remember, overlook",
        "antonyms": "remember",
        "example_en": "Don't forget to attach the executive summary to the client proposal.",
        "example_vi": "Đừng quên đính kèm bản tóm tắt điều hành vào bản đề xuất gửi khách hàng."
    },
    {
        "word": "regret",
        "vietnamese_meaning": "Lấy làm tiếc / Hối hận",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/rɪˈɡret/",
        "phon_us": "/rɪˈɡret/",
        "definition": "To feel sorry or sad about something, or to apologize for bad news",
        "collocations": "regret to inform/say (lấy làm tiếc), regret + V-ing (hối hận việc đã làm), deeply regret",
        "synonyms": "lament, rue, apologize",
        "example_en": "We regret to inform you that the job opening has already been filled.",
        "example_vi": "Chúng tôi rất lấy làm tiếc khi phải thông báo rằng vị trí tuyển dụng đã có người nhận."
    },
    {
        "word": "stop",
        "vietnamese_meaning": "Dừng lại, chấm dứt",
        "pos": "verb",
        "cefr_level": "A1",
        "phon_uk": "/stɒp/",
        "phon_us": "/stɑːp/",
        "definition": "To cease moving or operating, or to discontinue an action",
        "collocations": "stop to + V-bare (để làm việc khác), stop + V-ing (bỏ hẳn hành vi), abruptly stop",
        "synonyms": "halt, cease, quit",
        "antonyms": "continue, proceed",
        "example_en": "He stopped smoking five years ago.",
        "example_vi": "Anh ấy đã bỏ hút thuốc cách đây 5 năm."
    },
    {
        "word": "try",
        "vietnamese_meaning": "Cố gắng nỗ lực / Thử nghiệm",
        "pos": "verb",
        "cefr_level": "A1",
        "phon_uk": "/traɪ/",
        "phon_us": "/traɪ/",
        "definition": "To make an effort or attempt to do something, or to test a new method",
        "collocations": "try to + V-bare (cố gắng vượt khó), try + V-ing (làm thử xem sao), try hard",
        "synonyms": "attempt, endeavor, experiment",
        "example_en": "The developers are trying to eliminate the latency bug in the payment gateway.",
        "example_vi": "Các nhà phát triển đang cố gắng hết sức để loại bỏ lỗi độ trễ trong cổng thanh toán."
    },
    {
        "word": "mean",
        "vietnamese_meaning": "Có ý định / Có nghĩa là, kéo theo",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/miːn/",
        "phon_us": "/miːn/",
        "definition": "To intend to do something (mean to V), or to have a result or involve something (mean V-ing)",
        "collocations": "mean to + V-bare (có ý định), mean + V-ing (đồng nghĩa với), surely mean",
        "synonyms": "intend, signify, entail",
        "example_en": "Accepting this executive position means traveling abroad frequently.",
        "example_vi": "Nhận vị trí điều hành này đồng nghĩa với việc phải đi công tác nước ngoài thường xuyên."
    },
    {
        "word": "need",
        "vietnamese_meaning": "Cần làm gì / Cần được sửa chữa",
        "pos": "verb",
        "cefr_level": "A1",
        "phon_uk": "/niːd/",
        "phon_us": "/niːd/",
        "definition": "To require something or to have to do something",
        "collocations": "need to + V-bare (chủ động), need + V-ing (bị động: cần được làm), desperately need",
        "synonyms": "require, demand",
        "example_en": "The company's cybersecurity protocols urgently need updating.",
        "example_vi": "Các giao thức an ninh mạng của công ty đang khẩn thiết cần được cập nhật."
    },
    {
        "word": "propose",
        "vietnamese_meaning": "Đề xuất, có ý định",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/prəˈpəʊz/",
        "phon_us": "/prəˈpoʊz/",
        "definition": "To suggest a plan or action for other people to consider",
        "collocations": "propose + V-ing (đề xuất phương án), propose to + V-bare (dự định làm gì), propose a solution",
        "synonyms": "suggest, recommend, advocate",
        "example_en": "The committee proposed allocating additional funds for renewable energy.",
        "example_vi": "Ủy ban đã đề xuất phân bổ thêm ngân sách cho năng lượng tái tạo."
    },
    {
        "word": "quit",
        "vietnamese_meaning": "Từ bỏ, chấm dứt, thôi việc",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/kwɪt/",
        "phon_us": "/kwɪt/",
        "definition": "To stop doing something or leave a job or school",
        "collocations": "quit + V-ing, quit a job, quit smoking",
        "synonyms": "resign, cease, abandon",
        "example_en": "She decided to quit her banking job to pursue her passion for painting.",
        "example_vi": "Cô ấy đã quyết định từ bỏ công việc ngân hàng để theo đuổi đam mê hội họa."
    },

    # --- Group 4: Verbs Followed Only by V-ing (Gerunds) ---
    {
        "word": "avoid",
        "vietnamese_meaning": "Né tránh, tránh xa",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/əˈvɔɪd/",
        "phon_us": "/əˈvɔɪd/",
        "definition": "To stay away from someone or something, or prevent something bad from happening",
        "collocations": "avoid + V-ing, avoid rush hour, strictly avoid",
        "synonyms": "evade, shun, steer clear of",
        "antonyms": "face, confront",
        "example_en": "You should strictly avoid traveling during peak holiday hours.",
        "example_vi": "Bạn nên tuyệt đối tránh đi lại vào những giờ cao điểm ngày lễ."
    },
    {
        "word": "appreciate",
        "vietnamese_meaning": "Đánh giá cao, rất cảm kích",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/əˈpriː.ʃi.eɪt/",
        "phon_us": "/əˈpriː.ʃi.eɪt/",
        "definition": "To recognize how good someone or something is and to value him, her, or it",
        "collocations": "appreciate + V-ing, greatly appreciate, highly appreciate",
        "synonyms": "value, treasure, be grateful for",
        "example_en": "We would truly appreciate receiving your candid feedback.",
        "example_vi": "Chúng tôi sẽ vô cùng cảm kích khi nhận được phản hồi chân thành của bạn."
    },
    {
        "word": "anticipate",
        "vietnamese_meaning": "Dự đoán, lường trước",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/ænˈtɪs.ɪ.peɪt/",
        "phon_us": "/ænˈtɪs.ə.peɪt/",
        "definition": "To imagine or expect that something will happen",
        "collocations": "anticipate + V-ing, eagerly anticipate, anticipate growth",
        "synonyms": "expect, foresee, predict",
        "example_en": "Economists anticipate seeing a noticeable rebound in retail sales this quarter.",
        "example_vi": "Các nhà kinh tế dự đoán sẽ thấy sự phục hồi rõ rệt trong doanh số bán lẻ quý này."
    },
    {
        "word": "consider",
        "vietnamese_meaning": "Cân nhắc, xem xét",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/kənˈsɪd.ər/",
        "phon_us": "/kənˈsɪd.ɚ/",
        "definition": "To spend time thinking about a possibility or making a decision",
        "collocations": "consider + V-ing, seriously consider, carefully consider",
        "synonyms": "contemplate, deliberate, weigh",
        "example_en": "The board of directors is seriously considering expanding into Southeast Asian markets.",
        "example_vi": "Hội đồng quản trị đang nghiêm túc cân nhắc việc mở rộng sang các thị trường Đông Nam Á."
    },
    {
        "word": "delay",
        "vietnamese_meaning": "Trì hoãn, chậm trễ",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/dɪˈleɪ/",
        "phon_us": "/dɪˈleɪ/",
        "definition": "To make something happen at a later time than originally planned",
        "collocations": "delay + V-ing, delay announcing, delay payment",
        "synonyms": "postpone, stall, defer",
        "example_en": "They delayed announcing the quarterly figures due to an internal audit.",
        "example_vi": "Họ đã trì hoãn việc công bố số liệu quý do có cuộc kiểm toán nội bộ."
    },
    {
        "word": "postpone",
        "vietnamese_meaning": "Hoãn lại, dời lịch",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/pəʊstˈpəʊn/",
        "phon_us": "/poʊstˈpoʊn/",
        "definition": "To delay an event and arrange for it to take place at a later time",
        "collocations": "postpone + V-ing, postpone launching, indefinitely postpone",
        "synonyms": "put off, reschedule, suspend",
        "example_en": "Due to adverse weather, officials postponed launching the satellite.",
        "example_vi": "Do thời tiết bất lợi, các quan chức đã hoãn việc phóng vệ tinh."
    },
    {
        "word": "deny",
        "vietnamese_meaning": "Phủ nhận",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/dɪˈnaɪ/",
        "phon_us": "/dɪˈnaɪ/",
        "definition": "To say that something is not true",
        "collocations": "deny + V-ing, firmly deny, vehemently deny",
        "synonyms": "disclaim, refute, repudiate",
        "antonyms": "admit, acknowledge",
        "example_en": "The spokesperson firmly denied leaking sensitive details to the press.",
        "example_vi": "Người phát ngôn đã kiên quyết phủ nhận việc làm rò rỉ các chi tiết nhạy cảm cho báo chí."
    },
    {
        "word": "enjoy",
        "vietnamese_meaning": "Thích thú, tận hưởng",
        "pos": "verb",
        "cefr_level": "A1",
        "phon_uk": "/ɪnˈdʒɔɪ/",
        "phon_us": "/ɪnˈdʒɔɪ/",
        "definition": "To get pleasure from something",
        "collocations": "enjoy + V-ing, thoroughly enjoy, enjoy life",
        "synonyms": "relish, take pleasure in",
        "example_en": "Our staff enjoy collaborating on open-source coding projects together.",
        "example_vi": "Nhân viên của chúng tôi thích thú việc cùng nhau cộng tác trong các dự án lập trình mã nguồn mở."
    },
    {
        "word": "fancy",
        "vietnamese_meaning": "Thích, muốn làm gì",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/ˈfæn.si/",
        "phon_us": "/ˈfæn.si/",
        "definition": "To want to have or do something",
        "collocations": "fancy + V-ing, do you fancy + V-ing?",
        "synonyms": "feel like, crave, desire",
        "example_en": "Do you fancy going out for authentic Italian pizza tonight?",
        "example_vi": "Tối nay bạn có hứng đi ăn pizza Ý chính hiệu không?"
    },
    {
        "word": "finish",
        "vietnamese_meaning": "Hoàn thành, làm xong",
        "pos": "verb",
        "cefr_level": "A1",
        "phon_uk": "/ˈfɪn.ɪʃ/",
        "phon_us": "/ˈfɪn.ɪʃ/",
        "definition": "To complete something or come to the end of an activity",
        "collocations": "finish + V-ing, finish reviewing, successfully finish",
        "synonyms": "complete, conclude, wrap up",
        "example_en": "Once you finish reviewing the contract, please sign on the dotted line.",
        "example_vi": "Khi bạn xem xét xong hợp đồng, vui lòng ký tên vào dòng chấm nhé."
    },
    {
        "word": "imagine",
        "vietnamese_meaning": "Tưởng tượng, hình dung",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/ɪˈmædʒ.ɪn/",
        "phon_us": "/ɪˈmædʒ.ɪn/",
        "definition": "To form or have a mental picture or idea of something",
        "collocations": "imagine + V-ing, can't imagine, vividly imagine",
        "synonyms": "picture, envision, visualize",
        "example_en": "I cannot imagine relocating to another continent without speaking the language.",
        "example_vi": "Tôi không thể hình dung được việc chuyển đến một châu lục khác mà không nói được ngôn ngữ đó."
    },
    {
        "word": "involve",
        "vietnamese_meaning": "Bao gồm, đòi hỏi, liên quan",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/ɪnˈvɒlv/",
        "phon_us": "/ɪnˈvɑːlv/",
        "definition": "If an activity involves doing something, that thing is a necessary part of it",
        "collocations": "involve + V-ing, directly involve, involve traveling",
        "synonyms": "entail, require, encompass",
        "example_en": "The new auditor role involves traveling to client branch offices twice a month.",
        "example_vi": "Vai trò kiểm toán viên mới đòi hỏi phải đi công tác đến các chi nhánh của khách hàng hai lần mỗi tháng."
    },
    {
        "word": "mind",
        "vietnamese_meaning": "Bận tâm, phiền lòng",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/maɪnd/",
        "phon_us": "/maɪnd/",
        "definition": "To be annoyed or worried by something",
        "collocations": "don't mind + V-ing, would you mind + V-ing, never mind",
        "synonyms": "care, object to",
        "example_en": "She doesn't mind working overtime if advance notification is given.",
        "example_vi": "Cô ấy không phiền lòng việc làm thêm giờ nếu được thông báo trước."
    },
    {
        "word": "miss",
        "vietnamese_meaning": "Bỏ lỡ / Nhớ việc đã từng làm",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/mɪs/",
        "phon_us": "/mɪs/",
        "definition": "To feel sad that you can no longer do something you used to do",
        "collocations": "miss + V-ing, miss seeing friends, truly miss",
        "synonyms": "long for, pine for",
        "example_en": "Since moving to the suburbs, he truly misses taking spontaneous city walks.",
        "example_vi": "Kể từ khi chuyển ra ngoại ô, anh ấy thực sự nhớ những buổi đi dạo ngẫu hứng trong thành phố."
    },
    {
        "word": "practice",
        "vietnamese_meaning": "Luyện tập, thực hành",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/ˈpræk.tɪs/",
        "phon_us": "/ˈpræk.tɪs/",
        "definition": "To do or play something regularly or repeatedly in order to become skilled at it",
        "collocations": "practice + V-ing, practice speaking English, daily practice",
        "synonyms": "rehearse, train, drill",
        "example_en": "You should practice speaking English with native speakers to build fluency.",
        "example_vi": "Bạn nên luyện tập nói tiếng Anh với người bản xứ để xây dựng sự trôi chảy."
    },
    {
        "word": "recommend",
        "vietnamese_meaning": "Khuyên bảo, gợi ý",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/ˌrek.əˈmend/",
        "phon_us": "/ˌrek.əˈmend/",
        "definition": "To suggest that a particular action is done or that someone or something is good or suitable",
        "collocations": "recommend + V-ing, strongly recommend, recommend a course",
        "synonyms": "advise, suggest, propose",
        "example_en": "Specialists strongly recommend backing up database records onto cloud servers.",
        "example_vi": "Các chuyên gia nhiệt liệt khuyên nên sao lưu dữ liệu cơ sở dữ liệu lên các máy chủ đám mây."
    },
    {
        "word": "resist",
        "vietnamese_meaning": "Kháng cự, kiềm chế",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/rɪˈzɪst/",
        "phon_us": "/rɪˈzɪst/",
        "definition": "To stop yourself from doing something that you want to do",
        "collocations": "resist + V-ing, can't resist, stubbornly resist",
        "synonyms": "withstand, hold out against, refrain from",
        "example_en": "She couldn't resist checking her phone notifications every five minutes.",
        "example_vi": "Cô ấy đã không thể kiềm chế được việc kiểm tra thông báo điện thoại cứ sau mỗi 5 phút."
    },
    {
        "word": "risk",
        "vietnamese_meaning": "Liều lĩnh, mạo hiểm",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/rɪsk/",
        "phon_us": "/rɪsk/",
        "definition": "To do something although there is a chance of a bad result",
        "collocations": "risk + V-ing, risk losing, take a risk",
        "synonyms": "gamble, hazard, jeopardize",
        "example_en": "Uninsured investors risk losing substantial capital during market downturns.",
        "example_vi": "Các nhà đầu tư không bảo hiểm mạo hiểm việc mất đi số vốn lớn trong những đợt suy thoái thị trường."
    },
    {
        "word": "suggest",
        "vietnamese_meaning": "Đề xuất, gợi ý",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/səˈdʒest/",
        "phon_us": "/səˈdʒest/",
        "definition": "To mention an idea, possible plan, or action for other people to consider",
        "collocations": "suggest + V-ing, suggest breaking tasks, strongly suggest",
        "synonyms": "propose, recommend, advise",
        "example_en": "Coaches suggest prioritizing the three most critical tasks each morning.",
        "example_vi": "Các huấn luyện viên đề xuất ưu tiên 3 nhiệm vụ quan trọng nhất vào mỗi buổi sáng."
    },
    {
        "word": "tolerate",
        "vietnamese_meaning": "Khoan dung, dung thứ, chấp nhận",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/ˈtɒl.ər.eɪt/",
        "phon_us": "/ˈtɑː.lə.reɪt/",
        "definition": "To accept behaviour and beliefs that are different from your own, or to accept something unpleasant",
        "collocations": "tolerate + V-ing, will not tolerate, tolerate cheating",
        "synonyms": "endure, put up with, stand",
        "example_en": "The university leadership will not tolerate cheating under any circumstances.",
        "example_vi": "Ban giám hiệu trường đại học sẽ không dung thứ cho hành vi gian lận dưới bất kỳ hoàn cảnh nào."
    },

    # --- Group 5: Verbs Followed Only by To-V (Infinitives) ---
    {
        "word": "afford",
        "vietnamese_meaning": "Đủ khả năng tài chính/thời gian",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/əˈfɔːd/",
        "phon_us": "/əˈfɔːrd/",
        "definition": "To be able to buy or do something because you have enough money or time",
        "collocations": "afford to + V-bare, can't afford to, barely afford",
        "synonyms": "manage to pay, bear",
        "example_en": "As a fledgling startup, we cannot afford to lose our prime enterprise customers.",
        "example_vi": "Là một công ty khởi nghiệp non trẻ, chúng tôi không thể đủ sức để mất đi những khách hàng doanh nghiệp chủ chốt."
    },
    {
        "word": "agree",
        "vietnamese_meaning": "Đồng ý",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/əˈɡriː/",
        "phon_us": "/əˈɡriː/",
        "definition": "To have the same opinion, or to accept a proposal or idea",
        "collocations": "agree to + V-bare, agree on, readily agree",
        "synonyms": "consent, concur, assent",
        "antonyms": "disagree, refuse",
        "example_en": "Both parties readily agreed to extend the partnership agreement.",
        "example_vi": "Cả hai bên đã sẵn sàng đồng ý gia hạn thỏa thuận hợp tác."
    },
    {
        "word": "attempt",
        "vietnamese_meaning": "Nỗ lực, cố gắng vượt khó",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/əˈtempt/",
        "phon_us": "/əˈtempt/",
        "definition": "To try to make or do something",
        "collocations": "attempt to + V-bare, desperately attempt, first attempt",
        "synonyms": "try, endeavor, strive",
        "example_en": "Rescue crews attempted to reach the stranded mountaineers before nightfall.",
        "example_vi": "Các đội cứu hộ đã nỗ lực tiếp cận những người leo núi bị mắc kẹt trước khi màn đêm buông xuống."
    },
    {
        "word": "decide",
        "vietnamese_meaning": "Quyết định",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/dɪˈsaɪd/",
        "phon_us": "/dɪˈsaɪd/",
        "definition": "To choose something, especially after thinking carefully about several possibilities",
        "collocations": "decide to + V-bare, decide on, mutually decide",
        "synonyms": "choose, determine, resolve",
        "example_en": "They decided to launch the app in Japan first.",
        "example_vi": "Họ đã quyết định ra mắt ứng dụng tại Nhật Bản trước tiên."
    },
    {
        "word": "demand",
        "vietnamese_meaning": "Đòi hỏi, yêu sách",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/dɪˈmɑːnd/",
        "phon_us": "/dɪˈmænd/",
        "definition": "To ask for something forcefully, in a way that shows that you do not expect to be refused",
        "collocations": "demand to + V-bare, demand an explanation, strictly demand",
        "synonyms": "insist on, require, call for",
        "example_en": "The dissatisfied customer demanded to see the general store manager immediately.",
        "example_vi": "Vị khách hàng bất mãn đã đòi gặp người quản lý tổng cửa hàng ngay lập tức."
    },
    {
        "word": "deserve",
        "vietnamese_meaning": "Xứng đáng",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/dɪˈzɜːv/",
        "phon_us": "/dɪˈzɝːv/",
        "definition": "To have earned or to be given something because of the way you have behaved or the qualities you have",
        "collocations": "deserve to + V-bare, well deserve, richly deserve",
        "synonyms": "merit, warrant, be worthy of",
        "example_en": "Every diligent employee deserves to receive equitable pay and proper recognition.",
        "example_vi": "Mỗi nhân viên chăm chỉ đều xứng đáng nhận được mức lương công bằng và sự ghi nhận xứng đáng."
    },
    {
        "word": "expect",
        "vietnamese_meaning": "Kỳ vọng, trông đợi",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/ɪkˈspekt/",
        "phon_us": "/ɪkˈspekt/",
        "definition": "To think or believe something will happen, or someone will arrive",
        "collocations": "expect to + V-bare, expect sb to + V-bare, fully expect",
        "synonyms": "anticipate, await, look forward to",
        "example_en": "The logistics director expects to double warehouse shipping capacity by year-end.",
        "example_vi": "Giám đốc logistics kỳ vọng tăng gấp đôi năng lực vận chuyển của kho vào cuối năm."
    },
    {
        "word": "fail",
        "vietnamese_meaning": "Thất bại, không làm được gì",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/feɪl/",
        "phon_us": "/feɪl/",
        "definition": "To not succeed in what you are trying to achieve",
        "collocations": "fail to + V-bare, fail miserably, fail an exam",
        "synonyms": "fall short, collapse",
        "antonyms": "succeed",
        "example_en": "The contractor failed to deliver the construction supplies by the deadline.",
        "example_vi": "Nhà thầu đã không giao được các vật tư xây dựng trước thời hạn."
    },
    {
        "word": "hesitate",
        "vietnamese_meaning": "Ngần ngại, do dự",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/ˈhez.ɪ.teɪt/",
        "phon_us": "/ˈhez.ə.teɪt/",
        "definition": "To pause before you do or say something, often because you are uncertain or nervous",
        "collocations": "don't hesitate to + V-bare, hesitate to ask, momentary hesitation",
        "synonyms": "waver, falter, pause",
        "example_en": "Please do not hesitate to reach out if you require further assistance.",
        "example_vi": "Xin vui lòng đừng ngần ngại liên hệ nếu bạn cần thêm sự hỗ trợ."
    },
    {
        "word": "manage",
        "vietnamese_meaning": "Xoay xở, giải quyết thành công",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/ˈmæn.ɪdʒ/",
        "phon_us": "/ˈmæn.ɪdʒ/",
        "definition": "To succeed in doing or dealing with something, especially something difficult",
        "collocations": "manage to + V-bare, successfully manage, manage a business",
        "synonyms": "succeed, cope, accomplish",
        "example_en": "Despite severe disruptions, the plant managed to fulfill all customer orders.",
        "example_vi": "Bất chấp sự gián đoạn nghiêm trọng, nhà máy đã xoay xở hoàn thành tất cả đơn hàng."
    },
    {
        "word": "refuse",
        "vietnamese_meaning": "Từ chối, khước từ",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/rɪˈfjuːz/",
        "phon_us": "/rɪˈfjuːz/",
        "definition": "To say that you will not do or accept something",
        "collocations": "refuse to + V-bare, flatly refuse, refuse an offer",
        "synonyms": "decline, reject, turn down",
        "antonyms": "accept, agree",
        "example_en": "The union leaders refused to accept the revised pension proposal.",
        "example_vi": "Các lãnh đạo công đoàn đã từ chối chấp nhận đề xuất lương hưu đã sửa đổi."
    },
    {
        "word": "tend",
        "vietnamese_meaning": "Có xu hướng, thường làm gì",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/tend/",
        "phon_us": "/tend/",
        "definition": "To be likely to behave in a particular way or have a particular characteristic",
        "collocations": "tend to + V-bare, naturally tend, tend to increase",
        "synonyms": "be inclined, lean, gravitate",
        "example_en": "First-time entrepreneurs often tend to underestimate initial operational expenses.",
        "example_vi": "Những người khởi nghiệp lần đầu thường có xu hướng đánh giá thấp chi phí vận hành ban đầu."
    },

    # --- Group 6: Preposition + V-ing & Adjectives ---
    {
        "word": "insist",
        "vietnamese_meaning": "Khăng khăng, kiên quyết đòi",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/ɪnˈsɪst/",
        "phon_us": "/ɪnˈsɪst/",
        "definition": "To state or demand something emphatically, not accepting refusal",
        "collocations": "insist on + V-ing, firmly insist on, insist on paying",
        "synonyms": "persist, demand, assert",
        "example_en": "He firmly insisted on paying for the entire anniversary dinner.",
        "example_vi": "Anh ấy đã kiên quyết khăng khăng đòi trả tiền cho cả bữa tiệc tối kỷ niệm."
    },
    {
        "word": "prevent",
        "vietnamese_meaning": "Ngăn cản, ngăn ngừa",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/prɪˈvent/",
        "phon_us": "/prɪˈvent/",
        "definition": "To stop something from happening or someone from doing something",
        "collocations": "prevent sb/sth from + V-ing, effectively prevent, take steps to prevent",
        "synonyms": "avert, thwart, stop, deter",
        "antonyms": "allow, facilitate",
        "example_en": "Strict access controls effectively prevent unauthorized users from tampering with data.",
        "example_vi": "Các biện pháp kiểm soát truy cập nghiêm ngặt ngăn chặn hiệu quả người dùng không phận sự can thiệp vào dữ liệu."
    },
    {
        "word": "succeed",
        "vietnamese_meaning": "Thành công trong việc gì",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/səkˈsiːd/",
        "phon_us": "/səkˈsiːd/",
        "definition": "To achieve something that you have been aiming for",
        "collocations": "succeed in + V-ing, finally succeed in, succeed in life",
        "synonyms": "triumph, prosper, achieve",
        "antonyms": "fail",
        "example_en": "After months of rigorous preparation, she succeeded in passing the bar examination.",
        "example_vi": "Sau nhiều tháng chuẩn bị nghiêm ngặt, cô ấy đã thành công trong việc vượt qua kỳ thi luật sư."
    },
    {
        "word": "apologize",
        "vietnamese_meaning": "Xin lỗi vì đã làm gì",
        "pos": "verb",
        "cefr_level": "A2",
        "phon_uk": "/əˈpɒl.ə.dʒaɪz/",
        "phon_us": "/əˈpɑː.lə.dʒaɪz/",
        "definition": "To say that you are sorry for having caused problems or unhappiness",
        "collocations": "apologize (to sb) for + V-ing, sincerely apologize, formally apologize",
        "synonyms": "say sorry, express regret",
        "example_en": "The airline management formally apologized to passengers for canceling the flight.",
        "example_vi": "Ban quản lý hãng hàng không đã chính thức xin lỗi hành khách vì đã hủy chuyến bay."
    },
    {
        "word": "congratulate",
        "vietnamese_meaning": "Chúc mừng vì đã đạt được gì",
        "pos": "verb",
        "cefr_level": "B1",
        "phon_uk": "/kənˈɡrætʃ.ʊ.leɪt/",
        "phon_us": "/kənˈɡrætʃ.ə.leɪt/",
        "definition": "To praise someone and say that you are pleased about their success or happiness",
        "collocations": "congratulate sb on + V-ing, warmly congratulate, heartily congratulate",
        "synonyms": "felicitate, commend, applaud",
        "example_en": "Colleagues gathered to congratulate Dr. Harris on winning the chemistry award.",
        "example_vi": "Các đồng nghiệp đã tụ họp để chúc mừng Tiến sĩ Harris vì đã giành được giải thưởng hóa học."
    },
    {
        "word": "accuse",
        "vietnamese_meaning": "Buộc tội, cáo buộc",
        "pos": "verb",
        "cefr_level": "B2",
        "phon_uk": "/əˈkjuːz/",
        "phon_us": "/əˈkjuːz/",
        "definition": "To say that someone has done something morally wrong, illegal, or unkind",
        "collocations": "accuse sb of + V-ing, falsely accuse, formally accuse",
        "synonyms": "charge with, indict, blame",
        "antonyms": "absolve, exonerate",
        "example_en": "The former executive was formally accused of insider trading by regulators.",
        "example_vi": "Cựu giám đốc điều hành đã bị các cơ quan quản lý chính thức cáo buộc giao dịch nội gián."
    },
    {
        "word": "capable",
        "vietnamese_meaning": "Có năng lực, có khả năng làm được gì",
        "pos": "adjective",
        "cefr_level": "B2",
        "phon_uk": "/ˈkeɪ.pə.bəl/",
        "phon_us": "/ˈkeɪ.pə.bəl/",
        "definition": "Able to do things effectively and skilfully, and to achieve results",
        "collocations": "be capable of + V-ing, highly capable, fully capable",
        "synonyms": "competent, able, proficient",
        "antonyms": "incapable",
        "example_en": "This cutting-edge AI server is capable of processing billions of tokens per minute.",
        "example_vi": "Máy chủ AI tiên tiến này có khả năng xử lý hàng tỷ token mỗi phút."
    },
    {
        "word": "responsible",
        "vietnamese_meaning": "Chịu trách nhiệm về việc gì",
        "pos": "adjective",
        "cefr_level": "B1",
        "phon_uk": "/rɪˈspɒn.sɪ.bəl/",
        "phon_us": "/rɪˈspɑːn.sə.bəl/",
        "definition": "Having control and authority over something or someone and the duty of taking care of it, him, or her",
        "collocations": "be responsible for + V-ing, solely responsible, hold responsible",
        "synonyms": "accountable, liable, in charge",
        "example_en": "The project coordinator is solely responsible for ensuring milestone delivery.",
        "example_vi": "Điều phối viên dự án chịu trách nhiệm duy nhất cho việc bảo đảm tiến độ bàn giao mốc."
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
        topic_name = 'Cụm từ & Cấu trúc (Verb Patterns)'
        updated_count = 0

        for v in VOCABULARY_DATA:
            cur.execute("SELECT id FROM vocabulary WHERE word = ?", (v['word'],))
            row = cur.fetchone()
            if row:
                cur.execute("""
                    UPDATE vocabulary 
                    SET collocations = ?, cefr_level = ?, pos = ?, definition = ?, example = ?, example_vi = ?, topic = ?,
                        phon_uk = ?, phon_us = ?, vietnamese_meaning = ?
                    WHERE id = ?
                """, (
                    v['collocations'], v['cefr_level'], v['pos'], v['definition'], v['example_en'], v['example_vi'],
                    topic_name, v['phon_uk'], v['phon_us'], v['vietnamese_meaning'], row[0]
                ))
                updated_count += 1
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
                updated_count += 1

        conn.commit()
        conn.close()
        print(f"[SQLite: {db_path}] Seeded {updated_count} vocabulary items for topic '{topic_name}'.")

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
        topic_name = 'Cụm từ & Cấu trúc (Verb Patterns)'

        try:
            cur.execute("SELECT setval(pg_get_serial_sequence('vocabulary', 'id'), COALESCE(max(id), 1) + 1) FROM vocabulary;")
            conn.commit()
        except Exception:
            conn.rollback()

        updated_count = 0
        for v in VOCABULARY_DATA:
            cur.execute("SELECT id FROM vocabulary WHERE word = %s", (v['word'],))
            row = cur.fetchone()
            if row:
                cur.execute("""
                    UPDATE vocabulary
                    SET collocations = %s, cefr_level = %s, pos = %s, definition = %s, example = %s, example_vi = %s, topic = %s,
                        phon_uk = %s, phon_us = %s, vietnamese_meaning = %s
                    WHERE id = %s
                """, (
                    v['collocations'], v['cefr_level'], v['pos'], v['definition'], v['example_en'], v['example_vi'],
                    topic_name, v['phon_uk'], v['phon_us'], v['vietnamese_meaning'], row['id']
                ))
                updated_count += 1
            else:
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
                updated_count += 1

        conn.commit()
        conn.close()
        print(f"[Supabase PostgreSQL] Seeded {updated_count} vocabulary items for topic '{topic_name}'.")
    except Exception as e:
        print(f"[Supabase Warning] Could not seed PostgreSQL: {e}")

if __name__ == "__main__":
    seed_sqlite()
    seed_postgres()
