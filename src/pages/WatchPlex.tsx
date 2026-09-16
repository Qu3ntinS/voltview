import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Html5Player } from "../components/Html5Player";
import { SafetyGate } from "../components/SafetyGate";
import { Theater } from "../components/Theater";
import { api, plexFileUrl, plexImage, plexStreamUrl } from "../lib/api";
import { isTeslaBrowser } from "../lib/tesla";
import { useSettings } from "../lib/settings";
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

  const tesla = isTeslaBrowser();
  const file = plexFileUrl(settings, id);
  const hls = plexStreamUrl(settings, id, "hls");
  const sources = useMemo(
    () =>
      tesla
        ? [{ url: file, mime: "video/mp4", quality: "Auto", kind: "progressive" as const }]
        : [
            { url: file, mime: "video/mp4", quality: "Auto", kind: "progressive" as const },
            { url: hls, mime: "application/vnd.apple.mpegurl", quality: "Auto", kind: "hls" as const },
          ],
    [file, hls, tesla],
  );
  const hlsHeaders = useMemo(
    () => ({
      "x-volt-plex-token": settings.plexToken,
      "x-volt-plex-server": settings.plexServerUri,
      "x-volt-plex-server-token": settings.plexServerToken || settings.plexToken,
      "x-volt-plex-client": settings.plexClientId,
    }),
    [settings.plexClientId, settings.plexServerToken, settings.plexServerUri, settings.plexToken],
  );

  return (
    <SafetyGate title="Plex" resetKey={id}>
      <Theater backTo="/plex" eyebrow="Plex" title={title}>
        <Html5Player
          sources={sources}
          title={title}
          failText="Stream fehlgeschlagen."
          hlsHeaders={hlsHeaders}
          onSnapshot={(snap) => {
            snapRef.current = snap;
          }}
        />
      </Theater>
    </SafetyGate>
  );
}
