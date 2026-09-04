const fs = require('fs');
const path = require('path');

const TOKEN = process.env.HF_TOKEN;
const HEADERS = { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function main() {
    // 1. Get user info
    console.log("Getting user info...");
    let res = await fetch("https://huggingface.co/api/whoami-v2", { headers: HEADERS });
    if (!res.ok) {
        console.error("Failed to authenticate", await res.text());
        return;
    }
    const userInfo = await res.json();
    const username = userInfo.name;
    console.log(`Logged in as ${username}`);

    // 2. Create Static Space
    const spaceName = "quran-kids-quiz";
    console.log(`Creating Static Space ${username}/${spaceName}...`);
    res = await fetch("https://huggingface.co/api/repos/create", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({
            type: "space",
            name: spaceName,
            sdk: "static" // STATIC SDK for free spaces
        })
    });
    if (!res.ok) {
        console.log("Space creation response:", await res.text(), "(Might already exist)");
    } else {
        console.log("Space created successfully.");
    }

    // 3. Upload files via the commit API
    const repoId = `${username}/${spaceName}`;
    const url = `https://huggingface.co/api/spaces/${repoId}/commit/main`;

    const questionsJson = fs.readFileSync(path.join(__dirname, "questions.json")).toString('base64');
    
    // Create a simple index.html for the static site
    const indexHtml = Buffer.from(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>Quran Kids Quiz API</title>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 50px;">
    <h1>سيرفر أسئلة القرآن للأطفال يعمل بنجاح! 🚀</h1>
    <p>تم تحميل الأسئلة في ملف <a href="./questions.json">questions.json</a></p>
</body>
</html>
    `).toString('base64');

    const commitData = {
        summary: "Initial deploy of Static Quran Kids Quiz API",
        operations: [
            {
                operation: "add",
                path: "questions.json",
                content: questionsJson,
                encoding: "base64"
            },
            {
                operation: "add",
                path: "index.html",
                content: indexHtml,
                encoding: "base64"
            }
        ]
    };

    console.log("Uploading files...");
    res = await fetch(url, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(commitData)
    });

    if (!res.ok) {
        console.error("Failed to commit files:", await res.text());
    } else {
        console.log("Files uploaded successfully!");
        console.log(`Space URL: https://huggingface.co/spaces/${repoId}`);
        console.log(`JSON Endpoint will be: https://${username}-${spaceName}.hf.space/questions.json`);
    }
}

main();
