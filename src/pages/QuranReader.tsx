import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2, X, Shuffle, Pencil, Check, Settings, Bell, SplitSquareHorizontal, Volume2, Menu, Eye, EyeOff, List, Lock, Baby, Bookmark as BookmarkIcon, Trash2, Plus, Wrench } from "lucide-react";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";
import { getPageAyahBoxes, PAGE_IMAGE_SIZE } from "@/data/ayahCoordinates";
import AppFooter from "@/components/AppFooter";
import { getSavedTimings, getSurahTimings } from "@/data/ayahTimings";
import { getCustomPages, getAllPageImages, getPageOrder } from "@/data/customPages";
import { getPageSurahRegions } from "@/data/surahRegions";
import { addReadingMinutes, addCoins, kidsEnabled as getKidsEnabled, getProgress } from "@/data/kidsProfile";

import { getBookmarks, addBookmark, removeBookmark, Bookmark } from "@/data/bookmarks";
import { isKidsMode, setKidsLocked, hasKidsPin } from "@/data/kidsLock";
import ParentalGateModal from "@/components/ParentalGateModal";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { isTauri, checkOfflineStatus, getOfflineAudioUrl, downloadSurah, listenToDownloadProgress } from "../utils/tauriUtils";
import { resolvePlayableAudioUrl } from "@/data/offlineAudioCache";
import { useAudioContext } from "@/contexts/audioContext";
import SplitViewPanel from "@/components/SplitViewPanel";
import NotificationsModal from "@/components/NotificationsModal";
import { updateMediaSession, setMediaPlaybackState, isBackgroundAudioEnabled } from "@/utils/backgroundAudio";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

// === Page naming from settings ===
const PAGE_NAMES_KEY = "mushaf:pageNames:v1";

function getCustomPageNames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PAGE_NAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveCustomPageName(pageSrc: string, name: string) {
  const all = getCustomPageNames();
  if (name.trim()) {
    all[pageSrc] = name.trim();
  } else {
    delete all[pageSrc];
  }
  localStorage.setItem(PAGE_NAMES_KEY, JSON.stringify(all));
  try {
    await supabase.from("store").upsert({ key: PAGE_NAMES_KEY, value: all });
  } catch (e) {
    console.error("Save page name error:", e);
  }
}

function getPageDisplayName(page: { name: string; src: string }): string {
  const custom = getCustomPageNames();
  return custom[page.src] || page.name;
}

/** Fisher-Yates shuffle */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Speaker = "teacher" | "kids";
type PlayMode = "teacher" | "kids";

const STORAGE_KEY = "mushaf:lastPage";
const MUSHAF_LAST_SURAH = "mushaf:lastSurah";
const MUSHAF_LAST_TIME = "mushaf:lastTime";

interface SurahAudio { name: string; number: number; src: string; ayahCount: number; }
interface PageInfo { name: string; src: string; surahs: SurahAudio[]; }

const BASE_PAGES: PageInfo[] = [
  {
    name: "الفاتحة", src: "/pages/fatiha.jpg", surahs: [
      { name: "الفاتحة", number: 1, src: audioPath(1), ayahCount: 7 },
    ]
  },
  {
    name: "القارعة - التكاثر", src: "/pages/600.jpg", surahs: [
      { name: "التكاثر", number: 14, src: audioPath(14), ayahCount: 8 },
    ]
  },
  {
    name: "العصر - الهمزة - الفيل", src: "/pages/601.jpg", surahs: [
      { name: "العصر", number: 13, src: audioPath(13), ayahCount: 3 },
      { name: "الهمزة", number: 12, src: audioPath(12), ayahCount: 9 },
      { name: "الفيل", number: 11, src: audioPath(11), ayahCount: 5 },
    ]
  },
  {
    name: "قريش - الماعون - الكوثر", src: "/pages/602.jpg", surahs: [
      { name: "قريش", number: 10, src: audioPath(10), ayahCount: 4 },
      { name: "الماعون", number: 9, src: audioPath(9), ayahCount: 7 },
      { name: "الكوثر", number: 8, src: audioPath(8), ayahCount: 3 },
    ]
  },
  {
    name: "الكافرون - النصر - المسد", src: "/pages/603.jpg", surahs: [
      { name: "الكافرون", number: 7, src: audioPath(7), ayahCount: 6 },
      { name: "النصر", number: 6, src: audioPath(6), ayahCount: 3 },
      { name: "المسد", number: 5, src: audioPath(5), ayahCount: 5 },
    ]
  },
  {
    name: "الإخلاص - الفلق - الناس", src: "/pages/604.jpg", surahs: [
      { name: "الإخلاص", number: 4, src: audioPath(4), ayahCount: 4 },
      { name: "الفلق", number: 3, src: audioPath(3), ayahCount: 5 },
      { name: "الناس", number: 2, src: audioPath(2), ayahCount: 6 },
    ]
  },
];

const speakerColors: Record<Speaker, { bg: string; glow: string; text: string }> = {
  teacher: { bg: "rgba(250,204,21,0.30)", glow: "rgba(250,204,21,0.55)", text: "#b40909ff" },
  kids: { bg: "rgba(56,189,248,0.30)", glow: "rgba(56,189,248,0.55)", text: "#0369a1" },
};

import MushafComingSoon from "@/components/MushafComingSoon";

export default function QuranReader() {
  return <MushafComingSoon />;
}

