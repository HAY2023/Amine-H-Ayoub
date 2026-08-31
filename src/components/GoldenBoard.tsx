import { useEffect, useState } from "react";
import { X, Crown, Gem, Flame, Trophy, Mail, Lock } from "lucide-react";
import { getGems, getXp, getLevel, getWeeklyXp, getAlias, getOwnedGemItems, isRegistered, registerAccount, resetWeeklyIfDue } from "../data/gamification";
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

interface Row { alias: string; week_xp: number; }

/** اللوحة الذهبية الأسبوعية — تتصفّر كل جمعة + خطاف إنشاء الحساب عند جمع ١٠٠ 💎 */
export default function GoldenBoard({ onClose, openRegister = false }: { onClose: () => void; openRegister?: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [gems, setGems] = useState(getGems());
  const [xp, setXp] = useState(getXp());
  const [showReg, setShowReg] = useState(openRegister || getGems() >= 100 && !isRegistered());
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const alias = getAlias();

  useEffect(() => {
    resetWeeklyIfDue();
    const t = setInterval(() => { setGems(getGems()); setXp(getXp()); }, 1500);
    (async () => {
      if (!hasValidSupabaseKey()) { setRows([]); return; }
      try {
        const { data, error } = await supabase.from("gam_profiles").select("alias,week_xp").order("week_xp", { ascending: false }).limit(20);
        setRows(error || !data ? [] : data as Row[]);
      } catch { setRows([]); }
    })();
    return () => clearInterval(t);
  }, []);

  const register = async () => {
    if (!email.includes("@") || pass.length < 6) { setMsg("أدخل بريداً صحيحاً وكلمة مرور ٦ أحرف على الأقل"); return; }
    setBusy(true); setMsg("");
    const r = await registerAccount(email, pass, alias);
    setBusy(false);
    setMsg(r.message);
    if (r.ok) setTimeout(() => { setShowReg(false); onClose(); }, 2200);
  };

  const myRank = rows ? rows.findIndex(r => r.alias === alias) + 1 : 0;
  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-background/75 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card-nour w-full max-w-lg p-5 space-y-4 animate-fade-up max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-lg text-gradient-gold flex items-center gap-1.5"><Crown className="w-5 h-5 text-accent" /> اللوحة الذهبية</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-full bg-secondary text-sm font-bold">إغلاق ✕</button>
        </div>

        {/* بطاقتي */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-xl bg-secondary border border-border"><Gem className="w-4 h-4 mx-auto text-cyan-500" /><span className="block font-extrabold">{gems}</span><span className="text-[10px] text-muted-foreground">مجوهرات</span></div>
          <div className="p-3 rounded-xl bg-secondary border border-border"><Trophy className="w-4 h-4 mx-auto text-accent" /><span className="block font-extrabold">{xp}</span><span className="text-[10px] text-muted-foreground">XP (مستوى {getLevel()})</span></div>
          <div className="p-3 rounded-xl bg-secondary border border-border"><Flame className="w-4 h-4 mx-auto text-orange-500" /><span className="block font-extrabold text-xs pt-1">{alias}</span><span className="text-[10px] text-muted-foreground">اسمي المستعار</span></div>
        </div>

        {/* الترتيب الأسبوعي */}
        <div className="space-y-1.5">
          <p className="text-xs font-extrabold text-muted-foreground">ترتيب هذا الأسبوع (يتصفّر كل جمعة) — المركز الأول يفوز بـ ١٠٠ 💎</p>
          {rows === null && <p className="text-xs text-muted-foreground p-3">جارٍ التحميل...</p>}
          {rows && rows.length === 0 && (
            <div className="p-4 rounded-xl bg-secondary border border-border text-center space-y-1">
              <p className="font-extrabold text-accent">كن أول الأبطال! 🏆</p>
              <p className="text-xs text-muted-foreground">XP هذا الأسبوع: <b className="text-foreground">{getWeeklyXp()}</b> — اجمع XP من القراءة والألعاب لتصعد اللوحة.</p>
            </div>
          )}
          {rows && rows.slice(0, 10).map((r, i) => (
            <div key={i} className={`flex items-center justify-between p-2.5 rounded-xl border text-sm ${r.alias === alias ? "bg-accent/15 border-accent/50 font-extrabold" : "bg-secondary border-border"}`}>
              <span className="font-bold">{["🥇", "🥈", "🥉"][i] || `${i + 1}.`} {r.alias}</span>
              <span className="font-extrabold text-accent">{r.week_xp} XP</span>
            </div>
          ))}
          {rows && myRank > 10 && <p className="text-xs text-center text-muted-foreground">ترتيبك الحالي: #{myRank}</p>}
          <p className="text-[11px] text-muted-foreground">كنوزك النادرة المملوكة: {getOwnedGemItems().length}</p>
        </div>

        {/* خطاف التسجيل — عند ١٠٠ 💎 أو بالاختيار */}
        {showReg && (
          <div className="p-4 rounded-2xl border-2 border-accent/60 bg-accent/10 space-y-2">
            <p className="font-extrabold text-foreground flex items-center gap-1"><Mail className="w-4 h-4 text-accent" /> لقد جمعت ثروة! 💎</p>
            <p className="text-xs text-muted-foreground leading-relaxed">لتجنّب ضياع {gems} مجوهرة وللدخول في اللوحة الذهبية الأسبوعية، اطلب من والديك إنشاء حساب الآن — سترحل نقاطك ومجوهراتك بالكامل.</p>
            <input dir="ltr" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 rounded-xl bg-card border border-border text-sm" />
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute top-3 right-3 text-muted-foreground" />
              <input dir="ltr" type="password" placeholder="كلمة المرور (٦ أحرف+)" value={pass} onChange={e => setPass(e.target.value)} className="w-full p-2.5 pr-9 rounded-xl bg-card border border-border text-sm" />
            </div>
            <p className="text-[11px] text-muted-foreground">اسمك في اللوحة: <b className="text-accent">{alias}</b> (يحفظ خصوصيتك)</p>
            {msg && <p className="text-xs font-bold text-accent">{msg}</p>}
            <button onClick={register} disabled={busy} className="btn-gold w-full py-2.5 rounded-xl font-bold text-sm">{busy ? "جارٍ الإنشاء..." : "التالي — إنشاء الحساب"}</button>
          </div>
        )}
        {!showReg && !isRegistered() && (
          <button onClick={() => setShowReg(true)} className="w-full py-2 rounded-xl bg-secondary border border-border text-sm font-bold text-secondary-foreground">إنشاء حساب لحفظ ثروتي 💎</button>
        )}
      </div>
    </div>
  );
}
