import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SupportReport = {
  typeLabel?: string;
  description?: string;
  senderEmail?: string;
  profileName?: string;
  appVersion?: string;
  platform?: string;
  timestamp?: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, 405);

  try {
    const report = await req.json() as SupportReport;
    const description = String(report.description || "").trim();
    if (!description || description.length > 6000) {
      return jsonResponse({ error: "نص الرسالة مطلوب وأقصاه 6000 حرف" }, 400);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const targetEmails = (Deno.env.get("SUPPORT_EMAILS") || Deno.env.get("SUPPORT_EMAIL") || "hammoualiyoucef20@gmail.com")
      .split(",")
      .map((email) => email.trim())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (targetEmails.length === 0) return jsonResponse({ error: "لم يتم إعداد بريد الدعم" }, 503);
    if (!apiKey) return jsonResponse({ error: "خدمة البريد غير مُعدّة على الخادم" }, 503);

    const sender = String(report.profileName || "مستخدم التطبيق").trim().slice(0, 120);
    const typeLabel = String(report.typeLabel || "رسالة عامة").trim().slice(0, 80);
    const replyTo = String(report.senderEmail || "").trim();
    const text = [
      "رسالة جديدة من تطبيق القرآن الكريم",
      "=====================================",
      `اسم المرسل: ${sender}`,
      `نوع الرسالة: ${typeLabel}`,
      `البريد للرد: ${replyTo || "لم يُحدد"}`,
      `إصدار التطبيق: ${String(report.appVersion || "غير معروف").slice(0, 40)}`,
      `النظام / الجهاز: ${String(report.platform || "غير معروف").slice(0, 300)}`,
      `وقت الإرسال: ${String(report.timestamp || new Date().toISOString()).slice(0, 80)}`,
      "",
      "نص الرسالة:",
      description,
    ].join("\n");

    const email: Record<string, unknown> = {
      from: "Quran App <onboarding@resend.dev>",
      to: targetEmails,
      subject: `[تطبيق القرآن] ${typeLabel} من: ${sender}`,
      text,
    };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) email.reply_to = replyTo;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(email),
    });

    if (!response.ok) {
      console.error("Resend error", response.status, await response.text());
      return jsonResponse({ error: "تعذر إرسال البريد من الخادم" }, 502);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("send-support-report error", error);
    return jsonResponse({ error: "بيانات الرسالة غير صالحة" }, 400);
  }
});
