import { describe, expect, test } from "bun:test";
import {
  canCallInnertube,
  deviceProgressiveCandidates,
  embedCandidates,
  friendlyPlaybackError,
  pickPlayback,
  playbackCandidates,
  preferredProgressiveItags,
  sanitizeVideoId,
  youtubeFileUrl,
  youtubeMediaHost,
  youtubeOfficialEmbed,
} from "./youtubePlayback";

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

  test("maps extractor codes to short errors", () => {
    expect(friendlyPlaybackError("INVIDIOUS_FAILED")).toBe("Kein Stream.");
    expect(friendlyPlaybackError("LOGIN_REQUIRED")).toBe("Stream blockiert.");
  });

  test("builds adaptive HLS first, then connection-aware mp4", () => {
    const list = playbackCandidates("jNQXAC9IVRw");
    expect(list[0]?.kind).toBe("hls");
    expect(list[0]?.url).toContain("/api/manifest/hls_playlist/jNQXAC9IVRw");
    expect(list.slice(0, 6).some((item) => item.kind === "progressive")).toBe(true);
    expect(list.some((item) => item.url.includes("itag=22"))).toBe(true);
    expect(list.some((item) => item.url.includes("itag=18"))).toBe(true);
    expect(preferredProgressiveItags().map((item) => item.itag)).toContain(18);
  });

  test("can skip HLS so Tesla only tries mp4", () => {
    const list = playbackCandidates("jNQXAC9IVRw", { hls: false });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((item) => item.kind === "progressive")).toBe(true);
    expect(list[0]?.url).toContain("latest_version");
    expect(youtubeFileUrl("jNQXAC9IVRw", 18)).toBe("/api/youtube/file?id=jNQXAC9IVRw&itag=18");
    expect(youtubeMediaHost("invidious.tiekoetter.com")).toBe(true);
    expect(youtubeMediaHost("eu-de1.companion.invidious.tiekoetter.com")).toBe(true);
    expect(youtubeMediaHost("rr2.sn-abc.googlevideo.com")).toBe(true);
    expect(youtubeMediaHost("evil.test")).toBe(false);
  });

  test("prefers an iframe-friendly Invidious embed over youtube.com", () => {
    const list = embedCandidates("jNQXAC9IVRw");
    expect(list[0]).toContain("invidious.tiekoetter.com/embed/jNQXAC9IVRw");
    expect(list.every((url) => !/youtube\.com|youtube-nocookie|nerdvpn/.test(url))).toBe(true);
  });

  test("builds a phone YouTube embed when HTML5 streams fail", () => {
    expect(youtubeOfficialEmbed("jNQXAC9IVRw")).toContain("youtube-nocookie.com/embed/jNQXAC9IVRw");
  });

  test("gives the device Invidious MP4s that 302 to googlevideo on its own IP", () => {
    const list = deviceProgressiveCandidates("jNQXAC9IVRw", 4);
    expect(list.length).toBe(4);
    expect(list.every((item) => item.kind === "progressive")).toBe(true);
    expect(list.every((item) => item.url.includes("latest_version"))).toBe(true);
    expect(list[0]?.url).toContain("itag=18");
    expect(list[0]?.url.includes("local=true")).toBe(false);
    expect(list.some((item) => item.url.includes("invidious.tiekoetter.com"))).toBe(true);
  });
});
