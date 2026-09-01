import { SurahItem } from "@/hooks/useSurahData";

interface Props {
  surahs: SurahItem[];
  currentPlaying: number | null;
  onSelect: (surah: SurahItem) => void;
}

const SurahList = ({
  surahs,
  currentPlaying,
  onSelect,
}: Props) => {
  return (
    <div className="grid grid-cols-1 gap-3">
      {surahs.map((surah) => {
        const isActive = currentPlaying === surah.number;

        return (
          <button
            key={surah.number}
            onClick={() => onSelect(surah)}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-right focus-visible:ring-4 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:scale-[1.02] ${
              isActive
                ? "bg-accent/20 border-accent shadow-lg scale-[1.02]"
                : "bg-card border-border hover:border-accent/50 hover:shadow-md hover:scale-[1.01]"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {surah.revelationType === "custom" ? "🎤" : surah.number}
            </div>

            {/* Surah name */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-foreground font-amiri">
                {surah.revelationType === "custom" ? surah.name : `سورة ${surah.name}`}
              </h3>
              {surah.ayahCount ? (
                <p className="text-xs text-muted-foreground mt-0.5 font-sans flex items-center gap-1.5">
                  <span>{surah.ayahCount} آيات</span>
                  {surah.type && (
                    <>
                      <span className="opacity-40">•</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          surah.type === "مكية"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {surah.type}
                      </span>
                    </>
                  )}
                </p>
              ) : null}
            </div>

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
