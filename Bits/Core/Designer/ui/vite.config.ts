import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  base: "/designer/ui/",
  resolve: {
    alias: {
      "@streamcraft/forms": path.resolve(__dirname, "../../../../libs/forms"),
      "../../../../libs/forms": path.resolve(__dirname, "../../../../libs/forms"),
      "../../../../../libs/forms": path.resolve(__dirname, "../../../../libs/forms"),
      "../../../../../../libs/forms": path.resolve(__dirname, "../../../../libs/forms")
    },
    preserveSymlinks: true
  },
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "../../../../libs")
      ]
    },
    proxy: {
      "^/designer(?!/ui)": backendUrl,
      "/stream-api-mock": backendUrl,
      "/events": backendUrl,
      "/ai": backendUrl,
      "/sc2": backendUrl,
      "/public-api-sources": backendUrl,
      "/localmedia": backendUrl,
      "/api/v1": backendUrl
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
