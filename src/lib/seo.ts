import { featuredServiceIds, getService, services } from "../data/services";

function resolveSiteUrl() {
  const fromProcess =
    typeof process !== "undefined" && process.env
      ? process.env.VITE_SITE_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "")
      : "";
  const fromVite = import.meta.env?.VITE_SITE_URL || "";
  return (fromProcess || fromVite || "https://qu3ntins.github.io/voltview").replace(/\/$/, "");
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "VoltView";
export const DEFAULT_TITLE = "VoltView";
export const DEFAULT_DESCRIPTION =
  "YouTube, Plex, Radio und offizielle Apps wie Netflix und Disney+ im Tesla-Browser.";
export const OG_IMAGE = `${SITE_URL}/og.png`;
export const OG_IMAGE_ALT = "VoltView";

export type SeoPage = {
  title: string;
  description: string;
  robots: string;
  type: "website" | "video.other";
};

const INDEXABLE = "index,follow,max-image-preview:large";
const NOINDEX = "noindex,nofollow";

const pages: Record<string, SeoPage> = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    robots: INDEXABLE,
    type: "website",
  },
  "/apps": {
    title: "Streaming-Apps · VoltView",
    description: "Netflix, Disney+, Prime Video und weitere offizielle Apps in VoltView öffnen.",
    robots: INDEXABLE,
    type: "website",
  },
  "/youtube": {
    title: "YouTube · VoltView",
    description: "YouTube im VoltView-Player. Google-Login für Abos und Likes.",
    robots: INDEXABLE,
    type: "website",
  },
  "/plex": {
    title: "Plex · VoltView",
    description: "Eigene Plex-Mediathek: Libraries, Weiterschauen, HLS.",
    robots: INDEXABLE,
    type: "website",
  },
  "/radio": {
    title: "Radio · VoltView",
    description: "Internetradio aus dem Radio-Browser-Verzeichnis.",
    robots: INDEXABLE,
    type: "website",
  },
  "/games": {
    title: "Games · VoltView",
    description: "Kurze Pausen-Spiele für Ladestops.",
    robots: INDEXABLE,
    type: "website",
  },
  "/settings": {
    title: "Setup · VoltView",
    description: "YouTube, Google und Plex per QR vom Handy auf den Tesla legen.",
    robots: NOINDEX,
    type: "website",
  },
  "/add": {
    title: "Handy-Setup · VoltView",
    description: "Setup vom Handy an den Tesla senden.",
    robots: NOINDEX,
    type: "website",
  },
  "/search": {
    title: "Suche · VoltView",
    description: "YouTube, Plex und Radio in VoltView durchsuchen.",
    robots: "noindex,follow",
    type: "website",
  },
};

const crumbNames: Record<string, string> = {
  apps: "Apps",
  youtube: "YouTube",
  plex: "Plex",
  radio: "Radio",
  games: "Games",
  settings: "Setup",
  add: "Handy",
  search: "Suche",
  watch: "Player",
  library: "Bibliothek",
  item: "Titel",
  yt: "YouTube",
};

export const publicSitemapPaths = [
  "/",
  "/apps",
  "/youtube",
  "/plex",
  "/radio",
  "/games",
  ...services.map((service) => `/apps/${service.id}`),
];

export function sitemapPriority(path: string): string {
  if (path === "/") return "1.0";
  if (path === "/apps" || path === "/youtube") return "0.9";
  if (featuredServiceIds.some((id) => path === `/apps/${id}`)) return "0.8";
  if (path.startsWith("/apps/")) return "0.65";
  if (path === "/games") return "0.4";
  return "0.6";
}

