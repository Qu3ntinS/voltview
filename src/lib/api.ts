import { isStatic } from "./env";
import { radioClient } from "./radioClient";
import type { Settings } from "./storage";
import { youtubeClient } from "./youtubeClient";

export type YoutubeChannel = {
  id: string;
  title: string;
  thumbnail: string;
};

export type YoutubeVideo = {
  id: string;
  title: string;
  channel: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  duration: string;
  views: string;
};

export type RadioStation = {
  id: string;
  name: string;
  url: string;
  favicon: string;
  country: string;
  tags: string;
  bitrate: number;
  codec: string;
};

export type PlexItem = {
  id: string;
  type: string;
  title: string;
  year: number | null;
  summary: string;
  thumb: string;
  art: string;
  rating: number | null;
  duration: number;
  viewOffset: number;
  leafCount: number;
  childCount: number;
  parentTitle: string;
  grandparentTitle: string;
  index: number;
  server: string;
};

export type PlexServer = {
  name: string;
  clientIdentifier: string;
  owned: boolean;
  accessToken: string;
  connections: {
    uri: string;
    address: string;
    port: number;
    local: boolean;
    relay: boolean;
    protocol: string;
  }[];
};

function headers(settings: Settings, extra?: Record<string, string>) {
  const h: Record<string, string> = { ...(extra || {}) };
  if (settings.youtubeApiKey) h["x-volt-youtube-key"] = settings.youtubeApiKey;
  if (settings.youtubeAccessToken) h["x-volt-youtube-token"] = settings.youtubeAccessToken;
  if (settings.plexToken) h["x-volt-plex-token"] = settings.plexToken;
  if (settings.plexClientId) h["x-volt-plex-client"] = settings.plexClientId;
  if (settings.plexServerUri) h["x-volt-plex-server"] = settings.plexServerUri;
  if (settings.plexServerToken) h["x-volt-plex-server-token"] = settings.plexServerToken;
  return h;
}

async function getJson<T>(url: string, settings: Settings): Promise<T> {
  const res = await fetch(url, { headers: headers(settings) });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed ${res.status}`);
  }
  return data;
}

export const api = {
  health: () => getJson<{ ok: boolean; youtubeConfigured: boolean }>("/api/health", defaultLike()),
  youtubeTrending: (settings: Settings, categoryId = "") =>
    isStatic
      ? youtubeClient.trending(settings, categoryId)
      : getJson<{ items: YoutubeVideo[]; error?: string }>(
          `/api/youtube/trending?region=${encodeURIComponent(settings.youtubeRegion)}&categoryId=${encodeURIComponent(categoryId)}`,
          settings
        ),
  youtubeSearch: (settings: Settings, q: string) =>
    isStatic
      ? youtubeClient.search(settings, q)
      : getJson<{ items: YoutubeVideo[]; error?: string }>(
          `/api/youtube/search?q=${encodeURIComponent(q)}&region=${encodeURIComponent(settings.youtubeRegion)}`,
          settings
        ),
  youtubeVideos: (settings: Settings, id: string) =>
    isStatic
      ? youtubeClient.videos(settings, id)
      : getJson<{ items: YoutubeVideo[] }>(`/api/youtube/videos?id=${encodeURIComponent(id)}`, settings),
  youtubeRelated: (settings: Settings, q: string) =>
    isStatic
      ? youtubeClient.related(settings, q)
      : getJson<{ items: YoutubeVideo[] }>(`/api/youtube/related?q=${encodeURIComponent(q)}`, settings),
  youtubeLiked: (settings: Settings) =>
    isStatic
      ? youtubeClient.liked(settings)
      : getJson<{ items: YoutubeVideo[]; error?: string }>("/api/youtube/liked", settings),
  youtubeSubscriptions: (settings: Settings) =>
    isStatic
      ? youtubeClient.subscriptions(settings)
      : getJson<{ items: YoutubeChannel[]; error?: string }>("/api/youtube/subscriptions", settings),
  youtubeFeed: (settings: Settings) =>
    isStatic
      ? youtubeClient.feed(settings)
      : getJson<{ items: YoutubeVideo[]; error?: string }>("/api/youtube/feed", settings),
  youtubeChannel: (settings: Settings, id: string) =>
    isStatic
      ? youtubeClient.channel(settings, id)
      : getJson<{ items: YoutubeVideo[]; error?: string }>(
          `/api/youtube/channel?id=${encodeURIComponent(id)}`,
          settings
        ),
  radioPopular: (settings: Settings, country = "DE") =>
    isStatic
      ? radioClient.popular(country)
      : getJson<{ items: RadioStation[] }>(`/api/radio/popular?country=${encodeURIComponent(country)}`, settings),
  radioSearch: (settings: Settings, q: string) =>
    isStatic
      ? radioClient.search(q)
      : getJson<{ items: RadioStation[] }>(`/api/radio/search?q=${encodeURIComponent(q)}`, settings),
  plexPin: async (settings: Settings) => {
    const res = await fetch("/api/plex/pin", {
      method: "POST",
      headers: headers(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "PIN failed");
    return data as { id: number; code: string; authUrl: string; linkUrl: string };
  },
  plexPinStatus: (settings: Settings, id: number) =>
    getJson<{ id: number; code: string; authToken: string | null }>(`/api/plex/pin/${id}`, settings),
  plexResources: (settings: Settings) =>
    getJson<{ servers: PlexServer[] }>("/api/plex/resources", settings),
  plexLibraries: (settings: Settings) =>
    getJson<{ items: { key: string; title: string; type: string }[] }>("/api/plex/libraries", settings),
  plexOnDeck: (settings: Settings) => getJson<{ items: PlexItem[] }>("/api/plex/on-deck", settings),
  plexRecent: (settings: Settings) => getJson<{ items: PlexItem[] }>("/api/plex/recent", settings),
  plexSection: (settings: Settings, key: string) =>
    getJson<{ items: PlexItem[] }>(`/api/plex/section/${encodeURIComponent(key)}`, settings),
  plexMetadata: (settings: Settings, id: string) =>
    getJson<{ item: PlexItem | null }>(`/api/plex/metadata/${encodeURIComponent(id)}`, settings),
  plexChildren: (settings: Settings, id: string) =>
    getJson<{ items: PlexItem[] }>(`/api/plex/children/${encodeURIComponent(id)}`, settings),
  plexSearch: (settings: Settings, q: string) =>
    getJson<{ items: PlexItem[] }>(`/api/plex/search?q=${encodeURIComponent(q)}`, settings),
};

function defaultLike(): Settings {
  return {
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
}

export function plexAuthQuery(settings: Settings) {
  const params = new URLSearchParams({
    plexToken: settings.plexToken,
    plexServer: settings.plexServerUri,
    plexServerToken: settings.plexServerToken || settings.plexToken,
    plexClient: settings.plexClientId,
  });
  return params.toString();
}

export function plexImage(settings: Settings, path?: string, width = 400) {
  if (!path) return "";
  const params = new URLSearchParams({
    path,
    w: String(width),
    plexToken: settings.plexToken,
    plexServer: settings.plexServerUri,
    plexServerToken: settings.plexServerToken || settings.plexToken,
    plexClient: settings.plexClientId,
  });
  return `/api/plex/image?${params.toString()}`;
}

export function plexStreamUrl(settings: Settings, id: string) {
  return `/api/plex/stream/${encodeURIComponent(id)}?${plexAuthQuery(settings)}`;
}
