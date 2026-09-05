import { useState, useEffect, useMemo } from "react";
import { Star, RefreshCw, CheckCircle2, Flame, Heart, Lightbulb, ArrowLeft } from "lucide-react";
import { addCoins, spendCoins, getCoins, formatCoins } from "../data/kidsProfile";
import { GameDef } from "../data/gameCatalog";
import { toast } from "../hooks/use-toast";

interface CatchStarGameProps {
  def: GameDef;
  minSurah?: number;
}

interface StarItem {
  id: string;
  text: string;
  isGood: boolean;
  surahRef?: string;
}

const STAR_ROUNDS = [
  {
    title: "اجمع ثمار وفضائل المؤمن في القرآن",
    targetDesc: "انقر على النجوم التي تحمل أخلاقاً وسلوكيات مدحها القرآن الكريم!",
    items: [
      { id: "1", text: "الصَّبْر", isGood: true, surahRef: "البقرة" },
      { id: "2", text: "الْغَضَب", isGood: false },
      { id: "3", text: "الصِّدْق", isGood: true, surahRef: "التوبة" },
      { id: "4", text: "الْإِحْسَان", isGood: true, surahRef: "الرحمن" },
      { id: "5", text: "الْكَذِب", isGood: false },
      { id: "6", text: "التَّقْوَى", isGood: true, surahRef: "الحجرات" },
      { id: "7", text: "الْبِرّ", isGood: true, surahRef: "آل عمران" },
      { id: "8", text: "الْغَفْلَة", isGood: false },
    ],
    hint: "ابحث عن الصبر، الصدق، التقوى والإحسان في كتاب الله!",
  },
  {
    title: "اجمع كلمات سورة الإخلاص العظيمة",
    targetDesc: "انقر على النجوم التي تحتوي على كلمات سورة الإخلاص المباركة!",
    items: [
      { id: "1", text: "قُلْ", isGood: true, surahRef: "الإخلاص" },
      { id: "2", text: "حَجَر", isGood: false },
      { id: "3", text: "هُوَ", isGood: true, surahRef: "الإخلاص" },
      { id: "4", text: "أَحَدٌ", isGood: true, surahRef: "الإخلاص" },
      { id: "5", text: "الصَّمَدُ", isGood: true, surahRef: "الإخلاص" },
      { id: "6", text: "طَيْر", isGood: false },
      { id: "7", text: "كُفُوًا", isGood: true, surahRef: "الإخلاص" },
      { id: "8", text: "خَشَب", isGood: false },
    ],
    hint: "قل، هو، الله، أحد، الصمد، كفواً!",
  },
  {
    title: "اجمع أسماء ونعيم الجنة في القرآن",
    targetDesc: "انقر على النجوم التي تحمل أسماء جنات النعيم والخلود!",
    items: [
      { id: "1", text: "الْفِرْدَوْس", isGood: true, surahRef: "الكهف" },
      { id: "2", text: "السَّمُوم", isGood: false },
      { id: "3", text: "جَنَّاتُ عَدْنٍ", isGood: true, surahRef: "مريم" },
      { id: "4", text: "دَارُ السَّلَام", isGood: true, surahRef: "الأنعام" },
      { id: "5", text: "الْحَمِيم", isGood: false },
      { id: "6", text: "جَنَّةُ الْخُلْد", isGood: true, surahRef: "الفرقان" },
    ],
    hint: "الفردوس، جنات عدن، ودار السلام، وجنة الخلد!",
  },
  {
    title: "اجمع أسماء سور القرآن الكريم",
    targetDesc: "انقر على النجوم التي تحمل أسماء سور موجودة في المصحف!",
    items: [
      { id: "1", text: "الْبَقَرَة", isGood: true, surahRef: "سورة" },
      { id: "2", text: "التُّفَّاح", isGood: false },
      { id: "3", text: "النَّاس", isGood: true, surahRef: "سورة" },
      { id: "4", text: "الْأَسَد", isGood: false },
      { id: "5", text: "الْكَهْف", isGood: true, surahRef: "سورة" },
      { id: "6", text: "الْمَاء", isGood: false },
      { id: "7", text: "مَرْيَم", isGood: true, surahRef: "سورة" },
      { id: "8", text: "الْجَبَل", isGood: false },
    ],
    hint: "البقرة، الناس، الكهف، مريم!",
  },
  {
    title: "اجمع أسماء الأنبياء المذكورين في القرآن",
    targetDesc: "انقر على النجوم التي تحمل أسماء أنبياء ورسل الله عليهم السلام!",
    items: [
      { id: "1", text: "مُحَمَّد", isGood: true, surahRef: "خاتم الأنبياء" },
      { id: "2", text: "فِرْعَوْن", isGood: false },
      { id: "3", text: "مُوسَى", isGood: true, surahRef: "كليم الله" },
      { id: "4", text: "هَامَان", isGood: false },
      { id: "5", text: "عِيسَى", isGood: true, surahRef: "كلمة الله" },
      { id: "6", text: "قَارُون", isGood: false },
      { id: "7", text: "إِبْرَاهِيم", isGood: true, surahRef: "خليل الله" },
      { id: "8", text: "أَبُو لَهَب", isGood: false },
    ],
    hint: "محمد، موسى، عيسى، إبراهيم عليهم السلام!",
  },
  {
    title: "اجمع الكلمات التي تدل على الليل والظلام",
    targetDesc: "انقر على النجوم التي تحمل كلمات قرآنية تتعلق بالليل والظلام!",
    items: [
      { id: "1", text: "اللَّيْل", isGood: true, surahRef: "الليل" },
      { id: "2", text: "النَّهَار", isGood: false },
      { id: "3", text: "سَجَى", isGood: true, surahRef: "الضحى" },
      { id: "4", text: "الشَّمْس", isGood: false },
      { id: "5", text: "غَاسِق", isGood: true, surahRef: "الفلق" },
      { id: "6", text: "الضُّحَى", isGood: false },
      { id: "7", text: "الظُّلُمَات", isGood: true, surahRef: "النور" },
      { id: "8", text: "النُّور", isGood: false },
    ],
    hint: "الليل، سجى، غاسق، الظلمات!",
  },
  {
    title: "اجمع أسماء الملائكة الأبرار",
    targetDesc: "انقر على النجوم التي تحمل أسماء ملائكة ذُكروا في القرآن!",
    items: [
      { id: "1", text: "جِبْرِيل", isGood: true, surahRef: "البقرة" },
      { id: "2", text: "إِبْلِيس", isGood: false },
      { id: "3", text: "مِيكَال", isGood: true, surahRef: "البقرة" },
      { id: "4", text: "قَارُون", isGood: false },
      { id: "5", text: "مَالِك", isGood: true, surahRef: "الزخرف" },
      { id: "6", text: "هَامَان", isGood: false },
      { id: "7", text: "هَارُوت", isGood: true, surahRef: "البقرة" },
      { id: "8", text: "فِرْعَوْن", isGood: false },
    ],
    hint: "جبريل، ميكال، مالك، هاروت!",
  },
  {
    title: "اجمع كلمات سورة الكوثر",
    targetDesc: "انقر على النجوم التي تحتوي على كلمات من سورة الكوثر!",
    items: [
      { id: "1", text: "أَعْطَيْنَاكَ", isGood: true, surahRef: "الكوثر" },
      { id: "2", text: "النَّاس", isGood: false },
      { id: "3", text: "الْكَوْثَر", isGood: true, surahRef: "الكوثر" },
      { id: "4", text: "الْفَلَق", isGood: false },
      { id: "5", text: "وَانْحَرْ", isGood: true, surahRef: "الكوثر" },
      { id: "6", text: "أَحَد", isGood: false },
      { id: "7", text: "الْأَبْتَر", isGood: true, surahRef: "الكوثر" },
      { id: "8", text: "الصَّمَد", isGood: false },
    ],
    hint: "أعطيناك، الكوثر، وانحر، الأبتر!",
  },
  {
    title: "اجمع كلمات تتعلق بالسماء والفضاء",
    targetDesc: "انقر على النجوم التي تحمل كلمات عن السماء والكواكب ذُكرت في القرآن!",
    items: [
      { id: "1", text: "الشَّمْس", isGood: true, surahRef: "الشمس" },
      { id: "2", text: "الْأَرْض", isGood: false },
      { id: "3", text: "الْقَمَر", isGood: true, surahRef: "القمر" },
      { id: "4", text: "الْجَبَل", isGood: false },
      { id: "5", text: "النَّجْم", isGood: true, surahRef: "النجم" },
      { id: "6", text: "الْبَحْر", isGood: false },
      { id: "7", text: "الْكَوْكَب", isGood: true, surahRef: "يوسف" },
      { id: "8", text: "الشَّجَر", isGood: false },
    ],
    hint: "الشمس، القمر، النجم، الكوكب!",
  },
  {
    title: "اجمع كلمات سورة النصر",
    targetDesc: "انقر على النجوم التي تحتوي على كلمات من سورة النصر!",
    items: [
      { id: "1", text: "نَصْرُ", isGood: true, surahRef: "النصر" },
      { id: "2", text: "خُسْر", isGood: false },
      { id: "3", text: "الْفَتْحُ", isGood: true, surahRef: "النصر" },
      { id: "4", text: "الْفِيل", isGood: false },
      { id: "5", text: "أَفْوَاجًا", isGood: true, surahRef: "النصر" },
      { id: "6", text: "قُرَيْش", isGood: false },
      { id: "7", text: "تَوَّابًا", isGood: true, surahRef: "النصر" },
      { id: "8", text: "حَاسِد", isGood: false },
    ],
    hint: "نصر، الفتح، أفواجاً، تواباً!",
  },
  {
    title: "اجمع الألوان المذكورة في القرآن",
    targetDesc: "انقر على النجوم التي تحمل أسماء ألوان ذُكرت في كتاب الله!",
    items: [
      { id: "1", text: "أَبْيَض", isGood: true, surahRef: "البقرة" },
      { id: "2", text: "بُرْتُقَالِي", isGood: false },
      { id: "3", text: "أَسْوَد", isGood: true, surahRef: "البقرة" },
      { id: "4", text: "وَرْدِي", isGood: false },
      { id: "5", text: "أَصْفَر", isGood: true, surahRef: "البقرة" },
      { id: "6", text: "بَنَفْسَجِي", isGood: false },
      { id: "7", text: "أَخْضَر", isGood: true, surahRef: "الرحمن" },
      { id: "8", text: "رَمَادِي", isGood: false },
    ],
    hint: "أبيض، أسود، أصفر، أخضر!",
  },
  {
    title: "اجمع حشرات ذُكرت في القرآن",
    targetDesc: "انقر على النجوم التي تحمل أسماء حشرات ذُكرت في كتاب الله وتأمل دقة الصنع!",
    items: [
      { id: "1", text: "النَّمْل", isGood: true, surahRef: "النمل" },
      { id: "2", text: "الدِّيك", isGood: false },
      { id: "3", text: "النَّحْل", isGood: true, surahRef: "النحل" },
      { id: "4", text: "الْخَرُوف", isGood: false },
      { id: "5", text: "الْعَنكَبُوت", isGood: true, surahRef: "العنكبوت" },
      { id: "6", text: "الْقِطّ", isGood: false },
      { id: "7", text: "الْبَعُوضَة", isGood: true, surahRef: "البقرة" },
      { id: "8", text: "الْحِمَار", isGood: false },
    ],
    hint: "النمل، النحل، العنكبوت، البعوضة!",
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

export default function CatchStarGame({ def: _def }: CatchStarGameProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [collected, setCollected] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(getCoins);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const handleCoins = () => setCoins(getCoins());
    window.addEventListener("mushaf:coins", handleCoins);
    return () => window.removeEventListener("mushaf:coins", handleCoins);
  }, []);

  const currentRound = STAR_ROUNDS[roundIdx % STAR_ROUNDS.length];
  const goodItems = useMemo(() => currentRound.items.filter((i) => i.isGood), [currentRound]);
  const requiredCount = goodItems.length;

  const handleStarClick = (item: StarItem) => {
    if (collected.includes(item.id) || roundDone || lives <= 0) return;

    if (item.isGood) {
      playSound("correct");
      const newCollected = [...collected, item.id];
      setCollected(newCollected);
      const newStreak = streak + 1;
      setStreak(newStreak);
      const bonus = newStreak >= 3 ? 2 : 1;
      setScore((s) => s + bonus);
      addCoins(bonus);

      if (newCollected.length === requiredCount) {
        playSound("win");
        setRoundDone(true);
      }
    } else {
      playSound("wrong");
      setStreak(0);
      setLives((l) => Math.max(0, l - 1));
    }
  };

  // المساعدة بتكلفة 1 نجمة: إبراز نجمة صحيحة غير ملتقطة + إظهار التلميح
  const useMueenHint = () => {
    if (roundDone || lives <= 0) return;

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

    const remainingGood = goodItems.find((i) => !collected.includes(i.id));
    if (remainingGood) {
      setHighlightedId(remainingGood.id);
      setTimeout(() => setHighlightedId(null), 3000);
      toast({
        title: "مساعدة المُعِين 💡 (-1 ⭐)",
        description: `أبرز لك المُعِين النجمة الصحيحة «${remainingGood.text}» بنجاح!`,
      });
    }
  };

  const nextRound = () => {
    setRoundIdx((r) => r + 1);
    setCollected([]);
    setRoundDone(false);
    setLives(3);
    setShowHint(false);
    setHighlightedId(null);
  };

  const isGameOver = lives <= 0;

  if (isGameOver) {
    return (
      <div className="space-y-4 text-center py-6 animate-fade-up max-w-xl mx-auto" dir="rtl">
        <p className="text-5xl animate-bounce">💫</p>
        <h3 className="text-xl font-black text-foreground">انتهت المحاولات يا بطل القرآن</h3>
        <p className="text-sm text-muted-foreground font-bold">جمعت {score} نجمة مباركة، حاول مرة أخرى وتفوق!</p>
        <button
          onClick={() => {
            setLives(3);
            setCollected([]);
            setRoundDone(false);
            setStreak(0);
            setShowHint(false);
            setHighlightedId(null);
          }}
          className="btn-gold mx-auto px-7 py-3 rounded-2xl font-black flex items-center gap-2 text-base shadow-xl hover:brightness-105 active:scale-95 transition-all"
        >
          <RefreshCw className="w-5 h-5" /> إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center animate-fade-up max-w-xl mx-auto" dir="rtl">
      {/* شريط الإحصائيات العلوي الملكي الموحد */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-3.5 py-2 bg-secondary/50 backdrop-blur-sm rounded-2xl border border-border/70 shadow-sm">
        <div className="flex items-center gap-1 text-rose-500">
          {Array.from({ length: 3 }, (_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 transition-all ${
                i < lives ? "fill-rose-500 text-rose-500 scale-110" : "text-muted-foreground opacity-25 scale-90"
              }`}
            />
          ))}
        </div>
        <span className="text-amber-500 font-black text-sm flex items-center gap-1 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 shadow-inner">
          <Star className="w-4 h-4 fill-amber-500" /> {formatCoins(coins)} نجمة
        </span>
        <span className="text-muted-foreground font-extrabold">
          الهدف: {collected.length} / {requiredCount}
        </span>
      </div>

      {/* بطاقة المهمة القرآنية الفاخرة */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card via-card/95 to-secondary/30 border-2 border-accent/25 shadow-xl space-y-1.5 text-right">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black text-accent uppercase tracking-wider">مهمة صيد النجوم:</p>
          <span className="text-[10px] font-bold text-muted-foreground">اختر النجوم المباركة وتجنب البقية</span>
        </div>
        <h3 className="font-black text-foreground text-base sm:text-lg">{currentRound.title}</h3>
        <p className="text-xs text-muted-foreground font-medium">{currentRound.targetDesc}</p>
      </div>

      {/* شارة السلسلة الماهرة */}
      {streak >= 3 && (
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 text-amber-500 border border-amber-500/30 px-3.5 py-1 rounded-full text-xs font-black animate-pulse shadow-sm">
          <Flame className="w-4 h-4 text-orange-500 fill-orange-500" /> صائد ماهر: {streak} نجوم متتالية!
        </div>
      )}

      {/* شبكة النجوم التفاعلية الفاخرة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {currentRound.items.map((item) => {
          const isCollected = collected.includes(item.id);
          const isHighlighted = highlightedId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleStarClick(item)}
              disabled={isCollected || roundDone}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 min-h-[90px] sm:min-h-[105px] transition-all duration-200 active:scale-95 cursor-pointer shadow-sm ${
                isCollected
                  ? "bg-gradient-to-br from-emerald-600/30 to-emerald-800/40 border-emerald-400 text-emerald-300 scale-95 opacity-85 shadow-emerald-500/20"
                  : isHighlighted
                  ? "bg-amber-500/30 border-amber-400 scale-105 animate-bounce shadow-lg shadow-amber-500/40 ring-4 ring-amber-400/40"
                  : "bg-secondary/80 hover:bg-secondary border-border hover:border-amber-500/50"
              }`}
            >
              <Star
                className={`w-6 h-6 transition-all ${
                  isCollected
                    ? "fill-emerald-400 text-emerald-400 scale-110"
                    : isHighlighted
                    ? "fill-amber-400 text-amber-300 scale-125 animate-pulse"
                    : "fill-amber-400 text-amber-500"
                }`}
              />
              <span className="font-black text-sm sm:text-base text-foreground leading-tight">{item.text}</span>
              {item.surahRef && isCollected && (
                <span className="text-[10px] text-emerald-400 font-bold">{item.surahRef}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* زر المُعِين القرآني الذكي للمساعدة بنجوم (-1 ⭐) */}
      <button
        onClick={useMueenHint}
        disabled={roundDone || lives <= 0}
        className="w-full p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 active:scale-98 transition-all flex items-center justify-between text-right cursor-pointer shadow-sm disabled:opacity-50"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Lightbulb className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-xs min-w-0">
            <span className="text-amber-500 font-black block">المُعِين القرآني الذكي:</span>
            <span className="text-muted-foreground font-semibold truncate block">
              {showHint ? currentRound.hint : "اضغط هنا ليكشف لك المُعِين نجمة صحيحة (تكلفة: 1 نجمة)"}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-black text-amber-500 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 shrink-0 flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 fill-amber-500" />
          <span>تلميح (-1 ⭐)</span>
        </span>
      </button>

      {/* بطاقة اكتمال المرحلة */}
      {roundDone && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-card via-card to-secondary/30 border-2 border-emerald-500/50 shadow-xl space-y-3 animate-fade-up text-right">
          <div className="flex items-center justify-center gap-2 font-black text-emerald-400 text-base sm:text-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />
            <span>ما شاء الله! جمعت كل النجوم المباركة! 🌟</span>
          </div>
          <button
            onClick={nextRound}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-base shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>المرحلة التالية</span>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

