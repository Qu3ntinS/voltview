import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Html5Player } from "../components/Html5Player";
import { SafetyGate } from "../components/SafetyGate";
import { Theater } from "../components/Theater";
import { api, plexFileUrl, plexImage, plexStreamUrl } from "../lib/api";
import { useSettings } from "../lib/settings";
import { isTeslaBrowser } from "../lib/tesla";
import { useWatchSession } from "../lib/useWatchSession";

export function WatchPlexPage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const snapRef = useRef({ positionSec: 0, durationSec: 0, playing: true });
  const [title, setTitle] = useState("Plex");

  useEffect(() => {
    api
      .plexMetadata(settings, id)
      .then((data) => {
        if (!data.item) return;
        const nextTitle = data.item.grandparentTitle
          ? `${data.item.grandparentTitle} · ${data.item.title}`
          : data.item.title;
        setTitle(nextTitle);
        remember({
          kind: "plex",
          id,
          title: data.item.title,
          subtitle: data.item.grandparentTitle,
          image: plexImage(settings, data.item.thumb),
        });
      })
      .catch(() => undefined);
  }, [id, remember, settings]);

  useWatchSession({
    deviceId: settings.plexClientId || "voltview-web",
    source: "plex",
    contentId: id,
    title,
    getSnapshot: () => snapRef.current,
  });

  const file = plexFileUrl(settings, id);
  const sources = useMemo(() => {
    const progressive = { url: file, mime: "video/mp4", quality: "Auto", kind: "progressive" as const };
    if (isTeslaBrowser()) return [progressive];
    return [
      progressive,
      {
        url: plexStreamUrl(settings, id, "hls"),
        mime: "application/vnd.apple.mpegurl",
        quality: "Auto",
        kind: "hls" as const,
      },
    ];
  }, [file, id, settings]);

  return (
    <SafetyGate title="Plex" resetKey={id}>
      <Theater>
        <Html5Player
          sources={sources}
          backTo="/plex"
          eyebrow="Plex"
          title={title}
          failText="Stream fehlgeschlagen."
          onSnapshot={(snap) => {
            snapRef.current = snap;
          }}
        />
      </Theater>
    </SafetyGate>
  );
}
