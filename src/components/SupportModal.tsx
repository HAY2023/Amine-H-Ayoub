import { useState } from "react";
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  Bug,
  Lightbulb,
  HelpCircle,
  Heart,
  AlertCircle,
  User,
  Mail,
  MessageSquare,
} from "lucide-react";
import { sendSupportReportEmail, SupportReportData, createMailtoSupportLink, createWhatsAppSupportLink } from "@/services/resendService";
import { getProfile } from "@/data/kidsProfile";
import { CURRENT_VERSION } from "@/utils/updateChecker";
import { toast } from "@/hooks/use-toast";

interface Props {
  onClose: () => void;
}

type ReportType = "bug" | "suggestion" | "inquiry" | "thanks" | "other";

const REPORT_TYPES: Array<{
  id: ReportType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "bug", label: "مشكلة تقنية", icon: Bug },
  { id: "suggestion", label: "اقتراح فكرة", icon: Lightbulb },
  { id: "inquiry", label: "استفسار", icon: HelpCircle },
  { id: "thanks", label: "شكر وتقدير", icon: Heart },
];

export default function SupportModal({ onClose }: Props) {
  const activeProfile = getProfile();
  const [type, setType] = useState<ReportType>("bug");
  const [senderName, setSenderName] = useState(activeProfile?.name || "");
  const [description, setDescription] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage("يرجى كتابة نص الرسالة أو وصف المشكلة");
      return;
    }

    setSending(true);
    setErrorMessage("");

    const typeItem = REPORT_TYPES.find((t) => t.id === type);

    const reportData: SupportReportData = {
      type,
      typeLabel: typeItem ? typeItem.label : "رسالة عامة",
      description: description.trim(),
      senderEmail: senderEmail.trim() || undefined,
      profileName: senderName.trim() || activeProfile?.name || "مستخدم التطبيق",
      appVersion: CURRENT_VERSION,
      platform: typeof navigator !== "undefined" ? navigator.userAgent : "Web",
      timestamp: new Date().toLocaleString("ar-SA"),
    };

    const res = await sendSupportReportEmail(reportData);
    setSending(false);

    if (res.success) {
      setSentSuccess(true);
      toast({
        title: "تم إرسال الرسالة بنجاح! 🌸",
        description: "شكراً لتواصلك معنا، سنرد عليك في أقرب وقت.",
      });
    } else {
      setErrorMessage(res.error || "تعذر إرسال الرسالة، يرجى المحاولة لاحقاً");
      toast({
        title: "تعذر الإرسال",
        description: res.error || "تحقق من اتصال الإنترنت",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* رأس النافذة */}
        <div className="text-center space-y-1 pt-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-xl text-foreground">تواصل مع الدعم الفني</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            أرسل ملاحظاتك أو استفساراتك وسيقوم فريق العمل بالرد عليك
          </p>
        </div>

        {sentSuccess ? (
          <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center ring-4 ring-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-lg text-foreground">تم استلام رسالتك بنجاح!</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                شكراً جزيلاً لك. وصلت رسالتك إلى بريد الدعم الفني وسنحرص على قراءتها والرد عليك.
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn-gold px-8 py-3 rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-transform"
            >
              تم
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* نوع الرسالة */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-foreground block">نوع الرسالة</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {REPORT_TYPES.map((item) => {
                  const Icon = item.icon;
                  const isSelected = type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      className={`h-16 rounded-2xl p-1.5 flex flex-col items-center justify-center gap-1 border transition-all text-xs font-bold ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/30 scale-[1.02]"
                          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isSelected
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-[11px] truncate w-full text-center">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* اسم المستخدم / اسم الحساب */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>اسمك أو اسم الحساب</span>
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="أدخل اسمك أو اسم الطفل..."
                className="w-full text-xs p-2.5 rounded-xl bg-muted/60 border border-border text-foreground placeholder-muted-foreground focus:border-accent outline-none transition-colors text-right font-medium"
              />
            </div>

            {/* البريد الإلكتروني للتواصل */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>بريدك الإلكتروني (للرد عليك)</span>
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="example@gmail.com (اختياري)..."
                className="w-full text-xs p-2.5 rounded-xl bg-muted/60 border border-border text-foreground placeholder-muted-foreground focus:border-accent outline-none transition-colors text-right"
              />
            </div>

            {/* نص الرسالة أو البلاغ */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-foreground block">
                نص الرسالة أو الملاحظة <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= 600) {
                      setDescription(e.target.value);
                      setErrorMessage("");
                    }
                  }}
                  placeholder="اكتب هنا تفاصيل رسالتك أو اقتراحك وسنقرأها بعناية..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-2xl bg-muted/60 border border-border text-foreground placeholder-muted-foreground focus:border-accent outline-none transition-colors resize-none leading-relaxed"
                />
                <span className="absolute bottom-2 left-3 text-[10px] text-muted-foreground font-mono">
                  {description.length}/600
                </span>
              </div>
            </div>

            {/* رسالة الخطأ إن وُجدت */}
            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-destructive font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* زر الإرسال */}
            <button
              type="submit"
              disabled={sending || !description.trim()}
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إرسال الرسالة...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 rotate-180" />
                  <span>إرسال الرسالة الآن 🚀</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center border-t border-border/50 space-y-2">
              <span className="text-[11px] text-muted-foreground block">قنوات التواصل المباشرة الفورية:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={createWhatsAppSupportLink({
                    typeLabel: REPORT_TYPES.find((t) => t.id === type)?.label || "رسالة",
                    description: description.trim(),
                    profileName: senderName.trim() || activeProfile?.name || "مستخدم التطبيق",
                    senderEmail: senderEmail.trim(),
                    appVersion: CURRENT_VERSION,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  مراسلة واتساب فورية
                </a>

                <a
                  href={createMailtoSupportLink({
                    typeLabel: REPORT_TYPES.find((t) => t.id === type)?.label || "رسالة",
                    description: description.trim(),
                    profileName: senderName.trim() || activeProfile?.name || "مستخدم التطبيق",
                    senderEmail: senderEmail.trim(),
                    appVersion: CURRENT_VERSION,
                  })}
                  className="py-2.5 px-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-accent" />
                  تطبيق البريد مباشرة
                </a>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
