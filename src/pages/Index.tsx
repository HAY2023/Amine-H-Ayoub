import { useState, useMemo, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import PointsDisplay from "@/components/PointsDisplay";
import SurahList from "@/components/SurahList";
import SearchBar from "@/components/SearchBar";
import CustomPlayer, { CustomPlayerHandle } from "@/components/CustomPlayer";
import MushafPage from "@/components/MushafPage";
import BottomNav, { TabType } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurahData, SurahItem } from "@/hooks/useSurahData";
import { useProgress } from "@/hooks/useProgress";

const LAST_SURAH_KEY = "audio:lastSurah";
const LAST_TIME_KEY = "audio:lastTime";

const Index = () => {
  const { surahs, loading, error, retry } = useSurahData();
  const { points, level, recordAyah } = useProgress();
  const [currentSurah, setCurrentSurah] = useState<SurahItem | null>(null);
  const [resumeTime, setResumeTime] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("audio");
  const [search, setSearch] = useState("");
  const playerRef = useRef<CustomPlayerHandle>(null);
  const lastSavedRef = useRef(0);

  // Restore last played surah once data arrives
  useEffect(() => {
    if (currentSurah || surahs.length === 0) return;
    const savedNum = parseInt(localStorage.getItem(LAST_SURAH_KEY) || "0", 10);
    if (!savedNum) return;
    const found = surahs.find((s) => s.number === savedNum);
    if (found) {
      const t = parseFloat(localStorage.getItem(LAST_TIME_KEY) || "0");
      setResumeTime(isNaN(t) ? 0 : t);
      setCurrentSurah(found);
    }
  }, [surahs, currentSurah]);

  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return surahs;
    return surahs.filter((s) => s.name.includes(search.trim()));
  }, [surahs, search]);

  const handleSelect = (surah: SurahItem) => {
    setResumeTime(0);
    setCurrentSurah(surah);
    localStorage.setItem(LAST_SURAH_KEY, String(surah.number));
    localStorage.setItem(LAST_TIME_KEY, "0");
    recordAyah(surah.number, 1);
  };

  const handleClose = () => {
    setCurrentSurah(null);
    localStorage.removeItem(LAST_SURAH_KEY);
    localStorage.removeItem(LAST_TIME_KEY);
  };

  // Throttled save of currentTime
  const handleTimeUpdate = (t: number) => {
    if (Math.abs(t - lastSavedRef.current) >= 2) {
      lastSavedRef.current = t;
      localStorage.setItem(LAST_TIME_KEY, String(t));
    }
  };

  if (activeTab === "mushaf") {
    return <MushafPage onBack={() => setActiveTab("audio")} />;
  }

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
          <SearchBar value={search} onChange={setSearch} />

          {loading && (
            <div className="space-y-3">
              <div className="text-center py-6">
                <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground text-lg font-amiri">
                  جاري جلب التلاوات العطرة...
                </p>
                <p className="text-muted-foreground/70 text-sm mt-1">
                  قد يستغرق الأمر بضع ثوانٍ
                </p>
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-8 text-center space-y-4">
              <p className="text-destructive text-lg font-bold">خطأ في تحميل البيانات</p>
              <p className="text-muted-foreground text-sm">{error}</p>
              <button
                onClick={retry}
                className="px-6 py-3 bg-accent text-accent-foreground font-bold rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
              >
                🔄 إعادة المحاولة
              </button>
            </div>
          )}

          {!loading && !error && (
            <SurahList
              surahs={filteredSurahs}
              currentPlaying={currentSurah?.number ?? null}
              onSelect={handleSelect}
            />
          )}
        </main>
      </div>

      {currentSurah && (
        <CustomPlayer
          ref={playerRef}
          surahName={currentSurah.name}
          surahNumber={currentSurah.number}
          driveId={currentSurah.driveId}
          initialTime={resumeTime}
          onClose={handleClose}
          onTimeUpdate={handleTimeUpdate}
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
