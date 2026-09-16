import { useMemo } from "react";
import { Html5Player } from "./Html5Player";
import { deviceProgressiveCandidates, friendlyPlaybackError, youtubeOfficialEmbed } from "../lib/youtubePlayback";
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
    if (!videoId) return [];
    const limit = tesla ? 6 : 3;
    return deviceProgressiveCandidates(videoId, limit).map((item) => ({
      ...item,
      timeoutMs: tesla ? 4000 : 3500,
    }));
  }, [tesla, videoId]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;

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
                return youtubeOfficialEmbed(videoId, origin);
              } catch {
                return undefined;
              }
            })()
      }
      onSnapshot={onSnapshot}
    />
  );
}
