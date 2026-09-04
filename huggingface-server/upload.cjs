const fs = require('fs');
const path = require('path');

const TOKEN = process.env.HF_TOKEN;
const HEADERS = { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function main() {
    const repoId = `hammoualiyoucef20/quran-kids-quiz`;
    const url = `https://huggingface.co/api/spaces/${repoId}/commit/main`;

    const questionsJson = fs.readFileSync(path.join(__dirname, "questions.json")).toString('base64');
    
    const commitData = {
        summary: "Upload questions.json 2",
        operations: [
            {
                operation: "add",
                path: "questions.json",
                content: questionsJson,
                encoding: "base64"
            }
        ]
    };

    const res = await fetch(url, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(commitData)
    });

    console.log("Status:", res.status);
    console.log("Response:", await res.text());
}

main();
