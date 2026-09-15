export function teslaFullscreen(url = window.location.href) {
  const target = /^https?:\/\//i.test(url) ? url : new URL(url, window.location.origin).href;
  window.location.href = `https://www.youtube.com/redirect?q=${encodeURIComponent(target)}`;
}
