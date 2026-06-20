/**
 * ملفّات الأطفال (متعدّدة، كما في يوتيوب على التلفاز) + وضع التطبيق + تتبّع القراءة لكل طفل.
 * يُحفظ محلياً + على السيرفر (Supabase store) ويُزامَن بين الأجهزة.
 *
 * كل الدوال القديمة (getProfile/saveProfile/getProgress/addReadingMinutes...) تعمل على
 * "الملف النشِط" حالياً، فلا حاجة لتغيير صفحات الألعاب/لوحة وليّ الأمر/القارئ.
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

/** وضع التطبيق: لوليّ الأمر فقط، للأطفال فقط، أو معاً. */
export type AppMode = "parent" | "kids" | "both";

export interface KidsProfile {
  id: string;
  name: string;
  age: number;
  avatar: string;        // رمز تعبيري للوجه (من KID_AVATARS)
  color: string;         // تدرّج لون البطاقة (من KID_COLORS)
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

/** وجوه وألوان جاهزة لبطاقات الأطفال (محبّبة للصغار، بلا حاجة لرفع صور). */
export const KID_AVATARS = ["🦁", "🐯", "🐰", "🐼", "🦊", "🐨", "🐸", "🐱", "🐶", "🦉", "🐥", "🦄"];
export const KID_COLORS = [
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-green-500",
  "from-fuchsia-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-red-500",
  "from-cyan-400 to-teal-500",
  "from-lime-400 to-emerald-500",
];

const PROFILES_KEY = "mushaf:profiles:v1";
const ACTIVE_KEY = "mushaf:activeProfile:v1";
const APPMODE_KEY = "mushaf:appMode:v1";
const PROGRESS_BASE = "mushaf:kidsProgress:v1";   // + ":<id>"
const HISTORY_BASE = "mushaf:kidsHistory:v1";     // + ":<id>"

// مفاتيح النسخة القديمة (ملف واحد) — للترقية مرّة واحدة
const LEGACY_PROFILE_KEY = "mushaf:kidsProfile:v1";
const LEGACY_PROGRESS_KEY = "mushaf:kidsProgress:v1";
const LEGACY_HISTORY_KEY = "mushaf:kidsHistory:v1";

const progKey = (id: string) => `${PROGRESS_BASE}:${id}`;
const histKey = (id: string) => `${HISTORY_BASE}:${id}`;

const DEFAULT_FIELDS = { goalMinutes: 5, playMinutes: 15, reward: "أحسنت، لقد فتحت الألعاب", lessonTime: "" };
const DEFAULT_PROFILE: KidsProfile = { id: "default", name: "", age: 6, avatar: KID_AVATARS[0], color: KID_COLORS[0], ...DEFAULT_FIELDS };

const today = () => new Date().toDateString();
const newId = (): string => {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch { /* ignore */ }
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

const upsert = (key: string, value: unknown) => {
  if (hasValidSupabaseKey()) supabase.from("store").upsert({ key, value }).then(() => {}, () => {});
};

const normalize = (p: Partial<KidsProfile>, i = 0): KidsProfile => ({
  ...DEFAULT_PROFILE,
  ...p,
  id: p.id || newId(),
  avatar: p.avatar || KID_AVATARS[i % KID_AVATARS.length],
  color: p.color || KID_COLORS[i % KID_COLORS.length],
});

/* ---------------- الترقية من النسخة القديمة (ملف واحد) ---------------- */
let migrated = false;
const ensureMigrated = () => {
  if (migrated || typeof window === "undefined") return;
  migrated = true;
  try {
    if (localStorage.getItem(PROFILES_KEY)) return;       // بالفعل بالنسخة الجديدة
    const legacy = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!legacy) return;                                  // مستخدم جديد — يُنشئ عبر الترحيب
    const old = JSON.parse(legacy);
    const id = "p1";
    const prof = normalize({ ...old, id });
    localStorage.setItem(PROFILES_KEY, JSON.stringify([prof]));
    localStorage.setItem(ACTIVE_KEY, id);
    const lp = localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (lp) localStorage.setItem(progKey(id), lp);
    const lh = localStorage.getItem(LEGACY_HISTORY_KEY);
    if (lh) localStorage.setItem(histKey(id), lh);
    if (!localStorage.getItem(APPMODE_KEY)) localStorage.setItem(APPMODE_KEY, "both");
    upsert(PROFILES_KEY, [prof]);
    upsert(ACTIVE_KEY, id);
  } catch { /* ignore */ }
};

/* ---------------- وضع التطبيق ---------------- */
export const getAppMode = (): AppMode => {
  if (typeof window === "undefined") return "both";
  ensureMigrated();
  try { const m = localStorage.getItem(APPMODE_KEY); return (m === "parent" || m === "kids" || m === "both") ? m : "both"; } catch { return "both"; }
};
export const setAppMode = (m: AppMode) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(APPMODE_KEY, m); } catch { /* ignore */ }
  upsert(APPMODE_KEY, m);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:appmode"));
};
/** هل ركن الأطفال مُفعَّل (أي ليس "وليّ الأمر فقط")؟ */
export const kidsEnabled = (): boolean => getAppMode() !== "parent";

/* ---------------- إدارة الملفّات ---------------- */
const persistProfiles = (arr: KidsProfile[]) => {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(arr));
  upsert(PROFILES_KEY, arr);
};

export const getProfiles = (): KidsProfile[] => {
  if (typeof window === "undefined") return [];
  ensureMigrated();
  try { const r = localStorage.getItem(PROFILES_KEY); const v = r ? JSON.parse(r) : []; return Array.isArray(v) ? v.map((p, i) => normalize(p, i)) : []; } catch { return []; }
};

