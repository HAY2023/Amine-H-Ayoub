import { useState, useEffect } from "react";
import { X, Bell, BellOff, Info, Megaphone, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type?: string;
  link?: string;
  created_at: string;
}

export default function NotificationsModal({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) {
          console.debug("Notifications fetch:", error);
        }

        if (data && Array.isArray(data)) {
          const active = data.filter((a: any) => a.is_active !== false);
          setNotifications(active.length > 0 ? active : data);
        }
      } catch (err) {
        console.debug("Failed to fetch notifications", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end items-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-card w-full sm:max-w-xl h-[65vh] rounded-t-3xl sm:rounded-t-3xl shadow-2xl border border-border/50 overflow-hidden flex flex-col animate-in slide-in-from-bottom-full duration-300">
        
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        <header className="flex-none flex items-center justify-between p-4 pb-3 border-b border-border/40">
          <h2 className="font-extrabold text-xl text-foreground flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-accent shadow-inner">
              <Bell className="w-5 h-5 fill-accent/20" />
            </span> 
            الإعلانات والإشعارات
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:brightness-95 active:scale-95 text-secondary-foreground transition-all">
            <X className="w-5 h-5" />
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">جاري جلب الإعلانات...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center shadow-inner relative">
                <BellOff className="w-10 h-10 text-muted-foreground/60" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-lg text-foreground">لا توجد إعلانات حالياً</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                  أنت على اطلاع بكل جديد! أي إعلانات أو تحديثات ينشرها المشرف من لوحة التحكم ستظهر هنا فوراً.
                </p>
              </div>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40 rounded-2xl p-4 shadow-sm relative overflow-hidden group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    {n.type === "alert" ? <Megaphone className="w-5 h-5 text-amber-500" /> : <Info className="w-5 h-5 text-accent" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-base text-foreground leading-snug truncate">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground/80 shrink-0 font-medium">
                        {new Date(n.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {n.body}
                    </p>
                    {n.link && (
                      <div className="pt-2">
                        <a
                          href={n.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                        >
                          عرض التفاصيل ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
