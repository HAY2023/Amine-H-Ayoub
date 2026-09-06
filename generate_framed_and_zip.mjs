import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ASSETS_DIR = path.resolve('h:/learn-quran-kids-1/google-play-assets');
const SCREENSHOTS_DIR = path.join(ASSETS_DIR, 'screenshots');
const FRAMED_DIR = path.join(ASSETS_DIR, 'framed-screenshots');

if (!fs.existsSync(FRAMED_DIR)) {
  fs.mkdirSync(FRAMED_DIR, { recursive: true });
}

const screens = [
  { file: 'screenshot-01-main-page.png', text: 'تلاوات وحفظ القرآن بطريقة ممتعة' },
  { file: 'screenshot-02-games.png', text: 'ألعاب تعليمية شيقة للمكافأة' },
  { file: 'screenshot-03-shop.png', text: 'متجر شخصيات أبطال القرآن' },
  { file: 'screenshot-04-settings.png', text: 'إعدادات مخصصة لحماية طفلك' },
  { file: 'screenshot-05-parent-dashboard.png', text: 'لوحة متكاملة لمتابعة الإنجازات' }
];

async function generateAndZip() {
  console.log('Launching local Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true
  });
  
  for (const screen of screens) {
    const srcPath = path.join(SCREENSHOTS_DIR, screen.file);
    if (!fs.existsSync(srcPath)) {
      console.log(`Skipping ${screen.file} - not found`);
      continue;
    }

    const imgData = fs.readFileSync(srcPath);
    const base64Img = `data:image/png;base64,${imgData.toString('base64')}`;

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700&display=swap');
          
          body {
            margin: 0;
            padding: 0;
            width: 1080px;
            height: 1920px;
            background: linear-gradient(135deg, #FDFBF7 0%, #D2B48C 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: 'Cairo', sans-serif;
            overflow: hidden;
          }
          
          .text-container {
            margin-top: 150px;
            margin-bottom: 80px;
            text-align: center;
            width: 900px;
          }

          .title {
            font-size: 85px;
            color: #5D4037;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            line-height: 1.3;
          }

          .phone-frame {
            width: 828px;
            height: 1450px;
            background: #000;
            border-radius: 60px;
            padding: 24px;
            box-shadow: 0 40px 80px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.5);
            position: relative;
            box-sizing: border-box;
          }

          .phone-screen {
            width: 100%;
            height: 100%;
            background: #fff;
            border-radius: 40px;
            overflow: hidden;
            position: relative;
          }

          .notch {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 250px;
            height: 40px;
            background: #000;
            border-bottom-left-radius: 24px;
            border-bottom-right-radius: 24px;
            z-index: 10;
          }

          .screenshot {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center top;
          }
          
          .decoration {
            position: absolute;
            font-size: 150px;
            opacity: 0.1;
            color: #fff;
          }
          
          .star1 { top: 100px; left: 100px; }
          .star2 { top: 300px; right: 80px; font-size: 100px; }
          .moon { bottom: 200px; left: 120px; font-size: 200px; }
        </style>
      </head>
      <body>
        <div class="decoration star1">★</div>
        <div class="decoration star2">✦</div>
        <div class="decoration moon">🌙</div>
        
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
    
    // Wait for fonts
    await new Promise(r => setTimeout(r, 1000));
    
    const outputPath = path.join(FRAMED_DIR, `framed-${screen.file}`);
    await page.screenshot({ path: outputPath });
    console.log(`✅ Created framed screenshot: ${screen.file}`);
    
    await page.close();
  }

  await browser.close();
  console.log('🎉 All framed screenshots generated successfully!');

}

generateAndZip().catch(console.error);

