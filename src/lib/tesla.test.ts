import { describe, expect, test } from "bun:test";
import {
  hasTeslaUnlockFlag,
  isTeslaBrowser,
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
});
