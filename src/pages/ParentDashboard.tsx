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
import { showLocalNotification, requestNotificationPermission, saveReminderSettings } from "../utils/notifications";
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
import { getGameCatalog, type GameDef } from "../data/gameCatalog";
import Avatar from "../components/Avatar";
import BadgesModal from "../components/BadgesModal";
import ParentalGateModal from "../components/ParentalGateModal";
import SupportModal from "../components/SupportModal";
import WhatsAppIcon from "../components/WhatsAppIcon";
import {
  getLocalSupportMessages,
  deleteLocalSupportMessage,
  clearLocalSupportMessages,
  SupportReportData,
  createWhatsAppSupportLink,
  openWhatsAppSupport,
  SUPPORT_WHATSAPP_DISPLAY,
} from "../services/resendService";

type DashboardTab = "overview" | "goals";

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
  const [showGateCheck, setShowGateCheck] = useState(() => isKidsMode() && hasKidsPin());
  const [inboxMessages, setInboxMessages] = useState<SupportReportData[]>(getLocalSupportMessages);

  useEffect(() => {
    const handleInboxUpdate = () => setInboxMessages(getLocalSupportMessages());
    window.addEventListener("mushaf:support_inbox_updated", handleInboxUpdate);
    return () => window.removeEventListener("mushaf:support_inbox_updated", handleInboxUpdate);
  }, []);

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
  const saveLesson = async (t: string) => {
    updateProfile(profile.id, { lessonTime: t });
    saveReminderSettings({ dailyLessonTime: t || "17:00", dailyLessonEnabled: !!t });
    refresh();
    if (t) {
      void requestNotificationPermission();
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
              onClick={() => {
                void openWhatsAppSupport();
                toast({
                  title: "جاري فتح واتساب الدعم الفني 💬",
                  description: `مراسلة فورية مباشرة على الرقم (${SUPPORT_WHATSAPP_DISPLAY})`,
                });
              }}
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-black active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title={`تواصل مع الدعم الفني عبر واتساب (${SUPPORT_WHATSAPP_DISPLAY})`}
            >
              <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
              <span className="hidden sm:inline">واتساب {SUPPORT_WHATSAPP_DISPLAY}</span>
              <span className="sm:hidden">واتساب</span>
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
            <span>الإعدادات والأهداف</span>
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

            {/* --- ركن الجدول الزمني --- */}
            <div className="pt-2 mt-2 border-t border-border/50">
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
              <div className="space-y-3 pt-3">
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
                                  : "bg-secondary text-muted-foreground border-border hover:border-accent/40"
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
                    await showLocalNotification(
                      "تذكير القرآن الكريم 🌟",
                      "هذا إشعار تجريبي ناجح! نظام التذكيرات يعمل بامتياز بنغمة هادئة وتنبيه مباشر."
                    );
                    if (!granted) {
                      toast({
                        title: "تنبيه صلاحيات النظام ℹ️",
                        description: "يعمل بتنبيهات التطبيق، ويمكنك السماح بالإشعارات من إعدادات النظام لتظهر على سطح المكتب أو الهاتف.",
                      });
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all border border-accent/30"
                >
                  <Bell className="w-4 h-4" />
                  <span>تجربة إرسال إشعار تذكير الآن 🔔</span>
                </button>
              </div>
            </div>

            {/* استيراد كود التكوين للمطور */}
            <div className="space-y-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-accent flex items-center gap-2 text-xs sm:text-sm">
                    <KeyRound className="w-4 h-4" /> استيراد كود المطور
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    أدخل الكود المستخرج من أداة المطور الخارجية لتحديث النجوم والعناصر.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  id="dev-code-input"
                  placeholder="الصق الكود هنا..."
                  className="flex-1 rounded-xl bg-secondary border border-border p-2.5 text-xs text-foreground focus:border-accent outline-none" 
                />
                <button
                  type="button"
                  onClick={() => {
                     const input = document.getElementById('dev-code-input') as HTMLInputElement;
                     if (!input.value) return;
                     try {
                        const payload = JSON.parse(decodeURIComponent(escape(atob(input.value))));
                        if (payload.type === 'DEV_TOOL_UPDATE') {
                           if (payload.coins !== undefined) {
                              setCoins(payload.coins);
                           }
                           if (payload.items && Array.isArray(payload.items)) {
                              const currProf = getProfile();
                              updateProfile(currProf.id, { inventory: Array.from(new Set([...(currProf.inventory || []), ...payload.items])) });
                           }
                           refresh();
                           toast({ title: '✓ تم استيراد وتحديث البيانات بنجاح!' });
                           input.value = '';
                        }
                     } catch(e) {
                        toast({ title: 'كود غير صالح', variant: 'destructive' });
                     }
                  }}
                  className="px-3 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-xs flex items-center gap-1 hover:bg-accent/90"
                >
                  <Check className="w-3.5 h-3.5" /> تطبيق
                </button>
              </div>
            </div>

            <button
              onClick={saveChild}
              className="w-full p-3 rounded-xl btn-gold font-bold flex items-center justify-center gap-2 active:scale-95 shadow-md transition-all text-sm mt-4"
            >
              <Check className="w-5 h-5" /> حفظ تعديلات {draft.name || "الطفل"}
            </button>
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
