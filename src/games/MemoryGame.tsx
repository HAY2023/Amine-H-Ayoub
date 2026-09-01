import React, { useState, useEffect } from 'react';
import { ArrowRight, Trophy, Sparkles } from 'lucide-react';
import { addCoins } from '../data/kidsProfile';
import { toast } from '../hooks/use-toast';

interface CardData {
  id: number;
  type: 'surah' | 'meaning';
  text: string;
}

const pairs: CardData[] = [
  { id: 1, type: 'surah', text: 'سورة الفيل' }, { id: 1, type: 'meaning', text: '🐘 جيش أبرهة' },
  { id: 2, type: 'surah', text: 'سورة الناس' }, { id: 2, type: 'meaning', text: '🛡️ الاستعاذة' },
  { id: 3, type: 'surah', text: 'سورة الشمس' }, { id: 3, type: 'meaning', text: '☀️ وضحاها' },
  { id: 4, type: 'surah', text: 'سورة التين' }, { id: 4, type: 'meaning', text: '🌳 والزيتون' },
  { id: 5, type: 'surah', text: 'سورة الفلق' }, { id: 5, type: 'meaning', text: '🌅 من شر ما خلق' },
  { id: 6, type: 'surah', text: 'سورة قريش' }, { id: 6, type: 'meaning', text: '🐪 الشتاء والصيف' },
];

interface MemoryGameProps {
  onBack: () => void;
}

export default function MemoryGame({ onBack }: MemoryGameProps) {
  const [cards, setCards] = useState<(CardData & { isFlipped: boolean, isMatched: boolean })[]>([]);
  const [firstCardIndex, setFirstCardIndex] = useState<number | null>(null);
  const [lockBoard, setLockBoard] = useState(false);
  const [matches, setMatches] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const shuffled = [...pairs]
      .sort(() => 0.5 - Math.random())
      .map(c => ({ ...c, isFlipped: false, isMatched: false }));
    setCards(shuffled);
    setFirstCardIndex(null);
    setLockBoard(false);
    setMatches(0);
    setWon(false);
  };

  const handleCardClick = (index: number) => {
    if (lockBoard) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    if (firstCardIndex === index) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    if (firstCardIndex === null) {
      setFirstCardIndex(index);
      return;
    }

    setLockBoard(true);
    checkForMatch(index);
  };

  const checkForMatch = (secondCardIndex: number) => {
    const firstCard = cards[firstCardIndex!];
    const secondCard = cards[secondCardIndex];

    if (firstCard.id === secondCard.id && firstCard.type !== secondCard.type) {
      // Match found
      setTimeout(() => {
        const newCards = [...cards];
        newCards[firstCardIndex!].isMatched = true;
        newCards[secondCardIndex].isMatched = true;
        setCards(newCards);
        setFirstCardIndex(null);
        setLockBoard(false);
        const newMatches = matches + 1;
        setMatches(newMatches);

        if (newMatches === pairs.length / 2) {
          handleWin();
        }
      }, 500);
    } else {
      // No match
      setTimeout(() => {
        const newCards = [...cards];
        newCards[firstCardIndex!].isFlipped = false;
        newCards[secondCardIndex].isFlipped = false;
        setCards(newCards);
        setFirstCardIndex(null);
        setLockBoard(false);
      }, 1000);
    }
  };

  const handleWin = () => {
    setWon(true);
    addCoins(10); // مكافأة الفوز
    toast({
      title: "🎉 رائع! طابقت كل السور",
      description: "حصلت على 10 نجوم!",
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card rounded-3xl shadow-2xl overflow-hidden border border-border">
        {/* Header */}
        <div className="bg-accent/10 p-4 flex items-center justify-between border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> لعبة الذاكرة: السورة ومعناها
          </h2>
          <button 
            onClick={onBack}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Game Area */}
        <div className="p-6">
          {won ? (
            <div className="text-center py-12 space-y-6">
              <Trophy className="w-24 h-24 text-accent mx-auto animate-bounce" />
              <h3 className="text-3xl font-extrabold text-foreground">أحسنت بطل القرآن!</h3>
              <p className="text-muted-foreground text-lg">لقد طابقت كل السور بمعانيها بنجاح 👏</p>
              <button 
                onClick={initGame}
                className="mt-6 px-8 py-3 bg-accent text-accent-foreground font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-accent/90 transition-all active:scale-95"
              >
                العب مرة أخرى
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                {cards.map((card, index) => (
                  <button
                    key={index}
                    onClick={() => handleCardClick(index)}
                    className={`h-24 sm:h-32 rounded-xl text-lg sm:text-xl font-bold transition-all duration-300 transform perspective-1000 ${
                      card.isFlipped || card.isMatched 
                        ? 'bg-card border-2 border-accent text-foreground rotate-y-180' 
                        : 'bg-accent text-transparent hover:bg-accent/90 shadow-md'
                    } ${card.isMatched ? 'bg-success/20 border-success text-success scale-95 opacity-80' : ''}`}
                  >
                    <div className={`w-full h-full flex items-center justify-center p-2 text-center transition-opacity duration-300 ${card.isFlipped || card.isMatched ? 'opacity-100' : 'opacity-0'}`}>
                      {card.text}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-between items-center text-sm font-bold text-muted-foreground">
                <span>المطابقات: {matches} / {pairs.length / 2}</span>
                <button onClick={initGame} className="text-accent hover:underline">إعادة الترتيب</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
