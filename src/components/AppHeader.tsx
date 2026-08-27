import { useState } from "react";
import { Download } from "lucide-react";
import DownloadModal from "./DownloadModal";

const AppHeader = () => {
  const [showDownloads, setShowDownloads] = useState(false);

  return (
    <header className="py-6">
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gold shadow-lg">
          <img
            src="/my-photo.png"
            alt="القارئ حاج أيوب أمين"
            className="w-full h-full object-cover"
            style={{ objectPosition: "center top" }}
          />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-gold text-center leading-relaxed">
          المصحف المرتل برواية ورش
          <br />
          القارئ حاج أيوب أمين
        </h1>

        {/* زر تحميل التطبيق المباشر */}
        <button
          onClick={() => setShowDownloads(true)}
          className="mt-2 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-gold/20 via-gold/30 to-gold/20 border-2 border-gold/50 text-gold hover:text-white hover:bg-gold hover:border-gold font-bold text-sm shadow-lg shadow-gold/10 hover:shadow-gold/30 transition-all duration-300 transform hover:scale-105 active:scale-95 animate-pulse hover:animate-none"
        >
          <Download className="w-4 h-4" />
          <span>تحميل التطبيق للهاتف والكمبيوتر (إصدار 1.0.0-Primary)</span>
        </button>
      </div>

      <DownloadModal isOpen={showDownloads} onClose={() => setShowDownloads(false)} />
    </header>
  );
};

export default AppHeader;
