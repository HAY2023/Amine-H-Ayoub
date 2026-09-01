import React, { useState, useEffect } from 'react';
import { ArrowRight, Trophy, Sparkles, AlertCircle } from 'lucide-react';
import { addCoins } from '../data/kidsProfile';
import { toast } from '../hooks/use-toast';
import { ensureCorpus, SurahText, normalizeArabic } from '../data/quranText';
import { GameDef } from '../data/gameCatalog';
import { createPortal } from 'react-dom';

interface MissingWordGameProps {
  def: GameDef;
  onBack: () => void;
}

interface Question {
  surahName: string;
  ayahText: string;
  missingWord: string;
  options: string[];
}

export default function MissingWordGame({ def, onBack }: MissingWordGameProps) {
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
    const allowedSurahs = data.filter(s => s.app <= minS && s.app >= maxS);
    if (allowedSurahs.length === 0) allowedSurahs.push(data[0]);

    const generated: Question[] = [];
    
    // Generate 10 questions to have enough pool
    for (let i = 0; i < 10; i++) {
      const s = allowedSurahs[Math.floor(Math.random() * allowedSurahs.length)];
      if (!s.ayahs || s.ayahs.length === 0) continue;
      
      const a = s.ayahs[Math.floor(Math.random() * s.ayahs.length)];
      const words = a.text.split(" ").filter(w => w.trim().length > 2); // Exclude very short words
      
      if (words.length < 2) continue; // Ayah too short

      // Pick a random word to hide
      const hiddenIndex = Math.floor(Math.random() * words.length);
      const missingWord = words[hiddenIndex];
      
      // Generate distractors
      const options = new Set<string>();
      options.add(missingWord);
      
      // Add random words from the same surah or corpus
      let attempts = 0;
      while (options.size < 4 && attempts < 50) {
        const rs = allowedSurahs[Math.floor(Math.random() * allowedSurahs.length)];
        const ra = rs.ayahs[Math.floor(Math.random() * rs.ayahs.length)];
        const rw = ra.text.split(" ").filter(w => w.trim().length > 2);
        if (rw.length > 0) {
          const randWord = rw[Math.floor(Math.random() * rw.length)];
          // Only add if it's visually different to avoid confusion with same words different diacritics
          if (normalizeArabic(randWord) !== normalizeArabic(missingWord)) {
            options.add(randWord);
          }
        }
        attempts++;
      }
      
      const optionsArray = Array.from(options).sort(() => Math.random() - 0.5);
      
      generated.push({
        surahName: s.name,
        ayahText: a.text.replace(missingWord, " (........) "),
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {currentQ.options.map((opt, i) => {
                  let stateClass = "bg-secondary text-foreground hover:bg-secondary/80 border-transparent";
                  if (selectedAnswer === opt) {
                    stateClass = isCorrect 
                      ? "bg-success/20 border-success text-success scale-105" 
                      : "bg-destructive/20 border-destructive text-destructive scale-95";
                  } else if (selectedAnswer !== null && opt === currentQ.missingWord) {
                    // Show correct answer if they got it wrong
                    stateClass = "bg-success/20 border-success text-success opacity-70";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={selectedAnswer !== null}
                      className={`p-4 rounded-2xl text-xl font-quran font-bold border-2 transition-all duration-300 ${stateClass}`}
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
