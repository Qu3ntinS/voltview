import { useEffect, useState } from "react";
import { api, type PlexServer } from "../lib/api";
import { isStatic, pagesUrl } from "../lib/env";
import { useSettings } from "../lib/settings";
import { teslaRedirectUrl } from "../lib/tesla";
import { fetchWatchStats } from "../lib/watch";

export function SettingsPage() {
  const { settings, update } = useSettings();
  const [pin, setPin] = useState<{ id: number; code: string; authUrl: string; linkUrl: string } | null>(
    null
  );
  const [servers, setServers] = useState<PlexServer[]>([]);
  const [status, setStatus] = useState("");
  const [usage, setUsage] = useState<{ sessions: number; watchedSec: number; bySource: Record<string, number> }>({
    sessions: 0,
    watchedSec: 0,
    bySource: {},
  });

  useEffect(() => {
    fetchWatchStats().then(setUsage).catch(() => undefined);
  }, []);

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
      api.plexPinStatus(settings, pin.id).then((data) => {
        if (data.authToken) {
          update({ plexToken: data.authToken });
          setPin(null);
          setStatus("Plex-Account verbunden.");
        }
      }).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(id);
  }, [pin, settings, update]);

  async function startPlex() {
    setStatus("");
    try {
      const next = await api.plexPin(settings);
      setPin(next);
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
      setStatus("Keine Verbindung für diesen Server gefunden.");
      return;
    }
    update({
      plexServerUri: connection.uri,
      plexServerToken: server.accessToken,
      plexServerName: server.name,
    });
    setStatus(`Server ${server.name} aktiv.`);
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-volt-2">VoltView</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold">Setup</h1>
      </div>
      {isStatic ? (
        <section className="rounded-[28px] border border-volt/30 bg-volt/10 p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-volt-2">GitHub Pages</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Kein eigener Server</h2>
          <p className="mt-3 text-mist">
            YouTube, Apps, Radio und Games laufen hier direkt. Plex braucht weiter
            <code className="mx-1 text-volt-2">bun run start</code>. Im Tesla über YouTube-Redirect öffnen.
          </p>
          <p className="mt-3 break-all text-sm text-volt-2">{teslaRedirectUrl(pagesUrl)}</p>
        </section>
      ) : null}
      <section className="rounded-[28px] border border-white/5 bg-panel p-6 glow-ring">
        <p className="text-xs uppercase tracking-[0.28em] text-volt-2">YouTube</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Data API Key</h2>
        <p className="mt-3 text-mist">
          Kostenlos in der Google Cloud Console: YouTube Data API v3 aktivieren, Key erzeugen, hier
          einfügen. Wird nur lokal im Browser gespeichert.
        </p>
        <input
          value={settings.youtubeApiKey}
          onChange={(e) => update({ youtubeApiKey: e.target.value.trim() })}
          placeholder="AIza…"
          className="mt-5 h-14 w-full rounded-2xl border border-white/10 bg-ink px-4 outline-none focus:ring-2 focus:ring-volt/50"
        />
        <label className="mt-5 block text-sm text-mist">Google OAuth Client-ID für dein YouTube</label>
        <p className="mt-1 text-sm text-mist">
          OAuth-Client vom Typ Web, Redirect/JS-Origin auf deine VoltView-URL. Scope nur
          youtube.readonly — Abos und Likes, nichts schreiben.
        </p>
        <input
          value={settings.youtubeClientId}
          onChange={(e) => update({ youtubeClientId: e.target.value.trim() })}
          placeholder="….apps.googleusercontent.com"
          className="mt-3 h-14 w-full rounded-2xl border border-white/10 bg-ink px-4 outline-none focus:ring-2 focus:ring-volt/50"
        />
        <label className="mt-4 block text-sm text-mist">Region für Trends</label>
        <select
          value={settings.youtubeRegion}
          onChange={(e) => update({ youtubeRegion: e.target.value })}
          className="mt-2 h-14 w-40 rounded-2xl border border-white/10 bg-ink px-4"
        >
          {["DE", "AT", "CH", "US", "GB", "FR"].map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-[28px] border border-white/5 bg-panel p-6 glow-ring">
        <p className="text-xs uppercase tracking-[0.28em] text-volt-2">Plex</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Eigener Server</h2>
        <p className="mt-3 text-mist">
          Offizielle PIN-Anmeldung bei plex.tv. Danach Server wählen. VoltView proxyt nur deine
          Bibliothek — kein fremder Katalog.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={startPlex} className="h-14 rounded-2xl bg-volt px-6 font-semibold">
            Plex verbinden
          </button>
          {settings.plexToken ? (
            <button
              type="button"
              onClick={() =>
                update({
                  plexToken: "",
                  plexServerUri: "",
                  plexServerToken: "",
                  plexServerName: "",
                })
              }
              className="h-14 rounded-2xl border border-white/10 px-6"
            >
              Trennen
            </button>
          ) : null}
        </div>
        {pin ? (
          <div className="mt-5 rounded-2xl bg-ink p-5">
            <p className="text-sm text-mist">Code auf plex.tv/link eingeben oder den Auth-Link öffnen.</p>
            <p className="mt-3 font-display text-4xl font-extrabold tracking-[0.2em]">{pin.code}</p>
            <a href={pin.authUrl} className="mt-4 inline-flex h-12 items-center text-volt-2">
              Plex-Freigabe öffnen
            </a>
          </div>
        ) : null}
        {servers.length ? (
          <div className="mt-5 grid gap-3">
            {servers.map((server) => (
              <button
                key={server.clientIdentifier}
                type="button"
                onClick={() => chooseServer(server)}
                className={`rounded-2xl border px-5 py-4 text-left ${
                  settings.plexServerName === server.name
                    ? "border-volt bg-volt/15"
                    : "border-white/10 bg-ink"
                }`}
              >
                <p className="font-semibold">{server.name}</p>
                <p className="text-sm text-mist">{server.owned ? "Eigener Server" : "Freigegeben"} · {server.connections.length} Verbindungen</p>
              </button>
            ))}
          </div>
        ) : null}
        {settings.plexServerUri ? (
          <p className="mt-4 text-sm text-mist">Aktiv: {settings.plexServerUri}</p>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/5 bg-panel p-6 glow-ring">
        <p className="text-xs uppercase tracking-[0.28em] text-volt-2">Abo-Grundlage</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Nutzung</h2>
        <p className="mt-3 text-mist">
          YouTube, Plex und Radio laufen im eigenen Player. Jede Session sendet Heartbeats — später
          kannst du genau hier Limits und Abos anschließen. Netflix, Disney+ und Prime lassen sich
          nur als App-Start zählen, nicht die Minuten im fremden Player.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Sessions" value={String(usage.sessions)} />
          <Stat label="Minuten" value={String(Math.round(usage.watchedSec / 60))} />
          {Object.entries(usage.bySource).map(([source, seconds]) => (
            <Stat key={source} label={source} value={`${Math.round(seconds / 60)} min`} />
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/5 bg-panel p-6 glow-ring">
        <h2 className="font-display text-3xl font-bold">Tesla-Tipp</h2>
        <p className="mt-3 text-mist">
          VoltView als Lesezeichen im Fahrzeugbrowser speichern. Apps wie Netflix verlassen die
          Seite absichtlich — zurück geht nur über das Lesezeichen. Nur im Stand nutzen.
        </p>
        {status ? <p className="mt-4 text-volt-2">{status}</p> : null}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-mist">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
