import { Elysia } from "elysia";
import { friendlyPlaybackError, resolveYoutubePlayback } from "../src/lib/youtubePlayback";

const YT = "https://www.googleapis.com/youtube/v3";

function youtubeKey(_request: Request) {
  return (process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || "").trim();
}

function youtubeToken(request: Request) {
  return (request.headers.get("x-volt-youtube-token") || "").trim();
}

async function youtubeGet(
  path: string,
  params: Record<string, string>,
  auth: { key?: string; token?: string }
) {
  if (!auth.key && !auth.token) {
    throw new Error("NO_YOUTUBE_KEY");
  }
  const url = new URL(`${YT}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  if (auth.key) url.searchParams.set("key", auth.key);
  const headers: Record<string, string> = {};
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `YouTube ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function authOf(request: Request) {
  return { key: youtubeKey(request), token: youtubeToken(request) };
}

function requireToken(request: Request) {
  const token = youtubeToken(request);
  if (!token) throw new Error("NO_YOUTUBE_LOGIN");
  return { key: youtubeKey(request), token };
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
      const key = authOf(request);
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
      const key = authOf(request);
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
      const key = authOf(request);
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
      const key = authOf(request);
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
  })
  .get("/liked", async ({ request, set }) => {
    try {
      const auth = requireToken(request);
      const data = await youtubeGet(
        "videos",
        {
          part: "snippet,contentDetails,statistics",
          myRating: "like",
          maxResults: "24",
        },
        auth
      );
      return { items: (data.items || []).map(mapVideo) };
    } catch (error) {
      set.status = (error as Error).message === "NO_YOUTUBE_LOGIN" ? 401 : 502;
      return { error: (error as Error).message, items: [] };
    }
  })
  .get("/subscriptions", async ({ request, set }) => {
    try {
      const auth = requireToken(request);
      const data = await youtubeGet(
        "subscriptions",
        {
          part: "snippet",
          mine: "true",
          maxResults: "24",
          order: "unread",
        },
        auth
      );
      const channels = (data.items || []).map((item: any) => ({
        id: item.snippet?.resourceId?.channelId || "",
        title: item.snippet?.title || "",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
      }));
      return { items: channels };
    } catch (error) {
      set.status = (error as Error).message === "NO_YOUTUBE_LOGIN" ? 401 : 502;
      return { error: (error as Error).message, items: [] };
    }
  })
  .get("/feed", async ({ request, set }) => {
    try {
      const auth = requireToken(request);
      const subs = await youtubeGet(
        "subscriptions",
        {
          part: "snippet",
          mine: "true",
          maxResults: "8",
          order: "unread",
        },
        auth
      );
      const channelIds = (subs.items || [])
        .map((item: any) => item.snippet?.resourceId?.channelId)
        .filter(Boolean)
        .slice(0, 6);
      const videos = [];
      for (const channelId of channelIds) {
        const data = await youtubeGet(
          "search",
          {
            part: "snippet",
            channelId,
            type: "video",
            order: "date",
            maxResults: "2",
          },
          auth
        );
        videos.push(...(data.items || []).map(mapVideo));
      }
      return { items: videos };
    } catch (error) {
      set.status = (error as Error).message === "NO_YOUTUBE_LOGIN" ? 401 : 502;
      return { error: (error as Error).message, items: [] };
    }
  })
  .get("/channel", async ({ request, query, set }) => {
    try {
      const auth = authOf(request);
      const channelId = String(query.id || "");
      if (!channelId) return { items: [] };
      const data = await youtubeGet(
        "search",
        {
          part: "snippet",
          channelId,
          type: "video",
          order: "date",
          maxResults: "24",
        },
        auth
      );
      return { items: (data.items || []).map(mapVideo) };
    } catch (error) {
      set.status = (error as Error).message === "NO_YOUTUBE_KEY" ? 400 : 502;
      return { error: (error as Error).message, items: [] };
    }
  })
  .get("/stream", async ({ query, set }) => {
    try {
      return await resolveYoutubePlayback(String(query.id || ""));
    } catch (error) {
      const raw = (error as Error).message;
      const message = raw === "BAD_VIDEO_ID" ? raw : friendlyPlaybackError(raw);
      set.status = raw === "BAD_VIDEO_ID" ? 400 : 502;
      return { error: message };
    }
  });
