import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ASSETS_DIR = path.resolve('h:/learn-quran-kids-1/google-play-assets');
const SCREENSHOTS_DIR = path.join(ASSETS_DIR, 'screenshots');
const FRAMED_DIR = path.join(ASSETS_DIR, 'framed-screenshots-diverse');

const screens = [
  { file: '01-main.png', text: 'تلاوات وحفظ القرآن بطريقة ممتعة', bg: 'linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%)', color: '#ffffff', avatar: 'img-boy-reciter.jpg' },
  { file: '03-games.png', text: 'ألعاب تعليمية شيقة للمكافأة', bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#333333', avatar: 'img-girl-gold.jpg' },
  { file: '04-shop.png', text: 'متجر شخصيات أبطال القرآن', bg: 'linear-gradient(135deg, #be185d 0%, #e11d48 100%)', color: '#ffffff', avatar: 'img-boy-knight-ruby.jpg' },
  { file: '05-parent.png', text: 'لوحة متكاملة لمتابعة إنجازات طفلك', bg: 'linear-gradient(135deg, #4338ca 0%, #06b6d4 100%)', color: '#ffffff', avatar: 'img-girl-emerald-queen.jpg' },
  { file: '07-settings.png', text: 'إعدادات مخصصة لحماية طفلك', bg: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)', color: '#ffffff', avatar: 'img-boy-taqiyah-gold.jpg' },
  { file: '08-profiles.png', text: 'ملف شخصي خاص بكل طفل', bg: 'linear-gradient(135deg, #334155 0%, #52525b 100%)', color: '#ffffff', avatar: 'img-girl-hijab-emerald.jpg' },
];

async function frameScreenshots(browser) {
  console.log('Framing screenshots...');
  for (const screen of screens) {
    const srcPath = path.join(SCREENSHOTS_DIR, screen.file);
    if (!fs.existsSync(srcPath)) {
        console.log(`Skipping ${srcPath} - not found`);
        continue;
    }

    const imgData = fs.readFileSync(srcPath);
    const base64Img = `data:image/png;base64,${imgData.toString('base64')}`;
    
    // Read avatar
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

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    const outputPath = path.join(FRAMED_DIR, `store-${screen.file}`);
    await page.screenshot({ path: outputPath });
    console.log(`✅ Created framed screenshot: store-${screen.file}`);
    await page.close();
  }
}

async function run() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true
  });
  
  try {
    await frameScreenshots(browser);
    console.log('🎉 All framed screenshots generated successfully with avatars!');
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

run();
