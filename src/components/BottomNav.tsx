import { Headphones, BookOpen, Zap } from "lucide-react";

export type TabType = "audio" | "mushaf" | "methods";

interface Props {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  hasPlayer?: boolean;
}

const BottomNav = ({ activeTab, onChange, hasPlayer }: Props) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50"
      style={{
        background: "rgba(var(--nav-bg-rgb, 245,240,230), 0.75)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className={`flex items-stretch ${hasPlayer ? "pt-0" : ""}`}>
        <button
          onClick={() => onChange("audio")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            activeTab === "audio"
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Headphones className="w-6 h-6" />
          <span className="text-xs font-bold">التلاوات</span>
        </button>
        <button
          onClick={() => onChange("mushaf")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            activeTab === "mushaf"
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-xs font-bold">المصحف</span>
        </button>
        <button
          onClick={() => onChange("methods")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            activeTab === "methods"
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="w-6 h-6" />
          <span className="text-xs font-bold">الطرق</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
