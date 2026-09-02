import { X } from "lucide-react";

interface Props {
  surahName: string;
  surahNumber: number;
  audioSrc: string;
  onClose: () => void;
}

const StickyPlayer = ({ surahName, surahNumber, audioSrc, onClose }: Props) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-accent shadow-2xl">
      {/* Info bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-3">
          {/* Wave animation */}
          <div className="flex items-center gap-[3px] h-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-[3px] bg-accent rounded-full animate-wave"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <div className="text-right">
            <p className="font-bold text-foreground font-amiri text-lg">
              سورة {surahName}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Audio player */}
      <div className="px-4 pb-3">
        <audio
          src={audioSrc}
          controls
          autoPlay
          className="w-full rounded-lg"
        />
      </div>
    </div>
  );
};

export default StickyPlayer;
