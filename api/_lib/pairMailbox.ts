export type PairSettings = {
  youtubeRegion?: string;
  youtubeClientId?: string;
  youtubeAccessToken?: string;
  plexToken?: string;
  plexClientId?: string;
  plexServerUri?: string;
  plexServerToken?: string;
  plexServerName?: string;
  plexServerId?: string;
};

export const PAIR_TTL_MS = 10 * 60 * 1000;

const SETTING_KEYS = [
  "youtubeRegion",
  "youtubeClientId",
  "youtubeAccessToken",
  "plexToken",
  "plexClientId",
  "plexServerUri",
  "plexServerToken",
  "plexServerName",
  "plexServerId",
] as const;

const NTFY = "https://ntfy.sh";

export function pickPairSettings(input: Record<string, unknown>): PairSettings {
  const next: PairSettings = {};
  for (const key of SETTING_KEYS) {
    const value = input[key];
    if (typeof value === "string") next[key] = value;
  }
  return next;
}

export function pairCode(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export function sanitizePairId(raw: string) {
  const id = String(raw || "").trim();
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) throw new Error("BAD_PAIR_ID");
  return id;
}

export function pairTopic(raw: string) {
  return `voltview-pair-${sanitizePairId(raw)}`;
}

export function parseMailboxMessage(raw: string): { ready: boolean; settings: PairSettings | null } {
  const text = String(raw || "").trim();
  if (!text) return { ready: false, settings: null };
  const lines = text.split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(lines[i]) as { event?: string; message?: string };
      const payloadRaw = row.event ? row.message || "" : lines[i];
      if (row.event && row.event !== "message") continue;
      const parsed = JSON.parse(payloadRaw) as Record<string, unknown>;
      const settings = pickPairSettings((parsed.settings as Record<string, unknown>) || parsed);
      const ready = Object.keys(settings).length > 0;
      return { ready, settings: ready ? settings : null };
    } catch {
      /* next line */
    }
  }
  return { ready: false, settings: null };
}

export async function mailboxPublish(rawId: string, settings: PairSettings) {
  const topic = pairTopic(rawId);
  const res = await fetch(`${NTFY}/${topic}`, {
    method: "POST",
    headers: { "content-type": "application/json", title: "voltview-pair" },
    body: JSON.stringify({ v: 1, settings, t: Date.now() }),
  });
  if (!res.ok) throw new Error("PAIR_SEND_FAILED");
}

export async function mailboxRead(rawId: string) {
  const topic = pairTopic(rawId);
  const res = await fetch(`${NTFY}/${topic}/json?poll=1&since=latest`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error("PAIR_READ_FAILED");
  return parseMailboxMessage(await res.text());
}

export function isJsonBlobId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
