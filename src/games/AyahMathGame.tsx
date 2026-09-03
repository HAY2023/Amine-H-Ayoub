import { useState } from "react";
import { Lightbulb, CheckCircle2, XCircle } from "lucide-react";
import { addCoins } from "../data/kidsProfile";
import { GameDef } from "../data/gameCatalog";

interface AyahMathGameProps {
  def: GameDef;
  minSurah?: number;
}

interface MathQuestion {
  surah: string;
  question: string;
  correct: number;
  options: number[];
  hint: string;
}

const MATH_QUESTIONS: MathQuestion[] = [
  {
    surah: "سورة الفاتحة",
    question: "كم عدد آيات سورة الفاتحة المباركة (أم الكتاب)؟",
    correct: 7,
    options: [5, 6, 7, 8],
    hint: "تسمى أيضاً بالسبع المثاني!",
  },
  {
    surah: "سورة الإخلاص",
    question: "كم عدد آيات سورة الإخلاص (تعدل ثلث القرآن)؟",
    correct: 4,
    options: [3, 4, 5, 6],
    hint: "قل هو الله أحد، الله الصمد، لم يلد ولم يولد، ولم يكن له كفواً أحد.",
  },
  {
    surah: "سورة الكوثر",
    question: "كم عدد آيات سورة الكوثر (أقصر سور القرآن الكريم)؟",
    correct: 3,
    options: [2, 3, 4, 5],
    hint: "إنا أعطيناك الكوثر، فصلّ لربك وانحر، إن شانئك هو الأبتر.",
  },
  {
    surah: "سورة الناس",
    question: "كم عدد آيات سورة الناس الكريمة؟",
    correct: 6,
    options: [5, 6, 7, 8],
    hint: "تبدأ بـ (قل أعوذ برب الناس) وتنتهي بـ (من الجنة والناس).",
  },
  {
    surah: "سورة الفلق",
    question: "كم عدد آيات سورة الفلق الكريمة؟",
    correct: 5,
    options: [4, 5, 6, 7],
    hint: "خمس آيات للحفظ من كل شر وحاسد إذا حسد.",
  },
  {
    surah: "جمع الآيات",
    question: "إذا جمعنا آيات سورة الكوثر (3) وآيات سورة النصر (3)، فكم المجموع؟",
    correct: 6,
    options: [5, 6, 7, 8],
    hint: "3 + 3 = كم؟ عملية جمع سهلة يا بطل!",
  },
  {
    surah: "سورة القدر",
    question: "كم عدد آيات سورة القدر التي تصف ليلة القدر المباركة؟",
    correct: 5,
    options: [4, 5, 6, 7],
    hint: "خير من ألف شهر، وتنتهي بـ (سلام هي حتى مطلع الفجر).",
  },
];

export default function AyahMathGame({ def: _def }: AyahMathGameProps) {
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [chosenOpt, setChosenOpt] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const currentQ = MATH_QUESTIONS[qIdx % MATH_QUESTIONS.length];

  const handleSelect = (opt: number) => {
    if (answered) return;
    setAnswered(true);
    setChosenOpt(opt);

    if (opt === currentQ.correct) {
      setScore((s) => s + 2);
      addCoins(2);
    }
  };

  const nextQuestion = () => {
    setQIdx((idx) => (idx + 1) % MATH_QUESTIONS.length);
    setAnswered(false);
    setChosenOpt(null);
    setShowHint(false);
  };

  return (
    <div className="space-y-4 text-center animate-fade-up">
      {/* Session Header */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
        <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
          {currentQ.surah}
        </span>
        <span className="text-amber-500 font-extrabold text-sm">⭐ {score} نجمة</span>
        <span>السؤال {qIdx + 1} من {MATH_QUESTIONS.length}</span>
      </div>

      {/* Question Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-md space-y-3">
        <p className="text-base sm:text-lg font-extrabold text-foreground">{currentQ.question}</p>

        {/* Visual Beads Counter */}
        <div className="flex flex-wrap justify-center gap-1.5 p-2 bg-secondary/30 rounded-xl max-w-xs mx-auto min-h-[44px] items-center">
          {Array.from({ length: currentQ.correct }, (_, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm animate-in zoom-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Options 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {currentQ.options.map((opt) => {
          let cls = "bg-secondary border-border hover:border-amber-500/40 text-secondary-foreground";
          if (answered) {
            if (opt === currentQ.correct) {
              cls = "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-black shadow-emerald-500/20 shadow-md";
            } else if (opt === chosenOpt) {
              cls = "bg-rose-500/20 border-rose-500 text-rose-400 line-through";
            } else {
              cls = "bg-secondary/40 border-border/30 opacity-50";
            }
          }

          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={answered}
              className={`p-4 sm:p-5 rounded-xl border flex flex-col items-center justify-center gap-1 font-black text-2xl sm:text-3xl active:scale-95 transition-all ${cls}`}
            >
              <span>{opt}</span>
              <span className="text-[11px] font-normal text-muted-foreground">آيات</span>
            </button>
          );
        })}
      </div>

      {/* Al-Mu'een Hint Card */}
      <div
        onClick={() => setShowHint((h) => !h)}
        className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/15 cursor-pointer transition-all flex items-center justify-between text-right"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <b className="text-teal-400 block font-extrabold">المُعِين القرآني:</b>
            <span className="text-muted-foreground">
              {showHint ? currentQ.hint : "اضغط هنا لتتلقى مساعدة وتلميحاً من المُعِين 💡"}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-bold text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded-full shrink-0">
          {showHint ? "إخفاء" : "تلميح"}
        </span>
      </div>

      {/* Feedback Card */}
      {answered && (
        <div className="p-4 rounded-xl bg-card border border-border space-y-2 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-center gap-2 font-black text-sm">
            {chosenOpt === currentQ.correct ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> إجابة صحيحة ومباركة! (+2 نجمة) 🌟
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> الجواب الصحيح هو: {currentQ.correct} آيات
              </span>
            )}
          </div>
          <button
            onClick={nextQuestion}
            className="btn-gold mx-auto px-6 py-2 rounded-xl font-bold text-sm shadow-md mt-1"
          >
            السؤال التالي ←
          </button>
        </div>
      )}
    </div>
  );
}
