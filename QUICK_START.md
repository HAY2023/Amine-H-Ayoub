# ⚡ البدء السريع - نظام رفع الصوت

## 3 خطوات فقط:

### 1️⃣ إصلاح قاعدة البيانات
```bash
supabase migration up
```
✅ يحل مشكلة RLS

### 2️⃣ نشر الخدمة (اختر واحداً)

**Fly.io:**
```bash
cd python-service && flyctl deploy
```

**Railway:**
```bash
cd python-service && railway up
```

**Docker (محلي):**
```bash
cd python-service
docker build -t quran-audio .
docker run -p 8000:8000 quran-audio
```

### 3️⃣ ضبط الـ URL
في Supabase Console → Edge Functions → Secrets:
```
PYTHON_SERVICE_URL=https://your-service-url.fly.dev
```

## ✅ جاهز!

```bash
npm run dev
# انتقل إلى http://localhost:5173/upload
```

---

## كل ما أضفناه:

✅ **Migration الجديد** - إصلاح RLS
✅ **Python FastAPI Service** - معالجة صوتية كاملة
✅ **Navigation Menu** - قائمة تنقل جديدة
✅ **AudioUploadPage** - صفحة رفع الملفات
✅ **Edge Function** - ربط React بـ Python

---

## الملفات:

```
python-service/
├── main.py                 # الخدمة
├── requirements.txt        # المكتبات
├── Dockerfile             # Docker
├── fly.toml              # Fly.io
├── railway.json          # Railway
└── README.md            # توثيق كامل

supabase/
└── migrations/
    └── 20260525000200...  # إصلاح RLS

src/
├── components/Navigation.tsx
└── pages/AudioUploadPage.tsx (موجود)
```

## المشاكل الشائعة:

| المشكلة | الحل |
|------|------|
| RLS error | `supabase migration up` |
| Python error | تحقق من الـ URL في Secrets |
| بطء المعالجة | حجم الملف كبير أو اتصال ضعيف |
| لا توجد نتائج | تأكد VAD يكتشف صوت في الملف |

---

اقرأ التفاصيل الكاملة في `AUDIO_SETUP.md`
