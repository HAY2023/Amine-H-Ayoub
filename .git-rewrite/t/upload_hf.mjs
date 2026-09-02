import { uploadFile } from "@huggingface/hub";
import fs from "fs";
import path from "path";

// Load .env manually if not already loaded by the runner
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
  console.error("❌ Error: HF_TOKEN is not defined in the environment or .env file.");
  process.exit(1);
}

const REPO = "hammoualiyoucef20/quran-audio";
const AUDIO_DIR = path.join(process.cwd(), "public", "audio", "surahs");

async function uploadAll() {
  console.log("Starting upload to Hugging Face Dataset:", REPO);
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith(".mp3"));
  
  for (const file of files) {
    const filePath = path.join(AUDIO_DIR, file);
    console.log(`Uploading ${file}...`);
    try {
      await uploadFile({
        repo: { type: "dataset", name: REPO },
        credentials: { accessToken: TOKEN },
        file: {
          path: file,
          content: new Blob([fs.readFileSync(filePath)])
        }
      });
      console.log(`✅ Successfully uploaded ${file}`);
    } catch (err) {
      console.error(`❌ Failed to upload ${file}:`, err.message);
    }
  }
  console.log("🎉 All uploads finished!");
}

uploadAll();
