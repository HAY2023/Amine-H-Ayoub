import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2, X } from "lucide-react";
import { AYAH_COUNTS, getCurrentAyahAtTime, getAyahStartTime, hasKidsSection, getSpeakerAtTime } from "@/data/ayahTimings";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";
import { getPageAyahBoxes, PAGE_IMAGE_SIZE } from "@/data/ayahCoordinates";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

type Speaker = "teacher" | "kids";
type PlayMode = "teacher" | "kids" | "both"; // both = teacher then kids for the same ayah

const STORAGE_KEY = "mushaf:lastPage";
const MUSHAF_LAST_SURAH = "mushaf:lastSurah";
const MUSHAF_LAST_TIME = "mushaf:lastTime";

interface SurahAudio { name: string; number: number; src: string; ayahCount: number; }
interface PageInfo { name: string; src: string; surahs: SurahAudio[]; }

const pages: PageInfo[] = [
  { name: "الفاتحة", src: "/pages/fatiha.jpg", surahs: [
    { name: "الفاتحة", number: 1, src: audioPath(1), ayahCount: 7 },
  ]},
  { name: "القارعة - التكاثر", src: "/pages/600.jpg", surahs: [
    { name: "التكاثر", number: 14, src: audioPath(14), ayahCount: 8 },
  ]},
  { name: "العصر - الهمزة - الفيل", src: "/pages/601.jpg", surahs: [
    { name: "العصر", number: 13, src: audioPath(13), ayahCount: 3 },
    { name: "الهمزة", number: 12, src: audioPath(12), ayahCount: 9 },
    { name: "الفيل", number: 11, src: audioPath(11), ayahCount: 5 },
  ]},
  { name: "قريش - الماعون - الكوثر", src: "/pages/602.jpg", surahs: [
    { name: "قريش", number: 10, src: audioPath(10), ayahCount: 4 },
    { name: "الماعون", number: 9, src: audioPath(9), ayahCount: 7 },
    { name: "الكوثر", number: 8, src: audioPath(8), ayahCount: 3 },
  ]},
  { name: "الكافرون - النصر - المسد", src: "/pages/603.jpg", surahs: [
    { name: "الكافرون", number: 7, src: audioPath(7), ayahCount: 6 },
    { name: "النصر", number: 6, src: audioPath(6), ayahCount: 3 },
    { name: "المسد", number: 5, src: audioPath(5), ayahCount: 5 },
  ]},
  { name: "الإخلاص - الفلق - الناس", src: "/pages/604.jpg", surahs: [
    { name: "الإخلاص", number: 4, src: audioPath(4), ayahCount: 4 },
    { name: "الفلق", number: 3, src: audioPath(3), ayahCount: 5 },
    { name: "الناس", number: 2, src: audioPath(2), ayahCount: 6 },
  ]},
];

const speakerColors: Record<Speaker, { bg: string; glow: string; text: string }> = {
  teacher: { bg: "rgba(250,204,21,0.30)", glow: "rgba(250,204,21,0.55)", text: "#b45309" },
  kids:    { bg: "rgba(56,189,248,0.30)", glow: "rgba(56,189,248,0.55)", text: "#0369a1" },
};

const previewHighlight = "rgba(250,204,21,0.14)";

interface Props { onBack: () => void; }

