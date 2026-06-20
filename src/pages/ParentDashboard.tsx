import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Bell, Baby, Check, Gift, Gamepad2, Plus, Trash2, Minus, Star } from "lucide-react";
import { getProfile, updateProfile, getProgress, getHistory, grantMorePlay, getProfiles, getActiveId, setActiveProfile, addProfile, removeProfile, getAppMode, setAppMode, KID_AVATARS, KidsProfile, KidsProgress, DayLog } from "../data/kidsProfile";
import { isKidsMode } from "../data/kidsLock";
import { toast } from "../hooks/use-toast";

const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden"><div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} /></div>
);

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<KidsProfile[]>(getProfiles);
  const [activeId, setActiveId] = useState<string>(getActiveId);
  const [profile, setProfile] = useState<KidsProfile>(getProfile);
  const [progress, setProgress] = useState<KidsProgress>(getProgress);
  const [history, setHistory] = useState<DayLog[]>(() => getHistory().slice(0, 7).reverse());
  const [draft, setDraft] = useState<KidsProfile>(getProfile);
  useEffect(() => { if (isKidsMode()) navigate("/games"); }, [navigate]);

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
    updateProfile(draft.id, { name: draft.name, avatar: draft.avatar, color: draft.color, age: draft.age, goalMinutes: draft.goalMinutes, playMinutes: draft.playMinutes, reward: draft.reward });
    const np = getProfile(); setProfile(np); setDraft(np); setProfiles(getProfiles());
    toast({ title: "حُفظت إعدادات الطفل" });
  };

  const maxHist = Math.max(profile.goalMinutes, ...history.map(h => h.minutes), 1);

  const switchTo = (id: string) => { setActiveProfile(id); refresh(); };
  const addChild = () => {
    const name = (window.prompt("اسم الطفل الجديد:") || "").trim();
    if (!name) return;
    const p = addProfile({ name });
    setActiveProfile(p.id);
    if (getAppMode() === "parent") setAppMode("both");   // تفعيل ركن الأطفال عند إضافة أوّل طفل
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
  const grant = () => { grantMorePlay(); setProgress(getProgress()); toast({ title: "مُنح وقت لعب إضافي" }); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-3">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/settings")} className="flex h-10 items-center gap-1 rounded-full bg-slate-700 px-4 text-sm font-bold hover:bg-slate-600 active:scale-95"><ArrowRight className="h-4 w-4" /> رجوع</button>
          <h1 className="font-extrabold text-lg text-amber-300">لوحة ولي الأمر</h1>
          <span className="w-16" />
        </header>

        {/* الأطفال — اختر طفلاً لعرض تقدّمه، أو أضِف/احذف */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
          <p className="font-bold text-amber-300 text-sm">الأطفال</p>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            {profiles.map(p => (
              <div key={p.id} className="relative shrink-0">
                <button onClick={() => switchTo(p.id)}
                  className={`w-20 flex flex-col items-center gap-1 rounded-xl p-2 border transition-all ${p.id === activeId ? "border-amber-400 bg-amber-500/15" : "border-slate-700 bg-slate-900/50"}`}>
                  <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-2xl`}>{p.avatar}</span>
                  <span className="text-[11px] font-bold truncate w-full text-center">{p.name || "طفلي"}</span>
                </button>
                {profiles.length > 1 && (
                  <button onClick={() => delChild(p.id, p.name)} className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow active:scale-90"><Trash2 className="w-3 h-3" /></button>
                )}
              </div>
            ))}
            <button onClick={addChild} className="w-20 shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl p-2 border border-dashed border-slate-600 bg-slate-900/40 active:scale-95">
              <span className="w-12 h-12 rounded-2xl bg-slate-700/70 flex items-center justify-center"><Plus className="w-6 h-6 text-slate-300" /></span>
              <span className="text-[11px] font-bold text-slate-300">إضافة</span>
            </button>
          </div>
        </div>

        {/* إعدادات الطفل النشِط — المكان الوحيد لضبط إعدادات الطفل */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${draft.color} flex items-center justify-center text-2xl`}>{draft.avatar}</span>
            <p className="font-bold text-amber-300">إعدادات {draft.name || "الطفل"}</p>
            {(draft.coins ?? 0) > 0 && <span className="ml-auto inline-flex items-center gap-1 text-amber-300 font-bold text-sm"><Star className="w-4 h-4 fill-amber-300" /> {draft.coins}</span>}
          </div>

          <label className="block text-sm font-bold text-slate-300">الاسم
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white font-normal" />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {KID_AVATARS.map(a => (
              <button key={a} onClick={() => setDraft({ ...draft, avatar: a })} className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${draft.avatar === a ? "bg-amber-500/30 ring-2 ring-amber-400" : "bg-slate-900/70"}`}>{a}</button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-300">العمر (يحدّد الألعاب المناسبة)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setDraft({ ...draft, age: Math.max(3, draft.age - 1) })} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center active:scale-95"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center font-extrabold text-lg text-amber-300">{draft.age}</span>
              <button onClick={() => setDraft({ ...draft, age: Math.min(15, draft.age + 1) })} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center active:scale-95"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-300">دقائق القراءة لفتح الألعاب
              <input type="number" min={0} max={120} value={draft.goalMinutes} onChange={e => setDraft({ ...draft, goalMinutes: parseInt(e.target.value, 10) || 0 })} className="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white font-normal" />
            </label>
            <label className="block text-xs font-bold text-slate-300">دقائق اللعب المسموحة
              <input type="number" min={0} max={120} value={draft.playMinutes} onChange={e => setDraft({ ...draft, playMinutes: parseInt(e.target.value, 10) || 0 })} className="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white font-normal" />
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-300">المكافأة (تظهر عند فتح الألعاب)
            <input value={draft.reward} onChange={e => setDraft({ ...draft, reward: e.target.value })} className="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white font-normal" />
          </label>
          <p className="text-[11px] text-slate-500 leading-relaxed">دقائق القراءة = هدف يومي لفتح الألعاب (٠ = مفتوحة دائماً) · دقائق اللعب = المدة ثم يُقفل (٠ = بلا حد).</p>

          <button onClick={saveChild} className="w-full p-2.5 rounded-xl bg-amber-500 text-black font-bold flex items-center justify-center gap-1 active:scale-95"><Check className="w-4 h-4" /> حفظ إعدادات الطفل</button>
        </div>

        {/* اليوم */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4 space-y-3">
          <p className="font-bold text-amber-300">اليوم</p>
          <div>
            <div className="flex items-center justify-between text-sm mb-1"><span className="flex items-center gap-1 text-slate-300"><BookOpen className="w-4 h-4" /> القراءة</span><span className="text-slate-400">{progress.minutes} / {profile.goalMinutes} د</span></div>
            <Bar value={progress.minutes} max={profile.goalMinutes} color="bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1"><span className="flex items-center gap-1 text-slate-300"><Gamepad2 className="w-4 h-4" /> اللعب</span><span className="text-slate-400">{progress.played} / {profile.playMinutes || "∞"} د</span></div>
            <Bar value={progress.played} max={profile.playMinutes || progress.played || 1} color="bg-sky-500" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Gift className="w-4 h-4 text-amber-300" />
            <span className={progress.unlocked ? "text-emerald-300" : "text-slate-400"}>{progress.unlocked ? "الألعاب مفتوحة" : "الألعاب مقفلة (لم يُكمل القراءة)"}</span>
            {progress.playExpired && <span className="text-rose-300">· انتهى وقت اللعب</span>}
          </div>
          <button onClick={grant} className="w-full p-2.5 rounded-xl bg-amber-500 text-black font-bold flex items-center justify-center gap-1 active:scale-95"><Check className="w-4 h-4" /> منح وقت لعب إضافي</button>
        </div>

        {/* السجلّ */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4">
          <p className="font-bold text-amber-300 mb-3">سجلّ القراءة (آخر أيام)</p>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">لا سجلّ بعد — سيظهر تقدّم الأيام السابقة هنا.</p>
          ) : (
            <div className="flex items-end justify-between gap-2 h-28">
              {history.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-slate-700 rounded-md overflow-hidden flex items-end" style={{ height: "80px" }}>
                    <div className="w-full bg-emerald-500" style={{ height: `${Math.min(100, (d.minutes / maxHist) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400">{d.date.split(" ")[2]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* تذكير الدرس */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4 space-y-2">
          <p className="font-bold text-amber-300 flex items-center gap-2"><Bell className="w-4 h-4" /> تذكير الدرس اليومي</p>
          <div className="flex items-center gap-2">
            <input type="time" value={profile.lessonTime} onChange={e => saveLesson(e.target.value)} className="flex-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white" />
            {profile.lessonTime && <button onClick={() => saveLesson("")} className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-bold">إلغاء</button>}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed flex items-center gap-1"><Clock className="w-3 h-3" /> يظهر تنبيه عند الوقت المحدّد أثناء فتح التطبيق.</p>
        </div>

        <button onClick={() => navigate("/games")} className="w-full p-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center gap-2 active:scale-95"><Baby className="w-5 h-5" /> فتح ركن الأطفال (الألعاب)</button>
      </div>
    </div>
  );
}
