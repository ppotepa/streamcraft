import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/designer/ui/",
  server: {
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
