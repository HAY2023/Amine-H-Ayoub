import { SurahItem } from "@/hooks/useSurahData";

interface Props {
  surahs: SurahItem[];
  currentPlaying: number | null;
  onSelect: (surah: SurahItem) => void;
}

const SurahList = ({ surahs, currentPlaying, onSelect }: Props) => {
  return (
    <div className="grid grid-cols-1 gap-3">
      {surahs.map((surah) => {
        const isActive = currentPlaying === surah.number;
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
              {surah.number}
            </div>

            {/* Surah name */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-foreground font-amiri">
                سورة {surah.name}
              </h3>
            </div>

            {/* Wave animation for active */}
            {isActive && (
              <div className="flex items-center gap-[3px] h-8">
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
