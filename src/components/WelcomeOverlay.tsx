import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Youtube, Check, BookOpen, CloudDownload, Loader2, Wrench } from "lucide-react";
import { TermsText, RECITER_URL } from "../pages/SettingsPage";
import { downloadEverything } from "../data/offlineDownload";

const ONBOARD_KEY = "mushaf:onboarded:v1";

export const isOnboarded = (): boolean => {
  try { return localStorage.getItem(ONBOARD_KEY) === "1"; } catch { return true; }
};

export default function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [dl, setDl] = useState<{ busy: boolean; done: number; total: number; finished: boolean }>({ busy: false, done: 0, total: 0, finished: false });

  const finish = () => { try { localStorage.setItem(ONBOARD_KEY, "1"); } catch { /* ignore */ } onDone(); };
  const finishToTools = () => { finish(); navigate("/tools"); };

  const startDownload = async () => {
    setDl(d => ({ ...d, busy: true, done: 0, total: 0, finished: false }));
    const res = await downloadEverything((done, total) => setDl(d => ({ ...d, done, total })));
    setDl(d => ({ ...d, busy: false, finished: true, total: res.total, done: res.total }));
  };

  const steps = ["مرحباً", "البنود", "الاشتراك", "التحميل"];
  const pct = dl.total ? Math.round((dl.done / dl.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] text-white overflow-y-auto" dir="rtl"
      style={{ background: "linear-gradient(to bottom, rgba(15,23,42,0.90), rgba(15,23,42,0.96)), url('/background-kids.jpg') center/cover no-repeat", backgroundAttachment: "fixed" }}>
      <div className="mx-auto max-w-md px-5 py-8 min-h-full flex flex-col">
        {/* مؤشّر الخطوات */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-amber-400" : i < step ? "w-2 bg-emerald-400" : "w-2 bg-slate-600"}`} />)}
        </div>

        <div className="flex-1">
          {step === 0 && (
            <div className="text-center space-y-4 pt-6">
              <img src="/my-photo.png" alt="القارئ حاج أيوب أمين" className="mx-auto w-32 h-32 rounded-full object-cover ring-4 ring-amber-400/70 shadow-2xl" />
              <div>
                <h1 className="text-3xl font-extrabold text-amber-300">مرحباً بك</h1>
                <p className="text-amber-200/80 text-sm mt-1">بصوت القارئ حاج أيوب أمين</p>
              </div>
              <p className="text-slate-200 leading-relaxed">تطبيق تعليم القرآن للأطفال — يقرأ المعلّم وتُكرّر معه، مع ألعاب تعليمية وركن أطفال آمن، ويعمل دون إنترنت بعد التحميل.</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <h2 className="text-xl font-extrabold text-amber-300 text-center">بنود الاستخدام</h2>
              <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4"><TermsText /></div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 accent-amber-500" />
                <span className="font-bold">أوافق على بنود الاستخدام</span>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-3xl bg-red-600 text-white flex items-center justify-center"><Youtube className="w-11 h-11" /></div>
              <h2 className="text-xl font-extrabold text-amber-300">ادعم القارئ</h2>
              <p className="text-slate-300 leading-relaxed">اشترك بقناة القارئ <b>حاج أيوب أمين</b> على يوتيوب — دعماً لاستمرار العمل.</p>
              <a href={RECITER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-bold px-5 py-3 active:scale-95"><Youtube className="w-5 h-5" /> اشترك الآن</a>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-3xl bg-emerald-600 text-white flex items-center justify-center"><CloudDownload className="w-11 h-11" /></div>
              <h2 className="text-xl font-extrabold text-amber-300">تحميل للعمل دون إنترنت</h2>
              <p className="text-slate-300 leading-relaxed">حمّل كل السور والصوت والصفحات إلى جهازك ليعمل التطبيق بالكامل دون اتصال.</p>
              {dl.busy || dl.finished ? (
                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-slate-700 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
                  <p className="text-sm text-slate-400">{dl.finished ? "اكتمل التحميل ✓" : `${dl.done} / ${dl.total} (${pct}%)`}</p>
                </div>
              ) : (
                <button onClick={startDownload} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-bold px-5 py-3 active:scale-95"><CloudDownload className="w-5 h-5" /> حمّل كل شيء الآن</button>
              )}
              <p className="text-[11px] text-slate-500">يمكنك التحميل لاحقاً من الإعدادات.</p>
              <button onClick={finishToTools} className="mx-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700/80 border border-slate-600 text-amber-200 font-bold px-4 py-2.5 text-sm active:scale-95">
                <Wrench className="w-4 h-4" /> أنا المعلّم — إعداد المحتوى الآن
              </button>
            </div>
          )}
        </div>

        {/* أزرار التنقّل */}
        <div className="flex items-center gap-2 pt-6">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="px-5 py-3 rounded-xl bg-slate-700 font-bold active:scale-95">السابق</button>}
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !agreed}
              className="flex-1 px-5 py-3 rounded-xl bg-amber-500 text-black font-extrabold disabled:opacity-40 active:scale-95">التالي</button>
          ) : (
            <button onClick={finish} disabled={dl.busy}
              className="flex-1 px-5 py-3 rounded-xl bg-amber-500 text-black font-extrabold disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"><Check className="w-5 h-5" /> {dl.finished ? "ابدأ" : "ابدأ (بلا تحميل)"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
