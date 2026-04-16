import { X, Music } from "lucide-react";

interface Props {
  surahName: string;
  surahNumber: number;
  driveId: string;
  onClose: () => void;
}

const CustomPlayer = ({ surahName, surahNumber, driveId, onClose }: Props) => {
  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-50 px-3 pb-2">
      <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Custom UI header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Surah number badge */}
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent font-bold text-sm">{surahNumber}</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground font-amiri text-lg leading-tight">
                سورة {surahName}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Music className="w-3 h-3 text-accent" />
                <span className="text-xs text-muted-foreground">جاري التشغيل</span>
              </div>
            </div>
          </div>

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
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hidden iframe - Google Drive player */}
        <div className="relative overflow-hidden" style={{ height: "48px", marginTop: "-4px" }}>
          <div style={{ marginTop: "-40px", marginBottom: "-20px", opacity: 0.01, pointerEvents: "auto" }}>
            <iframe
              src={`https://drive.google.com/file/d/${driveId}/preview?autoplay=1`}
              width="100%"
              height="120"
              allow="autoplay"
              style={{ border: "none" }}
            />
          </div>
          {/* Custom progress bar overlay */}
          <div className="absolute inset-0 flex items-center px-4">
            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomPlayer;
