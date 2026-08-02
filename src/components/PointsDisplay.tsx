import { Star } from "lucide-react";

interface Props {
  points: number;
}

const PointsDisplay = ({ points }: Props) => {
  return (
    <div className="bg-card/90 backdrop-blur-sm rounded-full shadow-md px-5 py-2 border border-border flex items-center gap-4 text-sm md:text-base">
      <div className="flex items-center gap-1.5">
        <Star className="w-5 h-5 text-gold fill-gold" />
        <span className="font-bold text-foreground">{points}</span>
        <span className="text-muted-foreground">نقطة</span>
      </div>
    </div>
  );
};

export default PointsDisplay;
