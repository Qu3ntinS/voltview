import type { Settings } from "./storage";

type YoutubeVideo = {
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

type YoutubeChannel = {
  id: string;
  title: string;
  thumbnail: string;
};

const YT = "https://www.googleapis.com/youtube/v3";

function mapVideo(item: any): YoutubeVideo {
  const thumbs = item.snippet?.thumbnails || {};
  return {
    id: item.id?.videoId || item.id,
    title: item.snippet?.title || "",
    channel: item.snippet?.channelTitle || "",
    channelId: item.snippet?.channelId || "",
    description: item.snippet?.description || "",
    publishedAt: item.snippet?.publishedAt || "",
    thumbnail: thumbs.maxres?.url || thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || "",
    duration: item.contentDetails?.duration || "",
    views: item.statistics?.viewCount || "",
  };
}

async function ytGet(path: string, params: Record<string, string>, settings: Settings) {
  if (!settings.youtubeAccessToken) {
    throw new Error("NO_YOUTUBE_KEY");
  }
  const url = new URL(`${YT}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  const headers: Record<string, string> = { Authorization: `Bearer ${settings.youtubeAccessToken}` };
  const res = await fetch(url.toString(), { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `YouTube ${res.status}`);
  return data;
}

export const youtubeClient = {
  trending: async (settings: Settings, categoryId = "") => {
    const data = await ytGet(
      "videos",
      {
        part: "snippet,contentDetails,statistics",
        chart: "mostPopular",
        regionCode: settings.youtubeRegion || "DE",
        maxResults: "24",
        videoCategoryId: categoryId,
      },
      settings
    );
    return { items: (data.items || []).map(mapVideo), error: undefined as string | undefined };
  },
  search: async (settings: Settings, q: string) => {
    const [videoData, channelData] = await Promise.all([
      ytGet(
        "search",
        {
          part: "snippet",
          type: "video",
          maxResults: "20",
          q,
          regionCode: settings.youtubeRegion || "DE",
        },
        settings
      ),
      ytGet(
        "search",
        {
          part: "snippet",
          type: "channel",
          maxResults: "8",
          q,
          regionCode: settings.youtubeRegion || "DE",
        },
        settings
      ),
    ]);
    const channels: YoutubeChannel[] = (channelData.items || []).map((item: any) => ({
      id: item.id?.channelId || item.snippet?.channelId || "",
      title: item.snippet?.title || "",
      thumbnail:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "",
    }));
    return { items: (videoData.items || []).map(mapVideo), channels, error: undefined as string | undefined };
  },
  videos: async (settings: Settings, id: string) => {
    const data = await ytGet("videos", { part: "snippet,contentDetails,statistics", id }, settings);
    return { items: (data.items || []).map(mapVideo), error: undefined as string | undefined };
  },
  related: async (settings: Settings, q: string) => {
    const data = await ytGet("search", { part: "snippet", type: "video", maxResults: "16", q }, settings);
    return { items: (data.items || []).map(mapVideo), error: undefined as string | undefined };
  },
  liked: async (settings: Settings) => {
    if (!settings.youtubeAccessToken) throw new Error("NO_YOUTUBE_LOGIN");
    const data = await ytGet(
      "videos",
      { part: "snippet,contentDetails,statistics", myRating: "like", maxResults: "24" },
      settings
    );
    return { items: (data.items || []).map(mapVideo), error: undefined as string | undefined };
  },
  subscriptions: async (settings: Settings) => {
    if (!settings.youtubeAccessToken) throw new Error("NO_YOUTUBE_LOGIN");
    const data = await ytGet(
      "subscriptions",
      { part: "snippet", mine: "true", maxResults: "24", order: "unread" },
      settings
    );
    const items: YoutubeChannel[] = (data.items || []).map((item: any) => ({
      id: item.snippet?.resourceId?.channelId || "",
      title: item.snippet?.title || "",
      thumbnail:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "",
    }));
    return { items, error: undefined as string | undefined };
  },
  feed: async (settings: Settings) => {
    const subs = await youtubeClient.subscriptions(settings);
    const videos: YoutubeVideo[] = [];
    for (const channel of subs.items.slice(0, 6)) {
      const data = await ytGet(
        "search",
        { part: "snippet", channelId: channel.id, type: "video", order: "date", maxResults: "2" },
        settings
      );
      videos.push(...(data.items || []).map(mapVideo));
    }
    return { items: videos, error: undefined as string | undefined };
  },
  channel: async (settings: Settings, id: string) => {
    const [meta, data] = await Promise.all([
      ytGet("channels", { part: "snippet", id }, settings).catch(() => ({ items: [] })),
      ytGet(
        "search",
        { part: "snippet", channelId: id, type: "video", order: "date", maxResults: "24" },
        settings
      ),
    ]);
    const ch = (meta.items || [])[0];
    return {
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
      error: undefined as string | undefined,
    };
  },
};
