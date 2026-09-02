import { supabase } from "@/lib/supabase";

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

export async function sendSupportReportEmail(
  report: SupportReportData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-support-report", {
      body: report,
    });

    if (error) {
      return { success: false, error: error.message || "تعذر الاتصال بخدمة الدعم" };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "تعذر إرسال الرسالة" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر الاتصال بخدمة الدعم",
    };
  }
}
