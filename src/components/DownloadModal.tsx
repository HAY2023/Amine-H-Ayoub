import { useState } from "react";
import { X, Smartphone, Monitor, Tv, Apple, Download, CheckCircle2, Sparkles, ExternalLink } from "lucide-react";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HF_BASE = "https://huggingface.co/datasets/hammoualiyoucef20/quran-app-releases/resolve/main";

export const DOWNLOAD_PACKAGES = [
  {
    id: "android",
    name: "تطبيق أندرويد للهواتف (APK)",
    platform: "Android Phone & Tablet",
    desc: "ملف تثبيت APK مباشر لجميع هواتف أندرويد (سامسونج، شاومي، هواوي...)",
    version: "1.0.1",
    size: "45 MB",
    icon: <Smartphone className="w-7 h-7 text-emerald-400" />,
    color: "from-emerald-600/30 to-emerald-950/40 border-emerald-500/40 hover:border-emerald-400",
    btnColor: "bg-emerald-600 hover:bg-emerald-500 text-white",
    url: `${HF_BASE}/Quran_1.0.0_Android.apk`,
    isDirect: true,
  },
  {
    id: "windows",
    name: "برنامج ويندوز للكمبيوتر (EXE)",
    platform: "Windows 10 / 11",
    desc: "برنامج سطح المكتب المستقل خفيف وسريع يعمل دون اتصال بالإنترنت",
    version: "1.0.1",
    size: "75 MB",
    icon: <Monitor className="w-7 h-7 text-blue-400" />,
    color: "from-blue-600/30 to-blue-950/40 border-blue-500/40 hover:border-blue-400",
    btnColor: "bg-blue-600 hover:bg-blue-500 text-white",
    url: `${HF_BASE}/Quran_1.0.0_x64-setup.exe`,
    isDirect: true,
  },
  {
    id: "tv",
    name: "نسخة شاشات التلفاز الذكية (Android TV)",
    platform: "Android TV & Smart Box",
    desc: "واجهة مهيأة للشاشات الكبيرة مع دعم كامل لجهاز التحكم (الريموت)",
    version: "1.0.1",
    size: "45 MB",
    icon: <Tv className="w-7 h-7 text-purple-400" />,
    color: "from-purple-600/30 to-purple-950/40 border-purple-500/40 hover:border-purple-400",
    btnColor: "bg-purple-600 hover:bg-purple-500 text-white",
    url: `${HF_BASE}/Quran_1.0.0_Android_TV.apk`,
    isDirect: true,
  },
  {
    id: "ios",
    name: "تثبيت على آيفون وآيباد (PWA)",
    platform: "iOS / Safari",
    desc: "أضف الموقع إلى شاشتك الرئيسية من زر المشاركة (Share ⎘ ➔ Add to Home Screen)",
    version: "1.0.1",
    size: "فوري",
    icon: <Apple className="w-7 h-7 text-amber-300" />,
    color: "from-amber-600/20 to-amber-950/40 border-amber-500/40 hover:border-amber-400",
    btnColor: "bg-amber-600 hover:bg-amber-500 text-white",
    url: "https://amine-h-ayoub.vercel.app/",
    isDirect: false,
  }
];

export default function DownloadModal({ isOpen, onClose }: DownloadModalProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = (pkg: typeof DOWNLOAD_PACKAGES[0]) => {
    if (pkg.isDirect) {
      setDownloadingId(pkg.id);
      setTimeout(() => setDownloadingId(null), 3000);
      window.location.href = pkg.url;
    } else {
      window.open(pkg.url, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="relative w-full max-w-2xl bg-card border-2 border-gold/40 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(212,175,55,0.25)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shadow-md">
              <Download className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-gold">تحميل تطبيق تلاوات القرآن</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-mono font-bold">
                  v1.0.1
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                القارئ الشيخ حاج أيوب أمين — المصحف المرتل برواية ورش
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            title="إغلاق"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Packages List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {DOWNLOAD_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`p-4 rounded-2xl bg-gradient-to-r ${pkg.color} border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="p-3 rounded-2xl bg-background/60 border border-white/10 shrink-0">
                  {pkg.icon}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-sm md:text-base leading-tight">
                      {pkg.name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-background/70 text-muted-foreground border border-border/40 font-mono">
                      {pkg.size}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {pkg.desc}
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto shrink-0">
                <button
                  onClick={() => handleDownload(pkg)}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${pkg.btnColor}`}
                >
                  {downloadingId === pkg.id ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>جاري بدء التحميل...</span>
                    </>
                  ) : (
                    <>
                      {pkg.isDirect ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                      <span>{pkg.isDirect ? "تحميل الآن" : "فتح الموقع"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-gold font-medium">
            <Sparkles className="w-4 h-4" />
            جميع النسخ مجانية 100% وتعمل دون إنترنت
          </span>
          <span className="font-mono">الإصدار: 1.0.1</span>
        </div>
      </div>
    </div>
  );
}
