import { Elysia, t } from "elysia";
import { PAIR_TTL_MS, pairCode, pickPairSettings, type PairSettings } from "../api/_lib/pairMailbox";

export { pickPairSettings };

type Room = {
  id: string;
  createdAt: number;
  settings: PairSettings | null;
};

const rooms = new Map<string, Room>();

function purge() {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > PAIR_TTL_MS) rooms.delete(id);
  }
}

export const pairRoutes = new Elysia({ prefix: "/api/pair" })
  .post("/", () => {
    purge();
    let id = pairCode();
    while (rooms.has(id)) id = pairCode();
    rooms.set(id, { id, createdAt: Date.now(), settings: null });
    return { id, expiresAt: Date.now() + PAIR_TTL_MS };
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
      expiresAt: room.createdAt + PAIR_TTL_MS,
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
