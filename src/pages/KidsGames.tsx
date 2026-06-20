import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, RefreshCw, BookOpen, Lock, Settings, Headphones, ListOrdered, LayoutGrid, Scale, Trophy, Gift, Star, Clock, Hash, Grid3x3, Flame, ShoppingBag, Gamepad2 } from "lucide-react";
import { getAllSurahs } from "../data/quranData";
import { getSurahAudioUrl, hasCloudAudio } from "../data/audioUrls";
import { getProfile, getProgress, addPlayMinutes, grantMorePlay, getProfiles, getCoins, addCoins, ownItem } from "../data/kidsProfile";
import { getGameCatalog, type GameDef, type GameEngine } from "../data/gameCatalog";
import { isKidsMode, setKidsLocked, hasKidsPin } from "../data/kidsLock";
import PinModal from "../components/PinModal";
import { toast } from "../hooks/use-toast";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const SURAHS = getAllSurahs();
const CLOUD = SURAHS.filter(s => hasCloudAudio(s.number));

/** بِركة السور لِلعبة حسب معاملاتها (نطاق السورة/عدد الآيات) — يتيح ألعاباً جديدة بمحتوى مختلف. */
const poolFor = (def: GameDef) => {
  const { minSurah, maxSurah, minAyah, maxAyah } = def.params || {};
  const out = SURAHS.filter(s =>
    (minSurah == null || s.number >= minSurah) &&
    (maxSurah == null || s.number <= maxSurah) &&
    (minAyah == null || s.ayahCount >= minAyah) &&
    (maxAyah == null || s.ayahCount <= maxAyah));
  return out.length >= 4 ? out : SURAHS;
};

/* ───────────────── نواة الحماس ───────────────── */
// نتيجة + سلسلة (combo) تضاعف النجوم + ومضة احتفال؛ كل إجابة صحيحة تُكسب نجوماً للملف النشِط.
function useGame() {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(0);
  const [gain, setGain] = useState(0);
  const correct = () => {
    const ns = streak + 1;
    const bonus = ns >= 5 ? 3 : ns >= 3 ? 2 : 1;   // مضاعِف السلسلة
    addCoins(bonus); setGain(bonus);
    setScore(s => s + 1); setStreak(ns); setFlash(f => f + 1);
    window.setTimeout(() => setGain(0), 900);   // ومضة "+N" لحظية فقط
  };
  const miss = () => { setStreak(0); setGain(0); };
  return { score, streak, flash, gain, correct, miss };
}
type Game = ReturnType<typeof useGame>;

const GameHud = ({ g }: { g: Game }) => (
  <div className="flex items-center justify-center gap-3 min-h-[28px]">
    <span className="inline-flex items-center gap-1 text-amber-300 font-extrabold"><Star className="w-4 h-4 fill-amber-300" /> {g.score}</span>
    {g.streak >= 2 && <span className="inline-flex items-center gap-1 text-orange-400 font-bold"><Flame className="w-4 h-4" /> {g.streak}× سلسلة</span>}
    {g.gain > 0 && <span key={g.flash} className="inline-flex items-center gap-0.5 text-emerald-300 font-extrabold animate-bounce">+{g.gain}<Star className="w-3.5 h-3.5 fill-emerald-300" /></span>}
  </div>
);

