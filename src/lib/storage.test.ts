import { describe, expect, test } from "bun:test";
import { defaultSettings, normalizeSettings } from "./storage";

describe("settings normalize", () => {
  test("swaps an OAuth client id pasted into the API key field", () => {
    const next = normalizeSettings({
      ...defaultSettings,
      youtubeApiKey: "123.apps.googleusercontent.com",
      youtubeClientId: "",
    });
    expect(next.youtubeApiKey).toBe("");
    expect(next.youtubeClientId).toBe("123.apps.googleusercontent.com");
  });

  test("never keeps a YouTube API key in the browser", () => {
    const next = normalizeSettings({
      ...defaultSettings,
      youtubeApiKey: "AIzaSyTestkeyxxxxxxxxxxxxxxxx",
      youtubeClientId: "AIzaSyTestkeyxxxxxxxxxxxxxxxx",
    });
    expect(next.youtubeApiKey).toBe("");
    expect(next.youtubeClientId).toBe("");
  });
});
