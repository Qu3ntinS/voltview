import { useEffect, useRef, useState } from "react";
import { PlayerChrome } from "./PlayerChrome";
import { PlayerLoading } from "./PlayerLoading";
import { canUseNativeHls, mediaDuration } from "../lib/playerMedia";

export type Html5Source = {
  url: string;
  kind: "progressive" | "hls";
  quality?: string;
  mime?: string;
};

type HlsLike = {
  destroy: () => void;
  levels: Array<{ height?: number }>;
  on: (event: string, handler: (event: string, data: { fatal?: boolean; level?: number }) => void) => void;
};

const ATTEMPT_MS = 6000;

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
  return isSameOrigin(url) && !/\/api\/plex(?:\?|$)/.test(url);
}

function attemptMsFor(url: string) {
  return /\/api\/plex(?:\?|$)/.test(url) ? 8000 : ATTEMPT_MS;
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
  hlsHeaders,
  onSnapshot,
}: {
  sources: Html5Source[];
  poster?: string;
  title?: string;
  eyebrow: string;
  backTo: string;
  failText?: string;
  hlsHeaders?: Record<string, string>;
  onSnapshot?: (snap: { positionSec: number; durationSec: number; playing: boolean }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [quality, setQuality] = useState("Auto");

  const sourceKey = sources.map((item) => `${item.kind}:${item.url}`).join("|");
  const headerKey = JSON.stringify(hlsHeaders || {});

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;
    const node: HTMLVideoElement = media;
    const list = sources.filter((item) => item.url).slice(0, 6);
    let cancelled = false;
    let ignoreError = false;
    let ready = false;
    let hls: HlsLike | null = null;
    let timer = 0;
    let index = 0;

    setError("");
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
      timer = window.setTimeout(() => {
        if (cancelled || ready) return;
        void tryIndex(index + 1);
      }, attemptMsFor(source.url));
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
  }, [failText, headerKey, sourceKey]);

  const canSeek = !loading && !error && duration > 0;

  return (
    <PlayerChrome
      playing={playing}
      current={current}
      duration={duration}
      quality={quality}
      seekable={canSeek}
      backTo={backTo}
      eyebrow={eyebrow}
      title={title || eyebrow}
      onToggle={() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play().catch(() => undefined);
        else video.pause();
      }}
      onSeek={(seconds) => {
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
        {...{ "webkit-playsinline": "true", referrerPolicy: "no-referrer" }}
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
      {loading || buffering ? (
        <PlayerLoading title={title} subtitle={buffering ? "Puffert…" : "Laden…"} />
      ) : null}
      {error ? <p className="player-error">{error}</p> : null}
    </PlayerChrome>
  );
}
