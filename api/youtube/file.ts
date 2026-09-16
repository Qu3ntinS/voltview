import { proxyYoutubeFile, sanitizeVideoId } from "../_lib/youtubePlayback";
import { sendNodeResponse } from "../_lib/mediaProxy";

function from(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value) || "";
}

function header(req: { headers?: Record<string, string | string[] | undefined> }, name: string) {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

export default async function handler(
  req: {
    query?: { id?: string | string[]; itag?: string | string[] };
    url?: string;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => { json: (body: unknown) => void; end: (body?: unknown) => void };
    setHeader: (k: string, v: string) => void;
    end: (body?: unknown) => void;
  },
) {
  const url = new URL(req.url || "http://localhost/api/youtube/file");
  const id = from(req.query?.id) || url.searchParams.get("id") || "";
  const itag = Number(from(req.query?.itag) || url.searchParams.get("itag") || "18") || 18;
  try {
    sanitizeVideoId(id);
    const out = await proxyYoutubeFile(id, itag, header(req, "range") || header(req, "Range"));
    await sendNodeResponse(out, res);
  } catch (error) {
    const raw = (error as Error).message;
    res.status(raw === "BAD_VIDEO_ID" ? 400 : 502).json({ error: raw === "BAD_VIDEO_ID" ? raw : "Kein Stream." });
  }
}
