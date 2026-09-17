const TESLA_FLAG = "tesla";
const TESLA_STORAGE = "voltview.teslaUnlock";

export function isTeslaBrowser(ua = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  return /Tesla|\bQtCarBrowser\b/i.test(ua || "");
}

/** HTML5 video is unlocked only in the Tesla browser (youtube.com/redirect). Phone/desktop get a notice. */
export function canPlayHtml5Video(
  ua = typeof navigator === "undefined" ? "" : navigator.userAgent,
  hostname = typeof window === "undefined" ? "" : window.location.hostname,
) {
  if (isTeslaBrowser(ua)) return true;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isWatchPath(pathname = typeof window === "undefined" ? "" : window.location.pathname) {
  return /\/watch\//.test(pathname || "");
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

/** tesla=1 on this URL only — referrer is not enough for a new watch path. */
export function pageHasTeslaFlag(href?: string) {
  const page = href || (typeof window === "undefined" ? "" : window.location.href);
  try {
    return Boolean(page && new URL(page).searchParams.get(TESLA_FLAG) === "1");
  } catch {
    return false;
  }
}

export function hasTeslaUnlockFlag(href?: string, referrer?: string) {
  if (pageHasTeslaFlag(href)) return true;
  const from = referrer || (typeof document === "undefined" ? "" : document.referrer);
  return /youtube\.com/i.test(from || "");
}

export function teslaFullscreen(url = window.location.href) {
  window.location.href = teslaRedirectUrl(withTeslaUnlockFlag(url));
}

/** Hop through youtube.com/redirect so HTML5 video is allowed in the Tesla browser. */
export function ensureTeslaVideoUnlock() {
  if (typeof window === "undefined") return false;
  if (!isTeslaBrowser()) return false;
  if (isWatchPath()) {
    if (pageHasTeslaFlag()) {
      try {
        sessionStorage.setItem(TESLA_STORAGE, "1");
      } catch {
        /* private mode */
      }
      return false;
    }
    window.location.replace(teslaRedirectUrl(withTeslaUnlockFlag(window.location.href)));
    return true;
  }
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

/** Every Tesla watch URL must come from youtube.com/redirect, including SPA navigations. */
export function ensureTeslaWatchUnlock(
  ua?: string,
  href?: string,
  replace?: (url: string) => void,
) {
  if (typeof window === "undefined" && ua === undefined) return false;
  if (!isTeslaBrowser(ua)) return false;
  const page = href || (typeof window === "undefined" ? "" : window.location.href);
  if (pageHasTeslaFlag(page)) return false;
  const go = replace || ((url: string) => window.location.replace(url));
  go(teslaRedirectUrl(withTeslaUnlockFlag(page)));
  return true;
}

/** Phone/desktop never start HTML5 video. Tesla hops first if tesla=1 was dropped. */
export function teslaPlaybackMode(
  ua?: string,
  hostname?: string,
  href?: string,
): "play" | "notice" | "hop" {
  if (!canPlayHtml5Video(ua, hostname)) return "notice";
  if (isTeslaBrowser(ua) && !pageHasTeslaFlag(href)) return "hop";
  return "play";
}
