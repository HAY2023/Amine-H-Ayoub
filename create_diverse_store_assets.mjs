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

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(FRAMED_DIR)) fs.mkdirSync(FRAMED_DIR, { recursive: true });

const screens = [
  { path: '/audio', file: '01-main.png', text: 'تلاوات وحفظ القرآن بطريقة ممتعة', bg: 'linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%)', color: '#ffffff', deco: ['🌟', '✨', '📖'] },
  { path: '/mushaf', file: '02-mushaf.png', text: 'تصفح وقراءة المصحف الشريف', bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#ffffff', deco: ['🕌', '🌙', '⭐'] },
  { path: '/games', file: '03-games.png', text: 'ألعاب تعليمية شيقة للمكافأة', bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#333333', deco: ['🎮', '🧩', '🏆'] },
  { path: '/shop', file: '04-shop.png', text: 'متجر شخصيات أبطال القرآن', bg: 'linear-gradient(135deg, #be185d 0%, #e11d48 100%)', color: '#ffffff', deco: ['🛍️', '💎', '🎁'] },
  { path: '/parent', file: '05-parent.png', text: 'لوحة متكاملة لمتابعة إنجازات طفلك', bg: 'linear-gradient(135deg, #4338ca 0%, #06b6d4 100%)', color: '#ffffff', deco: ['👨‍👩‍👧', '📊', '🥇'] },
  { path: '/manage-audio', file: '06-manage-audio.png', text: 'تخصيص وإدارة تلاواتك المفضلة', bg: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)', color: '#ffffff', deco: ['🎧', '🎙️', '🎶'] },
  { path: '/settings', file: '07-settings.png', text: 'إعدادات مخصصة لحماية طفلك', bg: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)', color: '#ffffff', deco: ['⚙️', '🔒', '🛡️'] },
  { path: '/profiles', file: '08-profiles.png', text: 'ملف شخصي خاص بكل طفل', bg: 'linear-gradient(135deg, #334155 0%, #52525b 100%)', color: '#ffffff', deco: ['👦', '👧', '🎨'] },
];

async function captureScreenshots(browser) {
  console.log('Capturing screenshots...');
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915 });
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.log("Could not load localhost:5173. Is Vite running?");
    process.exit(1);
  }

  await page.evaluate(() => {
      localStorage.setItem('mushaf:onboarded:v1', '1');
      sessionStorage.setItem('mushaf:pickedSession', '1');
  });
  
  for (const screen of screens) {
    console.log(`Navigating to ${screen.path}...`);
    await page.goto(`http://localhost:5173${screen.path}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Hide UI elements if needed or just take screenshot
    const outPath = path.join(SCREENSHOTS_DIR, screen.file);
    await page.screenshot({ path: outPath });
    console.log(`Captured ${screen.file}`);
  }
  await page.close();
}

async function frameScreenshots(browser) {
  console.log('Framing screenshots...');
  for (const screen of screens) {
    const srcPath = path.join(SCREENSHOTS_DIR, screen.file);
    if (!fs.existsSync(srcPath)) continue;

    const imgData = fs.readFileSync(srcPath);
    const base64Img = `data:image/png;base64,${imgData.toString('base64')}`;

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
          
          .decoration {
            position: absolute; font-size: 200px; opacity: 0.15;
            text-shadow: 0 0 20px rgba(255,255,255,0.5);
            z-index: 5;
          }
          
          .d1 { top: 120px; left: 80px; transform: rotate(-15deg); }
          .d2 { top: 400px; right: 50px; font-size: 160px; transform: rotate(20deg); }
          .d3 { bottom: 150px; left: 100px; font-size: 250px; transform: rotate(10deg); }
        </style>
      </head>
      <body>
        <div class="decoration d1">${screen.deco[0]}</div>
        <div class="decoration d2">${screen.deco[1]}</div>
        <div class="decoration d3">${screen.deco[2]}</div>
        
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
    await captureScreenshots(browser);
    await frameScreenshots(browser);
    console.log('🎉 All 8 diverse framed screenshots generated successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

run();
