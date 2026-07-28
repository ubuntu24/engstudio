# English Studio

Ứng dụng học tiếng Anh full-stack với AI, tích hợp video song ngữ, flashcard SRS, luyện dịch, kiểm tra ngữ pháp.

## Cấu trúc dự án

```
deploy/
├── frontend/          # Next.js App Router (cổng 3000)
├── backend_py/        # Python Flask - AI/NLP (cổng 5001)
├── backend_js/        # Node.js Express - API chính (cổng 5000)
├── database/          # SQLite DB (không đẩy lên GitHub)
└── docker-compose.yml # Khởi động toàn bộ hệ thống
```

## Khởi động

```bash
# Chạy toàn bộ hệ thống
bash deploy/start_dev.sh

# Hoặc từng service riêng
cd deploy/frontend && npm run dev
cd deploy/backend_js && node server.js
cd deploy/backend_py && python app.py
```

## Lưu ý về Database

Database **không** được đẩy lên GitHub (đã ẩn trong `.gitignore`). 
Khi deploy lần đầu, cần khởi tạo DB bằng:

```bash
cd deploy/backend_py
python backend/core/init_db.py
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend JS**: Node.js, Express
- **Backend AI**: Python, Flask, g4f, yt-dlp, youtube-transcript-api
- **Database**: SQLite
