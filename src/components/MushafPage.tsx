import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Settings, ArrowRight, ChevronLeft, ChevronRight, Repeat, Play, Pause } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AYAH_COUNTS, getCurrentAyahAtTime, getAyahStartTime, hasKidsSection, getSpeakerAtTime } from "@/data/ayahTimings";

type VoiceMode = "teacher" | "kids" | "both";
type RepeatMode = 1 | 2 | 3 | 99;
const STORAGE_KEY = "mushaf:lastPage";
const VOICE_KEY = "mushaf:voiceMode";

interface SurahAudio {
  name: string;
  number: number;
  src: string; // fallback (الملف الموحد الحالي)
  teacherSrc?: string; // ملف صوت المعلم (اختياري - عند توفره)
  kidsSrc?: string; // ملف صوت الطفل (اختياري - عند توفره)
  ayahCount: number;
}
interface PageInfo { name: string; src: string; surahs: SurahAudio[]; }

// ملاحظة: عند توفر ملفات منفصلة، أضف teacherSrc و kidsSrc بهذا الشكل:
//   { name: "...", number: 1, src: "/audio/surahs/1.mp3",
//     teacherSrc: "/audio/teacher/1.mp3", kidsSrc: "/audio/kids/1.mp3", ayahCount: 7 }
const pages: PageInfo[] = [
  { name: "الفاتحة", src: "/pages/fatiha.jpg", surahs: [
    { name: "الفاتحة", number: 1, src: "/audio/surahs/1.mp3", ayahCount: 7 },
  ]},
  { name: "القارعة - التكاثر", src: "/pages/600.jpg", surahs: [
    { name: "التكاثر", number: 14, src: "/audio/surahs/14.mp3", ayahCount: 8 },
  ]},
  { name: "العصر - الهمزة - الفيل", src: "/pages/601.jpg", surahs: [
    { name: "العصر", number: 13, src: "/audio/surahs/13.mp3", ayahCount: 3 },
    { name: "الهمزة", number: 12, src: "/audio/surahs/12.mp3", ayahCount: 9 },
    { name: "الفيل", number: 11, src: "/audio/surahs/11.mp3", ayahCount: 5 },
  ]},
  { name: "قريش - الماعون - الكوثر", src: "/pages/602.jpg", surahs: [
    { name: "قريش", number: 10, src: "/audio/surahs/10.mp3", ayahCount: 4 },
    { name: "الماعون", number: 9, src: "/audio/surahs/9.mp3", ayahCount: 7 },
    { name: "الكوثر", number: 8, src: "/audio/surahs/8.mp3", ayahCount: 3 },
  ]},
  { name: "الكافرون - النصر - المسد", src: "/pages/603.jpg", surahs: [
    { name: "الكافرون", number: 7, src: "/audio/surahs/7.mp3", ayahCount: 6 },
    { name: "النصر", number: 6, src: "/audio/surahs/6.mp3", ayahCount: 3 },
    { name: "المسد", number: 5, src: "/audio/surahs/5.mp3", ayahCount: 5 },
  ]},
  { name: "الإخلاص - الفلق - الناس", src: "/pages/604.jpg", surahs: [
    { name: "الإخلاص", number: 4, src: "/audio/surahs/4.mp3", ayahCount: 4 },
    { name: "الفلق", number: 3, src: "/audio/surahs/3.mp3", ayahCount: 5 },
    { name: "الناس", number: 2, src: "/audio/surahs/2.mp3", ayahCount: 6 },
  ]},
];

// تحدد أي ملف يجب تشغيله بناءً على نوع الصوت المختار
type Speaker = "teacher" | "kids";
const resolveAudioSrc = (surah: SurahAudio, speaker: Speaker): string => {
  if (speaker === "teacher") return surah.teacherSrc || surah.src;
  return surah.kidsSrc || surah.src;
};

