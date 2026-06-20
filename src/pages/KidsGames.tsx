import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, RefreshCw, BookOpen, Lock, Settings, Headphones, ListOrdered, LayoutGrid, Scale, Trophy, Gift, Star, Clock, Check, Hash, Grid3x3 } from "lucide-react";
import { getAllSurahs } from "../data/quranData";
import { getSurahAudioUrl, hasCloudAudio } from "../data/audioUrls";
import { getProfile, saveProfile, getProgress, addPlayMinutes, grantMorePlay, getProfiles, KidsProfile } from "../data/kidsProfile";
import { isKidsMode, setKidsLocked, hasKidsPin } from "../data/kidsLock";
import PinModal from "../components/PinModal";
import { toast } from "../hooks/use-toast";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const SURAHS = getAllSurahs();
const CLOUD = SURAHS.filter(s => hasCloudAudio(s.number));

const ScoreBar = ({ score }: { score: number }) => (
  <p className="text-amber-300 font-bold flex items-center justify-center gap-1"><Star className="w-4 h-4 fill-amber-300" /> {score}</p>
);

// ─────────── ١) استمع واختر ───────────
function ListenPick() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const newRound = () => { const o = shuffle(CLOUD).slice(0, 3); return { opts: o, answer: o[Math.floor(Math.random() * o.length)] }; };
  const [round, setRound] = useState(newRound);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const play = (n: number) => { const a = audioRef.current; if (!a) return; a.src = audioPath(n); a.currentTime = 0; a.play().catch(() => {}); };
  const choose = (n: number) => {
    if (n === round.answer.number) { setScore(s => s + 1); setWrong(null); const r = newRound(); setRound(r); setTimeout(() => play(r.answer.number), 250); }
    else setWrong(n);
  };
  return (
    <div className="space-y-4 text-center">
      <audio ref={audioRef} />
      <p className="text-slate-300 text-sm flex items-center justify-center gap-1"><Headphones className="w-4 h-4" /> استمع ثم اختر اسم السورة</p>
      <button onClick={() => play(round.answer.number)} className="mx-auto w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg active:scale-95"><Play className="w-10 h-10" /></button>
      <div className="grid gap-2">
        {round.opts.map(s => (
          <button key={s.number} onClick={() => choose(s.number)} className={`p-4 rounded-xl font-bold text-lg border active:scale-95 transition-colors ${wrong === s.number ? "bg-red-500/20 border-red-500/60 text-red-200" : "bg-slate-700/70 border-slate-600 text-white hover:border-amber-500/50"}`}>{s.name}</button>
        ))}
      </div>
      <ScoreBar score={score} />
    </div>
  );
}

