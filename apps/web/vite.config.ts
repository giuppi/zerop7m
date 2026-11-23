import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "p7m-wasm": path.resolve(__dirname, "../../crates/p7m-wasm/pkg"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "assets/**/*"],
      manifest: {
        name: "ZeroP7M — OpenCAdES Offline Reader",
        short_name: "ZeroP7M",
        description: "ZeroP7M: Open-Source, Zero-Cost, 100% Client-Side/Offline .p7m Reader powered by OpenCAdES",
        theme_color: "#1E40AF",
        background_color: "#F4F5F7",
        display: "standalone",
        start_url: "./",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        file_handlers: [
          {
            action: "./",
            accept: {
              "application/pkcs7-mime": [".p7m"],
            },
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm,mjs,xsl,svg,png,ico}"],
      },
    }),
  ],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
