// supabase/functions/update-releases/index.ts
// ════════════════════════════════════════════════════════════════
// وسيط آمن بين لوحة التحكم (Admin Panel) و GitHub API
// يمنع أي تسريب لـ GitHub Personal Access Token في الفرونت إند
//
// هذه الدالة تقبل طلبات من لوحة التحكم لتعديل releases.json
// وتُنفذها عبر GitHub Contents API مع التوكن المحفوظ كـ Secret
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// إعدادات GitHub — التوكن محفوظ في Supabase Secrets فقط
const GITHUB_TOKEN = Deno.env.get("GITHUB_PAT")!;
const GITHUB_REPO = "HAY2023/Amine-H-Ayoub";
const GITHUB_BRANCH = "gh-pages";
const FILE_PATH = "releases-site/releases.json";

// ──────────── دوال GitHub API ────────────

/** جلب محتوى releases.json الحالي من GitHub */
async function fetchReleasesJson(): Promise<{ content: string; sha: string }> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GET failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // GitHub يُرجع المحتوى مُرمّزاً بـ Base64
  const decoded = atob(data.content.replace(/\n/g, ""));
  return { content: decoded, sha: data.sha };
}

/** كتابة releases.json المُعدّل إلى GitHub */
async function writeReleasesJson(
  newContent: string,
  sha: string,
  commitMessage: string
): Promise<void> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const encoded = btoa(unescape(encodeURIComponent(newContent)));

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: commitMessage,
      content: encoded,
      sha: sha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT failed (${res.status}): ${text}`);
  }
}

// ──────────── معالج الطلبات الرئيسي ────────────

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── التحقق من هوية المستخدم (يجب أن يكون مسجّل دخول) ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "غير مصرّح: يجب تسجيل الدخول" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "غير مصرّح: جلسة غير صالحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── التحقق من صلاحيات الأدمن ──
    // يمكنك تعديل هذا ليتحقق من جدول في قاعدة البيانات
    const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "").split(",");
    if (!ADMIN_EMAILS.includes(user.email || "")) {
      return new Response(
        JSON.stringify({ error: "غير مصرّح: ليست لديك صلاحيات أدمن" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── معالجة الطلب ──
    const body = await req.json();
    const { action } = body;

    // ── 1. جلب البيانات الحالية ──
    if (action === "get") {
      const { content } = await fetchReleasesJson();
      return new Response(content, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. تحديث البيانات ──
    if (action === "update") {
      const { releases_data, commit_message } = body;
      if (!releases_data) {
        return new Response(
          JSON.stringify({ error: "releases_data مطلوب" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // جلب آخر نسخة (نحتاج الـ SHA للتحديث)
      const { sha } = await fetchReleasesJson();

      // كتابة النسخة الجديدة
      const jsonStr = JSON.stringify(releases_data, null, 2);
      await writeReleasesJson(
        jsonStr,
        sha,
        commit_message || `chore: update releases.json via admin panel`
      );

      return new Response(
        JSON.stringify({ success: true, message: "تم التحديث بنجاح ✅" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "action غير معروف. استخدم 'get' أو 'update'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge Function Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
