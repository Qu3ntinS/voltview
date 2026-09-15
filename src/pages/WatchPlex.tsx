import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, plexImage, plexStreamUrl } from "../lib/api";
import { useSettings } from "../lib/settings";

export function WatchPlexPage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [title, setTitle] = useState("Plex");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .plexMetadata(settings, id)
      .then((data) => {
        if (!data.item) return;
        setTitle(data.item.grandparentTitle ? `${data.item.grandparentTitle} · ${data.item.title}` : data.item.title);
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
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/plex" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white/5 px-5">
          <ArrowLeft className="h-5 w-5" />
          Zurück
        </Link>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-white/5 bg-black glow-ring">
        <video ref={videoRef} className="aspect-video w-full" controls autoPlay playsInline />
      </div>
      {error ? <p className="mt-4 text-volt-2">{error}</p> : null}
    </div>
  );
}
