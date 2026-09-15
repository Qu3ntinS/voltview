import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { Row } from "../components/Row";
import { ServiceTile } from "../components/ServiceTile";
import { featuredServices } from "../data/services";
import { api, plexImage, type YoutubeVideo } from "../lib/api";
import { useSettings } from "../lib/settings";
import { teslaFullscreen } from "../lib/tesla";

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

  const hero = videos[0];

  return (
    <div>
      <section className="relative mb-8 overflow-hidden rounded-[28px] border border-white/5 bg-panel glow-ring">
        <div className="relative min-h-[340px]">
          {hero?.thumbnail ? (
            <img src={hero.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(139,92,246,0.35),transparent_40%)]" />
          )}
          <div className="hero-mask absolute inset-0" />
          <div className="relative flex min-h-[340px] max-w-2xl flex-col justify-end p-8">
            <p className="text-xs uppercase tracking-[0.32em] text-volt-2">Dein Theater. Kein Zeitlimit.</p>
            <h1 className="mt-3 font-display text-5xl font-extrabold leading-none">
              {hero?.title || "Midnight Purple. Volle Kontrolle."}
            </h1>
            <p className="mt-4 max-w-lg text-mist">
              Offizielle Streaming-Apps, YouTube ohne 20-Minuten-Deckel und dein eigener Plex-Server
              — gebaut für den Tesla-Browser und jedes andere Display.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {hero ? (
                <Link
                  to={`/watch/yt/${hero.id}`}
                  className="inline-flex h-14 items-center rounded-2xl bg-volt px-6 text-lg font-semibold"
                >
                  Jetzt ansehen
                </Link>
              ) : (
                <Link
                  to="/settings"
                  className="inline-flex h-14 items-center rounded-2xl bg-volt px-6 text-lg font-semibold"
                >
                  Setup öffnen
                </Link>
              )}
              <Link
                to="/apps"
                className="inline-flex h-14 items-center rounded-2xl border border-white/10 bg-white/5 px-6 text-lg"
              >
                Alle Apps
              </Link>
              <button
                type="button"
                onClick={() => teslaFullscreen(window.location.href)}
                className="inline-flex h-14 items-center rounded-2xl border border-volt/40 bg-volt/15 px-6 text-lg text-volt-2"
              >
                Tesla Vollbild
              </button>
            </div>
            {ytError ? <p className="mt-4 text-sm text-volt-2">{ytError === "NO_YOUTUBE_KEY" ? "YouTube-Key in den Einstellungen ergänzen, dann erscheinen Trends hier." : ytError}</p> : null}
          </div>
        </div>
      </section>

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
        title="Netflix, Disney+, Prime & Co."
        action={
          <Link to="/apps" className="text-sm text-volt-2">
            Alle Dienste
          </Link>
        }
      >
        {featuredServices().map((service) => (
          <ServiceTile key={service.id} service={service} />
        ))}
      </Row>

      {videos.length ? (
        <Row
          title="YouTube Trends"
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

      <p className="pb-4 text-xs text-mist">
        Bitte nur im Stand nutzen. VoltView ist unabhängig von Tesla, Netflix, Disney, Prime, YouTube
        und Plex. Marken gehören ihren Inhabern.
      </p>
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
    <Row title="Plex Weiterschauen" action={<Link to="/plex" className="text-sm text-volt-2">Plex</Link>}>
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
