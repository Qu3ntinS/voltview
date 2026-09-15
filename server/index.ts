import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { plexRoutes } from "./plex";
import { radioRoutes } from "./radio";
import { youtubeRoutes } from "./youtube";

const port = Number(process.env.PORT || 3001);
const distDir = join(import.meta.dir, "../dist");
const isProd = existsSync(join(distDir, "index.html"));

export const app = new Elysia()
  .use(cors())
  .use(youtubeRoutes)
  .use(radioRoutes)
  .use(plexRoutes)
  .get("/api/health", () => ({
    ok: true,
    name: "voltview",
    youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY),
  }));

if (isProd) {
  app.get("/assets/:file", ({ params }) => {
    return Bun.file(join(distDir, "assets", params.file));
  });
  app.get("/favicon.svg", () => Bun.file(join(distDir, "favicon.svg")));
  app.get("*", ({ path }) => {
    if (path.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }
    return Bun.file(join(distDir, "index.html"));
  });
}

if (import.meta.main) {
  app.listen(port);
  console.log(`VoltView API on http://127.0.0.1:${port}`);
}
