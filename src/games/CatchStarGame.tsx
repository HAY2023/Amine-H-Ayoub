import { useState } from "react";
import { Star, RefreshCw, CheckCircle2, Flame, Heart } from "lucide-react";
import { addCoins } from "../data/kidsProfile";
import { GameDef } from "../data/gameCatalog";

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
    hint: "ابحث عن الصبر، الصدق، التقوى والإحسان!",
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
    hint: "الفردوس، جنات عدن، ودار السلام!",
  },
];

export default function CatchStarGame({ def: _def }: CatchStarGameProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [collected, setCollected] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [roundDone, setRoundDone] = useState(false);

  const currentRound = STAR_ROUNDS[roundIdx % STAR_ROUNDS.length];
  const requiredCount = currentRound.items.filter((i) => i.isGood).length;

  const handleStarClick = (item: StarItem) => {
    if (collected.includes(item.id) || roundDone || lives <= 0) return;

    if (item.isGood) {
      // Good star!
      const newCollected = [...collected, item.id];
      setCollected(newCollected);
      const newStreak = streak + 1;
      setStreak(newStreak);
      const bonus = newStreak >= 3 ? 2 : 1;
      setScore((s) => s + bonus);
      addCoins(bonus);

      if (newCollected.length === requiredCount) {
        setRoundDone(true);
      }
    } else {
      // Wrong distractor star
      setStreak(0);
      setLives((l) => Math.max(0, l - 1));
    }
  };

  const nextRound = () => {
    setRoundIdx((r) => r + 1);
    setCollected([]);
    setRoundDone(false);
    setLives(3);
  };

  const isGameOver = lives <= 0;

  if (isGameOver) {
    return (
      <div className="space-y-4 text-center py-6 animate-fade-up">
        <p className="text-4xl">💫</p>
        <h3 className="text-lg font-bold text-foreground">انتهت المحاولات يا بطل</h3>
        <p className="text-xs text-muted-foreground">جمعت {score} نجمة مباركة، حاول مرة أخرى!</p>
        <button
          onClick={() => {
            setLives(3);
            setCollected([]);
            setRoundDone(false);
            setStreak(0);
          }}
          className="btn-gold mx-auto px-6 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center animate-fade-up">
      {/* HUD Header */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
        <div className="flex items-center gap-1 text-rose-400">
          {Array.from({ length: 3 }, (_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 ${i < lives ? "fill-rose-500 text-rose-500" : "text-muted-foreground opacity-30"}`}
            />
          ))}
        </div>
        <span className="text-amber-500 font-extrabold text-sm">⭐ {score} نجمة</span>
        <span>
          الهدف: {collected.length} / {requiredCount}
        </span>
      </div>

      {/* Mission Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-teal-500/15 to-amber-500/15 border border-amber-500/30 space-y-1">
        <h3 className="font-extrabold text-foreground text-sm sm:text-base">{currentRound.title}</h3>
        <p className="text-xs text-muted-foreground">{currentRound.targetDesc}</p>
      </div>

      {/* Streak Notification */}
      {streak >= 3 && (
        <div className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-500 border border-amber-500/30 px-3 py-0.5 rounded-full text-xs font-extrabold animate-pulse">
          <Flame className="w-3.5 h-3.5 text-orange-500" /> صائد ماهر: {streak} نجوم متتالية!
        </div>
      )}

      {/* Floating Star Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {currentRound.items.map((item) => {
          const isCollected = collected.includes(item.id);

          return (
            <button
              key={item.id}
              onClick={() => handleStarClick(item)}
              disabled={isCollected || roundDone}
              className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center justify-center gap-1.5 min-h-[85px] sm:min-h-[95px] transition-all active:scale-95 ${
                isCollected
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 scale-95 opacity-80"
                  : "bg-card hover:bg-amber-500/10 border-border hover:border-amber-500/50 shadow-sm"
              }`}
            >
              <Star
                className={`w-6 h-6 transition-all ${
                  isCollected
                    ? "fill-emerald-400 text-emerald-400 scale-110 animate-bounce"
                    : "fill-amber-400 text-amber-500"
                }`}
              />
              <span className="font-black text-sm sm:text-base text-foreground">{item.text}</span>
              {item.surahRef && isCollected && (
                <span className="text-[10px] text-emerald-400 font-bold">{item.surahRef}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Al-Mu'een Cheer & Hint */}
      <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-between text-right text-xs">
        <div className="flex items-center gap-2">
          <span className="text-xl">💡</span>
          <div>
            <b className="text-teal-400 block font-bold">المُعِين القرآني:</b>
            <span className="text-muted-foreground">{currentRound.hint}</span>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {roundDone && (
        <div className="p-4 rounded-xl bg-card border border-emerald-500/40 space-y-2 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-center gap-2 font-black text-emerald-400 text-base">
            <CheckCircle2 className="w-5 h-5" /> ما شاء الله! جمعت كل النجوم المباركة! 🌟
          </div>
          <button
            onClick={nextRound}
            className="btn-gold mx-auto px-6 py-2 rounded-xl font-bold text-sm shadow-md mt-1"
          >
            المرحلة التالية ←
          </button>
        </div>
      )}
    </div>
  );
}
