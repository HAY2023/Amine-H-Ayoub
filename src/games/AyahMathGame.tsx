import { useState, useEffect, useMemo } from "react";
import { Lightbulb, CheckCircle2, XCircle, Star, ArrowLeft, RefreshCw, Trophy, Sparkles } from "lucide-react";
import { addCoins, spendCoins, getCoins, formatCoins } from "../data/kidsProfile";
import { GameDef } from "../data/gameCatalog";
import { toast } from "../hooks/use-toast";

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
    question: "كم عدد آيات سورة الفاتحة المباركة (أم الكتاب والسبع المثاني)؟",
    correct: 7,
    options: [5, 6, 7, 8],
    hint: "تسمى أيضاً بالسبع المثاني، تبدأ بالحمد وتنتهي بالضالين!",
  },
  {
    surah: "سورة الإخلاص",
    question: "كم عدد آيات سورة الإخلاص العظيمة (التي تعدل ثلث القرآن الكريم)؟",
    correct: 4,
    options: [3, 4, 5, 6],
    hint: "قل هو الله أحد (1)، الله الصمد (2)، لم يلد ولم يولد (3)، ولم يكن له كفواً أحد (4).",
  },
  {
    surah: "سورة الكوثر",
    question: "كم عدد آيات سورة الكوثر (أقصر سور القرآن الكريم إطلاقاً)؟",
    correct: 3,
    options: [2, 3, 4, 5],
    hint: "إنا أعطيناك الكوثر (1)، فصلّ لربك وانحر (2)، إن شانئك هو الأبتر (3).",
  },
  {
    surah: "سورة الناس",
    question: "كم عدد آيات سورة الناس (آخر سورة في ترتيب المصحف الشريف)؟",
    correct: 6,
    options: [5, 6, 7, 8],
    hint: "تبدأ بـ (قل أعوذ برب الناس) وتنتهي بـ (من الجنة والناس).",
  },
  {
    surah: "سورة الفلق",
    question: "كم عدد آيات سورة الفلق الكريمة (إحدى المعوذتين)؟",
    correct: 5,
    options: [4, 5, 6, 7],
    hint: "خمس آيات مباركة للحفظ من كل شر وحاسد إذا حسد!",
  },
  {
    surah: "جمع آيات القرآن",
    question: "إذا جمعنا آيات سورة الكوثر (3) وآيات سورة النصر (3)، فكم يكون المجموع الكلي؟",
    correct: 6,
    options: [5, 6, 7, 8],
    hint: "3 آيات + 3 آيات = كم المجموع يا عبقري؟",
  },
  {
    surah: "سورة القدر",
    question: "كم عدد آيات سورة القدر التي تصف ليلة الشرف العظيمة؟",
    correct: 5,
    options: [4, 5, 6, 7],
    hint: "خير من ألف شهر، وتنتهي بـ (سلام هي حتى مطلع الفجر).",
  },
  {
    surah: "سورة قريش",
    question: "كم عدد آيات سورة قريش التي تذكر رحلة الشتاء والصيف وإطعام الجوع؟",
    correct: 4,
    options: [3, 4, 5, 6],
    hint: "لإيلاف قريش (1)، إيلافهم (2)، فليعبدوا (3)، الذي أطعمهم (4).",
  },
  {
    surah: "سورة العصر",
    question: "كم عدد آيات سورة العصر التي أقسم الله فيها بالزمان؟",
    correct: 3,
    options: [2, 3, 4, 5],
    hint: "والعصر (1)، إن الإنسان لفي خسر (2)، إلا الذين آمنوا... (3).",
  },
  {
    surah: "سورة الماعون",
    question: "كم عدد آيات سورة الماعون التي تنهى عن التكذيب بالدين ومنع المساعدة؟",
    correct: 7,
    options: [5, 6, 7, 8],
    hint: "نفس عدد آيات سورة الفاتحة تماماً!",
  },
  {
    surah: "سورة الفيل",
    question: "كم عدد آيات سورة الفيل التي تروي معجزة هلاك أبرهة وجيشه؟",
    correct: 5,
    options: [4, 5, 6, 7],
    hint: "نفس عدد آيات سورة الفلق وسورة القدر!",
  },
  {
    surah: "جمع الآيات المباركة",
    question: "إذا جمعنا آيات سورة الفاتحة (7) وآيات سورة الإخلاص (4)، فكم الناتج؟",
    correct: 11,
    options: [9, 10, 11, 12],
    hint: "7 + 4 = 11 آية كريمة!",
  },
  {
    surah: "سورة التين",
    question: "كم عدد آيات سورة التين (وَالتِّينِ وَالزَّيْتُونِ * وَطُورِ سِينِينَ)؟",
    correct: 8,
    options: [6, 7, 8, 9],
    hint: "ثماني آيات تنتهي بـ (أَلَيْسَ اللَّهُ بِأَحْكَمِ الْحَاكِمِينَ).",
  },
  {
    surah: "سورة الزلزلة",
    question: "كم عدد آيات سورة الزلزلة (إِذَا زُلْزِلَتِ الْأَرْضُ زِلْزَالَهَا)؟",
    correct: 8,
    options: [7, 8, 9, 10],
    hint: "ثماني آيات تنتهي بذكر مثقال ذرة خيراً يره وشراً يره!",
  },
  {
    surah: "سورة النصر",
    question: "كم عدد آيات سورة النصر (إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ)؟",
    correct: 3,
    options: [2, 3, 4, 5],
    hint: "سورة من 3 آيات بشرت بفتح مكة ودخول الناس في دين الله أفواجاً!",
  },
  {
    surah: "حساب السور العظيمة",
    question: "إذا جمعنا آيات سورة الإخلاص (4) مع آيات سورة الفلق (5) مع آيات سورة الناس (6)، كم الناتج؟",
    correct: 15,
    options: [13, 14, 15, 16],
    hint: "4 + 5 + 6 = ؟",
  },
  {
    surah: "سورة الشرح",
    question: "كم عدد آيات سورة الشرح (أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ)؟",
    correct: 8,
    options: [6, 7, 8, 9],
    hint: "ثماني آيات عظيمة، فيها (فَإِنَّ مَعَ الْعُسْرِ يُسْرًا).",
  },
  {
    surah: "سورة الضحى",
    question: "كم عدد آيات سورة الضحى (وَالضُّحَى * وَاللَّيْلِ إِذَا سَجَى)؟",
    correct: 11,
    options: [9, 10, 11, 12],
    hint: "إحدى عشرة آية تخبرنا بعناية الله بنبيه ﷺ.",
  },
  {
    surah: "طرح الآيات",
    question: "سورة الضحى 11 آية، وسورة الشرح 8 آيات. كم الفرق بينهما؟",
    correct: 3,
    options: [2, 3, 4, 5],
    hint: "11 - 8 = ؟",
  },
  {
    surah: "سورة الليل",
    question: "كم عدد آيات سورة الليل (وَاللَّيْلِ إِذَا يَغْشَى * وَالنَّهَارِ إِذَا تَجَلَّى)؟",
    correct: 21,
    options: [19, 20, 21, 22],
    hint: "تبدأ بالقسم بالليل، وتتكون من 21 آية.",
  },
  {
    surah: "سورة الشمس",
    question: "كم عدد آيات سورة الشمس (وَالشَّمْسِ وَضُحَاهَا)؟",
    correct: 15,
    options: [13, 14, 15, 16],
    hint: "خمس عشرة آية، أقسم الله فيها بالشمس والقمر والنهار والليل.",
  },
  {
    surah: "سورة البلد",
    question: "كم عدد آيات سورة البلد (لَا أُقْسِمُ بِهَذَا الْبَلَدِ)؟",
    correct: 20,
    options: [18, 19, 20, 21],
    hint: "عشرون آية كريمة في سورة البلد.",
  },
  {
    surah: "سورة الفجر",
    question: "كم عدد آيات سورة الفجر (وَالْفَجْرِ * وَلَيَالٍ عَشْرٍ)؟",
    correct: 30,
    options: [28, 29, 30, 31],
    hint: "ثلاثون آية، تنتهي بـ (وَادْخُلِي جَنَّتِي).",
  },
  {
    surah: "طرح الكبار",
    question: "سورة الفجر (30 آية) وسورة البلد (20 آية). ما هو الفرق بينهما؟",
    correct: 10,
    options: [8, 9, 10, 11],
    hint: "30 - 20 = ؟",
  },
  {
    surah: "سورة الغاشية",
    question: "كم عدد آيات سورة الغاشية (هَلْ أَتَاكَ حَدِيثُ الْغَاشِيَةِ)؟",
    correct: 26,
    options: [24, 25, 26, 27],
    hint: "ست وعشرون آية، تصف حال الناس يوم القيامة في الجنة والنار.",
  },
  {
    surah: "سورة الأعلى",
    question: "كم عدد آيات سورة الأعلى (سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى)؟",
    correct: 19,
    options: [17, 18, 19, 20],
    hint: "تسع عشرة آية، تنتهي بـ (صُحُفِ إِبْرَاهِيمَ وَمُوسَى).",
  },
  {
    surah: "سورة الطارق",
    question: "كم عدد آيات سورة الطارق (وَالسَّمَاءِ وَالطَّارِقِ)؟",
    correct: 17,
    options: [15, 16, 17, 18],
    hint: "سبع عشرة آية كريمة.",
  },
  {
    surah: "حساب السور",
    question: "سورة الطارق 17 آية، وسورة الأعلى 19 آية. كم مجموعهما؟",
    correct: 36,
    options: [34, 35, 36, 37],
    hint: "17 + 19 = 36!",
  },
  {
    surah: "سورة البروج",
    question: "كم عدد آيات سورة البروج (وَالسَّمَاءِ ذَاتِ الْبُرُوجِ)؟",
    correct: 22,
    options: [20, 21, 22, 23],
    hint: "اثنتان وعشرون آية، وفيها قصة أصحاب الأخدود.",
  },
  {
    surah: "سورة الانشقاق",
    question: "كم عدد آيات سورة الانشقاق (إِذَا السَّمَاءُ انْشَقَّتْ)؟",
    correct: 25,
    options: [23, 24, 25, 26],
    hint: "خمس وعشرون آية تصف أهوال يوم القيامة.",
  },
  {
    surah: "سورة المطففين",
    question: "كم عدد آيات سورة المطففين (وَيْلٌ لِلْمُطَفِّفِينَ)؟",
    correct: 36,
    options: [34, 35, 36, 37],
    hint: "ست وثلاثون آية، وفيها ويل للمطففين الذين يغشون في الميزان.",
  },
  {
    surah: "سورة الانفطار",
    question: "كم عدد آيات سورة الانفطار (إِذَا السَّمَاءُ انْفَطَرَتْ)؟",
    correct: 19,
    options: [17, 18, 19, 20],
    hint: "تسع عشرة آية، مثل سورة الأعلى تماماً.",
  },
  {
    surah: "سورة التكوير",
    question: "كم عدد آيات سورة التكوير (إِذَا الشَّمْسُ كُوِّرَتْ)؟",
    correct: 29,
    options: [27, 28, 29, 30],
    hint: "تسع وعشرون آية.",
  },
  {
    surah: "سورة عبس",
    question: "كم عدد آيات سورة عبس (عَبَسَ وَتَوَلَّى)؟",
    correct: 42,
    options: [40, 41, 42, 43],
    hint: "اثنتان وأربعون آية كريمة.",
  },
  {
    surah: "سورة النازعات",
    question: "كم عدد آيات سورة النازعات (وَالنَّازِعَاتِ غَرْقًا)؟",
    correct: 46,
    options: [44, 45, 46, 47],
    hint: "ست وأربعون آية تصف مشهداً عظيماً يوم القيامة.",
  },
  {
    surah: "سورة النبأ",
    question: "كم عدد آيات سورة النبأ (عَمَّ يَتَسَاءَلُونَ)؟",
    correct: 40,
    options: [38, 39, 40, 41],
    hint: "أربعون آية، وبها سمي الجزء الأخير من القرآن.",
  },
  {
    surah: "طرح جزء عم",
    question: "سورة النبأ (40 آية) وسورة النازعات (46 آية). كم الفرق بينهما؟",
    correct: 6,
    options: [4, 5, 6, 7],
    hint: "46 - 40 = ؟",
  }
];

