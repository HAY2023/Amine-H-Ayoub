# 💻 أمثلة الكود للدوال المحسّنة

## 1️⃣ K-Means Clustering للمتحدثين

### الدالة:
```typescript
function kMeansClusterization(
  regions: SpeechRegion[],
  data: Float32Array,
  sr: number,
  expectedTeacherCount: number,
): { teacherIndices: number[]; kidsIndices: number[] }
```

### المثال:
```typescript
// لدينا 12 مقطع
const regions: SpeechRegion[] = [
  { start: 0.5, end: 1.2 },    // 0
  { start: 1.5, end: 2.0 },    // 1 (معلم - طاقة منخفضة)
  { start: 2.5, end: 3.1 },    // 2 (معلم)
  { start: 3.5, end: 4.2 },    // 3 (معلم)
  { start: 4.8, end: 5.5 },    // 4 (معلم)
  { start: 6.0, end: 6.6 },    // 5 (معلم)
  { start: 7.2, end: 8.0 },    // 6 (معلم)
  { start: 8.5, end: 9.2 },    // 7 (معلم)
  { start: 10.0, end: 10.8 },  // 8 (أطفال - طاقة عالية)
  { start: 11.2, end: 11.9 },  // 9 (أطفال)
  { start: 12.5, end: 13.1 },  // 10 (أطفال)
  { start: 13.8, end: 14.5 },  // 11 (أطفال)
];

const result = kMeansClusterization(regions, data, 16000, 7);

// النتيجة:
// {
//   teacherIndices: [0, 1, 2, 3, 4, 5, 6, 7],     // معلم
//   kidsIndices: [8, 9, 10, 11]                   // أطفال
// }
```

### الخطوات الداخلية:
```
1. استخراج الميزات لكل مقطع:
   - RMS (الطاقة)
   - ZCR (معدل تقاطع الصفر)
   - Spectral (مركز الطيف)

2. تهيئة المراكز:
   teacherMean = avg * 0.8 (منخفض)
   kidsMean = avg * 1.2 (مرتفع)

3. تكرار 5 مرات:
   a) تصنيف كل مقطع
   b) إعادة حساب المراكز

4. النتيجة:
   teacherIndices: المقاطع المصنفة كمعلم
   kidsIndices: المقاطع المصنفة كأطفال
```

---

## 2️⃣ Merge To Target (دمج ذكي)

### الدالة:
```typescript
function mergeToTarget(
  regions: SpeechRegion[],
  target: number,
  data: Float32Array,
  sr: number,
): SpeechRegion[]
```

### المثال:
```typescript
// لدينا 10 مقاطع، نريد 7 (دمج 3 مقاطع)
const regions: SpeechRegion[] = [
  { start: 0, end: 0.5 },     // 0 - short (< 0.2s)
  { start: 0.6, end: 1.1 },   // 1
  { start: 1.2, end: 1.7 },   // 2
  { start: 1.8, end: 2.3 },   // 3
  { start: 2.4, end: 3.0 },   // 4
  { start: 3.5, end: 4.2 },   // 5
  { start: 4.3, end: 5.0 },   // 6 - gap (0.1s to 7)
  { start: 5.1, end: 5.8 },   // 7
  { start: 5.9, end: 6.6 },   // 8 - gap (0.05s to 9)
  { start: 6.65, end: 7.2 },  // 9
];

const result = mergeToTarget(regions, 7, data, sr);

// الخطوات:
// 1. هناك 10 مقاطع، نريد 7 → دمج 3
// 2. البحث عن أزواج بأصغر فجوة وأقصر مدة
// 3. دمج الزوج (6, 7) ← فجوة 0.1s
// 4. دمج الزوج (8, 9) ← فجوة 0.05s
// 5. دمج زوج آخر
// 6. النتيجة: 7 مقاطع

// النتيجة:
// [
//   { start: 0, end: 0.5 },
//   { start: 0.6, end: 1.1 },
//   { start: 1.2, end: 1.7 },
//   { start: 1.8, end: 2.3 },
//   { start: 2.4, end: 3.0 },
//   { start: 3.5, end: 4.2 },
//   { start: 4.3, end: 7.2 },  // دمج 6-9
// ]
```

