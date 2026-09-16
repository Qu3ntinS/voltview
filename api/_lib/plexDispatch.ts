import { isAllowedMediaUrl, proxyMedia } from "./mediaProxy";
import { isLanPlexHost, mapPlexResources, plexCreatePin, plexIdentity, plexListResources, plexMediaHeaders, plexReadPin, PLEX_PRODUCT, rankPlexConnections } from "./plexTv";

type PlexCtx = {
  token: string;
  server: string;
  clientId: string;
  serverToken: string;
  serverId: string;
  serverName: string;
};

function header(request: Request, name: string) {
  return (request.headers.get(name) || "").trim();
}

function queryOf(url: URL, name: string) {
  return url.searchParams.get(name)?.trim() || "";
}

function ctxOf(request: Request, url: URL): PlexCtx {
  const token = header(request, "x-volt-plex-token") || queryOf(url, "plexToken");
  const server = (header(request, "x-volt-plex-server") || queryOf(url, "plexServer")).replace(/\/$/, "");
  const serverToken =
    header(request, "x-volt-plex-server-token") || queryOf(url, "plexServerToken") || token;
  const clientId = header(request, "x-volt-plex-client") || queryOf(url, "plexClient") || "voltview-web";
  const serverId = header(request, "x-volt-plex-server-id") || queryOf(url, "plexServerId");
  const serverName = header(request, "x-volt-plex-server-name") || queryOf(url, "plexServerName");
  return { token, server, clientId, serverToken, serverId, serverName };
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
    const dest = new URL(raw);
    if (dest.protocol !== "http:" && dest.protocol !== "https:") return false;
    if (raw.startsWith(server)) return true;
    const serverHost = server ? new URL(server).hostname : "";
    if (serverHost && dest.hostname === serverHost) return true;
    if (isPrivateHost(dest.hostname)) return true;
    return (
      dest.hostname.endsWith(".plex.direct") ||
      dest.hostname === "plex.tv" ||
      dest.hostname.endsWith(".plex.tv")
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

async function plexServer(ctx: PlexCtx, path: string, params?: Record<string, string>) {
  const url = new URL(ctx.server + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { headers: plexIdentity(ctx.clientId, ctx.serverToken), signal: ctrl.signal });
    const text = await res.text();
    const type = res.headers.get("content-type") || "";
    if (!type.includes("json")) {
      throw new Error(res.ok ? "Plex lieferte kein JSON" : `Plex server ${res.status}`);
    }
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      throw new Error("Plex lieferte ungültiges JSON");
    }
    if (!res.ok) throw new Error((data as { error?: string }).error || `Plex server ${res.status}`);
    return data as any;
  } finally {
    clearTimeout(timer);
  }
}

async function plexUris(ctx: PlexCtx) {
  const out: string[] = [];
  const add = (raw: string, allowLan = false) => {
    const uri = String(raw || "").replace(/\/$/, "");
    if (!uri || out.includes(uri)) return;
    if (!allowLan && isLanPlexHost(uri)) return;
    out.push(uri);
  };
  add(ctx.server);
  if (ctx.token) {
    try {
      const { servers } = await plexListResources(ctx.clientId, ctx.token);
      const match =
        servers.find((item) => ctx.serverId && item.clientIdentifier === ctx.serverId) ||
        servers.find((item) => ctx.serverName && item.name === ctx.serverName) ||
        servers.find((item) => item.accessToken && item.accessToken === ctx.serverToken) ||
        servers[0];
      if (match) {
        if (match.accessToken) ctx.serverToken = match.accessToken;
        for (const connection of rankPlexConnections(match)) add(connection.uri);
      }
    } catch {
      /* keep the stored URI */
    }
  }
  add(ctx.server, true);
  return out;
}

