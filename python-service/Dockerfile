FROM python:3.11-slim

WORKDIR /app

# نظام: libsndfile (soundfile) + ffmpeg (librosa) + gcc (لبناء webrtcvad)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Hugging Face Spaces يستخدم 7860؛ Fly/غيره يضبط PORT
EXPOSE 7860

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
