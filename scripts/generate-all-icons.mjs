import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const originalPhoto = path.join(projectRoot, 'public', 'my-photo.png');

async function run() {
  console.log('--- Starting Icon Generation with Full Head & Framing ---');
  
  if (!fs.existsSync(originalPhoto)) {
    throw new Error('Original photo not found at: ' + originalPhoto);
  }

  console.log('Loading original full photo:', originalPhoto);
  const img = await Jimp.read(originalPhoto);
  
  const width = img.bitmap.width; // 512
  const height = img.bitmap.height; // 776
  const cropSize = Math.min(width, height); // 512

  // Start precisely at y=0 so top of head and hair have full space/background above
  const cropX = Math.floor((width - cropSize) / 2); // 0
  const cropY = 0;

  console.log(`Cropping square: x=${cropX}, y=${cropY}, size=${cropSize}`);
  const cropped = img.clone().crop({ x: cropX, y: cropY, w: cropSize, h: cropSize });

  // 1. Master Icon (1024x1024)
  const tauriIconsDir = path.join(projectRoot, 'src-tauri', 'icons');
  if (!fs.existsSync(tauriIconsDir)) {
    fs.mkdirSync(tauriIconsDir, { recursive: true });
  }

  const masterIconPath = path.join(tauriIconsDir, 'app-icon.png');
  const masterImg = cropped.clone().resize({ w: 1024, h: 1024 });
  await masterImg.write(masterIconPath);
  console.log('✅ Generated master 1024x1024 icon at:', masterIconPath);

  // 2. Releases site icon
  const releasesAssetsDir = path.join(projectRoot, 'releases-site', 'assets');
  if (fs.existsSync(releasesAssetsDir)) {
    const relIcon = cropped.clone().resize({ w: 512, h: 512 });
    await relIcon.write(path.join(releasesAssetsDir, 'app-icon.png'));
    console.log('✅ Updated releases-site/assets/app-icon.png');
  }

  // 3. Web / PWA icons in public/
  const publicDir = path.join(projectRoot, 'public');
  
  const pwa512 = cropped.clone().resize({ w: 512, h: 512 });
  await pwa512.write(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✅ Updated public/pwa-512x512.png');

  const pwa192 = cropped.clone().resize({ w: 192, h: 192 });
  await pwa192.write(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✅ Updated public/pwa-192x192.png');

  const favPng = cropped.clone().resize({ w: 64, h: 64 });
  await favPng.write(path.join(publicDir, 'favicon.png'));
  console.log('✅ Updated public/favicon.png');

  // 4. Run Tauri CLI to regenerate all icons for Windows, Mac, Android, and iOS
  console.log('Running Tauri CLI icon generator...');
  try {
    execSync(`npx @tauri-apps/cli icon "${masterIconPath}"`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    console.log('✅ Tauri CLI regenerated all platform icons successfully!');
  } catch (err) {
    console.warn('Tauri icon command warning:', err.message);
  }

  // 5. Copy generated icon.ico to public/favicon.ico and root icon.ico
  const tauriIco = path.join(tauriIconsDir, 'icon.ico');
  if (fs.existsSync(tauriIco)) {
    fs.copyFileSync(tauriIco, path.join(publicDir, 'favicon.ico'));
    fs.copyFileSync(tauriIco, path.join(projectRoot, 'icon.ico'));
    console.log('✅ Copied icon.ico to root and public/favicon.ico');
  }

  // Clean up any temporary test files
  const testFiles = ['public/test-crop-0.png', 'public/test-canvas-fit.png'];
  for (const tf of testFiles) {
    const fullP = path.join(projectRoot, tf);
    if (fs.existsSync(fullP)) {
      fs.unlinkSync(fullP);
    }
  }

  console.log('--- All icons successfully updated with full head and perfect framing! ---');
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
