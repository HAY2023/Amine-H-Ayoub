/**
 * نظام الأوسمة وسلسلة الالتزام (Badges & Streaks)
 */
import { getProfile, getHistory, getProgress, getActiveId, addCoins, DayLog } from "./kidsProfile";

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "streak" | "surah" | "reading" | "game" | "coins";
  rewardCoins: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0 to 100
  progressLabel?: string;
}

const BADGES_STORE_KEY = (childId: string) => `mushaf:badges:${childId}`;

export const ALL_BADGES_CONFIG = [
  {
    id: "streak_3",
    title: "المواظب الصغير 🌟",
    description: "استمع إلى القرآن لـ 3 أيام متتالية دون انقطاع",
    icon: "Flame",
    category: "streak" as const,
    rewardCoins: 20,
    target: 3,
  },
  {
    id: "streak_7",
    title: "سلسلة الالتزام الذهبية 🏆",
    description: "استمع إلى القرآن لـ 7 أيام متواصلة",
    icon: "Trophy",
    category: "streak" as const,
    rewardCoins: 50,
    target: 7,
  },
  {
    id: "weekly_hero",
    title: "وسام بطل الأسبوع 🛡️",
    description: "أكمل وقت الاستماع المحدد لـ 5 أيام خلال الأسبوع",
    icon: "ShieldCheck",
    category: "reading" as const,
    rewardCoins: 40,
    target: 5,
  },
  {
    id: "streak_14",
    title: "بطل المثابرة 🎖️",
    description: "سلسلة استماع متواصلة لـ 14 يوماً",
    icon: "Award",
    category: "streak" as const,
    rewardCoins: 100,
    target: 14,
  },
  {
    id: "streak_30",
    title: "نجم الشهر القرآني 👑",
    description: "سلسلة استماع والتزام لـ 30 يوماً",
    icon: "Crown",
    category: "streak" as const,
    rewardCoins: 250,
    target: 30,
  },
  {
    id: "surah_naba",
    title: "حافظ سورة النبأ 📖",
    description: "استمع لسورة النبأ وتدرب على حفظها في ركن الألعاب",
    icon: "BookOpen",
    category: "surah" as const,
    rewardCoins: 30,
    target: 1,
  },
  {
    id: "surah_fatiha",
    title: "فاتحة الخير 🌸",
    description: "استمع لسورة الفاتحة المباركة",
    icon: "Sparkles",
    category: "surah" as const,
    rewardCoins: 15,
    target: 1,
  },
  {
    id: "first_game",
    title: "القارئ اللاعب 🎮",
    description: "أكمل وقت الاستماع والعب أول لعبة قرآنية",
    icon: "Gamepad2",
    category: "game" as const,
    rewardCoins: 15,
    target: 1,
  },
  {
    id: "collector_50",
    title: "جامع النجوم 🌟",
    description: "اجمع 50 نجمة من الألعاب والتلاوة",
    icon: "Star",
    category: "coins" as const,
    rewardCoins: 25,
    target: 50,
  },
  {
    id: "collector_100",
    title: "كنز النور 🪙",
    description: "اجمع 100 نجمة في حسابك",
    icon: "Zap",
    category: "coins" as const,
    rewardCoins: 50,
    target: 100,
  },
  {
    id: "listener_60",
    title: "المستمع المتميز 🎧",
    description: "استمع للقرآن الكريم لأكثر من 60 دقيقة إجمالياً",
    icon: "Headphones",
    category: "reading" as const,
    rewardCoins: 35,
    target: 60,
  },
];

/**
 * حساب سلسلة الأيام المتتالية الحالية والسابقة
 */
