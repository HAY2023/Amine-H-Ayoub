# تحسينات الأداء - حل مشكلة التحميل البطيء للسور

## المشاكل التي تم حلها:

### 1️⃣ تحميل جميع بيانات السور دفعة واحدة
**المشكلة**: كان التطبيق يحمل نصوص القرآن لجميع السور عند التشغيل.
**الحل**: 
- استخدام `lazyCorpus.ts` لتأجيل التحميل إلى وقت الحاجة
- تحميل البيانات في الخلفية باستخدام `requestIdleCallback`

### 2️⃣ تحميل الصور ببطء
**المشكلة**: لا توجد آلية لـ preload الصور قبل عرضها.
**الحل**:
- إضافة `lazyLoad.ts` مع دالة `preloadImage()` 
- تحميل الصور مسبقاً عند تغيير السورة/الآية
- إضافة loading indicator أثناء التحميل

### 3️⃣ إعدادات Vite غير محسّنة
**المشكلة**: عدم تقسيم الحزم وتحسين البناء.
**الحل**:
- إضافة `manualChunks` لفصل بيانات القرآن عن باقي الكود
- تفعيل تصغير الحجم مع Terser
- إضافة `warmup` لـ server للتسخين المسبق

## الملفات المعدلة:

### 1. `vite.config.ts` ✅
- تحسين build configuration
- فصل chunks للبيانات والمكونات
- إضافة server warmup

### 2. `src/components/AyahDisplay.tsx` ✅
- إضافة preloading للصور
- إضافة loading state
- استخدام native lazy loading

### 3. ملفات جديدة:
- `src/utils/lazyLoad.ts` - utilities للـ lazy loading
- `src/data/lazyCorpus.ts` - تأجيل تحميل البيانات

## كيفية الاستخدام:

### في المكونات الأخرى:
```typescript
import { preloadImage } from "@/utils/lazyLoad";

// Preload single image
await preloadImage("/images/1_1.png");

// Preload multiple images
import { batchPreloadImages } from "@/utils/lazyLoad";
await batchPreloadImages([
  "/images/1_1.png",
  "/images/1_2.png",
  "/images/1_3.png"
]);
```

### لتحميل بيانات القرآن:
```typescript
import { getLazyCorpus, preloadCorpusInBackground } from "@/data/lazyCorpus";

// في useEffect:
const corpus = await getLazyCorpus();

// تحميل في الخلفية (بعد render الصفحة الأولى):
preloadCorpusInBackground();
```

## النتائج المتوقعة:

✅ تقليل وقت التشغيل الأولي  
✅ تحسين سرعة عرض السور  
✅ تقليل استهلاك الذاكرة  
✅ تحسين معدلات Lighthouse  

## خطوات إضافية اختيارية:

1. **تقليل حجم الصور**:
   ```bash
   # استخدام tools مثل ImageOptim أو ImageMagick
   convert input.png -strip -interlace Plane -gaussian-blur 0.05x20 -quality 85 output.png
   ```

2. **استخدام WebP للصور**:
   - تحويل الصور إلى WebP format
   - إضافة fallback للصور القديمة

3. **تفعيل gzip compression**:
   - في netlify.toml أو Cloudflare

4. **استخدام Service Worker** لـ offline caching:
   - تحسين تحميل السور المُخزنة محلياً
