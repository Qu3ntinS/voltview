export type WatchSource = "youtube" | "plex" | "radio" | "app";

export type WatchEvent = {
  source: WatchSource;
  id: string;
  title: string;
  at: number;
};

const KEY = "voltview.watch-events.v1";

export function recordWatch(event: Omit<WatchEvent, "at">) {
  const next: WatchEvent[] = [
    { ...event, at: Date.now() },
    ...loadWatchEvents().filter((item) => !(item.source === event.source && item.id === event.id)),
  ].slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function loadWatchEvents(): WatchEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export type WatchSession = {
  id: string;
  source: string;
  contentId: string;
  title: string;
  watchedSec: number;
  positionSec: number;
  durationSec: number;
};

export async function startWatchSession(input: {
  deviceId: string;
  source: WatchSource;
  contentId: string;
  title: string;
}) {
  recordWatch({ source: input.source, id: input.contentId, title: input.title });
  const res = await fetch("/api/watch/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Watch session failed");
  return (await res.json()) as WatchSession;
}

export async function heartbeatWatchSession(
  id: string,
  payload: { positionSec: number; durationSec: number; playing: boolean }
) {
  const res = await fetch(`/api/watch/session/${id}/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return (await res.json()) as WatchSession;
}

export async function endWatchSession(id: string) {
  await fetch(`/api/watch/session/${id}/end`, { method: "POST" }).catch(() => undefined);
}

export async function fetchWatchStats() {
  const res = await fetch("/api/watch/stats");
  if (!res.ok) return { sessions: 0, watchedSec: 0, bySource: {} as Record<string, number> };
  return res.json() as Promise<{
    sessions: number;
    watchedSec: number;
    bySource: Record<string, number>;
  }>;
}
