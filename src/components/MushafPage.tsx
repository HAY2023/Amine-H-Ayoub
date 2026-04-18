import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Settings, ArrowRight, ChevronLeft, ChevronRight, Repeat, Play, Pause } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

type VoiceMode = "teacher" | "kids" | "both";
type RepeatMode = 1 | 2 | 3 | 99;
const STORAGE_KEY = "mushaf:lastPage";
const VOICE_KEY = "mushaf:voiceMode";

interface AudioFile { name: string; src: string; }
interface PageInfo { name: string; src: string; ayahCount: number; audioFiles: AudioFile[]; }

const pages: PageInfo[] = [
  { name: "الفاتحة", src: "/pages/fatiha.jpg", ayahCount: 7, audioFiles: [{ name: "الفاتحة", src: "/audio/surahs/1.mp3" }] },
  { name: "القارعة - التكاثر", src: "/pages/600.jpg", ayahCount: 19, audioFiles: [{ name: "التكاثر", src: "/audio/surahs/14.mp3" }] },
  { name: "العصر - الهمزة - الفيل", src: "/pages/601.jpg", ayahCount: 17, audioFiles: [{ name: "العصر", src: "/audio/surahs/13.mp3" }, { name: "الهمزة", src: "/audio/surahs/12.mp3" }, { name: "الفيل", src: "/audio/surahs/11.mp3" }] },
  { name: "قريش - الماعون - الكوثر", src: "/pages/602.jpg", ayahCount: 14, audioFiles: [{ name: "قريش", src: "/audio/surahs/10.mp3" }, { name: "الماعون", src: "/audio/surahs/9.mp3" }, { name: "الكوثر", src: "/audio/surahs/8.mp3" }] },
  { name: "الكافرون - النصر - المسد", src: "/pages/603.jpg", ayahCount: 14, audioFiles: [{ name: "الكافرون", src: "/audio/surahs/7.mp3" }, { name: "النصر", src: "/audio/surahs/6.mp3" }, { name: "المسد", src: "/audio/surahs/5.mp3" }] },
  { name: "الإخلاص - الفلق - الناس", src: "/pages/604.jpg", ayahCount: 15, audioFiles: [{ name: "الإخلاص", src: "/audio/surahs/4.mp3" }, { name: "الفلق", src: "/audio/surahs/3.mp3" }, { name: "الناس", src: "/audio/surahs/2.mp3" }] },
];

// Overlay colors per voice mode
const overlayStyles: Record<VoiceMode, { bg: string; border: string; label: string }> = {
  teacher: { bg: "rgba(250, 204, 21, 0.15)", border: "rgba(250, 204, 21, 0.5)", label: "👨‍🏫 المعلم" },
  kids:    { bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.5)", label: "👦 الأطفال" },
  both:    { bg: "rgba(52, 211, 153, 0.15)", border: "rgba(52, 211, 153, 0.5)", label: "👨‍👦 معاً" },
};

interface Props { onBack: () => void; }

