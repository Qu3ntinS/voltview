import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { api, type YoutubeVideo } from "../lib/api";
import { formatViews } from "../lib/format";
import { useSettings } from "../lib/settings";

export function WatchYouTubePage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const [video, setVideo] = useState<YoutubeVideo | null>(null);
  const [related, setRelated] = useState<YoutubeVideo[]>([]);

  useEffect(() => {
    if (!id) return;
    api
      .youtubeVideos(settings, id)
      .then((data) => {
        const item = data.items?.[0] || {
          id,
          title: "YouTube",
          channel: "",
          description: "",
          publishedAt: "",
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          duration: "",
          views: "",
        };
        setVideo(item);
        remember({
          kind: "youtube",
          id,
          title: item.title,
          subtitle: item.channel,
          image: item.thumbnail,
        });
        if (item.title) {
          api.youtubeRelated(settings, item.title).then((rel) => setRelated(rel.items || [])).catch(() => undefined);
        }
      })
      .catch(() => {
        setVideo({
          id,
          title: "YouTube",
          channel: "",
          description: "",
          publishedAt: "",
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          duration: "",
          views: "",
        });
      });
  }, [id, remember, settings]);

  return (
    <div className="pb-6">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/youtube" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white/5 px-5">
          <ArrowLeft className="h-5 w-5" />
          Zurück
        </Link>
        <p className="text-sm text-mist">Offizieller YouTube-Player · keine Zeitgrenze</p>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-white/5 bg-black glow-ring">
        <div className="relative aspect-video w-full">
          <iframe
            title={video?.title || "YouTube"}
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&fs=1`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
      <div className="mt-5">
        <h1 className="font-display text-3xl font-bold">{video?.title}</h1>
        <p className="mt-2 text-mist">
          {video?.channel}
          {video?.views ? ` · ${formatViews(video.views)} Aufrufe` : ""}
        </p>
        {video?.description ? (
          <p className="mt-4 line-clamp-4 max-w-4xl text-sm leading-relaxed text-mist">{video.description}</p>
        ) : null}
      </div>
      {related.length ? (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-2xl font-bold">Ähnliche Videos</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related
              .filter((item) => item.id !== id)
              .map((item) => (
                <MediaCard
                  key={item.id}
                  to={`/watch/yt/${item.id}`}
                  title={item.title}
                  subtitle={item.channel}
                  image={item.thumbnail}
                  fill
                />
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