const voiceColors: Record<VoiceMode, { bg: string; glow: string; text: string }> = {
  teacher: { bg: "rgba(250,204,21,0.25)", glow: "rgba(250,204,21,0.5)", text: "#b45309" },
  kids: { bg: "rgba(56,189,248,0.25)", glow: "rgba(56,189,248,0.5)", text: "#0369a1" },
  both: { bg: "rgba(52,211,153,0.25)", glow: "rgba(52,211,153,0.5)", text: "#047857" },
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

  // Audio state
  const [activeSurah, setActiveSurah] = useState<SurahAudio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(0); // 1-based
  const [duration, setDuration] = useState(0);
  // المتحدث الحالي عند الوضع "معاً" (يبدأ بالمعلم ثم ينتقل للطفل)
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>("teacher");
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => { localStorage.setItem(VOICE_KEY, voiceMode); }, [voiceMode]);
  useEffect(() => {
    const r = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", r); return () => window.removeEventListener("resize", r);
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, String(currentPage)); }, [currentPage]);

  // Stop on page change
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setActiveSurah(null); setIsPlaying(false); setCurrentAyah(0); setDuration(0);
  }, [currentPage]);

  const resetFabTimer = useCallback(() => {
    setFabVisible(true); clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setFabVisible(false), 5000);
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

  // تشغيل سورة بصوت محدد (معلم/طفل) — يتعامل مع الملف المدمج بالقفز إلى الموضع
  const playSurahWithSpeaker = (surah: SurahAudio, speaker: Speaker) => {
    const a = audioRef.current; if (!a) return;
    const src = resolveAudioSrc(surah, speaker);
    const isCombined = !surah.kidsSrc && !surah.teacherSrc; // لا يوجد ملفات منفصلة → ملف مدمج
    const sameSrc = a.src && a.src.endsWith(src);

    if (!sameSrc) { a.src = src; a.load(); }

    setActiveSurah(surah);
    setCurrentSpeaker(speaker);
    setCurrentAyah(1);

    // ابدأ التشغيل من الموضع الصحيح
    const startCombinedKids = isCombined && speaker === "kids" && hasKidsSection(surah.number);
    if (startCombinedKids) {
      const t = getAyahStartTime(surah.number, 1, a.duration || 0, "kids");
      // إذا لم تُحمَّل المدة بعد، انتظر loadedmetadata
      if (a.duration > 0) a.currentTime = t;
      else a.addEventListener("loadedmetadata", () => { a.currentTime = t; }, { once: true });
    } else if (isCombined && speaker === "teacher") {
      a.currentTime = 0;
    }
    a.play().catch(() => {});
  };

  // Play a surah (entry point)
  const playSurah = (surah: SurahAudio) => {
    const a = audioRef.current; if (!a) return;
    if (activeSurah?.src === surah.src && isPlaying) { a.pause(); return; }
    if (activeSurah?.src === surah.src && !isPlaying) { a.play().catch(() => {}); return; }
    const startSpeaker: Speaker = voiceMode === "kids" ? "kids" : "teacher";
    setCurrentRepeat(1);
    playSurahWithSpeaker(surah, startSpeaker);
  };

  // تتبع الآية والمتحدث الحاليين باستخدام التوقيتات الحقيقية إن وُجدت
  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !activeSurah || a.duration <= 0) return;
    const isCombined = !activeSurah.kidsSrc && !activeSurah.teacherSrc;

    const { ayah, speaker } = getCurrentAyahAtTime(activeSurah.number, a.currentTime, a.duration);
    if (ayah > 0) setCurrentAyah(ayah);

    // في الملف المدمج: حدّث المتحدث تلقائياً عند تجاوز نقطة الانتقال
    if (isCombined && speaker && speaker !== currentSpeaker && voiceMode === "both") {
      setCurrentSpeaker(speaker);
    }

    // في وضع "المعلم" فقط على ملف مدمج: أوقف عند بداية قسم الطفل
    if (isCombined && voiceMode === "teacher" && hasKidsSection(activeSurah.number)) {
      const sp = getSpeakerAtTime(activeSurah.number, a.currentTime);
      if (sp === "kids") {
        a.pause();
        // عامله كنهاية مقطع
        handleEnded();
      }
    }
  };

  const handleEnded = () => {
    if (!activeSurah) return;
    const isCombined = !activeSurah.kidsSrc && !activeSurah.teacherSrc;

    // ملفات منفصلة + وضع "معاً": بعد المعلم شغّل الطفل
    if (!isCombined && voiceMode === "both" && currentSpeaker === "teacher") {
      playSurahWithSpeaker(activeSurah, "kids");
      return;
    }

    // التكرار
    if (repeat === 99 || currentRepeat < repeat) {
      setCurrentRepeat(c => c + 1);
      const startSpeaker: Speaker = voiceMode === "kids" ? "kids" : "teacher";
      playSurahWithSpeaker(activeSurah, startSpeaker);
    } else {
      setIsPlaying(false); setActiveSurah(null); setCurrentAyah(0); setCurrentRepeat(0);
    }
  };

  // Jump to specific ayah (using real timings when available)
  const jumpToAyah = (ayahNum: number) => {
    const a = audioRef.current;
    if (!a || !activeSurah || a.duration <= 0) return;
    const speaker = voiceMode === "both" ? currentSpeaker : (voiceMode === "kids" ? "kids" : "teacher");
    a.currentTime = getAyahStartTime(activeSurah.number, ayahNum, a.duration, speaker);
    setCurrentAyah(ayahNum);
    if (!isPlaying) a.play().catch(() => {});
  };

  // Preload
  useEffect(() => {
    [currentPage - 1, currentPage + 1, currentPage + 2].filter(i => i >= 0 && i < pages.length).forEach(i => { const img = new Image(); img.src = pages[i].src; });
  }, [currentPage]);

  const visiblePages = useMemo(() => {
    if (isDesktop) return [pages[currentPage], pages[currentPage + 1]].filter(Boolean) as PageInfo[];
    return [pages[currentPage]];
  }, [currentPage, isDesktop]);

  // Calculate ayah highlight position on page
  const getHighlightStyle = (page: PageInfo): React.CSSProperties | null => {
    if (!isPlaying || !activeSurah || currentAyah <= 0) return null;
    // Check if active surah is on this page
    const surahIdx = page.surahs.findIndex(s => s.src === activeSurah.src);
    if (surahIdx === -1) return null;

    const totalPageAyahs = page.surahs.reduce((sum, s) => sum + s.ayahCount, 0);
    const ayahsBefore = page.surahs.slice(0, surahIdx).reduce((sum, s) => sum + s.ayahCount, 0);
    const globalAyah = ayahsBefore + currentAyah;
    const ayahHeight = 100 / totalPageAyahs;
    // top 10% is usually header/title area
    const topOffset = 8;
    const usableHeight = 100 - topOffset - 4;
    const top = topOffset + ((globalAyah - 1) / totalPageAyahs) * usableHeight;
    // اللون يتبع المتحدث الفعلي (مهم في وضع "معاً": أصفر للمعلم ثم سماوي للطفل)
    const activeColorKey: VoiceMode = voiceMode === "both" ? currentSpeaker : voiceMode;
    const vc = voiceColors[activeColorKey];

    return {
      position: "absolute" as const,
      left: "5%", right: "5%",
      top: `${top}%`,
      height: `${(usableHeight / totalPageAyahs)}%`,
      background: vc.bg,
      borderRadius: "8px",
      boxShadow: `0 0 15px ${vc.glow}`,
      mixBlendMode: "multiply" as const,
      transition: "top 0.4s ease, background 0.4s ease, box-shadow 0.4s ease",
      pointerEvents: "none" as const,
    };
  };

  // لون الواجهة العامة يتبع المتحدث الحالي عند "معاً"، وإلا يتبع الوضع
  const activeVoiceKey: VoiceMode = voiceMode === "both" && isPlaying ? currentSpeaker : voiceMode;
  const vc = voiceColors[activeVoiceKey];
  const voiceOpts = [
    { key: "teacher" as VoiceMode, label: "المعلم", emoji: "👨‍🏫", cls: "bg-amber-100 border-amber-400" },
    { key: "kids" as VoiceMode, label: "الأطفال", emoji: "👦", cls: "bg-sky-100 border-sky-400" },
    { key: "both" as VoiceMode, label: "معاً", emoji: "👨‍👦", cls: "bg-emerald-100 border-emerald-400" },
  ];
  const repeatOpts: { value: RepeatMode; label: string }[] = [
    { value: 1, label: "مرة" }, { value: 2, label: "مرتين" }, { value: 3, label: "3×" }, { value: 99, label: "∞" },
  ];

  return (
    <div className="fixed inset-0 z-50" style={{ background: "#f5f0e6" }} onMouseMove={resetFabTimer} onTouchStart={onTS} onTouchEnd={onTE}>
      <audio ref={audioRef} onEnded={handleEnded} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate} onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)} />

      {/* Page */}
      <div className="flex h-full w-full" dir="rtl">
        {visiblePages.map((page, idx) => {
          const hl = getHighlightStyle(page);
          return (
            <div key={`${page.src}-${idx}`} className="relative h-full flex-1 min-w-0 flex items-center justify-center overflow-hidden" style={{ background: "#f5f0e6" }}>
              <img ref={idx === 0 ? imgRef : undefined} src={page.src} alt={page.name} className="max-w-full max-h-full object-contain select-none animate-fade-in" loading="eager" decoding="async" draggable={false} />
              {/* Ayah highlight band */}
              {hl && <div style={hl} />}
            </div>
          );
        })}
      </div>

      {/* Current ayah indicator */}
      {isPlaying && activeSurah && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg animate-fade-in"
          style={{ background: vc.bg, border: `2px solid ${vc.glow}` }}>
          <span className="text-lg">{(voiceMode === "both" ? currentSpeaker : voiceMode) === "teacher" ? "👨‍🏫" : "👦"}</span>
          <span className="font-amiri font-bold text-sm" style={{ color: vc.text }}>
            {voiceMode === "both" ? (currentSpeaker === "teacher" ? "المعلم · " : "الطفل · ") : ""}
            سورة {activeSurah.name} — الآية {currentAyah} من {activeSurah.ayahCount}
          </span>
          <span className="text-xs opacity-60">({currentRepeat}/{repeat === 99 ? "∞" : repeat})</span>
        </div>
      )}

      {/* Ayah number buttons when playing */}
      {isPlaying && activeSurah && (
        <div className={`absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20 transition-opacity ${fabVisible ? "opacity-90" : "opacity-20"}`}>
          {Array.from({ length: activeSurah.ayahCount }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => jumpToAyah(n)}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${currentAyah === n ? "scale-110 shadow-md" : "opacity-60 hover:opacity-100"}`}
              style={currentAyah === n ? { background: vc.glow, color: "#fff" } : { background: "rgba(255,255,255,0.7)" }}>
              {n}
            </button>
          ))}
        </div>
      )}

      {/* Surah play buttons */}
      <div className={`absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 z-20 transition-opacity max-w-[90vw] ${fabVisible ? "opacity-100" : "opacity-30"}`}>
        {pages[currentPage]?.surahs.map((s) => {
          const active = activeSurah?.src === s.src && isPlaying;
          return (
            <button key={s.src} onClick={() => playSurah(s)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg ${active ? "scale-105" : "bg-white/90 text-foreground hover:scale-105"}`}
              style={active ? { background: vc.bg, border: `2px solid ${vc.glow}` } : { backdropFilter: "blur(12px)" }}>
              {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="font-amiri">{s.name}</span>
              {active && <div className="flex items-center gap-[2px] h-3">{[0,1,2].map(i => <span key={i} className="w-[2px] rounded-full animate-wave" style={{ background: vc.glow, animationDelay: `${i*0.12}s` }} />)}</div>}
            </button>
          );
        })}
      </div>

      {/* Nav */}
      <button onClick={goPrev} disabled={currentPage === 0} className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-0 z-20 ${fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10"}`} style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)" }}><ChevronRight className="w-6 h-6" /></button>
      <button onClick={goNext} disabled={currentPage + step >= pages.length} className={`absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-0 z-20 ${fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10"}`} style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)" }}><ChevronLeft className="w-6 h-6" /></button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {pages.map((_, i) => {
          const a = isDesktop ? i === currentPage || i === currentPage + 1 : i === currentPage;
          return <button key={i} onClick={() => goToPage(isDesktop ? i - (i % 2) : i)} className={`h-2 rounded-full transition-all ${a ? "bg-accent w-6" : "bg-foreground/30 w-2"}`} />;
        })}
      </div>

      {/* Page name */}
      <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full z-20 transition-opacity ${fabVisible ? "opacity-70" : "opacity-20"}`} style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
        <span className="text-foreground text-xs font-amiri">{pages[currentPage]?.name}</span>
      </div>

      {/* Settings */}
      <button onClick={() => setSheetOpen(true)} className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center transition-all z-20 ${fabVisible ? "opacity-60 hover:opacity-90" : "opacity-10 hover:opacity-90"}`} style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)" }}><Settings className="w-5 h-5" /></button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t-0 max-h-[85vh] overflow-y-auto" style={{ background: "rgba(245,240,230,0.95)", backdropFilter: "blur(20px)" }}>
          <SheetHeader className="pb-2">
            <SheetTitle className="text-center font-amiri text-xl">⚙️ إعدادات الصوت</SheetTitle>
            <SheetDescription className="text-center text-sm">{pages[currentPage]?.name}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-3">
            {/* Voice */}
            <div className="rounded-xl bg-background/60 p-4 space-y-3 border border-border/40">
              <p className="font-bold text-sm">🎙️ نوع الصوت</p>
              <div className="grid grid-cols-3 gap-2">
                {voiceOpts.map(v => (
                  <button key={v.key} onClick={() => setVoiceMode(v.key)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border-2 ${voiceMode === v.key ? v.cls + " scale-105 shadow-md" : "bg-background/70 border-transparent"}`}>
                    <span className="text-2xl">{v.emoji}</span>
                    <span className="text-xs font-bold">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Repeat */}
            <div className="rounded-xl bg-background/60 p-4 space-y-3 border border-border/40">
              <p className="font-bold text-sm">🔁 عدد التكرار</p>
              <div className="grid grid-cols-4 gap-2">
                {repeatOpts.map(r => (
                  <button key={r.value} onClick={() => setRepeat(r.value)} className={`py-2.5 rounded-xl text-sm font-bold transition-all ${repeat === r.value ? "bg-accent text-accent-foreground shadow-md scale-105" : "bg-background/70"}`}>{r.label}</button>
                ))}
              </div>
            </div>
            {/* Quick play */}
            <div className="rounded-xl bg-background/60 p-4 space-y-3 border border-border/40">
              <p className="font-bold text-sm">▶️ تشغيل</p>
              <div className="grid grid-cols-2 gap-2">
                {pages[currentPage]?.surahs.map(s => {
                  const act = activeSurah?.src === s.src && isPlaying;
                  return (
                    <button key={s.src} onClick={() => { playSurah(s); setSheetOpen(false); }} className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all border-2 ${act ? "border-accent bg-accent/20" : "bg-background/70 border-transparent"}`}>
                      {act ? <Pause className="w-5 h-5 text-accent" /> : <Play className="w-5 h-5 text-accent" />}
                      <span className="font-amiri">{s.name}</span>
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
