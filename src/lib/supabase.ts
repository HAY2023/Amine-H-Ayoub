import { createClient } from "@supabase/supabase-js";

// Ensure you replace these with your actual Supabase URL and Anon Key
const supabaseUrl = "https://zqnwhrvwovwdakuuxpkr.supabase.co";
const supabaseAnonKey = "sb_publishable_kjhsyZVWYqoy-7sX9jJx2A_TyELp9eD";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
