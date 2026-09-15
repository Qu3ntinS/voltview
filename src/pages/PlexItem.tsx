import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { api, plexImage, type PlexItem } from "../lib/api";
import { useSettings } from "../lib/settings";

export function PlexItemPage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const [item, setItem] = useState<PlexItem | null>(null);
  const [children, setChildren] = useState<PlexItem[]>([]);

  useEffect(() => {
    api.plexMetadata(settings, id).then((data) => {
      setItem(data.item);
      if (data.item) {
        remember({
          kind: "plex",
          id: data.item.id,
          title: data.item.title,
          subtitle: data.item.year?.toString(),
          image: plexImage(settings, data.item.thumb),
        });
      }
    });
    api.plexChildren(settings, id).then((data) => setChildren(data.items || [])).catch(() => setChildren([]));
  }, [id, remember, settings]);

  if (!item) {
    return <p className="text-mist">Lade Plex-Titel…</p>;
  }

  return (
    <div>
      <Link to="/plex" className="mb-4 inline-flex h-12 items-center rounded-2xl bg-white/5 px-4">
        Zurück
      </Link>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-panel">
          {item.thumb ? <img src={plexImage(settings, item.thumb, 500)} alt="" className="w-full object-cover" /> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-volt-2">{item.type}</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">{item.title}</h1>
          <p className="mt-3 text-mist">{item.year}</p>
          <p className="mt-4 max-w-3xl text-mist">{item.summary}</p>
          {item.type === "movie" || item.type === "episode" ? (
            <Link
              to={`/watch/plex/${item.id}`}
              className="mt-6 inline-flex h-14 items-center rounded-2xl bg-volt px-6 text-lg font-semibold"
            >
              Abspielen
            </Link>
          ) : null}
        </div>
      </div>
      {children.length ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {children.map((child) => (
            <MediaCard
              key={child.id}
              to={child.type === "episode" || child.type === "movie" ? `/watch/plex/${child.id}` : `/plex/item/${child.id}`}
              title={child.title}
              subtitle={child.parentTitle || `Folge ${child.index || ""}`}
              image={plexImage(settings, child.thumb)}
              fill
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
