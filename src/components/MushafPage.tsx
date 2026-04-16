import { useState } from "react";

type OverlayMode = "none" | "teacher" | "child";

const pages = [
  { name: "الفاتحة", src: "/pages/mushaf-fatiha.jpg" },
  { name: "التكاثر - العصر - الهمزة - الفيل", src: "/pages/599.jpg" },
  { name: "العصر - الهمزة - الفيل", src: "/pages/600.jpg" },
  { name: "قريش - الماعون - الكوثر", src: "/pages/601.jpg" },
  { name: "الكافرون - النصر - المسد", src: "/pages/602.jpg" },
  { name: "الإخلاص - الفلق - الناس", src: "/pages/603.jpg" },
];

const overlayStyles: Record<OverlayMode, string> = {
  none: "",
  teacher: "bg-sky-100/15 mix-blend-multiply",
  child: "bg-sky-200/25 mix-blend-multiply",
};

const MushafPage = () => {
  const [mode, setMode] = useState<OverlayMode>("none");

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="bg-card rounded-xl border border-border p-3">
        <p className="text-sm font-bold text-foreground mb-2 text-center">وضع التلقين</p>
        <div className="flex gap-2">
          {[
            { key: "none" as const, label: "بدون", emoji: "📖" },
            { key: "teacher" as const, label: "المعلم", emoji: "🎙️" },
            { key: "child" as const, label: "الطفل", emoji: "👦" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all border-2 ${
                mode === m.key
                  ? "bg-accent/20 border-accent text-accent-foreground"
                  : "bg-background border-border text-foreground hover:border-accent/40"
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page gallery */}
      <div className="space-y-3">
        {pages.map((page, idx) => (
          <div
            key={idx}
            className="relative rounded-xl border-2 border-accent/30 overflow-hidden shadow-lg"
          >
            <img
              src={page.src}
              alt={`صفحة ${page.name}`}
              className="w-full h-auto"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Overlay */}
            {mode !== "none" && (
              <div
                className={`absolute inset-0 ${overlayStyles[mode]} pointer-events-none transition-all duration-300`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MushafPage;
