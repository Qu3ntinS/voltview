import { useEffect, useRef, useState } from "react";
import { PlayerChrome } from "./PlayerChrome";
import {
  embedCandidates,
  friendlyPlaybackError,
  playbackCandidates,
  type PlaybackSource,
} from "../lib/youtubePlayback";

type HlsHandle = { destroy: () => void };

const ATTEMPT_MS = 4500;
const MAX_FILE_ATTEMPTS = 4;

async function attachSource(video: HTMLVideoElement, source: PlaybackSource): Promise<HlsHandle | null> {
  if (source.kind === "hls" && !video.canPlayType("application/vnd.apple.mpegurl")) {
    const { default: Hls } = await import("hls.js");
    if (!Hls.isSupported()) throw new Error("Dieser Browser kann HLS nicht abspielen.");
    const player = new Hls({
      enableWorker: false,
      lowLatencyMode: false,
      backBufferLength: 30,
    });
    player.loadSource(source.url);
    player.attachMedia(video);
    return player;
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

export function YoutubeStage({
  videoId,
  onSnapshot,
}: {
  videoId: string;
  onSnapshot: (snap: { positionSec: number; durationSec: number; playing: boolean }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"file" | "embed">("file");
  const [embedIndex, setEmbedIndex] = useState(0);
  const embeds = safeList(() => embedCandidates(videoId));

  useEffect(() => {
    const media = videoRef.current;
    if (!media || !videoId) return;
    const node: HTMLVideoElement = media;
    let cancelled = false;
    let ignoreError = false;
    let hls: HlsHandle | null = null;
    let timer = 0;
    let index = 0;
    const candidates = safeList(() => playbackCandidates(videoId)).slice(0, MAX_FILE_ATTEMPTS);
    const embedList = safeList(() => embedCandidates(videoId));

    setError("");
    setLoading(true);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setMode("file");
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

    function showEmbed(message = "") {
      if (cancelled) return;
      clearTimer();
      cleanupMedia();
      setMode("embed");
      setLoading(false);
      setError(message);
    }

    async function tryIndex(next: number) {
      if (cancelled) return;
      if (next >= candidates.length) {
        showEmbed(embedList.length ? "" : friendlyPlaybackError("NO_STREAM"));
        return;
      }
      index = next;
      const source = candidates[next];
      if (!source || !videoRef.current) {
        showEmbed(friendlyPlaybackError("NO_STREAM"));
        return;
      }
      try {
        ignoreError = true;
        hls?.destroy();
        hls = await attachSource(videoRef.current, source);
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
      clearTimer();
      setLoading(false);
      setError("");
      const play = node.play();
      if (play) play.catch(() => undefined);
    }

    function onFail() {
      if (cancelled || ignoreError) return;
      clearTimer();
      void tryIndex(index + 1);
    }

    node.addEventListener("loadeddata", onReady);
    node.addEventListener("error", onFail);

    void tryIndex(0);

    return () => {
      cancelled = true;
      clearTimer();
      node.removeEventListener("loadeddata", onReady);
      node.removeEventListener("error", onFail);
      cleanupMedia();
    };
  }, [videoId]);

  const embedUrl = embeds[embedIndex] || "";

  return (
    <PlayerChrome
      chrome={mode === "embed" ? "minimal" : "full"}
      playing={playing}
      current={current}
      duration={duration}
      onToggle={() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play().catch(() => undefined);
        else video.pause();
      }}
      onSeek={(seconds) => {
        if (videoRef.current) videoRef.current.currentTime = seconds;
      }}
    >
      <video
        ref={videoRef}
        className={
          mode === "embed"
            ? "hidden"
            : "absolute inset-0 h-full w-full bg-black object-contain"
        }
        poster={videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined}
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        {...{ "webkit-playsinline": "true", referrerPolicy: "no-referrer" }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => {
          const node = event.currentTarget;
          const positionSec = node.currentTime || 0;
          const durationSec = node.duration || 0;
          setCurrent(positionSec);
          setDuration(durationSec);
          onSnapshot({ positionSec, durationSec, playing: !node.paused });
        }}
      />
      {mode === "embed" && embedUrl ? (
        <iframe
          key={embedUrl}
          title="VoltView Player"
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="origin"
        />
      ) : null}
      {loading ? (
        <p className="absolute inset-x-4 top-4 rounded-xl bg-black/70 px-3 py-2 text-sm text-mist">
          VoltView-Player holt den Stream…
        </p>
      ) : null}
      {error ? (
        <p className="absolute inset-x-4 top-4 rounded-xl bg-black/70 px-3 py-2 text-sm text-volt-2">{error}</p>
      ) : null}
      {mode === "embed" && embeds.length > 1 ? (
        <button
          type="button"
          className="absolute right-4 top-4 rounded-xl bg-black/70 px-3 py-2 text-sm text-mist"
          onClick={() => setEmbedIndex((i) => (i + 1) % embeds.length)}
        >
          Anderer Player
        </button>
      ) : null}
    </PlayerChrome>
  );
}
