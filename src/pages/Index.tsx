import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import RecitationMethods from "./RecitationMethods";
import { Shuffle, ListOrdered } from "lucide-react";
import { isTauri, checkOfflineStatus, downloadSurah, listenToDownloadProgress } from "../utils/tauriUtils";
import { checkForUpdates, UpdateInfo } from "../utils/updateChecker";

const LAST_SURAH_KEY = "audio:lastSurah";
const LAST_TIME_KEY = "audio:lastTime";

/** Fisher-Yates shuffle */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const Index = () => {
  const navigate = useNavigate();
  const { surahs, loading, error, retry } = useSurahData();
  const { points, level, recordAyah } = useProgress();
  const [currentSurah, setCurrentSurah] = useState<SurahItem | null>(null);
  const [resumeTime, setResumeTime] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("audio");
  const [search, setSearch] = useState("");
  const playerRef = useRef<CustomPlayerHandle>(null);
  const lastSavedRef = useRef(0);
  const [autoNext, setAutoNext] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledSurahs, setShuffledSurahs] = useState<SurahItem[]>([]);

  // Tauri Offline States
  const [offlineStatus, setOfflineStatus] = useState<Record<number, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<number, number>>({});
  const [isDownloading, setIsDownloading] = useState<Record<number, boolean>>({});

  // App Update State
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Check offline status for all surahs
  const checkAllOfflineStatus = useCallback(async (surahList: SurahItem[]) => {
    if (!isTauri()) return;
    const status: Record<number, boolean> = {};
    for (const s of surahList) {
      status[s.number] = await checkOfflineStatus(s.number);
    }
    setOfflineStatus(prev => ({ ...prev, ...status }));
  }, []);

  // Check for updates on mount
  useEffect(() => {
    if (isTauri()) {
      checkForUpdates().then((info) => {
        if (info.hasUpdate) {
          setUpdateInfo(info);
        }
      });
    }
  }, []);

  // Re-check offline when surah list changes
  useEffect(() => {
    if (surahs.length > 0) {
      checkAllOfflineStatus(surahs);
    }
  }, [surahs, checkAllOfflineStatus]);

  // Listen to download progress
  useEffect(() => {
    if (!isTauri()) return;
    const unsub = listenToDownloadProgress((payload) => {
      const { surah_number, progress, status } = payload;
      setDownloadProgress(prev => ({ ...prev, [surah_number]: Math.round(progress) }));
      
      if (status === "completed") {
        setIsDownloading(prev => ({ ...prev, [surah_number]: false }));
        setOfflineStatus(prev => ({ ...prev, [surah_number]: true }));
      } else if (status === "error") {
        setIsDownloading(prev => ({ ...prev, [surah_number]: false }));
      } else if (status === "downloading") {
        setIsDownloading(prev => ({ ...prev, [surah_number]: true }));
      }
    });
    return () => unsub();
  }, []);

  const handleDownload = async (e: React.MouseEvent, surah: SurahItem) => {
    e.stopPropagation(); // Prevent playing the surah when clicking download
    if (!isTauri()) return;
    
    setIsDownloading(prev => ({ ...prev, [surah.number]: true }));
    setDownloadProgress(prev => ({ ...prev, [surah.number]: 0 }));
    try {
      await downloadSurah(surah.audioSrc, surah.number);
    } catch (err) {
      console.error("Download failed:", err);
      setIsDownloading(prev => ({ ...prev, [surah.number]: false }));
    }
  };

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

  const displaySurahs = useMemo(() => {
    const base = isShuffled ? shuffledSurahs : surahs;
    if (!search.trim()) return base;
    return base.filter((s) => s.name.includes(search.trim()));
  }, [surahs, shuffledSurahs, isShuffled, search]);

  const handleShuffle = useCallback(() => {
    if (isShuffled) {
      setIsShuffled(false);
      setShuffledSurahs([]);
    } else {
      setShuffledSurahs(shuffleArray(surahs));
      setIsShuffled(true);
    }
  }, [isShuffled, surahs]);

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

  const activeSurahList = isShuffled ? shuffledSurahs : surahs;

  const handlePlayNext = () => {
    if (!currentSurah || activeSurahList.length === 0) return;
    const idx = activeSurahList.findIndex(s => s.number === currentSurah.number);
    const next = activeSurahList[idx + 1];
    if (next) {
      setResumeTime(0);
      setCurrentSurah(next);
      localStorage.setItem(LAST_SURAH_KEY, String(next.number));
      localStorage.setItem(LAST_TIME_KEY, "0");
    }
  };

  const handlePlayPrev = () => {
    if (!currentSurah || activeSurahList.length === 0) return;
    const idx = activeSurahList.findIndex(s => s.number === currentSurah.number);
    const prev = activeSurahList[idx - 1];
    if (prev) {
      setResumeTime(0);
      setCurrentSurah(prev);
      localStorage.setItem(LAST_SURAH_KEY, String(prev.number));
      localStorage.setItem(LAST_TIME_KEY, "0");
    }
  };

  if (activeTab === "mushaf") {
    // Should not reach here normally, but fallback just in case
    return <MushafPage onBack={() => setActiveTab("audio")} />;
  }

  if (activeTab === "methods") {
    return (
      <div className="pb-24">
        <RecitationMethods onBack={() => setActiveTab("audio")} />
        <BottomNav
          activeTab={activeTab}
          onChange={setActiveTab}
          hasPlayer={!!currentSurah}
        />
      </div>
    );
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
          {/* Search + Shuffle */}
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} />
            </div>
            <button
              onClick={handleShuffle}
              className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                isShuffled
                  ? "bg-accent text-accent-foreground border-accent shadow-lg scale-105"
                  : "bg-card border-border hover:border-accent/50 hover:shadow-md"
              }`}
              title={isShuffled ? "العودة للترتيب الأصلي" : "ترتيب عشوائي"}
              aria-label={isShuffled ? "العودة للترتيب الأصلي" : "ترتيب عشوائي"}
            >
              {isShuffled ? (
                <ListOrdered className="w-5 h-5" />
              ) : (
                <Shuffle className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Shuffle indicator */}
          {isShuffled && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-accent/10 border border-accent/30 text-accent-foreground text-sm font-bold animate-fade-in">
              <Shuffle className="w-4 h-4" />
              <span>الترتيب العشوائي مُفعّل</span>
              <button
                onClick={handleShuffle}
                className="mr-2 px-2 py-0.5 rounded-md bg-accent/20 hover:bg-accent/30 text-xs transition-colors"
              >
                إلغاء
              </button>
            </div>
          )}

          {/* Update Checker Banner */}
          {updateInfo && (
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-900 text-sm font-bold shadow-md animate-fade-in text-right" dir="rtl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-400/30 flex items-center justify-center text-amber-800 animate-bounce shrink-0">
                  ✨
                </div>
                <div>
                  <p className="font-extrabold font-amiri text-base leading-tight">تحديث جديد متوفر: نسخة {updateInfo.latestVersion}</p>
                  <p className="text-xs font-normal text-amber-800/80 mt-0.5">قم بتحميل التحديث للحصول على أحدث التلاوات والميزات للعمل بدون إنترنت!</p>
                </div>
              </div>
              <a
                href={updateInfo.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                تحميل الآن
              </a>
            </div>
          )}

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
              surahs={displaySurahs}
              currentPlaying={currentSurah?.number ?? null}
              onSelect={handleSelect}
              isTauri={isTauri()}
              offlineStatus={offlineStatus}
              isDownloading={isDownloading}
              downloadProgress={downloadProgress}
              onDownload={handleDownload}
            />
          )}
        </main>
      </div>

      {currentSurah && (
        <CustomPlayer
          ref={playerRef}
          surahName={currentSurah.name}
          surahNumber={currentSurah.number}
          audioSrc={currentSurah.audioSrc}
          initialTime={resumeTime}
          onClose={handleClose}
          onTimeUpdate={handleTimeUpdate}
          onPlayNext={handlePlayNext}
          onPlayPrev={handlePlayPrev}
          autoNext={autoNext}
          onToggleAutoNext={() => setAutoNext(v => !v)}
        />
      )}

      <BottomNav
        activeTab={activeTab}
        onChange={(tab) => {
          if (tab === "mushaf") {
            navigate("/");
          } else {
            setActiveTab(tab);
          }
        }}
        hasPlayer={!!currentSurah}
      />
    </div>
  );
};

export default Index;
