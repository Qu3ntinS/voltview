import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { PlayerChrome } from "../components/PlayerChrome";
import { PlayerLoading } from "../components/PlayerLoading";
import { SafetyGate } from "../components/SafetyGate";
import { Theater } from "../components/Theater";
import { api, plexImage, plexStreamUrl } from "../lib/api";
import { canUseNativeHls, mediaDuration } from "../lib/playerMedia";
import { useSettings } from "../lib/settings";
import { isTeslaBrowser } from "../lib/tesla";
import { useWatchSession } from "../lib/useWatchSession";

export function WatchPlexPage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const snapRef = useRef({ positionSec: 0, durationSec: 0, playing: true });
  const [title, setTitle] = useState("Plex");
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !id) return;
    const node = video;
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    setError("");
    setLoading(true);
    const mp4 = plexStreamUrl(settings, id, "mp4");
    const hlsUrl = plexStreamUrl(settings, id, "hls");

    async function attach() {
      if (isTeslaBrowser()) {
        node.src = mp4;
        return;
      }
      if (!canUseNativeHls(node)) {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (Hls.isSupported()) {
          const player = new Hls({
            enableWorker: false,
            xhrSetup: (xhr) => {
              xhr.setRequestHeader("x-volt-plex-token", settings.plexToken);
              xhr.setRequestHeader("x-volt-plex-server", settings.plexServerUri);
              xhr.setRequestHeader(
                "x-volt-plex-server-token",
                settings.plexServerToken || settings.plexToken,
              );
              xhr.setRequestHeader("x-volt-plex-client", settings.plexClientId);
            },
          });
          player.loadSource(hlsUrl);
          player.attachMedia(node);
          player.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal && !cancelled) {
              node.src = mp4;
              node.play().catch(() => undefined);
            }
          });
          hls = player;
          return;
        }
      } else {
        node.src = hlsUrl;
        return;
      }
      node.src = mp4;
    }

    void attach();
    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [id, settings]);

  return (
    <SafetyGate title="Plex" resetKey={id}>
    <Theater
      backTo="/plex"
      eyebrow="Plex"
      title={title}
      sidebar={error ? <p className="text-volt-2">{error}</p> : null}
    >
      <PlayerChrome
        playing={playing}
        current={current}
        duration={duration}
        onToggle={() => {
          const video = videoRef.current;
          if (!video) return;
          if (video.paused) video.play().catch(() => undefined);
          else video.pause();
        }}
        onSeek={(seconds) => {
          if (videoRef.current) videoRef.current.currentTime = seconds;
        }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 z-0 h-full w-full bg-black object-contain"
          autoPlay
          playsInline
          {...{ "webkit-playsinline": "true" }}
          onPlay={() => {
            setPlaying(true);
            setLoading(false);
          }}
          onPause={() => setPlaying(false)}
          onLoadedData={(e) => {
            setLoading(false);
            setDuration(mediaDuration(e.currentTarget));
            e.currentTarget.play().catch(() => undefined);
          }}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            const snap = {
              positionSec: video.currentTime || 0,
              durationSec: mediaDuration(video),
              playing: !video.paused,
            };
            snapRef.current = snap;
            setCurrent(snap.positionSec);
            setDuration(snap.durationSec);
          }}
          onError={() => {
            setLoading(false);
            setError("Stream fehlgeschlagen.");
          }}
        />
        {loading && !error ? <PlayerLoading title={title} subtitle="Laden…" /> : null}
        {error ? (
          <p className="absolute inset-x-4 top-4 z-20 rounded-xl bg-black/70 px-3 py-2 text-sm text-volt-2">{error}</p>
        ) : null}
      </PlayerChrome>
    </Theater>
    </SafetyGate>
  );
}
