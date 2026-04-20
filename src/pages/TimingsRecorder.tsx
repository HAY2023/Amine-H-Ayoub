import { useState, useRef, useMemo } from "react";
import { Play, Pause, RotateCcw, Copy, Bookmark, Baby } from "lucide-react";
import { AYAH_COUNTS } from "@/data/ayahTimings";
import { getSurahAudioUrl, hasCloudAudio } from "@/data/audioUrls";

const audioPath = (n: number) => (hasCloudAudio(n) ? getSurahAudioUrl(n) : `/audio/surahs/${n}.mp3`);

const SURAH_NAMES: Record<number, string> = {
  1: "الفاتحة", 2: "الناس", 3: "الفلق", 4: "الإخلاص", 5: "المسد",
  6: "النصر", 7: "الكافرون", 8: "الكوثر", 9: "الماعون", 10: "قريش",
  11: "الفيل", 12: "الهمزة", 13: "العصر", 14: "التكاثر",
};

/**
 * أداة تسجيل توقيتات الآيات
 * - اختر السورة
 * - شغّل الصوت واضغط "بداية آية" عند بداية كل آية للمعلم
 * - اضغط "بداية صوت الطفل" عند بدء قراءة الطفل (إن وُجد)
 * - بعد ذلك اضغط "بداية آية" لكل آية في قسم الطفل
 * - انسخ JSON الناتج وألصقه في src/data/ayahTimings.ts
 */
const TimingsRecorder = () => {
  const [surahNum, setSurahNum] = useState(1);
  const [teacher, setTeacher] = useState<number[]>([]);
  const [kids, setKids] = useState<number[]>([]);
  const [kidsStart, setKidsStart] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const ayahCount = AYAH_COUNTS[surahNum] || 0;
  const inKidsSection = kidsStart !== null && current >= kidsStart;

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return;
    if (isPlaying) a.pause(); else a.play().catch(() => {});
  };

  const resetAll = () => {
    setTeacher([]); setKids([]); setKidsStart(null);
    const a = audioRef.current; if (a) { a.pause(); a.currentTime = 0; }
  };

  const markAyah = () => {
    const t = parseFloat(current.toFixed(2));
    if (inKidsSection) setKids(k => [...k, t]);
    else setTeacher(arr => [...arr, t]);
  };

  const markKidsStart = () => {
    setKidsStart(parseFloat(current.toFixed(2)));
  };

  const popLast = () => {
    if (inKidsSection && kids.length > 0) setKids(k => k.slice(0, -1));
    else if (teacher.length > 0) setTeacher(arr => arr.slice(0, -1));
  };

  const json = useMemo(() => {
    const obj: Record<string, unknown> = { teacher };
    if (kidsStart !== null) {
      obj.kidsStart = kidsStart;
      obj.kids = kids;
    }
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
            شغّل الصوت واضغط "بداية آية" عند سماع بداية كل آية، ثم انسخ JSON
          </p>
        </header>

        {/* Surah picker */}
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="text-sm font-bold block mb-2">السورة:</label>
          <select
            value={surahNum}
            onChange={(e) => { setSurahNum(parseInt(e.target.value, 10)); resetAll(); }}
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

          {/* Mark buttons */}
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
            <p className="font-bold text-sm">JSON — الصق داخل AYAH_TIMINGS:</p>
            <button onClick={copy} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-bold">
              <Copy className="w-3.5 h-3.5" /> نسخ
            </button>
          </div>
          <pre className="text-xs bg-background border border-border rounded p-3 overflow-x-auto font-mono" dir="ltr">
{json}
          </pre>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          افتح <code>src/data/ayahTimings.ts</code> والصق الناتج داخل <code>AYAH_TIMINGS</code>
        </p>
      </div>
    </div>
  );
};

export default TimingsRecorder;
