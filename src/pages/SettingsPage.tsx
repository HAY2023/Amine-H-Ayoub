import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Moon, Sun, RefreshCw, CloudDownload, Baby, Youtube, FileText, ChevronLeft, X, BarChart3, Wrench, User, Users, GraduationCap, BookOpen, Lock, KeyRound, Settings as SettingsIcon } from "lucide-react";
import { isMushafDevEnabled, setMushafDev } from "../utils/tauriUtils";
import { getAppMode, setAppMode, getProfiles, addProfile, kidsHidden, setKidsHidden, type AppMode } from "../data/kidsProfile";
import { syncCoordinatesFromServer } from "../data/ayahCoordinates";
import { syncTimingsFromServer } from "../data/ayahTimings";
import { syncSurahRegionsFromServer } from "../data/surahRegions";
import { syncCustomPagesFromServer } from "../data/customPages";
import { downloadEverything } from "../data/offlineDownload";
import { isKidsMode, hasKidsPin, setKidsPin } from "../data/kidsLock";
import PinModal from "../components/PinModal";
import { toast } from "../hooks/use-toast";

const THEME_KEY = "mushaf:theme";
export const RECITER_URL = "https://www.youtube.com/@aminehadjyoub";

export const getTheme = (): "dark" | "light" => {
  try { return (localStorage.getItem(THEME_KEY) as "dark" | "light") || "light"; } catch { return "light"; }
};
export const applyTheme = (t: "dark" | "light") => {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (t === "light") el.classList.remove("dark"); else el.classList.add("dark");
};

/** عنوان قسم صغير فوق مجموعة مرتّبة. */
const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="space-y-1.5">
    <h2 className="px-1.5 text-xs font-extrabold text-muted-foreground">{label}</h2>
    <div className="card-nour overflow-hidden divide-y divide-border">{children}</div>
  </section>
);

