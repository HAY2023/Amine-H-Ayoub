import { useState } from "react";
import { Lock, Delete } from "lucide-react";
import { getKidsPin, setKidsPin } from "../data/kidsLock";

/** لوحة رمز رقمية (٤ أرقام). mode="set" لتعيين الرمز، "verify" للتحقق. */
export default function PinModal({ mode, title, onSuccess, onCancel }: {
  mode: "set" | "verify";
  title?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  const press = (d: string) => {
    if (pin.length >= 4) return;
    const np = pin + d;
    setPin(np);
    setErr(false);
    if (np.length === 4) {
      window.setTimeout(() => {
        if (mode === "set") { setKidsPin(np); onSuccess(); }
        else if (np === getKidsPin()) { onSuccess(); }
        else { setErr(true); setPin(""); }
      }, 120);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4 animate-fade-in" dir="rtl">
      <div className="relative w-full max-w-xs glass-nour shadow-soft p-6 space-y-5 text-center overflow-hidden animate-scale-up">
        {/* وهج ذهبي زخرفي خلف البطاقة */}
        <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative mx-auto w-14 h-14 rounded-full bg-accent/15 text-accent flex items-center justify-center ring-1 ring-accent/30 animate-glow">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="relative font-extrabold text-lg text-gradient-gold">
          {title || (mode === "set" ? "اختر رمزاً من ٤ أرقام" : "أدخل رمز ولي الأمر")}
        </h3>

        <div className={`relative flex justify-center gap-3 ${err ? "animate-pulse" : ""}`}>
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                err ? "bg-destructive scale-110" : i < pin.length ? "bg-accent scale-110 shadow-[0_0_10px_hsl(var(--gold)/0.6)]" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {err && <p className="relative text-xs text-destructive font-medium">رمز خاطئ، حاول مجدداً</p>}

        <div className="relative grid grid-cols-3 gap-2.5">
          {keys.map((k, i) => k === "" ? <span key={i} /> : (
            <button
              key={i}
              onClick={() => (k === "back" ? setPin(p => p.slice(0, -1)) : press(k))}
              className="h-14 rounded-2xl bg-secondary border border-border text-secondary-foreground text-xl font-bold flex items-center justify-center transition-all active:scale-95 hover:border-accent/50 hover:text-accent"
            >
              {k === "back" ? <Delete className="w-5 h-5" /> : k}
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="relative w-full p-2.5 rounded-2xl bg-secondary border border-border text-muted-foreground font-bold transition-all hover:brightness-95"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
