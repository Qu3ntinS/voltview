import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const staticMode = process.env.VITE_STATIC === "1";

export default defineConfig({
  base: staticMode ? "/voltview/" : "/",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "spa-github-pages",
      closeBundle() {
        const index = resolve("dist/index.html");
        if (existsSync(index)) {
          copyFileSync(index, resolve("dist/404.html"));
        }
      },
    },
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3001",
    },
  },
  build: {
    target: "es2019",
    cssTarget: "chrome80",
    outDir: "dist",
    emptyOutDir: true,
  },
});
