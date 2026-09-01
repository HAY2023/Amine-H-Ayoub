import { useState, useEffect } from "react";
import {
  X,
  Trophy,
  Flame,
  Award,
  Crown,
  ShieldCheck,
  Star,
  BookOpen,
  Sparkles,
  Gamepad2,
  Zap,
  Headphones,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { getBadgesList, calculateStreak, checkAndUnlockBadges, Badge } from "@/data/kidsBadges";
import { getProfile } from "@/data/kidsProfile";

interface Props {
  onClose: () => void;
}

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Trophy,
  ShieldCheck,
  Award,
  Crown,
  BookOpen,
  Sparkles,
  Gamepad2,
  Star,
  Zap,
  Headphones,
};

export default function BadgesModal({ onClose }: Props) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [filter, setFilter] = useState<"all" | "unlocked" | "streak">("all");
  const [streakInfo, setStreakInfo] = useState({
    currentStreak: 0,
    longestStreak: 0,
    thisWeekDays: [false, false, false, false, false, false, false],
  });

  const profile = getProfile();

  const refresh = () => {
    checkAndUnlockBadges();
    setBadges(getBadgesList());
    setStreakInfo(calculateStreak());
  };

  useEffect(() => {
    refresh();
    const handleUnlock = () => refresh();
    window.addEventListener("mushaf:badge_unlocked", handleUnlock);
    window.addEventListener("mushaf:coins", handleUnlock);
    return () => {
      window.removeEventListener("mushaf:badge_unlocked", handleUnlock);
      window.removeEventListener("mushaf:coins", handleUnlock);
    };
  }, []);

  const dayNames = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const filteredBadges = badges.filter((b) => {
    if (filter === "unlocked") return b.unlocked;
    if (filter === "streak") return b.category === "streak";
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors z-20"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* رأس النافذة */}
        <div className="flex items-center gap-3 pr-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center ring-2 ring-amber-500/25 shadow-inner">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-xl text-foreground flex items-center gap-2">
              لوحة الأوسمة والإنجازات
            </h3>
            <p className="text-xs text-muted-foreground">
              {profile.name ? `أوسمة البطل ${profile.name}` : "أوسمتك القرآنية والتحديات"} ({unlockedCount} / {badges.length})
            </p>
          </div>
        </div>

        {/* كرت سلسلة الالتزام (Streak Banner) */}
        <div className="rounded-2xl p-3.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center animate-bounce">
                <Flame 
                  className={`transition-all duration-300 ${
                    streakInfo.currentStreak >= 7 ? "w-10 h-10 text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" :
                    streakInfo.currentStreak >= 5 ? "w-8 h-8 text-orange-500 fill-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.7)]" :
                    streakInfo.currentStreak >= 3 ? "w-7 h-7 text-amber-500 fill-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]" :
                    streakInfo.currentStreak >= 1 ? "w-6 h-6 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_2px_rgba(234,179,8,0.5)]" :
                    "w-5 h-5 text-muted-foreground"
                  }`} 
                />
              </span>
              <div>
                <span className="block font-extrabold text-sm text-foreground">
                  سلسلة الالتزام: {streakInfo.currentStreak} {streakInfo.currentStreak === 1 ? "يوم" : "أيام"} متتالية! 🔥
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  أطول سلسلة حققتها: {streakInfo.longestStreak} يوماً
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              واظب يومياً
            </span>
          </div>

          {/* دوائر أيام الأسبوع */}
          <div className="flex items-center justify-between gap-1 pt-1">
            {streakInfo.thisWeekDays.map((active, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    active
                      ? "bg-amber-500 text-white ring-2 ring-amber-400 shadow-md scale-105"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {active ? "✓" : "○"}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium truncate w-full text-center">
                  {dayNames[idx]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* فلاتر الأوسمة */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({badges.length})
          </button>
          <button
            onClick={() => setFilter("unlocked")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "unlocked"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            المكتسبة 🏆 ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter("streak")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "streak"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            سلسلة الأيام 🔥
          </button>
        </div>

        {/* قائمة الأوسمة */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 -mr-1">
          {filteredBadges.map((badge) => {
            const IconComponent = ICON_COMPONENTS[badge.icon] || Award;
            return (
              <div
                key={badge.id}
                className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                  badge.unlocked
                    ? "bg-card border-amber-500/40 shadow-sm ring-1 ring-amber-500/20"
                    : "bg-muted/40 border-border opacity-75"
                }`}
              >
                {/* الأيقونة */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                    badge.unlocked
                      ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>

                {/* التفاصيل */}
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-extrabold text-sm text-foreground truncate">
                      {badge.title}
                    </span>
                    <span className="text-[11px] font-extrabold text-amber-500 flex items-center gap-0.5 shrink-0">
                      <Star className="w-3 h-3 fill-current" /> +{badge.rewardCoins}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-1 mb-1.5">
                    {badge.description}
                  </p>

                  {/* شريط التقدم */}
                  {badge.unlocked ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم تحقيقه بنجاح</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${badge.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> مقفل
                        </span>
                        <span>{badge.progressLabel}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
