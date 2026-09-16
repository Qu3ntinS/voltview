import { ArrowLeft, Maximize2, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { teslaFullscreen } from "../lib/tesla";

const IDLE_MS = 2400;

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
  backTo,
  eyebrow,
  title,
}: {
  children: ReactNode;
  playing: boolean;
  current: number;
  duration: number;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  quality?: string;
  seekable?: boolean;
  backTo: string;
  eyebrow: string;
  title: string;
}) {
  const max = duration > 0 && Number.isFinite(duration) ? duration : 1;
  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const canSeek = seekable && duration > 0 && Number.isFinite(duration);
  const [idle, setIdle] = useState(false);
  const lastAt = useRef(0);
  const timer = useRef(0);

  const bump = useCallback(() => {
    lastAt.current = Date.now();
    setIdle(false);
  }, []);

  useEffect(() => {
    bump();
    window.clearInterval(timer.current);
    if (!playing) {
      setIdle(false);
      return;
    }
    timer.current = window.setInterval(() => {
      if (Date.now() - lastAt.current >= IDLE_MS) setIdle(true);
    }, 250);
    return () => window.clearInterval(timer.current);
  }, [bump, playing]);

  function onTap() {
    if (playing && idle) {
      bump();
      return;
    }
    onToggle();
    bump();
  }

  return (
    <div className={`player-stage${playing ? " is-playing" : ""}${idle && playing && duration > 0 ? " is-idle" : ""}`}>
      {children}
      <button type="button" className="player-tap" aria-label={playing ? "Pause" : "Play"} onClick={onTap} />
      {playing ? null : (
        <div className="player-center" aria-hidden="true">
          <Play className="h-8 w-8" />
        </div>
      )}
      <div className="player-top">
        <Link to={backTo} className="player-back">
          <ArrowLeft className="h-5 w-5" />
          Zurück
        </Link>
        <div className="player-heading">
          <p className="player-kicker">{eyebrow}</p>
          <h1 className="player-title">{title}</h1>
        </div>
        <button type="button" onClick={() => teslaFullscreen()} className="player-full">
          <Maximize2 className="h-5 w-5" />
          Vollbild
        </button>
      </div>
      <div className="player-shade" />
      <div className="player-dock" onPointerDown={bump}>
        <div className="player-seek-wrap">
          <div className="player-seek-track" aria-hidden="true">
            <div className="player-seek-fill" style={{ width: `${progress}%` } as CSSProperties} />
            <div className="player-seek-knob" style={{ left: `${progress}%` } as CSSProperties} />
          </div>
          <input
            type="range"
            min={0}
            max={max}
            step={0.25}
            value={canSeek ? Math.min(current, duration) : 0}
            disabled={!canSeek}
            onChange={(e) => {
              onSeek(Number(e.target.value));
              bump();
            }}
            className="player-seek"
            aria-label="Position"
          />
        </div>
        <div className="player-dock-row">
          <button type="button" onClick={onToggle} className="player-play">
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
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
