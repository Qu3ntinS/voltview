import { isStatic } from "./env";
import { plexCreatePin, plexListResources, plexReadPin } from "./plexTv";
import { radioClient } from "./radioClient";
import type { Settings } from "./storage";
import { youtubeClient } from "./youtubeClient";

export type YoutubeChannel = {
  id: string;
  title: string;
  thumbnail: string;
  description?: string;
};

export type YoutubeVideo = {
  id: string;
  title: string;
  channel: string;
  channelId: string;
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
  if (settings.youtubeAccessToken) h["x-volt-youtube-token"] = settings.youtubeAccessToken;
  if (settings.plexToken) h["x-volt-plex-token"] = settings.plexToken;
  if (settings.plexClientId) h["x-volt-plex-client"] = settings.plexClientId;
  if (settings.plexServerUri) h["x-volt-plex-server"] = settings.plexServerUri;
  if (settings.plexServerToken) h["x-volt-plex-server-token"] = settings.plexServerToken;
  if (settings.plexServerId) h["x-volt-plex-server-id"] = settings.plexServerId;
  if (settings.plexServerName) h["x-volt-plex-server-name"] = settings.plexServerName;
  return h;
}

async function getJson<T>(url: string, settings: Settings): Promise<T> {
  const res = await fetch(url, { headers: headers(settings) });
  const type = res.headers.get("content-type") || "";
  if (!type.includes("json")) {
    throw new Error(`Request failed ${res.status}`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed ${res.status}`);
  }
  return data;
}

async function nativeJson<T>(url: string, settings: Settings, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { ...headers(settings), ...(init?.headers as Record<string, string> | undefined) } });
    const type = res.headers.get("content-type") || "";
    if (!type.includes("json")) return null;
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok) return null;
    return data;
  } catch {
    return null;
  }
}

async function youtubeCall<T>(
  path: string,
  settings: Settings,
  fallback: () => Promise<T>,
): Promise<T> {
  const native = await nativeJson<T>(path, settings);
  if (native) return native;
  return fallback();
}

export const api = {
  health: () => getJson<{ ok: boolean; youtubeConfigured: boolean }>("/api/health", defaultLike()),
  youtubeTrending: (settings: Settings, categoryId = "") =>
    youtubeCall(
      `/api/youtube/trending?region=${encodeURIComponent(settings.youtubeRegion)}&categoryId=${encodeURIComponent(categoryId)}`,
      settings,
      () => youtubeClient.trending(settings, categoryId),
    ),
  youtubeSearch: (settings: Settings, q: string) =>
    youtubeCall<{ items: YoutubeVideo[]; channels?: YoutubeChannel[]; error?: string }>(
      `/api/youtube/search?q=${encodeURIComponent(q)}&region=${encodeURIComponent(settings.youtubeRegion)}`,
      settings,
      () => youtubeClient.search(settings, q),
    ),
  youtubeVideos: (settings: Settings, id: string) =>
    youtubeCall(`/api/youtube/videos?id=${encodeURIComponent(id)}`, settings, () => youtubeClient.videos(settings, id)),
  youtubeRelated: (settings: Settings, q: string) =>
    youtubeCall(`/api/youtube/related?q=${encodeURIComponent(q)}`, settings, () => youtubeClient.related(settings, q)),
  youtubeLiked: (settings: Settings) =>
    youtubeCall("/api/youtube/liked", settings, () => youtubeClient.liked(settings)),
  youtubeSubscriptions: (settings: Settings) =>
    youtubeCall("/api/youtube/subscriptions", settings, () => youtubeClient.subscriptions(settings)),
  youtubeFeed: (settings: Settings) =>
    youtubeCall("/api/youtube/feed", settings, () => youtubeClient.feed(settings)),
  youtubeChannel: (settings: Settings, id: string) =>
    youtubeCall<{ items: YoutubeVideo[]; channel?: YoutubeChannel; error?: string }>(
      `/api/youtube/channel?id=${encodeURIComponent(id)}`,
      settings,
      () => youtubeClient.channel(settings, id),
    ),
  youtubeStream: async (id: string) => {
    const native = await fetch(`/api/youtube/stream?id=${encodeURIComponent(id)}`);
    if (native.ok) {
      const data = (await native.json()) as { url?: string; error?: string };
      if (data.url) return data as { url: string; mime: string; quality: string; kind: "progressive" | "hls" };
    }
    const { resolveYoutubePlayback } = await import("./youtubePlayback");
    return resolveYoutubePlayback(id);
  },
  radioPopular: (settings: Settings, country = "DE") =>
    isStatic
      ? radioClient.popular(country)
      : getJson<{ items: RadioStation[] }>(`/api/radio/popular?country=${encodeURIComponent(country)}`, settings),
  radioSearch: (settings: Settings, q: string) =>
    isStatic
      ? radioClient.search(q)
      : getJson<{ items: RadioStation[] }>(`/api/radio/search?q=${encodeURIComponent(q)}`, settings),
  plexPin: async (settings: Settings) => {
    const native = await nativeJson<{ id: number; code: string; authUrl: string; linkUrl: string }>(
      "/api/plex/pin",
      settings,
      { method: "POST" },
    );
    if (native?.code) return native;
    return plexCreatePin(settings.plexClientId);
  },
  plexPinStatus: async (settings: Settings, id: number) => {
    const native = await nativeJson<{ id: number; code: string; authToken: string | null }>(
      `/api/plex/pin/${id}`,
      settings,
    );
    if (native) return native;
    return plexReadPin(settings.plexClientId, id);
  },
  plexResources: async (settings: Settings) => {
    const native = await nativeJson<{ servers: PlexServer[] }>("/api/plex/resources", settings);
    if (native?.servers) return native;
    return plexListResources(settings.plexClientId, settings.plexToken);
  },
  plexLibraries: (settings: Settings) =>
    getJson<{ items: { key: string; title: string; type: string }[] }>(plexOp("libraries"), settings),
  plexOnDeck: (settings: Settings) => getJson<{ items: PlexItem[] }>(plexOp("on-deck"), settings),
  plexRecent: (settings: Settings) => getJson<{ items: PlexItem[] }>(plexOp("recent"), settings),
  plexSection: (settings: Settings, key: string) =>
    getJson<{ items: PlexItem[] }>(plexOp("section", { key }), settings),
  plexMetadata: (settings: Settings, id: string) =>
    getJson<{ item: PlexItem | null }>(plexOp("metadata", { id }), settings),
  plexChildren: (settings: Settings, id: string) =>
    getJson<{ items: PlexItem[] }>(plexOp("children", { id }), settings),
  plexSearch: (settings: Settings, q: string) =>
    getJson<{ items: PlexItem[] }>(plexOp("search", { q }), settings),
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
    plexServerId: "",
  };
}

export function plexAuthQuery(settings: Settings) {
  const params = new URLSearchParams({
    plexToken: settings.plexToken,
    plexServer: settings.plexServerUri,
    plexServerToken: settings.plexServerToken || settings.plexToken,
    plexClient: settings.plexClientId,
  });
  if (settings.plexServerId) params.set("plexServerId", settings.plexServerId);
  if (settings.plexServerName) params.set("plexServerName", settings.plexServerName);
  return params.toString();
}

function plexOp(op: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ op });
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return `/api/plex?${params.toString()}`;
}

export function plexImage(settings: Settings, path?: string, width = 400) {
  if (!path) return "";
  const params = new URLSearchParams({
    op: "image",
    path,
    w: String(width),
    plexToken: settings.plexToken,
    plexServer: settings.plexServerUri,
    plexServerToken: settings.plexServerToken || settings.plexToken,
    plexClient: settings.plexClientId,
  });
  if (settings.plexServerId) params.set("plexServerId", settings.plexServerId);
  if (settings.plexServerName) params.set("plexServerName", settings.plexServerName);
  return `/api/plex?${params.toString()}`;
}

export function plexStreamUrl(settings: Settings, id: string, format: "hls" | "mp4" = "hls") {
  return `/api/plex?op=stream&id=${encodeURIComponent(id)}&format=${format}&${plexAuthQuery(settings)}`;
}

export function plexFileUrl(settings: Settings, id: string) {
  return `/api/plex?op=file&id=${encodeURIComponent(id)}&${plexAuthQuery(settings)}`;
}
