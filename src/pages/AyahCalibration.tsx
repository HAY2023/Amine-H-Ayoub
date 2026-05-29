import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Pause, Play, Plus, RotateCcw, Save, Trash2, ZoomIn, ZoomOut, Link2, Copy } from "lucide-react";
import { AyahBox, AYAH_COORDINATES, getAllPageSources, getPageAyahBoxes, PAGE_IMAGE_SIZE, resetPageAyahBoxes, savePageAyahBoxes } from "@/data/ayahCoordinates";
import { getSavedTimings, getSurahTimings, AudioSegment } from "@/data/ayahTimings";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const step = 10;

type Speaker = "teacher" | "kids";

const speakerColors: Record<Speaker, { fill: string; stroke: string }> = {
  teacher: { fill: "rgba(250,204,21,0.45)", stroke: "rgba(250,204,21,0.85)" },
  kids:    { fill: "rgba(56,189,248,0.45)", stroke: "rgba(56,189,248,0.85)" },
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
  const [isSaving, setIsSaving] = useState(false);
  const [segmentsList, setSegmentsList] = useState<AudioSegment[]>([]);
  const [history, setHistory] = useState<AyahBox[][]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef<number | null>(null);
  const selected = boxes[selectedIndex];

  useEffect(() => {
    if (selected) {
      const all = getSavedTimings();
      setSegmentsList(all[selected.surah]?.segments || []);
    }
  }, [selected]);

  const saveHistory = useCallback((currentBoxes: AyahBox[]) => {
    setHistory(prev => {
      const next = [...prev, currentBoxes];
      if (next.length > 20) next.shift(); // Keep last 20 states
      return next;
    });
  }, []);

  const undo = () => {
    if (history.length === 0) {
      toast({ title: "⚠️ لا يوجد تراجع", description: "لم تقم بأي تعديلات للتراجع عنها" });
      return;
    }
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setBoxes(previous);
    setSelectedIndex(i => Math.min(i, Math.max(0, previous.length - 1)));
    toast({ title: "↩️ تراجع", description: "تم التراجع عن التعديل الأخير" });
  };

  const loadPage = (src: string) => {
    setPageSrc(src);
    setBoxes(getPageAyahBoxes(src));
    setHistory([]);
    setSelectedIndex(0);
    stopAudio();
  };

  const stopAudio = () => {
    const a = audioRef.current; if (!a) return;
    a.pause(); stopAtRef.current = null; setIsPlaying(false);
  };

  const updateSelected = (patch: Partial<AyahBox>) => {
    setBoxes(current => current.map((box, i) => i === selectedIndex ? { ...box, ...patch } : box));
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
    saveHistory(boxes);
    const copy: AyahBox = {
      ...selected,
      y: clamp(selected.y + selected.height + 8, 0, PAGE_IMAGE_SIZE.height - selected.height),
      audioStart: undefined, audioEnd: undefined,
    };
    setBoxes(current => {
      const next = [...current.slice(0, selectedIndex + 1), copy, ...current.slice(selectedIndex + 1)];
      setSelectedIndex(selectedIndex + 1);
      return next;
    });
  };

  const deleteSelected = () => {
    if (boxes.length <= 1) return;
    saveHistory(boxes);
    setBoxes(current => current.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(i => Math.max(0, i - 1));
  };

  const applyHeightToAll = () => {
    if (!selected) return;
    saveHistory(boxes);
    setBoxes(current => current.map(box => ({
      ...box,
      height: selected.height
    })));
    toast({ title: "✅ تم توحيد الارتفاع", description: "تم تطبيق الارتفاع المحدد على جميع المربعات" });
  };

  const applyWidthAndXToAll = () => {
    if (!selected) return;
    saveHistory(boxes);
    setBoxes(current => current.map(box => ({
      ...box,
      x: selected.x,
      width: selected.width
    })));
    toast({ title: "✅ محاذاة العرض والمكان", description: "تم مساواة البداية والنهاية لجميع المربعات" });
  };

  const addNewBox = () => {
    saveHistory(boxes);
    const referenceBox = selected || boxes[boxes.length - 1];
    const newBox: AyahBox = {
      surah: referenceBox?.surah ?? 1,
      ayah: (referenceBox?.ayah ?? 0) + 1,
      x: referenceBox?.x ?? 140,
      y: referenceBox ? clamp(referenceBox.y + referenceBox.height + 10, 0, PAGE_IMAGE_SIZE.height - 100) : 300,
      width: referenceBox?.width ?? 980,
      height: referenceBox?.height ?? 100,
    };
    
    setBoxes(current => {
      if (selected) {
        const next = [...current.slice(0, selectedIndex + 1), newBox, ...current.slice(selectedIndex + 1)];
        setSelectedIndex(selectedIndex + 1);
        return next;
      } else {
        setSelectedIndex(current.length);
        return [...current, newBox];
      }
    });
  };

  const dragStart = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedIndex(index);
    saveHistory(boxes);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startBox = boxes[index];
    const onMove = (event: PointerEvent) => {
      const ratioX = PAGE_IMAGE_SIZE.width / canvasRect.width;
      const ratioY = PAGE_IMAGE_SIZE.height / canvasRect.height;
      setBoxes(current => current.map((box, i) => i === index ? {
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

  const ensureAudioLoaded = (surah: number, then?: () => void) => {
    const a = audioRef.current; if (!a) return;
    const targetSrc = audioPath(surah);
    const expectedFile = targetSrc.split("/").pop() || targetSrc;
    if (!a.src || !a.src.endsWith(expectedFile)) {
      a.src = targetSrc; a.load();
      a.addEventListener("loadedmetadata", () => then?.(), { once: true });
    } else if (a.duration > 0) { then?.(); }
    else { a.addEventListener("loadedmetadata", () => then?.(), { once: true }); }
  };

  const playSelected = () => {
    if (!selected) return;
    const a = audioRef.current; if (!a) return;
    ensureAudioLoaded(selected.surah, () => {
      const start = selected.audioStart ?? 0;
      const end = selected.audioEnd;
      stopAtRef.current = end && end > start ? end : null;
      a.currentTime = start;
      a.play().catch(() => {});
    });
  };

  const setStartFromCurrent = () => {
    if (!selected || !audioRef.current) return;
    const t = Number(audioRef.current.currentTime.toFixed(3));
    if (speaker === "teacher") {
      updateSelected({ audioStart: t });
      toast({ title: "✅ بداية المعلم", description: `${fmtTime(t)}` });
    } else {
      updateSelected({ kidsStart: t });
      toast({ title: "✅ بداية الطفل", description: `${fmtTime(t)}` });
    }
  };

  const setEndFromCurrent = () => {
    if (!selected || !audioRef.current) return;
    const t = Number(audioRef.current.currentTime.toFixed(3));
    if (speaker === "teacher") {
      updateSelected({ audioEnd: t });
      toast({ title: "✅ نهاية المعلم", description: `${fmtTime(t)}` });
    } else {
      updateSelected({ kidsEnd: t });
      toast({ title: "✅ نهاية الطفل", description: `${fmtTime(t)}` });
    }
  };

  const clearBinding = () => {
    if (!selected) return;
    updateSelected({ audioStart: undefined, audioEnd: undefined, kidsStart: undefined, kidsEnd: undefined });
    toast({ title: "✅ تم إلغاء الربط الصوتي بالكامل" });
  };

  const autoLinkFromTimings = () => {
    const savedAll = getSavedTimings();
    const surahs = Array.from(new Set(boxes.map(b => b.surah)));

    // Collect segments and teacher timings for each surah
    const surahSegments: Record<number, AudioSegment[]> = {};
    const surahTeacherTimes: Record<number, number[]> = {};
    surahs.forEach(s => {
      const saved = savedAll[s];
      if (saved) {
        // Prefer segments from /timings (they have speaker info)
        if (saved.segments && saved.segments.length > 0) {
          surahSegments[s] = saved.segments;
        }
        if (saved.teacher && saved.teacher.length > 0) {
          surahTeacherTimes[s] = saved.teacher;
        }
      } else {
        const t = getSurahTimings(s);
        if (t && t.teacher.length > 0) surahTeacherTimes[s] = t.teacher;
      }
    });

    setBoxes(current => {
      const usedCounts: Record<number, number> = {};
      return current.map(box => {
        const count = usedCounts[box.surah] || 0;
        usedCounts[box.surah] = count + 1;

        // Try segments first (most accurate, has speaker info)
        const segs = surahSegments[box.surah];
        if (segs) {
          const teacherSegs = segs.filter(s => s.speaker === "teacher");
          const kidsSegs = segs.filter(s => s.speaker === "kids");
          const tSeg = teacherSegs[count];
          const kSeg = kidsSegs[count];
          
          if (tSeg || kSeg) {
            return {
              ...box,
              audioStart: tSeg?.start,
              audioEnd: tSeg?.end,
              kidsStart: kSeg?.start,
              kidsEnd: kSeg?.end,
              speaker: "teacher", // legacy fallback
            };
          }
        }

        // Fallback to teacher timings array
        const times = surahTeacherTimes[box.surah];
        if (times && times[count] !== undefined) {
          return {
            ...box,
            audioStart: times[count],
            audioEnd: times[count + 1] ?? (times[count] + 3),
            speaker: "teacher",
          };
        }

        return box;
      });
    });
    toast({ title: "✅ تم الربط التلقائي", description: "تم ربط مقاطع المعلم والأطفال بنجاح من صفحة التقسيم" });
  };

  useEffect(() => {
    if (selected) ensureAudioLoaded(selected.surah);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.surah]);

  useEffect(() => { stopAudio(); }, [pageSrc]);

  const onTimeUpdate = () => {
    const a = audioRef.current; if (!a) return;
    setCurrentTime(a.currentTime);
    if (stopAtRef.current !== null && a.currentTime >= stopAtRef.current - 0.02) {
      a.pause(); stopAtRef.current = null;
    }
  };

  const saveAll = useCallback((silent = false) => {
    // Save only calibration box data — never touch /timings data
    savePageAyahBoxes(pageSrc, boxes);

    if (!silent) {
      setIsSaving(true);
      const bound = boxes.filter(b => b.audioStart !== undefined && b.audioEnd !== undefined).length;
      toast({ title: "✅ تم الحفظ", description: `${boxes.length} مربع، ${bound} مربوط` });
      setTimeout(() => setIsSaving(false), 1200);
    }
  }, [boxes, pageSrc]);

  // Track latest state for synchronous save on unmount (HMR) and keyboard shortcuts
  const stateRef = useRef({ pageSrc, boxes, selectedIndex, selected });
  useEffect(() => {
    stateRef.current = { pageSrc, boxes, selectedIndex, selected };
  }, [pageSrc, boxes, selectedIndex, selected]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is on an input or select
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') {
        return;
      }

      const currentSelected = stateRef.current.selected;
      
      // Box movement/manipulation helpers that use the latest state
      const moveBox = (dx: number, dy: number) => {
        if (!currentSelected) return;
        setBoxes(current => current.map((box, i) => i === stateRef.current.selectedIndex ? {
          ...box,
          x: clamp(currentSelected.x + dx, 0, PAGE_IMAGE_SIZE.width - currentSelected.width),
          y: clamp(currentSelected.y + dy, 0, PAGE_IMAGE_SIZE.height - currentSelected.height),
        } : box));
      };

      const resizeBox = (dw: number, dh: number) => {
        if (!currentSelected) return;
        setBoxes(current => current.map((box, i) => i === stateRef.current.selectedIndex ? {
          ...box,
          width: clamp(currentSelected.width + dw, 30, PAGE_IMAGE_SIZE.width - currentSelected.x),
          height: clamp(currentSelected.height + dh, 25, PAGE_IMAGE_SIZE.height - currentSelected.y),
        } : box));
      };

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveBox(0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveBox(0, step);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveBox(-step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveBox(step, 0);
          break;
        case '+':
        case '=':
          e.preventDefault();
          resizeBox(step, 0);
          break;
        case '-':
        case '_':
          e.preventDefault();
          resizeBox(-step, 0);
          break;
        case 'y':
        case 'Y':
        case 'غ':
          e.preventDefault();
          if (currentSelected) {
            setBoxes(current => {
              const copy: AyahBox = {
                ...currentSelected,
                y: clamp(currentSelected.y + currentSelected.height + 8, 0, PAGE_IMAGE_SIZE.height - currentSelected.height),
                audioStart: undefined, audioEnd: undefined,
              };
              const next = [...current.slice(0, stateRef.current.selectedIndex + 1), copy, ...current.slice(stateRef.current.selectedIndex + 1)];
              setSelectedIndex(stateRef.current.selectedIndex + 1);
              return next;
            });
          }
          break;
        case 'u':
        case 'U':
        case 'ع':
          e.preventDefault();
          setBoxes(current => {
            const referenceBox = currentSelected || current[current.length - 1];
            const newBox: AyahBox = {
              surah: referenceBox?.surah ?? 1,
              ayah: (referenceBox?.ayah ?? 0) + 1,
              x: referenceBox?.x ?? 140,
              y: referenceBox ? clamp(referenceBox.y + referenceBox.height + 10, 0, PAGE_IMAGE_SIZE.height - 100) : 300,
              width: referenceBox?.width ?? 980,
              height: referenceBox?.height ?? 100,
            };
            if (currentSelected) {
              const idx = stateRef.current.selectedIndex;
              const next = [...current.slice(0, idx + 1), newBox, ...current.slice(idx + 1)];
              setSelectedIndex(idx + 1);
              return next;
            } else {
              setSelectedIndex(current.length);
              return [...current, newBox];
            }
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Ensure we save right before component unmounts (e.g., during code edit / HMR)
    return () => {
      savePageAyahBoxes(stateRef.current.pageSrc, stateRef.current.boxes);
    };
  }, []);

  // Auto-save every 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => saveAll(true), 2000);
    return () => clearTimeout(timer);
  }, [boxes, pageSrc, saveAll]);

  const hasBinding = (selected?.audioStart !== undefined && selected?.audioEnd !== undefined) ||
                     (selected?.kidsStart !== undefined && selected?.kidsEnd !== undefined);
  const boundCount = boxes.filter(b => 
    (b.audioStart !== undefined && b.audioEnd !== undefined) || 
    (b.kidsStart !== undefined && b.kidsEnd !== undefined)
  ).length;

  const exportData = () => {
    try {
      const raw = localStorage.getItem("mushaf:ayahCoordinates:v1");
      if (raw) {
        navigator.clipboard.writeText(raw);
        toast({ title: "✅ تم النسخ بنجاح!", description: "اذهب إلى الموقع الآخر واضغط 'استيراد'" });
      } else {
        toast({ title: "لا يوجد بيانات", description: "لم تقم بحفظ أي تظليل بعد" });
      }
    } catch {
      toast({ title: "خطأ في النسخ", variant: "destructive" });
    }
  };

  const importData = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);
      if (typeof data === "object") {
        localStorage.setItem("mushaf:ayahCoordinates:v1", text);
        toast({ title: "✅ تم الاستيراد", description: "جاري تحديث الصفحة..." });
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch {
      toast({ title: "❌ خطأ في الاستيراد", description: "تأكد من أنك نسخت البيانات الصحيحة", variant: "destructive" });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-3" dir="rtl">
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(a.duration || 0); }}
        onDurationChange={() => { const a = audioRef.current; if (a) setDuration(a.duration || 0); }}
      />

      <div className="mx-auto max-w-5xl space-y-3">
        {/* Header */}
        <header className="flex items-center justify-between gap-2 rounded-2xl bg-slate-800/80 backdrop-blur border border-slate-700 p-3">
          <a href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 transition-colors">
            <ArrowRight className="h-5 w-5" />
          </a>
          <div className="flex-1 text-center">
            <h1 className="font-amiri text-xl font-bold bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">
              ضبط تظليل الآيات
            </h1>
            <p className="text-xs text-slate-400">
              {boundCount}/{boxes.length} آية مربوطة · حفظ تلقائي
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 bg-slate-700/50 p-1 rounded-full">
              <button
                onClick={exportData}
                className="flex items-center justify-center px-3 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                title="نسخ التظليلات لنقلها لموقع آخر"
              >
                تصدير
              </button>
              <div className="w-px bg-slate-600 my-1" />
              <button
                onClick={importData}
                className="flex items-center justify-center px-3 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                title="لصق التظليلات من موقع آخر"
              >
                استيراد
              </button>
            </div>
            <button
              onClick={undo}
              disabled={history.length === 0}
              className={`flex h-10 items-center gap-1 rounded-full px-4 font-bold text-sm shadow-lg active:scale-95 transition-all ${
                history.length === 0 ? "bg-slate-700/50 text-slate-500" : "bg-slate-700 hover:bg-slate-600 text-white"
              }`}
            >
              <RotateCcw className="h-4 w-4" /> تراجع
            </button>
            <button
              onClick={() => saveAll(false)}
              className={`flex h-10 items-center gap-1 rounded-full px-4 font-bold text-sm shadow-lg active:scale-95 transition-all ${
                isSaving ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-amber-500 to-amber-600 text-black"
              }`}
            >
              <Save className="h-4 w-4" /> {isSaving ? "✅" : "حفظ"}
            </button>
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-[1fr_300px]">
          {/* Canvas */}
          <div className="max-h-[80vh] overflow-auto rounded-2xl bg-slate-800/60 backdrop-blur border border-slate-700 p-2 touch-none">
            <div ref={canvasRef} className="relative mx-auto origin-top" style={{ width: PAGE_IMAGE_SIZE.width * scale, height: PAGE_IMAGE_SIZE.height * scale }}>
              <img src={pageSrc} alt="صفحة المصحف" className="absolute inset-0 h-full w-full select-none object-fill" draggable={false} />
              {boxes.map((box, index) => {
                const isSelected = index === selectedIndex;
                const bound = box.audioStart !== undefined && box.audioEnd !== undefined;
                const boxSpeaker = box.speaker ?? "teacher";
                const boxColors = speakerColors[boxSpeaker];
                return (
                  <button
                    key={`${box.surah}-${box.ayah}-${index}`}
                    onPointerDown={(e) => dragStart(index, e)}
                    className="absolute rounded-md border-2 transition-all touch-none"
                    style={{
                      left: box.x * scale, top: box.y * scale,
                      width: box.width * scale, height: box.height * scale,
                      mixBlendMode: "multiply",
                      background: isSelected ? speakerColors[speaker].fill : (bound ? boxColors.fill : "rgba(156,163,175,0.15)"),
                      borderColor: isSelected ? speakerColors[speaker].stroke : (bound ? boxColors.stroke : "rgba(107,114,128,0.4)"),
                      borderStyle: bound ? "solid" : "dashed",
                    }}
                  >
                    <span className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white">
                      {box.surah}:{box.ayah}{bound ? " 🔗" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-3 max-h-[80vh] overflow-y-auto">
            {/* Page selector */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-3">
              <label className="block text-xs font-bold text-slate-400 mb-1">الصفحة</label>
              <select value={pageSrc} onChange={(e) => loadPage(e.target.value)} className="w-full rounded-lg bg-slate-700 border-slate-600 p-2 text-sm text-white">
                {pageSources.map(src => <option key={src} value={src}>{src.replace("/pages/", "")}</option>)}
              </select>
            </div>

            {/* Ayah selector + editing */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">الآية ({selectedIndex + 1}/{boxes.length})</label>
              <select
                value={selectedIndex}
                onChange={(e) => { setSelectedIndex(Number(e.target.value)); stopAudio(); }}
                className="w-full rounded-lg bg-slate-700 border-slate-600 p-2 text-sm text-white"
              >
                {boxes.map((box, i) => {
                  const bound = box.audioStart !== undefined && box.audioEnd !== undefined;
                  const sp = box.speaker === "kids" ? "👦" : "👨‍🏫";
                  return <option key={i} value={i}>{box.surah}:{box.ayah} {bound ? `🔗${sp}` : "○"} (سورة {box.surah})</option>;
                })}
              </select>

              {/* Edit surah and ayah numbers */}
              {selected && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] text-slate-500">رقم السورة</span>
                    <input
                      type="number" min={1} max={114}
                      value={selected.surah}
                      onChange={(e) => updateSelected({ surah: parseInt(e.target.value) || 1 })}
                      className="w-full rounded-lg bg-slate-700 border-slate-600 p-1.5 text-sm text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-slate-500">رقم الآية</span>
                    <input
                      type="number" min={1}
                      value={selected.ayah}
                      onChange={(e) => updateSelected({ ayah: parseInt(e.target.value) || 1 })}
                      className="w-full rounded-lg bg-slate-700 border-slate-600 p-1.5 text-sm text-white"
                    />
                  </label>
                </div>
              )}

              <div className="flex gap-1">
                <button
                  disabled={selectedIndex <= 0}
                  onClick={() => { setSelectedIndex(i => i - 1); stopAudio(); }}
                  className="flex-1 p-2 rounded-lg bg-slate-700 text-sm font-bold disabled:opacity-30"
                >← السابقة</button>
                <button
                  disabled={selectedIndex >= boxes.length - 1}
                  onClick={() => { setSelectedIndex(i => i + 1); stopAudio(); }}
                  className="flex-1 p-2 rounded-lg bg-slate-700 text-sm font-bold disabled:opacity-30"
                >التالية →</button>
              </div>

              {/* Add new box */}
              <button
                onClick={addNewBox}
                className="w-full p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <Plus className="h-3.5 w-3.5" /> إضافة تظليل جديد
              </button>
              
              <div className="flex gap-1">
                <button
                  onClick={applyHeightToAll}
                  className="w-full p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-bold active:scale-95 text-slate-300 transition-colors"
                >↕️ توحيد الارتفاع</button>
                <button
                  onClick={applyWidthAndXToAll}
                  className="w-full p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-bold active:scale-95 text-slate-300 transition-colors"
                >↔️ توحيد السطر</button>
              </div>
            </div>

            {/* Audio player */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="text-emerald-400">{fmtTime(currentTime)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
              <input type="range" min={0} max={duration || 0} step={0.01} value={currentTime}
                onChange={(e) => { const a = audioRef.current; if (a) { a.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); stopAtRef.current = null; } }}
                className="w-full accent-emerald-500" />
              <button
                onClick={isPlaying ? stopAudio : playSelected}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 p-2 text-sm font-bold shadow-lg active:scale-95 transition-transform"
              >
                {isPlaying ? <><Pause className="h-4 w-4" /> إيقاف</> : <><Play className="h-4 w-4" /> تشغيل</>}
              </button>
            </div>

            {/* Binding controls */}
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3 space-y-2">
              <div className="text-xs font-bold text-emerald-400">
                🎯 ربط الصوت بالآية {selected?.surah}:{selected?.ayah}
                <span className="block text-[10px] text-slate-400 mt-0.5 font-bold">
                  الوضع النشط: <b className={speaker === "teacher" ? "text-amber-400" : "text-sky-400"}>{speaker === "teacher" ? "👨‍🏫 ربط المعلم" : "👦 ربط الطفل"}</b>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={setStartFromCurrent} className="rounded-lg bg-emerald-600 p-2 text-white text-xs font-bold active:scale-95 flex items-center justify-center gap-1" title="تحديد بداية المقطع المختار للربط">⏺ بداية</button>
                <button onClick={setEndFromCurrent} className="rounded-lg bg-rose-600 p-2 text-white text-xs font-bold active:scale-95 flex items-center justify-center gap-1" title="تحديد نهاية المقطع المختار للربط">⏹ نهاية</button>
              </div>
              
              <div className="space-y-1 bg-slate-800 rounded-lg p-2 font-mono text-[10px] text-slate-300">
                <div className="flex justify-between items-center border-b border-slate-700/50 pb-1">
                  <span className="text-amber-400 font-bold">👨‍🏫 المعلم:</span>
                  <span>
                    {selected?.audioStart !== undefined ? fmtTime(selected.audioStart) : "—"}
                    {" → "}
                    {selected?.audioEnd !== undefined ? fmtTime(selected.audioEnd) : "—"}
                    {selected?.audioStart !== undefined && selected?.audioEnd !== undefined && (
                      <span className="text-slate-500"> ({(selected.audioEnd - selected.audioStart).toFixed(1)}ث)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sky-400 font-bold">👦 الطفل:</span>
                  <span>
                    {selected?.kidsStart !== undefined ? fmtTime(selected.kidsStart) : "—"}
                    {" → "}
                    {selected?.kidsEnd !== undefined ? fmtTime(selected.kidsEnd) : "—"}
                    {selected?.kidsStart !== undefined && selected?.kidsEnd !== undefined && (
                      <span className="text-slate-500"> ({(selected.kidsEnd - selected.kidsStart).toFixed(1)}ث)</span>
                    )}
                  </span>
                </div>
              </div>

              {hasBinding && (
                <button onClick={clearBinding} className="w-full text-xs rounded-lg bg-slate-700 p-1.5 flex items-center justify-center gap-1 text-slate-300">
                  <Link2 className="h-3 w-3" /> إلغاء الربط بالكامل
                </button>
              )}

              <button
                onClick={autoLinkFromTimings}
                className="w-full p-2 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
              >
                🪄 ربط تلقائي من /timings
              </button>

              <Link
                to="/timings"
                className="w-full p-2 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1 hover:text-white hover:border-amber-400 transition-all"
              >
                🎙️ الانتقال لصفحة التقسيم
              </Link>
            </div>

            {/* Segments List for Manual Binding */}
            {segmentsList.length > 0 && (
              <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2 max-h-56 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-400">مقاطع مسجلة (سورة {selected?.surah})</div>
                {segmentsList.map((seg, i) => (
                  <div key={seg.id} className="flex items-center gap-2 bg-slate-700/50 p-2 rounded-lg border border-slate-600/50">
                    <button
                      onClick={() => {
                        ensureAudioLoaded(selected!.surah, () => {
                          const a = audioRef.current; if (!a) return;
                          a.currentTime = seg.start;
                          stopAtRef.current = seg.end;
                          a.play().catch(() => {});
                        });
                      }}
                      className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white active:scale-95 shrink-0"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white font-bold truncate" title={seg.label}>
                        {seg.speaker === "teacher" ? "👨‍🏫" : "👦"} {seg.label || `مقطع ${i + 1}`}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {fmtTime(seg.start)} → {fmtTime(seg.end)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (seg.speaker === "teacher") {
                          updateSelected({ audioStart: seg.start, audioEnd: seg.end });
                          toast({ title: "✅ تم ربط المعلم", description: `تم ربط مقطع المعلم: ${seg.label || i + 1}` });
                        } else {
                          updateSelected({ kidsStart: seg.start, kidsEnd: seg.end });
                          toast({ title: "✅ تم ربط الطفل", description: `تم ربط مقطع الطفل: ${seg.label || i + 1}` });
                        }
                      }}
                      className="px-2 h-8 rounded bg-violet-600 text-white text-[10px] font-bold active:scale-95 shrink-0"
                    >
                      ربط 🔗
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Speaker */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSpeaker("teacher")} className={`p-2 rounded-lg font-bold text-sm transition-all ${speaker === "teacher" ? "bg-amber-500 text-black" : "bg-slate-700 text-slate-300"}`}>👨‍🏫 معلم</button>
              <button onClick={() => setSpeaker("kids")} className={`p-2 rounded-lg font-bold text-sm transition-all ${speaker === "kids" ? "bg-sky-500 text-black" : "bg-slate-700 text-slate-300"}`}>👦 طفل</button>
            </div>

            {/* Move/Resize */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
              <div className="text-xs font-bold text-slate-400">تحريك وتغيير الحجم</div>
              <div className="grid grid-cols-3 gap-1 text-sm font-bold">
                <span />
                <button onClick={() => move(0, -step)} className="rounded-lg bg-slate-700 p-2 active:bg-slate-600">↑</button>
                <span />
                <button onClick={() => move(step, 0)} className="rounded-lg bg-slate-700 p-2 active:bg-slate-600">→</button>
                <button onClick={() => move(0, step)} className="rounded-lg bg-slate-700 p-2 active:bg-slate-600">↓</button>
                <button onClick={() => move(-step, 0)} className="rounded-lg bg-slate-700 p-2 active:bg-slate-600">←</button>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <button onClick={() => resize(step, 0)} className="rounded-lg bg-slate-700 p-1.5">عرض +</button>
                <button onClick={() => resize(-step, 0)} className="rounded-lg bg-slate-700 p-1.5">عرض -</button>
                <button onClick={() => resize(0, step)} className="rounded-lg bg-slate-700 p-1.5">ارتفاع +</button>
                <button onClick={() => resize(0, -step)} className="rounded-lg bg-slate-700 p-1.5">ارتفاع -</button>
              </div>
              <button onClick={applyHeightToAll} className="w-full rounded-lg bg-emerald-600/20 border border-emerald-500/40 p-2 text-emerald-300 font-bold text-xs active:scale-95 transition-transform mt-1">
                توحيد الارتفاع لجميع الآيات
              </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={duplicateSelected} className="flex items-center justify-center gap-1 rounded-lg bg-slate-700 p-2 text-xs font-bold active:scale-95">
                <Copy className="h-3 w-3" /> نسخ المربع
              </button>
              <button onClick={deleteSelected} className="flex items-center justify-center gap-1 rounded-lg bg-red-950/50 border border-red-500/30 text-red-400 p-2 text-xs font-bold active:scale-95">
                <Trash2 className="h-3 w-3" /> حذف
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setScale(s => clamp(s + 0.1, 0.25, 1.4))} className="flex-1 rounded-lg bg-slate-700 p-2 active:bg-slate-600"><ZoomIn className="mx-auto h-4 w-4" /></button>
              <button onClick={() => setScale(s => clamp(s - 0.1, 0.25, 1.4))} className="flex-1 rounded-lg bg-slate-700 p-2 active:bg-slate-600"><ZoomOut className="mx-auto h-4 w-4" /></button>
            </div>

            <button
              onClick={() => { resetPageAyahBoxes(pageSrc); setBoxes(AYAH_COORDINATES[pageSrc].map(b => ({ ...b }))); }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-950/50 border border-red-500/30 p-2 text-red-400 text-xs font-bold active:scale-95"
            >
              <RotateCcw className="h-3 w-3" /> إعادة ضبط المربعات
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default AyahCalibration;
