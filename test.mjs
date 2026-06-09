import { chromium } from '@playwright/test';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/');
  
  // Wait for the SVG to load
  await page.waitForSelector('.ayah-rect');
  
  const ayahRects = await page.$$('.ayah-rect');
  if (ayahRects.length > 0) {
    const box = await ayahRects[0].boundingBox();
    if (box) {
      // Click the center of the box to trigger the modal
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      console.log('Clicked first ayah box to open modal');
    }
  }
  
  // Wait for modal to appear and click the first button containing "المعلم"
  await page.waitForSelector('button:has-text("المعلم")');
  await page.click('button:has-text("المعلم")');
  console.log('Clicked play button');
  
  // Wait for 3 seconds to allow audio to start and highlighting to appear
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'screenshot3.png' });
  console.log('Screenshot saved to screenshot3.png');
  
  await browser.close();
})();
