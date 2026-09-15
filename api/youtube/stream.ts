import { resolveYoutubePlayback } from "../src/lib/youtubePlayback";

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
    const message = (error as Error).message;
    res.status(message === "BAD_VIDEO_ID" ? 400 : 502).json({ error: message });
  }
}
