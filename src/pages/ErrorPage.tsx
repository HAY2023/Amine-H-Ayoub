import { useNavigate } from "react-router-dom";
import { AlertTriangle, MessageSquare, RefreshCw } from "lucide-react";

export default function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="page-nour relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-foreground" dir="rtl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-accent/15 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-accent/15 to-transparent"
      />

      <div className="card-nour relative z-10 w-full max-w-lg px-8 py-12 text-center shadow-soft">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-inner">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <h1 className="mb-3 text-4xl font-extrabold text-foreground">حدث خطأ في التطبيق</h1>
        <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
          نعتذر عن هذا الانقطاع. يمكنك تجربة إعادة تحميل التطبيق أو التواصل مع الدعم الفني للحصول على مساعدة فورية.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-gold px-4 py-3 text-sm font-bold"
          >
            إعادة تحميل التطبيق
          </button>
          <button
            type="button"
            onClick={() => navigate("/support")}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-bold text-foreground hover:bg-slate-50"
          >
            فتح صفحة الدعم الفني
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-slate-50 p-5 text-right">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="font-bold text-foreground">أرسل لنا لقطة شاشة</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            إذا استمر الخطأ، انتقل إلى صفحة الدعم وأرفق لقطة شاشة للمشكلة حتى نتمكن من حلها بسرعة.
          </p>
        </div>
      </div>
    </div>
  );
}
