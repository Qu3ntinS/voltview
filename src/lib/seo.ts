import { getService } from "../data/services";

export const SITE_URL = "https://qu3ntins.github.io/voltview";
export const SITE_NAME = "VoltView";
export const DEFAULT_TITLE = "VoltView — Midnight Theater";
export const DEFAULT_DESCRIPTION =
  "VoltView ist dein Midnight-Purple Theater für Tesla und Browser: YouTube mit Google-Login, Plex, Radio und offizielle Streaming-Apps wie Netflix, Disney+ und Prime — ohne Zeitlimit.";
export const OG_IMAGE = `${SITE_URL}/og.png`;

export type SeoPage = {
  title: string;
  description: string;
  robots: string;
  type: "website" | "video.other";
};

const pages: Record<string, SeoPage> = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    robots: "index,follow",
    type: "website",
  },
  "/apps": {
    title: "Streaming-Apps · VoltView",
    description:
      "Netflix, Disney+, Prime Video, Max und deutsche Mediatheken in VoltView öffnen — offizielle Accounts, Tesla-Theater über YouTube-Redirect.",
    robots: "index,follow",
    type: "website",
  },
  "/youtube": {
    title: "YouTube · VoltView",
    description:
      "YouTube im eigenen VoltView-Player. Google-Login für Abos und Likes, volle Länge, keine Zeitgrenze.",
    robots: "index,follow",
    type: "website",
  },
  "/plex": {
    title: "Plex · VoltView",
    description: "Eigene Plex-Mediathek im VoltView-Theater: Libraries, Weiterschauen und HLS-Playback.",
    robots: "index,follow",
    type: "website",
  },
  "/radio": {
    title: "Radio · VoltView",
    description: "Internetradio aus dem Radio-Browser-Verzeichnis, direkt im VoltView-Player.",
    robots: "index,follow",
    type: "website",
  },
  "/games": {
    title: "Games · VoltView",
    description: "Kurze Beifahrer-Spiele für Ladepausen im Tesla — Volt Snake und Circuit Memory.",
    robots: "index,follow",
    type: "website",
  },
  "/settings": {
    title: "Setup · VoltView",
    description: "YouTube-Key, Google-Login und Plex in VoltView einrichten.",
    robots: "noindex,nofollow",
    type: "website",
  },
  "/search": {
    title: "Suche · VoltView",
    description: "YouTube, Plex und Radio in VoltView durchsuchen.",
    robots: "noindex,follow",
    type: "website",
  },
};

export function resolveSeo(pathname: string): SeoPage & { canonical: string; jsonLd: Record<string, unknown> } {
  const path = pathname || "/";
  let page = pages[path];

  const appMatch = path.match(/^\/apps\/([^/]+)$/);
  if (appMatch) {
    const service = getService(appMatch[1]);
    if (service) {
      page = {
        title: `${service.name} · VoltView`,
        description: `${service.name} in VoltView öffnen: ${service.blurb}. Offizieller Account, Tesla-Theater über YouTube-Redirect.`,
        robots: "index,follow",
        type: "website",
      };
    }
  }

  if (path.startsWith("/watch/")) {
    page = {
      title: "Player · VoltView",
      description: "VoltView-Player. Bitte nur im Stand nutzen.",
      robots: "noindex,nofollow",
      type: "video.other",
    };
  }

  if (!page) {
    const prefix = Object.keys(pages)
      .filter((key) => key !== "/" && path.startsWith(key))
      .sort((a, b) => b.length - a.length)[0];
    page = pages[prefix || "/"];
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
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumb(path),
      },
    ],
  };

  return { ...page, canonical, jsonLd };
}

function breadcrumb(path: string) {
  const parts = path.split("/").filter(Boolean);
  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
  ];
  let href = "";
  parts.forEach((part, index) => {
    href += `/${part}`;
    const service = getService(part);
    items.push({
      "@type": "ListItem",
      position: index + 2,
      name: service ? service.name : part,
      item: `${SITE_URL}${href}`,
    });
  });
  return items;
}

export const publicSitemapPaths = [
  "/",
  "/apps",
  "/youtube",
  "/plex",
  "/radio",
  "/games",
  "/apps/netflix",
  "/apps/disney",
  "/apps/prime",
  "/apps/max",
  "/apps/appletv",
  "/apps/youtube-tv",
];
