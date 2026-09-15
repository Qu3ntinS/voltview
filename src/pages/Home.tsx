import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { Row } from "../components/Row";
import { ServiceTile } from "../components/ServiceTile";
import { featuredServices } from "../data/services";
import { api, plexImage, type YoutubeVideo } from "../lib/api";
import { useSettings } from "../lib/settings";

export function HomePage() {
  const { settings, recents } = useSettings();
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [ytError, setYtError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .youtubeTrending(settings)
      .then((data) => {
        if (!alive) return;
        setVideos(data.items || []);
        setYtError(data.error || "");
      })
      .catch((error) => {
        if (alive) setYtError(error.message);
      });
    return () => {
      alive = false;
    };
  }, [settings]);

  const needsSetup = !settings.youtubeApiKey && !settings.plexToken;

  return (
    <div>
      {needsSetup ? (
        <section className="card mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Noch kein Login</p>
            <p className="muted">QR auf Setup scannen und auf dem Handy anmelden.</p>
          </div>
          <Link to="/settings" className="btn btn-primary">
            QR öffnen
          </Link>
        </section>
      ) : null}

      {ytError && ytError === "NO_YOUTUBE_KEY" ? (
        <p className="muted mb-3">YouTube-Key fehlt — unter Setup oder per QR nachtragen.</p>
      ) : ytError ? (
        <p className="warn mb-3">{ytError}</p>
      ) : null}

      {recents.length ? (
        <Row title="Weiterschauen">
          {recents.map((item) => (
            <MediaCard
              key={`${item.kind}-${item.id}`}
              to={item.kind === "youtube" ? `/watch/yt/${item.id}` : `/plex/item/${item.id}`}
              title={item.title}
              subtitle={item.subtitle}
              image={item.image}
              wide
            />
          ))}
        </Row>
      ) : null}

      <Row
        title="Apps"
        action={
          <Link to="/apps" className="text-sm">
            Alle
          </Link>
        }
      >
        {featuredServices().map((service) => (
          <ServiceTile key={service.id} service={service} />
        ))}
      </Row>

      {videos.length ? (
        <Row
          title="YouTube"
          action={
            <Link to="/youtube" className="text-sm">
              Mehr
            </Link>
          }
        >
          {videos.slice(0, 12).map((video) => (
            <MediaCard
              key={video.id}
              to={`/watch/yt/${video.id}`}
              title={video.title}
              subtitle={video.channel}
              image={video.thumbnail}
              wide
            />
          ))}
        </Row>
      ) : null}

      {settings.plexServerUri ? <PlexHomePreview /> : null}
    </div>
  );
}

function PlexHomePreview() {
  const { settings } = useSettings();
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.plexOnDeck>>["items"]>([]);

  useEffect(() => {
    api
      .plexOnDeck(settings)
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]));
  }, [settings]);

  if (!items.length) return null;

  return (
    <Row
      title="Plex"
      action={
        <Link to="/plex" className="text-sm">
          Mehr
        </Link>
      }
    >
      {items.slice(0, 12).map((item) => (
        <MediaCard
          key={item.id}
          to={item.type === "movie" || item.type === "episode" ? `/watch/plex/${item.id}` : `/plex/item/${item.id}`}
          title={item.title}
          subtitle={item.grandparentTitle || item.parentTitle || item.year?.toString()}
          image={plexImage(settings, item.thumb)}
        />
      ))}
    </Row>
  );
}
