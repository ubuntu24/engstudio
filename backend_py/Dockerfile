FROM python:3.11-slim

WORKDIR /app

# Upgrade pip and install ffmpeg and curl
RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip

# Install dependencies fresh from requirements.txt
COPY requirements.txt ./
RUN if [ ! -s requirements.txt ]; then echo -e "flask\nflask-cors\nflask-limiter\ngoogle-generativeai\nFlask-Caching" > requirements.txt; fi
RUN pip install -r requirements.txt

# Copy the rest of the python code
COPY . .

EXPOSE 5001

CMD ["python", "app.py"]
