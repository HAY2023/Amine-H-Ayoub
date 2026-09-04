import { ErrorBoundary } from "react-error-boundary";
import { RefreshCw, Trash2, HeartHandshake } from "lucide-react";
import { Button } from "./ui/button";
import WhatsAppIcon from "./WhatsAppIcon";
import { openWhatsAppSupport, SUPPORT_WHATSAPP_DISPLAY } from "@/services/resendService";
import { getProfile } from "@/data/kidsProfile";
import { CURRENT_VERSION } from "@/utils/updateChecker";

function ErrorFallback({ resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const handleWhatsAppContact = () => {
    const activeProfile = getProfile();
    const profileName = activeProfile?.name || "مستخدم التطبيق";
    const msg =
      `السلام عليكم ورحمة الله وبركاته،\n` +
      `أحتاج مساعدة من الدعم الفني لتطبيق القرآن للأطفال:\n` +
      `• إصدار التطبيق: ${CURRENT_VERSION}\n` +
      `• واجهت توقفاً مؤقتاً في التطبيق وأرجو المساعدة.`;

    void openWhatsAppSupport(msg);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50/50 via-slate-50 to-teal-50/50 p-4 font-quran text-right" dir="rtl">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-emerald-100/80 flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-200">
        
        {/* أيقونة ودودة ومطمئنة */}
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-3xl flex items-center justify-center ring-8 ring-emerald-500/5 shadow-inner">
          <HeartHandshake className="w-10 h-10" />
        </div>

        {/* رسالة لطيفة بدون أي نصوص أخطاء تقنية */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800">نعتذر منك، حدث توقف مؤقت بسيط 🌸</h2>
          <p className="text-slate-600 text-sm leading-relaxed max-w-xs mx-auto font-medium">
            لا تقلق، جميع محفوظاتك وبياناتك في أمان تام. نحن هنا لمساعدتك في أي وقت لحل المشكلة فوراً.
          </p>
        </div>

        {/* الأزرار والإجراءات */}
        <div className="flex flex-col w-full gap-3">
          {/* زر واتساب الرئيسي المباشر للرقم 0658188644 */}
          <button
            type="button"
            onClick={handleWhatsAppContact}
            className="w-full h-14 text-base bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] transition-all rounded-2xl text-white font-extrabold shadow-lg shadow-[#25D366]/25 flex items-center justify-center gap-3 cursor-pointer"
          >
            <WhatsAppIcon className="w-6 h-6 text-white shrink-0" />
            <span>تواصل مع الدعم الفني عبر واتساب ({SUPPORT_WHATSAPP_DISPLAY})</span>
          </button>

          {/* زر إعادة المحاولة */}
          <Button
            onClick={resetErrorBoundary}
            className="w-full h-12 text-sm bg-slate-800 hover:bg-slate-900 active:scale-[0.98] transition-all rounded-2xl text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة تشغيل التطبيق</span>
          </Button>

          {/* زر مسح الذاكرة المؤقتة والبدء من جديد */}
          <Button
            onClick={handleHardReset}
            variant="ghost"
            className="w-full h-10 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-xl font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح الذاكرة المؤقتة والعودة للرئيسية</span>
          </Button>
        </div>

        <p className="text-[11px] text-slate-400 font-medium">
          الدعم الفني متاح دائماً لخدمتكم ومساعدتكم عبر واتساب
        </p>
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
