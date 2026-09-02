import { useCallback, useEffect, useRef, useState } from "react";
import { Gift, PartyPopper } from "lucide-react";
import { addCoins, getActiveId } from "../data/kidsProfile";
import { toast } from "../hooks/use-toast";

/** مكافأة صندوق الكنز اليومي (بالنجوم). */
export const TREASURE_REWARD = 25;

type TreasureState = "ready" | "shaking" | "opening" | "done";

interface ConfettiPiece {
  id: number;
  left: number;   // نسبة أفقية %
  delay: number;  // ثوانٍ
  dur: number;    // ثوانٍ
  dx: number;     // انحراف أفقي px
  color: string;
}

const CONFETTI_COLORS = [
  "hsl(var(--gold))",
  "hsl(var(--gold-light))",
  "hsl(var(--emerald-light))",
  "#f472b6",
  "#38bdf8",
  "#a78bfa",
];

const todayStr = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/** مفتاح «فُتح اليوم» — مرة واحدة يومياً لكل ملف نشِط. */
const treasureKey = () => `mushaf:treasure:last:${todayStr()}:${getActiveId() || "none"}`;

const isOpenedToday = (): boolean => {
  try { return localStorage.getItem(treasureKey()) === "1"; } catch { return false; }
};

const markOpenedToday = () => {
  try { localStorage.setItem(treasureKey(), "1"); } catch { /* ignore */ }
};

const makeConfetti = (): ConfettiPiece[] =>
  Array.from({ length: 26 }, (_, i) => ({
    id: i,
    left: 6 + Math.random() * 88,
    delay: Math.random() * 0.45,
    dur: 1.3 + Math.random() * 0.9,
    dx: (Math.random() - 0.5) * 90,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

/**
 * صندوق الكنز اليومي في متجر الأطفال:
 * يظهر جاهزاً للفتح مرة واحدة يومياً، ويمنح +٢٥ نجمة عبر addCoins
 * (الذي يطلق حدث mushaf:coins فيتحدّث عدّاد النجوم تلقائياً).
 */
export default function TreasureBox() {
  const [state, setState] = useState<TreasureState>(() => (isOpenedToday() ? "done" : "ready"));
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);

  const open = useCallback(() => {
    setState(prev => {
      if (prev !== "ready") return prev;
      // اهتزاز قصير ثم الفتح مع المكافأة والقصاصات
      timers.current.push(window.setTimeout(() => {
        markOpenedToday();
        addCoins(TREASURE_REWARD);
        setConfetti(makeConfetti());
        setState("opening");
        toast({ title: "🎁 فتحت صندوق الكنز!", description: `حصلت على ${TREASURE_REWARD} نجمة` });
        timers.current.push(window.setTimeout(() => setState("done"), 1800));
      }, 550));
      return "shaking";
    });
  }, []);

  const opened = state === "opening" || state === "done";

  return (
    <section className="relative overflow-hidden glass-nour px-4 py-5 text-center animate-scale-up" aria-live="polite">
      {/* طبقة القصاصات */}
      {confetti.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {confetti.map(p => (
            <span
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                background: p.color,
                "--delay": `${p.delay}s`,
                "--dur": `${p.dur}s`,
                "--dx": `${p.dx}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      <div className={`mx-auto flex w-fit items-center justify-center rounded-3xl bg-accent/15 p-4 ${state === "ready" ? "animate-glow" : ""} ${state === "shaking" ? "animate-shake" : ""} ${state === "opening" ? "animate-treasure-pop" : ""}`}>
        {opened ? (
          <PartyPopper className="h-12 w-12 text-accent" aria-hidden />
        ) : (
          <Gift className="h-12 w-12 text-accent" aria-hidden />
        )}
      </div>

      <h2 className="mt-3 font-extrabold text-lg text-gradient-gold">{opened ? "ممتاز! صندوق اليوم انفتح" : "صندوق الكنز اليومي"}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {opened ? "عد غداً لصندوق جديد ومكافأة أخرى." : "لك كل يوم هدية صغيرة… اضغط لتفتح صندوقك وتكسب نجماً!"}
      </p>

      {!opened && (
        <button onClick={open} disabled={state !== "ready"} className="btn-gold mt-4 h-11 px-8 text-base">
          افتح الصندوق 🎁
        </button>
      )}
      {opened && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 font-extrabold text-sm text-success animate-pop">
          +{TREASURE_REWARD} ⭐
        </div>
      )}
    </section>
  );
}