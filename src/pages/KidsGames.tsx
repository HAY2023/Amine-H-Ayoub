import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, RefreshCw, BookOpen, Lock } from "lucide-react";
import { getAllSurahs } from "../data/quranData";
import { getSurahAudioUrl, hasCloudAudio } from "../data/audioUrls";
import { toast } from "../hooks/use-toast";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);
const shuffle = <T,>(a: T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const SURAHS = getAllSurahs();
const CLOUD = SURAHS.filter(s => hasCloudAudio(s.number));

// ─────────── ١) استمع واختر (٤-٦) ───────────
function ListenPick() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const newRound = () => { const o = shuffle(CLOUD).slice(0, 3); return { opts: o, answer: o[Math.floor(Math.random() * o.length)] }; };
  const [round, setRound] = useState(newRound);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const play = (n: number) => { const a = audioRef.current; if (!a) return; a.src = audioPath(n); a.currentTime = 0; a.play().catch(() => {}); };
  const choose = (n: number) => {
    if (n === round.answer.number) { setScore(s => s + 1); setWrong(null); const r = newRound(); setRound(r); setTimeout(() => play(r.answer.number), 250); }
    else { setWrong(n); }
  };
  return (
    <div className="space-y-4 text-center">
      <audio ref={audioRef} />
      <p className="text-white/80 text-sm">اضغط 🎧 استمع، ثم اختر اسم السورة</p>
      <button onClick={() => play(round.answer.number)} className="mx-auto w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl active:scale-95"><Play className="w-12 h-12" /></button>
      <div className="grid gap-2">
        {round.opts.map(s => (
          <button key={s.number} onClick={() => choose(s.number)} className={`p-4 rounded-2xl font-extrabold text-lg active:scale-95 transition-colors ${wrong === s.number ? "bg-red-400 text-white" : "bg-white/90 text-slate-800"}`}>{s.name}</button>
        ))}
      </div>
      <p className="text-amber-300 font-bold">النقاط: {score} ⭐</p>
    </div>
  );
}

// ─────────── ٢) رتّب الآيات (٥-٧) ───────────
function OrderAyahs() {
  const pool = SURAHS.filter(s => s.ayahCount >= 3 && s.ayahCount <= 8);
  const makeSurah = () => pool[Math.floor(Math.random() * pool.length)] || SURAHS[0];
  const [surah, setSurah] = useState(makeSurah);
  const [order, setOrder] = useState<number[]>(() => shuffle(Array.from({ length: surah.ayahCount }, (_, i) => i + 1)));
  const [nextNum, setNextNum] = useState(1);
  const done = nextNum > surah.ayahCount;
  const reset = () => { const s = makeSurah(); setSurah(s); setOrder(shuffle(Array.from({ length: s.ayahCount }, (_, i) => i + 1))); setNextNum(1); };
  const tap = (n: number) => {
    if (n !== nextNum) { toast({ title: "🙂 حاول مرة أخرى" }); return; }
    setNextNum(n + 1);
    if (n === surah.ayahCount) toast({ title: "🎉 أحسنت! رتّبتها صحيحاً" });
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-white/80 text-sm">رتّب آيات <b className="text-amber-300">{surah.name}</b> بالترتيب: ١، ٢، ٣ …</p>
      <div className="grid grid-cols-4 gap-2">
        {order.map(n => (
          <button key={n} onClick={() => tap(n)} disabled={n < nextNum} className={`aspect-square rounded-2xl font-extrabold text-2xl active:scale-95 transition-colors ${n < nextNum ? "bg-emerald-500 text-white" : "bg-white/90 text-slate-800"}`}>{n}</button>
        ))}
      </div>
      {done && <button onClick={reset} className="mx-auto px-5 py-2 rounded-xl bg-amber-500 text-black font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> سورة أخرى</button>}
    </div>
  );
}

// ─────────── ٣) لعبة الذاكرة (٦-٩) ───────────
function MemoryGame() {
  const build = () => { const four = shuffle(SURAHS).slice(0, 4); return shuffle([...four, ...four].map((s, i) => ({ id: i, num: s.number, name: s.name }))); };
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
  const won = matched.length === 4;
  return (
    <div className="space-y-3 text-center">
      <p className="text-white/80 text-sm">اقلب البطاقات وطابق السور المتشابهة 🧩</p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c, i) => {
          const show = flipped.includes(i) || matched.includes(c.num);
          return <button key={c.id} onClick={() => flip(i)} className={`aspect-square rounded-xl text-[11px] font-bold flex items-center justify-center p-1 active:scale-95 transition-colors ${show ? "bg-white text-slate-800" : "bg-violet-500 text-white"}`}>{show ? c.name : "؟"}</button>;
        })}
      </div>
      {won && <button onClick={() => { setCards(build()); setMatched([]); setFlipped([]); }} className="mx-auto px-5 py-2 rounded-xl bg-amber-500 text-black font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> 🎉 العب مجدداً</button>}
    </div>
  );
}