// ─────────── ٢) رتّب الآيات ───────────
function OrderAyahs() {
  const pool = SURAHS.filter(s => s.ayahCount >= 3 && s.ayahCount <= 8);
  const makeSurah = () => pool[Math.floor(Math.random() * pool.length)] || SURAHS[0];
  const [surah, setSurah] = useState(makeSurah);
  const [order, setOrder] = useState<number[]>(() => shuffle(Array.from({ length: surah.ayahCount }, (_, i) => i + 1)));
  const [nextNum, setNextNum] = useState(1);
  const done = nextNum > surah.ayahCount;
  const reset = () => { const s = makeSurah(); setSurah(s); setOrder(shuffle(Array.from({ length: s.ayahCount }, (_, i) => i + 1))); setNextNum(1); };
  const tap = (n: number) => {
    if (n !== nextNum) { toast({ title: "حاول مرة أخرى" }); return; }
    setNextNum(n + 1);
    if (n === surah.ayahCount) toast({ title: "أحسنت، رتّبتها صحيحاً" });
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-slate-300 text-sm">رتّب آيات <b className="text-amber-300">{surah.name}</b> بالترتيب الصحيح</p>
      <div className="grid grid-cols-4 gap-2">
        {order.map(n => (
          <button key={n} onClick={() => tap(n)} disabled={n < nextNum} className={`aspect-square rounded-xl font-extrabold text-2xl border active:scale-95 transition-colors ${n < nextNum ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-700/70 border-slate-600 text-white"}`}>{n}</button>
        ))}
      </div>
      {done && <button onClick={reset} className="mx-auto px-5 py-2 rounded-xl bg-amber-500 text-black font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> سورة أخرى</button>}
    </div>
  );
}

// ─────────── ٣) لعبة الذاكرة ───────────
function MemoryGame({ pairs = 4 }: { pairs?: number }) {
  const build = () => { const picked = shuffle(SURAHS).slice(0, pairs); return shuffle([...picked, ...picked].map((s, i) => ({ id: i, num: s.number, name: s.name }))); };
  const [cards, setCards] = useState(build);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const flip = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.includes(cards[i].num)) return;
    const nf = [...flipped, i];
    setFlipped(nf);
    if (nf.length === 2) {
      if (cards[nf[0]].num === cards[nf[1]].num) { setMatched(m => [...m, cards[nf[0]].num]); setFlipped([]); }
      else setTimeout(() => setFlipped([]), 800);
    }
  };
  const won = matched.length === pairs;
  return (
    <div className="space-y-3 text-center">
      <p className="text-slate-300 text-sm">اقلب البطاقات وطابق السور المتشابهة</p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c, i) => {
          const show = flipped.includes(i) || matched.includes(c.num);
          return <button key={c.id} onClick={() => flip(i)} className={`aspect-square rounded-lg text-[11px] font-bold flex items-center justify-center p-1 border active:scale-95 transition-colors ${show ? "bg-white text-slate-800 border-white" : "bg-slate-700/70 border-slate-600 text-slate-400"}`}>{show ? c.name : <LayoutGrid className="w-5 h-5" />}</button>;
        })}
      </div>
      {won && <button onClick={() => { setCards(build()); setMatched([]); setFlipped([]); }} className="mx-auto px-5 py-2 rounded-xl bg-amber-500 text-black font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> العب مجدداً</button>}
    </div>
  );
}

// ─────────── ٤) أيّهما أكثر آيات ───────────
function WhichMore() {
  const pair = () => { const t = shuffle(SURAHS).slice(0, 2); return (t[0].ayahCount === t[1].ayahCount) ? shuffle(SURAHS).slice(0, 2) : t; };
  const [two, setTwo] = useState(pair);
  const [score, setScore] = useState(0);
  const choose = (s: typeof SURAHS[number]) => {
    const other = two.find(x => x.number !== s.number)!;
    if (s.ayahCount >= other.ayahCount) { setScore(x => x + 1); toast({ title: `صحيح — ${s.name}: ${s.ayahCount} آية` }); }
    else toast({ title: `${other.name} أكثر (${other.ayahCount} آية)`, variant: "destructive" });
    setTwo(pair());
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-slate-300 text-sm">أيّ سورة عدد آياتها أكثر؟</p>
      <div className="grid grid-cols-2 gap-3">
        {two.map(s => (
          <button key={s.number} onClick={() => choose(s)} className="p-6 rounded-xl bg-slate-700/70 border border-slate-600 hover:border-amber-500/50 text-white font-bold text-xl active:scale-95">{s.name}</button>
        ))}
      </div>
      <ScoreBar score={score} />
    </div>
  );
}

// ─────────── ٥) اختبار قرآني ───────────
function Quiz() {
  const make = () => {
    const s = SURAHS[Math.floor(Math.random() * SURAHS.length)];
    const others = Array.from(new Set(shuffle(SURAHS).map(x => x.ayahCount).filter(c => c !== s.ayahCount))).slice(0, 3);
    return { s, opts: shuffle([s.ayahCount, ...others]) };
  };
  const [q, setQ] = useState(make);
  const [score, setScore] = useState(0);
  const answer = (n: number) => {
    if (n === q.s.ayahCount) { setScore(x => x + 1); toast({ title: "إجابة صحيحة" }); }
    else toast({ title: `الصحيح: ${q.s.ayahCount} آية`, variant: "destructive" });
    setQ(make());
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-white text-lg font-bold">كم عدد آيات سورة <span className="text-amber-300">{q.s.name}</span>؟</p>
      <div className="grid grid-cols-2 gap-3">
        {q.opts.map((n, i) => (
          <button key={i} onClick={() => answer(n)} className="p-5 rounded-xl bg-slate-700/70 border border-slate-600 hover:border-amber-500/50 text-white font-extrabold text-2xl active:scale-95">{n}</button>
        ))}
      </div>
      <ScoreBar score={score} />
    </div>
  );
}

