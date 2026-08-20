import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

let envContent = "";
try {
  envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
} catch {
  // ignore
}

const env = {};
envContent.split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, '');
});

const url = env.VITE_SUPABASE_URL || "https://cjrwtzcgtiqsbrqplouy.supabase.co";
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_HteeGJaZEmUIkzlEFr7lyg_qLHvOSNr";

console.log("=== RLS VERIFICATION & ISOLATION TEST ===");
console.log("Target Supabase URL:", url);
console.log("Using Anon/Publishable Key (starts with):", anonKey.slice(0, 16) + "...");

async function runTests() {
  // Test 1: Anonymous client with NO custom device-id header and NO authentication session
  console.log("\n--- TEST 1: Unauthenticated Query (No device header) ---");
  const clientNoHeader = createClient(url, anonKey);
  
  const { data: convsNoHeader, error: err1 } = await clientNoHeader
    .from("support_conversations")
    .select("id, device_id, user_name")
    .limit(5);

  console.log("Result for support_conversations (No Header):", {
    rowCount: convsNoHeader ? convsNoHeader.length : 0,
    data: convsNoHeader,
    error: err1 ? err1.message : null
  });

  const { data: msgsNoHeader, error: err2 } = await clientNoHeader
    .from("support_messages")
    .select("id, conversation_id, sender, body")
    .limit(5);

  console.log("Result for support_messages (No Header):", {
    rowCount: msgsNoHeader ? msgsNoHeader.length : 0,
    data: msgsNoHeader,
    error: err2 ? err2.message : null
  });

  // Test 2: Anonymous client with specific Device ID Header A
  const deviceA = "device_test_isolated_alpha_12345";
  console.log(`\n--- TEST 2: Query scoped to Device A (${deviceA}) ---`);
  const clientDeviceA = createClient(url, anonKey, {
    global: {
      headers: { "x-device-id": deviceA }
    }
  });

  const { data: convsDeviceA, error: errA } = await clientDeviceA
    .from("support_conversations")
    .select("id, device_id, user_name")
    .eq("device_id", deviceA);

  console.log(`Result for support_conversations with device_id=${deviceA}:`, {
    rowCount: convsDeviceA ? convsDeviceA.length : 0,
    data: convsDeviceA,
    error: errA ? errA.message : null
  });

  // Test 3: Checking pg_tables query representation
  console.log("\n--- TEST 3: SQL Check Command for pg_tables & Policies ---");
  console.log("To inspect RLS status directly in PostgreSQL/Supabase SQL Editor, run:");
  console.log(`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('support_conversations', 'support_messages');`);
  console.log(`SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('support_conversations', 'support_messages');`);
}

runTests().catch(console.error);
