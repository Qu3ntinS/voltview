import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Html5Player } from "../components/Html5Player";
import { PlayerLoading } from "../components/PlayerLoading";
import { SafetyGate } from "../components/SafetyGate";
import { Theater } from "../components/Theater";
import { api, plexClientFileUrl, plexFileUrl, plexImage, plexStreamUrl } from "../lib/api";
import { isLanPlexHost, rankPlexConnections } from "../lib/plexTv";
import { useSettings } from "../lib/settings";
import { isTeslaBrowser } from "../lib/tesla";
import { useWatchSession } from "../lib/useWatchSession";

export function WatchPlexPage() {
  const { id = "" } = useParams();
  const { settings, remember } = useSettings();
  const snapRef = useRef({ positionSec: 0, durationSec: 0, playing: true });
  const [title, setTitle] = useState("Plex");
  const [remoteUri, setRemoteUri] = useState("");
  const [lookedUp, setLookedUp] = useState(!settings.plexToken);

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
    if (!settings.plexToken) {
      setLookedUp(true);
      return;
    }
    let alive = true;
    const finish = () => {
      if (alive) setLookedUp(true);
    };
    const timer = window.setTimeout(finish, 2500);
    api
      .plexResources(settings)
      .then((data) => {
        const match =
          data.servers?.find((item) => settings.plexServerId && item.clientIdentifier === settings.plexServerId) ||
          data.servers?.find((item) => settings.plexServerName && item.name === settings.plexServerName) ||
          data.servers?.[0];
        if (!match) return;
        const remote = rankPlexConnections(match).find(
          (item) => item.uri.startsWith("https") && !isLanPlexHost(item.uri),
        );
        if (remote?.uri && alive) setRemoteUri(remote.uri);
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timer);
        finish();
      });
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [settings]);

  const file = plexFileUrl(settings, id);
  const stored = plexClientFileUrl(settings, id);
  const remote = remoteUri ? plexClientFileUrl(settings, id, remoteUri) : "";
  const sources = useMemo(() => {
    const proxy = { url: file, mime: "video/mp4", quality: "Auto", kind: "progressive" as const };
    const tesla = isTeslaBrowser();
    const out: {
      url: string;
      mime: string;
      quality: string;
      kind: "progressive" | "hls";
      timeoutMs?: number;
    }[] = [];
    const push = (url: string, quality: string, timeoutMs: number) => {
      if (!url || out.some((item) => item.url === url)) return;
      out.push({ url, mime: "video/mp4", quality, kind: "progressive", timeoutMs });
    };
    if (remote && !tesla) push(remote, "Remote", 8000);
    if (stored && isLanPlexHost(stored) && !tesla) push(stored, "LAN", 2500);
    else if (stored && !isLanPlexHost(stored) && stored !== remote && !tesla) push(stored, "Direkt", 8000);
    out.push(proxy);
    if (remote && tesla) push(remote, "Remote", 8000);
    if (!tesla) {
      out.push({
        url: plexStreamUrl(settings, id, "hls"),
        mime: "application/vnd.apple.mpegurl",
        quality: "Auto",
        kind: "hls",
      });
    }
    return out;
  }, [file, id, remote, settings, stored]);

  return (
    <SafetyGate title="Plex" resetKey={id}>
      <Theater>
        {lookedUp ? (
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
        ) : (
          <div className="player-stage">
            <PlayerLoading title={title} subtitle="Server…" />
          </div>
        )}
      </Theater>
    </SafetyGate>
  );
}
