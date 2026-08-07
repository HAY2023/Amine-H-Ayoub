import { readFile } from 'node:fs/promises';

const { Jimp } = await import('jimp');

const srcPath = 'public/my-photo.png';
const srcBuffer = await readFile(srcPath);
const sourceImage = await Jimp.read(srcBuffer);

const files = [
  { dest: 'public/pwa-192x192.png', size: 192 },
  { dest: 'public/pwa-512x512.png', size: 512 },
];

for (const file of files) {
  const image = sourceImage.clone();
  image.contain(file.size, file.size, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE, 0xffffffff);
  await image.writeAsync(file.dest);
  console.log(`Created ${file.dest} ${file.size}x${file.size}`);
}
