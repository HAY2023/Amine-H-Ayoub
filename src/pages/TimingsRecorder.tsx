import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Save, Check, Trash2, Wand2, Volume2, StopCircle, ArrowLeft, Link2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { AYAH_COUNTS, getSavedTimings, saveSurahTimings, clearSavedSurahTimings, SurahTimings, AudioSegment } from "@/data/ayahTimings";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  silenceThreshold = 0.02,
  minSilenceMs = 400,
): Promise<{ segments: AudioSegment[]; duration: number }> {
  const res = await fetch(audioUrl);
  const buf = await res.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audio = await ctx.decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const sr = audio.sampleRate;

  // Proven algorithm from split-tool.html: 50ms windows, fixed threshold, midpoints
  const winSize = Math.floor(sr * 0.05);
  const rms: number[] = [];
  for (let i = 0; i < data.length; i += winSize) {
    let sum = 0;
    const end = Math.min(winSize, data.length - i);
    for (let j = 0; j < end; j++) {
      const v = data[i + j];
      sum += v * v;
    }
    rms.push(Math.sqrt(sum / end));
  }

  // Find silent regions (continuous below threshold)
  const silentRegions: { start: number; end: number; mid: number; duration: number }[] = [];
  let inSilence = false;
  let silenceStart = 0;
  for (let i = 0; i < rms.length; i++) {
    if (rms[i] < silenceThreshold) {
      if (!inSilence) { inSilence = true; silenceStart = i; }
    } else {
      if (inSilence) {
        inSilence = false;
        const durSec = ((i - silenceStart) * winSize) / sr;
        if (durSec * 1000 >= minSilenceMs) {
          const startSec = (silenceStart * winSize) / sr;
          const endSec = (i * winSize) / sr;
          silentRegions.push({ start: startSec, end: endSec, mid: (startSec + endSec) / 2, duration: durSec });
        }
      }
    }
  }

  // Use midpoints as cut boundaries (matches working split-tool.html)
  let boundaries = silentRegions.map(r => r.mid);

  // If user wants exact count, keep N-1 longest silences
  if (targetCount > 1 && boundaries.length > targetCount - 1) {
    const topGaps = [...silentRegions].sort((a, b) => b.duration - a.duration).slice(0, targetCount - 1);
    boundaries = topGaps.map(g => g.mid).sort((a, b) => a - b);
  }

  const starts = [0, ...boundaries];
  const ends = [...boundaries, audio.duration];

  const segments: AudioSegment[] = starts.map((s, i) => ({
    id: `${Date.now()}-${i}`,
    start: Number(s.toFixed(3)),
    end: Number(ends[i].toFixed(3)),
    speaker: (i % 2 === 1 ? "teacher" : "kids") as "teacher" | "kids",
    label: `مقطع ${i + 1}`,
  }));

  ctx.close();
  return { segments, duration: audio.duration };
}

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00.00";
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(2).padStart(5, "0");
  return `${m}:${sec}`;
};

