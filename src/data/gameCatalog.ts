/**
 * ظپظ‡ط±ط³ ط§ظ„ط£ظ„ط¹ط§ط¨ â€” ظ¥ظ  ظ„ط¹ط¨ط© ظ…ظˆط²ظ‘ط¹ط© ط¹ظ„ظ‰ ظ†ط·ط§ظ‚ط§طھ ط§ظ„ط£ط¹ظ…ط§ط± (ظƒظ„ ظ„ط¹ط¨ط© طھط¸ظ‡ط± ظ„ط¹ظ…ط±ظ‡ط§ ظپظ‚ط·).
 * ط£ط³ظ…ط§ط، ط¹ط§ط¯ظٹط© ط¨ظ„ط§ ظ…ط¨ط§ظ„ط؛ط©طŒ ظˆطµط¹ظˆط¨ط© ظƒظ„ ظ„ط¹ط¨ط© ظ…ط¶ط¨ظˆط·ط© ط¨ظ…ط¹ط§ظ…ظ„ط§طھظ‡ط§ ظˆظ†ط·ط§ظ‚ ط³ظˆط±ظ‡ط§.
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export type GameEngine = "order" | "memory" | "which" | "quiz" | "count" | "nextayah" | "prevayah" | "whichsurah" | "missingword" | "surahaudio" | "ayahsurah" | "ayahorder" | "ayahlonger" | "surahorder" | "surahnum" | "remote";

/** ظ…طµط¯ط± ظ„ط¹ط¨ط© ط®ط§ط±ط¬ظٹط© طھظڈط­ظ…ظژظ‘ظ„ ظ…ظ† ط§ظ„ط³ظٹط±ظپط± (HTML ظ…ط¶ظ…ظ‘ظ† ط£ظˆ ط±ط§ط¨ط·) â€” ظ…ط¹ط²ظˆظ„ط© ط¹ظ† ظƒظˆط¯ ط§ظ„طھط·ط¨ظٹظ‚. */
export interface RemoteGameSource { kind: "url" | "html"; url?: string; html?: string; desc?: string; }

export interface GameDef {
  id: string;
  title: string;
  engine: GameEngine;
  ageMin: number;        // ط£طµط؛ط± ط¹ظ…ط± ظ…ظ†ط§ط³ط¨
  ageMax?: number;       // ط£ظƒط¨ط± ط¹ظ…ط± â€” ط¨ط¹ط¯ظ‡ط§ طھط®طھظپظٹ ط§ظ„ظ„ط¹ط¨ط© (ظ„ط¹ط¨ط© ظ„ظƒظ„ ط¹ظ…ط±)
  cost: number;          // ظ  = ظ…ط¬ط§ظ†ظٹطŒ >ظ  = ظٹظڈط´طھط±ظ‰ ط¨ط§ظ„ظ†ط¬ظˆظ…
  tint: string;
  icon: string;
  params?: { pairs?: number; minSurah?: number; maxSurah?: number; minAyah?: number; maxAyah?: number };
  custom?: boolean;
  remote?: RemoteGameSource;
}

const CATALOG_KEY = "mushaf:gameCatalog:v1";
const HIDDEN_REMOTE_KEY = "mushaf:remoteGamesHidden";

/** طھط¯ط±ظ‘ط¬ط§طھ ط£ظ„ظˆط§ظ† ط¬ط§ظ‡ط²ط© (ظ…ظˆط¬ظˆط¯ط© ط£طµظ„ط§ظ‹ ظپظٹ CSS) â€” طھظڈظˆط²ظژظ‘ط¹ ط¨ط§ظ„طھظ†ط§ظˆط¨. */
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

/** ظ†ط·ط§ظ‚ط§طھ ط§ظ„ط³ظˆط±: ظ‚طµظٹط±ط© = ط³ظ‡ظ„طŒ ظˆط³ط· = ظ…طھظˆط³ط·طŒ ظƒط§ظ…ظ„ = طµط¹ط¨. */
const SHORT = { minSurah: 38 };
const MID = { minSurah: 114, maxSurah: 20 };
const FULL = { minSurah: 114 };

let remoteList: RemoteRemoteItem[] = [];
let serverGames: GameDef[] = [];

