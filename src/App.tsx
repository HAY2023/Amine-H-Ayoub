import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { useEffect, useState, useCallback } from "react";
import SiteLinksOverlay from "./components/SiteLinksOverlay";
import { syncCoordinatesFromServer } from "./data/ayahCoordinates";
import { syncTimingsFromServer } from "./data/ayahTimings";
import { AudioContextProvider } from "./contexts/audioContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import TimingsRecorder from "./pages/TimingsRecorder.tsx";
import AyahCalibration from "./pages/AyahCalibration.tsx";
import RecitationMethods from "./pages/RecitationMethods.tsx";
import QuranReader from "./pages/QuranReader.tsx";
import AudioUploadPage from "./pages/AudioUploadPage.tsx";

const queryClient = new QueryClient();

const App = () => {
  const [showSiteLinks, setShowSiteLinks] = useState(false);

  useEffect(() => {
    syncCoordinatesFromServer();
    syncTimingsFromServer();

    // Send localStorage data to Vite plugin (dev-only, silent fail)
    const data = localStorage.getItem("mushaf:ayahCoordinates:v1");
    if (data) {
      fetch('/api/save-boxes', { method: 'POST', body: data }).catch(() => {});
    }
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SiteLinksOverlay open={showSiteLinks} onClose={() => setShowSiteLinks(false)} />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AudioContextProvider>
  );
};

export default App;
