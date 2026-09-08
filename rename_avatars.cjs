const fs = require('fs');
const path = require('path');
const outDir = path.join(__dirname, 'public', 'avatars');
const boyDir = path.join(outDir, 'مجلد جديد (2)', 'صور اولاد');
const girlDir = path.join(outDir, 'مجلد جديد (2)', 'صور بنات');

let boyAvatars = [];
let girlAvatars = [];

const processDir = (dir, prefix, arr) => {
    let files = fs.readdirSync(dir);
    let id = 1;
    for (let file of files) {
        let ext = path.extname(file);
        let newName = prefix + '-' + id + ext;
        fs.renameSync(path.join(dir, file), path.join(outDir, newName));
        arr.push(newName);
        id++;
    }
};

processDir(boyDir, 'img-boy', boyAvatars);
processDir(girlDir, 'img-girl', girlAvatars);

console.log('Boys:', JSON.stringify(boyAvatars));
console.log('Girls:', JSON.stringify(girlAvatars));
