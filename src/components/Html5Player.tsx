import { useEffect, useRef, useState } from "react";
import { PlayerChrome } from "./PlayerChrome";
import { PlayerLoading } from "./PlayerLoading";
import { canUseNativeHls, mediaDuration } from "../lib/playerMedia";
import { isLanPlexHost } from "../lib/plexTv";

export type Html5Source = {
  url: string;
  kind: "progressive" | "hls";
  quality?: string;
  mime?: string;
  timeoutMs?: number;
};

type HlsLike = {
  destroy: () => void;
  levels: Array<{ height?: number }>;
  on: (event: string, handler: (event: string, data: { fatal?: boolean; level?: number }) => void) => void;
};

const ATTEMPT_MS = 6000;

type YtPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

function isYoutubeEmbed(url: string) {
  return /youtube(?:-nocookie)?\.com\/embed\//i.test(url);
}

function loadYoutubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as Window & { YT?: { Player?: unknown } }).YT?.Player) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const host = window as Window & { YT?: { Player?: unknown }; onYouTubeIframeAPIReady?: () => void };
    const prev = host.onYouTubeIframeAPIReady;
    host.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector("script[data-volt-yt-api]")) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.dataset.voltYtApi = "1";
      document.head.appendChild(script);
    }
  });
}

function readMedia(node: HTMLVideoElement) {
  return {
    positionSec: node.currentTime || 0,
    durationSec: mediaDuration(node),
    playing: !node.paused,
  };
}

