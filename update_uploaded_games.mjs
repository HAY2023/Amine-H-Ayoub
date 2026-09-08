import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const userUploadedDir = 'C:\\Users\\ايمان\\.gemini\\antigravity-ide\\brain\\8a8ec281-2fb4-4eb2-935e-b94358adde8a\\.user_uploaded';
const mobileUploaded = path.join(userUploadedDir, 'media_1788717105140.png');
const desktopUploaded = path.join(userUploadedDir, 'media_1788717105145.png');

const MS_DIR = 'H:\\learn-quran-kids-1\\microsoft-store-release';
const GP_DIR = 'H:\\learn-quran-kids-1\\google-play-release';

async function main() {
  // 1. Copy desktop screenshot directly to Microsoft Store
  fs.copyFileSync(desktopUploaded, path.join(MS_DIR, 'screenshots', '02-games.png'));
  console.log('✅ Updated Microsoft Store desktop screenshot: 02-games.png');

  // Also save raw mobile screenshot
  fs.copyFileSync(mobileUploaded, path.join(GP_DIR, 'screenshots', '02-games-raw.png'));

  // 2. Frame mobile screenshot for Google Play
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const mobileImgData = fs.readFileSync(mobileUploaded);
  const base64Img = `data:image/png;base64,${mobileImgData.toString('base64')}`;
  
  const avatarPath = path.resolve('h:/learn-quran-kids-1/public/avatars/img-girl-gold.jpg');
  let base64Avatar = '';
  if (fs.existsSync(avatarPath)) {
      const avatarData = fs.readFileSync(avatarPath);
      base64Avatar = `data:image/jpeg;base64,${avatarData.toString('base64')}`;
  }

  const screen = {
    text: 'ألعاب تعليمية شيقة للمكافأة',
    bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    color: '#333333',
  };

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
  
  const outputPath = path.join(GP_DIR, 'screenshots', 'store-02-games.png');
  await framePage.screenshot({ path: outputPath });
  await framePage.close();
  await browser.close();
  console.log('✅ Updated Google Play framed screenshot: store-02-games.png');
}

main().catch(console.error);
