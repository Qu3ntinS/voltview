import { FormEvent, useEffect, useState } from "react";
import { MediaCard } from "../components/MediaCard";
import { api, type YoutubeVideo } from "../lib/api";
import { formatDuration } from "../lib/format";
import { useSettings } from "../lib/settings";

const categories = [
  { id: "", label: "Trending" },
  { id: "10", label: "Musik" },
  { id: "20", label: "Gaming" },
  { id: "17", label: "Sport" },
  { id: "24", label: "Entertainment" },
  { id: "23", label: "Comedy" },
  { id: "28", label: "Wissenschaft" },
  { id: "1", label: "Film" },
];

export function YouTubePage() {
  const { settings } = useSettings();
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<YoutubeVideo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .youtubeTrending(settings, category)
      .then((data) => {
        if (!alive) return;
        setItems(data.items || []);
        setError(data.error || "");
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [settings, category]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    api
      .youtubeSearch(settings, q.trim())
      .then((data) => {
        setItems(data.items || []);
        setError(data.error || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-volt-2">YouTube IFrame API</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">YouTube</h1>
          <p className="mt-3 max-w-2xl text-mist">
            Offizieller Player, volle Länge, keine VoltView-Zeitgrenze. Trends und Suche brauchen
            einen kostenlosen YouTube-Data-API-Key.
          </p>
        </div>
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Video oder Kanal"
            className="h-14 w-72 rounded-2xl border border-white/10 bg-panel px-4 outline-none focus:ring-2 focus:ring-volt/50"
          />
          <button type="submit" className="h-14 rounded-2xl bg-volt px-5 font-semibold">
            Suchen
          </button>
        </form>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id || "all"}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`h-12 rounded-2xl px-4 ${
              category === cat.id ? "bg-volt" : "border border-white/10 bg-panel text-mist"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {error ? (
        <div className="mb-6 rounded-2xl border border-volt/30 bg-volt/10 p-5 text-volt-2">
          {error === "NO_YOUTUBE_KEY"
            ? "Kein API-Key. Unter Setup einen YouTube Data API v3 Key eintragen."
            : error}
        </div>
      ) : null}
      {loading ? <p className="text-mist">Lade…</p> : null}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((video) => (
          <MediaCard
            key={video.id}
            to={`/watch/yt/${video.id}`}
            title={video.title}
            subtitle={video.channel}
            image={video.thumbnail}
            badge={formatDuration(video.duration)}
            fill
          />
        ))}
      </div>
    </div>
  );
}
