/**
 * نظام التلعيب المجنون (Hardcore Gamification):
 * - ⭐ XP نقاط خبرة: تُجمع فقط ولا تُصرف — تحدد المستوى والترتيب في اللوحة الذهبية.
 * - 💎 المجوهرات: عملة نادرة — الربح قليل جداً والأسعار خيالية في المتجر.
 * - 🔥 سلسلة الأيام: يوم 1 = 1💎 ... يوم 7 متتالي = 50💎 — غياب يوم واحد يصفّر السلسلة.
 * - اللوحة الذهبية: XP أسبوعي، تتصفّر كل جمعة، أسماء مستعارة للحفاظ على الخصوصية.
 * - وضع الزائر: كل شيء محفوظ على الجهاز، وعند ١٠٠ 💎 يظهر خطاف إنشاء الحساب.
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

const XP_KEY = "mushaf:gam:xp";
const GEMS_KEY = "mushaf:gam:gems";
const WK_KEY = "mushaf:gam:weekXp";
const WK_START_KEY = "mushaf:gam:weekStart";
const STREAK_KEY = "mushaf:gam:streak";
const REG_KEY = "mushaf:gam:registered";
const ALIAS_KEY = "mushaf:gam:alias";
const OWNED_KEY = "mushaf:gam:owned";

const HOOK_MILESTONE = 100;   // خطاف التسجيل عند ١٠٠ 💎

const emit = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:gam")); };
const num = (k: string): number => { try { return parseInt(localStorage.getItem(k) || "0", 10) || 0; } catch { return 0; } };
const setNum = (k: string, v: number) => { try { localStorage.setItem(k, String(Math.max(0, Math.round(v)))); } catch { /* ignore */ } emit(); };

/* ── ⭐ نقاط الخبرة (لا تُصرف أبداً) ── */
export const getXp = (): number => num(XP_KEY);
export const addXp = (n: number): number => { const v = getXp() + Math.max(0, n); setNum(XP_KEY, v); setNum(WK_KEY, getWeeklyXp() + Math.max(0, n)); return v; };
export const getLevel = (): number => Math.floor(getXp() / 500) + 1;   // كل ٥٠٠ XP مستوى

/* ── اللوحة الذهبية: أسبوع يبدأ كل جمعة ── */
const fridayStart = (): string => {
  const d = new Date();
  const day = d.getUTCDay();            // الأحد=0 ... الجمعة=5
  const diff = (day - 5 + 7) % 7;       // أيام منذ آخر جمعة
  const f = new Date(d.getTime() - diff * 86400000);
  return f.toISOString().slice(0, 10);
};
export const getWeeklyXp = (): number => {
  try {
    const start = localStorage.getItem(WK_START_KEY);
    if (start !== fridayStart()) { localStorage.setItem(WK_START_KEY, fridayStart()); localStorage.setItem(WK_KEY, "0"); return 0; }
    return num(WK_KEY);
  } catch { return 0; }
};
export const resetWeeklyIfDue = (): void => { getWeeklyXp(); };

/* ── 💎 المجوهرات النادرة ── */
export const getGems = (): number => num(GEMS_KEY);
export const addGems = (n: number): number => { const v = getGems() + Math.max(0, n); setNum(GEMS_KEY, v); return v; };
export const spendGems = (n: number): boolean => {
  if (getGems() < n) return false;
  setNum(GEMS_KEY, getGems() - n);
  return true;
};
export const shouldShowHook = (): boolean => !isRegistered() && getGems() >= HOOK_MILESTONE;

/* ── وضع الزائر / التسجيل ── */
export const isRegistered = (): boolean => { try { return localStorage.getItem(REG_KEY) === "1"; } catch { return false; } };
export const markRegistered = (): void => { try { localStorage.setItem(REG_KEY, "1"); } catch { /* ignore */ } emit(); };

