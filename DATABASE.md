# Database Setup

Database **không được đẩy lên GitHub** (an toàn bảo mật).

## Để tạo database mới khi clone dự án về:

```bash
cd deploy/backend_py
/path/to/venv/bin/python backend/core/init_db.py
```

## Cấu trúc database chính (`english_learning.db`):

- `users` - tài khoản người dùng
- `vocabulary` - từ vựng (~663 từ, phân theo chủ đề + video)
- `learning_progress` - tiến độ SRS của từng user
- `quiz_questions` - câu hỏi quiz TOEIC

## Backup / Restore:

```bash
# Backup
cp deploy/database/english_learning.db deploy/database/english_learning.db.bak

# Restore
cp deploy/database/english_learning.db.bak deploy/database/english_learning.db
```
