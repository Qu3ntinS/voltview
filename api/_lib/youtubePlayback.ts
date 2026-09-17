import { proxyMedia } from "./mediaProxy";

export type PlaybackSource = {
  url: string;
  mime: string;
  quality: string;
  kind: "progressive" | "hls";
};

type Format = {
  url?: string;
  mimeType?: string;
  qualityLabel?: string;
  height?: number;
  itag?: number;
};

type PlayerPayload = {
  playabilityStatus?: { status?: string; reason?: string };
  streamingData?: {
    formats?: Format[];
    adaptiveFormats?: Format[];
    hlsManifestUrl?: string;
  };
};

const INNERTUBE_CLIENTS = [
  {
    clientName: "ANDROID",
    clientVersion: "20.10.38",
    androidSdkVersion: 34,
    userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
  },
  {
    clientName: "ANDROID_VR",
    clientVersion: "1.60.19",
    userAgent:
      "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12; eureka-user Build/SQ3A.220605.009.A1) gzip",
  },
  {
    clientName: "IOS",
    clientVersion: "19.45.4",
    userAgent: "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 17_5 like Mac OS X)",
  },
  {
    clientName: "TVHTML5",
    clientVersion: "7.20250313.03.00",
    userAgent: "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version",
  },
] as const;

/** Public frontends that still 302 `/latest_version` (Tesla <video> follows this itself). */
const INVIDIOUS = [
  "https://invidious.tiekoetter.com",
  "https://invidious.nerdvpn.de",
  "https://invidious.protokolla.fi",
  "https://yewtu.be",
  "https://yt.chocolatemoo53.com",
  "https://inv.nadeko.net",
  "https://invidious.f5.si",
  "https://invidious.flokinet.to",
  "https://invidious.privacyredirect.com",
  "https://inv.tux.pizza",
];

export function youtubeMediaHost(host: string) {
  const name = host.toLowerCase();
  if (name.endsWith(".googlevideo.com")) return true;
  if (name.includes("invidious") || name.includes("yewtu") || name.includes("piped")) return true;
  if (name.endsWith("nadeko.net") || name.endsWith("nerdvpn.de")) return true;
  return INVIDIOUS.some((base) => {
    try {
      return new URL(base).hostname.toLowerCase() === name;
    } catch {
      return false;
    }
  });
}

/** Embed hosts that allow being framed and actually serve a player (not youtube.com). */
const EMBED_HOSTS = [
  "https://invidious.tiekoetter.com",
  "https://piped.video",
  "https://piped.private.coffee",
];

const PIPED = [
  "https://pipedapi.adminforge.de",
  "https://pipedapi.kavin.rocks",
  "https://api.piped.private.coffee",
  "https://pipedapi.lunar.icu",
  "https://pipedapi.leptons.xyz",
];

const ITAGS = [
  { itag: 22, quality: "720p" },
  { itag: 18, quality: "360p" },
] as const;

export function preferredProgressiveItags() {
  const downlink =
    typeof navigator === "undefined"
      ? 0
      : Number((navigator as Navigator & { connection?: { downlink?: number } }).connection?.downlink || 0);
  if (downlink > 0 && downlink < 2.5) {
    return [
      { itag: 18, quality: "360p" },
      { itag: 22, quality: "720p" },
    ] as const;
  }
  return ITAGS;
}

/** InnerTube has no CORS. Only call it from the API, never from the Tesla/browser tab. */
export function canCallInnertube() {
  return typeof window === "undefined";
}

export function sanitizeVideoId(raw: string) {
  const id = String(raw || "").trim();
  if (!/^[a-zA-Z0-9_-]{6,15}$/.test(id)) throw new Error("BAD_VIDEO_ID");
  return id;
}

function isMuxedMp4(format: Format) {
  const mime = format.mimeType || "";
  return Boolean(format.url) && mime.includes("video/mp4") && /mp4a|audio/i.test(mime);
}

export function pickPlayback(data: PlayerPayload): PlaybackSource {
  const stream = data.streamingData;
  const status = data.playabilityStatus?.status;
  if (status && status !== "OK") {
    throw new Error(data.playabilityStatus?.reason || status);
  }
  if (!stream) throw new Error("NO_STREAM");
  const muxed = (stream.formats || [])
    .filter(isMuxedMp4)
    .sort((a, b) => (b.height || 0) - (a.height || 0));
  if (muxed[0]?.url) {
    return {
      url: muxed[0].url,
      mime: muxed[0].mimeType || "video/mp4",
      quality: muxed[0].qualityLabel || "mp4",
      kind: "progressive",
    };
  }
  if (stream.hlsManifestUrl) {
    return {
      url: stream.hlsManifestUrl,
      mime: "application/vnd.apple.mpegurl",
      quality: "hls",
      kind: "hls",
    };
  }
  throw new Error("NO_PROGRESSIVE_STREAM");
}

