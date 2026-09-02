import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Bell, Baby, Check, Gift, Plus, Trash2, Minus, Star, X, TrendingUp, Award, Zap, Target, Trophy } from "lucide-react";
import AppFooter from "../components/AppFooter";
import { getProfile, updateProfile, getProgress, getHistory, getProfiles, getActiveId, setActiveProfile, addProfile, removeProfile, getAppMode, setAppMode, kidsRouteBlocked, KID_AVATARS, KID_COLORS, KidsProfile, KidsProgress, DayLog } from "../data/kidsProfile";
import { getKidsSchedule, saveKidsSchedule, KidsSchedule } from "../data/kidsSchedule";
import { isKidsMode, setKidsLocked } from "../data/kidsLock";
import { calculateStreak } from "../data/kidsBadges";
import Avatar from "../components/Avatar";
import BadgesModal from "../components/BadgesModal";
import { toast } from "../hooks/use-toast";

const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="h-2.5 rounded-full bg-secondary overflow-hidden"><div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} /></div>
);

// إحصائيات متقدمة
const StatCard = ({ icon: Icon, title, value, trend, color }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; title: string; value: string | number; trend?: string; color: string }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br ${color} border border-border/40 shadow-soft`}>
    <div className="p-2 rounded-lg bg-black/10"><Icon className="w-5 h-5" /></div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-extrabold text-foreground">{value}</p>
      {trend && <p className="text-[10px] text-success flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> {trend}</p>}
    </div>
  </div>
);

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<KidsProfile[]>(getProfiles);
  const [activeId, setActiveId] = useState<string>(getActiveId);
  const [profile, setProfile] = useState<KidsProfile>(getProfile);
  const getFullHistory = (): DayLog[] => {
    // getHistory() تُرجع السجل تنازلياً (الأحدث في البداية عبر unshift)
    // نعيد ترتيبه تصاعدياً (الأقدم أولاً) ليكون عدُّ الأيام المتتالية صحيحاً
    const past = getHistory();
    const cur = getProgress();
    const todayDate = cur.date || new Date().toISOString().split("T")[0];
    const pastFiltered = past.filter(d => d.date !== todayDate).slice().reverse();
    const todayLog: DayLog = {
      date: todayDate,
      minutes: cur.minutes || 0,
      played: cur.played || 0,
    };
    return [...pastFiltered, todayLog].slice(-7);
  };

  const [history, setHistory] = useState<DayLog[]>(getFullHistory);
  const [progress, setProgress] = useState<KidsProgress>(getProgress);
  const [draft, setDraft] = useState<KidsProfile>(getProfile);
  const [showAdd, setShowAdd] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [newKid, setNewKid] = useState({ name: "", age: 6, avatar: KID_AVATARS[0], color: KID_COLORS[0] });
  const [schedule, setSchedule] = useState<KidsSchedule>(getKidsSchedule);

  useEffect(() => { if (isKidsMode()) navigate("/games"); }, [navigate]);
  useEffect(() => { if (kidsRouteBlocked()) navigate("/audio", { replace: true }); }, [navigate]);

  const refresh = () => {
    setProfiles(getProfiles());
    setActiveId(getActiveId());
    setProfile(getProfile());
    setDraft(getProfile());
    setProgress(getProgress());
    setHistory(getFullHistory());
  };

  useEffect(() => {
    refresh();
    const evts = ["focus", "mushaf:games_unlocked", "mushaf:coins", "mushaf:activeprofile", "mushaf:reading_progress"];
    evts.forEach(e => window.addEventListener(e, refresh));
    return () => evts.forEach(e => window.removeEventListener(e, refresh));
  }, []);

  // حساب الإحصائيات المتقدمة الشاملة لدقائق الدراسة اليومية
  const totalMins = Math.round(history.reduce((a, d) => a + d.minutes, 0) * 10) / 10;
  const activeDays = history.filter(d => d.minutes > 0);
  const stats = {
    totalMinutes: totalMins,
    avgMinutes: activeDays.length > 0 ? Math.round(totalMins / activeDays.length) : (history.length > 0 ? Math.round(totalMins / history.length) : 0),
    bestDay: Math.max(0, ...history.map(d => d.minutes)),
    consecutiveDays: calculateStreak().currentStreak,
    thisWeekReading: totalMins,
    completedDays: history.filter(d => d.minutes >= profile.goalMinutes && profile.goalMinutes > 0).length,
    percentComplete: Math.min(100, Math.round((progress.minutes / Math.max(1, profile.goalMinutes)) * 100)),
  };
  const playPct = Math.min(100, Math.round(((progress.played || 0) / Math.max(1, profile.playMinutes || 1)) * 100));

  // يحفظ الحقول القابلة للتحرير فقط (دمج فوق التخزين الحيّ) حتى لا تُمحى النجوم/المخزون/وقت الدرس
  const saveChild = () => {
    updateProfile(draft.id, { name: draft.name, avatar: draft.avatar, color: draft.color, age: draft.age, goalMinutes: draft.goalMinutes, playMinutes: draft.playMinutes, reward: draft.reward });
    const np = getProfile(); setProfile(np); setDraft(np); setProfiles(getProfiles());
    toast({ title: "حُفظت إعدادات الطفل" });
  };

  const maxHist = Math.max(profile.goalMinutes, ...history.map(h => h.minutes), 1);

  const switchTo = (id: string) => { setActiveProfile(id); refresh(); };
  const openAdd = () => { setNewKid({ name: "", age: 6, avatar: KID_AVATARS[0], color: KID_COLORS[0] }); setShowAdd(true); };
  const createChild = () => {
    const name = newKid.name.trim();
    if (!name) { toast({ title: "اكتب اسم الطفل", variant: "destructive" }); return; }
    const p = addProfile({ name, age: newKid.age, avatar: newKid.avatar, color: newKid.color });
    setActiveProfile(p.id);
    if (getAppMode() === "parent") setAppMode("kids");   // تفعيل ركن الأطفال عند إضافة أوّل طفل
    setShowAdd(false);
    refresh();
    toast({ title: `أُضيف ${name}` });
  };
  const delChild = (id: string, name: string) => {
    if (!window.confirm(`حذف ملفّ ${name || "الطفل"} وكل تقدّمه؟`)) return;
    removeProfile(id);
    refresh();
    toast({ title: "حُذف الملفّ" });
  };

  const saveLesson = (t: string) => {
    updateProfile(profile.id, { lessonTime: t });
    const np = getProfile(); setProfile(np); setDraft(np);
    if (t && typeof Notification !== "undefined" && Notification.permission === "default") { Notification.requestPermission().catch(() => {}); }
    toast({ title: t ? `تذكير الدرس الساعة ${t}` : "أُلغي تذكير الدرس" });
  };

  return (
    <div className="min-h-screen page-nour text-foreground" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-3">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/settings")} className="flex h-10 items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-4 text-sm font-bold hover:brightness-95 active:scale-95"><ArrowRight className="h-4 w-4" /> رجوع</button>
          <h1 className="font-extrabold text-lg text-gradient-gold">لوحة ولي الأمر</h1>
          <span className="w-16" />
        </header>

        {/* الأطفال — اختر طفلاً لعرض تقدّمه، أو أضِف/احذف */}
        <div className="card-nour p-3 space-y-2 shadow-soft animate-fade-up">
          <p className="font-bold text-accent text-sm">الأطفال</p>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            {profiles.map(p => (
              <div key={p.id} className="relative shrink-0">
                <button onClick={() => switchTo(p.id)}
                  className={`w-20 flex flex-col items-center gap-1 rounded-xl p-2 border transition-all ${p.id === activeId ? "border-accent bg-accent/15" : "border-border bg-muted"}`}>
                  <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center`}><Avatar name={p.avatar} className="w-6 h-6 text-white" /></span>
                  <span className="text-[11px] font-bold truncate w-full text-center">{p.name || "طفلي"}</span>
                </button>
                {profiles.length > 1 && (
                  <button onClick={() => delChild(p.id, p.name)} className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow active:scale-90"><Trash2 className="w-3 h-3" /></button>
                )}
              </div>
            ))}
            <button onClick={openAdd} className="w-20 shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl p-2 border border-dashed border-border bg-muted hover:border-accent/50 active:scale-95 transition-colors">
              <span className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center"><Plus className="w-6 h-6 text-accent" /></span>
              <span className="text-[11px] font-bold text-muted-foreground">إضافة</span>
            </button>
          </div>
        </div>

        {/* إعدادات الطفل النشِط — المكان الوحيد لضبط إعدادات الطفل */}
        <div className="card-nour p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${draft.color} flex items-center justify-center`}><Avatar name={draft.avatar} className="w-6 h-6 text-white" /></span>
            <p className="font-bold text-accent">إعدادات {draft.name || "الطفل"}</p>
            {(draft.coins ?? 0) > 0 && <span className="ml-auto inline-flex items-center gap-1 text-accent font-bold text-sm"><Star className="w-4 h-4 fill-accent" /> {draft.coins}</span>}
          </div>

          <label className="block text-sm font-bold text-muted-foreground">الاسم
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="w-full mt-1 rounded-lg bg-secondary border border-border p-2 text-foreground font-normal" />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {KID_AVATARS.map(a => (
              <button key={a} onClick={() => setDraft({ ...draft, avatar: a })} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${draft.avatar === a ? "bg-accent/30 ring-2 ring-accent text-accent" : "bg-muted text-muted-foreground"}`}><Avatar name={a} className="w-5 h-5" /></button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">العمر (يحدّد الألعاب المناسبة)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setDraft({ ...draft, age: Math.max(3, draft.age - 1) })} className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center font-extrabold text-lg text-accent">{draft.age}</span>
              <button onClick={() => setDraft({ ...draft, age: Math.min(15, draft.age + 1) })} className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          <label className="block text-xs font-bold text-muted-foreground">دقائق القراءة لفتح الألعاب
            <input type="number" min={0} max={120} value={draft.goalMinutes} onChange={e => setDraft({ ...draft, goalMinutes: parseInt(e.target.value, 10) || 0 })} className="w-full mt-1 rounded-lg bg-secondary border border-border p-2 text-foreground font-normal" />
          </label>

          <label className="block text-xs font-bold text-muted-foreground mt-2">وقت اللعب المسموح (بالدقائق، ٠ = بلا حد)
            <input type="number" min={0} max={120} value={draft.playMinutes} onChange={e => setDraft({ ...draft, playMinutes: parseInt(e.target.value, 10) || 0 })} className="w-full mt-1 rounded-lg bg-secondary border border-border p-2 text-foreground font-normal" />
          </label>

          <label className="block text-sm font-bold text-muted-foreground">المكافأة (تظهر عند فتح الألعاب)
            <input value={draft.reward} onChange={e => setDraft({ ...draft, reward: e.target.value })} className="w-full mt-1 rounded-lg bg-secondary border border-border p-2 text-foreground font-normal" />
          </label>
          <p className="text-[11px] text-muted-foreground leading-relaxed">دقائق القراءة = الهدف اليومي لفتح الألعاب (٠ = مفتوحة دائماً). بعد الفتح يلعب الطفل بحرّية.</p>

          <button onClick={saveChild} className="w-full p-2.5 rounded-xl btn-gold font-bold flex items-center justify-center gap-1 active:scale-95"><Check className="w-4 h-4" /> حفظ إعدادات الطفل</button>
        </div>

        {/* الإحصائيات المتقدمة */}
        <div className="card-nour p-4 space-y-3">
          <p className="font-bold text-accent flex items-center gap-2"><TrendingUp className="w-4 h-4" /> إحصائيات هذا الأسبوع</p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={BookOpen} title="إجمالي الدقائق" value={stats.totalMinutes} trend={`+${Math.max(0, stats.avgMinutes - (history[history.length - 2]?.minutes || 0))} أمس`} color="from-blue-500/20 to-blue-600/20" />
            <StatCard icon={Target} title="المتوسط اليومي" value={`${stats.avgMinutes}د`} trend={stats.consecutiveDays > 0 ? `${stats.consecutiveDays} أيام متتالية` : "عدم الاستمرار"} color="from-emerald-500/20 to-emerald-600/20" />
            <StatCard icon={Star} title="أفضل يوم" value={`${stats.bestDay}د`} trend="هذا الأسبوع" color="from-amber-500/20 to-amber-600/20" />
            <StatCard icon={Award} title="الأيام المكتملة" value={stats.completedDays} trend={`من ${history.length}`} color="from-purple-500/20 to-purple-600/20" />
          </div>
        </div>

        {/* اليوم الحالي - محسّن */}
        <div className="card-nour p-4 space-y-3">
          <p className="font-bold text-accent flex items-center gap-2"><Zap className="w-4 h-4" /> اليوم</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground"><BookOpen className="w-4 h-4" /> القراءة</span>
              <span className="text-foreground font-bold">{stats.percentComplete}%</span>
            </div>
            <Bar value={progress.minutes} max={profile.goalMinutes} color="bg-gradient-to-r from-blue-500 to-emerald-500" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.minutes} دقيقة</span>
              <span>هدف: {profile.goalMinutes} دقيقة</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
            <Gift className={`w-5 h-5 ${progress.unlocked ? "text-success" : "text-muted-foreground"}`} />
            <span className={progress.unlocked ? "text-success font-bold" : "text-muted-foreground"}>{progress.unlocked ? "✓ الألعاب مفتوحة" : "✗ الألعاب مقفلة"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-4 h-4" /> اللعب</span>
            <span className="text-foreground font-bold">{playPct}%</span>
          </div>
          <Bar value={progress.played || 0} max={profile.playMinutes || 1} color="bg-gradient-to-r from-red-500 to-rose-500" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.played || 0} دقيقة</span>
            <span>حد: {profile.playMinutes > 0 ? `${profile.playMinutes} دقيقة` : "بلا حد"}</span>
          </div>
        </div>

        {/* تقرير الأسبوع مع رسوم بيانية أفضل */}
        <div className="card-nour p-4">
          <p className="font-bold text-accent mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" /> تقرير القراءة الأسبوعي</p>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">لا سجلّ بعد — سيظهر تقدّم الأيام السابقة هنا.</p>
          ) : (
            <div className="space-y-2">
              {/* الرسم البياني العمودي */}
              <div className="flex items-end justify-between gap-2 h-40 px-1">
                {history.map((d, i) => {
                  const isToday = i === history.length - 1;
                  const percentage = (d.minutes / Math.max(1, stats.bestDay)) * 100;
                  const completed = d.minutes >= profile.goalMinutes;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group cursor-help" title={`${d.date}: ${d.minutes} دقيقة`}>
                      <div className="w-full bg-secondary rounded-md overflow-hidden flex items-end transition-all group-hover:bg-secondary/60" style={{ height: "100px", minHeight: "100%" }}>
                        <div 
                          className={`w-full transition-all duration-300 rounded-t-sm ${completed ? "bg-gradient-to-t from-emerald-500 to-emerald-400" : "bg-gradient-to-t from-blue-500 to-blue-400"} ${isToday ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`} 
                          style={{ height: `${Math.max(5, percentage)}%` }} 
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-foreground block">{d.minutes}د</span>
                        <span className="text-[9px] text-muted-foreground">{isToday ? "اليوم" : (d.date.includes("-") ? d.date.slice(5) : d.date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* مؤشرات النجاح */}
              <div className="flex items-center gap-2 text-xs mt-4 pt-3 border-t border-border">
                <span className="flex items-center gap-1 text-emerald-500"><div className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-500 to-emerald-400" /> مكتمل</span>
                <span className="flex items-center gap-1 text-blue-500"><div className="w-3 h-3 rounded-sm bg-gradient-to-t from-blue-500 to-blue-400" /> لم يكتمل</span>
              </div>
            </div>
          )}
        </div>

        {/* تذكير الدرس وجدول اللعب */}
        <div className="card-nour p-4 space-y-4">
          <div className="space-y-2">
            <p className="font-bold text-accent flex items-center gap-2"><Bell className="w-4 h-4" /> تذكير الدرس اليومي</p>
            <div className="flex items-center gap-2">
              <input type="time" value={profile.lessonTime} onChange={e => saveLesson(e.target.value)} className="flex-1 rounded-lg bg-secondary border border-border p-2 text-foreground" />
              {profile.lessonTime && <button onClick={() => saveLesson("")} className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-bold">إلغاء</button>}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1"><Clock className="w-3 h-3" /> يظهر تنبيه عند الوقت المحدّد أثناء فتح التطبيق.</p>
          </div>

          <div className="pt-4 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-accent flex items-center gap-2"><Clock className="w-4 h-4" /> جدول اللعب (الألعاب)</p>
              <button 
                onClick={() => { const s = { ...schedule, enabled: !schedule.enabled }; setSchedule(s); saveKidsSchedule(s); toast({ title: s.enabled ? "تم تفعيل الجدول" : "تم إيقاف الجدول" }); }}
                className={`w-11 h-6 rounded-full transition-colors relative ${schedule.enabled ? 'bg-accent' : 'bg-muted-foreground/30'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${schedule.enabled ? 'left-0.5' : 'left-[22px]'}`} />
              </button>
            </div>
            
            {schedule.enabled && (
              <div className="space-y-3 animate-fade-down">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-bold mb-1 block">من الساعة</label>
                    <input type="time" value={schedule.startTime} onChange={e => { const s = { ...schedule, startTime: e.target.value }; setSchedule(s); saveKidsSchedule(s); }} className="w-full rounded-lg bg-secondary border border-border p-2 text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground font-bold mb-1 block">إلى الساعة</label>
                    <input type="time" value={schedule.endTime} onChange={e => { const s = { ...schedule, endTime: e.target.value }; setSchedule(s); saveKidsSchedule(s); }} className="w-full rounded-lg bg-secondary border border-border p-2 text-sm text-foreground" />
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold mb-1 block">الأيام المسموحة</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((day, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          const days = schedule.allowedDays.includes(idx) 
                            ? schedule.allowedDays.filter(d => d !== idx)
                            : [...schedule.allowedDays, idx];
                          const s = { ...schedule, allowedDays: days };
                          setSchedule(s); saveKidsSchedule(s);
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${schedule.allowedDays.includes(idx) ? 'bg-accent text-accent-foreground border-accent' : 'bg-secondary text-muted-foreground border-transparent'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1">لن يتمكن الطفل من الدخول لركن الألعاب خارج هذه الأوقات.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowBadges(true)}
            className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
          >
            <Trophy className="w-4 h-4" /> الأوسمة وسلسلة الأيام
          </button>
          <button
            onClick={() => {
              setKidsLocked(true);
              navigate("/games");
            }}
            className="p-3 rounded-2xl bg-secondary text-secondary-foreground hover:brightness-95 font-bold flex items-center justify-center gap-2 active:scale-95 text-xs"
          >
            <Baby className="w-4 h-4" /> فتح ركن الألعاب
          </button>
        </div>
      </div>

      {showBadges && <BadgesModal onClose={() => setShowBadges(false)} />}

      {/* إنشاء ملفّ طفل جديد — نموذج أنيق بدل نافذة المتصفّح */}
      {showAdd && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4 animate-fade-in" dir="rtl" onClick={() => setShowAdd(false)}>
          <div className="relative w-full max-w-sm glass-nour shadow-soft p-5 space-y-4 overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
            <div aria-hidden className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-gradient-gold">طفل جديد</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="relative flex flex-col items-center gap-2">
              <span className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${newKid.color} flex items-center justify-center shadow-lg`}><Avatar name={newKid.avatar} className="w-10 h-10 text-white" /></span>
              <input value={newKid.name} onChange={e => setNewKid({ ...newKid, name: e.target.value })} placeholder="اسم الطفل" autoFocus
                className="w-full text-center rounded-xl bg-muted border border-border px-3 py-2 text-foreground font-bold placeholder-muted-foreground focus:border-accent outline-none transition-colors" />
            </div>

            <div className="relative flex items-center justify-between">
              <span className="text-sm text-muted-foreground">العمر</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setNewKid({ ...newKid, age: Math.max(3, newKid.age - 1) })} className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95"><Minus className="w-4 h-4" /></button>
                <span className="w-8 text-center font-extrabold text-lg text-accent">{newKid.age}</span>
                <button onClick={() => setNewKid({ ...newKid, age: Math.min(15, newKid.age + 1) })} className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="relative">
              <span className="block text-[11px] text-muted-foreground mb-1">اختر وجهاً</span>
              <div className="flex flex-wrap gap-1.5">
                {KID_AVATARS.map(a => (
                  <button key={a} onClick={() => setNewKid({ ...newKid, avatar: a })} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${newKid.avatar === a ? "bg-accent/25 ring-2 ring-accent scale-105 text-accent" : "bg-muted text-muted-foreground"}`}><Avatar name={a} className="w-5 h-5" /></button>
                ))}
              </div>
            </div>

            <div className="relative">
              <span className="block text-[11px] text-muted-foreground mb-1">اختر لوناً</span>
              <div className="flex flex-wrap gap-1.5">
                {KID_COLORS.map(c => (
                  <button key={c} onClick={() => setNewKid({ ...newKid, color: c })} className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c} transition-all ${newKid.color === c ? "ring-2 ring-foreground scale-110" : ""}`} />
                ))}
              </div>
            </div>

            <button onClick={createChild} className="relative w-full btn-gold px-5 py-3"><Check className="w-5 h-5" /> إنشاء الملفّ</button>
          </div>
        </div>
      )}
      <AppFooter />
    </div>
  );
}
