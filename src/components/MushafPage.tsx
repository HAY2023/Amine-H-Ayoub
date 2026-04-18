import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Settings, ArrowRight, ChevronLeft, ChevronRight, Repeat, BookMarked, Play, Pause, Volume2, VolumeX } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OverlayMode = "none" | "teacher" | "child" | "both";
type RepeatMode = 1 | 2 | 3 | 99;

const STORAGE_KEY = "mushaf:lastPage";

interface PageInfo {
  name: string;
  src: string;
  ayahCount: number;
  audioFiles: { name: string; src: string }[];
}

const pages: PageInfo[] = [
  {
    name: "الفاتحة",
    src: "/pages/fatiha.jpg",
    ayahCount: 7,
    audioFiles: [
      { name: "الفاتحة", src: "/audio/surahs/1.mp3" },
    ],
  },
  {
    name: "القارعة - التكاثر",
    src: "/pages/600.jpg",
    ayahCount: 19,
    audioFiles: [
      { name: "التكاثر", src: "/audio/surahs/14.mp3" },
    ],
  },
  {
    name: "العصر - الهمزة - الفيل",
    src: "/pages/601.jpg",
    ayahCount: 17,
    audioFiles: [
      { name: "العصر", src: "/audio/surahs/13.mp3" },
      { name: "الهمزة", src: "/audio/surahs/12.mp3" },
      { name: "الفيل", src: "/audio/surahs/11.mp3" },
    ],
  },
  {
    name: "قريش - الماعون - الكوثر",
    src: "/pages/602.jpg",
    ayahCount: 14,
    audioFiles: [
      { name: "قريش", src: "/audio/surahs/10.mp3" },
      { name: "الماعون", src: "/audio/surahs/9.mp3" },
      { name: "الكوثر", src: "/audio/surahs/8.mp3" },
    ],
  },
  {
    name: "الكافرون - النصر - المسد",
    src: "/pages/603.jpg",
    ayahCount: 14,
    audioFiles: [
      { name: "الكافرون", src: "/audio/surahs/7.mp3" },
      { name: "النصر", src: "/audio/surahs/6.mp3" },
      { name: "المسد", src: "/audio/surahs/5.mp3" },
    ],
  },
  {
    name: "الإخلاص - الفلق - الناس",
    src: "/pages/604.jpg",
    ayahCount: 15,
    audioFiles: [
      { name: "الإخلاص", src: "/audio/surahs/4.mp3" },
      { name: "الفلق", src: "/audio/surahs/3.mp3" },
      { name: "الناس", src: "/audio/surahs/2.mp3" },
    ],
  },
];

const overlayClass: Record<OverlayMode, string> = {
  none: "",
  teacher: "bg-yellow-100/30",
  child: "bg-sky-200/35",
  both: "bg-emerald-100/25 animate-breathe",
};

interface Props {
  onBack: () => void;
}

