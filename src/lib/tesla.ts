export function teslaRedirectUrl(url = window.location.href) {
  const target = /^https?:\/\//i.test(url) ? url : new URL(url, window.location.origin).href;
  return `https://www.youtube.com/redirect?q=${encodeURIComponent(target)}`;
}

export function teslaFullscreen(url = window.location.href) {
  window.location.href = teslaRedirectUrl(url);
}
