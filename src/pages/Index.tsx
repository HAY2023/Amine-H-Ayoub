import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import PointsDisplay from "@/components/PointsDisplay";
import SurahList from "@/components/SurahList";
import SearchBar from "@/components/SearchBar";
import CustomPlayer, { CustomPlayerHandle } from "@/components/CustomPlayer";
import MushafComingSoon from "@/components/MushafComingSoon";
import PinModal from "@/components/PinModal";
import BottomNav, { TabType } from "@/components/BottomNav";
import NotificationsModal from "../components/NotificationsModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurahData, SurahItem } from "@/hooks/useSurahData";
import { useProgress } from "@/hooks/useProgress";
import { useNotifications } from "@/hooks/useNotifications";

import { Shuffle, ListOrdered, Loader2, SplitSquareHorizontal, BookOpen, Baby, ChevronLeft, Settings, Bell, SlidersHorizontal, Upload } from "lucide-react";
import { isTauri, shouldHideMushaf, checkOfflineStatus, downloadSurah, listenToDownloadProgress } from "../utils/tauriUtils";
import { checkForUpdates, UpdateInfo } from "../utils/updateChecker";
import { isKidsMode, setKidsLocked, hasKidsPin } from "@/data/kidsLock";
import { isTimeAllowed } from "@/data/kidsSchedule";
import { kidsEnabled as getKidsEnabled, addReadingMinutes, getProgress, setAppMode } from "@/data/kidsProfile";
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

// Mushaf page data for split view mapping
const MUSHAF_PAGES = [
  { src: "/pages/fatiha.jpg", surahs: [1] },
  { src: "/pages/600.jpg", surahs: [14] },
  { src: "/pages/601.jpg", surahs: [13, 12, 11] },
  { src: "/pages/602.jpg", surahs: [10, 9, 8] },
  { src: "/pages/603.jpg", surahs: [7, 6, 5] },
  { src: "/pages/604.jpg", surahs: [4, 3, 2] },
];


function getMushafPageForSurah(surahNumber: number): string | null {
  const page = MUSHAF_PAGES.find(p => p.surahs.includes(surahNumber));
  return page?.src ?? null;
}

