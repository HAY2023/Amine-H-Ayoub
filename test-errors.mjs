import { chromium } from '@playwright/test';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5173/');
  
  // Wait for the SVG to load
  await page.waitForSelector('.ayah-rect');
  
  const ayahRects = await page.$$('.ayah-rect');
  if (ayahRects.length > 0) {
    const box = await ayahRects[0].boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  }
  
  // Wait for modal to appear and click the first button containing "المعلم"
  await page.waitForSelector('button:has-text("المعلم")');
  await page.click('button:has-text("المعلم")');
  
  // Wait for 10 seconds to allow multiple ayahs to play
  await page.waitForTimeout(10000);
  
  await browser.close();
})();
