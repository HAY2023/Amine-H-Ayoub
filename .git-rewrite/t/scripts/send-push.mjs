import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const VAPID_PUBLIC = process.env.VITE_PUSH_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VITE_PUSH_VAPID_PRIVATE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error("Missing VAPID keys. Set VITE_PUSH_VAPID_PUBLIC_KEY and VITE_PUSH_VAPID_PRIVATE_KEY.");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase configuration. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

webpush.setVapidDetails(
  "mailto:admin@example.com",
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function loadSubscriptions() {
  const { data, error } = await supabase
    .from("store")
    .select("value")
    .like("key", "push_subscription:%");
  if (error) {
    console.error("Failed to load subscriptions from Supabase", error);
    return [];
  }
  return Array.isArray(data) ? data.map((row) => row.value).filter(Boolean) : [];
}

const payload = JSON.stringify({
  title: process.argv[2] || "Learn Quran Kids",
  body: process.argv[3] || "إشعار جديد من التطبيق",
  icon: "/pwa-192x192.png",
  url: process.argv[4] || "/"
});

(async () => {
  const subscriptions = await loadSubscriptions();
  if (!subscriptions.length) {
    console.log("No push subscriptions found.");
    return;
  }

  await Promise.all(subscriptions.map((sub) =>
    webpush.sendNotification(sub, payload).catch((err) => {
      console.error("Failed to send to subscription", err.statusCode, err.body || err.message);
    })
  ));
  console.log("Push notifications sent.");
})();
