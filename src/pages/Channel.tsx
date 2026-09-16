import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { api, type YoutubeChannel, type YoutubeVideo } from "../lib/api";
import { formatDuration } from "../lib/format";
import { useSettings } from "../lib/settings";

export function ChannelPage() {
  const { id = "" } = useParams();
  const { settings } = useSettings();
  const [channel, setChannel] = useState<YoutubeChannel | null>(null);
  const [items, setItems] = useState<YoutubeVideo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    api
      .youtubeChannel(settings, id)
      .then((data) => {
        if (!alive) return;
        setChannel(data.channel || { id, title: "Kanal", thumbnail: "" });
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
  }, [id, settings]);

  return (
    <div>
      <Link to="/youtube" className="mb-4 inline-flex h-12 items-center rounded-2xl bg-white/5 px-4">
        Zurück zu YouTube
      </Link>
      <div className="mb-6 flex items-center gap-4">
        {channel?.thumbnail ? (
          <img src={channel.thumbnail} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{channel?.title || "Kanal"}</h1>
          {channel?.description ? (
            <p className="muted mt-1 line-clamp-2 max-w-2xl">{channel.description}</p>
          ) : null}
        </div>
      </div>
      {error ? <p className="mb-4 text-volt-2">{error}</p> : null}
      {loading ? <p className="text-mist">Lade…</p> : null}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((video) => (
          <MediaCard
            key={video.id}
            to={`/watch/yt/${video.id}`}
            title={video.title}
            subtitle={video.channel || channel?.title}
            image={video.thumbnail}
            badge={formatDuration(video.duration)}
            fill
          />
        ))}
      </div>
    </div>
  );
}
