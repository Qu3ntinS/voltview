import { Maximize2, Pause, Play } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { teslaFullscreen } from "../lib/tesla";

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlayerChrome({
  children,
  playing,
  current,
  duration,
  onToggle,
  onSeek,
  quality,
  seekable = true,
}: {
  children: ReactNode;
  playing: boolean;
  current: number;
  duration: number;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  quality?: string;
  seekable?: boolean;
}) {
  const max = duration > 0 && Number.isFinite(duration) ? duration : 1;
  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const canSeek = seekable && duration > 0 && Number.isFinite(duration);

  return (
    <div
      className="player-stage"
      style={{ "--player-progress": `${progress}%` } as CSSProperties}
    >
      {children}
      <button type="button" className="player-tap" aria-label={playing ? "Pause" : "Play"} onClick={onToggle} />
      <div className="player-shade" />
      <div className="player-dock">
        <input
          type="range"
          min={0}
          max={max}
          step={0.25}
          value={canSeek ? Math.min(current, duration) : 0}
          disabled={!canSeek}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="player-seek"
          aria-label="Position"
        />
        <div className="player-dock-row">
          <button type="button" onClick={onToggle} className="player-play">
            {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
          </button>
          <p className="player-clock">
            {clock(current)} / {clock(duration)}
          </p>
          <p className="player-meta">
            {quality ? <span>{quality === "auto" ? "Auto" : quality}</span> : null}
            {duration > 0 ? <span>{Math.round(progress)}%</span> : null}
          </p>
          <button type="button" onClick={() => teslaFullscreen(window.location.href)} className="player-wide">
            <Maximize2 className="h-5 w-5" />
            Vollbild
          </button>
        </div>
      </div>
    </div>
  );
}
