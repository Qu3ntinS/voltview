import { describe, expect, test } from "bun:test";
import { isJsonBlobId, parseMailboxMessage, pairTopic, sanitizePairId } from "../../api/_lib/pairMailbox";

describe("pair mailbox", () => {
  test("rejects short or dirty room ids", () => {
    expect(() => sanitizePairId("ab")).toThrow("BAD_PAIR_ID");
    expect(() => sanitizePairId("bad id!!")).toThrow("BAD_PAIR_ID");
    expect(sanitizePairId("K7Q9M2X4P1AB")).toBe("K7Q9M2X4P1AB");
  });

  test("reads the latest ntfy message as settings", () => {
    const raw = [
      JSON.stringify({ event: "open" }),
      JSON.stringify({ event: "message", message: JSON.stringify({ settings: { youtubeAccessToken: "ya29.a" } }) }),
      JSON.stringify({ event: "message", message: JSON.stringify({ settings: { youtubeAccessToken: "ya29.b", plexToken: "t" } }) }),
    ].join("\n");
    const parsed = parseMailboxMessage(raw);
    expect(parsed.ready).toBe(true);
    expect(parsed.settings?.youtubeAccessToken).toBe("ya29.b");
    expect(parsed.settings?.plexToken).toBe("t");
  });

  test("empty mailbox is not ready", () => {
    expect(parseMailboxMessage("")).toEqual({ ready: false, settings: null });
  });

  test("topics stay on ntfy-safe names", () => {
    expect(pairTopic("K7Q9M2X4P1AB")).toBe("voltview-pair-K7Q9M2X4P1AB");
  });

  test("only real jsonblob uuids take the blob path", () => {
    expect(isJsonBlobId("K7Q9M2X4P1AB")).toBe(false);
    expect(isJsonBlobId("11111111-2222-3333-4444-555555555555")).toBe(true);
  });
});
