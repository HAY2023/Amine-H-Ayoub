import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Play, Pause, Volume2, SkipBack, SkipForward, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { getAllSurahs } from "../data/quranData";

const QuranViewer = () => {
  const surahs = getAllSurahs();
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const filteredSurahs = useMemo(() => {
    return surahs.filter(s =>
      s.name.includes(searchQuery) ||
      s.number.toString().includes(searchQuery)
    );
  }, [surahs, searchQuery]);

  const currentSurah = surahs.find(s => s.number === selectedSurah);
  // استخدم الـ public path الصحيح
  const audioUrl = new URL(`/audio/surahs/${selectedSurah}.mp3`, window.location.origin).href;

  // تحديث الصوت عند تغيير السورة
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      setCurrentTime(0);
      setAudioError(null);
      setIsPlaying(false);
    }
  }, [selectedSurah, audioUrl]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    try {
      setAudioError(null);
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      setAudioError("خطأ في التشغيل");
      setIsPlaying(false);
    }
  };

  const handlePrevious = () => {
    if (selectedSurah > 1) {
      setSelectedSurah(selectedSurah - 1);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (selectedSurah < surahs.length) {
      setSelectedSurah(selectedSurah + 1);
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <header className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 border-b border-amber-700/30 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-amber-400">📖 القرآن الكريم</h1>
          <Link
            to="/upload"
            aria-label="الذهاب إلى صفحة رفع الملفات"
            title="رفع صوت وصور"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-bold transition"
          >
            📤 رفع
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col max-h-96 md:max-h-full">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white mb-3">📚 السور</h2>
            <div className="relative">
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن سورة..."
                aria-label="البحث عن سورة"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 p-2">
            {filteredSurahs.map((surah) => (
              <button
                key={surah.number}
                onClick={() => {
                  setSelectedSurah(surah.number);
                  setIsPlaying(false);
                }}
                className={`w-full text-right px-3 py-2 rounded-lg transition text-sm ${
                  selectedSurah === surah.number
                    ? "bg-amber-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{surah.name}</span>
                  <span className="opacity-70 text-xs">{surah.number}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-4 space-y-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-b border-amber-700/30 p-4 md:p-6 text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-amber-400">سورة {currentSurah?.name}</h1>
              <p className="text-slate-400 text-sm mt-1">عدد الآيات: {currentSurah?.ayahCount}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 text-center min-h-64">
              <div style={{ fontSize: `${fontSize}px` }} className="leading-relaxed text-amber-100 font-amiri">
                <p className="text-amber-400 mb-6">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                <p className="text-amber-200">[نص السورة {currentSurah?.name}]</p>
              </div>
            </div>

            <div className="border-t border-slate-700 p-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setFontSize(Math.max(16, fontSize - 2))}
                aria-label="تصغير حجم النص"
                title="تصغير حجم النص"
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                −
              </button>
              <span className="text-sm text-slate-400 min-w-12" aria-live="polite">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                aria-label="تكبير حجم النص"
                title="تكبير حجم النص"
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <audio
              ref={audioRef}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
              onError={(e) => {
                console.error("Audio error:", e.currentTarget.error);
                setAudioError(`خطأ: ${e.currentTarget.error?.message || "تحميل الصوت"}`);
                setIsPlaying(false);
              }}
              crossOrigin="use-credentials"
              preload="auto"
              controlsList="nodownload"
            />

            {audioError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-red-400 text-sm">{audioError}</p>
                  <p className="text-red-300 text-xs">الملف: {audioUrl}</p>
                </div>
              </div>
            )}

            <div className="flex justify-center mb-6">
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "إيقاف التشغيل" : "تشغيل السورة"}
                title={isPlaying ? "إيقاف التشغيل" : "تشغيل السورة"}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 flex items-center justify-center shadow-lg"
              >
                {isPlaying ? (
                  <Pause className="w-10 h-10 text-white" />
                ) : (
                  <Play className="w-10 h-10 text-white ml-1" />
                )}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={(e) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = parseFloat(e.target.value);
                  }
                }}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={selectedSurah === 1}
                aria-label="السورة السابقة"
                title="السورة السابقة"
                className="p-2 hover:bg-slate-700 disabled:opacity-50 rounded-lg"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                aria-label="التحكم بمستوى الصوت"
                title="التحكم بمستوى الصوت"
                className="p-2 hover:bg-slate-700 rounded-lg">
                <Volume2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                disabled={selectedSurah === surahs.length}
                aria-label="السورة التالية"
                title="السورة التالية"
                className="p-2 hover:bg-slate-700 disabled:opacity-50 rounded-lg"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg text-sm text-slate-300">
              <p>📖 {currentSurah?.name} • 🔢 {currentSurah?.ayahCount} آيات</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuranViewer;