function playSound(type: "correct" | "wrong" | "hint" | "win") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (type === "correct") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "wrong") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    } else if (type === "hint") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.26);
      });
    }
  } catch {
    /* AudioContext fallback */
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function AyahMathGame({ def: _def }: AyahMathGameProps) {
  const [shuffledList, setShuffledList] = useState<MathQuestion[]>(() => shuffleArray(MATH_QUESTIONS));

  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(getCoins);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [chosenOpt, setChosenOpt] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [eliminatedOpts, setEliminatedOpts] = useState<number[]>([]);

  useEffect(() => {
    const handleCoins = () => setCoins(getCoins());
    window.addEventListener("mushaf:coins", handleCoins);
    return () => window.removeEventListener("mushaf:coins", handleCoins);
  }, []);

  const currentQ = shuffledList[qIdx % shuffledList.length];

  const handleSelect = (opt: number) => {
    if (answered || eliminatedOpts.includes(opt)) return;
    setAnswered(true);
    setChosenOpt(opt);

    if (opt === currentQ.correct) {
      playSound("correct");
      const newStreak = streak + 1;
      setStreak(newStreak);
      const bonus = newStreak >= 3 ? 3 : 2;
      setScore((s) => s + bonus);
      addCoins(bonus);
    } else {
      playSound("wrong");
      setStreak(0);
    }
  };

  // المساعدة بتكلفة 1 نجمة: حذف خيار خاطئ + إظهار التلميح
  const useMueenHint = () => {
    if (answered || showHint) return;

    if (!spendCoins(1)) {
      toast({
        title: "النجوم غير كافية!",
        description: "تحتاج إلى نجمة واحدة ⭐ للحصول على مساعدة المُعِين. اقرأ واستمع للقرآن لتكسب نجوماً!",
        variant: "destructive",
      });
      return;
    }

    playSound("hint");
    setShowHint(true);

    // حذف خيار خاطئ
    const wrongOpts = currentQ.options.filter((o) => o !== currentQ.correct);
    const toEliminate = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
    if (toEliminate) {
      setEliminatedOpts([toEliminate]);
    }

    toast({
      title: "مساعدة المُعِين 💡 (-1 ⭐)",
      description: `تم خصم نجمة واحدة وحذف خيار خاطئ (${toEliminate}) وإظهار تلميح الحساب!`,
    });
  };

  const nextQuestion = () => {
    setQIdx((idx) => idx + 1);
    setAnswered(false);
    setChosenOpt(null);
    setShowHint(false);
    setEliminatedOpts([]);
  };

  const isFinished = qIdx >= shuffledList.length;

  if (isFinished) {
    return (
      <div className="space-y-4 text-center py-6 animate-fade-up max-w-xl mx-auto" dir="rtl">
        <Trophy className="w-16 h-16 mx-auto text-amber-400 drop-shadow-lg animate-bounce" />
        <h3 className="text-xl sm:text-2xl font-black text-foreground">
          ما شاء الله! أنهيت جولة حساب آيات القرآن بنجاح 🌟
        </h3>
        <p className="text-sm text-muted-foreground font-bold">
          جمعت {score} نجمة مباركة في حساب وتدبر الآيات الكريمة
        </p>
        <button
          onClick={() => {
            setShuffledList(shuffleArray(MATH_QUESTIONS));
            setQIdx(0);
            setScore(0);
            setStreak(0);
            setAnswered(false);
            setChosenOpt(null);
            setShowHint(false);
            setEliminatedOpts([]);
          }}
          className="btn-gold mx-auto px-7 py-3 rounded-2xl font-black flex items-center gap-2 text-base shadow-xl hover:brightness-105 active:scale-95 transition-all"
        >
          <RefreshCw className="w-5 h-5" /> العب جولة جديدة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center animate-fade-up max-w-xl mx-auto" dir="rtl">
      {/* شريط الإحصائيات العلوي الملكي الموحد */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-3.5 py-2 bg-secondary/50 backdrop-blur-sm rounded-2xl border border-border/70 shadow-sm">
        <span className="bg-primary/15 text-primary border border-primary/30 px-3 py-1 rounded-full font-black">
          {currentQ.surah}
        </span>
        <span className="text-amber-500 font-black text-sm flex items-center gap-1 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 shadow-inner">
          <Star className="w-4 h-4 fill-amber-500" /> {formatCoins(coins)} نجمة
        </span>
        <span className="text-muted-foreground font-extrabold">
          السؤال {qIdx + 1} من {shuffledList.length}
        </span>
      </div>

      {/* شارة السلسلة الحسابية */}
      {streak >= 2 && (
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 text-amber-500 border border-amber-500/30 px-3.5 py-1 rounded-full text-xs font-black animate-bounce shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-500" /> إتقان رياضي متميز {streak}× على التوالي!
        </div>
      )}

      {/* بطاقة السؤال القرآني الفاخرة */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card via-card/95 to-secondary/30 border-2 border-accent/25 shadow-xl space-y-3 text-right">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black text-accent uppercase tracking-wider">احسب عدد الآيات:</p>
          <span className="text-[10px] font-bold text-muted-foreground">اختر الرقم الصحيح</span>
        </div>
        <p className="text-base sm:text-lg font-black text-foreground leading-relaxed">
          {currentQ.question}
        </p>

        {/* حبات اللؤلؤ القرآني التفاعلية (تظهر فقط بعد الإجابة) */}
        {answered && (
          <div className="flex flex-wrap justify-center gap-2 p-2.5 bg-secondary/30 rounded-2xl max-w-sm mx-auto items-center border border-border/40 shadow-inner">
            {Array.from({ length: currentQ.correct }, (_, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-md animate-in zoom-in ring-2 ring-amber-400/30"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* شبكة الخيارات 2×2 */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {currentQ.options.map((opt) => {
          const isEliminated = eliminatedOpts.includes(opt);
          let cls = "bg-secondary/80 border-border hover:border-amber-500/50 text-foreground hover:bg-secondary";

          if (isEliminated) {
            cls = "bg-secondary/20 border-dashed border-border/30 text-muted-foreground/30 line-through opacity-30 cursor-not-allowed";
          } else if (answered) {
            if (opt === currentQ.correct) {
              cls = "bg-gradient-to-br from-emerald-600/30 to-emerald-800/40 border-emerald-400 text-emerald-300 font-black shadow-lg shadow-emerald-500/20 scale-[1.02]";
            } else if (opt === chosenOpt) {
              cls = "bg-rose-500/25 border-rose-500 text-rose-300 line-through";
            } else {
              cls = "bg-secondary/40 border-border/40 text-muted-foreground opacity-50";
            }
          }

          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={answered || isEliminated}
              className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 min-h-[90px] sm:min-h-[105px] transition-all duration-200 active:scale-95 cursor-pointer shadow-sm ${cls}`}
            >
              <span className="font-black text-3xl sm:text-4xl">{opt}</span>
              <span className="text-xs font-bold text-muted-foreground">آيات كريمة</span>
            </button>
          );
        })}
      </div>

      {/* زر المُعِين القرآني الذكي للمساعدة بنجوم (-1 ⭐) */}
      <button
        onClick={useMueenHint}
        disabled={answered || showHint}
        className="w-full p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 active:scale-98 transition-all flex items-center justify-between text-right cursor-pointer shadow-sm disabled:opacity-50"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Lightbulb className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-xs min-w-0">
            <span className="text-amber-500 font-black block">المُعِين القرآني الذكي:</span>
            <span className="text-muted-foreground font-semibold truncate block">
              {showHint
                ? currentQ.hint
                : "اضغط هنا ليكشف لك المُعِين تلميحاً حسابياً ويحذف خياراً خاطئاً (تكلفة: 1 نجمة)"}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-black text-amber-500 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 shrink-0 flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 fill-amber-500" />
          <span>{showHint ? "مُفعّل ✓" : "تلميح (-1 ⭐)"}</span>
        </span>
      </button>

      {/* نتيجة الإجابة والتغذية الراجعة والزر التالي */}
      {answered && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card via-card to-secondary/30 border-2 border-border shadow-xl space-y-3 animate-fade-up text-right">
          <div className="flex items-center justify-center gap-2 font-black text-base">
            {chosenOpt === currentQ.correct ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> إجابة دقيقة وصحيحة! (+2 نجمة) 🌟
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1.5">
                <XCircle className="w-5 h-5 text-rose-400" /> الجواب الصحيح هو: {currentQ.correct} آيات كريمة
              </span>
            )}
          </div>

          <button
            onClick={nextQuestion}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-base shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>السؤال التالي</span>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}


