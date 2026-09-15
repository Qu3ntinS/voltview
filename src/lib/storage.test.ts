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

  test("swaps an AIza key pasted into the client id field", () => {
    const next = normalizeSettings({
      ...defaultSettings,
      youtubeApiKey: "",
      youtubeClientId: "AIzaSyTestkeyxxxxxxxxxxxxxxxx",
    });
    expect(next.youtubeApiKey).toBe("AIzaSyTestkeyxxxxxxxxxxxxxxxx");
    expect(next.youtubeClientId).toBe("");
  });
});
