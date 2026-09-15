import { plexDispatch } from "../../src/lib/plexDispatch";

export default async function handler(
  req: { method?: string; url?: string; headers?: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]> },
  res: { status: (code: number) => { send: (body: unknown) => void; json: (body: unknown) => void }; setHeader: (k: string, v: string) => void; end: (body?: unknown) => void },
) {
  const host = String(req.headers?.host || "localhost");
  const proto = String(req.headers?.["x-forwarded-proto"] || "https");
  const url = new URL(req.url || "/", `${proto}://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (typeof value === "string") headers.set(key, value);
  }
  const out = await plexDispatch(new Request(url, { method: req.method || "GET", headers }));
  res.status(out.status);
  out.headers.forEach((value, key) => res.setHeader(key, value));
  const buffer = Buffer.from(await out.arrayBuffer());
  res.end(buffer);
}