// مؤقّت جولة: شريط متناقص يخلق إثارة؛ عند انتهائه يستدعي onExpire (تقدّم لطيف بلا عقاب قاسٍ).
function useRoundTimer(roundKey: unknown, seconds: number, onExpire: () => void) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onExpire); cb.current = onExpire;
  useEffect(() => {
    setLeft(seconds);
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const start = now();
    const id = setInterval(() => {
      const rem = Math.max(0, seconds - (now() - start) / 1000);
      setLeft(rem);
      if (rem <= 0) { clearInterval(id); cb.current(); }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey, seconds]);
  return left;
}
const TimerBar = ({ left, seconds }: { left: number; seconds: number }) => {
  const pct = Math.max(0, Math.min(100, (left / seconds) * 100));
  const danger = left <= seconds * 0.3;
  return (
    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
      <div className={`h-full transition-[width] duration-100 ${danger ? "bg-rose-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

/* ───────────────── المحرّكات (يُعاد استخدامها لألعاب متعددة بمحتوى مختلف) ───────────────── */

// ١) استمع واختر
function ListenEngine({ def }: { def: GameDef }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pool = (() => { const p = poolFor(def).filter(s => hasCloudAudio(s.number)); return p.length >= 3 ? p : CLOUD; })();
  const newRound = () => { const o = shuffle(pool).slice(0, 3); return { opts: o, answer: o[Math.floor(Math.random() * o.length)] }; };
  const [round, setRound] = useState(newRound);
  const g = useGame();
  const [wrong, setWrong] = useState<number | null>(null);
  const play = (n: number) => { const a = audioRef.current; if (!a) return; a.src = audioPath(n); a.currentTime = 0; a.play().catch(() => {}); };
  const choose = (n: number) => {
    if (n === round.answer.number) { g.correct(); setWrong(null); const r = newRound(); setRound(r); setTimeout(() => play(r.answer.number), 250); }
    else { g.miss(); setWrong(n); }
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
      <GameHud g={g} />
    </div>
  );
}

// ٢) رتّب الآيات
function OrderEngine({ def }: { def: GameDef }) {
  const pool = (def.params?.minAyah || def.params?.maxAyah || def.params?.minSurah || def.params?.maxSurah) ? poolFor(def) : SURAHS.filter(s => s.ayahCount >= 3 && s.ayahCount <= 8);
  const makeSurah = () => pool[Math.floor(Math.random() * pool.length)] || SURAHS[0];
  const [surah, setSurah] = useState(makeSurah);
  const [order, setOrder] = useState<number[]>(() => shuffle(Array.from({ length: surah.ayahCount }, (_, i) => i + 1)));
  const [nextNum, setNextNum] = useState(1);
  const g = useGame();
  const done = nextNum > surah.ayahCount;
  const reset = () => { const s = makeSurah(); setSurah(s); setOrder(shuffle(Array.from({ length: s.ayahCount }, (_, i) => i + 1))); setNextNum(1); };
  const tap = (n: number) => {
    if (n !== nextNum) { g.miss(); toast({ title: "حاول مرة أخرى" }); return; }
    g.correct(); setNextNum(n + 1);
    if (n === surah.ayahCount) toast({ title: "أحسنت، رتّبتها صحيحاً 🎉" });
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-slate-300 text-sm">رتّب آيات <b className="text-amber-300">{surah.name}</b> بالترتيب الصحيح</p>
      <div className="grid grid-cols-4 gap-2">
        {order.map(n => (
          <button key={n} onClick={() => tap(n)} disabled={n < nextNum} className={`aspect-square rounded-xl font-extrabold text-2xl border active:scale-95 transition-colors ${n < nextNum ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-700/70 border-slate-600 text-white"}`}>{n}</button>
        ))}
      </div>
      <GameHud g={g} />
      {done && <button onClick={reset} className="mx-auto px-5 py-2 rounded-xl bg-amber-500 text-black font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> سورة أخرى</button>}
    </div>
  );
}

// ٣) الذاكرة
function MemoryEngine({ def }: { def: GameDef }) {
  const pool = poolFor(def);
  const pairs = Math.min(def.params?.pairs ?? 4, pool.length);   // لا يتجاوز عدد السور المتاحة
  const build = () => { const picked = shuffle(pool).slice(0, pairs); return shuffle([...picked, ...picked].map((s, i) => ({ id: i, num: s.number, name: s.name }))); };
  const [cards, setCards] = useState(build);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const g = useGame();
  const flip = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.includes(cards[i].num)) return;
    const nf = [...flipped, i];
    setFlipped(nf);
    if (nf.length === 2) {
      if (cards[nf[0]].num === cards[nf[1]].num) { g.correct(); setMatched(m => [...m, cards[nf[0]].num]); setFlipped([]); }
      else { g.miss(); setTimeout(() => setFlipped([]), 800); }
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
      <GameHud g={g} />
      {won && <button onClick={() => { setCards(build()); setMatched([]); setFlipped([]); }} className="mx-auto px-5 py-2 rounded-xl bg-amber-500 text-black font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> العب مجدداً</button>}
    </div>
  );
}

// ٤) أيّهما أكثر آيات (مؤقّت)
function WhichEngine({ def }: { def: GameDef }) {
  const pool = poolFor(def);
  const pair = () => { let t = shuffle(pool).slice(0, 2); if (t[0].ayahCount === t[1].ayahCount) t = shuffle(pool).slice(0, 2); return t; };
  const [two, setTwo] = useState(pair);
  const [round, setRound] = useState(0);
  const g = useGame();
  const next = () => { setTwo(pair()); setRound(r => r + 1); };
  const left = useRoundTimer(round, 8, () => { g.miss(); toast({ title: "انتهى الوقت" }); next(); });
  const choose = (s: typeof SURAHS[number]) => {
    const other = two.find(x => x.number !== s.number)!;
    if (s.ayahCount >= other.ayahCount) g.correct();
    else { g.miss(); toast({ title: `${other.name} أكثر (${other.ayahCount} آية)`, variant: "destructive" }); }
    next();
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-slate-300 text-sm">أيّ سورة عدد آياتها أكثر؟</p>
      <TimerBar left={left} seconds={8} />
      <div className="grid grid-cols-2 gap-3">
        {two.map(s => (
          <button key={s.number} onClick={() => choose(s)} className="p-6 rounded-xl bg-slate-700/70 border border-slate-600 hover:border-amber-500/50 text-white font-bold text-xl active:scale-95">{s.name}</button>
        ))}
      </div>
      <GameHud g={g} />
    </div>
  );
}

// ٥) اختبار قرآني (مؤقّت)
function QuizEngine({ def }: { def: GameDef }) {
  const pool = poolFor(def);
  const make = () => {
    const s = pool[Math.floor(Math.random() * pool.length)];
    const others = Array.from(new Set(shuffle(SURAHS).map(x => x.ayahCount).filter(c => c !== s.ayahCount))).slice(0, 3);
    return { s, opts: shuffle([s.ayahCount, ...others]) };
  };
  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const g = useGame();
  const next = () => { setQ(make()); setRound(r => r + 1); };
  const left = useRoundTimer(round, 8, () => { g.miss(); toast({ title: `الصحيح: ${q.s.ayahCount} آية` }); next(); });
  const answer = (n: number) => {
    if (n === q.s.ayahCount) g.correct();
    else { g.miss(); toast({ title: `الصحيح: ${q.s.ayahCount} آية`, variant: "destructive" }); }
    next();
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-white text-lg font-bold">كم عدد آيات سورة <span className="text-amber-300">{q.s.name}</span>؟</p>
      <TimerBar left={left} seconds={8} />
      <div className="grid grid-cols-2 gap-3">
        {q.opts.map((n, i) => (
          <button key={i} onClick={() => answer(n)} className="p-5 rounded-xl bg-slate-700/70 border border-slate-600 hover:border-amber-500/50 text-white font-extrabold text-2xl active:scale-95">{n}</button>
        ))}
      </div>
      <GameHud g={g} />
    </div>
  );
}

// ٦) عدّ الآيات (مؤقّت)
function CountEngine({ def }: { def: GameDef }) {
  const pool = poolFor(def);
  const make = () => {
    const s = pool[Math.floor(Math.random() * pool.length)];
    const wrong = shuffle(pool.filter(x => x.number !== s.number)).slice(0, 2);
    return { s, opts: shuffle([s, ...wrong]) };
  };
  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const g = useGame();
  const next = () => { setQ(make()); setRound(r => r + 1); };
  const left = useRoundTimer(round, 9, () => { g.miss(); toast({ title: `الصحيح: ${q.s.name}` }); next(); });
  const choose = (n: number) => {
    if (n === q.s.number) g.correct();
    else { g.miss(); toast({ title: `الصحيح: ${q.s.name}`, variant: "destructive" }); }
    next();
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-white text-lg font-bold">أيّ سورة عدد آياتها <span className="text-amber-300">{q.s.ayahCount}</span>؟</p>
      <TimerBar left={left} seconds={9} />
      <div className="grid gap-2">
        {q.opts.map(s => (
          <button key={s.number} onClick={() => choose(s.number)} className="p-4 rounded-xl bg-slate-700/70 border border-slate-600 hover:border-amber-500/50 text-white font-bold text-lg active:scale-95">{s.name}</button>
        ))}
      </div>
      <GameHud g={g} />
    </div>
  );
}

const ENGINES: Record<GameEngine, (p: { def: GameDef }) => JSX.Element> = {
  listen: ListenEngine, order: OrderEngine, memory: MemoryEngine, which: WhichEngine, quiz: QuizEngine, count: CountEngine,
};
const ICONS: Record<string, typeof Headphones> = { Headphones, ListOrdered, LayoutGrid, Scale, Trophy, Hash, Grid3x3, Gamepad2 };
const iconFor = (key: string) => ICONS[key] || Gamepad2;

/* ───────────────── ركن الأطفال ───────────────── */
export default function KidsGames() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [profile, setProfile] = useState(getProfile);
  const [progress, setProgress] = useState(getProgress);
  const [coins, setCoins] = useState(getCoins);
  const [catalog, setCatalog] = useState<GameDef[]>(getGameCatalog);
  const [pinAction, setPinAction] = useState<null | "parent" | "continue" | "exit" | "setread">(null);

  useEffect(() => {
    const refresh = () => { setProfile(getProfile()); setProgress(getProgress()); setCoins(getCoins()); setCatalog(getGameCatalog()); };
    refresh();
    const evts = ["focus", "mushaf:games_unlocked", "mushaf:play_expired", "mushaf:coins", "mushaf:gamecatalog", "mushaf:activeprofile"];
    evts.forEach(e => window.addEventListener(e, refresh));
    return () => evts.forEach(e => window.removeEventListener(e, refresh));
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

  const myGames = catalog.filter(g => g.ageMin <= profile.age && (g.cost === 0 || ownItem(g.id)));
  const def = active ? catalog.find(g => g.id === active) : null;
  const Engine = def ? ENGINES[def.engine] : null;

  const kidsMode = isKidsMode();

  const onPinSuccess = () => {
    if (pinAction === "parent") { setKidsLocked(false); setPinAction(null); navigate("/parent"); return; }
    if (pinAction === "continue") { grantMorePlay(); setProgress(getProgress()); }
    else if (pinAction === "exit") { setKidsLocked(false); setPinAction(null); navigate("/"); return; }
    else if (pinAction === "setread") { setKidsLocked(true); setPinAction(null); navigate("/"); return; }
    setPinAction(null);
  };

  const lockAndRead = () => { if (hasKidsPin()) { setKidsLocked(true); navigate("/"); } else setPinAction("setread"); };
  const openParent = () => { if (hasKidsPin()) setPinAction("parent"); else navigate("/parent"); };
  const continuePlay = () => { if (hasKidsPin()) setPinAction("continue"); else { grantMorePlay(); setProgress(getProgress()); } };
  const headerBack = () => { if (active) setActive(null); else if (kidsMode) setPinAction("exit"); else navigate("/"); };
  const tapGame = (id: string) => { if (canPlay) setActive(id); else toast({ title: "أكمِل قراءتك أولاً لتُفتح الألعاب", variant: "destructive" }); };

  const pct = Math.min(100, (progress.minutes / Math.max(1, profile.goalMinutes)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        <header className="flex items-center justify-between gap-2">
          <button onClick={headerBack} className="flex h-10 items-center gap-1 rounded-full bg-slate-700 px-4 text-sm font-bold hover:bg-slate-600 active:scale-95">
            <ArrowRight className="h-4 w-4" /> {active ? "الألعاب" : kidsMode ? "خروج" : "رجوع"}
          </button>
          <h1 className="font-extrabold text-lg text-amber-300">ركن الأطفال</h1>
          {!active ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-sm px-2.5 h-10"><Star className="w-4 h-4 fill-amber-300" /> {coins}</span>
              <button onClick={openParent} aria-label="إعدادات ولي الأمر" className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center active:scale-95"><Settings className="w-5 h-5" /></button>
            </div>
          ) : <span className="w-10" />}
        </header>

        {def && Engine ? (
          <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4">
            <h2 className="text-center font-bold text-amber-300 mb-4 flex items-center justify-center gap-2">{(() => { const I = iconFor(def.icon); return <I className="w-5 h-5" />; })()} {def.title}</h2>
            <Engine def={def} />
          </div>
        ) : (
          <>
            {/* بطاقة الطفل + حالة القراءة/اللعب */}
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
                  <p className="text-sm text-rose-300 flex items-center justify-center gap-1"><Lock className="w-4 h-4" /> الألعاب مقفلة — اقرأ {profile.goalMinutes} دقيقة لفتحها</p>
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

            {/* متجر النجوم */}
            <button onClick={() => navigate("/shop")} className="w-full p-3 rounded-2xl bg-gradient-to-l from-amber-500/20 to-slate-800/80 border border-amber-500/40 flex items-center gap-3 active:scale-[0.99]">
              <span className="w-11 h-11 rounded-xl bg-amber-500 text-black flex items-center justify-center shrink-0"><ShoppingBag className="w-6 h-6" /></span>
              <span className="flex-1 text-right"><span className="block font-extrabold text-white">متجر النجوم</span><span className="block text-[11px] text-slate-300">اشترِ ألعاباً جديدة ووجوهاً وألواناً بالنجوم</span></span>
              <span className="inline-flex items-center gap-1 text-amber-300 font-extrabold"><Star className="w-4 h-4 fill-amber-300" /> {coins}</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              {myGames.map(g => {
                const I = iconFor(g.icon);
                return (
                  <button key={g.id} onClick={() => tapGame(g.id)}
                    className={`relative p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 active:scale-95 flex flex-col items-center gap-2 ${!canPlay ? "opacity-60" : ""}`}>
                    <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${g.tint}`}><I className="w-7 h-7" /></span>
                    <span className="font-bold text-sm text-white text-center leading-tight">{g.title}</span>
                    <span className="text-[11px] text-slate-400 bg-slate-700/60 rounded-full px-2 py-0.5">سن {g.ageMin}+</span>
                    {!canPlay && <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-2xl"><Lock className="w-7 h-7 text-slate-300" /></span>}
                  </button>
                );
              })}
              <button onClick={lockAndRead} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 active:scale-95 flex flex-col items-center gap-2">
                <span className="w-14 h-14 rounded-2xl bg-slate-700/60 text-slate-200 flex items-center justify-center"><BookOpen className="w-7 h-7" /></span>
                <span className="font-bold text-sm text-white">قراءة مقفلة</span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> بكلمة مرور</span>
              </button>
            </div>
          </>
        )}
      </div>

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
