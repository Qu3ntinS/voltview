import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { PlayerChrome } from "../components/PlayerChrome";
import { SafetyGate } from "../components/SafetyGate";
import { Theater } from "../components/Theater";
import { api, plexImage, plexStreamUrl } from "../lib/api";
import { useSettings } from "../lib/settings";
import { useWatchSession } from "../lib/useWatchSession";

export function WatchPlexPage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const snapRef = useRef({ positionSec: 0, durationSec: 0, playing: true });
  const [title, setTitle] = useState("Plex");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(true);
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
        setSummary(data.item.summary || "");
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
    <SafetyGate title="Plex nur im Stand" resetKey={id}>
    <Theater
      backTo="/plex"
      eyebrow="VoltView Player · eigenes UI · Plex"
      title={title}
      sidebar={
        <div>
          <p className="text-sm leading-relaxed text-mist">{summary || "Direkter Stream von deinem Plex-Server."}</p>
          {error ? <p className="mt-4 text-volt-2">{error}</p> : null}
        </div>
      }
    >
      <PlayerChrome
        playing={playing}
        current={current}
        duration={duration}
        onToggle={() => {
          const video = videoRef.current;
          if (!video) return;
          if (video.paused) video.play();
          else video.pause();
        }}
        onSeek={(seconds) => {
          if (videoRef.current) videoRef.current.currentTime = seconds;
        }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full bg-black"
          autoPlay
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            const snap = {
              positionSec: video.currentTime || 0,
              durationSec: video.duration || 0,
              playing: !video.paused,
            };
            snapRef.current = snap;
            setCurrent(snap.positionSec);
            setDuration(snap.durationSec);
          }}
        />
      </PlayerChrome>
    </Theater>
    </SafetyGate>
  );
}
