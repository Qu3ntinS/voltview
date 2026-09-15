export type Settings = {
  youtubeApiKey: string;
  youtubeRegion: string;
  plexToken: string;
  plexClientId: string;
  plexServerUri: string;
  plexServerToken: string;
  plexServerName: string;
};

export type RecentItem = {
  kind: "youtube" | "plex";
  id: string;
  title: string;
  image?: string;
  subtitle?: string;
  at: number;
};

const SETTINGS_KEY = "voltview.settings.v1";
const RECENTS_KEY = "voltview.recents.v1";

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `volt-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export const defaultSettings: Settings = {
  youtubeApiKey: "",
  youtubeRegion: "DE",
  plexToken: "",
  plexClientId: "",
  plexServerUri: "",
  plexServerToken: "",
  plexServerName: "",
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
    if (!parsed.plexClientId) parsed.plexClientId = randomId();
    return parsed;
  } catch {
    return { ...defaultSettings, plexClientId: randomId() };
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushRecent(item: Omit<RecentItem, "at">) {
  const next = [
    { ...item, at: Date.now() },
    ...loadRecents().filter((entry) => !(entry.kind === item.kind && entry.id === item.id)),
  ].slice(0, 24);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  return next;
}
