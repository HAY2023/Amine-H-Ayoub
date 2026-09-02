# نظام تقسيم الصوت القرآني الكامل 🎙️

## المعمارية

```
React Upload Page
    ↓
Supabase Storage
    ↓
Edge Function (process-audio)
    ↓
Python FastAPI Service (معالجة الصوت)
    ↓
Supabase Database (حفظ النتائج)
    ↓
React Results View
```

## خطوات البدء

### 1. تطبيق RLS Fix

```bash
supabase migration up
```

### 2. نشر Python Service

#### Fly.io (الأسهل):
```bash
cd python-service
flyctl launch
flyctl deploy
```

#### Railway:
```bash
cd python-service
railway link
railway up
```

#### Docker المحلي:
```bash
cd python-service
docker build -t quran-audio .
docker run -p 8000:8000 quran-audio
```

### 3. ضبط المتغيرات

في Supabase Console → Edge Function Secrets:
```
PYTHON_SERVICE_URL=https://your-service.fly.dev
```

### 4. تشغيل التطبيق

```bash
npm run dev
# انتقل إلى http://localhost:5173/upload
```

## الملفات المهمة

- `python-service/main.py` - الخدمة الرئيسية
- `supabase/functions/process-audio/index.ts` - Edge Function
- `src/pages/AudioUploadPage.tsx` - صفحة الرفع
- `src/components/Navigation.tsx` - قائمة التنقل الجديدة
- `src/hooks/useAudioSegmentation.ts` - الـ Hook

## الاستخدام

1. اذهب إلى `/upload`
2. اختر ملف MP3 أو WAV
3. أدخل رقم السورة والآيات
4. اضغط "Process Audio"
5. انتظر النتائج!

## استكشاف الأخطاء

خطأ "RLS violated"؟
```bash
supabase migration up
```

خطأ "Python service error"؟
تحقق من الـ URL والخدمة تعمل:
```bash
curl https://your-url/health
```

---

المزيد في `python-service/README.md`
