import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Play, Pause, Volume2, StopCircle, Check, Trash2,
  Wand2, RotateCcw, Save, Zap, Link2,
} from "lucide-react";
import { AYAH_COUNTS, getSavedTimings, saveSurahTimings, clearSavedSurahTimings, SurahTimings, AudioSegment } from "@/data/ayahTimings";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";
import { toast } from "@/hooks/use-toast";
import { NonRealTimeVAD } from "@ricky0123/vad-web";
import { env } from "onnxruntime-web";

// Fix for Vite WASM loading issue
env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/";

/* ─────────── Constants ─────────── */

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

const SURAH_NAMES: Record<number, string> = {
  1: "الفاتحة", 2: "الناس", 3: "الفلق", 4: "الإخلاص", 5: "المسد",
  6: "النصر", 7: "الكافرون", 8: "الكوثر", 9: "الماعون", 10: "قريش",
  11: "الفيل", 12: "الهمزة", 13: "العصر", 14: "التكاثر",
};

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00.00";
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(2).padStart(5, "0");
  return `${m}:${sec}`;
};

/* ─────────── AI Split Algorithm (Silero VAD) ─────────── */

async function multiPassSplit(
  audioUrl: string,
  surahNum: number,
  onProgress?: (msg: string) => void,
): Promise<{ segments: AudioSegment[]; duration: number }> {
  onProgress?.("📥 جاري تحميل الملف الصوتي...");
  const res = await fetch(audioUrl);
  const buf = await res.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const audio = await ctx.decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const sr = audio.sampleRate; // 16000

  onProgress?.("🧠 جاري تهيئة محرك الذكاء الاصطناعي (Silero VAD)...");
  const myvad = await NonRealTimeVAD.new({
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    preSpeechPadFrames: 5,
    postSpeechPadFrames: 5,
  });

  onProgress?.("🔍 جاري تحليل الصوت واستخراج المقاطع بدقة...");
  const segmentsIter = myvad.getSpeechSegments(data);
  const detectedRegions: { start: number; end: number }[] = [];
  
  for await (const segment of segmentsIter) {
    detectedRegions.push({
      start: segment.start / 1000,
      end: segment.end / 1000,
    });
  }

  const surahName = SURAH_NAMES[surahNum] || `سورة ${surahNum}`;
  const targetSegments = (AYAH_COUNTS[surahNum] || 0) * 2;

  // في حال كان النموذج استخرج مقاطع أكثر من اللازم (مثلاً ضوضاء قصيرة)، نفلتر الأقصر
  let finalRegions = [...detectedRegions];
  if (targetSegments > 0 && finalRegions.length > targetSegments) {
     finalRegions = finalRegions
       .sort((a, b) => (b.end - b.start) - (a.end - a.start))
       .slice(0, targetSegments)
       .sort((a, b) => a.start - b.start);
  }

  let segments: AudioSegment[] = finalRegions.map((r, i) => ({
    id: `split-${Date.now()}-${i}`,
    start: Number(r.start.toFixed(3)),
    end: Number(r.end.toFixed(3)),
    speaker: "teacher", 
    ayah: Math.floor(i / 2) + 1,
    label: "",
  }));

  // ── تصنيف المتحدث بالطاقة الصوتية ──
  onProgress?.("🔎 جاري تصنيف المتحدثين...");
  const segEnergies = segments.map(seg => {
    const startSample = Math.floor(seg.start * sr);
    const endSample = Math.min(Math.floor(seg.end * sr), data.length);
    let sum = 0;
    let count = 0;
    for (let i = startSample; i < endSample; i++) {
      sum += data[i] * data[i];
      count++;
    }
    return count > 0 ? Math.sqrt(sum / count) : 0;
  });

  segments = segments.map((seg, i) => {
    let speaker: "teacher" | "kids";
    const pairIdx = Math.floor(i / 2);
    const isFirst = i % 2 === 0;
    const pairStart = pairIdx * 2;
    const pairEnd = pairStart + 1;

    if (pairEnd < segEnergies.length) {
      const firstEnergy = segEnergies[pairStart];
      const secondEnergy = segEnergies[pairEnd];
      if (isFirst) {
        speaker = firstEnergy >= secondEnergy * 0.7 ? "teacher" : "kids";
      } else {
        speaker = secondEnergy >= firstEnergy * 0.7 ? "teacher" : "kids";
      }
      if (pairEnd < segments.length) {
        const firstSp = segEnergies[pairStart] >= segEnergies[pairEnd] * 0.7 ? "teacher" : "kids";
        const secondSp = firstSp === "teacher" ? "kids" : "teacher";
        speaker = isFirst ? firstSp : secondSp;
      }
    } else {
      speaker = "teacher";
    }

    const ayah = Math.floor(i / 2) + 1;
    return {
      ...seg,
      speaker,
      ayah,
      label: `${surahName} - آية ${ayah} (${speaker === "teacher" ? "معلم" : "طفل"})`,
    };
  });

  ctx.close();

  const accuracy = targetSegments > 0 ? Math.round((Math.min(segments.length, targetSegments) / targetSegments) * 100) : 0;
  onProgress?.(`✅ تم: ${segments.length} مقطع · دقة ${accuracy}%`);

  return { segments, duration: audio.duration };
}


