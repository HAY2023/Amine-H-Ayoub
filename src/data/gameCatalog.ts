/**
 * فهرس الألعاب — مبني على بيانات (data-driven) ويُدمَج مع فهرس على السيرفر،
 * فيمكن **إضافة ألعاب جديدة مستقبلاً دون تحديث التطبيق** (تظهر تلقائياً وتُشترى بالنجوم).
 *
 * "اللعبة" = محرّك جاهز (engine) + معاملات محتوى (params) + سعر بالنجوم.
 * المحرّكات مثبّتة في الكود؛ المحتوى/المعاملات/السعر قابلة للإضافة من السيرفر.
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export type GameEngine = "listen" | "order" | "memory" | "which" | "quiz" | "count" | "nextayah" | "prevayah" | "whichsurah" | "missingword";

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
}

const CATALOG_KEY = "mushaf:gameCatalog:v1";

/** الألعاب المضمّنة (كلها مجانية) + نماذج مدفوعة توضّح الشراء بالنجوم. */
export const BUILTIN_GAMES: GameDef[] = [
  { id: "listen", title: "استمع واختر", engine: "listen", ageMin: 4, cost: 0, tint: "bg-emerald-500/20 text-emerald-300", icon: "Headphones", params: { minSurah: 78 } },
  { id: "order", title: "رتّب الآيات", engine: "order", ageMin: 5, cost: 0, tint: "bg-sky-500/20 text-sky-300", icon: "ListOrdered", params: { minSurah: 78 } },
  { id: "memory", title: "لعبة الذاكرة", engine: "memory", ageMin: 6, cost: 0, tint: "bg-violet-500/20 text-violet-300", icon: "LayoutGrid", params: { pairs: 4, minSurah: 78 } },
  { id: "whichsurah", title: "من أيّ سورة؟", engine: "whichsurah", ageMin: 6, cost: 0, tint: "bg-pink-500/20 text-pink-300", icon: "Sparkles", params: { minSurah: 78 } },
  { id: "nextayah", title: "أكمل الآية", engine: "nextayah", ageMin: 7, cost: 0, tint: "bg-orange-500/20 text-orange-300", icon: "BookOpen", params: { minSurah: 78 } },
  { id: "prevayah", title: "الآية السابقة", engine: "prevayah", ageMin: 7, cost: 0, tint: "bg-rose-500/20 text-rose-300", icon: "BookOpen", params: { minSurah: 78 } },
  { id: "missingword", title: "الكلمة الناقصة", engine: "missingword", ageMin: 7, cost: 0, tint: "bg-fuchsia-500/20 text-fuchsia-300", icon: "Puzzle", params: { minSurah: 78 } },
  { id: "more", title: "أيّهما أكثر", engine: "which", ageMin: 9, cost: 0, tint: "bg-amber-500/20 text-amber-300", icon: "Scale", params: { minSurah: 78 } },
  { id: "count", title: "عدّ الآيات", engine: "count", ageMin: 9, cost: 0, tint: "bg-teal-500/20 text-teal-300", icon: "Hash", params: { minSurah: 78 } },
  { id: "quiz", title: "اختبار قرآني", engine: "quiz", ageMin: 12, cost: 0, tint: "bg-indigo-500/20 text-indigo-300", icon: "Trophy", params: { minSurah: 78 } },
];

let serverGames: GameDef[] = [];

const isValid = (g: unknown): g is GameDef => {
  const d = g as GameDef;
  return !!d && typeof d.id === "string" && typeof d.title === "string"
    && ["listen", "order", "memory", "which", "quiz", "count", "nextayah", "prevayah", "whichsurah", "missingword"].includes(d.engine)
    && typeof d.cost === "number";
};

const readServerLocal = (): GameDef[] => {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(CATALOG_KEY); const v = r ? JSON.parse(r) : []; return Array.isArray(v) ? v.filter(isValid).map(g => ({ ...g, custom: true })) : []; } catch { return []; }
};

/** الفهرس الكامل: المضمّن + ألعاب السيرفر (تتجاوز/تضيف بالمعرّف). */
export const getGameCatalog = (): GameDef[] => {
  const server = serverGames.length ? serverGames : readServerLocal();
  const map = new Map<string, GameDef>();
  for (const g of BUILTIN_GAMES) map.set(g.id, g);
  for (const g of server) map.set(g.id, { tint: "bg-slate-500/20 text-slate-200", icon: "Gamepad2", ageMin: 5, ...g, custom: true });
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
