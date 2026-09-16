import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { Row } from "../components/Row";
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

  const needsGoogle = !settings.youtubeAccessToken;

  return (
    <div>
      {needsGoogle ? (
        <section className="card glow-ring mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">Google</p>
          <Link to="/settings" className="btn btn-primary">
            QR
          </Link>
        </section>
      ) : null}

      {ytError && ytError !== "NO_YOUTUBE_KEY" ? (
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link to="/apps" className="card coming-soon-tile">
          <p className="pair-kicker">Coming soon</p>
          <h2 className="text-lg font-semibold">Apps</h2>
        </Link>
        <Link to="/mirror" className="card coming-soon-tile">
          <p className="pair-kicker">Coming soon</p>
          <h2 className="text-lg font-semibold">Screen Mirror</h2>
        </Link>
      </div>
      {videos.length ? (
        <Row
          title="YouTube"
          action={
            <Link to="/youtube" className="text-sm text-volt-2">
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
        <Link to="/plex" className="text-sm text-volt-2">
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
