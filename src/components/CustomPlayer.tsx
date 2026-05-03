import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { X, Play, Pause, Music, Repeat, SkipForward, SkipBack } from "lucide-react";

interface Props {
  surahName: string;
  surahNumber: number;
  audioSrc: string;
  initialTime?: number;
  onClose: () => void;
  onTimeUpdate?: (time: number) => void;
  onPlayNext?: () => void;
  onPlayPrev?: () => void;
  autoNext?: boolean;
  onToggleAutoNext?: () => void;
}

export interface CustomPlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
}

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const CustomPlayer = forwardRef<CustomPlayerHandle, Props>(
  ({ surahName, surahNumber, audioSrc, initialTime = 0, onClose, onTimeUpdate, onPlayNext, onPlayPrev, autoNext = false, onToggleAutoNext }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(initialTime);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [loop, setLoop] = useState(false);
    const initialTimeApplied = useRef(false);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        const a = audioRef.current;
        if (!a) return;
        a.currentTime = seconds;
        setCurrent(seconds);
        a.play().catch(() => {});
      },
      play: () => {
        audioRef.current?.play().catch(() => {});
      },
    }));

    useEffect(() => {
      setLoading(true);
      setError(false);
      setIsPlaying(false);
      initialTimeApplied.current = false;
      audioRef.current?.load();
    }, [audioSrc]);

    useEffect(() => {
      if (audioRef.current) audioRef.current.loop = loop;
    }, [loop]);

    const togglePlay = async () => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        if (isPlaying) audio.pause();
        else await audio.play();
      } catch (e) {
        console.error("Audio play error:", e);
        setError(true);
      }
    };

    const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      const t = (parseFloat(e.target.value) / 100) * (duration || 0);
      audio.currentTime = t;
      setCurrent(t);
    };

    const skipBack = () => {
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = Math.max(0, a.currentTime - 10);
    };

    const skipForward = () => {
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = Math.min(duration, a.currentTime + 10);
    };

    const progress = duration > 0 ? (current / duration) * 100 : 0;

    return (
      <div className="fixed bottom-[68px] left-0 right-0 z-50 px-3 pb-2 md:max-w-2xl md:left-1/2 md:-translate-x-1/2">
        <div
          className="rounded-2xl shadow-2xl overflow-hidden border border-white/10"
          style={{
            background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.95))",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Top row: surah info + close */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                <span className="text-white font-black text-sm">{surahNumber}</span>
              </div>
              <div className="text-right min-w-0">
                <p className="font-bold text-white font-amiri text-base leading-tight truncate">
                  سورة {surahName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isPlaying ? (
                    <div className="flex items-center gap-[2px] h-3">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="w-[2px] bg-amber-400 rounded-full animate-wave"
                          style={{ animationDelay: `${i * 0.12}s` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <Music className="w-3 h-3 text-slate-400" />
                  )}
                  <span className="text-xs text-slate-400">
                    {loading ? "جاري التحميل..." : error ? "خطأ في التشغيل" : isPlaying ? "جاري التشغيل" : "جاهز"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-4 pt-2">
            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress}
              onChange={seek}
              className="w-full h-6 opacity-0 absolute -mt-4 cursor-pointer"
              dir="ltr"
            />
            <div className="flex justify-between text-[10px] text-slate-500 tabular-nums mt-1" dir="ltr">
              <span className="text-amber-400">{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls row */}
          <div className="px-4 pb-3 pt-1 flex items-center justify-between">
            {/* Left: repeat */}
            <button
              onClick={() => setLoop(!loop)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                loop
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-white/5 text-slate-500 hover:text-white"
              }`}
              aria-label="تكرار"
              title={loop ? "إيقاف التكرار" : "تكرار السورة"}
            >
              <Repeat className="w-4 h-4" />
            </button>

            {/* Center: prev, back10, play, fwd10, next */}
            <div className="flex items-center gap-2">
              {onPlayPrev && (
                <button
                  onClick={onPlayPrev}
                  className="w-9 h-9 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:text-white transition-colors"
                  aria-label="السورة السابقة"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={skipBack}
                className="w-9 h-9 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:text-white transition-colors text-[10px] font-bold"
                aria-label="رجوع 10 ثوانٍ"
              >
                -10
              </button>

              <button
                onClick={togglePlay}
                disabled={loading || error}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={isPlaying ? "إيقاف" : "تشغيل"}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 mr-[-2px]" />}
              </button>

              <button
                onClick={skipForward}
                className="w-9 h-9 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:text-white transition-colors text-[10px] font-bold"
                aria-label="تقدم 10 ثوانٍ"
              >
                +10
              </button>

              {onPlayNext && (
                <button
                  onClick={onPlayNext}
                  className="w-9 h-9 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:text-white transition-colors"
                  aria-label="السورة التالية"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Right: auto-next toggle */}
            {onToggleAutoNext && (
              <button
                onClick={onToggleAutoNext}
                className={`px-2 h-9 rounded-full flex items-center justify-center gap-1 text-[10px] font-bold transition-all ${
                  autoNext
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/5 text-slate-500 hover:text-white border border-transparent"
                }`}
                title={autoNext ? "إيقاف التشغيل التلقائي" : "تشغيل التالي تلقائياً"}
              >
                <SkipForward className="w-3 h-3" />
                تلقائي
              </button>
            )}
          </div>

          <audio
            ref={audioRef}
            src={audioSrc}
            preload="metadata"
            onLoadedMetadata={(e) => {
              const a = e.target as HTMLAudioElement;
              setDuration(a.duration);
              setLoading(false);
              if (!initialTimeApplied.current && initialTime > 0 && initialTime < a.duration) {
                a.currentTime = initialTime;
                setCurrent(initialTime);
              }
              initialTimeApplied.current = true;
            }}
            onCanPlay={() => setLoading(false)}
            onTimeUpdate={(e) => {
              const t = (e.target as HTMLAudioElement).currentTime;
              setCurrent(t);
              onTimeUpdate?.(t);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              onTimeUpdate?.(0);
              if (!loop && autoNext && onPlayNext) {
                onPlayNext();
              }
            }}
            onError={() => {
              setError(true);
              setLoading(false);
            }}
          />
        </div>
      </div>
    );
  }
);

CustomPlayer.displayName = "CustomPlayer";

export default CustomPlayer;
