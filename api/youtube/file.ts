import { firstLiveCandidate, playbackCandidates, sanitizeVideoId } from "../_lib/youtubePlayback";

export default async function handler(
  req: { query?: { id?: string | string[]; itag?: string | string[] }; url?: string },
  res: {
    status: (code: number) => { json: (body: unknown) => void; end: (body?: unknown) => void };
    setHeader: (k: string, v: string) => void;
  },
) {
  const url = new URL(req.url || "http://localhost/api/youtube/file");
  const from = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) || "";
  const id = from(req.query?.id) || url.searchParams.get("id") || "";
  const itag = Number(from(req.query?.itag) || url.searchParams.get("itag") || "18") || 18;
  try {
    sanitizeVideoId(id);
    const all = playbackCandidates(id, { hls: false });
    const preferred = all.filter((item) => item.url.includes(`itag=${itag}`));
    const live = await firstLiveCandidate(preferred.length ? preferred : all);
    const target = live?.url || preferred[0]?.url || all[0]?.url;
    if (!target) {
      res.status(502).json({ error: "Kein Stream." });
      return;
    }
    res.setHeader("Location", target);
    res.setHeader("Cache-Control", "no-store");
    res.status(302).end();
  } catch (error) {
    const raw = (error as Error).message;
    res.status(raw === "BAD_VIDEO_ID" ? 400 : 502).json({ error: raw === "BAD_VIDEO_ID" ? raw : "Kein Stream." });
  }
}
