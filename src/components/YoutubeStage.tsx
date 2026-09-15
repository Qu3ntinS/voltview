import { useEffect, useRef, useState } from "react";
import { PlayerChrome } from "./PlayerChrome";

type YtPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: Record<string, unknown>
      ) => YtPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadApi() {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const existing = document.querySelector("script[data-yt-api]");
    if (existing) {
      window.onYouTubeIframeAPIReady = () => resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.dataset.ytApi = "1";
    window.onYouTubeIframeAPIReady = () => resolve();
    document.body.appendChild(script);
  });
}

export function YoutubeStage({
  videoId,
  onSnapshot,
}: {
  videoId: string;
  onSnapshot: (snap: { positionSec: number; durationSec: number; playing: boolean }) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const [playing, setPlaying] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadApi().then(() => {
      if (cancelled || !boxRef.current || !window.YT) return;
      boxRef.current.innerHTML = "";
      const host = document.createElement("div");
      host.className = "h-full w-full";
      boxRef.current.appendChild(host);
      playerRef.current = new window.YT.Player(host, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          fs: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: { target: YtPlayer }) => {
            event.target.playVideo();
            setDuration(event.target.getDuration() || 0);
          },
          onStateChange: (event: { data: number }) => {
            setPlaying(event.data === 1);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (boxRef.current) boxRef.current.innerHTML = "";
    };
  }, [videoId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const positionSec = player.getCurrentTime() || 0;
      const durationSec = player.getDuration() || 0;
      const isPlaying = player.getPlayerState() === 1;
      setCurrent(positionSec);
      setDuration(durationSec);
      setPlaying(isPlaying);
      onSnapshot({ positionSec, durationSec, playing: isPlaying });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onSnapshot]);

  return (
    <PlayerChrome
      playing={playing}
      current={current}
      duration={duration}
      onToggle={() => {
        if (!playerRef.current) return;
        if (playing) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
      }}
      onSeek={(seconds) => playerRef.current?.seekTo(seconds, true)}
      onFullscreen={() => {
        const root = document.querySelector("[data-theater-stage]");
        if (root && root.requestFullscreen) root.requestFullscreen().catch(() => undefined);
      }}
    >
      <div ref={boxRef} className="absolute inset-0" />
    </PlayerChrome>
  );
}
