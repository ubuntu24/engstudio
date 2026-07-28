FROM node:20-slim

WORKDIR /app

# Install python and build tools in case native bindings (like sqlite3) need compiling
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies fresh
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy the rest of the backend code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
