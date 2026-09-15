export function formatDuration(iso: string) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
  if (!match) return "";
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  if (hours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatViews(value: string | number) {
  const n = Number(value || 0);
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mio.`;
  if (n >= 1000) return `${Math.round(n / 1000)} Tsd.`;
  return String(n);
}

export function formatClock(date = new Date()) {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
