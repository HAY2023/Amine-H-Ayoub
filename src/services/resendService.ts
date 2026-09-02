import { hasValidSupabaseKey, supabase } from "@/lib/supabase";
import { getDeviceId } from "@/utils/deviceInfo";

export interface SupportReportData {
  type: "bug" | "suggestion" | "inquiry" | "thanks" | "other";
  typeLabel: string;
  description: string;
  senderEmail?: string;
  profileName?: string;
  appVersion: string;
  platform: string;
  timestamp: string;
}

function prettifySupportError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("fetch failed") ||
    normalized.includes("load failed") ||
    normalized.includes("offline") ||
    normalized.includes("connection") ||
    normalized.includes("timeout") ||
    normalized.includes("network")
  ) {
    return "خدمة الدعم غير متاحة حالياً. تحقق من إعدادات Supabase واتصال الإنترنت ثم حاول مجدداً.";
  }

  if (normalized.includes("401") || normalized.includes("403") || normalized.includes("not authorized")) {
    return "تعذر إرسال الرسالة بسبب إعدادات الأمان. حاول مجدداً لاحقاً أو تأكد من إعدادات التطبيق.";
  }

  return "تعذر إرسال الرسالة حالياً. يرجى المحاولة مرة أخرى بعد قليل.";
}

export async function sendSupportReportEmail(
  report: SupportReportData,
): Promise<{ success: boolean; error?: string }> {
  if (!hasValidSupabaseKey) {
    return {
      success: false,
      error: "خدمة الدعم غير مُعدّة في نسخة التطبيق الحالية. يجب ضبط إعدادات Supabase ثم إعادة النشر.",
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("send-support-report", {
      body: report,
    });

    if (!error && data?.success) return { success: true };
    if (error) console.debug("Support email returned an error; saving report in Supabase", error);
  } catch (error) {
    console.debug("Support email unavailable; saving report in Supabase", error);
  }

  try {
    const deviceId = getDeviceId();
    const { data: conversation, error: conversationError } = await supabase
      .from("support_conversations")
      .upsert(
        { device_id: deviceId, user_name: report.profileName || "مستخدم التطبيق" },
        { onConflict: "device_id" },
      )
      .select("id")
      .single();

    if (conversationError || !conversation?.id) {
      return {
        success: false,
        error: conversationError ? prettifySupportError(conversationError) : "تعذر إنشاء محادثة الدعم. تحقق من اتصال الإنترنت وحاول مجدداً.",
      };
    }

    const body = [
      `[${report.typeLabel}]`,
      report.description,
      `البريد: ${report.senderEmail || "غير محدد"}`,
      `الإصدار: ${report.appVersion}`,
      `الجهاز: ${report.platform}`,
    ].join("\n");
    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({ conversation_id: conversation.id, sender: "user", body });

    if (messageError) return { success: false, error: prettifySupportError(messageError) };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: prettifySupportError(error),
    };
  }
}
