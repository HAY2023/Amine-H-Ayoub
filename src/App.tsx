import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { shouldHideMushaf } from "./utils/tauriUtils";
import { isKidsMode } from "./data/kidsLock";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { useEffect, useState, useCallback } from "react";
import SiteLinksOverlay from "./components/SiteLinksOverlay";
import { syncCoordinatesFromServer } from "./data/ayahCoordinates";
import { syncTimingsFromServer } from "./data/ayahTimings";
import { syncBookmarksFromServer } from "./data/bookmarks";
import { AudioContextProvider } from "./contexts/audioContext";
import { preloadCorpusInBackground } from "./data/lazyCorpus";
import { lazy, Suspense } from "react";
const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const QuranReader = lazy(() => import("./pages/QuranReader.tsx"));
const KidsGames = lazy(() => import("./pages/KidsGames.tsx"));
const KidsShop = lazy(() => import("./pages/KidsShop.tsx"));
import { applyTheme, getTheme } from "./pages/SettingsPage.tsx";
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard.tsx"));
const CustomAudioManager = lazy(() => import("./pages/CustomAudioManager.tsx"));
const AudioUploadPage = lazy(() => import("./pages/AudioUploadPage.tsx"));
const SupportPage = lazy(() => import("./pages/SupportPage.tsx"));
const ReciterPage = lazy(() => import("./pages/ReciterPage.tsx"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage.tsx"));
const ErrorPage = lazy(() => import("./pages/ErrorPage.tsx"));
const AdminReleasesPanel = lazy(() => import("./pages/AdminReleasesPanel.tsx"));
import { getProfile, getAppMode, getProfiles, kidsEnabled } from "./data/kidsProfile";
import { toast } from "./hooks/use-toast";
import WelcomeOverlay, { isOnboarded } from "./components/WelcomeOverlay.tsx";
import ProfilePicker, { isPicked, markPicked } from "./components/ProfilePicker.tsx";
import { logAppOpen } from "./utils/analytics.ts";
import { useBackgroundNotifications, showLocalNotification } from "./utils/notifications.ts";
import { checkForUpdates, triggerDirectDownload } from "./utils/updateChecker.ts";
import { ToastAction } from "./components/ui/toast.tsx";
const queryClient = new QueryClient();

// مسار الجذر: يُعاد تقييمه عند كل انتقال (كي يستجيب لتبديل وضع المطوّر أثناء التشغيل).
// نسخة التطبيق تُخفي المصحف وتُحوّل للسماع، إلا إذا فعّل المطوّر إتاحته.
const HomeRoute = () => (shouldHideMushaf() ? <Navigate to="/audio" replace /> : <QuranReader />);

function KidsModeGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMode = () => {
      const allowedPaths = ["/games", "/", "/audio", "/shop", "/profiles", "/reciter"];
      if (isKidsMode() && !allowedPaths.includes(location.pathname)) {
        navigate("/games", { replace: true });
      }
    };
    checkMode();
    window.addEventListener("mushaf:kidsmode", checkMode);
    window.addEventListener("mushaf:appmode", checkMode);
    return () => {
      window.removeEventListener("mushaf:kidsmode", checkMode);
      window.removeEventListener("mushaf:appmode", checkMode);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isKidsMode()) {
        e.preventDefault();
        e.returnValue = "وضع الأطفال مقفل لحماية طفلك.";
        return e.returnValue;
      }
    };

    const handlePopState = () => {
      if (isKidsMode()) {
        const allowedPaths = ["/games", "/", "/audio", "/shop", "/profiles", "/reciter"];
        if (!allowedPaths.includes(window.location.pathname)) {
          window.history.pushState(null, "", "/games");
          navigate("/games", { replace: true });
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  return null;
}

const App = () => {
  const [showSiteLinks, setShowSiteLinks] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !isOnboarded());
  // بوابة "من يتعلّم الآن؟" عند فتح التطبيق
  // وضع الأطفال: فقط إن كان هناك أكثر من طفل.
  const shouldGate = () => {
    try {
      if (!isOnboarded() || isPicked()) return false;
      if (!kidsEnabled()) return false;   // وضع وليّ الأمر أو إخفاء الأطفال بالكامل
      const n = getProfiles().length;
      return n > 1;
    } catch { return false; }
  };
  const [showPicker, setShowPicker] = useState(shouldGate);

  useBackgroundNotifications();

  useEffect(() => {
    applyTheme(getTheme());
    syncCoordinatesFromServer();
    syncTimingsFromServer();
    syncBookmarksFromServer();

    // Preload Quran corpus in background after initial render
    // This improves performance when user navigates to reading/listening pages
    setTimeout(() => {
      preloadCorpusInBackground();
    }, 500);

    // Log analytics
    logAppOpen();

    // Send localStorage data to Vite plugin (dev-only, silent fail)
    const data = localStorage.getItem("mushaf:ayahCoordinates:v1");
    if (data) {
      fetch('/api/save-boxes', { method: 'POST', body: data }).catch(() => {});
    }

    // Check for updates
    checkForUpdates().then((info) => {
      if (info.hasUpdate) {
        showLocalNotification("تحديث جديد متاح 🚀", `تحديث جديد (${info.latestVersion}) جاهز للتحميل.`);
        toast({
          title: "تحديث جديد متاح 🚀",
          description: `نسخة ${info.latestVersion} متاحة الآن.`,
          duration: Number.MAX_SAFE_INTEGER,
          action: (
            <ToastAction 
              altText="تحميل التحديث" 
              onClick={() => {
                toast({ title: "جاري بدء التحميل المباشر 📥", description: `الملف: ${info.assetName || info.latestVersion}` });
                triggerDirectDownload(info.directDownloadUrl || info.downloadUrl, info.assetName);
              }}
            >
              تحميل الآن
            </ToastAction>
          )
        });
      }
    });
  }, []);

  // تذكير الدرس اليومي (أثناء فتح التطبيق)
  useEffect(() => {
    const id = setInterval(() => {
      if (!kidsEnabled()) return;   // لا تذكير بالألعاب إذا أُخفي ركن الأطفال
      const t = getProfile().lessonTime;
      if (!t) return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayStr = now.toDateString();
      let last = ""; try { last = localStorage.getItem("mushaf:lessonNotified") || ""; } catch { /* ignore */ }
      if (hhmm >= t && last !== todayStr) {
        try { localStorage.setItem("mushaf:lessonNotified", todayStr); } catch { /* ignore */ }
        const listenMode = shouldHideMushaf();
        const verb = listenMode ? "استمع" : "اقرأ";
        if (typeof Notification !== "undefined" && Notification.permission === "granted") { try { new Notification("حان وقت درس القرآن", { body: `${verb} لتُفتح الألعاب` }); } catch { /* ignore */ } }
        toast({ title: "حان وقت درس القرآن", description: listenMode ? "الألعاب مقفلة حتى تُكمل استماعك اليوم" : "الألعاب مقفلة حتى تُكمل قراءتك اليوم" });
      }
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Ctrl+5 shortcut to toggle site links overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '5') {
        e.preventDefault();
        setShowSiteLinks(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AudioContextProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <KidsModeGuard />
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>}>
              <Routes>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/audio" element={<Index />} />
                <Route path="/games" element={<KidsGames />} />
                <Route path="/shop" element={<KidsShop />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/parent" element={<ParentDashboard />} />
                <Route path="/profiles" element={<ProfilePicker />} />
                <Route path="/manage-audio" element={<CustomAudioManager />} />
                <Route path="/upload" element={<AudioUploadPage />} />
                <Route path="/reciter" element={<ReciterPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/error" element={<ErrorPage />} />
                <Route path="/admin/releases" element={<AdminReleasesPanel />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <SiteLinksOverlay open={showSiteLinks} onClose={() => setShowSiteLinks(false)} />
            {showWelcome && <WelcomeOverlay onDone={() => { markPicked(); setShowWelcome(false); setShowPicker(false); }} />}
            {!showWelcome && showPicker && <ProfilePicker onPicked={() => setShowPicker(false)} />}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AudioContextProvider>
  );
};

export default App;