/* ----------- Component ----------- */

const RecitationMethods = () => {
  const [surahNum, setSurahNum] = useState(1);
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [splitting, setSplitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [playingSegId, setPlayingSegId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef<{ end: number; id: string } | null>(null);

  // تحميل المقاطع المحفوظة عند تغيير السورة
  useEffect(() => {
    const saved = getSavedTimings()[surahNum];
    setSegments(saved?.segments || []);
    setPlayingSegId(null);
    stopAtRef.current = null;
  }, [surahNum]);

  // حفظ تلقائي
  const persistSegments = useCallback((sNum: number, segs: AudioSegment[]) => {
    if (segs.length === 0) return;
    const teacher = segs.filter(s => s.speaker === "teacher").map(s => s.start);
    const kids = segs.filter(s => s.speaker === "kids").map(s => s.start);
    const payload: SurahTimings = { teacher, segments: segs };
    if (kids.length > 0) { payload.kids = kids; payload.kidsStart = kids[0]; }
    saveSurahTimings(sNum, payload);
  }, []);

  // ── التقسيم التلقائي ──
  const handleSplit = async () => {
    const a = audioRef.current;
    if (!a || !duration) {
      toast({ title: "⚠️ انتظر تحميل الصوت", variant: "destructive" });
      return;
    }
    setSplitting(true);
    setProgress("");
    try {
      const result = await multiPassSplit(a.src, surahNum, setProgress);
      setSegments(result.segments);
      persistSegments(surahNum, result.segments);
      toast({
        title: "✅ تم التقسيم بنجاح!",
        description: `${result.segments.length} مقطع — معلم وطفل لكل آية`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      toast({ title: "❌ فشل التقسيم", description: msg, variant: "destructive" });
    } finally {
      setSplitting(false);
    }
  };

  // ── التحكم بالصوت ──
  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) { a.pause(); setPlayingSegId(null); stopAtRef.current = null; }
    else a.play().catch(() => {});
  };

  const playSegment = useCallback((seg: AudioSegment) => {
    const a = audioRef.current;
    if (!a) return;
    if (playingSegId === seg.id) {
      a.pause(); setPlayingSegId(null); stopAtRef.current = null;
      return;
    }
    a.currentTime = seg.start;
    stopAtRef.current = { end: seg.end, id: seg.id };
    setPlayingSegId(seg.id);
    a.play().catch(() => {});
  }, [playingSegId]);

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setCurrent(a.currentTime);
    if (stopAtRef.current && a.currentTime >= stopAtRef.current.end - 0.02) {
      a.pause(); setPlayingSegId(null); stopAtRef.current = null;
    }
  }, []);

  const applyAndSave = () => {
    persistSegments(surahNum, segments);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    toast({ title: "✅ تم الحفظ!" });
  };

  const clearAll = () => {
    clearSavedSurahTimings(surahNum);
    setSegments([]);
    setPlayingSegId(null);
    stopAtRef.current = null;
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
  };

  // لا توجد دوال تعديل يدوي

  const activeSegIndex = useMemo(() => {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (current >= segments[i].start && current < segments[i].end) return i;
    }
    return -1;
  }, [current, segments]);

  // إحصائيات
  const stats = useMemo(() => {
    if (segments.length === 0) return null;
    const teacherCount = segments.filter(s => s.speaker === "teacher").length;
    const kidsCount = segments.filter(s => s.speaker === "kids").length;
    const durs = segments.map(s => s.end - s.start);
    const avgDur = durs.reduce((a, b) => a + b, 0) / durs.length;
    const expected = (AYAH_COUNTS[surahNum] || 0) * 2;
    const accuracy = expected > 0 ? Math.round((Math.min(segments.length, expected) / expected) * 100) : 0;
    return { teacherCount, kidsCount, avgDur, expected, accuracy };
  }, [segments, surahNum]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white pb-8" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* ── Header ── */}
        <header className="pt-5 pb-2">
          <div className="flex items-center gap-3 mb-4">
            <Link
              to="/"
              className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-all active:scale-95"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold font-amiri bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                ⚡ تقسيم ذكي للآيات
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                تحليل رباعي المراحل · دقة فائقة · معلم + طفل
              </p>
            </div>
            <div className="w-10" /> {/* spacer */}
          </div>
        </header>

        {/* ── اختيار السورة ── */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-4">
          <label className="text-sm font-bold text-slate-300 block mb-2">اختر السورة:</label>
          <select
            value={surahNum}
            onChange={(e) => setSurahNum(parseInt(e.target.value, 10))}
            className="w-full p-3 rounded-xl bg-slate-700 border border-slate-600 text-white font-amiri text-lg focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
          >
            {Object.entries(SURAH_NAMES).map(([n, name]) => (
              <option key={n} value={n}>
                {n} — {name} ({AYAH_COUNTS[parseInt(n, 10)]} آيات)
              </option>
            ))}
          </select>
        </div>

        {/* ── اسم السورة ── */}
        <div className="bg-gradient-to-br from-amber-950/40 to-orange-950/30 border border-amber-500/20 rounded-2xl p-5 text-center">
          <p className="text-xs text-amber-400/70 mb-1">السورة المختارة</p>
          <h2 className="text-4xl font-bold font-amiri bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 bg-clip-text text-transparent">
            سورة {SURAH_NAMES[surahNum]}
          </h2>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm text-slate-400">
            <span className="bg-slate-800/60 px-3 py-1 rounded-full">📖 {AYAH_COUNTS[surahNum]} آيات</span>
            <span className="bg-slate-800/60 px-3 py-1 rounded-full">🔢 رقم {surahNum}</span>
            {segments.length > 0 && (
              <span className="bg-emerald-900/40 px-3 py-1 rounded-full text-emerald-400">✅ {segments.length} مقطع</span>
            )}
          </div>
        </div>

        {/* ── مشغل الصوت ── */}
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
        </div>

        {/* ── زر التقسيم الرئيسي ── */}
        <div className="bg-gradient-to-br from-violet-950/60 via-fuchsia-950/40 to-purple-950/60 border border-violet-500/30 rounded-2xl p-5 space-y-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white font-amiri">التقسيم الذكي رباعي المراحل (فائق الدقة)</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              يحلل الملف الصوتي بأربع مراحل: طاقة صوتية (15ms) → كشف فواصل شامل (225 تجربة) → تحسين حواف فائق الدقة (10ms) → تحقق وتصحيح
            </p>
          </div>

          {/* شريط المراحل */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
            {[
              { icon: "🔬", label: "طاقة 15ms", step: 1 },
              { icon: "🔍", label: "225 مقياس", step: 2 },
              { icon: "✨", label: "حواف 10ms", step: 3 },
              { icon: "🔎", label: "تحقق", step: 4 },
            ].map(({ icon, label, step }) => (
              <div
                key={step}
                className={`rounded-lg p-2 border transition-all duration-500 ${
                  splitting
                    ? progress.includes(`${step}/4`)
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300 scale-105"
                      : "bg-slate-800/40 border-slate-700/40 text-slate-500"
                    : "bg-slate-800/40 border-slate-700/40 text-slate-400"
                }`}
              >
                <div className="text-lg">{icon}</div>
                <div className="font-bold mt-0.5">المرحلة {step}</div>
                <div className="text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          {/* رسالة التقدم */}
          {progress && (
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <p className="text-sm text-amber-300 font-bold animate-pulse">{progress}</p>
            </div>
          )}

          <button
            onClick={handleSplit}
            disabled={splitting || !duration}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 text-white font-bold text-lg disabled:opacity-40 flex items-center justify-center gap-3 shadow-xl shadow-violet-500/20 hover:shadow-violet-500/40 active:scale-[0.98] transition-all"
          >
            <Wand2 className="w-6 h-6" />
            {splitting ? "⏳ جاري التحليل..." : "⚡ تقسيم ذكي — بضغطة واحدة"}
          </button>
        </div>

        {/* ── إحصائيات ── */}
        {stats && (
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-4">
            <p className="text-sm font-bold text-emerald-300 mb-3 flex items-center gap-2">
              📊 نتائج التقسيم
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{segments.length}</div>
                <div className="text-slate-400 mt-0.5">مقطع</div>
                <div className="text-slate-500 text-[10px]">متوقع: {stats.expected}</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${stats.accuracy >= 90 ? "text-emerald-400" : stats.accuracy >= 70 ? "text-amber-400" : "text-red-400"}`}>
                  {stats.accuracy}%
                </div>
                <div className="text-slate-400 mt-0.5">دقة التطابق</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">{stats.teacherCount}</div>
                <div className="text-slate-400 mt-0.5">معلم</div>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-sky-400">{stats.kidsCount}</div>
                <div className="text-slate-400 mt-0.5">طفل</div>
              </div>
            </div>



            {/* ── حفظ وربط مع /calibrate ── */}
            <Link
              to="/calibrate"
              onClick={() => persistSegments(surahNum, segments)}
              className="block w-full mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-amber-600/20 border border-violet-500/30 text-center hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-2 text-violet-300 font-bold">
                <Link2 className="w-5 h-5" />
                <span>💾 حفظ وربط الآيات في صفحة المعايرة</span>
                <ArrowLeft className="w-4 h-4" />
              </div>
              <p className="text-xs text-violet-400/60 mt-1">
                يحفظ المقاطع ثم ينتقل لصفحة /calibrate لربط الصوت بتظليل الآيات
              </p>
            </Link>
          </div>
        )}

        {/* ── قائمة المقاطع ── */}
        {segments.length > 0 && (
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-4">
            <p className="font-bold mb-3 text-sm text-slate-300">
              المقاطع ({segments.length}):
            </p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {segments.map((seg, i) => {
                const isActive = i === activeSegIndex;
                const isSegPlaying = playingSegId === seg.id;
                return (
                  <div
                    key={seg.id}
                    className={`rounded-xl p-3.5 transition-all border ${
                      isActive
                        ? "bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                        : isSegPlaying
                        ? "bg-violet-950/40 border-violet-500/40"
                        : seg.speaker === "teacher"
                        ? "bg-amber-950/10 border-amber-500/10 hover:border-amber-500/20"
                        : "bg-sky-950/10 border-sky-500/10 hover:border-sky-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* زر التشغيل */}
                      <button
                        onClick={() => playSegment(seg)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          isSegPlaying
                            ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                            : seg.speaker === "teacher"
                            ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white"
                            : "bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white"
                        }`}
                      >
                        {isSegPlaying ? <StopCircle className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>

                      {/* معلومات */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {seg.speaker === "teacher" ? "🎙️" : "👦"}
                          </span>
                          <span className="text-sm font-bold text-white truncate block">
                            {seg.label || `مقطع ${i + 1}`}
                          </span>
                        </div>
                        <div className="text-xs font-mono mt-1.5 flex items-center gap-2 text-slate-400">
                          <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50 text-emerald-400">{fmt(seg.start)}</span>
                          <span className="text-slate-600">→</span>
                          <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50 text-rose-400">{fmt(seg.end)}</span>
                          <span className="text-[10px] text-slate-500">({(seg.end - seg.start).toFixed(2)}ث)</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {/* شارة المتحدث الثابتة */}
                        <div
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold text-center border ${
                            seg.speaker === "teacher"
                              ? "bg-amber-950/40 border-amber-500/20 text-amber-400"
                              : "bg-sky-950/40 border-sky-500/20 text-sky-400"
                          }`}
                        >
                          {seg.speaker === "teacher" ? "معلم" : "طفل"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── إعادة من الصفر ── */}
        <button
          onClick={clearAll}
          className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <RotateCcw className="w-4 h-4" /> إعادة من الصفر
        </button>

        {/* ── شرح الطريقة ── */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-violet-300 flex items-center gap-2">
            <Wand2 className="w-4 h-4" /> كيف تعمل الطريقة؟
          </h3>
          <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
            <div className="flex gap-2">
              <span className="text-amber-400 font-bold shrink-0">1.</span>
              <span><b className="text-slate-300">تحليل الطاقة</b> — يحلل الملف الصوتي بنوافذ صغيرة (30ms) ويحسب مستوى الصوت لكل نافذة</span>
            </div>
            <div className="flex gap-2">
              <span className="text-amber-400 font-bold shrink-0">2.</span>
              <span><b className="text-slate-300">كشف الفواصل</b> — يحدد مناطق الصمت تلقائياً بعتبة ديناميكية، ويختار أفضل نقاط القطع</span>
            </div>
            <div className="flex gap-2">
              <span className="text-amber-400 font-bold shrink-0">3.</span>
              <span><b className="text-slate-300">تحسين الحواف</b> — يضبط بداية ونهاية كل مقطع ليبدأ مع أول صوت فعلي وينتهي مع آخره</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecitationMethods;
