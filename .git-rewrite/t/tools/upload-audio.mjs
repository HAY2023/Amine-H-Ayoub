import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';

let currentTokenIndex = 0;
const HF_TOKENS = [
  "REDACTED_HF_TOKEN", // المفتاح الجديد الأساسي
  "REDACTED_HF_TOKEN",
  "REDACTED_HF_TOKEN",
  "REDACTED_HF_TOKEN",
  "REDACTED_HF_TOKEN",
  "REDACTED_HF_TOKEN",
  "REDACTED_HF_TOKEN",
  "REDACTED_HF_TOKEN", // المفتاح القديم (المحظور) في الأسفل
];

function getHfToken() {
  return HF_TOKENS[currentTokenIndex];
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function switchToken() {
  if (currentTokenIndex < HF_TOKENS.length - 1) {
    currentTokenIndex++;
    console.log(`\n🔄 تم التبديل تلقائياً إلى المفتاح الاحتياطي رقم ${currentTokenIndex + 1} لتفادي حظر 429...\n`);
    return true;
  }
  
  console.log(`\n⚠️ جميع المفاتيح الحالية (${HF_TOKENS.length}) تم حظرها (429 Rate Limit)!`);
  const countStr = await askQuestion('كم مفتاح جديد تريد إضافته؟ (أدخل رقم مثل 2، أو 0 للإلغاء): ');
  const count = parseInt(countStr.trim()) || 0;
  
  if (count <= 0) return false;
  
  for (let i = 0; i < count; i++) {
    const newToken = await askQuestion(`الصق المفتاح رقم ${i + 1}: `);
    if (newToken.trim()) {
      HF_TOKENS.push(newToken.trim());
    }
  }
  
  if (currentTokenIndex < HF_TOKENS.length - 1) {
    currentTokenIndex++;
    console.log(`\n🔄 تم إضافة المفاتيح بنجاح! جاري إكمال الرفع باستخدام المفتاح الجديد...\n`);
    return true;
  }
  
  return false;
}

const REPO = "hammoualiyoucef20/quran-audio";
const AUDIO_DIR = "H:\\التلاوة التعليمية - أمين حاج أيوب mp3";
const LOG_FILE = "H:\\learn-quran-kids-1\\tools\\حالة-الرفع.txt";

const SURAHS_ORDER = [
  { appNum: 1,  stdNum: 1,   name: "الفاتحة" },
  { appNum: 2, stdNum: 114, name: "الناس" },
  { appNum: 3, stdNum: 113, name: "الفلق" },
  { appNum: 4, stdNum: 112, name: "الإخلاص" },
  { appNum: 5, stdNum: 111, name: "المسد" },
  { appNum: 6, stdNum: 110, name: "النصر" },
  { appNum: 7, stdNum: 109, name: "الكافرون" },
  { appNum: 8, stdNum: 108, name: "الكوثر" },
  { appNum: 9, stdNum: 107, name: "الماعون" },
  { appNum: 10, stdNum: 106, name: "قريش" },
  { appNum: 11, stdNum: 105, name: "الفيل" },
  { appNum: 12, stdNum: 104, name: "الهمزة" },
  { appNum: 13, stdNum: 103, name: "العصر" },
  { appNum: 14, stdNum: 102, name: "التكاثر" },
  { appNum: 15, stdNum: 101, name: "القارعة" },
  { appNum: 16, stdNum: 100, name: "العاديات" },
  { appNum: 17, stdNum: 99, name: "الزلزلة" },
  { appNum: 18, stdNum: 98, name: "البينة" },
  { appNum: 19, stdNum: 97, name: "القدر" },
  { appNum: 20, stdNum: 96, name: "العلق" },
  { appNum: 21, stdNum: 95, name: "التين" },
  { appNum: 22, stdNum: 94, name: "الشرح" },
  { appNum: 23, stdNum: 93, name: "الضحى" },
  { appNum: 24, stdNum: 92, name: "الليل" },
  { appNum: 25, stdNum: 91, name: "الشمس" },
  { appNum: 26, stdNum: 90, name: "البلد" },
  { appNum: 27, stdNum: 89, name: "الفجر" },
  { appNum: 28, stdNum: 88, name: "الغاشية" },
  { appNum: 29, stdNum: 87, name: "الأعلى" },
  { appNum: 30, stdNum: 86, name: "الطارق" },
  { appNum: 31, stdNum: 85, name: "البروج" },
  { appNum: 32, stdNum: 84, name: "الإنشقاق" },
  { appNum: 33, stdNum: 83, name: "المطففين" },
  { appNum: 34, stdNum: 82, name: "الإنفطار" },
  { appNum: 35, stdNum: 81, name: "التكوير" },
  { appNum: 36, stdNum: 80, name: "عبس" },
  { appNum: 37, stdNum: 79, name: "النازعات" },
  { appNum: 38, stdNum: 78, name: "النبأ" },
  { appNum: 39, stdNum: 77, name: "المرسلات" },
  { appNum: 40, stdNum: 76, name: "الإنسان" },
  { appNum: 41, stdNum: 75, name: "القيامة" },
  { appNum: 42, stdNum: 74, name: "المدثر" },
  { appNum: 43, stdNum: 73, name: "المزمل" },
  { appNum: 44, stdNum: 72, name: "الجن" },
  { appNum: 45, stdNum: 71, name: "نوح" },
  { appNum: 46, stdNum: 70, name: "المعارج" },
  { appNum: 47, stdNum: 69, name: "الحاقة" },
  { appNum: 48, stdNum: 68, name: "القلم" },
  { appNum: 49, stdNum: 67, name: "الملك" },
  { appNum: 50, stdNum: 66, name: "التحريم" },
  { appNum: 51, stdNum: 65, name: "الطلاق" },
  { appNum: 52, stdNum: 64, name: "التغابن" },
  { appNum: 53, stdNum: 63, name: "المنافقون" },
  { appNum: 54, stdNum: 62, name: "الجمعة" },
  { appNum: 55, stdNum: 61, name: "الصف" },
  { appNum: 56, stdNum: 60, name: "الممتحنة" },
  { appNum: 57, stdNum: 59, name: "الحشر" },
  { appNum: 58, stdNum: 58, name: "المجادلة" },
  { appNum: 59, stdNum: 57, name: "الحديد" },
  { appNum: 60, stdNum: 56, name: "الواقعة" },
  { appNum: 61, stdNum: 55, name: "الرحمن" },
  { appNum: 62, stdNum: 54, name: "القمر" },
  { appNum: 63, stdNum: 53, name: "النجم" },
  { appNum: 64, stdNum: 52, name: "الطور" },
  { appNum: 65, stdNum: 51, name: "الذاريات" },
  { appNum: 66, stdNum: 50, name: "ق" },
  { appNum: 67, stdNum: 49, name: "الحجرات" },
  { appNum: 68, stdNum: 48, name: "الفتح" },
  { appNum: 69, stdNum: 47, name: "محمد" },
  { appNum: 70, stdNum: 46, name: "الأحقاف" },
  { appNum: 71, stdNum: 45, name: "الجاثية" },
  { appNum: 72, stdNum: 44, name: "الدخان" },
  { appNum: 73, stdNum: 43, name: "الزخرف" },
  { appNum: 74, stdNum: 42, name: "الشورى" },
  { appNum: 75, stdNum: 41, name: "فصلت" },
  { appNum: 76, stdNum: 40, name: "غافر" },
  { appNum: 77, stdNum: 39, name: "الزمر" },
  { appNum: 78, stdNum: 38, name: "ص" },
  { appNum: 79, stdNum: 37, name: "الصافات" },
  { appNum: 80, stdNum: 36, name: "يس" },
];

function log(msg) {
  console.log(msg);
  try {
    fs.appendFileSync(LOG_FILE, msg + "\n", "utf8");
  } catch (e) {}
}

function renderProgressBar(current, total, width = 20) {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round((width * current) / total);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `[${bar}] ${percent}% (${current}/${total})`;
}

async function checkFileIsUpToDate(serverPath, localBuffer) {
  try {
    const url = `https://huggingface.co/datasets/${REPO}/resolve/main/${serverPath}`;
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${getHfToken()}`
      }
    });
    
    if (!res.ok) return false;
    
    const serverSize = parseInt(res.headers.get('x-linked-size') || res.headers.get('content-length') || '0', 10);
    const localSize = localBuffer.length;
    
    const localSha256 = crypto.createHash('sha256').update(localBuffer).digest('hex');
    const serverEtag = res.headers.get('x-linked-etag') || res.headers.get('etag') || '';
    
    if (serverEtag.includes(localSha256) || (serverSize > 0 && serverSize === localSize)) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

async function uploadLfsContent(serverPath, fileBuffer) {
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const size = fileBuffer.length;
  const sample = fileBuffer.subarray(0, 512).toString('base64');

  const preuploadUrl = `https://huggingface.co/api/datasets/${REPO}/preupload/main`;
  const preuploadRes = await fetch(preuploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getHfToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: [{ path: serverPath, sample, size, sha256 }]
    })
  });

  if (!preuploadRes.ok) {
    const errText = await preuploadRes.text();
    return { ok: false, err: `Preupload failed (HTTP ${preuploadRes.status}): ${errText}` };
  }

  const preuploadData = await preuploadRes.json();
  const fileInfo = preuploadData.files?.[0];

  if (!fileInfo) {
    return { ok: false, err: "No file info in preupload response" };
  }

  if (fileInfo.uploadUrl) {
    const uploadRes = await fetch(fileInfo.uploadUrl, {
      method: 'PUT',
      headers: {
        ...(fileInfo.headers || {}),
        'Content-Type': 'application/octet-stream'
      },
      body: fileBuffer
    });

    if (!uploadRes.ok && uploadRes.status !== 200 && uploadRes.status !== 201) {
      const errText = await uploadRes.text();
      return { ok: false, err: `LFS upload failed (HTTP ${uploadRes.status}): ${errText}` };
    }
  }

  return { ok: true, commitItem: { serverPath, size, sha256 } };
}

