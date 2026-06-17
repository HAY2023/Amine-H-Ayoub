import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Moon, Sun, RefreshCw, CloudDownload, Baby, Youtube, FileText, ChevronLeft, X, BarChart3 } from "lucide-react";
import { syncCoordinatesFromServer } from "../data/ayahCoordinates";
import { syncTimingsFromServer } from "../data/ayahTimings";
import { syncSurahRegionsFromServer } from "../data/surahRegions";
import { syncCustomPagesFromServer } from "../data/customPages";
import { downloadEverything } from "../data/offlineDownload";
import { isKidsMode } from "../data/kidsLock";
import { toast } from "../hooks/use-toast";

const THEME_KEY = "mushaf:theme";
export const RECITER_URL = "https://www.youtube.com/@aminehadjyoub";

export const getTheme = (): "dark" | "light" => {
  try { return (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark"; } catch { return "dark"; }
};
export const applyTheme = (t: "dark" | "light") => {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (t === "light") el.classList.remove("dark"); else el.classList.add("dark");
};

const Row = ({ icon, title, desc, onClick, right }: { icon: React.ReactNode; title: string; desc?: string; onClick?: () => void; right?: React.ReactNode }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 rounded-2xl bg-slate-800/80 border border-slate-700 p-3 text-right hover:border-amber-500/40 active:scale-[0.99] transition-all">
    <span className="w-10 h-10 rounded-xl bg-slate-700/70 text-amber-300 flex items-center justify-center shrink-0">{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block font-bold text-white">{title}</span>
      {desc && <span className="block text-[11px] text-slate-400">{desc}</span>}
    </span>
    {right ?? <ChevronLeft className="w-5 h-5 text-slate-500" />}
  </button>
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"dark" | "light">(getTheme);
  const [termsOpen, setTermsOpen] = useState(false);
  const [dlPct, setDlPct] = useState<number | null>(null);

  useEffect(() => { applyTheme(theme); try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ } }, [theme]);
  // حماية: لا يدخل الإعدادات أثناء قفل ركن الأطفال
  useEffect(() => { if (isKidsMode()) navigate("/games"); }, [navigate]);

  const checkUpdate = async () => {
    toast({ title: "يجري البحث عن تحديث..." });
    try { if ("serviceWorker" in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.update())); } } catch { /* ignore */ }
    setTimeout(() => window.location.reload(), 600);
  };

  const downloadAll = async () => {
    if (dlPct !== null) return;
    setDlPct(0);
    await Promise.allSettled([syncCoordinatesFromServer(), syncTimingsFromServer(), syncSurahRegionsFromServer(), syncCustomPagesFromServer()]);
    const res = await downloadEverything((d, t) => setDlPct(t ? Math.round((d / t) * 100) : 0));
    setDlPct(100);
    toast({ title: "اكتمل التحميل للعمل دون إنترنت", description: `${res.ok} ملف محفوظ على الجهاز` });
    setTimeout(() => setDlPct(null), 1500);
  };

  const openParent = () => {
    let pin = ""; try { pin = localStorage.getItem("mushaf:kidsPin") || ""; } catch { /* ignore */ }
    if (pin) { const p = (window.prompt("رمز ولي الأمر:") || "").trim(); if (p !== pin) { toast({ title: "رمز خاطئ", variant: "destructive" }); return; } }
    navigate("/parent");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-3">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex h-10 items-center gap-1 rounded-full bg-slate-700 px-4 text-sm font-bold hover:bg-slate-600 active:scale-95">
            <ArrowRight className="h-4 w-4" /> رجوع
          </button>
          <h1 className="font-extrabold text-lg text-amber-300">الإعدادات</h1>
          <span className="w-16" />
        </header>

        {/* المظهر */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-slate-700/70 text-amber-300 flex items-center justify-center">{theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</span>
          <span className="flex-1"><span className="block font-bold">المظهر</span><span className="block text-[11px] text-slate-400">ليل / نهار</span></span>
          <div className="flex rounded-xl bg-slate-700 p-1">
            <button onClick={() => setTheme("dark")} className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${theme === "dark" ? "bg-slate-900 text-amber-300" : "text-slate-300"}`}><Moon className="w-3.5 h-3.5" /> ليل</button>
            <button onClick={() => setTheme("light")} className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${theme === "light" ? "bg-white text-slate-900" : "text-slate-300"}`}><Sun className="w-3.5 h-3.5" /> نهار</button>
          </div>
        </div>

        <Row icon={<BarChart3 className="w-5 h-5" />} title="لوحة ولي الأمر" desc="متابعة التقدّم، تذكير الدرس، منح وقت لعب" onClick={openParent} />
        <Row icon={<Baby className="w-5 h-5" />} title="ركن الأطفال وإعداداته" desc="الألعاب، وقت القراءة واللعب، كلمة المرور" onClick={() => navigate("/games")} />
        <Row icon={<RefreshCw className="w-5 h-5" />} title="تحقق من التحديث" desc="جلب أحدث نسخة من التطبيق" onClick={checkUpdate} />
        <Row icon={<CloudDownload className={`w-5 h-5 ${dlPct !== null ? "animate-pulse" : ""}`} />} title="تنزيل كل المحتوى للعمل دون إنترنت" desc="السور والصوت والصفحات إلى جهازك" onClick={downloadAll} right={dlPct !== null ? <span className="text-xs font-bold text-emerald-300 w-12 text-center">{dlPct}%</span> : undefined} />

        {/* الاشتراك بالقارئ */}
        <a href={RECITER_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-gradient-to-l from-red-600/30 to-slate-800/80 border border-red-500/40 p-3 hover:border-red-400 active:scale-[0.99] transition-all">
          <span className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0"><Youtube className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0"><span className="block font-bold text-white">اشترك بقناة القارئ</span><span className="block text-[11px] text-slate-300">حاج أيوب أمين على يوتيوب</span></span>
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </a>

        <Row icon={<FileText className="w-5 h-5" />} title="بنود الاستخدام" onClick={() => setTermsOpen(true)} />

        <p className="text-[11px] text-slate-500 text-center pt-2 leading-relaxed">العمل الكامل دون إنترنت والسمة النهارية لكل الصفحات قيد التوسعة تدريجياً.</p>
      </div>

      {termsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl" onClick={() => setTermsOpen(false)}>
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl bg-slate-800 border border-slate-700 p-4 space-y-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-amber-300">بنود الاستخدام</h3>
              <button onClick={() => setTermsOpen(false)} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <TermsText />
          </div>
        </div>
      )}
    </div>
  );
}

export function TermsText() {
  const items = [
    "هذا التطبيق لتعليم القرآن الكريم للأطفال، ويُستخدم بإشراف وليّ الأمر.",
    "لا يحق للمستخدم رفع أي محتوى مخالف أو مسيء أو غير متعلّق بتعليم القرآن.",
    "المحتوى الذي ترفعه (صور صفحات/صوت) مسؤوليتك، وتقرّ بأن لديك الحق في استخدامه.",
    "لا يجوز إساءة استخدام التطبيق أو محاولة تعطيله أو نشر دعايات غير لائقة.",
    "قد تُحفظ بياناتك (التظليل والإعدادات) على السيرفر للمزامنة بين أجهزتك.",
    "نسأل الله أن ينفع به، والاستخدام يعني موافقتك على هذه البنود.",
  ];
  return (
    <ol className="space-y-2 text-sm text-slate-200 leading-relaxed list-decimal pr-5">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ol>
  );
}
