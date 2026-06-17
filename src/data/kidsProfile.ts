/**
 * ملف الطفل الشخصي + تتبّع القراءة (تُفتح الألعاب بعد بلوغ هدف القراءة اليومي).
 * يُحفظ محلياً + على السيرفر (Supabase store).
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export interface KidsProfile {
  name: string;
  age: number;
  goalMinutes: number;   // دقائق القراءة المطلوبة لفتح الألعاب
  reward: string;        // نص المكافأة عند الإنجاز
}

export interface KidsProgress {
  date: string;          // يوم التتبّع (يُعاد ضبطه يومياً)
  minutes: number;       // دقائق قُرئت اليوم
  unlocked: boolean;     // هل فُتحت الألعاب اليوم
}

const PROFILE_KEY = "mushaf:kidsProfile:v1";
const PROGRESS_KEY = "mushaf:kidsProgress:v1";

const DEFAULT_PROFILE: KidsProfile = { name: "", age: 6, goalMinutes: 5, reward: "أحسنت! 🎁 افتحت الألعاب" };

const today = () => new Date().toDateString();

export const getProfile = (): KidsProfile => {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try { const r = localStorage.getItem(PROFILE_KEY); return r ? { ...DEFAULT_PROFILE, ...JSON.parse(r) } : DEFAULT_PROFILE; } catch { return DEFAULT_PROFILE; }
};

export const saveProfile = (p: KidsProfile) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  if (hasValidSupabaseKey()) supabase.from("store").upsert({ key: PROFILE_KEY, value: p }).then(() => {}, () => {});
};

export const getProgress = (): KidsProgress => {
  if (typeof window === "undefined") return { date: today(), minutes: 0, unlocked: false };
  try { const r = localStorage.getItem(PROGRESS_KEY); const p = r ? JSON.parse(r) : null; if (p && p.date === today()) return p; } catch { /* ignore */ }
  return { date: today(), minutes: 0, unlocked: false };
};

const saveProgress = (p: KidsProgress) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  if (hasValidSupabaseKey()) supabase.from("store").upsert({ key: PROGRESS_KEY, value: p }).then(() => {}, () => {});
};

/** يضيف دقائق قراءة؛ يُرجع التقدّم المحدَّث وهل فُتحت الألعاب الآن. */
export const addReadingMinutes = (mins: number): { progress: KidsProgress; justUnlocked: boolean } => {
  const cur = getProgress();
  const goal = getProfile().goalMinutes;
  const minutes = Math.round((cur.minutes + mins) * 10) / 10;
  const unlocked = cur.unlocked || minutes >= goal;
  const justUnlocked = unlocked && !cur.unlocked;
  const progress: KidsProgress = { date: today(), minutes, unlocked };
  saveProgress(progress);
  if (justUnlocked && typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:games_unlocked"));
  return { progress, justUnlocked };
};

export const syncKidsProfileFromServer = async () => {
  if (typeof window === "undefined" || !hasValidSupabaseKey()) return;
  try {
    const { data } = await supabase.from("store").select("value").eq("key", PROFILE_KEY).maybeSingle();
    if (data && data.value && typeof data.value === "object") localStorage.setItem(PROFILE_KEY, JSON.stringify(data.value));
  } catch (e) { console.debug("sync kids profile info:", e); }
};
