/**
 * ملفّات الأطفال (متعدّدة، كما في يوتيوب على التلفاز) + وضع التطبيق + تتبّع القراءة لكل طفل.
 * يُحفظ محلياً + على السيرفر (Supabase store) ويُزامَن بين الأجهزة.
 *
 * كل الدوال القديمة (getProfile/saveProfile/getProgress/addReadingMinutes...) تعمل على
 * "الملف النشِط" حالياً، فلا حاجة لتغيير صفحات الألعاب/لوحة وليّ الأمر/القارئ.
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";
import { isMushafDevEnabled } from "../utils/tauriUtils";

/** وضع التطبيق: لوليّ الأمر فقط أو للأطفال فقط. */
export type AppMode = "parent" | "kids";

export interface KidsProfile {
  id: string;
  name: string;
  age: number;
  avatar: string;        // رمز تعبيري للوجه (من KID_AVATARS أو متجر المكافآت)
  color: string;         // تدرّج لون البطاقة (من KID_COLORS أو المتجر)
  goalMinutes: number;   // دقائق القراءة المطلوبة لفتح الألعاب
  playMinutes: number;   // دقائق اللعب المسموحة بعد الفتح (٠ = بلا حد)
  reward: string;        // نص المكافأة عند الإنجاز
  lessonTime: string;    // وقت تذكير الدرس "HH:MM" (فارغ = بلا تذكير)
  coins: number;         // النقاط (النجوم) المكتسبة من الألعاب
  inventory: string[];   // معرّفات عناصر المتجر المملوكة
  currentSurah?: number; // السورة الحالية التي يحفظها الطفل (تُستخدم لتحديد نطاق الألعاب)
}

export interface ShopItem {
  id: string;
  type: "avatar" | "color";
  label: string;
  value: string;
  cost: number;
  badge?: string;
  description?: string;
  tier?: "starter" | "bronze" | "silver" | "gold" | "diamond" | "legendary";
}

export interface DayLog { date: string; minutes: number; played: number; }

export interface KidsProgress {
  date: string;          // يوم التتبّع (يُعاد ضبطه يومياً)
  minutes: number;       // دقائق قُرئت اليوم
  unlocked: boolean;     // هل فُتحت الألعاب اليوم
  played: number;        // دقائق لُعبت اليوم
  playExpired: boolean;  // هل انتهى وقت اللعب
}