// ─────────── ٦) عدّ الآيات (اختر السورة بعدد آياتها) ───────────
function CountMatch() {
  const make = () => {
    const s = SURAHS[Math.floor(Math.random() * SURAHS.length)];
    const wrong = shuffle(SURAHS.filter(x => x.number !== s.number)).slice(0, 2);
    return { s, opts: shuffle([s, ...wrong]) };
  };
  const [q, setQ] = useState(make);
  const [score, setScore] = useState(0);
  const choose = (n: number) => {
    if (n === q.s.number) { setScore(x => x + 1); toast({ title: "إجابة صحيحة" }); }
    else toast({ title: `الصحيح: ${q.s.name}`, variant: "destructive" });
    setQ(make());
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-white text-lg font-bold">أي سورة عدد آياتها <span className="text-amber-300">{q.s.ayahCount}</span>؟</p>
      <div className="grid gap-2">
        {q.opts.map(s => (
          <button key={s.number} onClick={() => choose(s.number)} className="p-4 rounded-xl bg-slate-700/70 border border-slate-600 hover:border-amber-500/50 text-white font-bold text-lg active:scale-95">{s.name}</button>
        ))}
      </div>
      <ScoreBar score={score} />
    </div>
  );
}

const MemoryHard = () => <MemoryGame pairs={6} />;

const GAMES = [
  { key: "listen", name: "استمع واختر", age: "٤-٦", ageMin: 4, Icon: Headphones, tint: "bg-emerald-500/20 text-emerald-300", Comp: ListenPick },
  { key: "order", name: "رتّب الآيات", age: "٥-٧", ageMin: 5, Icon: ListOrdered, tint: "bg-sky-500/20 text-sky-300", Comp: OrderAyahs },
  { key: "memory", name: "لعبة الذاكرة", age: "٦-٩", ageMin: 6, Icon: LayoutGrid, tint: "bg-violet-500/20 text-violet-300", Comp: MemoryGame },
  { key: "more", name: "أيّهما أكثر", age: "٩-١٢", ageMin: 9, Icon: Scale, tint: "bg-amber-500/20 text-amber-300", Comp: WhichMore },
  { key: "count", name: "عدّ الآيات", age: "٩-١٢", ageMin: 9, Icon: Hash, tint: "bg-teal-500/20 text-teal-300", Comp: CountMatch },
  { key: "memhard", name: "ذاكرة متقدّمة", age: "١٠-١٣", ageMin: 10, Icon: Grid3x3, tint: "bg-indigo-500/20 text-indigo-300", Comp: MemoryHard },
  { key: "quiz", name: "اختبار قرآني", age: "١٢-١٥", ageMin: 12, Icon: Trophy, tint: "bg-rose-500/20 text-rose-300", Comp: Quiz },
];

