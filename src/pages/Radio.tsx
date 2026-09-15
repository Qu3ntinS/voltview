import { useEffect, useRef, useState } from "react";
import { SafetyGate } from "../components/SafetyGate";
import { api, type RadioStation } from "../lib/api";
import { useSettings } from "../lib/settings";
import { useWatchSession } from "../lib/useWatchSession";

export function RadioPage() {
  const { settings } = useSettings();
  const [items, setItems] = useState<RadioStation[]>([]);
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState<RadioStation | null>(null);
  const [pending, setPending] = useState<RadioStation | null>(null);
  const [error, setError] = useState("");
  const snapRef = useRef({ positionSec: 0, durationSec: 0, playing: true });

  useWatchSession({
    deviceId: settings.plexClientId || "voltview-web",
    source: "radio",
    contentId: current?.id || "",
    title: current?.name || "",
    getSnapshot: () => snapRef.current,
  });

  useEffect(() => {
    api
      .radioPopular(settings, settings.youtubeRegion)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  }, [settings]);

  function search() {
    if (!q.trim()) return;
    api
      .radioSearch(settings, q.trim())
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  }

  return (
    <div>
      {pending ? (
        <SafetyGate
          title="Radio nur im Stand"
          resetKey={pending.id}
          onConfirm={() => {
            setCurrent(pending);
            setPending(null);
          }}
        />
      ) : null}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Radio</h1>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sender"
            className="h-10 w-56 rounded-lg border border-white/10 bg-panel px-3"
          />
          <button type="button" onClick={search} className="btn btn-primary">
            Suchen
          </button>
        </div>
      </div>
      {current ? (
        <div className="mb-6 rounded-3xl border border-white/10 bg-panel p-5 glow-ring">
          <p className="text-xs uppercase tracking-[0.2em] text-volt-2">Läuft</p>
          <p className="mt-2 font-display text-2xl font-bold">{current.name}</p>
          <audio
            key={current.id}
            className="mt-4 w-full"
            controls
            autoPlay
            src={current.url || `/api/radio/play/${encodeURIComponent(current.id)}`}
            onError={() => setError("Stream blockiert oder offline.")}
            onPlaying={() => setError("")}
            onTimeUpdate={(e) => {
              snapRef.current = {
                positionSec: e.currentTarget.currentTime || 0,
                durationSec: e.currentTarget.duration || 0,
                playing: !e.currentTarget.paused,
              };
            }}
          />
        </div>
      ) : null}
      {error ? <p className="mb-4 text-volt-2">{error}</p> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((station) => (
          <button
            key={station.id}
            type="button"
            onClick={() => {
              setError("");
              setPending(station);
            }}
            className="flex h-24 items-center gap-4 rounded-2xl border border-white/5 bg-panel px-4 text-left glow-ring"
          >
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white/5">
              {station.favicon ? <img src={station.favicon} alt="" className="h-full w-full object-cover" /> : "FM"}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{station.name}</p>
              <p className="truncate text-sm text-mist">
                {station.country} {station.bitrate ? `· ${station.bitrate} kbps` : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
