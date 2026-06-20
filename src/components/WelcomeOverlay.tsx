import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Youtube, Check, CloudDownload, Wrench, User, Baby, Users, Plus, Trash2, Minus } from "lucide-react";
import { TermsText, RECITER_URL } from "../pages/SettingsPage";
import { downloadEverything } from "../data/offlineDownload";
import { setAppMode, addProfile, setActiveProfile, KID_AVATARS, KID_COLORS, type AppMode } from "../data/kidsProfile";

const ONBOARD_KEY = "mushaf:onboarded:v1";

export const isOnboarded = (): boolean => {
  try { return localStorage.getItem(ONBOARD_KEY) === "1"; } catch { return true; }
};

interface NewKid { name: string; age: number; avatar: string; }

export default function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [kids, setKids] = useState<NewKid[]>([{ name: "", age: 6, avatar: KID_AVATARS[0] }]);
  const [dl, setDl] = useState<{ busy: boolean; done: number; total: number; finished: boolean }>({ busy: false, done: 0, total: 0, finished: false });

  const effMode: AppMode = mode ?? "both";
  // مفاتيح الخطوات تتغيّر حسب الاختيار: وضع وليّ الأمر لا يحتاج خطوة إنشاء ملفّات الأطفال
  const stepKeys = effMode === "parent"
    ? ["welcome", "terms", "who", "subscribe", "download"]
    : ["welcome", "terms", "who", "kids", "subscribe", "download"];
  const cur = stepKeys[step];
  const lastIdx = stepKeys.length - 1;

  const finalize = () => {
    setAppMode(effMode);
    if (effMode !== "parent") {
      const valid = kids.filter(k => k.name.trim());
      const list = valid.length ? valid : [{ name: "طفلي", age: 6, avatar: KID_AVATARS[0] }];
      let firstId = "";
      list.forEach((k, i) => {
        const p = addProfile({ name: k.name.trim() || `طفل ${i + 1}`, age: k.age, avatar: k.avatar, color: KID_COLORS[i % KID_COLORS.length] });
        if (i === 0) firstId = p.id;
      });
      if (firstId) setActiveProfile(firstId);
    }
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch { /* ignore */ }
  };
  const finish = () => { finalize(); onDone(); };
  const finishToTools = () => { finalize(); onDone(); navigate("/tools"); };

  const startDownload = async () => {
    setDl(d => ({ ...d, busy: true, done: 0, total: 0, finished: false }));
    const res = await downloadEverything((done, total) => setDl(d => ({ ...d, done, total })));
    setDl(d => ({ ...d, busy: false, finished: true, total: res.total, done: res.total }));
  };

  const pick = (m: AppMode) => { setMode(m); setStep(3); };
  const addKid = () => setKids(k => [...k, { name: "", age: 6, avatar: KID_AVATARS[k.length % KID_AVATARS.length] }]);
  const delKid = (i: number) => setKids(k => (k.length > 1 ? k.filter((_, j) => j !== i) : k));
  const setKid = (i: number, patch: Partial<NewKid>) => setKids(k => k.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const pct = dl.total ? Math.round((dl.done / dl.total) * 100) : 0;
  const kidsValid = kids.some(k => k.name.trim());

  const ModeCard = ({ m, Icon, title, desc }: { m: AppMode; Icon: typeof User; title: string; desc: string }) => (
    <button onClick={() => pick(m)}
      className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-right transition-all active:scale-[0.99] ${mode === m ? "border-amber-400 bg-amber-500/15" : "border-slate-700 bg-slate-800/80 hover:border-amber-500/40"}`}>
      <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-black flex items-center justify-center shrink-0"><Icon className="w-6 h-6" /></span>
      <span className="flex-1 min-w-0">
        <span className="block font-extrabold text-white">{title}</span>
        <span className="block text-[12px] text-slate-300 leading-relaxed">{desc}</span>
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] text-white overflow-y-auto" dir="rtl"
      style={{ background: "linear-gradient(to bottom, rgba(15,23,42,0.90), rgba(15,23,42,0.96)), url('/background-kids.jpg') center/cover no-repeat", backgroundAttachment: "fixed" }}>
      <div className="mx-auto max-w-md px-5 py-8 min-h-full flex flex-col">
        {/* مؤشّر الخطوات */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {stepKeys.map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-amber-400" : i < step ? "w-2 bg-emerald-400" : "w-2 bg-slate-600"}`} />)}
        </div>

        <div className="flex-1">
          {cur === "welcome" && (
            <div className="text-center space-y-4 pt-4">
              <div className="relative mx-auto w-40 h-40">
                <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-2xl" />
                <img src="/my-photo.png" alt="القارئ حاج أيوب أمين"
                  className="relative w-40 h-40 rounded-full object-cover ring-4 ring-amber-400/80 shadow-2xl"
                  style={{ objectPosition: "50% 22%" }} loading="eager" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-amber-300">مرحباً بك</h1>
                <p className="text-amber-200/90 text-sm mt-1">بصوت القارئ الشيخ حاج أيوب أمين</p>
              </div>
              <p className="text-slate-200 leading-relaxed">تطبيق تعليم القرآن للأطفال — يقرأ المعلّم وتُكرّر معه، مع ألعاب تعليمية وركن أطفال آمن، ويعمل دون إنترنت بعد التحميل.</p>
            </div>
          )}

          {cur === "terms" && (
            <div className="space-y-3">
              <h2 className="text-xl font-extrabold text-amber-300 text-center">بنود الاستخدام</h2>
              <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4"><TermsText /></div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 accent-amber-500" />
                <span className="font-bold">أوافق على بنود الاستخدام</span>
              </label>
            </div>
          )}

          {cur === "who" && (
            <div className="space-y-3">
              <h2 className="text-xl font-extrabold text-amber-300 text-center">لِمَن هذا التطبيق؟</h2>
              <p className="text-slate-300 text-sm text-center leading-relaxed">اختر طريقة الاستخدام — يمكنك تغييرها لاحقاً من الإعدادات.</p>
              <div className="space-y-2 pt-1">
                <ModeCard m="parent" Icon={User} title="لي أنا (وليّ الأمر / المعلّم)" desc="استخدام مباشر للمصحف والأدوات — بلا ركن أطفال." />
                <ModeCard m="kids" Icon={Baby} title="لأطفالي" desc="ركن أطفال آمن: قراءة موجّهة وألعاب، مع ملفّ لكل طفل." />
                <ModeCard m="both" Icon={Users} title="لي ولأطفالي معاً" desc="الوضعان معاً — تختار من يستخدم التطبيق عند كل فتح." />
              </div>
            </div>
          )}

          {cur === "kids" && (
            <div className="space-y-3">
              <h2 className="text-xl font-extrabold text-amber-300 text-center">ملفّات الأطفال</h2>
              <p className="text-slate-300 text-sm text-center leading-relaxed">أنشئ ملفاً لكل طفل (الاسم، العمر، ووجه يحبّه) — كما في يوتيوب على التلفاز.</p>
              <div className="space-y-3">
                {kids.map((k, i) => (
                  <div key={i} className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-amber-200">الطفل {i + 1}</span>
                      {kids.length > 1 && <button onClick={() => delKid(i)} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-rose-300 active:scale-95"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <input value={k.name} onChange={e => setKid(i, { name: e.target.value })} placeholder="اسم الطفل"
                      className="w-full rounded-xl bg-slate-900/70 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:border-amber-500 outline-none" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-300">العمر</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setKid(i, { age: Math.max(3, k.age - 1) })} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center active:scale-95"><Minus className="w-4 h-4" /></button>
                        <span className="w-10 text-center font-extrabold text-lg text-amber-300">{k.age}</span>
                        <button onClick={() => setKid(i, { age: Math.min(15, k.age + 1) })} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center active:scale-95"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {KID_AVATARS.map(a => (
                        <button key={a} onClick={() => setKid(i, { avatar: a })}
                          className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${k.avatar === a ? "bg-amber-500/30 ring-2 ring-amber-400 scale-105" : "bg-slate-900/70"}`}>{a}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={addKid} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-600 bg-slate-800/40 py-3 font-bold text-slate-200 active:scale-[0.99]">
                  <Plus className="w-5 h-5" /> إضافة طفل آخر
                </button>
              </div>
            </div>
          )}

          {cur === "subscribe" && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-3xl bg-red-600 text-white flex items-center justify-center"><Youtube className="w-11 h-11" /></div>
              <h2 className="text-xl font-extrabold text-amber-300">ادعم القارئ</h2>
              <p className="text-slate-300 leading-relaxed">اشترك بقناة القارئ <b>حاج أيوب أمين</b> على يوتيوب — دعماً لاستمرار العمل.</p>
              <a href={RECITER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-bold px-5 py-3 active:scale-95"><Youtube className="w-5 h-5" /> اشترك الآن</a>
            </div>
          )}

          {cur === "download" && (
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
              {effMode === "parent" && (
                <button onClick={finishToTools} className="mx-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700/80 border border-slate-600 text-amber-200 font-bold px-4 py-2.5 text-sm active:scale-95">
                  <Wrench className="w-4 h-4" /> ابدأ بإعداد المحتوى (أدوات المعلّم)
                </button>
              )}
            </div>
          )}
        </div>

        {/* أزرار التنقّل */}
        <div className="flex items-center gap-2 pt-6">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="px-5 py-3 rounded-xl bg-slate-700 font-bold active:scale-95">السابق</button>}
          {step < lastIdx ? (
            cur === "who" ? null : (
              <button onClick={() => setStep(s => s + 1)} disabled={(cur === "terms" && !agreed) || (cur === "kids" && !kidsValid)}
                className="flex-1 px-5 py-3 rounded-xl bg-amber-500 text-black font-extrabold disabled:opacity-40 active:scale-95">التالي</button>
            )
          ) : (
            <button onClick={finish} disabled={dl.busy}
              className="flex-1 px-5 py-3 rounded-xl bg-amber-500 text-black font-extrabold disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"><Check className="w-5 h-5" /> {dl.finished ? "ابدأ" : "ابدأ (بلا تحميل)"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
