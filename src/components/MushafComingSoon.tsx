import { BookOpen, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MushafComingSoon({ onGoListen }: { onGoListen?: () => void }) {
  const navigate = useNavigate();
  const goListen = () => (onGoListen ? onGoListen() : navigate("/audio"));

  return (
    <div className="min-h-screen page-nour text-foreground flex items-center justify-center px-4 pt-10 pb-28" dir="rtl">
      <div className="relative w-full max-w-md card-nour p-7 text-center space-y-5 overflow-hidden animate-scale-up">
        {/* وهج ذهبي زخرفي */}
        <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-accent/15 text-accent flex items-center justify-center ring-1 ring-accent/30 animate-glow">
          <BookOpen className="w-10 h-10" />
        </div>

        <h1 className="relative font-extrabold text-2xl text-gradient-gold leading-tight">
          المصحف قيد التطوير
        </h1>

        <p className="relative text-muted-foreground leading-relaxed">
          ميزة المصحف قيد التطوير حالياً وستكون متاحة قريباً بإذن الله.
          <br />
          يمكنك الاستمتاع بالاستماع لجميع التلاوات العطرة عبر قسم التلاوات.
        </p>

        <button
          onClick={goListen}
          className="relative btn-emerald w-full p-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95"
        >
          <Headphones className="w-5 h-5" /> اذهب إلى التلاوات (السماع)
        </button>
      </div>
    </div>
  );
}
