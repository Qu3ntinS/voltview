import { describe, expect, test } from "bun:test";
import {
  capRange,
  isAllowedMediaUrl,
  mediaHostAllowlist,
  parseByteRange,
  playableRange,
} from "../../api/_lib/mediaProxy";

describe("media range proxy", () => {
  test("caps open and oversized ranges to the hobby chunk", () => {
    expect(capRange(undefined)).toBe("bytes=0-3499999");
    expect(capRange("bytes=0-")).toBe("bytes=0-3499999");
    expect(capRange("bytes=8000-")).toBe("bytes=8000-3507999");
    expect(capRange("bytes=100-199")).toBe("bytes=100-199");
    expect(capRange("bytes=0-999999999")).toBe("bytes=0-3499999");
  });

  test("parses a capped range", () => {
    expect(parseByteRange("bytes=8000-3507999")).toEqual({ start: 8000, end: 3507999 });
  });

  test("expands tiny probes so Plex start.mp4 still looks like media", () => {
    expect(playableRange("bytes=0-1")).toBe("bytes=0-3499999");
    expect(playableRange("bytes=100-199")).toBe("bytes=100-3500099");
    expect(playableRange("bytes=0-3499999")).toBe("bytes=0-3499999");
  });

  test("only allows known media hosts", () => {
    expect(isAllowedMediaUrl("https://invidious.tiekoetter.com/latest_version?id=a")).toBe(false);
    expect(isAllowedMediaUrl("https://rr1.googlevideo.com/videoplayback")).toBe(true);
    expect(isAllowedMediaUrl("https://evil.test/x")).toBe(false);
    const allow = mediaHostAllowlist(["https://invidious.tiekoetter.com"]);
    expect(isAllowedMediaUrl("https://invidious.tiekoetter.com/latest_version?id=a", allow)).toBe(true);
  });
});
