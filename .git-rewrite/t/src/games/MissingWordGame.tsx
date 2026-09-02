import React, { useState, useEffect } from 'react';
import { ArrowRight, Trophy, Sparkles, AlertCircle } from 'lucide-react';
import { addCoins } from '../data/kidsProfile';
import { toast } from '../hooks/use-toast';
import { ensureCorpus, SurahText, normalizeArabic } from '../data/quranText';
import { GameDef } from '../data/gameCatalog';
import { createPortal } from 'react-dom';

interface MissingWordGameProps {
  def: GameDef;
  minSurah?: number;
  onBack: () => void;
}

interface Question {
  surahName: string;
  ayahText: string;
  missingWord: string;
  options: string[];
}

export default function MissingWordGame({ def, minSurah, onBack }: MissingWordGameProps) {
  const [corpus, setCorpus] = useState<SurahText[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const REQUIRED_SCORE = 5;

  useEffect(() => {
    loadCorpus();
  }, []);

  const loadCorpus = async () => {
    const data = await ensureCorpus();
    setCorpus(data);
    generateQuestions(data);
    setLoading(false);
  };

  const generateQuestions = (data: SurahText[]) => {
    const minS = def.params?.minSurah || 114;
    const maxS = def.params?.maxSurah || 1;
    
    // Filter surahs based on age/params
    let allowedSurahs = data.filter(s => s.app <= minS && s.app >= maxS);
    if (allowedSurahs.length === 0) allowedSurahs = [...data];

    // تجميع كل الآيات الصالحة للاختبار من جميع السور المتاحة
    interface AyahCandidate {
      surahName: string;
      ayahText: string;
      ayahNum: number;
    }

    const allCandidates: AyahCandidate[] = [];
    for (const s of allowedSurahs) {
      if (!s.ayahs) continue;
      for (const a of s.ayahs) {
        const rawWords = a.text.trim().split(/\s+/);
        if (rawWords.length >= 3) {
          allCandidates.push({ surahName: s.name, ayahText: a.text.trim(), ayahNum: a.n });
        }
      }
    }

    // خلط كل الآيات عشوائياً لضمان تنوع تام وعدم تكرار نفس الآية
    const shuffledCandidates = [...allCandidates].sort(() => 0.5 - Math.random());
    const selectedAyahs = shuffledCandidates.slice(0, 15);

    // جمع بنك كلمات من المصحف كخيارات مشتتة ذكية
    const allWordsBank: string[] = [];
    for (const s of data) {
      for (const a of s.ayahs || []) {
        for (const w of a.text.split(/\s+/)) {
          const clean = w.trim();
          if (clean.length >= 3) allWordsBank.push(clean);
        }
      }
    }

    const generated: Question[] = [];

    for (const candidate of selectedAyahs) {
      const words = candidate.ayahText.split(/\s+/);
      // اختيار كلمة مناسبة (ليست قصيرة جداً)
      const validIndices = words
        .map((w, idx) => ({ w, idx }))
        .filter(item => item.w.length >= 3);

      if (validIndices.length === 0) continue;

      const chosen = validIndices[Math.floor(Math.random() * validIndices.length)];
      const missingWord = chosen.w;

      // تكوين الآية مع وضع الفراغ بدقة في مكان الكلمة المحددة
      const wordsWithBlank = [...words];
      wordsWithBlank[chosen.idx] = " (........) ";
      const formattedAyahText = wordsWithBlank.join(" ");

      // إنشاء الخيارات المشتتة
      const options = new Set<string>();
      options.add(missingWord);

      let attempts = 0;
      while (options.size < 4 && attempts < 100) {
        const randWord = allWordsBank[Math.floor(Math.random() * allWordsBank.length)];
        if (randWord && normalizeArabic(randWord) !== normalizeArabic(missingWord)) {
          options.add(randWord);
        }
        attempts++;
      }

      const optionsArray = Array.from(options).sort(() => 0.5 - Math.random());

      generated.push({
        surahName: candidate.surahName,
        ayahText: formattedAyahText,
        missingWord,
        options: optionsArray
      });
    }

    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setWon(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return; // Already answered this one
    
    setSelectedAnswer(option);
    const correct = option === questions[currentIndex].missingWord;
    setIsCorrect(correct);
    
    if (correct) {
      const newScore = score + 1;
      setScore(newScore);
      if (newScore >= REQUIRED_SCORE) {
        setTimeout(() => handleWin(), 1000);
      } else {
        setTimeout(() => nextQuestion(), 1000);
      }
    } else {
      setTimeout(() => nextQuestion(), 1500);
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setIsCorrect(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Re-generate if we run out of questions
      generateQuestions(corpus);
    }
  };

  const handleWin = () => {
    setWon(true);
    addCoins(20); // مكافأة عالية لأنها لعبة صعبة
    toast({
      title: "🎉 بطل متميز!",
      description: "حصلت على 20 نجمة لتركيزك العالي!",
    });
  };

  if (loading || questions.length === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <Sparkles className="w-10 h-10 animate-spin text-accent" />
      </div>,
      document.body
    );
  }

  const currentQ = questions[currentIndex];

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4 font-quran text-right" dir="rtl">
      <div className="w-full max-w-2xl bg-card rounded-3xl shadow-2xl overflow-hidden border border-border flex flex-col h-[80vh] sm:h-auto">
        {/* Header */}
        <div className="bg-accent/10 p-4 flex items-center justify-between border-b border-border shrink-0">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> {def.title}
          </h2>
          <div className="flex items-center gap-4">
            <span className="bg-accent/20 text-accent px-4 py-1.5 rounded-full font-bold text-sm">
              النتيجة: {score} / {REQUIRED_SCORE}
            </span>
            <button 
              onClick={onBack}
              className="p-2 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Game Area */}
        <div className="p-6 flex-1 flex flex-col justify-center overflow-y-auto">
          {won ? (
            <div className="text-center py-12 space-y-6">
              <Trophy className="w-24 h-24 text-accent mx-auto animate-bounce" />
              <h3 className="text-3xl font-extrabold text-foreground">أحسنت بطل القرآن!</h3>
              <p className="text-muted-foreground text-lg">لقد أكملت الآيات بنجاح 👏</p>
              <button 
                onClick={() => generateQuestions(corpus)}
                className="mt-6 px-8 py-3 bg-accent text-accent-foreground font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-accent/90 transition-all active:scale-95"
              >
                العب مرة أخرى (20 نجمة)
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-lg mx-auto">
              <div className="text-center space-y-2">
                <span className="text-sm font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                  {currentQ.surahName}
                </span>
                <p className="text-2xl sm:text-3xl font-quran leading-loose text-foreground mt-4 select-none">
                  {currentQ.ayahText}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {currentQ.options.map((opt, i) => {
                  let stateClass = "bg-card text-foreground hover:bg-accent/10 hover:border-accent border-border shadow-md";
                  if (selectedAnswer === opt) {
                    stateClass = isCorrect 
                      ? "bg-success/20 border-success text-success scale-105 shadow-lg" 
                      : "bg-destructive/20 border-destructive text-destructive scale-95 shadow-lg";
                  } else if (selectedAnswer !== null && opt === currentQ.missingWord) {
                    // Show correct answer if they got it wrong
                    stateClass = "bg-success/20 border-success text-success opacity-80 shadow-md";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={selectedAnswer !== null}
                      className={`p-6 sm:p-8 rounded-2xl text-2xl sm:text-3xl font-quran font-bold border-2 transition-all duration-300 min-h-[80px] sm:min-h-[100px] flex items-center justify-center ${stateClass}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              
              {selectedAnswer !== null && (
                <div className={`text-lg font-bold animate-in fade-in zoom-in duration-300 ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                  {isCorrect ? "إجابة صحيحة! 👏" : "حاول بتركيز في المرة القادمة!"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
