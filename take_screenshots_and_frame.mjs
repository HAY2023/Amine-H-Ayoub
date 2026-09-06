import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ASSETS_DIR = path.resolve('h:/learn-quran-kids-1/google-play-assets');
const SCREENSHOTS_DIR = path.join(ASSETS_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const routes = [
  { path: '/', name: 'screenshot-01-main-page.png' },
  { path: '/games', name: 'screenshot-02-games.png' },
  { path: '/shop', name: 'screenshot-03-shop.png' },
  { path: '/settings', name: 'screenshot-04-settings.png' },
  { path: '/parent', name: 'screenshot-05-parent-dashboard.png' },
];

async function capture() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 412, height: 915 } // Typical mobile viewport
  });

  const page = await browser.newPage();
  
  // Go to main page first to set local storage
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.log("Could not load localhost:5173. Is the server running?");
    await browser.close();
    process.exit(1);
  }

  await page.evaluate(() => {
      localStorage.setItem('mushaf:onboarded', 'true');
      localStorage.setItem('mushaf:profile_picked', 'true');
  });
  
  for (const route of routes) {
    console.log(`Navigating to ${route.path}...`);
    await page.goto(`http://localhost:5173${route.path}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    const outPath = path.join(SCREENSHOTS_DIR, route.name);
    await page.screenshot({ path: outPath });
    console.log(`Captured ${route.name}`);
  }

  await browser.close();
  console.log('Screenshots captured successfully.');
}

async function run() {
  try {
     await capture();
     console.log('Running framing script...');
     const { execSync } = await import('child_process');
     execSync('node generate_framed_and_zip.mjs', { stdio: 'inherit', cwd: 'h:/learn-quran-kids-1' });
     console.log('All done!');
  } catch (err) {
     console.error(err);
  }
}

run();
