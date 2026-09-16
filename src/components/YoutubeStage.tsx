import { useMemo } from "react";
import { Html5Player } from "./Html5Player";
import { friendlyPlaybackError, playbackCandidates, youtubeFileUrl, youtubeOfficialEmbed } from "../lib/youtubePlayback";
import { localPlaybackOverride } from "../lib/playerMedia";
import { isTeslaBrowser } from "../lib/tesla";

export function YoutubeStage({
  videoId,
  title,
  onSnapshot,
}: {
  videoId: string;
  title?: string;
  onSnapshot: (snap: { positionSec: number; durationSec: number; playing: boolean }) => void;
}) {
  const tesla = isTeslaBrowser();
  const sources = useMemo(() => {
    const override = localPlaybackOverride();
    if (override) return [override];
    const file18 = { url: youtubeFileUrl(videoId, 18), mime: "video/mp4", quality: "360p", kind: "progressive" as const };
    const file22 = { url: youtubeFileUrl(videoId, 22), mime: "video/mp4", quality: "720p", kind: "progressive" as const };
    const direct = playbackCandidates(videoId, { hls: false }).slice(0, 3);
    if (tesla) return [file18, file22, ...direct];
    return [file18, ...direct];
  }, [tesla, videoId]);

  return (
    <Html5Player
      sources={sources}
      poster={videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined}
      backTo="/youtube"
      eyebrow="YouTube"
      title={title || "YouTube"}
      failText={friendlyPlaybackError("NO_STREAM")}
      fallbackEmbed={
        tesla || !videoId
          ? undefined
          : (() => {
              try {
                return youtubeOfficialEmbed(videoId);
              } catch {
                return undefined;
              }
            })()
      }
      onSnapshot={onSnapshot}
    />
  );
}
