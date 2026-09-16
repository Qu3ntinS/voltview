import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { api, plexImage, type PlexItem } from "../lib/api";
import { useSettings } from "../lib/settings";

export function PlexLibraryPage() {
  const { key = "" } = useParams();
  const { settings } = useSettings();
  const [items, setItems] = useState<PlexItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .plexSection(settings, key)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message));
  }, [key, settings]);

  return (
    <div>
      <Link to="/plex" className="mb-4 inline-flex h-12 items-center rounded-2xl bg-white/5 px-4">
        Zurück
      </Link>
      <h1 className="mb-6 font-display text-4xl font-extrabold">Bibliothek</h1>
      {error ? <p className="text-volt-2">{error}</p> : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            to={item.type === "movie" ? `/watch/plex/${item.id}` : `/plex/item/${item.id}`}
            title={item.title}
            subtitle={item.year?.toString()}
            image={plexImage(settings, item.thumb)}
            fill
          />
        ))}
      </div>
    </div>
  );
}
