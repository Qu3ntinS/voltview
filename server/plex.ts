import { Elysia } from "elysia";

const PLEX_TV = "https://plex.tv/api/v2";
const PRODUCT = "VoltView";
const VERSION = "1.0.0";

type PlexCtx = {
  token: string;
  server: string;
  clientId: string;
  serverToken: string;
};

function header(request: Request, name: string) {
  return (request.headers.get(name) || "").trim();
}

function queryOf(request: Request, name: string) {
  try {
    return new URL(request.url).searchParams.get(name)?.trim() || "";
  } catch {
    return "";
  }
}

function clientIdOf(request: Request) {
  return header(request, "x-volt-plex-client") || queryOf(request, "plexClient") || "voltview-web";
}

function plexIdentity(clientId: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Plex-Client-Identifier": clientId,
    "X-Plex-Product": PRODUCT,
    "X-Plex-Version": VERSION,
    "X-Plex-Platform": "Web",
    "X-Plex-Device": "VoltView",
    "X-Plex-Device-Name": "VoltView",
    "X-Plex-Model": "bundled",
  };
  if (token) headers["X-Plex-Token"] = token;
  return headers;
}

function ctxOf(request: Request): PlexCtx {
  const token = header(request, "x-volt-plex-token") || queryOf(request, "plexToken");
  const server = (header(request, "x-volt-plex-server") || queryOf(request, "plexServer")).replace(
    /\/$/,
    ""
  );
  const serverToken =
    header(request, "x-volt-plex-server-token") || queryOf(request, "plexServerToken") || token;
  return { token, server, clientId: clientIdOf(request), serverToken };
}

function requirePlexAccount(ctx: PlexCtx) {
  if (!ctx.token) throw new Error("NO_PLEX_TOKEN");
}

function requirePlexServer(ctx: PlexCtx) {
  requirePlexAccount(ctx);
  if (!ctx.server) throw new Error("NO_PLEX_SERVER");
}

function isPrivateHost(hostname: string) {
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
}

function isAllowedPlexUrl(raw: string, server: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (raw.startsWith(server)) return true;
    const serverHost = server ? new URL(server).hostname : "";
    if (serverHost && url.hostname === serverHost) return true;
    if (isPrivateHost(url.hostname)) return true;
    return (
      url.hostname.endsWith(".plex.direct") ||
      url.hostname === "plex.tv" ||
      url.hostname.endsWith(".plex.tv")
    );
  } catch {
    return false;
  }
}

function mapMetadata(item: any, server: string) {
  return {
    id: String(item.ratingKey || ""),
    type: item.type || "",
    title: item.title || item.parentTitle || "",
    year: item.year || null,
    summary: item.summary || "",
    thumb: item.thumb || item.parentThumb || item.grandparentThumb || "",
    art: item.art || item.grandparentArt || "",
    rating: item.rating || item.audienceRating || null,
    duration: item.duration || 0,
    viewOffset: item.viewOffset || 0,
    leafCount: item.leafCount || 0,
    childCount: item.childCount || 0,
    parentTitle: item.parentTitle || "",
    grandparentTitle: item.grandparentTitle || "",
    index: item.index || 0,
    server,
  };
}

async function plexTv(path: string, clientId: string, token?: string, init?: RequestInit) {
  const res = await fetch(`${PLEX_TV}${path}`, {
    ...init,
    headers: {
      ...plexIdentity(clientId, token),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Plex.tv ${res.status}`);
  }
  return data;
}

async function plexServer(ctx: PlexCtx, path: string, params?: Record<string, string>) {
  const url = new URL(ctx.server + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url, {
    headers: plexIdentity(ctx.clientId, ctx.serverToken),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Plex server ${res.status}`);
  }
  return data;
}

function assetUrl(requestUrl: URL, target: string, ctx: PlexCtx) {
  const params = new URLSearchParams({
    u: target,
    plexToken: ctx.token,
    plexServer: ctx.server,
    plexServerToken: ctx.serverToken,
    plexClient: ctx.clientId,
  });
  return `${requestUrl.origin}/api/plex/asset?${params.toString()}`;
}

function rewriteM3U8(body: string, base: URL, requestUrl: URL, ctx: PlexCtx) {
  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
          const abs = new URL(uri, base).toString();
          return `URI="${assetUrl(requestUrl, abs, ctx)}"`;
        });
      }
      const abs = new URL(trimmed, base).toString();
      return assetUrl(requestUrl, abs, ctx);
    })
    .join("\n");
}