const MushafPage = ({ onBack }: Props) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const s = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return isNaN(s) || s < 0 || s >= pages.length ? 0 : s;
  });
  const [fabVisible, setFabVisible] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 1024 : false);

  const [voiceMode, setVoiceMode] = useState<VoiceMode>(() => (localStorage.getItem(VOICE_KEY) as VoiceMode) || "both");
  const [repeat, setRepeat] = useState<RepeatMode>(2);
  const [currentRepeat, setCurrentRepeat] = useState(0);

  const [playingSrc, setPlayingSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { localStorage.setItem(VOICE_KEY, voiceMode); }, [voiceMode]);
  useEffect(() => {
    const r = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", r); return () => window.removeEventListener("resize", r);
  }, []);
  useEffect(() => {
    if (isDesktop && currentPage % 2 !== 0 && currentPage > 0) setCurrentPage(currentPage - 1);
  }, [isDesktop, currentPage]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, String(currentPage)); }, [currentPage]);

  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setPlayingSrc(null); setIsPlaying(false); setCurrentRepeat(0); setAudioProgress(0);
  }, [currentPage]);

  const resetFabTimer = useCallback(() => {
    setFabVisible(true); clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setFabVisible(false), 4000);
  }, []);
  useEffect(() => { resetFabTimer(); return () => clearTimeout(fadeTimer.current); }, [resetFabTimer]);

  const step = isDesktop ? 2 : 1;
  const goToPage = (i: number) => { if (i >= 0 && i < pages.length) { setCurrentPage(i); resetFabTimer(); } };
  const goPrev = () => goToPage(Math.max(0, currentPage - step));
  const goNext = () => goToPage(Math.min(pages.length - 1, currentPage + step));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "ArrowRight") goPrev(); if (e.key === "ArrowLeft") goNext(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [currentPage, isDesktop]);

  const touchX = useRef<number | null>(null);
  const onTS = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; resetFabTimer(); };
  const onTE = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current; touchX.current = null;
    if (Math.abs(dx) < 50) return; dx > 0 ? goPrev() : goNext();
  };

  const toggleAudio = (src: string) => {
    const a = audioRef.current; if (!a) return;
    if (playingSrc === src && isPlaying) { a.pause(); }
    else if (playingSrc === src) { a.play().catch(() => {}); }
    else { a.src = src; a.load(); setCurrentRepeat(1); setAudioProgress(0); a.play().catch(() => {}); setPlayingSrc(src); }
  };

  const handleEnded = () => {
    if (repeat === 99 || currentRepeat < repeat) {
      setCurrentRepeat(c => c + 1);
      const a = audioRef.current; if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    } else { setIsPlaying(false); setPlayingSrc(null); setCurrentRepeat(0); setAudioProgress(0); }
  };

  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (a && a.duration > 0) setAudioProgress((a.currentTime / a.duration) * 100);
  };

  useEffect(() => {
    [currentPage - 1, currentPage + 1, currentPage + 2].filter(i => i >= 0 && i < pages.length).forEach(i => { const img = new Image(); img.src = pages[i].src; });
  }, [currentPage]);

  const visiblePages = useMemo(() => {
    if (isDesktop) return [pages[currentPage], pages[currentPage + 1]].filter(Boolean) as PageInfo[];
    return [pages[currentPage]];
  }, [currentPage, isDesktop]);

  const voiceOpts = [
    { key: "teacher" as VoiceMode, label: "المعلم فقط", emoji: "👨‍🏫", activeClass: "bg-amber-100 border-amber-400 shadow-amber-200" },
    { key: "kids" as VoiceMode, label: "الأطفال فقط", emoji: "👦", activeClass: "bg-sky-100 border-sky-400 shadow-sky-200" },
    { key: "both" as VoiceMode, label: "المعلم + الأطفال", emoji: "👨‍👦", activeClass: "bg-emerald-100 border-emerald-400 shadow-emerald-200" },
  ];
  const repeatOpts: { value: RepeatMode; label: string }[] = [
    { value: 1, label: "مرة" }, { value: 2, label: "مرتين" }, { value: 3, label: "3 مرات" }, { value: 99, label: "∞" },
  ];

  const ov = overlayStyles[voiceMode];

  return (
    <div className="fixed inset-0 z-50" style={{ background: "#f5f0e6" }} onMouseMove={resetFabTimer} onTouchStart={onTS} onTouchEnd={onTE}>
      <audio ref={audioRef} onEnded={handleEnded} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} onTimeUpdate={handleTimeUpdate} />

      {/* Pages */}
      <div className="flex h-full w-full" dir="rtl">
        {visiblePages.map((page, idx) => (
          <div key={`${page.src}-${idx}`} className="relative h-full flex-1 min-w-0 flex items-center justify-center overflow-hidden" style={{ background: "#f5f0e6" }}>
            <img src={page.src} alt={`صفحة ${page.name}`} className="max-w-full max-h-full object-contain select-none animate-fade-in" loading="eager" decoding="async" draggable={false} />

            {/* Color overlay when playing */}
            {isPlaying && (
              <>
                {/* Colored border glow */}
                <div className="absolute inset-0 pointer-events-none transition-all duration-700" style={{
                  boxShadow: `inset 0 0 60px ${ov.border}, inset 0 0 120px ${ov.bg}`,
                }} />
                {/* Progress bar on the side (RTL - right side) */}
                <div className="absolute top-0 right-0 w-1.5 h-full pointer-events-none" style={{ background: "rgba(0,0,0,0.1)" }}>
                  <div className="w-full rounded-full transition-all duration-300" style={{
                    height: `${audioProgress}%`,
                    background: ov.border,
                    boxShadow: `0 0 8px ${ov.border}`,
                  }} />
                </div>
                {/* Voice mode label */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full pointer-events-none animate-pulse" style={{ background: ov.bg, border: `1.5px solid ${ov.border}` }}>
                  <span className="text-xs font-bold" style={{ color: ov.border }}>{ov.label}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Surah audio buttons */}
      <div className={`absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 z-20 transition-opacity duration-500 max-w-[90vw] ${fabVisible ? "opacity-100" : "opacity-30"}`}>
        {pages[currentPage]?.audioFiles.map((af) => {
          const active = playingSrc === af.src && isPlaying;
          return (
            <button key={af.src} onClick={() => toggleAudio(af.src)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-lg ${active ? "scale-105" : "bg-white/90 text-foreground hover:bg-white hover:scale-105"}`}
              style={active ? { background: ov.bg, border: `2px solid ${ov.border}`, backdropFilter: "blur(12px)" } : { backdropFilter: "blur(12px)" }}>
              {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="font-amiri">{af.name}</span>
              {active && currentRepeat > 0 && <span className="text-[10px] opacity-70">({currentRepeat}/{repeat === 99 ? "∞" : repeat})</span>}
              {active && (
                <div className="flex items-center gap-[2px] h-3">
                  {[0, 1, 2].map(i => <span key={i} className="w-[2px] rounded-full animate-wave" style={{ background: ov.border, animationDelay: `${i * 0.12}s` }} />)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Nav */}
      <button onClick={goPrev} disabled={currentPage === 0} aria-label="السابقة" className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-0 z-20 ${fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10"}`} style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)" }}><ChevronRight className="w-6 h-6 text-foreground" /></button>
      <button onClick={goNext} disabled={currentPage + step >= pages.length} aria-label="التالية" className={`absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-0 z-20 ${fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10"}`} style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)" }}><ChevronLeft className="w-6 h-6 text-foreground" /></button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {pages.map((_, i) => {
          const a = isDesktop ? i === currentPage || i === currentPage + 1 : i === currentPage;
          return <button key={i} onClick={() => goToPage(isDesktop ? i - (i % 2) : i)} className={`h-2 rounded-full transition-all duration-500 ${a ? "bg-accent w-6" : "bg-foreground/30 w-2"}`} />;
        })}
      </div>

      {/* Page name */}
      <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full z-20 transition-opacity ${fabVisible ? "opacity-70" : "opacity-20"}`} style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
        <span className="text-foreground text-xs font-amiri">{pages[currentPage]?.name}</span>
      </div>

      {/* Settings FAB */}
      <button onClick={() => setSheetOpen(true)} className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center transition-all z-20 ${fabVisible ? "opacity-60 hover:opacity-90" : "opacity-10 hover:opacity-90"}`} style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)" }}><Settings className="w-5 h-5 text-foreground" /></button>

      {/* Settings */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t-0 max-h-[85vh] overflow-y-auto" style={{ background: "rgba(245,240,230,0.95)", backdropFilter: "blur(20px)" }}>
          <SheetHeader className="pb-2">
            <SheetTitle className="text-center text-foreground font-amiri text-xl">⚙️ إعدادات الصوت والمصحف</SheetTitle>
            <SheetDescription className="text-center text-muted-foreground text-sm">{pages[currentPage]?.name}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-3">
            {/* Voice */}
            <div className="rounded-xl bg-background/60 p-4 space-y-3 border border-border/40">
              <p className="font-bold text-foreground text-sm">🎙️ نوع الصوت</p>
              <div className="grid grid-cols-3 gap-2">
                {voiceOpts.map(v => (
                  <button key={v.key} onClick={() => setVoiceMode(v.key)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border-2 ${voiceMode === v.key ? v.activeClass + " scale-105 shadow-md" : "bg-background/70 border-transparent hover:border-accent/30"}`}>
                    <span className="text-2xl">{v.emoji}</span>
                    <span className="text-xs font-bold text-foreground">{v.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground/80 text-center">لون مختلف يظهر على المصحف حسب نوع الصوت المختار</p>
            </div>
            {/* Repeat */}
            <div className="rounded-xl bg-background/60 p-4 space-y-3 border border-border/40">
              <p className="font-bold text-foreground text-sm"><Repeat className="w-4 h-4 text-accent inline ml-1" /> عدد التكرار</p>
              <div className="grid grid-cols-4 gap-2">
                {repeatOpts.map(r => (
                  <button key={r.value} onClick={() => setRepeat(r.value)} className={`py-2.5 rounded-xl text-sm font-bold transition-all ${repeat === r.value ? "bg-accent text-accent-foreground shadow-md scale-105" : "bg-background/70 text-foreground hover:bg-background"}`}>{r.label}</button>
                ))}
              </div>
            </div>
            {/* Quick play */}
            <div className="rounded-xl bg-background/60 p-4 space-y-3 border border-border/40">
              <p className="font-bold text-foreground text-sm">▶️ تشغيل سريع</p>
              <div className="grid grid-cols-2 gap-2">
                {pages[currentPage]?.audioFiles.map(af => {
                  const act = playingSrc === af.src && isPlaying;
                  return (
                    <button key={af.src} onClick={() => toggleAudio(af.src)} className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all border-2 ${act ? "border-accent bg-accent/20" : "bg-background/70 border-transparent hover:border-accent/30"}`}>
                      {act ? <Pause className="w-5 h-5 text-accent" /> : <Play className="w-5 h-5 text-accent" />}
                      <span className="font-amiri text-foreground">{af.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={() => { setSheetOpen(false); onBack(); }} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20"><ArrowRight className="w-5 h-5" /><span>العودة للتلاوات</span></button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MushafPage;
