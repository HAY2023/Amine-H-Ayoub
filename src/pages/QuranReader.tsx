import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2, X, Shuffle, Pencil, Check, Settings } from "lucide-react";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";
import { getPageAyahBoxes, PAGE_IMAGE_SIZE } from "@/data/ayahCoordinates";
import { getSavedTimings } from "@/data/ayahTimings";
import { Headphones } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
type PlayMode = "teacher" | "kids" | "both";

const STORAGE_KEY = "mushaf:lastPage";
const MUSHAF_LAST_SURAH = "mushaf:lastSurah";
const MUSHAF_LAST_TIME = "mushaf:lastTime";

interface SurahAudio { name: string; number: number; src: string; ayahCount: number; }
interface PageInfo { name: string; src: string; surahs: SurahAudio[]; }

const pages: PageInfo[] = [
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

const previewHighlight = "rgba(250,204,21,0.14)";
const previewStroke = "hsl(var(--accent) / 0.28)";

export default function QuranReader() {
  const navigate = useNavigate();
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
  const [playMode, _setPlayMode] = useState<PlayMode>("both");
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

  // Page naming state
  const [editingPageName, setEditingPageName] = useState(false);
  const [tempPageName, setTempPageName] = useState("");
  const [pageNamesVersion, setPageNamesVersion] = useState(0);

  // Refs for tracking without re-renders
  const audioRef = useRef<HTMLAudioElement>(null);
  const requestRef = useRef<number>();
  const lastSavedTimeRef = useRef(0);
  const stopAtRef = useRef<number | null>(null);
  const currentRepeatRef = useRef(0);
  const bothPhaseRef = useRef<"teacher" | "kids">("teacher");
  const currentAyahRef = useRef(-1);
  const currentBoxIndexRef = useRef(-1);
  const currentSpeakerRef = useRef<Speaker>("teacher");
  const currentBoxLabelRef = useRef<string | null>(null);

  const [activeMenuAyah, setActiveMenuAyah] = useState<{ surah: SurahAudio; ayah: number; label?: string; boxIndex?: number } | null>(null);

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

  // Get the actual page index (considering shuffle)
  const getActualPageIndex = useCallback((displayIdx: number) => {
    if (isShuffled && shuffledPageOrder.length > 0) {
      return shuffledPageOrder[displayIdx] ?? displayIdx;
    }
    return displayIdx;
  }, [isShuffled, shuffledPageOrder]);

  const actualPage = getActualPageIndex(currentPage);

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
    } catch { }
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, String(currentPage)); }, [currentPage]);

  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setActiveSurah(null); setIsPlaying(false); currentAyahRef.current = -1; currentBoxIndexRef.current = -1;
    setSelectedSurahIdx(0); setSelectedAyah(-1);
    stopAtRef.current = null; currentRepeatRef.current = 0;
    setEditingPageName(false);
    clearAllHighlights();
  }, [currentPage]);

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
    a.src = surah.src; a.load();
    setActiveSurah(surah);
    setSelectedSurahIdx(surahIdx);
    a.addEventListener("loadedmetadata", () => {
      if (savedTime > 0 && savedTime < a.duration) {
        a.currentTime = savedTime;
        lastSavedTimeRef.current = savedTime;
      }
    }, { once: true });
  }, [currentPage]);

  const clearAllHighlights = () => {
    const rects = document.querySelectorAll('.ayah-rect');
    rects.forEach(r => {
      const el = r as SVGRectElement;
      el.style.fill = previewHighlight;
      el.style.stroke = previewStroke;
      el.style.strokeWidth = "1.5";
      el.classList.remove('animate-pulse');
    });
  };

  const highlightAyah = (surahNum: number, ayahNum: number, speaker: Speaker, boxIndex?: number) => {
    clearAllHighlights();
    const selector = boxIndex !== undefined 
      ? `.ayah-rect-idx-${boxIndex}` 
      : `.ayah-rect-${surahNum}-${ayahNum}`;
    const boxes = document.querySelectorAll(selector);
    boxes.forEach(r => {
      const el = r as SVGRectElement;
      el.style.fill = speakerColors[speaker].bg;
      el.style.stroke = speakerColors[speaker].glow;
      el.style.strokeWidth = "5";
      el.classList.add('animate-pulse');
    });
  };

  const getActualAyahCount = useCallback((surahNumber: number, fallback: number) => {
    const pageBoxes = getPageAyahBoxes(pages[actualPage]?.src || "");
    const surahBoxes = pageBoxes.filter(b => b.surah === surahNumber);
    if (surahBoxes.length === 0) return fallback;
    return Math.max(...surahBoxes.map(b => b.ayah));
  }, [actualPage]);

  const trackAudio = useCallback(() => {
    const a = audioRef.current;
    if (!a || !activeSurah) return;

    if (stopAtRef.current !== null && a.currentTime >= stopAtRef.current - 0.05) {
      a.pause();
      setIsPlaying(false);
      handleAyahSegmentEnd();
      return;
    }

    const pageBoxes = getPageAyahBoxes(pages[actualPage].src);
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
      const timings = getSavedTimings()[activeSurah.number];
      const segments = timings?.segments || [];
      if (segments.length > 0) {
        const activeSeg = segments.find(s => a.currentTime >= s.start && a.currentTime <= s.end);
        if (activeSeg) {
          const speakerSegments = segments.filter(s => s.speaker === activeSeg.speaker).sort((a, b) => a.start - b.start);
          const ayahIdx = speakerSegments.findIndex(s => s.id === activeSeg.id);
          const sortedBoxes = [...surahBoxes].sort((a, b) => a.ayah - b.ayah);
          const ayahNumber = sortedBoxes[ayahIdx]?.ayah ?? (ayahIdx + 1);

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
  }, [activeSurah]);

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


  const playAyah = useCallback((surah: SurahAudio, ayahNum: number, forceSpeaker?: Speaker, boxIndex?: number) => {
    const a = audioRef.current; if (!a) return;
    const sameSrc = a.src && a.src.endsWith(surah.src.split("/").pop() || surah.src);

    setActiveSurah(surah);
    currentAyahRef.current = ayahNum;
    currentBoxIndexRef.current = boxIndex ?? -1;
    stopAtRef.current = null;

    const startPlayback = () => {
      const sp: Speaker = forceSpeaker ?? "teacher";
      currentSpeakerRef.current = sp;

      const timings = getSavedTimings()[surah.number];
      const segments = timings?.segments || [];

      let startT = 0;
      let nextT = a.duration || 1e9;
      let foundTimingInBox = false;

      const pageBoxes = getPageAyahBoxes(pages[actualPage].src);
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
      a.currentTime = startT;
      a.play().then(() => setIsPlaying(true)).catch(console.error);
    };

    setControlsOpen(false);

    if (!sameSrc) {
      a.src = surah.src;
      a.load();
      a.addEventListener("loadedmetadata", startPlayback, { once: true });
    } else {
      if (a.duration > 0) startPlayback();
      else a.addEventListener("loadedmetadata", startPlayback, { once: true });
    }
  }, [actualPage]);

  const advanceSurah = (sp: Speaker) => {
    if (!activeSurah) return;
    const page = pages[actualPage];
    const surahIdx = page.surahs.findIndex(s => s.number === activeSurah.number);
    if (surahIdx >= 0 && surahIdx < page.surahs.length - 1) {
      const nextSurah = page.surahs[surahIdx + 1];
      setSelectedSurahIdx(surahIdx + 1);
      
      const pageBoxes = getPageAyahBoxes(page.src);
      const nextSurahBoxes = pageBoxes.filter(b => b.surah === nextSurah.number).sort((a,b) => a.ayah - b.ayah);
      const firstAyah = nextSurahBoxes[0]?.ayah ?? 1;
      const firstBoxIndex = nextSurahBoxes.length > 0 ? pageBoxes.indexOf(nextSurahBoxes[0]) : undefined;
      
      setSelectedAyah(firstAyah);
      playAyah(nextSurah, firstAyah, sp, firstBoxIndex);
    } else {
      setIsPlaying(false);
      clearAllHighlights();
    }
  };

  const handleAyahSegmentEnd = useCallback(() => {
    stopAtRef.current = null;
    const a = audioRef.current; if (!a || !activeSurah) return;

    // === READ FROM REFS to always get the latest values (not stale closures) ===
    const mode = playModeRef.current;
    const repeat = repeatCountRef.current;
    const continuous = continuousPlayRef.current;

    const timings = getSavedTimings()[activeSurah.number];
    const hasKids = timings?.segments?.some(s => s.speaker === "kids") || timings?.kidsStart !== undefined;

    const advanceToNextSegment = (sp: Speaker) => {
      const pageBoxes = getPageAyahBoxes(pages[actualPage].src);
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
        if (candidate.box.ayah === currentAyahRef.current) {
          const hasTimings = (sp === "teacher" && candidate.box.audioStart !== undefined && candidate.box.audioEnd !== undefined) ||
                             (sp === "kids" && candidate.box.kidsStart !== undefined && candidate.box.kidsEnd !== undefined);
          if (hasTimings) {
            nextItem = candidate;
            break;
          }
        } else {
          nextItem = candidate;
          break;
        }
      }

      if (nextItem) {
        setSelectedAyah(nextItem.box.ayah);
        playAyah(activeSurah, nextItem.box.ayah, sp, nextItem.globalIndex);
      } else {
        advanceSurah(sp);
      }
    };

    // "both" mode: teacher then kids for same ayah
    if (mode === "both" && hasKids) {
      if (bothPhaseRef.current === "teacher") {
        bothPhaseRef.current = "kids";
        playAyah(activeSurah, currentAyahRef.current, "kids", currentBoxIndexRef.current !== -1 ? currentBoxIndexRef.current : undefined);
        return;
      } else {
        bothPhaseRef.current = "teacher";
        if (currentRepeatRef.current < repeat) {
          currentRepeatRef.current++;
          playAyah(activeSurah, currentAyahRef.current, "teacher", currentBoxIndexRef.current !== -1 ? currentBoxIndexRef.current : undefined);
          return;
        }

        currentRepeatRef.current = 0;
        if (continuous) {
          advanceToNextSegment("teacher");
        } else {
          setIsPlaying(false);
          clearAllHighlights();
        }
        return;
      }
    }

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
  }, [activeSurah, playAyah, actualPage]);

  const togglePlayPause = () => {
    const a = audioRef.current; if (!a || !activeSurah) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      if (currentAyahRef.current === -1) {
        const pageBoxes = getPageAyahBoxes(pages[actualPage]?.src || "");
        const surahBoxes = pageBoxes.filter(b => b.surah === activeSurah.number).sort((a,b) => a.ayah - b.ayah);
        const firstAyah = surahBoxes[0]?.ayah ?? 1;
        playAyah(activeSurah, firstAyah, playMode === "kids" ? "kids" : "teacher");
      } else {
        a.play().then(() => setIsPlaying(true)).catch(() => { });
      }
    }
  };

  const step = isDesktop ? 2 : 1;
  const totalDisplayPages = isShuffled ? shuffledPageOrder.length : pages.length;
  const goToPage = (i: number) => { if (i >= 0 && i < totalDisplayPages) setCurrentPage(i); };
  const goPrev = () => goToPage(Math.max(0, currentPage - step));
  const goNext = () => goToPage(Math.min(totalDisplayPages - 1, currentPage + step));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goPrev();
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "Escape") { if (controlsOpen) setControlsOpen(false); else navigate("/"); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [currentPage, isDesktop, controlsOpen, navigate]);

  const visiblePages = useMemo(() => {
    const getPage = (displayIdx: number) => {
      const idx = isShuffled && shuffledPageOrder.length > 0 ? shuffledPageOrder[displayIdx] : displayIdx;
      return pages[idx];
    };
    if (isDesktop) return [getPage(currentPage), getPage(currentPage + 1)].filter(Boolean) as PageInfo[];
    return [getPage(currentPage)].filter(Boolean) as PageInfo[];
  }, [currentPage, isDesktop, isShuffled, shuffledPageOrder]);

  const currentPageSurahs = pages[actualPage]?.surahs || [];
  const selectedSurah = currentPageSurahs[selectedSurahIdx] || currentPageSurahs[0];
  const ayahCount = selectedSurah ? getActualAyahCount(selectedSurah.number, selectedSurah.ayahCount) : 0;

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 bg-background overflow-hidden select-none">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

      <div className="flex h-full w-full" dir="rtl" onClick={() => { }}>
        {visiblePages.map((page, idx) => (
          <div key={`${page.src}-${idx}`} className="relative h-full flex-1 min-w-0 flex items-center justify-center bg-background overflow-hidden">
            <div className="relative h-full w-full">
              <img src={page.src} alt={page.name} className="absolute inset-0 h-full w-full select-none animate-fade-in object-fill" draggable={false} />
              <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${PAGE_IMAGE_SIZE.width} ${PAGE_IMAGE_SIZE.height}`} preserveAspectRatio="none">
                {getPageAyahBoxes(page.src).map((box, i) => (
                  <rect
                    key={`ayah-rect-${box.surah}-${box.ayah}-${i}`}
                    className={`ayah-rect ayah-rect-${box.surah}-${box.ayah} ayah-rect-idx-${i}`}
                    x={box.x} y={box.y} width={box.width} height={box.height} rx="10"
                    fill={previewHighlight} stroke={previewStroke} strokeWidth={1.5}
                    style={{ mixBlendMode: "multiply", transition: "all 0.1s linear" }}
                  />
                ))}
              </svg>
              <div className="absolute inset-0">
                {getPageAyahBoxes(page.src).map((box, i) => {
                  const surah = page.surahs.find((s) => s.number === box.surah);
                  if (!surah) return null;
                  return (
                    <button
                      key={`${box.surah}-${box.ayah}-tap-${i}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuAyah({ surah, ayah: box.ayah, label: box.label, boxIndex: i });
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

      <button onClick={() => navigate("/audio")} className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center z-30 transition-opacity" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", opacity: 0.35 }}>
        <ArrowRight className="w-4 h-4 text-foreground" />
      </button>

      <div className="absolute top-2 left-2 z-30 flex gap-1.5">
        <button onClick={toggleFullscreen} className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", opacity: 0.35 }}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button onClick={handleShuffle} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isShuffled ? 'opacity-100' : 'opacity-35'}`} style={{ background: isShuffled ? "rgba(250,204,21,0.4)" : "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)" }} title={isShuffled ? "إلغاء العشوائي" : "ترتيب عشوائي"}>
          <Shuffle className="w-4 h-4" />
        </button>
      </div>

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
                <Link to="/timings" className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">إعداد التقسيم</Link>
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
              <p className="text-xs font-bold mb-2 text-muted-foreground">وضع التشغيل (عالي الدقة)</p>
              <div className="flex gap-1.5 mb-3">
                {([{ mode: "both", label: "🎧 تصحيح" }, { mode: "teacher", label: "🎙️ معلم" }, { mode: "kids", label: "👦 أطفال" }]).map(({ mode, label }) => (
                  <button key={mode} onClick={() => { setPlayMode(mode as PlayMode); bothPhaseRef.current = "teacher"; }} className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all border ${playMode === mode ? "bg-amber-400/20 border-amber-400/50 text-amber-800 shadow" : "bg-white/70 border-border/60 text-foreground/70"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-foreground/80">
                <input type="checkbox" checked={continuousPlay} onChange={(e) => setContinuousPlay(e.target.checked)} className="accent-accent w-4 h-4" />
                تشغيل متواصل
              </label>
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

      {activeMenuAyah && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveMenuAyah(null)}
        >
          <div 
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/40 text-center space-y-4 animate-scale-up"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="font-amiri font-bold text-2xl text-slate-800">
                سورة {activeMenuAyah.surah.name}
              </h3>
              <p className="text-sm font-bold text-slate-500">
                {activeMenuAyah.label ? activeMenuAyah.label : `الآية رقم ${activeMenuAyah.ayah}`}
              </p>
            </div>

            <div className="w-16 h-1 bg-gradient-to-r from-amber-400 to-sky-400 mx-auto rounded-full my-2" />

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const sIdx = currentPageSurahs.findIndex(s => s.number === activeMenuAyah.surah.number);
                  if (sIdx !== -1) setSelectedSurahIdx(sIdx);
                  setSelectedAyah(activeMenuAyah.ayah);
                  currentRepeatRef.current = 0;
                  bothPhaseRef.current = "teacher";
                  setPlayMode("teacher");
                  playAyah(activeMenuAyah.surah, activeMenuAyah.ayah, "teacher", activeMenuAyah.boxIndex);
                  setActiveMenuAyah(null);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-900 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              >
                🎙️ تلاوة المعلم
              </button>

              <button
                onClick={() => {
                  const sIdx = currentPageSurahs.findIndex(s => s.number === activeMenuAyah.surah.number);
                  if (sIdx !== -1) setSelectedSurahIdx(sIdx);
                  setSelectedAyah(activeMenuAyah.ayah);
                  currentRepeatRef.current = 0;
                  bothPhaseRef.current = "teacher";
                  setPlayMode("kids");
                  playAyah(activeMenuAyah.surah, activeMenuAyah.ayah, "kids", activeMenuAyah.boxIndex);
                  setActiveMenuAyah(null);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-sky-400/20 hover:bg-sky-400/30 border border-sky-400/50 text-sky-900 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              >
                👦 تكرار الأطفال
              </button>

              <button
                onClick={() => {
                  const sIdx = currentPageSurahs.findIndex(s => s.number === activeMenuAyah.surah.number);
                  if (sIdx !== -1) setSelectedSurahIdx(sIdx);
                  setSelectedAyah(activeMenuAyah.ayah);
                  currentRepeatRef.current = 0;
                  bothPhaseRef.current = "teacher";
                  setPlayMode("both");
                  playAyah(activeMenuAyah.surah, activeMenuAyah.ayah, "teacher", activeMenuAyah.boxIndex);
                  setActiveMenuAyah(null);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400/30 to-sky-400/30 hover:from-amber-400/40 hover:to-sky-400/40 border border-amber-400/40 text-slate-800 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md"
              >
                🎧 تصحيح (المعلم ثم الطفل)
              </button>

              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/50">
                <Link
                  to="/timings"
                  onClick={() => setActiveMenuAyah(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs transition-all text-center flex items-center justify-center gap-1 active:scale-95"
                >
                  ⚙️ معايرة الموضع
                </Link>
                <button
                  onClick={() => setActiveMenuAyah(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all active:scale-95"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
