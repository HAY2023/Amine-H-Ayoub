---
title: Quran Audio Segmentation
emoji: 🎙️
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# قرآن أطفال - خدمة معالجة الصوت

خدمة Python FastAPI لتقسيم الملفات الصوتية القرآنية تلقائياً.

## البدء المحلي

### 1. تثبيت المتطلبات
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. تشغيل الخدمة
```bash
python main.py
```

الخدمة ستبدأ على `http://localhost:8000`

### 3. اختبار
```bash
curl -X GET http://localhost:8000/health
```

## التوزيع

### Fly.io (موصى به)

```bash
# تثبيت Fly CLI
# https://fly.io/docs/hands-on/install-flyctl/

# تسجيل
fly auth login

# إنشاء تطبيق
fly launch

# نشر
fly deploy
```

### Railway

```bash
# ربط المشروع
railway link

# نشر
railway up
```

### Docker المحلي

```bash
# بناء
docker build -t quran-audio-segmentation .

# تشغيل
docker run -p 8000:8000 quran-audio-segmentation
```

## متغيرات البيئة

- `PORT`: منفذ الخدمة (افتراضي: 8000)
- `PYTHON_SERVICE_URL`: URL الخدمة (قد تحتاج الـ Edge Function)

## API Endpoints

### POST /process-audio
معالجة ملف صوتي

**الطلب:**
```json
{
  "audioUrl": "https://example.com/audio.mp3",
  "surahNumber": 1,
  "ayahCount": 7,
  "sessionId": "session_123"
}
```

**الاستجابة:**
```json
{
  "success": true,
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "speaker": "teacher",
      "ayah": 1
    }
  ],
  "duration": 120.5,
  "processingTimeMs": 45000
}
```

### GET /health
فحص صحة الخدمة

## المتطلبات الحسابية

| وحدة | متطلبات |
|-----|--------|
| الذاكرة | 2GB+ |
| CPU | 1 Core+ |
| التخزين | 5GB+ (للنماذج) |

## الوقت

- ملف 5 دقائق: ~60 ثانية
- ملف 10 دقائق: ~120 ثانية
