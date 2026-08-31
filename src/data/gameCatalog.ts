/**
 * فهرس الألعاب — مبني على بيانات (data-driven) ويُدمَج مع فهرس على السيرفر،
 * فيمكن **إضافة ألعاب جديدة مستقبلاً دون تحديث التطبيق** (تظهر تلقائياً وتُشترى بالنجوم).
 *
 * "اللعبة" = محرّك جاهز (engine) + معاملات محتوى (params) + سعر بالنجوم.
 * المحرّكات مثبّتة في الكود؛ المحتوى/المعاملات/السعر قابلة للإضافة من السيرفر.
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export type GameEngine = "order" | "memory" | "which" | "quiz" | "count" | "nextayah" | "prevayah" | "whichsurah" | "missingword" | "surahaudio" | "remote";

/** مصدر لعبة خارجية تُحمَّل من السيرفر (HTML مضمّن أو رابط) — معزولة عن كود التطبيق. */
export interface RemoteGameSource { kind: "url" | "html"; url?: string; html?: string; desc?: string; }

export interface GameDef {
  id: string;
  title: string;
  engine: GameEngine;
  ageMin: number;        // أصغر عمر مناسب
  cost: number;          // ٠ = مجاني، >٠ = يُشترى بالنجوم
  tint: string;          // أصناف tailwind لخلفية الأيقونة
  icon: string;          // مفتاح أيقونة lucide (يُربط في KidsGames)
  params?: { pairs?: number; minSurah?: number; maxSurah?: number; minAyah?: number; maxAyah?: number };
  custom?: boolean;      // أُضيفت من السيرفر/المعلّم
  remote?: RemoteGameSource; // للعبة engine === "remote" فقط
}

const CATALOG_KEY = "mushaf:gameCatalog:v1";

