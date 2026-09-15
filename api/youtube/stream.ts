import { friendlyPlaybackError, resolveYoutubePlayback } from "../src/lib/youtubePlayback";

export default async function handler(
  req: { query?: { id?: string | string[] }; url?: string },
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  const fromQuery = req.query?.id;
  const id = Array.isArray(fromQuery)
    ? fromQuery[0]
    : fromQuery || new URL(req.url || "http://localhost").searchParams.get("id") || "";
  try {
    res.status(200).json(await resolveYoutubePlayback(id));
  } catch (error) {
    const raw = (error as Error).message;
    const message = raw === "BAD_VIDEO_ID" ? raw : friendlyPlaybackError(raw);
    res.status(raw === "BAD_VIDEO_ID" ? 400 : 502).json({ error: message });
  }
}
