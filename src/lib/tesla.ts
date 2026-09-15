const TESLA_FLAG = "tesla";
const TESLA_STORAGE = "voltview.teslaUnlock";

export function isTeslaBrowser(ua = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  return /Tesla|\bQtCarBrowser\b/i.test(ua || "");
}

export function teslaRedirectUrl(url = window.location.href) {
  const target = /^https?:\/\//i.test(url) ? url : new URL(url, window.location.origin).href;
  return `https://www.youtube.com/redirect?q=${encodeURIComponent(target)}`;
}

export function withTeslaUnlockFlag(href: string) {
  const url = new URL(href);
  url.searchParams.set(TESLA_FLAG, "1");
  return url.href;
}

export function hasTeslaUnlockFlag(href?: string, referrer?: string) {
  const page = href || (typeof window === "undefined" ? "" : window.location.href);
  const from = referrer || (typeof document === "undefined" ? "" : document.referrer);
  try {
    if (page && new URL(page).searchParams.get(TESLA_FLAG) === "1") return true;
  } catch {
    /* ignore */
  }
  return /youtube\.com/i.test(from || "");
}

export function teslaFullscreen(url = window.location.href) {
  window.location.href = teslaRedirectUrl(withTeslaUnlockFlag(url));
}

/** Tesla Play: hop through youtube.com/redirect so HTML5 video is allowed, including Drive. */
export function ensureTeslaVideoUnlock() {
  if (typeof window === "undefined") return false;
  if (!isTeslaBrowser()) return false;
  if (hasTeslaUnlockFlag()) {
    try {
      sessionStorage.setItem(TESLA_STORAGE, "1");
    } catch {
      /* private mode */
    }
    return false;
  }
  try {
    if (sessionStorage.getItem(TESLA_STORAGE) === "1") return false;
  } catch {
    /* ignore */
  }
  window.location.replace(teslaRedirectUrl(withTeslaUnlockFlag(window.location.href)));
  return true;
}
