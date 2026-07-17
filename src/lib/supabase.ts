import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://zqnwhrvwovwdakuuxpkr.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

/** True when a real Supabase anon key is configured (not empty / placeholder). */
export const hasValidSupabaseKey = (): boolean =>
  !!supabaseAnonKey && supabaseAnonKey !== "placeholder";

/**
 * No-op query builder: every chained method returns itself, and
 * resolving the promise yields { data: null, error: null }.
 * This prevents 401 errors when no Supabase key is configured.
 */
const NOOP_RESULT = { data: null, error: null, count: null, status: 200, statusText: "OK" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noopBuilder: any = new Proxy(
  {},
  {
    get(_target, _prop) {
      // .then / .catch / .finally → make it thenable (Promise-like)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (_prop === "then") return (resolve: any) => Promise.resolve(NOOP_RESULT).then(resolve);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (_prop === "catch") return (reject: any) => Promise.resolve(NOOP_RESULT).catch(reject);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (_prop === "finally") return (cb: any) => Promise.resolve(NOOP_RESULT).finally(cb);
      // Any other chained call (.select, .eq, .single, .upsert, etc.) → return self
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (..._args: any[]) => noopBuilder;
    },
  }
);

function createSafeClient(): SupabaseClient {
  if (hasValidSupabaseKey()) {
    return createClient(supabaseUrl, supabaseAnonKey, {
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
  }

  // When no key is available, return a proxy that silently no-ops every call.
  // This prevents ALL 401 errors across the entire app without touching each file.
  console.debug("[supabase] No valid API key — running in offline mode (no network requests).");
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      // .from(), .functions.invoke(), .auth, .storage, etc. → return noopBuilder
      if (prop === "functions") {
        return { invoke: () => Promise.resolve(NOOP_RESULT) };
      }
      if (prop === "from" || prop === "rpc") {
        return () => noopBuilder;
      }
      if (prop === "auth") {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        };
      }
      if (prop === "storage") {
        return { from: () => noopBuilder };
      }
      // Catch-all for any other property
      return () => noopBuilder;
    },
  });
}

// Create a safe supabase client - won't crash or make failing requests if credentials are missing
export const supabase = createSafeClient();
