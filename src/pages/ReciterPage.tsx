import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";

export default function ReciterPage() {
  return (
    <div className="min-h-screen page-nour text-foreground px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-[2rem] border border-border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/20 text-accent shadow-soft">
            <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2">صفحة القارئ</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">هذه الصفحة متاحة حالياً كمكان لعرض ميزات القارئ والدعم. سيتم تفعيلها قريباً.</p>
          <div className="mt-6">
            <Link to="/" className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-soft hover:brightness-110 transition-all">
              <ArrowRight className="w-4 h-4" /> العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
