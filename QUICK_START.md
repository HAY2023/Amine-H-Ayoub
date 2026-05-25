# Quick Start - Audio Segmentation

## 1. Start Python Service

```bash
cd python-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
```

✅ Service runs on `http://localhost:8000`

## 2. Deploy Edge Function

```bash
supabase functions deploy process-audio
```

✅ Function available at `/functions/v1/process-audio`

## 3. Run React App

```bash
npm run dev
```

✅ App runs on `http://localhost:5173`

## 4. Test Upload Page

Navigate to: **http://localhost:5173/upload**

1. Drag or select an MP3/WAV file
2. Set Surah = 1, Ayahs = 7
3. Click "Process Audio"
4. View results

---

## Architecture Summary

```
Upload Page → Supabase Storage → Edge Function → Python Service → Database
```

## Key Files

| What | Where |
|---|---|
| Python server | `python-service/main.py` |
| Upload UI | `src/pages/AudioUploadPage.tsx` |
| API hook | `src/hooks/useAudioSegmentation.ts` |
| Database | `supabase/migrations/*sql` |
| Edge function | `supabase/functions/process-audio/` |

## Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Process audio (requires file in storage)
curl -X POST http://localhost:8000/process-audio \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://...",
    "surahNumber": 1,
    "ayahCount": 7
  }'
```

## Common Issues

| Issue | Fix |
|---|---|
| Python module not found | `pip install -r requirements.txt` |
| Port 8000 already in use | `python -m main --port 8001` |
| Storage upload fails | Ensure `quran-audio` bucket exists |
| Edge Function not found | Run `supabase functions deploy` |

See `AUDIO_SETUP.md` for detailed troubleshooting.
