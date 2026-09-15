import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { Row } from "../components/Row";
import { api, plexImage, type PlexItem } from "../lib/api";
import { isStatic } from "../lib/env";
import { useSettings } from "../lib/settings";

export function PlexPage() {
  const { settings } = useSettings();
  const [onDeck, setOnDeck] = useState<PlexItem[]>([]);
  const [recent, setRecent] = useState<PlexItem[]>([]);
  const [libraries, setLibraries] = useState<{ key: string; title: string; type: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!settings.plexToken || !settings.plexServerUri) return;
    Promise.all([
      api.plexLibraries(settings),
      api.plexOnDeck(settings),
      api.plexRecent(settings),
    ])
      .then(([libs, deck, added]) => {
        setLibraries(libs.items || []);
        setOnDeck(deck.items || []);
        setRecent(added.items || []);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [settings]);

  if (isStatic) {
    return (
      <EmptyPlex
        title="Plex braucht den Server"
        body="GitHub Pages ist nur das Frontend. Plex-Login und HLS-Proxy laufen mit bun run start auf deinem Rechner oder NAS."
      />
    );
  }

  if (!settings.plexToken) {
    return (
      <EmptyPlex
        title="Plex verbinden"
        body="Melde dich über die offizielle Plex-PIN an. VoltView sieht nur deinen eigenen Server."
      />
    );
  }

  if (!settings.plexServerUri) {
    return (
      <EmptyPlex
        title="Server wählen"
        body="Account ist da, aber noch kein Server ausgewählt."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-volt-2">Eigene Mediathek</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold">Plex</h1>
        {settings.plexServerName ? <p className="mt-2 text-mist">{settings.plexServerName}</p> : null}
      </div>
      {error ? <p className="mb-4 text-volt-2">{error}</p> : null}
      <div className="mb-8 flex flex-wrap gap-2">
        {libraries.map((lib) => (
          <Link
            key={lib.key}
            to={`/plex/library/${lib.key}`}
            className="h-12 rounded-2xl border border-white/10 bg-panel px-5 leading-[48px]"
          >
            {lib.title}
          </Link>
        ))}
      </div>
      {onDeck.length ? (
        <Row title="Weiterschauen">
          {onDeck.map((item) => (
            <PlexCard key={item.id} item={item} />
          ))}
        </Row>
      ) : null}
      {recent.length ? (
        <Row title="Neu hinzugefügt">
          {recent.map((item) => (
            <PlexCard key={item.id} item={item} />
          ))}
        </Row>
      ) : null}
    </div>
  );
}

function PlexCard({ item }: { item: PlexItem }) {
  const { settings } = useSettings();
  const playable = item.type === "movie" || item.type === "episode";
  return (
    <MediaCard
      to={playable ? `/watch/plex/${item.id}` : `/plex/item/${item.id}`}
      title={item.title}
      subtitle={item.grandparentTitle || item.parentTitle || item.year?.toString()}
      image={plexImage(settings, item.thumb)}
    />
  );
}

function EmptyPlex({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-panel p-8 glow-ring">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-mist">{body}</p>
      <Link to="/settings" className="mt-6 inline-flex h-14 items-center rounded-2xl bg-volt px-6 font-semibold">
        Zu den Einstellungen
      </Link>
    </div>
  );
}
