import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "./deviceInfo";
import { getKidsSchedule, isTimeAllowed } from "../data/kidsSchedule";
import { toast } from "@/hooks/use-toast";

// Request notification permission
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

export function showLocalNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icon.png" });
  } else {
    // Fallback to toast
    toast({ title, description: body });
  }
}

export function useBackgroundNotifications() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Ask for permission silently
    requestNotificationPermission();

    const deviceId = getDeviceId();

    // 1. Listen for new announcements
    const announceSub = supabase
      .channel("public:announcements")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload) => {
          const newAnnounce = payload.new;
          if (newAnnounce.is_active) {
            showLocalNotification("إعلان جديد 📢", newAnnounce.title || "تفقّد الإشعارات لمعرفة الجديد!");
          }
        }
      )
      .subscribe();

    // 2. Listen for support replies
    let supportSub: any = null;
    async function listenSupport() {
      try {
        const { data: conv } = await supabase
          .from("support_conversations")
          .select("id")
          .eq("device_id", deviceId)
          .maybeSingle();
        
        if (conv) {
          supportSub = supabase
            .channel(`public:support_messages:${conv.id}`)
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conv.id}` },
              (payload) => {
                const msg = payload.new;
                // Only notify if sender is admin or bot
                if (msg.sender !== "user") {
                  showLocalNotification("رد من الدعم الفني 💬", msg.body || "لديك رسالة جديدة في الدعم الفني");
                }
              }
            )
            .subscribe();
        }
      } catch (err) {
        console.error("Support listener err", err);
      }
    }
    listenSupport();

    // 3. Kids Schedule Reminder / Enforcer
    const timer = setInterval(() => {
       const schedule = getKidsSchedule();
       if (!schedule.enabled) return;
       
       // If currently in kids mode, check if time is up
       const isKids = window.location.pathname === "/games";
       const allowed = isTimeAllowed();
       
       if (isKids && !allowed) {
         showLocalNotification("انتهى وقت اللعب ⏰", "لقد انتهى الوقت المخصص لك اليوم. نراك لاحقاً!");
         // Optionally, we could force them out, but we handle that in KidsGames directly.
       }
    }, 60000); // Check every minute

    return () => {
      supabase.removeChannel(announceSub);
      if (supportSub) supabase.removeChannel(supportSub);
      clearInterval(timer);
    };
  }, []);
}