/** الشخصية الأساسية المجانية الوحيدة المتاحة للجميع */
export const KID_AVATARS = [
  "img-boy-scholar"
];
export const KID_COLORS = [
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-500",
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

const DEFAULT_FIELDS = { goalMinutes: 5, playMinutes: 0, reward: "أحسنت، لقد فتحت الألعاب", lessonTime: "", coins: 0, inventory: [] as string[], currentSurah: 0 };
const DEFAULT_PROFILE: KidsProfile = { id: "default", name: "", age: 6, avatar: KID_AVATARS[0], color: KID_COLORS[0], ...DEFAULT_FIELDS };

/** متجر المكافآت — شخصيات إسلامية فخمة ثلاثية الأبعاد تُفتح بالنجوم بأسعار عالية متدرجة */
export const SHOP_AVATARS: ShopItem[] = [
  // ── المستوى البرونزي: طلاب وحفظة الذكر (15,000 - 25,000 نجمة) ──
  {
    id: "av-img-boy-reciter",
    type: "avatar",
    label: "القارئ الصغير بالجبة البيضاء",
    value: "img-boy-reciter",
    cost: 15000,
    badge: "مميّز",
    tier: "bronze",
    description: "طالب مجتهد يبدأ رحلة ترتيل وتجويد القرآن الكريم بصوت ندي."
  },
  {
    id: "av-img-girl-scholar",
    type: "avatar",
    label: "طالبة العلم بالخمار الوردي",
    value: "img-girl-scholar",
    cost: 25000,
    badge: "مميّزة",
    tier: "bronze",
    description: "فتاة القرآن المثابرة التي تقضي أوقاتها بين آيات الذكر الحكيم."
  },

  // ── المستوى الفضي: نجباء القرآن وزهرات الجنان (50,000 - 75,000 نجمة) ──
  {
    id: "av-img-boy-taqiyah-gold",
    type: "avatar",
    label: "بطل القرآن بالطاقية الذهبية",
    value: "img-boy-taqiyah-gold",
    cost: 50000,
    badge: "نادر",
    tier: "silver",
    description: "طالب متفوق تألق في مجالس التسميع وحصل على طاقية الشرف الذهبية."
  },
  {
    id: "av-img-girl-gold",
    type: "avatar",
    label: "زهرة الجنان بالرداء المذهب",
    value: "img-girl-gold",
    cost: 75000,
    badge: "نادرة",
    tier: "silver",
    description: "أميرة الهدى بالزي الأندلسي المذهب التي تتلألأ بحفظ السور الكريمة."
  },

  // ── المستوى الذهبي: سفراء النور وبلابل التلاوة (100,000 - 250,000 نجمة) ──
  {
    id: "av-img-boy-reciter-green",
    type: "avatar",
    label: "القارئ الأخضر الزمردي بنقوش المحراب",
    value: "img-boy-reciter-green",
    cost: 100000,
    badge: "ذهبي",
    tier: "gold",
    description: "قارئ نديّ يرتدي الجبة الخضراء الفاخرة المستوحاة من رياض الجنة."
  },
  {
    id: "av-img-boy-royal-blue",
    type: "avatar",
    label: "أمير الذكر بالرداء الأزرق الملكي",
    value: "img-boy-royal-blue",
    cost: 150000,
    badge: "ملكي",
    tier: "gold",
    description: "صاحب الصوت الشجي برداء المحراب الأزرق الملكي والتطريز الفضي الأنيق."
  },
  {
    id: "av-img-boy-turquoise-vest",
    type: "avatar",
    label: "سفير النور بالصدرية الفيروزية المذهبة",
    value: "img-boy-turquoise-vest",
    cost: 200000,
    badge: "ملكي",
    tier: "gold",
    description: "بطل الهمم العالية بزي المشرق الفيروزي المطرز بخيوط الذهب."
  },
  {
    id: "av-img-boy-indigo-scarf",
    type: "avatar",
    label: "بلبل التلاوة بالشال النيلي الأنيق",
    value: "img-boy-indigo-scarf",
    cost: 250000,
    badge: "VIP",
    tier: "gold",
    description: "من أتقن مخارج الحروف وأحكام التجويد بالشال النيلي التراثي الرفيع."
  },

  // ── المستوى الماسي: فرسان وأميرات الحكمة (350,000 - 500,000 نجمة) ──
  {
    id: "av-img-boy-knight-ruby",
    type: "avatar",
    label: "فارس القرآن بالدرع المذهب والوشاح",
    value: "img-boy-knight-ruby",
    cost: 350000,
    badge: "فارس VIP",
    tier: "diamond",
    description: "فارس شجاع يحمي قلبه بآيات الله ويزدان بالدرع الذهبي والوشاح الأخضر."
  },
  {
    id: "av-img-boy-turban",
    type: "avatar",
    label: "أمير الحفاظ بالعمامة النبيلة",
    value: "img-boy-turban",
    cost: 400000,
    badge: "أمير الحفاظ",
    tier: "diamond",
    description: "حكيم البراعم بالعمامة البيضاء الوقورة، ينشر السلام والنور أينما حلّ."
  },
  {
    id: "av-img-girl-hijab-emerald",
    type: "avatar",
    label: "أميرة الحجاب باللؤلؤ والهلال",
    value: "img-girl-hijab-emerald",
    cost: 500000,
    badge: "أميرة الوقار",
    tier: "diamond",
    description: "حافظة متوجة بتاج الهلال الفضي واللؤلؤ، تلبس حجاب العفة البنفسجي المخملي."
  },

  // ── المستوى الأسطوري الأعلى: سلاطين وحملة كتاب الله (600,000 - 1,000,000 نجمة) ──
  {
    id: "av-img-boy-sultan-navy",
    type: "avatar",
    label: "سلطان الحكمة بالبشت الكحلي الملكي",
    value: "img-boy-sultan-navy",
    cost: 600000,
    badge: "أسطوري ⭐",
    tier: "legendary",
    description: "سلطان أهل القرآن بالبشت الكحلي المذهب المطرز بالذهب الخالص."
  },
  {
    id: "av-img-boy-crimson-master",
    type: "avatar",
    label: "شيخ الحفاظ بالجلابة العنابية والعمامة",
    value: "img-boy-crimson-master",
    cost: 750000,
    badge: "أسطوري ⭐",
    tier: "legendary",
    description: "رمز الإتقان بالجلابة العنابية الأصيلة والعمامة الملكية البيضاء الفاخرة."
  },
  {
    id: "av-img-boy-crescent-purple",
    type: "avatar",
    label: "أمير الهلال بالرداء البنفسجي المذهب",
    value: "img-boy-crescent-purple",
    cost: 850000,
    badge: "أسطوري VIP",
    tier: "legendary",
    description: "شخصية ملكية فاخرة برداء مخملي بنفسجي وشارة هلال رمضان المبارك."
  },
  {
    id: "av-img-boy-bisht-white",
    type: "avatar",
    label: "القارئ الملكي بالبشت الأسود الفاخر",
    value: "img-boy-bisht-white",
    cost: 900000,
    badge: "فخر الحفاظ",
    tier: "legendary",
    description: "أعلى درجات الفخامة: بشت أسود أندلسي فاخر مطرز بخيوط القصب المذهبة."
  },
  {
    id: "av-img-girl-emerald-queen",
    type: "avatar",
    label: "ملكة القرآن بالتاج الملكي والقفطان الزمردي",
    value: "img-girl-emerald-queen",
    cost: 950000,
    badge: "تاج الوقار 👑",
    tier: "legendary",
    description: "ملكة متوجة بتاج الوقار المرصع، ترتدي قفطاناً زمردياً نسجته أيادي المجد."
  },
  {
    id: "av-img-boy-quran-carrier",
    type: "avatar",
    label: "الحافظ المبارك حامل المصحف الشريف",
    value: "img-boy-quran-carrier",
    cost: 1000000,
    badge: "خاتم القرآن 🌟",
    tier: "legendary",
    description: "أسمى ألقاب التطبيق: الحافظ الصالح الذي يحمل كتاب الله في صدره وبين يديه في رحاب المحراب المبارك."
  },
];
export const SHOP_COLORS: ShopItem[] = [
  { id: "col-sunset", type: "color", label: "شفق الغروب", value: "from-pink-500 to-orange-400", cost: 150 },
  { id: "col-ocean", type: "color", label: "محيط النقاء", value: "from-cyan-400 to-indigo-500", cost: 200 },
  { id: "col-candy", type: "color", label: "بهجة الحلوى", value: "from-fuchsia-500 to-rose-400", cost: 250 },
  { id: "col-forest", type: "color", label: "واحة الجنان", value: "from-lime-400 to-emerald-600", cost: 300 },
  { id: "col-turquoise", type: "color", label: "الفيروز الملكي", value: "from-teal-400 to-cyan-600", cost: 400 },
  { id: "col-ruby", type: "color", label: "الياقوت الفاخر", value: "from-rose-500 to-red-700", cost: 500 },
  { id: "col-gold", type: "color", label: "الذهب الخالص", value: "from-yellow-300 to-amber-500", cost: 600 },
  { id: "col-lapis", type: "color", label: "اللازورد الأندلسي", value: "from-blue-600 to-violet-800", cost: 750 },
  { id: "col-galaxy", type: "color", label: "مجرّة النجوم", value: "from-indigo-500 to-purple-700", cost: 1000 },
  { id: "col-emerald-gold", type: "color", label: "الزمرد المذهب", value: "from-emerald-500 via-teal-600 to-amber-500", cost: 1500 },
];
export const SHOP_ITEMS: ShopItem[] = [...SHOP_AVATARS, ...SHOP_COLORS];

/** تنقية وتصحيح قيمة النقاط لضمان عدم تلفها أو تحولها لأرقام غير منتهية */
export const sanitizeCoins = (val: unknown): number => {
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n) || isNaN(n) || n < 0) return 0;
  return Math.min(100_000_000, Math.floor(n));
};

