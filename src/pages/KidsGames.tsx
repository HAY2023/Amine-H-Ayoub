import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, RefreshCw, BookOpen, Lock, Settings, Headphones, ListOrdered, LayoutGrid, Scale, Trophy, Gift, Star, Hash, Grid3x3, Flame, Sparkles, Gamepad2 } from "lucide-react";
import { getAllSurahs } from "../data/quranData";
import { getSurahAudioUrl, hasCloudAudio } from "../data/audioUrls";
import { getProfile, getProgress, getProfiles, getCoins, addCoins, kidsRouteBlocked } from "../data/kidsProfile";
import { getGameCatalog, type GameDef, type GameEngine } from "../data/gameCatalog";
import { ensureCorpus, type SurahText } from "../data/quranText";
import { isKidsMode, setKidsLocked, hasKidsPin } from "../data/kidsLock";
import { shouldHideMushaf } from "../utils/tauriUtils";
import PinModal from "../components/PinModal";
import Avatar from "../components/Avatar";
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
  const [answers, setAnswers] = useState(0);   // عدد الأسئلة المُجابة (للنتيجة النهائية)
  const [earned, setEarned] = useState(0);     // نجوم هذه الجلسة
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(0);
  const [gain, setGain] = useState(0);
  const correct = () => {
    const ns = streak + 1;
    const bonus = ns >= 5 ? 3 : ns >= 3 ? 2 : 1;   // مضاعِف السلسلة
    addCoins(bonus); setGain(bonus); setEarned(e => e + bonus);
    setScore(s => s + 1); setAnswers(a => a + 1); setStreak(ns); setFlash(f => f + 1);
    window.setTimeout(() => setGain(0), 900);   // ومضة "+N" لحظية فقط
  };
  const miss = () => { setStreak(0); setGain(0); setAnswers(a => a + 1); };
  const reset = () => { setScore(0); setAnswers(0); setEarned(0); setStreak(0); setGain(0); };
  return { score, answers, earned, streak, flash, gain, correct, miss, reset };
}
type Game = ReturnType<typeof useGame>;

const PRAISE = ["أحسنت!", "رائع!", "ما شاء الله!"];
const GameHud = ({ g }: { g: Game }) => (
  <div className="flex items-center justify-center gap-3 min-h-[28px]">
    <span className="inline-flex items-center gap-1 text-accent font-extrabold"><Star className="w-4 h-4 fill-current" /> {g.score}</span>
    {g.streak >= 2 && <span className="inline-flex items-center gap-1 text-orange-400 font-bold"><Flame className="w-4 h-4" /> {g.streak}× سلسلة</span>}
    {g.gain > 0 && <span key={g.flash} className="inline-flex items-center gap-0.5 text-success font-extrabold animate-bounce">+{g.gain}<Star className="w-3.5 h-3.5 fill-current" /></span>}
    {/* بهجة: كلمة تشجيع تطفو عند كل إجابة صحيحة (أكبر مع السلسلة) */}
    {g.flash > 0 && (
      <span key={`p-${g.flash}`} className="pointer-events-none fixed left-1/2 top-1/3 z-[60] -translate-x-1/2 font-extrabold text-accent drop-shadow animate-celebrate"
        style={{ fontSize: g.streak >= 5 ? "2rem" : g.streak >= 3 ? "1.6rem" : "1.3rem" }}>
        {PRAISE[g.streak >= 5 ? 2 : g.streak >= 3 ? 1 : 0]}
      </span>
    )}
  </div>
);

// مؤقّت جولة: شريط متناقص يخلق إثارة؛ عند انتهائه يستدعي onExpire (تقدّم لطيف بلا عقاب قاسٍ).
// enabled=false يوقفه (أثناء كشف الإجابة أو بعد انتهاء الجلسة) حتى لا يقفز سؤالاً أثناء التعلّم.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

/* جلسة أسئلة: بداية ونهاية واضحتان (١٠ أسئلة ثم نتيجة) بدل التكرار اللانهائي */
const ROUNDS = 10;
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

// نصوص السور الحقيقية (تُجلب مرّة وتُخزَّن محلياً) — أساس الألعاب النصّية
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

/* ───────────────── المحرّكات (يُعاد استخدامها لألعاب متعددة بمحتوى مختلف) ───────────────── */

