import { useState, useRef, useMemo, useEffect } from "react";
import { Play, Pause, RotateCcw, Copy, Bookmark, Baby, Wand2, Save, Check, SkipForward, Trash2 } from "lucide-react";
import { AYAH_COUNTS, getSavedTimings, saveSurahTimings, clearSavedSurahTimings, SurahTimings } from "@/data/ayahTimings";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

const SURAH_NAMES: Record<number, string> = {
  1: "الفاتحة", 2: "الناس", 3: "الفلق", 4: "الإخلاص", 5: "المسد",
  6: "النصر", 7: "الكافرون", 8: "الكوثر", 9: "الماعون", 10: "قريش",
  11: "الفيل", 12: "الهمزة", 13: "العصر", 14: "التكاثر",
};

// ====== Auto-detection via silence analysis (Web Audio API) ======
async function detectAyahStarts(
  audioUrl: string,
  expectedCount: number,
  silenceThreshold = 0.015,
  minSilenceMs = 350,
): Promise<{ starts: number[]; duration: number }> {
  const res = await fetch(audioUrl);
  const buf = await res.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctx: typeof AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
  const ctx = new Ctx();
  const audio = await ctx.decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const sr = audio.sampleRate;
  const win = Math.floor(sr * 0.02); // 20ms window RMS
  const minSilenceWindows = Math.max(1, Math.floor((minSilenceMs / 1000) * (sr / win)));

  // RMS per window
  const rms: number[] = [];
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0;
    for (let j = 0; j < win; j++) {
      const v = data[i + j];
      sum += v * v;
    }
    rms.push(Math.sqrt(sum / win));
  }

  // find silence runs
  const silenceRuns: { start: number; end: number; mid: number }[] = [];
  let silentStart = -1;
  for (let i = 0; i < rms.length; i++) {
    if (rms[i] < silenceThreshold) {
      if (silentStart === -1) silentStart = i;
    } else {
      if (silentStart !== -1) {
        const len = i - silentStart;
        if (len >= minSilenceWindows) {
          silenceRuns.push({
            start: (silentStart * win) / sr,
            end: (i * win) / sr,
            mid: ((silentStart + i) * win) / 2 / sr,
          });
        }
        silentStart = -1;
      }
    }
  }

  // Ayah starts = end of each silence run (= speech onset). First start = 0.
  const onsets = silenceRuns.map((r) => r.end);
  const allStarts = [0, ...onsets].sort((a, b) => a - b);

  // If too many onsets, keep the strongest gaps (longest silences)
  let starts = allStarts;
  if (allStarts.length > expectedCount) {
    // rank silences by length (descending) and keep first N-1; always keep 0
    const ranked = [...silenceRuns].sort((a, b) => (b.end - b.start) - (a.end - a.start));
    const keep = ranked.slice(0, expectedCount - 1).map((r) => r.end);
    starts = [0, ...keep].sort((a, b) => a - b);
  }

  ctx.close();
  return { starts: starts.map((s) => parseFloat(s.toFixed(2))), duration: audio.duration };
}

