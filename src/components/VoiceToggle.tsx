interface Props {
  voiceMode: "teacher" | "kids";
  onChange: (mode: "teacher" | "kids") => void;
}

const VoiceToggle = ({ voiceMode, onChange }: Props) => {
  return (
    <div className="bg-card rounded-lg shadow-md p-6 border border-border">
      <label className="block text-lg font-bold text-foreground mb-4">
        اختر نوع الصوت
      </label>
      <div className="flex gap-3">
        <button
          onClick={() => onChange("teacher")}
          className={`flex-1 py-4 px-4 rounded-lg text-lg font-bold transition-all border-2 ${
            voiceMode === "teacher"
              ? "bg-primary text-primary-foreground border-primary shadow-md"
              : "bg-background text-foreground border-input hover:border-primary/50"
          }`}
        >
          🎙️ صوت المعلم فقط
        </button>
        <button
          onClick={() => onChange("kids")}
          className={`flex-1 py-4 px-4 rounded-lg text-lg font-bold transition-all border-2 ${
            voiceMode === "kids"
              ? "bg-primary text-primary-foreground border-primary shadow-md"
              : "bg-background text-foreground border-input hover:border-primary/50"
          }`}
        >
          👦 المعلم مع الأطفال
        </button>
      </div>
    </div>
  );
};

export default VoiceToggle;
