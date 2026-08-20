import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const sourcePhoto = path.join(projectRoot, 'public', 'my-photo.png');

async function createIcon() {
  if (!fs.existsSync(sourcePhoto)) {
    console.error('Source photo not found at:', sourcePhoto);
    return;
  }

  console.log('Loading source photo:', sourcePhoto);
  const image = await Jimp.read(sourcePhoto);

  // We want to center-crop the upper-middle part (the reciter's face and upper body with Quran)
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const size = Math.min(width, height);
  
  // Crop square around the face / upper body
  const x = Math.floor((width - size) / 2);
  const y = Math.floor((height - size) * 0.15); // slightly higher to capture face & Quran nicely
  
  image.crop({ x, y, w: size, h: size });

  const tauriIconsDir = path.join(projectRoot, 'src-tauri', 'icons');
  if (!fs.existsSync(tauriIconsDir)) {
    fs.mkdirSync(tauriIconsDir, { recursive: true });
  }

  const targets = [
    { dest: path.join(projectRoot, 'public', 'pwa-512x512.png'), size: 512 },
    { dest: path.join(projectRoot, 'public', 'pwa-192x192.png'), size: 192 },
    { dest: path.join(projectRoot, 'public', 'favicon.png'), size: 64 },
    { dest: path.join(tauriIconsDir, '32x32.png'), size: 32 },
    { dest: path.join(tauriIconsDir, '128x128.png'), size: 128 },
    { dest: path.join(tauriIconsDir, '128x128@2x.png'), size: 256 },
    { dest: path.join(tauriIconsDir, 'icon.png'), size: 512 },
  ];

  for (const target of targets) {
    const clone = image.clone();
    clone.resize({ w: target.size, h: target.size });
    await clone.write(target.dest);
    console.log(`Generated icon: ${target.dest} (${target.size}x${target.size})`);
  }

  // Also write public/favicon.ico and icon.ico by copying the generated 128/64 png
  const icon32 = path.join(tauriIconsDir, '32x32.png');
  fs.copyFileSync(icon32, path.join(projectRoot, 'public', 'favicon.ico'));
  fs.copyFileSync(icon32, path.join(projectRoot, 'icon.ico'));
  fs.copyFileSync(icon32, path.join(tauriIconsDir, 'icon.ico'));

  console.log('✅ All icons generated successfully across Mobile, Web, Desktop and TV!');
}

createIcon().catch(console.error);
