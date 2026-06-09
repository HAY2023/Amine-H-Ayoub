import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from "fs";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    {
      name: 'save-boxes-plugin',
      configureServer(server: any) {
        server.middlewares.use('/api/save-boxes', (req: any, res: any) => {
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', () => {
            fs.writeFileSync('boxes-dump.json', body);
            res.end('saved');
          });
        });
      }
    },
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      includeAssets: ["favicon.ico", "my-photo.png", "background-kids.jpg"],
      manifest: {
        name: "Quran Kids Teacher",
        short_name: "Quran Kids",
        description: "Educational app for learning Quran by repetition",
        theme_color: "#D2B48C",
        background_color: "#F5F5DC",
        display: "standalone",
        dir: "rtl",
        lang: "ar",
        start_url: "/",
        icons: [
          {
            src: "/my-photo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/my-photo.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^\/audio\/.*\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "audio-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    exclude: ["@ricky0123/vad-web", "onnxruntime-web"],
  },
}));
