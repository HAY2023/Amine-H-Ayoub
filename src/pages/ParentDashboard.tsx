import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Bell, Baby, Check, Gift, Gamepad2 } from "lucide-react";
import { getProfile, saveProfile, getProgress, getHistory, grantMorePlay, KidsProfile } from "../data/kidsProfile";
import { toast } from "../hooks/use-toast";

const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden"><div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} /></div>
);

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<KidsProfile>(getProfile);
  const [progress] = useState(getProgress);
  const history = getHistory().slice(0, 7).reverse();
  const maxHist = Math.max(profile.goalMinutes, ...history.map(h => h.minutes), 1);

  const saveLesson = (t: string) => {
    const p = { ...profile, lessonTime: t };
    setProfile(p); saveProfile(p);
    if (t && typeof Notification !== "undefined" && Notification.permission === "default") { Notification.requestPermission().catch(() => {}); }
    toast({ title: t ? `تذكير الدرس الساعة ${t}` : "أُلغي تذكير الدرس" });
  };
  const grant = () => { grantMorePlay(); toast({ title: "مُنح وقت لعب إضافي" }); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-3">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/settings")} className="flex h-10 items-center gap-1 rounded-full bg-slate-700 px-4 text-sm font-bold hover:bg-slate-600 active:scale-95"><ArrowRight className="h-4 w-4" /> رجوع</button>
          <h1 className="font-extrabold text-lg text-amber-300">لوحة ولي الأمر</h1>
          <span className="w-16" />
        </header>

        {/* الطفل */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4 flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center"><Baby className="w-6 h-6" /></span>
          <div><p className="font-bold text-lg">{profile.name || "الطفل"}</p><p className="text-xs text-slate-400">العمر {profile.age} سنة</p></div>
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

        <button onClick={() => navigate("/games")} className="w-full p-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center gap-2 active:scale-95"><Baby className="w-5 h-5" /> إعدادات ركن الأطفال</button>
      </div>
    </div>
  );
}
