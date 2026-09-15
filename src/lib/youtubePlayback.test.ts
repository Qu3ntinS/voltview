import { describe, expect, test } from "bun:test";
import { canCallInnertube, friendlyPlaybackError, pickPlayback, sanitizeVideoId } from "./youtubePlayback";

describe("youtube playback", () => {
  test("rejects bad ids", () => {
    expect(() => sanitizeVideoId("")).toThrow("BAD_VIDEO_ID");
    expect(() => sanitizeVideoId("https://youtube.com")).toThrow("BAD_VIDEO_ID");
    expect(sanitizeVideoId("jNQXAC9IVRw")).toBe("jNQXAC9IVRw");
  });

  test("prefers muxed mp4 over hls", () => {
    const source = pickPlayback({
      playabilityStatus: { status: "OK" },
      streamingData: {
        hlsManifestUrl: "https://example.com/master.m3u8",
        formats: [
          {
            url: "https://example.com/low.mp4",
            mimeType: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"',
            height: 360,
            qualityLabel: "360p",
          },
          {
            url: "https://example.com/high.mp4",
            mimeType: 'video/mp4; codecs="avc1.64001F, mp4a.40.2"',
            height: 720,
            qualityLabel: "720p",
          },
        ],
      },
    });
    expect(source.kind).toBe("progressive");
    expect(source.quality).toBe("720p");
    expect(source.url).toContain("high.mp4");
  });

  test("falls back to hls when no muxed mp4 exists", () => {
    const source = pickPlayback({
      streamingData: { hlsManifestUrl: "https://example.com/master.m3u8", formats: [] },
    });
    expect(source.kind).toBe("hls");
    expect(source.url).toContain("master.m3u8");
  });

  test("surfaces login walls", () => {
    expect(() =>
      pickPlayback({ playabilityStatus: { status: "LOGIN_REQUIRED", reason: "Sign in" } }),
    ).toThrow("Sign in");
  });

  test("innertube stays off in the browser tab", () => {
    expect(canCallInnertube()).toBe(typeof window === "undefined");
  });

  test("maps extractor codes to a Tesla-facing message", () => {
    expect(friendlyPlaybackError("INVIDIOUS_FAILED")).toContain("YouTube-IFrame");
    expect(friendlyPlaybackError("LOGIN_REQUIRED")).toContain("Bot-Check");
  });
});
