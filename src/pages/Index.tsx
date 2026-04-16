import { useState, useMemo } from "react";
import AppHeader from "@/components/AppHeader";
import PointsDisplay from "@/components/PointsDisplay";
import SurahList from "@/components/SurahList";
import SearchBar from "@/components/SearchBar";
import CustomPlayer from "@/components/CustomPlayer";
import MushafPage from "@/components/MushafPage";
import BottomNav, { TabType } from "@/components/BottomNav";
import { useSurahData, SurahItem } from "@/hooks/useSurahData";
import { useProgress } from "@/hooks/useProgress";

const Index = () => {
  const { surahs, loading, error } = useSurahData();
  const { points, level, recordAyah } = useProgress();
  const [currentSurah, setCurrentSurah] = useState<SurahItem | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("audio");
  const [search, setSearch] = useState("");

  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return surahs;
    return surahs.filter((s) => s.name.includes(search.trim()));
  }, [surahs, search]);

  const handleSelect = (surah: SurahItem) => {
    setCurrentSurah(surah);
    recordAyah(surah.number, 1);
  };

  const handleClose = () => setCurrentSurah(null);

  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background-kids.jpg')" }}
      />
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative z-10 min-h-screen pb-40">
        <AppHeader />

        <div className="flex justify-center mb-4">
          <PointsDisplay points={points} level={level} />
        </div>

        <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {activeTab === "audio" && (
            <>
              <SearchBar value={search} onChange={setSearch} />

              {loading && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">جاري تحميل السور...</p>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
                  <p className="text-destructive">خطأ في تحميل البيانات: {error}</p>
                </div>
              )}

              {!loading && !error && (
                <SurahList
                  surahs={filteredSurahs}
                  currentPlaying={currentSurah?.number ?? null}
                  onSelect={handleSelect}
                />
              )}
            </>
          )}

          {activeTab === "mushaf" && <MushafPage />}
        </main>
      </div>

      {/* Custom player floats above bottom nav */}
      {currentSurah && (
        <CustomPlayer
          surahName={currentSurah.name}
          surahNumber={currentSurah.number}
          driveId={currentSurah.driveId}
          onClose={handleClose}
        />
      )}

      <BottomNav
        activeTab={activeTab}
        onChange={setActiveTab}
        hasPlayer={!!currentSurah}
      />
    </div>
  );
};

export default Index;