/** تنسيق عدد النجوم بطريقة جمالية واضحة */
export const formatCoins = (c: number | string): string => {
  return sanitizeCoins(c).toLocaleString("en-US");
};

/** كل مفاتيح الوجوه الصالحة (للتحقّق وترقية القيم القديمة/الإيموجي). */
export const ALL_AVATAR_KEYS = [...KID_AVATARS, ...SHOP_AVATARS.map(a => a.value)];

const today = () => new Date().toDateString();
const newId = (): string => {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch { /* ignore */ }
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

const upsert = (key: string, value: unknown) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (hasValidSupabaseKey()) supabase.from("store").upsert({ key, value }).then(() => {}, () => {});
};

const normalize = (p: Partial<KidsProfile>, i = 0): KidsProfile => ({
  ...DEFAULT_PROFILE,
  ...p,
  id: p.id || newId(),
  // ترقية الوجوه القديمة إلى مفاتيح شخصيات صالحة
  avatar: (p.avatar && ALL_AVATAR_KEYS.includes(p.avatar)) ? p.avatar : KID_AVATARS[i % KID_AVATARS.length],
  color: p.color || KID_COLORS[i % KID_COLORS.length],
  coins: sanitizeCoins(p.coins),
  inventory: Array.isArray(p.inventory) ? p.inventory : [],
  currentSurah: typeof p.currentSurah === "number" ? p.currentSurah : 0,
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
    if (!localStorage.getItem(APPMODE_KEY)) localStorage.setItem(APPMODE_KEY, kidsHidden() ? "parent" : "kids");
    upsert(PROFILES_KEY, [prof]);
    upsert(ACTIVE_KEY, id);
  } catch { /* ignore */ }
};

