import { useEffect, useRef, useState } from "react";
import { api, type RadioStation } from "../lib/api";
import { useSettings } from "../lib/settings";

export function RadioPage() {
  const { settings } = useSettings();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [items, setItems] = useState<RadioStation[]>([]);
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState<RadioStation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .radioPopular(settings, settings.youtubeRegion)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  }, [settings]);

  function play(station: RadioStation) {
    setCurrent(station);
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = station.url;
    audio.play().catch(() => setError("Stream blockiert oder offline."));
  }

  function search() {
    if (!q.trim()) return;
    api
      .radioSearch(settings, q.trim())
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-volt-2">Radio Browser</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">Radio</h1>
          <p className="mt-3 text-mist">Öffentliche Internetradios, kein Abo nötig.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sender suchen"
            className="h-14 w-72 rounded-2xl border border-white/10 bg-panel px-4 outline-none focus:ring-2 focus:ring-volt/50"
          />
          <button type="button" onClick={search} className="h-14 rounded-2xl bg-volt px-5 font-semibold">
            Suchen
          </button>
        </div>
      </div>
      {current ? (
        <div className="mb-6 rounded-3xl border border-white/10 bg-panel p-5 glow-ring">
          <p className="text-xs uppercase tracking-[0.2em] text-volt-2">Läuft</p>
          <p className="mt-2 font-display text-2xl font-bold">{current.name}</p>
          <audio ref={audioRef} className="mt-4 w-full" controls autoPlay />
        </div>
      ) : (
        <audio ref={audioRef} className="hidden" />
      )}
      {error ? <p className="mb-4 text-volt-2">{error}</p> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((station) => (
          <button
            key={station.id}
            type="button"
            onClick={() => play(station)}
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
