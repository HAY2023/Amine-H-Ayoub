import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SupportErrorBoundary } from "./components/SupportErrorBoundary";
// @ts-ignore - virtual module
// @ts-ignore - virtual:pwa-register is provided by vite-plugin-pwa at build time
import { registerSW } from "virtual:pwa-register";
import { initCloudAudioAvailability } from "./data/audioUrls";

// PWA: Guard against iframe/preview contexts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

// Register service worker in production
if ('serviceWorker' in navigator && !isPreviewHost && !isInIframe) {
  registerSW({ immediate: true });
}

async function bootstrap() {
  // ⚡ الأداء: عرض التطبيق فوراً بدون أي انتظار —
  // جلب قائمة التلاوات المتوفرة من السيرفر يجري في الخلفية بدون حجب فتح التطبيق
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <SupportErrorBoundary>
        <App />
      </SupportErrorBoundary>
    </React.StrictMode>
  );

  // في الخلفية بعد فتح التطبيق (لا يعيق الإطلاق)
  initCloudAudioAvailability().catch(() => { /* ignore */ });
}

bootstrap();
