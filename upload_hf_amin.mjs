import { uploadFile } from "@huggingface/hub";
import fs from "fs";
import path from "path";

if (!process.env.HF_TOKEN && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

const TOKEN = process.env.HF_TOKEN;
if (!TOKEN) {
  console.error("❌ خطأ: رمز Hugging Face (HF_TOKEN) غير موجود في ملف .env أو البيئة.");
  process.exit(1);
}

const REPO = "hammoualiyoucef20/quran-audio";
const folderPath = "h:\\حاج أمين";

async function uploadFiles() {
  console.log("========================================");
  console.log("🚀 جاري رفع السور إلى Hugging Face...");
  console.log("المستودع:", REPO);
  console.log("========================================\n");

  let files;
  try {
    files = fs.readdirSync(folderPath);
  } catch (err) {
    console.error("❌ تعذر العثور على المجلد h:\\حاج أمين");
    return;
  }

  const mp3Files = files.filter(f => f.endsWith('.mp3'));
  console.log(`📂 وجدت ${mp3Files.length} ملف صوتي في المجلد.`);
  
  let successCount = 0;

  for (let i = 0; i < mp3Files.length; i++) {
    const file = mp3Files[i];
    const match = file.match(/^(\d+)/);
    if (!match) continue;

    const num = match[1];
    const newName = `${num}.mp3`; // Hugging Face requires matching app naming
    const filePath = path.join(folderPath, file);
    
    const progress = Math.round(((i) / mp3Files.length) * 100);
    console.log(`[${progress}%] 📤 جاري رفع سورة ${num} (${file}) ...`);
    
    try {
      await uploadFile({
        repo: { type: "dataset", name: REPO },
        credentials: { accessToken: TOKEN },
        file: {
          path: newName,
          content: new Blob([fs.readFileSync(filePath)])
        }
      });
      console.log(`        ✅ تم الرفع بنجاح: ${newName}`);
      successCount++;
    } catch (err) {
      console.log(`        ❌ فشل الرفع: ${err.message}`);
    }
  }
  
  console.log("\n========================================");
  console.log(`🎉 اكتملت العملية! تم رفع ${successCount} سور إلى Hugging Face بنجاح.`);
  console.log("========================================\n");
}

uploadFiles();
