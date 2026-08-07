import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, BellOff, Info, Megaphone, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type?: string;
  link?: string;
  created_at: string;
}

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchAnnouncements() {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("id,title,body,type,link,created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase Error fetching announcements:", error);
        }

        if (isMounted && data) {
          setAnnouncements(data);
        }
      } catch (err) {
        console.error("Failed to fetch announcements", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAnnouncements();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen page-nour text-foreground" dir="rtl">
      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        <header className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-4 text-sm font-bold hover:brightness-95 active:scale-95"
          >
            <ArrowRight className="h-4 w-4" /> رجوع
          </button>
          <h1 className="font-extrabold text-lg text-gradient-gold">الإعلانات</h1>
          <span className="w-16" />
        </header>

        <div className="card-nour p-4 space-y-4 shadow-soft animate-fade-up">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Bell className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-foreground">آخر الإعلانات</p>
              <p className="text-sm text-muted-foreground">تابع كل جديد من هنا.</p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">جاري جلب الإعلانات...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl border border-border/50 bg-secondary/50">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center shadow-inner">
                <BellOff className="w-10 h-10 text-muted-foreground/60" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-lg text-foreground">لا توجد إعلانات حالياً</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  أنت على اطلاع بكل جديد. عُد لاحقاً لمعرفة الإعلانات المفعّلة.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="bg-secondary/50 rounded-2xl border border-border/40 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        announcement.type === "promo" ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600"
                      }`}
                    >
                      {announcement.type === "promo" ? <Megaphone className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-base text-foreground">{announcement.title}</h2>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{announcement.body}</p>
                      {announcement.link ? (
                        <a
                          href={announcement.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-sm font-bold text-accent hover:underline"
                        >
                          عرض المزيد &larr;
                        </a>
                      ) : null}
                      <p className="mt-3 text-[11px] text-muted-foreground/70">
                        {new Date(announcement.created_at).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
