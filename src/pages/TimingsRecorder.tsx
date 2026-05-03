import { useState, useRef, useMemo, useEffect } from "react";
import { Play, Pause, RotateCcw, Copy, Bookmark, Baby, Wand2, Save, Check, SkipForward, Trash2 } from "lucide-react";
import { AYAH_COUNTS, getSavedTimings, saveSurahTimings, clearSavedSurahTimings, SurahTimings, AudioSegment } from "@/data/ayahTimings";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

const SURAH_NAMES: Record<number, string> = {
  1: "الفاتحة", 2: "الناس", 3: "الفلق", 4: "الإخلاص", 5: "المسد",
  6: "النصر", 7: "الكافرون", 8: "الكوثر", 9: "الماعون", 10: "قريش",
  11: "الفيل", 12: "الهمزة", 13: "العصر", 14: "التكاثر",
};

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))];
};

async function detectAudioSegments(
  audioUrl: string,
  targetCount = 0,
  silenceThreshold = 0.015,
  minSilenceMs = 350,
): Promise<{ segments: AudioSegment[]; duration: number }> {
  const res = await fetch(audioUrl);
  const buf = await res.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctx: typeof (window.AudioContext || (window as any).webkitAudioContext);
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audio = await ctx.decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const sr = audio.sampleRate;
  
  // 1. Calculate RMS energy in 20ms windows
  const winSize = Math.floor(sr * 0.02);
  const rms: number[] = [];
  for (let i = 0; i + winSize <= data.length; i += winSize) {
    let sum = 0;
    for (let j = 0; j < winSize; j++) {
      const v = data[i + j];
      sum += v * v;
    }
    rms.push(Math.sqrt(sum / winSize));
  }

  // 2. Adaptive thresholding
  const noiseFloor = percentile(rms, 0.15);
  const speechPeak = percentile(rms, 0.90);
  const threshold = Math.max(silenceThreshold, noiseFloor + (speechPeak - noiseFloor) * 0.15);
  
  // 3. Find raw activity (with small 5-window smoothing)
  const active = rms.map((v, i) => {
    const neighbors = rms.slice(Math.max(0, i - 2), i + 3);
    const avg = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
    return avg >= threshold;
  });

  // 4. Find all silence gaps (runs of 'false')
  const gaps: { start: number; end: number; duration: number }[] = [];
  let gapStart = -1;
  for (let i = 0; i < active.length; i++) {
    if (!active[i]) {
      if (gapStart === -1) gapStart = i;
    } else if (gapStart !== -1) {
      const duration = ((i - gapStart) * winSize) / sr;
      if (duration * 1000 >= minSilenceMs) {
        gaps.push({ start: (gapStart * winSize) / sr, end: (i * winSize) / sr, duration });
      }
      gapStart = -1;
    }
  }

  // 5. If targetCount is specified, keep only the longest gaps to define boundaries
  let finalBoundaries: number[] = [];
  if (targetCount > 1 && gaps.length >= targetCount - 1) {
    // Sort gaps by duration descending and take the top (targetCount - 1)
    const topGaps = [...gaps].sort((a, b) => b.duration - a.duration).slice(0, targetCount - 1);
    // Sort them back chronologically
    finalBoundaries = topGaps.map(g => g.end).sort((a, b) => a - b);
  } else {
    // Just use all detected gaps as boundaries
    finalBoundaries = gaps.map(g => g.end);
  }

  // 6. Create segments based on boundaries
  const starts = [0, ...finalBoundaries];
  const ends = [...finalBoundaries, audio.duration];
  
  const segments: AudioSegment[] = starts.map((s, i) => ({
    id: `${Date.now()}-${i}`,
    start: Number(s.toFixed(3)),
    end: Number(ends[i].toFixed(3)),
    speaker: "teacher",
    label: `آية ${i + 1}`,
  }));

  ctx.close();
  return { segments, duration: audio.duration };
}

