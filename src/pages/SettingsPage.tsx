import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Moon, Sun, Baby, ChevronLeft, X, BarChart3, Wrench, User, GraduationCap, BookOpen, Lock, Settings as SettingsIcon, MessageSquare, Delete, Headphones, Power } from "lucide-react";
import { isMushafDevEnabled, setMushafDev, closeTauriApp } from "../utils/tauriUtils";
import { getAppMode, setAppMode, getProfiles, addProfile, kidsHidden, setKidsHidden, setPureMode, isPureMode, type AppMode } from "../data/kidsProfile";


import PinModal from "../components/PinModal";
import ParentalGateModal from "../components/ParentalGateModal";
import AdminGamesModal from "../components/AdminGamesModal";
import SupportModal from "../components/SupportModal";
import { toast } from "../hooks/use-toast";

import { hasKidsPin, setKidsPin, removeKidsPin, setKidsLocked, isKidsMode } from "../data/kidsLock";
import AppFooter from "../components/AppFooter";
import AppNav from "../components/AppNav";
import { isBackgroundAudioEnabled, setBackgroundAudioEnabled } from "../utils/backgroundAudio";
import { applyTheme, getTheme } from "../utils/theme";
const THEME_KEY = "mushaf:theme";

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
  const [showPin, setShowPin] = useState(false);
  const [showGate, setShowGate] = useState(false);

  const [owner, setOwner] = useState(isMushafDevEnabled);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  useEffect(() => { const h = () => setOwner(isMushafDevEnabled()); window.addEventListener("mushaf:ownermode", h); return () => window.removeEventListener("mushaf:ownermode", h); }, []);
  const disableOwner = () => { setMushafDev(false); setOwner(false); toast({ title: "أُوقف وضع المالك", description: "عادت رسالة التطوير للمستخدمين" }); };
  const [hideKids, setHideKids] = useState(kidsHidden);
  const [showSplash, setShowSplash] = useState<AppMode | false>(false);
  const toggleHideKids = () => { 
    const next = !kidsHidden(); 
    setKidsHidden(next); 
    setPureMode(next); // تفعيل الوضع العادي الصارم عند إخفاء الأطفال
    setHideKids(next); 
    if (next) {
      toast({ title: "أُخفي ركن الأطفال والألعاب بالكامل" });
    } else {
      setShowSplash("kids");
      setTimeout(() => navigate("/games"), 2500);
    }
  };
  // كلمة المرور (رمز وليّ الأمر): تعيين/تغيير/إزالة من الإعدادات
  const [hasPin, setHasPin] = useState(hasKidsPin);
  const [pinFlow, setPinFlow] = useState<null | "verifyOld" | "setNew">(null);
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const [bgAudio, setBgAudio] = useState(isBackgroundAudioEnabled);
  const changePin = () => setPinFlow(hasKidsPin() ? "verifyOld" : "setNew");
  const removePin = () => { removeKidsPin(); setHasPin(false); toast({ title: "أُزيلت كلمة المرور" }); };

  const changeMode = (m: AppMode, style?: "pure" | "flexible") => {
    if (m === "kids" && kidsHidden()) {
      setKidsHidden(false);
      setPureMode(false); // تعطيل الوضع العادي عند التبديل للأطفال
      setHideKids(false);
    }
    // تحديد النمط لوليّ الأمر: مرن (ألعاب متاحة) أو صارم (بلا ألعاب)
    if (m === "parent") {
      const parentStyle = style ?? (kidsHidden() ? "pure" : "flexible");
      setPureMode(parentStyle === "pure");
      setKidsHidden(parentStyle === "pure");
      setHideKids(parentStyle === "pure");
    }
    setShowSplash(m);
    setTimeout(() => {
      setShowSplash(false);
      if (m === "kids" && !hasKidsPin()) {
         setPendingMode("kids");
         setPinFlow("setNew");
      } else {
         setMode(m); setAppMode(m);
         if (m === "kids") setKidsLocked(true);
         if (m === "parent") setKidsLocked(false);
         if (m === "kids" && getProfiles().length === 0) addProfile({ name: "طفلي" });
         const parentLabel = kidsHidden() ? "وضع صارم — تلاوات فقط" : "وضع مرن — تلاوات مع الألعاب";
         toast({ title: m === "parent" ? parentLabel : "وضع الأطفال" });
         if (m === "kids") navigate("/games");     // الانتقال لركن الأطفال بعد تجهيز الوضع
         if (m === "parent") navigate("/audio");   // الانتقال لواجهة وليّ الأمر (التلاوات)
      }
    }, 4000);
  };

  useEffect(() => { applyTheme(theme); try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ } }, [theme]);
  useEffect(() => {
    const handleAppMode = () => setMode(getAppMode());
    window.addEventListener("mushaf:appmode", handleAppMode);
    return () => window.removeEventListener("mushaf:appmode", handleAppMode);
  }, []);
  // حماية: إذا كان التطبيق في وضع الأطفال نطلب التحقق (رمز أو تحدي حسابي) قبل عرض الإعدادات.
  useEffect(() => {
    if (!isKidsMode()) return;
    // إذا تم التحقق للتوّ من رمز وليّ الأمر في صفحة أخرى (السماع/المصحف) لا نكرّر السؤال.
    try {
      if (sessionStorage.getItem("mushaf:settingsUnlocked") === "1") {
        sessionStorage.removeItem("mushaf:settingsUnlocked");
        return;
      }
    } catch { /* ignore */ }
    if (!hasKidsPin()) {
      setShowGate(true);
      return;
    }
    setShowPin(true);
  }, [navigate]);





  return (
    <div className="min-h-screen page-nour text-foreground" dir="rtl">
      {showSplash && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in duration-500">
          <div className="w-24 h-24 mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full bg-accent/20 flex items-center justify-center">
              {showSplash === "kids" ? <Baby className="w-10 h-10 text-accent animate-pulse" /> : <User className="w-10 h-10 text-accent animate-pulse" />}
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">
            {showSplash === "kids" ? "جاري تجهيز ركن الأطفال..." : "جاري التبديل لوضع وليّ الأمر..."}
          </h2>
          <p className="text-muted-foreground">
            {showSplash === "kids" ? "لحظات ونبدأ المرح والتعلم" : "جاري إعداد واجهة الاستخدام"}
          </p>
        </div>
      )}
      {/* وهج ذهبي زخرفي علوي */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-accent/10 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto max-w-md px-4 py-5 space-y-5">
        <AppNav />
        <header className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex h-10 items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-4 text-sm font-bold border border-border hover:brightness-95 active:scale-95 transition-all shadow-soft">
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

        {/* ===== وضع الاستخدام — الأهم أولاً، ظاهر دائماً ليمكن التبديل في أي وقت ===== */}
        <Section label="وضع الاستخدام">
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {([
                { m: "flex" as const, Icon: ArrowRight, label: "مرن", desc: "لي أنا + ألعاب متاحة" },
                { m: "parent" as AppMode, Icon: User, label: "صارم", desc: "لي أنا فقط — بلا ألعاب" },
                { m: "kids" as AppMode, Icon: Baby, label: "أطفال", desc: "ركن آمن للأطفال" },
              ]).map(o => {
                const active = o.m === "flex" ? (!isPureMode() && appMode === "parent" && !hideKids) : appMode === o.m;
                return (
                  <button key={o.m} onClick={() => o.m === "flex" ? changeMode("parent", "flexible") : changeMode(o.m)}
                    className={`flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-bold border transition-all ${active ? "border-accent bg-accent/15 text-accent shadow-soft" : "border-border bg-muted text-muted-foreground hover:border-accent/40"}`}>
                    <o.Icon className="w-5 h-5" /> {o.label}
                    <span className="text-[9px] font-normal text-center leading-tight px-1">{o.desc}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              «مرن»: تلاوات مع بقاء زر الألعاب متاحاً. «صارم»: واجهة تلاوات خالصة تماماً. «أطفال»: ركن أطفال مقفل برمز.
            </p>
          </div>
        </Section>

        <Section label="حماية وركن الأطفال">
          <Item
            icon={<Baby className="w-5 h-5 text-accent" />}
            title={hideKids ? "إظهار ركن الأطفال والألعاب" : "إخفاء ركن الأطفال والألعاب"}
            desc={hideKids ? "ركن الأطفال مخفيّ حالياً عن الواجهة — اضغط لإظهاره" : "تفعيل/إخفاء ركن الأطفال والألعاب من جميع الواجهات"}
            onClick={toggleHideKids}
            right={<span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${hideKids ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>{hideKids ? "مخفيّ" : "ظاهر"}</span>}
          />
          <Item
            icon={<Lock className="w-5 h-5 text-accent" />}
            title={hasPin ? "تغيير رمز وليّ الأمر" : "تعيين رمز وليّ الأمر"}
            desc={hasPin ? "غير رمز الوصول إلى إعدادات ولي الأمر." : "عيّن رمزاً لحماية الإعدادات والانتقال إلى وضع الأطفال."}
            onClick={changePin}
          />
          {hasPin && (
            <Item
              icon={<Delete className="w-5 h-5 text-destructive" />}
              title="إزالة رمز وليّ الأمر"
              desc="لن يُطلب الرمز بعد ذلك للوصول إلى الإعدادات." 
              onClick={removePin}
            />
          )}
          <Item
            icon={<User className="w-5 h-5 text-accent" />}
            title="لوحة ولي الأمر"
            desc="اطّلع على تقدّم الأطفال وإعداداتهم." 
            onClick={() => navigate("/parent")}
          />
        </Section>

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

        {/* ===== الصوت والتلاوة ===== */}
        <Section label="الصوت والتلاوة">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-secondary text-accent flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </span>
              <div>
                <span className="block font-bold">تشغيل في الخلفية</span>
                <span className="block text-[11px] text-muted-foreground">مواصلة التلاوة عند قفل الشاشة أو الخروج من التطبيق</span>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !bgAudio;
                setBgAudio(next);
                setBackgroundAudioEnabled(next);
                toast({ title: next ? "تم تفعيل التشغيل في الخلفية ✅" : "تم تعطيل التشغيل في الخلفية" });
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 ${
                bgAudio ? "bg-accent text-accent-foreground shadow-soft" : "bg-secondary text-muted-foreground"
              }`}
            >
              {bgAudio ? "مفعّل ✓" : "معطّل ✗"}
            </button>
          </div>
        </Section>

        {/* ===== التطبيق ===== */}
        <Section label="التطبيق">
          <Item icon={<MessageSquare className="w-5 h-5 text-accent" />} title="تواصل مع الدعم الفني والإبلاغ" desc="إرسال مشكلة تقنية أو اقتراح لفريق العمل" onClick={() => setShowSupport(true)} />
          <Item icon={<Power className="w-5 h-5 text-destructive" />} title="إغلاق التطبيق والخروج" desc="إغلاق نافذة التطبيق بالكامل وحفظ الجلسة" onClick={() => closeTauriApp()} />
        </Section>

        {/* ===== أدوات المالك (تظهر فقط في وضع المالك) ===== */}
        {owner && (
          <Section label="أدوات المالك (قيد التطوير)">
            <Item icon={<Wrench className="w-5 h-5" />} title="أدمن الألعاب" desc="إدارة ألعاب السيرفر: الرابط، الإخفاء، والتحميل للأجهزة" onClick={() => setShowAdmin(true)} />
            <Item icon={<Lock className="w-5 h-5" />} title="إيقاف وضع المالك" desc="إظهار رسالة التطوير للمستخدمين" onClick={disableOwner} />
          </Section>
        )}



        <p className="text-[11px] text-muted-foreground text-center pt-1 leading-relaxed">العمل الكامل دون إنترنت قيد التوسعة تدريجياً.</p>
      </div>

      {showGate && (
        <ParentalGateModal
          title="منطقة الوالدين — الدخول إلى الإعدادات"
          onSuccess={() => setShowGate(false)}
          onCancel={() => { setShowGate(false); navigate("/audio"); }}
        />
      )}

      {showPin && (
        <PinModal
          mode="verify"
          title="رمز وليّ الأمر"
          onSuccess={() => {
            setShowPin(false);
          }}
          onCancel={() => {
            setShowPin(false);
            navigate("/audio");
          }}
        />
      )}

      {pinFlow === "verifyOld" && (
        <PinModal mode="verify" title="أدخل كلمة المرور الحالية" onSuccess={() => setPinFlow("setNew")} onCancel={() => setPinFlow(null)} />
      )}
      {pinFlow === "setNew" && (
        <PinModal mode="set" title="اختر كلمة مرور جديدة (٤ أرقام)" onSuccess={() => { 
          setHasPin(true); 
          setPinFlow(null); 
          toast({ title: "تم حفظ كلمة المرور" });
          if (pendingMode === "kids") {
             setMode("kids"); setAppMode("kids");
             setKidsLocked(true);
             if (getProfiles().length === 0) addProfile({ name: "طفلي" });
             setPendingMode(null);
             toast({ title: "وضع الأطفال" });
          }
        }} onCancel={() => { setPinFlow(null); setPendingMode(null); }} />
      )}

      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      {showAdmin && <AdminGamesModal onClose={() => setShowAdmin(false)} />}
      <AppFooter />
    </div>
  );
}