export function resolveSeo(pathname: string): SeoPage & { canonical: string; jsonLd: Record<string, unknown> } {
  const path = pathname || "/";
  let page = pages[path];

  const appMatch = path.match(/^\/apps\/([^/]+)$/);
  if (appMatch) {
    const service = getService(appMatch[1]);
    if (service) {
      page = {
        title: `${service.name} · VoltView`,
        description: `${service.name} in VoltView öffnen: ${service.blurb}.`,
        robots: INDEXABLE,
        type: "website",
      };
    } else {
      page = {
        title: "App nicht gefunden · VoltView",
        description: "Dieser Streaming-Dienst ist in VoltView nicht hinterlegt.",
        robots: NOINDEX,
        type: "website",
      };
    }
  }

  if (path.startsWith("/watch/")) {
    page = {
      title: "Player · VoltView",
      description: "VoltView-Player. Bitte nur im Stand nutzen.",
      robots: NOINDEX,
      type: "video.other",
    };
  } else if (path.startsWith("/plex/")) {
    page = {
      title: "Plex · VoltView",
      description: "Persönliche Plex-Bibliothek. Nicht für Suchmaschinen bestimmt.",
      robots: NOINDEX,
      type: "website",
    };
  }

  if (!page) {
    page = {
      title: "Seite nicht gefunden · VoltView",
      description: "Diese Adresse gibt es in VoltView nicht. Zurück zur Startseite oder zu den Streaming-Apps.",
      robots: NOINDEX,
      type: "website",
    };
  }

  const canonical = `${SITE_URL}${path === "/" ? "/" : path}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: DEFAULT_DESCRIPTION,
        inLanguage: "de",
        publisher: { "@id": `${SITE_URL}/#app` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web, Tesla Browser",
        description: DEFAULT_DESCRIPTION,
        inLanguage: "de",
        image: OG_IMAGE,
        screenshot: OG_IMAGE,
        featureList: ["YouTube", "Offizielle Streaming-Apps", "Plex", "Radio", "QR-Setup vom Handy"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumb(path),
      },
      ...extraJsonLd(path),
    ],
  };

  return { ...page, canonical, jsonLd };
}

function extraJsonLd(path: string): Record<string, unknown>[] {
  if (path !== "/apps") return [];
  return [
    {
      "@type": "ItemList",
      name: "Streaming-Apps in VoltView",
      numberOfItems: services.length,
      itemListElement: services.map((service, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: service.name,
        url: `${SITE_URL}/apps/${service.id}`,
        description: service.blurb,
      })),
    },
  ];
}

function breadcrumb(path: string) {
  const parts = path.split("/").filter(Boolean);
  const items = [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` }];
  let href = "";
  parts.forEach((part, index) => {
    href += `/${part}`;
    const service = getService(part);
    items.push({
      "@type": "ListItem",
      position: index + 2,
      name: service ? service.name : crumbNames[part] || part,
      item: `${SITE_URL}${href}`,
    });
  });
  return items;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function applySeoToHtml(html: string, pathname: string): string {
  const seo = resolveSeo(pathname);
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
  out = replaceMeta(out, "name", "description", seo.description);
  out = replaceMeta(out, "name", "robots", seo.robots);
  out = replaceMeta(out, "name", "googlebot", seo.robots.includes("noindex") ? "noindex,nofollow" : "index,follow");
  out = replaceMeta(out, "property", "og:title", seo.title);
  out = replaceMeta(out, "property", "og:description", seo.description);
  out = replaceMeta(out, "property", "og:url", seo.canonical);
  out = replaceMeta(out, "property", "og:type", seo.type);
  out = replaceMeta(out, "property", "og:image:alt", OG_IMAGE_ALT);
  out = replaceMeta(out, "name", "twitter:title", seo.title);
  out = replaceMeta(out, "name", "twitter:description", seo.description);
  out = replaceMeta(out, "name", "twitter:image:alt", OG_IMAGE_ALT);
  out = out.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escapeHtml(seo.canonical)}" />`);
  out = out.replace(
    /<script type="application\/ld\+json" id="voltview-jsonld">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" id="voltview-jsonld">\n      ${JSON.stringify(seo.jsonLd)}\n    </script>`,
  );
  return out;
}

function replaceMeta(html: string, attr: "name" | "property", key: string, content: string) {
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"`);
  if (re.test(html)) {
    return html.replace(re, `<meta ${attr}="${key}" content="${escapeHtml(content)}"`);
  }
  return html;
}

export function buildSitemapXml(lastmod = new Date().toISOString().slice(0, 10)): string {
  const urls = publicSitemapPaths
    .map((path) => {
      const loc = `${SITE_URL}${path === "/" ? "/" : path}`;
      const changefreq = path === "/" || path === "/apps" ? "weekly" : "monthly";
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${sitemapPriority(path)}</priority>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
