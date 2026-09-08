/**
 * بوابة السؤال اليومي في منطقة الألعاب:
 * - يُطرح سؤال صعب عن السورة الحالية مرة كل يوم.
 * - الإجابة الصحيحة → الانتقال إلى السورة التالية + نقاط مكافأة مجانية.
 * - عند بلوغ كل درجة (عدد السور المحدد من الإعدادات — افتراضي 5) يحصل الطفل على لقب جديد
 *   + يمكنه تحميل شهادة (الاسم والرقم قابلان للتعديل قبل التحميل).
 * - إدخال كود نقاط مجانية لمرة واحدة (يُنشأ من admin.html).
 * - زر يفتح لوحة التحكم الخارجية admin.html.
 */
import { useEffect, useMemo, useState } from "react";
import { Award, Download, Gift, X, Trophy } from "lucide-react";
import { getProfile, setCurrentSurah, addCoins, formatCoins, getActiveId, getCoins } from "../data/kidsProfile";
import { getAllSurahs } from "../data/quranData";
import { getTitlesConfig, levelForCompleted, titleForLevel, redeemOneTimeCode } from "../data/titles";
import { toast } from "../hooks/use-toast";

// مرتبة بترتيب المصحف — التقدّم دائماً إلى السورة التالية للأمام
const SURAHS = [...getAllSurahs()].sort((a, b) => a.number - b.number);
const CORRECT_REWARD = 10; // نقاط مجانية عند كل إجابة صحيحة

interface Q { text: string; options: string[]; correct: number }

/** سؤال الانتقال الصعب: عدد آيات السورة مع خيارات قريبة جداً (فارق 1-7 فقط) — لا يمكن التخمين بسهولة. */
function buildQuestion(currentSurah: number): Q {
  const idx = Math.max(0, SURAHS.findIndex(s => s.number === currentSurah));
  const cur = SURAHS[idx] || SURAHS[0];
  // مشتتات قريبة جداً من العدد الحقيقي: نفس العدد ± 1 إلى 7
  const candidates = new Set<number>();
  while (candidates.size < 3) {
    const delta = Math.floor(Math.random() * 7) + 1; // 1..7
    const v = Math.random() < 0.5 ? cur.ayahCount - delta : cur.ayahCount + delta;
    if (v > 0 && v !== cur.ayahCount) candidates.add(v);
  }
  const options = [String(cur.ayahCount), ...Array.from(candidates).map(String)];
  const correctIdx = Math.floor(Math.random() * options.length);
  [options[0], options[correctIdx]] = [options[correctIdx], options[0]];
  return { text: `سؤال الانتقال (صعب 🧠): كم عدد آيات سورة ${cur.name}؟`, options, correct: correctIdx };
}

const gateKey = (pid: string) => `mushaf:dailyGate:${new Date().toISOString().slice(0, 10)}:${pid}`;

/** هل فُتحت الألعاب اليوم؟ (يقرأ تقدّم الملف النشط) */
function isGamesUnlocked(): boolean {
  try {
    const id = getActiveId() || "default";
    const raw = localStorage.getItem(`mushaf:kidsProgress:v1:${id}`);
    if (!raw) return true;
    const p = JSON.parse(raw);
    return !!p?.unlocked;
  } catch { return true; }
}

