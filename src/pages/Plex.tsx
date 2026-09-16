import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { Row } from "../components/Row";
import { api, plexImage, type PlexItem } from "../lib/api";
import { useSettings } from "../lib/settings";

export function PlexPage() {
  const { settings } = useSettings();
  const [onDeck, setOnDeck] = useState<PlexItem[]>([]);
  const [recent, setRecent] = useState<PlexItem[]>([]);
  const [libraries, setLibraries] = useState<{ key: string; title: string; type: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!settings.plexToken || !settings.plexServerUri) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      api.plexLibraries(settings),
      api.plexOnDeck(settings),
      api.plexRecent(settings),
    ])
      .then(([libs, deck, added]) => {
        if (!alive) return;
        setLibraries(libs.items || []);
        setOnDeck(deck.items || []);
        setRecent(added.items || []);
        setError("");
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
  }, [settings]);

  if (!settings.plexToken) {
    return (
      <EmptyPlex
        title="Plex auf dem Handy"
        body="QR unter Setup scannen, auf dem Phone bei Plex anmelden. Der Tesla übernimmt Account und Server."
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

  const empty = !loading && !error && !libraries.length && !onDeck.length && !recent.length;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Plex</h1>
        {settings.plexServerName ? <p className="muted">{settings.plexServerName}</p> : null}
      </div>
      {loading ? <p className="mb-4 text-mist">Lade Bibliotheken…</p> : null}
      {error ? <p className="mb-4 text-volt-2">{error}</p> : null}
      {empty ? (
        <p className="mb-4 muted">
          {settings.plexServerName || "Server"} ist verbunden, aber Vercel erreicht keine Bibliothek. Auf dem Handy den
          Server nochmal antippen — VoltView nimmt die öffentliche Plex-Adresse, nicht das Heimnetz.
        </p>
      ) : null}
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
    <div className="card max-w-lg">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="muted mt-2">{body}</p>
      <Link to="/settings" className="btn btn-primary mt-4">
        Setup
      </Link>
    </div>
  );
}
