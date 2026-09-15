import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Theater } from "../components/Theater";
import { api, plexImage, plexStreamUrl } from "../lib/api";
import { useSettings } from "../lib/settings";
import { recordWatch } from "../lib/watch";

export function WatchPlexPage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [title, setTitle] = useState("Plex");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .plexMetadata(settings, id)
      .then((data) => {
        if (!data.item) return;
        const nextTitle = data.item.grandparentTitle
          ? `${data.item.grandparentTitle} · ${data.item.title}`
          : data.item.title;
        setTitle(nextTitle);
        setSummary(data.item.summary || "");
        remember({
          kind: "plex",
          id,
          title: data.item.title,
          subtitle: data.item.grandparentTitle,
          image: plexImage(settings, data.item.thumb),
        });
        recordWatch({ source: "plex", id, title: nextTitle });
      })
      .catch(() => undefined);
  }, [id, remember, settings]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !id) return;
    const src = plexStreamUrl(settings, id);
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) {
          if (!cancelled) setError("Dieser Browser kann HLS nicht abspielen.");
          return;
        }
        const player = new Hls({
          xhrSetup: (xhr) => {
            xhr.setRequestHeader("x-volt-plex-token", settings.plexToken);
            xhr.setRequestHeader("x-volt-plex-server", settings.plexServerUri);
            xhr.setRequestHeader(
              "x-volt-plex-server-token",
              settings.plexServerToken || settings.plexToken
            );
            xhr.setRequestHeader("x-volt-plex-client", settings.plexClientId);
          },
        });
        player.loadSource(src);
        player.attachMedia(video);
        player.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setError("Plex-Stream fehlgeschlagen. Server erreichbar? Token gültig?");
        });
        hls = player;
      });
    }

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [id, settings]);

  return (
    <Theater
      backTo="/plex"
      eyebrow="VoltView Player · Plex · eigene Mediathek"
      title={title}
      sidebar={
        <div>
          <p className="text-sm leading-relaxed text-mist">{summary || "Direkter Stream von deinem Plex-Server."}</p>
          {error ? <p className="mt-4 text-volt-2">{error}</p> : null}
        </div>
      }
    >
      <video ref={videoRef} className="h-full min-h-[58vh] w-full bg-black" controls autoPlay playsInline />
    </Theater>
  );
}