const MushafPage = ({ onBack }: Props) => {
  const [currentPage, setCurrentPage] = useState(() => {
    const s = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return isNaN(s) || s < 0 || s >= pages.length ? 0 : s;
  });
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 1024 : false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio state
  const [activeSurah, setActiveSurah] = useState<SurahAudio | null>(null);
  const [selectedSurahIdx, setSelectedSurahIdx] = useState(0); // index within current page
  const [selectedAyah, setSelectedAyah] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>("teacher");
  const [continuousPlay, setContinuousPlay] = useState(true);
  const [repeatCount, setRepeatCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSavedTimeRef = useRef(0);
  const stopAtRef = useRef<number | null>(null); // stop playback when reaching this time
  const currentRepeatRef = useRef(0);

  useEffect(() => {
    const r = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", r); return () => window.removeEventListener("resize", r);
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, String(currentPage)); }, [currentPage]);

  // Stop on page change
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setActiveSurah(null); setIsPlaying(false); setCurrentAyah(0);
    setSelectedSurahIdx(0); setSelectedAyah(1);
    stopAtRef.current = null; currentRepeatRef.current = 0;
  }, [currentPage]);

  // Resume last surah (once)
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const savedNum = parseInt(localStorage.getItem(MUSHAF_LAST_SURAH) || "0", 10);
    const savedTime = parseFloat(localStorage.getItem(MUSHAF_LAST_TIME) || "0");
    if (!savedNum) return;
    const surahIdx = pages[currentPage]?.surahs.findIndex(s => s.number === savedNum) ?? -1;
    if (surahIdx === -1) return;
    const surah = pages[currentPage].surahs[surahIdx];
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

  // Fullscreen API
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  }, []);
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // Navigation
  const step = isDesktop ? 2 : 1;
  const goToPage = (i: number) => { if (i >= 0 && i < pages.length) setCurrentPage(i); };
  const goPrev = () => goToPage(Math.max(0, currentPage - step));
  const goNext = () => goToPage(Math.min(pages.length - 1, currentPage + step));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goPrev();
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "Escape") { if (controlsOpen) setControlsOpen(false); else onBack(); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [currentPage, isDesktop, controlsOpen]);

  // Swipe nav + swipe-up to open controls
  const touchX = useRef<number | null>(null);
  const touchY = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const onTS = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  };
  const onTE = (e: React.TouchEvent) => {
    if (touchX.current === null || touchY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;
    touchX.current = null; touchY.current = null;
    // swipe up → open control panel
    if (dy < -60 && Math.abs(dy) > Math.abs(dx)) {
      setControlsOpen(true);
      return;
    }
    // swipe down → close control panel
    if (dy > 60 && Math.abs(dy) > Math.abs(dx)) {
      setControlsOpen(false);
      return;
    }
    // swipe horizontally → page nav
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      dx > 0 ? goPrev() : goNext();
      return;
    }
    // double tap detection (for fullscreen) — only when not tapping an ayah hotspot
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        toggleFullscreen();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  // ---- Ayah-by-ayah playback ----
  const playAyah = useCallback((surah: SurahAudio, ayahNum: number) => {
    const a = audioRef.current; if (!a) return;
    const sameSrc = a.src && a.src.endsWith(surah.src.split("/").pop() || surah.src);

    setActiveSurah(surah);
    setCurrentAyah(ayahNum);
    stopAtRef.current = null;

    const start = () => {
      setCurrentSpeaker("teacher");
      const dur = a.duration || 0;
      const startT = getAyahStartTime(surah.number, ayahNum, dur, "teacher");
      const nextT = computeAyahEnd(surah, ayahNum, "teacher", dur);
      stopAtRef.current = nextT;
      a.currentTime = startT;
      a.play().catch(() => {});
    };

    setControlsOpen(false); // Hide settings during reading!

    if (!sameSrc) {
      a.src = surah.src;
      a.load();
      a.addEventListener("loadedmetadata", start, { once: true });
    } else {
      if (a.duration > 0) start();
      else a.addEventListener("loadedmetadata", start, { once: true });
    }
  }, []);

  // compute end time of an ayah for a given speaker (start of next ayah, or boundary)
  const computeAyahEnd = (surah: SurahAudio, ayahNum: number, speaker: Speaker, dur: number): number => {
    const total = surah.ayahCount;
    if (ayahNum < total) {
      return getAyahStartTime(surah.number, ayahNum + 1, dur, speaker);
    }
    // last ayah: end at kidsStart (if teacher on combined file) or audio end
    if (speaker === "teacher" && hasKidsSection(surah.number)) {
      // import inline: we don't have direct access to kidsStart constant; compute via getAyahStartTime kids[1]
      const kidsFirst = getAyahStartTime(surah.number, 1, dur, "kids");
      if (kidsFirst > 0) return kidsFirst;
    }
    return dur || 1e9;
  };

  // Time update
  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !activeSurah || a.duration <= 0) return;

    // ayah display follow
    const { ayah, speaker } = getCurrentAyahAtTime(activeSurah.number, a.currentTime, a.duration);
    if (ayah > 0) setCurrentAyah(ayah);
    if (speaker && speaker !== currentSpeaker) setCurrentSpeaker(speaker);

    // stop when reaching scheduled end
    if (stopAtRef.current !== null && a.currentTime >= stopAtRef.current - 0.05) {
      a.pause();
      handleAyahSegmentEnd();
    }

    // throttled save
    if (Math.abs(a.currentTime - lastSavedTimeRef.current) >= 2) {
      lastSavedTimeRef.current = a.currentTime;
      localStorage.setItem(MUSHAF_LAST_SURAH, String(activeSurah.number));
      localStorage.setItem(MUSHAF_LAST_TIME, String(a.currentTime));
    }
  };

  const handleAyahSegmentEnd = () => {
    stopAtRef.current = null;
    if (currentRepeatRef.current < repeatCount) {
      currentRepeatRef.current++;
      if (activeSurah) playAyah(activeSurah, currentAyah);
    } else {
      currentRepeatRef.current = 0;
      if (continuousPlay && activeSurah) {
        if (currentAyah < activeSurah.ayahCount) {
          setSelectedAyah(currentAyah + 1);
          playAyah(activeSurah, currentAyah + 1);
        } else {
          const page = pages[currentPage];
          const surahIdx = page.surahs.findIndex(s => s.number === activeSurah.number);
          if (surahIdx >= 0 && surahIdx < page.surahs.length - 1) {
             const nextSurah = page.surahs[surahIdx + 1];
             setSelectedSurahIdx(surahIdx + 1);
             setSelectedAyah(1);
             playAyah(nextSurah, 1);
          } else {
             setIsPlaying(false);
          }
        }
      } else {
        setIsPlaying(false);
      }
    }
  };

  const handleEnded = () => {
    handleAyahSegmentEnd();
  };

  // Pause/resume
  const togglePlayPause = () => {
    const a = audioRef.current; if (!a || !activeSurah) return;
    if (isPlaying) a.pause();
    else a.play().catch(() => {});
  };



  const visiblePages = useMemo(() => {
    if (isDesktop) return [pages[currentPage], pages[currentPage + 1]].filter(Boolean) as PageInfo[];
    return [pages[currentPage]];
  }, [currentPage, isDesktop]);

  // Preload neighbors
  useEffect(() => {
    [currentPage - 1, currentPage + 1, currentPage + 2]
      .filter(i => i >= 0 && i < pages.length)
      .forEach(i => { const img = new Image(); img.src = pages[i].src; });
  }, [currentPage]);

  const currentPageSurahs = pages[currentPage]?.surahs || [];
  const selectedSurah = currentPageSurahs[selectedSurahIdx] || currentPageSurahs[0];
  const ayahCount = selectedSurah?.ayahCount || 0;

  // tap on image background → no longer opens controls (use swipe up). 
  // We keep a noop so users learn the swipe gesture via the hint.
  const onImageClick = () => { /* swipe up to open controls */ };

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-50 bg-[#f5f0e6] overflow-hidden select-none"
      onTouchStart={onTS}
      onTouchEnd={onTE}
    >
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Edge-to-edge image(s) with per-ayah tappable hotspots */}
      <div className="flex h-full w-full" dir="rtl" onClick={onImageClick}>
        {visiblePages.map((page, idx) => (
          <div
            key={`${page.src}-${idx}`}
            className="relative h-full flex-1 min-w-0 flex items-center justify-center bg-background overflow-hidden"
          >
            <div className={`${isDesktop ? "h-full max-w-full" : "w-full h-full"} relative`} style={{ aspectRatio: `${PAGE_IMAGE_SIZE.width} / ${PAGE_IMAGE_SIZE.height}` }}>
              <img
                src={page.src}
                alt={page.name}
                className="absolute inset-0 h-full w-full select-none animate-fade-in object-fill"
                loading="eager"
                decoding="async"
                draggable={false}
              />

              <svg
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 ${PAGE_IMAGE_SIZE.width} ${PAGE_IMAGE_SIZE.height}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {getPageAyahBoxes(page.src).map((box) => {
                  const isCurrent = activeSurah?.number === box.surah && currentAyah === box.ayah && isPlaying;
                  return (
                    <rect
                      key={`${box.surah}-${box.ayah}`}
                      x={box.x}
                      y={box.y}
                      width={box.width}
                      height={box.height}
                      rx="10"
                      fill={isCurrent ? speakerColors[currentSpeaker].bg : controlsOpen ? previewHighlight : "transparent"}
                      stroke={isCurrent ? speakerColors[currentSpeaker].glow : controlsOpen ? "rgba(250,204,21,0.28)" : "transparent"}
                      strokeWidth={isCurrent ? 5 : 2}
                      style={{ mixBlendMode: "multiply" }}
                      className={isCurrent ? "animate-pulse" : ""}
                    />
                  );
                })}
              </svg>

              <div className="absolute inset-0">
                {getPageAyahBoxes(page.src).map((box) => {
                  const surah = page.surahs.find((s) => s.number === box.surah);
                  if (!surah) return null;
                  return (
                    <button
                      key={`${box.surah}-${box.ayah}-tap`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSurahIdx(page.surahs.indexOf(surah));
                        setSelectedAyah(box.ayah);
                        currentRepeatRef.current = 0;
                        playAyah(surah, box.ayah);
                      }}
                      className="absolute rounded-md outline-none transition-colors hover:bg-accent/10 active:bg-accent/20"
                      style={{
                        left: `${(box.x / PAGE_IMAGE_SIZE.width) * 100}%`,
                        top: `${(box.y / PAGE_IMAGE_SIZE.height) * 100}%`,
                        width: `${(box.width / PAGE_IMAGE_SIZE.width) * 100}%`,
                        height: `${(box.height / PAGE_IMAGE_SIZE.height) * 100}%`,
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

      {/* Swipe-up hint (subtle, bottom center) */}
      {!controlsOpen && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-0.5 opacity-50 animate-pulse pointer-events-none">
          <div className="w-10 h-1 rounded-full bg-foreground/60" />
          <span className="text-[10px] font-bold text-foreground/70">اسحب للأعلى</span>
        </div>
      )}

      {/* Tiny transparent back button (top-right corner) */}
      <button
        onClick={(e) => { e.stopPropagation(); onBack(); }}
        className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center z-30 transition-opacity"
        style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", opacity: 0.35 }}
        aria-label="رجوع"
      >
        <ArrowRight className="w-4 h-4 text-foreground" />
      </button>

      {/* Tiny fullscreen toggle (top-left corner) */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
        className="absolute top-2 left-2 w-9 h-9 rounded-full flex items-center justify-center z-30 transition-opacity"
        style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", opacity: 0.35 }}
        aria-label="ملء الشاشة"
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      {/* Page swipe hint dots (very subtle, bottom) */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-20 opacity-25">
        {pages.map((_, i) => {
          const a = isDesktop ? i === currentPage || i === currentPage + 1 : i === currentPage;
          return <span key={i} className={`h-1 rounded-full ${a ? "bg-foreground w-4" : "bg-foreground/50 w-1"}`} />;
        })}
      </div>

      {/* Side nav arrows — only visible while controls open */}
      {controlsOpen && (
        <>
          <button onClick={(e) => { e.stopPropagation(); goPrev(); }} disabled={currentPage === 0}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-0 z-30"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
            <ChevronRight className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); goNext(); }} disabled={currentPage + step >= pages.length}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-0 z-30"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Floating glass control panel */}
      {controlsOpen && (
        <div
          className="absolute inset-x-0 bottom-0 z-40 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* backdrop scrim */}
          <div
            className="absolute inset-0 -top-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"
          />
          <div
            className="relative mx-auto max-w-2xl m-3 rounded-3xl p-4 shadow-2xl border border-white/30"
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(24px) saturate(140%)",
              WebkitBackdropFilter: "blur(24px) saturate(140%)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-amiri font-bold text-base">
                {pages[currentPage]?.name}
              </p>
              <button
                onClick={() => setControlsOpen(false)}
                className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Playback Settings */}
            <div className="flex flex-col gap-3 mb-4 bg-white/40 p-3 rounded-xl border border-white/60">
              <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-foreground/80">
                <input type="checkbox" checked={continuousPlay} onChange={(e) => setContinuousPlay(e.target.checked)} className="accent-accent w-4 h-4" />
                تشغيل متواصل للسورة التالية
              </label>
              <div className="flex items-center gap-2 text-sm font-bold text-foreground/80">
                <span>تكرار الآية:</span>
                <select 
                  value={repeatCount} 
                  onChange={(e) => setRepeatCount(Number(e.target.value))}
                  className="bg-white border border-border rounded-md px-2 py-1 text-sm outline-none cursor-pointer"
                >
                  <option value={0}>بدون تكرار</option>
                  <option value={1}>مرة واحدة</option>
                  <option value={2}>مرتين</option>
                  <option value={3}>3 مرات</option>
                  <option value={5}>5 مرات</option>
                  <option value={999}>مستمر</option>
                </select>
              </div>
            </div>

            {/* Surah selector (if more than one on page) */}
            {currentPageSurahs.length > 1 && (
              <div className="mb-3">
                <p className="text-xs font-bold mb-1.5 text-muted-foreground">السورة</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentPageSurahs.map((s, i) => (
                    <button
                      key={s.number}
                      onClick={() => { setSelectedSurahIdx(i); setSelectedAyah(1); }}
                      className={`px-3 py-1.5 rounded-full text-sm font-amiri border transition-all ${
                        selectedSurahIdx === i
                          ? "bg-accent text-accent-foreground border-accent shadow"
                          : "bg-white/70 border-border/60"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ayah grid */}
            <div className="mb-3">
              <p className="text-xs font-bold mb-1.5 text-muted-foreground">
                اختر الآية ({selectedAyah} / {ayahCount})
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: ayahCount }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => {
                      setSelectedAyah(n);
                      currentRepeatRef.current = 0;
                      playAyah(selectedSurah, n);
                    }}
                    className={`aspect-square rounded-lg text-sm font-bold transition-all ${
                      selectedAyah === n
                        ? "bg-accent text-accent-foreground shadow scale-105"
                        : "bg-white/70 hover:bg-white"
                    } ${currentAyah === n && isPlaying ? "ring-2 ring-offset-1" : ""}`}
                    style={currentAyah === n && isPlaying ? { boxShadow: `0 0 0 2px ${speakerColors[currentSpeaker].glow}` } : undefined}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Pause/Play current */}
            {activeSurah && (
              <button
                onClick={togglePlayPause}
                className="mt-3 w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-foreground/10 hover:bg-foreground/15 font-bold text-sm"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? "إيقاف مؤقت" : "متابعة"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tiny "now playing" pill (when controls closed) */}
      {isPlaying && activeSurah && !controlsOpen && (
        <div
          onClick={togglePlayPause}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold animate-fade-in cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-md"
          style={{
            background: speakerColors[currentSpeaker].bg,
            border: `1px solid ${speakerColors[currentSpeaker].glow}`,
            color: speakerColors[currentSpeaker].text,
            backdropFilter: "blur(8px)",
            opacity: 0.85,
          }}
        >
          <span>🎧</span>
          <span className="font-amiri">{activeSurah.name} · آية {currentAyah}</span>
        </div>
      )}
    </div>
  );
};

export default MushafPage;
