import fs from 'fs';
import path from 'path';

const supabaseUrl = "https://cjrwtzcgtiqsbrqplouy.supabase.co";
const supabaseKey = "sb_publishable_HteeGJaZEmUIkzlEFr7lyg_qLHvOSNr";

const folderPath = "h:\\حاج أمين";

async function uploadFiles() {
  console.log("========================================");
  console.log("🚀 جاري الاتصال بالسيرفر لرفع السور...");
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
    if (!match) {
      console.log(`⚠️ تم تخطي ${file} (لا يبدأ برقم)`);
      continue;
    }

    const num = match[1];
    const newName = `${num}.mp3`;
    const filePath = path.join(folderPath, file);
    const fileData = fs.readFileSync(filePath);
    
    const progress = Math.round(((i) / mp3Files.length) * 100);
    console.log(`[${progress}%] 📤 جاري رفع سورة ${num} (${file}) ...`);
    
    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/quran-audio/surahs/${newName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'audio/mpeg',
          'x-upsert': 'true'
        },
        body: fileData
      });
      
      if (res.ok) {
        console.log(`        ✅ تم الرفع بنجاح: ${newName}`);
        successCount++;
      } else {
        const errorText = await res.text();
        console.log(`        ❌ خطأ في الرفع: ${errorText}`);
      }
    } catch (err) {
      console.log(`        ❌ فشل الاتصال بالسيرفر: ${err.message}`);
    }
  }
  
  console.log("\n========================================");
  console.log(`🎉 اكتملت العملية! تم رفع ${successCount} سور إلى السيرفر بنجاح.`);
  console.log("========================================\n");
}

uploadFiles();
