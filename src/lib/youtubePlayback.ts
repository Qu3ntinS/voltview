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

const INVIDIOUS = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yewtu.be",
  "https://invidious.flokinet.to",
  "https://iv.datura.network",
  "https://invidious.privacyredirect.com",
  "https://invidious.protokolla.fi",
  "https://inv.tux.pizza",
  "https://yt.artemislena.eu",
];

const PIPED = [
  "https://pipedapi.adminforge.de",
  "https://pipedapi.kavin.rocks",
  "https://api.piped.private.coffee",
  "https://pipedapi.lunar.icu",
  "https://pipedapi.leptons.xyz",
];

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

export async function resolveYoutubePlayback(rawId: string): Promise<PlaybackSource> {
  const videoId = sanitizeVideoId(rawId);
  const errors: string[] = [];
  const attempts = canCallInnertube()
    ? [innertubePlayer, invidiousPlayback, pipedPlayback]
    : [invidiousPlayback, pipedPlayback];
  for (const attempt of attempts) {
    try {
      return await attempt(videoId);
    } catch (error) {
      errors.push((error as Error).message);
    }
  }
  throw new Error(errors[0] || "NO_STREAM");
}
