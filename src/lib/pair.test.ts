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

  test("falls back to jsonblob when /api/health is the SPA", async () => {
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/health")) {
        return new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } });
      }
      if (url.includes("jsonblob.com") && (init?.method || "GET") === "POST") {
        return new Response("{}", {
          status: 201,
          headers: { Location: "https://jsonblob.com/api/jsonBlob/11111111-2222-3333-4444-555555555555" },
        });
      }
      return new Response("no", { status: 404 });
    });
    const room = await pair.create();
    expect(room.id).toBe("11111111-2222-3333-4444-555555555555");
    expect(room.addUrl).toContain("r=11111111-2222-3333-4444-555555555555");
  });

  test("uses native pair when health is VoltView JSON", async () => {
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
});
