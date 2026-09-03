import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, RefreshCw, BookOpen, Lock, Settings, Bell, Headphones, ListOrdered, LayoutGrid, Scale, Trophy, Gift, Star, Hash, Grid3x3, Flame, Sparkles, Gamepad2, Puzzle, X, Crown, Brain, Camera, Award, Download, Clock } from "lucide-react";
import { getAllSurahs } from "../data/quranData";
import { getSurahAudioUrl, hasCloudAudio } from "../data/audioUrls";
import { getProfile, getProgress, getProfiles, getCoins, addCoins, kidsRouteBlocked, setCurrentSurah, addPlayMinutes, setAppMode, ownItem, unlockItem, getActiveId, getAppMode, isPureMode, formatCoins } from "../data/kidsProfile";
import { getGameCatalog, type GameDef, type GameEngine } from "../data/gameCatalog";
import { fetchRemoteGames, precacheRemoteGames } from "../data/remoteGames";

import { ensureCorpus, type SurahText } from "../data/quranText";
import { isKidsMode, setKidsLocked, hasKidsPin } from "../data/kidsLock";
import { shouldHideMushaf } from "../utils/tauriUtils";
import ParentalGateModal from "../components/ParentalGateModal";
import MemoryGame from "../games/MemoryGame";
import MissingWordGame from "../games/MissingWordGame";
import AyahOrderGame from "../games/AyahOrderGame";
import DetectiveGame from "../games/DetectiveGame";
import WordBuilderGame from "../games/WordBuilderGame";
import CatchStarGame from "../games/CatchStarGame";
import AyahMathGame from "../games/AyahMathGame";
import RemoteGameFrame from "../components/RemoteGameFrame";
import Avatar, { getAvatarSrc } from "../components/Avatar";
import { drawQRCodeOnCanvas } from "../utils/qrCode";
import NotificationsModal from "../components/NotificationsModal";
import BadgesModal from "../components/BadgesModal";
import QuranLockGateModal from "../components/QuranLockGateModal";
import { toast } from "../hooks/use-toast";
import { isTimeAllowed } from "../data/kidsSchedule";
import { calculateStreak } from "../data/kidsBadges";

async function enterKioskMode() {
  // تم إيقاف تكبير الشاشة التلقائي بناءً على طلب المستخدم
}

async function exitKioskMode() {
  // تم إيقاف تكبير الشاشة التلقائي بناءً على طلب المستخدم
}

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const SURAHS = getAllSurahs();

function drawCanvasStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const size = i % 2 === 0 ? radius : radius * 0.42;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function loadCanvasImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = encodeURI(src);
    setTimeout(() => resolve(null), 2500);
  });
}

const poolFor = (def: GameDef, minSurahOverride: number = 78) => {
  const { minAyah, maxAyah } = def.params || {};
  // يبدأ النطاق من السورة المختارة ويتجه إلى السور التالية في ترتيب المصحف.
  const minSurahNum = Math.min(114, Math.max(1, minSurahOverride));
  const minIndex = SURAHS.findIndex(s => s.number === minSurahNum);
  const safeMinIndex = minIndex >= 0 ? minIndex : SURAHS.findIndex(s => s.number === 78);

  const out = SURAHS.filter((s, idx) =>
    idx >= safeMinIndex &&
    (minAyah == null || s.ayahCount >= minAyah) &&
    (maxAyah == null || s.ayahCount <= maxAyah)
  );

  return out.length >= 4 ? out : SURAHS.filter((s, idx) => idx >= safeMinIndex);
};
// سور مجاورة للسورة المختارة (تُستخدم للمشتّات/الترتيب في بعض الألعاب)
const neighborPool = (def: GameDef, minSurahOverride: number, n: number) => {
  const chosen = SURAHS.find(s => s.number === minSurahOverride);
  if (!chosen) return poolFor(def, minSurahOverride);
  const chosenIndex = SURAHS.findIndex(s => s.number === chosen.number);
  const neighbors = SURAHS.slice(chosenIndex, chosenIndex + n).filter(s => s.number !== chosen.number);
  return [chosen, ...neighbors];
};

