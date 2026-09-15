import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { applySeoToHtml, buildSitemapXml, publicSitemapPaths } from "../src/lib/seo";

const dist = resolve("dist");
const template = readFileSync(resolve(dist, "index.html"), "utf8");

for (const path of publicSitemapPaths) {
  const html = applySeoToHtml(template, path);
  const file = path === "/" ? resolve(dist, "index.html") : resolve(dist, path.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

writeFileSync(resolve(dist, "404.html"), applySeoToHtml(template, "/__404"));
writeFileSync(resolve(dist, "sitemap.xml"), buildSitemapXml());

console.log(`SEO shells: ${publicSitemapPaths.length} routes + 404 + sitemap`);
