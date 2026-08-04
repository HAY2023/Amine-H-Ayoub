import { useState, useEffect } from "react";
import { Calculator, X } from "lucide-react";

export default function MathChallengeModal({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    setNum1(Math.floor(Math.random() * 10) + 5); // 5 to 14
    setNum2(Math.floor(Math.random() * 10) + 5); // 5 to 14
  }, []);

  const handleSubmit = () => {
    if (parseInt(answer) === num1 * num2) {
      onSuccess();
    } else {
      setErr(true);
      setAnswer("");
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in" dir="rtl">
      <div className="relative w-full max-w-xs glass-nour shadow-soft p-6 space-y-5 text-center overflow-hidden animate-scale-up border border-border">
        
        <div className="relative mx-auto w-14 h-14 rounded-full bg-accent/15 text-accent flex items-center justify-center ring-1 ring-accent/30 animate-glow mb-2">
          <Calculator className="w-7 h-7" />
        </div>

        <h3 className="font-extrabold text-lg text-gradient-gold">
          للخروج، أجب عن السؤال:
        </h3>
        
        <div className="text-3xl font-bold font-mono py-2 text-foreground" dir="ltr">
          {num1} × {num2} = <span className="text-accent border-b-4 border-dashed border-accent px-2">{answer || "?"}</span>
        </div>

        {err && <p className="text-sm text-destructive font-medium animate-bounce">إجابة خاطئة، حاول مجدداً</p>}

        <div className="grid grid-cols-3 gap-2.5">
          {keys.map((k, i) => k === "" ? <span key={i} /> : (
            <button
              key={i}
              onClick={() => {
                setErr(false);
                if (k === "back") setAnswer(p => p.slice(0, -1));
                else if (answer.length < 3) setAnswer(p => p + k);
              }}
              className="h-14 rounded-2xl bg-secondary text-secondary-foreground text-xl font-bold flex items-center justify-center transition-all active:scale-95"
            >
              {k === "back" ? "⌫" : k}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 p-3 rounded-2xl bg-secondary text-muted-foreground font-bold hover:brightness-95">
            إلغاء
          </button>
          <button onClick={handleSubmit} disabled={!answer} className="flex-1 p-3 rounded-2xl bg-accent text-accent-foreground font-bold hover:brightness-95 disabled:opacity-50">
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}
