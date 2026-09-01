import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle, Send, Copy, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { sendSupportReportEmail } from "@/services/resendService";
import { getProfile } from "@/data/kidsProfile";
import { CURRENT_VERSION } from "@/utils/updateChecker";
import { toast } from "@/hooks/use-toast";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  const [sending, setSending] = useState(false);

  const handleDirectSend = async () => {
    setSending(true);
    let copied = false;
    try {
      // 1. Copy to clipboard (might fail in some environments)
      await navigator.clipboard.writeText(error.message);
      copied = true;
    } catch (e) {
      console.warn("Could not copy to clipboard", e);
    }

    try {
      // 2. Send directly
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

      if (res.success) {
        toast({
          title: copied ? "تم إرسال الخطأ ونسخه للحافظة 🌸" : "تم إرسال الخطأ بنجاح 🌸",
          description: "شكراً لك، سنقوم بحل المشكلة في أقرب وقت.",
        });
      } else {
        toast({
          title: "تعذر الإرسال التلقائي",
          description: res.error || "يرجى التواصل معنا عبر الواتساب أو البريد.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "خطأ غير متوقع",
        description: "تعذر إرسال تقرير المشكلة.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-quran text-right" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border-2 border-red-100 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-2">
            <AlertTriangle className="w-10 h-10" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800">عفواً! حدث خطأ غير متوقع</h2>
          
          <p className="text-slate-600 text-lg">
            لا تقلق، سنساعدك على حل المشكلة بسرعة.
          </p>

          <div className="bg-slate-100 rounded-xl p-4 w-full text-left overflow-auto max-h-32 mb-2">
            <pre className="text-xs text-slate-500 font-mono" dir="ltr">
              {error.message}
            </pre>
          </div>

          <div className="flex flex-col w-full gap-3">
            <Button 
              onClick={handleDirectSend}
              disabled={sending}
              className="w-full h-14 text-lg bg-green-500 hover:bg-green-600 rounded-xl text-white font-bold flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? "جاري الإرسال..." : "نسخ الخطأ وإرساله للدعم"}
            </Button>

            <Button 
              onClick={resetErrorBoundary}
              variant="outline"
              className="w-full h-14 text-lg border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold"
            >
              إعادة تحميل التطبيق
            </Button>
          </div>
        </div>
      </div>
    </>
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


