import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type PlexServer } from "../lib/api";
import { requestYoutubeToken, youtubeOauthClientId } from "../lib/google";
import { encodeImportHash, pair } from "../lib/pair";
import { pickPlexConnection } from "../lib/plexTv";
import { loadSettings, type Settings } from "../lib/storage";

export function AddPage() {
  const [params] = useSearchParams();
  const room = params.get("r") || "";
  const [form, setForm] = useState<Settings>(() => loadSettings());
  const [pin, setPin] = useState<{ id: number; code: string; authUrl: string } | null>(null);
  const [servers, setServers] = useState<PlexServer[]>([]);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);

  const importUrl = useMemo(() => {
    const hash = encodeImportHash(form);
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/add\/?$/, "/");
    url.search = "";
    url.hash = hash;
    return url.href;
  }, [form]);

  function patch(next: Partial<Settings>) {
    setForm((prev) => ({ ...prev, ...next }));
    return { ...form, ...next };
  }

  async function push(next: Partial<Settings>) {
    const merged = patch(next);
    if (!room) {
      setStatus("Kein Tesla-Code. QR auf dem Auto scannen.");
      return;
    }
    try {
      await pair.submit(room, merged);
      setSent(true);
      setStatus("Liegt auf dem Tesla.");
    } catch (error) {
      setStatus((error as Error).message === "PAIR_NOT_FOUND" ? "Code abgelaufen. QR neu scannen." : "Senden fehlgeschlagen.");
    }
  }

  useEffect(() => {
    if (!pin || form.plexToken) return undefined;
    const id = window.setInterval(() => {
      api
        .plexPinStatus(form, pin.id)
        .then((data) => {
          if (data.authToken) {
            setPin(null);
            setStatus("Plex verbunden. Server wählen.");
            const merged = patch({ plexToken: data.authToken });
            if (room) pair.submit(room, merged).catch(() => undefined);
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(id);
  }, [pin, form.plexToken, form.plexClientId, room]);

  useEffect(() => {
    if (!form.plexToken) return;
    api
      .plexResources(form)
      .then((data) => setServers(data.servers || []))
      .catch(() => undefined);
  }, [form.plexToken, form.plexClientId]);

  async function google() {
    setStatus("");
    try {
      const token = await requestYoutubeToken(youtubeOauthClientId(form));
      await push({ youtubeAccessToken: token, youtubeClientId: youtubeOauthClientId(form) });
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function startPlex() {
    setStatus("");
    try {
      setPin(await api.plexPin(form));
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  return (
    <div className="add-page">
      <header className="add-head">
        <p className="pair-kicker">VoltView · Handy</p>
        <h1>Einloggen</h1>
        <p className="muted">
          Google und Plex hier auf dem Phone. Der Tesla übernimmt den Stand — ohne Tastatur im Auto.
        </p>
        {!room ? <p className="warn">QR auf dem Tesla scannen, sonst kommt der Login nicht zurück.</p> : null}
      </header>

      <button type="button" className="btn btn-primary" onClick={google}>
        {form.youtubeAccessToken ? "Google neu verbinden" : "Mit Google anmelden"}
      </button>
      {form.youtubeAccessToken ? <p className="ok">Google verbunden. Abos und Likes kommen auf den Tesla.</p> : null}

      <button type="button" className="btn" onClick={startPlex}>
        {form.plexToken ? "Plex neu verbinden" : "Plex verbinden"}
      </button>
      {pin ? (
        <div className="card">
          <p className="muted">Plex öffnen, einloggen, zurück hierher. Der Tesla übernimmt den Account.</p>
          <a className="btn btn-primary" href={pin.authUrl} target="_blank" rel="noreferrer">
            Plex öffnen
          </a>
        </div>
      ) : null}
      {servers.map((server) => (
        <button
          key={server.clientIdentifier}
          type="button"
          className="list-btn"
          onClick={() => {
            const connection = pickPlexConnection(server);
            if (!connection) return;
            push({
              plexToken: form.plexToken,
              plexServerUri: connection.uri,
              plexServerToken: server.accessToken,
              plexServerName: server.name,
            });
          }}
        >
          {server.name}
          {form.plexServerName === server.name ? " · aktiv" : ""}
        </button>
      ))}

      <label>
        Region
        <select
          value={form.youtubeRegion}
          onChange={(e) => {
            const youtubeRegion = e.target.value;
            setForm((prev) => ({ ...prev, youtubeRegion }));
          }}
        >
          {["DE", "AT", "CH", "US", "GB", "FR"].map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="btn btn-primary" onClick={() => push({})} disabled={!room}>
        {sent ? "Aktualisiert" : "An Tesla senden"}
      </button>
      {status ? <p className={sent ? "ok" : "warn"}>{status}</p> : null}

      <details className="muted">
        <summary>Ohne Live-QR: Link im Tesla öffnen</summary>
        <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(importUrl)}>
          Sync-Link kopieren
        </button>
      </details>
      <p>
        <Link to="/">Zurück</Link>
      </p>
    </div>
  );
}
