import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zqnwhrvwovwdakuuxpkr.supabase.co";
const supabaseAnonKey = "sb_publishable_kjhsyZVWYqoy-7sX9jJx2A_TyELp9eD";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      "Cache-Control": "no-cache",
    },
  },
});

// Suppress WebSocket errors in development
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = function(...args: any[]) {
    if (args[0]?.toString().includes("WebSocket") || args[0]?.toString().includes("ws://")) {
      return;
    }
    originalError.apply(console, args);
  };
}
