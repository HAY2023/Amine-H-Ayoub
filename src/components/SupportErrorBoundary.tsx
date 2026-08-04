import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle, Camera } from "lucide-react";
import { Button } from "./ui/button";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-quran text-right" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border-2 border-red-100 flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-2">
          <AlertTriangle className="w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800">عفواً! حدث خطأ غير متوقع</h2>
        
        <p className="text-slate-600 text-lg">
          لا تقلق، هذا الخطأ بسيط ويمكننا حله فوراً.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 w-full flex items-start gap-3 text-right">
          <Camera className="w-6 h-6 text-amber-600 mt-1 shrink-0" />
          <p className="text-amber-800 text-sm font-bold leading-relaxed">
            الرجاء التقاط <span className="text-red-600">لقطة شاشة (Screenshot)</span> لهذه الصفحة وإرسالها إلى الدعم الفني عبر الواتساب أو البريد لكي نقوم بحلها لك فوراً.
          </p>
        </div>

        <div className="bg-slate-100 rounded-xl p-4 w-full text-left overflow-auto max-h-32">
          <pre className="text-xs text-slate-500 font-mono" dir="ltr">
            {error.message}
          </pre>
        </div>

        <Button 
          onClick={resetErrorBoundary}
          className="w-full mt-2 h-14 text-lg bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold"
        >
          إعادة تحميل التطبيق
        </Button>
      </div>
    </div>
  );
}

export function SupportErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // إعادة التوجيه للصفحة الرئيسية أو تفريغ التخزين إذا لزم الأمر
        window.location.href = "/";
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
