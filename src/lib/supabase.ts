import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://zqnwhrvwovwdakuuxpkr.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// Create a safe supabase client - won't crash if credentials are missing
export const supabase = createClient(supabaseUrl, supabaseAnonKey || "placeholder", {
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
