/**
 * سيرفر الأسئلة — يولّد أسئلة قرآنية صعبة عشوائية من نص المصحف (متشابهات).
 * يعمل بـ Node.js خالص (بدون أي مكتبات خارجية).
 *
 * التشغيل:   node server.mjs   (PORT افتراضياً 8787)
 * المسارات:
 *   GET /health
 *   GET /questions?surah=114&type=missingword|nextayah|prevayah|whichsurah|ayahorder&count=10
 *      - type=all (افتراضي) = مزيج من كل الأنواع
 *      - surah=رقم السورة (اختياري — بدونها عشوائي من كل المصحف)
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);

// ── تحميل نص المصحف ──
const corpusPath = path.join(__dirname, "..", "src", "data", "localQuranCorpus.json");
let corpus = [];
try {
  corpus = JSON.parse(fs.readFileSync(corpusPath, "utf-8"));
  console.log(`✅ تم تحميل المصحف: ${corpus.length} سورة`);
} catch (e) {
  console.error("❌ تعذر تحميل localQuranCorpus.json:", e.message);
}

// ── تطبيع عربي (إزالة التشكيل والتطبيع) ──
const normalize = (t) =>
  String(t)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[^\u0621-\u064A\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wc = (t) => t.trim().split(/\s+/).length;

// بنك كلمات عام (يُبنى مرة واحدة)
const generalWordBank = [];
for (const s of corpus) for (const a of s.ayahs || []) for (const w of a.text.split(/\s+/)) {
  const clean = w.trim();
  if (clean.replace(/[^\u0600-\u06FF]/g, "").length >= 4) generalWordBank.push(clean);
}

// ── مولدات الأسئلة (مبدأ الصعوبة: مشتّات متشابهة) ──

/** كلمة ضائعة — مشتّات من كلمات السورة نفسها المتشابهة شكلاً */
function genMissingWord(s) {
  const candidates = s.ayahs.filter(a => wc(a.text) >= 3);
  if (!candidates.length) return null;
  const ayah = pick(candidates);
  const words = ayah.text.trim().split(/\s+/);
  const valid = words.map((w, idx) => ({ w, idx })).filter(it => it.w.replace(/[^\u0600-\u06FF]/g, "").length >= 4);
  if (!valid.length) return null;
  valid.sort((a, b) => b.w.length - a.w.length);
  const chosen = valid[Math.floor(Math.random() * Math.min(3, valid.length))];
  const missing = chosen.w;
  const norm = normalize(missing);

  // مشتّات: من كلمات السورة نفسها (متشابهة) ثم عامة
  const surahWords = [...new Set(s.ayahs.flatMap(a => a.text.split(/\s+/)).map(w => w.trim()).filter(w => w.replace(/[^\u0600-\u06FF]/g, "").length >= 3))];
  const options = new Set([missing]);
  for (const w of shuffle(surahWords)) { if (options.size >= 3) break; if (normalize(w) !== norm) options.add(w); }
  let guard = 0;
  while (options.size < 4 && guard++ < 300) { const w = pick(generalWordBank); if (normalize(w) !== norm) options.add(w); }
  if (options.size < 4) return null;

  const blanked = [...words]; blanked[chosen.idx] = "(........)";
  return {
    id: `${s.app}-${ayah.n}-${norm}`, type: "missingword",
    surahNum: s.app, surahName: s.name,
    prompt: blanked.join(" "), options: shuffle([...options]), answer: missing,
  };
}

/** الآية التالية — مشتّات آيات مجاورة من نفس السورة */
function genNextAyah(s) {
  if (s.ayahs.length < 3) return null;
  const i = Math.floor(Math.random() * (s.ayahs.length - 1));
  const answer = s.ayahs[i + 1];
  const distract = shuffle(s.ayahs.filter(a => a.n !== answer.n && a.n !== s.ayahs[i].n))
    .sort((a, b) => Math.abs(a.n - answer.n) - Math.abs(b.n - answer.n)).slice(0, 2);
  if (distract.length < 2) return null;
  return {
    id: `${s.app}-next-${answer.n}-${Math.floor(Math.random() * 1e6)}`, type: "nextayah",
    surahNum: s.app, surahName: s.name,
    prompt: s.ayahs[i].text, options: shuffle([answer.text, ...distract.map(d => d.text)]), answer: answer.text,
  };
}