const MushafPage = ({ onBack }: Props) => {
  const [mode, setMode] = useState<OverlayMode>("none");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return isNaN(saved) || saved < 0 || saved >= pages.length ? 0 : saved;
  });
  const [fabVisible, setFabVisible] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  const [fromAyah, setFromAyah] = useState(1);
  const [toAyah, setToAyah] = useState(1);
  const [repeat, setRepeat] = useState<RepeatMode>(1);
  const [repeatTick, setRepeatTick] = useState(0);

  // Audio state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();
  const totalAyahs = pages[currentPage]?.ayahCount ?? 1;

  // Track desktop breakpoint
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // On desktop, ensure currentPage is even (left page of the spread)
  useEffect(() => {
    if (isDesktop && currentPage % 2 !== 0 && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [isDesktop, currentPage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    setFromAyah(1);
    setToAyah(Math.min(5, totalAyahs));
  }, [currentPage, totalAyahs]);

  // Stop audio when changing page
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingAudio(null);
    setIsAudioPlaying(false);
  }, [currentPage]);

  const resetFabTimer = useCallback(() => {
    setFabVisible(true);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setFabVisible(false), 3000);
  }, []);

  useEffect(() => {
    resetFabTimer();
    return () => clearTimeout(fadeTimer.current);
  }, [resetFabTimer]);

  const step = isDesktop ? 2 : 1;
  const goToPage = (idx: number) => {
    if (idx < 0 || idx >= pages.length) return;
    setCurrentPage(idx);
    resetFabTimer();
  };
  const goPrev = () => goToPage(Math.max(0, currentPage - step));
  const goNext = () => goToPage(Math.min(pages.length - 1, currentPage + step));

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goPrev(); // RTL: right = previous
      if (e.key === "ArrowLeft") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, isDesktop]);

  // Touch swipe (mobile)
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    resetFabTimer();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx > 0) goPrev(); // swipe right = previous (RTL feel)
    else goNext();
  };

  // Play/pause audio for a surah
  const toggleAudio = (audioSrc: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingAudio === audioSrc && isAudioPlaying) {
      audio.pause();
      setIsAudioPlaying(false);
    } else if (playingAudio === audioSrc && !isAudioPlaying) {
      audio.play().catch(() => {});
      setIsAudioPlaying(true);
    } else {
      audio.src = audioSrc;
      audio.load();
      audio.play().catch(() => {});
      setPlayingAudio(audioSrc);
      setIsAudioPlaying(true);
    }
  };

  // Alternating overlay for "both" mode
  useEffect(() => {
    if (mode !== "both") return;
    const interval = setInterval(() => setRepeatTick((t) => t + 1), 3500);
    return () => clearInterval(interval);
  }, [mode]);

  const effectiveOverlay: OverlayMode = useMemo(() => {
    if (mode !== "both") return mode;
    return repeatTick % 2 === 0 ? "teacher" : "child";
  }, [mode, repeatTick]);

  const overlayBlend: React.CSSProperties =
    effectiveOverlay === "none" ? {} : { mixBlendMode: "multiply" };

  const options: { key: OverlayMode; label: string; emoji: string; desc: string }[] = [
    { key: "teacher", label: "قراءة المعلم فقط", emoji: "👨‍🏫", desc: "طبقة صفراء هادئة" },
    { key: "child", label: "قراءة الطفل فقط", emoji: "👦", desc: "طبقة زرقاء خفيفة" },
    { key: "both", label: "المعلم والطفل (تكرار)", emoji: "👨‍👦", desc: "تتناوب الألوان مع كل تكرار" },
    { key: "none", label: "بدون تظليل", emoji: "👁️", desc: "الوضع الطبيعي" },
  ];

  const repeatOptions: { value: RepeatMode; label: string }[] = [
    { value: 1, label: "مرة" },
    { value: 2, label: "مرتين" },
    { value: 3, label: "3 مرات" },
    { value: 99, label: "مستمر ∞" },
  ];

  // Pages to render: [right, left] in RTL order on desktop
  const visiblePages = useMemo(() => {
    if (isDesktop) {
      const right = pages[currentPage];
      const left = pages[currentPage + 1];
      return [right, left].filter(Boolean) as PageInfo[];
    }
    return [pages[currentPage]];
  }, [currentPage, isDesktop]);

  // Preload neighbors
  useEffect(() => {
    const indices = [currentPage - 1, currentPage + 1, currentPage + 2].filter(
      (i) => i >= 0 && i < pages.length
    );
    indices.forEach((i) => {
      const img = new Image();
      img.src = pages[i].src;
    });
  }, [currentPage]);

  const renderPage = (page: PageInfo, idx: number) => (
    <div
      key={`${page.src}-${idx}`}
      className="relative h-full flex-1 min-w-0 flex items-center justify-center"
      style={{ background: "#f5f0e6" }}
    >
      <img
        src={page.src}
        alt={`صفحة ${page.name}`}
        className="max-w-full max-h-full object-contain select-none animate-fade-in"
        loading="eager"
        decoding="async"
        draggable={false}
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          img.style.display = "none";
          const parent = img.parentElement;
          if (parent && !parent.querySelector(".fallback")) {
            const div = document.createElement("div");
            div.className = "fallback text-foreground/70 text-center p-6 font-amiri text-xl";
            div.textContent = `تعذّر تحميل صفحة ${page.name}`;
            parent.appendChild(div);
          }
        }}
      />
      {effectiveOverlay !== "none" && (
        <div
          className={`absolute inset-0 ${overlayClass[effectiveOverlay]} pointer-events-none transition-all duration-1000`}
          style={overlayBlend}
        />
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "#f5f0e6" }}
      onMouseMove={resetFabTimer}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setIsAudioPlaying(false);
          setPlayingAudio(null);
        }}
        onPause={() => setIsAudioPlaying(false)}
        onPlay={() => setIsAudioPlaying(true)}
      />

      {/* Page spread - fills entire screen */}
      <div className="flex h-full w-full" dir="rtl">
        {visiblePages.map((p, i) => renderPage(p, i))}
      </div>

      {/* Audio buttons for current page surahs */}
      <div
        className={`absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-20 transition-opacity duration-500 ${
          fabVisible ? "opacity-100" : "opacity-30"
        }`}
      >
        {pages[currentPage]?.audioFiles.map((af) => {
          const isThisPlaying = playingAudio === af.src && isAudioPlaying;
          return (
            <button
              key={af.src}
              onClick={() => toggleAudio(af.src)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-lg ${
                isThisPlaying
                  ? "bg-accent text-accent-foreground scale-105"
                  : "bg-white/90 text-foreground hover:bg-white hover:scale-105"
              }`}
              style={{
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              {isThisPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span className="font-amiri">{af.name}</span>
                  <div className="flex items-center gap-[2px] h-3">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-[2px] bg-accent-foreground rounded-full animate-wave"
                        style={{ animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span className="font-amiri">{af.name}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Side navigation arrows */}
      <button
        onClick={goPrev}
        disabled={currentPage === 0}
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 disabled:opacity-0 z-20 ${
          fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10"
        }`}
        style={{
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-label="الصفحة السابقة"
      >
        <ChevronRight className="w-6 h-6 text-foreground" />
      </button>
      <button
        onClick={goNext}
        disabled={currentPage + step - 1 >= pages.length - 1 && currentPage + step >= pages.length}
        className={`absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 disabled:opacity-0 z-20 ${
          fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10"
        }`}
        style={{
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-label="الصفحة التالية"
      >
        <ChevronLeft className="w-6 h-6 text-foreground" />
      </button>

      {/* Page indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {pages.map((_, i) => {
          const active = isDesktop ? i === currentPage || i === currentPage + 1 : i === currentPage;
          return (
            <button
              key={i}
              onClick={() => goToPage(isDesktop ? i - (i % 2) : i)}
              className={`h-2 rounded-full transition-all duration-500 ${
                active ? "bg-accent w-6" : "bg-foreground/30 w-2 hover:bg-foreground/50"
              }`}
              aria-label={`صفحة ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Page name pill */}
      <div
        className={`absolute top-4 right-4 px-3 py-1.5 rounded-full transition-opacity duration-500 z-20 ${
          fabVisible ? "opacity-70" : "opacity-20"
        }`}
        style={{
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <span className="text-foreground text-xs font-amiri">{pages[currentPage]?.name}</span>
      </div>

      {/* FAB */}
      <button
        onClick={() => setSheetOpen(true)}
        className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700 z-20 ${
          fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10 hover:opacity-90"
        }`}
        style={{
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-label="خيارات التلقين"
      >
        <Settings className="w-5 h-5 text-foreground" />
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t-0 max-h-[85vh] overflow-y-auto"
          style={{
            background: "rgba(245,240,230,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-center text-foreground font-amiri text-xl">
              خيارات التلقين
            </SheetTitle>
            <SheetDescription className="text-center text-muted-foreground text-sm">
              {pages[currentPage]?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 py-3">
            <div className="rounded-xl bg-background/60 p-3 space-y-3 border border-border/40">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <BookMarked className="w-4 h-4 text-accent" />
                <span>نطاق التلاوة (من آية إلى آية)</span>
              </div>
              <div className="grid grid-cols-2 gap-2" dir="rtl">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">من</label>
                  <Select
                    value={String(fromAyah)}
                    onValueChange={(v) => {
                      const n = parseInt(v, 10);
                      setFromAyah(n);
                      if (toAyah < n) setToAyah(n);
                    }}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: totalAyahs }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>الآية {n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">إلى</label>
                  <Select value={String(toAyah)} onValueChange={(v) => setToAyah(parseInt(v, 10))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: totalAyahs }, (_, i) => i + 1)
                        .filter((n) => n >= fromAyah)
                        .map((n) => (
                          <SelectItem key={n} value={String(n)}>الآية {n}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-background/60 p-3 space-y-2 border border-border/40">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <Repeat className="w-4 h-4 text-accent" />
                <span>عدد التكرار</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {repeatOptions.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRepeat(r.value)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      repeat === r.value
                        ? "bg-accent text-accent-foreground shadow"
                        : "bg-background/70 text-foreground hover:bg-background"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {options.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setMode(opt.key);
                    setRepeatTick(0);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 border-2 ${
                    mode === opt.key
                      ? "bg-accent/20 border-accent"
                      : "bg-background/60 border-transparent hover:border-accent/30"
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div className="text-right flex-1">
                    <p className="font-bold text-foreground text-sm">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setSheetOpen(false);
                onBack();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 text-primary font-bold transition-all duration-300 hover:bg-primary/20 mt-2"
            >
              <ArrowRight className="w-5 h-5" />
              <span>العودة لقائمة التلاوات</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MushafPage;
