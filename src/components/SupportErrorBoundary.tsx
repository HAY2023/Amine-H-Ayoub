import { ErrorBoundary } from "react-error-boundary";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, UploadCloud } from "lucide-react";
import { Button } from "./ui/button";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!screenshot) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(screenshot);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

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

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 w-full text-right space-y-3">
          <div className="flex items-start gap-3">
            <Camera className="w-6 h-6 text-amber-600 mt-1 shrink-0" />
            <div className="text-left">
              <p className="text-amber-800 text-sm font-bold leading-relaxed">
                أرسل لقطة شاشة للمشكلة إلى الدعم الفني.
              </p>
              <p className="text-slate-700 text-sm leading-relaxed">
                يمكنك رفع صورة هنا أو حفظها ثم إرسالها في محادثة الدعم داخل التطبيق أو عبر الواتساب.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setScreenshot(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-50"
            >
              <UploadCloud className="w-5 h-5" /> رفع لقطة شاشة
            </button>
            {previewUrl && (
              <div className="rounded-2xl border border-border bg-slate-100 p-3">
                <p className="text-xs font-bold text-slate-500 mb-2">معاينة الصورة المرفوعة</p>
                <img src={previewUrl} alt="معاينة لقطة الشاشة" className="w-full rounded-xl object-contain" />
                {screenshot && <p className="mt-2 text-xs text-slate-500">{screenshot.name}</p>}
              </div>
            )}
          </div>
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