export const getActiveId = (): string => {
  if (typeof window === "undefined") return "";
  ensureMigrated();
  try {
    const id = localStorage.getItem(ACTIVE_KEY) || "";
    const profs = getProfiles();
    if (id && profs.some(p => p.id === id)) return id;
    return profs[0]?.id || "";
  } catch { return ""; }
};

export const setActiveProfile = (id: string) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* ignore */ }
  upsert(ACTIVE_KEY, id);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:activeprofile"));
};

/** الملف النشِط (أو افتراضي إن لم يوجد أي ملف بعد). */
export const getProfile = (): KidsProfile => {
  const profs = getProfiles();
  const id = getActiveId();
  return profs.find(p => p.id === id) || profs[0] || DEFAULT_PROFILE;
};

/** يُنشئ ملف طفل جديداً ويُرجعه (ويجعله نشِطاً إن لم يكن هناك ملف نشِط). */
export const addProfile = (partial: Partial<KidsProfile> = {}): KidsProfile => {
  const profs = getProfiles();
  const prof = normalize({ ...partial, id: partial.id || newId() }, profs.length);
  const next = [...profs, prof];
  persistProfiles(next);
  if (!getActiveId()) setActiveProfile(prof.id);
  return prof;
};

/** يحدّث ملفاً بالمعرّف. */
export const updateProfile = (id: string, patch: Partial<KidsProfile>) => {
  const next = getProfiles().map(p => (p.id === id ? { ...p, ...patch, id } : p));
  persistProfiles(next);
};

/** حفظ ملف كامل (يطابق بالمعرّف، أو يحدّث النشِط إن لم يحمل معرّفاً). */
export const saveProfile = (p: KidsProfile) => {
  if (typeof window === "undefined") return;
  const id = p.id || getActiveId();
  const profs = getProfiles();
  let next: KidsProfile[];
  if (profs.some(x => x.id === id)) next = profs.map(x => (x.id === id ? { ...p, id } : x));
  else next = [...profs, normalize({ ...p, id: id || newId() }, profs.length)];
  persistProfiles(next);
};

/** يحذف ملفاً (مع تقدّمه وتاريخه)، ويصلح النشِط إن لزم. */
export const removeProfile = (id: string) => {
  const next = getProfiles().filter(p => p.id !== id);
  persistProfiles(next);
  try { localStorage.removeItem(progKey(id)); localStorage.removeItem(histKey(id)); } catch { /* ignore */ }
  if (getActiveId() === id) setActiveProfile(next[0]?.id || "");
};

/* ---------------- التقدّم اليومي (لكل ملف) ---------------- */
const freshProgress = (): KidsProgress => ({ date: today(), minutes: 0, unlocked: false, played: 0, playExpired: false });

export const getHistory = (): DayLog[] => {
  if (typeof window === "undefined") return [];
  const id = getActiveId(); if (!id) return [];
  try { const r = localStorage.getItem(histKey(id)); const v = r ? JSON.parse(r) : []; return Array.isArray(v) ? v : []; } catch { return []; }
};

const archive = (id: string, p: KidsProgress) => {
  if ((p.minutes || 0) <= 0 && (p.played || 0) <= 0) return;
  let h: DayLog[] = [];
  try { const r = localStorage.getItem(histKey(id)); const v = r ? JSON.parse(r) : []; h = Array.isArray(v) ? v : []; } catch { /* ignore */ }
  h = h.filter(d => d.date !== p.date);
  h.unshift({ date: p.date, minutes: p.minutes || 0, played: p.played || 0 });
  const trimmed = h.slice(0, 30);
  localStorage.setItem(histKey(id), JSON.stringify(trimmed));
  upsert(histKey(id), trimmed);
};

export const getProgress = (): KidsProgress => {
  if (typeof window === "undefined") return freshProgress();
  const id = getActiveId(); if (!id) return freshProgress();
  try {
    const r = localStorage.getItem(progKey(id)); const p = r ? JSON.parse(r) : null;
    if (p && p.date === today()) return { ...freshProgress(), ...p };
    if (p && p.date && p.date !== today()) archive(id, { ...freshProgress(), ...p }); // أرشف يوم أمس
  } catch { /* ignore */ }
  return freshProgress();
};

const saveProgress = (p: KidsProgress) => {
  if (typeof window === "undefined") return;
  const id = getActiveId(); if (!id) return;
  localStorage.setItem(progKey(id), JSON.stringify(p));
  upsert(progKey(id), p);
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

/* ---------------- المزامنة من السيرفر ---------------- */
export const syncKidsProfileFromServer = async () => {
  if (typeof window === "undefined" || !hasValidSupabaseKey()) return;
  try {
    const { data } = await supabase.from("store").select("key,value").in("key", [PROFILES_KEY, APPMODE_KEY, ACTIVE_KEY]);
    (data || []).forEach((row: { key: string; value: unknown }) => {
      if (row.value == null) return;
      if (row.key === APPMODE_KEY || row.key === ACTIVE_KEY) localStorage.setItem(row.key, String(row.value));
      else localStorage.setItem(row.key, JSON.stringify(row.value));
    });
    // تقدّم/تاريخ كل ملف
    const profs = getProfiles();
    for (const p of profs) {
      const { data: d2 } = await supabase.from("store").select("key,value").in("key", [progKey(p.id), histKey(p.id)]);
      (d2 || []).forEach((row: { key: string; value: unknown }) => { if (row.value != null) localStorage.setItem(row.key, JSON.stringify(row.value)); });
    }
  } catch (e) { console.debug("sync kids info:", e); }
};
