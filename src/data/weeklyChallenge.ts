/**
 * التحدي الأسبوعي — نظام بأسلوب Duolingo.
 * كل أسبوع تحدي جديد (يُولَّد من بنك المعاني والمصحف)، مع تتبع التقدم والمكافأة.
 */
import { ensureCorpus, type SurahText } from "./quranText";

const WEEK_KEY = "mushaf:weeklyChallenge:v1";

export const getWeekKey = (): string => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

export interface WeeklyQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  surahName: string;
}

export interface WeeklyState {
  week: string;
  questions: WeeklyQuestion[];
  answered: string[];
  correctCount: number;
  wrongCount: number;
  completed: boolean;
  claimed: boolean;
}

const loadState = (): WeeklyState | null => {
  try { const r = localStorage.getItem(WEEK_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
};
const saveState = (s: WeeklyState) => {
  try { localStorage.setItem(WEEK_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:weekly"));
};

// خلط عشوائي ثابت حسب بذرة الأسبوع (يتجدد أسبوعياً لكن مستقر خلاله)
const seededShuffle = <T,>(arr: T[], seed: string): T[] => {
  let s = 0;
  for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const shuffledOpts = (arr: string[], seed: string): string[] => {
  const s = new Set(arr);
  return seededShuffle([...s], seed);
};

/** بنك معاني السور (نفس MemoryGame) — لأسئلة المطابقة */
const MEANING_PAIRS = [
  { n: 1, surah: "الفاتحة", meaning: "أم الكتاب والسبع المثاني" },
  { n: 114, surah: "الناس", meaning: "الاستعاذة من الوسواس" },
  { n: 113, surah: "الفلق", meaning: "الاستعاذة من شر ما خلق" },
  { n: 112, surah: "الإخلاص", meaning: "قل هو الله أحد" },
  { n: 111, surah: "المسد", meaning: "هلاك أبي لهب" },
  { n: 110, surah: "النصر", meaning: "فتح مكة ودخول الناس في الدين" },
  { n: 109, surah: "الكافرون", meaning: "لكم دينكم ولي دين" },
  { n: 108, surah: "الكوثر", meaning: "نهر الخير في الجنة" },
  { n: 107, surah: "الماعون", meaning: "إطعام المسكين ومساعدة المحتاج" },
  { n: 106, surah: "قريش", meaning: "رحلة الشتاء والصيف" },
  { n: 105, surah: "الفيل", meaning: "قصة أبرهة وجيش الفيل" },
  { n: 104, surah: "الهمزة", meaning: "النهي عن الغيبة واللمز" },
  { n: 103, surah: "العصر", meaning: "قيمة الوقت والعمل الصالح" },
  { n: 102, surah: "التكاثر", meaning: "التنافس في جمع الأموال" },
  { n: 101, surah: "القارعة", meaning: "أهوال يوم القيامة والموازين" },
  { n: 100, surah: "العاديات", meaning: "الخيل التي تعدو سريعاً" },
  { n: 99, surah: "الزلزلة", meaning: "إذا زلزلت الأرض زلزالها" },
  { n: 97, surah: "القدر", meaning: "ليلة مباركة خير من ألف شهر" },
  { n: 96, surah: "العلق", meaning: "اقرأ باسم ربك الذي خلق" },
  { n: 95, surah: "التين", meaning: "والتين والزيتون وطور سينين" },
  { n: 94, surah: "الشرح", meaning: "ألم نشرح لك صدرك" },
  { n: 93, surah: "الضحى", meaning: "ما ودعك ربك وما قلى" },
  { n: 92, surah: "الليل", meaning: "والليل إذا يغشى والنهار إذا تجلى" },
  { n: 91, surah: "الشمس", meaning: "والشمس وضحاها والقمر إذا تلاها" },
  { n: 90, surah: "البلد", meaning: "القسم بمكة المكرمة" },
  { n: 89, surah: "الفجر", meaning: "والفجر وليال عشر" },
  { n: 88, surah: "الغاشية", meaning: "هل أتاك حديث الغاشية" },
  { n: 87, surah: "الأعلى", meaning: "سبح اسم ربك الأعلى" },
  { n: 86, surah: "الطارق", meaning: "والسماء والطارق والنجم الثاقب" },
  { n: 85, surah: "البروج", meaning: "قصة أصحاب الأخدود" },
];

/** سور مماثلة لأخرى — مشتّات متشابهة (منطقة قريبة) */
const seedPool = (corpus: SurahText[], app: number, seed: string): SurahText[] => {
  const target = corpus.find(x => x.app === app);
  const tLen = target?.ayahs?.length || 0;
  const close = corpus
    .filter(c => c.app !== app)
    .sort((a, b) => Math.abs(a.ayahs?.length - tLen) - Math.abs(b.ayahs?.length - tLen));
  return seededShuffle(close, seed).slice(0, 2);
};

/** توليد أسئلة أسبوعية (5 أسئلة): خليط من المعاني + آيات المصحف */
export const generateWeekly = async (surahNum: number): Promise<WeeklyQuestion[]> => {
  const week = getWeekKey();
  const qs: WeeklyQuestion[] = [];

  // 1) أسئلة المعاني (آخر 3 ممزوجة حسب الأسبوع)
  const meaningOrder = seededShuffle(MEANING_PAIRS, week + "meaning").slice(0, 3);
  let mi = 0;
  for (const m of meaningOrder) {
    const others = seededShuffle(MEANING_PAIRS.filter(o => o.n !== m.n), week + "opts" + m.n).slice(0, 2);
    const opts = shuffledOpts([m.surah, ...others.map(o => o.surah)], week + m.n + mi);
    qs.push({
      id: `wk-${mi}`,
      prompt: `ما السورة التي معناها: «${m.meaning}»؟`,
      options: opts,
      answer: m.surah,
      surahName: m.surah,
    });
    mi++;
  }

  // 2) أسئلة الآيات (2) — من سورة الطفل إن توفرت وإلا قصار السور
  try {
    const corpus = await ensureCorpus();
    let surahs: SurahText[];
    if (surahNum) {
      const t = corpus.find(c => c.app === surahNum);
      surahs = t ? [t] : corpus.filter(c => c.ayahs && c.ayahs.length >= 3).slice(0, 5);
    } else {
      surahs = corpus.filter(c => c.ayahs && c.ayahs.length >= 3).slice(0, 8);
    }
    const source = seededShuffle(surahs, week + "ayah").slice(0, 2);
    for (const s of source) {
      const pooled = seedPool(corpus, s.app, week + "pool" + s.app);
      const ayah = (s.ayahs || [])[Math.floor(Math.random() * s.ayahs.length)];
      if (!ayah) continue;
      const opts = shuffledOpts([...pooled.map(p => p.name), s.name], week + "a" + s.app + mi);
      qs.push({
        id: `wk-ayah-${mi}`,
        prompt: `من أيّ سورة هذه الآية؟\n${ayah.text}`,
        options: opts,
        answer: s.name,
        surahName: s.name,
      });
      mi++;
    }
  } catch { /* بدون مصحف — يكفي بنك المعاني */ }

  return seededShuffle(qs, week).slice(0, 5);
};

/** يحصل على حالة التحدي الحالي (يُولّد إن لزم) */
export const getWeekly = async (surahNum: number): Promise<WeeklyState> => {
  const week = getWeekKey();
  const cur = loadState();
  if (cur && cur.week === week && cur.questions.length) return cur;
  const questions = await generateWeekly(surahNum);
  const st: WeeklyState = { week, questions, answered: [], correctCount: 0, wrongCount: 0, completed: false, claimed: false };
  saveState(st);
  return st;
};

/** يحفظ إجابة عن سؤال معيّن */
export const recordWeeklyAnswer = (id: string, correct: boolean): WeeklyState | null => {
  const st = loadState();
  if (!st || st.answered.includes(id)) return null;
  if (correct) st.correctCount++;
  else st.wrongCount++;
  st.answered.push(id);
  if (st.answered.length >= st.questions.length) st.completed = true;
  saveState(st);
  return st;
};

/** إعادة تعيين التحدي الحالي */
export const resetWeekly = () => {
  try { localStorage.removeItem(WEEK_KEY); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:weekly"));
};