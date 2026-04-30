import { useMemo, useRef, useState } from "react";
import { ArrowRight, Copy, RotateCcw, Save, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { AyahBox, AYAH_COORDINATES, getAllPageSources, getPageAyahBoxes, PAGE_IMAGE_SIZE, resetPageAyahBoxes, savePageAyahBoxes } from "@/data/ayahCoordinates";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const step = 10;

const AyahCalibration = () => {
  const pageSources = useMemo(() => getAllPageSources(), []);
  const [pageSrc, setPageSrc] = useState(pageSources[0]);
  const [boxes, setBoxes] = useState<AyahBox[]>(() => getPageAyahBoxes(pageSources[0]));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scale, setScale] = useState(() => typeof window === "undefined" ? 1 : clamp((window.innerWidth - 24) / PAGE_IMAGE_SIZE.width, 0.25, 1));
  const canvasRef = useRef<HTMLDivElement>(null);
  const selected = boxes[selectedIndex];

  const loadPage = (src: string) => {
    setPageSrc(src);
    setBoxes(getPageAyahBoxes(src));
    setSelectedIndex(0);
  };

  const updateSelected = (patch: Partial<AyahBox>) => {
    setBoxes((current) => current.map((box, index) => index === selectedIndex ? { ...box, ...patch } : box));
  };

  const move = (dx: number, dy: number) => {
    if (!selected) return;
    updateSelected({
      x: clamp(selected.x + dx, 0, PAGE_IMAGE_SIZE.width - selected.width),
      y: clamp(selected.y + dy, 0, PAGE_IMAGE_SIZE.height - selected.height),
    });
  };

  const resize = (dw: number, dh: number) => {
    if (!selected) return;
    updateSelected({
      width: clamp(selected.width + dw, 30, PAGE_IMAGE_SIZE.width - selected.x),
      height: clamp(selected.height + dh, 25, PAGE_IMAGE_SIZE.height - selected.y),
    });
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = {
      ...selected,
      y: clamp(selected.y + selected.height + 8, 0, PAGE_IMAGE_SIZE.height - selected.height),
    };
    setBoxes((current) => {
      const next = [...current.slice(0, selectedIndex + 1), copy, ...current.slice(selectedIndex + 1)];
      setSelectedIndex(selectedIndex + 1);
      return next;
    });
  };

  const deleteSelected = () => {
    if (boxes.length <= 1) return;
    setBoxes((current) => current.filter((_, index) => index !== selectedIndex));
    setSelectedIndex((index) => Math.max(0, index - 1));
  };

  const dragStart = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedIndex(index);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startBox = boxes[index];
    const onMove = (event: PointerEvent) => {
      const ratioX = PAGE_IMAGE_SIZE.width / canvasRect.width;
      const ratioY = PAGE_IMAGE_SIZE.height / canvasRect.height;
      setBoxes((current) => current.map((box, i) => i === index ? {
        ...box,
        x: clamp(startBox.x + (event.clientX - startX) * ratioX, 0, PAGE_IMAGE_SIZE.width - startBox.width),
        y: clamp(startBox.y + (event.clientY - startY) * ratioY, 0, PAGE_IMAGE_SIZE.height - startBox.height),
      } : box));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-3" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-3">
        <header className="flex items-center justify-between gap-2 rounded-xl bg-card p-3 shadow-sm">
          <a href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary" aria-label="رجوع"><ArrowRight className="h-5 w-5" /></a>
          <div className="flex-1 text-center">
            <h1 className="font-amiri text-xl font-bold">معايرة تظليل الآيات</h1>
            <p className="text-xs text-muted-foreground">اسحب المربع فوق الآية، ثم كبّر أو صغّر من الأزرار.</p>
          </div>
          <button onClick={() => { savePageAyahBoxes(pageSrc, boxes); }} className="flex h-10 items-center gap-1 rounded-full bg-accent px-3 font-bold text-accent-foreground"><Save className="h-4 w-4" /> حفظ</button>
        </header>

        <section className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="max-h-[78vh] overflow-auto rounded-xl bg-card p-2 shadow-sm touch-none">
            <div ref={canvasRef} className="relative mx-auto origin-top" style={{ width: PAGE_IMAGE_SIZE.width * scale, height: PAGE_IMAGE_SIZE.height * scale }}>
              <img src={pageSrc} alt="صفحة المصحف للمعايرة" className="absolute inset-0 h-full w-full select-none object-fill" draggable={false} />
              {boxes.map((box, index) => (
                <button
                  key={`${box.surah}-${box.ayah}-${index}`}
                  onPointerDown={(e) => dragStart(index, e)}
                  className={`absolute rounded-md border-2 transition-colors touch-none ${index === selectedIndex ? "border-accent bg-accent/30" : "border-primary/40 bg-accent/15"}`}
                  style={{ left: box.x * scale, top: box.y * scale, width: box.width * scale, height: box.height * scale, mixBlendMode: "multiply" }}
                  aria-label={`سورة ${box.surah} آية ${box.ayah}`}
                >
                  <span className="absolute right-1 top-1 rounded-full bg-card/90 px-1 text-xs font-bold">{box.surah}:{box.ayah}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className="space-y-3 rounded-xl bg-card p-3 shadow-sm">
            <label className="block text-sm font-bold">الصفحة</label>
            <select value={pageSrc} onChange={(e) => loadPage(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2">
              {pageSources.map((src) => <option key={src} value={src}>{src.replace("/pages/", "")}</option>)}
            </select>

            <label className="block text-sm font-bold">الآية</label>
            <select value={selectedIndex} onChange={(e) => setSelectedIndex(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background p-2">
              {boxes.map((box, index) => <option key={`${box.surah}-${box.ayah}-${index}`} value={index}>سورة {box.surah} - آية {box.ayah} · جزء {index + 1}</option>)}
            </select>

            <div className="rounded-lg bg-secondary/70 p-2 text-xs text-muted-foreground">
              إذا كانت الآية في سطرين أو أكثر، اضغط "جزء آخر" ثم اسحب المستطيل الجديد فوق السطر الثاني.
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm font-bold">
              <span />
              <button onClick={() => move(0, -step)} className="rounded-lg bg-secondary p-3">↑</button>
              <span />
              <button onClick={() => move(step, 0)} className="rounded-lg bg-secondary p-3">→</button>
              <button onClick={() => move(0, step)} className="rounded-lg bg-secondary p-3">↓</button>
              <button onClick={() => move(-step, 0)} className="rounded-lg bg-secondary p-3">←</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => resize(step, 0)} className="rounded-lg bg-secondary p-2">عرض +</button>
              <button onClick={() => resize(-step, 0)} className="rounded-lg bg-secondary p-2">عرض -</button>
              <button onClick={() => resize(0, step)} className="rounded-lg bg-secondary p-2">ارتفاع +</button>
              <button onClick={() => resize(0, -step)} className="rounded-lg bg-secondary p-2">ارتفاع -</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={duplicateSelected} className="flex items-center justify-center gap-1 rounded-lg bg-accent p-2 font-bold text-accent-foreground"><Copy className="h-4 w-4" /> جزء آخر</button>
              <button onClick={deleteSelected} className="flex items-center justify-center gap-1 rounded-lg bg-destructive p-2 font-bold text-destructive-foreground"><Trash2 className="h-4 w-4" /> حذف جزء</button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setScale((s) => clamp(s + 0.1, 0.25, 1.4))} className="flex-1 rounded-lg bg-primary p-2 text-primary-foreground"><ZoomIn className="mx-auto h-4 w-4" /></button>
              <button onClick={() => setScale((s) => clamp(s - 0.1, 0.25, 1.4))} className="flex-1 rounded-lg bg-primary p-2 text-primary-foreground"><ZoomOut className="mx-auto h-4 w-4" /></button>
            </div>

            <button onClick={() => { resetPageAyahBoxes(pageSrc); setBoxes(AYAH_COORDINATES[pageSrc].map((b) => ({ ...b }))); }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive p-2 text-destructive-foreground"><RotateCcw className="h-4 w-4" /> إعادة ضبط الصفحة</button>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default AyahCalibration;