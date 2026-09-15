import { afterEach, describe, expect, test } from "bun:test";
import { decodeImportHash, encodeImportHash, nativePairAvailable, pair } from "./pair";
import { pickPairSettings } from "../../server/pair";

const realFetch = globalThis.fetch;

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = impl as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("pair settings", () => {
  test("keeps known string fields only", () => {
    const picked = pickPairSettings({
      youtubeApiKey: "AIza123",
      youtubeRegion: "DE",
      youtubeAccessToken: "ya29.tok",
      plexToken: "tok",
      extra: "nope",
    });
    expect("youtubeApiKey" in picked).toBe(false);
    expect(picked.youtubeAccessToken).toBe("ya29.tok");
    expect(picked.plexToken).toBe("tok");
    expect((picked as { extra?: string }).extra).toBeUndefined();
  });

  test("import hash roundtrips without the API key", () => {
    const hash = encodeImportHash({ youtubeAccessToken: "ya29.tok", youtubeRegion: "AT" });
    const decoded = decodeImportHash(`#${hash}`);
    expect(decoded?.youtubeAccessToken).toBe("ya29.tok");
    expect(decoded?.youtubeRegion).toBe("AT");
    expect(decoded?.youtubeApiKey).toBeUndefined();
  });

  test("HTML health on Vercel is not the native pair API", async () => {
    mockFetch(async () =>
      new Response("<!doctype html><title>VoltView</title>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
    expect(await nativePairAvailable()).toBe(false);
  });

  test("creates a local mailbox room when /api/pair is missing", async () => {
    mockFetch(async () => new Response("no", { status: 404 }));
    const room = await pair.create();
    expect(room.id).toMatch(/^[A-Z2-9]{12}$/);
    expect(room.addUrl).toContain(`r=${room.id}`);
  });

  test("uses native pair when POST /api/pair returns an id", async () => {
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/health") || url.includes("/api/health")) {
        return Response.json({ ok: true, name: "voltview" });
      }
      if (url.endsWith("/api/pair") && (init?.method || "GET") === "POST") {
        return Response.json({ id: "K797" });
      }
      return new Response("no", { status: 404 });
    });
    const room = await pair.create();
    expect(room.id).toBe("K797");
  });

  test("submits through ntfy when /api/pair is missing", async () => {
    const posts: string[] = [];
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.includes("ntfy.sh") && (init?.method || "GET") === "POST") {
        posts.push(await new Request(url, init).text());
        return new Response("{}", { status: 200 });
      }
      return new Response("no", { status: 404 });
    });
    await pair.submit("K7Q9M2X4P1AB", { youtubeAccessToken: "ya29.from-phone" });
    expect(posts[0]).toContain("ya29.from-phone");
  });
});
