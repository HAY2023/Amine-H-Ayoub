import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, Settings, Library, Gamepad2, Bell } from "lucide-react";
import { isKidsMode, hasKidsPin } from "@/data/kidsLock";
import { toast } from "@/hooks/use-toast";

/**
 * تذييل الموقع — شريط تنقل علوي مصغّر في أسفل الصفحة مع شرح لكل زر.
 * - يُخفى بالكامل في وضع الأطفال (حماية وتركيز على الركن التعليمي).
 * - الإعدادات محمية برمز ولي الأمر في وضع الأطفال.
 */
export default function AppFooter() {
  const navigate = useNavigate();
  const [kidsMode, setKidsMode] = useState<boolean>(() => {
    try { return isKidsMode(); } catch { return false; }
  });

  useEffect(() => {
    const h = () => setKidsMode(isKidsMode());
    window.addEventListener("mushaf:kidsmode", h);
    window.addEventListener("mushaf:appmode", h);
    return () => {
      window.removeEventListener("mushaf:kidsmode", h);
      window.removeEventListener("mushaf:appmode", h);
    };
  }, []);

  if (kidsMode) return null; // مخفي تماماً في وضع الطفل

  const openSettings = () => {
    let pin = false;
    try { pin = hasKidsPin(); } catch { pin = false; }
    if (isKidsMode() && pin) {
      toast({ title: "الإعدادات محمية", description: "أدخل رمز ولي الأمر أولاً." });
      return;
    }
    navigate("/settings");
  };

  const items = [
    { icon: BookOpen, label: "القرآن", sub: "المصحف التفاعلي", onClick: () => navigate("/mushaf") },
    { icon: LayoutDashboard, label: "لوحة التحكم", sub: "متابعة وليّ الأمر", onClick: () => navigate("/parent") },
    { icon: Settings, label: "الإعدادات", sub: "المظهر والحماية", onClick: openSettings },
  ];

  return (
    <footer className="mt-6 border-t border-border/60 pt-5 pb-8 px-3">
      <p className="text-center text-sm font-extrabold text-gradient-gold mb-1">نُور — تعلّم القرآن بمحبة</p>
      <p className="text-center text-[11px] text-muted-foreground leading-relaxed mb-4">
        تلاوات عطرة، مصحف تفاعلي، وركن ألعاب تعليمية للأطفال — مع لوحة متابعة كاملة لولي الأمر.
      </p>
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.onClick}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-secondary border border-border hover:border-accent/50 active:scale-95 transition-all"
          >
            <it.icon className="w-6 h-6 text-accent" />
            <span className="text-xs font-extrabold text-foreground">{it.label}</span>
            <span className="text-[10px] text-muted-foreground">{it.sub}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-muted-foreground">
        <span>© نُور — كل الحقوق محفوظة · يعمل دون إنترنت قيد التوسعة</span>
      </div>
    </footer>
  );
}