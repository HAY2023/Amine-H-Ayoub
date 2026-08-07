const fs = require('fs');
const https = require('https');
const path = require('path');

const targetPath = path.join(__dirname, 'public', 'pwa-512x512.png');

console.log('Downloading a valid PNG image...');

https.get('https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png', (res) => {
    if (res.statusCode !== 200) {
        console.error('Failed to download image. Status code:', res.statusCode);
        return;
    }

    const fileStream = fs.createWriteStream(targetPath);
    res.pipe(fileStream);

    fileStream.on('finish', () => {
        fileStream.close();
        console.log('✅ Successfully replaced pwa-512x512.png with a valid PNG file!');
        console.log('You can now run:');
        console.log('git add public/pwa-512x512.png');
        console.log('git commit -m "fix: replace fake PNG with genuine PNG binary"');
        console.log('git push origin main');
    });
}).on('error', (err) => {
    console.error('Error downloading image:', err.message);
});