export default function DailyGateModal() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState<Q | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [certLevel, setCertLevel] = useState(0);
  const [certName, setCertName] = useState("");
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");

  const profile = getProfile();
  const cfg = getTitlesConfig();
  const completedIdx = useMemo(() => {
    const i = SURAHS.findIndex(s => s.number === (profile.currentSurah || 1));
    return i >= 0 ? i : 0;
  }, [profile.currentSurah]);
  const currentLevel = levelForCompleted(completedIdx, cfg);

  useEffect(() => {
    const pid = getActiveId() || "default";
    if (localStorage.getItem(gateKey(pid))) return;
    const tryOpen = () => {
      if (!localStorage.getItem(gateKey(getActiveId() || "default")) && isGamesUnlocked()) {
        setQuestion(buildQuestion(getProfile().currentSurah || 1));
        setOpen(true);
      }
    };
    tryOpen();
    window.addEventListener("mushaf:games_unlocked", tryOpen);
    return () => window.removeEventListener("mushaf:games_unlocked", tryOpen);
  }, []);

  const pick = (i: number) => {
    if (picked !== null || !question) return;
    setPicked(i);
    localStorage.setItem(gateKey(getActiveId() || "default"), "1");
    if (i === question.correct) {
      // التقدّم للأمام بترتيب المصحف: السورة التالية دائماً (الفاتحة ← التالية ← ... وهكذا)
      const next = SURAHS.find(s => s.number > (profile.currentSurah || 1)) || SURAHS[SURAHS.length - 1];
      if (next) setCurrentSurah(next.number);
      addCoins(CORRECT_REWARD);
      toast({ title: `🎉 إجابة صحيحة! انتقلت إلى سورة ${next?.name}`, description: `+${CORRECT_REWARD} ⭐ نقاط مجانية` });
      const nextIdx = Math.max(0, SURAHS.findIndex(s => s.number === (next?.number ?? profile.currentSurah)));
      const newLevel = levelForCompleted(nextIdx, cfg);
      if (newLevel > currentLevel) {
        setCelebrate(titleForLevel(newLevel, cfg));
        setCertLevel(newLevel);
        setCertName(profile.name || "");
        window.dispatchEvent(new Event("mushaf:activeprofile"));
      }
    } else {
      toast({ title: "إجابة غير صحيحة — حاول غداً 💪" });
    }
  };

  const redeem = () => {
    // تحقق كل مستخدم: استبدال أكواد النقاط متاح للمستخدمين الموثّقين فقط (يُوثّقهم المشرف من admin.html)
    if (!getProfile().verified) {
      setCodeMsg("⛔ حسابك غير موثّق — اطلب من المشرف توثيق حسابك أولاً");
      return;
    }
    const amount = redeemOneTimeCode(code);
    if (amount < 0) { setCodeMsg("❌ كود غير صالح أو مستخدماً من قبل"); return; }
    addCoins(amount);
    setCodeMsg(`✅ تم إضافة ${amount} ⭐ مجاناً!`);
    setCode("");
    toast({ title: `🎁 +${amount} ⭐ نقاط مجانية` });
  };

  const downloadCertificate = (level: number, name: string) => {
    const title = titleForLevel(level, cfg);
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>شهادة</title>
<style>body{font-family:'Amiri',serif;background:#fdf6e3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{border:10px double #b8860b;border-radius:24px;padding:60px 80px;text-align:center;background:#fff;box-shadow:0 0 60px rgba(184,134,11,.4)}
h1{color:#8b6914;font-size:32px}h2{font-size:44px;color:#c0392b;margin:30px 0}p{font-size:22px;color:#444}
.badge{font-size:26px;color:#fff;background:linear-gradient(90deg,#b8860b,#daa520);border-radius:50px;padding:10px 40px;display:inline-block;margin:20px 0}
.num{font-size:20px;color:#666;margin-top:30px}</style></head><body>
<div class="c"><h1>${cfg.certificateHeader}</h1><p>تشهد إدارة التطبيق أن الطفل</p><h2>${name || "الطفل المتميز"}</h2>
<p>قد أتمّ بنجاح <b>${level * cfg.surahsPerLevel} سورة/جزءاً</b> ونال اللقب</p>
<div class="badge">🏅 ${title}</div>
<p class="num">رقم الشهادة: CERT-${String(level).padStart(3, "0")}-${new Date().getFullYear()} — التاريخ: ${new Date().toLocaleDateString("ar")}</p></div></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `شهادة-${name || "الطفل"}-${level}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // منع المستخدم المحظور من دخول منطقة الألعاب
  if (getProfile().blocked) {
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border-2 border-rose-500/50 p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-500 text-3xl">🚫</div>
          <h2 className="text-xl font-extrabold text-foreground">تم إيقاف حسابك مؤقتاً</h2>
          <p className="text-sm text-muted-foreground font-bold">راجع وليّ الأمر أو المشرف لإعادة تفعيل الحساب.</p>
        </div>
      </div>
    );
  }

  if (!open) {
    if (celebrate) {
      return (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-amber-900/95 to-yellow-900/95 rounded-3xl shadow-2xl border-2 border-amber-400/50 p-8 text-center space-y-5 animate-fade-up">
            <div className="mx-auto w-20 h-20 rounded-full bg-amber-400/20 border border-amber-300/50 flex items-center justify-center text-amber-300 animate-bounce"><Award className="w-12 h-12" /></div>
            <h2 className="text-2xl font-extrabold text-amber-300">🏅 لقب جديد: {celebrate}</h2>
            <p className="text-amber-100 text-sm">ما شاء الله! أتممت {certLevel * cfg.surahsPerLevel} سورة/جزء ونلت لقب جديد.</p>
            <input value={certName} onChange={e => setCertName(e.target.value)} placeholder="اكتب اسمك للشهادة" className="w-full px-4 py-2 rounded-xl bg-black/30 border border-amber-400/40 text-amber-100 text-center font-bold" />
            <button onClick={() => downloadCertificate(certLevel, certName)} className="w-full p-3 rounded-xl bg-gradient-to-l from-amber-400 to-amber-500 text-black font-bold flex items-center justify-center gap-2 active:scale-95"><Download className="w-5 h-5" /> تحميل الشهادة</button>
            <button onClick={() => setCelebrate(null)} className="w-full p-2.5 rounded-xl bg-white/10 text-amber-200 font-bold hover:bg-white/20">متابعة</button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border p-6 space-y-4 animate-fade-up">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-accent" /> سؤال اليوم</h3>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent">🏅 لقبك: {titleForLevel(currentLevel, cfg)}</span>
        </div>

        {question && (
          <>
            <p className="text-sm font-bold text-foreground text-center">{question.text}</p>
            <div className="grid grid-cols-2 gap-2">
              {question.options.map((op, i) => (
                <button key={i} onClick={() => pick(i)} disabled={picked !== null}
                  className={`p-3 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                    picked === null ? "bg-secondary hover:bg-accent/20 border-border"
                    : i === question.correct ? "bg-emerald-500/20 border-emerald-500 text-emerald-600"
                    : i === picked ? "bg-rose-500/20 border-rose-500 text-rose-500"
                    : "bg-secondary/50 border-border opacity-50"}`}>
                  {op}
                </button>
              ))}
            </div>
          </>
        )}

        {picked !== null && question && (
          <p className={`text-center text-sm font-bold ${picked === question.correct ? "text-emerald-500" : "text-rose-500"}`}>
            {picked === question.correct ? "أحسنت! انتقلت للسورة التالية 🎉" : "لا بأس، أعد المحاولة غداً 💪"}
          </p>
        )}

        {/* كود النقاط المجانية (مرة واحدة) */}
        <div className="bg-secondary/40 rounded-2xl p-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> كود نقاط مجانية (يُستخدم مرة واحدة)</p>
          <div className="flex gap-2">
            <input value={code} onChange={e => { setCode(e.target.value); setCodeMsg(""); }} placeholder="مثال: ABC12345"
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm font-bold text-center" />
            <button onClick={redeem} disabled={!code.trim()} className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-sm active:scale-95 disabled:opacity-40 flex items-center gap-1"><Gift className="w-4 h-4" /> تفعيل</button>
          </div>
          {codeMsg && <p className="text-xs font-bold text-center text-accent">{codeMsg}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-muted-foreground font-bold flex items-center gap-1">رصيدك: {formatCoins(getCoins())} ⭐</span>
          <button onClick={() => setOpen(false)} className="p-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-destructive/20" title="إغلاق"><X className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}