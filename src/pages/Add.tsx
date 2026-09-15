import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type PlexServer } from "../lib/api";
import { requestYoutubeToken } from "../lib/google";
import { encodeImportHash, pair } from "../lib/pair";
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
  }

  useEffect(() => {
    if (!pin || form.plexToken) return undefined;
    const id = window.setInterval(() => {
      api
        .plexPinStatus(form, pin.id)
        .then((data) => {
          if (data.authToken) {
            patch({ plexToken: data.authToken });
            setPin(null);
            setStatus("Plex verbunden.");
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(id);
  }, [pin, form.plexToken]);

  useEffect(() => {
    if (!form.plexToken) return;
    api
      .plexResources(form)
      .then((data) => setServers(data.servers || []))
      .catch(() => undefined);
  }, [form.plexToken, form.plexClientId]);

  async function send() {
    setStatus("");
    if (!room) {
      setStatus("Kein Tesla-Code. QR auf dem Auto scannen.");
      return;
    }
    try {
      await pair.submit(room, form);
      setSent(true);
      setStatus("Gesendet. Schau auf den Tesla.");
    } catch (error) {
      setStatus((error as Error).message === "PAIR_NOT_FOUND" ? "Code abgelaufen. QR neu scannen." : "Senden fehlgeschlagen.");
    }
  }

  async function startPlex() {
    try {
      setPin(await api.plexPin(form));
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function google() {
    if (!form.youtubeClientId) {
      setStatus("Zuerst die OAuth Client-ID eintragen.");
      return;
    }
    try {
      const token = await requestYoutubeToken(form.youtubeClientId);
      patch({ youtubeAccessToken: token });
      setStatus("Google verbunden.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  return (
    <div className="add-page">
      <header className="add-head">
        <p className="pair-kicker">VoltView</p>
        <h1>Handy-Setup</h1>
        <p className="muted">YouTube, Google und Plex hier eintragen. Der Tesla übernimmt den Stand.</p>
      </header>

      <label>
        YouTube Data API Key
        <input value={form.youtubeApiKey} onChange={(e) => patch({ youtubeApiKey: e.target.value.trim() })} placeholder="AIza…" />
      </label>
      <label>
        Google OAuth Client-ID
        <input
          value={form.youtubeClientId}
          onChange={(e) => patch({ youtubeClientId: e.target.value.trim() })}
          placeholder="….apps.googleusercontent.com"
        />
      </label>
      <label>
        Region
        <select value={form.youtubeRegion} onChange={(e) => patch({ youtubeRegion: e.target.value })}>
          {["DE", "AT", "CH", "US", "GB", "FR"].map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      <div className="row-gap">
        <button type="button" className="btn" onClick={google}>
          {form.youtubeAccessToken ? "Google neu verbinden" : "Mit Google anmelden"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={startPlex}>
          Plex verbinden
        </button>
      </div>
      {pin ? (
        <div className="card">
          <p className="muted">Code auf plex.tv/link</p>
          <p className="pair-code">{pin.code}</p>
          <a href={pin.authUrl}>Plex öffnen</a>
        </div>
      ) : null}
      {servers.map((server) => (
        <button
          key={server.clientIdentifier}
          type="button"
          className="list-btn"
          onClick={() => {
            const connection =
              server.connections.find((c) => c.local && c.uri.startsWith("http")) ||
              server.connections.find((c) => !c.relay) ||
              server.connections[0];
            if (!connection) return;
            patch({
              plexServerUri: connection.uri,
              plexServerToken: server.accessToken,
              plexServerName: server.name,
            });
          }}
        >
          {server.name}
        </button>
      ))}

      <button type="button" className="btn btn-primary" onClick={send} disabled={!room || sent}>
        {sent ? "Gesendet" : "An Tesla senden"}
      </button>
      {status ? <p className={sent ? "ok" : "warn"}>{status}</p> : null}

      <details className="muted">
        <summary>Ohne QR: Link im Tesla öffnen</summary>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigator.clipboard.writeText(importUrl)}
        >
          Sync-Link kopieren
        </button>
      </details>
      <p>
        <Link to="/">Zurück</Link>
      </p>
    </div>
  );
}
