/**
 * فهرس الألعاب — مبني على بيانات (data-driven) ويُدمَج مع فهرس على السيرفر،
 * فيمكن **إضافة ألعاب جديدة مستقبلاً دون تحديث التطبيق** (تظهر تلقائياً وتُشترى بالنجوم).
 *
 * "اللعبة" = محرّك جاهز (engine) + معاملات محتوى (params) + سعر بالنجوم.
 * المحرّكات مثبّتة في الكود؛ المحتوى/المعاملات/السعر قابلة للإضافة من السيرفر.
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export type GameEngine = "order" | "memory" | "which" | "quiz" | "count" | "nextayah" | "prevayah" | "whichsurah" | "missingword";

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
  { id: "whichsurah", title: "اكتشف السورة", engine: "whichsurah", ageMin: 5, cost: 0, tint: "bg-gradient-to-br from-pink-500 to-rose-400 text-white shadow-pink-500/30", icon: "Sparkles", params: {} },
  { id: "order", title: "ترتيب الآيات", engine: "order", ageMin: 5, cost: 0, tint: "bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-blue-500/30", icon: "ListOrdered", params: {} },
  { id: "memory_easy", title: "ذاكرة السور", engine: "memory", ageMin: 5, cost: 0, tint: "bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-purple-500/30", icon: "LayoutGrid", params: { pairs: 3 } },
  { id: "missingword", title: "الكلمة الضائعة", engine: "missingword", ageMin: 6, cost: 0, tint: "bg-gradient-to-br from-fuchsia-400 to-pink-500 text-white shadow-fuchsia-500/30", icon: "Puzzle", params: {} },
  { id: "nextayah", title: "أكمل الآية", engine: "nextayah", ageMin: 6, cost: 0, tint: "bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-orange-500/30", icon: "BookOpen", params: {} },
  { id: "count_easy", title: "عدّاد الآيات", engine: "count", ageMin: 7, cost: 0, tint: "bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-emerald-500/30", icon: "Hash", params: {} },
  { id: "more", title: "تحدي الأطول", engine: "which", ageMin: 7, cost: 0, tint: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-amber-500/30", icon: "Scale", params: {} },
  { id: "prevayah", title: "الآية السابقة", engine: "prevayah", ageMin: 8, cost: 0, tint: "bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-rose-500/30", icon: "BookOpen", params: {} },
  { id: "memory_hard", title: "الذاكرة الخارقة", engine: "memory", ageMin: 8, cost: 0, tint: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/30", icon: "Grid3x3", params: { pairs: 6 } },
  { id: "quiz", title: "الاختبار الأسطوري", engine: "quiz", ageMin: 9, cost: 0, tint: "bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-yellow-500/30", icon: "Trophy", params: {} },
];

let serverGames: GameDef[] = [];

const isValid = (g: unknown): g is GameDef => {
  const d = g as GameDef;
  return !!d && typeof d.id === "string" && typeof d.title === "string"
    && ["order", "memory", "which", "quiz", "count", "nextayah", "prevayah", "whichsurah", "missingword"].includes(d.engine)
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
