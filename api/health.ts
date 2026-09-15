export default function handler(
  _req: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  res.status(200).json({
    ok: true,
    name: "voltview",
    youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY),
  });
}
