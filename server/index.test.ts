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
});
