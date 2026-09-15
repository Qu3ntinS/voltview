import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { OG_IMAGE, OG_IMAGE_ALT, SITE_NAME, resolveSeo } from "../lib/seo";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let tag = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(href: string) {
  let tag = document.querySelector("link[rel=canonical]") as HTMLLinkElement | null;
  if (!tag) {
    tag = document.createElement("link");
    tag.rel = "canonical";
    document.head.appendChild(tag);
  }
  tag.href = href;
}

function setJsonLd(data: Record<string, unknown>) {
  let tag = document.getElementById("voltview-jsonld") as HTMLScriptElement | null;
  if (!tag) {
    tag = document.createElement("script");
    tag.id = "voltview-jsonld";
    tag.type = "application/ld+json";
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

export function Seo() {
  const location = useLocation();

  useEffect(() => {
    const seo = resolveSeo(location.pathname);
    document.title = seo.title;
    document.documentElement.lang = "de";
    setMeta("description", seo.description);
    setMeta("robots", seo.robots);
    setMeta("googlebot", seo.robots.includes("noindex") ? "noindex,nofollow" : "index,follow");
    setMeta("og:title", seo.title, "property");
    setMeta("og:description", seo.description, "property");
    setMeta("og:url", seo.canonical, "property");
    setMeta("og:type", seo.type, "property");
    setMeta("og:image", OG_IMAGE, "property");
    setMeta("og:image:alt", OG_IMAGE_ALT, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:locale", "de_DE", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", seo.title);
    setMeta("twitter:description", seo.description);
    setMeta("twitter:image", OG_IMAGE);
    setMeta("twitter:image:alt", OG_IMAGE_ALT);
    setCanonical(seo.canonical);
    setJsonLd(seo.jsonLd);
  }, [location.pathname]);

  return null;
}
