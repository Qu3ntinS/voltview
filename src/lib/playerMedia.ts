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
