import { useRef, useState } from "react";
import { BookOpen, Headphones, Hammer, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isMushafDevEnabled, setMushafDev } from "../utils/tauriUtils";
import { toast } from "../hooks/use-toast";

/**
 * رسالة تطوير: المصحف التفاعلي قيد التطوير ولم يُطلق بعد، فيُخفى عن المستخدمين
 * (ويب وتطبيق) وحالياً يعمل السماع فقط. تدعو المستخدم للانتقال إلى قسم التلاوات.
 *
 * وضع المالك: النقر ٥ مرّات على الأيقونة يفتح/يغلق إتاحة المصحف وأدوات المحتوى
 * لصاحب التطبيق ليُكمل العمل (يظهر عندها زرّ «افتح المصحف»). مخفيّ عن المستخدم.
 */
export default function MushafComingSoon({ onGoListen }: { onGoListen?: () => void }) {
  const navigate = useNavigate();
  const [dev, setDev] = useState(isMushafDevEnabled);
  const tapsRef = useRef(0);
  const goListen = () => (onGoListen ? onGoListen() : navigate("/audio"));

  const secretTap = () => {
    tapsRef.current += 1;
    if (tapsRef.current >= 5) {
      tapsRef.current = 0;
      const next = !isMushafDevEnabled();
      setMushafDev(next);
      setDev(next);
      toast({
        title: next ? "وضع المالك مُفعّل" : "وضع المالك مُعطّل",
        description: next ? "المصحف وأدوات المحتوى متاحة الآن" : "عادت رسالة التطوير للمستخدمين",
      });
    }
  };

  return (
    <div className="min-h-screen page-nour text-foreground flex items-center justify-center px-4 pt-10 pb-28" dir="rtl">
      <div className="relative w-full max-w-md card-nour p-7 text-center space-y-5 overflow-hidden animate-scale-up">
        {/* وهج ذهبي زخرفي */}
        <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full bg-accent/15 blur-3xl" />

        {/* الأيقونة — النقر ٥ مرّات يبدّل وضع المطوّر */}
        <button
          type="button"
          onClick={secretTap}
          aria-label="المصحف قيد التطوير"
          className="relative mx-auto w-20 h-20 rounded-3xl bg-accent/15 text-accent flex items-center justify-center ring-1 ring-accent/30 animate-glow active:scale-95"
        >
          <BookOpen className="w-10 h-10" />
          <span className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-soft ring-2 ring-background">
            <Hammer className="w-4 h-4" />
          </span>
        </button>

        <h1 className="relative font-extrabold text-2xl text-gradient-gold leading-tight">
          المصحف قيد التطوير
        </h1>

        <p className="relative text-muted-foreground leading-relaxed">
          نعتذر — ميزة المصحف قيد التطوير ولم تُطلق بعد، وستصل قريباً بإذن الله.
          <br />
          حالياً يعمل <b className="text-foreground">السماع فقط</b> — استمع للتلاوات العطرة وتمتّع بها.
        </p>

        <button
          onClick={goListen}
          className="relative btn-emerald w-full p-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95"
        >
          <Headphones className="w-5 h-5" /> اذهب إلى التلاوات (السماع)
        </button>

        {/* وضع المطوّر: زرّ فتح المصحف لإكمال العمل */}
        {dev && (
          <button
            onClick={() => navigate("/")}
            className="relative w-full p-3 rounded-2xl bg-secondary border border-accent/40 text-foreground font-bold flex items-center justify-center gap-2 active:scale-95"
          >
            <Wrench className="w-5 h-5 text-accent" /> افتح المصحف (وضع المالك)
          </button>
        )}
      </div>
    </div>
  );
}