async function plexJson(ctx: PlexCtx, path: string, params?: Record<string, string>) {
  const uris = await plexUris(ctx);
  if (!uris.length) throw new Error("NO_PLEX_SERVER");
  let last = "Plex-Server nicht erreichbar";
  for (const uri of uris) {
    try {
      return await plexServer({ ...ctx, server: uri }, path, params);
    } catch (error) {
      last = (error as Error).message || last;
    }
  }
  throw new Error(last);
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function fail(error: unknown) {
  const message = (error as Error).message || "Plex error";
  return json({ error: message }, message.startsWith("NO_PLEX") ? 400 : 502);
}

function assetUrl(requestUrl: URL, target: string, ctx: PlexCtx) {
  const params = new URLSearchParams({
    op: "asset",
    u: target,
    plexToken: ctx.token,
    plexServer: ctx.server,
    plexServerToken: ctx.serverToken,
    plexClient: ctx.clientId,
  });
  return `${requestUrl.origin}/api/plex?${params.toString()}`;
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
      return assetUrl(requestUrl, new URL(trimmed, base).toString(), ctx);
    })
    .join("\n");
}

function firstQuery(url: URL, name: string) {
  const all = url.searchParams.getAll(name).map((value) => String(value || "").trim()).filter(Boolean);
  return all.join("/");
}