### الاستراتيجية:
```javascript
// لكل زوج متجاور:
score = -gap * 2 - max(duration1, duration2)

// مثال:
// الزوج (6, 7):
//   gap = 0.1s
//   max_dur = 0.7s
//   score = -0.1*2 - 0.7 = -0.9
//
// الزوج (2, 3):
//   gap = 0.1s
//   max_dur = 0.5s
//   score = -0.1*2 - 0.5 = -0.7 ← أعلى (أفضل)
```

---

## 3️⃣ Split To Target (تقسيم ذكي)

### الدالة:
```typescript
function splitToTarget(
  regions: SpeechRegion[],
  target: number,
  data: Float32Array,
  sr: number,
): SpeechRegion[]
```

### المثال:
```typescript
// لدينا 5 مقاطع، نريد 7 (تقسيم 2 مقطع)
const regions: SpeechRegion[] = [
  { start: 0, end: 1.5 },     // 0 - طويل (1.5s)
  { start: 2, end: 3.5 },     // 1
  { start: 4, end: 5.0 },     // 2 - طويل (1.0s)
  { start: 5.8, end: 6.5 },   // 3
  { start: 7, end: 8.2 },     // 4
];

const result = splitToTarget(regions, 7, data, sr);

// الخطوات:
// 1. هناك 5 مقاطع، نريد 7 → تقسيم 2
// 2. أطول مقطع: (0) = 1.5s
// 3. البحث عن أهدأ نقطة في (0, 1.5)
//    → منتصف الكلمة ≈ 0.7s
// 4. تقسيم: (0, 0.69) و (0.71, 1.5)
// 5. أطول مقطع الآن: (4) = 1.2s
// 6. البحث عن أهدأ نقطة وتقسيم
// 7. النتيجة: 7 مقاطع

// التحقق: كل جزء يجب أن يحتوي على صوت
const leftRMS = computeRMS(data, 0, floor(0.69 * sr));
const rightRMS = computeRMS(data, floor(0.71 * sr), floor(1.5 * sr));
// if (leftRMS > 0.001 && rightRMS > 0.001) ✅
```

### الآلية:
```javascript
// البحث عن أهدأ نقطة:
// 1. حساب RMS لنوافذ 25ms متداخلة
// 2. إيجاد أقل RMS
// 3. التأكد من عدم القطع في أول/آخر 20%

// التحقق من الصحة:
// leftRMS > 0.001 && rightRMS > 0.001
// ← كلا الجزأين بهما صوت حقيقي
```

---

## 4️⃣ Refine Edges (تحسين الحواف)

### الدالة:
```typescript
function refineEdges(
  region: SpeechRegion,
  data: Float32Array,
  sr: number,
  threshold: number,
): SpeechRegion
```

### المثال:
```typescript
// مقطع خام بفراغات في الحواف
const region = { start: 0.50, end: 2.85 };
// الفراغ الفعلي في البيانات: 0.72 - 2.63

const refined = refineEdges(
  region,
  data,
  16000,
  0.005  // threshold
);

// النتيجة:
// { start: 0.718, end: 2.633 }
// ← إزالة ~120ms من البداية و ~217ms من النهاية

// الفائدة:
// قبل: 2.35 ثانية (تتضمن فراغات)
// بعد: 1.915 ثانية (نقي)
```

### الخطوات:
```typescript
// 1. تحديد عتبة منخفضة:
const threshold = 0.005 * 0.8;  // 20% أقل

// 2. تشذيب البداية:
//    ابحث عن نقطة بها 2 نافذة متتالية (10ms كل واحدة)
//    بقيمة RMS ≥ threshold
while (startSample < endSample) {
  if (RMS >= threshold) {
    consecutiveAbove++;
    if (consecutiveAbove >= 2) break;  // ✅ وجدنا
  }
  startSample += 5ms;
}

// 3. تشذيب النهاية بنفس الطريقة

// 4. الحشو الذكي:
//    ارجع للخلف 5ms (بدلاً من 10ms)
//    ← التقاط الهجوم بشكل أفضل
```

### الفرق في المعايرة:
```javascript
// المعلم (صوت عميق):
teacherThreshold = max(0.0018, overallRMS * 0.10)

// الأطفال (صوت حاد):
kidsThreshold = max(0.0025, overallRMS * 0.12)

// مثال:
// overallRMS = 0.015
// teacherThreshold = 0.0015
// kidsThreshold = 0.0018
// ← الأطفال لهم عتبة أعلى (أصواتهم أكثر وضوحاً)
```