/** صفّ داخل مجموعة (بلا بطاقة منفصلة — تفصلها خطوط المجموعة). */
const Item = ({ icon, title, desc, onClick, right }: { icon: React.ReactNode; title: string; desc?: string; onClick?: () => void; right?: React.ReactNode }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 p-3 text-right hover:bg-muted/60 active:scale-[0.99] transition-colors">
    <span className="w-10 h-10 rounded-xl bg-secondary text-accent flex items-center justify-center shrink-0">{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block font-bold text-foreground">{title}</span>
      {desc && <span className="block text-[11px] text-muted-foreground leading-relaxed">{desc}</span>}
    </span>
    {right ?? <ChevronLeft className="w-5 h-5 text-muted-foreground" />}
  </button>
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"dark" | "light">(getTheme);
  const [appMode, setMode] = useState<AppMode>(getAppMode);
  const [termsOpen, setTermsOpen] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [dlPct, setDlPct] = useState<number | null>(null);
  const [owner, setOwner] = useState(isMushafDevEnabled);
  useEffect(() => { const h = () => setOwner(isMushafDevEnabled()); window.addEventListener("mushaf:ownermode", h); return () => window.removeEventListener("mushaf:ownermode", h); }, []);
  const disableOwner = () => { setMushafDev(false); setOwner(false); toast({ title: "أُوقف وضع المالك", description: "عادت رسالة التطوير للمستخدمين" }); };
  const [hideKids, setHideKids] = useState(kidsHidden);
  const toggleHideKids = () => { const next = !kidsHidden(); setKidsHidden(next); setHideKids(next); toast({ title: next ? "أُخفي ركن الأطفال والألعاب بالكامل" : "أُعيد إظهار ركن الأطفال والألعاب" }); };
  // كلمة المرور (رمز وليّ الأمر): تعيين/تغيير/إزالة من الإعدادات
  const [hasPin, setHasPin] = useState(hasKidsPin);
  const [pinFlow, setPinFlow] = useState<null | "verifyOld" | "setNew">(null);
  const changePin = () => setPinFlow(hasKidsPin() ? "verifyOld" : "setNew");
  const removePin = () => { setKidsPin(""); setHasPin(false); toast({ title: "أُزيلت كلمة المرور" }); };

  const changeMode = (m: AppMode) => {
    setMode(m); setAppMode(m);
    if (m !== "parent" && getProfiles().length === 0) addProfile({ name: "طفلي" });   // ضمان وجود طفل واحد على الأقل
    toast({ title: m === "parent" ? "وضع وليّ الأمر — بلا ركن أطفال" : m === "kids" ? "وضع الأطفال" : "وضع وليّ الأمر والأطفال معاً" });
  };

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

  // دخول لوحة وليّ الأمر — بنافذة رمز أنيقة بدل نافذة المتصفّح (وإن لم يوجد رمز يدخل مباشرة)
  const openParent = () => { if (hasKidsPin()) setShowPin(true); else navigate("/parent"); };

  return (
    <div className="min-h-screen page-nour text-foreground" dir="rtl">
      {/* وهج ذهبي زخرفي علوي */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-accent/10 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto max-w-md px-4 py-5 space-y-5">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/audio")} className="flex h-10 items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-4 text-sm font-bold border border-border hover:brightness-95 active:scale-95 transition-all shadow-soft">
            <ArrowRight className="h-4 w-4" /> رجوع
          </button>
          <span className="w-16" />
        </header>

        {/* بطاقة العنوان */}
        <div className="card-nour relative overflow-hidden p-5 text-center animate-fade-up">
          <div className="pointer-events-none absolute -top-10 -left-10 h-28 w-28 rounded-full bg-accent/10 blur-2xl" aria-hidden="true" />
          <span className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-soft"><SettingsIcon className="h-6 w-6" /></span>
          <h1 className="font-extrabold text-2xl text-gradient-gold">الإعدادات</h1>
          <p className="mt-1 text-xs text-muted-foreground">خصّص المظهر وأدوات الأهل</p>
        </div>

        {/* ===== المظهر ===== */}
        <Section label="المظهر">
          <div className="flex items-center gap-3 p-3">
            <span className="w-10 h-10 rounded-xl bg-secondary text-accent flex items-center justify-center">{theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</span>
            <span className="flex-1"><span className="block font-bold">المظهر</span><span className="block text-[11px] text-muted-foreground">ليل / نهار</span></span>
            <div className="flex rounded-xl bg-secondary p-1">
              <button onClick={() => setTheme("light")} className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${theme === "light" ? "bg-card text-accent shadow-soft" : "text-muted-foreground"}`}><Sun className="w-3.5 h-3.5" /> نهار</button>
              <button onClick={() => setTheme("dark")} className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${theme === "dark" ? "bg-card text-accent shadow-soft" : "text-muted-foreground"}`}><Moon className="w-3.5 h-3.5" /> ليل</button>
            </div>
          </div>
        </Section>

        {/* ===== من يستخدم التطبيق؟ + الأطفال ===== */}
        {/* تُخفى عن المستخدمين عند الإخفاء، لكنها تبقى ظاهرة للمالك ليختبرها */}
        {(!hideKids || owner) && (<>
        <Section label="من يستخدم التطبيق؟">
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {([
                { m: "parent" as AppMode, Icon: User, label: "لي" },
                { m: "kids" as AppMode, Icon: Baby, label: "لأطفالي" },
                { m: "both" as AppMode, Icon: Users, label: "معاً" },
              ]).map(o => (
                <button key={o.m} onClick={() => changeMode(o.m)}
                  className={`flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-bold border transition-all ${appMode === o.m ? "border-accent bg-accent/15 text-accent shadow-soft" : "border-border bg-muted text-muted-foreground hover:border-accent/40"}`}>
                  <o.Icon className="w-5 h-5" /> {o.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">«لي»: بلا ركن أطفال. «لأطفالي»: ركن أطفال آمن. «معاً»: تختار من يستخدم التطبيق عند كل فتح.</p>
          </div>
        </Section>

        {/* ===== الأطفال وولي الأمر ===== */}
        <Section label="الأطفال وولي الأمر">
          <Item icon={<BarChart3 className="w-5 h-5" />} title="لوحة وليّ الأمر" desc="إعدادات كل طفل · التقدّم والسجلّ · تذكير الدرس" onClick={openParent} />
          <Item icon={<Baby className="w-5 h-5" />} title="ركن الأطفال (الألعاب)" desc="دخول الألعاب والمكافآت" onClick={() => navigate("/games")} />
        </Section>
        </>)}

        {/* ===== التعلّم والمحتوى ===== */}
        <Section label="التعلّم والمحتوى">
          <Item icon={<GraduationCap className="w-5 h-5" />} title="ركن طالب القرآن" desc="مؤقّت · مكتبة صوتية · بحث في الكلمات · مدرّب تلاوة" onClick={() => navigate("/student")} />
        </Section>

        {/* ===== كلمة المرور (رمز وليّ الأمر) — متاحة دائماً ===== */}
        <Section label="كلمة المرور">
          <Item icon={<KeyRound className="w-5 h-5" />} title={hasPin ? "تغيير كلمة المرور" : "تعيين كلمة المرور"} desc="رمز من ٤ أرقام يحمي الإعدادات ولوحة وليّ الأمر والخروج من ركن الأطفال" onClick={changePin} />
          {hasPin && <Item icon={<X className="w-5 h-5" />} title="إزالة كلمة المرور" desc="إلغاء الحماية بالرمز" onClick={removePin} />}
        </Section>

        {/* ===== التطبيق ===== */}
        <Section label="التطبيق">
          <Item icon={<RefreshCw className="w-5 h-5" />} title="تحقّق من التحديث" desc="جلب أحدث نسخة من التطبيق" onClick={checkUpdate} />
          <Item icon={<CloudDownload className={`w-5 h-5 ${dlPct !== null ? "animate-pulse" : ""}`} />} title="تنزيل للعمل دون إنترنت" desc="السور والتلاوات إلى جهازك" onClick={downloadAll} right={dlPct !== null ? <span className="text-xs font-bold text-success w-12 text-center">{dlPct}%</span> : undefined} />
          <Item icon={<FileText className="w-5 h-5" />} title="بنود الاستخدام" onClick={() => setTermsOpen(true)} />
        </Section>

        {/* ===== أدوات المالك (تظهر فقط في وضع المالك) ===== */}
        {owner && (
          <Section label="أدوات المالك (قيد التطوير)">
            <Item icon={<BookOpen className="w-5 h-5" />} title="المصحف التفاعلي" desc="القارئ — غير مُطلق للمستخدمين بعد" onClick={() => navigate("/")} />
            <Item icon={<Wrench className="w-5 h-5" />} title="أدوات المحتوى" desc="التظليل (المعايرة) · تقسيم الصوت · ربط الصوت بالآيات" onClick={() => navigate("/tools")} />
            <Item
              icon={<Baby className="w-5 h-5" />}
              title={hideKids ? "إظهار ركن الأطفال والألعاب" : "إخفاء ركن الأطفال والألعاب"}
              desc={hideKids ? "ظاهر الآن للمستخدمين" : "يُخفي كل ما يخصّ الأطفال تماماً — للإطلاق بالسماع فقط"}
              onClick={toggleHideKids}
              right={<span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${hideKids ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>{hideKids ? "مخفيّ" : "ظاهر"}</span>}
            />
            <Item icon={<Lock className="w-5 h-5" />} title="إيقاف وضع المالك" desc="إظهار رسالة التطوير للمستخدمين" onClick={disableOwner} />
          </Section>
        )}

        {/* اشتراك القارئ — بطاقة مميّزة */}
        <a href={RECITER_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-gradient-to-l from-red-600/25 to-card border border-red-500/40 p-3 hover:border-red-400 active:scale-[0.99] transition-all shadow-soft">
          <span className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0"><Youtube className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0"><span className="block font-bold text-foreground">اشترك بقناة القارئ</span><span className="block text-[11px] text-muted-foreground">حاج أيوب أمين على يوتيوب</span></span>
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </a>

        <p className="text-[11px] text-muted-foreground text-center pt-1 leading-relaxed">العمل الكامل دون إنترنت قيد التوسعة تدريجياً.</p>
      </div>

      {showPin && (
        <PinModal mode="verify" title="رمز وليّ الأمر" onSuccess={() => { setShowPin(false); navigate("/parent"); }} onCancel={() => setShowPin(false)} />
      )}

      {pinFlow === "verifyOld" && (
        <PinModal mode="verify" title="أدخل كلمة المرور الحالية" onSuccess={() => setPinFlow("setNew")} onCancel={() => setPinFlow(null)} />
      )}
      {pinFlow === "setNew" && (
        <PinModal mode="set" title="اختر كلمة مرور جديدة (٤ أرقام)" onSuccess={() => { setHasPin(true); setPinFlow(null); toast({ title: "تم حفظ كلمة المرور" }); }} onCancel={() => setPinFlow(null)} />
      )}

      {termsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4" dir="rtl" onClick={() => setTermsOpen(false)}>
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto card-nour p-4 space-y-2 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-accent">بنود الاستخدام</h3>
              <button onClick={() => setTermsOpen(false)} className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center"><X className="w-4 h-4" /></button>
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
    <ol className="space-y-2 text-sm text-foreground leading-relaxed list-decimal pr-5">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ol>
  );
}
