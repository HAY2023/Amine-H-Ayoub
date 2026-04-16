import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import PointsDisplay from "@/components/PointsDisplay";
import SurahList from "@/components/SurahList";
import QuranPageViewer from "@/components/QuranPageViewer";
import StickyPlayer from "@/components/StickyPlayer";
import { useSurahData, SurahItem } from "@/hooks/useSurahData";
import { useProgress } from "@/hooks/useProgress";

const Index = () => {
  const { surahs, loading, error } = useSurahData();
  const { points, level, recordAyah } = useProgress();
  const [currentSurah, setCurrentSurah] = useState<SurahItem | null>(null);

  const handleSelect = (surah: SurahItem) => {
    setCurrentSurah(surah);
    // Award points for listening
    recordAyah(surah.number, 1);
  };

  const handleClose = () => {
    setCurrentSurah(null);
  };

  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background-kids.jpg')" }}
      />
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative z-10 min-h-screen pb-32">
        <AppHeader />

        <div className="flex justify-center mb-4">
          <PointsDisplay points={points} level={level} />
        </div>

        <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">
          {/* Quran page viewer */}
          {currentSurah && (
            <QuranPageViewer surahName={currentSurah.name} />
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">جاري تحميل السور...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
              <p className="text-destructive">خطأ في تحميل البيانات: {error}</p>
            </div>
          )}

          {/* Surah list */}
          {!loading && !error && (
            <SurahList
              surahs={surahs}
              currentPlaying={currentSurah?.number ?? null}
              onSelect={handleSelect}
            />
          )}
        </main>
      </div>

      {/* Sticky bottom player */}
      {currentSurah && (
        <StickyPlayer
          surahName={currentSurah.name}
          surahNumber={currentSurah.number}
          driveId={currentSurah.driveId}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default Index;
