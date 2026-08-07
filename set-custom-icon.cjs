const fs = require('fs');
const path = require('path');

const sourcePath = 'C:\\\\Users\\\\ايمان\\\\.gemini\\\\antigravity-ide\\\\brain\\\\77c44dee-dbac-4195-9c0c-bebb01294380\\\\quran_kids_icon_1786098433109.png';
const targetPath = path.join(__dirname, 'public', 'pwa-512x512.png');

try {
    fs.copyFileSync(sourcePath, targetPath);
    console.log('✅ تم تعيين الأيقونة الجميلة المصممة خصيصاً لتطبيقك كأيقونة رسمية!');
    console.log('الآن قم برفعها عبر الأوامر التالية:');
    console.log('git add public/pwa-512x512.png');
    console.log('git commit -m "feat: use generated beautiful icon"');
    console.log('git push origin main');
} catch (err) {
    console.error('حدث خطأ أثناء نسخ الأيقونة:', err.message);
}
