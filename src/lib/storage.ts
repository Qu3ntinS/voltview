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
  plexServerId: string;
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
  return "";
}

export function normalizeSettings(input: Settings): Settings {
  const next: Settings = {
    ...input,
    youtubeApiKey: "",
    youtubeClientId: input.youtubeClientId.trim(),
  };
  if (isGoogleClientId(input.youtubeApiKey) && !isGoogleClientId(next.youtubeClientId)) {
    next.youtubeClientId = input.youtubeApiKey.trim();
  } else if (isYoutubeApiKey(next.youtubeClientId)) {
    next.youtubeClientId = "";
  }
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
  plexServerId: "",
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
