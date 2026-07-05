import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from .env files based on mode
  const env = loadEnv(mode, process.cwd(), "");

  const host = env.TAURI_DEV_HOST;
  const apiBaseUrl = env.VITE_API_BASE_URL ?? "http://localhost:8080";

  return {
    plugins: [react(), tailwindcss()],
    clearScreen: false,
    define: {
      // Expose API base URL to the app at build time
      __API_BASE_URL__: JSON.stringify(apiBaseUrl),
    },
    // REQ-PERF-03 — vendor chunk split. Cuts boot JS payload by moving
    // heavy libraries (TipTap, dnd-kit, lowlight, etc.) out of the main
    // entry. Names follow the [name]-[hash].js pattern so Vite hashes
    // enable long-term browser cache hits per vendor group.
    build: {
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/scheduler/")) return "react";
            if (id.includes("node_modules/react-router-dom/") || id.includes("node_modules/@remix-run/")) return "router";
            if (id.includes("node_modules/@tiptap/") || id.includes("node_modules/prosemirror-") || id.includes("node_modules/tiptap-markdown/")) return "tiptap";
            if (id.includes("node_modules/lowlight/") || id.includes("node_modules/highlight.js/")) return "code";
            if (id.includes("node_modules/@dnd-kit/")) return "dnd";
            if (id.includes("node_modules/zundo/")) return "zundo";
            // Prettier + CodeFormatter chunks stay separate (already lazy).
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["**/e2e/**", "**/node_modules/**"],
  },
  };
});
