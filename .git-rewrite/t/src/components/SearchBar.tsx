import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const SearchBar = ({ value, onChange }: Props) => {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        placeholder="ابحث عن سورة..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-card border border-border rounded-xl pr-10 pl-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 font-amiri text-lg"
      />
    </div>
  );
};

export default SearchBar;
