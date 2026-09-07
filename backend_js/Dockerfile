FROM node:20-slim

WORKDIR /app

# Install python, pip, edge-tts and build tools for neural audio synthesis
RUN apt-get update && apt-get install -y python3 python3-pip make g++ && \
    pip3 install --no-cache-dir --break-system-packages edge-tts && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies fresh
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy the rest of the backend code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