/* ---------------- وضع التطبيق ---------------- */
export const getAppMode = (): AppMode => {
  if (typeof window === "undefined") return "kids";
  ensureMigrated();
  try {
    const m = localStorage.getItem(APPMODE_KEY);
    if (m === "parent" || m === "kids") return m;
    return kidsHidden() ? "parent" : "kids";
  } catch { return "kids"; }
};
export const setAppMode = (m: AppMode) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(APPMODE_KEY, m); } catch { /* ignore */ }
  upsert(APPMODE_KEY, m);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:appmode"));
};
/** إخفاء كامل لركن الأطفال والألعاب (زرّ المالك) — يُخفي كل ما يخصّ الأطفال في كل التطبيق. */
const HIDEKIDS_KEY = "mushaf:hideKids";
export const kidsHidden = (): boolean => {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(HIDEKIDS_KEY) === "1"; } catch { return false; }
};
export const setKidsHidden = (on: boolean) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(HIDEKIDS_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  window.dispatchEvent(new Event("mushaf:appmode"));   // يحدّث القارئ وصفحة السماع فوراً
};

/** علامة الوضع العادي الصارم - يمنع أي وصول للأطفال تماماً (حتى في وضع المطور) */
const PURE_MODE_KEY = "mushaf:pureMode";
export const isPureMode = (): boolean => {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(PURE_MODE_KEY) === "1"; } catch { return false; }
};
export const setPureMode = (on: boolean) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PURE_MODE_KEY, on ? "1" : "0");
    // عند تفعيل الوضع العادي، نفعّل أيضاً إخفاء الأطفال
    if (on) setKidsHidden(true);
  } catch { /* ignore */ }
  window.dispatchEvent(new Event("mushaf:appmode"));
};

/** هل ركن الأطفال مُفعَّل؟ يختلف حسب وضع التطبيق:
 * - الوضع العادي الصارم (pure): مغلق دائماً بغض النظر عن الوضع
 * - وضع الأطفال (kids): مفتوح دائماً
 * - وضع ولي الأمر (parent): مفتوح في وضع التنقل المرن، مغلق في الوضع العادي الصارم
 * - وضع التنقل المرن (flexible) أو غير المحدد: مفتوح إذا لم يخفيه المالك
 */
export const kidsEnabled = (): boolean => {
  if (isPureMode()) return false; // الوضع العادي الصارم: لا أطفال أبداً
  if (!kidsHidden()) return true; // الأطفال غير مخفيين: مفتوح (في جميع الأوضاع بما فيها parent والتنقل المرن والأطفال)
  return false; // الأطفال مخفيين: مغلق
};

/** يُمنع الوصول لصفحات الأطفال (ألعاب/متجر/لوحة/اختيار) للمستخدمين عند إخفائها.
 *  في الوضع العادي (pure): يمنع الوصول تماماً حتى في وضع المطور.
 *  في وضع التنقل المرن: يُسمح للمالك بدخولها للتجربة والاختبار. */
