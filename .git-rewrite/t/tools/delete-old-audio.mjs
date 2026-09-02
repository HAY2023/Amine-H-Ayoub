const REPO = "hammoualiyoucef20/quran-audio";
const TOKEN = "REDACTED_HF_TOKEN"; // استخدم أحد المفاتيح الجديدة

async function deleteOldFiles() {
  console.log("🔍 جاري جلب قائمة الملفات من السيرفر...");
  const treeUrl = `https://huggingface.co/api/datasets/${REPO}/tree/main`;
  const treeRes = await fetch(treeUrl);
  
  if (!treeRes.ok) {
    console.error("❌ فشل في جلب الملفات", await treeRes.text());
    return;
  }
  
  const files = await treeRes.json();
  
  // نريد استخراج الملفات التي يجب حذفها
  // السور المسموحة هي: 1.mp3، ومن 36.mp3 إلى 114.mp3
  const filesToDelete = files.filter(f => {
    if (f.type !== "file") return false;
    
    // إذا كان الملف _test.txt نحذفه
    if (f.path === "_test.txt") return true;
    
    const match = f.path.match(/^(\d+)\.mp3$/);
    if (!match) return false;
    
    const num = parseInt(match[1], 10);
    // نحذف إذا كان الرقم بين 2 و 35
    if (num >= 2 && num <= 35) return true;
    
    return false;
  });

  if (filesToDelete.length === 0) {
    console.log("✅ لا يوجد أي ملفات قديمة تحتاج للحذف!");
    return;
  }

  console.log(`🗑️ تم العثور على ${filesToDelete.length} ملف قديم. جاري حذفها دفعة واحدة...`);

  // إعداد أوامر الحذف (Delete Operations)
  const operations = filesToDelete.map(f => ({
    operation: "delete",
    path: f.path
  }));

  const commitPayload = {
    operations: operations,
    summary: "🗑️ حذف السور القديمة وغير المستخدمة",
  };

  const commitRes = await fetch(`https://huggingface.co/api/datasets/${REPO}/commit/main`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commitPayload)
  });

  if (commitRes.ok) {
    console.log("🎉 تم حذف جميع الملفات القديمة بنجاح من السيرفر!");
  } else {
    console.error("❌ فشل الحذف:", await commitRes.text());
  }
}

deleteOldFiles();
