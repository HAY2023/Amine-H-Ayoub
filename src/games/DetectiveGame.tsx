import { useState } from "react";
import { Sparkles, Trophy, Lightbulb, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { addCoins } from "../data/kidsProfile";
import { GameDef } from "../data/gameCatalog";

interface DetectiveGameProps {
  def: GameDef;
  minSurah?: number;
}

interface DetectiveQuestion {
  tag: string;
  question: string;
  options: { text: string; icon: string; isOdd: boolean; note?: string }[];
  hint: string;
}

const QUESTIONS: DetectiveQuestion[] = [
  {
    tag: "مكان النزول",
    question: "أي من هذه السور نزلت في المدينة (سورة مدنية) بينما البقية مكية؟",
    options: [
      { text: "سورة الناس", icon: "📖", isOdd: true, note: "سورة الناس مدنية في الراجح، بينما قريش والإخلاص والكوثر مكية." },
      { text: "سورة قريش", icon: "🕋", isOdd: false },
      { text: "سورة الإخلاص", icon: "✨", isOdd: false },
      { text: "سورة الكوثر", icon: "💧", isOdd: false },
    ],
    hint: "ابحث عن السورة التي تُعد من المعوذات وفيها ذكر ملك الناس وإله الناس!",
  },
  {
    tag: "أسماء السور الكريمة",
    question: "أي من هذه السور لا تُسمى باسم نبي من الأنبياء؟",
    options: [
      { text: "سورة يوسف", icon: "👑", isOdd: false },
      { text: "سورة يونس", icon: "🐋", isOdd: false },
      { text: "سورة مريم", icon: "🌸", isOdd: true, note: "السيدة مريم صدّيقة وليست نبياً، بينما يوسف ويونس وهود أنبياء ورسل." },
      { text: "سورة هود", icon: "📜", isOdd: false },
    ],
    hint: "السيدة الصديقة أم النبي عيسى عليه السلام!",
  },
  {
    tag: "فواتح السور",
    question: "أي من هذه السور لا تبدأ بقسم؟",
    options: [
      { text: "سورة الفلق", icon: "🌅", isOdd: true, note: "سورة الفلق تبدأ بـ (قُلْ أَعُوذُ)، بينما العصر والشمس والفجر تبدأ بأقسام." },
      { text: "سورة العصر", icon: "⏳", isOdd: false },
      { text: "سورة الشمس", icon: "☀️", isOdd: false },
      { text: "سورة الفجر", icon: "🌄", isOdd: false },
    ],
    hint: "ابحث عن سورة تبدأ بالفعل (قُلْ)!",
  },
  {
    tag: "أوقات وأزمان",
    question: "أي من هذه السور لا تدل على وقت من أوقات اليوم؟",
    options: [
      { text: "سورة الفجر", icon: "🌄", isOdd: false },
      { text: "سورة الضحى", icon: "🌞", isOdd: false },
      { text: "سورة الليل", icon: "🌙", isOdd: false },
      { text: "سورة العاديات", icon: "🐎", isOdd: true, note: "العاديات هي الخيل التي تعدو في سبيل الله، وليست وقتاً من الأوقات." },
    ],
    hint: "هذه السورة سُميت باسم الخيل السريعة التي تضبح!",
  },
  {
    tag: "أطوال السور",
    question: "أي من هذه السور ليست ثلاث آيات؟",
    options: [
      { text: "سورة الكوثر", icon: "💎", isOdd: false },
      { text: "سورة العصر", icon: "⏱️", isOdd: false },
      { text: "سورة النصر", icon: "🏆", isOdd: false },
      { text: "سورة قريش", icon: "🕌", isOdd: true, note: "سورة قريش تتكون من 4 آيات، بينما الكوثر والعصر والنصر 3 آيات." },
    ],
    hint: "سورة تذكر رحلة الشتاء والصيف وتتكون من 4 آيات!",
  },
  {
    tag: "مخلوقات الله",
    question: "أي من هذه السور لا تحمل اسم كائن حي؟",
    options: [
      { text: "سورة النحل", icon: "🐝", isOdd: false },
      { text: "سورة النمل", icon: "🐜", isOdd: false },
      { text: "سورة العنكبوت", icon: "🕸️", isOdd: false },
      { text: "سورة الحديد", icon: "⚙️", isOdd: true, note: "الحديد عنصر ومعدن وليس كائناً حياً!" },
    ],
    hint: "معدن عظيم أنزله الله فيه بأس شديد ومنافع للناس!",
  },
  {
    tag: "عروس القرآن",
    question: "أي من هذه السور لُقبت بـ (عروس القرآن)؟",
    options: [
      { text: "سورة الرحمن", icon: "🌹", isOdd: true, note: "سورة الرحمن لُقبت بعروس القرآن لحسنها وعظيم نعمها!" },
      { text: "سورة الملك", icon: "🛡️", isOdd: false },
      { text: "سورة يس", icon: "❤️", isOdd: false },
      { text: "سورة الواقعة", icon: "⚡", isOdd: false },
    ],
    hint: "سورة فيها آية تتكرر كثيراً: (فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ)!",
  },
  {
    tag: "أجزاء المصحف",
    question: "أي من هذه السور لا تقع في جزء عمّ (الجزء الثلاثون)؟",
    options: [
      { text: "سورة النبأ", icon: "📜", isOdd: false },
      { text: "سورة التكوير", icon: "🌌", isOdd: false },
      { text: "سورة الملك", icon: "👑", isOdd: true, note: "سورة الملك تقع في جزء تبارك (الجزء التاسع والعشرون) وليس جزء عمّ." },
      { text: "سورة الإخلاص", icon: "⭐", isOdd: false },
    ],
    hint: "السورة المنجية من عذاب القبر وتبدأ بها أجزاء الجزء 29!",
  },
];

export default function DetectiveGame({ def: _def }: DetectiveGameProps) {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState(() => {
    return [...QUESTIONS[0].options].sort(() => 0.5 - Math.random());
  });

  const currentQ = QUESTIONS[qIndex % QUESTIONS.length];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setAnswered(true);
    setChosenIdx(idx);

    const opt = shuffledOptions[idx];
    if (opt.isOdd) {
      // Correct!
      const newStreak = streak + 1;
      setStreak(newStreak);
      const bonus = newStreak >= 3 ? 2 : 1;
      setScore((s) => s + bonus);
      addCoins(bonus);
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    const nextIdx = (qIndex + 1) % QUESTIONS.length;
    setQIndex(nextIdx);
    setAnswered(false);
    setChosenIdx(null);
    setShowHint(false);
    setShuffledOptions([...QUESTIONS[nextIdx].options].sort(() => 0.5 - Math.random()));
  };

  const isFinished = qIndex >= QUESTIONS.length;

  if (isFinished) {
    return (
      <div className="space-y-4 text-center py-6 animate-fade-up">
        <Trophy className="w-16 h-16 mx-auto text-amber-400 drop-shadow" />
        <h3 className="text-xl font-extrabold text-foreground">ما شاء الله! أنهيت جولة المحقق القرآني 🌟</h3>
        <p className="text-sm text-muted-foreground">حصلت على {score} نجمة قرانية مباركة</p>
        <button
          onClick={() => {
            setQIndex(0);
            setScore(0);
            setStreak(0);
            setAnswered(false);
            setChosenIdx(null);
            setShowHint(false);
            setShuffledOptions([...QUESTIONS[0].options].sort(() => 0.5 - Math.random()));
          }}
          className="btn-gold mx-auto px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> العب من جديد
        </button>
      </div>
    );
  }

  const oddOpt = shuffledOptions.find((o) => o.isOdd);

  return (
    <div className="space-y-4 text-center animate-fade-up">
      {/* Session Header */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
        <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
          فئة: {currentQ.tag}
        </span>
        <span className="text-amber-500 font-extrabold text-sm">⭐ {score} نجمة</span>
        <span>السؤال {qIndex + 1} من {QUESTIONS.length}</span>
      </div>

      {/* Streak Badge */}
      {streak >= 2 && (
        <div className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-500 border border-amber-500/30 px-3 py-0.5 rounded-full text-xs font-extrabold animate-bounce">
          <Sparkles className="w-3.5 h-3.5" /> سلسلة عبقرية {streak}× متتالي!
        </div>
      )}

      {/* Question Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-md space-y-2">
        <p className="text-base sm:text-lg font-extrabold text-foreground leading-relaxed">
          {currentQ.question}
        </p>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {shuffledOptions.map((opt, i) => {
          let btnClass = "bg-secondary border-border hover:border-amber-500/40 text-secondary-foreground";
          if (answered) {
            if (opt.isOdd) {
              btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-black shadow-emerald-500/20 shadow-lg";
            } else if (i === chosenIdx) {
              btnClass = "bg-rose-500/20 border-rose-500 text-rose-400 line-through";
            } else {
              btnClass = "bg-secondary/50 border-border/40 text-muted-foreground opacity-60";
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center justify-center gap-2 min-h-[90px] sm:min-h-[105px] transition-all active:scale-95 ${btnClass}`}
            >
              <span className="text-2xl sm:text-3xl">{opt.icon}</span>
              <span className="font-extrabold text-sm sm:text-base">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* Al-Mu'een Companion Helper Card */}
      <div
        onClick={() => setShowHint((h) => !h)}
        className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/15 cursor-pointer transition-all flex items-center justify-between text-right"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <b className="text-teal-400 block font-extrabold">المُعِين القرآني الذكي:</b>
            <span className="text-muted-foreground">
              {showHint ? currentQ.hint : "اضغط هنا لتتلقى تلميحاً ذكياً من المُعِين 💡"}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-bold text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded-full shrink-0">
          {showHint ? "إخفاء" : "تلميح"}
        </span>
      </div>

      {/* Feedback & Next Button */}
      {answered && (
        <div className="p-4 rounded-xl bg-card border border-border space-y-2 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-center gap-2 font-black text-sm">
            {chosenIdx !== null && shuffledOptions[chosenIdx].isOdd ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> أحسنت يا محقق القرآن العبقري!
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> إجابة قريبة، لكن تذكر السر القرآني:
              </span>
            )}
          </div>
          {oddOpt?.note && (
            <p className="text-xs text-muted-foreground font-medium">{oddOpt.note}</p>
          )}
          <button
            onClick={nextQuestion}
            className="btn-gold mx-auto px-6 py-2 rounded-xl font-bold text-sm shadow-md mt-2"
          >
            السؤال التالي ←
          </button>
        </div>
      )}
    </div>
  );
}
