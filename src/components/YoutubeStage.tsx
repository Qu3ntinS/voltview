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
    // Phone: official embed is the reliable player. Do not burn 20s on Vercel 502s.
    if (!tesla) return [];
    // Tesla iframe is audio-only. Load Invidious→googlevideo from the car, not Vercel.
    return deviceProgressiveCandidates(videoId, 6).map((item) => ({
      ...item,
      timeoutMs: 4000,
    }));
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
