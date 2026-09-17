import { useMemo } from "react";
import { Html5Player } from "./Html5Player";
import { deviceProgressiveCandidates, friendlyPlaybackError } from "../lib/youtubePlayback";
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
    return deviceProgressiveCandidates(videoId, tesla ? 8 : 6).map((item) => ({
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
      onSnapshot={onSnapshot}
    />
  );
}
