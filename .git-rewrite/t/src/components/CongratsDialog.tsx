import { useEffect } from "react";
import { Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { surahs } from "@/data/surahs";

interface Props {
  surahNumber: number | null;
  open: boolean;
  onClose: () => void;
}

const CongratsDialog = ({ surahNumber, open, onClose }: Props) => {
  const surah = surahs.find((s) => s.number === surahNumber);

  useEffect(() => {
    if (open) {
      const t = setTimeout(onClose, 5000);
      return () => clearTimeout(t);
    }
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="card-nour text-center max-w-sm overflow-hidden border-accent/30 shadow-gold animate-scale-up"
        dir="rtl"
      >
        {/* وهج ذهبي زخرفي خلف المحتوى */}
        <div
          className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-40 w-40 rounded-full bg-accent/25 blur-3xl"
          aria-hidden="true"
        />

        <DialogHeader className="relative">
          {/* وسام الإنجاز الذهبي */}
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shadow-gold animate-glow">
            <Trophy className="h-12 w-12 text-accent-foreground animate-float" />
          </div>

          <DialogTitle className="text-3xl text-gradient-gold flex items-center justify-center gap-2">
            تهانينا!
          </DialogTitle>

          <DialogDescription className="text-lg text-foreground mt-3 leading-relaxed">
            لقد أتممت الاستماع لسورة{" "}
            <span className="font-bold text-accent">{surah?.name}</span> بالكامل!
          </DialogDescription>
        </DialogHeader>

        {/* فاصل ذهبي رقيق */}
        <div className="relative mx-auto my-5 flex items-center justify-center gap-2" aria-hidden="true">
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-accent/60" />
          <span className="h-1.5 w-1.5 rotate-45 bg-accent/70" />
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-accent/60" />
        </div>

        {/* رقاقة النقاط */}
        <div className="relative mx-auto inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-4 py-2 text-sm font-medium text-accent shadow-soft">
          +10 نقاط لكل آية
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CongratsDialog;
