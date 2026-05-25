import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/AyahCalibration.tsx");import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

let prevRefreshReg;
let prevRefreshSig;

if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react-swc can't detect preamble. Something is wrong."
    );
  }

  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}

import __vite__cjsImport2_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=3d7c39b9"; const _jsxDEV = __vite__cjsImport2_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=3d7c39b9"; const useCallback = __vite__cjsImport3_react["useCallback"]; const useEffect = __vite__cjsImport3_react["useEffect"]; const useMemo = __vite__cjsImport3_react["useMemo"]; const useRef = __vite__cjsImport3_react["useRef"]; const useState = __vite__cjsImport3_react["useState"];
import { ArrowRight, Pause, Play, Plus, RotateCcw, Save, Trash2, ZoomIn, ZoomOut, Copy, Keyboard, Download, Upload } from "/node_modules/.vite/deps/lucide-react.js?v=3d7c39b9";
import { AYAH_COORDINATES, getAllPageSources, getPageAyahBoxes, PAGE_IMAGE_SIZE, resetPageAyahBoxes, savePageAyahBoxes, getSavedAyahCoordinates } from "/src/data/ayahCoordinates.ts";
import { getSavedTimings, getSurahTimings } from "/src/data/ayahTimings.ts";
import { getSurahAudioUrl, hasCloudAudio } from "/src/data/audioUrls.ts";
import { toast } from "/src/hooks/use-toast.ts";
import { Link } from "/node_modules/.vite/deps/react-router-dom.js?v=3d7c39b9";
const audioPath = (n)=>hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`;
const clamp = (value, min, max)=>Math.min(Math.max(value, min), max);
const step = 10;
const speakerColors = {
    teacher: {
        fill: "rgba(250,204,21,0.45)",
        stroke: "rgba(250,204,21,0.85)"
    },
    kids: {
        fill: "rgba(56,189,248,0.45)",
        stroke: "rgba(56,189,248,0.85)"
    }
};
const fmtTime = (s)=>{
    if (!isFinite(s) || s < 0) return "—";
    const m = Math.floor(s / 60);
    const sec = (s - m * 60).toFixed(2);
    return `${m}:${sec.padStart(5, "0")}`;
};
const AyahCalibration = ()=>{
    _s();
    const pageSources = useMemo(()=>getAllPageSources(), []);
    const [pageSrc, setPageSrc] = useState(pageSources[0]);
    const [boxes, setBoxes] = useState(()=>getPageAyahBoxes(pageSources[0]));
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scale, setScale] = useState(()=>typeof window === "undefined" ? 1 : clamp((window.innerWidth - 24) / PAGE_IMAGE_SIZE.width, 0.25, 1));
    const [speaker, setSpeaker] = useState("teacher");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [segmentsList, setSegmentsList] = useState([]);
    const canvasRef = useRef(null);
    const audioRef = useRef(null);
    const stopAtRef = useRef(null);
    const selected = boxes[selectedIndex];
    useEffect(()=>{
        if (selected) {
            const all = getSavedTimings();
            setSegmentsList(all[selected.surah]?.segments || []);
        }
    }, [
        selected?.surah
    ]);
    const loadPage = (src)=>{
        // Save current page boxes before switching to avoid losing edits
        savePageAyahBoxes(pageSrc, boxes);
        setPageSrc(src);
        setBoxes(getPageAyahBoxes(src));
        setSelectedIndex(0);
        stopAudio();
    };
    const stopAudio = ()=>{
        const a = audioRef.current;
        if (!a) return;
        a.pause();
        stopAtRef.current = null;
        setIsPlaying(false);
    };
    const updateSelected = (patch)=>{
        setBoxes((current)=>current.map((box, i)=>i === selectedIndex ? {
                    ...box,
                    ...patch
                } : box));
    };
    const move = (dx, dy)=>{
        if (!selected) return;
        updateSelected({
            x: clamp(selected.x + dx, 0, PAGE_IMAGE_SIZE.width - selected.width),
            y: clamp(selected.y + dy, 0, PAGE_IMAGE_SIZE.height - selected.height)
        });
    };
    const resize = (dw, dh)=>{
        if (!selected) return;
        updateSelected({
            width: clamp(selected.width + dw, 30, PAGE_IMAGE_SIZE.width - selected.x),
            height: clamp(selected.height + dh, 25, PAGE_IMAGE_SIZE.height - selected.y)
        });
    };
    const duplicateSelected = ()=>{
        if (!selected) return;
        const copy = {
            ...selected,
            y: clamp(selected.y + selected.height + 8, 0, PAGE_IMAGE_SIZE.height - selected.height),
            audioStart: undefined,
            audioEnd: undefined
        };
        setBoxes((current)=>{
            const next = [
                ...current.slice(0, selectedIndex + 1),
                copy,
                ...current.slice(selectedIndex + 1)
            ];
            setSelectedIndex(selectedIndex + 1);
            return next;
        });
    };
    const deleteSelected = ()=>{
        if (boxes.length <= 1) return;
        setBoxes((current)=>current.filter((_, i)=>i !== selectedIndex));
        setSelectedIndex((i)=>Math.max(0, i - 1));
    };
    const applyHeightToAll = ()=>{
        if (!selected) return;
        setBoxes((current)=>current.map((box)=>({
                    ...box,
                    height: selected.height
                })));
        toast({
            title: "✅ تم توحيد الارتفاع",
            description: "تم تطبيق الارتفاع المحدد على جميع المربعات"
        });
    };
    const addNewBox = ()=>{
        const lastBox = boxes[boxes.length - 1];
        const newBox = {
            surah: lastBox?.surah ?? 1,
            ayah: (lastBox?.ayah ?? 0) + 1,
            x: lastBox?.x ?? 140,
            y: lastBox ? clamp(lastBox.y + lastBox.height + 10, 0, PAGE_IMAGE_SIZE.height - 100) : 300,
            width: lastBox?.width ?? 980,
            height: lastBox?.height ?? 100
        };
        setBoxes((current)=>[
                ...current,
                newBox
            ]);
        setSelectedIndex(boxes.length);
    };
    const dragStart = (index, e)=>{
        e.currentTarget.setPointerCapture(e.pointerId);
        setSelectedIndex(index);
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        const startX = e.clientX;
        const startY = e.clientY;
        const startBox = boxes[index];
        const onMove = (event)=>{
            const ratioX = PAGE_IMAGE_SIZE.width / canvasRect.width;
            const ratioY = PAGE_IMAGE_SIZE.height / canvasRect.height;
            setBoxes((current)=>current.map((box, i)=>i === index ? {
                        ...box,
                        x: clamp(startBox.x + (event.clientX - startX) * ratioX, 0, PAGE_IMAGE_SIZE.width - startBox.width),
                        y: clamp(startBox.y + (event.clientY - startY) * ratioY, 0, PAGE_IMAGE_SIZE.height - startBox.height)
                    } : box));
        };
        const onUp = ()=>{
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp, {
            once: true
        });
    };
    const ensureAudioLoaded = (surah, then)=>{
        const a = audioRef.current;
        if (!a) return;
        const targetSrc = audioPath(surah);
        const expectedFile = targetSrc.split("/").pop() || targetSrc;
        if (!a.src || !a.src.endsWith(expectedFile)) {
            a.src = targetSrc;
            a.load();
            a.addEventListener("loadedmetadata", ()=>then?.(), {
                once: true
            });
        } else if (a.duration > 0) {
            then?.();
        } else {
            a.addEventListener("loadedmetadata", ()=>then?.(), {
                once: true
            });
        }
    };
    const playSelected = ()=>{
        if (!selected) return;
        const a = audioRef.current;
        if (!a) return;
        ensureAudioLoaded(selected.surah, ()=>{
            const start = selected.audioStart ?? 0;
            const end = selected.audioEnd;
            stopAtRef.current = end && end > start ? end : null;
            a.currentTime = start;
            a.play().catch(()=>{});
        });
    };
    const setStartFromCurrent = ()=>{
        if (!selected || !audioRef.current) return;
        const t = Number(audioRef.current.currentTime.toFixed(3));
        updateSelected({
            audioStart: t,
            speaker
        });
        toast({
            title: "✅ بداية",
            description: `${fmtTime(t)}`
        });
    };
    const setEndFromCurrent = ()=>{
        if (!selected || !audioRef.current) return;
        const t = Number(audioRef.current.currentTime.toFixed(3));
        // Set end for current ayah
        setBoxes((current)=>current.map((box, i)=>{
                if (i === selectedIndex) return {
                    ...box,
                    audioEnd: t,
                    speaker
                };
                // Auto-chain: set start for next ayah of same surah
                if (i === selectedIndex + 1 && box.surah === selected.surah) {
                    return {
                        ...box,
                        audioStart: t,
                        speaker
                    };
                }
                return box;
            }));
        // Auto-advance to next ayah
        if (selectedIndex < boxes.length - 1) {
            setSelectedIndex(selectedIndex + 1);
            toast({
                title: "🔗 نهاية + ربط",
                description: `${fmtTime(t)} → الآية التالية`
            });
        } else {
            toast({
                title: "✅ نهاية",
                description: `${fmtTime(t)}`
            });
        }
    };
    const clearBinding = ()=>{
        if (!selected) return;
        updateSelected({
            audioStart: undefined,
            audioEnd: undefined
        });
    };
    // محاذاة جميع المربعات في نفس السطر (نفس Y ونفس الارتفاع)
    const snapToRows = ()=>{
        if (boxes.length <= 1) return;
        const rowThreshold = 30; // إذا الفرق أقل من 30px يُعتبر نفس السطر
        setBoxes((current)=>{
            const result = [
                ...current
            ];
            const assigned = new Set();
            for(let i = 0; i < result.length; i++){
                if (assigned.has(i)) continue;
                // اجمع كل المربعات على نفس السطر تقريباً
                const rowBoxes = [
                    i
                ];
                for(let j = i + 1; j < result.length; j++){
                    if (!assigned.has(j) && Math.abs(result[j].y - result[i].y) < rowThreshold) {
                        rowBoxes.push(j);
                    }
                }
                if (rowBoxes.length > 1) {
                    // وحّد Y والارتفاع للمجموعة
                    const avgY = Math.round(rowBoxes.reduce((s, idx)=>s + result[idx].y, 0) / rowBoxes.length);
                    const maxH = Math.max(...rowBoxes.map((idx)=>result[idx].height));
                    rowBoxes.forEach((idx)=>{
                        result[idx] = {
                            ...result[idx],
                            y: avgY,
                            height: maxH
                        };
                        assigned.add(idx);
                    });
                }
            }
            return result;
        });
        toast({
            title: "✅ تم المحاذاة",
            description: "تم توحيد سطور المربعات"
        });
    };
    // ── تصدير كل العمل كملف JSON ──
    const exportAll = ()=>{
        const data = {
            version: 1,
            timestamp: new Date().toISOString(),
            coordinates: getSavedAyahCoordinates(),
            timings: getSavedTimings()
        };
        const blob = new Blob([
            JSON.stringify(data, null, 2)
        ], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mushaf-calibration-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
            title: "📥 تم التصدير",
            description: "تم حفظ الملف"
        });
    };
    // ── استيراد من ملف JSON ──
    const importAll = ()=>{
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e)=>{
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev)=>{
                try {
                    const data = JSON.parse(ev.target?.result);
                    if (data.coordinates) {
                        localStorage.setItem("mushaf:ayahCoordinates:v1", JSON.stringify(data.coordinates));
                    }
                    if (data.timings) {
                        localStorage.setItem("mushaf:ayahTimings:v1", JSON.stringify(data.timings));
                    }
                    // إعادة تحميل الصفحة الحالية
                    setBoxes(getPageAyahBoxes(pageSrc));
                    toast({
                        title: "✅ تم الاستيراد",
                        description: "تم تحميل البيانات بنجاح"
                    });
                } catch  {
                    toast({
                        title: "❌ خطأ",
                        description: "الملف غير صالح"
                    });
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };
    // ── ربط ذكي: آية N = معلم + آية N+1 = طفل (تلقائياً) ──
    const smartAutoLink = ()=>{
        const savedAll = getSavedTimings();
        const surahs = Array.from(new Set(boxes.map((b)=>b.surah)));
        let linked = 0;
        setBoxes((current)=>{
            const result = [
                ...current
            ];
            const newBoxes = [];
            surahs.forEach((surahNum)=>{
                const saved = savedAll[surahNum];
                if (!saved?.segments || saved.segments.length === 0) return;
                const teacherSegs = saved.segments.filter((s)=>s.speaker === "teacher").sort((a, b)=>a.start - b.start);
                const kidsSegs = saved.segments.filter((s)=>s.speaker === "kids").sort((a, b)=>a.start - b.start);
                // ربط كل آية بالترتيب
                const surahBoxes = result.filter((b)=>b.surah === surahNum);
                surahBoxes.forEach((box, idx)=>{
                    const boxIdx = result.indexOf(box);
                    // ربط بمقطع المعلم
                    if (teacherSegs[idx]) {
                        result[boxIdx] = {
                            ...result[boxIdx],
                            audioStart: teacherSegs[idx].start,
                            audioEnd: teacherSegs[idx].end,
                            speaker: "teacher"
                        };
                        linked++;
                    }
                    // إنشاء مربع طفل تلقائي إذا يوجد مقطع طفل
                    if (kidsSegs[idx]) {
                        // تحقق إذا لا يوجد بالفعل مربع طفل لهذه الآية
                        const hasKidsBox = result.some((b)=>b.surah === surahNum && b.ayah === box.ayah && b.speaker === "kids");
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
                                speaker: "kids"
                            });
                            linked++;
                        }
                    }
                });
            });
            return [
                ...result,
                ...newBoxes
            ];
        });
        toast({
            title: "🧠 ربط ذكي",
            description: `تم ربط ${linked} مقطع (معلم + طفل)`
        });
    };
    const autoLinkFromTimings = ()=>{
        const savedAll = getSavedTimings();
        const surahs = Array.from(new Set(boxes.map((b)=>b.surah)));
        // Collect segments and teacher timings for each surah
        const surahSegments = {};
        const surahTeacherTimes = {};
        surahs.forEach((s)=>{
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
        setBoxes((current)=>{
            const usedCounts = {};
            return current.map((box)=>{
                const count = usedCounts[box.surah] || 0;
                usedCounts[box.surah] = count + 1;
                // Try segments first (most accurate, has speaker info)
                const segs = surahSegments[box.surah];
                if (segs) {
                    // Find segments matching this ayah index for teacher
                    const teacherSegs = segs.filter((s)=>s.speaker === "teacher");
                    const kidsSegs = segs.filter((s)=>s.speaker === "kids");
                    const seg = teacherSegs[count] || segs[count];
                    if (seg) {
                        return {
                            ...box,
                            audioStart: seg.start,
                            audioEnd: seg.end,
                            speaker: seg.speaker
                        };
                    }
                }
                // Fallback to teacher timings array
                const times = surahTeacherTimes[box.surah];
                if (times && times[count] !== undefined) {
                    return {
                        ...box,
                        audioStart: times[count],
                        audioEnd: times[count + 1] ?? times[count] + 3,
                        speaker: "teacher"
                    };
                }
                return box;
            });
        });
        toast({
            title: "✅ تم الربط التلقائي",
            description: "تم ربط المقاطع المحفوظة من صفحة التقسيم الذكي"
        });
    };
    useEffect(()=>{
        if (selected) ensureAudioLoaded(selected.surah);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selected?.surah
    ]);
    useEffect(()=>{
        stopAudio(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ 
    }, [
        pageSrc
    ]);
    const onTimeUpdate = ()=>{
        const a = audioRef.current;
        if (!a) return;
        setCurrentTime(a.currentTime);
        if (stopAtRef.current !== null && a.currentTime >= stopAtRef.current - 0.02) {
            a.pause();
            stopAtRef.current = null;
        }
    };
    const saveAll = useCallback((silent = false)=>{
        // Save only calibration box data — never touch split data
        savePageAyahBoxes(pageSrc, boxes);
        if (!silent) {
            setIsSaving(true);
            const bound = boxes.filter((b)=>b.audioStart !== undefined && b.audioEnd !== undefined).length;
            toast({
                title: "✅ تم الحفظ",
                description: `${boxes.length} مربع، ${bound} مربوط`
            });
            setTimeout(()=>setIsSaving(false), 1200);
        }
    }, [
        boxes,
        pageSrc
    ]);
    // Track latest state for synchronous save on unmount (HMR)
    const stateRef = useRef({
        pageSrc,
        boxes
    });
    useEffect(()=>{
        stateRef.current = {
            pageSrc,
            boxes
        };
    }, [
        pageSrc,
        boxes
    ]);
    useEffect(()=>{
        // Ensure we save right before component unmounts (e.g., during code edit / HMR)
        return ()=>{
            savePageAyahBoxes(stateRef.current.pageSrc, stateRef.current.boxes);
        };
    }, []);
    // Auto-save every 2 seconds
    useEffect(()=>{
        const timer = setTimeout(()=>saveAll(true), 2000);
        return ()=>clearTimeout(timer);
    }, [
        boxes,
        pageSrc,
        saveAll
    ]);
    // ── Keyboard shortcuts for desktop ──
    const [showHelp, setShowHelp] = useState(false);
    useEffect(()=>{
        const handler = (e)=>{
            const tag = e.target?.tagName?.toLowerCase();
            // Don't capture when typing in input/select
            if (tag === "input" || tag === "textarea" || tag === "select") return;
            const s = step;
            switch(e.key){
                // ── Move ──
                case "ArrowUp":
                    e.preventDefault();
                    if (e.shiftKey) resize(0, -s);
                    else move(0, -s);
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    if (e.shiftKey) resize(0, s);
                    else move(0, s);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    if (e.shiftKey) resize(s, 0);
                    else move(s, 0);
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    if (e.shiftKey) resize(-s, 0);
                    else move(-s, 0);
                    break;
                // ── Navigate ayahs ──
                case "Tab":
                    e.preventDefault();
                    if (e.shiftKey) {
                        setSelectedIndex((i)=>Math.max(0, i - 1));
                    } else {
                        setSelectedIndex((i)=>Math.min(boxes.length - 1, i + 1));
                    }
                    stopAudio();
                    break;
                // ── Play/Pause ──
                case " ":
                    e.preventDefault();
                    if (isPlaying) stopAudio();
                    else playSelected();
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
                    setScale((sc)=>clamp(sc + 0.1, 0.25, 1.4));
                    break;
                case "-":
                case "_":
                    e.preventDefault();
                    setScale((sc)=>clamp(sc - 0.1, 0.25, 1.4));
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
                    setSpeaker((sp)=>sp === "teacher" ? "kids" : "teacher");
                    break;
                // ── Help ──
                case "?":
                case "h":
                case "H":
                    e.preventDefault();
                    setShowHelp((v)=>!v);
                    break;
                // ── Escape ──
                case "Escape":
                    if (showHelp) setShowHelp(false);
                    break;
            }
        };
        window.addEventListener("keydown", handler);
        return ()=>window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        boxes.length,
        isPlaying,
        showHelp,
        selectedIndex
    ]);
    const hasBinding = selected?.audioStart !== undefined && selected?.audioEnd !== undefined;
    const boundCount = boxes.filter((b)=>b.audioStart !== undefined && b.audioEnd !== undefined).length;
    return /*#__PURE__*/ _jsxDEV("main", {
        className: "min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-3",
        dir: "rtl",
        children: [
            /*#__PURE__*/ _jsxDEV("audio", {
                ref: audioRef,
                crossOrigin: "anonymous",
                onPlay: ()=>setIsPlaying(true),
                onPause: ()=>setIsPlaying(false),
                onTimeUpdate: onTimeUpdate,
                onLoadedMetadata: ()=>{
                    const a = audioRef.current;
                    if (a) setDuration(a.duration || 0);
                },
                onDurationChange: ()=>{
                    const a = audioRef.current;
                    if (a) setDuration(a.duration || 0);
                }
            }, void 0, false, {
                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                lineNumber: 596,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                className: "mx-auto max-w-5xl space-y-3",
                children: [
                    /*#__PURE__*/ _jsxDEV("header", {
                        className: "flex items-center justify-between gap-2 rounded-2xl bg-slate-800/80 backdrop-blur border border-slate-700 p-3",
                        children: [
                            /*#__PURE__*/ _jsxDEV(Link, {
                                to: "/",
                                onClick: ()=>savePageAyahBoxes(pageSrc, boxes),
                                className: "flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 transition-colors",
                                children: /*#__PURE__*/ _jsxDEV(ArrowRight, {
                                    className: "h-5 w-5"
                                }, void 0, false, {
                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                    lineNumber: 614,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                lineNumber: 609,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ _jsxDEV("div", {
                                className: "flex-1 text-center",
                                children: [
                                    /*#__PURE__*/ _jsxDEV("h1", {
                                        className: "font-amiri text-xl font-bold bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent",
                                        children: "ضبط تظليل الآيات"
                                    }, void 0, false, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 617,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("p", {
                                        className: "text-xs text-slate-400",
                                        children: [
                                            boundCount,
                                            "/",
                                            boxes.length,
                                            " آية مربوطة · حفظ تلقائي"
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 620,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                lineNumber: 616,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ _jsxDEV("button", {
                                onClick: ()=>saveAll(false),
                                className: `flex h-10 items-center gap-1 rounded-full px-4 font-bold text-sm shadow-lg active:scale-95 transition-all ${isSaving ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-amber-500 to-amber-600 text-black"}`,
                                children: [
                                    /*#__PURE__*/ _jsxDEV(Save, {
                                        className: "h-4 w-4"
                                    }, void 0, false, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 630,
                                        columnNumber: 13
                                    }, this),
                                    " ",
                                    isSaving ? "✅" : "حفظ"
                                ]
                            }, void 0, true, {
                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                lineNumber: 624,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ _jsxDEV("button", {
                                onClick: ()=>setShowHelp((v)=>!v),
                                className: `flex h-10 w-10 items-center justify-center rounded-full transition-colors ${showHelp ? "bg-violet-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"}`,
                                title: "اختصارات لوحة المفاتيح (H)",
                                children: /*#__PURE__*/ _jsxDEV(Keyboard, {
                                    className: "h-4 w-4"
                                }, void 0, false, {
                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                    lineNumber: 639,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                lineNumber: 632,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                        lineNumber: 608,
                        columnNumber: 9
                    }, this),
                    showHelp && /*#__PURE__*/ _jsxDEV("div", {
                        className: "rounded-2xl bg-violet-950/80 backdrop-blur border border-violet-500/30 p-4 animate-fade-in",
                        children: [
                            /*#__PURE__*/ _jsxDEV("div", {
                                className: "flex items-center justify-between mb-3",
                                children: [
                                    /*#__PURE__*/ _jsxDEV("h3", {
                                        className: "text-sm font-bold text-violet-300 flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV(Keyboard, {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 648,
                                                columnNumber: 17
                                            }, this),
                                            " اختصارات لوحة المفاتيح"
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 647,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("button", {
                                        onClick: ()=>setShowHelp(false),
                                        className: "text-xs text-slate-400 hover:text-white",
                                        children: "Esc للإغلاق"
                                    }, void 0, false, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 650,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                lineNumber: 646,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ _jsxDEV("div", {
                                className: "grid grid-cols-2 md:grid-cols-3 gap-2 text-xs",
                                children: [
                                    [
                                        "←↑→↓",
                                        "تحريك المربع"
                                    ],
                                    [
                                        "Shift+←↑→↓",
                                        "تغيير الحجم"
                                    ],
                                    [
                                        "Tab / Shift+Tab",
                                        "الآية التالية/السابقة"
                                    ],
                                    [
                                        "Space",
                                        "تشغيل/إيقاف"
                                    ],
                                    [
                                        "[",
                                        "تحديد بداية الصوت"
                                    ],
                                    [
                                        "]",
                                        "تحديد نهاية الصوت"
                                    ],
                                    [
                                        "Ctrl+S",
                                        "حفظ"
                                    ],
                                    [
                                        "D",
                                        "نسخ المربع"
                                    ],
                                    [
                                        "Delete",
                                        "حذف المربع"
                                    ],
                                    [
                                        "+/-",
                                        "تكبير/تصغير"
                                    ],
                                    [
                                        "T",
                                        "تبديل معلم/طفل"
                                    ],
                                    [
                                        "A",
                                        "ربط تلقائي"
                                    ]
                                ].map(([key, desc])=>/*#__PURE__*/ _jsxDEV("div", {
                                        className: "flex items-center gap-2 bg-slate-800/60 rounded-lg p-2",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("kbd", {
                                                className: "px-1.5 py-0.5 rounded bg-slate-700 text-violet-300 font-mono text-[10px] font-bold shrink-0",
                                                children: key
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 668,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("span", {
                                                className: "text-slate-300",
                                                children: desc
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 669,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, key, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 667,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                lineNumber: 652,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                        lineNumber: 645,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ _jsxDEV("section", {
                        className: "grid gap-3 lg:grid-cols-[1fr_300px]",
                        children: [
                            /*#__PURE__*/ _jsxDEV("div", {
                                className: "max-h-[80vh] overflow-auto rounded-2xl bg-slate-800/60 backdrop-blur border border-slate-700 p-2 touch-none",
                                children: /*#__PURE__*/ _jsxDEV("div", {
                                    ref: canvasRef,
                                    className: "relative mx-auto origin-top",
                                    style: {
                                        width: PAGE_IMAGE_SIZE.width * scale,
                                        height: PAGE_IMAGE_SIZE.height * scale
                                    },
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("img", {
                                            src: pageSrc,
                                            alt: "صفحة المصحف",
                                            className: "absolute inset-0 h-full w-full select-none object-fill",
                                            draggable: false
                                        }, void 0, false, {
                                            fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                            lineNumber: 680,
                                            columnNumber: 15
                                        }, this),
                                        boxes.map((box, index)=>{
                                            const isSelected = index === selectedIndex;
                                            const bound = box.audioStart !== undefined && box.audioEnd !== undefined;
                                            const boxSpeaker = box.speaker ?? "teacher";
                                            const boxColors = speakerColors[boxSpeaker];
                                            return /*#__PURE__*/ _jsxDEV("button", {
                                                onPointerDown: (e)=>dragStart(index, e),
                                                className: "absolute rounded-md border-2 transition-all touch-none",
                                                style: {
                                                    left: box.x * scale,
                                                    top: box.y * scale,
                                                    width: box.width * scale,
                                                    height: box.height * scale,
                                                    mixBlendMode: "multiply",
                                                    background: isSelected ? speakerColors[speaker].fill : bound ? boxColors.fill : "rgba(156,163,175,0.15)",
                                                    borderColor: isSelected ? speakerColors[speaker].stroke : bound ? boxColors.stroke : "rgba(107,114,128,0.4)",
                                                    borderStyle: bound ? "solid" : "dashed"
                                                },
                                                children: /*#__PURE__*/ _jsxDEV("span", {
                                                    className: "absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white",
                                                    children: [
                                                        box.surah,
                                                        ":",
                                                        box.ayah,
                                                        bound ? " 🔗" : ""
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                    lineNumber: 700,
                                                    columnNumber: 21
                                                }, this)
                                            }, `${box.surah}-${box.ayah}-${index}`, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 687,
                                                columnNumber: 19
                                            }, this);
                                        })
                                    ]
                                }, void 0, true, {
                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                    lineNumber: 679,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                lineNumber: 678,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ _jsxDEV("aside", {
                                className: "space-y-2 max-h-[80vh] overflow-y-auto",
                                children: [
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("select", {
                                                value: pageSrc,
                                                onChange: (e)=>loadPage(e.target.value),
                                                className: "w-full rounded-lg bg-slate-700 border-slate-600 p-2 text-sm text-white",
                                                children: pageSources.map((src)=>/*#__PURE__*/ _jsxDEV("option", {
                                                        value: src,
                                                        children: src.replace("/pages/", "")
                                                    }, src, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 714,
                                                        columnNumber: 41
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 713,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("select", {
                                                value: selectedIndex,
                                                onChange: (e)=>{
                                                    setSelectedIndex(Number(e.target.value));
                                                    stopAudio();
                                                },
                                                className: "w-full rounded-lg bg-slate-700 border-slate-600 p-2 text-sm text-white",
                                                children: boxes.map((box, i)=>{
                                                    const bound = box.audioStart !== undefined && box.audioEnd !== undefined;
                                                    return /*#__PURE__*/ _jsxDEV("option", {
                                                        value: i,
                                                        children: [
                                                            bound ? "🔗 " : "○ ",
                                                            box.surah,
                                                            ":",
                                                            box.ayah
                                                        ]
                                                    }, i, true, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 723,
                                                        columnNumber: 26
                                                    }, this);
                                                })
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 716,
                                                columnNumber: 15
                                            }, this),
                                            selected && /*#__PURE__*/ _jsxDEV("div", {
                                                className: "grid grid-cols-4 gap-1",
                                                children: [
                                                    /*#__PURE__*/ _jsxDEV("input", {
                                                        type: "number",
                                                        min: 1,
                                                        max: 114,
                                                        value: selected.surah,
                                                        onChange: (e)=>updateSelected({
                                                                surah: parseInt(e.target.value) || 1
                                                            }),
                                                        className: "rounded-lg bg-slate-700 p-1.5 text-xs text-white text-center",
                                                        title: "سورة"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 728,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("input", {
                                                        type: "number",
                                                        min: 1,
                                                        value: selected.ayah,
                                                        onChange: (e)=>updateSelected({
                                                                ayah: parseInt(e.target.value) || 1
                                                            }),
                                                        className: "rounded-lg bg-slate-700 p-1.5 text-xs text-white text-center",
                                                        title: "آية"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 731,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        disabled: selectedIndex <= 0,
                                                        onClick: ()=>{
                                                            setSelectedIndex((i)=>i - 1);
                                                            stopAudio();
                                                        },
                                                        className: "rounded-lg bg-slate-700 p-1.5 text-xs font-bold disabled:opacity-30",
                                                        children: "◀"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 734,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        disabled: selectedIndex >= boxes.length - 1,
                                                        onClick: ()=>{
                                                            setSelectedIndex((i)=>i + 1);
                                                            stopAudio();
                                                        },
                                                        className: "rounded-lg bg-slate-700 p-1.5 text-xs font-bold disabled:opacity-30",
                                                        children: "▶"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 737,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 727,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 712,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2",
                                        children: /*#__PURE__*/ _jsxDEV("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ _jsxDEV("button", {
                                                    onClick: isPlaying ? stopAudio : playSelected,
                                                    className: "w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white active:scale-95 shrink-0 shadow-lg",
                                                    children: isPlaying ? /*#__PURE__*/ _jsxDEV(Pause, {
                                                        className: "h-4 w-4"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 749,
                                                        columnNumber: 32
                                                    }, this) : /*#__PURE__*/ _jsxDEV(Play, {
                                                        className: "h-4 w-4"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 749,
                                                        columnNumber: 64
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                    lineNumber: 747,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ _jsxDEV("div", {
                                                    className: "flex-1",
                                                    children: [
                                                        /*#__PURE__*/ _jsxDEV("input", {
                                                            type: "range",
                                                            min: 0,
                                                            max: duration || 0,
                                                            step: 0.01,
                                                            value: currentTime,
                                                            onChange: (e)=>{
                                                                const a = audioRef.current;
                                                                if (a) {
                                                                    a.currentTime = Number(e.target.value);
                                                                    setCurrentTime(Number(e.target.value));
                                                                    stopAtRef.current = null;
                                                                }
                                                            },
                                                            className: "w-full accent-emerald-500"
                                                        }, void 0, false, {
                                                            fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                            lineNumber: 752,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ _jsxDEV("div", {
                                                            className: "flex justify-between text-[10px] font-mono text-slate-500",
                                                            children: [
                                                                /*#__PURE__*/ _jsxDEV("span", {
                                                                    className: "text-emerald-400",
                                                                    children: fmtTime(currentTime)
                                                                }, void 0, false, {
                                                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                                    lineNumber: 756,
                                                                    columnNumber: 21
                                                                }, this),
                                                                /*#__PURE__*/ _jsxDEV("span", {
                                                                    children: fmtTime(duration)
                                                                }, void 0, false, {
                                                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                                    lineNumber: 757,
                                                                    columnNumber: 21
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                            lineNumber: 755,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                    lineNumber: 751,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                            lineNumber: 746,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 745,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3 space-y-2",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("div", {
                                                className: "text-[10px] font-bold text-emerald-400 flex items-center justify-between",
                                                children: [
                                                    /*#__PURE__*/ _jsxDEV("span", {
                                                        children: [
                                                            "🎯 ",
                                                            selected?.surah,
                                                            ":",
                                                            selected?.ayah
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 766,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("span", {
                                                        className: "text-slate-500 font-mono",
                                                        children: "[ بداية · ] نهاية+ربط"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 767,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 765,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("div", {
                                                className: "grid grid-cols-2 gap-1.5",
                                                children: [
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: setStartFromCurrent,
                                                        className: "rounded-lg bg-emerald-600 p-2 text-white text-xs font-bold active:scale-95",
                                                        children: "⏺ بداية"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 770,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: setEndFromCurrent,
                                                        className: "rounded-lg bg-rose-600 p-2 text-white text-xs font-bold active:scale-95",
                                                        children: "⏹ نهاية 🔗"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 771,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 769,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("div", {
                                                className: "text-xs text-center font-mono bg-slate-800 rounded-lg p-1.5 text-slate-300",
                                                children: [
                                                    selected?.audioStart !== undefined ? fmtTime(selected.audioStart) : "—",
                                                    " → ",
                                                    selected?.audioEnd !== undefined ? fmtTime(selected.audioEnd) : "—",
                                                    hasBinding && selected?.audioEnd > selected?.audioStart && /*#__PURE__*/ _jsxDEV("span", {
                                                        className: "text-emerald-500 font-bold",
                                                        children: [
                                                            " ",
                                                            (selected.audioEnd - selected.audioStart).toFixed(1),
                                                            "s"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 778,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 773,
                                                columnNumber: 15
                                            }, this),
                                            hasBinding && /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: clearBinding,
                                                className: "w-full text-[10px] rounded-lg bg-slate-700/60 p-1 text-slate-400",
                                                children: "✕ إلغاء الربط"
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 782,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 764,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "grid grid-cols-3 gap-1.5",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: smartAutoLink,
                                                className: "p-2 rounded-lg bg-gradient-to-r from-fuchsia-600/20 to-violet-600/20 border border-fuchsia-500/30 text-fuchsia-300 font-bold text-[10px] active:scale-95",
                                                children: "🧠 ربط ذكي"
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 790,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: autoLinkFromTimings,
                                                className: "p-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 font-bold text-[10px] active:scale-95",
                                                children: "🪄 ربط عادي"
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 794,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV(Link, {
                                                to: "/recitation-methods",
                                                className: "p-2 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-300 font-bold text-[10px] text-center active:scale-95",
                                                children: "⚡ تقسيم"
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 798,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 789,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "rounded-xl bg-slate-800/80 border border-slate-700 p-2 space-y-1.5",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("div", {
                                                className: "grid grid-cols-2 gap-1",
                                                children: [
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>setSpeaker("teacher"),
                                                        className: `p-1.5 rounded-lg font-bold text-xs ${speaker === "teacher" ? "bg-amber-500 text-black" : "bg-slate-700 text-slate-400"}`,
                                                        children: "🎙️ معلم"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 807,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>setSpeaker("kids"),
                                                        className: `p-1.5 rounded-lg font-bold text-xs ${speaker === "kids" ? "bg-sky-500 text-black" : "bg-slate-700 text-slate-400"}`,
                                                        children: "👦 طفل"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 808,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 806,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("div", {
                                                className: "grid grid-cols-4 gap-1 text-xs",
                                                children: [
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: addNewBox,
                                                        className: "col-span-2 p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 font-bold active:scale-95",
                                                        children: [
                                                            /*#__PURE__*/ _jsxDEV(Plus, {
                                                                className: "inline h-3 w-3"
                                                            }, void 0, false, {
                                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                                lineNumber: 811,
                                                                columnNumber: 146
                                                            }, this),
                                                            " إضافة"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 811,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: duplicateSelected,
                                                        className: "p-1.5 rounded-lg bg-slate-700 active:scale-95",
                                                        title: "نسخ (D)",
                                                        children: /*#__PURE__*/ _jsxDEV(Copy, {
                                                            className: "mx-auto h-3 w-3"
                                                        }, void 0, false, {
                                                            fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                            lineNumber: 812,
                                                            columnNumber: 127
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 812,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: deleteSelected,
                                                        className: "p-1.5 rounded-lg bg-red-950/50 text-red-400 active:scale-95",
                                                        title: "حذف (Del)",
                                                        children: /*#__PURE__*/ _jsxDEV(Trash2, {
                                                            className: "mx-auto h-3 w-3"
                                                        }, void 0, false, {
                                                            fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                            lineNumber: 813,
                                                            columnNumber: 140
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 813,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 810,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 805,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "rounded-xl bg-slate-800/80 border border-slate-700 p-2 space-y-1.5",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("div", {
                                                className: "text-[10px] font-bold text-slate-400",
                                                children: "تحريك وحجم"
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 819,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("div", {
                                                className: "grid grid-cols-3 gap-1 text-sm font-bold",
                                                children: [
                                                    /*#__PURE__*/ _jsxDEV("span", {}, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 821,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>move(0, -step),
                                                        className: "rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                        children: "↑"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 822,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("span", {}, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 823,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>move(step, 0),
                                                        className: "rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                        children: "→"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 824,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>move(0, step),
                                                        className: "rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                        children: "↓"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 825,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>move(-step, 0),
                                                        className: "rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                        children: "←"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 826,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 820,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("div", {
                                                className: "grid grid-cols-2 gap-1 text-[10px]",
                                                children: [
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>resize(step, 0),
                                                        className: "rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                        children: "عرض +"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 829,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>resize(-step, 0),
                                                        className: "rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                        children: "عرض -"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 830,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>resize(0, step),
                                                        className: "rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                        children: "ارتفاع +"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 831,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>resize(0, -step),
                                                        className: "rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                        children: "ارتفاع -"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 832,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 828,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 818,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "grid grid-cols-2 gap-1.5",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: snapToRows,
                                                className: "p-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 font-bold text-[10px] active:scale-95",
                                                children: "📐 محاذاة السطور"
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 838,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: applyHeightToAll,
                                                className: "p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] active:scale-95",
                                                children: "📏 توحيد الارتفاع"
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 841,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 837,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "flex gap-1.5",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: ()=>setScale((s)=>clamp(s + 0.1, 0.25, 1.4)),
                                                className: "flex-1 rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                children: /*#__PURE__*/ _jsxDEV(ZoomIn, {
                                                    className: "mx-auto h-3.5 w-3.5"
                                                }, void 0, false, {
                                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                    lineNumber: 848,
                                                    columnNumber: 149
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 848,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: ()=>setScale((s)=>clamp(s - 0.1, 0.25, 1.4)),
                                                className: "flex-1 rounded-lg bg-slate-700 p-1.5 active:bg-slate-600",
                                                children: /*#__PURE__*/ _jsxDEV(ZoomOut, {
                                                    className: "mx-auto h-3.5 w-3.5"
                                                }, void 0, false, {
                                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                    lineNumber: 849,
                                                    columnNumber: 149
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 849,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: ()=>{
                                                    resetPageAyahBoxes(pageSrc);
                                                    setBoxes(AYAH_COORDINATES[pageSrc].map((b)=>({
                                                            ...b
                                                        })));
                                                },
                                                className: "flex-1 rounded-lg bg-red-950/50 border border-red-500/30 text-red-400 p-1.5 active:scale-95",
                                                title: "إعادة ضبط",
                                                children: /*#__PURE__*/ _jsxDEV(RotateCcw, {
                                                    className: "mx-auto h-3.5 w-3.5"
                                                }, void 0, false, {
                                                    fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                    lineNumber: 852,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 850,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 847,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "grid grid-cols-2 gap-1.5",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: exportAll,
                                                className: "p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95",
                                                children: [
                                                    /*#__PURE__*/ _jsxDEV(Download, {
                                                        className: "h-3 w-3"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 860,
                                                        columnNumber: 17
                                                    }, this),
                                                    " تصدير (حفظ)"
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 858,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("button", {
                                                onClick: importAll,
                                                className: "p-2 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 font-bold text-[10px] flex items-center justify-center gap-1 active:scale-95",
                                                children: [
                                                    /*#__PURE__*/ _jsxDEV(Upload, {
                                                        className: "h-3 w-3"
                                                    }, void 0, false, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 864,
                                                        columnNumber: 17
                                                    }, this),
                                                    " استيراد"
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 862,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 857,
                                        columnNumber: 13
                                    }, this),
                                    segmentsList.length > 0 && /*#__PURE__*/ _jsxDEV("details", {
                                        className: "rounded-xl bg-slate-800/60 border border-slate-700 p-2",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("summary", {
                                                className: "text-[10px] font-bold text-slate-400 cursor-pointer",
                                                children: [
                                                    "📎 مقاطع (",
                                                    segmentsList.length,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 871,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("div", {
                                                className: "mt-2 space-y-1 max-h-40 overflow-y-auto",
                                                children: segmentsList.map((seg, i)=>/*#__PURE__*/ _jsxDEV("button", {
                                                        onClick: ()=>{
                                                            updateSelected({
                                                                audioStart: seg.start,
                                                                audioEnd: seg.end,
                                                                speaker: seg.speaker
                                                            });
                                                            toast({
                                                                title: "✅",
                                                                description: seg.label || `مقطع ${i + 1}`
                                                            });
                                                        },
                                                        className: "w-full flex items-center gap-2 bg-slate-700/40 p-1.5 rounded-lg text-[10px] hover:bg-slate-600/40",
                                                        children: [
                                                            /*#__PURE__*/ _jsxDEV("span", {
                                                                children: seg.speaker === "teacher" ? "🎙️" : "👦"
                                                            }, void 0, false, {
                                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                                lineNumber: 882,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ _jsxDEV("span", {
                                                                className: "flex-1 text-right truncate text-white",
                                                                children: seg.label || `مقطع ${i + 1}`
                                                            }, void 0, false, {
                                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                                lineNumber: 883,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ _jsxDEV("span", {
                                                                className: "text-slate-500 font-mono shrink-0",
                                                                children: fmtTime(seg.start)
                                                            }, void 0, false, {
                                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                                lineNumber: 884,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, seg.id, true, {
                                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                        lineNumber: 874,
                                                        columnNumber: 21
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                                lineNumber: 872,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                        lineNumber: 870,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                                lineNumber: 710,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                        lineNumber: 676,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
                lineNumber: 606,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx",
        lineNumber: 595,
        columnNumber: 5
    }, this);
};
_s(AyahCalibration, "fhcslV/LUId5eg/n2Za8ZcdnvSY=");
_c = AyahCalibration;
export default AyahCalibration;
var _c;
$RefreshReg$(_c, "AyahCalibration");


if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}


if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("H:/learn-quran-kids-1/src/pages/AyahCalibration.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkF5YWhDYWxpYnJhdGlvbi50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlQ2FsbGJhY2ssIHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xyXG5pbXBvcnQgeyBBcnJvd1JpZ2h0LCBQYXVzZSwgUGxheSwgUGx1cywgUm90YXRlQ2N3LCBTYXZlLCBUcmFzaDIsIFpvb21JbiwgWm9vbU91dCwgTGluazIsIENvcHksIEtleWJvYXJkLCBEb3dubG9hZCwgVXBsb2FkIH0gZnJvbSBcImx1Y2lkZS1yZWFjdFwiO1xyXG5pbXBvcnQgeyBBeWFoQm94LCBBWUFIX0NPT1JESU5BVEVTLCBnZXRBbGxQYWdlU291cmNlcywgZ2V0UGFnZUF5YWhCb3hlcywgUEFHRV9JTUFHRV9TSVpFLCByZXNldFBhZ2VBeWFoQm94ZXMsIHNhdmVQYWdlQXlhaEJveGVzLCBnZXRTYXZlZEF5YWhDb29yZGluYXRlcyB9IGZyb20gXCJAL2RhdGEvYXlhaENvb3JkaW5hdGVzXCI7XHJcbmltcG9ydCB7IGdldFNhdmVkVGltaW5ncywgZ2V0U3VyYWhUaW1pbmdzLCBBdWRpb1NlZ21lbnQgfSBmcm9tIFwiQC9kYXRhL2F5YWhUaW1pbmdzXCI7XHJcbmltcG9ydCB7IGdldFN1cmFoQXVkaW9VcmwsIGhhc0Nsb3VkQXVkaW8gfSBmcm9tIFwiQC9kYXRhL2F1ZGlvVXJsc1wiO1xyXG5pbXBvcnQgeyB0b2FzdCB9IGZyb20gXCJAL2hvb2tzL3VzZS10b2FzdFwiO1xyXG5pbXBvcnQgeyBMaW5rIH0gZnJvbSBcInJlYWN0LXJvdXRlci1kb21cIjtcclxuXHJcbmNvbnN0IGF1ZGlvUGF0aCA9IChuOiBudW1iZXIpID0+IChoYXNDbG91ZEF1ZGlvKG4pID8gZ2V0U3VyYWhBdWRpb1VybChuKSA6IGAvYXVkaW8vc3VyYWhzLyR7bn0ubXAzYCk7XHJcbmNvbnN0IGNsYW1wID0gKHZhbHVlOiBudW1iZXIsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcikgPT4gTWF0aC5taW4oTWF0aC5tYXgodmFsdWUsIG1pbiksIG1heCk7XHJcbmNvbnN0IHN0ZXAgPSAxMDtcclxuXHJcbnR5cGUgU3BlYWtlciA9IFwidGVhY2hlclwiIHwgXCJraWRzXCI7XHJcblxyXG5jb25zdCBzcGVha2VyQ29sb3JzOiBSZWNvcmQ8U3BlYWtlciwgeyBmaWxsOiBzdHJpbmc7IHN0cm9rZTogc3RyaW5nIH0+ID0ge1xyXG4gIHRlYWNoZXI6IHsgZmlsbDogXCJyZ2JhKDI1MCwyMDQsMjEsMC40NSlcIiwgc3Ryb2tlOiBcInJnYmEoMjUwLDIwNCwyMSwwLjg1KVwiIH0sXHJcbiAga2lkczogICAgeyBmaWxsOiBcInJnYmEoNTYsMTg5LDI0OCwwLjQ1KVwiLCBzdHJva2U6IFwicmdiYSg1NiwxODksMjQ4LDAuODUpXCIgfSxcclxufTtcclxuXHJcbmNvbnN0IGZtdFRpbWUgPSAoczogbnVtYmVyKSA9PiB7XHJcbiAgaWYgKCFpc0Zpbml0ZShzKSB8fCBzIDwgMCkgcmV0dXJuIFwi4oCUXCI7XHJcbiAgY29uc3QgbSA9IE1hdGguZmxvb3IocyAvIDYwKTtcclxuICBjb25zdCBzZWMgPSAocyAtIG0gKiA2MCkudG9GaXhlZCgyKTtcclxuICByZXR1cm4gYCR7bX06JHtzZWMucGFkU3RhcnQoNSwgXCIwXCIpfWA7XHJcbn07XHJcblxyXG5jb25zdCBBeWFoQ2FsaWJyYXRpb24gPSAoKSA9PiB7XHJcbiAgY29uc3QgcGFnZVNvdXJjZXMgPSB1c2VNZW1vKCgpID0+IGdldEFsbFBhZ2VTb3VyY2VzKCksIFtdKTtcclxuICBjb25zdCBbcGFnZVNyYywgc2V0UGFnZVNyY10gPSB1c2VTdGF0ZShwYWdlU291cmNlc1swXSk7XHJcbiAgY29uc3QgW2JveGVzLCBzZXRCb3hlc10gPSB1c2VTdGF0ZTxBeWFoQm94W10+KCgpID0+IGdldFBhZ2VBeWFoQm94ZXMocGFnZVNvdXJjZXNbMF0pKTtcclxuICBjb25zdCBbc2VsZWN0ZWRJbmRleCwgc2V0U2VsZWN0ZWRJbmRleF0gPSB1c2VTdGF0ZSgwKTtcclxuICBjb25zdCBbc2NhbGUsIHNldFNjYWxlXSA9IHVzZVN0YXRlKCgpID0+IHR5cGVvZiB3aW5kb3cgPT09IFwidW5kZWZpbmVkXCIgPyAxIDogY2xhbXAoKHdpbmRvdy5pbm5lcldpZHRoIC0gMjQpIC8gUEFHRV9JTUFHRV9TSVpFLndpZHRoLCAwLjI1LCAxKSk7XHJcbiAgY29uc3QgW3NwZWFrZXIsIHNldFNwZWFrZXJdID0gdXNlU3RhdGU8U3BlYWtlcj4oXCJ0ZWFjaGVyXCIpO1xyXG4gIGNvbnN0IFtpc1BsYXlpbmcsIHNldElzUGxheWluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XHJcbiAgY29uc3QgW2N1cnJlbnRUaW1lLCBzZXRDdXJyZW50VGltZV0gPSB1c2VTdGF0ZSgwKTtcclxuICBjb25zdCBbZHVyYXRpb24sIHNldER1cmF0aW9uXSA9IHVzZVN0YXRlKDApO1xyXG4gIGNvbnN0IFtpc1NhdmluZywgc2V0SXNTYXZpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xyXG4gIGNvbnN0IFtzZWdtZW50c0xpc3QsIHNldFNlZ21lbnRzTGlzdF0gPSB1c2VTdGF0ZTxBdWRpb1NlZ21lbnRbXT4oW10pO1xyXG4gIGNvbnN0IGNhbnZhc1JlZiA9IHVzZVJlZjxIVE1MRGl2RWxlbWVudD4obnVsbCk7XHJcbiAgY29uc3QgYXVkaW9SZWYgPSB1c2VSZWY8SFRNTEF1ZGlvRWxlbWVudD4obnVsbCk7XHJcbiAgY29uc3Qgc3RvcEF0UmVmID0gdXNlUmVmPG51bWJlciB8IG51bGw+KG51bGwpO1xyXG4gIGNvbnN0IHNlbGVjdGVkID0gYm94ZXNbc2VsZWN0ZWRJbmRleF07XHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICBpZiAoc2VsZWN0ZWQpIHtcclxuICAgICAgY29uc3QgYWxsID0gZ2V0U2F2ZWRUaW1pbmdzKCk7XHJcbiAgICAgIHNldFNlZ21lbnRzTGlzdChhbGxbc2VsZWN0ZWQuc3VyYWhdPy5zZWdtZW50cyB8fCBbXSk7XHJcbiAgICB9XHJcbiAgfSwgW3NlbGVjdGVkPy5zdXJhaF0pO1xyXG5cclxuICBjb25zdCBsb2FkUGFnZSA9IChzcmM6IHN0cmluZykgPT4ge1xyXG4gICAgLy8gU2F2ZSBjdXJyZW50IHBhZ2UgYm94ZXMgYmVmb3JlIHN3aXRjaGluZyB0byBhdm9pZCBsb3NpbmcgZWRpdHNcclxuICAgIHNhdmVQYWdlQXlhaEJveGVzKHBhZ2VTcmMsIGJveGVzKTtcclxuICAgIHNldFBhZ2VTcmMoc3JjKTtcclxuICAgIHNldEJveGVzKGdldFBhZ2VBeWFoQm94ZXMoc3JjKSk7XHJcbiAgICBzZXRTZWxlY3RlZEluZGV4KDApO1xyXG4gICAgc3RvcEF1ZGlvKCk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3Qgc3RvcEF1ZGlvID0gKCkgPT4ge1xyXG4gICAgY29uc3QgYSA9IGF1ZGlvUmVmLmN1cnJlbnQ7IGlmICghYSkgcmV0dXJuO1xyXG4gICAgYS5wYXVzZSgpOyBzdG9wQXRSZWYuY3VycmVudCA9IG51bGw7IHNldElzUGxheWluZyhmYWxzZSk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgdXBkYXRlU2VsZWN0ZWQgPSAocGF0Y2g6IFBhcnRpYWw8QXlhaEJveD4pID0+IHtcclxuICAgIHNldEJveGVzKGN1cnJlbnQgPT4gY3VycmVudC5tYXAoKGJveCwgaSkgPT4gaSA9PT0gc2VsZWN0ZWRJbmRleCA/IHsgLi4uYm94LCAuLi5wYXRjaCB9IDogYm94KSk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgbW92ZSA9IChkeDogbnVtYmVyLCBkeTogbnVtYmVyKSA9PiB7XHJcbiAgICBpZiAoIXNlbGVjdGVkKSByZXR1cm47XHJcbiAgICB1cGRhdGVTZWxlY3RlZCh7XHJcbiAgICAgIHg6IGNsYW1wKHNlbGVjdGVkLnggKyBkeCwgMCwgUEFHRV9JTUFHRV9TSVpFLndpZHRoIC0gc2VsZWN0ZWQud2lkdGgpLFxyXG4gICAgICB5OiBjbGFtcChzZWxlY3RlZC55ICsgZHksIDAsIFBBR0VfSU1BR0VfU0laRS5oZWlnaHQgLSBzZWxlY3RlZC5oZWlnaHQpLFxyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgcmVzaXplID0gKGR3OiBudW1iZXIsIGRoOiBudW1iZXIpID0+IHtcclxuICAgIGlmICghc2VsZWN0ZWQpIHJldHVybjtcclxuICAgIHVwZGF0ZVNlbGVjdGVkKHtcclxuICAgICAgd2lkdGg6IGNsYW1wKHNlbGVjdGVkLndpZHRoICsgZHcsIDMwLCBQQUdFX0lNQUdFX1NJWkUud2lkdGggLSBzZWxlY3RlZC54KSxcclxuICAgICAgaGVpZ2h0OiBjbGFtcChzZWxlY3RlZC5oZWlnaHQgKyBkaCwgMjUsIFBBR0VfSU1BR0VfU0laRS5oZWlnaHQgLSBzZWxlY3RlZC55KSxcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGR1cGxpY2F0ZVNlbGVjdGVkID0gKCkgPT4ge1xyXG4gICAgaWYgKCFzZWxlY3RlZCkgcmV0dXJuO1xyXG4gICAgY29uc3QgY29weTogQXlhaEJveCA9IHtcclxuICAgICAgLi4uc2VsZWN0ZWQsXHJcbiAgICAgIHk6IGNsYW1wKHNlbGVjdGVkLnkgKyBzZWxlY3RlZC5oZWlnaHQgKyA4LCAwLCBQQUdFX0lNQUdFX1NJWkUuaGVpZ2h0IC0gc2VsZWN0ZWQuaGVpZ2h0KSxcclxuICAgICAgYXVkaW9TdGFydDogdW5kZWZpbmVkLCBhdWRpb0VuZDogdW5kZWZpbmVkLFxyXG4gICAgfTtcclxuICAgIHNldEJveGVzKGN1cnJlbnQgPT4ge1xyXG4gICAgICBjb25zdCBuZXh0ID0gWy4uLmN1cnJlbnQuc2xpY2UoMCwgc2VsZWN0ZWRJbmRleCArIDEpLCBjb3B5LCAuLi5jdXJyZW50LnNsaWNlKHNlbGVjdGVkSW5kZXggKyAxKV07XHJcbiAgICAgIHNldFNlbGVjdGVkSW5kZXgoc2VsZWN0ZWRJbmRleCArIDEpO1xyXG4gICAgICByZXR1cm4gbmV4dDtcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGRlbGV0ZVNlbGVjdGVkID0gKCkgPT4ge1xyXG4gICAgaWYgKGJveGVzLmxlbmd0aCA8PSAxKSByZXR1cm47XHJcbiAgICBzZXRCb3hlcyhjdXJyZW50ID0+IGN1cnJlbnQuZmlsdGVyKChfLCBpKSA9PiBpICE9PSBzZWxlY3RlZEluZGV4KSk7XHJcbiAgICBzZXRTZWxlY3RlZEluZGV4KGkgPT4gTWF0aC5tYXgoMCwgaSAtIDEpKTtcclxuICB9O1xyXG5cclxuICBjb25zdCBhcHBseUhlaWdodFRvQWxsID0gKCkgPT4ge1xyXG4gICAgaWYgKCFzZWxlY3RlZCkgcmV0dXJuO1xyXG4gICAgc2V0Qm94ZXMoY3VycmVudCA9PiBjdXJyZW50Lm1hcChib3ggPT4gKHtcclxuICAgICAgLi4uYm94LFxyXG4gICAgICBoZWlnaHQ6IHNlbGVjdGVkLmhlaWdodFxyXG4gICAgfSkpKTtcclxuICAgIHRvYXN0KHsgdGl0bGU6IFwi4pyFINiq2YUg2KrZiNit2YrYryDYp9mE2KfYsdiq2YHYp9i5XCIsIGRlc2NyaXB0aW9uOiBcItiq2YUg2KrYt9io2YrZgiDYp9mE2KfYsdiq2YHYp9i5INin2YTZhdit2K/YryDYudmE2Ykg2KzZhdmK2Lkg2KfZhNmF2LHYqNi52KfYqlwiIH0pO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGFkZE5ld0JveCA9ICgpID0+IHtcclxuICAgIGNvbnN0IGxhc3RCb3ggPSBib3hlc1tib3hlcy5sZW5ndGggLSAxXTtcclxuICAgIGNvbnN0IG5ld0JveDogQXlhaEJveCA9IHtcclxuICAgICAgc3VyYWg6IGxhc3RCb3g/LnN1cmFoID8/IDEsXHJcbiAgICAgIGF5YWg6IChsYXN0Qm94Py5heWFoID8/IDApICsgMSxcclxuICAgICAgeDogbGFzdEJveD8ueCA/PyAxNDAsXHJcbiAgICAgIHk6IGxhc3RCb3ggPyBjbGFtcChsYXN0Qm94LnkgKyBsYXN0Qm94LmhlaWdodCArIDEwLCAwLCBQQUdFX0lNQUdFX1NJWkUuaGVpZ2h0IC0gMTAwKSA6IDMwMCxcclxuICAgICAgd2lkdGg6IGxhc3RCb3g/LndpZHRoID8/IDk4MCxcclxuICAgICAgaGVpZ2h0OiBsYXN0Qm94Py5oZWlnaHQgPz8gMTAwLFxyXG4gICAgfTtcclxuICAgIHNldEJveGVzKGN1cnJlbnQgPT4gWy4uLmN1cnJlbnQsIG5ld0JveF0pO1xyXG4gICAgc2V0U2VsZWN0ZWRJbmRleChib3hlcy5sZW5ndGgpO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGRyYWdTdGFydCA9IChpbmRleDogbnVtYmVyLCBlOiBSZWFjdC5Qb2ludGVyRXZlbnQ8SFRNTEJ1dHRvbkVsZW1lbnQ+KSA9PiB7XHJcbiAgICBlLmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmUoZS5wb2ludGVySWQpO1xyXG4gICAgc2V0U2VsZWN0ZWRJbmRleChpbmRleCk7XHJcbiAgICBjb25zdCBjYW52YXNSZWN0ID0gY2FudmFzUmVmLmN1cnJlbnQ/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgaWYgKCFjYW52YXNSZWN0KSByZXR1cm47XHJcbiAgICBjb25zdCBzdGFydFggPSBlLmNsaWVudFg7XHJcbiAgICBjb25zdCBzdGFydFkgPSBlLmNsaWVudFk7XHJcbiAgICBjb25zdCBzdGFydEJveCA9IGJveGVzW2luZGV4XTtcclxuICAgIGNvbnN0IG9uTW92ZSA9IChldmVudDogUG9pbnRlckV2ZW50KSA9PiB7XHJcbiAgICAgIGNvbnN0IHJhdGlvWCA9IFBBR0VfSU1BR0VfU0laRS53aWR0aCAvIGNhbnZhc1JlY3Qud2lkdGg7XHJcbiAgICAgIGNvbnN0IHJhdGlvWSA9IFBBR0VfSU1BR0VfU0laRS5oZWlnaHQgLyBjYW52YXNSZWN0LmhlaWdodDtcclxuICAgICAgc2V0Qm94ZXMoY3VycmVudCA9PiBjdXJyZW50Lm1hcCgoYm94LCBpKSA9PiBpID09PSBpbmRleCA/IHtcclxuICAgICAgICAuLi5ib3gsXHJcbiAgICAgICAgeDogY2xhbXAoc3RhcnRCb3gueCArIChldmVudC5jbGllbnRYIC0gc3RhcnRYKSAqIHJhdGlvWCwgMCwgUEFHRV9JTUFHRV9TSVpFLndpZHRoIC0gc3RhcnRCb3gud2lkdGgpLFxyXG4gICAgICAgIHk6IGNsYW1wKHN0YXJ0Qm94LnkgKyAoZXZlbnQuY2xpZW50WSAtIHN0YXJ0WSkgKiByYXRpb1ksIDAsIFBBR0VfSU1BR0VfU0laRS5oZWlnaHQgLSBzdGFydEJveC5oZWlnaHQpLFxyXG4gICAgICB9IDogYm94KSk7XHJcbiAgICB9O1xyXG4gICAgY29uc3Qgb25VcCA9ICgpID0+IHtcclxuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCBvbk1vdmUpO1xyXG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCBvblVwKTtcclxuICAgIH07XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIG9uTW92ZSk7XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCBvblVwLCB7IG9uY2U6IHRydWUgfSk7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgZW5zdXJlQXVkaW9Mb2FkZWQgPSAoc3VyYWg6IG51bWJlciwgdGhlbj86ICgpID0+IHZvaWQpID0+IHtcclxuICAgIGNvbnN0IGEgPSBhdWRpb1JlZi5jdXJyZW50OyBpZiAoIWEpIHJldHVybjtcclxuICAgIGNvbnN0IHRhcmdldFNyYyA9IGF1ZGlvUGF0aChzdXJhaCk7XHJcbiAgICBjb25zdCBleHBlY3RlZEZpbGUgPSB0YXJnZXRTcmMuc3BsaXQoXCIvXCIpLnBvcCgpIHx8IHRhcmdldFNyYztcclxuICAgIGlmICghYS5zcmMgfHwgIWEuc3JjLmVuZHNXaXRoKGV4cGVjdGVkRmlsZSkpIHtcclxuICAgICAgYS5zcmMgPSB0YXJnZXRTcmM7IGEubG9hZCgpO1xyXG4gICAgICBhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkZWRtZXRhZGF0YVwiLCAoKSA9PiB0aGVuPy4oKSwgeyBvbmNlOiB0cnVlIH0pO1xyXG4gICAgfSBlbHNlIGlmIChhLmR1cmF0aW9uID4gMCkgeyB0aGVuPy4oKTsgfVxyXG4gICAgZWxzZSB7IGEuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsICgpID0+IHRoZW4/LigpLCB7IG9uY2U6IHRydWUgfSk7IH1cclxuICB9O1xyXG5cclxuICBjb25zdCBwbGF5U2VsZWN0ZWQgPSAoKSA9PiB7XHJcbiAgICBpZiAoIXNlbGVjdGVkKSByZXR1cm47XHJcbiAgICBjb25zdCBhID0gYXVkaW9SZWYuY3VycmVudDsgaWYgKCFhKSByZXR1cm47XHJcbiAgICBlbnN1cmVBdWRpb0xvYWRlZChzZWxlY3RlZC5zdXJhaCwgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzdGFydCA9IHNlbGVjdGVkLmF1ZGlvU3RhcnQgPz8gMDtcclxuICAgICAgY29uc3QgZW5kID0gc2VsZWN0ZWQuYXVkaW9FbmQ7XHJcbiAgICAgIHN0b3BBdFJlZi5jdXJyZW50ID0gZW5kICYmIGVuZCA+IHN0YXJ0ID8gZW5kIDogbnVsbDtcclxuICAgICAgYS5jdXJyZW50VGltZSA9IHN0YXJ0O1xyXG4gICAgICBhLnBsYXkoKS5jYXRjaCgoKSA9PiB7fSk7XHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuICBjb25zdCBzZXRTdGFydEZyb21DdXJyZW50ID0gKCkgPT4ge1xyXG4gICAgaWYgKCFzZWxlY3RlZCB8fCAhYXVkaW9SZWYuY3VycmVudCkgcmV0dXJuO1xyXG4gICAgY29uc3QgdCA9IE51bWJlcihhdWRpb1JlZi5jdXJyZW50LmN1cnJlbnRUaW1lLnRvRml4ZWQoMykpO1xyXG4gICAgdXBkYXRlU2VsZWN0ZWQoeyBhdWRpb1N0YXJ0OiB0LCBzcGVha2VyIH0pO1xyXG4gICAgdG9hc3QoeyB0aXRsZTogXCLinIUg2KjYr9in2YrYqVwiLCBkZXNjcmlwdGlvbjogYCR7Zm10VGltZSh0KX1gIH0pO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IHNldEVuZEZyb21DdXJyZW50ID0gKCkgPT4ge1xyXG4gICAgaWYgKCFzZWxlY3RlZCB8fCAhYXVkaW9SZWYuY3VycmVudCkgcmV0dXJuO1xyXG4gICAgY29uc3QgdCA9IE51bWJlcihhdWRpb1JlZi5jdXJyZW50LmN1cnJlbnRUaW1lLnRvRml4ZWQoMykpO1xyXG4gICAgLy8gU2V0IGVuZCBmb3IgY3VycmVudCBheWFoXHJcbiAgICBzZXRCb3hlcyhjdXJyZW50ID0+IGN1cnJlbnQubWFwKChib3gsIGkpID0+IHtcclxuICAgICAgaWYgKGkgPT09IHNlbGVjdGVkSW5kZXgpIHJldHVybiB7IC4uLmJveCwgYXVkaW9FbmQ6IHQsIHNwZWFrZXIgfTtcclxuICAgICAgLy8gQXV0by1jaGFpbjogc2V0IHN0YXJ0IGZvciBuZXh0IGF5YWggb2Ygc2FtZSBzdXJhaFxyXG4gICAgICBpZiAoaSA9PT0gc2VsZWN0ZWRJbmRleCArIDEgJiYgYm94LnN1cmFoID09PSBzZWxlY3RlZC5zdXJhaCkge1xyXG4gICAgICAgIHJldHVybiB7IC4uLmJveCwgYXVkaW9TdGFydDogdCwgc3BlYWtlciB9O1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBib3g7XHJcbiAgICB9KSk7XHJcbiAgICAvLyBBdXRvLWFkdmFuY2UgdG8gbmV4dCBheWFoXHJcbiAgICBpZiAoc2VsZWN0ZWRJbmRleCA8IGJveGVzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgc2V0U2VsZWN0ZWRJbmRleChzZWxlY3RlZEluZGV4ICsgMSk7XHJcbiAgICAgIHRvYXN0KHsgdGl0bGU6IFwi8J+UlyDZhtmH2KfZitipICsg2LHYqNi3XCIsIGRlc2NyaXB0aW9uOiBgJHtmbXRUaW1lKHQpfSDihpIg2KfZhNii2YrYqSDYp9mE2KrYp9mE2YrYqWAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0b2FzdCh7IHRpdGxlOiBcIuKchSDZhtmH2KfZitipXCIsIGRlc2NyaXB0aW9uOiBgJHtmbXRUaW1lKHQpfWAgfSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgY2xlYXJCaW5kaW5nID0gKCkgPT4ge1xyXG4gICAgaWYgKCFzZWxlY3RlZCkgcmV0dXJuO1xyXG4gICAgdXBkYXRlU2VsZWN0ZWQoeyBhdWRpb1N0YXJ0OiB1bmRlZmluZWQsIGF1ZGlvRW5kOiB1bmRlZmluZWQgfSk7XHJcbiAgfTtcclxuXHJcbiAgLy8g2YXYrdin2LDYp9ipINis2YXZiti5INin2YTZhdix2KjYudin2Kog2YHZiiDZhtmB2LMg2KfZhNiz2LfYsSAo2YbZgdizIFkg2YjZhtmB2LMg2KfZhNin2LHYqtmB2KfYuSlcclxuICBjb25zdCBzbmFwVG9Sb3dzID0gKCkgPT4ge1xyXG4gICAgaWYgKGJveGVzLmxlbmd0aCA8PSAxKSByZXR1cm47XHJcbiAgICBjb25zdCByb3dUaHJlc2hvbGQgPSAzMDsgLy8g2KXYsNinINin2YTZgdix2YIg2KPZgtmEINmF2YYgMzBweCDZitmP2LnYqtio2LEg2YbZgdizINin2YTYs9i32LFcclxuICAgIHNldEJveGVzKGN1cnJlbnQgPT4ge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBbLi4uY3VycmVudF07XHJcbiAgICAgIGNvbnN0IGFzc2lnbmVkID0gbmV3IFNldDxudW1iZXI+KCk7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVzdWx0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGFzc2lnbmVkLmhhcyhpKSkgY29udGludWU7XHJcbiAgICAgICAgLy8g2KfYrNmF2Lkg2YPZhCDYp9mE2YXYsdio2LnYp9iqINi52YTZiSDZhtmB2LMg2KfZhNiz2LfYsSDYqtmC2LHZitio2KfZi1xyXG4gICAgICAgIGNvbnN0IHJvd0JveGVzID0gW2ldO1xyXG4gICAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IHJlc3VsdC5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgaWYgKCFhc3NpZ25lZC5oYXMoaikgJiYgTWF0aC5hYnMocmVzdWx0W2pdLnkgLSByZXN1bHRbaV0ueSkgPCByb3dUaHJlc2hvbGQpIHtcclxuICAgICAgICAgICAgcm93Qm94ZXMucHVzaChqKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJvd0JveGVzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgIC8vINmI2K3ZkdivIFkg2YjYp9mE2KfYsdiq2YHYp9i5INmE2YTZhdis2YXZiNi52KlcclxuICAgICAgICAgIGNvbnN0IGF2Z1kgPSBNYXRoLnJvdW5kKHJvd0JveGVzLnJlZHVjZSgocywgaWR4KSA9PiBzICsgcmVzdWx0W2lkeF0ueSwgMCkgLyByb3dCb3hlcy5sZW5ndGgpO1xyXG4gICAgICAgICAgY29uc3QgbWF4SCA9IE1hdGgubWF4KC4uLnJvd0JveGVzLm1hcChpZHggPT4gcmVzdWx0W2lkeF0uaGVpZ2h0KSk7XHJcbiAgICAgICAgICByb3dCb3hlcy5mb3JFYWNoKGlkeCA9PiB7XHJcbiAgICAgICAgICAgIHJlc3VsdFtpZHhdID0geyAuLi5yZXN1bHRbaWR4XSwgeTogYXZnWSwgaGVpZ2h0OiBtYXhIIH07XHJcbiAgICAgICAgICAgIGFzc2lnbmVkLmFkZChpZHgpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9KTtcclxuICAgIHRvYXN0KHsgdGl0bGU6IFwi4pyFINiq2YUg2KfZhNmF2K3Yp9iw2KfYqVwiLCBkZXNjcmlwdGlvbjogXCLYqtmFINiq2YjYrdmK2K8g2LPYt9mI2LEg2KfZhNmF2LHYqNi52KfYqlwiIH0pO1xyXG4gIH07XHJcblxyXG4gIC8vIOKUgOKUgCDYqti12K/ZitixINmD2YQg2KfZhNi52YXZhCDZg9mF2YTZgSBKU09OIOKUgOKUgFxyXG4gIGNvbnN0IGV4cG9ydEFsbCA9ICgpID0+IHtcclxuICAgIGNvbnN0IGRhdGEgPSB7XHJcbiAgICAgIHZlcnNpb246IDEsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBjb29yZGluYXRlczogZ2V0U2F2ZWRBeWFoQ29vcmRpbmF0ZXMoKSxcclxuICAgICAgdGltaW5nczogZ2V0U2F2ZWRUaW1pbmdzKCksXHJcbiAgICB9O1xyXG4gICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKV0sIHsgdHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSk7XHJcbiAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG4gICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xyXG4gICAgYS5ocmVmID0gdXJsO1xyXG4gICAgYS5kb3dubG9hZCA9IGBtdXNoYWYtY2FsaWJyYXRpb24tJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApfS5qc29uYDtcclxuICAgIGEuY2xpY2soKTtcclxuICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcclxuICAgIHRvYXN0KHsgdGl0bGU6IFwi8J+TpSDYqtmFINin2YTYqti12K/ZitixXCIsIGRlc2NyaXB0aW9uOiBcItiq2YUg2K3Zgdi4INin2YTZhdmE2YFcIiB9KTtcclxuICB9O1xyXG5cclxuICAvLyDilIDilIAg2KfYs9iq2YrYsdin2K8g2YXZhiDZhdmE2YEgSlNPTiDilIDilIBcclxuICBjb25zdCBpbXBvcnRBbGwgPSAoKSA9PiB7XHJcbiAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuICAgIGlucHV0LnR5cGUgPSBcImZpbGVcIjtcclxuICAgIGlucHV0LmFjY2VwdCA9IFwiLmpzb25cIjtcclxuICAgIGlucHV0Lm9uY2hhbmdlID0gKGUpID0+IHtcclxuICAgICAgY29uc3QgZmlsZSA9IChlLnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS5maWxlcz8uWzBdO1xyXG4gICAgICBpZiAoIWZpbGUpIHJldHVybjtcclxuICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgICAgcmVhZGVyLm9ubG9hZCA9IChldikgPT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShldi50YXJnZXQ/LnJlc3VsdCBhcyBzdHJpbmcpO1xyXG4gICAgICAgICAgaWYgKGRhdGEuY29vcmRpbmF0ZXMpIHtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJtdXNoYWY6YXlhaENvb3JkaW5hdGVzOnYxXCIsIEpTT04uc3RyaW5naWZ5KGRhdGEuY29vcmRpbmF0ZXMpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChkYXRhLnRpbWluZ3MpIHtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJtdXNoYWY6YXlhaFRpbWluZ3M6djFcIiwgSlNPTi5zdHJpbmdpZnkoZGF0YS50aW1pbmdzKSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyDYpdi52KfYr9ipINiq2K3ZhdmK2YQg2KfZhNi12YHYrdipINin2YTYrdin2YTZitipXHJcbiAgICAgICAgICBzZXRCb3hlcyhnZXRQYWdlQXlhaEJveGVzKHBhZ2VTcmMpKTtcclxuICAgICAgICAgIHRvYXN0KHsgdGl0bGU6IFwi4pyFINiq2YUg2KfZhNin2LPYqtmK2LHYp9ivXCIsIGRlc2NyaXB0aW9uOiBcItiq2YUg2KrYrdmF2YrZhCDYp9mE2KjZitin2YbYp9iqINio2YbYrNin2K1cIiB9KTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgIHRvYXN0KHsgdGl0bGU6IFwi4p2MINiu2LfYo1wiLCBkZXNjcmlwdGlvbjogXCLYp9mE2YXZhNmBINi62YrYsSDYtdin2YTYrVwiIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XHJcbiAgICB9O1xyXG4gICAgaW5wdXQuY2xpY2soKTtcclxuICB9O1xyXG5cclxuICAvLyDilIDilIAg2LHYqNi3INiw2YPZijog2KLZitipIE4gPSDZhdi52YTZhSArINii2YrYqSBOKzEgPSDYt9mB2YQgKNiq2YTZgtin2KbZitin2YspIOKUgOKUgFxyXG4gIGNvbnN0IHNtYXJ0QXV0b0xpbmsgPSAoKSA9PiB7XHJcbiAgICBjb25zdCBzYXZlZEFsbCA9IGdldFNhdmVkVGltaW5ncygpO1xyXG4gICAgY29uc3Qgc3VyYWhzID0gQXJyYXkuZnJvbShuZXcgU2V0KGJveGVzLm1hcChiID0+IGIuc3VyYWgpKSk7XHJcblxyXG4gICAgbGV0IGxpbmtlZCA9IDA7XHJcbiAgICBzZXRCb3hlcyhjdXJyZW50ID0+IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gWy4uLmN1cnJlbnRdO1xyXG4gICAgICBjb25zdCBuZXdCb3hlczogQXlhaEJveFtdID0gW107XHJcblxyXG4gICAgICBzdXJhaHMuZm9yRWFjaChzdXJhaE51bSA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2F2ZWQgPSBzYXZlZEFsbFtzdXJhaE51bV07XHJcbiAgICAgICAgaWYgKCFzYXZlZD8uc2VnbWVudHMgfHwgc2F2ZWQuc2VnbWVudHMubGVuZ3RoID09PSAwKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbnN0IHRlYWNoZXJTZWdzID0gc2F2ZWQuc2VnbWVudHMuZmlsdGVyKHMgPT4gcy5zcGVha2VyID09PSBcInRlYWNoZXJcIikuc29ydCgoYSwgYikgPT4gYS5zdGFydCAtIGIuc3RhcnQpO1xyXG4gICAgICAgIGNvbnN0IGtpZHNTZWdzID0gc2F2ZWQuc2VnbWVudHMuZmlsdGVyKHMgPT4gcy5zcGVha2VyID09PSBcImtpZHNcIikuc29ydCgoYSwgYikgPT4gYS5zdGFydCAtIGIuc3RhcnQpO1xyXG5cclxuICAgICAgICAvLyDYsdio2Lcg2YPZhCDYotmK2Kkg2KjYp9mE2KrYsdiq2YrYqFxyXG4gICAgICAgIGNvbnN0IHN1cmFoQm94ZXMgPSByZXN1bHQuZmlsdGVyKGIgPT4gYi5zdXJhaCA9PT0gc3VyYWhOdW0pO1xyXG4gICAgICAgIHN1cmFoQm94ZXMuZm9yRWFjaCgoYm94LCBpZHgpID0+IHtcclxuICAgICAgICAgIGNvbnN0IGJveElkeCA9IHJlc3VsdC5pbmRleE9mKGJveCk7XHJcbiAgICAgICAgICAvLyDYsdio2Lcg2KjZhdmC2LfYuSDYp9mE2YXYudmE2YVcclxuICAgICAgICAgIGlmICh0ZWFjaGVyU2Vnc1tpZHhdKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdFtib3hJZHhdID0ge1xyXG4gICAgICAgICAgICAgIC4uLnJlc3VsdFtib3hJZHhdLFxyXG4gICAgICAgICAgICAgIGF1ZGlvU3RhcnQ6IHRlYWNoZXJTZWdzW2lkeF0uc3RhcnQsXHJcbiAgICAgICAgICAgICAgYXVkaW9FbmQ6IHRlYWNoZXJTZWdzW2lkeF0uZW5kLFxyXG4gICAgICAgICAgICAgIHNwZWFrZXI6IFwidGVhY2hlclwiLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBsaW5rZWQrKztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyDYpdmG2LTYp9ihINmF2LHYqNi5INi32YHZhCDYqtmE2YLYp9im2Yog2KXYsNinINmK2YjYrNivINmF2YLYt9i5INi32YHZhFxyXG4gICAgICAgICAgaWYgKGtpZHNTZWdzW2lkeF0pIHtcclxuICAgICAgICAgICAgLy8g2KrYrdmC2YIg2KXYsNinINmE2Kcg2YrZiNis2K8g2KjYp9mE2YHYudmEINmF2LHYqNi5INi32YHZhCDZhNmH2LDZhyDYp9mE2KLZitipXHJcbiAgICAgICAgICAgIGNvbnN0IGhhc0tpZHNCb3ggPSByZXN1bHQuc29tZShiID0+IGIuc3VyYWggPT09IHN1cmFoTnVtICYmIGIuYXlhaCA9PT0gYm94LmF5YWggJiYgYi5zcGVha2VyID09PSBcImtpZHNcIik7XHJcbiAgICAgICAgICAgIGlmICghaGFzS2lkc0JveCkge1xyXG4gICAgICAgICAgICAgIG5ld0JveGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgc3VyYWg6IHN1cmFoTnVtLFxyXG4gICAgICAgICAgICAgICAgYXlhaDogYm94LmF5YWgsXHJcbiAgICAgICAgICAgICAgICB4OiBib3gueCxcclxuICAgICAgICAgICAgICAgIHk6IGJveC55LFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6IGJveC53aWR0aCxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogYm94LmhlaWdodCxcclxuICAgICAgICAgICAgICAgIGF1ZGlvU3RhcnQ6IGtpZHNTZWdzW2lkeF0uc3RhcnQsXHJcbiAgICAgICAgICAgICAgICBhdWRpb0VuZDoga2lkc1NlZ3NbaWR4XS5lbmQsXHJcbiAgICAgICAgICAgICAgICBzcGVha2VyOiBcImtpZHNcIixcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICBsaW5rZWQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiBbLi4ucmVzdWx0LCAuLi5uZXdCb3hlc107XHJcbiAgICB9KTtcclxuXHJcbiAgICB0b2FzdCh7IHRpdGxlOiBcIvCfp6Ag2LHYqNi3INiw2YPZilwiLCBkZXNjcmlwdGlvbjogYNiq2YUg2LHYqNi3ICR7bGlua2VkfSDZhdmC2LfYuSAo2YXYudmE2YUgKyDYt9mB2YQpYCB9KTtcclxuICB9O1xyXG5cclxuICBjb25zdCBhdXRvTGlua0Zyb21UaW1pbmdzID0gKCkgPT4ge1xyXG4gICAgY29uc3Qgc2F2ZWRBbGwgPSBnZXRTYXZlZFRpbWluZ3MoKTtcclxuICAgIGNvbnN0IHN1cmFocyA9IEFycmF5LmZyb20obmV3IFNldChib3hlcy5tYXAoYiA9PiBiLnN1cmFoKSkpO1xyXG5cclxuICAgIC8vIENvbGxlY3Qgc2VnbWVudHMgYW5kIHRlYWNoZXIgdGltaW5ncyBmb3IgZWFjaCBzdXJhaFxyXG4gICAgY29uc3Qgc3VyYWhTZWdtZW50czogUmVjb3JkPG51bWJlciwgQXVkaW9TZWdtZW50W10+ID0ge307XHJcbiAgICBjb25zdCBzdXJhaFRlYWNoZXJUaW1lczogUmVjb3JkPG51bWJlciwgbnVtYmVyW10+ID0ge307XHJcbiAgICBzdXJhaHMuZm9yRWFjaChzID0+IHtcclxuICAgICAgY29uc3Qgc2F2ZWQgPSBzYXZlZEFsbFtzXTtcclxuICAgICAgaWYgKHNhdmVkKSB7XHJcbiAgICAgICAgLy8gUHJlZmVyIHNlZ21lbnRzIGZyb20gL3JlY2l0YXRpb24tbWV0aG9kcyAodGhleSBoYXZlIHNwZWFrZXIgaW5mbylcclxuICAgICAgICBpZiAoc2F2ZWQuc2VnbWVudHMgJiYgc2F2ZWQuc2VnbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgc3VyYWhTZWdtZW50c1tzXSA9IHNhdmVkLnNlZ21lbnRzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoc2F2ZWQudGVhY2hlciAmJiBzYXZlZC50ZWFjaGVyLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIHN1cmFoVGVhY2hlclRpbWVzW3NdID0gc2F2ZWQudGVhY2hlcjtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc3QgdCA9IGdldFN1cmFoVGltaW5ncyhzKTtcclxuICAgICAgICBpZiAodCAmJiB0LnRlYWNoZXIubGVuZ3RoID4gMCkgc3VyYWhUZWFjaGVyVGltZXNbc10gPSB0LnRlYWNoZXI7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHNldEJveGVzKGN1cnJlbnQgPT4ge1xyXG4gICAgICBjb25zdCB1c2VkQ291bnRzOiBSZWNvcmQ8bnVtYmVyLCBudW1iZXI+ID0ge307XHJcbiAgICAgIHJldHVybiBjdXJyZW50Lm1hcChib3ggPT4ge1xyXG4gICAgICAgIGNvbnN0IGNvdW50ID0gdXNlZENvdW50c1tib3guc3VyYWhdIHx8IDA7XHJcbiAgICAgICAgdXNlZENvdW50c1tib3guc3VyYWhdID0gY291bnQgKyAxO1xyXG5cclxuICAgICAgICAvLyBUcnkgc2VnbWVudHMgZmlyc3QgKG1vc3QgYWNjdXJhdGUsIGhhcyBzcGVha2VyIGluZm8pXHJcbiAgICAgICAgY29uc3Qgc2VncyA9IHN1cmFoU2VnbWVudHNbYm94LnN1cmFoXTtcclxuICAgICAgICBpZiAoc2Vncykge1xyXG4gICAgICAgICAgLy8gRmluZCBzZWdtZW50cyBtYXRjaGluZyB0aGlzIGF5YWggaW5kZXggZm9yIHRlYWNoZXJcclxuICAgICAgICAgIGNvbnN0IHRlYWNoZXJTZWdzID0gc2Vncy5maWx0ZXIocyA9PiBzLnNwZWFrZXIgPT09IFwidGVhY2hlclwiKTtcclxuICAgICAgICAgIGNvbnN0IGtpZHNTZWdzID0gc2Vncy5maWx0ZXIocyA9PiBzLnNwZWFrZXIgPT09IFwia2lkc1wiKTtcclxuICAgICAgICAgIGNvbnN0IHNlZyA9IHRlYWNoZXJTZWdzW2NvdW50XSB8fCBzZWdzW2NvdW50XTtcclxuICAgICAgICAgIGlmIChzZWcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAuLi5ib3gsXHJcbiAgICAgICAgICAgICAgYXVkaW9TdGFydDogc2VnLnN0YXJ0LFxyXG4gICAgICAgICAgICAgIGF1ZGlvRW5kOiBzZWcuZW5kLFxyXG4gICAgICAgICAgICAgIHNwZWFrZXI6IHNlZy5zcGVha2VyLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gdGVhY2hlciB0aW1pbmdzIGFycmF5XHJcbiAgICAgICAgY29uc3QgdGltZXMgPSBzdXJhaFRlYWNoZXJUaW1lc1tib3guc3VyYWhdO1xyXG4gICAgICAgIGlmICh0aW1lcyAmJiB0aW1lc1tjb3VudF0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgLi4uYm94LFxyXG4gICAgICAgICAgICBhdWRpb1N0YXJ0OiB0aW1lc1tjb3VudF0sXHJcbiAgICAgICAgICAgIGF1ZGlvRW5kOiB0aW1lc1tjb3VudCArIDFdID8/ICh0aW1lc1tjb3VudF0gKyAzKSxcclxuICAgICAgICAgICAgc3BlYWtlcjogXCJ0ZWFjaGVyXCIsXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGJveDtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICAgIHRvYXN0KHsgdGl0bGU6IFwi4pyFINiq2YUg2KfZhNix2KjYtyDYp9mE2KrZhNmC2KfYptmKXCIsIGRlc2NyaXB0aW9uOiBcItiq2YUg2LHYqNi3INin2YTZhdmC2KfYt9i5INin2YTZhdit2YHZiNi42Kkg2YXZhiDYtdmB2K3YqSDYp9mE2KrZgtiz2YrZhSDYp9mE2LDZg9mKXCIgfSk7XHJcbiAgfTtcclxuXHJcbiAgdXNlRWZmZWN0KCgpID0+IHtcclxuICAgIGlmIChzZWxlY3RlZCkgZW5zdXJlQXVkaW9Mb2FkZWQoc2VsZWN0ZWQuc3VyYWgpO1xyXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlYWN0LWhvb2tzL2V4aGF1c3RpdmUtZGVwc1xyXG4gIH0sIFtzZWxlY3RlZD8uc3VyYWhdKTtcclxuXHJcbiAgdXNlRWZmZWN0KCgpID0+IHsgc3RvcEF1ZGlvKCk7IC8qIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHMgKi8gfSwgW3BhZ2VTcmNdKTtcclxuXHJcbiAgY29uc3Qgb25UaW1lVXBkYXRlID0gKCkgPT4ge1xyXG4gICAgY29uc3QgYSA9IGF1ZGlvUmVmLmN1cnJlbnQ7IGlmICghYSkgcmV0dXJuO1xyXG4gICAgc2V0Q3VycmVudFRpbWUoYS5jdXJyZW50VGltZSk7XHJcbiAgICBpZiAoc3RvcEF0UmVmLmN1cnJlbnQgIT09IG51bGwgJiYgYS5jdXJyZW50VGltZSA+PSBzdG9wQXRSZWYuY3VycmVudCAtIDAuMDIpIHtcclxuICAgICAgYS5wYXVzZSgpOyBzdG9wQXRSZWYuY3VycmVudCA9IG51bGw7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgY29uc3Qgc2F2ZUFsbCA9IHVzZUNhbGxiYWNrKChzaWxlbnQgPSBmYWxzZSkgPT4ge1xyXG4gICAgLy8gU2F2ZSBvbmx5IGNhbGlicmF0aW9uIGJveCBkYXRhIOKAlCBuZXZlciB0b3VjaCBzcGxpdCBkYXRhXHJcbiAgICBzYXZlUGFnZUF5YWhCb3hlcyhwYWdlU3JjLCBib3hlcyk7XHJcblxyXG4gICAgaWYgKCFzaWxlbnQpIHtcclxuICAgICAgc2V0SXNTYXZpbmcodHJ1ZSk7XHJcbiAgICAgIGNvbnN0IGJvdW5kID0gYm94ZXMuZmlsdGVyKGIgPT4gYi5hdWRpb1N0YXJ0ICE9PSB1bmRlZmluZWQgJiYgYi5hdWRpb0VuZCAhPT0gdW5kZWZpbmVkKS5sZW5ndGg7XHJcbiAgICAgIHRvYXN0KHsgdGl0bGU6IFwi4pyFINiq2YUg2KfZhNit2YHYuFwiLCBkZXNjcmlwdGlvbjogYCR7Ym94ZXMubGVuZ3RofSDZhdix2KjYudiMICR7Ym91bmR9INmF2LHYqNmI2LdgIH0pO1xyXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHNldElzU2F2aW5nKGZhbHNlKSwgMTIwMCk7XHJcbiAgICB9XHJcbiAgfSwgW2JveGVzLCBwYWdlU3JjXSk7XHJcblxyXG4gIC8vIFRyYWNrIGxhdGVzdCBzdGF0ZSBmb3Igc3luY2hyb25vdXMgc2F2ZSBvbiB1bm1vdW50IChITVIpXHJcbiAgY29uc3Qgc3RhdGVSZWYgPSB1c2VSZWYoeyBwYWdlU3JjLCBib3hlcyB9KTtcclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgc3RhdGVSZWYuY3VycmVudCA9IHsgcGFnZVNyYywgYm94ZXMgfTtcclxuICB9LCBbcGFnZVNyYywgYm94ZXNdKTtcclxuXHJcbiAgdXNlRWZmZWN0KCgpID0+IHtcclxuICAgIC8vIEVuc3VyZSB3ZSBzYXZlIHJpZ2h0IGJlZm9yZSBjb21wb25lbnQgdW5tb3VudHMgKGUuZy4sIGR1cmluZyBjb2RlIGVkaXQgLyBITVIpXHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICBzYXZlUGFnZUF5YWhCb3hlcyhzdGF0ZVJlZi5jdXJyZW50LnBhZ2VTcmMsIHN0YXRlUmVmLmN1cnJlbnQuYm94ZXMpO1xyXG4gICAgfTtcclxuICB9LCBbXSk7XHJcblxyXG4gIC8vIEF1dG8tc2F2ZSBldmVyeSAyIHNlY29uZHNcclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHNhdmVBbGwodHJ1ZSksIDIwMDApO1xyXG4gICAgcmV0dXJuICgpID0+IGNsZWFyVGltZW91dCh0aW1lcik7XHJcbiAgfSwgW2JveGVzLCBwYWdlU3JjLCBzYXZlQWxsXSk7XHJcblxyXG4gIC8vIOKUgOKUgCBLZXlib2FyZCBzaG9ydGN1dHMgZm9yIGRlc2t0b3Ag4pSA4pSAXHJcbiAgY29uc3QgW3Nob3dIZWxwLCBzZXRTaG93SGVscF0gPSB1c2VTdGF0ZShmYWxzZSk7XHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICBjb25zdCBoYW5kbGVyID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuICAgICAgY29uc3QgdGFnID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KT8udGFnTmFtZT8udG9Mb3dlckNhc2UoKTtcclxuICAgICAgLy8gRG9uJ3QgY2FwdHVyZSB3aGVuIHR5cGluZyBpbiBpbnB1dC9zZWxlY3RcclxuICAgICAgaWYgKHRhZyA9PT0gXCJpbnB1dFwiIHx8IHRhZyA9PT0gXCJ0ZXh0YXJlYVwiIHx8IHRhZyA9PT0gXCJzZWxlY3RcIikgcmV0dXJuO1xyXG5cclxuICAgICAgY29uc3QgcyA9IHN0ZXA7XHJcblxyXG4gICAgICBzd2l0Y2ggKGUua2V5KSB7XHJcbiAgICAgICAgLy8g4pSA4pSAIE1vdmUg4pSA4pSAXHJcbiAgICAgICAgY2FzZSBcIkFycm93VXBcIjpcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIGlmIChlLnNoaWZ0S2V5KSByZXNpemUoMCwgLXMpOyBlbHNlIG1vdmUoMCwgLXMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIkFycm93RG93blwiOlxyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgaWYgKGUuc2hpZnRLZXkpIHJlc2l6ZSgwLCBzKTsgZWxzZSBtb3ZlKDAsIHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIkFycm93UmlnaHRcIjpcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIGlmIChlLnNoaWZ0S2V5KSByZXNpemUocywgMCk7IGVsc2UgbW92ZShzLCAwKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJBcnJvd0xlZnRcIjpcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIGlmIChlLnNoaWZ0S2V5KSByZXNpemUoLXMsIDApOyBlbHNlIG1vdmUoLXMsIDApO1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgCBOYXZpZ2F0ZSBheWFocyDilIDilIBcclxuICAgICAgICBjYXNlIFwiVGFiXCI6XHJcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICBpZiAoZS5zaGlmdEtleSkge1xyXG4gICAgICAgICAgICBzZXRTZWxlY3RlZEluZGV4KGkgPT4gTWF0aC5tYXgoMCwgaSAtIDEpKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFNlbGVjdGVkSW5kZXgoaSA9PiBNYXRoLm1pbihib3hlcy5sZW5ndGggLSAxLCBpICsgMSkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgc3RvcEF1ZGlvKCk7XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgLy8g4pSA4pSAIFBsYXkvUGF1c2Ug4pSA4pSAXHJcbiAgICAgICAgY2FzZSBcIiBcIjpcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIGlmIChpc1BsYXlpbmcpIHN0b3BBdWRpbygpOyBlbHNlIHBsYXlTZWxlY3RlZCgpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgCBTYXZlIOKUgOKUgFxyXG4gICAgICAgIGNhc2UgXCJzXCI6XHJcbiAgICAgICAgY2FzZSBcIlNcIjpcclxuICAgICAgICAgIGlmIChlLmN0cmxLZXkgfHwgZS5tZXRhS2V5KSB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgc2F2ZUFsbChmYWxzZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgLy8g4pSA4pSAIFNldCBzdGFydC9lbmQg4pSA4pSAXHJcbiAgICAgICAgY2FzZSBcIltcIjpcclxuICAgICAgICBjYXNlIFwie1wiOlxyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgc2V0U3RhcnRGcm9tQ3VycmVudCgpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIl1cIjpcclxuICAgICAgICBjYXNlIFwifVwiOlxyXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgc2V0RW5kRnJvbUN1cnJlbnQoKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAvLyDilIDilIAgRGVsZXRlIOKUgOKUgFxyXG4gICAgICAgIGNhc2UgXCJEZWxldGVcIjpcclxuICAgICAgICBjYXNlIFwiQmFja3NwYWNlXCI6XHJcbiAgICAgICAgICBpZiAoIWUuY3RybEtleSAmJiAhZS5tZXRhS2V5KSB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgZGVsZXRlU2VsZWN0ZWQoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAvLyDilIDilIAgRHVwbGljYXRlIOKUgOKUgFxyXG4gICAgICAgIGNhc2UgXCJkXCI6XHJcbiAgICAgICAgY2FzZSBcIkRcIjpcclxuICAgICAgICAgIGlmICghZS5jdHJsS2V5ICYmICFlLm1ldGFLZXkpIHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBkdXBsaWNhdGVTZWxlY3RlZCgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIC8vIOKUgOKUgCBab29tIOKUgOKUgFxyXG4gICAgICAgIGNhc2UgXCIrXCI6XHJcbiAgICAgICAgY2FzZSBcIj1cIjpcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIHNldFNjYWxlKHNjID0+IGNsYW1wKHNjICsgMC4xLCAwLjI1LCAxLjQpKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCItXCI6XHJcbiAgICAgICAgY2FzZSBcIl9cIjpcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIHNldFNjYWxlKHNjID0+IGNsYW1wKHNjIC0gMC4xLCAwLjI1LCAxLjQpKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAvLyDilIDilIAgQXV0by1saW5rIOKUgOKUgFxyXG4gICAgICAgIGNhc2UgXCJhXCI6XHJcbiAgICAgICAgY2FzZSBcIkFcIjpcclxuICAgICAgICAgIGlmICghZS5jdHJsS2V5ICYmICFlLm1ldGFLZXkpIHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBhdXRvTGlua0Zyb21UaW1pbmdzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgLy8g4pSA4pSAIFNwZWFrZXIgdG9nZ2xlIOKUgOKUgFxyXG4gICAgICAgIGNhc2UgXCJ0XCI6XHJcbiAgICAgICAgY2FzZSBcIlRcIjpcclxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgIHNldFNwZWFrZXIoc3AgPT4gc3AgPT09IFwidGVhY2hlclwiID8gXCJraWRzXCIgOiBcInRlYWNoZXJcIik7XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgLy8g4pSA4pSAIEhlbHAg4pSA4pSAXHJcbiAgICAgICAgY2FzZSBcIj9cIjpcclxuICAgICAgICBjYXNlIFwiaFwiOlxyXG4gICAgICAgIGNhc2UgXCJIXCI6XHJcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICBzZXRTaG93SGVscCh2ID0+ICF2KTtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAvLyDilIDilIAgRXNjYXBlIOKUgOKUgFxyXG4gICAgICAgIGNhc2UgXCJFc2NhcGVcIjpcclxuICAgICAgICAgIGlmIChzaG93SGVscCkgc2V0U2hvd0hlbHAoZmFsc2UpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGhhbmRsZXIpO1xyXG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBoYW5kbGVyKTtcclxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSByZWFjdC1ob29rcy9leGhhdXN0aXZlLWRlcHNcclxuICB9LCBbYm94ZXMubGVuZ3RoLCBpc1BsYXlpbmcsIHNob3dIZWxwLCBzZWxlY3RlZEluZGV4XSk7XHJcblxyXG4gIGNvbnN0IGhhc0JpbmRpbmcgPSBzZWxlY3RlZD8uYXVkaW9TdGFydCAhPT0gdW5kZWZpbmVkICYmIHNlbGVjdGVkPy5hdWRpb0VuZCAhPT0gdW5kZWZpbmVkO1xyXG4gIGNvbnN0IGJvdW5kQ291bnQgPSBib3hlcy5maWx0ZXIoYiA9PiBiLmF1ZGlvU3RhcnQgIT09IHVuZGVmaW5lZCAmJiBiLmF1ZGlvRW5kICE9PSB1bmRlZmluZWQpLmxlbmd0aDtcclxuXHJcbiAgcmV0dXJuIChcclxuICAgIDxtYWluIGNsYXNzTmFtZT1cIm1pbi1oLXNjcmVlbiBiZy1ncmFkaWVudC10by1iIGZyb20tc2xhdGUtOTAwIHZpYS1zbGF0ZS04MDAgdG8tc2xhdGUtOTAwIHRleHQtd2hpdGUgcC0zXCIgZGlyPVwicnRsXCI+XHJcbiAgICAgIDxhdWRpb1xyXG4gICAgICAgIHJlZj17YXVkaW9SZWZ9XHJcbiAgICAgICAgY3Jvc3NPcmlnaW49XCJhbm9ueW1vdXNcIlxyXG4gICAgICAgIG9uUGxheT17KCkgPT4gc2V0SXNQbGF5aW5nKHRydWUpfVxyXG4gICAgICAgIG9uUGF1c2U9eygpID0+IHNldElzUGxheWluZyhmYWxzZSl9XHJcbiAgICAgICAgb25UaW1lVXBkYXRlPXtvblRpbWVVcGRhdGV9XHJcbiAgICAgICAgb25Mb2FkZWRNZXRhZGF0YT17KCkgPT4geyBjb25zdCBhID0gYXVkaW9SZWYuY3VycmVudDsgaWYgKGEpIHNldER1cmF0aW9uKGEuZHVyYXRpb24gfHwgMCk7IH19XHJcbiAgICAgICAgb25EdXJhdGlvbkNoYW5nZT17KCkgPT4geyBjb25zdCBhID0gYXVkaW9SZWYuY3VycmVudDsgaWYgKGEpIHNldER1cmF0aW9uKGEuZHVyYXRpb24gfHwgMCk7IH19XHJcbiAgICAgIC8+XHJcblxyXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctNXhsIHNwYWNlLXktM1wiPlxyXG4gICAgICAgIHsvKiBIZWFkZXIgKi99XHJcbiAgICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIgcm91bmRlZC0yeGwgYmctc2xhdGUtODAwLzgwIGJhY2tkcm9wLWJsdXIgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcC0zXCI+XHJcbiAgICAgICAgICA8TGlua1xyXG4gICAgICAgICAgICB0bz1cIi9cIlxyXG4gICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzYXZlUGFnZUF5YWhCb3hlcyhwYWdlU3JjLCBib3hlcyl9XHJcbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaC0xMCB3LTEwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgYmctc2xhdGUtNzAwIGhvdmVyOmJnLXNsYXRlLTYwMCB0cmFuc2l0aW9uLWNvbG9yc1wiXHJcbiAgICAgICAgICA+XHJcbiAgICAgICAgICAgIDxBcnJvd1JpZ2h0IGNsYXNzTmFtZT1cImgtNSB3LTVcIiAvPlxyXG4gICAgICAgICAgPC9MaW5rPlxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTEgdGV4dC1jZW50ZXJcIj5cclxuICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cImZvbnQtYW1pcmkgdGV4dC14bCBmb250LWJvbGQgYmctZ3JhZGllbnQtdG8tciBmcm9tLWFtYmVyLTMwMCB0by1lbWVyYWxkLTMwMCBiZy1jbGlwLXRleHQgdGV4dC10cmFuc3BhcmVudFwiPlxyXG4gICAgICAgICAgICAgINi22KjYtyDYqti42YTZitmEINin2YTYotmK2KfYqlxyXG4gICAgICAgICAgICA8L2gxPlxyXG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtNDAwXCI+XHJcbiAgICAgICAgICAgICAge2JvdW5kQ291bnR9L3tib3hlcy5sZW5ndGh9INii2YrYqSDZhdix2KjZiNi32Kkgwrcg2K3Zgdi4INiq2YTZgtin2KbZilxyXG4gICAgICAgICAgICA8L3A+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDxidXR0b25cclxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2F2ZUFsbChmYWxzZSl9XHJcbiAgICAgICAgICAgIGNsYXNzTmFtZT17YGZsZXggaC0xMCBpdGVtcy1jZW50ZXIgZ2FwLTEgcm91bmRlZC1mdWxsIHB4LTQgZm9udC1ib2xkIHRleHQtc20gc2hhZG93LWxnIGFjdGl2ZTpzY2FsZS05NSB0cmFuc2l0aW9uLWFsbCAke1xyXG4gICAgICAgICAgICAgIGlzU2F2aW5nID8gXCJiZy1lbWVyYWxkLTYwMCB0ZXh0LXdoaXRlXCIgOiBcImJnLWdyYWRpZW50LXRvLXIgZnJvbS1hbWJlci01MDAgdG8tYW1iZXItNjAwIHRleHQtYmxhY2tcIlxyXG4gICAgICAgICAgICB9YH1cclxuICAgICAgICAgID5cclxuICAgICAgICAgICAgPFNhdmUgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+IHtpc1NhdmluZyA/IFwi4pyFXCIgOiBcItit2YHYuFwifVxyXG4gICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNob3dIZWxwKHYgPT4gIXYpfVxyXG4gICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGgtMTAgdy0xMCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcm91bmRlZC1mdWxsIHRyYW5zaXRpb24tY29sb3JzICR7XHJcbiAgICAgICAgICAgICAgc2hvd0hlbHAgPyBcImJnLXZpb2xldC02MDAgdGV4dC13aGl0ZVwiIDogXCJiZy1zbGF0ZS03MDAgaG92ZXI6Ymctc2xhdGUtNjAwIHRleHQtc2xhdGUtMzAwXCJcclxuICAgICAgICAgICAgfWB9XHJcbiAgICAgICAgICAgIHRpdGxlPVwi2KfYrtiq2LXYp9ix2KfYqiDZhNmI2K3YqSDYp9mE2YXZgdin2KrZititIChIKVwiXHJcbiAgICAgICAgICA+XHJcbiAgICAgICAgICAgIDxLZXlib2FyZCBjbGFzc05hbWU9XCJoLTQgdy00XCIgLz5cclxuICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgIDwvaGVhZGVyPlxyXG5cclxuICAgICAgICB7LyogS2V5Ym9hcmQgc2hvcnRjdXRzIGhlbHAgKi99XHJcbiAgICAgICAge3Nob3dIZWxwICYmIChcclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC0yeGwgYmctdmlvbGV0LTk1MC84MCBiYWNrZHJvcC1ibHVyIGJvcmRlciBib3JkZXItdmlvbGV0LTUwMC8zMCBwLTQgYW5pbWF0ZS1mYWRlLWluXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIG1iLTNcIj5cclxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdGV4dC12aW9sZXQtMzAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XHJcbiAgICAgICAgICAgICAgICA8S2V5Ym9hcmQgY2xhc3NOYW1lPVwidy00IGgtNFwiIC8+INin2K7Yqti12KfYsdin2Kog2YTZiNit2Kkg2KfZhNmF2YHYp9iq2YrYrVxyXG4gICAgICAgICAgICAgIDwvaDM+XHJcbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRTaG93SGVscChmYWxzZSl9IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS00MDAgaG92ZXI6dGV4dC13aGl0ZVwiPkVzYyDZhNmE2KXYutmE2KfZgjwvYnV0dG9uPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIG1kOmdyaWQtY29scy0zIGdhcC0yIHRleHQteHNcIj5cclxuICAgICAgICAgICAgICB7W1xyXG4gICAgICAgICAgICAgICAgW1wi4oaQ4oaR4oaS4oaTXCIsIFwi2KrYrdix2YrZgyDYp9mE2YXYsdio2LlcIl0sXHJcbiAgICAgICAgICAgICAgICBbXCJTaGlmdCvihpDihpHihpLihpNcIiwgXCLYqti62YrZitixINin2YTYrdis2YVcIl0sXHJcbiAgICAgICAgICAgICAgICBbXCJUYWIgLyBTaGlmdCtUYWJcIiwgXCLYp9mE2KLZitipINin2YTYqtin2YTZitipL9in2YTYs9in2KjZgtipXCJdLFxyXG4gICAgICAgICAgICAgICAgW1wiU3BhY2VcIiwgXCLYqti02LrZitmEL9il2YrZgtin2YFcIl0sXHJcbiAgICAgICAgICAgICAgICBbXCJbXCIsIFwi2KrYrdiv2YrYryDYqNiv2KfZitipINin2YTYtdmI2KpcIl0sXHJcbiAgICAgICAgICAgICAgICBbXCJdXCIsIFwi2KrYrdiv2YrYryDZhtmH2KfZitipINin2YTYtdmI2KpcIl0sXHJcbiAgICAgICAgICAgICAgICBbXCJDdHJsK1NcIiwgXCLYrdmB2LhcIl0sXHJcbiAgICAgICAgICAgICAgICBbXCJEXCIsIFwi2YbYs9iuINin2YTZhdix2KjYuVwiXSxcclxuICAgICAgICAgICAgICAgIFtcIkRlbGV0ZVwiLCBcItit2LDZgSDYp9mE2YXYsdio2LlcIl0sXHJcbiAgICAgICAgICAgICAgICBbXCIrLy1cIiwgXCLYqtmD2KjZitixL9iq2LXYutmK2LFcIl0sXHJcbiAgICAgICAgICAgICAgICBbXCJUXCIsIFwi2KrYqNiv2YrZhCDZhdi52YTZhS/Yt9mB2YRcIl0sXHJcbiAgICAgICAgICAgICAgICBbXCJBXCIsIFwi2LHYqNi3INiq2YTZgtin2KbZilwiXSxcclxuICAgICAgICAgICAgICBdLm1hcCgoW2tleSwgZGVzY10pID0+IChcclxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtrZXl9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGJnLXNsYXRlLTgwMC82MCByb3VuZGVkLWxnIHAtMlwiPlxyXG4gICAgICAgICAgICAgICAgICA8a2JkIGNsYXNzTmFtZT1cInB4LTEuNSBweS0wLjUgcm91bmRlZCBiZy1zbGF0ZS03MDAgdGV4dC12aW9sZXQtMzAwIGZvbnQtbW9ubyB0ZXh0LVsxMHB4XSBmb250LWJvbGQgc2hyaW5rLTBcIj57a2V5fTwva2JkPlxyXG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTMwMFwiPntkZXNjfTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICkpfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICl9XHJcblxyXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImdyaWQgZ2FwLTMgbGc6Z3JpZC1jb2xzLVsxZnJfMzAwcHhdXCI+XHJcbiAgICAgICAgICB7LyogQ2FudmFzICovfVxyXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtaC1bODB2aF0gb3ZlcmZsb3ctYXV0byByb3VuZGVkLTJ4bCBiZy1zbGF0ZS04MDAvNjAgYmFja2Ryb3AtYmx1ciBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBwLTIgdG91Y2gtbm9uZVwiPlxyXG4gICAgICAgICAgICA8ZGl2IHJlZj17Y2FudmFzUmVmfSBjbGFzc05hbWU9XCJyZWxhdGl2ZSBteC1hdXRvIG9yaWdpbi10b3BcIiBzdHlsZT17eyB3aWR0aDogUEFHRV9JTUFHRV9TSVpFLndpZHRoICogc2NhbGUsIGhlaWdodDogUEFHRV9JTUFHRV9TSVpFLmhlaWdodCAqIHNjYWxlIH19PlxyXG4gICAgICAgICAgICAgIDxpbWcgc3JjPXtwYWdlU3JjfSBhbHQ9XCLYtdmB2K3YqSDYp9mE2YXYtdit2YFcIiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGgtZnVsbCB3LWZ1bGwgc2VsZWN0LW5vbmUgb2JqZWN0LWZpbGxcIiBkcmFnZ2FibGU9e2ZhbHNlfSAvPlxyXG4gICAgICAgICAgICAgIHtib3hlcy5tYXAoKGJveCwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpbmRleCA9PT0gc2VsZWN0ZWRJbmRleDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJvdW5kID0gYm94LmF1ZGlvU3RhcnQgIT09IHVuZGVmaW5lZCAmJiBib3guYXVkaW9FbmQgIT09IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJveFNwZWFrZXIgPSBib3guc3BlYWtlciA/PyBcInRlYWNoZXJcIjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJveENvbG9ycyA9IHNwZWFrZXJDb2xvcnNbYm94U3BlYWtlcl07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgICAgICAgICAga2V5PXtgJHtib3guc3VyYWh9LSR7Ym94LmF5YWh9LSR7aW5kZXh9YH1cclxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXsoZSkgPT4gZHJhZ1N0YXJ0KGluZGV4LCBlKX1cclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSByb3VuZGVkLW1kIGJvcmRlci0yIHRyYW5zaXRpb24tYWxsIHRvdWNoLW5vbmVcIlxyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XHJcbiAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiBib3gueCAqIHNjYWxlLCB0b3A6IGJveC55ICogc2NhbGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogYm94LndpZHRoICogc2NhbGUsIGhlaWdodDogYm94LmhlaWdodCAqIHNjYWxlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbWl4QmxlbmRNb2RlOiBcIm11bHRpcGx5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiBpc1NlbGVjdGVkID8gc3BlYWtlckNvbG9yc1tzcGVha2VyXS5maWxsIDogKGJvdW5kID8gYm94Q29sb3JzLmZpbGwgOiBcInJnYmEoMTU2LDE2MywxNzUsMC4xNSlcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICBib3JkZXJDb2xvcjogaXNTZWxlY3RlZCA/IHNwZWFrZXJDb2xvcnNbc3BlYWtlcl0uc3Ryb2tlIDogKGJvdW5kID8gYm94Q29sb3JzLnN0cm9rZSA6IFwicmdiYSgxMDcsMTE0LDEyOCwwLjQpXCIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgYm9yZGVyU3R5bGU6IGJvdW5kID8gXCJzb2xpZFwiIDogXCJkYXNoZWRcIixcclxuICAgICAgICAgICAgICAgICAgICB9fVxyXG4gICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYWJzb2x1dGUgcmlnaHQtMSB0b3AtMSByb3VuZGVkLWZ1bGwgYmctYmxhY2svNzAgcHgtMS41IHRleHQtWzEwcHhdIGZvbnQtYm9sZCB0ZXh0LXdoaXRlXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICB7Ym94LnN1cmFofTp7Ym94LmF5YWh9e2JvdW5kID8gXCIg8J+Ul1wiIDogXCJcIn1cclxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICB9KX1cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICB7LyogU2lkZWJhciAqL31cclxuICAgICAgICAgIDxhc2lkZSBjbGFzc05hbWU9XCJzcGFjZS15LTIgbWF4LWgtWzgwdmhdIG92ZXJmbG93LXktYXV0b1wiPlxyXG4gICAgICAgICAgICB7Lyog2KfZhNi12YHYrdipICsg2KfZhNii2YrYqSAqL31cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLXhsIGJnLXNsYXRlLTgwMC84MCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBwLTMgc3BhY2UteS0yXCI+XHJcbiAgICAgICAgICAgICAgPHNlbGVjdCB2YWx1ZT17cGFnZVNyY30gb25DaGFuZ2U9eyhlKSA9PiBsb2FkUGFnZShlLnRhcmdldC52YWx1ZSl9IGNsYXNzTmFtZT1cInctZnVsbCByb3VuZGVkLWxnIGJnLXNsYXRlLTcwMCBib3JkZXItc2xhdGUtNjAwIHAtMiB0ZXh0LXNtIHRleHQtd2hpdGVcIj5cclxuICAgICAgICAgICAgICAgIHtwYWdlU291cmNlcy5tYXAoc3JjID0+IDxvcHRpb24ga2V5PXtzcmN9IHZhbHVlPXtzcmN9PntzcmMucmVwbGFjZShcIi9wYWdlcy9cIiwgXCJcIil9PC9vcHRpb24+KX1cclxuICAgICAgICAgICAgICA8L3NlbGVjdD5cclxuICAgICAgICAgICAgICA8c2VsZWN0XHJcbiAgICAgICAgICAgICAgICB2YWx1ZT17c2VsZWN0ZWRJbmRleH1cclxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4geyBzZXRTZWxlY3RlZEluZGV4KE51bWJlcihlLnRhcmdldC52YWx1ZSkpOyBzdG9wQXVkaW8oKTsgfX1cclxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCByb3VuZGVkLWxnIGJnLXNsYXRlLTcwMCBib3JkZXItc2xhdGUtNjAwIHAtMiB0ZXh0LXNtIHRleHQtd2hpdGVcIlxyXG4gICAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgIHtib3hlcy5tYXAoKGJveCwgaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib3VuZCA9IGJveC5hdWRpb1N0YXJ0ICE9PSB1bmRlZmluZWQgJiYgYm94LmF1ZGlvRW5kICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiA8b3B0aW9uIGtleT17aX0gdmFsdWU9e2l9Pntib3VuZCA/IFwi8J+UlyBcIiA6IFwi4peLIFwifXtib3guc3VyYWh9Ontib3guYXlhaH08L29wdGlvbj47XHJcbiAgICAgICAgICAgICAgICB9KX1cclxuICAgICAgICAgICAgICA8L3NlbGVjdD5cclxuICAgICAgICAgICAgICB7c2VsZWN0ZWQgJiYgKFxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy00IGdhcC0xXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPXsxfSBtYXg9ezExNH0gdmFsdWU9e3NlbGVjdGVkLnN1cmFofVxyXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gdXBkYXRlU2VsZWN0ZWQoeyBzdXJhaDogcGFyc2VJbnQoZS50YXJnZXQudmFsdWUpIHx8IDEgfSl9XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC1sZyBiZy1zbGF0ZS03MDAgcC0xLjUgdGV4dC14cyB0ZXh0LXdoaXRlIHRleHQtY2VudGVyXCIgdGl0bGU9XCLYs9mI2LHYqVwiIC8+XHJcbiAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPXsxfSB2YWx1ZT17c2VsZWN0ZWQuYXlhaH1cclxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHVwZGF0ZVNlbGVjdGVkKHsgYXlhaDogcGFyc2VJbnQoZS50YXJnZXQudmFsdWUpIHx8IDEgfSl9XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicm91bmRlZC1sZyBiZy1zbGF0ZS03MDAgcC0xLjUgdGV4dC14cyB0ZXh0LXdoaXRlIHRleHQtY2VudGVyXCIgdGl0bGU9XCLYotmK2KlcIiAvPlxyXG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIGRpc2FibGVkPXtzZWxlY3RlZEluZGV4IDw9IDB9XHJcbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4geyBzZXRTZWxlY3RlZEluZGV4KGkgPT4gaSAtIDEpOyBzdG9wQXVkaW8oKTsgfX1cclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJyb3VuZGVkLWxnIGJnLXNsYXRlLTcwMCBwLTEuNSB0ZXh0LXhzIGZvbnQtYm9sZCBkaXNhYmxlZDpvcGFjaXR5LTMwXCI+4peAPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgIDxidXR0b24gZGlzYWJsZWQ9e3NlbGVjdGVkSW5kZXggPj0gYm94ZXMubGVuZ3RoIC0gMX1cclxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7IHNldFNlbGVjdGVkSW5kZXgoaSA9PiBpICsgMSk7IHN0b3BBdWRpbygpOyB9fVxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInJvdW5kZWQtbGcgYmctc2xhdGUtNzAwIHAtMS41IHRleHQteHMgZm9udC1ib2xkIGRpc2FibGVkOm9wYWNpdHktMzBcIj7ilrY8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgey8qINmF2LTYutmEINin2YTYtdmI2KogKi99XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC14bCBiZy1zbGF0ZS04MDAvODAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcC0zIHNwYWNlLXktMlwiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17aXNQbGF5aW5nID8gc3RvcEF1ZGlvIDogcGxheVNlbGVjdGVkfVxyXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LTEwIGgtMTAgcm91bmRlZC1mdWxsIGJnLWVtZXJhbGQtNjAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRleHQtd2hpdGUgYWN0aXZlOnNjYWxlLTk1IHNocmluay0wIHNoYWRvdy1sZ1wiPlxyXG4gICAgICAgICAgICAgICAgICB7aXNQbGF5aW5nID8gPFBhdXNlIGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPiA6IDxQbGF5IGNsYXNzTmFtZT1cImgtNCB3LTRcIiAvPn1cclxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4LTFcIj5cclxuICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIG1pbj17MH0gbWF4PXtkdXJhdGlvbiB8fCAwfSBzdGVwPXswLjAxfSB2YWx1ZT17Y3VycmVudFRpbWV9XHJcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiB7IGNvbnN0IGEgPSBhdWRpb1JlZi5jdXJyZW50OyBpZiAoYSkgeyBhLmN1cnJlbnRUaW1lID0gTnVtYmVyKGUudGFyZ2V0LnZhbHVlKTsgc2V0Q3VycmVudFRpbWUoTnVtYmVyKGUudGFyZ2V0LnZhbHVlKSk7IHN0b3BBdFJlZi5jdXJyZW50ID0gbnVsbDsgfSB9fVxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctZnVsbCBhY2NlbnQtZW1lcmFsZC01MDBcIiAvPlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIHRleHQtWzEwcHhdIGZvbnQtbW9ubyB0ZXh0LXNsYXRlLTUwMFwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZW1lcmFsZC00MDBcIj57Zm10VGltZShjdXJyZW50VGltZSl9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPntmbXRUaW1lKGR1cmF0aW9uKX08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgey8qINix2KjYtyDYp9mE2LXZiNiqIOKAlCDZhdi5INix2KjYtyDYqtiz2YTYs9mE2YogKi99XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC14bCBiZy1lbWVyYWxkLTk1MC80MCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtNTAwLzMwIHAtMyBzcGFjZS15LTJcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtYm9sZCB0ZXh0LWVtZXJhbGQtNDAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxyXG4gICAgICAgICAgICAgICAgPHNwYW4+8J+OryB7c2VsZWN0ZWQ/LnN1cmFofTp7c2VsZWN0ZWQ/LmF5YWh9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS01MDAgZm9udC1tb25vXCI+WyDYqNiv2KfZitipIMK3IF0g2YbZh9in2YrYqSvYsdio2Lc8L3NwYW4+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC0xLjVcIj5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17c2V0U3RhcnRGcm9tQ3VycmVudH0gY2xhc3NOYW1lPVwicm91bmRlZC1sZyBiZy1lbWVyYWxkLTYwMCBwLTIgdGV4dC13aGl0ZSB0ZXh0LXhzIGZvbnQtYm9sZCBhY3RpdmU6c2NhbGUtOTVcIj7ij7og2KjYr9in2YrYqTwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtzZXRFbmRGcm9tQ3VycmVudH0gY2xhc3NOYW1lPVwicm91bmRlZC1sZyBiZy1yb3NlLTYwMCBwLTIgdGV4dC13aGl0ZSB0ZXh0LXhzIGZvbnQtYm9sZCBhY3RpdmU6c2NhbGUtOTVcIj7ij7kg2YbZh9in2YrYqSDwn5SXPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtY2VudGVyIGZvbnQtbW9ubyBiZy1zbGF0ZS04MDAgcm91bmRlZC1sZyBwLTEuNSB0ZXh0LXNsYXRlLTMwMFwiPlxyXG4gICAgICAgICAgICAgICAge3NlbGVjdGVkPy5hdWRpb1N0YXJ0ICE9PSB1bmRlZmluZWQgPyBmbXRUaW1lKHNlbGVjdGVkLmF1ZGlvU3RhcnQpIDogXCLigJRcIn1cclxuICAgICAgICAgICAgICAgIHtcIiDihpIgXCJ9XHJcbiAgICAgICAgICAgICAgICB7c2VsZWN0ZWQ/LmF1ZGlvRW5kICE9PSB1bmRlZmluZWQgPyBmbXRUaW1lKHNlbGVjdGVkLmF1ZGlvRW5kKSA6IFwi4oCUXCJ9XHJcbiAgICAgICAgICAgICAgICB7aGFzQmluZGluZyAmJiBzZWxlY3RlZD8uYXVkaW9FbmQhID4gc2VsZWN0ZWQ/LmF1ZGlvU3RhcnQhICYmIChcclxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1lbWVyYWxkLTUwMCBmb250LWJvbGRcIj4geyhzZWxlY3RlZCEuYXVkaW9FbmQhIC0gc2VsZWN0ZWQhLmF1ZGlvU3RhcnQhKS50b0ZpeGVkKDEpfXM8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICApfVxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIHtoYXNCaW5kaW5nICYmIChcclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17Y2xlYXJCaW5kaW5nfSBjbGFzc05hbWU9XCJ3LWZ1bGwgdGV4dC1bMTBweF0gcm91bmRlZC1sZyBiZy1zbGF0ZS03MDAvNjAgcC0xIHRleHQtc2xhdGUtNDAwXCI+XHJcbiAgICAgICAgICAgICAgICAgIOKclSDYpdmE2LrYp9ihINin2YTYsdio2LdcclxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgey8qINij2K/ZiNin2Kog2LPYsdmK2LnYqSAqL31cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0zIGdhcC0xLjVcIj5cclxuICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e3NtYXJ0QXV0b0xpbmt9XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwLTIgcm91bmRlZC1sZyBiZy1ncmFkaWVudC10by1yIGZyb20tZnVjaHNpYS02MDAvMjAgdG8tdmlvbGV0LTYwMC8yMCBib3JkZXIgYm9yZGVyLWZ1Y2hzaWEtNTAwLzMwIHRleHQtZnVjaHNpYS0zMDAgZm9udC1ib2xkIHRleHQtWzEwcHhdIGFjdGl2ZTpzY2FsZS05NVwiPlxyXG4gICAgICAgICAgICAgICAg8J+noCDYsdio2Lcg2LDZg9mKXHJcbiAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXthdXRvTGlua0Zyb21UaW1pbmdzfVxyXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicC0yIHJvdW5kZWQtbGcgYmctdmlvbGV0LTYwMC8yMCBib3JkZXIgYm9yZGVyLXZpb2xldC01MDAvMzAgdGV4dC12aW9sZXQtMzAwIGZvbnQtYm9sZCB0ZXh0LVsxMHB4XSBhY3RpdmU6c2NhbGUtOTVcIj5cclxuICAgICAgICAgICAgICAgIPCfqoQg2LHYqNi3INi52KfYr9mKXHJcbiAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgPExpbmsgdG89XCIvcmVjaXRhdGlvbi1tZXRob2RzXCJcclxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInAtMiByb3VuZGVkLWxnIGJnLWFtYmVyLTYwMC8yMCBib3JkZXIgYm9yZGVyLWFtYmVyLTUwMC8zMCB0ZXh0LWFtYmVyLTMwMCBmb250LWJvbGQgdGV4dC1bMTBweF0gdGV4dC1jZW50ZXIgYWN0aXZlOnNjYWxlLTk1XCI+XHJcbiAgICAgICAgICAgICAgICDimqEg2KrZgtiz2YrZhVxyXG4gICAgICAgICAgICAgIDwvTGluaz5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICB7Lyog2KfZhNmF2KrYrdiv2KsgKyDYo9iv2YjYp9iqINin2YTZhdix2KjYuSAqL31cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLXhsIGJnLXNsYXRlLTgwMC84MCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBwLTIgc3BhY2UteS0xLjVcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTFcIj5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0U3BlYWtlcihcInRlYWNoZXJcIil9IGNsYXNzTmFtZT17YHAtMS41IHJvdW5kZWQtbGcgZm9udC1ib2xkIHRleHQteHMgJHtzcGVha2VyID09PSBcInRlYWNoZXJcIiA/IFwiYmctYW1iZXItNTAwIHRleHQtYmxhY2tcIiA6IFwiYmctc2xhdGUtNzAwIHRleHQtc2xhdGUtNDAwXCJ9YH0+8J+Ome+4jyDZhdi52YTZhTwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRTcGVha2VyKFwia2lkc1wiKX0gY2xhc3NOYW1lPXtgcC0xLjUgcm91bmRlZC1sZyBmb250LWJvbGQgdGV4dC14cyAke3NwZWFrZXIgPT09IFwia2lkc1wiID8gXCJiZy1za3ktNTAwIHRleHQtYmxhY2tcIiA6IFwiYmctc2xhdGUtNzAwIHRleHQtc2xhdGUtNDAwXCJ9YH0+8J+RpiDYt9mB2YQ8L2J1dHRvbj5cclxuICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTQgZ2FwLTEgdGV4dC14c1wiPlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXthZGROZXdCb3h9IGNsYXNzTmFtZT1cImNvbC1zcGFuLTIgcC0xLjUgcm91bmRlZC1sZyBiZy1lbWVyYWxkLTYwMC8yMCB0ZXh0LWVtZXJhbGQtMzAwIGZvbnQtYm9sZCBhY3RpdmU6c2NhbGUtOTVcIj48UGx1cyBjbGFzc05hbWU9XCJpbmxpbmUgaC0zIHctM1wiIC8+INil2LbYp9mB2Kk8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17ZHVwbGljYXRlU2VsZWN0ZWR9IGNsYXNzTmFtZT1cInAtMS41IHJvdW5kZWQtbGcgYmctc2xhdGUtNzAwIGFjdGl2ZTpzY2FsZS05NVwiIHRpdGxlPVwi2YbYs9iuIChEKVwiPjxDb3B5IGNsYXNzTmFtZT1cIm14LWF1dG8gaC0zIHctM1wiIC8+PC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e2RlbGV0ZVNlbGVjdGVkfSBjbGFzc05hbWU9XCJwLTEuNSByb3VuZGVkLWxnIGJnLXJlZC05NTAvNTAgdGV4dC1yZWQtNDAwIGFjdGl2ZTpzY2FsZS05NVwiIHRpdGxlPVwi2K3YsNmBIChEZWwpXCI+PFRyYXNoMiBjbGFzc05hbWU9XCJteC1hdXRvIGgtMyB3LTNcIiAvPjwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIHsvKiDYqtit2LHZitmDINmI2KrYutmK2YrYsSDYp9mE2K3YrNmFICovfVxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdW5kZWQteGwgYmctc2xhdGUtODAwLzgwIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHAtMiBzcGFjZS15LTEuNVwiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1ib2xkIHRleHQtc2xhdGUtNDAwXCI+2KrYrdix2YrZgyDZiNit2KzZhTwvZGl2PlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMyBnYXAtMSB0ZXh0LXNtIGZvbnQtYm9sZFwiPlxyXG4gICAgICAgICAgICAgICAgPHNwYW4gLz5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gbW92ZSgwLCAtc3RlcCl9IGNsYXNzTmFtZT1cInJvdW5kZWQtbGcgYmctc2xhdGUtNzAwIHAtMS41IGFjdGl2ZTpiZy1zbGF0ZS02MDBcIj7ihpE8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDxzcGFuIC8+XHJcbiAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IG1vdmUoc3RlcCwgMCl9IGNsYXNzTmFtZT1cInJvdW5kZWQtbGcgYmctc2xhdGUtNzAwIHAtMS41IGFjdGl2ZTpiZy1zbGF0ZS02MDBcIj7ihpI8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gbW92ZSgwLCBzdGVwKX0gY2xhc3NOYW1lPVwicm91bmRlZC1sZyBiZy1zbGF0ZS03MDAgcC0xLjUgYWN0aXZlOmJnLXNsYXRlLTYwMFwiPuKGkzwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBtb3ZlKC1zdGVwLCAwKX0gY2xhc3NOYW1lPVwicm91bmRlZC1sZyBiZy1zbGF0ZS03MDAgcC0xLjUgYWN0aXZlOmJnLXNsYXRlLTYwMFwiPuKGkDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBnYXAtMSB0ZXh0LVsxMHB4XVwiPlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiByZXNpemUoc3RlcCwgMCl9IGNsYXNzTmFtZT1cInJvdW5kZWQtbGcgYmctc2xhdGUtNzAwIHAtMS41IGFjdGl2ZTpiZy1zbGF0ZS02MDBcIj7Yudix2LYgKzwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiByZXNpemUoLXN0ZXAsIDApfSBjbGFzc05hbWU9XCJyb3VuZGVkLWxnIGJnLXNsYXRlLTcwMCBwLTEuNSBhY3RpdmU6Ymctc2xhdGUtNjAwXCI+2LnYsdi2IC08L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gcmVzaXplKDAsIHN0ZXApfSBjbGFzc05hbWU9XCJyb3VuZGVkLWxnIGJnLXNsYXRlLTcwMCBwLTEuNSBhY3RpdmU6Ymctc2xhdGUtNjAwXCI+2KfYsdiq2YHYp9i5ICs8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gcmVzaXplKDAsIC1zdGVwKX0gY2xhc3NOYW1lPVwicm91bmRlZC1sZyBiZy1zbGF0ZS03MDAgcC0xLjUgYWN0aXZlOmJnLXNsYXRlLTYwMFwiPtin2LHYqtmB2KfYuSAtPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgICAgey8qINmF2K3Yp9iw2KfYqSDZiNiq2YjYrdmK2K8gKi99XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBnYXAtMS41XCI+XHJcbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtzbmFwVG9Sb3dzfSBjbGFzc05hbWU9XCJwLTIgcm91bmRlZC1sZyBiZy1jeWFuLTYwMC8yMCBib3JkZXIgYm9yZGVyLWN5YW4tNTAwLzMwIHRleHQtY3lhbi0zMDAgZm9udC1ib2xkIHRleHQtWzEwcHhdIGFjdGl2ZTpzY2FsZS05NVwiPlxyXG4gICAgICAgICAgICAgICAg8J+TkCDZhdit2KfYsNin2Kkg2KfZhNiz2LfZiNixXHJcbiAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXthcHBseUhlaWdodFRvQWxsfSBjbGFzc05hbWU9XCJwLTIgcm91bmRlZC1sZyBiZy1lbWVyYWxkLTYwMC8yMCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtNTAwLzMwIHRleHQtZW1lcmFsZC0zMDAgZm9udC1ib2xkIHRleHQtWzEwcHhdIGFjdGl2ZTpzY2FsZS05NVwiPlxyXG4gICAgICAgICAgICAgICAg8J+TjyDYqtmI2K3ZitivINin2YTYp9ix2KrZgdin2LlcclxuICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICB7Lyog2KrZg9io2YrYsSArINil2LnYp9iv2Kkg2LbYqNi3ICovfVxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTEuNVwiPlxyXG4gICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0U2NhbGUocyA9PiBjbGFtcChzICsgMC4xLCAwLjI1LCAxLjQpKX0gY2xhc3NOYW1lPVwiZmxleC0xIHJvdW5kZWQtbGcgYmctc2xhdGUtNzAwIHAtMS41IGFjdGl2ZTpiZy1zbGF0ZS02MDBcIj48Wm9vbUluIGNsYXNzTmFtZT1cIm14LWF1dG8gaC0zLjUgdy0zLjVcIiAvPjwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0U2NhbGUocyA9PiBjbGFtcChzIC0gMC4xLCAwLjI1LCAxLjQpKX0gY2xhc3NOYW1lPVwiZmxleC0xIHJvdW5kZWQtbGcgYmctc2xhdGUtNzAwIHAtMS41IGFjdGl2ZTpiZy1zbGF0ZS02MDBcIj48Wm9vbU91dCBjbGFzc05hbWU9XCJteC1hdXRvIGgtMy41IHctMy41XCIgLz48L2J1dHRvbj5cclxuICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHsgcmVzZXRQYWdlQXlhaEJveGVzKHBhZ2VTcmMpOyBzZXRCb3hlcyhBWUFIX0NPT1JESU5BVEVTW3BhZ2VTcmNdLm1hcChiID0+ICh7IC4uLmIgfSkpKTsgfX1cclxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXgtMSByb3VuZGVkLWxnIGJnLXJlZC05NTAvNTAgYm9yZGVyIGJvcmRlci1yZWQtNTAwLzMwIHRleHQtcmVkLTQwMCBwLTEuNSBhY3RpdmU6c2NhbGUtOTVcIiB0aXRsZT1cItil2LnYp9iv2Kkg2LbYqNi3XCI+XHJcbiAgICAgICAgICAgICAgICA8Um90YXRlQ2N3IGNsYXNzTmFtZT1cIm14LWF1dG8gaC0zLjUgdy0zLjVcIiAvPlxyXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIHsvKiDYqti12K/ZitixIC8g2KfYs9iq2YrYsdin2K8gKi99XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMiBnYXAtMS41XCI+XHJcbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtleHBvcnRBbGx9XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwLTIgcm91bmRlZC1sZyBiZy1ibHVlLTYwMC8yMCBib3JkZXIgYm9yZGVyLWJsdWUtNTAwLzMwIHRleHQtYmx1ZS0zMDAgZm9udC1ib2xkIHRleHQtWzEwcHhdIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xIGFjdGl2ZTpzY2FsZS05NVwiPlxyXG4gICAgICAgICAgICAgICAgPERvd25sb2FkIGNsYXNzTmFtZT1cImgtMyB3LTNcIiAvPiDYqti12K/ZitixICjYrdmB2LgpXHJcbiAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtpbXBvcnRBbGx9XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwLTIgcm91bmRlZC1sZyBiZy1ncmVlbi02MDAvMjAgYm9yZGVyIGJvcmRlci1ncmVlbi01MDAvMzAgdGV4dC1ncmVlbi0zMDAgZm9udC1ib2xkIHRleHQtWzEwcHhdIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xIGFjdGl2ZTpzY2FsZS05NVwiPlxyXG4gICAgICAgICAgICAgICAgPFVwbG9hZCBjbGFzc05hbWU9XCJoLTMgdy0zXCIgLz4g2KfYs9iq2YrYsdin2K9cclxuICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICB7Lyog2KfZhNmF2YLYp9i32Lkg2KfZhNmF2K3ZgdmI2LjYqSDigJQg2YXYt9mI2YogKi99XHJcbiAgICAgICAgICAgIHtzZWdtZW50c0xpc3QubGVuZ3RoID4gMCAmJiAoXHJcbiAgICAgICAgICAgICAgPGRldGFpbHMgY2xhc3NOYW1lPVwicm91bmRlZC14bCBiZy1zbGF0ZS04MDAvNjAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgcC0yXCI+XHJcbiAgICAgICAgICAgICAgICA8c3VtbWFyeSBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSBmb250LWJvbGQgdGV4dC1zbGF0ZS00MDAgY3Vyc29yLXBvaW50ZXJcIj7wn5OOINmF2YLYp9i32LkgKHtzZWdtZW50c0xpc3QubGVuZ3RofSk8L3N1bW1hcnk+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTIgc3BhY2UteS0xIG1heC1oLTQwIG92ZXJmbG93LXktYXV0b1wiPlxyXG4gICAgICAgICAgICAgICAgICB7c2VnbWVudHNMaXN0Lm1hcCgoc2VnLCBpKSA9PiAoXHJcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgICAgICAga2V5PXtzZWcuaWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVNlbGVjdGVkKHsgYXVkaW9TdGFydDogc2VnLnN0YXJ0LCBhdWRpb0VuZDogc2VnLmVuZCwgc3BlYWtlcjogc2VnLnNwZWFrZXIgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvYXN0KHsgdGl0bGU6IFwi4pyFXCIsIGRlc2NyaXB0aW9uOiBzZWcubGFiZWwgfHwgYNmF2YLYt9i5ICR7aSArIDF9YCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgIH19XHJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgYmctc2xhdGUtNzAwLzQwIHAtMS41IHJvdW5kZWQtbGcgdGV4dC1bMTBweF0gaG92ZXI6Ymctc2xhdGUtNjAwLzQwXCJcclxuICAgICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj57c2VnLnNwZWFrZXIgPT09IFwidGVhY2hlclwiID8gXCLwn46Z77iPXCIgOiBcIvCfkaZcIn08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmbGV4LTEgdGV4dC1yaWdodCB0cnVuY2F0ZSB0ZXh0LXdoaXRlXCI+e3NlZy5sYWJlbCB8fCBg2YXZgti32LkgJHtpICsgMX1gfTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtc2xhdGUtNTAwIGZvbnQtbW9ubyBzaHJpbmstMFwiPntmbXRUaW1lKHNlZy5zdGFydCl9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICApKX1cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDwvZGV0YWlscz5cclxuICAgICAgICAgICAgKX1cclxuICAgICAgICAgIDwvYXNpZGU+XHJcblxyXG5cclxuICAgICAgICA8L3NlY3Rpb24+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9tYWluPlxyXG4gICk7XHJcbn07XHJcblxyXG5cclxuZXhwb3J0IGRlZmF1bHQgQXlhaENhbGlicmF0aW9uO1xyXG5cclxuIl0sIm5hbWVzIjpbInVzZUNhbGxiYWNrIiwidXNlRWZmZWN0IiwidXNlTWVtbyIsInVzZVJlZiIsInVzZVN0YXRlIiwiQXJyb3dSaWdodCIsIlBhdXNlIiwiUGxheSIsIlBsdXMiLCJSb3RhdGVDY3ciLCJTYXZlIiwiVHJhc2gyIiwiWm9vbUluIiwiWm9vbU91dCIsIkNvcHkiLCJLZXlib2FyZCIsIkRvd25sb2FkIiwiVXBsb2FkIiwiQVlBSF9DT09SRElOQVRFUyIsImdldEFsbFBhZ2VTb3VyY2VzIiwiZ2V0UGFnZUF5YWhCb3hlcyIsIlBBR0VfSU1BR0VfU0laRSIsInJlc2V0UGFnZUF5YWhCb3hlcyIsInNhdmVQYWdlQXlhaEJveGVzIiwiZ2V0U2F2ZWRBeWFoQ29vcmRpbmF0ZXMiLCJnZXRTYXZlZFRpbWluZ3MiLCJnZXRTdXJhaFRpbWluZ3MiLCJnZXRTdXJhaEF1ZGlvVXJsIiwiaGFzQ2xvdWRBdWRpbyIsInRvYXN0IiwiTGluayIsImF1ZGlvUGF0aCIsIm4iLCJjbGFtcCIsInZhbHVlIiwibWluIiwibWF4IiwiTWF0aCIsInN0ZXAiLCJzcGVha2VyQ29sb3JzIiwidGVhY2hlciIsImZpbGwiLCJzdHJva2UiLCJraWRzIiwiZm10VGltZSIsInMiLCJpc0Zpbml0ZSIsIm0iLCJmbG9vciIsInNlYyIsInRvRml4ZWQiLCJwYWRTdGFydCIsIkF5YWhDYWxpYnJhdGlvbiIsInBhZ2VTb3VyY2VzIiwicGFnZVNyYyIsInNldFBhZ2VTcmMiLCJib3hlcyIsInNldEJveGVzIiwic2VsZWN0ZWRJbmRleCIsInNldFNlbGVjdGVkSW5kZXgiLCJzY2FsZSIsInNldFNjYWxlIiwid2luZG93IiwiaW5uZXJXaWR0aCIsIndpZHRoIiwic3BlYWtlciIsInNldFNwZWFrZXIiLCJpc1BsYXlpbmciLCJzZXRJc1BsYXlpbmciLCJjdXJyZW50VGltZSIsInNldEN1cnJlbnRUaW1lIiwiZHVyYXRpb24iLCJzZXREdXJhdGlvbiIsImlzU2F2aW5nIiwic2V0SXNTYXZpbmciLCJzZWdtZW50c0xpc3QiLCJzZXRTZWdtZW50c0xpc3QiLCJjYW52YXNSZWYiLCJhdWRpb1JlZiIsInN0b3BBdFJlZiIsInNlbGVjdGVkIiwiYWxsIiwic3VyYWgiLCJzZWdtZW50cyIsImxvYWRQYWdlIiwic3JjIiwic3RvcEF1ZGlvIiwiYSIsImN1cnJlbnQiLCJwYXVzZSIsInVwZGF0ZVNlbGVjdGVkIiwicGF0Y2giLCJtYXAiLCJib3giLCJpIiwibW92ZSIsImR4IiwiZHkiLCJ4IiwieSIsImhlaWdodCIsInJlc2l6ZSIsImR3IiwiZGgiLCJkdXBsaWNhdGVTZWxlY3RlZCIsImNvcHkiLCJhdWRpb1N0YXJ0IiwidW5kZWZpbmVkIiwiYXVkaW9FbmQiLCJuZXh0Iiwic2xpY2UiLCJkZWxldGVTZWxlY3RlZCIsImxlbmd0aCIsImZpbHRlciIsIl8iLCJhcHBseUhlaWdodFRvQWxsIiwidGl0bGUiLCJkZXNjcmlwdGlvbiIsImFkZE5ld0JveCIsImxhc3RCb3giLCJuZXdCb3giLCJheWFoIiwiZHJhZ1N0YXJ0IiwiaW5kZXgiLCJlIiwiY3VycmVudFRhcmdldCIsInNldFBvaW50ZXJDYXB0dXJlIiwicG9pbnRlcklkIiwiY2FudmFzUmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInN0YXJ0WCIsImNsaWVudFgiLCJzdGFydFkiLCJjbGllbnRZIiwic3RhcnRCb3giLCJvbk1vdmUiLCJldmVudCIsInJhdGlvWCIsInJhdGlvWSIsIm9uVXAiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiYWRkRXZlbnRMaXN0ZW5lciIsIm9uY2UiLCJlbnN1cmVBdWRpb0xvYWRlZCIsInRoZW4iLCJ0YXJnZXRTcmMiLCJleHBlY3RlZEZpbGUiLCJzcGxpdCIsInBvcCIsImVuZHNXaXRoIiwibG9hZCIsInBsYXlTZWxlY3RlZCIsInN0YXJ0IiwiZW5kIiwicGxheSIsImNhdGNoIiwic2V0U3RhcnRGcm9tQ3VycmVudCIsInQiLCJOdW1iZXIiLCJzZXRFbmRGcm9tQ3VycmVudCIsImNsZWFyQmluZGluZyIsInNuYXBUb1Jvd3MiLCJyb3dUaHJlc2hvbGQiLCJyZXN1bHQiLCJhc3NpZ25lZCIsIlNldCIsImhhcyIsInJvd0JveGVzIiwiaiIsImFicyIsInB1c2giLCJhdmdZIiwicm91bmQiLCJyZWR1Y2UiLCJpZHgiLCJtYXhIIiwiZm9yRWFjaCIsImFkZCIsImV4cG9ydEFsbCIsImRhdGEiLCJ2ZXJzaW9uIiwidGltZXN0YW1wIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwiY29vcmRpbmF0ZXMiLCJ0aW1pbmdzIiwiYmxvYiIsIkJsb2IiLCJKU09OIiwic3RyaW5naWZ5IiwidHlwZSIsInVybCIsIlVSTCIsImNyZWF0ZU9iamVjdFVSTCIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImhyZWYiLCJkb3dubG9hZCIsImNsaWNrIiwicmV2b2tlT2JqZWN0VVJMIiwiaW1wb3J0QWxsIiwiaW5wdXQiLCJhY2NlcHQiLCJvbmNoYW5nZSIsImZpbGUiLCJ0YXJnZXQiLCJmaWxlcyIsInJlYWRlciIsIkZpbGVSZWFkZXIiLCJvbmxvYWQiLCJldiIsInBhcnNlIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsInJlYWRBc1RleHQiLCJzbWFydEF1dG9MaW5rIiwic2F2ZWRBbGwiLCJzdXJhaHMiLCJBcnJheSIsImZyb20iLCJiIiwibGlua2VkIiwibmV3Qm94ZXMiLCJzdXJhaE51bSIsInNhdmVkIiwidGVhY2hlclNlZ3MiLCJzb3J0Iiwia2lkc1NlZ3MiLCJzdXJhaEJveGVzIiwiYm94SWR4IiwiaW5kZXhPZiIsImhhc0tpZHNCb3giLCJzb21lIiwiYXV0b0xpbmtGcm9tVGltaW5ncyIsInN1cmFoU2VnbWVudHMiLCJzdXJhaFRlYWNoZXJUaW1lcyIsInVzZWRDb3VudHMiLCJjb3VudCIsInNlZ3MiLCJzZWciLCJ0aW1lcyIsIm9uVGltZVVwZGF0ZSIsInNhdmVBbGwiLCJzaWxlbnQiLCJib3VuZCIsInNldFRpbWVvdXQiLCJzdGF0ZVJlZiIsInRpbWVyIiwiY2xlYXJUaW1lb3V0Iiwic2hvd0hlbHAiLCJzZXRTaG93SGVscCIsImhhbmRsZXIiLCJ0YWciLCJ0YWdOYW1lIiwidG9Mb3dlckNhc2UiLCJrZXkiLCJwcmV2ZW50RGVmYXVsdCIsInNoaWZ0S2V5IiwiY3RybEtleSIsIm1ldGFLZXkiLCJzYyIsInNwIiwidiIsImhhc0JpbmRpbmciLCJib3VuZENvdW50IiwibWFpbiIsImNsYXNzTmFtZSIsImRpciIsImF1ZGlvIiwicmVmIiwiY3Jvc3NPcmlnaW4iLCJvblBsYXkiLCJvblBhdXNlIiwib25Mb2FkZWRNZXRhZGF0YSIsIm9uRHVyYXRpb25DaGFuZ2UiLCJkaXYiLCJoZWFkZXIiLCJ0byIsIm9uQ2xpY2siLCJoMSIsInAiLCJidXR0b24iLCJoMyIsImRlc2MiLCJrYmQiLCJzcGFuIiwic2VjdGlvbiIsInN0eWxlIiwiaW1nIiwiYWx0IiwiZHJhZ2dhYmxlIiwiaXNTZWxlY3RlZCIsImJveFNwZWFrZXIiLCJib3hDb2xvcnMiLCJvblBvaW50ZXJEb3duIiwibGVmdCIsInRvcCIsIm1peEJsZW5kTW9kZSIsImJhY2tncm91bmQiLCJib3JkZXJDb2xvciIsImJvcmRlclN0eWxlIiwiYXNpZGUiLCJzZWxlY3QiLCJvbkNoYW5nZSIsIm9wdGlvbiIsInJlcGxhY2UiLCJwYXJzZUludCIsImRpc2FibGVkIiwiZGV0YWlscyIsInN1bW1hcnkiLCJsYWJlbCIsImlkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxTQUFTQSxXQUFXLEVBQUVDLFNBQVMsRUFBRUMsT0FBTyxFQUFFQyxNQUFNLEVBQUVD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