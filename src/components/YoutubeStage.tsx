import { useEffect, useRef, useState } from "react";
import { PlayerChrome } from "./PlayerChrome";
import { PlayerLoading } from "./PlayerLoading";
import {
  embedCandidates,
  friendlyPlaybackError,
  playbackCandidates,
  type PlaybackSource,
} from "../lib/youtubePlayback";
import { connectionDownlinkMbps, mediaDuration } from "../lib/playerMedia";

type HlsLike = {
  destroy: () => void;
  levels: Array<{ height?: number }>;
  on: (event: string, handler: (event: string, data: { fatal?: boolean; level?: number }) => void) => void;
};

const ATTEMPT_MS = 4000;
const MAX_FILE_ATTEMPTS = 10;

async function attachSource(
  video: HTMLVideoElement,
  source: PlaybackSource,
  onQuality: (label: string) => void,
  onFatal: () => void,
): Promise<HlsLike | null> {
  if (source.kind === "hls" && !video.canPlayType("application/vnd.apple.mpegurl")) {
    const { default: Hls } = await import("hls.js");
    if (!Hls.isSupported()) throw new Error("HLS_UNSUPPORTED");
    const downlink = connectionDownlinkMbps();
    const player = new Hls({
      enableWorker: false,
      lowLatencyMode: false,
      backBufferLength: 60,
      maxBufferLength: 40,
      capLevelToPlayerSize: true,
      startLevel: -1,
      abrEwmaDefaultEstimate: downlink > 0 ? Math.round(downlink * 1_000_000) : 1_200_000,
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

function safeList<T>(build: () => T[], fallback: T[] = []): T[] {
  try {
    return build();
  } catch {
    return fallback;
  }
}

function readMedia(node: HTMLVideoElement) {
  return {
    positionSec: node.currentTime || 0,
    durationSec: mediaDuration(node),
    playing: !node.paused,
  };
}

export function YoutubeStage({
  videoId,
  title,
  onSnapshot,
}: {
  videoId: string;
  title?: string;
  onSnapshot: (snap: { positionSec: number; durationSec: number; playing: boolean }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [mode, setMode] = useState<"file" | "embed">("file");
  const [quality, setQuality] = useState("Auto");
  const [embedIndex, setEmbedIndex] = useState(0);
  const embeds = safeList(() => embedCandidates(videoId));

  useEffect(() => {
    const media = videoRef.current;
    if (!media || !videoId) return;
    const node: HTMLVideoElement = media;
    let cancelled = false;
    let ignoreError = false;
    let ready = false;
    let hls: HlsLike | null = null;
    let timer = 0;
    let index = 0;
    const candidates = safeList(() => playbackCandidates(videoId)).slice(0, MAX_FILE_ATTEMPTS);
    const embedList = safeList(() => embedCandidates(videoId));

    setError("");
    setLoading(true);
    setBuffering(false);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setMode("file");
    setQuality("Auto");
    setEmbedIndex(0);

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

    function showEmbed() {
      if (cancelled) return;
      clearTimer();
      cleanupMedia();
      setMode("embed");
      setBuffering(false);
      setQuality("Embed");
      setError(embedList.length ? "" : friendlyPlaybackError("NO_STREAM"));
      if (!embedList.length) setLoading(false);
    }

    async function tryIndex(next: number) {
      if (cancelled) return;
      if (next >= candidates.length) {
        showEmbed();
        return;
      }
      index = next;
      const source = candidates[next];
      if (!source || !videoRef.current) {
        showEmbed();
        return;
      }
      setQuality(source.quality === "auto" ? "Auto" : source.quality);
      try {
        ignoreError = true;
        hls?.destroy();
        hls = await attachSource(
          videoRef.current,
          source,
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
      timer = window.setTimeout(() => void tryIndex(next + 1), ATTEMPT_MS);
    }

    function onReady() {
      if (cancelled) return;
      ready = true;
      clearTimer();
      setMode("file");
      setBuffering(false);
      setError("");
      setDuration(mediaDuration(node));
      const play = node.play();
      if (play) play.catch(() => undefined);
    }

    function onFail() {
      if (cancelled || ignoreError) return;
      clearTimer();
      void tryIndex(index + 1);
    }

    function onWaiting() {
      if (!cancelled && ready) setBuffering(true);
    }

    function onPlaying() {
      if (!cancelled) {
        setBuffering(false);
        setLoading(false);
        setDuration(mediaDuration(node));
      }
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
  }, [videoId]);

  const embedUrl = embeds[embedIndex] || "";
  const nativeReady = mode === "file" && !loading && !error;
  const canSeek = nativeReady && duration > 0;

  return (
    <PlayerChrome
      playing={playing}
      current={current}
      duration={duration}
      quality={quality}
      seekable={canSeek}
      onToggle={() => {
        const video = videoRef.current;
        if (!video || mode !== "file") return;
        if (video.paused) video.play().catch(() => undefined);
        else video.pause();
      }}
      onSeek={(seconds) => {
        const video = videoRef.current;
        if (mode !== "file" || !video || !canSeek) return;
        video.currentTime = seconds;
        setCurrent(seconds);
      }}
    >
      <video
        ref={videoRef}
        className={
          mode === "embed"
            ? "hidden"
            : "absolute inset-0 z-0 h-full w-full bg-black object-contain"
        }
        poster={videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : undefined}
        playsInline
        muted={mode === "embed"}
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
          onSnapshot(snap);
        }}
      />
      {mode === "embed" && embedUrl ? (
        <iframe
          key={embedUrl}
          title="VoltView Player"
          src={embedUrl}
          className="absolute inset-0 z-0 h-full w-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="origin"
          onLoad={() => {
            setLoading(false);
            setBuffering(false);
          }}
        />
      ) : null}
      {loading || buffering ? (
        <PlayerLoading
          title={title}
          subtitle={buffering ? "Puffert…" : "Wie Tesla Play — Stream wird geholt…"}
        />
      ) : null}
      {error ? (
        <p className="absolute inset-x-4 top-4 z-20 rounded-xl bg-black/70 px-3 py-2 text-sm text-volt-2">{error}</p>
      ) : null}
      {mode === "embed" && embeds.length > 1 ? (
        <button
          type="button"
          className="absolute right-4 top-4 z-20 rounded-xl bg-black/70 px-3 py-2 text-sm text-mist"
          onClick={() => setEmbedIndex((i) => (i + 1) % embeds.length)}
        >
          Anderer Player
        </button>
      ) : null}
    </PlayerChrome>
  );
}
