import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/designer/ui/",
  resolve: {
    alias: {
      "@streamcraft/forms": path.resolve(__dirname, "../../../libs/forms"),
      "../../../../libs/forms": path.resolve(__dirname, "../../../libs/forms"),
      "../../../../../libs/forms": path.resolve(__dirname, "../../../libs/forms"),
      "../../../../../../libs/forms": path.resolve(__dirname, "../../../libs/forms")
    },
    preserveSymlinks: true
  },
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "../../../libs")
      ]
    },
    proxy: {
      "^/designer(?!/ui)": "http://localhost:5000",
      "/public-api-sources": "http://localhost:5000",
      "/localmedia": "http://localhost:5000",
      "/api/v1": "http://localhost:5000"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