function isSameOrigin(url: string) {
  if (url.startsWith("/")) return true;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function shouldProbe(url: string) {
  if (!isSameOrigin(url)) return false;
  if (/\/api\/plex(?:\?|$)/.test(url)) return false;
  if (/\/api\/youtube(?:\/|\?|$)/.test(url)) return false;
  if (/\.(mp4|webm)(\?|$)/i.test(url) && !url.includes("/api/")) return false;
  return true;
}

function attemptMsFor(source: Html5Source) {
  if (typeof source.timeoutMs === "number") return source.timeoutMs;
  if (/\/api\/plex(?:\?|$)/.test(source.url)) return 0;
  if (isLanPlexHost(source.url)) return 2500;
  return ATTEMPT_MS;
}

async function sameOriginPlayable(url: string) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1", accept: "*/*" },
      signal: ctrl.signal,
    });
    const type = res.headers.get("content-type") || "";
    if (res.status === 206) return true;
    if (!res.ok) return false;
    return /video|mpegurl|octet-stream|mp4/i.test(type);
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

async function attachSource(
  video: HTMLVideoElement,
  source: Html5Source,
  hlsHeaders: Record<string, string> | undefined,
  onQuality: (label: string) => void,
  onFatal: () => void,
): Promise<HlsLike | null> {
  if (source.kind === "hls") {
    if (canUseNativeHls(video)) {
      video.src = source.url;
      return null;
    }
    const { default: Hls } = await import("hls.js");
    if (!Hls.isSupported()) throw new Error("HLS_UNSUPPORTED");
    const player = new Hls({
      enableWorker: false,
      lowLatencyMode: false,
      backBufferLength: 60,
      maxBufferLength: 40,
      capLevelToPlayerSize: true,
      startLevel: -1,
      xhrSetup: hlsHeaders
        ? (xhr) => {
            for (const [key, value] of Object.entries(hlsHeaders)) {
              if (value) xhr.setRequestHeader(key, value);
            }
          }
        : undefined,
    });
    player.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) onFatal();
    });
    player.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      const height = player.levels[data.level]?.height;
      onQuality(height ? `${height}p · Auto` : "Auto");
    });
    player.loadSource(source.url);
    player.attachMedia(video);
    return player as unknown as HlsLike;
  }
  video.src = source.url;
  return null;
}

export function Html5Player({
  sources,
  poster,
  title,
  eyebrow,
  backTo,
  failText = "Kein Stream.",
  fallbackEmbed,
  hlsHeaders,
  onSnapshot,
}: {
  sources: Html5Source[];
  poster?: string;
  title?: string;
  eyebrow: string;
  backTo: string;
  failText?: string;
  fallbackEmbed?: string;
  hlsHeaders?: Record<string, string>;
  onSnapshot?: (snap: { positionSec: number; durationSec: number; playing: boolean }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytRef = useRef<YtPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const startWithEmbed = !sources.some((item) => item.url) && Boolean(fallbackEmbed);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!startWithEmbed);
  const [buffering, setBuffering] = useState(false);
  const [quality, setQuality] = useState("Auto");
  const [embed, setEmbed] = useState(startWithEmbed ? fallbackEmbed || "" : "");

  const sourceKey = sources.map((item) => `${item.kind}:${item.url}`).join("|");
  const headerKey = JSON.stringify(hlsHeaders || {});

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;
    const node: HTMLVideoElement = media;
    const list = sources.filter((item) => item.url).slice(0, 12);
    let cancelled = false;
    let ignoreError = false;
    let ready = false;
    let hls: HlsLike | null = null;
    let timer = 0;
    let index = 0;

    if (!list.length && fallbackEmbed) {
      setError("");
      setEmbed(fallbackEmbed);
      setLoading(false);
      setBuffering(false);
      return () => {
        cancelled = true;
      };
    }

    setError("");
    setEmbed("");
    setLoading(true);
    setBuffering(false);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setQuality(list[0]?.quality === "auto" ? "Auto" : list[0]?.quality || "Auto");

    function clearTimer() {
      window.clearTimeout(timer);
    }

    function cleanupMedia() {
      hls?.destroy();
      hls = null;
      ignoreError = true;
      node.pause();
      node.removeAttribute("src");
      node.load();
      ignoreError = false;
    }

    function giveUp() {
      if (cancelled) return;
      clearTimer();
      cleanupMedia();
      setBuffering(false);
      setLoading(false);
      if (fallbackEmbed) {
        setError("");
        setEmbed(fallbackEmbed);
        return;
      }
      setError(failText);
    }

    async function tryIndex(next: number) {
      if (cancelled) return;
      if (next >= list.length) {
        giveUp();
        return;
      }
      index = next;
      const source = list[next];
      if (!source || !videoRef.current) {
        giveUp();
        return;
      }
      setQuality(source.quality === "auto" ? "Auto" : source.quality || "Auto");
      setLoading(true);
      if (source.kind === "progressive" && shouldProbe(source.url)) {
        const playable = await sameOriginPlayable(source.url);
        if (cancelled) return;
        if (!playable) {
          void tryIndex(next + 1);
          return;
        }
      }
      try {
        ignoreError = true;
        hls?.destroy();
        hls = await attachSource(
          videoRef.current,
          source,
          hlsHeaders,
          (label) => {
            if (!cancelled) setQuality(label);
          },
          () => {
            if (!cancelled && !ready) void tryIndex(index + 1);
          },
        );
        ignoreError = false;
      } catch {
        ignoreError = false;
        void tryIndex(next + 1);
        return;
      }
      if (cancelled) return;
      clearTimer();
      const wait = attemptMsFor(source);
      if (wait) {
        timer = window.setTimeout(() => {
          if (cancelled || ready) return;
          void tryIndex(index + 1);
        }, wait);
      }
    }

    function onReady() {
      if (cancelled) return;
      ready = true;
      clearTimer();
      setBuffering(false);
      setLoading(false);
      setError("");
      setDuration(mediaDuration(node));
      const play = node.play();
      if (play) play.catch(() => undefined);
    }

    function onFail() {
      if (cancelled || ignoreError || ready) return;
      clearTimer();
      void tryIndex(index + 1);
    }

    function onWaiting() {
      if (!cancelled && ready) setBuffering(true);
    }

    function onPlaying() {
      if (cancelled) return;
      ready = true;
      clearTimer();
      setBuffering(false);
      setLoading(false);
      setDuration(mediaDuration(node));
    }

    function onMeta() {
      if (!cancelled) setDuration(mediaDuration(node));
    }

    node.addEventListener("loadeddata", onReady);
    node.addEventListener("canplay", onReady);
    node.addEventListener("loadedmetadata", onMeta);
    node.addEventListener("durationchange", onMeta);
    node.addEventListener("progress", onMeta);
    node.addEventListener("error", onFail);
    node.addEventListener("waiting", onWaiting);
    node.addEventListener("playing", onPlaying);
    void tryIndex(0);

    return () => {
      cancelled = true;
      clearTimer();
      node.removeEventListener("loadeddata", onReady);
      node.removeEventListener("canplay", onReady);
      node.removeEventListener("loadedmetadata", onMeta);
      node.removeEventListener("durationchange", onMeta);
      node.removeEventListener("progress", onMeta);
      node.removeEventListener("error", onFail);
      node.removeEventListener("waiting", onWaiting);
      node.removeEventListener("playing", onPlaying);
      cleanupMedia();
    };
  }, [failText, fallbackEmbed, headerKey, sourceKey]);

  useEffect(() => {
    if (!embed || !isYoutubeEmbed(embed) || !iframeRef.current) return;
    let dead = false;
    let poll = 0;
    const node = iframeRef.current;
    void loadYoutubeApi().then(() => {
      const YT = (window as Window & { YT?: { Player: new (el: HTMLElement, opts: unknown) => YtPlayer } }).YT;
      if (dead || !YT?.Player) return;
      const player = new YT.Player(node, {
        events: {
          onReady: () => {
            if (dead) return;
            setLoading(false);
            setBuffering(false);
            setError("");
            setQuality("Auto");
            try {
              player.playVideo();
            } catch {
              /* autoplay may be blocked */
            }
          },
          onStateChange: (event: { data: number }) => {
            if (dead) return;
            if (event.data === 1) {
              setPlaying(true);
              setLoading(false);
              setBuffering(false);
            } else if (event.data === 2 || event.data === 0) {
              setPlaying(false);
              setBuffering(false);
            } else if (event.data === 3) {
              setBuffering(true);
            }
          },
        },
      });
      ytRef.current = player;
      poll = window.setInterval(() => {
        try {
          const positionSec = player.getCurrentTime() || 0;
          const durationSec = player.getDuration() || 0;
          setCurrent(positionSec);
          if (durationSec > 0) setDuration(durationSec);
          onSnapshot?.({
            positionSec,
            durationSec,
            playing: player.getPlayerState() === 1,
          });
        } catch {
          /* player not ready */
        }
      }, 400);
    });
    return () => {
      dead = true;
      window.clearInterval(poll);
      try {
        ytRef.current?.destroy();
      } catch {
        /* ignore */
      }
      ytRef.current = null;
    };
  }, [embed, onSnapshot]);

  const canSeek = !loading && !error && duration > 0;

  return (
    <PlayerChrome
      playing={playing}
      current={current}
      duration={duration}
      quality={quality}
      seekable={canSeek}
      embed={Boolean(embed)}
      backTo={backTo}
      eyebrow={eyebrow}
      title={title || eyebrow}
      onToggle={() => {
        const yt = ytRef.current;
        if (yt) {
          if (playing) yt.pauseVideo();
          else yt.playVideo();
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play().catch(() => undefined);
        else video.pause();
      }}
      onSeek={(seconds) => {
        const yt = ytRef.current;
        if (yt) {
          yt.seekTo(seconds, true);
          setCurrent(seconds);
          return;
        }
        const video = videoRef.current;
        if (!video || !canSeek) return;
        video.currentTime = seconds;
        setCurrent(seconds);
      }}
    >
      <video
        ref={videoRef}
        className="player-video"
        poster={poster}
        playsInline
        autoPlay
        preload="auto"
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        {...{ "webkit-playsinline": "true" }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onDurationChange={(event) => setDuration(mediaDuration(event.currentTarget))}
        onTimeUpdate={(event) => {
          const snap = readMedia(event.currentTarget);
          setCurrent(snap.positionSec);
          setDuration(snap.durationSec);
          onSnapshot?.(snap);
        }}
      />
      {embed ? (
        <iframe
          ref={iframeRef}
          id="volt-yt-embed"
          className="player-embed"
          src={embed}
          title={title || eyebrow}
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
        />
      ) : null}
      {loading || buffering ? (
        <PlayerLoading title={title} subtitle={buffering ? "Puffert…" : "Laden…"} />
      ) : null}
      {error ? <p className="player-error">{error}</p> : null}
    </PlayerChrome>
  );
}
