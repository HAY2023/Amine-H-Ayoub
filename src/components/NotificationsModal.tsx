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
          .select("id,title,body,type,link,created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        
        if (error) {
          console.error("Supabase Error fetching notifications:", error);
        }

        if (data) {
          setNotifications(data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end items-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-card w-full sm:max-w-xl h-[50vh] rounded-t-3xl sm:rounded-t-3xl shadow-2xl border border-border/50 overflow-hidden flex flex-col animate-in slide-in-from-bottom-full duration-300">
        
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        <header className="flex-none flex items-center justify-between p-4 pb-3 border-b border-border/40">
          <h2 className="font-extrabold text-xl text-foreground flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-accent shadow-inner">
              <Bell className="w-5 h-5 fill-accent/20" />
            </span> 
            الإشعارات
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:brightness-95 active:scale-95 text-secondary-foreground transition-all">
            <X className="w-5 h-5" />
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">جاري جلب الإشعارات...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center shadow-inner relative">
                <BellOff className="w-10 h-10 text-muted-foreground/60" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-lg text-foreground">لا توجد رسائل حالياً</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
                  أنت على اطلاع بكل جديد! لا توجد إعلانات نشطة في الوقت الحالي.
                </p>
              </div>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="bg-secondary/50 rounded-xl p-4 border border-border/30 animate-fade-up">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'promo' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
                    {n.type === 'promo' ? <Megaphone className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-base leading-tight">{n.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{n.body}</p>
                    {n.link && (
                      <a href={n.link} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm font-bold text-accent hover:underline">
                        عرض المزيد &larr;
                      </a>
                    )}
                    <div className="text-[10px] text-muted-foreground/60 mt-3 font-medium">
                      {new Date(n.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex-none p-4 bg-muted/30 border-t border-border/40 flex justify-end">
          <button onClick={onClose} className="bg-accent text-accent-foreground font-bold px-6 py-2.5 rounded-full text-sm hover:brightness-105 active:scale-95 transition-all shadow-soft">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
