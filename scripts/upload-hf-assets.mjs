import fs from "fs";
import path from "path";
import { uploadFile } from "@huggingface/hub";

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const result = {
    repo: "hammoualiyoucef20/quran-audio",
    folder: "public/uploads",
    basePath: process.cwd(),
  };

  for (const arg of argv) {
    if (arg.startsWith("--repo=")) {
      result.repo = arg.replace(/^--repo=/, "");
    } else if (arg.startsWith("--folder=")) {
      result.folder = arg.replace(/^--folder=/, "");
    } else if (arg.startsWith("--path=")) {
      result.basePath = arg.replace(/^--path=/, "");
    }
  }

  return result;
}

async function main() {
  loadDotEnv();

  const { repo, folder, basePath } = parseArgs();
  const token = process.env.HF_TOKEN;

  if (!token) {
    console.error(
      "❌ HF_TOKEN not found. ضع الرمز في ملف .env أو في متغير بيئة HF_TOKEN."
    );
    process.exit(1);
  }

  const folderPath = path.resolve(basePath, folder);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    console.error(`❌ المجلد غير موجود أو ليس مجلدًا: ${folderPath}`);
    process.exit(1);
  }

  const supportedExtensions = new Set([
    ".mp3",
    ".wav",
    ".ogg",
    ".webm",
    ".flac",
    ".m4a",
    ".aac",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
  ]);

  const files = fs.readdirSync(folderPath).filter((file) => {
    return supportedExtensions.has(path.extname(file).toLowerCase());
  });

  if (files.length === 0) {
    console.error(`❌ لم يتم العثور على ملفات صوتية أو صور في ${folderPath}`);
    process.exit(1);
  }

  console.log("========================================");
  console.log(`🚀 رفع الملفات إلى Hugging Face repo: ${repo}`);
  console.log(`📁 المجلد: ${folderPath}`);
  console.log(`📦 عدد الملفات المدعومة: ${files.length}`);
  console.log("========================================\n");

  let uploaded = 0;

  for (const fileName of files) {
    const filePath = path.join(folderPath, fileName);
    const ext = path.extname(fileName).toLowerCase();
    const finalName = fileName;
    const progress = Math.round(((uploaded + 1) / files.length) * 100);

    console.log(`(${progress}%) 📤 رفع ${finalName} ...`);

    try {
      const content = fs.readFileSync(filePath);
      await uploadFile({
        repo: { type: "dataset", name: repo },
        credentials: { accessToken: token },
        file: {
          path: finalName,
          content: new Blob([content]),
        },
      });
      console.log(`✅ تم رفع ${finalName}`);
      uploaded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ فشل رفع ${finalName}: ${message}`);
    }
  }

  console.log("\n========================================");
  console.log(`🎉 انتهى الرفع، الملفات الناجحة: ${uploaded}/${files.length}`);
  console.log("========================================\n");
}

main().catch((error) => {
  console.error("❌ حدث خطأ غير متوقع:", error);
  process.exit(1);
});
