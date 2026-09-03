import { useState } from "react";
import { Lightbulb, CheckCircle2 } from "lucide-react";
import { addCoins } from "../data/kidsProfile";
import { GameDef } from "../data/gameCatalog";

interface WordBuilderGameProps {
  def: GameDef;
  minSurah?: number;
}

interface QuranWord {
  word: string;
  meaning: string;
  surah: string;
}

const QURAN_WORDS: QuranWord[] = [
  { word: "مَكَّة", meaning: "البلد الأمين وفيه الكعبة الشريفة", surah: "سورة الفتح" },
  { word: "الْحَمْد", meaning: "أول كلمة بعد البسملة في أم الكتاب", surah: "سورة الفاتحة" },
  { word: "النُّور", meaning: "الله نور السماوات والأرض", surah: "سورة النور" },
  { word: "الصَّبْر", meaning: "واستعينوا بالصبر والصلاة", surah: "سورة البقرة" },
  { word: "الْجَنَّة", meaning: "دار النعيم التي أعدها الله للمتقين", surah: "سورة آل عمران" },
  { word: "الصَّلَاة", meaning: "عمود الدين وقرة عين النبي ﷺ", surah: "سورة الإسراء" },
  { word: "الْكَوْثَر", meaning: "نهر عظيم في الجنة لنبينا الكريم ﷺ", surah: "سورة الكوثر" },
  { word: "الْفَلَق", meaning: "قل أعوذ برب الفلق", surah: "سورة الفلق" },
  { word: "الرَّحْمَة", meaning: "ورحمتي وسعت كل شيء", surah: "سورة الأعراف" },
  { word: "التَّقْوَى", meaning: "وتزودوا فإن خير الزاد التقوى", surah: "سورة البقرة" },
];

export default function WordBuilderGame({ def: _def }: WordBuilderGameProps) {
  const [wordIdx, setWordIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [placedIndices, setPlacedIndices] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [mistakeAnim, setMistakeAnim] = useState<number | null>(null);

  const currentWord = QURAN_WORDS[wordIdx % QURAN_WORDS.length];
  // Break into individual characters/letters
  const letters = currentWord.word.split("");

  // Scrambled letters state
  const [scrambled, setScrambled] = useState(() => {
    return letters.map((c, originalIndex) => ({ c, originalIndex })).sort(() => 0.5 - Math.random());
  });

  const nextNeededIndex = placedIndices.length;

  const handleLetterClick = (item: { c: string; originalIndex: number }, scrambledIndex: number) => {
    if (placedIndices.includes(item.originalIndex)) return;

    if (item.originalIndex === nextNeededIndex) {
      // Correct next letter in sequence!
      const newPlaced = [...placedIndices, item.originalIndex];
      setPlacedIndices(newPlaced);

      if (newPlaced.length === letters.length) {
        // Entire word complete!
        const bonus = 2;
        setScore((s) => s + bonus);
        setStreak((st) => st + 1);
        addCoins(bonus);
      }
    } else {
      // Wrong letter selected
      setMistakeAnim(scrambledIndex);
      setTimeout(() => setMistakeAnim(null), 500);
    }
  };

  const useMueenHint = () => {
    // Find the next needed letter and place it automatically
    const targetOriginal = nextNeededIndex;
    if (targetOriginal < letters.length) {
      setPlacedIndices((prev) => [...prev, targetOriginal]);
      setShowHint(true);
    }
  };

  const nextWord = () => {
    const nextI = (wordIdx + 1) % QURAN_WORDS.length;
    setWordIdx(nextI);
    setPlacedIndices([]);
    setShowHint(false);
    setScrambled(
      QURAN_WORDS[nextI].word
        .split("")
        .map((c, originalIndex) => ({ c, originalIndex }))
        .sort(() => 0.5 - Math.random())
    );
  };

  const isWordDone = placedIndices.length === letters.length;

  return (
    <div className="space-y-4 text-center animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
        <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-full">
          {currentWord.surah}
        </span>
        <span className="text-amber-500 font-extrabold text-sm">⭐ {score} نجمة</span>
        <span>الكلمة {wordIdx + 1} من {QURAN_WORDS.length}</span>
      </div>

      {/* Target Word Info */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-md space-y-1">
        <p className="text-xs text-muted-foreground font-bold">معنى الكلمة وموضعها:</p>
        <p className="text-base sm:text-lg font-extrabold text-foreground">{currentWord.meaning}</p>
      </div>

      {/* Slots Row */}
      <div className="flex justify-center items-center gap-2 py-2">
        {letters.map((char, idx) => {
          const isFilled = placedIndices.includes(idx);
          return (
            <div
              key={idx}
              className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl flex items-center justify-center font-extrabold text-2xl border-2 transition-all ${
                isFilled
                  ? "bg-teal-500/20 border-teal-400 text-teal-300 shadow-teal-500/20 shadow-md scale-105"
                  : "bg-secondary/40 border-dashed border-border text-muted-foreground"
              }`}
            >
              {isFilled ? char : "؟"}
            </div>
          );
        })}
      </div>

      {/* Scrambled Letters Pool */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 p-4 rounded-2xl bg-secondary/30 border border-border/50">
        {scrambled.map((item, idx) => {
          const isUsed = placedIndices.includes(item.originalIndex);
          const isMistake = mistakeAnim === idx;

          return (
            <button
              key={idx}
              onClick={() => handleLetterClick(item, idx)}
              disabled={isUsed || isWordDone}
              className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl font-black text-2xl sm:text-3xl border flex items-center justify-center shadow-md transition-all active:scale-95 ${
                isUsed
                  ? "opacity-20 border-transparent bg-muted cursor-not-allowed"
                  : isMistake
                  ? "bg-rose-500/30 border-rose-500 text-rose-300 animate-shake"
                  : "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-slate-950 hover:brightness-110 hover:scale-105"
              }`}
            >
              {item.c}
            </button>
          );
        })}
      </div>

      {/* Al-Mu'een Companion Helper Button */}
      <div
        onClick={useMueenHint}
        className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 cursor-pointer transition-all flex items-center justify-between text-right"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <b className="text-amber-400 block font-extrabold">المُعِين القرآني:</b>
            <span className="text-muted-foreground">
              {showHint
                ? `وضع لك المُعِين الحرف التالي (${letters[placedIndices[placedIndices.length - 1]]})!`
                : "هل تواجه صعوبة؟ اضغط هنا ليضع لك المُعِين الحرف التالي 💡"}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full shrink-0">
          مساعدة
        </span>
      </div>

      {/* Success Feedback */}
      {isWordDone && (
        <div className="p-4 rounded-xl bg-card border border-emerald-500/40 space-y-2 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-center gap-2 font-black text-emerald-400 text-base">
            <CheckCircle2 className="w-5 h-5" /> رتّبت الكلمة الكريمة ({currentWord.word}) بنجاح تام! 🌟
          </div>
          <p className="text-xs text-muted-foreground font-semibold">ربحت +2 نجمة مباركة</p>
          <button
            onClick={nextWord}
            className="btn-gold mx-auto px-6 py-2 rounded-xl font-bold text-sm shadow-md mt-1"
          >
            الكلمة التالية ←
          </button>
        </div>
      )}
    </div>
  );
}
