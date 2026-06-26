/**
 * نصّ القرآن للسور الموجودة في التطبيق (جزء عمّ) — للبحث في الكلمات ومدرّب التلاوة.
 *
 * مبدأ حاسم: لا يُكتب نصّ المصحف يدوياً في الكود (أي خطأ غير مقبول). يُجلب من مصدر
 * موثّق (alquran.cloud — رواية حفص، الرسم العثماني) ويُخزَّن محلياً ليعمل دون إنترنت.
 */
import { getAllSurahs } from "./quranData";

export interface Ayah { n: number; text: string }
export interface SurahText { app: number; std: number; name: string; ayahs: Ayah[] }

/** أرقام المصحف القياسية لسور التطبيق (ترقيم التطبيق المخصّص → ترقيم المصحف). */
const STD_BY_NAME: Record<string, number> = {
  "الفاتحة": 1, "الناس": 114, "الفلق": 113, "الإخلاص": 112, "المسد": 111,
  "النصر": 110, "الكافرون": 109, "الكوثر": 108, "الماعون": 107, "قريش": 106,
  "الفيل": 105, "الهمزة": 104, "العصر": 103, "التكاثر": 102,
};

const CORPUS_KEY = "mushaf:quranTextCorpus:v1";
const API = (std: number) => `https://api.alquran.cloud/v1/surah/${std}/quran-uthmani`;

// التطبيع يتمّ بأكواد يونيكود صريحة (لا تعابير نمطية بحروف عربية) لتجنّب أي لبس في الترميز.
const A_HAMZA = 0x0621, Y_NORM = 0x064A; // ء … ي (نطاق الحروف العربية)
const isDiacritic = (cp: number): boolean =>
  (cp >= 0x0610 && cp <= 0x061A) ||  // علامات أعلى/أسفل
  (cp >= 0x064B && cp <= 0x065F) ||  // تنوين + حركات + علامات
  cp === 0x0670 ||                   // ألف خنجرية
  (cp >= 0x06D6 && cp <= 0x06DC) ||  // علامات قرآنية
  (cp >= 0x06DF && cp <= 0x06E8) ||
  (cp >= 0x06EA && cp <= 0x06ED) ||
  cp === 0x0640;                     // تطويل

/** يوحّد صور الألف/الياء/الواو/التاء المربوطة لمطابقة بحثية متساهلة. */
const unifyCp = (cp: number): number => {
  if (cp === 0x0622 || cp === 0x0623 || cp === 0x0625 || cp === 0x0671) return 0x0627; // آ أ إ ٱ → ا
  if (cp === 0x0649 || cp === 0x0626) return 0x064A; // ى ئ → ي
  if (cp === 0x0624) return 0x0648;                  // ؤ → و
  if (cp === 0x0629) return 0x0647;                  // ة → ه
  return cp;
};

/** يحذف التشكيل والتطويل ويوحّد الحروف — لمطابقة بحثية متساهلة (لا يُغيّر نصّ العرض). */
export function normalizeArabic(s: string): string {
  let out = "";
  for (const ch of s || "") {
    let cp = ch.codePointAt(0) as number;
    if (isDiacritic(cp)) continue;
    cp = unifyCp(cp);
    const isLetter = cp >= A_HAMZA && cp <= Y_NORM;
    const isDigit = cp >= 0x0030 && cp <= 0x0039;
    out += isLetter || isDigit ? String.fromCodePoint(cp) : " ";
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * في الرسم العثماني من هذا المصدر تُضاف البسملة لبداية الآية الأولى من كل سورة.
 * نزيلها لكل السور عدا الفاتحة (حيث البسملة هي الآية ١ فعلاً)، حتى لا تتكرّر في البحث
 * ولا تُحسب خطأً في مدرّب التلاوة.
 */
const BASMALA_NORM = normalizeArabic("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
function stripLeadingBasmala(text: string): string {
  const words = text.split(/\s+/);
  if (words.length <= 4) return text;
  if (normalizeArabic(words.slice(0, 4).join(" ")) === BASMALA_NORM) return words.slice(4).join(" ").trim();
  return text;
}

const cacheRead = (): SurahText[] | null => {
  try { const r = localStorage.getItem(CORPUS_KEY); const v = r ? JSON.parse(r) : null; return Array.isArray(v) && v.length ? v : null; } catch { return null; }
};
const cacheWrite = (c: SurahText[]) => { try { localStorage.setItem(CORPUS_KEY, JSON.stringify(c)); } catch { /* ignore */ } };

async function fetchSurah(app: number, std: number, name: string): Promise<SurahText> {
  const res = await fetch(API(std));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const ayahs: Ayah[] = (json?.data?.ayahs || []).map((a: { numberInSurah: number; text: string }) => ({ n: a.numberInSurah, text: String(a.text || "").trim() }));
  if (!ayahs.length) throw new Error("نصّ فارغ");
  if (std !== 1 && ayahs[0]) ayahs[0] = { ...ayahs[0], text: stripLeadingBasmala(ayahs[0].text) };
  return { app, std, name, ayahs };
}

let inflight: Promise<SurahText[]> | null = null;

/** يضمن توفّر نصّ كل سور التطبيق (من الكاش أو بجلبه مرّة وتخزينه). */
export async function ensureCorpus(): Promise<SurahText[]> {
  const cached = cacheRead();
  if (cached) return cached;
  if (inflight) return inflight;
  const targets = getAllSurahs()
    .map(s => ({ app: s.number, name: s.name, std: STD_BY_NAME[s.name] }))
    .filter(t => t.std);
  inflight = Promise.all(targets.map(t => fetchSurah(t.app, t.std, t.name)))
    .then(corpus => { const sorted = corpus.sort((a, b) => a.app - b.app); cacheWrite(sorted); inflight = null; return sorted; })
    .catch(e => { inflight = null; throw e; });
  return inflight;
}

/** هل النصّ مُخزَّن محلياً (يعمل دون إنترنت)؟ */
export const isCorpusReady = (): boolean => !!cacheRead();

export interface SearchHit { app: number; name: string; ayah: number; text: string; count: number }

/** يبحث عن كلمة في كل سور التطبيق ويُرجع كل المواضع (مع عدد التكرار في الآية). */
export function searchWord(query: string, corpus: SurahText[]): SearchHit[] {
  const q = normalizeArabic(query);
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const s of corpus) {
    for (const a of s.ayahs) {
      const words = normalizeArabic(a.text).split(" ");
      const count = words.filter(w => w.includes(q)).length;
      if (count > 0) hits.push({ app: s.app, name: s.name, ayah: a.n, text: a.text, count });
    }
  }
  return hits;
}

/** يُحدّد الكلمات المطابِقة داخل آية لإبرازها عند العرض. */
export function matchedWordIndices(text: string, query: string): Set<number> {
  const q = normalizeArabic(query);
  const out = new Set<number>();
  if (!q) return out;
  text.split(/\s+/).forEach((w, i) => { if (normalizeArabic(w).includes(q)) out.add(i); });
  return out;
}
