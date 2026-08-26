import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import PointsDisplay from "@/components/PointsDisplay";
import SurahList from "@/components/SurahList";
import SearchBar from "@/components/SearchBar";
import CustomPlayer, { CustomPlayerHandle } from "@/components/CustomPlayer";
import ParentalGateModal from "@/components/ParentalGateModal";
import NotificationsModal from "../components/NotificationsModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurahData, SurahItem } from "@/hooks/useSurahData";
import { useProgress } from "@/hooks/useProgress";
import { useNotifications } from "@/hooks/useNotifications";
import { useTVNavigation } from "@/hooks/useTVNavigation";
import LegendaryDownloadHub from "@/components/LegendaryDownloadHub";

import { Shuffle, ListOrdered, Settings, Bell, Gamepad2, Lock } from "lucide-react";
import { isKidsMode, setKidsLocked, hasKidsPin } from "@/data/kidsLock";
import { isTimeAllowed } from "@/data/kidsSchedule";
import { kidsEnabled as getKidsEnabled, addReadingMinutes, setAppMode } from "@/data/kidsProfile";
import { checkAndUnlockBadges } from "@/data/kidsBadges";
import { toast } from "@/hooks/use-toast";

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
  useNotifications();
  const navigate = useNavigate();
  const { surahs, loading, error, retry } = useSurahData();
  const { points, recordAyah } = useProgress();
  const [currentSurah, setCurrentSurah] = useState<SurahItem | null>(null);
  const [resumeTime, setResumeTime] = useState(0);
  const [search, setSearch] = useState("");
  const playerRef = useRef<CustomPlayerHandle>(null);
  const lastSavedRef = useRef(0);
  const [autoNext, setAutoNext] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledSurahs, setShuffledSurahs] = useState<SurahItem[]>([]);

  // ركن الأطفال
  const [kidsMode, setKidsMode] = useState(isKidsMode);
  const [pinAction, setPinAction] = useState<null | "enter" | "settings">(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const isAudioPlayingRef = useRef(false);
  useEffect(() => { isAudioPlayingRef.current = isAudioPlaying; }, [isAudioPlaying]);
  useEffect(() => { const h = () => setKidsMode(isKidsMode()); window.addEventListener("mushaf:kidsmode", h); return () => window.removeEventListener("mushaf:kidsmode", h); }, []);

  // ── الإعدادات: محميّة برمز ولي الأمر فقط في وضع الأطفال ──
  const openSettings = () => { if (isKidsMode() && hasKidsPin()) setPinAction("settings"); else navigate("/settings"); };

  // تتبّع دقائق الاستماع والدراسة الفعالة وحفظها في الإحصائيات والأوسمة
  useEffect(() => {
    let accumulatedSecs = 0;
    const flushMinutes = () => {
      if (accumulatedSecs >= 5) {
        const mins = Math.round((accumulatedSecs / 60) * 10) / 10;
        accumulatedSecs = 0;
        if (mins > 0) {
          const { justUnlocked } = addReadingMinutes(mins);
          checkAndUnlockBadges();
          if (justUnlocked) {
            toast({ title: "🎉 أحسنت! اكتمل وقت الاستماع وفتحت الألعاب" });
            setTimeout(() => {
              navigate("/games");
            }, 1000);
          }
        }
      }
    };

    const handleExit = () => flushMinutes();
    window.addEventListener("beforeunload", handleExit);
    window.addEventListener("mushaf:flush_time", handleExit);

    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (!isAudioPlayingRef.current) return; // لا نحتسب إلا أثناء استماع وتشغيل فعلي
      accumulatedSecs += 5;
      if (accumulatedSecs >= 30) {
        flushMinutes();
      }
    }, 5000);

    return () => {
      clearInterval(id);
      flushMinutes();
      window.removeEventListener("beforeunload", handleExit);
      window.removeEventListener("mushaf:flush_time", handleExit);
    };
  }, [navigate]);

  useEffect(() => {
    const handleBadgeUnlocked = (e: any) => {
      const badges = e.detail;
      if (Array.isArray(badges) && badges.length > 0) {
        badges.forEach((b: any) => {
          toast({
            title: `🏆 مبارك! وسام جديد: ${b.title}`,
            description: `حصلت على ${b.rewardCoins} نجمة إضافية!`,
          });
        });
      }
    };
    window.addEventListener("mushaf:badge_unlocked", handleBadgeUnlocked);

    return () => {
      window.removeEventListener("mushaf:badge_unlocked", handleBadgeUnlocked);
    };
  }, []);

  // Unified Playlist State
  const [combinedSurahs, setCombinedSurahs] = useState<SurahItem[]>([]);

  useEffect(() => {
    if (loading || surahs.length === 0) return;
    
    const objectUrls: string[] = [];
    let isMounted = true;
    
    const loadUnifiedList = async () => {
      try {
        const { getAllCustomAudios } = await import("@/data/customAudioStore");
        const { syncPlaylist } = await import("@/data/playlistStore");
        
        const customAudios = await getAllCustomAudios();
        const config = await syncPlaylist(surahs, customAudios.map((audio) => ({ id: audio.id })));
        
        if (!isMounted) return;
        
        const customMap = new Map(customAudios.map(a => [a.id, a]));
        const builtinMap = new Map(surahs.map(s => [s.number, s]));
        
        const mapped: SurahItem[] = [];
        
        for (const c of config) {
          if (c.isHidden) continue;
          
          if (c.type === 'custom') {
            const ca = customMap.get(c.originalId as string);
            if (ca) {
              const url = URL.createObjectURL(ca.blob);
              objectUrls.push(url);
              mapped.push({
                number: 1000 + mapped.length, // unique high number
                name: c.customName || ca.title,
                englishName: "Custom Audio",
                englishNameTranslation: "",
                numberOfAyahs: 0,
                revelationType: "custom",
                audioSrc: url,
              });
            }
          } else {
            const s = builtinMap.get(Number(c.originalId));
            if (s) {
              mapped.push({
                ...s,
                name: c.customName || s.name,
              });
            }
          }
        }
        
        setCombinedSurahs(mapped);
      } catch (err) {
        console.error("Failed to load unified playlist:", err);
      }
    };
    
    loadUnifiedList();
    
    return () => {
      isMounted = false;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [surahs, loading]);

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
    const base = isShuffled ? shuffledSurahs : combinedSurahs;
    if (!search.trim()) return base;
    return base.filter((s) => s.name.includes(search.trim()));
  }, [combinedSurahs, shuffledSurahs, isShuffled, search]);

  const handleShuffle = useCallback(() => {
    if (isShuffled) {
      setIsShuffled(false);
      setShuffledSurahs([]);
    } else {
      setShuffledSurahs(shuffleArray(combinedSurahs));
      setIsShuffled(true);
    }
  }, [isShuffled, combinedSurahs]);

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

  const activeSurahList = isShuffled ? shuffledSurahs : combinedSurahs;

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

  // دعم جهاز التحكم عن بُعد والتلفاز الذكي (Android TV Remote & D-pad Navigation)
  useTVNavigation({
    onPlayPause: () => {
      if (playerRef.current) {
        if (isAudioPlaying) playerRef.current.pause();
        else playerRef.current.play();
      }
    },
    onNext: handlePlayNext,
    onPrev: handlePlayPrev,
    onBack: () => {
      if (currentSurah) handleClose();
      else if (showNotifications) setShowNotifications(false);
    },
  });

  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background-kids.jpg')" }}
      />
      <div className="fixed inset-0 bg-background/80 backdrop-blur-md" />

      <div className="relative z-10 min-h-screen pb-8">
        {/* شريط التنقل العلوي */}
        {kidsMode ? (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <button
              onClick={() => {
                if (hasKidsPin()) {
                  setPinAction("exit_kids");
                } else {
                  setKidsLocked(false);
                  toast({ title: "تم فك قفل الأطفال" });
                }
              }}
              className="h-10 px-3.5 rounded-full bg-card/90 backdrop-blur border border-border shadow-soft flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-accent/50 active:scale-95 transition-all"
              title="فك قفل الأطفال"
            >
              <Lock className="w-3.5 h-3.5 text-accent" />
              <span>فك القفل</span>
            </button>
          </div>
        ) : (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <button
              onClick={openSettings}
              className="h-10 px-3.5 rounded-full bg-card/85 backdrop-blur border border-accent/40 shadow-soft flex items-center gap-1.5 text-sm font-bold text-foreground/85 hover:text-foreground hover:border-accent/70 active:scale-95 transition-all"
            >
              <Settings className="w-4 h-4 text-accent" /> الإعدادات
            </button>
          </div>
        )}

        {/* المكون الأسطوري الجديد */}
        <LegendaryDownloadHub />
        
        {/* تم إخفاء قسم السور والبحث كما طُلب */}
      </div>

      {currentSurah && (
        <CustomPlayer
          ref={playerRef}
          surahName={currentSurah.name}
          surahNumber={currentSurah.number}
          audioSrc={currentSurah.audioSrc}
          isCustom={currentSurah.revelationType === "custom"}
          initialTime={resumeTime}
          onClose={handleClose}
          onTimeUpdate={handleTimeUpdate}
          onPlayNext={handlePlayNext}
          onPlayPrev={handlePlayPrev}
          autoNext={autoNext}
          onToggleAutoNext={() => setAutoNext(v => !v)}
          onPlayingChange={setIsAudioPlaying}
        />
      )}

      {/* رمز ولي الأمر للإعدادات أو فك القفل */}
      {pinAction && (
        <ParentalGateModal
          title={pinAction === "exit_kids" ? "فك قفل وضع الأطفال" : "الدخول إلى الإعدادات"}
          onSuccess={() => {
            if (pinAction === "exit_kids") {
              setKidsLocked(false);
              toast({ title: "تم فك قفل الأطفال بنجاح" });
            } else if (pinAction === "settings") {
              navigate("/settings");
            }
            setPinAction(null);
          }}
          onCancel={() => setPinAction(null)}
        />
      )}

      {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
    </div>
  );
};

export default Index;
