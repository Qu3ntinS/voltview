import { describe, expect, test } from "bun:test";
import { canUseNativeHls, localPlaybackOverride, mediaDuration } from "./playerMedia";

function fakeVideo(duration: number, seekableEnd?: number) {
  return {
    duration,
    seekable: {
      length: seekableEnd === undefined ? 0 : 1,
      end: () => seekableEnd ?? 0,
    },
  };
}

describe("mediaDuration", () => {
  test("uses a finite duration first", () => {
    expect(mediaDuration(fakeVideo(125.4, 10))).toBe(125.4);
  });

  test("falls back to the seekable range when HLS reports Infinity", () => {
    expect(mediaDuration(fakeVideo(Number.POSITIVE_INFINITY, 214))).toBe(214);
    expect(mediaDuration(fakeVideo(Number.NaN, 90))).toBe(90);
  });

  test("returns 0 when nothing is seekable yet", () => {
    expect(mediaDuration(fakeVideo(Number.NaN))).toBe(0);
    expect(mediaDuration(fakeVideo(0))).toBe(0);
  });
});

describe("canUseNativeHls", () => {
  test("is false when the element cannot play HLS", () => {
    expect(canUseNativeHls({ canPlayType: () => "" })).toBe(false);
    expect(canUseNativeHls({ canPlayType: () => "maybe" })).toBe(true);
  });
});

describe("localPlaybackOverride", () => {
  test("only accepts same-origin media on localhost", () => {
    expect(localPlaybackOverride("https://voltview-red.vercel.app/watch/yt/abc?src=/clip.mp4")).toBeNull();
    expect(localPlaybackOverride("http://127.0.0.1:4200/watch/yt/abc?src=https://evil.test/x.mp4")).toBeNull();
    expect(localPlaybackOverride("http://127.0.0.1:4200/watch/yt/abc?src=/player-fixture.mp4")?.url).toBe(
      "http://127.0.0.1:4200/player-fixture.mp4",
    );
  });
});
