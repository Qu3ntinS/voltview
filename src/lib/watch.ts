export type WatchEvent = {
  source: "youtube" | "plex" | "radio";
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
