/** Vercel Hobby ~4.5MB / 10s. Cap Range so Tesla can keep requesting slices. */
export const MEDIA_CHUNK = 3_500_000;

export function capRange(header?: string | null, chunk = MEDIA_CHUNK): string {
  const raw = String(header || "").trim();
  const match = /^bytes=(\d+)-(\d+)?$/i.exec(raw);
  const start = match ? Number(match[1]) : 0;
  const requestedEnd =
    match && match[2] !== undefined && match[2] !== "" ? Number(match[2]) : start + chunk - 1;
  if (!Number.isFinite(start) || start < 0) return `bytes=0-${chunk - 1}`;
  const end = Math.min(Math.max(requestedEnd, start), start + chunk - 1);
  return `bytes=${start}-${end}`;
}

export function parseByteRange(header: string) {
  const match = /^bytes=(\d+)-(\d+)$/i.exec(header);
  return {
    start: match ? Number(match[1]) : 0,
    end: match ? Number(match[2]) : MEDIA_CHUNK - 1,
  };
}

/** Plex start.mp4 often rejects 1–2 byte probes. Ask for a real media slice. */
export function playableRange(header?: string | null, chunk = MEDIA_CHUNK, minBytes = 65536): string {
  const capped = capRange(header, chunk);
  const { start, end } = parseByteRange(capped);
  if (end - start + 1 >= minBytes) return capped;
  return capRange(`bytes=${start}-`, chunk);
}

export function shouldCapMedia() {
  return Boolean(process.env.VERCEL);
}

function hostnameOf(raw: string) {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isAllowedMediaUrl(raw: string, allowHost?: (host: string) => boolean) {
  try {
    const dest = new URL(raw);
    if (dest.protocol !== "http:" && dest.protocol !== "https:") return false;
    const host = dest.hostname.toLowerCase();
    if (allowHost?.(host)) return true;
    return (
      host.endsWith(".googlevideo.com") ||
      host.endsWith(".plex.direct") ||
      host === "plex.tv" ||
      host.endsWith(".plex.tv")
    );
  } catch {
    return false;
  }
}

function looksLikeMedia(type: string, status: number) {
  if (/json|text\/html|text\/xml|application\/xml|text\/plain/i.test(type) && !/video|mpegurl|octet-stream|mp4/i.test(type)) {
    return false;
  }
  if (status === 206) return true;
  return /video|mpegurl|octet-stream|mp4|mpeg|binary/i.test(type) || status === 200;
}

async function readCapped(res: Response, max: number) {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < max) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const take = value.byteLength + received > max ? value.subarray(0, max - received) : value;
    chunks.push(take);
    received += take.byteLength;
    if (received >= max) {
      await reader.cancel().catch(() => undefined);
      break;
    }
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function totalSize(upstream: Response, start: number, bodyLength: number, capped: boolean) {
  const contentRange = upstream.headers.get("content-range") || "";
  const fromRange = /\/(\d+)\s*$/.exec(contentRange);
  if (fromRange) return fromRange[1];
  const length = Number(upstream.headers.get("content-length") || 0);
  if (upstream.status === 200 && length > 0) return String(length);
  if (!capped || bodyLength < MEDIA_CHUNK) return String(start + bodyLength);
  return "*";
}

export type ProxyMediaOpts = {
  range?: string | null;
  headers?: Record<string, string>;
  timeoutMs?: number;
  allowHost?: (host: string) => boolean;
  cap?: boolean;
  omitRange?: boolean;
  retryUnranged?: boolean;
};

const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function mediaRequestHeaders(opts: ProxyMediaOpts, range: string, useRange: boolean) {
  const headers: Record<string, string> = {
    accept: "*/*",
    "user-agent": BROWSER_UA,
    ...(opts.headers || {}),
  };
  if (useRange) headers.Range = opts.cap === false ? opts.range || range : range;
  return headers;
}

function isPlayableMedia(res: Response) {
  const type = res.headers.get("content-type") || "";
  if (!res.ok && res.status !== 206) return false;
  return looksLikeMedia(type, res.status);
}

export async function proxyMedia(url: string, opts: ProxyMediaOpts = {}): Promise<Response | null> {
  if (!isAllowedMediaUrl(url, opts.allowHost)) return null;
  const cap = opts.cap ?? shouldCapMedia();
  const range = capRange(opts.range);
  const start = opts.omitRange ? 0 : parseByteRange(range).start;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000);
  try {
    const fetchOnce = (useRange: boolean) =>
      fetch(url, {
        headers: mediaRequestHeaders({ ...opts, cap }, range, useRange),
        redirect: "follow",
        signal: ctrl.signal,
      });

    let res = await fetchOnce(!opts.omitRange);
    if (opts.retryUnranged && !opts.omitRange && !isPlayableMedia(res)) {
      res = await fetchOnce(false);
    }
    if (res.url && !isAllowedMediaUrl(res.url, opts.allowHost)) {
      await res.body?.cancel().catch(() => undefined);
      return null;
    }
    const type = res.headers.get("content-type") || "";
    if (!res.ok && res.status !== 206) return null;
    if (!looksLikeMedia(type, res.status)) return null;

    if (!cap) {
      const headers = new Headers();
      headers.set("content-type", type || "video/mp4");
      headers.set("accept-ranges", "bytes");
      headers.set("cache-control", "private, no-store");
      const contentRange = res.headers.get("content-range");
      const contentLength = res.headers.get("content-length");
      if (contentRange) headers.set("content-range", contentRange);
      if (contentLength) headers.set("content-length", contentLength);
      return new Response(res.body, {
        status: res.status === 200 && !opts.range ? 200 : res.status === 206 ? 206 : res.status,
        headers,
      });
    }

    const body = await readCapped(res, MEDIA_CHUNK);
    if (!body.byteLength) return null;
    const actualEnd = start + body.byteLength - 1;
    const total = totalSize(res, start, body.byteLength, true);
    const headers = new Headers({
      "content-type": /json|html/i.test(type) ? "video/mp4" : type || "video/mp4",
      "accept-ranges": "bytes",
      "content-range": `bytes ${start}-${actualEnd}/${total}`,
      "content-length": String(body.byteLength),
      "cache-control": "private, no-store",
    });
    return new Response(body, { status: 206, headers });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendNodeResponse(
  out: Response,
  res: {
    status: (code: number) => unknown;
    setHeader: (k: string, v: string) => void;
    end: (body?: unknown) => void;
  },
) {
  res.status(out.status);
  out.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await out.arrayBuffer()));
}

export function mediaHostAllowlist(origins: string[]) {
  const hosts = new Set(
    origins
      .map((item) => hostnameOf(item))
      .filter(Boolean),
  );
  return (host: string) => hosts.has(host.toLowerCase());
}
