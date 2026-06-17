import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { useEffect, useState, useCallback } from "react";
import SiteLinksOverlay from "./components/SiteLinksOverlay";
import { syncCoordinatesFromServer } from "./data/ayahCoordinates";
import { syncTimingsFromServer } from "./data/ayahTimings";
import { syncSurahRegionsFromServer } from "./data/surahRegions";
import { syncCustomPagesFromServer } from "./data/customPages";
import { syncKidsProfileFromServer } from "./data/kidsProfile";
import { syncBookmarksFromServer } from "./data/bookmarks";
import { AudioContextProvider } from "./contexts/audioContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import TimingsRecorder from "./pages/TimingsRecorder.tsx";
import AyahCalibration from "./pages/AyahCalibration.tsx";
import RecitationMethods from "./pages/RecitationMethods.tsx";
import QuranReader from "./pages/QuranReader.tsx";
import AudioUploadPage from "./pages/AudioUploadPage.tsx";
import LinkAudioPage from "./pages/LinkAudioPage.tsx";
import KidsGames from "./pages/KidsGames.tsx";
import SettingsPage, { applyTheme, getTheme } from "./pages/SettingsPage.tsx";
import ParentDashboard from "./pages/ParentDashboard.tsx";
import { getProfile } from "./data/kidsProfile";
import { toast } from "./hooks/use-toast";
import WelcomeOverlay, { isOnboarded } from "./components/WelcomeOverlay.tsx";

const queryClient = new QueryClient();

const App = () => {
  const [showSiteLinks, setShowSiteLinks] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !isOnboarded());

  useEffect(() => {
    applyTheme(getTheme());
    syncCoordinatesFromServer();
    syncTimingsFromServer();
    syncSurahRegionsFromServer();
    syncCustomPagesFromServer();
    syncKidsProfileFromServer();
    syncBookmarksFromServer();

    // Send localStorage data to Vite plugin (dev-only, silent fail)
    const data = localStorage.getItem("mushaf:ayahCoordinates:v1");
    if (data) {
      fetch('/api/save-boxes', { method: 'POST', body: data }).catch(() => {});
    }
  }, []);

  // تذكير الدرس اليومي (أثناء فتح التطبيق)
  useEffect(() => {
    const id = setInterval(() => {
      const t = getProfile().lessonTime;
      if (!t) return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayStr = now.toDateString();
      let last = ""; try { last = localStorage.getItem("mushaf:lessonNotified") || ""; } catch { /* ignore */ }
      if (hhmm >= t && last !== todayStr) {
        try { localStorage.setItem("mushaf:lessonNotified", todayStr); } catch { /* ignore */ }
        if (typeof Notification !== "undefined" && Notification.permission === "granted") { try { new Notification("حان وقت درس القرآن"); } catch { /* ignore */ } }
        toast({ title: "حان وقت درس القرآن", description: "وقت القراءة اليومي" });
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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<QuranReader />} />
              <Route path="/audio" element={<Index />} />
              <Route path="/upload" element={<AudioUploadPage />} />
              <Route path="/timings" element={<TimingsRecorder />} />
              <Route path="/calibrate" element={<AyahCalibration />} />
              <Route path="/recitation-methods" element={<RecitationMethods />} />
              <Route path="/link" element={<LinkAudioPage />} />
              <Route path="/games" element={<KidsGames />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/parent" element={<ParentDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SiteLinksOverlay open={showSiteLinks} onClose={() => setShowSiteLinks(false)} />
            {showWelcome && <WelcomeOverlay onDone={() => setShowWelcome(false)} />}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AudioContextProvider>
  );
};

export default App;
