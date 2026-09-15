import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MediaCard } from "../components/MediaCard";
import { SafetyGate } from "../components/SafetyGate";
import { Theater } from "../components/Theater";
import { YoutubeStage } from "../components/YoutubeStage";
import { api, type YoutubeVideo } from "../lib/api";
import { formatViews } from "../lib/format";
import { useSettings } from "../lib/settings";
import { useWatchSession } from "../lib/useWatchSession";

export function WatchYouTubePage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const [video, setVideo] = useState<YoutubeVideo | null>(null);
  const [related, setRelated] = useState<YoutubeVideo[]>([]);
  const snapRef = useRef({ positionSec: 0, durationSec: 0, playing: true });

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
        if (item.title) {
          api
            .youtubeRelated(settings, item.title)
            .then((rel) => setRelated(rel.items || []))
            .catch(() => undefined);
        }
      })
      .catch(() => setVideo(fallback));
  }, [id, remember, settings]);

  useWatchSession({
    deviceId: settings.plexClientId || "voltview-web",
    source: "youtube",
    contentId: id,
    title: video?.title || "YouTube",
    getSnapshot: () => snapRef.current,
  });

  const onSnapshot = useCallback(
    (snap: { positionSec: number; durationSec: number; playing: boolean }) => {
      snapRef.current = snap;
    },
    []
  );

  return (
    <SafetyGate title="YouTube nur im Stand" resetKey={id}>
    <Theater
      backTo="/youtube"
      eyebrow="VoltView Player · eigenes UI · YouTube"
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
      <YoutubeStage videoId={id} onSnapshot={onSnapshot} />
    </Theater>
    </SafetyGate>
  );
}
