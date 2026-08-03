import { useState, useEffect } from "react";
import { preloadImage } from "@/utils/lazyLoad";

interface Props {
  selectedSurah: number | null;
  selectedAyah: number | null;
}

const AyahDisplay = ({ selectedSurah, selectedAyah }: Props) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Preload image when surah/ayah changes
  useEffect(() => {
    if (selectedSurah && selectedAyah) {
      const imageSrc = `/images/${selectedSurah}_${selectedAyah}.png`;
      setIsLoading(true);
      preloadImage(imageSrc).then(() => setIsLoading(false)).catch(() => setIsLoading(false));
    }
  }, [selectedSurah, selectedAyah]);

  if (!selectedSurah || !selectedAyah) {
    return (
      <div className="bg-card rounded-lg shadow-md p-8 border border-border flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground text-xl text-center">
          اختر السورة والآية لعرض صورة الآية
        </p>
      </div>
    );
  }

  const imageSrc = `/images/${selectedSurah}_${selectedAyah}.png`;

  return (
    <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border border-border">
      <div className="flex items-center justify-center min-h-[150px]">
        {hasError ? (
          <p className="text-muted-foreground text-lg text-center">
            لم يتم العثور على صورة الآية
            <br />
            <span className="text-sm">({selectedSurah}_{selectedAyah}.png)</span>
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">جاري التحميل...</div>
          </div>
        ) : (
          <img
            key={imageSrc}
            src={imageSrc}
            alt={`سورة ${selectedSurah} - الآية ${selectedAyah}`}
            className="max-w-full h-auto rounded-md"
            loading="lazy"
            onError={() => setHasError(true)}
            onLoad={() => setHasError(false)}
          />
        )}
      </div>
    </div>
  );
};

export default AyahDisplay;
