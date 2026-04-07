import { useEffect } from "react";
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
      <DialogContent className="text-center max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gold">🎉 تهانينا!</DialogTitle>
          <DialogDescription className="text-lg text-foreground mt-2">
            لقد أتممت الاستماع لسورة{" "}
            <span className="font-bold text-primary">{surah?.name}</span> بالكامل!
          </DialogDescription>
        </DialogHeader>
        <div className="text-5xl my-4">🏆</div>
        <p className="text-muted-foreground">+10 نقاط لكل آية</p>
      </DialogContent>
    </Dialog>
  );
};

export default CongratsDialog;