/* ───────────────── نواة الحماس ───────────────── */
function useGame() {
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [earned, setEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(0);
  const [gain, setGain] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(0);

  const correct = () => {
    const ns = streak + 1;
    // نقاط الألعاب قليلة عمداً — القراءة هي المصدر الأساسي للنجوم (المال)
    const bonus = ns >= 5 ? 3 : ns >= 3 ? 2 : 1;
    addCoins(bonus); setGain(bonus); setEarned(e => e + bonus);
    setScore(s => s + 1); setAnswers(a => a + 1); setStreak(ns); setFlash(f => f + 1);
    window.setTimeout(() => setGain(0), 900);
  };
  const miss = () => {
    setStreak(0);
    setGain(0);
    setMistakes(m => m + 1);
    setWrongFlash(w => w + 1);
    setAnswers(a => a + 1);
  };
  const reset = () => {
    setScore(0);
    setAnswers(0);
    setMistakes(0);
    setEarned(0);
    setStreak(0);
    setGain(0);
    setWrongFlash(0);
  };
  return { score, answers, mistakes, earned, streak, flash, gain, wrongFlash, correct, miss, reset };
}
type Game = ReturnType<typeof useGame>;

const PRAISE_NORMAL = ["أحسنت يا بطل!", "رائع!", "أنت ذكي!"];
const PRAISE_GOOD = ["ممتاز جداً!", "أداء مذهل!", "عمل رائع!"];
const PRAISE_SUPER = ["ما شاء الله!", "أنت عبقري!", "أسطورة!"];
const ENCOURAGE_MISTAKE = ["حاول ثانية يا بطل! 🌟", "لا بأس، التكرار يعلّم!", "ركّز جيداً، أنت تستطيع! 💪", "قريب جداً! استمر! ✨"];

const GameHud = ({ g }: { g: Game }) => {
  const getPraise = () => {
    if (g.streak >= 5) return PRAISE_SUPER[g.flash % PRAISE_SUPER.length];
    if (g.streak >= 3) return PRAISE_GOOD[g.flash % PRAISE_GOOD.length];
    return PRAISE_NORMAL[g.flash % PRAISE_NORMAL.length];
  };

  const getEncourage = () => {
    return ENCOURAGE_MISTAKE[g.wrongFlash % ENCOURAGE_MISTAKE.length];
  };

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3 min-h-[28px] flex-wrap">
      <span className="inline-flex items-center gap-1 text-accent font-extrabold text-xs sm:text-sm">
        <Star className="w-4 h-4 fill-current text-amber-500" /> {g.score} صحيحة
      </span>
      {g.mistakes > 0 && (
        <span className="inline-flex items-center gap-1 text-rose-500 font-bold text-xs bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 animate-in fade-in">
          ❌ {g.mistakes} أخطاء
        </span>
      )}
      {g.streak >= 2 && (
        <span className="inline-flex items-center gap-1 text-orange-400 font-bold text-xs sm:text-sm">
          <Flame className="w-4 h-4" /> {g.streak}× متتالية
        </span>
      )}
      {g.gain > 0 && (
        <span key={g.flash} className="inline-flex items-center gap-0.5 text-success font-extrabold animate-bounce text-xs sm:text-sm">
          +{g.gain}<Star className="w-3.5 h-3.5 fill-current" />
        </span>
      )}
      {g.flash > 0 && (
        <span key={`p-${g.flash}`} className="pointer-events-none fixed left-1/2 top-1/3 z-[60] -translate-x-1/2 font-extrabold text-accent drop-shadow-lg animate-celebrate"
          style={{ fontSize: g.streak >= 5 ? "2.2rem" : g.streak >= 3 ? "1.8rem" : "1.4rem" }}>
          {getPraise()}
        </span>
      )}
      {g.wrongFlash > 0 && (
        <span key={`w-${g.wrongFlash}`} className="pointer-events-none fixed left-1/2 top-1/3 z-[60] -translate-x-1/2 font-extrabold text-amber-500 drop-shadow-lg animate-bounce"
          style={{ fontSize: "1.2rem" }}>
          {getEncourage()}
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
  const msg = pct >= 80 ? "ما شاء الله! إتقان ممتاز يا بطل" : pct >= 50 ? "أحسنت! أداء مبارك ورائع" : "لا بأس يا بطل — التكرار يعلّم الشطار!";
  return (
    <div className="space-y-4 text-center py-4 animate-fade-up">
      <Trophy className="w-14 h-14 mx-auto text-accent animate-pulse" />
      <p className="text-xl font-extrabold text-foreground">{msg}</p>
      <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-bold">
        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">✓ {g.score} إجابات صحيحة</span>
        <span className="text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl">❌ {g.mistakes} أخطاء</span>
      </div>
      <p className="inline-flex items-center gap-1 text-accent font-extrabold text-lg"><Star className="w-5 h-5 fill-current" /> ربحت {g.earned} نجمة</p>
      <button onClick={onReplay} className="btn-gold mx-auto px-6 py-2.5 rounded-xl font-bold flex items-center gap-1.5 active:scale-95 shadow-md"><RefreshCw className="w-4 h-4" /> العب من جديد</button>
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
    const wrong = shuffle(pool.filter(x => x.ayahCount !== s.ayahCount)).slice(0, 3);
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
  const replay = () => { orderRef.current = shuffle(pool); g.reset(); setQNum(1); setQ(make()); setRound(r => r + 1); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-foreground text-base sm:text-lg font-bold">أيّ سورة عدد آياتها <span className="text-accent">{q.s.ayahCount}</span>؟</p>
      <TimerBar left={left} seconds={9} />
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {q.opts.map(s => {
          const cls = reveal && s.number === q.s.number ? "bg-success/20 border-success/60 text-success"
            : reveal && s.number === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return (
            <button key={s.number} onClick={() => choose(s.number)} className={`p-3 sm:p-5 rounded-xl border font-bold text-base sm:text-lg active:scale-95 transition-colors min-h-[55px] sm:min-h-[70px] ${cls}`}>
              {s.name}{reveal && <span className="mr-1 text-xs font-extrabold text-muted-foreground">({s.ayahCount} آيات)</span>}
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
  const usedAyahsRef = useRef<Set<string>>(new Set());

  const getNext = () => { 
    if (!orderRef.current.length) orderRef.current = shuffle(eligible); 
    return orderRef.current.pop() || eligible[0]; 
  };

  const make = (prevApp?: number) => {
    let s = getNext();
    if (s.app === prevApp && eligible.length > 1) s = getNext();
    let promptAyah = s.ayahs[0];
    let answerAyah = s.ayahs[1];

    for (let t = 0; t < 20; t++) {
      const i = Math.floor(Math.random() * (s.ayahs.length - 1));
      promptAyah = s.ayahs[i];
      answerAyah = s.ayahs[i + 1];
      if (!usedAyahsRef.current.has(promptAyah.text)) {
        usedAyahsRef.current.add(promptAyah.text);
        break;
      }
      s = getNext();
    }

    const distract = shuffle(s.ayahs.filter(a => a.n !== answerAyah.n && a.n !== promptAyah.n)).slice(0, 2);
    const others = shuffle(eligible.filter(c => c.app !== s.app));
    for (const o of others) {
      if (distract.length >= 2) break;
      const a = o.ayahs[Math.floor(Math.random() * o.ayahs.length)];
      if (a.text !== answerAyah.text && !distract.some(d => d.text === a.text)) distract.push(a);
    }
    return { s, prompt: promptAyah, opts: shuffle([answerAyah, ...distract]), answer: answerAyah };
  };

  const [q, setQ] = useState(() => make());
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;

  const next = (nn: number) => { 
    setReveal(false); 
    setChosen(null); 
    setQNum(nn); 
    if (nn <= ROUNDS) setQ(make(q.s.app)); 
  };

  const answerTap = (text: string) => {
    if (reveal || finished) return;
    setChosen(text);
    if (text === q.answer.text) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), text === q.answer.text ? 700 : 1600);
  };

  const replay = () => { 
    usedAyahsRef.current.clear(); 
    g.reset(); 
    setQNum(1); 
    setQ(make()); 
  };

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
  const usedAyahsRef = useRef<Set<string>>(new Set());

  const getNext = () => { 
    if (!orderRef.current.length) orderRef.current = shuffle(eligible); 
    return orderRef.current.pop() || eligible[0]; 
  };

  const make = (prevApp?: number) => {
    let s = getNext();
    if (s.app === prevApp && eligible.length > 1) s = getNext();
    let promptAyah = s.ayahs[1];
    let answerAyah = s.ayahs[0];

    for (let t = 0; t < 20; t++) {
      const i = Math.floor(Math.random() * (s.ayahs.length - 1)) + 1;
      promptAyah = s.ayahs[i];
      answerAyah = s.ayahs[i - 1];
      if (!usedAyahsRef.current.has(promptAyah.text)) {
        usedAyahsRef.current.add(promptAyah.text);
        break;
      }
      s = getNext();
    }

    const distract = shuffle(s.ayahs.filter(a => a.n !== answerAyah.n && a.n !== promptAyah.n)).slice(0, 2);
    const others = shuffle(eligible.filter(c => c.app !== s.app));
    for (const o of others) {
      if (distract.length >= 2) break;
      const a = o.ayahs[Math.floor(Math.random() * o.ayahs.length)];
      if (a.text !== answerAyah.text && !distract.some(d => d.text === a.text)) distract.push(a);
    }
    return { s, prompt: promptAyah, opts: shuffle([answerAyah, ...distract]), answer: answerAyah };
  };

  const [q, setQ] = useState(() => make());
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;

  const next = (nn: number) => { 
    setReveal(false); 
    setChosen(null); 
    setQNum(nn); 
    if (nn <= ROUNDS) setQ(make(q.s.app)); 
  };

  const answerTap = (text: string) => {
    if (reveal || finished) return;
    setChosen(text);
    if (text === q.answer.text) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), text === q.answer.text ? 700 : 1600);
  };

  const replay = () => { 
    usedAyahsRef.current.clear(); 
    g.reset(); 
    setQNum(1); 
    setQ(make()); 
  };

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
  const usedAyahsRef = useRef<Set<string>>(new Set());

  const getNext = () => { 
    if (!orderRef.current.length) orderRef.current = shuffle(eligible); 
    return orderRef.current.pop() || eligible[0]; 
  };

  const make = (prevApp?: number) => {
    let s = getNext();
    if (s.app === prevApp && eligible.length > 1) s = getNext();
    const ayahs = s.ayahs.filter(a => !(s.std === 1 && a.n === 1));
    const cleanAyahs = ayahs.filter(a => !usedAyahsRef.current.has(a.text));
    const a = (cleanAyahs.length ? cleanAyahs[Math.floor(Math.random() * cleanAyahs.length)] : ayahs[0]) || s.ayahs[0];
    usedAyahsRef.current.add(a.text);

    const others = shuffle(eligible.filter(c => c.app !== s.app)).slice(0, 3);
    return { text: a.text, answer: s, opts: shuffle([s, ...others]) };
  };

  const [q, setQ] = useState(() => make());
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;

  const next = (nn: number) => { 
    setReveal(false); 
    setChosen(null); 
    setQNum(nn); 
    if (nn <= ROUNDS) setQ(make(q.answer.app)); 
  };

  const choose = (app: number) => {
    if (reveal || finished) return;
    setChosen(app);
    if (app === q.answer.app) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1100);
  };

  const replay = () => { 
    usedAyahsRef.current.clear(); 
    g.reset(); 
    setQNum(1); 
    setQ(make()); 
  };

  if (finished) return <ResultCard g={g} onReplay={replay} />;

  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-sm sm:text-base font-bold">من أيّ سورة هذه الآية الكريمة؟</p>
      <div className="p-4 rounded-2xl bg-accent/10 border border-accent/40 font-amiri text-lg sm:text-2xl leading-loose text-foreground">{q.text}</div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {q.opts.map(s => {
          const cls = reveal && s.app === q.answer.app ? "bg-success/20 border-success/60 text-success"
            : reveal && s.app === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={s.app} onClick={() => choose(s.app)} className={`p-3 sm:p-5 rounded-xl border font-bold text-base sm:text-lg active:scale-95 transition-colors min-h-[55px] sm:min-h-[70px] ${cls}`}>{s.name}</button>;
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
  const deckRef = useRef<typeof SURAHS>([]);

  const makeQuestion = () => {
    const available = poolFor(def, minSurah).filter(s => hasCloudAudio(s.number) || s.number === 1);
    if (deckRef.current.length === 0) {
      deckRef.current = shuffle([...available]);
    }
    const correct0 = deckRef.current.pop() || available[0];
    const optionPool = neighborPool(def, correct0.number, 4).filter(s => hasCloudAudio(s.number) || s.number === 1);
    const others = shuffle(optionPool.filter(s => s.number !== correct0.number)).slice(0, 3);
    return { surah: correct0, options: shuffle([correct0, ...others].map((s) => ({ number: s.number, name: s.name }))) };
  };

  useEffect(() => {
    deckRef.current = [];
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
    deckRef.current = [];
    g.reset(); 
    setQuestion(makeQuestion()); 
    setSelected(null); 
    setFeedback(null); 
    setRound(1);
  }} />;

  return (
    <div className="space-y-4 text-center">
      <SessionBar q={round} />
      <p className="text-foreground text-lg font-bold">اسمع السورة الكريمة واختر اسمها</p>
      <div className="py-2">
        <button
          onClick={playAudio}
          className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-accent to-amber-500 text-accent-foreground flex items-center justify-center shadow-xl active:scale-95 transition-transform hover:brightness-110"
        >
          <Headphones className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
        </button>
        <span className="block mt-2 text-xs font-bold text-muted-foreground">اضغط للاستماع 🎧</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {question.options.map(o => {
          const cls = feedback && o.number === question.surah.number ? "bg-success/20 border-success/60 text-success"
            : feedback && o.number === selected ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return (
            <button key={o.number} onClick={() => choose(o.number)} className={`p-3 sm:p-5 rounded-xl border font-bold text-base sm:text-lg active:scale-95 transition-colors min-h-[55px] sm:min-h-[70px] ${cls}`}>
              {o.name}
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
  const usedAyahsRef = useRef<Set<string>>(new Set());

  const getNext = () => { 
    if (!orderRef.current.length) orderRef.current = shuffle(eligible); 
    return orderRef.current.pop() || eligible[0]; 
  };

  const make = () => {
    let s = getNext();
    let a = s.ayahs[0];
    let words = a.text.split(" ");
    let hiddenIdx = 0;
    let answer = "";

    for (let attempt = 0; attempt < 30; attempt++) {
      const ayahs = s.ayahs.filter(x => x.text.split(" ").length >= 4);
      if (ayahs.length) {
        a = ayahs[Math.floor(Math.random() * ayahs.length)];
        const key = `${s.app}-${a.n}`;
        if (!usedAyahsRef.current.has(key)) {
          usedAyahsRef.current.add(key);
          words = a.text.split(" ");
          for (let i = 0; i < 5; i++) {
            hiddenIdx = Math.floor(Math.random() * (words.length - 1)) + 1;
            answer = words[hiddenIdx];
            if (answer.length >= 3) break;
          }
          break;
        }
      }
      s = getNext();
    }

    if (!answer) {
      hiddenIdx = Math.min(1, words.length - 1);
      answer = words[hiddenIdx] || "العظيم";
    }

    const normalizeWord = (word: string) => word.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "").replace(/[^\u0621-\u064A]/g, "");
    const answerShape = normalizeWord(answer);
    const similarWords = (wordList: string[]) => shuffle(Array.from(new Set(wordList.filter(word => {
      const normalized = normalizeWord(word);
      return normalized !== answerShape && normalized.length >= 2;
    }))));

    const allWords = s.ayahs.flatMap(ay => ay.text.split(" "));
    const distractors = similarWords(allWords).slice(0, 3);
    if (distractors.length < 3) {
      const extra = corpus.filter(c => pool.includes(c.app)).flatMap(c => c.ayahs.flatMap(ay => ay.text.split(" ")));
      distractors.push(...similarWords(extra).slice(0, 3 - distractors.length));
    }
    while (distractors.length < 3) {
      distractors.push(["الهدى", "التقوى", "الحق", "الصبر"][distractors.length]);
    }

    return { s, words, hiddenIdx, answer, opts: shuffle([answer, ...distractors.slice(0, 3)]) };
  };

  const [q, setQ] = useState(() => make());
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;

  const next = (nn: number) => { 
    setReveal(false); 
    setChosen(null); 
    setQNum(nn); 
    if (nn <= ROUNDS) setQ(make()); 
  };

  const choose = (word: string) => {
    if (reveal || finished) return;
    setChosen(word);
    if (word === q.answer) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1600);
  };

  const replay = () => { 
    usedAyahsRef.current.clear(); 
    g.reset(); 
    setQNum(1); 
    setQ(make()); 
  };

  if (finished) return <ResultCard g={g} onReplay={replay} />;

  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-base sm:text-lg font-medium">أكمل الكلمة الناقصة في سورة <b className="text-accent">{q.s.name}</b></p>
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-accent/10 border border-accent/40 font-amiri text-xl sm:text-2xl leading-loose text-foreground flex flex-wrap justify-center gap-x-2 sm:gap-x-3 gap-y-2 sm:gap-y-3 game-content" dir="rtl">
        {q.words.map((w, i) => (
          <span key={i} className={i === q.hiddenIdx ? "text-transparent bg-secondary/50 border-b-2 border-dashed border-accent min-w-[50px] sm:min-w-[70px] inline-block text-center relative" : ""}>
            {i === q.hiddenIdx ? (reveal ? <span className={`absolute inset-0 flex items-center justify-center font-bold text-base sm:text-lg ${q.answer === chosen ? "text-success" : "text-accent"}`}>{q.answer}</span> : "...") : w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {q.opts.map((opt, i) => {
          const cls = reveal && opt === q.answer ? "bg-success/20 border-success/60 text-success"
            : reveal && opt === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={i} onClick={() => choose(opt)} className={`p-3 sm:p-5 rounded-xl border text-center font-amiri font-bold text-lg sm:text-xl active:scale-95 transition-colors game-option min-h-[55px] sm:min-h-[70px] ${cls}`}>{opt}</button>;
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
  const usedAyahsRef = useRef<Set<string>>(new Set());

  const getNext = () => { 
    if (!orderRef.current.length) orderRef.current = shuffle(eligible); 
    return orderRef.current.pop() || eligible[0]; 
  };

  const make = () => {
    let s = getNext();
    let ayah = s.ayahs[0];

    for (let t = 0; t < 20; t++) {
      const cleanAyahs = s.ayahs.filter(a => !usedAyahsRef.current.has(a.text));
      if (cleanAyahs.length) {
        ayah = cleanAyahs[Math.floor(Math.random() * cleanAyahs.length)];
        usedAyahsRef.current.add(ayah.text);
        break;
      }
      s = getNext();
    }

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

  const next = (nn: number) => { 
    setReveal(false); 
    setChosen(null); 
    setQNum(nn); 
    if (nn <= ROUNDS) { 
      setQ(make()); 
      setRound(r => r + 1); 
    } 
  };

  const left = useRoundTimer(round, 12, () => { 
    g.miss(); 
    setReveal(true); 
    window.setTimeout(() => next(qNum + 1), 1300); 
  }, !reveal && !finished);

  const choose = (n: number) => {
    if (reveal || finished) return;
    setChosen(n);
    if (n === q.s.app) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1200);
  };

  const replay = () => { 
    usedAyahsRef.current.clear(); 
    g.reset(); 
    setQNum(1); 
    setQ(make()); 
    setRound(r => r + 1); 
  };

  if (finished) return <ResultCard g={g} onReplay={replay} />;

  return (
    <div className="space-y-3 sm:space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-sm sm:text-base font-bold">من أي سورة هذه الآية الكريمة؟</p>
      <TimerBar left={left} seconds={12} />
      <div className="p-3 sm:p-5 rounded-2xl bg-accent/10 border border-accent/40 font-amiri text-lg sm:text-2xl leading-loose text-foreground game-content">{q.ayah.text}</div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {q.opts.map(o => {
          const cls = reveal && o.app === q.s.app ? "bg-success/20 border-success/60 text-success"
            : reveal && o.app === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={o.app} onClick={() => choose(o.app)} className={`p-3 sm:p-5 rounded-xl border font-bold text-base sm:text-lg active:scale-95 transition-colors min-h-[55px] sm:min-h-[70px] ${cls}`}>{o.name}</button>;
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
  const eligible = corpus.filter(c => c.ayahs.length >= 4 && pool.includes(c.app));
  const orderRef = useRef(shuffle(eligible));
  const usedKeysRef = useRef<Set<string>>(new Set());

  const getNext = () => { 
    if (!orderRef.current.length) orderRef.current = shuffle(eligible); 
    return orderRef.current.pop() || eligible[0]; 
  };

  const make = () => {
    let s = getNext();
    let seq: typeof s.ayahs = [];

    for (let t = 0; t < 20; t++) {
      const maxStart = Math.max(0, s.ayahs.length - 3);
      const i = Math.floor(Math.random() * (maxStart + 1));
      seq = s.ayahs.slice(i, i + 3);
      const key = `${s.app}-${seq.map(a => a.n).join("-")}`;
      if (!usedKeysRef.current.has(key)) {
        usedKeysRef.current.add(key);
        break;
      }
      s = getNext();
    }

    return { s, opts: shuffle(seq.map((a, k) => ({ ...a, k }))) };
  };

  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [reveal, setReveal] = useState(false);
  const g = useGame();
  const finished = qNum > ROUNDS;

  const next = (nn: number) => { 
    setPicked([]); 
    setReveal(false); 
    setQNum(nn); 
    if (nn <= ROUNDS) { 
      setQ(make()); 
      setRound(r => r + 1); 
    } 
  };

  const left = useRoundTimer(round, 15, () => { 
    g.miss(); 
    setReveal(true); 
    window.setTimeout(() => next(qNum + 1), 1400); 
  }, !reveal && !finished);

  const tap = (k: number) => {
    if (reveal || finished || picked.includes(k)) return;
    if (k === picked.length) {
      const np = [...picked, k]; 
      setPicked(np);
      if (np.length === 3) { 
        g.correct(); 
        setReveal(true); 
        window.setTimeout(() => next(qNum + 1), 900); 
      }
    } else { 
      g.miss(); 
      setReveal(true); 
      window.setTimeout(() => { setReveal(false); setPicked([]); }, 1000); 
    }
  };

  const replay = () => { 
    usedKeysRef.current.clear(); 
    g.reset(); 
    setQNum(1); 
    setPicked([]); 
    setQ(make()); 
    setRound(r => r + 1); 
  };

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
  const usedPairsRef = useRef<Set<string>>(new Set());

  const getNext = () => { 
    if (!orderRef.current.length) orderRef.current = shuffle(eligible); 
    return orderRef.current.pop() || eligible[0]; 
  };

  const wc = (t: string) => t.split(" ").length;

  const make = () => {
    let a = getNext();
    let b = getNext();
    let ao = a.ayahs[0];
    let bo = b.ayahs[0];

    for (let t = 0; t < 25; t++) {
      a = getNext();
      b = getNext();
      if (a.app === b.app && eligible.length > 1) b = getNext();
      ao = a.ayahs[Math.floor(Math.random() * a.ayahs.length)];
      bo = b.ayahs[Math.floor(Math.random() * b.ayahs.length)];

      const closeBo = b.ayahs
        .filter(x => x.text !== ao.text && Math.abs(wc(x.text) - wc(ao.text)) <= 2)
        .sort((x, y) => Math.abs(wc(x.text) - wc(ao.text)) - Math.abs(wc(y.text) - wc(ao.text)));
      if (closeBo.length) {
        bo = closeBo[Math.floor(Math.random() * Math.min(3, closeBo.length))];
      }

      if (wc(ao.text) === wc(bo.text)) {
        const alt = a.ayahs.filter(x => x.text !== ao.text && Math.abs(wc(x.text) - wc(bo.text)) === 1);
        if (alt.length) ao = alt[Math.floor(Math.random() * alt.length)];
      }

      const key = [ao.text, bo.text].sort().join("###");
      if (!usedPairsRef.current.has(key)) {
        usedPairsRef.current.add(key);
        break;
      }
    }

    return { ao, bo, an: a.name, bn: b.name, firstLonger: wc(ao.text) > wc(bo.text) };
  };

  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<"a" | "b" | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;

  const next = (nn: number) => { 
    setReveal(false); 
    setChosen(null); 
    setQNum(nn); 
    if (nn <= ROUNDS) { 
      setQ(make()); 
      setRound(r => r + 1); 
    } 
  };

  const left = useRoundTimer(round, 12, () => { 
    g.miss(); 
    setReveal(true); 
    window.setTimeout(() => next(qNum + 1), 1300); 
  }, !reveal && !finished);

  const choose = (w: "a" | "b") => {
    if (reveal || finished) return;
    setChosen(w);
    if ((w === "a") === q.firstLonger) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1300);
  };

  const replay = () => { 
    usedPairsRef.current.clear(); 
    g.reset(); 
    setQNum(1); 
    setQ(make()); 
    setRound(r => r + 1); 
  };

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
  const surahList = pool.length >= 8 ? pool : SURAHS;
  const usedCombosRef = useRef<Set<string>>(new Set());

  // توليد 4 سور جديدة تماماً لكل سؤال لمنع أي تكرار عبر الـ 20 سؤال
  const make = () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      let four: typeof SURAHS = [];
      // التنويع: تارة 4 سور متجاورة وتارة 4 سور متفرقة لزيادة التحدي
      if (attempt % 2 === 0 && surahList.length >= 6) {
        const maxStart = Math.max(0, surahList.length - 4);
        const start = Math.floor(Math.random() * (maxStart + 1));
        four = surahList.slice(start, start + 4);
      } else {
        four = shuffle([...surahList]).slice(0, 4);
      }

      if (four.length === 4) {
        const key = four.map(s => s.number).sort((a, b) => a - b).join("-");
        if (!usedCombosRef.current.has(key)) {
          usedCombosRef.current.add(key);
          const shuffledFour = shuffle(four);
          return { four: shuffledFour, sol: [...four].sort((x, y) => x.number - y.number) };
        }
      }
    }
    // احتياط
    const four = shuffle([...surahList]).slice(0, 4);
    return { four, sol: [...four].sort((x, y) => x.number - y.number) };
  };

  const [q, setQ] = useState(make);
  const [round, setRound] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [reveal, setReveal] = useState(false);
  const g = useGame();
  const finished = qNum > ROUNDS;

  const next = (nn: number) => { 
    setPicked([]); 
    setReveal(false); 
    setQNum(nn); 
    if (nn <= ROUNDS) { 
      setQ(make()); 
      setRound(r => r + 1); 
    } 
  };

  const left = useRoundTimer(round, 15, () => { 
    g.miss(); 
    setReveal(true); 
    window.setTimeout(() => next(qNum + 1), 1400); 
  }, !reveal && !finished);

  const tap = (n: number) => {
    if (reveal || finished || picked.includes(n)) return;
    const expected = q.sol[picked.length].number;
    if (n === expected) {
      const np = [...picked, n]; 
      setPicked(np);
      if (np.length === 4) { 
        g.correct(); 
        setReveal(true); 
        window.setTimeout(() => next(qNum + 1), 900); 
      }
    } else { 
      g.miss(); 
      setReveal(true); 
      window.setTimeout(() => { setReveal(false); setPicked([]); }, 1000); 
    }
  };

  const replay = () => { 
    usedCombosRef.current.clear(); 
    g.reset(); 
    setQNum(1); 
    setPicked([]); 
    setQ(make()); 
    setRound(r => r + 1); 
  };

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
  const deckRef = useRef<typeof pool>([]);

  const make = () => {
    if (deckRef.current.length === 0) {
      deckRef.current = shuffle([...pool]);
    }
    const s = deckRef.current.pop() || pool[0];
    const opts = new Set<number>([s.number]);
    for (const d of shuffle([-3, -2, -1, 1, 2, 3, -4, 4])) {
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

  const next = (nn: number) => { 
    setReveal(false); 
    setChosen(null); 
    setQNum(nn); 
    if (nn <= ROUNDS) { 
      setQ(make()); 
      setRound(r => r + 1); 
    } 
  };

  const left = useRoundTimer(round, 10, () => { 
    g.miss(); 
    setReveal(true); 
    window.setTimeout(() => next(qNum + 1), 1300); 
  }, !reveal && !finished);

  const choose = (n: number) => {
    if (reveal || finished) return;
    setChosen(n);
    if (n === q.s.number) g.correct(); else g.miss();
    setReveal(true);
    window.setTimeout(() => next(qNum + 1), 1200);
  };

  const replay = () => { 
    deckRef.current = shuffle([...pool]); 
    g.reset(); 
    setQNum(1); 
    setQ(make()); 
    setRound(r => r + 1); 
  };

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
  order: AyahOrderEngine, 
  memory: MemoryEngine, 
  memory_meaning: MemoryEngine, 
  which: WhichEngine, 
  quiz: QuizEngine, 
  count: CountEngine,
  nextayah: NextAyahEngine, 
  prevayah: PrevAyahEngine, 
  whichsurah: WhichSurahEngine, 
  missingword: MissingWordEngine, 
  surahaudio: SurahAudioEngine,
  ayahsurah: AyahSurahEngine, 
  ayahorder: AyahOrderEngine, 
  ayahlonger: AyahLongerEngine, 
  surahorder: SurahOrderEngine, 
  surahnum: SurahNumEngine,
  remote: ({ def }) => <RemoteGameFrame def={def} onExit={() => window.dispatchEvent(new Event("mushaf:remotegame:exit"))} />,
  detective: ({ def, minSurah }) => <DetectiveGame def={def} minSurah={minSurah} />,
  wordbuilder: ({ def, minSurah }) => <WordBuilderGame def={def} minSurah={minSurah} />,
  catchstar: ({ def, minSurah }) => <CatchStarGame def={def} minSurah={minSurah} />,
  ayahmath: ({ def, minSurah }) => <AyahMathGame def={def} minSurah={minSurah} />,
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
  const [pinAction, setPinAction] = useState<null | "parent" | "exit" | "setread" | "setparent" | "setsurah">(null);
  const [showSurahSelector, setShowSurahSelector] = useState(false);
  const [showSurahConfirm, setShowSurahConfirm] = useState(() => {
    try { return localStorage.getItem("mushaf:surahConfirmDay") !== new Date().toDateString(); } catch { return true; }
  });
  const [showNotifications, setShowNotifications] = useState(false);

  // شهادة التقدم (زر المشكلة)
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateReady, setCertificateReady] = useState(false);
  const [streakDays, setStreakDays] = useState(calculateStreak().currentStreak);

  // شاشة النشر والاحتفال عند الوصول للميلستون
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneData, setMilestoneData] = useState({ days: 0, title: "", message: "" });

  // الميلستونات: 1، 7، 14، 21، 30 (شهر)، 60 (شهرين)، وبعد 5 أشهر عشوائي
  const MILESTONES = [1, 7, 14, 21, 30, 60];
  const MILESTONE_NAMES: Record<number, { title: string; message: string }> = {
    1: { title: "بداية رائعة!", message: "بدأت رحلتك مع القرآن — يوم واحد من النور" },
    7: { title: "أسبوع كامل!", message: "7 أيام متتالية — أنت بطل حقيقي!" },
    14: { title: "أسبوعين من العطاء!", message: "14 يوماً متتالياً — الاستمرارية سر النجاح" },
    21: { title: "21 يوماً!", message: "عادة راسخة! 21 يوماً من التعلم المتواصل" },
    30: { title: "شهر كامل!", message: "30 يوماً — شهر من القرآن والضوء" },
    60: { title: "شهرين من التميز!", message: "60 يوماً — أنت الآن بطل القرآن الأسطوري" },
  };

  // رسالة التشجيع: تظهر مرة في اليوم عند إنجاز وقت الدراسة والدخول للألعاب
  const [showEncourage, setShowEncourage] = useState(() => {
    try {
      const today = new Date().toDateString();
      const key = "mushaf:encouragedToday";
      const p = localStorage.getItem(key);
      const curr = JSON.parse(p || "null");
      const minToday = Number(localStorage.getItem("mushaf:minutesToday") || 0);
      // نحفّز إذا أُنجزت الدراسة اليوم ولم تُعرض الرسالة بعد — حتى بعد قراءة مسبقة
      return minToday > 0 && (curr?.date !== today || curr?.off === true);
    } catch { return false; }
  });

  // مخفيّ للمستخدمين (لكن يدخله المالك للتجربة)
  useEffect(() => { if (kidsRouteBlocked()) navigate("/audio", { replace: true }); }, [navigate]);

  // لا يدخل للألعاب وهو في فترة دراسة القرآن طالما لم يكمل الدقائق المطلوبة
  useEffect(() => {
    const goal = typeof profile.goalMinutes === "number" && profile.goalMinutes > 0 ? profile.goalMinutes : 5;
    const read = progress.minutes || 0;
    if (read < goal && !progress.unlocked) {
      toast({ 
        title: "⏳ وقت مدارسة القرآن الكريم أولاً!", 
        description: `بقي ${Math.max(0, Math.round((goal - read) * 10) / 10)} دقيقة استماع لفتح الألعاب.`,
        variant: "destructive"
      });
      navigate("/audio", { replace: true });
    }
  }, [profile.goalMinutes, progress.minutes, progress.unlocked, navigate]);

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
        // حلقة دائمة: تنبيه فقط دون إخراج — الخروج اليدوي برمز ولي الأمر
        toast({ title: "تنبيه الجدول ⏰", description: timeCheck.reason, variant: "destructive" });
        return;
      }
      
      if (isKidsMode()) {
        const now = Date.now();
        const mins = (now - lastPlayTick) / 60000;
        if (mins >= 0.1 || flushExact) {
           const { justExpired, progress } = addPlayMinutes(mins);
           lastPlayTick = now;
           if (justExpired || progress.playExpired) {
             // حلقة دائمة: تنبيه فقط دون خروج — يغادر الطفل يدوياً برمز ولي الأمر
             toast({ title: "انتهى وقت اللعب المحدّد ⏰", description: "يمكن لولي الأمر منحه وقتاً إضافياً من لوحة التحكم.", variant: "destructive" });
             return;
           }
        }
      }
    };
    // في وضع التنقل المرن أو وضع المالك غير الصارم: لا نفرض قيود الوقت على المالك للتجربة
    const isParentTrial = !isKidsMode() && !isPureMode() && getAppMode() === "parent";
    // initial check on mount, without adding minutes yet
    const initialCheck = isTimeAllowed();
    if (isParentTrial ? false : (!initialCheck.allowed || getProgress().playExpired)) {
        // حلقة دائمة: تنبيه عند الدخول فقط دون إخراج — الخروج يدوي برمز ولي الأمر
        toast({ title: "تنبيه الوقت ⏰", description: initialCheck.reason || "انتهى وقت اللعب المحدّد لليوم.", variant: "destructive" });
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

  // تحميل الألعاب من السيرفر في الخلفية + تخزين أكوادها على الجهاز (تعمل دون إنترنت)
  useEffect(() => {
    fetchRemoteGames().then(() => { precacheRemoteGames().catch(() => { /* ignore */ }); }).catch(() => { /* ignore */ });
  }, []);

  const [showBadges, setShowBadges] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showLockGateModal, setShowLockGateModal] = useState(false);

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

    const handleBadgeUnlocked = (e: Event) => {
      const badges = (e as CustomEvent<unknown>).detail;
      if (Array.isArray(badges) && badges.length > 0) {
        badges.forEach((badge) => {
          if (!badge || typeof badge !== "object") return;
          const unlockedBadge = badge as { title?: string; rewardCoins?: number };
          toast({
            title: `🏆 مبارك! وسام جديد: ${unlockedBadge.title || "إنجاز جديد"}`,
            description: `حصلت على ${unlockedBadge.rewardCoins || 0} نجمة إضافية!`,
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

  // التحقق من الميلستونات وعرض شاشة الاحتفال
  useEffect(() => {
    const currentStreak = calculateStreak().currentStreak;
    setStreakDays(currentStreak);

    // قراءة الميلستونات التي تم عرضها مسبقاً
    const shownKey = `mushaf:milestonesShown:${getActiveId()}`;
    const shownRaw = localStorage.getItem(shownKey);
    const shown: number[] = shownRaw ? JSON.parse(shownRaw) : [];

    // التحقق من الميلستونات المعروفة
    if (MILESTONES.includes(currentStreak) && !shown.includes(currentStreak)) {
      const milestone = MILESTONE_NAMES[currentStreak];
      setMilestoneData({ days: currentStreak, ...milestone });
      setShowMilestone(true);
      // تسجيل الميلستون كمعروض
      localStorage.setItem(shownKey, JSON.stringify([...shown, currentStreak]));
    }
    // بعد 5 أشهر (150+ يوم): عرض عشوائي كل 30 يوم تقريباً
    else if (currentStreak >= 150) {
      // عرض عشوائي: احتمال 1/30 لكل يوم بعد 5 أشهر
      const randomChance = Math.random() < (1 / 30);
      if (randomChance) {
        const randomMessages = [
          { title: "أسطورة القرآن!", message: `${currentStreak} يوماً — أنت الآن من العظماء` },
          { title: "بطل لا يُقهر!", message: `${currentStreak} يوماً من التميز والعطاء` },
          { title: "نجم القرآن!", message: `${currentStreak} يوماً — أنت قدوة لكل الأطفال` },
          { title: "ملك الحفظ!", message: `${currentStreak} يوماً — مسيرة لا تُنسى` },
        ];
        const randomMilestone = randomMessages[Math.floor(Math.random() * randomMessages.length)];
        setMilestoneData({ days: currentStreak, ...randomMilestone });
        setShowMilestone(true);
      }
    }
  }, [progress.minutes]);

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
    if (pinAction === "setsurah") {
      setPinAction(null);
      setShowSurahSelector(true);
      return;
    }
    setPinAction(null);
  };

  const exitKidsCorner = () => {
    // الدخول للقرآن والتلاوات متاح دائماً بدون كلمة مرور
    navigate("/audio");
  };

  const lockAndRead = () => {
    // الذهاب للاستماع والتلاوات متاح مباشرة
    navigate("/audio");
  };

  const openParent = () => {
    if (isKidsMode() && hasKidsPin()) {
      setPinAction("parent");
    } else {
      navigate("/parent");
    }
  };

  const headerBack = () => {
    if (active) {
      setActive(null);
    } else {
      exitKidsCorner();
    }
  };

  const tapGame = (id: string) => {
    if (!canPlay) {
      setShowLockGateModal(true);
      return;
    }
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
  const playPct = Math.min(100, (progress.played / Math.max(1, profile.playMinutes || 1)) * 100);

  const requestSurahChange = () => {
    if (hasKidsPin()) setPinAction("setsurah");
    else setShowSurahSelector(true);
  };

  const confirmTodaySurah = () => {
    try { localStorage.setItem("mushaf:surahConfirmDay", new Date().toDateString()); } catch { /* ignore */ }
    setShowSurahConfirm(false);
  };

  // إغلاق رسالة التشجيع لنفس اليوم
  const dismissEncourage = () => {
    try { localStorage.setItem("mushaf:encouragedToday", JSON.stringify({ date: new Date().toDateString(), off: false })); } catch { /* ignore */ }
    setShowEncourage(false);
  };

  // تسجيل إنجاز الدراسة عند دخول الألعاب (يُستدعى في كل دخول)
  const markArrived = () => {
    try { localStorage.setItem("mushaf:minutesToday", String(getProgress().minutes)); } catch { /* ignore */ }
  };
  markArrived();

  // إنشاء شهادة التقدم الفاخرة كصورة إسلامية ملكية فائقة الجودة
  const generateCertificate = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. تدرج الخلفية العاجية الفاخرة
    const bg = ctx.createLinearGradient(0, 0, 1080, 1440);
    bg.addColorStop(0, "#FAF6EE");
    bg.addColorStop(0.5, "#F8F2E2");
    bg.addColorStop(1, "#F3E9D2");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1440);

    // شبكة زخرفية إسلامية رقيقة في الخلفية
    ctx.strokeStyle = "rgba(197, 160, 89, 0.08)";
    ctx.lineWidth = 1.5;
    for (let x = 40; x < 1080; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1440);
      ctx.stroke();
    }
    for (let y = 40; y < 1440; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    // 2. إطار ذهبي مزدوج مع زوايا أندلسية
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 8;
    ctx.strokeRect(36, 36, 1008, 1368);

    ctx.strokeStyle = "#AA771C";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(48, 48, 984, 1344);

    const drawCorner = (cx: number, cy: number, flipX: number, flipY: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(flipX, flipY);
      ctx.strokeStyle = "#D4AF37";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 48);
      ctx.quadraticCurveTo(8, 8, 48, 8);
      ctx.stroke();
      drawCanvasStar(ctx, 28, 28, 9, "#E5C058");
      ctx.restore();
    };
    drawCorner(48, 48, 1, 1);
    drawCorner(1032, 48, -1, 1);
    drawCorner(48, 1392, 1, -1);
    drawCorner(1032, 1392, -1, -1);

    // 3. البسملة الشريفة في القمة
    ctx.fillStyle = "#8C6514";
    ctx.font = "bold 26px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.textAlign = "center";
    ctx.fillText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 540, 96);

    // 4. شريط العنوان الأخضر والذهبي الملكي
    const ribbon = ctx.createLinearGradient(200, 118, 880, 188);
    ribbon.addColorStop(0, "#124325");
    ribbon.addColorStop(0.5, "#1B6338");
    ribbon.addColorStop(1, "#124325");
    ctx.fillStyle = ribbon;
    ctx.beginPath();
    ctx.roundRect(190, 118, 700, 72, 24);
    ctx.fill();

    ctx.strokeStyle = "#E5C058";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#FFF7D6";
    ctx.font = "bold 34px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText("شَهَادَةُ تَمَيُّزٍ وَإِنْجَازٍ قُرْآنِيّ", 540, 166);

    ctx.fillStyle = "#555555";
    ctx.font = "bold 21px 'Tahoma', 'Arial'";
    ctx.fillText("تُمنح هذه الشهادة المباركة تقديراً واعتزازاً بجهود:", 540, 230);

    // 5. صورة شخصية الطفل (Avatar) داخل ميدالية ذهبية شرفية
    const avatarCenterY = 340;
    const avatarRadius = 78;

    // هالة ذهبية خارجية
    const aura = ctx.createRadialGradient(540, avatarCenterY, avatarRadius - 10, 540, avatarCenterY, avatarRadius + 28);
    aura.addColorStop(0, "rgba(245, 197, 66, 0.45)");
    aura.addColorStop(1, "rgba(245, 197, 66, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(540, avatarCenterY, avatarRadius + 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(540, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    try {
      const avatarSrc = getAvatarSrc(profile.avatar);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((res) => {
        img.onload = () => res(true);
        img.onerror = () => res(false);
        img.src = encodeURI(avatarSrc);
        setTimeout(() => res(false), 2000);
      });
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 540 - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      } else {
        drawCanvasStar(ctx, 540, avatarCenterY, 44, "#F4C542");
      }
    } catch {
      drawCanvasStar(ctx, 540, avatarCenterY, 44, "#F4C542");
    }
    ctx.restore();

    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(540, avatarCenterY, avatarRadius + 3, 0, Math.PI * 2);
    ctx.stroke();

    drawCanvasStar(ctx, 425, avatarCenterY, 13, "#E5C058");
    drawCanvasStar(ctx, 655, avatarCenterY, 13, "#E5C058");

    // 6. اسم الطالب بخط ذهبي عريض ومظلل
    const studentName = profile.name ? `القارئ الحافظ: ${profile.name}` : "بطل القرآن الكريم";
    ctx.fillStyle = "#0E4D2B";
    ctx.font = "bold 44px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText(studentName, 540, 470);

    ctx.fillStyle = "#555555";
    ctx.font = "19px 'Tahoma', 'Arial'";
    ctx.fillText("لمواظبته على تلاوة وحفظ كتاب الله الكريم برواية ورش عن نافع", 540, 508);

    // 7. شبكة بطاقات الإحصائيات (2 × 2) بدون أي تداخل
    const curSurahName = SURAHS.find(s => s.number === profile.currentSurah)?.name || "النبأ";
    const statCards = [
      { title: "دقائق التلاوة والمدارسة", value: `${progress.minutes || 0} دقيقة`, color: "#16A34A", icon: "⏱️" },
      { title: "رصيد النجوم المكتسبة", value: `${formatCoins(getCoins())} نجمة`, color: "#D97706", icon: "⭐" },
      { title: "أيام المداومة والاستمرار", value: `${streakDays || 1} أيام متتالية`, color: "#EA580C", icon: "🔥" },
      { title: "السورة الحالية المتقنة", value: `سورة ${curSurahName}`, color: "#2563EB", icon: "📖" },
    ];

    const cardPositions = [
      { x: 100, y: 545, w: 425, h: 90 },
      { x: 555, y: 545, w: 425, h: 90 },
      { x: 100, y: 650, w: 425, h: 90 },
      { x: 555, y: 650, w: 425, h: 90 },
    ];

    statCards.forEach((st, idx) => {
      const pos = cardPositions[idx];
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(pos.x, pos.y, pos.w, pos.h, 18);
      ctx.fill();

      ctx.strokeStyle = "#E8DCBF";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = st.color;
      ctx.beginPath();
      ctx.arc(pos.x + 45, pos.y + 45, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "22px 'Tahoma', 'Segoe UI Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(st.icon, pos.x + 45, pos.y + 53);

      ctx.textAlign = "right";
      ctx.fillStyle = "#777777";
      ctx.font = "bold 14px 'Tahoma', 'Arial'";
      ctx.fillText(st.title, pos.x + pos.w - 18, pos.y + 34);

      ctx.fillStyle = "#222222";
      ctx.font = "bold 23px 'Tahoma', 'Arial'";
      ctx.fillText(st.value, pos.x + pos.w - 18, pos.y + 68);
    });

    // 8. لوحة الحديث الشريف المحفز
    const hadithY = 765;
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.beginPath();
    ctx.roundRect(160, hadithY, 760, 74, 20);
    ctx.fill();
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawCanvasStar(ctx, 190, hadithY + 37, 10, "#E5C058");
    drawCanvasStar(ctx, 890, hadithY + 37, 10, "#E5C058");

    ctx.textAlign = "center";
    ctx.fillStyle = "#8C6514";
    ctx.font = "bold 25px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText("« خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ »", 540, hadithY + 38);

    ctx.fillStyle = "#777777";
    ctx.font = "14px 'Tahoma', 'Arial'";
    ctx.fillText("— قال رسول الله ﷺ —", 540, hadithY + 62);

    // 9. البطاقة الرسمية المعتمدة: اسم التطبيق مع صورته + الختم الذهبي + التاريخ (بدون كلمة إصدار)
    const footCardY = 865;
    const footCardH = 500;
    const footGrad = ctx.createLinearGradient(70, footCardY, 1010, footCardY + footCardH);
    footGrad.addColorStop(0, "#FFFFFF");
    footGrad.addColorStop(0.5, "#FDFBF7");
    footGrad.addColorStop(1, "#FAF6EE");
    ctx.fillStyle = footGrad;
    ctx.beginPath();
    ctx.roundRect(70, footCardY, 940, footCardH, 28);
    ctx.fill();

    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // إطار زخرفي داخلي رقيق
    ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(82, footCardY + 12, 916, footCardH - 24, 20);
    ctx.stroke();

    // رسم صورة / شعار التطبيق (مع القارئ حاج أيوب أمين) داخل ميدالية ذهبية دائرية
    const appImgCenterY = footCardY + 115;
    const appImgCenterX = 185;
    const appImgRadius = 60;

    // هالة ذهبية ناعمة حول صورة التطبيق
    const appAura = ctx.createRadialGradient(appImgCenterX, appImgCenterY, appImgRadius - 5, appImgCenterX, appImgCenterY, appImgRadius + 18);
    appAura.addColorStop(0, "rgba(212, 175, 55, 0.4)");
    appAura.addColorStop(1, "rgba(212, 175, 55, 0)");
    ctx.fillStyle = appAura;
    ctx.beginPath();
    ctx.arc(appImgCenterX, appImgCenterY, appImgRadius + 18, 0, Math.PI * 2);
    ctx.fill();

    // قص دائري ورسم صورة التطبيق
    ctx.save();
    ctx.beginPath();
    ctx.arc(appImgCenterX, appImgCenterY, appImgRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    const appPhoto = (await loadCanvasImage("/my-photo.png")) || (await loadCanvasImage("/pwa-512x512.png"));
    if (appPhoto && appPhoto.naturalWidth > 0) {
      ctx.drawImage(appPhoto, appImgCenterX - appImgRadius, appImgCenterY - appImgRadius, appImgRadius * 2, appImgRadius * 2);
    } else {
      drawCanvasStar(ctx, appImgCenterX, appImgCenterY, 36, "#D4AF37");
    }
    ctx.restore();

    // إطار ذهبي مزدوج لميدالية صورة التطبيق
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(appImgCenterX, appImgCenterY, appImgRadius + 2, 0, Math.PI * 2);
    ctx.stroke();

    // اسم التطبيق والمعلومات المعتمدة بجانب الصورة
    ctx.textAlign = "right";
    ctx.fillStyle = "#0E4D2B";
    ctx.font = "bold 32px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText("تَطْبِيقُ الْمُصْحَفِ الْمُرَتَّلِ بِرِوَايَةِ وَرْش", 955, footCardY + 80);

    ctx.fillStyle = "#8C6514";
    ctx.font = "bold 24px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText("الْقَارِئُ الشَّيْخُ: حَاج أَيُّوب أَمِين", 955, footCardY + 122);

    ctx.fillStyle = "#555555";
    ctx.font = "17px 'Tahoma', 'Arial'";
    ctx.fillText("ركن أبطال القرآن الكريم وتحدي الحفظ والمدارسة المتقنة للأطفال", 955, footCardY + 160);

    // خط فاصل ذهبي رفيع مزخرف
    ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(110, footCardY + 205);
    ctx.lineTo(970, footCardY + 205);
    ctx.stroke();

    // ختم التميز والاعتماد الرسمي الملكي في الوسط / اليسار
    const sealX = 270;
    const sealY = footCardY + 315;
    ctx.save();
    ctx.translate(sealX, sealY);

    // خلفية الختم الذهبي المسنن
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const r = i % 2 === 0 ? 58 : 50;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#92400E";
    ctx.beginPath();
    ctx.arc(0, 0, 47, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#FDE68A";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px 'Tahoma', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("وسام التميّز", 0, -10);
    ctx.fillText("حفظ القرآن", 0, 8);
    ctx.fillText("مُعْتَمَد ✓", 0, 24);
    drawCanvasStar(ctx, 0, 36, 6, "#FDE68A");
    ctx.restore();

    // توقيع المشرف في الجهة اليمنى
    ctx.textAlign = "right";
    ctx.fillStyle = "#333333";
    ctx.font = "bold 19px 'Tahoma', 'Arial'";
    ctx.fillText("توقيع وإشراف المقرئ:", 955, footCardY + 270);

    ctx.fillStyle = "#0E4D2B";
    ctx.font = "bold 26px 'Traditional Arabic', 'Amiri', 'Cairo', serif";
    ctx.fillText("القارئ: أمين حاج أيوب", 955, footCardY + 312);

    ctx.fillStyle = "#666666";
    ctx.font = "italic 16px 'Tahoma', sans-serif";
    ctx.fillText("« غفر الله له ولوالديه ولمن قرأ واستمع »", 955, footCardY + 345);

    // خانة التاريخ بدون كلمة "إصدار" إطلاقاً
    const today = new Date();
    const dateBoxW = 440;
    const dateBoxH = 56;
    const dateBoxX = 515;
    const dateBoxY = footCardY + 400;

    ctx.fillStyle = "rgba(245, 197, 66, 0.15)";
    ctx.beginPath();
    ctx.roundRect(dateBoxX, dateBoxY, dateBoxW, dateBoxH, 16);
    ctx.fill();

    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#8C6514";
    ctx.font = "bold 20px 'Tahoma', 'Arial'";
    ctx.fillText(`التاريخ: ${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()} م`, dateBoxX + dateBoxW / 2, dateBoxY + 36);

    // عبارة تشجيعية في أقصى يسار خانة التاريخ
    ctx.textAlign = "center";
    ctx.fillStyle = "#888888";
    ctx.font = "15px 'Tahoma', sans-serif";
    ctx.fillText("مُبارك هذا الإنجاز القرآني المبارك ووفقك الله لكل خير 🌸", 300, dateBoxY + 36);

    // تحميل الشهادة
    const link = document.createElement("a");
    link.download = `شهادة-${profile.name || "بطل-القرآن"}-${today.toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    setCertificateReady(true);
    toast({ title: "🎉 تم حفظ الشهادة الفاخرة!", description: "تم حفظ الصورة بجودة فائقة في جهازك" });
  };

  // مشاركة صورة الميلستون الفاخرة (مشاركة + تحميل مع رمز QR)
  const shareMilestone = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // خلفية كحلية زمردية ملكية مع تدرج ونجوم
    const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
    bg.addColorStop(0, "#081E15");
    bg.addColorStop(0.4, "#0C3122");
    bg.addColorStop(0.8, "#0F3D2A");
    bg.addColorStop(1, "#071B13");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1350);

    for (let i = 0; i < 45; i++) {
      const sx = Math.sin(i * 99) * 500 + 540;
      const sy = Math.cos(i * 77) * 600 + 675;
      const sr = (i % 3) + 1.5;
      ctx.fillStyle = i % 2 === 0 ? "rgba(254, 240, 138, 0.6)" : "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 8;
    ctx.strokeRect(36, 36, 1008, 1278);

    ctx.strokeStyle = "#FDE68A";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(48, 48, 984, 1254);

    drawCanvasStar(ctx, 280, 95, 18, "#FDE68A");
    drawCanvasStar(ctx, 540, 85, 28, "#F59E0B");
    drawCanvasStar(ctx, 800, 95, 18, "#FDE68A");

    ctx.fillStyle = "#FEF08A";
    ctx.font = "bold 44px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.textAlign = "center";
    ctx.fillText("إِنْجَازٌ قُرْآنِيٌّ مُتَأَلِّقٌ 🌟", 540, 165);

    ctx.fillStyle = "#A7F3D0";
    ctx.font = "24px 'Tahoma', 'Arial'";
    ctx.fillText(milestoneData.message || "مبارك المداومة والاستمرار في تلاوة كتاب الله!", 540, 215);

    // صورة الأفاتار
    const avatarCenterY = 340;
    const avatarRadius = 82;

    ctx.save();
    ctx.beginPath();
    ctx.arc(540, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    try {
      const avatarSrc = getAvatarSrc(profile.avatar);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((res) => {
        img.onload = () => res(true);
        img.onerror = () => res(false);
        img.src = encodeURI(avatarSrc);
        setTimeout(() => res(false), 2000);
      });
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 540 - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      } else {
        drawCanvasStar(ctx, 540, avatarCenterY, 46, "#F59E0B");
      }
    } catch {
      drawCanvasStar(ctx, 540, avatarCenterY, 46, "#F59E0B");
    }
    ctx.restore();

    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(540, avatarCenterY, avatarRadius + 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText(profile.name || "بطل القرآن الكريم", 540, 470);

    // صندوق السلسلة اليومية
    const boxY = 505;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect(140, boxY, 800, 290, 30);
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#FDE047";
    ctx.font = "bold 92px 'Tahoma', 'Arial'";
    ctx.fillText(String(milestoneData.days || 1), 540, boxY + 105);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText("يَوْمَاً مُتَتَالِيَةً فِي صُحْبَةِ القُرْآن", 540, boxY + 170);

    const curSurah = SURAHS.find(s => s.number === profile.currentSurah);
    ctx.fillStyle = "#6EE7B7";
    ctx.font = "bold 25px 'Tahoma', 'Arial'";
    ctx.fillText(`سورة ${curSurah?.name || "النبأ"}`, 540, boxY + 220);

    ctx.fillStyle = "#FCD34D";
    ctx.font = "bold 23px 'Tahoma', 'Arial'";
    ctx.fillText(`${formatCoins(getCoins())} نجمة وهمّة مكتسبة ⭐`, 540, boxY + 262);

    // 7. شريط التطبيق المعتمد واسمه وصورته والتاريخ (بدون مكان تحميل وبدون كلمة إصدار)
    const footY = 820;
    const footH = 470;

    // بطاقة خلفية زجاجية كحلية زمردية ملكية
    const footGrad = ctx.createLinearGradient(80, footY, 1000, footY + footH);
    footGrad.addColorStop(0, "rgba(10, 38, 26, 0.94)");
    footGrad.addColorStop(0.5, "rgba(12, 49, 34, 0.95)");
    footGrad.addColorStop(1, "rgba(8, 30, 20, 0.96)");
    ctx.fillStyle = footGrad;
    ctx.beginPath();
    ctx.roundRect(80, footY, 920, footH, 32);
    ctx.fill();

    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 3;
    ctx.stroke();

    // إطار داخلي ذهبي رفيع
    ctx.strokeStyle = "rgba(253, 230, 138, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(94, footY + 14, 892, footH - 28, 22);
    ctx.stroke();

    // آية قرآنية كريمة في أعلى البطاقة
    ctx.textAlign = "center";
    ctx.fillStyle = "#FEF08A";
    ctx.font = "bold 28px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText("« وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ »", 540, footY + 65);

    ctx.fillStyle = "#A7F3D0";
    ctx.font = "18px 'Tahoma', 'Arial'";
    ctx.fillText("هنيئاً لك الاستمرار والمواظبة في تلاوة وحفظ كتاب الله العزيز", 540, footY + 102);

    // خط فاصل ذهبي
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(130, footY + 130);
    ctx.lineTo(950, footY + 130);
    ctx.stroke();

    // صورة التطبيق / القارئ داخل ميدالية دائرية ذهبية
    const appImgX = 220;
    const appImgY = footY + 235;
    const appImgR = 64;

    // هالة ذهبية حول الشعار
    const appAura = ctx.createRadialGradient(appImgX, appImgY, appImgR - 5, appImgX, appImgY, appImgR + 20);
    appAura.addColorStop(0, "rgba(245, 158, 11, 0.45)");
    appAura.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = appAura;
    ctx.beginPath();
    ctx.arc(appImgX, appImgY, appImgR + 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(appImgX, appImgY, appImgR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    const appPhoto = (await loadCanvasImage("/pwa-512x512.png")) || (await loadCanvasImage("/my-photo.png"));
    if (appPhoto && appPhoto.naturalWidth > 0) {
      ctx.drawImage(appPhoto, appImgX - appImgR, appImgY - appImgR, appImgR * 2, appImgR * 2);
    } else {
      drawCanvasStar(ctx, appImgX, appImgY, 38, "#F59E0B");
    }
    ctx.restore();

    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(appImgX, appImgY, appImgR + 2, 0, Math.PI * 2);
    ctx.stroke();

    // اسم التطبيق والشيخ بجانب الصورة
    ctx.textAlign = "right";
    ctx.fillStyle = "#FDE047";
    ctx.font = "bold 32px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText("تَطْبِيقُ الْمُصْحَفِ الْمُرَتَّلِ بِرِوَايَةِ وَرْش", 930, footY + 205);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
    ctx.fillText("الْقَارِئُ الشَّيْخُ: حَاج أَيُّوب أَمِين", 930, footY + 250);

    ctx.fillStyle = "#A7F3D0";
    ctx.font = "18px 'Tahoma', 'Arial'";
    ctx.fillText("ركن أبطال القرآن الكريم • حفظ • تجويد • مدارسة", 930, footY + 290);

    // خط فاصل سفلي
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(130, footY + 340);
    ctx.lineTo(950, footY + 340);
    ctx.stroke();

    // خانة التاريخ بدون كلمة إصدار
    const today = new Date();
    const dateBoxW = 420;
    const dateBoxH = 54;
    const dateBoxX = 520;
    const dateBoxY = footY + 375;

    ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
    ctx.beginPath();
    ctx.roundRect(dateBoxX, dateBoxY, dateBoxW, dateBoxH, 16);
    ctx.fill();

    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#FDE047";
    ctx.font = "bold 20px 'Tahoma', 'Arial'";
    ctx.fillText(`التاريخ: ${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()} م`, dateBoxX + dateBoxW / 2, dateBoxY + 35);

    // رسالة فخر في اليسار
    ctx.textAlign = "center";
    ctx.fillStyle = "#CBD5E1";
    ctx.font = "bold 16px 'Tahoma', 'Arial'";
    ctx.fillText("🌟 فخورون بهمتك العالية وبإنجازك المستمر", 300, dateBoxY + 35);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `ميلستون-${milestoneData.days}يوم-${profile.name || "بطل"}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: milestoneData.title,
            text: `${milestoneData.message} — ${milestoneData.days} يوماً متتالية في حفظ وتلاوة كتاب الله الكريم مع تطبيق المصحف المرتل برواية ورش (القارئ الشيخ حاج أيوب أمين) 🌟`,
            files: [file],
          });
          toast({ title: "تمت المشاركة بنجاح!", description: "بارك الله في همتك القرآنية" });
          return;
        } catch {
          // Fallback to download
        }
      }

      const link = document.createElement("a");
      link.download = `ميلستون-${milestoneData.days}يوم-${profile.name || "بطل"}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: "تم حفظ الصورة الفاخرة!", description: "ابحث في مجلد التنزيلات بجهازك" });
    }, "image/png");
  };

  // فتح نافذة الشهادة مع معاينة
  const openCertificate = () => {
    setStreakDays(calculateStreak().currentStreak);
    setShowCertificate(true);
    setCertificateReady(false);
  };

  // شاشة تأكيد السورة الحالية — تظهر مرة واحدة كل يوم عند دخول ركن الألعاب
  if (showSurahConfirm && profile.currentSurah) {
    const cur = SURAHS.find(s => s.number === profile.currentSurah);
    return (
      <div className="min-h-screen page-nour text-foreground pb-8" dir="rtl">
        <div className="mx-auto max-w-md px-4 py-10 space-y-6 animate-fade-up">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground font-bold text-lg">أهلاً بعودتك! أنت الآن في</p>
            <div className="card-nour p-8">
              <p className="text-4xl font-extrabold text-gradient-gold drop-shadow-md">سورة {cur?.name}</p>
            </div>
          </div>
          <button onClick={confirmTodaySurah} className="btn-emerald w-full p-4 rounded-2xl font-bold text-xl shadow-lg active:scale-95">
            نعم، أكمل في سورة {cur?.name}
          </button>
          <button onClick={requestSurahChange} className="w-full p-4 rounded-2xl font-bold text-lg bg-card border-2 border-border hover:border-accent/50 active:scale-95 transition-all">
            تغيير السورة {hasKidsPin() ? "(برمز ولي الأمر)" : ""}
          </button>
        </div>
      </div>
    );
  }

  if (showSurahSelector || !profile.currentSurah) {
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
        <header className="flex flex-wrap items-center justify-between gap-2">
          <button onClick={headerBack} className="flex h-9 sm:h-10 shrink-0 items-center gap-1.5 rounded-full bg-secondary text-secondary-foreground px-3 sm:px-4 text-xs sm:text-sm font-bold hover:brightness-95 active:scale-95 border border-border">
            <ArrowRight className="h-4 w-4" /> {active ? "الرجوع للألعاب" : "الخروج للتلاوات"}
          </button>
          <h1 className="font-extrabold text-base sm:text-lg text-gradient-gold order-first w-full text-center sm:w-auto sm:order-none sm:w-auto">ركن الأطفال</h1>
          {!active ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent font-extrabold text-xs sm:text-sm px-2.5 sm:px-3 h-9 sm:h-10 shrink-0 shadow-sm"><Star className="w-4 h-4 shrink-0 fill-current" /> <span>{formatCoins(coins)} نجمة</span></span>


              <button onClick={() => setShowBadges(true)} aria-label="الأوسمة والإنجازات" title="الأوسمة والإنجازات" className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-amber-500/15 text-amber-500 hover:brightness-95 flex items-center justify-center active:scale-95 border border-amber-500/30 shadow-sm"><Trophy className="w-5 h-5" /></button>
              <button onClick={() => setShowNotifications(true)} aria-label="الإشعارات" title="الإشعارات" className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-secondary text-secondary-foreground hover:brightness-95 flex items-center justify-center active:scale-95"><Bell className="w-5 h-5" /></button>
              <button onClick={openParent} aria-label="إعدادات ولي الأمر" title="إعدادات ولي الأمر" className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-secondary text-secondary-foreground hover:brightness-95 flex items-center justify-center active:scale-95"><Settings className="w-5 h-5" /></button>
              <button onClick={openCertificate} aria-label="شهادة التقدم" title="شهادة التقدم" className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-rose-500/15 text-rose-500 hover:brightness-95 flex items-center justify-center active:scale-95 border border-rose-500/30 shadow-sm"><Award className="w-5 h-5" /></button>
            </div>
          ) : <span className="w-10" />}
        </header>

        {/* ── شريط الوقت المتبقي وزر العرض التفاعلي ── */}
        {!active && (
          <div className="card-nour p-2.5 sm:p-3 rounded-2xl bg-gradient-to-l from-card via-card/90 to-card border border-border/80 shadow-md flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-foreground truncate">
                    {profile.playMinutes > 0
                      ? `الوقت المتبقي: ${Math.max(0, profile.playMinutes - (progress.played || 0))} دقيقة`
                      : "وقت اللعب: مفتوح بلا حدود ♾️"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-28 sm:w-36 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        profile.playMinutes > 0 && (progress.played || 0) >= profile.playMinutes
                          ? "bg-destructive"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${
                          profile.playMinutes > 0
                            ? Math.min(100, Math.round(((progress.played || 0) / profile.playMinutes) * 100))
                            : 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {profile.playMinutes > 0 ? `${progress.played}/${profile.playMinutes}د` : "غير مقيّد"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTimeModal(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all shrink-0 flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>كم بقي؟</span>
            </button>
          </div>
        )}

        {def && (def.remote || def.engine === "remote") ? (
          <RemoteGameFrame def={def} onExit={() => setActive(null)} />
        ) : def && Engine ? (
          <div className="card-nour p-2 sm:p-4 animate-fade-up game-container">
            {/* شريط مؤقّت اللعب الأحمر (نفس مكان شريط القراءة الأخضر) */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
                <span className="inline-flex items-center gap-1 text-destructive"><Clock className="w-3.5 h-3.5" /> وقت اللعب</span>
                <span>{progress.played} / {profile.playMinutes > 0 ? profile.playMinutes : "∞"} د</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full transition-all duration-500 ${playPct >= 100 ? "bg-destructive" : "bg-red-500"}`} style={{ width: `${Math.min(100, playPct)}%` }} />
              </div>
            </div>
            <h2 className="text-center font-bold text-accent mb-2 sm:mb-4 flex items-center justify-center gap-2 text-sm sm:text-base">{(() => { const I = iconFor(def.icon); return <I className="w-4 h-4 sm:w-5 sm:h-5" />; })()} {def.title}</h2>
            <Engine def={def} minSurah={profile.currentSurah || 38} />
          </div>
        ) : (
          <>
            <div className="card-nour p-5 text-center space-y-3 animate-fade-up">
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={() => navigate("/shop")} 
                  title="تخصيص الشخصية والمتجر"
                  className="relative group cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-accent/60 ring-offset-4 ring-offset-background p-1 bg-card shadow-xl">
                    <Avatar name={profile.avatar} className="w-full h-full rounded-full" />
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[10px] font-black px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" /> المتجر
                  </span>
                </button>
                <div className="space-y-0.5">
                  <p className="font-extrabold text-lg sm:text-xl text-foreground">{profile.name ? `مرحباً ${profile.name}` : "مرحباً يا بطل القرآن"}</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => navigate("/shop")} className="text-xs font-extrabold text-accent underline-offset-2 hover:underline flex items-center gap-1">
                      خصّص شخصيتك
                    </button>
                    {getProfiles().length > 1 && (
                      <>
                        <span className="text-muted-foreground text-xs">•</span>
                        <button onClick={() => navigate("/profiles")} className="text-xs font-bold text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">تبديل الطفل</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {!unlocked ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 animate-pulse text-amber-500" /> ركن الألعاب مقفل بالقرآن
                    </span>
                    <span className="text-xs font-black text-accent bg-accent/15 px-2.5 py-0.5 rounded-full">
                      بقي {Math.max(0, Math.round((profile.goalMinutes - (progress.minutes || 0)) * 10) / 10)} دقيقة
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-3 rounded-full bg-secondary overflow-hidden p-0.5 border border-border/60">
                      <div className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                      <span>استمعت: <b className="text-emerald-500">{progress.minutes}</b> د</span>
                      <span>الهدف: <b className="text-foreground">{profile.goalMinutes}</b> د</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => navigate("/audio")}
                      className="btn-emerald p-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
                    >
                      <Headphones className="w-4 h-4" /> استمع للقرآن الآن 📖
                    </button>
                    <button
                      onClick={() => setShowLockGateModal(true)}
                      className="p-2.5 rounded-xl bg-card border border-border hover:border-accent/40 font-bold text-xs text-foreground flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Clock className="w-4 h-4 text-accent" /> تفاصيل العداد ⏰
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-success flex items-center justify-center gap-1 font-bold"><Gift className="w-4 h-4" /> {profile.reward}</p>
              )}
            </div>

            {/* ركن التخصيص (وجوه وألوان بالنجوم) */}
            <button onClick={() => navigate("/shop")} className="relative z-10 w-full p-3 rounded-2xl bg-gradient-to-l from-accent/15 to-card border border-accent/40 shadow-soft flex items-center gap-3 active:scale-[0.99]">
              <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6" /></span>
              <span className="flex-1 text-right"><span className="block font-extrabold text-foreground">خصّص شخصيتك</span><span className="block text-[11px] text-muted-foreground">افتح وجوهاً وألواناً جديدة بنجومك</span></span>
              <span className="inline-flex items-center gap-1 text-accent font-extrabold text-xs sm:text-sm bg-accent/15 px-2.5 py-1 rounded-full"><Star className="w-4 h-4 fill-current" /> {formatCoins(coins)} نجمة</span>
            </button>

            <div className="flex items-center justify-between mt-8 mb-3 px-1">
              <h3 className="font-extrabold text-xl text-foreground flex items-center gap-2"><Trophy className="w-6 h-6 text-accent" /> الألعاب الأسطورية</h3>
              <button onClick={requestSurahChange} className="text-xs font-bold text-accent bg-accent/15 px-3 py-1.5 rounded-full hover:bg-accent/25 transition-colors">تغيير السورة ({SURAHS.find(s => s.number === profile.currentSurah)?.name})</button>
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
              : pinAction === "setsurah"
              ? "تغيير السورة — أدخل رمز ولي الأمر"
              : "الخروج من ركن الأطفال"
          }
          onSuccess={onPinSuccess}
          onCancel={() => setPinAction(null)}
        />
      )}
      
      {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
      {showBadges && <BadgesModal onClose={() => setShowBadges(false)} />}

      {/* رسالة التشجيع بعد إنجاز وقت الدراسة (عند الدخول للألعاب) */}
      {showEncourage && unlocked && !active && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border p-6 text-center space-y-4 animate-fade-up">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-success/15 flex items-center justify-center text-5xl">🎉</div>
            <h3 className="text-xl font-extrabold text-foreground">أحسنت يا بطل القرآن!</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              أنهيتَ وقت دراستك اليوم! أنتَ مستعد للتحدي الآن.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={dismissEncourage} className="w-full p-3 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
                <Gamepad2 className="w-5 h-5" /> دخول الألعاب
              </button>
              <button onClick={dismissEncourage} className="w-full p-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold active:scale-95 transition-all">
                دخول الألعاب
              </button>
            </div>
                    </div>
        </div>
      )}

      {/* نافذة شهادة التقدم */}
      {showCertificate && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setShowCertificate(false)}>
          <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border p-6 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 text-rose-500 font-extrabold text-xs px-3 py-1.5"><Award className="w-3.5 h-3.5" /> شهادة التقدم</span>
              <button onClick={() => setShowCertificate(false)} aria-label="إغلاق" className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"><X className="w-4 h-4" /></button>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 rounded-full ring-4 ring-amber-400/60 shadow-xl overflow-hidden p-1 bg-gradient-to-tr from-amber-500 to-yellow-300">
                <Avatar name={profile.avatar} className="w-full h-full rounded-full shadow-inner" />
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">تُمنح هذه الشهادة إلى</p>
                <p className="text-2xl font-extrabold text-gradient-gold">{profile.name || "بطل القرآن"}</p>
                <p className="text-muted-foreground text-sm">لمشاركته في تعلم القرآن الكريم</p>
              </div>

              <div className="bg-secondary/50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">السورة الحالية</span>
                  <span className="font-bold text-foreground">سورة {SURAHS.find(s => s.number === profile.currentSurah)?.name || "النبأ"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">وقت الدراسة</span>
                  <span className="font-bold text-foreground">{progress.minutes} دقيقة</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">النجوم المكتسبة</span>
                  <span className="font-bold text-accent">{formatCoins(getCoins())} ⭐</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الأيام المتتالية</span>
                  <span className="font-bold text-success">{streakDays || 1} يوم</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={generateCertificate} className="w-full p-3 rounded-xl bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
                  <Download className="w-5 h-5" /> تحميل الشهادة كصورة
                </button>
                <button onClick={() => setShowCertificate(false)} className="w-full p-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold active:scale-95 transition-all">
                  إغلاق
                </button>
              </div>

              {certificateReady && (
                <p className="text-xs text-success text-center">✓ تم حفظ الشهادة في جهازك — ابحث في مجلد التنزيلات</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل الوقت المتبقي للأطفال */}
      {showTimeModal && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowTimeModal(false)}>
          <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border p-6 text-center space-y-4 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Clock className="w-7 h-7 animate-bounce" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-foreground">عداد الوقت والهمّة ⏰</h3>
              <p className="text-xs text-muted-foreground font-bold mt-1">تتبع وقت اللعب ودراسة القرآن لليوم</p>
            </div>

            <div className="bg-secondary/40 rounded-2xl p-4 space-y-3 text-right">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-accent" /> الوقت المتبقي للعب:
                </span>
                <span className="text-accent font-black text-sm">
                  {profile.playMinutes > 0
                    ? `${Math.max(0, profile.playMinutes - (progress.played || 0))} دقيقة`
                    : "مفتوح بلا حدود ♾️"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted-foreground" /> تم اللعب اليوم:
                </span>
                <span className="text-foreground font-black">
                  {progress.played || 0} دقيقة {profile.playMinutes > 0 ? `(من أصل ${profile.playMinutes}د)` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Headphones className="w-4 h-4 text-emerald-500" /> وقت مدارسة القرآن:
                </span>
                <span className="text-emerald-500 font-black">
                  {progress.minutes || 0} دقيقة {profile.goalMinutes > 0 ? `(الهدف: ${profile.goalMinutes}د)` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> رصيدك من النجوم:
                </span>
                <span className="text-amber-500 font-black">
                  {formatCoins(getCoins())} نجمة ⭐
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowTimeModal(false);
                  navigate("/audio");
                }}
                className="w-full p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
              >
                <Headphones className="w-4 h-4" />
                <span>الذهاب للتلاوات وحفظ القرآن 📖</span>
              </button>
              <button
                onClick={() => setShowTimeModal(false)}
                className="w-full p-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold text-xs active:scale-95 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* شاشة الاحتفال بالميلستون */}
      {showMilestone && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto" onClick={() => setShowMilestone(false)}>
          <div className="w-full max-w-sm bg-gradient-to-br from-amber-900/90 via-yellow-900/90 to-orange-900/90 rounded-3xl shadow-2xl border-2 border-amber-400/50 p-8 text-center space-y-6 animate-fade-up" onClick={e => e.stopPropagation()}>
            {/* جزيئات احتفالية */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className="absolute top-4 left-6 text-2xl animate-bounce" style={{ animationDelay: "0s" }}>✨</div>
              <div className="absolute top-8 right-8 text-xl animate-bounce" style={{ animationDelay: "0.2s" }}>🌟</div>
              <div className="absolute top-16 left-12 text-lg animate-bounce" style={{ animationDelay: "0.4s" }}>⭐</div>
              <div className="absolute bottom-12 right-10 text-2xl animate-bounce" style={{ animationDelay: "0.1s" }}>🎉</div>
              <div className="absolute bottom-8 left-8 text-xl animate-bounce" style={{ animationDelay: "0.3s" }}>💫</div>
              <div className="absolute top-1/2 left-4 text-lg animate-bounce" style={{ animationDelay: "0.5s" }}>🎊</div>
              <div className="absolute top-1/3 right-6 text-lg animate-bounce" style={{ animationDelay: "0.15s" }}>✨</div>
            </div>

            <div className="relative space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-amber-400/20 border border-amber-300/50 flex items-center justify-center text-amber-300 animate-bounce"><Award className="w-12 h-12" /></div>
              <h2 className="text-3xl font-extrabold text-amber-300 drop-shadow-md">{milestoneData.title}</h2>
              <p className="text-amber-100 text-lg leading-relaxed">{milestoneData.message}</p>

              <div className="bg-black/30 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-200/70">أيام متتالية</span>
                  <span className="font-bold text-amber-300 text-lg">{milestoneData.days} يوم</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-200/70">السورة</span>
                  <span className="font-bold text-amber-300">سورة {SURAHS.find(s => s.number === profile.currentSurah)?.name || "النبأ"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button onClick={() => { shareMilestone(); }} className="w-full p-3 rounded-xl bg-gradient-to-l from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
                  <Camera className="w-5 h-5" /> احفظ/شارك صورة الاحتفال
                </button>
                <button onClick={() => { generateCertificate(); setShowMilestone(false); }} className="w-full p-2.5 rounded-xl bg-white/10 text-amber-200 font-bold active:scale-95 transition-all hover:bg-white/20 flex items-center justify-center gap-2">
                  <Award className="w-4 h-4" /> شهادة التقدير
                </button>
                <button onClick={() => setShowMilestone(false)} className="w-full p-2.5 rounded-xl bg-white/10 text-amber-200 font-bold active:scale-95 transition-all hover:bg-white/20">
                  متابعة اللعب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة عداد وقفل القرآن المتبقي للألعاب */}
      <QuranLockGateModal
        isOpen={showLockGateModal}
        onClose={() => setShowLockGateModal(false)}
        targetName="الألعاب"
      />
    </div>
  );
}

