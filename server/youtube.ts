import { Elysia } from "elysia";

const YT = "https://www.googleapis.com/youtube/v3";

function youtubeKey(request: Request) {
  return (
    request.headers.get("x-volt-youtube-key") ||
    process.env.YOUTUBE_API_KEY ||
    ""
  ).trim();
}

async function youtubeGet(path: string, params: Record<string, string>, key: string) {
  if (!key) {
    throw new Error("NO_YOUTUBE_KEY");
  }
  const url = new URL(`${YT}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  url.searchParams.set("key", key);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `YouTube ${res.status}`;
    throw new Error(message);
  }
  return data;
}

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
    description: item.snippet?.description || "",
    publishedAt: item.snippet?.publishedAt || "",
    thumbnail: thumb || "",
    duration: item.contentDetails?.duration || "",
    views: item.statistics?.viewCount || "",
  };
}

export const youtubeRoutes = new Elysia({ prefix: "/api/youtube" })
  .get("/trending", async ({ request, query, set }) => {
    try {
      const key = youtubeKey(request);
      const region = String(query.region || "DE");
      const categoryId = String(query.categoryId || "");
      const data = await youtubeGet(
        "videos",
        {
          part: "snippet,contentDetails,statistics",
          chart: "mostPopular",
          regionCode: region,
          maxResults: "24",
          videoCategoryId: categoryId === "0" ? "" : categoryId,
        },
        key
      );
      return { items: (data.items || []).map(mapVideo) };
    } catch (error) {
      set.status = (error as Error).message === "NO_YOUTUBE_KEY" ? 400 : 502;
      return { error: (error as Error).message, items: [] };
    }
  })
  .get("/search", async ({ request, query, set }) => {
    try {
      const key = youtubeKey(request);
      const q = String(query.q || "").trim();
      if (!q) return { items: [] };
      const data = await youtubeGet(
        "search",
        {
          part: "snippet",
          type: "video",
          maxResults: "24",
          q,
          regionCode: String(query.region || "DE"),
        },
        key
      );
      return { items: (data.items || []).map(mapVideo) };
    } catch (error) {
      set.status = (error as Error).message === "NO_YOUTUBE_KEY" ? 400 : 502;
      return { error: (error as Error).message, items: [] };
    }
  })
  .get("/videos", async ({ request, query, set }) => {
    try {
      const key = youtubeKey(request);
      const id = String(query.id || "");
      if (!id) return { items: [] };
      const data = await youtubeGet(
        "videos",
        {
          part: "snippet,contentDetails,statistics",
          id,
        },
        key
      );
      return { items: (data.items || []).map(mapVideo) };
    } catch (error) {
      set.status = (error as Error).message === "NO_YOUTUBE_KEY" ? 400 : 502;
      return { error: (error as Error).message, items: [] };
    }
  })
  .get("/related", async ({ request, query, set }) => {
    try {
      const key = youtubeKey(request);
      const q = String(query.q || "").trim();
      if (!q) return { items: [] };
      const data = await youtubeGet(
        "search",
        {
          part: "snippet",
          type: "video",
          maxResults: "16",
          q,
        },
        key
      );
      return { items: (data.items || []).map(mapVideo) };
    } catch (error) {
      set.status = (error as Error).message === "NO_YOUTUBE_KEY" ? 400 : 502;
      return { error: (error as Error).message, items: [] };
    }
  });
