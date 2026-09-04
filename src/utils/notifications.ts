import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "./deviceInfo";
import { getKidsSchedule, isTimeAllowed } from "../data/kidsSchedule";
import { getProfile, getProgress } from "../data/kidsProfile";
import { toast } from "@/hooks/use-toast";
import { requestPermission, sendNotification, isPermissionGranted } from "@tauri-apps/plugin-notification";
import { isTauri } from "./tauriUtils";

/** نغمة تنبيه لطيفة ومريحة عند صدور أي إشعار (Web Audio API) */
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // النغمة الأولى: نغمة دافئة هادئة
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // النغمة الثانية: رنين متناغم أعلى
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // تجاهل أخطاء قيود تشغيل الصوت التلقائي
  }
}

/** واجهة إعدادات التذكيرات */
export interface ReminderSettings {
  enabled: boolean;                 // تفعيل التذكيرات عموماً
  soundEnabled: boolean;            // تشغيل صوت التنبيه
  dailyLessonEnabled: boolean;      // تذكير الدرس / الورد القرآني اليومي
  dailyLessonTime: string;          // وقت التذكير بالصيغة "HH:MM"
  fridayKahfEnabled: boolean;       // تذكير سورة الكهف كل جمعة
  morningAthkarEnabled: boolean;    // تذكير أذكار الصباح
  eveningAthkarEnabled: boolean;    // تذكير أذكار المساء
  playtimeWarningsEnabled: boolean; // تنبيهات اقتراب وانتهاء وقت اللعب
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  soundEnabled: true,
  dailyLessonEnabled: true,
  dailyLessonTime: "17:00",
  fridayKahfEnabled: true,
  morningAthkarEnabled: true,
  eveningAthkarEnabled: true,
  playtimeWarningsEnabled: true,
};

const REMINDER_SETTINGS_KEY = "mushaf:reminder_settings:v2";

export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_REMINDER_SETTINGS;
}

export function saveReminderSettings(settings: Partial<ReminderSettings>): ReminderSettings {
  const current = getReminderSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mushaf:reminder_settings_changed", { detail: updated }));
  }
  return updated;
}

// طلب إذن الإشعارات لكافة المنصات
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (await isTauri()) {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      return granted;
    }
  } catch (err) {
    console.error("Tauri permission error:", err);
  }

  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * إرسال إشعار فوري: يعمل على نظام التشغيل مباشرة (Windows/Android عبر Tauri أو المتصفح)
 * مع تشغيل صوت تنبيه نقي وإظهار تنبيه داخلي (Toast) مرئي لضمان وصول التنبيه بكل الأحوال.
 */
export async function showLocalNotification(
  title: string,
  body: string,
  options?: { skipToast?: boolean; sound?: boolean }
) {
  const settings = getReminderSettings();
  const shouldPlaySound = options?.sound !== false && settings.soundEnabled;

  if (shouldPlaySound) {
    playNotificationChime();
  }

  let nativeSuccess = false;

  // 1. نظام تشغيل Tauri (تطبيقات سطح المكتب و Android المجمعة)
  try {
    if (await isTauri()) {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      if (granted) {
        sendNotification({ title, body });
        nativeSuccess = true;
      }
    }
  } catch (err) {
    console.error("Tauri notification error:", err);
  }

  // 2. نظام المتصفح أو ServiceWorker في بيئة الويب
  if (!nativeSuccess && typeof window !== "undefined" && "Notification" in window) {
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
            nativeSuccess = true;
          }
        }
        if (!nativeSuccess) {
          new Notification(title, { body, icon: "/pwa-192x192.png", tag: title });
          nativeSuccess = true;
        }
      } catch (err) {
        console.error("Native notification display failed", err);
      }
    }
  }

  // 3. تنبيه داخلي فوري (Toast) لضمان رؤية الإشعار حتى لو كان المستخدم يتنقل داخل التطبيق
  if (!options?.skipToast) {
    toast({ title, description: body });
  }

  return nativeSuccess;
}

