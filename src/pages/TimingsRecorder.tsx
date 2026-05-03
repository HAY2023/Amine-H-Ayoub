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

// ====== Smart segmentation via adaptive audio energy analysis ======
const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))];
};

async function detectAudioSegments(
  audioUrl: string,
  silenceThreshold = 0.015,
  minSilenceMs = 350,
): Promise<{ segments: AudioSegment[]; duration: number }> {
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

  const noiseFloor = percentile(rms, 0.18);
  const speechPeak = percentile(rms, 0.92);
  const adaptiveThreshold = Math.max(silenceThreshold, noiseFloor + (speechPeak - noiseFloor) * 0.18);
  const active = rms.map((v) => v >= adaptiveThreshold);
  const rawSegments: { start: number; end: number }[] = [];
  let startWindow = -1;
  let silentRun = 0;
  for (let i = 0; i < active.length; i++) {
    if (active[i]) {
      if (startWindow === -1) startWindow = i;
      silentRun = 0;
    } else if (startWindow !== -1) {
      silentRun++;
      if (silentRun >= minSilenceWindows) {
        rawSegments.push({ start: (startWindow * win) / sr, end: ((i - silentRun + 1) * win) / sr });
        startWindow = -1;
        silentRun = 0;
      }
    }
  }
  if (startWindow !== -1) rawSegments.push({ start: (startWindow * win) / sr, end: audio.duration });

  const segments = rawSegments
    .map((seg) => ({ start: Math.max(0, seg.start - 0.04), end: Math.min(audio.duration, seg.end + 0.08) }))
    .filter((seg) => seg.end - seg.start >= 0.45)
    .map((seg, index) => ({
      id: `${Date.now()}-${index}`,
      start: Number(seg.start.toFixed(3)),
      end: Number(seg.end.toFixed(3)),
      speaker: "teacher" as const,
      label: `مقطع ${index + 1}`,
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

  const ayahCount = AYAH_COUNTS[surahNum] || 0;
  const inKidsSection = kidsStart !== null && current >= kidsStart;

  // Load saved timings when surah changes
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
    if (inKidsSection) setKids(k => [...k, t]);
    else setTeacher(arr => [...arr, t]);
  };

  const markKidsStart = () => setKidsStart(parseFloat(current.toFixed(2)));

  const popLast = () => {
    if (segments.length > 0) setSegments((items) => items.slice(0, -1));
    else if (inKidsSection && kids.length > 0) setKids(k => k.slice(0, -1));
    else if (teacher.length > 0) setTeacher(arr => arr.slice(0, -1));
  };

  // Skip to next sound (next non-silent moment)
  const skipToNextSound = async () => {
    const a = audioRef.current; if (!a) return;
    setDetecting(true);
    try {
      const { starts } = await detectAyahStarts(a.src, 99, silenceThreshold, minSilenceMs);
      const next = starts.find((s) => s > current + 0.15);
      if (next !== undefined) a.currentTime = next;
    } finally { setDetecting(false); }
  };

  // Auto-detect ALL ayahs
  const autoDetectTeacher = async () => {
    const a = audioRef.current; if (!a) return;
    const expected = kidsStart !== null ? ayahCount : ayahCount;
    setDetecting(true);
    try {
      const { starts } = await detectAyahStarts(a.src, expected, silenceThreshold, minSilenceMs);
      // If there's a kids section, restrict to teacher portion
      const teacherStarts = kidsStart !== null ? starts.filter((s) => s < kidsStart) : starts;
      setTeacher(teacherStarts.slice(0, ayahCount));
    } finally { setDetecting(false); }
  };

  const autoDetectKids = async () => {
    const a = audioRef.current; if (!a || kidsStart === null) return;
    setDetecting(true);
    try {
      const { starts } = await detectAyahStarts(a.src, ayahCount + 5, silenceThreshold, minSilenceMs);
      // keep starts within kids section, ensure first is at/near kidsStart
      const kidsStarts = starts.filter((s) => s >= kidsStart - 0.1);
      setKids(kidsStarts.slice(0, ayahCount));
    } finally { setDetecting(false); }
  };

  const applyAndSave = () => {
    const payload: SurahTimings = { teacher };
    if (kidsStart !== null) { payload.kidsStart = kidsStart; payload.kids = kids; }
    saveSurahTimings(surahNum, payload);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const clearSaved = () => {
    clearSavedSurahTimings(surahNum);
    resetAll();
  };

  const json = useMemo(() => {
    const obj: Record<string, unknown> = { teacher };
    if (kidsStart !== null) { obj.kidsStart = kidsStart; obj.kids = kids; }
    const inner = JSON.stringify(obj, null, 2)
      .split("\n").map((l, i) => i === 0 ? l : "    " + l).join("\n");
    return `  ${surahNum}: ${inner},`;
  }, [surahNum, teacher, kids, kidsStart]);

  const copy = () => navigator.clipboard.writeText(json);

  const seekToAyah = (i: number) => {
    const list = i < teacher.length ? teacher : kids;
    const idx = i < teacher.length ? i : i - teacher.length;
    const t = list[idx];
    const a = audioRef.current; if (!a || t === undefined) return;
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
            استخدم الكشف التلقائي عبر تحليل الصمت، أو علّم يدوياً، ثم اضغط "حفظ وتطبيق"
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
              onClick={skipToNextSound}
              disabled={detecting}
              className="w-12 h-12 rounded-full bg-violet-500 text-white flex items-center justify-center shadow disabled:opacity-40"
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

          {/* Auto-detection controls */}
          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 space-y-2">
            <p className="text-xs font-bold text-violet-900 flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5" /> الكشف التلقائي عبر تحليل الصمت
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
                onClick={autoDetectTeacher}
                disabled={detecting || !duration}
                className="p-2 rounded-lg bg-violet-600 text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-1"
              >
                {detecting ? "جارٍ التحليل..." : "🔍 كشف آيات المعلم"}
              </button>
              <button
                onClick={autoDetectKids}
                disabled={detecting || !duration || kidsStart === null}
                className="p-2 rounded-lg bg-sky-600 text-white text-sm font-bold disabled:opacity-40"
              >
                🔍 كشف آيات الطفل
              </button>
            </div>
          </div>

          {/* Manual mark buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={markAyah}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500 text-white font-bold shadow active:scale-95"
            >
              <Bookmark className="w-5 h-5" />
              <span className="text-sm">
                بداية آية {(inKidsSection ? kids.length : teacher.length) + 1}
                {inKidsSection ? " (طفل)" : " (معلم)"}
              </span>
            </button>
            <button
              onClick={markKidsStart}
              disabled={kidsStart !== null}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-sky-500 text-white font-bold shadow active:scale-95 disabled:opacity-40"
            >
              <Baby className="w-5 h-5" />
              <span className="text-sm">
                {kidsStart !== null ? `صوت الطفل: ${fmt(kidsStart)}` : "بداية صوت الطفل"}
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

          <p className="text-xs text-muted-foreground text-center">
            المعلم: {teacher.length} / {ayahCount} • الطفل: {kids.length} / {ayahCount}
          </p>
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

        {/* Marked list */}
        {(teacher.length > 0 || kids.length > 0) && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-bold mb-2 text-sm">العلامات المسجلة (انقر للقفز):</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-amber-700 font-bold mb-1">👨‍🏫 المعلم</p>
                <div className="flex flex-wrap gap-1">
                  {teacher.map((t, i) => (
                    <button key={i} onClick={() => seekToAyah(i)}
                      className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-900 font-mono">
                      {i + 1}: {t}s
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-sky-700 font-bold mb-1">👦 الطفل</p>
                <div className="flex flex-wrap gap-1">
                  {kids.map((t, i) => (
                    <button key={i} onClick={() => seekToAyah(teacher.length + i)}
                      className="px-2 py-1 rounded text-xs bg-sky-100 text-sky-900 font-mono">
                      {i + 1}: {t}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