export default function KidsGames() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [profile, setProfile] = useState(getProfile);
  const [progress, setProgress] = useState(getProgress);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<KidsProfile>(profile);
  const [pinAction, setPinAction] = useState<null | "settings" | "continue" | "exit" | "setread">(null);

  useEffect(() => {
    const refresh = () => { setProfile(getProfile()); setProgress(getProgress()); };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("mushaf:games_unlocked", refresh);
    window.addEventListener("mushaf:play_expired", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("mushaf:games_unlocked", refresh); window.removeEventListener("mushaf:play_expired", refresh); };
  }, []);

  const unlocked = progress.unlocked || profile.goalMinutes <= 0;
  const expired = progress.playExpired;
  const canPlay = unlocked && !expired;

  // عدّاد وقت اللعب أثناء التواجد في ركن الأطفال
  useEffect(() => {
    if (!canPlay || profile.playMinutes <= 0) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const { progress: np, justExpired } = addPlayMinutes(1);
      setProgress(np);
      if (justExpired) setActive(null);
    }, 60000);
    return () => clearInterval(id);
  }, [canPlay, profile.playMinutes]);

  const game = GAMES.find(g => g.key === active);
  const matched = GAMES.filter(g => g.ageMin <= profile.age);
  const shownGames = matched.length ? matched : [GAMES[0]];

  const kidsMode = isKidsMode();

  // الرمز الرقمي يحكم: الإعدادات، متابعة اللعب، الخروج من القفل، وتعيين الرمز عند القراءة المقفلة
  const onPinSuccess = () => {
    if (pinAction === "settings") { setDraft(getProfile()); setSettingsOpen(true); }
    else if (pinAction === "continue") { grantMorePlay(); setProgress(getProgress()); }
    else if (pinAction === "exit") { setKidsLocked(false); setPinAction(null); navigate("/"); return; }
    else if (pinAction === "setread") { setKidsLocked(true); setPinAction(null); navigate("/"); return; }
    setPinAction(null);
  };

  const lockAndRead = () => { if (hasKidsPin()) { setKidsLocked(true); navigate("/"); } else setPinAction("setread"); };
  const openSettings = () => { if (hasKidsPin()) setPinAction("settings"); else { setDraft(getProfile()); setSettingsOpen(true); } };
  const saveSettings = () => { saveProfile(draft); setProfile(draft); setSettingsOpen(false); toast({ title: "حُفظت الإعدادات" }); };
  const continuePlay = () => { if (hasKidsPin()) setPinAction("continue"); else { grantMorePlay(); setProgress(getProgress()); } };
  const headerBack = () => { if (active) setActive(null); else if (kidsMode) setPinAction("exit"); else navigate("/"); };

  const pct = Math.min(100, (progress.minutes / Math.max(1, profile.goalMinutes)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={headerBack} className="flex h-10 items-center gap-1 rounded-full bg-slate-700 px-4 text-sm font-bold hover:bg-slate-600 active:scale-95">
            <ArrowRight className="h-4 w-4" /> {active ? "الألعاب" : kidsMode ? "خروج" : "رجوع"}
          </button>
          <h1 className="font-extrabold text-lg text-amber-300">ركن الأطفال</h1>
          {!active ? (
            <button onClick={openSettings} aria-label="إعدادات ولي الأمر" className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center active:scale-95"><Settings className="w-5 h-5" /></button>
          ) : <span className="w-10" />}
        </header>

        {game ? (
          <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4">
            <h2 className="text-center font-bold text-amber-300 mb-4 flex items-center justify-center gap-2"><game.Icon className="w-5 h-5" /> {game.name} <span className="text-xs text-slate-400">(سن {game.age})</span></h2>
            <game.Comp />
          </div>
        ) : (
          <>
            {/* حالة القراءة / اللعب */}
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4 text-center space-y-2">
              <div className="flex flex-col items-center gap-1">
                <span className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${profile.color} flex items-center justify-center text-3xl shadow-lg`}>{profile.avatar}</span>
                <p className="font-bold">{profile.name ? `مرحباً ${profile.name}` : "مرحباً بك"}</p>
                {getProfiles().length > 1 && (
                  <button onClick={() => navigate("/profiles")} className="text-xs font-bold text-amber-300 underline-offset-2 hover:underline">تبديل الطفل</button>
                )}
              </div>
              {!unlocked ? (
                <>
                  <p className="text-sm text-slate-300 flex items-center justify-center gap-1"><Lock className="w-4 h-4" /> اقرأ {profile.goalMinutes} دقيقة لفتح الألعاب</p>
                  <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
                  <p className="text-xs text-slate-400">{progress.minutes} / {profile.goalMinutes} دقيقة</p>
                  <button onClick={() => navigate("/")} className="w-full p-3 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 active:scale-95"><BookOpen className="w-5 h-5" /> اقرأ الآن لفتح الألعاب</button>
                </>
              ) : expired ? (
                <>
                  <p className="text-sm text-amber-300 flex items-center justify-center gap-1"><Clock className="w-4 h-4" /> انتهى وقت اللعب اليوم</p>
                  <p className="text-xs text-slate-400">لمزيد من اللعب يلزم إذن ولي الأمر</p>
                  <button onClick={continuePlay} className="w-full p-3 rounded-xl bg-amber-500 text-black font-bold flex items-center justify-center gap-2 active:scale-95"><Lock className="w-5 h-5" /> متابعة (رمز ولي الأمر)</button>
                </>
              ) : (
                <p className="text-sm text-emerald-300 flex items-center justify-center gap-1"><Gift className="w-4 h-4" /> {profile.reward}{profile.playMinutes > 0 ? ` · وقت اللعب ${Math.max(0, profile.playMinutes - progress.played)} د` : ""}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {shownGames.map(g => (
                <button key={g.key} onClick={() => (canPlay ? setActive(g.key) : navigate("/"))}
                  className={`relative p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 active:scale-95 flex flex-col items-center gap-2 ${!canPlay ? "opacity-60" : ""}`}>
                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${g.tint}`}><g.Icon className="w-7 h-7" /></span>
                  <span className="font-bold text-sm text-white">{g.name}</span>
                  <span className="text-[11px] text-slate-400 bg-slate-700/60 rounded-full px-2 py-0.5">سن {g.age}</span>
                  {!canPlay && <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-2xl"><Lock className="w-7 h-7 text-slate-300" /></span>}
                </button>
              ))}
              <button onClick={lockAndRead} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 active:scale-95 flex flex-col items-center gap-2">
                <span className="w-14 h-14 rounded-2xl bg-slate-700/60 text-slate-200 flex items-center justify-center"><BookOpen className="w-7 h-7" /></span>
                <span className="font-bold text-sm text-white">قراءة مقفلة</span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> بكلمة مرور</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* إعدادات ولي الأمر */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl bg-slate-800 border border-slate-700 p-4 space-y-3">
            <h3 className="font-extrabold text-center text-amber-300 flex items-center justify-center gap-2"><Settings className="w-5 h-5" /> إعدادات ولي الأمر</h3>
            <label className="block text-sm font-bold text-slate-300">اسم الطفل
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white font-normal" />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs font-bold text-slate-300">العمر
                <input type="number" min={3} max={15} value={draft.age} onChange={e => setDraft({ ...draft, age: parseInt(e.target.value, 10) || 6 })} className="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white font-normal" />
              </label>
              <label className="block text-xs font-bold text-slate-300">دقائق القراءة
                <input type="number" min={0} max={120} value={draft.goalMinutes} onChange={e => setDraft({ ...draft, goalMinutes: parseInt(e.target.value, 10) || 0 })} className="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white font-normal" />
              </label>
              <label className="block text-xs font-bold text-slate-300">دقائق اللعب
                <input type="number" min={0} max={120} value={draft.playMinutes} onChange={e => setDraft({ ...draft, playMinutes: parseInt(e.target.value, 10) || 0 })} className="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white font-normal" />
              </label>
            </div>
            <label className="block text-sm font-bold text-slate-300">المكافأة (تظهر عند فتح الألعاب)
              <input value={draft.reward} onChange={e => setDraft({ ...draft, reward: e.target.value })} className="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 p-2 text-white font-normal" />
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">العمر يحدّد الألعاب · دقائق القراءة = هدف يومي لفتح الألعاب (٠ = مفتوحة) · دقائق اللعب = المدة المسموحة ثم يُقفل (٠ = بلا حد).</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSettingsOpen(false)} className="p-2.5 rounded-xl bg-slate-700 text-white font-bold">إلغاء</button>
              <button onClick={saveSettings} className="p-2.5 rounded-xl bg-amber-500 text-black font-bold flex items-center justify-center gap-1"><Check className="w-4 h-4" /> حفظ</button>
            </div>
          </div>
        </div>
      )}

      {pinAction && (
        <PinModal
          mode={pinAction === "setread" ? "set" : "verify"}
          title={pinAction === "setread" ? "اختر رمز ولي الأمر (٤ أرقام)" : pinAction === "exit" ? "أدخل الرمز للخروج" : "رمز ولي الأمر"}
          onSuccess={onPinSuccess}
          onCancel={() => setPinAction(null)}
        />
      )}
    </div>
  );
}