/**
 * المحرّك الخلفي الشامل للإشعارات والتذكيرات الذكية
 * يعمل في الخلفية طوال فترة تشغيل التطبيق
 */
export function useBackgroundNotifications() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // طلب الإذن عند بدء التطبيق بهدوء
    void requestNotificationPermission().catch(() => {});

    const deviceId = getDeviceId();

    // 1. الاستماع لإعلانات السيرفر العامة من Supabase
    const announceSub = supabase
      .channel("public:announcements")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload) => {
          const newAnnounce = payload.new;
          if (newAnnounce.is_active) {
            void showLocalNotification("إعلان جديد 📢", newAnnounce.title || "تفقّد الإشعارات لمعرفة الجديد!");
          }
        }
      )
      .subscribe();

    // 2. الاستماع لردود الدعم الفني الخاصة بالجهاز
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
                if (msg.sender !== "user") {
                  void showLocalNotification("رد من الدعم الفني 💬", msg.body || "لديك رسالة جديدة في الدعم الفني");
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

    // 3. الاستماع لأحداث إتمام الورد وفتح الألعاب
    const handleGamesUnlocked = () => {
      const settings = getReminderSettings();
      if (settings.enabled) {
        void showLocalNotification(
          "🎉 مبارك! فُتحت الألعاب",
          "أحسنت يا بطل! أتممت ورد الاستماع واستحققت وقتاً ممتعاً في الألعاب ⭐"
        );
      }
    };
    window.addEventListener("mushaf:games_unlocked", handleGamesUnlocked);

    // 4. فحص دوري ذكي كل 30 ثانية لكافة التذكيرات (الورد، الكهف، الأذكار، وقت اللعب)
    const checkReminders = () => {
      const settings = getReminderSettings();
      if (!settings.enabled) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = currentHour * 60 + now.getMinutes();
      const hhmm = `${String(currentHour).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayStr = now.toDateString();
      const dayOfWeek = now.getDay(); // 5 = الجمعة

      // ── أ) تذكير الدرس القرآني اليومي ──
      if (settings.dailyLessonEnabled) {
        const profile = getProfile();
        const targetTime = profile.lessonTime || settings.dailyLessonTime || "17:00";
        const lastNotif = localStorage.getItem("mushaf:notif:lesson") || "";

        if (hhmm >= targetTime && lastNotif !== todayStr) {
          try {
            localStorage.setItem("mushaf:notif:lesson", todayStr);
          } catch { /* ignore */ }
          void showLocalNotification(
            "حان وقت درس القرآن 📖",
            "هيا نستمع للتلاوات العطرة ونتدبر آيات كتاب الله 🌟"
          );
        }
      }

      // ── ب) تذكير سورة الكهف يوم الجمعة (بدءاً من الساعة 9 صباحاً) ──
      if (settings.fridayKahfEnabled && dayOfWeek === 5 && currentHour >= 9) {
        const lastKahf = localStorage.getItem("mushaf:notif:kahf") || "";
        if (lastKahf !== todayStr) {
          try {
            localStorage.setItem("mushaf:notif:kahf", todayStr);
          } catch { /* ignore */ }
          void showLocalNotification(
            "سورة الكهف ⛰️ نور ما بين الجمعتين",
            "جمعة مباركة! لا تنسَ قراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ 🌿"
          );
        }
      }

      // ── ج) أذكار الصباح (بين 8:00 صباحاً و 11:30 صباحاً) ──
      if (settings.morningAthkarEnabled && currentHour >= 8 && currentHour < 12) {
        const lastMorning = localStorage.getItem("mushaf:notif:morning") || "";
        if (lastMorning !== todayStr) {
          try {
            localStorage.setItem("mushaf:notif:morning", todayStr);
          } catch { /* ignore */ }
          void showLocalNotification(
            "أذكار الصباح ☀️",
            "أصبحنا وأصبح الملك لله.. يومك مبارك بذكر الله وتلاوة كتابه 🌿"
          );
        }
      }

      // ── د) أذكار المساء (بين 5:00 مساءً و 9:30 مساءً) ──
      if (settings.eveningAthkarEnabled && currentHour >= 17 && currentHour < 22) {
        const lastEvening = localStorage.getItem("mushaf:notif:evening") || "";
        if (lastEvening !== todayStr) {
          try {
            localStorage.setItem("mushaf:notif:evening", todayStr);
          } catch { /* ignore */ }
          void showLocalNotification(
            "أذكار المساء 🌙",
            "أمسينا وأمسى الملك لله.. ألا بذكر الله تطمئن القلوب 💫"
          );
        }
      }

      // ── هـ) تنبيهات وقت اللعب للأطفال (عند التواجد في صفحة الألعاب أو وضع الأطفال) ──
      if (settings.playtimeWarningsEnabled) {
        const isGamesPage = window.location.pathname.includes("/games");
        const schedule = getKidsSchedule();
        const profile = getProfile();
        const progress = getProgress();

        // 1. تنبيه اقتراب نهاية وقت اللعب في الجدول (قبل 5 دقائق)
        if (isGamesPage && schedule.enabled) {
          const [endH, endM] = schedule.endTime.split(":").map(Number);
          const endMinutes = endH * 60 + endM;
          if (currentMinutes >= endMinutes - 5 && currentMinutes < endMinutes) {
            const key = `${todayStr}_schedule_5min`;
            if (localStorage.getItem("mushaf:notif:play5m") !== key) {
              try { localStorage.setItem("mushaf:notif:play5m", key); } catch { /* ignore */ }
              void showLocalNotification(
                "تنبيه اقتراب نفاد وقت اللعب ⏳",
                "بقي 5 دقائق فقط على انتهاء وقت اللعب المسموح حسب الجدول!"
              );
            }
          }
        }

        // 2. تنبيه انتهاء وقت اللعب حسب الجدول
        if (isGamesPage && schedule.enabled) {
          const scheduleCheck = isTimeAllowed();
          if (!scheduleCheck.allowed) {
            const key = `${todayStr}_schedule_expired`;
            if (localStorage.getItem("mushaf:notif:schedExpired") !== key) {
              try { localStorage.setItem("mushaf:notif:schedExpired", key); } catch { /* ignore */ }
              void showLocalNotification(
                "انتهى وقت اللعب ⏰",
                scheduleCheck.reason || "لقد انتهى وقت اللعب المخصص لليوم."
              );
            }
          }
        }

        // 3. تنبيه دقائق اللعب المسموحة للطفل (playMinutes) قبل 5 دقائق
        if (isGamesPage && profile.playMinutes > 0) {
          const remaining = profile.playMinutes - (progress.played || 0);
          if (remaining <= 5 && remaining > 0) {
            const warned = sessionStorage.getItem("mushaf:notif:playMinutes5Warn");
            if (!warned) {
              try { sessionStorage.setItem("mushaf:notif:playMinutes5Warn", "1"); } catch { /* ignore */ }
              void showLocalNotification(
                "تنبيه اقتراب نفاد وقت اللعب ⏳",
                `بقي ${Math.ceil(remaining)} دقائق فقط على انتهاء وقت اللعب المخصص!`
              );
            }
          }

          // 4. تنبيه نفاد دقائق اللعب
          if (progress.playExpired) {
            const warnedExpired = sessionStorage.getItem("mushaf:notif:playMinutesExpiredWarn");
            if (!warnedExpired) {
              try { sessionStorage.setItem("mushaf:notif:playMinutesExpiredWarn", "1"); } catch { /* ignore */ }
              void showLocalNotification(
                "انتهى وقت اللعب ⏰",
                "لقد استنفدت دقائق اللعب المسموحة لليوم. أحسنت يا بطل!"
              );
            }
          }
        }
      }
    };

    // تشغيل الفحص الأولي وفحص متكرر كل 30 ثانية
    checkReminders();
    const intervalId = setInterval(checkReminders, 30000);

    return () => {
      supabase.removeChannel(announceSub);
      if (supportSub) supabase.removeChannel(supportSub);
      window.removeEventListener("mushaf:games_unlocked", handleGamesUnlocked);
      clearInterval(intervalId);
    };
  }, []);
}
