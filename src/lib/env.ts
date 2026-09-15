export const isStatic = import.meta.env.VITE_STATIC === "1";
export const pagesUrl = "https://qu3ntins.github.io/voltview/";

export function publicSiteUrl() {
  if (typeof window === "undefined") return pagesUrl;
  return new URL(import.meta.env.BASE_URL || "/", window.location.origin).href;
}
