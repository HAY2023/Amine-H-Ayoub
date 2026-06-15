import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Pause, Play, Plus, RotateCcw, Save, Trash2, ZoomIn, ZoomOut, Link2, Copy, ListOrdered, ChevronUp, ChevronDown, X, Check, Square } from "lucide-react";
import { AyahBox, AYAH_COORDINATES, getAllPageSources, getPageAyahBoxes, PAGE_IMAGE_SIZE, resetPageAyahBoxes, savePageAyahBoxes } from "@/data/ayahCoordinates";
import { getSavedTimings, getSurahTimings, AudioSegment } from "@/data/ayahTimings";
import { getPageSurahRegions, savePageSurahRegions, SurahRegion } from "@/data/surahRegions";
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
  // مناطق السور (تعريف فقط، بلا نقر) لكل صفحة
  const [regions, setRegions] = useState<SurahRegion[]>(() => getPageSurahRegions(pageSources[0]));
  const [selectedRegion, setSelectedRegion] = useState(0);
  const [showRegions, setShowRegions] = useState(false);
  // ترتيب الصفحات (يُحفظ بمعرّف المسار src ويقرؤه القارئ)
  const PAGE_ORDER_KEY = "mushaf:pageOrder:v1";
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [draftSrcOrder, setDraftSrcOrder] = useState<string[]>([]);
  const openArrange = useCallback(() => {
    let saved: string[] = [];
    try { const raw = localStorage.getItem(PAGE_ORDER_KEY); saved = raw ? JSON.parse(raw) : []; } catch { saved = []; }
    const valid = (Array.isArray(saved) ? saved : []).filter(s => pageSources.includes(s));
    pageSources.forEach(s => { if (!valid.includes(s)) valid.push(s); });
    setDraftSrcOrder(valid);
    setArrangeOpen(true);
  }, [pageSources]);
  const [history, setHistory] = useState<AyahBox[][]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef<number | null>(null);
  const isSeekingRef = useRef(false);
  const expectedStartTimeRef = useRef(0);
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
    setRegions(getPageSurahRegions(src));
    setSelectedRegion(0);
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

  // جزء ثانٍ من نفس الآية مرتبط بنفس المقطع الصوتي (لآية تمتد على أكثر من سطر).
  // يحتفظ برقم الآية + توقيت المعلم + توقيت الطفل + الاسم — وعند التشغيل يُظلَّل الجزآن معاً.
  const addLinkedPart = () => {
    if (!selected) return;
    saveHistory(boxes);
    const part: AyahBox = {
      ...selected, // يحتفظ بـ surah/ayah/audioStart/audioEnd/kidsStart/kidsEnd/label
      y: clamp(selected.y + selected.height + 8, 0, PAGE_IMAGE_SIZE.height - selected.height),
    };
    setBoxes(current => {
      const next = [...current.slice(0, selectedIndex + 1), part, ...current.slice(selectedIndex + 1)];
      setSelectedIndex(selectedIndex + 1);
      return next;
    });
    toast({
      title: "✅ تمت إضافة جزء مرتبط",
      description: "نفس الآية ونفس المقطع — حرّكه إلى السطر الثاني. سيُظلَّل ويُشغَّل مع الجزء الأول.",
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

  // ─────────── مناطق السور (تعريف فقط) ───────────
  const updateRegion = (patch: Partial<SurahRegion>) =>
    setRegions(cur => cur.map((r, i) => i === selectedRegion ? { ...r, ...patch } : r));

  const addRegion = () => {
    const r: SurahRegion = { name: "", x: 180, y: 220, width: 900, height: 320 };
    setRegions(cur => { const next = [...cur, r]; setSelectedRegion(next.length - 1); return next; });
    setShowRegions(true);
  };

  const deleteRegion = (i: number) => {
    setRegions(cur => cur.filter((_, idx) => idx !== i));
    setSelectedRegion(s => Math.max(0, s - (i <= s ? 1 : 0)));
  };

  const regionMove = (dx: number, dy: number) => {
    const r = regions[selectedRegion]; if (!r) return;
    updateRegion({
      x: clamp(r.x + dx, 0, PAGE_IMAGE_SIZE.width - r.width),
      y: clamp(r.y + dy, 0, PAGE_IMAGE_SIZE.height - r.height),
    });
  };

  const regionResize = (dw: number, dh: number) => {
    const r = regions[selectedRegion]; if (!r) return;
    updateRegion({
      width: clamp(r.width + dw, 40, PAGE_IMAGE_SIZE.width - r.x),
      height: clamp(r.height + dh, 30, PAGE_IMAGE_SIZE.height - r.y),
    });
  };

  const saveRegions = async () => {
    await savePageSurahRegions(pageSrc, regions);
    toast({ title: "✅ حُفظت مناطق السور", description: `${regions.length} منطقة على ${pageSrc.replace("/pages/", "")}` });
  };

  const regionDragStart = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedRegion(index);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const startX = e.clientX, startY = e.clientY;
    const startR = regions[index];
    const onMove = (event: PointerEvent) => {
      const ratioX = PAGE_IMAGE_SIZE.width / canvasRect.width;
      const ratioY = PAGE_IMAGE_SIZE.height / canvasRect.height;
      setRegions(cur => cur.map((r, i) => i === index ? {
        ...r,
        x: clamp(startR.x + (event.clientX - startX) * ratioX, 0, PAGE_IMAGE_SIZE.width - startR.width),
        y: clamp(startR.y + (event.clientY - startY) * ratioY, 0, PAGE_IMAGE_SIZE.height - startR.height),
      } : r));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
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
      isSeekingRef.current = true;
      expectedStartTimeRef.current = start;
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
      return current.map(box => {
        // Try segments first (most accurate, has speaker info)
        const segs = surahSegments[box.surah];
        if (segs) {
          const teacherSegs = segs.filter(s => s.speaker === "teacher");
          const kidsSegs = segs.filter(s => s.speaker === "kids");
          
          // Use the actual Ayah number (1-indexed) to find the correct segment
          const ayahIndex = box.ayah - 1;
          const tSeg = teacherSegs[ayahIndex];
          const kSeg = kidsSegs[ayahIndex];
          
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
        const teacherTimes = surahTeacherTimes[box.surah];
        if (teacherTimes && teacherTimes.length > box.ayah - 1) {
          return {
            ...box,
            audioStart: teacherTimes[box.ayah - 1],
            audioEnd: teacherTimes[box.ayah], // might be undefined for last ayah, which is fine
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
    if (a.seeking) return;
    if (isSeekingRef.current) {
      if (Math.abs(a.currentTime - expectedStartTimeRef.current) < 0.15) {
        isSeekingRef.current = false;
      } else {
        return;
      }
    }
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
        onSeeked={() => { isSeekingRef.current = false; }}
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
                      {box.surah}:{box.label || box.ayah}{bound ? " 🔗" : ""}
                    </span>
                  </button>
                );
              })}
              {/* طبقة مناطق السور (تعريف فقط) */}
              {showRegions && regions.map((r, index) => {
                const isSel = index === selectedRegion;
                return (
                  <div
                    key={`region-${index}`}
                    onPointerDown={(e) => regionDragStart(index, e)}
                    className="absolute rounded-lg border-2 touch-none cursor-move"
                    style={{
                      left: r.x * scale, top: r.y * scale,
                      width: r.width * scale, height: r.height * scale,
                      background: isSel ? "rgba(34,197,94,0.28)" : "rgba(34,197,94,0.12)",
                      borderColor: isSel ? "rgba(34,197,94,0.95)" : "rgba(34,197,94,0.6)",
                      borderStyle: "dashed",
                    }}
                  >
                    <span className="absolute right-1 top-1 rounded-full bg-emerald-900/85 px-2 py-0.5 text-[11px] font-bold text-emerald-100">
                      🟩 {r.name || "سورة بلا اسم"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-3 max-h-[80vh] overflow-y-auto">
            {/* Page selector */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">الصفحة</label>
              <select value={pageSrc} onChange={(e) => loadPage(e.target.value)} className="w-full rounded-lg bg-slate-700 border-slate-600 p-2 text-sm text-white">
                {pageSources.map(src => <option key={src} value={src}>{src.replace("/pages/", "")}</option>)}
              </select>
              <button
                onClick={openArrange}
                className="w-full p-2 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
                title="ترتيب صفحات المصحف كما تظهر في القارئ"
              >
                <ListOrdered className="h-3.5 w-3.5" /> ترتيب الصفحات في القارئ
              </button>
            </div>

            {/* مناطق السور (تعريف فقط، بلا نقر) */}
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3 space-y-2">
              <button onClick={() => setShowRegions(v => !v)} className="w-full flex items-center justify-between text-emerald-300 font-bold text-sm">
                <span className="flex items-center gap-1.5"><Square className="h-4 w-4" /> مناطق السور ({regions.length})</span>
                <span className="text-xs">{showRegions ? "▲ إخفاء" : "▼ عرض"}</span>
              </button>
              {showRegions && (
                <div className="space-y-2">
                  <button onClick={addRegion} className="w-full p-2 rounded-lg bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform">
                    <Plus className="h-3.5 w-3.5" /> أضف منطقة سورة
                  </button>
                  {regions.length === 0 && (
                    <p className="text-[11px] text-slate-500 text-center leading-relaxed">لا مناطق بعد. اضغط «أضف منطقة»، اكتب اسم السورة، وحرّك المستطيل الأخضر فوق السورة على الصفحة.</p>
                  )}
                  {regions.map((r, i) => (
                    <div key={i} className={`rounded-lg p-2 border ${i === selectedRegion ? "border-emerald-400 bg-emerald-900/30" : "border-slate-700 bg-slate-800/60"}`}>
                      <div className="flex items-center gap-1">
                        <input
                          value={r.name}
                          onChange={(e) => { setSelectedRegion(i); updateRegion({ name: e.target.value }); }}
                          onFocus={() => setSelectedRegion(i)}
                          placeholder="اسم السورة (مثل: النبأ)"
                          className="flex-1 rounded-md bg-slate-700 border-slate-600 p-1.5 text-sm text-white outline-none focus:border-emerald-500"
                        />
                        <button onClick={() => deleteRegion(i)} className="p-1.5 rounded-md bg-red-600/30 text-red-300 active:scale-95" title="حذف المنطقة"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      {i === selectedRegion && (
                        <div className="mt-2 space-y-1">
                          <div className="grid grid-cols-4 gap-1 text-sm">
                            <button onClick={() => regionMove(-step, 0)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95" title="يسار">←</button>
                            <button onClick={() => regionMove(step, 0)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95" title="يمين">→</button>
                            <button onClick={() => regionMove(0, -step)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95" title="أعلى">↑</button>
                            <button onClick={() => regionMove(0, step)} className="p-1.5 rounded bg-slate-700 text-white active:scale-95" title="أسفل">↓</button>
                            <button onClick={() => regionResize(-step, 0)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95" title="أضيق">◀▶−</button>
                            <button onClick={() => regionResize(step, 0)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95" title="أعرض">◀▶+</button>
                            <button onClick={() => regionResize(0, -step)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95" title="أقصر">▲▼−</button>
                            <button onClick={() => regionResize(0, step)} className="p-1.5 rounded bg-slate-600 text-white active:scale-95" title="أطول">▲▼+</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {regions.length > 0 && (
                    <button onClick={saveRegions} className="w-full p-2 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform">
                      <Save className="h-3.5 w-3.5" /> حفظ مناطق السور
                    </button>
                  )}
                </div>
              )}
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
                  return <option key={i} value={i}>{box.label || `${box.surah}:${box.ayah}`} {bound ? `🔗${sp}` : "○"}</option>;
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
                      type="number" min={0}
                      value={selected.ayah}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateSelected({ ayah: isNaN(val) ? 0 : val });
                      }}
                      className="w-full rounded-lg bg-slate-700 border-slate-600 p-1.5 text-sm text-white"
                    />
                  </label>
                  <label className="block col-span-2">
                    <span className="text-[10px] text-slate-500">اسم مخصص للمربع (اختياري)</span>
                    <input
                      type="text"
                      placeholder="مثال: البسملة"
                      value={selected.label || ""}
                      onChange={(e) => updateSelected({ label: e.target.value })}
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
                <Plus className="h-3.5 w-3.5" /> إضافة تظليل جديد (آية جديدة)
              </button>

              {/* Add linked part for a multi-line ayah */}
              {selected && (
                <button
                  onClick={addLinkedPart}
                  className="w-full p-2 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
                  title="آية تمتد على سطرين: ينشئ جزءاً ثانياً بنفس الآية ونفس المقطع الصوتي"
                >
                  <Plus className="h-3.5 w-3.5" /> ➕ جزء بنفس المقطع (آية على سطرين)
                </button>
              )}
              
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
                🎯 ربط الصوت بـ {selected?.label || `الآية ${selected?.surah}:${selected?.ayah}`}
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
                          isSeekingRef.current = true;
                          expectedStartTimeRef.current = seg.start;
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

      {/* ── نافذة ترتيب الصفحات (يحفظ بالمسار src ويقرؤه القارئ) ── */}
      {arrangeOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setArrangeOpen(false)}>
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-violet-400" />
                <div>
                  <h3 className="font-bold text-base text-white">ترتيب الصفحات</h3>
                  <p className="text-[11px] text-slate-400">رتّب الصفحات بالأسهم ثم احفظ — يظهر في القارئ</p>
                </div>
              </div>
              <button onClick={() => setArrangeOpen(false)} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300" aria-label="إغلاق"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {draftSrcOrder.map((src, pos) => (
                <div key={src} className="flex items-center gap-3 p-2 rounded-xl bg-slate-700/60 border border-slate-600/50">
                  <span className="w-7 h-7 rounded-full bg-violet-500/25 text-violet-300 text-xs font-bold flex items-center justify-center shrink-0">{pos + 1}</span>
                  <img src={src} alt={src} className="w-10 h-14 object-cover rounded-md border border-slate-600 shrink-0" loading="lazy" />
                  <span className="flex-1 min-w-0 font-bold text-sm text-slate-200 truncate">{src.replace("/pages/", "")}</span>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button disabled={pos === 0} onClick={() => setDraftSrcOrder(o => { const n = [...o]; [n[pos - 1], n[pos]] = [n[pos], n[pos - 1]]; return n; })} className="w-7 h-6 rounded bg-slate-600 text-slate-200 flex items-center justify-center disabled:opacity-30 active:scale-90" aria-label="أعلى"><ChevronUp className="w-4 h-4" /></button>
                    <button disabled={pos === draftSrcOrder.length - 1} onClick={() => setDraftSrcOrder(o => { const n = [...o]; [n[pos + 1], n[pos]] = [n[pos], n[pos + 1]]; return n; })} className="w-7 h-6 rounded bg-slate-600 text-slate-200 flex items-center justify-center disabled:opacity-30 active:scale-90" aria-label="أسفل"><ChevronDown className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-700 flex gap-2">
              <button
                onClick={() => { localStorage.removeItem(PAGE_ORDER_KEY); setArrangeOpen(false); toast({ title: "↩️ أُعيد الترتيب الأصلي" }); }}
                className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs flex items-center gap-1 active:scale-95"
              ><RotateCcw className="w-3.5 h-3.5" /> الأصلي</button>
              <button
                onClick={() => { localStorage.setItem(PAGE_ORDER_KEY, JSON.stringify(draftSrcOrder)); setArrangeOpen(false); toast({ title: "✅ تم حفظ الترتيب", description: "افتح القارئ لرؤية الترتيب الجديد" }); }}
                className="flex-1 px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-bold text-sm flex items-center justify-center gap-1 active:scale-95"
              ><Check className="w-4 h-4" /> حفظ الترتيب</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AyahCalibration;
