import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Star, Lock, Sparkles, Palette, Check, Crown } from "lucide-react";
import { getCoins, getProfile, ownItem, unlockItem, equipAvatar, equipColor, kidsRouteBlocked, KID_AVATARS, SHOP_AVATARS, SHOP_COLORS } from "../data/kidsProfile";

import Avatar from "../components/Avatar";
import TreasureBox from "../components/TreasureBox";
import { toast } from "../hooks/use-toast";
import { cn } from "../lib/utils";

export default function KidsShop() {
  const navigate = useNavigate();
  useEffect(() => { if (kidsRouteBlocked()) navigate("/audio", { replace: true }); }, [navigate]);
  const [, force] = useState(0);
  const refresh = () => force(x => x + 1);

  useEffect(() => {
    window.addEventListener("mushaf:coins", refresh);
    window.addEventListener("mushaf:gam", refresh);
    return () => { 
      window.removeEventListener("mushaf:coins", refresh); 
      window.removeEventListener("mushaf:gam", refresh); 
    };
  }, []);

  const coins = getCoins();
  const profile = getProfile();

  const equipAv = (value: string, label: string) => { 
    equipAvatar(value); 
    refresh(); 
    toast({ title: `تم تفعيل شخصية «${label}» 🌸` }); 
  };

  const buyAv = (item: typeof SHOP_AVATARS[number]) => {
    if (ownItem(item.id)) { 
      equipAv(item.value, item.label); 
      return; 
    }
    if (coins < item.cost) { 
      toast({ 
        title: "النجوم غير كافية!", 
        description: `تحتاج إلى ${item.cost - coins} نجمة إضافية لفتح هذه الشخصية.`, 
        variant: "destructive" 
      }); 
      return; 
    }
    if (unlockItem(item.id, item.cost)) { 
      equipAvatar(item.value); 
      refresh(); 
      toast({ 
        title: `🎉 مبارك! فتحت شخصية «${item.label}»`, 
        description: "تم تفعيلها لشخصيتك بنجاح!" 
      }); 
    }
  };

  const equipCol = (value: string, label: string) => { 
    equipColor(value); 
    refresh(); 
    toast({ title: `تم اختيار ثيم «${label}» 🎨` }); 
  };

  const buyCol = (item: typeof SHOP_COLORS[number]) => {
    if (ownItem(item.id)) { 
      equipCol(item.value, item.label); 
      return; 
    }
    if (coins < item.cost) { 
      toast({ 
        title: "النجوم غير كافية!", 
        description: `تحتاج إلى ${item.cost - coins} نجمة إضافية.`, 
        variant: "destructive" 
      }); 
      return; 
    }
    if (unlockItem(item.id, item.cost)) { 
      equipColor(item.value); 
      refresh(); 
      toast({ 
        title: `🎉 مبارك! فتحت ثيم «${item.label}»` 
      }); 
    }
  };

  const starterAvatars = [
    { id: "free-boy-scholar", label: "طالب العلم الصغير", value: "img-boy-scholar" },
  ];

  return (
    <div className="min-h-screen page-nour text-foreground pb-12" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-5 space-y-6">
        
        {/* شريط الرأس */}
        <header className="flex items-center justify-between gap-3 bg-card/80 backdrop-blur-md p-3.5 rounded-3xl border border-border shadow-sm">
          <button 
            onClick={() => navigate("/games")} 
            className="flex h-11 items-center gap-1.5 rounded-2xl bg-secondary text-secondary-foreground px-4 text-sm font-bold hover:brightness-95 active:scale-95 transition-all"
          >
            <ArrowRight className="h-4 w-4" /> الألعاب
          </button>
          
          <h1 className="font-extrabold text-xl sm:text-2xl text-gradient-gold">متجر الشخصيات الإسلامية</h1>
          
          <div className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-base px-3.5 h-11 border border-amber-500/30 shadow-inner">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400 animate-pulse" />
            <span>{coins}</span>
          </div>
        </header>

        {/* بطاقة العرض الحالية الكبيرة (Hero Preview) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-sky-500/10 border-2 border-accent/30 p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 sm:gap-8 shadow-lg">
          <div className="relative shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full ring-4 ring-accent ring-offset-4 ring-offset-background shadow-2xl p-1 bg-card">
              <Avatar name={profile.avatar} className="w-full h-full rounded-full" />
            </div>
            <span className="absolute -bottom-2 -left-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> مفعّل الآن
            </span>
          </div>

          <div className="flex-1 text-center sm:text-right space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/15 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> شخصيتك الحالية
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {profile.name ? `بطل القرآن: ${profile.name}` : "بطل القرآن الكريم"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              استمع واقرأ القرآن لتكسب نجوماً وتفتح أزياء وشخصيات ملكية إسلامية نادرة!
            </p>
          </div>
        </div>

        {/* صندوق الكنز اليومي */}
        <TreasureBox />

        {/* قسم الشخصية المجانية الأساسية */}
        <section className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-lg sm:text-xl text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              الشخصية الأساسية (مجانية للجميع)
            </h2>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full">
              مجاناً ⭐ 0
            </span>
          </div>

          <div className="max-w-xs">
            {starterAvatars.map(item => {
              const isEquipped = profile.avatar === item.value;
              return (
                <div 
                  key={item.id} 
                  onClick={() => equipAv(item.value, item.label)}
                  className={cn(
                    "cursor-pointer group relative rounded-3xl bg-card border-2 p-4 flex items-center text-right gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95",
                    isEquipped 
                      ? "border-accent ring-2 ring-accent/50 bg-accent/5 shadow-md shadow-accent/20" 
                      : "border-border hover:border-accent/40"
                  )}
                >
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden p-1 shrink-0 transition-transform group-hover:scale-105">
                    <Avatar name={item.value} className="w-full h-full rounded-2xl drop-shadow-md" />
                  </div>
                  
                  <div className="space-y-1.5 flex-1">
                    <span className="block font-bold text-base sm:text-lg text-foreground leading-tight">
                      {item.label}
                    </span>
                    {isEquipped ? (
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" /> مُفعّل حالياً
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                        اختيار
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* قسم الشخصيات الفاخرة والملكية (تُفتح بالنجوم) */}
        <section className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-lg sm:text-xl text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              الشخصيات الملكية والأزياء الفاخرة
            </h2>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full">
              تُفتح بالنجوم ⭐
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SHOP_AVATARS.map(item => {
              const owned = ownItem(item.id);
              const isEquipped = profile.avatar === item.value;
              const canAfford = coins >= item.cost;

              return (
                <div 
                  key={item.id} 
                  onClick={() => buyAv(item)}
                  className={cn(
                    "cursor-pointer group relative rounded-3xl bg-card border-2 p-4 flex flex-col items-center text-center gap-3.5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]",
                    isEquipped 
                      ? "border-amber-500 ring-2 ring-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/20" 
                      : owned 
                      ? "border-border hover:border-accent/50" 
                      : "border-border/80 bg-card/60 hover:border-amber-400/50"
                  )}
                >
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden p-1 transition-transform group-hover:scale-105">
                    <Avatar 
                      name={item.value} 
                      className={cn(
                        "w-full h-full rounded-3xl drop-shadow-md transition-all duration-300", 
                        !owned && "opacity-90 contrast-95"
                      )} 
                    />
                    
                    {!owned && (
                      <div className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1.5 backdrop-blur-md shadow">
                        <Lock className="w-4 h-4 text-amber-300" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 w-full">
                    <span className="block font-extrabold text-base sm:text-lg text-foreground leading-snug">
                      {item.label}
                    </span>
                    
                    {isEquipped ? (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full">
                        <Check className="w-4 h-4" /> مُفعّل حالياً
                      </span>
                    ) : owned ? (
                      <span className="inline-flex items-center text-xs font-bold text-accent bg-accent/15 px-3 py-1 rounded-full group-hover:bg-accent group-hover:text-accent-foreground transition-all">
                        تفعيل الشخصية
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full shadow-sm transition-all",
                          canAfford 
                            ? "bg-amber-500 text-white group-hover:bg-amber-600" 
                            : "bg-secondary text-muted-foreground"
                        )}>
                          <Star className="w-4 h-4 fill-current text-amber-300" />
                          <span>{item.cost.toLocaleString("en-US")} نجمة</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* قسم ألوان وثيمات البطاقة */}
        <section className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-lg sm:text-xl text-foreground flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-500" />
              ألوان وخلفيات البطاقة الشخصية
            </h2>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 px-3 py-1 rounded-full">
              ثيمات بطاقتك
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SHOP_COLORS.map(item => {
              const owned = ownItem(item.id);
              const isEquipped = profile.color === item.value;

              return (
                <button
                  key={item.id}
                  onClick={() => buyCol(item)}
                  className={cn(
                    "group relative p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200 active:scale-95",
                    isEquipped ? "border-accent ring-2 ring-accent/50" : "border-border hover:border-accent/40 bg-card"
                  )}
                >
                  <div className={cn("w-full h-12 rounded-xl bg-gradient-to-r shadow-inner", item.value)} />
                  <span className="text-xs font-bold text-foreground truncate w-full text-center">{item.label}</span>
                  {isEquipped ? (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded-full">مُفعّل</span>
                  ) : owned ? (
                    <span className="text-[10px] font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full">اختيار</span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" /> {item.cost}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
