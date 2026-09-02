#!/usr/bin/env node

/**
 * Performance testing script
 * Measures various performance metrics
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Performance Analysis...\n');

// 1. Analyze bundle size
console.log('📦 Bundle Size Analysis:');
try {
  const distDir = path.join(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    const getSize = (filePath) => {
      const stats = fs.statSync(filePath);
      return (stats.size / 1024).toFixed(2); // KB
    };

    const getFiles = (dir, ext) => {
      return fs.readdirSync(dir)
        .filter(f => f.endsWith(ext))
        .map(f => ({
          name: f,
          size: parseFloat(getSize(path.join(dir, f)))
        }))
        .sort((a, b) => b.size - a.size);
    };

    console.log('\nJS Files (top 5):');
    const jsFiles = getFiles(distDir, '.js');
    jsFiles.slice(0, 5).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}: ${f.size}KB`);
    });

    console.log('\nCSS Files:');
    const cssFiles = getFiles(distDir, '.css');
    cssFiles.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}: ${f.size}KB`);
    });

    const totalSize = jsFiles.reduce((a, b) => a + b.size, 0) + 
                     cssFiles.reduce((a, b) => a + b.size, 0);
    console.log(`\n✅ Total Bundle Size: ${totalSize.toFixed(2)}KB\n`);
  }
} catch (error) {
  console.log('⚠️  Could not analyze bundle (build the project first)\n');
}

// 2. Check for performance bottlenecks
console.log('🔍 Performance Checks:');

const filesToCheck = [
  'src/components/AyahDisplay.tsx',
  'src/data/lazyCorpus.ts',
  'src/utils/lazyLoad.ts',
  'vite.config.ts'
];

let improvementsFound = 0;
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for preloading
    if (content.includes('preload')) {
      console.log(`✅ ${file} - has preloading`);
      improvementsFound++;
    }
    
    // Check for lazy loading
    if (content.includes('lazy')) {
      console.log(`✅ ${file} - has lazy loading`);
      improvementsFound++;
    }
    
    // Check for code splitting
    if (file.includes('vite') && content.includes('manualChunks')) {
      console.log(`✅ ${file} - has code splitting`);
      improvementsFound++;
    }
  }
});

console.log(`\n📊 Improvements Found: ${improvementsFound}\n`);

// 3. Recommendations
console.log('💡 Performance Recommendations:\n');

const recommendations = [
  'Run "npm run build" and check dist folder size',
  'Use Chrome DevTools Performance tab (F12 → Performance)',
  'Test with "npm run preview" in production mode',
  'Monitor Core Web Vitals: LCP, INP, CLS',
  'Use Lighthouse in Chrome (F12 → Lighthouse)',
  'Consider image optimization if images are large',
  'Monitor console for any errors or warnings'
];

recommendations.forEach((rec, i) => {
  console.log(`${i + 1}. ${rec}`);
});

console.log('\n✨ Next Steps:');
console.log('1. npm run build         (build for production)');
console.log('2. npm run preview       (preview production build)');
console.log('3. Open DevTools (F12)   (check performance)');
console.log('4. Test different pages  (measure load times)\n');