/** ط¹ظ†طµط± ظپظٹ ظ…ظ„ظپ ط§ظ„ط£ظ„ط¹ط§ط¨ ط§ظ„ط¨ط¹ظٹط¯ط© ط¹ظ„ظ‰ ط§ظ„ط³ظٹط±ظپط±. */
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

/** ط§ظ„ظپظ‡ط±ط³ ط§ظ„ظƒط§ظ…ظ„: ط§ظ„ظ…ط¶ظ…ظ‘ظ† (ط­ط³ط¨ ط§ظ„ط¹ظ…ط±) + ط£ظ„ط¹ط§ط¨ ط§ظ„ط³ظٹط±ظپط± + ط§ظ„ط£ظ„ط¹ط§ط¨ ط§ظ„ط¨ط¹ظٹط¯ط© ط؛ظٹط± ط§ظ„ظ…ط®ظپظٹط©. */
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

/** ط¥ظ†ط´ط§ط، ظ„ط¹ط¨ط© ظ…ط¶ظ…ظ‘ظ†ط© ط¨ط§ط®طھطµط§ط±. */
const G = (id: string, title: string, engine: GameEngine, ageMin: number, ageMax: number, cost: number, icon: string, params: GameDef["params"], ti = 0): GameDef =>
  ({ id, title, engine, ageMin, ageMax, cost, icon, params: params || {}, tint: t(ti) });

