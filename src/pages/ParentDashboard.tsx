import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Bell,
  Baby,
  Check,
  Gift,
  Plus,
  Trash2,
  Minus,
  Star,
  X,
  TrendingUp,
  Award,
  Zap,
  Target,
  Trophy,
  Shield,
  Lock,
  Calendar,
  Sliders,
  Sparkles,
  Headphones,
  Settings,
  KeyRound,
  HelpCircle,
  RefreshCw,
  Gamepad2,
  MessageSquare,
  Mail,
  Scale,
} from "lucide-react";
import { showLocalNotification, requestNotificationPermission } from "../utils/notifications";
import {
  getProfile,
  updateProfile,
  getProgress,
  getHistory,
  getProfiles,
  getActiveId,
  setActiveProfile,
  addProfile,
  removeProfile,
  getAppMode,
  setAppMode,
  grantMorePlay,
  resetProgress,
  unlockToday,
  KID_AVATARS,
  KID_COLORS,
  KidsProfile,
  KidsProgress,
  DayLog,
  formatCoins,
  addCoins,
  setCoins,
  isPureMode,
  setPureMode,
  setKidsHidden,
  kidsHidden,
  AppMode,
} from "../data/kidsProfile";
import { getKidsSchedule, saveKidsSchedule, KidsSchedule } from "../data/kidsSchedule";
import {
  isKidsMode,
  setKidsLocked,
  hasKidsPin,
  setKidsPin,
  removeKidsPin,
  getSecurityQuestion,
  setSecurityQuestion,
  DEFAULT_SECURITY_QUESTIONS,
} from "../data/kidsLock";
import { calculateStreak } from "../data/kidsBadges";
import { SURAHS } from "../data/quranData";
import { getGameCatalog, setGameCost, resetGamePrices, type GameDef } from "../data/gameCatalog";
import Avatar from "../components/Avatar";
import BadgesModal from "../components/BadgesModal";
import ParentalGateModal from "../components/ParentalGateModal";
import SupportModal from "../components/SupportModal";
import { toast } from "../hooks/use-toast";

type DashboardTab = "overview" | "goals" | "schedule" | "games" | "security";

