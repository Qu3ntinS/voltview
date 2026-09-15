import { mailboxPublish, mailboxRead, pickPairSettings, sanitizePairId } from "../_lib/pairMailbox";

type VercelRes = {
  status: (code: number) => { json: (body: unknown) => void };
};

function readBody(req: { body?: unknown }): Record<string, unknown> {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

export default async function handler(
  req: { method?: string; query?: { id?: string | string[] }; body?: unknown },
  res: VercelRes,
) {
  const fromQuery = req.query?.id;
  const raw = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery || "";
  try {
    const id = sanitizePairId(raw);
    const method = req.method || "GET";
    if (method === "GET") {
      res.status(200).json({ id, ...(await mailboxRead(id)) });
      return;
    }
    if (method === "PUT") {
      await mailboxPublish(id, pickPairSettings(readBody(req)));
      res.status(200).json({ ok: true });
      return;
    }
    if (method === "DELETE") {
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: "METHOD" });
  } catch (error) {
    const rawError = (error as Error).message;
    res.status(rawError === "BAD_PAIR_ID" ? 400 : 502).json({ error: rawError });
  }
}
