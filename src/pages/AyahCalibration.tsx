import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Pause, Play, Plus, RotateCcw, Save, Trash2, ZoomIn, ZoomOut, Link2, Copy, Keyboard, Download, Upload } from "lucide-react";
import { AyahBox, AYAH_COORDINATES, getAllPageSources, getPageAyahBoxes, PAGE_IMAGE_SIZE, resetPageAyahBoxes, savePageAyahBoxes, getSavedAyahCoordinates } from "@/data/ayahCoordinates";
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef<number | null>(null);
  const selected = boxes[selectedIndex];

  useEffect(() => {
    if (selected) {
      const all = getSavedTimings();
      setSegmentsList(all[selected.surah]?.segments || []);
    }
  }, [selected?.surah]);

  const loadPage = (src: string) => {
    // Save current page boxes before switching to avoid losing edits
    savePageAyahBoxes(pageSrc, boxes);
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
    setBoxes(current => current.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(i => Math.max(0, i - 1));
  };

  const applyHeightToAll = () => {
    if (!selected) return;
    setBoxes(current => current.map(box => ({
      ...box,
      height: selected.height
    })));
    toast({ title: "✅ تم توحيد الارتفاع", description: "تم تطبيق الارتفاع المحدد على جميع المربعات" });
  };

  const addNewBox = () => {
    const lastBox = boxes[boxes.length - 1];
    const newBox: AyahBox = {
      surah: lastBox?.surah ?? 1,
      ayah: (lastBox?.ayah ?? 0) + 1,
      x: lastBox?.x ?? 140,
      y: lastBox ? clamp(lastBox.y + lastBox.height + 10, 0, PAGE_IMAGE_SIZE.height - 100) : 300,
      width: lastBox?.width ?? 980,
      height: lastBox?.height ?? 100,
    };
    setBoxes(current => [...current, newBox]);
    setSelectedIndex(boxes.length);
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
    updateSelected({ audioStart: t, speaker });
    toast({ title: "✅ بداية", description: `${fmtTime(t)}` });
  };

  const setEndFromCurrent = () => {
    if (!selected || !audioRef.current) return;
    const t = Number(audioRef.current.currentTime.toFixed(3));
    // Set end for current ayah
    setBoxes(current => current.map((box, i) => {
      if (i === selectedIndex) return { ...box, audioEnd: t, speaker };
      // Auto-chain: set start for next ayah of same surah
      if (i === selectedIndex + 1 && box.surah === selected.surah) {
        return { ...box, audioStart: t, speaker };
      }
      return box;
    }));
    // Auto-advance to next ayah
    if (selectedIndex < boxes.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      toast({ title: "🔗 نهاية + ربط", description: `${fmtTime(t)} → الآية التالية` });
    } else {
      toast({ title: "✅ نهاية", description: `${fmtTime(t)}` });
    }
  };

  const clearBinding = () => {
    if (!selected) return;
    updateSelected({ audioStart: undefined, audioEnd: undefined });
  };

  // محاذاة جميع المربعات في نفس السطر (نفس Y ونفس الارتفاع)
  const snapToRows = () => {
    if (boxes.length <= 1) return;
    const rowThreshold = 30; // إذا الفرق أقل من 30px يُعتبر نفس السطر
    setBoxes(current => {
      const result = [...current];
      const assigned = new Set<number>();
      for (let i = 0; i < result.length; i++) {
        if (assigned.has(i)) continue;
        // اجمع كل المربعات على نفس السطر تقريباً
        const rowBoxes = [i];
        for (let j = i + 1; j < result.length; j++) {
          if (!assigned.has(j) && Math.abs(result[j].y - result[i].y) < rowThreshold) {
            rowBoxes.push(j);
          }
        }
        if (rowBoxes.length > 1) {
          // وحّد Y والارتفاع للمجموعة
          const avgY = Math.round(rowBoxes.reduce((s, idx) => s + result[idx].y, 0) / rowBoxes.length);
          const maxH = Math.max(...rowBoxes.map(idx => result[idx].height));
          rowBoxes.forEach(idx => {
            result[idx] = { ...result[idx], y: avgY, height: maxH };
            assigned.add(idx);
          });
        }
      }
      return result;
    });
    toast({ title: "✅ تم المحاذاة", description: "تم توحيد سطور المربعات" });
  };

  // ── تصدير كل العمل كملف JSON ──
  const exportAll = () => {
    const data = {
      version: 1,
      timestamp: new Date().toISOString(),
      coordinates: getSavedAyahCoordinates(),
      timings: getSavedTimings(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mushaf-calibration-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📥 تم التصدير", description: "تم حفظ الملف" });
  };

  // ── استيراد من ملف JSON ──
  const importAll = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.coordinates) {
            localStorage.setItem("mushaf:ayahCoordinates:v1", JSON.stringify(data.coordinates));
          }
          if (data.timings) {
            localStorage.setItem("mushaf:ayahTimings:v1", JSON.stringify(data.timings));
          }
          // إعادة تحميل الصفحة الحالية
          setBoxes(getPageAyahBoxes(pageSrc));
          toast({ title: "✅ تم الاستيراد", description: "تم تحميل البيانات بنجاح" });
        } catch {
          toast({ title: "❌ خطأ", description: "الملف غير صالح" });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── ربط ذكي: آية N = معلم + آية N+1 = طفل (تلقائياً) ──
  const smartAutoLink = () => {
    const savedAll = getSavedTimings();
    const surahs = Array.from(new Set(boxes.map(b => b.surah)));

    let linked = 0;
    setBoxes(current => {
      const result = [...current];
      const newBoxes: AyahBox[] = [];

      surahs.forEach(surahNum => {
        const saved = savedAll[surahNum];
        if (!saved?.segments || saved.segments.length === 0) return;

        const teacherSegs = saved.segments.filter(s => s.speaker === "teacher").sort((a, b) => a.start - b.start);
        const kidsSegs = saved.segments.filter(s => s.speaker === "kids").sort((a, b) => a.start - b.start);

        // ربط كل آية بالترتيب
        const surahBoxes = result.filter(b => b.surah === surahNum);
        surahBoxes.forEach((box, idx) => {
          const boxIdx = result.indexOf(box);
          // ربط بمقطع المعلم
          if (teacherSegs[idx]) {
            result[boxIdx] = {
              ...result[boxIdx],
              audioStart: teacherSegs[idx].start,
              audioEnd: teacherSegs[idx].end,
              speaker: "teacher",
            };
            linked++;
          }

          // إنشاء مربع طفل تلقائي إذا يوجد مقطع طفل
          if (kidsSegs[idx]) {
            // تحقق إذا لا يوجد بالفعل مربع طفل لهذه الآية
            const hasKidsBox = result.some(b => b.surah === surahNum && b.ayah === box.ayah && b.speaker === "kids");
            if (!hasKidsBox) {
              newBoxes.push({
                surah: surahNum,
                ayah: box.ayah,
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                audioStart: kidsSegs[idx].start,
                audioEnd: kidsSegs[idx].end,
                speaker: "kids",
              });
              linked++;
            }
          }
        });
      });

      return [...result, ...newBoxes];
    });

    toast({ title: "🧠 ربط ذكي", description: `تم ربط ${linked} مقطع (معلم + طفل)` });
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
        // Prefer segments from /recitation-methods (they have speaker info)
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
          // Find segments matching this ayah index for teacher
          const teacherSegs = segs.filter(s => s.speaker === "teacher");
          const kidsSegs = segs.filter(s => s.speaker === "kids");
          const seg = teacherSegs[count] || segs[count];
          if (seg) {
            return {
              ...box,
              audioStart: seg.start,
              audioEnd: seg.end,
              speaker: seg.speaker,
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
    toast({ title: "✅ تم الربط التلقائي", description: "تم ربط المقاطع المحفوظة من صفحة التقسيم الذكي" });
  };

  useEffect(() => {
    if (selected) ensureAudioLoaded(selected.surah);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.surah]);

  useEffect(() => { stopAudio(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageSrc]);

  const onTimeUpdate = () => {
    const a = audioRef.current; if (!a) return;
    setCurrentTime(a.currentTime);
    if (stopAtRef.current !== null && a.currentTime >= stopAtRef.current - 0.02) {
      a.pause(); stopAtRef.current = null;
    }
  };

  const saveAll = useCallback((silent = false) => {
    // Save only calibration box data — never touch split data
    savePageAyahBoxes(pageSrc, boxes);

    if (!silent) {
      setIsSaving(true);
      const bound = boxes.filter(b => b.audioStart !== undefined && b.audioEnd !== undefined).length;
      toast({ title: "✅ تم الحفظ", description: `${boxes.length} مربع، ${bound} مربوط` });
      setTimeout(() => setIsSaving(false), 1200);
    }
  }, [boxes, pageSrc]);

  // Track latest state for synchronous save on unmount (HMR)
  const stateRef = useRef({ pageSrc, boxes });
  useEffect(() => {
    stateRef.current = { pageSrc, boxes };
  }, [pageSrc, boxes]);

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

  // ── Keyboard shortcuts for desktop ──
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      // Don't capture when typing in input/select
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      const s = step;

      switch (e.key) {
        // ── Move ──
        case "ArrowUp":
          e.preventDefault();
          if (e.shiftKey) resize(0, -s); else move(0, -s);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (e.shiftKey) resize(0, s); else move(0, s);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) resize(s, 0); else move(s, 0);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) resize(-s, 0); else move(-s, 0);
          break;

        // ── Navigate ayahs ──
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            setSelectedIndex(i => Math.max(0, i - 1));
          } else {
            setSelectedIndex(i => Math.min(boxes.length - 1, i + 1));
          }
          stopAudio();
          break;

        // ── Play/Pause ──
        case " ":
          e.preventDefault();
          if (isPlaying) stopAudio(); else playSelected();
          break;

        // ── Save ──
        case "s":
        case "S":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            saveAll(false);
          }
          break;

        // ── Set start/end ──
        case "[":
        case "{":
          e.preventDefault();
          setStartFromCurrent();
          break;
        case "]":
        case "}":
          e.preventDefault();
          setEndFromCurrent();
          break;

        // ── Delete ──
        case "Delete":
        case "Backspace":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            deleteSelected();
          }
          break;

        // ── Duplicate ──
        case "d":
        case "D":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            duplicateSelected();
          }
          break;

        // ── Zoom ──
        case "+":
        case "=":
          e.preventDefault();
          setScale(sc => clamp(sc + 0.1, 0.25, 1.4));
          break;
        case "-":
        case "_":
          e.preventDefault();
          setScale(sc => clamp(sc - 0.1, 0.25, 1.4));
          break;

        // ── Auto-link ──
        case "a":
        case "A":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            autoLinkFromTimings();
          }
          break;

        // ── Speaker toggle ──
        case "t":
        case "T":
          e.preventDefault();
          setSpeaker(sp => sp === "teacher" ? "kids" : "teacher");
          break;

        // ── Help ──
        case "?":
        case "h":
        case "H":
          e.preventDefault();
          setShowHelp(v => !v);
          break;

        // ── Escape ──
        case "Escape":
          if (showHelp) setShowHelp(false);
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes.length, isPlaying, showHelp, selectedIndex]);

  const hasBinding = selected?.audioStart !== undefined && selected?.audioEnd !== undefined;
  const boundCount = boxes.filter(b => b.audioStart !== undefined && b.audioEnd !== undefined).length;

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
          <Link
            to="/"
            onClick={() => savePageAyahBoxes(pageSrc, boxes)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="flex-1 text-center">
            <h1 className="font-amiri text-xl font-bold bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">
              ضبط تظليل الآيات
            </h1>
            <p className="text-xs text-slate-400">
              {boundCount}/{boxes.length} آية مربوطة · حفظ تلقائي
            </p>
          </div>
          <button
            onClick={() => saveAll(false)}
            className={`flex h-10 items-center gap-1 rounded-full px-4 font-bold text-sm shadow-lg active:scale-95 transition-all ${
              isSaving ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-amber-500 to-amber-600 text-black"
            }`}
          >
            <Save className="h-4 w-4" /> {isSaving ? "✅" : "حفظ"}
          </button>
          <button
            onClick={() => setShowHelp(v => !v)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              showHelp ? "bg-violet-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"
            }`}
            title="اختصارات لوحة المفاتيح (H)"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </header>

        {/* Keyboard shortcuts help */}
        {showHelp && (
          <div className="rounded-2xl bg-violet-950/80 backdrop-blur border border-violet-500/30 p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-violet-300 flex items-center gap-2">
                <Keyboard className="w-4 h-4" /> اختصارات لوحة المفاتيح
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-xs text-slate-400 hover:text-white">Esc للإغلاق</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {[
                ["←↑→↓", "تحريك المربع"],
                ["Shift+←↑→↓", "تغيير الحجم"],
                ["Tab / Shift+Tab", "الآية التالية/السابقة"],
                ["Space", "تشغيل/إيقاف"],
                ["[", "تحديد بداية الصوت"],
                ["]", "تحديد نهاية الصوت"],
                ["Ctrl+S", "حفظ"],
                ["D", "نسخ المربع"],
                ["Delete", "حذف المربع"],
                ["+/-", "تكبير/تصغير"],
                ["T", "تبديل معلم/طفل"],
                ["A", "ربط تلقائي"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-2 bg-slate-800/60 rounded-lg p-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-violet-300 font-mono text-[10px] font-bold shrink-0">{key}</kbd>
                  <span className="text-slate-300">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
          <aside className="space-y-2 max-h-[80vh] overflow-y-auto">
            {/* الصفحة + الآية */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
              <select value={pageSrc} onChange={(e) => loadPage(e.target.value)} className="w-full rounded-lg bg-slate-700 border-slate-600 p-2 text-sm text-white">
                {pageSources.map(src => <option key={src} value={src}>{src.replace("/pages/", "")}</option>)}
              </select>
              <select
                value={selectedIndex}
                onChange={(e) => { setSelectedIndex(Number(e.target.value)); stopAudio(); }}
                className="w-full rounded-lg bg-slate-700 border-slate-600 p-2 text-sm text-white"
              >
                {boxes.map((box, i) => {
                  const bound = box.audioStart !== undefined && box.audioEnd !== undefined;
                  return <option key={i} value={i}>{bound ? "🔗 " : "○ "}{box.surah}:{box.ayah}</option>;
                })}
              </select>
              {selected && (
                <div className="grid grid-cols-4 gap-1">
                  <input type="number" min={1} max={114} value={selected.surah}
                    onChange={(e) => updateSelected({ surah: parseInt(e.target.value) || 1 })}
                    className="rounded-lg bg-slate-700 p-1.5 text-xs text-white text-center" title="سورة" />
                  <input type="number" min={1} value={selected.ayah}
                    onChange={(e) => updateSelected({ ayah: parseInt(e.target.value) || 1 })}
                    className="rounded-lg bg-slate-700 p-1.5 text-xs text-white text-center" title="آية" />
                  <button disabled={selectedIndex <= 0}
                    onClick={() => { setSelectedIndex(i => i - 1); stopAudio(); }}
                    className="rounded-lg bg-slate-700 p-1.5 text-xs font-bold disabled:opacity-30">◀</button>
                  <button disabled={selectedIndex >= boxes.length - 1}
                    onClick={() => { setSelectedIndex(i => i + 1); stopAudio(); }}
                    className="rounded-lg bg-slate-700 p-1.5 text-xs font-bold disabled:opacity-30">▶</button>
                </div>
              )}
            </div>

            {/* مشغل الصوت */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={isPlaying ? stopAudio : playSelected}
                  className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white active:scale-95 shrink-0 shadow-lg">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <div className="flex-1">
                  <input type="range" min={0} max={duration || 0} step={0.01} value={currentTime}
                    onChange={(e) => { const a = audioRef.current; if (a) { a.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); stopAtRef.current = null; } }}
                    className="w-full accent-emerald-500" />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span className="text-emerald-400">{fmtTime(currentTime)}</span>
                    <span>{fmtTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ربط الصوت — مع ربط تسلسلي */}
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3 space-y-2">
              <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-between">
                <span>🎯 {selected?.surah}:{selected?.ayah}</span>
                <span className="text-slate-500 font-mono">[ بداية · ] نهاية+ربط</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={setStartFromCurrent} className="rounded-lg bg-emerald-600 p-2 text-white text-xs font-bold active:scale-95">⏺ بداية</button>
                <button onClick={setEndFromCurrent} className="rounded-lg bg-rose-600 p-2 text-white text-xs font-bold active:scale-95">⏹ نهاية 🔗</button>
              </div>
              <div className="text-xs text-center font-mono bg-slate-800 rounded-lg p-1.5 text-slate-300">
                {selected?.audioStart !== undefined ? fmtTime(selected.audioStart) : "—"}
                {" → "}
                {selected?.audioEnd !== undefined ? fmtTime(selected.audioEnd) : "—"}
                {hasBinding && selected?.audioEnd! > selected?.audioStart! && (
                  <span className="text-emerald-500 font-bold"> {(selected!.audioEnd! - selected!.audioStart!).toFixed(1)}s</span>
                )}
              </div>
              {hasBinding && (
                <button onClick={clearBinding} className="w-full text-[10px] rounded-lg bg-slate-700/60 p-1 text-slate-400">
                  ✕ إلغاء الربط
                </button>
              )}
            </div>

            {/* أدوات سريعة */}
            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={smartAutoLink}
                className="p-2 rounded-lg bg-gradient-to-r from-fuchsia-600/20 to-violet-600/20 border border-fuchsia-500/30 text-fuchsia-300 font-bold text-[10px] active:scale-95">
                🧠 ربط ذكي
              </button>
              <button onClick={autoLinkFromTimings}
                className="p-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 font-bold text-[10px] active:scale-95">
                🪄 ربط عادي
              </button>
              <Link to="/recitation-methods"
                className="p-2 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-300 font-bold text-[10px] text-center active:scale-95">
                ⚡ تقسيم
              </Link>
            </div>

            {/* المتحدث + أدوات المربع */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-2 space-y-1.5">
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => setSpeaker("teacher")} className={`p-1.5 rounded-lg font-bold text-xs ${speaker === "teacher" ? "bg-amber-500 text-black" : "bg-slate-700 text-slate-400"}`}>🎙️ معلم</button>
                <button onClick={() => setSpeaker("kids")} className={`p-1.5 rounded-lg font-bold text-xs ${speaker === "kids" ? "bg-sky-500 text-black" : "bg-slate-700 text-slate-400"}`}>👦 طفل</button>
              </div>
              <div className="grid grid-cols-4 gap-1 text-xs">
                <button onClick={addNewBox} className="col-span-2 p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 font-bold active:scale-95"><Plus className="inline h-3 w-3" /> إضافة</button>
                <button onClick={duplicateSelected} className="p-1.5 rounded-lg bg-slate-700 active:scale-95" title="نسخ (D)"><Copy className="mx-auto h-3 w-3" /></button>
                <button onClick={deleteSelected} className="p-1.5 rounded-lg bg-red-950/50 text-red-400 active:scale-95" title="حذف (Del)"><Trash2 className="mx-auto h-3 w-3" /></button>
              </div>
            </div>

            {/* تحريك وتغيير الحجم */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-2 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400">تحريك وحجم</div>
              <div className="grid grid-cols-3 gap-1 text-sm font-bold">
                <span />
                <button onClick={() => move(0, -step)} className="rounded-lg bg-slate-700 p-1.5 active:bg-slate-600">↑</button>
                <span />
                <button onClick={() => move(step, 0)} className="rounded-lg bg-slate-700 p-1.5 active:bg-slate-600">→</button>
                <button onClick={() => move(0, step)} className="rounded-lg bg-slate-700 p-1.5 active:bg-slate-600">↓</button>
                <button onClick={() => move(-step, 0)} className="rounded-lg bg-slate-700 p-1.5 active:bg-slate-600">←</button>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button onClick={() => resize(step, 0)} className="rounded-lg bg-slate-700 p-1.5 active:bg-slate-600">عرض +</button>
                <button onClick={() => resize(-step, 0)} className="rounded-lg bg-slate-700 p-1.5 active:bg-slate-600">عرض -</button>
                <button onClick={() => resize(0, step)} className="rounded-lg bg-slate-700 p-1.5 active:bg-slate-600">ارتفاع +</button>
                <button onClick={() => resize(0, -step)} className="rounded-lg bg-slate-700 p-1.5 active:bg-slate-600">ارتفاع -</button>
              </div>
            </div>

            {/* محاذاة وتوحيد */}
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={snapToRows} className="p-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 font-bold text-[10px] active:scale-95">
                📐 محاذاة السطور
              </button>
              <button onClick={applyHeightToAll} className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] active:scale-95">
                📏 توحيد الارتفاع
              </button>
            </div>

            {/* تكبير + إعادة ضبط */}
            <div className="flex gap-1.5">
              <button onClick={() => setScale(s => clamp(s + 0.1, 0.25, 1.4))} className="flex-1 rounded-lg bg-slate-700 p-1.5 active:bg-slate-600"><ZoomIn className="mx-auto h-3.5 w-3.5" /></button>
              <button onClick={() => setScale(s => clamp(s - 0.1, 0.25, 1.4))} className="flex-1 rounded-lg bg-slate-700 p-1.5 active:bg-slate-600"><ZoomOut className="mx-auto h-3.5 w-3.5" /></button>
              <button onClick={() => { resetPageAyahBoxes(pageSrc); setBoxes(AYAH_COORDINATES[pageSrc].map(b => ({ ...b }))); }}
                className="flex-1 rounded-lg bg-red-950/50 border border-red-500/30 text-red-400 p-1.5 active:scale-95" title="إعادة ضبط">
                <RotateCcw className="mx-auto h-3.5 w-3.5" />
              </button>
            </div>

            {/* تصدير / استيراد */}
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={exportAll}
                className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95">
                <Download className="h-3 w-3" /> تصدير (حفظ)
              </button>
              <button onClick={importAll}
                className="p-2 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95">
                <Upload className="h-3 w-3" /> استيراد
              </button>
            </div>

            {/* المقاطع المحفوظة — مطوي */}
            {segmentsList.length > 0 && (
              <details className="rounded-xl bg-slate-800/60 border border-slate-700 p-2">
                <summary className="text-[10px] font-bold text-slate-400 cursor-pointer">📎 مقاطع ({segmentsList.length})</summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {segmentsList.map((seg, i) => (
                    <button
                      key={seg.id}
                      onClick={() => {
                        updateSelected({ audioStart: seg.start, audioEnd: seg.end, speaker: seg.speaker });
                        toast({ title: "✅", description: seg.label || `مقطع ${i + 1}` });
                      }}
                      className="w-full flex items-center gap-2 bg-slate-700/40 p-1.5 rounded-lg text-[10px] hover:bg-slate-600/40"
                    >
                      <span>{seg.speaker === "teacher" ? "🎙️" : "👦"}</span>
                      <span className="flex-1 text-right truncate text-white">{seg.label || `مقطع ${i + 1}`}</span>
                      <span className="text-slate-500 font-mono shrink-0">{fmtTime(seg.start)}</span>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </aside>


        </section>
      </div>
    </main>
  );
};


export default AyahCalibration;