const Index = () => {
  useNotifications();
  const navigate = useNavigate();
  const { surahs, loading, error, retry } = useSurahData();
  const { points, recordAyah } = useProgress();
  const [currentSurah, setCurrentSurah] = useState<SurahItem | null>(null);
  const [resumeTime, setResumeTime] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("audio");
  const [search, setSearch] = useState("");
  const playerRef = useRef<CustomPlayerHandle>(null);
  const lastSavedRef = useRef(0);
  const [autoNext, setAutoNext] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledSurahs, setShuffledSurahs] = useState<SurahItem[]>([]);

  // Desktop split view
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 1024 : false);
  const [isSplitView, setIsSplitView] = useState(false);

  // ركن الأطفال (الألعاب) داخل قسم التلاوات
  const [kidsCorner, setKidsCorner] = useState(getKidsEnabled);   // ركن الأطفال مُفعَّل؟ (ليس وضع وليّ الأمر فقط)
  const [kidsMode, setKidsMode] = useState(isKidsMode);
  const [pinAction, setPinAction] = useState<null | "enter" | "settings">(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(() => getProgress().unlocked);
  
  useEffect(() => {
    const handleUnlock = () => setIsUnlocked(getProgress().unlocked);
    window.addEventListener("mushaf:games_unlocked", handleUnlock);
    window.addEventListener("mushaf:activeprofile", handleUnlock);
    return () => {
      window.removeEventListener("mushaf:games_unlocked", handleUnlock);
      window.removeEventListener("mushaf:activeprofile", handleUnlock);
    };
  }, []);

  const isAudioPlayingRef = useRef(false);
  useEffect(() => { isAudioPlayingRef.current = isAudioPlaying; }, [isAudioPlaying]);
  useEffect(() => { const h = () => setKidsCorner(getKidsEnabled()); window.addEventListener("mushaf:appmode", h); return () => window.removeEventListener("mushaf:appmode", h); }, []);
  useEffect(() => { const h = () => setKidsMode(isKidsMode()); window.addEventListener("mushaf:kidsmode", h); return () => window.removeEventListener("mushaf:kidsmode", h); }, []);

  // ── ركن الأطفال: الدخول يقفل التطبيق برمز ولي الأمر (كما في القارئ) ──
  const enterKids = () => {
    const timeCheck = isTimeAllowed();
    if (!timeCheck.allowed) {
      toast({
        title: "غير مسموح الآن ⏰",
        description: timeCheck.reason,
        variant: "destructive"
      });
      return;
    }
    setAppMode("kids");
    setKidsLocked(true);
    navigate("/games");
  };
  
  // ── الإعدادات: محميّة برمز ولي الأمر إن وُجد (القارئ مخفيّ الآن، فمدخل الإعدادات هنا) ──
  const openSettings = () => { if (hasKidsPin()) setPinAction("settings"); else navigate("/settings"); };

  // تتبّع دقائق الاستماع لفتح الألعاب — عندما يكون المصحف مخفيّاً (الاستماع بديلٌ للقراءة)
  useEffect(() => {
    if (!shouldHideMushaf()) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (!getKidsEnabled()) return;         // وضع وليّ الأمر فقط: لا تتبّع
      if (!isAudioPlayingRef.current) return; // لا نحتسب إلا أثناء استماع فعلي
      const { justUnlocked } = addReadingMinutes(1);
      if (justUnlocked) toast({ title: "أحسنت! فتحت ألعاب ركن الأطفال", description: "اذهب إلى ركن الأطفال" });
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // شريط التنقّل السفلي: «المصحف» في نسخة التطبيق يعرض رسالة اعتذار بدل القارئ
  const handleTab = useCallback((tab: TabType) => {
    if (tab === "mushaf") {
      if (shouldHideMushaf()) setActiveTab("mushaf");   // مخفيّ للمستخدمين → رسالة التطوير
      else navigate("/");                                // وضع المالك → القارئ
    } else {
      setActiveTab(tab);
    }
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  const currentMushafPage = useMemo(() => {
    if (!currentSurah || currentSurah.revelationType === "custom") return null;
    return getMushafPageForSurah(currentSurah.number);
  }, [currentSurah]);

  // Unified Playlist State
  const [combinedSurahs, setCombinedSurahs] = useState<SurahItem[]>([]);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

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
        setIsConfigLoaded(true);
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

  // Bulk download state & logic
  const [downloadAllProgress, setDownloadAllProgress] = useState<{ active: boolean; current: number; total: number }>({ active: false, current: 0, total: 0 });
  
  const undownloadedCount = useMemo(() => {
    return surahs.filter(s => !offlineStatus[s.number]).length;
  }, [surahs, offlineStatus]);

  const handleDownloadAll = async () => {
    if (!isTauri() || downloadAllProgress.active) return;
    
    const toDownload = surahs.filter(s => !offlineStatus[s.number]);
    if (toDownload.length === 0) return;

    setDownloadAllProgress({ active: true, current: 0, total: toDownload.length });

    for (let i = 0; i < toDownload.length; i++) {
      const s = toDownload[i];
      if (isDownloading[s.number] || offlineStatus[s.number]) continue;
      
      setIsDownloading(prev => ({ ...prev, [s.number]: true }));
      setDownloadProgress(prev => ({ ...prev, [s.number]: 0 }));
      setDownloadAllProgress(prev => ({ ...prev, current: i + 1 }));
      try {
        await downloadSurah(s.audioSrc, s.number);
      } catch (err) {
        console.error(`Bulk download failed for surah ${s.number}:`, err);
        setIsDownloading(prev => ({ ...prev, [s.number]: false }));
      }
    }

    setDownloadAllProgress({ active: false, current: 0, total: 0 });
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

  if (activeTab === "mushaf") {
    // نسخة التطبيق فقط: المصحف قيد التطوير — رسالة اعتذار مع إبقاء شريط التنقّل
    // (خلوص الشريط السفلي يُدار داخل MushafComingSoon عبر pb-28)
    return (
      <div className="min-h-screen">
        <MushafComingSoon onGoListen={() => setActiveTab("audio")} />
        <BottomNav activeTab={activeTab} onChange={handleTab} hasPlayer={!!currentSurah} />
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
        {/* مدخل الإعدادات والإشعارات — (يُخفى في وضع الطفل المقفل) */}
        {!kidsMode && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="h-10 px-3.5 rounded-full bg-card/85 backdrop-blur border border-accent/40 shadow-soft flex items-center gap-1.5 text-sm font-bold text-foreground/85 hover:text-foreground hover:border-accent/70 active:scale-95 transition-all"
              title="الإعلانات والتنبيهات"
            >
              <Bell className="w-4 h-4 text-accent" /> الإعلانات
            </button>
            <button
              onClick={openSettings}
              className="h-10 px-3.5 rounded-full bg-card/85 backdrop-blur border border-accent/40 shadow-soft flex items-center gap-1.5 text-sm font-bold text-foreground/85 hover:text-foreground hover:border-accent/70 active:scale-95 transition-all"
            >
              <Settings className="w-4 h-4 text-accent" /> الإعدادات
            </button>
          </div>
        )}
        <AppHeader />

        <div className="flex justify-center mb-4">
          <PointsDisplay points={points} />
        </div>

        {/* مدخل ركن الأطفال (الألعاب) من داخل قسم التلاوات */}
        {kidsCorner && !isAudioPlaying && (
          <div className="max-w-2xl mx-auto px-4 mb-4" dir="rtl">
            <button
              onClick={() => {
                const timeCheck = isTimeAllowed();
                if (!timeCheck.allowed) {
                  toast({
                    title: "غير مسموح الآن ⏰",
                    description: timeCheck.reason,
                    variant: "destructive"
                  });
                  return;
                }
                if (kidsMode) {
                  navigate("/games");
                } else {
                  enterKids();
                }
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-l from-accent/15 to-card border border-accent/40 shadow-soft flex items-center gap-3 active:scale-[0.99] transition-all"
            >
              <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0"><Baby className="w-6 h-6" /></span>
              <span className="flex-1 text-right">
                <span className="block font-extrabold text-foreground">{kidsMode ? "الألعاب" : "ركن الأطفال"}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {isUnlocked ? "ألعاب ومكافآت لتعلّم القرآن" : shouldHideMushaf() ? "استمع للتلاوات لتفتح الألعاب" : "اقرأ القرآن لتفتح الألعاب"}
                </span>
              </span>
              <ChevronLeft className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          </div>
        )}

        <main className={`mx-auto px-4 py-4 space-y-4 transition-all duration-300 animate-fade-up ${isSplitView && isDesktop ? 'max-w-7xl' : 'max-w-2xl'}`}>
          {/* Search + Shuffle */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-0">
              <SearchBar value={search} onChange={setSearch} />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {/* عرض المصحف جانبياً — يُخفى ما دام المصحف قيد التطوير */}
              {isDesktop && !shouldHideMushaf() && (
                <button
                  onClick={() => setIsSplitView(v => !v)}
                  className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                    isSplitView
                      ? "bg-sky-500/20 text-sky-700 border-sky-400/50 shadow-lg scale-105"
                      : "bg-card border-border hover:border-sky-400/50 hover:shadow-md"
                  }`}
                  title={isSplitView ? "إغلاق التقسيم" : "عرض المصحف جانبياً"}
                  aria-label={isSplitView ? "إغلاق التقسيم" : "عرض المصحف جانبياً"}
                >
                  <SplitSquareHorizontal className="w-5 h-5" />
                </button>
              )}
              {!kidsMode && (
                <>
                  {/* أزرار الإدارة تم إخفاؤها بناءً على طلب المستخدم لمنع عبث الأطفال */}
                </>
              )}
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
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-accent/15 border border-accent/40 text-accent-foreground text-sm font-bold shadow-soft animate-fade-in text-right" dir="rtl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-accent/25 flex items-center justify-center text-accent animate-bounce shrink-0">
                  ✨
                </div>
                <div>
                  <p className="font-extrabold font-quran text-base leading-tight">تحديث جديد متوفر: نسخة {updateInfo.latestVersion}</p>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">قم بتحميل التحديث للحصول على أحدث التلاوات والميزات للعمل بدون إنترنت!</p>
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

          {/* New Content / Bulk Download Banner */}
          {isTauri() && undownloadedCount > 0 && (
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-900 text-sm font-bold shadow-md animate-fade-in text-right" dir="rtl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-700 shrink-0">
                  📥
                </div>
                <div>
                  <p className="font-extrabold font-quran text-base leading-tight">تلاوات جديدة متوفرة للتحميل أوفلاين</p>
                  <p className="text-xs font-normal text-sky-800/80 mt-0.5">
                    {downloadAllProgress.active 
                      ? `جاري تحميل السورة ${downloadAllProgress.current} من أصل ${downloadAllProgress.total}...`
                      : `يوجد ${undownloadedCount} سور متوفرة على السيرفر ولم يتم تحميلها بعد.`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadAll}
                disabled={downloadAllProgress.active}
                className="shrink-0 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                {downloadAllProgress.active && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{downloadAllProgress.active ? "جاري التحميل..." : "تحميل الكل"}</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <div className="text-center py-6">
                <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground text-lg font-quran">
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

          {/* Split view layout */}
          {!loading && !error && (
            <div className={`${isSplitView && isDesktop ? 'flex gap-6' : ''}`}>
                {/* Surah list */}
              <div className={`${isSplitView && isDesktop ? 'w-1/2' : 'w-full'} flex flex-col gap-6`}>
                
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
              </div>

              {/* Mushaf page preview (split view only) */}
              {isSplitView && isDesktop && (
                <div className="w-1/2 sticky top-4 self-start">
                  <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-background">
                    {currentMushafPage ? (
                      <div className="relative">
                        <img
                          src={currentMushafPage}
                          alt="صفحة المصحف"
                          className="w-full h-auto select-none animate-fade-in"
                          draggable={false}
                        />
                        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                          <p className="text-white font-quran font-bold text-sm text-center">
                            {currentSurah?.name ? `سورة ${currentSurah.name}` : ''}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                        <BookOpen className="w-16 h-16 mb-3 opacity-30" />
                        <p className="font-quran text-base">اختر سورة لعرض صفحة المصحف</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
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

      <BottomNav
        activeTab={activeTab}
        onChange={handleTab}
        hasPlayer={!!currentSurah}
      />

      {/* رمز ولي الأمر: تعيينه عند دخول ركن الأطفال أوّل مرّة، أو التحقّق منه للإعدادات */}
      {pinAction && (
        <PinModal
          mode="verify"
          title="أدخل الرمز للإعدادات"
          onSuccess={() => {
            if (pinAction === "settings") { navigate("/settings"); }
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