/** Vercel Vite does not support [...path] catch-alls. Prefer ?op= / ?voltPath=. */
export function plexRoutePath(url: URL) {
  const volt = firstQuery(url, "voltPath");
  if (volt) return `/${volt.replace(/^\/+/, "")}`;
  const op = firstQuery(url, "op");
  if (op) {
    const rest = firstQuery(url, "key") || firstQuery(url, "id");
    if (rest && /^(section|stream|metadata|children|pin|file)$/.test(op)) return `/${op}/${rest}`;
    return `/${op.replace(/^\/+/, "")}`;
  }
  const path = url.pathname.replace(/^\/api\/plex/, "") || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function isBinaryOk(res: Response) {
  const type = res.headers.get("content-type") || "";
  return res.ok && !type.includes("json") && !type.includes("html") && !type.includes("xml");
}

async function plexMedia(ctx: PlexCtx, dest: string, extra: Record<string, string> = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    return await fetch(dest, {
      headers: { ...plexMediaHeaders(ctx.clientId, ctx.serverToken), ...extra },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function plexFilePart(ctx: PlexCtx, id: string) {
  const data = await plexJson(ctx, `/library/metadata/${id}`);
  const item = (data.MediaContainer?.Metadata || [])[0];
  const media = item?.Media?.[0];
  const part = media?.Part?.[0];
  return {
    key: String(part?.key || ""),
    container: String(media?.container || part?.container || "").toLowerCase(),
  };
}

async function proxyPlexDest(ctx: PlexCtx, dest: string, range: string | null, uris: string[]) {
  return proxyMedia(dest, {
    range,
    headers: plexMediaHeaders(ctx.clientId, ctx.serverToken),
    timeoutMs: 8000,
    allowHost: (host) => {
      if (isAllowedMediaUrl(`https://${host}/`)) return true;
      return (
        uris.some((uri) => {
          try {
            return new URL(uri).hostname.toLowerCase() === host.toLowerCase();
          } catch {
            return false;
          }
        }) || isAllowedPlexUrl(dest, ctx.server)
      );
    },
  });
}

async function servePlexFile(ctx: PlexCtx, id: string, range: string | null) {
  const uris = await plexUris(ctx);
  if (!uris.length) throw new Error("NO_PLEX_SERVER");
  let part = { key: "", container: "" };
  try {
    part = await plexFilePart(ctx, id);
  } catch {
    /* transcode fallback */
  }
  if (part.key && /^(mp4|mov|m4v)$/.test(part.container)) {
    for (const server of uris) {
      const out = await proxyPlexDest(ctx, `${server}${part.key}`, range, uris);
      if (out) {
        ctx.server = server;
        return out;
      }
    }
  }
  for (const server of uris) {
    const dest = plexStartUrl(server, id, { ...ctx, server }, "mp4").toString();
    const out = await proxyPlexDest(ctx, dest, range, uris);
    if (out) {
      ctx.server = server;
      return out;
    }
  }
  return json({ error: "Stream fehlgeschlagen." }, 502);
}

function plexStartUrl(server: string, id: string, ctx: PlexCtx, kind: "hls" | "mp4") {
  const dest = new URL(`${server}/video/:/transcode/universal/start.${kind === "mp4" ? "mp4" : "m3u8"}`);
  dest.searchParams.set("path", `/library/metadata/${id}`);
  dest.searchParams.set("mediaIndex", "0");
  dest.searchParams.set("partIndex", "0");
  dest.searchParams.set("protocol", kind === "mp4" ? "http" : "hls");
  dest.searchParams.set("fastSeek", "1");
  dest.searchParams.set("directPlay", "0");
  dest.searchParams.set("directStream", kind === "mp4" ? "0" : "1");
  dest.searchParams.set("subtitleSize", "100");
  dest.searchParams.set("audioBoost", "100");
  dest.searchParams.set("autoAdjustQuality", "1");
  dest.searchParams.set("copyts", "1");
  dest.searchParams.set("session", `${ctx.clientId}-${id}`);
  dest.searchParams.set("X-Plex-Platform", "Html5");
  dest.searchParams.set("X-Plex-Client-Identifier", ctx.clientId);
  dest.searchParams.set("X-Plex-Product", PLEX_PRODUCT);
  dest.searchParams.set("X-Plex-Device", "VoltView");
  dest.searchParams.set("X-Plex-Token", ctx.serverToken);
  if (kind === "mp4") {
    dest.searchParams.set("videoQuality", "70");
    dest.searchParams.set("maxVideoBitrate", "4000");
  }
  return dest;
}

function plexThumbUrl(server: string, imgPath: string, width: string) {
  return `${server}/photo/:/transcode?width=${encodeURIComponent(width)}&minSize=1&upscale=1&url=${encodeURI(imgPath)}`;
}

export async function plexDispatch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = plexRoutePath(url);
  const method = request.method.toUpperCase();
  const ctx = ctxOf(request, url);

  try {
    if (method === "POST" && path === "/pin") {
      return json(await plexCreatePin(ctx.clientId));
    }
    if (method === "GET" && path.startsWith("/pin/")) {
      const id = Number(path.slice("/pin/".length));
      if (!id) throw new Error("NO_PLEX_PIN");
      return json(await plexReadPin(ctx.clientId, id));
    }
    if (method === "GET" && path === "/resources") {
      requirePlexAccount(ctx);
      const res = await fetch(
        "https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1",
        { headers: plexIdentity(ctx.clientId, ctx.token) },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Plex.tv ${res.status}`);
      return json({ servers: mapPlexResources(data) });
    }
    if (method === "GET" && path === "/libraries") {
      requirePlexServer(ctx);
      const data = await plexJson(ctx, "/library/sections");
      return json({
        items: (data.MediaContainer?.Directory || []).map((d: any) => ({
          key: String(d.key),
          title: d.title,
          type: d.type,
        })),
      });
    }
    if (method === "GET" && path === "/on-deck") {
      requirePlexServer(ctx);
      const data = await plexJson(ctx, "/library/onDeck");
      return json({
        items: (data.MediaContainer?.Metadata || []).map((item: any) => mapMetadata(item, ctx.server)),
      });
    }
    if (method === "GET" && path === "/recent") {
      requirePlexServer(ctx);
      const data = await plexJson(ctx, "/library/recentlyAdded");
      return json({
        items: (data.MediaContainer?.Metadata || []).map((item: any) => mapMetadata(item, ctx.server)),
      });
    }
    if (method === "GET" && path.startsWith("/section/")) {
      requirePlexServer(ctx);
      const key = decodeURIComponent(path.slice("/section/".length));
      const data = await plexJson(ctx, `/library/sections/${key}/all`, {
        type: queryOf(url, "type"),
      });
      return json({
        items: (data.MediaContainer?.Metadata || []).map((item: any) => mapMetadata(item, ctx.server)),
      });
    }
    if (method === "GET" && path.startsWith("/metadata/")) {
      requirePlexServer(ctx);
      const id = decodeURIComponent(path.slice("/metadata/".length));
      const data = await plexJson(ctx, `/library/metadata/${id}`);
      const item = (data.MediaContainer?.Metadata || [])[0];
      return json({ item: item ? mapMetadata(item, ctx.server) : null, rawType: item?.type });
    }
    if (method === "GET" && path.startsWith("/children/")) {
      requirePlexServer(ctx);
      const id = decodeURIComponent(path.slice("/children/".length));
      const data = await plexJson(ctx, `/library/metadata/${id}/children`);
      return json({
        items: (data.MediaContainer?.Metadata || []).map((item: any) => mapMetadata(item, ctx.server)),
      });
    }
    if (method === "GET" && path === "/search") {
      requirePlexServer(ctx);
      const q = queryOf(url, "q");
      if (!q) return json({ items: [] });
      const data = await plexJson(ctx, "/hubs/search", { query: q, limit: "8" });
      const hubs = data.MediaContainer?.Hub || [];
      const items = hubs.flatMap((hub: any) =>
        (hub.Metadata || []).map((item: any) => mapMetadata(item, ctx.server)),
      );
      return json({ items });
    }
    if (method === "GET" && path === "/image") {
      requirePlexServer(ctx);
      const imgPath = queryOf(url, "path");
      if (!imgPath.startsWith("/")) return json({ error: "Invalid image path" }, 400);
      const width = queryOf(url, "w") || "400";
      const uris = await plexUris(ctx);
      for (const server of uris) {
        for (const dest of [plexThumbUrl(server, imgPath, width), `${server}${imgPath}`]) {
          try {
            const res = await plexMedia(ctx, dest);
            if (!isBinaryOk(res)) continue;
            ctx.server = server;
            return new Response(res.body, {
              headers: {
                "content-type": res.headers.get("content-type") || "image/jpeg",
                "cache-control": "public, max-age=3600",
              },
            });
          } catch {
            /* next URI */
          }
        }
      }
      return json({ error: "Image failed" }, 502);
    }
    if (method === "GET" && path.startsWith("/file/")) {
      requirePlexServer(ctx);
      const id = decodeURIComponent(path.slice("/file/".length));
      return servePlexFile(ctx, id, request.headers.get("range"));
    }
    if (method === "GET" && path.startsWith("/stream/")) {
      requirePlexServer(ctx);
      const id = decodeURIComponent(path.slice("/stream/".length));
      const format = queryOf(url, "format") === "mp4" ? "mp4" : "hls";
      const uris = await plexUris(ctx);
      if (format === "mp4") {
        return servePlexFile(ctx, id, request.headers.get("range"));
      }
      let last = "Stream failed";
      for (const server of uris) {
        const dest = plexStartUrl(server, id, { ...ctx, server }, "hls");
        try {
          const res = await plexMedia(ctx, dest.toString());
          const body = await res.text();
          if (!res.ok) {
            last = body.slice(0, 200) || last;
            continue;
          }
          ctx.server = server;
          return new Response(rewriteM3U8(body, dest, url, ctx), {
            headers: { "content-type": "application/vnd.apple.mpegurl" },
          });
        } catch (error) {
          last = (error as Error).message || last;
        }
      }
      return json({ error: last }, 502);
    }
    if (method === "GET" && path === "/asset") {
      requirePlexServer(ctx);
      const uris = await plexUris(ctx);
      const target = queryOf(url, "u");
      if (!target || !uris.some((server) => isAllowedPlexUrl(target, server) || isAllowedPlexUrl(target, ctx.server))) {
        return json({ error: "Blocked asset host" }, 400);
      }
      const res = await plexMedia(ctx, target);
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("mpegurl") || target.includes(".m3u8")) {
        const body = await res.text();
        return new Response(rewriteM3U8(body, new URL(target), url, ctx), {
          headers: { "content-type": "application/vnd.apple.mpegurl" },
        });
      }
      if (!res.ok) return json({ error: "Asset failed" }, 502);
      return new Response(res.body, {
        headers: { "content-type": contentType || "application/octet-stream" },
      });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return fail(error);
  }
}
