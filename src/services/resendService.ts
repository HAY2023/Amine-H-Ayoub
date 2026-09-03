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

export const SUPPORT_EMAILS = ["hammoualiyoucef20@gmail.com", "Amine.hyoub@gmail.com"];

export function createMailtoSupportLink(report: Partial<SupportReportData>): string {
  const to = "hammoualiyoucef20@gmail.com";
  const subject = encodeURIComponent(`[دعم تطبيق القرآن] ${report.typeLabel || "تقرير"} - ${report.profileName || "مستخدم"}`);
  const body = encodeURIComponent(
    `السلام عليكم ورحمة الله وبركاته،\n\n` +
    `نوع الرسالة: ${report.typeLabel || "مشكلة تقنية"}\n` +
    `المرسل: ${report.profileName || "مستخدم التطبيق"}\n` +
    `البريد للرد: ${report.senderEmail || "لم يُحدد"}\n` +
    `إصدار التطبيق: ${report.appVersion || "1.0.0"}\n` +
    `الجهاز / النظام: ${report.platform || "Web"}\n` +
    `وقت الإرسال: ${report.timestamp || new Date().toLocaleString("ar-SA")}\n\n` +
    `=========================================\n` +
    `نص الرسالة / البلاغ:\n${report.description || ""}\n` +
    `=========================================\n`
  );
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export async function sendSupportReportEmail(
  report: SupportReportData,
): Promise<{ success: boolean; error?: string; mailtoLink?: string }> {
  let emailDelivered = false;
  let dbSaved = false;

  const mailtoLink = createMailtoSupportLink(report);

  // 1. القناة الأولى: إرسال فوري إلى البريد عبر FormSubmit الموثوق
  try {
    const payload = {
      name: report.profileName || "مستخدم التطبيق",
      email: report.senderEmail || "noreply@learn-quran.app",
      _subject: `[تطبيق القرآن] ${report.typeLabel} من: ${report.profileName || "مستخدم"}`,
      _replyto: report.senderEmail || undefined,
      نوع_الرسالة: report.typeLabel,
      المرسل: report.profileName || "مستخدم التطبيق",
      البريد: report.senderEmail || "غير محدد",
      الإصدار: report.appVersion,
      النظام: report.platform,
      الوقت: report.timestamp,
      نص_الرسالة: report.description,
    };

    const requests = SUPPORT_EMAILS.map((targetEmail) =>
      fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .catch(() => null)
    );

    const responses = await Promise.allSettled(requests);
    emailDelivered = responses.some(
      (r) => r.status === "fulfilled" && r.value && (r.value.success === "true" || r.value.success === true)
    );
  } catch (err) {
    console.debug("FormSubmit error", err);
  }

  // 2. القناة الثانية: استدعاء دالة Supabase Edge Function إن كانت متاحة
  if (hasValidSupabaseKey()) {
    try {
      const { data, error } = await supabase.functions.invoke("send-support-report", {
        body: report,
      });
      if (!error && data?.success) {
        emailDelivered = true;
      }
    } catch {
      /* ignore edge function error */
    }

    // 3. القناة الثالثة: حفظ الرسالة بشكل دائم في قاعدة بيانات Supabase
    try {
      const deviceId = getDeviceId();
      const { data: conversation } = await supabase
        .from("support_conversations")
        .upsert(
          { device_id: deviceId, user_name: report.profileName || "مستخدم التطبيق" },
          { onConflict: "device_id" }
        )
        .select("id")
        .single();

      if (conversation?.id) {
        const body = [
          `[${report.typeLabel}]`,
          report.description,
          `البريد: ${report.senderEmail || "غير محدد"}`,
          `الإصدار: ${report.appVersion}`,
          `الجهاز: ${report.platform}`,
          `الوقت: ${report.timestamp}`,
        ].join("\n");

        const { error: msgErr } = await supabase
          .from("support_messages")
          .insert({ conversation_id: conversation.id, sender: "user", body });

        if (!msgErr) {
          dbSaved = true;
        }
      }
    } catch {
      /* ignore db error */
    }
  }

  if (emailDelivered || dbSaved) {
    return { success: true, mailtoLink };
  }

  // إذا تعذر الإرسال التلقائي لأي سبب، نعيد رابط الـ mailto لإرسالها بنقرة واحدة
  return {
    success: false,
    mailtoLink,
    error: "تعذر الإرسال التلقائي عبر الخادم، يمكنك الضغط على زر الإرسال المباشر عبر بريدك.",
  };
}
