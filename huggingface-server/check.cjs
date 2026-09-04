const TOKEN = process.env.HF_TOKEN;
const HEADERS = { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function check() {
    const res = await fetch("https://huggingface.co/api/spaces/hammoualiyoucef20/quran-kids-quiz", { headers: HEADERS });
    if (!res.ok) {
        console.error("Failed to fetch space info", await res.text());
        return;
    }
    const info = await res.json();
    console.log("Space info:");
    console.log(`Private: ${info.private}`);
    console.log(`Host: ${info.host}`);
    console.log(`URL: ${info.id}`);
}
check();
