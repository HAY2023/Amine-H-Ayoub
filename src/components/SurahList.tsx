import { SurahItem } from "@/hooks/useSurahData";
import { Download, Check, Loader2 } from "lucide-react";

interface Props {
  surahs: SurahItem[];
  currentPlaying: number | null;
  onSelect: (surah: SurahItem) => void;
  isTauri?: boolean;
  offlineStatus?: Record<number, boolean>;
  isDownloading?: Record<number, boolean>;
  downloadProgress?: Record<number, number>;
  onDownload?: (e: React.MouseEvent, surah: SurahItem) => void;
}

const SurahList = ({
  surahs,
  currentPlaying,
  onSelect,
  isTauri = false,
  offlineStatus = {},
  isDownloading = {},
  downloadProgress = {},
  onDownload,
}: Props) => {
  return (
    <div className="grid grid-cols-1 gap-3">
      {surahs.map((surah, index) => {
        const isActive = currentPlaying === surah.number;
        const downloaded = offlineStatus[surah.number] || false;
        const downloading = isDownloading[surah.number] || false;
        const progress = downloadProgress[surah.number] || 0;

        return (
          <button
            key={surah.number}
            onClick={() => onSelect(surah)}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-right ${
              isActive
                ? "bg-accent/20 border-accent shadow-lg scale-[1.02]"
                : "bg-card border-border hover:border-accent/50 hover:shadow-md hover:scale-[1.01]"
            }`}
          >
            {/* Number circle */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {surah.revelationType === "custom" ? "🎤" : index + 1}
            </div>

            {/* Surah name */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-foreground font-amiri">
                {surah.revelationType === "custom" ? surah.name : `سورة ${surah.name}`}
              </h3>
            </div>

            {/* Offline download status or actions in desktop app */}
            {isTauri && surah.revelationType !== "custom" && (
              <div className="shrink-0 flex items-center">
                {downloading ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                ) : downloaded ? (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>جاهز أوفلاين</span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => onDownload?.(e, surah)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md text-xs font-bold transition-all"
                    title="تحميل للتشغيل بدون إنترنت"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل</span>
                  </button>
                )}
              </div>
            )}

            {/* Wave animation for active */}
            {isActive && (
              <div className="flex items-center gap-[3px] h-8 shrink-0">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-[3px] bg-accent rounded-full animate-wave"
                    style={{
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SurahList;
