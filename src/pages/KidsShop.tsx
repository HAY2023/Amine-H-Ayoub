import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Star, Lock, Sparkles, Palette, Check, Crown, Eye, Volume2, ShieldCheck, Award, Headphones, Clock } from "lucide-react";
import { 
  getCoins, 
  getProfile, 
  getProgress,
  ownItem, 
  unlockItem, 
  equipAvatar, 
  equipColor, 
  kidsRouteBlocked, 
  formatCoins, 
  SHOP_AVATARS, 
  SHOP_COLORS,
  type ShopItem 
} from "../data/kidsProfile";

import Avatar from "../components/Avatar";
import TreasureBox from "../components/TreasureBox";
import QuranLockGateModal from "../components/QuranLockGateModal";
import { toast } from "../hooks/use-toast";
import { cn } from "../lib/utils";

// نغمة صوتية احتفالية عند الشراء باستخدام Web Audio API
function playTriumphantSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.45);
    });
  } catch {
    /* ignore audio error */
  }
}

export default function KidsShop() {
  const navigate = useNavigate();
  useEffect(() => { if (kidsRouteBlocked()) navigate("/audio", { replace: true }); }, [navigate]);
  const [, force] = useState(0);
  const refresh = () => force(x => x + 1);

  const [filterTier, setFilterTier] = useState<string>("all");
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  const [showLockGate, setShowLockGate] = useState(false);

  useEffect(() => {
    window.addEventListener("mushaf:coins", refresh);
    window.addEventListener("mushaf:gam", refresh);
    window.addEventListener("mushaf:activeprofile", refresh);
    return () => { 
      window.removeEventListener("mushaf:coins", refresh); 
      window.removeEventListener("mushaf:gam", refresh); 
      window.removeEventListener("mushaf:activeprofile", refresh); 
    };
  }, []);

  const coins = getCoins();
  const profile = getProfile();

  const equipAv = (value: string, label: string) => { 
    equipAvatar(value); 
    refresh(); 
    toast({ title: `تم تفعيل شخصية «${label}» 🌸` }); 
  };

  const buyAv = (item: ShopItem) => {
    if (ownItem(item.id)) { 
      equipAv(item.value, item.label); 
      return; 
    }
    if (coins < item.cost) { 
      toast({ 
        title: "النجوم غير كافية!", 
        description: `تحتاج إلى ${formatCoins(item.cost - coins)} نجمة إضافية لفتح هذه الشخصية الملكية. ثابر على القراءة والحفظ!`, 
        variant: "destructive" 
      }); 
      return; 
    }
    if (unlockItem(item.id, item.cost)) { 
      equipAvatar(item.value); 
      playTriumphantSound();
      refresh(); 
      toast({ 
        title: `🎉 مبارك! فتحت شخصية «${item.label}»`, 
        description: "تم تفعيلها لشخصيتك بنجاح! بارك الله في همتك القرآنية." 
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
        description: `تحتاج إلى ${formatCoins(item.cost - coins)} نجمة إضافية.`, 
        variant: "destructive" 
      }); 
      return; 
    }
    if (unlockItem(item.id, item.cost)) { 
      equipColor(item.value); 
      playTriumphantSound();
      refresh(); 
      toast({ 
        title: `🎉 مبارك! فتحت ثيم «${item.label}»` 
      }); 
    }
  };

  const starterAvatars = [
    { id: "free-boy-scholar", label: "طالب العلم الصغير", value: "img-boy-scholar", description: "الشخصية الأساسية المجانية لجميع أبطال القرآن." },
  ];

  // تصفية الشخصيات حسب الفئة
  const filteredAvatars = SHOP_AVATARS.filter(item => {
    if (filterTier === "all") return true;
    if (filterTier === "legendary") return item.tier === "legendary";
    if (filterTier === "diamond") return item.tier === "diamond";
    if (filterTier === "gold") return item.tier === "gold";
    if (filterTier === "girls") return item.value.includes("girl");
    return true;
  });

  return (
    <div className="min-h-screen page-nour text-foreground pb-16" dir="rtl">
      <div className="mx-auto max-w-4xl px-4 py-5 space-y-6">
        
        {/* شريط الرأس */}
        <header className="flex items-center justify-between gap-3 bg-card/80 backdrop-blur-md p-3.5 rounded-3xl border border-border shadow-sm">
          <button 
            onClick={() => navigate("/games")} 
            className="flex h-11 items-center gap-1.5 rounded-2xl bg-secondary text-secondary-foreground px-4 text-sm font-bold hover:brightness-95 active:scale-95 transition-all"
          >
            <ArrowRight className="h-4 w-4" /> الألعاب
          </button>
          
          <h1 className="font-extrabold text-xl sm:text-2xl text-gradient-gold flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500 fill-amber-400" />
            متجر شخصيات القرآن الملكية
          </h1>
          
          <div className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-base px-4 h-11 border border-amber-500/30 shadow-inner">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400 animate-pulse" />
            <span>{formatCoins(coins)} نجمة</span>
          </div>
        </header>

        {/* شريط تنبيه عداد القرآن لفتح الألعاب إن كانت مقفلة */}
        {(() => {
          const prog = getProgress();
          const isLocked = !prog.unlocked && profile.goalMinutes > 0 && (prog.minutes || 0) < profile.goalMinutes;
          const rem = Math.max(0, Math.round((profile.goalMinutes - (prog.minutes || 0)) * 10) / 10);
          if (!isLocked) return null;
          return (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs animate-fade-in shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="font-extrabold text-foreground block">
                    الألعاب مقفلة بالقرآن: بقي لك {rem} دقيقة قراءة لفتح جميع الألعاب!
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    أكمل ورد الاستماع والتلاوة لتفتح الألعاب وتكسب المزيد من النجوم الملكية ⭐
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowLockGate(true)}
                  className="px-3 py-2 rounded-xl bg-card border border-border hover:border-accent/40 font-bold text-xs text-foreground shrink-0 active:scale-95 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>تفاصيل العداد ⏰</span>
                </button>
                <button
                  onClick={() => navigate("/audio")}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shrink-0 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>استمع الآن 📖</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* بطاقة العرض الحالية الكبيرة (Hero Preview) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-sky-500/15 border-2 border-amber-400/30 p-5 sm:p-7 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 shadow-xl">
          <div className="relative shrink-0">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full ring-4 ring-amber-400 ring-offset-4 ring-offset-background shadow-2xl p-1.5 bg-gradient-to-tr from-amber-500 to-yellow-300">
              <Avatar name={profile.avatar} className="w-full h-full rounded-full shadow-inner" />
            </div>
            <span className="absolute -bottom-2 -left-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-black px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1 border border-amber-300/40">
              <Crown className="w-3.5 h-3.5" /> مفعّل لشخصيتك
            </span>
          </div>

          <div className="flex-1 text-center sm:text-right space-y-2.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/20">
              <Sparkles className="w-4 h-4 fill-current" /> شخصيتك القرآنية الحالية
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              {profile.name ? `بطل القرآن: ${profile.name}` : "بطل القرآن الكريم"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              اقرأ واستمع لكتاب الله لتكسب نجوماً وتفتح أزياء وشخصيات ملكية ثلاثية الأبعاد نادرة، لتتوج بها شهادتك وبطاقتك!
            </p>
          </div>
        </div>

        {/* صندوق الكنز اليومي */}
        <TreasureBox />

        {/* قسم الشخصية المجانية الأساسية */}
        <section className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-lg sm:text-xl text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              الشخصية الأساسية (هدية مجانية للجميع)
            </h2>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full">
              مجاناً ⭐ 0
            </span>
          </div>

          <div className="max-w-md">
            {starterAvatars.map(item => {
              const isEquipped = profile.avatar === item.value;
              return (
                <div 
                  key={item.id} 
                  onClick={() => equipAv(item.value, item.label)}
                  className={cn(
                    "cursor-pointer group relative rounded-3xl bg-card border-2 p-4 flex items-center text-right gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-95",
                    isEquipped 
                      ? "border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-500/5 shadow-md shadow-emerald-500/20" 
                      : "border-border hover:border-emerald-400/40"
                  )}
                >
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden p-1 shrink-0 transition-transform group-hover:scale-105">
                    <Avatar name={item.value} className="w-full h-full rounded-2xl drop-shadow-md" />
                  </div>
                  
                  <div className="space-y-1.5 flex-1">
                    <span className="block font-black text-base sm:text-lg text-foreground leading-tight">
                      {item.label}
                    </span>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    {isEquipped ? (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-3 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" /> مُفعّل حالياً
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full group-hover:bg-emerald-500/20 group-hover:text-emerald-600 transition-colors">
                        اختيار للشخصية
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-lg sm:text-xl text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
                الشخصيات الملكية وحملة المصحف (3D)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">شخصيات أسطورية ثلاثية الأبعاد تُفتح بالهمة العالية وجمع النجوم</p>
            </div>

            {/* أزرار التصفية الفاخرة */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: "all", label: "الكل" },
                { id: "legendary", label: "🌟 الأساطير" },
                { id: "diamond", label: "💎 الماسي" },
                { id: "gold", label: "👑 الذهبي" },
                { id: "girls", label: "🌸 الأميرات" },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setFilterTier(t.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                    filterTier === t.id
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAvatars.map(item => {
              const owned = ownItem(item.id);
              const isEquipped = profile.avatar === item.value;
              const canAfford = coins >= item.cost;

              return (
                <div 
                  key={item.id} 
                  className={cn(
                    "group relative rounded-3xl bg-card border-2 p-4 flex flex-col justify-between text-center gap-3.5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                    isEquipped 
                      ? "border-amber-500 ring-2 ring-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/20" 
                      : owned 
                      ? "border-border hover:border-amber-400/50" 
                      : "border-border/80 bg-card/60 hover:border-amber-400/50"
                  )}
                >
                  {/* شارة الندرة العلوية */}
                  <div className="flex items-center justify-between w-full">
                    {item.badge && (
                      <span className={cn(
                        "text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm",
                        item.tier === "legendary" 
                          ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black"
                          : item.tier === "diamond"
                          ? "bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-400/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30"
                      )}>
                        {item.badge}
                      </span>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="معاينة كبيرة"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* صورة الأفاتار */}
                  <div 
                    onClick={() => buyAv(item)}
                    className="relative mx-auto w-32 h-32 sm:w-36 sm:h-36 rounded-3xl overflow-hidden p-1 transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    <Avatar 
                      name={item.value} 
                      className={cn(
                        "w-full h-full rounded-3xl drop-shadow-md transition-all duration-300", 
                        !owned && "opacity-95 contrast-100"
                      )} 
                    />
                    
                    {!owned && (
                      <div className="absolute top-2 left-2 bg-black/70 text-white rounded-full p-1.5 backdrop-blur-md shadow-md">
                        <Lock className="w-4 h-4 text-amber-300" />
                      </div>
                    )}
                  </div>
                  
                  {/* بيانات الشخصية */}
                  <div className="space-y-1.5 w-full">
                    <span className="block font-black text-base text-foreground leading-snug">
                      {item.label}
                    </span>
                    
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 px-1">
                        {item.description}
                      </p>
                    )}

                    {/* زر الإجراء */}
                    <div className="pt-2">
                      {isEquipped ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30 w-full justify-center">
                          <Check className="w-4 h-4" /> مُفعّل حالياً
                        </span>
                      ) : owned ? (
                        <button
                          type="button"
                          onClick={() => equipAv(item.value, item.label)}
                          className="w-full text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 hover:bg-amber-500 hover:text-white px-3 py-2 rounded-2xl transition-all"
                        >
                          تفعيل هذه الشخصية
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => buyAv(item)}
                          className={cn(
                            "w-full inline-flex items-center justify-center gap-1.5 text-xs font-black px-4 py-2.5 rounded-2xl shadow-sm transition-all",
                            canAfford 
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:brightness-110 shadow-amber-500/25 active:scale-95" 
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          )}
                        >
                          <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                          <span>{formatCoins(item.cost)} نجمة</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* قسم ألوان وثيمات البطاقة */}
        <section className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-lg sm:text-xl text-foreground flex items-center gap-2">
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
                      <Star className="w-2.5 h-2.5 fill-current" /> {formatCoins(item.cost)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

      </div>

      {/* نافذة المعاينة الكبيرة (Preview Modal) */}
      {previewItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setPreviewItem(null)}
        >
          <div 
            className="bg-card border-2 border-amber-400/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-48 h-48 mx-auto rounded-3xl overflow-hidden ring-4 ring-amber-400/50 shadow-2xl p-1 bg-gradient-to-tr from-amber-500 to-yellow-300">
              <Avatar name={previewItem.value} className="w-full h-full rounded-2xl shadow-inner" />
            </div>

            <div className="space-y-1.5">
              {previewItem.badge && (
                <span className="inline-block bg-amber-500 text-white text-xs font-black px-3 py-0.5 rounded-full">
                  {previewItem.badge}
                </span>
              )}
              <h3 className="text-xl font-black text-foreground">{previewItem.label}</h3>
              {previewItem.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {previewItem.description}
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {ownItem(previewItem.id) ? (
                <button
                  type="button"
                  onClick={() => { equipAv(previewItem.value, previewItem.label); setPreviewItem(null); }}
                  className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black py-3 shadow-lg transition-all"
                >
                  تفعيل هذه الشخصية الآن
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { buyAv(previewItem); setPreviewItem(null); }}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white font-black py-3 shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
                  <span>فتح الشخصية بـ {formatCoins(previewItem.cost)} نجمة</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="w-full rounded-2xl bg-secondary text-secondary-foreground font-bold py-2 text-xs hover:bg-secondary/80 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      <QuranLockGateModal
        isOpen={showLockGate}
        onClose={() => setShowLockGate(false)}
        targetName="المتجر"
      />
    </div>
  );
}
