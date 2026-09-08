import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import * as Jimp from 'jimp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROJECT_DIR = 'h:/learn-quran-kids-1';
const GP_DIR = path.resolve(PROJECT_DIR, 'google-play-release');
const MS_DIR = path.resolve(PROJECT_DIR, 'microsoft-store-release');

// Create release directories
[GP_DIR, MS_DIR, path.join(GP_DIR, 'screenshots'), path.join(MS_DIR, 'screenshots')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const screens = [
  { path: '/audio', file: '01-main.png', text: 'تلاوات وحفظ القرآن بطريقة ممتعة', bg: 'linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%)', color: '#ffffff', avatar: 'img-boy-reciter.jpg' },
  { path: '/games', file: '02-games.png', text: 'ألعاب تعليمية شيقة للمكافأة', bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#333333', avatar: 'img-girl-gold.jpg' },
  { path: '/shop', file: '03-shop.png', text: 'متجر شخصيات أبطال القرآن', bg: 'linear-gradient(135deg, #be185d 0%, #e11d48 100%)', color: '#ffffff', avatar: 'img-boy-knight-ruby.jpg' },
  { path: '/parent', file: '04-parent.png', text: 'لوحة متكاملة لمتابعة إنجازات طفلك', bg: 'linear-gradient(135deg, #4338ca 0%, #06b6d4 100%)', color: '#ffffff', avatar: 'img-girl-emerald-queen.jpg' },
  { path: '/settings', file: '05-settings.png', text: 'إعدادات مخصصة لحماية طفلك', bg: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)', color: '#ffffff', avatar: 'img-boy-taqiyah-gold.jpg' },
  { path: '/profiles', file: '06-profiles.png', text: 'ملف شخصي خاص بكل طفل', bg: 'linear-gradient(135deg, #334155 0%, #52525b 100%)', color: '#ffffff', avatar: 'img-girl-hijab-emerald.jpg' },
];

async function captureAndFrame(browser) {
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
  } catch (e) {
    console.log("Could not load localhost:5174. Is Vite running?");
    process.exit(1);
  }

  // Set local storage to unlock Kids Mode properly
  await page.evaluate(() => {
      localStorage.setItem('mushaf:onboarded:v1', '1');
      sessionStorage.setItem('mushaf:pickedSession', '1');
      localStorage.setItem('mushaf:appMode', '"kids"');
      localStorage.setItem('mushaf:kidsHidden', 'false');
  });
  
  for (const screen of screens) {
    console.log(`Processing ${screen.path}...`);
    
    // 1. Capture Mobile (Google Play)
    await page.setViewport({ width: 412, height: 915 });
    await page.goto(`http://localhost:5174${screen.path}`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    if (screen.path === '/games') {
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise(r => setTimeout(r, 500));
    }
    const mobileImgPath = path.join(PROJECT_DIR, 'tmp-mobile.png');
    await page.screenshot({ path: mobileImgPath });

    // 2. Capture Desktop (Microsoft Store)
    await page.setViewport({ width: 1920, height: 1080 });
    // Small reload to adapt layout to desktop
    await page.goto(`http://localhost:5174${screen.path}`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));
    if (screen.path === '/games') {
      await page.evaluate(() => window.scrollBy(0, 400));
      await new Promise(r => setTimeout(r, 500));
    }
    const desktopImgPath = path.join(MS_DIR, 'screenshots', screen.file);
    await page.screenshot({ path: desktopImgPath });
    
    // 3. Frame the mobile screenshot for Google Play
    const mobileImgData = fs.readFileSync(mobileImgPath);
    const base64Img = `data:image/png;base64,${mobileImgData.toString('base64')}`;
    const avatarPath = path.resolve(`h:/learn-quran-kids-1/public/avatars/${screen.avatar}`);
    let base64Avatar = '';
    if (fs.existsSync(avatarPath)) {
        const avatarData = fs.readFileSync(avatarPath);
        base64Avatar = `data:image/jpeg;base64,${avatarData.toString('base64')}`;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800&display=swap');
          
          body {
            margin: 0; padding: 0;
            width: 1080px; height: 1920px;
            background: ${screen.bg};
            display: flex; flex-direction: column; align-items: center;
            font-family: 'Cairo', sans-serif;
            overflow: hidden;
            position: relative;
          }
          
          .text-container {
            margin-top: 180px;
            margin-bottom: 90px;
            text-align: center;
            width: 950px;
            z-index: 20;
          }

          .title {
            font-size: 80px;
            font-weight: 800;
            color: ${screen.color};
            text-shadow: 0px 4px 15px rgba(0,0,0,0.2);
            line-height: 1.4;
          }

          .phone-frame {
            width: 840px; height: 1460px;
            background: #111;
            border-radius: 65px; padding: 24px;
            box-shadow: 0 50px 100px rgba(0,0,0,0.4), inset 0 0 15px rgba(255,255,255,0.4);
            position: relative; box-sizing: border-box;
            z-index: 20;
          }

          .phone-screen {
            width: 100%; height: 100%;
            background: #fff; border-radius: 45px;
            overflow: hidden; position: relative;
          }

          .notch {
            position: absolute; top: 0; left: 50%; transform: translateX(-50%);
            width: 260px; height: 42px; background: #111;
            border-bottom-left-radius: 26px; border-bottom-right-radius: 26px; z-index: 10;
          }

          .screenshot {
            width: 100%; height: 100%;
            object-fit: cover; object-position: center top;
          }
          
          .avatar-deco {
            position: absolute;
            width: 400px;
            height: 400px;
            border-radius: 50%;
            object-fit: cover;
            opacity: 0.25;
            box-shadow: 0 0 50px rgba(255,255,255,0.2);
            z-index: 5;
            border: 10px solid rgba(255,255,255,0.2);
          }
          
          .a1 { top: -50px; right: -50px; transform: scale(1.5); }
          .a2 { bottom: 100px; left: -100px; transform: scale(1.2); }
        </style>
      </head>
      <body>
        <img class="avatar-deco a1" src="${base64Avatar}">
        <img class="avatar-deco a2" src="${base64Avatar}">
        
        <div class="text-container">
          <div class="title">${screen.text}</div>
        </div>
        
        <div class="phone-frame">
          <div class="notch"></div>
          <div class="phone-screen">
            <img class="screenshot" src="${base64Img}" alt="Screenshot">
          </div>
        </div>
      </body>
      </html>
    `;

    const framePage = await browser.newPage();
    await framePage.setViewport({ width: 1080, height: 1920 });
    await framePage.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    
    const outputPath = path.join(GP_DIR, 'screenshots', `store-${screen.file}`);
    await framePage.screenshot({ path: outputPath });
    await framePage.close();
    
    console.log(`✅ Captured and framed: ${screen.file}`);
  }
  
  await page.close();
}

async function copyAssets() {
  console.log("Copying metadata and generating icons...");
  
  const originalAssets = path.resolve(PROJECT_DIR, 'google-play-assets');
  
  // Google Play files
  const gpIcon = path.join(originalAssets, 'app-icon-512x512.png');
  const gpFeature = path.join(originalAssets, 'feature-graphic-1024x500.png');
  const gpMeta = path.join(originalAssets, 'Google_Play_Metadata.md');
  
  if (fs.existsSync(gpIcon)) fs.copyFileSync(gpIcon, path.join(GP_DIR, 'app-icon-512x512.png'));
  if (fs.existsSync(gpFeature)) fs.copyFileSync(gpFeature, path.join(GP_DIR, 'feature-graphic-1024x500.png'));
  if (fs.existsSync(gpMeta)) fs.copyFileSync(gpMeta, path.join(GP_DIR, 'Google_Play_Metadata.md'));
  
  // Microsoft Store files (Generate 300x300 logo from 512x512)
  if (fs.existsSync(gpIcon)) {
      try {
          const image = await Jimp.read(gpIcon);
          image.resize(300, 300);
          await image.writeAsync(path.join(MS_DIR, 'store-logo-300x300.png'));
          console.log("✅ Microsoft Store logo created.");
      } catch (e) {
          console.error("Error creating MS Store logo:", e);
      }
  }
  
  // Write MS Store metadata
  const msMetadata = `# بيانات متجر مايكروسوفت (Microsoft Store Metadata)

**اسم التطبيق:** حاج أيوب أمين: تعلّم القرآن للأطفال
**الوصف المختصر:** تطبيق تعليمي ممتع لحفظ القرآن الكريم بالتكرار مع ألعاب مكافآت.
**الوصف الكامل:** 
تطبيق "حاج أيوب أمين" هو بيئة تعليمية آمنة ومبتكرة مصممة خصيصاً لمساعدة الأطفال على تلاوة وحفظ القرآن الكريم بسهولة ومرح. نجمع بين أساليب التعليم الفعّالة والتحفيز الإيجابي لربط قلوب الأطفال بكتاب الله عز وجل.
`;
  fs.writeFileSync(path.join(MS_DIR, 'Microsoft_Store_Metadata.md'), msMetadata, 'utf8');
}

async function run() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true
  });
  
  try {
    await captureAndFrame(browser);
    await copyAssets();
    console.log('🎉 All release assets successfully generated!');
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

run();
