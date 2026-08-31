/**
 * فهرس الألعاب — ٥٠ لعبة موزّعة على نطاقات الأعمار (كل لعبة تظهر لعمرها فقط).
 * أسماء عادية بلا مبالغة، وصعوبة كل لعبة مضبوطة بمعاملاتها ونطاق سورها.
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export type GameEngine = "order" | "memory" | "which" | "quiz" | "count" | "nextayah" | "prevayah" | "whichsurah" | "missingword" | "surahaudio" | "ayahsurah" | "ayahorder" | "ayahlonger" | "surahorder" | "surahnum" | "remote";

/** مصدر لعبة خارجية تُحمَّل من السيرفر (HTML مضمّن أو رابط) — معزولة عن كود التطبيق. */
export interface RemoteGameSource { kind: "url" | "html"; url?: string; html?: string; desc?: string; }

export interface GameDef {
  id: string;
  title: string;
  engine: GameEngine;
  ageMin: number;        // أصغر عمر مناسب
  ageMax?: number;       // أكبر عمر — بعدها تختفي اللعبة (لعبة لكل عمر)
  cost: number;          // ٠ = مجاني، >٠ = يُشترى بالنجوم
  tint: string;
  icon: string;
  params?: { pairs?: number; minSurah?: number; maxSurah?: number; minAyah?: number; maxAyah?: number };
  custom?: boolean;
  remote?: RemoteGameSource;
}

const CATALOG_KEY = "mushaf:gameCatalog:v1";
const HIDDEN_REMOTE_KEY = "mushaf:remoteGamesHidden";

/** تدرّجات ألوان جاهزة (موجودة أصلاً في CSS) — تُوزَّع بالتناوب. */
const T = [
  "bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-cyan-500/30",
  "bg-gradient-to-br from-pink-500 to-rose-400 text-white shadow-pink-500/30",
  "bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-purple-500/30",
  "bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-emerald-500/30",
  "bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-orange-500/30",
  "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-500/30",
  "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/30",
  "bg-gradient-to-br from-fuchsia-400 to-pink-500 text-white shadow-fuchsia-500/30",
];
const t = (i: number) => T[i % T.length];

/** نطاقات السور: قصيرة = سهل، وسط = متوسط، كامل = صعب. */
const SHORT = { minSurah: 38 };
const MID = { minSurah: 114, maxSurah: 20 };
const FULL = { minSurah: 114 };

let remoteList: RemoteRemoteItem[] = [];
let serverGames: GameDef[] = [];

/** عنصر في ملف الألعاب البعيدة على السيرفر. */
export interface RemoteRemoteItem {
  id: string; title: string; icon?: string; ageMin?: number; cost?: number;
  kind: "url" | "html"; url?: string; html?: string; desc?: string;
}

export const setRemoteGamesList = (list: RemoteRemoteItem[]) => { remoteList = list; };

const hiddenIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(HIDDEN_REMOTE_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const hideRemoteGame = (id: string) => {
  try { const h = hiddenIds(); if (!h.includes(id)) localStorage.setItem(HIDDEN_REMOTE_KEY, JSON.stringify([...h, id])); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:gamecatalog"));
};
export const showRemoteGame = (id: string) => {
  try { localStorage.setItem(HIDDEN_REMOTE_KEY, JSON.stringify(hiddenIds().filter(x => x !== id))); } catch { /* ignore */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:gamecatalog"));
};
export const getHiddenRemoteIds = hiddenIds;

const isValid = (g: unknown): g is GameDef => {
  const d = g as GameDef;
  if (!d || typeof d.id !== "string" || typeof d.title !== "string" || typeof d.cost !== "number") return false;
  const engines: string[] = ["order", "memory", "which", "quiz", "count", "nextayah", "prevayah", "whichsurah", "missingword", "surahaudio", "ayahsurah", "ayahorder", "ayahlonger", "surahorder", "surahnum", "remote"];
  if (!engines.includes(d.engine)) return false;
  if (d.engine === "remote") return !!d.remote && (d.remote.kind === "html" ? typeof d.remote.html === "string" : typeof d.remote.url === "string");
  return true;
};

const readServerLocal = (): GameDef[] => {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(CATALOG_KEY); const v = r ? JSON.parse(r) : []; return Array.isArray(v) ? v.filter(isValid).map(g => ({ ...g, custom: true })) : []; } catch { return []; }
};

const toRemoteDef = (r: RemoteRemoteItem, i: number): GameDef => ({
  id: `ext-${r.id}`, title: r.title, engine: "remote",
  ageMin: typeof r.ageMin === "number" && r.ageMin > 0 ? r.ageMin : 4,
  ageMax: 14,
  cost: typeof r.cost === "number" && r.cost >= 0 ? r.cost : 20,
  tint: t(i + 2), icon: typeof r.icon === "string" && r.icon ? r.icon : "Gamepad2",
  custom: true, remote: { kind: r.kind, url: r.url, html: r.html, desc: r.desc },
});

/** الفهرس الكامل: المضمّن (حسب العمر) + ألعاب السيرفر + الألعاب البعيدة غير المخفية. */
export const getGameCatalog = (): GameDef[] => {
  const server = serverGames.length ? serverGames : readServerLocal();
  const map = new Map<string, GameDef>();
  for (const g of BUILTIN_GAMES) map.set(g.id, g);
  for (const g of server) map.set(g.id, { tint: "bg-slate-500/20 text-slate-200", icon: "Gamepad2", ageMin: 5, ...g, custom: true });
  const hidden = hiddenIds();
  remoteList.forEach((r, i) => { if (!hidden.includes(r.id)) map.set(`ext-${r.id}`, toRemoteDef(r, i)); });
  return [...map.values()];
};

export const getGameDef = (id: string): GameDef | undefined => getGameCatalog().find(g => g.id === id);

export const getCustomGames = (): GameDef[] => (serverGames.length ? serverGames : readServerLocal());

const persistServer = (list: GameDef[]) => {
  serverGames = list;
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  if (hasValidSupabaseKey()) supabase.from("store").upsert({ key: CATALOG_KEY, value: list }).then(() => {}, () => {});
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:gamecatalog"));
};

export const addGameDef = (def: GameDef) => {
  const list = getCustomGames().filter(g => g.id !== def.id);
  persistServer([...list, { ...def, custom: true }]);
};

export const removeGameDef = (id: string) => { persistServer(getCustomGames().filter(g => g.id !== id)); };

export const syncGameCatalogFromServer = async () => {
  if (typeof window === "undefined" || !hasValidSupabaseKey()) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
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

/** إنشاء لعبة مضمّنة باختصار. */
const G = (id: string, title: string, engine: GameEngine, ageMin: number, ageMax: number, cost: number, icon: string, params: GameDef["params"], ti = 0): GameDef =>
  ({ id, title, engine, ageMin, ageMax, cost, icon, params: params || {}, tint: t(ti) });

/** ٥٠ لعبة موزّعة على الأعمار: ٤-٦، ٦-٨، ٨-١٠، ١٠-١٢، ١٢-١٤. لعبة واحدة مجانية لكل الأعمار. */
export const BUILTIN_GAMES: GameDef[] = [
  G("surahaudio", "اسمع السورة", "surahaudio", 4, 14, 0, "Headphones", null, 0),
  // ── أعمار ٤-٦ ──
  G("memory4", "بطاقات السور", "memory", 4, 6, 40, "LayoutGrid", { pairs: 3 }, 2),
  G("whichsurah4", "اكتشف السورة", "whichsurah", 4, 6, 40, "Sparkles", SHORT, 1),
  G("order4", "ترتيب الآيات", "order", 4, 6, 45, "ListOrdered", SHORT, 3),
  G("count4", "عدّ الآيات", "count", 4, 6, 45, "Hash", SHORT, 4),
  G("missingword4", "الكلمة الضائعة", "missingword", 4, 6, 50, "Puzzle", SHORT, 7),
  G("quiz4", "اختبار السور", "quiz", 4, 6, 50, "Trophy", SHORT, 5),
  G("which4", "السورة الأطول", "which", 4, 6, 55, "Scale", SHORT, 6),
  G("nextayah4", "أكمل الآية", "nextayah", 4, 6, 55, "BookOpen", SHORT, 0),
  G("prevayah4", "الآية التي قبلها", "prevayah", 4, 6, 60, "BookOpen", SHORT, 2),
  G("surahorder4", "ترتيب السور", "surahorder", 4, 6, 60, "ListOrdered", SHORT, 3),
  // ── أعمار ٦-٨ ──
  G("memory6", "بطاقات السور", "memory", 6, 8, 70, "LayoutGrid", { pairs: 4 }, 4),
  G("whichsurah6", "اكتشف السورة", "whichsurah", 6, 8, 70, "Sparkles", MID, 5),
  G("order6", "ترتيب الآيات", "order", 6, 8, 75, "ListOrdered", MID, 6),
  G("count6", "عدّ الآيات", "count", 6, 8, 75, "Hash", MID, 0),
  G("missingword6", "الكلمة الضائعة", "missingword", 6, 8, 80, "Puzzle", MID, 2),
  G("quiz6", "اختبار السور", "quiz", 6, 8, 80, "Trophy", MID, 7),
  G("which6", "السورة الأطول", "which", 6, 8, 85, "Scale", MID, 1),
  G("nextayah6", "أكمل الآية", "nextayah", 6, 8, 85, "BookOpen", MID, 3),
  G("prevayah6", "الآية التي قبلها", "prevayah", 6, 8, 90, "BookOpen", MID, 4),
  G("surahorder6", "ترتيب السور", "surahorder", 6, 8, 90, "ListOrdered", MID, 5),
  // ── أعمار ٨-١٠ ──
  G("memory8", "بطاقات السور", "memory", 8, 10, 95, "LayoutGrid", { pairs: 5 }, 6),
  G("whichsurah8", "اكتشف السورة", "whichsurah", 8, 10, 95, "Sparkles", FULL, 0),
  G("order8", "ترتيب الآيات", "order", 8, 10, 100, "ListOrdered", FULL, 2),
  G("count8", "عدّ الآيات", "count", 8, 10, 100, "Hash", FULL, 7),
  G("missingword8", "الكلمة الضائعة", "missingword", 8, 10, 105, "Puzzle", FULL, 1),
  G("quiz8", "اختبار السور", "quiz", 8, 10, 105, "Trophy", FULL, 3),
  G("which8", "السورة الأطول", "which", 8, 10, 110, "Scale", FULL, 4),
  G("nextayah8", "أكمل الآية", "nextayah", 8, 10, 110, "BookOpen", FULL, 5),
  G("prevayah8", "الآية التي قبلها", "prevayah", 8, 10, 115, "BookOpen", FULL, 6),
  G("surahorder8", "ترتيب السور", "surahorder", 8, 10, 115, "ListOrdered", FULL, 0),
  // ── أعمار ١٠-١٢ (آيات حقيقية — أصعب) ──
  G("memory10", "بطاقات السور", "memory", 10, 12, 120, "LayoutGrid", { pairs: 6 }, 1),
  G("ayahsurah10", "من أي سورة؟", "ayahsurah", 10, 12, 120, "BookOpen", FULL, 2),
  G("ayahlonger10", "أي آية أطول؟", "ayahlonger", 10, 12, 125, "Scale", FULL, 3),
  G("ayahorder10", "رتّب الآيات", "ayahorder", 10, 12, 125, "ListOrdered", FULL, 4),
  G("order10", "ترتيب الآيات", "order", 10, 12, 130, "ListOrdered", FULL, 5),
  G("missingword10", "الكلمة الضائعة", "missingword", 10, 12, 130, "Puzzle", FULL, 6),
  G("quiz10", "اختبار السور", "quiz", 10, 12, 135, "Trophy", FULL, 7),
  G("nextayah10", "أكمل الآية", "nextayah", 10, 12, 135, "BookOpen", FULL, 0),
  G("prevayah10", "الآية التي قبلها", "prevayah", 10, 12, 140, "BookOpen", FULL, 1),
  G("surahnum10", "رقم السورة", "surahnum", 10, 12, 140, "Hash", FULL, 2),
  // ── أعمار ١٢-١٤ (الأصعب) ──
  G("memory12", "بطاقات السور", "memory", 12, 14, 150, "LayoutGrid", { pairs: 8 }, 3),
  G("ayahsurah12", "من أي سورة؟", "ayahsurah", 12, 14, 150, "BookOpen", FULL, 4),
  G("ayahlonger12", "أي آية أطول؟", "ayahlonger", 12, 14, 155, "Scale", FULL, 5),
  G("ayahorder12", "رتّب الآيات", "ayahorder", 12, 14, 155, "ListOrdered", FULL, 6),
  G("order12", "ترتيب الآيات", "order", 12, 14, 160, "ListOrdered", FULL, 7),
  G("missingword12", "الكلمة الضائعة", "missingword", 12, 14, 160, "Puzzle", FULL, 0),
  G("quiz12", "اختبار السور", "quiz", 12, 14, 165, "Trophy", FULL, 1),
  G("nextayah12", "أكمل الآية", "nextayah", 12, 14, 165, "BookOpen", FULL, 2),
  G("prevayah12", "الآية التي قبلها", "prevayah", 12, 14, 170, "BookOpen", FULL, 3),
  G("surahorder12", "ترتيب السور", "surahorder", 12, 14, 170, "ListOrdered", FULL, 4),
];
