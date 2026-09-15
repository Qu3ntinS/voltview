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

  test("youtube liked feed requires Google login", async () => {
    const res = await app.handle(new Request("http://localhost/api/youtube/liked"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("NO_YOUTUBE_LOGIN");
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
