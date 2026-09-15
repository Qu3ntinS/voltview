import { useEffect, useRef, useState } from "react";
import { PlayerChrome } from "./PlayerChrome";
import { api } from "../lib/api";
import { friendlyPlaybackError, type PlaybackSource } from "../lib/youtubePlayback";

type HlsHandle = { destroy: () => void };

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoId) return;
    let cancelled = false;
    let hls: HlsHandle | null = null;
    setError("");
    setLoading(true);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    video.removeAttribute("src");
    video.load();

    api
      .youtubeStream(videoId)
      .then(async (source) => {
        if (cancelled || !videoRef.current) return;
        hls = await attachSource(videoRef.current, source);
        if (cancelled) {
          hls?.destroy();
          return;
        }
        setLoading(false);
        const play = videoRef.current.play();
        if (play) play.catch(() => undefined);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLoading(false);
        setError(friendlyPlaybackError(err.message));
      });

    return () => {
      cancelled = true;
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [videoId]);

  return (
    <PlayerChrome
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
        className="absolute inset-0 h-full w-full bg-black object-contain"
        poster={videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined}
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        {...{ "webkit-playsinline": "true" }}
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
        onError={() => {
          if (!loading) setError("Video konnte nicht geladen werden.");
        }}
      />
      {loading ? (
        <p className="absolute inset-x-4 top-4 rounded-xl bg-black/70 px-3 py-2 text-sm text-mist">
          VoltView-Player lädt den Stream…
        </p>
      ) : null}
      {error ? (
        <p className="absolute inset-x-4 top-4 rounded-xl bg-black/70 px-3 py-2 text-sm text-volt-2">{error}</p>
      ) : null}
    </PlayerChrome>
  );
}
