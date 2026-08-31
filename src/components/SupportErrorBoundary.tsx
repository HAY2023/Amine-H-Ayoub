import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle, Send } from "lucide-react";
import { Button } from "./ui/button";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  const handleContactSupport = () => {
    const errorText = `مرحباً فريق الدعم، لقد واجهت مشكلة في التطبيق:\n\n${error.message}\n\nيرجى المساعدة.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(errorText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
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
            onClick={handleContactSupport}
            className="w-full h-14 text-lg bg-green-500 hover:bg-green-600 rounded-xl text-white font-bold flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            إرسال المشكلة للدعم الفني
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