function fail(set: { status?: number | string }, error: unknown) {
  const message = (error as Error).message || "Plex error";
  set.status = message.startsWith("NO_PLEX") ? 400 : 502;
  return { error: message };
}

export const plexRoutes = new Elysia({ prefix: "/api/plex" })
  .post("/pin", async ({ request, set }) => {
    try {
      const clientId = clientIdOf(request);
      const data = await plexTv("/pins?strong=true", clientId, undefined, {
        method: "POST",
      });
      const authUrl = `https://app.plex.tv/auth#?clientID=${encodeURIComponent(
        clientId
      )}&code=${encodeURIComponent(data.code)}&context%5Bdevice%5D%5Bproduct%5D=${encodeURIComponent(
        PRODUCT
      )}`;
      return {
        id: data.id,
        code: data.code,
        authUrl,
        linkUrl: "https://plex.tv/link",
      };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/pin/:id", async ({ request, params, set }) => {
    try {
      const data = await plexTv(`/pins/${params.id}`, clientIdOf(request));
      return {
        id: data.id,
        code: data.code,
        authToken: data.authToken || null,
      };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/resources", async ({ request, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexAccount(ctx);
      const data = await plexTv(
        "/resources?includeHttps=1&includeRelay=1",
        ctx.clientId,
        ctx.token
      );
      const servers = (Array.isArray(data) ? data : [])
        .filter((item) => item.provides && String(item.provides).includes("server"))
        .map((item) => ({
          name: item.name,
          clientIdentifier: item.clientIdentifier,
          owned: Boolean(item.owned),
          accessToken: item.accessToken,
          connections: (item.connections || []).map((c: any) => ({
            uri: c.uri,
            address: c.address,
            port: c.port,
            local: Boolean(c.local),
            relay: Boolean(c.relay),
            protocol: c.protocol,
          })),
        }));
      return { servers };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/libraries", async ({ request, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const data = await plexServer(ctx, "/library/sections");
      const items = (data.MediaContainer?.Directory || []).map((d: any) => ({
        key: String(d.key),
        title: d.title,
        type: d.type,
      }));
      return { items };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/on-deck", async ({ request, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const data = await plexServer(ctx, "/library/onDeck");
      return {
        items: (data.MediaContainer?.Metadata || []).map((item: any) =>
          mapMetadata(item, ctx.server)
        ),
      };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/recent", async ({ request, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const data = await plexServer(ctx, "/library/recentlyAdded");
      return {
        items: (data.MediaContainer?.Metadata || []).map((item: any) =>
          mapMetadata(item, ctx.server)
        ),
      };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/section/:key", async ({ request, params, query, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const data = await plexServer(ctx, `/library/sections/${params.key}/all`, {
        type: String(query.type || ""),
      });
      return {
        items: (data.MediaContainer?.Metadata || []).map((item: any) =>
          mapMetadata(item, ctx.server)
        ),
      };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/metadata/:id", async ({ request, params, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const data = await plexServer(ctx, `/library/metadata/${params.id}`);
      const item = (data.MediaContainer?.Metadata || [])[0];
      return { item: item ? mapMetadata(item, ctx.server) : null, rawType: item?.type };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/children/:id", async ({ request, params, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const data = await plexServer(ctx, `/library/metadata/${params.id}/children`);
      return {
        items: (data.MediaContainer?.Metadata || []).map((item: any) =>
          mapMetadata(item, ctx.server)
        ),
      };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/search", async ({ request, query, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const q = String(query.q || "").trim();
      if (!q) return { items: [] };
      const data = await plexServer(ctx, "/hubs/search", { query: q, limit: "8" });
      const hubs = data.MediaContainer?.Hub || [];
      const items = hubs.flatMap((hub: any) =>
        (hub.Metadata || []).map((item: any) => mapMetadata(item, ctx.server))
      );
      return { items };
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/image", async ({ request, query, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const path = String(query.path || "");
      if (!path.startsWith("/")) {
        set.status = 400;
        return { error: "Invalid image path" };
      }
      const width = String(query.w || "400");
      const url = new URL(`${ctx.server}/photo/:/transcode`);
      url.searchParams.set("width", width);
      url.searchParams.set("url", path);
      url.searchParams.set("minSize", "1");
      url.searchParams.set("X-Plex-Token", ctx.serverToken);
      const res = await fetch(url, { headers: plexIdentity(ctx.clientId, ctx.serverToken) });
      if (!res.ok) {
        set.status = 502;
        return { error: "Image failed" };
      }
      set.headers["content-type"] = res.headers.get("content-type") || "image/jpeg";
      set.headers["cache-control"] = "public, max-age=3600";
      return new Response(res.body, {
        headers: {
          "content-type": res.headers.get("content-type") || "image/jpeg",
          "cache-control": "public, max-age=3600",
        },
      });
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/stream/:id", async ({ request, params, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const session = `${ctx.clientId}-${params.id}`;
      const url = new URL(`${ctx.server}/video/:/transcode/universal/start.m3u8`);
      url.searchParams.set("path", `/library/metadata/${params.id}`);
      url.searchParams.set("mediaIndex", "0");
      url.searchParams.set("partIndex", "0");
      url.searchParams.set("protocol", "hls");
      url.searchParams.set("fastSeek", "1");
      url.searchParams.set("directPlay", "0");
      url.searchParams.set("directStream", "1");
      url.searchParams.set("subtitleSize", "100");
      url.searchParams.set("audioBoost", "100");
      url.searchParams.set("autoAdjustQuality", "1");
      url.searchParams.set("session", session);
      url.searchParams.set("X-Plex-Platform", "Html5");
      url.searchParams.set("X-Plex-Client-Identifier", ctx.clientId);
      url.searchParams.set("X-Plex-Product", PRODUCT);
      url.searchParams.set("X-Plex-Device", "VoltView");
      const res = await fetch(url, { headers: plexIdentity(ctx.clientId, ctx.serverToken) });
      const body = await res.text();
      if (!res.ok) {
        set.status = 502;
        return { error: body.slice(0, 200) || "Stream failed" };
      }
      const requestUrl = new URL(request.url);
      set.headers["content-type"] = "application/vnd.apple.mpegurl";
      return rewriteM3U8(body, url, requestUrl, ctx);
    } catch (error) {
      return fail(set, error);
    }
  })
  .get("/asset", async ({ request, query, set }) => {
    try {
      const ctx = ctxOf(request);
      requirePlexServer(ctx);
      const target = String(query.u || "");
      if (!target || !isAllowedPlexUrl(target, ctx.server)) {
        set.status = 400;
        return { error: "Blocked asset host" };
      }
      const res = await fetch(target, { headers: plexIdentity(ctx.clientId, ctx.serverToken) });
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("mpegurl") || target.includes(".m3u8")) {
        const body = await res.text();
        set.headers["content-type"] = "application/vnd.apple.mpegurl";
        return rewriteM3U8(body, new URL(target), new URL(request.url), ctx);
      }
      return new Response(res.body, {
        headers: {
          "content-type": contentType || "application/octet-stream",
        },
      });
    } catch (error) {
      return fail(set, error);
    }
  });
