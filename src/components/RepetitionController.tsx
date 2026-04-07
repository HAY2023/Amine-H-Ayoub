interface Props {
  count: number;
  onChange: (count: number) => void;
}

const RepetitionController = ({ count, onChange }: Props) => {
  return (
    <div className="bg-card rounded-lg shadow-md p-6 border border-border">
      <label className="block text-lg font-bold text-foreground mb-4">
        عدد التكرار
      </label>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onChange(Math.max(1, count - 1))}
          className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground text-3xl font-bold hover:bg-primary hover:text-primary-foreground transition-all shadow-md active:scale-95"
        >
          −
        </button>
        <div className="w-24 h-16 rounded-lg bg-background border-2 border-input flex items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{count}</span>
        </div>
        <button
          onClick={() => onChange(Math.min(50, count + 1))}
          className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground text-3xl font-bold hover:bg-primary hover:text-primary-foreground transition-all shadow-md active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default RepetitionController;
