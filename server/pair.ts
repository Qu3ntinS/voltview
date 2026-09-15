import { Elysia, t } from "elysia";

const TTL_MS = 10 * 60 * 1000;
const SETTING_KEYS = [
  "youtubeRegion",
  "youtubeClientId",
  "youtubeAccessToken",
  "plexToken",
  "plexClientId",
  "plexServerUri",
  "plexServerToken",
  "plexServerName",
] as const;

type PairSettings = Partial<Record<(typeof SETTING_KEYS)[number], string>>;

type Room = {
  id: string;
  createdAt: number;
  settings: PairSettings | null;
};

const rooms = new Map<string, Room>();

function purge() {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > TTL_MS) rooms.delete(id);
  }
}

function pairCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export function pickPairSettings(input: Record<string, unknown>): PairSettings {
  const next: PairSettings = {};
  for (const key of SETTING_KEYS) {
    const value = input[key];
    if (typeof value === "string") next[key] = value;
  }
  return next;
}

export const pairRoutes = new Elysia({ prefix: "/api/pair" })
  .post("/", () => {
    purge();
    let id = pairCode();
    while (rooms.has(id)) id = pairCode();
    rooms.set(id, { id, createdAt: Date.now(), settings: null });
    return { id, expiresAt: Date.now() + TTL_MS };
  })
  .get("/:id", ({ params, set }) => {
    purge();
    const room = rooms.get(params.id.toUpperCase());
    if (!room) {
      set.status = 404;
      return { error: "PAIR_NOT_FOUND" };
    }
    return {
      id: room.id,
      ready: Boolean(room.settings),
      settings: room.settings,
      expiresAt: room.createdAt + TTL_MS,
    };
  })
  .put(
    "/:id",
    ({ params, body, set }) => {
      purge();
      const room = rooms.get(params.id.toUpperCase());
      if (!room) {
        set.status = 404;
        return { error: "PAIR_NOT_FOUND" };
      }
      room.settings = pickPairSettings(body as Record<string, unknown>);
      return { ok: true };
    },
    {
      body: t.Record(t.String(), t.Any()),
    }
  )
  .delete("/:id", ({ params, set }) => {
    const id = params.id.toUpperCase();
    if (!rooms.has(id)) {
      set.status = 404;
      return { error: "PAIR_NOT_FOUND" };
    }
    rooms.delete(id);
    return { ok: true };
  });
