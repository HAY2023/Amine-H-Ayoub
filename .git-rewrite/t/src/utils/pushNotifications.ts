import { supabase } from "@/lib/supabase";
import { getDeviceId } from "./deviceInfo";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function savePushSubscription(subscription: PushSubscription) {
  try {
    const deviceId = getDeviceId();
    await supabase.from("store").upsert({
      key: `push_subscription:${deviceId}`,
      value: subscription,
    });
  } catch (err) {
    console.error("Failed to save push subscription", err);
  }
}

export async function requestPushSubscription() {
  if (typeof window === "undefined" || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  if (!VAPID_PUBLIC_KEY) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await savePushSubscription(existing);
      return existing;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await savePushSubscription(subscription);
    return subscription;
  } catch (err) {
    console.error("Push subscription failed", err);
    return null;
  }
}
