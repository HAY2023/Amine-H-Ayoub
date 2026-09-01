import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, RefreshCw, BookOpen, Lock, Settings, Bell, Headphones, ListOrdered, LayoutGrid, Scale, Trophy, Gift, Star, Hash, Grid3x3, Flame, Sparkles, Gamepad2, Puzzle, X, Crown, Brain } from "lucide-react";
import { getAllSurahs } from "../data/quranData";
import { getSurahAudioUrl, hasCloudAudio } from "../data/audioUrls";
import { getProfile, getProgress, getProfiles, getCoins, addCoins, kidsRouteBlocked, setCurrentSurah, addPlayMinutes, setAppMode, ownItem, unlockItem } from "../data/kidsProfile";
import { getGameCatalog, type GameDef, type GameEngine } from "../data/gameCatalog";

import { ensureCorpus, type SurahText } from "../data/quranText";
import { isKidsMode, setKidsLocked, hasKidsPin } from "../data/kidsLock";
import { shouldHideMushaf } from "../utils/tauriUtils";
import ParentalGateModal from "../components/ParentalGateModal";
import MemoryGame from "../games/MemoryGame";
import MissingWordGame from "../games/MissingWordGame";
import AyahOrderGame from "../games/AyahOrderGame";
import Avatar from "../components/Avatar";
import NotificationsModal from "../components/NotificationsModal";
import BadgesModal from "../components/BadgesModal";
import { toast } from "../hooks/use-toast";
import { isTimeAllowed } from "../data/kidsSchedule";

async function enterKioskMode() {
  // تم إيقاف تكبير الشاشة التلقائي بناءً على طلب المستخدم
}

async function exitKioskMode() {
  // تم إيقاف تكبير الشاشة التلقائي بناءً على طلب المستخدم
}

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const SURAHS = getAllSurahs();

const poolFor = (def: GameDef, minSurahOverride: number = 78) => {
  const { minAyah, maxAyah } = def.params || {};
  
  // نعتمد حصرياً على السورة التي اختارها المستخدم (minSurahOverride)
  const maxIndex = SURAHS.findIndex(s => s.number === minSurahOverride);
  // إذا لم نجدها، نعتمد سورة النبأ (رقم 78) كافتراضي
  const safeMaxIndex = maxIndex >= 0 ? maxIndex : SURAHS.findIndex(s => s.number === 78);

  const out = SURAHS.filter((s, idx) =>
    idx > 0 && idx <= safeMaxIndex &&
    (minAyah == null || s.ayahCount >= minAyah) &&
    (maxAyah == null || s.ayahCount <= maxAyah)
  );

  return out.length >= 4 ? out : SURAHS.filter((s, idx) => idx > 0 && idx <= safeMaxIndex);
};