/** أسماء مستعارة عشوائية تحفظ الخصوصية (كما في اللوحة الذهبية). */
const ALIASES = ["البطل الخفي", "قارئ مكة", "نجم الفجر", "فارس النور", "صقر المصحف", "سهم الهدى", "برق الحفظ", "قمر التلاوة", "أسد الحفاظ", "شمس المجد"];
export const getAlias = (): string => {
  try {
    const saved = localStorage.getItem(ALIAS_KEY);
    if (saved) return saved;
    const a = ALIASES[Math.floor(Math.random() * ALIASES.length)] + " " + Math.floor(10 + Math.random() * 89);
    localStorage.setItem(ALIAS_KEY, a);
    return a;
  } catch { return "بطل مجهول"; }
};

/* ── 🔥 سلسلة الأيام بمكافآت المجوهرات (يوم ٧ = ٥٠ 💎) ── */
export interface StreakResult { count: number; reward: number; isNewDay: boolean; }
export const dailyStreakGems = (): StreakResult => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let cur = { last: "", count: 0 };
  try { cur = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"last":"","count":0}'); } catch { /* ignore */ }
  if (cur.last === today) return { count: cur.count, reward: 0, isNewDay: false };
  const count = cur.last === yesterday ? cur.count + 1 : 1;   // غياب يوم = تصفير (عقاب صارم)
  const reward = count >= 7 ? 50 : count;
  try { localStorage.setItem(STREAK_KEY, JSON.stringify({ last: today, count })); } catch { /* ignore */ }
  addGems(reward);
  return { count, reward, isNewDay: true };
};

/* ── متجر الكنوز النادرة (أسعار خيالية عمداً) ── */
export interface GemItem { id: string; title: string; desc: string; cost: number; kind: "avatar" | "color" | "badge"; value: string; }
export const GEM_ITEMS: GemItem[] = [
  { id: "gem-avatar-gold", title: "الشخصية الذهبية الملكية", desc: "شخصية نادرة لا يملكها إلا الأبطال", cost: 2000, kind: "avatar", value: "img-boy-6" },
  { id: "gem-avatar-queen", title: "شخصية الملكة النادرة", desc: "تاج الأناقة لصاحبة الصبر", cost: 2000, kind: "avatar", value: "img-girl-6" },
  { id: "gem-theme-royal", title: "المظهر الملكي الفاخر", desc: "ألوان التطبيق المميزة للواجهة", cost: 5000, kind: "color", value: "royal" },
  { id: "gem-theme-emerald", title: "المظهر الزمردي", desc: "واجهة زمردية تخطف الأنظار", cost: 5000, kind: "color", value: "emerald" },
];
export const getOwnedGemItems = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(OWNED_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const ownGemItem = (id: string): boolean => getOwnedGemItems().includes(id);
export const buyGemItem = (item: GemItem): boolean => {
  if (ownGemItem(item.id)) return true;
  if (!spendGems(item.cost)) return false;
  try { localStorage.setItem(OWNED_KEY, JSON.stringify([...getOwnedGemItems(), item.id])); } catch { /* ignore */ }
  return true;
};

/* ── التسجيل: إنشاء حساب (Supabase Auth) وترحيل الثروة ── */
export interface RegisterResult { ok: boolean; message: string; }
export const registerAccount = async (email: string, password: string, alias: string): Promise<RegisterResult> => {
  if (!hasValidSupabaseKey()) return { ok: false, message: "التسجيل غير متاح حالياً — حاول لاحقاً" };
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, message: error.message };
    if (data.user) {
      try {
        await supabase.from("gam_profiles").upsert({
          user_id: data.user.id, alias, xp: getXp(), week_xp: getWeeklyXp(), gems: getGems(),
        });
      } catch { /* جدول اللوحة غير مهيأ بعد — النقاط محفوظة محلياً */ }
      markRegistered();
      return { ok: true, message: "تم إنشاء الحساب! تحقق من بريدك لتأكيد التسجيل" };
    }
    return { ok: false, message: "تعذر إنشاء الحساب" };
  } catch {
    return { ok: false, message: "تعذر الاتصال بخدمة الحسابات" };
  }
};
