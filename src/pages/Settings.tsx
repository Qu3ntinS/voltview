import { useCallback, useEffect, useState } from "react";
import { api, type PlexServer } from "../lib/api";
import { isStatic, pagesUrl } from "../lib/env";
import { type PairSettings } from "../lib/pair";
import { useSettings } from "../lib/settings";
import { teslaRedirectUrl } from "../lib/tesla";
import { PairPanel } from "../components/PairPanel";

export function SettingsPage() {
  const { settings, update } = useSettings();
  const [pin, setPin] = useState<{ id: number; code: string; authUrl: string; linkUrl: string } | null>(
    null
  );
  const [servers, setServers] = useState<PlexServer[]>([]);
  const [status, setStatus] = useState("");

  const applyPair = useCallback(
    (next: PairSettings) => {
      update(next);
      setStatus("Vom Handy übernommen.");
    },
    [update]
  );

  useEffect(() => {
    if (!settings.plexToken) return;
    api
      .plexResources(settings)
      .then((data) => setServers(data.servers || []))
      .catch((err) => setStatus(err.message));
  }, [settings]);

  useEffect(() => {
    if (!pin || settings.plexToken) return undefined;
    const id = window.setInterval(() => {
      api
        .plexPinStatus(settings, pin.id)
        .then((data) => {
          if (data.authToken) {
            update({ plexToken: data.authToken });
            setPin(null);
            setStatus("Plex verbunden.");
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(id);
  }, [pin, settings, update]);

  async function startPlex() {
    setStatus("");
    try {
      setPin(await api.plexPin(settings));
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  function chooseServer(server: PlexServer) {
    const connection =
      server.connections.find((c) => c.local && c.uri.startsWith("http")) ||
      server.connections.find((c) => !c.relay) ||
      server.connections[0];
    if (!connection) {
      setStatus("Kein Server-Link gefunden.");
      return;
    }
    update({
      plexServerUri: connection.uri,
      plexServerToken: server.accessToken,
      plexServerName: server.name,
    });
    setStatus(`${server.name} aktiv.`);
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Setup</h1>
        <p className="muted mt-1">Keys und Logins. Am Tesla den QR scannen, tippen auf dem Handy.</p>
      </div>

      <PairPanel onApply={applyPair} />

      {isStatic ? (
        <section className="card">
          <h2 className="text-lg font-semibold">GitHub Pages</h2>
          <p className="muted mt-2">YouTube, Apps, Radio und Games laufen hier. Plex braucht `bun run start`.</p>
          <p className="mono wrap mt-2">{teslaRedirectUrl(pagesUrl)}</p>
        </section>
      ) : null}

      <section className="card">
        <h2 className="text-lg font-semibold">YouTube</h2>
        <label>
          Data API Key
          <input
            value={settings.youtubeApiKey}
            onChange={(e) => update({ youtubeApiKey: e.target.value.trim() })}
            placeholder="AIza…"
          />
        </label>
        <label>
          OAuth Client-ID
          <input
            value={settings.youtubeClientId}
            onChange={(e) => update({ youtubeClientId: e.target.value.trim() })}
            placeholder="….apps.googleusercontent.com"
          />
        </label>
        <label>
          Region
          <select value={settings.youtubeRegion} onChange={(e) => update({ youtubeRegion: e.target.value })}>
            {["DE", "AT", "CH", "US", "GB", "FR"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Plex</h2>
        <div className="row-gap mt-3">
          <button type="button" className="btn btn-primary" onClick={startPlex}>
            Plex verbinden
          </button>
          {settings.plexToken ? (
            <button
              type="button"
              className="btn"
              onClick={() =>
                update({
                  plexToken: "",
                  plexServerUri: "",
                  plexServerToken: "",
                  plexServerName: "",
                })
              }
            >
              Trennen
            </button>
          ) : null}
        </div>
        {pin ? (
          <div className="mt-4">
            <p className="muted">Code auf plex.tv/link</p>
            <p className="pair-code">{pin.code}</p>
            <a href={pin.authUrl}>Plex-Freigabe</a>
          </div>
        ) : null}
        {servers.map((server) => (
          <button
            key={server.clientIdentifier}
            type="button"
            onClick={() => chooseServer(server)}
            className="list-btn"
          >
            {server.name}
            {settings.plexServerName === server.name ? " · aktiv" : ""}
          </button>
        ))}
        {status ? <p className="ok mt-3">{status}</p> : null}
      </section>
    </div>
  );
}