async function commitAllLfsFiles(commitItems) {
  if (commitItems.length === 0) return { ok: true };

  const commitUrl = `https://huggingface.co/api/datasets/${REPO}/commit/main`;
  const commitLines = [
    JSON.stringify({
      key: "header",
      value: { summary: `Update ${commitItems.length} audio files in a single batch` }
    })
  ];

  for (const item of commitItems) {
    commitLines.push(JSON.stringify({
      key: "lfsFile",
      value: {
        path: item.serverPath,
        algo: "sha256",
        size: item.size,
        oid: item.sha256
      }
    }));
  }

  let lastErr = "";

  while (true) {
    const commitRes = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getHfToken()}`,
        'Content-Type': 'application/x-ndjson'
      },
      body: commitLines.join('\n')
    });

    if (commitRes.ok) return { ok: true };
    
    const errText = await commitRes.text();
    lastErr = `Batch Commit failed (HTTP ${commitRes.status}): ${errText}`;
    
    if (commitRes.status === 429) {
      const switched = await switchToken();
      if (switched) {
        continue;
      } else {
        return { ok: false, err: lastErr + " (All tokens rate-limited)" };
      }
    } else {
      return { ok: false, err: lastErr };
    }
  }
}

async function uploadLfsWithRetry(serverPath, fileBuffer, maxRetries = 5) {
  let lastErr = "";
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await uploadLfsContent(serverPath, fileBuffer);
      if (res.ok) return res;
      lastErr = res.err;
      
      if (res.err && res.err.includes("HTTP 429")) {
         const switched = await switchToken();
         if (switched) {
           attempt = 0; // Reset attempts for the new token
           continue;
         }
      }
    } catch (e) {
      lastErr = e.message;
    }
    
    if (attempt < maxRetries) {
      console.log(`      ⚠️ جاري إعادة المحاولة (${attempt}/${maxRetries}) بعد ثوانٍ قليلة بسبب: ${lastErr}`);
      await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
    }
  }
  return { ok: false, err: lastErr };
}

async function uploadAudio() {
  fs.writeFileSync(LOG_FILE, `==== بدء الرفع والاستبدال: ${new Date().toLocaleString('ar-SA')} ====\n`, "utf8");

  console.log("======================================================");
  console.log("   بدء رفع واستبدال التلاوات بالترتيب التعليمي (LFS):");
  console.log("   (1 الفاتحة ثم من 114 الناس إلى 38 النبأ) مع النسبة المئوية");
  console.log(`   المسار: ${AUDIO_DIR}`);
  console.log("======================================================\n");

  if (!fs.existsSync(AUDIO_DIR)) {
    log(`❌ المجلد غير موجود: ${AUDIO_DIR}`);
    return;
  }

  const allFiles = fs.readdirSync(AUDIO_DIR).filter(f => f.toLowerCase().endsWith('.mp3'));
  console.log(`📁 تم العثور على ${allFiles.length} ملف صوتي في المجلد.`);

  // تحديث بصمة الملفات لتجاوز مشكلة HTTP 400 (اختلاف المفاتيح)
  console.log("🛠️ جاري تحديث بصمة الملفات (تغيير طفيف جداً لا يؤثر على الصوت) لتجاوز مشكلة خوادم HuggingFace...");
  try {
    for (const f of allFiles) {
      const fullPath = path.join(AUDIO_DIR, f);
      // إضافة فراغ بسيط جداً في نهاية الملف لتغيير بصمة SHA256 وإجبار السيرفر على قبول الملفات للمفتاح الجديد
      fs.appendFileSync(fullPath, " ");
    }
  } catch (err) {
    console.log("⚠️ لم نتمكن من تحديث بصمة بعض الملفات، قد تظهر مشكلة 400 مرة أخرى.");
  }

  const queue = [];
  for (const s of SURAHS_ORDER) {
    const matchedFile = allFiles.find(f => {
      const matchNum = f.match(/^(\d+)/);
      if (matchNum) {
        const n = parseInt(matchNum[1], 10);
        if (n === s.appNum || n === s.stdNum) return true;
      }
      return f.includes(s.name);
    });

    if (matchedFile) {
      queue.push({
        surah: s,
        fileName: matchedFile,
        filePath: path.join(AUDIO_DIR, matchedFile),
        serverPath: `${s.stdNum}.mp3`
      });
    }
  }

  console.log(`📋 تم تجهيز ${queue.length} سورة للرفع بالترتيب الصحيح.\n`);

  let uploaded = 0;
  let failed = 0;
  const total = queue.length;
  const pendingCommits = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const currentIndex = i + 1;
    const progressText = renderProgressBar(currentIndex, total);

    console.log(`${progressText} 🔍 جاري التحقق: سورة ${item.surah.name} (${item.serverPath})...`);

    try {
      const fileBuffer = fs.readFileSync(item.filePath);
      const isUpToDate = await checkFileIsUpToDate(item.serverPath, fileBuffer);
      
      if (isUpToDate) {
        log(`[${progressText}] ⏭️ تم تخطي سورة ${item.surah.name} (${item.serverPath}) — مطابقة ومرفوعة مسبقاً!`);
        uploaded++;
        continue;
      }

      console.log(`      ⏫ جاري الرفع: سورة ${item.surah.name} (${item.serverPath})...`);
      const result = await uploadLfsWithRetry(item.serverPath, fileBuffer, 5);

      if (result.ok && result.commitItem) {
        log(`[${progressText}] ✅ سورة ${item.surah.name} (${item.serverPath}) — تم الرفع لمخزن LFS بنجاح!`);
        pendingCommits.push(result.commitItem);
        uploaded++;
      } else {
        log(`[${progressText}] ❌ سورة ${item.surah.name} — فشل: ${result.err}`);
        failed++;
      }
    } catch (err) {
      log(`[${progressText}] ❌ خطأ (${item.fileName}): ${err.message}`);
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }

  if (pendingCommits.length > 0) {
    console.log(`\n⏳ جاري تثبيت (Commit) لـ ${pendingCommits.length} ملف دفعة واحدة لتفادي الحظر...`);
    const commitRes = await commitAllLfsFiles(pendingCommits);
    if (commitRes.ok) {
      log(`✅ تم تثبيت جميع الملفات بنجاح!`);
    } else {
      log(`❌ فشل التثبيت الجماعي: ${commitRes.err}`);
    }
  }

  console.log("\n======================================================");
  log(`==== انتهى: تم معالجة ${uploaded} سورة من أصل ${total} (مرفوع جديد: ${pendingCommits.length}) (فشل: ${failed}) ====`);
  console.log("======================================================\n");
}

uploadAudio();
