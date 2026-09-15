import { describe, expect, test } from "bun:test";
import { formatDuration, formatViews } from "./format";

describe("format helpers", () => {
  test("parses ISO durations", () => {
    expect(formatDuration("PT1H2M3S")).toBe("1:02:03");
    expect(formatDuration("PT15M5S")).toBe("15:05");
  });

  test("formats view counts in German short form", () => {
    expect(formatViews("1500")).toBe("2 Tsd.");
    expect(formatViews("2500000")).toBe("2.5 Mio.");
  });
});
