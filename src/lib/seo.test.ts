import { describe, expect, test } from "bun:test";
import { resolveSeo } from "./seo";

describe("SEO resolver", () => {
  test("home uses the brand title", () => {
    const seo = resolveSeo("/");
    expect(seo.title).toContain("VoltView");
    expect(seo.robots).toBe("index,follow");
    expect(seo.canonical).toBe("https://qu3ntins.github.io/voltview/");
  });

  test("Disney launch page is unique and indexable", () => {
    const seo = resolveSeo("/apps/disney");
    expect(seo.title).toContain("Disney+");
    expect(seo.description).toContain("Disney+");
    expect(seo.canonical).toBe("https://qu3ntins.github.io/voltview/apps/disney");
  });

  test("watch pages stay noindex", () => {
    const seo = resolveSeo("/watch/yt/abc");
    expect(seo.robots).toBe("noindex,nofollow");
  });
});
