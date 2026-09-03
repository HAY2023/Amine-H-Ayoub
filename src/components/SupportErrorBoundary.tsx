import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle, Send, RefreshCw, Trash2, Loader2, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { sendSupportReportEmail, createMailtoSupportLink } from "@/services/resendService";
import { getProfile } from "@/data/kidsProfile";
import { CURRENT_VERSION } from "@/utils/updateChecker";
import { toast } from "@/hooks/use-toast";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleDirectSend = async () => {
    setSending(true);
    setStatusMsg("جاري تجهيز تقرير الخطأ...");
    let copied = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`Error: ${error.message}\nStack: ${error.stack || "N/A"}`);
        copied = true;
      }
    } catch {
      /* ignore */
    }

    try {
      const activeProfile = getProfile();
      const res = await sendSupportReportEmail({
        type: "bug",
        typeLabel: "مشكلة تقنية (تلقائي)",
        description: `Crash Report:\n${error.message}\nStack: ${error.stack || "N/A"}`,
        profileName: activeProfile?.name || "مستخدم التطبيق",
        appVersion: CURRENT_VERSION,
        platform: typeof navigator !== "undefined" ? navigator.userAgent : "Web",
        timestamp: new Date().toLocaleString("ar-SA"),
      });

      setSent(true);
      if (res.success) {
        setStatusMsg("✓ تم إرسال التقرير بنجاح للدعم الفني وسيتم فحصه فوراً. شكراً لمساعدتك!");
        toast({
          title: "تم إرسال التقرير بنجاح 🌸",
          description: "شكراً لك، سنقوم بحل المشكلة في أقرب وقت.",
        });
      } else {
        setStatusMsg(copied ? "✓ تم نسخ تفاصيل الخطأ للحافظة بنجاح. يمكنك لصقها وإرسالها لنا." : "تم تسجيل تفاصيل الخطأ.");
        toast({
          title: "تم نسخ تفاصيل الخطأ",
          description: "يمكنك إرسالها إلينا مباشرة.",
        });
      }
    } catch {
      setSent(true);
      setStatusMsg(copied ? "✓ تم نسخ تفاصيل الخطأ للحافظة بنجاح." : "تم رصد الخطأ.");
    } finally {
      setSending(false);
    }
  };

  const handleHardReset = () => {
    try {
      sessionStorage.clear();
      // مسح الكاشات المؤقتة فقط
      Object.keys(localStorage).forEach((key) => {
        if (key.includes("cache") || key.includes("temp")) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-quran text-right" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border-2 border-red-100 flex flex-col items-center text-center gap-5">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-800">عفواً! حدث خطأ غير متوقع</h2>
          <p className="text-slate-600 text-sm">
            تم تسجيل الخطأ ويمكنك إرساله للدعم الفني أو إعادة تحميل التطبيق.
          </p>
        </div>

        <div className="bg-slate-100 rounded-xl p-3 w-full text-left overflow-auto max-h-28">
          <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap" dir="ltr">
            {error.message || "Unknown error"}
          </pre>
        </div>

        <div className="flex flex-col w-full gap-2.5">
          <Button
            onClick={resetErrorBoundary}
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة والتشغيل
          </Button>

          <Button
            onClick={handleDirectSend}
            disabled={sending || sent}
            variant="outline"
            className="w-full h-12 text-sm border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
            {sent ? "تم إرسال التقرير لحسابك عبر الخادم ✓" : "إرسال تقرير بالخطأ للدعم الفني تلقائياً"}
          </Button>

          <a
            href={createMailtoSupportLink({
              typeLabel: "بلاغ خطأ تلقائي",
              description: `Crash Report:\n${error.message}\nStack: ${error.stack || "N/A"}`,
              appVersion: CURRENT_VERSION,
              platform: typeof navigator !== "undefined" ? navigator.userAgent : "Web",
            })}
            className="w-full h-11 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Mail className="w-4 h-4 text-amber-700" />
            فتح الإيميل والإرسال مباشرة إلى (hammoualiyoucef20@gmail.com)
          </a>

          <Button
            onClick={handleHardReset}
            variant="ghost"
            className="w-full text-xs text-slate-400 hover:text-red-500 rounded-xl font-medium flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            مسح الذاكرة المؤقتة وإعادة التشغيل
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SupportErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        window.location.href = "/";
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
