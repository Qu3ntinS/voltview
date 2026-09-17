import { describe, expect, test } from "bun:test";
import {
  canPlayHtml5Video,
  ensureTeslaWatchUnlock,
  hasTeslaUnlockFlag,
  isTeslaBrowser,
  isWatchPath,
  pageHasTeslaFlag,
  teslaPlaybackMode,
  teslaRedirectUrl,
  withTeslaUnlockFlag,
} from "./tesla";

describe("Tesla YouTube redirect", () => {
  test("wraps the target in youtube.com/redirect", () => {
    const url = teslaRedirectUrl("https://www.netflix.com");
    expect(url).toBe("https://www.youtube.com/redirect?q=https%3A%2F%2Fwww.netflix.com");
  });

  test("detects Tesla user agents", () => {
    expect(isTeslaBrowser("Mozilla/5.0 (X11; GNU; Linux) AppleWebKit/601.1 Tesla/2025.8")).toBe(true);
    expect(isTeslaBrowser("Mozilla/5.0 QtCarBrowser")).toBe(true);
    expect(isTeslaBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120")).toBe(false);
  });

  test("marks and recognizes the unlock flag", () => {
    const flagged = withTeslaUnlockFlag("https://voltview.vercel.app/watch/yt/abc");
    expect(flagged).toContain("tesla=1");
    expect(hasTeslaUnlockFlag(flagged, "")).toBe(true);
    expect(hasTeslaUnlockFlag("https://voltview.vercel.app/", "https://www.youtube.com/")).toBe(true);
    expect(hasTeslaUnlockFlag("https://voltview.vercel.app/", "")).toBe(false);
  });

  test("HTML5 video is Tesla-only outside localhost", () => {
    expect(canPlayHtml5Video("Mozilla/5.0 (X11; GNU; Linux) AppleWebKit/601.1 Tesla/2025.8", "voltview-red.vercel.app")).toBe(
      true,
    );
    expect(canPlayHtml5Video("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)", "voltview-red.vercel.app")).toBe(
      false,
    );
    expect(canPlayHtml5Video("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)", "localhost")).toBe(true);
    expect(isWatchPath("/watch/yt/abc")).toBe(true);
    expect(isWatchPath("/youtube")).toBe(false);
  });

  test("phone production is a notice, Tesla hops when tesla=1 is missing", () => {
    const tesla = "Mozilla/5.0 (X11; GNU; Linux) AppleWebKit/601.1 Tesla/2025.8";
    const phone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)";
    expect(teslaPlaybackMode(phone, "voltview-red.vercel.app", "https://voltview-red.vercel.app/watch/yt/abc")).toBe(
      "notice",
    );
    expect(teslaPlaybackMode(tesla, "voltview-red.vercel.app", "https://voltview-red.vercel.app/watch/yt/abc")).toBe("hop");
    expect(
      teslaPlaybackMode(tesla, "voltview-red.vercel.app", "https://voltview-red.vercel.app/watch/yt/abc?tesla=1"),
    ).toBe("play");

    const hops: string[] = [];
    expect(ensureTeslaWatchUnlock(phone, "https://voltview-red.vercel.app/watch/yt/abc", (url) => hops.push(url))).toBe(
      false,
    );
    expect(hops).toEqual([]);
    expect(ensureTeslaWatchUnlock(tesla, "https://voltview-red.vercel.app/watch/yt/abc", (url) => hops.push(url))).toBe(
      true,
    );
    expect(hops[0]).toContain("youtube.com/redirect");
    expect(hops[0]).toContain("tesla%3D1");
    hops.length = 0;
    expect(
      ensureTeslaWatchUnlock(tesla, "https://voltview-red.vercel.app/watch/yt/abc?tesla=1", (url) => hops.push(url)),
    ).toBe(false);
    expect(hops).toEqual([]);
    expect(pageHasTeslaFlag("https://voltview-red.vercel.app/watch/yt/abc")).toBe(false);
    expect(pageHasTeslaFlag("https://voltview-red.vercel.app/watch/yt/abc?tesla=1")).toBe(true);
    expect(hasTeslaUnlockFlag("https://voltview-red.vercel.app/watch/yt/abc", "https://www.youtube.com/")).toBe(true);
  });
});
