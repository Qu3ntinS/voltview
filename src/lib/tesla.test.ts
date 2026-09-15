import { describe, expect, test } from "bun:test";
import { teslaRedirectUrl } from "./tesla";

describe("Tesla YouTube redirect", () => {
  test("wraps the target in youtube.com/redirect", () => {
    const url = teslaRedirectUrl("https://www.netflix.com");
    expect(url).toBe("https://www.youtube.com/redirect?q=https%3A%2F%2Fwww.netflix.com");
  });
});
