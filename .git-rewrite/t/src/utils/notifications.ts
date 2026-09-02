import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "./deviceInfo";
import { getKidsSchedule, isTimeAllowed } from "../data/kidsSchedule";
import { toast } from "@/hooks/use-toast";

let notificationPermissionRequested = false;

// Request notification permission
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    notificationPermissionRequested = true;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

export async function showLocalNotification(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      await requestNotificationPermission();
    }

    if (Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              tag: title,
            });
            return;
          }
        }

        new Notification(title, { body, icon: "/pwa-192x192.png", tag: title });
        return;
      } catch (err) {
        console.error("Native notification display failed", err);
      }
    }
  }

  // Fallback to toast when native notifications are not available.
  toast({ title, description: body });
}

export function useBackgroundNotifications() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Ask for permission silently when the app starts.
    void requestNotificationPermission().then((granted) => {
      // Push notifications not yet fully implemented
    });

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
    let supportSub: RealtimeChannel | null = null;
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
         const message = "لقد انتهى الوقت المخصص لك اليوم. نراك لاحقاً!";
         showLocalNotification("انتهى وقت اللعب ⏰", message);
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
