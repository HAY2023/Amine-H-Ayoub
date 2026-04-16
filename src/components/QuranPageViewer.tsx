import { getPageImages } from "@/data/surahPages";

interface Props {
  surahName: string | null;
}

const QuranPageViewer = ({ surahName }: Props) => {
  if (!surahName) return null;

  const pages = getPageImages(surahName);

  if (pages.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground text-lg">
          لا تتوفر صورة لصفحة هذه السورة حالياً
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pages.map((page, idx) => (
        <div
          key={idx}
          className="bg-card rounded-xl border-2 border-accent/30 overflow-hidden shadow-xl"
        >
          <img
            src={page}
            alt={`صفحة سورة ${surahName}`}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
};

export default QuranPageViewer;
