import fs from 'fs';
import path from 'path';
import { injectManifest } from 'workbox-build';

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, 'dist');
const swTemplate = path.join(projectRoot, 'sw-template.js');
const swDest = path.join(outDir, 'service-worker.js');

if (!fs.existsSync(swTemplate)) {
  console.error('sw-template.js not found');
  process.exit(1);
}

(async () => {
  try {
    // Copy template to dist (so injectManifest operates on a file inside outDir)
    fs.copyFileSync(swTemplate, swDest);

    const result = await injectManifest({
      swSrc: swDest,
      swDest,
      globDirectory: outDir,
      globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2,webmanifest}'],
    });

    console.log('Workbox injectManifest result:', result);
  } catch (err) {
    console.error('inject-sw error', err);
    process.exit(1);
  }
})();