export function calculateStreak(): {
  currentStreak: number;
  longestStreak: number;
  thisWeekDays: boolean[]; // 7 days (Saturday to Friday)
} {
  const history: DayLog[] = getHistory();
  const todayProgress = getProgress();

  const todayStr = new Date().toISOString().split("T")[0];
  const hasTodayActivity = (todayProgress?.minutes || 0) > 0;

  // تواريخ النشاط
  const activeDates = new Set<string>();
  if (hasTodayActivity) activeDates.add(todayStr);

  history.forEach((log) => {
    if (log.minutes > 0) activeDates.add(log.date);
  });

  // حساب السلسلة المتتالية ابتداءً من اليوم أو أمس
  let currentStreak = 0;
  let checkDate = new Date();

  // إذا لم يستمع اليوم بعد، نتحقق من أمس
  if (!hasTodayActivity) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = checkDate.toISOString().split("T")[0];
    if (activeDates.has(dStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // حساب أطول سلسلة
  let longestStreak = currentStreak;
  const sortedDates = Array.from(activeDates).sort();
  let tempStreak = 0;
  let lastTime: number | null = null;

  sortedDates.forEach((dStr) => {
    const t = new Date(dStr).getTime();
    if (lastTime === null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((t - lastTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    lastTime = t;
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  });

  // حساب أيام الأسبوع الحالي بحيث يكون اليوم هو آخر يوم على اليسار
  const now = new Date();
  const thisWeekDays: boolean[] = [];
  const dayNamesArr: string[] = [];
  const arabicDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    thisWeekDays.push(activeDates.has(dStr));
    dayNamesArr.push(arabicDays[d.getDay()]);
  }

  return {
    currentStreak,
    longestStreak,
    thisWeekDays,
    dayNamesArr,
  };
}

/**
 * جلب قائمة الأوسمة مع حالة الفتح والتقدم
 */
export function getBadgesList(): Badge[] {
  const childId = getActiveId() || "default";
  const profile = getProfile();
  const history = getHistory();
  const progress = getProgress();
  const { currentStreak } = calculateStreak();

  let unlockedMap: Record<string, { unlockedAt: string }> = {};
  try {
    const raw = localStorage.getItem(BADGES_STORE_KEY(childId));
    if (raw) unlockedMap = JSON.parse(raw);
  } catch {
    /* ignore */
  }

  const totalMinutes =
    history.reduce((acc, cur) => acc + cur.minutes, 0) + (progress?.minutes || 0);
  const totalCoins = profile?.coins || 0;
  const completedDaysThisWeek = history.slice(-7).filter((d) => d.minutes >= profile.goalMinutes).length;

  return ALL_BADGES_CONFIG.map((cfg) => {
    const isUnlocked = !!unlockedMap[cfg.id];
    let curVal = 0;

    if (cfg.category === "streak") {
      curVal = currentStreak;
    } else if (cfg.id === "weekly_hero") {
      curVal = completedDaysThisWeek;
    } else if (cfg.id === "listener_60") {
      curVal = Math.floor(totalMinutes);
    } else if (cfg.id === "collector_50" || cfg.id === "collector_100") {
      curVal = totalCoins;
    } else if (cfg.id === "first_game") {
      curVal = (progress?.played || 0) > 0 ? 1 : 0;
    } else {
      curVal = isUnlocked ? 1 : 0;
    }

    const pct = isUnlocked ? 100 : Math.min(100, Math.round((curVal / cfg.target) * 100));

    return {
      id: cfg.id,
      title: cfg.title,
      description: cfg.description,
      icon: cfg.icon,
      category: cfg.category,
      rewardCoins: cfg.rewardCoins,
      unlocked: isUnlocked,
      unlockedAt: unlockedMap[cfg.id]?.unlockedAt,
      progress: pct,
      progressLabel: isUnlocked ? "مكتمل ✓" : `${curVal} / ${cfg.target}`,
    };
  });
}

/**
 * فحص وفتح الأوسمة المستحقة تلقائياً
 */
export function checkAndUnlockBadges(): { unlockedBadges: Badge[]; totalStreak: number } {
  const childId = getActiveId() || "default";
  const profile = getProfile();
  const history = getHistory();
  const progress = getProgress();
  const { currentStreak } = calculateStreak();

  let unlockedMap: Record<string, { unlockedAt: string }> = {};
  try {
    const raw = localStorage.getItem(BADGES_STORE_KEY(childId));
    if (raw) unlockedMap = JSON.parse(raw);
  } catch {
    /* ignore */
  }

  const totalMinutes =
    history.reduce((acc, cur) => acc + cur.minutes, 0) + (progress?.minutes || 0);
  const totalCoins = profile?.coins || 0;
  const completedDaysThisWeek = history.slice(-7).filter((d) => d.minutes >= (profile?.goalMinutes || 5)).length;

  const newlyUnlocked: Badge[] = [];

  ALL_BADGES_CONFIG.forEach((cfg) => {
    if (unlockedMap[cfg.id]) return; // مفتوح مسبقاً

    let shouldUnlock = false;

    if (cfg.category === "streak") {
      shouldUnlock = currentStreak >= cfg.target;
    } else if (cfg.id === "weekly_hero") {
      shouldUnlock = completedDaysThisWeek >= cfg.target;
    } else if (cfg.id === "listener_60") {
      shouldUnlock = totalMinutes >= cfg.target;
    } else if (cfg.id === "collector_50" || cfg.id === "collector_100") {
      shouldUnlock = totalCoins >= cfg.target;
    } else if (cfg.id === "first_game") {
      shouldUnlock = (progress?.played || 0) > 0;
    }

    if (shouldUnlock) {
      unlockedMap[cfg.id] = { unlockedAt: new Date().toISOString() };
      addCoins(cfg.rewardCoins);

      newlyUnlocked.push({
        id: cfg.id,
        title: cfg.title,
        description: cfg.description,
        icon: cfg.icon,
        category: cfg.category,
        rewardCoins: cfg.rewardCoins,
        unlocked: true,
        unlockedAt: unlockedMap[cfg.id].unlockedAt,
        progress: 100,
        progressLabel: "مكتمل ✓",
      });
    }
  });

  if (newlyUnlocked.length > 0) {
    try {
      localStorage.setItem(BADGES_STORE_KEY(childId), JSON.stringify(unlockedMap));
    } catch {
      /* ignore */
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mushaf:badge_unlocked", { detail: newlyUnlocked })
      );
    }
  }

  return {
    unlockedBadges: newlyUnlocked,
    totalStreak: currentStreak,
  };
}

/**
 * فتح وسام يدوي خاص بسورة معينة (مثل سورة النبأ أو الفاتحة)
 */
export function unlockSurahBadge(badgeId: string) {
  const childId = getActiveId() || "default";
  let unlockedMap: Record<string, { unlockedAt: string }> = {};
  try {
    const raw = localStorage.getItem(BADGES_STORE_KEY(childId));
    if (raw) unlockedMap = JSON.parse(raw);
  } catch {
    /* ignore */
  }

  if (unlockedMap[badgeId]) return;

  const cfg = ALL_BADGES_CONFIG.find((b) => b.id === badgeId);
  if (!cfg) return;

  unlockedMap[badgeId] = { unlockedAt: new Date().toISOString() };
  addCoins(cfg.rewardCoins);

  try {
    localStorage.setItem(BADGES_STORE_KEY(childId), JSON.stringify(unlockedMap));
  } catch {
    /* ignore */
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mushaf:badge_unlocked", {
        detail: [
          {
            id: cfg.id,
            title: cfg.title,
            description: cfg.description,
            icon: cfg.icon,
            category: cfg.category,
            rewardCoins: cfg.rewardCoins,
            unlocked: true,
            unlockedAt: unlockedMap[badgeId].unlockedAt,
            progress: 100,
            progressLabel: "مكتمل ✓",
          },
        ],
      })
    );
  }
}
