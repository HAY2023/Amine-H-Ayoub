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
