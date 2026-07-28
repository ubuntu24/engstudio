# English Studio

Ứng dụng học tiếng Anh full-stack với AI, tích hợp video song ngữ, flashcard SRS, luyện dịch, kiểm tra ngữ pháp.

## Cấu trúc dự án

```
├── frontend/               # Next.js App Router (port 3000)
├── backend_py/             # Python Flask - AI/NLP (port 5001)
├── backend_js/             # Node.js Express - API chính (port 5000)
├── database/               # SQLite DB (không đẩy lên GitHub)
├── docker-compose.yml      # Chạy local (build từ source)
├── docker-compose.prod.yml # Production (pull image từ GHCR)
└── .github/workflows/      # CI/CD tự động
```

## Chạy local

```bash
# Cách 1: Script
bash start_dev.sh

# Cách 2: Docker
cp .env.example .env   # Điền giá trị vào .env
docker compose up --build
```

## Deploy Production (CI/CD)

Tự động khi push lên `main`:
1. GitHub Actions build Docker images → push lên GHCR
2. Self-hosted runner trên server pull image mới → restart containers
3. Cloudflare Tunnel expose ra internet

**Secrets cần cấu hình** (GitHub → Settings → Secrets → Actions):

| Secret | Mô tả |
|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` |
| `FLASK_SECRET_KEY` | `openssl rand -hex 32` |
| `CF_TUNNEL_TOKEN` | Token từ Cloudflare Zero Trust → Tunnels |
| `NEXT_PUBLIC_API_URL` | URL public của API |

## Database

Database **không** được commit lên GitHub. Khi deploy lần đầu, copy file DB lên server:

```bash
scp database/english_learning.db user@server:/path/to/deploy/database/
```

Hoặc tạo mới:
```bash
cd backend_py && python backend/core/init_db.py
```

**Backup / Restore:**
```bash
# Backup
cp database/english_learning.db database/english_learning.db.bak

# Restore
cp database/english_learning.db.bak database/english_learning.db
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend JS**: Node.js, Express
- **Backend AI**: Python, Flask, yt-dlp, youtube-transcript-api
- **Database**: SQLite
- **Tunnel**: Cloudflare Zero Trust
