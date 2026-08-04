FROM python:3.11-slim

WORKDIR /app

# نظام: libsndfile (soundfile) + ffmpeg (librosa) + gcc (لبناء webrtcvad)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# إعداد مستخدم بصلاحيات محدودة (مطلوب لـ Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user main.py .
COPY --chown=user pipeline.py .

# Hugging Face Spaces يستخدم 7860؛ Fly/غيره يضبط PORT
EXPOSE 7860

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
