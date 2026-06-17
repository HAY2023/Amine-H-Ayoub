/**
 * ملف الطفل الشخصي + تتبّع القراءة (تُفتح الألعاب بعد بلوغ هدف القراءة اليومي).
 * يُحفظ محلياً + على السيرفر (Supabase store).
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export interface KidsProfile {
  name: string;
  age: number;
  goalMinutes: number;   // دقائق القراءة المطلوبة لفتح الألعاب
  playMinutes: number;   // دقائق اللعب المسموحة بعد الفتح (٠ = بلا حد)
  reward: string;        // نص المكافأة عند الإنجاز
  lessonTime: string;    // وقت تذكير الدرس "HH:MM" (فارغ = بلا تذكير)
}

export interface DayLog { date: string; minutes: number; played: number; }

export interface KidsProgress {
  date: string;          // يوم التتبّع (يُعاد ضبطه يومياً)
  minutes: number;       // دقائق قُرئت اليوم
  unlocked: boolean;     // هل فُتحت الألعاب اليوم
  played: number;        // دقائق لُعبت اليوم
  playExpired: boolean;  // هل انتهى وقت اللعب
}

const PROFILE_KEY = "mushaf:kidsProfile:v1";
const PROGRESS_KEY = "mushaf:kidsProgress:v1";
const HISTORY_KEY = "mushaf:kidsHistory:v1";

const DEFAULT_PROFILE: KidsProfile = { name: "", age: 6, goalMinutes: 5, playMinutes: 15, reward: "أحسنت، لقد فتحت الألعاب", lessonTime: "" };

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

const freshProgress = (): KidsProgress => ({ date: today(), minutes: 0, unlocked: false, played: 0, playExpired: false });

export const getHistory = (): DayLog[] => {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(HISTORY_KEY); const v = r ? JSON.parse(r) : []; return Array.isArray(v) ? v : []; } catch { return []; }
};

const archive = (p: KidsProgress) => {
  if ((p.minutes || 0) <= 0 && (p.played || 0) <= 0) return;
  const h = getHistory().filter(d => d.date !== p.date);
  h.unshift({ date: p.date, minutes: p.minutes || 0, played: p.played || 0 });
  const trimmed = h.slice(0, 30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  if (hasValidSupabaseKey()) supabase.from("store").upsert({ key: HISTORY_KEY, value: trimmed }).then(() => {}, () => {});
};

export const getProgress = (): KidsProgress => {
  if (typeof window === "undefined") return freshProgress();
  try {
    const r = localStorage.getItem(PROGRESS_KEY); const p = r ? JSON.parse(r) : null;
    if (p && p.date === today()) return { ...freshProgress(), ...p };
    if (p && p.date && p.date !== today()) archive({ ...freshProgress(), ...p }); // أرشف يوم أمس
  } catch { /* ignore */ }
  return freshProgress();
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
  const progress: KidsProgress = { ...cur, minutes, unlocked };
  saveProgress(progress);
  if (justUnlocked && typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:games_unlocked"));
  return { progress, justUnlocked };
};

/** يضيف دقائق لعب؛ عند بلوغ الحدّ يُقفل اللعب حتى يأذن ولي الأمر. */
export const addPlayMinutes = (mins: number): { progress: KidsProgress; justExpired: boolean } => {
  const cur = getProgress();
  const limit = getProfile().playMinutes;
  const played = Math.round((cur.played + mins) * 10) / 10;
  const playExpired = cur.playExpired || (limit > 0 && played >= limit);
  const justExpired = playExpired && !cur.playExpired;
  const progress: KidsProgress = { ...cur, played, playExpired };
  saveProgress(progress);
  if (justExpired && typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:play_expired"));
  return { progress, justExpired };
};

/** يأذن ولي الأمر بمزيد من اللعب (يُصفّر عدّاد اللعب). */
export const grantMorePlay = () => {
  const cur = getProgress();
  saveProgress({ ...cur, played: 0, playExpired: false });
};

export const syncKidsProfileFromServer = async () => {
  if (typeof window === "undefined" || !hasValidSupabaseKey()) return;
  try {
    const { data } = await supabase.from("store").select("value").eq("key", PROFILE_KEY).maybeSingle();
    if (data && data.value && typeof data.value === "object") localStorage.setItem(PROFILE_KEY, JSON.stringify(data.value));
  } catch (e) { console.debug("sync kids profile info:", e); }
};
