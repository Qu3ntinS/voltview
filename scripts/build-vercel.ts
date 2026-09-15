process.env.VITE_STATIC = "1";
process.env.VITE_BASE = process.env.VITE_BASE || "/";
process.env.VITE_YOUTUBE_API_KEY =
  process.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || "";

if (process.env.VITE_YOUTUBE_API_KEY) {
  console.log("YouTube Data API key found in Vercel env — baking into the static build");
} else {
  console.log("No YouTube API key in env (YOUTUBE_API_KEY or VITE_YOUTUBE_API_KEY). Paste it under Setup instead.");
}

const vite = await Bun.spawn({
  cmd: ["bunx", "vite", "build"],
  stdout: "inherit",
  stderr: "inherit",
  env: process.env,
});
const viteCode = await vite.exited;
if (viteCode !== 0) process.exit(viteCode);

const seo = await Bun.spawn({
  cmd: ["bun", "scripts/seo-static.ts"],
  stdout: "inherit",
  stderr: "inherit",
  env: process.env,
});
process.exit(await seo.exited);
