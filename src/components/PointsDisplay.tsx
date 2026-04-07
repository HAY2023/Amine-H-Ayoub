import { Star, Award } from "lucide-react";
import type { Level } from "@/hooks/useProgress";

interface Props {
  points: number;
  level: Level;
}

const levelColors: Record<Level, string> = {
  "القارئ الناشئ": "text-accent",
  "القارئ الماهر": "text-primary",
  "القارئ المتقن": "text-gold",
};

const PointsDisplay = ({ points, level }: Props) => {
  return (
    <div className="bg-card/90 backdrop-blur-sm rounded-full shadow-md px-5 py-2 border border-border flex items-center gap-4 text-sm md:text-base">
      <div className="flex items-center gap-1.5">
        <Star className="w-5 h-5 text-gold fill-gold" />
        <span className="font-bold text-foreground">{points}</span>
        <span className="text-muted-foreground">نقطة</span>
      </div>
      <div className="w-px h-5 bg-border" />
      <div className="flex items-center gap-1.5">
        <Award className={`w-5 h-5 ${levelColors[level]}`} />
        <span className={`font-bold ${levelColors[level]}`}>{level}</span>
      </div>
    </div>
  );
};

export default PointsDisplay;