async function fetchJson(url: string, init: RequestInit = {}, ms = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`BAD_JSON ${res.status}`);
    }
    return { res, data };
  } finally {
    clearTimeout(timer);
  }
}

async function innertubePlayer(videoId: string) {
  const errors: string[] = [];
  for (const client of INNERTUBE_CLIENTS) {
    try {
      const { data } = await fetchJson("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": client.userAgent,
        },
        body: JSON.stringify({
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
          context: {
            client: {
              clientName: client.clientName,
              clientVersion: client.clientVersion,
              hl: "de",
              gl: "DE",
              ...("androidSdkVersion" in client ? { androidSdkVersion: client.androidSdkVersion } : {}),
            },
          },
        }),
      });
      return pickPlayback(data as PlayerPayload);
    } catch (error) {
      errors.push(`${client.clientName}: ${(error as Error).message}`);
    }
  }
  throw new Error(errors[0] || "INNERTUBE_FAILED");
}

async function invidiousPlayback(videoId: string) {
  for (const base of INVIDIOUS) {
    try {
      const { res, data } = await fetchJson(`${base}/api/v1/videos/${videoId}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;
      const hls = typeof data.hlsUrl === "string" ? data.hlsUrl : "";
      const streams = Array.isArray(data.formatStreams) ? data.formatStreams : [];
      const mp4 = streams.find((item) => {
        const row = item as { url?: string; container?: string; type?: string };
        return Boolean(row.url) && `${row.container || ""} ${row.type || ""}`.includes("mp4");
      }) as { url: string; type?: string; qualityLabel?: string; quality?: string } | undefined;
      if (mp4?.url) {
        return {
          url: mp4.url,
          mime: mp4.type || "video/mp4",
          quality: mp4.qualityLabel || mp4.quality || "mp4",
          kind: "progressive" as const,
        };
      }
      if (hls) {
        return {
          url: hls,
          mime: "application/vnd.apple.mpegurl",
          quality: "hls",
          kind: "hls" as const,
        };
      }
    } catch {
      /* next instance */
    }
  }
  throw new Error("INVIDIOUS_FAILED");
}

async function pipedPlayback(videoId: string) {
  for (const base of PIPED) {
    try {
      const { res, data } = await fetchJson(`${base}/streams/${videoId}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;
      const videos = Array.isArray(data.videoStreams) ? data.videoStreams : [];
      const muxed = videos.find((item) => {
        const row = item as { url?: string; videoOnly?: boolean; mimeType?: string };
        return row.url && row.videoOnly === false && `${row.mimeType || ""}`.includes("mp4");
      }) as { url: string; mimeType?: string; quality?: string } | undefined;
      if (muxed?.url) {
        return {
          url: muxed.url,
          mime: muxed.mimeType || "video/mp4",
          quality: muxed.quality || "mp4",
          kind: "progressive" as const,
        };
      }
      if (typeof data.hls === "string" && data.hls) {
        return { url: data.hls, mime: "application/vnd.apple.mpegurl", quality: "hls", kind: "hls" as const };
      }
    } catch {
      /* next instance */
    }
  }
  throw new Error("PIPED_FAILED");
}

export function friendlyPlaybackError(raw: string) {
  const message = String(raw || "").trim();
  if (/LOGIN_REQUIRED|not a bot|Melde dich|Sign in|Please sign in/i.test(message)) {
    return "Stream blockiert.";
  }
  if (/INVIDIOUS|PIPED|NO_STREAM|INNERTUBE|NO_PROGRESSIVE|HLS_UNSUPPORTED/i.test(message)) {
    return "Kein Stream.";
  }
  return message || "Kein Stream.";
}

/**
 * Direct media URLs the Tesla <video> element can load itself.
 * Do not pre-resolve these on Vercel — googlevideo links are IP-locked
 * and Invidious JSON APIs are CORS-disabled on public instances.
 */
export function playbackCandidates(
  rawId: string,
  opts: { hls?: boolean } = {},
): PlaybackSource[] {
  const videoId = sanitizeVideoId(rawId);
  const itags = preferredProgressiveItags();
  const out: PlaybackSource[] = [];
  const includeHls = opts.hls !== false;
  const hlsFor = (base: string): PlaybackSource => ({
    url: `${base}/api/manifest/hls_playlist/${videoId}?local=true`,
    mime: "application/vnd.apple.mpegurl",
    quality: "auto",
    kind: "hls",
  });
  const progressiveFor = (base: string, itag: number, quality: string, local: boolean): PlaybackSource => ({
    url: `${base}/latest_version?id=${videoId}&itag=${itag}${local ? "&local=true" : ""}`,
    mime: "video/mp4",
    quality: local ? `${quality}-proxy` : quality,
    kind: "progressive",
  });

  for (const base of INVIDIOUS) {
    if (includeHls) out.push(hlsFor(base));
    for (const { itag, quality } of itags) {
      out.push(progressiveFor(base, itag, quality, true));
    }
  }
  for (const base of INVIDIOUS) {
    for (const { itag, quality } of itags) {
      out.push(progressiveFor(base, itag, quality, false));
    }
  }
  return out;
}

export function youtubeFileUrl(videoId: string, itag: number) {
  return `/api/youtube/file?id=${encodeURIComponent(videoId)}&itag=${itag}`;
}

/**
 * MP4 URLs the phone/Tesla <video> loads itself.
 * Non-local first: Invidious 302s to googlevideo bound to THIS device IP.
 * Vercel /api/youtube/file cannot do that — datacenter IPs get 403/LOGIN_REQUIRED.
 */
export function deviceProgressiveCandidates(rawId: string, limit = 8): PlaybackSource[] {
  const videoId = sanitizeVideoId(rawId);
  const itags = [
    { itag: 18, quality: "360p" },
    { itag: 22, quality: "720p" },
  ] as const;
  const out: PlaybackSource[] = [];
  const seen = new Set<string>();
  const push = (url: string, quality: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    out.push({ url, mime: "video/mp4", quality, kind: "progressive" });
  };
  for (const local of [false, true]) {
    for (const { itag, quality } of itags) {
      for (const base of INVIDIOUS) {
        push(
          `${base}/latest_version?id=${videoId}&itag=${itag}${local ? "&local=true" : ""}`,
          local ? `${quality}-proxy` : quality,
        );
      }
    }
  }
  return out.slice(0, limit);
}

/** Third-party HTML5 embeds (not youtube.com / youtube-nocookie). Unused in the player. */
export function embedCandidates(rawId: string): string[] {
  const videoId = sanitizeVideoId(rawId);
  return EMBED_HOSTS.map((base) => `${base}/embed/${videoId}?autoplay=1&quality=medium`);
}

export async function firstLiveCandidate(candidates: PlaybackSource[]): Promise<PlaybackSource | null> {
  const slice = candidates.slice(0, 4);
  const result = await Promise.race([
    (async () => {
      const pending = slice.map(async (candidate) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        try {
          const res = await fetch(candidate.url, {
            method: "GET",
            redirect: "follow",
            headers: { Range: "bytes=0-1", accept: "*/*" },
            signal: ctrl.signal,
          });
          const type = res.headers.get("content-type") || "";
          if (res.status === 206) return candidate;
          if (res.ok && /video|mpegurl|octet-stream|mp4/i.test(type)) return candidate;
          return null;
        } catch {
          return null;
        } finally {
          clearTimeout(timer);
        }
      });
      const rows = await Promise.all(pending);
      return rows.find((item): item is PlaybackSource => Boolean(item)) || null;
    })(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
  ]);
  return result;
}

export async function proxyYoutubeFile(id: string, itag: number, range?: string | null) {
  const videoId = sanitizeVideoId(id);
  const all = playbackCandidates(videoId, { hls: false });
  const preferred = all.filter((item) => item.url.includes(`itag=${itag}`));
  const ordered: PlaybackSource[] = [];
  const seen = new Set<string>();
  for (const item of [...preferred, ...all]) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    ordered.push(item);
  }
  const deadline = Date.now() + 7500;
  for (const candidate of ordered.slice(0, 4)) {
    if (Date.now() > deadline) break;
    const remain = Math.max(1000, deadline - Date.now());
    const out = await proxyMedia(candidate.url, {
      range,
      timeoutMs: Math.min(remain, 4500),
      allowHost: youtubeMediaHost,
    });
    if (out) return out;
  }
  return Response.json({ error: "Kein Stream." }, { status: 502 });
}

export async function resolveYoutubePlayback(rawId: string): Promise<PlaybackSource> {
  const videoId = sanitizeVideoId(rawId);
  const candidates = playbackCandidates(videoId);
  if (canCallInnertube()) {
    const found = await Promise.race([
      (async () => {
        try {
          return await innertubePlayer(videoId);
        } catch {
          /* next */
        }
        try {
          return await invidiousPlayback(videoId);
        } catch {
          /* next */
        }
        try {
          return await pipedPlayback(videoId);
        } catch {
          /* next */
        }
        return firstLiveCandidate(candidates);
      })(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (found) return found;
  }
  if (candidates[0]) return candidates[0];
  throw new Error(friendlyPlaybackError("NO_STREAM"));
}
