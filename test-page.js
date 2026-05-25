import { chromium } from '@playwright/test';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  console.log('Navigating to http://localhost:5173/recitation-methods...');
  try {
    await page.goto('http://localhost:5173/recitation-methods', { waitUntil: 'networkidle', timeout: 10000 });
    console.log('Page loaded.');
  } catch (err) {
    console.log('Navigation error:', err.message);
  }
  
  await browser.close();
})();
