#!/bin/bash

# Thiết lập thư mục gốc
ROOT_DIR="/home/MRS/english/deploy"
DB_PATH="${ROOT_DIR}/database/english_learning.db"
TRANSCRIPT_DB_PATH="${ROOT_DIR}/database/transcript_cache.db"

echo "=================================================="
echo "🚀 Đang khởi động hệ thống English Vault (Dev Mode)"
echo "=================================================="

# Hàm dọn dẹp khi ấn Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Đang tắt toàn bộ server..."
    kill $PID_PY $PID_JS $PID_FE
    wait $PID_PY $PID_JS $PID_FE 2>/dev/null
    echo "✅ Đã tắt an toàn!"
    exit 0
}

# Bắt tín hiệu ngắt (Ctrl+C)
trap cleanup SIGINT SIGTERM

# 1. Chạy Python Backend (Port 5001)
echo "1️⃣ Khởi động Backend Python (Cổng 5001)..."
cd "${ROOT_DIR}/backend_py"
source /home/MRS/english/venv/bin/activate
export DB_PATH="${DB_PATH}"
export TRANSCRIPT_DB_PATH="${TRANSCRIPT_DB_PATH}"
python app.py &
PID_PY=$!

# 2. Chạy Node.js Backend (Port 5000)
echo "2️⃣ Khởi động Backend Node.js (Cổng 5000)..."
cd "${ROOT_DIR}/backend_js"
export DB_PATH="${DB_PATH}"
export AI_SERVICE_URL="http://127.0.0.1:5001"
node server.js &
PID_JS=$!

# 3. Chạy Next.js Frontend (Port 3000)
echo "3️⃣ Khởi động Frontend Next.js (Cổng 3000) - Chế độ Hot Reload..."
cd "${ROOT_DIR}/frontend"
export API_URL="http://127.0.0.1:5000"
npm run dev &
PID_FE=$!

echo "=================================================="
echo "✨ Mọi thứ đã sẵn sàng!"
echo "🌐 Frontend: http://localhost:3000"
echo "⚙️ Backend JS: http://localhost:5000"
echo "🤖 Backend Python: http://localhost:5001"
echo "👉 Ấn [Ctrl + C] để dừng toàn bộ hệ thống"
echo "=================================================="

# Chờ các process chạy vô tận để giữ script không tắt
wait