const TimingsRecorder = () => {
  const [surahNum, setSurahNum] = useState(1);
  const [teacher, setTeacher] = useState<number[]>([]);
  const [kids, setKids] = useState<number[]>([]);
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [kidsStart, setKidsStart] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [silenceThreshold, setSilenceThreshold] = useState(0.015);
  const [minSilenceMs, setMinSilenceMs] = useState(350);
  const audioRef = useRef<HTMLAudioElement>(null);

  const inKidsSection = kidsStart !== null && current >= kidsStart;

  useEffect(() => {
    const saved = getSavedTimings()[surahNum];
    if (saved) {
      setTeacher(saved.teacher || []);
      setKids(saved.kids || []);
      setSegments(saved.segments || []);
      setKidsStart(saved.kidsStart ?? null);
    } else {
      setTeacher([]); setKids([]); setSegments([]); setKidsStart(null);
    }
  }, [surahNum]);

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return;
    if (isPlaying) a.pause(); else a.play().catch(() => {});
  };

  const resetAll = () => {
    setTeacher([]); setKids([]); setSegments([]); setKidsStart(null);
    const a = audioRef.current; if (a) { a.pause(); a.currentTime = 0; }
  };

  const markAyah = () => {
    const t = parseFloat(current.toFixed(2));
    if (inKidsSection) setKids(k => [...k, t].sort((a,b) => a-b));
    else setTeacher(arr => [...arr, t].sort((a,b) => a-b));
    
    setSegments((items) => {
      // update end of last segment if it overlaps
      const next = items.map((seg, index) => (index === items.length - 1 && seg.end <= t) ? { ...seg, end: t } : seg);
      return [...next, { 
        id: `${Date.now()}`, 
        start: t, 
        end: Math.min(duration || t + 3, t + 3), 
        speaker: inKidsSection ? "kids" : "teacher", 
        label: `مقطع ${next.length + 1}` 
      }];
    });
  };

  const markKidsStart = () => setKidsStart(parseFloat(current.toFixed(2)));

  const popLast = () => {
    if (segments.length > 0) setSegments((items) => items.slice(0, -1));
    else if (inKidsSection && kids.length > 0) setKids(k => k.slice(0, -1));
    else if (teacher.length > 0) setTeacher(arr => arr.slice(0, -1));
  };

  const skipToNextSound = async () => {
    const a = audioRef.current; if (!a) return;
    setDetecting(true);
    try {
      const { segments: detected } = await detectAudioSegments(a.src, 0, silenceThreshold, minSilenceMs);
      const next = detected.find((seg) => seg.start > current + 0.15);
      if (next) a.currentTime = next.start;
    } finally { setDetecting(false); }
  };

  const autoDetectSegments = async () => {
    const a = audioRef.current; if (!a) return;
    setDetecting(true);
    try {
      const { segments: detected } = await detectAudioSegments(a.src, AYAH_COUNTS[surahNum] || 0, silenceThreshold, minSilenceMs);
      const surahName = SURAH_NAMES[surahNum] || `سورة ${surahNum}`;
      const labeled = detected.map((seg, index) => ({ ...seg, label: `${surahName} - آية ${index + 1}` }));
      setSegments(labeled);
      setTeacher(labeled.filter((seg) => seg.speaker === "teacher").map((seg) => seg.start));
      setKids(labeled.filter((seg) => seg.speaker === "kids").map((seg) => seg.start));
    } finally { setDetecting(false); }
  };

  const splitByMinute = () => {
    if (!duration) return;
    const count = Math.floor(duration / 60);
    const newSegments: AudioSegment[] = [];
    for (let i = 0; i <= count; i++) {
      const start = i * 60;
      newSegments.push({
        id: `min-${i}`,
        start,
        end: Math.min(start + 60, duration),
        speaker: "teacher",
        label: `دقيقة ${i + 1}`
      });
    }
    setSegments(newSegments);
    setTeacher(newSegments.map(s => s.start));
  };

  const deleteSegment = (id: string) => {
    setSegments((items) => items.filter((seg) => seg.id !== id));
  };

  const applyAndSave = () => {
    const payload: SurahTimings = { teacher, segments };
    if (kidsStart !== null || kids.length > 0) { 
      payload.kidsStart = kidsStart ?? (kids.length > 0 ? kids[0] : undefined); 
      payload.kids = kids; 
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
    const obj: Record<string, unknown> = { teacher, segments };
    if (kidsStart !== null) { obj.kidsStart = kidsStart; obj.kids = kids; }
    const inner = JSON.stringify(obj, null, 2)
      .split("\n").map((l, i) => i === 0 ? l : "    " + l).join("\n");
    return `  ${surahNum}: ${inner},`;
  }, [surahNum, teacher, kids, kidsStart, segments]);

  const copy = () => navigator.clipboard.writeText(json);

  const playSegment = (seg: AudioSegment) => {
    const a = audioRef.current; if (!a) return;
    a.currentTime = seg.start;
    a.play().catch(() => {});
    const stop = () => {
      if (a.currentTime >= seg.end - 0.02) {
        a.pause();
        a.removeEventListener("timeupdate", stop);
      }
    };
    a.addEventListener("timeupdate", stop);
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
              onClick={skipToNextSound}
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

          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 space-y-2">
            <p className="text-xs font-bold text-violet-900 flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5" /> تقسيم ذكي AI للمقاطع الصوتية
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="block">
                <span className="text-violet-800">حد الصمت: {silenceThreshold.toFixed(3)}</span>
                <input type="range" min={0.005} max={0.05} step={0.001}
                  value={silenceThreshold} onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                  className="w-full" dir="ltr" />
              </label>
              <label className="block">
                <span className="text-violet-800">أقل صمت (مل): {minSilenceMs}</span>
                <input type="range" min={150} max={1500} step={50}
                  value={minSilenceMs} onChange={(e) => setMinSilenceMs(parseInt(e.target.value, 10))}
                  className="w-full" dir="ltr" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={autoDetectSegments}
                disabled={detecting || !duration}
                className="p-2 rounded-lg bg-violet-600 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1"
              >
                {detecting ? "جارٍ التحليل..." : "🤖 تقسيم بالذكاء الاصطناعي"}
              </button>
              <button
                onClick={splitByMinute}
                className="p-2 rounded-lg bg-violet-100 text-violet-900 text-xs font-bold flex items-center justify-center gap-1"
              >
                ⏱️ تقسيم بالدقائق (كل 60ث)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={markAyah}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500 text-white font-bold shadow active:scale-95"
            >
              <Bookmark className="w-5 h-5" />
              <span className="text-sm">تحديد آية (معلم)</span>
            </button>
            <button
              onClick={markKidsStart}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-sky-500 text-white font-bold shadow active:scale-95 disabled:opacity-40"
            >
              <Baby className="w-5 h-5" />
              <span className="text-sm">
                {kidsStart !== null ? `بداية الطفل: ${fmt(kidsStart)}` : "تحديد بداية الطفل"}
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

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={applyAndSave}
            className={`p-3 rounded-xl font-bold text-white shadow active:scale-95 flex items-center justify-center gap-2 transition-colors ${savedFlash ? "bg-emerald-600" : "bg-primary"}`}
          >
            {savedFlash ? <><Check className="w-5 h-5" /> تم الحفظ</> : <><Save className="w-5 h-5" /> حفظ التطبيق</>}
          </button>
          <button
            onClick={clearSaved}
            className="p-3 rounded-xl bg-destructive/10 text-destructive font-bold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" /> حذف الحفظ
          </button>
        </div>

        {segments.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-bold mb-2 text-sm">المقاطع المسجلة ({segments.length}):</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {segments.map((seg, i) => (
                <div key={seg.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg bg-secondary/70 p-2">
                  <button onClick={() => playSegment(seg)} className="text-right text-xs font-bold">
                    ▶️ {seg.label || `مقطع ${i + 1}`} · {fmt(seg.start)} → {fmt(seg.end)}
                  </button>
                  <select
                    value={seg.speaker}
                    onChange={(e) => setSegments((items) => items.map((item) => item.id === seg.id ? { ...item, speaker: e.target.value as AudioSegment["speaker"] } : item))}
                    className="rounded-md border border-border bg-background px-1 py-1 text-xs"
                  >
                    <option value="teacher">معلم</option>
                    <option value="kids">طفل</option>
                  </select>
                  <button onClick={() => deleteSegment(seg.id)} className="rounded-md bg-destructive/10 p-2 text-destructive" aria-label="حذف المقطع">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-sm">JSON Preview:</p>
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

export default TimingsRecorder;