/** الآية السابقة — مشتّات آيات مجاورة */
function genPrevAyah(s) {
  if (s.ayahs.length < 3) return null;
  const i = Math.floor(Math.random() * (s.ayahs.length - 1)) + 1;
  const answer = s.ayahs[i - 1];
  const distract = shuffle(s.ayahs.filter(a => a.n !== answer.n && a.n !== s.ayahs[i].n))
    .sort((a, b) => Math.abs(a.n - answer.n) - Math.abs(b.n - answer.n)).slice(0, 2);
  if (distract.length < 2) return null;
  return {
    id: `${s.app}-prev-${answer.n}-${Math.floor(Math.random() * 1e6)}`, type: "prevayah",
    surahNum: s.app, surahName: s.name,
    prompt: s.ayahs[i].text, options: shuffle([answer.text, ...distract.map(d => d.text)]), answer: answer.text,
  };
}

/** من أي سورة؟ — خيارات سور متشابهة (قريبة في الطول والترتيب) */
function genWhichSurah(s) {
  const ayahs = s.ayahs.filter(a => !(s.std === 1 && a.n === 1));
  if (!ayahs.length) return null;
  const ayah = pick(ayahs);
  const similar = corpus.filter(c => c.app !== s.app)
    .sort((x, y) => (Math.abs(x.ayahs.length - s.ayahs.length) + Math.abs(x.app - s.app) / 20)
      - (Math.abs(y.ayahs.length - s.ayahs.length) + Math.abs(y.app - s.app) / 20))
    .slice(0, 6);
  if (similar.length < 2) return null;
  const opts = shuffle([s, ...shuffle(similar).slice(0, 2)]);
  return {
    id: `${s.app}-which-${ayah.n}-${Math.floor(Math.random() * 1e6)}`, type: "whichsurah",
    surahNum: s.app, surahName: s.name,
    prompt: ayah.text, options: opts.map(o => o.name), answer: s.name,
  };
}

/** ترتيب ثلاث آيات متتالية */
function genAyahOrder(s) {
  if (s.ayahs.length < 3) return null;
  const i = Math.floor(Math.random() * (s.ayahs.length - 2));
  const seq = s.ayahs.slice(i, i + 3);
  return {
    id: `${s.app}-order-${seq[0].n}-${Math.floor(Math.random() * 1e6)}`, type: "ayahorder",
    surahNum: s.app, surahName: s.name,
    prompt: "رتّب الآيات الثلاث", options: shuffle(seq.map(a => a.text)), answer: seq.map(a => a.text),
  };
}

const GENERATORS = { missingword: genMissingWord, nextayah: genNextAyah, prevayah: genPrevAyah, whichsurah: genWhichSurah, ayahorder: genAyahOrder };

const rnd = () => Math.floor(Math.random() * 1e6);

// ── مولدات إضافية: نفس قواعد الصعوبة المطبقة في التطبيق بالضبط ──

/** أيّ سورة عدد آياتها أكثر؟ — المنافسة من أقرب 4 سور (فرق 1-4 آيات) */
function genWhichMore(s) {
  const candidates = corpus.filter(c => c.app !== s.app && c.ayahs.length !== s.ayahs.length)
    .sort((x, y) => Math.abs(x.ayahs.length - s.ayahs.length) - Math.abs(y.ayahs.length - s.ayahs.length))
    .slice(0, 4);
  if (!candidates.length) return null;
  const b = pick(candidates);
  const larger = s.ayahs.length > b.ayahs.length ? s : b;
  return {
    id: `${s.app}-whichmore-${b.app}-${rnd()}`, type: "which",
    surahNum: s.app, surahName: s.name,
    prompt: "أيّ سورة عدد آياتها أكثر؟",
    options: shuffle([s.name, b.name]), answer: larger.name,
    meta: { a: s.name, aCount: s.ayahs.length, b: b.name, bCount: b.ayahs.length },
  };
}

/** كم عدد آيات سورة X؟ — خيارات ±1 و±2 فقط */
function genQuiz(s) {
  const opts = new Set([s.ayahs.length]);
  for (const d of shuffle([-2, -1, 1, 2])) {
    const v = s.ayahs.length + d;
    if (v >= 1) opts.add(v);
    if (opts.size === 4) break;
  }
  return {
    id: `${s.app}-quiz-${rnd()}`, type: "quiz",
    surahNum: s.app, surahName: s.name,
    prompt: `كم عدد آيات سورة ${s.name}؟`,
    options: shuffle([...opts]).map(String), answer: String(s.ayahs.length),
  };
}

