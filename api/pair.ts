import { PAIR_TTL_MS, pairCode } from "./_lib/pairMailbox";

export default function handler(
  req: { method?: string },
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  if ((req.method || "GET") !== "POST") {
    res.status(405).json({ error: "METHOD" });
    return;
  }
  const id = pairCode(12);
  res.status(200).json({ id, expiresAt: Date.now() + PAIR_TTL_MS });
}
