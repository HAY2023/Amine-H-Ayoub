/**
 * نظام المكافآت اليومية — يُحمَّل من السيرفر ويُضاف تلقائياً عند فتح التطبيق.
 * كل يوم يحتوي على نقاط لكل لعبة + بونص إضافي.
 * الرابط: ملف JSON على HuggingFace (نفس مستودع التلاوات).
 */
import { addCoins } from "./kidsProfile";

const REWARDS_URL =
  "https://huggingface.co/datasets/hammoualiyoucef20/quran-audio/resolve/main/daily-rewards.json";

const LAST_CLAIM_KEY = "mushaf:dailyRewards:lastClaim";
const CACHE_KEY = "mushaf:dailyRewards:cache";

export interface DailyReward {
  date: string; // YYYY-MM-DD
  games: Record<string, number>; // اسم اللعبة → عدد النقاط
  bonus: number; // بونص إضافي (مجوهرات)
  message: string; // رسالة الترحيب
}

/** يُرجع تاريخ اليوم بصيغة YYYY-MM-DD */
const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** يتحقق هل تم استلام مكافأة اليوم مسبقاً */
export const isTodayClaimed = (): boolean => {
  try {
    return localStorage.getItem(LAST_CLAIM_KEY) === todayStr();
  } catch {
    return false;
  }
};

/** يجلب البيانات مع timeout لتجنب تعليق الواجهة */
const fetchWithTimeout = async (url: string, timeoutMs: number = 5000): Promise<Response | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
};

/** يجلب مكافآت اليوم من السيرفر (أو من الكاش عند عدم الاتصال) */
export const fetchTodayReward = async (): Promise<DailyReward | null> => {
  if (typeof window === "undefined") return null;

  const today = todayStr();

  // حاول الجلب من السيرفر أولاً (مع timeout 5 ثوانٍ)
  const res = await fetchWithTimeout(`${REWARDS_URL}?t=${Date.now()}`, 5000);
  if (res && res.ok) {
    try {
      const data = await res.json();
      // حفظ في الكاش
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch { /* ignore */ }

      // البحث عن مكافأة اليوم
      if (data[today]) {
        return { date: today, ...data[today] } as DailyReward;
      }
      // إذا لم يوجد مكافأة لليوم، استخدم آخر مكافأة متوفرة
      const dates = Object.keys(data).sort().reverse();
      if (dates.length > 0) {
        const latest = dates[0];
        return { date: today, ...data[latest] } as DailyReward;
      }
    } catch {
      // فشل في تحليل JSON — استخدم الكاش
    }
  }

  // استخدام الكاش عند فشل الاتصال
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      const dates = Object.keys(data).sort().reverse();
      if (dates.length > 0) {
        const latest = dates[0];
        return { date: today, ...data[latest] } as DailyReward;
      }
    }
  } catch { /* ignore */ }

  return null;
};

/** يُطالب بمكافأة اليوم ويُضيف النقاط للملف النشط */
export const claimDailyRewards = async (): Promise<{
  success: boolean;
  reward: DailyReward | null;
  totalAdded: number;
}> => {
  if (typeof window === "undefined") return { success: false, reward: null, totalAdded: 0 };

  // تحقق هل تم الاستلام مسبقاً
  if (isTodayClaimed()) {
    return { success: false, reward: null, totalAdded: 0 };
  }

  const reward = await fetchTodayReward();
  if (!reward) return { success: false, reward: null, totalAdded: 0 };

  let totalAdded = 0;

  // إضافة نقاط كل لعبة
  for (const [gameId, points] of Object.entries(reward.games)) {
    if (points > 0) {
      addCoins(points);
      totalAdded += points;
    }
  }

  // إضافة البونص
  if (reward.bonus > 0) {
    addCoins(reward.bonus);
    totalAdded += reward.bonus;
  }

  // تسجيل أن اليوم تم استلام مكافأته
  try {
    localStorage.setItem(LAST_CLAIM_KEY, todayStr());
  } catch { /* ignore */ }

  // إطلاق حدث لتحديث الواجهة
  window.dispatchEvent(new Event("mushaf:coins"));
  window.dispatchEvent(new Event("mushaf:dailyRewardClaimed"));

  return { success: true, reward, totalAdded };
};

/** يُرجع عدد الأيام المتتالية التي استلم فيها المستخدم المكافأة */
export const getStreakDays = (): number => {
  try {
    const stored = localStorage.getItem("mushaf:dailyRewards:streaks");
    if (!stored) return 0;
    const data = JSON.parse(stored);
    return data.count || 0;
  } catch {
    return 0;
  }
};

/** يزيد عداد الأيام المتتالية */
export const incrementStreak = (): number => {
  try {
    const stored = localStorage.getItem("mushaf:dailyRewards:streaks");
    let data = stored ? JSON.parse(stored) : { count: 0, lastDate: "" };
    const today = todayStr();

    if (data.lastDate === today) return data.count;

    // تحقق هل أمس كان متتالياً
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    if (data.lastDate === yesterdayStr) {
      data.count += 1;
    } else if (data.lastDate !== today) {
      data.count = 1; // إعادة بدء السلسلة
    }

    data.lastDate = today;
    localStorage.setItem("mushaf:dailyRewards:streaks", JSON.stringify(data));
    return data.count;
  } catch {
    return 1;
  }
};
