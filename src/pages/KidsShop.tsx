import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Star, Check, Lock, Gamepad2, Sparkles, Palette } from "lucide-react";
import { getCoins, getProfile, ownItem, unlockItem, equipAvatar, equipColor, KID_AVATARS, KID_COLORS, SHOP_AVATARS, SHOP_COLORS } from "../data/kidsProfile";
import { getGameCatalog, type GameDef } from "../data/gameCatalog";
import { toast } from "../hooks/use-toast";

export default function KidsShop() {
  const navigate = useNavigate();
  const [, force] = useState(0);
  const refresh = () => force(x => x + 1);

  const coins = getCoins();
  const profile = getProfile();
  const paidGames = getGameCatalog().filter(g => g.cost > 0 && g.ageMin <= profile.age);   // لا تُباع لعبة لا تظهر للطفل بحسب عمره

  const buyGame = (g: GameDef) => {
    if (ownItem(g.id)) { navigate("/games"); return; }
    if (coins < g.cost) { toast({ title: "نجوم غير كافية — العب أكثر لتجمعها", variant: "destructive" }); return; }
    if (unlockItem(g.id, g.cost)) { refresh(); toast({ title: `فتحت لعبة «${g.title}» 🎉` }); }
  };

  const equipAv = (value: string) => { equipAvatar(value); refresh(); toast({ title: "تم اختيار الوجه" }); };
  const buyAv = (item: typeof SHOP_AVATARS[number]) => {
    if (ownItem(item.id)) { equipAv(item.value); return; }
    if (coins < item.cost) { toast({ title: "نجوم غير كافية", variant: "destructive" }); return; }
    if (unlockItem(item.id, item.cost)) { equipAvatar(item.value); refresh(); toast({ title: `فتحت ${item.label} 🎉` }); }
  };
  const equipCol = (value: string) => { equipColor(value); refresh(); toast({ title: "تم اختيار اللون" }); };
  const buyCol = (item: typeof SHOP_COLORS[number]) => {
    if (ownItem(item.id)) { equipCol(item.value); return; }
    if (coins < item.cost) { toast({ title: "نجوم غير كافية", variant: "destructive" }); return; }
    if (unlockItem(item.id, item.cost)) { equipColor(item.value); refresh(); toast({ title: `فتحت ${item.label} 🎉` }); }
  };

  const Price = ({ cost }: { cost: number }) => (
    <span className="inline-flex items-center gap-0.5 text-amber-300 font-extrabold text-sm"><Star className="w-3.5 h-3.5 fill-amber-300" /> {cost}</span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate("/games")} className="flex h-10 items-center gap-1 rounded-full bg-slate-700 px-4 text-sm font-bold hover:bg-slate-600 active:scale-95"><ArrowRight className="h-4 w-4" /> الألعاب</button>
          <h1 className="font-extrabold text-lg text-amber-300">متجر النجوم</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-sm px-2.5 h-10"><Star className="w-4 h-4 fill-amber-300" /> {coins}</span>
        </header>
        <p className="text-xs text-slate-400 text-center leading-relaxed">اجمع النجوم من الألعاب، ثم افتح بها ألعاباً جديدة ووجوهاً وألواناً.</p>

        {/* ألعاب جديدة */}
        <section className="space-y-2">
          <h2 className="font-bold text-amber-300 flex items-center gap-2"><Gamepad2 className="w-5 h-5" /> ألعاب جديدة</h2>
          {paidGames.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">لا ألعاب للشراء حالياً — ستُضاف ألعاب جديدة لاحقاً.</p>
          ) : (
            <div className="space-y-2">
              {paidGames.map(g => {
                const owned = ownItem(g.id);
                return (
                  <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-slate-800/80 border border-slate-700 p-3">
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${g.tint}`}><Gamepad2 className="w-6 h-6" /></span>
                    <span className="flex-1 min-w-0"><span className="block font-bold text-white truncate">{g.title}</span><span className="block text-[11px] text-slate-400">سن {g.ageMin}+</span></span>
                    {owned ? (
                      <button onClick={() => navigate("/games")} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1"><Check className="w-4 h-4" /> العب</button>
                    ) : (
                      <button onClick={() => buyGame(g)} disabled={coins < g.cost} className="px-3 py-2 rounded-xl bg-amber-500 text-black text-sm font-bold flex items-center gap-1 disabled:opacity-40"><Price cost={g.cost} /></button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* وجوه */}
        <section className="space-y-2">
          <h2 className="font-bold text-amber-300 flex items-center gap-2"><Sparkles className="w-5 h-5" /> الوجوه</h2>
          <div className="grid grid-cols-5 gap-2">
            {KID_AVATARS.map(a => (
              <button key={a} onClick={() => equipAv(a)} className={`aspect-square rounded-2xl text-2xl flex items-center justify-center transition-all ${profile.avatar === a ? "bg-amber-500/30 ring-2 ring-amber-400" : "bg-slate-800/80 border border-slate-700"}`}>{a}</button>
            ))}
            {SHOP_AVATARS.map(item => {
              const owned = ownItem(item.id);
              const equipped = profile.avatar === item.value;
              return (
                <button key={item.id} onClick={() => buyAv(item)} className={`relative aspect-square rounded-2xl text-2xl flex flex-col items-center justify-center transition-all ${equipped ? "bg-amber-500/30 ring-2 ring-amber-400" : "bg-slate-800/80 border border-slate-700"}`}>
                  <span>{item.value}</span>
                  {!owned && <span className="absolute bottom-0.5 inline-flex items-center gap-0.5 text-[9px] text-amber-300 font-bold"><Star className="w-2.5 h-2.5 fill-amber-300" />{item.cost}</span>}
                  {!owned && <span className="absolute top-1 left-1"><Lock className="w-3 h-3 text-slate-300" /></span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* ألوان */}
        <section className="space-y-2">
          <h2 className="font-bold text-amber-300 flex items-center gap-2"><Palette className="w-5 h-5" /> الألوان</h2>
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
