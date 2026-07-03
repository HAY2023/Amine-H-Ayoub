import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Bell, Baby, Check, Gift, Plus, Trash2, Minus, Star, X } from "lucide-react";
import { getProfile, updateProfile, getProgress, getHistory, getProfiles, getActiveId, setActiveProfile, addProfile, removeProfile, getAppMode, setAppMode, kidsRouteBlocked, KID_AVATARS, KID_COLORS, KidsProfile, KidsProgress, DayLog } from "../data/kidsProfile";
import { isKidsMode } from "../data/kidsLock";
import Avatar from "../components/Avatar";
import { toast } from "../hooks/use-toast";

const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="h-2.5 rounded-full bg-secondary overflow-hidden"><div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} /></div>
);

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<KidsProfile[]>(getProfiles);
  const [activeId, setActiveId] = useState<string>(getActiveId);
  const [profile, setProfile] = useState<KidsProfile>(getProfile);
  const [progress, setProgress] = useState<KidsProgress>(getProgress);
  const [history, setHistory] = useState<DayLog[]>(() => getHistory().slice(0, 7).reverse());
  const [draft, setDraft] = useState<KidsProfile>(getProfile);
  const [showAdd, setShowAdd] = useState(false);
  const [newKid, setNewKid] = useState({ name: "", age: 6, avatar: KID_AVATARS[0], color: KID_COLORS[0] });
  useEffect(() => { if (isKidsMode()) navigate("/games"); }, [navigate]);
  useEffect(() => { if (kidsRouteBlocked()) navigate("/audio", { replace: true }); }, [navigate]);

  const refresh = () => {
    setProfiles(getProfiles());
    setActiveId(getActiveId());
    setProfile(getProfile());
    setDraft(getProfile());
    setProgress(getProgress());
    setHistory(getHistory().slice(0, 7).reverse());
  };

  // يحفظ الحقول القابلة للتحرير فقط (دمج فوق التخزين الحيّ) حتى لا تُمحى النجوم/المخزون/وقت الدرس
  const saveChild = () => {
    updateProfile(draft.id, { name: draft.name, avatar: draft.avatar, color: draft.color, age: draft.age, goalMinutes: draft.goalMinutes, reward: draft.reward });
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
    if (getAppMode() === "parent") setAppMode("both");   // تفعيل ركن الأطفال عند إضافة أوّل طفل
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

          <label className="block text-sm font-bold text-muted-foreground">المكافأة (تظهر عند فتح الألعاب)
            <input value={draft.reward} onChange={e => setDraft({ ...draft, reward: e.target.value })} className="w-full mt-1 rounded-lg bg-secondary border border-border p-2 text-foreground font-normal" />
          </label>
          <p className="text-[11px] text-muted-foreground leading-relaxed">دقائق القراءة = الهدف اليومي لفتح الألعاب (٠ = مفتوحة دائماً). بعد الفتح يلعب الطفل بحرّية.</p>

          <button onClick={saveChild} className="w-full p-2.5 rounded-xl btn-gold font-bold flex items-center justify-center gap-1 active:scale-95"><Check className="w-4 h-4" /> حفظ إعدادات الطفل</button>
        </div>

        {/* اليوم */}
        <div className="card-nour p-4 space-y-3">
          <p className="font-bold text-accent">اليوم</p>
          <div>
            <div className="flex items-center justify-between text-sm mb-1"><span className="flex items-center gap-1 text-muted-foreground"><BookOpen className="w-4 h-4" /> القراءة</span><span className="text-muted-foreground">{progress.minutes} / {profile.goalMinutes} د</span></div>
            <Bar value={progress.minutes} max={profile.goalMinutes} color="bg-emerald-500" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Gift className="w-4 h-4 text-accent" />
            <span className={progress.unlocked ? "text-success" : "text-muted-foreground"}>{progress.unlocked ? "الألعاب مفتوحة" : "الألعاب مقفلة (لم يُكمل القراءة)"}</span>
          </div>
        </div>

        {/* السجلّ */}
        <div className="card-nour p-4">
          <p className="font-bold text-accent mb-3">سجلّ القراءة (آخر أيام)</p>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">لا سجلّ بعد — سيظهر تقدّم الأيام السابقة هنا.</p>
          ) : (
            <div className="flex items-end justify-between gap-2 h-28">
              {history.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-secondary rounded-md overflow-hidden flex items-end" style={{ height: "80px" }}>
                    <div className="w-full bg-emerald-500" style={{ height: `${Math.min(100, (d.minutes / maxHist) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.date.split(" ")[2]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* تذكير الدرس */}
        <div className="card-nour p-4 space-y-2">
          <p className="font-bold text-accent flex items-center gap-2"><Bell className="w-4 h-4" /> تذكير الدرس اليومي</p>
          <div className="flex items-center gap-2">
            <input type="time" value={profile.lessonTime} onChange={e => saveLesson(e.target.value)} className="flex-1 rounded-lg bg-secondary border border-border p-2 text-foreground" />
            {profile.lessonTime && <button onClick={() => saveLesson("")} className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-bold">إلغاء</button>}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1"><Clock className="w-3 h-3" /> يظهر تنبيه عند الوقت المحدّد أثناء فتح التطبيق.</p>
        </div>

        <button onClick={() => navigate("/games")} className="w-full p-3 rounded-2xl bg-secondary text-secondary-foreground hover:brightness-95 font-bold flex items-center justify-center gap-2 active:scale-95"><Baby className="w-5 h-5" /> فتح ركن الأطفال (الألعاب)</button>
      </div>

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
    </div>
  );
}
