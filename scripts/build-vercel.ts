process.env.VITE_STATIC = "1";
process.env.VITE_BASE = process.env.VITE_BASE || "/";
delete process.env.VITE_YOUTUBE_API_KEY;
process.env.VITE_YOUTUBE_CLIENT_ID =
  process.env.VITE_YOUTUBE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || "";

if (process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY) {
  console.log("YouTube Data API key stays on the server — not baked into the client");
} else {
  console.log("No server YOUTUBE_API_KEY. Trends need that env on Vercel.");
}
if (process.env.VITE_YOUTUBE_CLIENT_ID) {
  console.log("Google OAuth client id baked for phone login (public client id, not the API key)");
} else {
  console.log("Set YOUTUBE_CLIENT_ID on Vercel for Google login on the phone.");
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
