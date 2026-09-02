const fs = require('fs');
const buffer = Buffer.alloc(8);
const fd = fs.openSync('public/pwa-512x512.png', 'r');
fs.readSync(fd, buffer, 0, 8, 0);
fs.closeSync(fd);

const isPng = buffer.toString('hex').toUpperCase() === '89504E470D0A1A0A';
console.log('Hex Signature:', buffer.toString('hex').toUpperCase());
console.log('Is valid PNG signature?', isPng);
