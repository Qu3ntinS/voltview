export function mediaDuration(video: {
  duration: number;
  seekable: { length: number; end: (index: number) => number };
}) {
  const duration = video.duration;
  if (Number.isFinite(duration) && duration > 0) return duration;
  if (video.seekable.length > 0) {
    const end = video.seekable.end(video.seekable.length - 1);
    if (Number.isFinite(end) && end > 0) return end;
  }
  return 0;
}

export function connectionDownlinkMbps() {
  if (typeof navigator === "undefined") return 0;
  return Number(
    (navigator as Navigator & { connection?: { downlink?: number } }).connection?.downlink || 0,
  );
}

/** Local preview only: `?src=/file.mp4` so the dock can be tested without YouTube. */
export function localPlaybackOverride(href = typeof window === "undefined" ? "" : window.location.href) {
  if (!href) return null;
  try {
    const page = new URL(href);
    if (page.hostname !== "localhost" && page.hostname !== "127.0.0.1") return null;
    const raw = page.searchParams.get("src");
    if (!raw) return null;
    const url = new URL(raw, page.origin);
    if (url.origin !== page.origin) return null;
    if (!/\.(mp4|webm|m3u8)$/i.test(url.pathname)) return null;
    return {
      url: url.href,
      mime: url.pathname.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp4",
      quality: "Auto",
      kind: url.pathname.endsWith(".m3u8") ? ("hls" as const) : ("progressive" as const),
    };
  } catch {
    return null;
  }
}
