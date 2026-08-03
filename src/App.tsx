import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { shouldHideMushaf } from "./utils/tauriUtils";
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
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import QuranReader from "./pages/QuranReader.tsx";
import KidsGames from "./pages/KidsGames.tsx";
import KidsShop from "./pages/KidsShop.tsx";
import SettingsPage, { applyTheme, getTheme } from "./pages/SettingsPage.tsx";
import ParentDashboard from "./pages/ParentDashboard.tsx";
import { getProfile, getAppMode, getProfiles, kidsEnabled } from "./data/kidsProfile";
import { toast } from "./hooks/use-toast";
import WelcomeOverlay, { isOnboarded } from "./components/WelcomeOverlay.tsx";
import ProfilePicker, { isPicked, markPicked } from "./components/ProfilePicker.tsx";

const queryClient = new QueryClient();

// مسار الجذر: يُعاد تقييمه عند كل انتقال (كي يستجيب لتبديل وضع المطوّر أثناء التشغيل).
// نسخة التطبيق تُخفي المصحف وتُحوّل للسماع، إلا إذا فعّل المطوّر إتاحته.
const HomeRoute = () => (shouldHideMushaf() ? <Navigate to="/audio" replace /> : <QuranReader />);

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

    // Send localStorage data to Vite plugin (dev-only, silent fail)
    const data = localStorage.getItem("mushaf:ayahCoordinates:v1");
    if (data) {
      fetch('/api/save-boxes', { method: 'POST', body: data }).catch(() => {});
    }
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
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/audio" element={<Index />} />
              <Route path="/games" element={<KidsGames />} />
              <Route path="/shop" element={<KidsShop />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/profiles" element={<ProfilePicker />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
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