/** أيّ سورة عدد آياتها X؟ — خيارات بأعداد آيات مقاربة جداً (أقرب سورتين) */
function genCount(s) {
  const wrong = corpus.filter(c => c.app !== s.app && c.ayahs.length !== s.ayahs.length)
    .sort((a, b) => Math.abs(a.ayahs.length - s.ayahs.length) - Math.abs(b.ayahs.length - s.ayahs.length))
    .slice(0, 6);
  if (wrong.length < 2) return null;
  // نفضّل فرقاً صغيراً جداً (±1..4) مثل التطبيق
  const tight = shuffle(wrong.slice(0, 2)).slice(0, 2);
  const picked = tight.length === 2 ? tight : [pick(wrong)];
  return {
    id: `${s.app}-count-${rnd()}`, type: "count",
    surahNum: s.app, surahName: s.name,
    prompt: `أيّ سورة عدد آياتها ${s.ayahs.length}؟`,
    options: shuffle([s, ...picked]).map(o => o.name), answer: s.name,
    meta: { counts: [s, ...picked].map(o => ({ name: o.name, count: o.ayahs.length })) },
  };
}

/** ما رقم سورة X في المصحف؟ — خيارات ±1..3 */
function genSurahNum(s) {
  const opts = new Set([s.app]);
  for (const d of shuffle([-3, -2, -1, 1, 2, 3])) {
    const v = s.app + d;
    if (v >= 1 && v <= 114) opts.add(v);
    if (opts.size === 4) break;
  }
  return {
    id: `${s.app}-surahnum-${rnd()}`, type: "surahnum",
    surahNum: s.app, surahName: s.name,
    prompt: `ما رقم سورة ${s.name} في ترتيب المصحف؟`,
    options: shuffle([...opts]).map(String), answer: String(s.app),
  };
}

/** أيّ الآيتين كلماتها أكثر؟ — آيتان بفرق 1-2 كلمة فقط */
function genAyahLonger() {
  const a = pick(corpus), b = pick(corpus.filter(c => c.app !== a.app));
  if (!a?.ayahs?.length || !b?.ayahs?.length) return null;
  const ao = pick(a.ayahs);
  const close = b.ayahs.filter(x => x.text !== ao.text && Math.abs(wc(x.text) - wc(ao.text)) <= 2)
    .sort((x, y) => Math.abs(wc(x.text) - wc(ao.text)) - Math.abs(wc(y.text) - wc(ao.text)));
  if (!close.length) return null;
  const bo = close[Math.floor(Math.random() * Math.min(3, close.length))];
  if (wc(ao.text) === wc(bo.text)) return null;
  const longer = wc(ao.text) > wc(bo.text) ? ao.text : bo.text;
  return {
    id: `${a.app}-${ao.n}-longer-${b.app}-${bo.n}-${rnd()}`, type: "ayahlonger",
    surahNum: a.app, surahName: a.name,
    prompt: "أيّ الآيتين كلماتها أكثر؟",
    options: [ao.text, bo.text], answer: longer,
    meta: { an: a.name, bn: b.name, aWords: wc(ao.text), bWords: wc(bo.text) },
  };
}

/** رتّب السور الأربع حسب ترتيب المصحف — 4 سور متتالية/متقاربة (متشابهات) */
function genSurahOrder(s) {
  const near = corpus.filter(c => c.app !== s.app)
    .sort((x, y) => Math.abs(x.app - s.app) - Math.abs(y.app - s.app))
    .slice(0, 6);
  if (near.length < 3) return null;
  const four = shuffle([s, ...shuffle(near).slice(0, 3)]);
  return {
    id: `${s.app}-surahorder-${rnd()}`, type: "surahorder",
    surahNum: s.app, surahName: s.name,
    prompt: "اضغط السور الأربع حسب ترتيبها في المصحف",
    options: four.map(o => o.name),
    answer: [...four].sort((x, y) => x.app - y.app).map(o => o.name),
  };
}

/** ذاكرة السور — أزواج من سور متجاورة (المتشابهات) */
function genMemory() {
  const anchor = pick(corpus);
  const near = corpus.filter(c => c.app !== anchor.app)
    .sort((x, y) => Math.abs(x.app - anchor.app) - Math.abs(y.app - anchor.app))
    .slice(0, 5);
  if (near.length < 3) return null;
  const picked = [anchor, ...shuffle(near).slice(0, 3)];
  return {
    id: `memory-${anchor.app}-${rnd()}`, type: "memory",
    surahNum: anchor.app, surahName: anchor.name,
    prompt: "طابق كل سورة مع نفسها (أزواج متشابهات)",
    pairs: picked.map(p => ({ name: p.name, number: p.app })),
  };
}