/* ───────────────── نواة الحماس ───────────────── */
function useGame() {
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState(0);
  const [earned, setEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(0);
  const [gain, setGain] = useState(0);
  const correct = () => {
    const ns = streak + 1;
    // نقاط الألعاب قليلة عمداً — القراءة هي المصدر الأساسي للنجوم (المال)
    const bonus = ns >= 5 ? 3 : ns >= 3 ? 2 : 1;
    addCoins(bonus); setGain(bonus); setEarned(e => e + bonus);
    setScore(s => s + 1); setAnswers(a => a + 1); setStreak(ns); setFlash(f => f + 1);
    window.setTimeout(() => setGain(0), 900);
  };
  const miss = () => { setStreak(0); setGain(0); setAnswers(a => a + 1); };
  const reset = () => { setScore(0); setAnswers(0); setEarned(0); setStreak(0); setGain(0); };
  return { score, answers, earned, streak, flash, gain, correct, miss, reset };
}
type Game = ReturnType<typeof useGame>;

const PRAISE_NORMAL = ["أحسنت يا بطل!", "رائع!", "أنت ذكي!"];
const PRAISE_GOOD = ["ممتاز جداً!", "أداء مذهل!", "عمل رائع!"];
const PRAISE_SUPER = ["ما شاء الله!", "أنت عبقري!", "أسطورة!"];

const GameHud = ({ g }: { g: Game }) => {
  const getPraise = () => {
    if (g.streak >= 5) return PRAISE_SUPER[g.flash % PRAISE_SUPER.length];
    if (g.streak >= 3) return PRAISE_GOOD[g.flash % PRAISE_GOOD.length];
    return PRAISE_NORMAL[g.flash % PRAISE_NORMAL.length];
  };

  return (
    <div className="flex items-center justify-center gap-3 min-h-[28px]">
      <span className="inline-flex items-center gap-1 text-accent font-extrabold"><Star className="w-4 h-4 fill-current" /> {g.score}</span>
      {g.streak >= 2 && <span className="inline-flex items-center gap-1 text-orange-400 font-bold"><Flame className="w-4 h-4" /> {g.streak}× سلسلة</span>}
      {g.gain > 0 && <span key={g.flash} className="inline-flex items-center gap-0.5 text-success font-extrabold animate-bounce">+{g.gain}<Star className="w-3.5 h-3.5 fill-current" /></span>}
      {g.flash > 0 && (
        <span key={`p-${g.flash}`} className="pointer-events-none fixed left-1/2 top-1/3 z-[60] -translate-x-1/2 font-extrabold text-accent drop-shadow animate-celebrate"
          style={{ fontSize: g.streak >= 5 ? "2.2rem" : g.streak >= 3 ? "1.8rem" : "1.4rem" }}>
          {getPraise()}
        </span>
      )}
    </div>
  );
};

function useRoundTimer(roundKey: unknown, seconds: number, onExpire: () => void, enabled = true) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onExpire); cb.current = onExpire;
  useEffect(() => {
    setLeft(seconds);
    if (!enabled) return;
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const start = now();
    const id = setInterval(() => {
      const rem = Math.max(0, seconds - (now() - start) / 1000);
      setLeft(rem);
      if (rem <= 0) { clearInterval(id); cb.current(); }
    }, 100);
    return () => clearInterval(id);
  }, [roundKey, seconds, enabled]);
  return left;
}
const TimerBar = ({ left, seconds }: { left: number; seconds: number }) => {
  const pct = Math.max(0, Math.min(100, (left / seconds) * 100));
  const danger = left <= seconds * 0.3;
  return (
    <div className="h-2 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full transition-[width] duration-100 ${danger ? "bg-destructive" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const ROUNDS = 20;
const SessionBar = ({ q }: { q: number }) => (
  <p className="text-[11px] text-muted-foreground font-bold">السؤال {Math.min(q, ROUNDS)} من {ROUNDS}</p>
);
const ResultCard = ({ g, onReplay }: { g: Game; onReplay: () => void }) => {
  const pct = g.answers ? Math.round((g.score / g.answers) * 100) : 0;
  const msg = pct >= 80 ? "ما شاء الله! ممتاز" : pct >= 50 ? "أحسنت! جيّد جداً" : "لا بأس — التكرار يعلّم";
  return (
    <div className="space-y-4 text-center py-4 animate-fade-up">
      <Trophy className="w-14 h-14 mx-auto text-accent" />
      <p className="text-xl font-extrabold text-foreground">{msg}</p>
      <p className="text-sm text-muted-foreground">أجبت صحيحاً على {g.score} من {g.answers}</p>
      <p className="inline-flex items-center gap-1 text-accent font-extrabold text-lg"><Star className="w-5 h-5 fill-current" /> ربحت {g.earned} نجمة</p>
      <button onClick={onReplay} className="btn-gold mx-auto px-6 py-2.5 rounded-xl font-bold flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> العب من جديد</button>
    </div>
  );
};

function useCorpus() {
  const [corpus, setCorpus] = useState<SurahText[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => { setFailed(false); ensureCorpus().then(setCorpus).catch(() => setFailed(true)); };
  useEffect(load, []);
  return { corpus, failed, retry: load };
}
const CorpusGate = ({ failed, retry }: { failed: boolean; retry: () => void }) => (
  <div className="text-center space-y-3 py-6">
    {failed ? (
      <>
        <p className="text-sm text-destructive">تعذّر تحميل نصوص السور — يلزم اتصال بالإنترنت مرّة واحدة فقط</p>
        <button onClick={retry} className="btn-gold mx-auto px-5 py-2 rounded-xl font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> إعادة المحاولة</button>
      </>
    ) : (
      <p className="text-sm text-muted-foreground animate-pulse">جاري تحضير نصوص السور...</p>
    )}
  </div>
);

function OrderEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const { corpus } = useCorpus();
  const pool = (def.params?.minAyah || def.params?.maxAyah || def.params?.minSurah || def.params?.maxSurah) ? poolFor(def, minSurah) : SURAHS.filter(s => s.ayahCount >= 3 && s.ayahCount <= 8 && s.number >= minSurah);
  const orderRef = useRef(shuffle(pool));
  const getNext = () => { if (!orderRef.current.length) orderRef.current = shuffle(pool); return orderRef.current.pop() || pool[0]; };
  const makeSurah = () => getNext();
  const [surah, setSurah] = useState(makeSurah);
  const [order, setOrder] = useState<number[]>(() => shuffle(Array.from({ length: surah.ayahCount }, (_, i) => i + 1)));
  const [nextNum, setNextNum] = useState(1);
  const g = useGame();
  const done = nextNum > surah.ayahCount;
  const text = corpus?.find(c => c.app === surah.number);
  const ayahText = (n: number) => text?.ayahs.find(a => a.n === n)?.text;
  const reset = () => { const s = makeSurah(); setSurah(s); setOrder(shuffle(Array.from({ length: s.ayahCount }, (_, i) => i + 1))); setNextNum(1); };
  const tap = (n: number) => {
    if (done) return;
    if (n !== nextNum) { g.miss(); toast({ title: "حاول مرة أخرى" }); return; }
    g.correct(); setNextNum(n + 1);
    if (n === surah.ayahCount) toast({ title: "أحسنت، رتّبتها صحيحاً" });
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-muted-foreground text-sm">رتّب آيات <b className="text-accent">{surah.name}</b> بالترتيب الصحيح{text ? " — ابدأ بالآية الأولى" : ""}</p>
      {text ? (
        <div className="grid gap-2">
          {order.map(n => {
            const placed = n < nextNum;
            return (
              <button key={n} onClick={() => tap(n)} disabled={placed}
                className={`p-3 rounded-xl border text-right font-amiri text-lg leading-relaxed transition-colors active:scale-[0.98] ${placed ? "bg-primary/15 border-primary/50 text-foreground" : "bg-secondary border-border text-secondary-foreground hover:border-accent/50"}`}>
                <span className={`inline-flex w-6 h-6 ml-2 rounded-full text-[11px] items-center justify-center align-middle font-sans font-bold ${placed ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground"}`}>{placed ? n : "؟"}</span>
                {ayahText(n)}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {order.map(n => (
            <button key={n} onClick={() => tap(n)} disabled={n < nextNum} className={`aspect-square rounded-xl font-extrabold text-2xl border active:scale-95 transition-colors ${n < nextNum ? "bg-primary border-primary text-primary-foreground" : "bg-secondary border-border text-secondary-foreground"}`}>{n}</button>
          ))}
        </div>
      )}
      <GameHud g={g} />
      {done && <button onClick={reset} className="btn-gold mx-auto px-5 py-2 rounded-xl font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> سورة أخرى</button>}
    </div>
  );
}

function MemoryEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const pairs = def.params?.pairs ?? 4;
  const pool = poolFor(def, minSurah);
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
      <p className="text-muted-foreground text-sm">اقلب البطاقات وطابق السور المتشابهة</p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c, i) => {
          const show = flipped.includes(i) || matched.includes(c.num);
          return <button key={c.id} onClick={() => flip(i)} className={`aspect-square rounded-lg text-[11px] font-bold flex items-center justify-center p-1 border active:scale-95 transition-colors ${show ? "bg-card text-card-foreground border-accent/40" : "bg-secondary border-border text-muted-foreground"}`}>{show ? c.name : <LayoutGrid className="w-5 h-5" />}</button>;
        })}
      </div>
      <GameHud g={g} />
      {won && <button onClick={() => { setCards(build()); setMatched([]); setFlipped([]); }} className="btn-gold mx-auto px-5 py-2 rounded-xl font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> العب مجدداً</button>}
    </div>
  );
}

function WhichEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const pool = poolFor(def, minSurah);
  const orderRef = useRef(shuffle(pool));
  const pair = () => {
    if (!orderRef.current.length) orderRef.current = shuffle(pool);
    const a = orderRef.current.pop() || pool[0];
    const diff = pool.filter(x => x.ayahCount !== a.ayahCount);
    const b = diff.length ? diff[Math.floor(Math.random() * diff.length)] : pool.find(x => x.number !== a.number)!;
    return shuffle([a, b]);
  };
  const [two, setTwo] = useState(pair);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setQNum(nn); if (nn <= ROUNDS) { setTwo(pair()); setRound(r => r + 1); } };
  const left = useRoundTimer(round, 8, () => { g.miss(); setReveal(true); window.setTimeout(() => next(qNum + 1), 1100); }, !reveal && !finished);
  const choose = (s: typeof SURAHS[number]) => {
    if (reveal || finished) return;
    const other = two.find(x => x.number !== s.number)!;
    if (s.ayahCount > other.ayahCount) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1100);
  };
  const replay = () => { g.reset(); setQNum(1); setTwo(pair()); setRound(r => r + 1); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  const maxCount = Math.max(...two.map(s => s.ayahCount));
  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-base sm:text-lg font-medium">أيّ سورة عدد آياتها أكثر؟</p>
      <TimerBar left={left} seconds={8} />
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {two.map(s => (
          <button key={s.number} onClick={() => choose(s)}
            className={`p-4 sm:p-6 rounded-xl border font-bold text-lg sm:text-xl active:scale-95 transition-colors ${reveal && s.ayahCount === maxCount ? "bg-success/20 border-success/60 text-success" : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground"}`}>
            <span className="block">{s.name}</span>
            {reveal && <span className="block mt-1 text-xs sm:text-sm font-extrabold text-muted-foreground">{s.ayahCount} آيات</span>}
          </button>
        ))}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function QuizEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const pool = poolFor(def, minSurah);
  const orderRef = useRef(shuffle(pool));
  const make = () => {
    if (!orderRef.current.length) orderRef.current = shuffle(pool);
    const s = orderRef.current.pop() || pool[0];
    const opts = new Set<number>([s.ayahCount]);
    // خيارات أقرب للإجابة الصحيحة (فروق أصغر = سؤال أصعب)
    for (const d of shuffle([-2, -1, 1, 2])) {
      const v = s.ayahCount + d;
      if (v >= 1) opts.add(v);
      if (opts.size === 4) break;
    }
    return { s, opts: shuffle([...opts]) };
  };
  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setChosen(null); setQNum(nn); if (nn <= ROUNDS) { setQ(make()); setRound(r => r + 1); } };
  const left = useRoundTimer(round, 8, () => { g.miss(); setReveal(true); window.setTimeout(() => next(qNum + 1), 1100); }, !reveal && !finished);
  const answer = (n: number) => {
    if (reveal || finished) return;
    setChosen(n);
    if (n === q.s.ayahCount) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1100);
  };
  const replay = () => { g.reset(); setQNum(1); setQ(make()); setRound(r => r + 1); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-foreground text-base sm:text-lg font-bold">كم عدد آيات سورة <span className="text-accent">{q.s.name}</span>؟</p>
      <TimerBar left={left} seconds={8} />
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {q.opts.map((n, i) => {
          const cls = reveal && n === q.s.ayahCount ? "bg-success/20 border-success/60 text-success"
            : reveal && n === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={i} onClick={() => answer(n)} className={`p-4 sm:p-5 rounded-xl border font-extrabold text-xl sm:text-2xl active:scale-95 transition-colors ${cls}`}>{n}</button>;
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function CountEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const pool = poolFor(def, minSurah);
  const orderRef = useRef(shuffle(pool));
  const make = () => {
    if (!orderRef.current.length) orderRef.current = shuffle(pool);
    const s = orderRef.current.pop() || pool[0];
    const wrong = shuffle(pool.filter(x => x.ayahCount !== s.ayahCount)).slice(0, 2);
    return { s, opts: shuffle([s, ...wrong]) };
  };
  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setChosen(null); setQNum(nn); if (nn <= ROUNDS) { setQ(make()); setRound(r => r + 1); } };
  const left = useRoundTimer(round, 9, () => { g.miss(); setReveal(true); window.setTimeout(() => next(qNum + 1), 1100); }, !reveal && !finished);
  const choose = (n: number) => {
    if (reveal || finished) return;
    setChosen(n);
    if (n === q.s.number) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1100);
  };
  const replay = () => { g.reset(); setQNum(1); setQ(make()); setRound(r => r + 1); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-foreground text-lg font-bold">أيّ سورة عدد آياتها <span className="text-accent">{q.s.ayahCount}</span>؟</p>
      <TimerBar left={left} seconds={9} />
      <div className="grid gap-2">
        {q.opts.map(s => {
          const cls = reveal && s.number === q.s.number ? "bg-success/20 border-success/60 text-success"
            : reveal && s.number === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return (
            <button key={s.number} onClick={() => choose(s.number)} className={`p-4 rounded-xl border font-bold text-lg active:scale-95 transition-colors ${cls}`}>
              {s.name}{reveal && <span className="mr-2 text-xs font-extrabold text-muted-foreground">({s.ayahCount} آيات)</span>}
            </button>
          );
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function NextAyahEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const { corpus, failed, retry } = useCorpus();
  if (!corpus) return <CorpusGate failed={failed} retry={retry} />;
  return <NextAyahPlay corpus={corpus} def={def} minSurah={minSurah} />;
}
function NextAyahPlay({ corpus, def, minSurah }: { corpus: SurahText[], def: GameDef, minSurah: number }) {
  const pool = poolFor(def, minSurah).map(s => s.number);
  const eligible = corpus.filter(c => c.ayahs.length >= 3 && pool.includes(c.app));
  const orderRef = useRef(shuffle(eligible));
  const getNext = () => { if (!orderRef.current.length) orderRef.current = shuffle(eligible); return orderRef.current.pop() || eligible[0]; };
  const make = (prevApp?: number) => {
    let s = getNext();
    if (s.app === prevApp && eligible.length > 1) s = getNext();
    const i = Math.floor(Math.random() * (s.ayahs.length - 1));
    const answer = s.ayahs[i + 1];
    const distract = shuffle(s.ayahs.filter(a => a.n !== answer.n && a.n !== s.ayahs[i].n)).slice(0, 2);
    const others = shuffle(eligible.filter(c => c.app !== s.app));
    for (const o of others) {
      if (distract.length >= 2) break;
      const a = o.ayahs[Math.floor(Math.random() * o.ayahs.length)];
      if (a.text !== answer.text && !distract.some(d => d.text === a.text)) distract.push(a);
    }
    return { s, prompt: s.ayahs[i], opts: shuffle([answer, ...distract]), answer };
  };
  const [q, setQ] = useState(() => make());
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setChosen(null); setQNum(nn); if (nn <= ROUNDS) setQ(make(q.s.app)); };
  const answerTap = (text: string) => {
    if (reveal || finished) return;
    setChosen(text);
    if (text === q.answer.text) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), text === q.answer.text ? 700 : 1600);
  };
  const replay = () => { g.reset(); setQNum(1); setQ(make()); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-sm">من سورة <b className="text-accent">{q.s.name}</b> — ما الآية التالية؟</p>
      <div className="p-4 rounded-2xl bg-accent/10 border border-accent/40 font-amiri text-xl leading-loose text-foreground">{q.prompt.text}</div>
      <div className="grid gap-2">
        {q.opts.map((a, i) => {
          const cls = reveal && a.text === q.answer.text ? "bg-success/20 border-success/60 text-success"
            : reveal && a.text === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={i} onClick={() => answerTap(a.text)} className={`p-3 rounded-xl border text-right font-amiri text-lg leading-relaxed active:scale-[0.98] transition-colors ${cls}`}>{a.text}</button>;
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function PrevAyahEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const { corpus, failed, retry } = useCorpus();
  if (!corpus) return <CorpusGate failed={failed} retry={retry} />;
  return <PrevAyahPlay corpus={corpus} def={def} minSurah={minSurah} />;
}
function PrevAyahPlay({ corpus, def, minSurah }: { corpus: SurahText[], def: GameDef, minSurah: number }) {
  const pool = poolFor(def, minSurah).map(s => s.number);
  const eligible = corpus.filter(c => c.ayahs.length >= 3 && pool.includes(c.app));
  const orderRef = useRef(shuffle(eligible));
  const getNext = () => { if (!orderRef.current.length) orderRef.current = shuffle(eligible); return orderRef.current.pop() || eligible[0]; };
  const make = (prevApp?: number) => {
    let s = getNext();
    if (s.app === prevApp && eligible.length > 1) s = getNext();
    const i = Math.floor(Math.random() * (s.ayahs.length - 1)) + 1;
    const answer = s.ayahs[i - 1];
    const distract = shuffle(s.ayahs.filter(a => a.n !== answer.n && a.n !== s.ayahs[i].n)).slice(0, 2);
    const others = shuffle(eligible.filter(c => c.app !== s.app));
    for (const o of others) {
      if (distract.length >= 2) break;
      const a = o.ayahs[Math.floor(Math.random() * o.ayahs.length)];
      if (a.text !== answer.text && !distract.some(d => d.text === a.text)) distract.push(a);
    }
    return { s, prompt: s.ayahs[i], opts: shuffle([answer, ...distract]), answer };
  };
  const [q, setQ] = useState(() => make());
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setChosen(null); setQNum(nn); if (nn <= ROUNDS) setQ(make(q.s.app)); };
  const answerTap = (text: string) => {
    if (reveal || finished) return;
    setChosen(text);
    if (text === q.answer.text) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), text === q.answer.text ? 700 : 1600);
  };
  const replay = () => { g.reset(); setQNum(1); setQ(make()); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-sm">من سورة <b className="text-accent">{q.s.name}</b> — ما الآية السابقة؟</p>
      <div className="p-4 rounded-2xl bg-accent/10 border border-accent/40 font-amiri text-xl leading-loose text-foreground">{q.prompt.text}</div>
      <div className="grid gap-2">
        {q.opts.map((a, i) => {
          const cls = reveal && a.text === q.answer.text ? "bg-success/20 border-success/60 text-success"
            : reveal && a.text === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={i} onClick={() => answerTap(a.text)} className={`p-3 rounded-xl border text-right font-amiri text-lg leading-relaxed active:scale-[0.98] transition-colors ${cls}`}>{a.text}</button>;
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function WhichSurahEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const { corpus, failed, retry } = useCorpus();
  if (!corpus) return <CorpusGate failed={failed} retry={retry} />;
  return <WhichSurahPlay corpus={corpus} def={def} minSurah={minSurah} />;
}
function WhichSurahPlay({ corpus, def, minSurah }: { corpus: SurahText[], def: GameDef, minSurah: number }) {
  const pool = poolFor(def, minSurah).map(s => s.number);
  const eligible = corpus.filter(c => pool.includes(c.app));
  const orderRef = useRef(shuffle(eligible));
  const getNext = () => { if (!orderRef.current.length) orderRef.current = shuffle(eligible); return orderRef.current.pop() || eligible[0]; };
  const make = (prevApp?: number) => {
    let s = getNext();
    if (s.app === prevApp && eligible.length > 1) s = getNext();
    const ayahs = s.ayahs.filter(a => !(s.std === 1 && a.n === 1));
    const a = ayahs[Math.floor(Math.random() * ayahs.length)] || s.ayahs[0];
    const others = shuffle(eligible.filter(c => c.app !== s.app)).slice(0, 2);
    return { text: a.text, answer: s, opts: shuffle([s, ...others]) };
  };
  const [q, setQ] = useState(() => make());
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setChosen(null); setQNum(nn); if (nn <= ROUNDS) setQ(make(q.answer.app)); };
  const choose = (app: number) => {
    if (reveal || finished) return;
    setChosen(app);
    if (app === q.answer.app) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1100);
  };
  const replay = () => { g.reset(); setQNum(1); setQ(make()); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-sm">من أيّ سورة هذه الآية؟</p>
      <div className="p-4 rounded-2xl bg-accent/10 border border-accent/40 font-amiri text-xl leading-loose text-foreground">{q.text}</div>
      <div className="grid gap-2">
        {q.opts.map(s => {
          const cls = reveal && s.app === q.answer.app ? "bg-success/20 border-success/60 text-success"
            : reveal && s.app === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={s.app} onClick={() => choose(s.app)} className={`p-4 rounded-xl border font-bold text-lg active:scale-95 transition-colors ${cls}`}>{s.name}</button>;
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function SurahAudioEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const [source, setSource] = useState<HTMLAudioElement | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [question, setQuestion] = useState<{ surah: { number: number; name: string }; options: { number: number; name: string }[] } | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [round, setRound] = useState(1);
  const g = useGame();
  const pool = poolFor(def, minSurah).filter(s => hasCloudAudio(s.number) || s.number === 1);
  const makeQuestion = () => {
    const candidates = shuffle(pool).slice(0, 4);
    const correct = candidates[0];
    return {
      surah: correct,
      options: shuffle(candidates.map((s) => ({ number: s.number, name: s.name }))),
    };
  };

  useEffect(() => {
    setQuestion(makeQuestion());
    setSelected(null);
    setFeedback(null);
    setRound(1);
  }, [minSurah, def.engine]);

  useEffect(() => {
    if (!question) return;
    const audio = new Audio(audioPath(question.surah.number));
    audio.preload = "auto";
    audio.onended = () => audio.pause();
    setSource(audio);
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [question]);

  const playAudio = () => {
    source?.play().catch(() => {
      toast({ title: "تعذّر تشغيل الصوت", description: "تأكد من اتصال الإنترنت أو جرب سورة أخرى.", variant: "destructive" });
    });
  };

  const choose = (number: number) => {
    if (!question || feedback) return;
    setSelected(number);
    const correct = number === question.surah.number;
    if (correct) g.correct(); else g.miss();
    setFeedback(correct ? "correct" : "wrong");
    window.setTimeout(() => {
      setQuestion(makeQuestion());
      setSelected(null);
      setFeedback(null);
      setRound(r => r + 1);
    }, 1200);
  };

  if (!question) return <div className="text-center py-8 text-sm text-muted-foreground">جارٍ تحضير اللعبة...</div>;
  const finished = round > ROUNDS;
  if (finished) return <ResultCard g={g} onReplay={() => {
    g.reset(); setQuestion(makeQuestion()); setSelected(null); setFeedback(null); setRound(1);
  }} />;

  return (
    <div className="space-y-4 text-center">
      <SessionBar q={round} />
      <p className="text-foreground text-lg font-bold">اسمع السورة واختر اسمها</p>
      <button onClick={playAudio} className="btn-emerald mx-auto px-5 py-3 rounded-2xl font-bold flex items-center gap-2 active:scale-95">
        <Play className="w-4 h-4" /> استمع الآن
      </button>
      <div className="grid gap-2">
        {question.options.map((opt) => {
          const isCorrect = feedback && opt.number === question.surah.number;
          const isWrong = feedback && opt.number === selected && selected !== question.surah.number;
          const cls = isCorrect ? "bg-success/20 border-success/60 text-success"
            : isWrong ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return (
            <button key={opt.number} onClick={() => choose(opt.number)} disabled={!!feedback}
              className={`p-4 rounded-xl border font-bold text-lg active:scale-95 transition-colors ${cls}`}>
              {opt.name}
            </button>
          );
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function MissingWordEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const { corpus, failed, retry } = useCorpus();
  if (!corpus) return <CorpusGate failed={failed} retry={retry} />;
  return <MissingWordPlay corpus={corpus} def={def} minSurah={minSurah} />;
}
function MissingWordPlay({ corpus, def, minSurah }: { corpus: SurahText[], def: GameDef, minSurah: number }) {
  const pool = poolFor(def, minSurah).map(s => s.number);
  const eligible = corpus.filter(c => pool.includes(c.app) && c.ayahs.some(a => a.text.split(" ").length >= 4));
  const orderRef = useRef(shuffle(eligible));
  const getNext = () => { if (!orderRef.current.length) orderRef.current = shuffle(eligible); return orderRef.current.pop() || eligible[0]; };
  const make = () => {
    const s = getNext();
    const ayahs = s.ayahs.filter(a => a.text.split(" ").length >= 4);
    const a = ayahs[Math.floor(Math.random() * ayahs.length)];
    const words = a.text.split(" ");
    
    let hiddenIdx = 0;
    let answer = "";
    for (let i = 0; i < 5; i++) {
      hiddenIdx = Math.floor(Math.random() * words.length);
      answer = words[hiddenIdx];
      if (answer.length > 3) break;
    }

    const allWords = s.ayahs.flatMap(ay => ay.text.split(" ")).filter(w => w !== answer && w.length > 2);
    const distractors = shuffle(Array.from(new Set(allWords))).slice(0, 2);
    if (distractors.length < 2) {
      const extra = corpus.flatMap(c => c.ayahs.flatMap(ay => ay.text.split(" "))).filter(w => w !== answer && w.length > 2);
      distractors.push(...shuffle(Array.from(new Set(extra))).slice(0, 2 - distractors.length));
    }
    return { s, words, hiddenIdx, answer, opts: shuffle([answer, ...distractors]) };
  };
  const [q, setQ] = useState(() => make());
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setChosen(null); setQNum(nn); if (nn <= ROUNDS) setQ(make()); };
  const choose = (word: string) => {
    if (reveal || finished) return;
    setChosen(word);
    if (word === q.answer) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1600);
  };
  const replay = () => { g.reset(); setQNum(1); setQ(make()); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-base sm:text-lg font-medium">أكمل الكلمة الناقصة في سورة <b className="text-accent">{q.s.name}</b></p>
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-accent/10 border border-accent/40 font-amiri text-xl sm:text-2xl leading-loose text-foreground flex flex-wrap justify-center gap-x-2 sm:gap-x-3 gap-y-2 sm:gap-y-3 game-content" dir="rtl">
        {q.words.map((w, i) => (
          <span key={i} className={i === q.hiddenIdx ? "text-transparent bg-secondary/50 border-b-2 border-dashed border-accent min-w-[50px] sm:min-w-[70px] inline-block text-center relative" : ""}>
            {i === q.hiddenIdx ? (reveal ? <span className={`absolute inset-0 flex items-center justify-center font-bold text-base sm:text-lg ${q.answer === chosen ? "text-success" : "text-accent"}`}>{q.answer}</span> : "...") : w}
          </span>
        ))}
      </div>
      <div className="grid gap-2 sm:gap-3">
        {q.opts.map((opt, i) => {
          const cls = reveal && opt === q.answer ? "bg-success/20 border-success/60 text-success"
            : reveal && opt === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={i} onClick={() => choose(opt)} className={`p-3 sm:p-4 rounded-xl border text-center font-amiri font-bold text-lg sm:text-xl active:scale-[0.98] transition-colors game-option ${cls}`}>{opt}</button>;
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

/* ── ألعاب قرآنية صعبة مبرمجة بـ TypeScript (بنفس أسلوب الألعاب المدمجة) ── */

function AyahSurahEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const { corpus, failed, retry } = useCorpus();
  if (!corpus) return <CorpusGate failed={failed} retry={retry} />;
  return <AyahSurahPlay corpus={corpus} def={def} minSurah={minSurah} />;
}
function AyahSurahPlay({ corpus, def, minSurah }: { corpus: SurahText[]; def: GameDef; minSurah: number }) {
  const pool = poolFor(def, minSurah).map(s => s.number);
  const eligible = corpus.filter(c => c.ayahs.length >= 2 && pool.includes(c.app));
  const orderRef = useRef(shuffle(eligible));
  const getNext = () => { if (!orderRef.current.length) orderRef.current = shuffle(eligible); return orderRef.current.pop() || eligible[0]; };
  const make = () => {
    const s = getNext();
    const ayah = s.ayahs[Math.floor(Math.random() * s.ayahs.length)];
    const wrong = shuffle(eligible.filter(c => c.app !== s.app)).slice(0, 3);
    return { s, ayah, opts: shuffle([s, ...wrong]) };
  };
  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setChosen(null); setQNum(nn); if (nn <= ROUNDS) { setQ(make()); setRound(r => r + 1); } };
  const left = useRoundTimer(round, 12, () => { g.miss(); setReveal(true); window.setTimeout(() => next(qNum + 1), 1300); }, !reveal && !finished);
  const choose = (n: number) => {
    if (reveal || finished) return;
    setChosen(n);
    if (n === q.s.app) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1200);
  };
  const replay = () => { g.reset(); setQNum(1); setQ(make()); setRound(r => r + 1); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-2 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-xs sm:text-sm">من أي سورة هذه الآية الكريمة؟</p>
      <TimerBar left={left} seconds={12} />
      <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-accent/10 border border-accent/40 font-amiri text-base sm:text-xl leading-loose text-foreground game-content">{q.ayah.text}</div>
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        {q.opts.map(o => {
          const cls = reveal && o.app === q.s.app ? "bg-success/20 border-success/60 text-success"
            : reveal && o.app === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={o.app} onClick={() => choose(o.app)} className={`p-2 sm:p-4 rounded-lg sm:rounded-xl border font-bold active:scale-95 transition-colors text-sm sm:text-base game-option ${cls}`}>{o.name}</button>;
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function AyahOrderEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const { corpus, failed, retry } = useCorpus();
  if (!corpus) return <CorpusGate failed={failed} retry={retry} />;
  return <AyahOrderPlay corpus={corpus} def={def} minSurah={minSurah} />;
}
function AyahOrderPlay({ corpus, def, minSurah }: { corpus: SurahText[]; def: GameDef; minSurah: number }) {
  const pool = poolFor(def, minSurah).map(s => s.number);
  const eligible = corpus.filter(c => c.ayahs.length >= 5 && pool.includes(c.app));
  const orderRef = useRef(shuffle(eligible));
  const getNext = () => { if (!orderRef.current.length) orderRef.current = shuffle(eligible); return orderRef.current.pop() || eligible[0]; };
  const make = () => {
    const s = getNext();
    const i = Math.floor(Math.random() * (s.ayahs.length - 3));
    const seq = s.ayahs.slice(i, i + 3);
    return { s, opts: shuffle(seq.map((a, k) => ({ ...a, k }))) };
  };
  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [reveal, setReveal] = useState(false);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setPicked([]); setReveal(false); setQNum(nn); if (nn <= ROUNDS) { setQ(make()); setRound(r => r + 1); } };
  const left = useRoundTimer(round, 15, () => { g.miss(); setReveal(true); window.setTimeout(() => next(qNum + 1), 1400); }, !reveal && !finished);
  const tap = (k: number) => {
    if (reveal || finished || picked.includes(k)) return;
    if (k === picked.length) {
      const np = [...picked, k]; setPicked(np);
      if (np.length === 3) { g.correct(); setReveal(true); window.setTimeout(() => next(qNum + 1), 900); }
    } else { g.miss(); setReveal(true); window.setTimeout(() => { setReveal(false); setPicked([]); }, 1000); }
  };
  const replay = () => { g.reset(); setQNum(1); setPicked([]); setQ(make()); setRound(r => r + 1); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-sm">من سورة <b className="text-accent">{q.s.name}</b> — اضغط الآيات الثلاث بترتيبها الصحيح</p>
      <TimerBar left={left} seconds={15} />
      <div className="grid gap-2">
        {q.opts.map(a => {
          const order = picked.indexOf(a.k);
          const cls = picked.includes(a.k) || reveal
            ? "bg-accent/15 border-accent/50 text-accent"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return (
            <button key={a.k} onClick={() => tap(a.k)} className={`p-3 rounded-xl border text-right font-amiri text-lg leading-relaxed active:scale-[0.98] transition-colors ${cls}`}>
              {picked.includes(a.k) && <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-extrabold mr-2">{order + 1}</span>}
              {a.text}
            </button>
          );
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function AyahLongerEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const { corpus, failed, retry } = useCorpus();
  if (!corpus) return <CorpusGate failed={failed} retry={retry} />;
  return <AyahLongerPlay corpus={corpus} def={def} minSurah={minSurah} />;
}
function AyahLongerPlay({ corpus, def, minSurah }: { corpus: SurahText[]; def: GameDef; minSurah: number }) {
  const pool = poolFor(def, minSurah).map(s => s.number);
  const eligible = corpus.filter(c => c.ayahs.length >= 2 && pool.includes(c.app));
  const orderRef = useRef(shuffle(eligible));
  const getNext = () => { if (!orderRef.current.length) orderRef.current = shuffle(eligible); return orderRef.current.pop() || eligible[0]; };
  const wc = (t: string) => t.split(" ").length;
  const make = () => {
    let a = getNext(), b = getNext();
    if (a.app === b.app && eligible.length > 1) b = getNext();
    let ao = a.ayahs[Math.floor(Math.random() * a.ayahs.length)];
    let bo = b.ayahs[Math.floor(Math.random() * b.ayahs.length)];
    let tries = 0;
    while (wc(ao.text) === wc(bo.text) && tries++ < 10) bo = b.ayahs[Math.floor(Math.random() * b.ayahs.length)];
    return { ao, bo, an: a.name, bn: b.name, firstLonger: wc(ao.text) > wc(bo.text) };
  };
  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<"a" | "b" | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setChosen(null); setQNum(nn); if (nn <= ROUNDS) { setQ(make()); setRound(r => r + 1); } };
  const left = useRoundTimer(round, 12, () => { g.miss(); setReveal(true); window.setTimeout(() => next(qNum + 1), 1300); }, !reveal && !finished);
  const choose = (w: "a" | "b") => {
    if (reveal || finished) return;
    setChosen(w);
    if ((w === "a") === q.firstLonger) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1300);
  };
  const replay = () => { g.reset(); setQNum(1); setQ(make()); setRound(r => r + 1); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  const card = (w: "a" | "b", text: string, name: string, count: number) => {
    const isRight = (w === "a") === q.firstLonger;
    const cls = reveal && isRight ? "bg-success/20 border-success/60 text-success"
      : reveal && chosen === w ? "bg-destructive/20 border-destructive/60 text-destructive"
      : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
    return (
      <button onClick={() => choose(w)} className={`p-3 sm:p-5 rounded-xl border text-right active:scale-[0.98] transition-colors min-h-[100px] sm:min-h-[140px] flex flex-col justify-center ${cls}`}>
        <span className="block text-xs sm:text-sm font-extrabold text-muted-foreground mb-1 sm:mb-2">{name}</span>
        <span className="block font-amiri text-base sm:text-xl leading-relaxed">{text}</span>
        {reveal && <span className="block mt-1 sm:mt-2 text-xs sm:text-sm font-extrabold text-muted-foreground">{count} كلمة</span>}
      </button>
    );
  };
  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-base sm:text-lg font-medium">أيّ الآيتين كلماتها أكثر؟</p>
      <TimerBar left={left} seconds={12} />
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {card("a", q.ao.text, q.an, wc(q.ao.text))}
        {card("b", q.bo.text, q.bn, wc(q.bo.text))}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function SurahOrderEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const pool = poolFor(def, minSurah);
  const make = () => { const four = shuffle(pool).slice(0, 4); return { four, sol: [...four].sort((x, y) => x.number - y.number) }; };
  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [reveal, setReveal] = useState(false);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setPicked([]); setReveal(false); setQNum(nn); if (nn <= ROUNDS) { setQ(make()); setRound(r => r + 1); } };
  const left = useRoundTimer(round, 15, () => { g.miss(); setReveal(true); window.setTimeout(() => next(qNum + 1), 1400); }, !reveal && !finished);
  const tap = (n: number) => {
    if (reveal || finished || picked.includes(n)) return;
    const expected = q.sol[picked.length].number;
    if (n === expected) {
      const np = [...picked, n]; setPicked(np);
      if (np.length === 4) { g.correct(); setReveal(true); window.setTimeout(() => next(qNum + 1), 900); }
    } else { g.miss(); setReveal(true); window.setTimeout(() => { setReveal(false); setPicked([]); }, 1000); }
  };
  const replay = () => { g.reset(); setQNum(1); setPicked([]); setQ(make()); setRound(r => r + 1); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-base sm:text-lg font-medium">اضغط السور الأربع حسب ترتيبها في المصحف</p>
      <TimerBar left={left} seconds={15} />
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {q.four.map(s => {
          const order = picked.indexOf(s.number);
          const done = picked.includes(s.number) || reveal;
          const cls = done ? "bg-accent/15 border-accent/50 text-accent" : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return (
            <button key={s.number} onClick={() => tap(s.number)} className={`p-3 sm:p-5 rounded-xl border font-bold text-base sm:text-lg active:scale-95 transition-colors min-h-[60px] sm:min-h-[80px] flex items-center justify-center ${cls}`}>
              {picked.includes(s.number) && <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] sm:text-xs font-extrabold mr-1 sm:mr-2">{order + 1}</span>}
              {s.name}
              {reveal && <span className="block mt-1 text-[10px] sm:text-xs font-extrabold text-muted-foreground">رقم {s.number}</span>}
            </button>
          );
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

function SurahNumEngine({ def, minSurah }: { def: GameDef; minSurah: number }) {
  const pool = poolFor(def, minSurah);
  const orderRef = useRef(shuffle(pool));
  const getNext = () => { if (!orderRef.current.length) orderRef.current = shuffle(pool); return orderRef.current.pop() || pool[0]; };
  const make = () => {
    const s = getNext();
    const opts = new Set<number>([s.number]);
    // خيارات أقرب للإجابة الصحيحة (فروق أصغر = سؤال أصعب)
    for (const d of shuffle([-3, -2, -1, 1, 2, 3])) {
      const v = s.number + d;
      if (v >= 1 && v <= 114) opts.add(v);
      if (opts.size === 4) break;
    }
    return { s, opts: shuffle([...opts]) };
  };
  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const next = (nn: number) => { setReveal(false); setChosen(null); setQNum(nn); if (nn <= ROUNDS) { setQ(make()); setRound(r => r + 1); } };
  const left = useRoundTimer(round, 10, () => { g.miss(); setReveal(true); window.setTimeout(() => next(qNum + 1), 1300); }, !reveal && !finished);
  const choose = (n: number) => {
    if (reveal || finished) return;
    setChosen(n);
    if (n === q.s.number) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1200);
  };
  const replay = () => { g.reset(); setQNum(1); setQ(make()); setRound(r => r + 1); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-foreground text-base sm:text-lg font-bold">ما رقم سورة <span className="text-accent">{q.s.name}</span> في ترتيب المصحف؟</p>
      <TimerBar left={left} seconds={10} />
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {q.opts.map(n => {
          const cls = reveal && n === q.s.number ? "bg-success/20 border-success/60 text-success"
            : reveal && n === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={n} onClick={() => choose(n)} className={`p-4 sm:p-5 rounded-xl border font-extrabold text-xl sm:text-2xl active:scale-95 transition-colors min-h-[60px] sm:min-h-[80px] ${cls}`}>{n}</button>;
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

const ENGINES: Record<GameEngine, (p: { def: GameDef; minSurah: number }) => JSX.Element> = {
  order: ({ def }) => <AyahOrderGame def={def} onBack={() => window.dispatchEvent(new Event("mushaf:remotegame:exit"))} />, memory: MemoryEngine, memory_meaning: () => <MemoryGame onBack={() => window.dispatchEvent(new Event("mushaf:remotegame:exit"))} />, which: WhichEngine, quiz: QuizEngine, count: CountEngine,
  nextayah: NextAyahEngine, prevayah: PrevAyahEngine, whichsurah: WhichSurahEngine, missingword: ({ def }) => <MissingWordGame def={def} onBack={() => window.dispatchEvent(new Event("mushaf:remotegame:exit"))} />, surahaudio: SurahAudioEngine,
  ayahsurah: AyahSurahEngine, ayahorder: AyahOrderEngine, ayahlonger: AyahLongerEngine, surahorder: SurahOrderEngine, surahnum: SurahNumEngine,
};
const ICONS: Record<string, typeof Headphones> = { Headphones, ListOrdered, LayoutGrid, Scale, Trophy, Hash, Grid3x3, Gamepad2, BookOpen, Sparkles, Puzzle, Brain };
const iconFor = (key: string) => ICONS[key] || Gamepad2;

/* ───────────────── ركن الأطفال ───────────────── */
export default function KidsGames() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [profile, setProfile] = useState(getProfile);
  const [progress, setProgress] = useState(getProgress);
  const [coins, setCoins] = useState(getCoins);
  const [catalog, setCatalog] = useState<GameDef[]>(getGameCatalog);
  const [pinAction, setPinAction] = useState<null | "parent" | "exit" | "setread" | "setparent">(null);
  const [showSurahSelector, setShowSurahSelector] = useState(!profile.currentSurah);
  const [showNotifications, setShowNotifications] = useState(false);

  // مخفيّ للمستخدمين (لكن يدخله المالك للتجربة)
  useEffect(() => { if (kidsRouteBlocked()) navigate("/audio", { replace: true }); }, [navigate]);

  useEffect(() => {
    enterKioskMode();
    
    // Prevent back navigation
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      toast({ title: "الخروج مقفل", description: "اضغط على زر خروج وأدخل الرمز", variant: "destructive" });
    };
    window.addEventListener("popstate", handlePopState);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isKidsMode()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isKidsMode()) return;
      const blocked = event.key === "F5" || event.key === "F11" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r") || (event.altKey && event.key === "ArrowLeft");
      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
        toast({ title: "الخروج مقفل", description: "يمكنك الخروج فقط برمز ولي الأمر من صفحة الألعاب", variant: "destructive" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Enforce Schedule and Play Duration
    let lastPlayTick = Date.now();
    const checkSchedule = (flushExact = false) => {
      const timeCheck = isTimeAllowed();
      if (!timeCheck.allowed) {
        toast({ title: "انتهى وقت اللعب ⏰", description: timeCheck.reason, variant: "destructive" });
        if (hasKidsPin()) setKidsLocked(false);
        navigate("/");
        return;
      }
      
      if (isKidsMode()) {
        const now = Date.now();
        const mins = (now - lastPlayTick) / 60000;
        if (mins >= 0.1 || flushExact) {
           const { justExpired, progress } = addPlayMinutes(mins);
           lastPlayTick = now;
           if (justExpired || progress.playExpired) {
             toast({ title: "انتهى وقت اللعب ⏰", description: "لقد استنفدت وقت اللعب المخصص لك. يلزم رمز ولي الأمر للخروج.", variant: "destructive" });
             setPinAction("exit");
           }
        }
      }
    };
    // initial check on mount, without adding minutes yet
    const initialCheck = isTimeAllowed();
    if (!initialCheck.allowed || getProgress().playExpired) {
        toast({ title: "انتهى وقت اللعب ⏰", description: initialCheck.reason || "لقد استنفدت وقت اللعب. يلزم رمز ولي الأمر للخروج.", variant: "destructive" });
        setPinAction("exit");
    }
    const scheduleInterval = setInterval(() => checkSchedule(false), 30000); // Check every 30s instead of 60s
    
    const handleExit = () => checkSchedule(true);
    window.addEventListener("beforeunload", handleExit);
    window.addEventListener("mushaf:flush_time", handleExit);

    return () => { 
      exitKioskMode(); 
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleExit);
      window.removeEventListener("mushaf:flush_time", handleExit);
      clearInterval(scheduleInterval);
    };
  }, [navigate]);

  // تسخين نصوص السور مبكراً (تعمل دون إنترنت)
  useEffect(() => { ensureCorpus().catch(() => { /* ستعيد اللعبة المحاولة عند فتحها */ }); }, []);

  const [showBadges, setShowBadges] = useState(false);


  // نظام فتح الألعاب بالنجوم (المال): لعبة واحدة مجانية والبقية تُفتح بالنجوم المكتسبة
  const [unlockDef, setUnlockDef] = useState<GameDef | null>(null);
  const isGameOwned = (g: GameDef) => g.cost <= 0 || ownItem(g.id);
  useEffect(() => {
    const h = () => setActive(null);
    window.addEventListener("mushaf:remotegame:exit", h);
    return () => window.removeEventListener("mushaf:remotegame:exit", h);
  }, []);

  useEffect(() => {
    const refresh = () => { setProfile(getProfile()); setProgress(getProgress()); setCoins(getCoins()); setCatalog(getGameCatalog()); };
    refresh();
    const evts = ["focus", "mushaf:games_unlocked", "mushaf:coins", "mushaf:gamecatalog", "mushaf:activeprofile"];
    evts.forEach(e => window.addEventListener(e, refresh));

    const handleBadgeUnlocked = (e: any) => {
      const badges = e.detail;
      if (Array.isArray(badges) && badges.length > 0) {
        badges.forEach((b: any) => {
          toast({
            title: `🏆 مبارك! وسام جديد: ${b.title}`,
            description: `حصلت على ${b.rewardCoins} نجمة إضافية!`,
          });
        });
      }
    };
    window.addEventListener("mushaf:badge_unlocked", handleBadgeUnlocked);

    return () => {
      evts.forEach(e => window.removeEventListener(e, refresh));
      window.removeEventListener("mushaf:badge_unlocked", handleBadgeUnlocked);
    };
  }, []);

  // قفل واحد فقط: «اقرأ لتفتح الألعاب» — بلا حدّ لوقت اللعب وبلا شراء
  const unlocked = progress.unlocked || profile.goalMinutes <= 0;
  const canPlay = unlocked;

  const myGames = catalog.filter(g => g.ageMin <= profile.age && profile.age <= (g.ageMax ?? 16));
  const def = active ? catalog.find(g => g.id === active) : null;
  const Engine = def ? ENGINES[def.engine] : null;

  const kidsMode = isKidsMode();
  const inApp = shouldHideMushaf();

  const onPinSuccess = () => {
    if (pinAction === "parent" || pinAction === "setparent") {
      setKidsLocked(false);
      setPinAction(null);
      navigate("/parent");
      return;
    }
    if (pinAction === "exit") {
      setKidsLocked(false);
      setPinAction(null);
      toast({ title: "تم فك القفل والخروج للتلاوات" });
      navigate("/audio");
      return;
    }
    if (pinAction === "setread") {
      setKidsLocked(true);
      setPinAction(null);
      navigate("/audio");
      return;
    }
    setPinAction(null);
  };

  const exitKidsCorner = () => {
    if (hasKidsPin()) {
      setPinAction("exit");
    } else {
      setKidsLocked(false);
      toast({ title: "تم الخروج إلى التلاوات" });
      navigate("/audio");
    }
  };

  const lockAndRead = () => {
    if (hasKidsPin()) {
      setAppMode("kids");
      setKidsLocked(true);
      navigate("/audio");
    } else {
      setPinAction("setread");
    }
  };

  const openParent = () => {
    if (hasKidsPin()) setPinAction("parent");
    else setPinAction("setparent");
  };

  const headerBack = () => {
    if (active) {
      setActive(null);
    } else {
      exitKidsCorner();
    }
  };

  const tapGame = (id: string) => {
    if (!canPlay) { toast({ title: "أكمِل قراءتك أولاً لتُفتح الألعاب", variant: "destructive" }); return; }
    const gg = catalog.find(x => x.id === id);
    if (!gg) return;
    if (!isGameOwned(gg)) { setUnlockDef(gg); return; }   // مقفلة بالنجوم — تظهر نافذة الفتح
    setActive(id);
  };

  // الشراء بالنجوم مباشرة — بلا إذن إضافي (النجوم تُربح بالقراءة فقط)
  const buyGame = () => {
    if (!unlockDef) return;
    if (unlockItem(unlockDef.id, unlockDef.cost)) {
      toast({ title: `فُتحت لعبة «${unlockDef.title}»! 🎉` });
      const id = unlockDef.id;
      setUnlockDef(null);
      setActive(id);
    } else {
      toast({ title: "نجومك لا تكفي", description: "استمع واقرأ أكثر لتربح نجوماً وتفتح ألعاباً جديدة", variant: "destructive" });
    }
  };

  const pct = Math.min(100, (progress.minutes / Math.max(1, profile.goalMinutes)) * 100);

  if (showSurahSelector) {
    return (
      <div className="min-h-screen page-nour text-foreground pb-8" dir="rtl">
        <div className="mx-auto max-w-md px-4 py-8 space-y-6 animate-fade-up">
          <div className="text-center space-y-3 mb-6">
            <h1 className="text-3xl font-extrabold text-gradient-gold drop-shadow-md">بطل التحدي الأسطوري</h1>
            <p className="text-muted-foreground font-bold text-lg">أين وصلت في الحفظ؟ حدد السورة لنبدأ!</p>
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto p-1 custom-scrollbar">
            {SURAHS.filter(s => s.number !== 1).map(s => (
              <button key={s.number} onClick={() => { setCurrentSurah(s.number); setProfile({...profile, currentSurah: s.number}); setShowSurahSelector(false); }}
                className={`p-4 rounded-2xl border-2 font-extrabold text-xl active:scale-95 transition-all ${profile.currentSurah === s.number ? 'bg-accent/20 border-accent text-accent shadow-[0_0_15px_rgba(var(--accent),0.3)]' : 'bg-card border-border hover:border-accent/50 text-foreground'}`}>
                {s.name}
              </button>
            ))}
          </div>
          {!!profile.currentSurah && (
            <button onClick={() => setShowSurahSelector(false)} className="btn-emerald w-full p-4 rounded-2xl font-bold text-xl shadow-lg active:scale-95">متابعة اللعب</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe page-nour text-foreground" dir="rtl">
      <div className="mx-auto w-full max-w-md px-3 py-3 sm:px-4 sm:py-4 space-y-3 sm:space-y-4 container-mobile">
        <header className="flex items-center justify-between gap-2">
          <button onClick={headerBack} className="flex h-10 items-center gap-1.5 rounded-full bg-secondary text-secondary-foreground px-4 text-sm font-bold hover:brightness-95 active:scale-95 border border-border">
            <ArrowRight className="h-4 w-4" /> {active ? "الرجوع للألعاب" : "الخروج للتلاوات"}
          </button>
          <h1 className="font-extrabold text-lg text-gradient-gold">ركن الأطفال</h1>
          {!active ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent font-extrabold text-sm px-2.5 h-10"><Star className="w-4 h-4 fill-current" /> {coins}</span>


              <button onClick={() => setShowBadges(true)} aria-label="الأوسمة والإنجازات" title="الأوسمة والإنجازات" className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-500 hover:brightness-95 flex items-center justify-center active:scale-95 border border-amber-500/30 shadow-sm"><Trophy className="w-5 h-5" /></button>
              <button onClick={() => setShowNotifications(true)} aria-label="الإشعارات" className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground hover:brightness-95 flex items-center justify-center active:scale-95"><Bell className="w-5 h-5" /></button>
              <button onClick={openParent} aria-label="إعدادات ولي الأمر" className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground hover:brightness-95 flex items-center justify-center active:scale-95"><Settings className="w-5 h-5" /></button>
            </div>
          ) : <span className="w-10" />}
        </header>

        {def && Engine ? (
          <div className="card-nour p-2 sm:p-4 animate-fade-up game-container">
            <h2 className="text-center font-bold text-accent mb-2 sm:mb-4 flex items-center justify-center gap-2 text-sm sm:text-base">{(() => { const I = iconFor(def.icon); return <I className="w-4 h-4 sm:w-5 sm:h-5" />; })()} {def.title}</h2>
            <Engine def={def} minSurah={profile.currentSurah || 38} />
          </div>
        ) : (
          <>
            <div className="card-nour p-4 text-center space-y-2 animate-fade-up">
              <div className="flex flex-col items-center gap-1">
                <span className="w-16 h-16 flex items-center justify-center transition-all group-hover:scale-105"><Avatar name={profile.avatar} className="w-16 h-16" /></span>
                <p className="font-bold text-foreground">{profile.name ? `مرحباً ${profile.name}` : "مرحباً بك"}</p>
                {getProfiles().length > 1 && (
                  <button onClick={() => navigate("/profiles")} className="text-xs font-bold text-accent underline-offset-2 hover:underline">تبديل الطفل</button>
                )}
              </div>
              {!unlocked ? (
                <>
                  <p className="text-sm text-destructive flex items-center justify-center gap-1 font-bold">
                    <Lock className="w-4 h-4" /> الألعاب مقفلة — استمع {profile.goalMinutes >= 3 && profile.goalMinutes <= 10 ? `${profile.goalMinutes} دقائق` : `${profile.goalMinutes} دقيقة`} لفتحها
                  </p>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} /></div>
                  <p className="text-xs text-muted-foreground font-bold">{progress.minutes} / {profile.goalMinutes} {profile.goalMinutes >= 3 && profile.goalMinutes <= 10 ? "دقائق" : "دقيقة"}</p>
                  <button
                    onClick={() => {
                      setAppMode("kids");
                      setKidsLocked(true);
                      navigate("/audio");
                    }}
                    className="btn-emerald w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 shadow-md"
                  >
                    <Headphones className="w-5 h-5" /> استمع الآن لفتح الألعاب
                  </button>
                </>
              ) : (
                <p className="text-sm text-success flex items-center justify-center gap-1"><Gift className="w-4 h-4" /> {profile.reward}</p>
              )}
            </div>

            {/* ركن التخصيص (وجوه وألوان بالنجوم) */}
            <button onClick={() => navigate("/shop")} className="relative z-10 w-full p-3 rounded-2xl bg-gradient-to-l from-accent/15 to-card border border-accent/40 shadow-soft flex items-center gap-3 active:scale-[0.99]">
              <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6" /></span>
              <span className="flex-1 text-right"><span className="block font-extrabold text-foreground">خصّص شخصيتك</span><span className="block text-[11px] text-muted-foreground">افتح وجوهاً وألواناً جديدة بنجومك</span></span>
              <span className="inline-flex items-center gap-1 text-accent font-extrabold"><Star className="w-4 h-4 fill-current" /> {coins}</span>
            </button>

            <div className="flex items-center justify-between mt-8 mb-3 px-1">
              <h3 className="font-extrabold text-xl text-foreground flex items-center gap-2"><Trophy className="w-6 h-6 text-accent" /> الألعاب الأسطورية</h3>
              <button onClick={() => setShowSurahSelector(true)} className="text-xs font-bold text-accent bg-accent/15 px-3 py-1.5 rounded-full hover:bg-accent/25 transition-colors">تغيير السورة ({SURAHS.find(s => s.number === profile.currentSurah)?.name})</button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {myGames.map(g => {
                const I = iconFor(g.icon);
                const owned = isGameOwned(g);
                return (
                  <button key={g.id} onClick={() => tapGame(g.id)}
                    className={`relative overflow-hidden rounded-[1.2rem] sm:rounded-[1.7rem] p-[2px] active:scale-[0.98] transition-transform text-right ${!canPlay ? "opacity-60" : "hover:shadow-xl hover:shadow-accent/20"}`}>
                    <div className={`absolute inset-0 opacity-80 ${g.tint}`} />
                    <div className="relative bg-card/95 backdrop-blur-md rounded-[1.1rem] sm:rounded-[1.6rem] p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                      <span className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${g.tint}`}><I className="w-6 h-6 sm:w-8 sm:h-8" /></span>
                      <div className="flex-1 min-w-0">
                        <span className="block font-extrabold text-foreground text-base sm:text-xl leading-tight truncate">{g.title}</span>
                        <span className="inline-flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold text-muted-foreground bg-secondary rounded-full px-2.5 py-0.5">مناسب لسن {g.ageMin}+</span>
                          {g.cost > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-accent bg-accent/15 rounded-full px-2 py-0.5"><Star className="w-3 h-3 fill-current" /> {g.cost}</span>
                          ) : (
                            <span className="text-[11px] font-extrabold text-success bg-success/15 rounded-full px-2 py-0.5">مجانية</span>
                          )}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground opacity-50 shrink-0"><ArrowRight className="w-4 h-4" /></div>
                    </div>
                    {!canPlay ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-[1.7rem]"><Lock className="w-10 h-10 text-muted-foreground" /></div>
                    ) : !owned && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[2px] rounded-[1.7rem]">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground font-extrabold text-sm px-4 py-2 shadow-lg">
                          <Lock className="w-4 h-4" /> افتح بـ {g.cost} <Star className="w-4 h-4 fill-current" />
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
              
              {/* زر الخروج المباشر إلى التلاوات */}
              <button onClick={() => navigate("/audio")} className="mt-2 relative overflow-hidden rounded-[1.7rem] p-[2px] active:scale-[0.98] transition-transform text-right hover:shadow-xl hover:shadow-accent/30">
                <div className="absolute inset-0 bg-accent/20" />
                <div className="relative bg-card/95 backdrop-blur-md rounded-[1.6rem] p-4 flex items-center gap-4 border border-accent/40">
                  <span className="w-16 h-16 rounded-2xl bg-accent/20 text-accent flex items-center justify-center shrink-0"><Headphones className="w-8 h-8" /></span>
                  <div className="flex-1">
                    <span className="block font-extrabold text-foreground text-xl leading-tight">الخروج إلى تلاوات القرآن</span>
                    <span className="inline-block mt-1 text-[11px] font-bold text-accent bg-accent/15 rounded-full px-2.5 py-0.5">الاستماع للقرآن الكريم</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shrink-0"><ArrowRight className="w-4 h-4" /></div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>



      {/* نافذة فتح لعبة بالنجوم (المال) */}
      {unlockDef && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setUnlockDef(null)}>
          <div className="card-nour w-full max-w-sm p-6 text-center space-y-4 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent font-extrabold px-3 py-1.5"><Star className="w-4 h-4 fill-current" /> {coins}</span>
              <button onClick={() => setUnlockDef(null)} aria-label="إغلاق" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-lg font-extrabold text-foreground">افتح لعبة «{unlockDef.title}»؟</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              التكلفة: <span className="inline-flex items-center gap-1 font-extrabold text-accent align-middle">{unlockDef.cost} <Star className="w-4 h-4 fill-current" /></span>
              <br />القراءة والاستماع يمنحانك نجوماً أكثر بكثير من الألعاب
            </p>
            <div className="flex gap-2">
              <button onClick={buyGame} className="btn-gold flex-1 py-3 rounded-xl font-bold active:scale-95 transition-transform">فتح بالنجوم</button>
              <button onClick={() => setUnlockDef(null)} className="flex-1 py-3 rounded-xl font-bold bg-secondary text-secondary-foreground border border-border active:scale-95 transition-transform">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {pinAction && (
        <ParentalGateModal
          title={
            pinAction === "setparent" || pinAction === "setread"
              ? "إعداد رمز حماية وضع الأطفال"
              : pinAction === "parent"
              ? "الدخول لمنطقة الوالدين"
              : "الخروج من ركن الأطفال"
          }
          onSuccess={onPinSuccess}
          onCancel={() => setPinAction(null)}
        />
      )}
      
      {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
      {showBadges && <BadgesModal onClose={() => setShowBadges(false)} />}
    </div>
  );
}
