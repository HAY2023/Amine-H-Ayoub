import { useState, useMemo } from "react";
import { Play, Pause, Search, X, Headphones, BookOpen } from "lucide-react";
import { SurahItem } from "@/hooks/useSurahData";

interface Props {
  surahs: SurahItem[];
  currentPlaying: number | null;
  isPlaying: boolean;
  onSelect: (surah: SurahItem) => void;
  onClose: () => void;
}

/**
 * لوحة جانبية تعرض قائمة السور في وضع التقسيم (Split View).
 * تظهر بجانب صفحة المصحف أو في صفحة التلاوات.
 */
export default function SplitViewPanel({ surahs, currentPlaying, isPlaying, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");

  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return surahs;
    const q = search.trim();
    const qNum = parseInt(q, 10);
    const isNumberSearch = /^\d+$/.test(q);
    
    return surahs.filter(s => {
      // إذا كان البحث رقماً، ابحث بالرقم
      if (isNumberSearch) {
        // تطابق كامل أو بداية الرقم
        return String(s.number) === q || String(s.number).startsWith(q);
      }
      // وإلا ابحث بالاسم
      return s.name.includes(q);
    });
  }, [surahs, search]);

  const playingIdx = currentPlaying !== null ? surahs.findIndex(s => s.number === currentPlaying) : -1;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{
      background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.98))",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Headphones className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold font-amiri text-base leading-tight">قائمة التلاوات</h2>
            <p className="text-[10px] text-white/40">{surahs.length} سورة</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
          aria-label="إغلاق التقسيم"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Now Playing */}
      {currentPlaying !== null && playingIdx >= 0 && (
        <div className="px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              {isPlaying ? (
                <div className="flex items-center gap-[2px] h-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-[2px] bg-white rounded-full animate-wave"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
              ) : (
                <Pause className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-amiri font-bold text-sm text-amber-300 leading-tight truncate">
                {surahs[playingIdx]?.name}
              </p>
              <p className="text-[10px] text-amber-400/60 mt-0.5">
                {isPlaying ? "جاري التشغيل..." : "متوقف مؤقتاً"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرقم..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 outline-none focus:border-amber-400/50 focus:bg-white/8 transition-all"
            dir="rtl"
          />
        </div>
      </div>

      {/* Surah List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
        {filteredSurahs.map((surah, idx) => {
          const isActive = currentPlaying === surah.number;
          const originalIdx = surahs.findIndex(s => s.number === surah.number);
          return (
            <button
              key={surah.number}
              onClick={() => onSelect(surah)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all duration-200 group ${
                isActive
                  ? "bg-amber-400/15 border border-amber-400/30"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              {/* Number */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                isActive
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20"
                  : "bg-white/8 text-white/50 group-hover:bg-white/12 group-hover:text-white/70"
              }`}>
                {surah.number}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`font-amiri font-bold text-sm leading-tight truncate ${
                  isActive ? "text-amber-300" : "text-white/80 group-hover:text-white"
                }`}>
                  {surah.name}
                </p>
              </div>

              {/* Play indicator */}
              {isActive && isPlaying ? (
                <div className="flex items-center gap-[2px] h-4 shrink-0">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-[2px] bg-amber-400 rounded-full animate-wave"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
              ) : (
                <Play className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                  isActive ? "text-amber-400 opacity-100" : "text-white/30 opacity-0 group-hover:opacity-100"
                }`} />
              )}
            </button>
          );
        })}

        {filteredSurahs.length === 0 && (
          <div className="text-center py-8 text-white/30 text-sm">
            لا توجد نتائج
          </div>
        )}
      </div>
    </div>
  );
}
