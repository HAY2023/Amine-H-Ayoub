import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { useEffect } from "react";
import { syncCoordinatesFromServer } from "./data/ayahCoordinates";
import { syncTimingsFromServer } from "./data/ayahTimings";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import TimingsRecorder from "./pages/TimingsRecorder.tsx";
import AyahCalibration from "./pages/AyahCalibration.tsx";
import RecitationMethods from "./pages/RecitationMethods.tsx";
import QuranReader from "./pages/QuranReader.tsx";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    syncCoordinatesFromServer();
    syncTimingsFromServer();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<QuranReader />} />
            <Route path="/audio" element={<Index />} />
            <Route path="/timings" element={<TimingsRecorder />} />
            <Route path="/calibrate" element={<AyahCalibration />} />
            <Route path="/recitation-methods" element={<RecitationMethods />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
