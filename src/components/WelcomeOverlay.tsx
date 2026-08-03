import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Youtube, Check, CloudDownload, Wrench, User, Baby, Plus, Trash2, Minus, KeyRound, Shield, BookOpen, Headphones, Settings, Star, Gamepad2, Puzzle, Trophy } from "lucide-react";
import { RECITER_URL } from "../pages/SettingsPage";
import { downloadEverything } from "../data/offlineDownload";
import { setAppMode, addProfile, setActiveProfile, kidsHidden, setKidsHidden, KID_AVATARS, KID_COLORS, type AppMode } from "../data/kidsProfile";
import { setKidsPin } from "../data/kidsLock";
import Avatar from "./Avatar";

const ONBOARD_KEY = "mushaf:onboarded:v1";

export const isOnboarded = (): boolean => {
  try { return localStorage.getItem(ONBOARD_KEY) === "1"; } catch { return true; }
};

interface NewKid { name: string; age: number; avatar: string; color: string; }

export default function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [kids, setKids] = useState<NewKid[]>([{ name: "", age: 6, avatar: KID_AVATARS[0], color: KID_COLORS[0] }]);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [dl, setDl] = useState<{ busy: boolean; done: number; total: number; finished: boolean }>({ busy: false, done: 0, total: 0, finished: false });

  // إذا أخفى المالك ركن الأطفال: إطلاق بالسماع فقط — نتخطّى خطوات الأطفال ونثبّت وضع وليّ الأمر
  const kidsOff = kidsHidden();
  const effMode: AppMode = kidsOff ? "parent" : (mode ?? "kids");
  // مفاتيح الخطوات: وضع وليّ الأمر لا يحتاج ملفّات أطفال؛ وضع الأطفال يعرض خطوة ركن الأطفال ورمز وليّ الأمر الاختياري
  const stepKeys = kidsOff
    ? ["welcome", "subscribe", "download"]
    : effMode === "parent"
      ? ["welcome", "who", "subscribe", "download"]
      : ["welcome", "who", "kids", "pin", "subscribe", "download"];
  const cur = stepKeys[step];
  const lastIdx = stepKeys.length - 1;
  const pinValid = /^\d{4}$/.test(pin) && pin === pin2;
  const pinOk = (!pin && !pin2) || pinValid;   // الرمز اختياري: فارغ = تخطٍّ، أو صالح ومتطابق

  const finalize = () => {
    setAppMode(effMode);
    if (effMode === "parent") setKidsHidden(true);
    if (effMode !== "parent") {
      if (pinValid) setKidsPin(pin);
      const valid = kids.filter(k => k.name.trim());
      const list = valid.length ? valid : [{ name: "طفلي", age: 6, avatar: KID_AVATARS[0], color: KID_COLORS[0] }];
      let firstId = "";
      list.forEach((k, i) => {
        const p = addProfile({ name: k.name.trim() || `طفل ${i + 1}`, age: k.age, avatar: k.avatar, color: k.color || KID_COLORS[i % KID_COLORS.length] });
        if (i === 0) firstId = p.id;
      });
      if (firstId) setActiveProfile(firstId);
    }
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch { /* ignore */ }
  };
  const finish = () => { finalize(); onDone(); };
  const finishToTools = () => { /* أدوات المعلّم معطّلة */ };

  const startDownload = async () => {
    setDl(d => ({ ...d, busy: true, done: 0, total: 0, finished: false }));
    const res = await downloadEverything((done, total) => setDl(d => ({ ...d, done, total })));
    setDl(d => ({ ...d, busy: false, finished: true, total: res.total, done: res.total }));
  };

  const pick = (m: AppMode) => { setMode(m); setStep(2); };
  const addKid = () => setKids(k => [...k, { name: "", age: 6, avatar: KID_AVATARS[k.length % KID_AVATARS.length], color: KID_COLORS[k.length % KID_COLORS.length] }]);
  const delKid = (i: number) => setKids(k => (k.length > 1 ? k.filter((_, j) => j !== i) : k));
  const setKid = (i: number, patch: Partial<NewKid>) => setKids(k => k.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const pct = dl.total ? Math.round((dl.done / dl.total) * 100) : 0;
  const kidsValid = kids.some(k => k.name.trim());

  const ModeCard = ({ m, Icon, title, desc, children }: { m: AppMode; Icon: typeof User; title: string; desc: string; children: React.ReactNode }) => (
    <button onClick={() => pick(m)}
      className={`group w-full flex flex-col gap-3 rounded-2xl border p-4 text-right transition-all active:scale-[0.99] ${mode === m ? "border-accent bg-accent/15 shadow-gold" : "border-border bg-card hover:border-accent/50 shadow-soft"}`}>
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-black flex items-center justify-center shrink-0 shadow-soft transition-transform group-hover:scale-105"><Icon className="w-6 h-6" /></span>
        <span className="flex-1 min-w-0">
          <span className="block font-extrabold text-foreground">{title}</span>
          <span className="block text-[12px] text-muted-foreground leading-relaxed">{desc}</span>
        </span>
      </div>
      <div className="w-full h-24 mt-1 rounded-xl bg-background/50 border border-border/50 overflow-hidden relative flex items-center justify-center p-2 gap-2">
        {children}
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] page-nour text-foreground overflow-y-auto" dir="rtl">
      {/* وهج ذهبي زخرفيّ خلف المحتوى */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl animate-breathe" />
        <div className="absolute bottom-0 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-md px-5 py-8 min-h-full flex flex-col">
        {/* مؤشّر الخطوات */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {stepKeys.map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-accent shadow-gold" : i < step ? "w-2 bg-success" : "w-2 bg-border"}`} />)}
        </div>

        <div className="flex-1">
          {cur === "welcome" && (
            <div className="text-center space-y-5 pt-2 animate-fade-up">
              <div className="relative mx-auto w-40 h-40">
                <div className="absolute inset-0 rounded-full bg-accent/30 blur-2xl animate-breathe" />
                <span aria-hidden className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-gold-light to-gold opacity-80 blur-[2px]" />
                <img src="/my-photo.png" alt="القارئ حاج أيوب أمين"
                  className="relative w-40 h-40 rounded-full object-cover ring-4 ring-accent/80 shadow-gold"
                  style={{ objectPosition: "50% 22%" }} loading="eager" />
              </div>
              <div className="space-y-1">
                <h1 className="text-4xl font-extrabold text-gradient-gold leading-tight">مرحباً بك</h1>
                <p className="text-accent text-sm">بصوت القارئ الشيخ حاج أيوب أمين</p>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{kidsOff ? "استمع إلى تلاوات القرآن الكريم برواية ورش بصوت الشيخ حاج أيوب أمين — ويعمل دون إنترنت بعد التحميل." : "تطبيق تعليم القرآن للأطفال — يقرأ المعلّم وتُكرّر معه، مع ألعاب تعليمية وركن أطفال آمن، ويعمل دون إنترنت بعد التحميل."}</p>
              <div aria-hidden className="mx-auto w-24 h-px bg-gradient-to-l from-transparent via-accent/60 to-transparent" />
            </div>
          )}

          {cur === "who" && (
            <div className="space-y-3 animate-fade-up">
              <h2 className="text-xl font-extrabold text-accent text-center">لِمَن هذا التطبيق؟</h2>
              <p className="text-muted-foreground text-sm text-center leading-relaxed">اختر طريقة الاستخدام — يمكنك تغييرها لاحقاً من الإعدادات.</p>
              <div className="space-y-4 pt-1">
                <ModeCard m="parent" Icon={User} title="لي أنا" desc="تصفح المصحف، استمع للتلاوات بحرية، وإعدادات متقدمة. (بلا ركن أطفال)">
                  <div className="flex-1 h-full rounded-lg bg-card border border-border/50 flex flex-col p-2 gap-1.5 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div className="w-8 h-2 rounded bg-muted-foreground/30" />
                      <div className="w-4 h-4 rounded-full bg-accent/50 flex items-center justify-center"><BookOpen className="w-2.5 h-2.5 text-accent-foreground" /></div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-2">
                      <div className="w-3/4 h-2 rounded bg-foreground/20" />
                      <div className="w-full h-2 rounded bg-foreground/20" />
                      <div className="w-5/6 h-2 rounded bg-foreground/20" />
                    </div>
                  </div>
                  <div className="w-10 h-full flex flex-col gap-1.5 justify-end">
                    <div className="w-full h-8 rounded-lg bg-accent/20 flex items-center justify-center"><Headphones className="w-4 h-4 text-accent" /></div>
                    <div className="w-full h-8 rounded-lg bg-secondary flex items-center justify-center"><Settings className="w-4 h-4 text-muted-foreground" /></div>
                  </div>
                </ModeCard>
                <ModeCard m="kids" Icon={Baby} title="لأطفالي" desc="واجهة مبسطة، ألعاب قرآنية، ومكافآت لكل طفل بملف منفصل.">
                  <div className="w-full h-full flex flex-col gap-2 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center shadow-sm"><Baby className="w-5 h-5 text-white" /></div>
                      <div className="flex-1 h-2 rounded bg-foreground/20" />
                      <div className="w-10 h-4 rounded-full bg-accent/20 flex items-center justify-center gap-0.5"><Star className="w-2.5 h-2.5 text-accent fill-accent" /><div className="w-3 h-1.5 rounded bg-accent/50" /></div>
                    </div>
                    <div className="flex gap-2 flex-1 pb-1">
                      <div className="flex-1 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-sm"><Gamepad2 className="w-5 h-5 text-blue-500" /></div>
                      <div className="flex-1 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center shadow-sm"><Puzzle className="w-5 h-5 text-green-500" /></div>
                      <div className="flex-1 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shadow-sm"><Trophy className="w-5 h-5 text-purple-500" /></div>
                    </div>
                  </div>
                </ModeCard>
              </div>
            </div>
          )}

          {cur === "kids" && (
            <div className="space-y-3 animate-fade-up">
              <h2 className="text-xl font-extrabold text-accent text-center">ملفّات الأطفال</h2>
              <p className="text-muted-foreground text-sm text-center leading-relaxed">أنشئ ملفاً لكل طفل (الاسم، العمر، ووجه يحبّه) — كما في يوتيوب على التلفاز.</p>
              <div className="space-y-3">
                {kids.map((k, i) => (
                  <div key={i} className="card-nour p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-lg shrink-0`}><Avatar name={k.avatar} className="w-8 h-8 text-white" /></span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-accent">الطفل {i + 1}</span>
                        <input value={k.name} onChange={e => setKid(i, { name: e.target.value })} placeholder="اسم الطفل"
                          className="w-full mt-1 rounded-xl bg-muted border border-border px-3 py-2 text-foreground placeholder-muted-foreground focus:border-accent outline-none transition-colors" />
                      </div>
                      {kids.length > 1 && <button onClick={() => delKid(i)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-destructive active:scale-95 shrink-0"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">العمر</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setKid(i, { age: Math.max(3, k.age - 1) })} className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95"><Minus className="w-4 h-4" /></button>
                        <span className="w-10 text-center font-extrabold text-lg text-accent">{k.age}</span>
                        <button onClick={() => setKid(i, { age: Math.min(15, k.age + 1) })} className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[11px] text-muted-foreground mb-1">اختر وجهاً</span>
                      <div className="flex flex-wrap gap-1.5">
                        {KID_AVATARS.map(a => (
                          <button key={a} onClick={() => setKid(i, { avatar: a })}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${k.avatar === a ? "bg-accent/25 ring-2 ring-accent scale-105 text-accent" : "bg-muted text-muted-foreground"}`}><Avatar name={a} className="w-5 h-5" /></button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[11px] text-muted-foreground mb-1">اختر لوناً</span>
                      <div className="flex flex-wrap gap-1.5">
                        {KID_COLORS.map(c => (
                          <button key={c} onClick={() => setKid(i, { color: c })}
                            className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c} transition-all ${k.color === c ? "ring-2 ring-foreground scale-110" : ""}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addKid} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/50 py-3 font-bold text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors active:scale-[0.99]">
                  <Plus className="w-5 h-5" /> إضافة طفل آخر
                </button>
              </div>
            </div>
          )}

          {cur === "pin" && (
            <div className="space-y-4 text-center animate-fade-up">
              <div className="relative mx-auto w-20 h-20">
                <span aria-hidden className="absolute inset-0 rounded-3xl bg-accent/25 blur-xl" />
                <div className="relative w-20 h-20 rounded-3xl bg-secondary text-accent flex items-center justify-center shadow-soft"><Shield className="w-11 h-11" /></div>
              </div>
              <h2 className="text-xl font-extrabold text-accent">رمز وليّ الأمر <span className="text-muted-foreground font-bold">(اختياري)</span></h2>
              <p className="text-muted-foreground leading-relaxed text-sm">رمز من ٤ أرقام يحمي إعدادات الأهل والخروج من ركن الأطفال. <b className="text-foreground">اتركه فارغاً لتخطّيه</b> — يمكنك ضبطه لاحقاً.</p>
              <div className="space-y-2 max-w-[220px] mx-auto">
                <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" type="password" placeholder="••••"
                  className="w-full text-center tracking-[0.6em] text-2xl font-extrabold rounded-xl bg-muted border border-border px-3 py-3 text-foreground focus:border-accent outline-none transition-colors" />
                <input value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" type="password" placeholder="تأكيد الرمز"
                  className="w-full text-center tracking-[0.6em] text-2xl font-extrabold rounded-xl bg-muted border border-border px-3 py-3 text-foreground focus:border-accent outline-none transition-colors" />
              </div>
              {pin && pin2 && pin !== pin2 && <p className="text-xs text-destructive">الرمزان غير متطابقين</p>}
              {pinValid && <p className="text-xs text-success flex items-center justify-center gap-1"><KeyRound className="w-3.5 h-3.5" /> الرمز جاهز</p>}
            </div>
          )}

          {cur === "subscribe" && (
            <div className="text-center space-y-4 animate-fade-up">
              <div className="relative mx-auto w-20 h-20">
                <span aria-hidden className="absolute inset-0 rounded-3xl bg-red-500/30 blur-xl" />
                <div className="relative w-20 h-20 rounded-3xl bg-red-600 text-white flex items-center justify-center shadow-soft"><Youtube className="w-11 h-11" /></div>
              </div>
              <h2 className="text-xl font-extrabold text-accent">ادعم القارئ</h2>
              <p className="text-muted-foreground leading-relaxed">اشترك بقناة القارئ <b className="text-foreground">حاج أيوب أمين</b> على يوتيوب — دعماً لاستمرار العمل.</p>
              <a href={RECITER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-bold px-5 py-3 shadow-soft active:scale-95 transition-transform"><Youtube className="w-5 h-5" /> اشترك الآن</a>
            </div>
          )}

          {cur === "download" && (
            <div className="text-center space-y-4 animate-fade-up">
              <div className="relative mx-auto w-20 h-20">
                <span aria-hidden className="absolute inset-0 rounded-3xl bg-primary/25 blur-xl" />
                <div className="relative w-20 h-20 rounded-3xl btn-emerald !p-0 flex items-center justify-center"><CloudDownload className="w-11 h-11" /></div>
              </div>
              <h2 className="text-xl font-extrabold text-accent">تحميل للعمل دون إنترنت</h2>
              <p className="text-muted-foreground leading-relaxed">حمّل كل السور والصوت والصفحات إلى جهازك ليعمل التطبيق بالكامل دون اتصال.</p>
              {dl.busy || dl.finished ? (
                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-l from-emerald-light to-emerald transition-all" style={{ width: `${pct}%` }} /></div>
                  <p className="text-sm text-muted-foreground">{dl.finished ? "اكتمل التحميل" : `${dl.done} / ${dl.total} (${pct}%)`}</p>
                </div>
              ) : (
                <button onClick={startDownload} className="btn-emerald px-5 py-3"><CloudDownload className="w-5 h-5" /> حمّل كل شيء الآن</button>
              )}
              <p className="text-[11px] text-muted-foreground">يمكنك التحميل لاحقاً من الإعدادات.</p>
              {/* زر الدخول لأدوات المعلّم مخفي */}
            </div>
          )}
        </div>

        {/* أزرار التنقّل */}
        <div className="flex items-center gap-2 pt-6">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="px-5 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:brightness-95 transition-all active:scale-95">السابق</button>}
          {step < lastIdx ? (
            cur === "who" ? null : (
              <button onClick={() => setStep(s => s + 1)} disabled={(cur === "kids" && !kidsValid) || (cur === "pin" && !pinOk)}
                className="btn-gold flex-1 px-5 py-3 disabled:opacity-40">{cur === "pin" && !pin && !pin2 ? "تخطّي" : "التالي"}</button>
            )
          ) : (
            <button onClick={finish} disabled={dl.busy}
              className="btn-gold flex-1 px-5 py-3 disabled:opacity-40"><Check className="w-5 h-5" /> {dl.finished ? "ابدأ" : "ابدأ (بلا تحميل)"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
