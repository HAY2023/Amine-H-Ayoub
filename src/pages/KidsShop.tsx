import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Star, Lock, Sparkles, Palette } from "lucide-react";
import { getCoins, getProfile, ownItem, unlockItem, equipAvatar, equipColor, kidsRouteBlocked, KID_AVATARS, KID_COLORS, SHOP_AVATARS, SHOP_COLORS } from "../data/kidsProfile";
import Avatar from "../components/Avatar";
import TreasureBox from "../components/TreasureBox";
import { toast } from "../hooks/use-toast";
import { cn } from "../lib/utils";

export default function KidsShop() {
  const navigate = useNavigate();
  useEffect(() => { if (kidsRouteBlocked()) navigate("/audio", { replace: true }); }, [navigate]);
  const [, force] = useState(0);
  const refresh = () => force(x => x + 1);

  // تزامن عدّاد النجوم مع أي تغيير (صندوق الكنز/الألعاب) عبر حدث addCoins
  useEffect(() => {
    window.addEventListener("mushaf:coins", refresh);
    return () => window.removeEventListener("mushaf:coins", refresh);
  }, []);

  const coins = getCoins();
  const profile = getProfile();

  const equipAv = (value: string) => { equipAvatar(value); refresh(); toast({ title: "تم اختيار الوجه" }); };
  const buyAv = (item: typeof SHOP_AVATARS[number]) => {
    if (ownItem(item.id)) { equipAv(item.value); return; }
    if (coins < item.cost) { toast({ title: "نجوم غير كافية", variant: "destructive" }); return; }
    if (unlockItem(item.id, item.cost)) { equipAvatar(item.value); refresh(); toast({ title: `فتحت ${item.label}` }); }
  };
  const equipCol = (value: string) => { equipColor(value); refresh(); toast({ title: "تم اختيار اللون" }); };
  const buyCol = (item: typeof SHOP_COLORS[number]) => {
    if (ownItem(item.id)) { equipCol(item.value); return; }
    if (coins < item.cost) { toast({ title: "نجوم غير كافية", variant: "destructive" }); return; }
    if (unlockItem(item.id, item.cost)) { equipColor(item.value); refresh(); toast({ title: `فتحت ${item.label}` }); }
  };

  return (
    <div className="min-h-screen page-nour text-foreground" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/games")} className="flex h-10 items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-4 text-sm font-bold hover:brightness-95 active:scale-95"><ArrowRight className="h-4 w-4" /> الألعاب</button>
          <h1 className="font-extrabold text-lg text-gradient-gold">خصّص شخصيتك</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent font-extrabold text-sm px-2.5 h-10"><Star className="w-4 h-4 fill-amber-300" /> {coins}</span>
        </header>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">اجمع النجوم من الألعاب، ثم افتح بها وجوهاً وألواناً جديدة لشخصيتك.</p>

        {/* صندوق الكنز اليومي — مرة واحدة كل يوم */}
        <TreasureBox />

        {/* وجوه */}
        <section className="space-y-2 animate-fade-up">
          <h2 className="font-bold text-accent flex items-center gap-2"><Sparkles className="w-5 h-5" /> الوجوه</h2>
          <div className="grid grid-cols-5 gap-2">
            {KID_AVATARS.map(a => (
              <button key={a} onClick={() => equipAv(a)} className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${profile.avatar === a ? "ring-2 ring-accent text-accent scale-110" : "bg-transparent text-foreground hover:scale-105"}`}><Avatar name={a} className="w-10 h-10" /></button>
            ))}
            {SHOP_AVATARS.map(item => {
              const owned = ownItem(item.id);
              const equipped = profile.avatar === item.value;
              return (
                <button key={item.id} onClick={() => buyAv(item)} className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all overflow-hidden ${equipped ? "ring-2 ring-accent text-accent scale-110" : owned ? "bg-transparent text-foreground hover:scale-105" : "bg-transparent text-muted-foreground hover:scale-105"}`}>
                  <Avatar name={item.value} className={cn("w-10 h-10 transition-all duration-300", !owned && "grayscale opacity-50")} />
                  {!owned && <span className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm py-0.5 flex items-center justify-center gap-0.5 text-[9px] text-white font-bold"><Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />{item.cost}</span>}
                  {!owned && <span className="absolute top-1 left-1 bg-black/40 rounded-full p-0.5 backdrop-blur-sm"><Lock className="w-3 h-3 text-white" /></span>}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