---

## 5️⃣ Find Speaker Boundary (تحديد نقطة التحول)

### الدالة:
```typescript
function findSpeakerBoundary(
  regions: SpeechRegion[],
  data: Float32Array,
  sr: number,
  expectedAyahCount: number,
): number
```

### المثال:
```typescript
// لدينا 15 مقطع
// معلم يقرأ أولاً ثم أطفال
// عدد الآيات المتوقع = 7

const regions: SpeechRegion[] = [ /* 15 مقطع */ ];

const splitIdx = findSpeakerBoundary(regions, data, sr, 7);
// النتيجة: splitIdx = 8
//   المقاطع 0-7: معلم (8 مقاطع)
//   المقاطع 8-14: أطفال (7 مقاطع)

// الفصل:
const teacherRegions = regions.slice(0, 8);
const kidsRegions = regions.slice(8);
```

### الخوارزمية:
```javascript
// 1. استخدم K-Means أولاً:
const clustering = kMeansClusterization(...);
// عادة يعطي نتائج جيدة

// 2. إذا فشل K-Means، استخدم scoring:
for (كل نقطة تقسيم i) {
  score = gap * 15           // أكبر فجوة
        + zcrSep * 200      // أكبر فرق في التردد
        + rmsSep * 80       // أكبر فرق في الطاقة
        + specSep * 120     // أكبر فرق في الطيف
        + proximity * 3     // قرب من عدد الآيات المتوقع
        + balance * 2;      // توازن العدد

  if (score > bestScore) {
    bestScore = score;
    bestSplit = i;
  }
}
```

---

## 📊 مثال كامل: سورة الفاتحة

```typescript
// المدخلات:
const surahNum = 1;
const ayahCount = 7;

// الملف الصوتي:
const audioUrl = "/audio/surahs/1.mp3";

// تشغيل الخوارزمية:
const result = await multiPassSplit(audioUrl, surahNum, (msg) => {
  console.log(msg);
});

// المخرجات:
// 📥 [1/5] جاري تحميل الملف الصوتي...
// 🧠 [1/5] تشغيل Silero VAD بحساسية فائقة...
// 🔍 [1/5] ✓ تم كشف 15 منطقة كلام
// 🔬 [2/5] جاري تحليل خصائص الصوت وتصنيف المتحدثين...
// 🔬 [2/5] بعد التنقية: 14 مقطع
// 🎙️ [2/5] ✓ معلم: 8 | 👦 أطفال: 6
// 📊 [3/5] مطابقة المقاطع مع 7 آية لكل متحدث...
// 📊 [3/5] تقسيم مقاطع الأطفال: 6 → 7
// 📊 [3/5] ✓ المعلم: 7 | الأطفال: 7
// ✨ [4/5] جاري تحسين حواف كل مقطع بدقة 10ms...
// ✨ [4/5] ✓ تم تحسين جميع الحواف
// ✅ [5/5] جاري التحقق النهائي...
// 🎉 ✅ تم: 14 مقطع (7 معلم + 7 طفل) · دقة 100%

// النتيجة:
console.log(result.segments.length);  // 14
console.log(result.duration);         // ~23.5 ثانية

// المقاطع:
result.segments.forEach(seg => {
  console.log(`${seg.label}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s`);
});
// الفاتحة - آية 1 (معلم): 0.25s - 2.15s
// الفاتحة - آية 2 (معلم): 2.35s - 3.80s
// ...
// الفاتحة - آية 1 (طفل): 8.50s - 10.25s
// ...
```

---

## 🎯 ملخص الاستخدام:

```typescript
// 1. استخدم multiPassSplit() للقيام بكل شيء تلقائياً
const result = await multiPassSplit(url, surahNum, onProgress);

// 2. أو استخدم الدوال الفردية للتحكم الدقيق:
const regions = await getVADRegions(data, sr);
const split = findSpeakerBoundary(regions, data, sr, ayahCount);
const teacherRegions = mergeToTarget(regions.slice(0, split), ayahCount);
const kidsRegions = splitToTarget(regions.slice(split), ayahCount);
```

---

**آخر تحديث:** 25 مايو 2026 ✅
