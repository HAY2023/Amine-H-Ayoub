const { spawn } = require('child_process');

console.log('Generating keys without password...');

const child = spawn('npx', ['tauri', 'signer', 'generate', '-w', 'tauri.key'], {
    shell: true,
});

child.stdout.on('data', (data) => {
    console.log(`\n${data.toString()}`);
    // If it asks for password, send Enter
    if (data.toString().includes('Password:')) {
        child.stdin.write('\n');
    }
    if (data.toString().includes('Password (one more time):')) {
        child.stdin.write('\n');
    }
});

child.stderr.on('data', (data) => {
    console.error(`${data}`);
});

child.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
    console.log('\n✅ Keys generated! You can find your private key in "tauri.key" and public key in "tauri.key.pub".');
    console.log('Please copy the public key content from "tauri.key.pub" and put it in tauri.conf.json.');
});
