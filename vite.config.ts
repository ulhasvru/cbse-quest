import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// For GitHub Pages:
// - If deploying to  https://<user>.github.io/         → base = "/"
// - If deploying to  https://<user>.github.io/<repo>/  → base = "/<repo>/"
// The VITE_BASE_PATH env var is set in the GitHub Actions workflow.
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-gh-pages"),
    emptyOutDir: true,
  },
});