export default function ParentDashboard() {
  const navigate = useNavigate();

  // الحالة العامة
  const [profiles, setProfiles] = useState<KidsProfile[]>(getProfiles);
  const [activeId, setActiveId] = useState<string>(getActiveId);
  const [profile, setProfile] = useState<KidsProfile>(getProfile);
  const [draft, setDraft] = useState<KidsProfile>(getProfile);
  const [progress, setProgress] = useState<KidsProgress>(getProgress);
  const [schedule, setSchedule] = useState<KidsSchedule>(getKidsSchedule);
  const [appMode, setAppModeState] = useState<AppMode>(getAppMode);
  const [pureMode, setPureModeState] = useState(isPureMode);
  const [kidsLocked, setKidsLockedState] = useState(isKidsMode);
  const [catalog, setCatalog] = useState<GameDef[]>(getGameCatalog);

  // التبويب النشط في اللوحة
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // النوافذ المنبثقة
  const [showAddChild, setShowAddChild] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [customRewardAmount, setCustomRewardAmount] = useState("");
  const [showGateCheck, setShowGateCheck] = useState(() => isKidsMode() && hasKidsPin());

  // بيانات طفل جديد
  const [newKid, setNewKid] = useState({
    name: "",
    age: 7,
    avatar: KID_AVATARS[0],
    color: KID_COLORS[0],
  });

  // إدارة رمز الـ PIN من اللوحة
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [newPinInput, setNewPinInput] = useState("");
  const [secQuestion, setSecQuestionState] = useState(getSecurityQuestion);
  const [secAnswer, setSecAnswer] = useState("");

  const getFullHistory = (): DayLog[] => {
    const past = getHistory();
    const cur = getProgress();
    const todayDate = cur.date || new Date().toISOString().split("T")[0];
    const pastFiltered = past.filter((d) => d.date !== todayDate).slice().reverse();
    const todayLog: DayLog = {
      date: todayDate,
      minutes: cur.minutes || 0,
      played: cur.played || 0,
    };
    return [...pastFiltered, todayLog].slice(-7);
  };

  const [history, setHistory] = useState<DayLog[]>(getFullHistory);

  const refresh = () => {
    setProfiles(getProfiles());
    setActiveId(getActiveId());
    const p = getProfile();
    setProfile(p);
    setDraft(p);
    setProgress(getProgress());
    setHistory(getFullHistory());
    setSchedule(getKidsSchedule());
    setAppModeState(getAppMode());
    setPureModeState(isPureMode());
    setKidsLockedState(isKidsMode());
    setCatalog(getGameCatalog());
  };

  useEffect(() => {
    refresh();
    const evts = [
      "focus",
      "mushaf:games_unlocked",
      "mushaf:coins",
      "mushaf:activeprofile",
      "mushaf:reading_progress",
      "mushaf:kidsmode",
      "mushaf:appmode",
      "mushaf:gamecatalog",
      "storage",
    ];
    evts.forEach((e) => window.addEventListener(e, refresh));
    return () => evts.forEach((e) => window.removeEventListener(e, refresh));
  }, []);

  // حساب الإحصائيات
  const stats = {
    totalMinutes: history.reduce((sum, d) => sum + (d.minutes || 0), 0),
    avgMinutes: Math.round(
      history.reduce((sum, d) => sum + (d.minutes || 0), 0) / Math.max(1, history.length)
    ),
    bestDay: Math.max(0, ...history.map((d) => d.minutes || 0)),
    consecutiveDays: calculateStreak().currentStreak,
    percentComplete: Math.min(
      100,
      Math.round(((progress.minutes || 0) / Math.max(1, profile.goalMinutes || 1)) * 100)
    ),
  };
  const playPct = Math.min(
    100,
    Math.round(((progress.played || 0) / Math.max(1, profile.playMinutes || 1)) * 100)
  );

  // اختيار طفل
  const switchTo = (id: string) => {
    setActiveProfile(id);
    refresh();
  };

  // حفظ بيانات الطفل
  const saveChild = () => {
    updateProfile(draft.id, {
      name: draft.name,
      avatar: draft.avatar,
      color: draft.color,
      age: draft.age,
      goalMinutes: draft.goalMinutes,
      playMinutes: draft.playMinutes,
      reward: draft.reward,
      coins: draft.coins,
      currentSurah: draft.currentSurah,
    });
    refresh();
    toast({ title: "✓ تم حفظ إعدادات الطفل وسورة الحفظ بنجاح" });
  };

  // إضافة طفل جديد
  const createChild = () => {
    const name = newKid.name.trim();
    if (!name) {
      toast({ title: "يرجى كتابة اسم الطفل", variant: "destructive" });
      return;
    }
    const p = addProfile({
      name,
      age: newKid.age,
      avatar: newKid.avatar,
      color: newKid.color,
    });
    setActiveProfile(p.id);
    if (getAppMode() === "parent") setAppMode("kids");
    setShowAddChild(false);
    refresh();
    toast({ title: `🎉 تم إضافة ${name} إلى أبطال القرآن!` });
  };

  // حذف طفل
  const delChild = (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف ملف «${name || "الطفل"}» وكل إنجازاته؟`)) return;
    removeProfile(id);
    refresh();
    toast({ title: "تم حذف الملف" });
  };

  // تذكير الدرس
  const saveLesson = (t: string) => {
    updateProfile(profile.id, { lessonTime: t });
    refresh();
    if (t && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => { });
    }
    toast({ title: t ? `🔔 تم ضبط تذكير الدرس: ${t}` : "تم إلغاء تذكير الدرس" });
  };

  // تبديل أوضاع التطبيق
  const handleModeChange = (mode: "flexible" | "kids" | "pure") => {
    if (mode === "flexible") {
      setPureMode(false);
      setKidsHidden(false);
      setAppMode("parent");
      setKidsLocked(false);
      refresh();
      toast({
        title: "🔄 تم التبديل إلى وضع التنقل المرن",
        description: "كامل ميزات التطبيق وركن الأطفال متاحة ومفتوحة",
      });
    } else if (mode === "kids") {
      if (!hasKidsPin()) {
        setShowPinDialog(true);
        toast({
          title: "🔐 يُرجى تعيين رمز مرور لولي الأمر أولاً",
          description: "رمز المرور ضروري لحماية الطفل ومنعه من الخروج",
        });
        return;
      }
      setPureMode(false);
      setKidsHidden(false);
      setAppMode("kids");
      setKidsLocked(true);
      refresh();
      toast({
        title: "👶 تم تفعيل وضع الأطفال المقفل",
        description: "التطبيق مقفل الآن داخل ركن الأطفال ولا يمكن الخروج إلا بالرمز",
      });
      navigate("/games");
    } else if (mode === "pure") {
      setPureMode(true);
      setKidsHidden(true);
      setAppMode("parent");
      setKidsLocked(false);
      refresh();
      toast({
        title: "🎧 تم التفعيل: الوضع العادي الصارم (تلاوات ومصحف فقط)",
        description: "تم إخفاء ركن الأطفال بالكامل للبالغين",
      });
    }
  };

  // حفظ رمز PIN جديد
  const saveNewPin = () => {
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      toast({ title: "يجب أن يتكون الرمز من 4 أرقام", variant: "destructive" });
      return;
    }
    setKidsPin(newPinInput);
    if (secAnswer.trim()) {
      setSecurityQuestion(secQuestion, secAnswer.trim());
    }
    setShowPinDialog(false);
    setNewPinInput("");
    setSecAnswer("");
    refresh();
    toast({ title: "✓ تم تعيين رمز مرور الوالدين بنجاح!" });
  };

  return (
    <div className="min-h-screen page-nour text-foreground pb-12" dir="rtl">
      {/* فحص بوابة الوالدين إذا كان وضع الأطفال مفعلاً */}
      {showGateCheck && (
        <ParentalGateModal
          title="الدخول للوحة تحكم ولي الأمر"
          onSuccess={() => {
            setShowGateCheck(false);
            setKidsLocked(false);
            refresh();
          }}
          onCancel={() => {
            setShowGateCheck(false);
            navigate("/games");
          }}
        />
      )}

      <div className="mx-auto max-w-2xl px-3 sm:px-4 py-4 space-y-4">
        {/* شريط التنقل العلوي للوحة الوالدين */}
        <header className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-card/80 backdrop-blur-md border border-border/60 shadow-sm">
          <button
            onClick={() => navigate("/audio")}
            className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl bg-secondary text-secondary-foreground px-3 sm:px-4 text-xs sm:text-sm font-bold hover:brightness-95 active:scale-95 transition-all"
          >
            <ArrowRight className="h-4 w-4" /> رجوع للتلاوات
          </button>

          <div className="text-center">
            <h1 className="font-extrabold text-base sm:text-lg text-gradient-gold flex items-center justify-center gap-1.5">
              <Shield className="w-5 h-5 text-accent" /> لوحة ولي الأمر
            </h1>
            <span className="text-[10px] text-muted-foreground font-semibold">
              {kidsLocked
                ? "👶 وضع الأطفال المقفل"
                : pureMode
                  ? "🎧 الوضع الصارم (تلاوات فقط)"
                  : "🔄 وضع التنقل المرن"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSupportModal(true)}
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-accent/15 text-accent text-xs font-bold hover:bg-accent/25 active:scale-95 transition-all flex items-center gap-1"
              title="تواصل مع الدعم الفني"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">الدعم</span>
            </button>
            <button
              onClick={() => navigate("/games")}
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/25 active:scale-95 transition-all flex items-center gap-1"
              title="الذهاب إلى ركن الأطفال"
            >
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">الألعاب</span>
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95 transition-all"
              title="الإعدادات العامة"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* ── شريط اختيار الطفل ── */}
        <div className="card-nour p-3 space-y-2 shadow-soft animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="font-bold text-accent text-sm flex items-center gap-1.5">
              <Baby className="w-4 h-4" /> أبطال القرآن في العائلة
            </p>
            <span className="text-[11px] text-muted-foreground">
              {profiles.length} {profiles.length === 1 ? "طفل" : "أطفال"} مسجلون
            </span>
          </div>

          <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 no-scrollbar">
            {profiles.map((p) => (
              <div key={p.id} className="relative shrink-0">
                <button
                  onClick={() => switchTo(p.id)}
                  className={`w-24 sm:w-28 flex flex-col items-center gap-1.5 rounded-2xl p-2.5 border transition-all ${p.id === activeId
                      ? "border-accent bg-accent/15 ring-2 ring-accent shadow-md scale-105"
                      : "border-border/70 bg-card hover:border-accent/40"
                    }`}
                >
                  <div
                    className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-inner overflow-hidden`}
                  >
                    <Avatar name={p.avatar} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-black truncate w-full text-center text-foreground">
                    {p.name || "البطل"}
                  </span>
                  <div className="flex items-center justify-between w-full text-[10px] text-muted-foreground px-1">
                    <span>{p.age} سنوات</span>
                    <span className="text-accent font-bold">
                      {formatCoins(p.coins || 0)} ⭐
                    </span>
                  </div>
                </button>
                {profiles.length > 1 && (
                  <button
                    onClick={() => delChild(p.id, p.name)}
                    className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
                    title="حذف هذا الطفل"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* زر إضافة طفل جديد */}
            <button
              onClick={() => setShowAddChild(true)}
              className="w-24 sm:w-28 shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 border-2 border-dashed border-accent/40 bg-card/40 hover:bg-accent/10 active:scale-95 transition-all text-accent"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs font-bold">إضافة طفل</span>
            </button>
          </div>
        </div>

        {/* ── التبويبات الخمسة المنظمة للوحة ── */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-secondary/80 border border-border/50 text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0 ${activeTab === "overview"
                ? "bg-card text-accent shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>نظرة عامة واليوم</span>
          </button>

          <button
            onClick={() => setActiveTab("goals")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0 ${activeTab === "goals"
                ? "bg-card text-accent shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Target className="w-4 h-4" />
            <span>أهداف وسورة {profile.name || "الطفل"}</span>
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0 ${activeTab === "schedule"
                ? "bg-card text-accent shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Clock className="w-4 h-4" />
            <span>المواعيد والجدول</span>
          </button>

          <button
            onClick={() => setActiveTab("games")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0 ${activeTab === "games"
                ? "bg-card text-accent shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>مكتبة الألعاب ({catalog.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0 ${activeTab === "security"
                ? "bg-card text-accent shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Shield className="w-4 h-4" />
            <span>الأمان والأوضاع</span>
          </button>
        </div>

        {/* ── التبويب 1: نظرة عامة واليوم ── */}
        {activeTab === "overview" && (
          <div className="space-y-4 animate-fade-in">
            {/* بطاقة تقدم اليوم الحية */}
            <div className="card-nour p-4 space-y-3.5 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="font-bold text-accent flex items-center gap-2">
                  <Zap className="w-4 h-4" /> تقدم اليوم: {profile.name || "بطل القرآن"}
                </p>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${progress.unlocked
                      ? "bg-success/15 text-success"
                      : "bg-amber-500/15 text-amber-500"
                    }`}
                >
                  {progress.unlocked ? "✓ الألعاب مفتوحة" : "🔒 الألعاب مقفلة للقراءة"}
                </span>
              </div>

              {/* دقائق القراءة */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground font-bold">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" /> وقت القراءة والاستماع
                  </span>
                  <span className="font-extrabold text-foreground">
                    {progress.minutes} / {profile.goalMinutes} دقيقة ({stats.percentComplete}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${stats.percentComplete}%` }}
                  />
                </div>
              </div>

              {/* دقائق اللعب */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground font-bold">
                    <Clock className="w-3.5 h-3.5 text-red-500" /> وقت اللعب المستهلك
                  </span>
                  <span className="font-extrabold text-foreground">
                    {progress.played || 0} /{" "}
                    {profile.playMinutes > 0 ? `${profile.playMinutes} دقيقة` : "بلا حد"} (
                    {playPct}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                    style={{ width: `${playPct}%` }}
                  />
                </div>
              </div>

              {/* أزرار التحكم الفوري السريعة */}
              <div className="pt-3 border-t border-border/50 space-y-2">
                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-accent" /> إجراءات تحكم سريعة وفورية:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      unlockToday();
                      refresh();
                      toast({
                        title: "🎉 تم فتح الألعاب لليوم فوراً!",
                        description: "تم تجاوز شرط القراءة، يمكن للطفل اللعب الآن.",
                      });
                    }}
                    className="p-2.5 rounded-xl bg-success/15 border border-success/30 text-success font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Check className="w-4 h-4" /> فتح الألعاب لليوم فوراً
                  </button>

                  <button
                    onClick={() => {
                      grantMorePlay();
                      refresh();
                      toast({
                        title: "⏱️ تم منح وقت لعب إضافي!",
                        description: "تم تصفير عداد دقائق اللعب المستهلكة اليوم.",
                      });
                    }}
                    className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Clock className="w-4 h-4" /> تصفير عداد وقت اللعب
                  </button>

                  <button
                    onClick={() => {
                      if (!window.confirm("هل تريد إعادة ضبط عداد قراءة ولعب اليوم؟")) return;
                      resetProgress();
                      refresh();
                      toast({ title: "تمت إعادة ضبط تقدم اليوم" });
                    }}
                    className="p-2.5 rounded-xl bg-secondary border border-border text-muted-foreground font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <RefreshCw className="w-4 h-4" /> تصفير تقدم قراءة اليوم
                  </button>

                  <button
                    onClick={() => {
                      if (!window.confirm(`هل أنت متأكد من تصفير رصيد نجوم ${profile.name}؟`)) return;
                      setCoins(0);
                      refresh();
                      toast({ title: "تم تصفير رصيد النجوم" });
                    }}
                    className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Trash2 className="w-4 h-4" /> تصفير رصيد النجوم
                  </button>
                </div>
              </div>
            </div>

            {/* خزينة المكافآت والنجوم للطفل */}
            <div className="card-nour p-4 space-y-3 shadow-soft border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-sm sm:text-base text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400 animate-pulse" /> خزينة مكافآت {profile.name || "الطفل"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    الرصيد المتاح للطفل في المتجر: <span className="font-extrabold text-foreground">{formatCoins(profile.coins || 0)} نجمة ⭐</span>
                  </p>
                </div>
                <span className="text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-2xl border border-amber-500/30">
                  {formatCoins(profile.coins || 0)} ⭐
                </span>
              </div>

              {/* أزرار المكافأة الفورية المتنوعة */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "+500 ⭐", amount: 500, desc: "تشجيع يومي" },
                  { label: "+5,000 ⭐", amount: 5000, desc: "حفظ سورة" },
                  { label: "+50,000 ⭐", amount: 50000, desc: "إتمام جزء" },
                  { label: "+1,000,000 ⭐", amount: 1000000, desc: "مكافأة كبرى" },
                ].map((tier) => (
                  <button
                    key={tier.amount}
                    onClick={() => {
                      addCoins(tier.amount);
                      refresh();
                      toast({
                        title: `🎉 تم منح ${formatCoins(tier.amount)} نجمة!`,
                        description: `مكافأة ${tier.desc} لبطل القرآن ${profile.name}`,
                      });
                    }}
                    className="p-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">{tier.label}</span>
                    <span className="text-[10px] text-muted-foreground">{tier.desc}</span>
                  </button>
                ))}
              </div>

              {/* مكافأة بمبلغ مخصص */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  placeholder="اكتب عدد نجوم مخصص (مثال: 25000)..."
                  value={customRewardAmount}
                  onChange={(e) => setCustomRewardAmount(e.target.value)}
                  className="flex-1 rounded-xl bg-secondary border border-border p-2 text-xs font-bold text-foreground focus:border-amber-500 outline-none"
                />
                <button
                  onClick={() => {
                    const num = parseInt(customRewardAmount, 10);
                    if (!num || num <= 0) {
                      toast({ title: "يرجى كتابة عدد نجوم صالح", variant: "destructive" });
                      return;
                    }
                    addCoins(num);
                    setCustomRewardAmount("");
                    refresh();
                    toast({
                      title: `⭐ تم منح ${formatCoins(num)} نجمة!`,
                      description: `مكافأة تشجيعية مخصصة لبطل القرآن ${profile.name}`,
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all shrink-0"
                >
                  منح المكافأة
                </button>
              </div>
            </div>

            {/* إحصائيات الأسبوع */}
            <div className="card-nour p-4 space-y-3 shadow-soft">
              <p className="font-bold text-accent flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> إحصائيات الأسبوع
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-[10px] text-muted-foreground">إجمالي القراءة</p>
                  <p className="text-lg font-black text-blue-500">{stats.totalMinutes} د</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-[10px] text-muted-foreground">المتوسط اليومي</p>
                  <p className="text-lg font-black text-emerald-500">{stats.avgMinutes} د</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-[10px] text-muted-foreground">أفضل يوم</p>
                  <p className="text-lg font-black text-amber-500">{stats.bestDay} د</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                  <p className="text-[10px] text-muted-foreground">السلسلة</p>
                  <p className="text-lg font-black text-orange-500">
                    {stats.consecutiveDays} أيام
                  </p>
                </div>
              </div>

              {/* رسم بياني أسبوعي */}
              <div className="pt-2">
                <div className="flex items-end justify-between gap-1.5 h-32 px-1">
                  {history.map((d, i) => {
                    const isToday = i === history.length - 1;
                    const pct = (d.minutes / Math.max(1, stats.bestDay || 1)) * 100;
                    const completed = d.minutes >= profile.goalMinutes && profile.goalMinutes > 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                        title={`${d.date}: ${d.minutes} دقيقة`}
                      >
                        <div className="w-full bg-secondary/80 rounded-lg overflow-hidden flex items-end h-24">
                          <div
                            className={`w-full rounded-t-md transition-all duration-500 ${completed
                                ? "bg-gradient-to-t from-emerald-500 to-emerald-400"
                                : "bg-gradient-to-t from-blue-500 to-blue-400"
                              } ${isToday ? "ring-2 ring-accent" : ""}`}
                            style={{ height: `${Math.max(8, pct)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-foreground block">
                          {d.minutes}د
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {isToday ? "اليوم" : d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* زر الأوسمة والتحديات */}
            <button
              onClick={() => setShowBadges(true)}
              className="w-full p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm shadow-soft"
            >
              <Trophy className="w-5 h-5" /> عرض الأوسمة والإنجازات المكتسبة ({profile.name || "الطفل"})
            </button>
          </div>
        )}

        {/* ── التبويب 2: أهداف وإعدادات الطفل ── */}
        {activeTab === "goals" && (
          <div className="card-nour p-4 space-y-4 shadow-soft animate-fade-in">
            <div className="flex items-center gap-3 pb-3 border-b border-border/50">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${draft.color} p-0.5 shadow-md flex items-center justify-center overflow-hidden`}
              >
                <Avatar name={draft.avatar} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-extrabold text-base text-foreground">
                  تعديل ملف: {draft.name || "الطفل"}
                </p>
                <p className="text-xs text-muted-foreground">
                  رصيد النجوم: {formatCoins(draft.coins || 0)} ⭐
                </p>
              </div>
            </div>

            {/* الاسم */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                اسم الطفل
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-xl bg-secondary border border-border p-2.5 text-foreground font-bold focus:border-accent outline-none"
              />
            </div>

            {/* العمر */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border border-border/50">
              <div>
                <span className="block text-xs font-bold text-foreground">العمر</span>
                <span className="text-[10px] text-muted-foreground">
                  يساعد في تخصيص صعوبة الألعاب
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDraft({ ...draft, age: Math.max(3, draft.age - 1) })}
                  className="w-8 h-8 rounded-lg bg-card text-foreground flex items-center justify-center active:scale-95 border"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-black text-lg text-accent">
                  {draft.age}
                </span>
                <button
                  onClick={() => setDraft({ ...draft, age: Math.min(16, draft.age + 1) })}
                  className="w-8 h-8 rounded-lg bg-card text-foreground flex items-center justify-center active:scale-95 border"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* اختيار الأفاتار من شخصيات الأفاتار */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                شخصية الأفاتار المفضلة
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 border rounded-xl bg-secondary/30">
                {KID_AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setDraft({ ...draft, avatar: a })}
                    className={`w-11 h-11 rounded-xl p-0.5 transition-all flex items-center justify-center ${draft.avatar === a
                        ? "ring-2 ring-accent scale-110 bg-accent/20"
                        : "bg-card hover:bg-secondary"
                      }`}
                  >
                    <Avatar name={a} className="w-full h-full rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* سورة الحفظ الحالية للطفل */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/50 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-foreground">سورة الحفظ الحالية</span>
                  <span className="text-[10px] text-muted-foreground">
                    تحدد السورة التي يتدرب عليها الطفل ويخوض ألعابها
                  </span>
                </div>
                <span className="text-xs font-black text-accent bg-accent/15 px-2.5 py-1 rounded-full">
                  {SURAHS.find((s) => s.number === (draft.currentSurah || profile.currentSurah || 38))?.name || "سورة الشمس"}
                </span>
              </div>
              <select
                value={draft.currentSurah || profile.currentSurah || 38}
                onChange={(e) => setDraft({ ...draft, currentSurah: Number(e.target.value) })}
                className="w-full rounded-xl bg-card border border-border p-2.5 text-xs font-bold text-foreground focus:border-accent outline-none"
              >
                {SURAHS.map((s) => (
                  <option key={s.number} value={s.number}>
                    سورة {s.name} ({s.ayahCount} آية)
                  </option>
                ))}
              </select>
            </div>

            {/* رصيد نجوم الطفل مع إمكانية التعديل المباشر */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-amber-600 dark:text-amber-400">رصيد نجوم الطفل</span>
                  <span className="text-[10px] text-muted-foreground">
                    يمكنك تعديل رصيد النجوم المتاح للطفل في المتجر
                  </span>
                </div>
                <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" /> {formatCoins(draft.coins || 0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100000000}
                  value={draft.coins || 0}
                  onChange={(e) => setDraft({ ...draft, coins: Math.max(0, Number(e.target.value)) })}
                  className="flex-1 rounded-xl bg-card border border-border p-2.5 text-xs font-black text-foreground focus:border-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, coins: (draft.coins || 0) + 10000 })}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-500/30 transition-all shrink-0 active:scale-95"
                >
                  +10,000 ⭐
                </button>
              </div>
            </div>

            {/* دقائق القراءة اليومية لفتح الألعاب */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  دقائق القراءة المطلوبة لفتح الألعاب
                </label>
                <span className="text-xs font-black text-accent">
                  {draft.goalMinutes === 0 ? "مفتوحة دائماً (0د)" : `${draft.goalMinutes} دقيقة`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[0, 5, 10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDraft({ ...draft, goalMinutes: mins })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${draft.goalMinutes === mins
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-secondary text-muted-foreground border-border hover:border-accent/40"
                      }`}
                  >
                    {mins === 0 ? "مفتوحة دائماً" : `${mins} دقائق`}
                  </button>
                ))}
              </div>
            </div>

            {/* وقت اللعب المسموح */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  حد وقت اللعب اليومي المسموح
                </label>
                <span className="text-xs font-black text-accent">
                  {draft.playMinutes === 0 ? "بلا حد (مفتوح)" : `${draft.playMinutes} دقيقة`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[0, 15, 30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDraft({ ...draft, playMinutes: mins })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${draft.playMinutes === mins
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-secondary text-muted-foreground border-border hover:border-accent/40"
                      }`}
                  >
                    {mins === 0 ? "بلا حد" : `${mins} دقيقة`}
                  </button>
                ))}
              </div>
            </div>

            {/* عبارة المكافأة */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                رسالة المكافأة والتشجيع
              </label>
              <input
                type="text"
                value={draft.reward || ""}
                onChange={(e) => setDraft({ ...draft, reward: e.target.value })}
                placeholder="أحسنت يا بطل القرآن! استحققت وقتاً ممتعاً"
                className="w-full rounded-xl bg-secondary border border-border p-2.5 text-xs text-foreground focus:border-accent outline-none"
              />
            </div>

            <button
              onClick={saveChild}
              className="w-full p-3 rounded-xl btn-gold font-bold flex items-center justify-center gap-2 active:scale-95 shadow-md transition-all text-sm"
            >
              <Check className="w-5 h-5" /> حفظ تعديلات {draft.name || "الطفل"}
            </button>
          </div>
        )}

        {/* ── التبويب 3: المواعيد والجدول ── */}
        {activeTab === "schedule" && (
          <div className="card-nour p-4 space-y-4 shadow-soft animate-fade-in">
            {/* موعد الدرس اليومي */}
            <div className="space-y-2 pb-4 border-b border-border/50">
              <p className="font-bold text-accent flex items-center gap-2">
                <Bell className="w-4 h-4" /> تذكير الدرس القرآني اليومي
              </p>
              <p className="text-[11px] text-muted-foreground">
                يرسل التطبيق تنبيهاً تشجيعياً للطفل عند حلول هذا الوقت كل يوم للبدء في القراءة.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={profile.lessonTime || ""}
                  onChange={(e) => saveLesson(e.target.value)}
                  className="flex-1 rounded-xl bg-secondary border border-border p-2.5 text-foreground font-bold"
                />
                {profile.lessonTime && (
                  <button
                    onClick={() => saveLesson("")}
                    className="px-3.5 py-2.5 rounded-xl bg-destructive/15 text-destructive font-bold text-xs hover:bg-destructive/25 transition-colors"
                  >
                    إلغاء التذكير
                  </button>
                )}
              </div>
            </div>

            {/* جدول أوقات اللعب الصارم */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-accent flex items-center gap-2">
                    <Clock className="w-4 h-4" /> جدول أوقات اللعب الصارم
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    تحديد ساعات وأيام محددة يُسمح فيها بفتح ركن الألعاب.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const s = { ...schedule, enabled: !schedule.enabled };
                    setSchedule(s);
                    saveKidsSchedule(s);
                    toast({ title: s.enabled ? "✓ تم تفعيل جدول اللعب" : "تم تعطيل جدول اللعب" });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${schedule.enabled ? "bg-accent" : "bg-muted-foreground/30"
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${schedule.enabled ? "left-0.5" : "left-[26px]"
                      }`}
                  />
                </button>
              </div>

              {schedule.enabled && (
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/50 space-y-3 animate-fade-down">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-bold mb-1 block">
                        مسموح من الساعة:
                      </label>
                      <input
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) => {
                          const s = { ...schedule, startTime: e.target.value };
                          setSchedule(s);
                          saveKidsSchedule(s);
                        }}
                        className="w-full rounded-xl bg-card border border-border p-2 text-xs font-bold text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-bold mb-1 block">
                        إلى الساعة:
                      </label>
                      <input
                        type="time"
                        value={schedule.endTime}
                        onChange={(e) => {
                          const s = { ...schedule, endTime: e.target.value };
                          setSchedule(s);
                          saveKidsSchedule(s);
                        }}
                        className="w-full rounded-xl bg-card border border-border p-2 text-xs font-bold text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground font-bold mb-1.5 block">
                      الأيام المسموح فيها باللعب:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "الأحد",
                        "الإثنين",
                        "الثلاثاء",
                        "الأربعاء",
                        "الخميس",
                        "الجمعة",
                        "السبت",
                      ].map((day, idx) => {
                        const isAllowed = schedule.allowedDays.includes(idx);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              const days = isAllowed
                                ? schedule.allowedDays.filter((d) => d !== idx)
                                : [...schedule.allowedDays, idx];
                              const s = { ...schedule, allowedDays: days };
                              setSchedule(s);
                              saveKidsSchedule(s);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isAllowed
                                ? "bg-accent text-accent-foreground border-accent shadow-sm"
                                : "bg-card text-muted-foreground border-border hover:border-accent/40"
                              }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* نظام إشعارات التذكير الذكية */}
            <div className="space-y-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-accent flex items-center gap-2 text-xs sm:text-sm">
                    <Bell className="w-4 h-4" /> نظام إشعارات التذكير الذكية
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    تنبيه الطفل عند اقتراب انتهاء وقت اللعب، وتذكيره اليومي بالقرآن الكريم
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/40 text-xs">
                  <span className="font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" /> تنبيه اقتراب نفاد وقت اللعب (قبل 5 دقائق)
                  </span>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-full">مفعّل دائماً ✓</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/40 text-xs">
                  <span className="font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-500" /> إشعار إتمام الورد وفتح الألعاب
                  </span>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-full">مفعّل دائماً ✓</span>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const granted = await requestNotificationPermission();
                    await showLocalNotification("تذكير القرآن الكريم 🌟", "هذا إشعار تجريبي ناجح! نظام التذكيرات يعمل بامتياز على جهازك.");
                    toast({ title: "🔔 تم إرسال إشعار التذكير بنجاح!", description: granted ? "يعمل بإشعارات النظام" : "يعمل بتنبيهات التطبيق" });
                  }}
                  className="w-full p-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all border border-accent/30"
                >
                  <Bell className="w-4 h-4" />
                  <span>تجربة إرسال إشعار تذكير الآن 🔔</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── التبويب 4: مكتبة الألعاب ── */}
        {activeTab === "games" && (
          <div className="card-nour p-4 space-y-4 shadow-soft animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div>
                <p className="font-extrabold text-base text-foreground flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-accent" /> مكتبة ألعاب الطفل
                </p>
                <p className="text-xs text-muted-foreground">
                  التحكم في الألعاب المسموحة وإعادة قفلها لتشجيع الطفل على القراءة
                </p>
              </div>
              <span className="text-xs font-bold bg-accent/15 text-accent px-3 py-1 rounded-full">
                {catalog.length} لعبة متاحة
              </span>
            </div>

            {/* أزرار التحكم الجماعي في الألعاب */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  catalog.forEach((g) => setGameCost(g.id, 0));
                  refresh();
                  toast({
                    title: "🎉 تم فتح جميع الألعاب مجاناً!",
                    description: "جميع الألعاب متاحة الآن دون الحاجة لنجوم.",
                  });
                }}
                className="p-3 rounded-2xl bg-success/15 border border-success/30 text-success font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" /> فتح كل الألعاب مجاناً (0 نجمة)
              </button>

              <button
                onClick={() => {
                  resetGamePrices();
                  refresh();
                  toast({
                    title: "🔒 تمت استعادة أسعار الألعاب الأصلية",
                    description: "عادت الألعاب لقفل النجوم لتشجيع الطفل على القراءة.",
                  });
                }}
                className="p-3 rounded-2xl bg-secondary border border-border text-foreground font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> استعادة أسعار الألعاب الأصلية
              </button>
            </div>

            {/* قائمة الألعاب الفردية */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
              {catalog.map((g) => (
                <div
                  key={g.id}
                  className="p-3 rounded-2xl bg-secondary/50 border border-border/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                      <Gamepad2 className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="font-bold text-xs text-foreground">{g.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {g.cost === 0 ? "مجانية مفتوحة" : `${formatCoins(g.cost)} نجمة للفتح`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const newCost = g.cost === 0 ? 25 : 0;
                        setGameCost(g.id, newCost);
                        refresh();
                        toast({
                          title:
                            newCost === 0
                              ? `فُتحت لعبة «${g.title}» مجاناً`
                              : `أُعيد قفل لعبة «${g.title}» بالنجوم`,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${g.cost === 0
                          ? "bg-success/20 text-success border border-success/30"
                          : "bg-accent/15 text-accent border border-accent/30"
                        }`}
                    >
                      {g.cost === 0 ? "✓ مجانية" : "🔒 مقفلة"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── التبويب 5: الأمان والأوضاع ── */}
        {activeTab === "security" && (
          <div className="space-y-4 animate-fade-in">
            {/* بطاقة التحكم في أوضاع التطبيق */}
            <div className="card-nour p-4 space-y-3 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="font-bold text-accent flex items-center gap-2">
                  <Sliders className="w-4 h-4" /> أوضاع التطبيق ونظام التنقل
                </p>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  اختر النمط المناسب لك ولعائلتك
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. وضع التنقل المرن */}
                <button
                  onClick={() => handleModeChange("flexible")}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${!pureMode && !kidsLocked
                      ? "border-accent bg-accent/15 ring-2 ring-accent shadow-md"
                      : "border-border/60 bg-card hover:border-accent/40"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    {!pureMode && !kidsLocked && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                        النشط الآن
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">وضع التنقل المرن</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      تلاوات مع بقاء ركن الأطفال والمتجر متاحاً وسهل الوصول للجميع.
                    </p>
                  </div>
                </button>

                {/* 2. وضع الأطفال المقفل */}
                <button
                  onClick={() => handleModeChange("kids")}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${kidsLocked
                      ? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500 shadow-md"
                      : "border-border/60 bg-card hover:border-amber-500/40"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </span>
                    {kidsLocked && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-black">
                        النشط الآن
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">وضع الأطفال المقفل</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      قفل صارم برمز PIN. يمنع الطفل من الخروج للأقسام الأخرى.
                    </p>
                  </div>
                </button>

                {/* 3. الوضع الهادئ للكبار */}
                <button
                  onClick={() => handleModeChange("pure")}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${pureMode
                      ? "border-blue-500 bg-blue-500/15 ring-2 ring-blue-500 shadow-md"
                      : "border-border/60 bg-card hover:border-blue-500/40"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                      <Headphones className="w-4 h-4" />
                    </span>
                    {pureMode && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500 text-white">
                        النشط الآن
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">الوضع الهادئ (تلاوات فقط)</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      إخفاء ركن الأطفال بالكامل وتخصيص الواجهة لتلاوة وسماع القرآن للكبار.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* إعدادات رمز مرور ولي الأمر (PIN) */}
            <div className="card-nour p-4 space-y-3 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="font-bold text-accent flex items-center gap-2">
                  <KeyRound className="w-4 h-4" /> رمز حماية ولي الأمر (PIN)
                </p>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${hasKidsPin()
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                    }`}
                >
                  {hasKidsPin() ? "✓ الرمز مفعّل" : "غير مفعّل"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                يستخدم رمز المرور لحماية إعدادات التطبيق ومنع الأطفال من الخروج من وضع الأطفال المقفل.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => setShowPinDialog(true)}
                  className="p-2.5 px-4 rounded-xl btn-gold text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  {hasKidsPin() ? "تغيير رمز المرور" : "تعيين رمز مرور جديد"}
                </button>

                {hasKidsPin() && (
                  <button
                    onClick={() => {
                      if (!window.confirm("هل أنت متأكد من إزالة رمز ولي الأمر؟")) return;
                      removeKidsPin();
                      refresh();
                      toast({ title: "تمت إزالة رمز المرور" });
                    }}
                    className="p-2.5 px-3 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25 text-xs font-bold transition-colors active:scale-95"
                  >
                    إزالة الرمز
                  </button>
                )}
              </div>
            </div>

            {/* دعم فني وتواصل مباشر مع المشرف */}
            <div className="card-nour p-4 space-y-3 shadow-soft border border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-accent flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> الدعم الفني والمساعدة لولي الأمر
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    تواصل مباشرة مع المشرفين لإرسال بلاغ أو اقتراح يصل إلى بريد (hammoualiyoucef20@gmail.com)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => setShowSupportModal(true)}
                  className="p-2.5 px-4 rounded-xl bg-accent/15 border border-accent/30 text-accent font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <MessageSquare className="w-4 h-4" /> فتح نافذة المراسلة والبلاغات
                </button>
                <a
                  href="mailto:hammoualiyoucef20@gmail.com?subject=%D8%AF%D8%B9%D9%85%20%D9%84%D9%88%D8%AD%D8%A9%20%D8%AA%D8%AD%D9%83%D9%85%20%D9%88%D9%84%D9%8A%20%D8%A7%D9%84%D8%A3%D9%85%D8%B1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 px-4 rounded-xl bg-secondary border border-border text-foreground font-bold text-xs flex items-center gap-1.5 hover:bg-secondary/80 active:scale-95 transition-all"
                >
                  <Mail className="w-4 h-4 text-accent" /> إرسال إيميل مباشر (Gmail)
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* نافذة إضافة طفل جديد */}
      {showAddChild && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
          dir="rtl"
          onClick={() => setShowAddChild(false)}
        >
          <div
            className="relative w-full max-w-sm glass-nour shadow-2xl p-5 space-y-4 rounded-3xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-gradient-gold">إضافة طفل جديد</h3>
              <button
                onClick={() => setShowAddChild(false)}
                className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${newKid.color} flex items-center justify-center shadow-lg overflow-hidden`}
              >
                <Avatar name={newKid.avatar} className="w-full h-full object-cover" />
              </div>
              <input
                value={newKid.name}
                onChange={(e) => setNewKid({ ...newKid, name: e.target.value })}
                placeholder="اسم الطفل (مثال: يوسف، سارة)"
                autoFocus
                className="w-full text-center rounded-xl bg-secondary border border-border px-3 py-2 text-foreground font-bold focus:border-accent outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">العمر</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewKid({ ...newKid, age: Math.max(3, newKid.age - 1) })}
                  className="w-8 h-8 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-black text-lg text-accent">
                  {newKid.age}
                </span>
                <button
                  onClick={() => setNewKid({ ...newKid, age: Math.min(16, newKid.age + 1) })}
                  className="w-8 h-8 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <span className="block text-[11px] text-muted-foreground mb-1.5 font-bold">
                اختر شخصية الأفاتار:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border rounded-xl bg-secondary/40">
                {KID_AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setNewKid({ ...newKid, avatar: a })}
                    className={`w-10 h-10 rounded-xl p-0.5 transition-all flex items-center justify-center ${newKid.avatar === a
                        ? "ring-2 ring-accent scale-105 bg-accent/20"
                        : "bg-card hover:bg-secondary"
                      }`}
                  >
                    <Avatar name={a} className="w-full h-full rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={createChild}
              className="w-full btn-gold py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 shadow-md"
            >
              <Check className="w-5 h-5" /> إنشاء ملف الطفل
            </button>
          </div>
        </div>
      )}

      {/* نافذة تعيين رمز PIN وسؤال الأمان */}
      {showPinDialog && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          dir="rtl"
          onClick={() => setShowPinDialog(false)}
        >
          <div
            className="w-full max-w-sm glass-nour p-5 rounded-3xl shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-gradient-gold flex items-center gap-1.5">
                <KeyRound className="w-5 h-5 text-accent" /> رمز حماية ولي الأمر
              </h3>
              <button
                onClick={() => setShowPinDialog(false)}
                className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                أدخل رمز المرور المكون من 4 أرقام:
              </label>
              <input
                type="password"
                maxLength={4}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                autoFocus
                className="w-full text-center tracking-[1em] text-2xl font-black rounded-xl bg-secondary border border-border p-3 text-foreground focus:border-accent outline-none"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-accent" /> السؤال السري للاسترجاع (عند نسيان
                الرمز):
              </label>
              <select
                value={secQuestion}
                onChange={(e) => setSecQuestionState(e.target.value)}
                className="w-full rounded-xl bg-secondary border border-border p-2 text-xs text-foreground font-medium"
              >
                {DEFAULT_SECURITY_QUESTIONS.map((q, idx) => (
                  <option key={idx} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={secAnswer}
                onChange={(e) => setSecAnswer(e.target.value)}
                placeholder="إجابتك السرية..."
                className="w-full rounded-xl bg-secondary border border-border p-2 text-xs text-foreground focus:border-accent outline-none"
              />
            </div>

            <button
              onClick={saveNewPin}
              className="w-full btn-gold py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 shadow-md text-sm"
            >
              <Check className="w-4 h-4" /> حفظ الرمز وتفعيله
            </button>
          </div>
        </div>
      )}

      {/* نافذة الأوسمة والإنجازات */}
      {showBadges && <BadgesModal onClose={() => setShowBadges(false)} />}

      {/* نافذة الدعم الفني والمساعدة */}
      {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}
    </div>
  );
}
