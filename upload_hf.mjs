import { uploadFile } from "@huggingface/hub";
import fs from "fs";
import path from "path";

const TOKEN = "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";
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
