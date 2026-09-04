import { useState, useEffect, useMemo } from "react";
import { Lightbulb, CheckCircle2, Star, ArrowLeft } from "lucide-react";
import { addCoins, spendCoins, getCoins, formatCoins } from "../data/kidsProfile";
import { GameDef } from "../data/gameCatalog";
import { toast } from "../hooks/use-toast";

interface WordBuilderGameProps {
  def: GameDef;
  minSurah?: number;
}

interface QuranWord {
  displayWord: string; // الكلمة للعرض النهائي (أحرف صافية مجردة بدون أي تشكيل)
  cleanWord: string;   // الكلمة بدون أي تشكيل لتفكيك الحروف
  meaning: string;
  surah: string;
}

/**
 * دالة تنظيف التشكيل والحركات والمدود وضبط المصاحف تماماً
 * تجرد النص ليبقى أحرفاً عربية صافية بدون تشكيل أو حركات نهائياً
 */
function cleanLettersOnly(text: string): string {
  return text
    // إزالة جميع علامات التشكيل، الحركات، التنوين، الشدة، السكون، وعلامات الضبط القرآني
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u06DF-\u06E8\u0640]/g, "")
    // توحيد الألفات (همزة وصل، قطع، مدة) لتسهيل التهجئة النقية على الطفل
    .replace(/[أإآٱ]/g, "ا")
    .trim();
}

const RAW_WORDS = [
  { word: "الْكَوْثَر", meaning: "نهر عظيم في الجنة لنبينا الكريم ﷺ", surah: "سورة الكوثر (108)" },
  { word: "الْفَلَق", meaning: "الصبح ونوره الذي يشق الظلام", surah: "سورة الفلق (113)" },
  { word: "النَّاس", meaning: "البشر وخلق الله جميعاً", surah: "سورة الناس (114)" },
  { word: "الصَّمَد", meaning: "السيد الذي تقصده الخلائق في كل حوائجها", surah: "سورة الإخلاص (112)" },
  { word: "النَّصْر", meaning: "العون والفتح والتأييد من الله", surah: "سورة النصر (110)" },
  { word: "قُرَيْش", meaning: "القبيلة المكرمة بمكة وأهل البيت الحرام", surah: "سورة قريش (106)" },
  { word: "الْمَاعُون", meaning: "المساعدة وبذل الخير للناس واليتامى", surah: "سورة الماعون (107)" },
  { word: "الْفِيل", meaning: "معجزة حماية الكعبة من أبرهة الأشرم", surah: "سورة الفيل (105)" },
  { word: "الْعَصْر", meaning: "الزمان والوقت الذي أقسم الله به", surah: "سورة العصر (103)" },
  { word: "الْقَارِعَة", meaning: "يوم القيامة التي تقرع القلوب بهولها", surah: "سورة القارعة (101)" },
  { word: "الْعَادِيَات", meaning: "الخيل السريعة التي تجري في سبيل الله", surah: "سورة العاديات (100)" },
  { word: "الزَّلْزَلَة", meaning: "اهتزاز الأرض ورجفتها يوم الحساب", surah: "سورة الزلزلة (99)" },
  { word: "الْبَيِّنَة", meaning: "الحجة الواضحة والبرهان الساطع", surah: "سورة البينة (98)" },
  { word: "الْقَدْر", meaning: "ليلة الشرف والعظمة خير من ألف شهر", surah: "سورة القدر (97)" },
  { word: "الشَّرْح", meaning: "انشراح الصدر وتيسير الأمر للنبي ﷺ", surah: "سورة الشرح (94)" },
  { word: "التِّين", meaning: "الثمرة المباركة التي أقسم الله بها", surah: "سورة التين (95)" },
  { word: "الضُّحَى", meaning: "وقت ارتفاع الشمس ونور النهار الجميل", surah: "سورة الضحى (93)" },
  { word: "اللَّيْل", meaning: "الآية الكونية العظيمة للسكون والراحة", surah: "سورة الليل (92)" },
  { word: "الشَّمْس", meaning: "السراج الوهاج الذي يضيء الكون", surah: "سورة الشمس (91)" },
  { word: "الْبَلَد", meaning: "مكة المكرمة أم القرى وحرم الله الآمن", surah: "سورة البلد (90)" },
  { word: "الْفَجْر", meaning: "انفلاق ضياء الصباح وبداية اليوم المبارك", surah: "سورة الفجر (89)" },
  { word: "الْأَعْلَى", meaning: "اسم الله العظيم، المنزه عن كل نقص", surah: "سورة الأعلى (87)" },
  { word: "الطَّارِق", meaning: "النجم الثاقب المضيء في كبد السماء", surah: "سورة الطارق (86)" },
  { word: "الْبُرُوج", meaning: "منازل النجوم والكواكب في السماء", surah: "سورة البروج (85)" },
  { word: "الِانْفِطَار", meaning: "انشقاق السماء وخشوعها لأمر ربها", surah: "سورة الانفطار (82)" },
  { word: "النَّبَأ", meaning: "الخبر العظيم عن البعث ويوم القيامة", surah: "سورة النبأ (78)" },
  { word: "الْمُلْك", meaning: "تبارك الذي بيده ملك السماوات والأرض", surah: "سورة الملك (67)" },
  { word: "الرَّحْمَٰن", meaning: "ذو الرحمة الشاملة لجميع الخلائق", surah: "سورة الرحمن (55)" },
  { word: "الْوَاقِعَة", meaning: "القيامة التي ليس لوقعتها كاذبة", surah: "سورة الواقعة (56)" },
  { word: "يَس", meaning: "قلب القرآن الكريم والسورة العظيمة", surah: "سورة يس (36)" },
];

