import { useState, useRef, useEffect, useCallback } from "react";
import { Settings, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type OverlayMode = "none" | "teacher" | "child" | "both";

const pages = [
  { name: "الفاتحة", src: "/pages/mushaf-fatiha.jpg" },
  { name: "التكاثر - العصر - الهمزة - الفيل", src: "/pages/599.jpg" },
  { name: "العصر - الهمزة - الفيل", src: "/pages/600.jpg" },
  { name: "قريش - الماعون - الكوثر", src: "/pages/601.jpg" },
  { name: "الكافرون - النصر - المسد", src: "/pages/602.jpg" },
  { name: "الإخلاص - الفلق - الناس", src: "/pages/603.jpg" },
];

const overlayStyles: Record<OverlayMode, string> = {
  none: "",
  teacher: "bg-yellow-100/20 mix-blend-multiply",
  child: "bg-sky-200/25 mix-blend-multiply",
  both: "bg-emerald-100/20 mix-blend-multiply animate-breathe",
};

interface Props {
  onBack: () => void;
}

const MushafPage = ({ onBack }: Props) => {
  const [mode, setMode] = useState<OverlayMode>("none");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [fabVisible, setFabVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Auto-hide FAB after inactivity
  const resetFabTimer = useCallback(() => {
    setFabVisible(true);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setFabVisible(false), 3000);
  }, []);

  useEffect(() => {
    resetFabTimer();
    return () => clearTimeout(fadeTimer.current);
  }, [resetFabTimer]);

  // Handle horizontal scroll snap to track page
  const handleScroll = () => {
    resetFabTimer();
    if (!containerRef.current) return;
    const el = containerRef.current;
    const pageWidth = el.clientWidth;
    const idx = Math.round(el.scrollLeft / pageWidth);
    setCurrentPage(idx);
  };

  const options: { key: OverlayMode; label: string; emoji: string; desc: string }[] = [
    { key: "teacher", label: "قراءة المعلم فقط", emoji: "👨‍🏫", desc: "طبقة لونية صفراء هادئة" },
    { key: "child", label: "قراءة الطفل فقط", emoji: "👦", desc: "طبقة لونية زرقاء خفيفة" },
    { key: "both", label: "المعلم والطفل معاً", emoji: "👨‍👦", desc: "تأثير متدرج يتنفس بطيئاً" },
    { key: "none", label: "بدون تظليل", emoji: "👁️", desc: "الوضع الطبيعي" },
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
            className="relative flex-shrink-0 w-full h-full snap-center flex items-center justify-center"
          >
            <img
              src={page.src}
              alt={`صفحة ${page.name}`}
              className="max-w-full max-h-full object-contain"
              loading={idx < 2 ? "eager" : "lazy"}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Overlay */}
            {mode !== "none" && (
              <div
                className={`absolute inset-0 ${overlayStyles[mode]} pointer-events-none transition-all duration-700`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Page indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
        {pages.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-500 ${
              i === currentPage ? "bg-white w-6" : "bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* Floating Action Button - semi-transparent */}
      <button
        onClick={() => setSheetOpen(true)}
        className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700 ${
          fabVisible
            ? "opacity-40 hover:opacity-90"
            : "opacity-10 hover:opacity-90"
        }`}
        style={{
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {/* Bottom Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t-0"
          style={{
            background: "rgba(var(--nav-bg-rgb, 245,240,230), 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-center text-foreground font-amiri text-xl">
              خيارات التلقين
            </SheetTitle>
            <SheetDescription className="text-center text-muted-foreground text-sm">
              اختر وضع القراءة المناسب
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-2 py-3">
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setMode(opt.key);
                  setSheetOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 border-2 ${
                  mode === opt.key
                    ? "bg-accent/20 border-accent"
                    : "bg-background/60 border-transparent hover:border-accent/30"
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div className="text-right flex-1">
                  <p className="font-bold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}

            {/* Back button */}
            <button
              onClick={() => {
                setSheetOpen(false);
                onBack();
              }}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-primary/10 text-primary font-bold transition-all duration-300 hover:bg-primary/20 mt-3"
            >
              <ArrowRight className="w-5 h-5" />
              <span>العودة للقائمة الرئيسية</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MushafPage;