/** الذاكرة بالمعاني — نافذة متجاورة من قائمة السور (معاني متشابهة) */
const SURAH_MEANINGS = [
  { surah: "سورة الفاتحة", meaning: "🤲 أم الكتاب والسبع المثاني" },
  { surah: "سورة الناس", meaning: "🛡️ الاستعاذة من الوسواس" },
  { surah: "سورة الفلق", meaning: "🌅 الاستعاذة من شر ما خلق" },
  { surah: "سورة الإخلاص", meaning: "☝️ قل هو الله أحد" },
  { surah: "سورة المسد", meaning: "🔥 هلاك أبي لهب" },
  { surah: "سورة النصر", meaning: "🏆 فتح مكة ودخول الناس في الدين" },
  { surah: "سورة الكافرون", meaning: "⚖️ لكم دينكم ولي دين" },
  { surah: "سورة الكوثر", meaning: "🌊 نهر الخير في الجنة" },
  { surah: "سورة الماعون", meaning: "🍲 إطعام المسكين ومساعدة المحتاج" },
  { surah: "سورة قريش", meaning: "🐪 رحلة الشتاء والصيف" },
  { surah: "سورة الفيل", meaning: "🐘 قصة أبرهة وجيش الفيل" },
  { surah: "سورة الهمزة", meaning: "🚫 النهي عن الغيبة واللمز" },
  { surah: "سورة العصر", meaning: "⏳ قيمة الوقت والعمل الصالح" },
  { surah: "سورة التكاثر", meaning: "💰 التنافس في جمع الأموال" },
  { surah: "سورة القارعة", meaning: "🔔 أهوال يوم القيامة والموازين" },
  { surah: "سورة العاديات", meaning: "🐎 الخيل التي تعدو سريعاً" },
  { surah: "سورة الزلزلة", meaning: "🌍 إذا زلزلت الأرض زلزالها" },
  { surah: "سورة القدر", meaning: "✨ ليلة مباركة خير من ألف شهر" },
  { surah: "سورة العلق", meaning: "📖 اقرأ باسم ربك الذي خلق" },
  { surah: "سورة التين", meaning: "🌳 والتين والزيتون وطور سينين" },
  { surah: "سورة الشرح", meaning: "💖 ألم نشرح لك صدرك" },
  { surah: "سورة الضحى", meaning: "☀️ ما ودعك ربك وما قلى" },
  { surah: "سورة الليل", meaning: "🌙 والليل إذا يغشى والنهار إذا تجلى" },
  { surah: "سورة الشمس", meaning: "🌞 والشمس وضحاها والقمر إذا تلاها" },
  { surah: "سورة البلد", meaning: "🏙️ القسم بمكة المكرمة" },
  { surah: "سورة الفجر", meaning: "⭐ والفجر وليال عشر" },
  { surah: "سورة الغاشية", meaning: "☁️ هل أتاك حديث الغاشية" },
  { surah: "سورة الأعلى", meaning: "🌿 سبح اسم ربك الأعلى" },
  { surah: "سورة الطارق", meaning: "🌠 والسماء والطارق والنجم الثاقب" },
  { surah: "سورة البروج", meaning: "🌌 قصة أصحاب الأخدود" },
];
function genMemoryMeaning() {
  const numPairs = 4;
  const maxStart = Math.max(0, SURAH_MEANINGS.length - numPairs);
  const start = Math.floor(Math.random() * (maxStart + 1));
  const pairs = SURAH_MEANINGS.slice(start, start + numPairs);
  return {
    id: `memmeaning-${start}-${rnd()}`, type: "memory_meaning",
    prompt: "طابق السورة بمعناها",
    pairs,
  };
}

Object.assign(GENERATORS, {
  which: genWhichMore, quiz: genQuiz, count: genCount, surahnum: genSurahNum,
  ayahlonger: genAyahLonger, surahorder: genSurahOrder, memory: genMemory, memory_meaning: genMemoryMeaning,
});

/** توليد أسئلة لطلب العميل */
function generateQuestions({ surah, type = "all", count = 10 }) {
  const sources = surah ? corpus.filter(s => s.app === Number(surah)) : corpus;
  if (!sources.length) return [];
  const types = type === "all" ? Object.keys(GENERATORS) : [type];
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < count && guard++ < count * 60) {
    const s = pick(sources);
    const q = GENERATORS[pick(types)](s);
    if (q && !seen.has(q.id)) { seen.add(q.id); out.push(q); }
  }
  return out;
}

// ── خادم HTTP ──
const server = http.createServer((req, res) => {
  // CORS — ليستطيع تطبيق الويب الاتصال مباشرة
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ ok: true, surahs: corpus.length, words: generalWordBank.length }));
  }

  if (url.pathname === "/questions") {
    const surah = url.searchParams.get("surah");
    const type = url.searchParams.get("type") || "all";
    const count = Math.min(50, Math.max(1, Number(url.searchParams.get("count") || 10)));
    const questions = generateQuestions({ surah: surah ? Number(surah) : null, type, count });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(JSON.stringify({ questions }));
  }

  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, () => console.log(`🚀 سيرفر الأسئلة يعمل على المنفذ ${PORT}`));