// الكلمات مجردة تماماً من أي تشكيل — أحرف صافية فقط للعرض والتفكيك
const QURAN_WORDS: QuranWord[] = RAW_WORDS.map((item) => {
  const clean = cleanLettersOnly(item.word);
  return {
    displayWord: clean,
    cleanWord: clean,
    meaning: item.meaning,
    surah: item.surah,
  };
});

function playSound(type: "correct" | "wrong" | "win") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (type === "correct") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } else if (type === "wrong") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
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
    /* AudioContext not available */
  }
}

export default function WordBuilderGame({ def: _def }: WordBuilderGameProps) {
  // خلط قائمة الكلمات عشوائياً لمنع التكرار
  const shuffledPool = useMemo(() => {
    return [...QURAN_WORDS].sort(() => Math.random() - 0.5);
  }, []);

  const [wordIdx, setWordIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(getCoins);
  const [placedIndices, setPlacedIndices] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [mistakeAnim, setMistakeAnim] = useState<number | null>(null);

  useEffect(() => {
    const handleCoins = () => setCoins(getCoins());
    window.addEventListener("mushaf:coins", handleCoins);
    return () => window.removeEventListener("mushaf:coins", handleCoins);
  }, []);

  const currentWord = shuffledPool[wordIdx % shuffledPool.length];
  // حروف الكلمة نظيفة بدون تشكيل نهائياً
  const letters = useMemo(() => currentWord.cleanWord.split(""), [currentWord.cleanWord]);

  // الحروف المبعثرة — نتتبع الاستخدام بفهرس الخلط وليس الأصلي
  const [scrambled, setScrambled] = useState<{ c: string; originalIndex: number; id: number }[]>([]);

  useEffect(() => {
    const arr = letters.map((c, originalIndex) => ({ c, originalIndex, id: originalIndex }));
    arr.sort(() => Math.random() - 0.5);
    setScrambled(arr);
    setPlacedIndices([]);
    setShowHint(false);
  }, [letters]);

  const nextNeededIndex = placedIndices.length;

  const handleLetterClick = (item: { c: string; originalIndex: number; id: number }, scrambledIndex: number) => {
    if (placedIndices.includes(item.id)) return;

    // التحقق من قيمة الحرف وليس موقعه — لقبول الحروف المكررة (مثل «ا» و«ل» في «الصلاة»)
    if (item.c === letters[nextNeededIndex]) {
      // الحرف صحيح بالترتيب!
      playSound("correct");
      const newPlaced = [...placedIndices, item.id];
      setPlacedIndices(newPlaced);

      if (newPlaced.length === letters.length) {
        // اكتملت الكلمة القرآنية بنجاح!
        playSound("win");
        const bonus = 2;
        setScore((s) => s + bonus);
        addCoins(bonus);
      }
    } else {
      // خطأ في الترتيب
      playSound("wrong");
      setMistakeAnim(scrambledIndex);
      setTimeout(() => setMistakeAnim(null), 500);
    }
  };

  // التلميح بنجوم: خصم 1 نجمة لكشف الحرف التالي
  const useMueenHint = () => {
    if (placedIndices.length === letters.length || nextNeededIndex >= letters.length) return;

    if (!spendCoins(1)) {
      toast({
        title: "النجوم غير كافية!",
        description: "تحتاج إلى نجمة واحدة ⭐ للحصول على مساعدة المُعِين. اقرأ واستمع للقرآن لتكسب نجوماً!",
        variant: "destructive",
      });
      return;
    }

    playSound("correct");
    setPlacedIndices((prev) => [...prev, nextNeededIndex]);
    setShowHint(true);
    toast({
      title: "مساعدة المُعِين 💡 (-1 ⭐)",
      description: `تم كشف الحرف (${letters[nextNeededIndex]}) بخصم نجمة واحدة من رصيدك.`,
    });
  };

  const nextWord = () => {
    setWordIdx((prev) => prev + 1);
  };

  const isWordDone = placedIndices.length === letters.length;

  return (
    <div className="space-y-4 text-center animate-fade-up max-w-xl mx-auto" dir="rtl">
      {/* شريط الإحصائيات العلوي الملكي الموحد */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-3.5 py-2 bg-secondary/50 backdrop-blur-sm rounded-2xl border border-border/70 shadow-sm">
        <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-black">
          {currentWord.surah}
        </span>
        <span className="text-amber-500 font-black text-sm flex items-center gap-1 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 shadow-inner">
          <Star className="w-4 h-4 fill-amber-500" /> {formatCoins(coins)} نجمة
        </span>
        <span className="text-muted-foreground font-extrabold">
          الكلمة {(wordIdx % shuffledPool.length) + 1} من {shuffledPool.length}
        </span>
      </div>

      {/* بطاقة معنى الكلمة وموضعها القرآني الفاخرة */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card via-card/95 to-secondary/30 border-2 border-accent/25 shadow-xl space-y-1.5 text-right">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black text-accent uppercase tracking-wider">المعنى والموضع القرآني:</p>
          <span className="text-[10px] font-bold text-muted-foreground">رتّب حروف الكلمة بالترتيب الصحيح</span>
        </div>
        <p className="text-base sm:text-lg font-black text-foreground leading-relaxed">
          {currentWord.meaning}
        </p>
      </div>

      {/* خانات ترتيب الحروف المجردة (الكلمة المستهدفة) */}
      <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2.5 py-3.5 px-2 bg-secondary/20 rounded-3xl border border-border/40">
        {letters.map((char, idx) => {
          const isFilled = idx < placedIndices.length;
          return (
            <div
              key={idx}
              className={`w-11 h-13 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl border-2 transition-all duration-300 ${
                isFilled
                  ? "bg-gradient-to-b from-emerald-600/30 to-emerald-800/40 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20 scale-105"
                  : "bg-card/70 border-dashed border-border/80 text-muted-foreground/50 shadow-inner"
              }`}
            >
              {isFilled ? char : "؟"}
            </div>
          );
        })}
      </div>

      {/* مجموعة الحروف المبعثرة النظيفة (أحرف فقط بدون تشكيل إطلاقاً) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card via-card to-secondary/40 border-2 border-border/70 shadow-lg space-y-2.5">
        <p className="text-xs font-bold text-muted-foreground">اضغط على الحرف التالي بالترتيب:</p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {scrambled.map((item, idx) => {
            const isUsed = placedIndices.includes(item.id);
            const isMistake = mistakeAnim === idx;

            return (
              <button
                key={idx}
                onClick={() => handleLetterClick(item, idx)}
                disabled={isUsed || isWordDone}
                className={`w-12 h-14 sm:w-15 sm:h-17 rounded-2xl font-black text-2xl sm:text-3xl border-2 flex items-center justify-center transition-all duration-150 active:scale-90 ${
                  isUsed
                    ? "opacity-15 border-transparent bg-muted/40 cursor-not-allowed scale-90"
                    : isMistake
                    ? "bg-rose-500/30 border-rose-500 text-rose-300 animate-shake scale-105"
                    : "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 border-amber-300/80 text-slate-950 shadow-md hover:brightness-110 hover:scale-105 cursor-pointer ring-2 ring-amber-500/20"
                }`}
              >
                {item.c}
              </button>
            );
          })}
        </div>
      </div>

      {/* زر المُعِين القرآني الذكي للمساعدة بالنجوم */}
      <button
        onClick={useMueenHint}
        disabled={isWordDone}
        className="w-full p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 active:scale-98 transition-all flex items-center justify-between text-right cursor-pointer shadow-sm disabled:opacity-50"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Lightbulb className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-xs">
            <span className="text-amber-500 font-black block">المُعِين القرآني الذكي:</span>
            <span className="text-muted-foreground font-semibold">
              {showHint
                ? `كشف لك المُعِين الحرف المطلوب: (${letters[placedIndices[placedIndices.length - 1]]})!`
                : "اضغط هنا ليكشف لك المُعِين الحرف التالي (تكلفة المساعدة: 1 نجمة)"}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-black text-amber-500 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 shrink-0 flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 fill-amber-500" />
          <span>تلميح (-1 ⭐)</span>
        </span>
      </button>

      {/* بطاقة النجاح واكتمال الكلمة */}
      {isWordDone && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-card border-2 border-emerald-500/50 shadow-2xl space-y-3 animate-fade-up">
          <div className="flex items-center justify-center gap-2 font-black text-emerald-400 text-lg sm:text-xl">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />
            <span>أحسنت! رتّبت كلمة «{currentWord.displayWord}» بنجاح! 🌟</span>
          </div>
          <p className="text-xs text-emerald-200/80 font-bold">ربحت +2 نجمة قرآنية أضيفت إلى رصيدك ⭐</p>
          <button
            onClick={nextWord}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-base shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>الكلمة التالية</span>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