export const kidsRouteBlocked = (): boolean => {
  // في الوضع العادي: منع كامل حتى في وضع المطور
  if (isPureMode()) return true;
  // في وضع التنقل المرن أو وضع الأطفال: يُسمح للمالك بالدخول للتجربة
  const mode = getAppMode();
  if (mode === "parent" || mode === "kids") return false;
  // وإلا نستخدم المنطق الأصلي: إذا كان الأطفال مخفيين وليس في وضع المطور
  return kidsHidden() && !isMushafDevEnabled();
};

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
    if (p && p.date === today()) {
      const limit = getProfile().playMinutes;
      const playExpired = limit > 0 && p.played >= limit;
      return { ...freshProgress(), ...p, playExpired };
    }
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mushaf:reading_progress", { detail: progress }));
    if (justUnlocked) window.dispatchEvent(new Event("mushaf:games_unlocked"));
  }
  return { progress, justUnlocked };
};

/** يضيف دقائق لعب؛ عند بلوغ الحدّ يُقفل اللعب حتى يأذن ولي الأمر. */
export const addPlayMinutes = (mins: number): { progress: KidsProgress; justExpired: boolean } => {
  const cur = getProgress();
  const limit = getProfile().playMinutes;
  const played = Math.round((cur.played + mins) * 10) / 10;
  const playExpired = limit > 0 && played >= limit;
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

/** يفتح ولي الأمر الألعاب اليوم فوراً (تجاوز هدف القراءة) ويصفّر عدّاد اللعب. */
export const unlockToday = () => {
  const cur = getProgress();
  saveProgress({ ...cur, unlocked: true, played: 0, playExpired: false });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:games_unlocked"));
};

/** يعيد ضبط تقدم اليوم للطفل المفعّل (يقرأ واللعب) — بالإضافة إلى مسح الساعة. */
export const resetProgress = () => {
  if (typeof window !== "undefined") {
    const id = getActiveId();
    if (id) localStorage.removeItem(progKey(id));
    window.dispatchEvent(new Event("mushaf:reading_progress"));
  }
};

/* ---------------- النقاط (النجوم) والمتجر ---------------- */
export const getCoins = (): number => sanitizeCoins(getProfile().coins);

/** يضيف نقاطاً للملف النشِط (تُكتسب من الألعاب). */
export const addCoins = (n: number) => {
  const id = getActiveId(); if (!id || !n) return;
  const current = sanitizeCoins(getProfile().coins);
  const next = sanitizeCoins(current + n);
  updateProfile(id, { coins: next });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:coins"));
};

/** يحدد رصيد النقاط للملف النشِط مباشرة (لولي الأمر). */
export const setCoins = (n: number) => {
  const id = getActiveId(); if (!id) return;
  const next = sanitizeCoins(n);
  updateProfile(id, { coins: next });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:coins"));
};

/** يخصم نقاطاً إن توفّرت؛ يُرجع نجاح العملية. */
export const spendCoins = (n: number): boolean => {
  const id = getActiveId(); const cur = sanitizeCoins(getProfile().coins);
  if (!id || cur < n) return false;
  updateProfile(id, { coins: cur - n });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:coins"));
  return true;
};

export const getInventory = (): string[] => getProfile().inventory || [];
export const ownItem = (itemId: string): boolean => getInventory().includes(itemId);

/** يفتح عنصراً بالمعرّف (زينة أو لعبة) إن لم يكن مملوكاً وتوفّرت نقاط كافية. */
export const unlockItem = (itemId: string, cost: number): boolean => {
  const id = getActiveId(); if (!id) return false;
  if (ownItem(itemId)) return true;
  if (cost > 0 && !spendCoins(cost)) return false;
  updateProfile(id, { inventory: [...getInventory(), itemId] });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:coins"));
  return true;
};

/** يشتري عنصر متجر (زينة). */
export const buyItem = (item: ShopItem): boolean => unlockItem(item.id, item.cost);

export const equipAvatar = (avatar: string) => { const id = getActiveId(); if (id) { updateProfile(id, { avatar }); if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:activeprofile")); } };
export const equipColor = (color: string) => { const id = getActiveId(); if (id) { updateProfile(id, { color }); if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:activeprofile")); } };

export const setCurrentSurah = (surahNumber: number) => {
  const id = getActiveId();
  if (id) {
    updateProfile(id, { currentSurah: surahNumber });
    if (typeof window !== "undefined") window.dispatchEvent(new Event("mushaf:activeprofile"));
  }
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
