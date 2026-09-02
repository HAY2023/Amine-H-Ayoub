// رفع ملف المكافآت اليومية إلى HuggingFace Dataset
import fs from 'fs';

const REPO = "hammoualiyoucef20/quran-audio";
const FILE = "daily-rewards.json";
const TOKEN = process.argv[2] || "REDACTED_HF_TOKEN";
const LOCAL = new URL("./daily-rewards.json", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:");

const content = fs.readFileSync(LOCAL);
const b64 = content.toString("base64");

const lines = [
  JSON.stringify({ key: "header", value: { summary: "تحديث المكافآت اليومية" } }),
  JSON.stringify({ key: "file", value: { path: FILE, size: content.length, type: "file", operation: "addOrUpdate", content: b64, encoding: "base64" } }),
];

const res = await fetch(`https://huggingface.co/api/datasets/${REPO}/commit/main`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/x-ndjson" },
  body: lines.join("\n") + "\n",
});

console.log("HTTP", res.status, await res.text());