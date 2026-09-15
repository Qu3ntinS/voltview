import { describe, expect, test } from "bun:test";
import { decodeImportHash, encodeImportHash } from "./pair";
import { pickPairSettings } from "../../server/pair";

describe("pair settings", () => {
  test("keeps known string fields only", () => {
    const picked = pickPairSettings({
      youtubeApiKey: "AIza123",
      youtubeRegion: "DE",
      plexToken: "tok",
      extra: "nope",
    });
    expect(picked.youtubeApiKey).toBe("AIza123");
    expect(picked.plexToken).toBe("tok");
    expect((picked as { extra?: string }).extra).toBeUndefined();
  });

  test("import hash roundtrips", () => {
    const hash = encodeImportHash({ youtubeApiKey: "AIza-test", youtubeRegion: "AT" });
    const decoded = decodeImportHash(`#${hash}`);
    expect(decoded?.youtubeApiKey).toBe("AIza-test");
    expect(decoded?.youtubeRegion).toBe("AT");
  });
});