/** ظ¥ظ  ظ„ط¹ط¨ط© ظ…ظˆط²ظ‘ط¹ط© ط¹ظ„ظ‰ ط§ظ„ط£ط¹ظ…ط§ط±: ظ¤-ظ¦طŒ ظ¦-ظ¨طŒ ظ¨-ظ،ظ طŒ ظ،ظ -ظ،ظ¢طŒ ظ،ظ¢-ظ،ظ¤. ظ„ط¹ط¨ط© ظˆط§ط­ط¯ط© ظ…ط¬ط§ظ†ظٹط© ظ„ظƒظ„ ط§ظ„ط£ط¹ظ…ط§ط±. */
export const BUILTIN_GAMES: GameDef[] = [
  G("surahaudio", "ط§ط³ظ…ط¹ ط§ظ„ط³ظˆط±ط©", "surahaudio", 4, 16, 0, "Headphones", null, 0),
  // â”€â”€ ط£ط¹ظ…ط§ط± ظ¤-ظ¦ â”€â”€
  G("memory4", "ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط³ظˆط±", "memory", 4, 6, 40, "LayoutGrid", { pairs: 3 }, 2),
  G("whichsurah4", "ط§ظƒطھط´ظپ ط§ظ„ط³ظˆط±ط©", "whichsurah", 4, 6, 40, "Sparkles", SHORT, 1),
  G("order4", "طھط±طھظٹط¨ ط§ظ„ط¢ظٹط§طھ", "order", 4, 6, 45, "ListOrdered", SHORT, 3),
  G("count4", "ط¹ط¯ظ‘ ط§ظ„ط¢ظٹط§طھ", "count", 4, 6, 45, "Hash", SHORT, 4),
  G("missingword4", "ط§ظ„ظƒظ„ظ…ط© ط§ظ„ط¶ط§ط¦ط¹ط©", "missingword", 4, 6, 50, "Puzzle", SHORT, 7),
  G("quiz4", "ط§ط®طھط¨ط§ط± ط§ظ„ط³ظˆط±", "quiz", 4, 6, 50, "Trophy", SHORT, 5),
  G("which4", "ط§ظ„ط³ظˆط±ط© ط§ظ„ط£ط·ظˆظ„", "which", 4, 6, 55, "Scale", SHORT, 6),
  G("nextayah4", "ط£ظƒظ…ظ„ ط§ظ„ط¢ظٹط©", "nextayah", 4, 6, 55, "BookOpen", SHORT, 0),
  G("prevayah4", "ط§ظ„ط¢ظٹط© ط§ظ„طھظٹ ظ‚ط¨ظ„ظ‡ط§", "prevayah", 4, 6, 60, "BookOpen", SHORT, 2),
  G("surahorder4", "طھط±طھظٹط¨ ط§ظ„ط³ظˆط±", "surahorder", 4, 6, 60, "ListOrdered", SHORT, 3),
  // â”€â”€ ط£ط¹ظ…ط§ط± ظ¦-ظ¨ â”€â”€
  G("memory6", "ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط³ظˆط±", "memory", 6, 8, 70, "LayoutGrid", { pairs: 4 }, 4),
  G("whichsurah6", "ط§ظƒطھط´ظپ ط§ظ„ط³ظˆط±ط©", "whichsurah", 6, 8, 70, "Sparkles", MID, 5),
  G("order6", "طھط±طھظٹط¨ ط§ظ„ط¢ظٹط§طھ", "order", 6, 8, 75, "ListOrdered", MID, 6),
  G("count6", "ط¹ط¯ظ‘ ط§ظ„ط¢ظٹط§طھ", "count", 6, 8, 75, "Hash", MID, 0),
  G("missingword6", "ط§ظ„ظƒظ„ظ…ط© ط§ظ„ط¶ط§ط¦ط¹ط©", "missingword", 6, 8, 80, "Puzzle", MID, 2),
  G("quiz6", "ط§ط®طھط¨ط§ط± ط§ظ„ط³ظˆط±", "quiz", 6, 8, 80, "Trophy", MID, 7),
  G("which6", "ط§ظ„ط³ظˆط±ط© ط§ظ„ط£ط·ظˆظ„", "which", 6, 8, 85, "Scale", MID, 1),
  G("nextayah6", "ط£ظƒظ…ظ„ ط§ظ„ط¢ظٹط©", "nextayah", 6, 8, 85, "BookOpen", MID, 3),
  G("prevayah6", "ط§ظ„ط¢ظٹط© ط§ظ„طھظٹ ظ‚ط¨ظ„ظ‡ط§", "prevayah", 6, 8, 90, "BookOpen", MID, 4),
  G("surahorder6", "طھط±طھظٹط¨ ط§ظ„ط³ظˆط±", "surahorder", 6, 8, 90, "ListOrdered", MID, 5),
  // â”€â”€ ط£ط¹ظ…ط§ط± ظ¨-ظ،ظ  â”€â”€
  G("memory8", "ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط³ظˆط±", "memory", 8, 10, 95, "LayoutGrid", { pairs: 5 }, 6),
  G("whichsurah8", "ط§ظƒطھط´ظپ ط§ظ„ط³ظˆط±ط©", "whichsurah", 8, 10, 95, "Sparkles", FULL, 0),
  G("order8", "طھط±طھظٹط¨ ط§ظ„ط¢ظٹط§طھ", "order", 8, 10, 100, "ListOrdered", FULL, 2),
  G("count8", "ط¹ط¯ظ‘ ط§ظ„ط¢ظٹط§طھ", "count", 8, 10, 100, "Hash", FULL, 7),
  G("missingword8", "ط§ظ„ظƒظ„ظ…ط© ط§ظ„ط¶ط§ط¦ط¹ط©", "missingword", 8, 10, 105, "Puzzle", FULL, 1),
  G("quiz8", "ط§ط®طھط¨ط§ط± ط§ظ„ط³ظˆط±", "quiz", 8, 10, 105, "Trophy", FULL, 3),
  G("which8", "ط§ظ„ط³ظˆط±ط© ط§ظ„ط£ط·ظˆظ„", "which", 8, 10, 110, "Scale", FULL, 4),
  G("nextayah8", "ط£ظƒظ…ظ„ ط§ظ„ط¢ظٹط©", "nextayah", 8, 10, 110, "BookOpen", FULL, 5),
  G("prevayah8", "ط§ظ„ط¢ظٹط© ط§ظ„طھظٹ ظ‚ط¨ظ„ظ‡ط§", "prevayah", 8, 10, 115, "BookOpen", FULL, 6),
  G("surahorder8", "طھط±طھظٹط¨ ط§ظ„ط³ظˆط±", "surahorder", 8, 10, 115, "ListOrdered", FULL, 0),
  // â”€â”€ ط£ط¹ظ…ط§ط± ظ،ظ -ظ،ظ¢ (ط¢ظٹط§طھ ط­ظ‚ظٹظ‚ظٹط© â€” ط£طµط¹ط¨) â”€â”€
  G("memory10", "ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط³ظˆط±", "memory", 10, 12, 120, "LayoutGrid", { pairs: 6 }, 1),
  G("ayahsurah10", "ظ…ظ† ط£ظٹ ط³ظˆط±ط©طں", "ayahsurah", 10, 12, 120, "BookOpen", FULL, 2),
  G("ayahlonger10", "ط£ظٹ ط¢ظٹط© ط£ط·ظˆظ„طں", "ayahlonger", 10, 12, 125, "Scale", FULL, 3),
  G("ayahorder10", "ط±طھظ‘ط¨ ط§ظ„ط¢ظٹط§طھ", "ayahorder", 10, 12, 125, "ListOrdered", FULL, 4),
  G("order10", "طھط±طھظٹط¨ ط§ظ„ط¢ظٹط§طھ", "order", 10, 12, 130, "ListOrdered", FULL, 5),
  G("missingword10", "ط§ظ„ظƒظ„ظ…ط© ط§ظ„ط¶ط§ط¦ط¹ط©", "missingword", 10, 12, 130, "Puzzle", FULL, 6),
  G("quiz10", "ط§ط®طھط¨ط§ط± ط§ظ„ط³ظˆط±", "quiz", 10, 12, 135, "Trophy", FULL, 7),
  G("nextayah10", "ط£ظƒظ…ظ„ ط§ظ„ط¢ظٹط©", "nextayah", 10, 12, 135, "BookOpen", FULL, 0),
  G("prevayah10", "ط§ظ„ط¢ظٹط© ط§ظ„طھظٹ ظ‚ط¨ظ„ظ‡ط§", "prevayah", 10, 12, 140, "BookOpen", FULL, 1),
  G("surahnum10", "ط±ظ‚ظ… ط§ظ„ط³ظˆط±ط©", "surahnum", 10, 12, 140, "Hash", FULL, 2),
  // â”€â”€ ط£ط¹ظ…ط§ط± ظ،ظ¢-ظ،ظ¤ (ط§ظ„ط£طµط¹ط¨) â”€â”€
  G("memory12", "ط¨ط·ط§ظ‚ط§طھ ط§ظ„ط³ظˆط±", "memory", 12, 16, 150, "LayoutGrid", { pairs: 8 }, 3),
  G("ayahsurah12", "ظ…ظ† ط£ظٹ ط³ظˆط±ط©طں", "ayahsurah", 12, 16, 150, "BookOpen", FULL, 4),
  G("ayahlonger12", "ط£ظٹ ط¢ظٹط© ط£ط·ظˆظ„طں", "ayahlonger", 12, 16, 155, "Scale", FULL, 5),
  G("ayahorder12", "ط±طھظ‘ط¨ ط§ظ„ط¢ظٹط§طھ", "ayahorder", 12, 16, 155, "ListOrdered", FULL, 6),
  G("order12", "طھط±طھظٹط¨ ط§ظ„ط¢ظٹط§طھ", "order", 12, 16, 160, "ListOrdered", FULL, 7),
  G("missingword12", "ط§ظ„ظƒظ„ظ…ط© ط§ظ„ط¶ط§ط¦ط¹ط©", "missingword", 12, 16, 160, "Puzzle", FULL, 0),
  G("quiz12", "ط§ط®طھط¨ط§ط± ط§ظ„ط³ظˆط±", "quiz", 12, 16, 165, "Trophy", FULL, 1),
  G("nextayah12", "ط£ظƒظ…ظ„ ط§ظ„ط¢ظٹط©", "nextayah", 12, 16, 165, "BookOpen", FULL, 2),
  G("prevayah12", "ط§ظ„ط¢ظٹط© ط§ظ„طھظٹ ظ‚ط¨ظ„ظ‡ط§", "prevayah", 12, 16, 170, "BookOpen", FULL, 3),
  G("surahorder12", "طھط±طھظٹط¨ ط§ظ„ط³ظˆط±", "surahorder", 12, 16, 170, "ListOrdered", FULL, 4),
];


