import { describe, expect, test } from "bun:test";
import { services } from "../data/services";
import { applySeoToHtml, buildSitemapXml, publicSitemapPaths, resolveSeo } from "./seo";

describe("SEO resolver", () => {
  test("home uses the brand title", () => {
    const seo = resolveSeo("/");
    expect(seo.title).toContain("VoltView");
    expect(seo.robots).toContain("index");
    expect(seo.canonical).toBe("https://qu3ntins.github.io/voltview/");
  });

  test("Disney launch page is unique and indexable", () => {
    const seo = resolveSeo("/apps/disney");
    expect(seo.title).toContain("Disney+");
    expect(seo.description).toContain("Disney+");
    expect(seo.canonical).toBe("https://qu3ntins.github.io/voltview/apps/disney");
    expect(seo.robots).toContain("index");
  });

  test("every official app has a unique indexable title", () => {
    const titles = new Set<string>();
    for (const service of services) {
      const seo = resolveSeo(`/apps/${service.id}`);
      expect(seo.title).toContain(service.name);
      expect(seo.robots).toContain("index");
      titles.add(seo.title);
    }
    expect(titles.size).toBe(services.length);
  });

  test("add page stays noindex", () => {
    expect(resolveSeo("/add").robots).toContain("noindex");
  });

  test("watch pages stay noindex", () => {
    const seo = resolveSeo("/watch/yt/abc");
    expect(seo.robots).toContain("noindex");
  });

  test("personal Plex libraries stay noindex", () => {
    expect(resolveSeo("/plex/library/1").robots).toContain("noindex");
    expect(resolveSeo("/plex/item/99").robots).toContain("noindex");
  });

  test("unknown routes are a noindex 404", () => {
    const seo = resolveSeo("/does-not-exist");
    expect(seo.title).toContain("nicht gefunden");
    expect(seo.robots).toContain("noindex");
  });

  test("breadcrumbs use readable YouTube label", () => {
    const seo = resolveSeo("/youtube");
    const crumbs = (seo.jsonLd["@graph"] as { itemListElement?: { name: string }[] }[]).find(
      (node) => Array.isArray(node.itemListElement),
    );
    expect(crumbs?.itemListElement?.some((item) => item.name === "YouTube")).toBe(true);
  });

  test("apps page includes ItemList of services", () => {
    const seo = resolveSeo("/apps");
    const list = (seo.jsonLd["@graph"] as { "@type"?: string; numberOfItems?: number }[]).find(
      (node) => node["@type"] === "ItemList",
    );
    expect(list?.numberOfItems).toBe(services.length);
  });
});

describe("SEO static shells", () => {
  test("sitemap lists every public service", () => {
    const xml = buildSitemapXml("2026-09-15");
    expect(xml).toContain("https://qu3ntins.github.io/voltview/");
    expect(xml).toContain("/apps/youtube-tv");
    expect(xml).toContain("/apps/joyn");
    expect(xml).toContain("<lastmod>2026-09-15</lastmod>");
    expect(publicSitemapPaths.length).toBe(6 + services.length);
  });

  test("applySeoToHtml rewrites title and canonical", () => {
    const html = `<html><head>
      <title>VoltView</title>
      <meta name="description" content="old" />
      <meta name="robots" content="index,follow" />
      <meta name="googlebot" content="index,follow" />
      <link rel="canonical" href="https://qu3ntins.github.io/voltview/" />
      <meta property="og:title" content="old" />
      <meta property="og:description" content="old" />
      <meta property="og:url" content="old" />
      <meta property="og:type" content="website" />
      <meta property="og:image:alt" content="old" />
      <meta name="twitter:title" content="old" />
      <meta name="twitter:description" content="old" />
      <meta name="twitter:image:alt" content="old" />
      <script type="application/ld+json" id="voltview-jsonld">{}</script>
    </head></html>`;
    const out = applySeoToHtml(html, "/apps/netflix");
    expect(out).toContain("<title>Netflix · VoltView</title>");
    expect(out).toContain('href="https://qu3ntins.github.io/voltview/apps/netflix"');
    expect(out).toContain("Netflix");
  });
});