/** الألعاب المضمّنة — الأولى مجانية فقط، والبقية تُفتح بالنجوم + إذن وليّ الأمر (شراء محميّ وصعب). */
export const BUILTIN_GAMES: GameDef[] = [
  // ── اللعبة المجانية الوحيدة (تفتح بإكمال هدف القراءة) ──
  { id: "surahaudio", title: "اسمع السورة", engine: "surahaudio", ageMin: 5, cost: 0, tint: "bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-cyan-500/30", icon: "Headphones", params: {} },
  // ── ألعاب تُفتح بالنجوم + إذن وليّ الأمر (أسعار صعبة — القراءة هي المصدر الأساسي للنجوم) ──
  { id: "whichsurah", title: "اكتشف السورة", engine: "whichsurah", ageMin: 5, cost: 25, tint: "bg-gradient-to-br from-pink-500 to-rose-400 text-white shadow-pink-500/30", icon: "Sparkles", params: {} },
  { id: "order", title: "ترتيب الآيات", engine: "order", ageMin: 5, cost: 25, tint: "bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-blue-500/30", icon: "ListOrdered", params: {} },
  { id: "memory_easy", title: "ذاكرة السور", engine: "memory", ageMin: 5, cost: 30, tint: "bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-purple-500/30", icon: "LayoutGrid", params: { pairs: 3 } },
  { id: "missingword", title: "الكلمة الضائعة", engine: "missingword", ageMin: 6, cost: 30, tint: "bg-gradient-to-br from-fuchsia-400 to-pink-500 text-white shadow-fuchsia-500/30", icon: "Puzzle", params: {} },
  { id: "nextayah", title: "أكمل الآية", engine: "nextayah", ageMin: 6, cost: 40, tint: "bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-orange-500/30", icon: "BookOpen", params: {} },
  { id: "memory_medium", title: "ذاكرة الأبطال", engine: "memory", ageMin: 6, cost: 45, tint: "bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white shadow-purple-500/30", icon: "LayoutGrid", params: { pairs: 4 } },
  { id: "count_easy", title: "عدّاد الآيات", engine: "count", ageMin: 7, cost: 45, tint: "bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-emerald-500/30", icon: "Hash", params: {} },
  { id: "more", title: "تحدي الأطول", engine: "which", ageMin: 7, cost: 50, tint: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-500/30", icon: "Scale", params: {} },
  { id: "prevayah", title: "الآية السابقة", engine: "prevayah", ageMin: 8, cost: 50, tint: "bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-rose-500/30", icon: "BookOpen", params: {} },
  { id: "memory_hard", title: "الذاكرة الخارقة", engine: "memory", ageMin: 8, cost: 60, tint: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/30", icon: "Grid3x3", params: { pairs: 6 } },
  { id: "quiz", title: "الاختبار الأسطوري", engine: "quiz", ageMin: 9, cost: 60, tint: "bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-yellow-500/30", icon: "Trophy", params: {} },
  { id: "order_hard", title: "ترتيب النخبة", engine: "order", ageMin: 8, cost: 70, tint: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-indigo-500/30", icon: "ListOrdered", params: { minSurah: 114 } },
  { id: "nextayah_hard", title: "أكمل الآية — تحدّي الكبار", engine: "nextayah", ageMin: 8, cost: 70, tint: "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-rose-500/30", icon: "BookOpen", params: { minSurah: 114 } },
  { id: "count_hard", title: "عدّاد النخبة", engine: "count", ageMin: 8, cost: 70, tint: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-teal-500/30", icon: "Hash", params: { minSurah: 114 } },
  { id: "prevayah_hard", title: "الآية السابقة — تحدّي الكبار", engine: "prevayah", ageMin: 8, cost: 75, tint: "bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-rose-500/30", icon: "BookOpen", params: { minSurah: 114 } },
  { id: "whichsurah_hard", title: "اكتشف السورة — تحدّي الكبار", engine: "whichsurah", ageMin: 8, cost: 80, tint: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-pink-500/30", icon: "Sparkles", params: { minSurah: 114 } },
  { id: "quiz_hard", title: "الاختبار الأسطوري — النخبة", engine: "quiz", ageMin: 10, cost: 80, tint: "bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-red-500/30", icon: "Trophy", params: { minSurah: 114 } },
  { id: "missingword_hard", title: "الكلمة الضائعة — تحدّي الكبار", engine: "missingword", ageMin: 8, cost: 90, tint: "bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-fuchsia-500/30", icon: "Puzzle", params: { minSurah: 114 } },
  // ── ألعاب الأسطورة (أغلى وأصعب — تُفتح بعد جمع كثير من نجوم القراءة) ──
  { id: "order_epic", title: "ترتيب الأسطورة", engine: "order", ageMin: 10, cost: 95, tint: "bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-violet-500/30", icon: "ListOrdered", params: { minSurah: 114 } },
  { id: "nextayah_epic", title: "أكمل الآية — الأسطورة", engine: "nextayah", ageMin: 10, cost: 95, tint: "bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-purple-500/30", icon: "BookOpen", params: { minSurah: 114 } },
  { id: "count_epic", title: "عدّاد الأسطورة", engine: "count", ageMin: 10, cost: 95, tint: "bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-teal-500/30", icon: "Hash", params: { minSurah: 114 } },
  { id: "memory_epic", title: "الذاكرة الأسطورية", engine: "memory", ageMin: 10, cost: 100, tint: "bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-indigo-500/30", icon: "Grid3x3", params: { pairs: 8 } },
  { id: "quiz_epic", title: "الاختبار الأسطوري — النهائي", engine: "quiz", ageMin: 10, cost: 100, tint: "bg-gradient-to-br from-amber-500 to-red-700 text-white shadow-red-500/30", icon: "Trophy", params: { minSurah: 114 } },
  { id: "whichsurah_epic", title: "اكتشف السورة — الأسطورة", engine: "whichsurah", ageMin: 10, cost: 100, tint: "bg-gradient-to-br from-pink-600 to-rose-700 text-white shadow-pink-500/30", icon: "Sparkles", params: { minSurah: 114 } },
  { id: "missingword_epic", title: "الكلمة الضائعة — الأسطورة", engine: "missingword", ageMin: 10, cost: 110, tint: "bg-gradient-to-br from-fuchsia-600 to-pink-700 text-white shadow-fuchsia-500/30", icon: "Puzzle", params: { minSurah: 114 } },
  // ── ألعاب العمالقة (الأغلى والأصعب — نهاية الرحلة) ──
  { id: "which_epic", title: "تحدي الأطول — الأسطورة", engine: "which", ageMin: 10, cost: 105, tint: "bg-gradient-to-br from-amber-500 to-yellow-700 text-white shadow-amber-500/30", icon: "Scale", params: { minSurah: 114 } },
  { id: "count_titan", title: "عدّاد العمالقة", engine: "count", ageMin: 11, cost: 115, tint: "bg-gradient-to-br from-teal-700 to-emerald-800 text-white shadow-teal-500/30", icon: "Hash", params: { minSurah: 114 } },
  { id: "order_titan", title: "ترتيب العمالقة", engine: "order", ageMin: 11, cost: 120, tint: "bg-gradient-to-br from-violet-700 to-indigo-800 text-white shadow-violet-500/30", icon: "ListOrdered", params: { minSurah: 114 } },
  { id: "nextayah_titan", title: "أكمل الآية — العمالقة", engine: "nextayah", ageMin: 11, cost: 120, tint: "bg-gradient-to-br from-purple-700 to-fuchsia-800 text-white shadow-purple-500/30", icon: "BookOpen", params: { minSurah: 114 } },
  { id: "whichsurah_titan", title: "اكتشف السورة — العمالقة", engine: "whichsurah", ageMin: 11, cost: 120, tint: "bg-gradient-to-br from-rose-700 to-pink-800 text-white shadow-pink-500/30", icon: "Sparkles", params: { minSurah: 114 } },
  { id: "memory_titan", title: "الذاكرة الأسطورية — العمالقة", engine: "memory", ageMin: 11, cost: 125, tint: "bg-gradient-to-br from-indigo-700 to-blue-900 text-white shadow-indigo-500/30", icon: "Grid3x3", params: { pairs: 10 } },
  { id: "quiz_titan", title: "الاختبار الأسطوري — العمالقة", engine: "quiz", ageMin: 11, cost: 125, tint: "bg-gradient-to-br from-red-700 to-amber-800 text-white shadow-red-500/30", icon: "Trophy", params: { minSurah: 114 } },
  { id: "missingword_titan", title: "الكلمة الضائعة — العمالقة", engine: "missingword", ageMin: 11, cost: 130, tint: "bg-gradient-to-br from-pink-700 to-fuchsia-900 text-white shadow-fuchsia-500/30", icon: "Puzzle", params: { minSurah: 114 } },
];

let serverGames: GameDef[] = [];
let remoteList: RemoteRemoteItem[] = [];

/** عنصر في ملف الألعاب البعيدة على السيرفر (خارج كود التطبيق تماماً). */
export interface RemoteRemoteItem {
  id: string;
  title: string;
  icon?: string;
  ageMin?: number;
  cost?: number;
  kind: "url" | "html";
  url?: string;
  html?: string;
  desc?: string;
}

/** تدرّجات ألوان جاهزة للألعاب البعيدة (تُختار حسب معرّف اللعبة). */
const REMOTE_TINTS = [
  "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30",
  "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-purple-500/30",
  "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/30",
  "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-orange-500/30",
  "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-rose-500/30",
  "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/30",
];
const tintFor = (id: string) => REMOTE_TINTS[Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % REMOTE_TINTS.length];

const toRemoteDef = (r: RemoteRemoteItem): GameDef => ({
  id: `ext-${r.id}`,
  title: r.title,
  engine: "remote",
  ageMin: typeof r.ageMin === "number" && r.ageMin > 0 ? r.ageMin : 5,
  cost: typeof r.cost === "number" && r.cost >= 0 ? r.cost : 15,
  tint: tintFor(r.id),
  icon: typeof r.icon === "string" && r.icon ? r.icon : "Gamepad2",
  custom: true,
  remote: { kind: r.kind, url: r.url, html: r.html, desc: r.desc },
});

/** تحديث قائمة الألعاب القادمة من السيرفر (يستدعيها remoteGames عند الجلب). */
export const setRemoteGamesList = (list: RemoteRemoteItem[]) => { remoteList = list; };

const isValid = (g: unknown): g is GameDef => {
  const d = g as GameDef;
  if (!d || typeof d.id !== "string" || typeof d.title !== "string" || typeof d.cost !== "number") return false;
  const engines: string[] = ["order", "memory", "which", "quiz", "count", "nextayah", "prevayah", "whichsurah", "missingword", "surahaudio", "remote"];
  if (!engines.includes(d.engine)) return false;
  if (d.engine === "remote") return !!d.remote && (d.remote.kind === "html" ? typeof d.remote.html === "string" : typeof d.remote.url === "string");
  return true;
};

const readServerLocal = (): GameDef[] => {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(CATALOG_KEY); const v = r ? JSON.parse(r) : []; return Array.isArray(v) ? v.filter(isValid).map(g => ({ ...g, custom: true })) : []; } catch { return []; }
};

/** الفهرس الكامل: المضمّن + ألعاب السيرفر (تتجاوز/تضيف بالمعرّف) + الألعاب البعيدة (HTML خارجي). */
export const getGameCatalog = (): GameDef[] => {
  const server = serverGames.length ? serverGames : readServerLocal();
  const map = new Map<string, GameDef>();
  for (const g of BUILTIN_GAMES) map.set(g.id, g);
  for (const g of server) map.set(g.id, { tint: "bg-slate-500/20 text-slate-200", icon: "Gamepad2", ageMin: 5, ...g, custom: true });
  for (const r of remoteList) map.set(`ext-${r.id}`, toRemoteDef(r));
  return [...map.values()];
};

export const getGameDef = (id: string): GameDef | undefined => getGameCatalog().find(g => g.id === id);

/** ألعاب المعلّم المضافة فقط (القابلة للحذف). */
export const getCustomGames = (): GameDef[] => (serverGames.length ? serverGames : readServerLocal());

const persistServer = (list: GameDef[]) => {
  serverGames = list;
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  if (hasValidSupabaseKey()) supabase.from("store").upsert({ key: CATALOG_KEY, value: list }).then(() => {}, () => {});
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:gamecatalog"));
};

/** يضيف/يحدّث لعبة في فهرس السيرفر (تظهر فوراً وعلى كل الأجهزة بلا تحديث للتطبيق). */
export const addGameDef = (def: GameDef) => {
  const list = getCustomGames().filter(g => g.id !== def.id);
  persistServer([...list, { ...def, custom: true }]);
};

export const removeGameDef = (id: string) => {
  persistServer(getCustomGames().filter(g => g.id !== id));
};

export const syncGameCatalogFromServer = async () => {
  if (typeof window === "undefined" || !hasValidSupabaseKey()) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return; // offline
  try {
    const { data } = await supabase.from("store").select("value").eq("key", CATALOG_KEY).maybeSingle();
    if (data && Array.isArray(data.value)) {
      const list = (data.value as GameDef[]).filter(isValid).map(g => ({ ...g, custom: true }));
      serverGames = list;
      localStorage.setItem(CATALOG_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event("mushaf:gamecatalog"));
    }
  } catch (e) { console.debug("sync game catalog:", e); }
};
