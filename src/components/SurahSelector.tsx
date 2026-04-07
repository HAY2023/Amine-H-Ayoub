import { surahs } from "@/data/surahs";

interface Props {
  selectedSurah: number | null;
  selectedAyah: number | null;
  ayahCount: number;
  onSurahChange: (v: number | null) => void;
  onAyahChange: (v: number | null) => void;
}

const SurahSelector = ({
  selectedSurah,
  selectedAyah,
  ayahCount,
  onSurahChange,
  onAyahChange,
}: Props) => {
  return (
    <div className="bg-card rounded-lg shadow-md p-6 space-y-4 border border-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Surah selector */}
        <div className="space-y-2">
          <label className="block text-lg font-bold text-foreground">
            اختر السورة
          </label>
          <select
            value={selectedSurah ?? ""}
            onChange={(e) =>
              onSurahChange(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full p-4 text-lg rounded-lg border-2 border-input bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-ring/30 outline-none transition-all"
          >
            <option value="">-- اختر السورة --</option>
            {surahs.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ayah selector */}
        <div className="space-y-2">
          <label className="block text-lg font-bold text-foreground">
            اختر الآية
          </label>
          <select
            value={selectedAyah ?? ""}
            onChange={(e) =>
              onAyahChange(e.target.value ? Number(e.target.value) : null)
            }
            disabled={!selectedSurah}
            className="w-full p-4 text-lg rounded-lg border-2 border-input bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-ring/30 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">-- اختر الآية --</option>
            {Array.from({ length: ayahCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                الآية {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default SurahSelector;
