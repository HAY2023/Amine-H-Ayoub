import fs from 'fs';
import path from 'path';
import * as Jimp from 'jimp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processImages() {
  const outputDir = path.resolve('h:/learn-quran-kids-1/google-play-assets');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshotsDir = path.join(outputDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. App Icon
  const iconSrc = path.resolve('h:/learn-quran-kids-1/public/pwa-512x512.png');
  const iconDst = path.join(outputDir, 'app-icon-512x512.png');
  fs.copyFileSync(iconSrc, iconDst);
  console.log('✅ App Icon copied');

  // 2. Feature Graphic
  // We need to resolve the path carefully because of the Arabic username
  const brainDir = path.resolve(process.env.USERPROFILE || 'C:/Users/ايمان', '.gemini/antigravity-ide/brain/06b57b84-d857-4e3e-b7cc-262bfc49ee75');
  const featureSrc = path.join(brainDir, 'feature_graphic_final_1788707749140.jpg');
  const featureDst = path.join(outputDir, 'feature-graphic-1024x500.png');
  
  try {
    const image = await Jimp.read(featureSrc);
    console.log(`Feature source size: ${image.bitmap.width}x${image.bitmap.height}`);
    
    // Crop top third
    const cropHeight = Math.floor(image.bitmap.height / 3);
    image.crop(0, 0, image.bitmap.width, cropHeight);
    
    // Resize to 1024x500
    image.resize(1024, 500);
    await image.writeAsync(featureDst);
    console.log('✅ Feature Graphic created');
  } catch (error) {
    console.error(`❌ Error creating Feature Graphic:`, error);
  }

  // 3. Screenshots
  const screenshots = [
    { src: 'main_page_surahs_1788706612657.png', dst: 'screenshot-01-main-page.png' },
    { src: 'games_page_1788707331498.png', dst: 'screenshot-02-games.png' },
    { src: 'shop_page_1788707364061.png', dst: 'screenshot-03-shop.png' },
    { src: 'settings_page_1788707472720.png', dst: 'screenshot-04-settings.png' },
    { src: 'parent_page_1788707597535.png', dst: 'screenshot-05-parent-dashboard.png' }
  ];

  for (const ss of screenshots) {
    const srcPath = path.join(brainDir, ss.src);
    const dstPath = path.join(screenshotsDir, ss.dst);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, dstPath);
      try {
          const img = await Jimp.read(dstPath);
          console.log(`✅ Screenshot copied: ${ss.dst} (${img.bitmap.width}x${img.bitmap.height})`);
      } catch(e) {
          console.log(`✅ Screenshot copied (could not read size): ${ss.dst}`);
      }
    } else {
      console.log(`❌ Screenshot NOT FOUND: ${srcPath}`);
    }
  }
}

processImages().catch(console.error);
