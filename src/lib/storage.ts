export type Settings = {
  youtubeApiKey: string;
  youtubeRegion: string;
  youtubeClientId: string;
  youtubeAccessToken: string;
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

export function isYoutubeApiKey(value: string) {
  return value.trim().startsWith("AIza");
}

export function isGoogleClientId(value: string) {
  return value.includes(".apps.googleusercontent.com");
}

export function bakedYoutubeApiKey() {
  const value = import.meta.env?.VITE_YOUTUBE_API_KEY;
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeSettings(input: Settings): Settings {
  const next: Settings = {
    ...input,
    youtubeApiKey: input.youtubeApiKey.trim(),
    youtubeClientId: input.youtubeClientId.trim(),
  };
  if (isGoogleClientId(next.youtubeApiKey) && !isGoogleClientId(next.youtubeClientId)) {
    const other = next.youtubeClientId;
    next.youtubeClientId = next.youtubeApiKey;
    next.youtubeApiKey = isYoutubeApiKey(other) ? other : "";
  } else if (isYoutubeApiKey(next.youtubeClientId) && !isYoutubeApiKey(next.youtubeApiKey)) {
    const other = next.youtubeApiKey;
    next.youtubeApiKey = next.youtubeClientId;
    next.youtubeClientId = isGoogleClientId(other) ? other : "";
  }
  if (!next.youtubeApiKey) next.youtubeApiKey = bakedYoutubeApiKey();
  return next;
}

export const defaultSettings: Settings = {
  youtubeApiKey: "",
  youtubeRegion: "DE",
  youtubeClientId: "",
  youtubeAccessToken: "",
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
    return normalizeSettings(parsed);
  } catch {
    return normalizeSettings({ ...defaultSettings, plexClientId: randomId() });
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
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
