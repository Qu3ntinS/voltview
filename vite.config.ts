import { copyFileSync, existsSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Connect } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function proxyApi(req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) {
  const url = req.url || "";
  if (!url.startsWith("/api")) {
    next();
    return;
  }
  const headers = { ...req.headers, host: "127.0.0.1:3001" };
  delete headers["connection"];
  const up = httpRequest(
    { hostname: "127.0.0.1", port: 3001, path: url, method: req.method, headers },
    (incoming) => {
      res.writeHead(incoming.statusCode || 502, incoming.headers);
      incoming.pipe(res);
    },
  );
  up.on("error", () => {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "API offline" }));
  });
  req.pipe(up);
}

function bunApiProxy() {
  return {
    name: "bun-api-proxy",
    configureServer: {
      order: "pre" as const,
      handler(server: { middlewares: { use: (fn: Connect.NextHandleFunction) => void } }) {
        server.middlewares.use(proxyApi);
      },
    },
    configurePreviewServer: {
      order: "pre" as const,
      handler(server: { middlewares: { use: (fn: Connect.NextHandleFunction) => void } }) {
        server.middlewares.use(proxyApi);
      },
    },
  };
}

const staticMode = process.env.VITE_STATIC === "1";
const base = process.env.VITE_BASE || (staticMode ? "/voltview/" : "/");
delete process.env.VITE_YOUTUBE_API_KEY;
process.env.VITE_YOUTUBE_CLIENT_ID =
  process.env.VITE_YOUTUBE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || "";
if (process.env.VITE_YOUTUBE_CLIENT_ID) {
  console.log("[voltview] Google OAuth client id present for phone login");
} else {
  console.log("[voltview] No YOUTUBE_CLIENT_ID — phone Google login needs it in Vercel env");
}

export default defineConfig({
  base,
  plugins: [
    bunApiProxy(),
    react(),
    tailwindcss(),
    {
      name: "spa-github-pages",
      closeBundle() {
        const index = resolve("dist/index.html");
        if (existsSync(index)) {
          copyFileSync(index, resolve("dist/404.html"));
        }
        const nojekyll = resolve("public/.nojekyll");
        if (existsSync(nojekyll)) {
          copyFileSync(nojekyll, resolve("dist/.nojekyll"));
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
  preview: {
    host: true,
    port: 4173,
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
