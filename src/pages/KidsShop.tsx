import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Star, Lock, Sparkles, Palette } from "lucide-react";
import { getCoins, getProfile, ownItem, unlockItem, equipAvatar, equipColor, KID_AVATARS, KID_COLORS, SHOP_AVATARS, SHOP_COLORS } from "../data/kidsProfile";
import Avatar from "../components/Avatar";
import { toast } from "../hooks/use-toast";

export default function KidsShop() {
  const navigate = useNavigate();
  const [, force] = useState(0);
  const refresh = () => force(x => x + 1);

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

        {/* وجوه */}
        <section className="space-y-2 animate-fade-up">
          <h2 className="font-bold text-accent flex items-center gap-2"><Sparkles className="w-5 h-5" /> الوجوه</h2>
          <div className="grid grid-cols-5 gap-2">
            {KID_AVATARS.map(a => (
              <button key={a} onClick={() => equipAv(a)} className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${profile.avatar === a ? "bg-accent/20 ring-2 ring-accent text-accent" : "card-nour text-foreground"}`}><Avatar name={a} className="w-6 h-6" /></button>
            ))}
            {SHOP_AVATARS.map(item => {
              const owned = ownItem(item.id);
              const equipped = profile.avatar === item.value;
              return (
                <button key={item.id} onClick={() => buyAv(item)} className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${equipped ? "bg-accent/20 ring-2 ring-accent text-accent" : owned ? "card-nour text-foreground" : "card-nour text-muted-foreground"}`}>
                  <Avatar name={item.value} className="w-6 h-6" />
                  {!owned && <span className="absolute bottom-0.5 inline-flex items-center gap-0.5 text-[9px] text-accent font-bold"><Star className="w-2.5 h-2.5 fill-amber-300" />{item.cost}</span>}
                  {!owned && <span className="absolute top-1 left-1"><Lock className="w-3 h-3 text-muted-foreground" /></span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* ألوان */}
        <section className="space-y-2">
          <h2 className="font-bold text-accent flex items-center gap-2"><Palette className="w-5 h-5" /> الألوان</h2>
          <div className="grid grid-cols-4 gap-2">
            {KID_COLORS.map(c => (
              <button key={c} onClick={() => equipCol(c)} className={`h-12 rounded-2xl bg-gradient-to-br ${c} transition-all ${profile.color === c ? "ring-2 ring-white scale-105" : ""}`} />
            ))}
            {SHOP_COLORS.map(item => {
              const owned = ownItem(item.id);
              const equipped = profile.color === item.value;
              return (
                <button key={item.id} onClick={() => buyCol(item)} className={`relative h-12 rounded-2xl bg-gradient-to-br ${item.value} transition-all flex items-center justify-center ${equipped ? "ring-2 ring-white scale-105" : ""}`}>
                  {!owned && <span className="inline-flex items-center gap-0.5 text-[10px] text-white font-extrabold bg-black/40 rounded-full px-1.5 py-0.5"><Star className="w-2.5 h-2.5 fill-white" />{item.cost}</span>}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
