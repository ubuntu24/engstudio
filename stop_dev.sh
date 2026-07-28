#!/bin/bash

echo "🛑 Đang tìm và tắt các tiến trình Node.js, Python và Next.js..."

# Tắt Node.js server (cổng 5000)
pkill -f "node server.js" 
# Tắt Python backend (cổng 5001)
pkill -f "python app.py"
# Tắt Next.js dev server (cổng 3000)
pkill -f "next"

echo "✅ Đã tắt toàn bộ dịch vụ thủ công!"
