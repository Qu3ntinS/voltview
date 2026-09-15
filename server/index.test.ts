import { describe, expect, test } from "bun:test";
import { app } from "./index";

describe("VoltView API", () => {
  test("health reports ok", async () => {
    const res = await app.handle(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.name).toBe("voltview");
  });

  test("youtube trending without key returns a clear error", async () => {
    const res = await app.handle(new Request("http://localhost/api/youtube/trending"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("NO_YOUTUBE_KEY");
  });

  test("plex resources without token are rejected", async () => {
    const res = await app.handle(new Request("http://localhost/api/plex/resources"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("NO_PLEX_TOKEN");
  });

  test("youtube stream rejects bad ids", async () => {
    const res = await app.handle(new Request("http://localhost/api/youtube/stream?id=nope"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("BAD_VIDEO_ID");
  });

  test("youtube liked feed requires Google login", async () => {
    const res = await app.handle(new Request("http://localhost/api/youtube/liked"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("NO_YOUTUBE_LOGIN");
  });

  test("pair room accepts phone settings and is consumed", async () => {
    const created = await app.handle(new Request("http://localhost/api/pair", { method: "POST" }));
    expect(created.status).toBe(200);
    const room = (await created.json()) as { id: string };
    expect(room.id).toMatch(/^[A-Z2-9]{4}$/);

    const empty = await app.handle(new Request(`http://localhost/api/pair/${room.id}`));
    expect((await empty.json()).ready).toBe(false);

    const sent = await app.handle(
      new Request(`http://localhost/api/pair/${room.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ youtubeApiKey: "AIza-from-phone", extra: "drop" }),
      })
    );
    expect(sent.status).toBe(200);

    const ready = await app.handle(new Request(`http://localhost/api/pair/${room.id}`));
    const payload = await ready.json();
    expect(payload.ready).toBe(true);
    expect(payload.settings.youtubeApiKey).toBe("AIza-from-phone");
    expect(payload.settings.extra).toBeUndefined();

    const gone = await app.handle(new Request(`http://localhost/api/pair/${room.id}`, { method: "DELETE" }));
    expect(gone.status).toBe(200);
    const missing = await app.handle(new Request(`http://localhost/api/pair/${room.id}`));
    expect(missing.status).toBe(404);
  });

  test("watch sessions start and accept heartbeats", async () => {
    const created = await app.handle(
      new Request("http://localhost/api/watch/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceId: "test-device",
          source: "youtube",
          contentId: "abc",
          title: "Test",
        }),
      })
    );
    expect(created.status).toBe(200);
    const session = await created.json();
    expect(session.id).toStartWith("sess_");

    const beat = await app.handle(
      new Request(`http://localhost/api/watch/session/${session.id}/heartbeat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ positionSec: 12, durationSec: 120, playing: true }),
      })
    );
    expect(beat.status).toBe(200);
    const stats = await (await app.handle(new Request("http://localhost/api/watch/stats"))).json();
    expect(stats.sessions).toBeGreaterThan(0);
  });
});