function _UnusedQuranReader() {
  const navigate = useNavigate();
  const { requestPlay, notifyStop, registerAudio, unregisterAudio, simultaneousMode, setSimultaneousMode } = useAudioContext();

  // الصفحات المرفوعة من المعايرة تظهر في المصحف هنا (صورة + تظليل + سور من المناطق)
  const [customPageList, setCustomPageList] = useState(() => getCustomPages());
  const [customImgs, setCustomImgs] = useState<Record<string, string>>({});
  const [orderVersion, setOrderVersion] = useState(0);
  // يُعيد القراءة عند العودة للقارئ / عند اكتمال المزامنة من السيرفر (بلا تحديث يدوي)
  useEffect(() => {
    const refresh = () => { setCustomPageList(getCustomPages()); getAllPageImages().then(setCustomImgs).catch(() => {}); setOrderVersion(v => v + 1); setBookmarks(getBookmarks()); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("mushaf:sync_complete", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("mushaf:sync_complete", refresh); };
  }, []);
  const imgSrcFor = (src: string) => customImgs[src] || src;
  // تتبّع تحميل صور الصفحات: لا نُظهر التظليل إلا بعد ظهور الصورة (يمنع «تظليل فوق صفحة فارغة»)
  const [loadedImgs, setLoadedImgs] = useState<Set<string>>(() => new Set());
  const markLoaded = useCallback((src: string) => setLoadedImgs(prev => (prev.has(src) ? prev : new Set(prev).add(src))), []);

  // تتبّع وقت القراءة والدراسة وتسجيله في الإحصائيات والأوسمة
  useEffect(() => {
    let accumulatedSecs = 0;
    const flushMinutes = () => {
      if (accumulatedSecs >= 5) {
        const mins = Math.round((accumulatedSecs / 60) * 10) / 10;
        accumulatedSecs = 0;
        if (mins > 0) {
          const { justUnlocked } = addReadingMinutes(mins);
          // نقاط القراءة (المال): نجومتان لكل دقيقة — قليلة لكنها أكثر من نقاط الألعاب
          const stars = Math.max(1, Math.round(mins * 2));
          addCoins(stars);
          if (justUnlocked) {
            toast({ title: "🎉 أحسنت! اكتمل وقت الاستماع وفتحت الألعاب" });
            // يفتح الألعاب مباشرة عندما يتوفر الوقت — لا ننتظر
            navigate("/games", { replace: true });
          } else {
            toast({ title: `+${stars} ⭐ من القراءة` });
          }
        }
      }
    };

    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      // لا نحتسب إلا أثناء تشغيل فعلي للصوت (وليس تحميلاً/تخزيناً مؤقتاً)
      const a = audioRef.current;
      const isActuallyPlaying = !!a && !a.paused && !a.ended && a.readyState >= 3;
      if (!isActuallyPlaying) return;
      accumulatedSecs += 5;
      if (accumulatedSecs >= 30) {
        flushMinutes();
      }
    }, 5000);

    return () => {
      clearInterval(id);
      flushMinutes();
    };
  }, []);
  const pages = useMemo<PageInfo[]>(() => {
    const extra: PageInfo[] = customPageList.map(cp => {
      const regions = getPageSurahRegions(cp.src);
      const boxes = getPageAyahBoxes(cp.src);
      const surahs: SurahAudio[] = regions
        .filter(r => r.surah)
        .map(r => ({
          name: r.name || `سورة ${r.surah}`,
          number: r.surah as number,
          src: audioPath(r.surah as number),
          ayahCount: boxes.filter(b => b.surah === r.surah).length || 0,
        }));
      return { name: cp.name, src: cp.src, surahs };
    });
    return [...BASE_PAGES, ...extra];
  }, [customPageList]);

  const [currentPage, setCurrentPage] = useState(() => {
    const s = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return isNaN(s) || s < 0 || s >= pages.length ? 0 : s;
  });
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 1024 : false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio state
  const [activeSurah, setActiveSurah] = useState<SurahAudio | null>(null);
  const [selectedSurahIdx, setSelectedSurahIdx] = useState(0);
  const [selectedAyah, setSelectedAyah] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, _setPlayMode] = useState<PlayMode>("teacher");
  const [continuousPlay, _setContinuousPlay] = useState(true);
  const [repeatCount, _setRepeatCount] = useState(0);

  // === REFS that mirror state for use inside callbacks (avoids stale closures) ===
  const playModeRef = useRef<PlayMode>(playMode);
  const continuousPlayRef = useRef(continuousPlay);
  const repeatCountRef = useRef(repeatCount);

  // Wrapper setters that keep refs in sync
  const setPlayMode = useCallback((v: PlayMode | ((prev: PlayMode) => PlayMode)) => {
    _setPlayMode(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      playModeRef.current = next;
      return next;
    });
  }, []);
  const setContinuousPlay = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    _setContinuousPlay(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      continuousPlayRef.current = next;
      return next;
    });
  }, []);
  const setRepeatCount = useCallback((v: number | ((prev: number) => number)) => {
    _setRepeatCount(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      repeatCountRef.current = next;
      return next;
    });
  }, []);

  // Shuffle state
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledPageOrder, setShuffledPageOrder] = useState<number[]>([]);

  // ترتيب الصفحات (من شاشة «ترتيب» في المعايرة، مُخزَّن على السيرفر كقائمة src).
  // يُعاد حسابه عند تغيّر الصفحات أو اكتمال المزامنة (orderVersion).
  const customPageOrder = useMemo<number[]>(() => {
    const srcs = getPageOrder();
    if (srcs.length === 0) return [];
    const order = srcs.map((s: string) => pages.findIndex(p => p.src === s)).filter((i: number) => i >= 0);
    pages.forEach((_, i) => { if (!order.includes(i)) order.push(i); });
    return order;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, orderVersion]);

  // Split view state
  const [isSplitView, setIsSplitView] = useState(false);
  const [hideShading, setHideShading] = useState(false);
  // ركن الأطفال (قفل برمز) + لوحة التنقّل
  const [kidsMode, setKidsModeState] = useState(isKidsMode);
  const [kidsCorner, setKidsCorner] = useState(getKidsEnabled);   // ركن الأطفال مُفعَّل؟ (ليس وضع وليّ الأمر فقط)
  const [pinAction, setPinAction] = useState<null | "enter" | "exit" | "settings" >(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [surahListOpen, setSurahListOpen] = useState(false);
  const [navTab, setNavTab] = useState<"surahs" | "bookmarks">("surahs");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(getBookmarks);
  useEffect(() => { const h = () => setKidsModeState(isKidsMode()); window.addEventListener("mushaf:kidsmode", h); return () => window.removeEventListener("mushaf:kidsmode", h); }, []);
  useEffect(() => { const h = () => setKidsCorner(getKidsEnabled()); window.addEventListener("mushaf:appmode", h); return () => window.removeEventListener("mushaf:appmode", h); }, []);

  const [playExpired, setPlayExpired] = useState(() => getProgress().playExpired);
  useEffect(() => {
    const h = () => setPlayExpired(getProgress().playExpired);
    h();
    window.addEventListener("mushaf:activeprofile", h);
    window.addEventListener("focus", h);
    return () => {
      window.removeEventListener("mushaf:activeprofile", h);
      window.removeEventListener("focus", h);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !isBackgroundAudioEnabled() && isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
        setMediaPlaybackState("paused");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isPlaying]);

  // Simultaneous playback (teacher + kids together)
  const audioRef2 = useRef<HTMLAudioElement>(null);
  const [isSimultaneousPlaying, setIsSimultaneousPlaying] = useState(false);

  // Get the actual page index (shuffle > custom order > identity)
  const getActualPageIndex = useCallback((displayIdx: number) => {
    if (isShuffled && shuffledPageOrder.length > 0) {
      return shuffledPageOrder[displayIdx] ?? displayIdx;
    }
    if (customPageOrder.length > 0) {
      return customPageOrder[displayIdx] ?? displayIdx;
    }
    return displayIdx;
  }, [isShuffled, shuffledPageOrder, customPageOrder]);

  const actualPage = getActualPageIndex(currentPage);

  // ── ركن الأطفال: الدخول يقفل التطبيق، والخروج يتطلّب الرمز ──
  const enterKids = () => { if (hasKidsPin()) { setKidsLocked(true); navigate("/games"); } else setPinAction("enter"); };
  const requestExitKids = () => setPinAction("exit");
  // الإعدادات محميّة: تتطلّب رمز ولي الأمر إن كان مضبوطاً
  const openSettings = () => { if (hasKidsPin()) setPinAction("settings"); else navigate("/settings"); };
  const openTools = () => { /* أدوات المعلّم معطّلة */ };

  // ── قائمة كل السور للانتقال المباشر ──
  const allSurahsList = useMemo(() => {
    const out: { number: number; name: string; pageIdx: number; surahIdx: number }[] = [];
    pages.forEach((p, pi) => p.surahs.forEach((s, si) => out.push({ number: s.number, name: s.name, pageIdx: pi, surahIdx: si })));
    return out;
  }, [pages]);
  const jumpToSurah = (pageIdx: number, surahIdx: number) => {
    let display = pageIdx;
    if (customPageOrder.length > 0) { const d = customPageOrder.indexOf(pageIdx); if (d >= 0) display = d; }
    setCurrentPage(display);
    setSelectedSurahIdx(surahIdx);
    setSurahListOpen(false);
  };

  // ── العلامات المرجعية ──
  const addCurrentBookmark = () => {
    const page = pages[actualPage];
    if (!page) return;
    const sName = currentPageSurahs[selectedSurahIdx]?.name || currentPageSurahs[0]?.name;
    const bm: Bookmark = { id: `bm-${Date.now()}`, src: page.src, name: getPageDisplayName(page), surah: sName, createdAt: Date.now() };
    setBookmarks(addBookmark(bm));
    toast({ title: "تم حفظ العلامة", description: getPageDisplayName(page) });
  };
  const jumpToBookmark = (bm: Bookmark) => {
    const idx = pages.findIndex(p => p.src === bm.src);
    if (idx < 0) { toast({ title: "الصفحة غير متوفرة", variant: "destructive" }); return; }
    let display = idx;
    if (customPageOrder.length > 0) { const d = customPageOrder.indexOf(idx); if (d >= 0) display = d; }
    setCurrentPage(display);
    setSurahListOpen(false);
  };
  const delBookmark = (id: string) => setBookmarks(removeBookmark(id));

  // Page naming state
  const [editingPageName, setEditingPageName] = useState(false);
  const [tempPageName, setTempPageName] = useState("");
  const [pageNamesVersion, setPageNamesVersion] = useState(0);

  // Tauri Offline States
  const [offlineStatus, setOfflineStatus] = useState<Record<number, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<number, number>>({});
  const [isDownloading, setIsDownloading] = useState<Record<number, boolean>>({});

  // Check offline status for all surahs on current page
  const checkCurrentPageOffline = useCallback(async () => {
    if (!isTauri()) return;
    const page = pages[actualPage];
    if (!page) return;
    const status: Record<number, boolean> = {};
    for (const s of page.surahs) {
      status[s.number] = await checkOfflineStatus(s.number);
    }
    setOfflineStatus(prev => ({ ...prev, ...status }));
  }, [actualPage]);

  useEffect(() => {
    checkCurrentPageOffline();
  }, [actualPage, checkCurrentPageOffline]);

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

  const resolveAudioSrc = useCallback(async (surah: SurahAudio) => {
    try {
      const resolved = await resolvePlayableAudioUrl(surah.number, surah.src);
      if (resolved) return resolved;
    } catch (e) {
      console.warn("Offline audio resolution fallback:", e);
    }
    return surah.src;
  }, []);

  // Refs for tracking without re-renders
  const audioRef = useRef<HTMLAudioElement>(null);
  const requestRef = useRef<number>();
  const lastSavedTimeRef = useRef(0);
  const stopAtRef = useRef<number | null>(null);
  const currentRepeatRef = useRef(0);
  const currentAyahRef = useRef(-1);
  const currentBoxIndexRef = useRef(-1);
  const currentSpeakerRef = useRef<Speaker>("teacher");
  const currentBoxLabelRef = useRef<string | null>(null);
  const handleAyahSegmentEndRef = useRef<() => void>(() => {});
  const segmentEndGuardRef = useRef(false); // prevent double-fire from stopAt + onEnded
  const isHandlingSegmentEndRef = useRef(false);
  const isSeekingRef = useRef(false);
  const expectedStartTimeRef = useRef(0);
  const internalPauseRef = useRef(false); // guards against external pause listener firing on internal pauses
  const autoFollowRef = useRef(false); // true عندما يتغيّر الصفحة بسبب متابعة التشغيل لسورة ممتدّة على صفحتين (يمنع إيقاف الصوت)

  // Register mushaf audio with central AudioContext
  useEffect(() => {
    const a = audioRef.current;
    if (a) {
      registerAudio("mushaf", a);
    }
    return () => { unregisterAudio("mushaf"); };
  }, [registerAudio, unregisterAudio]);

  // Listen for external pause only (from AudioContext mutual exclusion)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const handlePause = () => {
      // Only react to external pauses (not internal segment-boundary pauses)
      if (internalPauseRef.current) {
        internalPauseRef.current = false;
        return;
      }
      setIsPlaying(false);
    };
    a.addEventListener("pause", handlePause);
    return () => a.removeEventListener("pause", handlePause);
  }, []);


  const clearAllHighlights = useCallback(() => {
    const rects = document.querySelectorAll('.ayah-rect');
    rects.forEach(r => {
      const el = r as SVGRectElement;
      el.style.fill = previewHighlight;
      el.style.stroke = previewStroke;
      el.style.strokeWidth = "1.5";
      el.classList.remove('animate-pulse', 'glow-kids');
    });
  }, []);

  const highlightAyah = useCallback((surahNum: number, ayahNum: number, speaker: Speaker, boxIndex?: number) => {
    clearAllHighlights();
    // Use surah+ayah selector to match across all pages (works for dual-page)
    const selector = `.ayah-rect-${surahNum}-${ayahNum}`;
    const boxes = document.querySelectorAll(selector);
    boxes.forEach(r => {
      const el = r as SVGRectElement;
      el.style.fill = speakerColors[speaker].bg;
      el.style.stroke = speakerColors[speaker].glow;
      el.style.strokeWidth = "5";
      el.classList.add('animate-pulse');
      if (speaker === 'kids') {
        el.classList.add('glow-kids');
      }
    });
  }, [clearAllHighlights]);

  // Shuffle handlers
  const handleShuffle = useCallback(() => {
    if (isShuffled) {
      setIsShuffled(false);
      setShuffledPageOrder([]);
    } else {
      const indices = Array.from({ length: pages.length }, (_, i) => i);
      setShuffledPageOrder(shuffleArray(indices));
      setIsShuffled(true);
      setCurrentPage(0);
    }
  }, [isShuffled]);

  // Page name display helper (re-read on version change)
  const currentPageName = useMemo(() => {
    void pageNamesVersion; // trigger re-computation
    return getPageDisplayName(pages[actualPage] || pages[0]);
  }, [actualPage, pageNamesVersion]);

  const handleSavePageName = useCallback(async () => {
    const page = pages[actualPage];
    if (page) {
      await saveCustomPageName(page.src, tempPageName);
      setPageNamesVersion(v => v + 1);
    }
    setEditingPageName(false);
  }, [actualPage, tempPageName]);

  const handleStartEditPageName = useCallback(() => {
    setTempPageName(currentPageName);
    setEditingPageName(true);
  }, [currentPageName]);

  useEffect(() => {
    const r = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", r); return () => window.removeEventListener("resize", r);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.debug("Fullscreen toggle failed:", err);
    }
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, String(currentPage)); }, [currentPage]);

  useEffect(() => {
    // تغيُّر الصفحة بسبب متابعة التشغيل لسورة ممتدّة على صفحتين: لا توقف الصوت ولا تُصفّر الحالة
    if (autoFollowRef.current) { autoFollowRef.current = false; return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setActiveSurah(null); setIsPlaying(false); currentAyahRef.current = -1; currentBoxIndexRef.current = -1;
    setSelectedSurahIdx(0); setSelectedAyah(-1);
    stopAtRef.current = null; currentRepeatRef.current = 0;
    setEditingPageName(false);
    clearAllHighlights();
  }, [currentPage, clearAllHighlights]);

  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const savedNum = parseInt(localStorage.getItem(MUSHAF_LAST_SURAH) || "0", 10);
    const savedTime = parseFloat(localStorage.getItem(MUSHAF_LAST_TIME) || "0");
    if (!savedNum) return;
    const surahIdx = pages[actualPage]?.surahs.findIndex(s => s.number === savedNum) ?? -1;
    if (surahIdx === -1) return;
    const surah = pages[actualPage].surahs[surahIdx];
    const a = audioRef.current; if (!a) return;
    
    resolveAudioSrc(surah).then(src => {
      a.src = src; a.load();
      setActiveSurah(surah);
      setSelectedSurahIdx(surahIdx);
      a.addEventListener("loadedmetadata", () => {
        if (savedTime > 0 && savedTime < a.duration) {
          a.currentTime = savedTime;
          lastSavedTimeRef.current = savedTime;
        }
      }, { once: true });
    });
  }, [currentPage, resolveAudioSrc, actualPage]);



  const getActualAyahCount = useCallback((surahNumber: number, fallback: number) => {
    const pageBoxes = pages.flatMap(p => getPageAyahBoxes(p.src));
    const surahBoxes = pageBoxes.filter(b => b.surah === surahNumber);
    if (surahBoxes.length === 0) return fallback;
    return Math.max(...surahBoxes.map(b => b.ayah));
  }, []);

  const playAyah = useCallback(async (surah: SurahAudio, ayahNum: number, forceSpeaker?: Speaker, boxIndex?: number) => {
    const a = audioRef.current; if (!a) return;
    const targetSrc = await resolveAudioSrc(surah);
    const sameSrc = a.src === targetSrc || (a.src && a.src.endsWith(surah.src.split("/").pop() || surah.src));

    setActiveSurah(surah);
    currentAyahRef.current = ayahNum;
    currentBoxIndexRef.current = boxIndex ?? -1;
    stopAtRef.current = null;

    // متابعة عبر الصفحات: إن كان صندوق هذه الآية في صفحة غير المعروضة، اقلب إليها دون إيقاف الصوت
    // (لا يقع هذا للسور المضمّنة لأن كل سورة على صفحة واحدة — يُفعَّل فقط لسورة موزّعة على صفحتين)
    {
      const allBoxes = pages.flatMap(p => getPageAyahBoxes(p.src));
      const tgtIdx = boxIndex !== undefined ? boxIndex : allBoxes.findIndex(b => b.surah === surah.number && b.ayah === ayahNum);
      if (tgtIdx >= 0) {
        let ownerActual = -1, acc = 0;
        for (let pi = 0; pi < pages.length; pi++) {
          const len = getPageAyahBoxes(pages[pi].src).length;
          if (tgtIdx < acc + len) { ownerActual = pi; break; }
          acc += len;
        }
        if (ownerActual >= 0 && ownerActual !== actualPage) {
          let displayIdx = ownerActual;
          if (isShuffled && shuffledPageOrder.length > 0) displayIdx = shuffledPageOrder.indexOf(ownerActual);
          else if (customPageOrder.length > 0) displayIdx = customPageOrder.indexOf(ownerActual);
          if (displayIdx >= 0) {
            currentBoxIndexRef.current = -1;   // يُعاد التظليل بعد ظهور صناديق الصفحة الجديدة
            autoFollowRef.current = true;
            setCurrentPage(displayIdx);
          }
        }
      }
    }

    const startPlayback = () => {
      const sp: Speaker = forceSpeaker ?? "teacher";
      currentSpeakerRef.current = sp;

      const timings = getSavedTimings()[surah.number];
      const segments = timings?.segments || [];

      let startT = 0;
      let nextT = a.duration || 1e9;
      let foundTimingInBox = false;

      const pageBoxes = pages.flatMap(p => getPageAyahBoxes(p.src));
      const surahBoxes = pageBoxes.filter(b => b.surah === surah.number);
      const box = boxIndex !== undefined ? pageBoxes[boxIndex] : surahBoxes.find(b => b.ayah === ayahNum);

      if (box) {
         if (sp === "teacher" && box.audioStart !== undefined && box.audioEnd !== undefined) {
             startT = box.audioStart;
             nextT = box.audioEnd;
             foundTimingInBox = true;
         } else if (sp === "kids" && box.kidsStart !== undefined && box.kidsEnd !== undefined) {
             startT = box.kidsStart;
             nextT = box.kidsEnd;
             foundTimingInBox = true;
         }
      }

      if (!foundTimingInBox) {
        if (segments.length > 0) {
          const speakerSegments = segments.filter(s => s.speaker === sp).sort((a, b) => a.start - b.start);
          const segIdx = ayahNum > 0 ? ayahNum - 1 : 0;
          const seg = speakerSegments[segIdx];
          if (seg) {
            startT = seg.start;
            nextT = seg.end;
          } else {
            setIsPlaying(false);
            return;
          }
        } else {
          const list = sp === "kids" && timings?.kids ? timings.kids : timings?.teacher || [];
          const segIdx = ayahNum > 0 ? ayahNum - 1 : 0;
          
          if (list[segIdx] !== undefined) {
            startT = list[segIdx];
            nextT = list[segIdx + 1] !== undefined ? list[segIdx + 1] : a.duration || 1e9;
            
            // Split-file format: Teacher stops when the entire Kids section starts
            if (sp === "teacher" && timings?.kidsStart !== undefined && nextT > timings.kidsStart) {
              nextT = timings.kidsStart;
            }
            
            // Interleaved format: Teacher stops when the Kid starts for the SAME ayah
            if (sp === "teacher" && timings?.kids && timings.kids[segIdx] !== undefined) {
              const kidStartT = timings.kids[segIdx];
              if (kidStartT > startT && kidStartT < nextT) {
                nextT = kidStartT;
              }
            }

            // Interleaved format: Kid stops when the Teacher starts for the NEXT ayah
            if (sp === "kids" && timings?.teacher && timings.teacher[segIdx + 1] !== undefined) {
              const nextTeacherStart = timings.teacher[segIdx + 1];
              if (nextTeacherStart > startT && nextTeacherStart < nextT) {
                nextT = nextTeacherStart;
              }
            }
          }
        }
      }

      stopAtRef.current = nextT;
      isSeekingRef.current = true;
      expectedStartTimeRef.current = startT;
      a.currentTime = startT;
      requestPlay("mushaf", a);
      a.play().then(() => {
        setIsPlaying(true);
        updateMediaSession({
          title: `سورة ${surah.name} - آية ${ayahNum}`,
          artist: "القارئ حاج أيوب أمين",
          album: "المصحف المرتل برواية ورش",
          onPlay: () => { const aud = audioRef.current; if (aud) aud.play().catch(() => {}); },
          onPause: () => { const aud = audioRef.current; if (aud) aud.pause(); },
        });
        setMediaPlaybackState("playing");
        // ضمان إعادة تشغيل حلقة التتبع لكل مقطع جديد (تكرار/طفل/آية تالية)
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(trackAudio);
      }).catch(console.error);
    };

    if (!sameSrc) {
      a.src = targetSrc;
      a.load();
      a.addEventListener("loadedmetadata", startPlayback, { once: true });
    } else {
      if (a.duration > 0) startPlayback();
      else a.addEventListener("loadedmetadata", startPlayback, { once: true });
    }
  }, [actualPage, resolveAudioSrc, isShuffled, shuffledPageOrder, customPageOrder]);

  const advanceSurah = useCallback((sp: Speaker) => {
    if (!activeSurah) return;
    const page = pages[actualPage];
    const surahIdx = page.surahs.findIndex(s => s.number === activeSurah.number);
    if (surahIdx >= 0 && surahIdx < page.surahs.length - 1) {
      const nextSurah = page.surahs[surahIdx + 1];
      setSelectedSurahIdx(surahIdx + 1);
      
      const pageBoxes = pages.flatMap(p => getPageAyahBoxes(p.src));
      const nextSurahBoxes = pageBoxes.filter(b => b.surah === nextSurah.number).sort((a,b) => a.ayah - b.ayah);
      const firstAyah = nextSurahBoxes[0]?.ayah ?? 1;
      const firstBoxIndex = nextSurahBoxes.length > 0 ? pageBoxes.indexOf(nextSurahBoxes[0]) : undefined;
      
      setSelectedAyah(firstAyah);
      playAyah(nextSurah, firstAyah, sp, firstBoxIndex);
    } else {
      setIsPlaying(false);
      clearAllHighlights();
    }
  }, [activeSurah, actualPage, playAyah, clearAllHighlights]);

  const handleAyahSegmentEnd = useCallback(() => {
    stopAtRef.current = null;
    isHandlingSegmentEndRef.current = false;
    const a = audioRef.current; if (!a || !activeSurah) return;

    // === READ FROM REFS to always get the latest values (not stale closures) ===
    const mode = playModeRef.current;
    const repeat = repeatCountRef.current;
    const continuous = continuousPlayRef.current;

    const timings = getSavedTimings()[activeSurah.number];
    // كشف صوت الطفل من مصدرين: التوقيتات المحفوظة + صناديق المعايرة
    const boxHasKids = pages
      .flatMap(p => getPageAyahBoxes(p.src))
      .some(b => b.surah === activeSurah.number && b.ayah === currentAyahRef.current
        && b.kidsStart !== undefined && b.kidsEnd !== undefined);
    const hasKids = boxHasKids || timings?.segments?.some(s => s.speaker === "kids") || timings?.kidsStart !== undefined;

    const advanceToNextSegment = (sp: Speaker) => {
      const pageBoxes = pages.flatMap(p => getPageAyahBoxes(p.src));
      const surahBoxesUnsorted = pageBoxes.filter(b => b.surah === activeSurah.number);
      const sortedBoxesWithIndex = surahBoxesUnsorted.map(b => ({ box: b, globalIndex: pageBoxes.indexOf(b) }))
        .sort((a, b) => a.box.ayah - b.box.ayah);

      let nextItem = null;
      let currentIndex = -1;

      if (currentBoxIndexRef.current !== -1) {
        currentIndex = sortedBoxesWithIndex.findIndex(item => item.globalIndex === currentBoxIndexRef.current);
      } else {
        currentIndex = sortedBoxesWithIndex.map(item => item.box.ayah).lastIndexOf(currentAyahRef.current);
      }

      for (let i = currentIndex + 1; i < sortedBoxesWithIndex.length; i++) {
        const candidate = sortedBoxesWithIndex[i];
        // أجزاء الآية الواحدة (نفس رقم الآية) تُعدّ وحدة واحدة — تخطَّها وانتقل للآية التالية
        if (candidate.box.ayah === currentAyahRef.current) continue;
        nextItem = candidate;
        break;
      }

      if (nextItem) {
        setSelectedAyah(nextItem.box.ayah);
        playAyah(activeSurah, nextItem.box.ayah, sp, nextItem.globalIndex);
      } else {
        advanceSurah(sp);
      }
    };

    // "teacher" or "kids" only mode
    const speakerForMode: Speaker = mode === "kids" ? "kids" : "teacher";

    if (currentRepeatRef.current < repeat) {
      currentRepeatRef.current++;
      playAyah(activeSurah, currentAyahRef.current, speakerForMode, currentBoxIndexRef.current !== -1 ? currentBoxIndexRef.current : undefined);
    } else {
      currentRepeatRef.current = 0;
      if (continuous) {
        advanceToNextSegment(speakerForMode);
      } else {
        setIsPlaying(false);
        clearAllHighlights();
      }
    }
  }, [activeSurah, playAyah, actualPage, advanceSurah, clearAllHighlights]);

  const trackAudio = useCallback(() => {
    const a = audioRef.current;
    if (!a || !activeSurah) return;

    if (a.seeking) return;
    if (isSeekingRef.current) {
      if (Math.abs(a.currentTime - expectedStartTimeRef.current) < 0.15) {
        isSeekingRef.current = false;
      } else {
        return;
      }
    }

    if (stopAtRef.current !== null && a.currentTime >= stopAtRef.current - 0.05) {
      a.pause();
      setIsPlaying(false);
      segmentEndGuardRef.current = true;
      handleAyahSegmentEndRef.current();
      return;
    }

    const pageBoxes = pages.flatMap(p => getPageAyahBoxes(p.src));
    const surahBoxes = pageBoxes.filter(b => b.surah === activeSurah.number);

    let activeBox = null;
    let foundSpeaker: Speaker | null = null;
    let activeBoxGlobalIndex = -1;

    for (let i = 0; i < pageBoxes.length; i++) {
      const box = pageBoxes[i];
      if (box.surah !== activeSurah.number) continue;

      if (box.audioStart !== undefined && box.audioEnd !== undefined && a.currentTime >= box.audioStart && a.currentTime <= box.audioEnd) {
        activeBox = box;
        foundSpeaker = "teacher";
        activeBoxGlobalIndex = i;
        break;
      }
      if (box.kidsStart !== undefined && box.kidsEnd !== undefined && a.currentTime >= box.kidsStart && a.currentTime <= box.kidsEnd) {
        activeBox = box;
        foundSpeaker = "kids";
        activeBoxGlobalIndex = i;
        break;
      }
    }

    if (activeBox && foundSpeaker) {
      if (activeBoxGlobalIndex !== currentBoxIndexRef.current || foundSpeaker !== currentSpeakerRef.current) {
        currentAyahRef.current = activeBox.ayah;
        currentBoxIndexRef.current = activeBoxGlobalIndex;
        currentSpeakerRef.current = foundSpeaker;
        currentBoxLabelRef.current = activeBox.label || null;
        highlightAyah(activeSurah.number, activeBox.ayah, foundSpeaker, activeBoxGlobalIndex);
      }
    } else {
      const timings = getSurahTimings(activeSurah.number);
      const segments = timings?.segments || [];
      if (segments.length > 0) {
        const activeSeg = segments.find(s => a.currentTime >= s.start && a.currentTime <= s.end);
        if (activeSeg) {
          // Use segment's own ayah field if available, fallback to index-based lookup
          const segAyah = activeSeg.ayah;
          let ayahNumber: number;
          if (segAyah !== undefined) {
            ayahNumber = segAyah;
          } else {
            const speakerSegments = segments.filter(s => s.speaker === activeSeg.speaker).sort((a, b) => a.start - b.start);
            const ayahIdx = speakerSegments.findIndex(s => s.id === activeSeg.id);
            const sortedBoxes = [...surahBoxes].sort((a, b) => a.ayah - b.ayah);
            ayahNumber = sortedBoxes[ayahIdx]?.ayah ?? (ayahIdx + 1);
          }

          if (ayahNumber !== currentAyahRef.current || activeSeg.speaker !== currentSpeakerRef.current || currentBoxIndexRef.current !== -1) {
            currentAyahRef.current = ayahNumber;
            currentBoxIndexRef.current = -1;
            currentSpeakerRef.current = activeSeg.speaker;
            currentBoxLabelRef.current = null;
            highlightAyah(activeSurah.number, ayahNumber, activeSeg.speaker);
          }
        } else {
          if (currentAyahRef.current !== -1) {
            currentAyahRef.current = -1;
            currentBoxIndexRef.current = -1;
            clearAllHighlights();
          }
        }
      } else {
        if (timings && timings.teacher.length > 0) {
          let speaker: Speaker = "teacher";
          if (timings.kidsStart !== undefined && a.currentTime >= timings.kidsStart) {
            speaker = "kids";
          }
          const list = speaker === "kids" && timings.kids ? timings.kids : timings.teacher;
          let idx = 0;
          for (let i = 0; i < list.length; i++) {
            if (list[i] <= a.currentTime + 0.05) idx = i;
            else break;
          }
          const sortedBoxes = [...surahBoxes].sort((a, b) => a.ayah - b.ayah);
          const actualCount = getActualAyahCount(activeSurah.number, activeSurah.ayahCount);
          const fallbackNumber = Math.min(idx + 1, actualCount);
          const ayahNumber = sortedBoxes[idx]?.ayah ?? fallbackNumber;
          if (ayahNumber !== currentAyahRef.current || speaker !== currentSpeakerRef.current || currentBoxIndexRef.current !== -1) {
            currentAyahRef.current = ayahNumber;
            currentBoxIndexRef.current = -1;
            currentSpeakerRef.current = speaker;
            currentBoxLabelRef.current = null;
            highlightAyah(activeSurah.number, ayahNumber, speaker);
          }
        } else {
          // Linear estimation fallback when no timings exist
          const total = activeSurah.ayahCount;
          if (total > 0 && a.duration > 0 && isFinite(a.duration)) {
            const ayahDur = a.duration / total;
            const idx = Math.min(Math.floor(a.currentTime / ayahDur), total - 1);
            const sortedBoxes = [...surahBoxes].sort((a, b) => a.ayah - b.ayah);
            const matchingBox = sortedBoxes[idx] || surahBoxes.find(b => b.ayah === idx + 1);
            if (matchingBox) {
              const ayahNumber = matchingBox.ayah;
              const globalIdx = pageBoxes.indexOf(matchingBox);
              const speaker = currentSpeakerRef.current || "teacher";
              if (ayahNumber !== currentAyahRef.current || speaker !== currentSpeakerRef.current || currentBoxIndexRef.current !== globalIdx) {
                currentAyahRef.current = ayahNumber;
                currentBoxIndexRef.current = globalIdx;
                currentSpeakerRef.current = speaker;
                currentBoxLabelRef.current = matchingBox.label || null;
                highlightAyah(activeSurah.number, ayahNumber, speaker, globalIdx);
              }
            }
          }
        }
      }
    }

    if (Math.abs(a.currentTime - lastSavedTimeRef.current) >= 2) {
      lastSavedTimeRef.current = a.currentTime;
      localStorage.setItem(MUSHAF_LAST_SURAH, String(activeSurah.number));
      localStorage.setItem(MUSHAF_LAST_TIME, String(a.currentTime));
    }

    if (!a.paused) {
      requestRef.current = requestAnimationFrame(trackAudio);
    }
  }, [activeSurah, actualPage, getActualAyahCount, handleAyahSegmentEnd, highlightAyah, clearAllHighlights]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(trackAudio);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, trackAudio]);


  // Keep ref always pointing to the latest handleAyahSegmentEnd
  useEffect(() => {
    handleAyahSegmentEndRef.current = handleAyahSegmentEnd;
  }, [handleAyahSegmentEnd]);


  const togglePlayPause = () => {
    const a = audioRef.current; if (!a || !activeSurah) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      if (currentAyahRef.current === -1) {
        const pageBoxes = pages.flatMap(p => getPageAyahBoxes(p.src));
        const surahBoxes = pageBoxes.filter(b => b.surah === activeSurah.number).sort((a,b) => a.ayah - b.ayah);
        const firstAyah = surahBoxes[0]?.ayah ?? 1;
        playAyah(activeSurah, firstAyah, playMode === "kids" ? "kids" : "teacher");
      } else {
        a.play().then(() => setIsPlaying(true)).catch(() => { });
      }
    }
  };

  // Swipe page turning gestures
  const touchStartXRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? null;
    if (endX !== null) {
      const diffX = endX - touchStartXRef.current;
      const swipeThreshold = 50; // pixels
      if (diffX > swipeThreshold) {
        // Dragged finger to the right (RTL: Go to previous page)
        goPrev();
      } else if (diffX < -swipeThreshold) {
        // Dragged finger to the left (RTL: Go to next page)
        goNext();
      }
    }
    touchStartXRef.current = null;
  };

  const step = 1; // صفحة واحدة دائماً (حاسوب وجوال)
  const totalDisplayPages = isShuffled ? shuffledPageOrder.length : pages.length;
  const goToPage = useCallback((i: number) => { if (i >= 0 && i < totalDisplayPages) setCurrentPage(i); }, [totalDisplayPages]);
  const goPrev = useCallback(() => goToPage(Math.max(0, currentPage - step)), [currentPage, goToPage, step]);
  const goNext = useCallback(() => goToPage(Math.min(totalDisplayPages - 1, currentPage + step)), [currentPage, totalDisplayPages, goToPage, step]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goPrev();
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "Escape") { if (controlsOpen) setControlsOpen(false); else navigate("/audio"); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [controlsOpen, navigate, goPrev, goNext]);

  // تحميل مسبق لصور الصفحة الحالية وجيرانها (تظهر فوراً عند التنقّل) — بأولوية عالية للحالية
  useEffect(() => {
    [currentPage, currentPage + 1, currentPage - 1]
      .filter(d => d >= 0 && d < totalDisplayPages)
      .forEach((d, order) => {
        const p = pages[getActualPageIndex(d)];
        if (!p) return;
        const img = new Image();
        try { (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = order === 0 ? "high" : "low"; } catch { /* ignore */ }
        img.decoding = "async";
        img.src = imgSrcFor(p.src);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalDisplayPages, getActualPageIndex, customImgs, pages]);

  const visiblePages = useMemo(() => {
    // صفحة واحدة فقط دائماً (حتى على الحاسوب)
    return [pages[getActualPageIndex(currentPage)]].filter(Boolean) as PageInfo[];
  }, [currentPage, getActualPageIndex]);

  const currentPageSurahs = pages[actualPage]?.surahs || [];
  const selectedSurah = currentPageSurahs[selectedSurahIdx] || currentPageSurahs[0];
  const ayahCount = selectedSurah ? getActualAyahCount(selectedSurah.number, selectedSurah.ayahCount) : 0;

  // ========== Simultaneous Play (Teacher + Kids at the same time) ==========
  const playSimultaneous = useCallback(async (surah: SurahAudio) => {
    const a1 = audioRef.current;
    const a2 = audioRef2.current;
    if (!a1 || !a2) return;

    const targetSrc = await resolveAudioSrc(surah);
    const timings = getSavedTimings()[surah.number];
    if (!timings) return;

    // Teacher plays from the start
    const teacherStart = timings.teacher?.[0] ?? 0;
    // Kids plays from kidsStart or kids[0]
    const kidsStart = timings.kidsStart ?? timings.kids?.[0] ?? 0;

    if (kidsStart === 0 && !timings.kids) return; // No kids section

    // Set up both audios
    a1.src = targetSrc;
    a2.src = targetSrc;

    setActiveSurah(surah);
    requestPlay("mushaf", a1);

    const startBoth = () => {
      a1.currentTime = teacherStart;
      a2.currentTime = kidsStart;
      a1.play().catch(console.error);
      a2.play().catch(console.error);
      setIsPlaying(true);
      setIsSimultaneousPlaying(true);
    };

    a1.load();
    a2.load();

    // Wait for both to load
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded >= 2) startBoth();
    };
    a1.addEventListener("loadedmetadata", onLoad, { once: true });
    a2.addEventListener("loadedmetadata", onLoad, { once: true });
  }, [resolveAudioSrc, requestPlay]);

  const stopSimultaneous = useCallback(() => {
    const a2 = audioRef2.current;
    if (a2) { a2.pause(); a2.currentTime = 0; }
    setIsSimultaneousPlaying(false);
  }, []);

  // ========== Split View Surah Data ==========
  const allPageSurahs = useMemo(() => {
    return pages.flatMap(p => p.surahs.map(s => ({
      number: s.number,
      name: s.name,
      audioSrc: s.src,
    })));
  }, []);

  const handleSplitViewSelect = useCallback((surah: { number: number; name: string; audioSrc: string }) => {
    // Find which page this surah belongs to
    const pageIdx = pages.findIndex(p => p.surahs.some(s => s.number === surah.number));
    if (pageIdx !== -1) {
      // Navigate to that page
      if (isShuffled) {
        const displayIdx = shuffledPageOrder.indexOf(pageIdx);
        if (displayIdx !== -1) setCurrentPage(displayIdx);
      } else {
        setCurrentPage(pageIdx);
      }
      // Find the surah on that page and play it
      const pageSurahs = pages[pageIdx].surahs;
      const surahIdx = pageSurahs.findIndex(s => s.number === surah.number);
      if (surahIdx !== -1) {
        setTimeout(() => {
          setSelectedSurahIdx(surahIdx);
          const pageBoxes = getPageAyahBoxes(pages[pageIdx].src);
          const surahBoxes = pageBoxes.filter(b => b.surah === surah.number).sort((a, b) => a.ayah - b.ayah);
          const firstAyah = surahBoxes[0]?.ayah ?? 1;
          setSelectedAyah(firstAyah);
          playAyah(pageSurahs[surahIdx], firstAyah, playMode === "kids" ? "kids" : "teacher");
        }, 100);
      }
    }
  }, [isShuffled, shuffledPageOrder, playAyah, playMode]);

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 bg-background overflow-hidden select-none">
      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlaying(false);
          stopSimultaneous();
          if (segmentEndGuardRef.current) {
            segmentEndGuardRef.current = false;
            return;
          }
          handleAyahSegmentEndRef.current();
        }}
        onSeeked={() => {
          const a = audioRef.current;
          if (a && Math.abs(a.currentTime - expectedStartTimeRef.current) < 0.15) {
            isSeekingRef.current = false;
          }
        }}
        onError={() => {
          console.warn("QuranReader audio error, falling back to network stream...");
          if (selectedSurah && audioRef.current && audioRef.current.src !== selectedSurah.src) {
            audioRef.current.src = selectedSurah.src;
            audioRef.current.load();
            audioRef.current.play().catch(() => {});
          }
        }}
      />
      {/* Second audio for simultaneous teacher+kids playback */}
      <audio ref={audioRef2} />

      {/* Main content area: mushaf + optional split panel */}
      <div className="flex h-full w-full" dir="rtl">
        {/* Mushaf pages area */}
        <div 
          className={`flex h-full transition-all duration-300 ${isSplitView ? 'w-[60%]' : 'w-full'}`}
          onTouchStart={handleTouchStart} 
          onTouchEnd={handleTouchEnd}
          onClick={() => { }}
        >
          {/* Single page wrapper — centered & hugging the page on desktop */}
          <div className={`flex h-full w-full ${isDesktop ? 'px-4 py-2 justify-center' : ''}`}>
            <div className={`flex h-full ${isDesktop ? 'shadow-2xl rounded-lg overflow-hidden ring-1 ring-black/5' : 'w-full'}`}>
          {visiblePages.map((page, idx) => (
            <div key={`${page.src}-${idx}`} className={`relative h-full ${isDesktop ? '' : 'flex-1'} min-w-0 flex items-center justify-center bg-background overflow-hidden p-1`}>
              <div
                className={`relative ${isDesktop ? 'shadow-none' : 'shadow-xl'}`}
                style={{ aspectRatio: `${PAGE_IMAGE_SIZE.width}/${PAGE_IMAGE_SIZE.height}`, height: '100%', maxWidth: '100%' }}
              >
                <img src={imgSrcFor(page.src)} alt={page.name}
                  className={`absolute inset-0 w-full h-full select-none transition-opacity duration-300 ${loadedImgs.has(page.src) ? "opacity-100" : "opacity-0"}`}
                  draggable={false} decoding="async"
                  onLoad={() => markLoaded(page.src)} onError={() => markLoaded(page.src)}
                  ref={(el) => { if (!el) return; (el as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "high"; if (el.complete && el.naturalWidth > 0) markLoaded(page.src); }} />
                {/* هيكل تحميل لطيف حتى تظهر الصورة (لا تظليل فوق فراغ) */}
                {!loadedImgs.has(page.src) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card">
                    <div className="w-10 h-10 rounded-full border-[3px] border-accent/25 border-t-accent animate-spin" />
                  </div>
                )}
                {loadedImgs.has(page.src) && !hideShading && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${PAGE_IMAGE_SIZE.width} ${PAGE_IMAGE_SIZE.height}`} preserveAspectRatio="none">
                  {getPageAyahBoxes(page.src).map((box, i) => (
                    <rect
                      key={`ayah-rect-${box.surah}-${box.ayah}-${i}`}
                      className={`ayah-rect ayah-rect-${box.surah}-${box.ayah}`}
                      x={box.x} y={box.y} width={box.width} height={box.height} rx="18" ry="14"
                      fill={previewHighlight.replace(/rgb\(([^)]+)\)/, "rgba($1, 0.3)")} stroke={previewStroke} strokeWidth={1.5}
                      style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
                    />
                  ))}
                </svg>
                )}
                <div className="absolute inset-0">
                  {getPageAyahBoxes(page.src).map((box, i) => {
                    const surah = page.surahs.find((s) => s.number === box.surah);
                    if (!surah) return null;
                    return (
                      <button
                        key={`${box.surah}-${box.ayah}-tap-${i}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const sIdx = currentPageSurahs.findIndex(s => s.number === surah.number);
                          if (sIdx !== -1) setSelectedSurahIdx(sIdx);
                          setSelectedAyah(box.ayah);
                          currentRepeatRef.current = 0;
                          setControlsOpen(true);
                          if (isSimultaneousPlaying) { stopSimultaneous(); }
                          // بلا فهرس صندوق: يجد الجزء الأول للآية بالرقم (يعالج الآيات متعددة الأجزاء)
                          playAyah(surah, box.ayah, playModeRef.current === "kids" ? "kids" : "teacher");
                        }}
                        className="absolute rounded-md outline-none transition-colors hover:bg-accent/10 active:bg-accent/20"
                        style={{
                          left: `${(box.x / PAGE_IMAGE_SIZE.width) * 100}%`, top: `${(box.y / PAGE_IMAGE_SIZE.height) * 100}%`,
                          width: `${(box.width / PAGE_IMAGE_SIZE.width) * 100}%`, height: `${(box.height / PAGE_IMAGE_SIZE.height) * 100}%`,
                        }}
                        aria-label={`${surah.name} - آية ${box.ayah}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
            </div>
          </div>
        </div>

        {/* Split View Panel */}
        {isSplitView && (
          <div className="w-[40%] h-full border-r border-white/10 animate-fade-in">
            <SplitViewPanel
              surahs={allPageSurahs}
              currentPlaying={activeSurah?.number ?? null}
              isPlaying={isPlaying}
              onSelect={handleSplitViewSelect}
              onClose={() => setIsSplitView(false)}
            />
          </div>
        )}
      </div>

      {!controlsOpen && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-0.5 opacity-50 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => setControlsOpen(true)}>
          <div className="w-10 h-1 rounded-full bg-foreground/60" />
          <span className="text-[10px] font-bold text-foreground/70">افتح الإعدادات</span>
        </div>
      )}

      {activeSurah && isPlaying && currentAyahRef.current >= 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-sky-400/20 backdrop-blur-md border border-sky-300/30 px-6 py-2.5 rounded-full shadow-lg flex items-center gap-3">
            <span className="font-amiri text-sky-800 font-bold text-lg">
              {activeSurah.name} - {currentBoxLabelRef.current ? currentBoxLabelRef.current : `آية ${currentAyahRef.current}`}
            </span>
            <Headphones className="w-5 h-5 text-sky-600 animate-pulse" />
          </div>
        </div>
      )}

      {/* ── أيقونات الخيارات (منفصلة، أسفل وسط الشاشة) ── */}
      {!controlsOpen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2" dir="rtl">
          {([
            !kidsMode && { key: "back", icon: <ArrowRight className="w-5 h-5 text-foreground" />, label: "رجوع", onClick: () => navigate("/audio"), active: false },
            { key: "hide", icon: hideShading ? <Eye className="w-5 h-5 text-foreground" /> : <EyeOff className="w-5 h-5 text-foreground" />, label: hideShading ? "إظهار التظليل" : "إخفاء التظليل", onClick: () => setHideShading(v => !v), active: hideShading },
            { key: "surahs", icon: <List className="w-5 h-5 text-foreground" />, label: "قائمة السور", onClick: () => setSurahListOpen(true), active: surahListOpen },
            kidsMode && !playExpired && { key: "games", icon: <Baby className="w-5 h-5 text-foreground" />, label: "الألعاب", onClick: () => navigate("/games"), active: false },
            kidsMode
              ? { key: "lock", icon: <Lock className="w-5 h-5 text-foreground" />, label: "خروج من ركن الأطفال", onClick: requestExitKids, active: true }
              : (kidsCorner && { key: "kids", icon: <Baby className="w-5 h-5 text-foreground" />, label: "ركن الأطفال", onClick: enterKids, active: false }),
            !kidsMode && { key: "notifications", icon: <Bell className="w-5 h-5 text-foreground" />, label: "الإشعارات", onClick: () => setShowNotifications(true), active: false },
            !kidsMode && { key: "settings", icon: <Settings className="w-5 h-5 text-foreground" />, label: "الإعدادات", onClick: openSettings, active: false },
          ].filter(Boolean) as { key: string; icon: JSX.Element; label: string; onClick: () => void; active: boolean }[]).map(b => (
            <button
              key={b.key}
              onClick={b.onClick}
              aria-label={b.label}
              title={b.label}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95"
              style={{ background: b.active ? "rgba(250,204,21,0.7)" : "rgba(255,255,255,0.72)", backdropFilter: "blur(12px) saturate(140%)" }}
            >
              {b.icon}
            </button>
          ))}
        </div>
      )}

      {/* لوحة التنقّل — السور والعلامات المرجعية */}
      {surahListOpen && (
        <div className="absolute inset-0 z-[55] flex items-end justify-center bg-black/50 animate-fade-in" onClick={() => setSurahListOpen(false)}>
          <div className="w-full max-w-md max-h-[72vh] overflow-y-auto rounded-t-3xl p-3 shadow-2xl border-t border-white/40"
            style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)" }} onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 bg-foreground/5 rounded-xl p-1">
                <button onClick={() => setNavTab("surahs")} className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 ${navTab === "surahs" ? "bg-amber-400 text-black" : "text-foreground/70"}`}><List className="w-4 h-4" /> السور</button>
                <button onClick={() => setNavTab("bookmarks")} className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 ${navTab === "bookmarks" ? "bg-amber-400 text-black" : "text-foreground/70"}`}><BookmarkIcon className="w-4 h-4" /> العلامات</button>
              </div>
              <button onClick={() => setSurahListOpen(false)} className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            {navTab === "surahs" ? (
              <div className="grid grid-cols-2 gap-2">
                {allSurahsList.map((s, i) => (
                  <button key={`${s.number}-${i}`} onClick={() => jumpToSurah(s.pageIdx, s.surahIdx)}
                    className="p-2.5 rounded-xl bg-foreground/5 hover:bg-amber-200/70 text-right font-bold text-sm flex items-center justify-between gap-2 active:scale-[0.98] transition-all">
                    <span className="truncate">{s.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{s.number}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <button onClick={addCurrentBookmark} className="w-full p-2.5 rounded-xl bg-amber-500 text-black font-bold flex items-center justify-center gap-1 active:scale-95"><Plus className="w-4 h-4" /> أضف علامة للموضع الحالي</button>
                {bookmarks.length === 0 && <p className="text-[12px] text-muted-foreground text-center py-3">لا توجد علامات بعد — احفظ موضعك الحالي.</p>}
                {bookmarks.map(b => (
                  <div key={b.id} className="flex items-center gap-2 rounded-xl bg-foreground/5 p-2">
                    <button onClick={() => jumpToBookmark(b)} className="flex-1 min-w-0 text-right active:scale-[0.98]">
                      <span className="block font-bold text-sm text-foreground truncate">{b.surah || b.name}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{b.name}</span>
                    </button>
                    <button onClick={() => delBookmark(b.id)} aria-label="حذف العلامة" className="w-8 h-8 rounded-lg bg-red-500/15 text-red-600 flex items-center justify-center shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* حماية وضع الأطفال والوالدين (Parental Gate) */}
      {pinAction && (
        <ParentalGateModal
          title={
            pinAction === "enter"
              ? "إعداد رمز حماية وضع الأطفال"
              : pinAction === "settings"
              ? "أدخل رمز ولي الأمر للإعدادات"
              : "الخروج من ركن الأطفال"
          }
          onSuccess={() => {
            if (pinAction === "enter") {
              setAppMode("kids");
              setKidsLocked(true);
              navigate("/games");
            } else if (pinAction === "settings") {
              sessionStorage.setItem("mushaf:settingsUnlocked", "1");
              navigate("/settings");
            } else {
              setAppMode("parent");
              setKidsLocked(false);
            }
            setPinAction(null);
          }}
          onCancel={() => setPinAction(null)}
        />
      )}

      {controlsOpen && (
        <div className="absolute inset-x-0 bottom-0 z-40 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 -top-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          <div className="relative mx-auto max-w-2xl m-3 rounded-3xl p-4 shadow-2xl border border-white/30" style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(24px) saturate(140%)" }}>
            <div className="flex items-center justify-between mb-3">
              {editingPageName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={tempPageName}
                    onChange={(e) => setTempPageName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-accent/50 font-amiri font-bold text-base outline-none focus:ring-2 focus:ring-accent/50"
                    autoFocus
                    dir="rtl"
                    placeholder="اسم الصفحة..."
                    onKeyDown={(e) => { if (e.key === "Enter") handleSavePageName(); if (e.key === "Escape") setEditingPageName(false); }}
                  />
                  <button onClick={handleSavePageName} className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center hover:bg-emerald-500/30 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-amiri font-bold text-base">{currentPageName}</p>
                  <button onClick={handleStartEditPageName} className="w-6 h-6 rounded-full bg-foreground/5 flex items-center justify-center hover:bg-foreground/10 transition-colors" title="تعديل اسم الصفحة">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                {isTauri() && selectedSurah && (
                  <div className="mr-2">
                    {isDownloading[selectedSurah.number] ? (
                      <div className="text-[10px] bg-amber-100/10 text-amber-500 border border-amber-500/20 font-bold px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
                        <Download className="w-3 h-3 animate-pulse" /><span>جاري التحميل {downloadProgress[selectedSurah.number] || 0}%</span>
                      </div>
                    ) : offlineStatus[selectedSurah.number] ? (
                      <div className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /><span>متوفر أوفلاين</span>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          const url = selectedSurah.src;
                          setIsDownloading(prev => ({ ...prev, [selectedSurah.number]: true }));
                          setDownloadProgress(prev => ({ ...prev, [selectedSurah.number]: 0 }));
                          await downloadSurah(url, selectedSurah.number);
                        }}
                        className="rounded-full bg-blue-600 hover:bg-blue-700 px-2 py-1 text-[10px] font-bold text-white shadow-sm flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" /> تحميل أوفلاين
                      </button>
                    )}
                  </div>
                )}
                <button onClick={() => setControlsOpen(false)} className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Shuffle indicator */}
            {isShuffled && (
              <div className="mb-3 flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-800 text-xs font-bold">
                <Shuffle className="w-3.5 h-3.5" />
                <span>الترتيب العشوائي مُفعّل</span>
                <button onClick={handleShuffle} className="px-2 py-0.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-[10px] transition-colors">إلغاء</button>
              </div>
            )}

            <div className="mb-4 bg-white/40 p-3 rounded-xl border border-white/60">
              <p className="text-xs font-bold mb-2 text-muted-foreground">وضع التشغيل</p>
              
              {/* Play mode buttons - 2x2 grid for clarity */}
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {([
                  { mode: "teacher" as PlayMode, label: "معلم فقط", Icon: Mic, desc: "تشغيل المعلم وحده", activeColor: "bg-amber-400/20 border-amber-400/50 text-amber-800" },
                  { mode: "kids" as PlayMode, label: "طفل فقط", Icon: Baby, desc: "تشغيل الطفل وحده", activeColor: "bg-sky-400/20 border-sky-400/50 text-sky-800" },
                ]).map(({ mode, label, Icon, desc, activeColor }) => (
                  <button
                    key={mode}
                    onClick={() => { 
                      if (isSimultaneousPlaying) { stopSimultaneous(); const a = audioRef.current; if (a) { a.pause(); } setIsPlaying(false); }
                      setPlayMode(mode); 
                    }}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-0.5 ${
                      playMode === mode && !isSimultaneousPlaying
                        ? `${activeColor} shadow ring-1 ring-black/5`
                        : "bg-white/70 border-border/60 text-foreground/70 hover:bg-white"
                    }`}
                    title={desc}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </button>
                ))}

                {/* Simultaneous (Together) mode */}
                {selectedSurah && (() => {
                  const timings = getSavedTimings()[selectedSurah.number];
                  const hasKids = timings?.kidsStart !== undefined || (timings?.kids && timings.kids.length > 0);
                  if (!hasKids) return (
                    <div className="py-2.5 px-2 rounded-xl text-xs font-bold border border-dashed border-border/40 flex flex-col items-center gap-0.5 text-foreground/30 cursor-not-allowed" title="لا يتوفر صوت الطفل">
                      <VolumeX className="w-5 h-5 opacity-40" />
                      <span>تشغيل متزامن</span>
                    </div>
                  );
                  return (
                    <button
                      onClick={() => {
                        if (isSimultaneousPlaying) {
                          stopSimultaneous();
                          const a = audioRef.current;
                          if (a) { a.pause(); }
                          setIsPlaying(false);
                        } else {
                          playSimultaneous(selectedSurah);
                        }
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-0.5 ${
                        isSimultaneousPlaying
                          ? "bg-emerald-400/20 border-emerald-400/50 text-emerald-800 shadow ring-1 ring-emerald-400/20 animate-pulse"
                          : "bg-gradient-to-br from-amber-50 to-sky-50 border-border/60 text-foreground/70 hover:border-amber-400/40"
                      }`}
                      title="تشغيل المعلم والطفل في نفس الوقت"
                    >
                      <Volume2 className="w-5 h-5" />
                      <span>تشغيل متزامن</span>
                    </button>
                  );
                })()}
              </div>

              {/* Now playing indicator */}
              {isPlaying && activeSurah && !isSimultaneousPlaying && (
                <div className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg mb-3 text-xs font-bold animate-fade-in ${
                  currentSpeakerRef.current === "kids" 
                    ? "bg-sky-100/50 text-sky-700 border border-sky-200/50" 
                    : "bg-amber-100/50 text-amber-700 border border-amber-200/50"
                }`}>
                  {currentSpeakerRef.current === "kids" ? <Baby className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>يتحدث الآن: {currentSpeakerRef.current === "kids" ? "الطفل" : "المعلم"}</span>
                  <div className="flex items-center gap-[2px] h-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-[2px] bg-current rounded-full animate-wave" style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {isSimultaneousPlaying && (
                <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg mb-3 text-xs font-bold bg-emerald-100/50 text-emerald-700 border border-emerald-200/50 animate-fade-in">
                  <Volume2 className="w-4 h-4" />
                  <span>تشغيل المعلم والطفل المتزامن</span>
                  <div className="flex items-center gap-[2px] h-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-[2px] bg-current rounded-full animate-wave" style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-foreground/80">
                <input type="checkbox" checked={continuousPlay} onChange={(e) => setContinuousPlay(e.target.checked)} className="accent-accent w-4 h-4" />
                تشغيل متواصل
              </label>

              <div className="flex items-center gap-2 text-sm font-bold text-foreground/80 mt-2">
                <span className="inline-flex items-center gap-1"><Repeat className="w-4 h-4" /> تكرار الآية:</span>
                <select
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(Number(e.target.value))}
                  className="bg-white border border-border rounded-md px-2 py-1 text-sm outline-none cursor-pointer"
                >
                  <option value={0}>بدون</option>
                  <option value={1}>مرة</option>
                  <option value={2}>مرتين</option>
                  <option value={3}>3 مرات</option>
                  <option value={5}>5 مرات</option>
                  <option value={999}>مستمر</option>
                </select>
              </div>
            </div>

            {currentPageSurahs.length > 1 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {currentPageSurahs.map((s, i) => {
                    const firstA = getPageAyahBoxes(pages[actualPage]?.src || "").filter(b => b.surah === s.number).sort((a,b)=>a.ayah-b.ayah)[0]?.ayah ?? 1;
                    return (
                    <button key={s.number} onClick={() => { setSelectedSurahIdx(i); setSelectedAyah(firstA); }} className={`px-3 py-1.5 rounded-full text-sm font-amiri border transition-all ${selectedSurahIdx === i ? "bg-accent text-accent-foreground shadow" : "bg-white/70 border-border/60"}`}>
                      {s.name}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-3">
              <p className="text-xs font-bold mb-1.5 text-muted-foreground">اختر الآية</p>
              <div className="grid grid-cols-7 gap-1.5">
                {(() => {
                  const surahBoxes = getPageAyahBoxes(pages[actualPage]?.src || "").filter(b => b.surah === selectedSurah?.number);
                  const numbers = surahBoxes.length > 0
                    ? Array.from(new Set(surahBoxes.map(b => b.ayah))).sort((a, b) => a - b)
                    : Array.from({ length: ayahCount }, (_, i) => i + 1);
                  return numbers.map(n => {
                    const box = surahBoxes.find(b => b.ayah === n);
                    return (
                      <button key={n} onClick={() => { setSelectedAyah(n); currentRepeatRef.current = 0; playAyah(selectedSurah, n, playMode === "kids" ? "kids" : "teacher"); }} className={`aspect-square rounded-lg text-sm font-bold transition-all flex items-center justify-center ${selectedAyah === n ? "bg-accent text-accent-foreground shadow scale-105" : "bg-white/70 hover:bg-white"}`}>
                        {box?.label ? <span className="text-[10px] leading-tight block truncate px-1">{box.label}</span> : n}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {activeSurah && (
              <button onClick={togglePlayPause} className="mt-3 w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-foreground/10 hover:bg-foreground/15 font-bold text-sm">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? "إيقاف مؤقت" : "متابعة"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
      <AppFooter />
    </div>
  );
}
