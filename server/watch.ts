import { Elysia, t } from "elysia";

export type WatchSession = {
  id: string;
  deviceId: string;
  source: string;
  contentId: string;
  title: string;
  startedAt: number;
  updatedAt: number;
  endedAt: number | null;
  positionSec: number;
  durationSec: number;
  watchedSec: number;
  playing: boolean;
};

const sessions = new Map<string, WatchSession>();

function sessionId() {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function watchStats() {
  const list = [...sessions.values()];
  return {
    sessions: list.length,
    watchedSec: Math.round(list.reduce((sum, item) => sum + item.watchedSec, 0)),
    bySource: list.reduce<Record<string, number>>((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + item.watchedSec;
      return acc;
    }, {}),
  };
}

export function allSessions() {
  return [...sessions.values()].sort((a, b) => b.startedAt - a.startedAt);
}

export const watchRoutes = new Elysia({ prefix: "/api/watch" })
  .post(
    "/session",
    ({ body }) => {
      const now = Date.now();
      const session: WatchSession = {
        id: sessionId(),
        deviceId: body.deviceId || "unknown",
        source: body.source,
        contentId: body.contentId,
        title: body.title,
        startedAt: now,
        updatedAt: now,
        endedAt: null,
        positionSec: 0,
        durationSec: 0,
        watchedSec: 0,
        playing: true,
      };
      sessions.set(session.id, session);
      return session;
    },
    {
      body: t.Object({
        deviceId: t.String(),
        source: t.String(),
        contentId: t.String(),
        title: t.String(),
      }),
    }
  )
  .post(
    "/session/:id/heartbeat",
    ({ params, body, set }) => {
      const session = sessions.get(params.id);
      if (!session) {
        set.status = 404;
        return { error: "Unknown session" };
      }
      const now = Date.now();
      if (body.playing) {
        const delta = Math.min(30, Math.max(0, (now - session.updatedAt) / 1000));
        session.watchedSec += delta;
      }
      session.positionSec = body.positionSec;
      session.durationSec = body.durationSec;
      session.playing = body.playing;
      session.updatedAt = now;
      sessions.set(session.id, session);
      return session;
    },
    {
      body: t.Object({
        positionSec: t.Number(),
        durationSec: t.Number(),
        playing: t.Boolean(),
      }),
    }
  )
  .post("/session/:id/end", ({ params, set }) => {
    const session = sessions.get(params.id);
    if (!session) {
      set.status = 404;
      return { error: "Unknown session" };
    }
    session.playing = false;
    session.endedAt = Date.now();
    session.updatedAt = session.endedAt;
    sessions.set(session.id, session);
    return session;
  })
  .get("/stats", () => watchStats())
  .get("/sessions", () => ({ items: allSessions().slice(0, 50) }));