const TimingsRecorder = () => {
  const [surahNum, setSurahNum] = useState(1);
  const [segments, setSegments] = useState<{ name: string; timings: number[] }[]>([
    { name: "👨‍🏫 المعلم", timings: [] },
    { name: "👦 الطفل", timings: [] },
  ]);
  const [activeSegIdx, setActiveSegIdx] = useState(0);
  const [kidsStart, setKidsStart] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [silenceThreshold, setSilenceThreshold] = useState(0.015);
  const [minSilenceMs, setMinSilenceMs] = useState(350);
  const audioRef = useRef<HTMLAudioElement>(null);

  const ayahCount = AYAH_COUNTS[surahNum] || 0;
  const inKidsSection = kidsStart !== null && current >= kidsStart;

  // Load saved timings when surah changes
  useEffect(() => {
    const saved = getSavedTimings()[surahNum];
    if (saved) {
      const loadedSegments = [];
      if (saved.teacher) loadedSegments.push({ name: "👨‍🏫 المعلم", timings: saved.teacher });
      if (saved.kids) loadedSegments.push({ name: "👦 الطفل", timings: saved.kids });
      
      if (saved.segments && saved.segments.length > 0) {
        saved.segments.forEach(seg => {
          // avoid duplicates if we already added teacher/kids from legacy fields
          if (!loadedSegments.find(ls => ls.name === seg.name)) {
            loadedSegments.push(seg);
          }
        });
      }
      
      if (loadedSegments.length === 0) {
        loadedSegments.push({ name: "👨‍🏫 المعلم", timings: [] });
        loadedSegments.push({ name: "👦 الطفل", timings: [] });
      }
      
      setSegments(loadedSegments);
      setKidsStart(saved.kidsStart ?? null);
    } else {
      setSegments([
        { name: "👨‍🏫 المعلم", timings: [] },
        { name: "👦 الطفل", timings: [] },
      ]);
      setKidsStart(null);
    }
    setActiveSegIdx(0);
  }, [surahNum]);

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return;
    if (isPlaying) a.pause(); else a.play().catch(() => {});
  };

  const resetAll = () => {
    setSegments(prev => prev.map(s => ({ ...s, timings: [] })));
    setKidsStart(null);
    const a = audioRef.current; if (a) { a.pause(); a.currentTime = 0; }
  };

  const markAyah = () => {
    const t = parseFloat(current.toFixed(2));
    setSegments(prev => {
      const next = [...prev];
      next[activeSegIdx] = { ...next[activeSegIdx], timings: [...next[activeSegIdx].timings, t] };
      return next;
    });
  };

  const markKidsStart = () => setKidsStart(parseFloat(current.toFixed(2)));

  const popLast = () => {
    setSegments(prev => {
      const next = [...prev];
      if (next[activeSegIdx].timings.length > 0) {
        next[activeSegIdx] = { ...next[activeSegIdx], timings: next[activeSegIdx].timings.slice(0, -1) };
      }
      return next;
    });
  };

  const splitByMinute = () => {
    if (!duration) return;
    const count = Math.floor(duration / 60);
    const newTimings = [];
    for (let i = 0; i <= count; i++) {
      newTimings.push(parseFloat((i * 60).toFixed(2)));
    }
    setSegments(prev => {
      const next = [...prev];
      next[activeSegIdx] = { ...next[activeSegIdx], timings: newTimings };
      return next;
    });
  };

  // Auto-detect ALL ayahs
  const autoDetectActive = async () => {
    const a = audioRef.current; if (!a) return;
    setDetecting(true);
    try {
      const { starts } = await detectAyahStarts(a.src, ayahCount, silenceThreshold, minSilenceMs);
      setSegments(prev => {
        const next = [...prev];
        next[activeSegIdx] = { ...next[activeSegIdx], timings: starts.slice(0, ayahCount) };
        return next;
      });
    } finally { setDetecting(false); }
  };

  const addSegment = () => {
    const name = prompt("اسم المقطع الجديد:");
    if (name) {
      setSegments(prev => [...prev, { name, timings: [] }]);
      setActiveSegIdx(segments.length);
    }
  };

  const deleteSegment = (idx: number) => {
    if (segments.length <= 1) return;
    if (!confirm(`هل أنت متأكد من حذف مقطع "${segments[idx].name}"؟`)) return;
    setSegments(prev => prev.filter((_, i) => i !== idx));
    setActiveSegIdx(0);
  };

  const renameSegment = (idx: number) => {
    const name = prompt("الاسم الجديد:", segments[idx].name);
    if (name) {
      setSegments(prev => prev.map((s, i) => i === idx ? { ...s, name } : s));
    }
  };

  const applyAndSave = () => {
    const teacherSeg = segments.find(s => s.name.includes("معلم") || s.name === "teacher");
    const kidsSeg = segments.find(s => s.name.includes("طفل") || s.name === "kids");
    
    const payload: SurahTimings = { 
      teacher: teacherSeg?.timings || (segments[0]?.timings || []),
      segments: segments 
    };
    if (kidsStart !== null) { 
      payload.kidsStart = kidsStart; 
      payload.kids = kidsSeg?.timings || segments[1]?.timings; 
    }
    
    saveSurahTimings(surahNum, payload);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const clearSaved = () => {
    clearSavedSurahTimings(surahNum);
    resetAll();
  };

  const json = useMemo(() => {
    const teacherSeg = segments.find(s => s.name.includes("معلم"));
    const kidsSeg = segments.find(s => s.name.includes("طفل"));
    const obj: Record<string, unknown> = { 
      teacher: teacherSeg?.timings || segments[0]?.timings,
      segments: segments 
    };
    if (kidsStart !== null) { 
      obj.kidsStart = kidsStart; 
      obj.kids = kidsSeg?.timings || segments[1]?.timings; 
    }
    const inner = JSON.stringify(obj, null, 2)
      .split("\n").map((l, i) => i === 0 ? l : "    " + l).join("\n");
    return `  ${surahNum}: ${inner},`;
  }, [surahNum, segments, kidsStart]);

  const copy = () => navigator.clipboard.writeText(json);

  const seekToTime = (t: number) => {
    const a = audioRef.current; if (!a) return;
    a.currentTime = t;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00.00";
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(2).padStart(5, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="text-center">
          <h1 className="text-2xl font-bold font-amiri">🎙️ أداة تسجيل توقيتات الآيات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة المقاطع، تقسيم بالدقائق، والكشف التلقائي
          </p>
        </header>

        {/* Surah picker */}
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="text-sm font-bold block mb-2">السورة:</label>
          <select
            value={surahNum}
            onChange={(e) => setSurahNum(parseInt(e.target.value, 10))}
            className="w-full p-2 rounded-lg bg-background border border-border font-amiri"
          >
            {Object.entries(SURAH_NAMES).map(([n, name]) => (
              <option key={n} value={n}>
                {n} — {name} ({AYAH_COUNTS[parseInt(n, 10)]} آيات)
              </option>
            ))}
          </select>
        </div>

        {/* Segment Manager */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold">المقاطع المسجلة:</label>
            <button onClick={addSegment} className="text-xs bg-accent px-2 py-1 rounded-md font-bold">
              + إضافة مقطع
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {segments.map((seg, i) => (
              <div key={i} className={`flex items-center gap-1 p-1 rounded-lg border ${activeSegIdx === i ? "bg-accent/20 border-accent" : "bg-muted/30 border-transparent"}`}>
                <button
                  onClick={() => setActiveSegIdx(i)}
                  className="px-2 py-1 text-sm font-bold"
                >
                  {seg.name} ({seg.timings.length})
                </button>
                <div className="flex gap-0.5 opacity-50 hover:opacity-100">
                  <button onClick={() => renameSegment(i)} className="p-1 hover:text-accent"><Wand2 className="w-3 h-3" /></button>
                  <button onClick={() => deleteSegment(i)} className="p-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Player */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <audio
            ref={audioRef}
            src={audioPath(surahNum)}
            crossOrigin="anonymous"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
            onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={async () => {
                const a = audioRef.current; if (!a) return;
                setDetecting(true);
                try {
                  const { starts } = await detectAyahStarts(a.src, 99, silenceThreshold, minSilenceMs);
                  const next = starts.find((s) => s > current + 0.15);
                  if (next !== undefined) a.currentTime = next;
                } finally { setDetecting(false); }
              }}
              disabled={detecting}
              className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center disabled:opacity-40"
              title="تخطّ إلى الصوت التالي"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <input
                type="range" min={0} max={duration || 0} step={0.01}
                value={current}
                onChange={(e) => { const a = audioRef.current; if (a) a.currentTime = parseFloat(e.target.value); }}
                className="w-full"
                dir="ltr"
              />
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground" dir="ltr">
                <span className="font-bold text-accent">{fmt(current)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={splitByMinute}
              className="p-2 rounded-lg bg-violet-100 text-violet-900 text-xs font-bold flex items-center justify-center gap-1"
            >
              ⏱️ تقسيم بالدقائق (كل 60ث)
            </button>
            <button
              onClick={autoDetectActive}
              disabled={detecting || !duration}
              className="p-2 rounded-lg bg-violet-600 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {detecting ? "جارٍ التحليل..." : "🔍 كشف تلقائي للمقطع"}
            </button>
          </div>

          {/* Manual mark buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={markAyah}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500 text-white font-bold shadow active:scale-95"
            >
              <Bookmark className="w-5 h-5" />
              <span className="text-sm">
                علامة {segments[activeSegIdx].timings.length + 1} في "{segments[activeSegIdx].name}"
              </span>
            </button>
            <button
              onClick={markKidsStart}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-sky-500 text-white font-bold shadow active:scale-95 disabled:opacity-40"
            >
              <Baby className="w-5 h-5" />
              <span className="text-sm">
                {kidsStart !== null ? `بداية الطفل: ${fmt(kidsStart)}` : "تحديد بداية صوت الطفل"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={popLast} className="p-2 rounded-lg bg-foreground/10 text-sm font-bold">
              ↶ تراجع آخر علامة
            </button>
            <button onClick={resetAll} className="p-2 rounded-lg bg-destructive/10 text-destructive text-sm font-bold flex items-center justify-center gap-1">
              <RotateCcw className="w-4 h-4" /> إعادة من الصفر
            </button>
          </div>
        </div>

        {/* Save & Apply */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={applyAndSave}
            className={`p-3 rounded-xl font-bold text-white shadow active:scale-95 flex items-center justify-center gap-2 transition-colors ${savedFlash ? "bg-emerald-600" : "bg-primary"}`}
          >
            {savedFlash ? <><Check className="w-5 h-5" /> تم الحفظ والتطبيق</> : <><Save className="w-5 h-5" /> حفظ وتطبيق فوراً</>}
          </button>
          <button
            onClick={clearSaved}
            className="p-3 rounded-xl bg-destructive/10 text-destructive font-bold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" /> حذف الحفظ
          </button>
        </div>

        {/* Marked lists */}
        <div className="space-y-3">
          {segments.map((seg, sIdx) => seg.timings.length > 0 && (
            <div key={sIdx} className="bg-card border border-border rounded-xl p-4">
              <p className="font-bold mb-2 text-sm">{seg.name}:</p>
              <div className="flex flex-wrap gap-1">
                {seg.timings.map((t, i) => (
                  <button key={i} onClick={() => seekToTime(t)}
                    className={`px-2 py-1 rounded text-xs font-mono ${activeSegIdx === sIdx ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}: {t}s
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* JSON output */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-sm">JSON (نسخة احتياطية):</p>
            <button onClick={copy} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-bold">
              <Copy className="w-3.5 h-3.5" /> نسخ
            </button>
          </div>
          <pre className="text-xs bg-background border border-border rounded p-3 overflow-x-auto font-mono" dir="ltr">
{json}
          </pre>
        </div>
      </div>
    </div>
  );
};

// small inline trash icon to avoid extra import
const Trash2Icon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>
);

export default TimingsRecorder;
