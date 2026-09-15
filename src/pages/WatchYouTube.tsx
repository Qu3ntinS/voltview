import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { Theater } from "../components/Theater";
import { api, type YoutubeVideo } from "../lib/api";
import { formatViews } from "../lib/format";
import { useSettings } from "../lib/settings";
import { recordWatch } from "../lib/watch";

export function WatchYouTubePage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const [video, setVideo] = useState<YoutubeVideo | null>(null);
  const [related, setRelated] = useState<YoutubeVideo[]>([]);

  useEffect(() => {
    if (!id) return;
    const fallback: YoutubeVideo = {
      id,
      title: "YouTube",
      channel: "",
      description: "",
      publishedAt: "",
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: "",
      views: "",
    };
    api
      .youtubeVideos(settings, id)
      .then((data) => {
        const item = data.items?.[0] || fallback;
        setVideo(item);
        remember({
          kind: "youtube",
          id,
          title: item.title,
          subtitle: item.channel,
          image: item.thumbnail,
        });
        recordWatch({ source: "youtube", id, title: item.title });
        if (item.title) {
          api
            .youtubeRelated(settings, item.title)
            .then((rel) => setRelated(rel.items || []))
            .catch(() => undefined);
        }
      })
      .catch(() => {
        setVideo(fallback);
        recordWatch({ source: "youtube", id, title: "YouTube" });
      });
  }, [id, remember, settings]);

  return (
    <Theater
      backTo="/youtube"
      eyebrow="VoltView Player · YouTube · keine Zeitgrenze"
      title={video?.title || "YouTube"}
      sidebar={
        <div>
          <p className="mb-3 text-sm text-mist">
            {video?.channel}
            {video?.views ? ` · ${formatViews(video.views)} Aufrufe` : ""}
          </p>
          {video?.description ? (
            <p className="mb-5 line-clamp-6 text-sm leading-relaxed text-mist">{video.description}</p>
          ) : null}
          <h2 className="mb-3 font-display text-xl font-bold">Weitersehen</h2>
          <div className="grid gap-3">
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
      }
    >
      <div className="relative h-full min-h-[58vh] w-full">
        <iframe
          title={video?.title || "YouTube"}
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&fs=1`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </Theater>
  );
}