// ١) استمع واختر — جلسة ١٠ أسئلة؛ الخطأ يكشف الإجابة الصحيحة وينتقل (لا تخمين متكرر لكسب النجوم)
function ListenEngine({ def }: { def: GameDef }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pool = (() => { const p = poolFor(def).filter(s => hasCloudAudio(s.number)); return p.length >= 3 ? p : CLOUD; })();
  // لا تتكرّر سورة السؤال السابق مباشرة — تنويع منطقي للأسئلة
  const newRound = (prev?: number) => {
    const cand = pool.filter(s => s.number !== prev);
    const o = shuffle(cand.length >= 3 ? cand : pool).slice(0, 3);
    return { opts: o, answer: o[Math.floor(Math.random() * o.length)] };
  };
  const [round, setRound] = useState(() => newRound());
  const [qNum, setQNum] = useState(1);
  const [reveal, setReveal] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);
  const g = useGame();
  const finished = qNum > ROUNDS;
  const play = (n: number) => { const a = audioRef.current; if (!a) return; a.src = audioPath(n); a.currentTime = 0; a.play().catch(() => {}); };
  useEffect(() => () => { audioRef.current?.pause(); }, []);   // إيقاف الصوت عند مغادرة اللعبة
  const choose = (n: number) => {
    if (reveal || finished) return;
    const nn = qNum + 1;
    const go = () => {
      setWrong(null); setReveal(false); setQNum(nn);
      if (nn <= ROUNDS) { const r = newRound(round.answer.number); setRound(r); setTimeout(() => play(r.answer.number), 250); }
      else audioRef.current?.pause();
    };
    if (n === round.answer.number) { g.correct(); go(); }
    else { g.miss(); setWrong(n); setReveal(true); window.setTimeout(go, 1400); }   // يكشف الصحيح ثم ينتقل
  };
  const replay = () => { g.reset(); setQNum(1); const r = newRound(); setRound(r); setTimeout(() => play(r.answer.number), 250); };
  if (finished) return <ResultCard g={g} onReplay={replay} />;
  return (
    <div className="space-y-4 text-center">
      <audio ref={audioRef} />
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-sm flex items-center justify-center gap-1"><Headphones className="w-4 h-4" /> استمع ثم اختر اسم السورة</p>
      <button onClick={() => play(round.answer.number)} className="btn-emerald mx-auto w-20 h-20 rounded-full flex items-center justify-center active:scale-95"><Play className="w-10 h-10" /></button>
      <div className="grid gap-2">
        {round.opts.map(s => {
          const cls = reveal && s.number === round.answer.number
            ? "bg-success/20 border-success/60 text-success"
            : wrong === s.number
              ? "bg-destructive/20 border-destructive/60 text-destructive"
              : "bg-secondary border-border text-secondary-foreground hover:border-accent/50";
          return <button key={s.number} onClick={() => choose(s.number)} className={`p-4 rounded-xl font-bold text-lg border active:scale-95 transition-colors ${cls}`}>{s.name}</button>;
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

// ٢) رتّب الآيات — بنصّ الآيات الحقيقي: الطفل يقرأ ويرتّب حسب حفظه (لا أرقام ظاهرة تُرتَّب آلياً).
// إن لم تتوفّر النصوص بعد (أوّل تشغيل دون إنترنت) نعود لنمط الأرقام مؤقتاً.
function OrderEngine({ def }: { def: GameDef }) {
  const { corpus } = useCorpus();
  const pool = (def.params?.minAyah || def.params?.maxAyah || def.params?.minSurah || def.params?.maxSurah) ? poolFor(def) : SURAHS.filter(s => s.ayahCount >= 3 && s.ayahCount <= 8);
  const makeSurah = () => pool[Math.floor(Math.random() * pool.length)] || SURAHS[0];
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

// ٤) أيّهما أكثر آيات (مؤقّت) — السورتان مختلفتان دائماً في العدد، وبعد الإجابة يُكشف العددان (تعلّم لا تخمين)
function WhichEngine({ def }: { def: GameDef }) {
  const pool = poolFor(def);
  const pair = () => {
    const a = pool[Math.floor(Math.random() * pool.length)];
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
    <div className="space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-muted-foreground text-sm">أيّ سورة عدد آياتها أكثر؟</p>
      <TimerBar left={left} seconds={8} />
      <div className="grid grid-cols-2 gap-3">
        {two.map(s => (
          <button key={s.number} onClick={() => choose(s)}
            className={`p-6 rounded-xl border font-bold text-xl active:scale-95 transition-colors ${reveal && s.ayahCount === maxCount ? "bg-success/20 border-success/60 text-success" : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground"}`}>
            <span className="block">{s.name}</span>
            {reveal && <span className="block mt-1 text-sm font-extrabold text-muted-foreground">{s.ayahCount} آيات</span>}
          </button>
        ))}
      </div>
      <GameHud g={g} />
    </div>
  );
}

// ٥) اختبار قرآني (مؤقّت) — الخيارات قريبة من العدد الصحيح (معقولة، لا أرقام عشوائية بعيدة تسهّل الاستبعاد)
function QuizEngine({ def }: { def: GameDef }) {
  const pool = poolFor(def);
  const make = () => {
    const s = pool[Math.floor(Math.random() * pool.length)];
    const opts = new Set<number>([s.ayahCount]);
    for (const d of shuffle([-3, -2, -1, 1, 2, 3])) {
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
    <div className="space-y-4 text-center">
      <SessionBar q={qNum} />
      <p className="text-foreground text-lg font-bold">كم عدد آيات سورة <span className="text-accent">{q.s.name}</span>؟</p>
      <TimerBar left={left} seconds={8} />
      <div className="grid grid-cols-2 gap-3">
        {q.opts.map((n, i) => {
          const cls = reveal && n === q.s.ayahCount ? "bg-success/20 border-success/60 text-success"
            : reveal && n === chosen ? "bg-destructive/20 border-destructive/60 text-destructive"
            : "bg-secondary border-border hover:border-accent/50 text-secondary-foreground";
          return <button key={i} onClick={() => answer(n)} className={`p-5 rounded-xl border font-extrabold text-2xl active:scale-95 transition-colors ${cls}`}>{n}</button>;
        })}
      </div>
      <GameHud g={g} />
    </div>
  );
}

// ٦) عدّ الآيات (مؤقّت) — الخيارات الخاطئة يجب أن تختلف في عدد الآيات عن الصحيح،
// وإلا ظهر خياران "صحيحان" ويُحسب أحدهما خطأً (الفلق/المسد/الفيل كلها ٥ آيات مثلاً)
function CountEngine({ def }: { def: GameDef }) {
  const pool = poolFor(def);
  const make = () => {
    const s = pool[Math.floor(Math.random() * pool.length)];
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

// ٧) أكمل الآية — يقرأ الطفل آيةً ويختار الآية التالية من نفس السورة (تثبيت حقيقي للحفظ)
function NextAyahEngine(_: { def: GameDef }) {
  const { corpus, failed, retry } = useCorpus();
  if (!corpus) return <CorpusGate failed={failed} retry={retry} />;
  return <NextAyahPlay corpus={corpus} />;
}
function NextAyahPlay({ corpus }: { corpus: SurahText[] }) {
  const eligible = corpus.filter(c => c.ayahs.length >= 3);
  const make = (prevApp?: number) => {
    const cand = eligible.filter(c => c.app !== prevApp);
    const list = cand.length ? cand : eligible;
    const s = list[Math.floor(Math.random() * list.length)];
    const i = Math.floor(Math.random() * (s.ayahs.length - 1));   // ليست الأخيرة
    const answer = s.ayahs[i + 1];
    // المشتِّتات من نفس السورة أولاً (أصعب وأكثر فائدة)، ثم من سور أخرى إن لم تكفِ
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
    window.setTimeout(() => next(qNum + 1), text === q.answer.text ? 700 : 1600);   // مهلة أطول ليقرأ الصحيح
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

// ٨) من أيّ سورة؟ — تُعرض آية حقيقية ويختار الطفل سورتها (ربط الآيات بسورها)
function WhichSurahEngine(_: { def: GameDef }) {
  const { corpus, failed, retry } = useCorpus();
  if (!corpus) return <CorpusGate failed={failed} retry={retry} />;
  return <WhichSurahPlay corpus={corpus} />;
}
function WhichSurahPlay({ corpus }: { corpus: SurahText[] }) {
  const make = (prevApp?: number) => {
    const cand = corpus.filter(c => c.app !== prevApp);
    const list = cand.length ? cand : corpus;
    const s = list[Math.floor(Math.random() * list.length)];
    // نستثني بسملة الفاتحة (آيتها الأولى) لأنها تُقرأ في أوّل كل السور فيلتبس الجواب
    const ayahs = s.ayahs.filter(a => !(s.std === 1 && a.n === 1));
    const a = ayahs[Math.floor(Math.random() * ayahs.length)] || s.ayahs[0];
    const others = shuffle(corpus.filter(c => c.app !== s.app)).slice(0, 2);
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

const ENGINES: Record<GameEngine, (p: { def: GameDef }) => JSX.Element> = {
  listen: ListenEngine, order: OrderEngine, memory: MemoryEngine, which: WhichEngine, quiz: QuizEngine, count: CountEngine,
  nextayah: NextAyahEngine, whichsurah: WhichSurahEngine,
};
const ICONS: Record<string, typeof Headphones> = { Headphones, ListOrdered, LayoutGrid, Scale, Trophy, Hash, Grid3x3, Gamepad2, BookOpen, Sparkles };
const iconFor = (key: string) => ICONS[key] || Gamepad2;

/* ───────────────── ركن الأطفال ───────────────── */
export default function KidsGames() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [profile, setProfile] = useState(getProfile);
  const [progress, setProgress] = useState(getProgress);
  const [coins, setCoins] = useState(getCoins);
  const [catalog, setCatalog] = useState<GameDef[]>(getGameCatalog);
  const [pinAction, setPinAction] = useState<null | "parent" | "exit" | "setread">(null);

  // مخفيّ للمستخدمين (لكن يدخله المالك للتجربة)
  useEffect(() => { if (kidsRouteBlocked()) navigate("/audio", { replace: true }); }, [navigate]);

  // تسخين نصوص السور مبكراً كي تفتح الألعاب النصّية فوراً (تُخزَّن محلياً بعد أول مرة)
  useEffect(() => { ensureCorpus().catch(() => { /* ستعيد اللعبة المحاولة عند فتحها */ }); }, []);

  useEffect(() => {
    const refresh = () => { setProfile(getProfile()); setProgress(getProgress()); setCoins(getCoins()); setCatalog(getGameCatalog()); };
    refresh();
    const evts = ["focus", "mushaf:games_unlocked", "mushaf:coins", "mushaf:gamecatalog", "mushaf:activeprofile"];
    evts.forEach(e => window.addEventListener(e, refresh));
    return () => evts.forEach(e => window.removeEventListener(e, refresh));
  }, []);

  // قفل واحد فقط: «اقرأ لتفتح الألعاب» — بلا حدّ لوقت اللعب وبلا شراء
  const unlocked = progress.unlocked || profile.goalMinutes <= 0;
  const canPlay = unlocked;

  const myGames = catalog.filter(g => g.ageMin <= profile.age);
  const def = active ? catalog.find(g => g.id === active) : null;
  const Engine = def ? ENGINES[def.engine] : null;

  const kidsMode = isKidsMode();
  const inApp = shouldHideMushaf();   // المصحف مخفيّ → الاستماع (لا القراءة) هو ما يفتح الألعاب

  const onPinSuccess = () => {
    if (pinAction === "parent") { setKidsLocked(false); setPinAction(null); navigate("/parent"); return; }
    if (pinAction === "exit") { setKidsLocked(false); setPinAction(null); navigate("/"); return; }
    if (pinAction === "setread") { setKidsLocked(true); setPinAction(null); navigate("/"); return; }
    setPinAction(null);
  };

  const lockAndRead = () => { if (hasKidsPin()) { setKidsLocked(true); navigate("/"); } else setPinAction("setread"); };
  const openParent = () => { if (hasKidsPin()) setPinAction("parent"); else navigate("/parent"); };
  const headerBack = () => { if (active) setActive(null); else if (kidsMode) setPinAction("exit"); else navigate("/"); };
  const tapGame = (id: string) => { if (canPlay) setActive(id); else toast({ title: "أكمِل قراءتك أولاً لتُفتح الألعاب", variant: "destructive" }); };

  const pct = Math.min(100, (progress.minutes / Math.max(1, profile.goalMinutes)) * 100);

  return (
    <div className="min-h-screen page-nour text-foreground" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        <header className="flex items-center justify-between gap-2">
          <button onClick={headerBack} className="flex h-10 items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-4 text-sm font-bold hover:brightness-95 active:scale-95">
            <ArrowRight className="h-4 w-4" /> {active ? "الألعاب" : kidsMode ? "خروج" : "رجوع"}
          </button>
          <h1 className="font-extrabold text-lg text-gradient-gold">ركن الأطفال</h1>
          {!active ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent font-extrabold text-sm px-2.5 h-10"><Star className="w-4 h-4 fill-current" /> {coins}</span>
              <button onClick={openParent} aria-label="إعدادات ولي الأمر" className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground hover:brightness-95 flex items-center justify-center active:scale-95"><Settings className="w-5 h-5" /></button>
            </div>
          ) : <span className="w-10" />}
        </header>

        {def && Engine ? (
          <div className="card-nour p-4 animate-fade-up">
            <h2 className="text-center font-bold text-accent mb-4 flex items-center justify-center gap-2">{(() => { const I = iconFor(def.icon); return <I className="w-5 h-5" />; })()} {def.title}</h2>
            <Engine def={def} />
          </div>
        ) : (
          <>
            {/* بطاقة الطفل + حالة القراءة/اللعب */}
            <div className="card-nour p-4 text-center space-y-2 animate-fade-up">
              <div className="flex flex-col items-center gap-1">
                <span className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${profile.color} flex items-center justify-center shadow-soft`}><Avatar name={profile.avatar} className="w-8 h-8 text-white" /></span>
                <p className="font-bold text-foreground">{profile.name ? `مرحباً ${profile.name}` : "مرحباً بك"}</p>
                {getProfiles().length > 1 && (
                  <button onClick={() => navigate("/profiles")} className="text-xs font-bold text-accent underline-offset-2 hover:underline">تبديل الطفل</button>
                )}
              </div>
              {!unlocked ? (
                <>
                  <p className="text-sm text-destructive flex items-center justify-center gap-1"><Lock className="w-4 h-4" /> الألعاب مقفلة — {inApp ? "استمع" : "اقرأ"} {profile.goalMinutes} دقيقة لفتحها</p>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} /></div>
                  <p className="text-xs text-muted-foreground">{progress.minutes} / {profile.goalMinutes} دقيقة</p>
                  <button onClick={() => navigate("/")} className="btn-emerald w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95">{inApp ? <Headphones className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />} {inApp ? "استمع الآن لفتح الألعاب" : "اقرأ الآن لفتح الألعاب"}</button>
                </>
              ) : (
                <p className="text-sm text-success flex items-center justify-center gap-1"><Gift className="w-4 h-4" /> {profile.reward}</p>
              )}
            </div>

            {/* ركن التخصيص (وجوه وألوان بالنجوم) */}
            <button onClick={() => navigate("/shop")} className="w-full p-3 rounded-2xl bg-gradient-to-l from-accent/15 to-card border border-accent/40 shadow-soft flex items-center gap-3 active:scale-[0.99]">
              <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6" /></span>
              <span className="flex-1 text-right"><span className="block font-extrabold text-foreground">خصّص شخصيتك</span><span className="block text-[11px] text-muted-foreground">افتح وجوهاً وألواناً جديدة بنجومك</span></span>
              <span className="inline-flex items-center gap-1 text-accent font-extrabold"><Star className="w-4 h-4 fill-current" /> {coins}</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              {myGames.map(g => {
                const I = iconFor(g.icon);
                return (
                  <button key={g.id} onClick={() => tapGame(g.id)}
                    className={`relative p-4 card-nour hover:border-accent/50 active:scale-95 flex flex-col items-center gap-2 ${!canPlay ? "opacity-60" : ""}`}>
                    <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${g.tint}`}><I className="w-7 h-7" /></span>
                    <span className="font-bold text-sm text-foreground text-center leading-tight">{g.title}</span>
                    <span className="text-[11px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">سن {g.ageMin}+</span>
                    {!canPlay && <span className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-2xl"><Lock className="w-7 h-7 text-muted-foreground" /></span>}
                  </button>
                );
              })}
              <button onClick={lockAndRead} className="p-4 card-nour hover:border-accent/50 active:scale-95 flex flex-col items-center gap-2">
                <span className="w-14 h-14 rounded-2xl bg-secondary text-accent flex items-center justify-center">{inApp ? <Headphones className="w-7 h-7" /> : <BookOpen className="w-7 h-7" />}</span>
                <span className="font-bold text-sm text-foreground">{inApp ? "سماع مقفل" : "قراءة مقفلة"}</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> بكلمة مرور</span>
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
