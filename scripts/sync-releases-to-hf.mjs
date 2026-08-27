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

async function main() {
  loadDotEnv();

  const token = process.env.HF_TOKEN;
  if (!token) {
    console.error("❌ خطأ: رمز Hugging Face (HF_TOKEN) غير موجود في ملف .env");
    process.exit(1);
  }

  const HF_REPO = "hammoualiyoucef20/quran-app-releases";
  const GITHUB_REPO = "HAY2023/Amine-H-Ayoub";

  console.log("==================================================");
  console.log(`🚀 نقل ومزامنة الإصدارات من GitHub إلى Hugging Face`);
  console.log(`📦 مستودع Hugging Face: ${HF_REPO}`);
  console.log("==================================================\n");

  // 1. مزامنة ملف releases.json
  const releasesJsonPath = path.resolve(process.cwd(), "releases-site", "releases.json");
  if (fs.existsSync(releasesJsonPath)) {
    console.log("📄 جاري رفع ملف releases.json إلى Hugging Face...");
    try {
      await uploadFile({
        repo: { type: "dataset", name: HF_REPO },
        credentials: { accessToken: token },
        file: {
          path: "releases.json",
          content: new Blob([fs.readFileSync(releasesJsonPath)]),
        },
      });
      console.log("✅ تم رفع releases.json بنجاح.");
    } catch (e) {
      console.error("❌ فشل رفع releases.json:", e.message);
    }
  }

  // 2. جلب وتنزيل ملفات الإصدار الأخير من GitHub ورفعها لـ Hugging Face
  console.log(`\n🔍 جاري جلب أحدث الحزم من GitHub (${GITHUB_REPO})...`);
  try {
    const headers = { Accept: "application/vnd.github.v3+json" };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, { headers });
    if (res.ok) {
      const data = await res.json();
      const assets = data.assets || [];
      console.log(`📦 تم العثور على ${assets.length} ملف في أحدث إصدار على GitHub.`);

      for (const asset of assets) {
        const name = asset.name.toLowerCase();
        let targetHfName = asset.name;

        if (name.endsWith(".exe")) {
          targetHfName = "Quran_1.0.0_x64-setup.exe";
        } else if (name.includes("tv") && name.endsWith(".apk")) {
          targetHfName = "Quran_1.0.0_Android_TV.apk";
        } else if (name.endsWith(".apk")) {
          targetHfName = "Quran_1.0.0_Android.apk";
        }

        console.log(`\n📥 جاري تحميل ${asset.name} من GitHub (${Math.round(asset.size / (1024 * 1024))} MB)...`);
        const fileRes = await fetch(asset.browser_download_url);
        if (!fileRes.ok) {
          console.error(`❌ فشل تحميل ${asset.name} من GitHub`);
          continue;
        }

        const arrayBuffer = await fileRes.arrayBuffer();
        console.log(`📤 جاري الرفع إلى Hugging Face كـ ${targetHfName} ...`);
        await uploadFile({
          repo: { type: "dataset", name: HF_REPO },
          credentials: { accessToken: token },
          file: {
            path: targetHfName,
            content: new Blob([arrayBuffer]),
          },
        });
        console.log(`✅ تم نقل ورفع ${targetHfName} إلى Hugging Face بنجاح!`);
      }
    } else {
      console.log(`⚠️ تعذر جلب الإصدار من GitHub (${res.status}). جاري التحقق من الملفات المحلية...`);
    }
  } catch (err) {
    console.error("⚠️ خطأ أثناء جلب الإصدارات من GitHub:", err.message);
  }

  // 3. التحقق من أي ملفات بناء محلية في مجلدات dist أو target ورفعها إن وجدت
  const localDirs = [
    { dir: "dist-apk", ext: ".apk", target: "Quran_1.0.0_Android.apk" },
    { dir: "dist-tv", ext: ".apk", target: "Quran_1.0.0_Android_TV.apk" },
  ];

  for (const item of localDirs) {
    const p = path.resolve(process.cwd(), item.dir);
    if (fs.existsSync(p)) {
      const files = fs.readdirSync(p).filter(f => f.endsWith(item.ext));
      for (const f of files) {
        const fullP = path.join(p, f);
        console.log(`📤 جاري رفع الملف المحلي ${f} إلى Hugging Face كـ ${item.target}...`);
        try {
          await uploadFile({
            repo: { type: "dataset", name: HF_REPO },
            credentials: { accessToken: token },
            file: {
              path: item.target,
              content: new Blob([fs.readFileSync(fullP)]),
            },
          });
          console.log(`✅ تم رفع ${item.target} بنجاح.`);
        } catch (e) {
          console.error(`❌ فشل رفع ${f}:`, e.message);
        }
      }
    }
  }

  console.log("\n==================================================");
  console.log("🎉 اكتملت عملية النقل والمزامنة إلى Hugging Face بنجاح!");
  console.log("==================================================");
}

main().catch(err => {
  console.error("❌ خطأ غير متوقع:", err);
  process.exit(1);
});
