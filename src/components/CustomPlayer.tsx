import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Music, Gauge } from "lucide-react";

interface Props {
  surahName: string;
  surahNumber: number;
  driveId: string;
  onClose: () => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const CustomPlayer = ({ surahName, surahNumber, driveId, onClose }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Direct download URL from Google Drive
  const audioSrc = `https://drive.google.com/uc?export=download&id=${driveId}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setLoading(true);
    setError(false);
    setIsPlaying(false);
    audio.load();
  }, [driveId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
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

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[68px] left-0 right-0 z-50 px-3 pb-2">
      <div
        className="rounded-2xl shadow-2xl overflow-hidden border border-border/50"
        style={{
          background: "rgba(245,240,230,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <span className="text-accent font-bold text-sm">{surahNumber}</span>
            </div>
            <div className="text-right min-w-0">
              <p className="font-bold text-foreground font-amiri text-base leading-tight truncate">
                سورة {surahName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isPlaying ? (
                  <div className="flex items-center gap-[2px] h-3">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="w-[2px] bg-accent rounded-full animate-wave"
                        style={{ animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  <Music className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {loading ? "جاري التحميل..." : error ? "خطأ في التشغيل" : isPlaying ? "جاري التشغيل" : "جاهز"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-4 pb-3 flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={loading || error}
            className="w-11 h-11 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            aria-label={isPlaying ? "إيقاف" : "تشغيل"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 mr-[-2px]" />}
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={seek}
              className="w-full h-1.5 accent-accent cursor-pointer"
              dir="ltr"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums" dir="ltr">
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Speed control */}
          <button
            onClick={() => {
              const idx = SPEEDS.indexOf(speed);
              setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
            }}
            className="shrink-0 flex items-center gap-1 px-2.5 h-9 rounded-full bg-background/70 border border-border/50 text-xs font-bold text-foreground hover:bg-background transition-colors"
            aria-label="سرعة التلاوة"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span className="tabular-nums">{speed}×</span>
          </button>
        </div>

        {/* Hidden HTML5 audio */}
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onLoadedMetadata={(e) => {
            setDuration((e.target as HTMLAudioElement).duration);
            setLoading(false);
          }}
          onCanPlay={() => setLoading(false)}
          onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
};

export default CustomPlayer;
