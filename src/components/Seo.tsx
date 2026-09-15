import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT =
  "VoltView ist dein Midnight-Purple Theater für Tesla und Browser: YouTube, Plex, Radio und offizielle Streaming-Apps — ohne Zeitlimit.";

const routes: Record<string, { title: string; description: string }> = {
  "/": { title: "VoltView", description: DEFAULT },
  "/apps": {
    title: "Streaming-Apps",
    description: "Netflix, Disney+, Prime Video und weitere offizielle Dienste in VoltView öffnen.",
  },
  "/youtube": {
    title: "YouTube",
    description: "YouTube im eigenen VoltView-Player, mit Google-Login für Abos und Likes.",
  },
  "/plex": { title: "Plex", description: "Deine Plex-Mediathek im VoltView-Theater." },
  "/radio": { title: "Radio", description: "Internetradio im VoltView-Player." },
  "/games": { title: "Games", description: "Kurze Beifahrer-Spiele für die Ladepause." },
  "/settings": { title: "Setup", description: "YouTube, Google-Login und Plex in VoltView einrichten." },
  "/search": { title: "Suche", description: "YouTube, Plex und Radio in VoltView durchsuchen." },
};

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let tag = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function Seo() {
  const location = useLocation();
  useEffect(() => {
    const match =
      Object.entries(routes).find(([path]) =>
        path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
      )?.[1] || routes["/"];
    const title = match.title === "VoltView" ? "VoltView — Midnight Theater" : `${match.title} · VoltView`;
    document.title = title;
    setMeta("description", match.description);
    setMeta("og:title", title, "property");
    setMeta("og:description", match.description, "property");
    setMeta("twitter:title", title);
    setMeta("twitter:description", match.description);
    const canonical = document.querySelector("link[rel=canonical]") as HTMLLinkElement | null;
    if (canonical) {
      canonical.href = `https://qu3ntins.github.io/voltview${location.pathname}`;
    }
  }, [location.pathname]);
  return null;
}
