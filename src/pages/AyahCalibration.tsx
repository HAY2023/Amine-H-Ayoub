import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Copy, Link2, Pause, Play, RotateCcw, Save, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { AyahBox, AYAH_COORDINATES, getAllPageSources, getPageAyahBoxes, PAGE_IMAGE_SIZE, resetPageAyahBoxes, savePageAyahBoxes } from "@/data/ayahCoordinates";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";
import { getSurahTimings, saveSurahTimings } from "@/data/ayahTimings";
import { toast } from "@/hooks/use-toast";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const step = 10;

type Speaker = "teacher" | "kids";

const speakerColors: Record<Speaker, { fill: string; stroke: string; label: string }> = {
  teacher: { fill: "rgba(250,204,21,0.45)", stroke: "rgba(250,204,21,0.85)", label: "👨‍🏫 معلم" },
  kids:    { fill: "rgba(56,189,248,0.45)", stroke: "rgba(56,189,248,0.85)", label: "👦 طفل" },
};

const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) return "—";
  const m = Math.floor(s / 60);
  const sec = (s - m * 60).toFixed(2);
  return `${m}:${sec.padStart(5, "0")}`;
};

const AyahCalibration = () => {
  const pageSources = useMemo(() => getAllPageSources(), []);
  const [pageSrc, setPageSrc] = useState(pageSources[0]);
  const [boxes, setBoxes] = useState<AyahBox[]>(() => getPageAyahBoxes(pageSources[0]));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scale, setScale] = useState(() => typeof window === "undefined" ? 1 : clamp((window.innerWidth - 24) / PAGE_IMAGE_SIZE.width, 0.25, 1));
  const [speaker, setSpeaker] = useState<Speaker>("teacher");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewBound, setPreviewBound] = useState(true); // play within saved bounds vs full
  const canvasRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef<number | null>(null);
  const selected = boxes[selectedIndex];

  const loadPage = (src: string) => {
    setPageSrc(src);
    setBoxes(getPageAyahBoxes(src));
    setSelectedIndex(0);
    stopAudio();
  };

  const stopAudio = () => {
    const a = audioRef.current; if (!a) return;
    a.pause(); stopAtRef.current = null; setIsPlaying(false);
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
    const copy: AyahBox = {
      ...selected,
      y: clamp(selected.y + selected.height + 8, 0, PAGE_IMAGE_SIZE.height - selected.height),
      audioStart: undefined,
      audioEnd: undefined,
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

  const unifyWidth = () => {
    if (!selected) return;
    const x = selected.x;
    const width = selected.width;
    setBoxes((current) => current.map((box) => ({ ...box, x, width })));
    toast({ title: "تم توحيد العرض", description: "أصبح لكل المربعات نفس العرض والموضع الأفقي" });
  };

  const unifyHeight = () => {
    if (!selected) return;
    const height = selected.height;
    setBoxes((current) => current.map((box) => ({ ...box, height })));
    toast({ title: "تم توحيد الارتفاع", description: "أصبح لكل المربعات نفس الارتفاع" });
  };

  const splitHorizontal = () => {
    if (!selected) return;
    const h1 = selected.height / 2;
    const box1 = { ...selected, height: h1 };
    const box2 = { ...selected, height: h1, y: selected.y + h1, audioStart: undefined, audioEnd: undefined };
    setBoxes((current) => {
      const next = [...current];
      next.splice(selectedIndex, 1, box1, box2);
      return next;
    });
  };

  const splitVertical = () => {
    if (!selected) return;
    const w1 = selected.width / 2;
    const box1 = { ...selected, width: w1 };
    const box2 = { ...selected, width: w1, x: selected.x + w1, audioStart: undefined, audioEnd: undefined };
    setBoxes((current) => {
      const next = [...current];
      next.splice(selectedIndex, 1, box1, box2);
      return next;
    });
  };

  const linkWithPrevious = () => {
    if (selectedIndex === 0 || !selected) return;
    const prev = boxes[selectedIndex - 1];
    updateSelected({ surah: prev.surah, ayah: prev.ayah });
    toast({ title: "تم الربط", description: `تم ربط الجزء بالآية ${prev.surah}:${prev.ayah}` });
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

  // === Load audio when surah changes ===
  const ensureAudioLoaded = (surah: number, then?: () => void) => {
    const a = audioRef.current; if (!a) return;
    const targetSrc = audioPath(surah);
    const expectedFile = targetSrc.split("/").pop() || targetSrc;
    if (!a.src || !a.src.endsWith(expectedFile)) {
      a.src = targetSrc;
      a.load();
      a.addEventListener("loadedmetadata", () => then?.(), { once: true });
    } else if (a.duration > 0) {
      then?.();
    } else {
      a.addEventListener("loadedmetadata", () => then?.(), { once: true });
    }
  };

  // === Play selected box: use bound audio segment if available, else play whole file ===
  const playSelected = () => {
    if (!selected) return;
    const a = audioRef.current; if (!a) return;
    ensureAudioLoaded(selected.surah, () => {
      const start = selected.audioStart ?? 0;
      const end = selected.audioEnd;
      stopAtRef.current = previewBound && end && end > start ? end : null;
      a.currentTime = start;
      a.play().catch(() => {});
    });
  };

  // === Capture buttons: bind current playback time to selected box ===
  const setStartFromCurrent = () => {
    if (!selected || !audioRef.current) return;
    const t = audioRef.current.currentTime;
    updateSelected({ audioStart: Number(t.toFixed(3)), speaker });
    toast({ title: "تم تحديد البداية", description: `${fmtTime(t)} للآية ${selected.surah}:${selected.ayah}` });
  };

  const setEndFromCurrent = () => {
    if (!selected || !audioRef.current) return;
    const t = audioRef.current.currentTime;
    updateSelected({ audioEnd: Number(t.toFixed(3)), speaker });
    toast({ title: "تم تحديد النهاية", description: `${fmtTime(t)} للآية ${selected.surah}:${selected.ayah}` });
  };

  const clearBinding = () => {
    if (!selected) return;
    updateSelected({ audioStart: undefined, audioEnd: undefined });
    toast({ title: "أُلغي الربط الصوتي" });
  };

  // === Seek by tapping the timeline ===
  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current; if (!a) return;
    const t = Number(e.target.value);
    a.currentTime = t;
    setCurrentTime(t);
    stopAtRef.current = null; // user took manual control
  };

  const onTimeUpdate = () => {
    const a = audioRef.current; if (!a) return;
    setCurrentTime(a.currentTime);
    if (stopAtRef.current !== null && a.currentTime >= stopAtRef.current - 0.02) {
      a.pause();
      stopAtRef.current = null;
    }
  };

  const onLoadedMeta = () => {
    const a = audioRef.current; if (!a) return;
    setDuration(a.duration || 0);
  };

  // Pre-load audio on selection change
  useEffect(() => {
    if (selected) ensureAudioLoaded(selected.surah);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.surah]);

  // Stop audio when page changes
  useEffect(() => { stopAudio(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageSrc]);

  const saveAll = (silent = false) => {
    savePageAyahBoxes(pageSrc, boxes);
    
    // Also sync to SurahTimings segments
    const surahMap: Record<number, number[]> = {};
    boxes.forEach(b => {
      if (b.audioStart !== undefined) {
        if (!surahMap[b.surah]) surahMap[b.surah] = [];
        surahMap[b.surah].push(b.audioStart);
      }
    });

    Object.entries(surahMap).forEach(([sNum, times]) => {
      const n = parseInt(sNum);
      const existing = getSurahTimings(n);
      if (existing) {
        const segName = `📍 معايرة: ${pageSrc.split("/").pop()}`;
        const otherSegments = existing.segments?.filter(s => s.name !== segName) || [];
        saveSurahTimings(n, {
          ...existing,
          segments: [...otherSegments, { name: segName, timings: times.sort((a,b) => a-b) }]
        });
      }
    });

    if (!silent) {
      const bound = boxes.filter((b) => b.audioStart !== undefined && b.audioEnd !== undefined).length;
      toast({ title: "تم الحفظ ✅", description: `${boxes.length} مربع، ${bound} مربوط بصوت` });
    }
  };

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(() => saveAll(true), 1000);
    return () => clearTimeout(timer);
  }, [boxes, pageSrc]);

  const colors = speakerColors[speaker];
  const hasBinding = selected?.audioStart !== undefined && selected?.audioEnd !== undefined;

  const surahTimings = useMemo(() => selected ? getSurahTimings(selected.surah) : null, [selected?.surah]);
  
  const applyTimingFromSegment = (startTime: number, endTime?: number) => {
    if (!selected) return;
    updateSelected({ 
      audioStart: startTime, 
      audioEnd: endTime ?? startTime + 2, // default 2s if no end
      speaker 
    });
    toast({ title: "تم تطبيق التوقيت", description: `من المقاطع المسجلة: ${fmtTime(startTime)}` });
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-3" dir="rtl">
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMeta}
        onDurationChange={onLoadedMeta}
      />
      <div className="mx-auto max-w-5xl space-y-3">
        <header className="flex items-center justify-between gap-2 rounded-xl bg-card p-3 shadow-sm">
          <a href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary" aria-label="رجوع"><ArrowRight className="h-5 w-5" /></a>
          <div className="flex-1 text-center">
            <h1 className="font-amiri text-xl font-bold">ضبط تظلال ومعايرة الآيات</h1>
            <p className="text-xs text-muted-foreground">حدّد المربع، استخدم "تقسيم" للآيات الطويلة، واربط الصوت بالآية.</p>
          </div>
          <button onClick={() => saveAll(false)} className="flex h-10 items-center gap-1 rounded-full bg-accent px-3 font-bold text-accent-foreground shadow-md active:scale-95 transition-all"><Save className="h-4 w-4" /> حفظ الكل</button>
        </header>

        <section className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <div className="max-h-[78vh] overflow-auto rounded-xl bg-card p-2 shadow-sm touch-none">
            <div ref={canvasRef} className="relative mx-auto origin-top" style={{ width: PAGE_IMAGE_SIZE.width * scale, height: PAGE_IMAGE_SIZE.height * scale }}>
              <img src={pageSrc} alt="صفحة المصحف للمعايرة" className="absolute inset-0 h-full w-full select-none object-fill" draggable={false} />
              {boxes.map((box, index) => {
                const isSelected = index === selectedIndex;
                const bound = box.audioStart !== undefined && box.audioEnd !== undefined;
                const boxSpeaker = box.speaker ?? "teacher";
                const boxColors = speakerColors[boxSpeaker];
                return (
                  <button
                    key={`${box.surah}-${box.ayah}-${index}`}
                    onPointerDown={(e) => dragStart(index, e)}
                    className="absolute rounded-md border-2 transition-colors touch-none"
                    style={{
                      left: box.x * scale,
                      top: box.y * scale,
                      width: box.width * scale,
                      height: box.height * scale,
                      mixBlendMode: "multiply",
                      background: isSelected ? colors.fill : (bound ? boxColors.fill : "rgba(156,163,175,0.18)"),
                      borderColor: isSelected ? colors.stroke : (bound ? boxColors.stroke : "rgba(107,114,128,0.5)"),
                      borderStyle: bound ? "solid" : "dashed",
                    }}
                    aria-label={`سورة ${box.surah} آية ${box.ayah}`}
                  >
                    <span className="absolute right-1 top-1 rounded-full bg-card/90 px-1 text-xs font-bold">
                      {box.surah}:{box.ayah}{bound ? " 🔗" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="space-y-3 rounded-xl bg-card p-3 shadow-sm">
            <label className="block text-sm font-bold">الصفحة</label>
            <select value={pageSrc} onChange={(e) => loadPage(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2">
              {pageSources.map((src) => <option key={src} value={src}>{src.replace("/pages/", "")}</option>)}
            </select>

            <label className="block text-sm font-bold">الآية المحددة</label>
            <select value={selectedIndex} onChange={(e) => { setSelectedIndex(Number(e.target.value)); stopAudio(); }} className="w-full rounded-lg border border-border bg-background p-2">
              {boxes.map((box, index) => {
                const bound = box.audioStart !== undefined && box.audioEnd !== undefined;
                return <option key={`${box.surah}-${box.ayah}-${index}`} value={index}>{bound ? "🔗 " : "○ "}سورة {box.surah} - آية {box.ayah} · جزء {index + 1}</option>;
              })}
            </select>

            {/* Speaker */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSpeaker("teacher")} className={`p-2 rounded-lg font-bold text-sm ${speaker === "teacher" ? "bg-amber-400 text-amber-950" : "bg-secondary"}`}>👨‍🏫 معلم</button>
              <button onClick={() => setSpeaker("kids")} className={`p-2 rounded-lg font-bold text-sm ${speaker === "kids" ? "bg-sky-400 text-sky-950" : "bg-secondary"}`}>👦 طفل</button>
            </div>

            {/* Audio scrubber */}
            <div className="rounded-lg bg-secondary/60 p-2 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span>{fmtTime(currentTime)}</span>
                <span className="text-muted-foreground">{fmtTime(duration)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.01}
                value={currentTime}
                onChange={onSeek}
                className="w-full"
              />
              <div className="flex items-center gap-1">
                <button onClick={isPlaying ? stopAudio : playSelected} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary p-2 text-primary-foreground font-bold text-sm">
                  {isPlaying ? <><Pause className="h-4 w-4" /> إيقاف</> : <><Play className="h-4 w-4" /> تشغيل</>}
                </button>
                <label className="flex items-center gap-1 text-xs px-2">
                  <input type="checkbox" checked={previewBound} onChange={(e) => setPreviewBound(e.target.checked)} />
                  ضمن الحدود
                </label>
              </div>
            </div>

            {/* Binding controls */}
            <div className="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-2 space-y-2">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">🎯 ربط الصوت بهذه الآية</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={setStartFromCurrent} className="rounded-lg bg-emerald-600 p-2 text-white text-sm font-bold">⏺ بداية ← الآن</button>
                <button onClick={setEndFromCurrent} className="rounded-lg bg-rose-600 p-2 text-white text-sm font-bold">⏹ نهاية ← الآن</button>
              </div>
              <div className="text-xs text-center font-mono bg-card rounded p-1">
                {selected?.audioStart !== undefined ? fmtTime(selected.audioStart) : "—"}
                {" → "}
                {selected?.audioEnd !== undefined ? fmtTime(selected.audioEnd) : "—"}
                {hasBinding && selected?.audioEnd! > selected?.audioStart! && (
                  <span className="text-muted-foreground"> ({(selected!.audioEnd! - selected!.audioStart!).toFixed(2)}ث)</span>
                )}
              </div>
              {hasBinding && (
                <button onClick={clearBinding} className="w-full text-xs rounded-lg bg-secondary p-1 flex items-center justify-center gap-1">
                  <Link2 className="h-3 w-3" /> إلغاء الربط
                </button>
              )}
              
              {/* Link from saved segments */}
              {surahTimings && (surahTimings.teacher.length > 0 || (surahTimings.segments && surahTimings.segments.length > 0)) && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20">
                  <label className="block text-[10px] font-bold text-emerald-600 mb-1">استيراد من التوقيتات المسجلة:</label>
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {/* Teacher timings as a segment */}
                    <div className="flex flex-wrap gap-1">
                      {surahTimings.teacher.map((t, i) => (
                        <button 
                          key={i} 
                          onClick={() => applyTimingFromSegment(t, surahTimings.teacher[i+1])}
                          className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-1 rounded"
                        >
                          آية {i+1}
                        </button>
                      ))}
                    </div>
                    {/* Custom segments */}
                    {surahTimings.segments?.map((seg, sIdx) => (
                      <div key={sIdx} className="space-y-1">
                        <div className="text-[9px] text-muted-foreground font-bold">{seg.name}:</div>
                        <div className="flex flex-wrap gap-1">
                          {seg.timings.map((t, i) => (
                            <button 
                              key={i} 
                              onClick={() => applyTimingFromSegment(t, seg.timings[i+1])}
                              className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-800 px-1 rounded"
                            >
                              {i+1}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Move/Resize */}
            <div className="grid grid-cols-3 gap-2 text-sm font-bold">
              <span />
              <button onClick={() => move(0, -step)} className="rounded-lg bg-secondary p-3">↑</button>
              <span />
              <button onClick={() => move(step, 0)} className="rounded-lg bg-secondary p-3">→</button>
              <button onClick={() => move(0, step)} className="rounded-lg bg-secondary p-3">↓</button>
              <button onClick={() => move(-step, 0)} className="rounded-lg bg-secondary p-3">←</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => resize(step, 0)} className="rounded-lg bg-secondary p-2 text-sm">عرض +</button>
              <button onClick={() => resize(-step, 0)} className="rounded-lg bg-secondary p-2 text-sm">عرض -</button>
              <button onClick={() => resize(0, step)} className="rounded-lg bg-secondary p-2 text-sm">ارتفاع +</button>
              <button onClick={() => resize(0, -step)} className="rounded-lg bg-secondary p-2 text-sm">ارتفاع -</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={unifyWidth} className="rounded-lg bg-emerald-500/10 border border-emerald-500 text-emerald-700 p-2 font-bold text-xs">📐 توحيد العرض</button>
              <button onClick={unifyHeight} className="rounded-lg bg-amber-500/10 border border-amber-500 text-amber-700 p-2 font-bold text-xs">📐 توحيد الارتفاع</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={duplicateSelected} className="flex items-center justify-center gap-1 rounded-lg bg-accent p-2 font-bold text-accent-foreground text-sm"><Copy className="h-4 w-4" /> جزء آخر</button>
              <button onClick={linkWithPrevious} disabled={selectedIndex === 0} className="flex items-center justify-center gap-1 rounded-lg bg-sky-500 p-2 font-bold text-white text-sm disabled:opacity-50"><Link2 className="h-4 w-4" /> ربط بالسابق</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={splitHorizontal} className="flex items-center justify-center gap-1 rounded-lg bg-secondary p-2 font-bold text-sm">↔ انقسام أفقي</button>
              <button onClick={splitVertical} className="flex items-center justify-center gap-1 rounded-lg bg-secondary p-2 font-bold text-sm">↕ انقسام رأسي</button>
            </div>

            <button onClick={deleteSelected} className="w-full flex items-center justify-center gap-1 rounded-lg bg-destructive p-2 font-bold text-destructive-foreground text-sm"><Trash2 className="h-4 w-4" /> حذف الجزء المحدد</button>

            <div className="flex gap-2">
              <button onClick={() => setScale((s) => clamp(s + 0.1, 0.25, 1.4))} className="flex-1 rounded-lg bg-primary p-2 text-primary-foreground"><ZoomIn className="mx-auto h-4 w-4" /></button>
              <button onClick={() => setScale((s) => clamp(s - 0.1, 0.25, 1.4))} className="flex-1 rounded-lg bg-primary p-2 text-primary-foreground"><ZoomOut className="mx-auto h-4 w-4" /></button>
            </div>

            <button onClick={() => { resetPageAyahBoxes(pageSrc); setBoxes(AYAH_COORDINATES[pageSrc].map((b) => ({ ...b }))); }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive/80 p-2 text-destructive-foreground text-sm"><RotateCcw className="h-4 w-4" /> إعادة ضبط</button>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default AyahCalibration;
