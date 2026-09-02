import { readFile, writeFile } from 'node:fs/promises';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

function createSquarePng(source, width) {
  const { data: srcData, width: srcW, height: srcH } = source;
  const out = new PNG({ width, height: width });

  // Fill white background.
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 0xff;
    out.data[i + 1] = 0xff;
    out.data[i + 2] = 0xff;
    out.data[i + 3] = 0xff;
  }

  const scale = Math.min(width / srcW, width / srcH);
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));
  const offsetX = Math.floor((width - targetW) / 2);
  const offsetY = Math.floor((width - targetH) / 2);

  for (let y = 0; y < targetH; y++) {
    const srcY = Math.min(srcH - 1, Math.floor(y / scale));
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(srcW - 1, Math.floor(x / scale));
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = ((offsetY + y) * width + offsetX + x) * 4;
      out.data[dstIdx] = srcData[srcIdx];
      out.data[dstIdx + 1] = srcData[srcIdx + 1];
      out.data[dstIdx + 2] = srcData[srcIdx + 2];
      out.data[dstIdx + 3] = srcData[srcIdx + 3];
    }
  }

  return PNG.sync.write(out);
}

const jpegBuffer = await readFile('public/my-photo.png');
const source = jpeg.decode(jpegBuffer, { useTArray: true });
if (!source || !source.data) {
  throw new Error('Failed to decode public/my-photo.png as JPEG.');
}

const outputs = [
  { dest: 'public/pwa-192x192.png', size: 192 },
  { dest: 'public/pwa-512x512.png', size: 512 },
];

for (const { dest, size } of outputs) {
  const pngBuffer = createSquarePng(source, size);
  await writeFile(dest, pngBuffer);
  console.log(`Wrote ${dest} (${size}x${size})`);
}
