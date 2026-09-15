import { Maximize2, Pause, Play } from "lucide-react";
import type { ReactNode } from "react";
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
  chrome = "full",
}: {
  children: ReactNode;
  playing: boolean;
  current: number;
  duration: number;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  onFullscreen?: () => void;
  chrome?: "full" | "minimal";
}) {
  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const minimal = chrome === "minimal";

  return (
    <div className="relative h-full min-h-[58vh] w-full bg-black">
      {children}
      <div
        className={`pointer-events-none absolute inset-x-0 ${minimal ? "bottom-0 h-24" : "inset-0"} bg-gradient-to-t from-black/80 via-transparent to-transparent`}
      />
      <div className={`absolute inset-x-0 bottom-0 ${minimal ? "p-3" : "p-5"}`}>
        {minimal ? null : (
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            value={Math.min(current, duration || 0)}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="h-3 w-full cursor-pointer accent-volt"
          />
        )}
        <div className={`flex items-center gap-3 ${minimal ? "" : "mt-3"}`}>
          {minimal ? null : (
            <>
              <button
                type="button"
                onClick={onToggle}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-volt"
              >
                {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
              </button>
              <p className="min-w-28 font-display text-lg tabular-nums">
                {clock(current)} / {clock(duration)}
              </p>
              <div className="hidden flex-1 text-sm text-mist md:block">{Math.round(progress)}%</div>
            </>
          )}
          <button
            type="button"
            onClick={() => teslaFullscreen(window.location.href)}
            className="ml-auto flex h-16 items-center gap-2 rounded-2xl bg-white/10 px-5"
          >
            <Maximize2 className="h-5 w-5" />
            Tesla Vollbild
          </button>
        </div>
      </div>
    </div>
  );
}
