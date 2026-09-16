import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { api, plexImage, type PlexItem, type RadioStation, type YoutubeChannel, type YoutubeVideo } from "../lib/api";
import { useSettings } from "../lib/settings";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const { settings } = useSettings();
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [channels, setChannels] = useState<YoutubeChannel[]>([]);
  const [plex, setPlex] = useState<PlexItem[]>([]);
  const [radio, setRadio] = useState<RadioStation[]>([]);

  useEffect(() => {
    if (!q) return;
    api.youtubeSearch(settings, q).then((d) => {
      setVideos(d.items || []);
      setChannels(d.channels || []);
    }).catch(() => {
      setVideos([]);
      setChannels([]);
    });
    if (settings.plexServerUri) {
      api.plexSearch(settings, q).then((d) => setPlex(d.items || [])).catch(() => setPlex([]));
    }
    api.radioSearch(settings, q).then((d) => setRadio(d.items || [])).catch(() => setRadio([]));
  }, [q, settings]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{q ? q : "Suche"}</h1>
      {channels.length ? (
        <section className="mt-8">
          <h2 className="mb-4 font-display text-2xl font-bold">Kanäle</h2>
          <div className="flex flex-wrap gap-3">
            {channels
              .filter((channel) => channel.id)
              .map((channel) => (
                <Link
                  key={channel.id}
                  to={`/youtube/channel/${channel.id}`}
                  className="flex h-20 w-64 items-center gap-3 rounded-2xl border border-white/10 bg-panel px-4"
                >
                  {channel.thumbnail ? (
                    <img src={channel.thumbnail} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : null}
                  <p className="font-semibold">{channel.title}</p>
                </Link>
              ))}
          </div>
        </section>
      ) : null}
      {videos.length ? (
        <section className="mt-8">
          <h2 className="mb-4 font-display text-2xl font-bold">YouTube</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {videos.map((video) => (
              <MediaCard key={video.id} to={`/watch/yt/${video.id}`} title={video.title} subtitle={video.channel} image={video.thumbnail} fill />
            ))}
          </div>
        </section>
      ) : null}
      {plex.length ? (
        <section className="mt-8">
          <h2 className="mb-4 font-display text-2xl font-bold">Plex</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {plex.map((item) => (
              <MediaCard
                key={item.id}
                to={item.type === "movie" || item.type === "episode" ? `/watch/plex/${item.id}` : `/plex/item/${item.id}`}
                title={item.title}
                subtitle={item.type}
                image={plexImage(settings, item.thumb)}
                fill
              />
            ))}
          </div>
        </section>
      ) : null}
      {radio.length ? (
        <section className="mt-8">
          <h2 className="mb-4 font-display text-2xl font-bold">Radio</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {radio.map((station) => (
              <div key={station.id} className="rounded-2xl border border-white/5 bg-panel px-4 py-4">
                <p className="font-semibold">{station.name}</p>
                <p className="text-sm text-mist">{station.country}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
