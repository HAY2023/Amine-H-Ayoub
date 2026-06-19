import { useNavigate } from "react-router-dom";
import { ArrowRight, Pencil, Scissors, Link2, ChevronLeft } from "lucide-react";

const TOOLS = [
  { to: "/calibrate", Icon: Pencil, name: "المعايرة (التظليل)", desc: "ضبط مواضع الآيات والسور ورفع صفحات المصحف", tint: "bg-violet-500/20 text-violet-300" },
  { to: "/recitation-methods", Icon: Scissors, name: "تقسيم الصوت", desc: "تقسيم صوت السورة (معلم/طفل) بسرعة ودقّة", tint: "bg-sky-500/20 text-sky-300" },
  { to: "/link", Icon: Link2, name: "ربط الصوت بالتظليل", desc: "رفع صوت → تقسيم → ربط بالآيات في مكان واحد", tint: "bg-emerald-500/20 text-emerald-300" },
];

export default function TeacherTools() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-3">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex h-10 items-center gap-1 rounded-full bg-slate-700 px-4 text-sm font-bold hover:bg-slate-600 active:scale-95"><ArrowRight className="h-4 w-4" /> المصحف</button>
          <h1 className="font-extrabold text-lg text-amber-300">أدوات المعلّم</h1>
          <span className="w-16" />
        </header>

        <p className="text-xs text-slate-400 text-center leading-relaxed">أدوات إعداد المحتوى (للمعلّم/ولي الأمر). رتّب الصفحات، ظلّل الآيات، وقسّم الصوت واربطه.</p>

        <div className="space-y-2">
          {TOOLS.map(t => (
            <button key={t.to} onClick={() => navigate(t.to)}
              className="w-full flex items-center gap-3 rounded-2xl bg-slate-800/80 border border-slate-700 p-3 text-right hover:border-amber-500/40 active:scale-[0.99] transition-all">
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${t.tint}`}><t.Icon className="w-6 h-6" /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-white">{t.name}</span>
                <span className="block text-[11px] text-slate-400">{t.desc}</span>
              </span>
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