const TimingsRecorder = () => {
  const [surahNum, setSurahNum] = useState(1);
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [playingSegId, setPlayingSegId] = useState<string | null>(null);
  const [silenceThreshold, setSilenceThreshold] = useState(0.02);
  const [minSilenceMs, setMinSilenceMs] = useState(400);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef<{ end: number; id: string } | null>(null);

  useEffect(() => {
    const saved = getSavedTimings()[surahNum];
    if (saved) {
      setSegments(saved.segments || []);
    } else {
      setSegments([]);
    }
  }, [surahNum]);

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return;
    if (isPlaying) { a.pause(); setPlayingSegId(null); stopAtRef.current = null; }
    else a.play().catch(() => {});
  };

  const resetAll = () => {
    setSegments([]);
    setPlayingSegId(null);
    stopAtRef.current = null;
    const a = audioRef.current; if (a) { a.pause(); a.currentTime = 0; }
  };

  const autoDetectSegments = async (forceCount = 0) => {
    const a = audioRef.current; if (!a) return;
    setDetecting(true);
    try {
      const { segments: detected } = await detectAudioSegments(
        a.src, forceCount, silenceThreshold, minSilenceMs
      );
      const surahName = SURAH_NAMES[surahNum] || `سورة ${surahNum}`;
      const labeled = detected.map((seg, index) => ({
        ...seg,
        label: `${surahName} - مقطع ${index + 1}`
      }));
      setSegments(labeled);
    } finally { setDetecting(false); }
  };

  const deleteSegment = useCallback((id: string) => {
    setSegments(items => items.filter(seg => seg.id !== id));
    if (playingSegId === id) {
      const a = audioRef.current;
      if (a) a.pause();
      setPlayingSegId(null);
      stopAtRef.current = null;
    }
  }, [playingSegId]);

  const mergeWithNext = useCallback((index: number) => {
    setSegments(items => {
      if (index >= items.length - 1) return items;
      const current = items[index];
      const next = items[index + 1];
      const merged: AudioSegment = {
        ...current,
        end: next.end,
      };
      return [
        ...items.slice(0, index),
        merged,
        ...items.slice(index + 2),
      ];
    });
    setPlayingSegId(null);
    stopAtRef.current = null;
    const a = audioRef.current; if (a) a.pause();
  }, []);

  const playSegment = useCallback((seg: AudioSegment) => {
    const a = audioRef.current; if (!a) return;
    if (playingSegId === seg.id) {
      a.pause();
      setPlayingSegId(null);
      stopAtRef.current = null;
      return;
    }
    a.currentTime = seg.start;
    stopAtRef.current = { end: seg.end, id: seg.id };
    setPlayingSegId(seg.id);
    a.play().catch(() => {});
  }, [playingSegId]);

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current; if (!a) return;
    setCurrent(a.currentTime);
    if (stopAtRef.current && a.currentTime >= stopAtRef.current.end - 0.02) {
      a.pause();
      setPlayingSegId(null);
      stopAtRef.current = null;
    }
  }, []);

  const applyAndSave = () => {
    const teacher = segments.filter(s => s.speaker === "teacher").map(s => s.start);
    const kids = segments.filter(s => s.speaker === "kids").map(s => s.start);
    const payload: SurahTimings = { teacher, segments };
    if (kids.length > 0) { payload.kids = kids; payload.kidsStart = kids[0]; }
    saveSurahTimings(surahNum, payload);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const clearSaved = () => {
    clearSavedSurahTimings(surahNum);
    resetAll();
  };

  const updateSegment = (id: string, patch: Partial<AudioSegment>) => {
    setSegments(items => items.map(seg => seg.id === id ? { ...seg, ...patch } : seg));
  };

  // Find which segment is currently active based on playback position
  const activeSegIndex = useMemo(() => {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (current >= segments[i].start && current < segments[i].end) return i;
    }
    return -1;
  }, [current, segments]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="text-center py-3">
          <h1 className="text-2xl font-bold font-amiri bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">
            🎙️ تقسيم الصوت للآيات
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            تقسيم ذكي عالي الدقة · استماع · حذف
          </p>
        </header>

        {/* Surah selector */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-4">
          <label className="text-sm font-bold text-slate-300 block mb-2">اختر السورة:</label>
          <select
            value={surahNum}
            onChange={(e) => setSurahNum(parseInt(e.target.value, 10))}
            className="w-full p-3 rounded-xl bg-slate-700 border border-slate-600 text-white font-amiri text-lg"
          >
            {Object.entries(SURAH_NAMES).map(([n, name]) => (
              <option key={n} value={n}>
                {n} — {name} ({AYAH_COUNTS[parseInt(n, 10)]} آيات)
              </option>
            ))}
          </select>
        </div>

        {/* Audio player */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-4 space-y-4">
          <audio
            ref={audioRef}
            src={audioPath(surahNum)}
            crossOrigin="anonymous"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 mr-[-2px]" />}
            </button>
            <div className="flex-1">
              <input
                type="range" min={0} max={duration || 0} step={0.01}
                value={current}
                onChange={(e) => { const a = audioRef.current; if (a) a.currentTime = parseFloat(e.target.value); }}
                className="w-full accent-emerald-500"
                dir="ltr"
              />
              <div className="flex justify-between text-xs tabular-nums text-slate-400 mt-1" dir="ltr">
                <span className="font-bold text-emerald-400">{fmt(current)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>
          </div>

          {/* AI Detection */}
          <div className="rounded-xl bg-violet-950/50 border border-violet-500/30 p-4 space-y-3">
            <p className="text-sm font-bold text-violet-300 flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> تقسيم ذكي AI عالي الدقة
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="block">
                <span className="text-violet-300">حد الصمت: {silenceThreshold.toFixed(3)}</span>
                <input type="range" min={0.003} max={0.05} step={0.001}
                  value={silenceThreshold} onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-violet-500" dir="ltr" />
              </label>
              <label className="block">
                <span className="text-violet-300">أقل صمت (مل): {minSilenceMs}</span>
                <input type="range" min={100} max={1500} step={25}
                  value={minSilenceMs} onChange={(e) => setMinSilenceMs(parseInt(e.target.value, 10))}
                  className="w-full accent-violet-500" dir="ltr" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => autoDetectSegments(0)}
                disabled={detecting || !duration}
                className="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-1 shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-transform text-xs"
              >
                {detecting ? "⏳ تحليل..." : "🤖 كشف كل المقاطع"}
              </button>
              <button
                onClick={() => autoDetectSegments(AYAH_COUNTS[surahNum] || 0)}
                disabled={detecting || !duration}
                className="p-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-1 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform text-xs"
              >
                {detecting ? "⏳ تحليل..." : `📐 تقسيم ${AYAH_COUNTS[surahNum]} آية`}
              </button>
            </div>
            <p className="text-[10px] text-violet-400 text-center">
              "كشف كل المقاطع" يجد جميع الفواصل الطبيعية · "تقسيم" يُطابق عدد الآيات
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={applyAndSave}
            className={`p-3 rounded-xl font-bold text-white shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-all ${savedFlash ? "bg-emerald-600 shadow-emerald-500/30" : "bg-gradient-to-r from-blue-600 to-blue-700 shadow-blue-500/20"}`}
          >
            {savedFlash ? <><Check className="w-5 h-5" /> تم الحفظ ✅</> : <><Save className="w-5 h-5" /> حفظ</>}
          </button>
           <button
            onClick={clearSaved}
            className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-400 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Trash2 className="w-5 h-5" /> حذف الكل
          </button>
        </div>

        {/* Link to calibrate */}
        {segments.length > 0 && (
          <Link
            to="/calibrate"
            className="block w-full p-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-amber-600/20 border border-violet-500/30 text-center font-bold text-sm text-violet-300 hover:text-white hover:border-violet-400 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>الانتقال لصفحة المعايرة (ربط الصوت بتظليل الآيات)</span>
            </div>
            <p className="text-xs text-violet-400/70 mt-1">بعد الحفظ، اذهب لصفحة /calibrate لربط المقاطع بالتظليل</p>
          </Link>
        )}

        {/* Segments list */}
        {segments.length > 0 && (
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-4">
            <p className="font-bold mb-3 text-sm text-slate-300">
              المقاطع ({segments.length}):
            </p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {segments.map((seg, i) => {
                const isActive = i === activeSegIndex;
                const isSegPlaying = playingSegId === seg.id;
                return (
                  <div
                    key={seg.id}
                    className={`rounded-xl p-3 transition-all border ${
                      isActive
                        ? "bg-emerald-950/50 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                        : isSegPlaying
                        ? "bg-violet-950/50 border-violet-500/50"
                        : "bg-slate-700/50 border-slate-600/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Play button */}
                      <button
                        onClick={() => playSegment(seg)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          isSegPlaying
                            ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                            : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                        }`}
                      >
                        {isSegPlaying ? <StopCircle className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <input
                          value={seg.label || ""}
                          onChange={(e) => updateSegment(seg.id, { label: e.target.value })}
                          className="bg-transparent text-sm font-bold w-full outline-none text-white placeholder:text-slate-500"
                          placeholder={`مقطع ${i + 1}`}
                        />
                        <div className="text-xs text-slate-400 font-mono" dir="ltr">
                          {fmt(seg.start)} → {fmt(seg.end)} · {(seg.end - seg.start).toFixed(1)}s
                        </div>
                      </div>

                      {/* Speaker */}
                      <select
                        value={seg.speaker}
                        onChange={(e) => updateSegment(seg.id, { speaker: e.target.value as AudioSegment["speaker"] })}
                        className="rounded-lg bg-slate-600 border-0 px-2 py-1 text-xs text-white"
                      >
                        <option value="teacher">معلم</option>
                        <option value="kids">طفل</option>
                      </select>

                      {/* Merge & Delete */}
                      <div className="flex gap-1">
                        {i < segments.length - 1 && (
                          <button
                            onClick={() => mergeWithNext(i)}
                            title="دمج مع المقطع التالي"
                            className="w-9 h-9 rounded-lg bg-blue-950/50 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteSegment(seg.id)}
                          title="حذف المقطع"
                          className="w-9 h-9 rounded-lg bg-red-950/50 text-red-400 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reset */}
        <button
          onClick={resetAll}
          className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <RotateCcw className="w-4 h-4" /> إعادة من الصفر
        </button>
      </div>
    </div>
  );
};

export default TimingsRecorder;
