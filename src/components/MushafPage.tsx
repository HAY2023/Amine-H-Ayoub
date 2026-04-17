import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Settings, ArrowRight, ChevronLeft, ChevronRight, Repeat, BookMarked } from "lucide-react";
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
  ayahCount: number; // approximate ayah count for the demo dropdown
}

const pages: PageInfo[] = [
  { name: "الفاتحة", src: "/pages/fatiha.jpg", ayahCount: 7 },
  { name: "القارعة - التكاثر", src: "/pages/600.jpg", ayahCount: 19 },
  { name: "العصر - الهمزة - الفيل", src: "/pages/601.jpg", ayahCount: 17 },
  { name: "قريش - الماعون - الكوثر", src: "/pages/602.jpg", ayahCount: 14 },
  { name: "الكافرون - النصر - المسد", src: "/pages/603.jpg", ayahCount: 14 },
  { name: "الإخلاص - الفلق - الناس", src: "/pages/604.jpg", ayahCount: 15 },
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

  // Reciter range + repeat
  const [fromAyah, setFromAyah] = useState(1);
  const [toAyah, setToAyah] = useState(1);
  const [repeat, setRepeat] = useState<RepeatMode>(1);
  const [repeatTick, setRepeatTick] = useState(0); // used to alternate teacher/child overlay on repeats

  const containerRef = useRef<HTMLDivElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();
  const isProgrammaticScroll = useRef(false);

  const totalAyahs = pages[currentPage]?.ayahCount ?? 1;

  // Persist current page
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(currentPage));
  }, [currentPage]);

  // Reset ayah range when page changes
  useEffect(() => {
    setFromAyah(1);
    setToAyah(Math.min(5, totalAyahs));
  }, [currentPage, totalAyahs]);

  // Restore scroll to saved page on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    isProgrammaticScroll.current = true;
    el.scrollTo({ left: currentPage * el.clientWidth, behavior: "auto" });
    setTimeout(() => (isProgrammaticScroll.current = false), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-hide FAB
  const resetFabTimer = useCallback(() => {
    setFabVisible(true);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setFabVisible(false), 3000);
  }, []);

  useEffect(() => {
    resetFabTimer();
    return () => clearTimeout(fadeTimer.current);
  }, [resetFabTimer]);

  // Track current page on horizontal scroll
  const handleScroll = () => {
    resetFabTimer();
    if (!containerRef.current || isProgrammaticScroll.current) return;
    const el = containerRef.current;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== currentPage) setCurrentPage(idx);
  };

  const goToPage = (idx: number) => {
    if (idx < 0 || idx >= pages.length || !containerRef.current) return;
    isProgrammaticScroll.current = true;
    containerRef.current.scrollTo({ left: idx * containerRef.current.clientWidth, behavior: "smooth" });
    setCurrentPage(idx);
    setTimeout(() => (isProgrammaticScroll.current = false), 600);
  };

  // Simulate repeat tick for teacher/child alternation when "both" mode active
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onTouchStart={resetFabTimer}
      onMouseMove={resetFabTimer}
    >
      {/* Horizontal carousel */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
        dir="ltr"
      >
        {pages.map((page, idx) => (
          <div
            key={idx}
            className="relative flex-shrink-0 w-full h-full snap-center flex items-center justify-center bg-black"
          >
            <img
              src={page.src}
              alt={`صفحة ${page.name}`}
              className="max-w-full max-h-full object-contain select-none"
              loading={Math.abs(idx - currentPage) <= 1 ? "eager" : "lazy"}
              draggable={false}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const parent = img.parentElement;
                if (parent && !parent.querySelector(".fallback")) {
                  const div = document.createElement("div");
                  div.className = "fallback text-white/70 text-center p-6 font-amiri text-xl";
                  div.textContent = `تعذّر تحميل صفحة ${page.name}`;
                  parent.appendChild(div);
                }
              }}
            />
            {/* Overlay */}
            {idx === currentPage && effectiveOverlay !== "none" && (
              <div
                className={`absolute inset-0 ${overlayClass[effectiveOverlay]} pointer-events-none transition-all duration-1000`}
                style={overlayBlend}
              />
            )}
          </div>
        ))}
      </div>

      {/* Side navigation arrows */}
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 0}
        className={`absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 disabled:opacity-0 ${
          fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10"
        }`}
        style={{
          background: "rgba(255,255,255,0.18)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-label="الصفحة السابقة"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === pages.length - 1}
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 disabled:opacity-0 ${
          fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10"
        }`}
        style={{
          background: "rgba(255,255,255,0.18)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-label="الصفحة التالية"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Page indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {pages.map((_, i) => (
          <button
            key={i}
            onClick={() => goToPage(i)}
            className={`h-2 rounded-full transition-all duration-500 ${
              i === currentPage ? "bg-white w-6" : "bg-white/40 w-2 hover:bg-white/70"
            }`}
            aria-label={`صفحة ${i + 1}`}
          />
        ))}
      </div>

      {/* Page name pill */}
      <div
        className={`absolute top-4 right-4 px-3 py-1.5 rounded-full transition-opacity duration-500 ${
          fabVisible ? "opacity-70" : "opacity-20"
        }`}
        style={{
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <span className="text-white text-xs font-amiri">{pages[currentPage]?.name}</span>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setSheetOpen(true)}
        className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700 ${
          fabVisible ? "opacity-50 hover:opacity-90" : "opacity-10 hover:opacity-90"
        }`}
        style={{
          background: "rgba(255,255,255,0.18)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-label="خيارات التلقين"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {/* Bottom Sheet - control panel */}
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

          {/* Ayah range + repeat */}
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
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                💡 سيتم ربط التوقيتات (Timestamps) بالمقاطع الصوتية لاحقاً
              </p>
            </div>

            {/* Repeat */}
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

            {/* Overlay modes */}
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

            {/* Back */}
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
