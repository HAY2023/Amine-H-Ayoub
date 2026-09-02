# 🚀 نشر خدمة التقسيم (بلا تثبيت — من المتصفّح)

## ✅ الطريقة الموصى بها: Hugging Face Spaces (مجاني · بلا بطاقة · بلا تثبيت)

تستضيف الخدمة من المتصفّح من **أي جهاز**، وتحصل على رابط دائم.

### الخطوات
1. أنشئ حساباً مجانياً: https://huggingface.co/join  (لا يطلب بطاقة)
2. اذهب إلى: https://huggingface.co/new-space
3. املأ:
   - **Space name**: `quran-audio` (أو أي اسم)
   - **License**: اتركه
   - **SDK**: اختر **Docker** → ثم **Blank**
   - **Hardware**: `CPU basic` (مجاني)
   - **Public**
   - اضغط **Create Space**
4. في تبويب **Files** داخل الـ Space → زر **Add file → Upload files** → ارفع هذه الملفات الثلاثة من مجلد `python-service`:
   - `Dockerfile`
   - `main.py`
   - `requirements.txt`
   - `README.md`  (يحتوي إعدادات HF)
5. اضغط **Commit changes**. سيبدأ البناء تلقائياً (تبويب **Logs** يُظهر التقدّم — أول مرة ~٥ دقائق).
6. عند ظهور **Running** (أخضر) → الرابط يكون:
   ```
   https://<اسم-حسابك>-quran-audio.hf.space
   ```
7. تحقّق:
   ```
   https://<اسم-حسابك>-quran-audio.hf.space/health
   ```
   يجب أن يردّ: `{"status":"ok",...}`

### في الموقع
صفحة **التقسيم** → الصق الرابط في حقل "خدمة التقسيم" → اضغط **🚀 تقسيم بالخدمة**.

> ملاحظة: Space المجاني "ينام" بعد ~٤٨ ساعة خمول، وأول طلب بعد النوم يستغرق ~٣٠ ثانية ثم يصبح سريعاً.

---

## بديل: Render.com (مجاني · بلا بطاقة · من GitHub)
1. ادفع المشروع إلى GitHub (موجود أصلاً).
2. https://render.com → New → **Web Service** → اربط المستودع.
3. **Root Directory**: `python-service` · **Runtime**: Docker · خطة **Free**.
4. انشر → احصل على الرابط `https://...onrender.com`.

---

## بديل: Fly.io (يحتاج تثبيت flyctl + بطاقة للتحقق)
```bash
cd python-service
flyctl auth login
flyctl launch --no-deploy --copy-config --name quran-audio-segmentation --region cdg
flyctl deploy
```

---

## الواجهات (API)
| الطريق | الاستخدام |
|--------|-----------|
| `POST /split` | رفع ملف (multipart: file, leading, surahLabel) — يستخدمه الموقع |
| `POST /split-url` | تقسيم من رابط (JSON) |
| `GET /health` | فحص الحالة |