// ─────────── ٤) أيّهما أكثر آيات؟ (٩-١٢) ───────────
function WhichMore() {
  const pair = () => { const t = shuffle(SURAHS).slice(0, 2); return (t[0].ayahCount === t[1].ayahCount) ? shuffle(SURAHS).slice(0, 2) : t; };
  const [two, setTwo] = useState(pair);
  const [score, setScore] = useState(0);
  const choose = (s: typeof SURAHS[number]) => {
    const other = two.find(x => x.number !== s.number)!;
    if (s.ayahCount >= other.ayahCount) { setScore(x => x + 1); toast({ title: `✅ صحيح — ${s.name}: ${s.ayahCount} آية` }); }
    else toast({ title: `❌ ${other.name} أكثر (${other.ayahCount} آية)`, variant: "destructive" });
    setTwo(pair());
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-white/80 text-sm">أيّ سورة عدد آياتها أكثر؟ 📏</p>
      <div className="grid grid-cols-2 gap-3">
        {two.map(s => (
          <button key={s.number} onClick={() => choose(s)} className="p-6 rounded-3xl bg-white/90 text-slate-800 font-extrabold text-xl active:scale-95">{s.name}</button>
        ))}
      </div>
      <p className="text-amber-300 font-bold">النقاط: {score} ⭐</p>
    </div>
  );
}

// ─────────── ٥) اختبار قرآني (١٢-١٥) ───────────
function Quiz() {
  const make = () => {
    const s = SURAHS[Math.floor(Math.random() * SURAHS.length)];
    const others = Array.from(new Set(shuffle(SURAHS).map(x => x.ayahCount).filter(c => c !== s.ayahCount))).slice(0, 3);
    return { s, opts: shuffle([s.ayahCount, ...others]) };
  };
  const [q, setQ] = useState(make);
  const [score, setScore] = useState(0);
  const answer = (n: number) => {
    if (n === q.s.ayahCount) { setScore(x => x + 1); toast({ title: "✅ صحيح!" }); }
    else toast({ title: `❌ الصحيح: ${q.s.ayahCount} آية`, variant: "destructive" });
    setQ(make());
  };
  return (
    <div className="space-y-4 text-center">
      <p className="text-white/90 text-lg font-bold">كم عدد آيات سورة <span className="text-amber-300">{q.s.name}</span>؟</p>
      <div className="grid grid-cols-2 gap-3">
        {q.opts.map((n, i) => (
          <button key={i} onClick={() => answer(n)} className="p-5 rounded-2xl bg-white/90 text-slate-800 font-extrabold text-2xl active:scale-95">{n}</button>
        ))}
      </div>
      <p className="text-amber-300 font-bold">النقاط: {score} ⭐</p>
    </div>
  );
}

const GAMES = [
  { key: "listen", emoji: "🎧", name: "استمع واختر", age: "٤-٦", color: "from-emerald-500 to-teal-500", Comp: ListenPick },
  { key: "order", emoji: "🔢", name: "رتّب الآيات", age: "٥-٧", color: "from-sky-500 to-blue-500", Comp: OrderAyahs },
  { key: "memory", emoji: "🧩", name: "لعبة الذاكرة", age: "٦-٩", color: "from-violet-500 to-fuchsia-500", Comp: MemoryGame },
  { key: "more", emoji: "📏", name: "أيّهما أكثر؟", age: "٩-١٢", color: "from-amber-500 to-orange-500", Comp: WhichMore },
  { key: "quiz", emoji: "🏆", name: "اختبار قرآني", age: "١٢-١٥", color: "from-rose-500 to-pink-500", Comp: Quiz },
];

export default function KidsGames() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const game = GAMES.find(g => g.key === active);

  const lockAndRead = () => {
    let pin = ""; try { pin = localStorage.getItem("mushaf:kidsPin") || ""; } catch { /* ignore */ }
    if (!pin) {
      const p = (window.prompt("اختر رمز الخروج (٣ خانات على الأقل):") || "").trim();
      if (p.length < 3) return;
      try { localStorage.setItem("mushaf:kidsPin", p); } catch { /* ignore */ }
    }
    try { localStorage.setItem("mushaf:kidsMode", "1"); } catch { /* ignore */ }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-900 text-white" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={() => (active ? setActive(null) : navigate("/"))} className="flex h-10 items-center gap-1 rounded-full bg-white/15 px-4 text-sm font-bold active:scale-95">
            <ArrowRight className="h-4 w-4" /> {active ? "الألعاب" : "رجوع"}
          </button>
          <h1 className="font-extrabold text-lg text-amber-300">🧒 ركن الأطفال</h1>
          <span className="w-16" />
        </header>

        {!game ? (
          <div className="grid grid-cols-2 gap-3">
            {GAMES.map(g => (
              <button key={g.key} onClick={() => setActive(g.key)} className={`p-4 rounded-3xl bg-gradient-to-br ${g.color} text-white shadow-xl active:scale-95 flex flex-col items-center gap-1.5`}>
                <span className="text-4xl">{g.emoji}</span>
                <span className="font-extrabold text-base">{g.name}</span>
                <span className="text-[11px] bg-black/25 rounded-full px-2 py-0.5">سن {g.age}</span>
              </button>
            ))}
            <button onClick={lockAndRead} className="p-4 rounded-3xl bg-white/10 border border-white/20 text-white active:scale-95 flex flex-col items-center gap-1.5">
              <BookOpen className="w-9 h-9" />
              <span className="font-extrabold text-base">قراءة مقفلة</span>
              <span className="text-[11px] flex items-center gap-1"><Lock className="w-3 h-3" /> بكلمة مرور</span>
            </button>
          </div>
        ) : (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
            <h2 className="text-center font-extrabold text-amber-300 mb-4">{game.emoji} {game.name} <span className="text-xs text-white/60">(سن {game.age})</span></h2>
            <game.Comp />
          </div>
        )}
      </div>
    </div>
  );
}
