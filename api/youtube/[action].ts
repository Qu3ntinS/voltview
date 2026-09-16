const YT = "https://www.googleapis.com/youtube/v3";

function mapVideo(item: any) {
  const thumbs = item.snippet?.thumbnails || {};
  const thumb =
    thumbs.maxres?.url ||
    thumbs.standard?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url;
  return {
    id: item.id?.videoId || item.id,
    title: item.snippet?.title || "",
    channel: item.snippet?.channelTitle || "",
    channelId: item.snippet?.channelId || "",
    description: item.snippet?.description || "",
    publishedAt: item.snippet?.publishedAt || "",
    thumbnail: thumb || "",
    duration: item.contentDetails?.duration || "",
    views: item.statistics?.viewCount || "",
  };
}

function mapChannel(item: any) {
  const thumbs = item.snippet?.thumbnails || {};
  return {
    id: item.id?.channelId || item.snippet?.resourceId?.channelId || item.id || "",
    title: item.snippet?.title || "",
    thumbnail: thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || "",
    description: item.snippet?.description || "",
  };
}

function header(req: { headers?: Record<string, string | string[] | undefined> }, name: string) {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

function query(req: { query?: Record<string, string | string[]>; url?: string }, name: string) {
  const fromQuery = req.query?.[name];
  if (typeof fromQuery === "string") return fromQuery;
  if (Array.isArray(fromQuery)) return fromQuery[0] || "";
  try {
    return new URL(req.url || "http://localhost", "http://localhost").searchParams.get(name) || "";
  } catch {
    return "";
  }
}

async function youtubeGet(path: string, params: Record<string, string>, token: string) {
  const key = (process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || "").trim();
  if (!key && !token) throw new Error("NO_YOUTUBE_KEY");
  const url = new URL(`${YT}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  if (key) url.searchParams.set("key", key);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `YouTube ${res.status}`);
  return data;
}

export default async function handler(
  req: { query?: Record<string, string | string[]>; url?: string; headers?: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  const action = query(req, "action");
  const token = header(req, "x-volt-youtube-token");
  try {
    if (action === "trending") {
      const data = await youtubeGet(
        "videos",
        {
          part: "snippet,contentDetails,statistics",
          chart: "mostPopular",
          regionCode: query(req, "region") || "DE",
          maxResults: "24",
          videoCategoryId: query(req, "categoryId") === "0" ? "" : query(req, "categoryId"),
        },
        token,
      );
      return res.status(200).json({ items: (data.items || []).map(mapVideo) });
    }
    if (action === "search" || action === "related") {
      const q = query(req, "q").trim();
      if (!q) return res.status(200).json({ items: [], channels: [] });
      const videoData = await youtubeGet(
        "search",
        {
          part: "snippet",
          type: "video",
          maxResults: action === "related" ? "16" : "20",
          q,
          regionCode: query(req, "region") || "DE",
        },
        token,
      );
      if (action === "related") {
        return res.status(200).json({ items: (videoData.items || []).map(mapVideo) });
      }
      const channelData = await youtubeGet(
        "search",
        {
          part: "snippet",
          type: "channel",
          maxResults: "8",
          q,
          regionCode: query(req, "region") || "DE",
        },
        token,
      );
      return res.status(200).json({
        items: (videoData.items || []).map(mapVideo),
        channels: (channelData.items || []).map(mapChannel),
      });
    }
    if (action === "videos") {
      const id = query(req, "id");
      if (!id) return res.status(200).json({ items: [] });
      const data = await youtubeGet("videos", { part: "snippet,contentDetails,statistics", id }, token);
      return res.status(200).json({ items: (data.items || []).map(mapVideo) });
    }
    if (action === "liked") {
      if (!token) return res.status(401).json({ error: "NO_YOUTUBE_LOGIN", items: [] });
      const data = await youtubeGet(
        "videos",
        { part: "snippet,contentDetails,statistics", myRating: "like", maxResults: "24" },
        token,
      );
      return res.status(200).json({ items: (data.items || []).map(mapVideo) });
    }
    if (action === "subscriptions") {
      if (!token) return res.status(401).json({ error: "NO_YOUTUBE_LOGIN", items: [] });
      const data = await youtubeGet("subscriptions", { part: "snippet", mine: "true", maxResults: "24", order: "unread" }, token);
      return res.status(200).json({
        items: (data.items || []).map((item: any) => ({
          id: item.snippet?.resourceId?.channelId || "",
          title: item.snippet?.title || "",
          thumbnail:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            "",
        })),
      });
    }
    if (action === "feed") {
      if (!token) return res.status(401).json({ error: "NO_YOUTUBE_LOGIN", items: [] });
      const subs = await youtubeGet("subscriptions", { part: "snippet", mine: "true", maxResults: "8", order: "unread" }, token);
      const channelIds = (subs.items || [])
        .map((item: any) => item.snippet?.resourceId?.channelId)
        .filter(Boolean)
        .slice(0, 6);
      const videos = [];
      for (const channelId of channelIds) {
        const data = await youtubeGet("search", { part: "snippet", channelId, type: "video", order: "date", maxResults: "2" }, token);
        videos.push(...(data.items || []).map(mapVideo));
      }
      return res.status(200).json({ items: videos });
    }
    if (action === "channel") {
      const id = query(req, "id");
      if (!id) return res.status(200).json({ items: [], channel: null });
      const [meta, data] = await Promise.all([
        youtubeGet("channels", { part: "snippet,statistics", id }, token),
        youtubeGet("search", { part: "snippet", channelId: id, type: "video", order: "date", maxResults: "24" }, token),
      ]);
      const ch = (meta.items || [])[0];
      return res.status(200).json({
        channel: ch
          ? {
              id,
              title: ch.snippet?.title || "",
              thumbnail:
                ch.snippet?.thumbnails?.high?.url ||
                ch.snippet?.thumbnails?.medium?.url ||
                ch.snippet?.thumbnails?.default?.url ||
                "",
              description: ch.snippet?.description || "",
            }
          : { id, title: "", thumbnail: "", description: "" },
        items: (data.items || []).map(mapVideo),
      });
    }
    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    const message = (error as Error).message;
    res.status(message === "NO_YOUTUBE_KEY" ? 400 : message === "NO_YOUTUBE_LOGIN" ? 401 : 502).json({
      error: message,
      items: [],
    });
  }
}
