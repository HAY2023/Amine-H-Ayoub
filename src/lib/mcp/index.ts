import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSurahsTool from "./tools/list_surahs";
import getSurahTool from "./tools/get_surah";
import whoamiTool from "./tools/whoami";

// Build the OAuth issuer from the project ref (inlined by Vite at build time,
// keeping this entry import-safe for both manifest extraction and Edge Function
// cold start).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "learn-quran-kids-mcp",
  title: "المصحف المعلم برواية ورش — MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Learn Quran Kids app (Warsh narration by Amin Haj Ayoub). " +
    "Use `list_surahs` to list all 114 surahs, `get_surah` to look up one by number, " +
    "and `whoami` to confirm the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSurahsTool, getSurahTool, whoamiTool],
});
