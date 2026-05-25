# Audio Segmentation Setup Guide

## Overview

This guide explains how to set up and test the Python audio segmentation microservice locally with the Quran Kids app.

## Architecture

```
React Frontend (http://localhost:5173)
    ↓ (upload to Supabase Storage)
Supabase Storage
    ↓ (call /upload endpoint)
React Upload Page
    ↓ (call Edge Function)
Supabase Edge Function (process-audio)
    ↓ (HTTP request)
Python FastAPI Service (http://localhost:8000)
    ↓ (process audio)
Supabase Database (store results)
```

## Prerequisites

- Node.js 18+
- Python 3.9+
- NVIDIA GPU (optional, but recommended for speed)
- Supabase CLI

## Setup Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase Locally (Optional)

```bash
cd h:/learn-quran-kids-1
supabase init  # if not already done
supabase start  # starts local Postgres + Edge Functions emulator
```

### 3. Setup Python Service

```bash
# Navigate to python-service
cd h:/learn-quran-kids-1/python-service

# Create virtual environment
python -m venv venv

# Activate venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env if needed
```

### 4. Run Python Service

```bash
# From python-service directory
python main.py

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

**Test it:**
```bash
curl http://localhost:8000/health
# Response: {"status":"healthy","device":"cpu"}
```

### 5. Configure Edge Function

The Edge Function needs to know where the Python service is running. For local development:

```bash
# In supabase/functions/process-audio/index.ts,
# the service URL defaults to http://localhost:8000

# If using ngrok (to expose locally):
ngrok http 8000
# Then update the URL in the Edge Function
```

### 6. Run React Frontend

```bash
# In project root
npm run dev

# Navigate to http://localhost:5173/upload
```

### 7. Setup Storage Bucket

Make sure the `quran-audio` bucket exists and has public read access:

```bash
# Via Supabase Dashboard:
# Storage → quran-audio → Policies → Enable "Allow public read"
```

Alternatively via CLI:
```sql
-- In Supabase Console (SQL Editor)
INSERT INTO storage.buckets (id, name, public) VALUES ('quran-audio', 'quran-audio', true);

CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'quran-audio');
```

## Testing Workflow

### Test 1: Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "device": "cuda"}
```

### Test 2: Process Sample Audio

You can test the Python service directly without React:

```bash
# Download a sample audio file
curl -o /tmp/test.mp3 "https://huggingface.co/datasets/hammoualiyoucef20/quran-audio/resolve/main/1.mp3"

# Upload to Supabase Storage
# Then use the public URL to test:

curl -X POST http://localhost:8000/process-audio \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://[your-storage-url]/1.mp3",
    "surahNumber": 1,
    "ayahCount": 7
  }'
```

Expected response:
```json
{
  "sessionId": null,
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "speaker": "teacher",
      "ayah": 1
    },
    ...
  ],
  "duration": 120.5,
  "processingTimeMs": 45000,
  "status": "completed"
}
```

### Test 3: Full React UI

1. Go to http://localhost:5173/upload
2. Select an audio file (MP3 or WAV)
3. Set Surah Number = 1, Ayah Count = 7
4. Click "Process Audio"
5. View results in the table

## Troubleshooting

### Python Service Won't Start

**Issue:** `ModuleNotFoundError: No module named 'torch'`

**Solution:**
```bash
pip install --upgrade torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Out of Memory

**Issue:** CUDA out of memory

**Solution:**
```bash
# Use CPU instead
export DEVICE=cpu
# Or reduce batch size in pipeline.py
```

### Models Not Downloaded

**Issue:** `ConnectionError` when loading pyannote models

**Solution:**
```bash
# Pre-download models
python -c "from pyannote.audio import Pipeline; Pipeline.from_pretrained('pyannote/speaker-diarization-3.0')"

# Set Hugging Face token
export HF_TOKEN=your_token
```

### Storage Upload Fails

**Issue:** 403 Forbidden on storage upload

**Solution:**
1. Check bucket exists: Dashboard → Storage → quran-audio
2. Enable public read policy
3. Verify Supabase credentials in `.env`

### Edge Function Not Found

**Issue:** `Error: Function not found` when calling process-audio

**Solution:**
```bash
# Make sure Edge Function is deployed
supabase functions deploy process-audio

# Or if running locally
supabase functions serve
```

## Performance Tips

### Speed Up Processing

1. **Use GPU:**
   ```bash
   # Check GPU availability
   nvidia-smi
   ```

2. **Reduce Audio Quality (faster but less accurate):**
   ```python
   # In pipeline.py, increase sample rate threshold
   y, sr = librosa.load(audio, sr=8000)  # instead of 16000
   ```

3. **Skip VAD for short files:**
   ```python
   # If file is < 1 minute, skip diarization
   if duration < 60:
       return simple_segmentation()
   ```

### Memory Optimization

```python
# In pipeline.py
import torch
torch.cuda.empty_cache()  # Clear GPU memory between batches
```

## Local vs. Cloud

### Local Development
- ✅ No API costs
- ✅ Full debugging
- ❌ Slower (CPU only usually)
- ❌ Must run manually

### Cloud Deployment (Future)
```bash
# Deploy to Modal
pip install modal
modal deploy python-service/main.py

# Set Cloud URL
export PYTHON_SERVICE_URL=https://your-org-project-12345.modal.run

# Or deploy to Railway
railway link
railway up --detach
```

## Next Steps

1. **Test locally** with sample Quranic audio
2. **Calibrate thresholds** for better accuracy
3. **Add reference files** for teacher/kids identification
4. **Deploy to production** (Modal/Railway)
5. **Monitor performance** via logs and metrics

## File Locations

| File | Purpose |
|------|---------|
| `python-service/main.py` | FastAPI server |
| `python-service/pipeline.py` | Audio processing logic |
| `src/pages/AudioUploadPage.tsx` | React upload UI |
| `src/hooks/useAudioSegmentation.ts` | API integration |
| `supabase/functions/process-audio/index.ts` | Webhook handler |
| `supabase/migrations/20260525000100_...sql` | Database schema |

## Environment Variables

### Python Service
```env
DEVICE=cuda          # or cpu
SAMPLE_RATE=16000
LOG_LEVEL=INFO
HF_TOKEN=your_token
```

### Supabase Edge Function
```env
PYTHON_SERVICE_URL=http://localhost:8000  # or https://cloud-url
```

## Support

- **Python Issues:** Check `python-service/README.md`
- **React Issues:** Check browser console at http://localhost:5173
- **Supabase Issues:** Check logs: `supabase functions serve` console
- **Database Issues:** View tables at Dashboard → SQL Editor

---

**Last updated:** 2026-05-25
